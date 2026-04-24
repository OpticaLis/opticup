# SPEC — SHORT_LINKS

> **Location:** `modules/Module 4 - CRM/final/SHORT_LINKS/SPEC.md`
> **Author:** opticup-strategic (Cowork)
> **Date:** 2026-04-24
> **Priority:** CRITICAL — SMS messages exceed 160 chars due to long tokens
> **Estimated effort:** 45–60 minutes
> **Repos touched:** ERP (DB + EF code) — no storefront changes needed

---

## 1. Goal

Replace long HMAC-signed token URLs (~200 chars) with short redirect URLs
(~45 chars) using a lookup table. Current registration links consume most of
an SMS's 160-character budget, leaving almost no room for the message text.

**Before:** `prizma-optic.co.il/event-register?token=ZjQ5ZDRkOGU...G36E8pn...` (195 chars)
**After:** `prizma-optic.co.il/r/Ab3xK7m` (38 chars)

---

## 2. Architecture

```
┌─────────────────┐    ┌──────────────┐    ┌───────────────────┐
│  send-message   │───▶│ short_links  │    │  resolve-link EF  │
│  EF (creates)   │    │  (DB table)  │◀───│  (reads + redirect│
└─────────────────┘    └──────────────┘    └───────────────────┘
                             ▲                      │
                             │                      ▼
                       code (8 chars)         302 redirect to
                       + full HMAC URL        original full URL
```

### Flow:
1. `send-message` EF generates the full HMAC-signed URL (same as today)
2. Instead of returning it directly, inserts a row into `short_links` table
   with a random 8-char code and the full URL as `target_url`
3. Returns `STOREFRONT_ORIGIN/r/<code>` as the short URL
4. New `resolve-link` EF handles GET `/r/<code>`:
   - Looks up `code` in `short_links`
   - If found and not expired → 302 redirect to `target_url`
   - If expired or not found → redirect to storefront homepage
   - Increments `click_count` (fire-and-forget, non-blocking)

### Why a new EF (not an Astro page)?
- The storefront Astro app runs on Vercel with ISR/SSR — adding a
  server-side redirect route works, but it adds a Vercel function invocation
  for every click. A Supabase Edge Function is cheaper, faster (edge-deployed
  in the same region as the DB), and keeps the redirect logic server-side
  where the DB lookup happens.
- Alternative considered: Astro API route. Rejected because it requires
  the storefront to query Supabase with service_role key for the lookup,
  and the storefront should stay views/RPC-only per Rule 24.

---

## 3. Database

### New table: `short_links`

```sql
CREATE TABLE short_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  code        text NOT NULL,
  target_url  text NOT NULL,
  link_type   text NOT NULL DEFAULT 'other',  -- 'registration', 'unsubscribe', 'other'
  lead_id     uuid REFERENCES crm_leads(id),
  event_id    uuid REFERENCES crm_events(id),
  expires_at  timestamptz NOT NULL,
  click_count int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT short_links_code_unique UNIQUE (code)
);

-- RLS
ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON short_links
  FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON short_links
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

-- Index for fast lookup by code
CREATE INDEX idx_short_links_code ON short_links (code);
```

### Code generation
- 8 characters from `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`
- 62^8 = ~218 trillion combinations — collision-free for practical purposes
- Generated server-side using `crypto.getRandomValues`
- On the astronomically unlikely collision, retry once

### TTL
- Same as current HMAC token: 90 days
- `expires_at = now() + 90 days`
- Expired links redirect to storefront homepage (not a 404)

---

## 4. Edge Function: `resolve-link`

New EF at `supabase/functions/resolve-link/index.ts`.

```
GET /functions/v1/resolve-link?code=Ab3xK7m
→ 302 Location: https://prizma-optic.co.il/event-register?token=...
```

**Config:** `verify_jwt = false` (public, no auth needed — same as unsubscribe)

### Logic:
1. Read `code` from query params
2. Look up in `short_links` WHERE `code = $1`
3. If not found OR `expires_at < now()` → 302 to `STOREFRONT_ORIGIN`
4. 302 redirect to `target_url`
5. Fire-and-forget: increment `click_count` (don't await, don't fail on error)

### URL routing
The short URL format is: `prizma-optic.co.il/r/<code>`

This needs a redirect from the storefront to the EF. Two options:

