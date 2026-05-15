# Activation Prompt — M4 Deep Audit & Best Practices

> Paste the block below into a fresh Claude Code chat on Windows (`C:\Users\User\opticup`, branch `develop`). This runs IN PARALLEL with the `BROADCAST_EVENT_LINK_SUPPORT` Executor chat — both are safe to run together because this Brief is READ-ONLY.

---

```
You are running the Full Auto Pipeline on a READ-ONLY investigation Brief.

Brief location: modules/Module 4 - CRM/architecture-brief/M4_CRM_DEEP_AUDIT_AND_BEST_PRACTICES_BRIEF.md

Read the Brief in full. Then execute it autonomously per its instructions. Key parameters:

1. MODE: READ-ONLY. No file changes, no commits, no DB writes, no git operations beyond `git status` for baseline confirmation. Final deliverable is ONE markdown report at `modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md`. Daniel commits it manually after review.

2. SKILL SELECTION: per Brief §8, this is `opticup-sentinel` territory (read-only audit) with `opticup-reviewer` assist for best-practice cross-check. Web research via Claude Code's built-in WebSearch / WebFetch tools. NO `opticup-executor` involvement — this is not a code-change task.

3. PARALLEL EXECUTION SAFETY: another Claude Code chat is currently running `BROADCAST_EVENT_LINK_SUPPORT` SPEC. That chat is touching:
   - modules/crm/crm-messaging-broadcast.js
   - modules/crm/crm-messaging-broadcast-queue.js
   - SPEC folder modules/Module 4 - CRM/docs/specs/BROADCAST_EVENT_LINK_SUPPORT/
   - Docs: SESSION_CONTEXT.md, CHANGELOG.md, MODULE_MAP.md, MASTER_ROADMAP.md, OPEN_TASKS.md
   YOU MUST NOT touch any of those files. You may READ all of them as evidence. Coordinate by reading their state at startup, then operating independently in your own report file.

4. DELIVERABLE STRUCTURE: report must follow the structure in Brief §6 — Executive Summary, Methodology, Findings by section 4.1-4.8, Issue 3.1 Deep Dive, Issue 3.2 Cross-Check, Industry Benchmark Table, Top 10 Recommendations, Anti-recommendations, Open Questions.

5. INVESTIGATION SCOPE per Brief §4: data model, status model, code organization, EFs, views, business flows, reporting/analytics gaps, UX patterns. Each section produces structured findings (WHAT / EVIDENCE / SEVERITY / INDUSTRY COMPARISON / PROPOSED FIX).

6. TWO KNOWN ISSUES to investigate concretely (Brief §3):
   (a) "invited" attendees occupying event capacity but UI hides it — trace the code path, identify capacity enforcement mechanism, propose 3 evaluated options.
   (b) Broadcast wizard cannot link an event — verify the BROADCAST_EVENT_LINK_SUPPORT SPEC's solution against industry pattern; do NOT propose a competing fix.

7. INDUSTRY COMPARISON: research and cite (with URLs) how Salesforce Health Cloud, HubSpot, Pipedrive, Cliniko, Jane App, and Phorest handle CRM concepts relevant to optical stores + medical clinics. Adapt patterns to Optic Up's reality: Israeli market, Hebrew RTL, multi-tenant SaaS, 1-5 staff per tenant.

8. NO SPEC AUTHORING. Findings + recommendations + priority rankings — but do NOT author SPECs. Future SPECs are decided by Architect + Daniel after they read this report.

9. TIME BUDGET: 2-3 hours. If overrunning, ship sections 1-4 of the report as the must-haves; sections 5-9 are nice-to-haves. Better a complete-shorter report than an incomplete-longer one.

10. COMMUNICATION: Hebrew one-liner status updates between phases ("בודק את ה-DB", "קורא קוד", "חוקר Salesforce Health Cloud", "כותב דוח"). ONE Hebrew summary at end pointing Daniel to the report file path and the top 5 findings.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. Stop only on genuine deviation (e.g., the Brief's premise is wrong, OR the parallel Executor produces a conflict, OR a critical Iron Rule violation is uncovered that needs immediate Architect attention — in which case STOP and write an escalation file at modules/Module 4 - CRM/escalations/{TS}_AUDIT_BLOCKER.md).
```

---

*End of activation prompt.*
