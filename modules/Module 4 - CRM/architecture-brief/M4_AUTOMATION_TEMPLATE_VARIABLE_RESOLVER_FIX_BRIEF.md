# M4_AUTOMATION_TEMPLATE_VARIABLE_RESOLVER_FIX — Fix the 3 Unsubstituted Placeholders

**Status:** Brief — sealed for execution after `M4_CONFIG_PARITY_RUN_1` closes.
**Authored by:** Architect (Cowork, 2026-05-18 evening)
**Pipeline mode:** Full-Auto.
**Priority:** P1 — this is the CRITICAL customer-facing fix from the QA report.

---

## 1. Strategic Intent

**The bug.** From the 2026-05-18 QA report Finding 1.2: the automation-engine EF's variable resolver does not populate `event_day_of_week`, `event_deposit_amount`, `event_max_attendees` from `crm_events`. When any event-status-change rule fires with a template using any of these placeholders, the EF rejects the row with `error_message='unsubstituted_placeholder: ...'`. The dispatch never happens. 19 active Prizma templates contain at least one of these placeholders.

**The intent.** Extend the resolver to populate the 3 missing keys correctly. Add a regression test that runs all active rules' templates through the resolver and asserts zero `unsubstituted_placeholder` on a sample event row.

**Source of truth.** The fix lives in the EF source. Demo and Prizma share the same EF — one fix, both tenants benefit. The `M4_CONFIG_PARITY_RUN_1` ran first specifically so the regression test on demo proves the same templates Prizma uses.

---

## 2. Deliverables

### 2.1 Resolver extension in `automation-engine` EF

Add 3 keys to the event-context variable composer:

- `event_day_of_week`: localized day-of-week from `crm_events.event_date`, Asia/Jerusalem TZ. Hebrew weekday names ("ראשון", "שני", ...). Match the `B8_DAY_OF_WEEK_TIMEZONE_FIX` SPEC's day-of-week computation rules exactly — that SPEC fixed the day-of-week math for broadcasts; reuse the same logic.
- `event_deposit_amount`: formatted from `crm_events.booking_fee`. Format: `₪N` (e.g. `₪50`, `₪0` if booking_fee=0 or NULL). Currency symbol from tenant config.
- `event_max_attendees`: from `crm_events.max_capacity` as plain integer string. NULL → empty string.

All 3 keys must work for BOTH email + SMS templates (resolver is channel-agnostic).

### 2.2 Resolver gap audit

While the EF is open, run an inventory:
- SELECT all active templates from BOTH demo + Prizma.
- For each `%var_name%` placeholder found, check that the resolver knows how to populate it.
- If any unknown placeholder discovered beyond the 3 named — STOP and write a finding to FINDINGS.md. Do not silently add the resolver key (could be a template typo, not a real variable).

### 2.3 Regression test

`tests/smoke/automation-resolver-test.mjs`:
- For each active rule on demo: fetch the rule, fetch the template, fetch a sample event/lead/attendee row matching the rule's trigger_entity.
- Synthesize the resolver context, compose the body, run `validateTemplateOutput`.
- Assert zero `unsubstituted_placeholder` errors across all rules.
- Run as part of `tests/smoke/baseline.test.mjs` baseline 7 (or extend to 8).

### 2.4 EF redeploy

Deploy the new EF version. If MCP `deploy_edge_function` returns `InternalServerErrorException` (per OPEN-021), write `DEPLOY_FALLBACK_NEEDED.md` and ask Daniel to CLI-deploy. Standard fallback pattern.

### 2.5 Demo verification

After deploy, on demo:
- Trigger one event status change manually (e.g. event #28 TEST2 from "תכנון" → "הרשמה פתוחה"). Use the test phone allowlist.
- Verify `crm_message_log` row reaches `status='sent'` (not `'rejected'`).
- Capture the log row md5 + content hash for the retrospective.

---

## 3. Verification Criteria

1. 3 new resolver keys present in EF source.
2. EF redeployed; version bumped.
3. Regression test passes 0 unsubstituted on all active demo rules.
4. Demo manual smoke: 1 event status change → 1+ rows in `crm_message_log` with `status='sent'` (or `status='skipped_no_token'` for FB CAPI etc, but NOT `status='rejected' WHERE error_message LIKE 'unsubstituted_placeholder%'`).
5. Prizma's resolver gap closed automatically (EF is shared); no Prizma writes needed for verification.
6. Smoke 7/7 PASS.
7. Iron Rules 12/31/32 enforced.

---

## 4. Destructive Operations

**None.**

EF code edit + deploy is not destructive in Iron Rule 32 sense (the old EF version is preserved in Supabase's EF history). Demo smoke writes ARE non-destructive standard test traffic.

---

## 5. Risk Surface

- **Risk 1: day-of-week computation produces wrong day.** Mitigation: reuse `B8_DAY_OF_WEEK_TIMEZONE_FIX` logic byte-for-byte. Regression test covers 7 sample dates spanning a week.
- **Risk 2: currency symbol hardcoded.** Mitigation: read from `tenants.ui_config.currency` per Iron Rule 9 (no hardcoded business values). Tests with both demo + Prizma tenant_id.
- **Risk 3: NULL handling on max_capacity.** Mitigation: NULL → empty string. Test with an event row having NULL max_capacity.
- **Risk 4: deploy fails (OPEN-021).** Mitigation: documented fallback to CLI deploy.

---

## 6. Out of Scope

- The unconditional modal-open bug (Finding 1.1 from the QA report) — that's `M4_STATUS_CHANGE_MODAL_GATE_FIX`, separate SPEC.
- The duplicate-path issue (Finding 1.4) — that's `M4_DUAL_PATH_DEPRECATION_PHASE_1`, separate SPEC.

---

## 7. Pre-flight Checklist

- [ ] `M4_CONFIG_PARITY_RUN_1` 🟢 closed; demo mirrors Prizma config.
- [ ] Read `_archive/m4-qa-2026-05-18/M4_FULL_QA_REPORT_2026_05_18.md` Finding 1.2 + Appendix B.
- [ ] Read `automation-engine` EF source (use `get_edge_function` MCP tool).
- [ ] Locate the `B8_DAY_OF_WEEK_TIMEZONE_FIX` SPEC to copy the day-of-week computation.
- [ ] Pipeline lock claimed.

---

## 8. Estimated wall-clock

2-4 hours.

