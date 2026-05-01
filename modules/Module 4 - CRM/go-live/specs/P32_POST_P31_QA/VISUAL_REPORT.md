# VISUAL_REPORT — P32_POST_P31_QA

> UI screenshots verifying P31 commits 5 + 6 (failed-msg badge + chip + section + retry button) live in production.

---

## Screenshots captured

### 1. `screenshots/01_failed_messages_badge_and_chip.jpeg`

Registered tab after S14 forced failure:
- `📩 הודעות כושלות (1)` chip in chip bar (rose-100 background, indicating inactive toggle state)
- Lead row `T5 Canary Post-Shorten ⚠️ 2` — the badge counts ALL failed rows in last 90 days for this lead (1 historical pre-P32 + 1 from S14 = 2)
- Phone displayed: `053-788-9878` (formatted)
- Status: `הוזמן לאירוע` (invited — auto-promoted by engine during batch)

### 2. `screenshots/02_lead_detail_failed_section.jpeg`

Lead detail modal after click on lead row:
- Top-of-modal `⚠️ הודעות כושלות (1)` collapsible section, OPEN state
- Single failed row visible:
  - Channel: `📱 SMS` icon + label
  - Timestamp: `01.05.2026 08:32`
  - Hebrew error reason: `תבנית הודעה לא נמצאה` (P31 commit 4 working — translated from raw `template_not_found:p32_nonexistent_slug_sms_he`)
  - `🔄 נסה שוב` retry button
- Below the section: standard avatar header + tabs

### 3. (Attempted) `screenshots/03_chip_active_filtering.jpeg` — capture timed out

Chrome DevTools `take_screenshot` timed out twice on the third capture; no fault from page side. The chip click was confirmed via `evaluate_script` returning `chip_clicked: true`.

## What the screenshots prove

| P31 commit | Live? |
|---|---|
| Commit 4 (Hebrew error labels via `CrmMessageErrorLabels`) | ✅ — `template_not_found:p32_nonexistent_slug_sms_he` rendered as `תבנית הודעה לא נמצאה` |
| Commit 5 (badge + filter chip in registered tab) | ✅ — both visible |
| Commit 6 (failed-messages section + retry button) | ✅ — section + button visible |

## Out-of-band observations

- **`רשומים` chip displayed `(1)` despite badge showing `⚠️ 2`.** The chip counts distinct LEADS with failures (1 lead has failures); the badge counts message_log rows (2 rows). Both correct, just different denominators. Worth a clarifying tooltip in a future micro-fix.
- **Modal scrolled to top** — failed-messages section appears above avatar header per P31 commit 6 design. Visible without scrolling.
- **Retry button styling consistent** with rest of CRM modal (indigo bg-indigo-600, rounded-md, white text, font-semibold).

## What the screenshots do NOT show

- The actual SMS arriving on Daniel's phone (out of browser scope; cross-reference table in MESSAGE_VERIFICATION.md is the substitute)
- The actual email rendering in Daniel's inbox (specifically the broken `%coupon_code%` literal in `event_coupon_delivery_email_he` — visible only when Daniel opens the email; documented in P32-001 finding)
- Chip filter active state (rose-600 background) — capture timed out

---

*Visual surface verification successful for the 2 captures; the third can be re-captured by Daniel manually if needed.*
