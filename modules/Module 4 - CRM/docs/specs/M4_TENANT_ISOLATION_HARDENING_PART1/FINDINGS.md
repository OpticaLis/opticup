# FINDINGS — M4_TENANT_ISOLATION_HARDENING_PART1

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_TENANT_ISOLATION_HARDENING_PART1/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC §10/§12 cited `submit_storefront_lead` as the cms_leads writer; it actually writes to `storefront_leads` (different table)

- **Code:** `M4-DOC-05`
- **Severity:** LOW
- **Discovered during:** §12 Test 2 setup (calling `submit_storefront_lead` with whitelist contacts, expecting a row in `cms_leads`)
- **Location:** `modules/Module 4 - CRM/docs/specs/M4_TENANT_ISOLATION_HARDENING_PART1/SPEC.md` §10 ("the legitimate caller path; even though G-CRIT-2 deferred fixes that RPC, it CALLS cms_leads") + §12 Test 2.
- **Description:** The SPEC author asserted that `submit_storefront_lead` is the legitimate `cms_leads` writer. It is not — that RPC's body has `INSERT INTO storefront_leads (...)`, a different table with `inventory_id NOT NULL`. A `pg_proc.prosrc` search for `cms_leads` returns ZERO functions. The actual historical writer was the legacy WP-shortcode form (Astro `/api/leads/submit` endpoint), which has been retired since 2026-05-03 cutover (P5_7_STOREFRONT_FORM_REWIRE). Recent `cms_leads` traffic = zero. The new RLS therefore closes a now-dormant attack surface; no live writer is broken. **3rd occurrence of "SPEC author cited a DB object's role from memory":** prior cases were `event_registration_open` template (M4-DOC-04) and `recipient_phone`/`recipient_email` columns (M4-DOC-02).
- **Reproduction:**
  ```sql
  -- Confirms no public RPC writes to cms_leads
  SELECT proname FROM pg_proc
  WHERE pronamespace='public'::regnamespace AND prosrc ILIKE '%cms_leads%';
  -- → 0 rows

  -- Confirms submit_storefront_lead writes elsewhere
  -- (visible in error: "null value in column \"inventory_id\" of relation \"storefront_leads\" violates not-null constraint")
  ```
- **Expected vs Actual:**
  - Expected (per SPEC §10): `submit_storefront_lead` is the legitimate path that writes to `cms_leads`.
  - Actual: that RPC writes to `storefront_leads`. The legitimate `cms_leads` writer was the WP-era REST POST, retired on cutover.
- **Suggested next action:** TECH_DEBT — apply opticup-executor SKILL Proposal 1 (the `pg_proc.prosrc` source-search check in Step 1.5) AND extend opticup-strategic Step 1.5 with the same check on the SPEC author side. Pattern is now 3-occurrence; per the project's "apply directly after 3rd" rule, this should land as a real edit in the SKILL files in the next session.
- **Foreman override:** { }

---

### Finding 2 — Two `.claude/skills/opticup-main-strategic/*` files appeared modified mid-session, NOT touched by this executor

- **Code:** `M4-INFRA-06`
- **Severity:** LOW (process-friction; not a security or data issue)
- **Discovered during:** pre-commit `git status` after writing my own files
- **Location:**
  - `.claude/skills/opticup-main-strategic/SKILL.md`
  - `.claude/skills/opticup-main-strategic/references/DECISIONS_LOG.md`
- **Description:** At session start `git status` showed only the standard pre-existing untracked paths (`__LAUNCH_PLAN_DRAFT__/`, `tests/optic*.acc*`). After my SPEC work, `git status --short` reported these two files as modified — but I never opened or edited them. Possibilities: (a) a parallel Claude Code session in another project window is editing them; (b) a hook ran during my session that touched them; (c) a Sentinel run wrote to them. None of these are caused by my work. I excluded them from the fix commit using explicit `git add` of in-scope files only.
- **Reproduction:** N/A (race condition or background process)
- **Expected vs Actual:**
  - Expected: tree clean except for files I created/modified within this session.
  - Actual: 2 unrelated files appeared as modified.
- **Suggested next action:** DISMISS for this SPEC (no impact). For the next session: investigate what process touched those files. If a hook is configured to modify SKILL files during certain triggers, document it; if a parallel session is the cause, the multi-session coordination protocol should be enforced (only one session writes to `.claude/skills/` at a time).
- **Foreman override:** { }

---

### Finding 3 — `v_crm_campaign_performance` shows 0 rows under service_role but 7 rows under authenticated/demo

- **Code:** `M4-VIEW-01`
- **Severity:** INFO
- **Discovered during:** post-migration row-count cross-check across role contexts
- **Location:** `v_crm_campaign_performance`
- **Description:** As `service_role` (bypasses RLS), the view returns 0 rows pre and post migration. As `authenticated` with demo's tenant_id JWT claim, the view returns 7 rows. service_role is supposed to see at least the authenticated user's rows (it sees everything). The opposite pattern — service_role sees fewer rows than an authenticated user — is unusual. Likely explanation: the view's SQL contains a subquery or join that interacts with the security context in a non-obvious way (e.g., a LATERAL join against a tenant-scoped table that returns 0 rows when the outer role can see everything but the inner can't be tenant-pinned). Not a regression caused by THIS migration — pre-migration counts showed the same pattern. Logged for documentation.
- **Reproduction:**
  ```sql
  -- As service_role (default execute_sql context)
  SELECT COUNT(*) FROM public.v_crm_campaign_performance;  -- → 0

  -- As authenticated with demo tenant_id
  BEGIN;
  SET LOCAL ROLE authenticated;
  SET LOCAL request.jwt.claims = '{"tenant_id":"8d8cfa7e-ef58-49af-9702-a862d459cccb","role":"authenticated"}';
  SELECT COUNT(*) FROM public.v_crm_campaign_performance;  -- → 7
  ROLLBACK;
  ```
- **Expected vs Actual:**
  - Expected: service_role row count ≥ authenticated row count for the same view.
  - Actual: service_role=0, authenticated/demo=7.
- **Suggested next action:** DISMISS for this SPEC (the QA criteria the migration cared about — "demo can read its own slice" + "row counts unchanged pre/post" — both pass). For a future audit: review `v_crm_campaign_performance`'s SQL definition to understand the role-dependent row count, and whether the 7 rows visible to authenticated/demo are correct or the view has a subtle bug.
- **Foreman override:** { }

---

*End of FINDINGS.*
