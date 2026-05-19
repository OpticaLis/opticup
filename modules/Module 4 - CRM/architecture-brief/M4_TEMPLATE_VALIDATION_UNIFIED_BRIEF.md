# M4_TEMPLATE_VALIDATION_UNIFIED — Architecture Brief

> **Status:** Brief sealed 2026-05-19 evening · Owner: Architect · Pipeline: Full-Auto
>
> **Note on the name:** the slug `M4_TEMPLATE_VALIDATION_UNIFIED` was previously used for a 2026-05-14 SPEC that added `validateTemplateOutput` to `automation-engine/prepare-plan.ts`. That work is Layer B in this Brief. This SPEC ADDS the missing Layer D (UI lint). To avoid slug collision, this SPEC's folder is `M4_TEMPLATE_VALIDATION_UI_LINT`. The Brief title preserved for FUNNEL roadmap legibility (P2.3).
>
> **One-line:** Add client-side placeholder validation to the template editor (`crm-messaging-templates-editor.js`) so authors get an inline warning the moment they save a body containing an unknown `%var%`. Closes the upstream gap that caused the 2026-05-13 incident of 758 rejected SMS sends.
>
> **Risk class:** LOW. Pure frontend addition. Zero schema changes. Zero EF changes. Zero DB triggers.

---

## 1. Goal

Today the universal placeholder scanner fires correctly at dispatch time (Layer A — `send-message` EF) and at enqueue time (Layer B — `automation-engine`). But when a Campaign Overseer adds `%new_var%` to a template body that the resolver doesn't know about, **nothing alerts them**. The first signal arrives hours later as `crm_message_log` rejection rows, by which point the customer didn't receive the message.

