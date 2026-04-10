import { readFile } from 'node:fs/promises';

const SOFT_LIMIT = 300;
const HARD_LIMIT = 350;
const EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css']);
const EXCLUDED = ['node_modules/', '.git/', 'backups/', 'docs/', '.husky/'];

function shouldCheck(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  if (!EXTENSIONS.has(ext)) return false;
  return !EXCLUDED.some(ex => filePath.includes(ex));
}

export default async function fileSize(files) {
  const violations = [];
  const warnings = [];

  for (const f of files) {
    if (!shouldCheck(f)) continue;
    let content;
    try {
      content = await readFile(f, 'utf8');
    } catch {
      continue;
    }
    const lines = content.split('\n').length;
    if (lines > HARD_LIMIT) {
      violations.push({
        check: 'file-size',
        path: f,
        line: lines,
        message: `file exceeds ${HARD_LIMIT}-line hard max (${lines} lines)`,
      });
    } else if (lines > SOFT_LIMIT) {
      warnings.push({
        check: 'file-size',
        path: f,
        line: lines,
        message: `file exceeds ${SOFT_LIMIT}-line soft target (${lines} lines)`,
      });
    }
  }

  return { violations, warnings };
}
