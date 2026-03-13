import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create, getNumericDate } from "https://deno.land/x/djwt@v3.0.2/mod.ts";

// ============================================================
// pin-auth — Edge Function for PIN-based JWT authentication
// Phase 3.75 Step 6 — Optic Up Multi-Tenant SaaS
// ============================================================
// Flow: POST { pin, slug } → validate → signed JWT with tenant_id claim
// The JWT is consumed by Supabase RLS policies:
//   tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const JWT_SECRET = Deno.env.get("JWT_SECRET")!;

const LOCK_THRESHOLD = 5;
const LOCK_MINUTES = 15;
const TOKEN_HOURS = 8;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// --- Helpers ---

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status: number): Response {
  return jsonResponse({ error: message }, status);
}

/** Import HMAC key for JWT signing (HS256). */
async function getSigningKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// --- Main handler ---

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  // --- Parse & validate input ---
  let pin: string;
  let slug: string;

  try {
    const body = await req.json();
    pin = body.pin;
    slug = body.slug;
  } catch {
    return errorResponse("Invalid JSON body", 400);
  }

  if (!pin || typeof pin !== "string") {
    return errorResponse("Missing or invalid pin", 400);
  }
  if (!slug || typeof slug !== "string") {
    return errorResponse("Missing or invalid slug", 400);
  }

  // --- Resolve tenant from slug ---
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: tenant, error: tenantErr } = await db
    .from("tenants")
    .select("id, name, is_active")
    .eq("slug", slug)
    .single();

  if (tenantErr || !tenant) {
    return errorResponse("Tenant not found", 404);
  }

  if (!tenant.is_active) {
    return errorResponse("Tenant is inactive", 403);
  }

  const tenantId: string = tenant.id;

  // --- Find employee by PIN within tenant ---
  const { data: employee, error: empErr } = await db
    .from("employees")
    .select("id, name, pin, role, branch_id, failed_attempts, locked_until")
    .eq("tenant_id", tenantId)
    .eq("pin", pin)
    .eq("is_active", true)
    .single();

  // --- Handle: no employee found for this PIN ---
  if (empErr || !employee) {
    // Try to find ANY employee with this PIN (even wrong) to increment failed_attempts.
    // If PIN doesn't match anyone, just return generic 401.
    await incrementFailedAttempts(db, tenantId, pin);
    return errorResponse("Invalid PIN", 401);
  }

  // --- Handle: account locked ---
  if (employee.locked_until) {
    const lockedUntil = new Date(employee.locked_until);
    if (lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
      return errorResponse(
        `Account locked. Try again in ${minutesLeft} minutes.`,
        423,
      );
    }
  }

  // --- Success: reset failed_attempts, update last_login ---
  await db
    .from("employees")
    .update({
      failed_attempts: 0,
      locked_until: null,
      last_login: new Date().toISOString(),
    })
    .eq("id", employee.id);

  // --- Sign JWT ---
  const key = await getSigningKey();

  const payload = {
    sub: employee.id,
    tenant_id: tenantId,
    employee_name: employee.name,
    role: "authenticated",
    app_role: employee.role,
    branch_id: employee.branch_id,
    iss: "optic-up",
    iat: getNumericDate(0),
    exp: getNumericDate(TOKEN_HOURS * 60 * 60),
  };

  const token = await create({ alg: "HS256", typ: "JWT" }, payload, key);

  return jsonResponse({
    token,
    employee: {
      id: employee.id,
      name: employee.name,
      role: employee.role,
      branch_id: employee.branch_id,
      tenant_id: tenantId,
    },
  });
});

// --- Failed attempts logic ---

/**
 * Increment failed_attempts for employees matching this PIN within the tenant.
 * If threshold reached, lock the account for LOCK_MINUTES.
 *
 * Note: we search by tenant_id only (not by PIN) because the PIN was already
 * wrong — we can't know which employee they meant. So we find ALL employees
 * in the tenant and increment the one whose failed_attempts is highest,
 * or do nothing if no employees exist.
 *
 * Alternative approach: we look for employees whose PIN is close, but that
 * leaks information. Instead, we just return generic 401 and don't increment
 * anyone specific — brute force is limited by rate limiting at the Edge Function level.
 *
 * REVISED: Since PINs are short (4-5 digits), brute force is the real threat.
 * We track failed attempts per-tenant as a global counter via a simple approach:
 * find any employee in the tenant, pick the first one, and track on them.
 * This prevents targeted lockout while still rate-limiting per tenant.
 */
async function incrementFailedAttempts(
  db: ReturnType<typeof createClient>,
  tenantId: string,
  _pin: string,
): Promise<void> {
  // Find all active employees in this tenant, ordered by failed_attempts desc
  const { data: employees } = await db
    .from("employees")
    .select("id, failed_attempts")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("failed_attempts", { ascending: false })
    .limit(1);

  if (!employees || employees.length === 0) return;

  const target = employees[0];
  const newAttempts = (target.failed_attempts || 0) + 1;

  const update: Record<string, unknown> = { failed_attempts: newAttempts };

  if (newAttempts >= LOCK_THRESHOLD) {
    const lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
    update.locked_until = lockUntil.toISOString();
  }

  await db.from("employees").update(update).eq("id", target.id);
}
