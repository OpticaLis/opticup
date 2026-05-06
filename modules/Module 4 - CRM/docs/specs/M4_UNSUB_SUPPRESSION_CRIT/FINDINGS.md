# FINDINGS — M4_UNSUB_SUPPRESSION_CRIT

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_UNSUB_SUPPRESSION_CRIT/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC §10 cited template slug `event_registration_open` that does not exist in demo

- **Code:** `M4-DOC-04`
- **Severity:** LOW
- **Discovered during:** §12 QA pre-flight (looking up the template referenced by SPEC §10)
- **Location:** `modules/Module 4 - CRM/docs/specs/M4_UNSUB_SUPPRESSION_CRIT/SPEC.md` §10 + §12 step 4
- **Description:** The SPEC said "template_slug=`event_registration_open` (or any active template)". A `SELECT slug FROM crm_message_templates WHERE tenant_id={demo} AND slug LIKE 'event_registration%'` confirmed only `event_registration_confirmation_*` and `event_registration_form_*` (and similar) exist — no `event_registration_open`. Same root-cause class as `M4-DOC-02` (SPEC author citing names from memory rather than from a confirmation query).
- **Reproduction:**
  ```sql
  SELECT slug FROM crm_message_templates
  WHERE tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND slug LIKE 'event_registration%';
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §10): a template named `event_registration_open` would resolve to a real row.
  - Actual: no such slug; closest matches are `event_registration_confirmation_*`.
- **Suggested next action:** TECH_DEBT — extend Foreman Proposal 1 from `M4_PUBLIC_FORM_VARIABLES_HIGH/FOREMAN_REVIEW.md` (which added column-nullability check to opticup-strategic Step 1.5) to ALSO cover catalog row existence: every named template-slug, RPC, view, or T-constant cited in a SPEC's `§10 Dependencies` or `§12 QA Plan` should be confirmed with a `SELECT` against the appropriate catalog/data table. The "or any active template" parenthetical in §10 made this a non-blocker, but it's still a SPEC quality issue.
- **Rationale for action:** The `\d <table>` mitigation from the prior FOREMAN_REVIEW catches column existence/nullability; it doesn't catch row-level catalog-name existence (templates, RPCs by name). One more incremental query saves the executor from inventing substitutes mid-run.
- **Foreman override:** { }

---

### Finding 2 — `crm_leads` tenant-scoped phone uniqueness blocks multi-lead testing with whitelist contacts

- **Code:** `M4-INFRA-04`
- **Severity:** LOW (test-friction; production-correct behavior)
- **Discovered during:** §12 QA Test 4 setup (creating a 2nd test lead with same whitelist phone while 1st was active)
- **Location:** `crm_leads` table — UNIQUE constraint `crm_leads_tenant_phone_active_uniq` on `(tenant_id, phone) WHERE NOT is_deleted`.
- **Description:** Tests that need a "fresh second lead with the same whitelist phone" must soft-delete the prior one first. The constraint is correct production behavior (preventing duplicate active leads per phone per tenant) but adds a small choreography step in test plans that re-use the whitelist `+972537889878` across multiple test leads. The SPEC §12 step 13 said "Create a separate test lead (or reuse) where unsubscribed_at was always NULL" — the "or reuse" parenthetical accommodates the constraint but the executor still needs to navigate it.
- **Reproduction:**
  ```sql
  -- After 1st test lead exists active:
  INSERT INTO crm_leads (tenant_id, phone, ...) VALUES (..., '+972537889878', ...);
  -- → ERROR 23505: duplicate key value violates unique constraint "crm_leads_tenant_phone_active_uniq"
  ```
- **Expected vs Actual:**
  - Expected: independent test runs.
  - Actual: must soft-delete each test lead before creating the next one with the same phone.
- **Suggested next action:** DISMISS as a constraint design (production-correct). For executor SKILL: codify the "soft-delete-then-recreate" mini-recipe so multi-lead test plans don't surprise future executors. Optional: opticup-strategic could add a one-liner to SPEC templates whenever the QA plan cites multiple test leads with whitelist phones.
- **Rationale for action:** The constraint is right; the friction is documented and now part of execution muscle memory.
- **Foreman override:** { }

---

### Finding 3 — Supabase MCP `deploy_edge_function` 5xx pattern hardens to 3-occurrence threshold

- **Code:** `M4-INFRA-05`
- **Severity:** MEDIUM (was MEDIUM in prior review; now hardened by repetition)
- **Discovered during:** §3 #3 EF deploy step
- **Location:** Supabase Management API path (external; no source file in this repo)
- **Description:** `deploy_edge_function` returned `InternalServerErrorException: "Function deploy failed due to an internal error"` on both attempts within seconds of each other. **3rd documented occurrence in 14 days** (ATOMIC_CONFIRMATION_FLOW: 4×; M4_PUBLIC_FORM_VARIABLES_HIGH: 2×; this SPEC: 2×). Daniel's CLI succeeds in every case. The prior FOREMAN_REVIEW (`M4_PUBLIC_FORM_VARIABLES_HIGH`) already proposed codifying the workaround in `docs/TROUBLESHOOTING.md` and the strategic SKILL. **That follow-up is now overdue at the 3-occurrence rule.**
- **Reproduction:** invoke `mcp__claude_ai_Supabase__deploy_edge_function` for any non-trivial EF.
- **Expected vs Actual:**
  - Expected: 200 + new version number.
  - Actual: `InternalServerErrorException` with no detail. CLI deploy from the same source content + same project: 200 + new version.
- **Suggested next action:** **APPLY the prior FOREMAN_REVIEW's accepted Proposal 2 immediately** — embed the canonical CLI command verbatim in `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §10. THIS SPEC already had it (the prior proposal was harvested into §10 as embedded text), and that pre-acknowledgment saved ~30 seconds of executor lookup. Continue to apply going forward. ALSO add a one-line entry to `docs/TROUBLESHOOTING.md` under "Edge Function deploy".
- **Rationale for action:** 3-occurrence pattern → "apply directly, don't keep proposing." The mitigation already proved effective in this SPEC (the §10 CLI fallback was used immediately when MCP failed; no executor-side improvisation needed).
- **Foreman override:** { }

---

*End of FINDINGS.*