**Option A — Astro redirect route (recommended):**
Create `opticup-storefront/src/pages/r/[code].ts`:
```typescript
export const GET = ({ params, redirect }) => {
  const efUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/resolve-link?code=${params.code}`;
  return redirect(efUrl, 302);
};
```
This is a thin pass-through — the storefront doesn't query the DB, just
redirects to the EF. Minimal, no service_role needed.

**Option B — Vercel rewrite in vercel.json:**
```json
{ "rewrites": [{ "source": "/r/:code", "destination": "https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/resolve-link?code=:code" }] }
```
Zero code, edge-level rewrite. But ties the config to the Supabase project URL.

**Decision: use Option A** — it's explicit, lives in code, and follows the
project's "no magic config" convention.

---

## 5. Changes to `send-message` EF

In `supabase/functions/send-message/index.ts`:

### New helper function:
```typescript
async function createShortLink(
  db: SupabaseClient,
  tenantId: string,
  targetUrl: string,
  linkType: string,
  leadId: string,
  eventId: string | null,
): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(bytes).map(b => chars[b % chars.length]).join('');

  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();

  const { error } = await db.from('short_links').insert({
    tenant_id: tenantId,
    code,
    target_url: targetUrl,
    link_type: linkType,
    lead_id: leadId,
    event_id: eventId,
    expires_at: expiresAt,
  });

  if (error) {
    // Collision (astronomically unlikely) — retry with new code
    const bytes2 = crypto.getRandomValues(new Uint8Array(8));
    const code2 = Array.from(bytes2).map(b => chars[b % chars.length]).join('');
    await db.from('short_links').insert({
      tenant_id: tenantId,
      code: code2,
      target_url: targetUrl,
      link_type: linkType,
      lead_id: leadId,
      event_id: eventId,
      expires_at: expiresAt,
    });
    return `${STOREFRONT_ORIGIN}/r/${code2}`;
  }

  return `${STOREFRONT_ORIGIN}/r/${code}`;
}
```

### Modify `buildUnsubscribeUrl` and `buildRegistrationUrl`:
Both functions currently return the full URL. Change them to:
1. Generate the full HMAC URL (same as today) → `targetUrl`
2. Call `createShortLink(db, tenantId, targetUrl, type, leadId, eventId)`
3. Return the short URL

Both functions need `db` (SupabaseClient) as a new parameter.

---

## 6. Success Criteria

| # | Criterion | How to verify |
|---|-----------|---------------|
| 1 | `short_links` table exists with correct schema | `SELECT * FROM information_schema.columns WHERE table_name = 'short_links'` |
| 2 | RLS policies on `short_links` | `SELECT * FROM pg_policies WHERE tablename = 'short_links'` |
| 3 | `resolve-link` EF deployed | `curl -s -o /dev/null -w "%{http_code}" $SUPABASE_URL/functions/v1/resolve-link?code=test` → 302 (redirect to homepage) |
| 4 | SMS from CRM contains short URL | Send test SMS to 0537889878, check `crm_message_log.content` — URL should be `prizma-optic.co.il/r/XXXXXXXX` (~38 chars) |
| 5 | Short URL redirects to full registration page | Click the short link → lands on `/event-register?token=...` with pre-filled form |
| 6 | Short URL redirects to full unsubscribe page | Click unsubscribe short link → lands on `/unsubscribe?token=...` |
| 7 | Expired links redirect to homepage | Insert a row with `expires_at` in the past, visit → redirects to `prizma-optic.co.il` |
| 8 | `click_count` increments | Visit a short link twice, check `SELECT click_count FROM short_links WHERE code = '...'` → 2 |
| 9 | Storefront `/r/<code>` route works | `curl -sI https://prizma-optic.co.il/r/test` → 302 |
| 10 | `git status` clean in both repos | No uncommitted files |

---

## 7. Stop-on-Deviation Triggers

- If the `send-message` EF fails to create short links → STOP (fallback to long URLs is acceptable temporarily but must be explicit)
- If `resolve-link` EF returns anything other than 302 for valid codes → STOP
- If any existing EF is modified beyond `send-message` → STOP
- If the storefront route requires service_role key → STOP (use Option B instead)
- If `npm run build` fails in storefront → STOP

---

## 8. Out of Scope

- Click analytics dashboard (table captures click_count, UI later)
- Custom short domains (e.g., `prz.ma/abc`)
- QR code generation (separate OPEN_ISSUES item #6)
- Cleaning up old HMAC token logic (short links wrap it, don't replace it)
- SaaS-ification of STOREFRONT_ORIGIN (existing tech debt M4-DEBT-FINAL-02)

---

## 9. Commit Plan

- **ERP repo commit 1:** `feat(crm): add short_links table + resolve-link EF`
  - Migration SQL for `short_links` table
  - New EF `supabase/functions/resolve-link/index.ts`
- **ERP repo commit 2:** `feat(crm): integrate short links into send-message EF`
  - Modified `send-message/index.ts` — new helper + updated URL builders
- **Storefront repo commit:** `feat(crm): add /r/[code] redirect route`
  - New file `src/pages/r/[code].ts`
- **Deploy steps:**
  1. Run migration SQL on Supabase (table + RLS)
  2. Deploy `resolve-link` EF to Supabase
  3. Deploy updated `send-message` EF to Supabase
  4. Push storefront to develop → merge to main → Vercel deploys

---

## 10. Expected Final State

- SMS messages contain ~38-char URLs instead of ~195-char URLs
- Full HMAC security preserved (short links are wrappers, not replacements)
- Click tracking built-in for future analytics
- Expired links gracefully redirect to homepage
- No breaking changes to existing flows

---

## 11. Lessons Already Incorporated

- Cross-Reference Check completed 2026-04-24 against GLOBAL_SCHEMA: 0 collisions.
  `short_links` is a new table name, no conflicts. `resolve-link` is a new EF name.
- FROM STOREFRONT_FORMS_BUGFIX FOREMAN_REVIEW Lesson 1: ACTIVATION_PROMPT will
  not hard-code branch names for sibling repo.
- FROM STOREFRONT_FORMS_PART_B FOREMAN_REVIEW Lesson 2: include Astro CSS
  scoping warning if relevant (not relevant here — no client-side rendering).
