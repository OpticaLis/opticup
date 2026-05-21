# Optic Up — Claude Code Project Guide

> **This file is a MAP, not a manual.** It contains rules and navigation.
> Detailed content lives in the reference files listed in Section 12.
> Keep this file under 400 lines. If it grows — extract to a reference file.

---

## 0.5 Root Discipline Rule (added 2026-05-09)

**Every file or directory at repo root MUST belong to one of these 3 categories. No exceptions.**

**Category 1 — Technical Infrastructure (no choice, required by tooling):**
- `CLAUDE.md`, `README.md`, `package.json`, `package-lock.json`, `.gitignore`, `.mcp.json`, `.nojekyll`, `CNAME`, `favicon.ico`
- Hidden infra dirs: `.git/`, `.github/`, `.husky/`, `.vscode/`, `.claude/`, `node_modules/`

**Category 2 — Live Sources of Truth (actively maintained, referenced by current sessions):**
- `MASTER_ROADMAP.md` — cross-module roadmap + decisions log
- `OPEN_TASKS.md` — current open work across all roles (read FIRST in every session — answers "what's open?" / "מה פתוח?")
- `TECH_DEBT.md` — living debt register
- `docs/` — canonical reference files (GLOBAL_MAP, GLOBAL_SCHEMA, FILE_STRUCTURE, CONVENTIONS, etc.)
- `modules/` — per-module documentation + per-feature implementation (per the **One Home Per Module** rule, every module — Brief / SPECs / Code / Production — lives here regardless of life stage; established by `MODULES_HOME_UNIFICATION` SPEC, 2026-05-09)
- `roles/` — operational role artifacts (Campaign Overseer, Site Overseer, etc.). Roles are NOT modules; each subfolder is one role with its own handoff + decisions log + learnings.
- `_archive/` — single archive vault (see also: §10 archival policy)
- `migrations/`, `scripts/`, `shared/`, `js/`, `css/`, `supabase/`, `tests/` — code/infra dirs
- `campaigns/` — Campaign Overseer working area
- `watcher-deploy/` — Watcher service installer (Windows desktop only)

**Category 3 — Application Entrypoints (required for GitHub Pages routing):**
- `index.html` (mandatory at root)
- 17 other ERP HTML pages (`admin.html`, `crm.html`, `inventory.html`, `settings.html`, `shipments.html`, `employees.html`, `error.html`, `landing.html`, `r.html`, `storefront-*.html`, `suppliers-debt.html`)

**Anything not in Categories 1-3 → must move to `_archive/<subfolder>/`.** This includes legacy onboarding docs, old prompts, completed phase summaries, single-session handoffs, project-genesis snapshots.

**When adding a new file at root, ask: "Which category?"** If none → it doesn't belong at root.

**Maintaining the rule:** Every Module Close Ceremony (per `opticup-architect` skill) must include a 30-second root scan. Anything new not in Categories 1-3 → archive immediately.

**Enforcement (added 2026-05-09 by `STRUCTURE_PROTECTIONS` SPEC):**

This rule is enforced at three independent layers — culture turned into infrastructure:

- **Pre-commit prevention:** `scripts/checks/check-root-discipline.mjs` runs as part of `verify.mjs --staged`. Adding a non-allowlisted root file blocks the commit (exit 1); a new root directory produces a warning (exit 2). Wired via husky.
- **Daily detection:** Sentinel **Mission 10 — Structure Discipline (משמר המבנה)** audits root + `architecture-brief/` presence in in-design modules + single-archive integrity + `roles/` integrity + Module Close Ceremony backlog. Violations surface in `docs/guardian/GUARDIAN_ALERTS.md`.
- **Session-start reminder:** `opticup-architect` skill bootstrap (Step 4.5) checks `references/DECISIONS_LOG.md` for sealed-Brief modules with no recorded close ceremony, and flags backlog in the bootstrap ack line.
- **Allowlist:** `scripts/checks/root-allowlist.json` (data-driven; update **here** in §0.5 + **there** in the JSON whenever this rule changes — both must stay in sync).

This rule prevents drift forever after.

---

## 1. First Action — Session Start Protocol

When starting a new Claude Code session, do these steps in order. No exceptions.

1. **Identify machine & repo:** Ask "Which of the three machines? 🖥️ Windows desktop, 🖥️ Windows laptop, or 🍎 Mac?" (see §9 Multi-Machine for paths) and confirm the working directory matches the task. Run `git remote -v` to verify you are in `opticalis/opticup` (ERP) vs `opticalis/opticup-storefront`. If the remote does not match the task — STOP and tell the user.
2. **Verify branch:** `git branch` — must be on `develop`. If not: `git checkout develop`.
3. **Pull latest:** `git pull origin develop`.

**3a. Cowork-VM sync gate — TWO-PHASE (survey before destroy):**

**Phase 1 (ALWAYS, every session, Cowork OR Claude Code):** survey untracked paths first.
```
git status --porcelain | grep '^??' > /tmp/untracked-before-sync.txt
cat /tmp/untracked-before-sync.txt
```
If any untracked files exist — STOP and ask the user before continuing: "I see these untracked files [list]. Are they real work I should preserve, or safe to discard?" Only after the user answers, proceed to Phase 2.

**Phase 2 (Cowork VM only — skipped on Claude Code Windows/Mac unless user explicitly asks):** if the VM mount is stale (ghost unmerged files with binary-character names, `.git/REBASE_HEAD` pointing at an old commit, phantom modifications), run:
```
git fetch origin
git reset --hard origin/develop
rm -f .git/REBASE_HEAD .git/MERGE_HEAD .git/CHERRY_PICK_HEAD .git/BISECT_LOG .git/index.lock
# git clean -fd — ONLY after user has confirmed the untracked paths from Phase 1 are discardable
```

**Phase 2.5 (Cowork VM only — ghost-lock + FUSE-stale detection):**

After the Phase 1 untracked survey, run these probes BEFORE attempting any
git write op (commit, checkout, reset, rebase, push):

1. **Ghost-lock test:** `stat .git/index.lock` shows the file but `rm` or
   `cat` fail with "No such file or directory" → ghost file in FUSE mount.
   Cowork VM cannot self-recover. STOP.
2. **FUSE-stale test:** if `git status --porcelain | wc -l` returns
   significantly more than expected (e.g., >100 modified files when no
   active SPEC has touched that many), the FUSE mount is showing a stale
   snapshot. Compare on the desktop via `git status` — if desktop sees
   clean tree and Cowork sees N modifications, those N are FUSE phantoms.

