# EXECUTION_REPORT — C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL

> **Location:** `modules/Module 4 - CRM/docs/specs/C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/EXECUTION_REPORT.md`
> **Written by:** opticup-executor (Claude Opus 4.7)
> **Written on:** 2026-05-03
> **SPEC reviewed:** `SPEC.md` (DRAFT, Campaign Overseer Cowork session, 2026-05-03 morning) + `FOREMAN_REVIEW.md` (opticup-strategic, 2026-05-03)
> **Start commit:** `5c2efd9`
> **End commit:** `17a9ad4` (will be superseded by retrospective commit)
> **Duration:** ~25 minutes (single Rung, single session, autonomous)

---

## 1. Summary

C-001 Rung 1 shipped end-to-end as scoped. The hardcoded 3-phone `ALLOWED_PHONES` constant in `send-message` and `dispatch-queue` EFs was replaced with a tenant-level `tenants.test_mode_sms_allowlist` JSONB column (NULL = production / wide-open, JSONB array = test mode / allowlisted-only). prizma + demo were pre-populated with the existing 3-phone array so the deploy preserved current behavior exactly. `[functions.send-message]` block was added to `supabase/config.toml` (folded in here per FOREMAN_REVIEW §1 finding 6). Live curl tests on prizma confirmed: allowlisted phone → SMS delivered (Daniel confirmed receipt); foreign phone → `phone_not_allowed` rejection. retry-failed verified to inherit new behavior automatically (no own allowlist code) — no edit needed. Layer 3 ("CRM UI guard") confirmed non-existent in `modules/crm/`. Cutover-day flip remains in Daniel's hands as a single-row UPDATE on Sunday.

---

## 2. What Was Done (per-commit)

| # | Hash | Message | Files touched |
|---|------|---------|---------------|
| 1 | `6d4896d` | `feat(crm): C-001 — replace hardcoded SMS allowlist with tenants.test_mode_sms_allowlist` | `supabase/functions/send-message/index.ts` (303→318 lines), `supabase/functions/dispatch-queue/index.ts` (172→189 lines), `supabase/config.toml` (+12 lines) |
| 2 | `17a9ad4` | `chore(db): C-001 — add tenants.test_mode_sms_allowlist + pre-populate prizma + demo` | `supabase/migrations/20260503055648_c001_add_tenants_test_mode_sms_allowlist.sql` (new, 24 lines) |
| 3 | (this commit) | `chore(spec): close C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL with retrospective` | this file + `FINDINGS.md` |

**DB migration applied via MCP `apply_migration`:**
- Remote version: `20260503055648_c001_add_tenants_test_mode_sms_allowlist`
- `apply_migration` returned `{success: true}`.
- Local file mirror written by hand (see Finding 1 — MCP does not auto-write to working tree).

**EF deployments:**
- `send-message`: v17 → **v18**, `verify_jwt=true`, ezbr_sha256=`e15ad6a5...`.
- `dispatch-queue`: v6 → **v7**, `verify_jwt=false`, ezbr_sha256=`3873bcc3...`.
- `retry-failed`: unchanged (verified to inherit; see §3 below).

**Verify-script results:**
- `npm run verify:integrity` at session start: PASS (75 files, 3 ms, exit 0).
- `npm run verify:integrity` pre-commit: PASS (78 files, 3 ms, exit 0).
- Pre-commit hooks at Commit A: 0 violations, 1 warning (file-size: send-message/index.ts at 318 lines, above 300-line soft target, below 350 hard cap). See Finding 3.
- Pre-commit hooks at Commit B: 0 violations, 0 warnings.
- Pre-commit hooks ran the integrity gate again on each commit: clean.

---

## 3. Pre-flight Findings (answers to FOREMAN_REVIEW unknowns)

The grep `grep -rn "ALLOWED_PHONES\|phoneAllowed" supabase/functions/ modules/ --include="*.ts" --include="*.js"` returned exactly 8 matches, all inside `supabase/functions/`:

