# FINDINGS — HOMEPAGE_LUXURY_REVISIONS_R2

> **Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Storefront verify:full fails on 55 pre-existing baseline violations

- **Code:** `M3-EXEC-DEBT-02`
- **Severity:** LOW
- **Discovered during:** §3 #18 verify pass (`npm run verify:full` substituted for the non-existent `npm run safety-net`)
- **Location:**
  - `opticup-storefront/docs/*.html` (WordPress crawls + content exports — 18 file-size violations + 31 rule-23 JWT-token detections in legacy WP debug HTML)
  - `opticup-storefront/scripts/seo/{map-products.ts, wp-complete-crawl.mjs}` (file-size)
  - `opticup-storefront/src/lib/blocks/types.ts` and a few storefront components (rule-24-views-only — 6 violations in pre-existing storefront/admin code)
- **Description:** The full-verify pre-commit / safety-net gate cannot pass exit 0 on the current `develop` baseline. None of these violations were introduced by R2 — the 8 files this SPEC modified all passed pre-commit cleanly ("0 violations, 0 warnings across 8 files" on commit `2d4173f`). The `docs/*.html` files are WordPress page exports kept for reference; the JWT-token detections are likely embedded in WP body HTML, not real secrets.
- **Reproduction:**
  ```
  cd opticup-storefront
  npm run verify:full
  echo "EXIT=$?"
  # → 55 violations across 466 files, exit 1
  ```
- **Expected vs Actual:**
  - Expected per SPEC #18: exit 0
  - Actual: exit 1 from baseline violations unrelated to R2
