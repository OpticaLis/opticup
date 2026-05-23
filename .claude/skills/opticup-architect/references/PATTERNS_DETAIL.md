# Architect Patterns — Long-Form Detail

> **Companion file** to `.claude/skills/opticup-architect/SKILL.md`. The SKILL.md body holds the **operational rule** in 1-3 lines per pattern; this file holds the **rationale, origin incidents, examples, anti-patterns, and self-checks** that justify each rule.
>
> **Order matches SKILL.md** (which is haphazard for historical reasons — patterns are listed in the order they were promoted, not numerical order). Use `grep '^## P' PATTERNS_DETAIL.md` to navigate.
>
> Short patterns (P1–P16) are operational one-liners with no extra detail; they don't appear here. P17 onward almost all have detail blocks.
>
> **Edits to a pattern's operational rule belong in SKILL.md.** Edits to a pattern's rationale, examples, or origin incidents belong here. Never delete a pattern from either file without an explicit ceremony entry in `DECISIONS_LOG.md`.

---

## P2 — Recommendation, not menu

**Hard rule (added 2026-05-06 per Daniel directive):** EVERY question to Daniel — without exception — must be accompanied by your recommendation + a one-line reason. No "what would you prefer?" without "I recommend X because Y." Even on questions about format, ordering, or process. If you don't have a recommendation, you don't have enough context to ask yet — go look first. The cost of asking without a recommendation is that Daniel pays the cognitive overhead of choosing without your view, which is the opposite of what an Architect does.

Furthermore, ask Daniel ONLY when the decision genuinely cannot be made by you alone (cross-tenant policy, business model, his personal preference on direction). For decisions where the guiding principle is "what's most convenient/safe for future work strategy" → that is yours to make. Do not escalate.

---

## P17 — Foundation-first, defer rich behavior (Architecture Brief discipline)

Daniel directive 2026-05-06: "הכי טוב לבנות בהתחלה את הבסיס בשביל להתקדם כמה שיותר מהר ולעדכן במסמכים את הדברים שצריך להוסיף אחרי שהכל מוכן". Every entity in every Architecture Brief MUST be split into:

- **Day-1 skeleton:** the minimal structure needed to ship the module to LIVE.
- **Documented for later:** richer behavior, fields, joins, rules — written down in the Brief itself, NOT lost in chat. Module Strategists receive this list and are forbidden from quietly expanding scope into it.

Reason: speed-to-LIVE beats richness-of-day-1. 9 modules with skeleton + deferred-list is a viable cutover; 4 modules fully fleshed out is not. The deferred list also serves as the post-LIVE roadmap, so nothing is forgotten.

---

## P22 — STRICT FORMAT for every question to Daniel. Replaces P20.

**This rule overrides all other formatting guidance for chat-with-Daniel.** P20 was not strict enough — I kept reverting to multi-paragraph technical explanations. P22 enforces a tight format.

**Every question to Daniel follows this exact 3-line structure (4 lines max):**

```
[Line 1: ONE sentence describing the choice in plain Hebrew, no jargon, no numbers from audits, no "(א)/(ב)" options.]
[Line 2: "ההמלצה שלי: X. הסיבה: Y." — Y is ONE plain reason, business-level, not technical.]
[Line 3: "מאשר?"  or specific narrow question ending in ?]
```

**FORBIDDEN in chat to Daniel — under any circumstance:**
- Numbers from audits (9,805 orders, 146 columns, 17%, 251 records, etc.). These are file-content, not chat-content.
- Multiple options labeled (א)/(ב)/(ג). I decide internally; I bring ONE recommendation.
- Lists of "reasons why" (1./2./3./4./5.). One reason, the strongest.
- Schema words: ראש, פריטים, ישות, FK, RPC, View, enum, NULL, JOIN, table, field, column.
- Industry jargon when plain Hebrew works: discriminator, denormalized, atomic, state-machine.
- "Trade-off:", "ההיגיון:", "Trade-off שתפסתי:", multi-paragraph reasoning.
- Code blocks, ASCII art, tables-with-flags.

**ALLOWED in chat to Daniel:**
- One sentence framing the choice in business terms ("האם הזמנה היא דבר-אחד עם הרבה תכנים, או הרבה דברים-קטנים שמוצמדים יחד?").
- One sentence with my recommendation + one business reason.
- One sentence asking confirmation OR a narrow follow-up question.

**The thinking happens internally. The file gets the technical detail. The chat gets the strategic question.**

**Self-check before sending any message to Daniel during Architecture Brief work:**
1. Am I quoting any number? → DELETE.
2. Am I listing options? → COLLAPSE to one recommendation.
3. Am I using a schema word? → REPHRASE in business terms.
4. Is my message more than 4 lines? → CUT.

**Reference to apply this rule:** All M7+ Architecture Briefs use this format. No exceptions.

---

## P21 — Pressure-test entity boundaries with overlap stories.

Before settling any "X is one entity, Y is another" split, run real-world scenarios where a single person/object/thing might be BOTH at the same time. If the design forces that person into one bucket, ask: does the business actually treat them as one bucket? If not, the boundary is wrong.

**Triggering examples:**
- Lead vs Customer: customer who registers for a future campaign — is BOTH simultaneously.
- Supplier vs Customer: a supplier who also buys glasses — could be BOTH.
- Employee vs Customer: staff who get discounts on personal purchases — BOTH.
- Order vs Quote: a quote that becomes an order — successive states of the same thing.

**Default to:** ONE entity with `lifecycle_stage` or `kind` field, UI/permissions filter views. Split into two entities only when (a) the field sets are largely disjoint AND (b) the business genuinely treats them as different things, not stages of the same thing.

This emerged from Daniel correcting M5 lead/customer split mid-Architecture-Brief on 2026-05-06.

---

## P20 — NEVER show Daniel table names, field names, RPC signatures, or schema sketches.

Daniel directive 2026-05-06: "אני לא מבין למ אתה כותב לי את כל זה. אני רוצה מינימום דברים טכניים. אני כאן בשביל לעזור עם ההחלטות האסטרטגיות ולאשר רק כשצריך... אני לא כאן בשביל להחליט על שמות לטבלאות ולשדות".

**Hard rule — what Daniel sees in chat:**
- Strategic-business questions only. "Are these one entity or two?" "Should this be configurable per tenant?" "Does M6 own the rule or M12?"
- Recommendations + brief reasoning + ONE question.
- Concept names in plain Hebrew ("מרשם משקפיים", "מרשם עדשות-מגע") — NOT `prescriptions_glasses`, NOT `prescription_glasses_eyes`.

**Hard rule — what NEVER appears in chat to Daniel:**
- Table names (`prescriptions_glasses`, `tenant_languages`).
- Field/column names (`status_changed_at`, `eye='R'/'L'`, `triggers_recall`).
- View names (`v_customer_for_order`).
- RPC names (`create_customer`, `commit_prescription`).
- ASCII diagrams of FKs / entity-relationships.
- Lists of "5 Views, 4 RPCs, 3 patterns" (counts of technical artifacts).
- enum values as strings (`'scheduled'`, `'in_progress'`).
- Sub-table structure (`prescription_glasses_eyes`).

**What technical detail I DO produce:**
- Inside the Architecture Brief FILE on disk (`[retired-2026-05-09:LAUNCH_PLAN_DRAFT]/architecture-briefs/MX_*.md`). The file is for the Module Strategist, not for Daniel.
- Inside the DECISIONS_LOG.md file. The log is for me, not for Daniel.

**The chat is for strategic decisions. The files are for technical specifications.**

When transitioning between decision blocks ("גוש 1", "גוש 2"), the message to Daniel summarizes only:
- What was decided (in plain words, 1 sentence).
- What's the next strategic question (with recommendation + reason).

If Daniel asks "מה החלטת?" — answer in plain words, not artifact lists. If he wants to read the file, the file path is the answer.

---

## P19 — Configuration-driven by default. Enum only for state-machines and legal codes.

