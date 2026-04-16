# API Routes Audit — Mission 4

**Generated:** 2026-04-16
**Auditor:** Main executor (opticup-executor)
**Scope:** All 3 API routes under `opticup-storefront/src/pages/api/`
**Method:** Code review + live endpoint testing against Vercel preview (`https://opticup-storefront.vercel.app`)

---

## Summary

- Routes audited: 3 (`/api/image/[...path]`, `/api/leads/submit`, `/api/normalize-logo`)
- PASS: 2 (image proxy, normalize-logo)
- FAIL: 1 (`/api/leads/submit` returns 404 on deployed Vercel preview)
- Code quality: All 3 routes well-structured; defense-in-depth on auth, rate-limiting, input validation, and error handling.

---

## Route-by-Route Results

### 1. `/api/image/[...path].ts` — Image Proxy (Rule 25)

| Check | Result | Evidence |
|-------|--------|----------|
| Rate limiting | ✅ PASS | `rateLimit(image:${ip}, 1000, 60_000)` — 1000/min per IP |
| Path traversal protection | ✅ PASS | Rejects `..`, `//` with HTTP 400 (lines 24–26). Confirmed: `/api/image/../etc/passwd` → 404 (URL-normalized by Vercel before route) |
| Bucket allow-list | ✅ PASS | Only `frames/` → `frame-images`, `media/` → `media-library`. Anything else → 403 (confirmed live: `/api/image/noprefix/foo` → 403) |
| Service-role auth | ✅ PASS | Uses `SUPABASE_SERVICE_ROLE_KEY` only server-side (module-level reuse) |
| Signed URL expiry | ✅ PASS | 3600s (1 hour) |
| Cache headers | ✅ PASS | `Cache-Control: public, max-age=3600, s-maxage=3600` |
| Error leakage | ✅ PASS | Catches errors, returns generic messages; logs internally |
| Live test — real product image | ✅ PASS | `/api/image/frames/.../1775375469979_yfqm.webp` → 302 → 200 `image/webp` (18.8 KB) |
| **CRITICAL** — legacy bucket-prefix stripping | ✅ PASS | Lines 29–31 handle `media-library/` legacy prefix (ERP migration v1 artifact) |

**Verdict:** PASS. This route is ready for DNS switch.

**Note:** Line 44 returns 500 if env vars missing (`Server misconfigured`) — safe fallback.

---

### 2. `/api/leads/submit.ts` — Lead Form Submission

| Check | Result | Evidence |
|-------|--------|----------|
| **Live deployment** | 🔴 **FAIL** | POST / HEAD / GET all return **404** on Vercel preview. File exists in repo (`src/pages/api/leads/submit.ts`, 267 lines). Local `npm run build` passes. Deployed `_render.func` does not route to it. |
| Rate limiting (code review) | ✅ PASS | `rateLimit(leads:${ip}, 5, 60_000)` — 5/min per IP (appropriate for form submissions) |
| Body size cap (Rule S9) | ✅ PASS | 100KB limit (line 44), returns 413 if exceeded |
| Required-field validation | ✅ PASS | `tenant_id` + `phone` required (line 55) |
| Phone format validation | ✅ PASS | Regex `/^(\+?972|0)\d{8,9}$/` (line 63) — Israeli format |
| Email format validation | ✅ PASS | Standard regex (line 71) |
| Service-role auth | ✅ PASS | Server-side `SUPABASE_SERVICE_ROLE_KEY` |
| SSRF protection on webhook URL | ✅ PASS | `isValidWebhookUrl()` (lines 6–32) blocks localhost, RFC1918, link-local, `169.254.169.254`, `.internal`, `.local` |
| tenant_id enforcement on insert | ✅ PASS | `tenant_id` explicit in insert payload (line 113) |
| XSS in email body | ⚠️ LOW | Email HTML includes user-submitted `name`, `phone`, `email`, `finalMessage` without escaping (lines 156–160). Rendered only in operator's email inbox (not public), but email client XSS risk remains. |
| Non-blocking email | ✅ PASS | Resend errors logged but do not fail the request |
| Webhook tracking | ✅ PASS | Updates `cms_leads.webhook_status` / `webhook_response` (truncated to 500 chars) |
| Error leakage | ✅ PASS | Generic error messages to client; details logged server-side |
| Language hard-coding | ⚠️ LOW | Line 206: `Language: 'he'` in webhook payload is hardcoded. If the form is submitted from `/en/*` or `/ru/*`, the webhook will still report Hebrew. Make.com downstream may route incorrectly. |
| Field name i18n map | ✅ PASS | Line 194–199 maps Hebrew checkbox/field names to English for Make.com compatibility |

**Verdict:** 🔴 **FAIL — CRITICAL blocker for DNS switch.** The code is well-written but the endpoint is not reachable. This matches the known issue `CONTACT_FORM_FIX` already queued in SESSION_CONTEXT ("בואו נדבר form shows success but data silently lost").

**Recommended action:** Escalate to Foreman to schedule `CONTACT_FORM_FIX` SPEC before DNS switch. Investigate why the route doesn't resolve on Vercel (Astro i18n middleware swallowing `/api/*`? Vercel deployment lag? Route file excluded from build?).

---

### 3. `/api/normalize-logo.ts` — Logo Normalization (Admin-only)

