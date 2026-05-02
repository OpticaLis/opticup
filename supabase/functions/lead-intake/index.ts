import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// lead-intake — Edge Function for public lead form submission
// Module 4 CRM — Go-Live Phase P1 (+ P4 dispatch wiring, 2026-04-22)
// ============================================================
// Flow: POST { tenant_slug, name, phone, ... } → validate →
//       resolve tenant → normalize phone → duplicate check →
//       INSERT crm_leads (or return existing) → dispatch
//       SMS + email via `send-message` Edge Function.
// Replaces the old Monday.com + Make lead-creation pipeline.
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Legacy JWT-format anon key — the gateway's verify_jwt rejects the newer
// `sb_publishable_*` key format that `SUPABASE_ANON_KEY` env var returns.
// This is the same key already present in js/shared.js (git-tracked), so
// hardcoding here is not a new exposure. Supabase issue:
// https://github.com/supabase/supabase/issues/ — see project publishable keys.
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU";

const DEFAULT_SOURCE = "supersale_form";

const EYE_EXAM_OPTIONS: readonly string[] = [
  "לא, אין צורך בבדיקה",
  "כן, בדיקה רגילה",
  "כן, בדיקת מולטיפוקל",
  "יש לי כבר מרשם עדכני",
] as const;

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

function boolOrFalse(v: unknown): boolean {
  return v === true || v === "true" || v === 1 || v === "1";
}

/**
 * Normalize a phone number to E.164.
 * Accepts Israeli local format (0XXXXXXXXX, 10 digits starting with 0)
 * or already-international (+972..., 972...).
 * Returns the canonical +CC... string, or null if invalid.
 */
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  // Keep leading + if present, strip everything else non-digit.
  const hasPlus = raw.trim().startsWith("+");
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 0) return null;

  let e164: string;

  if (hasPlus) {
    // Already international — trust the country code as typed.
    e164 = "+" + digits;
  } else if (digits.startsWith("972")) {
    // 972... without plus → just add +
    e164 = "+" + digits;
  } else if (digits.startsWith("0") && digits.length === 10) {
    // Israeli local 0XXXXXXXXX → +972XXXXXXXXX
    e164 = "+972" + digits.slice(1);
  } else {
    // Unknown format — reject rather than guess.
    return null;
  }

  // E.164 allows 8–15 digits after the +. Require at least 10 for real phones.
  const withoutPlus = e164.slice(1);
  if (!/^\d{10,15}$/.test(withoutPlus)) return null;

  return e164;
}

// Rung 2 (P5_V2_REBUILD_RUNG2_RULES_REWIRE): dispatch helpers extracted to
// dispatch.ts to keep this file under Rule 12 cap and to add the Rule 2.1
// fresh-lead path (active-event lookup + T5/T1 branch + attendee upsert).
import { dispatchFreshLead, dispatchIntakeMessages } from "./dispatch.ts";

