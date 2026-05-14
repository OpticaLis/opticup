# INVENTORY — M3_SHORTGY_TO_INTERNAL_REDIRECT

> **Location:** `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/INVENTORY.md`
> **Written by:** opticup-executor (Step 0, read-only audit)
> **Date:** 2026-05-14
> **Status after Step 0:** ✅ baselines match §0 of SPEC. 1 escalation resolved (Daniel-approved gamaf-as-known-partner). Proceeding to Step 1.

---

## 1. Live baselines vs SPEC §0

| Surface | SPEC §0 baseline | Live (this Step 0) | Match? |
|---|---|---|---|
| `crm_message_templates.body` demo rows | 3 | 3 | ✅ |
| `crm_message_templates.body` prizma rows | 7 | 7 | ✅ |
| `crm_message_templates.body` total | 10 | 10 | ✅ |
| `tenants.payment_links` rows | 2 | 2 | ✅ |
| `storefront_pages.blocks` rows | 0 | 0 | ✅ |
| `short_links.target_url` rows | 0 | 0 | ✅ |
| `crm_message_queue` PENDING rows | 0 | 0 | ✅ (all 1170 hits are status='sent', historical) |
| ERP source `*.{js,ts,html,astro}` | 0 | 0 | ✅ |
| Storefront source | 0 | 0 | ✅ |
| Content drafts | 4 | 4 | ✅ |
| Unique short.gy codes | 4 | 4 | ✅ (`gmapy`, `dgUUIn`, `gCCfZx`, `kuZSCu`) |

**No divergence** from authoring-time baseline → proceed.

---

## 2. Destination map — curl-resolved (HTTP/1.1 trace)

| short.gy code | First-hop Location | Final destination | Domain class | Notes |
|---|---|---|---|---|
| `gmapy` | `https://gpw.gamaf.co.il/?id=IzQNzbZPhyDU&sid=U2FsdGVkX1/4/0NPy/xONtNHjNCAPoFRdflGF9vE7supiQ87dX0g6lCoPGaxGdbS` | `https://gpw.gamaf.co.il/?id=IzQNzbZPhyDU&sid=...` | Third-party (Gama payment gateway) | ⚠️ **Daniel-approved exception 2026-05-14.** This is the ₪50 SuperSale deposit gateway Prizma has used for months (see `M4_AUDIT_PHASE2/PHASE2_REPORT.md` §F4 + `P5_8_INVITED_TO_REGISTERED_TRANSITION/EXECUTION_REPORT.md` line 221). The SPEC §5 stop-trigger fired ("OUTSIDE prizma-controlled domains") → escalated → Daniel chose Option 1 (continue as known partner). Decision logged in EXECUTION_REPORT §4. |
| `dgUUIn` | `https://prizma-optic.co.il/supersale-takanon/` | `https://www.prizma-optic.co.il/supersale-takanon/` | prizma-optic.co.il ✅ | SuperSale T&C (תקנון האירוע). Final-hop is the `www.` canonical via 307. |
| `gCCfZx` | `https://prizma-optic.co.il/supersalepricescatalog/` | `https://www.prizma-optic.co.il/supersalepricescatalog/` | prizma-optic.co.il ✅ | SuperSale price catalog. |
| `kuZSCu` | `https://www.prizma-optic.co.il/supersale-stock/` | (same; 302 only, no 307 step) | prizma-optic.co.il ✅ | SuperSale stock / inventory page. |

**HTTP status sequence for each (`curl -sIL --max-time 10`):**
- `gmapy`: 302 → 200 (one hop)
- `dgUUIn`: 302 → 307 → 200 (two hops; `www.` canonicalization)
- `gCCfZx`: 302 → 307 → 200 (same shape as `dgUUIn`)
- `kuZSCu`: 302 → 200 (one hop, already on `www.`)

**No HTTP 4xx / 5xx encountered.** SPEC §5 STOP trigger "dead URL → STOP" did not fire.

**Target URL chosen for each new `short_links.target_url`:** the FINAL destination (i.e. after all 30x hops). This avoids the redundant short.gy → www. canonicalization hop and gives every customer one fewer round-trip.

---

## 3. Per-row migration plan

### Templates (10 rows) — `crm_message_templates.body`

Each row will be UPDATEd with tenant-scoped WHERE: `WHERE id='<UUID>' AND tenant_id='<UUID>'`. Each row pre-edit JSON is at `backups/2026-05-14_M3_SHORTGY_TO_INTERNAL_REDIRECT/db-rows/template_<tprefix>_<id>.json`.

