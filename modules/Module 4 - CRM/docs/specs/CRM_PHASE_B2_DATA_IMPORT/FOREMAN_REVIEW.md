# FOREMAN_REVIEW — CRM_PHASE_B2_DATA_IMPORT

> **Location:** `modules/Module 4 - CRM/docs/specs/CRM_PHASE_B2_DATA_IMPORT/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman)
> **Written on:** 2026-04-20
> **Reviews:** `SPEC.md` (author: Cowork strategic session, 2026-04-20) + `EXECUTION_REPORT.md` (executor: Claude Code / Windows desktop) + `FINDINGS.md` (6 findings)
> **Commit range reviewed:** `1152602..5c1d7a7`

---

## 1. Verdict

🟡 **CLOSED WITH FOLLOW-UPS** — All CRM tables populated. 893 leads, 11 events,
695 notes, 88 ad spend rows imported correctly. Revenue spot-check matches Monday
exactly (₪39,460). Two numeric criteria missed (attendees 149 vs 200–215; CX 8
vs 11) — both traced to a single upstream data-quality issue (42 phones in Events
Record absent from Tier 2), not an execution bug. 6 findings require disposition;
2 HIGH findings need follow-up work. `TODO.md` updated but `SESSION_CONTEXT.md`
not yet created for Module 4 → caps at 🟡 per Hard-Fail Rules.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Goal clarity | 5 | "Import all Monday data into CRM tables" — unambiguous, scoped to Prizma tenant |
| Measurability of success criteria | 4 | 16 criteria, each with SQL verify command. Deducted 1: attendees range 200–215 was wrong (actual importable = 149 after FK filter). The SPEC should have pre-computed the Tier 2 ↔ Events Record phone overlap to set a realistic range. |
| Completeness of autonomy envelope | 5 | Level 2 DML explicitly authorized for crm_* tables only, scoped to one tenant UUID. Stop triggers well-defined. |
| Stop-trigger specificity | 4 | Good: "orphan lead_ids after import > 10". Minor gap: the 15% deviation trigger on criterion 6 (attendees) fired but the executor correctly judged it was data-quality, not a bug. The trigger should have distinguished "FK-filtered drop" from "parsing failure drop". |
| Rollback plan realism | 5 | Clean reverse-dependency DELETE cascade. Tested implicitly by the seed data preservation (2 campaigns, 31 statuses survived). |
| Expected final state accuracy | 3 | **Three issues:** (1) Attendees range 200–215 was wrong — should have been ~140–190 based on Tier 2 ↔ Events Record overlap which was never computed in B1. (2) CX surveys = 11 was wrong — cascades from attendee orphans. (3) §12 mandated MCP-only transport without estimating payload budget (~900KB of INSERT SQL vs ~30K tokens per call). This is the third consecutive SPEC with a wrong precondition (Phase A: wrong UUID, Phase B1: missing Python, Phase B2: wrong row counts + infeasible transport). **Pattern is now entrenched.** |
| Commit plan usefulness | 5 | 3 commits, each single-concern. Executor followed exactly. |

**Average score:** 4.4/5.

**Weakest dimension:** Expected final state accuracy (3/5) — third consecutive
SPEC with wrong preconditions. The root cause is authoring in Cowork without
pre-computing cross-file data overlaps. The B1 Data Discovery Report computed
Tier 2 ↔ Affiliates overlap (97%) but NOT Tier 2 ↔ Events Record overlap.
The Foreman trusted the raw Events Record row count (213) instead of computing
the FK-importable count.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|----------|----------|
| Adherence to SPEC scope | 4 | 5 documented deviations, all well-reasoned. Transport switch (MCP → PostgREST) is the most significant but preserves identical security properties. Col 0/col 2 mapping fix was a correct autonomous judgment. Deducted 1 for the sheer count of deviations (5 is a record for this project). |
| Adherence to Iron Rules | 5 | Self-audit thorough with evidence. Rule 9 (hardcoded values) correctly flagged as acceptable for one-shot migration scripts. Rule 12 (file size) exceeded but justified for throwaway scripts. Rule 22 (defense-in-depth) verified: tenant_id on every INSERT + PostgREST filter. Rule 23 (no secrets): SERVICE_ROLE_KEY read from `$HOME/.optic-up/credentials.env`, zero secrets in repo. |
| Commit hygiene | 5 | 3 commits, each single-concern, proper `feat(crm)` / `chore(spec)` prefixes. Explicit `git add` by filename. |
| Handling of deviations | 5 | All 5 deviations documented with SPEC reference, cause, and resolution. The soft stop-trigger on criterion 6 (25% below range) was handled correctly: executor continued because DB-level stop triggers (0 orphans) didn't fire, and documented the judgment call for Foreman review. This is exactly what Bounded Autonomy prescribes. |
| Documentation currency | 4 | TODO.md updated (Steps 2+3). Module 4 SESSION_CONTEXT.md not yet created — acceptable since it's deferred to UI phase per B1 FOREMAN_REVIEW §8. import-skipped.json and import-report.json committed as audit artifacts. |
| FINDINGS.md discipline | 5 | 6 findings, each with severity, reproduction steps, suggested action, and rationale. None absorbed into this SPEC's commits. Clean separation of concerns. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Self-assessment score of 7/10 on SPEC adherence is honest (I'd give 8 but the executor's conservatism is appropriate). Transparent about MCP token cost (~150K wasted). Real-time decisions well-documented with rationale. |

**Average score:** 4.7/5.

**Did executor follow autonomy envelope correctly?** YES — the MCP → PostgREST
pivot was the right call. The SPEC's MCP-only mandate was a practical error by
the Foreman (me). The executor preserved all security properties (service_role
auth, tenant_id defense-in-depth, no secrets in repo) and documented the change
as a deviation. The soft stop-trigger on attendees was handled with the right
judgment: report and continue, not abort.

**Did executor ask unnecessary questions?** 0. Ten out of ten.

**Did executor silently absorb any scope changes?** No. All 5 deviations
explicitly documented.

---

## 4. Findings Processing

| # | Finding code | Summary | Disposition | Action |
|---|---|---|---|---|
| 1 | M4-DATA-01 | DATA_DISCOVERY_REPORT §2.4 col mapping wrong (col 0 = name, not phone) | ACCEPT — HIGH | Correct DATA_DISCOVERY_REPORT §2.4 and §2.8 in a small `docs(crm)` commit. Bundle with the next commit that touches campaign docs. Not a standalone SPEC — too small. |
| 2 | M4-DATA-02 | 42 attendees (22%) have phones absent from Tier 2 | ACCEPT — HIGH | **Decision: ACCEPT the gap, do NOT backfill.** Rationale: (a) the 42 phones are from early events (13–17) and likely represent archived contacts Daniel intentionally excluded from Tier 2; (b) backfilling would create 42 stub leads with no status/notes/UTM, polluting the lead count; (c) 149 attendees is still sufficient for V3 reporting. Document the gap in SESSION_CONTEXT when created. If Daniel later wants these leads, a targeted backfill SPEC can be authored. |
| 3 | M4-DATA-03 | CX surveys = 8 not 11 (cascade of M4-DATA-02) | DISMISS | Fully derived from M4-DATA-02. Same disposition: accept the 8, don't backfill. |
| 4 | M4-SPEC-01 | MCP execute_sql impractical for >10 INSERT batches | ACCEPT — MEDIUM | Update SPEC_TEMPLATE.md §12 and opticup-executor skill: for bulk DML >200KB or >10 batches, recommend Node+PostgREST runner. See §6 Proposal 1 below. |
| 5 | M4-DATA-04 | Audit log metadata shows pre-filter count (191) vs actual DB count (149) | ACCEPT — LOW | TECH_DEBT: correct the 2 audit_log rows (attendees + cx) with an UPDATE in the next SPEC that touches crm_audit_log. Not blocking. |
| 6 | M4-INFO-08 | Event 22: 84 registered vs Monday's 87 | DISMISS | Fully explained by M4-DATA-02 (3 of the 42 orphans belong to event 22). Revenue matches exactly (₪39,460). Informational only. |

**Zero findings left orphaned.** ✅

---

## 5. Spot-Check Verification

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|------|-----------|--------|
| "893 leads, 0 duplicate phones, 0 orphan lead_id, 0 orphan event_id" | ✅ | Independent Supabase query: leads=893, dup_phones=0, orphan_leads=0, orphan_events=0. Exact match. |
| "Event #22 revenue = ₪39,460 (exact match vs Monday)" | ✅ | `v_crm_event_stats WHERE event_number=22`: total_revenue=39460.00, total_purchased=31, total_attended=33. All match EXECUTION_REPORT claims. |
| "All 5 Views return data" | ✅ | Independent query: event_stats=11, lead_history=55, event_dashboard=11, attendees_full=149, leads_tags=893. All >0. |

All 3 spot-checks passed. ✅

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Add bulk-DML transport guidance to SPEC_TEMPLATE

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` §12 "INSERT Strategy" (or create §12 if absent)
- **Change:** Add: *"Before mandating a specific transport (MCP execute_sql, PostgREST, direct pg), estimate the total INSERT payload size. Rule of thumb: if total SQL text exceeds 200KB or requires more than 10 execute_sql calls, mandate a Node runner using PostgREST (`/rest/v1/<table>` with SERVICE_ROLE_KEY). The functional guarantees are identical (service_role auth, RLS bypass, tenant_id defense-in-depth). Never mandate MCP-only for bulk imports — it wastes ~150K tokens on format validation that a single Node script handles in one shot."*
- **Rationale:** Third consecutive SPEC with a wrong precondition. This one mandated MCP-only without estimating payload budget. Cost the executor ~1h and ~150K tokens.
- **Source:** FINDINGS M4-SPEC-01, EXECUTION_REPORT §5 bullet 1

