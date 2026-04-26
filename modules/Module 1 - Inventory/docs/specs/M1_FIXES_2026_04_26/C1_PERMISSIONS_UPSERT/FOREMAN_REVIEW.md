# FOREMAN_REVIEW — C1_PERMISSIONS_UPSERT

> **Reviewer:** opticup-strategic (Cowork session)
> **Reviewed on:** 2026-04-26
> **Inputs reviewed:** `SPEC.md`, `EXECUTION_REPORT.md`, commit `784bbc8`, live source at `modules/permissions/employee-list.js:321`
> **Verdict:** 🟢 **CLOSED**

---

## 1. SPEC Quality Audit

| Aspect | Score | Notes |
|--------|-------|-------|
| Goal clarity | 10 | One sentence, anchored in DB schema and console error. |
| Success criteria measurability | 9 | Five concrete items, each verifiable. -1: §3.3 (manual QA toast on demo tenant) is gated on Daniel's action and the SPEC could have flagged that more clearly. |
| Autonomy envelope | 10 | Permitted/forbidden lists are explicit and tight. |
| Stop triggers | 10 | Four narrow triggers — no false-stop noise. |
| Out-of-scope discipline | 10 | Explicit list including the related Rule-7 violation (correctly deferred). |
| Commit plan | 6 | Single-commit plan included ROADMAP + SPEC + EXECUTION_REPORT alongside the code change. This is the chicken-and-egg the executor flagged. **Real defect.** Recent repo practice splits into `fix(...)` + `chore(spec): close ... with retrospective`. The SPEC should match. |

**Net:** strong SPEC except for the commit-plan defect. That defect is harvested into proposal #1 below.

## 2. Execution Quality Audit

| Aspect | Score | Notes |
|--------|-------|-------|
| Adherence to SPEC | 10 | Every measurable criterion met; the single declared deviation (chicken-and-egg hash) was the SPEC's fault, not the executor's. |
| Iron Rule compliance | 10 | Spot-check confirmed Rule 21 and Rule 18 satisfaction. Pre-existing Rule 7 deferral correctly logged, not silently absorbed. |
| Commit hygiene | 9 | Explicit-named adds, conventional message verbatim from SPEC §9, linkable. -1 for the self-reference workaround (again — SPEC's fault). |
| Documentation currency | 10 | ROADMAP rows updated atomically. |
| Autonomy | 10 | One question to Daniel was forced by the activation prompt's stop-trigger and dirty pre-existing tree — necessary, not a regression. |
| Findings discipline | 10 | No new findings. |

**Spot-check results:**
- `employee-list.js:321` — confirmed `onConflict: 'role_id,permission_id,tenant_id'` ✅
- ROADMAP Group C row C1 — confirmed status flipped to ✅ ✅
- Progress Tracking — confirmed `C1_PERMISSIONS_UPSERT` row marked closed ✅

## 3. Findings Processing

The executor reported no FINDINGS.md. The pre-existing Rule-7 violation
(`sb.from(AT.ROLE_PERMS).upsert(...)` direct call) is logged in the SPEC §10
but is NOT yet in `TECH_DEBT.md`. **Action:** when M2 (Platform Admin) gets
its next phase, sweep all `sb.from()` direct calls in `modules/permissions/`
and migrate to the `DB.*` wrapper. Logged here for the next strategic pass —
not a blocker for closing C1.

## 4. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal #1 — Two-commit pattern for SPECs that include retrospective files
**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §9 Commit Plan section.
**Change:** Default the Commit Plan to TWO commits:
```
1. fix(<scope>): <description> (<TICKET>)   — touches code + ROADMAP only
2. chore(spec): close <SPEC_SLUG> with retrospective   — adds SPEC.md, EXECUTION_REPORT.md, FOREMAN_REVIEW.md
```
The fix commit can carry a clean hash that the retrospective commit can reference, eliminating the self-reference puzzle. Match recent repo practice (`chore(spec): close M4_MERGE_PREP with retrospective`).
**Why this exists:** the executor flagged this in §3 deviation #1 and §5 "what would have helped." Today it cost a workaround using `git log --grep`. Tomorrow it wastes the same time again unless the template forces the cleaner pattern.

### Proposal #2 — Pre-existing-state precheck inside the activation prompt template
**Where:** `.claude/skills/opticup-strategic/references/` add a new file `ACTIVATION_PROMPT_TEMPLATE.md` (does not exist yet — author one).
**Change:** Mandatory section "Pre-existing-state expected" listing exactly: (a) which paths in `git status` are expected to be present from the in-flight SPEC, (b) which paths if present should be ignored (e.g., `outputs/`, `docs/guardian/*`), (c) whether the executor should stash/leave alone/abort. The template should treat "STOP and ask Daniel" as a fallback, not a default.
**Why this exists:** today's session forced one round-trip (Claude Code → Daniel → me → Daniel → Claude Code) just to resolve "what to do about the unrelated `outputs/` folder." The executor's own §5 "what would have helped" calls this out. The cost is ~5 minutes per dispatch in dirty trees, and dirty trees will become more common as Cowork+Claude-Code coexist.

## 5. Executor-Skill Improvement Proposals (opticup-executor)

The executor's own EXECUTION_REPORT §8 already proposed two strong items
(Proposal 1: scope-list mode for First Action step 4; Proposal 2 — see report).
I accept both and forward them as the official harvest from this SPEC. No
substitutions needed.

## 6. Master-Doc Update Checklist

- [x] `ROADMAP.md` — both rows updated by executor.
- [ ] `MASTER_ROADMAP.md` — not touched. C1 is a bug-fix inside an already-shipped module (Module 2 closed earlier in 2026), so it does not move any module phase. No update needed.
- [ ] `docs/GLOBAL_MAP.md` — not touched. No new public function added.
- [ ] `docs/GLOBAL_SCHEMA.sql` — not touched. No DB change.
- [ ] `docs/TROUBLESHOOTING.md` — **suggested follow-up:** add an entry "PostgREST 400 on multi-tenant upsert → check `onConflict` matches the full PK including `tenant_id`." Logged for next housekeeping pass; not a blocker.

## 7. Verdict

🟢 **CLOSED.** Ready for QA when Daniel runs the manual recovery action on the
demo tenant (per SPEC §3.3). No follow-up SPEC required.
