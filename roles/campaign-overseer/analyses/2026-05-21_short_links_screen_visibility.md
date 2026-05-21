# Short-Links Stats Screen — Static-Link Visibility — Findings

> **Brief:** `roles/campaign-overseer/briefs/2026-05-21_SHORT_LINKS_SCREEN_VISIBILITY_BRIEF.md`
> **Period:** snapshot at 2026-05-21
> **Tenant:** both (demo + prizma)
> **Authority mode:** READ-ONLY — no DB writes, no code edits
> **Headline:** The Lead's filter hypothesis is **REFUTED**. The static-card section does not consume the filter-bar state at all. The actual root cause is a **per-tenant content parity gap**: demo has 2 `template_static` rows; prizma has 4. The screen is rendering correctly per design.

---

## 0. Reality check

| Item | Value |
|---|---|
| `short_links` cardinality on Prizma | 8,206 rows — above PostgREST 1000-row cap |
| `short_links` cardinality on demo | 820 rows — safe |
| Treatment for queries against `short_links` | filtered by `link_type='template_static'` first (≤ 4 rows per tenant — no risk of silent truncation) |
| Metric sources used in this analysis | DB columns only (`short_links.link_type`, `expires_at`, `lead_id/event_id/broadcast_id`); click counts aggregated from `short_link_clicks` via `MAX(clicked_at)` and `COUNT(*)` — no UI-state probe |
| Drift from brief's assumptions | YES — see §2. Brief assumed "default filters hide rows"; code + DB say the static card has no such filters |
| Iron Rule 35 boundary | Respected — recommendations are RECOMMEND-ONLY; any code change to the screen is Architect SPEC territory |

---

## 1. Confirmation table — every static-shared short link

A "static-shared" link is one with `lead_id IS NULL AND event_id IS NULL AND broadcast_id IS NULL`. The screen's "קישורים סטטיים (משותפים)" section then narrows further to `link_type='template_static' AND expires_at > NOW()`.

### 1.1 Demo tenant — static-shared rows

| Code | `link_type` | Target | Clicks | Last click | `expires_at` | Appears on screen with default filters? |
|---|---|---|---|---|---|---|
| `NCoQWzbd` | `template_static` | `…/supersale-takanon/` (תקנון) | 2 | 2026-05-14 17:45 | 2099-12-31 | ✅ YES |
| `dsruWc1z` | `template_static` | `gpw.gamaf.co.il/…` (gamaf) | 1 | 2026-05-14 17:24 | 2099-12-31 | ✅ YES |
| `M4P2DTST` | `test` | `opticup-storefront-demo.vercel.app/` | 1 | 2026-05-14 15:51 | **2026-05-14 16:51 (EXPIRED)** | ❌ NO — wrong `link_type` AND expired |

Demo total: **3 static-shared rows**, of which **2 are visible** (NCoQWzbd + dsruWc1z) — exactly what Daniel reported seeing.

### 1.2 Prizma tenant — static-shared rows

| Code | `link_type` | Target | Clicks | Last click | `expires_at` | Appears on screen with default filters? |
|---|---|---|---|---|---|---|
| `5CBy1Do4` | `template_static` | `…/supersale-stock/` (stock) | 5 | 2026-05-21 07:22 | 2099-12-31 | ✅ YES |
| `CEiBGCWj` | `template_static` | `…/supersalepricescatalog/` (**pricing**) | 2 | 2026-05-21 07:22 | 2099-12-31 | ✅ YES |
| `f9Avttrn` | `template_static` | `…/supersale-takanon/` (תקנון) | 2 | 2026-05-14 17:45 | 2099-12-31 | ✅ YES |
| `KvSzd3Zz` | `template_static` | `gpw.gamaf.co.il/…` (gamaf) | 2 | 2026-05-14 18:06 | 2099-12-31 | ✅ YES |

Prizma total: **4 static-shared rows**, **all 4 visible** on a Prizma view of the screen.

---

## 2. Root-cause statement — what the code actually does

### 2.1 The static-card filter is NOT the same as the filter-bar

**File:** `modules/crm/crm-short-links-tiles/template-static-card.js` lines 49–94
**Filter applied (the only filter):**

```js
sb.from('short_links')
  .select('id, code, target_url, expires_at')
  .eq('tenant_id', tid)                       // RLS + defense-in-depth
  .eq('link_type', 'template_static')         // hard-coded link_type
  .gt('expires_at', new Date().toISOString()) // exclude expired
```

The static card receives `container` as its only argument (`render(container)` — line 26). It never calls `CrmShortLinksFilterBar.getState()`. The filter-bar state object `{ onlyWithClicks, days, customFrom, customTo, linkTypeFilter }` (`filter-bar.js` lines 16–22, ON-by-default at line 17, 30-day default at line 18) is only consumed by `CrmShortLinksBroadcastsTable.render(...)` and `CrmShortLinksDrilldown.openForBroadcast(...)`.

**Conclusion:** the "רק עם קליקים" checkbox and the "30 ימים" period have ZERO effect on the static-shared section. The Lead's hypothesis ("default filters hide static links whose last click falls outside 30 days") is **refuted by the source code**.

