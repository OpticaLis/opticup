#!/usr/bin/env node
/**
 * compress-product-images.mjs — T7 of OVERNIGHT_M1_M3_BURNDOWN.
 *
 * Compresses Prizma's 27 media-library/products/ images to ~200-300 KB each
 * via 1200px max + WebP q80. Backup-first, per-row verification.
 *
 * Pattern per file:
 *   1. Download original from media-library.
 *   2. Upload backup to products-backup-2026-04-26/<same-name> (skip if already exists).
 *   3. Compress with sharp.
 *   4. Upload compressed to NEW path (using media_library.id as filename for stability).
 *   5. Verify the upload (HEAD).
 *   6. UPDATE media_library SET storage_path, file_size, updated_at WHERE id = ?.
 *   7. SELECT to verify.
 *   8. Log + continue. On any per-file error: log + skip that file.
 *
 * Originals are NOT deleted by this script. Daniel must explicitly authorize
 * the delete step in a separate run (per T7 activation-prompt constraint).
 *
 * Usage:
 *   node scripts/compress-product-images.mjs --dry-run    # plan only, no writes
 *   node scripts/compress-product-images.mjs              # execute
 *
 * Exit: 0 = success (all 27 processed or skipped), 2 = abort (env / setup)
 */

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import loadEnv from './lib/load-env.mjs';

const PRIZMA_TENANT = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
const BUCKET = 'media-library';
const BACKUP_PREFIX = `media/${PRIZMA_TENANT}/products-backup-2026-04-26`;
const PRODUCTS_PREFIX = `media/${PRIZMA_TENANT}/products`;

const TARGET_MAX_DIMENSION = 1200;
const WEBP_QUALITY = 80;

const DRY_RUN = process.argv.includes('--dry-run');

function fail(msg) { console.error(`[T7] ABORT: ${msg}`); process.exit(2); }

