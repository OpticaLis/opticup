// _shared/tenant-config.ts — single SELECT against tenants for any EF that needs
// tenant-scoped configuration. Replaces previously-hardcoded STOREFRONT_URL,
// WhatsApp number, brand colors, etc. (M4_HARDCODED_PRIZMA_REMOVAL).
//
// Caller-decides-fallback: the helper returns null fields when a key is
// missing rather than substituting a hardcoded default — so callers can
// decide how to degrade (skip the message, return 404, use a generic
// platform fallback, etc.) per their own semantics.

export type TenantBrand = {
  gold: string;
  gold_light: string;
  gold_hover: string;
};

export type TenantConfig = {
  storefront_url: string | null;
  whatsapp_phone_e164: string | null;
  support_phone_display: string | null;
  business_phone: string | null;
  business_address: string | null;
  brand: TenantBrand | null;
  ui_config: Record<string, unknown>;
};

// deno-lint-ignore no-explicit-any
export async function loadTenantConfig(
  db: any,
  tenantId: string,
): Promise<TenantConfig | null> {
  if (!tenantId) return null;

  const { data, error } = await db
    .from("tenants")
    .select("business_phone, business_address, ui_config")
    .eq("id", tenantId)
    .maybeSingle();

  if (error) {
    console.warn("loadTenantConfig: tenant lookup failed:", error.message);
    return null;
  }
  if (!data) {
    console.warn("loadTenantConfig: tenant not found id=" + tenantId);
    return null;
  }

  const ui = (data.ui_config ?? {}) as Record<string, unknown>;
  const brandRaw = ui.brand as Record<string, unknown> | undefined;
  const brand: TenantBrand | null =
    brandRaw && typeof brandRaw.gold === "string"
      ? {
          gold:       String(brandRaw.gold),
          gold_light: String(brandRaw.gold_light ?? brandRaw.gold),
          gold_hover: String(brandRaw.gold_hover ?? brandRaw.gold),
        }
      : null;

  return {
    storefront_url:        typeof ui.storefront_url        === "string" ? ui.storefront_url        : null,
    whatsapp_phone_e164:   typeof ui.whatsapp_phone_e164   === "string" ? ui.whatsapp_phone_e164   : null,
    support_phone_display: typeof ui.support_phone_display === "string" ? ui.support_phone_display : null,
    business_phone:        data.business_phone ?? null,
    business_address:      data.business_address ?? null,
    brand,
    ui_config: ui,
  };
}
