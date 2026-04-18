# BLOG_INSTAGRAM_TEMPLATIZE — SPEC Stub (Deferred)

> **Status:** ⏸ DEFERRED — post-merge, non-blocking
> **Created:** 2026-04-15 by opticup-strategic (Foreman)
> **Source finding:** `BLOG_PRE_MERGE_FIXES/FINDINGS.md` FINDING-002
>              + `BLOG_PRE_MERGE_FIXES/FINDINGS_TENANT.md` (82-post enumeration)
> **Blocks merge?** NO. Site is safe to go live with Instagram link hardcoded
> to `optic_prizma` because (a) Prizma is the first tenant and the link points
> to their own Instagram account, and (b) tenant #2 has not onboarded yet.
> This SPEC must land BEFORE tenant #2 onboarding, not before DNS switch.

---

## 1. Problem

82 published `blog_posts` rows contain a hardcoded
`<a href="https://www.instagram.com/optic_prizma/">` link inside `content`.
This violates Iron Rule #9 ("No hardcoded business values") — the Instagram
handle `optic_prizma` is a tenant-scoped configuration value, not a blog
content value.

As long as Prizma is the only tenant using the blog, the site renders
correctly. The moment a second tenant publishes blog posts cloned from
Prizma's corpus, they will inherit Prizma's Instagram link — a production
data leak across tenants.

---

## 2. Why Deferred

Fixing this right now requires either:
- a one-shot `UPDATE blog_posts SET content = REPLACE(...)` against 82 posts
  × 3 language variants (estimated 246 row updates), OR
- a CMS-layer template substitution: replace the literal string with a
  placeholder like `{{tenant.social_instagram}}` resolved at render time
  in the storefront, with the actual handle read from
  `tenants.config_json -> 'social_instagram'` (or a dedicated column on
  `tenants`).

The templated approach is the correct SaaS solution. It is NOT a merge
blocker because Prizma's hardcoded link is still correct for Prizma.

---

## 3. When to Author the Full SPEC

Trigger: **before tenant #2 starts publishing blog posts**, OR earlier if
Prizma changes their Instagram handle.

Expected work:
1. Decide storage: dedicated column `tenants.social_instagram` vs.
   `tenants.config_json -> social_instagram` (aligns with existing
   tenant-config pattern).
2. Storefront render layer: parse `{{tenant.social_instagram}}` tokens
   in blog content; fall back to omission if unset.
3. Blog editor (Studio): insert the token instead of a literal URL when
   the user clicks "Instagram" in the toolbar.
4. One-shot data migration: rewrite the 82 existing posts in all 3
   language variants to use the token. Requires re-running the SPEC's
   regex-replace pattern but substituting the URL with the token.
5. Storefront contract update: document the token in
   `opticup-storefront/VIEW_CONTRACTS.md` under the blog view.

---

## 4. Files to Produce When Activated

When this SPEC is activated, convert this `README.md` into the full
folder-per-SPEC structure:
- `SPEC.md` — full plan authored by opticup-strategic
- `EXECUTION_REPORT.md` + `FINDINGS.md` — at execution close
- `FOREMAN_REVIEW.md` — at review close

---

## 5. Traceability

- Original parent SPEC: `BLOG_PRE_MERGE_FIXES/`
- Origin finding: FINDING-002 ("Hardcoded Tenant Scope Larger Than Expected")
- Full enumeration of affected posts: `BLOG_PRE_MERGE_FIXES/FINDINGS_TENANT.md`
- Iron Rule cited: #9 (no hardcoded business values)

*End of stub. Replace with full `SPEC.md` when work is scheduled.*
