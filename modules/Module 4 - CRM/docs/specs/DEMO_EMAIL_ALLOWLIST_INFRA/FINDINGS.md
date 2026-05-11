# FINDINGS — DEMO_EMAIL_ALLOWLIST_INFRA

> **Location:** `modules/Module 4 - CRM/docs/specs/DEMO_EMAIL_ALLOWLIST_INFRA/FINDINGS.md`
> **Authored by:** Full-Auto Pipeline (opticup-strategic + opticup-executor merged in single chat)
> **Authored on:** 2026-05-11

---

## Format

Each finding has: severity (CRITICAL/HIGH/MEDIUM/LOW), pre-known status, description, and disposition (new SPEC / TECH_DEBT / dismissed-with-reasoning / observed-only).

---

## F1 — `tenants` table has no `updated_at` trigger (LOW, pre-known)

**Severity:** LOW
**Pre-known:** YES — surfaced 2026-05-11 earlier today by `M3_DEMO_STOREFRONT_FORMS_DEPLOYMENT`, also confirmed by predecessor `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` §4 row F3. Already in `TECH_DEBT.md`.

**Description:** When this SPEC ran the single-row UPDATE on demo's `tenants.ui_config`, the row's `updated_at` did NOT advance — it stayed at the pre-snapshot value `2026-03-29 08:33:43.906+00`. The UPDATE definitively landed (the post-UPDATE SELECT returned the new jsonb array; the second verification SELECT 30 seconds later returned the same array; the `total_ui_config_keys` count rose 12→13). The conclusion is unchanged from the predecessor SPEC: no `updated_at` trigger on `tenants`.

**Operational implication for this SPEC:** the verification strategy in §3 success criterion #8 ("Prizma `updated_at` unchanged equals `BASE_PRIZMA_UPDATED_AT`") still works as a regression check — if any column on Prizma's row had changed, the `updated_at` would still not have moved, so the only true Prizma-untouched proof is the absence of the `test_mode_email_allowlist` key (criterion #7). This is also passing, so dual-proof in place.

**Disposition:** **observed-only.** Already in TECH_DEBT (per `DEMO_WHITELIST_UPDATE/FOREMAN_REVIEW.md` §4). No new entry. A future SPEC that adds an `updated_at` trigger to `tenants` (and possibly to other tenant-config tables that lack one) would close this. Trigger SPEC effort: ~30 min, single migration.

---

## F2 — `send-message` index.ts approached Iron Rule 12 cap before this SPEC's growth (MEDIUM, surfaced)

**Severity:** MEDIUM
**Pre-known:** PARTIAL — the established extraction pattern (dispatch.ts, event-variables.ts, lead-variables.ts, url-builders.ts) showed the cap was a recurring constraint, but no explicit watchlist for the file's growth trajectory existed.

**Description:** v21's `index.ts` was 331 lines. Adding the email gate inline (~17 lines for `emailAllowed` + ~9 for the gate block) would have pushed it to ~357 — over the 350-line absolute cap (Iron Rule 12). This SPEC was forced to perform a relocation extraction (phoneAllowed + normalizePhone → new `allowlists.ts`) to stay under the cap. The SPEC's §6 (Destructive Operations) explicitly declared this and verified SMS body byte-equivalence post-extraction.

**Observation:** Rule 12's cap surfaces at design time, not at runtime. Future code additions to `index.ts` (~6 more lines headroom before re-hitting the cap) will require another extraction. Candidate next-extract: the universal placeholder scanner block (lines 255-274 in v22) could move to `event-variables.ts` alongside its sibling scanner.

**Disposition:** **observed-only.** Not a new SPEC yet — the next time `index.ts` needs growth, the natural action is "extract first, then add." Already covered by the existing established pattern. Adding a Sentinel watchlist on the file would be over-engineering; the smoke + integrity gates do not require it.

---

## F3 — `loadTenantConfig` reads `ui_config` but does NOT expose `test_mode_email_allowlist` typed field (LOW, observed)

**Severity:** LOW
**Pre-known:** NO — surfaced during the diagnostic phase when reading `_shared/tenant-config.ts`.

**Description:** `loadTenantConfig` returns a typed `TenantConfig` with named fields for `storefront_url`, `whatsapp_phone_e164`, `support_phone_display`, `brand`, etc. — selected keys from `ui_config` that callers commonly need. It does NOT expose `test_mode_email_allowlist` as a typed field. This SPEC's `emailAllowed` reads `ui_config` raw rather than going through `loadTenantConfig`. Both paths work; the raw read is more direct and matches the SMS allowlist's pattern (which selects `test_mode_sms_allowlist` directly without going through any shared loader). The duplication is one extra SELECT per email send.

**Decision rationale (recorded here, not in DECISIONS_LOG):** raw read chosen over `loadTenantConfig` because (a) it mirrors the SMS pattern's structure exactly, (b) it avoids a wider refactor on `_shared/tenant-config.ts` outside this SPEC's scope, (c) `loadTenantConfig` also runs a SELECT, so the cost is identical — there's no caching benefit today (no per-request memoization on tenant config). If a future SPEC adds per-request tenant-config caching, both allowlist helpers would migrate to read from that cache; until then, the cost is equivalent.

**Disposition:** **observed-only.** A future SPEC that introduces per-request tenant-config caching would migrate both `phoneAllowed` and `emailAllowed` to read from the cache; until then, parity with SMS is the right shape.

---

## Summary

| # | Severity | Pre-known | Disposition |
|---|----------|-----------|-------------|
| F1 | LOW | YES (already in TECH_DEBT) | observed-only |
| F2 | MEDIUM | PARTIAL | observed-only |
| F3 | LOW | NO (surfaced during diagnostic) | observed-only |

Zero new SPECs filed. Zero new TECH_DEBT entries. All 3 findings are either already tracked, watchlist-only, or judgment-calls already made in-SPEC with rationale.

---

*End of FINDINGS.*
