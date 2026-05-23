# CLOSURE_SPEC — M5_UI_CUSTOMER_CARD — 🟡 → 🟢

> **Location:** `modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_CARD/CLOSURE_SPEC.md`
> **Authored by:** opticup-strategic (Foreman, same Phase D folder)
> **Authored on:** 2026-05-23 (immediately post-Phase-D close)
> **Closes:** the 2 non-🟢 follow-ups from `FOREMAN_REVIEW.md` — **T11** (visual fidelity partial) + **F-T5-DESIGN** (dead Locked badge).
> **Brief:** `modules/Module 5 - Customers/architecture-brief/M5_UI_CUSTOMER_CARD_CLOSURE_BRIEF.md`

---

## 0. Pre-Authoring Reality Check

Build context loaded from the prior turn. localhost:3000 still up; Chrome tab still authenticated as demo employee "עובד בדיקה"; demo customer `8fcc5610-9cb8-42bc-8773-6122d6e0f962` ("דניאל לוי", lifecycle='prospect', 5 orders, 4 prescriptions) is the smoke target.

**Verified probes (pinned this seal):**
- `grep -n "Locked\|נעול" modules/customers/*.js` finds 2 surfaces: header pill (`customer-card-header.js:58`) + bottom flags row (`customer-card-tab-details.js:152-153`). The variable `isLocked` is declared at `customer-card-header.js:43` + `customer-card-tab-details.js:143`.
- `grep -n "locked\|is_deleted" modules/customers/customer-card-coming-soon.js` → 0 hits. **Locked is NOT a coming-soon registry entry** — clean removal, no registry change.
- Last close's TEST_REPORT.md: T11 was ⚠ PARTIAL (Chrome MCP `Page.captureScreenshot timed out` on full-page captures). Viewport JPEG captures succeeded. Per-tab JPEG is the proven technique.

**Lessons applied from FOREMAN_REVIEW.md (Phase D):**
- P-AUTHOR-2 (page-boot auth precondition) — N/A here, no new entrypoint.
- P-EXEC-2 (DB.* signature reference) — N/A, no DB writes this SPEC.
- F-T5-DESIGN — directly addressed by Item B.
- T11 — directly addressed by Item A.

**Cross-Reference Check (Step 1.5):** new names introduced by this SPEC = 0. Only deletions (Locked badge) + captures + docs updates. No collision risk.

**Runtime semantics rehearsed:** removing `isLocked` variable + its 2 render branches is a pure deletion in a DOM-template-string context. Post-removal, the header pill list contains: wired Inactive (if lifecycle='dormant'), VIP, club. Bottom flags row contains: Inactive (wired box), Subscription (blurred box) — NO Locked. Other badges unchanged.

---

## 1. Goal

