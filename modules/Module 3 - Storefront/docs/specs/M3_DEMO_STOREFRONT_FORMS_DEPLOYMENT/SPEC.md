# SPEC — M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) under Full-Auto Pipeline mode
> **Authored on:** 2026-05-11
> **Module:** 3 — Storefront
> **Phase:** Phase 1 — Forms only (lead-capture flow)
> **Brief source:** `modules/Module 3 - Storefront/architecture-brief/M3_DEMO_STOREFRONT_FORMS_BRIEF.md` (v1, 2026-05-11)
> **Replaces:** the same-path STUB authored 2026-05-11 by opticup-executor under the predecessor SPEC `DEMO_HEALTH_CHECK_EVENT_LINK_FIX` (Path A2 closure).

> **Heading convention:** Integer-only section numbers. No `§` prefix, no decimals. Required by the `destructive-ops-declared` pre-commit hook regex (`scripts/checks/destructive-ops-declared.mjs`).

---

## 0. Pre-Authoring Reality Check

Required by `opticup-strategic` SKILL.md Step 0 and the open Author Proposal A1 from `M3_LIGHTHOUSE_NIGHTLY_CRON/FOREMAN_REVIEW.md` ("URL existence verification — probe at author time, don't delegate to executor").

### 0.1 Brief vs. repo reality

- Brief read in full on 2026-05-11.
- Stub SPEC at this path read in full on 2026-05-11; its §"Expected when full SPEC arrives" anticipated 7 deliverables — this SPEC covers all 7.
- Predecessor SPEC `modules/Module 4 - CRM/docs/specs/DEMO_HEALTH_CHECK_EVENT_LINK_FIX/` read end-to-end (SPEC + DIAGNOSIS + EXECUTION_REPORT + FOREMAN_REVIEW + escalation file). The Path-A2 decision authorizing "defer fix, build real demo storefront" is the launch authority for this SPEC.

### 0.2 Storefront repo audit (author-time pre-flight)

- Storefront repo on disk at `C:\Users\User\opticup-storefront\` (verified — sibling of opticup, `develop` branch active per CLAUDE.md §12).
- `opticup-storefront/CLAUDE.md §13` lists env vars authoritatively:
  - `PUBLIC_SUPABASE_URL`
  - `PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - **`PUBLIC_DEFAULT_TENANT`** ← tenant-slug variable name (NOT `PUBLIC_DEFAULT_TENANT_SLUG` as the Brief assumed)
- `opticup-storefront/astro.config.mjs` confirms `site: 'https://www.prizma-optic.co.il'` is hardcoded at build time. This means the demo build will have the same canonical site URL baked in — relevant for sitemap/canonical-tag SEO leakage, but **NOT for form-submission targeting** (forms POST to Edge Functions, not to the canonical site URL). **Out-of-scope per Brief §3** ("Mirror of Prizma's non-form pages" / "Different content for demo"). Phase 1 accepts the canonical-URL bleed; Phase 2+ can per-tenant the canonical URL.
- `opticup-storefront/src/pages/` ls (verified 2026-05-11):
  - `[...slug].astro` (CMS catch-all — serves `/supersale/`, `/quick-register/` thank-you pages, etc.)
  - `r/` (short-link resolver — `/r/[code]`)
  - `event-register/` (event registration form — primary lead-capture surface)
  - `quick-register/` (WhatsApp walk-in registration form)
  - `supersale-stock/` (supersale stock page)
  - `supersale-takanon/` (supersale terms-and-conditions)
  - `unsubscribe/` (one-click unsubscribe)
  - `404.astro` (error page on form-submission failure path)
  - `index.astro` + categories/brands/products/etc. (out-of-scope per Brief §3 — non-form pages)

### 0.3 Env-var-naming resolution → Escalation B downgraded

Brief §5 Escalation B anticipated "if the storefront repo's tenant detection uses a different env var name than `PUBLIC_DEFAULT_TENANT_SLUG`". Author-time discovery resolved this: the actual name is `PUBLIC_DEFAULT_TENANT`. **Escalation B is therefore RESOLVED-AT-AUTHOR-TIME** — the Executor uses `PUBLIC_DEFAULT_TENANT=demo` directly and does NOT escalate.

Only **Escalation A** (Vercel access) remains as a planned mid-pipeline pause.

### 0.4 Baselines

