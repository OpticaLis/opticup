/**
 * 05_transliterate_slugs.mjs
 * ──────────────────────────
 * Replaces Hebrew-char slugs on en/ru blog_posts rows with
 * language-appropriate slugs derived from the post title.
 *
 * Strategy:
 *   en: generate URL-safe English slug from title (Latin only)
 *   ru: generate URL-safe Russian slug from title (Cyrillic + Latin)
 *
 * Collision resolution: append -2, -3, … until unique within (lang, tenant).
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in env.
 * Run: SUPABASE_SERVICE_ROLE_KEY=<key> node 05_transliterate_slugs.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL
  || 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PRIZMA_UUID = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c';

if (!SERVICE_KEY) { console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY required.'); process.exit(1); }

const HE_MAP = {
  'א':'a','ב':'b','ג':'g','ד':'d','ה':'h','ו':'v','ז':'z','ח':'h','ט':'t',
  'י':'y','כ':'k','ך':'k','ל':'l','מ':'m','ם':'m','נ':'n','ן':'n','ס':'s',
  'ע':'a','פ':'p','ף':'p','צ':'ts','ץ':'ts','ק':'k','ר':'r','ש':'sh','ת':'t',
};

function transliterateHebrew(str) {
  return str.split('').map(c => HE_MAP[c] || c).join('');
}

function slugify(title, lang) {
  // For both en and ru: normalize, replace special chars, lowercase
  let s = title.trim().toLowerCase();
  if (lang === 'en') {
    // Transliterate any Hebrew, strip non-ASCII except dash
    s = transliterateHebrew(s);
    s = s.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 80);
  } else {
    // ru: allow Cyrillic + Latin + digits + dash
    s = transliterateHebrew(s); // remove Hebrew chars
    s = s.replace(/[^\u0400-\u04FFa-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 80);
  }
  return s.replace(/^-+|-+$/g, '');
}

function hasHebrew(str) { return /[א-ת]/.test(str); }

const sb = createClient(SUPABASE_URL, SERVICE_KEY);

// Fetch all en/ru posts (including is_deleted to check slug collisions)
const { data: allPosts, error } = await sb
  .from('blog_posts')
  .select('id, lang, slug, title, is_deleted')
  .eq('tenant_id', PRIZMA_UUID)
  .in('lang', ['en', 'ru']);

if (error) { console.error('DB error:', error.message); process.exit(1); }

// Build existing slugs per lang for collision checking
const existingSlugs = { en: new Set(), ru: new Set() };
for (const p of allPosts) {
  if (!hasHebrew(p.slug)) existingSlugs[p.lang]?.add(p.slug);
}

const toUpdate = allPosts.filter(p => hasHebrew(p.slug) && !p.is_deleted);
console.log(`Posts with Hebrew slugs: ${toUpdate.length} (en: ${toUpdate.filter(p=>p.lang==='en').length}, ru: ${toUpdate.filter(p=>p.lang==='ru').length})`);

let updatedCount = 0;
const slugChanges = [];

for (const post of toUpdate) {
  let base = slugify(post.title, post.lang);
  if (!base) base = `post-${post.id.substring(0, 8)}`;

  let candidate = base;
  let suffix = 2;
  while (existingSlugs[post.lang]?.has(candidate)) {
    candidate = `${base}-${suffix++}`;
  }

  existingSlugs[post.lang]?.add(candidate);

  const { error: updateErr } = await sb
    .from('blog_posts')
    .update({ slug: candidate, updated_at: new Date().toISOString() })
    .eq('id', post.id)
    .eq('tenant_id', PRIZMA_UUID);

  if (updateErr) {
    console.error(`FAILED: ${post.id}: ${updateErr.message}`);
    process.exit(1);
  }

  updatedCount++;
  slugChanges.push({ id: post.id, lang: post.lang, old: post.slug, new: candidate });
  console.log(`  ✓ ${post.lang}: "${post.slug}" → "${candidate}"`);
}

console.log(`\n✓ Slug transliteration complete: ${updatedCount} posts updated`);
