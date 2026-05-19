# EXECUTION_REPORT — M4_TEMPLATE_VALIDATION_UI_LINT

> **Executor:** opticup-executor (Claude Sonnet 4.6)  
> **Execution date:** 2026-05-19  
> **SPEC sealed at:** `fdec327`  
> **C2 commit:** `45c98b4`  
> **Branch:** develop  
> **Machine:** Windows desktop (C:\Users\User\opticup)

---

## §0 Session Notes

Pre-existing dirty state (Full-Auto Pipeline mode — logged, not asked):
- Modified (not in scope): `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`,
  `docs/guardian/GUARDIAN_ALERTS.md`,
  `modules/Module 4 - CRM/architecture-brief/M4_DUAL_PATH_DEPRECATION_PHASE_1_ACTIVATION_PROMPT.md`
- Untracked (not in scope): 7 architecture brief files across M1.5 and M4

Per Full-Auto Pipeline protocol: logged here, left untouched, used explicit-filename
`git add` for every commit. Working-tree marked as scope-clean.

Integrity gate at session start: exit 0 (all clear, 10 files scanned).  
Rule 21 grep: 0 hits for `validateTemplateBodyPlaceholders|KNOWN_PLACEHOLDERS|crm-template-lint` outside SPEC files — confirmed net-new.

---

## §1 Per-Criterion Evidence Table

