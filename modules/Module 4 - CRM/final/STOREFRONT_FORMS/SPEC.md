# SPEC — STOREFRONT_FORMS

> **Location:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS/SPEC.md`
> **Authored by:** opticup-strategic (Cowork)
> **Authored on:** 2026-04-23
> **Module:** 4 — CRM
> **Phase:** Pre-Production (PRE_PRODUCTION_ROADMAP §1 + §2)
> **Author signature:** Cowork session wizardly-funny-johnson

---

## 1. Goal

Migrate the public event registration form and unsubscribe page from the ERP
(GitHub Pages at `app.opticalis.co.il`) to the storefront (`prizma-optic.co.il`
on Vercel), add HMAC token security to registration URLs, make the registration
form pre-filled so invitees only confirm instead of filling fields, and make
the unsubscribe EF return JSON so the storefront can render a branded page.

---

## 2. Background & Motivation

Daniel reviewed the CRM in production after the FINAL_FIXES merge (PR #19) and
flagged two issues:
1. Registration links point to `app.opticalis.co.il` — this is the internal
   ERP domain, not the customer-facing brand. Customers should see
   `prizma-optic.co.il` URLs.
2. The registration form asks customers to fill in fields — but we already
   know who they are (the link is sent TO them). The form should be pre-filled
   with their data; they just confirm.
3. The unsubscribe page is basic inline HTML from the Edge Function — should
   also be a branded storefront page.

Dependencies: FINAL_FIXES CLOSED (commit 2110788), `.nojekyll` merged (PR #20,
commit b88a5a4). `event-register` EF and `unsubscribe` EF both deployed and
verified.

**Lessons incorporated from FINAL_FIXES FOREMAN_REVIEW:**
- Lesson 1 (verify QA claims): this SPEC reads actual EF code to verify
  current behavior, not assumptions.
- Lesson 2 (don't assume empty=broken): no "missing field" tracks added
  without verifying who populates them.

---

## 3. Success Criteria (Measurable)

This SPEC has TWO parts that run in sequence:

### Part A — ERP-side (opticup repo, Claude Code executes)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean tree | `git status` → "nothing to commit" |
| 2 | `event-register` EF | Accepts HMAC token in GET + POST (in addition to existing UUID params for backwards compat) | `curl` with valid token → 200 + lead/event data |
| 3 | `event-register` EF GET response | Returns pre-filled data: lead name, phone, email, event name, date, time, location, booking_fee | Verify JSON response keys |
| 4 | `unsubscribe` EF | When called with `Accept: application/json` header, returns JSON `{success, message}` instead of HTML | `curl -H "Accept: application/json"` → JSON 200 |
| 5 | `unsubscribe` EF | Without Accept header (browser direct), still returns HTML (backwards compat) | `curl` without header → HTML |
| 6 | `send-message` EF | `unsubscribe_url` points to `https://prizma-optic.co.il/unsubscribe?token=...` | Read EF code |
| 7 | `crm-automation-engine.js` | `%registration_url%` generates `https://prizma-optic.co.il/event-register?token=...` | Read code |
| 8 | Token generation | HMAC-SHA256 with `SERVICE_ROLE_KEY`, same format as existing unsubscribe tokens | Read EF code |
| 9 | All EFs deployed | `event-register` + `unsubscribe` + `send-message` deployed to Supabase | EF list check |
| 10 | All CRM JS files | ≤350 lines | `wc -l` |
| 11 | Commits | 2 commits: EF changes + CRM URL update | `git log` |
| 12 | Demo baseline | Unchanged — 0 new log rows, no new leads | SQL check |

### Part B — Storefront-side (opticup-storefront repo, separate execution)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 13 | New page `/event-register/` | Astro page that calls `event-register` EF GET, renders pre-filled form | `npm run build` passes |
| 14 | Registration form | Pre-filled: name, phone, email, event name/date/time/location. Editable: arrival time, eye exam, notes. Submit button "אישור הגעה" | Visual check |
| 15 | Form POST | Calls `event-register` EF POST, shows success/error branded page | Manual test |
| 16 | New page `/unsubscribe/` | Astro page that calls `unsubscribe` EF with `Accept: application/json`, renders branded result | `npm run build` passes |
| 17 | Unsubscribe page | Branded with tenant logo, colors. Success + error states | Visual check |
| 18 | Build | `npm run build` → 0 errors | Exit code 0 |
| 19 | Mobile responsive | Both pages work on mobile viewport | Visual check |

---

## 4. Autonomy Envelope

### Part A — ERP-side

**What the executor CAN do without asking:**
- Read any file in the ERP repo
- Modify `supabase/functions/event-register/index.ts` — add HMAC token support
- Modify `supabase/functions/unsubscribe/index.ts` — add JSON response mode
- Modify `supabase/functions/send-message/index.ts` — update URL generation
- Modify `modules/crm/crm-automation-engine.js` — update `%registration_url%` generation
- Deploy EFs to Supabase
- Commit and push to `develop`
- Run read-only SQL (Level 1) for verification

**What REQUIRES stopping and reporting:**
- Any schema change (DDL)
- Any file outside the listed scope being modified
- Any test failure
- Any existing functionality breaking (backwards compat)

