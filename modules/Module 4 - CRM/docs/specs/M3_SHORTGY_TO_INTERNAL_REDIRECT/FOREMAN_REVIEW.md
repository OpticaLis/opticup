# FOREMAN_REVIEW — M3_SHORTGY_TO_INTERNAL_REDIRECT

> **Location:** `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/FOREMAN_REVIEW.md`
> **Written by:** opticup-strategic (Foreman, M4)
> **Written on:** 2026-05-14
> **Reviews:** `SPEC.md` + `INVENTORY.md` + `ROLLBACK.md` + `EXECUTION_REPORT.md` + `FINDINGS.md` + `TEST_REPORT.md` (all in this folder) + `_dump-backups.mjs` (scaffolding)
> **Commit range reviewed:** `5ee595e..0dbd67e` (7 commits in this SPEC's range; 2 interleaved unrelated commits `1e2cbff` + `b4a3745` + `285b5d6` from another session for M1 Lens Inventory Phase 1A — orthogonal, not part of this SPEC)

---

## 1. Verdict

🟢 **CLOSED — Phase 1 of FUNNEL_ROADMAP COMPLETE.**

P1.3 — the last execution-SPEC of Phase 1 — shipped end-to-end via Full-Auto Pipeline in ONE chat (Foreman author → Executor execute → Reviewer audit → Localhost-Tester smoke + click probe → Foreman closure). 31 of 31 Executor-verifiable §3 success criteria PASS in-band; the 3 LH-Tester-delegated criteria (21, 22, 23) all PASS independently. The architectural goal — "every customer click on a customer-facing short-link flows through `resolve-link` EF and produces `short_link_clicks` + `crm_lead_touchpoints` rows" — is achieved end-to-end: LH-Tester's 3 manual click probes each produced exactly one ledger row + one touchpoint row within 10s of the curl call. Daniel's pull-quote from the Brief ("see click stats in our system") is satisfied today by the new MVP "🔗 קישורים קצרים" CRM tab.

**Why 🟢 (not 🟡):**
- 0 CRITICAL / 0 HIGH / 0 MEDIUM findings. 5 findings (2 LOW, 3 INFO) all dispositioned with explicit next steps; none block P2 or any downstream consumer.
- Independent spot-check (Foreman re-queried 7 baselines vs Executor's report): every value matches byte-for-byte.
- Cross-tenant safety verified: 6 new `short_links` rows split exactly 2 demo + 4 prizma; every UPDATE was tenant-scoped via `WHERE id=<UUID> AND tenant_id=<UUID>` (templates) or `WHERE slug='...'` (tenants). Prizma critical invariants (`crm_event_attendees=231`, `crm_events=4`, `crm_broadcasts=3`) bit-identical pre/post — same baselines as P1.2 close.
- Historical immutability respected: `crm_message_log.content` (4,370 rows with short.gy) + `crm_message_queue.body` status=sent (1,170 rows) UNTOUCHED per SPEC §7.
- Iron Rule 31 + 32 gates green throughout (4 UPDATE/Edit ops declared, all executed within bounds; no DROP/DELETE/TRUNCATE/git-destructive ops).
- One §5 stop-trigger fired (gmapy → gpw.gamaf.co.il outside prizma-controlled domains) — escalation handled per spec; Daniel approved Option-1 (Gama is Prizma's contracted ₪50 deposit gateway, used for months).

**Hard-fail check:** §8 Master-Doc Update Checklist has zero "should have / wasn't" rows. §5 Spot-Check has zero failures. §4 Findings have full dispositions. §3 Execution Quality scores all ≥ 4.5/5. No hard-fail trips.

---

## 2. SPEC Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|-----------|----------|
| Goal clarity | 5 | §1 named the closure target precisely (Phase 1 last SPEC, click→attribution chain) + Daniel's pull-quote anchored the MVP scope. |
| Measurability of success criteria | 5 | 34 criteria — every one has an exact expected value + runnable verify command. Includes baseline symbols (`BASE_*`) cited symbolically in §3, all measured from live DB at authoring time per the harvested STATUS_CHANGE_TRIGGERS_FRAMEWORK rule. |
| Completeness of autonomy envelope | 5 | §4 enumerated what the Executor could do without asking (10 items) AND what triggers Daniel escalation (Pipeline-mode escalation discipline harvested from P1.1 Author Proposal #2 applied). Pre-authorized auto-pivots section explicitly listed N/A for OPEN-021 (no EF deploy in this SPEC). |
| Stop-trigger specificity | 4 | Every stop is narrow + actionable. **The one that fired** (gmapy → gpw.gamaf.co.il) caught a real surprise and produced a 1-question Daniel escalation in ~30 seconds — exactly the discipline working. **Half-mark deducted because** the allowed-domain list should have included `gamaf.co.il` at authoring time (Foreman's Step 1.5 should have grepped for non-prizma-suffixed URLs in prior M4 SPECs). See Author Proposal #1 below. |
| Rollback plan realism | 5 | §6 + `ROLLBACK.md` (doc-context per harvested P1.1 Author Proposal #1). Per-step reversal, JSON backups for every UPDATE, master safety tag named (`pre-M3_SHORTGY_TO_INTERNAL_REDIRECT` at `5ee595e`). Backup folder gitignored — §8 separated git-add list from local-only safety net per RETURN_SHAPE_FIX harvested rule. |
| Expected final state accuracy | 4.5 | §8 listed 6 SPEC-folder files + 7 modified files. Executor produced all 6 (SPEC + INVENTORY + ROLLBACK + EXECUTION_REPORT + FINDINGS + TEST_REPORT) PLUS a 7th non-listed scaffolding file (`_dump-backups.mjs`). Half-mark deducted because §8 should have either listed the dumper as expected OR provided a pre-authored dumper recipe. See Author Proposal #2. |
| Commit plan usefulness | 5 | §9 planned 7 commits; actual run produced 6 + 1 (orthogonal session interleaved 2 unrelated commits, harmlessly threading the range). Per-commit titles match the plan exactly. |

**Average score:** 4.71/5.

**Weakest dimension + why:** stop-trigger specificity (4/5) — the gmapy → gamaf detection was the right thing the right way, but a 60-second pre-authoring sweep of prior M4 SPECs for "non-prizma URL in tenant config" would have allowed gamaf.co.il to be in the Approved list from the start, avoiding a Daniel-attention event.

---

## 3. Execution Quality Audit

| Dimension | Score 1–5 | Evidence |
|-----------|-----------|----------|
| Adherence to SPEC scope | 5 | No files modified outside §8. The one extra file (`_dump-backups.mjs`) was documented as Decision #1 in EXECUTION_REPORT §5 — minor §8 omission acknowledged, not silently absorbed. |
| Adherence to Iron Rules | 5 | Rule 14 PASS on all 6 new rows. Rule 22 PASS in the new JS file (`.eq('tenant_id', tid)` on both SELECTs even though RLS already filters). Rule 8 PASS — every dynamic field in `crm-short-links-stats.js` escaped via `escapeHtml()` or `escapeAttr()`. Rule 31 + 32 gates exit 0 on every commit. Rule 7 — used `sb.from()` per existing CRM convention (M4-DEBT-02 tracks the full DB-wrapper migration); consistent, not a new violation. |
| Commit hygiene | 5 | 6 single-concern commits with descriptive English `type(scope): description` + co-author trailer. Selective `git add <file>` throughout — never wildcard. Pre-existing untracked 103-file mass handled via Pipeline-mode pre-existing-files protocol (left untouched). |
| Handling of deviations | 5 | 3 deviations surfaced + documented + auto-resolved without unnecessary escalation: (1) `crm_message_templates.updated_at` missing column → removed clause + logged FIND-2 (no Daniel interruption); (2) Rule-18 keyword-literal false-positive on doc-context appendix → reworded per harvested keyword-awareness rule (no Daniel interruption); (3) gmapy → gamaf cross-domain → escalated to Daniel per the harvested Pipeline-mode discipline (legitimate Daniel-level decision). Each handled correctly. |
| Documentation currency | 5 | M4 SESSION_CONTEXT closure paragraph prepended. M4 db-schema appendix added. M4 MODULE_MAP new entry. KNOWLEDGE_MAP Layer 7 row 3 marked DEPRECATED with commit ref. FUNNEL_ROADMAP P1.3 ✅ + "🎉 Phase 1 COMPLETE — 2026-05-14" banner added. All atomic in commit `78334f6`. |
| FINDINGS.md discipline | 5 | 5 findings logged (0 CRIT, 0 HIGH, 0 MED, 2 LOW, 3 INFO). Every finding has severity + location + description + suggested disposition. 1 new SPEC stub proposed (`M1_5_RULE_18_DOC_CONTEXT_EXCLUSION`) + 2 TECH_DEBT entries (`M4-DEBT-CRM-MESSAGE-TEMPLATES-UPDATED-AT` + `M4-DEBT-IRON-RULE-18-SHORT-LINKS-CODE-UNIQUE-GLOBAL`) — all anchored to real observations from this SPEC's run. |
| EXECUTION_REPORT.md honesty + specificity | 5 | Self-assessment scores (9.5, 10, 10, 10) align with my independent assessment within 0.5. Per-criterion evidence table captures actual vs expected for all 34 criteria. Decisions section captures 6 real-time judgment calls with rationale. 2 skill-improvement proposals concrete + sourced. |

**Average score:** 5.0/5.

**Did executor follow the autonomy envelope correctly?** YES. One AskUserQuestion to Daniel (gmapy → gamaf) was a legitimate §5 stop-trigger escalation, exactly as the SPEC required. The 2 silent deviations (updated_at, Rule-18 keyword) were both pre-authorized by harvested rules.

**Did executor ask unnecessary questions?** No. The Pipeline-mode discipline from harvested rules worked exactly as designed.

**Did executor silently absorb any scope changes?** The `_dump-backups.mjs` scaffolding file is borderline — it was not in SPEC §8 but adds reproducibility value. Executor flagged it explicitly in EXECUTION_REPORT §5 Decision #1, so this is acknowledged-not-silent. Future SPECs should authorize that pattern up front (Author Proposal #2).

---

## 4. Findings Processing

| # | Finding | Severity | Disposition | Action taken |
|---|---------|----------|-------------|--------------|
| FIND-1 | `gmapy` short-link target is third-party (Gama payment gateway) | INFO | Daniel-approved 2026-05-14 (known partner) | No action. Documentation in INVENTORY.md + EXECUTION_REPORT §4 captures the decision for future audit. |
| FIND-2 | `crm_message_templates` lacks `updated_at` column | LOW | New TECH_DEBT entry | `M4-DEBT-CRM-MESSAGE-TEMPLATES-UPDATED-AT` — defer to next M4 hygiene SPEC. Migration: add column + trigger from `M4_AUTOMATION_RULES_UPDATED_AT` pattern (2026-05-13). ~5 min. |
| FIND-3 | `crm.html` at 442 lines > Rule 12 target of 350 | LOW | Informational; pre-existing debt | NOT introduced by this SPEC (was 428 pre-SPEC). Either raise Rule 12 cap for HTML entrypoints with explicit reasoning in CLAUDE.md, OR refactor `crm.html` to lazy-load tab section HTML — defer to a `M4-DEBT-CRM-HTML-LAZY-LOAD-TABS` follow-up SPEC. Not urgent. |
| FIND-4 | Iron Rule 18 gate false-positive on doc-context appendices | INFO | New SPEC stub | `M1_5_RULE_18_DOC_CONTEXT_EXCLUSION` — single-line addition of `isDocFile()` predicate to `scripts/checks/rule-18-unique-tenant.mjs`, mirroring IR-32's pattern. ~5 min. M1.5 ownership (shared infrastructure). |
| FIND-5 | `short_links_code_unique` is GLOBAL UNIQUE, not tenant-scoped | INFO | New TECH_DEBT entry | `M4-DEBT-IRON-RULE-18-SHORT-LINKS-CODE-UNIQUE-GLOBAL` — defer to next M4 hygiene SPEC. Migration: DROP CONSTRAINT + recreate as `UNIQUE (tenant_id, code)`. ~10 min, will need IR-32 §Destructive Operations declaration. Practically zero risk today (8-char random codes have astronomically low collision probability across tenants). |

**Zero findings left orphaned.** All 5 have explicit dispositions. Neither blocks P2 nor any downstream consumer.

**New follow-up commitments:**
- **NEW SPEC stub:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_RULE_18_DOC_CONTEXT_EXCLUSION/` (~5 min) — closes FIND-4.
- **TECH_DEBT entries (next session that touches TECH_DEBT.md):**
  - `M4-DEBT-CRM-MESSAGE-TEMPLATES-UPDATED-AT`
  - `M4-DEBT-IRON-RULE-18-SHORT-LINKS-CODE-UNIQUE-GLOBAL`
  - `M4-DEBT-CRM-HTML-LAZY-LOAD-TABS` (optional — informational from FIND-3)

---

## 5. Spot-Check Verification

Picked 4 of the largest claims from EXECUTION_REPORT.md + verified independently against the live DB during the Reviewer phase + re-verified at Foreman close.

| Claim (from EXECUTION_REPORT) | Verified? | Method |
|-------------------------------|-----------|--------|
| 6 new `short_links` rows, link_type='template_static', 8-char alphanumeric codes, all tenant_id NOT NULL | ✅ | Independent SQL: `count(*) WHERE link_type='template_static'` → 6; `count(*) WHERE code !~ '^[A-Za-z0-9]{8}$'` → 0; `count(DISTINCT code)` → 6; `count(*) WHERE tenant_id IS NULL` → 0. Match. |
| Zero short.gy refs in templates + tenants + CMS + ERP source + storefront source | ✅ | Independent SQL queries returned 0 across `crm_message_templates.body`, `tenants.payment_links`, `storefront_pages.blocks`. Repo greps returned 0 hits in both ERP + storefront `.{js,ts,html,astro}`. Match. |
| LH-Tester click probe produced 3 short_link_clicks + 3 crm_lead_touchpoints rows | ✅ | Independent SQL: `count(*) FROM short_link_clicks WHERE clicked_at >= '2026-05-14T17:45:00Z' AND short_link_id IN (...template_static)` → 3; same for touchpoints → 3. Match. The full attribution chain (resolve-link EF → short_link_clicks INSERT → crm_lead_touchpoints INSERT) verified end-to-end on a fresh probe ~17 hours after P1.2 wired it. |
| Historical `crm_message_log.content` + `crm_message_queue.body` (status=sent) UNTOUCHED | ✅ | Independent SQL: log count = 4,370 (unchanged from pre-SPEC) AND queue count = 1,170 (unchanged). Immutable audit trail respected per SPEC §7. Match. |

Zero failed spot-checks. Verdict eligibility preserved at 🟢.

---

## 6. Author-Skill Improvement Proposals (opticup-strategic)

### Proposal 1 — Add "known third-party domains" sweep to Step 1.5 Cross-Reference Check

- **Where:** `.claude/skills/opticup-strategic/SKILL.md` — Step 1.5 Cross-Reference Check section, add a sub-step after item 2 (grep against authoritative sources).
- **Change:** Add: *"**Known third-party-domain sweep (added 2026-05-14 from `M3_SHORTGY_TO_INTERNAL_REDIRECT/FOREMAN_REVIEW.md` Author Proposal #1).** When a SPEC references EXTERNAL URLs (short-link migrations, payment-gateway integrations, webhook URLs, third-party API endpoints), Step 1.5 MUST grep prior SPECs in the SAME module for any non-tenant-suffixed domains AS WELL AS the tenant-suffixed ones:*
  ```
  grep -rohE 'https?://[a-zA-Z0-9.-]+' modules/Module N/docs/specs/*/  | sort -u | grep -v -E '(prizma-optic\.co\.il|app\.opticalis\.co\.il|opticalis\.co\.il)' | head -20
  ```
  *Any third-party domain that appears in prior SPECs/audits → list explicitly in the new SPEC's §5 stop-trigger allowed-domain list. Without this sweep, a §5 trigger fires on KNOWN-good third-parties (e.g. payment gateways, marketing tools, mailers), forcing a Daniel-interrupt that the Foreman could have pre-authorized at SPEC seal time."*
- **Rationale:** This SPEC's §5 stop-trigger fired on `gmapy → gpw.gamaf.co.il` even though `gamaf.co.il` is Prizma's contracted ₪50 SuperSale deposit gateway and is referenced 4+ times across prior M4 SPECs (`M4_AUDIT_PHASE2/PHASE2_REPORT.md` F4, `P5_8_INVITED_TO_REGISTERED_TRANSITION/EXECUTION_REPORT.md` line 221, `P5_V2_TEMPLATE_REBUILD/SPEC.md` line 45, `campaigns/supersale/make/scenario-6-supersale-manual.md`). A 60-second grep at Step 1.5 would have caught this and either widened the allowed-domain list at SPEC seal OR enumerated `gamaf.co.il` explicitly in §5 with the "known partner" annotation. Daniel-interrupt cost ~30 seconds — acceptable once, avoidable next time.
- **Source:** Deviation 3 in EXECUTION_REPORT.md §4 + §5 Decision #3.

### Proposal 2 — Add a "data dumper recipe" or canonical scaffolding-file authorization to §8 Expected Final State

- **Where:** `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md` — §8 Expected Final State guidance + add a sub-section after "New files".
- **Change:** Add: *"**Scaffolding files for backup dumps (added 2026-05-14 from `M3_SHORTGY_TO_INTERNAL_REDIRECT/FOREMAN_REVIEW.md` Author Proposal #2).** When a SPEC mandates JSON dumps of pre-edit DB rows to its backup folder (§3 backup criterion), the Executor MUST run something — typically a one-shot Node.js script that reads credentials from `$HOME/.optic-up/credentials.env`, queries the rows, and writes JSON files. Two patterns to choose from at SPEC author time:*

  *(a) **Authorize an Executor-written scaffolding file in §8** — add a line: "Scaffolding file `modules/Module N/.../docs/specs/{SLUG}/_dump-backups.mjs` may be created by the Executor as a single-use helper. It MAY be committed inside the SPEC folder for reproducibility (small file, low maintenance burden) OR deleted after the run."*

  *(b) **Pre-author the dumper at SPEC seal time** — paste a 30-line Node.js skeleton in §8 that the Executor adapts. Trade-off: dumper code in the SPEC body bloats SPEC.md; per-SPEC tweaks (row predicates) still need executor work.*

  *Default: option (a). The Executor's `_dump-backups.mjs` from M3_SHORTGY_TO_INTERNAL_REDIRECT is a good reference template — readable, 40-line shape, env-driven."*
- **Rationale:** This SPEC's Executor created `_dump-backups.mjs` (40 lines, single-use) inside the SPEC folder because SPEC §8 listed "JSON dumps in the gitignored backup folder" as a requirement but provided no pre-authored mechanism. The Executor's decision was correct and acknowledged explicitly in EXECUTION_REPORT §5 Decision #1 — but the half-mark deduction in §2 above (Expected Final State accuracy: 4.5/5) is the SPEC author's mistake, not the Executor's. Codifying the pattern means future SPECs that dump rows pre-edit will not require Executor judgment.
- **Source:** §5 Decision #1 in EXECUTION_REPORT + §2 SPEC quality score in this review.

---

## 7. Executor-Skill Improvement Proposals (opticup-executor)

### Proposal 1 — Add `isDocFile()` exclusion to Rule-18 gate (mirror Iron-Rule-32's pattern)

- **Where:** Executor Proposal #1 from this SPEC's EXECUTION_REPORT — accepted verbatim. Plus open the M1.5 follow-up SPEC.
- **Change:** *(Reproduced from EXECUTION_REPORT §9 Proposal 1 — accepted verbatim)* Add: *"**Rule-18 false-positive awareness on doc-context appendices (added 2026-05-14 from `M3_SHORTGY_TO_INTERNAL_REDIRECT/EXECUTION_REPORT.md` Executor Proposal #1).** `scripts/checks/rule-18-unique-tenant.mjs` matches the literal token `UNIQUE` in any staged SQL file, including documentation appendices inside `modules/*/docs/db-schema.sql`. Iron Rule 32's gate already has `isDocFile()` which excludes such appendices for destructive-op detection — but Rule 18 does NOT. When your SPEC appends an advisory comment about a pre-existing global-UNIQUE constraint to a `db-schema.sql` file, the gate will block the commit. Workaround: reword to drop the `UNIQUE` token while preserving the intent. Permanent fix: see follow-up SPEC stub `M1_5_RULE_18_DOC_CONTEXT_EXCLUSION` (single-line change to add `isDocFile`-style guard)."*
- **Rationale:** ~30-second detour during this SPEC's docs-closure commit. Trivial gate fix (mirror existing IR-32 approach). Pattern WILL recur whenever a SPEC documents an EXISTING UNIQUE constraint in its appendix.
- **Source:** Deviation 2 in EXECUTION_REPORT + this Foreman's FOREMAN_REVIEW FIND-4 → new SPEC stub `M1_5_RULE_18_DOC_CONTEXT_EXCLUSION`.

### Proposal 2 — Add `updated_at` column-existence pre-flight to Level 2 UPDATE workflow

- **Where:** Executor Proposal #2 from this SPEC's EXECUTION_REPORT — accepted verbatim.
- **Change:** *(Reproduced from EXECUTION_REPORT §9 Proposal 2 — accepted verbatim)* Add: *"**`updated_at = now()` pre-flight (added 2026-05-14 from `M3_SHORTGY_TO_INTERNAL_REDIRECT/EXECUTION_REPORT.md` Executor Proposal #2).** Before issuing any Level 2 UPDATE that includes `SET ..., updated_at = now()`, run a quick `information_schema.columns` check on the target table. Empty result → drop `updated_at = now()` from the UPDATE before running it. Project pattern adds `updated_at` to most tables, but a handful of legacy CRM tables (e.g. `crm_message_templates`) lack it. Defensive pre-flight saves ~10s per occurrence and auto-flags M4-DEBT-class debt with no extra effort."*
- **Rationale:** Deviation 1 in EXECUTION_REPORT. Trivially preventable. Would also auto-flag missing-`updated_at` debt as it's discovered, feeding the hygiene-SPEC backlog naturally.
- **Source:** Deviation 1 in EXECUTION_REPORT.

---

## 8. Master-Doc Update Checklist

| Doc | Should have been updated? | Was it? | If not, follow-up needed |
|-----|--------------------------|---------|-------------------------|
| `MASTER_ROADMAP.md` §3 Current State | **YES** (Phase 1 COMPLETE — cross-module milestone, the only one for all 4 P1.X SPECs combined) | **PENDING** — Foreman writes this in the close step right after this FOREMAN_REVIEW commit | Adding now in next commit after FOREMAN_REVIEW; one-line entry for Phase 1 closure |
| `docs/GLOBAL_MAP.md` | NO (Integration Ceremony deferred; new short_links rows + JS file are M4 internals) | n/a | Next M4 Integration Ceremony |
| `docs/GLOBAL_SCHEMA.sql` | NO (deferred — same) | n/a | Next M4 Integration Ceremony |
| Module 4 `SESSION_CONTEXT.md` | YES (criterion 30) | ✅ Closure paragraph prepended in commit `78334f6` | n/a |
| Module 4 `CHANGELOG.md` | NO (out-of-band SPEC; batch entry at next phase close) | n/a | n/a |
| Module 4 `MODULE_MAP.md` | YES (criterion 32) | ✅ `crm-short-links-stats.js` entry added in `78334f6` | n/a |
| Module 4 `docs/db-schema.sql` | YES (criterion 31) | ✅ `M3_SHORTGY_TO_INTERNAL_REDIRECT` appendix block added in `78334f6` | n/a |
| `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` Layer 7 | YES (criterion 28) | ✅ Row 3 of inventory table now marks short.gy DEPRECATED with commit ref | n/a |
| `roles/site-overseer/FUNNEL_ROADMAP.md` | YES (criterion 29) | ✅ P1.3 row flipped PLANNED → ✅ CLOSED + "🎉 Phase 1 COMPLETE — 2026-05-14" banner added below table | n/a |
| `TECH_DEBT.md` | OPTIONAL (3 new entries: M4-DEBT-CRM-MESSAGE-TEMPLATES-UPDATED-AT + M4-DEBT-IRON-RULE-18-SHORT-LINKS-CODE-UNIQUE-GLOBAL + M4-DEBT-CRM-HTML-LAZY-LOAD-TABS) | PENDING — next session that opens TECH_DEBT.md adds the entries | Three one-line entries; defer to next M4 hygiene SPEC. |

**No hard-fail violations.** The MASTER_ROADMAP update is a deliberate post-FOREMAN_REVIEW commit (Phase-COMPLETE milestone is the trigger, not the SPEC seal).

---

## 9. Daniel-Facing Summary (Hebrew, ≤ 3 sentences)

> 🎉 **Phase 1 של מפת ההמרות סגור במלואו** — P1.3 (M3_SHORTGY_TO_INTERNAL_REDIRECT) נסגר 🟢, וכל 4 ה-SPECs של Phase 1 (P1.4 + P1.1 + P1.2 + P1.3) הושלמו באותו יום קלנדרי. כל קליק שכבר היום נשלח על קישור קצר ללקוח (תבניות + payment_links) זורם דרך `resolve-link` שלנו ומייצר שורה ב-`short_link_clicks` + `crm_lead_touchpoints` עם broadcast_id מלא — שרשרת המדידה סגורה מקצה לקצה, וטאב חדש "🔗 קישורים קצרים" ב-CRM מציג סטטיסטיקה למשתמש. הדרך פתוחה ל-Phase 2 (CAPI hybrid, pixel validation, template validation) — כולל P2.5.1 dashboard שיבנה על שכבת הנתונים הזו.

---

## 10. Follow-ups Opened

- **NEW SPEC stub:** `modules/Module 1.5 - Shared Components/docs/specs/M1_5_RULE_18_DOC_CONTEXT_EXCLUSION/` (~5 min) — closes FIND-4 (Rule 18 gate false-positive on doc appendices). Single-line fix to `scripts/checks/rule-18-unique-tenant.mjs` mirroring IR-32's `isDocFile()` predicate. M1.5 ownership (shared infrastructure).
- **TECH_DEBT entries (next session that touches `TECH_DEBT.md`):**
  - `M4-DEBT-CRM-MESSAGE-TEMPLATES-UPDATED-AT` — add `updated_at` column + trigger to `crm_message_templates`. ~5 min.
  - `M4-DEBT-IRON-RULE-18-SHORT-LINKS-CODE-UNIQUE-GLOBAL` — re-create `short_links_code_unique` as tenant-scoped. ~10 min, needs IR-32 §Destructive Operations declaration.
  - `M4-DEBT-CRM-HTML-LAZY-LOAD-TABS` (optional, informational from FIND-3) — refactor `crm.html` to lazy-load tab section HTML; pre-existing Rule 12 debt.
- **PHASE 2 UNBLOCKED:** `M4_FB_CAPI_HYBRID_DEDUPLICATION` (P2.1, HIGH PRIORITY, 6-8 hrs) + `M3_PIXEL_VALIDATION_GAP_REPORTING` (P2.2, 2-3 hrs) + `M4_TEMPLATE_VALIDATION_UNIFIED` (P2.3, 2-3 hrs) — all 3 SPECs can now be authored against verified Phase 1 substrate. P2.5.1 (Funnel Health Dashboard) can also start authoring in parallel once Phase 2 lands.
- **NEW SPEC stub from P1.2's review (still queued):** `M3_BROADCAST_ATTRIBUTION_THROUGH_FORM_SUBMIT` (~2 hrs) — closes P1.2 FIND-2 (RPC 14th param wired but no caller passes it through). Architect to brief; cross-repo touch on storefront.
- **Skill-improvement application backlog (to apply at next opticup-strategic session — accumulating since P1.4):**
  - From P1.4 (RPC_MAP): Author Proposal (gitignore-awareness on §8 paths) — DONE (applied at SPEC seal in this SPEC's §0).
  - From P1.4 (RPC_MAP): Executor Proposal (Iron-Rule-32 keyword-literal awareness) — DONE (applied at db-schema appendix reword).
  - From P1.1 (UTM_TRIPLE_LAYER): Author Proposal (rollback-artifact gate-compat → ROLLBACK.md doc-context) — DONE (applied — ROLLBACK.md is in doc-context location).
  - From P1.1 (UTM_TRIPLE_LAYER): Author Proposal (Pipeline-mode escalation discipline) — DONE (applied in SPEC §4).
  - From P1.1 (UTM_TRIPLE_LAYER): Executor Proposal (auto-CLI EF deploy on MCP 5xx) — N/A (no EF deploy in this SPEC, but the harvested rule is in place).
  - From P1.1 (UTM_TRIPLE_LAYER): Executor Proposal (function-signature-change awareness) — N/A (no PL/pgSQL signature changes).
  - From P1.2 (BROADCAST_ID): Author Proposal (function-signature DROP guidance) — N/A.
  - From P1.2 (BROADCAST_ID): Author Proposal (smoke pre/post in Pipeline mode) — DONE (applied — §3 criterion 24 split into delegated-pre + LH-Tester-post).
  - From P1.2 (BROADCAST_ID): Executor Proposal (skip MCP simplified-payload retry) — N/A (no MCP deploy this SPEC, but the harvested rule is in place).
  - From P1.2 (BROADCAST_ID): Executor Proposal (pg_cron debugging recipes) — N/A.
  - **From THIS SPEC (P1.3):** Author Proposal #1 (third-party-domain sweep at Step 1.5) → apply at next opticup-strategic session; Author Proposal #2 (scaffolding file authorization in §8) → apply at next opticup-strategic session.
  - **From THIS SPEC (P1.3):** Executor Proposal #1 (Rule-18 isDocFile exclusion → new M1.5 SPEC) + Executor Proposal #2 (`updated_at` column pre-flight) → apply at next opticup-strategic session.

---

## 11. Self-Improvement Mandate Compliance

Per skill mandate: every FOREMAN_REVIEW must carry 2+2 concrete proposals. ✅ Delivered: §6 (Author) + §7 (Executor). Both sets are file+section+exact-change format; both are anchored in real pain points from this SPEC's execution (third-party-domain pre-sweep + scaffolding file authorization + Rule-18 isDocFile gate gap + `updated_at` column existence check). Neither is cosmetic.

**Recurrence check (the 3-strikes rule):**
- **Pattern: Rule-class gates lack `isDocFile()` exclusion.** First observed P1.1 (rollback `_down.sql` Iron-Rule-32 false-positive). Second observed this SPEC (Rule 18 false-positive on db-schema appendix). 2 of the 3-strikes already. **One more occurrence → mandatory M1.5 SPEC to retrofit `isDocFile()` across ALL rule-class gates before the next M4 SPEC is dispatched.** Tracking via FIND-4 + Executor Proposal #1 above.
- **Pattern: SPEC §8 leaves Executor judgment for scaffolding files.** First observed this SPEC. 1 of 3-strikes. Logged via Author Proposal #2 for application at next opticup-strategic session.

---

## 12. Phase 1 of FUNNEL_ROADMAP — Closure Note

This SPEC closes Phase 1 of `roles/site-overseer/FUNNEL_ROADMAP.md`.

**Phase 1 summary (Foreman retrospective, looking back at the calendar day 2026-05-14):**

| Order | SPEC | Duration | Verdict | Key delivery |
|-------|------|----------|---------|--------------|
| 1 | P1.4 `M4_REGISTER_LEAD_TO_EVENT_RPC_MAP` | 1-2 hrs (read-only) | 🟡 CLOSED-WITH-FOLLOW-UPS | RPC body byte-for-byte map; FIND-1 (return-shape bug) → 15-min RETURN_SHAPE_FIX SPEC. |
| 2 | P1.4-followup `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX` | 15 min | 🟢 CLOSED | RPC return-shape bug closed before P1.1 built on top. |
| 3 | P1.1 `M3_UTM_TRIPLE_LAYER_PERSISTENCE` | 3.5 hrs (vs 4-6 estimate) | 🟢 CLOSED | `crm_lead_touchpoints` table + per-touchpoint journey log; Phase 4 E1/E7 BLOCK→SUPPORT. |
| 4 | P1.2 `M4_BROADCAST_ID_PROPAGATION` | 3-4 hrs | 🟢 CLOSED | broadcast_id end-to-end (queue→log→short_links→clicks→touchpoints); pg_cron 1-min counter. |
| 5 | P1.3 `M3_SHORTGY_TO_INTERNAL_REDIRECT` (this SPEC) | 2-3 hrs | 🟢 CLOSED | Migrated short.gy → internal `/r/<code>` for templates + tenants.payment_links; MVP "🔗 קישורים קצרים" CRM tab. |

**Total Phase 1 effort:** ~10-13 hours of executor work across 5 SPECs (including the P1.4 follow-up). Originally estimated 10-15 hrs in FUNNEL_ROADMAP §"Total Phase 1" — landed mid-range despite 4 of the 5 SPECs running Full-Auto Pipeline in single chats.

**Phase 1 outcomes confirmed:**
- ✅ Every customer-facing short-link click flows through internal measurement.
- ✅ Every click → `short_link_clicks` row + `crm_lead_touchpoints` row.
- ✅ Every broadcast-attributed click carries `broadcast_id` (P1.2 wiring + pg_cron counter).
- ✅ Layer 5 Gap #1 (counter rot) + Gap #2 (broadcast_id never written) closed structurally.
- ✅ Layer 7 short.gy marked DEPRECATED for internal usage.
- ✅ MVP "Short Link Stats" tab visible in CRM for Daniel.

**Phase 2 unblocked** — `M4_FB_CAPI_HYBRID_DEDUPLICATION` (P2.1, HIGH PRIORITY) is the natural next SPEC to author. The whole Phase 2 cluster (P2.1, P2.2, P2.3) builds on Phase 1's substrate.

---

*End of FOREMAN_REVIEW.md.*
