# EXECUTION_REPORT — M4_LEAD_EYE_EXAM_DEFAULT — Rung 1 (Backend)

**Executor:** opticup-executor (Claude Code, Windows desktop, `C:\Users\User\opticup`)
**Date:** 2026-05-02
**Rung:** Rung 1 — backend infrastructure (column + EF structured write + config block)
**Commit:** `c438c75` — `feat(crm): M4 Rung 1 — add crm_leads.eye_exam_default + lead-intake EF structured write`
**Branch:** `develop` → pushed
**Tenant for QA:** `prizma` (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`) — per Daniel's mid-session correction; demo no longer in use.

---

## 1. Summary

Rung 1 added `crm_leads.eye_exam_default TEXT NULL` and rewired the `lead-intake` Edge Function to write the eye-exam preference as a structured field instead of concatenating it into `client_notes`. The EF now also validates the incoming `eye_exam` body field against a 4-string canonical Hebrew allow-list and rejects unknown values with HTTP 400 `INVALID_EYE_EXAM_DEFAULT`. A `[functions.lead-intake]` block was added to `supabase/config.toml` to lock `verify_jwt = true` against accidental CLI redeploy drift (mirrors the lesson from M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE Rung 2). The cutover-blocking dependency for P5_7 (storefront form rewire) is now satisfied: any lead created via the new form will persist its eye-exam preference structurally.

---

## 2. What was done (per commit)

Single commit `c438c75` covers all three deltas:

- **Migration applied to prizma:** `modules/Module 4 - CRM/migrations/2026_05_03_lead_eye_exam_default_01_schema.sql` — `ALTER TABLE crm_leads ADD COLUMN eye_exam_default TEXT NULL` + `COMMENT ON COLUMN`. Verified post-apply: 1 row in `information_schema.columns` (data_type=text, is_nullable=YES).
- **EF source edits** (`supabase/functions/lead-intake/index.ts`, +20/-6 lines, 303 → 304 lines total):
  - Added `EYE_EXAM_OPTIONS` const allow-list of 4 canonical Hebrew strings.
  - Added validation immediately after `trimOrNull(body.eye_exam)`: returns HTTP 400 `INVALID_EYE_EXAM_DEFAULT` for non-null, non-allow-list values.
  - Replaced the `noteParts.push(\`בדיקת עיניים: ${eyeExam}\`)` concatenation block (~5 lines) with `const clientNotes: string | null = notes ? notes : null;`.
  - Added `eye_exam_default: eyeExam` to the INSERT row builder, placed immediately after `client_notes`.
- **EF deployed** to prizma project (single multi-tenant project) as version 20, `verify_jwt = true`, ACTIVE. `ezbr_sha256` `34910f83812469b891c187159ed3e6410825a516f40e3557a0bae03fb157099d`.
- **`supabase/config.toml`:** appended `[functions.lead-intake]` block (`enabled = true`, `verify_jwt = true`, `import_map = "./functions/lead-intake/deno.json"`, `entrypoint = "./functions/lead-intake/index.ts"`) immediately after the `[functions.facebook-campaigns-sync]` block.

---

## 3. QA — curl tests on prizma

All three tests run against the live deployed EF (version 20). Phones used were Daniel's own (authorized for QA on prizma): Test A `0537889878`, Test C `0503348349`. Test B used an arbitrary `0539999999` because validation rejects before any DB write.

| Test | Body fragment | HTTP | Body | Row outcome |
|---|---|---|---|---|
| **A** valid option | `"eye_exam":"כן, בדיקת מולטיפוקל"` | **201** | `{"id":"672748e4-...","is_new":true}` | Row created. `eye_exam_default = 'כן, בדיקת מולטיפוקל'`, `client_notes IS NULL`, `phone = '+972537889878'`, `status = 'invited'` (T5 fired — see Deviations §4 below). |
| **B** invalid option | `"eye_exam":"garbage"` | **400** | `{"error":"INVALID_EYE_EXAM_DEFAULT"}` | No row inserted. Verified by `SELECT … phone='+972539999999'` → 0 rows. |
| **C** field absent | (no `eye_exam` key) | **201** | `{"id":"731e7671-...","is_new":true}` | Row created. `eye_exam_default IS NULL`, `client_notes IS NULL`. |

Cleanup (post-tests): hard-deleted dependent rows (`short_links` 8, `crm_message_log` 4, `crm_event_attendees` 2) for both fresh leads, then hard-deleted both `crm_leads` rows (`672748e4...`, `731e7671...`), then reverted soft-delete on the 2 pre-existing prizma leads that had been hidden during testing (`e1db152f...` "QA-A קופון בתוקף", `d544a06d...` "QA-B ביטל"). Final state of prizma's leads on Daniel's two phones: identical to pre-Rung state, with all changes successfully reverted.

---

## 4. Deviations from SPEC / activation prompt

Each deviation is logged with what happened, why, and how it was resolved.

1. **Tenant changed mid-flight: demo → prizma.** The activation prompt instructed all curl tests on `demo`. Daniel intercepted at session start and re-pointed to `prizma` (slug `prizma`, tenant_id `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`) because demo is no longer in use and prizma is treated as an empty production tenant. Cleanup was also upgraded from soft-delete to hard-DELETE per his instruction. **Resolution:** all SQL and curl payloads now reference prizma; Iron Rule 3 (soft delete only) was deliberately overridden for the test-row cleanup with explicit Daniel authorization.

2. **2 pre-existing active leads on prizma collided with Test A/C phones.** Found at curl-time: `e1db152f...` "QA-A קופון בתוקף" (Test A's phone) and `d544a06d...` "QA-B ביטל" (Test C's phone) were both `is_deleted=false`. Without intervention, the EF's duplicate-check would have returned HTTP 409 instead of 201 + is_new:true, and `eye_exam_default` would never have been written through the new INSERT path. **Resolution (Daniel-approved option 1):** soft-deleted both pre-existing rows before tests, ran A/B/C, hard-deleted the 2 fresh rows + their dependents, then reverted is_deleted=false on the original 2. Net change to prizma data: zero.

3. **Test A first attempt returned HTTP 400 INVALID_EYE_EXAM_DEFAULT despite a valid Hebrew option.** Caused by Git Bash on Windows mangling Hebrew bytes when passed inside a multi-line single-quoted `curl -d '...'` body. Verified by hexdumping `echo -n` output (correct UTF-8) vs. inspecting the deployed EF source (also correct UTF-8) — both matched, but the over-the-wire bytes differed. **Resolution:** wrote the JSON body to a UTF-8 file and used `curl --data-binary @file.json`. Test A then returned 201 as expected. This is also logged as FINDING #2 below for future SPEC authors and for the pain-points list in §6.

4. **Pre-commit hook emitted a Rule 12 file-size warning** (not violation): `index.ts` grew from 296 → 304 lines, exceeding the 300-line soft target by 4. Absolute max is 350, so the commit was permitted. The +8 net lines were unavoidable given the new `EYE_EXAM_OPTIONS` const (7 lines), the validation block (3 lines), and the INSERT-row addition (1 line), partially offset by replacing 5 lines of concatenation with 1 line. **Resolution:** noted; no action needed unless the file grows further.

5. **`crm_event_attendees` and other FK dependents blocked the cleanup DELETE.** First cleanup attempt failed with `23503` (FK violation from `crm_event_attendees`) and `23505` (partial unique index conflict on phone). The fresh-lead path (`dispatchFreshLead` → T5 branch) had created event-attendee rows + 4 message-log rows + 8 short-links per fresh lead because prizma has at least one active event in `registration_open` / `waiting_list` status. **Resolution:** queried `pg_constraint` for all FKs targeting `crm_leads`, deleted from each in dependency order (`short_links` → `crm_message_log` → `crm_event_attendees` → `crm_leads`), then performed the soft-delete revert.

---

## 5. Decisions made in real time (places the SPEC was silent)

- **Cleanup order on prizma:** the activation prompt's cleanup section assumed the leads had no FK dependents (matching its original demo target where dispatch may behave differently). On prizma the T5 path fired and created attendees/messages/short-links. I had to introspect FKs and delete in dependency order. *Author improvement opportunity: future SPECs that ship through `lead-intake` on a tenant with an active event must enumerate the dependent tables in the cleanup script.*
- **Phone for Test B:** the prompt picked `0501112255` for Test C and didn't specify a phone for Test B beyond reusing C's. After the demo→prizma re-point, I picked `0539999999` for Test B because (a) it cannot collide with Test A or C phones, (b) the EF rejects before phone normalization is even checked for downstream effects, and (c) no real risk of SMS dispatch since validation fires first.

---

## 6. What would have helped me go faster

- **Pre-flight finding: existing active QA leads on prizma using Daniel's phones.** The activation prompt assumed a clean phone-space on the test tenant. A 30-second `SELECT id, full_name, phone, is_deleted FROM crm_leads WHERE phone IN (...) AND is_deleted=false` line in the SPEC's pre-flight section would have surfaced the collision before I tried to curl. Cost: one stop-and-ask cycle (~3 minutes), one extra DB roundtrip.
- **Curl Hebrew-payload guidance.** A one-line note in the SPEC ("for non-ASCII bodies, write the JSON to a temp file and use `curl --data-binary @file`, do NOT use `-d` with multi-line single quotes — Git Bash on Windows mangles UTF-8 in multi-line single-quoted args") would have saved one full failed Test A round-trip + 5 minutes of byte-comparison debugging. The deployed EF source and the local source had identical bytes — the only difference was on the wire.
- **A canonical FK-dependents cleanup snippet** for `crm_leads` test rows. The `pg_constraint` introspection took ~2 minutes to compose; a re-usable WITH-CTE pattern in the executor skill's references would have skipped that.

---

## 7. Iron-Rule self-audit

| Rule | Status | Evidence |
|---|---|---|
| 1 (atomic quantity) | N/A | No quantity changes. |
| 2 (writeLog) | N/A | EF write path; ActivityLog is client-side. EF logs to `crm_message_log` + `crm_automation_runs` already (unchanged). |
| 3 (soft delete only) | **Override w/ authorization** | Cleanup of 2 fresh QA rows was hard-DELETE per Daniel's explicit instruction. Pre-existing 2 rows used soft-delete + revert. |
| 5 (FIELD_MAP) | **N/A for EF / addressed in Rung 2 scope** | `eye_exam_default` is consumed by the storefront form + ERP UI in Rung 2; FIELD_MAP entry in `js/shared.js` belongs to Rung 2's scope (UI rewiring). The Foreman should validate this scope boundary in review. Flagged as FINDING #3. |
| 7 (API abstraction) | ✓ | EF uses service-role `createClient`; not a `shared.js` helper context. ERP-side reads in Rung 2 will use `DB.*`. |
| 8 (escape/sanitize) | ✓ | EF returns JSON only, no innerHTML. Hebrew strings are server-side, not interpolated into HTML. |
| 9 (no hardcoded business values) | **Acceptable per SPEC scope** | The 4 canonical option strings are hardcoded in the EF allow-list. SPEC §"B1 rollout" deliberately freezes these strings; if/when they become tenant-configurable, that's a separate SPEC. Flagged as FINDING #4 (informational). |
| 10 (global name collision) | ✓ | `EYE_EXAM_OPTIONS` is local to the EF module; no global namespace impact. Verified no other reference to that name in the repo. |
| 12 (file size) | ⚠ | `index.ts` is 304 lines (300 soft target, 350 absolute max). Pre-commit hook warned but did not block. |
| 14 (tenant_id on every table) | ✓ | No new table; only a new column on existing multi-tenant `crm_leads`. |
| 15 (RLS) | ✓ | No policy change; existing `crm_leads` RLS continues to gate the new column. |
| 18 (UNIQUE includes tenant_id) | ✓ | No new unique constraint. |
| 21 (no orphans, no duplicates) | ✓ | DB Pre-Flight Check evidence: greps for `eye_exam_default` across `docs/GLOBAL_SCHEMA.sql`, `docs/GLOBAL_MAP.md`, `modules/*/docs/db-schema.sql`, `modules/*/docs/MODULE_MAP.md` — no prior occurrences. The Foreman pre-verified column non-existence in 2026-05-02 evening; I re-verified on prizma at curl-time (0 rows in `information_schema.columns` before migration, 1 row after). FOREMAN_REVIEW for this SPEC also confirms no prior `eye_exam_default` symbol in the codebase. |
| 22 (defense-in-depth on writes) | ✓ | EF INSERT row sets `tenant_id: tenantId` (resolved from slug, not from body). Existing pattern; unchanged by Rung 1. |
| 23 (no secrets) | ✓ | The legacy ANON_KEY remains git-tracked and is the same value already in `js/shared.js` per the EF's own comment (lines 18-22). No new secrets. |
| 31 (integrity gate) | ✓ | Pre-execution: 65 files clean. Post-execution: 67 files clean. |

---

## 8. Self-assessment

| Dimension | Score (1-10) | Justification |
|---|---|---|
| Adherence to SPEC | 9 | All required deliverables shipped exactly as specified, with deviations clearly logged. The mid-flight tenant change (demo→prizma) is reflected throughout, not just where convenient. |
| Adherence to Iron Rules | 8 | One soft target exceeded (Rule 12, +4 lines, hook-warned). Rule 3 override was Daniel-authorized in real time and logged. Rule 5 deferred to Rung 2 by design (flagged for Foreman). |
| Commit hygiene | 9 | Single, scoped commit with descriptive message; explicit `git add` of exactly 3 files; no stray staging; pre-commit hook clean except the soft warning. The 1 unrelated modified file (`CAMPAIGN_OVERSEER_HANDOFF.md`) was preserved untouched per Daniel's option (b) at session start. |
| Documentation currency | 6 | EXECUTION_REPORT and FINDINGS will be committed in a follow-up commit. The migration SQL has a thorough `COMMENT ON COLUMN`. **Did not** update `docs/GLOBAL_SCHEMA.sql` or `modules/Module 4 - CRM/docs/db-schema.sql` to reflect the new column — those merges happen at Integration Ceremony per CLAUDE.md §10, not per-Rung. **Did not** update FIELD_MAP — deferred to Rung 2 per scope. The activation prompt was not explicit about which docs to update inline; flagged as FINDING #5 for the Foreman. |

---

## 9. Two proposals to improve `opticup-executor` skill

These come from real pain points in this run, not generic advice.

**Proposal 1 — Add a "non-ASCII payload curl recipe" reference to the executor skill.**

*Where:* `.claude/skills/opticup-executor/SKILL.md` — add a new subsection in "Code Patterns / Git discipline" called **"Curl with non-ASCII (Hebrew/RTL) bodies on Windows"**.

*Concrete change:* document the exact pattern that works:
```
cat > /tmp/body.json << 'EOF'
{"key": "Hebrew text here"}
EOF
curl --data-binary @/tmp/body.json ...
```
And document the failure mode: `curl -d '{multi-line JSON with Hebrew}'` mangles UTF-8 in Git Bash on Windows.

*Why this matters:* Optic Up is Hebrew-first. Future executors WILL hit this. I burned ~5 minutes on it in this Rung. Centralizing the recipe means the next executor pays zero seconds.

---

**Proposal 2 — Extend Step 1.5 "DB Pre-Flight Check" in the executor skill to include a "test-data collision check" when a SPEC's QA plan uses real phone numbers / emails / barcodes.**

*Where:* `.claude/skills/opticup-executor/SKILL.md` § Step 1.5 — DB Pre-Flight Check.

*Concrete change:* add a 7th bullet:
> 7. **Test-data collision check.** If the SPEC's QA section mentions specific phones, emails, barcodes, or other tenant-scoped unique-ish identifiers, run a `SELECT … WHERE <field> IN (...) AND is_deleted=false AND tenant_id=$tenant` for each. If any active row matches → STOP and escalate. Decide with the Foreman/user whether to (a) soft-delete-then-revert, (b) use different test data, or (c) hard-delete the existing rows. NEVER proceed with QA if active rows would cause duplicate-check, unique-constraint, or RLS shadowing surprises.

*Why this matters:* in this Rung, prizma had 2 active leads on Daniel's two QA phones. Without the soft-delete-then-revert workaround, Test A and Test C would have failed (duplicate path → 409 instead of fresh-insert → 201). The collision was invisible at SPEC-authoring time but trivial to detect at executor pre-flight time. A standardized check catches this every time.

---

*EXECUTION_REPORT complete. FINDINGS.md follows in same SPEC folder. Awaiting Foreman review.*
