# EXECUTION_REPORT — HERO_VIDEO_SELF_HOSTED

> **Location:** `modules/Module 3 - Storefront/docs/specs/HERO_VIDEO_SELF_HOSTED/EXECUTION_REPORT.md`
> **Written by:** opticup-executor
> **Written on:** 2026-04-18
> **SPEC reviewed:** `SPEC.md` (authored by Cowork session awesome-cool-faraday, 2026-04-18)
> **Start commit (storefront):** `b1a7312`
> **End commit (storefront):** `6145ef9`
> **Duration:** ~10 minutes

---

## 1. Summary

Replaced the YouTube facade in `HeroLuxuryBlock.astro` with a native HTML5 `<video>` tag backed by three pre-built assets (`hero-mobile.mp4`, `hero-desktop.mp4`, `hero-poster.webp`) under `public/videos/`. The change removes ~800KB of YouTube JS that previously caused the PageSpeed regression in POST_DNS_PERF_AND_SEO. Storefront build passes, full-test.mjs (18 tests) all PASS, and the file sits at 97 lines (SPEC cap was 130). One SPEC inconsistency surfaced — SC-11 vs §7 contradiction on the `video_youtube_id` prop — logged in §3 below. Two pieces of pre-existing dirty state in the storefront repo (three misplaced video files at repo root from a prior incomplete attempt) were cleaned up on Daniel's approval (option "a") before work began.

---

## 2. What Was Done (per-commit)

| # | Repo | Hash | Message | Files touched |
|---|------|------|---------|---------------|
| 1 | opticup-storefront | `6145ef9` | `feat(hero): self-hosted MP4 video replacing YouTube iframe for mobile+desktop` | `public/videos/hero-mobile.mp4` (new, 1.61 MB), `public/videos/hero-desktop.mp4` (new, 3.88 MB), `public/videos/hero-poster.webp` (new, 71 KB), `src/components/blocks/HeroLuxuryBlock.astro` (modified, 120→97 lines) |
| 2 | opticup (ERP) | _pending_ | `docs(m3): HERO_VIDEO_SELF_HOSTED close-out` | EXECUTION_REPORT.md + FINDINGS.md + SESSION_CONTEXT.md |

**Verify-script results:**
- Storefront pre-commit hook (file-size, frozen-files, rule-23-secrets, rule-24-views-only) at commit 1: **PASS, 0 violations, 0 warnings**
- `npm run build`: **PASS, exit 0, 5.27s**
- `node scripts/full-test.mjs --no-build`: **PASS, 18/18 tests**

**Success Criteria Verification (all 14 from SPEC §3):**

| # | Criterion | Expected | Actual | Pass? |
|---|-----------|----------|--------|-------|
| 1 | Branch / clean | develop, clean after commit | develop, clean | ✅ |
| 2 | Video files in public/videos/ | 3 files exist | 3 files exist | ✅ |
| 3 | hero-mobile.mp4 size | ~1.6 MB | 1,689,023 B (1.61 MB) | ✅ |
| 4 | hero-desktop.mp4 size | ~3.9 MB | 4,070,315 B (3.88 MB) | ✅ |
| 5 | hero-poster.webp size | ~70 KB | 72,742 B (71 KB) | ✅ |
| 6 | `<video` tag count | ≥ 1 | 1 | ✅ |
| 7 | `youtube.com/embed` count | 0 | 0 | ✅ |
| 8 | Not truncated (last line) | closing tag | `</section>` | ✅ |
| 9 | Line count | ≤ 130 | 97 | ✅ |
| 10 | Build | Exit 0 | Exit 0 | ✅ |
| 11 | `ytimg\|youtube` count | 0 | 1 | ⚠️ (see §3) |
| 12 | `fetchpriority="high"` | present | 1 match | ✅ |
| 13 | `preload="none"` | present | 1 match | ✅ |
| 14 | full-test.mjs | Exit 0 | Exit 0 (18/18) | ✅ |

---

## 3. Deviations from SPEC

