# FINDINGS — M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT

> **Written by:** opticup-executor
> **Written on:** 2026-05-11
> **3 findings logged** — none block SPEC closure; all routed for Foreman disposition.

---

## M3-FINDINGS-01 — Demo storefront's canonical URL is hardcoded to www.prizma-optic.co.il in build output

**Severity:** LOW
**Location:** `opticup-storefront/astro.config.mjs:14` — `site: 'https://www.prizma-optic.co.il'`
**Discovered:** SPEC author-time pre-flight (DIAGNOSIS §2.4); not a runtime blocker for Phase 1 forms
**Reproduction:**
```bash
curl -sS https://opticup-storefront-demo.vercel.app/ | grep -o '<link rel="canonical"[^>]*>'
# Expected (current): contains www.prizma-optic.co.il (the build-time-baked value)
```

**Impact in Phase 1:** none on form submission (forms POST to Edge Functions, not to the canonical URL). Affects SEO + sitemap generation (`sitemap-dynamic.xml.ts` uses the canonical site URL) and OpenGraph `og:url` tags. For Daniel's manual test cycle on demo this means: any rendered "share this page" or OG-preview would point at Prizma's domain instead of demo's. Not customer-facing on demo (demo has no customers), but cosmetically wrong.

**Suggested action:** **NEW SPEC** (Phase 2) — `M3_DEMO_STOREFRONT_PER_TENANT_CANONICAL_URL` — refactor `astro.config.mjs` to read `site` from `import.meta.env.PUBLIC_SITE_URL` (with a per-tenant Vercel build arg) or via Vercel build env vars (e.g., `PUBLIC_SITE_URL=https://opticup-storefront-demo.vercel.app` on demo, `https://www.prizma-optic.co.il` on Prizma). Touches storefront repo — requires its own SPEC with cross-repo coordination.

**Why not fixed in this SPEC:** Brief §3 explicit out-of-scope ("Mirror of Prizma's non-form pages... Phase 2+"); fix touches `astro.config.mjs` which is a write to the storefront repo (forbidden by this SPEC §7).

---

## M3-FINDINGS-02 — `tenants` table has no `updated_at` auto-update trigger

**Severity:** INFO
**Location:** Postgres schema for `tenants` table — no `BEFORE UPDATE` trigger setting `NEW.updated_at = NOW()`
**Discovered:** runtime, during DB UPDATE verification (TEST_REPORT §3) — the UPDATE changed `ui_config.storefront_url` correctly but `updated_at` remained at the pre-UPDATE value `2026-03-29 08:33:43.906+00`

**Reproduction:**
```sql
UPDATE tenants SET ui_config = jsonb_set(ui_config, '{some_key}', to_jsonb('test'::text))
 WHERE id = '<any-tenant-id>'
 RETURNING ui_config, updated_at;
-- updated_at does NOT advance unless the UPDATE explicitly sets it
```

**Impact:** SPECs that compare `tenants.updated_at` to verify a mutation succeeded will get false negatives (column doesn't bump). The pre-baseline value `2026-03-29 08:33:43.906+00` for demo was set by `M4_HARDCODED_PRIZMA_REMOVAL` which presumably either explicitly set `updated_at = NOW()` in its SET clause OR there was a trigger at that time which has since been removed.

**Suggested action:** **TECH_DEBT entry** — `TD-TENANTS-UPDATED-AT-TRIGGER-MISSING`. Tracking-only (LOW priority); two viable resolutions: (a) add a standard `BEFORE UPDATE ... SET updated_at = NOW()` trigger to `tenants` (matches likely pattern on most other multi-tenant tables); (b) document the absence and require SPECs that want to verify mutation to compare the substantive column, not metadata. The SPEC template's §3 Success Criteria authoring rule should mention this anti-pattern.

**Why not fixed in this SPEC:** out-of-scope (Brief §3); schema change requires Level 3 SQL autonomy (never autonomous) and a dedicated migration.

---

## M3-FINDINGS-03 — Vercel MCP surface is missing project-create + env-var-read/write primitives

**Severity:** INFO (skill/tooling-debt insight)
**Location:** Claude.ai Vercel MCP integration (`mcp__claude_ai_Vercel__*` tools)
**Discovered:** runtime, when Daniel proposed "use the MCP, no token needed" — escalation follow-up commit `022df8e`

**Reproduction:** load the full Vercel MCP tool surface and check for: `create_project`, `add_env_var` / `update_env_var`, `read_env_var` with decryption, repo-linking primitives. None present.

**Concrete observations:**
- `mcp__claude_ai_Vercel__list_projects` / `get_project` work (read-only, no env vars in response)
- `mcp__claude_ai_Vercel__deploy_to_vercel` operates on the local `.vercel/project.json` — for our setup that file in `opticup-storefront/` points at **Prizma's production project**, so the MCP-deploy path is unsafe for any non-Prizma work
- Env-var reads via Vercel REST API `?decrypt=true` returned encrypted envelopes (not plaintext), suggesting the `vcp_` token type doesn't have decrypt scope — also: `SUPABASE_SERVICE_ROLE_KEY` was marked `sensitive` (write-only) on Prizma's project, so even with decrypt scope it wouldn't be readable
- The actual provisioning path used: direct REST API calls via `curl` with a user-supplied `vcp_` token (Option A original)

**Impact:** any future SPEC that needs to create or modify Vercel projects via Claude Code will need a token-based path; the MCP alone is insufficient. The `deploy_to_vercel` tool is specifically risky in cross-tenant scenarios because it acts on whatever `.vercel/project.json` is in the working directory.

**Suggested action:** **DISMISS for project**, **PROMOTE TO SKILL UPDATE for `opticup-executor`** — add a note to the executor SKILL.md or to a dedicated `INTEGRATION_NOTES.md` warning that the Vercel MCP is read-only-plus-deploy-current-project, NOT a general project-management surface; SPECs that touch Vercel infrastructure should plan for a token-based path from the start.

**Why this is a finding and not a SPEC failure:** the SPEC's original Option A (CLI token) accommodated this; the deviation (Daniel's mid-pipeline "use the MCP" pivot) was correctly recognized by the Executor as a non-viable shortcut and escalated cleanly. The follow-up escalation file (`2026-05-11T17-14-06Z_vercel_access_request_FOLLOWUP.md`) documents the resolution.

---

*End of FINDINGS.*
