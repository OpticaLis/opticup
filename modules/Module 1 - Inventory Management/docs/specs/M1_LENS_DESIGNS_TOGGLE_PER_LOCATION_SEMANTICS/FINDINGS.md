---
spec_id: M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS
authored: 2026-05-18 IDT
total_findings: 2
status: 🟢 closed — 2 INFO (both resolved in-run)
---

# FINDINGS — M1_LENS_DESIGNS_TOGGLE_PER_LOCATION_SEMANTICS

## F-1 — INFO (RESOLVED IN-RUN) — Shared state `window.LensAD.locations` not cached at bootstrap

**Surface area:** `modules/lens-active-designs/lens-active-designs-main.js` `_updateContextBadge` function.

**What happened:** SPEC §3 S9 required the bulk activate/deactivate path to route through `toggleAcrossLocations(offerings, locations, makeActive)`. The detail.js implementation correctly reads from `window.LensAD.locations`. But main.js's `_updateContextBadge` fetched the locations array only to count it for the header badge — never stored it on the namespace. First Tier C click triggered the fallback path (legacy `toggleMany` with `p_location_id=null`).

**Discovery:** Caught immediately via DB inspection (UI badge showed "ראשי/שני" due to existing table-render logic that resolves location names from variants, but DB had only the legacy NULL row updated; the 2 expected per-location rows didn't appear).

**Fix:** 1-line addition in main.js:
```js
window.LensAD.locations = locations || [];
```
Inserted in `_updateContextBadge` right before the badge text is set. Re-tested: second activate-all click created 2 per-location rows atomically as expected.

**Why this is INFO not LOW/MED:** No persistent data corruption (the legacy NULL row was already there from 2026-05-15). No regression of any other feature. The detail.js fallback to `toggleMany` was the intended safety net for exactly this case.

**Lesson:** When a SPEC requires JS to consume a state field from a shared namespace, the SPEC's pre-flight should verify the namespace actually populates that field. Future polish for opticup-strategic SKILL.

## F-2 — INFO (RESOLVED IN-RUN) — Supabase's `anon` role gets EXECUTE separately from `PUBLIC`

**Surface area:** `supabase/migrations/20260518122656_m1_toggle_active_offerings_array.sql` final GRANT block.

**What happened:** Initial migration ended with:
```sql
REVOKE EXECUTE ON FUNCTION public.toggle_active_offerings_array(...) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_active_offerings_array(...) TO authenticated;
```
Expected: anon would not have EXECUTE. Actual: `get_advisors(security)` returned WARN `anon_security_definer_function_executable` for the new RPC. Inspecting `information_schema.role_routine_grants` showed anon still had EXECUTE despite the REVOKE FROM PUBLIC.

**Root cause:** In Supabase's deployment, `anon` is a separate role that holds an explicit schema-level USAGE + default-EXECUTE grant for new functions in `public`. `REVOKE FROM PUBLIC` only removes the implicit PUBLIC grant; the explicit anon grant survives.

**Fix:** Hotfix migration `20260518123234_m1_toggle_active_offerings_array_revoke_anon.sql`:
```sql
REVOKE EXECUTE ON FUNCTION public.toggle_active_offerings_array(...) FROM anon;
```

Post-hotfix grants: `authenticated + postgres + service_role` only — matches the canonical M1A pattern across all 8 `next_*_number` RPCs.

**Lesson — codification candidate:** Every new SECURITY DEFINER function in the project's M1A canon should follow this 3-line grant footer:

```sql
REVOKE EXECUTE ON FUNCTION public.<name>(...) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.<name>(...) FROM anon;
GRANT EXECUTE ON FUNCTION public.<name>(...) TO authenticated;
```

The 2-line REVOKE (PUBLIC + anon) is required — one alone is insufficient. This is a Supabase-specific subtlety that bit this SPEC and should be in the strategic SKILL.

## SKILL proposals harvested

**P-AUTHOR-2026-05-18-G (NEW)** — Add to opticup-strategic SKILL "SQL migration patterns": SECURITY DEFINER function grants in Supabase require **both** `REVOKE FROM PUBLIC` AND `REVOKE FROM anon` to fully exclude anon. Codify as the canonical 3-line grant footer for all new RPCs. Source: F-2 above.

**P-AUTHOR-2026-05-18-H (NEW)** — When a SPEC requires a JS module to read from a `window.X.field` that another file populates, the SPEC §0 should record where that field gets populated and verify it's actually written (grep for `window.X.field =`). Source: F-1 above.

---

**END FINDINGS**

_2 INFO (both resolved in-run, 0 persistent defects). 2 SKILL proposals harvested for future codification._
