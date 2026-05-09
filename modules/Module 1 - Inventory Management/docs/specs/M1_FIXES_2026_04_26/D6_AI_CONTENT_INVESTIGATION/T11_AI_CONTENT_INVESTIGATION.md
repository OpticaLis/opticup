# T11 — D6 AI Content Generation Investigation

> **Phase:** read-only investigation (T11 of OVERNIGHT_M1_M3_BURNDOWN)
> **Written by:** opticup-executor (Claude Code, Windows desktop)
> **Written on:** 2026-04-26
> **No source changes.** Reproduces failure + identifies root cause + proposes JS-side patch.

---

## TL;DR

**Root cause: missing `Authorization` (and `apikey`) headers on the
`fetch()` call.** Supabase's API gateway returns **HTTP 401** before the
Edge Function code even runs. The JS shows a generic toast about AI
being unavailable; users see the failure but the actual cause is at the
gateway, not in the AI generation logic. **The fix is one-line on the JS
side — no Edge Function deploy needed.**

The same bug pattern is present in **4 other Studio JS files** (3 sites
in studio-ai-prompt.js, plus storefront-landing-content.js, storefront-
blog.js). All bare-`fetch()` Edge Function calls in the storefront/Studio
modules likely fail the same way. Recommend a single follow-up SPEC that
fixes all of them together OR migrates to `sb.functions.invoke()` (which
the CRM module already uses successfully).

---

## 1. Reproduction

Direct curl probes against the live endpoint
`https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/generate-ai-content`:

| # | Headers | Response |
|---|---------|----------|
| 1 | `Content-Type: application/json` only (mirrors current JS) | **HTTP 401** |
| 2 | + `apikey: <anon>` + `Authorization: Bearer <anon>` | **HTTP 200** |
| 3 | + `apikey: <service-role>` + `Authorization: Bearer <service-role>` | **HTTP 200** |

Body in all 3 cases:
```json
{"tenant_id":"<uuid>","product_id":"<uuid>","product_data":{"brand_name":"Test","model":"X","color":"Black","size":"50","product_type":"eyeglasses"}}
```

**Conclusion:** the body and endpoint are correct. The gateway rejects
the request before it reaches the EF code. Adding either anon or
service-role bearer auth makes it work.

---

## 2. Contract comparison

### JS sends (`modules/storefront/storefront-content.js:480-497`)

```js
const res = await fetch(EDGE_FN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },        // ← ONLY this
  body: JSON.stringify({
    tenant_id: tid,
    product_id: product.id,
    content_types: ['description', 'seo_title', 'seo_description', 'alt_text'],
    product_data: { brand_name, model, color, size, product_type },
    image_storage_path: product.image_path || null,
    brand_corrections: brandCorrections
  })
});
```

### EF expects (`supabase/functions/generate-ai-content/index.ts:291-313`)

```ts
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return errRes("Method not allowed", 405);
  try {
    const body = await req.json();
    const { tenant_id, product_id, content_types, product_data, image_storage_path, brand_corrections, bulk } = body;
    if (!tenant_id || !product_id || !product_data) return errRes("Missing required fields…", 400);
    // …
  }
});
```

### Configuration check

`supabase/config.toml` only declares per-function settings for `pin-auth`
(`verify_jwt = true`). Every other function uses Supabase's default,
which is **`verify_jwt = true`** — meaning the gateway requires a valid
JWT Bearer or apikey header.

The 401 in Test 1 above is the gateway responding "no JWT, no entry" —
the EF body never executes, which is why no error message reaches the
client beyond the HTTP status.

---

## 3. Why the JS error handler shows "AI unavailable"

`storefront-content.js:498-510`:

```js
try {
  const res = await fetch(EDGE_FN_URL, { … });
  data = await res.json();   // ← parsing 401 response body as JSON
} catch (e) {
  console.error('AI generate fetch failed:', e);
  throw new Error('AI_UNAVAILABLE');
}
if (!data || !data.success) {
  console.error('AI generate failed:', data && data.error);
  if (data && /api[_ ]?key|anthropic|not configured/i.test(String(data.error || ''))) {
    throw new Error('AI_UNAVAILABLE');
  }
  return null;
}
```

The 401 response body from the Supabase gateway is JSON like
`{"code":401,"message":"Invalid JWT"}`. The JS sees `!data.success`
(true), the regex doesn't match `Invalid JWT`, so it returns null — and
the caller silently treats it as "no content generated" without a clear
error.

