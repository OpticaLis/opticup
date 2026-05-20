# M4_NIGHT_RUN_2026_05_20 — SPEC

> **Author:** Architect → Foreman (Opus 4.7) · **Date:** 2026-05-20 evening
> **Mode:** Worktree-isolated overnight Full-Auto Pipeline. 3 waves, skip-not-stop within a wave, waves independent.
> **Brief:** `modules/Module 4 - CRM/architecture-brief/M4_NIGHT_RUN_2026_05_20_BRIEF.md`

## 1. Goal

Advance the marketing-funnel surface without a browser — every deliverable provable via DB queries, smoke tests, or doc diffs. UI verification deferred to Daniel's Chrome session in the morning.

## 2. Scope (per Brief §3)

### Wave 1 — Core
- W1.1 Resend Failed Messages button (log + queue) — failure-class gating, run_id=NULL on requeue (F-M04-1), `crm_audit_log` entry per resend (F-M04-3), `(tenant_id,status,created_at)` index on `crm_message_log` (F-M01-1), bulk confirmation modal, M4 SESSION_CONTEXT + MODULE_MAP updates same commit (F-M08-2). UI verdict 🟡 PENDING-CHROME.
- W1.2 Skill Harvest — apply 16 FOREMAN_REVIEW proposals + 5 patterns A-E to opticup-architect + opticup-executor SKILLs, `docs/CONVENTIONS.md`, and DECISIONS_LOG. Consume + delete the pending `_archive/architect-pending-entries/` entry. Doc-only.
- W1.3 M4 DB-sweep — re-run audit Mission 3's 16 DB checks after W1.1+W1.2 land.

### Wave 2 — Hardening
- W2.1 dispatch-queue advisory-lock + retry — Postgres advisory lock to serialize concurrent cron ticks (eliminates the 4×-overlap rate-limit bug class). Auto-retry transient failures with backoff. Fix the retry-count column increment (triage F-M08-1 column-name errors first).
- W2.2 mark 3 stale Prizma 'queued' broadcasts as 'cancelled' (F-M04-4). Snapshot first. Scoped UPDATE, explicit IDs.
- W2.3 crm_message_queue cleanup pg_cron job — archive/delete sent rows >90 days (F-M06-1).
- W2.4 triage the two ~04:04 UTC DB errors (F-M08-1). Document. Fix only if trivial + DB-verifiable.

### Wave 3 — Bonus
- W3.1 migrations git-drift baseline (TD-2). `pg_dump` current schema → `migrations/baseline_2026_05_20.sql` + drift-prevention policy doc. NO migration replay.

## 3. Destructive Operations

This SPEC declares the following destructive operations and NOTHING else:

1. **W1.2 — DELETE** the consumed `_archive/architect-pending-entries/STOREFRONT_PUBLIC_DATA_LAYER_2026_05_15.md` (single file, after the DECISIONS_LOG entry is appended). NOTE during execution: pending-entries directory was empty (only `.gitkeep`); no file deletion actually happened.
2. **W2.2 — UPDATE** 3 stale broadcasts on Prizma's `crm_broadcasts` from `status='queued'` → `status='cancelled'`, scoped by explicit broadcast IDs + tenant_id.

All other destructive operations (additional file deletes, mass renames, `git rebase`, `git reset --hard`, `DROP TABLE/COLUMN/POLICY`, mass `DELETE FROM`, CLAUDE.md/SKILL.md non-append edits, any `main`-branch modification) are FORBIDDEN. If the Executor encounters a need mid-run → STOP, write an escalation file, halt that wave.

Demo-only synthetic test rows the Executor itself creates during DB-verify steps may be cleaned up after verification (Iron Rule 32 §3 "cleanup of rows we created ourselves" — not pre-existing data) and do not require additional declaration here.

## 4. Cross-Module Safety Audit

Per Brief §4 — binding. Touches ONLY:
- `modules/crm/crm-messaging-log.js`, `modules/crm/crm-messaging-resend.js` (new), `modules/crm/crm-queue-live.js`
- 1 migration: `crm_message_log` composite index
- `crm_message_queue` (INSERT for resend), `crm_audit_log` (INSERT for resend)
- `crm_broadcasts` (W2.2 scoped UPDATE)
- 1 new pg_cron job + cleanup function for W2.3
- `supabase/functions/dispatch-queue/index.ts` (W2.1)
- M4 SESSION_CONTEXT + MODULE_MAP, opticup-architect/executor SKILLs, `docs/CONVENTIONS.md`, DECISIONS_LOG (W1.2)
- `migrations/baseline_2026_05_20.sql` (W3.1 if reached)

NOT touched: `send-message`, `automation-engine`, `fb-capi-dispatch`, `pixel-fired`, `lead-intake`, `crm_automation_rules`, `crm_message_templates`, `crm_status_change_events`, `crm_capi_dispatch_queue`, all M4 DB triggers, all non-M4 modules, the storefront repo.

## 5. Success Criteria

See Brief §7 (1-13) — full list. UI claims marked 🟡 PENDING-CHROME until Daniel's morning verification.

## 6. Rollback Plan

Worktree-based. `git worktree remove --force` + `git branch -D` + remote branch delete. develop + main untouched until Daniel merges PR. Per-wave commits are individually revertable.

---

*This SPEC is authored by the Foreman role at the start of the night-run; the Executor records progress in EXECUTION_REPORT + FINDINGS, and the Foreman writes FOREMAN_REVIEW per wave at closure.*
