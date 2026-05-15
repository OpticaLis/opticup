// lens-catalog-import — M1 Lens Phase 1A
// Accepts JSON payload of catalog rows + INSERTs lens_brand → lens_design → lens_variant
// → supplier_catalog_offering. Idempotent via composite-key dedup.
//
// Client-side responsibility: parse xlsx → JSON (SheetJS in browser), POST here.
//
// Auth: verify_jwt: true. Caller must be platform super admin (server-side check via
// is_platform_super_admin RPC) — the EF rejects with 403 otherwise.
//
// Per Iron Rule 23: no secrets in code. SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// from env. Per Iron Rule 22: every insert carries tenant_id from request body.
//
// Authored: 2026-05-14 (M1_LENS_INVENTORY_PHASE_1A_SCHEMA_PLATFORM_ADMIN SPEC).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.45.0";
import { validateRow, type CatalogRow, type RequestPayload, type ImportResult } from "./validate.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let body: RequestPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (!body.tenant_id || !Array.isArray(body.rows)) {
    return new Response(JSON.stringify({ error: 'missing_tenant_id_or_rows' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (body.rows.length === 0) {
    return new Response(JSON.stringify({ error: 'empty_rows' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (body.rows.length > 5000) {
    return new Response(JSON.stringify({ error: 'too_many_rows', limit: 5000 }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Service-role client for cross-tenant catalog seeding.
  const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  // Verify caller is platform super admin (gate the seeding capability).
  // Note: is_platform_super_admin reads JWT claims; pass through caller's auth.
  // Fail-closed: empty/missing Authorization header is treated as anonymous and rejected.
  // M1A_OPERATIONS_RPCS_FIX (2026-05-15) Fix #7 — inverted from the pre-existing
  // fail-open `if (callerAuth) { ... }` pattern.
  const callerAuth = req.headers.get('authorization') ?? '';
  if (!callerAuth) {
    return new Response(JSON.stringify({ error: 'unauthorized_missing_auth' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  const sbAsCaller = createClient(SUPABASE_URL, SERVICE_KEY, {
    global: { headers: { Authorization: callerAuth } },
    auth: { persistSession: false }
  });
  const { data: isAdmin, error: adminCheckErr } = await sbAsCaller.rpc('is_platform_super_admin');
  if (adminCheckErr || isAdmin !== true) {
    return new Response(JSON.stringify({ error: 'forbidden_not_platform_admin', detail: adminCheckErr?.message }), {
      status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const result: ImportResult = {
    inserted: { brands: 0, designs: 0, variants: 0, offerings: 0 },
    reused:   { brands: 0, designs: 0, variants: 0, offerings: 0 },
    errors: [],
    dry_run: body.dry_run === true,
  };

  // Validate rows before any INSERT.
  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i];
    const err = validateRow(r);
    if (err) result.errors.push({ row: i + 1, error: err });
  }
  if (result.errors.length > 0) {
    return new Response(JSON.stringify({ ...result, error: 'validation_failed' }), {
      status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (body.dry_run) {
    return new Response(JSON.stringify(result), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Cache to avoid re-fetching for repeated brand/design/variant within batch
  const brandCache = new Map<string, string>();   // name -> id
  const designCache = new Map<string, string>();  // brandId|name -> id
  const variantCache = new Map<string, string>(); // designId|index|diameter|coating|tint -> id
  const supplierCache = new Map<string, string | null>();  // tenant|supplierName -> id|null

  for (let i = 0; i < body.rows.length; i++) {
    const r = body.rows[i];
    try {
      // 1. Brand (upsert by name + owner_tenant_id NULL — global)
      let brandId = brandCache.get(r.brand_name);
      if (!brandId) {
        const existing = await sb
          .from('lens_brand')
          .select('id')
          .eq('name', r.brand_name)
          .is('owner_tenant_id', null)
          .eq('is_deleted', false)
          .limit(1)
          .maybeSingle();
        if (existing.data) {
          brandId = existing.data.id;
          result.reused.brands++;
        } else {
          const ins = await sb
            .from('lens_brand')
            .insert({ name: r.brand_name, is_published: !!body.publish_immediately, owner_tenant_id: null })
            .select('id')
            .single();
          if (ins.error) throw ins.error;
          brandId = ins.data.id;
          result.inserted.brands++;
        }
        brandCache.set(r.brand_name, brandId);
      }

      // 2. Design (upsert by brand+name+owner_tenant_id NULL)
      const designKey = `${brandId}|${r.design_name}`;
      let designId = designCache.get(designKey);
      if (!designId) {
        const existing = await sb
          .from('lens_design')
          .select('id')
          .eq('brand_id', brandId)
          .eq('name', r.design_name)
          .is('owner_tenant_id', null)
          .eq('is_deleted', false)
          .limit(1)
          .maybeSingle();
        if (existing.data) {
          designId = existing.data.id;
          result.reused.designs++;
        } else {
          const ins = await sb
            .from('lens_design')
            .insert({
              brand_id: brandId,
              name: r.design_name,
              lens_type: r.lens_type,
              material: r.material ?? null,
              is_published: !!body.publish_immediately,
              owner_tenant_id: null,
            })
            .select('id')
            .single();
          if (ins.error) throw ins.error;
          designId = ins.data.id;
          result.inserted.designs++;
        }
        designCache.set(designKey, designId);
      }

      // 3. Variant (upsert by design+index+diameter+coating+tint)
      const variantKey = `${designId}|${r.refractive_index}|${r.diameter_mm}|${r.coating ?? ''}|${r.tint ?? ''}`;
      let variantId = variantCache.get(variantKey);
      if (!variantId) {
        // Coating/tint may be NULL — fetch candidates by the simple filters then
        // match the NULL-handling in JS (Postgrest's .is(...).eq(...) chains
        // don't compose the NULLS NOT DISTINCT semantics cleanly).
        const existingFiltered = await sb
          .from('lens_variant')
          .select('id, coating, tint')
          .eq('design_id', designId)
          .eq('refractive_index', r.refractive_index)
          .eq('diameter_mm', r.diameter_mm)
          .is('owner_tenant_id', null)
          .eq('is_deleted', false);
        if (existingFiltered.error) throw existingFiltered.error;
        const matchingVariant = (existingFiltered.data ?? []).find((row: any) =>
          (row.coating ?? null) === (r.coating ?? null) &&
          (row.tint ?? null) === (r.tint ?? null)
        );
        if (matchingVariant) {
          variantId = matchingVariant.id;
          result.reused.variants++;
        } else {
          // Get display_id from RPC
          const dispResp = await sb.rpc('next_lens_variant_display_id');
          if (dispResp.error) throw dispResp.error;
          const displayId = dispResp.data;
          const ins = await sb
            .from('lens_variant')
            .insert({
              design_id: designId,
              display_id: displayId,
              refractive_index: r.refractive_index,
              diameter_mm: r.diameter_mm,
              coating: r.coating ?? null,
              tint: r.tint ?? null,
              sph_min: r.sph_min,
              sph_max: r.sph_max,
              sph_step: r.sph_step ?? 0.25,
              cyl_min: r.cyl_min ?? null,
              cyl_max: r.cyl_max ?? null,
              cyl_step: r.cyl_step ?? null,
              add_min: r.add_min ?? null,
              add_max: r.add_max ?? null,
              add_step: r.add_step ?? null,
              is_published: !!body.publish_immediately,
              owner_tenant_id: null,
            })
            .select('id')
            .single();
          if (ins.error) throw ins.error;
          variantId = ins.data.id;
          result.inserted.variants++;
        }
        variantCache.set(variantKey, variantId);
      }

      // 4. Offering (only if supplier_name + price provided)
      if (r.supplier_name && r.price_amount != null) {
        const supKey = `${body.tenant_id}|${r.supplier_name}`;
        let supplierId = supplierCache.get(supKey);
        if (supplierId === undefined) {
          const sup = await sb
            .from('suppliers')
            .select('id')
            .eq('tenant_id', body.tenant_id)
            .eq('name', r.supplier_name)
            .eq('active', true)
            .limit(1)
            .maybeSingle();
          supplierId = sup.data?.id ?? null;
          supplierCache.set(supKey, supplierId);
        }
        if (!supplierId) {
          result.errors.push({ row: i + 1, error: `supplier '${r.supplier_name}' not found in tenant` });
          continue;
        }
        const existingOff = await sb
          .from('supplier_catalog_offering')
          .select('id')
          .eq('tenant_id', body.tenant_id)
          .eq('supplier_id', supplierId)
          .eq('variant_id', variantId)
          .eq('status', 'active')
          .eq('is_deleted', false)
          .limit(1)
          .maybeSingle();
        if (existingOff.data) {
          result.reused.offerings++;
        } else {
          const ins = await sb.from('supplier_catalog_offering').insert({
            tenant_id: body.tenant_id,
            supplier_id: supplierId,
            variant_id: variantId,
            production_type: r.production_type ?? 'stock',
            price_amount: r.price_amount,
            currency_code: r.currency_code ?? 'ILS',
            is_vat_inclusive: r.is_vat_inclusive ?? false,
            supplier_sku_code: r.supplier_sku_code ?? null,
          });
          if (ins.error) throw ins.error;
          result.inserted.offerings++;
        }
      }
    } catch (err: any) {
      result.errors.push({ row: i + 1, error: err.message ?? String(err) });
    }
  }

  return new Response(JSON.stringify(result), {
    status: result.errors.length > 0 ? 207 : 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