| Symbol | Source | Value (captured 2026-05-11) |
|---|---|---|
| `BASE_DEMO_STOREFRONT_URL` | Brief §1 + predecessor DIAGNOSIS.md | `https://demo.opticalis.co.il` (non-functional placeholder set 2026-03-29 by `M4_HARDCODED_PRIZMA_REMOVAL`) |
| `BASE_PRIZMA_STOREFRONT_URL` | predecessor DIAGNOSIS.md + author-time read of storefront `astro.config.mjs` | `https://prizma-optic.co.il` (functional, production-LIVE on Vercel since 2026-04-18) |
| `BASE_DEMO_TENANT_UUID` | Brief §10 + auto-memory | `8d8cfa7e-ef58-49af-9702-a862d459cccb` |
| `BASE_PRIZMA_TENANT_UUID` | predecessor DIAGNOSIS.md spot-check | (Executor captures pre-UPDATE via SQL — see §3 SC #11) |
| `BASE_STOREFRONT_BRANCH_PRIZMA` | storefront repo `git log origin/main..origin/develop --oneline` is non-empty per general project posture, but Prizma's Vercel auto-deploys from `main` | `main` (recommended default for demo to mirror Prizma exactly) |
| `BASE_PUBLIC_DEFAULT_TENANT_PRIZMA` | storefront CLAUDE.md §13 (`prizma`) | `prizma` |
| `BASE_PUBLIC_DEFAULT_TENANT_DEMO` | desired value (this SPEC's target) | `demo` |

### 0.5 Lessons already incorporated

See §12. Listed there: Author Proposals A1 + A2 from `M3_LIGHTHOUSE_NIGHTLY_CRON`, both Author Proposals from `M3_REC014_ORPHAN_CLEANUP`, both Author Proposals from `DEMO_HEALTH_CHECK_EVENT_LINK_FIX`, plus the §3a Shared Edit Block convention (marked N/A for this SPEC).

---

## 1. Goal

Provision a live demo storefront on a new Vercel project — same codebase as Prizma's production storefront, different `PUBLIC_DEFAULT_TENANT=demo` env var, same shared Supabase backend — and update demo's `tenants.ui_config.storefront_url` to the new live URL. Outcome: Daniel can run his manual pre-LIVE test cycle on demo without touching Prizma data, and CRM Migration #3 unblocks immediately after Daniel's cycle passes.

---

## 2. Background & Motivation

The 2026-05-03 Prizma cutover left demo without a working storefront — its `tenants.ui_config.storefront_url` points at the non-functional placeholder `https://demo.opticalis.co.il`. The predecessor SPEC `DEMO_HEALTH_CHECK_EVENT_LINK_FIX` diagnosed this as a missing-storefront issue (not a code bug) and the Architect chose Path A2: defer the patch, provision a real demo storefront. CRM Migration #3 is paused pending demo's manual test cycle, which itself is blocked on this storefront existing. This SPEC closes the loop.

**Already-done discovery contingency** (per Author Proposal A1 from `M3_REC014_ORPHAN_CLEANUP`): if any sub-step is found already-done at execution time (e.g., a previous half-finished attempt left a Vercel project named `opticup-storefront-demo`), the Executor reports the discovered state in EXECUTION_REPORT.md §3 Deviations and proceeds with whichever sub-steps remain. Skips are logged, not silently absorbed.

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. The Executor captures actual values in `EXECUTION_REPORT.md §2`.

| # | Criterion | Expected value | Verify command / method |
|---|---|---|---|
| 1 | Branch state | On `develop` (opticup repo), clean | `git status --porcelain` → empty |
| 2 | Commits produced on opticup repo | ≥ 3 commits (initial SPEC body replacement; closure with EXECUTION_REPORT+FINDINGS; FOREMAN_REVIEW + master-doc updates) | `git log origin/develop..HEAD --oneline \| wc -l` |
| 3 | Commits produced on opticup-storefront repo | **0** (read-only consumption) | Run on storefront repo: `git status; git log origin/develop..HEAD --oneline` → empty + 0 |
| 4 | New Vercel project exists | Project name `opticup-storefront-demo` (or Daniel-approved alternative from Escalation A response) | Vercel dashboard or `vercel projects ls` shows the project |
| 5 | Vercel project deploys successfully | Build green, exit 0 in Vercel deploy logs | Vercel dashboard build status = "Ready" |
| 6 | Vercel project env vars configured | `PUBLIC_DEFAULT_TENANT=demo` + same 3 Supabase vars as Prizma | Vercel dashboard env-vars list (manual verification reported in EXECUTION_REPORT §2) |
| 7 | Demo Vercel URL reachable | HTTP 200 on `<new-url>/` | `curl -s -o /dev/null -w "%{http_code}\n" <new-url>/` → `200` |
| 8 | Form-flow route 1 — short-link resolver scaffold loads | HTTP 200 (or 302 redirect) on `<new-url>/r/test` (404 OK if test code not in DB; ≥ 200 means route compiled) | `curl -s -o /dev/null -w "%{http_code}\n" <new-url>/r/test` → 200 \| 302 \| 404 (NOT 5xx) |
| 9 | Form-flow route 2 — event-register loads | HTTP 200 on `<new-url>/event-register/` (or HTTP 200 on an `event-register/[slug]/` once a test event is targeted) | `curl -s -o /dev/null -w "%{http_code}\n" <new-url>/event-register/` → 200 \| 404 (NOT 5xx) |
| 10 | Form-flow route 3 — quick-register loads | HTTP 200 on `<new-url>/quick-register/` | `curl -s -o /dev/null -w "%{http_code}\n" <new-url>/quick-register/` → `200` |
| 11 | Demo `tenants.ui_config.storefront_url` UPDATED | New Vercel URL value, `updated_at` advanced beyond pre-UPDATE timestamp | Supabase MCP `execute_sql`: `SELECT ui_config->>'storefront_url' AS url, updated_at FROM tenants WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';` — captured pre-UPDATE in EXECUTION_REPORT §2; post-UPDATE shows new URL |
| 12 | Prizma `tenants.ui_config.storefront_url` UNTOUCHED | Same value and same `updated_at` pre- and post-SPEC | Same query against Prizma's UUID (captured by executor from §0.4 BASE_PRIZMA_TENANT_UUID) — pre and post values bit-identical |
| 13 | Short-link resolver round-trip on demo | Insert one test `short_links` row scoped to demo → curl `<new-url>/r/<test-code>` → HTTP 302 redirect to a path on `<new-url>` (NOT to `prizma-optic.co.il`, NOT to `opticalis`) | Two-step: SQL INSERT then curl with `-I` and inspect `Location:` header |
| 14 | URL builder smoke (demo, inspection-only) | Logically replay `buildRegistrationUrl()` from `supabase/functions/send-message/url-builders.ts:93–104` against the post-UPDATE demo tenant config → produced URL contains `<new-url>` host, NOT `opticalis`, NOT `prizma-optic.co.il` | Either: (a) local replay (read `cfg = tenants.ui_config` for demo, follow the function logic, assert host); (b) SQL-only equivalent using `jsonb_extract_path_text(ui_config, 'storefront_url')` plus the path template; (c) ONLY if `send-message` EF supports `dry-run` or `simulate=true` payload, invoke with that flag and inspect rendered URL in response. Forbidden: any path that actually dispatches a message. |
| 15 | URL builder smoke (Prizma regression, inspection-only) | Same replay logic against Prizma's tenant config → produced URL contains `prizma-optic.co.il`, NOT `<new-url>`, NOT `opticalis` | Same method as #14 against Prizma's UUID |
| 16 | Cleanup of smoke test row | Test `short_links` row for demo deleted (or marked archived) after verification | SQL `DELETE` (single-row, tenant_id-scoped, demo-only) or `UPDATE` to mark archived — choice declared in EXECUTION_REPORT §4 Decisions |
| 17 | Integrity Gate (Iron Rule 31) | Exit 0 (no null-byte ERROR) on opticup repo | `npm run verify:integrity; echo $?` → `0` |
| 18 | Stub SPEC replaced with full body | This file (`SPEC.md`) is no longer a stub; SC #1 through #17 listed; `## Destructive Operations` section present | `grep -c "STUB ONLY" SPEC.md` → `0`; `grep -c "## Destructive Operations\|## 7. Destructive Operations" SPEC.md` → ≥ 1 |
| 19 | DECISIONS_LOG entry written | One new row in `MASTER_ROADMAP.md §4` dated 2026-05-11 referencing this SPEC's closure | `grep -c "M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT" MASTER_ROADMAP.md` → ≥ 1 |
| 20 | `OPEN_TASKS.md` updated | This task closed, next task = "resume CRM Migration #3 after Daniel's manual test cycle on demo" | `grep -A 2 "Demo Storefront Forms" OPEN_TASKS.md` shows closure note + CRM Migration #3 surfaced in Active |
| 21 | M3 SESSION_CONTEXT.md top-line updated | Top-of-file "Today" line mentions demo storefront live + new Vercel URL | `head -10 modules/Module\ 3\ -\ Storefront/docs/SESSION_CONTEXT.md` shows the new line |
| 22 | Pushed to `origin/develop` (opticup repo) | `git rev-parse origin/develop` equals `git rev-parse HEAD` | `git fetch && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/develop)" ]` → exit 0 |
| 23 | Working tree clean (opticup repo) at close | `git status --porcelain` empty | Same as SC #1 — repeated as exit gate |
| 24 | No commits on `main` (either repo) | `main` HEAD unchanged from session start on opticup + opticup-storefront | `git log origin/main..origin/develop --oneline` reflects only develop's growth |

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking

- Read any file in opticup or opticup-storefront repos (read-only on the storefront side).
- Read demo + Prizma `tenants` row via Supabase MCP `execute_sql` (Level 1 autonomy).
- Create/edit files inside `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/` (this folder).
- Create the Escalation A file inside `modules/Module 3 - Storefront/escalations/` and emit ONE Hebrew status line to Daniel.
- After Daniel's Escalation A response: create the Vercel project (via Vercel CLI with the token Daniel provides, OR record that Daniel created it manually), configure env vars, trigger deploy.
- Insert ONE test row into `short_links` (tenant_id = demo) for smoke verification, AND delete/archive it after (SC #16).
- Run the canonical UPDATE on demo's `tenants` row (declared in §7).
- Commit & push to `develop` on opticup repo.
- Apply executor-skill improvement proposals from recent FOREMAN_REVIEWs if directly applicable (see §12).

### What REQUIRES stopping and reporting (escalation OR halt)

- **Escalation A — Vercel access** (the ONLY planned escalation). Write `modules/Module 3 - Storefront/escalations/{ISO_TS}_vercel_access_request.md` listing: (a) suggested project name `opticup-storefront-demo`, (b) recommended branch `main` (mirrors Prizma's auto-deploy source), (c) the 4 env vars to configure with exact values, (d) the 2 response options Daniel can pick: `(a) CLI token + naming confirmation` or `(b) "I created the project at <url>"`. Emit ONE Hebrew line to Daniel. Halt cleanly. Resume on response.
- ANY UPDATE attempt on Prizma's `tenants` row (UUID lookup must always be filtered to the demo UUID).
- ANY DELETE on any table other than the single test `short_links` row scoped to demo.
- ANY schema change (DDL).
- ANY commit to `main` on either repo.
- ANY push to opticup-storefront (this SPEC is read-only against that repo).
- ANY live outbound message dispatch (SMS, email, WhatsApp) — even on demo. Verification stays in inspection mode per Brief §9.
- Vercel deploy failing with build error → STOP, capture build logs, escalate (do NOT improvise fixes that would require commits to opticup-storefront).
- Demo's `tenants.ui_config` shape unexpectedly different from the assumed `{storefront_url: "..."}` JSONB structure → STOP, capture actual shape, escalate (do NOT blindly overwrite an unfamiliar JSONB structure).
- Pre-UPDATE `tenants.updated_at` for Prizma changes between session start and SPEC close from a source unrelated to this SPEC → STOP, capture, escalate (someone else is editing Prizma mid-flight).
- Any actual value diverging from a §3 Success Criterion expected value.

### Already-done discovery branches (pre-authorized — do NOT ask, just report)

- If a Vercel project named `opticup-storefront-demo` already exists when the Executor reaches the provisioning step → report in EXECUTION_REPORT §3 Deviations, treat as "Daniel-created in advance" branch of Escalation A, skip creation but verify env vars + deploy status.
- If demo's `tenants.ui_config.storefront_url` is already the target Vercel URL (someone else applied the UPDATE) → SC #11 passes; record both `updated_at` snapshots; proceed to smoke verification.
- If the test `short_links` code chosen for SC #13 collides with an existing row → pick a different test code (suffix `-{ISO_TS}`), document in EXECUTION_REPORT §4 Decisions.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- **Prizma data mutation** — any sign the Executor's actions touched the Prizma `tenants` row (different `updated_at` post-SPEC, different `storefront_url` value, any policy-level write attempt that returned a non-zero rowcount for Prizma's UUID) → STOP, capture state, escalate immediately. This is the highest-priority trigger; everything else is recoverable.
- **Demo-side data over-write** — if the Executor accidentally writes a `storefront_url` value other than the new Vercel URL (e.g. typo, missing scheme) → STOP, do NOT issue a corrective UPDATE without escalating; report the deviation and let Daniel decide the correction path.
- **Vercel project assigned to wrong account/team** — if Daniel's response to Escalation A produces a project under an unexpected Vercel team/org → STOP, verify with Daniel before configuring env vars or deploying.
- **Storefront repo `develop` ahead of `main` by ≥1 commit at deploy time** — `BASE_STOREFRONT_BRANCH_PRIZMA = main` (Prizma's source). If the Executor or Daniel chooses `develop` for demo, the Executor reports the divergence ("demo will run code Prizma is not running"); not a halt, but flagged in EXECUTION_REPORT §3.
- **`send-message` Edge Function code path changed since 2026-05-11** — if the URL builder now reads from a config key other than `ui_config->>'storefront_url'`, the SPEC's smoke logic is stale. STOP and escalate.
- **Integrity Gate (Iron Rule 31) exit 1** at any point → STOP, do NOT push, do NOT commit further.

---

## 6. Rollback Plan

Rollback paths, in escalating destructiveness:

### Path 1 — Pre-UPDATE rollback (Vercel project created but DB not yet touched)

- Vercel: delete the new project from the Vercel dashboard (or leave it inactive with a "DRAFT — pending re-deploy" note). No code mutation to revert.
- opticup repo: `git reset --soft <session-start-commit>` (or `git revert <commit-hash>` per commit if already pushed) — discards SPEC artifacts but retains the file structure.
- DB: no changes to undo.

### Path 2 — Post-UPDATE rollback (DB updated, smoke failing)

- Issue the inverse UPDATE on demo only:
  ```sql
  UPDATE tenants
     SET ui_config = jsonb_set(ui_config, '{storefront_url}', to_jsonb('https://demo.opticalis.co.il'::text))
   WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
  ```
- Vercel project: same as Path 1 (delete or leave inactive).
- opticup repo: revert closure commit(s) but retain SPEC artifacts (FOREMAN_REVIEW marks the SPEC 🔴 REOPEN).
- Notify Foreman; new SPEC dispatched.

### Path 3 — Catastrophic rollback (Prizma touched by mistake)

- This must NOT happen — see §5 highest-priority trigger.
- If it does: STOP all activity. Capture exact `updated_at` and `ui_config` snapshots of Prizma. Escalate to Daniel for `point-in-time recovery` decision (Supabase PITR). Do NOT issue any corrective write without Daniel + Architect approval.

In all rollback paths: the Architect's DECISIONS_LOG entry is annotated, not deleted; this SPEC's FOREMAN_REVIEW captures the rollback path taken; CRM Migration #3 remains paused.

---

## 7. Destructive Operations

Required by Iron Rule 32. The `destructive-ops-declared` pre-commit hook scans this section's heading regex and the staged-commit content; any unauthorized destructive op blocks the commit.

**Declared destructive operations** (the only ones this SPEC authorizes):

1. **One single-row UPDATE on `tenants` table, scoped to demo only:**
   ```sql
   UPDATE tenants
      SET ui_config = jsonb_set(ui_config, '{storefront_url}', to_jsonb('<new-vercel-url>'::text))
    WHERE id = '8d8cfa7e-ef58-49af-9702-a862d459cccb';
   ```
   The `<new-vercel-url>` placeholder is filled with the Daniel-confirmed URL (Vercel default `https://opticup-storefront-demo.vercel.app/` unless Daniel provides an alternative via Escalation A). The WHERE clause MUST contain the demo UUID literal — never a variable, never a slug lookup, never a `LIKE` pattern.

2. **One single-row INSERT on `short_links` table (demo-scoped) for smoke verification (SC #13)**, followed by **one single-row DELETE or status-UPDATE on the same row (SC #16)** to clean up. Both operations include `tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'` in the WHERE/values clauses.

3. **External infrastructure creation (Vercel project)** — not a destructive op against the repo or DB, but flagged here for transparency. Reversible via Vercel dashboard delete (see §6 Path 1).

**Forbidden** (would halt the SPEC if attempted):

- Any UPDATE on Prizma's `tenants` row (or any tenant other than demo).
- Any DELETE on any table other than the single test `short_links` row scoped to demo.
- Any schema change (CREATE/ALTER/DROP TABLE/VIEW/POLICY/FUNCTION/TYPE).
- Any TRUNCATE.
- Any DML mass-delete (DELETE without a tenant_id-scoped WHERE clause).
- Any commit, merge, or push to `main` on either repo.
- Any push to `opticup-storefront` (this SPEC is read-only against the storefront repo).
- Any `git push --force`, `git reset --hard`, or `git rebase` against pushed history.
- Any live outbound message dispatch (the smoke path stays inspection-only).

---

## 8. Out of Scope (explicit)

Listed because they look related but must NOT be touched in this SPEC:

- **DNS / custom domain for demo.** Phase 1 uses Vercel-default `.vercel.app`. Custom domain = separate future Brief.
- **Mirror of Prizma's non-form pages** — blog, content pages, glossary, brand pages, optometry page, product catalog, brand-showcase, homepage hero/blocks. Phase 2+ if needed.
- **Different content for demo.** Demo's CMS rows (under demo `tenant_id`) stay as they are in Supabase. The deployed storefront reads whatever's there; an empty/stale demo CMS is its own follow-up, not this SPEC's concern.
- **Whitelisted SMS/Email config for demo testing.** Demo already has `tenants.test_mode_sms_allowlist` infrastructure (C-001). Daniel configures whitelist values separately.
- **Prizma changes of any kind** — Vercel project, `tenants` row, env vars, deploys, domain config. Hands off Prizma 100%.
- **CRM Migration #3.** Remains paused. Re-surfaces in `OPEN_TASKS.md` as the next-up Active task once this SPEC closes + Daniel's manual cycle passes.
- **`opticup-storefront` repo commits.** Read-only consumption. No code change to the storefront repo (no env reading code change, no `.env.example` edit, no scaffold).
- **Edge Function code changes.** Tenant isolation already handled in `lead-intake`, `event-register`, `quick-register`, `resolve-link`, `send-message`. Touching them = scope creep.
- **`MASTER_ROADMAP.md` §3 Current State** — this SPEC's outcome doesn't cross a module-phase boundary (Module 3 stays in POST-CUTOVER MAINTENANCE; demo storefront is a sibling environment, not a phase progression).
- **`docs/GLOBAL_MAP.md`, `docs/GLOBAL_SCHEMA.sql`** — no new functions, contracts, tables, or views.
- **`docs/FILE_STRUCTURE.md`, `docs/CONVENTIONS.md`** — no structural changes to opticup repo file tree.
- **Storefront mockups, design system, M9/M13 sketches** — orthogonal queues.
- **The `references/DECISIONS_LOG.md` governance question** (DECISIONS-LOC-01 from predecessor FOREMAN_REVIEW) — Architect-skill housekeeping, not this SPEC.

---

## 9. Expected Final State

### New files (opticup repo, inside this SPEC folder)

- `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md` (this file — replaces the stub at the same path; committed in commit 1)
- `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/DIAGNOSIS.md` (executor pre-flight log: env-var grep, page-route audit, pre-UPDATE state captures; committed at closure)
- `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/EXECUTION_REPORT.md` (executor retrospective; committed at closure)
- `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FINDINGS.md` (executor findings; committed at closure — write `# No findings.` placeholder if zero findings, do NOT omit the file)
- `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/TEST_REPORT.md` (smoke + regression results; committed at closure)
- `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/FOREMAN_REVIEW.md` (Foreman review, written after Executor closes; committed in a separate retro commit at the very end)
- `modules/Module 3 - Storefront/escalations/{ISO_TS}_vercel_access_request.md` (Escalation A file, written and committed when the Executor reaches the Vercel provisioning step; remains in tree as historical record)

### Modified files (opticup repo)

- `MASTER_ROADMAP.md` — one new row appended to §4 Decisions Log dated 2026-05-11 mentioning this SPEC's closure + Path-A2 follow-up resolved.
- `OPEN_TASKS.md` — close the "Demo Storefront Forms" task; surface "Resume CRM Migration #3 + Daniel's manual test cycle" as the next Active task.
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — top-of-file "Last updated" line bumped to 2026-05-11; one-line addition under "Current production state" naming the new demo Vercel URL.
- (Optional, only if executor identifies a pattern worth recording) `docs/TROUBLESHOOTING.md` — `## Known Issues` entry only if the smoke surfaced a non-trivial gotcha; otherwise omit.

### Deleted files

- None.

### DB state (Supabase, single shared project)

- Demo tenant (`8d8cfa7e-ef58-49af-9702-a862d459cccb`): `ui_config.storefront_url` = the new Vercel URL.
- Prizma tenant: `ui_config.storefront_url` unchanged from pre-SPEC value (bit-identical, `updated_at` unchanged).
- `short_links` table: zero new rows attributable to this SPEC (the smoke test row is cleaned up by SC #16).

### Infrastructure state (external — Vercel)

- New Vercel project (default name `opticup-storefront-demo`, or Daniel-approved alternative).
- Project's git source = `opticalis/opticup-storefront`, branch = `main` (or Daniel-confirmed alternative).
- Project env vars include:
  - `PUBLIC_DEFAULT_TENANT=demo`
  - `PUBLIC_SUPABASE_URL=https://tsxrrxzmdxaenlvocyit.supabase.co`
  - `PUBLIC_SUPABASE_ANON_KEY=<same as Prizma>`
  - `SUPABASE_SERVICE_ROLE_KEY=<same as Prizma>`
- Build green, root `/` HTTP 200, form-flow routes HTTP 200 (or 404 for unbound test codes — never 5xx).

### Docs updated (master-doc checklist)

| Doc | Update needed? | Reason |
|---|---|---|
| `MASTER_ROADMAP.md` §3 Current State | NO | Module 3 stays in POST-CUTOVER MAINTENANCE; no phase boundary. |
| `MASTER_ROADMAP.md` §4 Decisions Log | **YES** | New row 2026-05-11 — Path-A2 follow-up SPEC closed. |
| `docs/GLOBAL_MAP.md` | NO | No new functions / contracts. |
| `docs/GLOBAL_SCHEMA.sql` | NO | No schema changes. |
| `docs/DB_TABLES_REFERENCE.md` | NO | No new tables/columns. |
| `docs/FILE_STRUCTURE.md` | NO | No structural changes to opticup repo (escalations/ folder under M3 already established by `M1_5_FULL_AUTO_PIPELINE`). |
| M3 `SESSION_CONTEXT.md` | **YES** | Top-line bump + demo URL note. |
| M3 `CHANGELOG.md` | NO | Not a phase boundary; SPEC-level retrospectives live in the SPEC folder. |
| M3 `MODULE_MAP.md` | NO | No new files/functions. |
| `OPEN_TASKS.md` | **YES** | Close this task, surface CRM Migration #3 next. |
| `roles/.../HANDOFF.md` | NO | Not a role-specific deliverable. |

---

## 10. Commit Plan

Commits land sequentially on `develop` (opticup repo only). Each commit is single-concern; pre-commit hooks run on every commit (Iron Rule 31 + Iron Rule 32).

| # | Stage | Message pattern | Files |
|---|---|---|---|
| 1 | Pre-execution | `docs(spec): replace M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT stub with full SPEC body` | `modules/Module 3 - Storefront/docs/specs/M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT/SPEC.md` (this file) |
| 2 | Pre-flight | `chore(spec): M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT — pre-flight diagnosis + env-var audit` | `DIAGNOSIS.md` (env-var grep, route audit, pre-UPDATE DB snapshots) |
| 3 | Escalation A | `docs(escalation): M3 Vercel access request for demo storefront` | `modules/Module 3 - Storefront/escalations/{ISO_TS}_vercel_access_request.md` |
| 4 | Post-escalation (after Daniel's response is parsed) | `chore(spec): M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT — record Daniel decision <option a / option b> on Vercel access` | append a section to `DIAGNOSIS.md` capturing Daniel's response verbatim |
| 5 | DB UPDATE + smoke | `feat(m3): demo storefront live — update tenants.ui_config.storefront_url for demo` | (no file changes — DB-only commit message; the SQL is captured in `EXECUTION_REPORT.md §2 actual values` table) Plus the SC #11 + #13 + #14 + #15 + #16 evidence captured in `TEST_REPORT.md` and committed in the same commit. |
| 6 | Closure | `chore(spec): close M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT — Phase 1 demo storefront live` | `EXECUTION_REPORT.md`, `FINDINGS.md`, `TEST_REPORT.md` |
| 7 | Master-doc + retro | `docs(roadmap+open-tasks): M3 demo storefront live; CRM Migration #3 next` | `MASTER_ROADMAP.md` §4 row, `OPEN_TASKS.md` updates, M3 `SESSION_CONTEXT.md` top-line, `FOREMAN_REVIEW.md` |

If the Executor diverges (e.g., commit 3 split into two because of branch-source clarification within Escalation A) → document in EXECUTION_REPORT §3 Deviations; the divergence is acceptable so long as the final tree matches §9.

The Path-A2 commit pattern from `DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FOREMAN_REVIEW.md` Author Proposal #2 is honored here: each outcome branch of the escalation has a pre-templated commit message (option a vs option b in commit 4).

---

## 11. Dependencies / Preconditions

- Predecessor SPEC `DEMO_HEALTH_CHECK_EVENT_LINK_FIX` is CLOSED 🟡 (verified — see its FOREMAN_REVIEW.md).
- Supabase MCP `execute_sql` is available (Level 1 autonomy for SELECT, Level 2 for the demo-only UPDATE per CLAUDE.md SQL autonomy).
- Daniel is reachable to respond to Escalation A within the same conversation.
- Vercel account access (the Escalation A topic).
- `opticup-storefront` repo on disk at the sibling path — the Executor reads it but does not push to it.
- `npm run verify:integrity` passes at session start (Iron Rule 31 — CLAUDE.md §1 step 4a; if not, halt and repair before this SPEC begins).
- Working tree clean at session start, or pre-existing dirty files resolved per CLAUDE.md §1 step 4.

---

## 12. Lessons Already Incorporated

Every applicable proposal from prior `FOREMAN_REVIEW.md` files in this module and adjacent. Each line is a memo to future-me that the rule was considered.

- FROM `DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FOREMAN_REVIEW.md` Author Proposal #1 → "SPEC headings must use integer numbering; the `destructive-ops-declared` hook rejects `## 6.5.` and `§N.` prefixes" → **APPLIED** in §7 (`## 7. Destructive Operations` is integer-only) and in the SPEC's heading convention preamble.
- FROM `DEMO_HEALTH_CHECK_EVENT_LINK_FIX/FOREMAN_REVIEW.md` Author Proposal #2 → "Diagnostic SPECs with built-in escalation need pre-templated commit-message variants per outcome branch" → **APPLIED** in §10 commit 4 (Daniel decision option a / option b).
- FROM `M3_LIGHTHOUSE_NIGHTLY_CRON/FOREMAN_REVIEW.md` Author Proposal A1 → "URL existence verification at author time when SPEC names specific URLs" → **APPLIED** in §0.2 (storefront pages directory ls'd; the route names in §3 SC #8-10 reflect what's actually on disk, not Brief-assumed paths).
- FROM `M3_LIGHTHOUSE_NIGHTLY_CRON/FOREMAN_REVIEW.md` Author Proposal A2 → "Numeric thresholds in §4/§5 require Step-0 baseline measurement" → **NOT APPLICABLE** (this SPEC has no numeric thresholds; the only numbers are HTTP status codes and rowcounts, both deterministic).
- FROM `M3_REC014_ORPHAN_CLEANUP/FOREMAN_REVIEW.md` Author Proposal A1 → "Already-done discovery contingency for cleanup items" → **APPLIED** in §2 + §4 (pre-authorized already-done branches for Vercel project + storefront_url value + short_links code collision).
- FROM `M3_REC014_ORPHAN_CLEANUP/FOREMAN_REVIEW.md` Author Proposal A2 → "Backup format guidance for DB-DELETE SPECs" → **NOT APPLICABLE** (this SPEC's only DELETE is the single smoke `short_links` row; no heavy payload, no backup needed beyond the EXECUTION_REPORT capture).
- FROM `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 (now applied to SPEC_TEMPLATE as the heading-convention preamble) → **APPLIED** (no `§` prefixes, no decimal sections).
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #1 (§3a Shared Edit Block) → **NOT APPLICABLE** (this SPEC has no multi-file identical edits; the §3a section is omitted per its declared sameness contract).
- FROM `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 (§0 Baselines sub-table) → **APPLIED** in §0.4 (6 BASE_* symbols pinned).

Cross-reference sweep (Rule 21 — Step 1.5 of opticup-strategic SKILL): no new DB objects, no new RPCs, no new T-constants, no new FIELD_MAP entries, no new files outside this SPEC folder + standard SPEC-deliverable paths. The single env var `PUBLIC_DEFAULT_TENANT` is pre-existing in storefront `CLAUDE.md §13` — no collision.

**Cross-Reference Check completed 2026-05-11 against `docs/GLOBAL_SCHEMA.sql` + `docs/GLOBAL_MAP.md` + storefront `CLAUDE.md §13`: 0 collisions, 1 pre-existing-name confirmed (`PUBLIC_DEFAULT_TENANT`).**

---

## 13. Pre-Merge Checklist (gate before SPEC is marked CLOSED)

- [ ] All 24 §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md §2`.
- [ ] `npm run verify:integrity` returns exit 0 (no null-byte ERROR).
- [ ] `git status --porcelain` empty on opticup repo.
- [ ] `git status --porcelain` empty on opticup-storefront repo (no accidental edits).
- [ ] Demo `tenants.ui_config.storefront_url` UPDATED to the new Vercel URL (single-row, demo-only).
- [ ] Prizma `tenants.ui_config.storefront_url` and `updated_at` bit-identical pre and post (regression-zero).
- [ ] Vercel project deployed green, root + form routes HTTP 200/302/404 (never 5xx).
- [ ] Smoke test row in `short_links` cleaned up.
- [ ] `EXECUTION_REPORT.md`, `FINDINGS.md`, `TEST_REPORT.md` written and committed.
- [ ] Escalation A file written and committed.
- [ ] HEAD pushed to `origin/develop`.
- [ ] `FOREMAN_REVIEW.md` written and committed (last commit).
- [ ] Master-doc updates landed: `MASTER_ROADMAP.md §4`, `OPEN_TASKS.md`, M3 `SESSION_CONTEXT.md`.
- [ ] Final Hebrew status line emitted to Daniel matching the closure template in §14.

If any item fails → SPEC is REOPEN, not CLOSED.

---

## 14. Daniel-Facing Status Lines (Hebrew, one per phase)

The Executor emits ONE Hebrew status line at each phase boundary. No technical detail — just where we are and what's next.

| Phase | Hebrew line template |
|---|---|
| Pre-flight done | `✅ פריצ'ק הושלם — מבנה הטפסים אומת מול הריפו של ה-storefront. ממשיך להכנת הסקלציה ל-Vercel.` |
| Escalation A emitted | `⏸ צריך גישה ל-Vercel — שלחתי קובץ סקלציה ב-`modules/Module 3 - Storefront/escalations/`. בחר: (א) טוקן CLI לחשבון Vercel שלך, או (ב) צור פרויקט בשם `opticup-storefront-demo` ידנית וכתוב לי את ה-URL.` |
| Vercel project live | `✅ פרויקט Vercel חדש פעיל. ה-URL נגיש. ממשיך לחבר את ה-DB.` |
| DB UPDATE applied | `✅ DB עודכן — דמו מצביע ל-URL החדש. Prizma ללא שינוי. ממשיך לסמוק.` |
| Smoke complete | `✅ סמוק 7/7 ירוק. דמו עובד, Prizma ללא רגרסיה. ממשיך לכתוב את ה-EXECUTION_REPORT.` |
| Closure | `✅ Demo Storefront Forms CLOSED 🟢 — דמו מחובר ל-Vercel חדש. טפסי לידים פעילים על דומיין מבודד. URL חדש ב-tenants. Prizma ללא רגרסיה. הבא: סבב הטסטים הידני של דניאל, ואז המשך CRM Migration #3.` |

If any phase ends with deviation → the line is `⚠️ סטייה ב-<phase> — עוצר. ראה <file>.` instead, and the Executor halts cleanly.

---

*End of SPEC. Ready for dispatch to opticup-executor.*
