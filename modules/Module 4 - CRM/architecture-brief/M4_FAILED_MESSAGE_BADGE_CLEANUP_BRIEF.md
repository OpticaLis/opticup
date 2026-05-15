# M4_FAILED_MESSAGE_BADGE_CLEANUP — Architecture Brief (Revised)

**Type:** Feature SPEC + targeted historical cleanup. Combines two outcomes:
1. **Feature** — staff-facing "acknowledge" mechanism for failed message badges, both per-lead (small × on ⚠️) and bulk (via the "הודעות כושלות (N)" chip).
2. **Cleanup** — apply the new mechanism to the 758 specific failed rows from broadcast `ab7341c9` (2026-05-13) so the current visible badge state clears.

**Context:** Daniel reviewed the Bundle 2 T1.1 escalation this morning. Event #24 was deliberately closed (deferred). All 758 customers received a follow-up SMS that succeeded. The failures are historical noise. Daniel's directive (verbatim):

> "אני רוצה שיהיה כפתור שאוכל ללחוץ עליו ולנקות את הסימונים גם. זאת המטרה בסופו של דבר. עדיין יהיה אפשר לראות את הכשלונות בהיסטוריה, אבל הסימון הזה אפקטיבי רק לרגע שהכישלון קורה. אחרי זה הוא כבר לא אפקטיבי"

**Design decisions baked in (Daniel + Architect, 2026-05-15):**
- **Option C** — both bulk-clear (via the chip) AND per-lead × (next to the ⚠️). Same underlying mechanism.
- **Option A** — full audit trail (`acknowledged_by`, `acknowledged_at`, optional `acknowledged_reason`) visible in the per-lead history view.
- Per-lead history view STILL shows the failed message row with full original detail (status='rejected', error_message, timestamp). Only the BADGE rendering filters by `acknowledged_at IS NULL`.

---

## 1. Phase 0 — Diagnostic (mandatory before any UPDATE or code change)

**Foreman MUST establish, in this order, before sealing the SPEC:**

1. **Where the badge value comes from.** Two leading hypotheses:
   - **D1**: live-aggregate query — counts `crm_message_log` rows WHERE `status='rejected'` (or similar) AND `lead_id=current_row.id`. Badge appears whenever count > 0.
   - **D2**: cached column on `crm_leads` — e.g. `failed_message_count` populated by a trigger or background process.
   - Foreman MUST grep `crm.html` + `js/crm*.js` for the badge rendering code path. Identify EXACTLY which SQL produces the badge count and which DB column/query feeds it.

2. **Where the chip "הודעות כושלות (N)" comes from.** Likely the same source as per-lead badges or a SUM over it. Confirm.

3. **What `status` values qualify as "failed"** in those queries. The 758 rows are `status='rejected'`. Badge query might match broader set (`'rejected','failed','undelivered'`). Document all.

4. **Permission model for the new "acknowledge" action.** Today's CRM permission tags relevant to this:
   - Read existing `crm.view`, `crm.edit`, or whatever the canonical CRM permission keys are. Foreman picks the most appropriate existing key OR introduces a new `crm.message.acknowledge` key if no existing key fits cleanly.

**Step 0 output:** "Where the badge comes from" + "Permission model" sections in the SPEC.md before sealing. If badge logic is unclear OR mixes multiple sources OR Foreman can't identify it within 45 min — STOP, write escalation.

---

## 2. Scope — what gets built

### 2.1 DB schema additions

Add THREE columns to `crm_message_log` (additive, NULL-able):

- `acknowledged_at timestamptz NULL` — when the badge was cleared. NULL = active failure.
- `acknowledged_by uuid NULL` — FK to `auth.users(id)` (or whatever existing user-identity FK pattern the project uses — Foreman picks the canonical pattern).
- `acknowledged_reason text NULL` — optional staff note (e.g. "user got follow-up SMS").

Indexed: `(tenant_id, acknowledged_at)` composite for the badge-query filter performance.

### 2.2 Badge query update

