# SPEC — {SPEC_SLUG}

> **Location:** `modules/Module X - [Name]/docs/specs/{SPEC_SLUG}/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** YYYY-MM-DD
> **Module:** {X} — {Name}
> **Phase (if applicable):** {letter/number}
> **Author signature:** {chat name / session id}

---

## 1. Goal

One to two sentences. What is the outcome of this SPEC in plain language.

Example: "Ship Phase B6 of Module 3 — storefront DNS switch readiness — so that
Prizma's `prizma-optic.co.il` traffic can be moved from WordPress to Vercel
within a 15-minute window with a verified rollback plan."

---

## 2. Background & Motivation

2–4 sentences. Why now? What previous work does this depend on? Link to
relevant commits / SPECs / FOREMAN_REVIEWs.

---

## 3. Success Criteria (Measurable)

Every criterion must have an EXACT expected value. Copy-paste-runnable when
possible. If a criterion is not measurable, the SPEC is not ready.

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state | On `develop`, clean | `git status` → "nothing to commit" |
| 2 | Commits produced | N commits | `git log origin/develop..HEAD --oneline \| wc -l` → N |
| 3 | New files | X new files at paths [...] | `ls {paths}` → exit 0 |
| 4 | DB row count for Prizma brands | 232 | Supabase MCP execute_sql |
| 5 | Storefront build | passes, 0 errors | `npm run build` → exit 0 |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the repo
- Run read-only SQL (Level 1 autonomy)
- Create, edit, move files listed in §8 "Expected Final State"
- Commit and push to `develop`
- Run the standard verify scripts (`verify.mjs`, `full-test.mjs`, `schema-diff.mjs`)
- Apply an executor-improvement proposal from a recent FOREMAN_REVIEW if it
  directly applies

### What REQUIRES stopping and reporting
- Any file in `FROZEN_FILES.md` being touched
- Any schema change (DDL) — Level 3 autonomy is never autonomous
- Any merge to `main`
- Any test failure that cannot be diagnosed in a single retry
- Any step where actual output diverges from §3 expected value

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

List triggers specific to this SPEC. Example:
- If `v_storefront_products` row count drops below 500 after any migration → STOP
- If `npm run build` emits any warning about circular imports → STOP

---

## 6. Rollback Plan

If the SPEC fails partway through and must be reverted:
- `git reset --hard {START_COMMIT}` — where START_COMMIT = `{hash before any change}`
- Restore DB state via: {specific queries or "no DB changes in this SPEC"}
- Notify Foreman; SPEC is marked REOPEN, not CLOSED.

---

## 7. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:
- [file or module]
- [feature or behavior]

---

## 8. Expected Final State

After the executor finishes, the repo should contain:

### New files
- `path/to/new/file1.ts`
- `path/to/new/file2.sql`

### Modified files
- `path/to/existing/file.md` — lines {A}–{B} changed: {description}

### Deleted files
- `path/to/old/file.js` (if any)

### DB state
- Table `X` has columns {Y, Z} with expected seed data

### Docs updated (MUST include)
- `MASTER_ROADMAP.md` §3 updated if phase status changes
- `docs/GLOBAL_MAP.md` if new functions/contracts
- `docs/GLOBAL_SCHEMA.sql` if new tables/views
- Module's `SESSION_CONTEXT.md`
- Module's `CHANGELOG.md`

---

## 9. Commit Plan

Specify how commits should be grouped. Example:
- Commit 1: `feat(m3): add DNS readiness script` — files A, B
- Commit 2: `docs(m3): update PHASE_B6 SPEC folder with SESSION_CONTEXT entry`
- Commit 3: `chore(spec): close PHASE_B6_DNS_SWITCH with retrospective` (written by executor at end)

---

## 10. Dependencies / Preconditions

- Previous SPEC {X} must be closed
- Tool {Y} must be available (version {Z})
- Credentials {W} must be in `$HOME/.optic-up/credentials.env`

---

## 11. Lessons Already Incorporated

List every FOREMAN_REVIEW proposal from prior SPECs that was considered and
explain whether this SPEC applies it. This proves the learning loop is
closing, not just accumulating.

- FROM `PHASE_B/FOREMAN_REVIEW.md` → "always pin package versions" → APPLIED in §8.
- FROM `PRE_LAUNCH_HARDENING/FOREMAN_REVIEW.md` → "run image regression check before view changes" → NOT APPLICABLE (no view changes here).
