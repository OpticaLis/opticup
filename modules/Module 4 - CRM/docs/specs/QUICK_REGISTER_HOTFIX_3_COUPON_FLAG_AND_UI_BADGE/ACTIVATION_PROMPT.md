# ACTIVATION PROMPT — QUICK_REGISTER_HOTFIX_3_COUPON_FLAG_AND_UI_BADGE

> **Purpose:** Hotfix #3. Two concerns, two commits in opticup repo. No storefront changes. No merges to main.

---

## Paste-ready block

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

Load the opticup-executor skill.

SPEC: modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_HOTFIX_3_COUPON_FLAG_AND_UI_BADGE/SPEC.md

Read SPEC.md fully. Two fixes:
- Bug A: quick-register EF must set coupon_sent=true + coupon_sent_at after successful dispatch (mirroring crm-event-day-coupon.js:131-132 semantics).
- Bug B: CRM event-day board + event detail attendees list must show "רישום מהיר" badge for attendees with registration_method='quick_register_qr'.

EXECUTION ORDER:

1. First Action protocol per CLAUDE.md §1 on opticup repo only.

2. Bug A fix — opticup repo (supabase/functions/quick-register/):
   a. Inspect dispatch.ts (or index.ts if dispatch is inline). Identify the dispatch helper that sends event_coupon_delivery email + SMS.
   b. After Promise.allSettled (or equivalent) resolves: if at least one channel succeeded AND template was 'event_coupon_delivery' (NOT 'event_waiting_list_confirmation') → UPDATE crm_event_attendees SET coupon_sent=true, coupon_sent_at=now() WHERE id=<attendee_id> AND tenant_id=<tenant_id>.
   c. Wrap the UPDATE in .catch() — never block response on UPDATE failure (log instead).
   d. If BOTH channels reject — skip the UPDATE (flag stays false).
   e. Iron Rule 12 + integrity gate clean.
   f. Commit: `fix(crm): mark coupon_sent=true after quick-register auto-dispatch`
   g. Push origin/develop.
   h. STOP. Ask Daniel to run CLI deploy: `npx supabase functions deploy quick-register --project-ref tsxrrxzmdxaenlvocyit`
   i. Wait for v5 confirmation.

3. Bug B fix — opticup repo (modules/crm/):
   a. modules/crm/crm-event-day.js: extend the .select(...) string at line ~71 to include `registration_method`. (Verify v_crm_event_attendees_full exposes this column — confirmed in SPEC §10. If view returns no value, STOP.)
   b. Where each attendee card is rendered in crm-event-day.js, insert badge HTML when `registration_method === 'quick_register_qr'`. Suggested badge:
      <span class="inline-block px-2 py-0.5 text-[0.7rem] font-semibold rounded-full bg-yellow-500 text-white" title="רישום מהיר דרך QR">רישום מהיר</span>
      Adjust styling to match the surrounding CRM aesthetic if better — Daniel will iterate visuals separately.
   c. modules/crm/crm-events-detail.js: same fetch field add + same badge render in the attendees list.
   d. (Optional, recommended per Rule 21) Extract a `renderRegBadge(method)` helper into modules/crm/crm-helpers.js so the badge HTML lives in one place. Both consumers call it.
   e. Iron Rule 12 + integrity gate clean.
   f. Commit: `feat(crm): show "רישום מהיר" badge on quick-register attendees in event-day + event detail`
   g. Push origin/develop.
   h. STOP. Ask Daniel to hard-refresh localhost CRM and run the smoke test per SPEC §11.

4. SPEC close — write EXECUTION_REPORT.md + FINDINGS.md (cumulative across hotfix #3 — even 0 findings, leave a stub note). Single retro commit. Push.

CONSTRAINTS:
- Test ONLY on demo. Zero prizma writes without explicit Daniel approval.
- Single commit per concern. Push to develop only. NEVER merge to main.
- Mandatory clean repo at end of each step.
- DO NOT call Supabase MCP `deploy_edge_function` — CLI-only via Daniel.
- DO NOT modify event-register, lead-intake, or any other EF.
- DO NOT touch the storefront repo (this hotfix is opticup-only).
- DO NOT add NOT NULL constraints, DDL, or view changes — none needed.
- Stop on any deviation per CLAUDE.md §9.

Begin.
```

---

## After Claude Code finishes

1. Update HANDOFF: log this hotfix as part of QUICK_REGISTER_QR_FLOW Rung 1 closure.
2. After Daniel verifies smoke test green: proceed to Rung 2 of original QUICK_REGISTER_QR_FLOW SPEC (lookup_url op for Make WhatsApp branch).
3. Hotfix #1 + Hotfix #2 + Hotfix #3 effectively close out Rung 1's full polish surface.
