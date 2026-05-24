# Brief — M6 Prescription Editor: Exhaustive QA Sweep + Fix-as-you-go

> **Author:** opticup-architect (Cowork), 2026-05-25. **Module:** 6 (Prescriptions).
> **Trigger:** M6 editor is feature-complete + merged. Before moving to M7, Daniel wants a hardened QA
> pass that exercises EVERY flow and scenario in M6 on demo, fixes anything broken in-place, and keeps
> all test data for his own review.
> **Mode (Daniel-approved):** fix-as-you-go — when a scenario is broken, fix it immediately and
> continue; leave the module green. Demo tenant ONLY (slug demo, PIN 12345). Zero Prizma writes.
> **Data:** do NOT delete the test data you create — Daniel will inspect it. Label it clearly so it's
> recognizable as QA data.

## 0. Pre-flight
Branch=develop, git pull, verify clean tree on THIS machine (§3a). Demo only. Read CLAUDE.md (Iron
Rules 21+32+34, §3a, §9) + the localhost-tester VFV gate (loaded-state mandatory — empty-state
screenshots are a FAIL). Build a written test matrix BEFORE executing, so coverage is provable.

## 1. Scope — exercise EVERY flow + scenario on demo

Cover at minimum (expand if you find more paths):

**Entry paths**
- Direct URL with prescription_id (Daniel's exact URL pattern) — glasses + contacts.
- Via customer card → tab-3 prescriptions → open visit → editor.
- "+ ביקור" / new-visit creation from the editor sidebar.
- A customer with NO prescriptions (empty state renders correctly), a customer with ONE visit, a
  customer with MANY visits (sidebar scroll + search + filter pills).

**Stage flow (the multi-Rx model)**
- Create a visit, add all 4 stages (old / objective / subjective / final); confirm ONE eye_exam holds
  all 4 prescriptions (DB evidence) and the sidebar shows ONE row.
- Skip stages: leave some empty → they render dimmed/dashed/"(דולג)"; a filled stage is active.
- Click between stages → editor loads the right stage's data each time.
- "Copy from previous stage" rolls eye values forward correctly (and does nothing sensible when there
  is no previous filled stage).
- Stage strip renders on BOTH entry paths (regression guard — this broke before).

**Per-eye data + input behavior**
- SPH/CYL default-minus + explicit-plus preserved + 0.25 snap + 2dp + momentary highlight on auto-sign.
- ADD axes default-plus. AXIS ° integer 0-180. PRISM △ + 0.25. PD/BC/DIA + mm. K1/K2/Kavg 2dp.
  K-axis °. VA 6/x preserved. Minus renders LEFT of digits (RTL). Clean edit-mode strips on focus
  (incl. empty fields). **Include the deferred polish: PD whole-number (32mm not 32.00mm); BC/DIA 1dp
  (8.4mm not 8.40mm).**
- Per-eye ADD copy-R→L button works.
- Save persistence: enter values → blur/Enter → reload page → values persist (autosave verified to DB,
  normalized value stored).

**State machine**
- DRAFT → COMMITTED (commit succeeds, status flips, print strip enables, recall axes generated).
- COMMITTED → read-only (fields locked, print/PDF/WhatsApp/email actions enabled).
- Cancel a DRAFT (cancel_draft_prescription) — only allowed pre-activity per Iron Rule 32.
- Clone a prescription (clone_prescription) — produces a new draft with copied values.
- Recall axes: correct dates computed (next exam / HF validity / Rx validity / dispensing).

**Contacts-specific**
- CL parameter table (14 cols), CL meta-grid, CL secondary row (manufacturer/model/material/water%/
  Dk-L/tint), OR (over-refraction), CL recall (incl. fit-check).
- Glasses↔contacts toggle switches the whole editor + the correct history/stage sets (no mixing).

**Cross-module + permissions**
- The M5 customer-card tab-3 (prescriptions) + Vision tab light up from M6 data correctly.
- Health-fund display block shows the customer's HF when linked, "אין מידע קופ"ח" when not.
- Permission gating: a user without M6 perms can't open/edit (if perms exist for M6).

**Edge cases**
- Very large/invalid numbers, AXIS > 180, empty required fields on commit, two browser tabs on the
  same draft, rapid stage-switching, a visit with only a skipped final, RTL layout at 1920 + a
  narrower viewport (no horizontal overflow anywhere).

## 2. Fix-as-you-go
When a scenario fails: diagnose root cause, fix it in-place (code/RPC/view — additive; no schema
table/column changes without escalation), re-test that scenario until green, and record both the bug
and the fix in the report. Keep going. Only STOP and escalate on a genuine deviation that needs a
Daniel decision (e.g., a real model change, a destructive op, a Prizma-touch need).

## 3. Deliverables (keep everything — no deletion)
- `modules/Module 6 - Prescriptions/docs/specs/M6_EXHAUSTIVE_QA/TEST_REPORT.md` — the full test matrix:
  every scenario, PASS/FIXED/FAIL, with what broke + how fixed. Loaded-state screenshots for the major
  flows, committed by explicit filename.
- The QA test data left in demo (labeled, not deleted) so Daniel can open it.
- FINDINGS.md (bugs found + fixes) + FOREMAN_REVIEW.md per the SPEC lifecycle.

## 4. Closure (hardened loaded-state VFG)
No scenario counts as verified from a script assertion alone where a screen is involved — loaded-state
screenshot required for the major flows, region/scenario table embedded in TEST_REPORT.md AND
FOREMAN_REVIEW.md. DB evidence for state/data scenarios. Iron Rule 32 §Destructive Operations: declare
None. (additive fixes only; if a fix needs a destructive op, escalate first). Clean-repo gate: commit
every file by explicit filename incl. screenshots. No git add -A. Demo only, no Prizma writes.

## 5. Morning summary (Hebrew)
Total scenarios tested, how many passed clean vs fixed, the list of bugs fixed, screenshot paths so
the Architect can SEE the major flows, the QA-data location in demo, and — if merge-ready — the GitHub
compare URL + a one-line PR title. Then stop for the Architect's visual review.
