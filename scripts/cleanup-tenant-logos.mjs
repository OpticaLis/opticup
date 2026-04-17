#!/usr/bin/env node
// cleanup-tenant-logos.mjs — Deletes brand-related files from the old tenant-logos bucket
// after they have been migrated to media-library.
// Usage: node scripts/cleanup-tenant-logos.mjs [--run]
// Requires: $HOME/.optic-up/credentials.env

import { createClient } from '@supabase/supabase-js';
import loadEnv from './lib/load-env.mjs';

const env = loadEnv();
const sb = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const dryRun = !process.argv.includes('--run');
const SRC_BUCKET = 'tenant-logos';
const TENANT_ID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'; // prizma
const BRANDS_PREFIX = `brands/${TENANT_ID}`;

console.log(`\n${'='.repeat(60)}`);
console.log(`Cleanup tenant-logos — ${dryRun ? '🔍 DRY RUN' : '🚀 LIVE RUN'}`);
console.log(`Bucket: ${SRC_BUCKET}`);
console.log(`Prefix: ${BRANDS_PREFIX}`);
console.log(`${'='.repeat(60)}\n`);

// List all files under brands/{tenant_id}/
const allFiles = [];

async function listRecursive(prefix) {
  const { data, error } = await sb.storage.from(SRC_BUCKET).list(prefix, {
    limit: 1000,
    sortBy: { column: 'name', order: 'asc' }
  });

  if (error) {
    console.error(`  Error listing ${prefix}:`, error.message);
    return;
  }

  for (const item of data || []) {
    const fullPath = `${prefix}/${item.name}`;
    if (item.id) {
      // It's a file
      allFiles.push(fullPath);
    } else {
      // It's a folder — recurse
      await listRecursive(fullPath);
    }
  }
}

console.log('Scanning bucket...\n');
await listRecursive(BRANDS_PREFIX);

console.log(`Found ${allFiles.length} files to delete:\n`);

// Group by brand folder for readability
const byFolder = {};
for (const f of allFiles) {
  const parts = f.split('/');
  const brandFolder = parts.slice(0, 3).join('/'); // brands/{tid}/{brand_uuid}
  if (!byFolder[brandFolder]) byFolder[brandFolder] = [];
  byFolder[brandFolder].push(f);
}

for (const [folder, files] of Object.entries(byFolder)) {
  console.log(`  ${folder}/ — ${files.length} file(s)`);
  for (const f of files) {
    const filename = f.split('/').pop();
    console.log(`    ${filename}`);
  }
}

if (dryRun) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 DRY RUN — ${allFiles.length} files would be deleted. Add --run to execute.`);
  console.log(`${'='.repeat(60)}\n`);
  process.exit(0);
}

// Delete in batches of 100 (Supabase limit)
console.log(`\nDeleting ${allFiles.length} files...`);
let deleted = 0, errors = 0;

for (let i = 0; i < allFiles.length; i += 100) {
  const batch = allFiles.slice(i, i + 100);
  const { error } = await sb.storage.from(SRC_BUCKET).remove(batch);
  if (error) {
    console.error(`  ✗ Batch error: ${error.message}`);
    errors += batch.length;
  } else {
    deleted += batch.length;
    console.log(`  ✓ Deleted batch ${Math.floor(i/100) + 1} (${batch.length} files)`);
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`Results: ${deleted} deleted, ${errors} errors`);
console.log(`${'='.repeat(60)}\n`);
