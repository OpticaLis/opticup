# Demo Tenant Health Check + Event Registration Link Fix

**Brief version:** v1
**Date:** 2026-05-11
**Author:** Architect (`opticup-architect`)
**Hand-off to:** Full Auto Pipeline (single chat)
**Owning module:** Module 4 — CRM (with cross-module impact on M3/M12)

---

## 1. Purpose

Daniel reported: when opening an event in the demo tenant, the "registration opened" notification template generates a link pointing to the **opticalis** domain instead of the tenant's correct domain. This blocks Daniel from running an end-to-end manual test cycle on demo before the production migrations continue.

The CRM in production (Prizma) is live and receiving real leads — we will NOT test on production. We will fix demo and test there.

This Brief authorizes:
1. Diagnose the link-generation flow for the "אירוע — נפתחה הרשמה" template (or whichever template ID Daniel encountered).
2. Identify whether the bug is in: (a) demo tenant config, (b) shared codepath that defaults wrong when tenant config is missing, or (c) production codepath bug that happens to not surface on Prizma.
3. Fix the bug at the right layer.
4. Verify on demo tenant that the flow now produces a correct link.
5. Verify on Prizma (read-only check — confirm link is still correct, no regression).
6. Provide Daniel with a clean demo tenant ready for a full manual test cycle.

## 2. Diagnostic Scope

The Pipeline must investigate, in this order:

1. **Find the template** — search DB for templates whose body mentions "נפתחה" or "הרשמה" + "אירוע". Identify template_id + the placeholder used for the link (likely `{event_url}` or `{registration_url}` or `{short_url}`).
2. **Find the link generator** — trace how that placeholder is filled. Possibilities:
   - Edge Function (e.g. `register-link`, `event-share-link`, or inside `send-message`)
   - RPC (e.g. `generate_event_link`)
   - Client-side in `crm.html` or related JS
3. **Find the domain source** — once the link generator is identified, see how it determines the domain:
   - Hardcoded literal (`opticup.opticalis.co.il` or similar) — wrong design
   - `current_setting('app.tenant_id')` then lookup in `tenants.domain` — correct design but tenant.domain might be missing for demo
   - JWT claim → tenants table lookup
   - Some fallback to a platform default
4. **Check demo tenant configuration** — query `tenants` table for the demo row (slug `demo`, UUID `8d8cfa7e-ef58-49af-9702-a862d459cccb`). Inspect: domain, custom_domain, branded_domain, public_url, or whatever the relevant column is. Note what it is set to.
5. **Compare to Prizma** — same query for Prizma tenant. Note what it's set to.

**Stop after diagnosis. Report findings BEFORE applying any fix.** Once the source of truth is identified, Daniel approves the fix path. The Pipeline writes the diagnosis to `DIAGNOSIS.md` in the SPEC folder.

## 3. Fix Strategy (decided post-diagnosis)

Based on diagnosis, ONE of these fix paths is chosen:

**Path A — Demo tenant config missing/wrong:**
- Update the demo tenant row in `tenants` to have the correct domain value
- Single-row UPDATE, tenant_id-scoped WHERE clause
- Iron Rule 32: declared destructive op = "UPDATE tenants WHERE id = '<demo-uuid>' SET <field> = '<value>'"
- Verify: re-trigger the template generation on demo, link now points to demo's domain

**Path B — Shared codepath has wrong fallback:**
- The link generator returns the platform default when tenant.domain is NULL or empty
- Fix the function to either: (i) error out when tenant.domain is missing (force config) OR (ii) use a smarter fallback
- This is a code change (likely Edge Function or RPC), requires careful regression test on Prizma flow

**Path C — Both:** demo config is also missing AND the fallback is wrong. Fix both.

The Pipeline reports findings and proposes the path. Daniel approves the path via Cowork (escalation). Pipeline then applies and verifies.

## 4. Scope — In

- Diagnosis of the link-generation flow (any module: M4 / M3 / M12 / shared infra)
- Fix at the appropriate layer (DB row update OR EF/RPC code change)
- Full verification on demo tenant — trigger the template, capture the produced link, verify domain is correct
- Read-only regression check on Prizma — same template, verify link is still correct (do NOT actually send the message; just read what the link generator would produce)
- Update of any tenant-config docs if a config field was missing
- Update DECISIONS_LOG with the root cause and the fix

## 5. Scope — Out

