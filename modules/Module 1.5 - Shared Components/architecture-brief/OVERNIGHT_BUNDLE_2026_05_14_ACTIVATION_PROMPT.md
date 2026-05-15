You are Claude Code working in the Optic Up ERP repo at `C:\Users\User\opticup` (Windows desktop). This is an OVERNIGHT autonomous run. Read your bootstrap files per CLAUDE.md §1 First Action, then execute the Bundle Brief at `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_BUNDLE_2026_05_14_BRIEF.md`.

**Context:** Today (2026-05-14) closed 8 SPECs incl. all of Phase 1 funnel infrastructure. main is fully up to date. Daniel will sleep. This run advances the project further while he sleeps. Target: 15-21 commits across 16 items in 4 tiers, 8-13 hours.

**Operating mode (per `feedback_overnight_run_pattern.md` Daniel directive 2026-05-09):**
- **Skip-not-stop.** Single-item failure → log + skip + continue. NOT halt-and-ask.
- **Sub-agents authorized** for Tier C parallel audits + Tier D parallel ceremony processing (batches of 3).
- **No Daniel interaction needed.** All decisions either pre-baked in the Brief or item-level autonomy per Full-Auto Pipeline.
- **One aggregate Hebrew summary at end** — NO mid-run status reports.

Tier execution order (per Brief §2):
- Tier A (Phase 2 measurement quality): A.1 → A.2 SEQUENTIAL
- Tier B (tech debt sweep): B.1 → B.2 → B.3 SEQUENTIAL
- Tier C (audits): C.1, C.2, C.3 PARALLEL via sub-agents
- Tier D (Module Close Ceremonies): D.1-D.8 batched (3 parallel sub-agents at a time)

Recommended scheduling: A first (highest value, freshest Phase 1 context). C in parallel on a sub-agent while A runs. B after A. D last (lowest risk, can fill remaining time).

For each item that is a SPEC:
1. Load `opticup-strategic` as Foreman → author SPEC at appropriate `docs/specs/{SLUG}/SPEC.md` path. Declare `## Destructive Operations` per Brief §7.
2. Load `opticup-executor` → execute. Apply migrations + deploy EFs per the newly-encoded SKILL rule (MCP-first, auto-CLI-fallback on 5xx, no Daniel interaction).
3. Load `opticup-reviewer` → verify success criteria.
4. Load `opticup-localhost-tester` for runtime SPECs (Tier A only).
5. Back to `opticup-strategic` → FOREMAN_REVIEW.md with skill improvements.

For non-SPEC items (Tier C audits + Tier D ceremonies):
- C.1 Sentinel: invoke `opticup-sentinel` skill directly. Output to `docs/guardian/`.
- C.2 D1: query Supabase, write single report file. No skill ceremony.
- C.3 D2: docs-only Foreman work, no executor needed.
- D.1-D.8: docs-only Foreman work per module.

HARD STOP triggers (regardless of skip-not-stop on item failures):
- Iron Rule violation surfaced (destructive op not declared, RLS missing, tenant_id missing on new table) → STOP entire run, write escalation, halt.
- Prizma data write that wasn't pre-authorized → STOP entire run.
- Smoke <7/7 PASS at session start or before any Tier-A item → STOP, do NOT proceed with that item, log + skip.
- `main` branch touched → STOP entire run.

MANDATORY behaviors:
- Backup before any item that modifies >5 files (CLAUDE.md §9 #9).
- Demo tenant only for all test writes (slug=`demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`, PIN 12345).
- Selective `git add` by explicit filename throughout. NEVER `git add -A` or `git add .`.
- Push each item's commits to `origin/develop` immediately after closing. Do NOT batch all commits to push at end.
- Per CLAUDE.md §9: clean working tree for each item's scope at item close.

Whitelist phones/emails for test:
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

Do NOT:
- Author any item NOT in the Brief's Tier A/B/C/D lists.
- Commit to main on either repo.
- Run `git checkout main`, `git merge`, `git rebase`, `git push --force`.
- Deactivate any production service (short.gy account, EFs, cron jobs).
- Touch P2.1 CAPI (Daniel-decision required).
- Touch M1 Expansion build (mockups needed first).
- Touch M13/M9 sketches (Daniel-design-involvement required).
- Touch Phase 3 status-column split (HIGH RISK, requires daytime supervision).

When ALL items closed (or skipped with reason), return ONE Hebrew aggregate status block:
- Per-item line: status emoji + slug + 1-line outcome + commit SHA(s)
- Skipped items: reason
- Aggregate counts: SPECs closed, commits pushed, files added/modified/deleted, sub-agents spawned
- Findings count by severity (CRITICAL / HIGH / MEDIUM / LOW / INFO)
- Skill improvements harvested
- Repo state at close (clean vs which files dirty)
- ETA to next critical-path item (P2.1 CAPI)

Master report file: `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_BUNDLE_2026_05_14_REPORT.md`.

End of activation prompt.
