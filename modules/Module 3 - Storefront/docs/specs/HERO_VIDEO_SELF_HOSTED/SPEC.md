# SPEC — HERO_VIDEO_SELF_HOSTED

> **Location:** `modules/Module 3 - Storefront/docs/specs/HERO_VIDEO_SELF_HOSTED/SPEC.md`
> **Authored by:** opticup-strategic (Foreman)
> **Authored on:** 2026-04-18
> **Module:** 3 — Storefront
> **Phase:** POST-DNS (enhancement)
> **Author signature:** Cowork session awesome-cool-faraday
> **Depends on:** STOREFRONT_DEVELOP_RESET (closed, commit `348b538`)

---

## 1. Goal

Replace the YouTube iframe hero video with self-hosted MP4 files so the video plays on **both mobile and desktop** while maintaining PageSpeed ~90. Mobile gets a 720p/1.6MB video, desktop gets a 1280p/3.9MB video. YouTube facade is removed entirely.

---

## 2. Background & Motivation

The hero section on the Prizma homepage currently shows:
- **Desktop:** YouTube iframe loaded after 4s via facade pattern
- **Mobile:** Static poster image only (YouTube blocked to save 800KB JS)

Daniel wants the video to play on mobile too. The previous attempt (POST_DNS_PERF_AND_SEO) loaded the YouTube iframe on mobile and PageSpeed dropped 89→47. The solution is self-hosted MP4 with `<video autoplay muted loop playsinline>` — zero external JS, native browser playback.

