// post-actions.ts — port of crm-automation-post-actions.js.
// Three post-action functions: executePostActions (per-rule lead status
// update), attendeeUpsert (per-rule attendee insert + lead resync),
// promoteWaitingLeadsToInvited (per-dispatch-item waiting → invited).

// deno-lint-ignore no-explicit-any
type Db = any;

interface Rule {
  id: string;
  name?: string;
  // deno-lint-ignore no-explicit-any
  action_config: any;
}

// Per-rule bulk: rule.action_config.post_action_status_update applied to all
// resolved recipient leads. Idempotent; no demotion guard (rule owns
// lifecycle). Fail-open: a DB error logs but does not block further rules.
export async function executePostActions(
  db: Db, tenantId: string, rule: Rule, resolvedLeadIds: string[],
): Promise<{ updated: number }> {
  if (!rule || !rule.action_config) return { updated: 0 };
  const target = rule.action_config.post_action_status_update;
  if (!target || typeof target !== "string") return { updated: 0 };
  if (!Array.isArray(resolvedLeadIds) || !resolvedLeadIds.length) return { updated: 0 };

  // 2026-05-12 — chunk .in("id", ids) to keep PostgREST URL under ~8KB cap.
  // Same fix as promoteWaitingLeadsToInvited.
  const CHUNK = 200;
  let updated = 0;
  for (let i = 0; i < resolvedLeadIds.length; i += CHUNK) {
    const slice = resolvedLeadIds.slice(i, i + CHUNK);
    const res = await db.from("crm_leads")
      .update({ status: target, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .in("id", slice)
      .select("id, status");
    if (res.error) {
      console.error(`automation-engine executePostActions chunk ${i}:`, res.error);
      continue;
    }
    updated += (res.data || []).length;
  }
  return { updated };
}

// Per-rule bulk: UPSERTs crm_event_attendees for resolved recipients +
// re-derives lead.status from attendee state via sync_lead_status_from_attendee.
// Used by Rule 2.2 (T5 → invited) and Rule 2.4 (parallel events).
// Idempotent on (event_id, lead_id).
export async function attendeeUpsert(
  db: Db, tenantId: string, rule: Rule,
  resolvedLeadIds: string[], triggerData: Record<string, unknown>,
): Promise<{ upserted: number }> {
  const cfg = rule?.action_config?.post_action_attendee_upsert;
  if (!cfg || !cfg.status) return { upserted: 0 };
  if (!Array.isArray(resolvedLeadIds) || !resolvedLeadIds.length) return { upserted: 0 };
  const eventId = (typeof triggerData.eventId === "string") ? triggerData.eventId : null;
  if (!eventId) {
    console.warn("automation-engine attendeeUpsert: no eventId");
    return { upserted: 0 };
  }

  // 2026-05-12 — chunk upserts to keep PostgREST request body / URL under cap.
  const CHUNK = 200;
  let upserted = 0;
  const allUpsertedIds: string[] = [];
  for (let i = 0; i < resolvedLeadIds.length; i += CHUNK) {
    const slice = resolvedLeadIds.slice(i, i + CHUNK);
    const rows = slice.map((lid) => ({
      tenant_id: tenantId, event_id: eventId, lead_id: lid, status: cfg.status,
    }));
    const res = await db.from("crm_event_attendees").upsert(rows, {
      onConflict: "tenant_id,lead_id,event_id",
      ignoreDuplicates: false,
    }).select("lead_id");
    if (res.error) {
      console.error(`automation-engine attendeeUpsert chunk ${i}:`, res.error);
      continue;
    }
    const ids = (res.data || []).map((r: { lead_id: string }) => r.lead_id);
    allUpsertedIds.push(...ids);
    upserted += ids.length;
  }
  // M4_LEAD_STATUS_WAITLIST_SYNC: best-effort re-derive lead status, after all chunks.
  for (const lid of allUpsertedIds) {
    try {
      await db.rpc("sync_lead_status_from_attendee", {
        p_lead_id: lid, p_tenant_id: tenantId,
      });
    } catch (e) {
      console.warn("attendeeUpsert sync skipped:", (e as Error).message);
    }
  }
  return { upserted };
}

// Per-dispatch-item: after a successful event-scoped dispatch, promote any
// tier-2 lead currently in status='waiting' to 'invited'. Skip items with
// skip_auto_promote=true (rules that own their own lifecycle, e.g.
// post_action_status_update or explicit opt-out).
export async function promoteWaitingLeadsToInvited(
  db: Db, tenantId: string,
  // deno-lint-ignore no-explicit-any
  planItems: any[],
  // deno-lint-ignore no-explicit-any
  results: any[],
): Promise<{ promoted: number }> {
  if (!Array.isArray(planItems) || !planItems.length) return { promoted: 0 };
  const leadIds: Record<string, true> = {};
  planItems.forEach((it, i) => {
    if (it.skip_auto_promote) return;
    if (!it.event_id || !it.lead_id) return;
    const r = results && results[i];
    const ok = r && r.ok;
    if (ok) leadIds[it.lead_id] = true;
  });
  const ids = Object.keys(leadIds);
  if (!ids.length) return { promoted: 0 };
  // 2026-05-12 — chunk .in("id", ids) to keep PostgREST URL under its ~8KB
  // cap. A single .in() with 1144 UUIDs (~44KB query string) was silently
  // rejected by the gateway, so this function was a no-op for any rule
  // resolving >~200 recipients. Same chunking pattern as fetchLeadsByIds.
  const CHUNK = 200;
  let promoted = 0;
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK);
    const res = await db.from("crm_leads")
      .update({ status: "invited", updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId)
      .in("id", slice)
      .eq("status", "waiting")
      .select("id");
    if (res.error) {
      console.error(`automation-engine promoteWaitingLeadsToInvited chunk ${i}:`, res.error);
      continue;
    }
    promoted += (res.data || []).length;
  }
  return { promoted };
}
