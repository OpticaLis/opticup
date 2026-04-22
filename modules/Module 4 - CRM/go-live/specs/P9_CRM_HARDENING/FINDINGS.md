# FINDINGS — P9_CRM_HARDENING

> **Location:** `modules/Module 4 - CRM/go-live/specs/P9_CRM_HARDENING/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Rules

Findings = things discovered OUTSIDE the SPEC's declared scope. In-scope bugs went into commits. Each finding has severity, location, and a suggested next action (NEW_SPEC / TECH_DEBT / DISMISS).

---

## Findings

### Finding 1 — Automation engine ignores `unsubscribed_at`

- **Code:** `M4-BUG-P9-01`
- **Severity:** HIGH
- **Discovered during:** §12.6 flow test step 8 (event status change → 4 dispatches to 2 Tier 2 leads)
- **Location:** `modules/crm/crm-automation-engine.js` recipient resolvers (`tier2`, `tier2_excl_registered`, `attendees`, `attendees_waiting`)
- **Description:** `crm_leads.unsubscribed_at` exists as a column but is NOT checked by any recipient resolver in the automation engine. A lead that sets `unsubscribed_at = now()` (if such a flow existed) would still receive messages from every fired rule. Combined with Finding 2 below (no unsubscribe endpoint), this means `%unsubscribe_url%` in templates is a dead link *and* even if a lead somehow unsubscribed manually, they would keep receiving messages.
- **Reproduction:**
  ```sql
  UPDATE crm_leads SET unsubscribed_at = now() WHERE id = '<any tier2 lead>';
  -- then change event status to invite_new via UI → lead still gets SMS+Email
  ```
- **Expected vs Actual:**
  - Expected: lead with `unsubscribed_at IS NOT NULL` excluded from all dispatch
  - Actual: lead still receives messages
- **Suggested next action:** NEW_SPEC (**BLOCKS P7 cutover per Israel privacy law + GDPR**)
- **Rationale for action:** Legal risk at scale (Prizma = ~900 leads). Must be fixed before cutover. Fix is small — one WHERE clause per resolver — but requires coordination with Finding 2 (unsubscribe endpoint).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Unsubscribe endpoint still missing

- **Code:** `M4-DEBT-P9-02`
- **Severity:** HIGH
- **Discovered during:** Template content review (`%unsubscribe_url%` appears in all 10 email templates on demo)
- **Location:** Templates reference `%unsubscribe_url%`; no Edge Function exists to receive the click
- **Description:** Every email template includes `%unsubscribe_url%` (per the SuperSale content plan). The `send-message` Edge Function substitutes this variable — but there is no endpoint at `/functions/v1/unsubscribe` or anywhere else to receive the click and flip `unsubscribed_at`. If a lead clicks "unsubscribe" in an email, the link 404s (or goes to the wrong place). Already tracked as a P5.5 follow-up in SESSION_CONTEXT.md, but this finding confirms it remains open as of 2026-04-22.
- **Reproduction:** Read any email sent by the P5.5/P8/P9 dispatch in Daniel's inbox, scroll to footer, click "הסר מרשימה" — link resolves to nowhere.
- **Expected vs Actual:**
  - Expected: link accepts a signed token, sets `unsubscribed_at`, shows a confirmation page
  - Actual: link is a placeholder, nothing happens
- **Suggested next action:** NEW_SPEC (**BLOCKS P7 cutover per legal requirement**)
- **Rationale for action:** Pair this with Finding 1 above in a single "UNSUBSCRIBE_COMPLETE" SPEC. Both must land before P7.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — 48h "no response" filter loads the entire lead_notes table

- **Code:** `M4-PERF-P9-03`
- **Severity:** LOW
- **Discovered during:** Building Track C advanced filtering (Commit 4)
- **Location:** `modules/crm/crm-lead-filters.js:52-62` (`loadLastNotesMap`)
- **Description:** The 48h filter needs `MAX(created_at) per lead_id`. My implementation loads ALL `crm_lead_notes` rows for the tenant with `ORDER BY created_at DESC`, then picks the first occurrence per `lead_id` in JS. On demo with 2 notes this is trivial. On Prizma with 695 notes (per SESSION_CONTEXT) it's still fast (<200ms measured). At 10k+ notes this would get noticeably slow.
- **Reproduction:** Enable DevTools Network tab on `crm.html?t=prizma`, switch to registered tab, observe `crm_lead_notes` query time. Expected to be under 200ms at current scale.
- **Expected vs Actual:**
  - Expected: a targeted aggregate query (SQL GROUP BY or PostgREST limit with DISTINCT ON)
  - Actual: full-table scan + client-side dedup
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Not blocking now. Optimize when either (a) Prizma notes >5k, or (b) a `v_crm_lead_latest_note` view is authored for another use case. Either trigger creates a natural moment to upgrade this.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — Messaging broadcast wizard step 5 summary shows template channel, not selected channel (pre-existing from P6)

- **Code:** `M4-BUG-P6-04` (already logged in P6 FINDINGS as noted in SESSION_CONTEXT.md §"P6 follow-ups")
- **Severity:** LOW
- **Discovered during:** QA sweep (Track E) — opening the broadcast wizard to verify all 4 messaging sub-tabs loaded cleanly
- **Location:** `modules/crm/crm-messaging-broadcast.js` step 5 summary render
- **Description:** User picks WhatsApp in step 2 channel, then picks an SMS template in step 3. Step 5 summary shows "SMS" as the channel (correct, because template drives dispatch) — but the user's step 2 choice is silently ignored. If the user expected "Channel picked in step 2 wins" they'd be surprised.
- **Reproduction:** Open Messaging Hub → Broadcast Wizard → step 2 pick WhatsApp → step 3 pick any `*_sms_he` template → step 4 pick recipients → step 5 shows SMS.
- **Expected vs Actual:**
  - Expected: warning "Template channel doesn't match step 2 selection. Which wins?"
  - Actual: silent SMS dispatch
- **Suggested next action:** NEW_SPEC (low-priority polish, bundle with Proposal 4 "SMS button label polish" in EXECUTION_REPORT §10 Proposal 4)
- **Rationale for action:** Already logged in P6 FINDINGS. P9 just re-confirmed. Not new, not critical. Queue in next polish cycle.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — 3 persistent "בקרוב" placeholder buttons still present

- **Code:** `M4-INFO-P9-05`
- **Severity:** INFO
- **Discovered during:** QA sweep (Track E) — grep for `בקרוב` in `modules/crm/`
- **Location:**
  - `modules/crm/crm-leads-detail.js:322` — "מעבר למצב יום אירוע — בקרוב" (Event Day jump from lead detail)
  - `modules/crm/crm-leads-tab.js:182` — "פעולה לאצווה: {act} — בקרוב" (bulk WhatsApp/SMS placeholder)
  - `modules/crm/crm-event-day-checkin.js:101,108` — "רישום מהיר — בקרוב", "רכישה — בקרוב" (event-day quick-scan / purchase)
  - `modules/crm/crm-events-detail.js:138` — "ציר הודעות לאירוע — בקרוב" (event messages timeline)
- **Description:** Five `בקרוב` (coming soon) toast/placeholder sites remain. None is a regression introduced by P9; all are pre-P9 feature gaps. The user sees "בקרוב" toasts which are harmless but unprofessional.
- **Expected vs Actual:**
  - Expected: either the feature, or the button removed
  - Actual: button shows toast "coming soon"
- **Suggested next action:** DISMISS (each is its own future SPEC — tracked in §"Next" of SESSION_CONTEXT.md)
- **Rationale for action:** Out of P9 scope. Each placeholder = separate feature SPEC. Bulk SMS is the most-asked per my §10 Proposal 5. Event Day quick-scan is a scanner-integration SPEC. Event messages timeline is a small view SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 6 — `crm-leads-detail.js` at 345 lines (Rule 12 soft target breach)

- **Code:** `M4-DEBT-P9-06`
- **Severity:** LOW
- **Discovered during:** Final file-size audit
- **Location:** `modules/crm/crm-leads-detail.js` (345 lines)
- **Description:** The file is 345 lines after P9 touches (was 338 at P9 start). Under the 350 hard max (Rule 12) but over the 300 soft target. Pre-commit hook emits `[file-size] ... — file exceeds 300-line soft target (345 lines)` warning but not blocking. Next meaningful touch to this file (e.g., wiring the event-day jump from Finding 5, or adding a 6th detail sub-tab) will push past 350.
- **Reproduction:** `wc -l modules/crm/crm-leads-detail.js`
- **Expected vs Actual:**
  - Expected (for next touch, not this SPEC): ≤350
  - Actual: 345 now, likely >350 after next feature
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Natural split = extract render functions (`renderDetail`, `renderTabContent`, `renderMessages`, `renderEvents`, `renderNotes`, `renderTimeline`, `renderFullDetails`, `row`, `initials`) into `crm-leads-detail-render.js`. Keeps orchestration (fetch, wire, open) in main file. ~150 lines extracted. Do this in the next SPEC that touches lead detail. Do NOT do it in a dedicated refactor SPEC — per SPEC §9 "one concern per task", refactors travel with features.
- **Foreman override (filled by Foreman in review):** { }

---
