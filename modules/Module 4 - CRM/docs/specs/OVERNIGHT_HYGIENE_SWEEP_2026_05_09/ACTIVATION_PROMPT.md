# Activation Prompt — OVERNIGHT_HYGIENE_SWEEP_2026_05_09

> **Paste-ready prompt for Claude Code.** Copy the block below into a fresh Claude Code session on Windows desktop. Daniel pastes; Claude Code runs autonomously for 8-12 hours.

---

## The prompt (copy from here):

```
You are opticup-executor running an overnight autonomous sweep. Load the opticup-executor skill now.

SPEC location: modules/Module 4 - CRM/docs/specs/OVERNIGHT_HYGIENE_SWEEP_2026_05_09/SPEC.md

This is an 8-12 hour autonomous run. 16 independent hygiene items. Daniel's directives:

1. Quality over speed. Take your time. Verify after every commit.
2. Never get stuck. If any single item cannot be solved cleanly — skip it, document in FINDINGS.md, continue to the next item.
3. Sub-agents are encouraged for read-heavy work. Items 2, 7, 8, 9, and 16 explicitly authorize parallel sub-agents — spawn them.
4. Push every 3 commits or every 30 minutes (whichever comes first).
5. No `git add -A`. Always explicit filenames.

Execution order:
1. First Action protocol (CLAUDE.md §1) — confirm machine, branch, repo clean, read SESSION_CONTEXT, integrity gate.
2. Read the full SPEC at the path above.
3. Walk items 1 → 16 in order. For each: read the item's §8 entry, check "Skip if" preconditions, execute, verify, commit, push at boundaries.
4. After item 16: run §12 QA closure steps, update OPEN_TASKS.md, write EXECUTION_REPORT.md + FINDINGS.md, final push.

Stop conditions are in SPEC §4 "What REQUIRES stopping" — only those. Everything else is "skip and continue".

Remember: Iron Rule 31 (verify:integrity) after every commit. No exceptions.

Begin.
```

---

## Notes for Daniel

- **Where to run:** Windows desktop (Watcher service runs there + sibling-repo storefront mount works there). Items 14 and 15 require sibling repo; only Windows desktop has it.
- **Expected duration:** 8-12 hours
- **Expected output:** 12-18 commits to `develop` + 3 closing commits (EXECUTION_REPORT + FINDINGS + OPEN_TASKS update). All pushed.
- **Morning check:** read `EXECUTION_REPORT.md` and `FINDINGS.md` in the SPEC folder. The verdict table in EXECUTION_REPORT §4 tells you item-by-item what closed and what was skipped.
- **If anything looks wrong:** all items are independent commits → `git revert <hash>` reverts just that item.

---

## When to use the copy-button block

The fenced code block above (lines starting with the ```...```) is the literal prompt for Claude Code. Daniel: select that block, paste into a fresh Claude Code session, hit enter. Nothing else needed.
