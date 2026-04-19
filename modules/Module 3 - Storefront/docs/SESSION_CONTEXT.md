# Module 3 — Storefront — ERP-Side Session Context

## Current Phase: POST-DNS — production stable, hero video live (2026-04-18)
## Status: 🟢 PRODUCTION LIVE. DNS switched, hero video self-hosted (MP4), ISR caching enabled (24h). Storefront SESSION_CONTEXT updated. PageSpeed baseline ~89.
## Date: 2026-04-18

---

## Session Summary 2026-04-18 (Cowork) — 3 SPECs closed + merge to main

**What was done this session:**
1. **STOREFRONT_REPO_STATE_SNAPSHOT** — read-only diagnostic of dirty repo state. Found: 250+ modified files were CRLF/LF artifacts (resolved), 1 real uncommitted file, develop had reverted perf commits.
2. **STOREFRONT_DEVELOP_RESET** — committed uncommitted docs, tagged perf work as `perf-post-dns-reverted`, reset develop to match main (`b1a7312`). develop = main = production.
3. **HERO_VIDEO_SELF_HOSTED** — replaced YouTube iframe with self-hosted MP4 (`<video autoplay muted loop playsinline>`). 720p/1.6MB mobile, 1280p/3.9MB desktop, 70KB poster. Zero external JS. Daniel verified on localhost, merged to main (`6145ef9`).

**Current production state (main = `6145ef9`):**
- Hero video plays on mobile + desktop via native `<video>` element
- PageSpeed expected ~89 (no YouTube JS penalty)
- All 76 published pages serving 200
- DNS: `prizma-optic.co.il` → Vercel, SSL active

**Remaining post-launch queue:**
1. ~~JSON-LD URLs~~ — ✅ DONE (2026-04-18). 6 files fixed, pending commit+push.
2. ~~ISR caching~~ — ✅ DONE (2026-04-18). `isr: { expiration: 86400 }`, live on production.
3. ~~CSP header~~ — ✅ DONE (2026-04-18). Report-Only added to vercel.json, pending commit+push.
4. ~~Hebrew titles in EN/RU~~ — ✅ DONE (2026-04-18). 9 DB rows fixed, zero Hebrew remains.
5. Perf/SEO remaining — supersale h1+schema, CMS page h1, image w/h, WebP brand logos (cherry-pick from tag `perf-post-dns-reverted`, one at a time)
6. BrandShowcase scroll fixes — 3 open issues
7. Homepage revisions — Daniel's block-by-block feedback
8. Contact form — intentionally hidden (WhatsApp only). Resend integration deferred.

**None of the above are blockers. Site is live and functional.**

---

## Execution Close-Out 2026-04-18 (night) — HERO_VIDEO_SELF_HOSTED

