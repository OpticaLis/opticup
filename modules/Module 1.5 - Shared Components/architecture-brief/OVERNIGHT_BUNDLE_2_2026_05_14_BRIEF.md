# OVERNIGHT_BUNDLE_2_2026_05_14 — Architecture Brief

**Type:** Second overnight autonomous run on 2026-05-14. Multi-tier bundle combining urgent production fixes + tech-debt closure + 4 LEARNING runs that improve the entire Pipeline machinery for everything that comes after. Designed to advance the project AND make the system smarter overnight.

**Why this exists:** The first overnight Bundle (just completed) shipped 7/9 items + surfaced 2 new data points: (a) 758 unsubstituted_placeholder failures on Prizma broadcasts since 2026-05-13 (silent data loss); (b) the destructive-ops check tool has a parsing gap that blocked B.2 + B.3. Beyond these tactical items, Daniel asked specifically: "Maybe even a learning run that helps us finish faster and better." This bundle answers both — fix urgent + harden the machinery.

**Execution model:** Single Claude Code chat. Skip-not-stop on per-item failures. Sub-agents authorized for parallel processing. Aggregate Hebrew summary at end. Push every item's commits to develop immediately at item close.

---

## 1. Items in scope (6 tiers, ordered by urgency/value)

### Tier 1 — URGENT production fix (~2 hours)

**T1.1 — `M4_FIX_UNSUBSTITUTED_PLACEHOLDER_REGISTRATION_URL_PRIZMA`**

D1 diagnostic from Bundle 1 surfaced 758 messages in Prizma's 2026-05-13 broadcast wave that were rejected with `unsubstituted_placeholder: registration_url`. Demo had 7. Production is silently losing broadcast deliveries.

This SPEC:
1. **Diagnose** — read 5 sample rejected rows from `crm_message_log` (status=rejected, error_message LIKE '%registration_url%', tenant=prizma, 2026-05-12 to 2026-05-14). Extract: which broadcast_id, which template_id, which recipient lead_id, what context was passed.
2. **Root-cause** — three hypotheses to test in order:
   - H1: broadcast wizard did NOT pass `event_id` to `crm_message_queue` for that broadcast wave (BROADCAST_EVENT_LINK_SUPPORT was 2026-05-13 same-day fix; some rows may have predated the fix).
   - H2: Template uses `%registration_url%` but the linked event has no public registration URL configured.
   - H3: send-message EF version mismatch between deploy and the template_id resolution path.
3. **Repair** — based on root-cause:
   - If H1: rebuild and re-enqueue the failed message rows with the right event_id. Daniel-authorized Level 2 UPDATE on existing `crm_message_log` to reset to status='pending' + populate missing context, OR new SPEC for resend.
   - If H2: SKIP repair (data-quality issue, not code bug — log finding, defer to follow-up).
   - If H3: redeploy send-message + re-drain queue.
4. **Verify** — query post-repair, confirm 758 rows resolved (or documented as accepted data loss with reason).

**Tenant scope:** Reads Prizma. Writes happen only if Daniel pre-authorization is implicit in this SPEC's scope (broadcast repair is owner-facing operations). If Daniel-level decisions surface (e.g. "should we re-send to these 758 customers?"), STOP + write escalation, do NOT silently re-send.

**Estimated:** 2 hours.

---

### Tier 2 — Tech debt closure (~1.5 hours)

**T2.1 — `M1_5_FIX_DESTRUCTIVE_OPS_CHECK_DECLARATION_PARSING`**

Bundle 1 escalation 570369e: `scripts/checks/destructive-ops-declared.mjs` blocks any commit deleting a file even when the SPEC explicitly declares `git rm` in its `## Destructive Operations` section. Fix the parser to recognize declared destructive ops and authorize them per Iron Rule 32.

**T2.2 + T2.3 — `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` + `M1_5_CRM_CSS_STUB_CLEANUP` (combined into one SPEC after T2.1 lands)**

The two tech-debt SPECs blocked by T2.1. Combine into single SPEC `M1_5_CSS_HOUSEKEEPING_POST_FIX` that:
- Verifies the check tool fix works on a test deletion.
- Performs the 3 file deletes (`css/employees.css` + `css/crm-screens.css` + `css/crm-visual.css`).
- Removes corresponding `<link>` references in remaining HTML files.

**Estimated total:** 1.5 hours.

---

### Tier 3 — LEARNING: SKILL hardening audit (~3-4 hours)

**T3.1 — `SKILL_HARDENING_AUDIT_2026_05_14`**

