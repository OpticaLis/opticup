# FOREMAN_REVIEW — M4_CAMPAIGNS_SCREEN (v2)

> **Verdict:** 🟡 **CLOSED WITH FOLLOW-UPS**
> **Reviewer:** opticup-strategic (Cowork session 2026-04-26 PM, Daniel-led)
> **Reviewed commits:** 5d733ae (SPEC), d2361dd (DB), 2607d1a (EF), 12503aa + efb2e6b + a3fa8c4 (frontend, 3 sub-commits), e326532 (retro)

---

## SPEC quality audit

This was a v2 SPEC — the v1 was caught mid-execution by an Iron Rule 21 cross-reference failure (existing `crm_unit_economics` table with different schema). The fact that v2 was needed at all is the primary lesson. v1 ran the cross-reference check against canonical docs (`docs/GLOBAL_SCHEMA.sql`, `MODULE_MAP.md`) and found 0 collisions — but those canonical docs were stale relative to the live DB. The check passed on paper while the live DB held the contradicting infrastructure.

What the v2 SPEC got right:
- §2 Background documented every existing table with its current state, schema, and decision (touch / DROP+CREATE / leave alone).
- §4 Autonomy Envelope explicitly authorized DROP+CREATE on the 3 tables based on Daniel's "data isn't precious — P7 will re-import" approval.
- §5 Stop trigger #2 explicitly named `crm_campaigns` (the event-type templates table) as OFF LIMITS, distinguishing it from `crm_facebook_campaigns`. The naming similarity was a real risk — the executor honored the boundary correctly.
- §11 Lessons Already Incorporated cited the multipliers vs thresholds discussion to make the decision discoverable.

What v2 could have done better:
- §3 criterion 18 specified "the multiplier explanation ('Kill: 4 × 20% × 1000 = ₪800')" — but didn't prescribe where in the modal to render it. The executor made a reasonable choice, but the SPEC could have shown a wireframe sketch.
- §10 Pre-flight should have included the `wc -l crm.html` baseline. The executor discovered mid-execution that crm.html is at 408 lines (over 350 cap) and flagged M4-DEBT-CAMP-02 — could have been caught at SPEC author time.

## Execution quality audit

Strong execution. 30/30 criteria passed. 3 documented deviations, all handled correctly per Bounded Autonomy:

1. **Commit 3 split into 3a/3b/3c** — rule-21-orphans hook flagged IIFE-blind helper name collisions. Executor split commits per Step 1.5g guidance. Correct call.
2. **Migration path moved** to `modules/Module 4 - CRM/migrations/` instead of the `campaigns/supersale/migrations/` path the SPEC suggested. This is following Module 4 convention discovered mid-SPEC. Documented in EXECUTION_REPORT — appropriate.
3. **`crm-unit-economics-modal.js` opened at 207 lines, compressed to 198** to meet §3.20 (≤200 lines). Executor noticed and self-corrected before commit. Good discipline.

