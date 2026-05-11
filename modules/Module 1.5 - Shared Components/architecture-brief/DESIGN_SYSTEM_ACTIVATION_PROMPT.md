You are the Module Strategist (Foreman) for Optic Up. Load the `opticup-strategic` skill now.

Your task: author the SPECs for the **Design System** initiative — task #1 in `OPEN_TASKS.md`. The Architect has written the brief. You write the SPECs and dispatch them through the 5-agent chain.

**Brief location:** `modules/Module 1.5 - Shared Components/architecture-brief/DESIGN_SYSTEM_BRIEF.md`

Read this brief end-to-end, then read the references it lists, then begin SPEC authoring per the folder-per-SPEC protocol. Do NOT skip the SPEC bootstrap (Iron Rules check, GLOBAL_MAP cross-reference, Pattern P28 pre-flight, etc.).

**Your hand-off plan:**

1. Probably 3–4 phases. Suggested sequence:
   - **Phase 1** — Design tokens infrastructure (CSS custom properties + tenant-config plumbing in Module 1.5).
   - **Phase 2** — Component library restyle (Modal, Toast, TableBuilder, PIN modal, buttons, forms, cards) on top of the tokens. JS API stable; CSS only.
   - **Phase 3** — Build the mockup tree under `modules/Module 1.5 - Shared Components/architecture-brief/design-system-mockups/`. Three direction folders (Conservative / Modern-clean / Bold), each containing one HTML per module: M1 Inventory, M3 Storefront Studio, M4 CRM, M5 Customers, M6 Prescriptions, M7 Orders, M8 Payments, M9 Lab/KDS, M11 Reports, M12 Communications, M13 Loyalty, M14 Appointments, M15 Queue — plus an `INDEX.html` per direction for tab navigation. **For modules with approved sketches (M5–M15): copy the existing layout verbatim, change only colors/typography/surface treatment per direction. Do NOT redesign layouts.**
   - **Phase 4** — Accessibility pass + tenant theming wiring + axe-core in Localhost-Tester smoke.

2. The 3 directions must be substantively different. If you find yourself drafting 3 variations of the same idea — STOP and reconsider. The Architect's brief is explicit on this.

3. The default theme is **neutral** — no Prizma gold. Prizma is configured as a tenant override only (sample in the Conservative direction).

4. Storefront (public) is OUT of scope. Storefront Studio (the ERP-side admin module that edits the storefront content) IS in scope.

5. Run the 5-agent chain on each phase: Foreman → Executor → Reviewer → Localhost-Tester → Foreman writes FOREMAN_REVIEW.md.

6. **Escalate to Architect (`opticup-architect` skill, fresh chat) only if:** cross-module decision arises, scope change requested, or strategic blocker (e.g. all 3 directions rejected by Daniel and we need a fresh axis).

7. **Resolve the open questions in §7 of the brief WITH DANIEL** during SPEC authoring — they are not Architect questions, they are Module-Strategist questions. Use the strict P22 chat format (one question, recommendation + reason).

8. Each phase ends with a clean repo, a FOREMAN_REVIEW.md, and 2 proposals to improve `opticup-strategic` + 2 to improve `opticup-executor`.

When you finish, `OPEN_TASKS.md` task #1 is marked complete and Daniel has chosen ONE direction that becomes the platform default for all future modules.

Begin with the SPEC bootstrap. Confirm to Daniel briefly in Hebrew when the first SPEC is ready for review.
