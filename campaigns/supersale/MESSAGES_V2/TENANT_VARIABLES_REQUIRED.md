# Tenant Variables — Required for SuperSale Email Templates

> **⚠️ DECISION 2026-04-28 — TENANT VARIABLES ARE NOT IN USE YET**
>
> Daniel decided to **remove all `{{tenant.*}}` placeholders from V2 templates** and hardcode Prizma's actual values directly. Reasons: (1) only Prizma is in production today; (2) SPEC #11 (variable plumbing) is not scheduled for the M4 P7 cutover (2026-05-03); (3) sending templates with un-resolved `{{tenant.X}}` placeholders would render the literal text to customers - unacceptable.
>
> **Current rule (until further notice):** templates in `MESSAGES_V2/` use Prizma's literal values inline. Lead-specific variables (`%name%`, `%phone%`, `%email%`, `%event_name%`, `%event_max_attendees%`, `%unsubscribe_url%`) remain - those ARE supported by the CRM substitution engine.
>
> **When tenant 2 joins:** that triggers the SPEC #11 work (View extension + Edge Function context lookup + global find-and-replace across templates). Until then, this file is reference only - not enforced.
>
> ---

> **Purpose (original, kept for SPEC #11 future):** every `{{tenant.*}}` placeholder used in `MESSAGES_V2/*.html` must resolve to a real value at send-time. This file is the inventory: what variables are needed, what they hold, and what Prizma's actual values are.
>
> **Status:** seed for canon SPEC #11 (Tenant variables — schema + plumbing). **PAUSED** until tenant 2 onboards.
>
> **Authority:** when SPEC #11 executes, this file is the source-of-truth checklist for what columns must exist in the tenant config (View `v_public_tenant` extension or Edge Function context lookup).

---

## Variables used across MESSAGES_V2 templates

### Identity / brand

| Variable | Type | Prizma value | Used in |
|---|---|---|---|
| `{{tenant.name}}` | text (he) | `אופטיקה פריזמה` | All templates |
| `{{tenant.wordmark}}` | text (latin) | `PRIZMA OPTIC` | All emails (header + footer) |
| `{{tenant.wordmark_subtitle}}` | text (latin) | `Luxury Eyewear Events` | All emails (header) |

### Contact details

| Variable | Type | Prizma value | Used in |
|---|---|---|---|
| `{{tenant.email_events}}` | email | `events@prizma-optic.co.il` | Notice card "verify sender" |
| `{{tenant.phone_main}}` | tel (Israeli landline format) | `08-6751313` | Footer ("available by phone"), `tel:` href |
| `{{tenant.phone_mobile}}` | tel (Israeli mobile format) | `053-3645404` | WhatsApp link source number (in event-day, 2-3d-before) |
| `{{tenant.address}}` | text (he, single line) | `הרצל 32, אשקלון` | Location card, footer copyright |

### URLs

| Variable | Type | Prizma value | Used in |
|---|---|---|---|
| `{{tenant.url_waze}}` | URL | `https://waze.com/ul/hsv8s5h2c3` | "Navigate with Waze" button |
| `{{tenant.url_instagram}}` | URL | `https://www.instagram.com/optic_prizma` | Footer Instagram link |
| `{{tenant.url_takanon}}` | URL | `https://prizma-optic.co.il/supersale-takanon/` | Step 3 ("more in terms"), notice cards |
| `{{tenant.url_brands}}` | URL | `https://prizma-optic.co.il/brands/` | Footer "brands page" link |

### WhatsApp deep links (pre-built per send context)

These are not tenant config — they are **per-message dynamic values** built by the messaging platform. Each is a `https://wa.me/{phone}?text={URL-encoded message}` URL.

| Placeholder | Purpose | Pre-built message text |
|---|---|---|
| `{{wa_message_catalog}}` | "Send me the catalog" CTA | `היי, נרשמתי לאירוע המותגים! אשמח לקבל את קטלוג המחירים והמותגים.` |
| `{{wa_message_correction}}` | "My details are wrong" CTA | `היי, נרשמתי לאירועי המכירות שלכם. ראיתי שהמידע שנקלט לא נכון.` |

Phone in both: `{{tenant.phone_mobile}}` (in international format `972{trim-leading-zero}3645404`).

### Lead-specific (from CRM context, not tenant config)

| Variable | Type | Source |
|---|---|---|
| `<שם>` | text | lead.name (from form submission) |
| `<טלפון>` | tel | lead.phone |
| `<אימייל>` | email | lead.email |
| `{{unsubscribe_url}}` | URL | Generated per-recipient short link to `/unsubscribe/?token={JWT}` |

---

## Prizma values — copy-paste-ready table for SPEC #11 seed

```
INSERT/UPDATE the row in tenants (or v_public_tenant source) where slug='prizma':

name                  = 'אופטיקה פריזמה'
wordmark              = 'PRIZMA OPTIC'
wordmark_subtitle     = 'Luxury Eyewear Events'
email_events          = 'events@prizma-optic.co.il'
phone_main            = '08-6751313'
phone_mobile          = '053-3645404'
address               = 'הרצל 32, אשקלון'
url_waze              = 'https://waze.com/ul/hsv8s5h2c3'
url_instagram         = 'https://www.instagram.com/optic_prizma'
url_takanon           = 'https://prizma-optic.co.il/supersale-takanon/'
url_brands            = 'https://prizma-optic.co.il/brands/'
```

---

## Schema implications for `v_public_tenant` extension

The current `v_public_tenant` view (per `opticup-storefront/VIEW_CONTRACTS.md`) exposes a subset of these. SPEC #11 needs to ensure all 11 fields above are surfaced. Some may already exist under different names (`logo_url`, `theme`) — audit before adding columns. New columns likely needed:

- `wordmark` (text) — Latin-script branded name
- `wordmark_subtitle` (text) — English tagline
- `email_events` (text) — campaign/transactional email sender
- `phone_main` (text) — primary phone
- `phone_mobile` (text) — mobile/WhatsApp phone
- `url_waze` (text) — Waze deep link
- `url_takanon` (text) — terms page URL
- `url_brands` (text) — brands page URL
- (`address`, `url_instagram`, `name` likely already exist)

---

## Verification protocol — before any V2 email goes live

For each template in `MESSAGES_V2/`:

1. `grep` for all `{{tenant.X}}` patterns in the template
2. Confirm every X is in the table above (no orphan placeholders)
3. Confirm tenant config row has all those values populated (no NULL → empty render)
4. Send a test email to a demo lead, verify every placeholder resolved (no literal `{{...}}` text in the rendered email)
5. Repeat per locale (Hebrew default; if EN/RU variants exist, same check there)

This protocol is part of canon SPEC #4 step 4.4 (smoke-test).

---

*End of TENANT_VARIABLES_REQUIRED.md.*
