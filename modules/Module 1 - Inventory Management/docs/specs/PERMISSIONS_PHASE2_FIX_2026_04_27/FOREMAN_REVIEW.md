# FOREMAN_REVIEW — PERMISSIONS_PHASE2_FIX_2026_04_27

> **Written by:** opticup-strategic (Foreman, Cowork session)
> **Written on:** 2026-04-27 (same night, post-execution)
> **SPEC:** `SPEC.md` (this folder)
> **Reviewing:** `EXECUTION_REPORT.md` + `FINDINGS.md` + `BEFORE_STATE.json` + `AFTER_STATE.json`
> **Verdict:** 🟢 **CLOSED**

---

## 1. Verdict at a glance

🟢 **CLOSED**. The most ambitious SPEC of the 4-spec batch (mutates production data, deletes 3 tenants, renames live keys, refactors a global state pattern across 6 files) landed cleanly with all 21 success criteria PASS. Verified live-DB:

- 2 tenants survive (prizma + demo) — 3 test stores cleanly deleted
- 110 permissions total (down from 281), 0 long-form keys remain
- 30 canonical short-form keys (10 purchasing + 6 receipts + 14 debt)
- 0 orphan role_permissions
- 5 roles per tenant (canonical Group A: ceo/manager/team_lead/worker/viewer)
- Manager + team_lead on Prizma both have `inventory.edit` granted (the bug-fix prerequisite)
- 371 role_permissions (down from 833) — pure cascade math confirms

The 7 deviations the executor logged are all SPEC-precision issues — author errors I made, every one handled correctly by the executor via §8's permissive language ("verify and choose path") or by escalating to Findings without bothering Daniel.

---

## 2. SPEC quality audit

The pattern from the previous 3 SPECs continues — the executor's substantive work is excellent, my SPEC's verify-precision has measurable gaps. This time the gaps were of three classes:

| Finding | Class | Severity |
|---|---|---|
| 1 — §4 envelope missed 6 tables in cascade dependency | Pre-flight gap (FK constraint scan not done at author time) | MEDIUM |
| 2 — `debt.ai_config` would have been deleted by commit 2 then needed in commit 5 | Inter-commit dependency gap | MEDIUM |
| 3 — `.admin-mode` body class CSS coupling not surveyed | Cross-asset coupling check not done at author time | HIGH (would have silently regressed UX) |
| 4 — Pre-existing `save` closure rule-21 false positives | Pre-existing tech-debt surfaced by file touch | LOW |
| 5 — Live login QA disrupted Daniel's session | Operational — wrong Chrome MCP pattern | LOW |
| 6 — Module 1 folder duplication | Recurrence (4th time) | LOW |
| 7 — Hardcoded `'worker'` default in employee-modal | UI cleanup | LOW |

**The most serious is Finding 3 — CSS coupling.** I authored §8 to delete the `body.classList.add('admin-mode')` line as if it were a leftover symbol with no consumers. It had ~25 CSS rules across 5 stylesheets depending on it. The executor caught the regression at code-review time, moved the toggle into `applyUIPermissions` instead of removing it, and preserved the cost-column UX. **Without that intervention, removing the line as I instructed would have silently broken the cost column for every user with `settings.edit` granted.** That's a UX regression I would have shipped. The executor saved me.

**The pattern across Findings 1-3** is the same root cause: I'm authoring SPECs without enough cross-asset surveying. FK rules, key dependencies between commits, CSS rules that depend on JS-set classes — these are all "what else uses this thing I'm about to change?" questions. The next SPEC needs a stronger pre-flight that asks that question explicitly.

---

## 3. Execution quality audit

🟢 **Excellent**, again — the 4th consecutive SPEC where the executor exceeds the SPEC's quality.

| Dimension | Foreman score | Notes |
|---|---|---|
| SPEC adherence | 10/10 | All 21 substantive criteria pass. The 7 deviations are all SPEC-precision issues (mine), each handled correctly. |
| Iron Rules | 10/10 | Rule 7 (helpers), Rule 22 (defense-in-depth tenant_id), Rule 12 (file-size — split employee-list.js cleanly when it crossed cap). |
| Pre-flight discipline | 10/10 | BEFORE_STATE.json has full INSERT-ready row dumps for rollback. AFTER_STATE.json has the post-execution metric table. Both files complete. |
| Commit hygiene | 10/10 | 8 commits per §9 plan, conventional-commits format, single concern per commit. The DB-only audit-trail commits (2, 3) have full SQL in commit body. |
| Documentation | 10/10 | SESSION_CONTEXT + CHANGELOG + EXECUTION_REPORT + FINDINGS + state JSONs all complete. |
| Autonomy | 9/10 | Zero questions despite 7 deviations. Lost a point only because the §15 Chrome QA disrupted Daniel's session — could have been avoided with a `new_page` isolated-context pattern. The executor flagged this as their own Proposal 2. |
| Finding discipline | 10/10 | All deviations + 1 pre-existing tech-debt + 1 recurrence logged with reproduction commands and dispositions. |

