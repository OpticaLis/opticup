# M4_NIGHT_RUN_2026_05_20 — Activation Prompt

Paste into a NEW Claude Code session. Worktree-isolated overnight run, 3 waves, no time cap.

**Pre-condition:** Brief must be on origin/develop or origin/main so the worktree can read it. If just authored from Cowork — Daniel commits + pushes the Brief first, OR the worktree pulls it from develop (instructions below).

---

```
Run M4_NIGHT_RUN_2026_05_20 — 3-wave overnight Pipeline. No time cap. Quality over speed.

Brief: modules/Module 4 - CRM/architecture-brief/M4_NIGHT_RUN_2026_05_20_BRIEF.md

CRITICAL FIRST STEP — WORKTREE ISOLATION:

```bash
cd C:\Users\User\opticup
git fetch origin
git worktree add C:\Users\User\opticup-night-0520 claude/m4-night-run-2026-05-20 origin/main
cd C:\Users\User\opticup-night-0520
git fetch origin develop
git merge origin/develop --ff-only
```

If the Brief isn't present after the merge, pull it:
```bash
git checkout origin/develop -- "modules/Module 4 - CRM/architecture-brief/M4_NIGHT_RUN_2026_05_20_BRIEF.md"
git checkout origin/develop -- "_archive/pre-night-audit-2026-05-20/"
```

ALL work in C:\Users\User\opticup-night-0520. Do NOT touch C:\Users\User\opticup\. Do NOT push to develop. Push to claude/m4-night-run-2026-05-20 only. At end: open PR to develop.

MANDATORY PRE-FLIGHT READING:
1. The Brief (full).
2. _archive/pre-night-audit-2026-05-20/AUDIT_REPORT.md — THE grounding doc. The 5 medium findings are constraints.
3. _archive/pre-night-audit-2026-05-20/MISSION_01.md (resend pre-flight) + MISSION_02.md (skill harvest list).
4. roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md — IR35 boundary.

MODEL: Opus for Foreman SPEC authoring + closure. Sonnet for Executor work.

THE 3 WAVES (run in order; skip-not-stop within a wave; waves are independent):

WAVE 1 — Core:
- W1.1 Resend Failed Messages button (log + queue). MUST: failure-class gating (NO resend on unsubstituted_placeholder class — 758 historical Prizma rows will re-fail), run_id=NULL on requeue (F-M04-1), crm_audit_log entry (F-M04-3), (tenant_id,status,created_at) index (F-M01-1), pagination, confirmation modal on bulk. Route THROUGH queue, not synchronous. Update M4 SESSION_CONTEXT + MODULE_MAP same commit (F-M08-2). UI verdict = 🟡 PENDING-CHROME (no browser tonight).
- W1.2 Skill Harvest — apply 16 FOREMAN_REVIEW proposals + 5 patterns A-E to opticup-architect SKILL + opticup-executor SKILL + docs/CONVENTIONS.md + DECISIONS_LOG. Consume + delete pending entry from _archive/architect-pending-entries/. Doc-only.
- W1.3 M4 DB-sweep — re-run audit Mission 3's 16 DB checks AFTER W1.1+W1.2. Flag any divergence from baseline.

WAVE 2 — Hardening:
- W2.1 dispatch-queue advisory-lock + retry. Postgres advisory lock (serialize concurrent cron ticks — eliminates the 4×-overlap rate-limit bug class). Auto-retry transient failures with backoff. Fix retry-count column increment (triage F-M08-1 column-name errors FIRST). EF redeploy.
- W2.2 mark 3 stale Prizma 'queued' broadcasts as 'cancelled' (F-M04-4). Snapshot first. Scoped UPDATE, explicit IDs.
- W2.3 crm_message_queue cleanup pg_cron job — archive/delete sent rows >90 days (F-M06-1). Recent rows untouched.
- W2.4 triage the two ~04:04 UTC DB errors (F-M08-1). Document. Fix only if trivial + DB-verifiable.

WAVE 3 — Bonus (only if context + time remain):
- W3.1 migrations git-drift baseline (TD-2). pg_dump current schema → migrations/baseline_2026_05_20.sql + drift-prevention policy doc. NO migration replay, NO schema change.

EXECUTION RULES:
- Cross-Module Safety Audit §4 BINDING. Touch ONLY surfaces in §4.1. NEVER touch §4.2.
- Per IR32: declared destructive ops = (a) W2.2 scoped UPDATE on 3 broadcast rows, (b) W1.2 delete consumed pending-entry file. NOTHING else destructive.
- Per IR34: W1.1 UI gets DB-verification tonight; mark 🟡 PENDING-CHROME. Do NOT claim 🟢 on UI without Daniel's Chrome verify.
- Per IR35: NO new placeholders / trigger types / action types.
- Per IR22: every .select()/.update() chains .eq('tenant_id', tid).
- Skip-not-stop within a wave. Hard-stop halts only that wave; later waves continue.
- Whitelist phones only for any test sends: 0537889878, 0503348349. Demo tenant only for tests.

STOP TRIGGERS (over Brief §8):
- Wrong working directory.
- Write outside worktree / push to develop.
- §4.4 violation.
- IR31 fail / smoke < 8/8.
- W2.1 advisory lock stalls dispatch (queue not draining) → revert W2.1, keep batchSize=15 band-aid, flag.
- W1.1 resend test generates a NEW unsubstituted_placeholder failure → gating broken → STOP W1.1.

CLOSURE:
1. Per-wave FOREMAN_REVIEW.md.
2. SESSION_REPORT.md at modules/Module 4 - CRM/docs/specs/M4_NIGHT_RUN_2026_05_20/ with per-wave 🟢/🟡/⏭️ verdicts.
3. git push origin claude/m4-night-run-2026-05-20.
4. Open PR to develop (NOT main). Title: feat(m4): night run — resend button + dispatch hardening + skill harvest + cleanups.
5. PR body: per-wave summary + which deliverables need Daniel's morning Chrome verify (W1.1 UI).
6. Surface a short English status line per user memory feedback_daniel_comms with per-wave status + PR URL + morning-agenda reminders (Chrome verify resend, dual-pixel, campaign team, Playwright setup).

If a wave hits an issue you can't resolve via skip-not-stop:
- Write escalation at modules/Module 4 - CRM/escalations/NIGHT_RUN_<TS>.md.
- Emit ONE English line.
- Halt that wave; continue with the next wave.

Daniel is asleep. No mid-run escalations expected to be answered until morning. Bank what you safely can; defer the rest with clear flags.
```

---

*End of Activation Prompt. Brief contains 3 waves / 8 deliverables / §4 binding safety audit / 5 audit-finding constraints.*
