# SPEC — {SPEC_SLUG}

> **Template version:** v3 (2026-05-14) — supersedes v2 (archived at `_archive/spec-template-versions/v2_2026_05_14/`).
> **Location:** `modules/Module X - [Name]/docs/specs/{SPEC_SLUG}/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** YYYY-MM-DD
> **Module:** {X} — {Name}
> **Phase (if applicable):** {letter/number}
> **Author signature:** {chat name / session id}

> **Heading convention:** Use `## N. Title` (plain numbered). Do NOT prefix headings with `§` — the Iron-Rule-32 pre-commit hook's regex (`scripts/checks/destructive-ops-declared.mjs`) does not accept the section-symbol prefix and will block the SPEC's own commit. (Harvested from `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1, 2026-05-11.)

> **Required Sections Matrix.** Every section below is either REQUIRED FOR EVERY SPEC or REQUIRED ONLY FOR <type>. Trim sections that don't apply, but never silently skip a REQUIRED-EVERY one.
>
> | § | Section | When required |
> |---|---|---|
> | 0 | Pre-Authoring Reality Check | EVERY |
> | 1 | Goal | EVERY |
> | 2 | Background & Motivation | EVERY |
> | 3 | Success Criteria (Measurable) | EVERY |
> | 3a | Shared Edit Block | ONLY multi-file SPECs (N>1 same edit) |
> | 4 | Autonomy Envelope | EVERY |
> | 5 | Stop-on-Deviation Triggers | EVERY |
> | 6 | Rollback Plan | EVERY (write "no DB/code changes" if N/A) |
> | 7 | Destructive Operations | EVERY (write `**None.**` if N/A) |
> | 8 | Out of Scope | EVERY |
> | 9 | Expected Final State | EVERY |
> | 10 | Commit Plan | EVERY |
> | 11 | Dependencies / Preconditions | EVERY |
> | 12 | Lessons Already Incorporated | EVERY |
> | 13 | Pre-Merge Checklist | EVERY |
> | 14 | Smoke Test Cases | EVERY (mark `Type:` per case — see template at §14) |
> | 15 | Daniel-Decision Sub-Questions | ONLY when SPEC declares any STOP-on-Daniel-decision in §5 |
> | App. A | Common Gotchas | reference-only |

> **Self-improvement footprint (P-EX-03, mandatory).** Every EXECUTION_REPORT.md MUST include §7 SPEC_TEMPLATE Version Footprint listing which template patterns were exercised (or the literal string "No new template improvements to footprint this run" if empty). Foreman hard-fails closure if absent. Current adoption pre-v3 was 5.6% (10 of 177 EXECUTION_REPORTs). v3 elevates this to first-class.

---

## 0. Pre-Authoring Reality Check

Required before drafting any later section. Confirms the SPEC is grounded in
actual repo state, not in Brief assumptions that may have drifted.