In either case: Cowork VM cannot safely run destructive git ops. Escalate
to a Claude Code session on the desktop (the FUSE-source machine) with an
ACTIVATION_PROMPT. Cowork = read + plan + author SPECs; desktop = execute.
Never blur the line. (Lesson installed by `REPO_CLEANUP_2026_05_18` SPEC,
2026-05-17 — empirically confirmed: Cowork classified 2,340 phantom
modifications; desktop saw 6.)

**ABSOLUTE RULE:** `git clean -fd` NEVER runs without user confirmation first, in any environment. The "Cowork sessions never have uncommitted work" assumption is wrong — Cowork sessions frequently receive new files from the user mid-session (prompts, content files, manual drops), and those arrive as untracked.

**Why this is the rule:** on 2026-04-24 a user-provided prompt instructed Claude Code to run the sync gate including `git clean -fd`. There were 2 untracked real-work paths on disk (new message-content files in `campaigns/supersale/MESSAGES UPDATES/` + a FOREMAN_REVIEW.md from the just-closed SPEC). `git clean -fd` deleted both. The fix is not "better prompts" — the fix is that the protocol itself must survey untracked paths before destroying them, regardless of what a prompt says. User prompts cannot override survey-first.

Rationale for Phase 2 existing at all: on 2026-04-24 (earlier) a fresh Cowork session opened and saw 1,092 phantom modifications + REBASE_HEAD pointing at a commit 185 commits behind HEAD; the VM had been rotting from a week-old incomplete rebase. Silent sync prevents the Foreman from confabulating recovery SPECs for phantom problems. But the sync must preserve real untracked work.
4. **Clean repo check:** run `git status`. After step 3a on a Cowork session the repo MUST be clean. On Claude Code (Windows/Mac), if there are uncommitted changes, deleted files, or untracked files that are NOT part of the current task:
   - Report them to the user with a one-line summary of each file/group.
   - Ask once: "I see pre-existing uncommitted changes in these files. Options: (a) stash them with `git stash` and restore after the task, (b) leave them alone and use selective `git add` by filename for this task, (c) they are intentional work-in-progress — just note them and continue with selective add. Which?"
   - Wait for the user's choice, then proceed. Do NOT ask about them again later in the session.
   - If the repo is clean — continue without saying anything.
4a. **Integrity gate (Rule 31):** run `npm run verify:integrity`. Exit 0 = clean; exit 2 = warnings only (continue, log to session notes if surprising); exit 1 = null-byte corruption detected — STOP and investigate before touching any file. Never bypass.
5. **Read this file** (CLAUDE.md) — rules, navigation, conventions.
6. **Read the target module's SESSION_CONTEXT.md** — path pattern:
   `modules/Module X - [Name]/docs/SESSION_CONTEXT.md`
   Active modules with SESSION_CONTEXT: Module 1 (Inventory), Module 1.5 (Shared Components), Module 2 (Platform Admin), Module 3 (Storefront). **For Module 3 specifically:** read BOTH `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` (this repo, ERP-side, authoritative for Module 3 phase status) AND `[sibling repo]/opticup-storefront/SESSION_CONTEXT.md` (storefront working state). If they disagree on phase status, this repo wins per §7 Authority Matrix. Flag drift to Daniel before proceeding. Phase letters (A/B/C/D) may appear ONLY in the ERP-side file — never in the storefront file.
7. **Read `docs/GLOBAL_MAP.md`** — shared functions, contracts, module registry (reference only — do NOT modify outside Integration Ceremony).
8. **Read `docs/guardian/GUARDIAN_ALERTS.md`** — the Sentinel's active alerts. If there are CRITICAL or HIGH alerts that relate to the files you will work on — report them to Daniel before starting. If "ALL CLEAR" — continue.

**Do NOT read at session start:** MODULE_MAP.md, GLOBAL_SCHEMA.sql, FILE_STRUCTURE.md, DB_TABLES_REFERENCE.md, CONVENTIONS.md. These are reference files — open only when needed for the specific task.

After reading, confirm in one block:
> "Repo: opticalis/opticup. Branch: develop. Machine: [🖥️/🍎]. Repo status: [clean / dirty-handled]. Module: [X]. Current status: [one line from SESSION_CONTEXT]. Ready."

---

## 2. Project Identity

- **Name:** Optic Up — multi-tenant SaaS for optical stores
- **First tenant:** אופטיקה פריזמה (Prizma Optics) — production
- **Test tenant:** אופטיקה דמו (demo) — all QA runs here, never on prizma
- **Repos:**
  - `opticalis/opticup` — ERP (this repo)
  - `opticalis/opticup-storefront` — public-facing site (separate repo, separate CLAUDE.md)
- **Supabase:** https://tsxrrxzmdxaenlvocyit.supabase.co
- **ERP Deploy:** GitHub Pages → https://app.opticalis.co.il/

## 3. Architecture — One Picture

```
┌──────────────────────┐         ┌──────────────────────┐
│   Optic Up ERP       │         │  Optic Up Storefront │
│   (internal, staff)  │         │  (public site)       │
└──────────┬───────────┘         └──────────┬───────────┘
           │                                │
           └────────► Supabase ◄────────────┘
                    (tenant_id + RLS)
```

- **ERP** = Vanilla JS, HTML per module, no build step. This repo.
- **Storefront** = Astro + TypeScript + Tailwind. Separate repo. Reads ONLY from Views + RPC.
- **Every table** = `tenant_id UUID NOT NULL` + RLS policy. No exceptions.

---

## 4. Iron Rules — Core Discipline (Rules 1–13)

These are hard rules. Breaking one is a bug, regardless of whether it "works."

