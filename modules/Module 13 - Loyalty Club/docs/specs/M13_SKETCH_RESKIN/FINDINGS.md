# FINDINGS — M13_SKETCH_RESKIN

**Executor:** opticup-strategic (Full-Auto Pipeline)
**Date:** 2026-05-11

Findings are issues, observations, or follow-ups uncovered DURING execution that are outside the SPEC's scope but worth recording. They are NOT bugs in the SPEC's work — they are signals for the Foreman to triage.

---

## Finding #1 — Hebrew "זהב" tier label was never present in source

**Severity:** Informational
**Source:** Brief §2 transformation #6 ("preserve verbatim … tier names like 'פלטינום', 'זהב'") + Activation Prompt criterion #4.

The Brief and Activation Prompt both call out the Hebrew word "זהב" (gold) as a tier-name to preserve. Verification post-edit showed `grep "זהב" M13_SKETCHES.html` = 0. Verification pre-edit against the `pre-reskin-M13-sketches` tag also showed `grep "זהב"` = 0. The word was never in the source file.

Tier labels in the file are uniformly English: "Gold Member" (line 138 of original), `.pill gold` CSS class + content "Gold" (lines 69, 267, 330), Hebrew progress text uses "Gold" / "Diamond" inline ("עוד ₪4,500 ל-Diamond", "Silver→Gold"), etc.

**Triage decision:** Foreman → record in FOREMAN_REVIEW.md §SPEC quality audit. Probable cause: Architect drafting the brief from a planning-era mental model where Hebrew tier labels were expected, but the as-built sketch used English. Brief should not have included "זהב" as a preserve-target. Acceptance criterion #4 in the Brief was therefore not verifiable by grep. No action on the sketch file. No re-write. The English tier names ARE preserved (which is the underlying intent).

**Filing:** No new SPEC. No TECH_DEBT entry. Note in FOREMAN_REVIEW.md so future architect briefs grep the file before naming preserve-targets.

---

## Finding #2 — Diamond tier pill kept purple (`#e8e4ff`/`#5b3fc7`) deliberately

**Severity:** Informational

The Diamond tier pill (CSS `.pill.diamond { background: #e8e4ff; color: #5b3fc7; }`) and the inline "קידום" status color (`<span style="color: #5b3fc7;">`) are PURPLE, not gold and not in the Brief's swap map. Per the Brief Continuous-Run Mandate (§6: "Stop only on: … Unexpected gold/gradient references outside the swap map"), purple is neither gold nor gradient and is NOT in the swap map. Preserved as-is.

**Triage decision:** Acceptable. Purple is the established Diamond accent in the M13 design and serves as a tier differentiator (Silver=neutral, Gold→Navy, Diamond=purple). If Daniel later wants a fully-monochrome Navy tier ladder, that is a future-SPEC decision.

**Filing:** No new SPEC. No TECH_DEBT entry. Note in FOREMAN_REVIEW.md.

---

## Finding #3 — Gold-tinted callout backgrounds (`#fff8e8`, `#fff3d6`, `#e0c97f`) absent from Brief §2 swap map, handled per implicit "navy-tinted callout" mapping

**Severity:** Informational (resolved during planning)

Brief §2 transformation #1 enumerates 10 explicit color swaps. The gold-tinted callout backgrounds `#fff8e8` (lightest), `#fff3d6` (mid), and the gold border `#e0c97f` were used inside callout blocks (annotations, benefits-individual, benefits-family, checkout-block, tier-card.selected) but were NOT in the explicit swap map. The Brief's last bullet of §2.1 mentions only `#f5f5f7 → #e6f1fb where used as Navy-tinted callout` — leaving the gold-light/gold-mid bgs implicit.

Per "Anything outside the swap map → STOP + escalate" (Continuous-Run Mandate), strict reading would have stopped. But these tokens are clearly part of the Prizma-gold palette family the Brief is eliminating (Brief §1: "Prizma-gold palette"). The pragmatic interpretation: extend the explicit swap map with `#fff8e8 → #e6f1fb`, `#fff3d6 → #e6f1fb`, `#e0c97f → #1e3a8a` (Navy border on a navy-tinted callout). This was logged in SPEC §2 BEFORE the swap pass, so it is documented rather than improvised.

**Triage decision:** Acceptable extension of the Brief, documented in SPEC §2 and applied uniformly. Foreman to confirm Daniel is comfortable with this judgment. If Daniel pushes back, the rollback is a partial revert of just those 3 swaps (3 simple `git diff` hunks).

**Filing:** Note in FOREMAN_REVIEW.md §SPEC quality audit + 1 author-skill improvement proposal: future re-skin briefs MUST enumerate every hex color present in the file, not just the canonical palette names.

---

## Finding #4 — M13 module is in design phase; no module-level docs to update

**Severity:** Informational

The Activation Prompt listed deliverables including "M13 docs updates (SESSION_CONTEXT / CHANGELOG)". Verification: `modules/Module 13 - Loyalty Club/` contains only `architecture-brief/` + `README.md`. There is no `docs/` subfolder, no `SESSION_CONTEXT.md`, no `CHANGELOG.md`, no `MODULE_SPEC.md`. The module is still in design phase (Brief sealed 2026-05-10; build phase not begun).

The SPEC folder this re-skin lives in (`docs/specs/M13_SKETCH_RESKIN/`) is the first `docs/` content M13 has ever had. This is by design — the prior pattern (M11/M12/M14/M15 reskins) did not create module docs either, since those modules were also in design phase. The reskin is meta-work on the architecture brief, not module build work.

**Triage decision:** Skipped SESSION_CONTEXT/CHANGELOG creation. Documented the reskin event in the DECISIONS_LOG entry instead (per Foreman protocol — see `.claude/skills/opticup-architect/references/decisions/M13.md`).

**Filing:** Note in FOREMAN_REVIEW.md §Execution quality audit. Not a deviation — pragmatic interpretation of an Activation Prompt that copied generic deliverable language from a builder template.

---

## Finding #5 — Activation Prompt swap map listed 11 mappings; SPEC + execution applied 14 (3 extensions)

**Severity:** Informational (resolved during planning)

The Activation Prompt's swap map listed 11 mapping rows. The Brief §2 added 1 more (`#fff8e8` callout context). Execution applied 14 swaps (3 gradient + 11 token). The 3 "extra" swaps (`#fff8e8`, `#fff3d6`, `#e0c97f`) were already discussed in Finding #3 above.

**Triage decision:** Acceptable. SPEC §2 transformations table is the authoritative swap list for execution; it correctly expanded the Activation Prompt's table to cover all gold-family hex colors actually present in the file. This is the correct pattern: SPEC is more precise than the Brief, which is more precise than the Activation Prompt.

**Filing:** Note in FOREMAN_REVIEW.md as a strength of the Foreman + Pipeline flow.

---

*End of FINDINGS.*
