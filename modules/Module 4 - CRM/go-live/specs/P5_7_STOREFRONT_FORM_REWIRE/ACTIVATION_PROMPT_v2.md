# ACTIVATION PROMPT v2 — P5_7_STOREFRONT_FORM_REWIRE

> **Paste this entire block into a fresh Claude Code session. Load the `opticup-executor` skill first.**
> **Reporting language: ENGLISH to Daniel.**
> **CUTOVER-BLOCKING — must close before 2026-05-04 morning. Acceptable to land Sunday morning if necessary.**
> **Pre-cutover order:** This is the THIRD of 3. Pre-requisites: C-001 + M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 1 must already be live and verified.

---

## Why v2 (changes vs ACTIVATION_PROMPT.md)

This v2 supersedes `ACTIVATION_PROMPT.md` (the v1, dated 2026-04-29) for any execution from 2026-05-03 onward. v1 stays in the folder as historical record. Substantive changes:

1. **Reporting language is ENGLISH** to Daniel (v1 was silent — defaulted to executor's habit, which has historically been Hebrew). Daniel adopted English-language Foreman/executor reporting in the 2026-05-03 morning operating-rules update.
2. **QA tenant is `prizma`** UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`. NOT demo. v1 was implicit — now explicit.
3. **Test phones restricted to TWO** — `0537889878` (Daniel primary) + `0503348349` (Daniel secondary). The v1 prompt listed `0507168471` as a third — that phone IS still in the pre-cutover `tenants.test_mode_sms_allowlist` (so technically allowed by the EF gate) but operating-rules now restrict live test sends to Daniel's two personal lines only. This is a defensive narrowing.
4. **Cross-repo discipline reaffirmed:** code edits land in `opticalis/opticup-storefront`, but every DB / EF / `crm_message_log` / `crm_automation_runs` verification runs from this ERP repo's perspective using the Supabase MCP.
5. **Pre-requisite check added:** verify C-001 + M4 Rung 1 have shipped before starting. If either is missing, P5_7 cannot validate end-to-end.
6. **§10 SPEC pre-flight elevated to first-class executor step** — v1 mentioned it; v2 makes it a hard gate.

---

## YOUR MANDATE

You are the Executor for Optic Up. Load `opticup-executor` (which loads `opticup-guardian` automatically). Then execute SPEC P5_7_STOREFRONT_FORM_REWIRE under Bounded Autonomy.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P5_7_STOREFRONT_FORM_REWIRE/SPEC.md` (226 lines, authored 2026-04-29 by opticup-strategic — well-formed Foreman work, no fresh review needed).

**Cross-repo notice:** the bulk of code edits land in `opticalis/opticup-storefront`. SPEC + retrospective stay in this ERP repo per Authority Matrix.

### Pre-flight (mandatory, before any change)

1. **Session-start protocol from CLAUDE.md §1** — confirm machine, verify branch is `develop` in BOTH repos (this ERP + the storefront sibling), pull latest in both, two-phase Cowork sync gate, clean-repo check, **integrity gate `npm run verify:integrity`** in this ERP repo (exit 0 mandatory). Storefront's safety-net scripts run later per its own CLAUDE.md.
2. **Load Iron Rules 1–23 + 31** in this repo. Rules 24–30 ALSO apply when working inside the storefront repo (per cross-repo section in CLAUDE.md §6).
3. **Confirm C-001 has shipped:**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_schema='public' AND table_name='tenants' AND column_name='test_mode_sms_allowlist';
   -- Expected: 1 row. If 0 → STOP, C-001 has not shipped yet.
   ```
   AND verify both `send-message` and `dispatch-queue` EFs are at the C-001 version (their `index.ts` no longer contains a hardcoded `ALLOWED_PHONES` constant).
4. **Confirm M4_AUTOMATION_ENGINE_SERVER_SIDE Rung 1 has shipped:**
   - `[functions.automation-engine]` block in `supabase/config.toml`.
   - `automation-engine` EF deployed (`mcp__claude_ai_Supabase__list_edge_functions` → entry exists).
   - Both `event_day_status_flip` (rewritten) and `event_2_3d_before_status_flip` (new) cron jobs exist:
     ```sql
     SELECT jobname, schedule FROM cron.job
     WHERE jobname IN ('event_day_status_flip','event_2_3d_before_status_flip');
     -- Expected: 2 rows.
     ```
   - If either C-001 or M4 Rung 1 is missing → STOP. P5_7 can run code-edits but its end-to-end Part C verification requires both predecessors.
5. **Confirm `lead-intake` EF is at v16 or later** (the version that requires email):
   ```
   mcp__claude_ai_Supabase__list_edge_functions → entry for 'lead-intake' with version >= 16
   ```
6. **Tenant scope for any post-deploy verification = `prizma`** UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`. NOT demo. Storefront preview deploys may run on a Vercel preview branch; the TEST DATA used must still target prizma's tenant_slug.
7. **Phone allowlist for any SMS-triggering test:** ONLY `0537889878` and `0503348349`. NEVER any other number. Note: pre-cutover, the EF gate (C-001) still allows `0507168471` because it's in the pre-populated `tenants.test_mode_sms_allowlist` — but operating-rules forbid live tests to that number. If a test would reach any other phone, abort.
8. **Email for QA:** `daniel@prizma-optic.co.il` (Daniel's verified inbox).
9. **Selective `git add` only** in BOTH repos. Pre-existing intentional WIP must not be touched. List the WIP at session start; ask Daniel before touching anything outside the SPEC scope.
10. **Read these files end-to-end before writing any code:**
    - `modules/Module 4 - CRM/go-live/specs/P5_7_STOREFRONT_FORM_REWIRE/SPEC.md` — full 226 lines.
    - `modules/Module 4 - CRM/go-live/specs/P5_7_STOREFRONT_FORM_REWIRE/ACTIVATION_PROMPT.md` — v1, for historical context only.
    - `supabase/functions/lead-intake/index.ts` — full (the EF contract is the storefront's target).
    - `supabase/functions/lead-intake/dispatch.ts` — has the legacy anon JWT inlined (line 18) — reuse the same constant in the storefront, do NOT introduce a new key.
    - `opticup-storefront/CLAUDE.md` — its rules 24–30 govern your work in that repo.
    - The storefront's existing `lead-form-validation.ts` (commit `ee282af` per SPEC §3 B6) — REUSE; DO NOT duplicate.

### Step 1 — SPEC §10 Pre-Flight (hard gate before any code change)

Per SPEC §10:
1. Locate the SuperSale form's source file in `opticup-storefront/src/`. Likely a CMS-driven page using `LeadFormBlock` OR a custom page under `src/pages/supersale-*`. Document the exact file path.
2. Inspect implementation: `LeadFormBlock` (CMS data) vs lead-form shortcode vs custom (component edit).
3. Grep all `/api/leads/submit` callers:
   ```
   grep -rn "/api/leads/submit" opticup-storefront/src/
   ```
   List every caller. Confirm SuperSale is the only one being repointed in this SPEC.
4. Capture pre-state legacy table count:
   ```sql
   SELECT COUNT(*) FROM cms_leads WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c';
   ```
5. Confirm `lead-intake` EF is live and at v16+ (Step 5 above already does this).

Log all findings in `EXECUTION_REPORT.md` §10. **Do not write any storefront code until §10 is complete.**

### Step 2 — Decision points (STOP and report to Daniel)

Before writing code, surface these decisions to Daniel and wait for answers (one question at a time per Pattern 19):

1. **Part E1 — `cms_leads` write path:** stop writing to `cms_leads` for the SuperSale path (default, recommended) OR write-to-both (NOT recommended because dup-check across tables is impossible). Daniel chooses.
2. **Part D3 — email canonicalization:** lowercase emails at the EF level OR store as-typed. Recommendation: lowercase. Daniel decides.

### Step 3 — Code edits (storefront repo)

Per SPEC Parts A + B. Surgical edits inside `opticup-storefront/`:
- Rewire the SuperSale form's submit handler to POST to `${SUPABASE_URL}/functions/v1/lead-intake`.
- Body shape per A2 / A4 / A5.
- Authorization header carries the legacy-format anon JWT (same constant inlined in this repo's `dispatch.ts:18` and `js/shared.js`). DO NOT use the new `sb_publishable_*` key format — the EF gateway rejects it.
- Reuse `lead-form-validation.ts` from storefront commit `ee282af` for client-side validation + branded modal (B6). DO NOT duplicate.
- Preserve everything else in the form.

After every storefront file edit: re-run the storefront repo's safety-net scripts per its CLAUDE.md.

### Step 4 — ERP repo edits (small)

Per SPEC §9 commit 4:
- Update `docs/GLOBAL_MAP.md` with a "Lead intake" contract entry pointing at the EF (G2).
- Update `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` to record P5_7 close (G2).
- Run `npm run verify:integrity` in this repo (G3). Exit 0.

### Step 5 — Preview deploy + UAT (Daniel-triggered)

Per SPEC Part F:
- F1: Deploy storefront to a Vercel preview branch. Daniel submits 1 test from the preview URL using ONLY phone `0537889878` + email `daniel@prizma-optic.co.il`. Verify per Part C (C1–C7).
- **STOP** before F2. Daniel triggers production deploy.
- F2: After Daniel's go, storefront main branch deploys. Daniel submits 1 test from prizma-optic.co.il production using same phone + email. Verify per Part C again.

### Step 6 — End-to-end verification (READ-ONLY DB + Make MCP)

Per SPEC Parts C + D + E:
- Use Supabase MCP for DB queries (read-only).
- Use Make MCP (`mcp__claude_ai_Make__executions_list` + `executions_get-detail`) for execution-log verification on each test send.
- DO NOT use the QA Node drivers (`qa-final-v*.mjs`, `qa-runner.mjs`, etc.) — they bypass production paths and produce false-positive verdicts (per Daniel's 2026-04-29 directive).
- DO NOT clean up between flows. DO NOT patch `crm_leads.status` to fake state.
- For each test flow, confirm: `crm_leads` row + `crm_automation_runs` row + `crm_message_log` rows + Make exec status=1 + Daniel's actual phone/inbox receipt.

### Step 7 — Edge cases (Part D)

Run D1–D7 per SPEC. D1 (duplicate) and D7 (network failure) require active tests. D2 / D5 / D6 verify storage shape. D3 + D4 are settled in Step 2 decisions.

### Step 8 — Production monitoring (24h post-rewire, F3)

After F2 ships, monitor Vercel logs for the storefront's `/api/leads/submit` endpoint. Expected hit count over 24h: **0**. If non-zero → there's still an unmigrated form somewhere; document and file follow-up SPEC.

### Step 9 — Rollback (F4) — Daniel triggers

Per SPEC §6: `git revert <commit_hash>` of the storefront form-rewire commit + push to main. Vercel auto-redeploys (~2–3 min). EF and DB stay in place (lead-intake v16 still callable; rows already in `crm_leads` are real customer leads, leave them).

### Step 10 — Retrospective (MANDATORY, ERP repo)

Both files at `modules/Module 4 - CRM/go-live/specs/P5_7_STOREFRONT_FORM_REWIRE/`:

1. **`EXECUTION_REPORT.md`** — required sections + per SPEC §10 must include:
   - Full §10 pre-flight log (file paths, grep results, pre-state counts).
   - Per-commit summary across BOTH repos (commit hashes from storefront + commit hashes from ERP).
   - Daniel's UAT confirmations from F1 + F2 (timestamp, phone receipt, inbox receipt).
   - Make execution evidence (execution IDs + status=1).
   - The Part E1 + Part D3 decisions Daniel made, with reasoning.
   - The cms_leads pre-state count vs post-cutover-window count.
   - F3 24-hour monitoring result.

2. **`FINDINGS.md`** — anything that emerged.

### Step 11 — Report to Daniel (English, brief, per Pattern 19)

Single chat message back: `"P5_7_STOREFRONT_FORM_REWIRE closed. <one-line status>. Awaiting Foreman review."`

If a question is needed, ONE question at a time.

### Stop-on-deviation triggers (non-negotiable)

In addition to CLAUDE.md §9 globals + SPEC §5 globals:
- C-001 or M4 Rung 1 not yet shipped (pre-flight Step 3/4 fail) → STOP.
- The form's POST URL change accidentally also impacts non-SuperSale forms → STOP, evaluate each separately per SPEC §5.
- A test submission produces 0 `crm_message_log` rows but EF returned 201 → STOP, dispatchFreshLead failed silently.
- Daniel's test SMS/email doesn't arrive within 60 seconds → STOP.
- An SMS test would have hit a phone other than `0537889878` or `0503348349` → STOP.
- Any storefront safety-net script fails → STOP per its CLAUDE.md.
- Integrity gate exit ≠ 0 in this ERP repo → STOP.
- A null-byte ERROR (exit 1) from the integrity gate at any point → STOP and escalate.

### Out of scope (per SPEC §7)

- Phone normalization improvements (P5_5_PHONE_EMAIL_HARDENING).
- WhatsApp channel as fallback (post-cutover).
- Migrating historical `cms_leads` rows from before SuperSale (Daniel decides at execution; default is "leave as historical").
- Other forms on the storefront (contact, brand-page, notify-me) — continue using `/api/leads/submit` until follow-up SPEC.
- Email allowlist (separate post-cutover SPEC).

---

*End of Rung activation prompt v2. v1 lives alongside as historical record.*
