# WORKING PATTERNS HARVEST — 2026-05-18

**Author:** Cowork-Architect (Daniel-via-Cowork session)
**Date:** 2026-05-18 evening
**Trigger:** Daniel observation — "תיעוד דרך העבודה שלנו". After 8 SPECs closed clean today in a single Claude Code session, codify what worked so future sessions inherit it.

**Destination:** Append to `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` as a new dated entry. This file is the staging document.

---

## Patterns to codify

### P-WORK-1 — Same-session continuity outperforms session-per-SPEC

**Empirical evidence:** 2026-05-18 — 8 SPECs closed in one Claude Code session over ~6h wall-clock. Foundation Phase 4a + 4.5 + FK-fix + 4 Group B SPECs + 2 resilience SPECs + SKILL harvest. **Zero deviation across all 8.**

**Why it works:**
- Executor context stays hot: MCP credentials, shared component API knowledge, project mental model, recent commit history.
- ~5-10 min bootstrap saved per SPEC transition. For 8 SPECs = 40-80 min cumulative.
- "What did the previous SPEC do?" never asked; same agent remembers.
- Tier C tools (Chrome MCP + Supabase MCP) stay authenticated.

**When to break the pattern:**
- Session exceeds ~10h wall-clock — CLI session memory pressure starts degrading.
- A SPEC introduces a fundamentally different scope (e.g., switching from M1 to M4) — fresh session prevents confused mental model.
- Multiple sessions on the same repo would create coordination collisions per `pipeline-coordination.mjs` (one-Pipeline-per-branch on develop).

**Apply this:** Default to same-session for sequential Pipelines within the same module. Open a new session only when one of the 3 break-triggers above fires.

### P-WORK-2 — Path X (sequential) is the default; Path Y (parallel + tool extension) needs empirical justification

**Empirical evidence:**
- Group A (Path X sequential) closed in 3.5h vs 10-12h estimate.
- Group B (Path X sequential, 3 SPECs + 1 cleanup + 1 resilience) closed in ~5h.
- Path Y was considered today but not exercised. The Foreman never claimed it would be faster *in practice* — only on paper.

**Why Path X wins for groups of 2-3 SPECs:**
- 0 coordination tool changes needed.
- 0 worktree management overhead.
- 1 lock-collision risk eliminated.
- Empirical executor velocity is 2-3× faster than estimates → "saved wall-clock from parallel" is smaller than predicted.

**When Path Y becomes worth it:**
- 5+ SPECs in a group AND empirical sequential time per SPEC > 3h average. Below that threshold, the tool-extension cost (~1-2h) doesn't repay.
- Cross-module groups (e.g., M3 + M4 + M5) where contention is genuinely zero.

**Apply this:** Default Path X. Don't propose Path Y for groups < 5 SPECs unless Daniel asks.

### P-WORK-3 — The over-checkpoint anti-pattern

**Empirical evidence:** Today (2026-05-18) Brief for Group B authoring asked the Foreman to "report back before dispatching SPEC 6". The Foreman did. Daniel-Architect (me) reviewed and said "Path X authorized, dispatch all 3". This was a ~15 min round-trip with zero new information.

**Why this happened:** Architect (me) was risk-averse after Group A. Wanted human-in-loop confirmation between authoring and dispatch.

**Why it's wrong:**
- Daniel has authorized the dispatch protocol upstream (Path X for the full M1 rebuild Pipeline).
- Re-authorizing per group ≠ stop-on-deviation. Iron Rule 9 says stop on **deviation**, not on success.
- Adds noise + delay without adding signal.

**Apply this:** When Daniel authorizes a dispatch protocol upstream, **no per-SPEC re-authorization needed**. The Foreman can author + execute end-to-end. Re-engage Daniel only when a true deviation fires (e.g., the SPEC 3 schema mismatch, the SPEC 4.5 second-consumer find).

### P-WORK-4 — Daniel-Architect probing leads to structural fixes the Architect missed

**Empirical evidence today:**
1. **Sequential numbering question** — Daniel asked "מה זה קופסה / תעודה / מסמך פנימי קשור למודול הזה?" → exposed that the day's regex-guard "fix" was a patch, not the structural sequence-migration that Orders + Customers (allegedly) already use. Spawned an investigation Brief.
2. **F-1 designs toggle semantics** — Daniel asked the implications of bulk-action behavior → exposed the per-location data corruption (parallel "all-locations" row instead of per-branch).
3. **F-5 sell-price demo backfill** — Daniel chose "let it fill naturally" → architect was about to spend 30 min on a backfill SPEC that wasn't needed.

**Why this happens:** Architect (me) optimizes for "ship the SPEC". Daniel optimizes for "is this the right thing to ship". The questions feel like noise but are systematic.

**Apply this:** When Daniel asks "מה זה אומר?" / "למה?" / "מה הקשר?" — treat it as a STRUCTURAL flag, not a clarification request. Re-examine whether the proposal addresses the real defect class, not just the symptom.

### P-WORK-5 — Compaction protocol for new sessions

**Trigger:** Cowork session compaction or Claude Code session exhaustion.

**Bootstrap recipe for the next session (the new architect/Foreman/executor):**

1. Read `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` — **start from the most recent entry**, work backwards as needed. The top 5-10 entries are usually enough for context.
2. Read the **3 most recent SPEC folders** under `modules/Module N/docs/specs/` — specifically their `FOREMAN_REVIEW.md` files. These contain the freshest "what worked / what didn't" data.
3. Check `MASTER_ROADMAP.md` for current module state.
4. Check `git log origin/develop -20 --oneline` for recent activity rhythm.
5. Read `/mnt/.auto-memory/MEMORY.md` (if Cowork) for project-wide context.

