# FINDINGS — M1_FOUNDATION_CLOSE_CLEANUP_2026_05_17

> **Written by:** opticup-executor
> **Written on:** 2026-05-17

5 findings logged; none absorbed into SPEC scope.

---

## F-X (Foreman lesson) — SPEC author allowlist + path typos: `modules/inventory/` vs `modules/lens-inventory/` (MEDIUM)

**Severity:** MEDIUM (process — Foreman authoring discipline)
**Location:** This SPEC's §4 allowlist + §3 S5 + §4 op #3 — all had `modules/inventory/` where `modules/lens-inventory/` was intended.
**Description:** Three occurrences in this SPEC.md of the wrong leading directory path. The `modules/inventory/` directory contains generic frames-era inventory code (inventory-shell-lens.js manifest, inventory-actions.js, etc.). The `modules/lens-inventory/` directory contains the M1 Lens screen code. They are siblings. The SPEC author conflated them.

Daniel-Architect already recognized this typo class in chat when amending the §4 allowlist:
> "§4 allowlist is amended to include modules/lens-goods-receipt/ — it's a sibling M1 lens module structurally identical to modules/lens-inventory/ in scope. The original allowlist wording (modules/inventory/) was a Foreman typo missing the lens- prefix."

Same typo pattern recurred in §3 S5 (verification command path) and §4 op #3 (destructive-op path). The latter caused an Iron Rule 32 hook failure mid-execution because the hook couldn't match the SPEC declaration against the actual deletion path. Recovered via SPEC amendment at commit 3 retry.

**Suggested next action:** Foreman lesson for future SPEC authoring (especially when the SPEC text mentions a sibling lens module):
- Before sealing a SPEC, run `ls <each-declared-path>` to verify every literal path resolves on disk.
- The opticup-strategic SKILL should include a pre-seal checklist item: "For every absolute path in §3 verification commands, §4 destructive-ops, §9 expected files — confirm via `Test-Path` or `ls` that the path exists."

Worth documenting as `OPTICUP_STRATEGIC_PRE_SEAL_PATH_CHECK` improvement in the next opticup-strategic FOREMAN_REVIEW (or harvest from this SPEC's FOREMAN_REVIEW once written).

---

## F-1 — `modules/inventory/inventory-shell-lens.js` over Iron Rule 12 300-line target (INFO)

**Severity:** INFO (pre-existing)
**Location:** `modules/inventory/inventory-shell-lens.js` — 345 lines before this SPEC, 344 after (1 line removed).
**Description:** The shell-loader manifest file was already over the 300-line soft target before this SPEC ran. The pre-commit hook emitted a warning during commit 3. This SPEC didn't make it worse — it removed 1 line (the retired stub's manifest entry).

The file is mostly the manifest object literal (~250 lines of script-paths + label/icon/perm per tab). Refactoring to a separate JSON/data file would bring it under target.

**Suggested next action:** Out of scope for this SPEC. File as TECH_DEBT or bundle into the next M1 maintenance SPEC (alongside the other `#M1_UNIFIED_*` entries currently tracked). Trivial extraction — could be ~30 min when bundled.

---

## F-2 — `LensInvQuickScan` comment reference remains in `modal-shows.js:122` (INFO)

**Severity:** INFO
**Location:** `modules/lens-inventory/lens-inventory-modal-shows.js:122` — comment block referencing the now-deleted `LensInvQuickScan` global.
**Description:** Kept as historical documentation explaining why the scan-in handler funnels through the scan modal → drawer rather than directly. The reference is to a no-longer-existing window global, but the rationale text remains useful for future readers.

**Suggested next action:** None — intentional retention. If the comment block becomes confusing later, a future refactor can prune it.

---

## F-3 — Iron Rule 32 hook path-match too strict for SPEC-author typos (LOW)

**Severity:** LOW (tooling)
**Location:** `scripts/checks/destructive-ops-declared.mjs` — path-match logic for staged-deletion ↔ SPEC §4 declaration.
**Description:** The hook requires the SPEC's declared deletion path to match the actual staged deletion's path. When the SPEC has a typo in the declared path (e.g. `modules/inventory/foo.js` instead of `modules/lens-inventory/foo.js`), the hook fails the commit even though the *intent* was authorized.

In this SPEC's commit 3, the typo blocked the commit until the SPEC was amended. The right behavior was achieved (SPEC fix + commit accepted), but the hook's intolerance forced a mid-execution SPEC amendment under time pressure.

**Suggested next action:** Consider a fuzzy-match mode: if the staged-deletion path's basename matches a SPEC declaration's basename within the same module, accept with a warning rather than blocking. Out of scope for this SPEC; file as `SCRIPTS_DESTRUCTIVE_OPS_FUZZY_MATCH` improvement candidate.

OR keep the strict gate (it caught a real defect — the SPEC needed amendment regardless) and just note that SPEC authors should pre-flight path-checks (see F-X above).

---

## F-4 — Advisor `anon_security_definer_function_executable` WARN inherited by new RPC overload (INFO)

**Severity:** INFO (pre-existing project pattern)
**Location:** `mcp__supabase__get_advisors(security)` — both 8-arg (now dropped) and 9-arg (new) variants of `m1_create_receipt_from_box`.
**Description:** The new 9-arg overload inherits the same advisor WARN as the 8-arg: anon can EXECUTE the SECURITY DEFINER function. The project's intentional pattern is: server-side JWT-tenant guard at the function body (line 18-20: `RAISE EXCEPTION USING ERRCODE = '42501'`) provides the actual tenant isolation; the permissive ACL is required so PostgREST can route anon-via-JWT calls.

Other Phase 1A SECDEF RPCs were REVOKEd from PUBLIC/anon during `M1A_OPERATIONS_RPCS_FIX` (2026-05-15) but `m1_create_receipt_from_box` was intentionally left with anon EXECUTE (it's a K2 contract called from the public lens-goods-receipt + lens-inventory drawer flows). Maintains parity.

**Suggested next action:** None — intentional. The advisor WARN is a known project-pattern false-flag for this function. Documented here so future executors don't waste time chasing it.

---

*End of FINDINGS. 5 entries: 0 CRITICAL/HIGH, 1 MEDIUM (F-X Foreman typo lesson), 1 LOW (F-3 hook strictness), 3 INFO. No absorptions.*
