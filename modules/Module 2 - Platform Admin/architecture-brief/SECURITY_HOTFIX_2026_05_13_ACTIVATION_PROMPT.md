# Activation Prompt — Security Hotfix 2026-05-13

> Paste the block below into a fresh Claude Code chat on Windows (`C:\Users\User\opticup`, branch `develop`). Use Opus model — this is production security DDL + Edge Function refactor + cross-repo coordination.

---

```
You are running the Full Auto Pipeline on a production security hotfix Brief. Use Opus model.

Brief location: modules/Module 2 - Platform Admin/architecture-brief/SECURITY_HOTFIX_2026_05_13_BRIEF.md

Source audit report: docs/guardian/SECURITY_ADVISOR_AUDIT_2026_05_13.md

Read both files in full BEFORE doing anything else. The Brief encodes Daniel's locked decisions on all 7 open questions from the audit report — do NOT relitigate during execution. §2 of the Brief lists every decision.

Key parameters:

1. FIRST ACTION — SAFETY TAG (mandatory): before reading further, before writing any SPEC, before any DDL or code change, create the master rollback tag per Brief §5.1:
   git tag -a pre-security-hotfix-2026-05-13 -m "Pre-security-hotfix baseline; revert here if anything in this run goes wrong"
   git push origin pre-security-hotfix-2026-05-13
   Confirm the tag exists on origin before proceeding.

2. SEVEN WORK AREAS per Brief §3:
   3.1 DROP _backup_brand_gallery_20260417 — grep for references first (expect 0), then DROP.
   3.2 submit_storefront_lead behind Edge Function — Option B. Land EF first; storefront client cuts over; THEN revoke anon EXECUTE on the RPC. Cross-repo coordination per Brief §4.
   3.3 REVOKE anon EXECUTE on create_tenant. service_role retains.
   3.4 Eight v_admin_* views — set security_invoker=true + REVOKE SELECT FROM anon. Requires Postgres ≥15 (pre-step check per Brief §2 question 7).
   3.5 Nine mutator RPCs — REVOKE anon EXECUTE (with FROM PUBLIC) + add JWT-claim tenant validation. Pre-step: inventory which RPCs the 2026-05-06 revoke migration covered vs which still have anon EXECUTE (Brief §2 question 6). Report inline.
   3.6 tenant-logos storage policy — pre-step audit of current paths for Prizma + Demo, backfill to <tenant_id>/<filename> convention if needed, then apply the policy.
   3.7 platform_audit_log policy — apply canonical Iron Rule 15 pattern.

3. PRE-STEPS to execute BEFORE any DDL:
   (a) Postgres version check: SELECT version(); confirm >= 15. If less, STOP escalate.
   (b) Inventory the 2026-05-06 anon-revoke gap: SELECT proname, has_function_privilege('anon', oid, 'EXECUTE') for the 9 mutator RPCs + others named in the May-6 migration. Report.
   (c) tenant-logos path audit: list current logo paths for both tenants; flag any not at <tenant_id>/<filename>.

4. SAFETY RULES per Brief §5 (non-negotiable):
   - All work on develop. NEVER push to main. Daniel merges via PR after review.
   - DDL pre-approved ONLY for the items listed in Brief §5.2. Any other DDL needs escalation.
   - Prizma project schema changes are necessary (DDL), but NO Prizma DATA writes — schema/policy only. Reversible via master tag + per-migration _up/_down pairs.
   - Demo tenant for smoke tests.
   - Iron Rule 31, 32, 12, 15, 22 enforced on every commit.
   - Iron Rule 15 canonical pattern (JWT-claim + service_bypass) for any new policies.
   - Iron Rule 22 (FROM PUBLIC) for any REVOKE EXECUTE migrations — see M4-DB-01 lesson.

5. EF DEPLOYMENT FALLBACK: if MCP deploy_edge_function returns InternalServerError (OPEN-021), write DEPLOY_FALLBACK_NEEDED.md per existing pattern (STATUS_CHANGE_TRIGGERS_FRAMEWORK precedent). Include the verify_jwt flag values for each EF being deployed (executor skill mandatory rule 5h). Daniel CLI-deploys from Windows; Pipeline resumes.

6. SMOKE per Brief §5.5 — one smoke per work area on demo. The §3.2 storefront-EF cutover smoke is the most critical; verify on /contact/ form first (lowest-stakes consumer) before cutting over higher-stakes forms.

7. CROSS-REPO COORDINATION for §3.2:
   - Land EF + RPC revoke in opticup repo first, BUT delay applying the RPC revoke until storefront cutover is verified green on demo.
   - Land storefront client change in opticup-storefront repo.
   - Verify end-to-end on demo.
   - ONLY THEN apply the RPC anon REVOKE in opticup.
   - If any storefront work fails, EF stays deployed (harmless), storefront commit is revertible in one command, RPC retains anon EXECUTE temporarily (no production break).
   - The Pipeline may split §3.2 into a separate SPEC if it judges scope is large — Architect pre-approves the split.

8. ESCALATION: if blocked by any condition (wrong premise, unexpected DDL needed beyond Brief §5.2, repeated smoke failure, Iron Rule conflict, storefront-repo not accessible), STOP, write modules/Module 2 - Platform Admin/escalations/{ISO_TS}_SECURITY_HOTFIX_BLOCKER.md, continue with OTHER independent work areas if possible.

9. COMMIT BUDGET per Brief §5.6: 8-12 commits estimated. Stop and report if exceeding 15.

10. FINAL DELIVERABLE per Brief §6: ONE summary file at docs/guardian/SECURITY_HOTFIX_2026_05_13_SUMMARY.md with master tag hash, list of SPECs closed, smoke results per work area, any escalations, recommended next steps.

11. COMMUNICATION: English status updates between phases (Daniel's terminal renders Hebrew reversed; memory feedback_english_only_responses.md confirms). ONE concise English summary at the end pointing Daniel to the summary file + top 3 takeaways + whether the work is ready for develop→main merge.

Execute autonomously per Bounded Autonomy in CLAUDE.md §9. Trust the Pipeline. Stop only on genuine deviation per Brief §5. The master safety tag (Brief §5.1) is the single rollback point.
```

---

*End of activation prompt.*
