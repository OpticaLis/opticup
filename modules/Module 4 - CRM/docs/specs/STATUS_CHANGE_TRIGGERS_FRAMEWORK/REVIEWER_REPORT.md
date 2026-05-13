# REVIEWER_REPORT — STATUS_CHANGE_TRIGGERS_FRAMEWORK

> **Reviewed by:** opticup-reviewer (Full-Auto Pipeline Stage 3)
> **Date:** 2026-05-13
> **Commit range:** `b2fb0c0..c974a85` (7 commits, 17 files changed, +1,419/-94 lines)
> **Verdict:** 🟡 **PASS WITH NOTES** — ready for Localhost-Tester + Foreman closure; 3 findings worth tracking but no blockers.

---

## Automated check results

| Check | Result |
|---|---|
| Integrity Gate (`npm run verify:integrity`) | ✅ exit 0, 45 files scanned |
| `node scripts/verify.mjs --full` | ✅ exit 0 (6107 violations / 163 warnings repo-wide, all PRE-EXISTING; 0 new from this SPEC) |
| Pre-commit hook on every SPEC commit | ✅ all 7 commits passed (file-size warnings only) |
| Live DB verification of RLS policies | ✅ both new tables have canonical JWT-claim pattern byte-identical to `pending_sales` reference |

---

## Level 1 — Iron Rule Compliance

Reviewed against each rule that applies to the changed surfaces. Result for each: ✅ unless flagged.