- **Suggested next action:** TECH_DEBT (and consider a NEW_SPEC `M3_STOREFRONT_VERIFY_BASELINE_CLEANUP` to either (a) move `docs/*.html` to `.claude-ignore`, (b) configure `verify.mjs` to exclude `docs/**`, or (c) sanitize the JWT-looking strings in the WP exports if they're real). Until then, gate-by-gate verification on staged files (the pre-commit hook) is the trusted signal.
- **Rationale for action:** Cleanup is non-blocking for R2 close but blocks every future SPEC's literal #18 criterion until resolved. Likely a 30-minute fix. No data integrity risk.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC verify command name `safety-net` does not match storefront package.json

- **Code:** `M3-DOC-DRIFT-02`
- **Severity:** LOW
- **Discovered during:** §3 #18 verify execution
- **Location:** `modules/Module 3 - Storefront/docs/specs/HOMEPAGE_LUXURY_REVISIONS_R2/SPEC.md` §3 row 18 (`Verify command: npm run safety-net`)
- **Description:** SPEC criterion #18 says `npm run safety-net` should pass with exit 0. But `opticup-storefront/package.json` has no `safety-net` script — only `verify`, `verify:staged`, `verify:full`. The name `safety-net` appears to be inherited from CLAUDE.md §6 Rule 30 wording ("safety-net scripts before landing") which describes the policy, not a literal script name. Two options for next SPEC: (a) rename the npm script to `safety-net` to match the convention, or (b) update the SPEC template so the criterion wording references the actual script names.
- **Reproduction:**
  ```
  cd opticup-storefront
  cat package.json | grep '"scripts"' -A 10
  # → no "safety-net" key
  ```
- **Expected vs Actual:**
  - Expected: a script named `safety-net` exists
  - Actual: only `verify` / `verify:staged` / `verify:full` exist
- **Suggested next action:** DOC_FIX in the next opticup-strategic FOREMAN_REVIEW (update SPEC template literal verify-command names to match actual `package.json` scripts). Also covered by Executor Proposal 1 in EXECUTION_REPORT §8 (pre-flight check for cited scripts).
- **Rationale for action:** Trivial doc fix that prevents the same time-sink in every future Module 3 SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Manual `localhost:4321/` console smoke deferred (criterion #19)

- **Code:** `M3-EXEC-INFO-02`
- **Severity:** INFO
- **Discovered during:** §3 #19 verification
- **Location:** SPEC §3 criterion #19 ("0 errors on `localhost:4321/`. Verify: Open in browser, observe console")
- **Description:** Autonomous executor flow does not provision a dev server and a Chromium instance for visual smoke. Chrome-devtools MCP is available but adds 5–10 minutes for a clean-build smoke whose risk is low: `npm run build` passed cleanly, all renderer edits were minimal Tailwind class removals + 5 added CSS rules, the DB UPDATE used existing block types with no new JSON shape. Daniel's manual visual review on Vercel Preview is the higher-signal check.
- **Reproduction:** N/A — this is a process observation, not a defect.
- **Expected vs Actual:**
  - Expected: executor opens browser, observes console
  - Actual: executor relies on `npm run build` PASS + DB-side verify; defers visual check to Daniel
- **Suggested next action:** DISMISS (or, if Foreman wants this enforced going forward, SPEC criteria should explicitly mark visual checks as "Daniel-side" vs "executor-automatable")
- **Rationale for action:** The cost of automating a per-SPEC browser smoke (with deterministic dev-server lifecycle, port allocation, screenshot diff) outweighs the marginal risk reduction over `npm run build` PASS + targeted DB verify. Better to keep the executor lean and have Daniel do the cinematic eye-on review.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — Foreman premise about R1 marquee was wrong; criterion #11 was already satisfied at SPEC dispatch

- **Code:** `M3-SPEC-DRIFT-01`
- **Severity:** LOW
- **Discovered during:** §1 Goal + §3 #11 verification (code inspection of `BrandStripBlock.astro`, `Tier2GridBlock.astro`, `global.css`)
- **Location:**
  - SPEC §1 Goal: "R1's current CSS `@keyframes` likely animates a single track by `-100%` which creates a wrap-around blank frame"
  - SPEC §3 #11: "track is duplicated ×2 and animated `translateX(-50%)` infinite"
  - Reality: `opticup-storefront/src/components/blocks/BrandStripBlock.astro:56` and `Tier2GridBlock.astro:69` both use `[...enriched, ...enriched]` (twin track); `opticup-storefront/src/styles/global.css:106-109` defines `@keyframes marquee-x { from { transform: translateX(0); } to { transform: translateX(-50%); } }` — exactly what SPEC §3 #11 expected
- **Description:** The Foreman's hypothesis ("R1 uses single track + -100%") was wrong. R1 already implemented the seamless twin-duplicated translateX(-50%) infinite pattern correctly (commits `2547df6` + `0c1bc42`). The SPEC's claim that this needed to be built was a misreading of R1's state. The only legitimate marquee deviation was `prefers-reduced-motion` syntax (`animation: none` vs `animation-play-state: paused`), which I fixed in commit `faa31c5`. Daniel's R1-review report of "blank wrap frame" may have been (a) a cached/pre-deploy view, (b) a perception of the gap-12 between adjacent items at the seam, or (c) a real intermittent issue I could not reproduce in code review.
- **Reproduction:**
  ```
  cd opticup-storefront
  git show ac838bf:src/components/blocks/BrandStripBlock.astro | grep -A2 enriched
  git show ac838bf:src/styles/global.css | grep -A4 marquee-x
  ```
- **Expected vs Actual:**
  - Expected per SPEC: marquee was buggy, needed re-architecture
  - Actual: marquee was already correct; only the reduced-motion handling was off
- **Suggested next action:** DISMISS (handled in execution — fix landed in commit `faa31c5`). For the Foreman: a 30-second pre-SPEC `cat global.css | grep -A5 marquee` would have surfaced the actual R1 state and saved the SPEC's §1 Goal from being premised on a wrong hypothesis. Could feed an opticup-strategic skill proposal: "before writing 'X is broken, fix it' in a SPEC §1 Goal, run a sanity grep that X is actually broken."
- **Rationale for action:** The deviation was self-resolving in execution (the code was already what the SPEC wanted). No follow-up work needed.
- **Foreman override (filled by Foreman in review):** { }
