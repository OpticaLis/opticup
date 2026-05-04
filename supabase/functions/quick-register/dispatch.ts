// dispatch.ts — quick-register message dispatch helpers.
// Extracted from index.ts during QUICK_REGISTER_HOTFIX_2_DISPATCH_AND_TRACKING
// (2026-05-04) to keep index.ts under Iron Rule 12 cap when adding the
// post-RPC coupon-delivery / waiting-list dispatch.
//
// Mirrors event-register's inline pattern. Failures here are caught and
// logged — never propagated — so the registration response does not 500
// when the messaging vendor is degraded.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

// Legacy JWT-format anon key — same constant inlined in event-register and
// lead-intake/dispatch.ts. The SUPABASE_ANON_KEY env on Edge returns the
// newer sb_publishable_* format which the gateway's verify_jwt rejects.
const ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRzeHJyeHptZHhhZW5sdm9jeWl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5NjIxNzIsImV4cCI6MjA4ODUzODE3Mn0.7Z_lrqHctUqm1offIvZxA17wCI4kRopFWgL1jCDJ9ZU";

const SEND_MESSAGE_URL = `${SUPABASE_URL}/functions/v1/send-message`;

type EventVars = {
  id: string;
  name: string | null;
  event_date: string | null;
  start_time: string | null;
};

// Public quick-register form bypasses CrmAutomation.evaluate (same posture as
// event-register). Hardcode the template-base mapping by post-RPC status.
//
// Hotfix #3 (2026-05-04): on the coupon-delivery branch, after at least one
// channel succeeds, mirror crm-event-day-coupon.js:131-132 semantics and flip
// crm_event_attendees.coupon_sent=true + coupon_sent_at=now(). Without this,
// the event-day operator UI ("שלח" button gated on !coupon_sent) shows a
// manual-send button for already-auto-dispatched walk-ins → duplicate-send
// risk. Payment-status flip from the manual flow is intentionally NOT mirrored
// — walk-ins haven't paid yet at registration.
export async function dispatchQuickRegister(
  // deno-lint-ignore no-explicit-any
  db: any,
  tenantId: string,
  leadId: string,
  attendeeId: string | null,
  event: EventVars,
  name: string,
  phone: string,
  email: string,
  finalStatus: string,
): Promise<void> {
  const templateBaseSlug = finalStatus === "waiting_list"
    ? "event_waiting_list_confirmation"
    : "event_coupon_delivery";
  const variables: Record<string, string> = {
    name,
    phone,
    email,
    lead_id: leadId,
    event_name: event.name || "",
    event_date: event.event_date || "",
    event_time: event.start_time || "",
  };
  const results = await Promise.allSettled([
    callSendMessage(tenantId, leadId, event.id, "sms", templateBaseSlug, variables),
    callSendMessage(tenantId, leadId, event.id, "email", templateBaseSlug, variables),
  ]);
  const anySent = results.some((r) => r.status === "fulfilled" && r.value === true);

  if (
    templateBaseSlug === "event_coupon_delivery" &&
    anySent &&
    attendeeId
  ) {
    try {
      const { error } = await db
        .from("crm_event_attendees")
        .update({ coupon_sent: true, coupon_sent_at: new Date().toISOString() })
        .eq("id", attendeeId)
        .eq("tenant_id", tenantId);
      if (error) {
        console.error("coupon_sent flag update failed:", error);
      }
    } catch (e) {
      console.error("coupon_sent flag update exception:", (e as Error).message || e);
    }
  }
}

async function callSendMessage(
  tenantId: string,
  leadId: string,
  eventId: string,
  channel: "sms" | "email",
  templateSlug: string,
  variables: Record<string, string>,
): Promise<boolean> {
  try {
    const res = await fetch(SEND_MESSAGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANON_KEY}`,
        "apikey": ANON_KEY,
      },
      body: JSON.stringify({
        tenant_id: tenantId,
        lead_id: leadId,
        event_id: eventId,
        channel,
        template_slug: templateSlug,
        variables,
      }),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error(
        `send-message ${channel}/${templateSlug} HTTP ${res.status}: ${txt.slice(0, 200)}`,
      );
      return false;
    }
    return true;
  } catch (e) {
    console.error(
      `send-message ${channel}/${templateSlug} exception:`,
      (e as Error).message || e,
    );
    return false;
  }
}