The most valuable item in this bundle. The Pipeline currently runs on 4 skills (architect, strategic, executor, reviewer). Bundle 1 alone surfaced 2 patterns that should've been encoded earlier (P40 + P41). High probability MORE patterns are hiding in our history.

This SPEC:
1. **Inventory** — read every FOREMAN_REVIEW.md in `modules/*/docs/specs/*/` (~30+ files). Extract every "Skill improvement proposed" entry. Cross-reference with what's actually been encoded in the 4 SKILL.md files. Find the gaps.
2. **Cross-reference** — read every DECISIONS_LOG entry (60+ entries in CROSS.md + per-module logs). Find decisions that recur 3+ times without being formalized as a Pattern.
3. **Cross-reference** — read every escalation file in `modules/*/escalations/`. Find recurring escalation patterns that should auto-resolve.
4. **Cross-reference** — read every FINDINGS.md and look for findings that recur across modules — those are skill blindspots.
5. **Synthesize** — produce a prioritized list of skill improvements to apply, grouped by skill and by severity (CRITICAL = pattern blocking quality / HIGH = recurring waste / MEDIUM = optimization / LOW = nice-to-have).
6. **Apply** — directly to the 4 SKILL.md files. Each improvement gets a P-number, rationale, and source-evidence (which FOREMAN_REVIEW / DECISIONS_LOG entries justify it).
7. **Estimate impact** — for each applied improvement, estimate: how many minutes of future SPEC work would have been saved if this had been in the skill earlier. Sum gives expected ROI in hours saved per future SPEC.

**Output artifacts:**
- `SKILL_HARDENING_AUDIT_2026_05_14_REPORT.md` — full inventory + gap analysis + applied improvements + ROI estimate.
- 4 modified SKILL.md files (architect/strategic/executor/reviewer) with new P-numbered patterns.

**Estimated:** 3-4 hours via sub-agent parallelism (one sub-agent per skill cross-checked against the corpus).

---

### Tier 4 — LEARNING: SPEC_TEMPLATE evolution (~2 hours)

**T4.1 — `SPEC_TEMPLATE_EVOLUTION_V3`**

Every FOREMAN_REVIEW for the last month has harvested "author skill improvements" — most reach SKILL.md via small edits, but no one has consolidated them into a true SPEC_TEMPLATE rewrite. Result: SPEC_TEMPLATE.md is internally inconsistent (some patterns codified, others not).

This SPEC:
1. **Inventory** — every SPEC_TEMPLATE.md change since 2026-04-01. Identify what's been added piecemeal.
2. **Identify** — every "author should have done X" lesson from the last 30 FOREMAN_REVIEWs that DIDN'T result in a SPEC_TEMPLATE edit.
3. **Rewrite** — produce SPEC_TEMPLATE v3 that:
   - Cleanly integrates all pattern improvements.
   - Has a numbered section structure (current §0/§1/§2/... is inconsistent).
   - Includes a "common gotchas" appendix harvested from FINDINGS.
   - Has clear "REQUIRED for every SPEC" vs "REQUIRED ONLY FOR <type>" sections.
4. **Migration plan** — old SPECs DON'T need backfilling; the v3 template applies to all new SPECs from this commit forward.
5. **Apply** — replace `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` with v3. Backup the old version under `_archive/spec-template-versions/v2_2026_05_14/`.

**Output artifacts:**
- New SPEC_TEMPLATE.md v3.
- `SPEC_TEMPLATE_EVOLUTION_V3_REPORT.md` with before/after structural diff + harvested-lessons inventory.

**Estimated:** 2 hours.

---

### Tier 5 — LEARNING: Architecture debt sweep (~2-3 hours)

**T5.1 — `ARCHITECTURE_DEBT_SWEEP_2026_05_14`**

Read-only audit that finds architecture inconsistencies not yet documented in TECH_DEBT.md.

This SPEC scans:
1. **Tables without `updated_at` triggers** — query Supabase `pg_trigger` for all tenant_id-bearing base tables. Known: `tenants`, `crm_automation_rules`. Likely more.
2. **Tables with `tenant_id` but no canonical JWT-claim RLS** — every table's RLS policies grep'd against the Rule 15 canon. Flag deviations.
3. **UNIQUE constraints not scoped to tenant_id (Rule 18 violations)** — `pg_constraint` query.
4. **Hardcoded business values in code** — grep ERP+storefront for patterns matching `'052-' / '053-' / '054-'` phone literals, `'prizma' / 'Optic Up'` strings outside SaaS-clean code paths, `ils` currency hardcodes, `7.7% tax` literals.
5. **Tables without indexes on `tenant_id`** — most queries are tenant-scoped; missing index = scan-the-world.
6. **Edge Functions without `SET search_path='public'`** — security hardening pattern from SECURITY_HOTFIX_2026_05_13. Newer EFs may have skipped this.
7. **Views without `security_invoker=on`** — same hardening pattern, deviations are SECURITY findings.

