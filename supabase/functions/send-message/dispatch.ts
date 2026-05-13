// dispatch.ts — final-stage dispatch helpers for send-message EF, extracted
// from index.ts (P31 commit 0c) so the parent stays under the 350-line cap
// after P31 adds injectLeadVariables + validateRequiredVariables.
//
// 2026-05-14 (M4_MESSAGE_PERFORMANCE_TRACKING): writeDispatchAndSend now
// also accepts shortLinkIds (array of short_links row ids created by
// injectAutoUrls earlier in the request) and backfills their message_log_id
// FK column once the pending crm_message_log row is inserted. The backfill
// is an awaited UPDATE so the linkage is durable before the function
// returns — if it failed silently, the analytics view would show clicked
// messages without their corresponding sent rows.

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
  shortLinkIds: string[];
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

  // --- Backfill short_links.message_log_id (M4_MESSAGE_PERFORMANCE_TRACKING) ---
  // injectAutoUrls earlier in the request inserted 0..2 rows in short_links
  // (unsubscribe + optional registration). Their message_log_id was NULL at
  // insert time because the log row didn't exist yet. Now it does — link them.
  if (p.shortLinkIds.length > 0) {
    const { error: linkErr } = await db
      .from("short_links")
      .update({ message_log_id: logRow.id })
      .in("id", p.shortLinkIds);
    if (linkErr) {
      // Non-fatal: the message will still send. Analytics view will miss
      // these links until/unless someone backfills. Log loudly so it's
      // visible in EF logs.
      console.warn(
        "short_links.message_log_id backfill failed for log",
        logRow.id, ":", linkErr.message,
      );
    }
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
