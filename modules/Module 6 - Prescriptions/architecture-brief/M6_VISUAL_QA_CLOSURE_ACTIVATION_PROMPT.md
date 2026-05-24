You are running the Full-Auto Pipeline on the Optic Up project (Windows desktop, repo `opticalis/opticup`, branch `develop`).

Read the Brief in full first:
`modules/Module 6 - Prescriptions/architecture-brief/M6_VISUAL_QA_CLOSURE_BRIEF.md`

Your job: formally close the Visual-Fidelity Gate for the two M6 UI screens that were built last night but never got closure docs:
1. M6_PRESCRIPTION_EDITOR (Phase E) — `prescriptions.html` + `modules/prescriptions/*.js`
2. M6_M5_CARD_WIRING (Phase F) — M5 customer-card tab-3 (prescriptions) + tab-2 (vision)

SPEC files:
- `modules/Module 6 - Prescriptions/docs/specs/M6_PRESCRIPTION_EDITOR/SPEC.md`
- `modules/Module 6 - Prescriptions/docs/specs/M6_M5_CARD_WIRING/SPEC.md`

CRITICAL FIRST STEP — repo state. The Cowork VM that wrote the Brief reported ~2,649 uncommitted files (2,611 modified across all modules + 46 `.claude/skills/**`). This is almost certainly a FUSE-stale phantom (CLAUDE.md §3a Phase 2.5). Before touching any M6 code:
- Run the §3a two-phase survey: `git status --porcelain | grep '^??'` and eyeball the untracked list (some are real M6 architecture-brief drafts — preserve them).
- Check the actual desktop working tree. If the desktop ALSO shows the 2,600+ modified pile → real drift, STOP and report to Daniel. If the desktop is clean / near-clean → the pile was a Cowork phantom; proceed with selective `git add` by filename for M6 work only.
- NEVER run `git clean -fd` or `git reset --hard` without Daniel's explicit in-chat confirmation. NEVER stage `.claude/skills/**`. Use selective `git add` by filename only — no `git add -A` / `git add .`.

Then run the Pipeline end-to-end (Foreman → Executor → Reviewer → Localhost-Tester → Foreman closure). Start the local servers with `scripts/start-local.ps1` and verify on the demo tenant (slug=demo, PIN 12345). Use Chrome MCP for the Visual-Fidelity Gate.

For EACH of the two SPECs, produce the full Iron Rule 34 (strengthened) closure set: `EXECUTION_REPORT.md` + `FINDINGS.md` + `TEST_REPORT.md` + `FOREMAN_REVIEW.md`, where TEST_REPORT and FOREMAN_REVIEW each embed the region-by-region mockup-vs-live comparison TABLE (one row per region; columns: mockup-element → live-state → match/mismatch → severity → classification INTENTIONAL/DRIFT/SCHEMA-BLOCKED/FEATURE-BLOCKED). A bare screenshot is INVALID. First-load styled-check (CSS resolves, page styled not raw) must PASS. Any DRIFT mismatch must be FIXED in code before 🟢 — this closure may ship code changes; do not rationalize gaps (No Polish-by-Validation rule).

Mockups for region-compare:
- Editor: `modules/Module 6 - Prescriptions/architecture-brief/M6_PRESCRIPTION_EDITOR_MOCKUP.html` (locked 2026-05-23)
- M5 card: `modules/Module 5 - Customers/architecture-brief/M5_CUSTOMER_CARD_MOCKUP.html`

Constraints: demo tenant only, no Prizma writes, no merge to main (develop only), files ≤350 lines, `npm run verify:integrity` exit 0 + `clean-repo-gate.mjs` pass before any commit, Destructive Operations = None (any destructive need = STOP + escalate to Daniel).

When done, update `SESSION_CONTEXT.md` (Phase E+F → 🟢 CLOSED with VFG evidence, remove the "VFG pending" item), `MODULE_6_ROADMAP.md` (phase table → ✅ for A/B/C/E/F, D still deferred), and `OPEN_TASKS.md` (M6 module-complete except Phase D migration). End with a concise Hebrew summary for Daniel. If you hit a genuine blocker, write an escalation file under `modules/Module 6 - Prescriptions/escalations/` and emit one Hebrew line.