**Deliverables (inside `docs/specs/HERO_VIDEO_SELF_HOSTED/`):**
- `SPEC.md` — Foreman-authored (Cowork session awesome-cool-faraday), 14 measurable SCs, 1-commit plan
- `EXECUTION_REPORT.md` — retrospective (self-score 9.3/10), 13/14 SCs strictly met (SC-11 regex conflicts with §7's "keep `video_youtube_id` prop" directive), 2 executor-skill proposals
- `FINDINGS.md` — 2 findings: `M3-DEBT-11` (pre-existing misplaced hero-*.mp4 at storefront repo root — resolved in First Action), `M3-DOC-03` (SPEC stale about file truncation — file was already intact)

**Storefront operations executed:**
- First Action: 3 untracked `hero-*.mp4/.webp` files at repo root (from prior incomplete attempt) → Daniel selected option (a) → deleted, fresh copies pulled from ERP SPEC folder into `public/videos/`
- `HeroLuxuryBlock.astro` rewritten: YouTube facade + 27-line `<script>` removed, replaced with `<img fetchpriority="high">` + `<video autoplay muted loop playsinline preload="none">` with `<source media="(min-width:768px)">` for desktop and mobile MP4s. File went 120→97 lines (well under the 130 cap).
- `data.video_youtube_id` prop retained as the truthiness trigger (per SPEC §7 + SaaS Rule 20 backward compat)
- Commit `6145ef9` on storefront `develop` — `feat(hero): self-hosted MP4 video replacing YouTube iframe for mobile+desktop` — pushed to origin
- `npm run build` → exit 0 in 5.27s; `node scripts/full-test.mjs --no-build` → 18/18 PASS; pre-commit hooks (file-size, frozen-files, rule-23-secrets, rule-24-views-only) → 0 violations

**Key design decisions locked in:**
- `preload="none"` on the `<video>` — video does NOT block page load; browser decides when to stream
- Separate `<img>` with `fetchpriority="high"` — guarantees poster.webp is the LCP element before video arrives
- `<source media="(min-width: 768px)">` first → browser picks desktop MP4 only on ≥768px, mobile serves the 1.6 MB variant
- Zero external JS — native browser `<video>` element, no YouTube player library
- `video_youtube_id` JSONB field in DB unchanged — no migration needed, all existing pages continue to render the hero video

**Expected PageSpeed behaviour:** stays ~89 (baseline) because no YouTube JS loaded, poster.webp renders instantly for LCP, video streams after page is interactive. Daniel to verify on mobile.

**Next step:** Awaiting Foreman review → `FOREMAN_REVIEW.md`. After Daniel confirms mobile playback, storefront `develop` → `main` merge by Daniel.

---

## Execution Close-Out 2026-04-18 (late evening) — STOREFRONT_DEVELOP_RESET

**Deliverables (inside `docs/specs/STOREFRONT_DEVELOP_RESET/`):**
- `SPEC.md` — Foreman-authored, 6-step reset plan with full success criteria and rollback path
- `EXECUTION_REPORT.md` — retrospective (self-score 9.8/10) + 2 executor-skill proposals (numeric tolerance encoding, cross-repo SPEC pattern reference)
- `FINDINGS.md` — no out-of-scope findings (pure mechanical cleanup SPEC; all state already catalogued by the predecessor snapshot SPEC `c36a8b3`)

**Storefront operations executed:**
- Commit `9582a2f` on storefront — `docs(storefront): preserve post-regression SESSION_CONTEXT updates` (the one uncommitted doc file preserved before reset)
- Annotated tag `perf-post-dns-reverted` → `9582a2f` — pushed to origin. Full perf history (`0a04ccf` ← `dd7ddcf` ← `9056307` ← `8106116` ← all POST_DNS_PERF_AND_SEO commits) reachable via `git log perf-post-dns-reverted` for future cherry-picking.
- `git reset --hard origin/main` on storefront develop → HEAD = `b1a7312`
- `git push --force-with-lease origin develop` — succeeded, forced-update `9582a2f...b1a7312`
- `npm run build` — exit 0, "Complete!" in 4.94s
- Critical files verified: vercel.json (8601 lines), tsconfig.json (5), global.css (128 — main's pre-perf version), index.astro + BaseLayout.astro present

**Final state (storefront):**
- `origin/develop` = `origin/main` = `b1a7312`
- Tag `perf-post-dns-reverted` = `9582a2f` (published to origin)
- `main` untouched throughout (still `b1a7312`)
- Working tree clean, build passes

**Rollback path (if ever needed):** `git checkout develop && git reset --hard perf-post-dns-reverted && git push --force-with-lease origin develop`

**Next step:** Awaiting Foreman review → `FOREMAN_REVIEW.md` → new SPEC for per-change cherry-pick with PageSpeed measurement. Out of scope for this SPEC: any perf change re-application.

---

## Execution Close-Out 2026-04-18 (evening) — STOREFRONT_REPO_STATE_SNAPSHOT

**Deliverables (inside `docs/specs/STOREFRONT_REPO_STATE_SNAPSHOT/`):**
- `SPEC.md` — Foreman-authored, 8-mission read-only diagnostic
- `SNAPSHOT_REPORT.md` — raw output of all 8 missions + executive summary + 4 cleanup options
- `EXECUTION_REPORT.md` — retrospective (self-score 9.5/10) + 2 executor-skill proposals
- `FINDINGS.md` — 3 findings (1 INFO state drift, 1 LOW uncommitted docs on storefront develop, 1 MEDIUM autocrlf × .gitattributes conflict)

**Key conclusions from the snapshot:**
- The "messy state" described in the dispatch prompt (250+ modified files, staged deletions) was **no longer present** at execution time — likely resolved between Cowork observation and executor start.
- Actual state: 0 staged changes, 1 modified file (`SESSION_CONTEXT.md` with real post-regression docs), 0 untracked, build passes, critical files all intact.
- **develop is a commit-graph ancestor of main** (zero unique commits), but its **working tree differs from main** by 48 files / +398/-105 lines — this is the reverted POST_DNS_PERF_AND_SEO scope.
- **Cleanup options documented** in SNAPSHOT_REPORT.md — Foreman to author the cleanup SPEC next. Recommend Option C (cherry-pick one perf change per commit with before/after PageSpeed) as aligned with the "never batch perf changes" lesson.
- Prerequisite before any `--force` push: commit storefront's one uncommitted `SESSION_CONTEXT.md` change so it isn't lost.

**Next step:** Awaiting Foreman review → FOREMAN_REVIEW.md → cleanup SPEC.

---

## POST_DNS_PERF_AND_SEO — Regression & Revert (2026-04-18)

**What happened:** 18 perf/SEO fixes applied in one session → PageSpeed mobile dropped 89→47. Two hotfix attempts made it worse. Full revert to `62ebe0e`.
**Root causes:** (1) YouTube iframe on mobile = ~800KB JS penalty, (2) broken cache middleware, (3) 18 changes batched without measurement.
**Revert:** commit `8c362c1` on main. Eye favicon added as `b1a7312`.
**Post-mortem:** `docs/specs/POST_DNS_PERF_AND_SEO/REVERT_POST_MORTEM.md`
**Rule going forward:** One perf change per commit, measure before/after. No batching.
**Still want:** JSON-LD fix, supersale h1, edge caching, image dimensions — re-apply individually.

---

## DNS Switch Preflight Audit 🟢 COMPLETE (2026-04-18)

**SPEC:** `docs/specs/DNS_SWITCH_PREFLIGHT_AUDIT/`
**Verdict:** GO — 0 blockers, 4 SHOULD FIX, 3 NICE TO HAVE, 7 ALREADY RESOLVED.
**Key findings:**
- `astro.config.mjs` site = `https://prizma-optic.co.il` ✅
- develop→main: 0 commits divergent ✅
- 76 published pages (HE/EN/RU) all serve 200 ✅
- og:image 100% coverage, hreflang on all pages, sitemap 245 URLs clean ✅
- 1,671 redirects from old WP site in vercel.json ✅
- Security headers 5/6 present, zero Hebrew leak in EN/RU titles ✅
- Partytown fully removed, YouTube facade active ✅

**DNS switch EXECUTED (2026-04-18):**
- Vercel custom domains registered: `prizma-optic.co.il` + `www.prizma-optic.co.il` ✅
- DreamVPS cPanel Zone Editor updated: A record `@` → `216.198.79.1`, CNAME `www` → `c727e6a69a4a41da.vercel-dns-017.com.` ✅
- MX, TXT (SPF), DKIM records untouched — Google Workspace email unaffected ✅
- Awaiting DNS propagation (minutes to hours) + Vercel auto-SSL provisioning

**Post-launch queue:** ISR caching (2s TTFB → <200ms), CSP header, 13 EN/RU DB title cleanups, BrandShowcase scroll fixes, homepage revisions, contact form Resend integration.

**Full report:** `docs/specs/DNS_SWITCH_PREFLIGHT_AUDIT/PREFLIGHT_REPORT.md`

---

## Execution Close-Out 2026-04-17 — STOREFRONT_LANG_AND_VIDEO_FIX

**Deliverables (inside `docs/specs/STOREFRONT_LANG_AND_VIDEO_FIX/`):**
- `SPEC.md` — Foreman-authored, 3-issue SPEC (YouTube, RU text, EN/RU routing)
- `EXECUTION_REPORT.md` — retrospective (self-score 9.5/10), 2 executor-skill proposals
- `FINDINGS.md` — 4 findings (1 HIGH routing merge-gap, 1 MEDIUM malformed slug data, 1 LOW SC-11 criterion precision, 1 INFO stale page inventory)

**Storefront commits landed:**
- `45cd329` — `fix(storefront): replace youtube-nocookie with youtube in StepsBlock and VideoBlock` — 2 files, 3 replacements + `iv_load_policy=3` appended.

**DB operation (no git commit — logged in EXECUTION_REPORT §2):**
- Targeted text REPLACE on `storefront_pages` id `3456519e-0bc9-4ec2-9951-64d8fab0bc3d` (RU `/prizmaexpress/`). Pre-state captured in EXECUTION_REPORT. Post: `has_linz_bug=false`, `has_catalog_bug=false`. SC-11 intent satisfied; literal regex still matches legitimate Hebrew CSS comments (see M3-LANG-SPEC-01).

**EN/RU routing diagnosis (main finding — M3-ROUTING-01, HIGH):**
- Localhost on develop: **58/58 tested slugs HTTP 200** (24 EN + 24 RU + 10 HE)
- Vercel prod: 3 EN/RU slugs 200 (hardcoded page files on main), 40+ 404
- Root cause: `main`'s `[...slug].astro` is a blog-only catchall. Develop's version queries `v_storefront_pages` first (added in `f68c68e`, Phase 3B blog migration). Main is 20+ commits behind develop.
- Remedy: Daniel-authorized `develop → main` merge. Not an agent-executable action (CLAUDE.md §9 rule 7). STOP-ESCALATE per SPEC §5a.

**Success criteria: 15 PASS / 1 PARTIAL / 1 pending-on-retro-commit.**
- SC-1..SC-10 ✅ on localhost (develop code is correct)
- SC-11 🟡 (corrupted words gone; CSS comments keep regex true)
- SC-12..SC-14 ✅ (youtube-nocookie absent)
- SC-15 ✅ (`npm run build` exit 0 in 5.42s)
- SC-16 ✅ (`full-test.mjs --no-build` 18/18 PASS)
- SC-17 — pending on this commit

**Lessons incorporated from prior Foreman reviews applied during execution:**
- DNS_SWITCH_READINESS_QA → A-1 (runtime UUID verification): live-verified Prizma UUID `6ad0781b-37f0-47a9-92e3-be9ed1477e1c` before any DB write.
- DNS_SWITCH_READINESS_QA → A-2 (two-tier stop triggers): applied STOP-ESCALATE for routing finding, STOP-SUMMARIZE consideration for SC-11 PARTIAL.
- HOMEPAGE_LUXURY_REVISIONS_R2 → Executor Proposal 1 (§1 Goal reality check): grepped youtube-nocookie count, queried corrupted-word presence, verified routing file existence — all before any edit.
- HOMEPAGE_LUXURY_REVISIONS_R2 → Executor Proposal 2 (JSONB partial update): used scoped text-level REPLACE(REPLACE(...)) — would have used `jsonb_set` if path was known; REPLACE is a conservative equivalent for unique corruption strings.
- STOREFRONT_S2S3_QA → Executor Proposal E1 (mount pre-check): confirmed both repos accessible at First Action step 1.

**Awaiting Foreman review.** Foreman should: (a) disposition the 4 FINDINGS.md entries (M3-ROUTING-01 HIGH → likely NEW_SPEC for develop→main sync or direct Daniel merge; M3-DATA-01 MEDIUM → TECH_DEBT; others DISMISS/TECH_DEBT), (b) apply or reject the 2 executor-skill proposals in EXECUTION_REPORT §8, (c) decide DNS switch strategy: (i) wait for merge then DNS, (ii) DNS to Vercel preview branch `develop`, or (iii) hold DNS switch and QA develop-as-prod staging first.

---

## Prior — DNS_SWITCH_READINESS_QA 🔴 EXECUTED, AWAITING FOREMAN REVIEW (2026-04-16)

Multi-agent overnight audit complete. Verdict: 🔴 NOT READY FOR DNS SWITCH. 4 CRITICAL blockers + 10 HIGH + 14 MEDIUM identified across 66 pages / 32 blocks / 10 views / 3 routes / 31 Studio files / 36 EN+RU language reviews. Hebrew content launch-ready; multilingual routing 84% dark (EN/RU serve 3 of 18 slugs each). `/api/leads/submit` 404s on Vercel. `/prizmaexpress/` RU has words with embedded Hebrew letters. `/optometry/` still draft.

**Status update (2026-04-17, this session):** STOREFRONT_LANG_AND_VIDEO_FIX closed 2 of the 4 CRITICAL blockers (YouTube + prizmaexpress RU text) and diagnosed the third (EN/RU routing — see above). Remaining: `/api/leads/submit` (queued in CONTACT_FORM_FIX SPEC, deferred by Daniel) and `/optometry/` draft status (also deferred).

---

## Execution Close-Out 2026-04-16 — DNS_SWITCH_READINESS_QA

**Deliverables (all inside `docs/specs/DNS_SWITCH_READINESS_QA/`):**
- `DNS_SWITCH_READINESS_REPORT.md` — master report with 🔴 verdict, scoring table, path-to-green plan
- `PAGES_HE_QA_REPORT.md` — 66-page/lang HTTP + meta + HE-content audit
- `BLOCK_RENDERER_AUDIT.md` — 32 .astro files, 13 findings (0 CRITICAL / 0 HIGH / 3 MED / 10 LOW)
- `VIEW_CONTRACTS_AUDIT.md` — 10 views, 2 HIGH (brand hero NULLs, anon grants broader than SELECT)
- `API_ROUTES_AUDIT.md` — 3 routes (1 CRITICAL: leads 404 matches CONTACT_FORM_FIX)
- `ERP_STUDIO_AUDIT.md` — 31 JS files, 3 HIGH Rule 22 gaps (templates, reviews, media), systemic Rule 2 (writeLog) missing across the module
- `LANG_QUALITY_EN.md` — 18 pages, overall grade B, 1 page (`/about/`) grade C, recommend targeted editor pass on 4 pages
- `LANG_QUALITY_RU.md` — 18 pages, overall grade B+, 1 page (`/prizmaexpress/`) grade D (Hebrew letters embedded in Russian words — CRITICAL)
- `EXECUTION_REPORT.md` — retrospective (self-score 9.25/10), 2 executor-skill proposals (E-1 pre-dispatch UUID verify, E-2 master report template)
- `FINDINGS.md` — 6 meta-findings for Foreman (SPEC UUID drift, stop-trigger grammar, etc.)

**Method:** 6 parallel background sub-agents + main executor for Mission 4. Total wall-clock ~17 minutes. Zero code changes, zero DB writes. 14/14 success criteria met.

**4 CRITICAL blockers for DNS switch:**
1. EN/RU routing serves only 3 of 18 published slugs per language (28 pages 404 with DB content ready)
2. `/en/` and `/ru/` lang-root 302-redirect to HE homepage
3. `/api/leads/submit` returns 404 on Vercel (contact forms broken — matches already-queued CONTACT_FORM_FIX)
4. `/prizmaexpress/` RU page has 2 words with embedded Hebrew letters (`лиןз`, `каталоגים`) — 5-min SQL fix, but blocked until CRITICAL-1 is resolved (page 404s today)
5. `/optometry/` is `status='draft'` on all 3 langs — flip to published or remove from sitemap

**Awaiting Foreman review.** Foreman should: (a) disposition 6 FINDINGS.md entries, (b) apply 2 executor-skill proposals, (c) prioritize the 4 CRITICAL blockers and queue remediation SPECs. CONTACT_FORM_FIX SPEC (already authored earlier) is directly actionable; EN/RU routing fix may warrant a new LANGUAGES_FIX_R2 or ROUTING_FIX SPEC.

---

---

## Execution Close-Out 2026-04-16 — STOREFRONT_S2S3_QA

**DB fixes applied (via Supabase MCP — CMS content UPDATE, no migration file):**

- **Fix A — EN optometry page title:** `storefront_pages` `slug='/optometry/' AND lang='en'` — hero block title updated from "40 years of expertise. Vision that finds the precision." → "40 years of expertise. Precision vision, personal care." Pre-state verified → UPDATE applied → post-state verified ✅
- **Fix B — RU FAQ em-dash:** `storefront_pages` `slug='/שאלות-ותשובות/' AND lang='ru'` — all ` - до` occurrences replaced with ` — до` (typographic em-dash). `has_hyphen_issue = true` before → `still_broken = false` after ✅

**DB structure verification (criteria 11–17):**

| Criterion | Expected | Actual | Result |
|-----------|----------|--------|--------|
| /about/ HE block count | 2 story_teaser | 2 story_teaser | ✅ |
| /about/ EN block count | 2 story_teaser | 2 story_teaser | ✅ |
| /about/ RU block count | 2 story_teaser | 2 story_teaser | ✅ |
| HE block 1 layout | image-start | image-start | ✅ |
| HE block 2 layout | image-end | image-end | ✅ |
| EN block 1 layout | image-start | image-start | ✅ |
| Em-dashes in /about/ | 0 | 0 | ✅ |

**Storefront file criteria (1–10, 20–21): NOT VERIFIED** — `opticup-storefront` folder not mounted in this Cowork session. Verification pending (Daniel local check or re-run in session with both folders mounted). See FINDINGS M3-QA-01.

**ERP commits:** (pending — close-out commit is this SESSION_CONTEXT + CHANGELOG + EXECUTION_REPORT + FINDINGS)
**Storefront changes:** uncommitted on Daniel's disk; Daniel to push via CMD. Suggested message: `feat(storefront): fixed header, mobile booking CTA, ContactForm build, /about/ pages, i18n fix`

**Retrospective artifacts:**
- `modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/SPEC.md` (authored `93505f0`)
- `modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/EXECUTION_REPORT.md`
- `modules/Module 3 - Storefront/docs/specs/STOREFRONT_S2S3_QA/FINDINGS.md` (2 findings: M3-QA-01 MEDIUM, M3-SPEC-01 LOW)

**Foreman review:** 🟢 CLOSED (session `cool-jolly-franklin`, 2026-04-16). All 3 spot-checks pass. 2 findings: M3-QA-01 DISMISS (storefront file criteria — Daniel verifies locally), M3-SPEC-01 TECH_DEBT (Rollback Plan labeling in SPEC_TEMPLATE). 4 skill proposals queued (A1+A2+E1+E2). See `FOREMAN_REVIEW.md` in this SPEC folder.

**Next gate:** Apply 4 skill-file edits (proposals from this review + R2 review if any pending) → author **NAV_FIX** SPEC.

---

## FOREMAN_REVIEW 2026-04-16 — HOMEPAGE_LUXURY_REVISIONS_R2 🟢 CLOSED

R2 foreman review complete. All 4 findings processed (2 TECH_DEBT, 1 queued SPEC stub, 1 dismiss). 2 author-skill + 2 executor-skill proposals filed. See `docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/FOREMAN_REVIEW.md` for full review.

**Next SPEC in queue: STOREFRONT_S2S3_QA** (authored this session, ready to dispatch). After that: NAV_FIX → LANGUAGES_FIX → CONTACT_FORM_FIX.

---

## Execution Close-Out 2026-04-16 — HOMEPAGE_LUXURY_REVISIONS_R2

**Deliverables shipped to `develop` (both repos):**

- **Marquee `prefers-reduced-motion` compliance** — `global.css` swapped `animation: none` → `animation-play-state: paused` to match SPEC criterion #13 verify literal. The twin-duplicated translateX(-50%) infinite track was already correct in R1 (commits `2547df6` + `0c1bc42`); Daniel's "blank wrap frame" report from R1 review may have been a cache or pre-deploy view — code-level investigation confirmed no structural change needed.
- **Dark-on-dark contrast fix (criterion #15)** — added 5 CSS rules in `global.css` targeting `section.bg-black` descendants, overriding `text-gray-900/700/600` to white/gray-200/300 with specificity (0,2,1) that wins over single-utility classes (0,1,0). Tenant-agnostic, applies wherever `bg_color: 'black'` is set. The HE row's `events-showcase-home-he` (only block with `bg_color: 'black'`) now renders heading + body legibly.
- **Font unification (criterion #21)** — removed Tailwind `font-serif` (Georgia/Times default) from h1/h2/h3 in 7 luxury renderers (`HeroLuxuryBlock`, `StoryTeaserBlock`, `OptometryTeaserBlock`, `Tier1SpotlightBlock` ×2, `Tier2GridBlock`, `VisitUsBlock`, `EventsShowcaseBlock`). Headings now inherit canonical Rubik (HE) / Inter (EN/RU) from body. Decorative "40" span in `StoryTeaserBlock.astro:59` kept as documented exception (only renders when `data.image` is missing — never the case for live HE row).
- **HE homepage JSONB UPDATE (1 row)** — block count 7 → 8. New `events_showcase`-typed block `exhibitions-home-he` inserted at index 2 with section_title "מהתערוכות בעולם — לחנות שלנו" + 3 YouTube Shorts (Paris `XvfUYI87jso` / Milano `E8xt6Oj-QQw` / Israel `hOCxDNFEjWA`). StoryTeaser rewritten: title `נעים מאוד, אופטיקה פריזמה`, body opens with `<strong class="text-gold">אופטיקה פריזמה</strong>` (gold via `@theme { --color-gold: #c9a555 }`), narrative reframed around "introduction + heritage + process" (exhibitions theme moved to dedicated block above). Image kept verbatim per Daniel 2026-04-16 deferral.
- **EN + RU homepage rows EXPLICITLY UNCHANGED** — `updated_at` baseline `2026-04-16 09:17:23.065827+00` preserved on both. Verified via post-UPDATE SELECT.

**Storefront commits (2):** `faa31c5` (reduced-motion fix) → `2d4173f` (contrast + font unification on 7 renderers + global.css)
**ERP commits:** (this commit) — SESSION_CONTEXT + CHANGELOG + EXECUTION_REPORT + FINDINGS for R2

**Build + verification:**
- `npm run build` (storefront): PASS (4.10s, 0 errors)
- `npm run verify:full` (storefront): exit 1 from 55 PRE-EXISTING violations in `docs/*.html` and `scripts/seo/*` files — ZERO violations in any of the 8 files this SPEC touched (pre-commit hook confirmed "0 violations across 8 files" on commit `2d4173f`). Documented in FINDINGS as M3-EXEC-DEBT-02.
- DB post-UPDATE: HE block_count=8, types/ids exact match SPEC §3 criterion #4, EN/RU `updated_at` unchanged.
- Manual `localhost:4321` smoke deferred to Daniel (autonomous flow does not start dev server). Documented in FINDINGS.

**Retrospective artifacts:**
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/SPEC.md`
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/PRE_STATE_BACKUP.json` (pre-UPDATE HE blocks JSONB for rollback per §6)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/EXECUTION_REPORT.md`
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/FINDINGS.md`

**Next gate:** Awaiting Foreman review (`FOREMAN_REVIEW.md` to be written by opticup-strategic). Then 🔁 dispatch **NAV_FIX** (broken transitions to `/about/` and `/optometry/` from homepage + header). After NAV_FIX → LANGUAGES_FIX → CONTACT_FORM_FIX.

---

## Execution Close-Out 2026-04-16 — HOMEPAGE_LUXURY_REVISIONS

**Deliverables shipped to `develop` (both repos):**

- **BrandStripBlock auto-rotating carousel** — replaced the manual snap-x scroll (which Daniel saw as static on the deployed site) with a CSS-only marquee that translates a duplicated brand list 0 → -50% in linear infinite, paused on hover/focus, honors `prefers-reduced-motion`
- **Tier2GridBlock now supports `data.style: 'grid' | 'carousel'`** — default `'grid'` preserves backward compat (Rule 20) for any tenant without the field; `'carousel'` reuses the same shared marquee CSS as BrandStrip (Rule 21 — single `@keyframes marquee-x` in `global.css`)
- **Studio editor schema** — `tier2_grid` block in `modules/storefront/studio-block-schemas.js` now exposes the `style` select field with options `[grid (default), carousel]` so non-engineers can toggle from the Studio UI
- **Prizma Hebrew homepage rewritten via migration 125** — new hero video `lz55pwuy9wc`, overlay `0.65 → 0.80`, copy rewritten ("משקפי יוקרה ממיטב המותגים..."), `tier1_spotlight` REMOVED from JSONB array (renderer + Studio schema RETAINED on disk per Rule 20), Story block re-titled `40 שנה של בחירה` and rewritten with Daniel's anchor phrase ("הסבירות שלא תמצאו את המסגרת ההכי מתאימה לכם היא אפסית"), Story image set to existing Prizma store photo (`media_library.id=a2fcf78a-...`, IMG-20241230-WA0096 landscape webp), Tier2Grid `data.style="carousel"` for auto-marquee
- **EN + RU homepage rows EXPLICITLY UNCHANGED** — verified post-migration (`updated_at` 09:17:23 baseline preserved, 8 blocks intact including `tier1_spotlight`). Deferred to `LANGUAGES_FIX` SPEC.
- **Migration 125 embeds full pre-update HE JSONB as `/* SNAPSHOT */` block** in the file header — rollback source-of-truth per Executor Proposal E1

**Storefront commits (3):** `2547df6` (BrandStrip auto-marquee) → `0c1bc42` (Tier2Grid carousel + types) → `1e4347a` (migration 125)
**ERP commits:** `8c6e69c` (Studio schema register style:carousel) + (close-out retrospective in this commit)

**Build + verification:**
- `npm run build`: PASS (3.95s, Astro 6 + Vercel adapter, 0 errors)
- localhost:4321 smoke-tests: HE renders 7 blocks in correct order with new hero video, removed Tier1Spotlight (0 hits), auto-marquee CSS class present (5×), new story title + anchor phrase + section_title + CTA all present, story image URL correct. EN + RU still render 8 blocks each with `tier1_spotlight` retained and old hero video `40f1I0eOR7s` × 2 (hero+events) — confirmed unchanged
- DB post-migration: HE block_count=7, EN/RU block_count=8, EN/RU `updated_at` unchanged from baseline
- **Vercel Preview criteria deferred** (§3.F: hero video render, BrandStrip rotation visual, Tier2Grid carousel visual, Lighthouse ≥85) — Daniel's post-commit visual review

**Retrospective artifacts (lifecycle complete):**
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/EXECUTION_REPORT.md` (10 sections, executor self-score 9.5/10)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/FINDINGS.md` (2 findings: M3-EXEC-DEBT-01 LOW, M3-REPO-DRIFT-01 LOW)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/FOREMAN_REVIEW.md` — 🟢 CLOSED (Cowork Foreman session `relaxed-dreamy-gates`, 2026-04-16)

**Foreman disposition of findings:**
- M3-EXEC-DEBT-01 (missing `STOREFRONT_CMS_ARCHITECTURE.md`) → **DISMISSED as FALSE POSITIVE**. File exists at exact path SPEC §11 referenced (committed in `9df084e`); executor checked Windows plugin-install path instead of repo path. Lesson captured as executor-skill Proposal E1.
- M3-REPO-DRIFT-01 (5 untracked SPEC artifacts in ERP) → **ACCEPTED — NEW_SPEC `M3_SPEC_FOLDER_SWEEP` scheduled** (≤30 min, run before NAV_FIX).

**4 self-improvement proposals to land before next SPEC dispatch:**
- Author A1: Migration-path pre-flight check (detect `sql/` vs `supabase/migrations/` before prescribing §8 path)
- Author A2: Skill-reference path disambiguator (`.claude/skills/` references are always repo paths, not plugin-install paths)
- Executor E1: Repo-vs-plugin path resolution rule (use `git show HEAD:<path>` or `$(git rev-parse --show-toplevel)/<path>`, never `%USERPROFILE%\.claude\...`)
- Executor E2: Migration folder auto-detect pre-migration-file creation (promote executor's own Proposal 2 verbatim)

**Execution quality score (Foreman-adjusted):** **9.6/10** (executor self-score 9.5 was honest; 0.1 over-deduction on "docs currency" for a file that actually existed).

**Next gate:** Commit FOREMAN_REVIEW + SESSION_CONTEXT + skill edits to `develop`. Then 🔁 another pass on the homepage with fresh eyes (Daniel: "זה לא כמו שרציתי") — a HOMEPAGE_LUXURY_REVISIONS_R2 SPEC will capture round-2 revisions. Only after that → dispatch `NAV_FIX`.

**2026-04-16 skill improvements APPLIED (ahead of next dispatch):**
- `.claude/skills/opticup-strategic/SKILL.md` — added Step 1 sub-rule 9 (A1 — migration-path pre-flight detection) + Step 3 sub-section "§11 Path Disambiguator Rule" (A2 — repo vs plugin-install path notation in §11 references)
- `.claude/skills/opticup-executor/SKILL.md` — added First Action step 5.5 (E1 — skill-reference file lookup rule: always repo path, never plugin install) + Step 1.5 DB Pre-Flight sub-item 9 (E2 — migration folder convention auto-detect via `git rev-parse --show-toplevel` + `ls`)

All 4 proposals now live in the skill files themselves — the next SPEC dispatch automatically benefits.

---

## Historical — pre-execution (SPEC authored 2026-04-16)

---

## Revised Follow-Up Queue (Daniel's direction, 2026-04-16 late)

After viewing the deployed luxury redesign, Daniel re-sequenced the pre-DNS queue:

1. **HOMEPAGE_LUXURY_REVISIONS** (Hebrew ONLY) — SPEC authored, awaiting Windows dispatch. Block-by-block revisions: new hero video `lz55pwuy9wc`, darker overlay (0.8), rewritten hero copy, Tier1Spotlight REMOVED from HE row (renderer + schema retained for Rule 20), Story block rewritten with Daniel's anchor phrase + store photo, Tier2Grid converted to auto-scrolling carousel. Scope: Prizma tenant, `lang='he'`, slug='/' — EN + RU explicitly deferred.
2. **NAV_FIX** — Transitions to `/about/` and `/optometry/` don't work from homepage + header. Needs investigation first.
3. **LANGUAGES_FIX** — EN + RU locales don't render correctly. Data migrations populated all 3 locales previously (stored OK in DB); defect is in rendering/routing layer. Needs investigation.
4. **CONTACT_FORM_FIX** — Launch blocker (was previously #1, now #4). "בואו נדבר" form shows success but data silently lost. Needs Edge Function + SMTP/transactional-email.

**Side queue (infra, non-blocking):**
- `M3_STOREFRONT_PAGES_BACKUPS_TABLE` — schedule before next CMS-content SPEC (de-risks #1)
- `MODULE_3_SEO_LEGACY_URL_REMAPS` — LOW
- `M3_SEO_SAFETY_NET` — MEDIUM

---

## HOMEPAGE_LUXURY_REVISIONS SPEC — Authored 2026-04-16 (Cowork session)

**Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS/SPEC.md`
**Status:** ✅ Authored, pending Daniel's dispatch to Windows Claude Code in `opticup-storefront` repo.
**Executor constraints:**
- Prizma-scoped Level 2 SQL only (`tenant_id='6ad0781b-...'` AND `lang='he'`)
- EN + RU rows must remain unchanged (Criteria 8–9 enforced)
- Tier1Spotlight renderer + Studio schema STAY on disk (Rule 20 — Author Proposal A1 applied)
- Mandatory pre-migration JSONB snapshot embedded in migration 125 header (Executor Proposal E1 applied)
- Vercel-Preview-only criteria separated from localhost criteria (Author Proposal A2 + Executor Proposal E2 applied)

**Key technical open question (executor resolves):** whether `BrandStripBlock.astro` actually rotates when `data.style='carousel'` is set. If yes → no renderer change needed. If no → SPEC allows up to ~100 lines of carousel implementation; more than that = Stop-on-Deviation.

---

## Execution Close-Out 2026-04-16 — HOMEPAGE_HEADER_LUXURY_REDESIGN (🟡 CLOSED WITH FOLLOW-UPS)

---

## Execution Close-Out 2026-04-16 — HOMEPAGE_HEADER_LUXURY_REDESIGN

**Deliverables shipped to `develop` (both repos):**

- **8 new CMS block renderers** in `opticup-storefront/src/components/blocks/*Block.astro` (HeroLuxury, BrandStrip, Tier1Spotlight, StoryTeaser, Tier2Grid, EventsShowcase, OptometryTeaser, VisitUs) — all ≤132 lines, tenant-agnostic per Rule 20
- **Wired through `BlockRenderer.astro`** dispatch; `types-luxury.ts` split off to keep `types.ts` under Rule 12's 350-line max
- **ERP Studio registry** updated (`modules/storefront/studio-block-schemas.js`) with 8 new block-type schemas
- **Header restructured** to 6 luxury-boutique nav items (משקפי ראייה / משקפי שמש / מותגים / אופטומטריה / הסיפור שלנו / יצירת קשר); Blog + Multifocal + Lab removed; i18n parity across he/en/ru
- **Prizma Homepage rewritten** via migration 123 — all 3 locales now use the 8-block luxury composition (was 9-block WP-parity)
- **Prizma About rewritten** via migration 124A — 5 blocks per locale including 3 exhibition videos (`XvfUYI87jso`, `E8xt6Oj-QQw`, `hOCxDNFEjWA`)
- **NEW `/optometry/` CMS pages** via migration 124B — 3 rows inserted, shared translation_group_id, published, multifocal content absorbed
- **vercel.json 301** — `/multifocal-guide/`, `/multifocal/`, `/multifocal-glasses` all → `/optometry/` (single-hop, per locale)

**Storefront commits (7):** `ac7ea8a` → `caa5b5b` → `383cb89` → `0a361c0` → `f7afae9` → `329d5e6` → `b94554f`
**ERP commits:** `1b5d822` (Studio registry) + (close-out retrospective commit)

**Build + verification:**
- `npm run build`: PASS (0 errors, 3.64s, Astro 6 + Vercel adapter)
- localhost:4321 smoke-tests: Homepage 8 blocks rendered via CMS path, Header nav 6 items, Hero video embedded, 3 locales all 200 on `/about/` + `/optometry/`, multifocal text present in all 3 optometry locales
- **Criterion 16 unverifiable on localhost** (`vercel.json` redirects only fire on Vercel edge) — logged as finding
- **Criterion 18 (Lighthouse ≥91)** skipped locally — Vercel Preview runs Lighthouse automatically

**Retrospective artifacts:**
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/EXECUTION_REPORT.md`
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/FINDINGS.md` (4 findings: 1 SPEC-pattern fix, 2 MEDIUM tech-debt, 1 LOW housekeeping)
- `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/FOREMAN_REVIEW.md` — **✅ written 2026-04-16 by Cowork Foreman; verdict 🟡 CLOSED WITH FOLLOW-UPS**

**Foreman proposals produced (all applied to HOMEPAGE_LUXURY_REVISIONS SPEC):**
- A1: Rule 20 vs Rule 21 Deletion Check — in author SKILL Step 1.5
- A2: Vercel Platform-Layer Caveat — in SPEC_TEMPLATE §3
- E1: Mandatory pre-migration SELECT snapshot — in STOREFRONT_CMS_ARCHITECTURE.md §4
- E2: `git show` verification + Vercel Preview pattern — in STOREFRONT_CMS_ARCHITECTURE.md §3.5

**Next gate:** Daniel dispatches HOMEPAGE_LUXURY_REVISIONS SPEC to Windows Claude Code (see that SPEC's §13).

---

## Historical — SPEC authoring + re-scope (pre-execution, 2026-04-16)

---

## Homepage / Header / Story / Optometry Redesign — SPEC authored + re-scoped 2026-04-16

**SPEC:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_HEADER_LUXURY_REDESIGN/SPEC.md`
**Status:** ✅ Authored + re-scoped to **CMS-native block architecture (Option D)** after executor's Step 1 inventory fired Stop-on-Deviation trigger §5 bullet 1. Daniel approved Option D on 2026-04-16. All 6 pre-flight Author Questions still resolved; plus §13 Re-scope section added directing executor to block-renderer implementation.
**Execution repo:** `opticup-storefront` (NOT this repo — Windows Claude Code only; Cowork cannot run `npm run build` + `localhost:4321`)

**Architectural discovery (2026-04-16):** Prizma Homepage, About, and Multifocal-Guide are **CMS records in `storefront_pages`**, not Astro source files. 9 rows total (3 locales × 3 page types). `src/pages/index.astro:31-41` contains a `getPageBySlug` branch that short-circuits the Astro composition and renders via `<PageRenderer blocks={cmsPage.blocks} />`. Any edit to `.astro` files alone would be invisible in production. Lesson persisted as: (a) §13 Re-scope in this SPEC, (b) new reference `.claude/skills/opticup-executor/references/STOREFRONT_CMS_ARCHITECTURE.md`, (c) new "Storefront CMS Architecture — Mandatory Pre-Flight" section in `.claude/skills/opticup-executor/SKILL.md`.

**Option D implementation path:**
- Build 8 block renderers under `opticup-storefront/src/components/blocks/` (NOT `src/components/homepage/`)
- Register 8 block types in Studio block registry + `PageRenderer` dispatch
- Author content via SQL UPDATE to `storefront_pages.blocks` JSONB (Level 2 SQL autonomy, Prizma-scoped)
- Header stays hand-coded Astro (no CMS) — 6-item restructure unchanged
- `/optometry` created as CMS page (INSERT 3 rows), not a new `.astro` file
- `/about/` updated via UPDATE of existing CMS rows (3 locales)
- Old `/multifocal-guide/` 301s to `/optometry` via `vercel.json`

**Scope:**
- Positioning shift: "lab / Rx / multifocal" → "luxury-boutique curator of 5 Tier-1 brands (John Dalia, Cazal, Kame Mannen, Henry Jullien, Matsuda) + 6+ Tier-2 (Prada, Miu Miu, Moscot, Montblanc, Gast, Serengeti)"
- **Homepage:** 8 sections (HeroLuxury → BrandStrip → Tier1Spotlight → StoryTeaser → Tier2Grid → EventsShowcase → OptometryTeaser → VisitUs)
- **Header:** 6 items (משקפי ראייה / משקפי שמש / מותגים / אופטומטריה / הסיפור שלנו / יצירת קשר); REMOVED Blog + מולטיפוקל links
- **NEW page** `הסיפור שלנו` — 40-year narrative + 3 exhibition videos (Paris/Milan/Israel YouTube Shorts IDs embedded)
- **NEW page** `אופטומטריה` — absorbs multifocal content; old slug 301-redirects
- **NEW Events block** — YouTube Shorts `40f1I0eOR7s` (tadmit) + `-hJjVIK3BZM` (testimonials)
- **All 3 locales (he/en/ru) ship in parity** — no placeholder copy allowed
- Hero copy: Elison-inspired structure, NOT a copy; executor drafts using Prizma's own vocabulary ("40 שנה