import { readFile } from 'node:fs/promises';

const UNIQUE_RE = /UNIQUE\s*\(([^)]+)\)/gi;

export default async function rule18UniqueTenant(files) {
  const violations = [];
  const warnings = [];

  for (const f of files) {
    if (!f.endsWith('.sql')) continue;
    let content;
    try {
      content = await readFile(f, 'utf8');
    } catch {
      continue;
    }

    let match;
    UNIQUE_RE.lastIndex = 0;
    while ((match = UNIQUE_RE.exec(content)) !== null) {
      const cols = match[1];
      if (!cols.includes('tenant_id')) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        violations.push({
          check: 'rule-18-unique-tenant',
          path: f,
          line: lineNum,
          message: `UNIQUE constraint (${cols.trim()}) missing tenant_id`,
        });
      }
    }
  }

  return { violations, warnings };
}
