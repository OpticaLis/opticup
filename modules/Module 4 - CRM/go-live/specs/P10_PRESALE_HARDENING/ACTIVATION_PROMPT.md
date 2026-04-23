# Claude Code — Execute P10 Pre-Sale Hardening SPEC

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P10 fixes the last 3 production blockers before Prizma cutover (P7):

1. **Duplicate leads** — manual creation doesn't normalize phones to E.164, so
   the same person can exist twice (`0537889878` vs `+972537889878`). This also
   causes the "messages not showing" issue — messages logged against one lead ID,
   user views the other.

2. **Unsubscribe** — engine ignores `unsubscribed_at`, and `%unsubscribe_url%`
   in emails is a dead link. Legal requirement.

3. **Message log visibility** — investigate WHY messages don't appear. Likely
   caused by duplicate leads, but verify.

**This SPEC is designed for an overnight unattended run.** Maximum autonomy.
Do NOT stop once past pre-flight.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P10_PRESALE_HARDENING/SPEC.md`

---

## Pre-Flight (ONLY place you may stop)

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC fully — especially §12 Technical Design
3. Read all files you'll modify — verify line counts
4. Start `localhost:3000`, verify CRM loads
5. **Investigate message log immediately:**
   ```sql
   SELECT count(*) FROM crm_message_log WHERE tenant_id = '8d8cfa7e-...';
   SELECT lead_id, channel, status, created_at FROM crm_message_log
   WHERE tenant_id = '8d8cfa7e-...' ORDER BY created_at DESC LIMIT 10;
   ```
   Also check for duplicate leads:
   ```sql
   SELECT phone, count(*), array_agg(id) FROM crm_leads
   WHERE tenant_id = '8d8cfa7e-...' AND is_deleted = false
   GROUP BY phone HAVING count(*) > 1;
   ```
6. **Grep `normalizePhone` in modules/crm/** — should be 0 hits (it's only in the EF)
7. **Check `%unsubscribe_url%` in templates:**
   ```sql
   SELECT slug FROM crm_message_templates
   WHERE tenant_id = '8d8cfa7e-...' AND body LIKE '%unsubscribe_url%';
   ```
8. **Approved-phone check:** ONLY `+972537889878` and `+972503348349`

**If pre-flight passes → GO. Do not stop again.**

---

## Execution Sequence

**Phase 1 — Phone normalization + duplicate prevention** (Commits 1-2)
  Add `normalizePhone` to helpers. Wire into createManualLead + updateLead.
  Duplicate check before insert. Normalize existing demo phones. Merge duplicates.
  QA: try creating lead with existing phone → error toast.

**Phase 2 — Unsubscribe engine filter** (Commit 3)
  Add `.is('unsubscribed_at', null)` to all 5 recipient resolvers in the engine.
  QA: set unsubscribed_at on a demo lead → dispatch → that lead excluded.

**Phase 3 — Unsubscribe Edge Function** (Commits 4-5)
  Create `supabase/functions/unsubscribe/index.ts` with HMAC-signed token.
  Modify `send-message/index.ts` to generate `%unsubscribe_url%`.
  QA: curl with valid token → 200 + HTML. Invalid → 400.

**Phase 4 — Message log visibility** (Commit 6)
  Root cause likely: duplicate leads. After Phase 1 merges duplicates, messages
  should be visible under the surviving lead. If not, investigate further.

**Phase 5 — Full flow test + cleanup** (Commit 7, no-op eligible)
  End-to-end: lead intake → no duplicate → dispatch → log visible → unsubscribe
  → next dispatch skips. Clean all test data.

**Phase 6 — Documentation** (Commits 8-9)

---

## Key Rules

- **ONLY approved phones:** `+972537889878`, `+972503348349`. STOP on violation.
- **Demo tenant only:** UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`.
- **One EF creation authorized:** `supabase/functions/unsubscribe/index.ts`
- **One EF modification authorized:** `send-message/index.ts` — ONLY for `%unsubscribe_url%`
- **No `lead-intake` EF changes.** Its normalization already works.
- **No DDL.** No ALTER TABLE.
- **Rule 12:** Split if >350. Pre-authorized.
- **DO NOT STOP once past pre-flight.**
- **Document every duplicate merge** in EXECUTION_REPORT with lead IDs.
- **Clean ALL test data** at end. Verify baseline.
