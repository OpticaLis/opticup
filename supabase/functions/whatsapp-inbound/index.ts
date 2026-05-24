// whatsapp-inbound — Dialog360 webhook handler for inbound messages + status updates.
// M4_WHATSAPP_CHANNEL_INFRA v1 scope: opt-out capture + delivery status only.
// Full inbox (conversations, threading, agent assignment) = M12 later.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

const OPT_OUT_PATTERNS = [/הסר/i, /stop/i, /unsubscribe/i, /הסירו/i];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Dialog360 webhook verification (GET with hub.challenge)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const challenge = url.searchParams.get("hub.challenge");
    if (challenge) {
      return new Response(challenge, { status: 200, headers: corsHeaders });
    }
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const payload = await req.json();
    const entries = payload?.entry || [];

    for (const entry of entries) {
      const changes = entry?.changes || [];
      for (const change of changes) {
        const value = change?.value;
        if (!value) continue;

        // --- Status updates (delivered / read / failed) ---
        const statuses = value.statuses || [];
        for (const s of statuses) {
          const metaId = s.id;
          const status = s.status; // delivered, read, failed, sent
          if (!metaId || !status) continue;

          const dbStatus = status === "read" ? "read"
            : status === "delivered" ? "delivered"
            : status === "failed" ? "failed"
            : null;

          if (dbStatus) {
            await db.from("crm_message_log")
              .update({ status: dbStatus })
              .eq("meta_message_id", metaId);
          }
        }

        // --- Inbound messages (opt-out capture) ---
        const messages = value.messages || [];
        for (const msg of messages) {
          const from = msg.from; // sender phone (e.g. "972533645404")
          const text = msg.text?.body || msg.button?.text || "";
          const msgType = msg.type; // text, button, etc.

          if (!from) continue;

          const isOptOut = OPT_OUT_PATTERNS.some((p) => p.test(text));

          if (isOptOut) {
            // Find lead by phone → suppress
            const normalizedPhone = from.startsWith("972") ? "0" + from.slice(3) : from;
            const { data: leads } = await db.from("crm_leads")
              .select("id, tenant_id")
              .or(`phone.eq.${from},phone.eq.${normalizedPhone},phone.eq.+${from}`)
              .limit(5);

            for (const lead of (leads || [])) {
              await db.rpc("crm_suppress_contact", {
                p_tenant_id: lead.tenant_id,
                p_phone: from,
                p_source: "whatsapp_opt_out",
              }).catch((e: Error) => console.warn("suppress failed:", e.message));

              await db.from("crm_leads")
                .update({ unsubscribed_at: new Date().toISOString() })
                .eq("id", lead.id)
                .is("unsubscribed_at", null);
            }

            console.log(`WhatsApp opt-out processed: ${from}, text: "${text}"`);
          }
        }
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("whatsapp-inbound error:", e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 200, // Return 200 even on errors to prevent Dialog360 from retrying
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
