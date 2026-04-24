import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// unsubscribe — one-click list removal (P10 + STOREFRONT_FORMS P-A, 2026-04-23).
// Flow: GET ?token=<b64url(payload).b64url(sig)> → verify HMAC → UPDATE
// crm_leads SET unsubscribed_at=now() → return HTML or JSON.
// Content negotiation: `Accept: application/json` → JSON {success,message}.
// Anything else (browser default) → branded HTML page (backwards compat).
// Token: b64url(`${lead_id}:${tenant_id}:${exp}`).b64url(HMAC(SERVICE_ROLE_KEY)).
// verify_jwt=false; HMAC signature is the auth.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// --- base64url (no padding) ---

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4;
  const padded = s + (pad === 0 ? "" : "=".repeat(4 - pad));
  const bin = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// --- HMAC ---

async function hmacSha256(keyStr: string, msg: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(keyStr),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return new Uint8Array(sig);
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// --- Token verification ---

type TokenPayload = { leadId: string; tenantId: string; exp: number };

async function verifyToken(token: string): Promise<TokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  let payloadBytes: Uint8Array;
  let providedSig: Uint8Array;
  try {
    payloadBytes = b64urlDecode(parts[0]);
    providedSig = b64urlDecode(parts[1]);
  } catch {
    return null;
  }
  const payload = new TextDecoder().decode(payloadBytes);
  const expectedSig = await hmacSha256(SERVICE_ROLE_KEY, payload);
  if (!timingSafeEqual(providedSig, expectedSig)) return null;

  const [leadId, tenantId, expStr] = payload.split(":");
  if (!leadId || !tenantId || !expStr) return null;
  const exp = Number.parseInt(expStr, 10);
  if (!Number.isFinite(exp)) return null;
  if (exp < Math.floor(Date.now() / 1000)) return null;
  return { leadId, tenantId, exp };
}

// --- HTML page helper ---

type HtmlOpts = {
  kind?: "success" | "error";
  logoUrl?: string | null;
  tenantName?: string | null;
};

function htmlPage(
  titleHe: string,
  bodyHe: string,
  status: number,
  opts: HtmlOpts = {},
): Response {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const isSuccess = opts.kind === "success";
  const iconSvg = isSuccess
    ? '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="#4f46e5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#eef2ff" stroke="#4f46e5"/><path d="M8 12.5l3 3 5-6"/></svg>'
    : '<svg viewBox="0 0 24 24" width="56" height="56" fill="none" stroke="#e11d48" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10" fill="#fff1f2" stroke="#e11d48"/><path d="M12 8v4"/><circle cx="12" cy="16" r="0.5" fill="#e11d48"/></svg>';
  const logoBlock = opts.logoUrl
    ? `<img src="${esc(opts.logoUrl)}" alt="${esc(opts.tenantName || "logo")}" style="max-height:64px;max-width:200px;margin:0 auto 24px;display:block;object-fit:contain">`
    : "";
  const accent = isSuccess ? "#4f46e5" : "#e11d48";
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titleHe)}</title>
<style>
body { font-family: 'Heebo', 'Arial', sans-serif; background:linear-gradient(135deg,#eef2ff 0%,#f8fafc 60%); color:#1e293b;
  display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:16px; box-sizing:border-box; }
.card { background:white; border:1px solid #e2e8f0; border-radius:20px; padding:48px 32px;
  max-width:480px; width:100%; text-align:center; box-shadow:0 10px 40px rgba(79,70,229,.08); border-top:4px solid ${accent}; box-sizing:border-box; }
.icon { margin:0 auto 20px; display:block; }
h1 { font-size:22px; margin:0 0 12px; color:#0f172a; font-weight:700; }
p { font-size:15px; line-height:1.7; color:#475569; margin:0 0 8px; }
.foot { margin-top:24px; padding-top:20px; border-top:1px solid #f1f5f9; font-size:13px; color:#94a3b8; }
</style>
</head>
<body>
<div class="card">
${logoBlock}
<div class="icon">${iconSvg}</div>
<h1>${esc(titleHe)}</h1>
<p>${esc(bodyHe)}</p>
<div class="foot">ניתן לסגור חלון זה</div>
</div>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
  });
}

// STOREFRONT_FORMS P-A: JSON response for storefront/API callers.
function jsonPage(success: boolean, titleHe: string, bodyHe: string, status: number): Response {
  return new Response(
    JSON.stringify({ success, message: bodyHe, title: titleHe }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } },
  );
}

function prefersJson(req: Request): boolean {
  const accept = req.headers.get("accept") || "";
  return accept.toLowerCase().includes("application/json");
}

// --- Main handler ---

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const wantsJson = prefersJson(req);
  const respond = (
    kind: "success" | "error",
    titleHe: string,
    bodyHe: string,
    status: number,
    opts: Omit<HtmlOpts, "kind"> = {},
  ): Response => {
    if (wantsJson) return jsonPage(kind === "success", titleHe, bodyHe, status);
    return htmlPage(titleHe, bodyHe, status, { kind, ...opts });
  };

  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  if (!token) {
    return respond(
      "error",
      "קישור לא תקין",
      "הקישור להסרה חסר — לא ניתן לעבד את הבקשה.",
      400,
    );
  }

  const parsed = await verifyToken(token);
  if (!parsed) {
    return respond(
      "error",
      "קישור לא תקין או שפג תוקפו",
      "לא ניתן לאמת את הקישור. ייתכן שהקישור שונה, פג תוקפו, או נוצר במערכת אחרת.",
      400,
    );
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch tenant branding (best-effort — fall back to un-branded page on error)
  let logoUrl: string | null = null;
  let tenantName: string | null = null;
  try {
    const tRes = await db
      .from("tenants")
      .select("name, logo_url")
      .eq("id", parsed.tenantId)
      .maybeSingle();
    if (tRes.data) {
      logoUrl = tRes.data.logo_url || null;
      tenantName = tRes.data.name || null;
    }
  } catch (_) {
    // branding is optional — ignore failures
  }

  const { data, error } = await db
    .from("crm_leads")
    .update({
      unsubscribed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      status: "unsubscribed",
    })
    .eq("id", parsed.leadId)
    .eq("tenant_id", parsed.tenantId)
    .select("id, full_name")
    .maybeSingle();

  if (error) {
    console.error("unsubscribe update failed:", error);
    return respond(
      "error",
      "שגיאה זמנית",
      "לא הצלחנו לעבד את הבקשה כעת. אנא נסה שוב מאוחר יותר.",
      500,
      { logoUrl, tenantName },
    );
  }
  if (!data) {
    return respond(
      "error",
      "קישור לא תקין",
      "לא נמצא מנוי מתאים. ייתכן שכבר הוסר בעבר.",
      404,
      { logoUrl, tenantName },
    );
  }

  return respond(
    "success",
    "הוסרת מרשימת התפוצה בהצלחה",
    "הסרנו אותך מרשימת ההתראות שלנו. לא תקבל עוד הודעות בנושא.",
    200,
    { logoUrl, tenantName },
  );
});
