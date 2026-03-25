import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ============================================================
// remove-background — Professional background removal via remove.bg
// Optic Up Multi-Tenant SaaS
// ============================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REMOVE_BG_API_KEY = Deno.env.get("REMOVE_BG_API_KEY");
const REMOVE_BG_URL = "https://api.remove.bg/v1.0/removebg";
const TIMEOUT_MS = 30_000;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonRes(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function errRes(message: string, status: number): Response {
  return jsonRes({ error: message, success: false }, status);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errRes("Method not allowed", 405);

  // Validate API key is configured
  if (!REMOVE_BG_API_KEY) return errRes("Background removal service not configured", 503);

  // Parse input
  let imageBase64: string;
  try {
    const body = await req.json();
    imageBase64 = body.image_base64;
  } catch { return errRes("Invalid JSON body", 400); }
  if (!imageBase64 || typeof imageBase64 !== "string") return errRes("Missing image_base64", 400);

  // Validate JWT via auth_sessions
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return errRes("Missing authorization", 401);

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: sess, error: sessErr } = await db.from("auth_sessions")
    .select("id, employee_id, tenant_id").eq("token", auth.replace("Bearer ", ""))
    .eq("is_active", true).single();
  if (sessErr || !sess) return errRes("Invalid or expired session", 401);

  const tenantId = sess.tenant_id;

  // Convert base64 to binary blob for FormData upload
  const binaryStr = atob(imageBase64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const imageBlob = new Blob([bytes], { type: "image/png" });

  // Call remove.bg API
  const formData = new FormData();
  formData.append("image_file", imageBlob, "image.png");
  formData.append("size", "auto");
  formData.append("bg_color", "FFFFFF");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

  let resultBytes: Uint8Array;
  try {
    const res = await fetch(REMOVE_BG_URL, {
      method: "POST",
      headers: { "X-Api-Key": REMOVE_BG_API_KEY },
      body: formData,
      signal: ctrl.signal,
    });
    clearTimeout(timer);

    if (res.status === 402) return errRes("קרדיט API נגמר — פנה למנהל", 402);
    if (res.status === 429) return errRes("יותר מדי בקשות — נסה שוב בעוד דקה", 429);
    if (!res.ok) {
      const errText = await res.text();
      console.error("remove.bg error:", res.status, errText);
      return errRes("שגיאה בשירות הסרת רקע", res.status);
    }

    resultBytes = new Uint8Array(await res.arrayBuffer());
  } catch (err: unknown) {
    clearTimeout(timer);
    const e = err as Error;
    if (e.name === "AbortError") return errRes("שירות הסרת רקע — timeout", 504);
    console.error("remove.bg fetch error:", e.message);
    return errRes("שגיאה בשירות הסרת רקע", 500);
  }

  // Convert result to base64
  let resultBase64 = "";
  const chunk = 8192;
  for (let i = 0; i < resultBytes.length; i += chunk) {
    resultBase64 += String.fromCharCode(...resultBytes.subarray(i, i + chunk));
  }
  resultBase64 = btoa(resultBase64);

  // Log usage (non-blocking)
  db.from("activity_log").insert({
    tenant_id: tenantId, user_id: sess.employee_id,
    action: "bg_removal_api", entity_type: "image",
    details: { method: "remove.bg", result_size: resultBytes.length },
    level: "info",
  }).then(() => {});

  return jsonRes({
    success: true,
    image_base64: resultBase64,
    format: "png",
    size: resultBytes.length,
  });
});
