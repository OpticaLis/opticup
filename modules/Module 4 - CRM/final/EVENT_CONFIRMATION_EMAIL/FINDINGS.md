# FINDINGS — EVENT_CONFIRMATION_EMAIL

> **Location:** `modules/Module 4 - CRM/final/EVENT_CONFIRMATION_EMAIL/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — UI-register path does not inject `%lead_id%` → QR code broken on UI-triggered confirmations

- **Code:** `M4-BUG-EVCONF-01`
- **Severity:** MEDIUM
- **Discovered during:** §Step 4 QR variable inspection (before §4 exception request).
- **Location:** `modules/crm/crm-automation-engine.js:131` — `buildVariables()` initial assignment.
- **Description:** The client-side `buildVariables` helper populates `{name, phone, email}` (and event/unsubscribe/registration URLs when applicable) but does not include `lead_id`. When a CRM staff member registers a lead via `crm-event-register.js openRegisterLeadModal`, the confirmation dispatch goes through `CrmAutomation.evaluate('event_registration', ...)`, which uses these variables. The new email template body embeds `%lead_id%` in the QR API URL. `send-message` EF's `substituteVariables` leaves unknown placeholders as-is (per intentional design, `index.ts:55-57`), so the rendered img src becomes `…?data=%lead_id%&size=200x200…` — QR encodes the literal `%lead_id%` string.
- **Reproduction:**
  ```
  1. Open CRM on demo → event detail modal → "רשום משתתף +"
  2. Select a lead with an email address → register
  3. Inspect crm_message_log for the email row → body contains
     <img src="https://api.qrserver.com/v1/create-qr-code/?data=%lead_id%..."
  ```
- **Expected vs Actual:**
  - Expected: QR encodes the lead UUID.
  - Actual (UI path only): QR encodes the literal string `%lead_id%`. Public-form path is fine after EF redeploy.
- **Suggested next action:** TECH_DEBT — one-line fix: `vars.lead_id = lead.id;` at `crm-automation-engine.js:131` (immediately after the name/phone/email assignment). Mirrors the event-register EF fix. Can ride any next CRM commit or be included in the EF redeploy commit Daniel makes.
- **Rationale for action:** Symmetric fix; trivial line count; same semantic as the approved §4 exception but on the client side (not the Edge Function, so no §4 concern).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — SPEC §Step 3 instructed INSERT of rows that already existed (Rule 21 red flag)

- **Code:** `M4-SPEC-EVCONF-01`
- **Severity:** MEDIUM (against SPEC authoring hygiene, not against code)
- **Discovered during:** pre-flight SELECT on `crm_message_templates`.
- **Location:** `SPEC.md` §Step 3 and `ACTIVATION_PROMPT.md` §Step 3.
- **Description:** SPEC instructed `INSERT INTO crm_message_templates (..., slug, ...) VALUES (..., 'event_registration_confirmation_email_he', ...)`. Those slugs were seeded on demo in P5.5 (2026-04-22, see SESSION_CONTEXT Go-Live P5.5 row) and verified still-active in FINAL_FIXES (2026-04-24) log rows. Running the INSERT would have violated `unique(slug, tenant_id)` and — if naively deduped — created a Rule 21 orphan.
- **Reproduction:**
  ```sql
  -- Would have run:
  INSERT INTO crm_message_templates (tenant_id, slug, ...) VALUES (..., 'event_registration_confirmation_email_he', ...);
  -- ERROR: duplicate key value violates unique constraint "crm_message_templates_slug_tenant_key"
  ```
- **Expected vs Actual:**
  - Expected per SPEC: fresh INSERT creates template.
  - Actual: row already exists → would fail with unique-violation 23505.
- **Suggested next action:** TECH_DEBT on `opticup-strategic` SPEC-authoring protocol — add a pre-draft step: "For every `INSERT` prescribed in the SPEC, run a SELECT with the natural key first. If the row exists, the SPEC must say UPDATE." The executor skill's DB Pre-Flight was recently extended to catch name collisions for new objects; extending it to existing-row collisions for INSERTs closes the same loop on row-level duplicates.
- **Rationale for action:** This exact pattern cost the executor a full stop-and-clarify cycle. A protocol-level fix prevents the same stop on future SPECs.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — OPEN_ISSUES.md Issue #3 was already shipped 3 days before being authored

- **Code:** `M4-DOC-EVCONF-01`
- **Severity:** MEDIUM (documentation drift that nearly caused Rule 21 duplication)
- **Discovered during:** pre-flight scope reconciliation of SPEC Part 2.
- **Location:** `modules/Module 4 - CRM/final/OPEN_ISSUES.md:§3` (authored 2026-04-24) vs `modules/crm/crm-leads-tab.js:169-183` + `crm-lead-modals.js:73-333` (shipped P2a, 2026-04-21).
- **Description:** The E2E test session that produced OPEN_ISSUES.md on 2026-04-24 focused on the public registration flow (form → EF → dispatch → email) and never exercised the registered leads tab. The tester listed "bulk status change" as missing. But P2a on 2026-04-21 had already shipped the exact feature (row checkboxes via `_selectedIds` Set, bulk bar with "שנה סטטוס" button, status-picker modal with Tier 2 status grid, ActivityLog wiring added in P12 on 2026-04-22). The SPEC author didn't cross-check the SESSION_CONTEXT phase-history rows, and instructed a NEW file `crm-bulk-status.js` that would duplicate the existing implementation.
- **Reproduction:**
  ```
  Open CRM → Registered tab → check 2+ rows → bulk bar appears with "שנה סטטוס" button
  ```
- **Expected vs Actual:**
  - Expected per OPEN_ISSUES: feature missing.
  - Actual: feature present, working, instrumented.
- **Suggested next action:** DISMISS (closed in this SPEC). Pattern-level TECH_DEBT: for any triage doc that lists "missing features", a protocol step should grep SESSION_CONTEXT + MODULE_SPEC for the feature name and phase-history keywords before the doc is finalized.
- **Rationale for action:** Single-incident fix (OPEN_ISSUES updated). The pattern appears tractable via a ~10-minute grep protocol; worth a FOREMAN note but not a new SPEC.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 4 — MCP `deploy_edge_function` unreliable for mid-size Edge Functions

- **Code:** `M4-TOOL-EVCONF-01`
- **Severity:** MEDIUM (blocks fully-autonomous SPEC execution for any EF-touching work)
- **Discovered during:** §Step 5 (EF deploy) of revised scope.
- **Location:** MCP tool environment — `mcp__claude_ai_Supabase__deploy_edge_function`.
- **Description:** Four deploy attempts, three distinct failure modes:
  1. `verify_jwt: false` + bare filenames (`index.ts`, `deno.json`) → `InternalServerErrorException: Function deploy failed due to an internal error`.
  2. Retry same params → identical error.
  3. `verify_jwt: true` + path-prefixed filenames (`event-register/index.ts`) + entrypoint `index.ts` → `BadRequestException: Entrypoint path does not exist - /tmp/.../source/index.ts`.
  4. Same as 3 but entrypoint `event-register/index.ts` → `ZodError: files: expected array, received string` — likely payload-size truncation (file ~14KB + metadata).

  All earlier EF deploys in this project (P3c+P4 `send-message`, FINAL_FIXES `event-register` redeploy) were done by hand via Supabase CLI, not via MCP — so this is the first MCP-deploy attempt on a non-trivial EF.
- **Reproduction:** Call `mcp__claude_ai_Supabase__deploy_edge_function` on any EF ≥ 14KB with the full file content embedded in `files[].content`.
- **Expected vs Actual:**
  - Expected: deploy in one shot like `supabase functions deploy`.
  - Actual: fails 4× with 3 distinct error modes.
- **Suggested next action:** TECH_DEBT — choose one:
  (a) Add a cookbook page to `.claude/skills/opticup-executor/references/` titled `EF_DEPLOY_VIA_MCP.md` documenting the minimal working payload shape once it is discovered.
  (b) Route all executor EF deploys through a local `scripts/deploy-ef.mjs` wrapper invoked via Bash tool (authoritative, same tool humans use).
  (c) Explicitly state in SKILL.md that EF deploys require Daniel-manual, and the executor's job ends at "source committed + pending manual deploy noted in EXECUTION_REPORT".
- **Rationale for action:** Unfixable from inside a SPEC — this is infrastructure. Without a fix the executor cannot autonomously close SPECs that touch Edge Functions.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 5 — Stale `verify_jwt=false` comment in event-register/index.ts header

- **Code:** `M4-DOC-EVCONF-02`
- **Severity:** LOW
- **Discovered during:** `get_edge_function` read-only inspection during deploy diagnosis.
- **Location:** `supabase/functions/event-register/index.ts:8` — the file header comment.
- **Description:** Header comment says `"verify_jwt=false (public form)."`. Deployed EF (version 4, `updated_at = 2026-04-24T03:39:17Z`) reports `verify_jwt: true`. Public form continues to work because `event-register.js` sends `ANON_KEY` in `Authorization` and `apikey` headers on every request. No runtime issue — just a misleading comment.
- **Reproduction:**
  ```
  Compare supabase/functions/event-register/index.ts:8 to get_edge_function output.verify_jwt
  ```
- **Expected vs Actual:**
  - Expected: comment matches deployed config.
  - Actual: comment says false, deploy says true.
- **Suggested next action:** TECH_DEBT — fix on next touch of this file. Single-line edit: remove the parenthetical or update to `"verify_jwt=true (anon key in headers)"`.
- **Rationale for action:** Not worth a standalone SPEC; piggy-back on the first future edit.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 6 — Payment link URL is a fabricated placeholder (storefront has no `/payment` route)

- **Code:** `M4-INFO-EVCONF-01`
- **Severity:** INFO (SPEC explicitly scoped as out-of-scope)
- **Discovered during:** email template authoring.
- **Location:** `crm_message_templates.body` for `event_registration_confirmation_email_he` on demo tenant — link: `https://prizma-optic.co.il/payment?attendee_id=%lead_id%`.
- **Description:** SPEC §"Payment Link Notes" explicitly says to use a placeholder URL. I complied. A recipient clicking the CTA button today gets a 404 on the live storefront. Not a bug per the SPEC's own scoping, but a user-visible dead end once real users receive confirmations.
- **Reproduction:** Click the "השלם תשלום 50 ₪" button in a sent confirmation email → 404.
- **Expected vs Actual:**
  - Expected (per SPEC): placeholder accepted.
  - Actual: placeholder in production will 404 real users.
- **Suggested next action:** NEW_SPEC — Bit (or equivalent) payment integration. Out of this SPEC's scope; belongs in a follow-up with real payment service requirements.
- **Rationale for action:** Logged so it isn't forgotten when planning the post-merge roadmap.
- **Foreman override (filled by Foreman in review):** { }
