# VISUAL_FIDELITY_GATE — Foreman Review

> **Role:** opticup-strategic (Foreman, post-execution review)
> **Authored:** 2026-05-23
> **Subject:** SPEC + EXECUTION_REPORT + FINDINGS + TEST_REPORT + REVIEW for `VISUAL_FIDELITY_GATE`.

## SPEC quality audit

- **Measurable success criteria?** Yes — 15 criteria with exact expected values. All hit or have a finding.
- **Stop triggers clear?** Yes — §5 enumerated 3 specific. None fired (the CSS var fix landed cleanly post-Step-0-probe).
- **Autonomy envelope appropriate?** Yes — surgical 1-block CSS edit + append-only governance edits. No schema, no logic, no Prizma.
- **What the SPEC missed:** the Brief said "no CSS link". My SPEC §0 immediately corrected this with the probes — the actual root cause is variable-scope. The SPEC could have surfaced this in §1 Goal text but the §0 correction is sufficient.

## Execution quality audit

- **Followed the SPEC?** Yes. Surgical CSS edit; append-only governance edits; comparison tables produced for both card + list with honest 🟡 verdicts.
- **Spot-checks (3 of largest claims):**
  1. **"All Hybrid+Navy tokens resolve post-fix"** — verified by re-running Step 0 probes after the edit. body bg `rgb(250,250,247)` (--bg-page), card bg `rgb(255,255,255)` (--bg-surface), header bg `rgb(30,58,138)` (--accent). All correct.
  2. **"opticup-localhost-tester SKILL appended-only (no deletion)"** — verified by `tail` showing the new "Visual-Fidelity Gate (MANDATORY BLOCKING)" section ADDED after the pre-existing Tier C / Mockup Fidelity Check sections. No removal.
  3. **"Screenshots delivered to Daniel"** — verified by SendUserFile tool result (5 files delivered, file_uuids returned).
- **Self-assessment accuracy:** Executor scored 9/10/9/9. Foreman concurs.

## Iron Rule 34 closure evidence — embedded (per the new gate)

**Card mockup-vs-live comparison table** (from TEST_REPORT.md §"Step 2 — Mockup-vs-live 1:1 comparison" — Card):

| # | Region | Match | Severity | Classification |
|---|---|---|---|---|
| 1 | Card frame | ✅ | — | 1:1 |
| 2 | Header bar (Navy bg) | ✅ | — | 1:1 |
| 3 | Header avatar | ✅ | — | 1:1 |
| 4 | Header name + age | ⚠ | LOW | SCHEMA-BLOCKED (birth_date NULL) |
| 5 | Header meta line | ⚠ | LOW | FEATURE-BLOCKED (M7/M11) |
| 6 | Header pills | ✅ | — | INTENTIONAL (D-BADGES) |
| 7-10 | Buttons / tabs / col-3 / personal | ✅ | — | 1:1 |
| 11 | Address block 5→2 rows | ⚠ | MEDIUM | SCHEMA-BLOCKED (F-CARD-ADDRESS-SCHEMA) |
| 12 | Contact block 4→2 rows | ⚠ | LOW | SCHEMA-BLOCKED (F-CARD-CONTACT-SCHEMA) |
| 13-14 | col-2 / business notes | ✅ | — | 1:1 |
| 15 | Additional info 4→3 rows | ⚠ | LOW | SCHEMA-BLOCKED (F-CARD-DISCOUNT-GROUP-SCHEMA) |
| 16-17 | Medical / queue | ✅ | — | 1:1 + INTENTIONAL |
| 18-19 | Bottom flags + autosave | ✅ | — | INTENTIONAL (Locked removed CLOSURE_SPEC) |

Card verdict: 🟡 — Tokens + structure 1:1 post-fix; 3 schema-blocked drift rows.

**List mockup-vs-live comparison table** (from TEST_REPORT.md — List Sketch 2):

| # | Region | Match | Severity | Classification |
|---|---|---|---|---|
| 1-3 | Layout / sidebar bg / quick-actions | ✅ | — | 1:1 + INTENTIONAL coming-soon |
| 4 | Sidebar customer-filter group | ✅ | — | 1:1 structurally |
| 5 | Sidebar counts | ⚠ | INFO | INTENTIONAL — live data vs mockup demo numbers |
| 6-9 | Module links / footer / toolbar / pills | ✅ | — | 1:1 + INTENTIONAL coming-soon |
| 10 | Results header | ⚠ | LOW | INTENTIONAL — Excel coming-soon |
| 11 | Row column count (mockup 7 → live 5) | ⚠ | MEDIUM | SCHEMA-BLOCKED / FEATURE-BLOCKED (F-LIST-ASPIRATIONAL-COLUMNS) |
| 12 | Row actions (mockup 3 → live 1) | ⚠ | LOW | FEATURE-BLOCKED |
| 13-14 | Row hover / lifecycle pill | ✅ | — | 1:1 + INTENTIONAL |

List verdict: 🟡 — Layout 1:1; row content reduced due to documented schema/feature gaps.

**Screenshots embedded:**
- Card BEFORE fix: `modules/Module 1.5 - Shared Components/docs/specs/VISUAL_FIDELITY_GATE/screenshots/card_live_before.jpeg`
- Card AFTER fix: `screenshots/card_live_after.jpeg`
- Card mockup Tab 1: `screenshots/card_mockup_tab1.jpeg`
- List live: `screenshots/list_live.jpeg`
- List mockup Sketch 2: `screenshots/list_mockup_sketch2.jpeg`

All 5 sent to Daniel via SendUserFile for direct visual review BEFORE Foreman wrote this verdict (Architect-relay rule honored).

