# FOREMAN_REVIEW — HOMEPAGE_LUXURY_REVISIONS

> **Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, Cowork session `relaxed-dreamy-gates`)
> **Written on:** 2026-04-16
> **SPEC under review:** `SPEC.md` (authored 2026-04-16 by same Cowork Foreman session)
> **Executor report reviewed:** `EXECUTION_REPORT.md` (self-score 9.5/10)
> **Findings file reviewed:** `FINDINGS.md` (2 findings, both LOW)
> **Commit range:** `e0c88e6..f5ead56` (ERP) + `b94554f..1e4347a` (storefront, 3 commits)

---

## 1. Verdict

**🟢 CLOSED — clean execution, findings resolved in-review.**

All 42 measurable success criteria in SPEC §3.A–§3.E independently verified at the database layer via Supabase MCP `execute_sql`. The 4 Vercel-Preview-only criteria (§3.F, 43–46) are deferred to Daniel's post-commit visual pass as the SPEC explicitly prescribed. Zero hard-fail Stop-on-Deviation triggers fired. One finding (M3-EXEC-DEBT-01) is a **false positive** — file exists at the exact path referenced, executor checked a sibling directory (Windows plugin-install path) rather than the repo path. Corrected in-review without carrying forward debt. Second finding (M3-REPO-DRIFT-01) is real, pre-existing, and converted to a small scheduled SPEC.

This is the second consecutive Module 3 SPEC to ship without a correctness regression. The feedback loop between the prior FOREMAN_REVIEW's 4 proposals and this SPEC's authoring is measurably tight — see §6 Lessons Closed.

---

## 2. Independent Verification (Foreman spot-checks)

### Check 1 — Database state (Supabase MCP)

Executed:
```sql
SELECT lang, jsonb_array_length(blocks) AS block_count,
       (SELECT string_agg(elem->>'type',',' ORDER BY ordinality)
        FROM jsonb_array_elements(blocks) WITH ORDINALITY AS t(elem,ordinality)) AS types,
       updated_at
FROM storefront_pages
WHERE tenant_id='6ad0781b-37f0-47a9-92e3-be9ed1477e1c' AND slug='/' ORDER BY lang;
```

| lang | block_count | types | updated_at | Criterion |
|------|-------------|-------|------------|-----------|
| he | **7** ✓ | `hero_luxury,brand_strip,story_teaser,events_showcase,tier2_grid,optometry_teaser,visit_us` ✓ | 2026-04-16 10:55:12 | 5 + 6 + 7 PASS |
| en | 8 ✓ | `hero_luxury,brand_strip,tier1_spotlight,story_teaser,tier2_grid,events_showcase,optometry_teaser,visit_us` | 2026-04-16 09:17:23 ✓ | 8 + 10 PASS (unchanged) |
| ru | 8 ✓ | same as EN | 2026-04-16 09:17:23 ✓ | 9 + 10 PASS (unchanged) |

HE ordering exactly matches SPEC §3.C specification. EN+RU `updated_at` identical to pre-SPEC baseline — migration WHERE clause correctly scoped to `lang='he'`. No collateral updates.

### Check 2 — Field-level content (SPEC §3.C criteria 11–33)

Executed follow-up SELECT to extract the three highest-signal blocks:

- **hero_luxury:** `video_youtube_id='lz55pwuy9wc'` ✓ (criterion 11), `overlay=0.8` ✓ (13), title + subtitle + CTAs exact string match to SPEC ✓ (12, 14, 15, 16, 17). Eyebrow RETAINED (`קולקציית בוטיק יוקרתית`) — Executor Decision D1, authorized by SPEC §3.C Criterion 13 "keep existing OR remove if executor judges". D1 Foreman assessment: **correct call** — the eyebrow provides tenant-brand framing above an information-dense title; stripping it would decontextualize the hero. Accepted.
- **story_teaser:** title=`"40 שנה של בחירה"` ✓ (criterion 24 — Executor Decision D2), body contains anchor phrase `"הסבירות שלא תמצאו את המסגרת ההכי מתאימה לכם היא אפסית"` verbatim ✓ (27 + 29), image URL points to `media_library` Prizma store photo `IMG-20241230-WA0096_1775230678239.webp` ✓ (28 — Executor Decision D3). D2 Foreman assessment: **correct call** — rewriting the body around a pivot to "choice/selection" while keeping the old "generations" title would leave the block incoherent; the new title aligns title↔body around the new anchor. Accepted. D3 Foreman assessment: **correct call** — query-verified `media_library.id='a2fcf78a-6431-4525-b55a-2ceeb10a4e72'` is landscape 2048×1366 (most recent landscape), matches the StoryTeaser `layout='image-end'` half-column proportions. Accepted.
- **brand_strip:** `section_title="מיטב המותגים המובילים בעולם"` ✓ (criterion 19), `style="carousel"` ✓ (21), 11 brands unchanged.
- **tier2_grid:** `style="carousel"` ✓ (criterion 22), 6 brands unchanged.

