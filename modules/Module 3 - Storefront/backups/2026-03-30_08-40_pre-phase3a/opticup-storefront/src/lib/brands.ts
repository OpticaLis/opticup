import { supabase } from './supabase';

export interface StorefrontBrand {
  brand_id: string;
  brand_name: string;
  slug: string;
  product_count: number;
}

/**
 * Generate URL-safe slug from brand name.
 */
export function brandSlug(name: string): string {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'));
}

/**
 * Fetch all brands with product counts for the brands listing page.
 * Aggregates across product types (the view groups by product_type).
 */
export async function getBrands(tenantId: string): Promise<StorefrontBrand[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('v_storefront_brands')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) {
    console.warn('v_storefront_brands query error:', error.message);
    return [];
  }

  // Aggregate by brand (view may have multiple rows per brand due to product_type grouping)
  const brandMap = new Map<string, StorefrontBrand>();
  for (const row of data ?? []) {
    const existing = brandMap.get(row.brand_id);
    if (existing) {
      existing.product_count += Number(row.count);
    } else {
      brandMap.set(row.brand_id, {
        brand_id: row.brand_id,
        brand_name: row.brand_name,
        slug: brandSlug(row.brand_name),
        product_count: Number(row.count),
      });
    }
  }

  return Array.from(brandMap.values()).sort((a, b) =>
    a.brand_name.localeCompare(b.brand_name)
  );
}

/**
 * Resolve a brand slug back to brand name.
 * Fetches all brands and finds the matching one.
 */
export async function getBrandBySlug(
  tenantId: string,
  slug: string
): Promise<StorefrontBrand | null> {
  const brands = await getBrands(tenantId);
  return brands.find((b) => b.slug === slug) ?? null;
}
