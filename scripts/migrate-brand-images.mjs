#!/usr/bin/env node
// migrate-brand-images.mjs — Moves brand images: tenant-logos → media-library bucket.
// Usage: node scripts/migrate-brand-images.mjs --tenant=demo [--run] [--rollback --from=file.json]
// Requires: $HOME/.optic-up/credentials.env

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import loadEnv from './lib/load-env.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ──────────────────────────────────────────
const env = loadEnv();
const sb = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const args = process.argv.slice(2);
const tenantSlug = args.find(a => a.startsWith('--tenant='))?.split('=')[1];
const dryRun = !args.includes('--run');
const rollbackMode = args.includes('--rollback');
const rollbackFile = args.find(a => a.startsWith('--from='))?.split('=')[1];

const SRC_BUCKET = 'tenant-logos';
const DST_BUCKET = 'media-library';
const LOGO_FOLDER = 'לוגו';
const GALLERY_FOLDER = 'דוגמנים';

// Storefront URL for fetching static logos (from repo's /public/images/brands/)
const STOREFRONT_URL = 'https://prizma-optic.co.il';

// ── Rollback ────────────────────────────────────────
if (rollbackMode) {
  if (!rollbackFile) { console.error('--rollback requires --from=<path>'); process.exit(1); }
  await runRollback(rollbackFile);
  process.exit(0);
}