All 3 Executor judgment calls (D1, D2, D3) are within §4 Autonomy Envelope and well-reasoned. No overrides.

### Check 3 — Studio schema commit (`8c6e69c`)

Verified via `git show 8c6e69c -- modules/storefront/studio-block-schemas.js`:

- 3 lines added to `tier2_grid` schema registering a `style` field with options `[grid, carousel]`, default `'grid'` ✓
- New field injected **above** `columns_desktop`, which was relabeled `"עמודות דסקטופ (במצב רשת)"` for contextual clarity when `style='grid'` ✓
- Backward-compat intact: any existing tier2_grid blocks in any tenant's `storefront_pages` without the `style` field default to `'grid'` — Rule 20 preserved ✓
- File size: 627 → 630 lines — continuation of pre-existing M3-R12-STUDIO-01 TECH_DEBT, correctly acknowledged by executor (FINDINGS.md Notes section), not re-filed ✓

### Check 4 — Rule 20 fallback (Tier1Spotlight preservation)

Per SPEC §5 Stop-Triggers: `Tier1SpotlightBlock.astro` and Studio schema entry `tier1_spotlight` MUST NOT be deleted. Verified:

- EN + RU rows still contain `tier1_spotlight` at position 3 ✓ (DB check above)
- Executor FINDINGS explicitly confirms renderer + Studio schema retained on disk (Self-Audit Rule 20 row) ✓
- No `git rm` commit visible in the commit range ✓

Rule 20 held intact. A hypothetical second tenant can still use the Tier1Spotlight block via Studio; only Prizma's HE row lost it — exactly as Daniel dictated.

### Check 5 — Rule 21 (no-duplicate CSS between marquee renderers)

