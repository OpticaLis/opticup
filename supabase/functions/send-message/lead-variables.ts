// lead-variables.ts — auto-fill core lead variables from crm_leads on every
// send-message dispatch (P31 commit 2). Three core values that every template
// expects: name, phone, email. Plus lead_id (Daniel-approved 2026-04-30) so
// %lead_id% resolves on direct-send paths that previously broke the
// event_coupon_delivery_email_he QR code img URL.
//
// Caller-provided values WIN. If the caller already set variables.name,
// variables.phone, variables.email, or variables.lead_id, this helper does
// not overwrite — only fills gaps. This preserves backward compat with the
// 7 existing callers (all of which already pass the full bundle).

// deno-lint-ignore no-explicit-any
export async function injectLeadVariables(
  db: any,
  leadId: string,
  tenantId: string,
  vars: Record<string, unknown>,
): Promise<
  { unsubscribed_at: string | null; status: string | null; email: string | null; phone: string | null } | null
> {
  if (!leadId || !tenantId) return null;

  const { data: lead, error } = await db
    .from("crm_leads")
    .select("id, full_name, phone, email, unsubscribed_at, status")
    .eq("id", leadId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (error) {
    console.warn("injectLeadVariables: lead lookup failed:", error.message);
    return null;
  }
  if (!lead) {
    console.warn("injectLeadVariables: lead not found id=" + leadId);
    return null;
  }

  // Caller-wins merge: only set if the caller didn't pass a value.
  if (vars.name == null) vars.name = lead.full_name || "";
  if (vars.phone == null) vars.phone = lead.phone || "";
  if (vars.email == null) vars.email = lead.email || "";
  if (vars.lead_id == null) vars.lead_id = lead.id || "";

  return {
    unsubscribed_at: lead.unsubscribed_at ?? null,
    status: lead.status ?? null,
    email: lead.email ?? null,
    phone: lead.phone ?? null,
  };
}
