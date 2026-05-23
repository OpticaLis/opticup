# M4_SHORT_LINKS_DASHBOARD_REDESIGN — Activation Prompt

Paste into the existing Claude Code session.

---

```
Run the Full-Auto Pipeline for M4_SHORT_LINKS_DASHBOARD_REDESIGN.

Brief: modules/Module 4 - CRM/architecture-brief/M4_SHORT_LINKS_DASHBOARD_REDESIGN_BRIEF.md

SPEC location:
modules/Module 4 - CRM/docs/specs/M4_SHORT_LINKS_DASHBOARD_REDESIGN/SPEC.md

MANDATORY PRE-FLIGHT READING:
1. The Brief above — read in FULL, especially §4 Cross-Module Safety Audit + §5 Locked Decisions D1-D7.
2. modules/crm/crm-short-links-stats.js (current, post-hotfix) — the file being redesigned.
3. modules/Module 4 - CRM/docs/specs/M4_SHORT_LINKS_400_FIX/ — yesterday's hotfix context.
4. crm_broadcasts schema — confirm name, channel, total_sent, created_at columns exist.
5. short_links + short_link_clicks schemas — confirm link_type enum values.

Load opticup-strategic (Foreman) first to author the SPEC. Then chain to opticup-executor, opticup-reviewer, opticup-localhost-tester, and back to opticup-strategic (Foreman closure).

MODEL: Sonnet (claude-sonnet-4-20250514) for Foreman + Executor + Tester. Mechanical UI work.

KEY CONSTRAINTS FROM BRIEF:
- Per Iron Rule 32: Destructive Operations = 0. Pure additive frontend redesign.
- Cross-Module Safety Audit §4 BINDING. Touch ONLY crm-short-links-stats.js + possibly sub-files for component separation. NO DB writes, NO EF deploys, NO schema changes.
- Per Iron Rule 22 defense-in-depth: every .select() chains .eq('tenant_id', tid) even though RLS enforces.
- Per Iron Rule 12: file size cap 350 lines. If exceeded → split into sub-files under modules/crm/crm-short-links-tiles/.
- D1: 3 components on one screen, NOT 3 tabs.
- D2: "Only clicked links" filter ON by default.
- D3: Template-static links in dedicated card, NOT mixed into broadcast table.
- D4: Drill-down stays SQL-driven; 5-min browser memory cache.
- D7: NO new DB objects in v1. If query > 500ms → STOP, escalate.

PRE-FLIGHT DB PROBES:
- Verify short_links.link_type enum values (expected: 'per_recipient', 'template_static'). If more → STOP.
- Verify crm_broadcasts.total_sent populated. If NULL on recent broadcasts → STOP and escalate.
- Verify short_link_clicks.broadcast_id populated for recent clicks.
- Sample query performance: SELECT broadcast aggregation for last 30 days, measure p95 latency. If > 500ms → STOP per D7.

STOP TRIGGERS (over Brief §8):
- Schema differs from expected (more enum values, missing columns).
- Performance regression (queries > 500ms p95).
- Iron Rule 31 fails.
- Smoke regresses.
- §4.3 violation.

VERIFICATION GATES:
- Smoke 8/8 PASS.
- Iron Rule 34 (Chrome MCP triplet) MANDATORY for this SPEC — heavy UI redesign.
- Chrome MCP demo verification:
  - Open /crm.html?t=demo → click "קישורים קצרים" → confirm 3 components render.
  - Verify "Only clicked links" filter ON shows only rows with clicks ≥ 1.
  - Toggle filter OFF → confirms all rows appear.
  - Click broadcast row → drill-down expands to show that broadcast's links.
  - Template-static card shows shared links separately.
  - Screenshot all 3 components rendered correctly.

POST-SPEC DELIVERABLES:
- 1-3 modified JS files.
- Possibly 1 modified CSS file.
- 3-4 Chrome MCP screenshots in FOREMAN_REVIEW.
- FOREMAN_REVIEW.md.
- Memory update if relevant patterns harvested.

When done, surface a short English status line per user memory feedback_daniel_comms.

After Pipeline closes, provide GitHub compare URL + PR title for Daniel to merge develop → main in UI.
- PR title suggestion: feat(crm): short-links tab redesign — broadcast aggregation + smart filter + drill-down.
```

---

*End of Activation Prompt. Brief contains §4 binding safety audit, §5 D1-D7 locked decisions, §7 success criteria 1-13.*
