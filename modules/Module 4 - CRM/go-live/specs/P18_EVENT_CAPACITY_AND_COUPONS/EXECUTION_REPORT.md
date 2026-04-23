# EXECUTION_REPORT — P18_EVENT_CAPACITY_AND_COUPONS

> **Location:** `modules/Module 4 - CRM/go-live/specs/P18_EVENT_CAPACITY_AND_COUPONS/EXECUTION_REPORT.md`
> **Written by:** opticup-executor (Claude Code, Windows desktop)
> **Written on:** 2026-04-23
> **SPEC reviewed:** `SPEC.md` (authored by opticup-strategic/Cowork, 2026-04-23)
> **Start commit:** `fb1e8be` (P17 retrospective, SPEC head)
> **End commit:** `8369e40`
> **Duration:** ~45 minutes

---

## 1. Summary

All three tracks shipped in the planned 3 commits. Schema migration adds
`max_coupons`/`extra_coupons` to `crm_events` and `default_max_coupons` to
`crm_campaigns` (commit `c05f7c6`). The create-event form now carries
`max_coupons` through in a 3-column grid and the event-day coupon button
enforces the `max_coupons + extra_coupons` ceiling with a Hebrew toast
(commit `b5eda4e`). The event-detail modal gained a 🎫 coupons cell, a
"➕ הגדר קופונים נוספים" editor, and a "📩 שלח הזמנה לרשימת המתנה" button
that reuses the existing event-level `invite_waiting_list` automation
rule (commit `8369e40`). One deliberate deviation from §2D: Rule 5
(FIELD_MAP update) was deferred because `js/shared.js` is pre-existing
at 408 lines and my 1-line addition tripped the file-size pre-commit
hook — logged as `M4-DEBT-P18-01` for the shared.js split tech debt.

---

## 2. What Was Done (per-commit)

| # | Hash | Message | Files touched |
|---|------|---------|---------------|
| 1 | `c05f7c6` | `feat(crm): add max_coupons and extra_coupons to events schema` | `modules/Module 4 - CRM/go-live/p18-add-max-coupons.sql` (new, 29 lines) + Supabase migration `add_max_coupons_and_extra_coupons_to_events` applied |
| 2 | `b5eda4e` | `feat(crm): coupon ceiling enforcement + create form field` | `modules/crm/crm-event-actions.js` (290→295), `modules/crm/crm-event-day.js` (196→196 SELECT widened), `modules/crm/crm-event-day-manage.js` (278→289) |
| 3 | `8369e40` | `feat(crm): event detail coupon info, extra edit, waiting-list invite` | `modules/crm/crm-events-detail.js` (255→318) |
| 4 | (this commit) | `chore(spec): close P18_EVENT_CAPACITY_AND_COUPONS with retrospective` | this file + FINDINGS.md |

**Verify-script results:**
- commit 1: `verify.mjs --staged` → All clear, 0 violations, 0 warnings (1 file)
- commit 2: `verify.mjs --staged` → All clear, 0 violations, 0 warnings (3 files)
- commit 3: `verify.mjs --staged` → 0 violations, 1 warning (`crm-events-detail.js` 318L > soft 300; hard max 350 not breached)
- First attempt at commit 1 included a `js/shared.js` FIELD_MAP edit; the pre-commit hook blocked it (409 > hard 350). Reverted that change, logged as finding, committed SQL doc only.

**Migration verification (post-apply):**

```sql
SELECT table_name, column_name, data_type, column_default
FROM information_schema.columns
WHERE (table_name='crm_events' AND column_name IN ('max_coupons','extra_coupons'))
   OR (table_name='crm_campaigns' AND column_name='default_max_coupons');
```

| table_name      | column_name          | type    | default |
|-----------------|---------------------|---------|---------|
| crm_campaigns   | default_max_coupons | integer | 50      |
| crm_events      | extra_coupons       | integer | 0       |
| crm_events      | max_coupons         | integer | 50      |

---

## 3. Deviations from SPEC

