# FOREMAN_REVIEW — CRM_PHASE_B3_UI_CORE

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B3_UI_CORE/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-20
> **Reviews:** `SPEC.md` (author: Cowork strategic session, 2026-04-20) + `EXECUTION_REPORT.md` (executor: Claude Code / Windows desktop) + `FINDINGS.md` (5 findings)
> **Commit range reviewed:** `848b0c3..1bb0df6`

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS** — CRM UI is built: 7 JS files + HTML + CSS,
all under line limits, CRM card on home screen, FIELD_MAP entries added. 6
commits landed cleanly (SPEC planned 5, executor added a 6th for the
retrospective — correct behavior). 5 findings logged, none absorbed. Behavioral
criteria (7–12, 14) not browser-verified — deferred to Daniel's manual QA.
Caps at 🟡 because: (a) Module 4 `SESSION_CONTEXT.md`, `CHANGELOG.md`, and
`MODULE_MAP.md` still not created — this is the THIRD consecutive review
flagging this (B1 §8, B2 §8, now B3); (b) `js/shared.js` at 408 lines remains
unresolved tech debt from B2.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | "Build CRM UI with 3 tabs, read-only" — unambiguous, well-scoped |
| Measurability of success criteria | 5 | 17 criteria, each with exact expected value and verify command. Best criteria table in the project so far. |
| Completeness of autonomy envelope | 5 | Clear "CAN do" vs "REQUIRES stopping" split. DB writes explicitly forbidden. Shared file modifications bounded to FIELD_MAP only. |
| Stop-trigger specificity | 5 | File-size triggers, breakage triggers, scope triggers. All specific and actionable. |
| Rollback plan realism | 5 | All new files + 2 surgical edits. Simple and complete. |
| Expected final state accuracy | 3 | **Three mismatches with actual codebase:** (1) Script load order in §15 contradicted actual `inventory.html` order; (2) §11 showed raw `<a>` markup but `index.html` uses a `MODULES` JS config array; (3) §15 FIELD_MAP showed flat keys but actual structure is nested per-table. All three are the same class of error as B1 (Python) and B2 (MCP payload): **the Foreman writes SPEC code blocks without verifying the actual file structure.** |
| Commit plan usefulness | 5 | 5 commits, each single-concern, proper grouping. Executor followed exactly. |

**Average score:** 4.7/5.

**Weakest dimension:** Expected final state accuracy (3/5) — fourth consecutive
SPEC with at least one wrong assumption about the target codebase. The pattern
is now deeply entrenched: Cowork-authored code snippets that don't match reality.
B1 had wrong Python assumption, B2 had wrong row counts + infeasible MCP
transport, B3 has 3 structural mismatches. The executor handled all gracefully
(documented as Decisions in §4, not silent absorptions), but each costs ~15min
of cross-checking. Root cause: SPEC code blocks are written from memory instead
of from `grep`/`head` output of the actual files.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | Zero files outside scope touched. Zero DB writes. All 9 planned files created. 2 existing files modified exactly as scoped. 5 real-time decisions all well-reasoned and within spirit of SPEC. |
| Adherence to Iron Rules | 5 | Self-audit covers Rules 1–23 with evidence. `escapeHtml()` on all user data (Rule 8). `tenant_id` on every query (Rule 22). Status labels from DB, not hardcoded (Rule 9). FIELD_MAP updated (Rule 5). |
| Commit hygiene | 5 | 6 commits (5 code + 1 retrospective), each single-concern, proper `feat(crm)` / `chore(spec)` prefixes. Explicit `git add` by filename. |
| Handling of deviations | 5 | 5 Decisions documented in EXECUTION_REPORT §4 — all are SPEC-vs-reality mismatches that the executor resolved by following the actual codebase, not the SPEC literal. This is the correct judgment under Bounded Autonomy. Zero silent absorptions. |
| Documentation currency | 3 | FIELD_MAP updated. EXECUTION_REPORT + FINDINGS complete and thorough. But Module 4 `SESSION_CONTEXT.md` / `CHANGELOG.md` / `MODULE_MAP.md` still not created. The executor acknowledged this in their self-assessment (scored 8/10) and correctly noted it was flagged in B2 FOREMAN_REVIEW §8. This is now the third consecutive review where these files are missing. |
| FINDINGS.md discipline | 5 | 5 findings, none absorbed, each with severity + reproduction + suggested action. Finding M4-SCHEMA-01 (missing `is_deleted` on `crm_lead_notes`) is a genuine catch. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Self-assessment of 9.3/10 is fair. §5 "What Would Have Helped" is unusually actionable — all 3 items trace directly to SPEC authoring gaps. The executor is now effectively coaching the Foreman. |

**Average score:** 4.7/5.