if (!tenantSlug) {
  console.error('Usage: node migrate-brand-images.mjs --tenant=<slug> [--run]');
  process.exit(1);
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Brand Image Unification — ${dryRun ? '🔍 DRY RUN' : '🚀 LIVE RUN'}`);
console.log(`Tenant: ${tenantSlug}`);
console.log(`${'='.repeat(60)}\n`);

// ── Resolve tenant ──────────────────────────────────
const { data: tenant, error: tErr } = await sb
  .from('tenants').select('id, name, slug').eq('slug', tenantSlug).single();
if (tErr || !tenant) { console.error('Tenant not found:', tenantSlug, tErr?.message); process.exit(1); }
const tid = tenant.id;
console.log(`Tenant: ${tenant.name} (${tid})\n`);

// ── Load brands (exclude_website IS NOT TRUE = null OR false) ──
// Two queries needed: Supabase JS has no IS NOT TRUE filter
const { data: b1, error: bErr } = await sb.from('brands').select('id, name, logo_url, brand_gallery')
  .eq('tenant_id', tid).eq('is_deleted', false).eq('active', true).is('exclude_website', null).order('name');
const { data: b2 } = await sb.from('brands').select('id, name, logo_url, brand_gallery')
  .eq('tenant_id', tid).eq('is_deleted', false).eq('active', true).eq('exclude_website', false).order('name');
const brandMap = new Map();
for (const b of [...(b1 || []), ...(b2 || [])]) brandMap.set(b.id, b);
const allBrands = [...brandMap.values()];
if (bErr && !allBrands.length) { console.error('Failed to load brands:', bErr.message); process.exit(1); }

const brandsWithImages = allBrands.filter(b => b.logo_url || (b.brand_gallery && b.brand_gallery.length));
console.log(`Brands total: ${allBrands.length}, with images: ${brandsWithImages.length}\n`);

// ── Backup ──────────────────────────────────────────
const backupData = brandsWithImages.map(b => ({
  id: b.id, name: b.name, logo_url: b.logo_url, brand_gallery: b.brand_gallery
}));
const backupPath = join(__dirname, '..', 'modules', 'Module 3 - Storefront', 'backups',
  `brands_pre_unification_${new Date().toISOString().slice(0, 10)}.json`);

if (!dryRun) {
  writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
  console.log(`Backup saved: ${backupPath}\n`);
} else {
  console.log(`[DRY] Would save backup to: ${backupPath}\n`);
}

// ── Migration counters ──────────────────────────────
let logosMigrated = 0, galleriesMigrated = 0, staticLogos = 0, errors = 0;
const mediaInserts = [];
const brandUpdates = [];

// ── Process each brand ──────────────────────────────
for (const brand of brandsWithImages) {
  console.log(`\n── ${brand.name} ──`);
  let newLogoRef = null;
  let newGalleryRefs = [];

  // --- LOGO ---
  if (brand.logo_url) {
    try {
      newLogoRef = await migrateLogo(brand);
    } catch (err) {
      console.error(`  ✗ Logo error: ${err.message}`);
      errors++;
    }
  }

  // --- GALLERY ---
  if (brand.brand_gallery && brand.brand_gallery.length) {
    for (const galleryUrl of brand.brand_gallery) {
      try {
        const ref = await migrateGalleryImage(brand, galleryUrl);
        if (ref) newGalleryRefs.push(ref);
      } catch (err) {
        console.error(`  ✗ Gallery error: ${err.message}`);
        errors++;
      }
    }
  }

  // Prepare update
  const update = { id: brand.id };
  if (newLogoRef) update.logo_url = newLogoRef;
  if (newGalleryRefs.length) update.brand_gallery = newGalleryRefs;
  if (newLogoRef || newGalleryRefs.length) brandUpdates.push(update);
}

// ── Apply DB updates ────────────────────────────────
console.log(`\n${'='.repeat(60)}`);
console.log('Summary:');
console.log(`  Logos migrated: ${logosMigrated} (${staticLogos} from static files)`);
console.log(`  Gallery images migrated: ${galleriesMigrated}`);
console.log(`  Media library rows to insert: ${mediaInserts.length}`);
console.log(`  Brand rows to update: ${brandUpdates.length}`);
console.log(`  Errors: ${errors}`);
console.log(`${'='.repeat(60)}\n`);

if (dryRun) {
  console.log('🔍 DRY RUN complete — no changes made. Add --run to execute.\n');
  process.exit(0);
}

if (errors > 0) {
  console.log('⚠️  Errors occurred. Review above. Proceeding with successful migrations...\n');
}

// Insert media_library rows
console.log(`Inserting ${mediaInserts.length} media_library rows...`);
for (const row of mediaInserts) {
  const { error } = await sb.from('media_library').insert(row);
  if (error) {
    console.error(`  ✗ Insert failed for ${row.filename}: ${error.message}`);
  }
}

// Update brands
console.log(`Updating ${brandUpdates.length} brands...`);
for (const upd of brandUpdates) {
  const updatePayload = {};
  if (upd.logo_url) updatePayload.logo_url = upd.logo_url;
  if (upd.brand_gallery) updatePayload.brand_gallery = upd.brand_gallery;

  const { error } = await sb.from('brands')
    .update(updatePayload)
    .eq('id', upd.id)
    .eq('tenant_id', tid);
  if (error) {
    console.error(`  ✗ Update failed for brand ${upd.id}: ${error.message}`);
  }
}

console.log('\n✅ Migration complete!\n');

// ═══════════════════════════════════════════════════════
// Helper functions
// ═══════════════════════════════════════════════════════

async function migrateLogo(brand) {
  const url = brand.logo_url;
  const isStatic = url.startsWith('/images/');
  const isStorage = url.includes('tenant-logos');

  if (isStatic) {
    return await migrateStaticLogo(brand, url);
  } else if (isStorage) {
    return await migrateStorageLogo(brand, url);
  } else {
    console.log(`  ⚠ Unknown logo format: ${url.substring(0, 60)}...`);
    return null;
  }
}

async function migrateStaticLogo(brand, localPath) {
  // Fetch from live storefront
  const fullUrl = STOREFRONT_URL + localPath;
  console.log(`  Logo (static): ${localPath}`);

  if (dryRun) {
    console.log(`  [DRY] Would fetch ${fullUrl} → media/${tid}/${LOGO_FOLDER}/...`);
    staticLogos++; logosMigrated++;
    return `${DST_BUCKET}/media/${tid}/${LOGO_FOLDER}/${sanitizeFilename(brand.name)}.png`;
  }

  const response = await fetch(fullUrl);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${fullUrl}`);
  const blob = await response.arrayBuffer();
  const buffer = new Uint8Array(blob);

  const filename = `${sanitizeFilename(brand.name)}.png`;
  const storagePath = `media/${tid}/${LOGO_FOLDER}/${filename}`;

  const { error } = await sb.storage.from(DST_BUCKET).upload(storagePath, buffer, {
    contentType: 'image/png', upsert: true
  });
  if (error) throw error;

  mediaInserts.push(makeMediaRow(tid, filename, localPath.split('/').pop(), storagePath, 'image/png', buffer.length, LOGO_FOLDER, brand.id));

  staticLogos++; logosMigrated++;
  console.log(`  ✓ Uploaded to ${storagePath}`);
  return `${DST_BUCKET}/${storagePath}`;
}