| File | Lines | Role |
|------|-------|------|
| `supabase/functions/send-message/index.ts` | 37 (const), 42–46 (helper), 283 (caller) | Layer 1 |
| `supabase/functions/dispatch-queue/index.ts` | 19 (const), 24–28 (helper), 111 (caller) | Layer 2 |

**Layer 3 (CRM UI guard) — non-existent.** `grep` of `modules/crm/` returned zero `ALLOWED_PHONES`/`phoneAllowed` matches. The only `modules/crm/` references to phone-allowlist concepts are display strings (`crm-message-error-labels.js` Hebrew label for the `phone_not_allowed` error code) — these are display, not gate. The "layer 1 of 3" comment in send-message is aspirational scaffolding, not a factual inventory. Confirmed FOREMAN_REVIEW §1 finding 2.

**Layer 4 (retry-failed) — verified absent.** `supabase/functions/retry-failed/index.ts` has no own `ALLOWED_PHONES` constant nor `phoneAllowed` function. It re-POSTs to `send-message` (which carries layer 1 internally) and counts the response's `error === "phone_not_allowed"` into a `stillRejected` counter. retry-failed inherits the new C-001 behavior automatically. No edit. Comment at lines 11–17 of retry-failed correctly documents this dependency. Confirmed FOREMAN_REVIEW §1 finding 3.

**Tenants JSONB columns (FOREMAN_REVIEW §5 delta):**
```
[{"column_name":"payment_links","data_type":"jsonb"},
 {"column_name":"shipment_config","data_type":"jsonb"},
 {"column_name":"ui_config","data_type":"jsonb"}]
```
No `config` column exists. SPEC §3.3 was wrong on that line. C-001 added `test_mode_sms_allowlist` as a 4th JSONB column.

**Migration baseline:**
- Pre-migration: `tenants.test_mode_sms_allowlist` did not exist (information_schema returned 0 rows).
- Post-migration: column present + commented; prizma row + demo row each populated with `["+972537889878", "+972503348349", "+972507168471"]`, jsonb_array_length = 3.

---

## 4. Curl Verification (prizma, BEFORE the cutover-day flip)

The pre-populated allowlist preserves current behavior, so the new EFs should reject the same phones the old hardcoded list rejected.

### Test A — allowlisted phone

Initial attempt with dummy `lead_id="00000000-0000-0000-0000-000000000000"` returned `{ "ok": false, "error": "Could not create log entry" }` — pre-existing FK-violation behavior on `crm_message_log.lead_id` (unrelated to C-001). Retried with a real prizma lead row (`286ee8c4-6396-4ac6-840e-f8d3758ca26b` — `QA_NIGHT_RUN_L2`, phone `+972537889878`):

```
POST https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/send-message
{
  "tenant_id": "6ad0781b-37f0-47a9-92e3-be9ed1477e1c",
  "channel": "sms",
  "lead_id": "286ee8c4-6396-4ac6-840e-f8d3758ca26b",
  "body": "C001 verify — please ignore",
  "variables": { "phone": "+972537889878", "name": "Daniel" }
}
→ 200 { "ok": true, "log_id": "6c9196f7-730e-448f-814c-9db4c23f07dc",
        "channel": "sms", "template_id": null }
```

`crm_message_log` row `6c9196f7-730e-448f-814c-9db4c23f07dc`: status=`sent`, error_message=NULL, content="C001 verify — please ignore", created_at=`2026-05-03 06:04:17.324951+00`. **Daniel confirmed receipt of the SMS on `0537889878` in chat.**

### Test B — foreign phone (non-allowlisted)

```
POST .../send-message
{
  ...same tenant_id + lead_id...
  "body": "C001 verify — should be REJECTED, this should NOT arrive",
  "variables": { "phone": "+15551234567", "name": "Test" }
}
→ 200 { "ok": false, "error": "phone_not_allowed" }
```

`crm_message_log` row `bdaa0836-17bb-4cb3-8768-19c54ed114f1`: status=`rejected`, error_message=`"phone_not_allowed: +15551234567"`, content="C001 verify — should be REJECTED...", created_at=`2026-05-03 06:04:18.367353+00`. No SMS dispatched. The guardrail held under the new DB-lookup path.