**Note on placeholder vs literal swap (per SPEC §7 "Replacing all `%payment_url_50%` placeholders"):**
- 7 rows already use the placeholder `%payment_url_50%` and call `tenants.payment_links."50"` at send-time. These rows do NOT need `gmapy` body changes once `tenants.payment_links."50"` is migrated — the template body stays.
- But the live INVENTORY shows the literal `short.gy/gmapy` URL inside the template body too (apparently the templates carry BOTH the literal + the placeholder for fallback / historical purposes; the audit reports mention this — `event_registration_confirmation_sms_he` was migrated from hardcoded to `%payment_url_50%` recently per `P5_8_INVITED_TO_REGISTERED_TRANSITION/EXECUTION_REPORT.md`).
- Action: every literal `https://prizmaoptic.short.gy/<code>` in a template body is REPLACED with the new internal `/r/<new-code>` URL using the tenant's `storefront_url` from `tenants` table (e.g., `https://www.prizma-optic.co.il/r/<new-code>`).

Per-row plan (`gmapy` substitution uses the prizma new-code for prizma rows and the demo new-code for demo rows; same for `dgUUIn`):

| Tenant | Template ID | Template name | Old short.gy refs | New `/r/<code>` refs |
|---|---|---|---|---|
| demo | `292f7bc7-e43f-4697-8891-9cedeb8946e0` | אישור הרשמה לאירוע (Email) | `gmapy` × 1 | `<demo-storefront>/r/<demo-gmapy-code>` |
| demo | `4d42b03f-529e-4332-a8eb-97ddf97c8792` | שליחת קופון אישי (Email) | `dgUUIn` × 1 | `<demo-storefront>/r/<demo-dgUUIn-code>` |
| demo | `784cdf1c-84b6-4260-9417-4067c7609fb1` | שליחת קופון אישי (SMS) | `dgUUIn` × 1 | `<demo-storefront>/r/<demo-dgUUIn-code>` |
| prizma | `988bca26-5dbd-44b4-95da-7c0abc8cc34a` | אישור הרשמה לאירוע (Email) | `gmapy` × 1 | `<prizma-storefront>/r/<prizma-gmapy-code>` |
| prizma | `f00620cc-79d6-4bf9-9dbf-7d3c5afe862c` | הזמנה לאירוע פתוח להרשמה (SMS) — Email | `gCCfZx` × 1, `kuZSCu` × 1 | `<prizma-storefront>/r/<prizma-gCCfZx-code>` + `<prizma-storefront>/r/<prizma-kuZSCu-code>` |
| prizma | `c60f47ff-c9fa-49e0-a787-f2cebbb5c58e` | הזמנה לאירוע פתוח להרשמה (SMS) — SMS | `kuZSCu` × 1 | `<prizma-storefront>/r/<prizma-kuZSCu-code>` |
| prizma | `679c4510-4882-4a57-8a3e-0e611dabcd5d` | נפתחה ההרשמה לאירוע (SMS) — Email | `gCCfZx` × 1, `kuZSCu` × 1 | (same two as above) |
| prizma | `b325481a-7926-4e43-b5c1-413f45a2f5c3` | נפתחה ההרשמה לאירוע (SMS) — SMS | `kuZSCu` × 1 | (same) |
| prizma | `d3e19217-15af-4bee-8fdc-5b0ef22de4f6` | שליחת קופון אישי (SMS) — Email | `dgUUIn` × 1 | `<prizma-storefront>/r/<prizma-dgUUIn-code>` |
| prizma | `2f4e7585-4819-484d-a5d6-6eb312f66d52` | שליחת קופון אישי (SMS) — SMS | `dgUUIn` × 1 | (same as above row) |

### Tenants (2 rows) — `tenants.payment_links`

| Tenant | Slug | Pre-edit `payment_links` | Post-edit |
|---|---|---|---|
| demo | demo | `{"50": "https://prizmaoptic.short.gy/gmapy"}` | `{"50": "<demo-storefront>/r/<demo-gmapy-code>"}` |
| prizma | prizma | `{"50": "https://prizmaoptic.short.gy/gmapy"}` | `{"50": "<prizma-storefront>/r/<prizma-gmapy-code>"}` |

### New `short_links` rows (6 rows: 2 demo + 4 prizma)

