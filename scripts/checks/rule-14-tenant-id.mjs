import { readFile } from 'node:fs/promises';

const CREATE_TABLE_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([^;]+?)\);/gis;
const TENANT_COL_RE = /tenant_id\s+UUID\s+NOT\s+NULL/i;

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
