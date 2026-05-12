// dispatch.ts — route automation plan items into crm_message_queue.
//
// 2026-05-12: was previously "direct dispatch" (Promise.allSettled of N parallel
// fetch() calls to send-message EF). At >~30 recipients the Edge Function hit
// CPU/timeout limits and silently dropped the rest — Prizma confirmed 2325
// recipients but only 30 actually sent. Same architectural failure mode that
// the manual broadcast UI had pre-2026-05-12.
//
// Now: insert all plan items into crm_message_queue. dispatch-queue EF (pg_cron
// every minute, throttled 500ms email / 1000ms SMS) drains the queue. Same path
// as broadcast wizard + queue_send automation rules — single source of truth.
//
// promoteWaitingLeadsToInvited still runs immediately after enqueue (browser
// parity) — promotion is deterministic per item, not gated on send success.

import { promoteWaitingLeadsToInvited } from "./post-actions.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export interface DispatchResult {
  sent: number;     // 0 — actual sends happen async via dispatch-queue
  failed: number;
  rejected: number;
  queued: number;   // new — count of rows inserted into crm_message_queue
}

const QUEUE_INSERT_CHUNK = 500;

export async function dispatchPlanDirect(
  db: Db,
  // deno-lint-ignore no-explicit-any
  items: any[],
  tenantId: string,
  _anonKey: string,
  _sendMessageUrl: string,
): Promise<DispatchResult> {
  if (!Array.isArray(items) || !items.length) {
    return { sent: 0, failed: 0, rejected: 0, queued: 0 };
  }

  const now = new Date().toISOString();
  const rows = items
    .filter((it) => it && it.lead_id && it.channel)
    .map((it) => ({
      tenant_id: tenantId,
      lead_id: it.lead_id,
      event_id: it.event_id || null,
      run_id: it.run_id || null,
      channel: it.channel,
      template_slug: it.template_slug || null,
      // No body/subject — send-message EF resolves the template from slug at
      // dispatch time, so substitutions use the freshest data.
      variables: it.variables || {},
      language: it.language || "he",
      status: "queued",
      scheduled_at: now,
    }));

  if (!rows.length) return { sent: 0, failed: 0, rejected: 0, queued: 0 };

  let queued = 0;
  let failed = 0;
  for (let i = 0; i < rows.length; i += QUEUE_INSERT_CHUNK) {
    const chunk = rows.slice(i, i + QUEUE_INSERT_CHUNK);
    const res = await db.from("crm_message_queue").insert(chunk);
    if (res.error) {
      console.error(`automation-engine queue insert chunk ${i}: ${res.error.message}`);
      failed += chunk.length;
    } else {
      queued += chunk.length;
    }
  }

  // promoteWaitingLeadsToInvited mirrors the browser-engine pattern of bumping
  // any waiting lead to 'invited' once the rule fired. Treat every queued
  // item as "ok" — the actual send happens later in dispatch-queue, but the
  // commitment to send has been made.
  const results = rows.map(() => ({ ok: true }));
  try { await promoteWaitingLeadsToInvited(db, tenantId, items, results); }
  catch (e) { console.error("automation-engine promoteWaitingLeadsToInvited:", (e as Error).message); }

  return { sent: 0, failed, rejected: 0, queued };
}
