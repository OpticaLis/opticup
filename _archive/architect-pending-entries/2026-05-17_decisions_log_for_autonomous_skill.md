# Pending entry — Decisions Log harvest for future Autonomous Decision-Maker skill

**Created by:** opticup-architect (Cowork) 2026-05-17 evening
**Purpose:** Capture Daniel's decision patterns from 2026-05-16 + 2026-05-17 work sessions, as a foundation for a future "Autonomous Decision-Maker" skill that decides in Daniel's place during fully-autonomous build phases.

**Application destination:** append to `.claude/skills/opticup-architect/references/decisions/CROSS.md` (Daniel's decision patterns) AND keep this file for the future skill-builder session to scan.

---

## Pattern Index — 2026-05-16 to 2026-05-17

### CORRECTIONS DANIEL MADE (high-signal — codify these as future-automatic decisions)

**C-001 — Module 1 organization: One screen, multiple categories. Not separate top-level cards.**
- Date: 2026-05-16
- Situation: I built lens department as a separate top-level card on home screen
- Daniel's correction: "צריך לעצב את המסך בצורה קצת אחרת שיתאים לפלואו החדש... למה לא לעשות את זה תחת ניהול מלאי אחד ולחלק אותו לקטגוריות בצורה חכמה?"
- Principle extracted: when a feature is conceptually part of an existing module's domain (inventory, customers, orders, etc.), it lives INSIDE that module's existing screen as a category/section — NOT as a new top-level entry. Top-level cards are for distinct modules; categories within modules are NEVER top-level.
- Autonomous-skill rule: before adding a top-level home card, ask: "is this conceptually a distinct module or a category within an existing module?" If category → sidebar entry, not card.

**C-002 — Reusable UI components belong in Module 1.5, not duplicated per-module.**
- Date: 2026-05-17 morning
- Situation: I built the category sidebar inline inside inventory.html
- Daniel's correction: "לדעתי צריך לעשות את הסיידבר כרכיב דרך מודול 1.5 לכל התוכנה"
- Principle extracted: any UI primitive that future modules will reuse (sidebar, modal, toast, table, form layout) MUST be in `shared/` under Module 1.5. Single source of truth. Module-specific HTML/JS only imports + configures the shared primitive.
- Autonomous-skill rule: when designing UI for a new feature, ask "will any other module want this same primitive?" If yes → Module 1.5 from day 1, NOT "we'll extract it later."

**C-003 — Visual functional verification is mandatory, not optional.**
- Date: 2026-05-17 noon (3rd strike)
- Situation: 3 consecutive Pipelines (M1_INVENTORY_REDESIGN + M1_INVENTORY_UNIFIED_SCREEN + M1_5_CAT_SIDEBAR_COMPONENT) closed 🟢 but shipped user-visible bugs Daniel caught at first glance
- Daniel's correction: "לדעתי אתה צריך לעדכן את הסקיל שאמור להיות אחראי על זה שבסוף כל שינוי יהיה ווידוא גם ויזואלי שהכל תקין לפני שהוא סוגר"
- Principle extracted: HTTP smoke + raw screenshot capture is INSUFFICIENT. Every UI Pipeline must perform user-style visual walkthrough where the Tester opens each surface in Chrome MCP at full viewport, describes what they see in writing, and verifies bug-regression queries from the Brief's §1 Purpose. No 🟢 without this.
- Autonomous-skill rule: codified as opticup-localhost-tester Tier C (mandatory). Every Brief I author henceforth includes a VFV surfaces table in §7.

**C-004 — When two pieces of work share the same code path, ship them in one Pipeline, not separate.**
- Date: 2026-05-17 morning
- Situation: I separated "fix overlap bug" from "extract sidebar to Module 1.5" as two SPECs
- Daniel's approval was conditional: ship together because they touch the same files
- Principle extracted: when shipping a bug fix + a refactor that touch the same files, do them in one Pipeline with the refactor as the primary deliverable and the bug fix as a natural consequence. Two separate Pipelines risk merge conflicts + double-touch the same code.
- Autonomous-skill rule: SPEC scoping checklist asks "does this work touch files that another open SPEC also touches?" If yes → consider consolidating.

**C-005 — Verify GitHub UI state when local git seems off, before acting.**
- Date: 2026-05-17 morning + afternoon (twice in one day)
- Situation: Local main was stale; Pipeline saw 525 (later 555) commits ahead, GitHub showed "nothing to compare" or 30
- Daniel's correction: did not happen explicitly — but the pattern of "I see something, you see something else, who's right?" required cross-verification
- Principle extracted: when local git state contradicts GitHub UI state, GitHub is the source of truth. Run `git fetch --force` + `git ls-remote` to confirm before acting on a delta count. Don't generate PRs based on stale local refs.
- Autonomous-skill rule: every PR hand-off begins with a GitHub-state verification step.

**C-006 — Prizma writes require explicit Daniel authorization, even for "obviously safe" data.**
- Date: 2026-05-16 (tenant_location seed scenario)
- Situation: A Pipeline needed to seed 1 row to Prizma's `tenant_location` for goods-receipt to work
- Daniel's approach: he reviewed the SQL, authorized me to run it via Supabase MCP (because Cowork has DB access, unlike Claude Code which doesn't)
- Principle extracted: production tenant writes are Daniel-only authorization. Even when the write is structurally safe (single row, additive, no FKs touching elsewhere), the executor escalates and stops. Daniel decides the path: manual via UI / Claude Code / Cowork / etc.
- Autonomous-skill rule: any write to a production tenant (Prizma today, tenant 2 in future) requires explicit per-event authorization. No "blanket safe-to-write" rules.