**Output:** `ARCHITECTURE_DEBT_SWEEP_2026_05_14_REPORT.md` with prioritized findings. Each finding gets a severity (CRITICAL = security gap, HIGH = correctness gap, MEDIUM = performance, LOW = consistency) + estimated fix effort + suggested SPEC slug.

**No code changes** — pure audit. Findings drive future SPECs.

**Estimated:** 2-3 hours via sub-agent parallelism (one sub-agent per audit dimension).

---

### Tier 6 — LEARNING: Sentinel deep dive (~3 hours)

**T6.1 — `SENTINEL_DEEP_DIVE_2026_05_14`**

The Sentinel ran C.1 last bundle (10 missions). This deeper run goes below those missions:
1. **RLS policy completeness audit** — every table's policies enumerated, cross-referenced against table sensitivity (customer data / staff data / tenant config / public). Any table lacking the right policy set surfaces a finding.
2. **Trigger completeness audit** — every table that should have `updated_at` trigger / soft-delete trigger / activity-log trigger but doesn't.
3. **RPC security audit** — every SECURITY DEFINER RPC: does it have `SET search_path='public'`? Does it validate tenant_id from JWT claims? Does it have a `REVOKE FROM PUBLIC` grant or just default?
4. **Edge Function auth audit** — every EF in `supabase/functions/`: `verify_jwt` default + per-function override correct? Origin allowlists configured? Service-role usage justified?
5. **Storage bucket privacy audit** — every Supabase storage bucket: public/private status + policy completeness + path conventions (e.g. canonical `tenants/<id>/...` paths vs legacy patterns).
6. **Cron job audit** — every pg_cron job: enabled? Schedule reasonable? Idempotent on duplicate runs? Failure logging?
7. **Migration drift audit** — every migration applied via MCP since 2026-03-01 vs migration files in `supabase/migrations/` (related to TD-2). Surface diff count.

**Output:** `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md` with findings per dimension. Each finding tagged HIGH/MEDIUM/LOW.

**No code changes** — pure audit. Different from T5.1 in that this looks at SECURITY + RELIABILITY axes; T5.1 looks at CORRECTNESS + PERFORMANCE axes.

**Estimated:** 3 hours via sub-agent parallelism.

---

## 2. Execution model

**Tier ordering (highest urgency/dependency first):**
- T1 (urgent fix) FIRST — independent of everything, must close before any cleanup that could mask the issue.
- T2 (tech debt) SECOND — T2.1 unblocks T2.2+T2.3. Sequential.
- T3 (skill hardening) THIRD — applies improvements that ALL subsequent SPECs in this bundle will benefit from.
- T4 (template evolution) FOURTH — depends on T3 to know what's already been promoted.
- T5 (architecture debt) FIFTH — read-only, can run in parallel with T6 on different sub-agents.
- T6 (Sentinel deep dive) SIXTH — read-only, can run in parallel with T5.

**Parallelism:** T5 + T6 run in parallel on different sub-agent threads. T3 internally parallelizes across 4 skills. T4 sequential.

**Skip-not-stop:** Same rule as Bundle 1. Single-item failure → skip + continue. The only HARD STOPS:
- Iron Rule violation surfaced.
- Prizma data write that wasn't pre-authorized for that SPEC's scope.
- Smoke <7/7 PASS at session start or pre-T1.1 → STOP T1.1, log + skip.
- `main` branch touched → STOP entire run.
- T1.1 surfaces an issue requiring Daniel-level decision (e.g. "re-send to 758 customers?") → STOP T1.1, write escalation, continue with T2+.

---

## 3. Hard constraints

