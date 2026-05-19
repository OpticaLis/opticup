# Architect-Decision (Supervisor Triage) — uuid-ossp schema resolution failure in M4_FB_CAPI_PURCHASE_EVENTS trigger functions

Status: SHADOW_PROPOSAL
Triage-by: opticup-supervisor
Triage-at: 2026-05-19T15:55:00Z
Source escalation: `modules/Module 4 - CRM/escalations/2026-05-19T15-50-00Z_M4_FB_CAPI_PURCHASE_EVENTS_UUID_OSSP_SCHEMA.md`
Confidence: 1

Cited source: none — genuinely-novel situation; no canonical entry matches.
Cited entry: n/a

## Proposed resolution

**Author a tight follow-up SPEC** (suggested slug `M4_FB_CAPI_PURCHASE_EVENTS_UUID_FIX`) that re-applies the 3 trigger functions via `CREATE OR REPLACE FUNCTION` with schema-qualified `extensions.uuid_generate_v5(extensions.uuid_ns_oid(), ...)`. Single C2 commit, single migration, ~30 LoC. No EF change, no triggers re-created (`CREATE OR REPLACE FUNCTION` is non-destructive in IR32 terms), no constraint touch. After Executor + Reviewer + LH-Tester re-run on the fix, this SPEC's deferred E2E criteria (14–19) are then exercised against the fixed triggers. This SPEC's overall closure status pivots on the follow-up SPEC's green light.

The LH-Tester's Option A recommendation is sound and consistent with project convention (other M4 EFs that bridge `auth.*` <-> `public.*` schemas qualify explicitly). The Supervisor cannot offer a high-confidence cite because no canonical entry has documented this specific Supabase-extensions-schema gotcha yet. Therefore — **Confidence 1, escalation continues.**

## Reasoning for Pipeline

Step 2 Hard-Stop check: no category fires. Step 3 search returned 0 hits across sources 1–5 (DECISIONS_LOG, CROSS, M4 detail, CLAUDE.md, MASTER_ROADMAP). Auto-memory was also empty for this keyword set. The only repo reference to `uuid_generate_v5` is in the just-merged migration itself, which is the broken pattern.

The Confidence 1 verdict is the Ladder's "genuinely novel" rung — no prior decision applies. Per Core protocol Step 4 hard rule, Confidence ≤ 2 → escalation continues. Per skill-destinations.md, this is rule-application-shaped (a request for "which path do I take?" given the broken state) — Hard-Stop does NOT fire even though the LH-Tester touched the words `DROP CONSTRAINT`/`destructive` while describing what to AVOID; the proposed fix is purely additive.

## Resume instruction

For the originating Localhost-Tester skill: close this SPEC's TEST_REPORT.md as **RED — env-blocker (trigger semantics regression: schema-resolution failure)** with smoke 7/7 PASS captured + the deferred E2E criteria explicitly marked BLOCKED / NOT RUN. Cite the escalation file path. Hand back to the Foreman per Pipeline Hand-off step 5. Do NOT proceed with E2E Tests 1–6 against the current code. Do NOT attempt any fix from this skill.

For the Foreman closing the SPEC: receive the LH-Tester's RED TEST_REPORT, then either (a) author the follow-up SPEC as Option A above, or (b) treat the broken triggers as a P0 emergency and authorize a hot-patch migration directly (escalation owner decision). Recommend (a) for hygiene: the same Pipeline rails should catch any re-occurrence at the Executor's Step 1.5 DB pre-flight.

## Escalation continues

**yes** — Shadow Mode (always yes per Core protocol) + Confidence 1 (would still be "yes" in Active Mode).

The originating Localhost-Tester skill emits its standard `🛑` escalation line after this Supervisor status line, per CLAUDE.md §11 → Supervisor layer Shadow Mode.
