# ACTIVATION PROMPT — P5_5_PHONE_EMAIL_HARDENING

You are opticup-executor. This SPEC is **post-cutover** — it does NOT execute until Daniel explicitly schedules it. **Do not start work just because this prompt was loaded.** Read SPEC.md, confirm preconditions, then await Daniel's explicit "execute now" greenlight.

**SPEC:** `modules/Module 4 - CRM/go-live/specs/P5_5_PHONE_EMAIL_HARDENING/SPEC.md`

**Hard preconditions (verify BEFORE starting, even after greenlight):**
- Cutover (2026-05-03) has shipped to main and is stable. `git log main` shows the cutover merge.
- No open CRM-blocker SPECs in `modules/Module 4 - CRM/go-live/specs/`.
- `lead-intake` EF is live at v15 or later (the version that writes `crm_automation_runs` rows).
- `dispatch-queue` EF is live at v4 or later (the version that forwards `run_id`).
- Both demo + Prizma tenants reachable; service-role credentials in `$HOME/.optic-up/credentials.env`.
- Make scenario 9104395 ("Optic Up — Send Message") active.

**Pre-Flight Step 1 (mandatory before commit 1):**
Per SPEC §10 — locate the storefront landing form, run the Rule 21 grep matrix, snapshot the pre-backfill state. Log results into a fresh `EXECUTION_REPORT.md` §10.

**Critical guardrails:**
- Demo runs first, every part. Prizma runs only after demo's per-part success criteria pass and only when explicitly authorized by Daniel for the corresponding part.
- The backfill SQL on Prizma (Commit 7) is a **separate STOP** — even after the SPEC is greenlit, that specific run requires its own confirmation per SPEC §4.
- Iron Rule 22 (defense in depth): every UPDATE that flips `phone_status` / `email_status` MUST include `tenant_id = ?` in the WHERE clause.
- Iron Rule 12 (file size): all new code stays under 350 lines per file. Split helpers if needed.
- Iron Rule 31 (integrity gate): run `npm run verify:integrity` before every commit; the gate is non-bypassable.

**Test phones for QA (allowlisted by send-message + dispatch-queue):**
- `+972537889878` — Daniel primary
- `+972503348349` — Daniel secondary
- `+972507168471` — Daniel tertiary

**Email for QA:** `daniel@prizma-optic.co.il`

**Deliverables at close:**
- All 30+ success criteria pass.
- `EXECUTION_REPORT.md` with: §10 pre-flight log, per-commit summary, smoke artifacts (DB row diffs, EF deploy versions, browser screenshots from chrome-devtools), self-assessment per opticup-executor SKILL.md.
- `FINDINGS.md` if anything emerged (e.g., the storefront form genuinely doesn't exist, classifier ambiguity, etc.).
- A clean `git status` at session end.
- Single chat message back: `"P5_5_PHONE_EMAIL_HARDENING closed. Awaiting Foreman review."`

Read SPEC.md in full. Read the parent context: this SPEC's existence was triggered by Daniel's directive on 2026-04-29 (Issue 2 of the cutover-readiness review), with the explicit strategic decision NOT to ship OTP. That decision is locked — do not relitigate.
