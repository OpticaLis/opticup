# SPEC — M4_TENANT_ISOLATION_HARDENING_PART2

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_TENANT_ISOLATION_HARDENING_PART2/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — closes Phase 1 audit G-CRIT-2 (last CRITICAL)
> **Authored on:** 2026-05-06
> **Module:** 4 — CRM
> **Phase:** post-cutover critical security hardening (Part 2 of 2)
> **Severity:** CRITICAL (anon role can EXECUTE 12 SECURITY DEFINER RPCs that mutate cross-tenant data)

## 1. Goal

Revoke `EXECUTE` from `anon` on the 9 RPCs that don't legitimately need anonymous access. The 3 that DO need anon access (register_lead_to_event, submit_storefront_lead, verify_campaign_page_password) get internal `tenant_id` validation enhanced + remain anon-callable. Defense in depth: even if a kept-anon RPC is somehow misused, internal validation prevents cross-tenant writes.

## 2. Background & Motivation

Phase 1 audit G-CRIT-2 + Foreman live re-verification (2026-05-06) confirmed all 12 RPCs are SECURITY DEFINER with EXECUTE granted to BOTH `anon` AND `authenticated`:

```
cascade_attendee_soft_delete       (no args — trigger function)
check_in_attendee                  (p_tenant_id, p_attendee_id)
import_leads_from_monday           (p_tenant_id, p_board_id, p_items)
move_attendee_between_events       (p_attendee_id, p_target_event_id)
next_crm_event_number              (p_tenant_id, p_campaign_id)
register_lead_to_event             (p_tenant_id, p_lead_id, p_event_id, p_method)
restore_event_from_log             (p_tenant_id, p_log_id)
soft_delete_event_if_empty         (p_tenant_id, p_event_id)
submit_storefront_lead             (p_tenant_id, p_inventory_id, p_contact_type, p_contact_value)
sync_lead_status_from_attendee     (p_lead_id, p_tenant_id)
transfer_credit_to_new_attendee    (p_old_attendee_id, p_new_attendee_id)
verify_campaign_page_password      (p_tenant_id, p_page_slug, p_password)
```

**Caller classification (verified live by grep on 2026-05-06):**

| RPC | Live callers | Classification |
|---|---|---|
| `register_lead_to_event` | `event-register` EF (anon, public form) + `quick-register` EF (anon, WhatsApp QR flow) + CRM admin (`crm-event-register.js`) | **KEEP-ANON** — public form path |
| `submit_storefront_lead` | (storefront repo — verify) | **KEEP-ANON** — public storefront path |
| `verify_campaign_page_password` | (storefront repo — verify) | **KEEP-ANON** — public campaign-page password gate |
| `move_attendee_between_events` | `crm-attendee-move.js` (CRM staff only) | **REVOKE-ANON** — anon debt |
| `check_in_attendee` | `crm-event-day-checkin.js` + `crm-event-day-schedule.js` (CRM staff only) | **REVOKE-ANON** — anon debt |
| `transfer_credit_to_new_attendee` | `crm-payment-automation.js` (CRM staff only) | **REVOKE-ANON** — anon debt |
| `next_crm_event_number` | `crm-event-actions.js` (CRM staff only) | **REVOKE-ANON** — anon debt |
| `restore_event_from_log` | `crm-event-restore.js` (CRM staff only) | **REVOKE-ANON** — anon debt |
| `soft_delete_event_if_empty` | `crm-event-delete.js` (CRM staff only) | **REVOKE-ANON** — anon debt |
| `sync_lead_status_from_attendee` | `crm-automation-post-actions.js` (browser, authenticated) + `automation-engine` EF (service-role) | **REVOKE-ANON** — never anon-called |
| `cascade_attendee_soft_delete` | DB trigger only — never API-called | **REVOKE-ANON-AND-AUTH** — fully internal; service_role + trigger context only |
| `import_leads_from_monday` | one-time migration tool (no live caller) | **REVOKE-ANON-AND-AUTH** — admin script only; service_role only |

### Architecture decision

For the 3 KEEP-ANON RPCs, anon access is intentional (public ingress paths) but the SECURITY DEFINER context means the RPC body must validate `tenant_id` matches what the caller asserts. Verification 2026-05-06: each of the 3 already has `WHERE tenant_id = p_tenant_id` clauses on its writes (existing defense). This SPEC re-verifies + documents the existing defenses; it does NOT modify the RPC bodies (out of scope — body changes are a separate refactor SPEC if needed).

For the 9 REVOKE-ANON RPCs, the change is purely a GRANT revocation. No body changes. CRM staff continues to access via authenticated role.