**Did executor follow the autonomy envelope correctly?** YES — exemplary. The
`showCrmTab()` decision (Decision #4) is exactly the right call: the SPEC said
"follow `showTab()` pattern" but modifying `shared-ui.js` was outside the
autonomy envelope. The executor created a local implementation that mirrors
the pattern without touching shared code. This is the best autonomy-envelope
judgment in the project to date.

**Did executor ask unnecessary questions?** 0. Perfect.

**Did executor silently absorb any scope changes?** No. All 5 decisions
explicitly documented with SPEC reference, cause, and resolution.

---

## 4. Findings Processing

| # | Finding code | Summary | Disposition | Action |
|---|---|---|---|---|
| 1 | M4-DEBT-01 | `js/shared.js` at 408 lines (57 over 350 max) | ACCEPT — MEDIUM | TECH_DEBT: split FIELD_MAP into `js/field-map.js`. Bundle with the next SPEC that touches shared.js or adds FIELD_MAP entries. Not a standalone SPEC — mechanical refactor. |
| 2 | M4-TOOL-01 | `rule-21-orphans` checker flags IIFE-scoped locals | ACCEPT — MEDIUM | TECH_DEBT: fix the checker's AST walk to only flag top-level declarations. Low priority but improves signal-to-noise for every future commit. |
| 3 | M4-TOOL-02 | `SUPABASE_ANON` JWT triggers `rule-23-secrets` | ACCEPT — LOW | TECH_DEBT: add allow-list entry for `SUPABASE_ANON` variable name. Trivial fix, bundle with next verify.mjs touch. |
| 4 | M4-SCHEMA-01 | `crm_lead_notes` lacks `is_deleted` column | ACCEPT — LOW | **Decision: treat notes as append-only audit stream.** Rationale: (a) notes were imported from Monday history and represent a frozen record; (b) the CRM UI is read-only in B3; (c) when note-editing lands (B4+), the SPEC for that feature will either add the column or explicitly declare notes append-only. Document this decision in SESSION_CONTEXT when created. |
| 5 | M4-QA-01 | Browser smoke test not possible (no Chrome DevTools) | DISMISS | Environment limitation, not a code issue. The executor correctly deferred criteria 7–12, 14 to manual QA and documented the gap. See §6 Proposal 1 for the systemic fix. |

**Zero findings left orphaned.** ✅

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|------|-----------|--------|
| "7 JS files under `modules/crm/`, each ≤ 222 lines" | ✅ | `wc -l modules/crm/*.js`: 7 files, max 222 (crm-leads-tab.js). Exact match. |
| "CRM card added to `index.html` using MODULES config array" | ✅ | `grep crm index.html`: line 152 shows `{ id: 'crm', ... url: 'crm.html', permission: 'settings.view' }`. Matches Decision #2 in EXECUTION_REPORT. |
| "4 FIELD_MAP table entries added to `js/shared.js`" | ✅ | `grep crm_ js/shared.js`: lines 239, 248, 255, 258 — `crm_leads`, `crm_events`, `crm_lead_notes`, `crm_event_attendees`. Matches Decision #3 (nested structure). |

All 3 spot-checks passed. ✅

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Mandatory file-inspection step before writing SPEC code blocks

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1 — Pre-SPEC Preparation"
- **Change:** Add Step 1.75 after Cross-Reference Check: *"For every existing file the SPEC mandates MODIFYING, read the file's actual structure before writing ANY code block in the SPEC that references it. Specifically: (a) `head -30 <file>` for script load order / HTML structure; (b) `grep -n '<pattern>' <file>` for the specific structure the SPEC code block assumes (e.g., FIELD_MAP format, MODULES config). If the SPEC's code block doesn't match the file's actual structure, fix the SPEC — do NOT leave it for the executor to discover. Running total of SPECs with this class of error: Phase A (UUID), B1 (Python), B2 (MCP + row counts), B3 (3 structural mismatches) = 4 consecutive SPECs. This step is now MANDATORY, not advisory."*
- **Rationale:** Fourth consecutive SPEC with wrong assumptions about target files. The executor has now explicitly called this out in §5 ("A 30-second `grep -n FIELD_MAP js/shared.js` during SPEC authoring would have caught all three"). Cost: ~15min per SPEC of executor cross-checking. Cumulative cost across 4 SPECs: ~1h of wasted executor time.
- **Source:** EXECUTION_REPORT §4 Decisions 1–3, §5 bullet 2

### Proposal 2 — Add Chrome DevTools precondition to UI-SPEC template

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §13 "Dependencies / Preconditions"
- **Change:** Add: *"For UI SPECs that include behavioral success criteria (page loads, modal opens, zero console errors): add a precondition: 'Chrome must be running with `--remote-debugging-port=9222` on the target machine before executor dispatch.' If Chrome cannot be guaranteed, mark the behavioral criteria as 'VERIFY: manual QA by Daniel' in the success criteria table and adjust the criterion count in §1 summary accordingly."*
- **Rationale:** B3 had 7 behavioral criteria (7–12, 14) that couldn't be verified because Chrome wasn't running with debugging port. The SPEC didn't acknowledge this limitation — the executor had to discover and document it. Future UI SPECs should pre-classify criteria as structural (automatable) vs behavioral (needs browser).
- **Source:** FINDINGS M4-QA-01, EXECUTION_REPORT §5 bullet 1

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Pre-flight file-structure check for modified files

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check"
- **Change:** Add: *"For every existing file the SPEC mandates MODIFYING: read the file's actual structure BEFORE Step 2. Compare: (a) the SPEC's code-block assumptions (script order, data structure format, HTML pattern) against (b) the file's actual content. Common traps: flat vs nested structures, raw HTML vs JS config arrays, simplified vs actual script-load order. If any mismatch: document as a Decision in EXECUTION_REPORT §4, follow the actual file structure (not the SPEC literal), and continue without stopping — this is an author-side error, not a deviation requiring escalation."*
- **Rationale:** The executor already did this correctly (5 Decisions in §4), but it took ~15 minutes of ad-hoc discovery. A documented pre-flight step makes it systematic and faster.
- **Source:** EXECUTION_REPORT §4 Decisions 1–3, §5 bullet 2

### Proposal 2 — Create Module 4 doc files as a standalone hygiene commit

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Documentation Currency"
- **Change:** Add: *"If EXECUTION_REPORT §6 Iron-Rule Self-Audit or the executor's own assessment flags missing module-level docs (SESSION_CONTEXT.md, CHANGELOG.md, MODULE_MAP.md) that were called out in a prior FOREMAN_REVIEW — create them in a separate `docs(crm): create Module 4 session docs` commit BEFORE writing EXECUTION_REPORT. This is within scope of any SPEC that adds code to the module, because MODULE_MAP must reflect the new files. Do not defer to 'follow-up' if you can create them now."*
- **Rationale:** Three consecutive FOREMAN_REVIEWs (B1 §8, B2 §8, B3 §8) have flagged these missing files. Each time, both executor and Foreman agree they should exist but defer creation. The executor is the one who knows the code best at execution time — creating the docs then is cheaper than creating them later from cold context.
- **Source:** EXECUTION_REPORT §7 self-assessment (scored 8/10 on doc currency), B2 FOREMAN_REVIEW §8

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | Follow-up needed |
|-----|--------------------------|---------|------------------|
| `MASTER_ROADMAP.md` §3 | NO — B3 is mid-module, not a module close | N/A | None |
| `docs/GLOBAL_MAP.md` | NO — no new contracts (CRM functions are module-internal) | N/A | None |
| `docs/GLOBAL_SCHEMA.sql` | NO — no new DB objects | N/A | None |
| Module 4 `SESSION_CONTEXT.md` | **YES** — Module 4 now has a full UI, 7 tables with data, 9 new files. Must document current state. | **NO** | **MANDATORY: create in next commit. Third consecutive review flagging this.** |
| Module 4 `CHANGELOG.md` | **YES** — 14 commits across B1–B3 | **NO** | **MANDATORY: create in next commit.** |
| Module 4 `MODULE_MAP.md` | **YES** — 9 new files, multiple functions | **NO** | **MANDATORY: create in next commit.** |
| Module 4 `MODULE_SPEC.md` | Already exists from Phase A | N/A | Update at next phase boundary |

Three rows flagged. All three have been flagged in prior reviews. Per Hard-Fail
Rules, verdict caps at 🟡. **These files MUST be created before the B4 SPEC is
dispatched — not deferred again.**

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> ממשק ה-CRM מוכן — דשבורד, לידים עם חיפוש ופילטרים, ואירועים עם סטטיסטיקות.
> 9 קבצים חדשים, הכל מתחת למגבלת השורות, כרטיס CRM בדף הבית.
> הצעד הבא: שאתה תעשה QA ידני ב-crm.html (לבדוק טעינת נתונים, מודלים, RTL),
> ואז נתקדם ל-B4 (מודול יום אירוע + הודעות).

---

## 10. Followups Opened

- **M4-DEBT-01** (`shared.js` 408 lines) → TECH_DEBT: split FIELD_MAP into
  `js/field-map.js`. Bundle with next shared.js-touching SPEC.
- **M4-TOOL-01** (rule-21 false positives) → TECH_DEBT: fix AST walk scope
  detection. Bundle with next verify.mjs improvement.
- **M4-TOOL-02** (SUPABASE_ANON false positive) → TECH_DEBT: add allow-list.
  Bundle with M4-TOOL-01.
- **M4-SCHEMA-01** (`crm_lead_notes` no `is_deleted`) → ACCEPTED as
  append-only design. Document in SESSION_CONTEXT. Revisit when note-editing
  SPEC is authored.
- **Module 4 SESSION_CONTEXT.md + CHANGELOG.md + MODULE_MAP.md** → **MANDATORY
  before B4 SPEC dispatch.** This is non-negotiable — third consecutive deferral.
