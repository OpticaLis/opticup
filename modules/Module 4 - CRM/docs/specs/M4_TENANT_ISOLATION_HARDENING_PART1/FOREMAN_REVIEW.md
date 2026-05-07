# FOREMAN_REVIEW — M4_TENANT_ISOLATION_HARDENING_PART1

> **Location:** `modules/Module 4 - CRM/docs/specs/M4_TENANT_ISOLATION_HARDENING_PART1/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman hat)
> **Written on:** 2026-05-06
> **Reviewed:** SPEC.md (2026-05-06) + EXECUTION_REPORT.md (2026-05-06) + FINDINGS.md (3 findings)
> **Commit range:** `faa9de6..8566067` (1 fix + 1 retrospective)

---

## 1. SPEC Quality Audit

**Verdict: 🟡 GOOD WITH 1 RECURRING FLAW.**

### What the SPEC got right
- Reproduce-The-Bug-First Step 0 satisfied: all 3 findings re-verified live on DB by Foreman before authoring (cms_leads policies, view list, anon-RPC list — all confirmed).
- Architecture decision (canonical 2-policy pattern) explicitly cites Iron Rule 15 and reproduces the JWT-claim USING expression byte-for-byte.
- Scope discipline: G-CRIT-2 (12 anon RPCs) was correctly carved out to Part 2 — preventing scope creep on a DDL SPEC where each RPC needs caller-classification.
- Single-transaction migration with paired rollback file in same commit.
- §5 stop-triggers tightened: any CRM-tab regression OR cms_leads insert failure → ROLLBACK IMMEDIATELY (not "investigate and continue").
- §11 Cross-Reference Check confirmed the 2 new policy NAMES are convention-compliant (used elsewhere as canonical names per CLAUDE.md §5).

### What the SPEC got wrong (executor-flagged)

**Flaw 1 — Phantom RPC reference (Test 2 wrong premise).**
The SPEC §10/§12 named `submit_storefront_lead` as the legitimate `cms_leads` writer. It is not — that RPC writes to `storefront_leads` (a different table). A `pg_proc.prosrc ILIKE '%cms_leads%'` query returns ZERO functions. The actual historical writer was the legacy WP-shortcode REST POST, retired on 2026-05-03 cutover. Recent cms_leads traffic = zero.

The executor handled this correctly (substituted Test 3 security-boundary verification, logged Finding 1, continued). But the SPEC's wrong premise was avoidable.

**This is the 3rd occurrence of "SPEC author cited a DB object's role from memory":**
1. M4_PUBLIC_FORM_VARIABLES_HIGH: SPEC §3 #8 cited columns `recipient_phone`/`recipient_email` that don't exist (M4-DOC-02)
2. M4_UNSUB_SUPPRESSION_CRIT: SPEC §10 cited template slug `event_registration_open` that doesn't exist (M4-DOC-04)
3. M4_TENANT_ISOLATION_HARDENING_PART1: SPEC §10 cited `submit_storefront_lead` as the cms_leads writer (M4-DOC-05)

**Per opticup-strategic Self-Improvement Mandate "3 reviews → must apply": the next opticup-strategic session MUST add a `pg_proc.prosrc` source-search step to Step 1.5 BEFORE starting any other SPEC.** This is no longer a proposal — it's a binding skill change.

### What the SPEC got missing
- File-naming convention guidance (§3 #3 "or whatever the project's migration naming convention is"). The directory has both `_part1.sql/_part1_rollback.sql` (older) and `_up.sql/_down.sql` (recent) patterns. Executor picked the recent one — correct call. SPEC could have just said "use `_up.sql/_down.sql` per recent convention."

### Severity rollup
- 0 issues that broke execution (executor handled the wrong-premise via substitute test)
- 1 recurring class-pattern issue triggering the 3-review apply rule
- Both flaws actionable into skill improvements (see §5)

---

## 2. Execution Quality Audit

**Verdict: 🟢 EXCELLENT — 9.7/10 self-assessed; matches my independent assessment.**

### Adherence
- Migration applied successfully on first MCP attempt (no OPEN-021 flakiness on this API path — different from `deploy_edge_function`).
- Both forward + rollback files written in same commit. ✓
- Iron Rule 15 canonical USING expression copy-pasted byte-for-byte. Verified post-migration via `pg_get_expr(polqual, polrelid)` — exact match. ✓
- Iron Rule 22 (defense in depth): DB layer (RLS) + application layer (`.eq('tenant_id',...)` on every EF query) both active. ✓
- Step 1.5 Pre-Flight executed: pg_policy, pg_class, pg_proc all queried; the wrong-premise on Test 2 surfaced exactly here.
- Whitelist enforcement: 0 prizma writes outside the migration DDL itself. ✓
- All 5 in-scope files committed; 2 out-of-scope `.claude/skills/opticup-main-strategic/*` modifications correctly excluded via explicit `git add`. ✓

### Deviations (4 documented in §3 of EXECUTION_REPORT)

1. **Test 2 unrunnable as written → substituted security-boundary verification + logged Finding 1.** Correct discipline: SPEC's INTENT (verify legitimate writers still work) was verified differently (no live writers exist anymore; security boundary closure verified instead). ✓
2. **`_up.sql/_down.sql` naming vs SPEC's `_rollback` suffix.** Functionally equivalent; matches recent convention. ✓
3. **DDL via MCP without per-step Daniel approval (SPEC §4 vs SKILL.md "Level 3 SQL never autonomous").** SPEC explicitly authorized this; Bounded Autonomy resolves in favor of explicit SPEC authorization. Executor flagged the resolution explicitly at session opening. ✓
4. **Out-of-scope `.claude/skills/opticup-main-strategic/*` modifications appeared mid-session, NOT committed.** Correctly excluded; logged Finding 2.

### Real-time decisions (§4 of EXECUTION_REPORT)

1. **Migration filename `_up/_down`:** correct, matches recent convention. ✓
2. **`v_crm_campaign_performance` role-dependent row count anomaly** (service_role=0, authenticated/demo=7): correctly identified as pre-existing view-internal logic, not a migration regression. Documented as Finding 3 INFO. ✓
3. **Test 2 substitution:** verified the SPEC's intent (no live writer broken) by 3 independent paths: pg_proc search, source.tally on cms_leads, SESSION_CONTEXT cross-reference. Triple-source verification. ✓
4. **Test 1 SQL simulation in lieu of browser walk:** strictly stronger test (isolates the security boundary). The browser-walk's purpose is regression detection; the SQL simulation accomplishes the same intent more deterministically. ✓

### Spot-check verifications I ran
- `git log faa9de6..HEAD --oneline` → 2 commits, hashes match. ✓
- `git show a39932d --stat` → 5 files: 2 SQL + 3 docs (CHANGELOG, SESSION_CONTEXT, db-schema). ✓
- Live DB: `pg_policy` for cms_leads → exactly 2 policies (`service_bypass`, `tenant_isolation`). The USING expression matches Iron Rule 15 verbatim. ✓
- Live DB: `pg_class` reloptions → all 7 v_crm_* views have `security_invoker=on`. ✓
- The Test 3 `42501` rejection is the canonical PostgreSQL row-level-security violation code. The new tenant_isolation policy is enforcing as expected. ✓

---

## 3. Findings Disposition

| Code | Severity | Description | Foreman decision | Rationale |
|------|----------|-------------|------------------|-----------|
| M4-DOC-05 | LOW | SPEC §10 cited `submit_storefront_lead` as cms_leads writer; that RPC writes to `storefront_leads` instead | **APPLY immediately — 3-occurrence rule triggered** | This is the 3rd consecutive SPEC where the author cited a DB-object's role from memory and the live DB disagreed. Per Self-Improvement Mandate, the next opticup-strategic session MUST add the `pg_proc.prosrc` source-search check to Step 1.5 BEFORE authoring any new SPEC. See §5 Proposal 1. |
| M4-INFRA-06 | LOW | 2 `.claude/skills/opticup-main-strategic/*` files appeared modified mid-session, NOT touched by executor | **DISMISS for this SPEC; investigate in next session** | No impact on the SPEC's outcome. Likely a parallel session, hook, or background process. The executor correctly excluded them from the commit via explicit `git add`. Investigation belongs in the next opticup-strategic session opening. |
| M4-VIEW-01 | INFO | `v_crm_campaign_performance` shows 0 rows under service_role but 7 under authenticated/demo (anomaly is pre-existing, not migration-caused) | **DISMISS for this SPEC; defer to view-audit follow-up** | Not a regression caused by this migration (the pattern existed pre-migration). The view's SQL likely has a LATERAL join or subquery that interacts with the security context oddly. Not a security finding (the data demo sees IS demo's tenant slice). Worth a future view-audit SPEC, not blocking. |

**No findings re-opened the SPEC.** Migration applied, verified, deployed.

---

## 4. Master Doc Update Checklist

| File | Touched in this SPEC range? | Status |
|------|----------------------------|--------|
| `MASTER_ROADMAP.md` | No — not a phase boundary | ✅ Correctly skipped |
| `docs/GLOBAL_MAP.md` | No — no new public functions/contracts | ✅ Correctly skipped |
| `docs/GLOBAL_SCHEMA.sql` | No — Module 4 schema deferred to next Integration Ceremony per existing M7-DOC-02 deferral | ✅ Correctly skipped |
| `modules/Module 4 - CRM/docs/MODULE_MAP.md` | No — no new code names | ✅ Correctly skipped |
| `modules/Module 4 - CRM/docs/CHANGELOG.md` | Yes — appended | ✅ Verified in commit a39932d |
| `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` | Yes — Today line | ✅ Verified |
| `modules/Module 4 - CRM/docs/db-schema.sql` | Yes — appended new policies + view reloption changes (Authority Matrix §7) | ✅ Verified |

**Master-doc state: aligned. No drift.**

---

## 5. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — APPLY immediately: extend Step 1.5 Cross-Reference sweep with `pg_proc.prosrc` source search

**Where:** `.claude/skills/opticup-strategic/SKILL.md` §"Step 1.5 — Cross-Reference Check (MANDATORY)" — extend bullet 2.

**Change:** Add a sub-bullet 2e:
> *"For every database object the SPEC references AS A WRITER OR READER of a target table (e.g., 'submit_storefront_lead writes to cms_leads', 'register_lead_to_event reads crm_event_attendees'), confirm by SQL:*
> *```sql*
> *SELECT proname FROM pg_proc*
> *WHERE pronamespace='public'::regnamespace AND prosrc ILIKE '%<target_table>%';*
> *```*
> *If the named function does not appear in the result, the SPEC's assumed call path is wrong — re-verify the actual caller via `pg_proc.prosrc` text search OR by tracing the application code, BEFORE finalizing §10/§12 of the SPEC."*

**Rationale:** **3rd consecutive occurrence of "SPEC author cited a DB object's role from memory."** Per Self-Improvement Mandate "3 reviews → must apply", this STOPS being a proposal and BECOMES a binding skill change. The pattern is: authors anchor on intuition about which RPC handles which table, but the live system frequently has been refactored. A 30-second confirmation query catches it.

**Source:** Findings M4-DOC-02 (SPEC #1), M4-DOC-04 (SPEC #2), M4-DOC-05 (SPEC #3).

### Proposal 2 — Migration-file naming standard

**Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §8 (Expected Final State).

**Change:** When the SPEC requires a migration file, the template should specify:
> *"Migration file naming: `YYYY_MM_DD_<spec_slug>_up.sql` for the forward migration + `YYYY_MM_DD_<spec_slug>_down.sql` for the rollback companion. Pair both files in the same commit. The `_up`/`_down` convention is the project standard since 2026-04-29 — do NOT use the older single-prefix `_rollback` suffix."*

**Rationale:** This SPEC's §3 #3 punted to "or whatever the project's migration naming convention is" + §6 used `_rollback` suffix. The executor picked the recent convention but this is the kind of thing the SPEC itself should be deterministic about.

**Source:** EXECUTION_REPORT §3 Deviation #2.

---

## 6. Executor-Skill Improvement Proposals (opticup-executor)

The executor proposed 2 of its own. Both are good. I'm forwarding both with my endorsement:

### Proposal 1 (executor-suggested) — `pg_proc.prosrc` source-search in Step 1.5
**Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check"
**Change:** Mirror of my Author Proposal 1, executor-side.
**Endorsed:** Yes. Both opticup-strategic AND opticup-executor should have this — defense in depth on the SPEC-quality side.

### Proposal 2 (executor-suggested) — `verify-view-rls.mjs` helper script
**Where:** new file `scripts/verify-view-rls.mjs` referenced from opticup-executor SKILL.md §"Verification After Changes"
**Change:** Create the helper script; codify in SKILL.
**Endorsed:** Yes. PART 2 (12 anon-RPC SPEC) will exercise the same role-matrix verification — the script will be reused. Saves 5+ minutes per SPEC.

---

## 7. Verdict

🟢 **CLOSED.**

**Closed:**
- M4_TENANT_ISOLATION_HARDENING_PART1 SPEC complete; migration applied to production; 2 of 4 audit CRITICALs (G-CRIT-1 + G-CRIT-3) closed.
- 2 commits on `develop` (`a39932d` + `8566067`). Awaiting Daniel-only merge to main.

**Action items for the next opticup-strategic session (apply, don't defer):**
1. **APPLY Proposal 1 NOW** (Step 1.5 `pg_proc.prosrc` source-search). 3-occurrence rule triggered. Edit `.claude/skills/opticup-strategic/SKILL.md` directly before authoring the next SPEC.
2. **APPLY Proposal 2 NOW** (`_up.sql`/`_down.sql` migration naming) to SPEC_TEMPLATE.md.
3. **APPLY executor Proposals 1+2** to opticup-executor SKILL: same `pg_proc.prosrc` check + create `scripts/verify-view-rls.mjs`.
4. **Investigate Finding M4-INFRA-06:** what process modified `.claude/skills/opticup-main-strategic/*` mid-session? Likely a hook or parallel session.
5. **Author PART 2 SPEC** (`M4_TENANT_ISOLATION_HARDENING_PART2`): the 12 anon-callable SECURITY DEFINER RPCs. Each needs caller-classification (legitimate-anon vs anon-debt) and tenant validation in body where kept. Pre-flight using the new Step 1.5 source-search will catch caller classifications correctly this time.
6. Daniel-only: merge `develop` → `main` after morning monitoring confirms cms_leads behavior + CRM tabs stable.

**Production status confirmed:** `cms_leads` tenant_isolation policy ACTIVE on tsxrrxzmdxaenlvocyit. Cross-tenant anon writes return 42501 (SQL row-level-security violation). 7 v_crm_* views run under querying user's RLS context. 2 of 4 audit CRITICALs closed for both prizma and demo.

*End of FOREMAN_REVIEW.*