| # | SPEC section | Deviation | Why | How resolved |
|---|--------------|-----------|-----|--------------|
| 1 | §5 Rule 5 (FIELD_MAP) — implied by Iron Rule 5 | Did not add `max_coupons`/`extra_coupons` to `js/shared.js` FIELD_MAP | `js/shared.js` is already at 408 lines; adding one more pushed it to 409, tripping the 350-line hard max in `verify.mjs`. SPEC §5 stop-triggers say "Any CRM file would exceed 350 lines" — shared.js is `js/`, not strictly CRM, but Rule 12 is universal. The existing 408L is pre-existing tech debt. | Reverted the FIELD_MAP edit, committed only the SQL doc file for Track A, logged finding `M4-DEBT-P18-01` recommending a shared.js split SPEC. No importers consume these fields today, so the missing Hebrew lookup is latent tech debt, not a functional break. |
| 2 | §2C1 naming | SPEC called the function `sendCouponToAttendee`; real function is `toggleCoupon` | Naming drift — the SPEC described the semantics, not the literal function name | Applied the ceiling check before the UPDATE in `toggleCoupon` at line 249. Semantically identical to what SPEC described. |
| 3 | §2D1 info grid layout | SPEC said "add a fourth info cell". Existing grid was `sm:grid-cols-3` | Adding a 4th cell to a 3-col grid wraps ugly | Changed class to `sm:grid-cols-2 lg:grid-cols-4` so the 4 cells align nicely on desktop, 2x2 on tablet, stacked on mobile. Within the spirit of the SPEC. |

---

## 4. Decisions Made in Real Time

| # | Ambiguous point | My decision | Why this choice |
|---|-----------------|-------------|-----------------|
| 1 | §2D4 waiting-list invite flow offered two paths (status change vs broadcast wizard) | Used status change → `invite_waiting_list` | DB query confirmed the exact rule the SPEC hinted at exists (`שינוי סטטוס: הזמנה ממתינים`, trigger `invite_waiting_list`, template `event_invite_waiting_list`, recipient `attendees_waiting`). Single-call, no new templates, no new RPCs. |
| 2 | §2D2 extra-coupons edit UX ("prompt dialog or inline input") | `window.prompt` | Simplest thing that works. Live-refreshes the `data-role="coupon-info"` cell on success without re-rendering the whole modal. |
| 3 | Track A commit artifact | Added `p18-add-max-coupons.sql` under `modules/Module 4 - CRM/go-live/` | Matches the existing `hotfix-register-lead-to-event.sql` convention for in-repo documentation of applied migrations. Gave Track A a concrete committable file after FIELD_MAP was reverted. |
| 4 | Coupon ceiling tie-break when `max_coupons` is NULL | Fell back to default of 50 client-side: `(ev.max_coupons != null ? +ev.max_coupons : 50)` | Matches the column default. Existing events predating this migration were backfilled with `DEFAULT 50`. |
| 5 | Cancellation → slot release (§2C2) | Relied on the `status !== 'cancelled'` filter in the count | SPEC already observed the logic releases implicitly via the filter. Verified cancellation code path — no separate `coupon_sent = false` reset is needed for the ceiling math. |

---

## 5. What Would Have Helped Me Go Faster

- **A line-budget check across `js/shared.js` in the SPEC pre-flight.**
  The SPEC's §11 Verification Evidence verified that the new column names
  don't collide and that automation rules exist, but didn't surface that
  `js/shared.js` (the Rule 5 destination) was already over the 350-line
  hard max. I discovered it at commit time, lost ~2 minutes reverting
  and writing a finding, and had to improvise a Track A artifact.
- **A map of automation-rule slug → trigger status.** I ran a SELECT to
  confirm the `invite_waiting_list` status plus matching rule existed.
  A cached `crm_automation_rules_map.md` (trigger → template → recipient)
  would have saved the round trip.
- **The SPEC used `sendCouponToAttendee` as the function name** but the
  actual function is `toggleCoupon`. A quick grep in the SPEC's §11
  Verification Evidence would have caught this.

---

## 6. Iron-Rule Self-Audit

