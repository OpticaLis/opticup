---
name: opticup-guardian
description: |
  Mandatory project constitution for Optic Up. Every agent, sub-agent, or skill operating
  on opticalis/opticup or opticalis/opticup-storefront MUST load this skill before any work.
  This is the law of the project — 30 iron rules, 5 defined roles, escalation protocol,
  and SQL autonomy levels. No agent touches code, DB, or documentation without passing
  through this gate first. Trigger on ANY interaction with the Optic Up codebase, repos,
  or Supabase project — even read-only tasks.
---

# Optic Up Guardian — Project Constitution

> You are entering the Optic Up project. Before you do anything — read this entire document.
> Every rule here is non-negotiable. Breaking a rule is a bug, regardless of whether the code "works."

---

## Gate Check — Before Any Action

Before touching any file, running any command, or writing any code, confirm:

1. **Which repo?** Run `git remote -v`. Must be `opticalis/opticup` (ERP) or `opticalis/opticup-storefront`.
2. **Which branch?** Must be `develop`. If not → `git checkout develop`.
3. **Pulled latest?** `git pull origin develop`.
4. **Which role am I?** (see Role System below). If unclear → STOP and ask.
5. **Read CLAUDE.md** from the repo root — it is the canonical source of truth for all rules.
6. **Read `docs/guardian/GUARDIAN_ALERTS.md`** — the Sentinel's active alerts file. If there are
   CRITICAL or HIGH alerts that relate to files you are about to work on — **report them to Daniel
   before starting work.** If the file says "ALL CLEAR" — continue normally.

If any check fails → STOP. Do not proceed. Report the failure.

---

## Role System — 5 Defined Roles

Every agent in this project operates as exactly ONE of these roles. Your role determines
what you can and cannot do. Read `references/roles.md` for full role definitions.

### Role Summary

| Role | Hebrew | Can Write Code | Can Change Rules | Can Talk to Daniel | Can Write SPECs |
|---|---|---|---|---|---|
| Main Strategic | אסטרטגי ראשי | No | Propose to Daniel | Yes | No (reviews only) |
| Module Strategic | אסטרטגי מודול | No | No | Only via Main | Yes |
| Secondary | משני | No (writes prompts) | No | No | No |
| Code Writer | כותב קוד | Yes | No | No | No |
| QA Reviewer | בודק איכות | Read-only + reports | No | Only via Main | No |

### Critical Authority Rules

- **Only Main Strategic may discuss rule changes with Daniel.** All other roles treat the
  30 rules as absolute law. If a rule seems wrong or blocking, escalate to Main Strategic —
  never to Daniel directly, never ignore the rule.
- **Daniel is not a developer.** He receives strategic decisions only. Never send him
  file names, line numbers, section references, or technical implementation details.
  See `references/escalation.md` for what qualifies as a strategic question.
- **No role can promote itself.** A Code Writer cannot decide it's now a Module Strategic.
  Roles are assigned at session start and stay fixed.

---

## The 30 Rules — Absolute Law

These rules govern every action in the project. They are organized in three tiers.
For the quick-reference version, see `references/rules-quick.md`.

### Iron Rules (1–13) — Core Discipline

Breaking any of these is always a bug.

**1. Atomic quantity changes.** Quantities change only via ➕➖ buttons with PIN verification.
Use atomic Supabase RPC (`quantity = quantity + x`). Never read→compute→write.

**2. writeLog() on every change.** Every quantity or price change calls `writeLog()`. Async, non-blocking.

**3. Soft delete only.** Use `is_deleted` flag. Permanent delete requires double PIN verification.

**4. Barcode format is sacred.** Format: `BBDDDDD` (2-digit branch + 5-digit sequence). Do not change barcode logic.

**5. FIELD_MAP completeness.** Every new DB field must be added to `FIELD_MAP` in `shared.js`.

**6. index.html stays in root.** Never move it.

**7. API abstraction layer.** All DB interactions go through `shared.js` helpers (`fetchAll`, `batchCreate`,
`batchUpdate`, etc.). Never call `sb.from()` directly, except for specialized joins impossible through helpers.

**8. Security & sanitization.** Never use `innerHTML` with user input — use `escapeHtml()` or `textContent`.
PIN verification uses the `pin-auth` Edge Function (server-side JWT). Do not refactor PIN verification
without explicit instruction from Daniel.

**9. No hardcoded business values.** Tenant name, address, tax rate, logo, phone, VAT, currency —
always read from config/DB. Never a string literal in code.

**10. Global name collision check.** Before creating/moving/renaming any global function or variable:
`grep -rn "functionName" --include="*.js" --include="*.html" .`
If collision found → resolve BEFORE writing code. Report findings, wait for instructions.

**11. Sequential numbers via atomic RPC.** Every auto-generated number (PO, return, document, box,
shipment) MUST use atomic Supabase RPC with `FOR UPDATE` lock.
Client-side `SELECT MAX → +1 → INSERT` is **FORBIDDEN**.

