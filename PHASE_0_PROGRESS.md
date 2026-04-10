# Phase 0 — Progress Summary

> **Status:** ✅ Complete (April 2026)
> **Goal:** Build automated rails so Bounded Autonomy execution can be trusted.
> **Outcome:** Five sub-phases delivered across two repos. All success criteria met.

---

## Sub-Phases

### ✅ 0A — ERP Foundation Scripts (opticalis/opticup)

**Built:**
- `scripts/verify.mjs` — orchestrator with `--staged` / `--full` / `--only` / `--verbose` modes
- `scripts/checks/` — 6 check modules: file-size, rule-14-tenant-id, rule-15-rls, rule-18-unique-tenant, rule-21-orphans, rule-23-secrets
- `.husky/pre-commit` → `node scripts/verify.mjs --staged`
- `scripts/README.md` — verify system documentation (appended to existing InventorySync README)
- `TECH_DEBT.md` — created, seeded with credentials consolidation item
- `package.json` extended with husky + chalk devDeps (legacy deps preserved byte-identical)

**Key commits:** 4849d6f (infra), c9618e8 (TECH_DEBT #5/#6 post-0B), 9fab809 (TECH_DEBT #7), 305b22e (warnings exit harmonization)

**Baseline found:** ~400 violations, ~36 warnings. Mostly archive/*.html files and css/employees.css. Not fixed per Plan Decision 5.

---

### ✅ 0B — ERP Schema-Diff Infrastructure (opticalis/opticup)

**Built:**
- `scripts/lib/load-env.mjs` — reads `$HOME/.optic-up/credentials.env` with `process.env` fallback for CI
- `scripts/lib/parse-sql-schema.mjs` — regex-based SQL schema parser
- `scripts/schema-diff.mjs` — compares `docs/GLOBAL_SCHEMA.sql` to live Supabase via information_schema fallback probing
- `scripts/investigate-display-mode.mjs` — one-time investigation artifact for TECH_DEBT #3 resolution

**Key commits:** de86462 (TECH_DEBT prep), 814fdab (schema-diff infra), 9a64804 (load-env env fallback for CI)

**Baseline found:** 312 column-level drifts (live > declared). Zero table-level drift. Views cannot be detected (schema file declares zero views — tracked as ERP TECH_DEBT #6).

**Architectural decision captured:** Cargo stays with the product. Keys stay with the environment. Credentials live outside both repos, never in a `.env` file inside a working directory.

---

### ✅ 0C — Storefront Verification Foundation (opticalis/opticup-storefront)

**Built:**
- `scripts/verify.mjs` — orchestrator with fast checks and opt-in wrappers (`--with-db`, `--with-server`, `--with-visual`)
- `scripts/checks/` — 4 check modules: file-size, rule-23-secrets, rule-24-views-only (with whitelist), frozen-files (staged-only)
- `.husky/pre-commit` → `node scripts/verify.mjs --staged`
- `scripts/README-verify.md` — kept separate from the existing InventorySync README to avoid mixing topics
- Existing scripts (full-test, smoke-test, pre-sql-check, post-sql-verify) preserved as standalone tools AND wrapped as opt-in subprocess calls

**Key commits:** 430cbb5 (TECH_DEBT #3 resolution), 4035322 (verify infra), c19f804 (observation cleanup)

**Display mode terminology resolved:** `display_mode` is canonical on `brands` and `display_mode_override` on `inventory`. `storefront_mode` / `storefront_mode_override` are dead columns scheduled for cleanup (Storefront TECH_DEBT #10).

**Baseline found:** 56 violations (mostly docs/*.html WordPress exports, TECH_DEBT #14/#15) + 6 legitimate rule-24 violations (normalize-logo.ts and submit.ts direct table reads, TECH_DEBT #11/#12/#13).

---

### ✅ 0D — Storefront Visual Regression (opticalis/opticup-storefront)

**Built:**
- `scripts/visual-regression.mjs` — fetches 10 critical pages, extracts DOM structure, hashes via SHA-256
- `scripts/lib/dom-hash.mjs` — structural extraction helper
- `scripts/visual-regression-baseline/` — 10 committed baseline JSON files (the files ARE the spec)
- `scripts/README-visual-regression.md`
- `verify.mjs` extended with `--with-visual` flag

**Key commits:** 2eb08d7 (TECH_DEBT #11–#15), 18b35cc (visual regression infra)

**Pages covered:** home (HE/EN/RU), brands, brand-detail, products, product-detail, about, search, categories.

**Deliberate exclusions from hash:** text content, dynamic query strings, timestamps, UUIDs. Pixel-level regression is Phase 0.5 material.

---

### ✅ 0E — GitHub Actions CI (both repos)

**Built:**
- ERP: `.github/workflows/verify.yml` — runs `verify.mjs --full` + `schema-diff.mjs` with continue-on-error on baseline steps. Consumes 4 GitHub Secrets (PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PUBLIC_DEFAULT_TENANT).
- Storefront: `.github/workflows/verify.yml` — runs `verify.mjs --full` only. No credentials. Opt-in checks (`--with-db`, `--with-server`, `--with-visual`) intentionally NOT wired into CI to keep credential blast radius minimal.

**Key commits:** 480ce3d (ERP workflow), 965c0ba (Storefront workflow)

**First CI run (both repos):** ✅ Success. Baseline violations surfaced as annotations with `continue-on-error: true`. Node 20 deprecation warning from actions/checkout@v4 and actions/setup-node@v4 captured as TECH_DEBT for future upgrade.

---

### ✅ 0F — Final Integration (this sub-phase)

**Built:**
- `docs/AUTONOMOUS_MODE.md` — full execution protocol, both repos
- `CLAUDE.md` Section 11 updated in both repos to remove "(TBD — Phase 0)" markers
- `PHASE_0_PROGRESS.md` — this file
- End-to-end smoke test commit demonstrating the full pipeline

**Manual follow-up required (user action, not automated):**
- GitHub branch protection on `main` in both repos — add required-status-check on `verify` workflow once baseline cleanup is done. Currently deferred because continue-on-error would prevent the check from being meaningful.

---

## What Phase 0 Does NOT Enforce (Yet)

These are tracked in TECH_DEBT.md in each repo and intentionally deferred:

- **ERP TECH_DEBT #5** — information_schema REST inaccessibility (schema-diff fallback has blind spots)
- **ERP TECH_DEBT #6** — GLOBAL_SCHEMA.sql declares zero views (schema-diff blind to view drift — rails gap, not doc gap)
- **ERP TECH_DEBT #7** — warnings exit policy consistency (harmonized to exit 2 in commit 305b22e, item closed on next cleanup pass)
- **Storefront TECH_DEBT #11** — normalize-logo.ts reads employees + auth_sessions (security review needed)
- **Storefront TECH_DEBT #14/#15** — docs/*.html WordPress exports inflate baseline (false positives)

## Trust Model

Phase 0 established that **safety comes from stopping on deviation, not from stopping on success.** The rails catch deviations independently of executor self-reporting. A clean report at the end of a run, with the rails active, is trustworthy in a way that a clean report without rails never was.

## What Comes Next

Phase 0.5 (deferred enhancements):
- Full-accuracy schema diff (Edge Function or direct pg connection)
- View body comparison in schema-diff
- Pixel-level visual regression
- Declare views in GLOBAL_SCHEMA.sql (resolves TECH_DEBT #6)

Phase 1 (Cowork orchestration):
- Multi-sub-phase autonomous runs
- Cowork reads PHASE_X_SPEC.md, executes, reports
- User approves at phase boundaries, not per commit

Phase 2 (Dispatch integration):
- Phone-based deviation approvals
- Remote phase kickoff

---

*Phase 0 complete. Rails active. Bounded Autonomy trusted.*
