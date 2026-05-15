# Demo Storefront — Forms 1:1 Mirror of Prizma Supersale

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 3 — Storefront
**Companion repo:** `opticalis/opticup-storefront` (sibling repo, not this one)
**Companion SPEC stub:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md` (replace with full SPEC from this Brief)

---

## 1. Purpose

After 2026-05-03 cutover, demo tenant was disconnected from Prizma's storefront (it was previously borrowing Prizma's domain for shared QA). Demo now has `tenants.ui_config.storefront_url = https://demo.opticalis.co.il` — a non-functional DNS placeholder. Daniel cannot run his pre-LIVE manual test cycle because event-registration links and form submissions don't resolve to anything.

Daniel approved 2026-05-11: **provision a real live demo storefront, 1:1 mirror of Prizma's supersale forms**, on a separate Vercel project, hooked to demo's tenant_id in the same Supabase project. Same code as Prizma. Same forms. Same UX. Same flow. Different tenant_id → different data lane → safe to test on without touching production.

**Phase 1 (THIS Brief): forms only.** Just the lead-capture forms + their thank-you pages + their short-link resolution. Not the blog, not the content pages, not the storefront's product catalog, not the landing pages. Just what Daniel needs for his test cycle: a customer clicks an event-registration link → arrives at a form → fills it → submits → lead appears in demo's CRM.

Phase 2+ (future Briefs) will mirror more of the storefront if needed.

## 2. Scope — In (Phase 1)

### Pages to mirror from Prizma storefront

These are the storefront routes that participate in the lead-capture flow:

1. `/r/[code]` — short link resolver (resolves an event code → redirects to the registration form for that event)
2. `/supersale/` — supersale campaign landing + form
3. `/supersale/register/` — supersale lead registration form (the primary one Daniel needs)
4. `/quick-register/` — WhatsApp walk-in quick registration form
5. `/thanks/` (or whatever the post-submit thank-you page is called — Executor identifies via storefront repo audit)
6. Any error page on the form-submission path

Final list confirmed by Executor reading `opticup-storefront/src/pages/` during pre-flight.

### Infrastructure deliverables

1. **New Vercel project** under Daniel's existing Vercel account. Name suggestion: `opticup-storefront-demo` (or whatever convention Daniel prefers — Executor escalates if naming question surfaces).
2. **Deploy URL:** Vercel-default subdomain `opticup-storefront-demo.vercel.app` (free, no custom DNS needed for Phase 1).
3. **Same code as Prizma's production storefront** — pulled from the same `opticalis/opticup-storefront` repo, `main` branch (or `develop` if Phase 1 prefers stage parity).
4. **Different environment variables:**
   - `PUBLIC_DEFAULT_TENANT_SLUG=demo` (instead of `prizma`)
   - `PUBLIC_SUPABASE_URL` = same Supabase project (shared instance, tenant isolation via RLS — Iron Rule 15)
   - `PUBLIC_SUPABASE_ANON_KEY` = same anon key (RLS handles isolation)
   - `SUPABASE_SERVICE_ROLE_KEY` = same service role key (image proxy still works)
   - Any other env var that's tenant-specific stays the same Supabase project, only the tenant slug changes
5. **Wiring in `tenants` table:** ONE single-row UPDATE on demo's `tenants.ui_config.storefront_url` → `https://opticup-storefront-demo.vercel.app`.

### Edge Functions (no changes needed)

The existing `lead-intake`, `event-register`, `quick-register`, `resolve-link`, `send-message` Edge Functions are tenant-scoped via the request — they take tenant_id from the request payload (which the storefront sets from `PUBLIC_DEFAULT_TENANT_SLUG`). They work for demo automatically.

### Storefront repo configuration (multi-tenant aware)

