# SPEC — SAAS_ALERTS_CLEANUP

> **Authored by:** opticup-strategic (overnight hybrid Foreman)
> **Authored on:** 2026-04-26 (overnight)
> **Module:** 1.5 (parent of cross-cutting SaaS-readiness work)
> **Closes Sentinel alerts:** M3-SAAS-14, M3-SAAS-18 / M5-DEBT-08, M3-SAAS-07, M3-SAAS-20 (already-stale), M3-SAAS-21 (substantively).

**TL;DR:** Doc-only SPEC. Writes `outputs/SAAS_ALERTS_RESOLVED_2026-04-26.md` documenting which Sentinel SaaS-readiness alerts were resolved tonight by SPECs #1, #2, #3, plus M3-SAAS-20 which the user-provided context noted was already stale (the Sentinel scan against current HEAD confirms 0 hits of `prizma-optic.co.il/r/...` literal in active CRM source — only the preview substitution at `crm-messaging-templates.js:339-340` remains, which is intentional demo-display text). **Will NOT directly edit `docs/guardian/GUARDIAN_ALERTS.md`** — Sentinel auto-manages that file and my edit would race with the next scheduled scan. Resolution will surface naturally on Sentinel's next pass when it re-greps the SaaS-readiness conditions and finds them no longer match.

---

## 1. Goal

Document overnight SaaS-readiness progress for tomorrow's strategic session and for the next Sentinel scan.

---

## 2. Background

5 alerts targeted tonight per the overnight task brief. By session end:
- **M3-SAAS-14** (formatILS hardcoded ₪ + he-IL) → addressed by SPEC #1 (`M1_5_SAAS_FORMAT_MONEY`, commits `8cb0f65` + `1612200`).
- **M3-SAAS-18 / M5-DEBT-08** (formatCurrency duplicates formatILS) → addressed by SPEC #1 (same commits).
- **M3-SAAS-07** (SEO domain hardcoded prizma-optic.co.il) → addressed by SPEC #2 (`M3_SAAS_CUSTOM_DOMAIN`, commits `813021c` + `fd7f182`).
- **M3-SAAS-20** (CRM template default URLs) → already stale per user context; the only remaining literal is intentional demo-preview substitution in `crm-messaging-templates.js:339-340`, not production behavior.
- **M3-SAAS-21** (VAT 17% fallback) → addressed by SPEC #3 (`M1_DEBT_VAT_FALLBACK_GUARD`, commits `a4e7524` + `e228747` + `b2c1d92`). 7/8 callsites cleaned; 1 deferred (F1 in SPEC #3 — cap-aware future SPEC).

---

## 3. Success Criteria

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | clean | `git status` |
| 2 | Commits | 2 (SPEC + retrospective) | `git log` |
| 3 | New deliverable file present | `outputs/SAAS_ALERTS_RESOLVED_2026-04-26.md` | `test -f` |
| 4 | Integrity gate | exit 0 | `npm run verify:integrity` |
| 5 | `docs/guardian/GUARDIAN_ALERTS.md` UNTOUCHED by this SPEC | git diff vs origin/develop shows no changes from this SPEC's commits to the alerts file | git diff |
| 6 | Push to origin | exit 0 | `git status -uno` |

---

## 4. Autonomy Envelope

### 4.1 CAN
- Create `outputs/SAAS_ALERTS_RESOLVED_2026-04-26.md`.
- Write retrospective.
- Commit + push.

### 4.2 STOP
- Any edit to `docs/guardian/GUARDIAN_ALERTS.md` directly.
- Any code or schema change.
- More than 2 commits.

---

## 5. Stop Triggers

1. Any code or DB write attempted.
2. Any change to a Sentinel-managed file.

---

## 6. Rollback

`git reset --hard b2c1d92` (last commit before this SPEC).

---

## 7. Out of Scope

- Direct edits to `docs/guardian/GUARDIAN_ALERTS.md`.
- New code or schema changes.
- Closing alerts that aren't in the §2 list.

---

## 8. Expected Final State

### 8.1 New file: `outputs/SAAS_ALERTS_RESOLVED_2026-04-26.md`

Contains:
- Summary of overnight SaaS-readiness work.
- Per-alert resolution status with commit hashes.
- Forward-flag for the 1 deferred callsite (F1 from SPEC #3).
- Suggested next-Sentinel-scan verification steps.

### 8.2 Files NOT modified

- `docs/guardian/GUARDIAN_ALERTS.md` — Sentinel-managed.
- Any code file.

---

## 9. Commit Plan

Exactly 2 commits.

### Commit 1 — `docs(spec): approve SAAS_ALERTS_CLEANUP SPEC for execution (overnight)`
- Just this SPEC.md.

### Commit 2 — `chore(spec): close SAAS_ALERTS_CLEANUP + write SAAS_ALERTS_RESOLVED_2026-04-26.md (overnight)`
- outputs file + EXECUTION_REPORT + QA + REVIEW.

---

## 10. Test Subjects

N/A — doc-only.

---

## 11. Lessons Already Incorporated

Cross-Reference Check 2026-04-26: `outputs/SAAS_ALERTS_RESOLVED_2026-04-26.md` — does not exist (verified). No collision.

Step 1.5e: outputs file is new; no pre-existing line count.

Step 1.5f-h: N/A (no code or schema).

---

## 12. Foreman QA Protocol

Trivial. Verify the outputs file exists, is readable, references correct commit hashes.

---

## 13. Pre-Merge Checklist

- [ ] outputs file exists and lists 5 alerts with their resolution status.
- [ ] No edits to `docs/guardian/GUARDIAN_ALERTS.md`.
- [ ] HEAD pushed.

---

## 14. Dependencies

- HEAD = `b2c1d92` (after SPEC #3).
- All 3 prior SPECs closed tonight.

---

*End of SPEC.*
