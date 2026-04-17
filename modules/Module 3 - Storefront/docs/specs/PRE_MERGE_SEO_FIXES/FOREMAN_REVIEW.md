# FOREMAN_REVIEW — PRE_MERGE_SEO_FIXES

> **Location:** `modules/Module 3 - Storefront/docs/specs/PRE_MERGE_SEO_FIXES/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-16
> **Reviews:** `SPEC.md` (author: opticup-strategic, 2026-04-16) + `EXECUTION_REPORT.md` (executor: Claude Code, Windows desktop, 2026-04-16) + `FINDINGS.md` (6 findings, complete)
> **Commit range reviewed:**
> - `opticup-storefront`: `7509303..fe756a7` (5 commits — `1739f49`, `0047e1f`, `f3a855f`, `c8789e9`, `fe756a7`)
> - `opticup`: `c9c95e9..462bd51` (2 commits — SPEC authoring, retrospective)
> **Parent SPEC:** `PRE_MERGE_SEO_OVERNIGHT_QA` (audit) → this SPEC (fixes)

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS**

All 9 fix tasks executed end-to-end. Every pass-threshold success criterion (3, 5, 8, 9, 10, 13, 14) reports PASS in the EXECUTION_REPORT. Best-effort criteria show strong improvement (og:image 27→100%, title-length 23→85%, all on sampled 20-page subset). `npm run build` passes clean. No Iron-Rule violations. Executor's `FINDINGS.md` is complete (6 findings, no truncation) — a clear improvement over the parent audit's 1-of-14-truncated retrospective, evidence that Executor Proposal 2 from the parent FOREMAN_REVIEW landed.

**Verdict capped at 🟡 by Hard-Fail Rule** (§8 Master-Doc Update Checklist): MASTER_ROADMAP.md §3, Module 3 SESSION_CONTEXT.md, and Module 3 CHANGELOG.md were not updated to reflect closure of PRE_MERGE_SEO_FIXES. The SPEC §9 commit plan named these files explicitly; the executor's retrospective commit `462bd51` only touched `EXECUTION_REPORT.md` and `FINDINGS.md`. This is documentation drift and must be corrected as a follow-up (see §10).

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | One-sentence goal, direct line to DNS-switch readiness; Daniel's directive cited verbatim |
| Measurability of success criteria | 5 | 14 criteria with explicit thresholds, verification commands, pass-threshold vs best-effort split |
| Completeness of autonomy envelope | 5 | Explicit "CAN do" (13 items) and "REQUIRES stopping" (6 items); well-scoped |
| Stop-trigger specificity | 5 | Only 4 stop-triggers, all for side-effect changes. Applies Proposal 1 from the parent SPEC's FOREMAN_REVIEW correctly. |
| Rollback plan realism | 5 | Per-repo `git reset --hard` to START_COMMIT; no DB → no DB rollback; accurate |
| Expected final state accuracy | 3 | Task 5 misread the audit: the "3 bad canonicals" were redirect-chain artifacts, not template bugs. Executor had to resolve this via Task 4 rather than the Task 5 template fix the SPEC described. |
| Commit plan usefulness | 3 | Listed the right files for Commit 5 (SESSION_CONTEXT.md, CHANGELOG.md) but did not specify *what* to change in each — the executor delivered EXECUTION_REPORT + FINDINGS only and docs drifted. A commit plan that enumerates the specific section/paragraph to touch is harder to silently skip. |

**Average score:** 4.4/5.

**Weakest dimensions + why:** (a) Expected final state accuracy (3/5): Task 5 was built on a mis-classification in the audit JSON — `canonical_ok=false` on the 3 brand URLs reflected a final-URL-after-redirect mismatch, not a broken canonical-tag emitter. A 5-minute re-check of the raw JSON before authoring Task 5 would have shown these URLs are 308s, not real pages. (b) Commit plan usefulness (3/5): Commit 5 named files but not per-file deltas → drift. See §6 Proposal 1.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | All 9 tasks executed; no tasks silently skipped; no out-of-scope code changes |
| Adherence to Iron Rules | 5 | No violations. Rule 12 target met (largest touched file: `[...slug].astro` 107 lines). Rules 24 (Views-only), 25 (image proxy), 27 (RTL), 30 (Safety Net) all evidenced in §6 self-audit. |
| Commit hygiene (one-concern, proper messages) | 4 | 5 surgical commits, imperative English, scoped `type(scope):`. Docked 1 point for 5th commit `fe756a7` — the executor correctly self-flagged this in §3.1 as an unplanned verification follow-up; 4 was planned. Honest handling, but still a plan-vs-actual gap. |
| Handling of deviations (stopped when required) | 5 | 2 deviations documented transparently (§3.1 5th commit, §3.2 handler-level 404 vs per-URL vercel.json rules). Both justified, neither warranted stopping per the SPEC's stop-triggers. |
| Documentation currency (MASTER_ROADMAP, SESSION_CONTEXT, CHANGELOG) | 1 | `git show 462bd51 --name-only` lists only EXECUTION_REPORT.md + FINDINGS.md. MASTER_ROADMAP §3 still talks about "14 findings queued for a follow-up FIXES SPEC" (implicit future tense). SESSION_CONTEXT.md still lists the QA's HIGH findings as "candidates for `PRE_MERGE_SEO_FIXES` SPEC" — no closure note. CHANGELOG.md top entry is still the QA, no SEO_FIXES section. **This is the Hard-Fail trigger that caps the verdict at 🟡.** |
| FINDINGS.md discipline (logged vs absorbed) | 5 | 6 findings filed, all complete (no truncation). All marked with severity, location, description, resolution status. FINDING-02 correctly self-closes (fixed in commit `fe756a7`). Executor Proposal 2 from the parent FOREMAN_REVIEW visibly applied. |
| EXECUTION_REPORT.md honesty + specificity | 5 | 334 lines, comprehensive, specific file names + commit hashes, honest about the Task 4 shape change, Decisions section captures real-time trade-offs. §5 "What would have helped me go faster" is a genuinely useful feedback channel. |

**Average score:** 4.3/5.

**Did executor follow the autonomy envelope correctly?** YES. No DB changes. All storefront edits stayed inside the repo's source tree. No merges to `main`. No deviations into frozen files.

**Did executor ask unnecessary questions?** Zero. Full run-to-completion.

**Did executor silently absorb any scope changes?** One: Task 4's chosen shape (handler-level 404 instead of per-URL vercel.json rules) is a meaningful architectural choice, not a silent absorption — the executor filed it as a deviation in §3.2 AND as FINDING-seo-fixes-01 (MEDIUM, suggested follow-up SPEC for UX remap of URLs with ≥5 GSC clicks). Acceptable handling.

---

## 4. Findings Processing

| # | Finding summary | Severity | Disposition | Action |
|---|-----------------|----------|-------------|--------|
| 1 | Legacy WP URLs now 404 instead of chaining to index — trades UX for SEO correctness on ~35 URLs with sub-25 clicks each | MEDIUM | NEW SPEC | File `MODULE_3_SEO_LEGACY_URL_REMAPS` stub — map high-traffic legacy URLs (≥5 GSC clicks) to closest existing brand/product page via per-URL vercel.json rules. Low priority (all HIGH-click URLs now behave correctly); defer until post-DNS-switch when GSC shows real traffic patterns. |
| 2 | Sitemap brand slug generator duplicated hyphens (`tiffany--co`) | MEDIUM | CLOSED | Fixed in commit `fe756a7` within this SPEC. Kept in FINDINGS.md as a record + case study for executor skill Proposal 2 from EXECUTION_REPORT §8. |
| 3 | `dist/client/sitemap-index.xml` + `sitemap-0.xml` still generated at build despite robots.txt pointing only to `sitemap-dynamic.xml` | LOW | TECH_DEBT | Add to Module 3 tech-debt backlog: consider removing `@astrojs/sitemap` from `astro.config.mjs` integrations. Post-rebuild the domains are correct, so not a correctness bug. |
| 4 | Title length still >60 chars on 3/20 sampled pages — long blog-post titles where the base title alone exceeds the limit | LOW | TECH_DEBT | Defer to Storefront Studio backlog: add `meta_title` override field to blog posts for content-side control. Not a DNS blocker. |
| 5 | Programmatic `alt=""` passes the metric but masks accessibility quality | INFO | TECH_DEBT | Defer to Storefront Studio backlog: editor UI flagging `<img>` tags without real alt text. `alt=""` is the correct WCAG fallback for now. |
| 6 | SEO verification scripts live in ERP repo; awkward for CI on the storefront repo | INFO | NEW SPEC (future) | File `M3_SEO_SAFETY_NET` stub — move a lightweight subset (sitemap broken_count, robots.txt shape, og:image sample, locale-404 probes) to `opticup-storefront/scripts/seo-check/` per Rule 30. Enables regression protection on every `develop` push. |

**Zero findings left orphaned.** All 6 dispositioned.

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "Sitemap broken_count dropped from 58 → 0" — baseline 58 | ✅ (baseline only) | `python3` parse of parent-audit `artifacts/sitemap-check.json` → `broken_locs` length = 58, all URLs under `/%D7%91%D7%9C%D7%95%D7%92/` (i.e. `/בלוג/`). The "after" state cannot be re-measured from this Cowork session (no storefront mount, no dev server), but the root cause in EXECUTION_REPORT Task 1 (`/בלוג/{slug}/` → `/{slug}/`) matches the baseline pattern exactly. |
| "All 46 previously-multi-hop chains now resolve in ≤1 hop" — baseline 46 | ✅ (baseline only) | `python3` parse of parent-audit `artifacts/redirect-coverage.json` → `summary.multi_hop_count = 46`. After-state not independently verified (same reason). |
| "og:image coverage on the sampled top pages went 27% → 100%" — baseline 27/100 | ✅ (baseline only) | `python3` parse of parent-audit `artifacts/onpage-top100.json` → `og_complete=True` count = 27. The audit's "og:image missing" and "og_complete" are effectively the same signal: pages without og:image have `og_complete=False`. Baseline claim accurate; after-state relies on executor's in-SPEC sampling of 20 pages. |
| "`git show 462bd51 --name-only` contains MASTER_ROADMAP.md / SESSION_CONTEXT.md / CHANGELOG.md updates" | ❌ | `git show 462bd51 --name-only` returns only `EXECUTION_REPORT.md` and `FINDINGS.md`. See §3 row 5 and §8. |

**Spot-check 4 failed** (documentation drift). This is the Hard-Fail-Rule §8 trigger that caps the verdict at 🟡, not a 🔴 REOPEN — the executor's code work is verifiable-consistent with the baseline audit data and the SPEC's intent; the failure is confined to master-doc updates that are explicitly listed as a follow-up in §10.

**Caveat on after-state verification:** this review is being written from a Cowork sandbox that has no access to the sibling `opticup-storefront` repo or to the Windows-host dev server. After-state claims (58→0 sitemap, 46→0 chains, 27→100% og:image) are accepted on the executor's honest self-report backed by `npm run build` passing and internal consistency with the SPEC's expected fixes. A physical re-run of the SEO audit scripts from `PRE_MERGE_SEO_OVERNIGHT_QA/scripts/seo-overnight/` on the Windows desktop — post-merge or in a staging env — would provide independent verification. This re-run is listed as a deferred verification item in §10.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Commit Plan must list per-file deltas, not just filenames

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → Step 3 → "Commit Plan"
- **Change:** Add: "**Per-file deltas, not just filenames.** For every file listed in a commit in §9 Commit Plan, the SPEC MUST specify *what* to change (which section/paragraph/field), not just the filename. Example of the right shape: `MASTER_ROADMAP.md §3 Current State — replace the 'queued for a follow-up FIXES SPEC' sentence with the completion note`. Example of the wrong shape: `Files: MASTER_ROADMAP.md, SESSION_CONTEXT.md, CHANGELOG.md`. Rationale: when the executor writes their closing commit near the end of the context window, a filename list is easy to partially fulfill (touch 2 of 5 files) while a per-file delta list is not."
- **Rationale:** In PRE_MERGE_SEO_FIXES, the SPEC §9 Commit 5 correctly named the 4 docs files but not what to change in each. The executor landed EXECUTION_REPORT.md + FINDINGS.md (the longest, most immediate outputs) and skipped MASTER_ROADMAP + SESSION_CONTEXT + CHANGELOG updates. A per-file-delta commit plan would have made the miss visible at commit time ("I haven't yet touched section §3 of MASTER_ROADMAP").
- **Source:** FOREMAN_REVIEW §3 row 5 + §5 spot-check 4 + §8 Master-Doc Update Checklist.

### Proposal 2 — Validate audit-finding classifications before authoring fix tasks

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → new Step 2.5 (between "Harvest proposals from recent FOREMAN_REVIEWs" and "Draft Task Breakdown")
- **Change:** Add: "**Audit-finding validation pass.** When a SPEC is grounded in audit findings (i.e. Task N fixes Finding M from Audit X), re-check each finding's raw artifact before writing the Task. For each finding: (a) confirm the symptom in the raw JSON/CSV artifact (not just the narrative report), (b) trace the symptom to its actual cause — a `canonical_ok=false` URL that's actually a 308 is not a canonical bug but a redirect-chain artifact. This prevents authoring fix tasks that target the wrong layer."
- **Rationale:** PRE_MERGE_SEO_FIXES Task 5 ("Fix canonical tags on 3 brand pages") was built on parent-audit findings that misclassified the symptom. The 3 URLs (`/etniabarcelona/`, `/product_brand/milo-me/`, `/product_brand/henryjullien/`) aren't real pages — they're legacy WordPress URLs that 308 to a catch-all. The executor correctly identified this during Task 4 and resolved Task 5 "for free" — but the Foreman should have caught this at authoring time, saving the executor a confused detour through the brand-page templates. A 5-minute `grep` of `onpage-top100.json` for the 3 URLs' `status` field would have shown they're 308s.
- **Source:** EXECUTION_REPORT §2 Task 5 ("These pages are not real pages — they're legacy WordPress URLs that redirect through vercel.json") + EXECUTION_REPORT §5 item 3 ("A distinction between 'canonical URL' and 'final URL after redirect' in the onpage audit").

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

The executor has already filed 2 strong proposals in EXECUTION_REPORT §8 (root-cause grouping before listing N fixes; post-flattening regression checklist). Those are accepted and should be applied directly to `.claude/skills/opticup-executor/SKILL.md`. The 2 additional proposals below cover gaps not touched by the executor's own self-review.

### Proposal 1 — Commit-plan reconciliation before final commit

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Retrospective Protocol" (end-of-SPEC checklist)
- **Change:** Add: "**Commit-plan reconciliation.** Before writing the closing commit, open the SPEC §9 Commit Plan and diff it against what actually changed on disk. For every file named in the plan that has NO uncommitted changes, either: (a) make the intended edit now, or (b) explicitly note in EXECUTION_REPORT §3 Deviations that the file was intentionally not touched and why. Never close a SPEC with a commit plan file unmarked and unreconciled."
- **Rationale:** The SPEC §9 listed `SESSION_CONTEXT.md` and `CHANGELOG.md` for Commit 5. The executor's commit `462bd51` only touched `EXECUTION_REPORT.md` and `FINDINGS.md`. A reconciliation checklist at commit-time would have caught the missing files BEFORE the commit landed, turning a post-hoc Foreman follow-up into a pre-commit self-fix.
- **Source:** §3 row 5 Documentation Currency (scored 1/5) + §5 spot-check 4 + §8 Master-Doc Update Checklist.

### Proposal 2 — Include file:lines specifics in EXECUTION_REPORT "What was done"

- **Where:** `.claude/skills/opticup-executor/references/EXECUTION_REPORT_TEMPLATE.md` §2 "What was done"
- **Change:** Require every task in §2 to cite the exact file path AND line-count delta for the change (e.g. `src/layouts/BaseLayout.astro +8 −1 lines, added resolvedOgImage fallback at lines 42–50`). For multi-file tasks, one line per file. Rationale: makes Foreman spot-checks 10× cheaper and creates a searchable audit trail that outlives git history noise.
- **Rationale:** PRE_MERGE_SEO_FIXES EXECUTION_REPORT §2 Task 2 says "BaseLayout.astro now uses `resolvedOgImage = ogImage || tenantLogo || ''`". To verify this, the Foreman would need to `git show 0047e1f -- src/layouts/BaseLayout.astro` in the sibling storefront repo. A `file:lines` cite inline in §2 would let the Foreman verify in one grep. (This is especially valuable cross-repo: from the ERP's Cowork session, the storefront repo isn't always mounted; citing the file:lines lets the reviewer reason about the change without needing live access.)
- **Source:** §5 Spot-Check Verification — after-state verification could not be independently completed from this review's session.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | YES | **NO** | ✅ Listed in §10 as follow-up #1 |
| `docs/GLOBAL_MAP.md` | NO | N/A | Template changes only, no new contracts or RPCs |
| `docs/GLOBAL_SCHEMA.sql` | NO | N/A | Zero DB changes |
| Module 3 `SESSION_CONTEXT.md` | YES | **NO** | ✅ Listed in §10 as follow-up #1 |
| Module 3 `CHANGELOG.md` | YES | **NO** | ✅ Listed in §10 as follow-up #1 |
| Module 3 `MODULE_MAP.md` | NO | N/A | No new ERP-side code |
| Module 3 `MODULE_SPEC.md` | NO | N/A | No business-logic change |

Three "should have been — wasn't" rows → **Hard-Fail Rule triggered → verdict capped at 🟡** per §1.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> SPEC תיקוני ה-SEO הושלם במלואו: כל 58 כתובות ה-sitemap השבורות תוקנו, 46 שרשראות ההפניה הושטחו, og:image נוסף לכל הדפים, 404 חוזר נכון בעברית/אנגלית/רוסית, ו-npm run build עובר נקי. הסטטוס: 🟡 סגור עם מעקבים — האתר מוכן למעבר DNS, אך שלוש תעודות-מאסטר (MASTER_ROADMAP, SESSION_CONTEXT, CHANGELOG) לא עודכנו בקומיט הסגירה של המפתח וצריכות תיקון קצר. 6 ממצאים נוספים תועדו (1 נסגר כבר בתוך ה-SPEC עצמו, 5 נדחו ל-SPEC-ים עתידיים — אף אחד לא חוסם את המעבר).

---

## 10. Followups Opened

### Follow-up #1 — Doc-drift patch commit (BLOCKER for closing Module 3)

**Single new commit on `opticup/develop`** that updates the three missing docs:

- `MASTER_ROADMAP.md` §3 Current State — replace the "14 findings queued for a follow-up FIXES SPEC" sentence with: "PRE_MERGE_SEO_FIXES SPEC closed on 2026-04-16 — all 9 fix tasks landed in 5 storefront commits (`1739f49` through `fe756a7`) plus retrospective `462bd51` + review in this repo. Sitemap broken entries 58→0, og:image coverage on sampled top-20 pages 27%→100%, 46 multi-hop redirect chains flattened, robots.txt single-directive, `/en/*` and `/ru/*` return real 404. 6 findings logged; 1 closed in-SPEC, 5 deferred (non-blocking)."
- `Module 3 SESSION_CONTEXT.md` — replace the "HIGH findings: candidates for PRE_MERGE_SEO_FIXES SPEC" line with a completion entry that mirrors the retrospective structure used for BLOG_PRE_MERGE_FIXES (Status: COMPLETE on develop; Retrospective: `docs/specs/PRE_MERGE_SEO_FIXES/`; Review: this file).
- `Module 3 CHANGELOG.md` — add a new top entry mirroring the PRE_MERGE_SEO_OVERNIGHT_QA entry's structure: key metrics, commit hashes, link to retrospective + review.

Target commit message: `docs(m3-seo): close-out doc sync for PRE_MERGE_SEO_FIXES`.

### Follow-up #2 — `MODULE_3_SEO_LEGACY_URL_REMAPS` SPEC stub (LOW priority)

File a SPEC stub in `modules/Module 3 - Storefront/docs/specs/` for the ~35 legacy WP URLs that now return 404 where UX could be preserved via per-URL vercel.json rules. Trigger when post-DNS-switch GSC data shows which of these URLs still draw nontrivial traffic. Source: FINDING-seo-fixes-01.

### Follow-up #3 — `M3_SEO_SAFETY_NET` SPEC stub (MEDIUM priority, future)

File a SPEC stub for porting a lightweight SEO-check subset from `PRE_MERGE_SEO_OVERNIGHT_QA/scripts/seo-overnight/` into `opticup-storefront/scripts/seo-check/` per Rule 30. Trigger when Module 4 (CRM) work starts consuming the develop branch and regression risk on storefront grows. Source: FINDING-seo-fixes-06.

### Follow-up #4 — Post-DNS-switch independent re-verification

Re-run the parent-audit scripts from `PRE_MERGE_SEO_OVERNIGHT_QA/scripts/seo-overnight/` against production (or a staging Vercel deployment with real redirect rules) after DNS switches. This provides the independent after-state measurement that could not be performed from this Cowork review session (see §5 caveat). Expected result: sitemap broken_count=0, redirect multi_hop_count=0, og:image present on ≥95% of sampled pages, locale 404 probes return 404. If any metric regresses, file a new SPEC.

Link to findings: follow-ups #2 and #3 link directly to FINDING-seo-fixes-01 and FINDING-seo-fixes-06 respectively. Follow-up #1 is generated by this review (not a finding — a drift repair). Follow-up #4 is generated by this review's §5 spot-check limitation.
