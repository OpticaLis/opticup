# SPEC — M4_WEEKLY_OPTIMIZATION_BRIEF (Deliverable B of FUNNEL Phase 2.5)

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_WEEKLY_OPTIMIZATION_BRIEF/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4) — overnight worktree-isolated session
> **Authored on:** 2026-05-19 night
> **Module:** 4 — CRM
> **Phase:** FUNNEL_ROADMAP Phase 2.5 — Deliverable B (Analysis layer on top of Deliverable A's mv)
> **Parent Brief:** `modules/Module 4 - CRM/architecture-brief/M4_FUNNEL_PHASE_2_5_OVERNIGHT_BRIEF.md`
> **Companion SPEC:** `M4_FUNNEL_HEALTH_DASHBOARD` (Deliverable A — must land first; provides `mv_funnel_health_dashboard`)
> **Worktree:** `C:\Users\User\opticup-funnel-25\` on branch `claude/funnel-phase-2-5-overnight-2026-05-19`
> **Risk class:** LOW. 1 new table + 1 new EF + 1 new cron + 1 UI panel. Deterministic classifier (no AI in v1).

---

## 0. Pre-Authoring Reality Check

- ✅ Parent Brief read in FULL. Brief §3.2 specifies Deliverable B's contract.
- ✅ Deliverable A's SPEC (`M4_FUNNEL_HEALTH_DASHBOARD/SPEC.md`) read — provides the `mv_funnel_health_dashboard` schema this SPEC consumes. The mv exists in DB only AFTER A's Executor runs; this SPEC's Executor must verify A's mv is populated before proceeding.
- ✅ Pre-flight DB probes (2026-05-19 night):
  - `funnel_weekly_briefs` table does NOT exist (Rule 21 clean).
  - `weekly_funnel_brief_generation` cron job does NOT exist (Rule 21 clean).
  - No EF named `weekly-funnel-brief` in active EF list.
  - `tenants.is_active` column present (for active-tenant iteration in cron).
- ✅ EF deployment pattern: cron-invoked EFs use `verify_jwt:false` matching the established convention from `dispatch-queue`, `fb-capi-dispatch`, `pixel-fired`. The `daily-alert-generation` cron's DO-LOOP pattern is the closest precedent for "iterate active tenants, invoke EF per tenant via net.http_post".
- ✅ Cron schedule: Brief §3.2 = "Sunday 06:00 IST". Server is UTC. IST = UTC+3 (DST) or UTC+2 (standard). Sunday 06:00 IST in cron syntax: depending on DST `0 3 * * 0` (summer, IST=UTC+3) OR `0 4 * * 0` (winter, IST=UTC+2). Safer: schedule the cron at a fixed UTC time + let the EF check the actual IST local time and skip if not the intended hour. **Foreman decision (D-AUTH-3):** schedule `0 3 * * 0` (Sunday 03:00 UTC = 06:00 IST summer / 05:00 IST winter — close enough; Daniel can shift after observing first run). The EF doesn't gate on local time; cron fires once weekly regardless.
- ✅ Cross-Reference Check (Rule 21) — see §0.5.
- ✅ Runtime semantics rehearsed — see §0.6.

### 0.4 Live DB Baselines

| Symbol | Source | Value (captured 2026-05-19 night) |
|---|---|---|
| `BASE_FUNNEL_TABLE_EXISTS` | `information_schema.tables WHERE table_name='funnel_weekly_briefs'` | 0 (clean) |
| `BASE_WEEKLY_CRON_EXISTS` | `cron.job WHERE jobname='weekly_funnel_brief_generation'` | 0 (clean) |
| `BASE_EF_SLUG_EXISTS` | `list_edge_functions` returned no `weekly-funnel-brief` | 0 (clean) |
| `BASE_DEPENDS_ON_A` | Deliverable A must land its mv before B's Executor runs | informational (Executor checks) |

### 0.5 Cross-Reference Check (Iron Rule 21)

| Name | Search | Hits | Resolution |
|---|---|---|---|
| `funnel_weekly_briefs` (table) | `information_schema.tables` | 0 | Genuinely new |
| `weekly-funnel-brief` (EF slug) | EF list | 0 | Genuinely new |
| `weekly_funnel_brief_generation` (cron jobname) | `cron.job` | 0 | Genuinely new |
| `idx_funnel_weekly_briefs_tenant_week` (UNIQUE) | `pg_indexes` | 0 | Genuinely new |
| `supabase/functions/weekly-funnel-brief/index.ts` (file) | filesystem | does-not-exist | Genuinely new |
| `modules/crm/crm-weekly-brief-panel.js` (file) | filesystem | does-not-exist | Genuinely new |

**Cross-Reference Check completed 2026-05-19 night: 0 collisions / 0 hits.**

### 0.6 Runtime Semantics Rehearsal

**Table structure:**

```sql
CREATE TABLE public.funnel_weekly_briefs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id),
  week_start    date NOT NULL,                -- ISO week Monday (date_trunc('week', now())::date)
  generated_at  timestamptz NOT NULL DEFAULT now(),
  summary       text NOT NULL,                -- 3-sentence executive summary
  improvements  jsonb NOT NULL DEFAULT '[]',  -- array of {metric, delta_pct, value_curr, value_prev}
  concerns      jsonb NOT NULL DEFAULT '[]',  -- array of {metric, delta_pct, value_curr, value_prev, focus_suggestion}
  steady        jsonb NOT NULL DEFAULT '[]',  -- array of {metric, value_curr}
  metric_snapshot jsonb NOT NULL DEFAULT '{}',-- full mv row at generation time, for audit
  classifier_version text NOT NULL DEFAULT 'v1-deterministic',
  CONSTRAINT funnel_weekly_briefs_tenant_week_uniq UNIQUE (tenant_id, week_start)
);
CREATE INDEX idx_funnel_weekly_briefs_tenant_week ON public.funnel_weekly_briefs (tenant_id, week_start DESC);
```

Plus canonical 2-policy RLS (`service_bypass` for service_role + `tenant_isolation` JWT-claim for public).

**EF `weekly-funnel-brief` shape (rehearsed):**

- HTTP POST trigger from cron.
- Reads `mv_funnel_health_dashboard` for all active tenants (one row per tenant).
- For each tenant, computes prior-4-weeks-avg snapshot by reading the **most recent 4 rows from `funnel_weekly_briefs`** for that tenant (the `metric_snapshot` JSONB). If <4 prior briefs exist (first 4 weeks), falls back to "insufficient history" placeholder.
- Per-metric deterministic classifier (D-AUTH-4):
  - `delta_pct = (current - prior_avg) / prior_avg * 100`
  - `delta_pct > +5%` → 📈 improved
  - `delta_pct < -5%` → 📉 degraded
  - `-5% ≤ delta_pct ≤ +5%` → ➡️ steady
- Tracked metrics (the scalar/derivable-from-mv-columns ones from Deliverable A):
  - `leads_30d` (higher = improved)
  - `lead_attendee_conv_pct` = `attendees_30d / leads_30d` (higher = improved)
  - `attendee_buyer_conv_pct` = `buyers_30d / attendees_30d` (higher = improved)
  - `revenue_30d` (higher = improved)
  - `unsubs_30d_per_lead_pct` = `unsubs_30d / leads_30d` (higher = DEGRADED — inverted polarity)
  - `failed_send_count` = sum of `failed_breakdown[].n` (higher = DEGRADED)
- For each tracked metric → classify + assign to `improvements`, `concerns`, or `steady` JSONB array.
- `summary` = 3 templated sentences:
  - Sentence 1: leads + revenue summary (always).
  - Sentence 2: top improvement OR "All metrics steady" if 0 improvements.
  - Sentence 3: top concern with focus suggestion OR "No concerns this week" if 0 concerns.
- INSERT row into `funnel_weekly_briefs` with ON CONFLICT (tenant_id, week_start) DO UPDATE (re-runnable).
- Returns 200 with summary of generated briefs.

**EF idempotency rehearsal:**
- Same week + same tenant: ON CONFLICT DO UPDATE rewrites the row. Useful for re-runs after bug fix.
- New week: new row.

**ERP UI rehearsal:**
- New panel "תקציר שבועי" inside the Funnel Dashboard page (added by Deliverable A).
- Renders most recent `funnel_weekly_briefs` row for current tenant, plus dropdown of last 10 weeks.
- Read-only Markdown rendered to HTML (no `innerHTML` of unsafe content — uses escapeHtml + minimal parser, OR loads as plain text in a `<pre>` block for v1).
- "AI-generated" badge per Brief §3.2 (here: "Deterministic v1 — no AI inference yet").

**Cron rehearsal:**
- Sunday 03:00 UTC (`0 3 * * 0`) — single fire per week per tenant.
- net.http_post pattern matches `daily-alert-generation` (no tenant-loop body needed; the EF iterates tenants itself).

**Runtime semantics rehearsed: yes.**

### D-AUTH

- **D-AUTH-1 (table shape).** Per §0.6. Unique constraint `(tenant_id, week_start)` enables idempotent re-runs.
- **D-AUTH-2 (EF deployment pattern).** `verify_jwt: false` per cron-invoked EF convention. Uses `SUPABASE_URL` + `SERVICE_ROLE_KEY` env vars. Iron Rule 22 defense-in-depth via tenant-scoped `.eq('tenant_id', ...)` on every query.
- **D-AUTH-3 (cron schedule).** `0 3 * * 0` = Sunday 03:00 UTC ≈ 06:00 IST (summer) / 05:00 IST (winter). Brief said "06:00 IST" — DST drift acceptable for v1 (Daniel can shift after observation). v2 may add IST-aware EF gate.
- **D-AUTH-4 (deterministic classifier — NO AI).** Fixed ±5% threshold. Per Brief §6 D3. v2 SPEC may add AI prose.
- **D-AUTH-5 (Iron Rule 32 declared = 0).** All work additive. New table + new EF + new cron + new UI file + UI panel injection into Deliverable A's dashboard file (1-2 added lines).
- **D-AUTH-6 (depends on Deliverable A).** B's Executor MUST verify A's mv exists and is populated before running first test. If A hasn't shipped yet → STOP.
- **D-AUTH-7 (Iron Rule 35 — no Campaign Overseer surfaces).** Zero placeholder/action_type/trigger_type changes.
- **D-AUTH-8 (Iron Rule 34 — UI verification).** Triplet at LH-Tester phase: screenshot of weekly-brief panel rendered with sample data + `window.__weeklyBriefTrace` runtime trace + DB-row probe showing `funnel_weekly_briefs` populated.
- **D-AUTH-9 (Initial test-run policy).** EF deployed + ONE manual invocation triggered to produce a sample brief for the current week. Sample brief INSERTed into `funnel_weekly_briefs` for both tenants. Provides immediate UI content for LH-Tester verification.
- **D-AUTH-10 (Markdown rendering safety).** UI renders briefs as escaped text in a `<pre>` block OR uses a minimal trusted-markdown parser. NO `innerHTML` with unescaped content (Rule 8 — Security).

---

## 1. Goal

Ship the automated Weekly Optimization Brief generator that runs every Sunday morning, reads `mv_funnel_health_dashboard` for each active tenant, classifies metrics into 📈 improved / 📉 degraded / ➡️ steady against a 4-week prior-average baseline, and persists a deterministic-prose Markdown brief into `funnel_weekly_briefs` table. New ERP panel "תקציר שבועי" surfaces the latest brief on the Funnel Dashboard with a dropdown for history.

After this SPEC: Daniel opens ERP CRM → Funnel Health every Sunday morning, glances at the new panel, and knows exactly what's improving, what's degrading, and where to focus — without running any ad-hoc query or interpretation.

---

## 2. Background & Motivation

Per Brief §1: Daniel directive *"I want to always improve, to know how to improve, what to improve."* Deliverable A (Dashboard) provides the data; Deliverable B (this SPEC) provides the **interpretation**. Without B, the dashboard is a read-the-numbers-yourself exercise. With B, the system tells Daniel "broadcast CTR is down 12% vs last 4 weeks — investigate" on Sunday morning before he's even logged in.

The deterministic v1 classifier (±5% thresholds) is the MVP. AI prose generation is a v2 follow-up SPEC; v1 ships the substrate so v2 is purely a prose-layer swap.

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state | Worktree on `claude/funnel-phase-2-5-overnight-2026-05-19`, scope-clean at SPEC close | `git status` empty in worktree |
| 2 | Commits (Executor scope) | 3-4 commits: C2 (migration: table + indexes + RLS + cron) + C3 (EF source + deploy) + C4 (frontend UI panel + dashboard hook) + C5 (retrospective). ±1 acceptable. | `git log` |
| 3 | Table `funnel_weekly_briefs` exists with §0.6 schema | exists | `\d funnel_weekly_briefs` |
| 4 | Table has canonical 2-policy RLS (service_bypass + tenant_isolation JWT-claim) | 2 policies | `pg_policies WHERE tablename='funnel_weekly_briefs'` → 2 |
| 5 | UNIQUE constraint `(tenant_id, week_start)` | exists | `pg_constraint` |
| 6 | Index `idx_funnel_weekly_briefs_tenant_week` | exists | `pg_indexes` |
| 7 | EF `weekly-funnel-brief` deployed, `verify_jwt: false` | exists, ACTIVE | `mcp__claude_ai_Supabase__list_edge_functions` |
| 8 | EF reads `mv_funnel_health_dashboard` — verify via source grep | source contains `mv_funnel_health_dashboard` | EF source post-deploy |
| 9 | Classifier thresholds = ±5% | source contains `0.05` or `5` | grep |
| 10 | pg_cron job `weekly_funnel_brief_generation` scheduled `0 3 * * 0`, active=true | exists | `cron.job` |
| 11 | Manual test-run produces ≥ 2 rows (1 per tenant) for current week | 2 rows | `SELECT count(*) FROM funnel_weekly_briefs WHERE week_start = date_trunc('week', now())::date` → 2 |
| 12 | Each row has non-empty `summary` + `metric_snapshot` jsonb populated | yes | `SELECT length(summary), jsonb_typeof(metric_snapshot) FROM funnel_weekly_briefs ORDER BY generated_at DESC LIMIT 2` |
| 13 | New file `modules/crm/crm-weekly-brief-panel.js` ≤ 150 lines | ≤ 150 | `wc -l` |
| 14 | UI panel renders most recent brief + dropdown of last N weeks | rendered on dashboard | LH-Tester Chrome MCP |
| 15 | `crm-funnel-dashboard.js` extended by ≤ 20 lines (Deliverable A's file) to embed the brief panel | within budget | `wc -l` |
| 16 | `crm.html` updated with 1 new script tag | 1 hit | grep |
| 17 | Iron Rule 31 integrity gate at every commit | exit 0 or 2 | hook |
| 18 | Iron Rule 32 destructive-ops | 0 declared, 0 detected | hook |
| 19 | Brief §4 Cross-Module Safety Audit holds | no §4.2 / §4.4 / §4.6 touched | Reviewer |
| 20 | Iron Rule 34 — Chrome MCP triplet | screenshot + `window.__weeklyBriefTrace` + DB-row probe | TEST_REPORT |
| 21 | Smoke 7/7+ PASS on worktree | all passing | `node tests/smoke/baseline.test.mjs` |
| 22 | Documentation appended to `docs/FUNNEL_HEALTH_DASHBOARD.md` (created in A) — adds Weekly Brief section | +15-30 lines | grep |

### 3.5 Verbatim EF Body Outline

The Executor implements the EF following this shape (~250-350 line file expected):

```typescript
// supabase/functions/weekly-funnel-brief/index.ts
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const THRESHOLD_PCT = 5; // ±5% per D-AUTH-4
const PRIOR_WEEKS_WINDOW = 4;

