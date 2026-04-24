# FINDINGS — STOREFRONT_FORMS Part B

> **Location:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS_PART_B/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — SPEC design direction split between §5 (live page) and §12 (ERP-form checklist)

- **Code:** `M4-SPEC-01`
- **Severity:** MEDIUM
- **Discovered during:** §5 Design Specification reading + §12 Visual Verification cross-check
- **Location:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS_PART_B/SPEC.md` §5 vs §12, and the activation prompt's "Verify" checklists
- **Description:** SPEC §5 says "**Replicate the existing `/eventsunsubscribe/` page design exactly**" — that live page is a DARK theme (`#000` bg, gold accents `#c9a555` + `#e8da94`, gold-gradient pill button, Rubik font). But §12's Visual Verification checklist describes a different design: "navy top border", "Event card gradient renders (navy blue)", "Submit button is full-width, blue, rounded", "Error card with rose accent top border". Those traits match the old ERP form (`modules/crm/public/event-register.css`), not the live storefront unsubscribe page. An executor strictly following §12 would deliver the wrong palette. This SPEC's Foreman review should update §12 so future "design parity" SPECs don't inherit the conflict.
- **Reproduction:**
  ```
  # Fetch live page:
  curl -s https://www.prizma-optic.co.il/eventsunsubscribe/ | grep -oP 'background:#\w+|color:#\w+|linear-gradient\([^)]+\)' | sort -u
  # → #000 (bg), #e8da94 (heading), #c9a555 (accent), linear-gradient(135deg,#c9a555,#e8da94)
  # Compare to §12 language: "navy top border", "blue", "rose accent"
  ```
- **Expected vs Actual:**
  - Expected: §5 and §12 describe the same design, or §12 explicitly defers to §5 on palette.
  - Actual: Two different palettes described; executor must pick.
- **Suggested next action:** TECH_DEBT (update the SPEC-authoring template so future SPECs have a single design-direction section, or require §12 to be derived from §5)
- **Rationale for action:** Not worth a new SPEC; this is a process improvement for opticup-strategic's SPEC authoring. Likely already captured as Proposal 2 in `EXECUTION_REPORT.md §8`.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — event-register POST does not re-verify HMAC token

- **Code:** `M4-SEC-01`
- **Severity:** LOW
- **Discovered during:** Reviewing `supabase/functions/event-register/index.ts` lines 216–245 to understand the POST contract
- **Location:** `supabase/functions/event-register/index.ts:216-245` (EF server side) + `opticup-storefront/src/pages/event-register/index.astro:220-250` (client submit)
- **Description:** The registration POST flow sends raw `tenant_id`, `lead_id`, `event_id` UUIDs in the body (legacy contract). Part A's EF accepts an optional `?token=...` query param on POST that re-verifies the HMAC and overrides body IDs — a defense-in-depth path. The SPEC activation prompt prescribed the legacy path, so I followed it; but a user who copies the GET token and crafts a fake POST with different UUIDs would not be rejected by HMAC. Low severity because (a) the EF still validates that the IDs belong to the same tenant, (b) `register_lead_to_event` is idempotent at the RPC level, and (c) anonymous abuse gains nothing since registration requires matching an existing lead + event pair. But passing the token on POST costs nothing and closes the gap.
- **Reproduction:**
  ```
  # A user with a valid GET token can POST with a fake lead_id:
  curl -X POST $EF_URL/event-register \
    -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
    -H "Content-Type: application/json" \
    -d '{"tenant_id":"same","lead_id":"OTHER","event_id":"OTHER","arrival_time":"..."}'
  # → succeeds if OTHER IDs are real; HMAC is not checked
  ```
- **Expected vs Actual:**
  - Expected: POST requires the same HMAC-signed token as GET, for defense-in-depth.
  - Actual: Legacy body-only POST flow is still the documented path.
- **Suggested next action:** TECH_DEBT (trivially small follow-up: add `?token=<token>` to the POST URL in `src/pages/event-register/index.astro` submitForm, and optionally drop the body IDs)
- **Rationale for action:** Tiny one-line change, improves security posture, does not break legacy ERP form (which can still POST without token). Not worth a full SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — Astro `<style>` scoping silently breaks client-injected DOM

