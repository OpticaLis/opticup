# Brief — M5 Polish — Secondary Phone + Configurable List Columns

> **Author:** opticup-architect (Cowork) · **Date:** 2026-05-23
> **Activation Prompt:** `M5_POLISH_PHONE2_LIST_COLUMNS_ACTIVATION_PROMPT.md` (sibling — paste THAT into Claude Code).
> **Type:** two small M5 improvements from Daniel's live review of the (now-styled 🟢) card + list.
> **Closure:** through the new **Visual-Fidelity Gate** (Localhost-Tester, blocking) — embedded screenshots the Architect reviews before reporting done.

---

## 0. One-paragraph summary

Daniel walked through the live M5 card + list and asked for two improvements: (1) the card needs a **second phone field** (the mockup already shows "טלפון-עבודה" beside "נייד", but the data layer has only one phone), and (2) the customer **list columns should be configurable per tenant** — each tenant can choose/swap which fields show as columns (city, source, id_number, last-exam-date, last-order-date, etc.), instead of a fixed column set. Both are SaaS-clean (tenant chooses, nothing hardcoded). Demo only, no Prizma writes, no merge to main.

## 1. Item A — secondary phone on the card

**Today:** the customers table + card have one phone field (`phone`, labeled "נייד"). The card mockup (`M5_CUSTOMER_CARD_MOCKUP.html`) already shows a second row "טלפון-עבודה" — so this is restoring mockup parity, not inventing UI.

**Required:**
- Add an additive column to the `customers` table for the secondary phone (e.g. `phone_secondary` — name per project convention; confirm none already exists). Migration is additive: `ALTER TABLE customers ADD COLUMN ... ` + add to FIELD_MAP + the relevant views (`v_customer_full` / `v_customer_for_exam` etc.) so the card can read it.
- Render it on the card's contact block as a second field labeled per the mockup ("טלפון-עבודה" or the agreed label), editable in edit-mode like the primary phone (same PIN-gating rules as the existing phone field — match `phone`).
- Empty state shows "—" like every other empty field (consistent with the card).

**SaaS note:** a second phone is universal (every optical store wants work/home), so this is a real field, not a tenant-config. Just add it.

## 2. Item B — configurable list columns (per tenant)

**Today:** the list shows a fixed column set. The view already supplies `phone, email, city, id_number, lifecycle_stage` (some are search-only, not shown as columns).

**Required — a column picker, per tenant (Pattern P19 — config-driven, SaaS-clean):**
- A UI control on the list (e.g. a "עמודות" / columns button) that lets the user choose WHICH columns are visible and (ideally) their order — add / remove / swap.
- The chosen column set is **saved per tenant** (so tenant #2 can have a different layout than Prizma) — persist via a tenant-config mechanism (a `tenant_settings`-style row or the existing per-tenant config table; reuse, don't invent — Iron Rule 21). Confirm the storage approach in pre-flight.
- **Available columns = whatever data exists**, split into two groups:
  - **Available now (data exists in M5):** name, phone, secondary phone (Item A), email, city, id_number, source/מקור, lifecycle_stage, customer_number, created_at.
  - **Future columns (data not built yet):** last-exam-date (needs M6), last-order-date (needs M7), club-tier (needs M13), age (needs birth-date math). These must be **designed into the picker from day-1 but shown disabled/"coming soon"** until their module ships — when M6/M7/M13 land, the column lights up automatically with no rebuild. (This is the foundation-first pattern + matches the existing `showComingSoon` discipline.)
- Default column set (what a brand-new tenant sees) = a sensible minimal set per the mockup; tenant can then customize.

**Why per-tenant config and not hardcoded:** different optical chains care about different fields. Daniel's exact ask ("if some tenant wants to see city in a column, or source, or id, or last exam..."). This is the SaaS-clean answer — and it passes the litmus test (tenant #2 joins, picks their columns, zero code change).

## 3. Closure — through the Visual-Fidelity Gate (mandatory)

Both items close ONLY via the Localhost-Tester Visual-Fidelity Gate (the blocking gate just installed):
1. **Card:** live screenshot showing the second phone field rendered + editable, region-compared to the mockup (the "טלפון-עבודה" row now matches). Embedded in TEST_REPORT + FOREMAN_REVIEW.
2. **List:** live screenshot showing the column picker working — add a column (e.g. city), confirm it appears; a future column (e.g. last-exam) shows disabled/"coming soon". Region-compared to the mockup. Embedded.
3. **Runtime + DB evidence:** editing the secondary phone persists to the new column (DB query proof); the column choice persists per tenant (reload → choice retained).
4. The Architect reviews the embedded screenshots before reporting 🟢 to Daniel (Architect-relay rule). Daniel sees them too.

## 4. Constraints

- Branch develop. Demo only. No Prizma writes. No merge to main.
- Additive schema only for Item A (`ALTER TABLE ADD COLUMN` + view update; `## Destructive Operations: None.`). Iron Rules: 5 (FIELD_MAP for new column), 7 (shared.js), 8 (sanitize + PIN on phone), 14/15/22 (tenant_id on the config), 19+21 (config-driven, reuse existing config table — don't invent a parallel one), 34 + Visual-Fidelity Gate.
- Selective git add by explicit filename — NOT `-a` / `.`.
- Same Claude Code session if context healthy.

## 5. Out of scope

- Building M6/M7/M13 to populate the future columns (they light up later automatically).
- The OpticPlus historical import (cutover-time).
- Any other card/list change beyond these two items.

## 6. What Daniel has at the end

The card shows a second phone (mockup parity), and the list has a per-tenant column picker — each tenant chooses which fields to see, with future columns (last exam / last order / etc.) pre-wired to light up when their modules arrive. Proven with screenshots through the new gate. Then M5 is truly done and M6 is next.

---

*End of Brief. Two small SaaS-clean M5 improvements. Closes via the Visual-Fidelity Gate. Demo only.*