Each `short_links` row created with `link_type='template_static'`, `expires_at='2099-12-31T23:59:59Z'`, 8-char alphanumeric `code` (matches the runtime broadcast-builder pattern at `send-message/url-builders.ts:48-104`).

| Tenant | Will-be-code (placeholder until generated) | target_url | link_type |
|---|---|---|---|
| demo | `<DEMO_GMAPY>` | `https://gpw.gamaf.co.il/?id=IzQNzbZPhyDU&sid=U2FsdGVkX1/4/0NPy/xONtNHjNCAPoFRdflGF9vE7supiQ87dX0g6lCoPGaxGdbS` | `template_static` |
| demo | `<DEMO_DGUUIN>` | `https://www.prizma-optic.co.il/supersale-takanon/` | `template_static` |
| prizma | `<PRIZMA_GMAPY>` | `https://gpw.gamaf.co.il/?id=IzQNzbZPhyDU&sid=U2FsdGVkX1/4/0NPy/xONtNHjNCAPoFRdflGF9vE7supiQ87dX0g6lCoPGaxGdbS` | `template_static` |
| prizma | `<PRIZMA_DGUUIN>` | `https://www.prizma-optic.co.il/supersale-takanon/` | `template_static` |
| prizma | `<PRIZMA_GCCFZX>` | `https://www.prizma-optic.co.il/supersalepricescatalog/` | `template_static` |
| prizma | `<PRIZMA_KUZSCU>` | `https://www.prizma-optic.co.il/supersale-stock/` | `template_static` |

### Content drafts (4 files) — `campaigns/supersale/MESSAGES UPDATE/`

| File | Pre-edit reference | Post-edit |
|---|---|---|
| `registration confirmation/SMS.txt` | `https://prizmaoptic.short.gy/gmapy` | `%payment_url_50%` placeholder (matches live template body shape) |
| `registration confirmation/EMAIL.txt` | `<a href="https://prizmaoptic.short.gy/gmapy">` | `<a href="%payment_url_50%">` |
| `COUPON/SMS.txt` | `https://prizmaoptic.short.gy/dgUUIn` | direct `<prizma-storefront>/r/<prizma-dgUUIn-code>` (these content drafts represent the customer-facing copy at send-time; using the resolved URL is the simplest correct match) |
| `COUPON/EMAIL.txt` | `<a href="https://prizmaoptic.short.gy/dgUUIn"...>` | `<a href="<prizma-storefront>/r/<prizma-dgUUIn-code>"...>` |

Rationale: the `registration confirmation/*` drafts ALREADY use `%payment_url_50%` in the live `event_registration_confirmation_sms_he` template body (per `P5_8_INVITED_TO_REGISTERED_TRANSITION/EXECUTION_REPORT.md`), so the source-of-truth content draft should match. The `COUPON/*` drafts use a direct URL because there is no `%coupon_terms_url%` variable in current tenant config — using the literal new-code URL is correct.

---

## 4. Out-of-scope (per SPEC §7) — confirmed via INVENTORY but NOT modified

| Surface | Live count | Action |
|---|---|---|
| `crm_message_log.content` | 4,370 rows with short.gy | LEAVE — historical audit trail, immutable |
| `crm_message_queue.body` (status='sent') | 1,170 rows | LEAVE — historical render artifacts |
| `crm_message_queue.body` (PENDING / non-sent) | 0 rows | (n/a) |
| `crm_broadcasts` | (no body column) | (n/a — broadcast bodies live in templates) |
| `storefront_pages.blocks` | 0 rows | (n/a — clean) |
| Storefront repo source files | 0 hits | (n/a — clean) |
| ERP repo source files (JS/HTML/TS) | 0 hits | (n/a — clean) |

---

## 5. Step 0 outcome — GO / NO-GO

✅ **GO.** Baselines match. 1 STOP trigger fired (gmapy → gamaf.co.il) and was Daniel-approved 2026-05-14 to proceed. No dead URLs. No surprise scope.

Proceeding to:
- Step 1: INSERT 6 short_links rows
- Step 2: curl-probe each new code
- Step 3: UPDATE 10 templates
- Step 4: UPDATE 2 tenants rows
- Step 5: sync 4 content drafts
- Step 6: build MVP stats tab in CRM
- Step 7: update KNOWLEDGE_MAP + FUNNEL_ROADMAP + M4 docs
- Step 8: smoke + click test (LH-Tester)

---

*End of INVENTORY.md.*
