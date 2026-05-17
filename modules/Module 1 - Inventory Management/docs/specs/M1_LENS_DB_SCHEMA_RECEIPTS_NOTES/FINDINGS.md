# FINDINGS — M1_LENS_DB_SCHEMA_RECEIPTS_NOTES

> **Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DB_SCHEMA_RECEIPTS_NOTES/FINDINGS.md`
> **Written by:** opticup-executor
> **Written on:** 2026-05-17

Findings discovered during execution but NOT in this SPEC's scope. Logged per Executor SKILL §"Step 3 — Log findings as you go". None were absorbed into this SPEC's commits.

---

## F-1 — Iron Rule 5 + GLOBAL_MAP point at wrong file for FIELD_MAP (LOW)

**Severity:** LOW
**Location:** `CLAUDE.md` §4 Iron Rule 5 + `docs/GLOBAL_MAP.md` line 257
**Description:** Both docs say "FIELD_MAP in `js/shared.js`". Live reality: `js/shared.js` has the `T` constants table but no `FIELD_MAP` literal. The actual `FIELD_MAP` (+ `FIELD_MAP_REV`) is in `js/shared-field-map.js` (lines 2 + 268). An executor following Iron Rule 5 literally and grepping `shared.js` will return 0 hits.

This SPEC's executor lost ~2 min cross-referencing the two files before locating FIELD_MAP. Future executors will hit the same friction.

**Suggested next action:** Edit `CLAUDE.md` Iron Rule 5 to say "FIELD_MAP in `js/shared-field-map.js`" (and same for `docs/GLOBAL_MAP.md` line 257). Or — if there's an architectural plan to fold FIELD_MAP back into `shared.js` — track that as TECH_DEBT and keep the current text.

---

## F-2 — SPEC §5 stop-trigger #4 is obsolete (INFO)

**Severity:** INFO
**Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DB_SCHEMA_RECEIPTS_NOTES/SPEC.md` §5 "Stop-on-Deviation Triggers" item #4
**Description:** Trigger #4 says "If pre-commit destructive-ops hook fires on `CREATE TABLE` keyword (false-positive trap per `SECURITY_HOTFIX_3 P-EXEC-2` lesson) → STOP, document the hook trap, escalate". I read `scripts/checks/destructive-ops-declared.mjs` lines 76-93 and confirmed the hook does NOT scan for `CREATE` keywords. It scans `DROP TABLE / DROP COLUMN / DROP POLICY / TRUNCATE TABLE / ALTER...DROP / unscoped DELETE FROM` only. CREATE patterns are not in the scanner. The trigger is a phantom.

Possible origin: the SECURITY_HOTFIX_3 P-EXEC-2 lesson was about `DROP / DELETE / TRUNCATE / REVOKE` keywords in SQL comments. Someone (Foreman?) wrote SPEC §5 trigger #4 thinking it was about CREATE — either misremembering the lesson or being conservative.

**Suggested next action:** Remove trigger #4 from this SPEC (it's done; doesn't matter now) AND update the executor SKILL.md "SQL migration files — Iron Rule 32 hook comment-awareness" lesson so it explicitly lists which keywords the hook DOES scan (DROP/DELETE/TRUNCATE/REVOKE/ALTER-DROP/unscoped-DELETE) so future SPEC authors don't write phantom triggers.

---

## F-3 — Rule-15 hook scans `docs/` MAP files identically to migration files (LOW)

**Severity:** LOW
**Location:** `scripts/checks/rule-15-rls.mjs` (the pre-commit hook that fired on Commit 3 retry)
**Description:** The hook flagged `modules/Module 1/docs/db-schema.sql` line 2384 ("CREATE TABLE lens_variant_notes (") for missing matching `ENABLE ROW LEVEL SECURITY` or `CREATE POLICY` keywords in the same file. The file is a MAP-style documentation file documenting migrations applied via Supabase MCP — the actual migration with RLS lives in `supabase/migrations/20260517161421_m1_lens_variant_notes.sql`. The hook does not distinguish doc-files from migration-files.

I worked around by inlining the literal RLS DDL keywords in the docs block (which also has the side benefit of more-informative documentation). Future SPECs writing similar MAP-style docs will hit the same trip.