### 2.2 What actually controls visibility in §"קישורים סטטיים (משותפים)"

The screen shows a row IF AND ONLY IF the underlying `short_links` row matches:

1. `tenant_id` = current tenant (enforced by RLS + explicit `.eq()`)
2. `link_type = 'template_static'` — exact string match
3. `expires_at > NOW()` — not expired

That's the entire filter. There is no period filter, no click-count filter, no broadcast filter.

### 2.3 Why pricing-catalog is "missing" from what Daniel saw

The brief's framing ("the screen Daniel viewed appears to be the demo tenant") is correct — Daniel was viewing demo, and demo has only 2 `template_static` rows (תקנון + gamaf). **The pricing-catalog row exists ONLY on prizma** (`CEiBGCWj`). There is no demo equivalent.

So the apparent "missing row" is not the screen filtering out a row that exists; it is **a row that does not exist on demo at all**. This is a per-tenant content gap, not a UI bug.

Cross-checked symmetry:

| Storefront page | Prizma `template_static` code | Demo `template_static` code |
|---|---|---|
| `/supersale-takanon/` (תקנון) | `f9Avttrn` ✓ | `NCoQWzbd` ✓ |
| gamaf gpw | `KvSzd3Zz` ✓ | `dsruWc1z` ✓ |
| `/supersale-stock/` | `5CBy1Do4` ✓ | **(none — gap)** |
| `/supersalepricescatalog/` | `CEiBGCWj` ✓ | **(none — gap)** |

Demo has 50% parity with prizma's static-link infrastructure. Stock + pricing-catalog never had demo equivalents created.

---

## 3. demo-vs-prizma confirmation

| Question from brief §6.3 | Finding |
|---|---|
| Are per-tenant distinct codes by design? | **Yes — confirmed.** Each tenant's static links use unique random codes (NCoQWzbd vs f9Avttrn for the same target URL). The `code` column has a tenant-scoped UNIQUE constraint pattern consistent with Iron Rule 18. This is correct multi-tenant behavior. |
| Are per-tenant distinct target URLs by design? | **Partial.** Demo and prizma's takanon links both point to `www.prizma-optic.co.il/supersale-takanon/` — same URL, different code. This is a separate question (demo's external links pointing at prizma's storefront) that is **out of scope for this brief** but flagged for the Lead. |
| Are the per-tenant counts the same? | **No.** Prizma has 4 `template_static`; demo has 2. Stock + pricing-catalog static infrastructure was never created on demo. |

---

## 4. Ranked recommendations

The Lead asked for ranked recommendations for a potential Architect SPEC. Since the diagnosis differs from the Lead's hypothesis, the recommendation set looks different from what the brief implicitly anticipated. Strongest first:

### 4.1 [HIGH — actionable, blocks Daniel's current work] Add demo equivalents for stock + pricing-catalog static links

**Why:** Daniel is mid-change on `event_registration_open` swapping stock link → pricing-catalog static link `CEiBGCWj`. Iron Rule 33 mandates demo-first verification before promoting any M4 config change to prizma. **Without a demo equivalent of `CEiBGCWj` (and `5CBy1Do4`), the template change literally cannot be tested on demo** — the resolved `/r/<code>` short URL in the sent SMS would point at a non-existent code on demo, returning 404.

**Who applies it:** This requires INSERT rows into `crm_short_links` for demo with `link_type='template_static'`. Per Iron Rule 35 §"Out of scope", direct INSERTs to short_links infrastructure are NOT in the Campaign Overseer's authority (templates/rules/broadcasts only). This is **Architect SPEC territory** — a small SPEC (≤ 10 lines of SQL, demo-only, idempotent) to backfill the 2 missing demo static-link rows.

**Impact:** Unblocks Daniel's SMS template change for IR33-compliant demo testing. Establishes demo parity for the existing 4 prizma static targets. Estimated 30 min of Architect work.

**Note:** the operator UX for *creating* these rows is unclear from the screen we audited (the screen is read-only — no "+ new static link" affordance). The SPEC should clarify whether to create them via direct SQL migration or surface a creation UI as a separate item.

### 4.2 [MEDIUM — clarity, not correctness] Make the static-card filter contract obvious in the UI

**Why:** A future operator (or Lead) seeing 2 rows on demo and 4 on prizma will keep asking the same question Daniel asked: "why fewer rows?" The current screen has no caption explaining that the static-card section ignores the filter bar entirely. The amber caption above the broadcasts table (`broadcasts-table.js` lines 53–60) covers a different concern (bot inflation) — there's no analogous explainer above the static card.

**Suggested SPEC scope:** add one line of helper text below the "קישורים סטטיים (משותפים)" heading: e.g., "מציג את כל קישורי התשתית הפעילים (`link_type='template_static'`) — אינו מושפע מהמסננים למטה". This is a `<span>` tag insertion in `template-static-card.js` around line 31.

**Impact:** Removes future confusion. Cheap.