| # | SPEC section | Deviation | Why | How resolved |
|---|--------------|-----------|-----|--------------|
| 1 | §3 SC-11 vs §7 | SC-11 expects `grep -cE 'ytimg\|youtube'` → 0, but §7 explicitly says "DO NOT remove the `video_youtube_id` prop" (SaaS Rule 20 backward compat). The prop name contains `youtube`, so keeping it forces 1 match. | The two sections are internally inconsistent. Keeping the prop (§7 is explicit, directly invokes Rule 20) overrides the strict regex. The _intent_ of SC-11 — "no YouTube facade/asset refs" — is fully satisfied: no `i.ytimg.com`, no `youtube.com/embed`, no iframe, no YouTube JS. | Continued per §7. The one match is on `data.video_youtube_id` as the truthiness trigger for the video branch — a prop-name reference, not a YouTube asset reference. |
| 2 | §2 & §10 claim file is truncated at 114 lines | File was actually 120 lines on disk, identical to `git show HEAD:...`. `git diff HEAD` returned empty. | Whoever fixed the prior truncation didn't update the SPEC. No corrective action needed from this SPEC. | Proceeded with in-place Edit calls — no `git checkout HEAD -- ...` required. |

---

## 4. Decisions Made in Real Time

| # | Ambiguous point | My decision | Why this choice |
|---|-----------------|-------------|-----------------|
| 1 | SPEC §8 example shows only `<img>` + `<video>` (no conditional). But §7 says keep image fallback for pages without video. What's the trigger? | Used `data.video_youtube_id` truthiness as the video-branch trigger (unchanged from prior code). | §7 says the prop stays for backward compat; it's the only existing field that encodes "this hero has a video." Renaming to a different trigger would have required DB/type changes that §7 forbids. |
| 2 | Three pre-existing untracked video files sat at storefront repo ROOT (wrong location) — how to handle? | Reported to Daniel with 3 options before starting work; executed option (a) — delete + copy fresh from ERP SPEC folder. | CLAUDE.md First Action step 4 mandates reporting pre-existing dirty state once, then proceeding on user choice. Option (a) gives a clean single source of truth. |

---

## 5. What Would Have Helped Me Go Faster

- **SC-11 regex should have excluded the backward-compat prop name.** A tighter regex like `grep -cE 'i\.ytimg\.com|youtube\.com/embed'` would have been consistent with §7 and I wouldn't have had to reason about SPEC internal contradictions. Cost: ~2 minutes deciding how to reconcile.
- **§2 / §10 should not have asserted the file was truncated without re-checking.** The truncation note from POST_DNS_PERF_AND_SEO was already stale at SPEC authoring time. Cost: ~1 minute running `git diff HEAD` to confirm.
- **A note about the misplaced files already in the storefront root.** The Foreman ran `ffmpeg` locally to produce those three files — it seems a prior attempt dumped them in the wrong directory. Flagging "check for `hero-*.mp4` / `hero-poster.webp` at repo root and delete if present" in §10 Preconditions would have saved the mandatory First Action back-and-forth. Cost: ~1 exchange with Daniel.

---

## 6. Iron-Rule Self-Audit

| Rule | Touched? | Followed? | Evidence |
|------|---------|----------|----------|
| 1 — atomic quantity RPC | No | N/A | No DB writes |
| 2 — writeLog | No | N/A | No quantity/price changes |
| 3 — soft delete | No | N/A | No deletions |
| 5 — FIELD_MAP for new DB fields | No | N/A | No new DB fields |
| 7 — DB via helpers | No | N/A | Renderer-only change |
| 8 — no innerHTML w/ user input | Yes | ✅ | Astro templating, no innerHTML calls; user-supplied `data.image` url is scoped to a CSS `url()` context (unchanged from prior code) |
| 9 — no hardcoded business values | Yes | ✅ | Only static asset paths `/videos/hero-*` which are infrastructure, not business values |
| 12 — file size | Yes | ✅ | File went 120→97 lines, target 300, max 350 |
| 14 — tenant_id on new tables | No | N/A | No new tables |
| 15 — RLS on new tables | No | N/A | No new tables |
| 18 — UNIQUE includes tenant_id | No | N/A | No constraints added |
| 20 — SaaS litmus (backward compat) | Yes | ✅ | `video_youtube_id` prop retained as trigger; pages with existing data continue to work without DB mutation |
| 21 — no orphans / duplicates | Yes | ✅ | Grepped for existing `public/videos/` (none); `<video>` tag usage checked in `src/components/blocks/` (no collision). Also deleted 3 pre-existing misplaced files at repo root per Rule 21 guidance. |
| 22 — defense in depth | No | N/A | No DB reads/writes |
| 23 — no secrets | Yes | ✅ | No secrets added; video URLs are public static assets |
| 24 — Views-only (storefront) | Yes | ✅ | No table access introduced |
| 25 — image proxy mandatory | Yes | ✅ | Videos served as static assets from `public/`, not from Supabase Storage — proxy not applicable |
| 26 — transparent product backgrounds | No | N/A | Hero, not product card |
| 27 — RTL-first | Yes | ✅ | No `left`/`right` added; `inset-0` + `object-cover` are logical-neutral |
| 28 — mobile-first | Yes | ✅ | `<source media="(min-width: 768px)">` picks desktop MP4 only on ≥768px; mobile default is the 1.6 MB variant |

