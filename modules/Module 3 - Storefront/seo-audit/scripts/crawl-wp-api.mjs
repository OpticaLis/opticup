#!/usr/bin/env node
/**
 * crawl-wp-api.mjs — Fetch all content from WordPress + WooCommerce REST APIs.
 * Usage: node crawl-wp-api.mjs <he|en|ru|all>
 */
import {
  config, wpFetch, wcFetch, fetchAllPages, saveJSON, saveProgress, loadProgress,
  extractPath, classifyPageType, stripHtml, countWords, extractSeo, sleep,
} from './helpers.mjs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, '..', 'data');
const PROGRESS_FILE = resolve(DATA_DIR, 'crawl-progress.json');

// --- CLI ---
const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h') || args.length === 0) {
  console.log('Usage: node crawl-wp-api.mjs <he|en|ru|all>');
  console.log('  he  — Hebrew site + WooCommerce products');
  console.log('  en  — English site');
  console.log('  ru  — Russian site');
  console.log('  all — All three sites');
  process.exit(0);
}

const target = args[0].toLowerCase();
const validTargets = ['he', 'en', 'ru', 'all'];
if (!validTargets.includes(target)) {
  console.error(`Invalid target: ${target}. Use: ${validTargets.join(', ')}`);
  process.exit(1);
}

// --- Item normalization ---
function normalizeWpItem(item, wpType, lang) {
  const url = item.link || '';
  const path = extractPath(url);
  return {
    id: item.id,
    url,
    path,
    slug: item.slug || '',
    title: stripHtml(item.title?.rendered || ''),
    pageType: classifyPageType(path, wpType),
    status: item.status || 'publish',
    seo: extractSeo(item),
    content: {
      wordCount: countWords(item.content?.rendered || ''),
      imageCount: (item.content?.rendered || '').match(/<img /gi)?.length || 0,
    },
    categories: item.categories || [],
    images: item._embedded?.['wp:featuredmedia']?.[0]?.source_url
      ? [item._embedded['wp:featuredmedia'][0].source_url]
      : [],
    date: item.date || '',
    modified: item.modified || '',
    lang,
  };
}

function normalizeWcProduct(item) {
  const url = item.permalink || '';
  const path = extractPath(url);
  return {
    id: item.id,
    url,
    path,
    slug: item.slug || '',
    title: stripHtml(item.name || ''),
    pageType: 'product',
    status: item.status || 'publish',
    seo: extractSeo(item),
    content: {
      wordCount: countWords(item.description || ''),
      shortDescWordCount: countWords(item.short_description || ''),
      imageCount: (item.images || []).length,
    },
    categories: (item.categories || []).map(c => ({ id: c.id, name: c.name, slug: c.slug })),
    images: (item.images || []).map(img => img.src),
    price: item.price || '',
    regularPrice: item.regular_price || '',
    sku: item.sku || '',
    date: item.date_created || '',
    modified: item.date_modified || '',
    lang: 'he',
  };
}

function normalizeWcCategory(item) {
  return {
    id: item.id,
    name: item.name || '',
    slug: item.slug || '',
    url: item.link || (item.slug ? `${config.domains.he}/product-category/${item.slug}/` : ''),
    path: extractPath(item.link || ''),
    pageType: 'product-category',
    parent: item.parent || 0,
    count: item.count || 0,
    image: item.image?.src || '',
    lang: 'he',
  };
}

