# Activation: Demo Storefront — Forms 1:1 Mirror of Prizma (Phase 1)

טען `opticup-strategic` ב-Full-Auto Pipeline mode.

**Brief:** `modules/Module 3 - Storefront/architecture-brief/M3_DEMO_STOREFRONT_FORMS_BRIEF.md`

**Stub SPEC to replace (full body authored by Foreman in this run):** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md`

**Mission:** Provision a live demo storefront on a new Vercel project, mirroring Prizma's supersale forms 1:1, wired to demo's tenant_id in the SAME Supabase project. Enables Daniel's isolated manual test cycle. Phase 1 = forms only (lead-capture flow); content pages deferred. CRM Migration #3 remains paused until this closes AND Daniel passes his test cycle.

**Deliverables:**
- Full SPEC body replacing the stub at `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md`
- Audit of `opticup-storefront` repo pages — confirmed list of form-flow routes (escalate to Architect if ambiguous)
- New Vercel project created (escalation #A — Daniel provides Vercel access)
- Env vars configured for demo tenant
- ONE row UPDATE on demo's `tenants.ui_config.storefront_url`
- Smoke verification: short-link resolver tested via demo storefront, template URL output verified
- Prizma read-only regression check
- EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md
- DECISIONS_LOG entry
- OPEN_TASKS.md update (close this, list CRM Migration #3 resume next)

**Continuous-Run Mandate (with 2 planned escalations):**
- Run in ONE Claude Code chat.
- TWO planned escalation points:
  1. **Vercel access** — Pipeline cannot create a Vercel project without Daniel's credentials/CLI token. Write escalation, emit Hebrew line, wait for Daniel.
  2. **Storefront env-var naming** — Pipeline confirms the actual env var name used by `opticup-storefront` for tenant detection. If matches `PUBLIC_DEFAULT_TENANT_SLUG` (expected) → no escalation. If different → quick escalation to confirm rename or use actual.
- All other phases automatic.
- Status lines (one Hebrew line per phase) only.

**Destructive Operations Envelope:**
- ONE single-row UPDATE on `tenants` for demo only (`8d8cfa7e-ef58-49af-9702-a862d459cccb`)
- New Vercel project creation (external infra creation, not destructive)
- Test row INSERT in `short_links` for smoke verification (single row, demo-scoped, can be cleaned post-smoke)
- FORBIDDEN:
  - Any UPDATE on Prizma's tenants row
  - Any DELETE
  - Schema changes
  - Touching Prizma's Vercel project
  - Force-push
  - Merge to main (either repo)
  - Push to opticup-storefront (consumed read-only)
  - Sending any live outbound message
- Anything outside this envelope → STOP + escalate

**Pre-flight Phase (before any external action):**
1. Read `opticup-storefront` repo structure — confirm form-flow pages list
2. Identify the tenant-detection env var name (grep for `tenant_slug`, `TENANT_SLUG`, `PUBLIC_TENANT`, etc. in the storefront repo's astro/vercel config)
3. If env var naming is different from assumed `PUBLIC_DEFAULT_TENANT_SLUG` → escalation B
4. Confirm latest deploy branch (main or develop) and document choice in DIAGNOSIS.md

**Vercel Provisioning Phase:**
1. Write escalation A: "Need Vercel CLI token OR manual project creation by Daniel. Project name suggestion: `opticup-storefront-demo`. Branch: <from pre-flight>. Env vars to configure: <list>."
2. Daniel pastes back: either (a) CLI token + project naming approval, or (b) "I created the project manually, here's the URL".
3. Pipeline resumes accordingly.

**Wiring Phase (after Vercel project is live):**
1. Verify deploy URL is publicly reachable (HTTP 200 root)
2. Verify form-flow routes load
3. Apply the `tenants` UPDATE for demo:
   ```sql
   UPDATE tenants
   SET ui_config = jsonb_set(ui_config, '{storefront_url}', to_jsonb('<new-vercel-url>'::text))
   WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
   ```
4. Capture pre-value in DIAGNOSIS.md for rollback.

**Smoke Verification Phase:**
1. Insert test `short_links` row for demo (scope to demo, removable)
2. curl `<demo-vercel-url>/r/<test-code>` → expect 302 redirect to demo storefront's registration form
3. Invoke `send-message` Edge Function (with `dry-run` if supported, OR by triggering it server-side without actual external send) for demo tenant + "registration opened" template → capture produced URL → assert it contains demo's Vercel URL, NOT `opticalis`, NOT `prizma-optic.co.il`
4. Same for Prizma (read-only — same EF invocation pattern) → assert produced URL still contains `prizma-optic.co.il`
5. Save to TEST_REPORT.md

**Success Criteria (self-verifies):**
1. New Vercel project exists + deploys successfully
2. Project URL HTTP 200, form routes load
3. Env vars correctly set for demo tenant
4. Demo's `tenants.ui_config.storefront_url` updated to new URL (1 row UPDATE)
5. Prizma's `tenants` row untouched (verified by comparing updated_at before/after)
6. Short-link resolver redirects correctly on demo storefront
7. Template URL output uses demo's new URL on demo, Prizma's URL on Prizma
8. opticup-storefront repo: 0 commits, 0 pushes
9. `npm run verify:integrity` exit 0 on opticup repo
10. Working tree clean on opticup repo
11. Pushed to `origin/develop` (not main) on opticup repo
12. Stub SPEC replaced with full SPEC body
13. DECISIONS_LOG entry + OPEN_TASKS.md update

**Closure:** Pipeline writes FOREMAN_REVIEW.md + 2 lessons each. End with ONE Hebrew summary:

> ✅ Demo Storefront Forms CLOSED 🟢 — דמו מחובר ל-Vercel חדש. טפסי לידים פעילים על דומיין מבודד. URL חדש ב-tenants. Prizma ללא רגרסיה. הבא: סבב הטסטים הידני של דניאל, ואז המשך CRM Migration #3.

Begin with pre-flight + the storefront repo audit. Do NOT skip the planned escalations.
