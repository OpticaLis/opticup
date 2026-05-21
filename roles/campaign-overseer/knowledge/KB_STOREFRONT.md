# KB — Storefront (Campaign Pages + Forms + Lead Flow + Pixel Points)

> **Synthesized snapshot, 2026-05-21.** Authority surface: `roles/site-overseer/SITE_MAP.md` (full route inventory) + `roles/site-overseer/FUNNEL_ROADMAP.md` + `opticup-storefront` repo (Astro 5 + TS + Tailwind on Vercel SSR, public URL https://prizma-optic.co.il).
> **Read when:** task is in `CAMPAIGN_KB_MAP.md` row "Design/audit campaign page."

---

## 1. Campaign-related routes (1Astro + CMS)

### 1.1 Hardcoded Astro pages (in `opticup-storefront/src/pages/`)

| URL | Astro file | Purpose |
|---|---|---|
| `/event-register/` | `event-register/index.astro` | Public event-registration form. Posts to `register_lead_to_event` RPC via PostgREST. |
| `/quick-register/` | `quick-register/index.astro` | QR-walk-in registration (WhatsApp-driven). Reads `?event=X&tenant=demo` from URL. |
| `/unsubscribe/` | `unsubscribe/index.astro` | Email/SMS unsubscribe form. POSTs to `unsubscribe` EF → sets `crm_leads.unsubscribed_at`. |
| `/supersale-stock/` | `supersale-stock/index.astro` | SuperSale stock landing (campaign sub-page). |
| `/supersale-takanon/` | `supersale-takanon/index.astro` | SuperSale terms — **HARDCODED** (FIND-004: contains landline `08-6751313` + non-canonical phone `053-364-5404`). Iron Rule 9 violation under review. |
| `/api/leads/submit` (POST) | `src/pages/api/leads/submit.ts` | Lead intake — **brand leak** in `from='Optic Up Leads ...'` (FIND-016). |

### 1.2 CMS-driven campaign pages (12 active HE slugs, single-language)

Stored in `storefront_pages` rows (`page_type='campaign'`, `lang='he'`, `is_published=true`), rendered via `src/pages/[...slug].astro`:

| URL | Notes |
|---|---|
| `/supersale/` | Primary SuperSale landing. Form embedded; pixel fires on form submit. |
| `/successfulsupersale/` | Thank-you page after `/supersale/` submission. **Pixel back-wire here** (`pixel-fired` EF call). |
| `/supersalepricescatalog/` | Catalog (4-tier price grid + Boutique Club + Tier 4 ICONIC). Heavy daily edits (campaign-overseer mode). |
| `/supersale-models-prices/` | Per-model price block (campaign sub-page). |
| `/multisale-brands-cat/` | MultiSale brands catalog. |
| `/multisale-brands-cat2/` | MultiSale brands catalog v2. |
| `/successfulmulti/` | MultiSale thank-you. |
| `/premiummultisale/` | Premium MultiSale landing. |
| `/eventsunsubscribe/` | Event-specific unsubscribe page (separate from generic `/unsubscribe/`). |
| `/general/` | Generic campaign landing template. |
| `/מיופיה/` | Myopia landing (HE-only; **FIND-001** raw-UTF-8 5xx). |

**Empty publishes (FIND-002):** `/deal/`, `/privacy/`, `/terms/` return `200/0 bytes` — campaign pages MUST verify body present before sending traffic.

## 2. Lead → registration → thank-you flow

### 2.1 Public lead intake (storefront form)

```
User fills /supersale/ form
   │
   ├─ JS generates UUID v4 (fb_event_id)
   ├─ POST /api/leads/submit  ──►  POST /functions/v1/lead-intake
   │                                  │
   │                                  ├─ INSERT crm_leads (fb_event_id, utm_*, language)
   │                                  ├─ INSERT crm_capi_dispatch_queue (status='queued')
   │                                  ├─ _record_touchpoint (touchpoint_type='lead_submit')
   │                                  └─ EdgeRuntime.waitUntil(resolve_touchpoints_to_lead(...))
   │
   └─ Redirect → /successfulsupersale/?fbe=<uuid>
```

### 2.2 Thank-you + pixel back-wire

```
/successfulsupersale/ (Astro)
   │
   ├─ Browser pixel fires Lead event (eventID = fb_event_id)  ──►  Facebook (browser-side)
   │
   └─ POST /functions/v1/pixel-fired
         {event_id, tenant_id}
         keepalive: true, fire-and-forget
         │
         └─ UPDATE crm_leads SET fb_pixel_fired_at = NOW()
            (idempotent — D4)
```

This back-wire (shipped 2026-05-16, `M3_FUNNEL_PIXEL_BACKWIRE`) closes the measurement loop. The ERP can now distinguish "CAPI dispatched" (`crm_capi_dispatch_queue.status='sent'`) from "browser Pixel actually fired" (`fb_pixel_fired_at IS NOT NULL`). Without it, ad-blocker / redirect-failure / tab-close events were undetectable.

### 2.3 Event-registration flow (existing-lead path)

```
User clicks short-link `/r/<code>` (or hits /event-register/ directly)
   │
   ├─ resolve-link EF resolves code → target URL + records short_link_click + crm_lead_touchpoints
   ├─ /event-register/?event=<event_id>&lead=<lead_id>&token=<jwt>
   │
   └─ Form submit → register_lead_to_event RPC (13-arg signature)
         │
         ├─ Returns {status: 'registered' | 'waiting_list' | 'event_closed' | 'already_registered'}
         ├─ INSERT crm_event_attendees (capacity-aware; CASE WHEN over_cap THEN 'event_closed' ELSE 'waiting_list')
         ├─ _record_touchpoint (touchpoint_type='event_register')
         └─ Redirect → confirmation page or back to event surface
```

## 3. Pixel firing points (full inventory)

| Surface | Pixel event | When | Back-wire |
|---|---|---|---|
| `/supersale/` form submit | `Lead` (browser) | Form `onSubmit` | via `/successfulsupersale/` thank-you page |
| `/successfulsupersale/` thank-you | `Lead` (browser fires here too as Page View Lead) | Page mount | YES — `pixel-fired` EF |
| `/event-register/` confirmation | `CompleteRegistration` | (CAPI-only currently) | server-side only |
| Event-day attendee check-in (operator UI) | `EventAttended` | (CAPI-only) | server-side only |
| Purchase amount entry (CRM UI) | `Purchase` | (CAPI-only) | server-side only |

The CAPI track (server-side) fires for all 4 event types (Lead + CompleteRegistration + EventAttended + Purchase). The browser Pixel currently fires only `Lead` on the storefront. Future Phase 2 may add browser-side `CompleteRegistration` if Daniel needs faster cookie matching.

## 4. UTM / touchpoint capture

All campaign pages capture UTMs from URL params and persist them through 3 layers:
1. **Browser-side:** UTMs stored in the form payload.
2. **Lead-intake EF:** UTMs written to `crm_leads.utm_source / utm_medium / utm_campaign / utm_content / utm_term`.
3. **Touchpoint:** `_record_touchpoint` writes a `lead_submit` row to `crm_lead_touchpoints` with the UTMs in the payload.

Click-side: `resolve-link` records `short_link_click` touchpoints. The deferred `resolve_touchpoints_to_lead` RPC (30-day window) stitches anonymous touchpoints to the lead once it's identified.

Canonical view: `v_crm_lead_first_touch` (security_invoker, fallback to legacy `crm_leads.utm_*` when no touchpoint exists).

## 5. Storefront tech stack (for context)

- Astro 5 + TypeScript + Tailwind.
- Vercel SSR (`opticup-storefront` Vercel project, `main` branch deploys production).
- Public-data layer: 6 mirror tables (`branches_public`, `storefront_config_public`, `media_public`, `brands_public`, `inventory_images_public`, `inventory_public`) — anon SELECT only on these, never on private base tables. See `docs/PUBLIC_DATA_LAYER.md`.
- Image proxy mandatory: `/api/image/[...path].ts` (server-side SUPABASE_SERVICE_ROLE_KEY); `frame-images` bucket is private (Iron Rule 25).
- RTL-first (Hebrew default); logical CSS properties only (Iron Rule 27).

## 6. Known issues (open findings as of 2026-05-21)

| ID | Surface | Issue |
|---|---|---|
| FIND-001 | Hebrew-slug routes (`/בלוג/`, `/מיופיה/`, etc.) | raw UTF-8 fetch returns 5xx |
| FIND-002 | `/deal/`, `/privacy/`, `/terms/` | empty body (200/0) |
| FIND-004 | `/supersale-takanon/` | hardcoded landline + non-canonical phone format (Iron Rule 9) |
| FIND-010 | `/multifocal-guide/` | route 404 (CMS row published, route 404s) |
| FIND-013 | `/multi-takanon/` | HE-only, EN/RU translation gap |
| FIND-014 | `/optometry/` | CMS row exists but `is_published=false` — 404 publicly |
| FIND-016 | `/api/leads/submit` | brand leak in `from='Optic Up Leads ...'` |

For each: see `roles/site-overseer/SITE_MAP.md` for detail. Campaign Lead briefs the Site Overseer (not direct-fix) when a finding blocks campaign work.

## 7. Anti-patterns — do not

- Do NOT modify the storefront repo from a campaign skill. Storefront work is Site Overseer / Architect-SPEC territory. The Campaign Lead briefs the Site Overseer.
- Do NOT bypass the mirror tables for anon reads (Iron Rule 24 storefront-side; private base tables stay private).
- Do NOT hardcode prices/addresses on campaign pages (Iron Rule 9). Use CMS body + config.
- Do NOT inject raw URLs into campaign-page CTAs that point at SMS gateways (bot pollution — `feedback_clicks_are_not_actions`).

---

*KB_STOREFRONT v1, 2026-05-21. Refresh trigger: every Site Overseer change to campaign routes; every M3 SPEC that adds/removes a campaign page.*