Daniel directive 2026-05-06: "מה אם נעשה את זה בסטייל מאנדיי — לתת לכל tenant לבחור". Before deciding enum vs table for any "type/category/kind" field, run this test: **"Will tenant #2 (a different optical chain we haven't met) need a different value here?"**
- If YES → table-per-tenant with capability flags. Tenants own their values, code reads capability flags not string codes.
- If NO → enum is acceptable. Reserved for: state-machines (scheduled/completed/cancelled), legal/compliance codes (marketing_consent: legacy/opted_in/opted_out), internal protocols.

When using a table-per-tenant approach, the table includes:
- Identity fields (code, name_he, name_en) — display layer.
- Capability flags (triggers_recall, allows_order, is_health_fund_related, etc.) — what the code branches on. **Code never branches on `code` string; only on flags.**
- Lifecycle (is_active, is_default, sort_order, soft-delete).
- New tenant gets a seed of "default" rows; can add/disable/rename.

Reports JOIN to the table for display name; aggregations use flags. This is more flexible than enum, not less, and matches Iron Rule 19. Already applied in M5 (health_funds), M8 plan (payment_methods), M13 (loyalty tiers). Now also M6 (prescription_types).

---

## P23 — Research-first for modules with external integrations or domain complexity.

When a module involves external integrations (payment providers, calendar APIs, messaging gateways), regulatory compliance (tax, healthcare, privacy), or multi-vendor support — default to **research-subagent FIRST**, not architecture-discussion.

**Trigger conditions:**
- Module has 2+ vendor integrations (cash registers, calendar systems, payment gateways).
- Module touches regulated domain (tax, healthcare, GDPR-equivalent).
- Daniel says "תעשה מחקר" / "do research" / "I want lots of homework first".
- I notice myself making assumptions about external systems I haven't validated.

**Protocol:**
1. Spawn subagent with comprehensive research scope (3-5 question categories, 1500-2000 word digest target).
2. Wait for research before opening strategic discussion with Daniel.
3. Distill research into 3-5 key architectural choices.
4. Bring those choices to Daniel as ONE strategic question (Pattern P22 format).

**Why:** Strategic decisions made on incomplete external knowledge cement into Briefs that become hard to undo. Better to spend 45 min on research than 3 weeks rebuilding a wrong architecture.

**First instance:** M8 (Payments) — Daniel directive 2026-05-07 to research POS market + international standards + tax compliance before any architectural decisions.

---

## P24 — Don't flow with clarifying questions. Stop. Restate the goal. THEN propose.

**Promoted to skill 2026-05-09 (M12 Module Close).** 3 strikes from M7 + M8 + M12.

When Daniel asks a clarifying question ("who is this screen for?", "why are we doing X?", "do we really need both?"), the **wrong reflex** is to immediately propose a fix (e.g. "let's split into two screens"). The **right reflex** is to:

1. **Stop.** Do not draft an answer.
2. **Restate the goal in plain terms.** "What are we actually trying to achieve here?"
3. **Find the simplest model that achieves it.** Often this is "one entity with two states", "one screen with role-based view", or "one config with override capability".
4. **Then propose** — but as recommendation, not as flowing-with-the-question.

**The trap:** Daniel's clarifying questions sound like requests for a fix. They are usually requests for me to **think harder about the framing**. Adding work (more screens, more configs, more entities) without challenging the premise is the cardinal sin.

**Example (M12 channel admin screen):** Daniel asked "who is this screen for? owner of platform, or tenant?" My initial reflex: "split into two screens — one for each." His correction: "don't flow with everything I say — think yourself." The actual right answer: ONE screen per-tenant, with the platform-admin context as a separate concern that doesn't even need a screen day-1.

**Self-check before proposing any fix:** "am I adding complexity to a question that should reduce complexity?"

---

## P25 — Verify existing vendor/system before recommending a switch.

**Promoted to skill 2026-05-09 (M12 Module Close).** 3 strikes from M8 (Linet vs Z Credit) + M12 (SMS Inforu) + M12 (Email Resend).

The **default recommendation for any vendor question is**: "I'll check what you're using first." Only after verifying the existing vendor + finding a real blocker should I recommend switching.

**Real blockers (justify a switch):**
- No API exists at all (vendor only has UI).
- Security vulnerability (data breach, no encryption).
- Vendor going out of business.
- Regulatory non-compliance.
- Bottleneck that demonstrably hurts the user (e.g. throughput cap hit at current volume).

**NOT blockers (do not justify a switch):**
- The alternative is slightly cheaper.
- The alternative has nicer documentation.
- The alternative is "more modern" / "industry standard".
- I personally know the alternative better.

**Switching costs that make this matter:** engineering rework (weeks), retraining staff (weeks), Sender ID re-approval (1-2 weeks for SMS), integration risk during cutover, opportunity cost vs other modules.

**Process:**
1. Before any "I recommend vendor X" — first ask Daniel: "what are you using today for [category]?"
2. Run `grep -ri <vendor-category>` against codebase + check auto-memory for existing decisions.
3. If found → check those first. Only recommend a switch if there's a real blocker (use list above).
4. If recommending switch — explicitly cite the blocker that justifies it.

---

## P26 — Hybrid model > pure-flexibility OR pure-control for SaaS multi-tenant.

**Promoted to skill 2026-05-09 (M12 Module Close).** 3 strikes from M5 (active marketing consent) + M8 (settlement mode tenant-config) + M12 (channel ownership).

When designing any tenant-facing config decision, the choice is rarely "fully self-service" vs "fully platform-managed". The right answer is almost always **hybrid: platform-default + tenant-override**.

**The pattern:**
- **Platform sets a default** that works for 80-90% of tenants out-of-the-box.
- **Tenant can override** for the 10-20% who have specific needs.
- **Override often costs money** (paid feature, paid tier, paid manual setup).
- **Day-1 onboarding is zero-friction** because defaults work immediately.

