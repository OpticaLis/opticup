# Dispatch Prompt — HERO_VIDEO_SELF_HOSTED

> **Paste this entire text into a new Claude Code session on the Windows desktop.**
> **Machine:** 🖥️ Windows desktop
> **Repos needed:** `C:\Users\User\opticup` (ERP) + `C:\Users\User\opticup-storefront`
> **Estimated time:** 10 minutes
> **Changes produced:** Hero video plays on mobile+desktop via self-hosted MP4 (no YouTube iframe)

---

## Context

The Prizma homepage hero section currently shows a **static poster image on mobile** and a YouTube iframe (loaded after 4s) on desktop. Daniel wants the video to play on mobile too.

The previous attempt loaded YouTube's iframe on mobile — that brought 800KB of JS and PageSpeed dropped from 89 to 47. It was reverted.

**The solution:** Self-hosted MP4 video files. The browser's native `<video>` element plays them with zero external JS. Three compressed files have been pre-built from Daniel's original 71.4MB source:

| File | Resolution | Size | Usage |
|------|-----------|------|-------|
| `hero-mobile.mp4` | 720p | 1.6 MB | Mobile (<768px) |
| `hero-desktop.mp4` | 1280p | 3.9 MB | Desktop (≥768px) |
| `hero-poster.webp` | 1920x1080 | 70 KB | Instant poster before video loads |

These files are in the **ERP repo** at:
```
C:\Users\User\opticup\modules\Module 3 - Storefront\docs\specs\HERO_VIDEO_SELF_HOSTED\
```

They need to be **copied** to the storefront repo at `public/videos/`.

---

## Your Mission

**Read the SPEC and execute it.** The SPEC is at:
```
C:\Users\User\opticup\modules\Module 3 - Storefront\docs\specs\HERO_VIDEO_SELF_HOSTED\SPEC.md
```

### What you're doing:

1. **Copy the 3 video files** from the ERP SPEC folder → storefront `public/videos/`
2. **Rewrite `HeroLuxuryBlock.astro`** — replace the YouTube facade with a `<video>` tag
3. **Verify** build passes + file integrity
4. **Commit + push** to storefront develop
5. **Write retrospective** to ERP SPEC folder

### The key code change

Replace the YouTube facade in HeroLuxuryBlock.astro with:

```html
<!-- High-priority poster for instant LCP -->
<img
  src="/videos/hero-poster.webp"
  alt=""
  class="absolute inset-0 w-full h-full object-cover"
  fetchpriority="high"
/>

<!-- Self-hosted video: autoplay, muted, looped, no JS needed -->
<video
  autoplay
  muted
  loop
  playsinline
  preload="none"
  poster="/videos/hero-poster.webp"
  class="absolute inset-0 w-full h-full object-cover"
>
  <source src="/videos/hero-desktop.mp4" type="video/mp4" media="(min-width: 768px)" />
  <source src="/videos/hero-mobile.mp4" type="video/mp4" />
</video>
```

And **remove the entire `<script>` section** (lines 94–120 in the git version) — no JavaScript needed for native `<video>`.

### Important notes

- **The file on disk is TRUNCATED** (114 lines, should be 120). The git version (`HEAD:src/components/blocks/HeroLuxuryBlock.astro`) is correct. Start from the git version: `git checkout HEAD -- src/components/blocks/HeroLuxuryBlock.astro` FIRST, then apply changes.
- **Keep the `video_youtube_id` prop in the TypeScript type** (`types-luxury.ts` or `types.ts`) — Rule 20 backward compat. Just don't use it in the renderer.
- **The overlay div stays** — `bg-black/{overlayPercent}` still renders on top of the video.
- **The `data.image` fallback branch stays** — for pages with no video, the image background still works.
- **`object-cover` on the video** is essential — it fills the hero area and crops excess, same visual behavior as the YouTube version.

### Key Paths

- **Storefront repo:** `C:\Users\User\opticup-storefront`
- **ERP repo:** `C:\Users\User\opticup`
- **Video source files:** `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\specs\HERO_VIDEO_SELF_HOSTED\hero-*.mp4` + `hero-poster.webp`
- **Target for videos:** `C:\Users\User\opticup-storefront\public\videos\`
- **File to modify:** `C:\Users\User\opticup-storefront\src\components\blocks\HeroLuxuryBlock.astro`

### Safety

- This is a SINGLE focused change: hero video only
- No DB changes, no view changes, no other component changes
- If build fails → STOP
- If file exceeds 130 lines → STOP (Rule 12)

### What happens after

Daniel will verify the video plays on mobile at localhost:4321, then merge to main for production. PageSpeed should stay ~89 because:
- Zero YouTube JS loaded
- `preload="none"` means video doesn't block page load
- poster.webp (70KB) loads instantly as LCP
- Video streams after page is interactive