### AGREEMENTS DANIEL CONFIRMED (validate patterns I proposed — these are now reinforced defaults)

**A-001 — Sidebar position: right side for RTL (Hebrew).**
- Confirmed when I noted the sidebar appeared on left initially.
- Default: every sidebar in opticup uses RTL logical properties (`margin-inline-start` etc.). Never use `left:`/`right:` absolute.

**A-002 — Single source of truth for catalog: Optic Up manages global; stores manage private.**
- I proposed the 2-tab catalog architecture; Daniel agreed.
- Default for any "shared resource with per-tenant customization": platform owns the shared layer + tenant owns a private layer, both visible to the tenant.

**A-003 — Clone-to-Private feature for customization without losing global integrity.**
- I proposed "store can clone global into private to edit"; Daniel agreed.
- Default for SaaS customization: when a tenant needs to modify a platform-owned entity, they get a Clone-to-Private button rather than overwrite the platform copy.

**A-004 — Permission roles: CEO + Branch Manager can manage private catalog.**
- I proposed both; Daniel agreed.
- Default for "ownership-class permissions": CEO (business owner) + Branch Manager (operational owner) are the standard pair. Cashiers + opticians get read-access only.

**A-005 — Sequential Pipeline phases with VFV gates beat one giant Pipeline.**
- I proposed β (sequential phases) over α (one big Pipeline); Daniel approved.
- Default for multi-deliverable night Pipelines: split into phases by deliverable, gate each with VFV before advancing. If a phase fails, the others can still complete.

**A-006 — Comprehensive QA with real-world data simulation is part of the build, not separate.**
- I proposed QA-only-after-build; Daniel approved + added "with autonomous fixes during the run."
- Default: when shipping a customer-facing feature, the QA phase includes seeded realistic data + walking through every user flow + fixing surfaces bugs in-flight.

**A-007 — Preserve seeded demo data for Daniel's morning review.**
- Daniel's explicit instruction.
- Default for night Pipelines that seed demo data: never clean up at the end. Daniel logs in fresh and verifies manually. Add a DEMO_DATA_MAP.md describing what was seeded.

### COMMUNICATION STYLE PREFERENCES (codify how I talk to Daniel)

