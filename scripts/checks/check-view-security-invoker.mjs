import { readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

const REPO = resolve(import.meta.dirname || '.', '..', '..');
const CREATE_VIEW_RE = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:(?:public|"public")\.)?(\w+|"[^"]+")/gi;
const SECURITY_INVOKER_RE = /WITH\s*\(\s*security_invoker\s*=\s*(?:on|true)\s*\)/i;

function isViewCheckDocFile(absPath) {
  const rel = relative(REPO, absPath).replace(/\\/g, '/');
  return /^docs\//.test(rel) || /^modules\/[^/]+\/docs\//.test(rel);
}

export default async function checkViewSecurityInvoker(files) {
  const violations = [];
  const warnings = [];

  for (const f of files) {
    if (!f.endsWith('.sql')) continue;
    if (isViewCheckDocFile(f)) continue;
    let content;
    try {
      content = await readFile(f, 'utf8');
    } catch {
      continue;
    }

    let match;
    CREATE_VIEW_RE.lastIndex = 0;
    while ((match = CREATE_VIEW_RE.exec(content)) !== null) {
      const viewName = match[1].replace(/"/g, '');
      const afterMatch = content.slice(match.index, match.index + 500);
      if (!SECURITY_INVOKER_RE.test(afterMatch)) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        violations.push({
          check: 'view-security-invoker',
          path: f,
          line: lineNum,
          message: `CREATE VIEW ${viewName} missing WITH (security_invoker = on) — all public views must assert security_invoker per recurrence guard §1.3`,
        });
      }
    }
  }

  return { violations, warnings };
}
