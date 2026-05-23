# Handoff to the Events Operations Skill — Context + Agreed Phases

> **Sealed:** 2026-05-21 · **Author:** Campaign Lead · **Audience:** the new consolidated `opticup-events-operations` skill (read at the start of its first working session).
> **Purpose:** bring the new skill fully up to speed on what happened today, the current state, and the agreed phased plan. Read this once, then you're ready to work with Daniel.

## 1. Who you are + how you work with Daniel

You are the single hands-on counterpart for Optic Up events operations (Module 4 / CRM) AND storefront campaign-page edits + Vercel deploy. Daniel works with YOU in one chat now — no more multi-skill hand-offs. The Campaign Lead (`opticup-campaign-lead`) is only your oversight/escalation layer: if Daniel hits a problem with you, he goes back to the Lead to supervise.

Communication rules (non-negotiable, inherited):
- Plain Hebrew to Daniel; English for status one-liners.
- EVERY question to Daniel ends with a recommendation + reason. Even small/binary ones.
- One step per message. Don't pre-package multiple decisions.
- Visual preview before Daniel approves any email/page change (render it, show it). Never ask him to approve raw HTML/text.
- Don't dump SQL/code/file-paths on him unless he asks.

Safety rails (also non-negotiable): demo-first (IR33), live Chrome MCP verification for UI changes (IR34), authority/destructive-op declaration (IR32/35), storefront rules 24–30, merge-to-`main` = Daniel-only, message-send safety (freeze pipeline / fake test phones 0537889878 + 0503348349 / dry-run before anything that could send on Prizma). If the Cowork VM git is unhealthy (ghost index.lock, null-byte padding), escalate code ops to Desktop.

## 2. What happened today (2026-05-21) — the story so far

1. **Email change (DONE by Daniel):** the `event_registration_open` message (email + SMS) had its "stock page" preview link swapped to the **pricing catalog** ("קטלוג המותגים והמחירים"), single button → `prizma-optic.co.il/r/CEiBGCWj`. SMS: Daniel applied himself. Email: Daniel applied the new block manually to Prizma himself (urgent). Approved copy + drop-in HTML: `roles/campaign-overseer/briefs/2026-05-21_REGOPEN_EMAIL_PRICING_BLOCK_COPY_DRAFT.md` §1.0/§1.4. **Demo email NOT yet updated** (parity gap — see open items).

2. **Short-links screen "missing links":** investigated — NOT a bug. Demo had only 2 of Prizma's 4 `template_static` links; the pricing-catalog static link exists on Prizma (`CEiBGCWj`) but not demo. A SPEC request to backfill the 2 demo static links exists: `roles/campaign-overseer/briefs/2026-05-21_DEMO_STATIC_LINKS_BACKFILL_SPEC_REQUEST.md` (Architect authored a brief; pipeline not yet run). Also found: `short_links_code_unique` is GLOBAL not tenant-scoped — IR18 tech-debt, documented, not fixed.

3. **Registration FORM redesign (Sketch 2 / "Quiet Gold"):** Daniel restyled `src/pages/event-register/index.astro` in the storefront. Commit `c86ee0c` is LOCAL ONLY on Daniel's machine (not pushed to origin, not in `main` → NOT deployed to Prizma production). The diff is style-only, zero functional change (verified). NOTE: the working-tree copy showed 1,361 null-byte corruption from the Cowork VM FUSE mount — the committed version is clean. Treat storefront code ops on Cowork with suspicion; prefer Desktop.

4. **THE BIG ONE — event status-change on Prizma:** Daniel could not move event #25 to `registration_open` via the UI. Diagnosed live: clicking "הרשמה פתוחה" on Prizma does NOTHING (no DB request, no console error, status stays `planning`). On DEMO the same click works perfectly (status changes + success toasts). Same deployed code, same live site → the differentiator is Prizma-specific data/scale, not code version. Full diagnosis: `modules/Module 4 - CRM/architecture-brief/BUG_EVENT_STATUS_CHANGE_PRIZMA_DIAGNOSIS_2026_05_21.md`.