- The CRM migration (#3 visual) — paused until this is resolved
- Any change to Prizma's tenant row in DB
- Any change that would affect a live lead's notification
- Schema changes to `tenants` table — not in scope unless absolutely required (then escalate)
- Building any new template — only fixing the link in existing template(s)
- Whitelist work — Daniel's question about whitelist becomes moot if demo is fixed (Daniel will test on demo, no production phone exposure needed)

## 6. Locked Decisions

| # | Decision | Source |
|---|---|---|
| 1 | Test sweep happens on demo, NOT Prizma | Daniel 2026-05-11 |
| 2 | Pause CRM migration until demo is fixed | Daniel 2026-05-11 |
| 3 | Diagnose first, then propose fix path, then fix — not fix-blindly | Architect 2026-05-11 |
| 4 | Demo tenant fix may include `tenants` table row UPDATE (single row, scoped) | Architect 2026-05-11 |
| 5 | Prizma row in `tenants` table is OFF-LIMITS — read-only | Daniel 2026-05-11 (Prizma is live, hands off) |
| 6 | Continuous-Run Mandate with mid-pipeline escalation expected (path decision after diagnosis) | Architect 2026-05-11 |
| 7 | Verification on demo means: actually trigger the template, capture the produced URL string, paste it into TEST_REPORT.md | Architect 2026-05-11 |
| 8 | Verification on Prizma means: read-only inspection of the link generator's output for a hypothetical event; do NOT actually send | Architect 2026-05-11 |

## 7. Quality Bar — Acceptance Criteria

1. `DIAGNOSIS.md` exists in SPEC folder with: template ID + name, link-generator name + path, domain-source mechanism, demo tenant config state, Prizma tenant config state, root cause.
2. Fix Path (A/B/C) chosen and documented in DIAGNOSIS.md.
3. Fix applied at the correct layer (DB row update OR code change OR both).
4. `TEST_REPORT.md` shows: demo tenant — link generator produces a URL with demo domain (paste the actual URL string).
5. `TEST_REPORT.md` shows: Prizma tenant — link generator would still produce the correct prizma-optic.co.il URL (paste the actual URL string from a read-only check).
6. No live production message sent during this SPEC.
7. No row in `tenants` updated for Prizma.
8. `npm run verify:integrity` exit 0.
9. `npm run smoke` 7/7 PASS.
10. Working tree clean. Pushed to `origin/develop` (NOT main).
11. DECISIONS_LOG entry written: root cause + fix path + verification.

## 8. Destructive Operations

Declared (any of these may be needed; only those actually used go in the SPEC's final §Destructive Operations):
- Single-row UPDATE on `tenants` for demo (Path A or C)
- Edge Function redeploy (Path B or C) — non-destructive technically but flagged
- RPC update (Path B or C) — DB function change

Explicitly forbidden:
- ANY UPDATE on Prizma's tenants row
- ANY DELETE on any table
- Schema changes (ALTER TABLE, ADD COLUMN, DROP COLUMN)
- Force-push
- Merge to main
- Sending live messages to non-test phones/emails

## 9. Continuous-Run Mandate (with built-in escalation)

The Pipeline runs end-to-end in ONE Claude Code chat, with ONE expected escalation point after diagnosis:

1. Foreman writes SPEC.
2. Executor runs diagnosis, writes DIAGNOSIS.md, then ESCALATES to Architect with the proposed fix path.
3. Daniel opens Cowork, Architect reads DIAGNOSIS.md, approves path A/B/C.
4. Daniel pastes Architect's decision back into the Claude Code chat. Pipeline resumes.
5. Executor applies fix, Reviewer audits, Localhost-Tester verifies, Foreman closes.

This is the FIRST test of the escalation protocol in Full Auto. Daniel may need to round-trip Cowork once mid-pipeline.

## 10. Anti-Patterns

- DO NOT apply a fix before diagnosing. Speculative fixes hide the root cause.
- DO NOT touch Prizma's tenants row under any circumstance.
- DO NOT send any live message (SMS/Email/WhatsApp) during this SPEC.
- DO NOT change schema.
- DO NOT skip the Prizma read-only regression check.
- DO NOT merge to main.

## 11. References

- Demo tenant UUID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`, slug: `demo`
- Auto-memory `feedback_test_phone_numbers.md`: only `0537889878` + `0503348349` permitted for any test that actually sends a message (this SPEC should NOT send any message, but if it must — only those numbers)
- Auto-memory `project_messaging_architecture_v2.md`: messaging is Make-as-pipe + send-message EF. Link generation likely in send-message EF or upstream RPC.
- Auto-memory `project_short_links_live.md`: short-link service is at `prizma-optic.co.il/r/[code]` → `resolve-link` EF
- `docs/GLOBAL_SCHEMA.sql` — `tenants` table definition
- `docs/GLOBAL_MAP.md` — for finding the link-generator

---

*End of brief.*