- Brief read in full on YYYY-MM-DD.
- Target file(s) and dependent files exist at the claimed paths; line counts confirmed.
- Every hex / token / table / column / function name the Brief assumes was grep-verified against the actual file content.
- Where the Brief's assumptions diverge from repo reality, the SPEC's success criteria are written against repo reality (the Brief's intent applied to what's actually there), not against the Brief's literal claims.
- Lessons applied from prior `FOREMAN_REVIEW.md` files in this module — list each one and how it was honored.
- Pre-existing untracked files surveyed (`git status --porcelain | grep '^??'` count recorded). The Executor will leave them alone — selective `git add` by filename throughout. (See CLAUDE.md §1.4. Codified after 3 consecutive Pipeline SPECs — MIGRATION_1, MIGRATION_2, SETTINGS_PERMISSIONS_CONSOLIDATION — made the same D1 decision.)
- **`.gitignore`-awareness for §9 New Files.** Every path the SPEC will list under §9 Expected Final State "New files" MUST be checked against `.gitignore` BEFORE the Executor runs `git add`. Paths in `modules/*/backups/`, `node_modules/`, `dist/`, `.cache/` are on-disk-only deliverables — mark them explicitly `[on-disk only, gitignored]` so the Executor does not waste time on a failed `git add`. (Added 2026-05-14 from T3.1 P-ST-01 — `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/FOREMAN_REVIEW.md` + `EXECUTOR_SKILL_EF_DEPLOY_CLI_FALLBACK/FOREMAN_REVIEW.md` Proposal #2.)
- **Color-form completeness check** (visual re-skin SPECs only): for every hex code in the swap map, also grep for the rgba/rgb decimal-channel equivalent in target files. A SPEC that swaps `#6366f1` but misses its rgba sibling (`rgba(99,102,241,*)`) produces post-migration visual drift. Use both:
  ```
  { grep -oE '#[0-9a-fA-F]{3,8}\b' <file>; grep -oE 'rgb[a]?\([0-9 ,.]+\)' <file>; } | sort -u
  ```
  For each rgba hit, mentally convert the decimal triple to `#hex` and verify the swap plan handles BOTH forms. (Harvested from `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposal #1, 2026-05-12 — F1 `rgba(99,102,241,.08)` at blog:101 was missed by the §0 #hex-only audit.)

- **Baselines from LIVE measurement, never from author memory** — every numeric baseline in the §0 Baselines sub-table (row count, file count, line count, hash, tag count, ad-spend total, etc.) MUST be derived by running the corresponding query/command at SPEC authoring time. The query/command appears as a runnable string in the table's "Metric" or adjacent "How measured" column so the Executor can re-run it in pre-flight if needed. Author estimates from memory are FORBIDDEN. Pattern: every `BASE_<scope>_<unit>` symbol cites a runnable command (`wc -l`, `SELECT count(*) FROM ...`, `md5sum`, etc.). SPECs that author baselines from memory have produced drift in 2 of the last 4 SPECs (`STATUS_CHANGE_TRIGGERS_FRAMEWORK` `BASE_PRIZMA_NONTARGET_RULE_COUNT` estimated 10 vs actual 16; `PRIZMA_CRM_BUGFIX_BACKPORT` count-vs-hash semantics). (Harvested from `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1, 2026-05-13.)

(Harvested from `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #2, 2026-05-11. Originally piloted in `M1_5_SKETCH_RESKIN_BATCH_3` as the Palette Pre-Audit. Untracked-files item added 2026-05-12 from `SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` Author Proposal #2. Color-form completeness added 2026-05-12 from `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposal #1. Live-baselines rule added 2026-05-13 from `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` Author Proposal #1.)

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

### Already-done discovery contingency

When the SPEC's background table cites items that may have been independently
closed by other commits since the source REC was filed, include a per-item
"if already done, action" column or sentence in the table. Example:

> "Item B: `_deprecated/` folder — possibly already deleted by storefront
> commit `a4723b5`. If already gone (Step 0b confirms), skip this item and
> report. If present, `git rm -rf`."

This pre-authorizes the executor to skip without an AskUserQuestion when
reality has already moved past the SPEC's premise. Without the contingency,
the executor either stops (wasted time) or proceeds anyway (wrong action).

(Source: improvement A1 from M3_REC014_ORPHAN_CLEANUP FOREMAN_REVIEW, 2026-05-09.)

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
| 6 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → `0` or `2` |

**Every SPEC must include an Integrity Gate criterion** (Iron Rule 31). A SPEC
whose execution ends with a null-byte ERROR in HEAD is not closed — it is open
until the corruption is cleared. Reference: `scripts/verify-tree-integrity.mjs`.

**CRLF-aware diff recipe (Windows-executed SPECs).** Any §3 criterion that uses `diff` against git content MUST include `--strip-trailing-cr`. Without the flag, CRLF normalization on Windows produces alarming false-positives (e.g. 990-deletion ghosts). Standard form:

```
diff --strip-trailing-cr <(git show HEAD:<path>) <path>
```

(Added 2026-05-14 from T3.1 P-ST-04 — `M1_5_CSS_HOUSEKEEPING_POST_FIX/FOREMAN_REVIEW.md` Author Proposal #1.)

**Sweep criteria — link vs comment distinction.** When a §3 success criterion uses bare `grep -r "<old_name>"` to count references to a deleted/moved name, **narrative comments** in the surviving file (file-history docstrings, "merged from foo.html" headers, tombstone markers) will collide with the criterion alongside **live links** (HTML `href`/`src`, JS `import`, string literals consumed at runtime). Either: (a) tighten the regex (`grep -E "(href=|src=|url:|require\(|from\s+).*<old_name>"`) so only live links are counted; OR (b) add a one-line note authorizing the executor to reword narrative comments to satisfy the literal grep. Avoids reactive 1-line edits mid-execution. (Added 2026-05-12 from `SETTINGS_PERMISSIONS_CONSOLIDATION/FOREMAN_REVIEW.md` Author Proposal #1.)

**Multi-form count criteria** (visual re-skin SPECs only). When a SPEC's swap plan produces mixed output tokens (literal hex + rgba decimal + named accent), success criteria that count token instances MUST split the count per produced-token-form. Counting "Navy-token-bearing sites" as a single `≥N` number hides which sub-target was unmet.
- WRONG: `studio ≥ 6 literal #1e3a8a` (when the 7 swap sites produce 5 literal + 1 rgba + 1 navy-soft).
- RIGHT: `studio ≥ 5 literal #1e3a8a + ≥ 1 rgba(30,58,138,*) + ≥ 1 #e6f1fb` (three independently verifiable sub-counts).

(Added 2026-05-12 from `MIGRATION_4_STOREFRONT_STUDIO/FOREMAN_REVIEW.md` Author Proposal #2 — SPEC §5 C4 said `≥6 literal Navy` but the work produced 5 literal + 1 rgba + 1 navy-soft. Work was correct; criterion was wrong.)

---

## 3a. Shared Edit Block (multi-file SPECs only — omit if N=1)

If this SPEC applies the SAME edit to N>1 files, declare the edit template ONCE here. Each per-file commit in §10 references this block by name. The Reviewer can verify the block's content once and check per-commit conformance — no per-file re-verification of identical text.

**Sameness contract:** the inserted/modified content must be byte-identical across all target files. If any file needs per-file customization, do NOT use this section — list each file's edit explicitly in §3 instead.

### Block A — <name>
- **Insertion location** (relative to anchor): <e.g., "inside `<head>`, after the last `<link rel='stylesheet'>` line, immediately before `</head>`">
- **Content** (verbatim — Reviewer diffs this against each commit):
  ```
  <exact text — newlines and whitespace matter>
  ```
- **Files this block applies to:** <list>

(Section added 2026-05-11 from `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #1, harvested after MIGRATION_2 produced 2 commits with the same `<style>` block on `settings.html` + `employees.html`.)

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

### Backup format guidance for DB-DELETE SPECs

When prescribing a pre-DELETE backup JSON, specify in §8 whether the backup
should include heavy payload columns verbatim (e.g. `blocks` JSONB on
`storefront_pages`) or substitute a `_field_omitted_for_brevity` flag.

**Default rule:**
- Include all metadata columns verbatim.
- Substitute heavy payloads (>2KB per row) only when:
  - The data is recoverable from PG point-in-time recovery, AND
  - The SPEC explicitly authorizes the trade-off (state in §8: "Backup may omit `blocks` column; recoverable from PITR").
- Otherwise, include payloads verbatim regardless of size — readability of
  diffs trades against the rare rollback need.

(Source: improvement A2 from M3_REC014_ORPHAN_CLEANUP FOREMAN_REVIEW, 2026-05-09.)

### Rollback SQL must live in `ROLLBACK.md`, not standalone `_down.sql`

When a SPEC needs rollback SQL containing `DROP TABLE`, `DROP POLICY`, `TRUNCATE`, or unscoped `DELETE FROM` literals, those statements MUST live inside a doc-context file (`ROLLBACK.md` in the SPEC folder), fenced as ```sql blocks. Standalone `_down.sql` files trigger the destructive-ops gate because `.sql` files are not in the doc allowlist — even if §7 Destructive Operations declares them. The doc-context allowlist accepts `ROLLBACK.md` automatically.

(Added 2026-05-14 from T3.1 P-ST-03 — `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #1.)

---

## 7. Destructive Operations

Required by Iron Rule 32 (`scripts/checks/destructive-ops-declared.mjs` enforces this in pre-commit + CI). List every destructive operation this SPEC authorizes — file deletes, mass renames (≥5 files), `git rebase`, `git reset --hard`, `git push --force`, SQL `DROP`/`TRUNCATE`/`DELETE` without tenant scope, deletions from governance docs, modification of `main`. If none, write `None.` — the gate will then forbid ALL destructive ops for this SPEC's run.

**Important:** the heading text MUST be exactly `## Destructive Operations` or `## N. Destructive Operations` (where N is a number). The hook's regex does NOT accept `§N.` prefixes.

Example:
1. 1 in-place file overwrite of `<path>` with pre-commit git tag `<tag>`.
2. Additions to `<path>` (no removals, no renames).

(Section added 2026-05-11 from `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1.)

---

## 8. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:
- [file or module]
- [feature or behavior]

### Subset relationships (use only if applicable)

If the SPEC's predicate is intentionally a SUBSET of what a related route /
view / consumer accepts (i.e. SPEC emits FEWER items than the consumer
would render), state this explicitly here:

> "SPEC predicate emits N items; route accepts M items where M > N. The
> delta of (M − N) items is intentional — they exist in the system but
> are excluded from this surface for [reason]. The route will continue
> to serve them at 200 if reached directly. This is not a bug;
> deliberate scope reduction."

This pre-resolves any §4 stop-trigger that would otherwise fire on
"predicate diverges from route filter" — the executor sees the intent
immediately and doesn't have to read both sections to reconcile.

(Source: improvement A1 from M3_SITEMAP_BRAND_404_CLEANUP FOREMAN_REVIEW, 2026-05-09.)

---

> **Authoring note for §2 (Background) sites tables:**
> When citing a hardcoded value, mark each row with one of:
> - **`[customer-facing]`** — value reaches customer screen / SMS / email body / public form
> - **`[internal]`** — appears in staff tooling, preview helpers, debug pages, template editor previews
>
> Iron Rule 9 violations in `[internal]` are real but lower-severity, and the fix differs (tenant-neutral placeholder vs dynamic tenant lookup). The distinction informs both severity and architecture.

---

## 9. Expected Final State

After the executor finishes, the repo should contain:

### New files
- `path/to/new/file1.ts`
- `path/to/new/file2.sql`

**Migration file naming (when SPEC creates a SQL migration):** use
`YYYY_MM_DD_<spec_slug>_up.sql` for the forward migration + a paired
`YYYY_MM_DD_<spec_slug>_down.sql` for the rollback. Both files in the
same commit. The `_up`/`_down` convention is the project standard since
2026-04-29 — do NOT use the older single-prefix `_rollback` suffix.

**Function-EXECUTE permission migrations:** when REVOKEing function-level
EXECUTE GRANTs, the migration MUST include both `REVOKE EXECUTE ... FROM
PUBLIC` AND any role-specific revocation. The PUBLIC line is mandatory
because Postgres grants `EXECUTE TO PUBLIC` at function creation by
default; revoking from `anon` alone is a no-op due to PUBLIC inheritance.
Source: M4_TENANT_ISOLATION_HARDENING_PART2 M4-DB-01.

### Modified files
- `path/to/existing/file.md` — lines {A}–{B} changed: {description}

### Deleted files
- `path/to/old/file.js` (if any)

### DB state
- Table `X` has columns {Y, Z} with expected seed data

### Build-side-effect file expectations

If the SPEC's commands include any build/codegen step (`npm run build`,
`npm run generate`, etc.), explicitly state which files those commands
are expected to regenerate, and whether they should be committed or
restored:

- **Tightly-coupled side-effects** (the SPEC's intent regenerates the file): list here, executor includes in commit.
- **Unrelated build drift** (file regenerates on every build but isn't this SPEC's concern): list here as "executor MUST `git checkout <file>` before staging; log as finding if drift is new".
- **Unknown** (don't know if build touches anything): say so; default rule is restore + log as finding.

Example line for unrelated drift:
> "NOT touched: `src/data/tenant-fallback-map.json` — regenerates on every `npm run build`, restore before commit; pre-existing drift logged as TECH_DEBT M3-DEBT-12."

This prevents the executor from either (a) accidentally polluting the
commit with unrelated drift, or (b) wasting time deciding whether to
restore vs include without authorial guidance.

(Source: improvement A2 from M3_SITEMAP_BRAND_404_CLEANUP FOREMAN_REVIEW, 2026-05-09.)

### Docs updated (MUST include)
- `MASTER_ROADMAP.md` §3 updated if phase status changes
- `docs/GLOBAL_MAP.md` if new functions/contracts
- `docs/GLOBAL_SCHEMA.sql` if new tables/views
- Module's `SESSION_CONTEXT.md`
- Module's `CHANGELOG.md`

---

## 10. Commit Plan

Specify how commits should be grouped. Example:
- Commit 1: `feat(m3): add DNS readiness script` — files A, B
- Commit 2: `docs(m3): update PHASE_B6 SPEC folder with SESSION_CONTEXT entry`
- Commit 3: `chore(spec): close PHASE_B6_DNS_SWITCH with retrospective` (written by executor at end)

---

## 11. Dependencies / Preconditions

- Previous SPEC {X} must be closed
- Tool {Y} must be available (version {Z})
- Credentials {W} must be in `$HOME/.optic-up/credentials.env`

---

### Browser readiness pre-flight (executor instructs at start)

If any QA step in this SPEC names a browser action — "open localhost", "click", "console", "browser", "DOM" — the executor MUST confirm at the start of execution that Chrome is running with `--remote-debugging-port=9222`. If not, surface it in the readiness sentence BEFORE editing any file: "Browser-QA required by SPEC §X.Y but Chrome debug-port not detected — please start Chrome with `--remote-debugging-port=9222` before I proceed past commit."

This converts a mid-execution surprise into a session-start clarification.

If the SPEC's verification is purely SQL/HTTP/script-based and no browser action is needed, state it explicitly: "Pre-flight (executor): SPEC's QA is HTTP-level (curl) + script-based — no browser required. Skip Chrome readiness check."

(Source: improvement A2 from M3_STUDIO_TRANSLATIONS_BRAND_FILTER FOREMAN_REVIEW, 2026-05-09. Symmetric to opticup-executor improvement #1 from same review.)

---

## 12. Lessons Already Incorporated

List every FOREMAN_REVIEW proposal from prior SPECs that was considered and
explain whether this SPEC applies it. This proves the learning loop is
closing, not just accumulating.

- FROM `PHASE_B/FOREMAN_REVIEW.md` → "always pin package versions" → APPLIED in §8.
- FROM `PRE_LAUNCH_HARDENING/FOREMAN_REVIEW.md` → "run image regression check before view changes" → NOT APPLICABLE (no view changes here).

---

## 13. Pre-Merge Checklist

Every SPEC must pass these items before the executor closes it. Any item
failing → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. A null-byte ERROR (exit 1) anywhere in HEAD blocks closure.
- [ ] `git status --short` returns empty (clean tree).
- [ ] HEAD pushed to `origin/develop`.
- [ ] EXECUTION_REPORT.md + FINDINGS.md written in the SPEC folder.
- [ ] **EXECUTION_REPORT.md §7 SPEC_TEMPLATE Version Footprint present** (literal string "No new template improvements to footprint this run" if empty). Foreman hard-fails closure if absent — P-EX-03, current pre-v3 adoption 5.6%.
- [ ] Module ROADMAP / SESSION_CONTEXT / CHANGELOG updated if applicable.

---

## 14. Smoke Test Cases

Each smoke case MUST carry a `Type:` field. Cases marked `visual-browser` MUST NOT appear in an overnight Pipeline SPEC unless the Brief authorizes browser-driving (daytime, chrome-devtools MCP active). For overnight runs, downgrade `visual-browser` cases to `code-review` with a fallback rationale OR defer the case to a daytime follow-up SPEC.

| Case | Type | Inputs | Expected | Pass/Fail rule |
|---|---|---|---|---|
| 1 | db | SQL query | Row count = N | exact match |
| 2 | api | curl request | HTTP 200, JSON shape `{...}` | shape + status |
| 3 | code-review | grep / read | N occurrences of literal | exact count |
| 4 | visual-browser | URL load + DOM probe | element renders | manual or chrome-devtools |

Types:
- **`db`** — pure SQL query against Supabase (MCP `execute_sql`). Deterministic.
- **`api`** — curl/HTTP request against an EF or external endpoint.
- **`code-review`** — grep / file read / static analysis. No runtime.
- **`visual-browser`** — requires a browser session. Day-time only OR fallback to `code-review`.

(Added 2026-05-14 from T3.1 P-ST-05 — `M4_FIX_UNSUBSTITUTED_PLACEHOLDER/FOREMAN_REVIEW.md` Proposal 1. Overnight SPEC's smoke #7 was "open the rule editor and check the dropdown" — only meaningful with a human or chrome-devtools driver, neither available overnight.)

---

## 15. Daniel-Decision Sub-Questions (ONLY if §5 declares STOP-on-Daniel-decision triggers)

When a SPEC declares any §5 stop-trigger that requires Daniel's input (e.g. "if event is closed AND scope expands beyond pre-identified rows → STOP, write escalation"), this section MUST enumerate the specific sub-questions the Executor will ask in the escalation file.

Required structure per Daniel-decision STOP trigger:
1. **Trigger summary** — 1-2 sentences describing the condition.
2. **Sub-questions** — explicit questions, numbered. Each question's answer drives one Option (A/B/C/D) in the resulting escalation file.
3. **Pre-baked Option matrix** — table of (Option | What it does | Trade-offs). Foreman authors this UP FRONT so the Executor doesn't have to invent it at escalation time.

Example (from T1.1 of OVERNIGHT_BUNDLE_2_2026_05_14):

> **Trigger:** repair phase requires re-send to N customers for a now-closed event.
> **Sub-questions:**
> 1. Was the event's `status='closed'` deliberate? (yes → C; no → A or D)
> 2. Is current capacity (max M, registered N) honest?
> 3. Is the marketing template's content still appropriate at this delay?
>
> **Options:** A re-open+resend | B resend-anyway | C accept-loss | D partial-resend (waitlist intersect).

(Added 2026-05-14 from `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA/FOREMAN_REVIEW.md` P-T1.1-1 — Foreman pre-bakes the decision tree so the Executor's escalation file writes itself.)

---

## Appendix A — Common Gotchas (harvested from recent FINDINGS)

Cross-SPEC patterns to watch for. Not section-bound — apply where relevant.

### A1 — Body md5 invariants for RPC bodies

When an RPC body changes (CREATE OR REPLACE), record `pg_get_functiondef(...)` md5 before and after. Many recent SPECs (`M4_REGISTER_LEAD_TO_EVENT_*`, `M3_UTM_TRIPLE_LAYER_PERSISTENCE`, `M4_BROADCAST_ID_PROPAGATION`) cite "body md5 X → Y (+Z bytes)" as a precise change signature. Catches silent regressions when a re-deploy goes through the wrong path.

### A2 — Aggregate hash for bulk row backups

When backing up N rows before a mass UPDATE, capture an aggregate hash (`md5(string_agg(...))`) so a future replay can integrity-check the population. Pattern from `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA` (758-row backup, aggregate md5 `7b66b5789a3c61658d01c3a6366daee9`).

### A3 — `core.autocrlf` warnings on Windows

Edits made on Windows trigger `warning: in the working copy of <path>, LF will be replaced by CRLF the next time Git touches it`. This is informational, NOT a violation. The integrity gate (Iron Rule 31) intentionally excludes CRLF checks because each developer machine's `core.autocrlf` handles line endings.

### A4 — Pre-existing dirty repo at session start

The First Action protocol (CLAUDE.md §1) says: if pre-existing modified/untracked files surface at session start, ask Daniel ONCE, then proceed with selective `git add` by filename. Bundle/overnight SPECs MUST work on a partially-dirty repo without disturbing the unrelated files.

### A5 — EF deploy 5xx pivot

MCP `deploy_edge_function` returns 5xx/InternalServerErrorException ≥7× per month. Pattern OPEN-021: immediately fall through to `supabase functions deploy <fn>` per `opticup-executor` SKILL §5i. Pre-authorize in SPEC §4 Autonomy Envelope. Do NOT escalate — Daniel's answer has been identical every time.

### A6 — Iron Rule 32 false-positive shapes

Three shapes trigger the destructive-ops gate despite legitimate use:
1. **Staged file deletes** — RESOLVED 2026-05-14 by T2.1's auth-parser. Declare in §7 Destructive Operations and they pass.
2. **`_down.sql` rollback artifacts containing DROP** — move SQL into `ROLLBACK.md` inside the SPEC folder.
3. **Keyword-literals in `.js`/`.ts`/`.html` doc comments** — reword (`// DROP a table` → `// removes a table`) or extract prose into adjacent `.md`.

### A7 — UNIQUE constraint must include tenant_id (Iron Rule 18)

Every UNIQUE constraint on a tenant-bearing table MUST include `tenant_id`. The 2026-05-14 architecture debt sweep surfaced 2 critical violations: `auth_sessions.token` and `short_links.code`. Both block multi-tenant coexistence at the constraint level.

---

*End of SPEC_TEMPLATE v3 (2026-05-14). Author: opticup-strategic. v2 archived at `_archive/spec-template-versions/v2_2026_05_14/SPEC_TEMPLATE_v2.md`.*