async function migrateStorageLogo(brand, publicUrl) {
  // Extract storage path from public URL
  const pathMatch = publicUrl.match(/tenant-logos\/(.+)$/);
  if (!pathMatch) throw new Error(`Cannot parse storage path from: ${publicUrl}`);
  const srcPath = pathMatch[1];

  console.log(`  Logo (storage): ${srcPath.substring(0, 50)}...`);

  const filename = `${sanitizeFilename(brand.name)}.png`;
  const dstPath = `media/${tid}/${LOGO_FOLDER}/${filename}`;

  if (dryRun) {
    console.log(`  [DRY] Would copy ${SRC_BUCKET}/${srcPath} → ${DST_BUCKET}/${dstPath}`);
    logosMigrated++;
    return `${DST_BUCKET}/${dstPath}`;
  }

  // Download from source bucket
  const { data, error: dlErr } = await sb.storage.from(SRC_BUCKET).download(srcPath);
  if (dlErr) throw dlErr;
  const buffer = new Uint8Array(await data.arrayBuffer());

  // Upload to destination bucket
  const { error: ulErr } = await sb.storage.from(DST_BUCKET).upload(dstPath, buffer, {
    contentType: 'image/png', upsert: true
  });
  if (ulErr) throw ulErr;

  mediaInserts.push(makeMediaRow(tid, filename, srcPath.split('/').pop(), dstPath, 'image/png', buffer.length, LOGO_FOLDER, brand.id));

  logosMigrated++;
  console.log(`  ✓ Uploaded to ${dstPath}`);
  return `${DST_BUCKET}/${dstPath}`;
}

async function migrateGalleryImage(brand, galleryUrl) {
  // Gallery URLs are full public URLs to tenant-logos bucket
  const pathMatch = galleryUrl.match(/tenant-logos\/(.+)$/);
  if (!pathMatch) {
    console.log(`  ⚠ Unknown gallery format: ${galleryUrl.substring(0, 60)}...`);
    return null;
  }
  const srcPath = pathMatch[1];
  const srcFilename = srcPath.split('/').pop(); // e.g. 1775565535664_ljz4.webp

  const dstFilename = `${sanitizeFilename(brand.name)}_${srcFilename}`;
  const dstPath = `media/${tid}/${GALLERY_FOLDER}/${dstFilename}`;

  console.log(`  Gallery: ${srcFilename}`);

  if (dryRun) {
    console.log(`  [DRY] Would copy ${SRC_BUCKET}/${srcPath} → ${DST_BUCKET}/${dstPath}`);
    galleriesMigrated++;
    return `${DST_BUCKET}/${dstPath}`;
  }

  const { data, error: dlErr } = await sb.storage.from(SRC_BUCKET).download(srcPath);
  if (dlErr) throw dlErr;
  const buffer = new Uint8Array(await data.arrayBuffer());

  const { error: ulErr } = await sb.storage.from(DST_BUCKET).upload(dstPath, buffer, {
    contentType: 'image/webp', upsert: true
  });
  if (ulErr) throw ulErr;

  mediaInserts.push(makeMediaRow(tid, dstFilename, srcFilename, dstPath, 'image/webp', buffer.length, GALLERY_FOLDER, brand.id));

  galleriesMigrated++;
  console.log(`  ✓ Uploaded to ${dstPath}`);
  return `${DST_BUCKET}/${dstPath}`;
}

function makeMediaRow(tenantId, filename, originalFilename, storagePath, mimeType, fileSize, folder, brandId) {
  return {
    tenant_id: tenantId,
    filename,
    original_filename: originalFilename,
    storage_path: storagePath,
    mime_type: mimeType,
    file_size: fileSize,
    folder,
    tags: [folder === LOGO_FOLDER ? 'brand-logo' : 'brand-gallery', brandId],
    uploaded_by: 'system-migration'
  };
}

function sanitizeFilename(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9א-ת\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Rollback ────────────────────────────────────────
async function runRollback(filePath) {
  const fullPath = filePath.startsWith('/') ? filePath : join(__dirname, '..', filePath);
  if (!existsSync(fullPath)) { console.error('Backup file not found:', fullPath); process.exit(1); }

  const backup = JSON.parse(readFileSync(fullPath, 'utf-8'));
  console.log(`Rolling back ${backup.length} brands from ${filePath}...\n`);

  // Resolve tenant from first brand
  const { data: brand0 } = await sb.from('brands').select('tenant_id').eq('id', backup[0].id).single();
  if (!brand0) { console.error('Cannot resolve tenant from backup'); process.exit(1); }

  for (const b of backup) {
    const { error } = await sb.from('brands')
      .update({ logo_url: b.logo_url, brand_gallery: b.brand_gallery })
      .eq('id', b.id)
      .eq('tenant_id', brand0.tenant_id);
    if (error) {
      console.error(`  ✗ Rollback failed for ${b.name}: ${error.message}`);
    } else {
      console.log(`  ✓ ${b.name} restored`);
    }
  }
  console.log('\n✅ Rollback complete. Note: files in media-library bucket were NOT deleted.\n');
}
