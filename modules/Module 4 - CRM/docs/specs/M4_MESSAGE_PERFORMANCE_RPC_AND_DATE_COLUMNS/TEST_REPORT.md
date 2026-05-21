# TEST_REPORT — M4_MESSAGE_PERFORMANCE_RPC_AND_DATE_COLUMNS

## 1. SQL truth probes (Prizma read-only)
| Probe | Result |
|---|---|
| `jsonb_array_length(rpc('prizma')->'per_template')` | 14 |
| `jsonb_array_length(rpc('prizma')->'per_event')` | 22 |
| Per-template row for the diagnosis template (b325481a, `event_registration_open_sms_he`) | `{"messages_sent_total":2326, "first_sent_at":"2026-05-12T16:21:00.407765+00:00", "last_sent_at":"2026-05-21T10:17:21.27968+00:00"}` |

## 2. Chrome MCP IR34 — message-performance screen
On `http://localhost:3000/crm.html?t=demo`, logged in via PIN, navigated to Messaging Center → ביצועי הודעות:
- Rendered **35 per-template rows** (matches RPC's `per_template_count: 35` for demo).
- **11 columns** rendered: caret, תבנית, ערוץ, אירועים, נשלחו, הוקלקו, % הקלקות, נרשמו, % המרה, **נשלח ראשון, נשלח אחרון**.
- **Bold-slug discriminator** verified on 11 unique segments: open, open_tomorrow, confirmation, delivery, duplicate, waiting_list, new, list_confirmation, list, moved_unpaid, moved_paid.
- **First row:** `event_registration_open_email_he` (bold "open") • אימייל • 19 events • 67 sent • 23/04/26 13:40 first → 21/05/26 12:08 last.
- **Click first row → drill-down opens:** caret ▸ → ▾, 20 per-event sub-rows appeared (total 55 rows).
- Screenshot: `msg-perf-after-fix.png`.

## 3. Chrome MCP IR34 — dispatch_preview EF at 10K-lead load
In-browser `sb.functions.invoke('automation-engine', { mode:'dispatch_preview', ... })` against demo with 10K sentinel-marked leads injected:
- `time_ms: 3985` (**3.98 s**)
- `under_10s: true` ✓
- `had_error: false`
- `recipient_count_total: 10000`
- `recipients_returned: 10000`
- `first_recipient_created_at: 2026-04-25T17:25:29.855511+00:00`

## 4. Pre/post baselines
| | Pre (Sprint 1 best) | Post (this SPEC) |
|---|---|---|
| dispatch_preview @ 10K (extrapolated from 84K paginate) | ~3 s | 3.98 s |
| message-perf screen — date columns | 0 | 2 |
| message-perf screen — per-template rollup | no | yes (default view) |
| message-perf screen — drill-down | no | yes (expand on click) |
| message-perf screen — bold discriminator | no | yes |

## 5. Demo cleanup
- 10,000 sentinel leads deleted in 2 batches of 5K (SPEC 1 indexes enabled fast DELETE).
- Final demo state: 28 leads — exactly matches pre-SPEC baseline.
- Prizma: 1,343 leads, untouched.

## 6. Verdict
🟢 **PASS.** All acceptance criteria met:
- ✅ RPC live + SQL probes confirm correctness.
- ✅ Screen renders with date columns + drill-down + bold discriminator.
- ✅ EF under 10s at 10K (in-browser Chrome MCP timing).
- ✅ Demo restored to baseline.
- ✅ IR31 gate clean throughout.
- ✅ IR34 evidence captured (screenshot + DOM probe + browser-fetch timing).

---
*End of test report.*
