/**
 * 03_upload_to_media_library.mjs
 * ──────────────────────────────
 * For each downloaded image:
 *   (a) Dedup check: SHA-256 hash + original_filename query against media_library
 *   (b) If existing row found → REUSE storage_path (no upload, no new row)
 *   (c) If not found → upload to media-library bucket + INSERT media_library row
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in env OR falls back to pin-auth demo JWT
 *           (for storage upload only; media_library INSERT requires service role).
 *
 * Run after: 02_download_wp_images.mjs
 * Run: SUPABASE_SERVICE_ROLE_KEY=<key> node 03_upload_to_media_library.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '_catalog.json');
const DOWNLOADS_DIR = join(__dirname, '_downloads');

const SUPABASE_URL = process.env.SUPABASE_URL
  || 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || null;
const PRIZMA_UUID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
const BUCKET = 'media-library';

if (!existsSync(CATALOG_PATH)) {
  console.error('ERROR: _catalog.json not found.'); process.exit(1);
}
const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
const downloadResults = catalog.downloadResults || catalog.images;

// ── Auth ──────────────────────────────────────────────────────────────────────
let uploadToken = SERVICE_KEY;
if (!uploadToken) {
  console.log('No SERVICE_ROLE_KEY — falling back to pin-auth demo JWT for storage...');
  const anonSb = createClient(SUPABASE_URL, ANON_KEY);
  const { data } = await anonSb.functions.invoke('pin-auth', { body: { pin: '12345', slug: 'demo' } });
  uploadToken = data?.token;
  if (!uploadToken) { console.error('ERROR: Could not obtain auth token.'); process.exit(1); }
  console.log('  Demo JWT obtained (role: authenticated)');
}

const storageSb = createClient(SUPABASE_URL, ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${uploadToken}` } }
});
const dbSb = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY)
  : storageSb; // fallback (will fail RLS for tenant-isolated writes)

// ── Main ──────────────────────────────────────────────────────────────────────
const dedupResults = [];

for (const img of downloadResults) {
  if (img.downloadStatus === 'skipped_already_404') {
    console.log(`  SKIP (404): ${img.rawFilename}`);
    dedupResults.push({ ...img, migrationStatus: 'skipped_already_404', newContentUrl: null });
    continue;
  }
  if (img.downloadStatus === 'skipped_error') {
    console.log(`  SKIP (error): ${img.rawFilename}`);
    dedupResults.push({ ...img, migrationStatus: 'skipped_error', newContentUrl: null });
    continue;
  }

  const localPath = img.localPath || join(DOWNLOADS_DIR, img.sanitizedFilename);
  if (!existsSync(localPath)) {
    console.log(`  SKIP (not downloaded): ${img.sanitizedFilename}`);
    dedupResults.push({ ...img, migrationStatus: 'skipped_error', newContentUrl: null });
    continue;
  }

  const fileBytes = readFileSync(localPath);
  const sha256 = createHash('sha256').update(fileBytes).digest('hex');

  // ── Dedup check ──────────────────────────────────────────────────────────
  process.stdout.write(`  Dedup check: ${img.sanitizedFilename} ... `);
  const { data: existing } = await dbSb
    .from('media_library')
    .select('id, storage_path, original_filename')
    .eq('tenant_id', PRIZMA_UUID)
    .eq('folder', 'blog')
    .eq('is_deleted', false)
    .or(`original_filename.eq.${img.rawFilename},storage_path.eq.${img.storagePath}`)
    .limit(1);

  if (existing && existing.length > 0) {
    console.log(`REUSE (${existing[0].id})`);
    dedupResults.push({ ...img, migrationStatus: 'reused', sha256,
      reuseRowId: existing[0].id, newContentUrl: `/api/image/${existing[0].storage_path}` });
    continue;
  }

  // ── Upload to Storage ────────────────────────────────────────────────────
  process.stdout.write(`upload ... `);
  const { data: uploadData, error: uploadErr } = await storageSb.storage
    .from(BUCKET)
    .upload(img.storagePath, fileBytes, { contentType: img.mimeType, upsert: false });

  if (uploadErr && uploadErr.message !== 'The resource already exists') {
    console.log(`UPLOAD FAILED: ${uploadErr.message}`);
    dedupResults.push({ ...img, migrationStatus: 'skipped_error', err: uploadErr.message });
    continue;
  }
  if (uploadErr && uploadErr.message === 'The resource already exists') {
    console.log(`storage obj exists → reuse path`);
    // Still need a media_library row check
  }

  // ── Insert media_library row ──────────────────────────────────────────────
  process.stdout.write(`db insert ... `);
  const { data: inserted, error: insertErr } = await dbSb
    .from('media_library')
    .insert({
      tenant_id: PRIZMA_UUID,
      filename: img.sanitizedFilename,
      original_filename: img.rawFilename,
      storage_path: img.storagePath,
      mime_type: img.mimeType,
      file_size: fileBytes.length,
      folder: 'blog',
      alt_text: '',
      title: '',
      description: '',
      tags: [],
      uploaded_by: 'blog-migration-2026-04-15',
      is_deleted: false,
    })
    .select('id')
    .single();

  if (insertErr) {
    console.log(`DB FAILED: ${insertErr.message}`);
    dedupResults.push({ ...img, migrationStatus: 'skipped_error', err: insertErr.message, sha256 });
    continue;
  }

  console.log(`OK → ${inserted.id}`);
  dedupResults.push({ ...img, migrationStatus: 'uploaded', sha256,
    mediaLibraryId: inserted.id, newContentUrl: `/api/image/${img.storagePath}` });
}

// ── Summary ───────────────────────────────────────────────────────────────────
catalog.dedupResults = dedupResults;
writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));

const uploaded = dedupResults.filter(r => r.migrationStatus === 'uploaded');
const reused = dedupResults.filter(r => r.migrationStatus === 'reused');
const skip404 = dedupResults.filter(r => r.migrationStatus === 'skipped_already_404');
const skipErr = dedupResults.filter(r => r.migrationStatus === 'skipped_error');

console.log(`\n✓ Migration done:`);
console.log(`  uploaded:              ${uploaded.length}`);
console.log(`  reused:                ${reused.length}`);
console.log(`  skipped_already_404:   ${skip404.length}`);
console.log(`  skipped_error:         ${skipErr.length}`);
console.log(`\nURL mapping written to _catalog.json (dedupResults)`);
