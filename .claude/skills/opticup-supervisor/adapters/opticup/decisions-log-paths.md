# Optic Up — Decision Sources (Daniel-Locked 2026-05-17)

This Adapter file resolves the Core protocol's abstract placeholders to
concrete paths inside the Optic Up project. The priority order + confidence
caps below are **Daniel-locked** per Architecture Brief §13 (sealed 2026-05-17)
and are not to be reordered without an explicit Daniel-Architect decision.

---

## Priority order (descending) — search until first qualified match

| # | Source | Path | Max confidence |
|---|---|---|---|
| 1 | Decisions-log INDEX (top-level) | `.claude/skills/opticup-architect/references/DECISIONS_LOG.md` | 5 |
| 2 | Cross-module decisions DETAIL | `.claude/skills/opticup-architect/references/decisions/CROSS.md` | 5 |
| 3 | Per-module decisions DETAIL | `.claude/skills/opticup-architect/references/decisions/M{N}.md` | 5 |
| 4 | Project constitution | `CLAUDE.md` (repo root) | 5 |
| 5 | Cross-module roadmap | `MASTER_ROADMAP.md` (repo root) | 5 |
| 6 | Auto-memory index | `MEMORY.md` under the user's auto-memory directory (machine-local — see §Auto-memory below) | **3** |

Sources 1–5 are **canonical**. The Supervisor may reach Confidence 5 when
any of them is quoted verbatim against an identical situation.

Source 6 (auto-memory) is a **hint source only**. Confidence is capped at 3
regardless of clarity, per Brief §13.1. If auto-memory is the only hit AND
the cap fires, the Confidence-Ladder rule (Brief §12.1: Confidence ≤ 2 →
escalate) does NOT fire (3 > 2) — but the escalation continues anyway
because no canonical source matched. This is intentional: auto-memory
reflects user preferences, not project canon.

---

## Resolved placeholder mapping (Core protocol consumes these)

```
<DECISION_LOG_INDEX_PATH>  = .claude/skills/opticup-architect/references/DECISIONS_LOG.md
<DECISION_LOG_DETAIL_DIR>  = .claude/skills/opticup-architect/references/decisions/
<CONSTITUTION_PATH>        = CLAUDE.md
<ROADMAP_PATH>             = MASTER_ROADMAP.md
<AUTO_MEMORY_PATH>         = MEMORY.md  (machine-local — see §Auto-memory)
<SUPERVISOR_LOG_DIR>       = _archive/supervisor-log/
<SUPERVISOR_PROMOTIONS_DIR>= _archive/supervisor-pending-promotions/   (Phase 3 only)
<SUPERVISOR_SKILL_NAME>    = opticup-supervisor
```

---

## Auto-memory specifics (Daniel-locked confidence cap = 3)

Auto-memory is the project's persistent file-based memory system. Its path
is **machine-local** (it lives under the user's `~/.claude/projects/...`
directory) and **OS-specific**. The Supervisor resolves the path at runtime
from the active session's environment. The Core protocol does NOT inline
machine paths.

Behavior contract:
- **Read-only.** Supervisor never writes to auto-memory.
- **Confidence cap = 3.** Even an exact-quote match in auto-memory caps at 3.
- **Read order.** Auto-memory is consulted ONLY after sources 1–5 have all
  returned no relevant match. It is the last fallback before "no source matched".
- **Path resolution.** The Supervisor checks `MEMORY.md` at the canonical
  location for the current OS / workspace, parses its index, and loads any
  referenced detail files referenced by name. If the file is missing, the
  Supervisor treats it as "no match" — never as an error.

Net effect: auto-memory is a hint source, never a deciding source. If the
canonical decisions log already covers the question → auto-memory is bypassed
entirely.

---

## Search strategy (per source)

The Supervisor uses keyword-based matching with the following grep patterns:

1. **Headings** — match the escalation's `Stuck at:` keyword set against
   markdown headings (`^#+ `).
2. **Topic columns in tables** — match against `| N | date | topic | one-liner |`
   columns in DECISIONS_LOG index.
3. **Rule numbers** — if the escalation cites a rule number (e.g., "is this
   a Rule 21 violation?"), search `CLAUDE.md §4..§6` for that rule.
4. **Section anchors** — if the escalation cites a section (e.g., "is the
   merge-to-main protocol clear?"), search `CLAUDE.md §9` and Architect
   SKILL.md for matching headings.

The Supervisor may use any combination of `grep`, `Read`, and the project's
standard search tools (Glob, Grep) to perform the search. Implementation
details are flexible; the Daniel-locked rules above are not.

---

## Hard-Stop categories (this project's `<HARD_STOP_CATEGORIES>` list)

The Supervisor ALWAYS escalates without searching when the escalation matches
ANY of these. Defined in `skill-destinations.md` §Hard-Stop Reference.

The Adapter does not duplicate the list here to keep the two adapter files
narrowly-scoped. The Core protocol's Step 2 consults `skill-destinations.md`
for the canonical Hard-Stop list.

---

## Status line formats (this project's localizations)

The Core protocol's Step 5c emits a configured status line. For Optic Up
(Hebrew localization, project conventions):

| Outcome class | Adapter format |
|---|---|
| `<STATUS_LINE_RESOLVED>` | `✅ פתור מ-{source-name} entry — proposal: {response-path}` |
| `<STATUS_LINE_HARD_STOP>` | `🛑 Hard-Stop — escalation ממשיכה לבעל-ההסקלציה — proposal: {response-path}` |
| `<STATUS_LINE_LOW_CONFIDENCE>` | `⚠️ Confidence נמוך ({N}) — escalation ממשיכה לבעל-ההסקלציה — proposal: {response-path}` |
| `<STATUS_LINE_FORMAT_INVALID>` | `⚠️ Escalation format invalid — escalation ממשיכה לבעל-ההסקלציה — proposal: {response-path}` |

The `{source-name}` placeholder resolves to a short label per the table at
the top of this file (e.g., `DECISIONS_LOG`, `CROSS`, `M{N}`, `CLAUDE.md`,
`MASTER_ROADMAP`, or `auto-memory`).

The phrase "בעל-ההסקלציה" (escalation owner) is the Hebrew translation of
the Core protocol's "escalation owner" placeholder. For Optic Up, the
escalation owner is the project owner (Daniel) — but the Supervisor does
NOT name the owner in the status line, to keep the line consistent across
mode flips and future ownership changes.

---

## Pending — observed but not yet ingested

The file `_archive/architect-pending-entries/2026-05-17_decisions_log_for_autonomous_skill.md`
(authored by the Architect in a separate Cowork session 2026-05-17 evening)
contains 18 decision patterns (corrections C-001..C-006, agreements A-001..A-007,
communication style S-001..S-007, strategic patterns P-001..P-005) intended
for ingestion into `CROSS.md`.

**The Supervisor does NOT consume this file directly** (Adapter contract: the
Supervisor reads only the 6 sources above). When the Architect ingests the
patterns into `CROSS.md` in a future Cowork session, the Supervisor will pick
them up automatically via the existing source-3 (`CROSS.md`) search.

Until that ingestion happens, the patterns are reachable only by manual
Architect-led decision — not by Supervisor Triage. This is intentional: the
Supervisor must not bypass the canonical-source contract by reading an
unfinalized pending entry.

---

*End of decisions-log-paths.md. Daniel-locked priority order; do not reorder
without an explicit Daniel-Architect decision.*
