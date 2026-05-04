# ACTIVATION PROMPT — QUICK_REGISTER_HOTFIX_2_DISPATCH_AND_TRACKING

> **Purpose:** Hotfix #2 on top of QUICK_REGISTER_QR_FLOW. Three fixes, one migration + 2 commits across 2 repos.

---

## Paste-ready block

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

For storefront work, also follow C:\Users\User\opticup-storefront\CLAUDE.md.

Load the opticup-executor skill.

SPEC: modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_HOTFIX_2_DISPATCH_AND_TRACKING/SPEC.md

Read SPEC.md fully. Three fixes bundled.

EXECUTION ORDER:

1. First Action protocol per CLAUDE.md §1 on opticup. Verify opticup-storefront on develop + clean.

2. Migration — opticup repo:
   a. Create supabase/migrations/20260504_add_acquired_via_to_crm_leads.sql containing:
      - ALTER TABLE crm_leads ADD COLUMN acquired_via text;
      - UPDATE crm_leads SET acquired_via = source WHERE acquired_via IS NULL;
   b. Apply via Supabase MCP `apply_migration` (NOT execute_sql).
   c. Verify post-apply: `SELECT COUNT(*) FROM crm_leads WHERE acquired_via IS NULL` returns 0 on both demo + prizma.
   d. Commit: `feat(crm): add acquired_via column to crm_leads with backfill`
   e. Push origin/develop.

3. EF modify — opticup repo (supabase/functions/quick-register/index.ts):
   a. Add early validation: `if (!eyeExamNeeded) return errorResponse("missing_eye_exam", 400);` BEFORE the phone normalization.
   b. On lead INSERT path: include `acquired_via: SOURCE_TAG` in the insertRow object.
   c. On lead UPDATE path (existing lead): add `acquired_via: SOURCE_TAG` to the patch.
   d. After successful RPC (the section that returns the success jsonResponse near line 327): BEFORE returning, dispatch messages.
      Pattern: copy the shape from supabase/functions/event-register/index.ts lines 91-95+313-337 (dispatchRegistrationMessages helper). Adapt for quick-register:
        - For status='registered' → templateBase = 'event_coupon_delivery'
        - For status='waiting_list' → templateBase = 'event_waiting_list_confirmation'
        - Variables: name, phone, email, lead_id, coupon_code, event_name, event_date, event_time
        - Fire-and-forget: use `Promise.allSettled` or `.catch()` so dispatch failures don't 500 the user
   e. Iron Rule 12 + integrity gate clean.
   f. Commit: `feat(crm): quick-register dispatches coupon-delivery + sets acquired_via + requires eye_exam`
   g. Push origin/develop.
   h. STOP. Ask Daniel to run CLI deploy: `npx supabase functions deploy quick-register --project-ref tsxrrxzmdxaenlvocyit`
   i. Wait for v4-active confirmation.

4. Storefront — opticup-storefront repo:
   a. Find the quick-register page (created in QUICK_REGISTER_QR_FLOW Rung 1, modified in Hotfix #1).
   b. eye_exam <select>: add `required` attribute. Ensure default `--בחר/י--` option has `value=""` (empty string, so HTML5 `required` rejects).
   c. Add visible `*` next to the eye_exam label like phone/email already have.
   d. Storefront safety-net scripts pass.
   e. Commit: `fix(quick-register): require eye_exam dropdown selection`
   f. Push origin/develop.
   g. STOP. Ask Daniel to PR-merge to main + verify Vercel deploy.

5. SPEC close — write EXECUTION_REPORT.md + FINDINGS.md (cumulative). Single retro commit. Push.

CONSTRAINTS:
- Test ONLY on demo. Zero prizma writes without explicit Daniel approval.
- Migration applies to BOTH tenants — that's expected, the column is global.
- Single commit per file scope. Push to develop only. NEVER merge to main.
- Mandatory clean repo at end of each step.
- DO NOT call Supabase MCP `deploy_edge_function` — CLI-only via Daniel.
- DO NOT modify event-register, lead-intake, or any other EF.
- DO NOT add NOT NULL constraint on acquired_via — must be backward-compatible.
- Stop on any deviation per CLAUDE.md §9.

Begin.
```

---

## After Claude Code finishes

1. Update HANDOFF: log this hotfix as part of QUICK_REGISTER_QR_FLOW Rung 1 closure.
2. Capture the "revive cancelled attendee" feature request in `POST_CUTOVER_TECH_DEBT.md`.
3. Daniel runs full smoke test per SPEC §11.
4. After verified-green: proceed to Rung 2 of original QUICK_REGISTER_QR_FLOW SPEC (lookup_url op for Make).