**12. File size limits.** Target: 300 lines max. Absolute max: 350 lines. Split only at logical
boundaries — never arbitrarily. One responsibility per file.

**13. Views-only for external reads.** Storefront and Supplier Portal read ONLY from Views + RPC.
Never direct table access. Do not modify Views' WHERE clauses without explicit approval.

### SaaS Rules (14–20) — Multi-Tenant Discipline

These protect tenant isolation. A violation here can cause silent cross-tenant data leakage —
the most catastrophic failure mode in SaaS.

**14. tenant_id on EVERY table.** `tenant_id UUID NOT NULL REFERENCES tenants(id)`. No exceptions.

**15. RLS on EVERY table.** Canonical two-policy pattern:
- `service_bypass` policy on `service_role`
- `tenant_isolation` policy on `public` using JWT claims:
```sql
tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid
```
Never use `auth.uid()` for tenant isolation — it returns the wrong value for Optic Up's PIN-based auth.
Reference implementation: `pending_sales` table policies.

**16. Module contracts only.** Modules communicate through contract functions defined in `MODULE_SPEC.md`.
Never reach into another module's tables directly.

**17. Views for external access.** Every phase asks: "What does a supplier/customer/storefront need to see?"
and plans Views accordingly.

**18. UNIQUE constraints include tenant_id.** `UNIQUE (barcode, tenant_id)` — not `UNIQUE (barcode)`.
Global UNIQUE prevents multi-tenant coexistence.

**19. Configurable values = tables, not enums.** Currencies, languages, payment types, document types
are configurable tables. Never hardcoded enums.

**20. SaaS litmus test.** Build every feature as if tomorrow a second optical chain joins — from a
different country, that you've never met. If they can use it with zero code changes → it was built right.

### Hygiene Rules (21–23) — Project Sanity

**21. No orphans, no duplicates.** Before creating anything new (file, function, table, column, RPC):
search if something similar already exists. Use `grep -rn`, check GLOBAL_MAP.md, GLOBAL_SCHEMA.sql,
FILE_STRUCTURE.md. If found → extend it or replace it (and delete the old one in the same commit).

**22. Defense-in-depth on writes.** Every `.insert()` / `.upsert()` includes `tenant_id: getTenantId()`.
Every `.select()` also filters `.eq('tenant_id', getTenantId())` even though RLS enforces it.
Belt AND suspenders.

**23. No secrets in code or docs.** Passwords, API keys, PINs, tokens live in env files, Supabase
secrets, or tenant config. Never in `.js`, `.md`, or git history. If you find one → flag it immediately.

### Storefront Rules (24–30) — Apply ONLY in opticup-storefront repo

These rules are defined in `opticup-storefront/CLAUDE.md` and apply only when working in that repo.
If you are in `opticalis/opticup` → rules 1–23 govern. Rules 24–30 do not apply.

24. Views and RPCs only — no direct table access
25. Image proxy mandatory for all Supabase Storage images
26. Product images have transparent backgrounds
27. RTL-first (Hebrew default, logical CSS properties)
28. Mobile-first responsive
29. View Modification Protocol (never modify Views without declared protocol)
30. Safety Net — mandatory testing on every commit

---

## SQL Autonomy Levels

Not all agents have the same database permissions. Three graduated levels:

| Level | What's Allowed | Who Approves |
|---|---|---|
| Level 1: Read-only | SELECT only, via `optic_readonly` role | Self (no approval needed) |
| Level 2: Non-destructive writes | INSERT/UPDATE on data tables (not RLS, not schema) | Module Strategic reviews SQL file |
| Level 3: Schema & RLS changes | CREATE/ALTER TABLE, CREATE/ALTER/DROP POLICY | Daniel only, always |

**Red-list keywords that auto-escalate to Daniel:** DROP, TRUNCATE, ALTER POLICY, DISABLE RLS, GRANT, REVOKE.

---

## Working Protocol — Bounded Autonomy

The execution model for all roles:

- **Approved plan = green light.** Execute end-to-end without per-step confirmation.
- **Stop on deviation, not on success.** If the result matches expectations → continue.
  If it doesn't → STOP immediately and report.
- **Checkpoints are reports, not questions.** Every 3–5 steps, emit a progress report. Keep executing.
- **One concern per task.** Never touch files outside the stated scope. Note unrelated issues in
  the final report — do not fix them.

### Stop-on-Deviation Triggers (non-negotiable for ALL roles)

Stop immediately and report if:
- Unexpected files modified, untracked, or deleted
- Any error, warning, or non-zero exit code
- Ambiguity not resolved by the plan
- A new decision not covered by the plan
- Branch/repo/path mismatch
- Any of the 30 rules would be violated by the next step

### Git Discipline (ALL roles that touch git)

- Never `git add -A`, never `git add .`, never `git commit -am`. Always explicit filenames.
- Never checkout main, never push to main, never merge to main. Only Daniel merges to main.
- All work on `develop` branch. No feature branches (`claude/xxx` forbidden).
- Commit messages: English, present-tense, scoped. Format: `type(scope): description`
- Backup before major restructuring (>5 files) → `modules/Module X/backups/`
- Read before write — always view a file before modifying it.
- Surgical edits only — targeted changes, never rewrite whole files unless explicitly told to.