**Secondary issue:** the error path is silent. The user sees no toast
explaining "your request was rejected by the gateway"; they just see
"no content was generated" with no recourse.

---

## 4. Proposed fix (JS-side, single file)

**Change:** add the anon key as both `apikey` and `Authorization: Bearer`
headers. This is the minimum change to make the call succeed.

```js
// Where to source the anon key — supabase-js exposes it on the client
// instance, but for a bare fetch() the cleanest pattern is to read from
// the existing global 'sb' Supabase client. The key is available at:
//   sb.supabaseKey  (anon key, the one used to create the client)
// OR via a module-level constant if the project standardizes on that.

const ANON_KEY = sb?.supabaseKey || /* fallback */ '';

const res = await fetch(EDGE_FN_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
  },
  body: JSON.stringify({ /* unchanged */ })
});
```

**Better long-term:** switch to `sb.functions.invoke()` which automatically
attaches the user's session JWT (or the anon key as fallback) — no manual
header plumbing required. The CRM module's `crm-messaging-send.js:76` and
`crm-automation-history.js:155` already use this pattern successfully:

```js
const { data, error } = await sb.functions.invoke('generate-ai-content', {
  body: { tenant_id, product_id, content_types, product_data, image_storage_path, brand_corrections }
});
if (error) { /* handle */ }
```

**Tertiary improvement:** once the call succeeds, also surface the failure
case to the user via toast. `console.error` only is invisible to non-tech
admins.

---

## 5. Same bug in 3 other places

`grep -rn "supabase\.co/functions" --include="*.js"` reveals 4 files using
bare `fetch()` to call EFs:

| File | Sites | EF target |
|------|-------|-----------|
| `modules/storefront/storefront-content.js` | 1 (line 480) | generate-ai-content |
| `modules/storefront/storefront-landing-content.js` | (TBD — same bare-fetch pattern) | generate-landing-content |
| `modules/storefront/storefront-blog.js` | (TBD) | generate-blog-post |
| `modules/storefront/studio-ai-prompt.js` | 3 (lines 15, 36, 236) | cms-ai-edit |

Spot-checks confirmed studio-ai-prompt.js uses the same `headers: { 'Content-Type': 'application/json' }` pattern with no auth. All 4 likely fail with HTTP 401 the same way.

The CRM module uses `sb.functions.invoke()` instead and works correctly
— that pattern is the right target.

---

## 6. Recommended fix path (for a follow-up SPEC, NOT this commit)

| # | Fix | Scope | SPEC type |
|---|-----|-------|-----------|
| 1 | Migrate all 4 Studio EF callers from bare `fetch()` to `sb.functions.invoke()` | 4 files, ~6 sites | JS only — autonomous |
| 2 | Add a generic toast for AI EF failures (not just AI_UNAVAILABLE silent) | storefront-content.js + the 3 other AI callers | JS only — autonomous |
| 3 | Optional: write a thin wrapper `aiInvoke(fnName, body)` in shared/js/ that handles invoke + error toast + retry — DRY across the 4 sites | New shared helper | JS only — autonomous |

NOT recommended:
- Adding manual `apikey` + `Authorization: Bearer` headers ad-hoc. It works (Test 2 above proves it) but `sb.functions.invoke()` is the codebase's established pattern (CRM uses it) and handles JWT freshness automatically.

---

## 7. Methodology

- Read `storefront-content.js:455-511` (the EF call site).
- Read `supabase/functions/generate-ai-content/index.ts:1-80` (header) and `:285-340` (handler entry).
- Inspected `supabase/config.toml` for `verify_jwt` overrides — only `pin-auth` has one; every other EF inherits the platform default (`verify_jwt = true`).
- Reproduced via 3 curl probes: no auth (401), anon key (200), service role (200).
- Cross-grepped all `supabase.co/functions` references in `*.js` files.

---

## 8. Open questions

- The CRM module's `sb.functions.invoke('retry-failed', ...)` and `sb.functions.invoke('send-message', ...)` call work today. Confirms the pattern.
- It's worth verifying whether the bug shipped in the original code or was introduced later — `git blame storefront-content.js:482` would tell. Out of scope for this read-only investigation.
- The Studio's permission gating may be intercepting the failure higher up (`requirePermission('ai.generate')` — not verified). A user without permission would see a different error path; the 401 reproduction here proves the gateway-level failure regardless.

---

*End of T11_AI_CONTENT_INVESTIGATION.md.*
