# FINDINGS — M3_FUNNEL_PIXEL_BACKWIRE

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_FUNNEL_PIXEL_BACKWIRE/FINDINGS.md`
> **Executor:** opticup-executor (Sonnet 4)
> **Logged:** 2026-05-16 morning

Findings discovered during execution that are NOT in scope for this SPEC.

---

## F-EXEC-1 — SPEC §8 omitted `deno.json` companion-file requirement for new EF (LOW)

- **Severity:** LOW (resolved in-flight; codified for next executor)
- **Location:** `modules/Module 3 - Storefront/docs/specs/M3_FUNNEL_PIXEL_BACKWIRE/SPEC.md` §8 "New files" — listed only `supabase/functions/pixel-fired/index.ts`. Did NOT list `supabase/functions/pixel-fired/deno.json`.
- **Description:** First deploy attempt failed with `BadRequestException: Failed to bundle the function (reason: Relative import path "@supabase/functions-js/edge-runtime.d.ts" not prefixed with / or ./ or ../ at file:///tmp/.../index.ts:1:8)`. Root cause: bare-specifier import requires an import-map deno.json companion file. The canonical pattern (matches `supabase/functions/submit-lead/deno.json`):
  ```json
  {
    "imports": {
      "@supabase/functions-js": "jsr:@supabase/functions-js@^2"
    }
  }
  ```
  Plus the deploy call needs `import_map_path: 'deno.json'`. Without these, deploy rejects.
- **Suggested next action:** Codified as Executor Proposal #1 in `EXECUTION_REPORT.md §10`. Next opticup-strategic session should apply the proposal to `opticup-executor/SKILL.md` and add a "Edge Function patterns → companion deno.json" sub-section.
- **Disposition:** SKILL EDIT (next opticup-strategic session).

---

## F-EXEC-2 — EF line-count cap of ≤100 was tight against canonical EF pattern (INFO)

- **Severity:** INFO (no blocker; ergonomic friction)
- **Location:** `SPEC.md` §3 SC #5 "EF source ≤ 100 lines".
- **Description:** First draft was 109 lines because the security-model header comment was 22 lines. Trimmed header to 4 lines (cite SPEC + verify_jwt + Iron Rules + D6 oddity); final 95 lines. The trim was correct (SPEC carries the full security justification in §0/§4) but the back-and-forth cost ~5 minutes. The canonical EF pattern (CORS allowlist + UUID regex + jsonResponse helper + Deno.serve handler) is ~70 base lines + ~20 for variable-length business logic + 4-22 for header comment. A `≤100` cap reliably requires header trim if the executor writes the verbose security-model header first.
- **Suggested next action:** Codified as Executor Proposal #2 in `EXECUTION_REPORT.md §10`. Future SPECs that cap EF line-count should either (a) be more generous (≤120) OR (b) include a SPEC-level note "header comment ≤4 lines per executor canonical".
- **Disposition:** SKILL EDIT (next opticup-strategic session).

---

## F-EXEC-3 — Pre-staged Night Pipeline closeout files carried into SPEC seal commit (INFO)

- **Severity:** INFO (already noted by Foreman in dispatch)
- **Location:** Foreman SPEC seal commit `2709d09` accidentally bundled the pre-staged `MASTER_ROADMAP.md` + `OPEN_TASKS.md` + `_archive/architect-pending-entries/2026-05-16_d_m1_09_reframing.md` from the immediately-prior Night Pipeline session.
- **Description:** When this chat started, those 3 files were already `git add`-ed but uncommitted (Night Pipeline closeout work). Foreman's `git commit` (without `-a` but on already-staged files) committed them alongside `SPEC.md`. Already documented in Foreman's chat output.
- **Suggested next action:** Future Full-Auto Pipeline session-start protocol should include `git reset HEAD` if pre-staged files exist that don't belong to the SPEC. Or — at minimum — the pre-staged carry should be a documented decision in EXECUTION_REPORT, not a silent side-effect.
- **Disposition:** PROCESS NOTE (no SPEC needed; observation for future Full-Auto Pipeline runs).

---

*End of FINDINGS.md — M3_FUNNEL_PIXEL_BACKWIRE. 3 findings, all tracked.*
