# SPEC — BLOG_PRE_MERGE_AUDIT

> **Location:** `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_AUDIT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-15
> **Module:** 3 — Storefront
> **Phase:** Pre-merge-to-main hardening (blocker for Module 3 closeout)
> **Track:** AUDIT ONLY — no content changes. Fixes are a separate SPEC that depends on this one's FINDINGS.md.

---

## 1. Goal

Produce a complete, evidence-backed inventory of content-quality issues across the 174 published blog posts (58 he + 58 en + 58 ru) so Daniel can make informed scope decisions before merge-to-main. The audit must classify every issue with concrete evidence per the opticup-guardian protocol — no inferred findings, no extrapolations. The output is `FINDINGS.md` inside this SPEC folder; zero blog content is modified by this SPEC.

---

## 2. Background & Motivation

Daniel flagged three content-quality concerns that have accumulated in the blog after the WordPress migration:

1. **Language-adaptation bugs.** Articles translated from Hebrew into English and Russian were translated mechanically, without adapting to the target language's grammar or culture. Example confirmed via DB query 2026-04-15: the Hebrew article "משקפיים זה זכר או נקבה?" (about Hebrew grammatical gender of the word "glasses") exists in English as "Are Glasses Masculine or Feminine? 🤔" and in Russian as "Очки - мужского или женского рода? 🤔" — but the Hebrew grammatical confusion it discusses has no equivalent in English (where glasses is "it") or Russian (different grammar system). The translation makes no sense in the target languages. All three share the same Hebrew slug `משקפיים-זה-בלשון-זכר-או-נקבה-🤔` which is itself a bug.

2. **Broken internal links.** Spot check on 12 English posts (2026-04-15) shows every sampled `href` points to the OLD WordPress URL `https://prizma-optic.co.il/...` with Hebrew-encoded URL paths — e.g. `https://prizma-optic.co.il/product-category/%d7%9e%d7%a1%d7%92%d7%a8%d7%95%d7%aa-%d7%a8%d7%90%d7%99%d7%99%d7%94/` (Hebrew "eyewear frames" category). Also found: hardcoded `https://www.instagram.com/optic_prizma/` (violates Iron Rule 9 — no hardcoded tenant values). After DNS switch, these old WordPress URLs will stop working. Total scope: 43 posts per language contain links, ~170 href tags per language, ~510 links total to audit.

3. **Missing images.** Daniel reports visible broken image tags, especially at the bottom of articles, across all three languages — likely from incomplete WordPress media migration. Sample evidence: several `featured_image` paths in DB contain mangled filenames like `/blog/images/_____-___-__-________-_____-___.jpg` (underscores where Hebrew filenames should be), suggesting character-encoding failures during migration. Need to enumerate every `<img>` in every post body + every `featured_image` column value and verify each loads.

This audit must run before merge-to-main because (a) dead internal links kill SEO post-DNS-switch, (b) Hebrew-only content in English pages harms conversion and search ranking, (c) broken images look unprofessional to first-visit users.