**Suggested next action:** Either (a) extend `scripts/checks/rule-15-rls.mjs` with the same `isDocFile()` heuristic that `destructive-ops-declared.mjs` uses (regex `/^modules\/[^/]+\/docs\/specs\/[^/]+\/[A-Z][A-Z0-9_-]+\.md$/` plus `/^modules\/[^/]+\/docs\/db-schema\.sql$/`) so MAP/SPEC files are skipped, OR (b) document in `CLAUDE.md` Iron Rule 15 enforcement notes that docs-files referencing `CREATE TABLE` must include the RLS keywords inline. Option (a) is the cleaner fix.

---

## F-4 — TECH_DEBT.md naming convention undocumented (LOW)

**Severity:** LOW
**Location:** `TECH_DEBT.md` file header
**Description:** Existing entries use slug-based names (`#M1_CL_ACCESSORY_POLISH`, `#M1_UNIFIED_TOAST_CONTAINER_CONSOLIDATION`, etc.) but the file has no header documenting the convention. Both this SPEC's activation prompt AND the ARCHITECT_DECISION_001 specified `M1-DEBT-XX` numbered form, which doesn't match any existing entry. Stale references like this propagate across SPECs.

**Suggested next action:** Add a section to the `TECH_DEBT.md` header documenting "Entry naming: `#{MODULE}_{SHORT_SLUG}` (slug-based; numbered M1-DEBT-XX form is deprecated)" — or — if numbered IS the desired convention, add it across existing entries. Pick one, document it.

---

## F-5 — `purchase_receipt.delivery_note_number` is nullable in live DB; SPEC docs claim NOT NULL (INFO)

**Severity:** INFO (out of scope for SPEC 3 to fix)
**Location:** `docs/DB_TABLES_REFERENCE.md` line 170 + live DB `information_schema.columns`
**Description:** The DB_TABLES_REFERENCE entry for `T.PURCHASE_RECEIPT` says "`**delivery_note_number NOT NULL**` (D-M1-09)". Live DB column has `is_nullable=YES`. There's an unwind history here:
- Lens-1A migration (`20260514180300_m1_lens_phase_1a_operations_governance.sql`) likely declared NOT NULL
- Migration `20260517074952_m1_unified_flow_c_allow_null_delivery_note_for_undocumented` (per migration list) reverted to nullable
- The reverted state matches the M1_INVENTORY_DEBT_DECOUPLING line in Module 1 db-schema.sql

The doc text is stale relative to current state.

**Suggested next action:** Out of SPEC 3 scope (not touched by SPEC 3 commits). Future Sentinel scan or doc-currency SPEC should sweep DB_TABLES_REFERENCE.md against `information_schema` and flag drift like this. Cheap to fix in isolation; not worth a one-line patch in this SPEC.

---

## F-6 — `pipeline-coordination.mjs` flag-name mismatch in activation-prompt v1 (INFO)

**Severity:** INFO
**Location:** `modules/Module 1 - Inventory Management/docs/specs/M1_LENS_DB_SCHEMA_RECEIPTS_NOTES/ACTIVATION_PROMPT.md` (the v1 prompt that triggered Session A's halt)
**Description:** v1 prompt used flags `--pipeline` and `--files-owned`. The script's flags are `--spec-slug` and `--files-owned-globs`. v2 prompt corrected this. The v1 is now historical context — no fix needed since it's superseded by v2.

**Suggested next action:** None for SPEC 3. For future activation prompts that invoke `pipeline-coordination.mjs`, author should test the command verbatim before pasting into the prompt.

---

## F-7 — `js/shared.js` + `js/shared-field-map.js` slightly over the 300-line soft target (INFO)

**Severity:** INFO
**Location:** `js/shared.js` (now 325 lines) + `js/shared-field-map.js` (now 318 lines)
**Description:** Both files now exceed the 300-line soft target from Iron Rule 12 (max 350). The pre-commit hook emits warnings (not violations) for each. The increases are 1 line each in this SPEC (T constant for shared.js, FIELD_MAP block opening for shared-field-map.js) and align with the file's clear single-responsibility (T constants and FIELD_MAP entries respectively — adding more is what these files are *for*).

**Suggested next action:** Monitor. Soft target is 300, hard max is 350. Neither file is close to 350. If a future SPEC pushes either over 350, split per Iron Rule 12. No action needed now.

---

*End of FINDINGS. 7 findings logged: 0 CRITICAL, 0 HIGH, 0 MEDIUM, 3 LOW, 4 INFO. No findings absorbed into SPEC 3 scope.*
