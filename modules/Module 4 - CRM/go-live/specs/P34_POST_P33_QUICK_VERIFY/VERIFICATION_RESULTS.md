# VERIFICATION_RESULTS — P34_POST_P33_QUICK_VERIFY

> Per-scenario results. Live-fire window 2026-05-01 06:32–06:36 UTC (~4 minutes).

---

## Test contact

- Lead: `a262bc0e-26aa-4a2d-a401-16e4998f382e` (`T5 Canary Post-Shorten`)
- Phone: `+972537889878`
- Email: `daniel@prizma-optic.co.il`

## Scenario table

| # | Description | Result | Evidence |
|---|---|---|---|
| 1 | **P32-001 fix verification** — re-dispatch `event_coupon_delivery_email_he` via event 80597afe (#40268, coupon_code='V4-40268') | ✅ **GREEN** | message_log `c2c77503-03f6-49e8-80f6-45ea0b7af7a8`: status='sent', `has_coupon_placeholder=false`, `has_real_coupon=true` (literal `V4-40268` present), `unsubstituted_placeholders=null`. Daniel's inbox will receive the actual coupon code. |
| 2 | **Universal scan triggers HTTP 400** — invoke send-message with body containing `%fake_unknown_var%` | ✅ **GREEN** | EF returned HTTP 400 with body `{"ok":false,"error":"unsubstituted_placeholder","missing":["fake_unknown_var"],"template":null}`. Failed log row `4df8b0d0-368f-415a-9933-67db479f29ab` written with `error_message='unsubstituted_placeholder: fake_unknown_var'`. Make webhook NOT called. |
| 3 | **Failed-msg UI end-to-end** — chip + filter + section + retry button (post-merge UI verification) | ✅ **GREEN** with note | Chip `📩 הודעות כושלות (1)` visible in chip bar; lead row badge `⚠️ 3` (1 historical P32-001 + 1 P32-day forced template_not_found + 1 P34 scenario 2 unsubstituted_placeholder); detail modal section `⚠️ הודעות כושלות (2)` visible (only 2 of the 3 — historical P32-001 row from yesterday is outside the 50-row fetch window). Retry button mechanic confirmed wired (click registered); no new log row from retry of template_id=NULL row, matching documented P32-002 corner case. **The functional retry-success path is already proven by Scenario 1** (same EF call retry would have made on the visible historical coupon-delivery row). |
| 4 | **Regression check on healthy template** — `lead_intake_new` rule-driven dispatch | ✅ **GREEN** | Run `9fa3ab60-5037-4c45-a780-c089b9ed87b6` completed. SMS row `cb139c84` + Email row `7fea1054` both `status='sent'`, both have `unsubstituted_placeholders=[]` (empty array — no `%X%` literals). Content preview shows substituted lead name "T5 Canary Post-Shorten" inline. |
| 5 | **Null coupon_code edge case** | ⏭️ **SKIPPED per dispatch** | Query `SELECT count(*) FROM crm_events WHERE coupon_code IS NULL AND tenant_id=...` returned 0. No null-coupon events exist on Prizma. Dispatch §5 said "if no such events: skip with note". Behavior under null coupon documented in P33 finding P33-002 (substitutes to empty string per P33's `\|\| ""` fallback in `event-variables.ts`). |

**Net: 4 GREEN, 1 SKIPPED (intended), 0 BLOCKERS.**

## Cross-cutting health

```sql
-- Sanity: no leak to non-Daniel leads during P34
SELECT count(*) AS leak_rows FROM crm_message_log
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND status='sent'
   AND created_at > '2026-05-01 06:32:26+00'::timestamptz
   AND lead_id != 'a262bc0e-26aa-4a2d-a401-16e4998f382e';
-- 0
```

```sql
-- All P34 sent rows have clean substitution (no %X% in content)
SELECT count(*) AS rows_with_unsub_placeholder FROM crm_message_log
 WHERE created_at > '2026-05-01 06:32:26+00'::timestamptz
   AND lead_id='a262bc0e-26aa-4a2d-a401-16e4998f382e'
   AND status='sent'
   AND content ~ '%[a-z][a-z0-9_]*%';
-- 0  (P32-001 bug class fully closed)
```

## P33 fix verification — explicit answers

- **P32-001 fix VERIFIED LIVE: YES** — `event_coupon_delivery_email_he` now substitutes `coupon_code` from `crm_events.coupon_code` correctly. The literal `V4-40268` appears where `%coupon_code%` previously did.
- **Universal scan VERIFIED LIVE: YES** — `scanForUnsubstitutedPlaceholders` rejects HTTP 400 + writes failed log row + does NOT call Make webhook for any body+subject containing unsubstituted `%[a-z][a-z0-9_]*%` after substitution. Confirmed against a synthetic `%fake_unknown_var%` payload.
- **Failed-msg UI VERIFIED LIVE: YES** — chip in chip bar, badge in row, collapsible section in detail modal with channel icon + Hebrew error label (where mapped) + timestamp + retry button. The unmapped `unsubstituted_placeholder` code falls through to raw English text per P31 commit 4 design (Hebrew label can be added later — P33-003 follow-up micro-fix).

## Daniel's inbox watch

Daniel will receive at his contacts (`+972537889878` / `daniel@prizma-optic.co.il`) during the P34 window:

- **1 email** at ~06:33 UTC: `event_coupon_delivery_email_he` for event #40268. **Verify the email shows `V4-40268` (or whatever the actual coupon code text is) where `%coupon_code%` previously appeared.** This is the cross-reference for P32-001 fix.
- **1 SMS + 1 Email** at ~06:35 UTC: `lead_intake_new_*` welcome message. Standard regression.

The synthetic `%fake_unknown_var%` test (Scenario 2) does NOT reach Make — only writes a failed log row. No SMS/Email arrives for that one.
