# FOREMAN_REVIEW — M4_CAMPAIGNS_V2_METRICS_AND_DATERANGE

> **Reviewer:** opticup-strategic (Foreman hat)
> **Date:** 2026-05-02
> **SPEC author:** Campaign Overseer (Cowork 2026-05-02)
> **Status:** 🟢 APPROVED WITH DELTAS — split into 3 Rungs, executor-ready prompts written
> **Verdict scope:** This review covers SPEC quality + Rung split + open-decision resolution. Execution review will follow each Rung's `EXECUTION_REPORT.md`.

---

## 1. SPEC quality audit

### What the SPEC got right

- **Evidence-based.** §3 is grounded in real DB queries + the live Make blueprint, not assumptions. Every claim has a verification path.
- **Iron-Rule compliance pre-checked.** §4 walks Rules 14, 15, 18, 21, 22, 12 against the proposed change. Caught the file-size risk on `crm-campaigns.js` upfront.
- **Rollback plan is real.** §9 names the exact DDL to undo each change + cites the source-of-truth view definition by file:line.
- **Pre-flight is concrete.** §11 is a 7-step list the executor can mechanically run.
- **Open Decision flagged correctly.** §5.7 is exactly the right place to stop authoring and ask the Foreman — not to silently pick one.

### What needed Foreman correction (deltas)

Each of these is a real gap in the SPEC; the Rung prompts incorporate the fix.