// Tracked metrics — each with polarity ('higher_is_better' or 'lower_is_better')
const TRACKED_METRICS = [
  { key: 'leads_30d', label: 'לידים (30 ימים)', polarity: 'higher_is_better' },
  { key: 'lead_attendee_conv_pct', label: 'המרת ליד → משתתף', polarity: 'higher_is_better', derived: true },
  { key: 'attendee_buyer_conv_pct', label: 'המרת משתתף → קונה', polarity: 'higher_is_better', derived: true },
  { key: 'revenue_30d', label: 'הכנסה (30 ימים)', polarity: 'higher_is_better' },
  { key: 'unsubs_30d_per_lead_pct', label: 'הסרת רשימה (30 ימים)', polarity: 'lower_is_better', derived: true },
  { key: 'failed_send_count', label: 'שגיאות שליחה', polarity: 'lower_is_better', derived: true },
];

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
  metric_snapshot: Record<string, unknown>;
}

async function generateBriefForTenant(db: any, tenantId: string, weekStart: Date): Promise<BriefOutput> {
  // 1. Read current week's snapshot from mv
  const { data: mvRow } = await db.from('mv_funnel_health_dashboard')
    .select('*').eq('tenant_id', tenantId).single();
  
  // 2. Derive computed metrics (lead_attendee_conv_pct, etc.)
  const current = computeDerivedMetrics(mvRow);
  
  // 3. Read prior 4 weekly briefs for baseline
  const { data: priorBriefs } = await db.from('funnel_weekly_briefs')
    .select('metric_snapshot, week_start').eq('tenant_id', tenantId)
    .lt('week_start', weekStart.toISOString().slice(0, 10))
    .order('week_start', { ascending: false }).limit(PRIOR_WEEKS_WINDOW);
  
  // 4. Compute prior-avg per metric (or null if insufficient history)
  const priorAvg = computePriorAverage(priorBriefs);
  
  // 5. Classify each tracked metric
  const improvements: BriefSection[] = [];
  const concerns: BriefSection[] = [];
  const steady: BriefSection[] = [];
  for (const m of TRACKED_METRICS) {
    const curr = current[m.key];
    const prev = priorAvg ? priorAvg[m.key] : null;
    if (prev === null || prev === 0) { steady.push({ metric: m.key, label: m.label, delta_pct: 0, value_curr: curr, value_prev: prev ?? 0 }); continue; }
    const deltaPct = ((curr - prev) / prev) * 100;
    const section: BriefSection = { metric: m.key, label: m.label, delta_pct: deltaPct, value_curr: curr, value_prev: prev };
    // Polarity logic
    const improved = (m.polarity === 'higher_is_better' && deltaPct > THRESHOLD_PCT) || (m.polarity === 'lower_is_better' && deltaPct < -THRESHOLD_PCT);
    const degraded = (m.polarity === 'higher_is_better' && deltaPct < -THRESHOLD_PCT) || (m.polarity === 'lower_is_better' && deltaPct > THRESHOLD_PCT);
    if (improved) improvements.push(section);
    else if (degraded) {
      section.focus_suggestion = focusSuggestionFor(m.key);
      concerns.push(section);
    } else steady.push(section);
  }
  
  // 6. Build 3-sentence summary
  const summary = buildSummary(current, improvements, concerns);
  
  return {
    tenant_id: tenantId,
    week_start: weekStart.toISOString().slice(0, 10),
    summary, improvements, concerns, steady,
    metric_snapshot: current,
  };
}