### Part B — Storefront-side

**What the executor CAN do without asking:**
- Create new Astro pages under `src/pages/`
- Create new components under `src/components/`
- Modify `astro.config.mjs` if route config needed
- Run `npm run build` and verify
- Commit and push to the storefront's `main` branch

**What REQUIRES stopping and reporting:**
- Any existing page being modified
- Any View or RPC change
- Any build failure

---

## 5. Stop-on-Deviation Triggers

- If `event-register` EF stops accepting the old UUID params → STOP (backwards compat broken)
- If `unsubscribe` EF stops returning HTML for direct browser visits → STOP
- If any existing CRM automation rule stops firing → STOP
- If storefront build time increases by >30 seconds → STOP (investigate)

---

## 6. Rollback Plan

**Part A:**
- `git reset --hard {START_COMMIT}` on develop
- Redeploy previous EF versions from git history
- No DB changes in this SPEC

**Part B:**
- `git revert` the page additions
- Redeploy storefront

---

## 7. Out of Scope (explicit)

- WhatsApp channel support
- Scheduled reminders
- Automation rules v2 (separate SPEC, §3 of ROADMAP)
- `quick_registration` status seeding (separate concern — verify it exists, don't create)
- Changes to Make scenarios
- Changes to `shared.js` or any non-CRM module files
- Dark theme
- Any DDL / schema changes

---

## 8. Expected Final State

### Part A — ERP-side

**Modified files:**
- `supabase/functions/event-register/index.ts` — HMAC token verification added to GET+POST handlers. Existing UUID params still accepted (backwards compat). GET returns full pre-fill data.
- `supabase/functions/unsubscribe/index.ts` — Content negotiation: `Accept: application/json` → JSON response; otherwise → HTML (existing behavior).
- `supabase/functions/send-message/index.ts` — `unsubscribe_url` domain changed from EF direct URL to `https://prizma-optic.co.il/unsubscribe?token=...`.
- `modules/crm/crm-automation-engine.js` — `registration_url` builder changed to `https://prizma-optic.co.il/event-register?token=...`.

**No new files, no deleted files, no DB changes.**

### Part B — Storefront-side

**New files:**
- `src/pages/event-register/index.astro` — public registration confirmation page
- `src/pages/unsubscribe/index.astro` — unsubscribe branded page
- (Components as needed — executor decides structure)

**No modified existing files expected.**

---

## 9. Commit Plan

### Part A (ERP repo):
- Commit 1: `feat(crm-ef): add HMAC token auth to event-register + JSON mode to unsubscribe` — EF files
- Commit 2: `feat(crm): update registration + unsubscribe URLs to storefront domain` — JS files
- Final: `git status` → clean tree

### Part B (Storefront repo):
- Commit 1: `feat(crm): add event registration + unsubscribe pages` — new Astro pages
- Final: `git status` → clean tree, `npm run build` → 0 errors

---

## 10. Dependencies / Preconditions

- FINAL_FIXES CLOSED (commit 2110788) ✅
- `.nojekyll` merged to main (PR #20) ✅
- `event-register` EF deployed and working ✅
- `unsubscribe` EF deployed and working ✅
- `send-message` EF deployed (v3) and working ✅
- Storefront deployed on Vercel at `prizma-optic.co.il` ✅

---

## 11. Lessons Already Incorporated

- FROM `FINAL_FIXES/FOREMAN_REVIEW.md` → Lesson 1 "Verify QA claims against source before prescribing fixes" → APPLIED: this SPEC reads actual EF code (index.ts files) to verify current behavior before prescribing changes.
- FROM `FINAL_FIXES/FOREMAN_REVIEW.md` → Lesson 2 "Don't assume empty DB columns are gaps" → APPLIED: no "missing field" tracks; all changes are to URL routing and response format, not data assumptions.
- FROM `P16_FORMS_AND_UNSUBSCRIBE/FOREMAN_REVIEW.md` → registration form was originally P16 scope → APPLIED: this SPEC references P16's architecture (EF GET/POST pattern) and extends it rather than rebuilding.
- Cross-Reference Check completed 2026-04-23 against MODULE_MAP: 0 collisions. New Astro pages don't conflict with existing storefront routes.

---

## 12. Execution Notes

**Part A should be executed first** by Claude Code on Daniel's Windows desktop.
After EFs are deployed and verified, Part B can be executed on the storefront
repo (same machine or different — `opticup-storefront` is a sibling repo).

**Domain configuration:** the storefront URLs (`prizma-optic.co.il/event-register`
and `prizma-optic.co.il/unsubscribe`) will only work after Part B deploys the
Astro pages. Between Part A deploy and Part B deploy, old ERP-hosted forms
(`app.opticalis.co.il`) continue to work via backwards-compatible UUID params.
No downtime window.

**Tenant URL strategy (SaaS):** this SPEC hardcodes `prizma-optic.co.il` as
the first tenant. Future SaaS-ification: the domain should come from a
`tenants.storefront_domain` column (doesn't exist yet — out of scope).
For now, hardcoded is acceptable because only Prizma is live.

**Clean repo mandate:** Daniel requires clean repo at end of every SPEC. Each
Part ends with `git status` → clean tree. No uncommitted changes, no stashes.
