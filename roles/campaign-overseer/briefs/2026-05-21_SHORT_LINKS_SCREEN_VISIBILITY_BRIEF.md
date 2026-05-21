# Short-Links Stats Screen — Static-Link Visibility — Brief

> **Sealed:** 2026-05-21 · **Author:** Campaign Lead · **Audience:** `opticup-campaign-performance-analyst`
> **Risk class:** LOW (read-only investigation; produces a findings doc, no DB writes, no UI changes)

## 1. Goal (one line)

Diagnose why the "קישורים קצרים" stats screen (CRM → קישורים קצרים) does not display all static short links, and produce a findings doc that lets the Campaign Lead decide whether to open an Architect SPEC to fix the screen.

## 2. Background (3–5 sentences)

Daniel opened the short-links stats screen and saw only 2 entries under "קישורים סטטיים (משותפים)" — `NCoQWzbd` (תקנון) and `dsruWc1z` (gamaf). He expected to also see the static link to the pricing-catalog page he is now using in the registration-open message. Read-only probing by the Lead already established two facts the Analyst should CONFIRM independently and then build on: (a) the pricing-catalog static link **does exist** in `short_links` — code `CEiBGCWj` on prizma / a demo equivalent — with `lead_id`, `event_id`, `broadcast_id` all NULL, `expires_at` = 2099 (i.e. a genuine static-shared link); (b) the screen Daniel viewed appears to be the **demo** tenant (its codes `NCoQWzbd`/`dsruWc1z` are demo rows), while prizma has its own distinct codes (`f9Avttrn` for תקנון, `5CBy1Do4` stock, `CEiBGCWj` pricing) — i.e. per-tenant codes are BY DESIGN, not a bug. The Lead's hypothesis for the missing rows: the screen's default filters — checkbox "רק עם קליקים" (only-with-clicks) ✓ + period "30 ימים" — hide static links whose last counted click falls outside the 30-day window (e.g. pricing-catalog's prior click history). The Analyst's job is to verify the root cause precisely so a future SPEC fixes the right thing.

## 3. Constraints

- **Iron Rule 35 boundary** — the fix (if any) is a UI/code change to the stats screen, which is **Architect SPEC territory**, NOT campaign-team or Overseer territory. The Analyst does NOT design or implement the fix. The Analyst only diagnoses and reports.
- **Authority mode** — READ-ONLY. No DB writes, no UI edits, no EF changes. SELECT queries only.
- **No-PII-in-output** — the findings doc must not contain lead phone numbers, emails, or names. Short-link codes + target URLs + click counts only.
- **demo vs prizma** — when reporting counts, always label which tenant. Do not conflate them.

## 4. Scope — what to touch

| Surface | Access |
|---|---|
| `short_links` table (both demo + prizma) | READ (SELECT) |
| `short_link_clicks` table | READ (SELECT) |
| The JS/HTML behind the "קישורים קצרים" screen (find the file that renders "קישורים סטטיים (משותפים)") | READ only — to identify the exact filter logic (default checkbox state, period default, query WHERE clause) |
| `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` | READ (context) |

## 5. Scope — what NOT to touch

| Surface | Confirmed NOT touched |
|---|---|
| Any `short_links` / `short_link_clicks` row | No INSERT / UPDATE / DELETE |
| The stats-screen JS/HTML/CSS | No edits — read only |
| Any EF, migration, DB trigger | Out of scope entirely |
| Prizma production data | No writes of any kind |

## 6. Deliverable

`roles/campaign-overseer/analyses/2026-05-21_short_links_screen_visibility.md` containing:
1. **Confirmation table** — every static-shared short link (lead/event/broadcast all NULL) per tenant: code, target, total clicks, last-click date, and whether it currently appears on the screen with default filters.
2. **Root-cause statement** — exactly which filter(s) hide which links, with the screen's default filter values quoted from the source file (cite file + line).
3. **demo-vs-prizma confirmation** — confirm (or refute) that per-tenant distinct codes are by design.
4. **Ranked recommendations** for a potential Architect SPEC — e.g. "default 'רק עם קליקים' to OFF for the static section", "default period to 'הכל'", "show static links regardless of click recency" — each with a one-line rationale and rough impact. The Analyst RECOMMENDS; it does not implement.

## 7. Stop triggers

STOP and write back to the Campaign Lead instead of proceeding if:
- The investigation reveals the static links are missing for a reason OTHER than filters (e.g. a broken query, a tenant-scoping bug, data corruption) — that changes the SPEC scope, so surface it.
- Any step would require a DB write or a code edit to diagnose — it should not; if it seems to, stop.
- The screen turns out to read from a source other than `short_links` (e.g. a view or RPC) — note it and stop for a scope check.

## 8. Cross-references

- `references/CAMPAIGN_LEAD_DECISIONS_LOG.md` — this is the first short-links investigation (no prior entry).
- Iron Rule 35 in `CLAUDE.md` — screen/code changes need an Architect SPEC.
- Context: Daniel is mid-change on `event_registration_open` (email + SMS) swapping the stock link for the pricing-catalog static link `CEiBGCWj`; he has applied the SMS change himself and will apply the email change himself. This screen question came up alongside that work.

## 9. Handoff

When the Analyst completes:
1. Writes the findings doc to the path in §6.
2. Does NOT update CAMPAIGN_OVERSEER_HANDOFF (this is diagnostic, not live-config state).
3. Emits a one-line English status to Daniel (e.g. "Short-links visibility analysis complete — root cause: default filters. See analyses doc.").
4. Daniel re-engages the Campaign Lead (`אתה האחראי על צוות הקמפיין`) — Lead reads the findings, translates to plain Hebrew, and recommends whether to open an Architect SPEC.

---

*Brief authored by Campaign Lead. Analyst starts work after one read. READ-ONLY — diagnosis only, no fix.*
