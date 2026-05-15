# RLS Pattern — Global Reference Tables (read-anywhere, write-platform-only)

> **Pattern category:** Global reference table — universal data identical for
> every tenant (ISO-4217 currency codes, ISO-3166 country codes, IANA timezones,
> language codes, document-type catalogs, etc.).
>
> **NOT for tenant-scoped data.** Tenant-scoped tables continue to use the
> canonical tenant-isolation pattern (`pending_sales` reference) from
> CLAUDE.md §4 Iron Rule 15.
>
> **Source:** `M1A_CURRENCIES_GLOBAL_HOTFIX` FOREMAN_REVIEW §6 Author Proposal #1
> (2026-05-14). First instance: `public.currencies`.

---

## When to use this pattern (decision matrix)

| Property of the data | Pattern |
|---|---|
| Identical across every tenant; universal reference (ISO codes, language codes, timezones, units) | **Global reference (this doc)** |
| Different per tenant; isolated by `tenant_id` (orders, customers, products, leads, settings) | **Tenant-isolation** — see CLAUDE.md §4 Iron Rule 15 canonical pattern |
| Configurable per tenant but seeded from a global default at provisioning time | **Tenant-isolation** — seed at provisioning, never share rows across tenants |
| Read by everyone but written only by platform-admin staff (e.g., `vat_rates`, `lens_brand` global catalog, currencies, country list) | **Global reference (this doc)** |

If a table is **read** universally but **written** by tenants (e.g., per-tenant
custom branding pulled from a shared template), it is NOT a global reference —
it's tenant-scoped with seeded defaults.

---

## The 5-policy pattern

A global reference table needs FIVE RLS policies — four scoped to `public` (the
anon/authenticated/`authenticator` roles), one for `service_role` bypass:

### Policy 1 — `read_anywhere` (SELECT, TO public, USING true)
Any caller — anon, authenticated, supabase-admin internal, anywhere — can read.
The data is universal, so there's no tenant-scoping. The RLS layer enforces
"read-only by default" for non-platform-admin callers via the absence of
WRITE policies.

### Policy 2 — `write_platform_only` (INSERT, TO public, WITH CHECK is_platform_super_admin())
Only platform-admin staff (verified via the `is_platform_super_admin()` SQL
function from Phase 1A) can INSERT new rows. Tenants cannot add to the global
reference.

### Policy 3 — `update_platform_only` (UPDATE, TO public, USING is_platform_super_admin() WITH CHECK is_platform_super_admin())
Only platform admins can UPDATE existing rows. Both USING (which rows are
visible for update) and WITH CHECK (which new row values are allowed) must
gate on `is_platform_super_admin()`.

### Policy 4 — `delete_platform_only` (DELETE, TO public, USING is_platform_super_admin())
Only platform admins can DELETE rows.

### Policy 5 — `service_bypass` (ALL, TO service_role, USING true)
`service_role` connections (Edge Functions, migrations, server-side scripts
with the service role key) bypass all gating. This is the same `service_bypass`
policy pattern used in the canonical tenant-isolation pair — keep the name
consistent so reviewers can pattern-match across both pattern categories.

---

## Canonical SQL snippet

```sql
-- Enable RLS
ALTER TABLE public.<table_name> ENABLE ROW LEVEL SECURITY;

-- Policy 1: read_anywhere
CREATE POLICY read_anywhere
  ON public.<table_name>
  FOR SELECT
  TO public
  USING (true);

-- Policy 2: write_platform_only
CREATE POLICY write_platform_only
  ON public.<table_name>
  FOR INSERT
  TO public
  WITH CHECK (public.is_platform_super_admin());

-- Policy 3: update_platform_only
CREATE POLICY update_platform_only
  ON public.<table_name>
  FOR UPDATE
  TO public
  USING (public.is_platform_super_admin())
  WITH CHECK (public.is_platform_super_admin());

-- Policy 4: delete_platform_only
CREATE POLICY delete_platform_only
  ON public.<table_name>
  FOR DELETE
  TO public
  USING (public.is_platform_super_admin());

-- Policy 5: service_bypass
CREATE POLICY service_bypass
  ON public.<table_name>
  FOR ALL
  TO service_role
  USING (true);
```

Verify post-migration with:

```sql
SELECT polname, polcmd, polroles::regrole[], pg_get_expr(polqual, polrelid) AS using_clause
FROM pg_policy
WHERE polrelid = 'public.<table_name>'::regclass
ORDER BY polname;
```

Expected: 5 rows — `read_anywhere` / `write_platform_only` / `update_platform_only` /
`delete_platform_only` / `service_bypass`.

---

## Rule 14 (tenant_id) exemption

Tables using this pattern do NOT have `tenant_id`. They are universal. Add the
table name to `scripts/checks/rule-14-tenant-id.mjs` `GLOBAL_SINGLETON_EXEMPT`
constant (or its successor; check the current name when editing). The exemption
is what allows the pre-commit hook to accept a tenant_id-less table.

**Document the exemption in the SPEC's §7 Out of Scope** with the rationale
("universal ISO-X reference; identical across every tenant; precedent:
`vat_rates`, `currencies`").

---

## What to write in §4 Destructive Operations of your SPEC

If your SPEC migrates an EXISTING tenant-scoped table to this pattern (the
`currencies` case), the migration includes:

- `DROP COLUMN tenant_id`
- `DROP CONSTRAINT <existing_uniques_with_tenant_id>`
- `DROP POLICY <existing tenant_isolation policies>`
- `ALTER TABLE ... DROP CONSTRAINT pkey` (if you're changing the PK)

ALL of these are destructive per Iron Rule 32. Your SPEC's §4 Destructive
Operations MUST enumerate them and authorize them. Use the MCP-only-apply
path (see `SKILL.md` SPEC Authoring Protocol Step 1.5.3 — DDL boundary scan)
unless this is a production-critical migration whose `supabase/migrations/`
record is load-bearing for replay.

If your SPEC creates a NEW global reference table (no existing rows), §4 can
say `None.` — `CREATE TABLE` + `CREATE POLICY` are not destructive.

---

## Cross-references

- **CLAUDE.md §4 Iron Rule 15** — canonical tenant-isolation pattern (the
  default; this doc is the exception).
- **CLAUDE.md §6 Iron Rule 32** — Destructive Operations Gate; relevant when
  migrating an existing table TO this pattern.
- **`scripts/checks/rule-14-tenant-id.mjs`** — `GLOBAL_SINGLETON_EXEMPT`
  constant. Add the table name here when adopting this pattern.
- **`M1A_CURRENCIES_GLOBAL_HOTFIX/SPEC.md`** — first instance; reference
  implementation. Particularly §6 Migration body + §7 Destructive Operations.
- **Future SPEC stub `M1_5_RULE_15_GLOBAL_REFERENCE_TABLE_PATTERN`** —
  constitutional edit to add this second canonical pattern alongside Iron
  Rule 15's tenant-isolation pattern. Currencies hotfix surfaced the need;
  the SPEC stub will formalize.

---

*This reference codifies a real pattern observed in production. When the next
SPEC needs a global reference table (likely `countries`, `languages`, or
similar), copy the 5-policy snippet verbatim. Do not reinvent it from first
principles.*
