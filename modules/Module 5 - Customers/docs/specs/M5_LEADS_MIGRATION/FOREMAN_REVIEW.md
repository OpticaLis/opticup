# M5_LEADS_MIGRATION — Foreman Review

> **Role:** opticup-strategic Foreman. 2026-05-23.

## SPEC quality

- 17 measurable criteria. All pass.
- §0 pre-flight correctly identified: 'lead' missing from enum; source_crm_lead_id seam needed; phone-dedup pattern.
- Destructive Operations declared (INSERT + UPDATE + ADD COLUMN/ADD VALUE) — Iron Rule 32 sharper than Track 1's "None.".
- Gate logic (demo 5/5 + backup before Prizma) honored.

## Execution quality

- 3 MCP migrations + 2 RPC calls (demo + Prizma after demo PASS + backup note).
- Idempotency proven (T2-S2 re-run linked existing customer via phone, no double-INSERT).
- 1296/1296 Prizma migrated cleanly; no errors; crm_leads untouched.
- M4 demo write test confirmed M4 still works.

## Findings

5 F-T2-* — 1 TECH_DEBT (M4-cutover FK re-point), 4 dismissed with rationale.

## 2 author-skill (opticup-strategic) proposals

### P-AUTHOR-1 — Brief→reality count reconciliation in §0

**Symptom:** Brief said "28 demo + 1,354 Prizma". §6 probe showed those are TOTAL incl. soft-deleted; only 4 + 1,296 are active. Track 2 SPEC documented this delta but the Brief number could have been "1,296 Prizma active" upfront if the §0 probe had been used to update the Brief draft.

**Proposed change:** Update SKILL.md SPEC Authoring Protocol step 1 (Pre-SPEC Preparation):

> **Reconcile Brief vs §0 probe counts.** Any quantitative claim in the Brief (row counts, table counts, etc.) MUST be re-probed in §0 and discrepancies documented in the SPEC body. Do NOT silently restate the Brief number if the probe shows a different reality. Document both ("Brief said N; probe shows M; SPEC scopes to M because …").

### P-AUTHOR-2 — Always document the seam back-reference

**Symptom:** `customers.source_crm_lead_id` is the seam that future M4-cutover SPEC will use. Without explicit documentation in M5 db-schema header + GLOBAL_MAP, future authors may not know this seam exists.

**Proposed change:** Add to SPEC_TEMPLATE.md:

> **Additive Seam Documentation:** When a SPEC adds a back-reference column connecting an existing entity to a future-cutover entity (e.g., customers.source_crm_lead_id), the column MUST be:
> 1. Commented in-DB with the cutover plan (COMMENT ON COLUMN).
> 2. Documented in the module's MODULE_MAP.md cross-contract surface table.
> 3. Recorded in GLOBAL_MAP.md so M4 (or downstream) authors find it.

## 2 executor-skill (opticup-executor) proposals

### P-EXEC-1 — Gate enforcement: demo smoke MUST pass before Prizma write

**Symptom:** Track 2 correctly waited for demo 5/5 PASS before running Prizma. This was honored by judgment, not by a structural gate. Future migration SPECs need a stronger gate.

**Proposed change:** Add to opticup-executor SKILL.md:

> **Migration-track gate enforcement:** For any SPEC declared as "demo-first then production", the executor MUST:
> 1. Run demo migration + smoke + verify PASS.
> 2. Take backup note explicitly (a file in the SPEC folder's backup/ subdir).
> 3. Only THEN execute production. If smoke fails or backup not taken → halt + escalate. The gate is not a recommendation; it's a rule.

### P-EXEC-2 — RPC bypass-path verification before invoking migration RPC

**Symptom:** First migrate_crm_leads_to_customers call failed because MCP runs as `postgres` not `service_role` → Block A inner check fired. Resolution: SET LOCAL request.jwt.claims to '{"role":"service_role"}' first. Same pattern as F-EXEC-1 in Track 1.

**Proposed change:** Already proposed in Track 1 P-EXEC-1. Reinforce: this is the canonical service_role bypass pattern. Add a section to opticup-executor SKILL.md "JWT setup for MCP RPC calls" with a code sample.

## Master-doc update

- MODULE_5_ROADMAP needs Phase C status update (migration partial — needs M4-cutover follow-up SPEC).
- GLOBAL_MAP add `customers.source_crm_lead_id` to cross-module surfaces.

## Verdict

**🟢 CLOSED.** Demo 5/5 + Prizma 1,296 migrated. 0 errors. crm_leads untouched.
