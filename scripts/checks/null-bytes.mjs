import { readFile } from 'node:fs/promises';

// Scans source files for stray NUL bytes (0x00). These don't occur in
// legitimate .js / .css / .html text and are almost always the result
// of a platform/VM corruption bug (e.g. Cowork VM null-byte padding).
// Blocking violation — never let a corrupted file reach a commit.
const EXTENSIONS = new Set(['.js', '.mjs', '.cjs', '.jsx', '.ts', '.tsx', '.astro', '.css', '.html', '.htm']);
const EXCLUDED = ['node_modules/', '.git/', 'backups/', '.husky/'];

function shouldCheck(filePath) {
  const ext = filePath.slice(filePath.lastIndexOf('.'));
  if (!EXTENSIONS.has(ext)) return false;
  return !EXCLUDED.some(ex => filePath.includes(ex));
}

// Compute 1-based line number for a byte offset.
function lineOf(buf, offset) {
  let line = 1;
  for (let i = 0; i < offset && i < buf.length; i++) {
    if (buf[i] === 0x0A) line++;
  }
  return line;
}

export default async function nullBytes(files) {
  const violations = [];
  const warnings = [];

  for (const f of files) {
    if (!shouldCheck(f)) continue;
    let buf;
    try {
      buf = await readFile(f);
    } catch {
      continue;
    }
    const firstNul = buf.indexOf(0x00);
    if (firstNul === -1) continue;

    let count = 0;
    for (let i = 0; i < buf.length; i++) if (buf[i] === 0x00) count++;

    violations.push({
      check: 'null-bytes',
      path: f,
      line: lineOf(buf, firstNul),
      message: `file contains ${count} NUL byte${count === 1 ? '' : 's'} (first at byte offset ${firstNul}) — likely VM/editor corruption; restore with \`git checkout HEAD -- <file>\``,
    });
  }

  return { violations, warnings };
}