**Three behaviors that earn explicit recognition:**

1. **CSS coupling rescue.** Finding 3 — instead of mechanically deleting the line as I instructed, the executor grepped `css/` for `admin-mode`, found 25 rules across 5 files, then *moved* the toggle to a new home (`applyUIPermissions`) rather than removing it. The fix is better than my SPEC.
2. **Smart key-rename substitution.** Finding 2 — when `debt.ai_config` (the SPEC's literal text) didn't survive commit 2's cascade, the executor figured out that `ai.config` (Group A surviving key) was the semantically correct replacement and made the substitution. Documented in Findings + commit message. Daniel's actual UX is preserved.
3. **File-split discipline.** Commit 6 would have pushed `employee-list.js` over the 350-line hard cap. Instead of compromising on Iron Rule 12, the executor extracted the matrix UI into a new `permission-matrix.js` (130 lines) — a clean separation-of-concerns split. SPEC §13 + #14 satisfied across both files.

These three are above and beyond bounded-autonomy minimums. They're judgment calls that show the executor reading the *intent* of the SPEC, not just its letter.

---

## 4. Findings disposition

| # | Code | Severity | Disposition |
|---|---|---|---|
| 1 | M3-SPEC-01 (FK envelope gap) | MEDIUM | **TECH_DEBT** + Strategic Improvement Proposal #1 below: pre-flight FK constraint scan in opticup-strategic SKILL. |
| 2 | M3-SPEC-02 (key-rename inter-commit dependency) | MEDIUM | **TECH_DEBT** + Strategic Improvement Proposal #2 below: when SPEC has both renames AND replacements in different commits, run a "key-survives-this-commit" check. |
| 3 | M3-SPEC-03 (CSS coupling missed) | HIGH | **TECH_DEBT** — author-side cross-asset survey check; Proposal #1 below covers it. The CSS refactor itself is queued as Proposal 11 from PERMISSIONS_AUDIT_PHASE1 (deferred). |
| 4 | M1-DEBT-01 (`save` closures) | LOW | **DISMISS** — verifier-tooling tech-debt; mechanical rename worked. Improve the verifier separately. |
| 5 | M0-PROCESS-01 (Chrome session disruption) | LOW | **DISMISS** + Executor Proposal C from EXECUTION_REPORT §10 — cross-tenant QA via Chrome `new_page` isolatedContext. I endorse the executor's proposal. |
| 6 | M3-RECUR-01 (Module 1 folder duplication) | LOW | **DISMISS** — recurrence; already TECH_DEBT in 3 prior reviews. Will surface organically next time the folder structure is normalized. |
| 7 | M3-DEBT-02 (hardcoded `'worker'` default) | LOW | **TECH_DEBT** — minor UI cleanup; tracked but not urgent. |

**No new SPEC required.** All disposition is improvements to skills + organic tech-debt. Three new TECH_DEBT items.

---

## 5. SPEC quality summary

| Dimension | Score | Notes |
|---|---|---|
| Goal clarity | 10/10 | 9 deliverables enumerated. |
| Background completeness | 10/10 | Phase 1 audit findings cited; Daniel's 6 decisions captured verbatim; baseline counts probed live. |
| Success criteria measurability | 8/10 | 21 criteria, 21 pass — but 4 of them (#5, #8, #9, #10) had thresholds that were math-estimated rather than baseline-anchored. The executor's pre-flight caught the variance. |
| Stop triggers | 7/10 | The "<25 rows" threshold for renames was off by ~3 (actual 28). Within Foreman-Approved Proposal D tolerance, but a sharper pre-flight would have caught it. |
| Out-of-scope explicitness | 10/10 | Crystal clear list. The executor honored it perfectly. |
| Rollback plan | 10/10 | BEFORE_STATE.json with INSERT statements is gold-standard for DB-mutation SPECs. |
| Commit plan | 10/10 | 8 commits matched exactly. |
| Lessons-incorporated section | 8/10 | Cited 4 prior FOREMAN_REVIEWs + applied identifier verification + cross-section check. But Findings 1–3 prove the live-state baseline pre-flight still has gaps — I checked some things and not others.

**Overall SPEC quality: 8.7/10.** Better than last SPEC (8.0). The improvement comes from rigorous identifier verification + better cross-section consistency. The remaining gap is cross-asset coupling (CSS-from-JS, FK-rules, inter-commit key-survival) — the next SPEC needs to widen the pre-flight to catch these.

---

## 6. Two opticup-strategic improvement proposals

### Proposal A — Add a "Cross-Asset Coupling Survey" step to opticup-strategic SKILL

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` → "SPEC Authoring Protocol" → after "Step 1.6 Live-State Baseline Probe", add **Step 1.7 — Cross-Asset Coupling Survey**
- **Add the new step:** Before saving a SPEC that removes/renames any code symbol, body class, table column, FK relationship, or DB row, run a coupling scan:
  - **JS removed:** `grep -rn "removed_symbol" --include="*.js" --include="*.html" --include="*.css"` to find all consumers.
  - **CSS class removed:** `grep -rn "removed_class" --include="*.css"` AND `grep -rn "removed_class" --include="*.js"` (because JS often *adds* classes).
  - **DB column removed/renamed:** scan the codebase for the literal string of the column name + any `SELECT ... column_name` patterns.
  - **DB row deleted (e.g. tenant cascade):** query `information_schema.referential_constraints` for the parent table to find all FK-dependent tables. Document the full table list in the SPEC's §4 envelope.
  - **Permission key renamed:** scan all `data-permission` attributes + all `hasPermission()`/`requirePermission()` literal-string calls across HTML/JS.
- **Rationale:** Findings 1, 3, and arguably 2 in this SPEC all share the same root cause — I removed/renamed a thing without surveying the things that depend on it. A 60-second per-symbol coupling scan at SPEC-author time prevents the executor from having to rescue me at execution time. **The CSS rescue alone (Finding 3) would have prevented a UX regression I would otherwise have shipped.**
- **Effort to apply:** ~20 minutes — add the section to SKILL.md, add the per-removal-type checklist as a subsection in SPEC_TEMPLATE.md.

### Proposal B — Add an "Inter-Commit Dependency Check" step to opticup-strategic SKILL

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` → "SPEC Authoring Protocol" → "Step 4 — Dispatch to Executor" → after the existing "Step 4.1 Identifier verification" sub-step, add **Step 4.2 — Inter-Commit Dependency Check**
- **Add the sub-step:** When the SPEC's commit plan (§9) has multiple commits that touch the same DB or filesystem objects, walk the commit sequence and verify for each commit N: do all the symbols/keys/rows that commit N's instructions reference still exist after commits 1..N-1 have run? In particular:
  - If commit K renames or deletes a permission key, verify that no later commit references the OLD key.
  - If commit K cascade-deletes tenants/rows, verify that no later commit reads from those rows.
  - If commit K deletes a file, verify that no later commit modifies it.
- **Rationale:** Finding 2 — the SPEC told the executor in commit 5 to use `debt.ai_config`, but that key was deleted in commit 2 (it was Group B-only). The executor caught it and substituted `ai.config`, but a 30-second walkthrough at SPEC-author time would have caught it earlier. Same family as Strategic Proposal A — both are about widening the pre-flight to look at *consequences* of changes, not just the changes themselves.
- **Effort to apply:** ~10 minutes — add the sub-step + a worked example.

These two proposals plus the previous review's accumulated 4 (Cross-Section Consistency, Identifier Verification, Live-State Baseline Probe, Rendered-DOM Verify) give me a 6-step pre-flight checklist. **At the next opticup-strategic session, I commit to applying all 6 to the SKILL file before authoring the next SPEC.**

---

## 7. Two opticup-executor improvement proposals (passing through, endorsing)

The executor proposed two improvements:

### Proposal C (executor's #1) — FK Constraint Pre-Flight in DB Pre-Flight Check

- **Where:** `.claude/skills/opticup-executor/SKILL.md` → Step 1.5 "DB Pre-Flight Check"
- **Change:** "When SPEC includes table DELETEs or tenant cascades, scan `information_schema.referential_constraints` BEFORE accepting the SPEC's table list. Document the full table list in BEFORE_STATE.json."
- **Foreman endorsement:** APPROVED. Mirror of Strategic Proposal A above (executor side).

### Proposal D (executor's #2) — Cross-tenant QA via Chrome `new_page` isolatedContext

- **Where:** `.claude/skills/opticup-executor/SKILL.md` → new section "Live-QA workflows"
- **Change:** "When QA requires switching tenants/users, use Chrome `new_page` with isolatedContext rather than re-navigating the existing tab. The user's open session is sacred."
- **Foreman endorsement:** APPROVED. Daniel had to re-login because of this; the new-tab pattern is correct.

---

## 8. Master-doc update checklist

| File | Status | Notes |
|---|---|---|
| `MASTER_ROADMAP.md` §3 | **PENDING** — TECH_DEBT entry needed for super-admin sub-roles + LEGACY_ROLE_MAP migration. To add at next strategic session. |
| `docs/GLOBAL_MAP.md` | **PENDING** — minor. New files `permission-matrix.js` + new functions. To add at next Integration Ceremony. |
| `docs/GLOBAL_SCHEMA.sql` | **NOT NEEDED** — no schema changes. Permission key renames are data, not schema. |
| `modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md` | ✅ DONE by executor (commit `bcc4de0`) |
| `modules/Module 1 - Inventory Management/docs/CHANGELOG.md` | ✅ DONE by executor (commit `bcc4de0`) |
| Tech-debt log | **PENDING** — 4 new items from this SPEC (FK pre-flight, CSS refactor, save-closure rule-21, hardcoded worker default) + the carried-forward super-admin sub-role item. |
| Strategic SKILL update | **PENDING** — apply 6 accumulated proposals before next SPEC. |
| Executor SKILL update | **PENDING** — apply 8 accumulated proposals (4 from this batch + 4 from prior reviews) before next SPEC execution. |

---

## 9. Closure note for Daniel (Hebrew, plain language)

הכל תוקן. ה-Manager שעבד אצלך עכשיו יכול לעשות פעולות מסיביות על המלאי כמוך (חוץ מגישה להגדרות שזה הרשאה נפרדת). 3 חנויות הבדיקה נמחקו, שמות ההרשאות אוחדו לסגנון קצר ואחיד, ובמסך מטריצת ההרשאות יש עכשיו כפתורי "סמן הכל" / "בטל הכל" בכל שורה - אם אתה רוצה לתת לתפקיד שלם את כל ההרשאות בקטגוריה אחת, זה לחיצה אחת במקום 5-10.

הסשן שלך ב-localhost:3000 התנתק תוך כדי בדיקת ה-QA - תיכנס מחדש כשתרצה לעבוד שם.

8 קומיטים נדחפו ל-develop. שני הריפו נקיים. אין יותר מה לעשות בנושא ההרשאות עכשיו.

---

## 10. Verdict

🟢 **CLOSED**.

- Production state: correct and verified live.
- Repos: clean and pushed.
- Retrospective: 5 files complete (SPEC, EXECUTION_REPORT, FINDINGS, BEFORE_STATE, AFTER_STATE, this review).
- Follow-up SPECs needed: **none immediate**. Two queued items from this batch's findings (super-admin sub-role employees model, CSS `.admin-mode` refactor) are tech-debt for separate future SPECs at Daniel's discretion.
- TECH_DEBT items added: **4** (FK pre-flight tooling, CSS coupling refactor, save-closure rule-21 false-positive, hardcoded worker default).
- SKILL improvements pending: **14 total** (6 strategic, 8 executor) — accumulated across the 4-SPEC batch. **The next opticup-strategic session MUST apply the 6 strategic proposals before authoring the next SPEC.** The pattern of the executor rescuing me from author-time gaps is sustainable only if I close the gaps.

The 4-SPEC batch (STOREFRONT_SYNC_HIERARCHY_FIX, STUDIO_BRANDS_VISIBILITY_REWORK, PERMISSIONS_AUDIT_PHASE1, PERMISSIONS_PHASE2_FIX) is a clean close to today's work. From Daniel's perspective: section 2 of supersale works, brand visibility has 4 clear modes, the manager bug is fixed, the permissions matrix is faster, and 3 unused tenants are gone. From the engineering perspective: 16 commits across develop, zero production bugs introduced, two fishhooks (Manager-can't-bulk + supersale section 2) closed, and a measurably tighter permission system.

---

*End of FOREMAN_REVIEW.md.*
