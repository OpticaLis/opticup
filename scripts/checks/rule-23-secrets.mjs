import { readFile } from 'node:fs/promises';

const EXTENSIONS = new Set(['.js', '.mjs', '.html', '.md']);
const EXCLUDED = ['node_modules/', '.git/', 'backups/', 'package-lock.json'];

const SECRET_PATTERNS = [
  { name: 'JWT token', re: /eyJ[A-Za-z0-9_-]{30,}/g },
  { name: 'Anthropic API key', re: /sk-ant-[A-Za-z0-9_-]{20,}/g },
  { name: 'Postgres connection URL', re: /postgres:\/\/[^\s'"]+/g },
  {
    name: 'Inline service role key',
    re: /['"]SUPABASE_SERVICE_ROLE_KEY['"]\s*[:=]\s*['"][^'"]{10,}['"]/g,
  },
];

function isSecretCandidate(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  if (!EXTENSIONS.has(ext)) return false;
  return !EXCLUDED.some(ex => filePath.includes(ex));
}

export default async function rule23Secrets(files) {
  const violations = [];
  const warnings = [];

  for (const f of files) {
    if (!isSecretCandidate(f)) continue;
    let content;
    try {
      content = await readFile(f, 'utf8');
    } catch {
      continue;
    }

    for (const { name, re } of SECRET_PATTERNS) {
      re.lastIndex = 0;
      let match;
      while ((match = re.exec(content)) !== null) {
        const lineNum = content.slice(0, match.index).split('\n').length;
        violations.push({
          check: 'rule-23-secrets',
          path: f,
          line: lineNum,
          message: `possible ${name} detected`,
        });
      }
    }
  }

  return { violations, warnings };
}
