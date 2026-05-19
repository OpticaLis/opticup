# M4 Dual-Path Clean Fix 2026-05-19 — Structural, Not a Patch

**Status:** Brief — replaces the failed SPEC 5 (`M4_DUAL_PATH_DEPRECATION_PHASE_1`) with a structurally sound implementation. Authored after the 2026-05-19 morning rollback.
**Authored by:** Architect (Cowork, 2026-05-19 ~11:30 IL).
**Pipeline mode:** Full-Auto with mandatory Chrome MCP live verification at every closure step.
**Priority:** P0 — replaces today's reverted SPEC 5; Daniel needs M4 stable for ongoing Prizma events.

---

## 1. Strategic Intent

**The problem we're closing forever, not patching:**

1. Every event status change today produces **2 messages per recipient** (dual-path: browser fire-and-forget + DB-trigger consumer both dispatch).
2. The modal "אישור פעולה" works correctly today (gates the dispatch via user click). We must preserve it.
3. The rule chain `event status change → message → lead.status='invited'` produces a derivative SCE that **could** loop if a future rule chains on it. Today it terminates naturally via `status_equals='waiting'` filter, but that's incidental — there's no architectural guard.
4. SPEC 5 yesterday tried to fix #1 but failed because it (a) removed dispatch from only 1 of 3 callsites, (b) didn't wire `rule_match_probe` cleanly, (c) was declared closed on SQL evidence alone without Chrome verification, (d) the partial fix broke the modal entirely on production.

**The intent:** structural fix that closes #1+#2+#3 in one Pipeline, with mandatory live verification that prevents the SPEC 5 failure mode from recurring.

---

## 2. Deliverables — 4 layers

### Layer 1 — Single dispatch path (browser is UX-only)

Remove `evaluate(mode='dispatch')` calls from **all three** browser callsites:
- `modules/crm/crm-event-actions.js`
- `modules/crm/crm-lead-actions.js`
- `modules/crm/crm-attendee-move.js`

Add `evaluate(mode='rule_match_probe')` to all three callsites. The probe is a synchronous-feeling EF call (~200ms) that answers: "would a rule match this status change?" Browser uses the answer to decide whether to open the modal.

Modal flow per callsite:
1. User clicks status change.
2. Browser calls `rule_match_probe` (fast, no dispatch).
3. Browser receives `{ has_matching_rule: bool, recipient_count_estimate: int }`.
4. If `has_matching_rule=true` AND `recipient_count_estimate > 0` → modal opens, hydrated with recipient list (via `dispatch_preview` mode).
5. User clicks "אישור ושלח" → status commit + DB trigger fires + consumer picks up + dispatch.
6. User clicks "ביטול" → status NOT committed, nothing dispatched.
7. If `has_matching_rule=false` → status commit + Toast "סטטוס עודכן", no modal.

The DB-trigger → SCE → consumer path is the ONLY path that produces `crm_message_log` writes. The browser never inserts into `crm_message_queue`.

### Layer 2 — Idempotency at the run level (defensive, in case dual fires)

Add column `dispatch_lock_key` to `crm_status_change_events`:
```
dispatch_lock_key = sha256(entity_type || ':' || entity_id || ':' || old_status || ':' || new_status || ':' || date_trunc('second', occurred_at))
```

Unique index on `(tenant_id, dispatch_lock_key)`. Two SCEs from the same source within the same second collapse to one row. Belt-and-suspenders against any future dual-write that escapes Layer 1.

### Layer 3 — Loop guard (architectural, not incidental)

Add column `originated_by_rule_id` to `crm_status_change_events`. Populated by the DB trigger when the status change was caused by a rule's `post_action_lead_status_update` (or any post-action that flips status).

The consumer's rule-matching logic gets one rule:

> **Do not re-fire `rule_X` on a SCE whose `originated_by_rule_id = rule_X` within 1 hour.**

This kills the loop architecturally. Even if a future rule adds a post-action that flips status in a way that would normally re-trigger itself, the consumer skips it. The `1 hour` window means a manual operator can re-test by waiting.

Document this in `docs/CRM_RULE_CHAINING.md` — new file that explains the rule, the column, the 1-hour window, and the test pattern.

### Layer 4 — Mandatory Chrome MCP live verification (Iron Rule)

New Iron Rule 34:

