import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// facebook-campaigns-sync — Edge Function for Make → Supabase pipeline
// Module 4 CRM — M4_CAMPAIGNS_SCREEN
// ============================================================
// Flow: Make scenario polls Facebook every 4 hours, posts an array of
//       campaigns here. Per campaign we do 2 UPSERTs:
//         1. crm_facebook_campaigns (metadata, 1 row per campaign)
//         2. crm_ad_spend (snapshot, 1 row per campaign per spend_date)
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

function trimOrNull(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
}

function numOrZero(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return isFinite(n) ? n : 0;
}

interface InboundCampaign {
  campaign_id: string;
  name?: string;
  status?: string;
  event_type?: string | null;
  daily_budget?: number | string | null;
  master?: string | null;
  interests?: string | null;
  total_spend?: number | string | null;
  raw_data?: Record<string, unknown> | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  const tenantSlug = trimOrNull(body.tenant_slug);
  if (!tenantSlug) return errorResponse("Missing tenant_slug", 400);

  const campaignsRaw = body.campaigns;
  if (!Array.isArray(campaignsRaw)) {
    return errorResponse("Missing or invalid campaigns array", 400);
  }
  const campaigns = campaignsRaw as InboundCampaign[];

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Resolve tenant
  const { data: tenant, error: tenantErr } = await db
    .from("tenants")
    .select("id, is_active")
    .eq("slug", tenantSlug)
    .single();

  if (tenantErr || !tenant) return errorResponse("invalid tenant", 401);
  if (!tenant.is_active) return errorResponse("tenant inactive", 403);

  const tenantId: string = tenant.id;
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  let metadataInserted = 0;
  let metadataUpdated = 0;
  let spendInserted = 0;
  let spendUpdated = 0;
  const errors: { campaign_id: string; error: string }[] = [];

  for (const c of campaigns) {
    const campaignId = trimOrNull(c.campaign_id);
    if (!campaignId) {
      errors.push({ campaign_id: String(c.campaign_id ?? ""), error: "missing campaign_id" });
      continue;
    }

    // 1. Metadata UPSERT
    const { data: existingMeta } = await db
      .from("crm_facebook_campaigns")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .maybeSingle();

    const metaRow = {
      tenant_id: tenantId,
      campaign_id: campaignId,
      name: trimOrNull(c.name) || campaignId,
      status: trimOrNull(c.status) || "unknown",
      event_type: trimOrNull(c.event_type as unknown),
      daily_budget: numOrZero(c.daily_budget),
      master: trimOrNull(c.master as unknown),
      interests: trimOrNull(c.interests as unknown),
      raw_data: c.raw_data ?? null,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existingMeta) {
      const { error } = await db
        .from("crm_facebook_campaigns")
        .update(metaRow)
        .eq("id", existingMeta.id)
        .eq("tenant_id", tenantId);
      if (error) {
        errors.push({ campaign_id: campaignId, error: "metadata update: " + error.message });
        continue;
      }
      metadataUpdated++;
    } else {
      const { error } = await db
        .from("crm_facebook_campaigns")
        .insert(metaRow);
      if (error) {
        errors.push({ campaign_id: campaignId, error: "metadata insert: " + error.message });
        continue;
      }
      metadataInserted++;
    }

    // 2. Spend snapshot UPSERT (one row per campaign per spend_date)
    const { data: existingSpend } = await db
      .from("crm_ad_spend")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("campaign_id", campaignId)
      .eq("spend_date", today)
      .maybeSingle();

    const spendRow = {
      tenant_id: tenantId,
      campaign_id: campaignId,
      spend_date: today,
      total_spend: numOrZero(c.total_spend),
      updated_at: new Date().toISOString(),
    };

    if (existingSpend) {
      const { error } = await db
        .from("crm_ad_spend")
        .update(spendRow)
        .eq("id", existingSpend.id)
        .eq("tenant_id", tenantId);
      if (error) {
        errors.push({ campaign_id: campaignId, error: "spend update: " + error.message });
        continue;
      }
      spendUpdated++;
    } else {
      const { error } = await db
        .from("crm_ad_spend")
        .insert(spendRow);
      if (error) {
        errors.push({ campaign_id: campaignId, error: "spend insert: " + error.message });
        continue;
      }
      spendInserted++;
    }
  }

  return jsonResponse({
    ok: errors.length === 0,
    processed: campaigns.length,
    metadata_inserted: metadataInserted,
    metadata_updated: metadataUpdated,
    spend_inserted: spendInserted,
    spend_updated: spendUpdated,
    errors: errors.length > 0 ? errors : undefined,
  }, errors.length > 0 ? 207 : 200);
});
