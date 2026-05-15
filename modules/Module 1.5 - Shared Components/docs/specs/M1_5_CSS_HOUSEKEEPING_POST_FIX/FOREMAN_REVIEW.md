# FOREMAN_REVIEW — M1_5_CSS_HOUSEKEEPING_POST_FIX

**Verdict:** 🟢 CLOSED — 3 orphan deletes shipped, T2.1 auth-parser proven in production, 1 LOW watch-item.
**Foreman:** opticup-strategic (overnight Bundle 2 T2.2+T2.3)
**Review date:** 2026-05-14

---

## 1. Execution quality

Surgical execution. Pre-flight orphan verification (grep for `crm-pagination` / `crm-pulse` across `crm.html` and all `modules/crm/*.js` — 0 hits) gave high confidence before any destructive action. Backups preserved 5 pre-edit files. The single commit cleanly demonstrates the T2.1 fix's value: 3 declared deletes + 2 HTML edits + 1 SPEC.md, gate exit 0.

The Executor noticed F-3 (employees.css carried base-element styles that may be load-bearing for settings.html) and called it out as a LOW watch-item rather than silently shipping. Right disposition: the modern shared/css stack should cover those needs, and if it doesn't, the surfacing-by-breakage will be obvious + recoverable from the backup folder. Holding the SPEC for a Daniel UAT round would have over-engineered a low-risk delete.

## 2. Findings reviewed

4 findings: F-1 INFO (positive: T2.1 validated), F-2 INFO (lesson: don't trust "keep this" comments), F-3 LOW (watch-item: settings.html visual fallout), F-4 INFO (backup integrity).

## 3. Iron-rule compliance

✅ Rule 12 / 21 / 22 / 23 / 31 / 32 all clean.

## 4. Skill improvements (2 minimum)

### P-T2.2-1 (MEDIUM) — opticup-strategic: codify the "orphan verification before delete" pattern in SPEC_TEMPLATE

**Source evidence:** This SPEC's §5 plan included "verify the orphan classification" as an explicit pre-flight step before any destructive action. Bundle 1's `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` (the predecessor SPEC for T2.2) did not have this step — it just went to delete and got blocked by the gate. The verification step is the difference between "destructive op authorized AND safe" vs "destructive op authorized AND blindly executed".

**Proposal:** SPEC_TEMPLATE v3 (T4.1) should require any SPEC declaring file deletions in §"Destructive Operations" to also include a §"Orphan verification" pre-flight subsection: enumerate which file is being deleted, the grep query that proves it has zero live consumers, the result count. Forces the SPEC author to do diligence at authoring time, not at executor time.

**ROI:** ~10 min saved per delete SPEC (author thinks about safety first; executor doesn't need to retroactively justify the delete).

### P-T2.2-2 (LOW) — opticup-executor: prefer backup-folder paths under module-scoped `backups/` not under `_archive/`

**Source evidence:** This SPEC backed up to `modules/Module 1.5 - Shared Components/backups/2026-05-14_CSS_HOUSEKEEPING_POST_FIX/` (module-scoped, per CLAUDE.md §9 rule 9). The alternative — `_archive/...` — would have polluted the single archive vault for ephemeral pre-delete backups. The pattern is right; documenting it explicitly in the executor SKILL would help future SPECs.

**Proposal:** Add to `opticup-executor` SKILL.md: "Pre-destructive-op backups live under `modules/Module N/backups/<YYYY-MM-DD>_<SPEC_SLUG>/`, NOT under `_archive/`. `_archive/` is for permanently-retired artifacts, not for transient rollback safety nets."

**ROI:** Low (the pattern is already in CLAUDE.md §9 #9); just makes the discipline explicit in the executor skill.

End of FOREMAN_REVIEW.
