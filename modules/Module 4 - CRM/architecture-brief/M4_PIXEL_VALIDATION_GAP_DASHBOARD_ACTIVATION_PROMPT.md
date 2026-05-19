# M4_PIXEL_VALIDATION_GAP_DASHBOARD — Activation Prompt

Paste the block below into a fresh Claude Code chat to run the Full-Auto Pipeline end-to-end.

---

```
Run the Full-Auto Pipeline for M4_PIXEL_VALIDATION_GAP_DASHBOARD.

Brief: modules/Module 4 - CRM/architecture-brief/M4_PIXEL_VALIDATION_GAP_DASHBOARD_BRIEF.md

SPEC location:
modules/Module 4 - CRM/docs/specs/M4_PIXEL_VALIDATION_GAP_DASHBOARD/SPEC.md

MANDATORY PRE-FLIGHT READING (before Foreman authors SPEC):
1. The Brief above — read in FULL including §4 Cross-Module Safety Audit.
2. roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md — contains the 3 SQL queries to use VERBATIM (§2 detail + §2.1 aggregate + §2.2 7-day trend) + index recommendation (§7) + UI sketch (§5).
3. roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md — confirms which M4 surfaces are off-limits per Iron Rule 35.
4. modules/Module 4 - CRM/docs/specs/M4_FB_CAPI_HYBRID_DEDUPLICATION/SPEC.md — schema reference for crm_capi_dispatch_queue + crm_leads.fb_event_id / fb_pixel_fired_at columns.

PLACEMENT HINT (still confirm via pre-flight):
- Suggested parent: modules/crm/crm-messaging-performance.js (M4_MESSAGE_PERFORMANCE_TRACKING screen, "ביצועי הודעות" sub-tab in Messaging Hub).
- Existing pattern in that file: `renderMessagingPerformance(host)` is called when the tab activates; host gets innerHTML assignment. Mirror that pattern.
- Tab registration is in crm-messaging-tab.js. If new tab needed instead of embed → STOP and ask Daniel.

Load opticup-strategic (Foreman) first to author the SPEC. Then chain to opticup-executor, opticup-reviewer, opticup-localhost-tester, and back to opticup-strategic (Foreman closure).

MODEL RECOMMENDATION:
- Foreman: Opus.
- Executor: Sonnet (claude-sonnet-4-20250514). Pure frontend JS + SELECT queries.
- Reviewer + Localhost-Tester: default model.
- Foreman closure: Opus.

KEY CONSTRAINTS FROM BRIEF:
- Per Iron Rule 32: Destructive Operations declared = 0. All changes additive.
- READ-ONLY everywhere. Pure SELECT queries on crm_leads + crm_capi_dispatch_queue.
- Cross-Module Safety Audit §4 of Brief is BINDING. If executor needs to touch ANY table in §4.2 OR EF in §4.4 OR trigger in §4.6 → STOP and escalate.
- Per Iron Rule 35: NO new template placeholders. NO new automation rule action_types. NO new trigger types.
- Use the 3 queries from knowledge map (roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md §2 + §2.1 + §2.2) verbatim.
- Tile file ≤ 100 lines per Iron Rule 12.
- D2: embed in existing CRM screen (executor pre-flight identifies which). NO new page/route.
- D3: drill-down via Modal from shared/, not new page.
- D4: queries p95 < 100ms on demo. If exceeded → ship partial index from knowledge map §7 as part of SPEC.
- D5: NO "back-wire unverified" banner — back-wire shipped 2026-05-19.
- D6: Hebrew labels.
- D7: NO real-time refresh.

PRE-FLIGHT REQUIRED:
- Identify the parent CRM screen for the tile. If more than 2 candidates → STOP and escalate (need Daniel input).
- Verify queries from knowledge map run on demo within 100ms p95. If they don't → gate the partial index commit.
- Verify NO duplicate gap-tile already exists (Iron Rule 21).

STOP TRIGGERS (over and above Brief §8):
- Iron Rule 31 integrity gate fails.
- Smoke regresses.
- Any §4.9 violation.

VERIFICATION GATES:
- Smoke 7/7 PASS.
- Tile renders on demo + on staging.
- Drill-down modal opens with at least 0 rows (graceful 0-state).
- Cross-Module Safety Audit §4 holds — Reviewer confirms NO touch on items in §4.2/§4.4/§4.6.

POST-SPEC DELIVERABLES:
- 1 new file (crm-pixel-gap-tile.js).
- 1 modified parent file.
- 1 doc paragraph update (docs/FB_CAPI.md).
- Optionally 1 migration (gated by D4).
- FOREMAN_REVIEW.md.

POST-SPEC MEMORY UPDATE:
- Update project_fb_capi_p21_state.md to mark P2.2 fully closed (substrate + dashboard).

When done, surface a Hebrew one-line status to Daniel.
```

---

*End of Activation Prompt. The Brief contains the full Cross-Module Safety Audit (§4), Locked Decisions (D1-D7), Success Criteria (1-12), Stop-Triggers, and Rollback Plan.*
