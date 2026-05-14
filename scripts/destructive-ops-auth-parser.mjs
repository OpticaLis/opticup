// scripts/checks/destructive-ops-auth-parser.mjs
//
// Authorization parsing for the Iron Rule 32 Destructive Operations Gate.
//
// Reads `## Destructive Operations` (or `## 4. Destructive Operations`)
// sections from staged SPEC.md files and derives the set of file paths
// that those SPECs explicitly authorize for deletion. Used by
// destructive-ops-declared.mjs (section B) to suppress violations for
// declared deletions.
//
// Added 2026-05-14 by M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING
// to keep destructive-ops-declared.mjs under Iron Rule 12's 350-line cap.

import { readFile } from 'node:fs/promises';
import { relative, basename } from 'node:path';

// Heading regex — duplicates the one in destructive-ops-declared.mjs.
// Both files must match or section detection will diverge silently.
export const SPEC_HEADING_RE = /^##\s+(?:\d+\.\s+)?Destructive Operations\s*$/m;

export function isSpecPath(absPath, repoAbs) {
  const rel = relative(repoAbs, absPath).replace(/\\/g, '/');
  return /^modules\/[^/]+\/docs\/specs\/[^/]+\/SPEC\.md$/.test(rel);
}

export function extractDestructiveOpsSection(specText) {
  const m = specText.match(SPEC_HEADING_RE);
  if (!m) return '';
  const startIdx = specText.indexOf(m[0]) + m[0].length;
  // Section ends at the next top-level "## " heading or EOF.
  const rest = specText.slice(startIdx);
  const nextHeadingMatch = rest.match(/\n##\s+/);
  const end = nextHeadingMatch ? nextHeadingMatch.index : rest.length;
  return rest.slice(0, end);
}

// A SPEC declaring `**None.**` / `None.` authorizes ZERO destructive
// operations. Anything else is parsed for explicit file references.
export function isExplicitlyNone(sectionText) {
  const stripped = sectionText.replace(/[\s\n*_`>-]+/g, '').toLowerCase();
  return stripped === 'none.' || stripped === 'none';
}

// 3 match strategies in order of specificity:
//   1) full relative path appears verbatim.
//   2) basename appears verbatim (basename length ≥ 4 to avoid
//      degenerate matches like 'a.js' colliding on 'a').
//   3) directory + extension glob: section contains `<dir>/*.<ext>`
//      and the delete is `<dir>/foo.<ext>`.
export function isAuthorizedDeletion(deleteRelPath, authText) {
  if (!authText || isExplicitlyNone(authText)) return false;
  const base = basename(deleteRelPath);
  const lcAuth = authText.toLowerCase();
  const lcRel = deleteRelPath.toLowerCase().replace(/\\/g, '/');
  const lcBase = base.toLowerCase();

  if (lcAuth.includes(lcRel)) return true;
  if (base.length >= 4 && lcAuth.includes(lcBase)) return true;

  const ext = (lcBase.split('.').pop() || '');
  if (ext) {
    const dir = lcRel.includes('/') ? lcRel.slice(0, lcRel.lastIndexOf('/')) : '';
    if (dir) {
      const glob = `${dir}/*.${ext}`;
      if (lcAuth.includes(glob)) return true;
    }
  }
  return false;
}

// Returns Set<string> of staged-delete relative paths that are declared
// in at least one staged SPEC.md's destructive-ops section.
//
// `stagedFiles` is the absolute-path list of staged files (ACM filter)
// passed by verify.mjs to its check modules. `stagedDeletes` is the
// relative-path list of staged deletions (D filter).
export async function collectAuthorizedDeletes(stagedFiles, stagedDeletes, repoAbs) {
  const authorized = new Set();
  if (stagedDeletes.length === 0) return authorized;

  const specPaths = stagedFiles.filter(p => isSpecPath(p, repoAbs));
  if (specPaths.length === 0) return authorized;

  const sections = [];
  for (const sp of specPaths) {
    try {
      const text = await readFile(sp, 'utf8');
      const section = extractDestructiveOpsSection(text);
      if (section) sections.push(section);
    } catch { /* unreadable spec — skip */ }
  }
  if (sections.length === 0) return authorized;

  const merged = sections.join('\n');
  for (const del of stagedDeletes) {
    if (isAuthorizedDeletion(del, merged)) authorized.add(del);
  }
  return authorized;
}
