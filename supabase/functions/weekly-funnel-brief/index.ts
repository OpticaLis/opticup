// supabase/functions/weekly-funnel-brief/index.ts
// SPEC: M4_WEEKLY_OPTIMIZATION_BRIEF (Deliverable B of FUNNEL Phase 2.5)
// Purpose: Sunday-morning brief generator — reads mv_funnel_health_dashboard,
//          classifies metrics ±5%, persists deterministic prose into funnel_weekly_briefs.
// D-AUTH-2: verify_jwt:false (cron-invoked). Service role key used for all DB ops.
// Iron Rules: 7 (service-role client for writes), 8 (no unsafe string interp), 22 (tenant_id on every query).
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const THRESHOLD_PCT = 5; // D-AUTH-4: ±5% deterministic classifier
const PRIOR_WEEKS_WINDOW = 4;

// Tracked metrics — polarity: 'higher_is_better' | 'lower_is_better' (per SPEC §0.6)
const TRACKED_METRICS = [
  { key: "leads_30d", label: "לידים (30 ימים)", polarity: "higher_is_better", derived: false },
  { key: "lead_attendee_conv_pct", label: "המרת ליד → משתתף", polarity: "higher_is_better", derived: true },
  { key: "attendee_buyer_conv_pct", label: "המרת משתתף → קונה", polarity: "higher_is_better", derived: true },
  { key: "revenue_30d", label: "הכנסה (30 ימים)", polarity: "higher_is_better", derived: false },
  { key: "unsubs_30d_per_lead_pct", label: "הסרת רשימה (30 ימים)", polarity: "lower_is_better", derived: true },
  { key: "failed_send_count", label: "שגיאות שליחה", polarity: "lower_is_better", derived: true },
] as const;

interface MetricMeta {
  key: string;
  label: string;
  polarity: "higher_is_better" | "lower_is_better";
  derived: boolean;
}

interface BriefSection {
  metric: string;
  label: string;
  delta_pct: number;
  value_curr: number;
  value_prev: number;
  focus_suggestion?: string;
}

interface BriefOutput {
  tenant_id: string;
  week_start: string;
  summary: string;
  improvements: BriefSection[];
  concerns: BriefSection[];
  steady: BriefSection[];
  metric_snapshot: Record<string, number>;
}

// ─── DERIVED METRICS ──────────────────────────────────────────────────────────

function computeDerivedMetrics(mvRow: Record<string, unknown>): Record<string, number> {
  const leads = Number(mvRow.leads_30d ?? 0);
  const attendees = Number(mvRow.attendees_30d ?? 0);
  const buyers = Number(mvRow.buyers_30d ?? 0);
  const unsubs = Number(mvRow.unsubs_30d ?? 0);
  const failedBreakdown = Array.isArray(mvRow.failed_breakdown) ? mvRow.failed_breakdown : [];
  const failedCount = failedBreakdown.reduce((s: number, f: unknown) => {
    const entry = f as Record<string, unknown>;
    return s + (Number(entry.n ?? 0));
  }, 0);
  return {
    leads_30d: leads,
    lead_attendee_conv_pct: leads > 0 ? (attendees / leads) * 100 : 0,
    attendee_buyer_conv_pct: attendees > 0 ? (buyers / attendees) * 100 : 0,
    revenue_30d: Number(mvRow.revenue_30d ?? 0),
    unsubs_30d_per_lead_pct: leads > 0 ? (unsubs / leads) * 100 : 0,
    failed_send_count: failedCount,
  };
}

// ─── PRIOR AVERAGE ────────────────────────────────────────────────────────────

function computePriorAverage(
  priorBriefs: Array<{ metric_snapshot: Record<string, unknown> }>
): Record<string, number> | null {
  if (!priorBriefs || priorBriefs.length === 0) return null;
  const sums: Record<string, number> = {};
  for (const b of priorBriefs) {
    const snap = b.metric_snapshot ?? {};
    for (const [k, v] of Object.entries(snap)) {
      if (typeof v === "number") sums[k] = (sums[k] ?? 0) + v;
    }
  }
  const n = priorBriefs.length;
  const avg: Record<string, number> = {};
  for (const [k, sum] of Object.entries(sums)) avg[k] = sum / n;
  return avg;
}

// ─── FOCUS SUGGESTIONS (Hebrew, per SPEC §3.5) ───────────────────────────────

function focusSuggestionFor(metricKey: string): string {
  switch (metricKey) {
    case "leads_30d": return "בדוק קמפיינים פעילים ופלטפורמות גיוס";
    case "lead_attendee_conv_pct": return "עברו על הודעות ההזמנה — אולי הן לא מובילות להרשמה";
    case "attendee_buyer_conv_pct": return "בדוק מחירים + הצעות במהלך האירוע";
    case "revenue_30d": return "בדוק את שילוב המכירות + הרכישות באירועים";
    case "unsubs_30d_per_lead_pct": return "בדוק את תוכן ההודעות + קצב השליחה — אולי נמסר יותר מדי";
    case "failed_send_count": return "פתח את לוח השגיאות בדשבורד ונקה את הסיבות הנפוצות";
    default: return "פתח את הדשבורד ובדוק לעומק";
  }
}

// ─── SUMMARY BUILDER (3 sentences, per SPEC §0.6) ────────────────────────────

