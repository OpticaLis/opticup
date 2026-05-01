// dispatch.ts — final-stage dispatch helpers for send-message EF, extracted
// from index.ts (P31 commit 0c) so the parent stays under the 350-line cap
// after P31 adds injectLeadVariables + validateRequiredVariables. No logic
// changes — the writeDispatchAndSend body is byte-for-byte the same as the
// original code in index.ts after the allowlist+recipient checks.

interface DispatchParams {
  tenantId: string;
  leadId: string;
  eventId: string | null;
  runId: string | null;
  templateId: string | null;
  channel: "sms" | "email";
  finalBody: string;
  finalSubject: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
}

type JsonResponseFn = (body: Record<string, unknown>, status?: number) => Response;

// deno-lint-ignore no-explicit-any
export async function writeDispatchAndSend(
  db: any,
  p: DispatchParams,
  makeWebhookUrl: string,
  jsonResponse: JsonResponseFn,
): Promise<Response> {
  // --- Write log (pending) ---
  const { data: logRow, error: logErr } = await db
    .from("crm_message_log")
    .insert({
      tenant_id: p.tenantId,
      lead_id: p.leadId,
      event_id: p.eventId,
      run_id: p.runId,
      template_id: p.templateId,
      channel: p.channel,
      content: p.finalBody,
      status: "pending",
    })
    .select("id")
    .single();

  if (logErr || !logRow) {
    console.error("Log insert failed:", logErr);
    return jsonResponse({ ok: false, error: "Could not create log entry" }, 500);
  }

  // --- Call Make webhook ---
  if (!makeWebhookUrl) {
    await db
      .from("crm_message_log")
      .update({
        status: "failed",
        error_message: "make_webhook_url_not_configured",
      })
      .eq("id", logRow.id);
    return jsonResponse(
      { ok: false, error: "make_webhook_url_not_configured", log_id: logRow.id },
      500,
    );
  }

  const makePayload = {
    channel: p.channel,
    recipient_phone: p.recipientPhone,
    recipient_email: p.recipientEmail,
    subject: p.finalSubject,
    body: p.finalBody,
  };

  try {
    const makeRes = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(makePayload),
    });

    if (!makeRes.ok) {
      const errText = await makeRes.text().catch(() => "");
      await db
        .from("crm_message_log")
        .update({
          status: "failed",
          error_message: `make_webhook_${makeRes.status}: ${errText.slice(0, 200)}`,
        })
        .eq("id", logRow.id);
      return jsonResponse(
        {
          ok: false,
          error: "make_webhook_error",
          status: makeRes.status,
          log_id: logRow.id,
        },
        502,
      );
    }

    await db
      .from("crm_message_log")
      .update({ status: "sent" })
      .eq("id", logRow.id);

    return jsonResponse(
      { ok: true, log_id: logRow.id, channel: p.channel, template_id: p.templateId },
      200,
    );
  } catch (e) {
    const msg = (e as Error).message || String(e);
    await db
      .from("crm_message_log")
      .update({
        status: "failed",
        error_message: `make_call_exception: ${msg.slice(0, 200)}`,
      })
      .eq("id", logRow.id);
    return jsonResponse(
      {
        ok: false,
        error: "make_call_exception",
        message: msg,
        log_id: logRow.id,
      },
      500,
    );
  }
}
