# ACTIVATION PROMPT — P5_7_STOREFRONT_FORM_REWIRE

You are opticup-executor. Execute SPEC P5_7_STOREFRONT_FORM_REWIRE under Bounded Autonomy. **CUTOVER-BLOCKING — must close before 2026-05-03 morning.**

**SPEC:** `modules/Module 4 - CRM/go-live/specs/P5_7_STOREFRONT_FORM_REWIRE/SPEC.md`

**Cross-repo notice:** the bulk of code edits land in `opticalis/opticup-storefront`, not this ERP repo. SPEC author is in ERP repo per Authority Matrix.

**Hard preconditions (verify BEFORE starting):**
- `lead-intake` EF is at v16 or later (the version that requires email). Check with `mcp__claude_ai_Supabase__list_edge_functions`.
- The storefront `develop` branch is clean and synced with `main`.
- The ERP develop branch is clean.
- You have access to chrome-devtools MCP for manual UAT.
- Daniel is at his keyboard for Part F (production deploy + UAT).

**Pre-Flight Step 1 (mandatory before commit 1):**
Per SPEC §10 — locate the SuperSale form's source file, inspect implementation (LeadFormBlock vs shortcode vs custom), grep all `/api/leads/submit` callers, capture pre-state cms_leads row count, confirm EF v16 live. Log all in `EXECUTION_REPORT.md` §10.

**Critical guardrails:**
- This SPEC touches PRODUCTION storefront code. Every commit goes through Daniel before merge to main (PR + click-merge, NOT direct push to main per ERP repo's Iron Rule 9.7 — same convention applies in storefront).
- Part E (cms_leads decision): STOP and report to Daniel before making the choice. Default is "stop writing to cms_leads for SuperSale path", but Daniel decides.
- Part F1 (preview deploy) and F2 (production deploy): Daniel triggers, not you.
- Re-use `lead-form-validation.ts` from storefront commit `ee282af` — DO NOT duplicate the modal/validation code (Iron Rule 21).
- Iron Rule 22: defense-in-depth — both client-side AND server-side reject empty email.
- Iron Rule 31: integrity gate green at every commit.

**Test phones for QA (allowlisted by send-message + dispatch-queue):**
- `+972537889878` — Daniel primary (THIS is what real flows test against)
- `+972503348349` — Daniel secondary (use ONLY for cap-filler scenarios; not in this SPEC's flow tests)
- `+972507168471` — tertiary

**Email for QA:** `daniel@prizma-optic.co.il`

**QA discipline (per Daniel's 2026-04-29 directive):**
- DO NOT use the QA Node drivers (`qa-final-v*.mjs`, `qa-runner.mjs`, etc.) for verification. They bypass production paths.
- All UAT is browser-driven: Daniel submits the form himself; you verify via read-only DB queries + Make MCP exec checks.
- Per flow: confirm `crm_leads` row + `crm_automation_runs` row + `crm_message_log` rows + Make exec status=1 + Daniel's actual phone/inbox receipt.
- DO NOT clean up between flows. DO NOT patch `crm_leads.status` to fake state.

**Deliverables at close:**
- All success criteria pass (A1-A5, B1-B6, C1-C7, D1-D7, E1-E4, F1-F4, G1-G4).
- `EXECUTION_REPORT.md` with: §10 pre-flight log, per-commit summary, Daniel's UAT confirmations, Make execution evidence.
- `FINDINGS.md` if anything emerged.
- Single chat message back: `"P5_7_STOREFRONT_FORM_REWIRE closed. Awaiting Foreman review."`

Read SPEC.md in full + the storefront's CLAUDE.md + the ERP-side `lead-intake` EF code. The SPEC was authored 2026-04-29 immediately after the email-required EF patch shipped (commit `0f61da0`); that patch is the server-side complement to this SPEC's client-side change.
