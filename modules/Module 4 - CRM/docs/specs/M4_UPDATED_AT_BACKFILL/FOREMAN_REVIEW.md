# FOREMAN_REVIEW — M4_UPDATED_AT_BACKFILL

**SPEC:** `modules/Module 4 - CRM/docs/specs/M4_UPDATED_AT_BACKFILL/SPEC.md`
**Reviewed by:** Foreman (opticup-strategic) — written by Full Auto Pipeline at SPEC close
**Date:** 2026-05-14

---

## 1. Verdict

✅ **SPEC closed cleanly.** Two ALTER + two backfill + two CREATE TRIGGER executed exactly per declared §Destructive Operations; row-count delta = 0 on all 6 (table × tenant) buckets; demo smoke verified `updated_at` advances on every UPDATE for all three target tables. Discovery showed `crm_automation_rules` already complete pre-SPEC → Rule 21 prevented duplicate work. Two commits. No stop triggers fired. No escalation. Brief §1 intent (close Audit Rec 8) achieved.

## 2. What the Executor did well

- **Pre-flight introspection before DDL.** Captured row counts on both tenants and inspected `pg_proc` / `pg_trigger` BEFORE writing the SPEC. That is what caught the `crm_automation_rules` already-complete state — and saved an ALTER that would have errored.
- **Rule 21 reuse.** Reused `public.update_updated_at()` without proposing a new function. Reused the recent CRM trigger-naming convention (`{table}_set_updated_at_trg`).
- **Honest §Destructive Operations.** Declared 6, executed 4, documented 2 skipped in §6 of EXECUTION_REPORT with explicit reason — Rule 21. No silent omission.
- **Smoke design.** Chose deterministic existing-row no-op UPDATE over insert+delete. Avoided 3 FK-plumbing chores and zero cleanup pollution. The `transaction_timestamp()` constraint was correctly handled by using two separate MCP calls.

## 3. What I'd push back on (none significant)

Nothing material. The SPEC is one of the cleanest small-scope hygiene closures in M4's history. Two minor nits if I'm being pedantic:

- **SPEC §4 wording.** Item #3 says "no cross-tenant `WHERE`" but the UPDATE is genuinely intentionally unfiltered (every row gets `updated_at = created_at`, the same operation per row, no tenant disparity). Could read more cleanly as "intentionally non-tenant-scoped because the operation is structurally identical per row."
- **EXECUTION_REPORT §5 'smoke "cleanup"'.** The wording "no test rows were inserted" is correct but the section header still says "cleanup" — slightly misleading. Future SPECs using the deterministic-row pattern should rename this header to "smoke side effects" so the meaning matches.

Neither warrants a follow-up commit.

## 4. Cross-finding actions (from FINDINGS.md)

| Finding | Owner | Proposed next step |
|---|---|---|
| #1 — Debt register out of date | Architect + Sentinel | Schedule a Sentinel mission diff between open-debt register and live-DB state. Low priority. |
| #2 — Trigger naming split | Architect | Optional: `TRIGGER_NAME_CONSOLIDATION` SPEC. Cosmetic, low risk. Not scheduled. |
| #3 — `crm_leads` missing auto-stamp trigger | Architect | Decide whether to schedule `CRM_LEADS_UPDATED_AT_TRIGGER` SPEC. ~5 min execution. RECOMMEND yes — completes the canonical pattern across CRM. |
| #4 — Shared function default | Foreman | Adopt as a default rule when a Brief leaves the fork open. Add to opticup-strategic SKILL.md §"SPEC Authoring Protocol" — see proposal A below. |
| #5 — Deterministic-row smoke | Foreman | Adopt as the preferred smoke pattern for additive trigger SPECs. Add to opticup-strategic SKILL.md SPEC_TEMPLATE.md — see proposal B below. |
| #6 — `transaction_timestamp` semantics | Foreman | Document in SPEC_TEMPLATE.md under "Smoke design pitfalls". |

## 5. Self-improvement proposals for opticup-strategic skill

Per the skill's self-improvement contract (every FOREMAN_REVIEW must include 2 concrete proposals harvested from the SPEC's execution data):

### Proposal A — Brief Forks: Default to Shared (Rule 21)

**Current state:** Briefs sometimes leave a fork open ("Pipeline decides between shared X vs per-Y X"). Without guidance, the Pipeline could go either way.

**Proposal:** Add to opticup-strategic `SKILL.md` §"SPEC Authoring Protocol", under a new sub-section "Brief fork resolution":

> When a Brief presents a "shared X vs per-Y X" fork, the SPEC author defaults to **shared** when a project-wide instance of X already exists in `pg_proc` / `pg_class` / source. Document the chosen path with a `pg_proc` snippet showing the reused symbol. This is a direct application of Rule 21.

**Evidence:** This SPEC's §2.1 + Finding #4 + the Executor's choice to reuse `public.update_updated_at()`.

### Proposal B — SPEC_TEMPLATE.md adds "Smoke design pitfalls" section

**Current state:** SPEC_TEMPLATE.md has a §Smoke section but no guidance on which smoke patterns to choose between insert+delete vs no-op UPDATE vs trigger-pattern verification.

**Proposal:** Add a short "Smoke design pitfalls" sub-section listing:

1. Prefer deterministic-existing-row no-op UPDATE over insert+delete for additive trigger SPECs (Finding #5).
2. For triggers using `now()`/`transaction_timestamp()`, use SEPARATE transactions to verify per-UPDATE advancement (Finding #6).
3. For unique-constraint-laden tables (`crm_event_attendees` has compound UNIQUE), avoid inserting fresh rows in smoke unless the SPEC's unique-key story is bulletproof.

**Evidence:** Findings #5 + #6.

---

*End of FOREMAN_REVIEW.*
