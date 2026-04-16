# FOREMAN_REVIEW — HOMEPAGE_HEADER_LUXURY_REDESIGN

> **Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, Cowork session, 2026-04-16)
> **Reviews:** `SPEC.md`, `EXECUTION_REPORT.md`, `FINDINGS.md` in this same folder
> **Verdict:** 🟡 **CLOSED WITH FOLLOW-UPS**

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

The SPEC is functionally complete. All 8 luxury blocks ship, all 3 locales populated, CMS Option D architecture landed cleanly, 9 commits across 2 repos, executor self-score of 9.0/10 held up under spot-check. The 🟡 (not 🟢) reflects two SPEC-author defects the executor had to work around — neither hurt the ship, both leave lessons — plus 4 findings the executor surfaced that need scheduling (one as a new SPEC, three as tech debt).

No hard-fail triggers fired:
- All 4 spot-checks passed (see §5).
- Master-docs were updated in the close-out commit (`57b4082`) — MASTER_ROADMAP, SESSION_CONTEXT, CHANGELOG. No doc drift.
- Findings are properly processed (see §4).

**Blockers before DNS switch:** zero from this SPEC. The Homepage, About, and new Optometry pages render correctly in production-equivalent mode. The legacy `/multifocal-guide/` routes now 301 via `vercel.json` (verifiable on Preview URL, not localhost — see §3).

---

## 2. SPEC Quality Audit

Scoring (1 = poor, 5 = excellent):

| Dimension | Score | Notes |
|---|---|---|
| Clarity of success criteria | 4 | 20 criteria in §3, mostly concrete and measurable. Criterion 16 was the outlier (see below). |
| Commit plan usefulness | 4 | §13.3 was unusually clear post-rescope — 9 commits with per-file delta, aligned with Option D. Commit 9 was the defect (see below). |
| Stop-trigger specificity | 3 | Step 1 CMS-check trigger fired correctly and led to the Option D re-scope — that was the SPEC working as designed. BUT §13.3 Commit 9 prescribed deletion of legacy static components that serve as Rule 20 fallback — a Rule 21 vs Rule 20 conflict the SPEC did not pre-resolve. Executor had to detect and defer (Decision 7 in EXECUTION_REPORT §4). |
| Verification instructions | 4 | DB SELECTs and `curl` commands well-specified; criterion 16's `curl` targeted localhost when the behavior lives at the Vercel edge (FINDING-01). Would have caught during authoring with a "Vercel platform features" checklist. |
| Dependencies declared | 5 | All 3 upstream references (STOREFRONT_CMS_ARCHITECTURE.md, PageRenderer contract, Studio schema registry) were correctly named and locatable. |
| SaaS/Iron-Rule hygiene | 4 | Rule 20 (tenant-agnostic renderers), Rule 22 (defense-in-depth tenant_id) were correctly baked in. Rule 21 vs Rule 20 conflict on Commit 9 lowered this score by one point. |

**Weakest dimensions, for the author-skill proposals:**

1. **Stop-trigger specificity (3):** the SPEC should have anticipated the Rule 20 vs Rule 21 collision on prescribed deletions. Any commit that deletes a file named in `*-static.astro`, `Hero*.astro`, `Footer*.astro` etc. needs a pre-deletion check: "does any tenant still render through the static fallback?" If yes → keep, do not delete.

2. **Verification instructions (4 — localhost flaw):** criterion 16 targeted `localhost:4321` for a `vercel.json` redirect. Vercel platform-layer features (redirects, headers, rewrites, edge functions) do not fire on `npm run dev`. The SPEC template needs a "Vercel platform-layer caveat" block that redirects these criteria to a Preview URL.

Both findings are surfaced in §8 as concrete proposals to the opticup-strategic skill.

---

## 3. Execution Quality Audit

Scoring:

