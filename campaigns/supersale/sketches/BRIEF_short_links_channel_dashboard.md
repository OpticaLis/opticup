# BRIEF — Short-links screen: per-channel click measurement (default total + filter)

**Author:** Events-Operations (Cowork) · **For:** Claude Code via the SPEC pipeline (Foreman authors SPEC → Executor builds → Reviewer → Localhost-Tester) · 2026-05-24
**Companion:** ACTIVATION_PROMPT_short_links_channel_dashboard.md
**Type:** UI screen change in the ERP (M4 / CRM area) — **NOT config.** Goes through the full pipeline with the Visual-Fidelity Gate (Iron Rule 34), not a direct Cowork edit.

---

## Objective

Two linked upgrades to the short-links screen:

**(A) Per-channel click view.** A campaign manager can see, per campaign wave, **how many clicks came from each channel (SMS vs email vs …)** — defaulting to a compact total-per-wave view, with channel filter buttons to break it down. Today the screen lists one row per short-link `code` with a single `click_count`; with the new per-channel code convention (below) that becomes many rows and is hard to read.

**(B) Channel-aware "create short link" flow (Daniel directive 2026-05-24).** The "+ קישור קצר חדש" create dialog must let the operator choose the channel(s) for the new link: **SMS only**, **email only**, or **both at once** (one click creates the matched pair). When the operator picks:
- one channel → create ONE `short_links` row with the channel-prefixed code (`S…` or `E…`) + `label = {purpose}_{channel}`.
- both → create TWO rows (an `S…` and an `E…`) pointing to the SAME `target_url`, labelled `_sms` / `_email`, so the same destination is measured per channel out of the box.
The dialog generates codes that follow the locked convention automatically (channel letter FIRST), collision-checks each against the full `short_links` table before insert, and (multi-tenant) scopes to the current tenant. The operator should NOT have to hand-type codes or remember the convention — the form enforces it.

## Background — what already exists (verified live 2026-05-24)

- Table `short_links` (tenant-scoped). Relevant columns: `code` (text, unique per `(tenant_id, code)`), `target_url`, `link_type` (`template_static` for campaign links), `label` (text — currently used to tag the logical link, e.g. `supersale_launch_wave2_sms`), `click_count` (int, auto-incremented by the `resolve-link` EF on every redirect — proven working), `tenant_id`.
- There is ALSO a richer per-click ledger: `short_link_clicks` (one row per click: `short_link_id`, `tenant_id`, `ip_hash`, `user_agent`, `referer`, `broadcast_id`, `clicked_at`) and a journey table `crm_lead_touchpoints` (touchpoint_type='short_link_click', carries `lead_id`, UTMs, dedupe). Either can power richer analytics later; for THIS screen, `click_count` per code is sufficient for the headline numbers.
- The `resolve-link` EF looks up `WHERE code = $1` with `.maybeSingle()` → **codes MUST be globally distinct** (a duplicate code across tenants breaks resolution). Demo and prizma therefore use different codes for the same logical link.

## The locked code convention (apply + document)

Campaign short-link `code` ends with a **channel letter**:
- `s` = SMS, `e` = email, (future) `w` = WhatsApp.

Code scheme: `SL` + `p`(prizma)/`d`(demo) + `w{N}` (wave number) + channel letter.
Examples currently live on Prizma: `SLpw1s`, `SLpw1e`, `SLpw2s`, `SLpw2e` (+ demo `SLdw1s` etc.).
`label` already tags each: `supersale_launch_wave{N}_{channel}`.

This convention is the grouping key for the screen:
- **Wave grouping** = the shared prefix up to the channel letter (`SLpw2` → wave 2). Equivalently, the `label` minus the trailing `_sms`/`_email`.
- **Channel** = trailing letter (`s`/`e`) — equivalently the `label` suffix.

## Required behaviour

1. **Default view = one row per logical link/wave, showing TOTAL clicks across all its channels.** E.g. one row "אירוע השקה - גל 2" with total = SMS clicks + email clicks. Compact; does not explode to one row per channel.
2. **Channel filter control** at the top: `הכל | SMS | מייל` (extensible to WhatsApp). Selecting a channel re-renders the same rows but shows only that channel's clicks per wave. "הכל" = sum.
3. Optionally, an expand/disclosure on each row to show the per-channel split inline (SMS: X, מייל: Y) without leaving the page — nice-to-have, not required for v1.
4. Group/label rendering uses the convention above; if a short link does NOT follow the convention (e.g. legacy per-lead links, or a campaign link with no channel suffix), show it as-is in an "אחר/ללא ערוץ" bucket — do NOT hide it.
5. RTL, mobile-first, matches the existing CRM screen styling. No new colors outside the design canon.

## Constraints / rules in force

- ERP repo `opticalis/opticup`, branch `develop`. Iron Rules 1-23 + 31-35 apply.
- Iron Rule 34: this touches browser JS/HTML → closure REQUIRES Chrome MCP evidence (screenshot of the working filter + runtime trace + DB-query evidence) AND the Visual-Fidelity Gate region table. SQL-only verification is insufficient.
- Reads only via the existing helpers / Views per Rule 7/13; if a new aggregation View is needed (e.g. `v_short_link_clicks_by_wave_channel`), follow Rule 13/17 + tenant_id + RLS.
- No change to `resolve-link` EF or the `short_links` write path — this is a READ/display feature.
- Surgical edits; no behavior change to click counting.

## Expected deliverables / verification evidence

- The short-links screen renders default totals-per-wave + working channel filter.
- Chrome MCP: screenshot of default view + screenshot after clicking "SMS" filter + runtime trace showing the filter re-render + a DB query proving the displayed totals equal `SUM(click_count)` grouped by wave/channel.
- Visual-Fidelity Gate region table in TEST_REPORT.md + FOREMAN_REVIEW.md.
- Clean repo at close.

## Out of scope (note for Foreman)

- Click-to-registration conversion attribution (joining `short_link_clicks`/`crm_lead_touchpoints` → `crm_event_attendees`). Valuable, but a separate analytics SPEC. This SPEC is just the channel-split click view.