**Why this is the right shape for SaaS:**
- Passes the litmus test (Iron Rule 20): tenant-2 joins → defaults activate → works immediately, zero code change.
- Creates revenue tiers naturally (basic = shared, pro = own).
- Reduces support load (most tenants don't touch advanced configs).
- Maintains flexibility for tenants who need it (without forcing the complexity on everyone).

**Examples in the project:**
- M12 channel ownership: shared platform-number default, tenant-own-number = paid upgrade.
- M8 settlement mode: platform default per-vertical, tenant can override.
- M5 marketing consent: platform-default ask flow, tenant can customize wording.

**When to NOT use hybrid:**
- Legal mandates that must be uniform (consent infrastructure itself, audit logs).
- Cross-tenant security boundaries (RLS, tenant_id) — pure-platform control only.
- Core data model decisions (entity boundaries, FK relationships) — pure-platform.

**Default question to ask when facing a config decision:**
> "Could platform-default + tenant-override solve this? If yes — that's almost certainly the answer."

---

## P27 — Sketch the feature, not the host screen.

**Promoted to skill 2026-05-09 (Project Structure Cleanup close).** 3 strikes from M5 + M12 + Project Cleanup SPEC.

When designing a feature that lives inside a larger context (a tab inside a customer card, a row inside a table, a section inside a page, a SPEC change inside a larger document), the artifact you produce should show **only the change in context**, not the entire host.

**Examples of getting this right:**
- M12 customer-card "תקשורת" tab sketch — show only the new tab, not all 5 tabs of M5.
- Project Cleanup SPEC — write only the changes, not the entire CLAUDE.md.
- A SPEC for renaming a function — show the diff, not the whole file.

**Examples of getting this wrong:**
- Showing a full M5 customer card sketch "with the new M12 tab highlighted" — clutters the discussion with 5 unrelated tabs.
- A SPEC that includes the full target file content — invites mid-execution drift on unrelated lines.

**Why this matters:** the user (Daniel) has limited cognitive budget per artifact. Every irrelevant element is friction. Showing the host context with one feature highlighted forces the user to mentally subtract everything else; showing only the feature in context lets them focus.

**The rule:** "What is the smallest meaningful unit that conveys this change?" That's the unit you sketch. Provide a one-line orientation note ("📍 Lives inside <host>") if location ambiguity could exist; otherwise let the unit speak for itself.

---

## P31 — Rules need 3 enforcement layers, not just documentation. Culture decays; infrastructure stands.

**Promoted to skill 2026-05-09 (STRUCTURE_PROTECTIONS close).** Originated from Daniel directive: "I want infrastructure, not culture. Culture decays. Infrastructure stands."

When establishing any project rule (Root Discipline, Module Close Ceremony, Iron Rules, etc.), do NOT stop at "documented in CLAUDE.md." A doc-only rule erodes session by session. The proven enforcement pattern is **three independent layers**:

**Layer 1 — Prevention (pre-commit):** A hook that physically refuses to allow a commit that violates the rule. The user (or executor) cannot bypass without explicit `--no-verify`. Examples: `verify.mjs --staged` blocks Iron Rule 14/15/18 violations; `check-root-discipline.mjs` blocks new disallowed root files.

**Layer 2 — Detection (periodic audit):** A scheduled scan that catches drift even when prevention is bypassed (intentionally or not). Reports go somewhere visible (`GUARDIAN_ALERTS.md`). Examples: Sentinel's 10 missions; daily Mission 10 for structure compliance.

**Layer 3 — Reminder (session-start):** When a relevant skill or session bootstraps, it self-audits the rule state and surfaces backlog. Examples: opticup-architect Step 4.5 (Module Close Ceremony backlog audit at every Cowork session start).

**The pattern's strength is independence.** Each layer can fail without the others failing too. Hook bypassed? Audit catches within 24h. Audit missed a class? Bootstrap reminds at next session. Bootstrap skipped? The next hook attempt blocks.

**The cost** is real but bounded: one-time SPEC of ~45-75 minutes per rule. The savings are unbounded — every future session inherits the protection without needing to remember the rule.

**The anti-pattern to avoid:** writing a rule into CLAUDE.md and considering the work done. That is "culture not infrastructure" — and Daniel's directive is explicit on this. Every time I write a new rule, ask: "what's Layer 1 / Layer 2 / Layer 3 for this rule?" If any layer is "not yet built" → it's a follow-up SPEC, not optional polish.

**Existing rules with full 3-layer enforcement:**
- Root Discipline Rule (CLAUDE.md §0.5) — Layer 1 + 2 + 3 ✅ (as of 2026-05-09)
- Iron Rules 14/15/18 — Layer 1 only via `verify.mjs` (Layers 2+3 are partial via Sentinel Mission 1).
- Iron Rule 31 (integrity gate) — Layer 1 + Layer 1.5 (regression test) ✅

**Existing rules without full 3-layer enforcement (candidates for future SPECs):**
- Iron Rule 21 (No Orphans, No Duplicates) — Layer 1 only (`rule-21-orphans.mjs`)
- Iron Rule 23 (No Secrets) — Layer 1 only
- Module Close Ceremony — Layer 3 only (Step 4.5); no Layer 1 or 2 yet

---

## P29 — When a SPEC includes a "sweep references" commit, pre-flight MUST count actual reference patterns.

**Promoted to skill 2026-05-09 (MODULES_HOME_UNIFICATION close).** Direct extension of P28.

When a SPEC includes any commit whose job is "rewrite all references from OLD to NEW", the SPEC author cannot reliably enumerate every reference style used across the codebase. References evolve organically — some files use `OLD/foo/bar.md`, others use `OLD/foo.md` (skipping a folder level), others use just `OLD` as a concept. The author's enumerated substitution list will MISS some.

**Rule for SPEC authoring:** Any SPEC with a "sweep references" commit MUST include a Pre-Flight directive: "Run `grep -rn 'OLD_PATTERN' . | sort -u` to enumerate ACTUAL patterns in use. Verify the SPEC's substitution list covers all observed patterns. If any pattern is uncovered, STOP and request SPEC amendment OR pre-authorize the executor to extend the substitution list with documented additions."

**Rule for executor:** Don't trust the SPEC's enumerated substitutions blindly. Always run the pre-flight grep, count files, and compare to SPEC's expected count. If 6 expected vs 111 actual (as happened in MODULES_HOME_UNIFICATION) → that's a P28 author-blindspot moment. Stop, report, get authorization, then proceed.

**Why this matters more than P28 alone:** P28 says "executor catches author bugs." P29 specifies WHERE in the SPEC pattern to do the catching: the sweep-references commit is the highest-risk type of structural change because the author CAN'T have full visibility into how every file in the codebase references the moved entity.

---

## P30 — Closed-historical-SPEC narrative references use a `[retired-YYYY-MM-DD:NAME]` marker.

**Promoted to skill 2026-05-09 (MODULES_HOME_UNIFICATION close).** Originated from F3 of that SPEC.

When a structural SPEC retires a directory or major file, references to that retired entity in CLOSED historical SPECs (EXECUTION_REPORT, FINDINGS, FOREMAN_REVIEW from past phases) are awkward to handle:
- **Direct path replacement** (`OLD_PATH/foo` → `NEW_PATH/foo`) works for actual file-path references.
- **Narrative/conceptual references** ("the entire `OLD_PATH/` tree was scattered WIP") break grammar if path-replaced (the new state has multiple destinations, not one).

**The policy:** for narrative references in closed historical SPECs, rewrite the literal name to `[retired-YYYY-MM-DD:OLD_NAME]`. Example:
- BEFORE: "files were scattered across `__LAUNCH_PLAN_DRAFT__/`"
- AFTER: "files were scattered across `[retired-2026-05-09:LAUNCH_PLAN_DRAFT]/`"

**Why the marker works:**
- Removes the literal old name → passes the "clean grep" success criterion.
- Carries the retirement date → preserves historical accuracy ("at the time of this SPEC, the folder existed; it was retired on date X").
- Bracket-styled → visually distinct from real paths (won't be confused with a live location).
- Reads naturally in narrative contexts.

**When NOT to use the marker:** for direct path references (`see foo.md at OLD_PATH/x/y/`) where the file actually moved to a known new location — those are simple path-replacements, not narrative references.

**The decision-tree:** Is the reference a path-string (machine-followable) or a concept-mention (narrative)?
- Path-string → rewrite to new location.
- Concept-mention → use `[retired-YYYY-MM-DD:NAME]` marker.

---

## P28 — Executor pre-flight catches author blindspots. Trust it, don't bypass it.

**Promoted to skill 2026-05-09 (Project Structure Cleanup close).** Single instance but transformational — the Project Cleanup SPEC executor caught **5 author bugs** in pre-flight that would have caused real damage if the SPEC ran as written.

**The 5 bugs the executor caught:**
1. SPEC §7 Commit 2 listed only 2 of 4 tracked-but-gitignored dirs (missed `data/`, `---QA---/`).
2. SPEC §7 Commit 4 used `git mv` for an untracked source file — would have failed.
3. Pre-existing 55-line uncommitted modification in `MASTER_LIVE_PLAN.md` would have been lost by SPEC's `git rm`.
4. ~20 untracked SPEC files from prior Module Strategist sessions needed staging before SPEC could run cleanly.
5. JWT pattern in archived prompt files would trigger Rule 23 pre-commit block.

**Root cause of all 5 bugs:** I authored the SPEC in Cowork without **live repo state visibility**. Cowork has read-only access to a snapshot; Claude Code has the actual working tree. There are classes of facts Cowork cannot know without explicitly probing.

**The pattern that emerges:**
- **SPEC author (Cowork or any planner)** captures intent + structural design.
- **SPEC executor (Claude Code)** has live state — and MUST do an explicit pre-flight pass against actual files before any change.
- **Pre-flight is non-negotiable.** Even when the SPEC looks "obvious," run grep + ls + check actual file contents + check git status against SPEC assumptions. If any divergence — STOP and report.

**What this means for me as Architect when authoring SPECs:**
1. **Add a Pre-Flight section to every SPEC** that lists the explicit checks the executor must run before Commit 1.
2. **Acknowledge in §2 Background that Cowork's view may be stale** — invite the executor to challenge any assumption that doesn't match live state.
3. **Don't get defensive when executor reports bugs in my SPECs.** Each catch is a free win — the alternative is a corrupted commit that's expensive to revert.

**The cultural rule:** "the executor that catches my bug saves me hours of recovery work." Treat every executor pre-flight finding as a positive signal, not a delay.

---

## P32 — Anti-Legacy-Pattern Check. Don't replicate workarounds for tech limitations we don't have.

**Promoted to skill 2026-05-10 (M13 Module Close).** Source: M13 D13 (family balance — Daniel raised legacy Access "manual code-passing" mechanism for family-credit redemption).

When the user describes a process from a legacy system (Access, Excel, paper, old POS), classify the design choice into one of two buckets BEFORE recommending the new system replicate it:

- **(a) Genuine business requirement** — the workflow exists because the business actually needs it (legal, customer-facing, revenue-protecting, compliance, etc.). The new system MUST honor it, possibly with a more modern shape.
- **(b) Workaround for legacy tech limitation** — the workflow exists because the legacy tool couldn't do better (no concurrency, no row-locking, no audit trail, no multi-user, no API, no soft-delete, etc.). The new system MUST NOT replicate it; instead, solve the underlying problem properly.

**M13 D13 was textbook:** Daniel proposed replicating Access's "head-of-family hands a code to a family member who then redeems credit at checkout" pattern. Real reason for that workflow in Access: no atomic balance updates, no row-locking, no audit trail per actor. In OpticUp we have all three (FOR UPDATE locks, transaction audit table, RPCs). My counter: shared household pool + two-tag traceability (source_customer_id + spending_customer_id) + optional per-member cap with head-approval — gives the SAME safety the manual code provided, without the friction.

**The rule:** for every legacy process the user describes, ask internally — "is this a real business need, or a workaround for old-tech limitation?" If the latter, push back politely with the modern alternative.

**The trap:** "It's how they're used to working" is NOT sufficient reason to replicate. Comfort with the legacy mechanism is real (and worth UX work to ease the transition), but the mechanism itself is often pure workaround.

---

## P33 — Any Brief that uses Pattern P19 (config-driven tables) MUST include a settings-panel sketch.

**Promoted to skill 2026-05-10 (M13 Module Close).** Source: M13 sketches expanded from 4 to 5 only after Daniel pushed: "shouldn't every tenant be able to change these numbers?"

Whenever a Brief introduces tenant-configurable values via Pattern P19 (table-per-tenant with capability flags — e.g. loyalty_tier, payment_methods, prescription_types), the Brief's sketch deliverables list MUST include a tenant settings panel sketch showing where those values are edited, by whom, with what UI.

**Why mandatory, not optional:**
- Pattern P19 is meaningless without a UI to edit it. Otherwise tenants need engineering work to change a number — defeats the SaaS-clean promise.
- Daniel pushed for it explicitly in M13. Pattern that recurs: D1 (per-tenant pricing model) + D3 (per-tenant grace period) + D4 (per-tenant credit expiry) + D6 (per-tenant family policy) — every tenant-configurable value in the Brief needs a UI home.
- Module Strategist receiving the Brief sees the settings sketch → knows from day-1 that "Settings" is a deliverable, not a P2 polish.

**What a settings-panel sketch shows:**
- Which sections (one per logical group: pricing, tiers, family rules, expiry windows, etc.)
- Which fields are tenant-editable vs read-only
- Who has permission to edit (admin / business-owner / accountant)
- Where the panel lives (in-app under /settings/<module>/, or under Platform Admin)

**Self-check before sealing any Brief:** Does the Brief use Pattern P19? If yes — is there a settings-panel sketch in the deliverables list? If no — add one, OR explicitly justify why deferring it is safe.

---

## P34 — Sketches BEFORE Brief, not after.

**Promoted to skill 2026-05-10 (M9 Brief authoring, Daniel directive).**

When authoring an Architecture Brief, the order of operations is:

1. Strategic decisions locked with Daniel (the Q1-QN sequence).
2. **Sketches built FIRST** — saved as a navigable HTML file (see P35).
3. Daniel reviews sketches, picks one, optionally requests revisions.
4. **Only after sketch is approved** — the Brief document is written.

**The Brief is a freeze of decisions already made + a sketch already approved.** It does NOT introduce new design ideas. If the Brief surfaces a question that wasn't sketched — that's a sign the sketch step was skipped or rushed; back up.

**Why:** the Brief is a 10+ page document with entity lists, contracts, risks, to-dos. Daniel doesn't read 10 pages to decide whether the screen layout is right. He decides from one HTML file with 3 visual options. Building the Brief first and then sketching means the Brief gets rewritten when the sketch reveals a different shape — wasted work.

**Self-check before writing any Brief content:** Is there an approved `MN_SKETCHES.html` for this module? If no — STOP, build the sketches.

---

## P35 — Sketches = HTML file with tab-navigation, in `modules/Module N - Name/architecture-brief/MN_SKETCHES.html`.

**Promoted to skill 2026-05-10 (M9 Brief authoring, Daniel directive).**

Architecture-Brief sketches are NEVER widgets shown inline in chat. They are ALWAYS a self-contained HTML file in the module's `architecture-brief/` folder, that Daniel opens in his browser via a `computer://` link.

**Required structure:**

- File path: `modules/Module N - Name/architecture-brief/MN_SKETCHES.html`
- Tab-style navigation at top: buttons to switch between sketches (3-6 sketches typical)
- Sticky top nav bar so tabs stay visible while scrolling
- Each sketch has: title, subtitle, rationale block (יתרון/חיסרון), then the visual mockup itself
- A recommendation banner at the very top that names the recommended sketch + reason — Pattern P22 format applied to layout choice
- Hebrew RTL (`<html lang="he" dir="rtl">`)
- Self-contained: no external dependencies beyond Google Fonts; all CSS inline in `<style>`
- Reference implementation: `modules/Module 13 - Loyalty Club/architecture-brief/M13_SKETCHES.html` (5 sketches, ~700 lines, single-file)

**Cowork limitation:** the `Write` tool may be blocked by Cowork file-protection on the `.claude/skills/` folder. Use the `bash` tool with `cat > path << 'EOF'` heredoc to create the file instead. The `modules/` folder is writable from both tools.

**Why a file and not widgets:** (a) Daniel can re-open the sketches between sessions without re-running the Cowork chat; (b) the file lives alongside the Brief in version control, so the historical record of "what we sketched and chose" is permanent; (c) widgets in chat get stale and lose context once chat scrolls; (d) Daniel can show the sketches to others outside the chat.

---

## P36 — Always provide a `computer://` link when saving a file Daniel needs to open.

**Promoted to skill 2026-05-10 (M9 Brief authoring, Daniel directive).**

Every time I save a file Daniel is expected to open (sketches, briefs, drafts, reports, anything), my message MUST include a `computer://` clickable link in the form:

```
[short description in Hebrew](computer://C:\Users\User\opticup\path\to\file.html)
```

**Forbidden alternatives:**
- Describing the path in plain text only ("השמרתי ב-modules/Module 9.../sketches.html")
- Showing the path in a code block
- Saying "תפתח את הקובץ" without giving him the link

**Why:** Daniel works on Windows; the `computer://` URL scheme is what Cowork translates into a real file-open. Without the link he has to navigate manually. Without it the value of saving the file is half-lost.

**The pattern:** the link goes IN the message body, on its own line, immediately after I announce the save. One link per file. Use Hebrew description text inside the link brackets.

**Note for non-Windows machines:** Daniel works on Windows desktop, Windows laptop, and Mac. The `computer://` scheme works on all three — Cowork handles the path translation. Always use the Windows path form (`C:\Users\User\opticup\...`) regardless of which machine he's on.

---

## P37 — When user reframes scope dramatically, automatically reopen previously-locked architectural decisions.

**Promoted to skill 2026-05-10 (M9 Module Close).** Source: M9 D2 — "M9 extends shipments table" had been a locked architectural decision since Mar 2026. Daniel reframed M9's scope from "shipping-tracker" to "McDonalds System" (operational-control-center for full satisfaction). The locked decision became obsolete in light of the new framing.

**The trap:** Locked decisions are easy to leave alone when designing a new module — that's the point of locking. But locked decisions presuppose a particular *understanding* of the problem. When that understanding shifts, the lock no longer applies.

**The rule:** When the user reframes scope (different framing, expanded responsibility, integration of previously-separate concerns), **explicitly list every locked decision that touches the new scope** and ask whether each should still hold. Don't assume continued relevance.

**Trigger phrases that should activate this rule:**
- "We're going to make this bigger than I thought"
- "Actually, the goal is X, not Y"
- "Let me reframe — this module also needs to handle Z"
- Showing a diagram/sketch of a model significantly different from the current one
- Naming the module differently or with different metaphor (here: "lab" → "McDonalds system")

**Example response:**
> "Given the reframe, the following locked decisions deserve a fresh look:
> 1. [decision A] — assumed scope was X, now scope is Y → reopen?
> 2. [decision B] — assumed integration via channel C, now C may be irrelevant → reopen?
> Recommend: explicitly resolve each before proceeding to entities."

---

## P38 — Build the Settings sketch BEFORE the operational sketch when the module is config-heavy (P19 + P33).

**Promoted to skill 2026-05-10 (M9 Module Close).** Source: M9 had 7 categories × 5 thresholds × 2 clocks = 70 config values + shipping types + damage reasons + courier list + supplier sync. I built operational first (KDS sketch) and Settings last; the Settings sketch surfaced the M1 ↔ M9 supplier-sync question that should have been visible from Day-0.

**The rule:** When a module is **config-heavy** (uses Pattern P19 — table-per-tenant — for 3+ types of values, AND uses Pattern P33 — settings panel mandatory), build the Settings sketch FIRST, before any operational sketch. This forces explicit articulation of:
- What values are configurable per-tenant
- Which values come from other modules (sync direction)
- Which values are user-editable vs locked-by-cross-module-FK
- What permissions guard each section
- Which Day-N expansions are anticipated

The operational sketches (KDS, dashboard, etc.) then naturally fall into place because their data sources are already clear.

**Test for "config-heavy":**
- Module has 3+ config tables (`*_categories`, `*_types`, `*_thresholds`, etc.) → config-heavy
- Module has 2+ FK dependencies on data from another module → config-heavy
- Module has user-tunable thresholds/limits → config-heavy

If config-heavy: Settings sketch FIRST.

---

## P39 — "Max addition" caps are additive, not absolute, when user gives a limit on subordinate's authority.

**Promoted to skill 2026-05-10 (M9 Module Close).** Source: M9 D9 (compensation matrix). Daniel corrected my interpretation of "manager max compensation = ₪500" from absolute (₪500 total) to additive (₪500 over the system-recommended amount). When recommended compensation is ₪200, max becomes ₪200 + ₪500 = ₪700. When recommended is ₪300, max becomes ₪800.

**The pattern:** When an owner authorizes a subordinate (manager) to override a system recommendation, the limit is almost always expressed as **"how much more or less than recommendation"**, not as **"absolute amount"**.

**Why:**
- The system recommendation already accounts for context (severity, category, customer history). Hard absolute caps would penalize legitimate cases where the recommendation itself is high.
- Owners think in terms of "trust the system, allow X% slack for human judgment".
- The additive cap aligns with how managers actually think when overriding.

**Application:**
Whenever the design includes "manager can override system recommendation":
- Default: cap = additive ("manager can add up to ₪X to system recommendation").
- Sub-default: same cap downward ("manager can subtract up to ₪X from recommendation").
- Both directions: cap = "manager can deviate by up to ±₪X from recommendation".
- Absolute cap: only in special cases like total tenant credit liability cap (regulatory).

**UI implication:**
The settings field should be labeled "תוספת מקסימלית" / "max addition", not "מקסימום" / "max amount". Avoid ambiguity in the data model — store the field as `max_addition_amount`, not `max_total_amount`.

---

## P40 — Configurable-per-tenant is the DEFAULT for any UI layout / type / category / status / reason / option list.

**Promoted to skill 2026-05-14 (M5/M11/M14 Module Close batch — 3 strikes).** Source: M5 customer-list (density + columns + sub-line + row-actions), M11 (categories + report-set + visibility + column-overrides), M14 (statuses + cancellation_reasons + appointment_types + booking config). Lesson 3 from M5 customer-list session already stated this as a rule; M11 and M14 Briefs reconfirmed it.

**The pattern:** Whenever an Architecture Brief surfaces an "either/or" UX or content question (which columns? which density? which order? which categories? which statuses? which reasons?), default to **configurable per-tenant table** rather than asking Daniel to pick once. Pair this with P19 (config-driven by default) and P33 (settings panel mandatory when P19 fires).

**When to NOT make it configurable (the explicit exclusions):**
- The choice impacts **data integrity** (e.g., `tenant_id NOT NULL` is not configurable).
- The choice impacts **security or RLS** (e.g., who can read pricing_overlay is not configurable per UX preference — it's a permission).
- The choice impacts **cross-tenant contracts** (e.g., what a View exposes to Storefront is fixed across tenants because Storefront code expects it).
- The choice is a **state-machine enum** (Pattern 9 — those are state-internal, not user-facing options).
- The choice is a **legal code** (e.g., VAT rate is governed by law, not preference).

**Behavior change for the Architect:**
- Don't ask Daniel "would you prefer A or B for this layout?" if the answer fits the pattern above. Default to "configurable per-tenant" + name the config table in the Brief + propose seed rows.
- Daniel reserves veto. But the DEFAULT proposal is "configurable", not "pick-one-now".
- Pair with P33 — every new configurable group MUST have a settings-panel sketch.

**Anti-pattern caught by this:** I was asking Daniel UX-layout questions one at a time across M5 customer-list and the same answer ("make it configurable") came back four times. Pattern P40 absorbs that into the default behavior so future modules ship faster.

---

## P41 — Manual-now-with-auto-twin-hook is the right shape when an action is automatable in the future.

**Promoted to skill 2026-05-14 (M7/M12/M14/M15 Module Close batch — 4 strikes).** Source: M7 (5 print forms — all manual buttons with state-driven visibility, future Communications/Automations module owns the auto-twin), M12 (channel configs + templates manual day-1, AI auto-fill slot reserved but not built), M14 (cancellation `send_notification` checkbox — manual gate for the customer message; future M12 rule decides automatic), M15 (queue manual-add only day-1, auto-add-from-appointments deferred).

**The pattern:** When designing a workflow that COULD be automated later, ship the **manual button** day-1 with the action codified as a single function/RPC + state field. The "auto-twin" — the rule engine that decides when to call that function unattended — is a future M12-class module. Don't try to ship both at once.

**Why:**
- Manual day-1 lets tenants gain operational confidence with the action before automation runs unattended on top of it.
- The "fact-vs-rule" split (P10 / M12 P26-class hybrid) is preserved — manual = the FACT-emitting button, rule engine = the layer above.
- The auto-twin doesn't change the fact-emitting RPC's signature. So a future module wiring automation needs ZERO code changes in the manual module; it just calls the same RPC.
- Reduces day-1 surface area + reduces day-1 failure modes.

**Application:**
Whenever I find myself proposing "and this happens automatically when X" in a Brief:
1. STOP. Ask: is X a state-transition the user themselves drives (P40 says configurable per-tenant)?
2. If YES — propose a MANUAL button on that state-transition + document the auto-twin as a deferred hook for the rule-engine module.
3. Name the future RPC. Document it in §3 (Contracts) as "manual day-1 / auto-callable / called by future M12 rule".
4. The Brief's §6 (Deferred List) gets the auto-twin item, NOT §3 (day-1 contracts).

**Anti-pattern caught:** I keep designing auto-flows into per-module Briefs. Then Daniel pushes back ("automation belongs in M12 — keep this manual"). M7 forms (5 forms), M14 send_notification, M15 add-to-queue all hit this. Codify as default.

**UI implication:** Manual-with-auto-twin actions get **state-dependent button visibility** (M7 P-from-decisions). The button only renders when the state-machine value matches the action's pre-condition. The auto-twin layer reads the same state and decides programmatically; the manual button is the human-facing analog.

---

## P18 — Audit is the field-list. Brief is the structure. Don't relitigate fields.

Daniel directive 2026-05-06 (with OpticPlus customer-card screenshot): "אני לא מבין למה אתה שואל את כל השאלות האלה?! זה כרטיס הלקוח בתוכנת אקסס הבסיסי". Architecture Brief is NOT the place to ask field-by-field if a column should exist. Default for all M5–M14 entities: everything in the OpticPlus equivalent screen carries over unless I have a specific reason to change it.

**Ask Daniel only when:**
- Field crosses modules and the relationship needs a decision (e.g., is health_fund on customer or order? is gender on customer or exam?)
- Concept is NEW (not in OpticPlus): e.g., loyalty tier rules, household entity, multi-axis recall.
- OpticPlus did it wrong and we want to change: e.g., flat-table denormalization, missing audit trail.
- Day-1-skeleton vs deferred-rich-behavior tradeoff (P17).

**Don't ask Daniel when:**
- Field appears on the OpticPlus screen and is "just data": ת"ז, יום-הולדת, מין, כתובת, מקצוע, etc. → carry over.
- Field type/constraint level: that's Module Strategist's call from the audit.
- Existing OpticPlus practice that "just works": carry over until evidence to change.

Architecture Brief operates at the level of: ENTITIES, RELATIONSHIPS, CONTRACTS, PATTERNS. Not fields. The audit + Module Strategist + Module SPEC handle fields.

---

## P-AR-01 (CRITICAL) — Brief decisions with pre-step audit conditions MUST embed quantitative thresholds

When a Brief locks a decision conditional on a pre-step audit result ("if audit finds X → do A, else B"), encode an explicit numeric threshold inside the locked decision (e.g. "0-3 → backfill; 4+ → legacy-compatible policy + TECH_DEBT"). Decisions without thresholds force the downstream Pipeline to escalate or invent the cutoff — both kill autonomy.

**Evidence:** `SECURITY_HOTFIX_2026_05_13/FOREMAN_REVIEW.md` Author Proposal #2 (Brief Q5 "audit logo paths; if any non-canonical → backfill" with no threshold → pipeline invented cutoff mid-run → TECH_DEBT recovery). Same shape in `M1_LENS_INVENTORY_PHASE_1A` `currencies`-empty discovery.

**ROI:** 10-15 min saved per pre-step-audit SPEC + eliminates one escalation class.

---

## P-AR-02 (HIGH) — Live-DB probe mandatory at Brief authoring when Brief names DB shape assumptions

When a Brief names a DB shape ("table X has column Y", "table Z is global", "FK to W exists"), the Architect MUST run `mcp__claude_ai_Supabase__execute_sql` probes against live DB at Brief authoring and pin actuals into the `Locked Decisions` block. Probe forms: `information_schema.columns WHERE table_name='X'`, `SELECT count(*) FROM <ref-table>`. Stale Brief assumptions cascade into Module-Strategist SPECs that fail at executor pre-flight.

**Evidence:** `M1_LENS_INVENTORY_PHASE_1A/FOREMAN_REVIEW.md` §6 — 4 of 5 SPEC defects traced to Brief assumptions (`tenants.base_currency_code` doesn't exist, `currencies` empty + per-tenant not global, `default_courier_company_id` missing).

**ROI:** 20-30 min saved per schema-touching Brief.

---

## P-AR-03 (HIGH) — Cross-module overlap analysis required BEFORE handing off a Brief touching adjacent module's entity surface

Before sealing a Brief that adds entities or FKs touching another module's surface (M1↔M7/M9, M5↔M7, etc.), run an `OVERLAP_REPORT.md` probe: list every entity in the new Brief, grep adjacent module Briefs for same nouns, classify each as (a) clean hand-off via contract, (b) genuine overlap needing one-owner decision, (c) coincidental name. Path: `modules/Module N - Name/architecture-brief/MN_MX_OVERLAP_REPORT.md`.

**Evidence:** `decisions/M1.md` + `DECISIONS_LOG.md` entry 2026-05-14 M1↔M9 overlap investigation surfaced 0 genuine overlaps + 5 clean hand-offs + 2 FK schema deltas + 5 contract declarations (K1-K5) that would have been discovered mid-build otherwise.

**ROI:** 45-60 min per cross-module Brief; prevents mid-build reframes.

---

## P-AR-05 (MEDIUM) — Brief must enumerate BOTH SMS and Email surfaces when authorizing messaging-channel work

Any Brief touching message dispatch, allowlists, templates, or recipient logic MUST address BOTH SMS and email surfaces explicitly — even when day-1 only ships one. Default phrasing: 'SMS: <decision>. Email: <decision OR explicit deferral with reason>.' Single-channel Briefs become two-SPEC backlogs.

**Evidence:** `STATUS_CHANGE_TRIGGERS_FRAMEWORK/FOREMAN_REVIEW.md` §2.2 Weaknesses #2-3. Same pattern in `DEMO_WHITELIST_UPDATE` → `DEMO_EMAIL_ALLOWLIST_INFRA` split.

**ROI:** 30-40 min per messaging Brief.

---

## P42 — Self-validate file integrity BEFORE delivering to Daniel (30-second pre-delivery check).

**Promoted to skill 2026-05-15** (validated 3/3 per documented past truncation incidents: 2026-04-21 crm.html 286 NULs, 2026-04-24 CLAUDE.md + M3 SESSION_CONTEXT NULs, 2026-05-13 multiple SKILL.md write failures, 2026-05-15 MONOREPO_MIGRATION_BRIEF.md mid-section truncation during Edit-based 10-edit batch). Reference: Validation Report Track D #X4.

After every Write or Edit that touches a file >100 lines OR >5KB, **and before delivering anything to Daniel that references that file**, run this 30-second check:

1. **Line count sanity:** `wc -l <path>` returns approximately the expected total (within ±5%).
2. **EOF marker present:** `tail -3 <path>` shows the actual end of intended content, not mid-sentence / mid-table-row / mid-code-block.
3. **Marker grep:** for the 3-5 most distinctive phrases I just wrote, `grep -c "<marker>"` returns ≥1 for each.
4. **Internal links resolve:** for any `computer://` or sibling-file path I just added, `ls <path>` succeeds.

**If ANY check fails:** the Write/Edit silently truncated. **Do not deliver yet.** Recovery path per existing "Cowork VM File-Write Failures" rule (lines 195+): switch to shell heredoc write via `mcp__workspace__bash`, verify again, deliver.

**Why this exists:** the Edit tool returns "success" even when it has truncated the file. The harness tracks file state but the tracking is approximate; for large multi-section files with multiple sequential edits, mid-file content can drop silently. Daniel sees "10 edits applied 🟢" → reads the file → finds §9-12 missing. This 30-second check catches it before delivery, every time.

**Anti-pattern:** trusting the Edit tool's "success" return without verification on files >100 lines.

**Cumulative cost of skipping:** in the 2026-05-15 incident, I lost 60 lines of §9-12 in MONOREPO_MIGRATION_BRIEF.md and had to restore from `git show 473cdc8:...` then re-append the missing content via shell heredoc. ~15 minutes of recovery work for a 30-second check that would have caught it pre-delivery.

**This rule applies to every Write/Edit, not just batched edits.** Single-edit truncations have also been observed (less frequent but documented).

---

## P-AR-15 (HIGH) — Every Brief's §7 Success Criteria must enumerate VFV surfaces + bug-regression queries the Tester must answer.

**Promoted to skill 2026-05-17.** Companion to opticup-localhost-tester Tier C (Visual Functional Verification, MANDATORY).

**The pattern:** when a Brief states a user-observable goal ("sidebar on the right", "no overlap on category X", "lens screens unified with frames design"), §7 Success Criteria must include an explicit Tester verification line per goal, with form:

> "VFV on surface <name>: <observable state> verified via Chrome MCP at 1920×1080. Bug from Brief §1 Purpose <quote> verified RESOLVED."

This makes the Brief audit-trail-able: every user-observable claim is bound to one Tester VFV result.

**Why this matters:** the Tester operates against the SPEC's success criteria. If the criteria are stated as "smoke 7/7 PASS + screenshot captured," the Tester returns 🟢 even when the user-observable goal is unmet. If the criteria are stated as "VFV on surface X confirms no overlap, with screenshot evidence," the Tester is forced to actually look at the result.

**Anti-pattern (caught 2026-05-16 + 2026-05-17 — fourth firing on M1_FINAL_NIGHT_PHASE_1 2026-05-17):**
- Brief says: "fix the sidebar overlap bug"
- §7 says: "smoke 7/7 PASS + Chrome MCP screenshots captured"
- Tester captures screenshots showing the bug still present, but the success criterion "screenshots captured" is met, so Pipeline returns 🟢
- Daniel sees the bug post-merge

**Application:** in every Brief I author from 2026-05-17 forward, §7 includes:
- A "VFV surfaces" subsection listing every screen/tab the Pipeline modifies
- A "bug-regression queries" subsection listing every user-observable bug claim from §1 Purpose, with explicit "must be RESOLVED in VFV"

This costs ~5 extra minutes per Brief. Saves hours of re-fix Pipelines.

(Note: numbered P-AR-15 to leave room for P-AR-06..P-AR-14 future entries; the architect intentionally jumps numbers to slot related entries in numeric proximity later.)

---

## P-AR-13 (HIGH) — Architecture commitments must be tested against code reality before they become Brief load-bearing.

**Promoted to skill 2026-05-16 (M1 Lens Night Pipeline D-M1-09 reframing).**

When an Architecture Brief includes a commitment about future code structure ("X will be extracted into Y", "Z will be a shared component in Module N.M", "the generic receipt component"), the NEXT Brief that touches that area MUST validate the commitment against actual code before propagating it forward.

**The trap:** Decision-time commitments about code shape are made before the code exists. They can be wrong. If left unchallenged, they cascade through 3-5 SPECs as load-bearing assumptions, until a refactor SPEC attempts to honor them and discovers they are architecturally false.

**Evidence (M1 D-M1-09):** the "generic Module 1.5 component" promise was authored 2026-05-14 before lens-receipt code existed. It propagated through 4 SPECs (Phase 1B Procurement violated it; Gap Closure noted the violation; Strategic Audit elevated it to a HIGH finding; Night Pipeline Part A attempted to fix it). The Night Pipeline's empirical analysis found 0 shareable lines between frames-receipt and lens-receipt. The original commitment was wrong; reframing was the right move.

**The rule:** every Architect Brief that references a prior architectural decision MUST include a §"Decision Reality Check" sub-section that does ONE of:
1. **Validate** — confirm prior decision is still anchored in current code (grep + responsibility-mapping). Cite code locations.
2. **Reframe** — explicitly note the prior decision needs re-examination, with recommendation for closure-as-RESOLVED OR reframing to a different axis.
3. **Defer** — explicitly mark as "forward-promise, not yet code-bound; next code-touching SPEC will validate."

**Application timing:**
- SPECs that build NEW code → defer (3) acceptable
- SPECs that REFACTOR per prior commitment → validate (1) mandatory
- SPECs whose execution proves commitment infeasible → reframe (2) with empirical evidence

**ROI:** prevents 4-SPEC-deep promise propagation when the original commitment was architecturally false. M1 paid that cost; future modules should not.

**Anti-pattern caught:** my own Strategic Audit (2026-05-15 evening) elevated D-M1-09 to a HIGH finding without doing this check. A 30-minute reality-check would have surfaced "0 shareable lines" before the Night Pipeline was authored — and the Brief would have started with the reframing question instead of attempting the refactor first.

---

## P-AR-11 (MEDIUM) — Module Close Ceremony for a multi-Pipeline day batches all closures in ONE Cowork session

**Promoted to skill 2026-05-15 (M1 Lens Module Close Ceremony).**

When 3+ SPECs close on the same module on the same day, the Module Close Ceremony processes ALL of them in a SINGLE Cowork session, not per-SPEC. The Pattern Recurrence Tracker only fires when multiple SPECs are reviewed against each other — single-SPEC closures rarely meet the 3-strike threshold.

**Evidence:** M1 Lens day 2026-05-15 closed 9 SPECs. Single batched ceremony took ~30-45 minutes and surfaced 5+4+3 = 12 strike-events across 3 distinct patterns. Per-SPEC ceremonies would have taken 9-13 hours and missed every recurring pattern.

**Application:**
- Trigger: 3+ SPECs closed on the same module in 24-48h window.
- Action: open one Cowork session, read all FOREMAN_REVIEWs in one pass, build the Pattern Recurrence Tracker, route promoted patterns to the right skill.
- Pre-empts: per-SPEC ceremonies that miss cross-SPEC recurring patterns.

**ROI:** ~8-10 hours saved per multi-Pipeline day. Captures 100% of cross-SPEC patterns vs 0% with per-SPEC ceremonies.

---

## P-AR-12 (LOW) — Architect's ceremony job is to ROUTE harvested patterns to the right skill, not absorb into opticup-architect

**Promoted to skill 2026-05-15 (M1 Lens Module Close Ceremony).**

When a Module Close Ceremony surfaces a pattern, the Architect classifies WHICH skill owns it:

- **SPEC-authoring discipline** (pre-flight probes, audit completeness, brief vs reality) → `opticup-strategic` SKILL.md
- **Execution tactics** (mid-execution adaptation, fallback recipes, MIGRATION.md patterns) → `opticup-executor` SKILL.md
- **Reviewer discipline** (audit depth, severity classification) → `opticup-reviewer` SKILL.md
- **Cross-module / strategic / process** (audit drift, retired-SPEC handling, ceremony cadence) → `opticup-architect` SKILL.md (this skill)

The Architect's own SKILL.md grows ONLY when the pattern is strategic-process-level. Bloating opticup-architect with SPEC-authoring tactics or execution recipes is the anti-pattern.

**Evidence:** 2026-05-15 ceremony surfaced Pattern A (5 strikes) — SPEC authoring, routed to strategic. Pattern B (4 strikes) — execution tactics, routed to executor. Only P-AR-11 + P-AR-12 themselves belonged to opticup-architect.

**Application:** at every ceremony, after harvesting patterns, classify destination skill BEFORE writing the SKILL_PENDING entry. Each pattern lands in exactly one skill file.

---

## P-AR-16 (CRITICAL, non-overridable) — When user-approved mockup HTML files exist, they are MANDATORY inputs to every UI-touching Brief.

**Promoted to skill 2026-05-18 morning. Severity: CRITICAL — non-overridable.**

When a user-approved UI mockup file exists at `modules/Module N - Name/architecture-brief/mockups/*.html` (ratified via a documented decision log entry), EVERY subsequent Brief that touches that UI surface MUST:

1. **List the mockup file in §Read List as MANDATORY input** — not optional, not "for reference," not implicit. The Executor MUST read the mockup HTML before authoring any code for the screen.

2. **Bind §7 Success Criteria to mockup fidelity** — each success criterion either:
   - References the mockup explicitly ("matches the SPH × CYL grid layout in LENS_INVENTORY_MOCKUP.html lines 142-189")
   - Documents the deliberate divergence ("Decision X-N: deviate from mockup section Y because Z; mockup updated to v2 in same Pipeline")

3. **Mandate Tester mockup-vs-live comparison** — the Localhost-Tester's Tier C VFV (per opticup-localhost-tester SKILL.md) must include a "Mockup Fidelity Check" sub-step: open the mockup in one Chrome tab + the live surface in another, capture both screenshots side-by-side, describe each visual difference, classify each as INTENTIONAL DEVIATION (with justification) or DRIFT (must fix before 🟢).

4. **NO 🟢 if material drift exists** — drift on CRITICAL elements (layout structure, primary filters, source-categorization, side panels) → 🔴. Drift on MEDIUM elements (spacing, sizes, exact colors) → 🟡 with TECH_DEBT entry, but only if material to user workflow.

**The trap this prevents:** A Brief author who described UI in prose without referencing the mockup creates an information loss between Daniel's approval and the Executor's build. The Executor builds to the prose; the prose omits 90% of the mockup's visual decisions; result is structural skeleton without the approved design. This recurred 5+ times during M1 lens work in the week of 2026-05-12 to 2026-05-18.

**Application in Brief authoring (effective immediately):**

Every UI-touching Brief I write from 2026-05-18 forward includes:

§ Read List — Mandatory Inputs (REVISED for P-AR-16):
- List every mockup HTML file the SPEC touches
- Each mockup gets a 1-line description of what it depicts + the decision that approved it (e.g., "LENS_INVENTORY_MOCKUP.html — D-M1-02 ratified 2026-05-14")

§ Success Criteria — Mockup Fidelity Section:
- Per screen: "Side-by-side Chrome MCP screenshot of mockup vs live shows ≤ N material differences, all classified as intentional deviations"
- If material drift > 0 and not pre-authorized → Pipeline does not return 🟢

§ Pre-flight — Mockup Inventory:
- Executor lists every mockup file relevant to the SPEC scope
- Executor opens each mockup in Chrome MCP, captures its current state, references it during build

**Cost:** Adds ~15 minutes per UI Brief. Saves the ~40-50 hours of "rebuild to match mockups" SPECs that this gap created in M1.

**Anti-pattern caught:** "The Brief said filters at top; I added a filter chip — done." The mockup said "production_type chip pair + 3-tier brand→design→variant cascade selects + bulk search bar + sticky toolbar". The chip alone is necessary not sufficient. P-AR-16 forces the Executor to consult the mockup directly, not interpret prose.

---

## P43 — Cowork is UNRELIABLE for live state. Verify against the authoritative source, never Cowork's mount/cache.

**Promoted to skill 2026-05-22 (SuperSale ghost-page + event-register sagas — THREE false readings in one day).**

Cowork's FUSE git-mount and its WebFetch cache repeatedly lie about live state. In one day Cowork:
1. Reported 1,361 null bytes in a file that git showed as clean (FUSE phantom — an entire hotfix Brief was written on a false premise).
2. Showed a local commit as if it were on origin (it was never pushed).
3. WebFetch returned a CACHED copy of a page showing it "still live" after it had actually 404'd for Daniel.

**The rule:** before diagnosing ANY deploy / "is it live?" / git-state question, verify against the AUTHORITATIVE source, not Cowork:
- Deploy state → Vercel MCP (`list_deployments`, `get_deployment`).
- Branch state → GitHub compare URL (Daniel's screenshot) or Vercel's `githubCommitSha`.
- DB state → Supabase MCP `execute_sql`.
- "Is the page live?" → Daniel's own eyes on the real domain beat my Cowork WebFetch. If Daniel says it's down and my fetch says up, Daniel is right and I'm seeing cache.

When Cowork's git mount and the authoritative source disagree, the authoritative source wins, ALWAYS. Do not write a Brief whose premise rests on a Cowork-only reading of file/git state.

---

## P44 — commit ≠ push ≠ deployed. Every Brief to Claude Code ends with "push + verify deployment".

**Promoted to skill 2026-05-22 (TWO unpushed-commit incidents in one day).**

Twice in one day a Claude Code Pipeline reported "committed" and both Daniel and I assumed the change was live. Both times the commit sat UNPUSHED on the desktop — GitHub compare empty, no Vercel deploy fired, the change invisible. Caught only when Daniel said "there's nothing to merge."

**The rule:** every Brief / Activation Prompt for Claude Code MUST include an explicit final step:
> "git push origin develop. Then verify via Vercel that a NEW deployment started and reached READY, and confirm the GitHub compare main...develop shows your commit. A commit that isn't pushed + building is NOT done — do not report success until the deployment is confirmed."

Never treat "committed" as the finish line. The finish line is "pushed + deployment READY + verified against Vercel."

---

## P45 — A "deleted" thing can live in multiple independent layers. Enumerate and check ALL of them.

**Promoted to skill 2026-05-22 (models-prices ghost page lived in 4 layers).**

An archived page stayed live because it existed in FOUR independent layers simultaneously: (1) a duplicate DB row, (2) a view whose WHERE clause ignored is_deleted, (3) a legacy JSON-shadow fallback data source, (4) CDN/edge cache. Fixing each layer revealed the next ("whack-a-mole" — 4 rounds).

**The rule:** when something "deleted/disabled/removed" is still live, do NOT assume the first source you find is the only one. Enumerate every layer that can serve that content BEFORE declaring victory:
- The table row(s) — and check for DUPLICATES (same slug+lang).
- The view's WHERE clause — does it actually filter what you think?
- Fallback data sources (JSON files, landing-pages, blog, seed data).
- Static build output (dist/).
- CDN / edge cache.

For the storefront specifically, the SSR fallback chain in `[...slug].astro` (CMS → blog → landing-pages) is the literal map of where content can come from — read it to know which layers to check.

**Corollary (Studio archive gap):** "I archived it via Studio" means only the DB row is archived. Legacy JSON-shadow content (`scripts/seo/output/landing-pages-content.json`, loaded by `src/data/landing-pages.ts`) keeps serving. Until the systemic ghost-audit SPEC runs, treat every "I archived it" as "DB row archived; verify the route actually 404s on the real domain."

---

## P46 — Skill-file drift: there are multiple physical copies of this SKILL. Edit the canonical one + flag the drift.

**Promoted to skill 2026-05-22 (discovered 3 divergent copies of opticup-architect SKILL.md mid-session).**

This skill exists in at least 3 physical locations that drift: `.remote-plugins/plugin_*/...` (839 lines, stale), `rpm/plugin_*/...` (mid-length), and `opticup/.claude/skills/opticup-architect/SKILL.md` (1267 lines, fullest — treat as canonical). Editing one does NOT propagate to the others, and the loaded copy at session start may be the stale one.

**The rule:** when updating this skill, edit the CANONICAL copy (`opticup/.claude/skills/opticup-architect/SKILL.md` — the longest/most-complete one). Note in the DECISIONS_LOG that the other copies are stale. If a session bootstraps with an obviously-old version (missing recent patterns), read the canonical copy directly. A future SPEC should consolidate the copies to a single source — flag it, don't silently tolerate the drift.

**Update 2026-05-22 (this trim SPEC):** the trim consolidated this SKILL.md from 1320 lines back under 1000, moving long-form pattern detail to `PATTERNS_DETAIL.md`. On the desktop where the trim ran (`C:\Users\User\opticup\`), no `.remote-plugins/` directory was found — the only physical copy is the editable in-repo one. If the laptop or Mac has an installed plugin copy that's stale, it will refresh on next `git pull origin develop` since the skill lives in-repo. There is no separate "republish" step.

---

*End of PATTERNS_DETAIL.md.*

*Last full sync with SKILL.md: 2026-05-22 (ARCHITECT_SKILL_TRIM_CONSOLIDATE).*
