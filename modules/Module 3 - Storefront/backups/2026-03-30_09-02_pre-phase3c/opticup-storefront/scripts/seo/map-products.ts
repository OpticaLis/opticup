/**
 * Phase 3A Step 2 — Product Mapping Script
 * Maps WordPress product URLs → inventory barcodes for 301 redirects.
 *
 * Input: url-inventory.json (WP products) + Supabase v_storefront_products
 * Output: scripts/seo/output/product-mapping.json + product-mapping-report.md
 *
 * Run: npx tsx scripts/seo/map-products.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, 'output');
mkdirSync(OUTPUT_DIR, { recursive: true });

const SUPABASE_URL = 'https://tsxrrxzmdxaenlvocyit.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU';

const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// Known brand name patterns found in WP slugs → canonical name
const BRAND_ALIASES: Record<string, string> = {
  'gucci': 'Gucci',
  'saint-laurent': 'Saint Laurent',
  'saint laurent': 'Saint Laurent',
  'balenciaga': 'Balenciaga',
  'baleciaga': 'Balenciaga',  // typo in WP
  'bottega-venneta': 'Bottega Veneta',
  'bottega-veneta': 'Bottega Veneta',
  'montblanc': 'Montblanc',
  'mont-blanc': 'Montblanc',
  'tom-ford': 'Tom Ford',
  'tomford': 'Tom Ford',
  'ray-ban': 'Ray-Ban',
  'rayban': 'Ray-Ban',
  'oakley': 'Oakley',
  'versace': 'Versace',
  'prada': 'Prada',
  'dolce-gabbana': 'Dolce & Gabbana',
  'dior': 'Dior',
  'fendi': 'Fendi',
  'celine': 'Celine',
  'burberry': 'Burberry',
  'carrera': 'Carrera',
  'persol': 'Persol',
  'chanel': 'Chanel',
  'armani': 'Giorgio Armani',
  'emporio-armani': 'Emporio Armani',
  'maui-jim': 'Maui Jim',
  'jimmy-choo': 'Jimmy Choo',
  'bvlgari': 'Bvlgari',
  'chopard': 'Chopard',
  'cartier': 'Cartier',
  'cazal': 'Cazal',
  'mykita': 'Mykita',
  'moscot': 'Moscot',
  'ic-berlin': 'ic! berlin',
  'lindberg': 'Lindberg',
  'silhouette': 'Silhouette',
  'modo': 'Modo',
  'kering': 'Kering',
  'kering-eyewear': 'Kering',
  'etnia-barcelona': 'Etnia Barcelona',
  'vogue': 'Vogue',
  'police': 'Police',
  'boss': 'Hugo Boss',
  'hugo-boss': 'Hugo Boss',
  'marc-jacobs': 'Marc Jacobs',
  'kate-spade': 'Kate Spade',
  'coach': 'Coach',
  'michael-kors': 'Michael Kors',
  'tiffany': 'Tiffany',
  'polaroid': 'Polaroid',
  'swarovski': 'Swarovski',
  'gast': 'Gast',
  'john': 'John Varvatos',
  'john-varvatos': 'John Varvatos',
  'gotti': 'Gotti',
  'dg': 'Dolce & Gabbana',
  'kamemannen': 'Kamemannen',
  'serengeti': 'Serengeti',
  'miu': 'Miu Miu',
  'miumiu': 'Miu Miu',
  'miu-miu': 'Miu Miu',
  'vintage': 'Vintage',
  'genny': 'Genny',
  'milo': 'Milo',
  'hublot': 'Hublot',
  'tejesta': 'Tejesta',
  'tejasta': 'Tejesta',
  'tajesta': 'Tejesta',
  'bolle': 'Bolle',
  'porsche': 'Porsche Design',
  'porsche-design': 'Porsche Design',
  'lool': 'Lool',
  'matsuda': 'Matsuda',
  'blackfin': 'Blackfin',
  'retrosuperfuture': 'RetroSuperFuture',
  'fred': 'Fred',
  'tiffanyco': 'Tiffany & Co',
  'yohji': 'Yohji Yamamoto',
  'yohji-yamamoto': 'Yohji Yamamoto',
  'henry': 'Henry Jullien',
  'henry-jullien': 'Henry Jullien',
  'talla': 'Talla',
  'valentino': 'Valentino',
  'masunaga': 'Masunaga',
};

interface WpProduct {
  url: string;
  path: string;
  title: string;
  status: string;
  lang: string;
  type: string;
  slug?: string;
}

interface InventoryProduct {
  barcode: string;
  brand_name: string;
  model: string;
}

interface ProductMapping {
  wpPath: string;
  wpTitle: string;
  wpSlug: string;
  matchType: 'exact' | 'fuzzy' | 'brand' | 'wildcard';
  astroUrl: string;
  barcode: string | null;
  brandName: string | null;
  brandSlug: string | null;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function extractFromWpSlug(slug: string): { brandPart: string; modelPart: string } {
  // WP slugs: "baleciaga-bb0166s", "gucci-gg0968o", "montblanc-mb0344s-2"
  // Try to split brand from model
  const parts = slug.split('-');

  // Try matching known brand prefixes (1 or 2 parts)
  for (let i = Math.min(3, parts.length - 1); i >= 1; i--) {
    const brandCandidate = parts.slice(0, i).join('-');
    if (BRAND_ALIASES[brandCandidate]) {
      return { brandPart: brandCandidate, modelPart: parts.slice(i).join('-') };
    }
  }

  // Fallback: first part is brand, rest is model
  return { brandPart: parts[0] || '', modelPart: parts.slice(1).join('-') };
}

async function fetchStorefrontProducts(): Promise<InventoryProduct[]> {
  // First get tenant ID
  const { data: tenant } = await sb
    .from('v_public_tenant')
    .select('id')
    .eq('slug', 'prizma')
    .single();

  if (!tenant) throw new Error('Could not resolve tenant');
  const tenantId = tenant.id;

  const all: InventoryProduct[] = [];
  let from = 0;
  const PAGE = 1000;

  while (true) {
    const { data, error } = await sb
      .from('v_storefront_products')
      .select('barcode, brand_name, model')
      .eq('tenant_id', tenantId)
      .range(from, from + PAGE - 1);

    if (error) throw new Error(`Supabase error: ${error.message}`);
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return all;
}

async function main() {
  console.log('=== Product Mapping Script ===\n');

  // 1. Load WP products
  const inventoryPath = resolve(__dirname, '../../../opticup/modules/Module 3 - Storefront/seo-audit/url-inventory.json');
  const urlInventory = JSON.parse(readFileSync(inventoryPath, 'utf8'));
  const wpProducts: WpProduct[] = urlInventory.pages.filter(
    (p: any) => p.type === 'product' && p.status === 'publish'
  );
  console.log(`WordPress published products: ${wpProducts.length}`);

  // Also load WC products for slug data
  const wcPath = resolve(__dirname, '../../../opticup/modules/Module 3 - Storefront/seo-audit/data/wc-products.json');
  const wcProducts = JSON.parse(readFileSync(wcPath, 'utf8'));
  const wcSlugMap = new Map<string, string>(); // title → slug
  for (const wc of wcProducts) {
    if (wc.slug && wc.title) wcSlugMap.set(wc.title, wc.slug);
  }

  // 2. Fetch storefront products
  console.log('Fetching inventory from Supabase...');
  const inventory = await fetchStorefrontProducts();
  console.log(`Storefront visible products: ${inventory.length}`);

  // 3. Build model lookup
  const modelMap = new Map<string, InventoryProduct>();
  for (const item of inventory) {
    modelMap.set(normalize(item.model), item);
  }

  // 4. Match products
  const mappings: ProductMapping[] = [];
  let exact = 0, fuzzy = 0, brandMatch = 0, wildcard = 0;
  const brandStats = new Map<string, number>();

  for (const wp of wpProducts) {
    // Extract slug from path: /product/slug/ → slug
    const pathMatch = wp.path.match(/\/product\/([^/]+)\/?$/);
    const slug = pathMatch ? decodeURIComponent(pathMatch[1]) : '';
    const normTitle = normalize(wp.title);

    let mapping: ProductMapping = {
      wpPath: wp.path,
      wpTitle: wp.title,
      wpSlug: slug,
      matchType: 'wildcard',
      astroUrl: '/products/',
      barcode: null,
      brandName: null,
      brandSlug: null,
    };

    // Try exact model match against title (WP title = model number)
    if (modelMap.has(normTitle)) {
      const inv = modelMap.get(normTitle)!;
      mapping.matchType = 'exact';
      mapping.barcode = inv.barcode;
      mapping.astroUrl = `/products/${inv.barcode}/`;
      mapping.brandName = inv.brand_name;
      mapping.brandSlug = slugify(inv.brand_name);
      exact++;
    }
    // Try fuzzy: model number is a substring match
    else {
      let found = false;
      for (const [invNorm, inv] of modelMap) {
        if (normTitle.length >= 3 && (invNorm.includes(normTitle) || normTitle.includes(invNorm))) {
          mapping.matchType = 'fuzzy';
          mapping.barcode = inv.barcode;
          mapping.astroUrl = `/products/${inv.barcode}/`;
          mapping.brandName = inv.brand_name;
          mapping.brandSlug = slugify(inv.brand_name);
          fuzzy++;
          found = true;
          break;
        }
      }

      // Try brand extraction from slug
      if (!found && slug) {
        const { brandPart } = extractFromWpSlug(slug);
        const resolvedBrand = BRAND_ALIASES[brandPart];
        if (resolvedBrand) {
          mapping.matchType = 'brand';
          mapping.brandName = resolvedBrand;
          mapping.brandSlug = slugify(resolvedBrand);
          mapping.astroUrl = `/brands/${mapping.brandSlug}/`;
          brandMatch++;
          found = true;
        }
      }

      if (!found) {
        wildcard++;
      }
    }

    if (mapping.brandName) {
      brandStats.set(mapping.brandName, (brandStats.get(mapping.brandName) || 0) + 1);
    }

    mappings.push(mapping);
  }

  // 5. Stats
  const total = mappings.length;
  const matched = exact + fuzzy;
  const withDestination = exact + fuzzy + brandMatch;
  const matchRate = total > 0 ? (matched / total) * 100 : 0;
  const destinationRate = total > 0 ? (withDestination / total) * 100 : 0;

  const stats = {
    total,
    exact,
    fuzzy,
    brandMatch,
    wildcard,
    matched,
    matchRate: Math.round(matchRate * 10) / 10,
    withDestination,
    destinationRate: Math.round(destinationRate * 10) / 10,
    storefrontProductCount: inventory.length,
    note: `Only ${inventory.length} products currently visible on storefront. Most WP products redirect via brand page or wildcard to /products/.`,
  };

  console.log('\n=== Results ===');
  console.log(`Total WP products: ${total}`);
  console.log(`Storefront products: ${inventory.length}`);
  console.log(`Exact match: ${exact} (${((exact/total)*100).toFixed(1)}%)`);
  console.log(`Fuzzy match: ${fuzzy} (${((fuzzy/total)*100).toFixed(1)}%)`);
  console.log(`Brand redirect: ${brandMatch} (${((brandMatch/total)*100).toFixed(1)}%)`);
  console.log(`Wildcard fallback: ${wildcard} (${((wildcard/total)*100).toFixed(1)}%)`);
  console.log(`Match rate (exact+fuzzy): ${stats.matchRate}%`);
  console.log(`With specific destination: ${withDestination} (${stats.destinationRate}%)`);

  // 6. Write output
  writeFileSync(resolve(OUTPUT_DIR, 'product-mapping.json'), JSON.stringify({ stats, mappings }, null, 2));
  console.log(`\nWritten: scripts/seo/output/product-mapping.json`);

  // 7. Write report
  const sortedBrands = [...brandStats.entries()].sort((a, b) => b[1] - a[1]);
  const report = `# Product Mapping Report

Generated: ${new Date().toISOString()}

## Stats

| Metric | Value |
|--------|-------|
| Total WP products (published) | ${total} |
| Storefront visible products | ${inventory.length} |
| Exact match → /products/[barcode]/ | ${exact} (${((exact/total)*100).toFixed(1)}%) |
| Fuzzy match → /products/[barcode]/ | ${fuzzy} (${((fuzzy/total)*100).toFixed(1)}%) |
| Brand redirect → /brands/[slug]/ | ${brandMatch} (${((brandMatch/total)*100).toFixed(1)}%) |
| Wildcard → /products/ | ${wildcard} (${((wildcard/total)*100).toFixed(1)}%) |
| **Match rate (exact+fuzzy)** | **${stats.matchRate}%** |
| **With specific destination** | **${withDestination} (${stats.destinationRate}%)** |

## DECISION_NEEDED: Low Barcode Match Rate

Only ${inventory.length} products are currently visible on the Astro storefront (only Saint Laurent brand has \`default_sync\` set).
Of 733 WP products, only ${matched} could be matched to specific barcodes.

**Resolution strategy:**
1. Products matched to barcodes get specific 301 redirects
2. Products with identified brand names redirect to \`/brands/[brand-slug]/\`
3. All remaining products caught by wildcard: \`/product/:path*\` → \`/products/\`
4. As more brands are enabled on the storefront, more specific redirects can be generated

**This is acceptable because:**
- Every WP product URL has a redirect destination (zero orphans)
- The wildcard ensures no 404s even for unknown products
- SEO value is preserved at the brand/catalog level
- Specific product redirects can be refined when inventory grows

## Quality Gate

- Match rate > 70%: ${stats.matchRate > 70 ? 'PASS' : 'FAIL — see DECISION_NEEDED above'}
- All products have redirect destination: PASS (wildcard covers unmatched)

## Brand Distribution

| Brand | Count |
|-------|-------|
${sortedBrands.map(([name, count]) => `| ${name} | ${count} |`).join('\n')}
| *(unidentified brand)* | ${wildcard} |

## Exact Matches (${exact})

${mappings.filter(m => m.matchType === 'exact').map(m => `- \`${m.wpPath}\` → \`${m.astroUrl}\``).join('\n') || 'None'}

## Fuzzy Matches (${fuzzy})

${mappings.filter(m => m.matchType === 'fuzzy').map(m => `- \`${m.wpPath}\` → \`${m.astroUrl}\` (title: "${m.wpTitle}")`).join('\n') || 'None'}

## Wildcard Fallbacks (sample, ${wildcard} total)

${mappings.filter(m => m.matchType === 'wildcard').slice(0, 20).map(m => `- \`${m.wpPath}\` → /products/ (title: "${m.wpTitle}", slug: "${m.wpSlug}")`).join('\n')}
${wildcard > 20 ? `... and ${wildcard - 20} more` : ''}
`;

  writeFileSync(resolve(OUTPUT_DIR, 'product-mapping-report.md'), report);
  console.log('Written: scripts/seo/output/product-mapping-report.md');
}

main().catch(console.error);
