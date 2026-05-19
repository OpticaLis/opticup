// ui-spec-verification.mjs — Iron Rule 34 enforcement
//
// Authored by M4_DUAL_PATH_CLEAN_FIX_2026_05_19 SPEC §3 step 12.
//
// Iron Rule 34: any SPEC that modifies JavaScript in modules/crm/, modules/*/,
// or any .js/.html file consumed by a browser MUST close with Chrome MCP
// evidence: screenshot + runtime trace + DB query. SQL-only verification
// is necessary but not sufficient.
//
// Enforcement: when a commit stages BOTH (a) UI .js/.html files AND (b) a
// FOREMAN_REVIEW.md inside the SPEC folder's docs/specs/*/, the FOREMAN_REVIEW.md
// MUST contain text matching the three evidence categories below.
//
// Returns exit 1 (violation, blocks commit) when an actively-closing SPEC ships
// UI code without the required evidence text.
//
// Bypass: only Daniel's explicit in-chat go-ahead (no --no-verify, no flag).
// To self-test: `node scripts/checks/ui-spec-verification.mjs --test`.

import { readFile } from 'node:fs/promises';
import { dirname, basename, sep } from 'node:path';

// UI file patterns that trigger the rule. Any modules/crm/**/*.js qualifies;
// also any *.html or *.js under modules/ that a browser would load.
function isUiFile(p) {
  const norm = p.replaceAll('\\', '/');
  if (norm.endsWith('.html')) return true;
  if (!norm.endsWith('.js')) return false;
  if (norm.includes('/modules/crm/')) return true;
  if (norm.includes('/modules/admin/')) return true;
  if (norm.includes('/modules/inventory/')) return true;
  if (norm.includes('/modules/lens-catalog-admin/')) return true;
  if (norm.includes('/modules/shared/')) return true;
  if (norm.includes('/modules/storefront/')) return true;
  if (norm.includes('/js/') && !norm.includes('/scripts/')) return true;
  return false;
}

function isForemanReview(p) {
  const norm = p.replaceAll('\\', '/');
  return norm.endsWith('/FOREMAN_REVIEW.md') && norm.includes('/docs/specs/');
}

// Three Chrome-MCP evidence categories the FOREMAN_REVIEW.md must mention.
// Each rule has multiple acceptable phrasings so authors aren't forced to
// repeat boilerplate verbatim.
const EVIDENCE_RULES = [
  {
    name: 'chrome_mcp_mention',
    needles: ['Chrome MCP', 'chrome-devtools', 'mcp__chrome-devtools'],
    hint: 'mention "Chrome MCP" (or chrome-devtools MCP) somewhere in the closure',
  },
  {
    name: 'screenshot_reference',
    needles: ['screenshot', 'screenshots', '.png', '.jpeg', '.webp'],
    hint: 'reference at least one saved screenshot file (e.g. _archive/<spec>/verification/*.png)',
  },
  {
    name: 'runtime_trace',
    needles: ['window.__modalTrace', 'runtime trace', 'console trace', 'modal_trace.json', 'Modal.show', 'CrmAutomationClient.evaluate'],
    hint: 'attach a runtime trace (window.__modalTrace dump, console log, or equivalent) proving the expected events fired',
  },
];

function containsAny(haystack, needles) {
  return needles.some((n) => haystack.includes(n));
}

export default async function uiSpecVerification(files) {
  const violations = [];
  const warnings = [];

  const uiFiles = files.filter(isUiFile);
  const reviewFiles = files.filter(isForemanReview);

  // Nothing to check if neither category is staged.
  if (!uiFiles.length || !reviewFiles.length) return { violations, warnings };

  for (const reviewPath of reviewFiles) {
    let content;
    try { content = await readFile(reviewPath, 'utf8'); }
    catch (e) {
      warnings.push({
        check: 'ui-spec-verification',
        path: reviewPath, line: 0,
        message: `could not read FOREMAN_REVIEW.md: ${e.message}`,
      });
      continue;
    }

    // Identify the SPEC folder of this FOREMAN_REVIEW.md (parent dir).
    const specFolder = dirname(reviewPath).replaceAll('\\', '/');
    const specSlug = basename(specFolder);
    const moduleHint = specFolder.includes('/Module 4 - CRM/') ? 'CRM' : specFolder.includes('/modules/') ? 'module' : 'spec';

    // Confirm the staged UI files belong to a SPEC actively closing in the
    // same commit. If no UI file is staged, skip — this avoids false positives
    // when a doc-only follow-up commit reuses an old SPEC folder.
    // (We already checked uiFiles.length > 0 globally.)

    const missing = [];
    for (const rule of EVIDENCE_RULES) {
      if (!containsAny(content, rule.needles)) missing.push(rule);
    }

    if (missing.length === 0) continue;

    for (const rule of missing) {
      violations.push({
        check: 'ui-spec-verification',
        path: reviewPath,
        line: 0,
        message: `Iron Rule 34: FOREMAN_REVIEW.md for ${specSlug} (${moduleHint}) is missing ${rule.name} — ${rule.hint}. Commit also stages ${uiFiles.length} UI file(s) (e.g. ${basename(uiFiles[0])}). SQL-only verification is not sufficient.`,
      });
    }
  }

  return { violations, warnings };
}

// Self-test harness: `node scripts/checks/ui-spec-verification.mjs --test`.
// Exercises 2 cases (missing + present evidence) without touching the repo.
if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}` || process.argv.includes('--test')) {
  const args = process.argv.slice(2);
  if (args.includes('--test')) {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const root = await mkdtemp(join(tmpdir(), 'uispec-'));
    const specDir = join(root, 'modules', 'Module 4 - CRM', 'docs', 'specs', 'TEST_SPEC');
    await import('node:fs/promises').then((m) => m.mkdir(specDir, { recursive: true }));
    const uiFile = join(root, 'modules', 'crm', 'fake.js');
    await import('node:fs/promises').then((m) => m.mkdir(dirname(uiFile), { recursive: true }));
    await writeFile(uiFile, '/* test ui file */', 'utf8');
    // Case 1: FOREMAN_REVIEW.md MISSING evidence → should produce violations
    const reviewBad = join(specDir, 'FOREMAN_REVIEW.md');
    await writeFile(reviewBad, '# Some closure with no Chrome evidence.', 'utf8');
    let r1 = await uiSpecVerification([uiFile, reviewBad]);
    const ok1 = r1.violations.length === 3;
    // Case 2: FOREMAN_REVIEW.md WITH evidence → should pass clean
    await writeFile(reviewBad, '# Closure\n\nVerified via Chrome MCP. Saved screenshot at _archive/.../verification/modal.png. window.__modalTrace dump in modal_trace.json.', 'utf8');
    let r2 = await uiSpecVerification([uiFile, reviewBad]);
    const ok2 = r2.violations.length === 0;
    // Case 3: no UI files staged → skip silently
    let r3 = await uiSpecVerification([reviewBad]);
    const ok3 = r3.violations.length === 0;
    await rm(root, { recursive: true, force: true });
    if (ok1 && ok2 && ok3) {
      console.log('ui-spec-verification self-test: PASS (3/3 cases)');
      process.exit(0);
    } else {
      console.error('ui-spec-verification self-test: FAIL', { ok1, ok2, ok3, r1, r2, r3 });
      process.exit(1);
    }
  }
}
