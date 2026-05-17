# Triage Protocol (project-agnostic)

This file describes the 5-step procedure the Supervisor follows for every
escalation. The procedure references abstract placeholders. The Adapter layer
(`adapters/<project>/decisions-log-paths.md`) resolves placeholders to concrete
paths for the current project.

The Core layer must remain project-agnostic. It must NOT name any specific
project, vendor, business domain, database product, or rule numbering scheme.

---

## Inputs

- A single **escalation file** at a path provided by the originating Pipeline
  skill. The file must conform to `escalation-format.md`.
- The Adapter (`adapters/<project>/`) provides:
  - `<DECISION_LOG_INDEX_PATH>` — index of all canonical decisions.
  - `<DECISION_LOG_DETAIL_DIR>` — directory of per-module decision detail files.
  - `<CONSTITUTION_PATH>` — the project constitution / Iron Rules file.
  - `<ROADMAP_PATH>` — cross-module roadmap + locked decisions list.
  - `<AUTO_MEMORY_PATH>` — auto-memory file (hint source — confidence-capped).
  - `<SUPERVISOR_LOG_DIR>` — directory where daily Shadow / Active logs live.
  - `<HARD_STOP_CATEGORIES>` — list of question categories that ALWAYS escalate.

---

## Step 1 — Parse Escalation

Read the escalation file. Verify it carries every required field per
`escalation-format.md`. If ANY field is missing:

1. Write a response file with:
   ```
   Status: NO_TRIAGE_HARD_STOP
   Confidence: 0
   Cited source: none — escalation format invalid
   ```
   Body explains which field is missing.
2. Append a row to the day's Shadow log with `confidence=0` and reason
   `escalation-format-invalid`.
3. Emit the configured status line `<STATUS_LINE_FORMAT_INVALID>` (defined in the Adapter) to the originating skill.
4. Return. Do not proceed to Step 2.

---

## Step 2 — Hard-Stop Check (BEFORE any search)

Compare the escalation's `Stuck at:` + `Question for Architect:` fields against
the Adapter's `<HARD_STOP_CATEGORIES>` list. If the escalation matches ANY
Hard-Stop category:

1. Write a response file with:
   ```
   Status: NO_TRIAGE_HARD_STOP
   Confidence: 0
   Cited source: <adapter file>#<category-anchor>
   ```
2. Body documents which Hard-Stop fired and why a search is unnecessary.
3. Append to today's Shadow log with `hard_stop=<category>`.
4. Emit the configured status line `<STATUS_LINE_HARD_STOP>` (defined in the Adapter) to the originating skill.
5. Return. Do not proceed to Step 3.

Hard-Stops are absolute. They override the Confidence ladder. The whole point
of a Hard-Stop is that the answer is not the Supervisor's to give regardless
of how many sources point the same way.

---

## Step 3 — Search Canonical Sources (Priority Order)

Iterate the Adapter's priority list. For each source, search for content
matching the escalation's keywords (`Stuck at:` + `Question for Architect:` +
`Options I see:`). Sources are listed in DESCENDING priority — STOP iterating
when the first match yields the highest applicable confidence.

Source order (defined by Adapter):

1. **Decisions-log index** — fast keyword match against 1-line summaries.
2. **Decisions-log detail directory** — full text of per-module decisions.
3. **Constitution file** — project rules.
4. **Cross-module roadmap** — locked decisions list.
5. **Auto-memory** — hint source. **CONFIDENCE-CAPPED at 3** per Adapter rule.
   If auto-memory is the ONLY hit, the confidence cap fires regardless of how
   clear the match feels.

For each candidate hit, capture:
- Source path.
- Entry identifier (date + topic, or rule number, or section anchor).
- Verbatim quote of the relevant text (1–3 sentences).

If no source has a relevant hit → proceed to Step 4 with no candidate and
confidence 1 (genuinely-novel). The response will escalate.

---

## Step 4 — Compute Confidence (1–5 Ladder)

Per the ladder:

- **5:** Exact entry quoted verbatim, situation in the escalation is identical
  to the situation in the entry (not analog — same).
- **4:** Clear entry, situation is close-analog (same domain, same axis).
- **3:** Multiple entries point same direction; no single one is exact. This
  is the cap when auto-memory is the only source.
- **2:** One entry partially applies; significant inference needed.
- **1:** Pattern inferred from multiple weak signals; no single decisive cite.

**Hard rule:** Confidence ≤ 2 → set `Status: SHADOW_PROPOSAL` (or, in Active
mode, still escalate — Active mode does NOT override this) and explicitly
mark `Escalation continues: yes` in the response body.

**Hard rule:** Auto-memory sources are capped at confidence 3 regardless of
clarity. The cap is non-negotiable.

---

## Step 5 — Write Response + Log + Emit Status

### Step 5a — Write the response file

Path: `<escalation-directory>/ARCHITECT_DECISION_{ISO_TS}_{SLUG}.md` where
`{SLUG}` is the escalation's slug (after the timestamp prefix in its filename).

