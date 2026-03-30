/**
 * Phase 3A Step 3 — Page Classification Script
 * Classifies all WordPress pages into: KEEP_ROOT, REDIRECT, BUILD_NEW, IGNORE
 *
 * Run: npx tsx scripts/seo/classify-pages.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, 'output');
mkdirSync(OUTPUT_DIR, { recursive: true });

type Classification = 'KEEP_ROOT' | 'REDIRECT_HOME' | 'REDIRECT_PRODUCTS' | 'BUILD_NEW' | 'ALREADY_EXISTS' | 'IGNORE' | 'BRAND_PAGE' | 'BLOG_INDEX';

interface PageClassification {
  path: string;
  title: string;
  lang: string;
  status: string;
  classification: Classification;
  astroUrl: string | null;
  reason: string;
}

// WooCommerce utility pages → redirect to homepage
const WOOCOMMERCE_PAGES = ['/cart/', '/checkout/', '/account/', '/my-account/', '/wishlist/'];

// Brand pages in WordPress → already exist in Astro at /brands/[slug]/
const BRAND_PAGE_SLUGS: Record<string, string> = {
  '/gast/': '/brands/gast/',
  '/john-dalia/': '/brands/john-dalia/',
  '/matsuda/': '/brands/matsuda/',
  '/etniabarcelona/': '/brands/etnia-barcelona/',
  '/bolle/': '/brands/bolle/',
  '/jimmychoo/': '/brands/jimmy-choo/',
  '/celine/': '/brands/celine/',
  '/balenciaga/': '/brands/balenciaga/',
  '/mykita/': '/brands/mykita/',
  '/gucci/': '/brands/gucci/',
  '/fendi/': '/brands/fendi/',
  '/dior/': '/brands/dior/',
  '/dolcegabbana/': '/brands/dolce-gabbana/',
  '/swarovski/': '/brands/swarovski/',
  '/fred/': '/brands/fred/',
  '/moscot/': '/brands/moscot/',
  '/miumiu/': '/brands/miu-miu/',
  '/henryjullien/': '/brands/henry-jullien/',
  '/serengeti/': '/brands/serengeti/',
  '/yohjiyamamoto/': '/brands/yohji-yamamoto/',
  '/kamemannen/': '/brands/kamemannen/',
  '/burberry/': '/brands/burberry/',
  '/oakley/': '/brands/oakley/',
  '/versace/': '/brands/versace/',
  '/cazal/': '/brands/cazal/',
  '/blackfin/': '/brands/blackfin/',
  '/porsche-design/': '/brands/porsche-design/',
  '/prada/': '/brands/prada/',
  '/gotti-switzerland/': '/brands/gotti/',
  '/saint-laurent/': '/brands/saint-laurent/',
  '/talla/': '/brands/talla/',
  '/hublot/': '/brands/hublot/',
  '/tejesta/': '/brands/tejesta/',
  '/vintage-frames/': '/brands/vintage/',
};

// Pages to ignore (internal/test/duplicate/draft)
const IGNORE_PATTERNS = [
  'multisale', 'supersale', 'backup', 'test', 'ariha',
  'brands2', 'general', 'optical-excellence',
  'gsuccessful', 'successful', 'multitestttt',
];

// Static pages to BUILD NEW in Astro
const BUILD_NEW_PAGES: Record<string, { astroUrl: string; lang: string }> = {
  // Hebrew
  '/about/': { astroUrl: '/אודות/', lang: 'he' },
  '/%d7%a6%d7%a8%d7%95-%d7%a7%d7%a9%d7%a8/': { astroUrl: '/צור-קשר/', lang: 'he' },
  '/privacy/': { astroUrl: '/מדיניות-פרטיות/', lang: 'he' },
  '/accessibility/': { astroUrl: '/נגישות/', lang: 'he' },
  '/terms/': { astroUrl: '/terms/', lang: 'he' },
};

function classifyPage(page: { path: string; title: string; lang: string; status: string }): PageClassification {
  const path = decodeURIComponent(page.path).toLowerCase();
  const encodedPath = page.path.toLowerCase();

  const base: Omit<PageClassification, 'classification' | 'astroUrl' | 'reason'> = {
    path: page.path,
    title: page.title,
    lang: page.lang,
    status: page.status,
  };

  // Blog index
  if (path === '/בלוג/' || encodedPath.includes('%d7%91%d7%9c%d7%95%d7%92')) {
    return { ...base, classification: 'BLOG_INDEX', astroUrl: '/בלוג/', reason: 'Blog index — keep same URL' };
  }
  if (path === '/blog/' && page.lang === 'en') {
    return { ...base, classification: 'BLOG_INDEX', astroUrl: '/en/blog/', reason: 'EN blog index' };
  }
  if (encodedPath.includes('%d0%b1%d0%bb%d0%be%d0%b3') && page.lang === 'ru') {
    return { ...base, classification: 'BLOG_INDEX', astroUrl: '/ru/blog/', reason: 'RU blog index' };
  }

  // WooCommerce pages → redirect to homepage
  for (const wc of WOOCOMMERCE_PAGES) {
    if (path.includes(wc.slice(1, -1))) {
      return { ...base, classification: 'REDIRECT_HOME', astroUrl: '/', reason: `WooCommerce page (${wc})` };
    }
  }

  // Shop page → redirect to products
  if (path === '/shop/' || path === '/shop') {
    return { ...base, classification: 'REDIRECT_PRODUCTS', astroUrl: '/products/', reason: 'Shop → products catalog' };
  }
  if (encodedPath === '/shop/' && page.lang !== 'he') {
    return { ...base, classification: 'REDIRECT_PRODUCTS', astroUrl: '/products/', reason: 'Shop → products catalog' };
  }

  // Brand pages → redirect to Astro brand pages
  for (const [wpPath, astroUrl] of Object.entries(BRAND_PAGE_SLUGS)) {
    if (encodedPath === wpPath || path === wpPath) {
      return { ...base, classification: 'BRAND_PAGE', astroUrl, reason: `Brand page → ${astroUrl}` };
    }
  }

  // Ignore patterns (internal/test pages)
  for (const pattern of IGNORE_PATTERNS) {
    if (path.includes(pattern)) {
      return { ...base, classification: 'IGNORE', astroUrl: null, reason: `Internal/test page matching "${pattern}"` };
    }
  }

  // Static pages to build new
  for (const [wpPath, config] of Object.entries(BUILD_NEW_PAGES)) {
    if (encodedPath === wpPath && page.lang === config.lang) {
      return { ...base, classification: 'BUILD_NEW', astroUrl: config.astroUrl, reason: 'Static page — build new in Astro' };
    }
  }
  // EN static pages
  if (page.lang === 'en') {
    if (path === '/about/') return { ...base, classification: 'BUILD_NEW', astroUrl: '/en/about/', reason: 'EN about page' };
    if (path.includes('contact')) return { ...base, classification: 'BUILD_NEW', astroUrl: '/en/contact/', reason: 'EN contact page' };
    if (path === '/privacy/') return { ...base, classification: 'BUILD_NEW', astroUrl: '/en/privacy/', reason: 'EN privacy page' };
    if (path === '/accessibility/') return { ...base, classification: 'BUILD_NEW', astroUrl: '/en/accessibility/', reason: 'EN accessibility page' };
    if (path === '/terms/') return { ...base, classification: 'BUILD_NEW', astroUrl: '/en/terms/', reason: 'EN terms page' };
    if (path === '/lenses/') return { ...base, classification: 'KEEP_ROOT', astroUrl: '/en/lenses/', reason: 'EN lenses page — keep' };
    if (path.includes('eyewear-brands')) return { ...base, classification: 'ALREADY_EXISTS', astroUrl: '/brands/', reason: 'EN brands listing → already exists' };
    if (path.includes('multifocal')) return { ...base, classification: 'KEEP_ROOT', astroUrl: '/en/multifocal-glasses/', reason: 'EN multifocal landing' };
    if (path.includes('shipment') || path.includes('return')) return { ...base, classification: 'BUILD_NEW', astroUrl: '/en/shipping/', reason: 'EN shipping page' };
    if (path.includes('qa')) return { ...base, classification: 'BUILD_NEW', astroUrl: '/en/faq/', reason: 'EN FAQ page' };
    if (path.includes('sales')) return { ...base, classification: 'REDIRECT_HOME', astroUrl: '/en/', reason: 'EN sales page — redirect to home' };
  }

  // RU static pages
  if (page.lang === 'ru') {
    if (path === '/about/' || encodedPath.includes('%d0%be-%d0%bd%d0%b0%d1%81')) return { ...base, classification: 'BUILD_NEW', astroUrl: '/ru/about/', reason: 'RU about page' };
    if (encodedPath.includes('%d1%81%d0%b2%d1%8f%d0%b7%d0%b0%d1%82%d1%8c%d1%81%d1%8f')) return { ...base, classification: 'BUILD_NEW', astroUrl: '/ru/contact/', reason: 'RU contact page' };
    if (path === '/privacy/' || encodedPath.includes('%d0%ba%d0%be%d0%bd%d1%84%d0%b8%d0%b4%d0%b5%d0%bd%d1%86%d0%b8%d0%b0%d0%bb%d1%8c%d0%bd%d0%be%d1%81%d1%82')) return { ...base, classification: 'BUILD_NEW', astroUrl: '/ru/privacy/', reason: 'RU privacy page' };
    if (path === '/accessibility/' || encodedPath.includes('%d0%b4%d0%be%d1%81%d1%82%d1%83%d0%bf%d0%bd%d0%be%d1%81%d1%82')) return { ...base, classification: 'BUILD_NEW', astroUrl: '/ru/accessibility/', reason: 'RU accessibility page' };
    if (path === '/terms/') return { ...base, classification: 'BUILD_NEW', astroUrl: '/ru/terms/', reason: 'RU terms page' };
    if (encodedPath.includes('%d0%bb%d0%b8%d0%bd%d0%b7%d1%8b')) return { ...base, classification: 'KEEP_ROOT', astroUrl: '/ru/lenses/', reason: 'RU lenses page' };
    if (path.includes('multifocal')) return { ...base, classification: 'KEEP_ROOT', astroUrl: '/ru/multifocal/', reason: 'RU multifocal landing' };
    if (encodedPath.includes('%d0%be%d1%82%d0%b3%d1%80%d1%83%d0%b7%d0%ba%d0%b8')) return { ...base, classification: 'BUILD_NEW', astroUrl: '/ru/shipping/', reason: 'RU shipping page' };
    if (encodedPath.includes('%d0%b2%d0%be%d0%bf%d1%80%d0%be%d1%81%d1%8b')) return { ...base, classification: 'BUILD_NEW', astroUrl: '/ru/faq/', reason: 'RU FAQ page' };
    if (path === '/sales/' || encodedPath.includes('%d0%b0%d0%ba%d1%86%d0%b8%d0%b8')) return { ...base, classification: 'REDIRECT_HOME', astroUrl: '/ru/', reason: 'RU sales page — redirect home' };
  }

  // Known HE landing/content pages
  if (page.lang === 'he') {
    if (encodedPath.includes('%d7%9e%d7%a9%d7%a7%d7%a4%d7%99-%d7%9e%d7%95%d7%9c%d7%98%d7%99%d7%a4%d7%95%d7%a7%d7%9c')) {
      return { ...base, classification: 'KEEP_ROOT', astroUrl: page.path, reason: 'HE multifocal landing page' };
    }
    if (encodedPath.includes('%d7%a9%d7%90%d7%9c%d7%95%d7%aa') || encodedPath.includes('faq')) {
      return { ...base, classification: 'BUILD_NEW', astroUrl: page.path, reason: 'FAQ page' };
    }
    if (encodedPath.includes('%d7%9e%d7%a9%d7%9c%d7%95%d7%97%d7%99%d7%9d')) {
      return { ...base, classification: 'BUILD_NEW', astroUrl: page.path, reason: 'Shipping/returns page' };
    }
    if (encodedPath.includes('%d7%a2%d7%93%d7%a9%d7%95%d7%aa')) {
      return { ...base, classification: 'KEEP_ROOT', astroUrl: page.path, reason: 'HE lenses page' };
    }
    if (encodedPath.includes('%d7%9e%d7%99%d7%95%d7%a4%d7%99%d7%94')) {
      return { ...base, classification: 'KEEP_ROOT', astroUrl: page.path, reason: 'HE myopia page' };
    }
    if (path.includes('onsitelab')) {
      return { ...base, classification: 'KEEP_ROOT', astroUrl: '/onsitelab/', reason: 'On-site lab landing page' };
    }
    if (path.includes('prizmaexpress')) {
      return { ...base, classification: 'KEEP_ROOT', astroUrl: '/prizmaexpress/', reason: 'Prizma Express service page' };
    }
    if (encodedPath.includes('%d7%a1%d7%99%d7%9b%d7%95%d7%9d-%d7%a8%d7%9b%d7%99%d7%a9%d7%94')) {
      return { ...base, classification: 'REDIRECT_HOME', astroUrl: '/', reason: 'Purchase summary — WooCommerce page' };
    }
    if (encodedPath.includes('%d7%99%d7%a6%d7%99%d7%a8%d7%aa-%d7%9e%d7%95%d7%a6%d7%a8')) {
      return { ...base, classification: 'IGNORE', astroUrl: null, reason: 'Product creation — internal page' };
    }
    if (encodedPath.includes('%d7%a7%d7%95%d7%a4%d7%97-%d7%9b%d7%9c%d7%9c%d7%99%d7%aa')) {
      return { ...base, classification: 'KEEP_ROOT', astroUrl: page.path, reason: 'Clalit insurance benefits page' };
    }
    // Terms & regulations pages
    if (path.includes('takanon') || path.includes('terms') || path === '/deal/') {
      return { ...base, classification: 'BUILD_NEW', astroUrl: page.path, reason: 'Terms/regulations page' };
    }
    if (path.includes('eventsunsubscribe')) {
      return { ...base, classification: 'IGNORE', astroUrl: null, reason: 'Event unsubscribe — internal' };
    }
  }

  // Catch remaining pages with lang-specific redirects/builds
  if (page.lang === 'en' || page.lang === 'ru') {
    // Any remaining EN/RU pages that share same path as HE
    if (path.includes('prizmaexpress')) {
      return { ...base, classification: 'KEEP_ROOT', astroUrl: `/${page.lang}/prizmaexpress/`, reason: `${page.lang.toUpperCase()} Prizma Express page` };
    }
    if (path.includes('product-creation') || encodedPath.includes('%d1%81%d0%be%d0%b7%d0%b4%d0%b0%d0%bd%d0%b8%d0%b5')) {
      return { ...base, classification: 'IGNORE', astroUrl: null, reason: 'Product creation — internal' };
    }
    if (path.includes('purchase-summary') || encodedPath.includes('%d1%81%d0%b2%d0%be%d0%b4%d0%ba%d0%b0')) {
      return { ...base, classification: 'REDIRECT_HOME', astroUrl: `/${page.lang}/`, reason: 'Purchase summary — WooCommerce' };
    }
    if (path === '/deal/' || path.includes('terms-branches') || path.includes('prizma-express-terms')) {
      return { ...base, classification: 'BUILD_NEW', astroUrl: `/${page.lang}${page.path}`, reason: `${page.lang.toUpperCase()} terms/policy page` };
    }
    // Rules for mobile optics
    if (path.includes('rules-for-servicing') || encodedPath.includes('%d0%bf%d1%80%d0%b0%d0%b2%d0%b8%d0%bb%d0%b0')) {
      return { ...base, classification: 'BUILD_NEW', astroUrl: `/${page.lang}/prizma-express-rules/`, reason: `${page.lang.toUpperCase()} express rules` };
    }
  }

  // Campaign/event pages — various events/campaigns, mostly internal
  if (path.includes('campaign') || path.includes('event') ||
      encodedPath.includes('%d7%a7%d7%9e%d7%a4%d7%99%d7%99%d7%9f') ||
      encodedPath.includes('%d7%90%d7%99%d7%a8%d7%95%d7%a2') ||
      encodedPath.includes('%d7%9e%d7%95%d7%9c%d7%98%d7%99%d7%a4%d7%95%d7%a7%d7%9c-%d7%a8%d7%95%d7%a1%d7%99%d7%aa') ||
      encodedPath.includes('%d7%9e%d7%a2%d7%91%d7%93%d7%aa-%d7%9e%d7%a1%d7%92%d7%95%d7%a8%d7%99%d7%9d-%d7%a8%d7%95%d7%a1%d7%99%d7%aa') ||
      encodedPath.includes('%d1%8d%d0%ba%d1%81%d0%ba%d0%bb%d1%8e%d0%b7%d0%b8%d0%b2%d0%bd%d0%be')) {
    return { ...base, classification: 'REDIRECT_HOME', astroUrl: page.lang === 'he' ? '/' : `/${page.lang}/`, reason: 'Campaign/event page — redirect home' };
  }

  // Fallback: anything remaining is a REVIEW item
  return { ...base, classification: 'IGNORE', astroUrl: null, reason: 'Unclassified — review needed' };
}

function main() {
  console.log('=== Page Classification Script ===\n');

  const inventoryPath = resolve(__dirname, '../../../opticup/modules/Module 3 - Storefront/seo-audit/url-inventory.json');
  const urlInventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const pages = urlInventory.pages.filter((p: any) => p.type === 'page');

  console.log(`Total pages to classify: ${pages.length}`);

  const classifications: PageClassification[] = pages.map((p: any) => classifyPage(p));

  // Stats
  const byClass: Record<string, number> = {};
  classifications.forEach(c => { byClass[c.classification] = (byClass[c.classification] || 0) + 1; });

  console.log('\n=== Classification Results ===');
  for (const [cls, count] of Object.entries(byClass).sort((a, b) => b[1] - a[1])) {
    console.log(`${cls}: ${count}`);
  }

  // Write JSON
  writeFileSync(resolve(OUTPUT_DIR, 'page-classification.json'), JSON.stringify({
    stats: { total: classifications.length, byClassification: byClass },
    classifications
  }, null, 2));
  console.log('\nWritten: scripts/seo/output/page-classification.json');

  // Write report
  const report = `# Page Classification Report

Generated: ${new Date().toISOString()}

## Stats

| Classification | Count |
|---------------|-------|
${Object.entries(byClass).sort((a, b) => b[1] - a[1]).map(([cls, count]) => `| ${cls} | ${count} |`).join('\n')}
| **Total** | **${classifications.length}** |

## KEEP_ROOT (same URL in Astro)
${classifications.filter(c => c.classification === 'KEEP_ROOT').map(c => `- \`${c.path}\` — ${c.title} (${c.lang})`).join('\n') || 'None'}

## BUILD_NEW (new pages to create)
${classifications.filter(c => c.classification === 'BUILD_NEW').map(c => `- \`${c.path}\` → \`${c.astroUrl}\` — ${c.title} (${c.lang})`).join('\n') || 'None'}

## BRAND_PAGE (redirect to /brands/[slug]/)
${classifications.filter(c => c.classification === 'BRAND_PAGE').map(c => `- \`${c.path}\` → \`${c.astroUrl}\` — ${c.title}`).join('\n') || 'None'}

## BLOG_INDEX
${classifications.filter(c => c.classification === 'BLOG_INDEX').map(c => `- \`${c.path}\` → \`${c.astroUrl}\` — ${c.title} (${c.lang})`).join('\n') || 'None'}

## ALREADY_EXISTS
${classifications.filter(c => c.classification === 'ALREADY_EXISTS').map(c => `- \`${c.path}\` → \`${c.astroUrl}\` — ${c.title} (${c.lang})`).join('\n') || 'None'}

## REDIRECT_HOME
${classifications.filter(c => c.classification === 'REDIRECT_HOME').map(c => `- \`${c.path}\` → \`${c.astroUrl}\` — ${c.title} (${c.lang})`).join('\n') || 'None'}

## REDIRECT_PRODUCTS
${classifications.filter(c => c.classification === 'REDIRECT_PRODUCTS').map(c => `- \`${c.path}\` → \`${c.astroUrl}\` — ${c.title} (${c.lang})`).join('\n') || 'None'}

## IGNORE (no redirect needed)
${classifications.filter(c => c.classification === 'IGNORE').map(c => `- \`${c.path}\` — ${c.title} (${c.lang}) — ${c.reason}`).join('\n') || 'None'}
`;

  writeFileSync(resolve(OUTPUT_DIR, 'page-classification-report.md'), report);
  console.log('Written: scripts/seo/output/page-classification-report.md');
}

main();