### 4.3 [MEDIUM — diagnostic surface] Expose the demo/prizma asymmetry to operators

**Why:** Today, the operator must view each tenant's screen separately to learn that demo lacks 2 static links. There's no cross-tenant view. If the Campaign Overseer adds a new static link to prizma and forgets to mirror on demo (as happened here for stock + pricing-catalog), the gap is invisible until something breaks.

**Suggested SPEC scope:** EITHER (a) extend Sentinel Mission 11 (config parity) to include `short_links WHERE link_type='template_static'` parity checks; OR (b) extend the existing `scripts/sync-prizma-config-to-demo.mjs` (or its inverse) to treat template_static rows as part of M4 config that flows under Iron Rule 33.

**Impact:** Prevents future drift. Aligns the static-link infrastructure with the existing IR33-protected config-parity regime.

### 4.4 [LOW — REJECT] Default "רק עם קליקים" to OFF for the static section

**Why I am NOT recommending this:** the brief proposed this as part of the Lead's hypothesis. **It would have zero effect** — the static card does not read the toggle. Changing the default state of the toggle in `filter-bar.js` line 17 (`onlyWithClicks: true → false`) would change the **broadcasts table** behavior (which is independent), not the static card. Recommending this SPEC would solve the wrong problem.

### 4.5 [LOW — REJECT] Default period to "הכל"

**Same reasoning as 4.4.** The period chips affect the broadcasts table query (`broadcasts-table.js` line 103: `.gte('created_at', dateFrom.toISOString())`), not the static card. Changing the default to "הכל" would broaden the broadcasts table, not surface more static links. Wrong problem.

---

## 5. Escalations (Architect SPEC territory per Iron Rule 35)

| Item | Reason it cannot be done by Campaign Overseer / Analyst |
|---|---|
| Backfill `crm_short_links` rows for demo (stock + pricing-catalog) | INSERTs to short_links infrastructure are not in M4 config-authority surface (templates/rules/broadcasts only). Architect SPEC required. |
| Edit `template-static-card.js` to add helper text | Any `.js`/`.html` edit is Architect SPEC territory (Iron Rule 34 also applies — UI change requires Chrome MCP verification at SPEC close). |
| Extend Sentinel Mission 11 to monitor template_static parity | Sentinel mission additions are Architect SPEC scope. |
| Decide whether the demo storefront pages `/supersale-stock/` and `/supersalepricescatalog/` even exist | Out of scope for this analysis. The Lead should check with the Site Overseer before recommendation 4.1's SPEC is opened — if the demo storefront doesn't have those pages, the backfilled short links would 404 on demo. This is a prerequisite check, not a blocker for opening the SPEC. |

---

## 6. Stop-trigger compliance (brief §7)

The brief's §7 instructs the Analyst to STOP and write back if "the static links are missing for a reason OTHER than filters — that changes the SPEC scope, so surface it." This finding does change the SPEC scope (from "tweak default filter values" to "add demo equivalents of prizma's static infrastructure + minor UX clarity"). This document surfaces the finding clearly so the Lead can decide on the new SPEC direction. No further Analyst steps required — diagnosis is complete and verifiable from the source files + DB snapshot cited.

---

## 7. Cross-references

- **Source files read (read-only):**
  - `modules/crm/crm-short-links-stats.js` — orchestrator (4 sibling sections)
  - `modules/crm/crm-short-links-tiles/template-static-card.js` — `_loadData()` at lines 49–94 contains the canonical filter
  - `modules/crm/crm-short-links-tiles/filter-bar.js` — state shape at lines 16–22, defaults at lines 17–18
  - `modules/crm/crm-short-links-tiles/broadcasts-table.js` — confirms filter-bar consumers (broadcasts table only)
- **DB tables read:** `short_links`, `short_link_clicks`, `tenants` (slug lookup) — both demo + prizma
- **KB referenced:**
  - `KB_FUNNEL_CAPI.md` §5 (cardinality discipline — applied at §0 above)
  - `KB_MODULE_4.md` §4 (M4_SHORT_LINKS_DASHBOARD_REDESIGN context)
  - `M4_INFRASTRUCTURE_CONTRACT.md` §5 (Iron Rule 35 authority boundary — applied at §5 above)
- **Iron Rules cited:** 18 (tenant-scoped UNIQUE for codes — confirmed by per-tenant code pattern), 33 (demo-first — central to recommendation 4.1), 34 (UI Chrome MCP verification — applied to 4.2's SPEC closure), 35 (config-vs-infrastructure boundary — applied throughout §5)
- **Prior analyses:** none — this is the first analysis in `roles/campaign-overseer/analyses/`
- **Memory entries applied:** `feedback_probe_biggest_production_tenant.md` (probed both demo + prizma; cardinality estimate at §0 prevented silent 1000-row truncation)

---

*Analysis complete. RECOMMEND-ONLY. The Campaign Lead reads this, translates §2 + §3 + §4 to plain Hebrew for Daniel, and decides whether to open an Architect SPEC for recommendation 4.1 (highest priority — unblocks current SMS template change under IR33).*
