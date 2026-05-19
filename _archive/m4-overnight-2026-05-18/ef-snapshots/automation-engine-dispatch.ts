// dispatch.ts — route automation plan items into crm_message_queue.
//
// History:
// - Pre-2026-05-12: "direct dispatch" (Promise.allSettled of N parallel
//   fetch() calls to send-message EF). Hit CPU/timeout at ~30 recipients.
// - 2026-05-12 morning: switched to queue insertion + immediate eager
//   promote-to-invited. Problem: promote ran BEFORE actual delivery, so a
//   recipient whose send later failed was still marked 'invited'.
// - 2026-05-12 evening: removed eager promote. Promotion is now event-driven
//   via the DB trigger `trg_promote_lead_on_message_sent` (migration
//   promote_lead_on_message_sent), which fires when crm_message_queue.status
//   flips to 'sent'. Failed sends → lead stays 'waiting' as it should.

// deno-lint-ignore no-explicit-any
type Db = any;

export interface DispatchResult {
  sent: number;     // 0 — actual sends happen async via dispatch-queue
  failed: number;
  rejected: number;
  queued: number;   // count of rows inserted into crm_message_queue
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

  // Lead status promotion (waiting → invited) used to happen here eagerly.
  // Moved to DB trigger `trg_promote_lead_on_message_sent` (2026-05-12) so
  // promotion only fires after the message is actually delivered, not at
  // queue time. Failed sends now correctly leave the lead at 'waiting'.

  return { sent: 0, failed, rejected: 0, queued };
}