Both tests verify the new behavior matches pre-C001 behavior exactly while now being controlled by a DB column instead of a hardcoded constant.

---

## 5. Deviations from SPEC

| # | SPEC section | Deviation | Why | How resolved |
|---|--------------|-----------|-----|--------------|
| 1 | SPEC §6 SC4 | "[functions.send-message] block already exists" — it did NOT | FOREMAN_REVIEW §1 finding 6 corrected this; folded into Rung 1 | Added the block in Step 6, deployed v18 with explicit verify_jwt=true |
| 2 | Activation prompt §Step 9 Commit B | "Add the migration file generated by `apply_migration`" | MCP `apply_migration` does NOT write a local file — it registers the migration remotely only | Wrote `supabase/migrations/20260503055648_c001_add_tenants_test_mode_sms_allowlist.sql` by hand to mirror the remote SQL (also serves as in-tree rollback artifact). See Finding 1. |
| 3 | Activation prompt §Step 8 Test A | First curl had no `lead_id`; my dummy zero-UUID violated the `crm_leads` FK on `crm_message_log.lead_id` | The prompt's curl example omitted `lead_id`, but `send-message` requires it (validation at index.ts:138) and the `crm_message_log` insert FK-fails on a non-existent `lead_id` | Found a real prizma lead via SQL (`286ee8c4-…`, QA_NIGHT_RUN_L2 with the right phone), retried — both tests passed |

All deviations were resolved without escalation. None changed the SPEC's intended outcome.

---

## 6. Decisions Made in Real Time

