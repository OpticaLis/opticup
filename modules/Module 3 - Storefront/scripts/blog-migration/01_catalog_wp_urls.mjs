/**
 * 01_catalog_wp_urls.mjs
 * ─────────────────────
 * Read-only scan of blog_posts.content for all unique WordPress image URLs
 * pointing to prizma-optic.co.il. Writes _catalog.json with:
 *   { url, filename, sanitizedFilename, ext, mimeType, storagePath, contentUrl }
 *
 * Also logs unique <a href> links to the same domain (for rewrite in script 04).
 *
 * Run: node 01_catalog_wp_urls.mjs
 * Output: ./_catalog.json
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL
  || 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU';
const PRIZMA_UUID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
const IMG_REGEX = /https?:\/\/(?:www\.)?prizma-optic\.co\.il[^"' >]+\.(?:jpg|jpeg|png|gif|webp|svg)[^"' >]*/gi;
const HREF_REGEX = /href=["']https?:\/\/(?:www\.)?prizma-optic\.co\.il[^"']+["']/gi;

// ── Hebrew transliteration ───────────────────────────────────────────────────
const HE_MAP = {
  'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'h','ט':'t',
  'י':'y','כ':'k','ך':'k','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s',
  'ע':'a','פ':'p','ף':'p','צ':'ts','ץ':'ts','ק':'k','ר':'r','ש':'sh','ת':'t',
};

function transliterateHebrew(str) {
  return str.split('').map(c => HE_MAP[c] || c).join('');
}

function sanitizeFilename(raw) {
  // URL-decode, transliterate Hebrew, lowercase, keep alphanum+dash+dot
  let s = decodeURIComponent(raw);
  s = transliterateHebrew(s);
  s = s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_.]/g, '').replace(/-+/g, '-');
  return s;
}

function extFromUrl(url) {
  const m = url.match(/\.(\w+)(?:\?|$)/);
  return m ? m[1].toLowerCase() : 'jpg';
}

function mimeFromExt(ext) {
  const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml' };
  return map[ext] || 'image/jpeg';
}

// ── Main ─────────────────────────────────────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const { data: posts, error } = await sb
  .from('blog_posts')
  .select('id, lang, slug, content')
  .eq('tenant_id', PRIZMA_UUID)
  .eq('is_deleted', false)
  .eq('status', 'published')
  .not('content', 'is', null);

if (error) { console.error('DB error:', error.message); process.exit(1); }

const imgUrlSet = new Set();
const hrefSet = new Set();

for (const post of posts) {
  const imgMatches = post.content.match(IMG_REGEX) || [];
  imgMatches.forEach(u => imgUrlSet.add(u));
  const hrefMatches = post.content.match(HREF_REGEX) || [];
  hrefMatches.forEach(h => hrefSet.add(h));
}

const catalog = [];
for (const url of imgUrlSet) {
  const rawFilename = url.split('/').pop().split('?')[0];
  const sanitized = sanitizeFilename(rawFilename);
  const ext = extFromUrl(rawFilename);
  const storagePath = `media/${PRIZMA_UUID}/blog/${sanitized}`;
  const contentUrl = `/api/image/${storagePath}`;
  catalog.push({ url, rawFilename, sanitizedFilename: sanitized, ext,
    mimeType: mimeFromExt(ext), storagePath, contentUrl });
}

catalog.sort((a, b) => a.url.localeCompare(b.url));

const output = { generatedAt: new Date().toISOString(), prizma_uuid: PRIZMA_UUID,
  imgCount: catalog.length, hrefCount: hrefSet.size,
  hrefs: Array.from(hrefSet), images: catalog };

const outPath = join(__dirname, '_catalog.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`✓ Cataloged ${catalog.length} unique WP image URLs → ${outPath}`);
console.log(`  WP href links found: ${hrefSet.size}`);
catalog.forEach(c => console.log(`  ${c.url} → ${c.contentUrl}`));