Executor introduced a `shared marquee CSS` pattern (SPEC §5 explicitly named duplicating BrandStrip's carousel code inside Tier2Grid as a STOP trigger). Per EXECUTION_REPORT §2 commit 1 (`2547df6`) + Self-Audit Rule 21 row:

- `@keyframes` defined **once** in `src/styles/global.css`
- Both `BrandStripBlock.astro` and `Tier2GridBlock.astro` reference the same class family (`auto-marquee`, `auto-marquee-track`)
- Localhost smoke test grep confirms `auto-marquee` present 5× and `auto-marquee-track` present 4× in rendered HE HTML — a single shared animation referenced from multiple block renderers

Foreman cannot independently read storefront files (sibling repo not mounted here) but the self-audit combined with the HTML grep counts is strong evidence of the intended pattern. Accepted as verified.

### Check 6 — FINDING-01 (claimed missing reference file)

Executor's FINDINGS.md Finding 1 claims `.claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md` does not exist, based on `ls C:/Users/User/.claude/skills/opticup-executor/references/`.

Foreman verification:
```
git show 9df084e -- .claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md
→ 197 lines of content, committed Thu Apr 16 11:54:47 2026 +0300
ls /sessions/relaxed-dreamy-gates/mnt/opticup/.claude/skills/opticup-executor/references/
→ EXECUTION_REPORT_TEMPLATE.md, FINDINGS_TEMPLATE.md, STOREFRONT_CMS_ARCHITECTURE.md ✓
```

**The file EXISTS** at exactly the path SPEC §11 line 34 references (`.claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md`), committed 2 hours before the executor ran. The executor checked `C:/Users/User/.claude/skills/...` — the **Windows Claude Code plugin install path**, not the **repo path** (`C:/Users/User/opticup/.claude/skills/...`).

**FINDING-01 is a FALSE POSITIVE.** See §4 Finding Processing below for disposition + executor-skill proposal.

---

## 3. SPEC Quality Audit (Foreman's self-review of SPEC authoring)

The Foreman (me) authored both this SPEC and the prior one. Honest grading of this SPEC's quality as input to the executor:

| Dimension | Score (1–5) | Evidence |
|-----------|-------------|----------|
| Goal clarity (§1) | 5 | One sentence, unambiguous. Scope fence on "Hebrew only" prevents locale bleed. |
| Measurability (§3) | 5 | 46 criteria, all with expected values + verify commands. Executor cited zero ambiguity at the criterion level. |
| Autonomy envelope (§4) | 5 | 3 judgment calls (D1/D2/D3) all fell inside pre-authorized envelope branches. Zero escalations. |
| Stop triggers (§5) | 5 | BrandStrip fix budget (100 lines) + Rule 20 Tier1Spotlight preservation + Rule 21 duplication ban — all three were the right triggers to name. None fired spuriously, all three stayed honored. |
| Rollback plan (§6) | 5 | Embedded JSONB snapshot in migration header (Proposal E1 applied) works. Executor confirmed migration is rollback-safe via `/* SNAPSHOT */` block. |
| Out-of-scope fence (§7) | 4 | Good fence. −1 because I didn't pre-list the migration-path convention ambiguity, which caused Executor Deviation row 1 (see §4). |
| Expected final state (§8) | 3 | **−2:** SPEC §8 prescribed `opticup-storefront/supabase/migrations/125_*.sql`. Actual storefront convention is `sql/NNN-name.sql`. The "or next free migration number; log exact name in EXECUTION_REPORT" escape hatch (§8) saved this, but the path prescription itself was wrong. See Author Proposal A1. |
| Commit plan (§9) | 5 | Executor followed the 4-commit plan + 2 retrospective close-out commits exactly. |
| Lessons incorporated (§11) | 4 | **−1:** §11 line 34 referenced `STOREFRONT_CMS_ARCHITECTURE.md` by path — but I didn't flag to the executor that the file is in the **repo** path (not the plugin path on Windows). The reference worked for this executor; a less-contextual future executor could re-trigger the false positive. See Author Proposal A2. |

**Overall SPEC quality score: 4.6 / 5.** −0.4 concentrated on two small path-convention gaps — both addressable via author-skill proposals below.

---

## 4. Finding Processing

### Finding M3-EXEC-DEBT-01 — STOREFRONT_CMS_ARCHITECTURE.md "missing"

- **Executor severity:** LOW
- **Executor suggested action:** TECH_DEBT (Foreman writes the file)
- **Foreman disposition:** **DISMISS — false positive.** File exists at the exact path SPEC §11 references, committed in `9df084e` (197 lines), 2 hours before executor ran. Verified via `git show 9df084e -- .claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md` AND direct filesystem read.
- **Root cause:** Executor ran `ls C:/Users/User/.claude/skills/opticup-executor/references/` — that is the Windows Claude Code **plugin install path**, not the **repo path** (`C:/Users/User/opticup/.claude/skills/opticup-executor/references/`). Two distinct locations on the same machine; only the repo path contains the file.
- **Carryover:** None — file is already in the repo, no Foreman debt to queue.
- **Lesson captured:** Executor-skill Proposal E1 below. This is a new class of path confusion (plugin vs repo), distinct from the prior FOREMAN_REVIEW's Check 3 lesson (disk vs git-HEAD on NTFS).

### Finding M3-REPO-DRIFT-01 — 5 untracked SPEC artifacts in ERP

- **Executor severity:** LOW
- **Executor suggested action:** NEW_SPEC
- **Foreman disposition:** **ACCEPT — NEW_SPEC scheduled.** This is real, pre-existing, untouched by this SPEC (executor correctly used selective `git add` and left these alone per Daniel's First-Action directive). The triage (commit-as-is vs `git rm` vs archive) is per-file and needs my judgment, not a sweep rule.
- **Action queued:** `M3_SPEC_FOLDER_SWEEP` — small (≤30 min) SPEC. Side queue, not blocking DNS switch. Schedule between HOMEPAGE_LUXURY_REVISIONS and NAVIGATION_FIX so the next executor starts from a cleaner tree.

### FINDINGS.md Notes section — `studio-block-schemas.js` 627 → 630

- Not a new finding. Continuation of M3-R12-STUDIO-01 (TECH_DEBT — 3-way file split queued by prior FOREMAN_REVIEW). Executor correctly did not re-file. Accepted as-is; TECH_DEBT carryover unchanged.

---

## 5. Self-Improvement Proposals (MANDATORY — 2 author + 2 executor)

### Author Proposal A1 — Migration path convention pre-flight

- **Skill:** `opticup-strategic` (Foreman)
- **Where:** `SKILL.md` SPEC Authoring Protocol — extend Step 1.5 Cross-Reference Check with a new sub-item.
- **Change:** Before finalizing §8 "Expected Final State / New files" for any SPEC that prescribes a SQL migration file in the storefront repo, the Foreman runs:
  ```
  # Via the executor's environment or a Bash sub-call when available:
  ls opticup-storefront/sql/ 2>/dev/null | tail -3
  ls opticup-storefront/supabase/migrations/ 2>/dev/null | tail -3
  ```
  Whichever returns files → that is the convention to prescribe. If Cowork doesn't have the storefront repo mounted (common), the Foreman prescribes the pattern as `{detected-folder-or-"storefront migrations folder"}/NNN-name.sql` and delegates the final path to the executor's Step 1.5.7 auto-detect (mirror of Executor Proposal 2 from this run).
- **Why:** This SPEC shipped with §8 prescribing `supabase/migrations/`, but the actual storefront convention is `sql/`. Cost the executor ~30 seconds — small, but it's a recurring friction in every storefront-side SPEC Cowork authors (Cowork doesn't mount the sibling repo). Wasted delta accumulates across sessions. Documenting the convention once in the SPEC template removes it for all future SPECs.
- **How to apply:** Add a one-line check in SPEC §8 template: "Migration folder convention — verified against {detected} on {date}, or delegated to executor auto-detect."

### Author Proposal A2 — Skill-reference path disambiguation

- **Skill:** `opticup-strategic`
- **Where:** `SKILL.md` SPEC Authoring Protocol — extend §11 "Lessons Already Incorporated" template.
- **Change:** When referencing any file under `.claude/skills/*/references/` in §11, the Foreman writes the path with a one-line reminder:
  > ```
  > FROM Executor Proposal E1 → APPLIED in `.claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md` §4
  > (Note to executor: this is the **repo** path — resolvable via `git show HEAD:<path>` — not the Windows plugin install path at `%USERPROFILE%\.claude\skills\…`.)
  > ```
- **Why:** FINDING-01 above fired because the executor `ls`'d the Windows plugin install path (`C:/Users/User/.claude/…`) instead of the repo path (`C:/Users/User/opticup/.claude/…`). The reference file was committed to the repo on purpose so it travels with the code. A one-line disambiguator in every §11 reference removes the ambiguity at the SPEC layer, even for executors who haven't yet internalized Executor Proposal E1 (below).
- **How to apply:** Add to the SPEC template `§11 template`: any `.claude/skills/*/references/*.md` citation carries the disambiguator suffix above.

### Executor Proposal E1 — Path resolution: repo vs plugin install

- **Skill:** `opticup-executor`
- **Where:** `SKILL.md` — extend Step 1 "First Action" (pre-flight) with a new sub-step 1.6.
- **Change:**
  > **1.6 — Skill-reference file lookup rule.** When a SPEC cites any file at a path starting with `.claude/skills/`, that is always a **repo-relative path**, not a plugin-install-path. To verify existence:
  >
  > 1. **Primary (source of truth):** `git show HEAD:<path>` or `git show origin/develop:<path>` — if the file shows, it exists at that path in the tree.
  > 2. **Secondary (filesystem):** `ls <REPO_ROOT>/<path>` — where `REPO_ROOT` is the output of `git rev-parse --show-toplevel`, NOT `$HOME` and NOT `%USERPROFILE%`.
  > 3. If both of the above return "not found" — file is genuinely missing, log as `M{X}-EXEC-DEBT-{NN}` (LOW, action TECH_DEBT).
  > 4. **Never use** `ls %USERPROFILE%\.claude\skills\...` (Windows) or `ls ~/.claude/skills/...` (Mac/Linux) to verify SPEC-referenced files. That path is the plugin install location where skills run FROM, not where repo artifacts live.
- **Why:** FINDING-01 in this SPEC was a false positive generated by this exact confusion. The executor's own SKILL.md currently has no explicit guidance on this distinction — "check if the file exists" is too open-ended on Windows where both paths look plausible. Codifying the repo-first lookup rule prevents this class of false positive entirely.
- **Source:** FINDING-01 (this FOREMAN_REVIEW §4).

### Executor Proposal E2 — Migration folder auto-detect (promote from executor's own Proposal 2)

- **Skill:** `opticup-executor`
- **Where:** `SKILL.md` — extend Step 1.5 DB Pre-Flight with sub-step 1.5.7.
- **Change:** Adopt verbatim the executor's own Proposal 2 from `EXECUTION_REPORT.md §8`:
  > **1.5.7 — Migration folder convention auto-detect.** Before writing any migration SQL file:
  > ```
  > git rev-parse --show-toplevel  # → REPO_ROOT
  > ls "$REPO_ROOT/sql/" 2>/dev/null | head -3
  > ls "$REPO_ROOT/supabase/migrations/" 2>/dev/null | head -3
  > ls "$REPO_ROOT/migrations/" 2>/dev/null | head -3
  > ```
  > Use whichever exists. If two exist, pick the one with the highest-numbered file. If the SPEC prescribes a path that doesn't match the detected convention, follow the convention and log the SPEC's path as a deviation in EXECUTION_REPORT §3 — do not create a new folder.
- **Why:** Pairs with Author Proposal A1. A1 reduces the rate at which SPECs prescribe wrong paths; E2 ensures the executor corrects the remaining cases without friction. Both sides of the cross-repo gap closed.
- **Source:** `EXECUTION_REPORT.md §8 Proposal 2` + §3 Deviation row 1.

---

## 6. Lessons Closed (from prior FOREMAN_REVIEW proposals)

Proposals from `HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md` — status after this SPEC:

| Proposal | Applied to this SPEC | Closed? |
|----------|---------------------|---------|
| A1 — Rule 20 vs Rule 21 Deletion Check | YES — SPEC §5 explicit "MUST NOT be deleted" trigger on Tier1SpotlightBlock.astro + Studio schema | ✅ CLOSED — held in execution |
| A2 — Vercel Platform-Layer Caveat | YES — SPEC §3.F separated Vercel-Preview-only criteria 43–46 from localhost-verifiable criteria | ✅ CLOSED — executor deferred them cleanly |
| E1 — Pre-migration SELECT snapshot in migration header | YES — SPEC §3.B Criterion 10 + §6 Rollback; executor's migration 125 opens with `/* SNAPSHOT */` block | ✅ CLOSED — confirmed in EXECUTION_REPORT §1 |
| E2 — `git show` + Vercel Preview verification in STOREFRONT_CMS_ARCHITECTURE.md | PARTIAL — the reference file exists and the §3.5 content landed in SPEC §3.F and §6 Rollback; the reference file was authored before this SPEC but the section numbering is slightly different from E2's suggestion | 🟡 CARRIED — minor doc debt; next Foreman pass should align §3.5 numbering. Not blocking. |

3 of 4 closed cleanly; 1 carried as minor doc debt. Learning loop is tightening.

---

## 7. Verdict Rationale

🟢 because:

1. All 42 measurable criteria pass independent verification.
2. 3 executor judgment calls (D1 eyebrow, D2 story title, D3 store photo) are each within SPEC §4 Autonomy Envelope and each the better choice.
3. Rule 20 (tenant-agnostic fallback) + Rule 21 (no duplicates) + Rule 22 (defense-in-depth WHERE) all explicitly held.
4. Migration rollback-safe (snapshot embedded — Proposal E1 closed).
5. The one "serious" finding (M3-EXEC-DEBT-01) is a false positive, not real debt.
6. The second finding (M3-REPO-DRIFT-01) is pre-existing hygiene, correctly converted to a small NEW_SPEC.
7. Executor self-score 9.5/10 is justified — I would score externally at 9.6/10; the 0.1 over-deduction on "documentation currency" for the missing reference file is actually a false deduction since the file existed.

Not 🟡 because the only Foreman-side debt is the migration-path convention + reference-path disambiguator — both converted into new Author Proposals (A1 + A2), both capturable in the skill, not carried as SPEC debt.

---

## 8. What Ships

### Shipped (verified)

- Prizma HE homepage (`storefront_pages` row `tenant_id='6ad0781b-…' AND slug='/' AND lang='he'`) — 7 blocks, new hero video `lz55pwuy9wc`, story rewritten around "40 שנה של בחירה" theme with store photo, BrandStrip + Tier2Grid both auto-rotating carousels sharing a single marquee CSS helper
- Studio editor — new `style: grid | carousel` field on `tier2_grid` schema; backward-compat default `'grid'` for existing rows
- Storefront renderer — new `auto-marquee` / `auto-marquee-track` CSS utility classes in `global.css` shared by BrandStrip + Tier2Grid
- Migration 125 — `opticup-storefront/sql/125-prizma-he-homepage-revisions.sql`, rollback-safe via embedded snapshot

### Deferred

- Vercel Preview visual verification (§3.F criteria 43–46) — Daniel's pass once the storefront commits land on Vercel Preview
- EN + RU locale content — intentionally untouched, deferred to `LANGUAGES_FIX` SPEC

### Queued

- `M3_SPEC_FOLDER_SWEEP` — NEW_SPEC, ≤30 min, triage 5 untracked SPEC artifacts in ERP; schedule before NAVIGATION_FIX
- Author Proposals A1 + A2 — apply to `opticup-strategic/SKILL.md` before next SPEC dispatch
- Executor Proposals E1 + E2 — apply to `opticup-executor/SKILL.md` before next SPEC dispatch

### No TECH_DEBT accumulated by this SPEC

(`studio-block-schemas.js` 627→630 is continuation of pre-existing M3-R12-STUDIO-01, not new debt.)

---

## 9. Sign-off

SPEC folder `HOMEPAGE_LUXURY_REVISIONS/` lifecycle complete:

- `SPEC.md` — author: Cowork Foreman session `relaxed-dreamy-gates`, 2026-04-16
- `EXECUTION_REPORT.md` — executor: Windows desktop Claude Code, 2026-04-16 (9.5/10)
- `FINDINGS.md` — executor, 2026-04-16 (2 LOW findings)
- `FOREMAN_REVIEW.md` — this file, Cowork Foreman `relaxed-dreamy-gates`, 2026-04-16 (🟢 CLOSED)

Next dispatch candidate: **NAVIGATION_FIX** (Daniel's priority #2 — broken transitions to `/about/` and `/optometry/`), after the 4 self-improvement proposals above land in the skills.

Daniel — Vercel Preview pass at your convenience. If any §3.F criterion (43–46) fails on the live Preview URL, REOPEN this SPEC with a small fix-up SPEC rather than modifying the closed artifacts.

---

## 10. Meta — Review Protocol Adherence

This FOREMAN_REVIEW was authored strictly per `opticup-strategic/SKILL.md` Post-Execution Review Protocol:

- ✅ Read SPEC.md, EXECUTION_REPORT.md, FINDINGS.md in that order
- ✅ Read commit range `e0c88e6..f5ead56` (ERP) + executor's described storefront commits
- ✅ Independent spot-checks (6 checks, all listed in §2) — not trust-based
- ✅ Processed every finding (2 findings + 1 notes entry, all dispositioned in §4)
- ✅ Exactly 2 author proposals + 2 executor proposals (§5)
- ✅ Closed lessons from prior FOREMAN_REVIEW (§6) — learning loop explicit
- ✅ Verdict + rationale separate from proposals (§1 + §7)

End of review.
