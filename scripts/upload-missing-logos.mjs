#!/usr/bin/env node
// upload-missing-logos.mjs — Uploads 10 static logos from local filesystem to media-library bucket.
// Usage: node scripts/upload-missing-logos.mjs [--run]
// Requires: $HOME/.optic-up/credentials.env

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import loadEnv from './lib/load-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = loadEnv();
const sb = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const dryRun = !process.argv.includes('--run');
const DST_BUCKET = 'media-library';
const TENANT_ID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'; // prizma

// Path to storefront's public/images/brands/ on Windows
const LOCAL_BRANDS_DIR = join(__dirname, '..', '..', 'opticup-storefront', 'public', 'images', 'brands');

// The 10 brands whose static logos failed HTTP fetch
const MISSING_LOGOS = [
  { name: 'Alexander McQueen', file: 'alexander-mcqueen.png' },
  { name: 'BALENCIAGA',        file: 'balenciaga.png' },
  { name: 'Bottega Veneta',    file: 'bottega-veneta.png' },
  { name: 'Celine',            file: 'celine.png' },
  { name: 'Dior',              file: 'dior.png' },
  { name: 'Fendi',             file: 'fendi.png' },
  { name: 'Gast',              file: 'gast.png' },
  { name: 'Henry Jullien',     file: 'henry-jullien.png' },
  { name: 'Matsuda',           file: 'matsuda.png' },
  { name: 'Montblanc',         file: 'montblanc.png' },
];

console.log(`\n${'='.repeat(60)}`);
console.log(`Upload Missing Logos — ${dryRun ? '🔍 DRY RUN' : '🚀 LIVE RUN'}`);
console.log(`Local dir: ${LOCAL_BRANDS_DIR}`);
console.log(`${'='.repeat(60)}\n`);

// Verify local directory exists
if (!existsSync(LOCAL_BRANDS_DIR)) {
  console.error(`❌ Local brands directory not found: ${LOCAL_BRANDS_DIR}`);
  console.error('Make sure opticup-storefront repo is alongside opticup.');
  process.exit(1);
}

// Look up brand IDs from DB
const { data: brands, error: bErr } = await sb
  .from('brands').select('id, name')
  .eq('tenant_id', TENANT_ID)
  .eq('is_deleted', false)
  .in('name', MISSING_LOGOS.map(l => l.name));

if (bErr) { console.error('Failed to load brands:', bErr.message); process.exit(1); }

const brandMap = new Map(brands.map(b => [b.name, b.id]));

let uploaded = 0, skipped = 0, errors = 0;

for (const logo of MISSING_LOGOS) {
  const localPath = join(LOCAL_BRANDS_DIR, logo.file);
  const brandId = brandMap.get(logo.name);

  if (!existsSync(localPath)) {
    console.log(`  ⚠ File not found: ${logo.file} — skipping`);
    skipped++;
    continue;
  }

  if (!brandId) {
    console.log(`  ⚠ Brand not found in DB: ${logo.name} — skipping`);
    skipped++;
    continue;
  }

  const sanitized = logo.file.replace('.png', '').toLowerCase();
  const storagePath = `media/${TENANT_ID}/logos/${sanitized}.png`;

  console.log(`  ${logo.name}: ${logo.file} → ${storagePath}`);

  if (dryRun) {
    console.log(`    [DRY] Would upload ${localPath}`);
    uploaded++;
    continue;
  }

  try {
    const buffer = readFileSync(localPath);

    // Upload to storage
    const { error: ulErr } = await sb.storage.from(DST_BUCKET).upload(storagePath, buffer, {
      contentType: 'image/png', upsert: true
    });
    if (ulErr) throw ulErr;

    // Insert media_library row
    const { error: mlErr } = await sb.from('media_library').insert({
      tenant_id: TENANT_ID,
      filename: `${sanitized}.png`,
      original_filename: logo.file,
      storage_path: storagePath,
      mime_type: 'image/png',
      file_size: buffer.length,
      folder: 'logos',
      tags: ['brand-logo', brandId],
      uploaded_by: 'system-migration'
    });
    if (mlErr) console.log(`    ⚠ media_library insert: ${mlErr.message} (file uploaded OK)`);

    // Update brand record
    const { error: brErr } = await sb.from('brands')
      .update({ logo_url: storagePath })
      .eq('id', brandId)
      .eq('tenant_id', TENANT_ID);
    if (brErr) throw brErr;

    uploaded++;
    console.log(`    ✓ Done`);
  } catch (err) {
    console.error(`    ✗ Error: ${err.message}`);
    errors++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${uploaded} uploaded, ${skipped} skipped, ${errors} errors`);
console.log(`${'='.repeat(60)}\n`);

if (dryRun) {
  console.log('🔍 DRY RUN — add --run to execute.\n');
}
