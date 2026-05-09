# ACTIVATION PROMPT — QUICK_REGISTER_QR_FLOW

> **Purpose:** Daniel pastes the block below into a fresh Claude Code session loaded with the `opticup-executor` skill. Single SPEC, 3 Rungs.
> **Cross-repo work:** Rung 1 touches BOTH `opticup` (EF) and `opticup-storefront` (page). Rungs 2 + 3 touch `opticup` only. No merge to main.

---

## Paste-ready block

```
You are working in C:\Users\User\opticup. Follow CLAUDE.md.

For storefront work in this SPEC, also follow C:\Users\User\opticup-storefront\CLAUDE.md (rules 24–30 apply when working in that repo).

Load the opticup-executor skill.

SPEC location: modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_FLOW/SPEC.md

Read SPEC.md fully before starting. Then execute all 3 Rungs in order.

EXECUTION ORDER:

1. First Action protocol per CLAUDE.md §1 (verify branch=develop on opticup, pull latest, integrity gate clean).
   Then: cd to opticup-storefront in a separate shell — verify branch=develop, pull latest.

2. Rung 1 — opticup repo:
   a. Create supabase/functions/quick-register/index.ts implementing the default op (register flow, per SPEC §3 Rung 1 criteria 1.1–1.8). Reuse normalizePhone from lead-intake/index.ts verbatim per SPEC §10.
   b. Create supabase/functions/quick-register/deno.json (mirror lead-intake's deno.json shape).
   c. Verify Iron Rule 12 (file size ≤350) + integrity gate clean.
   d. Single commit: `feat(crm): quick-register EF + walk-in registration flow` (only EF files in this commit).
   e. Push origin/develop.
   f. STOP. Ask Daniel to run CLI deploy: `npx supabase functions deploy quick-register --project-ref tsxrrxzmdxaenlvocyit`
   g. Wait for Daniel's confirmation that v1 is live (verify via list_edge_functions).

3. Rung 1 — opticup-storefront repo (parallel to step 2 — start authoring while Daniel deploys EF):
   a. Create src/pages/quick-register/index.astro with Hebrew RTL form: full_name, phone, email (optional), eye_exam_needed, terms_accepted (with link to /supersale-takanon/), marketing_consent. Use mobile-first Tailwind, logical CSS properties (Iron Rule 27).
   b. Form submit calls the new EF via fetch.
   c. Implement 4 success/info screens per SPEC §3 criterion 1.11.
   d. Storefront safety-net scripts pass (Iron Rule 30).
   e. Single commit: `feat(storefront): /quick-register/ page for QR walk-in registration`.
   f. Push origin/develop.
   g. STOP. Ask Daniel to merge storefront PR + verify Vercel deploy is live (Daniel-only authority per CLAUDE.md §9).

4. Rung 1 verification — Daniel runs:
   a. Verifies storefront page loads at /quick-register/?event=<demo-event-number> on demo storefront.
   b. Submits test form with one of the allowed phones (0537889878 or 0503348349 — see feedback_test_phone_numbers.md).
   c. Confirms attendee row appears in demo CRM with registration_method='quick_register_qr'.
   d. Confirms coupon delivery email + SMS sent via the existing event_coupon_delivery_* templates.

5. Rung 2 — opticup repo:
   a. Modify supabase/functions/quick-register/index.ts to add the `lookup_url` op per SPEC §3 Rung 2 criteria 2.1–2.3.
   b. Iron Rule 12 + integrity gate.
   c. Single commit: `feat(crm): quick-register lookup_url op for Make WhatsApp branch`.
   d. Push origin/develop.
   e. STOP. Ask Daniel to run CLI deploy for v2.
   f. Wait for confirmation v2 is live.

6. Rung 3 — Make scenario update via Make MCP:
   a. Read scenario 8464122 blueprint (the branch already inspected in SPEC §2). Identify the `monday:ListItemsByColumnValues` module ID 36.
   b. Replace module 36 with an `http:MakeRequest` POST to `https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/quick-register` with body `{ "op": "lookup_url", "tenant_slug": "prizma", "event_number": <extracted-N> }`.
   c. Add a router after the HTTP module that branches on `data.ok` — true → continue to QR sender (module 40); false → green-api:SendMessage with Hebrew error text.
   d. Update QR module 40: caption `ברקוד רישום לאירוע {{<httpModuleId>.data.event_number}}` (or just N from the original SetVariable), QR URL `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={{encodeURL(<httpModuleId>.data.url)}}`.
   e. Commit a new doc to opticup repo: `roles/campaign-overseer/MAKE_SCENARIO_NOTES.md` (or append if exists) — record the exact module IDs changed + before/after blueprint excerpts. Single commit: `chore(make): wire quick-register EF into scenario 8464122 quick-register branch`.
   f. Push origin/develop.
   g. STOP. Ask Daniel for end-to-end smoke test per SPEC §12.

7. SPEC close — write modules/Module 4 - CRM/docs/specs/QUICK_REGISTER_QR_FLOW/EXECUTION_REPORT.md + FINDINGS.md (cumulative across all 3 Rungs). Single retro commit. Push.

CONSTRAINTS:
- Test ONLY on demo tenant (8d8cfa7e-ef58-49af-9702-a862d459cccb). Zero prizma writes without explicit Daniel approval.
- Single commit per Rung step. Push to develop. NEVER merge to main on either repo.
- Mandatory clean repo at end of each step.
- DO NOT call Supabase MCP `deploy_edge_function` — CLI-only via Daniel for this SPEC, per ATOMIC_CONFIRMATION_FLOW precedent.
- DO NOT modify the existing `whatsapp-catalog-flow` EF, the existing `register_lead_to_event` RPC, the existing `event_coupon_delivery_*` templates, OR any other Make scenario.
- If the VM-mount drift bug appears (1700+ "deleted" files, git ls-files returns 0), follow CLAUDE.md §3a Phase 2.
- Stop on any deviation per CLAUDE.md §9 Bounded Autonomy.

Begin with step 1.
```

---

## After Claude Code finishes (next Overseer touchpoint)

When all 3 Rungs close + smoke test passes:
1. Update `CAMPAIGN_OVERSEER_HANDOFF.md` §"Open follow-ups" — mark Item #4 (WhatsApp QR registration flow) closed.
2. Add `REC-009` to `DECISIONS_LOG.md` capturing the Q1+Q2+Q3 decisions Daniel made (always-register / existing-coupon-flow / event_number-param).
3. Trigger Foreman review (next opticup-strategic session) to write `FOREMAN_REVIEW.md`.
4. Reassess M4 closure — items remaining: Realtime investigation, MultiSale archive, Campaign metrics UI.