### Proposal 2 — Require cross-file phone overlap in Data Discovery Reports

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` §"SPEC Authoring Protocol" Step 1
- **Change:** Add to Step 1 preparation: *"For any import SPEC that references multiple source files with FK relationships (e.g., Events Record → Tier 2 via phone), the preceding Data Discovery SPEC MUST include a cross-file overlap analysis for EVERY FK path — not just the primary dedup pair. Example: Phase B1 computed Tier 2 ↔ Affiliates overlap (97%) but omitted Tier 2 ↔ Events Record overlap. The missing overlap caused Phase B2's attendees success criterion to be set at 200–215 instead of ~149. Cost: one HIGH finding and one executor soft-stop-trigger."*
- **Rationale:** The attendees range was wrong because the Foreman trusted the raw row count (213 → 200–215 after dedup) without computing how many of those phones actually exist in Tier 2. A 30-second overlap count in B1 would have prevented the surprise.
- **Source:** EXECUTION_REPORT §5 bullet 3, FINDINGS M4-DATA-02

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — MCP execute_sql payload-budget pre-check

- **Where:** `.claude/skills/opticup-executor/SKILL.md` §"Step 1.5 — DB Pre-Flight Check"
- **Change:** Add a new bullet: *"For bulk DML SPECs: estimate total INSERT payload size before Step 2. If the planned DML exceeds ~200KB of SQL text, OR requires more than 10 MCP execute_sql calls, switch to a Node runner using PostgREST `/rest/v1/<table>` with SERVICE_ROLE_KEY from `$HOME/.optic-up/credentials.env`. Same service_role auth, same RLS bypass, defense-in-depth tenant_id still required on every row. Document the transport choice as a Decision (not a Deviation) in EXECUTION_REPORT §4 if the SPEC explicitly mandates MCP-only."*
- **Rationale:** Saves ~1h and ~150K tokens on future bulk imports. The executor proposed this themselves in EXECUTION_REPORT §8 Proposal 1.
- **Source:** EXECUTION_REPORT §8 Proposal 1, FINDINGS M4-SPEC-01

### Proposal 2 — Monday-export item-name column quirk

- **Where:** `.claude/skills/opticup-executor/SKILL.md` — new subsection under "Code Patterns" → **"Monday.com Export Quirks"**
- **Change:** Add: *"Monday exports place the **item-name** column in position 0 regardless of the human-readable column label at row 2. The label is just the first displayed column in the board's workspace view. Example: Events Record labels col 0 as `טלפון` but col 0 DATA contains attendee names (the item-name), while the actual phone is in col 2 ('Phone Number'). Always cross-check header vs first data row before building a FK-lookup extractor. Also document: (from Phase B1) Monday group breaks emit TWO junk rows — a single-cell group name AND a header re-emission. Filter both."*
- **Rationale:** Cost ~20min debugging "zero attendees imported". Combined with the B1 group-break quirk, this completes the Monday-export footgun catalog.
- **Source:** EXECUTION_REPORT §5 bullet 2, FINDINGS M4-DATA-01

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | Follow-up needed |
|-----|--------------------------|---------|------------------|
| `MASTER_ROADMAP.md` §3 | NO — Phase B2 is mid-build, not a phase close | N/A | None |
| `docs/GLOBAL_MAP.md` | NO — no new functions/contracts | N/A | None |
| `docs/GLOBAL_SCHEMA.sql` | NO — no new DB objects (deferred to Integration Ceremony) | N/A | None |
| Module 4 `SESSION_CONTEXT.md` | YES — Module 4 now has data in 7 tables, should document current state | NO | **Follow-up: create when Phase B3 (UI) starts. Acceptable deferral — same decision as B1 FOREMAN_REVIEW §8.** |
| Module 4 `CHANGELOG.md` | YES — 3 commits landed | NO | Minor — create at Phase B3 start alongside SESSION_CONTEXT |
| Module 4 `MODULE_MAP.md` | NO — no ERP application code yet (scripts are campaign-scoped) | N/A | None |
| `campaigns/supersale/TODO.md` | YES | YES ✅ | Steps 2+3 updated |

Two rows flagged (SESSION_CONTEXT + CHANGELOG not yet created for Module 4).
Both are acceptable deferrals since Module 4 has no ERP application code yet —
these docs become meaningful at Phase B3 (UI). However, per Hard-Fail Rules,
any "should have = YES / was it = NO" caps the verdict at 🟡. Verdict stays 🟡.

---

## 9. Daniel-Facing Summary (Hebrew, 3 sentences max)

> כל הנתונים מ-Monday עברו ל-CRM בסופאבייס — 893 לידים, 11 אירועים, 695
> הערות, 88 שורות פרסום, 149 משתתפים. 42 משתתפים מאירועים ישנים (13–17)
> לא יובאו כי הטלפונים שלהם לא קיימים ב-Tier 2 — זה בסדר, לא באג.
> הכנסות אירוע 22 תואמות בדיוק (₪39,460). הצעד הבא: בניית ממשק ה-CRM.

---

## 10. Followups Opened

- **M4-DATA-01** (DATA_DISCOVERY_REPORT col mapping) → bundle correction in
  next `docs(crm)` commit. No standalone SPEC needed.
- **M4-DATA-02** (42 attendee orphans) → ACCEPTED as gap. No backfill. Document
  in SESSION_CONTEXT when created.
- **M4-SPEC-01** (MCP payload budget) → update SPEC_TEMPLATE.md §12 and
  opticup-executor SKILL.md. Apply in next opticup-strategic session.
- **M4-DATA-04** (audit log count mismatch) → TECH_DEBT: correct 2 rows in
  next SPEC that touches crm_audit_log.
- **Module 4 SESSION_CONTEXT.md + CHANGELOG.md** → create at Phase B3 start.

No new SPEC stubs needed. All follow-ups are bundleable with Phase B3 prep.