| Check | Result | Evidence |
|-------|--------|----------|
| **Live deployment** | ✅ PASS | POST returns **403** without auth (expected); GET returns 404 (expected — route only exports POST) |
| Rate limiting | ✅ PASS | `rateLimit(logo:${ip}, 3, 60_000)` — 3/min (strict — expensive sharp ops) |
| Auth required | ✅ PASS | No `Authorization` header → 401 (lines 23–25) |
| Dual-auth paths | ✅ PASS | Accepts (a) Supabase JWT (3-part token with `auth.getUser()` verification) or (b) opaque ERP session token (validates against `auth_sessions` table with `is_active=true AND expires_at > NOW()`) |
| Service-role bypass | ✅ PASS | `authHeader === Bearer ${SUPABASE_SERVICE_ROLE_KEY}` short-circuits tenant check (correct pattern) |
| IDOR protection | ✅ PASS | Non-service callers can only modify their own `tenant_id` (line 98); brand ownership verified (lines 101–107) |
| Input validation | ✅ PASS | Requires `image_base64`, `tenant_id`, `type`; 1.5MB cap on base64 (line 111) |
| Sharp pipeline | ✅ PASS | Trim → Resize (fit inside) → Center on transparent 400×200 canvas → PNG quality 90 |
| Storage path scoped by tenant | ✅ PASS | `brands/{tenant_id}/{brand_id}_{ts}.png` or `tenants/{tenant_id}/site-logo_{ts}.png` |
| DB update | ✅ PASS | Updates `brands.logo_url` or `storefront_config.site_logo_url` with `.eq(tenant_id, ...)` |
| Error leakage | ✅ PASS | Generic errors; internal logs include message only |

**Verdict:** PASS.

**Notes:**
- SPEC §A Mission 4 description says this route is `GET` — it is actually `POST`. Minor SPEC drift, logged as FINDING-M4-03.
- Trim fallback (lines 125–130): if `sharp().trim()` fails (non-standard image), code continues with the original buffer. Safe degradation.
- Line 143: `withoutEnlargement: false` — small logos will be upscaled to fill the canvas. Deliberate choice, good for small brand logos.

---

## Findings by Severity

### CRITICAL

**FINDING-M4-01 [CRITICAL] — `/api/leads/submit` returns 404 on Vercel preview**

**Location:** `opticup-storefront/src/pages/api/leads/submit.ts` (file present, 267 lines, local build passes)
**Evidence:**
```
$ curl -sI -X POST -H "Content-Type: application/json" -d '{...}' \
    https://opticup-storefront.vercel.app/api/leads/submit
HTTP/1.1 404 Not Found
```
The file exists and `npm run build` produces a valid server bundle. The Vercel-deployed `_render.func` must still be resolving — the image route works — but this specific path does not. Matches the known `CONTACT_FORM_FIX` launch blocker in SESSION_CONTEXT.
**Impact:** Contact forms submit but data is silently lost. A DNS switch WITHOUT fixing this = zero inbound leads from the new site.
**Suggested next action:** Re-deploy the Vercel preview from HEAD; if still broken, debug Astro i18n middleware intercepting `/api/*` routes. Block DNS switch until resolved.

### HIGH
*(none)*

### MEDIUM
*(none)*

### LOW

**FINDING-M4-02 [LOW] — Unescaped user input in outbound email HTML**
**Location:** `api/leads/submit.ts:156–160`
**Evidence:** `${name}`, `${phone}`, `${email}`, `${finalMessage}` are directly interpolated into the email HTML body sent via Resend, with no HTML escaping.
**Impact:** A submitted `<script>` tag would not execute for the operator (email clients sanitize), but malformed HTML could break the email rendering. Since leads are inserted by anonymous web visitors, treat as untrusted input.
**Suggested fix:** Route through a small `escapeHtml()` helper for each interpolation. Trivial, ~5 lines.

**FINDING-M4-03 [LOW] — Hardcoded `Language: 'he'` in webhook payload**
**Location:** `api/leads/submit.ts:206`
**Evidence:** `fields.Language = 'he'` is a string literal.
**Impact:** Make.com receives "he" for every submission regardless of the form's origin locale. EN/RU lead routing would misfire.
**Suggested fix:** Accept `lang` from request body; default to `'he'` if unset. Or derive from `page_url` prefix.

**FINDING-M4-04 [LOW] — SPEC drift: `normalize-logo` is POST, not GET**
**Location:** `SPEC.md §A Mission 4` table (last row)
**Impact:** Documentation drift only — no functional issue.
**Suggested fix:** Update SPEC template or skip since SPEC is closing.

---

## Iron Rule / Security Compliance Summary

| Rule | Image Proxy | Leads Submit | Normalize Logo |
|------|-------------|--------------|----------------|
| Rule 7 (API abstraction) | N/A — API route not client | N/A | N/A |
| Rule 8 (XSS safety) | ✅ | ⚠️ LOW (email interpolation) | ✅ |
| Rule 14/22 (tenant_id) | ✅ (signed URL per bucket path) | ✅ | ✅ |
| Rule 23 (secrets) | ✅ (env vars only) | ✅ | ✅ |
| Rate limiting | ✅ 1000/min | ✅ 5/min | ✅ 3/min |
| Input validation | ✅ path traversal | ✅ phone/email | ✅ size, type |
| Auth | Service-role only (server) | Public POST (anon-submitted form) — expected | Dual-path (JWT or ERP session) |
| Error leakage | ✅ generic | ✅ generic | ✅ generic |

---

## Recommendations

1. **BEFORE DNS switch:** resolve FINDING-M4-01 (`/api/leads/submit` 404). This is the single gating item for this mission.
2. **FIX during next form-editing SPEC:** FINDING-M4-02 (email HTML escape) + FINDING-M4-03 (lang in webhook).
3. **Consider adding** `/api/health` endpoint that checks env vars + DB reachability. Currently there is no synthetic "is the server alive" check.