This SPEC does not fix anything. It produces a structured findings document that a follow-up SPEC (`BLOG_PRE_MERGE_FIXES`) will execute.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command / method |
|---|-----------|---------------|-------------------------|
| 1 | Branch state | On `develop`, clean | `git branch` → `* develop`; `git status` → clean or handled |
| 2 | All 174 live posts enumerated | 58 he + 58 en + 58 ru (published, not deleted) | `SELECT lang, COUNT(*) FROM blog_posts WHERE is_deleted=false AND status='published' GROUP BY lang` → 58/58/58 |
| 3 | FINDINGS.md exists | File created at `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_AUDIT/FINDINGS.md` | `ls` |
| 4 | FINDINGS.md structure | Follows guardian-protocol format: every finding has Evidence / Result / Action lines, and a severity label | Manual read |
| 5 | Section A — Language-adaptation issues | Every en + ru post scanned for Hebrew-specific concepts (grammar, Hebrew place names, Hebrew-only idioms, Hebrew dates, Hebrew phone formats); each hit quoted with post slug + excerpt + reason it doesn't fit the target language | Covers all 116 non-Hebrew posts |
| 6 | Section B — Internal-link inventory | Every `href` in every post body extracted and classified: (a) external safe (e.g., instagram), (b) OLD WordPress URL (to be replaced), (c) relative link on new site (verify exists), (d) cross-language link (points to Hebrew page from non-Hebrew article or vice versa), (e) hardcoded tenant value (e.g. `optic_prizma`) | Every ~510 href has a row in findings table with URL + post slug + classification |
| 7 | Section B — cross-check total | The href count extracted in FINDINGS.md matches the DB count from the baseline query | `SUM((LENGTH(content) - LENGTH(REPLACE(content,'href=','')))/5)` across all live posts = reported count ±0 |
| 8 | Section C — Image inventory | Every `<img src="...">` in content body + every `featured_image` + every `og_image` enumerated. Each classified: (a) loads OK, (b) 404, (c) mangled filename (underscore-heavy), (d) points to WordPress old domain, (e) points to `/blog/images/...` static path (verify file exists), (f) points to `/api/image/...` proxy (verify source record exists) | Every image has a row with URL + post slug + status code + classification |
| 9 | Section C — per-language count | Total image count per language reported, with broken-count per language | 3 rows in a summary table |
| 10 | Section D — Translation integrity | For every English post with a non-NULL `translation_of`, verify: (a) the source Hebrew post exists and is published, (b) the slug is language-appropriate (not a Hebrew slug on an English post). Same for Russian. | Every translation relationship verified |
| 11 | Section D — slug language mismatches | Any post where the slug language doesn't match the `lang` column is flagged HIGH | Example known: `משקפיים-זה-בלשון-זכר-או-נקבה-🤔` in all 3 langs — the en + ru rows should be flagged |
| 12 | Severity distribution summary | FINDINGS.md §Summary lists: N CRITICAL, N HIGH, N MEDIUM, N LOW, N UNVERIFIED — with one-line rationale for each severity bucket | Present |
| 13 | Decision criteria pre-committed | FINDINGS.md §Decision Framework lists, BEFORE the findings themselves, the rules used to assign severity (per opticup-guardian Step 2). e.g., "broken link in live content = HIGH", "Hebrew-only concept in en/ru article = HIGH", "mangled image filename = MEDIUM unless image fails to load = HIGH" | Present |
| 14 | Guardian Rule 23b compliance | Every CRITICAL and HIGH finding has a concrete Evidence line with a reproducible check (URL + HTTP code, or DB query + result, or file path + line number). Zero "I assume" or "based on typical pattern" language. | Manual review per Step 5 of opticup-guardian |
| 15 | Cross-check spot sample | Executor picks 3 random HIGH findings and re-verifies them at end of audit (per guardian Step 4) | §Spot-Check section in FINDINGS.md confirms re-verification |
| 16 | Language-native review prep | For Section A, for every flagged post the finding includes: (a) original Hebrew text excerpt, (b) current target-language text excerpt, (c) explanation in plain Hebrew for Daniel of why the target-language version doesn't work | Daniel can make accept/reject/rewrite decisions without opening the files |
| 17 | EXECUTION_REPORT.md committed | Same folder as SPEC.md, per folder-per-SPEC protocol | `ls` |
| 18 | No blog content modified | `git diff` on `blog_posts` table rows via `SELECT md5(content) FROM blog_posts` before/after is identical | `SELECT COUNT(*), MAX(updated_at) FROM blog_posts` unchanged from audit-start snapshot |
| 19 | No code files modified | Only files changed in this SPEC are inside `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_AUDIT/` | `git log origin/develop..HEAD --name-only` → only paths under that folder |
| 20 | Commits produced | 1–3 commits, descriptive | `git log origin/develop..HEAD --oneline` |
| 21 | No HIGH/CRITICAL guardian alerts introduced | `docs/guardian/GUARDIAN_ALERTS.md` unchanged by this SPEC | diff |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Read any file in the `opticup` repo
- Run read-only SQL via Supabase MCP (`execute_sql` with SELECT only) — Level 1 autonomy
- Run `curl -I` or `curl -s -o /dev/null -w "%{http_code}"` against any URL listed in blog content, including the OLD WordPress domain `prizma-optic.co.il`, the new storefront at `app.opticalis.co.il`, and the future Vercel domain
- Run `curl` against Supabase Storage public URLs to verify image existence
- Run `ls` and `find` inside the repo to verify static file paths
- Write/edit files inside `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_AUDIT/`
- Commit and push to `develop`
- Apply any improvement proposals from prior FOREMAN_REVIEWs that fit an audit-only SPEC

