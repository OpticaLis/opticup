# SPEC — D6: AI Content auth fix (sb.functions.invoke migration)

> **Author:** opticup-executor (FOLLOWUP loop after T7-T9-T5-T6)
> **Created:** 2026-04-27
> **Severity:** MEDIUM (was: AI generation silently failed for users)
> **Parent:** `M1_FIXES_2026_04_26/ROADMAP.md` row D6
> **Implementation guide:** `D6_AI_CONTENT_INVESTIGATION/T11_AI_CONTENT_INVESTIGATION.md`

## Goal

Fix the D6 root cause identified in T11: bare `fetch()` calls to Supabase Edge Functions were missing the Authorization header that the gateway requires (`verify_jwt = true` platform default). All such calls returned HTTP 401 before the EF code ran. Migrate to `sb.functions.invoke()` which auto-attaches the JWT.

## Implementation

11 fetch sites across 6 files, all in `modules/storefront/`. Pattern per site:

**Before:**
```js
const res = await fetch(EDGE_FN_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});
const data = await res.json();
if (!data.success) throw new Error(data.error);
```

**After:**
```js
const { data, error } = await sb.functions.invoke('fn-name', { body: payload });
if (error) throw error;
if (!data?.success) throw new Error(data?.error);
```

### Sites migrated

| File | Sites | EF target |
|------|-------|-----------|
| `storefront-content.js` | 1 (line ~480) | generate-ai-content |
| `studio-ai-prompt.js` | 3 (page, component, custom) | cms-ai-edit |
| `storefront-blog.js` | 3 (generate, generate-with-content, translate) | generate-blog-post |
| `storefront-landing-content.js` | 2 (createNew, regenerate) | generate-landing-content |
| `studio-seo.js` | 1 (auto-SEO) | cms-ai-edit |
| `studio-campaign-builder.js` | 1 (generate page) | generate-campaign-page |

### Scope expansion vs T11

T11 reported "4 files / ~5 sites". Actual: **6 files / 11 sites**. Two additional files surfaced via fresh grep:
- `studio-campaign-builder.js` (was manually adding Authorization, not broken — migrated for uniformity)
- `studio-seo.js` (full bug — added)

storefront-blog.js had 3 sites instead of the 1 T11 estimated.

## Success Criteria

1. ✅ All 11 fetch sites migrated.
2. ✅ Project-wide grep `fetch\(.*EDGE.*FN|fetch\(.*ENDPOINT|fetch\(LANDING|fetch\(BLOG|fetch\(AI_EDIT` returns 0 hits in `modules/storefront/`.
3. ✅ Pre-commit + integrity gates pass.
4. ✅ Two-commit pattern.

## Out-of-Scope

- Other EF callers (CRM module already uses `sb.functions.invoke`; auth-service.js's pin-auth call is server-managed; etc.)
- Removing the URL constants (`EDGE_FN_URL`, `BLOG_EDGE_FN`, `LANDING_EDGE_FN`, `AI_EDIT_ENDPOINT`, `CAMPAIGN_EDGE_FN`) — they're now unused but a future housekeeping SPEC can remove them.
- Adding user-facing toast for AI failures (T11 §3 noted this; would be a separate UX SPEC).

## Commit Plan

Two commits:
1. `fix(storefront): migrate 11 EF callers to sb.functions.invoke() (D6)` — multi-file fix + ROADMAP.
2. `chore(spec): close D6 with retrospective` — SPEC + EXECUTION_REPORT.

---

*End of SPEC.*