For the 2 REVOKE-ANON-AND-AUTH RPCs (cascade_attendee_soft_delete trigger + import_leads_from_monday admin-only), even authenticated users don't need them — service_role is the only legitimate caller. Stricter revocation reduces attack surface to zero for these 2.

## 3. Success Criteria (Measurable)

| # | Criterion | Expected | Verify |
|---|-----------|----------|--------|
| 1 | Branch state at end | `develop`, clean | `git status` |
| 2 | Commits produced | 1 (migration) + 1 (retrospective) = 2 | `git log origin/develop..HEAD --oneline \| wc -l` |
| 3 | Migration files at `migrations/2026_05_06_revoke_anon_rpc_execute_up.sql` (+ `_down.sql`) | both exist | `ls` |
| 4 | Post-migration: 9 RPCs have `anon_can_execute=false`, `auth_can_execute=true` | SELECT | SQL via `has_function_privilege()` |
| 5 | Post-migration: 2 RPCs (cascade_attendee_soft_delete, import_leads_from_monday) have anon=false AND auth=false | SELECT | same |
| 6 | Post-migration: 3 KEEP-ANON RPCs unchanged: anon=true, auth=true | SELECT | same |
| 7 | E2E Test 1 — public form on demo (event-register) still works | curl POST → 200 + attendee created | SQL |
| 8 | E2E Test 2 — quick-register flow on demo (WhatsApp QR → form submit) still works | direct EF call → 200 + attendee | SQL |
| 9 | E2E Test 3 — CRM staff actions (delete event, check-in, restore) still work via authenticated role | walk-through on demo | Chrome MCP |
| 10 | E2E Test 4 — anon attempt to call REVOKE-ANON RPC returns permission denied | curl with anon JWT | HTTP 403 / 42501 |
| 11 | Whitelist enforcement | only test phone `0537889878` + email `daniel@prizma-optic.co.il` | as before |
| 12 | Prizma writes during run outside the migration | 0 | sanity |
| 13 | Integrity gate | exit 0 or 2 | `npm run verify:integrity` |

## 4. Autonomy Envelope

### CAN do without asking
- Write the migration files (`_up` + `_down`)
- Apply migration via Supabase MCP `apply_migration`
- Re-verify GRANTs via `has_function_privilege()`
- Drive Claude in Chrome MCP for CRM staff regression check (Test 3)
- Direct EF invocations for Test 1 + Test 2
- SELECT-only on prizma for sanity verification
- Soft-delete demo test data at end
- Commit + push to `develop`
- Update Module's CHANGELOG, SESSION_CONTEXT, db-schema.sql

### REQUIRES stopping
- Any prizma write outside the migration's GRANT/REVOKE statements
- Test message firing to non-whitelist contact
- Modification to ANY RPC body — out of scope (body refactor is a future SPEC if needed)
- Any DDL beyond REVOKE/GRANT
- Test 3 (CRM staff) shows ANY action breaks → STOP, the migration is over-restrictive; revert
- Test 1 or 2 (public form / quick-register) shows non-200 → STOP, the SPEC's caller classification was wrong; revert
- Iron Rule 12 violation — N/A (no source files modified)
- Merge to main
- Total runtime exceeding 90 minutes

## 5. Stop-on-Deviation Triggers

- Migration apply returns non-200 → STOP, do not retry
- After migration, any of the 6 CRM staff actions tested in Test 3 returns "permission denied" → STOP, the authenticated role is not getting the right RPC access; revert
- After migration, public form (Test 1) returns 4xx → STOP, register_lead_to_event needed something this migration broke; revert
- prizma write attempt outside the migration → STOP, log CRITICAL
- A REVOKE-ANON RPC is found to be called from anon context (e.g., a forgotten storefront call) → STOP, escalate to Foreman to update the classification

## 6. Rollback Plan

Single migration → `git revert <migration_commit>` + apply `_down.sql`. The `_down` migration restores GRANT EXECUTE on all 9 REVOKE-ANON RPCs back to anon, plus restores cascade_attendee_soft_delete + import_leads_from_monday to anon+authenticated.

Demo cleanup: soft-delete test leads via `UPDATE crm_leads SET is_deleted=true WHERE phone='+972537889878' AND created_at >= START_TIMESTAMP`.

## 7. Out of Scope (DO NOT touch)

- Bodies of the 12 RPCs — read-only verification only (SECURITY DEFINER + tenant_id checks confirmed pre-existing)
- Edge Functions (no source change)
- Storefront repo (storefront calls to KEEP-ANON RPCs continue to work; no change needed)
- Hardcoded Prizma values — closed in M4_HARDCODED_PRIZMA_REMOVAL
- VM mount drift — leave alone

