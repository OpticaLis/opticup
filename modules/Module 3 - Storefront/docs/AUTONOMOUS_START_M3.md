# Optic Up — Module 3 Storefront — Autonomous Execution: START

Context: Optic Up — multi-tenant SaaS optical store management.
Repo: opticalis/opticup
Branch: develop (verify with `git branch` before doing ANYTHING. If not on develop, run `git checkout develop && git pull`)
Machine: 🖥️ Windows (C:\Users\User\opticup)

MODE: AUTONOMOUS — execute all steps without waiting for approval.

## ⛔ CRITICAL SAFETY RULES — READ BEFORE ANYTHING ⛔

1. **NEVER** merge to main. **NEVER** push to main. **NEVER** checkout main. This is a live production system.
2. **NEVER** delete or modify any existing files outside `modules/Module 3 - Storefront/` scope.
3. **NEVER** modify CLAUDE.md, GLOBAL_MAP.md, GLOBAL_SCHEMA.sql, or any Module 1/1.5/2 files.
4. **NEVER** run DROP TABLE, DELETE FROM, or TRUNCATE on any database.
5. **NEVER** install global npm packages — local only.
6. **NEVER** commit `.env` files to git. Before EVERY commit: `git status` must NOT show .env.
7. Before EVERY git operation: run `git branch` and confirm `develop`.
8. If you are unsure about ANYTHING: document as DECISION_NEEDED, choose the safer option, continue.

## FIRST — Read these files carefully:

1. `CLAUDE.md` — project rules. MUST follow every rule.
2. `modules/Module 3 - Storefront/docs/PHASE_0_SPEC.md` — what to build. This is your blueprint.
3. `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — current status (create if missing).

## THEN — Execute every step in the PHASE_SPEC sequentially.

FOR EACH STEP:
1. Read the step requirements from the SPEC
2. Implement the code/changes
3. Run the step's verification checklist — every checkbox must pass
4. Verify: zero errors, scripts run, files created correctly
5. Commit: `git add -A && git commit -m "M3 Phase 0 Step N: [description]" && git push`
   - BEFORE committing: `git status` — verify `.env` is NOT listed
   - BEFORE committing: `git diff --cached --name-only` — verify no .env or credentials
6. Update SESSION_CONTEXT.md — mark step ✅

EVERY 3 STEPS — CHECKPOINT:
1. Update SESSION_CONTEXT.md with full status table
2. Commit and push
3. If context heavy (>50K tokens) → STOP and output:
   ```
   CHECKPOINT: Steps 1-N complete. Context heavy.
   To continue, start new Claude Code session with AUTONOMOUS_CONTINUE.
   Status: [summary]
   ```

IF BLOCKED (3 failed attempts):
- Mark BLOCKED in SESSION_CONTEXT with detailed reason
- Skip to next step
- Continue

IF DECISION NEEDED:
- Document in SESSION_CONTEXT with options and chosen option
- Choose safer/simpler option
- Continue

WHEN ALL STEPS DONE:
1. Run Completion Checklist from SPEC
2. Update: SESSION_CONTEXT, MODULE_MAP.md, CHANGELOG.md
3. Final commit (verify .env excluded)
4. Git tag: `git tag v3.0-phase0-seo-audit -m "Phase 0: SEO Site Audit" && git push origin v3.0-phase0-seo-audit`
5. Output:
   ```
   PHASE 0 COMPLETE — SEO Site Audit
   Steps: N/N done
   URLs scanned: [count per language]
   Blocked: [list or "none"]
   Decisions: [list or "none"]
   Ready for Daniel review.
   ```

Go.
