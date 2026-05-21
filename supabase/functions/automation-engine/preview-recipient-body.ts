// preview-recipient-body.ts — per-recipient body fetch.
// M4_DISPATCH_PREVIEW_LAZY_ROWS (2026-05-21).
//
// Companion to preview.ts. The default mode='dispatch_preview' returns
// recipient metadata only (composedBody=null) so the modal opens fast even
// against a 100,000-lead audience. When the operator clicks into a specific
// row, the modal calls mode='preview_recipient_body' which lands here and
// composes the personalized body for ONE (lead, channel) — re-using
// prepareRulePlan with leadIdFilter + channelFilter + skipBodyComposition=false
// so there is exactly one template-substitution path (Rule 21).

import { prepareRulePlan } from "./prepare-plan.ts";
import { TRIGGER_TYPES, evaluateCondition } from "./engine.ts";

// deno-lint-ignore no-explicit-any
type Db = any;

export interface PreviewRecipientBodyInput {
  tenantId: string;
  triggerType: string;
  triggerData: Record<string, unknown>;
  leadId: string;
  channel: string;
}

export interface PreviewRecipientBodyResult {
  lead_id: string;
  channel: string;
  composed_body: string | null;
  language?: string;
  template_slug?: string | null;
  full_name?: string;
  phone?: string;
  email?: string;
  error?: string;
}

interface PlanItem {
  recipient?: { name?: string; phone?: string; email?: string };
  composedBody?: string | null;
  lead_id: string;
  channel: string;
  language?: string;
  template_slug?: string | null;
}

export async function previewRecipientBody(
  db: Db, input: PreviewRecipientBodyInput,
): Promise<PreviewRecipientBodyResult> {
  const { tenantId, triggerType, triggerData, leadId, channel } = input;
  const map = TRIGGER_TYPES[triggerType];
  if (!map) return { lead_id: leadId, channel, composed_body: null, error: "unknown_trigger_type" };

  const res = await db.from("crm_automation_rules")
    .select("id, name, trigger_entity, trigger_event, trigger_condition, action_type, action_config, sort_order, is_active")
    .eq("tenant_id", tenantId).eq("is_active", true)
    .eq("trigger_entity", map.entity).eq("trigger_event", map.event)
    .order("sort_order");
  if (res.error) {
    return { lead_id: leadId, channel, composed_body: null, error: "rules_load_failed" };
  }
  const rules = (res.data || []).filter((r: { trigger_condition: unknown }) =>
    evaluateCondition(r.trigger_condition, triggerData));
  if (!rules.length) {
    return { lead_id: leadId, channel, composed_body: null, error: "no_active_rules" };
  }

  const tplCache = new Map<string, unknown>();
  for (const rule of rules) {
    try {
      const p = await prepareRulePlan(db, tenantId, rule, triggerData, tplCache, null, "evaluate",
        { leadIdFilter: leadId, channelFilter: channel, skipBodyComposition: false });
      if (p.items && p.items.length > 0) {
        const item = p.items[0] as PlanItem;
        return {
          lead_id: item.lead_id,
          channel: item.channel,
          composed_body: item.composedBody || null,
          language: item.language,
          template_slug: item.template_slug || null,
          full_name: item.recipient?.name,
          phone: item.recipient?.phone,
          email: item.recipient?.email,
        };
      }
    } catch (e) {
      console.error("previewRecipientBody:", (e as Error).message);
    }
  }
  return { lead_id: leadId, channel, composed_body: null, error: "lead_not_in_audience" };
}