Verify that `opticup-storefront` already supports `PUBLIC_DEFAULT_TENANT_SLUG` as an environment variable. If yes — done. If no — minor code change in the storefront repo to read tenant from env, with backward-compat defaulting to `prizma`. (Auto-memory says it's already supported — `feedback_storefront_branch_model.md` and related entries indicate the storefront was built tenant-aware.)

## 3. Scope — Out

- **DNS / custom domain for demo.** Phase 1 uses the Vercel-default `.vercel.app` subdomain. Custom domain is a separate decision (future Brief).
- **Mirror of Prizma's non-form pages** — blog, content pages, glossary, brand pages, optometry page, product catalog, brand-showcase. Phase 2+ if needed.
- **Different content for demo.** Demo's CMS content stays as it is in Supabase (tenant_id = demo). The deployed storefront just reads from demo's CMS rows. If demo's CMS is empty or stale → that's a separate concern; Phase 1 just deploys the code.
- **Whitelisted SMS/Email config for demo testing.** Demo already has `tenants.test_mode_sms_allowlist` infrastructure from C-001. Daniel configures the whitelist values in a separate task; not in this SPEC.
- **Updating production Prizma storefront in any way.** Prizma's Vercel project stays untouched. Prizma's `tenants.ui_config.storefront_url` stays untouched.
- **Changes to the CRM or other ERP pages.** This is a storefront-side deploy, not an ERP migration.
- **CRM Migration #3.** Remains paused — to be resumed after this Brief closes + Daniel's manual test cycle passes.

## 4. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Mirror is 1:1 — same code, different tenant_id, different Vercel project | Daniel 2026-05-11 |
| 2 | Phase 1 covers forms only (lead-capture flow); content pages deferred | Daniel 2026-05-11 |
| 3 | Same Vercel account as Prizma, new project alongside | Daniel 2026-05-11 |
| 4 | Vercel-default `.vercel.app` URL, no custom DNS in Phase 1 | Architect 2026-05-11 |
| 5 | Same Supabase project, same anon/service-role keys, tenant isolation via RLS + env var | Architect 2026-05-11 (Iron Rule 15) |
| 6 | ONE `tenants` row UPDATE for demo (storefront_url) at the end of the SPEC | Architect 2026-05-11 |
| 7 | Prizma's `tenants` row stays untouched | Daniel 2026-05-11 (hands-off Prizma) |
| 8 | Prizma's Vercel project stays untouched | Architect 2026-05-11 |
| 9 | Demo's CMS content (in Supabase) is out-of-scope; deploy reads whatever's there | Architect 2026-05-11 |
| 10 | Continuous-Run Mandate with planned escalation when Vercel-account access is needed | Architect 2026-05-11 |

## 5. Expected Escalation Points (planned)

Two escalations expected in this Pipeline:

**Escalation A — Vercel account access:** the Pipeline cannot create a Vercel project without Daniel's credentials/token. When the Executor reaches the Vercel-provisioning step, it writes an escalation: "I need either (a) a Vercel CLI token scoped to your account, or (b) instructions to create the project manually after which I wire the env vars." Daniel chooses + provides. Pipeline resumes.

**Escalation B — Storefront env config naming:** if the storefront repo's tenant detection uses a different env var name than `PUBLIC_DEFAULT_TENANT_SLUG` (the Executor checks during pre-flight), it surfaces the actual name and gets confirmation. Quick escalation.

## 6. Quality Bar — Acceptance Criteria

1. New Vercel project exists, named `opticup-storefront-demo` (or Daniel-approved alternative).
2. Project deploys successfully from `opticalis/opticup-storefront` (latest develop or main per Daniel's decision in pre-flight).
3. Project env vars include `PUBLIC_DEFAULT_TENANT_SLUG=demo` (or repo's actual var name).
4. Project URL is reachable from public internet — HTTP 200 on root, no build errors.
5. `/supersale/` page loads at `https://opticup-storefront-demo.vercel.app/supersale/` (or whatever Daniel-approved subdomain) and shows the supersale UI.
6. `/supersale/register/` form loads, displays input fields.
7. `/quick-register/` form loads.
8. `/r/[code]` short-link resolver works — Executor manually creates a test short_link row in demo's `short_links` table → curl the demo storefront's `/r/[code]` → expect HTTP 302 redirect to the resolved event registration form on the demo storefront (NOT Prizma).
9. ONE row UPDATE on demo's `tenants.ui_config.storefront_url` → the new Vercel URL.
10. Smoke verification: trigger `send-message` Edge Function with template for "registration opened" event on demo tenant → captured URL output points to `opticup-storefront-demo.vercel.app/...` (or chosen URL), NOT to `demo.opticalis.co.il`, NOT to `prizma-optic.co.il`.
11. Read-only regression check on Prizma: same `send-message` call for Prizma tenant produces URL still on `prizma-optic.co.il`. NO Prizma data touched.
12. `npm run verify:integrity` exit 0 on opticup repo.
13. Working tree clean on opticup repo. Pushed to `origin/develop`.
14. opticup-storefront repo: no commits, no pushes — only consumed as read (the deploy uses existing main branch).
15. DECISIONS_LOG entry written.
16. `OPEN_TASKS.md` updated: this task closed, next task = resume CRM Migration #3 + Daniel's manual test cycle.

## 7. Destructive Operations

Declared:
- **ONE single-row UPDATE on `tenants`:** `UPDATE tenants SET ui_config = jsonb_set(ui_config, '{storefront_url}', to_jsonb('<new-url>'::text)) WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';` (demo tenant only)
- **New Vercel project creation** (this is creative, not destructive — but flagged because it touches external infrastructure)
- **Insertion of test row in `short_links` table** during smoke verification (single row, scoped to demo, removable after)

**Forbidden:**
- Any UPDATE on Prizma's `tenants` row
- Any DELETE on any table
- Any schema changes
- Touching Prizma's Vercel project
- Force-push
- Merge to main (in either repo)
- Sending any live outbound message

## 8. Continuous-Run Mandate (with planned escalations)

Run end-to-end in ONE Claude Code chat. Two planned escalation points (Vercel access, env-var name). Otherwise automatic.

Unplanned stop only on:
- Iron Rule 31/32 violation
- Deploy failure
- Smoke check fails (URL not reachable, or short-link resolver doesn't redirect correctly)
- Any unexpected modification request to Prizma data

## 9. Anti-Patterns

- DO NOT modify Prizma's Vercel project
- DO NOT modify Prizma's `tenants` row
- DO NOT delete demo's existing `tenants.ui_config.storefront_url` value before the new URL is verified working (use UPDATE not DELETE)
- DO NOT push to opticup-storefront's main or develop — only consume the existing code for the deploy
- DO NOT change Edge Function code — tenant isolation is already handled there
- DO NOT add new env vars to the storefront repo's `.env.example` unless absolutely necessary (and if so, escalate)
- DO NOT send any test message during the SPEC (verify URL output via inspection, not via actual sends)
- DO NOT merge to main

## 10. References

- Predecessor SPEC: `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/`
- Stub SPEC to replace: `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md`
- Companion repo: `opticalis/opticup-storefront` (read-only consumption for this SPEC)
- Demo tenant UUID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`
- Auto-memory `feedback_storefront_branch_model.md` — storefront branch policy
- Auto-memory `project_short_links_live.md` — short-link architecture
- Auto-memory `feedback_test_phone_numbers.md` — only `0537889878` + `0503348349` for any test that sends (this SPEC sends nothing, but if it must — those only)
- Auto-memory `project_messaging_architecture_v2.md` — Make-as-pipe, send-message EF

---

*End of brief.*
