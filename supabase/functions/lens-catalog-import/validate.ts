// Row-level validation helpers for lens-catalog-import EF.
// Extracted to keep index.ts under Iron Rule 12 (350-line max).

export interface CatalogRow {
  brand_name: string;
  design_name: string;
  lens_type: 'single_vision' | 'progressive' | 'bifocal' | 'office' | 'occupational';
  material?: string;
  refractive_index: number;
  diameter_mm: number;
  coating?: string;
  tint?: string;
  sph_min: number;
  sph_max: number;
  sph_step?: number;
  cyl_min?: number;
  cyl_max?: number;
  cyl_step?: number;
  add_min?: number;
  add_max?: number;
  add_step?: number;
  supplier_name?: string;
  supplier_sku_code?: string;
  price_amount?: number;
  currency_code?: string;
  is_vat_inclusive?: boolean;
  production_type?: 'stock' | 'custom';
}

export interface RequestPayload {
  tenant_id: string;
  rows: CatalogRow[];
  publish_immediately?: boolean;
  dry_run?: boolean;
}

export interface ImportResult {
  inserted: { brands: number; designs: number; variants: number; offerings: number };
  reused:   { brands: number; designs: number; variants: number; offerings: number };
  errors: Array<{ row: number; error: string }>;
  dry_run: boolean;
}

const VALID_LENS_TYPES = new Set(['single_vision','progressive','bifocal','office','occupational']);

export function validateRow(r: CatalogRow): string | null {
  if (!r.brand_name || typeof r.brand_name !== 'string') return 'brand_name required';
  if (!r.design_name || typeof r.design_name !== 'string') return 'design_name required';
  if (!VALID_LENS_TYPES.has(r.lens_type)) return 'lens_type invalid';
  if (typeof r.refractive_index !== 'number' || r.refractive_index < 1.40 || r.refractive_index > 2.00) return 'refractive_index out of range';
  if (typeof r.diameter_mm !== 'number' || r.diameter_mm < 50 || r.diameter_mm > 90) return 'diameter_mm out of range';
  if (typeof r.sph_min !== 'number' || typeof r.sph_max !== 'number') return 'sph_min/sph_max required';
  if (r.sph_min > r.sph_max) return 'sph_min > sph_max';
  if (r.cyl_min != null && r.cyl_max != null && r.cyl_min > r.cyl_max) return 'cyl_min > cyl_max';
  if (r.add_min != null && r.add_max != null && r.add_min > r.add_max) return 'add_min > add_max';
  if (r.production_type && !['stock','custom'].includes(r.production_type)) return 'production_type invalid';
  if (r.price_amount != null && r.price_amount < 0) return 'price_amount negative';
  return null;
}