### What REQUIRES stopping and reporting
- Any INSERT / UPDATE / DELETE / MERGE / ALTER / CREATE / DROP SQL — this is read-only
- Any change to a blog_posts row (content, featured_image, etc.) — even a "small typo fix"
- Any edit outside this SPEC's folder (no code file, no doc file, no config file)
- If the total href count or image count disagrees with the baseline query by more than 0 — STOP and recheck
- If more than 3 URLs fail to resolve at all (not 404 — unreachable, DNS error) — STOP: likely network issue, not data issue
- Any discovery that a blog post is surfacing to the public site in a way that requires IMMEDIATE hiding (e.g., leaking another tenant's data) — STOP, report, do NOT hide on your own
- Any file in `FROZEN_FILES.md` (unlikely — this is doc-only)
- Any merge to `main`

---

## 5. Stop-on-Deviation Triggers (specific to this SPEC)

Beyond CLAUDE.md §9 global triggers:

1. Baseline mismatch — if the initial `SELECT COUNT(*)` returns anything other than 58/58/58 published per language, STOP. Report the actual distribution to Daniel before proceeding — the audit scope changed.
2. Unicode/encoding surprise — if reading post content back produces mojibake (`?????` or `\uXXXX` escapes visible in plain text), STOP. The content column may have had a different encoding assumption and the audit results would be wrong.
3. Rate-limit on image HEAD requests — Supabase Storage or the legacy WordPress domain may throttle. If >10 consecutive requests return 429 or timeout, STOP, report, and resume after a backoff plan.
4. More than 30% of images fail to load — this would suggest a systemic issue (e.g., the static `/blog/images/` folder was never deployed to the new site) rather than post-by-post bugs. STOP and surface the systemic hypothesis before classifying each one individually.

---

## 6. Rollback Plan

Not applicable — this SPEC makes no changes to data or code. If FINDINGS.md turns out to be wrong, it can be regenerated with a fresh run. No git revert needed.

---

## 7. Out of Scope (Explicit)

This SPEC does NOT:

- Modify any blog post content (titles, bodies, slugs, images, categories, tags, SEO fields)
- Rewrite articles for cultural fit — that's the follow-up SPEC `BLOG_PRE_MERGE_FIXES`
- Replace internal links — also fix SPEC
- Re-upload missing images or re-link them — also fix SPEC
- Create or change blog tables, views, or RPCs
- Touch the storefront rendering code (`src/pages/[slug].astro` etc.)
- Touch the ERP Studio blog editor (`modules/storefront/storefront-blog.html`)
- Make SEO meta-tag changes
- Evaluate blog category/tag taxonomy — out of scope
- Audit the ERP-side Studio Blog editor UI — the audit is about CONTENT, not tooling
- Touch `docs/guardian/GUARDIAN_ALERTS.md` (the existing alerts stay; if a new one is needed, propose in FINDINGS.md but do NOT add directly — that's a fix-SPEC action)
- Compare parity with the OLD WordPress site — that work was done in `WORDPRESS_COMPARISON.md` and is independent
- Fix the CLI tool / Studio editor output — this is a data audit only

---

## 8. Expected Final State

After this SPEC closes, the repo state is:

### Files added
- `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_AUDIT/FINDINGS.md` — the audit output, structured per §3 criteria
- `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_AUDIT/EXECUTION_REPORT.md` — executor's retrospective

### Files unchanged
- Everything else. Every `.html`, `.js`, `.md`, `.sql`, `.astro` file in both repos.
- Every row of `blog_posts` (verified via `md5(content)` comparison pre/post).

### DB unchanged
- No DDL, no DML. Only SELECTs.

### Commits
- 1 commit adding the SPEC folder (already present by the time executor starts — this SPEC was committed by strategic chat)
- 1 commit adding `FINDINGS.md`
- 1 commit adding `EXECUTION_REPORT.md` (may be combined with previous if executor prefers)

### Git log shape
```
<hash> docs(m3): blog pre-merge audit findings
<hash> docs(m3): blog pre-merge audit execution report
```

---

## 9. FINDINGS.md Structure (REQUIRED)

The FINDINGS.md file MUST follow this exact skeleton so the follow-up fix-SPEC can be auto-generated from it:

```markdown
# Blog Pre-Merge Audit — FINDINGS

**Audit date:** YYYY-MM-DD
**Executor:** opticup-executor
**Scope:** 174 posts (58 he + 58 en + 58 ru), published, not deleted
**Baseline query run at:** <timestamp>

## Decision Framework (severity rules, pre-committed before data gathering)

- CRITICAL: …
- HIGH: …
- MEDIUM: …
- LOW: …
- UNVERIFIED: …

## Summary

| Severity | Count | Sections |
|----------|-------|----------|
| CRITICAL | N     | …        |
| HIGH     | N     | …        |
| MEDIUM   | N     | …        |
| LOW      | N     | …        |
| UNVERIFIED | N   | …        |

## Section A — Language-Adaptation Issues (en + ru posts)

For each flagged post:

### [SEVERITY] <slug> (<lang>)
- **Evidence:** <DB query + exact quoted text>
- **Result:** <what is wrong in plain Hebrew for Daniel>
- **Action:** <reword / rewrite / keep as-is / delete from this language>
- **Fix owner:** content / code / both

## Section B — Internal Link Inventory

Summary table: classification buckets × language × count.

Then per-post detail table: post slug | href | classification | severity | recommended replacement.

## Section C — Image Inventory

Summary: language | total images | broken count | mangled-filename count | WordPress-domain count.

Then per-image detail table.

## Section D — Translation Integrity

Summary of translation_of relationships. Flag any broken FKs or language-slug mismatches.

## Spot-Check (Guardian Step 4)

3 randomly selected HIGH findings re-verified at end of audit; results logged here.

## Appendix — Baseline Queries

Exact SQL used, with results as of audit timestamp, so the audit is reproducible.
```

---

## 10. Commit Plan

- **Commit 1** (after FINDINGS.md is complete):
  `docs(m3): blog pre-merge audit findings (174 posts, evidence-backed)`
  Files: `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_AUDIT/FINDINGS.md`

- **Commit 2** (after EXECUTION_REPORT.md is written):
  `docs(m3): blog pre-merge audit execution report`
  Files: `modules/Module 3 - Storefront/docs/specs/BLOG_PRE_MERGE_AUDIT/EXECUTION_REPORT.md`

If FINDINGS.md reveals a CRITICAL that would block DNS switch (e.g., blog page loads with JS error on current develop), flag it to Daniel BEFORE commit so strategic chat can decide whether to spawn an emergency-fix SPEC or absorb into BLOG_PRE_MERGE_FIXES.

---

## 11. Lessons Already Incorporated

**Cross-Reference Check completed 2026-04-15** against `docs/GLOBAL_SCHEMA.sql` and `docs/GLOBAL_MAP.md`:
- 0 new DB objects introduced (read-only audit)
- 0 new code files introduced (docs only)
- 0 new function names introduced
- 0 collisions / 0 hits to resolve

This SPEC author harvested from recent M3 FOREMAN_REVIEWs and incorporated:
- Pre-commit to decision criteria (per opticup-strategic Pattern 3) — §9 Decision Framework comes BEFORE the findings themselves, not after.
- Spot-check totals (per opticup-guardian Step 4) — §3 criterion 15 forces a random 3-finding re-verification.
- Maximize autonomy (per opticup-executor self-improvement theme) — the envelope in §4 deliberately allows all read operations and external curl without asking; stop-triggers in §5 are narrow and specific, not "stop if anything feels off".
- Evidence-first structure (per opticup-guardian) — every HIGH/CRITICAL severity must carry a concrete Evidence line in FINDINGS.md; §3 criterion 14 enforces this.
- Hebrew-for-Daniel communication (per Communication Rules) — §3 criterion 16 requires plain Hebrew explanations in Section A so Daniel can decide without reading English analysis.

---

## 12. Dispatch Note to Executor

You are receiving this SPEC under Bounded Autonomy. The plan is approved — begin at First Action step 1, proceed end-to-end, stop only on the triggers in §5 or global §9. Report a concise progress line after Section A completes, after Section B completes, after Section C completes, and when FINDINGS.md is ready for final commit. Every other step runs without checkpointing.

Expected total wall-clock: 20–40 minutes depending on image-URL latency. If curl probes exceed 10 minutes total, surface the bottleneck in EXECUTION_REPORT.md §Lessons-learned so strategic can propose batching in the next SPEC.

---

*End of SPEC.md — BLOG_PRE_MERGE_AUDIT*
