import { readFile } from 'node:fs/promises';

const EXCLUDED = ['node_modules/', '.git/', 'backups/', 'scripts/checks/'];

const PATTERNS = [
  /function\s+(\w+)\s*\(/g,
  /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/g,
  /(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?function/g,
];

function isOrphanCandidate(filePath) {
  if (!filePath.endsWith('.js') && !filePath.endsWith('.mjs')) return false;
  return !EXCLUDED.some(ex => filePath.includes(ex));
}

export default async function rule21Orphans(files) {
  const violations = [];
  const warnings = [];
  const funcMap = new Map();

  for (const f of files) {
    if (!isOrphanCandidate(f)) continue;
    let content;
    try {
      content = await readFile(f, 'utf8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (const pattern of PATTERNS) {
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const name = match[1];
        if (name.length < 3) continue;
        const lineNum = content.slice(0, match.index).split('\n').length;
        if (!funcMap.has(name)) funcMap.set(name, []);
        funcMap.get(name).push({ path: f, line: lineNum });
      }
    }
  }

  for (const [name, locations] of funcMap) {
    const distinctFiles = new Set(locations.map(l => l.path));
    if (distinctFiles.size > 1) {
      for (const loc of locations.slice(1)) {
        const allFiles = locations.map(l => l.path).join(', ');
        violations.push({
          check: 'rule-21-orphans',
          path: loc.path,
          line: loc.line,
          message: `function "${name}" defined in ${distinctFiles.size} files: ${allFiles}`,
        });
      }
    }
  }

  return { violations, warnings };
}
