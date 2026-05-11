#!/usr/bin/env node
// Sketch Revision Batch 3 — Hybrid+Navy re-skin transformer
// Authored 2026-05-11 for SPEC M1_5_SKETCH_RESKIN_BATCH_3
// Run: node reskin.mjs <file1> [<file2> ...]
//
// Per-file pipeline:
//   1. Read.
//   2. Locate the `:root{ ... }` block inside the <style>.
//   3. Replace it with the canonical Hybrid+Navy token block + backward-compat
//      legacy aliases (so every existing `var(--purple)` / `var(--soft)` etc.
//      resolves to the right Hybrid value without touching the rest of the file).
//   4. Sweep dark-background uses of --purple-deep → --accent (so headers stay
//      dark+white per Brief §2.2 — the alias points purple-deep at text-primary
//      slate, which would yield a slate header rather than Navy).
//   5. Sweep inline hex literals (#26215C, #534AB7, #EEEDFE) to Hybrid hex.
//   6. Sweep inline --purple-mid → --accent-hover.
//   7. Write.
//
// Structure preservation: no DOM edits, no inline-content edits, no JS edits.

import { readFile, writeFile } from 'node:fs/promises';

const NEW_ROOT = `:root{
    /* === Hybrid+Navy canonical tokens (Batch 3 re-skin, 2026-05-11) === */
    --bg-page:#fafaf7; --bg-surface:#ffffff; --bg-surface-alt:#f4f4f5;
    --accent:#1e3a8a; --accent-hover:#1e40af; --accent-soft:#e6f1fb; --accent-text:#ffffff;
    --text-primary:#0f172a; --text-secondary:#475569; --text-tertiary:#94a3b8;
    --border-subtle:#e2e8f0; --border-default:#cbd5e1; --border-strong-token:#94a3b8;
    --success:#16a34a; --success-soft:#d1fae5;
    --warning:#d97706; --warning-soft:#fef3c7;
    --danger:#dc2626;  --danger-soft:#fee2e2;
    --info:#0891b2;    --info-soft:#cffafe;
    --font-sans:"Inter","Heebo",system-ui,-apple-system,"Segoe UI",Arial,sans-serif;

    /* === Backward-compat aliases (legacy var names resolve to Hybrid values) === */
    --bg:var(--bg-page); --surface:var(--bg-surface); --soft:var(--bg-surface-alt);
    --border:var(--border-subtle); --border-strong:var(--border-default);
    --text:var(--text-primary); --text-2:var(--text-secondary); --text-3:var(--text-tertiary);
    --purple:var(--accent); --purple-soft:var(--accent-soft);
    --purple-deep:var(--text-primary); --purple-mid:var(--accent-hover);
    /* Decorative legacy multi-colors → mapped to semantic equivalents */
    --teal:var(--success); --teal-soft:var(--success-soft); --teal-deep:var(--success); --teal-mid:var(--success);
    --amber:var(--warning); --amber-soft:var(--warning-soft); --amber-deep:var(--warning); --amber-mid:var(--warning-soft);
    --blue:var(--info);    --blue-soft:var(--info-soft);     --blue-deep:var(--info);
    --coral:var(--danger); --coral-soft:var(--danger-soft);
    --pink:var(--accent-soft);
    --green:var(--success); --green-soft:var(--success-soft);
    --gray:var(--text-secondary); --gray-soft:var(--bg-surface-alt);
    --red:var(--danger); --red-soft:var(--danger-soft);
    --r-md:6px; --r-lg:10px;
  }`;