MCP `deploy_edge_function` failed (matches the morning's known issue) — executor fell back to CLI per §11 guidance. Correct.

## Findings processing

| # | Finding | Severity | Action |
|---|---|---|---|
| F1 | M4-DEBT-CAMP-01 — FIELD_MAP entries for new tables deferred (Rule 5) | LOW | Bundle with M4-DEBT-P18-01 (FIELD_MAP split SPEC blocked by `js/shared.js` at 408L). Will resolve together. |
| F2 | M4-DEBT-CAMP-02 — `crm.html` at 408L (over 350 hard cap) | MEDIUM | New SPEC `M4_CRM_HTML_SHRINK` recommended. Same pattern as M1_RECEIPT_PO_COMPARE_SHRINK from earlier today — find deletable lines before next addition. Daniel's call when to schedule. |
| F3 | M4-DEBT-CAMP-03 — `crm_campaign_pages` orphan (Phase A leftover, 0 rows, 0 readers) | LOW | Add to next CRM cleanup SPEC. Safe to DROP at any time. |

No CRITICAL or HIGH findings.

## 2 author-skill improvement proposals (opticup-strategic)

### Proposal 1 — Add "live-DB cross-reference" step to Step 1.5

**Section to update:** SKILL.md → Step 1.5 (Cross-Reference Check) → new sub-step Step 1.5j.

**Change:** the existing cross-reference check (Step 1.5 §2) greps canonical docs (`docs/GLOBAL_SCHEMA.sql`, `MODULE_MAP.md`, etc.). This SPEC's v1 demonstrated those docs can be MONTHS stale relative to the live DB — false-negative collision check. New mandatory sub-step: when the SPEC introduces or modifies any table/view/RPC, run `SELECT table_name FROM information_schema.tables WHERE table_name = '<name>'` against the live DB BEFORE drafting §8. If the object exists with a different schema — the SPEC must either adapt or explicitly DROP+CREATE with rationale documented in §2 Background.

Rationale: this would have caught v1's failure at SPEC author time, not execution time. v2 was a complete rewrite that cost ~30 minutes; a 1-minute live-DB query would have saved it.

### Proposal 2 — Cross-reference live `crm.html` line count for any frontend SPEC

**Section to update:** SKILL.md → Step 1.5e (file-size pre-flight refresh) → extend.

**Change:** when a SPEC modifies `crm.html` (or any other shell HTML at module root), the SPEC author must include the live `wc -l` count in §10 Pre-flight Checks even if the SPEC's modifications are small. This SPEC discovered crm.html at 408L mid-execution — could have been a stop-trigger if any sub-commit needed >+5 lines. Catching at author time would let the SPEC prescribe parallel shrink work or scope reduction.

## 2 executor-skill improvement proposals (opticup-executor)

(Per EXECUTION_REPORT §8 — already captured.)

1. Add Step 1.5g pre-execution simulation of rule-21-orphans on planned staged set.
2. file-size pre-flight should also fire for files already over the cap (`crm.html`).

Both apply at next opticup-executor skill update sweep.

## Master-doc update checklist

| File | Status |
|---|---|
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Pending — add Phase History row for M4_CAMPAIGNS_SCREEN |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | Pending — add 3 new JS files + EF + 3 modified tables |
| `modules/Module 4 - CRM/docs/db-schema.sql` | Pending — refresh schema for crm_facebook_campaigns + crm_ad_spend + crm_unit_economics + view |
| `MASTER_ROADMAP.md` | Pending — note campaigns measurement infra ready (P7 dependency cleared) |
| `docs/GLOBAL_MAP.md` | Pending Integration Ceremony — new EF `facebook-campaigns-sync` |
| `docs/GLOBAL_SCHEMA.sql` | Pending Integration Ceremony — 3 modified tables + recreated view |

All 6 doc updates are pending — recommend bundling into a single Integration Ceremony commit at next session start.

## Verdict

🟡 **CLOSED WITH FOLLOW-UPS.**

The campaigns measurement infrastructure is end-to-end functional: DB rebuilt to support daily snapshots, Edge Function deployed and curl-verified, frontend screen integrated into CRM sidebar. The screen will display live data the moment Daniel builds the Make scenario per `outputs/MAKE_SCENARIO_FB_CAMPAIGNS_SPEC.md`.

3 follow-up tasks (all documented findings, all LOW/MEDIUM, none blocking): FIELD_MAP entries deferred, `crm.html` shrink SPEC needed, `crm_campaign_pages` orphan cleanup. None of these prevent the screen from working today.

The biggest lesson — both for this SPEC and for the project's authoring discipline — is that canonical docs can drift from live DB. The author-skill Proposal 1 (live-DB cross-reference at SPEC time) addresses this systemically.

Browser smoke is the only QA gap: Cowork can't reach localhost. Daniel verifies manually after pull. Risk: low — the screen is fully isolated by panel container, no shared state with other tabs.

---

*End of FOREMAN_REVIEW.md.*