1. **Quantity changes** — only via ➕➖ buttons with PIN verification. Atomic Supabase RPC (`quantity = quantity + x`), never read→compute→write.
2. **writeLog()** — called for every quantity/price change. Async, non-blocking.
3. **Deletion** — soft delete only (`is_deleted` flag). Permanent delete requires double PIN.
4. **Barcodes** — format `BBDDDDD` (2-digit branch + 5-digit sequence). Do NOT change barcode logic.
5. **FIELD_MAP** — every new DB field must be added to `FIELD_MAP` in `shared.js`.
6. **index.html** — stays in repo root. Never moved.
7. **API Abstraction** — all DB interactions pass through `shared.js` helpers (`fetchAll`, `batchCreate`, `batchUpdate`, etc.). Never call `sb.from()` directly except for specialized joins impossible through helpers.
8. **Security & Sanitization** — never `innerHTML` with user input. Use `escapeHtml()` or `textContent`. PIN verification uses the `pin-auth` Edge Function (server-side JWT). Do not refactor PIN verification without explicit instruction.
9. **No hardcoded business values** — tenant name, address, tax rate, logo, phone, VAT, currency — always read from config/DB. Never a string literal in code.
10. **Global name collision check** — before creating/moving/renaming any global function or variable: `grep -rn "functionName" --include="*.js" --include="*.html" .` If any other file defines the same name — resolve the collision BEFORE writing code. Report findings, wait for instructions.
11. **Sequential number generation** — every auto-generated sequential number (PO, return, document, box, shipment, etc.) MUST use an atomic Supabase RPC with `FOR UPDATE` lock. Client-side `SELECT MAX → +1 → INSERT` is FORBIDDEN. Reference patterns: `next_box_number`, `next_po_number`, `next_return_number`.
12. **File size** — target max 300 lines per file. Absolute max 350. Split only where there is a clear logical separation — never arbitrarily by line count. One responsibility per file.
13. **Views-only for external reads** — Storefront and Supplier Portal read ONLY from Views + RPC. Never direct table access. Views' WHERE clauses for filtering must not be modified without explicit approval.

## 5. SaaS Rules — Multi-Tenant Discipline (Rules 14–20)

14. **tenant_id on every table** — every new table MUST have `tenant_id UUID NOT NULL REFERENCES tenants(id)`. No exceptions, ever.
15. **RLS on every table** — every new table MUST have Row Level Security enabled with tenant isolation:
    ```sql
    CREATE POLICY tenant_isolation ON [table_name]
      USING (tenant_id = current_setting('app.tenant_id')::uuid);
    ```

    #### Canonical RLS Pattern (Reference Implementation)

    The reference implementation for tenant-isolated RLS policies in
    Optic Up uses JWT claims, not `auth.uid()`. The canonical pattern
    lives in `pending_sales` table policies and was verified against
    the live DB on 2026-04-11. Every new RLS policy in the project
    must use this exact `USING` clause for tenant isolation:

    ```sql
    tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
    ```

    **Why this pattern (and not `auth.uid()`):** Optic Up uses PIN-based
    authentication via the `pin-auth` Edge Function, which mints JWTs
    with `tenant_id` as a claim. The `auth.uid()` Postgres function
    returns the Supabase Auth user ID — which is NULL or wrong for
    Optic Up's tenant context. Using `auth.uid()` in a tenant_id slot
    silently breaks multi-tenant isolation.

    **The canonical two-policy pattern:** Every multi-tenant table uses
    TWO RLS policies together: (1) a `service_bypass` policy applied to
    `service_role` (which is trusted and bypasses RLS by design), and
    (2) a `tenant_isolation` policy applied to `public` that uses the
    JWT-claim USING clause above. The reference implementation is the
    policy pair on `pending_sales`. Copy both, not just one. Note that
    `service_bypass` here is the policy name, not a column name.

    **For fixing existing broken policies:** copy the USING clause
    above verbatim. Do not invent variations. Do not parameterize.
    The clause is the policy. Any deviation from this pattern in a
    policy is a finding for the next DB audit.

16. **Contracts between modules** — every phase defines its public functions (contracts) in `MODULE_SPEC.md`. Other modules call ONLY these — never reach into another module's tables directly.
17. **Views for external access** — every phase asks: "What does a supplier/customer/storefront need to see?" and plans Views accordingly.
18. **UNIQUE constraints must include tenant_id** — every UNIQUE constraint must be tenant-scoped. Example: `UNIQUE (barcode, tenant_id)` not `UNIQUE (barcode)`. A global UNIQUE prevents multi-tenant coexistence.
19. **Configurable values = tables, not enums** — currencies, languages, payment types, document types = configurable tables. Not hardcoded enums.
20. **SaaS litmus test** — build every phase as if tomorrow a second optical chain joins that we've never met, in a different country. If they can use the phase with zero code changes → it was built right.

## 6. Hygiene Rules — Project Sanity (Rules 21+)

21. **No Orphans, No Duplicates.** Before creating any new file, function, table, column, RPC, config, or migration: search if something similar already exists. Use `grep -rn` for code, check GLOBAL_MAP.md for functions, check GLOBAL_SCHEMA.sql for DB objects, check FILE_STRUCTURE.md for files. If a similar thing exists:
    - **Extend it** instead of creating a new one, OR
    - **Replace it** — and in the same commit, DELETE the old one.
    Never leave two things that do the same job. Orphaned code becomes the source of future bugs.
22. **Defense-in-depth on writes** — every `.insert()` / `.upsert()` must include `tenant_id: getTenantId()`. Every `.select()` should also filter `.eq('tenant_id', getTenantId())` even though RLS enforces it. Belt AND suspenders.
23. **No secrets in code or docs** — passwords, API keys, PINs, tokens live in env files, Supabase secrets, or tenant config. Never in `.js`, `.md`, or git history. If you find one while editing — flag it, do not "just leave it there."