> **Iron Rule 34 — UI-touching SPECs require live verification.** Any SPEC that modifies JavaScript in `modules/crm/`, `modules/*/`, or any `.js` / `.html` file consumed by a browser MUST close with Chrome MCP evidence: (a) screenshot of the affected UI flow in working state, (b) `window.__modalTrace` or equivalent runtime trace showing the expected events fire in the expected order, (c) DB query evidence that the runtime trace produced the expected DB writes. SQL-only verification is necessary but not sufficient. Without all three artifacts attached to FOREMAN_REVIEW.md, the SPEC is not closed.

Enforcement layers:
- Layer 1 (prevention): `scripts/checks/ui-spec-verification.mjs` — at commit time, if SPEC.md mentions a `.js` file in `modules/crm/`, the FOREMAN_REVIEW.md must contain text matching `Chrome MCP` or `window.__modalTrace`.
- Layer 2 (detection): Sentinel mission 13 (new) — weekly audit of closed SPECs in last 7 days touching UI files. Flag any without Chrome evidence in FOREMAN_REVIEW.
- Layer 3 (reminder): `opticup-executor` SKILL.md gets a new top-of-file callout reminding the executor before closure.

This rule is the structural answer to "we already closed SPEC 5 without verification and shipped a broken main."

---

## 3. Campaign Overseer Knowledge Transfer (mandatory deliverable)

A persistent failure mode in this project: Campaign Overseer authors changes to M4 (templates, rules, action_configs) that interact with the framework in ways that surprise the next session. Today's discovery: the 3 missing template variables that triggered all of this were added by Campaign Overseer in 2026-04-28 without the resolver being extended.

The Pipeline MUST update the Campaign Overseer's knowledge base:

### 3.1 New file: `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md`

A canonical reference that the Campaign Overseer's skill MUST read before authoring any M4 change. Contents:

- **Variable contract.** Full list of `%var_name%` placeholders the resolver knows. For each: source column, formatting rule, channel applicability. Any new placeholder in a template MUST trigger a SPEC to extend the resolver — never just add to a template and assume it works.
- **Rule action contract.** Full list of valid `action_config` shapes per `action_type`. What `recipient_type` values exist. What `post_action_*` keys exist and what they do (specifically `post_action_lead_status_update` and the loop-guard column).
- **Status change framework architecture.** Diagram: user click → status commit → DB trigger → SCE row → consumer cron → automation-engine → recipient resolution → template compose → queue → dispatch-queue cron → send-message EF → Make webhook. Plus the modal path: rule_match_probe → modal open → confirm → status commit (same trigger path).
- **What's a Campaign Overseer decision vs Architect decision.** Editing template body wording, adding/disabling rules, scheduling broadcasts → Campaign Overseer. Adding new placeholders, new action_types, new trigger types, new entity types → Architect SPEC required.
- **Live verification protocol.** Campaign Overseer must test every template change end-to-end on demo before promoting to Prizma (already Iron Rule 33).

### 3.2 Update `.claude/skills/opticup-campaign-overseer/SKILL.md` (if exists) or `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`

Add at the top a "What Changed in M4 — Read Before Any Change" section that:
- Points to `M4_INFRASTRUCTURE_CONTRACT.md` as required reading.
- Lists the 4 layers from this SPEC.
- Says: "Any addition of a new template variable (`%var_name%`) requires Architect SPEC. Cannot be done in template body alone."
- Documents the rollback tags and EF version history so the Campaign Overseer can correlate what shipped when.

### 3.3 Iron Rule 35 — Campaign Overseer authority boundary

> **Iron Rule 35 — Campaign Overseer authority boundary.** Campaign Overseer may modify: template body wording, rule trigger conditions on existing trigger types, broadcast schedules, audience filter criteria. Campaign Overseer may NOT: add new template variables, add new trigger types, add new action types, modify EF code, modify DB triggers, modify automation-engine code. Such changes require an Architect SPEC. Bypass requires Daniel's explicit in-chat authorization. Enforcement: Sentinel mission 14 (new) — daily diff of `crm_message_templates`/`crm_automation_rules` against last commit, flag new `%var_name%` placeholders or new `action_type` values.

---

## 4. Verification Criteria (the bar — all must be green)

### Layer 1 verification
1. Toggle event #28 (TEST2) status `planning → registration_open` on demo (single toggle, 5-min quiet window before).
2. Modal opens (Chrome MCP screenshot).
3. Modal shows recipient list ≥1.
4. User clicks "אישור ושלח" (Chrome MCP screenshot).
5. Within 90s: exactly 1 run in `crm_automation_runs`, exactly 2 rows in `crm_message_log` (1 SMS + 1 Email), status='sent'.
6. ZERO additional runs in next 5 minutes.

