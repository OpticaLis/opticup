# FINDINGS.md — BLOG_PRE_MERGE_FIXES

**Executor:** opticup-executor (Cowork, 2026-04-15)  
**Status:** Findings logged — none require SPEC re-open

---

## FINDING-001 — Hebrew Slug Count Deviation

**Severity:** INFO  
**Location:** `blog_posts` table, en/ru rows  
**Description:** SPEC §8 Expected Final State says "41 posts (21 en + 20 ru)" with Hebrew slugs. Actual count found at execution was 60 posts (20 en + 40 ru) with Hebrew slugs. The grammar article en+ru were already excluded from SPEC §8's count (they were to be soft-deleted first), explaining the discrepancy partially. The full 60 posts included 2 grammar articles that were soft-deleted before slug transliteration, resulting in 58 actual slug updates (19 en + 39 ru).

**Root cause:** Prior audit undercounted ru posts. Audit sampled rather than full-enumerated.  
**Impact:** None. All Hebrew slugs on non-deleted en/ru posts were successfully transliterated. Criteria 5+6 verified.  
**Suggested action:** Dismiss — criterion satisfied.

---

## FINDING-002 — Hardcoded Tenant Scope Larger Than Expected (82 vs 7)

**Severity:** LOW  
**Location:** `blog_posts.content` — 82 published posts  
**Description:** SPEC expected 7 posts with hardcoded tenant values. Actual is 82 (Instagram handle `optic_prizma` in href). See FINDINGS_TENANT.md for full detail.  
**Root cause:** Prior audit searched for `optic_prizma` in a subset, not full-table.  
**Suggested action:** Open `BLOG_INSTAGRAM_TEMPLATIZE` SPEC for CMS templatization. Not a merge blocker.

---

## FINDING-003 — <a href> Regex Required Two Passes

**Severity:** INFO  
**Location:** `blog_posts.content` — WP internal link stripping  
**Description:** The first `regexp_replace` pass (using `([^<]*)` for anchor text) stripped links with plain text anchors but left 14 posts with links whose anchor contained nested HTML (`<span>`, `<strong>`). A second pass was required using `(([^<]|<[^/]|</[^a])*)` to handle nested tags.  
**Root cause:** Script 04 used JavaScript's regex with `.*?` (non-greedy), which isn't available in PostgreSQL POSIX ERE. The alternative pattern works but must be documented for any future re-runs.  
**Suggested action:** Update `04_rewrite_content.mjs` script comments to note the two-pass approach if PostgreSQL direct SQL is used again.

---

## FINDING-004 — Criteria 14, 15, 16 UNVERIFIED (localhost not accessible)

**Severity:** INFO  
**Location:** Storefront (`opticup-storefront` repo)  
**Description:** SPEC criteria 14 (browser spot-check), 15 (build passes), and 16 (blog pages return 200) require `localhost:4321` to be running. This Cowork executor session does not have access to a running storefront dev server. These criteria are marked UNVERIFIED.  
**Suggested action:** Daniel runs localhost verification as part of QA pass per `docs/QA_HANDOFF_2026-04-14.md`. This is the standard QA gate already documented.

---

## FINDING-005 — 4 WP Images Permanently 404

**Severity:** LOW  
**Location:** `blog_posts.content` — 4 posts that referenced these images  
**Description:** 4 WP image URLs returned 404 at migration time. Their `<img>` tags were stripped from content. The posts (he/en/ru variants) now render without those images. If Prizma has original copies of these images, they could be re-uploaded via Studio and the posts re-edited.  
**Images lost:**
- Screen-Shot-2022-05-10-at-14.59.22-1024x613.png
- Screen-Shot-2022-05-10-at-15.04.05-300x300.png
- אופטיקה-באשקלון-1024x722.png
- האם-אתם-עיוורי-צבעים-300x212.jpg  
**Suggested action:** LOW priority. Daniel can re-add from original WP media library if desired.