function buildSummary(curr: any, improvements: BriefSection[], concerns: BriefSection[]): string {
  const s1 = `השבוע: ${curr.leads_30d ?? 0} לידים, ${curr.revenue_30d ?? 0}₪ הכנסה (חלון 30 ימים).`;
  const s2 = improvements.length > 0 
    ? `שיפור בולט: ${improvements[0].label} (+${improvements[0].delta_pct.toFixed(1)}%).`
    : `אין מטריקות שהשתפרו משמעותית השבוע.`;
  const s3 = concerns.length > 0 
    ? `נדרשת תשומת לב: ${concerns[0].label} (${concerns[0].delta_pct >= 0 ? '+' : ''}${concerns[0].delta_pct.toFixed(1)}%) — ${concerns[0].focus_suggestion}.`
    : `אין דאגות השבוע — כל המטריקות יציבות או משתפרות.`;
  return [s1, s2, s3].join(' ');
}

function focusSuggestionFor(metricKey: string): string {
  // Map metric → suggested focus area (Hebrew)
  switch (metricKey) {
    case 'leads_30d': return 'בדוק קמפיינים פעילים ופלטפורמות גיוס';
    case 'lead_attendee_conv_pct': return 'עברו על הודעות ההזמנה — אולי הן לא מובילות להרשמה';
    case 'attendee_buyer_conv_pct': return 'בדוק מחירים + הצעות במהלך האירוע';
    case 'revenue_30d': return 'בדוק את שילוב המכירות + הרכישות באירועים';
    case 'unsubs_30d_per_lead_pct': return 'בדוק את תוכן ההודעות + קצב השליחה — אולי נמסר יותר מדי';
    case 'failed_send_count': return 'פתח את לוח השגיאות בדשבורד ונקה את הסיבות הנפוצות';
    default: return 'פתח את הדשבורד ובדוק לעומק';
  }
}

