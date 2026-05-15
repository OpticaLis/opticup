import { readFile } from 'node:fs/promises';

const CREATE_TABLE_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([^;]+?)\);/gis;
// Accepts either `tenant_id UUID NOT NULL` (standard tenant-scoped tables)
// or `owner_tenant_id UUID` (platform-owned tables — owner_tenant_id NULL means
// platform-owned, NOT NULL means specific tenant adopted; both satisfy Rule 14's
// spirit of "every table carries tenant attribution"). Documented exception
// pattern from M1 Lens Phase 1A handoff §"RLS pattern" for lens_brand,
// lens_design, lens_variant.
const TENANT_COL_RE = /(?:owner_)?tenant_id\s+UUID(?:\s+NOT\s+NULL)?/i;

// Global singleton/sequence-state/reference tables that intentionally have no
// tenant attribution (platform-managed). Adding a table here requires Foreman
// approval and a comment in the migration explaining the exception.
//
// Two categories so far:
//   (a) Singleton/sequence-state — `lens_variant_display_seq` (scope='global'
//       for the next_lens_variant_display_id() RPC; lens_variant is platform-owned).
//   (b) Universal reference — `currencies` (ISO-4217 codes, identical for every
//       tenant; M1A-DEBT-01 hotfix 2026-05-14 documented exception).
const GLOBAL_SINGLETON_EXEMPT = new Set([
  'lens_variant_display_seq',  // (a) M1 Lens Phase 1A: scope='global' singleton for next_lens_variant_display_id() RPC; lens_variant is platform-owned.
  'currencies',                // (b) M1A-DEBT-01 hotfix 2026-05-14: GLOBAL ISO-4217 reference table; RLS read_anywhere + write_platform_only via is_platform_super_admin().
]);

function isMigration(filePath) {
  return filePath.endsWith('.sql') && filePath.includes('migrations');
}

export default async function rule14TenantId(files) {
  const violations = [];
  const warnings = [];

  for (const f of files) {
    if (!isMigration(f)) continue;
    let content;
    try {
      content = await readFile(f, 'utf8');
    } catch {
      continue;
    }

    let match;
    CREATE_TABLE_RE.lastIndex = 0;
    while ((match = CREATE_TABLE_RE.exec(content)) !== null) {
      const tableName = match[1];
      const body = match[2];
      if (GLOBAL_SINGLETON_EXEMPT.has(tableName)) continue;
      if (!TENANT_COL_RE.test(body)) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        violations.push({
          check: 'rule-14-tenant-id',
          path: f,
          line: lineNum,
          message: `CREATE TABLE ${tableName} missing "tenant_id UUID NOT NULL"`,
        });
      }
    }
  }

  return { violations, warnings };
}