// --- Main handler ---

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // --- Parse body ---
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  // --- Validate required fields ---
  // Email made REQUIRED 2026-04-29 (post-cutover-prep): every CRM lead must
  // carry both phone AND email so T1/T2/T5 templates can dispatch on both
  // channels. Defense-in-depth: storefront form is also expected to enforce
  // email-required client-side (P5_7_STOREFRONT_FORM_REWIRE).
  const tenantSlug = trimOrNull(body.tenant_slug);
  const name = trimOrNull(body.name);
  const phoneRaw = trimOrNull(body.phone);
  const emailRaw = trimOrNull(body.email);

  if (!tenantSlug) return errorResponse("Missing tenant_slug", 400);
  if (!name) return errorResponse("Missing name", 400);
  if (!phoneRaw) return errorResponse("Missing phone", 400);
  if (!emailRaw) return errorResponse("Missing email", 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) return errorResponse("Invalid email format", 400);

  // --- Normalize phone ---
  const phone = normalizePhone(phoneRaw);
  if (!phone) return errorResponse("Invalid phone number", 400);

  // --- Optional fields ---
  const email = emailRaw;
  const eyeExam = trimOrNull(body.eye_exam);
  if (eyeExam !== null && !EYE_EXAM_OPTIONS.includes(eyeExam)) {
    return errorResponse("INVALID_EYE_EXAM_DEFAULT", 400);
  }
  const notes = trimOrNull(body.notes);
  const language = trimOrNull(body.language) || "he";
  const source = trimOrNull(body.source) || DEFAULT_SOURCE;
  const utm_source = trimOrNull(body.utm_source);
  const utm_medium = trimOrNull(body.utm_medium);
  const utm_campaign = trimOrNull(body.utm_campaign);
  const utm_content = trimOrNull(body.utm_content);
  const utm_term = trimOrNull(body.utm_term);
  const utm_campaign_id = trimOrNull(body.utm_campaign_id);
  const termsApproved = boolOrFalse(body.terms_approved);
  const marketingConsent = boolOrFalse(body.marketing_consent);

  // eye_exam now writes to crm_leads.eye_exam_default directly (Rung 1, 2026-05-03).
  // client_notes carries only the free-text notes field, if any.
  const clientNotes: string | null = notes ? notes : null;

  // --- Service-role DB client (bypasses RLS, server-side only) ---
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // --- Resolve tenant from slug ---
  const { data: tenant, error: tenantErr } = await db
    .from("tenants")
    .select("id, is_active")
    .eq("slug", tenantSlug)
    .single();

  if (tenantErr || !tenant) {
    return errorResponse("invalid tenant", 401);
  }
  if (!tenant.is_active) {
    return errorResponse("tenant inactive", 403);
  }

  const tenantId: string = tenant.id;

  // --- Duplicate check (tenant-scoped, by normalized phone) ---
  const { data: existing, error: dupErr } = await db
    .from("crm_leads")
    .select("id, full_name")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .eq("is_deleted", false)
    .limit(1)
    .maybeSingle();

  if (dupErr) {
    console.error("Duplicate-check error:", dupErr);
    return errorResponse("Database error", 500);
  }

  if (existing) {
    // If the returning lead was unsubscribed, clear it — re-registration = implicit resubscribe
    await db.from("crm_leads")
      .update({ unsubscribed_at: null, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .eq("tenant_id", tenantId)
      .not("unsubscribed_at", "is", null);

    await dispatchIntakeMessages(
      db,
      tenantId,
      existing.id,
      "lead_intake_duplicate",
      existing.full_name || name,
      phone,
      email,
    );
    return jsonResponse({
      duplicate: true,
      is_new: false,
      id: existing.id,
      existing_name: existing.full_name,
    }, 409);
  }

  // --- Build insert row ---
  const nowIso = new Date().toISOString();
  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    full_name: name,
    phone,
    email,
    language,
    status: "new",
    source,
    utm_source,
    utm_medium,
    utm_campaign,
    utm_content,
    utm_term,
    utm_campaign_id,
    client_notes: clientNotes,
    eye_exam_default: eyeExam,
    terms_approved: termsApproved,
    terms_approved_at: termsApproved ? nowIso : null,
    marketing_consent: marketingConsent,
  };

  const { data: inserted, error: insErr } = await db
    .from("crm_leads")
    .insert(row)
    .select("id")
    .single();

  if (insErr || !inserted) {
    // Race condition safety: if the UNIQUE constraint fires between our
    // duplicate-check and the insert (concurrent submit of same phone),
    // Postgres returns a 23505. Treat it as a duplicate, look up the row,
    // and return a 409 — matches the non-race duplicate branch.
    // deno-lint-ignore no-explicit-any
    const code = (insErr as any)?.code;
    if (code === "23505") {
      // 23505: race-safety — return existing ACTIVE lead (is_deleted=false).
      // The partial unique index `WHERE is_deleted=false` enforces that a
      // soft-deleted row never blocks a new active row at the DB level; this
      // mirrors that filter at the application level.
      const { data: racedRow } = await db
        .from("crm_leads")
        .select("id, full_name")
        .eq("tenant_id", tenantId)
        .eq("phone", phone)
        .eq("is_deleted", false)
        .limit(1)
        .maybeSingle();
      if (racedRow?.id) {
        await dispatchIntakeMessages(
          db,
          tenantId,
          racedRow.id,
          "lead_intake_duplicate",
          racedRow.full_name || name,
          phone,
          email,
        );
      }
      return jsonResponse({
        duplicate: true,
        is_new: false,
        id: racedRow?.id ?? null,
        existing_name: racedRow?.full_name ?? null,
      }, 409);
    }
    console.error("Insert error:", insErr);
    return errorResponse("Could not create lead", 500);
  }

  await dispatchFreshLead(db, tenantId, inserted.id, name, phone, email);

  return jsonResponse({
    id: inserted.id,
    is_new: true,
  }, 201);
});
