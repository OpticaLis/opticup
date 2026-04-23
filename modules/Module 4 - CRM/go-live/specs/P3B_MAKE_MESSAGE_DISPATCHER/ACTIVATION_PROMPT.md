# Claude Code Activation — Commit Backlog + Execute P3b

> **Machine:** 🖥️ Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop

---

## Phase 1: Commit Pending Files (4 commits)

Files from Cowork sessions that need to be committed. Selective `git add` only.

| # | Files | Commit message |
|---|-------|---------------|
| 1 | `modules/Module 4 - CRM/go-live/specs/P3A_MANUAL_LEAD_ENTRY/FOREMAN_REVIEW.md` | `docs(spec): add Foreman Review for P3A_MANUAL_LEAD_ENTRY` |
| 2 | `.claude/skills/opticup-strategic/SKILL.md` | `docs(skill): add Cowork-to-Claude-Code handoff protocol to strategic skill` |
| 3 | `modules/Module 4 - CRM/go-live/specs/P3B_MAKE_MESSAGE_DISPATCHER/SPEC.md` + `modules/Module 4 - CRM/go-live/specs/P3B_MAKE_MESSAGE_DISPATCHER/ACTIVATION_PROMPT.md` | `docs(spec): author P3B_MAKE_MESSAGE_DISPATCHER SPEC` |
| 4 | `MASTER_ROADMAP.md` — update §3 Current State to "P3a CLOSED, P3b in progress" | `docs(roadmap): update M4 Go-Live to P3a CLOSED` |

**Important:** After these 4 commits, run `git status`. The working tree should be clean except for the files P3b will create. If any unexpected files remain, report them.

---

## Phase 2: Execute P3b SPEC

Load the `opticup-executor` skill and execute:

```
modules/Module 4 - CRM/go-live/specs/P3B_MAKE_MESSAGE_DISPATCHER/SPEC.md
```

### Key notes for this SPEC:

**1. This is a new paradigm — Make MCP tools.**
You have access to Make.com MCP tools for creating scenarios, webhooks, etc.
This is the first SPEC to use them. Key IDs:
- Team: `402680`
- Demo folder: `499779`
- Global SMS connection: `13198122`
- Gmail connection: `13196610`
- Reference scenario (Demo 1A-S): `9101245` — use `scenarios_get` to read its blueprint as a structural reference

**2. Webhook creation: use `gateway-webhook` type.**
```
hooks_create({ teamId: 402680, name: "Optic Up — Send Message", typeName: "gateway-webhook" })
```
The response includes the webhook URL.

**3. Blueprint structure — follow Demo 1A-S pattern.**
Use `scenarios_get(scenarioId=9101245)` to read the existing blueprint. It shows:
- `gateway:CustomWebHook` for trigger (reference the hook ID from step 2)
- `util:SetVariable2` for intermediate vars
- `http:ActionSendData` for Supabase REST calls (GET templates, POST logs)
- `global-sms:sendSmsToRecipients` for SMS (connection `__IMTCONN__: 13198122`)
- `google-email:sendAnEmail` for Email (connection `__IMTCONN__: 13196610`)
- `builtin:BasicRouter` for routing

**4. Service role key: use PLACEHOLDER only.**
Every HTTP module that hits Supabase must use:
```
Authorization: Bearer REPLACE_WITH_SERVICE_ROLE_KEY
```
Never use the real key. Daniel will replace it manually after the SPEC closes.

**5. Supabase anon key (public, safe to embed):**
Look it up from the existing client code — it is already exposed in `shared.js` / `index.html` where the Supabase client is initialized. Do not inline it in this SPEC (Rule 23: no tokens in docs, even public ones).

**6. Testing has a MANDATORY STOP.**
Tests 1–3 (webhook reachability, CRM helper, dry run) can run without the real key.
Tests 4–6 (actual SMS/Email sends) REQUIRE Daniel to set the real service_role key in Make.
After Test 3 passes → STOP and tell Daniel "I need you to open Make, edit the scenario, and replace REPLACE_WITH_SERVICE_ROLE_KEY with the actual Supabase service_role key. Then confirm."

**7. Template slug convention:**
The webhook receives a BASE slug (e.g., `lead_intake_new`). The Make scenario appends `_{channel}_{language}` to query the DB (e.g., `lead_intake_new_sms_he`). The `language` field defaults to `he` if not provided.

**8. Existing Demo 1A-S scenario: DO NOT modify or delete.**
It stays as a reference. The new scenario is a separate, clean replacement.

**9. The `.claude/skills/opticup-strategic/SKILL.md` file:**
This was modified by Cowork and will be committed in Phase 1 commit #2. If it appears as "modified" in your initial git status — that's expected, it's the Cowork edit.

**10. Documentation mandate — CRITICAL:**
This is the last task before a new Cowork chat takes over. EVERYTHING must be up to date:
- `SESSION_CONTEXT.md` — P3b CLOSED, "What's Next" points to P4
- `CHANGELOG.md` — P3b section with all commits
- `MODULE_MAP.md` — new files (crm-messaging-config.js, crm-messaging-send.js), new functions (CrmMessaging.sendMessage), updated file counts
- `MASTER_ROADMAP.md` §3 — "P3b CLOSED"
- `MASTER_ROADMAP.md` §2 — M4 status line updated
- Commit #4 from Phase 1 does the first MASTER_ROADMAP update; the final docs commit updates it again to CLOSED.

**End state:** Repo clean on develop, all 13 criteria pass, Make scenario active in Demo folder, EXECUTION_REPORT.md + FINDINGS.md written, ALL docs current. The next Cowork chat opening this repo should see zero stale information.
