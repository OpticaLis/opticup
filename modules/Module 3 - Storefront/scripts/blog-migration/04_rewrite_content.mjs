/**
 * 04_rewrite_content.mjs
 * ──────────────────────
 * Rewrites all blog_posts.content that contain WP image URLs or WP href links.
 * For each post:
 *   (a) Replace every <img src="https://prizma-optic.co.il/..."> with the
 *       new /api/image/media/... URL from _catalog.json dedupResults.
 *   (b) Strip (remove href attribute but keep link text) all internal WP <a href>
 *       links → replaces with just the anchor text.
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in env.
 *
 * Run after: 03_upload_to_media_library.mjs
 * Run: SUPABASE_SERVICE_ROLE_KEY=<key> node 04_rewrite_content.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, '_catalog.json');

const SUPABASE_URL = process.env.SUPABASE_URL
  || 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRIZMA_UUID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

if (!SERVICE_KEY) { console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY required.'); process.exit(1); }
if (!existsSync(CATALOG_PATH)) { console.error('ERROR: _catalog.json not found.'); process.exit(1); }

const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf8'));
const dedupResults = catalog.dedupResults;
if (!dedupResults) { console.error('ERROR: Run script 03 first.'); process.exit(1); }

// Build URL replacement map: old WP URL → new /api/image/... URL
const urlMap = new Map();
for (const r of dedupResults) {
  if (r.newContentUrl) urlMap.set(r.url, r.newContentUrl);
}
console.log(`URL map: ${urlMap.size} replacements`);

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Fetch all posts with WP content
const { data: posts, error } = await sb
  .from('blog_posts')
  .select('id, lang, slug, content')
  .eq('tenant_id', PRIZMA_UUID)
  .eq('is_deleted', false)
  .eq('status', 'published');

if (error) { console.error('DB error:', error.message); process.exit(1); }

const affected = posts.filter(p =>
  p.content && (p.content.includes('prizma-optic.co.il'))
);
console.log(`Posts with WP content: ${affected.length}`);

let updatedCount = 0;
let skippedEmpty = 0;

for (const post of affected) {
  let content = post.content;

  // (a) Replace WP image URLs
  for (const [oldUrl, newUrl] of urlMap.entries()) {
    content = content.replaceAll(oldUrl, newUrl);
  }

  // (b) Strip WP <a href> internal links (keep anchor text)
  content = content.replace(
    /<a\s+[^>]*href=["']https?:\/\/(?:www\.)?prizma-optic\.co\.il[^"']*["'][^>]*>(.*?)<\/a>/gis,
    '$1'
  );

  if (content === post.content) {
    // No change (e.g. only href links that were already stripped or 404 images not replaced)
    continue;
  }

  if (content.length < 50) {
    console.error(`STOP: Post ${post.id} content too short after rewrite (${content.length} chars)`);
    process.exit(1);
  }

  const { error: updateErr } = await sb
    .from('blog_posts')
    .update({ content, updated_at: new Date().toISOString() })
    .eq('id', post.id)
    .eq('tenant_id', PRIZMA_UUID);

  if (updateErr) {
    console.error(`FAILED: ${post.id}: ${updateErr.message}`);
    process.exit(1);
  }

  updatedCount++;
  console.log(`  ✓ Updated: ${post.lang}/${post.slug}`);
}

console.log(`\n✓ Content rewrite complete: ${updatedCount} posts updated`);
