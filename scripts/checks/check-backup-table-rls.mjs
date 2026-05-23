import { readFile } from 'node:fs/promises';

const BACKUP_TABLE_RE = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:(?:public|"public")\.)?((_backup_\w+|"_backup_[^"]+"))/gi;

export default async function checkBackupTableRls(files) {
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
    BACKUP_TABLE_RE.lastIndex = 0;
    while ((match = BACKUP_TABLE_RE.exec(content)) !== null) {
      const tableName = match[1].replace(/"/g, '');
      const lineNum = content.slice(0, match.index).split('\n').length;

      const enableRE = new RegExp(
        `ALTER\\s+TABLE\\s+(?:public\\.)?${tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+ENABLE\\s+ROW\\s+LEVEL\\s+SECURITY`,
        'i'
      );
      const revokeRE = new RegExp(
        `REVOKE\\s+.*\\s+ON\\s+(?:public\\.)?${tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+FROM`,
        'i'
      );

      if (!enableRE.test(content)) {
        violations.push({
          check: 'backup-table-rls',
          path: f,
          line: lineNum,
          message: `CREATE TABLE ${tableName} (backup) missing ENABLE ROW LEVEL SECURITY in same file — CTAS inherits no RLS`,
        });
      }
      if (!revokeRE.test(content)) {
        warnings.push({
          check: 'backup-table-rls',
          path: f,
          line: lineNum,
          message: `CREATE TABLE ${tableName} (backup) missing REVOKE for anon/authenticated — backup tables should be service_role-only`,
        });
      }
    }
  }

  return { violations, warnings };
}
