# SKILL_IMPROVEMENTS — OVERNIGHT_HYGIENE_SWEEP_2026_05_09

> **Source:** FOREMAN_REVIEW.md §6 (opticup-strategic) + §7 (opticup-executor)
> **Status:** PENDING — must be applied to actual SKILL files in the next Claude Code session on Daniel's machine. Cowork cannot write to skill files directly (outside connected folders).
> **Apply via:** Read each proposal below, locate the named section in the SKILL.md file, paste the new content as instructed.

---

## 1. opticup-strategic — Proposal 1: Add Step 0.2 "Sentinel Finding Freshness Probe"

**Target file:** `.claude/skills/opticup-strategic/SKILL.md`

**Where to insert:** Immediately AFTER `### Step 0 — Reproduce-The-Bug-First` block ends, BEFORE `### Step 0.1 — Pre-Authoring Sweep Checklist`.

**The exact paragraph to add:**

```markdown
### Step 0.2 — Sentinel Finding Freshness Probe (MANDATORY, applied 2026-05-09)

**When a SPEC will cite a Sentinel finding (M-X, L-Y) by ID AND the SPEC will direct an executor to fix it, the SPEC author MUST re-run the cited grep / line lookup at SPEC-author time.** Sentinel snapshots can be hours-to-days stale; the cited evidence may already have been fixed by an unrelated commit.

If the cited evidence is no longer present (file changed, code already fixed, line numbers shifted) — DO NOT include the item in the SPEC. Either drop it OR rewrite the item with current evidence. Never copy a Sentinel finding into a SPEC verbatim without re-probing.

How to probe in <2 minutes:
1. List every Sentinel finding the SPEC will cite (M-X / L-Y IDs)
2. For each, extract the cited file path + line numbers + grep pattern
3. Run a single batched grep across all of them
4. Mark each as FRESH (matches Sentinel claim) or STALE (does not match)
5. Drop STALE items from the SPEC; for FRESH items proceed to authoring

This step exists because on 2026-05-09 OVERNIGHT_HYGIENE_SWEEP cited 11 Sentinel findings; **4 of 16 items (25%) had already been fixed by prior commits**. Items 6 (L-24 SMS double-suffix), 16 (L-10 hardcoded short-link), parts of 4, and Item 9 (M4 reviews already done) all required executor-time investigation to confirm staleness. A 2-minute author-time pre-probe across all citations would have caught all 4 cases.
```

---

## 2. opticup-strategic — Proposal 2: Pre-confirm sub-agent authorization in Step 4 dispatch

**Target file:** `.claude/skills/opticup-strategic/SKILL.md`

**Where to insert:** Inside `### Step 4 — Dispatch to Executor` block, as a new bullet.

**The exact bullet to add:**

```markdown
- **If the SPEC authorizes sub-agent spawning (Agent tool calls) for any item, include a one-line note in the dispatch handoff to Daniel:** "This SPEC uses sub-agents on items [X, Y, Z]. Confirm OK before paste, or reply NO-AGENTS to flip to in-process." Do NOT assume sub-agent permission carries from authorization to runtime — Daniel may have unstated reasons (cost, trust, debugging visibility) for declining. **Source:** OVERNIGHT_HYGIENE_SWEEP_2026_05_09 D1 — sub-agent rejection at Item 2 cost ~30 min of decision overhead + slower in-process work for Items 7-9-16.
```

---

## 3. opticup-executor — Proposal 1: Add Step 1.6 "Sentinel-finding pre-flight reproduction"

**Target file:** `.claude/skills/opticup-executor/SKILL.md`

**Where to insert:** Inside `§"SPEC Execution Protocol → Step 1 — Load and validate the SPEC"` block, as a new sub-step 1.6 (between current 1.5 and Step 2).

**The exact paragraph to add:**

```markdown
### Step 1.6 — Sentinel-finding pre-flight reproduction (MANDATORY, applied 2026-05-09)

If the SPEC cites Sentinel findings (M-X, L-Y) with specific file paths or line numbers, run `grep -n` on each cited line BEFORE starting that item. If the cited content isn't there — mark item as STALE in EXECUTION_REPORT, fast-track to FINDINGS, do NOT spend per-item investigation time.

This pre-flight can run as ONE batched grep across all cited lines in <60 seconds. Even if the SPEC author already pre-probed (per opticup-strategic Step 0.2), redundancy here is cheap insurance.

**Source:** OVERNIGHT_HYGIENE_SWEEP_2026_05_09 EXECUTION_REPORT §9 P1 — executor proposed this themselves after spending ~30 minutes confirming staleness on 4 of 16 items.
```

---

## 4. opticup-executor — Proposal 2: Codify "in-scope vs scope-creep" decision card

**Target file:** `.claude/skills/opticup-executor/SKILL.md`

**Where to insert:** Inside `§"Autonomy Playbook"` block — extend the existing decision table.

**The exact 3 rows to add:**

```markdown
| Item touches a file whose preexisting state blocks the item (e.g., file-size hard max blocks a rename) | Skip THAT FILE only. Complete the rest of the item. Document the blocked file in FINDINGS with link to the prior tech-debt entry. |
| Item appears already-fixed (Sentinel finding stale) | Skip with FINDING. Do NOT do redundant work to "verify it's really fixed" beyond the SPEC's own verify command. |
| Item's SPEC instruction has a side-effect that defeats the SPEC's intent (e.g., dedupe = remove safety net) | Apply the instruction AND fix the regression in the SAME commit (atomic). Document deviation in EXECUTION_REPORT §3. |
```

**Source:** OVERNIGHT_HYGIENE_SWEEP_2026_05_09 D2 + D4 + Items 6/16 SKIPs — all 4 patterns surfaced in this single run.

---

## How to apply

In a Claude Code session on Windows desktop:
1. Read this file
2. For each proposal, open the target SKILL.md
3. Locate the named section
4. Paste the content as instructed
5. Commit each change as: `chore(skills): apply <proposal> from OVERNIGHT_HYGIENE_SWEEP_2026_05_09 review`
6. Push to `develop`

Total time: ~15 minutes.

After applying: delete this file (or mark it DONE in a header line).
