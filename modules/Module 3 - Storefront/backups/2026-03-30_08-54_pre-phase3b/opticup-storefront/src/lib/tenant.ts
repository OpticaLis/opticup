import { supabase } from './supabase';

export interface TenantConfig {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  storefront: {
    enabled: boolean;
    theme: Record<string, string>;
    logo_url: string | null;
    categories: string[];
    seo: {
      title?: string;
      description?: string;
      keywords?: string;
      og_image?: string;
    };
  };
}

const tenantCache = new Map<string, TenantConfig>();

/**
 * Resolve tenant from slug.
 * Queries tenants + storefront_config tables.
 * Results are cached for the build.
 */
export async function resolveTenant(slug?: string): Promise<TenantConfig | null> {
  if (!supabase) return null;

  const tenantSlug = slug || import.meta.env.PUBLIC_DEFAULT_TENANT || 'prizma';

  if (tenantCache.has(tenantSlug)) {
    return tenantCache.get(tenantSlug)!;
  }

  const { data: tenant, error: tenantError } = await supabase
    .from('v_public_tenant')
    .select('id, slug, name, enabled, theme, logo_url, categories, seo')
    .eq('slug', tenantSlug)
    .single();

  if (tenantError || !tenant) {
    console.error(`Tenant not found: ${tenantSlug}`, tenantError);
    return null;
  }

  const config: TenantConfig = {
    id: tenant.id,
    name: tenant.name,
    slug: tenant.slug,
    logo_url: tenant.logo_url,
    phone: null,
    storefront: {
      enabled: tenant.enabled ?? false,
      theme: tenant.theme ?? {},
      logo_url: tenant.logo_url ?? null,
      categories: tenant.categories ?? [],
      seo: tenant.seo ?? {},
    }
  };

  tenantCache.set(tenantSlug, config);
  return config;
}

/**
 * Get CSS variables from tenant theme config.
 * Returns a style string for injection into <html>.
 */
export function getThemeCSS(theme: Record<string, string>): string {
  if (!theme || Object.keys(theme).length === 0) return '';

  const vars = Object.entries(theme)
    .map(([key, value]) => `--color-${key}: ${value}`)
    .join('; ');

  return vars;
}
