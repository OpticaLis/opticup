# Events Operations — Decisions Log

> **Purpose:** the canonical, version-controlled history log for the `opticup-events-operations` skill. Every operational decision, recommendation, and locked design choice that touches Module 4 (CRM), event lifecycle, lead system, campaign pages, or messaging flows is recorded here.
> **Authority:** the events-operations skill writes here; Daniel decides; the entries persist across machines via git.
> **Location rationale (2026-05-22):** moved INTO the repo (from a Cowork-only plugin path) so history is git-tracked, accessible from Desktop / Cowork / Mac, and survives plugin reinstalls. Single source of truth.
> **Source migration:** this file consolidates `roles/campaign-overseer/DECISIONS_LOG.md` (12 RECs + Self-Review #1) + the historical blocks of `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`. Both source files were deleted at the close of the consolidation SPEC after verification confirmed full transfer.
> **REC numbering:** original `REC-001..REC-012` numbers preserved verbatim so prior cross-references remain valid. New events-ops decisions continue from `REC-013` onward.

---

## Schema (every new recommendation MUST follow)

```markdown
## REC-{NNN} — [{class-tag}] {one-line title}
- **Date submitted:** YYYY-MM-DD
- **Source signal:** what data/observation surfaced this
- **Problem:** the issue in plain Hebrew, 1-2 sentences (English where the file is English)
- **Proposal:** the concrete change, specific enough to implement
- **Predicted impact:** numerical or qualitative
- **How to measure:** what data point will confirm or refute
- **Daniel decision:** PENDING / agree / disagree / partial — + brief reason
- **Decided on:** YYYY-MM-DD
- **Applied:** PENDING / YYYY-MM-DD by {who}
- **Outcome:** PENDING / measured value vs predicted
```

**REC class tags (binding from Self-Review #1, 2026-05-04):** every REC carries one of two tags:

- **`[anomaly-detection]`** — surfacing a data shape, schema violation, or operational drift that may need cleanup. Subject to L-005 Rule A (live-flow check) — see `roles/campaign-overseer/LEARNINGS.md`.
- **`[feature-request]`** — authoring a SPEC for a Daniel-proactive ask. Not subject to Rule A — these originate from Daniel and don't need a live-flow defense.

The tag distinguishes the two tracks because their historical agreement patterns differ (50% anomaly-detection vs 100% feature-request through REC-012).

---

## Stats summary

- **Total recommendations recorded:** 12 (REC-001 → REC-012)
- **Total decided:** 12 (agree: 8 / disagree: 4 / partial: 0)
- **Total applied:** 4 (REC-009 + REC-010 + REC-011 + REC-012 — all shipped + verified + merged to main 2026-05-04)
- **Rolling 30-rec acceptance rate (at REC-012 close):** 67% (8/12)
- **Class distribution:** 4 of 4 disagreements were anomaly-detection RECs (REC-002/005/006/008); 4 of 4 feature-request RECs since class-tagging began had 100% agree rate (REC-009..REC-012).

---

## Migrated Recommendations (REC-001 → REC-012, from Campaign Overseer era)

## REC-001 — Migration D-1: stub-create 51 orphan attendees instead of dropping
- **Date submitted:** 2026-05-02
- **Source signal:** `modules/Module 4 - CRM/go-live/MONDAY_MIGRATION_MAP.md` §5 D-1 — discovery surfaced 51 attendee rows in Monday's `Events_Record` (events 13-21, Jan 2026) whose phones do NOT exist in the Tier_2 master board.
- **Problem:** 51 paying customers (~30-40K NIS aggregate spend) have purchase history in Monday but no master lead row. If the migration script drops them (current default), the new CRM has zero record of these customers.
- **Proposal:** Option (b) STUB-CREATE — auto-generate 51 `crm_leads` rows on prizma during migration, sourced from each phone in the orphan attendee set. Fields: `full_name` from attendee row, `phone` normalized, `status='waiting'`, `source='monday_legacy_orphan'`, `client_notes='Imported from Monday Events_Record archive — original master record not found'`. Add tag `legacy_orphan` for filtering. Result: full attendee history preserved + customers visible in the new CRM with explicit "incomplete profile" markers.
- **Predicted impact:** 51 customer relationships preserved in the new CRM with full per-event purchase history linked correctly; 51 leads in the new system carry an explicit "incomplete profile" tag (no email, no UTM) making them filterable from clean campaign segments.
- **How to measure:** Post-migration query on prizma: `SELECT COUNT(*) FROM crm_leads WHERE source='monday_legacy_orphan'` should return 51; for each, the corresponding `crm_event_attendees` rows on early events should link via the new `lead_id`.
- **Daniel decision:** **agree** — approved as recommended.
- **Decided on:** 2026-05-02
- **Applied:** PENDING (will be executed by Claude Code during Phase 3 migration script run)
- **Outcome:** PENDING — verify after migration: count of `legacy_orphan`-tagged leads = 51 ± 0.

## REC-002 — Migration D-2: 8 vision-questionnaire summaries
- **Date submitted:** 2026-05-02
- **Source signal:** `MONDAY_MIGRATION_MAP.md` §5 D-2 — 8 attendees in `Events_Record` col 14 hold a long Hebrew vision-questionnaire summary (current vision solution, primary difficulty, occupation, medical background, multifocal experience, screen time, night driving).
- **Problem:** Optic Up has no first-class home for this structured-but-narrative data; if dropped at migration, 8 customer profiles lose value.
- **Proposal:** Option (b) — append to `crm_event_attendees.client_notes` with explicit "שאלון מ-Monday" prefix tag. No schema change. Follow-up SPEC post-cutover migrates to (d) `crm_custom_field_vals` EAV pattern for proper structure.
- **Predicted impact:** 8 questionnaires preserved as readable notes in attendee detail screens; minor UX cost = notes column blends operational notes with intake summary; full structural fix deferred.
- **How to measure:** Post-migration query: `SELECT COUNT(*) FROM crm_event_attendees WHERE client_notes LIKE '%שאלון מ-Monday%'` should return 8.
- **Daniel decision:** **disagree** — Daniel chose option (a) DROP. Reason given: "לא צריך שאלון התאמה" (the questionnaire data isn't needed in the new system).
- **Decided on:** 2026-05-02
- **Applied:** PENDING (migration script will skip the questionnaire summary column; 8 attendees migrate without it)
- **Outcome:** N/A — option (a) means nothing to verify post-migration beyond "no client_notes prefix exists for these 8".

## REC-003 — Migration D-3: hybrid synthesize 152 coupon-sent message-log rows
- **Date submitted:** 2026-05-02
- **Source signal:** `MONDAY_MIGRATION_MAP.md` §5 D-3 — Monday does not export message-log rows; only workflow markers exist (`Send Messages` column with values: `קוד קופון` 152, `הרשמה אושרה אוט'` 25, `יום לפני האירוע` 1, `אין זמן בדיקה` 1).
- **Problem:** Pre-cutover message history is unrecoverable as-is. Either accept the loss or reconstruct from markers with best-effort fidelity. Coupon markers are the highest-value subset because they map cleanly to `crm_event_attendees.coupon_sent`.
- **Proposal:** Option (c) HYBRID — synthesize `crm_message_log` rows ONLY for the 152 `קוד קופון` markers. For each: INSERT row with `template_slug='coupon_code_he'`, `channel='sms'`, `content='[migrated from Monday — body unavailable]'`, `status='sent'`, `created_at=registered_at` (best-effort timestamp); ALSO set `crm_event_attendees.coupon_sent=true`, `coupon_sent_at=registered_at`. Drop the other 27 markers (less operationally valuable).
- **Predicted impact:** 152 customers will show "1 historical coupon sent" in the new CRM, matching their pre-cutover state; "send count per lead" reports will roughly match Monday for coupon volume; the 27 dropped markers don't drive operational decisions and aren't missed.
- **How to measure:** Post-migration query: `SELECT COUNT(*) FROM crm_message_log WHERE template_slug='coupon_code_he' AND content LIKE '%migrated from Monday%'` should return 152; `SELECT COUNT(*) FROM crm_event_attendees WHERE coupon_sent=true AND tenant_id='prizma'` should reflect the 152 + any genuinely-sent rows from cutover-day onward.
- **Daniel decision:** **agree** — approved as recommended (option c).
- **Decided on:** 2026-05-02
- **Applied:** PENDING (Phase 3 migration script run)
- **Outcome:** PENDING — verify post-migration counts match (152 ± 0).

## REC-004 — Migration D-4: drop the Monday "Category" tag on ~80 leads
- **Date submitted:** 2026-05-02
- **Source signal:** `MONDAY_MIGRATION_MAP.md` §5 D-4 — Tier_2 col 16 + Events_Record col 21 carry a "Category" tag with 4 distinct values (`לא ידוע`, `ממומן`, `לא נמצא במאסטר`, `רישום ידני`) on ~80 leads/attendees.
- **Problem:** 3 of the 4 values are Monday-internal artifacts with no operational meaning in the new CRM (`לא ידוע` = no tag, `לא נמצא במאסטר` = bookkeeping artifact, `רישום ידני` = old workflow). Only `ממומן` (paid lead) is conceptually useful.
- **Proposal:** Option (a) DROP. Rationale: paid-lead identification is already handled in the new CRM via UTM source markers from Facebook/Google ads, which are more accurate than Monday's manual tag. Future filtering for paid leads should rely on UTM-based source identification, not migrated manual tags.
- **Predicted impact:** ~80 leads migrate without the Category tag. Zero operational disruption (the tag wasn't driving any automation). UTM-based segmentation supersedes this.
- **How to measure:** Post-migration: zero `crm_lead_tags` rows tagged with `monday_category_*`.
- **Daniel decision:** **agree** — approved option (a).
- **Decided on:** 2026-05-02
- **Applied:** PENDING (migration script will skip the Category column)
- **Outcome:** N/A — drop has no measurement requirement.

## REC-005 — Migration D-5: 8 MultiSale-tagged events (cutover blocker)
- **Date submitted:** 2026-05-02
- **Source signal:** `MONDAY_MIGRATION_MAP.md` §5 D-5 — 8 of 11 events in Monday tagged `Interests='MultiSale'` (~90 attendees, ~200K NIS revenue) cannot map cleanly to existing `crm_campaigns` since MultiSale was removed in B9 (2026-05-01).
- **Problem:** Importing them under SuperSale conflates two product lines; resurrecting MultiSale campaign contradicts B9; dropping outright loses 200K NIS of historical revenue + 90+ customer relationships.
- **Proposal:** Option (a) with extension — map all 8 events to `SuperSale` campaign + add an explicit `legacy_multisale` tag on each event row. Preserves history, honors B9 (no live MultiSale campaign), and allows future report-level filtering by tag.
- **Predicted impact:** 8 events migrated under SuperSale with explicit `legacy_multisale` tags. Future reports can filter the 8 MultiSale archive events away from clean SuperSale analytics if desired.
- **How to measure:** Post-migration: `SELECT COUNT(*) FROM crm_events WHERE tags @> '["legacy_multisale"]' AND tenant_id='prizma'` should return 8.
- **Daniel decision:** **disagree** — Daniel chose to NOT migrate the 8 events at cutover at all. Verbal directive: "כל מה שמתוייג כ-MULTISALE אל תעביר בתור התחלה. אחרי שהמערכת תעבור אנחנו ניצור 'סוג אירוע' נוסף ונעביר גם אותם, לא לפני. כרגע הקמפיין הזה לא פעיל בכלל גם ככה." Effectively a 4th option (d) — defer the 8 events with a forward commitment: post-cutover, introduce a new `event_type` concept (distinct from `campaign`) and import the 8 MultiSale archive events via the new type then.
- **Decided on:** 2026-05-02
- **Applied:** PENDING (migration script must SKIP the 8 MultiSale-tagged events at cutover; post-cutover SPEC scheduled to introduce `event_type` architecture + reimport the 8 archive events)
- **Outcome:** PENDING — verify cutover-day import excludes the 8 MultiSale rows; verify post-cutover SPEC closes successfully and the 8 events are imported under the new event_type construct.

**Forward commitment captured:** Post-cutover SPEC scope = introduce `event_type` field on `crm_events` (distinct from `campaign_id`), backfill existing events with default type, import the 8 MultiSale events under a new `multisale_archive` event_type. Owner: Supervisor authors SPEC; Claude Code executes. Timing: after cutover stabilizes (1-2 weeks post 2026-05-03).

## REC-006 — Migration D-6: 587 lead-level Eye Exam answers
- **Date submitted:** 2026-05-02
- **Source signal:** `MONDAY_MIGRATION_MAP.md` §5 D-6 — Tier_2 col 11 holds an Eye Exam answer (yes/no) per lead on 587 rows. The same field exists at attendee level in `Events_Record` col 17 (per-event answer).
- **Problem:** Optic Up has the eye_exam answer at attendee level but no first-class lead-level column. Migrating the 587 lead-level answers requires either dropping them or adding a column.
- **Proposal:** Option (a) DROP — the per-event attendee answer is more accurate operationally (customers change their mind between events).
- **Predicted impact:** No data loss for current operational flows (per-event answer suffices); avoids schema change for migration.
- **How to measure:** Post-migration: zero new column added; per-event answers preserved.
- **Daniel decision:** **disagree** — Daniel chose option (b) ADD lead-level field. Verbal directive (with screenshot of the live storefront SuperSale registration form): "בכל מקרה צריך את B כי השאלה קיימת בטופס בעמוד הנחיתה וזה אמור לעבור לליד. חוץ מזה שזה מידע חשוב." The storefront form actively asks the eye-exam question and the answer needs a place to land at the lead level (not only at attendee).
- **Decided on:** 2026-05-02
- **Applied:** PENDING (requires schema change + lead-intake EF wiring; see follow-up scope below)
- **Outcome:** PENDING — verify post-migration: column exists on `crm_leads`; 587 historical answers populated; lead-intake EF persists the form's answer to the new column.

**Follow-up scope captured (Supervisor SPEC needed BEFORE cutover):**
1. Add column `crm_leads.eye_exam_default` (text or enum) to schema. Migration migrates 587 historical answers into it.
2. Wire `lead-intake` Edge Function to write the form's eye-exam field to `crm_leads.eye_exam_default` on new lead creation.
3. (Optional) UI display in CRM lead detail screen.

**Overseer self-note (drives a future LEARNINGS entry):** my recommendation was based on the MAP's analysis, which only saw historical-data fidelity. I missed that the storefront form (active today, used by customers) actively writes this field — meaning the lead-level column is NOT optional going forward, regardless of historical migration choice. Lesson: before recommending "drop X", check whether the live customer-facing surface still produces X.

## REC-007 — Migration D-7: fix-and-import 2 corrupted-phone leads
- **Date submitted:** 2026-05-02
- **Source signal:** `MONDAY_MIGRATION_MAP.md` §5 D-7 — Tier_2 rows 222 + 710 have phones with 12-13 digits (likely Excel cell-format corruption); both rows have valid names + emails.
- **Problem:** Default migration script skips these 2 leads. They're real customers (verifiable via name + email pairing). Skipping is unjustified.
- **Proposal:** Option (b) FIXUP — extend the migration script's phone-normalize fallback rule: if a phone is 12-digit and starts with `972`, strip the leading `972` and re-validate; if still invalid after fixup, skip with a logged warning row.
- **Predicted impact:** 2 additional leads in the migrated CRM. Negligible risk if the normalization logic is bounded (won't false-positive on legitimately-different formats — the fixup rule is narrow and explicit).
- **How to measure:** Post-migration: total imported leads = baseline + 2; the 2 specific phones (after normalization) appear in `crm_leads` with the correct names + emails attached.
- **Daniel decision:** **agree** — approved option (b).
- **Decided on:** 2026-05-02
- **Applied:** PENDING (Phase 3 migration script run)
- **Outcome:** PENDING — verify both leads imported with normalized phones.

## REC-008 — Triage 16 Prizma leads (8 distinct emails) flagged as "duplicate emails"
- **Date submitted:** 2026-05-04
- **Source signal:** M4 closure follow-up audit — HANDOFF §"Open follow-ups" listed "8 duplicate-email leads" as an open item. Verified on Prizma: 8 distinct emails appearing across 16 active leads.
- **Problem:** Same email present on 2+ active lead rows. Initial framing: data anomaly that should be cleaned (merge legitimate duplicates, dismiss false positives).
- **Proposal:** Author a SPEC that triages the 16 rows by 4 patterns: (A) same person + phone typo → merge; (B) same person with attendee/message history → careful merge preserving history; (C) two different people sharing one email → leave alone or flag email field; (D) ambiguous → manual review. Auto-merge only pattern A; flag rest for manual review.
- **Predicted impact:** ~3-4 legitimate duplicates merged; ~3-4 same-email-different-people pairs flagged but untouched. Reduces lead count by 3-4 rows.
- **How to measure:** Post-merge query: distinct active emails with >1 active lead row drops from 8 to ~4 (the legitimate "two people share one email" cases).
- **Daniel decision:** **disagree** — Daniel directive: "אין בעיה עם זה שנרשמים עם אותו המייל 2 אנשים שונים. המגבלה היא רק בטלפון. לפעמים זוג נרשם עם אותו המייל או אמא רושמת גם את הילדים שלה. נשאיר את זה בנתיים ככה." Same-email-different-people is **legitimate operational behavior** (couples, parents registering children). The only uniqueness constraint that matters is phone (already enforced by lead-intake EF). Email duplication is by design.
- **Decided on:** 2026-05-04
- **Applied:** N/A — no code or data changes. HANDOFF §"Open follow-ups" updated to remove this item (moved to "by-design" section).
- **Outcome:** N/A — decision was "do nothing", no measurement needed.

**Overseer self-note:** I had verified the data shape (8 emails / 16 leads / 4 patterns) before recommending, which was correct per L-001. But I framed all 16 rows as "candidates for cleanup" by default, instead of asking Daniel first whether multi-person email is even an anomaly to him. This is the same pattern as REC-002 ("drop questionnaire data"), REC-005 ("drop MultiSale events"), and REC-006 ("drop lead-level eye-exam answers") — over-indexing on data-shape anomalies without checking the live business context. Lesson: when a data shape looks like a violation, ask "does the business want this preserved?" BEFORE proposing a cleanup.

## REC-009 — Add "delete event" UI when there are no purchases (`SUM(purchase_amount) = 0`)
- **Date submitted:** 2026-05-04 (evening, post-QUICK_REGISTER_QR_FLOW closure)
- **Source signal:** Daniel directive at the close of the quick-register flow smoke test: "תוסיף אפשרות למחוק אירוע במידה ולא היו בו רשומים שהגיעו וקנו (שהסכום קניה הוא 0)" — i.e., he wants to be able to clean up QA events + cancelled events without leaving them as `is_deleted=false` orphans cluttering the events list. Tied to B6 (event numbering reset to baseline 1) — without this UI, every QA cycle adds inflation to the next available event_number.
- **Problem:** today there is no UI for soft-deleting an `crm_events` row. Operators (Daniel) edit `is_deleted=true` via SQL when they want to clean up. This is fragile (no atomicity check, no cascade to attendees + queued messages, no protection against accidentally deleting events that DID drive revenue).
- **Proposal:** add a "Delete event" button to the event detail screen. Behavior:
  - On click: query `SELECT SUM(COALESCE(purchase_amount, 0)) FROM crm_event_attendees WHERE event_id = $1 AND is_deleted = false` for the event.
  - If sum > 0 → modal: "אי אפשר למחוק — האירוע כולל רכישות בסך X ₪. ניתן למחוק רק אירוע ריק."
  - If sum = 0 → confirm modal: "המחיקה תמחק את האירוע ואת N הרשומים אליו (לא בוצעו רכישות). להמשיך?"
  - On confirm → call new RPC `soft_delete_event_if_empty` that does atomically (within a single transaction with `SELECT FOR UPDATE` lock on the event row): re-check `SUM(purchase_amount) = 0`, soft-delete event, soft-delete attendees, cancel pending entries in `crm_message_queue` for the event.
- **Predicted impact:** Daniel can clean up QA events + truly-empty events from the events list. Sets the foundation for B6 baseline-at-1 numbering reset. Minor risk if `purchase_amount` is updated between check and delete (mitigated by `FOR UPDATE` lock).
- **How to measure:** post-deploy, count of `is_deleted=true` events on prizma rises as Daniel cleans up; no events with `SUM(purchase_amount) > 0` ever get deleted (RPC enforces).
- **Daniel decision:** **agree** — verbal directive given 2026-05-04 evening; this is condition (a) only ("`purchase_amount=0` is the gate"; testing leads who registered but didn't buy are NOT a blocker, by design).
- **Decided on:** 2026-05-04
- **Applied:** ✅ 2026-05-04 evening by Claude Code (DELETE_EMPTY_EVENT SPEC, 4 commits on develop: `8ab8408` overseer-close + stranded artifacts, `3915721` RPC + migration, `a949d1c` UI button, `6f99adc` retro). Demo smoke test all 3 cases passed: (1) empty event #15 deleted clean; (2) event #17 with 2 attendees → cascaded soft-delete on both; (3) event with `purchase_amount=100` blocked with Hebrew toast. EXECUTION_REPORT: 19✅ + 1⚠️ (criterion 3.13 partial, double-audit issue). FINDINGS: 4 (1 HIGH double activity_log write F1, 1 LOW queue-cancel untested F2, 2 INFO F3+F4). Self-assessment 9/10 SPEC + 10/10 Iron Rules + 9/10 commit hygiene + 10/10 docs.
- **Outcome:** ✅ all SPEC §3 success criteria verified. Predicted impact (clean QA event deletion + B6 unblocked) achieved. Daniel-pleased — proactively asked for follow-up REC-010 (restore-deleted-event UI).

## REC-010 — Add restore-deleted-event UI via activity-logs screen
- **Date submitted:** 2026-05-04 (evening, immediately after DELETE_EMPTY_EVENT smoke test passed)
- **Source signal:** Daniel directive on success of DELETE_EMPTY_EVENT: "בעתיד צריך להוסיף אפשרות שחזור דרך מסך הלוגים." Now that the soft-delete path is live, the inverse (restore) becomes operationally needed — currently restore is admin-via-SQL only.
- **Problem:** soft-deleted events are recoverable in principle (`UPDATE crm_events SET is_deleted=false`) but no UI exposes this. Operators (Daniel) who delete by mistake or want to bring back an archived event must hand-edit the DB.
- **Proposal:** in the activity-logs screen (existing UI), add an "שחזר" button on every row whose action matches the event-delete type. On click → confirm → call new RPC `restore_event` (inverse of `soft_delete_event_if_empty`) which: (1) verifies tenant ownership, (2) sets `crm_events.is_deleted=false`, (3) restores the cascaded attendees that were deleted **at the same timestamp** (use the activity-log entry's timestamp as the restoration scope — only undo what THIS delete-action did), (4) does NOT auto-restore the cancelled message-queue rows (they're stale by then), (5) writes a new activity-log entry of type `crm.event.restore`. The "what got restored together" check is what makes this safe — naive `is_deleted=false` on all attendees of an event would resurrect rows that were independently deleted before the event-level delete.
- **Predicted impact:** zero-click recovery from accidental deletes within the same session. Removes admin-via-SQL friction for the most common reversal scenario.
- **How to measure:** post-deploy, count of `crm.event.restore` activity-log entries grows as Daniel uses the feature; restored events re-appear in events list with their attendees intact.
- **Daniel decision:** **agree** — verbal directive 2026-05-04 evening as a future-SPEC commitment. Not blocking anything operational today.
- **Decided on:** 2026-05-04
- **Applied:** ✅ 2026-05-04 late night (RESTORE_DELETED_EVENT_UI SPEC, 3 commits: 7f8117a backend, 7df4586 frontend, dd5ff21 retro). Approach B (capture attendee_ids in audit-log details, replay on restore) shipped after Foreman scope-correction caught the original timestamp-based approach was infeasible — `crm_event_attendees` has no `updated_at` column. Demo end-to-end round-trip verified by Daniel: create event → 2 attendees → delete → click שחזר → event + attendees back.
- **Outcome:** ✅ verified live. Predicted impact (zero-click recovery from accidental deletes) achieved. Pre-v2 audit log rows restore event-only by design.

## REC-011 — [feature-request] Bump CRM leads tab SERVER_PAGE 200 → 1000
- **Date submitted:** 2026-05-04 late night
- **Source signal:** POST-4 in `project_post_cutover_backlog.md` — Daniel observed only ~4 pages of leads visible at entry; needed ~6 "load more" clicks to see all 1,158 leads.
- **Problem:** Server-page constant set to 200 when the dataset is ~1,158. Daily ops friction (6 clicks to see all leads).
- **Proposal:** 1-line change in `modules/crm/crm-leads-tab.js:31` from 200 to 1000.
- **Predicted impact:** ~1,158 leads in 2 batches instead of 6.
- **How to measure:** open CRM → רשומים tab → 1 click of "load more" reveals all leads.
- **Daniel decision:** **agree** — implicit (POST-4 was already on the backlog, this is the implementation).
- **Decided on:** 2026-05-04
- **Applied:** ✅ 2026-05-04 late night (POST_4_LEADS_PAGINATION_BUMP SPEC, commit `7f02463` + retro, MERGED to main).
- **Outcome:** ✅ verified by Daniel on prizma post-merge.

## REC-012 — [feature-request] Fix partial-Israeli-format phone search regression
- **Date submitted:** 2026-05-04 late night
- **Source signal:** Daniel-reported regression after POST-4 merge: searching `05056` returns nothing; searching `5056` (no leading 0) finds the lead. Expected behavior: both should match a phone stored as `+972505636387`.
- **Problem:** `CrmHelpers.normalizePhone` returns null on partial inputs (e.g. 5-digit `05056`) because it requires exactly 10 digits for Israeli local format. Then `sNorm` is empty, the search falls back to literal substring on the stored E.164 — which never contains `05...` (the 0 was replaced by `+972`).
- **Proposal:** 5-line patch in `modules/crm/crm-leads-tab.js` to add a partial-format helper alongside `sNorm`. Synthesizes `+972 + s.slice(1)` when input is `^0\d+$` length ≥2. Does NOT modify `normalizePhone` itself (other write-path consumers depend on null-on-partial).
- **Predicted impact:** all 4 search formats find the same lead (`0505636387` full local, `+972505...` international, `5056` partial-no-prefix, `05056` partial-with-prefix).
- **How to measure:** 5 manual search variants on prizma after merge.
- **Daniel decision:** **agree** — implicit (regression-fix triggered by Daniel report).
- **Decided on:** 2026-05-04
- **Applied:** ✅ 2026-05-04 late night (PHONE_SEARCH_PARTIAL_FIX SPEC, commit `f13888a` + retro, MERGED to main).
- **Outcome:** ✅ all 5 search variants verified by Daniel on prizma post-merge. Same partial-search bug exists in `crm-incoming-tab.js:109` — logged as INFO finding for future SPEC.

---

## Self-Reviews

### Self-Review #1 — after 10 decided recommendations (2026-05-04 late night)

**Pattern in disagreements (4 of 4 had the same shape):**
- REC-002 (drop 8 vision-questionnaires), REC-005 (drop 8 MultiSale events), REC-006 (drop 587 lead-level eye-exam answers), REC-008 (merge 16 duplicate-email leads) — every one was the Overseer recommending to "remove or clean up" data that looked anomalous on a schema-shape inspection. In each case, Daniel pushed back because the data carried legitimate business meaning the Overseer hadn't checked: questionnaires had no operational purpose in the new system (drop was right but for the wrong reason — the Overseer recommended "preserve via b"), MultiSale events were ~200K NIS of revenue history, lead-level eye-exam is actively written by the live storefront form, duplicate emails reflect couples/parents-with-kids registering together.
- **Common root cause:** the Overseer over-indexes on schema-level signals (counts, uniqueness violations, "stale" labels) without first checking whether the customer-facing or operational flow that produces the data is intentional. The lookup pattern is "look at the table → see anomaly → propose remediation" instead of "look at the storefront form/operator workflow/customer journey first → understand what produces this data → only then evaluate whether it's anomalous."

**Pattern in agreements (6 of 6):**
- REC-001 (stub-create 51 orphan attendees), REC-003 (hybrid synthesize 152 coupon-log rows), REC-004 (drop Monday Category tag), REC-007 (fix-and-import 2 corrupted phones) — all were migration choices where the Overseer's recommendation matched Daniel's operational instincts: preserve customer-relationship data, prefer fidelity over cleanliness, use UTM-based segmentation over legacy tags. **Common shape:** when the Overseer had access to both the data shape AND the business context (via the MAP / live form schemas / cutover discussions), recommendations landed.
- REC-009 (delete-empty-event button) + REC-010 (restore-deleted-event UI) — both were Daniel-proactive feature requests where the Overseer's role was SPEC authoring, not anomaly detection. 100% agree rate on this class.

**Proposed skill adjustments (require Daniel's approval before applying to SKILL):**

1. **Add a "live-flow check" step before any cleanup/remediation REC.** Before recommending action on a data anomaly, the Overseer MUST: (a) identify the customer-facing or operator-facing surface that produces this data (storefront form, CRM admin button, automation rule, EF, Make scenario); (b) read or query that surface to understand what data it produces and why; (c) only then frame the anomaly as "intentional" vs "actually anomalous." This codifies the lesson from REC-002/005/006/008 directly: the problem wasn't the recommendations themselves — the problem was framing data anomalies as cleanup candidates without asking "does this come from a live flow that intentionally produces it?"

2. **Distinguish "anomaly detection" recs from "feature request" recs in REC numbering or labeling.** Daniel-proactive feature requests (REC-009, REC-010) have a 100% agree rate; anomaly-detection recs have 50%. Future Overseer should clearly label which class each REC belongs to, so the rolling acceptance rate is interpretable instead of a noisy aggregate. Daniel can also see at a glance which class an Overseer recommendation falls into.

**Status:** ✅ Daniel APPROVED both 2026-05-04 late night. Codified into `roles/campaign-overseer/LEARNINGS.md` L-005 (Rule A — live-flow check; Rule B — REC class-tagging) as binding-via-LEARNINGS.

---

## Historical Context — preserved from CAMPAIGN_OVERSEER_HANDOFF.md

> This section consolidates every historical/closed block from the Overseer's HANDOFF file. Live-state sections (KPIs with TBDs, 90% gate status, "what to read" bootstrap, recent decisions duplicating the REC list, open recommendations queue) were dropped because the consolidated `opticup-events-operations` skill no longer operates the recommend-only state machine. The historical decisions and project context below are preserved verbatim as the long-term record.

### Open at consolidation (2026-05-21) — `event_registration_open` pricing-block swap

Daniel is swapping the registration-open message preview block from the STOCK page to the PRICING-CATALOG page ("קטלוג המותגים והמחירים"), single button → `/r/CEiBGCWj` (prizma) / demo's own code (demo).

State as of 2026-05-21:
- **SMS** (`event_registration_open_sms_he`): Daniel changed it himself.
- **Email — PRIZMA** (`event_registration_open_email_he`): Daniel applied the new block MANUALLY to prizma himself (urgent — needed to open an event). This is an out-of-band direct prizma edit, NOT via the demo-first flow. Approved copy + drop-in HTML: `roles/campaign-overseer/briefs/2026-05-21_REGOPEN_EMAIL_PRICING_BLOCK_COPY_DRAFT.md` §1.0/§1.4.
- **Email — DEMO:** NOT yet applied. The Overseer brief `roles/campaign-overseer/briefs/2026-05-21_REGOPEN_EMAIL_APPLY_PRICING_BLOCK_OVERSEER_BRIEF.md` covers applying it to demo for parity — but it's BLOCKED until the demo static short-links backfill SPEC (`M4_DEMO_STATIC_LINKS_BACKFILL`) runs, so `/r/<code>` resolves on demo. Until then demo and prizma email bodies will differ.
- **Parity note:** Sentinel Mission 11 may flag demo/prizma divergence on this template within the 24h grace window. That divergence is EXPECTED until the demo apply happens. Do not "fix" prizma back — prizma is the intended new state.
- **Demo static-links backfill:** SPEC authored by Architect (`modules/Module 4 - CRM/architecture-brief/M4_DEMO_STATIC_LINKS_BACKFILL_BRIEF.md`); Foreman pipeline pending run to create the 2 demo rows (stock + pricing-catalog).
- **IR18 tech-debt found by Architect:** `short_links_code_unique` is GLOBAL not tenant-scoped. Documented for a future SPEC; not fixed here.

### READ BEFORE ANY M4 CHANGE — M4_DUAL_PATH_CLEAN_FIX (2026-05-19)

**Required reading (in order):**
1. `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` — variable contract + action contract + status-change architecture + authority boundary. The canonical pre-flight reference for any M4 template/rule edit.
2. `docs/CRM_RULE_CHAINING.md` — how post-action chains work + the Layer 3 self-loop guard.
3. `CLAUDE.md` §6 — Iron Rules 33 (demo-first), 34 (live verification), 35 (Campaign Overseer authority boundary).

**Iron Rule 35 — Authority boundary (added 2026-05-19):**

You MAY edit: template body wording (only with documented placeholders), rule trigger_condition on existing trigger types, broadcast schedules, audience filters, active/inactive flags.

You MUST NOT edit: new `%var_name%` placeholders, new trigger types, new action types, EF code, DB triggers, migrations. → Open an Architect SPEC request.

**Why this exists:** the 2026-05-18→19 M4 repair cascade (5 SPECs + 1 emergency rollback) was triggered by 3 placeholders added to Prizma templates on 2026-04-28 without the resolver being extended. Sentinel Mission 14 now audits this daily.

### Campaign URL Registry

| Asset | URL (HE) | Status |
|---|---|---|
| **SuperSale main page** | https://prizma-optic.co.il/supersale/ | LIVE (HE only) |
| **SuperSale stock page** (live inventory for upcoming event) | https://prizma-optic.co.il/supersale-stock/ | LIVE (HE only) |
| SuperSale models + prices | https://prizma-optic.co.il/supersale-models-prices/ | LIVE (HE only) |
| SuperSale price catalog (secret) | https://prizma-optic.co.il/supersalepricescatalog/ | LIVE (HE only) |
| SuperSale terms | https://prizma-optic.co.il/supersale-takanon/ | LIVE (HE/EN/RU) |
| Successful registration | https://prizma-optic.co.il/successfulsupersale/ | LIVE (HE only) |

EN+RU versions of campaign pages are soft-deleted in `storefront_pages` — campaign assets are HE-only by design.

### Cutover & Migration Roadmap — HISTORICAL (Phases 1-4 ALL CLOSED 2026-05-03)

**Source of truth at the time:** `roles/campaign-overseer/CUTOVER_ROADMAP.md` (issued by Supervisor 2026-05-01).

| Phase | Goal | Final status | Folder |
|---|---|---|---|
| 1 — Verify | Full E2E pipeline + campaigns integration fix | ✅ COMPLETE — 13/14 PASS, V13 deferred | `cutover-roadmap/PHASE_1_VERIFY/` |
| 2 — 7 Decisions | D-1 to D-7 from MAP §5 locked | ✅ COMPLETE — REC-001 to REC-007 logged | `cutover-roadmap/PHASE_2_DECISIONS/` |
| 3 — Wipe + Migrate | Migrate full Monday history; 17 verification queries pass | ✅ COMPLETED 2026-05-03 cutover | `cutover-roadmap/PHASE_3_MIGRATION/` |
| 4 — Cutover + Soak | P5_7 deploy + 48h watch + 7d verification + kill Monday | ✅ COMPLETED | `cutover-roadmap/PHASE_4_CUTOVER/` |

**Phase 2 outcomes summary (full detail in REC-001..REC-007 above):**

| REC | Migration item | Recommended | Daniel | Notes |
|---|---|---|---|---|
| REC-001 | D-1: 51 orphan attendees | (b) stub-create | ✅ agree | 51 stub leads with `legacy_orphan` tag |
| REC-002 | D-2: 8 vision questionnaires | (b) move to client_notes | ❌ disagree → (a) drop | "לא צריך שאלון התאמה" |
| REC-003 | D-3: 179 message markers | (c) hybrid (152 coupon-sent only) | ✅ agree | 152 synthetic message_log rows |
| REC-004 | D-4: 80 Monday Category tags | (a) drop | ✅ agree | UTM-based source identification supersedes |
| REC-005 | D-5: 8 MultiSale events (BLOCKER) | (a) map to SuperSale + tag | ❌ disagree → (d) defer | Post-cutover SPEC: introduce `event_type`, then import |
| REC-006 | D-6: 587 lead-level eye-exam answers | (a) drop | ❌ disagree → (b) keep | Storefront form actively uses this field |
| REC-007 | D-7: 2 corrupted-phone rows | (b) fix-and-import | ✅ agree | Narrow fixup rule: strip leading `972` if 12-digit |

**V10 pre-merge checkpoint (2026-05-02):** QA event #7 (`e05ad4ba-d2c3-4150-b75f-0bcb23ca485f`) on Prizma was used to verify the recipient-resolver fix that unblocked Phase 1 V10. Three QA attendees were seeded (QA-A 0537889878 = registered+coupon → expected receive; QA-B 0503348349 = cancelled+coupon → expected NOT receive; QA-C 0500000003 = registered+no-coupon → expected NOT receive). Verified PR #41 merged to `origin/main` (commit `456bfea`) → `cd2b2f7` recipient-resolver fix live in production.

### Closed SPEC #1 — ATOMIC_CONFIRMATION_FLOW (✅ 2026-05-04)

**Final state:** `automation-engine` v7 ACTIVE on Supabase (CLI deployed, sha256 `80cd8605d74b3f37371a4a5d902155095d10f4d5b60c9354e3624be8949ded79`), zero `[AE-DIAG]` in source.

**Commit chain:**
- `965c76d` — Part A: 3-button modal contract (server + client). EF v5.
- `3e79db9` — Part B.1: diagnostic logging in source. (4× Management API deploy failures; bypassed via CLI to v6.)
- `d8e8f4c` — partial EXECUTION_REPORT (mid-block escalation point).
- `edbe142` — Part B.2: FINDINGS draft (modal-stack race root cause).
- `c474756` + `201bcf6` — Part B.3: Option A `onAfterConfirm` fix (5 callsites). Client-only.
- `fec8b81` — Part B.4: 17 AE-DIAG lines removed. EF v7 via CLI.
- `02920d4` — retrospective close.

**4 findings logged:**
- F1 `M4-CRM-AUTOMATION-CLIENT-01` (CRITICAL → ✅ FIXED) — modal-stack race; root of Bug 2.
- F2 `M4-TOOL-DIAG-01` (MEDIUM) — Supabase MCP `get_logs(service='edge-function')` returns gateway-only logs, not function stdout. Workaround: Studio Logs UI / CLI.
- F3 `M4-DOC-DIAG-01` (LOW) — schema column drift (`crm_automation_runs.created_at`, `crm_message_log.template_slug`).
- F4 `M4-TOOL-DEPLOY-01` (INFO) — Supabase CLI deploys idempotent on byte-identical content.

### Closed SPEC #2 — ATTENDEE_COUNTER_DISPLAY_FIX (✅ 2026-05-04)

All 6 commits on origin/develop. EXECUTION_REPORT + FINDINGS + FOREMAN_REVIEW all present. Counter logic fixed at 4/4 callsites.

### Session Summary 2026-05-04 (M4 cleanup marathon)

**Closed in this session (8 SPECs merged to main):**
- REC-009 phone search Israeli-format normalization (this was an earlier numbering — the live-flow shipped as PHONE_SEARCH_PARTIAL_FIX → REC-012 above)
- REC-010 broadcast 1000-cap fix (paginateQuery helper)
- REC-011 purchase filter + events column + 6 Monday import status repairs
- REC-012 Realtime pilot incoming tab (4-round saga, finally settled on polling)
- REC-016 Rung 2 (5 browser callsites → automation-engine EF) + attendee-move dropdown fix
- 36 stub-orphan leads soft-deleted (kept גולה וורלמוב — paid 8430 ₪)
- 13 legacy SuperSale Make scenarios disabled (Monday pipeline fully decommissioned)
- Plus: WhatsApp QR registration flow (`QUICK_REGISTER_QR_FLOW` SPEC + 3 hotfixes), demo end-to-end smoke test passed.
- Plus: Module 36 cleanup in Make scenario 8464122 (Daniel via Make UI).

**Rung 3 closure note (Make scenario 8464122):** branch `"ברקוד רישום לאירוע - רישום מהיר"` updated via manual Make UI. 3 surgical edits applied:
- Module 213 (HTTP) `event_number` body field → `{{trim(replace(replace(ifempty(1.messageData.textMessageData.textMessage; 1.messageData.extendedTextMessageData.text); "רישום מהיר אירוע"; ""); " "; ""))}}`
- Module 40 (Green-API SendFileByURL) caption → `ברקוד רישום לאירוע {{213.data.event_name}}`
- Module 40 URL → `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={{encodeURL(213.data.url)}}`

**By-design (so future sessions don't re-flag):**
- Email duplication on `crm_leads` is allowed by Daniel directive 2026-05-04 (REC-008). Couples + parents-registering-children share emails; only phone is unique. Do not propose dedup SPECs targeting email field.

### Design System Canon — Sealed 2026-04-28

**Context:** Daniel asked for a design system to be extracted from the existing storefront so future landing pages and emails can be built with one consistent look. Cowork session was temporarily released from Campaign Overseer role to work on this with Daniel directly.

**Outcome:** A canonical design specification was sealed and saved to:
- `roles/campaign-overseer/PRIZMA_DESIGN_SYSTEM_CANONICAL.md` (the canon — single source of truth)
- `roles/campaign-overseer/DESIGN_SYSTEM_EXTRACT.md` (early extraction notes — superseded by the canon, kept for traceability)

**Key decisions sealed:**
- Storefront (`prizma-optic.co.il` main pages) is the visual canon. Campaign pages and emails that diverge are wrong and must migrate.
- Two style modes: Light (white/cream) and Dark (#1a1a1a/black). Same gold + same fonts + same components. Never mixed.
- One gold: `#c9a555` solid + gradient `linear-gradient(135deg, #c9a555 0%, #c9a555 50%, #e8da94 100%)`. Variants `#e8da94` (light, gradient endpoint only) and `#b8943f` (hover).
- One font: Rubik. 4 weights (400/500/700/900). All locales, all surfaces, all emails.
- 4 CTA styles, 1 form style, 3 card styles.
- Heroicons only — no emoji anywhere (including the `👋` in email-welcome.html).
- Three transition timings: 150ms hover / 200ms image / 250ms state.

**Status:** v1.1 sealed AND processed by Claude Design. NOT yet applied to production code at seal time. The canon defines the target state; migration to code happens via SPECs.

**Strategic review:** `DESIGN_SYSTEM_REVIEW.md` (by `opticup-strategic` on 2026-04-28) flagged 8 critical + 10 high issues in v1.0. v1.1 resolved all of them. Key v1.1 corrections: Inter retained for EN/RU; **black text on gold CTAs** (WCAG fix); `#000` named-exception for transactional surfaces; warn (`#b8860b`) + info (`#4a6e8e`) status tokens added; notice-card + steps-list + spinner components defined; SPEC #4 restructured to include Make.com scenario step; tenant variables defined for wordmark and all hardcoded business values; H1/CTA weight reverted from 900 to 700.

**Claude Design output downloaded 2026-04-28:** `Prizma Optic Design System/` folder in `roles/campaign-overseer/` — canon mirror, README, SKILL.md, colors_and_type.css, 20 preview HTML files (one per component), 8 brand silhouette SVGs, transparent Prizma logos, three UI kits (storefront / campaign / email). All on-brand and validated against the canon.

### V2 Email Rebuild — Started 2026-04-28

**Decision (Daniel, 2026-04-28):** rebuild ALL 10 SuperSale email templates as v2 (canon-compliant) BEFORE the M4 P7 cutover (2026-05-03), so the new system goes live with clean templates from day one. No hybrid migration.

**Rebuild output location:** `campaigns/supersale/MESSAGES_V2/`

**Per-template lifecycle:** (1) Overseer presents existing email + recommends changes → (2) Daniel approves/corrects → (3) Overseer logs locked copy in `COPY_DECISIONS_LOG.md` → (4) visual migration spec presented → (5) Daniel approves → (6) Overseer writes the file to `MESSAGES_V2/` → (7) Verification: 0 emoji / 0 old gold `#d4af37` / 18+ new gold `#c9a555` / Heroicons inline / Rubik fallback.

**Final V2 inventory: 9 active email templates** (T10 not migrated by design — Daniel directive: "אני רוצה שימשיכו להירשם לרשימת המתנה. זה לא חכם להשתמש בה."):

| # | New CRM slug | Status |
|---|---|---|
| 1 | `lead_intake_new_email_he` | ✅ DONE 2026-04-28 |
| 2 | `lead_intake_duplicate_email_he` | ✅ DONE 2026-04-28 |
| 3 | `event_will_open_tomorrow_email_he` | ✅ DONE 2026-04-28 |
| 4 | `event_registration_open_email_he` | ✅ DONE 2026-04-28 |
| 5 | `event_invite_new_email_he` | ✅ DONE 2026-04-28 |
| 6 | `event_waiting_list_email_he` | ✅ DONE 2026-04-28 — REVIVED with new purpose (over-capacity confirmation) |
| 7 | `event_invite_waiting_list_email_he` | ✅ DONE 2026-04-28 (system/info tone) |
| 8 | `event_2_3d_before_email_he` | ✅ DONE 2026-04-28 (auto-trigger 3 days before) |
| 9 | `event_day_email_he` | ✅ DONE 2026-04-28 |
| 10 | `event_closed_email_he` | ❌ NOT migrated by design |

**Locked global conventions (apply to ALL templates):**
- Campaign customer-facing name: **"אירוע המותגים"** (NEVER "אירוע המכירות", "SuperSale", "קולקציות")
- Tone: warm, family-feel, never pushy. No exclamation marks except genuine excitement. No "MEGA SALE" pressure language.
- Person: gender-neutral plural ("אתם" / "אליכם" / "תקבלו"). Shop is "אנחנו".
- Emoji: zero (canon §6.4) — all visual symbols come from inline Heroicons SVG.
- Dash style: short hyphen `-` only in customer-facing copy. Em-dash `—` and en-dash `–` are forbidden.
- Wordmark: hardcoded text "PRIZMA OPTIC" + "Luxury Eyewear Events" (NOT image, NOT tenant variables).
- **NO tenant variables (`{{tenant.X}}`):** all Prizma values hardcoded inline. Decision 2026-04-28 — tenant-variables SPEC deferred until tenant 2 onboards.
- Variable syntax: `%name%`, `%phone%`, `%email%`, `%event_*%`, `%registration_url%`, `%unsubscribe_url%` — CRM substitution syntax (NOT `{{...}}`, NOT `<...>`).

**Daniel editorial patterns learned (P1–P7):** see `campaigns/supersale/MESSAGES_V2/COPY_DECISIONS_LOG.md` § "Daniel's Editorial Style — Patterns Learned" before proposing copy.

### SMS Rebuild — COMPLETE 2026-04-28

**Decision (Daniel, 2026-04-28):** rebuild the 9 SMS templates that match the 9 V2 emails (T10 SMS not migrated, same as T10 email). Each SMS mirrors its email counterpart in: campaign name ("אירוע המותגים"), person ("אתם" plural neutral), short hyphen only, message core.

**Status: 9 of 10 lifecycle SMS + 2 manual-move SMS templates = 11 active SMS.** All shipped to `MESSAGES_V2/{slug}.txt`.

**SMS-specific conventions locked 2026-04-28:**
- **Functional emoji ALLOWED** in SMS (✔️ ✅ status, 📅 ⏰ 📍 🚗 📧 nav, 💛 signature). Decorative emoji forbidden (🎉 🥳 🔥 🎁 💎 ⭐ 😍 🥰 ❤️). SMS has no Heroicons substitute; emoji raise CTR; 💛 matches Prizma gold while ❤️ red breaks the palette.
- **Preserve blank-line structure** from legacy SMS (Pattern P8). Each blank line is a soft section break.
- **Always include `להסרה: %unsubscribe_url%`** at the end.

**Foreman feedback round (2026-04-28 evening):** Daniel approved silent-default + opt-in toggle for manual attendee moves. 2 new template pairs authored (UNPAID + PAID) to fire when staff ticks the toggle in the move dialog:
- `event_attendee_moved_unpaid_email_he` + `event_attendee_moved_unpaid_sms_he` — includes payment CTA via new variable `%payment_url_50%`
- `event_attendee_moved_paid_email_he` + `event_attendee_moved_paid_sms_he` — confirms carry-over of paid booking fee

4 files shipped to MESSAGES_V2/. Total V2 inventory: 22 files. New variable `%payment_url_50%` (and future `_75`, `_100`) requires JSONB column on `tenants.payment_links` — Pattern P12 documented (loud failure on missing value).

**New SMS-channel patterns harvested:**
- **P8** — Preserve blank-line structure in SMS (legacy used them as soft section breaks).
- **P9** — Don't use `%name%` in system-wide notifications (only personal/conversational genres).
- **P10** — Hardcoded "50" anywhere is a SaaS bug; use `%event_max_attendees%` (no "כ" prefix — cap is fixed per event). Templates that fire BEFORE a specific event is bound cannot use it; use generic phrasing.
- **P11** — Don't lengthen short status messages (T6 lesson: preserve legacy brevity unless the slot's purpose changed).

**Variables actually used across V2 SMS:**
- `%name%` — T1, T2, T4, T5, T6, T7, T8, T9, moved_unpaid, moved_paid
- `%event_name%` — T4, T5, T6, T7, moved_unpaid, moved_paid
- `%event_date%` — T4, T5, T6, T7, T8, moved_unpaid, moved_paid
- `%event_time%` — T7, T9
- `%event_max_attendees%` — T3, T4, T5, T7
- `%event_deposit_amount%` — T4, moved_unpaid
- `%payment_url_50%` — moved_unpaid
- `%event_day_of_week%` — moved_unpaid + moved_paid (in event card) + T7 + T8 emails
- `%registration_url%` — T4, T5, T7
- `%unsubscribe_url%` — all 11

### P5_V2 Cutover QA Session — COMPLETED 2026-04-29 (merged to main via PR #30)

**Status:** 🟢 **14/14 flows GREEN** end-to-end on Prizma. Merged to main. ERP+Storefront in production.

**SPECs shipped to main this session:**
- **P5_8_INVITED_TO_REGISTERED_TRANSITION** (Fixes A-D bundled):
  - Fix A: `register_lead_to_event` RPC promotes attendees from `invited` → `registered/waiting_list` (was rejecting all `invited`)
  - Fix B: cascade trigger - when lead soft-deleted, attendees auto-soft-deleted
  - Fix C: `dispatchFreshLead` writes `lead.status='invited'` when T5 fires (lands in "רשומים" not "לידים נכנסים")
  - Fix D: event-register EF forwards `event_id` to send-message so substitution layer resolves event-derived vars
- 6 SMS templates shortened to ≤5 parts (Global SMS vendor 404s on >5-part Hebrew messages): T4, T5, T7, T8, `event_registration_confirmation`, `event_attendee_moved_unpaid`
- 4 templates fixed for redundant "אירוע המותגים" before `%event_name%` duplication
- DB+UI delete-lead button + duplicate-check filter `is_deleted=false`
- Phone display format: `%phone%` renders as Israeli local (`0537889878`), not E.164 (`+972...`)

**Bug findings during QA (all fixed inline):**
- Empty-email lead-intake EF accepts (now rejects 400)
- ON CONFLICT spec mismatch on attendee upsert
- queue_send was double-suffixing template slug
- send-message EF didn't inject basic event vars for server-side callers
- Make scenario 9104395 hardened: maxErrors 3→50, DLQ enabled (after Global SMS 404 batch caused silent halt)

**Daniel-directed deferrals (post-cutover backlog):**
- Storefront same-domain spam routing (events@→daniel@ same domain) — research/SPF/DKIM
- `registration_method='form'` misattribution on dispatch-created attendee rows (data integrity, not blocking)
- Architectural: send-message EF should mark `status='queued_at_make'` not `'sent'` until vendor confirms delivery (Make→Supabase callback) — false-positive in DB
- Backend SMS length guard (reject >5 parts at EF before Make)
- `event_registration_confirmation_sms_he` hardcoded values (phone, location) → tenant variables when SaaS adds them

### Pre-Cutover SPECs Remaining (DECIDED 2026-04-29)

**Cutover target at the time:** Saturday or Sunday 2026-05-02 or 2026-05-03 (after the SuperSale event).

**Two SPECs MUST land before cutover (in order):**

**SPEC #1 — P5_7_STOREFRONT_FORM_REWIRE**
- Path: `modules/Module 4 - CRM/go-live/specs/P5_7_STOREFRONT_FORM_REWIRE/SPEC.md`
- Purpose: rewire storefront SuperSale form from current `/api/leads/submit` → `cms_leads` legacy path TO the new `lead-intake` Edge Function so customer-form leads enter the V2 pipeline (instead of Monday).
- Includes part A from P5_5: strong client-side validation (phone `05XXXXXXXX`, email regex)
- Includes part B from P5_5: phone normalization client-side (any input → `+972XXXXXXXXX` before POST)
- Order: First — must land before P5_6 because P5_6 protects the EF that P5_7 connects to.

**SPEC #2 — P5_6_BOT_PROTECTION**
- Path: `modules/Module 4 - CRM/go-live/specs/P5_6_BOT_PROTECTION/SPEC.md` + `ACTIVATION_PROMPT.md`
- 4-layer bot protection on lead-intake:
  - Layer 1: Honeypot field (free, immediate)
  - Layer 2: Cloudflare Turnstile (free CAPTCHA, low UX friction)
  - Layer 3: IP-based rate limiting (5 leads/hour per IP)
  - Layer 4: Daily SMS budget cap per tenant (default 200)
- Order: Second — after P5_7. Layers 1+2 must ship pre-cutover. Layers 3+4 may ship within 7 days post-cutover.

### Daniel's Manual QA Backlog — 2026-05-01 (CLOSED — all 12 B-items shipped via 3 SPECs)

Surfaced by Daniel during a manual QA pass after the P23–P35 cycle landed. **All 12 B-items closed late evening 2026-05-01** via 3 SPECs:

| SPEC | Slug | Items |
|---|---|---|
| A | `PRE_CUTOVER_QA_A_DATA_AND_LOGIC` | B4, B5, B6, B7, B8, B11, B12 |
| B | `PRE_CUTOVER_QA_B_FORM_AND_TEMPLATE` | B1, B2 |
| C | `PRE_CUTOVER_QA_C_UI_CLEANUP` | B3, B9, B10 |

**B-items briefly (for historical context):**
- **B1** — Eye-exam options on auto-event-registration form (4-option list).
- **B2** — Visual redesign of the registration form (light background, more beautiful).
- **B3** — Date format DD/MM/YYYY across the entire CRM.
- **B4** — Lead status MUST NOT flip when event status → "ייפתח מחר".
- **B5** — "Refund completed" status update path verification.
- **B6** — Event numbering restarts from 1 + accommodates Monday import (preserve original IDs 13-23).
- **B7** — Default Waze URL when not set per-event (`https://waze.com/ul/hsv8s5h2c3`).
- **B8** — Day-of-week field on events + auto-substitute in templates. **B8 hot-fix shipped 2026-05-01:** off-by-one bug — `new Date(ymd + 'T00:00:00+03:00').getUTCDay()` returned previous calendar day. Fixed in `modules/crm/crm-helpers.js` + `supabase/functions/send-message/event-variables.ts`. `send-message` EF redeployed v15→v16.
- **B9** — Remove "Multisale" entirely (~3 active references, 0 active code coupling).
- **B10** — Per-event-status colors + admin settings UI (schema ready: `crm_statuses.color` exists).
- **B11** — Verify campaign sync works end-to-end (storefront ↔ CRM ↔ Make ↔ vendors).
- **B12** — Data migration completeness check before Monday→OpticUp cutover (cutover-day gating step).

**Recon findings that shaped the SPECs:**
- **B4 root cause:** `crm-automation-post-actions.js` `promoteWaitingLeadsToInvited()` ran unconditionally after every dispatch. Only skipped when `skip_auto_promote` flag was set, which the seed rule for `will_open_tomorrow` didn't have. Fix: add the flag to the rule's `action_config`.
- **B6 RPC analysis:** `next_crm_event_number` uses `MAX(event_number) + 1` with `FOR UPDATE` lock on the campaign row. To support Monday-import preservation, added sibling RPC `next_crm_event_number_for_import` respecting an explicit number when provided.
- **B8 confirmed wired:** `%event_day_of_week%` IS already injected in `event-variables.ts:89-91` via `hebrewDayOfWeek()` helper. Only UI field + template audit pass needed.
- **B9 scope LOW:** Only ~3 active references (1 seed row in `crm_campaigns` + ~3 doc files). 0 active code coupling.
- **B10 schema ready:** `crm_statuses` table already has a `color` column. NO DDL needed.

### Tech-debt logged during 2026-04-30 supersale-stock work

- **T-DEBT-A:** `src/styles/supersale-stock.css` is 409 lines (was 396 pre-existing, +13 from this addition). CSS hard max per CLAUDE.md §5 is 250; verify script enforces 350. Split into supersale-stock-grid.css, -card.css, -mobile.css, -lightbox.css. Pre-existing — not introduced by this task.
- **T-DEBT-B:** Doc/script drift on file-size threshold. CLAUDE.md §5 says 250 lines hard max for CSS; `scripts/verify.mjs` enforces 350. Reconcile to one number across both spec and tooling.

### M4 cleanup marathon — additional context (2026-05-04 late night)

**Multi-tenant URL strategy for quick-register EF (open):** `STOREFRONT_URL` hardcoded + storefront `tenantSlug` defaults `prizma`. Single-tenant safe today; promote to `tenants.config` when tenant 2 onboards.

**Module 36 (Monday legacy) cleanup in scenario 8464122:** ✅ CLOSED 2026-05-04 by Daniel via Make UI (separate from Cowork session). The dangling Monday module was removed; flow now: filter → SetVar → HTTP module 213 → router → module 40. `MAKE_8464122_MODULE_36_CLEANUP` SPEC document retained for historical reference but execution N/A.

**Activity-log table name discrepancy:** surfaced during REC-009 smoke test — `crm_activity_log` does not exist as a table; SPEC referenced wrong name. Resolved in DELETE_EMPTY_EVENT FINDINGS F3 as INFO. Cross-SPEC consistency check flagged for future FOREMAN_REVIEW.

**DELETE_EMPTY_EVENT F1 — HIGH double activity-log write:** RPC inserts an activity-log row, but `ActivityLog.write` on the JS side ALSO fires on the soft-delete callback path. Result: 2 activity-log rows per delete instead of 1. Follow-up SPEC needed to dedupe — RPC preferred per defense-in-depth.

---

## Going forward — REC-013+

New events-operations decisions continue from REC-013. The consolidated skill operates directly with Daniel (no recommend-only gate, no 90% acceptance threshold). The schema above still applies; the class-tag discipline (`[anomaly-detection]` / `[feature-request]`) continues; live-flow check (L-005 Rule A in `roles/campaign-overseer/LEARNINGS.md`) continues to apply before any cleanup-class action.

---

## SESSION HANDOFF — SuperSale "אירוע השקת קולקציות" launch campaign (2026-05-22)

**Status: launch landing page LIVE on production. Three tasks remain before Sunday's send.**

### The campaign (context)
- Open event: **"אירוע המותגים - מאי 2026"**, id `2e39e884-9811-4b6c-88d0-0699f85ce1b3`, status `registration_open`, **Friday 29.5**, Ashkelon branch, 50 cap, ₪50 booking fee.
- The problem driving everything: **funnel gap**. ~18 attendees registered vs **1,137 leads invited-and-not-registered** (708 `waiting` + 429 `invited` + 24 `confirmed`). The campaign's job is to convert those 1,137 with a Sunday→Monday push.
- Concept (Daniel-approved): position 29.5 as an **"אירוע השקת קולקציות"** (collections launch event), driven by a dedicated landing page.

### DONE this session
1. **Landing page LIVE:** `https://prizma-optic.co.il/supersale-launch/` (storefront route `src/pages/supersale-launch/index.astro` + `src/data/supersale-launch.json` + `src/components/SupersaleLaunchCard.astro`). Merged to main via PR #28 (prod deploy `feaae0c`). 4 build rounds (commits 5d6b047 → e35ac6b → 7a9e9a4 → 36e3ba3 → merge).
   - 3 tabs: **בתי אופנה נבחרים** / **קולקציות יוקרה** / **שאלות ותשובות**. Each product tab has a **שמש/ראייה** sub-toggle.
   - Fashion: 56 sun (Prada/MiuMiu/Tiffany/Versace/Ray-Ban, prices 890/690/400, struck = final+100 round-up-50) + 56 reading (15 brands incl Gucci/Dior/Saint Laurent/Etnia/Mykita/Porsche/Swarovski, NO price, badge "1+1 על מותגים נבחרים").
   - Luxury: 32 sun + 32 reading (John Dalia/Cazal/KameManNen/Matsuda/Fred, NO price, badge "הטבות אירוע בלעדיות"). Subtitles GENERIC (no brand names listed).
   - Lightbox (2-angle nav), hover-swap, brand-spread, all images via `/api/image/` same-origin proxy.
   - CTA = **WhatsApp only** → `wa.me/972533645404` (053-364-5404) with prefilled msg ending tag `[הגעתי מעמוד ההשקה]` so branch staff identify source + send the personal reg link manually (per-lead short links r/CODE; no single reg URL).
   - Price label = **"מחיר אירוע"** (NOT "השקה" — future clearance sales). Event-name title kept.
   - Legal pledge (vetted): "קונים באירוע עם מנגנון התחייבות למחיר הזול בישראל - מצאתם את אותו הדגם בזול יותר ברשת אחרת בישראל? הראו לנו תוך 14 ימים מהקנייה ותקבלו את ההפרש!" + "בכפוף לתקנון" link. (Consumer-protection: absolute "cheapest" claim is unsafe; mechanism+takanon-link framing is defensible. Ties to takanon §5 14-day guarantee.)
   - FAQ: coupon-only realization, limited coupons sent ≤48h after final reservation, hundreds-of-shekels extra benefits for pre-registered only, walk-in allowed (free-coupon basis, no extra benefits — framed to push registration), 1+1 reading + lens benefits (single-vision + multifocal).
2. **Price update 790→890** applied to ALL live supersale pages (`/supersale/`, `supersale`, `/successfulsupersale/` [= the THANK-YOU page, not historical], `/supersalepricescatalog/`) in he/en/ru — campaign_price + headline text. Backup table `_backup_supersale_pages_20260522` (12 rows). Verified 0 remaining 790; 0 original_price=790 touched.

### PROGRESS UPDATE (2026-05-23 — end of session 2)

**DONE since the original handoff:**
- ✅ **708 flip done.** `waiting`→`invited` on Prizma. Verified no automation fires (only active lead-status rule reacts to entering `waiting`, not invited). Backup table `_backup_leads_waiting_to_invited_20260522`. Audience now **1,142 `invited`** (was 708+434).
- ✅ **Landing page /supersale-launch/ LIVE on prod** — fully iterated (v2→v12, PRs #28–#32). Final state: 56 fashion-sun (price tiers interleaved with NATURAL scatter — cheap anchor in first row, see [[feedback_price_anchor_visible_first]]) + 56 fashion-reading (1+1 badge, 15 mixed brands incl Gucci/Dior/SaintLaurent/Etnia/Mykita/Porsche/Swarovski — Valentino/Kenzo/Fendi/Armani/Celine/JimmyChoo removed as stale) + 32 luxury-sun + 32 luxury-reading. "מחיר אירוע" label (not "השקה"). ₪890 cards show "למשריינים מראש: 840 ש"ח" (₪890 tier only, no asterisk). 12 FAQ alternating gold/white incl 3 "final-punch" Qs (brand-event uniqueness, lab/remote→eye-exam-at-event+home-delivery-2-3-days, lens benefits). Badge text centered. Takanon link in pledge + brand-event FAQ. Coupon-limit FAQ kept (2 sun + 2 reading frames).
- ✅ **Wave-1 templates created in BOTH demo + prizma, byte-identical (md5 verified).** Slugs `supersale_launch_teaser_email_he` + `supersale_launch_teaser_sms_he`. **CRITICAL DISPATCH NOTE: queue with BASE slug `supersale_launch_teaser`** — the dispatcher appends `_<channel>_<language>` itself. Queuing the full slug → `template_not_found`. (Learned the hard way this session.)
- ✅ **Test send verified on demo** — email+SMS delivered to Daniel's lead. Two gotchas hit & cleared: (a) Daniel's email+phone were in `crm_suppressions` (reason user_unsubscribed, backfill 2026-05-22) → had to delete demo suppression rows to deliver; (b) base-slug issue above.
- ⚠️ **Suppression check done on Prizma: only 4 of 1,142 invited are suppressed** → ~1,138 will actually receive Wave 1. Good coverage.

### REMAINING (next session)
1. **🔴 SEND WAVE 1 (Sunday) — everything is ready, only the send is left.** Email+SMS to the 1,142 invited (≈1,138 deliverable). Templates exist in prizma. Queue with BASE slug `supersale_launch_teaser`. **MANDATORY: show Daniel the exact recipient count and get explicit in-chat approval BEFORE triggering the broadcast** — this is the highest-blast-radius action in the campaign. Daniel wants it sent Sunday morning (schedule scheduled_at accordingly). The SMS contains a raw landing URL — consider a short r/ link before the real send (bot-click hygiene).
2. **Build Wave 2 (Monday eve) + Wave 3 (Wednesday).** Daniel's framing: Mon = "מקומות אחרונים" (last spots / urgency). Wed = "התפנו מקומות מביטולים ברגע האחרון" (cancellations freed up spots). Same flow: author HTML/SMS → visual preview for Daniel → Claude Code creates templates demo→prizma (Iron Rule 33) → test on demo → send with count-approval. (Daniel originally said Sun/Mon/Tue; latest is Sun/Mon/Wed — confirm.)
3. **Measurement loop:** business-state metrics (registrations created, not clicks). Define baseline now (current registered count) vs after each wave; log results here.
4. **Side-bug to file:** `promote-config-to-prizma.mjs` audit-log write returns PGRST204 — `crm_audit_log.actor` column missing/renamed. Promotion itself works; audit logging silently fails. Open a ticket.

### Workflow established this session (reuse it)
- Daniel runs NOTHING himself — Events-Ops executes all SQL + Vercel via connectors ([[feedback_events_ops_i_run_everything]]).
- Claude Code handoffs use BRIEF + separate ACTIVATION_PROMPT files in `campaigns/supersale/sketches/` ([[feedback_events_ops_brief_activation_workflow]]). Large/escaping-sensitive DB writes + storefront git ops go to Claude Code, not Cowork SQL (Cowork truncated the email file once).
- Storefront edits: Cowork authors brief → Claude Code edits /supersale-launch/ on develop → auto Vercel preview → Daniel approves → Daniel merges PR to main (Daniel-only).
- Visual preview before every approval (rendered, never raw HTML).

### Key facts for any new session
- Prizma tenant `6ad0781b-37f0-47a9-92e3-be9ed1477e1c`; demo `8d8cfa7e-ef58-49af-9702-a862d459cccb`. Test phones ONLY 0537889878 / 0503348349.
- WhatsApp branch number: **053-364-5404** (972533645404).
- Storefront prices live in `storefront_pages.blocks` JSONB (NOT in src). Inventory final price = `sell_price * (1 - sell_discount)`; `sell_discount`=0.40 fraction.
- Schema gotchas hit this session: `crm_message_templates.slug` (not template_slug); `crm_automation_rules` uses `trigger_entity`+`trigger_event`; inventory split sun/eye via `product_type` ('sunglasses'/'eyeglasses').

---

*End of EVENTS_OPS_DECISIONS_LOG.md. Migrated from `roles/campaign-overseer/DECISIONS_LOG.md` + `CAMPAIGN_OVERSEER_HANDOFF.md` on 2026-05-22. Both source files deleted in the same commit after the migration was verified entry-by-entry.*