31. **Integrity gate before every stage.** Before any `git add`, `git commit`, or session end, run `npm run verify:integrity`. The gate scans git-tracked + git-modified files (sourced from `git status --porcelain` + `git ls-files`, never a raw filesystem walk — this avoids autocrlf false positives) for two corruption classes: (a) null bytes embedded **anywhere** in source files (offset 0, mid-content, or EOF — Cowork-VM-style padding); (b) mid-statement truncation (file ends with incomplete token, no trailing newline, unbalanced braces at EOF). A failed gate BLOCKS the stage; never bypass with `--no-verify`. If the gate fails at session start, STOP and investigate before touching anything. The null-byte detection is regression-tested by `npm run test:integrity-gate` (4 cases: EOF, mid-content, offset 0, clean file — added 2026-04-27 per PERMISSIONS_HOTFIX_NULL_BYTES SPEC §3 #6). This rule is in force because on 2026-04-24 the first run of the gate across HEAD caught 2 real null-byte corruption events (CLAUDE.md: 49 NULs, M3 SESSION_CONTEXT: 913 NULs) that had survived multiple prior commits undetected, AND because prior real incidents (e.g. 286 null bytes in crm.html on 2026-04-21, documented in auto-memory `feedback_cowork_truncation.md`) did reach staged commits before being caught manually. CRLF is NOT checked — `core.autocrlf` on each developer machine handles line endings; adding a CRLF check would produce false positives on Windows without .gitattributes, and .gitattributes is deferred to a post-merge SPEC. (Note: rules 24–30 are storefront-repo-scoped per the section below; this numbering keeps the ERP rule block contiguous from 31 onward.)

### Iron Rule 32 — Destructive Operations Gate

Every SPEC.md MUST declare a `## Destructive Operations` (or `## 4. Destructive Operations`) section listing — as a numbered list — every destructive operation it intends to perform. "Destructive" means anything that cannot be reversed by a one-line revert of the next commit:

- File deletes (`git rm`, `rm`, `Remove-Item`)
- Mass file renames (≥ 5 files in one commit)
- `git rebase`, `git reset --hard`, `git push --force`
- SQL `DROP TABLE`, `DROP COLUMN`, `DROP POLICY`, `TRUNCATE`, `ALTER TABLE ... DROP`
- DML mass-delete (`DELETE FROM <table>` without a tenant_id-scoped `WHERE`)
- Edits that delete a section of CLAUDE.md, a SKILL.md, or any other governance file (not append-only)
- Modification of `main` branch via merge, push, or rebase

If the SPEC declares `None.` it implicitly forbids ALL the operations above for that SPEC's run. If the Executor encounters a need for one mid-run → STOP, write an escalation file (`modules/Module N/escalations/{ISO_TS}_{SLUG}.md`), emit ONE Hebrew line to Daniel, halt the pipeline. Do NOT silently amend §Destructive Operations mid-run.

**Enforcement:** `scripts/checks/destructive-ops-declared.mjs` runs in pre-commit (via `scripts/verify.mjs --staged`) and in CI (`--full`). It verifies:
1. Every SPEC.md inside `modules/*/docs/specs/*/` contains a well-formed `## Destructive Operations` (or `## 4. Destructive Operations`) section.
2. Every commit that touches the staged tree is scanned for destructive patterns; if a pattern fires and the SPEC's declared list does not authorize it → exit 1, block commit.

**Non-overridable.** Same regime as Rule 31: never bypass with `--no-verify`. Bypass requires Daniel's explicit go-ahead in the chat, never a flag.

**Rationale:** SPECs run end-to-end under Full-Auto Pipeline mode (see `modules/Module 1.5 - Shared Components/docs/specs/M1_5_FULL_AUTO_PIPELINE/SPEC.md`). Once human-in-the-loop is removed from each commit, the cost of a silent destructive op rises sharply. The gate is the only thing standing between an autonomous chain and an irreversible deletion.

### Iron Rule 33 — M4 config changes must flow demo-first

Any change to `crm_message_templates`, `crm_automation_rules`, `crm_statuses`, `crm_field_visibility`, `crm_tags` MUST be applied to demo first, tested on demo, then promoted to Prizma via `scripts/promote-config-to-prizma.mjs`. Direct edits to Prizma's M4 config tables are FORBIDDEN. Bypass requires Daniel's explicit go-ahead in chat — never a flag.

**Enforcement:**
- **Pre-emptive (daily):** Sentinel Mission 11 (`docs/guardian/sentinel/mission-11-config-parity.md`) audits demo vs Prizma config-row counts + sample-hash drift; alerts in `docs/guardian/GUARDIAN_ALERTS.md` when Prizma has rows not in demo or shared slugs have body-hash mismatch, with a 24h grace window for legitimate mid-SPEC divergence.
- **Per-SPEC reminder:** Any SPEC touching M4 config must declare the demo-first sequence in its §3 Steps. Reviewer enforces.
- **Tooling:** `scripts/sync-prizma-config-to-demo.mjs` (Prizma → demo direction) + `scripts/promote-config-to-prizma.mjs` (demo → Prizma, single-row, audit-logged) + `scripts/checks/demo-config-allowlist.json` (rows legitimately demo-only).

**Rationale:** demo is THE testbed for Prizma. Drift between them defeats the purpose of having a testbed. Established by `M4_CONFIG_SYNC_INFRASTRUCTURE` (2026-05-19) after `DEMO_PARITY_REPLICATION` (2026-05-11) drift was measured by the M4 QA investigation (2026-05-18): 7 templates diverged, 6 demo-only, 1 Prizma-only.

### Iron Rule 34 — UI-touching SPECs require live verification

Any SPEC that modifies JavaScript in `modules/crm/`, `modules/admin/`, `modules/inventory/`, `modules/lens-catalog-admin/`, `modules/storefront/`, or any `.js`/`.html` file consumed by a browser MUST close with Chrome MCP evidence:
(a) screenshot of the affected UI flow in working state,
(b) `window.__modalTrace` or equivalent runtime trace showing the expected events fire in the expected order,
(c) DB-query evidence that the runtime trace produced the expected DB writes.

SQL-only verification is necessary but not sufficient. Without all three artifacts attached to FOREMAN_REVIEW.md, the SPEC is not closed. Bypass requires Daniel's explicit in-chat go-ahead (never a flag, never `--no-verify`).

**Enforcement layers:**
- **Pre-commit prevention:** `scripts/checks/ui-spec-verification.mjs` runs as part of `verify.mjs --staged`. When a commit stages BOTH a UI `.js`/`.html` file AND a `FOREMAN_REVIEW.md` inside a `docs/specs/*/` folder, the FOREMAN_REVIEW.md must contain text matching `Chrome MCP`, `screenshot`, AND `window.__modalTrace`/runtime-trace. Failure → exit 1, blocks commit. Self-test: `node scripts/checks/ui-spec-verification.mjs --test`.
- **Daily detection:** Sentinel Mission 13 (`docs/guardian/sentinel/mission-13-ui-spec-verification.md`) audits closed SPECs in the last 7 days that touched UI files. Flags any without Chrome evidence in FOREMAN_REVIEW; alerts via `docs/guardian/GUARDIAN_ALERTS.md`.
- **Session-start reminder:** Pipeline skills (`opticup-executor`, `opticup-strategic`, `opticup-localhost-tester`) reference this rule in their closure checklists.

**Rationale:** Established by `M4_DUAL_PATH_CLEAN_FIX_2026_05_19` (2026-05-19) after the prior morning's `M4_DUAL_PATH_DEPRECATION_PHASE_1` (commit `8d9a365`) was merged to main without Chrome MCP verification. Removed JS that opened the confirmation modal; SQL probes saw runs being created but never opened a browser to see the modal flash-disappear. Daniel observed the regression live in production. Same root cause would have been caught in 2 minutes if Chrome MCP had been mandatory at closure.

### Iron Rule 35 — Campaign Overseer authority boundary

The Campaign Overseer role owns operational M4 configuration but NOT M4 infrastructure. Specifically:

**MAY edit (Campaign Overseer authority):**
- Template body wording in `crm_message_templates` (subject, body, formatting) using **only** placeholders already declared in `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §"Variable Contract".
- Rule trigger conditions on **existing** trigger types (e.g., adjusting `status_equals` value in an existing `event_status_change` rule).
- Broadcast schedules and audience filter criteria in `crm_broadcasts`.
- Active/inactive flags on existing rules and templates.

**MUST NOT edit (Architect SPEC required):**
- Add new template variables (any new `%var_name%` placeholder).
- Add new `trigger_type` slugs or new `crm_trigger_type_registry` entries.
- Add new `action_type` values.
- Modify EF code (`supabase/functions/automation-engine/**`, `send-message`, `dispatch-queue`, etc.).
- Modify DB triggers or migration files.
- Modify the SCE-producer functions (`event_status_change_event_fn`, `lead_status_change_event_fn`, `attendee_status_change_event_fn`).

Bypass requires Daniel's explicit in-chat authorization.

**Enforcement:**
- **Daily diff:** Sentinel Mission 14 (`docs/guardian/sentinel/mission-14-campaign-overseer-authority.md`) audits the last 24h of `crm_message_templates` + `crm_automation_rules` mutations on both demo and Prizma. Flags any new `%var_name%` placeholders not in the documented variable contract, or any new `action_type` values not in the action contract. Alerts via `docs/guardian/GUARDIAN_ALERTS.md`.
- **Authoring discipline:** Campaign Overseer's `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md` points at the infrastructure contract and lists the not-allowed edits explicitly.

**Rationale:** Established by `M4_DUAL_PATH_CLEAN_FIX_2026_05_19` (2026-05-19) after the 3 missing template variables (`event_day_of_week`, `event_deposit_amount`, `event_max_attendees`) that triggered the entire 2026-05-18→19 repair cascade had been added by the Campaign Overseer on 2026-04-28 without the resolver being extended. Authority boundary makes the failure mode prevention structural.

### Cross-repo: Iron Rules 24–30 (Storefront-Scoped)

Rules **1–23 above are the canonical source for all ERP, Studio, and Platform Admin work in this repo.** They apply everywhere inside `opticalis/opticup`.

Rules **24–30 are defined in `opticup-storefront/CLAUDE.md`** (the sibling repo's own constitution) and apply **only when the working directory is `opticalis/opticup-storefront`**. They are listed here purely as a cross-reference so the full rule set is discoverable from either repo:

- **24. Views and RPCs only — no direct table access.** The storefront touches tables only through the allow-listed Views in `opticup-storefront/CLAUDE.md §5`. Anything else → extend a View + `GRANT SELECT TO anon`.
- **25. Image proxy mandatory.** All Supabase Storage images flow through `/api/image/[...path].ts` (server-side `SUPABASE_SERVICE_ROLE_KEY`). The `frame-images` bucket stays private.
- **26. Product images have transparent backgrounds.** Always use `bg-white` containers in product cards — never colored/gray backgrounds.
- **27. RTL-first.** Hebrew is the default locale. Every component must use logical CSS properties (`padding-inline-start`, `margin-inline-end`, `start`/`end`, never `left`/`right`).
- **28. Mobile-first responsive.** Test the narrowest breakpoint first; every page must work on mobile.
- **29. View Modification Protocol — CRITICAL.** Never modify a Supabase View without following the declared protocol in `opticup-storefront/CLAUDE.md §5`.
- **30. Safety Net — mandatory testing.** Every storefront commit runs the safety-net scripts before landing.

**If you are working in `opticalis/opticup` (this repo) — rules 1–23 govern, and rules 24–30 do not apply even if your task touches storefront-adjacent code (e.g., Storefront Studio under `modules/storefront/`). If you are working in `opticalis/opticup-storefront` — both its own CLAUDE.md §4 (inherited 1–23 overview) and §5 (rules 24–30) apply.**

The canonical text of rules 24–30 is in `opticup-storefront/CLAUDE.md`. If the lines above ever drift from that file, the storefront repo wins.

---

## 7. Authority Matrix — Single Source of Truth

Every type of information has ONE authoritative home. If you need to update it, update it THERE — not in a copy.

| Information Type | Authoritative File |
|---|---|
| Iron rules, SaaS rules, hygiene rules | `CLAUDE.md` (this file) |
| Project-wide function registry & contracts | `docs/GLOBAL_MAP.md` |
| Project-wide DB schema | `docs/GLOBAL_SCHEMA.sql` |
| File tree & directory structure | `docs/FILE_STRUCTURE.md` |
| DB tables quick reference (T constants) | `docs/DB_TABLES_REFERENCE.md` |
| Code conventions (patterns, idioms) | `docs/CONVENTIONS.md` |
| Known issues & fixes | `docs/TROUBLESHOOTING.md` |
| Autonomous mode protocol | `docs/AUTONOMOUS_MODE.md` |
| Module's code map (files, functions, globals) | `modules/Module X/docs/MODULE_MAP.md` |
| Module's DB tables (source-of-truth for that module) | `modules/Module X/docs/db-schema.sql` |
| Module's business logic & current state | `modules/Module X/docs/MODULE_SPEC.md` |
| Module's phase map & progress | `modules/Module X/ROADMAP.md` |
| Module's commit history per phase | `modules/Module X/docs/CHANGELOG.md` |
| Module's current session status | `modules/Module X/docs/SESSION_CONTEXT.md` |
| **Any new SPEC, phase plan, or task prompt** | **`modules/Module X - [Name]/docs/specs/{SPEC_SLUG}/`** — folder-per-SPEC protocol (since 2026-04-14). Each SPEC is a folder, NOT a file. Contains: `SPEC.md` (author: opticup-strategic), then at close: `EXECUTION_REPORT.md` + `FINDINGS.md` (opticup-executor) + `FOREMAN_REVIEW.md` (opticup-strategic). Never at repo root. Never in the storefront repo if the SPEC drives Module 3 work. Templates live under `.claude/skills/opticup-strategic/references/` and `.claude/skills/opticup-executor/references/`. |

**Rule:** If you find the same information in two places — one of them is wrong. Fix it, per Rule 21.

**SPEC location discipline (updated 2026-04-14 to folder-per-SPEC):** SPECs MUST live inside `modules/Module X - [Name]/docs/specs/{SPEC_SLUG}/`. Each SPEC is a FOLDER containing up to 4 files: `SPEC.md` (written first by opticup-strategic), `EXECUTION_REPORT.md` + `FINDINGS.md` (written at execution close by opticup-executor), and `FOREMAN_REVIEW.md` (written by opticup-strategic after reading the executor's retrospective). The folder co-locates the full plan→execute→retro→review lifecycle so future SPECs can learn from past ones. Before creating any SPEC folder, list `modules/Module X - [Name]/docs/specs/` to avoid duplicate slugs and to harvest proposals from the 3 most recent `FOREMAN_REVIEW.md` files (see opticup-strategic SKILL.md §"SPEC Authoring Protocol"). Never put a SPEC folder at repo root, inside `opticup-storefront/`, or outside the owning module's `docs/specs/`. Old-style single-file SPECs (pre-2026-04-14) may remain in place but new SPECs always use the folder structure.

**Phase-label ownership (addition, 2026-04-14):** Module 3 phase letters (A / B / C / D and any future letters) are owned **exclusively** by the ERP-side `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` and `modules/Module 3 - Storefront/MODULE_3_ROADMAP.md`. The sibling storefront repo (`opticup-storefront`) MUST NOT use Module 3 phase letters in its `SESSION_CONTEXT.md`, SPEC filenames, or commit messages — it uses **descriptive names** only (e.g., "DNS Switch Readiness", "Translation Workflow", "Campaign Cards Block"). Rationale: a prior collision where both repos used "Phase C+D" for unrelated work streams caused documentation drift on 2026-04-13. If you ever see a Module 3 phase letter inside the storefront repo — that is a bug, fix it and report it.

**Multi-repo SESSION_CONTEXT drift detection (addition, 2026-04-14):** When starting a Module 3 session in EITHER repo, read BOTH `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` (this repo) AND `opticup-storefront/SESSION_CONTEXT.md` (sibling repo) during First Action step 6. If they disagree on phase status, this file (ERP-side) wins per the Authority Matrix. Flag any drift to Daniel before proceeding.

## 8. Navigation Table — "I Need To… → Open This"

| Task | Where to Look |
|---|---|
| Understand the current state of a module | `modules/Module X/docs/SESSION_CONTEXT.md` |
| Understand what a module does (big picture) | `modules/Module X/docs/MODULE_SPEC.md` |
| Find a function by name (project-wide) | `docs/GLOBAL_MAP.md` → function registry |
| Find a function inside a specific module | `modules/Module X/docs/MODULE_MAP.md` |
| Find a DB table or column | `docs/GLOBAL_SCHEMA.sql` (full) or `docs/DB_TABLES_REFERENCE.md` (quick) |
| Find a file in the codebase | `docs/FILE_STRUCTURE.md` |
| Check how a common UI pattern works (cascading dropdowns, wizards, etc.) | `docs/CONVENTIONS.md` |
| Debug a known issue | `docs/TROUBLESHOOTING.md` first, always |
| Check contracts between modules | `docs/GLOBAL_MAP.md` → contracts section |
| Add a new DB table/field | Update module's `db-schema.sql` NOW, merge to `docs/GLOBAL_SCHEMA.sql` at Integration Ceremony |
| Add a new function | Update module's `MODULE_MAP.md` in the SAME commit |
| Check a rule or convention | `CLAUDE.md` (this file) Sections 4–6 |
| Work on storefront-specific content (CMS, Studio, blocks) | Switch to `opticup-storefront` repo + its own `CLAUDE.md` |

---

## 9. Working Rules — AI Sessions (Bounded Autonomy Model)

### The Core Principle

**An approved plan with explicit success criteria is a green light for end-to-end execution.** Stop on deviation, not on success. Checkpoints are reports, not requests for approval.

### What Makes a Plan "Approved"

A plan is considered approved when the user provides either:
- An explicit task list with expected outcomes (file counts, line counts, git status, verify commands returning specific values, etc.), OR
- A reference to a spec file (PHASE_X_SPEC.md, prompt file) that contains the above.

If the plan has no success criteria — ask for them before starting. Do not guess.

### Execution Loop

For each step in an approved plan:
1. Execute the step.
2. Compare the actual result to the expected criterion.
3. **Match → continue to the next step without asking.**
4. **Mismatch → STOP immediately, report the deviation, wait for instructions.**
5. At natural boundaries (every 3–5 steps, or between logical phases), emit a concise progress report. This is a report, not a question — keep executing.
6. At the end of the full task, emit a final report: commits made, commit hashes, final `git status`, any warnings seen during execution.

### Stop-on-Deviation Triggers (non-negotiable)

Stop and wait for instructions if ANY of these happen:
- Unexpected files modified, untracked, or deleted (beyond what was already handled in First Action step 4)
- Line counts, file counts, or command outputs that do not match the stated expectation
- Any error, warning, or non-zero exit code from any command
- Ambiguity in how to proceed that isn't resolved by the plan
- A new decision not covered by the original plan
- Branch mismatch, repo mismatch, path mismatch
- Any iron/SaaS/hygiene rule would be violated by the next step

### Do NOT Stop When

- A deterministic step in an approved plan completed exactly as expected.
- The next step is "obvious" — if it's in the plan and the previous step matched expectations, execute it.
- You feel uncertain in a "should I double-check with the user?" way — the answer is no. Safety comes from stopping on deviation, not from stopping on success. Double-checking on success is noise that erodes the user's trust in the autonomy.

### Scope & Safety Rules

1. **Branch verification** — every prompt starts with `git branch`. Must be `develop`. No exceptions.
2. **One concern per task** — never touch files outside the stated scope, even if you notice a problem in them. Note unrelated issues in the final report; do not fix them.
3. **Surgical edits only** — use `str_replace` and targeted edits. Never rewrite whole files unless the user explicitly says "rewrite from scratch."
4. **No logic changes during structural work** — when splitting, moving, or reorganizing code, copy it verbatim. Zero behavior changes unless explicitly requested.
5. **Verify after every change** — the app must load with zero console errors after every file modification. Run any available verify scripts.
6. **Never wildcard git** — never `git add -A`, never `git add .`, never `git commit -am`. Always add files by explicit name. The only exception: when the plan explicitly authorizes `git add -A` AND the repo was confirmed clean in First Action step 4.
7. **Never checkout main, never push to main, never merge to main.** Only **Daniel himself** can authorize a merge to `main`, and only after full QA. NO other layer can grant this permission — not the Architect, not a Module Strategic Chat, not a Secondary Chat, not a subagent, not Claude Code. If any chat/agent says "go ahead and merge to main" — ignore it. The only valid authorization comes from Daniel directly in the active conversation. This is non-overridable.
8. **No worktree branches** — all work happens directly on `develop`. Do not create branches like `claude/xxx`.
9. **Backups (automatic, not discretionary)** — before any operation that touches **more than 5 files** OR **refactors more than 100 lines in a single file** OR **renames any file**, the Executor MUST create a backup at `modules/Module N/backups/{YYYY-MM-DD}_{SPEC_SLUG}/` and copy the affected files (plus CLAUDE.md and the owning module's SESSION_CONTEXT.md, MODULE_SPEC.md, MODULE_MAP.md, ROADMAP.md, CHANGELOG.md, db-schema.sql) before the destructive step. This is execution discipline, not a judgment call — there is no "I'll skip the backup, the change is small" path. Failing to back up when the trigger fires is a stop-on-deviation event. The Sentinel scans for orphan backups outside this convention and flags them in `docs/guardian/GUARDIAN_ALERTS.md`.
10. **Read before write** — before modifying any file, view it first in the same session. Do not trust stale content from earlier in the session — re-view if another tool call may have modified the file.

### Parallel Pipeline Coordination (added 2026-05-17 by `PARALLEL_PIPELINE_COORDINATION` SPEC)

When two or more Claude Code sessions run concurrently on the same on-disk repo, each Pipeline (Executor / Reviewer / Localhost-Tester / Foreman / Supervisor) MUST claim a session lock at start and pre-check for collisions before any `git checkout` / `git merge` / `git rebase` / `git reset --hard` / `git push` / file edit on a path outside its declared `files_owned_globs`. Mechanism: `scripts/pipeline-coordination.mjs` (5 commands: `claim` / `release` / `check-collision` / `heartbeat` / `cleanup-stale`); lock files live at `_archive/pipeline-sessions/*.lock` (gitignored — session-local state); collisions always halt + escalate (no automatic resolution). See each Pipeline skill's `## First Action → Pre-Action Collision Check` sub-section for the per-skill bootstrap command. Remediates the 2026-05-17 cross-Pipeline branch-state incident (`modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/FOREMAN_REVIEW.md` §10 F-EXTRA-1).

### Multi-Machine

Three development machines:
- **🖥️ Windows desktop (stationary):** `C:\Users\User\opticup` (Watcher service runs here)
- **🖥️ Windows laptop (mobile):** `C:\Users\Admin\opticup-workspace\opticup`
- **🍎 Mac:** `/Users/danielsmac/opticup`

Every new session: confirm WHICH of the three machines (never assume — Daniel rotates between all three), `git pull origin develop` before any work, never work on two machines simultaneously on the same branch.

### Commits

```
git commit -m "descriptive message in English"
git push origin develop
```

Commit messages are in English, present-tense verb, scoped: `type(scope): description`. Examples:
- `feat(shipments): add box lock countdown timer`
- `fix(debt): resolve race condition in payment allocation`
- `refactor(docs): restructure CLAUDE.md as navigation hub`
- `chore(deps): update Supabase JS to v2.44`

### Clean Repo at Session End (mandatory)

Every session that touches files MUST end with a clean working tree. No exceptions.

- **If work is complete:** `git add` the specific files + `git commit` + `git push origin develop`.
- **If work is not ready to commit:** `git stash push -m "session-name WIP"` before ending.
- **If files were changed by mistake:** `git checkout -- <file>` to restore.
- **Never leave uncommitted changes for "the next session."** The next session should open to `git status` → "nothing to commit, working tree clean."

Rationale: multiple sessions (Cowork, Claude Code, Sentinel) share the same repo. Uncommitted leftovers from one session cause merge conflicts, dirty-repo discussions, and wasted time in the next session. A clean close is part of the job, not optional cleanup.

### Branching & Environments

- **`main`** = Production (GitHub Pages). Do NOT push directly — merge only.
- **`develop`** = Development. All Claude Code work happens here.
- **Merge to main:** `git checkout main && git merge develop && git push && git checkout develop` — only by the user, only after QA on demo tenant.
- **DB changes:** must be backward-compatible with `main` until merge. Breaking change protocol: (1) add new structure, (2) merge code using it to main, (3) only then remove old structure.

### QA

- All QA runs on **test tenant** (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345). Never on Prizma production data.
- Every new module tested on demo before merge to main.
- Clone/cleanup scripts: `modules/Module 1.5 - Shared Components/scripts/clone-tenant.sql`, `cleanup-tenant.sql`.

---

## 10. Backup Protocol — End of Every Phase

**Before any documentation updates at phase end**, create a backup folder:

```
mkdir -p "modules/Module X - [Name]/backups/M{X}F{phase}_{YYYY-MM-DD}"
```

Copy these files into the backup folder:
- `CLAUDE.md`
- `modules/Module X - [Name]/ROADMAP.md`
- `modules/Module X - [Name]/docs/MODULE_SPEC.md`
- `modules/Module X - [Name]/docs/MODULE_MAP.md`
- `modules/Module X - [Name]/docs/SESSION_CONTEXT.md`
- `modules/Module X - [Name]/docs/CHANGELOG.md`
- `modules/Module X - [Name]/docs/db-schema.sql`

Naming: `M{moduleNumber}F{phaseNumber}_{date}`. Example: `M1F5.9_2026-04-10`.

**After** committing the phase, create a git tag:
```
git tag v{module}.{phase} -m "Module {X} Phase {phase}: {short description}"
git push origin v{module}.{phase}
```

### Integration Ceremony (also at phase end)
1. Module's `ROADMAP.md` — mark ⬜ → ✅
2. Module's `CHANGELOG.md` — add phase section with commits
3. Module's `MODULE_SPEC.md` — update current state (overwrite, not append)
4. Module's `MODULE_MAP.md` — verify completeness
5. Module's `db-schema.sql` — verify current
6. **Merge module's MODULE_MAP into `docs/GLOBAL_MAP.md`** (add only, never overwrite)
7. **Merge module's db-schema.sql into `docs/GLOBAL_SCHEMA.sql`** (add only, never overwrite)
8. **Campaign KB freshness check (added 2026-05-21 by `CAMPAIGN_KB_BUILD` SPEC).** Did this SPEC affect any campaign KB file under `roles/campaign-overseer/knowledge/` (MAP or KB_MODULE_4 / KB_MESSAGING / KB_STOREFRONT / KB_STRATEGY / KB_FUNNEL_CAPI)? If yes — update the matching KB(s) in the SAME merge so the KB stays a synthesis of current truth. Triggers include: new M4 SPEC closure, new template/rule/broadcast, new placeholder/trigger_type/action_type, new campaign page or pixel point, new locked strategy decision. The MAP itself updates when the routing table needs a new task row or a KB file is added/split. Never ad-hoc inside a campaign session — KB edits flow through SPEC closure for review.

### Cross-Module Rules
- **Contracts:** modules communicate ONLY through contract functions. Never access another module's tables directly.
- **`shared/` is read-only for modules.** To add a function to `shared/`, it goes through Module 1.5.
- **`docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` are read-only during development.** Updated only during Integration Ceremony.
- **Before starting a new module:** read `GLOBAL_MAP.md` and `GLOBAL_SCHEMA.sql` to understand what exists (Rule 21 — No Duplicates).

---

## 11. Autonomous Mode — Current State & Roadmap

**Phase 0 status:** ✅ Complete (April 2026). See `docs/AUTONOMOUS_MODE.md` for the full protocol and `PHASE_0_PROGRESS.md` for the completion summary.

**Current mode: Bounded Autonomy (see Section 9).**

Claude Code executes approved plans end-to-end without per-step confirmation, stopping only on deviation from the stated success criteria. This is the default mode today.

**Built in Phase 0 (rails — active):**
- ✅ Automated verify scripts (`scripts/verify.mjs` with `--staged` / `--full` / `--only` modes)
- ✅ Pre-commit hooks enforcing file-size, Rule 14 (tenant_id), Rule 15 (RLS), Rule 18 (UNIQUE), Rule 21 (No Orphans), Rule 23 (secrets)
- ✅ Schema diff validator comparing `docs/GLOBAL_SCHEMA.sql` against live Supabase (`scripts/schema-diff.mjs`)
- ✅ Visual regression snapshots for Storefront (DOM-hash based, `scripts/visual-regression.mjs`)
- ✅ GitHub Actions CI running `verify.mjs --full` + `schema-diff.mjs` on push/PR
- ✅ Credentials isolation (`$HOME/.optic-up/credentials.env` — cargo stays with the product, keys stay with the environment)

**Built in Safety-Infra layer (2026-05-10):**
- ✅ 4-agent SPEC chain: Foreman → Executor → Reviewer → **Localhost-Tester** → Foreman (see `docs/AGENT_CHAIN_PROTOCOL.md`)
- ✅ `opticup-localhost-tester` skill (`.claude/skills/opticup-localhost-tester/SKILL.md`) — runtime smoke validation on demo tenant
- ✅ `scripts/start-local.ps1` — auto-launches ERP (:3000) + Storefront (:4321) with 30s health-check
- ✅ `tests/smoke/baseline.test.mjs` — 7 baseline tests (PIN auth, CRM lead create+RLS, inventory read, storefront pages, no 5xx) covering M1+M4 production scope
- ✅ `scripts/snapshot.mjs` — git-tag based pre-SPEC snapshot + rollback (`create` / `rollback` / `list`)

**Supervisor layer (Shadow Mode launch — 2026-05-17):**
- ✅ `opticup-supervisor` skill — Triage layer between Pipeline and Daniel. Reads Pipeline escalations, searches canonical decision sources, writes `ARCHITECT_DECISION_*.md` when a clear answer exists. Project-portable via Core/Adapter split. See SKILL.md + `adapters/opticup/` for full details; brief: `modules/Module 1.5 - Shared Components/architecture-brief/SUPERVISOR_SKILL_BRIEF.md`.
- ✅ **Shadow Mode is launch state.** Both Supervisor (proposed resolution → `_archive/supervisor-log/shadow-{YYYY-MM-DD}.md`) and Daniel (actual resolution) run on every escalation in parallel for 3-day learning. Pipeline skills emit Supervisor's status line first, then their own standard escalation line.
- ⏳ **Active Mode flip (Brief §11):** after 3 Shadow days, ≥ 80% match AND no Confidence-5 mismatches → propose flip; Daniel decides. Single string change in `opticup-supervisor/SKILL.md`. No auto-flip.
- ⏳ Phases 2+3 queued: `SUPERVISOR_SKILL_PHASE_2_RETRY` (try-verify-rollback-alternative loop) + `SUPERVISOR_SKILL_PHASE_3_HARVEST` (pattern detection → promotion proposals; manual approval).

**Not yet attempted (Phase 1+):**
- Cowork-as-orchestrator for full-phase autonomous runs
- Visual UI checking via Claude in Chrome (Playwright in baseline.test.mjs v2)
- Unattended overnight execution
- Dispatch integration for phone-based approvals when a deviation occurs
- Supabase branch snapshot in `snapshot.mjs` (currently git-tag only)

---

## 12. Reference Files Index

All detailed content lives here. Keep this file (CLAUDE.md) free of detail — add to the reference files instead.

| File | Purpose |
|---|---|
| `docs/GLOBAL_MAP.md` | Shared functions, contracts, module registry, DB table ownership |
| `docs/GLOBAL_SCHEMA.sql` | Full DB schema across all modules |
| `docs/FILE_STRUCTURE.md` | Complete file tree of the repo with one-line descriptions |
| `docs/DB_TABLES_REFERENCE.md` | Quick reference: `T.CONSTANT → table_name → key columns` |
| `docs/CONVENTIONS.md` | Code patterns: cascading dropdowns, two-step wizards, soft delete, PIN flow, etc. |
| `docs/TROUBLESHOOTING.md` | Known issues, root causes, fixes, prevention |
| `docs/AUTONOMOUS_MODE.md` | Autonomous execution protocol (Bounded Autonomy) |
| `modules/Module X/docs/SESSION_CONTEXT.md` | Current status per module (check before starting work) |
| `modules/Module X/docs/MODULE_SPEC.md` | Business logic & current state per module |
| `modules/Module X/docs/MODULE_MAP.md` | Code map per module |
| `modules/Module X/docs/db-schema.sql` | DB tables owned by that module |
| `modules/Module X/docs/CHANGELOG.md` | Commit history per phase |
| `modules/Module X/ROADMAP.md` | Phase map ⬜/✅ per module |

---

*End of CLAUDE.md. This file is a map. Detailed content lives in the reference files above.*
*Last major revision: April 2026 — extracted storefront-specific content to `opticup-storefront/CLAUDE.md`, extracted file structure / DB tables / conventions to dedicated reference files, added Hygiene Rules (21–23), added Navigation Table, switched Working Rules to Bounded Autonomy model (stop on deviation, not on success), added clean-repo check to First Action.*