**Rule 21 DB Pre-Flight (though no DB touched):** No new tables, columns, views, RPCs, or FIELD_MAP entries. This SPEC is renderer-only + static assets.

---

## 7. Self-Assessment

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Adherence to SPEC | 9 | All 13 strictly-satisfiable SCs met; SC-11 "failure" is a SPEC internal contradiction (§7 vs §3), not an executor miss |
| Adherence to Iron Rules | 10 | All applicable rules confirmed, including the storefront-specific 24–30 since this is storefront-repo work |
| Commit hygiene | 10 | Single logical commit in storefront, explicit filenames (no `git add -A`), descriptive message citing SPEC and prior post-mortem |
| Documentation currency | 9 | SESSION_CONTEXT.md being updated in the retrospective commit; no MODULE_MAP/GLOBAL_MAP changes needed (renderer change only, no new public API) |
| Autonomy (asked 0 questions) | 8 | One mandatory First Action question (option a/b/c for misplaced files) — unavoidable per CLAUDE.md, but docked 2 pts because a tighter SPEC §10 could have pre-empted it |
| Finding discipline | 10 | 1 finding logged (pre-existing repo-root video cruft), with proper disposition |

**Overall score (weighted average):** 9.3/10

---

## 8. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1
- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"SPEC Execution Protocol" Step 1 (Load and validate the SPEC)
- **Change:** Add a new bullet after the current §1.4 (harvest prior proposals): "**§1.5 (new): Success-Criteria Cross-Check.** For every SC that is a shell-command regex (`grep -c ...`), read the regex against SPEC §7 (Out of Scope) and §8 (Expected Final State). If any directive in §7 or §8 would force the regex to produce a different count than SC declares — STOP and escalate to Foreman before writing code. Do NOT silently continue when SCs contradict §7/§8."
- **Rationale:** In this SPEC, SC-11 (`grep -cE 'ytimg|youtube'` → 0) directly contradicted §7 (keep `video_youtube_id` prop). I reasoned my way through it, but an automated pre-execution check would have flagged it to the Foreman before any work began, and the Foreman could have tightened the regex. Cost me ~2 minutes of real-time reasoning and one SPEC-deviation entry.
- **Source:** §3 Deviation 1, §5 bullet 1.

### Proposal 2
- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"First Action — Every Execution Session" step 4 (Clean repo check)
- **Change:** Extend step 4 with: "**4a. When pre-existing untracked files share a filename pattern with the SPEC's expected new assets** (e.g., the SPEC plans to create `public/videos/hero-*.mp4` and untracked `hero-*.mp4` already sit at repo root), include that specific pattern collision in the options presented to the user. Default-recommend option (a) 'delete the misplaced copies and create fresh from the SPEC-authoritative source' — this maximises the 'SPEC folder = single source of truth' invariant."
- **Rationale:** The generic step-4 question ("stash / leave alone / intentional WIP?") didn't match the actual situation — the untracked files weren't WIP, they were leftovers from an incomplete prior attempt in a wrong location. A pattern-aware prompt would have made the right answer obvious in one exchange rather than requiring me to invent a context-specific three-option menu on the fly. Cost me ~1 exchange round-trip.
- **Source:** §4 Decision 2, §5 bullet 3.

---

## 9. Next Steps

- Commit this report + FINDINGS.md + SESSION_CONTEXT.md update as `docs(m3): HERO_VIDEO_SELF_HOSTED close-out` in the ERP repo.
- Signal Foreman: "SPEC closed. Awaiting Foreman review."
- Daniel will verify the video plays on mobile at `localhost:4321` (storefront dev server) before merging storefront `develop` → `main`.
- Do NOT write FOREMAN_REVIEW.md — that's Foreman's job.

---

## 10. Raw Command Log

Not needed — execution was smooth. Key transitions:
- Pre-work: 3 untracked files at storefront root → option (a) → deleted → clean repo
- Build: `npm run build` exit 0 in 5.27s
- Tests: `node scripts/full-test.mjs --no-build` → 18/18 PASS
- Commit: `6145ef9` on `develop`, pushed to `origin/develop`
