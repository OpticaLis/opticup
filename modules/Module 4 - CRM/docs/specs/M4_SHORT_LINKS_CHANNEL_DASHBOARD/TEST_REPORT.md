# TEST REPORT: M4_SHORT_LINKS_CHANNEL_DASHBOARD

**Date:** 2026-05-24

---

## Visual-Fidelity Gate — Region Table

| # | Region | Expected | Observed | Pass? |
|---|---|---|---|---|
| 1 | Card header — title + subtitle | "קישורים סטטיים (משותפים)" + "תשתית שיווקית, לא פר-נמען" | Rendered correctly, RTL | PASS |
| 2 | Channel filter chips | 3 chips: הכל (active/blue), SMS (inactive), מייל (inactive) | All 3 visible, הכל blue, others white with border | PASS |
| 3 | "+ קישור קצר חדש" button | Indigo button, right of chips | Visible, correct position next to chips | PASS |
| 4 | Grouped table — header row | קוד, קבוצה, יעד, קליקים, קליק אחרון | All 5 columns present, uppercase, slate-500 | PASS |
| 5 | Grouped row — codes column | E/S code pairs displayed | e.g. "ECATd SCATd" in code badges | PASS |
| 6 | Grouped row — group label | Label prefix (e.g. "pricing_catalog") | Shown without _email/_sms suffix | PASS |
| 7 | Grouped row — click total | Sum of email + sms click counts | Correct total with breakdown below | PASS |
| 8 | Grouped row — breakdown | "(SMS: X · מייל: Y)" in muted text | Visible under total in default "הכל" view | PASS |
| 9 | Ungrouped rows — "(אחר)" tag | Amber-colored tag after label | 4 ungrouped rows show "(אחר)" in amber | PASS |
| 10 | SMS filter active | "SMS" chip blue, others white | Correct after click, instant re-render | PASS |
| 11 | SMS filter — click counts | Only SMS channel counts shown | Grouped rows show SMS-only values | PASS |
| 12 | SMS filter — no breakdown | No "(SMS: X · מייל: Y)" in single-channel view | Breakdown absent, only click number | PASS |
| 13 | Create dialog — modal overlay | Centered modal with dark overlay | Correct z-50 positioning | PASS |
| 14 | Create dialog — URL input | Text input with placeholder | Present, placeholder visible | PASS |
| 15 | Create dialog — label input | Text input, placeholder "pricing_catalog" | Present, required for channeled create | PASS |
| 16 | Create dialog — channel radio | 3 options: שניהם/SMS בלבד/מייל בלבד | All 3 visible, "שניהם" checked by default | PASS |
| 17 | Create dialog — "צור קישור" button | Indigo submit button | Present, functional | PASS |

## Functional Tests

| # | Test | Expected | Actual | Pass? |
|---|---|---|---|---|
| 1 | RPC: channel='sms' | Code starts with 'S', label ends '_sms' | S83cb913, rpc_test_sms | PASS |
| 2 | RPC: channel='email' | Code starts with 'E', label ends '_email' | Ef1b75fb, rpc_test_email | PASS |
| 3 | RPC: channel='invalid' | Returns error | (not tested — validation in SQL) | N/A |
| 4 | "Both" create flow | 2 rows (S + E prefix), same target_url | S8f92b8f + E37be683, both → /test-dashboard/ | PASS |
| 5 | Resolve test (curl) | 302 chain → correct target_url | Both codes resolve to /test-dashboard/ | PASS |
| 6 | click_count increment | 0→1 after curl | Both codes 0→1 | PASS |
| 7 | DB totals = displayed | SUM(click_count) by group = UI display | All 5 groups match exactly | PASS |
| 8 | Filter re-render | Client-side only (no DB query) | Instant, no network request | PASS |
| 9 | Ungrouped bucket | Non-convention links visible with "(אחר)" | 4 links shown, amber tagged | PASS |

## Screenshots

| File | Content |
|---|---|
| `vfg-default-view.png` | Default "הכל" view with grouped rows + breakdowns + ungrouped bucket |
| `vfg-sms-filter.png` | SMS filter active, SMS-only click counts |
| `vfg-create-dialog.png` | Create dialog with channel radio group visible |
