/**
 * Phase 3A Step 6 — Generate Category Redirects
 * /product-category/[slug]/ → /category/[slug]/
 *
 * Run: npx tsx scripts/seo/generate-category-redirects.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, 'output');
mkdirSync(OUTPUT_DIR, { recursive: true });

function main() {
  console.log('=== Category Redirect Generator ===\n');

  const categoriesPath = resolve(__dirname, '../../../opticup/modules/Module 3 - Storefront/seo-audit/data/wc-categories.json');
  const categories = JSON.parse(readFileSync(categoriesPath, 'utf8'));

  console.log(`Total categories: ${categories.length}`);

  // Map Astro category slugs from the storefront_config
  // The Astro store uses Hebrew category names → slugified
  const categoryRedirects = categories.map((cat: any) => ({
    source: `/product-category/${cat.slug}/`,
    destination: `/category/${cat.slug}/`,
    permanent: true,
    wpName: cat.name,
    wpId: cat.id,
    productCount: cat.count,
  }));

  // Also add a wildcard for any sub-categories or pagination
  const wildcardRule = {
    source: '/product-category/:path*',
    destination: '/products/',
    permanent: true,
    comment: 'Catch-all for any product-category URLs not matched by specific rules',
  };

  const output = {
    stats: {
      totalCategories: categories.length,
      specificRedirects: categoryRedirects.length,
      wildcardRule: 1,
    },
    categoryRedirects,
    wildcardRule,
  };

  writeFileSync(resolve(OUTPUT_DIR, 'category-redirects.json'), JSON.stringify(output, null, 2));
  console.log(`\nWritten: scripts/seo/output/category-redirects.json`);
  console.log(`Rules: ${categoryRedirects.length} specific + 1 wildcard`);

  categoryRedirects.forEach((r: any) => {
    console.log(`  ${r.source} → ${r.destination} (${r.wpName}, ${r.productCount} products)`);
  });
}

main();
