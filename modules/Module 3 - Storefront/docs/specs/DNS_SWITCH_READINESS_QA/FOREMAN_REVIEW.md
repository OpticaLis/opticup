# FOREMAN_REVIEW — DNS_SWITCH_READINESS_QA

> **Reviewed by:** opticup-strategic (Foreman)
> **Review date:** 2026-04-17
> **SPEC author:** opticup-strategic (Cowork session cool-jolly-franklin)
> **Executor:** opticup-executor (Claude Code, Windows desktop)

---

## 1. SPEC Quality Audit

**Score: 4.0 / 5**

### What was good
- **Comprehensive scope.** The 7-mission architecture with parallel agents was
  well-conceived and produced a thorough audit covering all layers (pages, blocks,
  views, APIs, Studio, EN quality, RU quality).
- **Severity classification guide (§D)** was detailed and consistent — every agent
  applied it correctly without needing cross-agent calibration.
- **Lessons-incorporated section (§11)** was thorough: 12 proposals from 3 prior
  reviews were evaluated, 7 applied, 5 correctly marked N/A.
- **Success criteria** were measurable and verifiable — 14 criteria, all met.
- **Read-only constraint** was clearly communicated and respected.

### What was wrong
- **Tenant UUID was incorrect.** The SPEC stated Prizma UUID as
  `4a9f2c1e-f099-49a0-b292-c0b93e155c41` which does not match the live DB
  (`6ad0781b-37f0-47a9-92e3-be9ed1477e1c`). This is a SPEC authoring failure.
  The author (me) copied from a stale reference during the Cowork session
  instead of running a live verification query. Had the executor blindly trusted
  the SPEC, all 6 DB-heavy agents would have queried the wrong tenant.
  **Root cause:** The SPEC authoring protocol's Step 1.5 Cross-Reference Check
  covers DB object names but NOT runtime identifiers (UUIDs, slugs, config
  values). This gap must be closed.
- **Page inventory count was stale (57 vs 66 actual).** Not a blocker (the `≥ 57`
  guard absorbed it) but indicates the inventory was built from a query during
  SPEC authoring that didn't match the live state at execution time. Minor.
- **API Route 3 method wrong (GET vs POST).** Minor SPEC documentation error.
- **Stop-trigger at 10 pages was poorly specified.** The trigger said "STOP" but
  the intent was "detect systemic issue." The executor correctly chose to continue
  and document, but this required a real-time judgment call that shouldn't have
  been necessary. Future SPECs need to distinguish "stop-and-escalate" from
  "note-systemic-and-continue."

---

## 2. Execution Quality Audit

**Score: 4.8 / 5**

### What was excellent
- **UUID verification before dispatch.** The executor caught the wrong SPEC UUID
  on a baseline query and corrected it before any agent launched. This saved the
  entire audit from being wasted.
- **Agent parallelism.** 6 background agents + 1 foreground mission, all completed
  in ~17 minutes (SPEC estimated 2–4 hours). Exceptional efficiency.
- **Deviation handling.** 5 SPEC deviations logged with clear reasoning in
  EXECUTION_REPORT §3. Each decision (especially D-3 on the stop trigger) was
  well-justified and served the SPEC's purpose over its letter.
- **Cross-mission severity promotion.** The executor reclassified og:image from
  MEDIUM to HIGH after cross-referencing Mission 1 and Mission 3 findings. Smart.
- **Iron Rules self-audit** was honest and complete.
- **Zero code changes, zero DB writes.** Read-only constraint held perfectly.

### What could improve
- **Agent prompt standardization.** The executor noted spending ~15 minutes
  crafting 6 custom agent prompts. A reusable template would help — see
  executor Proposal E-2 below.
- **The Mission 1 agent found 29 pages returning 404 but continued past the
  10-page stop trigger.** While the decision was correct (and the executor
  logged it transparently), a more conservative executor would have stopped.
  The -0.2 is for the ambiguity in how to handle this, not for the outcome.

---

## 3. Findings Processing

### M3-DNS-SPEC-01 [MEDIUM] — Prizma tenant UUID wrong in SPEC
**Disposition: TECH_DEBT**
Add to SPEC_TEMPLATE Step 1.5: "Verify all runtime identifiers (tenant UUIDs,
slugs, config IDs) against live DB during Pre-Flight. Copy the live value, not
a memorized or stale reference." Also add to opticup-strategic skill's
Pre-SPEC Preparation: mandatory `SELECT id FROM tenants WHERE slug='{slug}'`
before writing any SPEC that references a tenant.