This Brief adds **Layer D — UI editor lint**. When the author clicks "Save" on a template, the editor:
1. Parses the body + subject for `%[a-z][a-z0-9_]*%` patterns.
2. Compares against the known resolver universe (15 names from knowledge map §3 + `payment_url_<N>` family).
3. Inline warns if an unknown placeholder appears.
4. Hard-blocks save only when the unknown is clearly broken (typo of a known name, or `payment_url_X` where X doesn't match `tenants.payment_links`).
5. Soft-allows save for genuinely new placeholders, with a confirmation modal explaining the consequence ("Resolver won't know this; messages will be rejected until an Architect SPEC adds it").

After this Brief: a Campaign Overseer that types `%event_dayof_week%` instead of `%event_day_of_week%` will see a red warning inline before they click Save. The class of incident from 2026-05-13 (758 rejected sends) becomes structurally hard to repeat.

## 2. Background

Knowledge map at `roles/site-overseer/knowledge-build/funnel-q3/M1_TEMPLATE_VALIDATION_MAP.md` (generated 2026-05-15 overnight) provides:
- §3 — full placeholder universe (15 names + payment_url family).
- §4 — validation surface map (Layer A, B, C, D classification).
- §6 — Layer D missing analysis.
- §8 — exact UI placement + JS pattern recommendation.

The Brief author reuses these numbers directly. No new investigation needed.

**The 2026-05-13 incident:** 758 SMS rejected on prizma because a manual-send raw body contained `%registration_url%` but `event_id` was NULL at send time, so `injectAutoUrls` never built the URL → universal scanner fail-CLOSED. The post-mortem learned: Layer A worked exactly as designed. The bug was upstream — the operator authoring the raw body didn't know `%registration_url%` requires `event_id`. Layer D would have caught it.

## 3. Scope

**In scope:**

- **Frontend lint function** `validateTemplateBodyPlaceholders(body, subject, context)` in `modules/crm/crm-messaging-templates-editor.js` (or extracted to `modules/crm/crm-template-lint.js` if executor judges it cleaner; pre-flight decides).
- **Resolver universe data** — hardcoded constant `KNOWN_PLACEHOLDERS = [...15 names...]` PLUS pattern `payment_url_<N>` (where N is any positive integer that exists in current tenant's `payment_links` jsonb).
- **Inline UI** — show red squiggle / chip / banner below the editor textarea listing every `%unknown%` it found. Reuse existing CRM editor warning patterns.
- **Save-button gate** — disable Save when the validation has CLEAR errors (typo class). Allow Save with confirmation modal when the placeholder is GENUINELY new (not in `KNOWN_PLACEHOLDERS` AND not a typo of a known name).
- **"Did you mean?" hint** — if `%event_dayof_week%` is typed, suggest `%event_day_of_week%`. Levenshtein distance ≤ 2 against known set.
- **Subject scanning** — same logic on subject field for email templates.
- **Documentation** — extend `docs/CRM_RULE_CHAINING.md` § placeholder validation OR new `docs/CRM_TEMPLATE_LINT.md` (executor decides).
- **Smoke test extension** — `tests/smoke/baseline.test.mjs` adds a test that simulates saving a known-bad template and asserts the editor refused.

**Out of scope (explicitly):**

- Server-side changes (Layer A + B already work correctly; the gap is upstream).
- DB CHECK constraint (Layer C — explicitly rejected in knowledge map §4.3).
- Adding new placeholders to the resolver (separate SPEC per Iron Rule 35; this SPEC only LINTS against the existing set).
- Whatsapp template support (zero rows today; lint doesn't need a WhatsApp branch).
- Changing the universal scanner regex in `_shared/template-validation.ts` (it works correctly).
- Auto-fix / quick-fix actions on the warning (just show + suggest; user fixes manually).

## 4. Cross-Module Safety Audit

### 4.1 What this SPEC touches

| Surface | Access | Reason |
|---|---|---|
| `modules/crm/crm-messaging-templates-editor.js` | **MODIFY** | Add lint function + UI + save gate |
| New file `modules/crm/crm-template-lint.js` (executor decides) | NEW | Optional extraction for clean Iron Rule 12 file size |
| `tests/smoke/baseline.test.mjs` | MODIFY | Add lint regression test |
| `docs/` (new or existing) | MODIFY | Document lint behavior |

### 4.2 What this SPEC EXPLICITLY DOES NOT TOUCH

| Surface | Reason |
|---|---|
| Any DB table | Frontend-only |
| Any DB trigger | Frontend-only |
| Any Edge Function | Frontend-only |
| `_shared/template-validation.ts` | Layer A/B works; not touched |
| `crm_message_templates.required_variables` column | Stays empty — by design |
| `crm_automation_rules` | Untouched |
| Any other module (M1/M2/M3/M5+) | Untouched |
| `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` | Stays canonical — this SPEC reads from §1 contract |

### 4.3 Iron Rule cross-module enforcement

If executor pre-flight finds need to:
- Add new placeholder to resolver → STOP (different SPEC; Iron Rule 35).
- Add DB CHECK constraint → STOP (knowledge map §4.3 forbids).
- Modify any EF → STOP (Layer A/B not in scope).

## 5. Locked Decisions

**D1. Frontend-only — Layer D.** Knowledge map §4.3 already locked: no DB constraint. Knowledge map §6 already locked: Layer A + B are correct. The only remaining valid layer is UI.

**D2. Hardcoded `KNOWN_PLACEHOLDERS` list, not derived from DB.** The 15 names are stable. Adding/removing requires SPEC anyway (Iron Rule 35). Hardcoded list also means lint works without a DB round-trip — faster, simpler.

**D3. Soft-block, not hard-block, on genuinely-new placeholders.** If author types `%xyz%` and it's not similar to any known name, treat as "you're adding a new placeholder — open an Architect SPEC first". Show modal. Allow override with explicit checkbox + audit_log entry (or just show modal and let them cancel). Hard-block only for clear typos.

**D4. Levenshtein distance ≤ 2 for typo detection.** `event_dayof_week` (missing underscore) → suggest `event_day_of_week`. Industry-standard threshold; tuneable in code if false positives.

**D5. Subject field lint = body field lint, byte-identical.** Email templates have both; SMS only body. Lint runs on whichever field exists.

**D6. `payment_url_<N>` family validation reads `tenants.payment_links`.** If template uses `%payment_url_75%` but the tenant only has `payment_links.50` and `payment_links.100`, flag as broken. Reuses existing config.

**D7. NO refactor of save handler.** The lint addition wraps existing `saveLogicalTemplate` validation. Reviewer flags any refactor beyond what's needed for the lint integration.

## 6. Pipeline

Standard Full-Auto Pipeline:

1. **Foreman (opticup-strategic)** authors `SPEC.md` at `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UI_LINT/SPEC.md`.
2. **Executor (opticup-executor)** implements lint function + UI + save gate. Default model: **Sonnet** (mechanical JS; no security-heavy work).
3. **Reviewer (opticup-reviewer)** validates: Iron Rules 12 (file size), 21 (no duplicate), 23 (no secrets), Cross-Module Safety Audit §4 holds.
4. **Localhost-Tester** runs smoke 7/7 + opens template editor in Chrome MCP. Simulates:
   - Save with all-known placeholders → green check + save succeeds.
   - Save with `%event_dayof_week%` typo → red warning + suggestion + save disabled.
   - Save with `%genuinely_new%` → confirmation modal + override path.
5. **Foreman closes** with FOREMAN_REVIEW.md + 4 skill improvement proposals.

## 7. Success Criteria

1. `validateTemplateBodyPlaceholders` function exists, ≤ 60 lines.
2. `KNOWN_PLACEHOLDERS` constant contains exactly 15 names from knowledge map §3 + the `payment_url_<N>` regex.
3. Inline warning chip renders below body textarea when typing/saving with unknown placeholders.
4. Save button disabled when 1+ unknown placeholders detected, UNLESS user explicitly clicks "I know this is new, log it" confirmation.
5. "Did you mean?" suggestion fires for Levenshtein ≤ 2 against known set.
6. Subject field gets same lint when present (email templates).
7. `payment_url_<N>` validates against current tenant's `payment_links`.
8. Smoke 7/7 PASS.
9. Iron Rule 31 integrity gate passes.
10. Cross-Module Safety Audit §4 holds — Reviewer confirms no touch on items in §4.2.
11. Chrome MCP demo: 3 simulated saves (clean / typo / new) all produce correct UI states.
12. Working tree clean at SPEC close.

## 8. Stop-Triggers

Executor MUST stop on any of:

- Pre-flight finds `crm-messaging-templates-editor.js` doesn't exist or has different shape than knowledge map §8 expected.
- Iron Rule 12 violation: lint function pushes editor file over 350 lines and no clean extraction path → STOP, ask Daniel.
- Any §4.3 violation.
- Iron Rule 31 fails.
- Smoke regresses.

## 9. Rollback Plan

Pure JS revert. No DB, no EF, no triggers, no schema → nothing to undo at DB level. Working tag `pre-template-lint-start` at SPEC start.

## 10. Expected Final State

- 1-2 modified files (`crm-messaging-templates-editor.js` + optionally `crm-template-lint.js`).
- 1 modified smoke test file.
- 1 new doc file (or extended existing).
- Demo Chrome MCP screenshots showing all 3 states (clean / typo / new).
- Smoke + integrity GREEN.

## 11. Commit Plan

- C1: Add lint function + UI hook.
- C2: Save-gate logic + confirmation modal.
- C3: Smoke test extension + docs.
- C4: FOREMAN_REVIEW.

## 12. Cross-References

- `roles/site-overseer/knowledge-build/funnel-q3/M1_TEMPLATE_VALIDATION_MAP.md` — full pre-flight analysis (THE source of truth for this Brief).
- `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` §1 — canonical placeholder contract.
- `supabase/functions/_shared/template-validation.ts` — Layer A/B reference (lint mirrors regex).
- 2026-05-13 incident post-mortem (758 rejected SMS) — original motivation.

## 13. Author Notes

Smallest SPEC remaining in FUNNEL Phase 2. ~2-3 hours autonomous. Closes the upstream end of the validation chain — the only end that wasn't validated yet.

After this Brief lands: Phase 2 of the FUNNEL is **fully closed** (P2.1 substrate + Pixel back-wire + Purchase events + Dashboard tile + Template lint). Phase 2.5 (Dashboard + Weekly Brief) becomes the only remaining FUNNEL deliverable before the funnel reaches steady-state operation.

---

*End of Brief. Activation Prompt in sibling file `M4_TEMPLATE_VALIDATION_UNIFIED_ACTIVATION_PROMPT.md`.*
