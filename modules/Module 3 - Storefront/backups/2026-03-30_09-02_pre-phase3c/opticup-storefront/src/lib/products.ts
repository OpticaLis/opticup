import { supabase } from './supabase';

export interface StorefrontProduct {
  id: string;
  barcode: string;
  brand_name: string;
  brand_id: string | null;
  brand_type: string | null;
  model: string;
  color: string | null;
  size: string | null;
  quantity: number;
  product_type: string | null;
  sell_price: number | null;
  sell_discount: number | null;
  default_sync: 'full' | 'display';
  images: string[];
  search_text?: string;
}

export interface StorefrontBrand {
  brand_id: string;
  brand_name: string;
  product_type: string | null;
  count: number;
}

export interface ProductListResult {
  products: StorefrontProduct[];
  total: number;
}

/**
 * Fetch products visible on storefront for a tenant.
 * Uses v_storefront_products View — never queries tables directly.
 */
export async function getStorefrontProducts(
  tenantId: string,
  options?: {
    limit?: number;
    offset?: number;
    brand?: string;
    category?: string;
    sync?: 'full' | 'display';
    sort?: 'newest' | 'price_asc' | 'price_desc' | 'brand';
    search?: string;
  }
): Promise<ProductListResult> {
  if (!supabase) return { products: [], total: 0 };

  const limit = options?.limit ?? 24;
  const offset = options?.offset ?? 0;

  let query = supabase
    .from('v_storefront_products')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  if (options?.brand) {
    query = query.eq('brand_name', options.brand);
  }
  if (options?.category) {
    query = query.eq('product_type', options.category);
  }
  if (options?.sync) {
    query = query.eq('default_sync', options.sync);
  }
  if (options?.search) {
    query = query.ilike('search_text', `%${options.search.toLowerCase()}%`);
  }

  // Sorting
  switch (options?.sort) {
    case 'price_asc':
      query = query.order('sell_price', { ascending: true, nullsFirst: false });
      break;
    case 'price_desc':
      query = query.order('sell_price', { ascending: false, nullsFirst: true });
      break;
    case 'brand':
      query = query.order('brand_name', { ascending: true });
      break;
    default:
      query = query.order('id', { ascending: false });
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.warn('v_storefront_products query error:', error.message);
    return { products: [], total: 0 };
  }

  return {
    products: (data ?? []) as StorefrontProduct[],
    total: count ?? 0
  };
}

/**
 * Fetch a single product by barcode.
 */
export async function getProductByBarcode(
  tenantId: string,
  barcode: string
): Promise<StorefrontProduct | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('v_storefront_products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('barcode', barcode)
    .single();

  if (error) {
    console.warn('Product fetch error:', error.message);
    return null;
  }

  return data as StorefrontProduct;
}

/**
 * Get related products (same brand or category, excluding current).
 */
export async function getRelatedProducts(
  tenantId: string,
  product: StorefrontProduct,
  limit = 4
): Promise<StorefrontProduct[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('v_storefront_products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('brand_name', product.brand_name)
    .neq('barcode', product.barcode)
    .limit(limit);

  if (error) return [];
  return (data ?? []) as StorefrontProduct[];
}

/**
 * Get distinct categories for a tenant's storefront products.
 */
export async function getStorefrontCategories(
  tenantId: string
): Promise<{ name: string; count: number }[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('v_storefront_categories')
    .select('*')
    .eq('tenant_id', tenantId);

  if (error) {
    console.warn('v_storefront_categories query error:', error.message);
    return [];
  }

  return (data ?? []) as { name: string; count: number }[];
}

/**
 * Get distinct brands for a tenant's storefront (for filter sidebar).
 */
export async function getStorefrontBrands(
  tenantId: string,
  category?: string
): Promise<StorefrontBrand[]> {
  if (!supabase) return [];

  let query = supabase
    .from('v_storefront_brands')
    .select('*')
    .eq('tenant_id', tenantId);

  if (category) {
    query = query.eq('product_type', category);
  }

  const { data, error } = await query;

  if (error) {
    console.warn('v_storefront_brands query error:', error.message);
    return [];
  }

  return (data ?? []) as StorefrontBrand[];
}