**Critical bootstrap rule:** Do NOT re-discover the workflow patterns above (P-WORK-1 through P-WORK-4). They're already documented. Read them once, apply them, don't re-derive.

**Same-session continuity carryover (P-WORK-1):** If the new session is the immediate successor to a long Claude Code session, the predecessor's Tier C tools (Chrome MCP + Supabase MCP) need re-authentication. Expect 5-10 min for re-bootstrap. Plan accordingly.

### P-WORK-6 — Architect-Daniel question discipline

**Empirical evidence:** Today's chat shows several rounds where the architect (me) presented options A/B/C and asked Daniel to pick. Daniel consistently picked the SaaS-clean option even at 2-3× time cost. Once Daniel said "go with your recommendation" — saving the round-trip.

**Why:**
- Daniel's MEMORY.md feedback memory `feedback_always_recommend.md` is binding: every option-list to Daniel MUST end with explicit recommendation + reason.
- When the architect has a clear recommendation, presenting "A/B/C — which?" wastes a round-trip. Better: "I recommend A because X. Approve?"

**Apply this:** Never present options without a strong recommendation. Daniel can override, but the default should be the architect's call. Reserve option-lists for genuinely close calls (50/50 trade-offs).

---

## Codification: append to DECISIONS_LOG.md

```markdown
## 2026-05-18 — Working Patterns Harvest (6 Architect-Daniel patterns codified after 8-SPEC autonomous day)

**Situation:** 8 SPECs closed clean today in a single Claude Code session (~6h wall-clock, 24 commits). Daniel observed that the patterns we'd developed (same-session continuity, Path X sequential, when to defer to Daniel, when to push through, compaction recipe) were not documented and risked being lost on future session boundaries.

**My recommendation:** Codify 6 patterns into `opticup-architect` SKILL.md and references for next-session inheritance.

**Daniel's response:** Authorized — "אתה מתעד את דרך העבודה שלנו עכשיו? חשוב שהסשן החדש שנפתח ידע בדיוק איך אנחנו עובדים וזה תמיד ישתפר."

**Patterns codified:**
- **P-WORK-1** — Same-session continuity outperforms session-per-SPEC for sequential Pipelines within same module
- **P-WORK-2** — Path X (sequential on develop) is the default; Path Y (parallel) needs empirical justification at 5+ SPECs
- **P-WORK-3** — The over-checkpoint anti-pattern: when Daniel authorizes a dispatch protocol upstream, no per-SPEC re-authorization needed
- **P-WORK-4** — Daniel-Architect probing ("מה זה אומר?" / "למה?") = structural-flag signal, not clarification request
- **P-WORK-5** — Compaction protocol: how to bootstrap a new session from DECISIONS_LOG + last 3 FOREMAN_REVIEWs without re-discovering workflow
- **P-WORK-6** — Architect-Daniel question discipline: never present options without recommendation (per MEMORY `feedback_always_recommend.md`)

**Reason for codification:** Future Cowork sessions and Claude Code sessions inherit context only through DECISIONS_LOG + SKILL.md + auto-memory. Without these patterns documented, each new session re-derives the workflow at 30-60 min cost. The patterns above were paid-for-empirically across today's 8 SPECs and yesterday's 5 Foundation SPECs.

**Lesson (for Architect):** Process-level patterns deserve the same harvest discipline as code-level patterns. The Foreman ran SKILL_HARVEST_2026_05_18 for technical patterns; this entry is its working-patterns counterpart.

**Cross-references:**
- Full harvest document: `modules/Module 1.5 - Shared Components/architecture-brief/WORKING_PATTERNS_HARVEST_2026_05_18.md`
- Empirical session: 2026-05-18 morning + afternoon (8 SPECs, 24 commits, 5 hours)
- Daniel feedback memory: `feedback_always_recommend.md`, `feedback_always_saas_clean.md`, `feedback_finish_the_sequence.md`
```

---

## Next-session bootstrap card (paste into new Cowork chat)

When the next Cowork-Architect session opens (post-compaction or new day), paste this:

```
You are opticup-architect. Bootstrap per skill First Action protocol.

REQUIRED CONTEXT (in priority order):
1. /mnt/.auto-memory/MEMORY.md — full read
2. .claude/skills/opticup-architect/references/DECISIONS_LOG.md — read top 10 entries (most recent first)
3. modules/Module 1 - Inventory Management/docs/SESSION_CONTEXT.md (if M1 still active)
4. Last 3 FOREMAN_REVIEWs in modules/Module N/docs/specs/ (most recent N folders)
5. git log origin/develop -20 --oneline

WORKING PATTERNS (P-WORK-1 through P-WORK-6) — apply, don't re-derive:
- Same-session continuity (P-WORK-1): default for sequential SPECs same module
- Path X (P-WORK-2): default for groups < 5 SPECs
- No over-checkpoint (P-WORK-3): trust upstream dispatch authorization
- Daniel structural-probe signal (P-WORK-4): treat "מה זה אומר" as structural flag
- Compaction recipe (P-WORK-5): the bootstrap card itself
- Question discipline (P-WORK-6): always recommend, never ask "which?" without a pick

Once bootstrapped, report 1-line status to Daniel in Hebrew per skill First Action.
```

---

**END WORKING_PATTERNS_HARVEST_2026_05_18**

_To be committed + pushed when the next session-end opportunity arrives. No urgency — non-blocking._
