// scripts/checks/check-root-discipline.mjs
// Root Discipline Rule enforcement (CLAUDE.md §0.5).
// Auto-loaded by scripts/verify.mjs from scripts/checks/.
//
// Behavior:
//   - In --staged mode: detects newly-added root entries via `git diff --cached --diff-filter=A`.
//   - New root file NOT on allowlist → violation (forces verify.mjs exit 1, blocks commit).
//   - New root directory NOT on allowlist → warning (verify.mjs exits 2 if no other violations,
//     which the husky pre-commit hook treats as allow-with-warning).
//   - In --full mode: same logic; if no staged adds, returns clean.
//
// Allowlist source: scripts/checks/root-allowlist.json (data-driven; update when CLAUDE.md §0.5 changes).

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ALLOWLIST_PATH = join(__dirname, 'root-allowlist.json');

function loadAllowlist() {
  const raw = readFileSync(ALLOWLIST_PATH, 'utf8');
  const data = JSON.parse(raw);
  const files = new Set();
  const dirs = new Set();
  for (const cat of Object.values(data.files || {})) for (const f of cat) files.add(f);
  for (const cat of Object.values(data.directories || {})) for (const d of cat) dirs.add(d);
  return { files, dirs };
}

function getStagedAdds() {
  try {
    const out = execSync('git diff --cached --name-status --diff-filter=A', { encoding: 'utf8' });
    return out.split('\n')
      .map(l => l.trim().split('\t'))
      .filter(p => p.length >= 2 && p[0] === 'A')
      .map(p => p[1]);
  } catch {
    return [];
  }
}

function getNewRootFiles(adds) {
  return adds.filter(p => !p.includes('/'));
}

function getNewRootDirs(adds) {
  const candidates = new Set();
  for (const p of adds) {
    if (!p.includes('/')) continue;
    candidates.add(p.split('/')[0]);
  }
  const newDirs = [];
  for (const dir of candidates) {
    try {
      execSync(`git cat-file -e HEAD:"${dir}"`, { stdio: 'ignore' });
      // existed in HEAD → not new
    } catch {
      newDirs.push(dir);
    }
  }
  return newDirs;
}

export default async function checkRootDiscipline(_files) {
  const violations = [];
  const warnings = [];

  const adds = getStagedAdds();
  if (adds.length === 0) return { violations, warnings };

  const newRootFiles = getNewRootFiles(adds);
  const newRootDirs = getNewRootDirs(adds);

  if (newRootFiles.length === 0 && newRootDirs.length === 0) {
    return { violations, warnings };
  }

  const { files: allowedFiles, dirs: allowedDirs } = loadAllowlist();

  for (const f of newRootFiles) {
    if (allowedFiles.has(f)) continue;
    violations.push({
      check: 'root-discipline',
      path: f,
      line: 0,
      message: `new root-level file "${f}" not on allowlist (CLAUDE.md §0.5). Move to a subfolder OR add to scripts/checks/root-allowlist.json + document in CLAUDE.md §0.5.`,
    });
  }

  for (const d of newRootDirs) {
    if (allowedDirs.has(d)) continue;
    warnings.push({
      check: 'root-discipline',
      path: d,
      line: 0,
      message: `new root-level directory "${d}/" not on allowlist (CLAUDE.md §0.5). Review and add to scripts/checks/root-allowlist.json + CLAUDE.md §0.5 if intentional.`,
    });
  }

  return { violations, warnings };
}
