# FOREMAN_REVIEW — M4_RAW_SB_WRAPPER_MIGRATION_PHASE_1

> **Written by:** opticup-strategic (Foreman, overnight Pipeline coordinator)
> **Commits reviewed:** `77c1837` + `50b0fc9` (retrospective lands with this file)

---

## 1. Verdict

🟢 **CLOSED.** Third SPEC of the overnight run delivered. 7 of 8 raw `sb.from()` chains migrated to canonical `DB.*` wrapper across the 3 most-frequently-loaded CRM files. 1 SKIPped (move-lead handler with `.maybeSingle()`) and properly logged for Phase 2. Pre-existing `wireEvents` rule-21 duplicate resolved as side-quest. Iron-Rule-12 cap held. All gates clean. Module-wide bypass count: 136 → 129.

## 2. SPEC quality: 4.8/5

Strong §0 baselines (live grep counts captured). §3 success criteria include the right balance of mechanical (grep counts, file sizes) and semantic (1:1 translation diff). Brief §4.4 premise drift caught and documented (30-40 estimate vs 8 reality).

## 3. Execution quality: 4.8/5

The mid-execution `wireEvents` rename was a judicious decision — caught a pre-existing hygiene gap that would have re-fired on every future SPEC touching both files. Decision 3 (trimming multi-line comments to keep crm-leads-tab.js under the Iron Rule 12 cap) was correctly applied. The SKIP discipline on call site #6 is faithful to the SPEC even though the executor noted in EXECUTION_REPORT §4 Decision 2 that migrating it via `limit:1` array form would have been feasible.

## 4. Findings (3)

| # | Summary | Disposition |
|---|---------|-------------|
| 1 | `wireEvents` duplicate in 2 files (pre-existing rule-21) | RESOLVED — renamed in this SPEC |
| 2 | `DB.select` wrapper has no `.maybeSingle()` option | TECH_DEBT `M4-DEBT-WRAPPER-PHASE-2-MAYBESINGLE`; Phase 2 follow-up |
| 3 | Brief 30-40 estimate vs 8 actual in target files | Documented; Phase 2 picks up the next 30-40 calls in other files |

## 5. Spot-check

| Claim | Verified |
|-------|----------|
| `crm-helpers.js` actual code `sb.from(` count = 0 | ✅ |
| `crm-leads-tab.js` actual code `sb.from(` count = 1 (SKIP) | ✅ |
| `crm-events-tab.js` actual code `sb.from(` count = 0 | ✅ |
| File sizes (270/348/165) all ≤ 350 | ✅ |
| Both `wireEvents` renamed correctly (2 occurrences each) | ✅ |
| rule-21-orphans + rule-31 + rule-32 gates clean on commits | ✅ |

## 6. Author-skill improvement proposals (opticup-strategic)

### Proposal 1 — SPEC pre-flight should grep for pre-existing rule-21 candidates in target files

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` Step 1 pre-flight.
- **Change:** "When a SPEC's expected commit-set will stage ≥2 files of similar purpose (e.g., sibling modules `crm-leads-tab.js` + `crm-events-tab.js`), run `grep -hE 'function (\\w+)' <files>` and look for cross-file duplicates BEFORE authoring. Surface in SPEC §0 as a 'pre-existing-duplicates' table with a per-name disposition: (a) rename in-scope, (b) leave + split commits, (c) escalate."
- **Rationale:** This SPEC hit the wireEvents duplicate at first commit attempt. Pre-flight detection would have let the SPEC author the rename plan upfront.
- **Source:** Decision 1 + Finding #1.

### Proposal 2 — Brief-vs-reality grep should run at SPEC authoring, not Executor pre-flight

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` Step 1.
- **Change:** "When Brief gives a quantitative scope estimate (e.g., '30-40 calls', '5-10 files'), the Foreman MUST grep-verify at SPEC authoring time and adjust the SPEC's success criteria to literal-scope numbers. Document the estimate-vs-actual delta in §0 'Brief-premise drift' table."
- **Rationale:** Brief's 30-40 vs actual 8 was caught in pre-flight but only documented as a finding, not as a SPEC criterion adjustment. Future SPECs benefit from earlier reality-binding.
- **Source:** Finding #3.

## 7. Executor-skill improvement proposals (opticup-executor)

### Proposal 1 — When inline comments push a file over Iron Rule 12, drop them before considering other code structure changes

- **Where:** `.claude/skills/opticup-executor/SKILL.md` Iron Rule 12 handling.
- **Change:** "When a refactor lands a file 1-15 lines over the 350 cap, the FIRST trim target is migration-attribution comments. Default to no comments per CLAUDE.md; the SPEC's CHANGELOG + EXECUTION_REPORT already document the migration."
- **Rationale:** Decision 3 trimmed comments to get under cap. Codifying this avoids the next executor reaching for other structure changes (which would create real refactor risk).
- **Source:** Decision 3.

### Proposal 2 — When a hook fires on a pre-existing violation that the SPEC's edits surface, prefer in-scope fix over commit-splitting

- **Where:** `.claude/skills/opticup-executor/SKILL.md` Pre-commit hook handling.
- **Change:** "If a pre-commit hook (rule-21, rule-22, rule-23, etc.) fires on a pre-existing violation that the SPEC's edits did NOT introduce but DID surface (e.g., staging two files together exposes a cross-file duplicate that prior commits' single-file scope never staged), the canonical resolution is: (a) fix the pre-existing violation in this SPEC's scope, (b) document as a 'side-quest' finding, (c) keep the SPEC's commit budget (1-3 commits typical) by bundling the fix into the SPEC's first commit. Splitting into multiple commits to dodge the hook is allowed but should be a fallback when the fix itself is risky."
- **Rationale:** Decision 1 chose the in-scope rename — cleaner than commit-splitting. Codifying gives future executors a clear preference.
- **Source:** Decision 1.

## 8. Master-doc checklist

All required: ✓. Phase 2 TECH_DEBT entries (`M4-DEBT-WRAPPER-PHASE-2-MAYBESINGLE`) dispositioned to next M4 hygiene SPEC.

## 9. Daniel-Facing Summary (Hebrew)

> SPEC #4 סגור. 7 מתוך 8 קריאות `sb.from()` ב-3 קבצי CRM הפופולריים הוחלפו בעטיפת `DB.*` הסטנדרטית של הפרוייקט (Iron Rule 7). מספר הקריאות הגולמיות במודול ירד מ-136 ל-129. קריאה אחת לא הומרה (`.maybeSingle()` שאין לעטיפה — Phase 2). תוקנה גם כפילות `wireEvents` קדמונית שהיגרה את בודק rule-21 כשהקבצים נסטייגו ביחד. אין שינוי התנהגותי, אין כתיבות ל-DB. סטטוס: 🟢.

## 10. Followups

- `M4-DEBT-WRAPPER-PHASE-2-MAYBESINGLE` — Phase 2 migrates the SKIP'd call site via `limit:1` array form OR wrapper extension.
- Phase 2 SPEC: target the next 30-40 raw `sb.from()` calls in `crm-leads-detail.js`, `crm-events-detail.js`, `crm-event-day-manage.js`, `crm-messaging-broadcast.js` (next most-frequently-loaded files).
- 2 author-skill proposals queued.
- 2 executor-skill proposals queued.

*End of FOREMAN_REVIEW.*
