# PRE-MAIN-MERGE VALIDATION — develop → main batch (2026-05-14)

**Type:** Pre-merge gate. Read-only smoke + integrity + advisor verification across the full develop-vs-main delta before Daniel approves the PR.

**Why this exists:** As of 2026-05-14, `develop` is 48 commits ahead of `main`. The batch contains:
- 4 Hybrid+Navy migrations (Suppliers Debt + Settings/Permissions + CRM + Storefront Studio) on develop since 2026-05-12
- Settings/Permissions Consolidation (tabbed settings.html)
- SECURITY_HOTFIX_2026_05_13 (9 LIVE + 11 STAFF Supabase Security Advisor findings closed)
- M4 overnight audit harvest (M4_INVITED_GHOST_ATTENDEE_FIX + M4_AUTOMATION_RULES_UPDATED_AT + M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1)
- STATUS_CHANGE_TRIGGERS_FRAMEWORK (EV-001)
- BROADCAST_EVENT_LINK_SUPPORT
- M4_V2_MODAL_SESSION_RESTORE_FIX
- Other M4 hotfixes + Cowork SKILL/DECISIONS updates

Daniel has run multiple sessions since 2026-05-12. He wants a final green-light verification before approving the merge: confirm nothing on develop is broken, regressed, or in a half-state.

**This is NOT a SPEC.** Zero code changes. Zero DB writes. Zero commits expected. Only verification reads + a Hebrew status report at the end.

---

## 1. Scope

**In scope:**
1. Confirm working tree clean on `develop` (no uncommitted half-work).
2. Run `verify:integrity` — must exit 0.
3. Run baseline smoke `tests/smoke/baseline.test.mjs` against demo tenant on localhost — must be 7/7 PASS.
4. Verify both servers actually start fresh (ERP :3000 + Storefront :4321) via `scripts/start-local.ps1`.
5. HTTP-200 sanity check on all 4 migrated pages + 1 consolidation:
   - `http://localhost:3000/suppliers-debt.html`
   - `http://localhost:3000/settings.html` (and `#permissions` hash)
   - `http://localhost:3000/crm.html`
   - `http://localhost:4321/storefront-blog.html`
   - `http://localhost:4321/storefront-content.html`
   - `http://localhost:4321/storefront-landing-content.html`
   - `http://localhost:4321/storefront-studio.html`
6. Confirm no orphan `<script>` or `<link>` tag count regression vs the locked baselines in the 4 migration SPECs.
7. Run Supabase advisor (`get_advisors --type security`) — confirm post-hotfix state holds (≤baseline; expected 0 LIVE-customer-harm, 0 STAFF-data-harm findings).
8. Compare `git diff main..develop --stat` — sanity-check the file count looks like ~48 commits' worth of work (no surprise files).
9. Confirm no merge conflicts predicted: `git merge-tree $(git merge-base main develop) main develop` should produce no conflict markers.
10. Verify `OPEN_TASKS.md` "Last updated" is recent (2026-05-13 or 2026-05-14) and reflects the closed SPECs.

**Out of scope:**
- Any code change. This is read-only.
- Any commit. The validation produces a Hebrew status report only.
- Any visual / UI screenshot check (v1 boundary; iframe-render is v2).
- Any DB writes to Prizma or demo.
- Running anything on production.

---

## 2. Expected Outcomes

Pass criteria — ALL must be GREEN to recommend merge:

| # | Check | Expected |
|---|-------|----------|
| 1 | Working tree clean (`git status --porcelain` empty after step 0) | clean |
| 2 | `npm run verify:integrity` exit code | 0 |
| 3 | `npm run smoke` on demo tenant | 7/7 PASS |
| 4 | ERP :3000 responsive (`Invoke-WebRequest http://localhost:3000/`) | HTTP 200 |
| 5 | Storefront :4321 responsive (`Invoke-WebRequest http://localhost:4321/`) | HTTP 200 |
| 6 | All 7 migration target pages | HTTP 200 |
| 7 | Supabase advisor (security) | 0 LIVE-customer-harm + 0 STAFF-data-harm findings |
| 8 | `git diff main..develop --stat` file list | matches the SPECs declared in this Brief (no rogue files) |
| 9 | `git merge-tree` conflict prediction | zero conflict markers |
| 10 | `OPEN_TASKS.md` Last updated | 2026-05-13 or 2026-05-14 |

If ANY fail → STOP. Do NOT recommend merge. Write a Hebrew escalation line to Daniel describing exactly which check failed and the observed value.

---

## 3. Output

A single Hebrew status block at the end, in this format:

```
🟢 / 🟡 / 🔴 Pre-Merge Validation — develop → main (2026-05-14)

סטטוס: [GREEN / WARNINGS / BLOCKED]

[bullet per check, ≤10 bullets, one line each, Hebrew]

[If GREEN:] מומלץ לאשר merge. PR title proposed: <one-line>
[If WARNINGS:] רוב הבדיקות עברו. נמצא: <one-line>. ההחלטה שלך אם למזג.
[If BLOCKED:] לא ממליץ למזג עד תיקון: <one-line>.
```

No technical detail in the body — file paths, commit hashes, exit codes belong in a separate `PRE_MERGE_VALIDATION_REPORT.md` next to this Brief. The chat output is the Hebrew block + (if GREEN) a proposed PR title.

---

## 4. Destructive Operations

**None.** This is a read-only validation Brief. No file writes (except the report file `PRE_MERGE_VALIDATION_REPORT.md` next to this Brief). No DB writes. No commits. No tags. No deploys.

If any step would require a destructive operation → STOP, write escalation, do NOT proceed.

---

## 5. Notes for the Pipeline

- **Localhost-Tester is the right skill** for steps 3–6. It already knows how to launch both servers via `scripts/start-local.ps1` and run `tests/smoke/baseline.test.mjs`.
- **Reviewer skill** handles step 8–9 (git diff sanity, merge-tree conflict prediction).
- **Executor skill** can do step 1–2 + step 7 (advisor query via Supabase MCP).
- **No Foreman / Strategist needed** — this is not a SPEC chain. Pipeline runs read-only checks and emits a single Hebrew status block.

End of Brief.
