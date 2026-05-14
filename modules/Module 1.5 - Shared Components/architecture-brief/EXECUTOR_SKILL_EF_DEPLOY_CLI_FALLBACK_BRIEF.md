# EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK — Architecture Brief

**Type:** Skill update SPEC. Closes the OPEN-021 3-strikes pattern surfaced in FOREMAN_REVIEW §11 of `M3_UTM_TRIPLE_LAYER_PERSISTENCE` (2026-05-14). Prerequisite to Phase 1 P1.2 — both P1.2 and P1.3 will deploy Edge Functions and would hit the same `InternalServerErrorException` from Supabase MCP `deploy_edge_function`.

**Purpose:** Update `.claude/skills/opticup-executor/SKILL.md` so that Executor automatically falls back to Supabase CLI for `deploy_edge_function` on MCP 5xx — no escalation to Daniel needed for what is now a recurring platform issue. The CLI fallback has worked 100% of the time the MCP layer has failed.

**Why now (3-strikes rule per opticup-architect P28 — executor pre-flight beats author intent):**
- 2026-05-13 STATUS_CHANGE_TRIGGERS_FRAMEWORK — MCP returned `InternalServerErrorException`; Daniel CLI-deployed from Windows desktop. SPEC paused mid-run.
- 2026-05-14 M3_UTM_TRIPLE_LAYER_PERSISTENCE — same failure × 4 attempts. CLI fallback succeeded both EFs. SPEC paused mid-run a second time.
- Pattern is reliable enough that the SKILL should encode it as default behavior, not an escalation.

---

## 1. Scope

**In scope:**
1. Append a new section to `.claude/skills/opticup-executor/SKILL.md` titled "Edge Function deploy — MCP-first with automatic CLI fallback" placed where the SKILL discusses Supabase MCP usage (search for `deploy_edge_function` references).
2. The section must specify:
   - **First attempt:** Supabase MCP `deploy_edge_function`.
   - **Retry rule:** ONE retry on 5xx (`InternalServerErrorException`, generic `5xx`).
   - **Fallback trigger:** Second 5xx → AUTO-FALLBACK to Supabase CLI without asking Daniel.
   - **CLI command template:** `supabase functions deploy <name> --project-ref tsxrrxzmdxaenlvocyit [--no-verify-jwt]`. The `--no-verify-jwt` flag is added if the function is public (`verify_jwt=false`) — Executor reads `supabase/config.toml` to determine. Default is verify_jwt=true (no flag).
   - **Execution mode:** Executor invokes CLI via `mcp__workspace__bash` from the repo root. No Daniel involvement.
   - **Verification:** after CLI deploy, Executor MUST call MCP `get_edge_function` to verify the new version was published (MCP read endpoints work even when deploy endpoint is degraded — empirically verified).
   - **Logging:** every CLI fallback gets a 2-line `## EF deploy fallback` entry in `EXECUTION_REPORT.md` listing function + version + reason (MCP error code/message).
3. Update the existing "Tool fails unexpectedly | Retry once. If still fails → STOP and report" pattern in the SKILL to add an explicit carve-out for `deploy_edge_function`: "Exception: `deploy_edge_function` 5xx → use CLI fallback per §X, do NOT escalate."

**Out of scope:**
- Generalizing CLI fallback to other Supabase MCP tools (`apply_migration`, `execute_sql`, etc.). Only `deploy_edge_function` has shown a recurring 3-strike pattern; the others have not.
- Removing or weakening the existing STOP-on-deviation rules for other tool failures.
- Adding new CLI commands beyond `supabase functions deploy`.
- Auto-installing or auto-upgrading Supabase CLI on the executor's machine.

---

## 2. Method

1. **Foreman authors a tiny SPEC** at `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/SPEC.md`. Includes the exact prose to insert + line anchors in the SKILL.md to match.
2. **Executor edits** `.claude/skills/opticup-executor/SKILL.md` per the SPEC. Single targeted edit. Verifies post-edit line count + grep for the new section marker.
3. **Smoke** — no runtime smoke needed (skill-only edit, no code/DB/EF change). Integrity gate must exit 0.
4. **Reviewer verifies** the section reads correctly + the existing tool-failure pattern reference is consistent + grep confirms presence.
5. **Foreman closes** with a 4-line FOREMAN_REVIEW.

---

## 3. Output

Standard SPEC-folder outputs at `modules/Module 1.5 - Shared Components/docs/specs/EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/`:
1. `SPEC.md`
2. `EXECUTION_REPORT.md`
3. `FOREMAN_REVIEW.md`

Modified file: `.claude/skills/opticup-executor/SKILL.md` (single targeted insert + existing-pattern carve-out).

---

## 4. Destructive Operations

**None.** Skill SKILL.md edit is additive (new section + tiny carve-out on existing rule, no deletion).

---

## 5. Success Criteria

| # | Criterion | Method |
|---|---|---|
| 1 | New section exists in `opticup-executor/SKILL.md` with title containing "MCP-first with automatic CLI fallback" | grep |
| 2 | CLI command template present + correct `--project-ref tsxrrxzmdxaenlvocyit` | grep |
| 3 | Existing "Tool fails unexpectedly | Retry once. If still fails → STOP" pattern has explicit `deploy_edge_function` carve-out | grep |
| 4 | Reference to OPEN-021 3-strikes incidents (2026-05-13 + 2026-05-14) cited as rationale | grep |
| 5 | `get_edge_function` post-deploy verification step documented | grep |
| 6 | `EXECUTION_REPORT.md` template for the 2-line fallback log shown | grep |
| 7 | Smoke 7/7 PASS (control — nothing should regress) | `npm run smoke` |
| 8 | Integrity gate exit 0 | `npm run verify:integrity` |
| 9 | Repo clean at close (per CLAUDE.md §9) | `git status` |

---

## 6. Notes

- Estimated effort: 15-20 minutes.
- The mandatory backup step DOES apply (skill file is a governance file; touching governance always backs up). Path: `modules/Module 1.5 - Shared Components/backups/{YYYY-MM-DD}_EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/` with pre-edit `opticup-executor/SKILL.md`.
- After this lands, P1.2 + P1.3 Activation Prompts can be written WITHOUT the explicit "deploy via CLI if MCP fails" hand-holding — the SKILL will handle it autonomously.

End of Brief.