| Rule | Applies? | Result | Evidence |
|---|---|---|---|
| 1 — Atomic quantity RPC | No | n/a | No quantity mutations in this SPEC |
| 2 — writeLog on every change | Partial | ✅ | Automation runs logged via `crm_automation_runs` (created in evaluate path). DB trigger insertion is the event-log itself |
| 3 — Soft delete | No | n/a | No deletions |
| 5 — FIELD_MAP | No | n/a | No new client-side fields needing FIELD_MAP (the EF tables aren't read by browser via T-constants) |
| 6 — index.html at root | No | n/a | No HTML changes |
| 7 — DB via helpers | n/a | ✅ | EF code uses service-role client; browser changes don't touch DB directly |
| 8 — No innerHTML with user input | ✅ | rule-editor.js builds HTML with template strings BUT uses `_esc()` (= `escapeHtml`) on every user-controlled value (`_esc(s.conditionValue)`, `_esc(BOARDS[s.boardKey].label)`, etc.) |
| 9 — No hardcoded business values | ✅ | Hebrew labels in BOARDS / ATTENDEES_FIRES_ON are UI strings, not business config (matches existing convention for crm-rule-editor.js) |
| 10 — Global name collision check | ✅ | `consumeStatusChangeEvents` is a new export, no collision in `automation-engine/`. `_condsForState` is IIFE-local in crm-rule-editor.js. `dispatchOne` is module-local in dispatch-queue/index.ts |
| 11 — Sequential RPCs | No | n/a | No sequence generation |
| 12 — File ≤ 350 | ✅ | engine.ts=320, index.ts=127, dispatch-queue/index.ts=233, crm-automation-engine.js=340, crm-rule-editor.js=338, destructive-ops-declared.mjs=318. All under hard cap. 6 files over 300 soft target — within Iron Rule 12 acceptable band. |
| 13 — Views-only for external reads | n/a | This SPEC's tables are M4-internal; no Storefront access |
| **14 — tenant_id on every new table** | ✅ | `crm_status_change_events.tenant_id uuid NOT NULL REFERENCES tenants(id)` + `crm_trigger_type_registry.tenant_id uuid NOT NULL REFERENCES tenants(id)`. Both verified live via `information_schema.columns` query |
| **15 — RLS canonical pattern** | ✅ | Independent live query of `pg_policy`: both tables have `service_bypass` (service_role, USING true) + `tenant_isolation` (public, USING `(tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)`) — byte-identical to the Iron Rule 15 reference. Zero deviation from the canonical text. |
| 16 — Cross-module contracts | ✅ | Framework IS the contract. Each module owns its DB trigger; M4 owns the consumer + queue + registry |
| 17 — Views for external | n/a | M4-internal |
| **18 — UNIQUE includes tenant_id** | ✅ | `crm_trigger_type_registry_tenant_entity_unique UNIQUE (tenant_id, entity_type)` — tenant-scoped. No other UNIQUE constraints introduced |
| 19 — Configurable values = tables | ✅ | `crm_trigger_type_registry` IS the entity-type config table. Not hardcoded enum |
| 20 — SaaS litmus | ✅ | Adding sale/payment/inventory = 1 INSERT into registry + 1 DB trigger on the new table. Zero engine code change. Passes |
| 21 — No orphans, no duplicates | ✅ | Pre-Flight Cross-Reference Check: 0 collisions across GLOBAL_SCHEMA / GLOBAL_MAP / DB_TABLES_REFERENCE / module schemas (recorded in SPEC §0) |
| **22 — Defense in depth on writes** | ✅ | Every EF query includes `.eq('tenant_id', tenantId)` even though service-role bypasses RLS. Verified: 7/7 INSERTs/UPDATEs/SELECTs in `consumeStatusChangeEvents` use explicit tenant_id filter |
| 23 — No secrets | ✅ | The legacy anon JWT inlined in pg_cron is the SAME constant already present in `lead-intake/index.ts`, `automation-engine/index.ts`, `dispatch-queue/index.ts`, and `js/shared.js` (per the existing comment in `index.ts:27`). No new secret exposure |
| 31 — Integrity Gate | ✅ | exit 0 throughout all 7 commits |
| 32 — Destructive Ops Declared | ✅ | SPEC §4 + §4a enumerate all destructive ops. Hook scanned every commit's diff against the declared list. Hook itself extended in commit 1 (ROLLBACK_SQL.md + 6 other SPEC-folder filenames added; `--no-verify` regex tightened to exclude `--no-verify-jwt` in commit 5) — appropriate scope, accompanied by FINDINGS F4 recommending wildcard regex follow-up |

**No Iron Rule violations.** All 30 rules either pass or don't apply to this SPEC's surface.

---

## Level 2 — Security & SaaS Integrity

### RLS Policy Audit

✅ Both new tables follow the **exact canonical pattern** from Iron Rule 15. Independent SQL inspection:

```
crm_status_change_events:
  service_bypass (service_role): USING (true)
  tenant_isolation (public): USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid)

crm_trigger_type_registry:
  service_bypass (service_role): USING (true)
  tenant_isolation (public): USING (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid)
```

No `auth.uid()`, no session-var legacy pattern, no `USING (true)` without tenant filter. **Clean.**

### Tenant Isolation in EF Code

- `consumeStatusChangeEvents` (engine.ts): the SELECT, the registry lookup, and every UPDATE filter explicitly by `tenantId`. The pg_cron iterates `SELECT id FROM tenants WHERE is_active = true` and passes each `tenant_id` per request — one tenant per EF invocation. Cross-tenant leakage path: **none observed.**
- `dispatch-queue/index.ts` parallel-by-group: grouping is by `(lead_id, scheduled_at)`, not by tenant. But the SELECT already filters by `scheduled_at <= now()` and the per-row `tenant_id` is preserved through the entire pipeline. Each dispatched POST to `send-message` carries its own `tenant_id`. The `phoneAllowed` lookup uses the row's `tenant_id` (allowlist layer 2). **Safe.**

### Authentication

- New EF mode `consume_status_events` is called from pg_cron with the anon JWT (same pattern as `event_day_status_flip` / `event_2_3d_before_status_flip`). The EF's gateway validates the JWT; once inside, service-role bypasses RLS. Mode is gated by `body.mode === 'consume_status_events'` — well-formed.
- No PIN flow changes. No new browser-exposed endpoints.

### Data Leakage

- `crm_status_change_events.payload` jsonb carries `event_id` + `lead_id` only. No PII (phone, email, name). The consumer derives those from `crm_leads` via the standard `resolveRecipients` path, scoped to the event's tenant. **Safe.**
- The DB trigger function is `SECURITY DEFINER` with `SET search_path = public, pg_temp` — closes the search_path-injection vector. **Hardened.**

---

## Level 3 — Code Quality & Improvements

### Architecture observations

1. **Framework abstraction is clean.** Adding `sale_status_change` in the future = (a) one INSERT into `crm_trigger_type_registry` per tenant for `entity_type='sale'`, (b) a one-line DB trigger on `crm_sales.status` that inserts into `crm_status_change_events`. Zero engine code change. Passes SaaS-litmus + Rule 16 (contracts between modules).
2. **`consumeStatusChangeEvents` and `evaluate` share state ownership cleanly** — the consumer is a thin wrapper that translates queue rows into the existing `EvaluateInput` shape. No duplicated rule-loading logic.
3. **`dispatch-queue/index.ts` refactor pays off the EV-003 lesson** (parallel cap = 5 reuses the throttle pattern from automation-engine's old dispatchPlanDirect).

### Findings

#### R1 — MEDIUM — `consumeStatusChangeEvents` UPDATE-after-evaluate race could re-trigger

**Where:** `supabase/functions/automation-engine/engine.ts:300-315`.

**Description:** The consumer evaluates a row, then marks `consumed_at = now()`. If the evaluate() succeeds (queue rows inserted into `crm_message_queue`) but the subsequent `UPDATE crm_status_change_events SET consumed_at = now()` fails (network blip, connection timeout, etc.), the event row stays `consumed_at IS NULL`. The next cron tick re-selects this row and re-evaluates. Result: the queue rows are inserted AGAIN by the second evaluate.

For the `queue_send` action_type, the partial unique index `uq_crm_message_queue_idem` blocks duplicates. For the `send_message` action_type (which the migrated check-in rules use), there is NO uniqueness guard on `crm_message_queue` — the second evaluate would enqueue a duplicate SMS.

**Likelihood:** Low. PostgREST UPDATEs are highly reliable; the only realistic failure is a connection drop mid-call. pg_cron does not run the same job concurrently (it has an internal lock), so the race is bounded to within a single tick's retry envelope.

**Recommendation:** in a future hardening SPEC, follow the dispatch-queue claim pattern — `UPDATE crm_status_change_events SET claimed_at = now() WHERE consumed_at IS NULL ... RETURNING id`, then evaluate ONLY claimed rows, then mark consumed_at. The atomic claim eliminates the race.

**Severity:** MEDIUM (real race, low-probability trigger, partial mitigation via queue uniqueness for some action types).

#### R2 — LOW — Hook regex `--no-verify(?!-jwt)` is correct but narrow

**Where:** `scripts/checks/destructive-ops-declared.mjs:78`.

**Description:** The negative lookahead matches `--no-verify` and rejects `--no-verify-jwt`. Future Supabase CLI or git ecosystem flags that contain `--no-verify-` followed by something else (e.g., a hypothetical `--no-verify-tls`) will still match the regex and be flagged. The Reviewer's preferred pattern: `/--no-verify(?:\s|$)/i` — matches only when `--no-verify` is followed by whitespace or end-of-line, which is the actual git-bypass pattern.

**Recommendation:** in the same follow-up SPEC that handles F4 (allowlist wildcard), tighten this regex to `/--no-verify(?:\s|$)/i` for forward compatibility.

**Severity:** LOW (current fix works for today; cleaner pattern future-proofs the hook).

#### R3 — INFO — Trigger fires per-row; bulk-status UPDATE could fan out

**Where:** `supabase/migrations/20260512184500_status_change_triggers_framework.sql` trigger function.

**Description:** `trg_attendee_status_change_event` fires once per UPDATEd row. A future operation that bulk-marks 1000 attendees as `attended` in one UPDATE statement would synchronously insert 1000 rows into `crm_status_change_events`, and the next cron tick would consume 100 (the LIMIT cap) → 1000 / 100 = 10 ticks = 10 minutes to fully drain. Each consumed row enqueues a SMS via `crm_message_queue`, which then drains at the dispatch-queue's 1-per-second throttle = additional ~17 minutes. Total: ~30 minutes from bulk update to last SMS landing.

This is **the intended behavior** of the framework (decoupling write from dispatch), and the throttle is the desired safety. Documenting as informational for ops awareness.

**Recommendation:** none — design works as specified.

**Severity:** INFO.

#### R4 — INFO — Trigger does NOT fire on direct INSERT with non-default status

**Where:** `supabase/migrations/20260512184500_status_change_triggers_framework.sql` trigger definition.

**Description:** `AFTER UPDATE OF status` semantics mean the trigger only fires when `status` is in the UPDATE statement's SET clause. A direct `INSERT INTO crm_event_attendees (..., status, ...) VALUES (..., 'attended', ...)` would NOT fire the trigger. Currently no production path creates attendees with non-default status (`register_lead_to_event`, `quick-register`, manual UI all use default `'registered'`), so this is moot for today. A future Daniel-CLI INSERT or migration that pre-seeds attended attendees would silently skip the check-in SMS rule.

**Recommendation:** if/when bulk-import flows are designed (e.g., importing historical attendee data with `attended` status), the SPEC author should explicitly consider whether the check-in rule should fire retroactively or be suppressed by the import.

**Severity:** INFO.

---

## Cross-cutting observations

### Documentation currency

- ✅ `SESSION_CONTEXT.md` updated with top-of-file 2026-05-13 entry, links to SPEC folder
- ✅ `CHANGELOG.md` new section with all 7 commit hashes
- ✅ `OPEN_EVENTS_TICKETS.md` EV-001 marked CLOSED
- ⚠ `docs/GLOBAL_MAP.md` + `docs/GLOBAL_SCHEMA.sql` — Integration Ceremony append still pending. The SPEC §8 marks this as Foreman's responsibility; the Executor's closure intentionally deferred to FOREMAN_REVIEW.md authoring step.
- ⚠ `modules/Module 4 - CRM/docs/MODULE_MAP.md` — new entries for the 2 tables + the EF mode + the trigger function would be appropriate. Deferred to Integration Ceremony.

### Test coverage

- ✅ Live E2E smoke on demo (criterion 18 + 19) — full round-trip proven with timing measurements.
- ⏳ `tests/smoke/baseline.test.mjs` — Localhost-Tester deliverable, not yet run. Recommended before main-merge sign-off.
- ⏳ No unit/regression tests added for the new code paths. The project does not have a tradition of unit tests at the EF layer; consistent with M4 precedent.

### Commit hygiene

- 7 commits, each scoped to one logical concern. Atomic SQL migration intentionally bundled (Iron Rule TD-2). No `git add -A`/`.` wildcards. All push to `develop` (correct branch).
- One minor concern: commit `61018a1` bundles the SQL migration with the SPEC.md amendment (§4a Contingent Rollback Operations) AND the hook fix. Each is a distinct concern. In strict reading, this is 3 concerns in 1 commit. **Justified** because the hook had to land in the same commit as ROLLBACK_SQL.md to unblock pre-commit (the hook's allowlist regex needed `ROLLBACK_SQL` added before the file could be committed). Acceptable composition under the circumstance.

---

## Priority recommendations

### Must do before main-merge:
None blocking. All Iron Rules pass; security clean; E2E smoke green.

### Should do before main-merge (Foreman discretion):
1. **F1 follow-up:** Daniel redeploys `dispatch-queue --no-verify-jwt`. Workaround migration `20260513030500_dispatch_queue_cron_auth_header_workaround.sql` is in place but is a band-aid. **HIGH severity from Executor's FINDINGS.**
2. **Localhost-Tester run:** smoke 7/7 against demo via `tests/smoke/baseline.test.mjs`. Criterion 25 in the SPEC is the Localhost-Tester's deliverable.

### Nice-to-have (defer to follow-up SPECs):
1. R1 mitigation: atomic claim pattern for `crm_status_change_events` consumer (eliminates duplicate-dispatch race for `send_message` action_type).
2. R2 cleanup: tighten hook regex to `/--no-verify(?:\s|$)/i`.
3. F4 (from Executor's FINDINGS) wildcard regex for SPEC-folder doc allowlist.

---

## Verdict

🟡 **PASS WITH NOTES** — SPEC's design is sound, implementation matches the design, Iron Rules satisfied, security clean, E2E smoke green. Three quality notes (R1 MEDIUM, R2 LOW, R3+R4 INFO) worth tracking but none block closure. Recommend Foreman closure with verdict 🟡 CLOSED WITH FOLLOW-UPS, primary follow-up being F1 (dispatch-queue `verify_jwt` revert).

*Next: Localhost-Tester (Stage 4) writes TEST_REPORT.md, then Foreman writes FOREMAN_REVIEW.md to close the SPEC.*
