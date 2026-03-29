import 'dotenv/config';
import fetch from 'node-fetch';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { dirname } from 'path';

// --- Config ---
export const config = {
  wpUser: process.env.WP_USER || 'daniel_725',
  wpAppPassword: process.env.WP_APP_PASSWORD || '',
  wcConsumerKey: process.env.WC_CONSUMER_KEY || '',
  wcConsumerSecret: process.env.WC_CONSUMER_SECRET || '',
  domains: {
    he: process.env.WP_DOMAIN_HE || 'https://prizma-optic.co.il',
    en: process.env.WP_DOMAIN_EN || 'https://en.prizma-optic.co.il',
    ru: process.env.WP_DOMAIN_RU || 'https://ru.prizma-optic.co.il',
  },
  perPage: 100,
  maxRetries: 3,
  delayMs: 500,
};

// --- Utilities ---

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, ' ').trim();
}

export function countWords(html) {
  const text = stripHtml(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function extractPath(urlOrObj) {
  if (!urlOrObj) return '/';
  const url = typeof urlOrObj === 'string' ? urlOrObj : urlOrObj.link || urlOrObj.permalink || '';
  try {
    return new URL(url).pathname;
  } catch {
    return url.startsWith('/') ? url : `/${url}`;
  }
}

const LANDING_SLUGS = new Set([
  'משקפי-מולטיפוקל', 'multi', 'lab', 'brands',
  'multifocal-guide', 'מה-זה-מולטיפוקל', 'בלוג',
]);

export function classifyPageType(path, wpType) {
  if (wpType === 'product') return 'product';
  if (wpType === 'post') return 'blog-post';
  if (wpType === 'category') return 'category';
  if (wpType === 'tag') return 'tag';
  if (wpType === 'product_cat') return 'product-category';
  if (wpType === 'product_tag') return 'product-tag';

  if (wpType === 'page') {
    const slug = path.replace(/^\/|\/$/g, '').split('/').pop();
    if (!slug || slug === '') return 'homepage';
    if (LANDING_SLUGS.has(slug)) return 'landing-page';
    return 'page';
  }
  return 'unknown';
}

// --- HTTP helpers ---

function basicAuthHeader() {
  const token = Buffer.from(`${config.wpUser}:${config.wpAppPassword}`).toString('base64');
  return `Basic ${token}`;
}

async function fetchWithRetry(url, options, retries = config.maxRetries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...options, timeout: 30000 });
      if (res.status === 401) {
        return { data: null, status: 401, totalPages: 0, totalItems: 0, error: 'Unauthorized (401)' };
      }
      if (res.status === 404) {
        return { data: null, status: 404, totalPages: 0, totalItems: 0, error: 'Not found (404)' };
      }
      if (res.status === 400) {
        return { data: null, status: 400, totalPages: 0, totalItems: 0, error: 'Bad request (400)' };
      }
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1', 10);
      const totalItems = parseInt(res.headers.get('x-wp-total') || '0', 10);
      return { data, status: res.status, totalPages, totalItems, error: null };
    } catch (err) {
      if (attempt === retries) {
        return { data: null, status: 0, totalPages: 0, totalItems: 0, error: err.message };
      }
      console.warn(`  Retry ${attempt}/${retries}: ${err.message}`);
      await sleep(1000 * attempt);
    }
  }
}

export async function wpFetch(domain, endpoint, params = {}) {
  const url = new URL(`/wp-json/wp/v2/${endpoint}`, domain);
  url.searchParams.set('per_page', String(config.perPage));
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  await sleep(config.delayMs);
  // Try with Basic Auth first; fall back to no-auth for public endpoints
  const result = await fetchWithRetry(url.toString(), {
    headers: { Authorization: basicAuthHeader() },
  });
  if (result.status === 401) {
    console.warn('  Auth failed, retrying without auth (public endpoint)...');
    return fetchWithRetry(url.toString(), {});
  }
  return result;
}

export async function wcFetch(domain, endpoint, params = {}) {
  const url = new URL(`/wp-json/wc/v3/${endpoint}`, domain);
  url.searchParams.set('per_page', String(config.perPage));
  url.searchParams.set('consumer_key', config.wcConsumerKey);
  url.searchParams.set('consumer_secret', config.wcConsumerSecret);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }
  await sleep(config.delayMs);
  return fetchWithRetry(url.toString(), {});
}

export async function fetchAllPages(fetchFn, domain, endpoint, params = {}) {
  const allItems = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const result = await fetchFn(domain, endpoint, { ...params, page });
    if (result.error || !result.data) {
      if (page === 1) return result;
      break;
    }
    allItems.push(...result.data);
    totalPages = result.totalPages;
    console.log(`  Page ${page}/${totalPages} — ${result.data.length} items`);
    page++;
  }
  return { data: allItems, totalItems: allItems.length, totalPages, error: null, status: 200 };
}

// --- File I/O ---

async function ensureDir(filePath) {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
}

export async function saveJSON(filePath, data) {
  await ensureDir(filePath);
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function loadJSON(filePath) {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveProgress(filePath, data) {
  await saveJSON(filePath, { ...data, updatedAt: new Date().toISOString() });
}

export async function loadProgress(filePath) {
  return loadJSON(filePath);
}

// --- SEO extraction ---

export function extractSeo(item) {
  // Yoast SEO
  if (item.yoast_head_json) {
    const y = item.yoast_head_json;
    return {
      plugin: 'yoast',
      metaTitle: y.title || '',
      metaDesc: y.description || '',
      canonical: y.canonical || '',
      ogImage: y.og_image?.[0]?.url || '',
      schemaType: y.schema?.['@graph']?.[0]?.['@type'] || '',
    };
  }
  // RankMath
  if (item.rank_math_title || item.rank_math_description) {
    return {
      plugin: 'rankmath',
      metaTitle: item.rank_math_title || '',
      metaDesc: item.rank_math_description || '',
      canonical: item.rank_math_canonical || '',
      ogImage: item.rank_math_facebook_image || '',
      schemaType: item.rank_math_schema_type || '',
    };
  }
  return { plugin: 'none', metaTitle: '', metaDesc: '', canonical: '', ogImage: '', schemaType: '' };
}
