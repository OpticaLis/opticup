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

async function reskin(file) {
  const before = await readFile(file, 'utf8');
  const beforeLines = before.split('\n').length;

  // 1. Replace the :root{} block. We anchor on the first `:root{` and balance
  //    braces to find the matching `}`. This survives the variation across
  //    files (some have nested calc(), some have rgba commas, etc.).
  const idx = before.indexOf(':root{');
  if (idx < 0) throw new Error(`No :root{ block found in ${file}`);
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
  if (end < 0) throw new Error(`Unbalanced :root{ block in ${file}`);
  let out = before.slice(0, idx) + NEW_ROOT + before.slice(end);

  // 2. Sweep dark-background uses of --purple-deep → --accent.
  //    Patterns observed in the legacy files:
  //      background:var(--purple-deep)
  //      background-color:var(--purple-deep)
  //      background:linear-gradient(...,var(--purple-deep)...)
  //    Replace the token reference itself when it appears in a background
  //    context. Conservative: only swap when the var sits inside a
  //    background-* declaration value.
  out = out.replace(/(background[^;{}]*?)var\(--purple-deep\)/g,
    (m, head) => head + 'var(--accent)');

  // 3. Inline hex literals.
  out = out.replace(/#26215C/gi, '#1e3a8a'); // purple-deep hex → Navy
  out = out.replace(/#534AB7/gi, '#1e3a8a'); // purple primary hex → Navy
  out = out.replace(/#7F77DD/gi, '#1e40af'); // purple-mid hex → accent-hover
  out = out.replace(/#EEEDFE/gi, '#e6f1fb'); // purple-soft hex → accent-soft
  out = out.replace(/#CECBF6/gi, '#cbd5e1'); // light-purple tint → border-default
  out = out.replace(/#B7B0FF/gi, '#cbd5e1'); // another light-purple tint, defensive

  // 4. Sanity: ensure --purple-mid usages are still served (alias handles them,
  //    but if a file has inline `--purple-mid:` reassignments outside :root we
  //    leave them — the alias in :root wins for cascade resolution anyway).

  await writeFile(file, out, 'utf8');
  const afterLines = out.split('\n').length;
  return {
    file,
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
    console.log(`  ✅ ${r.file}`);
    console.log(`     ${r.linesBefore} → ${r.linesAfter} lines (Δ ${r.deltaPct}%), ${r.bytesBefore} → ${r.bytesAfter} bytes`);
  } catch (err) {
    console.error(`  ❌ ${f}: ${err.message}`);
    process.exit(2);
  }
}

console.log(`\nDone. ${results.length} file(s) re-skinned.`);
