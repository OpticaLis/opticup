# FINDINGS_TENANT.md — Blog Pre-Merge: Tenant-Specific Content

**Executor:** opticup-executor (Cowork, 2026-04-15)  
**Status:** NOT fixed — flagging only per SPEC §7 ("content work deferred")  
**Action needed:** Daniel to review and update hardcoded values post-DNS-switch

---

## Summary

The SPEC expected 7 posts with hardcoded tenant values (`optic_prizma`, address, phone). The actual scope is **82 posts** containing `https://www.instagram.com/optic_prizma/` links — an Instagram handle specific to Prizma Optics.

**Deviation from SPEC:** Prior audit underestimated scope (counted ~7 from a sample; full query reveals 82). No fix applied per SPEC §7.

---

## Finding 1 — Instagram Handle in `<a href>` (82 posts)

**Pattern:** `<a href="https://www.instagram.com/optic_prizma/">...</a>`  
**Count:** 82 published non-deleted posts across he (many) + en (many) + ru (some)  
**Why it's tenant-specific:** `optic_prizma` is Prizma Optics' Instagram handle. Another tenant using this blog template would render wrong links.  
**Risk level:** LOW — only a SaaS concern; for production use (single tenant), links are correct.  
**Action:** When blog content is templatized for multi-tenant use, these links should read from `tenant_config.social_instagram` rather than hardcoded. Already partially addressed in Close-Out SPEC (M3-SAAS-05b applied CTA presets) but the blog body text was not touched.

### Sample affected posts (first 10 of 82):

| lang | slug |
|------|------|
| he | עדשות-מגע-אשקלון |
| he | איך-לבחור-משקפי-ראייה |
| he | אופטיקה-באשקלון |
| ru | как-выбрать-очки-не-покупайте-очки-пока-не-прочтете-это |
| ru | клалит-платинум-очки-для-взрослых-льгота-которая-улучшает-ваше-зрение |
| en | finding-the-right-optician-in-ashkelon |
| en | how-to-choose-the-right-glasses-read-this-before-you-decide |
| he | אופטיקה-בהסדר-עם-כללית-באשקלון |
| ru | оптика-в-ашкелоне-как-найти-подходящий-салон-оптики-для-вас |
| en | looking-for-an-eyewear-store-in-ashkelon-look-for-prizma |

---

## Finding 2 — Prizma Name in Post Content (he posts)

**Pattern:** Various Hebrew posts contain "אופטיקה פריזמה" (Prizma Optics) as plain text in the article body (not as metadata or config).  
**This is expected editorial content**, not a data-layer hardcode. No action needed for current single-tenant deployment.

---

## Suggested Next Action

Open a follow-up SPEC `BLOG_INSTAGRAM_TEMPLATIZE` to:
1. Update all 82 posts' Instagram CTAs to read from `tenant_config.social_instagram` (or a CMS block variable)
2. Add this as a content quality gate in the blog import pipeline
