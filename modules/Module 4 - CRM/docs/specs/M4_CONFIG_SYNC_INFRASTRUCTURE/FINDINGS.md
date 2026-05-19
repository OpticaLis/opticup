# FINDINGS — M4_CONFIG_SYNC_INFRASTRUCTURE

Executor's findings during SPEC 1 execution. Each finding is severity-classified and either has a remediation in this commit OR an opened follow-up SPEC.

---

## F-1 — Regression test for sync script deferred
**Severity:** LOW
**Status:** OPEN — recommend follow-up SPEC `M4_CONFIG_SYNC_SCRIPT_REGRESSION_TEST`.

Brief §2.1 calls for "Foreman writes regression tests in `tests/smoke/sync-script-test.mjs` that simulate Prizma+demo state and verify the diff matches expectations." For overnight pacing this was deferred. The diff logic (table key extraction, normalization, hash, diff categorization) is the highest-risk surface for bugs — a fixture-based regression test should land soon to lock down the contract.

Recommended fixture: seed an ephemeral tenant pair, populate known divergences, run diff, assert each category's count matches expectation.

## F-2 — Iron Rule 21 surfaced after the fact
**Severity:** INFO (process improvement)
**Status:** RESOLVED in this commit (helpers extracted to `scripts/lib/m4-config-common.mjs`).

The author tier (Foreman) wrote SPEC.md without pre-planning for the shared-helper extraction. Pre-commit hook (Rule 21 scanner) caught 5 duplicate function names AFTER both scripts were authored. Refactor took ~5 min; not painful, but pre-planning would have saved a round-trip.

**Improvement proposal for opticup-strategic skill:** when SPEC authoring includes ≥ 2 scripts in the same domain, the Foreman should pre-declare which helpers are shared and where they live. Add to skill's authoring checklist.

## F-3 — `scripts/checks/demo-config-allowlist.json` schema is informal
**Severity:** LOW
**Status:** OPEN — flag for future hardening.

The allowlist is a JSON map of `<table_name>: [<natural_key_string>...]` with a `_key_format` companion documenting key conventions. No schema enforcement. Risk: future contributors may add allowlist entries with the wrong key format (e.g., a UUID instead of a slug), and the sync script will silently skip them as "not on allowlist."

**Mitigation suggestion:** add a load-time validator in `scripts/lib/m4-config-common.mjs` that checks each table's allowlist entries can be parsed per the key-field schema. Could ship in `M4_CONFIG_SYNC_SCRIPT_REGRESSION_TEST` as part of the test infrastructure.

## F-4 — Sentinel Mission 11 has no script yet
**Severity:** INFO
**Status:** OPEN — explicitly out of scope for this SPEC per §2.5.

The protocol doc establishes the contract. The actual scanner is a separate SPEC. Without the scanner, drift will not be caught daily until that SPEC ships. Recommend prioritizing `SENTINEL_MISSION_11_IMPL` after M4 overnight repair chain completes.

## F-5 — `crm_audit_log` table presence not pre-validated by promote script
**Severity:** LOW
**Status:** ACCEPTED — error path covered by graceful warn.

`scripts/promote-config-to-prizma.mjs` writes an audit row to `crm_audit_log`. If that table doesn't exist on a target tenant, the audit POST fails but the promote itself has already succeeded. The script logs a warning to that effect but exits 0. This is intentional: the promote is the operator's goal; audit trail is secondary safety net.

Future hardening: pre-flight check that `crm_audit_log` exists before any UPSERT — but rare, and the warning message guides the operator.

## F-6 — Diff hash excludes `updated_at` — intentional
**Severity:** INFO
**Status:** RESOLVED (documented).

`normalizeForHash` strips `id`, `tenant_id`, `created_at`, `updated_at`, `last_error` before computing the body hash. This means: a row that differs ONLY in `updated_at` (e.g., a no-op rewrite that bumped the timestamp) is classified as UNCHANGED. This is correct behavior — we want to detect content drift, not metadata drift.

Edge case: if Prizma has an old `last_error` from a previous failure and demo has a fresh one, hash ignores both — which is what we want.
