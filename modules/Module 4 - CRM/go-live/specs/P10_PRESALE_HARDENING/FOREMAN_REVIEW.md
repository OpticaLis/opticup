# FOREMAN_REVIEW — P10_PRESALE_HARDENING

> **Location:** `modules/Module 4 - CRM/go-live/specs/P10_PRESALE_HARDENING/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-23
> **Reviews:** `SPEC.md` (author: opticup-strategic / Cowork session happy-elegant-edison, 2026-04-23) + `EXECUTION_REPORT.md` (executor: opticup-executor / Claude Code Windows desktop) + `FINDINGS.md` (3 findings)
> **Commit range reviewed:** `1ab172b..f716390` (7 commits)

---

## 1. Verdict

**CLOSED WITH FOLLOW-UPS**

30/30 success criteria passed. Zero mid-execution stops — third consecutive
overnight-capable SPEC to run clean. All three production blockers resolved:

1. **Phone normalization** — `normalizePhone` ported from `lead-intake` EF to
   client-side `crm-helpers.js`, wired into `createManualLead` + `updateLead`,
   duplicate check before every write, existing demo data normalized, one
   duplicate pair merged via soft-delete with audit note.

2. **Unsubscribe loop complete** — engine filters `unsubscribed_at IS NOT NULL`
   across all 5 recipient resolvers (4 group types + `trigger_lead`), new
   `unsubscribe` EF deployed (v1 ACTIVE, HMAC-signed tokens, 90-day TTL,
   Hebrew confirmation pages for 3 states), `send-message` EF updated (v3)
   to generate `%unsubscribe_url%` with signed tokens.

3. **Message log visibility** — root cause confirmed as duplicate leads (messages
   logged against lead ID "A", user views lead ID "B" with same phone). Fixed
   by Phase 1's normalization + merge. Phase 4 correctly closed as no-op per
   SPEC authorization.

The follow-up is driven by one MEDIUM finding (HMAC key-rotation footgun)
that should be addressed before Prizma hits real volume, plus one LOW
(soft-deleted lead toast edge case). Neither blocks P7 cutover.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | Three blockers stated upfront with root cause analysis already done. §2 Background traced each issue to specific code locations. The SPEC told the executor exactly WHERE the problem was, not just WHAT was broken. |
| Measurability of success criteria | 5 | 30 criteria, each with expected value and verify command. Track C (message log) appropriately open-ended with documentation criterion (#18) and no-op authorization if root cause = duplicates. |
| Completeness of autonomy envelope | 5 | MAXIMUM AUTONOMY design with explicit pre-authorization for: EF creation, EF modification, Level 2 SQL, data normalization, duplicate merging. Only 4 hard stops, all narrow. Zero false triggers during execution. |
| Stop-trigger specificity | 5 | 4 stop triggers, each binary and unambiguous (wrong phone, >350 lines, page won't load, accidental DELETE). No false positives. |
| Rollback plan realism | 5 | Code via `git revert`, EF via folder delete + revert, data normalization explicitly called non-destructive (E.164 contains original digits). Duplicate merges documented with lead IDs for potential re-creation. No DDL to roll back. |
| Expected final state accuracy | 5 | Every file prediction was correct: 1 new file (unsubscribe EF), 6 modified files, all named correctly. SPEC wisely skipped line-count estimates (lesson from P6/P8). The executor also produced `p10-data-merge-demo.sql` as an artifact — reasonable and within scope. |
| Commit plan usefulness | 5 | 9 commits planned, 7 delivered. SPEC explicitly authorized no-op merges for Commits 6+7 (§9 "no-op eligible"). Budget "5-10 commits" was accurate. Commit messages followed the plan verbatim. |
| Technical design quality | 5 | §12 provided copy-paste-ready code for `normalizePhone`, duplicate check pattern, engine filter clause, EF flow, and data cleanup SQL. Token format left to executor discretion (correct — implementation detail). The executor praised the SQL templates in §5 "What Would Have Helped." |

**Average score:** 5.0/5.

**This is the strongest SPEC in the Go-Live series.** The combination of
(a) root cause analysis already done in §2, (b) copy-paste-ready code in §12,
(c) explicit no-op authorization for the investigation track, and (d) lessons
incorporated from P6/P8/P9 produced a SPEC that required zero interpretation
and zero stops. The overnight-run promise was fully delivered.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | 30/30 criteria met. Zero material deviations. One merge of Commits 6+7 as SPEC-authorized no-ops. The executor correctly identified message-log invisibility as a symptom of duplicates (SPEC §12.7 predicted this path). |
| Adherence to Iron Rules | 5 | All files under 350 (max: crm-lead-modals.js 336). Rule 3 (soft delete) for duplicate merge. Rule 21 (grep before create) for both `normalizePhone` and `unsubscribe` folder. Rule 22 (defense in depth) on every query. Rule 8 (no innerHTML) with `esc()` function in EF HTML. Rule 23 (no secrets) — HMAC key is env var. |
| Commit hygiene | 5 | 7 commits, each single-concern. Messages scoped (`feat/fix/docs/chore`). No-op merges documented. Data artifact (`p10-data-merge-demo.sql`) committed separately from code — good separation. |
| Handling of deviations | 5 | No material deviations. 6 real-time decisions documented in §4, all within SPEC-granted discretion: TTL choice (90 days), token format (colon-separated b64url), "no token" HTML page, duplicate merge winner selection, no-op merge of Phase 4+5. Each decision has reasoning. |
| Documentation currency | 5 | SESSION_CONTEXT.md + ROADMAP.md updated in docs commit. MODULE_MAP.md explicitly out of scope (SPEC §7). Improvement over P9 which scored 4 here. |
| FINDINGS.md discipline | 5 | 3 findings logged with appropriate severity. LOW (soft-delete toast) correctly identified as non-blocking edge case. INFO (MCP deploy quirk) correctly dismissed as tooling, not project issue. MEDIUM (HMAC rotation) is a genuine forward-looking security concern — shows the executor is thinking about production lifecycle, not just "does the demo work." |
| EXECUTION_REPORT honesty + specificity | 5 | Self-assessment 9.2/10 — accurate and appropriately modest (attributed score partly to SPEC quality). Raw command log includes exact SQL queries, curl outputs, and browser test results. Cleanup section verifies baseline restoration. 2 improvement proposals are both actionable and non-obvious. |

**Average score:** 5.0/5.

**Did executor follow the autonomy envelope correctly?** YES — zero stops,
zero questions, zero scope leaks. Third consecutive perfect autonomy run.

**Did executor ask unnecessary questions?** Zero. Perfect.

**Did executor silently absorb any scope changes?** No. Every decision
documented in §4 with reasoning.

---

## 4. Findings Processing

| # | Finding | Code | Severity | Disposition | Action |
|---|---------|------|----------|-------------|--------|
| 1 | Soft-deleted lead blocks re-creation with same phone (phantom duplicate toast) | M4-BUG-P10-01 | LOW | **TECH_DEBT** | Not a P7 blocker. Edge case requires: (a) explicit soft-delete, then (b) re-create with same phone. Fix requires Daniel's UX preference (allow re-creation? or offer "restore" affordance?). Queue for next polish SPEC after P7. |
| 2 | Supabase MCP needs explicit `import_map_path` on EF update | M4-TOOL-P10-02 | INFO | **DISMISS** (with note) | Tooling quirk, not a project issue. Accepted executor's Proposal 1 to document the workaround in the executor skill. |
| 3 | HMAC key = `SUPABASE_SERVICE_ROLE_KEY` has rotation footgun | M4-SEC-P10-03 | MEDIUM | **TECH_DEBT** | Agreed this is a real concern but NOT a P7 blocker. Service-role key rotation is rare and not planned. Before Prizma hits significant volume (~500+ leads), a small SPEC should introduce a dedicated `UNSUBSCRIBE_HMAC_KEY` secret + key-version field in tokens. Not urgent enough for NEW_SPEC — the risk is theoretical until a rotation happens. Downgraded from executor's NEW_SPEC to TECH_DEBT with a volume trigger. |

**Findings vs P9 blockers:** P9 Findings #1 and #2 (engine ignores
`unsubscribed_at` + no unsubscribe endpoint) were the two HIGH items that
blocked P7. P10 resolved both completely. The unsubscribe loop is now closed:
engine filters, EF accepts tokens, send-message generates URLs. These P9
blockers are **RESOLVED**.

---

## 5. Spot-Check Verification

| Claim | Method | Result |
|-------|--------|--------|
| 7 commits from `1ab172b` to `f716390` | `git log --oneline 4b86a81..HEAD` | **CONFIRMED** — 7 commits, hashes match exactly |
| `crm-lead-modals.js` 337 lines | `wc -l` | **336** — 1 line off, within rounding (executor may have counted trailing newline). Trivial. |
| `crm-lead-actions.js` 251 lines | `wc -l` | **CONFIRMED** — 251 |
| `crm-automation-engine.js` 228 lines | `wc -l` | **CONFIRMED** — 228 |
| `send-message/index.ts` 332 lines | `wc -l` | **CONFIRMED** — 332 |
| `unsubscribe/index.ts` 184 lines | `wc -l` | **CONFIRMED** — 184 |
| `normalizePhone` in crm-helpers.js + crm-lead-actions.js | `grep -rn normalizePhone modules/crm/` | **CONFIRMED** — 2 files |
| `unsubscribed_at` in 5 places in engine | `grep -c unsubscribed_at crm-automation-engine.js` | **CONFIRMED** — 5 occurrences |
| `unsubscribe` EF folder exists | `ls supabase/functions/unsubscribe/` | **CONFIRMED** — `deno.json` + `index.ts` |
| All CRM files ≤ 350 lines | `wc -l modules/crm/*.js` | **CONFIRMED** — max 336 (crm-lead-modals.js) |

**Spot-check result:** 10/10 claims verified. One trivial 1-line discrepancy
(337 vs 336) — likely trailing newline difference. No concerns.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Root-cause-first SPEC structure should become the default

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol"
- **Change:** Add a guideline: _"When a SPEC addresses bugs or symptoms reported by Daniel, §2 Background MUST include a root cause analysis with the specific code location and the chain of causation (e.g., 'manual creation → no normalization → UNIQUE doesn't fire → duplicate → messages logged against wrong ID'). The executor should not need to investigate WHY — only HOW to fix."_
- **Rationale:** P10's §2 Background gave the executor a complete causal chain. The executor confirmed in §5 that the copy-paste-ready SQL "saved time." P9's SPEC also had good background but left more investigation to the executor (Track D "executor initiative"). P10 proves that pre-chewed root cause → faster execution → fewer decisions → zero stops.
- **Source:** Comparison of P9 (4.6/5 SPEC quality, 28 min) vs P10 (5.0/5 SPEC quality, ~1 hr but 3x the scope).

### Proposal 2 — Add a "P9 blockers resolved" cross-reference section

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` § "SPEC Authoring Protocol" → "Lessons Already Incorporated" subsection
- **Change:** Add a guideline: _"When a SPEC is born from a prior SPEC's FINDINGS (e.g., P10 from P9 Findings #1+#2), the SPEC MUST include a §11-style table showing which prior findings this SPEC addresses, and the FOREMAN_REVIEW must confirm each is RESOLVED. This creates an auditable chain: Finding → SPEC → Resolution."_
- **Rationale:** P10 addressed P9's two HIGH findings but the SPEC's §11 table ("Lessons Already Incorporated") tracked process lessons, not finding resolutions. The Foreman had to manually trace "P9 Finding #1 → P10 Track B criterion #10-11" to confirm resolution. A dedicated cross-reference makes this traceable without manual detective work.
- **Source:** This review's §4 "Findings vs P9 blockers" paragraph.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor) — Foreman Endorsement

### Executor Proposal 1 — Pre-register Supabase EF deploy recipe

- **Endorsement:** **ACCEPTED.** The MCP `import_map_path` quirk is real (Finding 2 confirms). A 3-line note in the executor skill saves 3 minutes per EF update. Minimal cost, clear benefit.
- **Where executor should add it:** `.claude/skills/opticup-executor/SKILL.md` § "Reference: Key Files to Know"

### Executor Proposal 2 — `sql-artifacts/` convention

- **Endorsement:** **ACCEPTED WITH MODIFICATION.** The convention is sound but the path should be `modules/Module X - [Name]/go-live/sql-artifacts/` (not a generic `sql-artifacts/` at module root). This keeps it co-located with the go-live phase folder where SPECs live. The executor's P10 artifact (`p10-data-merge-demo.sql`) was already in the right neighborhood — just needs a dedicated subfolder for discoverability.
- **Where executor should add it:** `.claude/skills/opticup-executor/SKILL.md` § "Backup Protocol"

---

## 8. Master-Doc Checklist

| Document | Needs Update? | What |
|----------|--------------|------|
| `CLAUDE.md` | No | No new rules or conventions introduced |
| `docs/GLOBAL_MAP.md` | **Yes** (M4-DOC-06, pre-existing) | `normalizePhone`, `CrmSendDialog`, `CrmLeadFilters` not registered. Integration Ceremony debt — not P10's fault. |
| `docs/GLOBAL_SCHEMA.sql` | No | No DDL changes |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | **Yes** (M4-DOC-06) | New files from P9 (`crm-send-dialog.js`, `crm-lead-filters.js`) and P10 changes (`normalizePhone` in helpers, unsubscribe EF) not reflected. |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Already updated | Commit `27ca706` |
| `modules/Module 4 - CRM/go-live/ROADMAP.md` | Already updated | Commit `27ca706` |

**M4-DOC-06 status:** MODULE_MAP.md has been stale since P6. Now 4 SPECs
behind (P6, P8, P9, P10). Should be a dedicated cleanup commit before P7
cutover — not a SPEC, just a documentation sweep.

---

## 9. Daniel-Facing Summary (Hebrew)

**P10 — חיזוק טרום-מכירה: סגור.**

שלושת החוסמים שזיהית תוקנו:

1. **כפילויות לידים** — כל מספר טלפון עובר נרמול לפורמט בינלאומי (`+972...`)
   לפני שמירה, גם ביצירה ידנית וגם בעריכה. אם הטלפון כבר קיים — הודעת שגיאה
   ברורה. הליד הכפול בדמו מוזג (הישן נמחק רכות).

2. **הסרה מרשימת תפוצה** — המנוע מסנן לידים שביקשו הסרה. קישור
   "הסר מרשימה" בכל אימייל עכשיו עובד: לחיצה → עמוד אישור בעברית →
   הליד לא מקבל יותר הודעות. חתום דיגיטלית כך שאי אפשר לזייף.

3. **הודעות לא מופיעות בהיסטוריה** — הסיבה הייתה כפילות הלידים.
   אחרי שתיקנו את הנרמול ומיזגנו את הכפילויות — ההודעות מופיעות מתחת
   לליד הנכון.

**מה נשאר לפני P7 (חיתוך פריזמה):**
- QA שלך על P6 + P8 + P9 + P10 ביחד — הכל על develop, תעבור על המסכים
- עדכון MODULE_MAP.md (חוב תיעוד ישן, לא חוסם אבל כדאי)
- אם הכל בסדר → P7 = העברת הנתונים של פריזמה

---

## 10. Go-Live Pipeline Status

| SPEC | Status | Verdict |
|------|--------|---------|
| P1 — Schema + Seed | CLOSED | n/a (pre-Foreman) |
| P2a — Lead Intake EF | CLOSED | n/a |
| P2b — Make Integration | CLOSED | n/a |
| P3a — Leads Tab | CLOSED | n/a |
| P3b — Lead Detail | CLOSED | n/a |
| P3c+P4 — Events + Messaging | CLOSED | n/a |
| P5 — Automation Rules | CLOSED | n/a |
| P5.5 — Live Dispatch Test | CLOSED | n/a |
| P6 — Full Cycle Test | CLOSED | n/a (pre-Foreman) |
| P8 — Automation Engine | CLOSED | CLOSED WITH FOLLOW-UPS |
| P9 — CRM Hardening | CLOSED | CLOSED WITH FOLLOW-UPS |
| **P10 — Pre-Sale Hardening** | **CLOSED** | **CLOSED WITH FOLLOW-UPS** |
| P7 — Prizma Cutover | **NOT STARTED** | Awaits Daniel QA sign-off |

**All production blockers identified through P6–P10 are resolved.** The CRM
Go-Live pipeline is feature-complete for P7. What remains is Daniel's QA
pass across all changes, then the data migration.

---

*End of FOREMAN_REVIEW — P10_PRESALE_HARDENING*
*Next: Daniel QA on develop → P7 Prizma cutover decision*