### Layer 1 negative test
7. Toggle event #28 status `planning → planning` (no real change) — modal must NOT open, status not committed.
8. Toggle a status change that has no matching rule — modal must NOT open, status commits silently.
9. Open modal, click "ביטול" — status must NOT commit, no dispatch.

### Layer 2 verification
10. `dispatch_lock_key` column populated on every SCE.
11. Concurrent dual-INSERT test (synthetic): try to insert 2 SCEs with the same key within 1 second — second insert returns conflict (verified via pg_stat).

### Layer 3 verification
12. Synthetic test: create a rule with post_action that flips lead status. Trigger it on demo. Verify exactly 1 message sent, ZERO derivative runs.
13. `originated_by_rule_id` column populated when post_action fires.

### Layer 4 verification
14. Iron Rule 34 added to CLAUDE.md.
15. `scripts/checks/ui-spec-verification.mjs` exists and passes regression test.
16. Sentinel mission 13 protocol doc exists.

### Layer 3.x — Campaign Overseer knowledge transfer
17. `roles/campaign-overseer/M4_INFRASTRUCTURE_CONTRACT.md` exists, ≥150 lines, complete.
18. Campaign Overseer SKILL/HANDOFF updated.
19. Iron Rule 35 added to CLAUDE.md.
20. Sentinel mission 14 protocol doc exists.

### Always-on
21. Smoke 7/7 PASS.
22. Iron Rules 12/21/23/31/32 enforced every commit.
23. ALL above verifications captured in `_archive/m4-dual-path-clean-fix-2026-05-19/verification/` as Chrome MCP screenshots + DB query JSON + console traces.

---

## 5. Destructive Operations

Declared:
1. `git revert` is NOT needed (SPEC 5 already reverted this morning).
2. DDL: ADD COLUMN `crm_status_change_events.dispatch_lock_key` + UNIQUE INDEX.
3. DDL: ADD COLUMN `crm_status_change_events.originated_by_rule_id`.
4. Code edits to 3 browser files.
5. New file creations: 5 (M4_INFRASTRUCTURE_CONTRACT.md, mission docs × 2, check script × 1, test files).
6. CLAUDE.md edits (Iron Rules 34 + 35).
7. EF deploys if automation-engine needs new mode `rule_match_probe` (likely already exists from SPEC 4; verify).

NO writes to Prizma row data. NO direct edits to Prizma config rows (any sync uses the existing scripts from SPEC 1).

---

## 6. Pipeline Mode — Mandatory Live Verification at Every Closure

**The Foreman is forbidden from declaring this SPEC closed without 23 verification criteria green AND Chrome MCP evidence saved.**

Specifically:
- Layer 1 verifications 1-9: Chrome MCP screenshots + DB queries + runtime traces, all saved.
- Layer 2 verifications 10-11: SQL evidence.
- Layer 3 verifications 12-13: synthetic test + SQL evidence.
- Layer 4 verifications 14-16: file existence + script pass.
- Knowledge transfer 17-20: file existence + content review.

If any verification fails — the Pipeline iterates, not closes. After 3 iteration attempts of a failed verification → STOP + escalate.

---

## 7. Pre-flight Checklist

- [ ] develop is at `cb026ff` or later (post-this-morning's rollback merge to main).
- [ ] `cron.consume_status_change_events` is **re-enabled** (it was unscheduled at 10:40 IL).
- [ ] Smoke 7/7 PASS baseline.
- [ ] Pipeline lock claimed.

---

## 8. Estimated Wall-Clock

6-10 hours.

Layer 1: 2-3h (3 files + EF wiring + verification).
Layer 2: 1-2h (DDL + unique index + test).
Layer 3: 2-3h (DDL + trigger update + consumer update + test).
Layer 4: 1h (Iron Rule + script + Sentinel doc).
Campaign Overseer knowledge: 1-2h (M4_INFRASTRUCTURE_CONTRACT.md is the bulk).

This is overnight territory (8-10 hours including verification + retro docs). Daniel: "הצוות יכול לעבוד גם כל הלילה."

---

## 9. Why Not a Patch

A patch would be: "remove the browser dispatch call again, but this time wire the probe correctly." That fixes #1 only. It does NOT:
- Prevent a future feedback loop (no architectural guard).
- Protect against dual-INSERT race conditions.
- Stop the Campaign Overseer from adding a new placeholder that breaks resolver again.
- Prevent the SPEC closure mode that shipped today's broken main.

The 4 layers + 2 Iron Rules + Knowledge Transfer are what makes this structural. We close the door on the failure mode, not just the symptom.

