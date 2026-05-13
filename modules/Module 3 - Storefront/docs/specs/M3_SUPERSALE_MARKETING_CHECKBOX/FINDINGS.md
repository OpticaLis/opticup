# FINDINGS — M3_SUPERSALE_MARKETING_CHECKBOX

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_SUPERSALE_MARKETING_CHECKBOX/FINDINGS.md`
> **Written by:** opticup-executor (during SPEC execution, append-only)
> **Review disposition:** decided by Foreman in `FOREMAN_REVIEW.md`

---

## Findings

### Finding 1 — Consent-write logic is now duplicated in 3 places (Rule 21 tech debt)

- **Code:** `M3-DEBT-22`
- **Severity:** MEDIUM
- **Discovered during:** Step 1.5 collision check, then re-confirmed at code-edit time
- **Location:** Three copies of the same v1 `cookie_consent` write logic:
  1. `src/lib/consent.ts:84` (function `setConsent({analytics, marketing}, version)`) — server+client TypeScript module, fully tested code path, dispatches `consent-changed`.
  2. `src/components/CookieBanner.astro:156-162` (function `writeChoice(choice)`) — inline `<script is:inline>` JavaScript inside an Astro component, server-rendered but executes only in the browser.
  3. `src/lib/shortcodes/lead-form-validation.ts:139-152` (function `_scWriteConsent(marketing)`) — inline JavaScript inside a server-returned HTML string emitted by `buildScript()` — added by this SPEC.
- **Description:** All three implement the SAME contract: write the v1 `cookie_consent` shape to cookie (`max-age=31536000; path=/; SameSite=Lax`), mirror to `localStorage.cookie_consent`, set `window.__consent`, dispatch `consent-changed` event. SPEC §9 explicitly authorized the third copy ("duplicating the small write logic is also acceptable if extraction is risky") because the alternative requires plumbing changes to how Astro bundles `<script>` tags inside string-emitted shortcode HTML. The 2-copy pre-existing duplication (consent.ts ↔ CookieBanner.astro) is itself a Rule 21 violation that predates this SPEC.
- **Reproduction:**
  ```
  grep -rn "cookie_consent.*max-age" src/
  # Returns 3 matches across 3 files.
  ```
- **Expected vs Actual:**
  - Expected (Iron Rule 21): Single source of truth. All callers `import { setConsent } from 'somewhere'`.
  - Actual: 3 copies that must stay in sync by hand. If `cookie_consent` shape ever changes (e.g. add `region` field for GDPR, or bump to `version: 'v2'`), 3 places need editing.
- **Suggested next action:** NEW_SPEC — Title: `M3_CONSENT_WRITE_DEDUPE`. Approach:
  1. Create `src/lib/consent-bootstrap.client.ts` — a small client-only script that imports `setConsent` from `consent.ts` and assigns it to `window.OpticConsent = { setConsent, getConsent, hasConsent, revokeConsent }`.
  2. Side-import this from `BaseLayout.astro` so every page loads it once.
  3. Refactor `CookieBanner.astro`'s `writeChoice` to be a 1-line wrapper around `window.OpticConsent.setConsent`.
  4. Refactor `lead-form-validation.ts`'s `_scWriteConsent` to be a 1-line wrapper around `window.OpticConsent.setConsent`.
  5. Verify all 3 paths still work: banner accept/reject/customize, form submit consent, programmatic `revokeConsent()` via footer.
- **Rationale for action:** Right-sized scope. Will run cleanly in 1 SPEC, ~1 hour. The dedupe is a strict improvement — no behavior change, single point of future modification.
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 2 — Pre-commit `rule-23-secrets` hook reports `1 violations` but commits proceed; UX confusion

- **Code:** `M3-OBS-22`
- **Severity:** LOW
- **Discovered during:** `git commit` for storefront Commit 1 (`82f820b`)
- **Location:** `opticup-storefront/scripts/verify.mjs` (or whichever script the husky pre-commit hook chains)
- **Description:** When committing my +24 lines to `src/lib/shortcodes/lead-form-validation.ts`, the pre-commit hook's per-rule breakdown reported `rule-23-secrets: 1 violations, 0 warnings`. The summary footer then said `All clear — 1 violations, 0 warnings across 1 files` (note: contradicts "All clear" with a non-zero violation count). The commit was created (`82f820b`) — meaning the hook did not block on this violation. The flagged "secret" is almost certainly the pre-existing `EF_LEAD_INTAKE_ANON_JWT` constant at lines 20-21 of the same file (in git since `P5_7_STOREFRONT_FORM_REWIRE`, 2026-05-03) — NOT introduced by my edit. The hook's logic appears to scan staged files for JWT patterns regardless of whether the JWT is new or pre-existing, and to fail-open (warn-but-allow) when the staged diff did not introduce the match.
- **Reproduction:**
  ```
  cd opticup-storefront
  git commit -m "anything" # while editing any file containing a known existing JWT
  # Hook reports rule-23-secrets: 1 violations AND prints "All clear"
  ```
- **Expected vs Actual:**
  - Expected: hook either (a) blocks if a NEW secret is introduced in the diff, or (b) ignores pre-existing secrets entirely. Summary line consistent with breakdown.
  - Actual: reports violation, says "All clear", allows the commit. Confusing UX — a real executor might read the contradictory output and assume the commit failed.
- **Suggested next action:** TECH_DEBT — Either (a) tighten the hook to only flag NEW secrets in the diff (preferred), or (b) re-word the summary line to say "No new violations introduced; 1 pre-existing finding in scanned files". Either approach removes the contradiction.
- **Rationale for action:** Low impact (commit proceeds; the hook is informational on pre-existing matches). But the contradiction between "1 violations" and "All clear" eats trust over time — an executor that learns to ignore the violation count might miss a real new violation. The fix is small (one script edit).
- **Foreman override (filled by Foreman in review):** { }

---

### Finding 3 — SPEC §12 Rule-21 grep was authored but not pre-executed by the Foreman; collision surfaced at executor time instead

- **Code:** `M3-PROC-22`
- **Severity:** MEDIUM
- **Discovered during:** Step 1.5 collision check (executor)
- **Location:** `modules/Module 3 - Storefront/docs/specs/M3_SUPERSALE_MARKETING_CHECKBOX/SPEC.md §12 Cross-Reference Check`
- **Description:** SPEC §12 declared: "New names: `setConsent` function in new file `src/lib/cookie-consent-helpers.ts`. Grep against `GLOBAL_MAP.md` + `FILE_STRUCTURE.md` + storefront `src/**`: confirm no existing `setConsent` symbol. If a collision is found → rename to `setCookieConsent`." The grep itself is a Foreman-side responsibility (per opticup-strategic SKILL "SPEC Authoring Protocol" — Step 1.5 type checks BEFORE sealing the SPEC). If the Foreman had pre-executed the grep, the existing `src/lib/consent.ts:84` would have surfaced and the SPEC would have authored §9 as "reuse existing `setConsent` from `src/lib/consent.ts`" (with the inline-duplicate fallback path) instead of "new file `src/lib/cookie-consent-helpers.ts`" with a rename mitigation. The rename mitigation, applied as-written, would have produced a new file with byte-equivalent semantics to the existing one — a clean Rule 21 violation.
- **Reproduction:**
  ```
  grep -rn "export function setConsent" /c/Users/User/opticup-storefront/src/
  # Returns src/lib/consent.ts:84:export function setConsent(
  ```
- **Expected vs Actual:**
  - Expected: SPEC §12's grep is pre-executed by the Foreman; the SPEC's §9 nominates the existing function for reuse from the start.
  - Actual: SPEC §12 wrote the grep recipe but neither pre-ran it nor flagged the existing file. Executor caught the collision at Step 1.5, applied Iron-Rule-first reasoning (Rule 21 > SPEC §12 rename mitigation), and used SPEC §9's secondary path (inline duplication).
- **Suggested next action:** TECH_DEBT — `.claude/skills/opticup-strategic/SKILL.md` "SPEC Authoring Protocol" should explicitly require pre-execution of every grep referenced in §12, with the result quoted verbatim in the SPEC. The directive "executor performs final grep at Step 1.5" should be renamed to "executor RE-CONFIRMS the Foreman's pre-flight grep at Step 1.5" — making clear the grep is a Foreman duty first, executor verification second.
- **Rationale for action:** Without this, every cross-reference check is double work at best, missed collision at worst. The current SPEC was salvaged at runtime by an executor's heuristic; that's not a system to rely on.
- **Foreman override (filled by Foreman in review):** { }

---
