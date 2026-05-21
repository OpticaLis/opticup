# FOREMAN_REVIEW — M4_SHORT_LINKS_CODE_TENANT_SCOPED_UNIQUE

> **Verdict:** 🟡 **AUTHORED ONLY — EXECUTION DEFERRED.**

## Audit
- Migration authored correctly with inline pre-check + apply + post-check + caller-compatibility notes.
- IR32 honored: destructive ops declared + pre-check required + execution gated on pre-check 0-result.
- Did NOT apply — Supabase intermittent connectivity outage during Sprint 3 made the pre-check impossible.
- Resume path documented in EXECUTION_REPORT §"When to resume" + migration file header.

## IR34 runtime trace evidence
**N/A** — no runtime change made. Chrome MCP not applicable to constraint-shape migrations.

## Verdict justification
🟡 — the responsible action when a destructive migration's pre-check can't run is to author + commit + DEFER, not to apply blindly. Daniel's explicit instruction was "check first, STOP if collisions exist". Without the check, applying is forbidden.

This Item is shippable as a "scheduled deferral" — Daniel runs the pre-check + apply in the next stable session.

## Sprint 4 prerequisites
- Supabase responsive.
- Daniel runs the pre-check (one SELECT).
- If 0 collisions: apply via `apply_migration`.
- If any collisions: surface them + plan per-collision resolution (rename via the Item-5 edit RPC).

## Sprint 4 follow-up
- `M4_SHORT_LINKS_CODE_GEN_TENANT_SCOPED_CHECK` — tighten the code-generation collision check in 3 RPCs to include tenant_id scope (post-migration the global check is overly strict but safe).

## 2 author-skill proposals
1. **Constraint-shape SPECs targeting an UNIQUE migration MUST include a non-zero-rows pre-check that, if violated, blocks apply.** This SPEC's authored migration enforces this in the file itself (inline pre-check + execution gate). Codify as a SPEC template requirement.
2. **For SPECs whose execution depends on external service availability, declare the dependency in §1 acceptance bar.** Catches issues at author time rather than at execution.

## 2 executor-skill proposals
(See EXECUTION_REPORT — endorsed.)

---
*End of FOREMAN_REVIEW.*
