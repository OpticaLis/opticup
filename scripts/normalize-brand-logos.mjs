#!/usr/bin/env node
// normalize-brand-logos.mjs — Downloads all brand logos from media-library,
// normalizes them (trim + resize + center on 400×200 canvas), re-uploads in place.
// Does NOT change DB records — paths stay the same.
// Usage: node scripts/normalize-brand-logos.mjs [--run]
// Requires: sharp, $HOME/.optic-up/credentials.env

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import loadEnv from './lib/load-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = loadEnv();
const sb = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const dryRun = !process.argv.includes('--run');
const BUCKET = 'media-library';
const TENANT_ID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'; // prizma

// Normalization config (matches normalize-logo.ts)
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 200;
const PADDING_PERCENT = 10;

console.log(`\n${'='.repeat(60)}`);
console.log(`Normalize Brand Logos — ${dryRun ? '🔍 DRY RUN' : '🚀 LIVE RUN'}`);
console.log(`${'='.repeat(60)}\n`);

// Get all brand logos from brands table that have media/ paths
const { data: brands, error: bErr } = await sb
  .from('brands')
  .select('id, name, logo_url')
  .eq('tenant_id', TENANT_ID)
  .eq('is_deleted', false)
  .eq('active', true)
  .like('logo_url', 'media/%');

if (bErr) { console.error('Failed to load brands:', bErr.message); process.exit(1); }

console.log(`Found ${brands.length} brands with media/ logo paths\n`);

let normalized = 0, skipped = 0, errors = 0;

for (const brand of brands) {
  const storagePath = brand.logo_url; // e.g. media/6ad.../logos/cazal.png
  console.log(`  ${brand.name}: ${storagePath}`);

  if (dryRun) {
    console.log(`    [DRY] Would download → normalize → re-upload`);
    normalized++;
    continue;
  }

  try {
    // Download from bucket
    const { data, error: dlErr } = await sb.storage.from(BUCKET).download(storagePath);
    if (dlErr) throw dlErr;
    const originalBuffer = Buffer.from(await data.arrayBuffer());
    const originalMeta = await sharp(originalBuffer).metadata();

    // Already normalized? Check dimensions
    if (originalMeta.width === CANVAS_WIDTH && originalMeta.height === CANVAS_HEIGHT) {
      console.log(`    ⊘ Already ${CANVAS_WIDTH}×${CANVAS_HEIGHT} — skipping`);
      skipped++;
      continue;
    }

    // Step 1: Trim transparent/white borders
    let trimmedBuffer;
    try {
      trimmedBuffer = await sharp(originalBuffer).trim({ threshold: 30 }).toBuffer();
    } catch {
      trimmedBuffer = originalBuffer;
    }

    // Step 2: Calculate target size with padding
    const paddingX = Math.round(CANVAS_WIDTH * PADDING_PERCENT / 100);
    const paddingY = Math.round(CANVAS_HEIGHT * PADDING_PERCENT / 100);
    const innerWidth = CANVAS_WIDTH - (paddingX * 2);
    const innerHeight = CANVAS_HEIGHT - (paddingY * 2);

    // Step 3: Resize to fit inside inner area (maintain aspect ratio)
    const resized = await sharp(trimmedBuffer)
      .resize(innerWidth, innerHeight, {
        fit: 'inside',
        withoutEnlargement: false,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .toBuffer();

    const resizedMeta = await sharp(resized).metadata();

    // Step 4: Center on transparent canvas
    const topPad = Math.round((CANVAS_HEIGHT - (resizedMeta.height || 0)) / 2);
    const bottomPad = CANVAS_HEIGHT - (resizedMeta.height || 0) - topPad;
    const leftPad = Math.round((CANVAS_WIDTH - (resizedMeta.width || 0)) / 2);
    const rightPad = CANVAS_WIDTH - (resizedMeta.width || 0) - leftPad;

    const normalizedBuf = await sharp(resized)
      .extend({
        top: Math.max(0, topPad),
        bottom: Math.max(0, bottomPad),
        left: Math.max(0, leftPad),
        right: Math.max(0, rightPad),
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png({ quality: 90 })
      .toBuffer();

    // Step 5: Re-upload to same path (overwrite)
    const { error: ulErr } = await sb.storage.from(BUCKET).upload(storagePath, normalizedBuf, {
      contentType: 'image/png',
      upsert: true
    });
    if (ulErr) throw ulErr;

    const sizeBefore = originalBuffer.length;
    const sizeAfter = normalizedBuf.length;
    console.log(`    ✓ ${originalMeta.width}×${originalMeta.height} → ${CANVAS_WIDTH}×${CANVAS_HEIGHT} (${Math.round(sizeBefore/1024)}KB → ${Math.round(sizeAfter/1024)}KB)`);
    normalized++;

  } catch (err) {
    console.error(`    ✗ Error: ${err.message}`);
    errors++;
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${normalized} normalized, ${skipped} already OK, ${errors} errors`);
console.log(`${'='.repeat(60)}\n`);

if (dryRun) {
  console.log('🔍 DRY RUN — add --run to execute.\n');
}
