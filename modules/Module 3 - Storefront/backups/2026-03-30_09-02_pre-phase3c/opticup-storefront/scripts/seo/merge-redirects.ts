/**
 * Phase 3A Step 7 — Merge All Redirects into vercel.json
 * Combines product mapping, page classification, category redirects, and tag redirects.
 * Uses wildcards to stay under Vercel's 1,024 redirect limit.
 *
 * Run: npx tsx scripts/seo/merge-redirects.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, 'output');
const STOREFRONT_ROOT = resolve(__dirname, '../..');

interface VercelRedirect {
  source: string;
  destination: string;
  permanent: boolean;
}

function main() {
  console.log('=== Merge Redirects into vercel.json ===\n');

  const redirects: VercelRedirect[] = [];
  const seen = new Set<string>();

  function addRedirect(source: string, destination: string, permanent = true) {
    if (seen.has(source)) return;
    seen.add(source);
    redirects.push({ source, destination, permanent });
  }

  // 1. Product redirects (specific matched products only)
  const productMapping = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'product-mapping.json'), 'utf8'));
  let productSpecific = 0;
  for (const m of productMapping.mappings) {
    if (m.matchType === 'exact' || m.matchType === 'fuzzy') {
      // Specific product → barcode redirect
      addRedirect(`/product/${encodeURIComponent(m.wpSlug)}/`, m.astroUrl);
      // Also add without trailing slash
      addRedirect(`/product/${encodeURIComponent(m.wpSlug)}`, m.astroUrl);
      productSpecific++;
    }
  }
  console.log(`Product-specific redirects: ${productSpecific} (x2 for slash variants)`);

  // 2. Brand page redirects (from page classification)
  const pageClassification = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'page-classification.json'), 'utf8'));
  let brandPageRedirects = 0;
  let otherPageRedirects = 0;
  for (const c of pageClassification.classifications) {
    if (c.classification === 'BRAND_PAGE' && c.astroUrl) {
      addRedirect(c.path, c.astroUrl);
      brandPageRedirects++;
    }
    if (c.classification === 'REDIRECT_HOME' && c.astroUrl) {
      addRedirect(c.path, c.astroUrl);
      otherPageRedirects++;
    }
    if (c.classification === 'REDIRECT_PRODUCTS' && c.astroUrl) {
      addRedirect(c.path, c.astroUrl);
      otherPageRedirects++;
    }
    if (c.classification === 'ALREADY_EXISTS' && c.astroUrl) {
      addRedirect(c.path, c.astroUrl);
      otherPageRedirects++;
    }
  }
  console.log(`Brand page redirects: ${brandPageRedirects}`);
  console.log(`Other page redirects: ${otherPageRedirects}`);

  // 3. Category redirects (specific)
  const categoryRedirects = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'category-redirects.json'), 'utf8'));
  for (const r of categoryRedirects.categoryRedirects) {
    addRedirect(r.source, r.destination);
  }
  console.log(`Category redirects: ${categoryRedirects.categoryRedirects.length}`);

  // 4. WooCommerce pages
  const wooPages = [
    { source: '/cart/', destination: '/' },
    { source: '/checkout/', destination: '/' },
    { source: '/my-account/', destination: '/' },
    { source: '/wishlist/', destination: '/' },
    { source: '/account/', destination: '/' },
  ];
  for (const w of wooPages) {
    addRedirect(w.source, w.destination);
  }
  console.log(`WooCommerce redirects: ${wooPages.length}`);

  // 5. Blog alias
  addRedirect('/blog/', '/%D7%91%D7%9C%D7%95%D7%92/');
  console.log('Blog alias: /blog/ → /בלוג/');

  // 6. Shop redirects
  addRedirect('/shop/', '/products/');
  console.log('Shop redirect: /shop/ → /products/');

  // 7. Wildcard catch-alls (MUST be last — Vercel processes in order)
  // These catch everything not matched by specific rules above
  addRedirect('/product-tag/:path*', '/products/');
  addRedirect('/product-category/:path*', '/products/');
  addRedirect('/product/:path*', '/products/');
  addRedirect('/shop/:path*', '/products/');
  console.log('Wildcard catch-alls: 4');

  // Total check
  console.log(`\n=== Total redirects: ${redirects.length} ===`);

  if (redirects.length > 1024) {
    console.log('QUALITY GATE FAIL: Over 1,024 redirects!');
    console.log('Attempting optimization...');

    // Remove specific product redirects for brand-only matches
    // They'll be caught by the wildcard /product/:path* → /products/
    // Only keep exact/fuzzy barcode matches
    const optimized = redirects.filter(r => {
      // Keep all non-product redirects
      if (!r.source.startsWith('/product/')) return true;
      // Keep wildcard
      if (r.source.includes(':path*')) return true;
      // Keep only matched products (they redirect to /products/barcode/)
      return r.destination.startsWith('/products/') && r.destination !== '/products/';
    });

    console.log(`After optimization: ${optimized.length} redirects`);

    if (optimized.length > 1024) {
      console.log('STILL OVER 1024! Manual review needed.');
      process.exit(1);
    }
  }

  // Read existing vercel.json
  const vercelPath = resolve(STOREFRONT_ROOT, 'vercel.json');
  const vercelJson = JSON.parse(readFileSync(vercelPath, 'utf8'));

  // Add redirects
  vercelJson.redirects = redirects;

  // Write updated vercel.json
  writeFileSync(vercelPath, JSON.stringify(vercelJson, null, 2) + '\n');
  console.log(`\nWritten: vercel.json (${redirects.length} redirects)`);

  // Write redirect summary
  const summary = `# Redirect Summary

Generated: ${new Date().toISOString()}

## Stats

| Type | Count |
|------|-------|
| Product → barcode (specific) | ${productSpecific * 2} |
| Brand page → /brands/[slug]/ | ${brandPageRedirects} |
| Category → /category/[slug]/ | ${categoryRedirects.categoryRedirects.length} |
| WooCommerce → / | ${wooPages.length} |
| Other page redirects | ${otherPageRedirects} |
| Blog alias | 1 |
| Shop redirect | 1 |
| Wildcard catch-alls | 4 |
| **Total** | **${redirects.length}** |

## Quality Gate

- Total ≤ 1,024: ${redirects.length <= 1024 ? 'PASS' : 'FAIL'} (${redirects.length})

## Wildcard Rules (catch-all, at end)

| Source | Destination |
|--------|-------------|
| /product-tag/:path* | /products/ |
| /product-category/:path* | /products/ |
| /product/:path* | /products/ |
| /shop/:path* | /products/ |
`;

  writeFileSync(resolve(OUTPUT_DIR, 'redirect-summary.md'), summary);
  console.log('Written: scripts/seo/output/redirect-summary.md');
}

main();
