# ACTIVATION PROMPT — B8 Day-of-Week Timezone Hot-Fix

> **For:** a fresh Claude Code session on Daniel's Windows desktop
> **Skills required:** opticup-executor
> **Estimated session length:** 15-20 minutes
> **Repo:** opticup (NOT storefront)

---

## Paste this into a fresh Claude Code session

```
You are executing a focused hot-fix SPEC for the off-by-one timezone bug in hebrewDayOfWeek that was caught during browser QA on production. The bug corrupts both CRM admin UI labels AND customer-facing message bodies (SMS+email %event_day_of_week%).

Load skill: opticup-executor

Read these files IN ORDER:
1. /mnt/.auto-memory/MEMORY.md — project context
2. CLAUDE.md (repo root) — Iron Rules + First Action protocol (RUN sync gate including Phase 1 untracked-survey)
3. modules/Module 4 - CRM/docs/specs/B8_DAY_OF_WEEK_TIMEZONE_FIX/SPEC.md — the SPEC (especially §10 has recommended fix code)

Execute under Bounded Autonomy. Hard reminders:

- 2 commits: fix + close. Per SPEC §9.
- Touch ONLY 2 files: modules/crm/crm-helpers.js + supabase/functions/send-message/event-variables.ts
- Apply the fix from SPEC §10 (recommended) OR equivalent that passes all 5 spot-checks in §3 #4-#8.
- BEFORE committing: run inline node test:
   node -e "var _HE_DOW = ['יום ראשון','יום שני','יום שלישי','יום רביעי','יום חמישי','יום שישי','שבת']; function hebrewDayOfWeek(ymd){if(!ymd||!/^\d{4}-\d{2}-\d{2}$/.test(ymd))return ''; var p=ymd.split('-'); var d=new Date(Date.UTC(parseInt(p[0],10),parseInt(p[1],10)-1,parseInt(p[2],10))); return _HE_DOW[d.getUTCDay()]||'';} console.log('2026-05-15:', hebrewDayOfWeek('2026-05-15')); console.log('2026-05-02:', hebrewDayOfWeek('2026-05-02')); console.log('2026-05-17:', hebrewDayOfWeek('2026-05-17')); console.log('2026-01-01:', hebrewDayOfWeek('2026-01-01'));"
- Expected output: 2026-05-15: יום שישי / 2026-05-02: שבת / 2026-05-17: יום ראשון / 2026-01-01: יום חמישי
- After commit: deploy send-message EF via Supabase MCP. Confirm version increments from v15 → v16.
- Maximum autonomy: this is a 1-line fix per file with deterministic verification. If 5 spot-checks pass and EF deploys clean, just commit and close. Don't stop to ask.
- Push to develop ONLY (never main). Daniel handles the PR + merge.
- At session end: clean repo. Push. Confirm CI green. Write EXECUTION_REPORT.md + (likely empty) FINDINGS.md. Update HANDOFF §15.

Confirm readiness in Hebrew, then begin.
```

---

## What Daniel does after this session

1. Confirm 2 commits on develop + EF deployed (v16)
2. Open PR develop → main on opticup repo (same flow as PR #36 earlier today)
3. Merge after review
4. Optional: visual confirm in CRM admin event-create form picking 2026-05-15 → "יום שישי"
