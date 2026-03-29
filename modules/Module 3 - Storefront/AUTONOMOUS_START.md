# Optic Up — Autonomous Execution: START

> שמור קובץ זה. כשרוצים להתחיל פאזה חדשה באוטונומי — העתק והדבק ב-Claude Code.
> **החלף [MODULE_DIR] בנתיב תיקיית המודול** (למשל: modules/Module 3 - Storefront)
> **החלף [X] במספר הפאזה** (למשל: 1)

---

Context: Optic Up — multi-tenant SaaS optical store management.
Repo: opticalis/opticup
Branch: develop (verify with `git branch` before doing ANYTHING. If not on develop, run `git checkout develop && git pull`)

MODE: AUTONOMOUS — execute all steps without waiting for approval.

FIRST — Read these files carefully:
1. CLAUDE.md — project rules. MUST follow every rule.
2. [MODULE_DIR]/docs/PHASE_[X]_SPEC.md — what to build. This is your blueprint.
3. [MODULE_DIR]/docs/SESSION_CONTEXT.md — current status.
4. [MODULE_DIR]/ROADMAP.md — phase map.
5. docs/GLOBAL_MAP.md — shared functions reference (read-only, do NOT modify).

THEN — Execute every step in PHASE_[X]_SPEC.md sequentially.

FOR EACH STEP:
1. Read the step requirements from the SPEC
2. Implement the code/DB changes
3. Run the step's verification checklist
4. Verify: zero console errors, functions load, data saves correctly
5. Commit: `git add -A && git commit -m "Phase [X] Step N: [description]" && git push`
6. Update [MODULE_DIR]/docs/SESSION_CONTEXT.md — mark step ✅ in status table
7. Update [MODULE_DIR]/docs/MODULE_MAP.md if new files/functions were added
8. Update [MODULE_DIR]/docs/db-schema.sql if DB changes were made

EVERY 3 STEPS — CHECKPOINT:
1. Update SESSION_CONTEXT.md with full status table
2. Commit: `git add -A && git commit -m "checkpoint: steps N-M done" && git push`
3. Evaluate your context: if you have processed more than 50,000 tokens or feel context is getting heavy → STOP and output exactly:
   ```
   CHECKPOINT: Steps 1-N complete. Context heavy. 
   To continue, start a new Claude Code session and paste AUTONOMOUS_CONTINUE prompt.
   ```

IF BLOCKED (error you cannot fix):
- Try to fix (max 3 attempts)
- If still blocked → mark step as "BLOCKED" in SESSION_CONTEXT with reason
- Skip to next step if possible
- Continue with remaining steps

IF DECISION NEEDED (design choice not covered in SPEC):
- Document in SESSION_CONTEXT: "DECISION_NEEDED: [question with 2-3 options]"
- Choose the safer/simpler option and continue
- Daniel will review and adjust if needed

WHEN ALL STEPS ARE DONE:
1. Run the full phase verification checklist from the SPEC
2. Update all docs:
   - SESSION_CONTEXT.md — completion summary with all commits
   - MODULE_MAP.md — verify all new files/functions documented
   - CHANGELOG.md — new section for this phase
   - MODULE_SPEC.md — update current state
   - db-schema.sql — verify current if DB changes
   - ROADMAP.md — mark phase ⬜ → ✅
3. Integration Ceremony:
   - Read [MODULE_DIR]/docs/MODULE_MAP.md → merge NEW entries into docs/GLOBAL_MAP.md (add only)
   - Read [MODULE_DIR]/docs/db-schema.sql → merge NEW tables/RPCs into docs/GLOBAL_SCHEMA.sql (add only)
4. Backup: `mkdir -p "[MODULE_DIR]/backups/M[X]F[phase]_[date]"` → copy all docs
5. Final commit: `git add -A && git commit -m "Phase [X] complete — [summary]" && git push`
6. Git tag: `git tag v[module]-[phase] -m "Phase [phase]: [description]" && git push origin v[module]-[phase]`
7. Output completion summary:
   ```
   PHASE [X] COMPLETE
   Steps: N/N done
   Commits: [list]
   Tests: [pass/fail count]
   Blocked: [list or "none"]
   Decisions needed: [list or "none"]
   Ready for Daniel review.
   ```

Go.