| # | Criterion | Expected | Actual | Result |
|---|---|---|---|---|
| 1 | Branch state | develop, scope-clean at close | develop, pre-existing out-of-scope files left untouched | PASS |
| 2 | Commits produced (Executor) | 3 (C1 seal + C2 code + C3 retro) | C1 at fdec327 (pre-SPEC), C2 at 45c98b4, C3 this commit | PASS |
| 3a | Editor file final line count | ≤ 230 | 229 | PASS |
| 3b | Lint extraction file | ≤ 120 lines (created — trigger exceeded 230) | 110 lines | PASS |
| 4 | KNOWN_PLACEHOLDERS count | exactly 14 names | 14 (node eval confirmed) | PASS |
| 5 | Lint regex byte-identical to TS:59 | `/%([a-z][a-z0-9_]*)%/g` | `/%([a-z][a-z0-9_]*)%/g` at crm-template-lint.js:35 | PASS |
| 6 | validate() function exposed | `window.CrmTemplateLint.validate` | `window.CrmTemplateLint = { validate, ... }` at line 105 | PASS |
| 7 | Levenshtein helper + threshold ≤ 2 | function exists, LEVENSHTEIN_TYPO_THRESHOLD=2 | levenshtein() at line 41, threshold=2 at line 37 | PASS |
| 8 | Payment URL reads OpticupConfig (no new DB call) | `Object.keys(OpticupConfig.tenant.payment_links)` | editor.js save-gate line, no sb.from() | PASS |
| 9a | HARD-BLOCK on typo | save disabled, red banner | renderLintBanner(errors,'hard'); return; | PASS (code) |
| 9b | SOFT-BLOCK on unknown | save disabled until override | renderLintBanner(errors,'soft'); return unless _lintOverrideAcknowledged | PASS (code) |
| 9c | CLEAN proceeds | no banner, save enabled | stale banner removed, falls through to existing ops[] build | PASS (code) |
| 10 | Subject field linted | validate() called with cs.subject | editor save-gate passes `cs.subject || null` to validate() | PASS |
| 11a | "Did you mean?" event_dayof_week → event_day_of_week | Levenshtein=1, suggested | levenshtein('event_dayof_week','event_day_of_week')=1 ≤ 2 → typos[] | PASS (reasoning) |
| 11b | "Did you mean?" registratoin_url → registration_url | Levenshtein=2, suggested | levenshtein('registratoin_url','registration_url')=2 ≤ 2 → typos[] | PASS (reasoning) |
| 12 | %D7%A9 not flagged | regex excludes uppercase-first | PLACEHOLDER_REGEX=`/%([a-z][a-z0-9_]*)%/g` — uppercase D excluded | PASS (reasoning) |
| 13a | Chrome MCP screenshots (3 states) | LH-Tester phase deliverable | DEFERRED to LH-Tester | DEFERRED |
| 13b | window.__lintTrace runtime trace | LH-Tester captures | DEFERRED to LH-Tester | DEFERRED |
| 13c | DB/UI probe evidence (3 states) | LH-Tester captures | DEFERRED to LH-Tester | DEFERRED |
| 14 | Smoke test 8 — lint declared in crm.html | grep-based assertion | test added at baseline.test.mjs:157; reads crm.html + crm-template-lint.js statically | PASS |
| 15 | docs/CRM_TEMPLATE_LINT.md ≤ 60 lines | ≤ 60 lines | 53 lines | PASS |
| 16 | Iron Rule 31 at every commit | exit 0 or 2 | exit 0 at session start + pre-commit hook at C2 | PASS |
| 17 | Iron Rule 32 destructive-ops gate | declared 0 ops; hook accepts | 0 destructive ops; `All clear — 0 violations` | PASS |
| 18 | Brief §4 Cross-Module Safety — no §4.2 touch | _shared/template-validation.ts unchanged | not in git diff | PASS |
| 19 | _shared/template-validation.ts unchanged | byte-identical | not staged, not touched | PASS |
| 20 | supabase/functions/** unchanged | byte-identical | not staged, not touched | PASS |
| 21 | Smoke 7/7 → 8/8 with new test | DEFERRED to LH-Tester for runtime | static assertions pass | DEFERRED (runtime) |
| 22 | Cross-module audit — only modules/crm/ + docs/ + tests/smoke/ in diff | git diff --name-only | crm.html, docs/CRM_TEMPLATE_LINT.md, modules/crm/*, tests/smoke/baseline.test.mjs — all in scope | PASS |

---

## §2 File-Size Delta vs Baseline (D-AUTH-2 Decision)

| File | Before | After | Delta | Limit | Status |
|---|---|---|---|---|---|
| `modules/crm/crm-messaging-templates-editor.js` | 155 | 229 | +74 | ≤ 230 | PASS (1 line below limit) |
| `modules/crm/crm-template-lint.js` | (new) | 110 | +110 | ≤ 120 | PASS |
| `docs/CRM_TEMPLATE_LINT.md` | (new) | 53 | +53 | ≤ 60 | PASS |
| `tests/smoke/baseline.test.mjs` | 190 | 208 | +18 | (no limit) | PASS |
| `crm.html` | unchanged lines | +1 script tag | +1 | additive | PASS |

**D-AUTH-2 decision recorded:** Estimated post-edit editor at 155+110=265 lines → EXTRACT triggered.
Extraction split: all lint constants + validate() + levenshtein() → `crm-template-lint.js`.
Editor retains: save-gate wiring (25 lines added) + `renderLintBanner()` helper (38 lines added) + `_lintOverrideAcknowledged` reset (1 line). Editor final: 229 lines.

**Why renderLintBanner stayed in editor and not in lint file:**  
renderLintBanner() directly manipulates DOM elements created by `open()` — it inserts a `<div>` before `#tpl-editor`'s footer element. Keeping it in the editor file avoids a circular dependency (lint file → needs editor DOM → would need a callback). Clean separation: lint file is pure JS (no DOM), editor file owns DOM manipulation.

---

## §3 Deviations Log

| # | Deviation | Impact | Resolution |
|---|---|---|---|
| D-1 | Script tag inserted BEFORE editor tag (not AFTER as stated in SPEC §4) | Low | SPEC says "immediately after the existing `crm-messaging-templates-editor.js` script tag". But lint must be loaded BEFORE editor so `window.CrmTemplateLint` exists when editor IIFE runs. SPEC text contradicts the dependency graph. Executor resolved in favor of dependency correctness. LH-Tester will confirm the order works. |
| D-2 | `renderLintBanner` kept in editor (not extracted to lint file) | None | See §2 rationale. Lint file stays DOM-free and pure. No behavioral impact. |

---

## §4 Real-Time Decisions (Ambiguities resolved autonomously)

| Decision | Context | Reasoning |
|---|---|---|
| D-RTA-1: Extract lint to crm-template-lint.js | Editor estimate exceeded 230 | Straightforward D-AUTH-2 trigger: 155 + ~110 = 265 > 230. Extraction to crm-template-lint.js. |
| D-RTA-2: Script tag order — before editor, not after | SPEC §4 says "after" but logic requires "before" | `window.CrmTemplateLint` must exist when the editor IIFE runs. Dependency graph takes precedence over SPEC text. Logged as D-1. |
| D-RTA-3: Smoke test approach — static grep (no JSDOM) | Criterion 14 relaxation allowed | Static readFileSync grep on crm.html and crm-template-lint.js confirms structural presence. No JSDOM mount required. Clean, fast, no external deps. Documented per criterion 14 note. |
| D-RTA-4: renderLintBanner stays in editor (not lint file) | Lint file must be DOM-free | If renderLintBanner were in the lint file, it would need access to editor-owned DOM elements, creating a circular dependency. Architectural cleanliness > line count parity. |

---

## §5 Self-Assessment Scores (1-10)

| Dimension | Score | Justification |
|---|---|---|
| Scope adherence | 10 | Touched exactly the 5 declared files (+ crm.html as planned for extraction case). No scope creep. |
| Iron Rules | 10 | Rules 12, 21, 22, 31, 32, 34 (deferred to LH-Tester), 35 — all honored. Gate passed exit 0. |
| Commit hygiene | 10 | Explicit filenames, HEREDOC message, Co-Authored-By, staged verify ran before commit, `git diff --cached --name-only` verified. |
| Deviation handling | 9 | 2 deviations found and resolved correctly. D-1 (script tag order) was a SPEC inconsistency — resolved by dependency logic. D-2 (renderLintBanner location) was an architectural decision. Both logged. Deducted 1 because the SPEC ambiguity on script tag order could have been avoided with clearer SPEC text. |

---

## §6 Executor Skill Improvement Proposals

**P-EXEC-1 — Add "script tag dependency order" guidance to executor skill §Code Patterns.**

Current: the executor skill has no guidance on load-order of extracted JS modules in HTML pages.
This SPEC encountered a SPEC-to-code conflict (SPEC said "after editor tag" but lint must load
BEFORE editor). The executor had to reason from dependency graph without a reference rule.
**Proposed change:** Add to `.claude/skills/opticup-executor/SKILL.md` under `## Code Patterns → JS Architecture`: "When inserting a new `<script>` tag for an extracted module, insert it BEFORE any script that depends on the module's `window.*` global. Script tag order in HTML = load order. A SPEC that says 'immediately after X' may be wrong if the module X depends on the new file — dependency graph wins."

**P-EXEC-2 — Add DOM-coupling rule to extraction decision guidance.**

Current: the D-AUTH-2 extraction heuristic says "extract to separate file if editor would exceed 230 lines" but gives no guidance on WHICH functions to extract vs keep in the editor.
This SPEC resolved this by keeping `renderLintBanner` (DOM-coupled) in the editor and extracting the pure-logic functions (validate, levenshtein, constants) to the lint file.
**Proposed change:** Add to `.claude/skills/opticup-executor/SKILL.md` under `## Code Patterns → File discipline`: "When extracting a module under D-AUTH-2 (or similar line-budget extraction): extract PURE functions (no DOM access, no global side-effects) to the new file; keep DOM-coupled helpers in the original file. Never create a circular dependency where the extracted module reads DOM nodes created by the host module."