// --- Crawl functions ---
async function crawlWpSite(lang) {
  const domain = config.domains[lang];
  if (!domain) { console.error(`No domain for lang: ${lang}`); return; }

  console.log(`\n=== Crawling WP: ${domain} (${lang}) ===`);

  // Posts
  console.log('\n--- Posts ---');
  const postsResult = await fetchAllPages(wpFetch, domain, 'posts', { _embed: 1 });
  if (postsResult.error) {
    console.error(`  Posts error: ${postsResult.error}`);
  }
  const posts = (postsResult.data || []).map(p => normalizeWpItem(p, 'post', lang));
  console.log(`  Total posts: ${posts.length}`);
  await saveJSON(resolve(DATA_DIR, `wp-posts-${lang}.json`), posts);

  // Pages
  console.log('\n--- Pages ---');
  const pagesResult = await fetchAllPages(wpFetch, domain, 'pages', { _embed: 1 });
  if (pagesResult.error) {
    console.error(`  Pages error: ${pagesResult.error}`);
  }
  const pages = (pagesResult.data || []).map(p => normalizeWpItem(p, 'page', lang));
  console.log(`  Total pages: ${pages.length}`);
  await saveJSON(resolve(DATA_DIR, `wp-pages-${lang}.json`), pages);

  // Categories + Tags (Hebrew only)
  if (lang === 'he') {
    console.log('\n--- Categories ---');
    const catsResult = await fetchAllPages(wpFetch, domain, 'categories');
    const cats = (catsResult.data || []).map(c => ({
      id: c.id, name: c.name, slug: c.slug, count: c.count, parent: c.parent, lang,
    }));
    console.log(`  Total categories: ${cats.length}`);
    await saveJSON(resolve(DATA_DIR, 'wp-categories-he.json'), cats);

    console.log('\n--- Tags ---');
    const tagsResult = await fetchAllPages(wpFetch, domain, 'tags');
    const tags = (tagsResult.data || []).map(t => ({
      id: t.id, name: t.name, slug: t.slug, count: t.count, lang,
    }));
    console.log(`  Total tags: ${tags.length}`);
    await saveJSON(resolve(DATA_DIR, 'wp-tags-he.json'), tags);
  }

  return { posts: posts.length, pages: pages.length };
}

async function crawlWooCommerce() {
  const domain = config.domains.he;
  if (!config.wcConsumerKey || config.wcConsumerKey === 'REPLACE_ME') {
    console.warn('\n⚠ WooCommerce credentials not set — skipping WC crawl');
    return { products: 0, categories: 0, tags: 0, attributes: 0 };
  }

  console.log(`\n=== Crawling WooCommerce: ${domain} ===`);

  // Products
  console.log('\n--- Products ---');
  const prodResult = await fetchAllPages(wcFetch, domain, 'products', { status: 'any' });
  if (prodResult.error) {
    console.error(`  Products error: ${prodResult.error}`);
  }
  const products = (prodResult.data || []).map(normalizeWcProduct);
  console.log(`  Total products: ${products.length}`);
  await saveJSON(resolve(DATA_DIR, 'wc-products.json'), products);

  // Product Categories
  console.log('\n--- Product Categories ---');
  const pcResult = await fetchAllPages(wcFetch, domain, 'products/categories');
  const prodCats = (pcResult.data || []).map(normalizeWcCategory);
  console.log(`  Total product categories: ${prodCats.length}`);
  await saveJSON(resolve(DATA_DIR, 'wc-categories.json'), prodCats);

  // Product Tags
  console.log('\n--- Product Tags ---');
  const ptResult = await fetchAllPages(wcFetch, domain, 'products/tags');
  const prodTags = (ptResult.data || []).map(t => ({
    id: t.id, name: t.name, slug: t.slug, count: t.count,
  }));
  console.log(`  Total product tags: ${prodTags.length}`);
  await saveJSON(resolve(DATA_DIR, 'wc-tags.json'), prodTags);

  // Attributes
  console.log('\n--- Attributes ---');
  const attrResult = await wcFetch(domain, 'products/attributes');
  const attrs = attrResult.data || [];
  console.log(`  Total attributes: ${attrs.length}`);
  await saveJSON(resolve(DATA_DIR, 'wc-attributes.json'), attrs);

  return {
    products: products.length,
    categories: prodCats.length,
    tags: prodTags.length,
    attributes: attrs.length,
  };
}

// --- Main ---
async function main() {
  const progress = (await loadProgress(PROGRESS_FILE)) || {};
  const langs = target === 'all' ? ['he', 'en', 'ru'] : [target];

  for (const lang of langs) {
    try {
      const wpStats = await crawlWpSite(lang);
      progress[lang] = { ...wpStats, crawledAt: new Date().toISOString() };

      if (lang === 'he') {
        const wcStats = await crawlWooCommerce();
        progress.woocommerce = { ...wcStats, crawledAt: new Date().toISOString() };
      }
    } catch (err) {
      console.error(`\nFATAL error for ${lang}: ${err.message}`);
      progress[lang] = { error: err.message, crawledAt: new Date().toISOString() };
    }
    await saveProgress(PROGRESS_FILE, progress);
  }

  console.log('\n=== Crawl Summary ===');
  console.log(JSON.stringify(progress, null, 2));
  console.log('\nDone. Files saved to:', DATA_DIR);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