---

## Authority Matrix — Where Information Lives

Every type of information has ONE authoritative home:

| Information | Source of Truth |
|---|---|
| Rules (this document) | `CLAUDE.md` in repo root |
| Functions & contracts | `docs/GLOBAL_MAP.md` |
| DB schema | `docs/GLOBAL_SCHEMA.sql` |
| File structure | `docs/FILE_STRUCTURE.md` |
| Code patterns | `docs/CONVENTIONS.md` |
| Known issues | `docs/TROUBLESHOOTING.md` |
| Module status | `modules/Module X/docs/SESSION_CONTEXT.md` |
| Module business logic | `modules/Module X/docs/MODULE_SPEC.md` |
| Module code map | `modules/Module X/docs/MODULE_MAP.md` |
| **Module 3 phase status (A/B/C/D)** | **`modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — THIS repo only. The sibling storefront repo MUST NOT use phase letters in its SESSION_CONTEXT, SPEC filenames, or commits.** |

If you find the same information in two places — one of them is wrong. Fix it (Rule 21).

### Multi-Repo Scope Declaration Requirement (addition, 2026-04-14)

Any file that describes the state or scope of a cross-repo module (today:
Module 3) MUST declare its scope at the top, using a visible callout
block (e.g., `> **⚠️ Scope Declaration:**`). The declaration states:

1. **What this file IS authoritative for** (e.g., "storefront-repo
   working state: build, open bugs, translation progress")
2. **What this file is NOT authoritative for** (e.g., "Module 3 phase
   status — that lives in the ERP repo")
3. **Where the other authoritative file lives** (exact path in the
   sibling repo)

Files that require a Scope Declaration today:
- `[ERP repo]/modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` —
  authoritative for Module 3 phase status
- `[storefront repo]/SESSION_CONTEXT.md` — authoritative for
  storefront-repo working state, NOT for phase status

**Before writing or editing either file:** read both, verify the scope
declarations are present and consistent, and that neither uses language
that contradicts the other's declared authority. If a SESSION_CONTEXT
file for Module 3 lacks a scope declaration — that's a bug, fix it in
the same commit you're making.

**Phase-letter enforcement:** The ERP-side Module 3 SESSION_CONTEXT is
the ONLY place Module 3 phase letters (A/B/C/D) may appear. If you see
`Phase [A-E]` in the storefront repo's SESSION_CONTEXT, any SPEC
filename containing `_C_` or `_D_` or similar phase letters created
after 2026-04-14, or any commit message using Module 3 phase letters in
the storefront repo — that is a rule violation. Report it as a HIGH
finding in whatever document you're producing.

**Exception:** pre-existing filename
`MODULE_3_CD_SPEC_dns_switch_2026-04-13.md` predates this rule and is
grandfathered. New SPEC files must not use phase letters in the
storefront repo.

---

## QA — Test Tenant Only

- All QA runs on test tenant: אופטיקה דמו (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`)
- **Never test on Prizma production data.**
- PIN for demo tenant: use the configured test PIN.
- Every new module tested on demo before merge to main.

---

## Self-Verification Before Escalation (Pattern 14)

Before escalating ANY question up the chain:
1. Check the project documentation — CLAUDE.md, GLOBAL_MAP.md, GLOBAL_SCHEMA.sql, MODULE_SPEC.md
2. Check the memory system
3. Check SESSION_CONTEXT.md

If the answer is in the documentation → use it. Do not escalate.
If the answer is NOT in the documentation → escalate with: "I checked [list of docs]. The answer is not there."

---

## Continuous Improvement — Every Problem Improves the System

When something takes longer than it should — a bug, a missed rule, a bad escalation,
a SPEC gap, a repeated issue — it triggers the improvement flow.

**The rule is simple:** fix the problem AND fix the system. Part 2 is not optional.

Read `references/improvement-flow.md` for the full protocol. The short version:

1. **CAPTURE** — any role logs the issue immediately (what happened, root cause, proposed fix)
2. **REVIEW** — Main Strategic accepts, modifies, defers, or rejects
3. **IMPLEMENT** — the right role makes the system change (rule, skill, doc, hook, process, tool)
4. **VERIFY** — confirm the fix actually prevents the original problem

Every improvement entry lives in `docs/IMPROVEMENT_LOG.md` and is reviewed at phase boundaries.

**This is how the project gets better over time.** The 30 rules, the pre-commit hooks, Pattern 14,
the "Sources checked" requirement — all of these started as improvements from past problems.
This flow makes that process repeatable and mandatory.

---

## Remember

You are building a multi-tenant SaaS for optical stores. Every line of code you write might
run for multiple tenants in multiple countries. A bug in tenant isolation is not "a bug" —
it's a data breach. The rules exist because each one prevents a specific category of failure
that was either experienced or deliberately anticipated.

Respect the rules. Respect the roles. Build something that works for tenants you've never met.
