import { readFile } from 'node:fs/promises';

const SOFT_LIMIT = 300;
const HARD_LIMIT = 350;
// Studio module JS files have a higher limit per CLAUDE.md Iron Rule §5
const MODULE_SOFT_LIMIT = 1400;
const MODULE_HARD_LIMIT = 1600;
const EXTENSIONS = new Set(['.js', '.mjs', '.html', '.css']);
const EXCLUDED = ['node_modules/', '.git/', 'backups/', 'docs/', '.husky/'];

function isModuleFile(filePath) {
  return filePath.includes('modules/storefront/') || filePath.includes('modules\\storefront\\');
}

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
    const hard = isModuleFile(f) ? MODULE_HARD_LIMIT : HARD_LIMIT;
    const soft = isModuleFile(f) ? MODULE_SOFT_LIMIT : SOFT_LIMIT;
    if (lines > hard) {
      violations.push({
        check: 'file-size',
        path: f,
        line: lines,
        message: `file exceeds ${hard}-line hard max (${lines} lines)`,
      });
    } else if (lines > soft) {
      warnings.push({
        check: 'file-size',
        path: f,
        line: lines,
        message: `file exceeds ${soft}-line soft target (${lines} lines)`,
      });
    }
  }

  return { violations, warnings };
}
