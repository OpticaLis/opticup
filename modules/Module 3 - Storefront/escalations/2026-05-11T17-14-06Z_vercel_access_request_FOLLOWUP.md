# Escalation A — Follow-up: MCP path is non-viable, need to reselect

> **SPEC:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md`
> **Companion to:** `2026-05-11T17-14-06Z_vercel_access_request.md` (the original escalation)
> **Emitted by:** opticup-executor
> **Emitted on:** 2026-05-11 17:24 UTC
> **Status:** pipeline still paused — Daniel needs to choose again

---

## What Daniel asked for

Use the existing Vercel MCP connection (`mcp__claude_ai_Vercel__*` tools) to:
1. Call `list_teams` + `list_projects` to identify the account
2. Call `get_project` on Prizma's project, read its env vars, mirror them with `PUBLIC_DEFAULT_TENANT=demo` override
3. Call `deploy_to_vercel` (or similar) to create a new project for demo

> "לא צריך טוקן ידני. כל מה שנדרש זמין דרך ה-MCP."

---

## What the Executor verified

### Read-only inspection — succeeded

```
list_teams → team_4pZvxSwlV0sJeAnzb7RYxBL2 "Daniel's projects" (only team)
list_projects → 1 project: opticup-storefront (id prj_HGz6OkwugkH6Nlw3FiomNPDp96QH, astro, owns prizma-optic.co.il + 3 Vercel subdomains)
get_project   → project metadata + domains. NO env vars in response. NO git-source info beyond auto-deploy domain hint.
```

### Capability gap — what the MCP does NOT expose

| Operation needed | MCP tool available? | Evidence |
|---|---|---|
| Create a new Vercel project | ❌ NO | No `create_project`, `add_project`, `new_project`, or similar in the loaded MCP surface |
| Read Prizma's env vars to copy | ❌ NO | `get_project` response contains: `id`, `name`, `framework`, `accountId`, timestamps, `live`, `latestDeployment`, `domains` — no `env` array. (Likely an Iron-Rule-23-equivalent decision by Vercel — env vars are not readable through the MCP.) |
| Set env vars on a project | ❌ NO | No `update_project`, `add_env_var`, `set_env`, or similar |
| Link a git repo to a new project | ❌ NO | No repo-linking primitive |
| Configure branch source | ❌ NO | Tied to repo-linking; not available |
| Deploy "the current project" via `deploy_to_vercel` | ⚠️ DANGEROUS | The tool operates on the local `.vercel/project.json`. In the storefront repo, that file is: `{"projectId":"prj_HGz6OkwugkH6Nlw3FiomNPDp96QH","orgId":"team_4pZvxSwlV0sJeAnzb7RYxBL2","projectName":"opticup-storefront"}` — i.e., **Prizma's production project**. Running `deploy_to_vercel` there would push a new deployment to Prizma's production — §5 highest-priority stop trigger forbids any action that touches Prizma. |

### Conclusion

Daniel's assumption — "the MCP can read env vars from Prizma and create a sibling project" — does not match the actual MCP surface. The Executor cannot proceed via MCP without:
- Inventing API endpoints (NO)
- Calling `deploy_to_vercel` against the Prizma-linked storefront repo (NO — §5 stop trigger)
- Touching Prizma in any other way (NO — Brief §4 locked decision #7)

---

## What's still on the table

The original Option A (CLI token) and Option B (manual dashboard creation) from `2026-05-11T17-14-06Z_vercel_access_request.md` remain viable. Pick one — or propose Option C.

### Option A — CLI token (recommended)

```
Option: A
Vercel-token: <paste-token-here>
Vercel-team-or-account: daniels-projects-186cc357
Project-name: opticup-storefront-demo
Branch: main
```

Notes for this team's context:
- Team slug confirmed: `daniels-projects-186cc357` (team_id `team_4pZvxSwlV0sJeAnzb7RYxBL2`)
- Project-scoped token preferred for least-privilege: create the project shell in the dashboard first (just name + git import for `opticalis/opticup-storefront`), then generate a token scoped to JUST that new project, then paste the token + project URL
- Alternatively, full-account token works too; the Executor uses it only for the create/env/deploy operations and discards it at session close (Iron Rule 23: no token committed to git)
- With Option A the Executor can also read Prizma's env-var **values** from Vercel CLI (`vercel env ls`) to mirror them — solving the env-var-value gap

### Option B — You create the project, I wire it

```
Option: B
Project-url: https://<your-chosen-subdomain>.vercel.app
Branch: main
Env-vars-status: "I configured them already"   <-- recommended
```

Steps:
1. Vercel Dashboard → Add New → Project → Import `opticalis/opticup-storefront`
2. Name: `opticup-storefront-demo` (or your choice)
3. Branch: `main`
4. Set the 4 env vars (copy Supabase keys from Prizma's project, override `PUBLIC_DEFAULT_TENANT` to `demo`)
5. Deploy → wait green → paste back the URL above

This is the simplest path if you don't want to generate a token.

### Option C — Something else

Propose any alternative. Reminder of constraints:
- Cannot touch Prizma's `opticup-storefront` Vercel project (deploys, env vars, domains, branch)
- Cannot push to `opticalis/opticup-storefront` git repo (read-only consumption)
- Cannot dispatch any live outbound message (smoke stays inspection-only)
- Cannot merge anything to `main` on either repo

If you have a path that respects those — propose it.

---

## Sentence to Daniel (Hebrew)

> ⚠️ ה-MCP של Vercel לא יכול ליצור פרויקט חדש או לקרוא/לכתוב env vars — רק list/get/deploy. ו-`deploy_to_vercel` בריפו של ה-storefront יעדכן את הפרויקט של פריזמה (אסור). בחר בין Option A (טוקן CLI) ל-Option B (יצירה ידנית), או הצע Option C. ראה `modules/Module 3 - Storefront/escalations/2026-05-11T17-14-06Z_vercel_access_request_FOLLOWUP.md`.

---

*Pipeline still paused. The three commits already on develop (`05260f8`, `4fd03b8`, `93a0ead`) remain valid. This follow-up adds a 4th read-only commit. Working tree stays clean. No external mutation occurred.*
