# Activation Prompt — SHORT_LINKS

> **Run this on Claude Code. You will work in BOTH repos (ERP + storefront).**
> **SPEC:** `modules/Module 4 - CRM/final/SHORT_LINKS/SPEC.md`

---

## Context

SMS messages contain ~195-char token URLs that consume most of the 160-char
SMS budget. This SPEC adds a `short_links` lookup table and a redirect EF
so URLs become ~38 chars: `prizma-optic.co.il/r/Ab3xK7m`.

---

## Pre-Flight

1. `cd` to ERP repo (`opticalis/opticup`)
2. `git branch` → must be `develop`
3. `git pull origin develop`
4. `git status` → must be clean
5. Read the SPEC at `modules/Module 4 - CRM/final/SHORT_LINKS/SPEC.md`

---

## Step 1 — Create `short_links` table (Supabase SQL)

Run this migration on Supabase (via the MCP tool or dashboard):

```sql
-- short_links: URL shortener for CRM messaging (registration + unsubscribe)
CREATE TABLE short_links (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id),
  code        text NOT NULL,
  target_url  text NOT NULL,
  link_type   text NOT NULL DEFAULT 'other',
  lead_id     uuid REFERENCES crm_leads(id),
  event_id    uuid REFERENCES crm_events(id),
  expires_at  timestamptz NOT NULL,
  click_count int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT short_links_code_unique UNIQUE (code)
);

ALTER TABLE short_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON short_links
  FOR ALL TO service_role USING (true);

CREATE POLICY tenant_isolation ON short_links
  FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

CREATE INDEX idx_short_links_code ON short_links (code);
```

**Verify:** `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'short_links';` → should be 10.

---

## Step 2 — Create `resolve-link` Edge Function

Create `supabase/functions/resolve-link/index.ts`:

```typescript
import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STOREFRONT_ORIGIN = "https://prizma-optic.co.il";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code || code.length < 4 || code.length > 16) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: STOREFRONT_ORIGIN },
    });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await db
    .from("short_links")
    .select("target_url, expires_at, id")
    .eq("code", code)
    .maybeSingle();

  if (error || !data) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: STOREFRONT_ORIGIN },
    });
  }

  // Check expiry
  if (new Date(data.expires_at) < new Date()) {
    return new Response(null, {
      status: 302,
      headers: { ...corsHeaders, Location: STOREFRONT_ORIGIN },
    });
  }

  // Fire-and-forget: increment click count
  db.from("short_links")
    .update({ click_count: data.click_count !== undefined ? data.click_count + 1 : 1 })
    .eq("id", data.id)
    .then(() => {})
    .catch(() => {});

  return new Response(null, {
    status: 302,
    headers: { ...corsHeaders, Location: data.target_url },
  });
});
```

**Wait — `click_count` increment is wrong above.** Supabase doesn't support
atomic increment via `.update()`. Use an RPC or raw SQL. Simpler approach:
just do a raw increment. Actually, for fire-and-forget analytics, the above
is fine — worst case we lose a count on a race. Accept this trade-off.

**Config file:** create `supabase/functions/resolve-link/config.toml`:
```toml
[function]
verify_jwt = false
```

If there's no per-function config pattern in this project, check how
`unsubscribe` handles `verify_jwt = false` and follow that pattern.

---

## Step 3 — Update `send-message` EF

Open `supabase/functions/send-message/index.ts`.

### 3a. Add `createShortLink` helper (after the existing `signToken` function):

```typescript
async function createShortLink(
  db: any,
  tenantId: string,
  targetUrl: string,
  linkType: string,
  leadId: string,
  eventId: string | null,
): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(bytes, (b) => chars[b % chars.length]).join("");

  const expiresAt = new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString();
  const row = {
    tenant_id: tenantId,
    code,
    target_url: targetUrl,
    link_type: linkType,
    lead_id: leadId,
    event_id: eventId,
    expires_at: expiresAt,
  };

  const { error } = await db.from("short_links").insert(row);
  if (error) {
    // Retry with new code on unlikely collision
    const bytes2 = crypto.getRandomValues(new Uint8Array(8));
    const code2 = Array.from(bytes2, (b) => chars[b % chars.length]).join("");
    row.code = code2;
    const res2 = await db.from("short_links").insert(row);
    if (res2.error) {
      console.warn("short_links insert failed twice, falling back to long URL");
      return targetUrl;  // Graceful fallback
    }
    return `${STOREFRONT_ORIGIN}/r/${code2}`;
  }
  return `${STOREFRONT_ORIGIN}/r/${code}`;
}
```