### M3-DNS-SPEC-02 [LOW] — Stop-trigger "10 pages" too conservative
**Disposition: TECH_DEBT**
Refine SPEC_TEMPLATE stop-trigger grammar to distinguish two types:
- **STOP-ESCALATE:** Genuine blockers where continuing would cause harm
  (e.g., "if any SQL errors → STOP")
- **STOP-SUMMARIZE:** Systemic patterns where detailed per-item investigation
  should switch to summary mode but the finding must still be documented
  (e.g., "if >10 pages error → log pattern, skip remaining per-page detail,
  continue other missions")

### M3-DNS-SPEC-03 [LOW] — Page inventory count stale (57 vs 66)
**Disposition: DISMISS**
SC-2's `≥ 57` guard absorbed the drift correctly. Baseline counts in overnight
SPECs will always be slightly stale. Not worth adding process overhead.

### M3-DNS-SPEC-04 [LOW] — API Route 3 method wrong (GET vs POST)
**Disposition: DISMISS**
Minor documentation error in a closed SPEC. No code impact.

### M3-DNS-SESSION-01 [LOW] — SESSION_CONTEXT not updated between SPECs
**Disposition: DISMISS**
Normal operation. SESSION_CONTEXT updates at SPEC close, which is what happened.

### M3-DNS-REPO-01 [INFO] — Uncommitted non-SPEC changes in working tree
**Disposition: DISMISS for this SPEC**
The accumulated uncommitted files (guardian reports, in-flight SPECs, Cowork
config) are a known pattern. The `M3_SPEC_FOLDER_SWEEP` previously queued
from HOMEPAGE_LUXURY_REVISIONS remains the correct remediation path. Not this
SPEC's problem.

---

## 4. Audit Findings — Strategic Prioritization

The executor produced a detailed report with 4 CRITICAL, 10 HIGH, 14 MEDIUM,
13 LOW findings. As Foreman, here is the strategic prioritization for Daniel:

### The ONE gating item: EN/RU routing (CRITICAL-1 + CRITICAL-2)

Everything else is either a small fix (minutes to hours) or post-launch work.
The routing issue is the single large SPEC that gates the DNS switch. Until EN
and RU pages actually serve, there's no point fixing their content quality,
SEO meta, or hreflang tags.

**Recommended SPEC sequence:**

1. **EN_RU_ROUTING_FIX** — investigate Astro i18n routing, fix `[...slug].astro`
   or locale-prefixed dynamic routes so all 18 EN + 18 RU published pages serve.
   Fixes CRITICAL-1, CRITICAL-2. Estimated: 1-2 days.
2. **CONTACT_FORM_FIX** — already queued. Fix `/api/leads/submit` 404 on Vercel.
   Fixes CRITICAL-3. Estimated: half day.
3. **QUICK_DB_FIXES** — single SPEC for the small SQL/config fixes:
   - CRITICAL-4: `/prizmaexpress/` RU word corruption (5 min)
   - CRITICAL-5: `/optometry/` publish or remove (1 min per lang)
   - HIGH-3: og:image config (5 min)
   - HIGH-4: Hebrew brand name leak in EN/RU titles (8 DB rows)
   - HIGH-9: `/multi/` broken CTA href (1 min)
   Estimated: 1 hour total.
4. **SEO_META_TEMPLATE_FIX** — template-level fixes:
   - HIGH-1: canonical/OG host → `prizma-optic.co.il`
   - HIGH-2: hreflang links
   - MED-2/MED-3: meta description / og:description rendering
   Estimated: half day.
5. **STUDIO_TENANT_ID_HARDENING** — HIGH-7, HIGH-8, MED-11:
   - Add `tenant_id` to Studio write operations
   Estimated: half day. Can be post-launch.

### Items NOT worth a SPEC (do manually or defer)
- HIGH-5 (brand hero images) — needs Daniel's decision on which images to use
- HIGH-6 (view REVOKE) — post-launch, no security impact today
- HIGH-10 (EN /about/ rewrite) — needs human editor, not code
- MED-9 (writeLog in Studio) — architectural decision needed
- MED-10 (Studio sb.from() vs shared.js) — architectural decision needed
- All 13 LOW items — nice-to-have, no timeline pressure

---

## 5. Author-Skill Improvement Proposals

### Proposal A-1: Add runtime-identifier verification to SPEC Pre-Flight

**Section:** `opticup-strategic/SKILL.md` → "Step 1.5 — Cross-Reference Check"

**Change:** Add a new bullet after the existing name-collision grep:
```
5. **Verify runtime identifiers:** For every UUID, slug, config key, or
   environment variable the SPEC references by value, run a live verification
   query during Pre-Flight:
   - Tenant UUIDs: `SELECT id FROM tenants WHERE slug='<slug>'`
   - View names: `SELECT viewname FROM pg_views WHERE viewname = '<name>'`
   - Config keys: `SELECT key FROM storefront_config WHERE tenant_id = '<uuid>'`
   Paste the verified live value into the SPEC. Never copy from memory or
   stale docs. Document the verification in §11 with:
   "Runtime identifiers verified 2026-XX-XX: tenant UUID confirmed <value>."
```

**Rationale:** M3-DNS-SPEC-01. The SPEC contained a wrong tenant UUID copied
from a stale reference. The executor caught it, but this was luck (baseline
query happened to reveal it). A systematic pre-flight check prevents this class
of error entirely.

### Proposal A-2: Two-tier stop-trigger grammar in SPEC_TEMPLATE

**Section:** `opticup-strategic/references/SPEC_TEMPLATE.md` → "§5. Stop-on-Deviation Triggers"

**Change:** Replace the current freeform list with a two-tier structure:
```markdown
## 5. Stop-on-Deviation Triggers

### 5a. STOP-ESCALATE (halt execution, report to Foreman/Daniel)
Triggers where continuing would cause harm, waste, or data corruption:
- [example: any non-SELECT SQL executed]

### 5b. STOP-SUMMARIZE (switch to summary mode, continue other missions)
Triggers where a systemic pattern is detected and per-item detail is no
longer useful, but the finding must still be documented:
- [example: if >10 pages return same error class → log the pattern + affected
  URL list, skip remaining per-page deep inspection, continue other missions]
```

**Rationale:** M3-DNS-SPEC-02. The executor correctly continued past a "STOP"
trigger because stopping would have produced an incomplete report. But the
decision required real-time judgment that shouldn't have been necessary. Clear
grammar prevents this class of ambiguity.

---

## 6. Executor-Skill Improvement Proposals

### Proposal E-1: Pre-Dispatch UUID Verification (from executor)

**Accepted.** The executor's own Proposal E-1 in EXECUTION_REPORT §8 is
well-formulated. Apply it to the executor skill as described. Add a
"Multi-Agent Dispatch Pre-Flight" sub-section to the execution protocol.

### Proposal E-2: Master Report Template (from executor)

**Accepted.** Create `MASTER_REPORT_TEMPLATE.md` in executor references.
Use this SPEC's `DNS_SWITCH_READINESS_REPORT.md` structure as v1. Reference
it from SPEC_TEMPLATE §8 ("when the SPEC produces a multi-mission aggregated
report, use the master report template").

---

## 7. Master-Doc Update Checklist

| File | Updated in executor commits? | Pending? |
|------|------------------------------|----------|
| `MASTER_ROADMAP.md` | No (no phase status change) | No update needed |
| `docs/GLOBAL_MAP.md` | No (no new functions) | No update needed |
| `docs/GLOBAL_SCHEMA.sql` | No (no new DB objects) | No update needed |
| `SESSION_CONTEXT.md` (ERP) | Yes (updated in commit b74d2b1) | Done |
| Module 3 `CHANGELOG.md` | Not updated | LOW — can be done in next SPEC commit |

---

## 8. Verdict

### 🟢 CLOSED

The executor delivered all 14 success criteria. The audit is complete and
comprehensive. The 4 SPEC authoring errors (UUID, count, method, stop-trigger
ambiguity) were all caught and handled correctly by the executor — none
impacted the audit's validity. The 6 meta-findings are processed above.
The 4 improvement proposals (2 author, 2 executor) are concrete and actionable.

The audit itself produced a clear, actionable roadmap for DNS switch readiness.
The biggest value-add is the definitive answer: the site is NOT ready due to
EN/RU routing, but the fix path is bounded and clear.

**Quality of this SPEC cycle: HIGH.** The overnight multi-agent architecture
worked as designed, completing in 17 minutes what would have taken a human
team several days. The executor's judgment calls (especially on the stop
trigger and UUID correction) demonstrated mature bounded autonomy.
