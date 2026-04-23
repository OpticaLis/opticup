# FOREMAN_REVIEW — STOREFRONT_FORMS (Part B)

> **Location:** `modules/Module 4 - CRM/final/STOREFRONT_FORMS_PART_B/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Cowork)
> **Written on:** 2026-04-23
> **SPEC reviewed:** `SPEC.md` (authored 2026-04-23)
> **Executor report:** `EXECUTION_REPORT.md` + `FINDINGS.md`
> **Verdict:** CLOSED

---

## 1. Verdict

**CLOSED.** Two storefront Astro pages delivered, built, visually verified,
pushed to `opticup-storefront/develop`. The executor navigated a SPEC design
contradiction (§5 vs §12 palette) correctly by following the explicit "replicate
the live page" directive. Caught an Astro CSS scoping bug during the mandatory
visual verification step — exactly the kind of issue that step was designed to
catch. Single commit, clean repos, build passes. Ready for Daniel to merge
storefront develop → main for Vercel deployment.

---

## 2. Execution Scoring

| Dimension | Score | Notes |
|-----------|-------|-------|
| Adherence to SPEC | 4.5/5 | 19/19 criteria pass. Two deviations (hideChrome + design palette) both well-reasoned and documented. Design conflict was the SPEC's fault, not the executor's. |
| Iron Rule compliance | 4/5 | Rule 9 partial violation (hardcoded WhatsApp + booking fee fallback) — inherited from ERP reference, not introduced. Correctly flagged as finding. |
| Commit hygiene | 5/5 | Single clean commit, explicit `git add` by filename, pre-commit hooks passed. |
| Documentation | 5/5 | Thorough EXECUTION_REPORT with 5-scenario visual verification table, 4 decisions documented, 4 findings logged. Self-assessment honest (8.7, not inflated). |
| Autonomy discipline | 5/5 | Zero questions asked. 4 ambiguities resolved correctly with documented reasoning. The SPEC conflict resolution (§5 outranks §12) was the right call. |
| Finding discipline | 5/5 | 4 findings logged, severity calibrated correctly. None absorbed into scope. The Astro scoping discovery (Finding 3) is genuinely useful knowledge. |
| Visual verification | 5/5 | 5 scenarios × 2 viewports. Mock-data injection to test the form-filled state was creative and beyond what the SPEC required. Caught the `<style>` scoping bug — proving the visual verification protocol's value. |

**Execution score: 4.79/5**

---

## 3. SPEC Scoring (self-assessment by Foreman)

| Dimension | Score | Notes |
|-----------|-------|-------|
| Correctness | 3.5/5 | The §5 vs §12 design contradiction was a genuine SPEC authoring failure. Both sections told the executor different things — the executor resolved it correctly, but shouldn't have had to. |
| Completeness | 4/5 | Missed the `hideChrome` requirement (the live page is chromeless — SPEC should have noticed). Missed the Astro `<style>` scoping warning despite knowing the pages use client-side rendering. |
| Clarity | 4/5 | §5's "replicate the live page" directive was clear. §12's checklist was clear too — the problem was that they described different designs. §9's code example was a helpful scaffold. |
| Estimates | 4.5/5 | File sizes landed at 306 and 150 vs estimates of 280-320 and 180-220. Registration was spot-on; unsubscribe came in under (150 vs 180) — good, not a problem. |

**SPEC score: 4.0/5**

---

## 4. Finding Dispositions

### M4-SPEC-01 (MEDIUM) — SPEC design direction split

**Disposition: ACCEPTED — process improvement.** This was my (Foreman's) error.
The SPEC §5 correctly pointed to the live page, but I failed to update the §12
visual verification checklist to match. The checklist language was copied from
the Part A SPEC which described the ERP form's navy/blue design. Future SPECs
must derive §12 checklists from §5's design source, not from an earlier SPEC.
Captured in Lesson 1 below.

### M4-SEC-01 (LOW) — POST doesn't re-verify HMAC token

**Disposition: TECH_DEBT — trivial follow-up.** The executor correctly followed
the SPEC's prescribed POST flow. Adding `?token=` to the POST URL is a one-line
change in the storefront page. Low priority since the EF validates IDs
server-side anyway, but defense-in-depth is cheap. Can be folded into the next
storefront touch (e.g., end-to-end testing after merge to main).

### M3-ASTRO-01 (LOW) — Astro `<style>` scoping vs innerHTML

**Disposition: ACCEPTED — skill improvement.** The executor's Proposal 1 is
correct: add this as a documented pattern in `opticup-executor/SKILL.md`. This
will recur for every client-rendered public page. The visual verification step
saved us here — without it, this bug would have shipped to production.

### M4-R09-01 (LOW) — Hardcoded WhatsApp + booking fee fallback

**Disposition: DEFER to post-go-live.** This is an inherited Rule 9 violation
present across 4+ files in both repos + the already-live `/eventsunsubscribe/`
page. Fixing it properly needs a `tenants.storefront_whatsapp` field (or
reusing an existing phone column) and a cross-repo sweep. Not blocking go-live
since Prizma is the only tenant. Track in the Module 4 debt log alongside
M4-DEBT-FINAL-02 (hardcoded STOREFRONT_ORIGIN).

---

## 5. SPEC-Author Lessons (2 concrete improvements)

### Lesson 1 — Derive visual verification checklists from the design source

**Problem:** §12's checklist described navy/blue/rose (ERP form palette) while
§5 said "replicate the live dark/gold page." The executor had to make a judgment
call that could have gone wrong.

**Action:** Add to opticup-strategic SKILL.md a rule: "When a SPEC contains a
design-reference URL in §5, the Visual Verification checklist in §12 MUST be
written AFTER inspecting that URL. Never copy checklist items from a previous
SPEC without verifying they match the current design source. If the SPEC author
cannot access the URL, mark the checklist as UNVERIFIED and require the executor
to reconcile before implementing."

### Lesson 2 — Warn about framework-specific rendering gotchas

**Problem:** The SPEC knew both pages would use client-side `innerHTML` rendering
but did not warn about Astro's CSS scoping behavior. Cost: ~8 minutes of
executor debugging time.

**Action:** When a SPEC prescribes client-side DOM injection in an Astro page,
include a one-line note in §9 Implementation Notes: "Use `<style is:global>`
for any CSS that targets innerHTML-injected elements — Astro scoped styles
do not reach dynamically inserted DOM." This should also be added to the
executor skill as Proposal 1 suggests.

---

## 6. Status After This SPEC

**STOREFRONT_FORMS Part A + Part B are both CLOSED.**

Complete flow now exists:
- `send-message` EF generates HMAC-signed storefront URLs ✅
- `/event-register/` page on storefront consumes the token, pre-fills form ✅
- `/unsubscribe/` page on storefront shows branded opt-out ✅
- Legacy ERP forms still work via UUID params (backwards compat) ✅

**To go live:**
1. Daniel merges `opticup-storefront/develop → main` → Vercel deploys
2. End-to-end test: trigger a real SMS from CRM on demo tenant → click the
   registration link → verify the storefront form loads with pre-filled data →
   submit → verify attendee row created in DB
3. Same for unsubscribe: click link → verify branded page → confirm opt-out

**Next on PRE_PRODUCTION_ROADMAP:**
- §3 — Automation Rules v2 (separate screen, wizard builder)
- §4 — ADS Management (post-P7)
