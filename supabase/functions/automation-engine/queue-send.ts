// queue-send.ts — server port of crm-automation-queue-send.js.
// Writes future-scheduled rows into crm_message_queue (drained by
// dispatch-queue EF every minute via pg_cron). Idempotency guaranteed by
// uq_crm_message_queue_idem (UNIQUE on tenant_id, event_id, lead_id,
// template_slug, channel WHERE status IN queued/processing/sent).

import { resolveRecipients, type Lead } from "./recipients.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

interface Rule {
  id: string;
  name?: string;
  // deno-lint-ignore no-explicit-any
  action_config: any;
}

export interface QueueSendResult {
  queued: number;
  leadIds: string[];
}

export async function prepareQueueSend(
  db: Db, tenantId: string, rule: Rule,
  triggerData: Record<string, unknown>,
  runId: string | null,
): Promise<QueueSendResult> {
  const cfg = rule.action_config || {};
  const eventId = (typeof triggerData.eventId === "string") ? triggerData.eventId : null;
  if (!tenantId || !eventId) return { queued: 0, leadIds: [] };

  const schedule = cfg.schedule || {};
  const offsetDays = parseInt(schedule.offset_days, 10) || 0;
  const sendTime = schedule.send_time || "10:00";
  const tplBase: string | null = cfg.template_slug;
  const channels: string[] = Array.isArray(cfg.channels)
    ? cfg.channels : (cfg.channel ? [cfg.channel] : ["sms"]);
  const recipientType: string = cfg.recipient_type || "attendees";
  const language: string = cfg.language || "he";
  if (!tplBase) {
    console.warn("automation-engine queue_send: missing template_slug");
    return { queued: 0, leadIds: [] };
  }

  const evRes = await db.from("crm_events").select("event_date")
    .eq("id", eventId).eq("tenant_id", tenantId).single();
  if (evRes.error || !evRes.data || !evRes.data.event_date) {
    console.warn("automation-engine queue_send: event lookup failed");
    return { queued: 0, leadIds: [] };
  }
  const ymd = evRes.data.event_date as string;
  // (event_date - offset_days) at sendTime, anchored Israel local +03:00.
  // Mirrors crm-automation-queue-send.js exactly. May 2026 sits outside DST.
  const base = new Date(`${ymd}T${sendTime}:00+03:00`);
  base.setUTCDate(base.getUTCDate() - offsetDays);
  const scheduledAt = base.toISOString();

  const leads: Lead[] = await resolveRecipients(db, tenantId, recipientType, triggerData, cfg);
  if (!leads.length) return { queued: 0, leadIds: [] };
  const leadIds = leads.map((l) => l.id);

  const rows: Record<string, unknown>[] = [];
  leads.forEach((lead) => {
    channels.forEach((ch) => {
      if (ch === "email" && !lead.email) return;
      if (ch === "sms" && !lead.phone) return;
      rows.push({
        tenant_id: tenantId,
        event_id: eventId,
        lead_id: lead.id,
        run_id: runId || null,
        channel: ch,
        // BASE slug only — send-message EF appends `_${channel}_${language}`.
        // Storing the full slug here causes double-suffix at dispatch time.
        template_slug: tplBase,
        variables: {
          name: lead.full_name || "",
          phone: lead.phone || "",
          email: lead.email || "",
        },
        language,
        status: "queued",
        scheduled_at: scheduledAt,
      });
    });
  });
  if (!rows.length) return { queued: 0, leadIds };

  // M4_QUEUE_INSERT_ON_CONFLICT (2026-05-21): atomic enqueue via RPC.
  // Replaces the prior client-side SELECT-existing-then-INSERT-new pattern
  // which was non-atomic (two concurrent runs could both see "no existing"
  // and both insert). The RPC's INSERT ... ON CONFLICT DO NOTHING (matching
  // the partial unique index uq_crm_message_queue_idem) silently no-ops
  // duplicates. supabase-js can't emit the partial WHERE on its own; the
  // RPC bridges that gap. See enqueue_crm_messages_idempotent migration.
  const insRes = await db.rpc("enqueue_crm_messages_idempotent", { p_rows: rows });
  if (insRes.error) {
    console.error("automation-engine queue_send insert:", insRes.error);
    return { queued: 0, leadIds };
  }
  const inserted = (insRes.data && typeof insRes.data.inserted === "number") ? insRes.data.inserted : 0;
  return { queued: inserted, leadIds };
}