## Findings processing

| # | Severity | Decision |
|---|---|---|
| F-VFG-1 (CSS vars empty) | HIGH | Resolved in this SPEC's commit 1 (`css/customers.css`). |
| F-VFG-2 (gate not enforced) | HIGH | Resolved structurally in this SPEC's commit 2 (4 governance file edits). |
| F-CARD-ADDRESS-SCHEMA | MEDIUM | TECH_DEBT — future schema-expansion SPEC. Bundle with F-CARD-CONTACT-SCHEMA + F-CARD-DISCOUNT-GROUP-SCHEMA. |
| F-CARD-CONTACT-SCHEMA | LOW | TECH_DEBT — bundled. |
| F-CARD-DISCOUNT-GROUP-SCHEMA | LOW | TECH_DEBT — bundled with M13 Loyalty / discount groups concern. |
| F-LIST-ASPIRATIONAL-COLUMNS | MEDIUM | TECH_DEBT — same as Phase E F-LIST-MOCKUP-COLUMNS (already logged). |

No reopener-class findings.

## 2 author + 2 executor improvement proposals harvested

**Author (opticup-strategic):**

### P-AUTHOR-7 — Make the Visual-Fidelity Gate's invocation explicit in every UI SPEC's Pre-Merge Checklist

**Symptom:** the existing Tier C section in opticup-localhost-tester was present but never invoked during Phase D + E because the Foreman closure checklist didn't require it. This SPEC fixed the Foreman SKILL to require it, but per-SPEC visibility could be stronger.

**Proposed change:** Update `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §12 Pre-Merge Checklist with a new boilerplate item for UI SPECs:

> - [ ] **Visual-Fidelity Gate (UI SPECs):** TEST_REPORT contains a `## Localhost-Tester Visual-Fidelity Gate` section with Step 0 styled-check + stylesheet-link audit + region-by-region comparison table + per-surface verdict. The table is also embedded in FOREMAN_REVIEW.md (the Architect reads it there).

**Acceptance:** next UI SPEC author copies this line into §12 verbatim.

### P-AUTHOR-6 — Architect-relay rule (already harvested in EXECUTION_REPORT)

The Architect never relays UI 🟢 to Daniel from a text claim; closure requires looking at the embedded screenshot. Logged for next architect-skill sweep.

**Executor (opticup-executor):**

### P-EXEC-6 — CSS-variable existence check in Step 1.5 (already harvested)

`grep -oE 'var\(--[a-z0-9_-]+'` in new CSS files; cross-reference against `:root` declarations in shared/css/variables.css + page-scope blocks; missing variable → 🔴.

### P-EXEC-7 — Localhost-Tester invocation as a separate dispatch step (don't inline)

**Symptom:** Phase D + E inlined Chrome MCP smokes inside the Executor's own work. The Localhost-Tester role never ran as a separate gate. Paperwork-PASS slipped through because nobody outside the Executor inspected the screenshots.

**Proposed change:** Add to `opticup-executor` SKILL.md a new "When NOT to inline Chrome MCP smoke" sub-section:

> **Visual-Fidelity Gate dispatch (added 2026-05-23 from VISUAL_FIDELITY_GATE SPEC):** when a SPEC touches a browser-consumed `.html` / `.js` / `.css`, the Executor's Chrome MCP smoke is necessary but NOT sufficient closure. The Executor MUST dispatch the Localhost-Tester as a SEPARATE step before the Foreman closes. The Tester runs Step 0 first-load styled-check + Step 1 stylesheet-link audit + Step 2 mockup-vs-live comparison and writes either a `LOCALHOST_TESTER_REPORT.md` (preferred) or appends a `## Localhost-Tester Visual-Fidelity Gate` section to TEST_REPORT.md. Without this section, Foreman cannot 🟢.

**Acceptance:** next UI SPEC dispatches the Tester as a separate step and produces the section.

## Master-doc update checklist

| File | Status |
|---|---|
| `MASTER_ROADMAP.md` | N/A — no module phase status change (this is a governance SPEC). |
| `docs/GLOBAL_MAP.md` | N/A — no new contracts. |
| `docs/GLOBAL_SCHEMA.sql` | N/A — no schema change. |
| `CLAUDE.md` Iron Rule 34 | ✅ Strengthened. |
| 4 SKILL.md files (opticup-localhost-tester / opticup-strategic / opticup-reviewer / + future architect via P-AUTHOR-6) | ✅ Edited (architect deferred to skill-sweep). |
| `modules/Module 5 - Customers/docs/SESSION_CONTEXT.md` | ✅ Will be edited at close — fidelity-gate addendum. |
| `modules/Module 5 - Customers/docs/CHANGELOG.md` | ✅ Will be edited at close — fidelity addendum entry. |

## Verdict

🟢 **CLOSED.**

Two outcomes shipped:
1. **Durable gate in place** — `opticup-localhost-tester` now owns a hard, blocking Visual-Fidelity Gate. CLAUDE.md Iron Rule 34 tightened. Foreman + Reviewer skills both require the gate's output. A UI SPEC that lacks the comparison table is REOPEN, not 🟢.
2. **M5 card + list re-verified** with the new gate — root-cause CSS-variable bug fixed; computed styles confirm Hybrid+Navy tokens resolve; region-by-region tables prove structural 1:1 with documented schema-blocked drift rows. Honest 🟡 verdicts on the surfaces (not paperwork-PASS 🟢).

The team can no longer close a UI screen with bare paperwork. Next UI SPECs (M6/M7/M8/M9 when they ship) inherit this enforcement automatically.
