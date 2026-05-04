// dispatch.ts — direct dispatch path (parity with crm-automation-dispatch.js).
// Posts to send-message EF for each plan item. Used by:
//   - cron path when rules return send_message planItems (no UI modal)
//   - Rung 2 approve path when client passes already-approved items.
// After dispatch, promoteWaitingLeadsToInvited runs (browser parity).

import { promoteWaitingLeadsToInvited } from "./post-actions.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export interface DispatchResult {
  sent: number;
  failed: number;
  rejected: number;
}

export async function dispatchPlanDirect(
  db: Db,
  // deno-lint-ignore no-explicit-any
  items: any[],
  tenantId: string,
  anonKey: string,
  sendMessageUrl: string,
): Promise<DispatchResult> {
  if (!Array.isArray(items) || !items.length) {
    return { sent: 0, failed: 0, rejected: 0 };
  }

  const calls = items.map((it) => callSendMessage(it, tenantId, anonKey, sendMessageUrl));
  const settled = await Promise.allSettled(calls);
  let sent = 0, failed = 0, rejected = 0;
  const results: { ok: boolean; error?: string }[] = [];
  settled.forEach((r) => {
    const v = r.status === "fulfilled" ? r.value : null;
    if (v && v.ok) { sent++; results.push({ ok: true }); }
    else if (v && v.error === "phone_not_allowed") { rejected++; results.push({ ok: false, error: "phone_not_allowed" }); }
    else { failed++; results.push({ ok: false, error: v?.error }); }
  });
  try { await promoteWaitingLeadsToInvited(db, tenantId, items, results); }
  catch (e) { console.error("automation-engine promoteWaitingLeadsToInvited:", (e as Error).message); }
  return { sent, failed, rejected };
}

async function callSendMessage(
  // deno-lint-ignore no-explicit-any
  item: any,
  tenantId: string, anonKey: string, sendMessageUrl: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const payload: Record<string, unknown> = {
      tenant_id: tenantId,
      lead_id: item.lead_id,
      channel: item.channel,
      template_slug: item.template_slug,
      variables: item.variables || {},
    };
    if (item.event_id) payload.event_id = item.event_id;
    if (item.run_id) payload.run_id = item.run_id;
    if (item.language) payload.language = item.language;
    const res = await fetch(sendMessageUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${anonKey}`,
        "apikey": anonKey,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(`send-message ${item.channel}/${item.template_slug} HTTP ${res.status}: ${txt.slice(0, 200)}`);
      const errData = txt.indexOf("phone_not_allowed") !== -1 ? "phone_not_allowed" : `http_${res.status}`;
      return { ok: false, error: errData };
    }
    return { ok: true };
  } catch (e) {
    console.error("send-message exception:", (e as Error).message);
    return { ok: false, error: "exception" };
  }
}
