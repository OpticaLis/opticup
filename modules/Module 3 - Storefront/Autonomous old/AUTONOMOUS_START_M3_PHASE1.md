# Optic Up — Module 3 Storefront — Phase 1: Astro Setup

Context: Optic Up — multi-tenant SaaS optical store management.
Repo: OpticaLis/opticup-storefront (NEW repo — NOT opticup!)
Working directory: C:\Users\User\opticup-storefront
Machine: 🖥️ Windows

MODE: AUTONOMOUS — execute all steps without waiting for approval.

## ⛔ CRITICAL SAFETY RULES ⛔

1. Work ONLY in `C:\Users\User\opticup-storefront\`. NEVER touch `C:\Users\User\opticup\`.
2. NEVER modify the ERP repo (opticup) in any way.
3. NEVER commit `.env` files to git.
4. NEVER run SQL against Supabase — save SQL to files only.
5. NEVER connect custom domain. WordPress stays live.
6. If unsure: document as DECISION_NEEDED, choose safer option, continue.

## FIRST — Read:

1. If the repo is not yet cloned: `cd C:/Users/User && git clone https://github.com/OpticaLis/opticup-storefront.git && cd opticup-storefront`
2. If already cloned: `cd C:/Users/User/opticup-storefront && git pull`
3. Read `PHASE_1_SPEC.md` (Daniel places it in the repo root or provides it)

If PHASE_1_SPEC.md is not in the repo, check: `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\PHASE_1_SPEC.md`

## THEN — Execute every step in PHASE_1_SPEC.md sequentially.

FOR EACH STEP:
1. Read step requirements
2. Implement
3. Run verification checklist
4. Commit: `git add -A && git commit -m "Phase 1 Step N: [description]" && git push`
   - BEFORE commit: verify `.env` NOT in `git status`
5. Update SESSION_CONTEXT.md

EVERY 3 STEPS — CHECKPOINT:
1. Update SESSION_CONTEXT.md
2. Commit and push
3. If context heavy → STOP with continuation instructions

IF BLOCKED: document, skip, continue.
IF DECISION NEEDED: document, choose simpler, continue.

WHEN DONE:
1. Completion Checklist from SPEC
2. Update all docs
3. Git tag: `v3.1-phase1-astro-setup`
4. Output summary

Go.