| # | SPEC claim | Live reality | Delta applied |
|---|---|---|---|
| D1 | §3 says "7 active campaigns / 7 spend rows" (prizma scope) | 14 fb_campaigns across 2 tenants; 56 ad_spend rows across 7 distinct dates | Rung 1 success criterion #4 reframes perf target as "≤500ms with ≥50 campaigns × ≥30 days" — scoped to actual + headroom |
| D2 | §5.4 HTTP body shows "5 fields above" | Live blueprint has **6** per-campaign fields (`campaign_id, name, status, event_type, daily_budget, total_spend`) + envelope (`tenant_slug, shared_secret`) | Rung 2 prompt embeds the **exact current blueprint snapshot** + the exact target body — no paraphrase |
| D3 | §5.6 says `crm-campaigns.js` is "~280 lines target" | Actual is **250 lines** | Headroom = 100 lines to 350 cap. Adding date-range selector + ROAS card + 3 cols ≈ +110 lines → will breach. Rung 3 is ordered: extract `crm-campaigns-daterange.js` (~60 lines) FIRST, then add features. |
| D4 | §3 says `start_time` not in `listCampaigns` output | Live blueprint module 1 (`facebook-ads-cm:listCampaigns`) **does** return `start_time` (Make's expected output schema) — no API change needed; just map `{{1.start_time}}` into the HTTP body | Rung 2 confirms `start_time` is module-1-side (free), only `impressions` + `clicks` need module-2-side field additions |
| D5 | §11 #5 verifies function absence | Confirmed live: `get_campaign_performance` not in `pg_proc`. Pre-flight stands. | No change |
| D6 | §8 stop-trigger #1 says ANY active code reference to old view = STOP | Confirmed: `modules/crm/crm-campaigns.js:64` calls `sb.from('v_crm_campaign_performance').select('*')` — this IS the active code path | Rung 1 keeps a thin VIEW-as-wrapper around the function (`SELECT * FROM get_campaign_performance(tenant_id, '1900-01-01', current_date)`) so Rung 1 doesn't break the live screen — Rung 3 then migrates the call site |

### What the SPEC missed entirely

- **Stale lifetime totals on `crm_facebook_campaigns.total_spend`.** That column is currently maintained by the EF as a denormalised lifetime sum. After Rung 1 the function will compute spend from `crm_ad_spend` directly (range-aware), so `crm_facebook_campaigns.total_spend` becomes redundant — but the EF still writes it. **Not a blocker.** Captured as tech debt; addressed in §6 below.

- **`shared_secret` envelope field.** Live HTTP body includes `shared_secret` ahead of `campaigns:[]`. SPEC §5.4 doesn't mention it. The EF currently validates this. Rung 2 prompt makes it explicit so the executor doesn't strip it.

---

## 2. Decision on §5.7 — Open Decision: City + audience extraction

### Decision: **Path X3 — Defer to a separate post-cutover SPEC.**

### Reasoning (in order of weight)

1. **Path X1 violates Rule 9 + SaaS litmus test.** Parsing "אשקלון" / "תל אביב" tokens out of a campaign name encodes Prizma's naming convention into shipped code. Tenant 2 (different country, different Hebrew/English mix, different naming discipline) breaks the parser the day they onboard. The whole point of Rule 9 is that no tenant-specific business string lives in code — including in regex form.

2. **Path X2 expands scope by 4–6h** for a deliverable that Daniel already framed as "important for tomorrow", not "important now". Adding a new Make module + adset endpoint + adset schema during the cutover window is the wrong axis.

3. **Daniel's own framing aligns.** "עיר וקהל יעד … חשוב למחר" = post-cutover.

### What still ships in Rung 1 (despite X3)

The columns `city TEXT NULL` + `audience_label TEXT NULL` **DO ship** in Rung 1 schema additions:

- They're additive, NULL-safe, and free to add now.
- They give the deferred SPEC a landing zone — no second schema migration when the city/audience SPEC eventually runs.
- They cost nothing if the deferred SPEC never runs.

What does NOT ship: any extraction logic (no parser, no adset call). Columns stay NULL until the deferred SPEC populates them.

### Follow-up SPEC stub

`modules/Module 4 - CRM/docs/specs/CITY_AND_AUDIENCE_FROM_ADSETS/SPEC.md` — author after cutover stabilises. Will choose between X2 (preferred, structural correctness) and a hybrid (X2 for new tenants, X1 backfill for prizma's historical names). Out of scope for this review.

---

## 3. Validation of §5.3 — Path A (function vs materialized view)

**Confirmed: Path A (SQL function). No materialized view.**

### Live data volumes (verified 2026-05-02)

- 14 campaigns across 2 tenants → ~7 per tenant
- 56 ad_spend rows over 7 days → max ~30 rows per tenant per range query
- Joins: `crm_leads` (modest), `crm_event_attendees` (modest)

A function over this volume returns in tens of milliseconds. 4–6 materialised views with refresh hooks every 4h is operational complexity unjustified at this scale. Path A wins on simplicity AND correctness (no staleness window).

The §5.3 stop-trigger ("function exceeds 500ms on demo with 50 seed campaigns × 30 days") stands — if it ever fires, that's the moment to revisit Path B.

---

## 4. Validation of §5.6 — File-size assumption

**Live count:** `modules/crm/crm-campaigns.js` = **250 lines** (SPEC said ~280, off by 30 — favourable).

**Headroom to 350 cap:** 100 lines.

**Estimated additions in Rung 3:**
- Date-range button group + persistence: ~40 lines
- RPC integration (replace `.from()` with `.rpc()`): ~10 lines
- ROAS KPI card: ~10 lines
- 3 new table columns + cell renderers: ~35 lines
- Range-change re-render wiring: ~15 lines
- **Total: ~110 lines → 360 → BREACHES cap**

**Plan applied to Rung 3:** Extract `crm-campaigns-daterange.js` (~60 lines: button group, localStorage, range-helpers) **before** adding the new features. Net effect on `crm-campaigns.js` after Rung 3: 250 − 30 (extracted helpers that already exist as inline code) + 80 (new feature lines net of extraction) ≈ 300 lines. Within cap.

---

## 5. Rung breakdown

The Overseer suggested 3 Rungs (DB / EF+Make / UI). Approved with one amendment: keep the **view-as-wrapper** in Rung 1 so the live screen continues to work between Rung 1 close and Rung 3 close (which migrates the call site).

### Rung 1 — Schema + function (DB only)

**Owns success criteria from §6:** #1, #2, #3, #4, #5
**Plus added by Foreman:** "Keep `v_crm_campaign_performance` as a thin VIEW that calls `get_campaign_performance(tenant_id, '1900-01-01', current_date)` — do not DROP the view name; replace its definition. This preserves the live screen between Rungs."

**Verification gate at close:**
- §6 #19 (`verify:integrity` exit 0)
- §6 #20 (pre-commit hooks pass)
- §6 #22 (repo clean)

**Estimated effort:** 1.5–2h.
**Risk:** Low. All operations additive or DROP+CREATE on a function that doesn't exist yet.

### Rung 2 — Edge Function + Make scenario (data pipeline)

**Owns success criteria from §6:** #6, #7, #8, #9, #10, #11

**Verification gate at close:**
- 2 curl tests (old payload + new payload) both return `ok:true`.
- Manual Make scenario run — verify `crm_ad_spend` rows for today have non-zero `impressions`/`clicks` for at least one prizma campaign with active spend.
- §6 #19, #20, #22.

**Estimated effort:** 1–1.5h (EF) + 30 min (Make blueprint) + 30 min (verification).
**Risk:** Medium. Make blueprint edit touches a live scenario that runs every 4h. Mitigation: edit after a known sync (next at 21:36 today), test, leave next sync to validate.

### Rung 3 — UI (date-range + ROAS card + 3 columns)

**Owns success criteria from §6:** #12, #13, #14, #15, #16, #17, #18, #21

**Verification gate at close:**
- Browser smoke on demo: each of 6 ranges renders, numbers diff between ranges, ROAS shows "—" when spend=0.
- File-size verify: `crm-campaigns.js` ≤ 350.
- §6 #19, #20, #22.

**Estimated effort:** 3–4h.
**Risk:** Low. Pure frontend. Worst case = revert commit.

---

## 6. Pre-cutover vs post-cutover ordering

**Recommendation: Rung 1 + Rung 2 BEFORE cutover-end. Rung 3 AFTER cutover stabilises.**

### Why Rung 1 + 2 must land pre-cutover

Facebook Insights returns **lifetime aggregate** for `impressions` and `clicks`, not daily history. The Make scenario records a daily snapshot. Every day the scenario runs without `impressions`/`clicks` in the body = a row in `crm_ad_spend` with zero values that can never be backfilled. The cutover is the first weekend prizma is fully on the new pipeline; missing those days permanently is an avoidable own-goal.

Order tonight:
1. Rung 1 (DB) — safe, reversible, no live-screen impact thanks to view-as-wrapper.
2. Rung 2 (EF additive + Make blueprint) — EF first (accept new fields, don't require them), then Make blueprint update (start sending them). After Rung 2's first scenario run, validate one prizma campaign has non-zero impressions on today's `crm_ad_spend` row.

If Rung 1 + 2 cannot land before the next 4h sync window (next sync 21:36 today, then every 4h after) — accept the data gap and ship Rung 1 + 2 as soon as practical. Each missed sync ≈ 4h of lifetime-aggregate data is irrelevant; what matters is that the scenario stabilises on the new payload before the cutover weekend's heavy ad-spend window.

### Why Rung 3 defers

- The current screen works. Daniel can make ad-buying decisions today using lifetime numbers + the existing 6 KPI cards.
- UI changes mid-cutover create cognitive load when the team is already in cutover mode.
- Date-range selector benefits from real range-segmented data, which only accumulates over time. Shipping it Sunday morning when there's only one day of new-payload data shows ranges that look identical — ships a feature that visibly does nothing for a week. Better to ship Rung 3 mid-week with a real range-comparison story.

### Tech debt deferred

| Item | Severity | When |
|---|---|---|
| `crm_facebook_campaigns.total_spend` becomes redundant after Rung 1 (function aggregates from `crm_ad_spend`). EF still writes it. | Low | Drop in a post-Rung-3 cleanup SPEC after confirming no other consumer reads it. Do NOT drop in this SPEC — risk vs reward. |
| City + audience extraction (§5.7 X3) | Medium (business value, not technical) | Separate SPEC post-cutover. |
| Multi-adset breakdown | Low | Separate SPEC, far future. |

---

## 7. Improvement proposals (per skill self-improvement mandate)

### opticup-strategic (this skill) — 2 proposals

#### Proposal SA-1: Tenant-scope verification when documenting live state

**Trigger:** SPEC §3 stated "7 campaigns / 7 spend rows" — live truth was 14 campaigns across 2 tenants, 56 spend rows over 7 days. The Overseer was reading prizma data and stated it as global truth.

**Proposed change:** Add to `.claude/skills/opticup-strategic/SKILL.md` §"Step 1 — Pre-SPEC Preparation", after step 4:

> **4a. Live-state evidence must be tenant-aware.** When writing §3 "What exists today" (or equivalent), every count or row reference MUST specify which tenant scope it represents. If the SPEC's evidence comes from one tenant, the SPEC must explicitly say so AND document the count across ALL tenants for cross-check. Pattern: "`crm_X` has N rows on prizma / M rows total across all tenants (verified DATE)". A single ungrounded count is a SPEC defect.

**Why this prevents recurrence:** Forces the author to run a `WHERE tenant_id = …` AND a global count, which would have caught D1 in this SPEC during authoring rather than during Foreman review.

#### Proposal SA-2: Embed Make blueprint snapshots, never paraphrase

**Trigger:** SPEC §5.4 said "the HTTP body has only these fields: 5 fields" but the live blueprint has 6 per-campaign fields + envelope (`shared_secret`). The discrepancy was minor but masks a real risk: if the executor follows the SPEC's paraphrase verbatim, they strip `shared_secret` and break the EF auth.

**Proposed change:** Add to `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" Step 3 (or to the SPEC template under a new "External integration snapshots" section):

> **External integration snapshots are mandatory for any SPEC that modifies a Make scenario, Edge Function payload, webhook contract, or third-party API call.** The SPEC MUST embed (in a fenced code block) the exact current state of the integration as of authoring: full Make blueprint excerpt for affected modules, full EF request/response shape, full webhook headers + body. Paraphrase is forbidden. The Foreman or executor must be able to produce the new state by diffing against the embedded snapshot, not by re-discovering current state.

**Why this prevents recurrence:** Eliminates a class of SPEC-vs-reality drift that compounds over time as integrations evolve. The Rung 2 prompt below already embeds the snapshot — formalise it as protocol.

### opticup-executor — 2 proposals

#### Proposal SE-1: Pre-flight tenant-aware existence checks for new DDL

**Trigger:** SPEC §11 #3 says "Verify `crm_facebook_campaigns.start_time` does NOT exist". A correct check, but doesn't catch the related risk: a column with the same name on a different tenant-scoped table. Executor should grep `start_time` across `information_schema.columns` not just on the target table.

**Proposed change:** Add to `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 DB Pre-Flight":

> When SPEC adds a column, query `information_schema.columns WHERE column_name = '<new_col>'` across ALL tables, not just the target. If a hit is found on another table — STOP and ask Foreman whether the semantics match (consistency win) or differ (rename to avoid).

#### Proposal SE-2: View-as-wrapper pattern when migrating off a view

**Trigger:** Rung 1 of this SPEC must replace `v_crm_campaign_performance` with a function while keeping a wrapper view so the live frontend (`crm-campaigns.js:64`) doesn't break between Rungs. This pattern recurs whenever a view is migrated to a function (range-aware aggregation), but is not codified anywhere.

**Proposed change:** Add to `.claude/skills/opticup-executor/SKILL.md` §"Common patterns" (or create the section):

> **View-to-function migration pattern.** When a SPEC replaces a view with a parameterised function, the default execution is: (1) create the function; (2) `CREATE OR REPLACE VIEW` the original name as `SELECT * FROM new_function(<safe defaults>)` so existing call sites continue to work; (3) only after all consumers migrate to direct RPC calls in a later commit, drop the wrapper view. This decouples DB migration from UI migration and lets each Rung close cleanly.

---

## 8. Master-doc update checklist

| File | Status |
|---|---|
| `MASTER_ROADMAP.md` | NOT UPDATED — wait until Rung 3 closes (full feature lands), then one line: "M4 Campaigns v2 — date-range + impressions/clicks/ROAS shipped DATE" |
| `docs/GLOBAL_MAP.md` | NOT UPDATED — at Integration Ceremony after Rung 3, add `get_campaign_performance(...)` to the function registry |
| `docs/GLOBAL_SCHEMA.sql` | NOT UPDATED — at Integration Ceremony after Rung 1, merge new columns + function definition |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | DEFERRED to Rung 3 close (executor's responsibility per §2 #6 in main SPEC) |
| `modules/Module 4 - CRM/docs/CHANGELOG.md` | DEFERRED — one section per Rung at its close commit |
| Module SESSION_CONTEXT | DEFERRED to Rung 3 close |
| `modules/Module 4 - CRM/docs/db-schema.sql` | UPDATE in Rung 1 (new columns + function); will then merge into GLOBAL_SCHEMA at ceremony |

---

## 9. Verdict

🟢 **APPROVED — proceed to Rung 1.**

§5.7 resolved (X3). §5.3 confirmed (Path A). §5.6 split planned. 6 deltas captured (D1–D6), all incorporated into the Rung activation prompts.

Three executor-ready prompts written:
- `RUNG_1_ACTIVATION_PROMPT.md` — DB schema + function + view-as-wrapper.
- `RUNG_2_ACTIVATION_PROMPT.md` — EF additive + Make blueprint update.
- `RUNG_3_ACTIVATION_PROMPT.md` — UI date-range selector + ROAS card + 3 columns + file split.

Cutover order: Rung 1 → Rung 2 BEFORE cutover-end (capture impressions/clicks daily snapshots from cutover weekend onward). Rung 3 mid-week post-cutover.

---

*End of FOREMAN_REVIEW.md. Author: opticup-strategic. Drafted 2026-05-02.*
