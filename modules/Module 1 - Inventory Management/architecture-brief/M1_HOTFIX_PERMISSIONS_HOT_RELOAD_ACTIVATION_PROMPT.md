# Activation Prompt — M1_HOTFIX_PERMISSIONS_HOT_RELOAD (Phase 2 #1)

> Paste the block below into a fresh Claude Code chat.
> Brief: `modules/Module 1 - Inventory Management/architecture-brief/M1_HOTFIX_PERMISSIONS_HOT_RELOAD_BRIEF.md`

---

```
Full Auto Pipeline — M1_HOTFIX_PERMISSIONS_HOT_RELOAD (Phase 2 #1).

Brief: modules/Module 1 - Inventory Management/architecture-brief/M1_HOTFIX_PERMISSIONS_HOT_RELOAD_BRIEF.md

Activate `opticup-strategic`. Skill state inherits all harvested patterns (Inner-call arity +
Smoke-touched schema audits + Concurrent-Pipeline envelope + MIGRATION.md Applied Log +
advisors-for-objects.mjs).

PROBLEM: hasPermission() in js/auth-service.js:286 reads only sessionStorage cache populated
once at login. Every new permission key forces logout/login cycle. This has hit 3 SPECs in a row.

Read Brief end-to-end. Run §6 probes (5 SQL + shell). Decide Path A (refresh on page-load) or
Path B (Supabase Realtime). Architect recommendation: A.

Author SPEC at:
  modules/Module 1 - Inventory Management/docs/specs/M1_HOTFIX_PERMISSIONS_HOT_RELOAD/SPEC.md

Required SPEC sections: §0 (probes + 2 mandatory audits + Concurrent-Pipeline envelope), §1,
§2 (Path A or B + refreshPermissions helper + page-load hook + new RPC if needed), §3 (15
criteria from Brief §5), §4 autonomy envelope, §5 stop triggers, §6 rollback, §7 Destructive
Operations: None, §10 commit plan (3-6 commits), §11 lessons.

Hand off to `opticup-executor`:
- Implement refreshPermissions() in auth-service.js with single page-load hook.
- New RPC if needed: M1A discipline (SECURITY DEFINER + search_path + JWT guard + REVOKE/GRANT).
- **MANDATORY UI smoke via Chrome MCP** (Brief §2): login → revoke perm via MCP → reload screen
  → confirm "אין הרשאה" appears → re-grant via MCP → reload → confirm UI renders + performance
  ≤ +150ms. 10/10 PASS required for 🟢.

Then `opticup-reviewer` re-runs criteria + advisors-for-objects.mjs. Writes REVIEW.md.
Then `opticup-strategic` Foreman-reviews. Writes FOREMAN_REVIEW.md.

Pipeline returns ONE Hebrew status line:
  "M1_HOTFIX_PERMISSIONS_HOT_RELOAD [🟢/🟡/🔴]. דו"חות: SPEC/EXECUTION/TEST/REVIEW/FOREMAN."

Iron Rules in sharp focus: 7, 14, 15, 18, 21, 22, 23, 31, 32.

Out of scope:
- New permission keys beyond those needed for the refresh mechanism
- Re-architecting permissions tables
- New UI screens
- Real-time WebSocket plumbing (unless Path B with strong evidence)
- M2 Platform Admin changes
- JWT refresh logic
- Prizma data writes (smoke on demo only)
- Merge to main (Daniel-only)

On escalation: write modules/Module 1 - Inventory Management/escalations/{ISO_TS}_{topic}.md.

Stop on deviation, not on success. 3 SPECs in a row had the logout/login papercut — this is
the fix that ends it. No 🟢 without UI smoke 10/10 + ≤150ms perf delta.
```

---

*End of activation prompt.*