| # | Ambiguous point | My decision | Why this choice |
|---|-----------------|-------------|-----------------|
| 1 | Migration file path/timestamp (since MCP doesn't auto-generate one locally) | Used the remote-recorded version `20260503055648` from `list_migrations` | Matches the canonical Supabase naming convention; the remote version is the source of truth for what was applied |
| 2 | Whether to commit the migration file at all (project hasn't tracked migrations in git since March) | Committed it anyway | The activation prompt explicitly required Commit B; missing migration files in git is itself a tech-debt issue (see Finding 1) so adding one is a small step toward closing it; the file is a useful rollback artifact |
| 3 | Whether to retry Test A after the dummy-lead_id failure or stop | Retried with a real lead | The failure was in my test payload, not in C-001 functionality — Test B (which exercises the new code path) had already passed with the same dummy `lead_id`. Stopping would have been a false-positive deviation |
| 4 | Whether to wait for explicit SMS-receipt confirmation before committing | Yes — paused and waited | The activation prompt §Step 8 Test A says "Daniel will receive the SMS. Confirm with Daniel before proceeding"; the database evidence (`status='sent'`, Make returned 200) was strong but the prompt was explicit |
| 5 | retry-failed disposition | Documented as "no change needed" without deploy | The grep + source-read showed retry-failed has no own allowlist code; redeploying with no code change would be a no-op that confuses the version history |

---

## 7. What Would Have Helped Me Go Faster

- **A pre-flight reminder that MCP `apply_migration` does NOT write to `supabase/migrations/`** — I noticed only when staging Commit B. Cost: ~3 minutes diagnosing whether the migration had silently failed or whether the workflow simply doesn't materialize a local file. Worth adding to opticup-executor SKILL.md §"DB Pre-Flight Check" or a new §"Migration workflow: MCP vs Supabase CLI".
- **A canonical curl-test recipe with placeholders for `lead_id` from a known prizma row** — the activation prompt's curl example was missing `lead_id`, which is required. Would have saved ~5 minutes finding a real lead via SQL on the fly. Could be a snippet in opticup-strategic SPEC-authoring templates: "if Test X requires a lead, embed a known-good lead UUID from the target tenant".
- **A documented list of "always-safe" prizma test fixtures** (lead UUIDs, event UUIDs, template slugs that exist on prizma + demo) — would help every cutover-blocker SPEC that wants to touch real EFs without polluting prod data. Today every executor session re-discovers these via SQL.

---

## 8. Iron-Rule Self-Audit

| Rule | Touched? | Followed? | Evidence |
|------|---------|-----------|----------|
| 1 — atomic quantity RPC | N/A | — | No quantity changes |
| 5 — FIELD_MAP for new fields | Touched-DB-not-FIELD_MAP | ⚠️ See note | `tenants.test_mode_sms_allowlist` is a server-side EF config field, not surfaced through the FIELD_MAP / `shared.js` data layer. No client-side reader exists. Not a violation in spirit (FIELD_MAP guards Hebrew↔English client field names), but if a future Studio/admin UI exposes the toggle, FIELD_MAP must be updated then. Logged in FINDINGS for the next CRM session to consider. |
| 7 — DB via helpers | Yes (in EF) | ✅ | EF uses `db.from(...).select(...)` directly — Iron Rule 7's `shared.js` helper (`fetchAll` etc.) is for browser-side ERP code. EFs are server-side and use the supabase-js client directly per existing convention (e.g., dispatch.ts, lead-variables.ts). |
| 9 — no hardcoded business values | Yes | ✅ | This rule is the entire reason for C-001. Hardcoded phone array removed; values now read from DB. |
| 11 — atomic RPC for sequential numbers | N/A | — | No sequential generation |
| 12 — file size | Yes | ⚠️ | `send-message/index.ts` now 318 lines — above 300 soft target, below 350 hard cap. Pre-existing trajectory. See Finding 3. |
| 14 — tenant_id on new tables | N/A | — | No new tables (added a column to an existing tenant-scoped table) |
| 15 — RLS on new tables | N/A | — | (Same.) |
| 18 — UNIQUE includes tenant_id | N/A | — | No new constraints |
| 21 — no orphans / duplicates | Yes | ✅ | Grep run before edits; only the 8 expected matches surfaced; no parallel allowlist surfaces left in code; `phoneAllowed` exists in 2 EFs (intentional, identical bodies, 5-line helpers — Foreman §3 explicitly endorsed copy-paste over a not-yet-established `_lib/` import path). The migration also drops nothing — nothing to orphan. |
| 22 — defense-in-depth | Yes | ✅ | Both layer 1 + layer 2 enforce the allowlist independently; tenant_id explicitly passed into both lookups; fail-closed on lookup error or malformed JSON. |
| 23 — no secrets | Yes | ✅ | Migration SQL contains phone numbers (already in source pre-C-001); no API keys, PINs, tokens. ANON_KEY constant in dispatch-queue is unchanged from pre-C-001. |
| 31 — integrity gate | Yes | ✅ | Ran at session start (clean), pre-Commit A (clean), pre-Commit B (clean). |

---

## 9. Self-Assessment

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Adherence to SPEC | 9 | All success criteria met. One mid-execution correction (FK-violating dummy lead_id) — diagnosed locally without escalation. The two factual deviations (config block, migration file) were already corrected in FOREMAN_REVIEW; I executed against the corrected plan. |
| Adherence to Iron Rules | 9 | Rule 12 soft-target now visibly stretched at 318 lines on send-message/index.ts; Rule 5 is non-applicable in spirit but flagged for future. No hard violations. |
| Commit hygiene | 9 | Two commits, atomic, scoped messages with full justification. Did NOT bundle the migration file into the EF commit — kept the schema change separately reversible. |
| Documentation currency | 8 | EXECUTION_REPORT.md + FINDINGS.md complete + committed (this commit). `MASTER_ROADMAP.md` / `docs/GLOBAL_SCHEMA.sql` / `docs/DB_TABLES_REFERENCE.md` / Module 4 SESSION_CONTEXT.md NOT updated — those are batched into the Integration Ceremony per CLAUDE.md §10, which is a Foreman-led step, not an executor step. |
| Autonomy (asked 0 questions) | 9 | One question to dispatcher — but it was the SMS-receipt confirmation that the activation prompt §Step 8 explicitly required ("Confirm with Daniel before proceeding"). All other ambiguities resolved by reading FOREMAN_REVIEW + source. |
| Finding discipline | 10 | 4 findings logged to FINDINGS.md, none absorbed into commits. Severity calibrated honestly (1 MEDIUM, 2 LOW, 1 INFO). |

**Overall (weighted average):** 9.0/10. The score is honest: this was a well-shaped SPEC with high-quality FOREMAN_REVIEW corrections, and the work matched the plan closely. The only place I lost real time was the dummy-lead_id retry on Test A — a cost I'd have avoided with a canonical curl-test recipe.

---

## 10. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Document the MCP migration workflow gap

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"DB Pre-Flight Check" (Step 1.5) — add a new sub-bullet, OR add a new §"Migration workflow: MCP vs CLI".
- **Change:** Add this paragraph:
  > "When applying migrations via `mcp__claude_ai_Supabase__apply_migration`, the tool registers the migration on the remote DB and in `supabase_migrations.schema_migrations` but does NOT write a local file under `supabase/migrations/`. If the SPEC requires a committed migration artifact, the executor must write the file by hand using the version timestamp returned by `mcp__claude_ai_Supabase__list_migrations` and the exact SQL that was applied. This project has not consistently tracked migrations in git since March 2026 — adding one is fine and is a small step toward closing that tech-debt; do not assume the file is auto-created."
- **Rationale:** Cost ~3 minutes in this SPEC diagnosing whether the migration had silently failed or whether the workflow simply doesn't materialize a local file. Will recur in every future schema-touching SPEC until documented.
- **Source:** §7 above + Finding 1.

### Proposal 2 — Pre-flight grep for `crm_message_log.lead_id` FK class of EF tests

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Verification After Changes" (or a new §"EF live-verification checklist").
- **Change:** Add this paragraph:
  > "When an activation prompt provides a curl test against an EF that writes to a row with FK constraints (e.g., `crm_message_log.lead_id` → `crm_leads.id`), verify the test payload uses a real ID before running. If the SPEC's example uses placeholder IDs, query the target tenant for a real row first:
  > ```sql
  > SELECT id FROM crm_leads WHERE tenant_id='<id>' AND phone='<allowlisted>' LIMIT 1;
  > ```
  > Treat 'Could not create log entry' as a payload bug, not an EF bug, and self-correct before reporting deviation."
- **Rationale:** Cost ~5 minutes in this SPEC. The activation prompt's Test A omitted `lead_id` (its own oversight), and a strict reading would have stopped on first deviation. Self-correcting from a known-good prizma lead is the right autonomous response.
- **Source:** §5 deviation 3 + §7 above.

---

## 11. Next Steps

- Commit this report + `FINDINGS.md` in a single `chore(spec): close C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL with retrospective` commit.
- Push to `develop`.
- Signal Foreman: "C-001 Rung 1 closed. Awaiting Foreman review."
- **Cutover-day reminder for Daniel:** on Sunday morning, run:
  ```sql
  UPDATE tenants SET test_mode_sms_allowlist = NULL
  WHERE id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
  ```
  This is the single-row flip that takes prizma from test-mode → production. Out of Rung 1 scope per SPEC §7.
- Pre-cutover sequencing reminder: this was the FIRST of 3 pre-cutover SPECs. Next is **M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 1**, then **P5_7_STOREFRONT_FORM_REWIRE**.

Do NOT write `FOREMAN_REVIEW.md` — that's Foreman's job.

---

## 12. Raw Command Log

Smooth execution. Two notable command-output excerpts captured for posterity:

**Migration apply (success):**
```
mcp__claude_ai_Supabase__apply_migration → {"success":true}
```

**Both EF deploys (version increment confirmed):**
```
send-message:    v17 → v18 (verify_jwt=true)
dispatch-queue:  v6  → v7  (verify_jwt=false)
```

**Pre-commit hook (Commit A):**
```
0 violations, 1 warnings across 3 files
[file-size] supabase\functions\send-message\index.ts:318 — file exceeds 300-line soft target (318 lines)
```

---

*End of EXECUTION_REPORT.*
