# REVIEW — M4_CONFIG_SYNC_INFRASTRUCTURE

**Reviewer:** overnight session (acting reviewer; pragmatic role overlap during single-session run — flagged in FOREMAN_REVIEW as improvement opportunity).
**Reviewed commit:** `0f50d86`.
**Verdict:** 🟢 APPROVED with 2 observations + 1 nitpick.

---

## Iron Rule audit

| Rule | Status | Notes |
|------|--------|-------|
| 21 (No orphans, no duplicates) | ✅ | Hooks would have caught the 5 dupes; refactor moved shared helpers to `scripts/lib/m4-config-common.mjs`. Reviewer confirms no other duplicates introduced by this commit. |
| 22 (Defense-in-depth on writes) | N/A | This SPEC only adds scripts that DO writes; the scripts themselves include `tenant_id` in every UPSERT payload (verified L120, L154 of sync; L172 of promote). |
| 23 (No secrets in code or docs) | ✅ | Service role key read from `$HOME/.optic-up/credentials.env` at runtime. No keys in code. SPEC.md mentions tenant UUIDs (public knowledge). |
| 31 (Integrity gate) | ✅ | Pre-commit ran; 8 files scanned, 0 violations. |
| 32 (Destructive ops declared) | ✅ | SPEC §4 declares `None.`; commit is additive-only. |
| 33 (NEW — M4 config demo-first) | ✅ | This SPEC INSTITUTES rule 33; it does not test compliance. SPEC 2 will be the first run under rule 33's discipline. |

## Code review observations

### O-1 (HIGH, accepted — design choice) — Sync script does row-level fetches, not bulk transaction
The sync script issues N POST/PATCH/DELETE calls (one per row) instead of a single transactional bulk UPSERT. **Tradeoff:** simpler error handling per row, but not atomic — partial failure leaves demo in an intermediate state.
**Acceptable** because: (a) demo is the testbed, partial state is recoverable via re-running the sync; (b) the alternative (RPC + transactional COMMIT/ROLLBACK) would add ~50 LOC and need a Postgres function. The audit baseline of 1+8+0 = 9 row operations is small enough that retry-from-scratch is fine.

### O-2 (LOW — followup) — `selectAll` fetches with Range 0-9999 (single HTTP request)
PostgREST has a default 1000-row response cap. The script sets `Range: 0-9999` to allow up to 10000 rows. For M4 config tables this is far more than enough today (largest table is `crm_message_templates` with 33-38 rows). But if a tenant ever has > 10000 rows in any config table, this silently caps. **Future:** add pagination loop. **Not critical for v1**.

### Nitpick (N-1) — README/header doc could clarify Hebrew-first intent
The sync script's diff output is English-only despite Brief §2.1 saying "Print diff summary to stdout (Hebrew + English)." Foreman acknowledges this is a minor deviation; the diff IS understandable from English keywords alone. **Recommendation:** add Hebrew labels in a future v2 polish pass (not blocking).

## What I would have asked the executor to change pre-commit

Nothing blocking. The Iron Rule 21 fix was self-applied mid-execution; the rest is clean.

## Permission to proceed to SPEC 2

✅ APPROVED. SPEC 2 (`M4_CONFIG_PARITY_RUN_1`) is the first runtime test of this infrastructure.