**Three compressed video files have been pre-built by the Foreman** (via ffmpeg from Daniel's original 71.4MB source file):
- `hero-mobile.mp4` — 720p, H.264 baseline, no audio, 1.6 MB
- `hero-desktop.mp4` — 1280p, H.264 main, no audio, 3.9 MB
- `hero-poster.webp` — first frame, 70 KB

**Additional fix:** The file `HeroLuxuryBlock.astro` on disk is truncated at line 114 (should be 120) due to a prior Cowork Write tool issue documented in the POST_DNS_PERF_AND_SEO post-mortem. The git version (`HEAD:src/components/blocks/HeroLuxuryBlock.astro`) is correct. This SPEC rewrites the file anyway, which implicitly fixes the truncation.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch | On `develop`, clean after commit | `git status` |
| 2 | Video files in public/videos/ | 3 files exist | `ls public/videos/hero-mobile.mp4 public/videos/hero-desktop.mp4 public/videos/hero-poster.webp` |
| 3 | hero-mobile.mp4 size | ~1.6 MB (±0.2) | `wc -c public/videos/hero-mobile.mp4` |
| 4 | hero-desktop.mp4 size | ~3.9 MB (±0.3) | `wc -c public/videos/hero-desktop.mp4` |
| 5 | hero-poster.webp size | ~70 KB (±20) | `wc -c public/videos/hero-poster.webp` |
| 6 | HeroLuxuryBlock.astro | Contains `<video` tag | `grep -c '<video' src/components/blocks/HeroLuxuryBlock.astro` → ≥1 |
| 7 | HeroLuxuryBlock.astro | NO YouTube iframe code | `grep -c 'youtube.com/embed' src/components/blocks/HeroLuxuryBlock.astro` → 0 |
| 8 | HeroLuxuryBlock.astro | File not truncated | `tail -1 src/components/blocks/HeroLuxuryBlock.astro` → `</script>` or closing tag |
| 9 | HeroLuxuryBlock.astro | ≤ 130 lines | `wc -l` → ≤ 130 |
| 10 | Build passes | Exit 0 | `npm run build` |
| 11 | No YouTube references in hero | 0 | `grep -c 'ytimg\|youtube' src/components/blocks/HeroLuxuryBlock.astro` → 0 |
| 12 | Poster has fetchpriority high | Present | `grep 'fetchpriority.*high' src/components/blocks/HeroLuxuryBlock.astro` → 1 match |
| 13 | Video has preload="none" | Present | `grep 'preload.*none' src/components/blocks/HeroLuxuryBlock.astro` → 1 match |
| 14 | full-test.mjs passes | Exit 0 | `node scripts/full-test.mjs --no-build` |

---

## 4. Autonomy Envelope

### What the executor CAN do without asking
- Copy the 3 video files from the SPEC folder to `public/videos/`
- Rewrite `HeroLuxuryBlock.astro` to use `<video>` instead of YouTube facade
- Run `npm run build` and `full-test.mjs`
- Commit and push to develop

### What REQUIRES stopping and reporting
- If any of the 3 video files are missing from the SPEC folder → STOP
- If `HeroLuxuryBlock.astro` on disk differs from git HEAD in ways OTHER than the known truncation → STOP
- If the build fails → STOP
- If the file exceeds 130 lines after changes → STOP (Rule 12)
- Any change to files OTHER than `HeroLuxuryBlock.astro` and `public/videos/*`
- Any change to Supabase Views, DB, or other components

---

## 5. Stop-on-Deviation Triggers

- If `git status` shows unexpected modified files at start → STOP
- If `npm run build` fails → STOP
- If the video files are corrupt (0 bytes) → STOP

---

## 6. Rollback Plan

```bash
git checkout HEAD -- src/components/blocks/HeroLuxuryBlock.astro
rm -rf public/videos/hero-*.mp4 public/videos/hero-poster.webp
```

No DB changes to revert.

---

## 7. Out of Scope (explicit)

- **DO NOT modify any other block renderer** (VideoBlock, HeroBlock, EventsShowcase, etc.)
- **DO NOT touch `HeroSection.astro`** (deprecated older component)
- **DO NOT modify DB content** (the `video_youtube_id` field stays in the JSONB — it just won't be used by the renderer anymore for the self-hosted path)
- **DO NOT modify vercel.json, BaseLayout, or any layout file**
- **DO NOT change any EN/RU page — this is renderer-level, applies to all languages automatically**
- **DO NOT upload videos to Supabase Storage** — they go in `public/videos/`
- **DO NOT remove the `video_youtube_id` prop from the TypeScript type** — keep backward compatibility (Rule 20)

---

## 8. Expected Final State

### New files
- `public/videos/hero-mobile.mp4` (1.6 MB)
- `public/videos/hero-desktop.mp4` (3.9 MB)
- `public/videos/hero-poster.webp` (70 KB)

### Modified files
- `src/components/blocks/HeroLuxuryBlock.astro` — YouTube facade replaced with `<video>` tag

### The new HeroLuxuryBlock video section should work like this:

```html
<!-- Poster image: loaded immediately, high priority, shown until video plays -->
<img
  src="/videos/hero-poster.webp"
  alt=""
  class="absolute inset-0 w-full h-full object-cover"
  fetchpriority="high"
/>

<!-- Self-hosted video: replaces poster once it starts playing -->
<video
  autoplay
  muted
  loop
  playsinline
  preload="none"
  poster="/videos/hero-poster.webp"
  class="absolute inset-0 w-full h-full object-cover"
>
  <!-- Mobile gets 720p, desktop gets 1280p -->
  <source src="/videos/hero-desktop.mp4" type="video/mp4" media="(min-width: 768px)" />
  <source src="/videos/hero-mobile.mp4" type="video/mp4" />
</video>
```

**Key design decisions:**
- `preload="none"` — video doesn't download until the browser decides to play it (PageSpeed friendly)
- `poster` attribute — fallback while video loads
- Separate `<img>` with `fetchpriority="high"` — ensures the poster renders in LCP (Largest Contentful Paint) before the video loads
- `<source media="(min-width: 768px)">` — browser picks the right resolution automatically
- `object-cover` on the `<video>` — fills the hero section, cropping excess (same visual as the YouTube version)
- NO JavaScript needed — the `<script>` section for YouTube loading is removed entirely
- `video_youtube_id` prop stays in the TypeScript type for backward compat but is not used when video files exist

### Docs updated
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` (ERP repo) — close-out entry
- EXECUTION_REPORT.md + FINDINGS.md in SPEC folder

---

## 9. Commit Plan

**Storefront repo (1 commit):**

- **Commit 1:** `feat(hero): self-hosted MP4 video replacing YouTube iframe for mobile+desktop`
  - Files: `public/videos/hero-mobile.mp4`, `public/videos/hero-desktop.mp4`, `public/videos/hero-poster.webp`, `src/components/blocks/HeroLuxuryBlock.astro`

**ERP repo (1 commit):**

- **Commit 2:** `docs(m3): HERO_VIDEO_SELF_HOSTED close-out`
  - Files: SPEC folder retrospective + SESSION_CONTEXT.md

---

## 10. Dependencies / Preconditions

- STOREFRONT_DEVELOP_RESET completed — develop = main = `b1a7312` ✅
- Video files pre-built in this SPEC folder:
  - `modules/Module 3 - Storefront/docs/specs/HERO_VIDEO_SELF_HOSTED/hero-mobile.mp4`
  - `modules/Module 3 - Storefront/docs/specs/HERO_VIDEO_SELF_HOSTED/hero-desktop.mp4`
  - `modules/Module 3 - Storefront/docs/specs/HERO_VIDEO_SELF_HOSTED/hero-poster.webp`
- Must be on Windows desktop machine
- **The video files are in the ERP repo's SPEC folder, NOT in the storefront repo.** Copy them to `public/videos/` during execution.

---

## 11. Lessons Already Incorporated

- FROM `POST_DNS_PERF_AND_SEO/REVERT_POST_MORTEM.md` → "YouTube iframe on mobile = ~800KB JS penalty" → APPLIED: using self-hosted MP4 instead, zero external JS.
- FROM `POST_DNS_PERF_AND_SEO/REVERT_POST_MORTEM.md` → "File truncation: always Read end of file after Write" → APPLIED: SC-8 explicitly verifies file is not truncated.
- FROM `POST_DNS_PERF_AND_SEO/REVERT_POST_MORTEM.md` → "One change per commit with measurement" → APPLIED: this SPEC is a single focused change (hero video only).
- FROM `STOREFRONT_DEVELOP_RESET/EXECUTION_REPORT.md` → "Cross-repo SPEC file locations" → APPLIED: §10 explicitly notes video files are in ERP SPEC folder, must be copied to storefront.
- Cross-Reference Check: 0 collisions (no new DB objects, no new functions — only static assets + renderer change).
