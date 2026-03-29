#!/usr/bin/env node
/**
 * generate-report.mjs — Read crawled data and generate URL inventory reports.
 * Usage: node generate-report.mjs
 */
import { loadJSON } from './helpers.mjs';
import { writeFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const OUT_DIR = resolve(__dirname, '..');

// --- Load all data files ---
async function loadAllData() {
  const data = {};
  const files = [
    ['postsHe', 'wp-posts-he.json'], ['pagesHe', 'wp-pages-he.json'],
    ['categoriesHe', 'wp-categories-he.json'], ['tagsHe', 'wp-tags-he.json'],
    ['postsEn', 'wp-posts-en.json'], ['pagesEn', 'wp-pages-en.json'],
    ['postsRu', 'wp-posts-ru.json'], ['pagesRu', 'wp-pages-ru.json'],
    ['wcProducts', 'wc-products.json'], ['wcCategories', 'wc-categories.json'],
    ['wcTags', 'wc-tags.json'], ['wcAttributes', 'wc-attributes.json'],
  ];
  for (const [key, file] of files) {
    data[key] = (await loadJSON(resolve(DATA_DIR, file))) || [];
  }
  return data;
}

// --- Build unified URL list ---
function buildUrlList(data) {
  const urls = [];
  const addItems = (items, source) => {
    for (const item of items) {
      urls.push({
        url: item.url || '',
        path: item.path || '',
        lang: item.lang || 'he',
        type: item.pageType || source,
        title: item.title || item.name || '',
        status: item.status || 'publish',
        hasMeta: !!(item.seo?.metaTitle || item.seo?.metaDesc),
        seoPlugin: item.seo?.plugin || 'none',
        wordCount: item.content?.wordCount || 0,
        imageCount: item.content?.imageCount || 0,
        categories: Array.isArray(item.categories)
          ? item.categories.map(c => typeof c === 'object' ? c.name : c).join(', ')
          : '',
        source,
      });
    }
  };

  addItems(data.postsHe, 'wp-posts');
  addItems(data.pagesHe, 'wp-pages');
  addItems(data.postsEn, 'wp-posts');
  addItems(data.pagesEn, 'wp-pages');
  addItems(data.postsRu, 'wp-posts');
  addItems(data.pagesRu, 'wp-pages');
  addItems(data.wcProducts, 'wc-products');

  for (const cat of data.wcCategories) {
    urls.push({
      url: cat.url || '', path: cat.path || '', lang: 'he',
      type: 'product-category', title: cat.name || '', status: 'publish',
      hasMeta: false, seoPlugin: 'none', wordCount: 0, imageCount: cat.image ? 1 : 0,
      categories: '', source: 'wc-categories',
    });
  }
  return urls;
}

// --- Generate url-inventory.json ---
function generateInventoryJson(urls, data) {
  const byLang = { he: [], en: [], ru: [] };
  const byType = {};
  for (const u of urls) {
    (byLang[u.lang] || []).push(u);
    byType[u.type] = (byType[u.type] || 0) + 1;
  }
  const warnings = [];
  for (const u of urls) {
    if (!u.hasMeta) warnings.push({ url: u.url, issue: 'missing-meta', lang: u.lang });
    if (u.wordCount < 50 && u.type !== 'product-category')
      warnings.push({ url: u.url, issue: 'thin-content', wordCount: u.wordCount, lang: u.lang });
  }
  return {
    summary: {
      totalUrls: urls.length,
      byLanguage: { he: byLang.he.length, en: byLang.en.length, ru: byLang.ru.length },
      byType,
      generatedAt: new Date().toISOString(),
    },
    urlPatterns: Object.entries(byType).map(([type, count]) => ({ type, count })),
    pages: urls,
    warnings,
  };
}

// --- Generate url-inventory.md ---
function generateInventoryMd(inventory) {
  const s = inventory.summary;
  const lines = [
    '# URL Inventory — Prizma Optic', '',
    `> Generated: ${s.generatedAt}`, '',
    '## Summary', '',
    `- **Total URLs:** ${s.totalUrls}`,
    `- **Hebrew:** ${s.byLanguage.he}`,
    `- **English:** ${s.byLanguage.en}`,
    `- **Russian:** ${s.byLanguage.ru}`, '',
    '## URL Patterns', '',
    '| Type | Count |', '|------|-------|',
  ];
  for (const p of inventory.urlPatterns) {
    lines.push(`| ${p.type} | ${p.count} |`);
  }

  // Per-language detail
  for (const lang of ['he', 'en', 'ru']) {
    const langName = { he: 'Hebrew', en: 'English', ru: 'Russian' }[lang];
    const langPages = inventory.pages.filter(p => p.lang === lang);
    if (langPages.length === 0) continue;
    lines.push('', `## ${langName} (${langPages.length} URLs)`, '');
    lines.push('| Path | Type | Title | Meta | Words |', '|------|------|-------|------|-------|');
    for (const p of langPages.slice(0, 100)) {
      const meta = p.hasMeta ? 'Yes' : 'No';
      const title = (p.title || '').slice(0, 50);
      lines.push(`| ${p.path} | ${p.type} | ${title} | ${meta} | ${p.wordCount} |`);
    }
    if (langPages.length > 100) lines.push(`| ... | ... | (${langPages.length - 100} more) | ... | ... |`);
  }

  // Critical pages
  lines.push('', '## Critical Pages (Homepage + Landing)', '');
  const critical = inventory.pages.filter(p =>
    p.type === 'homepage' || p.type === 'landing-page' || p.path === '/');
  if (critical.length) {
    lines.push('| URL | Type | Title |', '|-----|------|-------|');
    for (const p of critical) lines.push(`| ${p.url} | ${p.type} | ${p.title} |`);
  } else {
    lines.push('No critical pages found.');
  }

  // SEO health
  const noMeta = inventory.warnings.filter(w => w.issue === 'missing-meta').length;
  const thin = inventory.warnings.filter(w => w.issue === 'thin-content').length;
  lines.push('', '## SEO Health', '',
    `- **Missing meta tags:** ${noMeta} pages`,
    `- **Thin content (<50 words):** ${thin} pages`,
    `- **Total warnings:** ${inventory.warnings.length}`, '');

  // Recommendations
  lines.push('## Recommendations', '',
    '1. Review all pages with missing meta tags',
    '2. Add content to thin pages or consider noindex',
    '3. Ensure canonical URLs are consistent across languages',
    '4. Map old URLs to new Astro paths before launch',
    '5. Set up 301 redirects for all changed URLs', '');

  return lines.join('\n');
}

// --- Generate CSV ---
function generateCsv(urls) {
  const BOM = '\uFEFF';
  const header = 'old_url,old_path,lang,type,title,status,has_meta,new_path,action,priority,notes';
  const rows = urls.map(u => {
    const title = `"${(u.title || '').replace(/"/g, '""')}"`;
    const action = u.type === 'homepage' || u.type === 'landing-page' ? 'keep' : 'pending';
    let priority = 'medium';
    if (u.type === 'homepage' || u.type === 'landing-page') priority = 'critical';
    else if (u.type === 'product') priority = 'high';
    else if (u.type === 'blog-post') priority = 'medium';
    else if (u.type === 'product-category') priority = 'high';
    else priority = 'low';
    return [
      `"${u.url}"`, `"${u.path}"`, u.lang, u.type, title,
      u.status, u.hasMeta ? 'yes' : 'no', '', action, priority, '',
    ].join(',');
  });
  return BOM + header + '\n' + rows.join('\n') + '\n';
}

// --- Main ---
async function main() {
  console.log('Loading data files...');
  const data = await loadAllData();

  const counts = {
    postsHe: data.postsHe.length, pagesHe: data.pagesHe.length,
    postsEn: data.postsEn.length, pagesEn: data.pagesEn.length,
    postsRu: data.postsRu.length, pagesRu: data.pagesRu.length,
    wcProducts: data.wcProducts.length, wcCategories: data.wcCategories.length,
  };
  console.log('Data counts:', counts);

  const totalLoaded = Object.values(counts).reduce((a, b) => a + b, 0);
  if (totalLoaded === 0) {
    console.error('No data files found. Run crawl-wp-api.mjs first.');
    process.exit(1);
  }

  console.log('\nBuilding URL list...');
  const urls = buildUrlList(data);
  console.log(`Total URLs: ${urls.length}`);

  console.log('\nGenerating url-inventory.json...');
  const inventory = generateInventoryJson(urls, data);
  await writeFile(resolve(OUT_DIR, 'url-inventory.json'), JSON.stringify(inventory, null, 2), 'utf-8');

  console.log('Generating url-inventory.md...');
  const md = generateInventoryMd(inventory);
  await writeFile(resolve(OUT_DIR, 'url-inventory.md'), md, 'utf-8');

  console.log('Generating url-mapping-template.csv...');
  const csv = generateCsv(urls);
  await writeFile(resolve(OUT_DIR, 'url-mapping-template.csv'), csv, 'utf-8');

  console.log('\nDone!');
  console.log(`  url-inventory.json — ${inventory.summary.totalUrls} URLs`);
  console.log(`  url-inventory.md   — ${md.split('\n').length} lines`);
  console.log(`  url-mapping-template.csv — ${urls.length} rows`);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
