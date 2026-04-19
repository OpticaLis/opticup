# FOREMAN_REVIEW — STOREFRONT_LANG_AND_VIDEO_FIX

> **Location:** `modules/Module 3 - Storefront/docs/specs/STOREFRONT_LANG_AND_VIDEO_FIX/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-17
> **Reviews:** `SPEC.md` (author: opticup-strategic, 2026-04-17) + `EXECUTION_REPORT.md` (executor: Claude Code Windows desktop) + `FINDINGS.md` (4 findings)
> **Commit range reviewed:** storefront `2dcf763..45cd329` (1 commit) + ERP `59a83d4` (retrospective)

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS** — Two of three tasks fully delivered (youtube-nocookie fix, /prizmaexpress/ RU text fix). The third task (EN/RU routing) was correctly diagnosed as a develop-to-main merge gap, not a code bug — escalated per SPEC §5a. The merge requires Daniel's authorization. One TECH_DEBT finding queued (malformed `supersale` slug). No documentation drift.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | Three tasks named, scoped, independent. No ambiguity. |
| Measurability of success criteria | 4 | 17 criteria with exact expected values and verify commands. SC-11 regex was too broad (captured CSS comments alongside corrupted text) — see §6 Proposal 1. |
| Completeness of autonomy envelope | 5 | Level 2 SQL pre-approved, routing fix capped at ~50 lines, View changes excluded. Tight and practical. |
| Stop-trigger specificity | 5 | Two-tier STOP-ESCALATE / STOP-SUMMARIZE model (applied from DNS_SWITCH_READINESS_QA A-2 proposal). Executor used STOP-ESCALATE correctly for the merge gap. |
| Rollback plan realism | 5 | Code rollback via git reset + DB rollback via saved pre-state. Both scoped correctly. |
| Expected final state accuracy | 3 | Routing fix files listed as "TBD by diagnosis" — reasonable for an investigation SPEC, but the SPEC did not account for the possibility that no develop-side code change was needed. The expected final state should have included a branch: "if diagnosis shows a merge gap, expected state = no code change + STOP-ESCALATE." |
| Commit plan usefulness | 4 | Commit 1 and 3 executed as planned. Commit 2 was correctly skipped because no routing code change was needed on develop. |

**Average score:** 4.4/5.

**Weakest dimension + why:** Expected final state accuracy (3/5) — the SPEC assumed a code fix would be needed on develop and didn't model the "merge gap, no code change" outcome. This is a recurring pattern when SPECs target symptoms visible on a different deployment branch than the working branch.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | Executed tasks 1 and 2 exactly. Task 3 followed the diagnostic plan (D-1 first), identified the root cause efficiently, and STOP-ESCALATED per §5a. Did not attempt speculative fixes. |
| Adherence to Iron Rules | 5 | Rule 9 (no hardcoded values), Rule 12 (file size), Rule 21 (no orphans), Rule 22 (defense-in-depth on UPDATE), Rule 23 (no secrets), Rule 29 (no View modifications) — all verified. |
| Commit hygiene | 5 | Single storefront commit with 2 files, 3 line changes, scoped message. Retrospective bundles SPEC + reports per folder-per-SPEC protocol. |
| Handling of deviations | 5 | 4 deviations documented with clear reasoning. STOP-ESCALATE used correctly for the merge gap — did not attempt to fix, did not silently absorb. Port deviation (4324 vs 4321) handled pragmatically. |
| Documentation currency | 4 | EXECUTION_REPORT + FINDINGS complete. SESSION_CONTEXT updated. Did not update CHANGELOG — justified for a fix SPEC in a sibling repo. |
| FINDINGS.md discipline | 5 | 4 findings logged with severity, reproduction steps, and suggested dispositions. None silently absorbed. The stale-inventory finding (INFO) shows thoroughness. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Self-score 9.5/10 is calibrated — the 0.5 deduction for the PARTIAL SC-11 is honest. Raw command log included. Pre-state capture documented for rollback. |

**Average score:** 4.9/5.

**Did executor follow the autonomy envelope correctly?** YES. The Level 2 SQL UPDATE was pre-approved in SPEC §4. The STOP-ESCALATE was the correct response to "fix requires merge to main" per §5a. Zero unauthorized actions.

**Did executor ask unnecessary questions?** Zero questions asked mid-execution.

**Did executor silently absorb any scope changes?** No. The stale page inventory (24 vs 17) was logged as a finding rather than silently testing only the SPEC's 17.

---

## 4. Findings Processing

| # | Code | Finding summary | Disposition | Action taken |
|---|------|-----------------|-------------|--------------|
| 1 | M3-ROUTING-01 | EN/RU 404s on Vercel are a develop→main merge gap, not a code bug. main is 20+ commits behind develop. | **ESCALATE TO DANIEL** | Merge decision required — only Daniel can authorize. See §9. |
| 2 | M3-LANG-SPEC-01 | SC-11 regex captures legitimate Hebrew CSS comments, not only corrupted words | **DISMISS** | Corrupted words are fixed. CSS comments are developer-only, invisible in rendered pages. Informing §6 Proposal 1 (precision of SC criteria). |
| 3 | M3-LANG-SPEC-02 | SPEC inventory listed 17 slugs/lang but DB has 24 | **DISMISS** | All 24 tested and pass. SPEC floor (≥17) absorbed the drift. No action needed. |
| 4 | M3-DATA-01 | Malformed `supersale` slug (no leading slash) in 3 DB rows (he/en/ru) | **TECH_DEBT** | Not user-visible (well-formed `/supersale/` twins exist). Should be cleaned before DNS switch. Added to follow-ups below. |

**Zero findings left orphaned.**

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "grep -rn youtube-nocookie returns empty" (SC-14) | ✅ | `Grep youtube-nocookie src/` → 0 matches |
| "Commit 45cd329 exists with correct message" | ✅ | `git log --oneline 45cd329 -1` → `fix(storefront): replace youtube-nocookie with youtube in StepsBlock and VideoBlock` |
| "youtube.com with iv_load_policy=3 in both files" | ✅ | `Grep youtube\.com StepsBlock.astro` → 1 hit with iv_load_policy=3; `Grep youtube\.com VideoBlock.astro` → 2 hits both with iv_load_policy=3 |

All 3 spot-checks pass.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal A-1 — Deploy-branch outcome modeling in SPEC §8 Expected Final State

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §8 Expected Final State
- **Change:** Add a template note after the "Modified files" table:
  > **If this SPEC targets symptoms visible on a deployment (Vercel/GH Pages/etc.) that deploys from a branch OTHER than `develop`:** add an "Alternative outcome" row: "If diagnosis shows the fix already exists on `develop` and the symptom is a merge gap → expected state = no code change on develop, STOP-ESCALATE with merge recommendation."
- **Rationale:** This SPEC's §8 assumed code changes would be needed on develop. The executor correctly identified that no code change was needed — the fix already existed on develop but hadn't been merged to main. Future SPECs targeting Vercel-visible symptoms should model this possibility at authoring time so the "no code change" outcome doesn't appear as a deviation.
- **Source:** EXECUTION_REPORT §3 deviation 1, §5 bullet 1+3

### Proposal A-2 — SC precision guide: distinguish "intent criteria" from "literal criteria"

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §3 Success Criteria table
- **Change:** Add a column **"Type"** to the SC table with values `LITERAL` (regex/count must match exactly) or `INTENT` (semantic meaning matters, literal regex is an approximation). For INTENT criteria, add a parenthetical stating the intent. Example: SC-11 would become `INTENT (no Hebrew in user-visible Russian text)` with the regex as the verify command but not the sole pass/fail gate.
- **Rationale:** SC-11's regex (`blocks::text ~ '[\u0590-\u05FF]'`) was literally correct as a superset check but flagged Hebrew CSS comments that are invisible to users. The executor correctly declared PARTIAL, but a LITERAL/INTENT distinction at authoring time would have prevented the ambiguity. The executor's Proposal 2 (SC Precision Audit) is the complementary executor-side check; this is the author-side prevention.
- **Source:** FINDINGS M3-LANG-SPEC-01, EXECUTION_REPORT §3 deviation 2

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal E-1 — Deploy-target verification in Step 1.5 Pre-Flight

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check"
- **Change:** Add sub-check 8: "Deploy-target sanity" — if the SPEC's symptoms are on a hosted deployment (Vercel, GH Pages), run `git log origin/main..origin/develop --oneline | wc -l` and `git diff origin/main origin/develop -- <routing_files>`. If develop is ahead AND suspected routing files differ → test localhost first; if localhost passes → escalate as merge gap before writing any code.
- **Rationale:** The executor identified this gap during diagnosis but suggests (correctly) that a Step 1.5 check would have converted a 30-minute diagnostic exercise into a 5-minute confirmation. Endorsing verbatim from EXECUTION_REPORT §8 Proposal 1.
- **Source:** EXECUTION_REPORT §8 Proposal 1, §5 bullet 3

### Proposal E-2 — SC Precision Audit at SPEC load time

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"SPEC Execution Protocol — Step 1"
- **Change:** Add sub-step 1.7: "For every SC, ask: could this criterion pass/fail in a way that doesn't reflect the SPEC's intent? If a criterion could PARTIAL-match, flag to Foreman before executing." Endorsing verbatim from EXECUTION_REPORT §8 Proposal 2.
- **Rationale:** SC-11 PARTIAL was correctly handled but the ambiguity cost ~3 minutes and a finding. Pre-execution precision check would surface this at SPEC load time.
- **Source:** EXECUTION_REPORT §8 Proposal 2, §5 bullet 2

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | NO — fix SPEC, not a phase close | N/A | — |
| `docs/GLOBAL_MAP.md` | NO — no new functions/contracts | N/A | — |
| `docs/GLOBAL_SCHEMA.sql` | NO — no DDL | N/A | — |
| Module 3 `SESSION_CONTEXT.md` | YES | YES — updated in retrospective commit | — |
| Module 3 `CHANGELOG.md` | NO — storefront fix lives in sibling repo's commit history | N/A | — |
| Module 3 `MODULE_MAP.md` | NO — no new files/functions | N/A | — |
| Module 3 `MODULE_SPEC.md` | NO — no architectural change | N/A | — |

**No documentation drift.** All "should have been updated" items were updated.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> תיקון היוטיוב ותיקון הטקסט הרוסי בפריזמה אקספרס הושלמו בהצלחה. הבעיה של עמודי האנגלית והרוסית שמחזירים 404 היא לא באג בקוד — הקוד עובד מצוין, אבל הוא יושב על develop ועדיין לא מוזג ל-main שממנו Vercel עושה deploy. ברגע שתאשר מיזוג develop ל-main, כל 58 העמודים יעבדו.

---

## 10. Followups Opened

- **M3-ROUTING-01 → Daniel merge decision** — EN/RU pages will 404 on Vercel until `develop → main` merge is authorized. Not a new SPEC — it's a single merge operation requiring Daniel's approval per CLAUDE.md §9 rule 7.
- **M3-DATA-01 → TECH_DEBT** — 3 malformed `supersale` rows (no leading slash) in `storefront_pages`. Can fold into a future STOREFRONT_SLUG_HYGIENE SPEC or a pre-DNS-switch cleanup pass. Not user-visible today.
