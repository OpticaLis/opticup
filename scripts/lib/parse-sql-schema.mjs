import { readFileSync } from 'fs';

/**
 * Regex-parses a GLOBAL_SCHEMA.sql file and extracts tables, views, and policies.
 * ~90% accuracy target — good enough for drift detection.
 */
export default function parseSqlSchema(filePath) {
  const sql = readFileSync(filePath, 'utf-8');
  const tables = {};
  const views = [];
  const policies = [];

  // Extract CREATE TABLE blocks
  const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\);/gi;
  let m;
  while ((m = tableRe.exec(sql)) !== null) {
    const name = m[1];
    const body = m[2];
    const columns = [];
    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      // Skip blanks, comments, constraints (CHECK, UNIQUE, PRIMARY, FOREIGN, CONSTRAINT, EXCLUDE)
      if (!trimmed || trimmed.startsWith('--')) continue;
      if (/^(CHECK|UNIQUE|PRIMARY|FOREIGN|CONSTRAINT|EXCLUDE)\b/i.test(trimmed)) continue;
      // Column line: name TYPE ...
      const colMatch = trimmed.match(/^(\w+)\s+(UUID|TEXT|INTEGER|INT|BIGINT|SMALLINT|BOOLEAN|NUMERIC|DECIMAL|JSONB?|TIMESTAMPTZ?|TIMESTAMP|DATE|TIME|FLOAT|DOUBLE|REAL|SERIAL|BIGSERIAL)\b/i);
      if (colMatch) {
        const nullable = !/NOT\s+NULL/i.test(trimmed);
        columns.push({ name: colMatch[1], type: colMatch[2].toUpperCase(), nullable });
      }
    }
    tables[name] = { columns };
  }

  // Extract CREATE VIEW
  const viewRe = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(\w+)/gi;
  while ((m = viewRe.exec(sql)) !== null) {
    views.push(m[1]);
  }

  // Extract CREATE POLICY
  const policyRe = /CREATE\s+POLICY\s+"?([^"(\s]+)"?\s+ON\s+(\w+)/gi;
  while ((m = policyRe.exec(sql)) !== null) {
    policies.push({ name: m[1], table: m[2] });
  }

  return { tables, views, policies };
}
