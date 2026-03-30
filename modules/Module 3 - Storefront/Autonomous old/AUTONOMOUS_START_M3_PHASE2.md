# Optic Up — Module 3 Storefront — Phase 2: Product Catalog

Context: Optic Up — multi-tenant SaaS optical store management.
Repo: OpticaLis/opticup-storefront (NOT opticup!)
Working directory: C:\Users\User\opticup-storefront
Machine: 🖥️ Windows

MODE: AUTONOMOUS — execute all steps without waiting for approval.

## ⛔ CRITICAL SAFETY RULES ⛔

1. Work ONLY in `C:\Users\User\opticup-storefront\`. NEVER touch `C:\Users\User\opticup\`.
2. NEVER modify the ERP repo (opticup) in any way.
3. NEVER commit `.env` files to git.
4. NEVER run SQL against Supabase — save SQL to files only.
5. NEVER connect custom domain. WordPress stays live.
6. All Supabase queries use Views only — never FROM tables directly.
7. Before EVERY commit: `git status` must NOT show .env.
8. If unsure: document as DECISION_NEEDED, choose safer option, continue.

## FIRST — Read:

1. `cd C:/Users/User/opticup-storefront && git pull origin main`
2. Read `PHASE_2_SPEC.md` — check repo root, then `C:\Users\User\opticup\modules\Module 3 - Storefront\docs\PHASE_2_SPEC.md`
3. Read `SESSION_CONTEXT.md` for current status

## THEN — Execute every step in PHASE_2_SPEC.md sequentially.

FOR EACH STEP:
1. Read step requirements
2. Implement
3. Run verification checklist
4. Commit: `git add -A && git commit -m "Phase 2 Step N: [description]" && git push`
5. Update SESSION_CONTEXT.md

EVERY 3 STEPS: checkpoint commit + push.
IF BLOCKED: document, skip, continue.
IF DECISION NEEDED: document, choose simpler, continue.

WHEN DONE:
1. Completion Checklist
2. Merge develop → main, push
3. Git tag: `v3.2-phase2-product-catalog`
4. Output summary

Go.
