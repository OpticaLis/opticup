# FINDINGS — CRM_PHASE_B1_DATA_DISCOVERY

> **Executor:** opticup-executor (Claude Code / Opus 4.7)
> **Execution date:** 2026-04-20
> **Purpose:** findings discovered during SPEC execution that are **not** in-scope fixes. Logged here per opticup-executor skill Step 3.

Scope rule: one concern per task. These are reported but NOT fixed in this SPEC.

---

## M4-INFO-03 — Python 3 + openpyxl not installed on Windows desktop

- **Severity:** INFO (workaround executed successfully)
- **Location:** `C:\Users\User\opticup` (development machine)
- **Description:** SPEC §11 Dependencies states *"Python 3 + openpyxl available on the machine"*. Reality: `python --version` and `py --version` both return "not found" (the Windows Store alias is active but Python itself is not installed). Node v24.14.0 is installed — the executor installed `xlsx@0.18.5` via `npm` into a throwaway directory to produce equivalent read-only analysis.
- **Impact:** None for this SPEC — Node substitution was functionally equivalent. Future SPECs that require Python (e.g. data science libs, `pandas`, `openpyxl` write-back features Node `xlsx` doesn't support well) will fail without resolution.
- **Suggested next action:**
  - (a) Install Python 3.12 + `pip install openpyxl pandas` on the Windows desktop as a one-time environment setup, OR
  - (b) Update the SPEC template / opticup-executor SKILL to declare Python **optional** and prefer Node (+ `xlsx`) as the default for Excel analysis since Node is already installed for other project needs (`scripts/verify.mjs`).
- **Dismiss?** No — recommend **(a)** to match Daniel's stated environment assumptions. Open a tiny follow-up task to install Python on all 3 machines; low effort, unblocks future imports.

---

## M4-INFO-04 — Redundant language columns in Tier 2 Master Board (`lg` vs `Language`)

- **Severity:** INFO (merged via COALESCE at import time)
- **Location:** Monday board 5088674569 (Tier 2: Master Board), columns `lg` (col 18) and `Language` (col 32)
- **Description:** Tier 2 has two language columns:
  - `lg` — English slug values (`he` or empty)
  - `Language` — Hebrew name values (`עברית` or empty)
  - They overlap inconsistently: 744 rows have `lg=he`, 765 rows have `Language=עברית`, and ~810 rows have at least one of the two populated.
- **Impact:** Not blocking. Merge rule documented in `DATA_DISCOVERY_REPORT.md §6.1`: `language = COALESCE(lg, mapHebrew(Language), 'he')`.
- **Suggested next action:** After Phase B2 import completes successfully, deprecate one of the two columns on the Monday board (recommend keeping `lg` since it's already in CRM-native format and delete `Language`). This is a Monday cleanup, not a CRM task.
- **Dismiss?** No — queue as **Monday board hygiene**, post-B2.

---

## M4-INFO-05 — Facebook ADS board UTM columns are 100% empty; crm_ad_spend FK linkage cannot be auto-populated

- **Severity:** HIGH (blocks Phase B2 `crm_ad_spend` auto-linkage)
- **Location:** Monday board 5088705012 (Facebook ADS), exported as `Facebook_ADS_1776697328.xlsx`
- **Description:** `CRM_SCHEMA_DESIGN.md §6.1` specifies `crm_ad_spend.utm_campaign`, `utm_content`, `utm_term` as the bridge from FB ad data to `crm_leads` (via `v_crm_campaign_performance`). However, the exported FB ADS board has **0/91** populated UTM values — UTM data lives only in the `Affiliates` board's `Campaign` column. The FB ADS board relies on Monday's linked-column mechanism (virtual linkage), which doesn't appear in a standalone export.
- **Impact:** If Phase B2 imports `crm_ad_spend` straight from this file, the `utm_campaign` / `utm_content` / `utm_term` fields will be NULL. The `v_crm_campaign_performance` View's JOIN (`crm_leads ON utm_campaign = crm_ad_spend.utm_campaign`) will match 0 leads per ad, causing dashboard to show all ads as having 0 leads / 0 revenue. **The V3 reporting feature will appear broken from day 1 unless this is resolved.**
- **Suggested next action:** Phase B2 import script must:
  1. Import all 91 Facebook ADS rows with their `ad_campaign_id` (Facebook's numeric ID).
  2. For each row, **join on `Affiliates.Campaign ID`** (if present in a richer Monday query) to retrieve `Affiliates.Campaign`, `Content`, `Term` values.
  3. If Affiliates join fails (older ads without Affiliates records), leave UTMs NULL and document the gap.
  4. Set up one-time manual mapping for the 5 Active campaigns that are the most performance-critical.
- **Dismiss?** No — **must be resolved before Phase B2 imports `crm_ad_spend`**. Recommend Foreman authors this as an explicit sub-task in Phase B2 SPEC.

---

## M4-INFO-06 — Inconsistent event-coupon naming convention across 11 events

- **Severity:** LOW
- **Location:** Monday board 5088674576 (Events Management), column `Coupon`
- **Description:** Historical events use inconsistent coupon formats:
  - `01MultiSale26`, `02MultiSale26` (early MultiSale events 13–19)
  - `02SuperSale26` (event 20)
  - `SuperSale22` (event 22)
  - `Supersale0426` (event 23)
- **Impact:** None today — coupon codes are imported as-is. But the format drift signals there's no single naming convention going forward. The ERP's new-event form should enforce a single format to avoid future ambiguity.
- **Suggested next action:** When the Phase B3 (UI) SPEC is authored, propose a canonical format: `SuperSale{MM}{YY}` (e.g. `SuperSale0426`). Add a validation on the new-event form. This is a future-behavior decision, not a historical cleanup.
- **Dismiss?** No — document in Module 4 SESSION_CONTEXT when it is created; raise with Daniel when UI work begins.

---

## M4-INFO-07 — Tier 2 Cities column nearly 100% empty (896/900), Affiliates 100% empty (867/867)

- **Severity:** INFO
- **Location:** Tier 2 col 13 (`City`), Affiliates col 6 (`City`)
- **Description:** The `crm_leads.city` field exists in the schema but the historical data has it populated in only 2 Tier 2 rows (and 0 Affiliates rows). The CRM design keeps the column (it's a useful customer attribute going forward), but the historical import will leave `city` NULL for ~895/894 leads.
- **Impact:** None — schema allows NULL. Just a heads-up that city-based reporting/filtering will show 0 data for the migrated baseline.
- **Suggested next action:** Do nothing. When the ERP's new-lead form is built (Phase B3 UI), make `city` an auto-populated field from Israeli address API if possible (like how ZIP/city lookups work for postal services).
- **Dismiss?** Not blocking — consider informational only.

---

*End of FINDINGS.*
