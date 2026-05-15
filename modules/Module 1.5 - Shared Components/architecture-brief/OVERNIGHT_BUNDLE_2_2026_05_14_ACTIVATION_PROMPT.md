You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). This is the SECOND OVERNIGHT autonomous run on 2026-05-14. Read your bootstrap files per CLAUDE.md §1 First Action, then execute the Bundle Brief at `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_BUNDLE_2_2026_05_14_BRIEF.md`.

**Context:** Bundle 1 completed earlier tonight (7 closed, 2 skipped, 1 deferred). The first overnight is over; Daniel is still awake and explicitly asked: "is there anything that can run autonomously, maybe even a learning run that helps us finish faster and better?" This second bundle combines urgent production fix + tech debt closure + 4 LEARNING runs that improve the entire Pipeline machinery. Target: 18-25 commits across 9 items + 4 learning reports in 11-15 hours.

**Operating mode (per `feedback_overnight_run_pattern.md` Daniel directive 2026-05-09):**
- **Skip-not-stop.** Single-item failure → log + skip + continue. NOT halt-and-ask.
- **Sub-agents authorized + encouraged** for T3 (one per skill), T5 (one per audit dimension), T6 (one per audit dimension).
- **No Daniel interaction needed.** All decisions either pre-baked or item-level autonomous.
- **One aggregate Hebrew summary at end** — NO mid-run status reports.

Tier execution order (per Brief §2):
- T1 (urgent fix) FIRST: T1.1 placeholder fix
- T2 (tech debt) SECOND: T2.1 check-tool fix → T2.2/T2.3 CSS cleanup combined
- T3 (LEARNING) THIRD: SKILL hardening audit, parallel sub-agent per skill
- T4 (LEARNING) FOURTH: SPEC_TEMPLATE v3 evolution (sequential — depends on T3 results)
- T5 + T6 (LEARNING) PARALLEL: architecture debt sweep + Sentinel deep dive, on separate sub-agent threads

For each item that is a SPEC (T1+T2):
1. Load `opticup-strategic` as Foreman → author SPEC at appropriate `docs/specs/{SLUG}/SPEC.md`. Declare `## Destructive Operations` per Brief §6.
2. Load `opticup-executor` → execute. MCP-first with auto-CLI-fallback for EF deploys per encoded SKILL rule.
3. Load `opticup-reviewer` → verify success criteria.
4. Load `opticup-localhost-tester` for runtime SPECs (T1 only).
5. Back to `opticup-strategic` → FOREMAN_REVIEW.md with skill improvements.

For LEARNING items (T3+T4+T5+T6):
- T3: spawn 4 sub-agents (one per skill: architect/strategic/executor/reviewer). Each sub-agent reads its skill's full SKILL.md + cross-references FOREMAN_REVIEWs + DECISIONS_LOG + escalations + FINDINGS to find unencoded patterns. Aggregator merges proposals, applies the high-confidence ones, leaves low-confidence as proposals in the report.
- T4: Foreman synthesizes SPEC_TEMPLATE v3 from T3's findings + 30 most recent FOREMAN_REVIEWs. Single sub-agent or sequential.
- T5: spawn 7 sub-agents (one per audit dimension in Brief §1 T5.1). Each sub-agent runs read-only SQL or grep, reports findings. Aggregator merges.
- T6: spawn 7 sub-agents (one per audit dimension in Brief §1 T6.1). Same pattern as T5.

HARD STOP triggers (regardless of skip-not-stop):
- Iron Rule violation surfaced (destructive op not declared, RLS missing, tenant_id missing).
- Prizma data write outside T1.1's pre-authorized scope (i.e. anything NOT in the 758 placeholder rows).
- T1.1 surfaces a Daniel-decision question (e.g. "should we re-send to 758 customers?") → STOP T1.1, write escalation, continue with T2+.
- Smoke <7/7 PASS at session start → STOP T1+T2, skip to T3+T4+T5+T6 (LEARNING items don't need smoke).
- `main` branch touched → STOP entire run.

MANDATORY behaviors:
- Backup before T1.1 UPDATE: dump affected `crm_message_log` rows to SPEC folder as JSON.
- Backup before T2.x deletes: pre-edit copies in backup folder.
- Backup before T3 SKILL edits: pre-edit copies of 4 SKILL.md files.
- Backup before T4 SPEC_TEMPLATE replace: pre-edit copy under `_archive/spec-template-versions/v2_2026_05_14/`.
- Selective `git add` by explicit filename. NEVER `git add -A` or `git add .`.
- Push each item's commits to `origin/develop` immediately after closing.

Whitelist phones/emails for test:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

Do NOT:
- Author any item NOT in the Brief's tier lists.
- Commit to main on either repo.
- Run `git checkout main`, `git merge`, `git rebase`, `git push --force`.
- Deactivate any production service.
- Touch P2.1 CAPI (Daniel-decision required, separate session).
- Touch M1 Expansion build (mockups needed).
- Touch M13/M9 sketches.
- Touch Phase 3 status-column split.
- Re-send any actual message to a customer without Daniel-authorized scope (T1.1 repairs the data, does NOT re-send).

When ALL items closed (or skipped with reason), return ONE Hebrew aggregate status block:
- Per-tier rollup
- Per-item line: status emoji + slug + 1-line outcome + commit SHA(s)
- Aggregate counts: SPECs closed, commits pushed, sub-agents spawned, audit findings by severity, skill improvements applied (P-numbers + ROI), SPEC_TEMPLATE v3 status
- 3-most-important findings from T5+T6 surfaced at TOP of report for Daniel's morning review
- T1.1 result: root cause + repair count + accepted-loss count
- Repo state at close

Master report file: `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md`.

Plus 4 LEARNING reports:
- `SKILL_HARDENING_AUDIT_2026_05_14_REPORT.md`
- `SPEC_TEMPLATE_EVOLUTION_V3_REPORT.md`
- `ARCHITECTURE_DEBT_SWEEP_2026_05_14_REPORT.md`
- `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md`

End of activation prompt.
