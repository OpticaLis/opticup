# FINDINGS — P16_FORMS_AND_UNSUBSCRIBE

> **Location:** `modules/Module 4 - CRM/go-live/specs/P16_FORMS_AND_UNSUBSCRIBE/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — `docs/FILE_STRUCTURE.md` does not list `modules/crm/public/` or `supabase/functions/event-register/`

- **Code:** `M4-DOC-P16-01`
- **Severity:** LOW
- **Discovered during:** post-commit cleanup review
- **Location:** `docs/FILE_STRUCTURE.md` (absence), `modules/crm/public/event-register.{html,css,js}` (new), `supabase/functions/event-register/` (new)
- **Description:** P16 added 4 new public-facing files and a new Edge Function folder, none of which are referenced in the repo-wide file tree. `FILE_STRUCTURE.md` is load-on-demand (not session-start) and the SPEC didn't mandate an update. Leaving it unsynced compounds over time.
- **Reproduction:**
  ```
  grep -n "event-register" docs/FILE_STRUCTURE.md   # returns nothing
  ls modules/crm/public/                             # 3 files present
  ls supabase/functions/event-register/              # 2 files present
  ```
- **Expected vs Actual:**
  - Expected: every committed file has a one-line entry in `FILE_STRUCTURE.md`
  - Actual: 5 new files missing from the index
- **Suggested next action:** TECH_DEBT — bundle with the next Integration-Ceremony doc refresh (no need for a dedicated SPEC)
- **Rationale for action:** Low impact, easy to batch. A dedicated SPEC for a doc sync would be overkill.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Prizma's documented logo URL (`prizma-optic.co.il/images/logo.png`) returns 404

- **Code:** `M4-DATA-P16-01`
- **Severity:** INFO
- **Discovered during:** P16 Track A pre-flight verification (SPEC §13 Q3)
- **Location:** live HTTP fetch against `https://www.prizma-optic.co.il/images/logo.png`
- **Description:** SPEC suggested this URL as a candidate for the unsubscribe page logo. The URL returns 404. The actual Prizma logo lives in Supabase storage and is referenced by `tenants.logo_url` for the Prizma row — which is what I used. The `prizma-optic.co.il` site may have renamed or relocated its logo; it's `logo-site.png` there now, not `logo.png`. Not a blocker because `tenants.logo_url` is already the canonical source.
- **Reproduction:**
  ```
  curl -sI https://www.prizma-optic.co.il/images/logo.png       # 404
  curl -sI https://www.prizma-optic.co.il/images/logo-site.png  # still 404
  # actual working URL:
  curl -sI https://tsxrrxzmdxaenlvocyit.supabase.co/storage/v1/object/public/tenant-logos/6ad0781b-37f0-47a9-92e3-be9ed1477e1c/logo.png
  # → HTTP 200
  ```
- **Expected vs Actual:**
  - Expected: SPEC's cited URL resolves to the Prizma logo
  - Actual: 404; storage URL in `tenants.logo_url` is the real source
- **Suggested next action:** DISMISS — SPEC referenced it only as a suggestion ("or inline SVG — verify actual URL"). Verification happened; correct source is now used.
- **Rationale for action:** Working as intended after correct source was identified; future SPECs should not cite that URL.
- **Foreman override (filled by Foreman in review):** { }

---

*End of FINDINGS — P16_FORMS_AND_UNSUBSCRIBE*
