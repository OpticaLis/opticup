# Optic Up — Skill Destinations + Hard-Stops

This Adapter file defines two project-specific tables the Supervisor consults:

1. **Hard-Stop categories** — escalations the Supervisor ALWAYS forwards
   without searching (consumed by Core Step 2).
2. **Pattern → skill destination** — which existing skill file a future
   promotion proposal targets (consumed by Phase 3 Auto-Harvest, NOT by
   Phase 1 Triage). For SPEC 1, this table is descriptive reference only.

---

## Hard-Stop Categories (consumed by Core Step 2)

Escalations matching ANY category below ALWAYS escalate to the escalation
owner. The Supervisor skips Step 3 (search) entirely. These rules are
absolute — they override the Confidence ladder.

| Category | Trigger keywords (any match) | Why Hard-Stop |
|---|---|---|
| **production-tenant-write** | `Prizma`, `production tenant`, `tenant Prizma`, `live tenant`, the Prizma tenant UUID | Per Architect pending entry C-006 (2026-05-17): production tenant writes require explicit per-event authorization from the escalation owner. No blanket safe-to-write rules. |
| **main-branch-touch** | `merge to main`, `push to main`, `checkout main`, `git push origin main`, `branch main` | Per CLAUDE.md §9 #7: never checkout main, never push to main, never merge to main. Only the project owner can authorize a merge to main. Non-overridable. |
| **strategic-scope-change** | `module retirement`, `architectural pivot`, `cross-module decision`, `scope expansion beyond SPEC`, `kill switch`, `feature flag default` | Strategic-level decisions are the Architect-Daniel pair's territory; Supervisor's role is operational triage only. |
| **iron-rule-change** | `change Iron Rule`, `update CLAUDE.md §4`, `update CLAUDE.md §5`, `update CLAUDE.md §6`, `new Iron Rule` | Iron Rules are project constitution. Changes require Daniel-Architect deliberation, never Supervisor inference. |
| **rls-policy-change** | `RLS policy`, `tenant isolation policy`, `service_bypass policy`, `change USING clause`, `disable RLS`, `BYPASSRLS` | Tenant-isolation policies are security-critical. Confidence-5 quote from the canonical RLS pattern is not sufficient — every RLS change must be explicitly authorized. |
| **secrets-exposure** | `API key in code`, `password in git`, `JWT secret in commit`, `service_role key`, `credentials.env on disk` | Iron Rule 23 plus operational security. Supervisor never autonomously resolves a secrets question; the escalation owner must see it. |
| **destructive-supabase-op** | `DROP TABLE`, `DROP POLICY`, `TRUNCATE`, `DELETE FROM` without WHERE+tenant_id, `ALTER TABLE ... DROP`, `force-push to develop` | Per Iron Rule 32 + Supabase MCP autonomy: destructive DB operations may be SPEC-declared but still require escalation if encountered mid-run. The Supervisor never grants the bypass. |

The Supervisor's Step 2 scans the escalation's `Stuck at:` + `Question for
Architect:` fields for any of the trigger keywords. A match → write a
`Status: NO_TRIAGE_HARD_STOP` response with `Cited source:` pointing here.

The escalation may also include an explicit `Hard-Stop: <category>` tag in
its metadata; the Supervisor trusts the tag and short-circuits identically.

---

## Pattern → Skill Destination (Phase 3 reference — NOT consumed by Phase 1)

This table maps recurring-pattern types to the skill file that should receive
a future promotion proposal. Consumed by Phase 3 Auto-Harvest, NOT by Phase 1
Triage. For SPEC 1, this table is documentation only.

| Pattern type | Destination skill | Target section in that skill |
|---|---|---|
| SPEC authoring lesson (criteria not measurable, missing section, etc.) | `.claude/skills/opticup-strategic/SKILL.md` | "SPEC Authoring Protocol" / "Pre-SPEC Preparation" |
| SPEC template improvement (new required section, new pre-flight) | `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` | the relevant numbered section |
| Executor implementation lesson (verification recipe, post-edit pattern) | `.claude/skills/opticup-executor/SKILL.md` | "Verification After Changes" / "Code Patterns" / "Visual re-skin patterns" / "Layout patterns" |
| Executor pre-flight lesson (DB Pre-Flight, view probe, tooling check) | `.claude/skills/opticup-executor/SKILL.md` | "Step 1.5 — DB Pre-Flight Check" |
| Reviewer audit heuristic (new check, regex template, security anti-pattern) | `.claude/skills/opticup-reviewer/SKILL.md` | "Audit Heuristics" / "Iron Rule compliance" |
| Localhost-Tester runtime lesson (smoke recipe, VFV protocol, browser-MCP) | `.claude/skills/opticup-localhost-tester/SKILL.md` | "Smoke Recipes" / "Authority and escalation" |
| Cross-module architecture lesson (module boundary, contract pattern) | `.claude/skills/opticup-architect/SKILL.md` | "Behavior Patterns" / "Decision Map" |
| Iron Rule clarification or addition | `CLAUDE.md` §4 / §5 / §6 | (Daniel-Architect decision required — Phase 3 generates a proposal only; no auto-apply) |
| Project-portable Core-layer lesson (applies to any Supervisor-style skill) | `.claude/skills/opticup-supervisor/core/*.md` | the relevant protocol file |
| Optic Up-specific Adapter lesson (decision-source priority, hard-stop category) | `.claude/skills/opticup-supervisor/adapters/opticup/*.md` | the relevant adapter file |

### Promotion threshold (Phase 3)

A pattern qualifies for promotion when it has fired **3 times across 3
distinct SPECs**. This is consistent with the existing self-improvement
mandates in opticup-strategic and opticup-executor (3 consecutive reviews →
mandatory promotion).

Phase 3 writes the proposal to `_archive/supervisor-pending-promotions/`
with filename `{YYYY-MM-DD}_{PATTERN_SLUG}.md`. The proposal includes:
- Pattern observed (1–2 sentence summary).
- 3 source SPECs (paths + commit hashes).
- Recommended destination from this table.
- Exact text to add to the destination skill file.
- Classification: Core (project-agnostic) vs Adapter (Optic Up specific).

The escalation owner reviews the inbox at their convenience. Approval is a
single Daniel→Supervisor message; the Supervisor applies the edit + updates
the Pattern Recurrence Tracker. **Supervisor never auto-applies** (Brief §3.3).

---

## Phase-1 reminder

**For SPEC 1 (the current Phase 1 Triage ship): this file is consulted ONLY
for Hard-Stops (table 1).** The Pattern → Skill table is documentation that
makes Phase 3 buildable later; it is not consumed by Triage logic in Phase 1.

A Reviewer audit that flags Phase-3-only content in this file as "dead code"
is INCORRECT — the content is descriptive reference, intentionally present
ahead of Phase 3 implementation, so the Adapter is feature-complete from
day one. This was confirmed at SPEC-1 authoring time.

---

*End of skill-destinations.md.*
