# Claude Code — Fix Documentation Drift from P3c+P4

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop

---

## Context

P3c+P4 SPEC (messaging pipeline rebuild) closed with 6 commits (`64a8f80..e8dad2c`)
+ Foreman Review commit `43567bb`. The Foreman Review (🟡 CLOSED WITH FOLLOW-UPS)
flagged 4 documentation files that were NOT updated during execution. This prompt
fixes them in a single commit.

**Source:** `modules/Module 4 - CRM/go-live/specs/P3C_P4_MESSAGING_PIPELINE/FOREMAN_REVIEW.md` §8 + §10.

---

## Pre-existing Dirty Repo

Same rule as P3c+P4: if uncommitted files exist, leave them alone. Selective `git add` only.

---

## Tasks (single commit)

### 1. Update `MASTER_ROADMAP.md`

Three locations need updating:

**§2 Module Status Table (line ~41):** Change Module 4 row from:
```
P3a CLOSED — 2026-04-22
```
to:
```
P3c+P4 CLOSED — 2026-04-22
```
And update the description to mention P3b+P3c+P4 closed (messaging pipeline operational).

**§3 Current State / Module 4 section (line ~108–117):** Update to reflect:
- P1–P3c+P4 closed
- Architecture v3: Make = send-only pipe, Edge Function `send-message` handles all logic
- Next: P5 (message content — templates, HTML emails)

**§4 Decisions Log (line ~293):** Update the Module 4 Go-Live summary to reflect
P3c+P4 closed, architecture v3 decision, and P5 as next.

### 2. Update `modules/Module 4 - CRM/docs/MODULE_MAP.md`

**Line 1–2:** Change "Last updated" to `2026-04-22 (Go-Live P3c+P4 — Messaging Pipeline)`.

**Line 44 (`crm-messaging-config.js`):** Change from:
```
| `crm-messaging-config.js` | 6 | **[P3b]** `window.CrmMessagingConfig.MAKE_SEND_WEBHOOK` — Make dispatcher webhook URL. Separate file keeps it trivial to locate/update when the webhook rotates. |
```
to:
```
| `crm-messaging-config.js` | 5 | **[P3b→P3c+P4]** Stub file. Since Architecture v3, the Make webhook URL lives in the `send-message` Edge Function as `MAKE_WEBHOOK_URL_DEFAULT` (env-overridable via `MAKE_SEND_MESSAGE_WEBHOOK_URL` Supabase secret). This file remains as a documentation pointer only. |
```

**Line 45 (`crm-messaging-send.js`):** Change from:
```
| `crm-messaging-send.js` | 52 | **[P3b]** `window.CrmMessaging.sendMessage({leadId, templateSlug, channel, variables, eventId?, language?})` — POSTs JSON payload to Make dispatcher scenario 9103817; returns `{ok, error?}`. Make appends `_{channel}_{language}` to the slug, fetches template, sends via Global SMS or Gmail, logs to `crm_message_log`. |
```
to:
```
| `crm-messaging-send.js` | 39 | **[P3b→P3c+P4]** `window.CrmMessaging.sendMessage({tenantId, leadId, channel, templateSlug?, body?, subject?, variables?, eventId?})` — calls the `send-message` Edge Function via `sb.functions.invoke()`. The Edge Function handles template fetch, variable substitution, log write, and Make webhook dispatch. Returns `{ok, data?, error?}`. |
```

**Line 56 (Edge Functions table — `lead-intake`):** Update lines from `241` to `342` and
add note about P3c+P4 dispatch wiring:
```
| `lead-intake` | `index.ts` + `deno.json` | 342 | P1, P3c+P4 | Public form intake: validate payload, resolve tenant by slug, normalize Israeli phones to E.164, duplicate-check (tenant_id, phone), INSERT `crm_leads` with `status='new'`. Returns 201 `{id, is_new: true}` on new, 409 `{duplicate, existing_name}` on dup, 400 on validation fail, 401 on unknown tenant. `verify_jwt: false` (public endpoint). Uses `SUPABASE_SERVICE_ROLE_KEY` server-side to bypass RLS. **[P3c+P4]** After lead insert/duplicate detection, dispatches SMS+Email via `send-message` Edge Function (`lead_intake_new` or `lead_intake_duplicate` templates). |
```

**Add new row after `lead-intake` for the `send-message` Edge Function:**
```
| `send-message` | `index.ts` + `deno.json` | 277 | P3c+P4 | Messaging pipeline core. Receives `{tenant_id, lead_id, channel, template_slug?, body?, variables?}`, fetches template from `crm_message_templates` (composing full slug = `{slug}_{channel}_{lang}`), substitutes `%variable%` placeholders, writes `crm_message_log` with status `pending`, calls Make webhook with ready-to-send payload `{channel, recipient_phone, recipient_email, subject, body}`, updates log to `sent` or `failed`. Supports raw broadcast (body without template). `verify_jwt: true`. |
```

### 3. Update `docs/GLOBAL_MAP.md`

Find the Edge Functions section and add `send-message` to the registry:
```
| `send-message` | Module 4 (CRM) | P3c+P4 | Messaging pipeline — template fetch, variable substitution, log write, Make webhook dispatch |
```

Also update the `lead-intake` entry if present to note the P3c+P4 dispatch wiring.

### 4. Add entry to `docs/TROUBLESHOOTING.md`

Add a new section for the cross-EF auth quirk:

```markdown
### Edge Function cross-function calls return 401

**Symptom:** One Edge Function calls another via `fetch()` with
`Authorization: Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` and gets HTTP 401.

**Root cause:** Inside Edge Functions, `Deno.env.get("SUPABASE_ANON_KEY")` returns
the newer `sb_publishable_*` key format. The Edge Function gateway's `verify_jwt`
only accepts JWT-format tokens, so it rejects the publishable key.

**Fix:** Use the legacy JWT anon key (same value as in `js/shared.js` line 3) for
cross-EF calls. Either read from a dedicated Supabase secret (`LEGACY_ANON_KEY`)
or hardcode as a constant (acceptable since it's already git-tracked).

**Pattern:**
\`\`\`typescript
const ANON_KEY = "eyJ..."; // legacy JWT anon key
const res = await fetch(`${SUPABASE_URL}/functions/v1/target-function`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${ANON_KEY}`,
    apikey: ANON_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});
\`\`\`

**Discovered:** P3c+P4 (2026-04-22), Finding M4-INFRA-01.
**Affected:** `supabase/functions/lead-intake/index.ts` → `send-message` call.
```

---

## Commit

Single commit:
```
docs(crm): fix P3c+P4 documentation drift — MASTER_ROADMAP, MODULE_MAP, GLOBAL_MAP, TROUBLESHOOTING
```

After commit, run `git status` to verify clean tree (for the files in this task).

---

## Budget

1 commit. No code changes. Read-then-edit only.