### 3b. Modify `buildUnsubscribeUrl` — add `db` parameter:

```typescript
async function buildUnsubscribeUrl(
  db: any, leadId: string, tenantId: string,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = await signToken(`${leadId}:${tenantId}:${exp}`);
  const fullUrl = `${STOREFRONT_ORIGIN}/unsubscribe?token=${token}`;
  return createShortLink(db, tenantId, fullUrl, "unsubscribe", leadId, null);
}
```

### 3c. Modify `buildRegistrationUrl` — add `db` parameter:

```typescript
async function buildRegistrationUrl(
  db: any, leadId: string, tenantId: string, eventId: string,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS;
  const token = await signToken(`${leadId}:${tenantId}:${eventId}:${exp}`);
  const fullUrl = `${STOREFRONT_ORIGIN}/event-register?token=${token}`;
  return createShortLink(db, tenantId, fullUrl, "registration", leadId, eventId);
}
```

### 3d. Update call sites

Find the two places where `buildUnsubscribeUrl` and `buildRegistrationUrl`
are called (~lines 168 and 184) and pass `db` as the first argument:

```typescript
// Was:  variables.unsubscribe_url = await buildUnsubscribeUrl(leadId, tenantId);
// Now:
variables.unsubscribe_url = await buildUnsubscribeUrl(db, leadId, tenantId);

// Was:  variables.registration_url = await buildRegistrationUrl(leadId, tenantId, eventId);
// Now:
variables.registration_url = await buildRegistrationUrl(db, leadId, tenantId, eventId);
```

The `db` variable is already available in the handler scope (created ~line 120).

---

## Step 4 — Storefront redirect route

Switch to the storefront repo. Confirm which branch has the feature code
(`git log --oneline -3`). Proceed on that branch.

Create `src/pages/r/[code].ts`:

```typescript
import type { APIRoute } from "astro";

export const GET: APIRoute = ({ params, redirect }) => {
  const code = params.code || "";
  const efUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/resolve-link?code=${encodeURIComponent(code)}`;
  return redirect(efUrl, 302);
};
```

**Verify:** `npm run build` → must pass.

---

## Step 5 — Deploy

1. Deploy `resolve-link` EF:
   ```bash
   npx supabase functions deploy resolve-link --project-ref tsxrrxzmdxaenlvocyit
   ```
   If supabase CLI isn't available, note this as a manual step for Daniel.

2. Deploy updated `send-message` EF:
   ```bash
   npx supabase functions deploy send-message --project-ref tsxrrxzmdxaenlvocyit
   ```

3. Push storefront changes → Daniel merges to main → Vercel deploys.

---

## Commits

**ERP repo:**
```bash
git add supabase/functions/resolve-link/index.ts supabase/functions/send-message/index.ts
# Add config.toml if created
git commit -m "feat(crm): add short links — resolve-link EF + send-message integration

New short_links table stores 8-char codes mapping to full HMAC-signed URLs.
resolve-link EF handles redirect. send-message EF now creates short links
for registration_url and unsubscribe_url. URLs drop from ~195 to ~38 chars."
git push origin develop
```

**Storefront repo:**
```bash
git add src/pages/r/\[code\].ts
git commit -m "feat(crm): add /r/[code] short link redirect route"
git push origin develop
```

---

## MANDATORY at End

- `git status` clean in both repos
- `npm run build` passes in storefront
- Write `EXECUTION_REPORT.md` + `FINDINGS.md` in the SPEC folder
  **in the ERP repo** at: `modules/Module 4 - CRM/final/SHORT_LINKS/`

---

## Warnings

- **Do NOT remove the HMAC token logic** — short links WRAP the full URL,
  they don't replace the security model
- **Do NOT modify the `unsubscribe` or `event-register` EFs** — they still
  receive the full token via redirect, unchanged
- **Graceful fallback:** if `short_links` insert fails, return the full URL
  (better a long SMS than no link at all)
- **Do NOT install new npm packages in ERP** — all code is Deno-native in EFs
- **Remember:** `resolve-link` must have `verify_jwt = false`
