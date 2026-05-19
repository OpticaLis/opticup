You are the opticup-strategic Module Strategist for Module 1. Load the opticup-strategic skill.

Read the Brief in full at:
modules/Module 1 - Inventory Management/architecture-brief/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS_BRIEF.md

This Brief unblocks Stage 2A's 🟡 close — the 4 creation modals submit-fail with RLS 403 because no policy permits platform-super-admin writes to the 4 global lens-catalog tables. The fix is one RLS policy per table (4 total), calling the EXISTING `public.is_platform_super_admin()` function inside both USING and WITH CHECK clauses. No auth-layer changes, no client-side changes, no new permission keys.

Author a SPEC inside modules/Module 1 - Inventory Management/docs/specs/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS/ per folder-per-SPEC protocol. Then run the Full-Auto Pipeline end-to-end: Executor → Reviewer → Localhost-Tester → Foreman closure.

Hard rules enforced this run:
1. NO polish-by-validation closure. Pre-flight verified the 4 policies do NOT exist 2026-05-18 night. If Executor finds them already in place — STOP, escalate.
2. Tier C VFV: 4 positive submit tests (platform admin creates 1 supplier + 1 brand + 1 design + 1 variant on demo) + 4 negative tests (tenant manager attempts same — must 403). 8 cases minimum.
3. FOREMAN_REVIEW.md mandatory within 24h of close — same session as EXECUTION_REPORT.md.
4. Iron Rule 32: declare destructive operations explicitly. DROP POLICY IF EXISTS counts as destructive even if idempotent.
5. Single migration file. 4 DROP + 4 CREATE. Idempotent.
6. Apply to the single Supabase project (covers both demo and Prizma — same DB).

Verified facts (probed via Supabase MCP 2026-05-18 night):
- `public.is_platform_super_admin()` EXISTS, queries `platform_admins` by `auth.uid()`, returns boolean.
- Current policies on lens_brand / lens_design / lens_variant / contact_lens_variant: 3 each (owner_view + public_view + service_bypass). NONE grants write to non-service-role admins.
- Owner_view fails for global rows (`owner_tenant_id IS NULL`); public_view is SELECT-only on published+active rows. Drafts and writes both blocked for platform admins.

Pattern to use (canonical, becomes project-wide precedent for Module 11 + Module 13 + Module 14 future similar work):
```sql
DROP POLICY IF EXISTS platform_admin_bypass ON <table>;
CREATE POLICY platform_admin_bypass ON <table>
  FOR ALL
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());
```

Pre-flight checklist (mandatory before SPEC §1.5 written):
- Confirm `platform_admins` table has ≥1 row with `role='super_admin'` AND `status='active'` AND `auth_user_id` matching a real authenticated user. Without this, the positive test cannot run.
- Re-run the policy probe to confirm `platform_admin_bypass` does NOT exist on any of the 4 tables.
- Confirm `public.is_platform_super_admin()` is still callable (probe `pg_proc`).

Pre-Action Collision Check: claim lock with branch develop + files owned glob "supabase/migrations/**,modules/Module 1 - Inventory Management/docs/specs/M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS/**".

Pipeline: Path X sequential. Stop on deviation. Standard escalation protocol if blocked.

After the pipeline closes, emit ONE Hebrew status line to Daniel summarizing: verdict + commit count + 4 positive tests result + 4 negative tests result + Foreman verdict.