**Tenant scope:**
- T1.1: Prizma READ + potentially repair-WRITE (within SPEC's pre-authorized scope only).
- T2.x: zero tenant data; demo only for smoke tests.
- T3/T4: zero data writes; skill/template files only.
- T5/T6: zero writes ANYWHERE (read-only audits).

**Backup requirements:**
- T1.1: backup affected `crm_message_log` rows BEFORE any UPDATE.
- T2.x: backup deleted files before delete.
- T3/T4: backup pre-edit skill/template files.
- T5/T6: no backup needed (no writes).

**Iron Rule 32 destructive ops declarations:**
- T1.1: `Level 2 UPDATE on crm_message_log subset, scoped to broadcast_id IN (...). Pre-authorized.`
- T2.x: `git rm 3 CSS files (declared per T2.1's check-tool-fix authorization).`
- T3: `Replace 4 SKILL.md files (CREATE OR REPLACE pattern — not destructive per Rule 32, declared as None).`
- T4: `Replace SPEC_TEMPLATE.md (CREATE OR REPLACE — not destructive per Rule 32, declared as None).`
- T5/T6: `None.` (read-only audits).

**Whitelist for any test:**
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

**Develop-only:** every commit to `develop`. Zero main-branch touch.

---

## 4. Output

Aggregate Hebrew status block at end:
- Per-tier rollup (T1 closed/skipped + T2 closed/skipped + ... + T6 closed/skipped)
- Per-item line with status emoji + slug + 1-line outcome + commit SHA
- Aggregate counts: SPECs closed, commits pushed, files modified/deleted, sub-agents spawned, audit findings discovered (by severity)
- Skill improvements applied (with P-numbers + ROI estimate)
- SPEC_TEMPLATE v3 status (applied? if not, why)
- T1.1 result: 758 placeholder failures — root cause identified, count repaired, count documented as accepted data loss
- Repo state at close (clean vs which files dirty)
- 3-most-important findings from T5+T6 surfaced at top of report for Daniel's morning review

Master report: `OVERNIGHT_BUNDLE_2_2026_05_14_REPORT.md` next to this Brief with full per-item detail.

Plus the 4 LEARNING-specific reports:
- `SKILL_HARDENING_AUDIT_2026_05_14_REPORT.md`
- `SPEC_TEMPLATE_EVOLUTION_V3_REPORT.md`
- `ARCHITECTURE_DEBT_SWEEP_2026_05_14_REPORT.md`
- `SENTINEL_DEEP_DIVE_2026_05_14_REPORT.md`

---

## 5. Estimated total runtime

| Tier | Items | Hours | Type |
|---|---|---|---|
| T1 | Placeholder fix | 2 | Urgent fix |
| T2 | Check-tool fix + CSS cleanup | 1.5 | Tech debt |
| T3 | SKILL hardening audit | 3-4 | Learning (high impact) |
| T4 | SPEC_TEMPLATE v3 | 2 | Learning (high impact) |
| T5 | Architecture debt sweep | 2-3 | Audit (learning) |
| T6 | Sentinel deep dive | 3 | Audit (learning) |
| **Total** | **9 items + 4 LEARNING runs** | **13-15 hrs** | Mixed |

Upper bound of overnight window. Parallelism between T5+T6 + T3's internal parallelism should compress to 11-13 hours actual wall-clock.

**Target commit count:** 18-25 commits.

---

## 6. Destructive Operations (this Brief)

Per Iron Rule 32:

1. **T1.1 — Level 2 UPDATE on `crm_message_log`** subset (758 rows max), scoped to specific broadcast_id WHERE clause. Backed up before write. Pre-authorized by this Brief's scope. ⚠️ Daniel-decision STOP trigger fires if scope expands beyond the pre-identified rows.

2. **T2.x — 3 file deletes** (`css/employees.css` + `css/crm-screens.css` + `css/crm-visual.css`). Authorized by T2.1's check-tool fix landing first.

3. **T3 — 4 SKILL.md edits**, CREATE OR REPLACE style (additive merge, not full rewrite). Not destructive per Rule 32. Backed up.

4. **T4 — SPEC_TEMPLATE.md replace** with v3. Backed up.

5. **T5/T6 — None.** Pure read-only.

**Total declared destructive ops:** 1 UPDATE (T1.1) + 3 file deletes (T2.x) = 4 destructive operations. All declared, all backed up.

---

## 7. What remains AFTER this bundle

**Phase 2 still pending (after T1.1 + applied skill improvements):**
- P2.1 M4_FB_CAPI_HYBRID_DEDUPLICATION (HIGH PRIORITY, 6-8 hrs) — requires Daniel decisions.
- P2.2 M3_PIXEL_VALIDATION_GAP_REPORTING (cross-repo, ~3 hrs) — deferred from Bundle 1.

**Phase 2.5 — Continuous Improvement:**
- Both SPECs still pending (Dashboard + Weekly Brief).

**M1 Expansion + Phase 3 + sketches + 10-module build** — unchanged from previous list.

The Tier 3+4+5+6 learning runs DON'T reduce the remaining work list, but they reduce the cost per future SPEC by an expected 15-30% (based on the ROI estimate that comes out of T3.1). Net effect on time-to-LIVE: ~1-2 weeks saved if Phase 2/2.5/3 SPECs all benefit.

End of Brief.