async function main() {
  const env = loadEnv();
  const sb = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  console.log(`[T7] mode: ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE'}`);
  console.log(`[T7] tenant: ${PRIZMA_TENANT} (Prizma)`);
  console.log(`[T7] target: ${TARGET_MAX_DIMENSION}px max, WebP q${WEBP_QUALITY}`);
  console.log('');

  // 1. Fetch the 27 media_library rows
  const { data: rows, error } = await sb
    .from('media_library')
    .select('id, storage_path, file_size, original_filename')
    .eq('tenant_id', PRIZMA_TENANT)
    .eq('is_deleted', false)
    .like('storage_path', `${PRODUCTS_PREFIX}/%`)
    .order('file_size', { ascending: false });

  if (error) fail(`media_library query failed: ${error.message}`);
  if (!rows?.length) fail('No rows found — aborting.');

  console.log(`[T7] found ${rows.length} candidate files`);

  let processed = 0, skipped = 0, errors = 0;
  let bytesBefore = 0, bytesAfter = 0;

  for (const row of rows) {
    const originalPath = row.storage_path;
    const filename = originalPath.split('/').pop();  // e.g. "Yohji_Yamamoto_12_1776437433699.webp"
    const backupPath = `${BACKUP_PREFIX}/${filename}`;
    // New compressed path uses media_library.id for stable referencing
    const newPath = `${PRODUCTS_PREFIX}/${row.id}.webp`;

    bytesBefore += row.file_size || 0;
    const sizeKb = Math.round((row.file_size || 0) / 1024);

    console.log(`\n[${processed + skipped + errors + 1}/${rows.length}] ${filename} (${sizeKb} KB)`);
    console.log(`  id: ${row.id}`);

    try {
      // 2. Download original
      console.log(`  → downloading original`);
      const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(originalPath);
      if (dlErr) throw new Error(`download failed: ${dlErr.message}`);
      const buf = Buffer.from(await blob.arrayBuffer());
      console.log(`  → got ${buf.length} bytes`);

      // 3. Backup (idempotent — check first)
      const { data: existingBackup } = await sb.storage
        .from(BUCKET)
        .list(BACKUP_PREFIX, { search: filename });
      const alreadyBackedUp = existingBackup?.some(f => f.name === filename);

      if (alreadyBackedUp) {
        console.log(`  → backup already present at ${backupPath}`);
      } else if (DRY_RUN) {
        console.log(`  → [dry-run] WOULD upload backup to ${backupPath}`);
      } else {
        const { error: bkErr } = await sb.storage.from(BUCKET).upload(backupPath, buf, {
          contentType: 'image/webp', upsert: false
        });
        if (bkErr) throw new Error(`backup upload failed: ${bkErr.message}`);
        console.log(`  → backup uploaded to ${backupPath}`);
      }

      // 4. Compress with sharp
      console.log(`  → compressing (${TARGET_MAX_DIMENSION}px max, WebP q${WEBP_QUALITY})`);
      const compressed = await sharp(buf)
        .resize({ width: TARGET_MAX_DIMENSION, height: TARGET_MAX_DIMENSION, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      const newSizeKb = Math.round(compressed.length / 1024);
      const reduction = Math.round((1 - compressed.length / buf.length) * 100);
      console.log(`  → compressed: ${compressed.length} bytes (${newSizeKb} KB, ${reduction}% smaller)`);

      bytesAfter += compressed.length;

      // 5. Upload compressed to new path
      if (DRY_RUN) {
        console.log(`  → [dry-run] WOULD upload compressed to ${newPath}`);
        console.log(`  → [dry-run] WOULD update media_library row to point to new path`);
        skipped++;
        continue;
      }

      const { error: upErr } = await sb.storage.from(BUCKET).upload(newPath, compressed, {
        contentType: 'image/webp', upsert: true
      });
      if (upErr) throw new Error(`compressed upload failed: ${upErr.message}`);
      console.log(`  → uploaded compressed to ${newPath}`);

      // 6. Verify upload — list with search
      const { data: listed } = await sb.storage
        .from(BUCKET)
        .list(PRODUCTS_PREFIX, { search: `${row.id}.webp` });
      const verified = listed?.find(f => f.name === `${row.id}.webp`);
      if (!verified) throw new Error('upload verify failed — file not found in listing');
      console.log(`  → verified upload (size in listing: ${verified.metadata?.size ?? 'n/a'})`);

      // 7. Update DB row
      const { error: updErr } = await sb
        .from('media_library')
        .update({
          storage_path: newPath,
          file_size: compressed.length,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
        .eq('tenant_id', PRIZMA_TENANT);
      if (updErr) throw new Error(`media_library update failed: ${updErr.message}`);
      console.log(`  → updated media_library row`);

      // 8. Verify the update
      const { data: check } = await sb
        .from('media_library')
        .select('storage_path, file_size')
        .eq('id', row.id)
        .single();
      if (check?.storage_path !== newPath) throw new Error(`row update verify failed: storage_path = ${check?.storage_path}`);
      console.log(`  → row update verified ✓`);

      processed++;
    } catch (err) {
      console.error(`  ✗ FAILED: ${err.message}`);
      console.error(`  ✗ skipping this file, continuing with next`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`[T7] DONE`);
  console.log(`  Processed (compressed + DB updated): ${processed}`);
  console.log(`  Skipped (dry-run mode, or backup-only): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`  Bytes before: ${(bytesBefore / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Bytes after:  ${(bytesAfter / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Reduction: ${(((bytesBefore - bytesAfter) / bytesBefore) * 100).toFixed(1)}%`);
  console.log('');
  console.log(`[T7] ⚠️  Originals NOT deleted — they remain at media-library/products/<original-name>.webp`);
  console.log(`[T7] ⚠️  Backups at media-library/products-backup-2026-04-26/<original-name>.webp`);
  console.log(`[T7] Daniel must authorize separately to delete originals.`);
}

main().catch(e => fail(e.message));