// Light-reskin neutral swaps for files that DON'T use the legacy purple palette
// (e.g. M12 channel-themed mockups). Per Brief §2.4 we preserve semantic colors
// (WhatsApp green, SMS blue, Email red, transactional/marketing badges, etc.)
// and only realign the neutral foundation (bg / text / border / decorative gold).
const NEUTRAL_TOKEN_SWAPS = [
  ['--bg: #f5f6f8',       '--bg: #fafaf7'],   // page bg → Hybrid bg-page
  ['--bg: #ece5dd',       '--bg: #ece5dd'],   // WhatsApp chat bg — preserved (semantic)
  ['--text: #111b21',     '--text: #0f172a'],  // body text → Hybrid text-primary
  ['--text-muted: #667781','--text-muted: #475569'], // muted → Hybrid text-secondary
  ['--border: #e5e7eb',   '--border: #e2e8f0'], // border → Hybrid border-subtle
  ['--border: #e9edef',   '--border: #e2e8f0'], // WhatsApp variant
  ['--gold: #c9a555',     '--gold: #1e3a8a'],   // decorative gold → Navy accent
  ['--gold-dark: #a98740','--gold-dark: #1e40af'], // gold hover → accent-hover
];

async function reskin(file) {
  const before = await readFile(file, 'utf8');
  const beforeLines = before.split('\n').length;

  // Locate :root block (allowing optional whitespace before `{`)
  const m = before.match(/:root\s*\{/);
  if (!m) throw new Error(`No :root block found in ${file}`);
  const idx = m.index;
  let depth = 0;
  let end = -1;
  for (let i = idx; i < before.length; i++) {
    const ch = before[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { end = i + 1; break; }
    }
  }
  if (end < 0) throw new Error(`Unbalanced :root block in ${file}`);

  const rootBlock = before.slice(idx, end);
  const hasLegacyPurple = /--purple/.test(rootBlock) || /#26215[Cc]|#534[Aa][Bb]7/.test(rootBlock);

  let out;
  let mode;
  if (hasLegacyPurple) {
    // Heavy re-skin: full :root replacement + sweeps (legacy purple palette files)
    mode = 'heavy';
    out = before.slice(0, idx) + NEW_ROOT + before.slice(end);

    // Sweep dark-background uses of --purple-deep → --accent so dark headers
    // stay Navy (alias points purple-deep at slate text-primary, which would
    // render as a slate header instead of Navy per Brief §2.2).
    out = out.replace(/(background[^;{}]*?)var\(--purple-deep\)/g,
      (mm, head) => head + 'var(--accent)');

    // Inline hex literals.
    out = out.replace(/#26215C/gi, '#1e3a8a');
    out = out.replace(/#534AB7/gi, '#1e3a8a');
    out = out.replace(/#7F77DD/gi, '#1e40af');
    out = out.replace(/#EEEDFE/gi, '#e6f1fb');
    out = out.replace(/#CECBF6/gi, '#cbd5e1');
    out = out.replace(/#B7B0FF/gi, '#cbd5e1');
  } else {
    // Light re-skin: targeted neutral-only swaps inside :root (M12 channel-
    // themed files — Brief §2.4 mandates preserving semantic colors).
    mode = 'light';
    let newRoot = rootBlock;
    for (const [from, to] of NEUTRAL_TOKEN_SWAPS) {
      if (from === to) continue;
      newRoot = newRoot.split(from).join(to);
    }
    out = before.slice(0, idx) + newRoot + before.slice(end);
  }
  await writeFile(file, out, 'utf8');
  const afterLines = out.split('\n').length;
  return {
    file,
    mode,
    bytesBefore: before.length,
    bytesAfter: out.length,
    linesBefore: beforeLines,
    linesAfter: afterLines,
    deltaPct: (((afterLines - beforeLines) / beforeLines) * 100).toFixed(2),
  };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: node reskin.mjs <file1> [<file2> ...]');
  process.exit(1);
}

const results = [];
for (const f of files) {
  try {
    const r = await reskin(f);
    results.push(r);
    console.log(`  ✅ [${r.mode}] ${r.file}`);
    console.log(`     ${r.linesBefore} → ${r.linesAfter} lines (Δ ${r.deltaPct}%), ${r.bytesBefore} → ${r.bytesAfter} bytes`);
  } catch (err) {
    console.error(`  ❌ ${f}: ${err.message}`);
    process.exit(2);
  }
}

console.log(`\nDone. ${results.length} file(s) re-skinned.`);
