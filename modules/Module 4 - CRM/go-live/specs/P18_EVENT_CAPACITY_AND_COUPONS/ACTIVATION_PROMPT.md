# Claude Code — Execute P18 Event Capacity & Coupons SPEC

> **Machine:** Windows desktop
> **Repo:** opticalis/opticup
> **Branch:** develop
> **Skill:** Load `opticup-executor`

---

## Context

P18 implements the 3-tier event capacity model: `max_capacity` (exists),
`max_coupons` (new), `extra_coupons` (new). Adds coupon ceiling enforcement
to the event-day coupon send button, adds the coupon fields to the create
event form, and adds a waiting-list invite button + extra coupons editor
to the event detail page.

**SPEC location:** `modules/Module 4 - CRM/go-live/specs/P18_EVENT_CAPACITY_AND_COUPONS/SPEC.md`

**Known untracked:** SPEC folders from prior SPECs may be untracked. Ignore
them, use selective `git add` by filename.

---

## Pre-Flight

1. Session start protocol (CLAUDE.md §1) — verify repo, branch, pull latest
2. Read the SPEC fully
3. **Schema check:** Verify `max_coupons` and `extra_coupons` do NOT exist yet:
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'crm_events' AND column_name IN ('max_coupons','extra_coupons');
   ```
   Expected: 0 rows.
4. **Check `default_max_coupons` in campaigns:**
   ```sql
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'crm_campaigns' AND column_name = 'default_max_coupons';
   ```
   Expected: 0 rows.
5. Start `localhost:3000`, verify CRM loads
6. **Only approved phones:** `+972537889878`, `+972503348349`

**If pre-flight passes → GO.**

---

## Execution Sequence

### Track A — Migration (1 commit)

1. Apply migration via `apply_migration`:
   - Name: `add_max_coupons_and_extra_coupons_to_events`
   - SQL: see SPEC §2A
2. Verify columns exist with correct defaults
3. Commit: `feat(crm): add max_coupons and extra_coupons to events schema`

**Checkpoint 1:** Report migration results.

### Track B+C — Form + Enforcement (1 commit)

1. Edit `crm-event-actions.js`:
   - Add `default_max_coupons` to `loadCampaigns` SELECT
   - Add "כמות קופונים" input to `renderCreateForm` (3-col grid)
   - Add `max_coupons` to `createEvent` row object
   - Add campaign-change handler for `max_coupons`
   - Add `max_coupons` to form data extraction
2. Edit `crm-event-day.js`: add `max_coupons, extra_coupons` to event SELECT
3. Edit `crm-event-day-manage.js`:
   - Before `sendCouponToAttendee` UPDATE, add ceiling check
   - Count `coupon_sent && status !== 'cancelled'` vs `max_coupons + extra_coupons`
   - If at ceiling → `Toast.error(...)` and return
4. Test: create event with `max_coupons=2`, try to issue 3 coupons → 3rd blocked
5. Commit: `feat(crm): coupon ceiling enforcement + create form field`

### Track D+E — Event Detail UI (1 commit)

1. Edit `crm-events-detail.js`:
   - Add `max_coupons, extra_coupons` to `fetchDetail` SELECT
   - Add coupon info cell to header info grid
   - Add "הגדר קופונים נוספים" button/edit
   - Add "שלח הזמנה לרשימת המתנה" button (visible when waiting-list exists)
   - Wire the extra-coupons edit (prompt or inline input → UPDATE)
   - Wire the waiting-list invite button (use existing automation rules or
     broadcast wizard targeting)
2. Commit: `feat(crm): event detail coupon info, extra edit, waiting-list invite`

---

## Key Rules

- **Only approved phones** for any SMS test
- **Rule 12:** all files ≤ 350 lines
- **Rule 14+15:** new columns, not new tables — no RLS changes needed
- **Rule 11:** no new sequential numbers
- **Rule 22:** all writes include `tenant_id`
- **Clean ALL test data** at end

---

*End of ACTIVATION_PROMPT — P18_EVENT_CAPACITY_AND_COUPONS*
