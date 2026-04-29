# P23.1 — Move "no_refund_due" from payment_status enum to a boolean column

> **Status:** authored 2026-04-29 by opticup-strategic (Foreman) at Daniel's request
> **Origin:** P23 FOREMAN_REVIEW Finding 1 (CRITICAL). Daniel chose Route B (boolean column) over Route A (enum extension).
> **Module:** 4 — CRM
> **Position in roadmap:** fast-follow to P23. NOT a cutover blocker.
> **Why Route B:** keeps `payment_status` clean as a money-state machine; "no refund due" is a managerial decision flag, not a money state. Adding it to the enum would conflate two different concepts.

---

## 1. Goal

Replace the broken `payment_status='no_refund_due'` design from P23 with a dedicated boolean column `no_refund_due_marked` on `crm_event_attendees`. The cancel UX shipped in P23 already reaches this code path; this SPEC swaps the underlying field and the read sites — zero new UX, zero new buttons.

UI presentation (per Daniel's call): when `no_refund_due_marked=true`, attendee row shows BOTH the existing `payment_status='paid'` pill (primary) AND a small chip "🚫 לא מגיע החזר" (secondary). Money state stays visible; the management decision stacks on top.

---

## 2. Background — Live State Probed 2026-04-29

### 2.1 Current state on develop HEAD

- P23 commits all landed; cancel dialog UX is live for 3 paths (unpaid → cancel; paid+refund → cancel+refund_requested; paid+no-refund → silently 400s).
- The "לא מגיע החזר" path writes `payment_status='no_refund_due'` (`crm-attendee-cancel.js:123`) but the DB rejects it.
- 0 rows in `crm_event_attendees` have `payment_status='no_refund_due'` (CHECK constraint blocks all writes — confirmed via `SELECT count(*) WHERE payment_status='no_refund_due'` → 0).
- `payment_status` CHECK constraint enumerates exactly 7 values: `pending_payment`, `paid`, `unpaid`, `refund_requested`, `refunded`, `credit_pending`, `credit_used` (verified via `pg_constraint`).
- `STATUS_LABELS` and `STATUS_COLORS` in `crm-payment-helpers.js` already have `no_refund_due` entries (lines 18, 28). Will need to be removed.
- `_renderInfoLine()` in `crm-payment-helpers.js:95-97` reads `payment_status === 'no_refund_due'`. Will need to read the new column.
- `v_crm_event_attendees_full` does NOT include `payment_status` filtering, but it also does NOT currently expose `no_refund_due_marked`. Will need to add the column to the view.

### 2.2 Sites that will need updating

- `crm-attendee-cancel.js:123` — the UPDATE that sets `payment_status='no_refund_due'`. Must change to `no_refund_due_marked: true`.
- `crm-payment-helpers.js:18` — `STATUS_COLORS.no_refund_due` entry. Remove.
- `crm-payment-helpers.js:28` — `STATUS_LABELS.no_refund_due` entry. Remove.
- `crm-payment-helpers.js:95-97` — `_renderInfoLine` branch. Replace `payment_status === 'no_refund_due'` with `attendeeRow.no_refund_due_marked`.
- `crm-payment-helpers.js` `renderStatusPill()` — verify it's not affected by removing the slug.
- `v_crm_event_attendees_full` view — add `a.no_refund_due_marked`.
- Every read site that fetches `payment_status` for the cancel/refund flow — add `no_refund_due_marked` to the SELECT projection. Identify via grep.

### 2.3 Current line counts (verifier method)

| File | Lines (verifier) | Note |
|---|---|---|
| crm-attendee-cancel.js | 142 | likely 0 net change |
| crm-payment-helpers.js | 282 | -2 net (remove 2 enum entries, +1 chip-rendering helper) |
| crm-dashboard.js | 336 | likely 0 change |
| crm-event-day-coupon.js | 141 | 0 change |

No file is at risk of exceeding 350 with this SPEC.

### 2.4 Reproduce-the-bug evidence

```sql
SELECT pg_get_constraintdef(oid) FROM pg_constraint
 WHERE conrelid='public.crm_event_attendees'::regclass AND contype='c';
-- → CHECK ((payment_status = ANY (ARRAY['pending_payment'::text, 'paid'::text, 'unpaid'::text, 'refund_requested'::text, 'refunded'::text, 'credit_pending'::text, 'credit_used'::text])))

SELECT count(*) FROM crm_event_attendees WHERE payment_status='no_refund_due';
-- → 0
```

The CHECK constraint blocks the value; no rows currently use it. Migration is forward-only; no data migration needed.

---

## 3. Success Criteria — Each Measurable

| # | Criterion | Expected | How to verify |
|---|---|---|---|
| 1 | New column `crm_event_attendees.no_refund_due_marked BOOLEAN NOT NULL DEFAULT false` exists | row in information_schema.columns | `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_schema='public' AND table_name='crm_event_attendees' AND column_name='no_refund_due_marked'` returns 1 row with expected types |
| 2 | New column `crm_event_attendees.no_refund_due_marked_at TIMESTAMPTZ` exists, nullable | row in information_schema | similar query |
| 3 | RLS policy `tenant_isolation` on `crm_event_attendees` still in force; no new policy added | `SELECT policyname FROM pg_policies WHERE tablename='crm_event_attendees'` returns existing set unchanged | DB |
| 4 | `payment_status` CHECK constraint UNCHANGED — still exactly the 7 original slugs | `pg_get_constraintdef` returns the same string as in §2.4 | DB |
| 5 | View `v_crm_event_attendees_full` exposes both new columns | `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='v_crm_event_attendees_full' AND column_name IN ('no_refund_due_marked','no_refund_due_marked_at')` returns 2 rows | DB |
| 6 | `STATUS_LABELS` and `STATUS_COLORS` in `crm-payment-helpers.js` no longer contain `no_refund_due` | grep returns 0 hits | `grep -n "no_refund_due" modules/crm/crm-payment-helpers.js` should match only the new boolean-driven render code, NOT label/color tables |
| 7 | `crm-attendee-cancel.js` no-refund-due path UPDATE writes `no_refund_due_marked=true` and `no_refund_due_marked_at=now()`; does NOT touch `payment_status`; does NOT touch `attendee.status` | grep + DB query post-action | code review + smoke |
| 8 | `_renderInfoLine` in `crm-payment-helpers.js` shows the same Hebrew text "לא מגיע החזר — ביטול ללא זיכוי" but is gated on `attendeeRow.no_refund_due_marked` instead of `payment_status === 'no_refund_due'` | grep | `grep -A 2 "no_refund_due_marked" modules/crm/crm-payment-helpers.js` |
| 9 | NEW: `renderStatusPill` (or a new helper next to it) returns the existing pill PLUS a chip "🚫 לא מגיע החזר" when `attendee.no_refund_due_marked=true`. The chip is rendered as a sibling element, NOT a replacement of the primary pill | DOM check after marking | smoke |
| 10 | Every existing call site that renders the payment pill receives the boolean and renders the chip when true | grep all `renderStatusPill` callers; verify each was updated to pass the attendee row OR a flag | code review |
| 11 | Banner logic in `crm-dashboard.js` is UNCHANGED (still surfaces `refund_requested` count). Confirm `no_refund_due_marked=true` rows do NOT show in the banner | static review | code review |
| 12 | Every UPDATE that touches `no_refund_due_marked` also includes `tenant_id` filter (Rule 22) | grep on commit diff | code review |
| 13 | Smoke test: clicking "לא מגיע החזר" on a paid attendee NOW succeeds (returns 204, not 400) | network log | DevTools |
| 14 | Smoke test: after marking, the row shows green "שולם" pill PLUS gray "🚫 לא מגיע החזר" chip | DOM | manual |
| 15 | Smoke test: coupon count (X / Y) does NOT change after marking — coupon NOT freed | live count comparison | manual |
| 16 | Smoke test: legacy "מגיע החזר" panel path still works (regression) — does NOT set the new boolean | DB query post-action | manual |
| 17 | Smoke test: cancel-unpaid and cancel-paid+refund-due paths still work (regression) | end-to-end | manual |
| 18 | Migration is reversible — provide a `down.sql` that drops both new columns + recreates the view without them | file exists | filesystem check |
| 19 | All commits on `develop`, repo clean at end | `git status` = "nothing to commit" | shell |
| 20 | Zero console errors during smoke testing | DevTools console | manual |

---

## 4. Autonomy Envelope

**Executor MAY without asking:**

- Author the migration SQL file (Level 3 — schema change). Daniel will run it manually OR authorize the executor to run it. Default: write the SQL, do not execute it; let Daniel run.
- Update `v_crm_event_attendees_full` view to include both new columns. (Views are recreated, not altered — `CREATE OR REPLACE VIEW`.)
- Modify `crm-attendee-cancel.js` no-refund-due UPDATE to write the boolean instead of the payment_status value.
- Remove `no_refund_due` from `STATUS_LABELS` and `STATUS_COLORS` in `crm-payment-helpers.js`.
- Update `_renderInfoLine` to read the boolean.
- Add a `renderNoRefundDueChip(attendee)` helper next to `renderStatusPill` in `crm-payment-helpers.js`.
- Update every call site that renders the payment pill to also render the chip when the boolean is true. List sites via `grep -n "renderStatusPill" modules/crm/`.
- Run all smoke scenarios on demo tenant.

**Executor MUST stop and ask:**

- If running the migration is required by the executor (Daniel did not run it manually) — STOP and ask explicitly: "Daniel, ready for me to run the migration SQL? Y/N." This is Level-3 authority per CLAUDE.md.
- If the view recreation surfaces unexpected dependencies (other views or RPCs that depend on it). Pre-flight grep should catch this.
- If the grep for `renderStatusPill` callers returns more than 5 sites (large blast radius — better to centralize the chip rendering inside the existing pill renderer rather than touch many sites).
- If `no_refund_due` appears in any DB row anywhere (impossible given §2.4, but verify before authoring the DOWN migration).

**Executor MAY NOT under any circumstances:**

- Touch `payment_status` CHECK constraint (must remain exactly the 7 original slugs).
- Add a new `payment_status` value.
- Modify `markRefundRequested`, `markRefunded`, `openCredit`, or any other existing payment-helper function's behavior.
- Use `--no-verify` on any commit.
- Skip the regression smoke (§3 #16, #17).

---

## 5. Stop-on-Deviation Triggers

| Trigger | Action |
|---|---|
| Migration SQL fails on demo when Daniel runs it | STOP — investigate; do not proceed to UI changes |
| `pg_constraint` shows `payment_status` CHECK constraint changed (more or fewer than 7 values) after migration | STOP — migration was wrong; rollback |
| View recreation produces a different column set than expected | STOP — investigate `v_crm_event_attendees_full` consumers |
| `grep -rn "no_refund_due" modules/` finds matches outside the 4 expected sites (cancel.js:123, payment-helpers.js:18, 28, 95-97) | STOP — there are other consumers; reconcile before changing |
| Smoke test: clicking "לא מגיע החזר" still returns 400 after migration | STOP — something else is wrong (possibly a pre-existing constraint we missed) |
| Smoke test: marking the boolean ALSO triggers a status change on the attendee | STOP — there's a hidden trigger; investigate before continuing |
| Pre-commit gate fails on any commit | STOP — do not `--no-verify`; report |

---

## 6. Out of Scope (Explicit)

- Backfilling existing attendees with the new boolean (default `false` is correct for all existing rows; nothing to backfill).
- Reporting/analytics changes (no dashboard update for "how many marked no-refund-due"). If Daniel later wants visibility, separate SPEC.
- Audit log of who marked the boolean and when (`no_refund_due_marked_at` is the timestamp; no `no_refund_due_marked_by` column — out of scope, can be added later).
- Removing `no_refund_due` from any HISTORICAL git commit messages or code comments.
- The events-detail cancel button (still deferred to P23.2).
- The 4 remaining `tid()` collisions (still deferred to P23.3).
- The verifier line-count discrepancy (still deferred — Finding 2 from P23 review).

---

## 7. Expected Final State

**DB:**
- `crm_event_attendees` has 2 new columns: `no_refund_due_marked BOOLEAN NOT NULL DEFAULT false`, `no_refund_due_marked_at TIMESTAMPTZ NULL`.
- `payment_status` CHECK constraint unchanged.
- `v_crm_event_attendees_full` view exposes both new columns.
- 0 rows currently have `no_refund_due_marked=true` (default false applies).

**Files modified:**
- `modules/Module 4 - CRM/migrations/2026_04_29_no_refund_due_boolean_up.sql` (new)
- `modules/Module 4 - CRM/migrations/2026_04_29_no_refund_due_boolean_down.sql` (new)
- `modules/crm/crm-attendee-cancel.js` (~1 line changed)
- `modules/crm/crm-payment-helpers.js` (~−5 / +10 net: remove 2 enum entries, repoint 1 branch to boolean, add chip helper)
- All `renderStatusPill` call sites that need to also render the chip (TBD via grep, expected ≤3)

**Behavior:**
- "לא מגיע החזר" button on cancel dialog now succeeds (was 400, becomes 204).
- Attendee row shows BOTH the existing payment_status pill AND the new chip when boolean is true.
- Coupon stays unfreed (no change from P23 design).
- Existing flows untouched.

---

## 8. Commit Plan

| # | Commit | Files | Note |
|---|---|---|---|
| 1 | `migrations(crm): add no_refund_due_marked boolean column` | up.sql + down.sql | Level-3; Daniel's call whether to run via MCP or manual |
| 2 | `feat(crm): expose no_refund_due_marked in v_crm_event_attendees_full` | (DB-only — same migration if combined; otherwise separate small SQL file) | Recreate the view to include the new columns |
| 3 | `refactor(crm): swap no_refund_due payment_status to boolean column` | crm-attendee-cancel.js, crm-payment-helpers.js | Removes the dead enum entries, repoints UPDATE + read |
| 4 | `feat(crm): show chip alongside payment pill when no_refund_due_marked` | crm-payment-helpers.js (chip helper) + N call sites | Stacked rendering — pill stays primary, chip secondary |
| 5 | `chore(crm): MODULE_MAP + CHANGELOG for P23.1` | module docs | Integration ceremony |

Migration commits 1+2 may be combined into a single SQL file if simpler. Executor's call.

**No `--no-verify`. No exceptions.**

---

## 9. Rollback Plan

P23.1 has DDL — rollback is more complex than P23:

1. **Code rollback:** revert commits 5 → 4 → 3 in reverse. The "לא מגיע החזר" button reverts to writing `payment_status='no_refund_due'` (broken, but matches pre-P23.1 state).
2. **DB rollback:** run `down.sql` (drop both columns, recreate view without them). 0 data lost (all existing rows have default `false` for the boolean).
3. **Net result of full rollback:** identical to immediate-post-P23-merge state. The "לא מגיע החזר" button silently 400s again until a different fix ships.

---

## 10. QA Plan (executor on demo tenant)

| # | Scenario | Setup | Action | Expected |
|---|---|---|---|---|
| 1 | Migration smoke | Pre-migration baseline `count(*) FROM crm_event_attendees WHERE no_refund_due_marked=true` errors with "column does not exist" | Run migration | Post-migration: same query returns 0 |
| 2 | View update | `SELECT no_refund_due_marked FROM v_crm_event_attendees_full LIMIT 1` errors pre, succeeds post | Run migration | Returns `false` for all rows |
| 3 | Mark no-refund-due | Paid attendee on a registration_open event | Click "בטל" → "לא מגיע החזר" | Network log shows PATCH 204 (was 400 before P23.1); DB row has `no_refund_due_marked=true`, `no_refund_due_marked_at` set, `payment_status='paid'` UNCHANGED, `attendee.status` UNCHANGED |
| 4 | Visual stacked rendering | Same attendee post-action | Reload event-day | Row shows green "שולם" pill + gray "🚫 לא מגיע החזר" chip side-by-side or stacked |
| 5 | Coupon unchanged | Same attendee | Check coupon count "X / Y" before vs after marking | Count unchanged (boolean does not free coupon — by design) |
| 6 | Regression: cancel unpaid | Pending_payment attendee | Click "בטל" → confirm | Works as before; `status='cancelled'`, no boolean touched |
| 7 | Regression: cancel paid + refund | Paid attendee | Click "בטל" → "מגיע החזר" | Works as before; `status='cancelled'`, `payment_status='refund_requested'`, no boolean touched |
| 8 | Regression: legacy refund panel | Paid attendee | Open payment panel via pill click → "מגיע החזר" | Works as before; `payment_status='refund_requested'`, `attendee.status` unchanged, no boolean touched |
| 9 | Banner unchanged | After Scenario 7 | Open dashboard | Banner shows `refund_requested` count; no_refund_due_marked rows NOT counted |
| 10 | Iron Rule 22 | Network tab | All scenarios | Every UPDATE/INSERT carries `tenant_id` |
| 11 | Console clean | All scenarios | DevTools | Zero errors |

**QA TENANT OVERRIDE (Daniel directive 2026-04-29):** run QA on **Prizma**, not demo. Prizma has no real customer traffic yet, and Daniel wants to verify the production-shape rendering. Only touch test contacts:
- Phone: `0537889878` or `0503348349`
- Email: `daniel@prizma-optic.co.il`

Do NOT touch any other Prizma attendee/lead. If a scenario can't be reproduced with the test contacts, STOP and ask Daniel.

---

## 11. Lessons Already Incorporated

- **CHECK-constraint pre-flight** (P23 FOREMAN_REVIEW Author Proposal 1, applied here): §2.4 ran `pg_constraint` query and confirmed exactly the 7 slugs; this SPEC's foundation is correct because of the explicit verification.
- **Verifier-method line counts** (P23 FOREMAN_REVIEW Author Proposal 2, applied here): §2.3 used `node -e "split('\\n').length"`, not `wc -l`. Headroom math is honest.
- **Cross-Reference Check** (Rule 21): grepped `no_refund_due_marked` across the repo — 0 collisions. New column name unique.
- **Per-consumer enumeration** for `renderStatusPill`: SPEC notes the grep is required pre-coding (§4 envelope). The chip-stacking decision goes to the helper, not to N caller sites, IF callers are >5.
- **Reversibility**: down.sql is a hard requirement (§3 #18). Schema changes always paired with a tested rollback.
- **Out-of-scope explicit**: 5 specific exclusions in §6 prevent scope creep.

---

## 12. After Execution

The executor writes:
- `EXECUTION_REPORT.md` — what was done, commits, deviations
- `FINDINGS.md` — anything observed but out-of-scope

Foreman then writes `FOREMAN_REVIEW.md` per Post-Execution Review Protocol.

---

*End of SPEC.md*
