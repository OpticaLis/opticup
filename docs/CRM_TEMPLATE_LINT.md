# CRM Template Lint — Layer D Placeholder Validation

> **Owner:** Module 4 — CRM  
> **Shipped:** M4_TEMPLATE_VALIDATION_UI_LINT (2026-05-19)  
> **Audience:** Campaign Overseer, Operators, M4 developers

## §1 What it does

The template lint runs **at save-time** in the CRM template editor. It scans
every active channel's body and subject for `%placeholder%` tokens and classifies
each against the canonical 14-name list. Authors see inline red/amber warnings
before a single message reaches the queue. No keystroke-by-keystroke latency.

## §2 KNOWN_PLACEHOLDERS (canonical — 14 names + payment_url family)

```
Lead-level:   name, phone, email, lead_id, unsubscribe_url
Event-level:  event_name, event_date, event_time, event_location,
              event_day_of_week, event_deposit_amount, event_max_attendees,
              registration_url
Coupon:       coupon_code
Family:       payment_url_<N>  where N ∈ tenant.payment_links keys
```

Source: live DB probe 2026-05-19 + `send-message/event-variables.ts:113`.
Adding a name requires an Architect SPEC (Iron Rule 35).

## §3 Three UI states

| State | Trigger | UI | Save |
|---|---|---|---|
| **CLEAN** | All placeholders known | No banner | Enabled |
| **SOFT-BLOCK** | ≥1 unknown (not a typo) | Amber banner + override checkbox | Disabled until checkbox checked |
| **HARD-BLOCK** | ≥1 Levenshtein-typo OR bad payment_url key | Red banner, no override | Disabled |

Screenshots: `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UI_LINT/artifacts/` (LH-Tester phase).

## §4 Adding a new placeholder

1. Open an Architect SPEC (Iron Rule 35 — mandatory).
2. Add resolver logic to `supabase/functions/_shared/event-variables.ts` and
   `supabase/functions/automation-engine/prepare-plan.ts`.
3. In the same SPEC, add the name to `KNOWN_PLACEHOLDERS` in
   `modules/crm/crm-template-lint.js`.
4. Update `M4_INFRASTRUCTURE_CONTRACT.md` §1.
5. Run `M4_DEMO_FIRST` config parity check (Iron Rule 33).

## §5 Cross-references

- M4 contract: `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §1
- Layer A/B/C regex source: `supabase/functions/_shared/template-validation.ts:59`
- This SPEC: `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UI_LINT/`
- Runtime trace: `window.__lintTrace` (array of `{ at, result }` — Iron Rule 34)
