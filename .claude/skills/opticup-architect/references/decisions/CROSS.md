# Decisions Log — Cross-Module

Decisions that don't belong to a single module — workflow, process, communication style, etc.

> Per-module detail. Index summary in `../DECISIONS_LOG.md`.

---

## 2026-05-12 — PRIZMA_CRM_BUGFIX_BACKPORT (Full-Auto Pipeline, single chat, Path A)


**Situation:** The bug fixed in demo on 2026-05-11 (E2E audit SPEC `M4_DEMO_E2E_FULL_AUDIT`) — two `crm_automation_rules` rows that auto-sent `event_invite_waiting_list` template to the wrong audience AND auto-attached recipients as `invited` — was still active in Prizma production. Daniel signed off on the backport brief; Architect handed off to Full-Auto Pipeline in a single Claude Code chat under continuous-run mandate with planned escalation only on structural mismatch.
**Pipeline decision:** **Path A** — Prizma's 2 target rows (`d2585fc4-…` registration_open + `c25feaf7-…` invite_waiting_list) matched demo's `PRE_FIX_RULE_SNAPSHOT.json` byte-for-byte structurally (recipient_type, post_action_attendee_upsert, preserved keys all identical). Applied the same data-only UPDATE pattern: `recipient_type` `cross_event_active_waitlist` → `leads_by_status`; added `recipient_status_filter=['waitlist']`; removed `post_action_attendee_upsert` key. Post-UPDATE md5s are byte-identical to demo's `POST_FIX_RULE_STATE.json` md5s.
**Verification:** Prizma's 14 non-target rules aggregate md5 unchanged. Demo's 2 fixed rules unchanged (zero regression on demo). EF `automation-engine` v8 `mode='evaluate'` dry-runs on Prizma for both rule-trigger conditions (`registration_open` + `invite_waiting_list`) produced 0 outbound messages, 0 attendee inserts, 0 queue writes. Specifically: 0 `crm_message_log` rows tied to any of the 4 dry-run `run_id`s. The fixed rules produced 0 plan_items (correct — Prizma has 0 `waitlist`-status leads currently).
**Pre-merge artifacts:** `READY-FOR-MAIN-MERGE.md` (PR title/body/compare URL), `ROLLBACK_SQL.md` (verbatim pre-state SQL one UPDATE per rule), `ARCHITECT_REVIEW_CHECKPOINT.md` (side-by-side Before/After diff + auto-classified 🟢 Clean verdict). Pre-write annotated git tag `pre-backport-prizma-event-invite-fix` on `bccbc1a`. Main-merge is Daniel-only via GitHub PR.
**Findings:** 2 INFO opened → TECH_DEBT — (i) `crm_automation_rules` has no `updated_at` column; (ii) the separate `event_registration_open` rule on Prizma resolves to 1999 plan_items on event open — worth a follow-up audience-audit SPEC. 2 INFO dismissed (column-name lookup, EF runs-table writes by design).
**Skill improvements harvested (4):**
- **opticup-strategic Author #1:** when a SPEC requires an EF dry-run as verification, read the EF source FIRST (`get_edge_function`) and pin exact field-value semantics in §3 Success Criteria. This SPEC's criterion #8 said `status='evaluated'` but EF source writes `'completed'` — verified via fallback check but criterion text was slightly off.
- **opticup-strategic Author #2:** Cross-Reference Check result should be re-stated in DIAGNOSIS.md for SPECs authored more than 24h before execution. Catches drift between SPEC date and run date.
- **opticup-executor #1:** EF dry-runs returning large `plan_items` arrays must use a per-rule `Group-Object` summary pattern. This SPEC's first EF call produced a 27MB tool result; the second call (with `Group-Object -Property rule_name`) summarized to 10 lines. The summary pattern is the right default.
- **opticup-executor #2:** codify the two-tier hash pattern explicitly — per-target-row md5 + aggregate-untouched md5 captured pre/post-write for any subset-update SPEC. The aggregate-untouched md5 is the only mechanical proof of zero collateral damage.
**Lesson:** This was the first SPEC where opticup-strategic ran BOTH Foreman authoring AND Executor execution AND Foreman review in a single chat under Full-Auto Pipeline mode. Path A/B branching with planned escalation worked cleanly when the structural-match criteria were precise. The two-tier hash pattern (also used by `DEMO_PARITY_REPLICATION` 2026-05-11) is now confirmed as a project standard for any "modify subset of rows in a tenanted table" SPEC.

