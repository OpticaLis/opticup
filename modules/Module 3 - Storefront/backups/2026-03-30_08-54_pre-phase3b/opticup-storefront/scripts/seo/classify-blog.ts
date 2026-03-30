/**
 * Phase 3A Step 4 — Blog Post Classification & i18n Mapping
 * Maps all blog posts across 3 languages with cross-language links.
 *
 * Output: blog-mapping.json, blog-mapping-report.md, blog-images-to-download.json
 * Run: npx tsx scripts/seo/classify-blog.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, 'output');
const DATA_DIR = resolve(__dirname, '../../../opticup/modules/Module 3 - Storefront/seo-audit/data');
mkdirSync(OUTPUT_DIR, { recursive: true });

interface WpPost {
  id: number;
  url: string;
  path: string;
  slug: string;
  title: string;
  pageType: string;
  status: string;
  seo: {
    plugin: string;
    metaTitle: string;
    metaDesc: string;
    canonical: string;
    ogImage: string;
    schemaType: string;
  };
  content: { wordCount: number; imageCount: number };
  categories: number[];
  images: string[];
  date: string;
  modified: string;
  lang: string;
}

interface BlogMapping {
  id: number;
  slug: string;
  lang: string;
  title: string;
  wpUrl: string;
  wpPath: string;
  astroUrl: string;
  date: string;
  modified: string;
  wordCount: number;
  imageCount: number;
  seo: {
    title: string;
    description: string;
    ogImage: string | null;
  };
  categories: number[];
  translations: {
    he: string | null;
    en: string | null;
    ru: string | null;
  };
}

function main() {
  console.log('=== Blog Classification & i18n Mapping ===\n');

  // Load posts
  const hePosts: WpPost[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'wp-posts-he.json'), 'utf8'));
  const enPosts: WpPost[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'wp-posts-en.json'), 'utf8'));
  const ruPosts: WpPost[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'wp-posts-ru.json'), 'utf8'));

  console.log(`HE posts: ${hePosts.length}, EN posts: ${enPosts.length}, RU posts: ${ruPosts.length}`);

  // Load WP categories for cross-referencing
  let wpCategories: any[] = [];
  try {
    wpCategories = JSON.parse(readFileSync(resolve(DATA_DIR, 'wp-categories-he.json'), 'utf8'));
  } catch { /* ignore */ }

  // Build ID-based lookup for translation matching
  // WordPress WPML links translations by similar slugs or explicit translation groups
  // Since we don't have explicit translation links, match by: similar titles, or position-based
  // Actually, in WPML, translated posts often share similar slugs or have translation metadata
  // Without that, we'll try to match by title similarity and slug patterns

  const allPosts = [
    ...hePosts.map(p => ({ ...p, lang: 'he' as const })),
    ...enPosts.map(p => ({ ...p, lang: 'en' as const })),
    ...ruPosts.map(p => ({ ...p, lang: 'ru' as const })),
  ];

  // Create blog mappings
  const mappings: BlogMapping[] = [];
  const imageUrls = new Set<string>();

  for (const post of allPosts) {
    const decodedSlug = decodeURIComponent(post.slug);

    // Determine Astro URL
    let astroUrl: string;
    if (post.lang === 'he') {
      // HE posts live at root level
      astroUrl = `/${post.slug}/`;
    } else {
      // EN/RU posts live under /en/ or /ru/
      astroUrl = `/${post.lang}/${post.slug}/`;
    }

    // Collect image URLs for download
    if (post.seo?.ogImage) imageUrls.add(post.seo.ogImage);
    if (post.images) post.images.forEach(img => { if (img) imageUrls.add(img); });

    mappings.push({
      id: post.id,
      slug: post.slug,
      lang: post.lang,
      title: post.title,
      wpUrl: post.url,
      wpPath: post.path,
      astroUrl,
      date: post.date,
      modified: post.modified,
      wordCount: post.content?.wordCount || 0,
      imageCount: post.content?.imageCount || 0,
      seo: {
        title: post.seo?.metaTitle || post.title,
        description: post.seo?.metaDesc || '',
        ogImage: post.seo?.ogImage || null,
      },
      categories: post.categories || [],
      translations: { he: null, en: null, ru: null },
    });
  }

  // Try to link translations
  // Strategy: match by title similarity or shared categories + similar date
  const heMap = mappings.filter(m => m.lang === 'he');
  const enMap = mappings.filter(m => m.lang === 'en');
  const ruMap = mappings.filter(m => m.lang === 'ru');

  // Simple approach: match EN/RU to HE by position (WPML often preserves order)
  // Also try by categories overlap
  for (const hePost of heMap) {
    hePost.translations.he = hePost.astroUrl;

    // Find EN translation (same categories + closest date)
    const enMatch = enMap.find(en =>
      en.categories.length > 0 &&
      hePost.categories.length > 0 &&
      en.categories.some(c => hePost.categories.includes(c))
    );
    // Simple: try finding by index position as WPML often orders them the same
  }

  // For now, set self-references and leave cross-lang as null
  // (Will be refined in Phase 3B when we have actual content to compare)
  for (const m of mappings) {
    m.translations[m.lang] = m.astroUrl;
  }

  // Stats
  const stats = {
    total: mappings.length,
    he: heMap.length,
    en: enMap.length,
    ru: ruMap.length,
    uniqueImages: imageUrls.size,
    withSeoTitle: mappings.filter(m => m.seo.title && m.seo.title !== m.title).length,
    withSeoDesc: mappings.filter(m => m.seo.description).length,
  };

  console.log('\n=== Results ===');
  console.log(`Total posts: ${stats.total} (HE: ${stats.he}, EN: ${stats.en}, RU: ${stats.ru})`);
  console.log(`Unique images to download: ${stats.uniqueImages}`);
  console.log(`Posts with SEO title: ${stats.withSeoTitle}`);
  console.log(`Posts with SEO description: ${stats.withSeoDesc}`);

  // Write blog mapping
  writeFileSync(resolve(OUTPUT_DIR, 'blog-mapping.json'), JSON.stringify({ stats, mappings }, null, 2));
  console.log('\nWritten: scripts/seo/output/blog-mapping.json');

  // Write images to download
  const imageList = [...imageUrls].filter(url => url && url.startsWith('http')).map(url => ({
    url,
    filename: url.split('/').pop() || 'unknown.jpg',
  }));
  writeFileSync(resolve(OUTPUT_DIR, 'blog-images-to-download.json'), JSON.stringify({
    total: imageList.length,
    images: imageList,
  }, null, 2));
  console.log(`Written: scripts/seo/output/blog-images-to-download.json (${imageList.length} images)`);

  // Write report
  const report = `# Blog Mapping Report

Generated: ${new Date().toISOString()}

## Stats

| Metric | Value |
|--------|-------|
| Total blog posts | ${stats.total} |
| Hebrew posts | ${stats.he} |
| English posts | ${stats.en} |
| Russian posts | ${stats.ru} |
| Unique images | ${stats.uniqueImages} |
| Posts with SEO meta title | ${stats.withSeoTitle} |
| Posts with SEO description | ${stats.withSeoDesc} |

## Hebrew Posts (${stats.he}) — Root Level URLs

| Date | Title | URL |
|------|-------|-----|
${heMap.sort((a, b) => b.date.localeCompare(a.date)).map(m => `| ${m.date.split('T')[0]} | ${m.title} | \`${m.astroUrl}\` |`).join('\n')}

## English Posts (${stats.en}) — /en/[slug]/

| Date | Title | URL |
|------|-------|-----|
${enMap.sort((a, b) => b.date.localeCompare(a.date)).map(m => `| ${m.date.split('T')[0]} | ${m.title} | \`${m.astroUrl}\` |`).join('\n')}

## Russian Posts (${stats.ru}) — /ru/[slug]/

| Date | Title | URL |
|------|-------|-----|
${ruMap.sort((a, b) => b.date.localeCompare(a.date)).map(m => `| ${m.date.split('T')[0]} | ${m.title} | \`${m.astroUrl}\` |`).join('\n')}

## Images to Download

${imageList.length} unique images identified for download in Phase 3B.
`;

  writeFileSync(resolve(OUTPUT_DIR, 'blog-mapping-report.md'), report);
  console.log('Written: scripts/seo/output/blog-mapping-report.md');
}

main();
