# DIAGNOSIS — DEMO_WHITELIST_UPDATE

> **Date:** 2026-05-11
> **Phase:** Pre-execution diagnostic (read-only)
> **Author:** Full-Auto Pipeline (opticup-strategic / opticup-executor merged in single chat)

---

## 1. Goal of this diagnosis

Per Brief §3, identify the exact field path(s) for SMS + Email whitelisting on `tenants`, and determine whether each mechanism EXISTS before deciding what UPDATE (if any) to apply.

Three questions to answer:

1. What field holds the SMS whitelist for demo?
2. Does an equivalent email whitelist field exist? Column? jsonb path? Or different mechanism entirely?
3. Current values for both fields, both tenants?

---

## 2. Method

Four read-only SQL queries via Supabase MCP against project `tsxrrxzmdxaenlvocyit`, plus a read of the live `send-message` Edge Function source (v21).

No writes. No DDL. No code changes. No outbound traffic.

---

## 3. Findings

### Q1 — SMS whitelist field

**Field:** `tenants.test_mode_sms_allowlist`
**Data type:** `jsonb`
**Source-of-truth:** added by C-001 SPEC (`C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL`, 2026-05-03), backed by Edge Function `send-message` v21 lines 33–58.

Verified by:

```sql
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'tenants'
  AND (column_name ILIKE '%allowlist%' OR column_name ILIKE '%whitelist%'
       OR column_name ILIKE '%test_mode%' OR column_name ILIKE '%email%')
ORDER BY column_name;
```

Result (3 columns, the only ones matching any of the patterns):

| column_name | data_type | udt_name |
|---|---|---|
| `business_email` | text | text |
| `owner_email` | text | text |
| `test_mode_sms_allowlist` | jsonb | jsonb |

`business_email` and `owner_email` are tenant CONTACT fields (the optician's own address), NOT a recipient whitelist for outbound dispatch. They cannot be used as a whitelist without changing EF semantics — out of scope.

### Q2 — Email whitelist mechanism

**Verdict: DOES NOT EXIST.**

Three layers of negative evidence:

**Layer 1 — schema:** No `test_mode_email_allowlist` column. No `*_email_allowlist`. No `*_email_whitelist`. Confirmed by the same query above.

**Layer 2 — `ui_config` jsonb:** Demo's `ui_config` keys are: `brand`, `phone_catalog`, `phone_general`, `cookie_consent`, `policy_url`, `tracker_categories`, `storefront_url`, `--color-primary*`, `default_waze_url`, `whatsapp_phone_e164`, `support_phone_display`. NO whitelist-related keys. Same negative for Prizma's `ui_config`.

**Layer 3 — `send-message` EF v21 source:** read end-to-end. The flow:
- SMS dispatch path: line ~272 calls `phoneAllowed(db, tenantId, recipientPhone)` which reads `tenants.test_mode_sms_allowlist`. Fail-closed on lookup error.
- Email dispatch path: NO equivalent function. After variable substitution and the universal placeholder scan (`scanForUnsubstitutedPlaceholders`), the email is handed directly to `writeDispatchAndSend` → Make webhook → SendGrid (or whatever email provider). NO allowlist check anywhere in the chain.

This matches what `C001_SEND_MESSAGE_PHONE_ALLOWLIST_REMOVAL/SPEC.md §10` explicitly stated: "Email allowlist. The QA night-run flagged 'no email allowlist' as a separate MEDIUM finding — that's a different SPEC for post-cutover."

**Implication:** Today, any email dispatched from demo (or Prizma) goes to whatever address is in `variables.email` — which is normally the lead's email from `crm_leads.email`. There is no test-mode envelope for email.

### Q3 — Current values, both tenants, both fields

Captured at 2026-05-11 (pre-execution snapshot):

| tenant | id | `test_mode_sms_allowlist` | `business_email` | `owner_email` | `updated_at` |
|---|---|---|---|---|---|
| **demo** | `8d8cfa7e-ef58-49af-9702-a862d459cccb` | `["+972537889878", "+972503348349", "+972507168471"]` (3 elements, E.164) | `null` | `null` | `2026-03-29 08:33:43.906+00` |
| **prizma** | `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` | `null` (production-mode, post-cutover) | `service@prizma-optic.co.il` | `null` | `2026-03-19 09:54:27.256+00` |

Confirmation snapshot (re-read just before commit, to lock in `updated_at` for the post-pipeline regression check):

| tenant | `test_mode_sms_allowlist` | `jsonb_array_length` | `updated_at` |
|---|---|---|---|
| **demo** | `["+972537889878", "+972503348349", "+972507168471"]` | 3 | `2026-03-29 08:33:43.906+00` |
| **prizma** | `null` | (n/a) | `2026-03-19 09:54:27.256+00` |

Both `updated_at` values are unchanged between the two reads — confirms no concurrent writer is touching these rows.

---

## 4. Format note — local vs E.164

The Brief §2 lists phones in Israeli local format (`0537889878`). The values stored in demo's row are E.164 (`+972537889878`). These ARE the same 3 numbers — `0537889878` and `+972537889878` are equivalent representations of the same phone.

The `send-message` EF normalizes both formats via:

```ts
function normalizePhone(p: string): string {
  const d = p.replace(/[\s+\-]/g, "");
  return d.startsWith("972") ? "0" + d.slice(3) : d;
}
```

So a recipient phone of `+972537889878` is normalized to `0537889878` for comparison, AND each entry in the allowlist is normalized the same way. Match succeeds regardless of which format is used in storage.

C-001 SPEC §5.1 mandated E.164 storage for the allowlist (`"a JSONB array of E.164 phone strings"`). Storing in E.164 is consistent with the canonical format used by the SMS vendor (Make → SendGrid/Twilio) and matches what Prizma had pre-cutover. **Demo's E.164 values are the correct representation.** Rewriting to local format would be a regression against C-001's locked decision.

---

## 5. Decision matrix

Maps Brief §4 + §6 paths to the diagnostic findings:

| Brief Path | Trigger | Action chosen | Rationale |
|---|---|---|---|
| **Path A** (SMS whitelist field exists) | `test_mode_sms_allowlist` exists | **No-op verify** | Field exists AND already contains exactly the 3 phones Daniel listed in E.164. Brief §2 SMS goal already satisfied. Writing the same values would be a no-effect UPDATE that bumps `updated_at` without semantic change. |
| **Path B** (Email whitelist field exists) | Any email allowlist field | **Skip** | Not applicable — no email whitelist field exists. |
| **Path C** (Email mechanism doesn't exist) | No email allowlist field/path/EF logic | **Escalate** | Per Brief §6 Decision #5: "If email whitelist mechanism doesn't exist → escalate, don't auto-create schema." See `ESCALATION.md` for the 3 options Daniel can choose from. |

---

## 6. Conclusion

- **SMS:** Verified-only. Demo's allowlist is already correct. NO UPDATE applied this SPEC.
- **Email:** Mechanism does not exist. Architect decision required (3 options enumerated in `ESCALATION.md`). NO schema change applied this SPEC.

`updated_at` for both tenants will be re-checked in `EXECUTION_REPORT.md` after the docs commit lands, to prove zero DB drift across the SPEC's lifecycle.

---

*End of DIAGNOSIS.*