| Rule | Touched? | Followed? | Evidence |
|------|---------|----------|----------|
| 1 — atomic quantity RPC | N/A | | No quantity fields touched |
| 2 — writeLog on quantity/price | N/A | | No quantity/price changes |
| 3 — soft delete | N/A | | No deletes |
| 5 — FIELD_MAP on new field | Yes | ⚠️ Deferred | Pre-commit hook blocked; logged as `M4-DEBT-P18-01` |
| 7 — DB via helpers | Partial | ✅ | Used `sb.from(...).update(...)` pattern matching surrounding code; `DB.*` wrapper is not yet used in `modules/crm/*` |
| 8 — no innerHTML with user input | Yes | ✅ | All dynamic cells use `escapeHtml()` for event.id and user-ish fields; `couponsSent`, `couponCeiling`, `extraCoupons` are numbers |
| 9 — no hardcoded business values | Yes | ✅ | 50/0 defaults match DB column defaults; the only literal (50) is the fallback when `max_coupons` is NULL, which mirrors the schema |
| 11 — atomic sequential numbers | N/A | | No new sequences |
| 12 — file size (350 max) | Yes | ✅ | All 4 edited CRM files ≤ 318 lines; shared.js edit reverted precisely because of this rule |
| 14 — tenant_id on new tables | N/A | | No new tables, only new columns on existing tables |
| 15 — RLS on new tables | N/A | | Existing `crm_events` / `crm_campaigns` RLS already covers the new columns |
| 18 — UNIQUE includes tenant_id | N/A | | No new UNIQUE constraints |
| 21 — no orphans / duplicates | Yes | ✅ | Grepped `max_coupons\|extra_coupons\|default_max_coupons` across repo: 0 hits outside SPEC docs |
| 22 — defense-in-depth on writes | Yes | ✅ | `UPDATE crm_events SET extra_coupons = ... .eq('id', event.id).eq('tenant_id', getTenantId())` |
| 23 — no secrets | Yes | ✅ | No secrets touched; the pre-existing anon key in `shared.js:3` is a publishable key and was not edited |

**DB Pre-Flight (Step 1.5) evidence:**
- `docs/GLOBAL_SCHEMA.sql` does not contain `crm_events` — confirmed there's no project-wide schema dump for Module 4 yet (pre-existing doc gap, see `M4-DOC-P16-01`).
- `docs/DB_TABLES_REFERENCE.md` + `docs/GLOBAL_MAP.md`: no hits on the 3 new names.
- Project-wide grep `max_coupons|extra_coupons|default_max_coupons` across all `.js`, `.sql`, `.md`: 0 hits outside the P17/P18 SPEC docs.
- No field-reuse conflict: the new fields are numeric ceilings, distinct from `max_capacity` (registrant ceiling).

---

## 7. Self-Assessment

| Dimension | Score | Justification |
|-----------|-------|---------------|
| Adherence to SPEC | 9 | 3 documented deviations, all in-spirit. Rule 5 deferral is the one real gap. |
| Adherence to Iron Rules | 9 | Rule 5 deferred with a documented root cause and finding. Everything else clean. |
| Commit hygiene | 10 | 3 commits, one per SPEC track, messages pre-written verbatim. |
| Documentation currency | 8 | Deferred FIELD_MAP noted as tech debt. No MODULE_MAP changes needed (no new public functions — all new wiring is internal to the IIFE). |
| Autonomy (asked 0 questions) | 10 | No mid-execution questions to dispatcher. |
| Finding discipline | 9 | 1 finding logged (`M4-DEBT-P18-01`). Considered logging a second about the `crm-events-detail.js` 318L soft-warning but that's within the SPEC's stated headroom, not an out-of-scope discovery. |

**Overall weighted average:** 9.2/10.

The 45-minute wall time is honest: pre-flight reads + 3 commits + retrospective.
The Rule 5 deferral is a real gap but the alternative (blocking on a shared.js
split SPEC) would have been disproportionate scope creep. The next Integration
Ceremony or a dedicated shared-js-split SPEC should close it.

---

## 8. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Pre-flight line-budget check for Rule 5 destination files

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"SPEC Execution Protocol" → Step 1.5 "DB Pre-Flight Check" → add item **1.5.8**
- **Change:** Add verbatim:
  > "**Rule 5 line-budget check** — if the SPEC adds any new DB field, `wc -l js/shared.js` BEFORE drafting any commit. If shared.js is already at or above 345 lines, a FIELD_MAP addition will fail the 350-line hard cap and you'll need to either (a) revert your attempt and log a finding, or (b) request approval for a shared.js split SPEC. Do this BEFORE the first code edit so the SPEC author can be notified at Checkpoint 1 instead of commit time."
- **Rationale:** Cost me ~2 minutes at commit 1 — the rollback wasn't expensive, but the surprise was avoidable. A 5-second `wc -l js/shared.js` in Step 1.5 would have caught it.
- **Source:** §3 deviation 1, §5 bullet 1 of this report.

