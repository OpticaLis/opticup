# FOREMAN_REVIEW — P8_AUTOMATION_ENGINE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P8_AUTOMATION_ENGINE/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-22
> **Reviews:** `SPEC.md` (author: opticup-strategic / Cowork session happy-elegant-edison, 2026-04-22) + `EXECUTION_REPORT.md` (executor: opticup-executor / Claude Code Windows desktop) + `FINDINGS.md` (5 findings)
> **Commit range reviewed:** `15ca2f6..675420a` (9 commits)

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS**

34/34 success criteria passed. Zero mid-execution stops. The automation engine
works end-to-end: 10 rules seeded on demo, both trigger points (event status
change, registration) delegate to `CrmAutomation.evaluate`, message log enriched
with lead/phone/template, per-lead history tab populated. Rule 12 proactively
managed (broadcast split to avoid ceiling breach). 5 findings — 1 architectural
(lead-intake EF split-brain), 3 UX (sort_order, WhatsApp guard, template name),
1 schema ergonomics. The 🟡 is driven by 2 follow-ups that need separate SPECs
(lead-intake EF refactor, sort_order control) and MODULE_MAP.md remaining stale
(pre-existing M4-DOC-06, not caused by P8 but still undone).

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | Two-paragraph goal covering both engine and log improvements. Execution order explicit (P6→P8→P7). |
| Measurability of success criteria | 5 | 34 criteria, each with expected value + verify command. Most comprehensive build SPEC in the Go-Live series. |
| Completeness of autonomy envelope | 5 | Pre-authorized the broadcast split (§4 + §13 risk table). Covered Level 2 SQL for seed. 6 explicit stop triggers. The `buildEventVariables` "keep" guidance was overridden by the executor (deviation #4) — but this was the right call, and the envelope didn't REQUIRE keeping it (soft guidance, not hard constraint). |
| Stop-trigger specificity | 5 | 6 specific triggers. Phone-number trigger (#4) continues the P5.5 iron-clad discipline. DDL stop (#1) correctly prevented schema creep. |
| Rollback plan realism | 4 | Code rollback via `git revert` is straightforward. Seed rollback via `DELETE WHERE name LIKE 'P8:%'` — but the actual seeded rule names don't have a "P8:" prefix. The executor would need to delete by `created_at` range or list all 10 names. Functional but imprecise. |
| Expected final state accuracy | 3 | Three line-count misses (event-actions 236→341, broadcast 318→348, leads-detail 216→295) — same systemic Cowork-can't-measure pattern from P5.5/P6. One design miss: "keep `buildEventVariables`" — executor correctly removed it (Rule 21 took precedence). One implicit change not called out: `template_id` → `template_slug` migration in action_config shape. Commit count inconsistency (§3 says "6–8", §9 details 9). |
| Commit plan usefulness | 4 | 9 commits mapped 1:1 to delivered commits. Clean single-concern grouping. Half point off for the §3 vs §9 count inconsistency that forced the executor to reconcile. |

**Average score:** 4.4/5.

**Weakest dimension:** Expected final state accuracy (3/5). Three root causes:
(1) Cowork line-count drift — 5th occurrence in the Go-Live series, now a proven
systemic gap. (2) Design-level "keep X" guidance that didn't survive contact
with the actual engine architecture. (3) Implicit data-shape change
(`template_id` → `template_slug`) that the SPEC's §12 technical design described
but §8 Expected Final State didn't call out as a migration concern.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 5 | All 34 criteria delivered. 5 deviations documented with reasoning — 4 code, 1 commit count. No scope creep. The `buildEventVariables` removal and broadcast split were both defensible judgment calls within the autonomy envelope. |
| Adherence to Iron Rules | 5 | All files ≤350 (Rule 12). Rule 21 applied proactively (orphan removed). Rule 22 defense-in-depth on every query. Approved-phone discipline perfect. No secrets. |
| Commit hygiene | 5 | 9 commits matched §9 plan exactly (including retro). Each single-concern. Explicit `git add` by filename. Commit 5 bundled 3 related modal changes — justified: splitting would have left intermediate-broken UI states. Best commit hygiene in a build SPEC this large. |
| Handling of deviations | 5 | 5 deviations documented in §3 with reasoning. Zero silent absorption. The `buildEventVariables` removal (deviation #4) explicitly cited Rule 21 as the governing principle over SPEC "keep" guidance — textbook prioritization. |
| Documentation currency | 4 | SESSION_CONTEXT.md + ROADMAP.md comprehensive (commit `4b793a1`). MODULE_MAP.md still stale — pre-existing (M4-DOC-06), explicitly deferred to Integration Ceremony in SPEC §7. Not a P8 failure, but it means P8 added 2 new files (engine, log) that aren't in MODULE_MAP yet. |
| FINDINGS.md discipline | 5 | 5 findings logged, all correctly categorized (1 architecture, 3 UX, 1 schema). Severity assessments are honest — MEDIUM for the split-brain architectural issue, LOW/INFO for UI polish. Each has reproduction steps and out-of-scope rationale. |
| EXECUTION_REPORT honesty + specificity | 5 | Self-assessment 9.2/10 — fair and accurate. "What Would Have Helped" has 5 specific items that all trace to real friction. Two executor proposals are concrete and actionable. DB pre-flight check log is the most thorough in the series — 6 explicit verification queries. |

**Average score:** 4.9/5.

**Did executor follow the autonomy envelope correctly?** YES — zero stops, zero
unnecessary questions. All 5 deviations were within the envelope's bounds (line
counts marked ⚠️ UNVERIFIED, split pre-authorized, Rule 21 override of soft
guidance). This is the best autonomy discipline in a Go-Live SPEC to date.

**Did executor ask unnecessary questions?** Zero. Daniel authorized option (c) for
pre-existing changes at session start — that was the only interaction.

**Did executor silently absorb any scope changes?** No. The `template_id` →
`template_slug` migration (decision #2) could be considered scope expansion, but
it was a necessary consequence of the SPEC's own `action_config` design (§14)
meeting the existing UI's data shape. Documented in §4 Decision #2.

---

## 4. Findings Processing

| # | Finding | Code | Severity | Disposition | Action |
|---|---------|------|----------|-------------|--------|
| 1 | `lead-intake` EF dispatches server-side, can't be rule-driven from client engine | M4-DEBT-P8-01 | MEDIUM | TECH_DEBT | Genuine architectural split-brain. Low urgency — the EF dispatch and client rules fire at different trigger points (no double-send), and lead-intake volume is low. But the mental model ("I disabled the rule, why are messages still going?") will confuse Daniel post-Prizma. Queue for a future SPEC after P7: either port engine to Deno/TS for EF use, or have EF skip dispatch and let client fire when lead surfaces. |
| 2 | `crm_message_templates` has no `base_slug` column — engine derives by string manipulation | M4-SCHEMA-P8-02 | LOW | DISMISS | No bug today — all templates follow the naming convention. The `baseSlugsFromTemplates()` helper works. A `base_slug` generated column would be cleaner but is a DDL change with no functional benefit now. Revisit if template naming becomes freeform (unlikely before P7). |
| 3 | Rules UI has no `sort_order` control | M4-UX-P8-03 | LOW | TECH_DEBT | Real gap — new rules get `sort_order: 0` silently. No overlapping rules today, but will matter as Daniel creates custom rules. Add to go-live follow-ups. Tiny SPEC: add a number input to the rule edit modal. |
| 4 | Broadcast wizard WhatsApp channel guard (continuation of M4-UX-P6-03) | M4-UX-P8-04 | LOW | DISMISS | Pre-existing, already tracked under M4-UX-P6-03 from P6 Foreman Review. SPEC §7 explicitly deferred. No new information from P8. |
| 5 | Template dropdown shows first-seen name (SMS variant wins) | M4-UX-P8-05 | INFO | TECH_DEBT | 2-line fix: strip channel suffix from display name in `baseSlugsFromTemplates()`. Too small for a SPEC — bundle into next rules-UI touch or Integration Ceremony. |

**Zero findings left orphaned.**

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| "crm-automation-engine.js 225 lines" | ✅ | `git show 675420a:modules/crm/crm-automation-engine.js \| wc -l` → 225 |
| "crm-event-actions.js 341→287, `buildEventVariables` removed" | ✅ | `git show 675420a:... \| wc -l` → 287. `grep -c buildEventVariables` → 0. `grep CrmAutomation.evaluate` → hit. |
| "crm-messaging-broadcast.js 348→251, split to crm-messaging-log.js 151" | ✅ | `git show 675420a:... \| wc -l` → 251 (broadcast), 151 (log). Both confirmed. |
| "SESSION_CONTEXT.md shows P8 CLOSED" | ✅ | `git show 675420a:...SESSION_CONTEXT.md \| grep P8` → "Go-Live P8 (Automation Engine — Level 1) — ✅ CLOSED" |
| "9 commits produced (15ca2f6..675420a)" | ✅ | `git log --oneline 15ca2f6^..675420a` → 9 commits, hashes match report. |

All 5 spot-checks passed. No 🔴 trigger.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — SPEC §3 and §9 must agree on commit count

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → Step 3 (Populate SPEC.md), under the commit plan guidance
- **Change:** Add:
  > "The §3 measurable criterion for 'commits produced' MUST match the §9
  > commit plan count exactly (or cite §9's count). Never use a different
  > range in §3 than what §9 details. If §9 says '9 commits (±2 fix = max 11)',
  > then §3 must say '7–11 commits' or '9 commits (per §9)' — not '6–8'.
  > The executor resolves ambiguity by following §9 (the detailed plan), but
  > the inconsistency creates unnecessary deliberation."
- **Rationale:** P8 SPEC §3 criterion #34 said "6–8 commits" while §9 detailed 9 commits including the retrospective. Executor correctly followed §9 but had to reconcile the discrepancy. This is the second internal-inconsistency finding (after P6's HTTP-code mismatch).
- **Source:** EXECUTION_REPORT §5 bullet 1, §3 Deviation #5.

### Proposal 2 — SPEC must explicitly flag data-shape migrations in action_config / JSONB columns

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" → Step 3 (Populate SPEC.md), under the expected-final-state guidance
- **Change:** Add:
  > "When a SPEC changes the expected shape of a JSONB column (e.g., migrating
  > `action_config` from `{template_id: UUID}` to `{template_slug: string}`),
  > §8 Expected Final State must explicitly call out the migration: what the
  > old shape was, what the new shape is, and whether existing rows need
  > data migration (or not, and why). The §12 Technical Design may describe
  > the new shape, but §8 is where the executor looks for 'what changes' —
  > an implicit shape change buried in §12 costs discovery time.
  > Example: 'action_config migrates from template_id (FK UUID) to
  > template_slug (base string). 0 existing rules on demo → no data
  > migration needed.'"
- **Rationale:** P8 SPEC §12/§14 described the `template_slug` action_config shape, but §8 didn't call out that the existing B5 UI stored `template_id`. Executor discovered the migration need at implementation time (decision #2, §5 bullet 4). A §8 line would have saved 5 minutes.
- **Source:** EXECUTION_REPORT §4 Decision #2, §5 bullet 4.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Pre-flight `information_schema.columns` check should include nullable + NOT NULL verification

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"SPEC Execution Protocol" Step 1.5 DB Pre-Flight Check
- **Change:** Accept executor's own Proposal 1 verbatim:
  > "When the SPEC provides INSERT SQL, run:
  > ```sql
  > SELECT column_name, is_nullable, column_default FROM information_schema.columns
  > WHERE table_name = '<target>' ORDER BY ordinal_position;
  > ```
  > Cross-check the INSERT column list against the result: (a) every column
  > in the INSERT exists; (b) every `is_nullable = 'NO'` column without a
  > default appears in the INSERT. If either check fails, STOP and report."
  **Accepted as proposed.** This upgrades the existing "re-read the target
  table's schema" bullet from a vague instruction to a concrete 2-point
  pass/fail check.
- **Rationale:** P8 seed SQL passed verification, but the existing wording was imprecise for SPEC-provided INSERTs (vs code-existing INSERTs). Making NOT NULL + existence explicit prevents future edge cases.
- **Source:** EXECUTION_REPORT §9 Proposal 1.

### Proposal 2 — Document "split pre-authorized" as a do-without-asking pattern

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Autonomy Playbook — Maximize Independence"
- **Change:** Accept executor's own Proposal 2 verbatim:
  > | File about to exceed Rule 12 ceiling (350 lines) | If SPEC §4 autonomy
  > envelope pre-authorizes splitting (or is silent on splits), plan the split
  > BEFORE the commit that would exceed 350. Pick a natural logical boundary.
  > Commit with: "feat(X): Y — also split Z into W.js for Rule 12". Do not ask
  > Foreman — a pre-authorized split with a clear rationale is within the
  > envelope. |
  **Accepted as proposed.** The broadcast→log split in P8 was textbook: the
  SPEC pre-authorized it, the executor found a clean boundary, and no stop
  was needed. Codifying this pattern prevents future executors from stopping
  unnecessarily on splits.
- **Rationale:** P8 commit 6 split `crm-messaging-broadcast.js` (348→251) into `crm-messaging-log.js` (151). SPEC §4 pre-authorized, but the playbook didn't list file splits as an explicit "do without asking" case.
- **Source:** EXECUTION_REPORT §9 Proposal 2, §4 Decision #3.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | Follow-up needed |
|-----|--------------------------|---------|------------------|
| `MASTER_ROADMAP.md` §3 Current State | NO — P8 is a Go-Live sub-phase, not a module milestone | N/A | — |
| `docs/GLOBAL_MAP.md` | NO — deferred to Integration Ceremony (SPEC §7, M4-DOC-06) | N/A | Pre-existing staleness. P8 added `CrmAutomation` namespace (1 new file, 3 exported functions). Must be added at Integration Ceremony. |
| `docs/GLOBAL_SCHEMA.sql` | NO — no schema changes | N/A | — |
| Module's `SESSION_CONTEXT.md` | YES | YES ✅ | Comprehensive P8 phase history entry in commit `4b793a1`. Includes full technical description, follow-ups, and updated roadmap line. |
| Module's `ROADMAP.md` (go-live) | YES | YES ✅ | P8 ✅ in commit `4b793a1` |
| Module's `MODULE_MAP.md` | YES (2 new files added: `crm-automation-engine.js`, `crm-messaging-log.js`) | NO ❌ | Pre-existing staleness (M4-DOC-06). P8 explicitly deferred to Integration Ceremony in SPEC §7. Verdict capped at 🟡 per hard-fail rule. |
| Module's `CHANGELOG.md` | OPTIONAL | N/A | — |

**Note:** MODULE_MAP.md not updated — this is a pre-existing debt item (M4-DOC-06),
not a P8 failure. The SPEC explicitly placed it out of scope. However, per the
hard-fail rule, "should have been updated = YES" + "was it = NO" caps the verdict
at 🟡 regardless of cause. This is intentional — the mechanism exists to prevent
drift accumulation, even when each individual SPEC reasonably defers it.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> P8 הושלם — מנוע האוטומציה עובד: 10 חוקים מוגדרים ב-CRM שמחליפים את כל הלוגיקה הקשיחה מ-P5.5, אפשר ליצור/לערוך/לכבות חוקים מה-UI בלי מפתח. ה-log של ההודעות שודרג עם שם ליד, טלפון, תוכן מלא בלחיצה, והיסטוריית הודעות לכל ליד עובדת. P7 (העברה לפריזמה) מוכן להתחיל כשתאשר — יש 3 פריטי מעקב קטנים שלא חוסמים.

---

## 10. Followups Opened

| # | Artifact | Source | Action |
|---|----------|--------|--------|
| 1 | `lead-intake` EF rule-engine integration (M4-DEBT-P8-01) | Finding #1 | Future SPEC after P7 — port engine to server-side or have EF defer dispatch to client. Not blocking P7 (no double-send, different trigger points). |
| 2 | Rules UI `sort_order` control (M4-UX-P8-03) | Finding #3 | Tiny SPEC — add number input to rule edit modal. Can bundle with Integration Ceremony. |
| 3 | Template dropdown name cleanup (M4-UX-P8-05) | Finding #5 | 2-line fix, bundle into next rules-UI touch. |
| 4 | MODULE_MAP.md update for 2 new files (M4-DOC-06 continuation) | §8 checklist | Add `crm-automation-engine.js` and `crm-messaging-log.js` at Integration Ceremony. |
| 5 | Author skill: §3/§9 commit-count consistency | §6 Proposal 1 | Apply to opticup-strategic SKILL.md — next SPEC authoring session. |
| 6 | Author skill: JSONB data-shape migration in §8 | §6 Proposal 2 | Apply to opticup-strategic SKILL.md — next SPEC authoring session. |
| 7 | Executor skill: NOT NULL + existence check for SPEC INSERTs | §7 Proposal 1 | Apply to opticup-executor SKILL.md — next executor session. |
| 8 | Executor skill: split pre-authorized pattern in autonomy playbook | §7 Proposal 2 | Apply to opticup-executor SKILL.md — next executor session. |

**No code-change follow-ups blocking P7.** All 8 items are process improvements, documentation updates, or post-P7 architectural work.