Content shape (see `escalation-format.md` for the canonical headers):

```
# Architect-Decision (Supervisor Triage) — {topic from escalation}

Status: SHADOW_PROPOSAL
Triage-by: <SUPERVISOR_SKILL_NAME>
Triage-at: {ISO_TS}
Source escalation: {relative path to escalation file}
Confidence: {1..5}

Cited source: {path}
Cited entry: {date · topic OR rule reference OR section anchor}

## Proposed resolution
{one paragraph — what the Pipeline should do}

## Reasoning for Pipeline
{one paragraph — short justification with the cite verbatim}

## Resume instruction
{explicit next step — for the originating skill}

## Escalation continues
{yes / no — Shadow mode: always "yes". Active mode: "no" if Confidence ≥ 3
 and no Hard-Stop. Otherwise "yes". "yes" means the originating skill ALSO
 emits its standard escalation line to its dispatcher.}
```

### Step 5b — Append to today's Shadow log

Path: `<SUPERVISOR_LOG_DIR>/shadow-{YYYY-MM-DD}.md`.

If the file does not exist yet today, create it with a header:
```
# Supervisor Shadow Log — YYYY-MM-DD

| Triage-at | Escalation | Confidence | Source | Proposed | Owner-actual | Match |
|-----------|------------|------------|--------|----------|---------------|-------|
```

Append one row per Triage:
```
| {ISO_TS} | {escalation-slug} | {1..5 or 0} | {source path or "none"} | {proposed-slug or "escalate"} | _(blank pending owner)_ | _(blank)_ |
```

Last two columns are filled by the escalation owner's resolution later
(Shadow comparison). The "escalation owner" is the human decision-maker the
originating skill would normally have escalated to in the absence of the
Supervisor; the Adapter specifies who that is for this project.

### Step 5c — Emit configured status line

To the originating skill (the one that wrote the escalation file). The
Adapter specifies the exact format strings for each outcome. Required outcome
classes:

- Resolved (Confidence ≥ 3, no Hard-Stop) — Adapter key `<STATUS_LINE_RESOLVED>`.
- Hard-Stop fired — Adapter key `<STATUS_LINE_HARD_STOP>`.
- Confidence ≤ 2 — Adapter key `<STATUS_LINE_LOW_CONFIDENCE>`.
- Format-invalid — Adapter key `<STATUS_LINE_FORMAT_INVALID>`.

The Adapter MAY localize the status line (Hebrew, English, Spanish, etc.) and
add an emoji prefix per project convention. The Core protocol does not
prescribe a language or prefix.

In Shadow mode (current launch state), the originating skill ALSO emits its
standard escalation line to its own dispatcher after the Supervisor's line.
Both run in parallel during Shadow.

In Active mode (future flip), the originating skill emits the Supervisor's
line ONLY when Confidence ≥ 3 + no Hard-Stop + Status = `ACTIVE_RESOLUTION`;
otherwise the standard escalation line goes to the dispatcher as today.

---

## Failure Modes the Supervisor Must Handle

| Failure | Detection | Response |
|---|---|---|
| Escalation file missing a required field | `escalation-format.md` parser fails | Step 1 invalid path. |
| Two decision entries contradict each other | Step 3 finds 2 entries with opposite recommendations | Confidence drops to 2; escalate; document the contradiction in body. |
| Hard-Stop matches AND a search hit also matches | Hard-Stop wins | Step 2 short-circuits; no Step 3. |
| Auto-memory is the only hit | Step 3 returns AM-only result | Step 4 caps confidence at 3; if cap fires AND no other source → escalate per ladder. |
| Source path in Adapter does not exist on disk | File-not-found at Step 3 | Skip that source; document in response body; if no other source matches → confidence 1. |
| Escalation slug is malformed | Cannot derive `{SLUG}` for response filename | Use a fallback `unknown-slug-{ISO_TS}` and document the issue in the response body. |

---

## Non-Negotiable Rules

1. **Never invent a decision.** If the canonical sources don't cover the
   question unambiguously, escalate. Better to ask than to fabricate.
2. **Never write to the canonical decisions log.** The Supervisor only reads.
3. **Never edit the production branch (e.g., `main`).** The Supervisor never
   touches it directly.
4. **Never perform destructive operations.** No `rm`, no SQL `DROP`, no
   force-push, no rebase. Phase 1 has no destructive paths at all; Phase 2
   may introduce `git reset` to a snapshot tag and only that.
5. **Never auto-apply skill edits.** Even Phase 3 only proposes; the human
   escalation owner approves.
6. **Always log.** Every Triage — resolved or escalated — appends a row to
   today's Shadow log. The learning loop depends on it.

---

*End of Triage Protocol. This file is project-agnostic by contract; the
Reviewer skill must grep this file for any project-specific token before
closing a Supervisor SPEC.*
