You are resuming the Optic Up Full-Auto Pipeline to CLOSE the M6 sidebar fix. The sidebar already
queries the new exam-grouped view correctly (one row per visit). Two closure items remain — both are
mandatory and small. Work on develop; never merge/push to main. Read CLAUDE.md (Iron Rules 21+32+34,
§3a, §9, TD-2 migration-drift) + the localhost-tester VFV gate (loaded-state mandatory).

Context (Architect-verified): `v_customer_visits_for_sidebar` exists in the live DB and rx-sidebar.js
queries it (commit 7d12083). The mechanism is correct. But: (1) the VFG screenshot was never committed,
so the Architect cannot see it; (2) the new view exists only in the live DB, not in git (commit was
JS-only) — that's the TD-2 migration-drift the project explicitly forbids letting grow.

Do exactly two things:
1. CAPTURE + COMMIT a loaded-state VFG screenshot. On demo, open a customer with a multi-stage visit;
   the sidebar must show ONE row for that visit (with stage-count) and the stage strip must show the
   stages under it, editor body loaded (not empty). Save the screenshot UNDER
   `modules/Module 6 - Prescriptions/docs/specs/M6_PRESCRIPTION_EDITOR/` and COMMIT the image file by
   explicit filename (the prior run referenced a screenshot it never committed — do not repeat that).
2. CAPTURE the view in git as a migration. Write the full `CREATE OR REPLACE VIEW
   v_customer_visits_for_sidebar ...` (security_invoker=on, tenant-scoped) into a migration file under
   `supabase/migrations/` (timestamped) AND add it to `modules/Module 6 - Prescriptions/docs/db-schema.sql`
   (and the Views list/count in that file). Pull the live view definition with
   `pg_get_viewdef('v_customer_visits_for_sidebar'::regclass, true)` so the committed SQL matches the
   DB exactly. No behavior change — this only closes the git drift.

Pre-flight: branch=develop, git pull, verify clean tree on THIS machine (§3a). Demo only, no Prizma
writes. Iron Rule 32 §Destructive Operations: declare None. (additive: a doc/migration file + an image
+ no DROP). Clean-repo gate: commit every file by explicit filename, including the screenshot. No
git add -A.

Closure (hardened loaded-state VFG): embed the committed screenshot path + a one-row-per-visit
confirmation in TEST_REPORT.md AND FOREMAN_REVIEW.md; DB evidence sidebar_rows == distinct exam count.
End with a Hebrew morning summary: the 2 closure items done, the committed screenshot path (so the
Architect can open it), confirmation the view is now in git, and — if merge-ready — the GitHub compare
URL + a one-line PR title. Then stop for the Architect's visual review.
