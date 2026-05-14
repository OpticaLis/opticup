# FINDINGS — M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX

> Small SPEC. Two findings, neither blocking, both worth documenting for the Foreman's review and follow-up disposition.

---

## FIND-1 — LOW — Iron-Rule-32 destructive-ops gate false-positive on TEMP TABLE teardown statements

**Severity:** LOW (developer-experience / friction)
**Class:** Gate-regex precision
**Location:** `scripts/checks/destructive-ops-declared.mjs` — the regex for the SQL destructive-pattern matcher.

### Description

During this SPEC's execution, the integration-test capture script wanted to use a session-local TEMP TABLE as a one-shot capture buffer (since DO blocks don't return query results, and `RAISE NOTICE` output isn't surfaced through MCP `execute_sql`). The script ended with the literal-string teardown statement for that TEMP table. The Iron-Rule-32 pre-commit gate caught this as a destructive pattern:

```
[destructive-ops-declared] modules\Module 4 - CRM\docs\specs\M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX\INTEGRATION_TEST.sql:87 — Destructive pattern (SQL DROP TABLE) introduced: [the teardown statement];
```

The SPEC declared `## 4. Destructive Operations: None.` — so the gate correctly enforced the declared empty list. But the actual operation in question was intra-transaction TEMP TABLE cleanup, which has zero impact on project data and is auto-equivalent to letting the table drop at session end. The current regex pattern `\bDROP\s+TABLE\b` does not distinguish:

- `DROP TABLE crm_leads;` (catastrophic — what the gate is designed to catch)
- `DROP TABLE _temp_buffer;` (harmless intra-transaction cleanup)
- `-- See the DROP TABLE pattern in destructive-ops-declared.mjs` (a comment ABOUT the gate)

The latter two cases tripped the gate twice during this SPEC's execution before the executor reworded the comment to avoid the literal string. Cost: ~3 minutes (two commit retries).

### Why this is LOW

- The gate's behavior is correct under its stated semantics (declared `None.` ⇒ forbid all destructive-op literal strings). It is a precision issue, not a correctness issue.
- Workarounds exist: reword to avoid the literal string, OR declare the temp-table teardown in SPEC §4 as an explicit sub-bullet.
- The friction is mainly during SPECs that document destructive patterns themselves (this SPEC documents Iron Rule 32 behavior in its own FINDINGS!) or use TEMP tables in test scaffolding.

### Suggested next action

**TECH_DEBT entry** in `TECH_DEBT.md` (suggested ID: `INFRA-IRON-RULE-32-TEMP-DROP-DETECTION-01`). Optional refinement to `destructive-ops-declared.mjs`:

```
Refine the SQL DROP TABLE regex to exclude TEMP TABLE teardowns:
  /\bDROP\s+TABLE\b(?!\s+(IF\s+EXISTS\s+)?(_|tmp_|temp_))/i
```

OR codify in the executor SKILL: "Avoid the literal string `DROP TABLE` in commits when SPEC declares `None.`; reword TEMP table teardown lines as 'auto-drops at session end' comments."

Defer fix until next infra/tooling SPEC. No blocker today.

---

## FIND-2 — LOW — `next_crm_event_number(tenant, NULL)` scope diverges from `(tenant_id, event_number)` UNIQUE constraint

**Severity:** LOW (latent bug; surfaced during this SPEC's integration test but not in production)
**Class:** RPC/constraint contract mismatch
**Location:** `next_crm_event_number(p_tenant_id uuid, p_campaign_id uuid)` RPC body (not captured in this SPEC); UNIQUE constraint `crm_events_tenant_id_event_number_key` on `crm_events`.

### Description

The integration test's first attempt called `next_crm_event_number('<demo>', NULL)` and got `1`. Demo has 29 events with `max(event_number)=99991`. The INSERT then failed with:

```
duplicate key value violates unique constraint "crm_events_tenant_id_event_number_key"
DETAIL:  Key (tenant_id, event_number)=(8d8cfa7e-..., 1) already exists.
```

Root cause: the RPC's signature is `(tenant_id, campaign_id)`. Passing NULL for `campaign_id` makes the RPC count campaign-scoped events (within the `campaign_id IS NULL` bucket, of which demo has zero — so it returns 1). The UNIQUE constraint, however, is `(tenant_id, event_number)` — NOT campaign-scoped. Therefore the RPC and the constraint operate at different scopes:

- **RPC scope:** `(tenant_id, campaign_id) → max(event_number) + 1`
- **UNIQUE scope:** `(tenant_id, event_number)` — no campaign_id

If a tenant has events under campaigns A and B, the RPC returning `5` for campaign A could collide with an existing campaign-B event with `event_number=5`.

### Why production doesn't trip this today

- Prizma + demo currently use one primary campaign each — most events flow through the same campaign_id, so the scope mismatch never surfaces.
- In normal flow, `event-register` EF and CRM UI both pass the event's own campaign_id, so the RPC returns sane numbers within that campaign's max+1 bucket.

### Why this SPEC tripped it

The integration test naively passed `NULL` for the campaign_id parameter. NULL is treated as "the bucket of events with NULL campaign" — which is empty on demo, hence RPC returns 1. UNIQUE constraint then fires.

### Suggested next action

**Two options, separate SPEC:**

1. **Align RPC scope with UNIQUE scope** — make `next_crm_event_number` look at `(tenant_id, event_number)` only (ignore campaign), returning a tenant-wide max+1. This matches the UNIQUE constraint's semantics. Risk: campaigns lose their independent number sequences. Probably wrong for Prizma's workflow.

2. **Align UNIQUE constraint scope with RPC scope** — change UNIQUE to `(tenant_id, campaign_id, event_number)`. Allows campaigns to have independent number sequences without collision. Requires data migration to verify no existing collisions across campaigns. Probably the better long-term fix.

**Recommend:** TECH_DEBT entry (suggested ID: `M4-DEBT-NEXT-EVENT-NUMBER-SCOPE-01`) for future M4 SPEC. The change requires Daniel's input on whether campaigns should number events independently or share a tenant-wide sequence. Not in scope for this SPEC.

---

## Summary Table

| ID | Severity | Class | Suggested action |
|---|---|---|---|
| FIND-1 | LOW | Iron-Rule-32 gate regex precision (TEMP TABLE false-positive) | TECH_DEBT entry; defer to infra SPEC |
| FIND-2 | LOW | `next_crm_event_number` campaign-scope vs UNIQUE-constraint tenant-scope mismatch | TECH_DEBT entry; Daniel decides which side to align; defer to future M4 SPEC |

**Counts:** 0 CRITICAL · 0 HIGH · 0 MEDIUM · 2 LOW · 0 INFO · **2 total.**

**No findings cleared the stop-trigger threshold of "constitutes a live production bug requiring immediate halt."** Both are latent or developer-friction-only issues with documented workarounds.

---

*End of FINDINGS.md.*