function computeDerivedMetrics(mvRow: any): Record<string, number> {
  const leads = mvRow.leads_30d ?? 0;
  const attendees = mvRow.attendees_30d ?? 0;
  const buyers = mvRow.buyers_30d ?? 0;
  return {
    leads_30d: leads,
    lead_attendee_conv_pct: leads > 0 ? (attendees / leads) * 100 : 0,
    attendee_buyer_conv_pct: attendees > 0 ? (buyers / attendees) * 100 : 0,
    revenue_30d: mvRow.revenue_30d ?? 0,
    unsubs_30d_per_lead_pct: leads > 0 ? ((mvRow.unsubs_30d ?? 0) / leads) * 100 : 0,
    failed_send_count: (mvRow.failed_breakdown ?? []).reduce((s: number, f: any) => s + (f.n ?? 0), 0),
  };
}

function computePriorAverage(priorBriefs: any[]): Record<string, number> | null {
  if (!priorBriefs || priorBriefs.length === 0) return null;
  const sums: Record<string, number> = {};
  for (const b of priorBriefs) {
    for (const [k, v] of Object.entries(b.metric_snapshot ?? {})) {
      if (typeof v === 'number') sums[k] = (sums[k] ?? 0) + v;
    }
  }
  const n = priorBriefs.length;
  const avg: Record<string, number> = {};
  for (const [k, sum] of Object.entries(sums)) avg[k] = sum / n;
  return avg;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  
  // ISO week start (Monday)
  const now = new Date();
  const dow = now.getUTCDay(); // 0=Sun, 1=Mon
  const offsetToMonday = (dow === 0 ? -6 : 1 - dow);
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offsetToMonday));
  
  // Iterate active tenants
  const { data: tenants } = await db.from('tenants').select('id').eq('is_active', true);
  const briefs: BriefOutput[] = [];
  for (const t of tenants ?? []) {
    try {
      const brief = await generateBriefForTenant(db, t.id, weekStart);
      // UPSERT
      await db.from('funnel_weekly_briefs').upsert({
        tenant_id: brief.tenant_id, week_start: brief.week_start,
        summary: brief.summary, improvements: brief.improvements,
        concerns: brief.concerns, steady: brief.steady,
        metric_snapshot: brief.metric_snapshot,
      }, { onConflict: 'tenant_id,week_start' });
      briefs.push(brief);
    } catch (e) { console.error(`brief generation failed for tenant ${t.id}:`, e); }
  }
  return new Response(JSON.stringify({ generated: briefs.length, week_start: weekStart.toISOString().slice(0, 10) }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
});
```

The above is the Foreman-authored canonical body. Executor adjusts only as needed for actual Supabase Deno runtime quirks; semantic shape must match.

### 3.6 UI Panel Shape

`modules/crm/crm-weekly-brief-panel.js`:

```js
(function () {
  'use strict';
  
  async function renderWeeklyBriefPanel(host) {
    if (!host) return;
    host.innerHTML = '<div class="weekly-brief-panel"><h3>📋 תקציר שבועי</h3><div class="wb-loading">טוען...</div></div>';
    const tid = getTenantId();
    if (!tid) return;
    const { data, error } = await sb.from('funnel_weekly_briefs')
      .select('week_start, summary, improvements, concerns, steady, generated_at, classifier_version')
      .eq('tenant_id', tid).order('week_start', { ascending: false }).limit(10);
    if (error || !data || data.length === 0) {
      host.innerHTML = '<div class="weekly-brief-panel"><h3>📋 תקציר שבועי</h3><div class="wb-empty">אין תקצירים עדיין. הראשון ייווצר ביום ראשון הקרוב.</div></div>';
      return;
    }
    // Trace for IR34
    window.__weeklyBriefTrace = window.__weeklyBriefTrace || [];
    window.__weeklyBriefTrace.push({ at: Date.now(), rows: data.length, latest_week: data[0].week_start });
    
    const current = data[0];
    const html = renderBriefHtml(current) + renderWeekDropdown(data);
    host.innerHTML = '<div class="weekly-brief-panel">' + html + '</div>';
    wireDropdown(host, data);
  }
  
  function renderBriefHtml(brief) {
    var parts = [];
    parts.push('<h3>📋 תקציר שבועי — ' + escapeHtml(brief.week_start) + '</h3>');
    parts.push('<div class="wb-version">' + escapeHtml(brief.classifier_version || 'v1') + ' · נוצר אוטומטית</div>');
    parts.push('<p class="wb-summary">' + escapeHtml(brief.summary) + '</p>');
    if ((brief.improvements || []).length > 0) {
      parts.push('<h4>📈 שיפור</h4><ul>');
      brief.improvements.forEach(function(i) {
        parts.push('<li>' + escapeHtml(i.label) + ': +' + Number(i.delta_pct).toFixed(1) + '%</li>');
      });
      parts.push('</ul>');
    }
    if ((brief.concerns || []).length > 0) {
      parts.push('<h4>📉 דאגות</h4><ul>');
      brief.concerns.forEach(function(c) {
        parts.push('<li>' + escapeHtml(c.label) + ': ' + (c.delta_pct >= 0 ? '+' : '') + Number(c.delta_pct).toFixed(1) + '%' +
          (c.focus_suggestion ? ' — <em>' + escapeHtml(c.focus_suggestion) + '</em>' : '') + '</li>');
      });
      parts.push('</ul>');
    }
    return parts.join('');
  }
  // ... renderWeekDropdown + wireDropdown ...
  
  window.renderWeeklyBriefPanel = renderWeeklyBriefPanel;
})();
```

The above structure stays under 150 lines.

**Embed in Deliverable A's dashboard:** the funnel dashboard JS file (from SPEC A) adds a `<div id="weekly-brief-host">` element + a render call `if (window.renderWeeklyBriefPanel) window.renderWeeklyBriefPanel(host);` in its render flow — ≤ 20 lines added.

---

## 4. Autonomy Envelope

### CAN do autonomously
- Read any file in worktree.
- Run Level 1 + Level 2 SQL via Supabase MCP (declared in §3.5 + migration).
- Apply 1 migration via MCP `apply_migration` with name `m4_weekly_optimization_brief`.
- Deploy 1 new EF (`weekly-funnel-brief`) via MCP `deploy_edge_function`. CLI fallback per OPEN-021 on 5xx.
- Manual test-invoke the EF once via MCP `execute_sql` `net.http_post` (or via `curl`) AFTER deploy to produce sample briefs.
- Modify exactly these files:
  - NEW: `supabase/functions/weekly-funnel-brief/index.ts`, `supabase/functions/weekly-funnel-brief/deno.json` (if needed), `supabase/migrations/{ts}_m4_weekly_optimization_brief.sql`, `modules/crm/crm-weekly-brief-panel.js`.
  - MODIFIED: `modules/crm/crm-funnel-dashboard.js` (+≤20 lines for panel embed), `crm.html` (+1 script tag), `docs/FUNNEL_HEALTH_DASHBOARD.md` (+15-30 lines Weekly Brief section).
- Stage by explicit filename.

### MUST STOP
- Need to modify ANY file outside the 6 declared.
- Deliverable A's mv doesn't exist yet (B depends on A — Executor must verify).
- More than 1 new table, 1 new EF, 1 new cron job declared.
- Brief §4.2/§4.4/§4.6 touch.
- Need to add new placeholders/action_types/trigger types (Rule 35).
- Iron Rule 31/32 fail.

---

## 5. Stop-Triggers (extended)

1. EF deploy fails on both MCP and CLI fallback → STOP.
2. Manual test-invoke produces zero rows (e.g., mv empty or query error) → STOP.
3. Cron schedule != `0 3 * * 0` → STOP.
4. Sample brief summary contains literal `null` or `undefined` in customer-facing text → STOP (data shape regression).

---

## 6. Pipeline

Full 5-hat (same model as Deliverable A):

1. **Foreman (Opus)** authors this SPEC (DONE).
2. **Executor (Sonnet)** Step 1.5 + migration + EF + frontend + manual test-run + retrospective (4 commits).
3. **Reviewer (default)** audits.
4. **Localhost-Tester (default)** smoke + Chrome MCP triplet on dashboard panel.
5. **Foreman closes (Opus)** with FOREMAN_REVIEW.md.

---

## 7. Out of Scope

- AI prose generation (deterministic v1 only; v2 SPEC).
- IST-aware cron timing (Sunday 03:00 UTC fixed; DST drift accepted).
- Modifying any Brief §4.2 table / §4.4 EF / §4.6 trigger.
- Storefront repo work.
- Email/SMS delivery of the brief (UI-surfaced only in v1; v2 may add email-to-Daniel).
- More than 1 new table or 1 new EF (Brief §4.7).

---

## 8. Expected Final State

| File | Action | Expected size |
|---|---|---|
| `supabase/migrations/{ts}_m4_weekly_optimization_brief.sql` | NEW | ≤ 100 lines |
| `supabase/functions/weekly-funnel-brief/index.ts` | NEW | ≤ 350 lines (±5 buffer) |
| `supabase/functions/weekly-funnel-brief/deno.json` | NEW (if needed by project convention) | ≤ 15 lines |
| `modules/crm/crm-weekly-brief-panel.js` | NEW | ≤ 150 lines |
| `modules/crm/crm-funnel-dashboard.js` | MODIFIED | +≤ 20 lines for panel embed |
| `crm.html` | MODIFIED | +1 line script tag |
| `docs/FUNNEL_HEALTH_DASHBOARD.md` | MODIFIED | +15-30 lines Weekly Brief section |
| Plus SPEC.md / EXECUTION_REPORT / FINDINGS / REVIEW / TEST_REPORT / FOREMAN_REVIEW | NEW per phase | standard sizes |

**DB state:**
- 1 new table + 1 UNIQUE constraint + 1 index + 2 RLS policies.
- 1 new EF deployed.
- 1 new cron job active.
- 2 rows in `funnel_weekly_briefs` after manual test-run (one per tenant).

---

## 9. Rollback Plan

```sql
DROP TABLE IF EXISTS public.funnel_weekly_briefs CASCADE;
SELECT cron.unschedule('weekly_funnel_brief_generation');
```
Plus EF undeploy via MCP / Dashboard + `git revert` of frontend commits. All additive.

---

## 10. Commit Plan

- **C1** (already done — this SPEC.md): `chore(spec): seal M4_WEEKLY_OPTIMIZATION_BRIEF — Deliverable B of Phase 2.5`.
- **C2**: `feat(m4): M4_WEEKLY_OPTIMIZATION_BRIEF — table + RLS + cron (Deliverable B migration)`.
- **C3**: `feat(m4): M4_WEEKLY_OPTIMIZATION_BRIEF — weekly-funnel-brief EF + first test run`.
- **C4**: `feat(m4): M4_WEEKLY_OPTIMIZATION_BRIEF — UI panel + dashboard embed`.
- **C5**: `chore(spec): M4_WEEKLY_OPTIMIZATION_BRIEF — Executor retrospective`.

---

## 11. Destructive Operations

**Count: 0.** All work additive.

---

## 12. Cross-References

- **Parent Brief:** `M4_FUNNEL_PHASE_2_5_OVERNIGHT_BRIEF.md`.
- **Companion (Deliverable A):** `M4_FUNNEL_HEALTH_DASHBOARD/SPEC.md`.
- **Consumes:** `mv_funnel_health_dashboard` (from A).
- **Iron Rules:** 12, 14, 15, 18, 21, 22, 31, 32, 34, 35.

---

## 13. Author Notes

This SPEC is the simplest of Phase 2.5 — once A's mv exists, B is a straight read-classify-write pipeline. The deterministic classifier is hardcoded thresholds; everything else is plumbing.

The single design choice worth flagging: storing `metric_snapshot` JSONB per row enables the 4-week-baseline lookup WITHOUT querying the live mv multiple times. Each Sunday's run reads the LAST 4 rows from this table for prior averages. Self-contained history; trivial to audit.

---

*End of SPEC.*