Per Phase 0 path:

- **If D1 (live aggregate):** the COUNT queries that drive (a) the per-lead ⚠️ badge and (b) the chip "הודעות כושלות (N)" both gain a `WHERE acknowledged_at IS NULL` clause. Per-lead history view query DOES NOT add this filter (history always shows everything).
- **If D2 (cached column):** the trigger/process that maintains the cached count is updated to ignore rows where `acknowledged_at IS NOT NULL`. The 758 affected leads' cached counts get recomputed once after the historical UPDATE in §2.4.

### 2.3 UI — two acknowledge surfaces

**Surface 1 — per-lead small × on ⚠️:**

The existing ⚠️ badge in the leads board (visible in Daniel's screenshot, e.g. `אבי 1 ⚠️`) gains a small × icon. Clicking the × triggers a confirm dialog ("לסמן את N ההודעות הכושלות של [lead] כמטופלות?") → on confirm, calls a new RPC to acknowledge ALL the lead's unacknowledged failed messages.

**Surface 2 — bulk via the chip:**

The "הודעות כושלות (N)" chip in the leads board gains a clickable affordance. Clicking opens a modal:
- Shows a paginated list of all unacknowledged failed messages (lead name + phone + timestamp + error_message + broadcast_id if any).
- Each row has a checkbox.
- "Select all" + "Select all from broadcast X" filter shortcuts.
- "סמן כמטופלות" button at bottom → on confirm, calls the same RPC for the selected message_log_id set.

Both surfaces call ONE RPC: `acknowledge_failed_messages(p_message_log_ids uuid[], p_reason text DEFAULT NULL)`.

### 2.4 RPC — `acknowledge_failed_messages`

New `SECURITY DEFINER` RPC, JWT-claim-validated tenant isolation (per Iron Rule 15 canon + SECURITY_HOTFIX_2026_05_13 hardening: `SET search_path='public'`):

```
acknowledge_failed_messages(
  p_message_log_ids uuid[],
  p_reason text DEFAULT NULL
) RETURNS jsonb
```

- Validates user's tenant_id against each `crm_message_log.tenant_id` for the ids — refuses cross-tenant.
- Validates user has the appropriate permission (per Phase 0 decision).
- UPDATEs only rows where `acknowledged_at IS NULL` (idempotent — re-running is a no-op for already-acknowledged rows).
- Sets `acknowledged_at = now()`, `acknowledged_by = auth.uid()` (or whatever the canonical user-id source is), `acknowledged_reason = p_reason`.
- Returns `{updated_count, skipped_count, errors}`.

### 2.5 Per-lead history view

When viewing a single lead's message history (existing view, whatever it's called), the failed message rows display:
- Full original detail (timestamp, error_message, body, etc.) — UNCHANGED.
- IF `acknowledged_at IS NOT NULL`: a small "מטופל" tag showing `acknowledged_at` + `acknowledged_by` (display name) + `acknowledged_reason` if present.

### 2.6 One-time historical cleanup (the 758 rows)

After the mechanism is live and tested on demo, run the acknowledge mechanism on the 758 specific Prizma rows from broadcast `ab7341c9`:
- Use the existing backup at `modules/Module 4 - CRM/docs/specs/M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA/BACKUP_758_ROWS.json` for the row_id list.
- Acknowledge with `acknowledged_reason = 'broadcast_predates_BROADCAST_EVENT_LINK_SUPPORT_2026_05_13_followup_sms_delivered'`.
- `acknowledged_by` = Daniel's user_id (Foreman queries the canonical user identifier).
- Verify chip count drops from current to 2 (the 2 unrelated leftovers).

---

## 3. Out of scope

