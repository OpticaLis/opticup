# FINDINGS — M4_TEMPLATE_VALIDATION_UI_LINT

> **Executor:** opticup-executor (Claude Sonnet 4.6)  
> **Date:** 2026-05-19

Findings discovered during execution that are NOT in this SPEC's scope.

## F-A1 (INHERITED) — Knowledge map path does not exist
- **Severity:** INFO
- **Location:** `roles/site-overseer/knowledge-build/funnel-q3/M1_TEMPLATE_VALIDATION_MAP.md`
- **Description:** Brief cited this path as source-of-truth for placeholder universe. File does not exist. SPEC §3.5 + D-AUTH-1 contain equivalent content. No functional impact.
- **Action:** Separate session — author the map or remove the citation from Brief.

## F-A2 (INHERITED) — M4_INFRASTRUCTURE_CONTRACT.md §1.3 stale on coupon_code
- **Severity:** INFO
- **Location:** `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md §1.3`
- **Description:** Contract labels coupon_code "out-of-scope". In reality it is auto-resolved by send-message/event-variables.ts:113 (P33 Fix A 2026-04-30). 2 active templates use it; 0 rejections in 30 days. KNOWN_PLACEHOLDERS already includes coupon_code.
- **Action:** Doc-only refresh in a Daniel-authorized session. Track in OPEN_TASKS.

## F-A3 (INHERITED) — Brief "15 names" vs actual 14 + payment_url family
- **Severity:** INFO
- **Location:** `modules/Module 4 - CRM/architecture-brief/M4_TEMPLATE_VALIDATION_UNIFIED_BRIEF.md`
- **Description:** Brief approximated "15 names"; Foreman resolved as 14 named + payment_url family. KNOWN_PLACEHOLDERS is now exact. No code impact.
- **Action:** Brief is sealed — D-AUTH-1 is the authoritative amendment. Dismiss.

## F-EXEC-1 (NEW) — SPEC §4 script tag order contradicts dependency graph
- **Severity:** LOW
- **Location:** `modules/Module 4 - CRM/docs/specs/M4_TEMPLATE_VALIDATION_UI_LINT/SPEC.md §4`
- **Description:** SPEC §4 states insert lint tag "immediately after" the editor tag. But window.CrmTemplateLint must exist before the editor IIFE runs, so lint tag must precede editor tag. Executor resolved correctly (lint before editor in crm.html). SPEC text was incorrect.
- **Action:** Foreman to note as SPEC-authoring lesson: check dependency graph when specifying script tag order. No code fix needed.