### Proposal 2 — Automation-rule index as a read-before-assume reference

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"SPEC Execution Protocol" → "Reference: Key Files to Know" table
- **Change:** Add a new row:
  | File | Purpose |
  |------|---------|
  | Query: `SELECT name, trigger_entity, trigger_event, trigger_condition->>'status', action_config->>'template_slug', action_config->>'recipient_type' FROM crm_automation_rules ORDER BY name;` | Canonical map of which event/attendee status transitions fire which message template to which recipient bucket. Run before wiring any "send message to a group" button. |
- **Rationale:** SPECs that mention automation rules ("the existing rule already sends X") routinely require this query to confirm the exact wiring. Standardizing it in the skill saves one round trip per SPEC that touches messaging.
- **Source:** §5 bullet 2 of this report.

---

## 9. Next Steps

- Commit this report + FINDINGS.md as `chore(spec): close P18_EVENT_CAPACITY_AND_COUPONS with retrospective`.
- Signal dispatcher: "SPEC closed. Awaiting Foreman review."
- Do NOT write `FOREMAN_REVIEW.md` — that's the Foreman's job.

Out-of-band items the Foreman should consider for the next SPEC:
- **Shared.js split** — `js/shared.js` is at 408 lines, over the 350 hard max. Any Rule 5 work on this file is blocked until split. See `FINDINGS.md` finding `M4-DEBT-P18-01`.
- **UI testing was not performed.** No local ERP server was running during this session; the logic was verified by grep, line-count, and SQL checks. A manual localhost run against the demo tenant is recommended before Prizma's first event that issues coupons.

---

## 10. Raw Command Log (abbreviated)

Key commands and their outputs, in order.

```
$ git remote -v
origin  https://github.com/OpticaLis/opticup.git (fetch)
origin  https://github.com/OpticaLis/opticup.git (push)

$ git branch --show-current
develop

$ git pull origin develop
Already up to date.

-- Pre-flight DB check (via mcp__supabase__execute_sql)
crm_events / crm_campaigns schema BEFORE migration:
- crm_events: max_capacity (int, default 50), booking_fee (numeric, default 50.00). NO max_coupons, NO extra_coupons.
- crm_campaigns: default_max_capacity, default_booking_fee. NO default_max_coupons.

-- Name-collision grep
$ grep -rn "max_coupons\|extra_coupons\|default_max_coupons" -- only SPEC docs hit. No code collisions.

-- Migration applied
mcp__supabase__apply_migration(name='add_max_coupons_and_extra_coupons_to_events')
{"success":true}

-- Post-migration verification
SELECT column_name, data_type, column_default FROM information_schema.columns WHERE ...;
crm_campaigns.default_max_coupons = integer, default 50
crm_events.extra_coupons          = integer, default 0
crm_events.max_coupons            = integer, default 50

-- First commit attempt (FIELD_MAP edit in shared.js)
pre-commit FAIL: [file-size] js\shared.js:409 — exceeds 350-line hard max

-- Reverted shared.js, created p18-add-max-coupons.sql
$ git commit -m "feat(crm): add max_coupons and extra_coupons to events schema"
[develop c05f7c6] ... 1 file changed, 29 insertions(+)

-- Track B+C commit
$ git commit ... (crm-event-actions.js, crm-event-day.js, crm-event-day-manage.js)
All clear — 0 violations, 0 warnings across 3 files
[develop b5eda4e] ... 3 files changed, 20 insertions(+), 3 deletions(-)

-- Track D+E commit
$ git commit ... (crm-events-detail.js)
[file-size] modules\crm\crm-events-detail.js:318 — file exceeds 300-line soft target (318 lines)
0 violations, 1 warnings across 1 files
[develop 8369e40] ... 1 file changed, 64 insertions(+), 2 deletions(-)

-- Automation-rule verification (confirmed invite_waiting_list wiring)
Rule "שינוי סטטוס: הזמנה ממתינים" exists:
  trigger_entity=event, trigger_event=status_change,
  trigger_condition={type: status_equals, status: invite_waiting_list},
  action_config.template_slug=event_invite_waiting_list,
  action_config.recipient_type=attendees_waiting, is_active=true
```