**S-001 — Recommendations first, options second. Always.**
- Confirmed multiple times. Daniel does not want a menu of equal options. He wants "my recommendation is X because Y" + then alternatives if he asks.

**S-002 — Plain Hebrew, no technical jargon.**
- Confirmed repeatedly. Schema words (table names, FK relationships, RPC signatures, RLS clauses) belong in files, not chat. Concept names in Hebrew.

**S-003 — Short messages. 4 lines or fewer for most exchanges.**
- Confirmed via tone-corrections. Walls of text are noise.

**S-004 — One question at a time, with a recommendation already attached.**
- Confirmed. Multi-question messages are confusing. Each question = its own message.

**S-005 — Acknowledge mistakes briefly, then move on. No over-apology.**
- Daniel said this implicitly several times today when I corrected myself.
- Default: "צודק, סליחה" once + correction. Not 3 paragraphs of self-analysis.

**S-006 — Show data when claims are made.**
- When I say "X is true," Daniel expects evidence (file path, SQL probe result, commit hash) — not just my word.

**S-007 — Don't auto-execute on Daniel's behalf when permissions are involved.**
- Daniel directly said "תוודא שאין סיכון בהרצת הסקריפט בסופהבייס ותריץ לבד" — meaning he WILL delegate execution to me when the safety bar is clear. But I had to verify safety FIRST and report findings before he authorized.

### STRATEGIC PATTERNS (codify Daniel's strategic philosophy)

**P-001 — SaaS-clean over quick-fix, always.**
- Confirmed when I proposed each "quick fix"; Daniel pushed back when the quick fix would break SaaS-litmus.

**P-002 — בלי פלסטרים (no Band-Aids).**
- Said explicitly during the public-data-layer architecture decision earlier this week.
- Default for architectural choices: the architecturally-correct foundation, even at 4-6× initial cost, beats the patch-now-refactor-later path.

**P-003 — Strategic decisions = Daniel's role. Technical decisions = Architect/Executor's role.**
- Confirmed repeatedly. Daniel doesn't want to be asked about table names, column types, or HTML structure. He decides on user-facing flows, business rules, and architectural philosophy.

**P-004 — Don't escalate tactical decisions when autonomy is granted.**
- Daniel was visibly frustrated when sessions halted on background-process file changes (Sentinel cron files). The skill must distinguish "true escalation" from "polite halt that wastes Daniel's time."

**P-005 — Real-world stress test the architecture during build.**
- Confirmed when Daniel asked for Hoya + Zeiss seeding + multi-flow QA in tonight's Pipeline.
- Default: don't ship a feature without simulating realistic load on it. Smoke 7/7 is necessary but insufficient.

---

## How the Future Autonomous Decision-Maker Skill Uses This

When a SPEC reaches a point where Daniel would normally be asked, the skill consults this decisions log:

1. **Find matching pattern** — search the log for a similar past decision (corrections C-001 to C-006, agreements A-001 to A-007, etc.)
2. **Apply the rule** — use the autonomous-skill-rule line as the decision
3. **Log the decision in EXECUTION_REPORT.md** — "decision X taken autonomously per pattern A-002 from CROSS.md"
4. **Surface only true escalations** — patterns P-004 + C-006 + S-007 + etc. define when Daniel MUST be involved
5. **Update the log if Daniel later corrects** — the skill is self-improving

The skill MUST NOT autonomously decide:
- Anything that touches Prizma tenant data (per C-006)
- Anything that changes the product's positioning in the market (per P-003)
- Anything that contradicts a previously-locked architectural decision without explicit re-opening

---

**End of file. This file should be:**
1. Read by the future "skill-builder" session that creates the Autonomous Decision-Maker skill
2. Eventually consumed into `.claude/skills/opticup-architect/references/decisions/CROSS.md` so the Architect can reference Daniel's patterns when authoring future Briefs
3. Kept in `_archive/architect-pending-entries/` until both above happen