---

## 2026-05-06 — Verbose audit summary, multiple findings as bullet list


**Situation:** Reported audit results from front-end Access file with 4 numbered findings, each a long paragraph.
**My recommendation:** (implicit — reported deeply)
**Daniel's response:** Corrected.
**Reason for correction:** "אתה כותב יותר מידי! תכתוב בקצרה וענייני ותשתדל בלי טכני!!!!" — Daniel wants short, prose, non-technical.
**Lesson:** Default to prose, terse, no bullets unless strictly needed. Codified as Pattern P16 in SKILL.md.


## 2026-05-06 — `cust_listb` migration scope guess


**Situation:** Audit found 156 customers in a separate B-table with different schema (mikud, fax, no Rx).
**My recommendation:** Hypothesized B2B customers; suggested keeping for migration with `is_business` flag or as separate table.
**Daniel's response:** Corrected.
**Reason for correction:** "זה לידים. תתעלם מהם. זאת מערכת זמנית שעשינו לקמפיינים מסויימים לפני שהם הופכים ללקוחות."
**Lesson:** Don't speculate on data purpose from schema alone — ASK before recommending. When schema is unusual, the next message should be "אתה זוכר מה זה?" not a hypothesis. Pattern: "data-shape ≠ data-purpose". Asked sample records, learned origin → corrected.


## 2026-05-06 — Send Claude Code on Windows for Access audit


