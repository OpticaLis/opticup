import { readFile } from 'node:fs/promises';

const CREATE_TABLE_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/gi;

function hasRLS(content, tableName) {
  const enableRE = new RegExp(
    `ALTER\\s+TABLE\\s+(?:public\\.)?${tableName}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
    'i'
  );
  const policyRE = new RegExp(
    `CREATE\\s+POLICY\\s+\\w+\\s+ON\\s+(?:public\\.)?${tableName}`,
    'i'
  );
  return enableRE.test(content) && policyRE.test(content);
}

export default async function rule15Rls(files) {
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
    CREATE_TABLE_RE.lastIndex = 0;
    while ((match = CREATE_TABLE_RE.exec(content)) !== null) {
      const tableName = match[1];
      if (!hasRLS(content, tableName)) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        violations.push({
          check: 'rule-15-rls',
          path: f,
          line: lineNum,
          message: `CREATE TABLE ${tableName} missing ENABLE ROW LEVEL SECURITY or CREATE POLICY`,
        });
      }
    }
  }

  return { violations, warnings };
}
