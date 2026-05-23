# Activation Prompt — M5 Customer Card 🟡 → 🟢 Closure

> Paste the block below into the SAME Claude Code session that built the card (context is healthy + ~1M-token budget) — or a fresh one if budget is low.
> Brief: `modules/Module 5 - Customers/architecture-brief/M5_UI_CUSTOMER_CARD_CLOSURE_BRIEF.md`
> Needs Chrome MCP + localhost ERP (Iron Rule 34 fidelity capture).

---

```
M5 Customer Card — 🟡 → 🟢 closure. Two small follow-ups from the Phase D FOREMAN_REVIEW: T11 (complete visual fidelity) + F-T5-DESIGN (remove the dead Locked badge). No new features, no schema change, no Prizma writes, no merge to main.

Brief: modules/Module 5 - Customers/architecture-brief/M5_UI_CUSTOMER_CARD_CLOSURE_BRIEF.md

Activate the `opticup-strategic` skill (author the closure SPEC, dispatch executor inline, reviewer, then Foreman). If continuing in the build session, the card + SPEC context is already loaded — reuse it. Read the Brief end-to-end FIRST, plus the existing FOREMAN_REVIEW + TEST_REPORT in docs/specs/M5_UI_CUSTOMER_CARD/ and the mockup M5_CUSTOMER_CARD_MOCKUP.html.

Author the closure SPEC at: modules/Module 5 - Customers/docs/specs/M5_UI_CUSTOMER_CARD/CLOSURE_SPEC.md (or extend the existing SPEC with a §Closure section — your call per project convention). ## Destructive Operations: removal of the Locked-badge UI only (dead code); no DROP/TRUNCATE/DELETE.

ITEM A — T11 visual fidelity (capture-technique, not code):
- The last close hit Chrome MCP `Page.captureScreenshot timed out` on full-page captures. Use a method that doesn't time out: per-tab viewport-height JPEG captures (JPEGs succeeded last time) / fixed-viewport per tab / scroll-and-stitch.
- Produce a CLEAN fidelity set across ALL 5 tabs vs live demo data, each with a one-line mockup-vs-live note. Material drift (beyond the settled stub/blur/coming-soon decisions) = a finding to flag, not a silent pass (memory feedback_no_polish_by_validation).
- Allowed code touch: ONLY genuinely-cosmetic fidelity fixes the diff surfaces (spacing/label/pill-color), surgical, no behavior change. Anything structural → STOP + escalate.

ITEM B — remove the dead Locked badge (settled: REMOVE, per Foreman + Daniel):
- The badge checks customer.is_deleted===true, but v_customer_for_exam + v_customer_full filter is_deleted=false → deleted customers never load → badge unreachable = dead code.
- Remove the Locked/נעול badge render (+ any Locked-specific handler). Verify Locked is NOT in the coming-soon registry before editing (it isn't a coming-soon badge — clean removal, no registry change). KEEP the real Inactive=dormant badge + the blurred VIP/club/subscription/queue coming-soon badges exactly as-is.
- Do NOT build a customer-lock feature, an include-deleted/audit mode, or any new badge — those are documented future wants (Brief §4), out of scope.

CLOSURE GATE (Iron Rule 34) — re-close 🟢 only with:
  (1) clean visual-fidelity set across all 5 tabs attached to TEST_REPORT/FOREMAN_REVIEW, each with a mockup-vs-live note,
  (2) screenshot + badge-row a11y snapshot confirming Locked is gone + other badges unchanged,
  (3) runtime re-check: card boots clean, 0 console errors, after the Item-B edit.

DOCUMENT (do NOT build) in M5 SESSION_CONTEXT "what's next" + TECH_DEBT:
  - Customer LOCK = future feature (block active customer from edits/actions w/o delete; debt/dispute freeze; distinct from soft-delete; needs Architect cross-module pass, likely gates M7/M8 for a locked customer).
  - See-deleted/audit mode = smaller future want (Phase E list or dedicated audit screen).

CLOSE: update TEST_REPORT (T11 ⚠→✅) + FOREMAN_REVIEW (F-T5-DESIGN → RESOLVED) + M5 SESSION_CONTEXT + ROADMAP (Phase D → ✅ 🟢). opticup-reviewer + Foreman as usual. Integrity gate clean; selective git add by filename; backup only if Working-Rule-9.9 trigger fires.

Branch: develop. Demo tenant 8d8cfa7e-ef58-49af-9702-a862d459cccb (PIN 12345). No Prizma writes. No schema change. No merge to main. Surgical edits only — no logic changes. Stop on deviation, not on success.

Return ONE Hebrew status line at close:
  "כרטיס-לקוח M5 [🟢]: נאמנות ויזואלית מלאה ב-5 הטאבים + באדג' 'נעול' המת הוסר. Phase E = הספק הבא. נעילת-לקוח אמיתית + מצב-מחוקים מתועדים לעתיד."
```

---

## Pre-flight checklist for Daniel

- [ ] Chrome MCP available + localhost ERP runnable (fidelity capture needs the rendered card)
- [ ] Branch = develop, repo = opticalis/opticup
- [ ] Demo tenant reachable
- [ ] Ideally the same Claude Code session that built the card (context already loaded)

---

## Expected timing

- Fidelity capture across 5 tabs + notes: ~45-60 min
- Remove dead badge + boot re-check: ~15-20 min
- Doc updates + reviewer + Foreman: ~30-45 min

**Total: ~1.5-2 hours.** Small closure.

---

*End of activation prompt. T11 fidelity + remove dead badge → 🟢. No new features.*
