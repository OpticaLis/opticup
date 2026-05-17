# Escalation File Format (project-agnostic)

This file defines the required shape of any escalation file the Supervisor
consumes. It is project-agnostic: no project names, no rule numbers, no
domain-specific patterns.

The Supervisor's Step 1 (Parse) reads an escalation file and validates it
against this format. Missing fields invalidate the escalation; the Supervisor
writes a `Confidence: 0` response and the originating skill handles the
escalation as today.

---

## File location convention

Escalation files live in a per-module `escalations/` directory adjacent to the
module's source files. The Adapter (`adapters/<project>/`) may specify a
different convention; the format requirements below are independent of
location.

Naming convention (recommended, not enforced by this file): `{ISO_TS}_{TOPIC_SLUG}.md`
where `{ISO_TS}` is a sortable timestamp (e.g. `2026-05-17T1945Z`) and
`{TOPIC_SLUG}` is a short snake_case description.

When the Supervisor resolves an escalation, its response file is a SIBLING
to the escalation: `ARCHITECT_DECISION_{ISO_TS}_{TOPIC_SLUG}.md` in the same
directory, preserving the timestamp + slug for cross-reference.

---

## Required fields

Every escalation MUST carry these fields. The Supervisor's parser checks for
each. Order does not matter; presence does.

### Header
```
# Escalation: {one-line topic in plain language}
```

### Metadata block (any order, key:value lines)
- `Created by:` — name of the originating skill (e.g. the executor or reviewer skill name for this project).
- `Created at:` — ISO timestamp.
- `SPEC:` — relative path to the active SPEC.md, or the literal `N/A`.
- `Status:` — initial value `OPEN`.

### Body sections (heading + content)

- `**Stuck at:**` — ONE sentence stating where the Pipeline halted.
  Examples (style): "phase / SPEC SLUG / commit hash — one line, plain text".
- `**What I tried:**` — bullet list (1–3 bullets, one short sentence each)
  describing approaches the originating skill already considered or attempted.
- `**Options I see:**` — 2–4 named options. Each option has:
  - `**Option A — {short name}.** {one-line description} _Pros:_ {1-2 words} / _Cons:_ {1-2 words}`
- `**My recommendation:**` — ONE option from the list + ONE sentence why.
- `**Question for Architect:**` — ONE sentence ending in `?`. Single, narrow,
  decision-shaped.

### Footer block (filled later)
The escalation file SHOULD reserve space at the bottom for the resolution to
be appended (by the escalation owner or by the Supervisor). Suggested template:

```
---

## Architect Decision (filled in on resolution)

**Resolution:** {one line — chosen option or new option entirely}
**Reasoning:** {1-2 lines}
**Resume instruction:** {explicit next step}
```

This block is OPTIONAL at write time and OPTIONAL after resolution (the
resolution may instead live in the sibling `ARCHITECT_DECISION_*.md` file,
which is the canonical resolution artifact). The escalation file's
filename gains an `RESOLVED_` prefix once a resolution is finalized.

---

## Validation rules (Supervisor Step 1)

The Supervisor's parser walks the file and verifies:

1. The header line matches `^# Escalation: .+`.
2. All 4 metadata keys (`Created by:`, `Created at:`, `SPEC:`, `Status:`) are
   present, each on its own line, each with a non-empty value.
3. Each of the 5 body sections (`Stuck at:`, `What I tried:`, `Options I see:`,
   `My recommendation:`, `Question for Architect:`) is present and non-empty.
4. The `Options I see:` section lists at least 2 options.
5. The `Question for Architect:` line ends in `?` (or `؟` or other unicode
   question marks — flexible).

If ANY check fails → Supervisor returns `Confidence: 0` with reason
`escalation-format-invalid` and quotes the failing check in the response body.

---

## Hard-Stop tag (optional, recommended)

An escalation MAY include a `Hard-Stop:` metadata key with a category name
matching one in the Adapter's `<HARD_STOP_CATEGORIES>` list. If present,
Supervisor's Step 2 (Hard-Stop Check) trusts this tag and short-circuits to
escalation immediately (skipping Step 3 search).

If absent, Supervisor's Step 2 still scans the `Stuck at:` + `Question for
Architect:` fields for Hard-Stop category keywords per the Adapter — the tag
is a fast-path, not the only path.

---

## Example (project-agnostic shape — names are placeholders)

```
# Escalation: post-deploy migration produced unexpected row count

Created by: <executor-skill-name>
Created at: 2026-05-17T19:45:00Z
SPEC: modules/Module N/docs/specs/SOME_SPEC/SPEC.md
Status: OPEN

---

**Stuck at:** Migration commit `a4b2c3d` Phase 2, post-INSERT row count = 132 vs SPEC expected 130.

**What I tried:**
- Re-ran the SELECT to confirm the delta is real (not a stale count).
- Diffed the INSERT statement against SPEC §3 row 5 — matches verbatim.
- Checked for a concurrent writer — none found.

**Options I see:**
- **Option A — Accept delta, log finding.** Row count is +2 over expected; if expected was an estimate, accept. _Pros:_ fast / _Cons:_ may hide drift.
- **Option B — Roll back via tag, investigate before retry.** _Pros:_ safe / _Cons:_ 15-min detour.
- **Option C — Amend SPEC §3 row 5 expected value.** _Pros:_ clean / _Cons:_ requires Foreman approval.

**My recommendation:** Option B (rollback + investigate). Two extra rows in a counted migration smells like a fixture I missed.

**Question for Architect:** Should I roll back the migration and investigate the +2 delta before retrying, or accept and log it as a finding?
```

---

*End of escalation-format.md. Project-agnostic by contract.*
