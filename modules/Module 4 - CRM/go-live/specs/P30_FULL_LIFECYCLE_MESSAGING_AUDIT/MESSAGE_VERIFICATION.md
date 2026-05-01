# MESSAGE_VERIFICATION — P30_FULL_LIFECYCLE_MESSAGING_AUDIT

> Per-scenario results from the live-fire run on Prizma production, 2026-04-30 09:42-09:57 UTC (12:42-12:57 IL).

---

## Test contact

- Lead: `a262bc0e-26aa-4a2d-a401-16e4998f382e` (`T5 Canary Post-Shorten`)
- Phone: `+972537889878` (Daniel)
- Email: `daniel@prizma-optic.co.il`
- Tenant: Prizma `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`

## Scenarios — full result table

| # | template_slug | dispatched_at (UTC) | message_log id (sms) | message_log id (email) | run_id | status |
|---|---|---|---|---|---|---|
| 1 | `lead_intake_new` | 2026-04-30 09:42:48 | `ee5ca55c-ef3f-42a1-b34c-a034b9259224` | `541d923f-b72b-4f59-bdc0-f3e07a8f4725` | `f7abb085-0f17-435e-95de-b07be94f3bfc` | ✅ GREEN |
| 7 | `event_registration_confirmation` | 2026-04-30 09:49:02 | `0be756d6-3c3a-452a-934b-c2f40994576a` | `20620fcc-37a1-4bb6-89b8-a40e72e8a531` | `aebdd4c6-e13d-422a-bb8e-f74955b1e68c` | ✅ GREEN |
| 4 | `event_registration_open` | 2026-04-30 09:52:16 | `64130dfa-4a50-44cc-9431-31267ce94de3` | `5450a802-c9cb-4551-9045-4c4c9b1c3108` | `e41d2eec-7a96-4557-aef2-c486af4da995` | ✅ GREEN |
| 11 | `event_attendee_moved_unpaid` | 2026-04-30 09:53:08 | `e35ecb2d-91c9-41d5-b4b2-05d0ea211f9a` | `640c6719-aad5-47f2-bdf9-5408f4492deb` | `8c90cb71-0ec1-481d-aef9-a31062d75185` | ✅ GREEN |
| 12 | `event_attendee_moved_paid` | 2026-04-30 09:53:23 | `9af7c349-9540-4cd3-9242-6697aae9961d` | `0d99cfc7-fff9-4f6b-9af9-e80e3b5499fb` | `bd07b63d-9999-47df-85ae-4e58ac012549` | ✅ GREEN |
| 3 | `event_will_open_tomorrow` | 2026-04-30 09:53:59 | `aa5f8a3c-a4d7-4cfb-af08-e19dfd5e041d` | `9a83c235-fc61-484e-8460-9d24be885aa8` | `01e2c00b-4421-4640-843c-9223b11cb3c8` | ✅ GREEN |
| 5 | `event_invite_new` | 2026-04-30 09:54:14 | `4887d37b-9fe4-4a41-9d72-0ac86bd2f208` | `5fe0202e-d099-4bbe-a09d-c060455b6a8e` | `a9083361-2ece-4045-bf94-74704294fb2b` | ✅ GREEN |
| 9 | `event_waiting_list` | 2026-04-30 09:54:39 | `083cd447-26c5-42f5-833a-412783c73758` | `90880df0-6686-4946-9c3a-7d83946e9bff` | `2c862d6d-2a3f-48ab-bbc5-b8361691ae62` | ✅ GREEN |
| 8 | `event_waiting_list_confirmation` | 2026-04-30 09:56:23 | `a5604047-ce53-4faa-b237-1616213a6232` | `79332852-e6dc-4bff-ad5e-ebc06097386c` | n/a (direct send) | ✅ GREEN |
| 2 | `lead_intake_duplicate` | 2026-04-30 09:56:38 | `b6b714ce-d581-4ee5-876d-a5189f201f64` | `06d07f13-ad1f-4a86-8f08-331362da3cfc` | n/a (direct send) | ✅ GREEN |
| 6 | `event_invite_waiting_list` | 2026-04-30 09:56:39 | `c5221a59-8258-48fa-8ac6-9114cf14a592` | `05c76d6b-2b67-4da9-a0e9-38ca02d7b3c0` | n/a (direct send) | ✅ GREEN |
| 13 | `payment_received` | 2026-04-30 09:56:42 | `ab7a8250-8910-4a05-b531-5f10bde3cb42` | `aec00583-39a9-405d-889c-bd5ff83634b5` | n/a (direct send) | ✅ GREEN |
| 10 | `event_coupon_delivery` | 2026-04-30 09:56:43 | `cd9f7103-34e7-43a1-a2bd-04a1ddb73f6f` | `1b564798-e209-447b-8aab-49811e078228` | n/a (direct send) | ✅ GREEN |