function buildSummary(
  curr: Record<string, number>,
  improvements: BriefSection[],
  concerns: BriefSection[]
): string {
  const leadsVal = Math.round(curr.leads_30d ?? 0);
  const revenueVal = Math.round(curr.revenue_30d ?? 0);
  const s1 = `השבוע: ${leadsVal} לידים, ${revenueVal}₪ הכנסה (חלון 30 ימים).`;
  const s2 = improvements.length > 0
    ? `שיפור בולט: ${improvements[0].label} (+${improvements[0].delta_pct.toFixed(1)}%).`
    : "אין מטריקות שהשתפרו משמעותית השבוע.";
  const s3 = concerns.length > 0
    ? `נדרשת תשומת לב: ${concerns[0].label} (${concerns[0].delta_pct >= 0 ? "+" : ""}${concerns[0].delta_pct.toFixed(1)}%) — ${concerns[0].focus_suggestion}.`
    : "אין דאגות השבוע — כל המטריקות יציבות או משתפרות.";
  return [s1, s2, s3].join(" ");
}

// ─── BRIEF GENERATOR (per tenant) ────────────────────────────────────────────

async function generateBriefForTenant(
  // deno-lint-ignore no-explicit-any
  db: any,
  tenantId: string,
  weekStart: Date
): Promise<BriefOutput> {
  // 1. Read current mv row for this tenant (Iron Rule 22: tenant_id filter)
  const { data: mvRow, error: mvErr } = await db
    .from("mv_funnel_health_dashboard")
    .select("*")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (mvErr) throw new Error(`mv read failed: ${mvErr.message}`);

  const current = computeDerivedMetrics(mvRow ?? {});

  // 2. Read prior PRIOR_WEEKS_WINDOW briefs for baseline (Iron Rule 22)
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const { data: priorBriefs, error: priorErr } = await db
    .from("funnel_weekly_briefs")
    .select("metric_snapshot, week_start")
    .eq("tenant_id", tenantId)
    .lt("week_start", weekStartStr)
    .order("week_start", { ascending: false })
    .limit(PRIOR_WEEKS_WINDOW);
  if (priorErr) throw new Error(`prior briefs read failed: ${priorErr.message}`);

  // 3. Compute prior average (null if insufficient history)
  const priorAvg = computePriorAverage(priorBriefs ?? []);

  // 4. Classify each tracked metric
  const improvements: BriefSection[] = [];
  const concerns: BriefSection[] = [];
  const steady: BriefSection[] = [];

  for (const m of TRACKED_METRICS as unknown as MetricMeta[]) {
    const curr = current[m.key] ?? 0;
    const prev = priorAvg ? (priorAvg[m.key] ?? null) : null;

    // Insufficient history → steady (no delta)
    if (prev === null || prev === 0) {
      steady.push({ metric: m.key, label: m.label, delta_pct: 0, value_curr: curr, value_prev: prev ?? 0 });
      continue;
    }

    const deltaPct = ((curr - prev) / prev) * 100;
    const section: BriefSection = { metric: m.key, label: m.label, delta_pct: deltaPct, value_curr: curr, value_prev: prev };

    const improved =
      (m.polarity === "higher_is_better" && deltaPct > THRESHOLD_PCT) ||
      (m.polarity === "lower_is_better" && deltaPct < -THRESHOLD_PCT);
    const degraded =
      (m.polarity === "higher_is_better" && deltaPct < -THRESHOLD_PCT) ||
      (m.polarity === "lower_is_better" && deltaPct > THRESHOLD_PCT);

    if (improved) {
      improvements.push(section);
    } else if (degraded) {
      section.focus_suggestion = focusSuggestionFor(m.key);
      concerns.push(section);
    } else {
      steady.push(section);
    }
  }

  // 5. Build 3-sentence summary
  const summary = buildSummary(current, improvements, concerns);

  return {
    tenant_id: tenantId,
    week_start: weekStartStr,
    summary,
    improvements,
    concerns,
    steady,
    metric_snapshot: current,
  };
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Service-role client: bypasses RLS for cross-tenant writes (D-AUTH-2)
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Compute ISO week start (Monday of current week)
  const now = new Date();
  const dow = now.getUTCDay(); // 0=Sun, 1=Mon … 6=Sat
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  const weekStart = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + offsetToMonday
  ));

  // Fetch all active tenants
  const { data: tenants, error: tenantsErr } = await db
    .from("tenants")
    .select("id")
    .eq("is_active", true);
  if (tenantsErr) {
    console.error("[weekly-funnel-brief] tenants fetch failed:", tenantsErr);
    return new Response(JSON.stringify({ error: tenantsErr.message }), { status: 500 });
  }

  const generated: string[] = [];
  const failed: string[] = [];

  for (const t of tenants ?? []) {
    try {
      const brief = await generateBriefForTenant(db, t.id, weekStart);

      // UPSERT — ON CONFLICT (tenant_id, week_start) DO UPDATE (idempotent re-runs)
      const { error: upsertErr } = await db.from("funnel_weekly_briefs").upsert(
        {
          tenant_id: brief.tenant_id,
          week_start: brief.week_start,
          summary: brief.summary,
          improvements: brief.improvements,
          concerns: brief.concerns,
          steady: brief.steady,
          metric_snapshot: brief.metric_snapshot,
          classifier_version: "v1-deterministic",
          generated_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,week_start" }
      );
      if (upsertErr) throw new Error(`upsert failed: ${upsertErr.message}`);
      generated.push(t.id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`[weekly-funnel-brief] failed for tenant ${t.id}:`, msg);
      failed.push(t.id);
    }
  }

  return new Response(
    JSON.stringify({
      generated: generated.length,
      failed: failed.length,
      week_start: weekStart.toISOString().slice(0, 10),
      tenant_ids: generated,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