**Situation:** Daniel asked if Cowork could read the Access `.accdb` directly.
**My recommendation:** Send to Claude Code on Windows (native Access, faster, less encoding issues with Hebrew).
**Daniel's response:** Agreed.
**Reason for agreement:** Implicit — Daniel had already noted Cowork's limitations earlier in the project.
**Lesson:** When tool capability differs sharply between environments (e.g., Windows-native Office formats), default to the right environment without 4-option-menu. Pattern P9 (refer down, don't solve down) applies up the stack too — send work to the environment that owns it.


## 2026-05-06 — Light vs deep audit calibration on lab file


**Situation:** Daniel sent the third file (lab `.accdb`) but said "this file is not so relevant."
**My recommendation:** Light audit, target 100-200 lines, structure + logic only, skip deep statistics.
**Daniel's response:** Implicitly agreed (proceeded).
**Reason for agreement:** Daniel's directive "the data isn't needed — the logic in OpticUp will be different anyway" maps directly to "we're informing not copying".
**Lesson:** Listen for Daniel's "relevance signals" — they should map directly to audit depth. "Not so relevant" = light audit. "Critical" = deep. Pattern P12 codified in SKILL.md.


## 2026-05-11 — Demo Whitelist Update — SMS no-op verified, email gap escalated


**Situation:** Brief authorized 1-2 single-row UPDATEs on demo's `tenants` row to populate SMS + Email allowlists with Daniel's 3 phones / 3 emails before his manual test cycle on the new demo storefront.
**My recommendation (Foreman, Full-Auto Pipeline):** Run diagnostic first per Brief §3. Result drove the SPEC into a narrower envelope than the Brief authorized: (a) SMS — demo's `test_mode_sms_allowlist` already contained exactly the 3 phones in E.164 (mandated by C-001); no UPDATE needed. (b) Email — no allowlist mechanism exists anywhere (no column, no `ui_config` jsonb key, no `send-message` EF logic). Wrote `ESCALATION.md` with 3 options for Architect; recommended Option 2 (jsonb in `ui_config`, minimal disruption, ships TODAY).
**Daniel's response:** Pending — escalation surfaces this for the Architect-to-Daniel decision loop. The next SPEC will be authored against Daniel's choice of Option 1 / 2 / 3.
**Reason:** Brief §6 Decision #5 explicitly: "If email whitelist mechanism doesn't exist → escalate, don't auto-create schema." Pipeline obeyed.
**Lesson 1 (SPEC envelope can narrow vs Brief):** A SPEC's §6.5 Destructive Operations envelope is bounded ABOVE by the Brief but may always be NARROWER. Performing a no-effect UPDATE just to satisfy the Brief literally is wrong — it bumps `updated_at` and creates a phantom audit event. Codify in opticup-strategic SKILL §"SPEC Authoring Protocol" (Author Proposal #1 in this SPEC's FOREMAN_REVIEW).
**Lesson 2 (ESCALATION.md is a first-class SPEC artifact):** When a Brief authorizes a planned escalation and the diagnostic phase triggers it, write a dedicated `ESCALATION.md` inside the SPEC folder (not in `escalations/`). It contains the gap + 2-3 options + Foreman recommendation. FINDINGS.md gets a one-line cross-reference. Codify in opticup-executor SKILL §"folder-per-SPEC retrospective protocol" (Executor Proposal #2 in this SPEC's FOREMAN_REVIEW).

---

## Pattern Index — Daniel's Decision Patterns (harvested 2026-05-16 → 2026-05-17, applied 2026-05-17 night)

Foundation catalog for the future Autonomous Decision-Maker skill. Each pattern is keyed `C-NNN` (Daniel correction), `A-NNN` (Daniel agreement), `S-NNN` (communication style), or `P-NNN` (strategic philosophy). Future Briefs reference these by key when justifying decisions.

### CORRECTIONS DANIEL MADE (high-signal — codify as future-automatic decisions)

**C-001 — Module 1 organization: One screen, multiple categories. Not separate top-level cards.** (2026-05-16) — When a feature is conceptually part of an existing module's domain, it lives INSIDE that module's screen as a category/section, NOT as a new top-level entry. Top-level cards = distinct modules; sub-categories ≠ top-level.

**C-002 — Reusable UI components belong in Module 1.5, not duplicated per-module.** (2026-05-17 morning) — Any UI primitive (sidebar, modal, toast, table, form) that future modules will reuse MUST live in `shared/` under Module 1.5 from day 1. Module-specific code only imports + configures the shared primitive. Never "we'll extract it later."

**C-003 — Visual functional verification is mandatory, not optional.** (2026-05-17 noon, 3rd strike) — HTTP smoke + raw screenshot capture is INSUFFICIENT. Every UI Pipeline must perform user-style visual walkthrough where Tester opens each surface in Chrome MCP at full viewport, describes what's seen, and verifies bug-regression queries from Brief §1. Codified as opticup-localhost-tester Tier C (mandatory). 4th firing 2026-05-17 night (M1_FINAL_NIGHT_PHASE_1).

**C-004 — When two pieces of work share the same code path, ship them in one Pipeline, not separate.** (2026-05-17 morning) — Bug fix + refactor that touch the same files → one Pipeline with refactor as primary and bug fix as natural consequence. Separate Pipelines risk merge conflicts + double-touch.

**C-005 — Verify GitHub UI state when local git seems off, before acting.** (2026-05-17 multiple) — When local git contradicts GitHub UI, GitHub is the source of truth. Run `git fetch --force` + `git ls-remote` before acting on a delta count. Every PR hand-off begins with GitHub-state verification.

**C-006 — Prizma writes require explicit Daniel authorization, even for "obviously safe" data.** (2026-05-16) — Production tenant writes are Daniel-only authorization. Even structurally-safe writes (single row, additive) — executor escalates and stops. Daniel decides the path (manual UI / Claude Code / Cowork). No "blanket safe-to-write" rules.

### AGREEMENTS DANIEL CONFIRMED (validated patterns — reinforced defaults)

**A-001 — Sidebar position: right side for RTL (Hebrew).** Default: every sidebar uses RTL logical properties (`margin-inline-start` etc.). Never `left:`/`right:` absolute.

**A-002 — Single source of truth for catalog: Optic Up manages global; stores manage private.** Default for "shared resource with per-tenant customization": platform owns shared layer + tenant owns private layer, both visible to tenant.

**A-003 — Clone-to-Private feature for customization without losing global integrity.** Default for SaaS customization: when tenant needs to modify a platform-owned entity, Clone-to-Private button rather than overwrite the platform copy.

**A-004 — Permission roles: CEO + Branch Manager can manage private catalog.** Default for "ownership-class permissions": CEO + Branch Manager are the standard pair. (Note: live schema role name is `manager` not `branch_manager` — caught 2026-05-17 night by M1_FINAL_NIGHT_PHASE_1.)

**A-005 — Sequential Pipeline phases with VFV gates beat one giant Pipeline.** Default for multi-deliverable night Pipelines: split into phases by deliverable, gate each with VFV.

**A-006 — Comprehensive QA with real-world data simulation is part of the build, not separate.** Default: customer-facing feature QA includes seeded realistic data + walking every flow + fixing surface bugs in-flight.

**A-007 — Preserve seeded demo data for Daniel's morning review.** Default: night Pipelines that seed demo data never clean up. Add `DEMO_DATA_MAP.md`.

### COMMUNICATION STYLE PREFERENCES (how to talk to Daniel)

**S-001 — Recommendations first, options second. Always.** Lead with "my recommendation is X because Y", then alternatives if asked.

**S-002 — Plain Hebrew, no technical jargon.** Schema words belong in files, not chat. Concept names in Hebrew.

**S-003 — Short messages. 4 lines or fewer for most exchanges.** Walls of text are noise.

**S-004 — One question at a time, with a recommendation already attached.**

**S-005 — Acknowledge mistakes briefly, then move on. No over-apology.** "צודק, סליחה" once + correction.

**S-006 — Show data when claims are made.** "X is true" requires evidence — not just word.

**S-007 — Don't auto-execute on Daniel's behalf when permissions are involved.** Daniel will delegate when safety bar is clear. Executor must verify safety FIRST.

### STRATEGIC PATTERNS (Daniel's philosophy)

**P-001 — SaaS-clean over quick-fix, always.** Quick fix breaking SaaS-litmus → rejected.

**P-002 — בלי פלסטרים (no Band-Aids).** Architecturally-correct foundation, even at 4-6× initial cost, beats patch-now-refactor-later. (Cited 2026-05-17 night during M1_FINAL_NIGHT_PHASE_1 Option A vs Option B schema decision — unified design + filter beat split-into-3-trees because the discriminator was already correctly enforced.)

**P-003 — Strategic decisions = Daniel's role. Technical decisions = Architect/Executor's role.** Daniel decides user-facing flows, business rules, architectural philosophy. Not table names.

**P-004 — Don't escalate tactical decisions when autonomy is granted.** Distinguish "true escalation" from "polite halt that wastes Daniel's time."

**P-005 — Real-world stress test the architecture during build.** Smoke 7/7 is necessary but insufficient. (See A-006.)

### How the Future Autonomous Decision-Maker Skill Uses This

When a SPEC reaches a point where Daniel would normally be asked, the skill consults this index:
1. Find matching pattern (C-NNN / A-NNN / S-NNN / P-NNN).
2. Apply the rule.
3. Log the decision in EXECUTION_REPORT.md: "decision X taken autonomously per CROSS.md pattern A-002."
4. Surface only true escalations (per C-006, P-003, P-004, S-007).
5. Update this index if Daniel later corrects.

The skill MUST NOT autonomously decide:
- Anything touching Prizma data (C-006)
- Anything changing product positioning (P-003)
- Anything contradicting a previously-locked architectural decision without explicit re-opening

---

## 2026-05-17 — Supervisor Skill + Parallel Pipeline Coordination

### Decision A — Build Supervisor skill (opticup-supervisor)
**Context:** Daniel wants autonomous Pipeline operation during periods he is unavailable, with full reversibility. Current escalations require Daniel as a manual lookup tool against DECISIONS_LOG.

**Decision:** Build new skill `opticup-supervisor` in 3 phases. Phase 1 (Triage from decisions log) ships first, in Shadow Mode for 3 days. Phases 2 (Retry+Snapshot) and 3 (Auto-Harvest+Pending-Promotions) gated on Shadow Mode success.

**Architecture:** Core/Adapter separation from day one — Core is project-agnostic (portable to future projects); Adapter is Optic Up specific (decisions-log paths, skill destinations, verification criteria). Future projects: copy Core unchanged, write new Adapter.

**Constraints (non-negotiable):**
- Never writes new strategic decisions — lookup only.
- Never modifies DECISIONS_LOG, CLAUDE.md, or main branch.
- Zero destructive operations.
- Confidence ≤ 2 → mandatory escalate.

### Decision B — Shadow Mode = 3 days side-by-side
**Context:** Need calibration data before granting Supervisor autonomy.

**Decision:** During 2026-05-17 → 2026-05-20: every escalation processed by both Supervisor (logs proposed resolution + confidence 1-5) and Daniel (actual resolution). Side-by-side comparison file at `_archive/supervisor-log/shadow-{ISO_DATE}.md`.

**Flip criteria after day 3:** ≥80% match AND zero confidence-5 mismatches → Active Mode. Below threshold → extend Shadow + investigate misclassified entries.

### Decision C — Confidence cap = 3 on auto-memory sources
**Context:** Auto-memory MEMORY.md contains Daniel's preferences but is not canon. Risk: Supervisor treats casual preferences as sealed decisions.

**Decision:** Canonical sources (DECISIONS_LOG, decisions/*.md, CLAUDE.md, MASTER_ROADMAP) allow max confidence 5. Auto-memory capped at confidence 3 — which by §12.1 hard rule means it can never be the deciding source (≤2 always escalates; 3 is borderline and policy makes it escalate from auto-memory too).

**Net effect:** Auto-memory is a hint source, never a deciding source.

### Decision D — Reverse-harvest on every mismatch
**Context:** Shadow Mode produces data. The data must convert into Adapter improvements automatically.

**Decision:** Every Shadow-mode mismatch + every Active-mode-Daniel-override generates an automatic proposal at `_archive/supervisor-pending-promotions/reverse-{ISO_DATE}_{TOPIC}.md` with: what Supervisor proposed + reasoning, what Daniel chose + reasoning, recommended Adapter update. Daniel approves with one click → Supervisor updates its own Adapter.

**Net effect:** Supervisor improves itself without Daniel writing skill code.

### Decision E — Mistake taxonomy (4 classes)
**Context:** Not all Supervisor mistakes mean the same fix.

**Decision:** Every mistake (mismatch or rejected proposal) classified as:
- **A — Lookup miss:** the DECISIONS_LOG had the answer; Supervisor didn't find it. Fix: improve search heuristic in Adapter.
- **B — Lookup wrong-match:** Supervisor found an entry but applied it to wrong context. Fix: tighten entry-applicability rules.
- **C — Genuine novelty:** the question wasn't in DECISIONS_LOG. Fix: not a mistake — confirm escalation was correct, log new decision when Daniel resolves.
- **D — Confidence miscalibration:** high-confidence but wrong. Fix: review what made it falsely confident; add anti-pattern to Adapter.

### Decision F — Build Parallel Pipeline Coordination as separate SPEC, today
**Context:** 2026-05-17 morning, M1 Pipeline opened PR develop→release and merged it while Supervisor Pipeline was mid-build. Branch switch silently dragged Supervisor's HEAD onto release branch. C6 commit landed on wrong branch. Recovery required ~20 min + 1 escalation + risk of losing work on wrong recovery choice.

**Decision:** Single ~1-hour SPEC, no phasing. File-system mediated lock protocol (no daemon). Lock files at `_archive/pipeline-sessions/*.lock` (gitignored). 5 commands: `claim`, `release`, `check-collision`, `heartbeat`, `cleanup-stale`. Wired into 5 Pipeline skills as Pre-Action Collision Check. All collisions halt + escalate (no auto-resolution).

**Net effect:** The incident class cannot recur silently. Pipelines opened after `23107bc` will execute `claim` at bootstrap and halt on collision.

### Decision G — P-EXEC-2 first proof of learning-loop
**Context:** Yesterday (SUPERVISOR_SKILL_PHASE_1) added the P-EXEC-2 binding rule for handling pre-existing CLAUDE.md size violations. Today (PARALLEL_PIPELINE_COORDINATION) Executor Step 0 encountered exactly that case (CLAUDE.md 505 lines pre-existing) and handled correctly via §5 +25 delta cap (+4 actual).

**Lesson:** This is the first end-to-end proof that the team's learning loop works: a rule promoted yesterday caught a real bug today, without any human intervention. Validates the Reverse-harvest + auto-promotion design.

**Cross-references:**
- SPEC 1 Brief: `modules/Module 1.5 - Shared Components/architecture-brief/SUPERVISOR_SKILL_BRIEF.md`
- SPEC 1 retrospective: `modules/Module 1.5 - Shared Components/docs/specs/SUPERVISOR_SKILL_PHASE_1/FOREMAN_REVIEW.md`
- Coordination Brief: `modules/Module 1.5 - Shared Components/architecture-brief/PARALLEL_PIPELINE_COORDINATION_BRIEF.md`
- Coordination retrospective: `modules/Module 1.5 - Shared Components/docs/specs/PARALLEL_PIPELINE_COORDINATION/FOREMAN_REVIEW.md`

### Decision H — Applied pending-entries deletion is not Iron Rule 32 destructive
Sweep-and-delete is the documented end-state per opticup-architect SKILL "Cowork File-Write Capability Map" + "Sweep Layer 1" protocol. Deletion without per-instance SPEC + `--no-verify` acceptable. Codify in Iron Rule 32 documentation as standing exception.


---

## 2026-05-18 — Stage 1 close-out + Stage 2A authoring: 3 architect mistakes Daniel caught

**Context:** After M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1 closed 🟢 with Tier C VFV 18/2/0, Daniel reviewed the live screen and found 3 separate architect-level errors that the Pipeline's Tier C VFV could not catch — all three were architectural-intent mistakes, not visual-fidelity mistakes.

**Mistake 1: Built the wrong screen architecture.** Brief told Module Strategist to put BOTH tabs (global + my-catalog) inside one screen, served to both admin and tenant users. Daniel's actual intent was always: TWO separate screens. `lens-catalog-admin` = Optic Up team only, single-purpose master maintenance. The tenant inventory screen shows a different view with two sub-tabs (global-readonly + my-catalog-editable) — but tenants never see the master-admin screen. Daniel had said this clearly in `LENS_PLATFORM_CATALOG_ADMIN_MOCKUP.html` (banner: "PLATFORM ADMIN — Optic Up Team Only") and I missed the implication when authoring the Brief. **Lesson:** when a mockup file's banner names its audience explicitly, that's a hard architectural constraint, not flavor text. Read mockup banners as locked-decisions equivalent to a sealed Brief paragraph.

**Mistake 2: Skipped reading the mockup in full before writing the Brief.** Brief was written based on the mockup's first ~30 lines (theme + columns). The actual mockup had 671 lines including a full 4th column (series detail + variants table + versioning + publish-state + adoption count). Stage 1 shipped only 3 columns and the right-pane was empty — Daniel's verdict: "this is much more serious in the mockup than what was built." **Lesson:** any Brief for a mockup-faithful rebuild MUST be preceded by a complete read of the mockup file (full `Read` with no `limit` if file ≤ 700 lines, or full sequential `Read` calls if larger). The Brief's §3 Scope IN must enumerate every capability the mockup exposes — sections, sub-sections, action buttons, status badges, version controls, adoption indicators. Self-check before sealing any mockup-fidelity Brief: "have I read every region of the mockup file, or just the header and the first column?"

**Mistake 3: Tried to lump contact lenses + glasses under "category" field on the same table.** Proposed (as a "feature improvement") adding a `category` enum (Single Vision / Multifocal / Photochromic / Daily / Monthly / etc.) on `lens_design` so both contact lenses and glasses lenses live in one table. Daniel corrected: contact lenses have entirely different field sets (Base Curve, Diameter, Duration) vs glasses (SPH/CYL/Index/Coating). They are already separate tables (`lens_*` and `contact_lens_*`) by deliberate design. **Lesson:** before proposing to merge two entities under a discriminator field, run Pattern P21 (entity-boundary pressure test) explicitly: list the fields of each, count the overlap. If overlap < 30%, two tables. The lens-vs-contact-lens case is the textbook "different products that happen to share a customer-facing umbrella" — they belong in different schemas. Codify in opticup-architect SKILL.md: when Daniel says "we have separate tables for X and Y," the answer is never "let's add a discriminator" — the answer is "two tabs in the UI, two schemas in the DB."

**Pattern emerging from all 3:** the Pipeline's Tier C VFV verifies visual fidelity against a mockup, but cannot verify architectural intent. When the Architect's Brief itself misreads intent, the Pipeline ships a mockup-faithful copy of the wrong architecture. Mitigation going forward:

1. **Mockup file full-read is mandatory** before authoring any mockup-fidelity Brief. Bullet enumeration of every capability in Brief §3.
2. **Audience banners in mockups are hard constraints**. Brief §5 Locked Decisions must include an "Audience" row for each screen if mockups specify it.
3. **Visual review by Daniel comes BEFORE the next stage starts**, not after. After every Stage closes 🟢, send the URL + one-question prompt: "פתח את X. נראה כמו שאתה אישרת? נשארנו עם משהו לתקן?" Skip the next stage's authoring until the answer is yes.
4. **Entity-boundary pressure test (P21) for every Brief** that touches multiple-product modules (lens / contact-lens / accessory / frame).

These 4 mitigations apply to the upcoming `M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A_BRIEF` immediately.

---

## 2026-05-18 — Same-session continuation beats new-session bootstrap (Daniel correction)

**Situation:** After Stage 2A closed 🟡 with the T-BLOCK-2 RLS escalation, I wrote the unblocker Brief and reflexively told Daniel "paste into a fresh Claude Code chat." Daniel asked why a fresh chat and not the existing one — pointing out that previous lessons already established same-session continuation as superior, and asking why this wasn't already reflected in the skill.

**My recommendation when corrected:** Continue in the existing Claude Code session. Reason: the Claude Code session has 1M-token context window, the previous SPEC's full state (Foreman role, T-BLOCK-2 discovery, FOREMAN_REVIEW.md authoring) is already loaded as recent context, lock was released cleanly, no architectural reason to discard that context. Pipeline-coordination's lock system handles concurrency, not session-freshness.

**Daniel's response:** Agreed. He then pointed out this lesson should already have been codified.

**Reason for the gap:** the architect SKILL.md (this file's parent) was written before Full-Auto Pipeline introduced same-chat skill chaining (Foreman → Executor → Reviewer → Localhost-Tester → Foreman closure all in one Claude Code chat). The "new chat per Brief" rule was correct in the previous architecture where Claude Code chats were single-skill and each role-switch required a fresh session. With the current Pipeline architecture, role-switch is in-chat via Skill tool, and the 1M context window comfortably holds 5+ SPEC cycles. The rule is stale. I knew this empirically (recent Pipelines have run 9-13 commits in one chat without context degradation) but didn't reflect it back into the protocol.

**Codified lesson — default to same-session continuation:**

1. After any SPEC closes (🟢 or 🟡), if a follow-up SPEC is queued in the next 1-2 hours AND the existing Claude Code chat shows healthy state (Pipeline released locks, lender summary printed, no error trail), default to continuing the same chat with a new Activation Prompt.
2. Open a fresh Claude Code chat only when: (a) the existing chat shows context-window strain (slow responses, truncation, repetition), (b) the new SPEC is in a different module with completely unrelated context, (c) Daniel explicitly says "open a fresh chat," (d) more than ~24h elapsed since the previous SPEC closed (context staleness, branch drift).
3. The default Activation-Prompt-delivery hand-off is "paste this into your active Claude Code chat." Only if conditions (a)-(d) apply does the Architect say "open a fresh Claude Code chat."

**Mitigation for ME (next time):** when I catch myself writing "paste into a fresh Claude Code chat," ask explicitly: is there an existing chat at healthy state? If yes, override the default with same-session continuation. Make the override visible in the Hebrew status line: "הדבק לסשן הקיים — הקונטקסט שם משרת אותנו."


---

## 2026-05-18 — End-of-session: M1 Lens Catalog Stages 1 + 2A + 3 unblockers shipped end-to-end

**Context:** Single Cowork architect session over 2026-05-18 evening/night closed FOUR SPECs through Full-Auto Pipeline (same Claude Code chat continuation per the new "same-session continuation" rule logged earlier today):

1. `M1_LENS_CATALOG_MOCKUP_FIDELITY_STAGE1` — 🟢 (3 commits, Tier C VFV 18/2/0)
2. `M1_LENS_CATALOG_PLATFORM_ADMIN_STAGE_2A` — 🟡 (9 commits; 2 carry findings: T-BLOCK-2 RLS gap, T-INFRA-1 session-routing)
3. `M1_PLATFORM_CATALOG_RLS_WRITE_BYPASS` — 🟡 (5 commits; resolves T-BLOCK-2; 1 carry: Iron Rule 32 hook gap requiring `--no-verify` go-ahead)
4. `M1_INVENTORY_SHELL_PLATFORM_ADMIN_SESSION_BRIDGE` — 🟢 (5 commits, false-positive 4/4 PASS caught by Daniel)
5. `M1_5_PLATFORM_ADMIN_AUTH_STORAGEKEY_ISOLATION` — 🟢 (5 commits, REAL Tier C VFV 4/4)

Net effect: Stage 2A is now 🟢 GREEN end-to-end. Daniel can log into `admin.html`, navigate to `inventory.html?t=demo`, click "🔧 קטלוג מערכת", and reach the full 4-column Platform Catalog Admin screen with submits succeeding (RLS bypass live).

**Three architect mistakes from this session, all corrected mid-flow:**

- **Mistake 1 (logged earlier today):** Stage 1 Brief misframed architecture (combined-screen vs two-screens). Daniel caught via visual review.
- **Mistake 2 (logged earlier today):** Stage 1 Brief was written from partial mockup read (~30 lines). Daniel caught the missing 4th column.
- **Mistake 3 (new):** SESSION_BRIDGE Brief identified the wrong auth file (`catalog-auth.js` vs the actual `admin-platform/admin-auth.js`). The bridge was correct code but read from an always-empty namespace. Foreman echoed the Brief without verification; Tester used synthetic `auth.setSession()` injection that hid the gap; pipeline reported 4/4 PASS. Daniel caught it via real visual test on his browser. The Brief's "DO NOT touch admin.html or admin-auth.js" rule was the error — it fenced off the actual fix-point.

**Codified lesson — P-AUTHOR-1 (new, from Mistake 3):** ANY frontend auth/session SPEC must include in its pre-flight: `grep '<script src=' <entry-page>.html` to enumerate THE ACTUAL files loaded by that page. The SPEC's claim "file X is the auth handler for page Y" must be verified by file-load inspection, not filename-pattern inference. The Brief author (me) inferred from `lens-catalog-admin/catalog-auth.js` that it serves admin.html — wrong; it serves the catalog-admin partial loaded later. Always grep entry-page scripts before sealing scope.

**Codified lesson — P-AUTHOR-2 (new, from Mistake 3):** Tier C VFV instructions must FORBID synthetic session injection by default (`auth.setSession()`, mocked localStorage, direct RPC with service_role). The Tester MUST drive the real entry-page form via Chrome MCP `fill_form` + click, then verify state propagation downstream. Synthetic injection plants a state the real user flow never reaches — produces false-positive PASS reports. SPECs that touch auth/session/storage explicitly require real-flow Tier C.

**End-of-session bug captured for next session (NOT yet resolved):** The Stage 2A admin screen shows a tenant-dropdown selector at the top — Daniel pointed out this is semantically inverted. The admin defines global suppliers/brands/series, then assigns which tenants receive access (default = all tenants). The current dropdown implies "show me what tenant X sees" which is backwards. To be addressed in a future Stage 2A.5 SPEC or rolled into Stage 2B scope. Logged for Architect attention on next session resume.

**147 commits pending merge to main at end of session.**

