# Escalation A — Vercel Access Request for Demo Storefront

> **SPEC:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md`
> **Emitted by:** opticup-executor (Full-Auto Pipeline, mid-execution)
> **Emitted on:** 2026-05-11 17:14 UTC
> **Halt point:** pipeline pauses cleanly at the Vercel provisioning step in §4 Autonomy Envelope. Resumes when Daniel pastes back a response matching one of the option templates below.
> **Architect Brief reference:** `modules/Module 3 - Storefront/architecture-brief/M3_DEMO_STOREFRONT_FORMS_BRIEF.md §5 Escalation A`

---

## Why this halt is needed

The pipeline cannot create a Vercel project under Daniel's Vercel account without one of:

- A **Vercel CLI token** scoped to Daniel's account (gives the Executor the ability to run `vercel projects add` + `vercel env add` + `vercel deploy` non-interactively), OR
- A **manually-created project URL** (Daniel creates the project in the Vercel dashboard, pastes back the live `.vercel.app` URL, and the Executor proceeds to env-var verification + DB UPDATE + smoke).

Both paths land at the same point — a new Vercel project named `opticup-storefront-demo` (or Daniel's alternative), deployed from `opticalis/opticup-storefront`, configured with `PUBLIC_DEFAULT_TENANT=demo` and the same 3 Supabase env vars as Prizma. The remaining SPEC steps (DB UPDATE, smoke, regression, closure) run automatically after this halt resolves.

This is the **only planned halt** in this SPEC's pipeline. Brief-§5 Escalation B (env-var naming) was resolved at SPEC-author time — `DIAGNOSIS.md §2.3`.

---

## Daniel — choose ONE option

Paste back the response template that matches your choice. The Executor parses for `Option: A` or `Option: B` (case-sensitive) on its own line.

### Option A — CLI token (Executor creates the project)

```
Option: A
Vercel-token: <paste-token-here>
Vercel-team-or-account: <team-slug-or-personal>
Project-name: opticup-storefront-demo   <-- or override
Branch: main                            <-- or override (develop is the staging-parity alternative)
```

Notes:
- Generate a token at https://vercel.com/account/tokens (scope: full account access OR project-scoped if you create the project shell first).
- The Executor will revoke or store the token only inside the running session — it will NOT commit the token to git (Iron Rule 23).
- If you want a project-scoped token: create the project shell first via the dashboard (just the name + repo connection, leave env vars blank), then generate a project-scoped token, then paste both.

### Option B — Manual creation (you create, Executor wires)

```
Option: B
Project-url: https://<your-chosen-subdomain>.vercel.app
Branch: main                            <-- or whatever you picked
Env-vars-status: <one of: "I configured them already" | "Please tell me what to set">
```

Steps for Option B if you choose it:
1. Vercel Dashboard → New Project → Import `opticalis/opticup-storefront`
2. Project name: `opticup-storefront-demo` (or your choice)
3. Branch source: `main` (or `develop` for staging-parity)
4. Environment Variables — set these 4 (values for the 2 secret keys are the same as Prizma's project; copy them from there):

| Name | Value |
|---|---|
| `PUBLIC_DEFAULT_TENANT` | `demo` |
| `PUBLIC_SUPABASE_URL` | `https://tsxrrxzmdxaenlvocyit.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | *(same value as Prizma's project — copy from there)* |
| `SUPABASE_SERVICE_ROLE_KEY` | *(same value as Prizma's project — copy from there)* |

5. Deploy. Wait for green build.
6. Paste back the response template above with the live URL.

If you want the Executor to give you the env-var values from somewhere safe instead — that's not possible in this pipeline (Iron Rule 23 — no secrets in chat or files). You copy them from Prizma's Vercel project yourself.

---

## What happens after your response

| Your response | Executor's next action |
|---|---|
| Option A + valid token | Create project via CLI, configure env vars, trigger deploy, wait for green, proceed to DB UPDATE phase |
| Option A + invalid/expired token | Halt again, escalate "token failed validation" |
| Option B + live URL reachable | Verify env vars match expected (curl + dashboard inspection), proceed to DB UPDATE phase |
| Option B + URL unreachable | Halt again, escalate "URL not resolving — check deploy status" |
| Anything else | Halt, escalate with the actual response captured verbatim |

The DB UPDATE will use the value you confirm in Option A's `Project-name` (resolved to `https://<project-name>.vercel.app`) or Option B's `Project-url` verbatim. The Executor does NOT improvise a URL.

---

## Reminder of forbidden actions (envelope is strict)

The Executor will refuse to:
- Touch Prizma's `tenants` row or Prizma's Vercel project — any sign of this would be a §5 highest-priority stop trigger.
- Push or commit anything to `opticup-storefront` — read-only consumption only.
- Trigger any live outbound message during smoke.
- Merge anything to `main` on either repo.

---

## Sentence to Daniel (Hebrew, status line)

> ⏸ צריך גישה ל-Vercel — שלחתי קובץ סקלציה ב-`modules/Module 3 - Storefront/escalations/2026-05-11T17-14-06Z_vercel_access_request.md`. בחר: (א) טוקן CLI לחשבון Vercel שלך, או (ב) צור פרויקט בשם `opticup-storefront-demo` ידנית וכתוב לי את ה-URL.

---

*Pipeline paused. Resume by pasting an `Option: A` or `Option: B` block into the chat.*
