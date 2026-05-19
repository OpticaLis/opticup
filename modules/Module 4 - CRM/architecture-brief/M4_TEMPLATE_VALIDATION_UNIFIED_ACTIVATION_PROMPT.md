# M4_TEMPLATE_VALIDATION_UNIFIED — Activation Prompt

Paste into a fresh Claude Code chat.

---

```
Run the Full-Auto Pipeline for M4_TEMPLATE_VALIDATION_UNIFIED (FUNNEL Phase 2.3).

Brief: modules/Module 4 - CRM/architecture-brief/M4_TEMPLATE_VALIDATION_UNIFIED_BRIEF.md

SPEC folder (slug renamed to avoid collision with prior 2026-05-14 SPEC):
modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UI_LINT/SPEC.md

MANDATORY PRE-FLIGHT READING (before Foreman authors SPEC):
1. The Brief above — read in FULL, §4 Cross-Module Safety Audit.
2. roles/site-overseer/knowledge-build/funnel-q3/M1_TEMPLATE_VALIDATION_MAP.md — full pre-flight analysis. THE source of truth.
3. roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md §1 — canonical placeholder contract.
4. supabase/functions/_shared/template-validation.ts — Layer A/B reference. Lint regex mirrors it.
5. modules/crm/crm-messaging-templates-editor.js — the file being modified.

Load opticup-strategic (Foreman) first to author the SPEC. Then chain to opticup-executor, opticup-reviewer, opticup-localhost-tester, and back to opticup-strategic (Foreman closure).

MODEL RECOMMENDATION:
- Foreman: Opus.
- Executor: Sonnet (claude-sonnet-4-20250514).
- Reviewer + Localhost-Tester: default.
- Foreman closure: Opus.

KEY CONSTRAINTS FROM BRIEF:
- Per Iron Rule 32: Destructive Operations declared = 0. All changes additive (new function + UI elements).
- Cross-Module Safety Audit §4 is BINDING. NO touch on DB, EF, triggers, _shared/template-validation.ts.
- Per Iron Rule 35: NO new placeholders added to resolver. This SPEC only LINTS the existing 15-name set.
- Per Iron Rule 12: file size discipline. If editor file would exceed 350 lines → extract `crm-template-lint.js`.
- Per Iron Rule 21: no duplicate lint function. Confirm `validateTemplateBodyPlaceholders` doesn't already exist.
- D1: Layer D (UI) only — Layer A (EF) + Layer B (engine) untouched.
- D2: hardcoded KNOWN_PLACEHOLDERS list, not DB-derived.
- D3: SOFT-BLOCK on genuinely-new placeholders (modal + override). HARD-BLOCK on clear typos.
- D4: Levenshtein ≤ 2 for typo detection.
- D5: subject + body both linted.
- D6: payment_url_<N> validates against tenants.payment_links.
- D7: NO refactor of saveLogicalTemplate beyond lint integration.

PRE-FLIGHT REQUIRED:
- Read knowledge map M1 §3 — confirm 15-name placeholder list matches what the EF actually injects today.
- Read knowledge map M1 §8 — UI integration pattern.
- Verify modules/crm/crm-messaging-templates-editor.js current line count + saveLogicalTemplate location.
- Verify no existing lint helper file (Iron Rule 21).
- Read tenants.payment_links current shape to validate D6.

STOP TRIGGERS (over and above Brief §8):
- Editor file >>350 lines AND clean extraction not obvious → STOP, ask Daniel.
- Pre-flight finds 16th placeholder in use that knowledge map missed → STOP, escalate (knowledge map needs update).
- Iron Rule 31 gate fails.
- Smoke regresses.

VERIFICATION GATES:
- Smoke 7/7 PASS.
- Chrome MCP test (Localhost-Tester):
  - Save template with all-known placeholders → green check.
  - Save with %event_dayof_week% typo → red warning + suggestion "Did you mean %event_day_of_week%?" + Save disabled.
  - Save with %genuinely_new_var% → confirmation modal "Resolver doesn't know this. Open Architect SPEC first?" + override path.
- Iron Rule 31 + 32 gates pass.
- Cross-Module Safety Audit §4 holds.

POST-SPEC DELIVERABLES:
- 1-2 modified JS files.
- 1 modified tests/smoke/baseline.test.mjs (lint regression test).
- 1 doc (new docs/CRM_TEMPLATE_LINT.md OR extension to existing).
- FOREMAN_REVIEW.md.
- Memory update: project_overview.md or similar to note Layer D shipped.

When done, surface a Hebrew one-line status to Daniel.
```

---

*End of Activation Prompt.*