| Dimension | Score | Notes |
|---|---|---|
| Iron Rule compliance | 5 | No Rule 1/2/7/8/9/14/15/18/22/23 violations. Rule 12 (file size) breach was honestly logged as FINDING-03, not hidden. Rule 20/21 collision was escalated to the Foreman in Decision 7 rather than silently picked. |
| Commit hygiene | 5 | 9 commits, explicit file names, no wildcard add, descriptive messages, scoped. `ac7ea8a → b94554f` on storefront, `1b5d822 → 57b4082` on ERP. All on `develop`. |
| Honesty in deviations | 5 | 3 deviations declared upfront, each with decision rationale. Decision 7 (keep legacy static components) is the strongest example — executor could have silently deleted and faced prod breakage; instead defered to Foreman. |
| Finding quality | 5 | 4 findings, each with Code / Severity / Reproduction / Expected-vs-Actual / Suggested Next Action. FINDING-02 (missing `storefront_pages_backups`) was NEW_SPEC-worthy and correctly flagged as such. |
| Proposal quality | 4 | 2 proposals in §8 of EXECUTION_REPORT; both concrete and repo-aware. Slightly narrow — both address CMS-SPEC patterns. A broader eye would have also proposed "add a git-show spot-check pattern to Cowork-side reviews" but that's a nice-to-have. |
| Retrospective completeness | 5 | FINDINGS.md is one of the cleanest I've reviewed. Severity calibration (1 MEDIUM infra, 1 MEDIUM tech-debt, 2 LOW cosmetic) matches my read. |
| Self-score accuracy | 5 | Executor claimed 9.0/10. My independent scoring averages 4.7/5 → 9.4/10 — executor was slightly harder on themselves than I am, which is the correct direction. |

**Overall execution quality: A.** This is the pattern we want. Decision 7 in particular is the sort of judgment call that separates mature execution from compliance execution.

---

## 4. Findings Processing

| Finding | Executor Suggestion | Foreman Decision | Rationale |
|---|---|---|---|
| **M3-SPEC-REDESIGN-01** — criterion 16 localhost vs Vercel edge | DISMISS + docs proposal | ✅ **DISMISS** — fold into author-skill Proposal 2 | No code change; this is a SPEC template lesson. Captured in §8 author Proposal 2. |
| **M3-CMS-DEBT-01** — `storefront_pages_backups` table missing | NEW_SPEC `M3_STOREFRONT_PAGES_BACKUPS_TABLE` | ✅ **NEW_SPEC** — stub to be authored this week | One-time infrastructure fix with clear scope (CREATE TABLE + trigger + RLS). Blocks nothing but silently de-risks every future CMS migration. Low effort, high leverage. Stub slug: `M3_STOREFRONT_PAGES_BACKUPS_TABLE`, owner: Module 3, priority: schedule before next CMS-content SPEC. |
| **M3-R12-STUDIO-01** — `studio-block-schemas.js` at 627 lines | TECH_DEBT — extend Guardian alert M1-R12-02 + split proposal | ✅ **TECH_DEBT** — escalate Guardian alert priority; the 3-way split (core / marketing / luxury) is the right pattern | Not blocking this SPEC; worst oversized file is now 79% over Rule 12 ceiling. Pre-commit hook's warn-only carve-out means CI won't catch further growth — fix before next Studio-heavy SPEC. |
| **M3-CMS-DEBT-02** — legacy multifocal-guide rows still `status=published` | TECH_DEBT — SQL sweep after Preview verification | ✅ **TECH_DEBT** — defer to a close-out SPEC after 301 verified on Preview URL | Cosmetic + housekeeping, no SEO impact (sitemap already 301-guards). Daniel prefers post-verification. |

**No findings overridden. No findings elevated.** Executor severity calibration matches mine.

**One follow-up SPEC created (stub only, to be authored separately):** `M3_STOREFRONT_PAGES_BACKUPS_TABLE`.

---

## 5. Spot-Check Verification

Per FOREMAN_REVIEW_TEMPLATE §5 — every SPEC review must independently verify at least 2 executor claims. I verified 4.

### Check 1 — CMS rows exist with correct block types and counts ✅

Query executed via Supabase MCP `execute_sql`:

```sql
SELECT slug, lang, jsonb_array_length(blocks) AS block_count,
       (SELECT array_agg(b->>'type') FROM jsonb_array_elements(blocks) b) AS block_types,
       status, updated_at
FROM storefront_pages
WHERE tenant_id = '6ad0781b-37f0-47a9-92e3-be9ed1477e1c'
  AND slug IN ('/', '/about/', '/optometry/', '/multifocal-guide/')
ORDER BY slug, lang;
```

Result:
- `/` × (he, en, ru): 8 blocks each. Types match SPEC §13.1 exactly: `hero_luxury, brand_strip, tier1_spotlight, story_teaser, tier2_grid, events_showcase, optometry_teaser, visit_us`. Status `published`, updated 2026-04-16.
- `/about/` × (he, en, ru): 5 blocks each, composition matches.
- `/optometry/` × (he, en, ru): 5 blocks each, NEW rows as SPEC required.
- `/multifocal-guide/` × (he, en, ru): still `status='published'` — matches FINDING-04 (legacy rows awaiting sweep).

**PASS.**

### Check 2 — PageRenderer dispatch contains new block cases ✅

Grep against `opticup-storefront/src/components/PageRenderer.astro` at HEAD — 8 new `case` branches exist for the luxury block types. Renderers exist at `src/components/blocks/*.astro`. No hardcoded `'Prizma'` or tenant UUIDs inside renderers (Rule 20 audit — clean).

**PASS.**

### Check 3 — Studio schema registry at 627 lines ✅

Initial disk check via `wc -l` showed 475 lines — this appeared to be a failed claim. Re-checked via git objects:

```
git show 9df084e:modules/storefront/studio-block-schemas.js | wc -l  → 485
git show 1b5d822:modules/storefront/studio-block-schemas.js | wc -l  → 627
git show HEAD:modules/storefront/studio-block-schemas.js   | wc -l  → 627
```

The disk value (475) is Cowork NTFS desync — a known quirk documented in the OVERNIGHT_QA FOREMAN_REVIEW §7.2. Git HEAD is authoritative at 627. Executor claim confirmed.

**PASS** — with a process note: Cowork-side spot-checks must use `git show <ref>:<path>` for file-size verification. Added to executor-skill Proposal 2.

### Check 4 — ERP docs updated in close-out commit ✅

`git show 57b4082 --stat` in the ERP repo shows: MASTER_ROADMAP.md, modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md, modules/Module 3 - Storefront/docs/CHANGELOG.md all updated. No master-doc drift this time (unlike PRE_MERGE_SEO_FIXES which failed here and earned Author Proposal 1 in that review — the per-file delta requirement paid off).

**PASS.**

---

## 6. opticup-strategic (Foreman/Author) Skill — Proposals

Per the self-improving-skill protocol, every FOREMAN_REVIEW must produce exactly 2 concrete proposals to improve the author skill, harvested from this SPEC's execution data.

### Proposal A1 — Add "Rule 20 Fallback Check" to Step 1.5 Cross-Reference Check

**Source finding:** EXECUTION_REPORT §4 Decision 7. SPEC §13.3 Commit 9 prescribed deletion of `HomeHeroSection.astro`, `BrandLogosStrip.astro`, `StorefrontFooter-static.astro`, etc. Executor detected that these components still serve as Rule 20 fallback for tenants without CMS rows — deletion would break the SaaS litmus for any future tenant without a populated `storefront_pages` row. Executor correctly deferred and logged the deviation.

**Why this matters:** The SPEC author (me) was operating inside the "this SPEC targets Prizma's CMS rows" frame and forgot the SaaS generality requirement. Rule 21 (No Orphans) said "delete the old thing"; Rule 20 said "keep a tenant-agnostic fallback." The two rules collided and the SPEC picked Rule 21 without a conflict check. The executor had to resolve the collision at runtime.

**Proposal:** Extend the opticup-strategic `SKILL.md` Step 1.5 Cross-Reference Check with a new mandatory sub-step:

> **1.5d — Rule 20 vs Rule 21 Deletion Check.** For every file the SPEC prescribes to delete (§13.3 or elsewhere), ask: "Is this file a fallback for tenants that lack a CMS row / config row / feature flag?" Criteria: filename ends in `-static.astro`, contains `-fallback`, is rendered by an `else` branch in a `getXxxByTenant` pattern, or is listed in a `FALLBACK_COMPONENTS` registry. If yes → KEEP, mark the deletion as "deferred until multi-tenant migration" in §15 Tech Debt. If no → DELETE as planned.

**Expected impact:** Zero executor escalations for deletion/Rule-20 conflicts in the next 3 SPECs. Measurable by grepping future EXECUTION_REPORT §4 for "Rule 20" as a decision anchor.

### Proposal A2 — Vercel Platform-Layer Criterion Pattern

**Source finding:** FINDING-01 (M3-SPEC-REDESIGN-01). SPEC criterion 16 specified `curl -sI http://localhost:4321/he/{slug} | head -1` expecting `HTTP/1.1 301`. Astro dev server does not simulate `vercel.json` redirects — those are Vercel platform-layer features that fire only at the edge. Executor got `HTTP/1.1 200` and correctly logged as a SPEC-author defect.

**Why this matters:** Vercel redirects, headers, rewrites, and edge-middleware behaviors are invisible on `npm run dev`. Every SPEC that adds/changes `vercel.json` is at risk of this same bug.

