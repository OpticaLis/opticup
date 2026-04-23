# FINDINGS — P15_UI_POLISH

> **Location:** `modules/Module 4 - CRM/go-live/specs/P15_UI_POLISH/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `client_notes` JSON payload may carry keys beyond `eye_exam`

- **Code:** `M4-INFO-01`
- **Severity:** LOW
- **Discovered during:** §3 Track B implementation — inlining the `eye_exam` extractor.
- **Location:** `modules/crm/crm-leads-detail.js:223-224` (new `renderFullDetails` try/catch) and implicitly `supabase/functions/lead-intake/` (producer).
- **Description:** The SPEC §3 B2 specifies that the detail modal should
  parse `client_notes` as JSON and surface the `eye_exam` key as a row. My
  implementation does that, and when JSON parses successfully with an
  `eye_exam` key I suppress the raw `client_notes` block below (rendering
  raw JSON to staff is worse UX than the structured row). But the
  `lead-intake` Edge Function's JSON payload could, now or later, carry
  other keys (e.g. `preferred_frame_type`, `prescription_note`,
  `booking_channel`) that would NOT surface in the UI under my rule — they
  would be silently discarded from the staff view. The SPEC is silent on
  this, so I made a judgment call optimizing for today's keys.
- **Reproduction:**
  ```
  -- hypothetical: a future lead-intake version writes this:
  client_notes = '{"eye_exam":"-2.00/-0.75/90","preferred_frame_type":"titanium"}'
  -- current UI shows only the eye_exam row; preferred_frame_type is hidden
  ```
- **Expected vs Actual:**
  - Expected (strict SPEC read): eye_exam row + raw client_notes block below.
  - Actual (my judgment): eye_exam row only; raw block suppressed when parse succeeds.
- **Suggested next action:** TECH_DEBT
- **Rationale for action:** Today, `lead-intake` only emits `{eye_exam: ...}` as the JSON form, so this is a latent concern, not a live bug. When the EF grows new keys, the detail modal should render them generically (a small loop over `Object.keys(parsed)` with Hebrew labels). Not urgent enough for a P-level SPEC; goes to the Module 4 tech-debt list.
- **Foreman override (filled by Foreman in review):** { }

---