**13/13 GREEN.** 0 failures. 0 rejected. 0 stuck `running`. Every dispatch produced 2 `crm_message_log` rows (SMS + Email) with `status='sent'` and `error_message=NULL`. Every rule-driven scenario produced a `crm_automation_runs` row that completed (P29 verification — no stuck `running` rows from this run).

## Path classification

| Path | Scenarios | Mechanism |
|---|---|---|
| Rule-driven via `CrmAutomation.evaluate(...)` → CrmConfirmSend modal → approve | 1, 3, 4, 5, 7, 9, 11, 12 | `run_id` populated on log rows ✓ (P29 fix verified) |
| Direct via `CrmMessaging.sendMessage({templateSlug,...})` | 2, 6, 8, 10, 13 | No run; `run_id=NULL` (correct — these paths bypass the engine) |

## P29 verification (live)

8 unique `crm_automation_runs` rows from rule-driven scenarios:

| run_id | rule_name | status | sent_count | finished_at |
|---|---|---|---|---|
| `f7abb085` | ליד חדש: ברוך הבא | completed | 2 | ✓ |
| `aebdd4c6` | הרשמה: אישור הרשמה | completed | 2 | ✓ |
| `e41d2eec` | (registration_open + invite_waiting_list combined) | completed | 2 | ✓ |
| `8c90cb71` | העברת משתתף ידנית - לא שילם | completed | 2 | ✓ |
| `bd07b63d` | העברת משתתף ידנית - שילם | completed | 2 | ✓ |
| `01e2c00b` | שינוי סטטוס: ייפתח מחר | completed | 2 | ✓ |
| `a9083361` | שינוי סטטוס: הזמנה חדשה | completed | 2 | ✓ |
| `2c862d6d` | הרשמה: אישור רשימת המתנה | completed | 2 | ✓ |

Plus one no-op run from the very first S4 attempt before lead-status flip:

| `3c1a6687` | (registration_open + invite_waiting_list combined) | completed | 0 | ✓ |

That row matched 0 recipients (test lead was `confirmed`, rule's `recipient_status_filter` requires `waiting`). The engine still wrote a completed run row — confirming the engine-side reconciliation works even when the audience filter rejects everyone. **Total runs: 9. Stuck `running`: 0. P29 fix proven on real traffic.**

## P26 verification (live)

1 activity_log row was emitted during P30 (from the `promoteWaitingLeadsToInvited` post-action hook fired during S4):

```
id:           d2d1eda1-6f6a-4c29-b49f-cff8d281ec5b
action:       crm.lead.status_change
entity_type:  crm_leads          ← plural ✓ (P26 fix)
level:        info                ← populated ✓ (P26 fix)
details:      {"to":"invited","from":"waiting","source":"automation_invite"}
              ← non-empty ✓ (P26 fix), 3 keys, 67 chars
```

P26 audit-trail fix verified live on real production traffic.

## Server-side allowlist behavior

Cross-tenant scan during the 15-minute P30 window:

```sql
SELECT count(*) FROM crm_message_log
 WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
   AND status='sent' AND created_at > '2026-04-30 09:42:00+00'::timestamptz
   AND lead_id != 'a262bc0e-26aa-4a2d-a401-16e4998f382e';
-- expected: 0
```

Only Daniel's lead received `status='sent'` messages — no cross-contact leak. The single tier2 lead on Prizma is the test lead, so the allowlist defense never had to filter rejection rows.

## Final summary line for Daniel

**Daniel should receive 13 SMS to 0537889878 and 13 Email to daniel@prizma-optic.co.il.** Cross-reference against the table above by template_slug — every row in column "message_log id (sms)" corresponds to one expected SMS, every row in "message_log id (email)" to one expected Email.

If a specific template did not arrive, look it up in the table by slug and report the mismatch — the CRM-side `crm_message_log` proves the dispatch happened, but P28-003's known gap means delivery confirmation is not in this DB. The server-side `external_id` column remains 100% NULL because no vendor callback exists yet (P28-003 — out of P30 scope).
