/**
 * Phase 3A Step 5 — Generate Tag Redirects
 * All ~1,175 product tags → /products/ (thin content pages)
 * Uses a single wildcard rule instead of 1,175 individual rules.
 *
 * Run: npx tsx scripts/seo/generate-tag-redirects.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, 'output');
mkdirSync(OUTPUT_DIR, { recursive: true });

function main() {
  console.log('=== Tag Redirect Generator ===\n');

  const tagsPath = resolve(__dirname, '../../../opticup/modules/Module 3 - Storefront/seo-audit/data/wc-tags.json');
  const tags = JSON.parse(readFileSync(tagsPath, 'utf8'));

  console.log(`Total tags: ${tags.length}`);

  // Check if any tags match category names (should redirect to category instead)
  const categoriesPath = resolve(__dirname, '../../../opticup/modules/Module 3 - Storefront/seo-audit/data/wc-categories.json');
  const categories = JSON.parse(readFileSync(categoriesPath, 'utf8'));
  const categoryNames = new Set(categories.map((c: any) => c.name.toLowerCase()));

  const tagsToCategoryRedirect = tags.filter((t: any) => categoryNames.has(t.name.toLowerCase()));
  const tagsToProductsRedirect = tags.filter((t: any) => !categoryNames.has(t.name.toLowerCase()));

  console.log(`Tags matching category names: ${tagsToCategoryRedirect.length}`);
  console.log(`Tags → /products/: ${tagsToProductsRedirect.length}`);

  // Generate redirect rules
  // Strategy: ONE wildcard rule covers all tags
  const redirectRules = [
    {
      source: '/product-tag/:path*',
      destination: '/products/',
      permanent: true,
      comment: `Wildcard: all ${tags.length} product tags → /products/ (thin content)`,
    },
  ];

  // For tags that match categories, add specific rules BEFORE the wildcard
  // These will be handled by the merge script (specific rules have priority)
  const categoryTagRedirects = tagsToCategoryRedirect.map((t: any) => ({
    source: `/product-tag/${t.slug}/`,
    destination: `/category/${t.slug}/`,
    permanent: true,
    comment: `Tag "${t.name}" matches category → /category/${t.slug}/`,
  }));

  const output = {
    stats: {
      totalTags: tags.length,
      wildcardRule: 1,
      categoryTagRedirects: categoryTagRedirects.length,
    },
    wildcardRule: redirectRules[0],
    categoryTagRedirects,
  };

  writeFileSync(resolve(OUTPUT_DIR, 'tag-redirects.json'), JSON.stringify(output, null, 2));
  console.log(`\nWritten: scripts/seo/output/tag-redirects.json`);
  console.log(`Rules: 1 wildcard + ${categoryTagRedirects.length} category-specific`);
}

main();