- **Code:** `M3-ASTRO-01`
- **Severity:** LOW (was the cause of a ~8-minute in-session detour, not a production bug)
- **Discovered during:** Visual verification of `/unsubscribe?token=test` — the WhatsApp pill button rendered as bare text with no background
- **Location:** Astro framework behavior; relevant files: `src/pages/event-register/index.astro`, `src/pages/unsubscribe/index.astro` (both fixed in this SPEC via `<style is:global>`)
- **Description:** When an Astro page renders its main content client-side via `innerHTML` (as both new pages do), scoped `<style>` selectors do not match the injected DOM — Astro only adds `data-astro-cid-*` to SSR-rendered elements. The visible symptom: button backgrounds, gradients, and colors vanish while the outermost (SSR) container looks correct. There is no build-time warning and no runtime error. The fix is a one-character addition: `<style>` → `<style is:global>`. This pattern will recur for every tokenized/client-rendered public page, so it belongs in the executor's shared knowledge.
- **Reproduction:**
  ```
  // Inside an .astro file:
  <style>
    .btn { background: gold; }
  </style>
  <div id="root"></div>
  <script>document.getElementById('root').innerHTML = '<a class="btn">click</a>';</script>
  // → .btn has NO background, because Astro rewrote the selector to .btn[data-astro-cid-xxxx]
  //   and the injected <a> has no data-astro-cid-xxxx attribute.
  ```
- **Expected vs Actual:**
  - Expected: Either a build warning, or documented guidance in the project's CLAUDE.md / opticup-executor skill.
  - Actual: Silent failure at runtime; diagnosed only via DevTools inspection.
- **Suggested next action:** TECH_DEBT (captured as Proposal 1 in `EXECUTION_REPORT.md §8` — add the warning to `opticup-executor/SKILL.md`)
- **Rationale for action:** Skill-level doc improvement; no new SPEC needed.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — Hardcoded WhatsApp number and booking-fee fallback (Rule 9 partial violation)

- **Code:** `M4-R09-01`
- **Severity:** LOW
- **Discovered during:** Writing the info-notice section of `/event-register/`
- **Location:**
  - `opticup-storefront/src/pages/event-register/index.astro:167` (WhatsApp link `wa.me/972533645404`) and line 225 (booking-fee fallback `fee = (data.booking_fee != null) ? Number(data.booking_fee) : 50;`)
  - `opticup-storefront/src/pages/unsubscribe/index.astro:68` (WhatsApp link in `WA_LINK` constant)
- **Description:** Both pages hardcode `972533645404` (Prizma's WhatsApp) and a `50 ש"ח` fallback for `booking_fee`. Rule 9 ("no hardcoded business values") says these should come from tenant config. The values match what ERP reference files use (`modules/crm/public/event-register.js:50,60`, plus the live `/eventsunsubscribe/` page) so this is inherited, not introduced. The live unsubscribe page ALREADY hardcodes the same number, so this finding applies project-wide. Fixing it properly means surfacing `tenant.storefront.whatsapp_number` (already available in `TenantConfig`) and a new tenant-level `default_booking_fee` column — beyond the scope of Part B.
- **Reproduction:**
  ```
  grep -n "972533645404\|booking_fee.*50" \
    opticup-storefront/src/pages/event-register/index.astro \
    opticup-storefront/src/pages/unsubscribe/index.astro
  ```
- **Expected vs Actual:**
  - Expected: WhatsApp number pulled from `resolveTenant().storefront.whatsapp_number`; booking-fee fallback removed (EF guarantees the field).
  - Actual: Both values are literals in the page files, consistent with existing ERP + live-storefront behavior.
- **Suggested next action:** NEW_SPEC — later, a small SPEC: "Replace hardcoded WhatsApp numbers and booking-fee fallbacks across storefront + ERP CRM forms with tenant config". Should also include the live `/eventsunsubscribe/` page currently on main.
- **Rationale for action:** Cross-cutting change touching 4+ files across 2 repos, with a new DB column. Clear Rule 9 violation but not a regression introduced by this SPEC — it was already there. A dedicated SPEC is the right disposition.
- **Foreman override (filled by Foreman in review):** { }