5. **Foreman dug deeper + found 3 infrastructure bugs** (incident report: `modules/Module 4 - CRM/docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/INCIDENT_REPORT.md`). When the status DID change (Daniel opened #25 manually), it produced ~13,562 queue rows instead of ~2,251. Root causes, all confirmed by reading EF code:
   - **SCE consumer race** (`automation-engine/consumer.ts` ~99–104): no row locking; overlapping cron ticks read the same SCE row → over-enqueue.
   - **Queue INSERT no ON CONFLICT** (`dispatch.ts:69`): the `uq_crm_message_queue_idem` partial unique index exists but the INSERT never uses it; dedup is client-side non-atomic → races.
   - **Dispatch preview payload too large** (26 MB of per-recipient bodies for big audiences) → modal hangs / silent-commit risk.
   - Why no customer got duplicates: ACCIDENT — the `UPDATE … SET status='processing' WHERE status='queued'` is atomic per row, so a second worker can't re-grab a row. The state machine accidentally provided the dedup the index was supposed to.
   - Foreman REVERTED all JS to origin/main, re-enabled the 2 Prizma `registration_open` rules, released the pipeline lock. System is back to a stable (pre-fix) state.

## 3. Current state (verified 2026-05-21, live DB)

- **Event #25 Prizma:** status = `registration_open` (Daniel opened it manually). It IS open; registrants received messages.
- **Queue for #25:** 13,562 total rows — but **0 still queued**, 2,322 sent (the real sends), 11,240 in other/cancelled states. **No pending sends. No active danger right now.** The duplicate rows did NOT go out.
- **Two Prizma problems remain UNFIXED at root:**
  1. UI status-change silent-fail (the button does nothing on Prizma; Daniel had to bypass it manually).
  2. The duplicate-enqueue infrastructure bugs (3 of them).
- **Also reported by Daniel, not yet investigated:** Module 4 is slow, frequently hangs, and some errors fail to open various screens. These are part of the "M4 to 100% healthy" goal.

## 4. The agreed PHASES (do them in THIS order — each reduces risk before the next)

**Phase 1 — Stop website registration + WhatsApp fallback.**
On `prizma-optic.co.il/supersale/`, the register button should NOT open the form. Instead open a modal: "due to a temporary technical issue, registration via the page isn't available." Show the open event (date + day-of-week). A WhatsApp button with a pre-written message to Prizma's number. Text says: once the system is back, we'll register you. (Storefront edit + deploy — your job directly. Copy to be written/approved with Daniel, visual preview first.)

**Phase 2 — Block ALL automated messages EXCEPT event-registration-confirmation.**
Keep active ONLY the registration-confirmation rule/template (email + SMS with the payment link), so only people who actually register for the Prizma event get a message. Turn `is_active=false` on every other automation rule. Demo-first, then Prizma. This neutralizes message risk before touching the fixes.

**Phase 3 — The fixes (demo-first), in Foreman's priority order:**
- `M4_SCE_CONSUMER_RACE_FIX` (highest) — `SELECT … FOR UPDATE SKIP LOCKED` in the consumer. Closes the over-enqueue root cause.
- `M4_QUEUE_INSERT_ON_CONFLICT` — make `dispatch.ts` use `uq_crm_message_queue_idem` via `ON CONFLICT DO NOTHING`. Defense in depth.
- `M4_DISPATCH_PREVIEW_SUMMARY_MODE` — preview returns a count summary, not 26 MB of bodies, for audiences > 50.
- PLUS a 4th, separate fix for the **UI status-change silent-fail** (the button bug from §2.4 — NOT covered by the 3 above).
- **Critical verification rule:** these bugs only manifest under LOAD. Verify each fix on demo with ~1,200 injected test leads (fake phones / dry-run), or the fix will "pass" on a small demo dataset without actually being proven. Don't declare green on a 5-lead demo.

**Phase 4 (implied) — chase the remaining M4 health issues** (slowness, hangs, screens that don't open) until Module 4 is 100% healthy.

## 5. Message-send safety pattern (apply in every phase that could send)

Before any op that could trigger Prizma sends: (a) ensure no rows are in `queued`/`processing` for the target, (b) freeze the dispatch pipeline (cron off / rules off), (c) work on demo with fake test phones or dry-run, (d) deploy to Prizma with the pipeline still frozen, verify, then unfreeze. At every moment: either the valve is closed, or you're on demo with fake phones. Zero practical chance a real participant gets an unintended message.

## 6. Where everything lives

- M4 knowledge: `roles/campaign-overseer/knowledge/` (KB_MAP + 5 KBs), `M4_INFRASTRUCTURE_CONTRACT.md`, `docs/CRM_RULE_CHAINING.md`, `modules/Module 4 - CRM/docs/`.
- Today's diagnosis + incident: `modules/Module 4 - CRM/architecture-brief/BUG_EVENT_STATUS_CHANGE_PRIZMA_DIAGNOSIS_2026_05_21.md` + `docs/specs/M4_EVENT_STATUS_CHANGE_PRIZMA_SILENT_FAIL_2026_05_21/INCIDENT_REPORT.md`.
- Approved email copy: `roles/campaign-overseer/briefs/2026-05-21_REGOPEN_EMAIL_PRICING_BLOCK_COPY_DRAFT.md`.
- Design language: the "Prizma Design System Canon" (built in Claude Design) — locate + reference before any visual change.

## 7. First thing to do with Daniel

Acknowledge in short Hebrew that you've read this handoff, then ask Daniel ONE question with a recommendation: confirm you start with Phase 1 (stop website registration + WhatsApp fallback), since it relieves customer pressure first. If he wants a different order, follow him.

---

*Handoff authored by Campaign Lead. The Events Operations skill is now the hands-on counterpart; the Lead stays as oversight.*
