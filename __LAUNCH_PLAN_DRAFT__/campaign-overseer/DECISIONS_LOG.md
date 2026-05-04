# Campaign Overseer — Decisions Log

> **Purpose:** structured record of every recommendation the Overseer has made + Daniel's decision. This file IS the data behind the 90%-agreement gate.
> **Authority:** the Overseer writes here; Daniel speaks decisions verbally → Overseer marks them.
> **Mode:** v1 (yes/no/partial only). Will upgrade to v2 (+ prediction quality) after 30+ decided recommendations.
> **Last meaningful update:** 2026-05-02 evening (Phase 2 D-1 logged + decided)

---

## Schema (every recommendation MUST follow)

```markdown
## REC-{NNN} — {one-line title}
- **Date submitted:** YYYY-MM-DD
- **Source signal:** what data/observation surfaced this
- **Problem:** the issue in plain Hebrew, 1-2 sentences
- **Proposal:** the concrete change, in plain Hebrew, specific enough to implement without further questions
- **Predicted impact:** numerical or qualitative
- **How to measure:** what data point will confirm or refute
- **Daniel decision:** PENDING / agree / disagree / partial — + brief reason
- **Decided on:** YYYY-MM-DD
- **Applied:** PENDING / YYYY-MM-DD by {who}
- **Outcome (v2 gate input):** PENDING / measured value vs predicted
```

---

## Stats summary (auto-recalculate on every update)

- **Total recommendations submitted:** 8
- **Total decided:** 8 (agree: 4 / disagree: 4 / partial: 0)
- **Total applied:** 0
- **Rolling 30-rec acceptance rate:** N/A (need ≥10 decided to begin reporting; current = 4/8 = 50%)
- **Mode:** RECOMMEND-ONLY (v1)
- **Status toward graduation:** baseline collection — 8 of 30 decisions in. Pattern emerging across REC-002, REC-005, REC-006, REC-008: when the Overseer recommends action on apparent data anomalies, Daniel pushes back when the "anomaly" is actually legitimate real-world behavior the business depends on. The Overseer (me) over-indexes on schema-level signals (counts, uniqueness violations, "stale" labels) without first checking whether the customer-facing flow that produces the data is intentional.

---

## Recommendations

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
- **Outcome (v2 gate input):** PENDING — verify after migration: count of `legacy_orphan`-tagged leads = 51 ± 0.

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
- **Outcome (v2 gate input):** N/A — option (a) means nothing to verify post-migration beyond "no client_notes prefix exists for these 8".

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
- **Outcome (v2 gate input):** PENDING — verify post-migration counts match (152 ± 0).

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
- **Outcome (v2 gate input):** N/A — drop has no measurement requirement.

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
- **Outcome (v2 gate input):** PENDING — verify cutover-day import excludes the 8 MultiSale rows; verify post-cutover SPEC closes successfully and the 8 events are imported under the new event_type construct.

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
- **Outcome (v2 gate input):** PENDING — verify post-migration: column exists on `crm_leads`; 587 historical answers populated; lead-intake EF persists the form's answer to the new column.

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
- **Outcome (v2 gate input):** PENDING — verify both leads imported with normalized phones.

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
- **Outcome (v2 gate input):** N/A — decision was "do nothing", no measurement needed.

**Overseer self-note:** I had verified the data shape (8 emails / 16 leads / 4 patterns) before recommending, which was correct per L-001. But I framed all 16 rows as "candidates for cleanup" by default, instead of asking Daniel first whether multi-person email is even an anomaly to him. This is the same pattern as REC-002 ("drop questionnaire data"), REC-005 ("drop MultiSale events"), and REC-006 ("drop lead-level eye-exam answers") — over-indexing on data-shape anomalies without checking the live business context. Lesson: when a data shape looks like a violation, ask "does the business want this preserved?" BEFORE proposing a cleanup.

---

## Self-Reviews

(written by the Overseer after every 10 decisions — see SKILL §8)

When entries arrive, format:

```markdown
### Self-Review #{N} — after {N*10} decided recommendations (YYYY-MM-DD)

**Pattern in disagreements:**
- {observation 1}
- {observation 2}

**Pattern in agreements:**
- {observation 1}

**Proposed skill adjustments (require Daniel's approval before applying):**
1. {proposal}
2. {proposal}
```

(none yet)

---

*End of DECISIONS_LOG.md.*