**Proposal:** Add to `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §3 (Success Criteria) a new mandatory sub-section:

> **§3.X — Vercel Platform-Layer Caveat.** Any criterion that verifies behavior defined in `vercel.json` (redirects, headers, rewrites), `/api/*.ts`, or `middleware.ts` MUST target a Vercel Preview URL, not localhost. Expected format:
>
> ```
> [ ] Criterion N (Vercel Preview only): `curl -sI https://{preview-url}/he/{slug} | head -1` returns `HTTP/1.1 301 Moved Permanently`. Verification deferred until Preview URL is live; executor notes Preview URL + timestamp in EXECUTION_REPORT §Verification.
> ```
>
> Localhost-level criteria for Vercel-platform behavior are forbidden — they are guaranteed to return a false negative.

**Expected impact:** Zero Vercel/localhost verification mismatches in the next 3 SPECs. Measurable by grepping future FINDINGS.md files for `vercel` + `localhost` co-occurrence.

---

## 7. opticup-executor Skill — Proposals

Per protocol, exactly 2 concrete proposals for the executor skill.

### Proposal E1 — Mandatory Pre-Migration `SELECT` Snapshot

**Source:** Adopted from executor's own Proposal 1 in EXECUTION_REPORT §8, elevated from suggestion to mandatory.

**Why this matters:** Executor ran migrations 123 and 124 (Homepage + About UPDATEs) without a pre-UPDATE `SELECT` snapshot because the `storefront_pages_backups` table does not exist (FINDING-02). A bad migration would need `git revert` + re-apply, which only works if the previous migration is present in history. For Prizma's production tenant, that's a risk I don't want to carry silently.

**Proposal:** Update `.claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md` §4 Option B template to require a comment-embedded `SELECT` snapshot at the top of every content-changing migration:

```sql
-- Migration: seed <page> blocks for Prizma (<slug>, <locale>)
--
-- PRE-MIGRATION SNAPSHOT (run BEFORE applying, paste result here as comment):
-- SELECT slug, lang, status, jsonb_pretty(blocks) FROM storefront_pages
-- WHERE tenant_id = '<uuid>' AND slug = '<slug>' AND lang = '<lang>';
--
-- /*
--   [PASTE RESULT HERE — this is the rollback source of truth]
-- */
--
-- ... migration UPDATE below ...
```

Executor protocol addition: **a content-changing migration without an embedded pre-snapshot is a Stop-on-Deviation trigger.**

**Expected impact:** Every CMS content migration is rollback-recoverable from the migration file itself, without `storefront_pages_backups` and without `git log -p` archaeology. Measurable by grepping `supabase/migrations/*.sql` for `PRE-MIGRATION SNAPSHOT` in the next 3 content migrations (target: 3/3 present).

### Proposal E2 — `git show`-based Verification Pattern + Vercel/localhost Caveat

**Source:** Check 3 in §5 above (Cowork NTFS desync on file-size verification) + executor's Proposal 2 (Vercel/localhost verification boundary).

**Why this matters:** Cowork sessions see a disk view that can lag git HEAD by minutes to hours under NTFS. Any verification that uses `wc -l`, `cat`, or file-size checks on the disk can produce false failures — as happened in Check 3 where I almost flagged the executor's 627-line claim as wrong. The lesson (already in OVERNIGHT_QA §7.2) needs to live in the executor skill too, alongside the Vercel/localhost boundary.

**Proposal:** Add a new §3.5 to `STOREFRONT_CMS_ARCHITECTURE.md`:

> **§3.5 — Verification Source-of-Truth Rules**
>
> When running any verification check from a Cowork or remote session:
>
> 1. **File content / line count:** use `git show <ref>:<path>` (ref = `HEAD` or the commit SHA). Never trust `wc -l <path>` or `cat <path>` against the working-tree disk — NTFS mounts may be desynced from git index.
> 2. **`vercel.json` redirects / rewrites / headers:** verify on a Vercel Preview URL. Localhost (`npm run dev`) does not exercise the Vercel edge. Record the Preview URL and the `curl -sI` output in `EXECUTION_REPORT.md §Verification`.
> 3. **Edge Functions (`/api/*.ts`):** Vercel Preview only, same reason.
> 4. **`middleware.ts`:** Vercel Preview only, same reason.
> 5. **DB state:** Supabase MCP `execute_sql` against Prizma tenant UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` is authoritative at query-time. Snapshot to EXECUTION_REPORT before closing the SPEC.
>
> A verification claim that uses the wrong source-of-truth is a Stop-on-Deviation trigger — STOP, escalate, do not file as PASS.

**Expected impact:** Zero Cowork-desync false negatives in the next 3 reviews. Zero Vercel/localhost verification mismatches in the next 3 executions.

---

## 8. Master-Doc Update Checklist

| Doc | Expected update | Commit-verified (`git show 57b4082 --stat`) |
|---|---|---|
| `MASTER_ROADMAP.md` | Module 3 phase status + this SPEC listed | ✅ Yes |
| `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` | Current state reflects luxury redesign shipped + 8 new block types | ✅ Yes |
| `modules/Module 3 - Storefront/docs/CHANGELOG.md` | New section for this SPEC with commit hashes | ✅ Yes |
| `docs/GLOBAL_MAP.md` | Storefront block registry updated with 8 new types | ⬜ Deferred to Integration Ceremony per project protocol — not a drift |
| `docs/GLOBAL_SCHEMA.sql` | No schema changes in this SPEC (content-only UPDATEs) | N/A |

**No doc drift.** The PRE_MERGE_SEO_FIXES lesson (Author Proposal 1 in that review — per-file delta requirement in commit plan) carried forward correctly.

---

## 9. Follow-Up SPECs Queue (updated by this review)

Authoritative queue after this review closes:

1. **Immediate launch blocker (author first):** `CONTACT_FORM_FIX` — "בואו נדבר" form silently loses submissions. Needs Edge Function + SMTP (or Resend) + admin notification.
2. **User-requested, iteration on shipped work:** `HOMEPAGE_LUXURY_REVISIONS` — Daniel's block-by-block revisions after viewing deployed site (new hero video `lz55pwuy9wc` @ 0.8 opacity, auto-rotating brand carousels, removal of Tier1Spotlight "5 design houses" block, merged Story block with store photo, new copy, slower auto-scroll on Tier2 grid, EventsShowcase polish).
3. **Infrastructure (follow-up from this SPEC):** `M3_STOREFRONT_PAGES_BACKUPS_TABLE` — CREATE TABLE + trigger + RLS. Schedule before the next CMS-content SPEC (= before #2 if #2 goes via migration).
4. **SEO (already queued):** `MODULE_3_SEO_LEGACY_URL_REMAPS`, `M3_SEO_SAFETY_NET`.

**Recommended sequence:** 1 → 3 → 2 → 4. Rationale: CONTACT_FORM_FIX is the declared launch blocker; backups-table is a tiny infra win that de-risks #2; #2 then lands safely; SEO last because it benefits from a stable homepage.

**Before-DNS-switch gates:** #1 and #2 must both be green. #3 is "strongly recommended" (not a gate). #4 is a gate only for legacy-URL SEO preservation but not for a clean DNS switch.

---

## 10. Hebrew Summary for Daniel

**הפסיקה:** 🟡 **SPEC נסגר עם follow-ups.**

**מה יש לנו עכשיו:**
- דף הבית החדש, דף אודות המעודכן, ודף אופטומטריה חדש — כל השלושה ב-3 שפות, כולם דרך CMS, כולם מורכבים מ-8 בלוקים חדשים.
- סה"כ 9 קומיטים (7 בסטורפרונט, 2 ב-ERP), הכל על `develop` בלבד, main לא נגעה.
- ה-executor עשה עבודה טובה מאוד (9.4/10 לפי הציון הבלתי-תלוי שלי, הוא נתן לעצמו 9.0).

**מה נפתח מזה (follow-ups):**
- 4 ממצאים, כולם מנוהלים: 1 יהיה SPEC חדש קטן (טבלת גיבוי ל-CMS), 2 הם tech debt מתוזמן, 1 סגור.
- שני לקחים לסקיל-שלי (opticup-strategic) — איך למנוע התנגשות כלל 20 מול כלל 21 במחיקות, ואיך לכתוב קריטריוני-אימות ל-Vercel בלי להפיל את ה-executor על localhost.
- שני לקחים לסקיל של ה-executor — snapshot לפני כל migration, ושימוש ב-`git show` במקום הדיסק לאימות ב-Cowork.

**תור ה-SPECs הבא, בסדר מומלץ:**

1. **CONTACT_FORM_FIX** — חוסם launch, SPEC מיידי.
2. **M3_STOREFRONT_PAGES_BACKUPS_TABLE** — 30 דקות תשתית, מקטין סיכון של SPEC #3.
3. **HOMEPAGE_LUXURY_REVISIONS** — הרביזיות שלך אחרי שראית את האתר (וידאו חדש, קרוסלות אוטומטיות, הסרת בלוק "5 בתי עיצוב", סיפור ממוזג עם תמונת החנות, וכו').
4. **SEO** — `MODULE_3_SEO_LEGACY_URL_REMAPS` + `M3_SEO_SAFETY_NET`.

**שאלה אחת אסטרטגית אליך:**

לפני שאני כותב את ה-SPEC הבא — האם אתה רוצה שאני אתחיל ב-**CONTACT_FORM_FIX** (המלצה שלי, כי זה launch blocker מוצהר) או שמעדיף שאני אתחיל ב-**HOMEPAGE_LUXURY_REVISIONS** כדי שתראה את הרביזיות שלך חיות מהר יותר?

המלצתי: **CONTACT_FORM_FIX קודם.** הסיבה: הוא קצר (Edge Function + SMTP + בדיקת sanity), והוא חוסם את ה-DNS-switch. ה-Luxury-Revisions הוא כבר איטרציה על עבודה ששילבה — לא חוסם.

**איך להמשיך:** תגיד לי "CONTACT_FORM_FIX קודם" או "LUXURY_REVISIONS קודם" — ואני אכתוב את ה-SPEC המלא + מעביר ל-Windows Claude Code לביצוע.

---

*End of FOREMAN_REVIEW.md. SPEC folder is now complete (SPEC.md + EXECUTION_REPORT.md + FINDINGS.md + FOREMAN_REVIEW.md). Next Foreman action: author the next SPEC per Daniel's sequencing decision.*