- Re-sending any message (Daniel: customers already received follow-up).
- Closing/opening event #24 (deliberately closed).
- Acknowledging the 2 unrelated leftover failures (separate incidents — not Daniel-authorized in this SPEC).
- Acknowledging failures across other tenants (this SPEC's historical cleanup is Prizma + the 758 row_ids only).
- Bulk auto-acknowledge by age (e.g. "auto-clear failures older than 30 days"). Future feature, separate SPEC.
- Un-acknowledge / undo. Out of scope. If someone acknowledges by mistake, they can re-investigate via the history view, and future SPEC can add un-acknowledge if needed.
- Showing acknowledged failures in a "history of cleared failures" filter chip. Future enhancement.

---

## 4. Critical Design Constraints

**SaaS-clean (Iron Rules 14, 15, 18, 20):**
- 3 new columns are additive on the existing tenant_id-scoped table.
- New RPC follows canonical JWT-claim pattern + `SET search_path='public'`.
- Permission key is configurable; future tenants can grant/revoke independently.

**Forward-compat (FUNNEL_ROADMAP Phase 4):**
- The `acknowledged_at` pattern is a generic "ack-on-noise" mechanism. Future Phase 2.5 Funnel Health Dashboard can filter failure rates by `acknowledged_at IS NULL` (true active failures) vs `IS NOT NULL` (handled). Better signal-to-noise.

**Backward compatibility:**
- 3 NULL-able columns — every existing query unaffected.
- Badge query gains 1 WHERE clause — backward compatible.
- Per-lead history view UNCHANGED (acks displayed only if present).

**Performance:**
- Per-lead × click: UPDATE on a few rows (typically 1-3). Sub-100ms.
- Bulk chip clear: UPDATE on up to 1000 rows. Sub-500ms.
- The 758-row historical cleanup: one UPDATE in <1 sec.
- New composite index on `(tenant_id, acknowledged_at)` keeps badge queries fast.

**Audit:**
- Acknowledgments are themselves an event. SHOULD this also write to `activity_log` (the project's general audit table)? Foreman decides — Architect's leaning: YES, one row per call to the RPC, action_type `crm_message_acknowledged`, target_table `crm_message_log`, with count + reason in metadata. Aligns with project's audit conventions and gives a paper trail beyond just the columns.

---

## 5. Method (high-level for Foreman)

1. **Phase 0 diagnostic** per §1.
2. **Foreman authors SPEC** with chosen D1/D2 path + permission model + activity_log decision.
3. **Executor migrations** (additive only): 3 columns + index + the new RPC + (optional) activity_log integration.
4. **Executor code changes**:
   - JS: small × component for the lead-row badge + chip → modal component.
   - CSS: minimal — re-use existing modal + button patterns from `shared/` per Rule 13 (no direct DB access for storefront, but this is ERP — re-use existing shared CSS components).
5. **Executor demo integration test (full chain):**
   - Create 3 demo failed messages.
   - Verify ⚠️ + chip show count = 3.
   - Click per-lead × on one → confirm dialog → confirm → ⚠️ disappears for that lead, chip = 2.
   - Click chip → modal opens listing 2 remaining → select both → "סמן" → modal closes, chip disappears.
   - Verify per-lead history view of all 3 leads still shows the failed message rows + acknowledged tag with timestamp + reason + user.
6. **Executor production cleanup**:
   - Backup re-confirmation of 758-row file (md5 match).
   - Call RPC on Prizma with the 758 row_ids list.
   - Verify chip count drops to 2 on Prizma (or whatever the post-758 leftover is).
7. **Reviewer verifies success criteria.**
8. **Localhost-Tester runs smoke 7/7 PASS + manual UI walkthrough.**
9. **Foreman closes** with FOREMAN_REVIEW + updates the Bundle 2 escalation file with Option E (Acknowledge cleanup mechanism + historical 758 cleared).

---

## 6. Destructive Operations

Per Iron Rule 32:

1. **Level 2 UPDATE on `crm_message_log`** scoped to the 758 row_ids per backup (one-time, idempotent). Pre-authorized.
2. **ALTER TABLE `crm_message_log` ADD COLUMN** × 3 (additive, not destructive per Rule 32).
3. **CREATE FUNCTION `acknowledge_failed_messages`** (additive).
4. (D2 path only) Trigger update — `CREATE OR REPLACE` of any cached-count trigger. Not destructive per Rule 32.

**No DROP, no DELETE, no schema removal, no row deletion, no git destructive ops, no main deploys.**

---

## 7. Success Criteria

| # | Criterion | Method |
|---|---|---|
| 1 | Phase 0 diagnostic documented — D1/D2 path, badge source files, permission model picked | grep SPEC.md |
| 2 | 3 new columns + composite index added to `crm_message_log` | `\d+ crm_message_log` |
| 3 | RPC `acknowledge_failed_messages` exists with canonical RLS + `SET search_path='public'` | `pg_get_functiondef` |
| 4 | RPC validates tenant_id from JWT claims (rejects cross-tenant call) | demo test: try acking demo row from prizma context → reject |
| 5 | Demo end-to-end: 3 failed messages → ⚠️ shows 3 → per-lead × clears 1 → chip shows 2 → bulk modal clears 2 → chip disappears | demo integration test |
| 6 | Demo: 3 leads' history views STILL show the failed message rows + "מטופל" tag with timestamp + user + reason | demo integration test |
| 7 | New permission key configured + permissions matrix updated (if new key introduced) | grep + UI test |
| 8 | Prizma 758-row cleanup completed via RPC call: 758 acknowledged, 0 errors | RPC return value |
| 9 | Prizma chip count post-cleanup matches 760 - 758 = 2 (or document if leftover count differs) | live read |
| 10 | Spot-check 5 random affected Prizma leads: ⚠️ gone | live read |
| 11 | Spot-check 5 random affected Prizma leads: history view shows failed message row + "מטופל" tag | live read |
| 12 | NO Prizma row touched outside the 758 backup set | audit log check |
| 13 | Demo: zero writes outside the test ack scenarios | smoke + audit |
| 14 | Event #24 status untouched (still `closed`) | DB check |
| 15 | Smoke 7/7 PASS pre- AND post-migration | `npm run smoke` |
| 16 | Integrity gate exit 0 | `npm run verify:integrity` |
| 17 | Activity log entry created for the historical 758 cleanup call | `activity_log` query |
| 18 | Bundle 2 T1.1 escalation file updated with Option E decision + completion timestamp | grep escalation file |
| 19 | Repo clean at close | `git status` |

---

## 8. Notes for the Foreman

- **Phase 0 is the gate.** Do not author repair section before badge path is identified + permission model chosen.
- **The × icon and the chip-modal share ONE underlying RPC** — same logic, different selection mechanism. UI is two surfaces over one backend operation.
- **Estimated effort:** 4-5 hours total (Phase 0 = 30-45 min + migrations = 30 min + RPC = 30 min + 2 UI surfaces = 1.5-2 hrs + demo integration + Prizma cleanup + tests = 1 hr).
- **Mandatory backup** under `modules/Module 4 - CRM/backups/{YYYY-MM-DD}_M4_FAILED_MESSAGE_BADGE_CLEANUP/` — pre-edit copies of every modified JS/HTML/CSS file + pre-migration `pg_get_tabledef` of `crm_message_log` + the 758-row pre-state JSON.
- **Cross-cut:** this SPEC touches DB (migrations) + RPC + 1-2 JS files + 1 CSS file + permissions config. Multi-surface but tightly scoped.

---

## 9. Bounded Autonomy

Pipeline runs end-to-end in ONE Claude Code chat. STOP triggers:

- Phase 0 inconclusive after 45 min → STOP, escalate.
- Any UPDATE on Prizma touches row OUTSIDE the 758 backup set → STOP, rollback.
- RPC fails tenant-isolation test (allows cross-tenant ack) → STOP, fix RLS.
- Demo end-to-end chain breaks at any link → STOP, do NOT proceed to Prizma cleanup.
- Prizma chip post-cleanup ≠ expected leftover → STOP, investigate.
- Smoke <7/7 PASS pre-migration → STOP.
- Event #24 status changes during the run → STOP (deliberately closed per Daniel).

End of Brief.