Re-close the M5 customer card from 🟡 → 🟢 by (a) producing a clean visual-fidelity capture set across all 5 tabs against live demo data, and (b) removing the dead Locked badge (it's unreachable through any normal card load).

---

## 2. Background & Motivation

Phase D closed 🟡 CLOSED-WITH-FOLLOW-UPS in commit `0333cfc`. Two items remained: T11 visual fidelity was partial because of a screenshot tool timeout (capture-technique issue, NOT a code issue), and F-T5-DESIGN — the Locked badge is dead code because the card's views filter `is_deleted=false` so a deleted customer never loads → the badge cannot light up.

This SPEC clears both in one tight pass before Phase E starts. The render+action wiring pattern is destined to be copied by every later M5-M9 UI screen — closing the first-screen template cleanly to 🟢 means the copies inherit a clean pattern, not open corners.

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|---|---|---|
| 1 | Branch state | `develop`, clean for M5 paths after closure | `git status --short` shows only the closure files |
| 2 | Header pill `נעול`/Locked removed | `grep -n "Locked\|נעול" modules/customers/customer-card-header.js` → 0 hits (the doc comment on line 5 may stay but the render + the isLocked variable are gone) | grep |
| 3 | Bottom flags row Locked removed | `grep -n "Locked" modules/customers/customer-card-tab-details.js` → 0 hits (variable + render branch both gone) | grep |
| 4 | COMING_SOON_REGISTRY unchanged | `grep -n "locked" modules/customers/customer-card-coming-soon.js` → 0 hits (was already 0; verify it stays 0) | grep |
| 5 | Other badges intact | A11y snapshot of the card after Item B shows: Inactive (wired or absent depending on lifecycle), VIP (blurred), חבר-מועדון (blurred), Subscription (blurred, in bottom row), Queue block (blurred). Locked: absent. | Chrome MCP `take_snapshot` |
| 6 | Card boots clean post-removal | `take_snapshot` + `list_console_messages` after a hard reload → 0 console errors | Chrome MCP |
| 7 | Visual-fidelity set: 5 tabs captured | 5 JPEG files in `docs/specs/M5_UI_CUSTOMER_CARD/screenshots/closure/` covering Tab 1 (Details), Tab 2 (Vision stub), Tab 3 (Prescriptions w/ data), Tab 4 (Orders w/ 5 demo rows), Tab 5 (Docs — empty list after teardown) | `ls` |
| 8 | Per-tab mockup-vs-live note | TEST_REPORT.md §"T11 closure capture" gets a one-line note per tab + the JPEG filename | grep / view |
| 9 | Iron Rule 34 closure re-verified | TEST_REPORT.md T11 flips ⚠→✅; FOREMAN_REVIEW.md F-T5-DESIGN flips → RESOLVED | view |
| 10 | M5 ROADMAP Phase D | row reads `✅ 🟢` (was `✅ code-complete`) | grep |
| 11 | M5 SESSION_CONTEXT "what's next" | 2 future-wants documented (customer-lock + see-deleted/audit) | grep |
| 12 | TECH_DEBT (root or M5) | 2 entries logged for the 2 future-wants | grep |
| 13 | Integrity gate | exit 0 or 2 | `npm run verify:integrity` |
| 14 | Destructive Ops gate | passes — declared (badge UI deletion only) | pre-commit hook |
| 15 | No Prizma writes | no `customer_documents` row or `customers` UPDATE on Prizma | SQL probe at close |
| 16 | No schema change | no `apply_migration` calls during this SPEC | EXECUTION_REPORT |

### 3a. Functional smoke (light — Chrome MCP)

| # | Case | Status |
|---|---|---|
| C1 | Reload card on demo authenticated session → card boots, 5 tabs render, 0 console errors | — |
| C2 | Inspect badge row a11y snapshot → "Locked" / "נעול" not present; other badges present and unchanged | — |
| C3 | Click each of the 4 blurred badges (VIP, חבר-מועדון, Subscription, Queue) → each fires `showComingSoon` with its registered featureId | — |
| C4 | Per-tab viewport JPEG captures across Tab 1-5 → all save successfully (no timeout); each is checked against mockup for material drift | — |

### 3b. Iron Rule 34 closure (re-do)

Required artifacts attached to the updated TEST_REPORT.md + FOREMAN_REVIEW.md addendum:
1. 5 viewport JPEGs (one per tab) in `screenshots/closure/`.
2. Badge-row a11y snapshot proving Locked is gone + other badges unchanged.
3. Runtime re-check console-messages dump (0 errors).
4. Per-tab mockup-vs-live one-line note.

---

## 4. Autonomy Envelope

**Executor CAN:**
- Edit `customer-card-header.js` + `customer-card-tab-details.js` to remove the Locked badge (surgical deletion of the `isLocked` variable + the 2 render branches + the stale doc comment).
- Run Chrome MCP screenshots in JPEG viewport format (proven technique).
- Re-load the card, capture a11y snapshots, click through tabs.
- Update TEST_REPORT.md, FOREMAN_REVIEW.md (addendum), M5 SESSION_CONTEXT.md, M5 ROADMAP, TECH_DEBT.md.
- Selective `git add` by filename.

**Executor MUST STOP:**
- Mockup-vs-live diff surfaces STRUCTURAL drift (missing section, wrong layout, wrong tab order) → escalate, do NOT expand scope.
- Any code touch that changes behavior (e.g., reading from a different view, changing the auto-save flow) → escalate, this SPEC is delete-dead-UI + capture only.
- A console error appears on card boot after the Item-B edit → STOP and investigate.
- A Daniel-in-loop point surfaces that wasn't in the Brief.

---

## 5. Stop-on-Deviation (beyond CLAUDE.md §9 globals)

- `grep` after Item B shows Locked still present anywhere in the card JS → STOP, surface what was missed.
- Console errors on reload → STOP.
- Screenshot captures hit timeout AGAIN on the JPEG path → STOP, escalate (the capture technique that worked last time should work; if it doesn't, the harness has regressed).

---

## 6. Rollback Plan

Pure additive-deletion code change. Rollback = `git revert <commit>`. No DB writes to revert. Capture files in screenshots/ can be removed via `git rm`.

---

## Destructive Operations

This SPEC declares the following destructive-class operations per Iron Rule 32:

1. **Deletion of UI elements** in `customer-card-header.js` (the `isLocked` var declaration + the conditional render branch for the נעול pill + the stale Locked reference in the file's header comment).
2. **Deletion of UI elements** in `customer-card-tab-details.js` (the `isLocked` var declaration + the conditional render branch for the Locked flag in renderFlagsRow).
3. **In-place replace** of `TEST_REPORT.md` (flip T11 ⚠→✅; add closure capture section).
4. **In-place edit** of `FOREMAN_REVIEW.md` (addendum: F-T5-DESIGN → RESOLVED; closure verdict line).
5. **In-place edit** of M5 `SESSION_CONTEXT.md` (Phase D status → ✅ 🟢; "what's next" adds 2 future-wants).
6. **In-place edit** of `MODULE_5_ROADMAP.md` (Phase D row → ✅ 🟢).
7. **In-place edit** of `MASTER_ROADMAP.md` §3 row #5 (status line refresh).
8. **In-place edit** of `TECH_DEBT.md` (2 new entries — customer-lock + see-deleted/audit).

**NO DROP** of any table/column/policy/file. **NO TRUNCATE.** **NO DELETE** from any DB table. **NO `git reset --hard` / NO force push / NO main branch operations.**

---

## 7. Out of Scope (explicit)

- **Customer LOCK feature.** Distinct from soft-delete. Documented as TECH_DEBT only.
- **Include-deleted / audit mode.** Documented as TECH_DEBT only.
- **Any new badge** (don't replace Locked with something else).
- **Phase D's other closed-out items** — Tab 2 stub, blurred badges, edit-mode UX, page-boot auth — all untouched.
- **`customer_documents` column expansion** (F-2 still TECH_DEBT).
- **`orders.total_amount` aggregation view/RPC** (F-3 still TECH_DEBT).
- **`authReady()` helper extraction** (F-6 follow-up, still TECH_DEBT).
- **`js/shared-field-map.js` split** (F-8, still TECH_DEBT).
- **Tab 3 functional behavior** — the F-7 R/L double-prefix fix already landed in `0333cfc`; no further Tab 3 changes here.
- **Prizma writes.**
- **Merge to main.**

---

## 8. Expected Final State

### Modified files (surgical deletions + doc updates)
- `modules/customers/customer-card-header.js` — `isLocked` var + render branch removed. Header doc comment trimmed (drop the "Locked ↔ is_deleted" reference).
- `modules/customers/customer-card-tab-details.js` — `isLocked` var + Locked render branch in `renderFlagsRow()` removed.
- `modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_CARD/TEST_REPORT.md` — T11 ⚠→✅ with closure-capture section.
- `modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_CARD/FOREMAN_REVIEW.md` — addendum: F-T5-DESIGN → RESOLVED + closure verdict 🟢.
- `modules/Module 5 - Customers/docs/SESSION_CONTEXT.md` — Phase D status updated to ✅ 🟢; 2 future-wants added under "what's next".
- `modules/Module 5 - Customers/MODULE_5_ROADMAP.md` — Phase D row → ✅ 🟢.
- `MASTER_ROADMAP.md` §3 row #5 (Customers) — status line refreshed to reflect 🟢.
- `TECH_DEBT.md` (or M5-scoped equivalent) — 2 new entries.

### New files
- `modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_CARD/CLOSURE_SPEC.md` (this file).
- `modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_CARD/screenshots/closure/tab1_details.jpeg` through `tab5_docs.jpeg` (5 captures).

### DB state
- Unchanged. No DDL. No DML.

### Commits
- Commit A: `feat(m5d): remove dead Locked badge (F-T5-DESIGN resolution)`
- Commit B: `docs(m5d): T11 closure capture + close 🟢 — TEST_REPORT/FOREMAN_REVIEW/SESSION_CONTEXT/ROADMAP/MASTER_ROADMAP/TECH_DEBT + CLOSURE_SPEC + 5 fidelity JPEGs`

---

## 9. Dependencies / Preconditions

- Phase D closed 🟡 (commit `0333cfc`) — verified at SPEC seal.
- localhost:3000 still running from the prior session.
- Demo authenticated session still active in the Chrome tab.
- Chrome MCP screenshot tool — JPEG viewport path is the canonical technique (proved last close).

---

## 10. Pre-Merge Checklist

- [ ] All 16 §3 success criteria pass.
- [ ] All 4 §3a smokes (C1-C4) PASS.
- [ ] Iron Rule 34 §3b closure evidence attached.
- [ ] Integrity Gate exit 0 or 2.
- [ ] `git status --short` shows only files in §8.
- [ ] HEAD pushed to `develop`.
- [ ] No Prizma writes / no schema change / no merge to main.
- [ ] FOREMAN_REVIEW addendum carries 1 author + 1 executor improvement proposal harvested from this closure (smaller scope — 2-each rule relaxed for closure SPECs).

---

*End of CLOSURE_SPEC. Tight. Demo only. Chrome MCP closure mandatory. No merge to main.*
