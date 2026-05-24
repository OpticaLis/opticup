// dialog360.ts — Direct HTTP dispatch to Dialog360 WhatsApp Business API.
// Part of M4_WHATSAPP_CHANNEL_INFRA. WhatsApp sends use pre-approved Meta
// templates referenced by name + positional {{N}} params, NOT free-form body.
// Make is NOT used for WhatsApp (M12 Brief Pattern 2: Make is one-way only).

const DIALOG360_URL = "https://waba.360dialog.io/v1/messages";

interface DispatchParams {
  tenantId: string;
  leadId: string;
  eventId: string | null;
  runId: string | null;
  templateId: string | null;
  broadcastId: string | null;
  channel: "whatsapp";
  finalBody: string;
  finalSubject: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  shortLinkIds: string[];
  whatsappTemplateName?: string | null;
  whatsappTemplateVars?: string[];
}

interface LogRow {
  id: string;
}

// deno-lint-ignore no-explicit-any
type JsonResponseFn = (body: Record<string, unknown>, status?: number) => Response;
// deno-lint-ignore no-explicit-any
type DbClient = any;

export async function dispatchViaDialog360(
  db: DbClient,
  p: DispatchParams,
  logRow: LogRow,
  jsonResponse: JsonResponseFn,
): Promise<Response> {
  const apiKey = Deno.env.get("DIALOG360_API_KEY");
  if (!apiKey) {
    await db.from("crm_message_log").update({
      status: "failed",
      error_message: "dialog360_api_key_not_configured",
    }).eq("id", logRow.id);
    return jsonResponse({ ok: false, error: "dialog360_api_key_not_configured", log_id: logRow.id }, 500);
  }

  if (!p.whatsappTemplateName) {
    await db.from("crm_message_log").update({
      status: "failed",
      error_message: "whatsapp_template_name_missing",
    }).eq("id", logRow.id);
    return jsonResponse({ ok: false, error: "whatsapp_template_name_missing", log_id: logRow.id }, 400);
  }

  const phone = (p.recipientPhone || "").replace(/[\s+\-]/g, "");
  const to = phone.startsWith("0") ? "972" + phone.slice(1) : phone;

  const components: Record<string, unknown>[] = [];
  if (p.whatsappTemplateVars && p.whatsappTemplateVars.length > 0) {
    components.push({
      type: "body",
      parameters: p.whatsappTemplateVars.map((v) => ({ type: "text", text: v })),
    });
  }

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: p.whatsappTemplateName,
      language: { code: "he" },
      components,
    },
  };

  try {
    const res = await fetch(DIALOG360_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "D360-API-KEY": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const resBody = await res.text();
    let resJson: Record<string, unknown> = {};
    try { resJson = JSON.parse(resBody); } catch { /* non-JSON response */ }

    if (res.ok) {
      const messages = resJson.messages as { id: string }[] | undefined;
      const metaId = messages?.[0]?.id || null;
      await db.from("crm_message_log").update({
        status: "sent",
        meta_message_id: metaId,
      }).eq("id", logRow.id);
      return jsonResponse({ ok: true, log_id: logRow.id, meta_message_id: metaId, channel: "whatsapp" });
    }

    const errMsg = `dialog360_error_${res.status}: ${resBody.slice(0, 500)}`;
    await db.from("crm_message_log").update({
      status: "failed",
      error_message: errMsg,
    }).eq("id", logRow.id);
    return jsonResponse({ ok: false, error: errMsg, log_id: logRow.id }, 200);
  } catch (e) {
    const errMsg = `dialog360_network_error: ${(e as Error).message || String(e)}`;
    await db.from("crm_message_log").update({
      status: "failed",
      error_message: errMsg,
    }).eq("id", logRow.id);
    return jsonResponse({ ok: false, error: errMsg, log_id: logRow.id }, 200);
  }
}