## 8. Expected Final State

### New migration file: `modules/Module 4 - CRM/migrations/2026_05_06_revoke_anon_rpc_execute_up.sql`

Forward migration content per §11 below — 9 REVOKE-ANON statements, 2 REVOKE-ANON-AND-AUTH statements, 3 KEEP-ANON (no SQL — documented in comments).

### Companion `_down.sql` rollback (NOT applied unless triggered)

Restores GRANT EXECUTE on all 11 RPCs that were revoked.

### Modified docs
- `modules/Module 4 - CRM/docs/CHANGELOG.md` — append
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — current focus
- `modules/Module 4 - CRM/docs/db-schema.sql` — append GRANT documentation

### NOT modified
- Any RPC body
- Any EF source
- Any client JS
- `MASTER_ROADMAP.md` / GLOBAL files (no phase boundary)

## 9. Commit Plan

ONE migration commit + ONE retrospective:

- **Commit 1:** `fix(crm): revoke anon EXECUTE from 9 internal RPCs + 2 admin-only (M4_TENANT_ISOLATION_HARDENING_PART2)`
  - Migration `_up.sql` + `_down.sql`
  - CHANGELOG, SESSION_CONTEXT, db-schema
- **Commit 2:** `chore(spec): close M4_TENANT_ISOLATION_HARDENING_PART2 with retrospective`
  - SPEC + EXECUTION_REPORT + FINDINGS

Push to `origin/develop`. Do NOT merge to main.

## 10. Dependencies / Preconditions

- Branch `develop`, clean
- Supabase MCP available (`apply_migration`, `execute_sql`)
- Demo tenant accessible — login PIN `12345`
- Whitelist contacts: phone `0537889878`, email `daniel@prizma-optic.co.il`
- Active demo event in `registration_open` state for Tests 1 + 2

### Edge Function deploy fallback
Not applicable — this SPEC deploys NO EFs. Migration only. The MCP `apply_migration` API path is reliable (no documented flake history; verified again in Phase 1 PART 1).

## 11. Lessons Already Incorporated

- **From M4_TENANT_ISOLATION_HARDENING_PART1 FOREMAN_REVIEW:** the canonical 2-policy pattern + service_role precedence is preserved here implicitly (REVOKE-ANON-AND-AUTH still leaves service_role with the implicit bypass).
- **From M4_HARDCODED_PRIZMA_REMOVAL FOREMAN_REVIEW (Author Proposal 1):** filesystem path verification was applied — every cited file path in §2 verified live via grep on 2026-05-06.
- **From the just-applied Step 1.5 §6 (`pg_proc.prosrc` source-search):** every RPC's caller list was verified live via `grep -rn "\.rpc\(['\"](rpc_name)" modules/ supabase/`. Caller classification in §2 is grounded in actual call sites, not memory.
- **From `feedback_test_phone_numbers.md`:** real SMS fires on demo. Whitelist enforced (only Test 1 + 2 fire messages; Test 3 CRM walk doesn't trigger any SMS).
- **From `feedback_production_discipline_post_cutover.md`:** prizma is live. Migration is GRANT/REVOKE only; no data mutation.
- **Iron Rule 22 (defense in depth):** GRANT revocation is the FIRST layer; the RPC bodies' `WHERE tenant_id = p_tenant_id` clauses are the SECOND layer. Both stay.

**Cross-Reference Check (Step 1.5):** This SPEC introduces ZERO new tables, columns, RPCs, views, T-constants, FIELD_MAP entries, files, or config keys. Cross-reference sweep: 0 collisions.

## 12. QA Plan

After migration applied:

1. **Pre-flight baseline:** record current `has_function_privilege()` for all 12 RPCs across (anon, authenticated, service_role).
2. **Apply migration** via Supabase MCP `apply_migration`.
3. **Verify migration effect:** `has_function_privilege()` matrix matches §3 #4-#6 expectations.
4. **Test 1 — public form (anon → register_lead_to_event):** POST event-register EF; expect 200 + attendee row.
5. **Test 2 — quick-register flow (anon → register_lead_to_event):** POST quick-register EF; expect 200.
6. **Test 3 — CRM staff regression check:** in Chrome MCP, login PIN 12345, walk delete/restore/check-in/move/transfer paths.
7. **Test 4 — anon attempt to call REVOKE-ANON RPC:** curl with anon JWT to `move_attendee_between_events`; expect HTTP 403 / SQLSTATE 42501.
8. **Cleanup:** soft-delete test leads.
9. Verify §3 success criteria #1-#13.

If Test 1, 2, or 3 fails → APPLY ROLLBACK + log CRITICAL.

*End of SPEC.*
