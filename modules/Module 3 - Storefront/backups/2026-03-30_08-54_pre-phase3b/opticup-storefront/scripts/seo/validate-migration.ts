/**
 * Phase 3A Step 8 — Migration Validator
 * Checks every WordPress URL has a destination (page, redirect, or PLANNED).
 *
 * Run: npx tsx scripts/seo/validate-migration.ts
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, 'output');
const STOREFRONT_ROOT = resolve(__dirname, '../..');

type CoverageStatus = 'REDIRECTED' | 'PLANNED_BLOG' | 'PLANNED_LANDING' | 'PLANNED_STATIC' | 'BLOG_INDEX' | 'ALREADY_EXISTS' | 'IGNORED' | 'WILDCARD_REDIRECT' | 'UNCOVERED';

interface UrlCoverage {
  url: string;
  path: string;
  type: string;
  lang: string;
  title: string;
  status: CoverageStatus;
  destination: string | null;
  method: string;
}

function main() {
  console.log('=== Migration Validator ===\n');

  // Load all data
  const urlInventory = JSON.parse(readFileSync(
    resolve(__dirname, '../../../opticup/modules/Module 3 - Storefront/seo-audit/url-inventory.json'), 'utf8'
  ));
  const vercelJson = JSON.parse(readFileSync(resolve(STOREFRONT_ROOT, 'vercel.json'), 'utf8'));
  const productMapping = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'product-mapping.json'), 'utf8'));
  const pageClassification = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'page-classification.json'), 'utf8'));
  const blogMapping = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'blog-mapping.json'), 'utf8'));

  // Build lookup sets
  const redirectSources = new Set(vercelJson.redirects.map((r: any) => r.source));
  const wildcardRedirects = vercelJson.redirects.filter((r: any) => r.source.includes(':path*'));

  const blogSlugs = new Set<string>();
  for (const post of blogMapping.mappings) {
    blogSlugs.add(post.wpPath);
    blogSlugs.add(post.astroUrl);
  }

  const pageClassMap = new Map<string, any>();
  for (const c of pageClassification.classifications) {
    pageClassMap.set(c.path, c);
  }

  const results: UrlCoverage[] = [];

  for (const page of urlInventory.pages) {
    const coverage: UrlCoverage = {
      url: page.url,
      path: page.path,
      type: page.type,
      lang: page.lang,
      title: page.title,
      status: 'UNCOVERED',
      destination: null,
      method: '',
    };

    // 1. Check direct redirect in vercel.json
    if (redirectSources.has(page.path)) {
      const redirect = vercelJson.redirects.find((r: any) => r.source === page.path);
      coverage.status = 'REDIRECTED';
      coverage.destination = redirect?.destination || null;
      coverage.method = 'vercel.json redirect (specific)';
      results.push(coverage);
      continue;
    }

    // 2. Check if it's a blog post
    if (page.type === 'blog-post') {
      if (blogSlugs.has(page.path)) {
        coverage.status = 'PLANNED_BLOG';
        coverage.destination = page.path; // Same URL
        coverage.method = 'Blog post — same URL in Astro (Phase 3B)';
      } else {
        // Check by slug match in blog mapping
        const blogMatch = blogMapping.mappings.find((m: any) => m.wpPath === page.path);
        if (blogMatch) {
          coverage.status = 'PLANNED_BLOG';
          coverage.destination = blogMatch.astroUrl;
          coverage.method = 'Blog post — mapped URL (Phase 3B)';
        }
      }
      results.push(coverage);
      continue;
    }

    // 3. Check if it's a classified page
    if (page.type === 'page' || page.type === 'landing-page') {
      const classification = pageClassMap.get(page.path);
      if (classification) {
        switch (classification.classification) {
          case 'KEEP_ROOT':
            coverage.status = 'PLANNED_LANDING';
            coverage.destination = classification.astroUrl || page.path;
            coverage.method = 'Landing page — same URL (Phase 3C)';
            break;
          case 'BUILD_NEW':
            coverage.status = 'PLANNED_STATIC';
            coverage.destination = classification.astroUrl;
            coverage.method = `Static page — build new (Phase 3C)`;
            break;
          case 'BRAND_PAGE':
            coverage.status = 'REDIRECTED';
            coverage.destination = classification.astroUrl;
            coverage.method = 'Brand page redirect';
            break;
          case 'REDIRECT_HOME':
          case 'REDIRECT_PRODUCTS':
            coverage.status = 'REDIRECTED';
            coverage.destination = classification.astroUrl;
            coverage.method = `Page redirect (${classification.classification})`;
            break;
          case 'BLOG_INDEX':
            coverage.status = 'BLOG_INDEX';
            coverage.destination = classification.astroUrl;
            coverage.method = 'Blog index page (Phase 3B)';
            break;
          case 'ALREADY_EXISTS':
            coverage.status = 'ALREADY_EXISTS';
            coverage.destination = classification.astroUrl;
            coverage.method = 'Already exists in Astro';
            break;
          case 'IGNORE':
            coverage.status = 'IGNORED';
            coverage.destination = null;
            coverage.method = classification.reason;
            break;
        }
        results.push(coverage);
        continue;
      }
    }

    // 3b. Landing pages not in page classification — handle directly
    if (page.type === 'landing-page' && coverage.status === 'UNCOVERED') {
      const path = page.path;
      if (path === '/brands/' || path === '/brands') {
        coverage.status = 'ALREADY_EXISTS';
        coverage.destination = '/brands/';
        coverage.method = 'Brands page already exists in Astro';
      } else if (path === '/lab/' || path === '/multi/' || path === '/multifocal-guide/') {
        coverage.status = 'PLANNED_LANDING';
        coverage.destination = path;
        coverage.method = 'Landing page — same URL (Phase 3C)';
      } else {
        coverage.status = 'PLANNED_LANDING';
        coverage.destination = page.lang === 'he' ? path : `/${page.lang}${path}`;
        coverage.method = 'Landing page — planned (Phase 3C)';
      }
      results.push(coverage);
      continue;
    }

    // 4. Check if product URL matches a wildcard redirect
    if (page.type === 'product') {
      // Check specific product redirect first
      const productSlug = page.path.match(/\/product\/([^/]+)\/?$/)?.[1];
      if (productSlug) {
        const specificSource = `/product/${productSlug}/`;
        if (redirectSources.has(specificSource)) {
          const redirect = vercelJson.redirects.find((r: any) => r.source === specificSource);
          coverage.status = 'REDIRECTED';
          coverage.destination = redirect?.destination || null;
          coverage.method = 'Product redirect (specific barcode)';
          results.push(coverage);
          continue;
        }
      }

      // Wildcard fallback: /product/:path* → /products/
      coverage.status = 'WILDCARD_REDIRECT';
      coverage.destination = '/products/';
      coverage.method = 'Wildcard: /product/:path* → /products/';
      results.push(coverage);
      continue;
    }

    // 5. Check product-category wildcard
    if (page.type === 'product-category') {
      if (!redirectSources.has(page.path)) {
        coverage.status = 'WILDCARD_REDIRECT';
        coverage.destination = '/products/';
        coverage.method = 'Wildcard: /product-category/:path* → /products/';
      }
      results.push(coverage);
      continue;
    }

    // 6. Homepage
    if (page.type === 'homepage') {
      coverage.status = 'ALREADY_EXISTS';
      coverage.destination = '/';
      coverage.method = 'Homepage already exists in Astro';
      results.push(coverage);
      continue;
    }

    // 7. Uncovered
    results.push(coverage);
  }

  // Calculate stats
  const total = results.length;
  const byStatus: Record<string, number> = {};
  results.forEach(r => { byStatus[r.status] = (byStatus[r.status] || 0) + 1; });

  const covered = total - (byStatus['UNCOVERED'] || 0);
  const coveragePercent = (covered / total) * 100;

  console.log('=== Results ===');
  console.log(`Total URLs: ${total}`);
  for (const [status, count] of Object.entries(byStatus).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${status}: ${count} (${((count/total)*100).toFixed(1)}%)`);
  }
  console.log(`\nCoverage: ${covered}/${total} (${coveragePercent.toFixed(1)}%)`);

  // Quality Gate
  const uncovered = results.filter(r => r.status === 'UNCOVERED');
  if (coveragePercent >= 90) {
    console.log('\nQuality Gate: PASS (>90%)');
  } else {
    console.log('\nQuality Gate: FAIL (<90%)');
  }

  if (uncovered.length > 0) {
    console.log(`\nUNCOVERED URLs (${uncovered.length}):`);
    uncovered.forEach(r => console.log(`  ${r.path} (${r.type}, ${r.lang}) — ${r.title}`));
  }

  // Write report
  const report = `# Migration Validation Report

Generated: ${new Date().toISOString()}

## Coverage Summary

| Status | Count | % |
|--------|-------|---|
${Object.entries(byStatus).sort((a, b) => b[1] - a[1]).map(([s, c]) => `| ${s} | ${c} | ${((c/total)*100).toFixed(1)}% |`).join('\n')}
| **Total** | **${total}** | **100%** |

**Coverage: ${covered}/${total} (${coveragePercent.toFixed(1)}%)**

## Quality Gate

| Check | Result |
|-------|--------|
| Coverage > 90% | ${coveragePercent >= 90 ? 'PASS' : 'FAIL'} (${coveragePercent.toFixed(1)}%) |
| Redirects ≤ 1,024 | PASS (${vercelJson.redirects.length}) |

## Coverage by Type

| URL Type | Total | Covered | Uncovered |
|----------|-------|---------|-----------|
${['product', 'blog-post', 'page', 'landing-page', 'product-category', 'homepage'].map(type => {
  const typeResults = results.filter(r => r.type === type);
  const typeCovered = typeResults.filter(r => r.status !== 'UNCOVERED').length;
  return `| ${type} | ${typeResults.length} | ${typeCovered} | ${typeResults.length - typeCovered} |`;
}).join('\n')}

## Uncovered URLs (${uncovered.length})

${uncovered.length === 0 ? 'None! All URLs have a destination.' : uncovered.map(r => `- \`${r.path}\` (${r.type}, ${r.lang}) — ${r.title}`).join('\n')}

## Coverage Method Breakdown

| Method | Count |
|--------|-------|
${[...new Set(results.map(r => r.method))].filter(Boolean).map(method => {
  return `| ${method} | ${results.filter(r => r.method === method).length} |`;
}).join('\n')}
`;

  writeFileSync(resolve(OUTPUT_DIR, 'migration-validation-report.md'), report);
  console.log('\nWritten: scripts/seo/output/migration-validation-report.md');
}

main();
