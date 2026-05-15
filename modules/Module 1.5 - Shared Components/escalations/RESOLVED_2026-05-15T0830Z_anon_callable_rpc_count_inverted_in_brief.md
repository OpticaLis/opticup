# Escalation: SECURITY_HOTFIX_2 pre-flight — anon-callable RPC count inverted in Brief (17 actual vs 7 stated)

> Created by: opticup-strategic (Foreman role)
> Created at: 2026-05-15T08:30:00Z
> SPEC: modules/Module 1.5 - Shared Components/docs/specs/SECURITY_HOTFIX_2_2026_05_15/SPEC.md (NOT YET AUTHORED — blocked on this decision)
> Status: OPEN

---

**Stuck at:** Pre-flight Step 1 of SPEC authoring — Brief §1.3 expectation deviates >5% from reality.

**What I found:**
- §1.1 — `sync_lead_status_from_attendee` confirmed: SECURITY DEFINER, proconfig IS NULL, needs `search_path=public`. 1 of 1. ✅ Matches Brief.
- §1.2 — 17 views with empty reloptions confirmed via `pg_class`. ✅ Matches Brief exactly. Storefront-facing subset = 11 `v_storefront_*` + 4 storefront-adjacent (`v_public_tenant`, `v_content_translations`, `v_tenant_i18n_overrides`, `v_ai_content`) + 2 admin-side anon-readable (`v_translation_dashboard`, `v_crm_event_stats`).
- §1.3 — 24 SECURITY DEFINER RPCs lack JWT validation. ✅ Count matches. BUT **anon-callable subset = 17, not 7.** Verified via direct `has_function_privilege('anon', oid, 'EXECUTE')` on every candidate (not just proacl text parsing).

**The 17 anon-callable RPCs lacking JWT validation today:**
1. `_record_touchpoint` — funnel attribution helper
2. `activate_tenant` — admin op (anon can activate any tenant)
3. `check_plan_limit` — feature-gating check
4. `create_translated_page` — translation flow
5. `delete_tenant` — admin op (anon can delete any tenant)
6. `generate_daily_alerts` — Sentinel/cron
7. `get_po_aggregates` — inventory rollup
8. `get_tenant_activity_log` — audit log read
9. `get_tenant_employees` — employee directory
10. `get_tenant_stats` — tenant dashboard rollup
11. `get_translation_context` — translation flow
12. `is_feature_enabled` — feature flag check
13. `reset_employee_pin` — admin op (anon can reset any PIN)
14. `save_translation_memory_batch` — translation memory
15. `suspend_tenant` — admin op (anon can suspend any tenant)
16. `update_tenant` — admin op (anon can edit any tenant)
17. `verify_campaign_page_password` — campaign-page auth

**The 7 NON-anon-callable RPCs (authenticated/service_role only):**
- `check_in_attendee`, `import_leads_from_monday`, `next_crm_event_number`, `restore_event_from_log`, `soft_delete_event_if_empty`, `submit_storefront_lead`, `sync_lead_status_from_attendee`

The Brief reported the **inverted** count — it called the 7 NON-anon-callable group "anon-callable". This isn't a counting nuance; it's a sign reversal. 10 additional anon grants exist that the Brief didn't account for, several of which are clearly dangerous (anon today can call `delete_tenant`, `suspend_tenant`, `activate_tenant`, `update_tenant`, `reset_employee_pin` — admin RPCs).

**What I tried:**
- Re-ran the privilege check via `has_function_privilege('anon', oid, 'EXECUTE')` to rule out proacl text-parsing error → 17 confirmed.
- Cross-checked proacl string parsing — `anon=X/postgres` token present on 17 rows, absent on 7 → matches privilege check.
- Read prior `SECURITY_HOTFIX_2026_05_13` SPEC: no SPEC file with that slug exists in M1.5 specs/ (it likely lives elsewhere, possibly closed under a different folder name on a prior branch). Cannot cross-reference its anon-callable scope without finding it.

**Options I see:**
- **Option A — Honor the Brief and harden only the 7 non-anon-callable RPCs first, defer the 10 newly-discovered anon grants to SECURITY_HOTFIX_3.** _Pros:_ smaller blast radius, ships fast. _Cons:_ leaves `delete_tenant`/`suspend_tenant`/etc. callable by anon for another cycle — that is exactly the cross-tenant breach class F-CRIT-3 is supposed to close.
- **Option B — Expand scope in this hotfix: harden all 24 with JWT validation header, decide A/B for all 17 anon-callable per the same rubric.** _Pros:_ closes F-CRIT-3 completely as the Brief title intends. _Cons:_ 10 more Option A/B decisions, ~+45 min execution; SPEC §5 success criteria need to enumerate 17 anon-callable not 7.
- **Option C — Split: harden the 7 first as the Brief literal scope, immediately schedule SECURITY_HOTFIX_3 for the other 10.** _Pros:_ stays faithful to Brief wording. _Cons:_ ships a half-fix; pre-merge validation tomorrow will re-flag the same class.
- **Option D — Abort SECURITY_HOTFIX_2 and let the Architect re-draft the Brief with corrected counts.** _Pros:_ clean Brief→SPEC→exec chain. _Cons:_ a day lost; the 10 dangerous anon grants stay in prod.

**My recommendation:** **Option B.** The Brief's intent — "close F-CRIT-3 in one hotfix" — is unambiguous; the count was a typo or pre-flight aliasing error, not a scope decision. Expanding to all 17 anon-callable preserves the original intent without adding a new SPEC cycle. The §1.3 Option A/B rubric in the Brief is already designed to handle exactly this kind of per-RPC decision; applying it 17 times instead of 7 is the same work, just more iterations. SPEC §3 + §5 will document the corrected count, and the FOREMAN_REVIEW will harvest "Briefs must verify anon-grant counts via `has_function_privilege`, not proacl text parsing" as an author-skill improvement.

**Question for Architect:** Should I author the SPEC under Option B (expanded scope: harden all 24 + decide A/B for all 17 anon-callable in this hotfix), Option A (Brief-literal 7 only, defer 10), or do you want to redraft the Brief?

---

## Architect Decision (filled in by Architect from Cowork, then ingested by the paused skill)

**Resolution:** Option B — expand scope to all 17 anon-callable in this hotfix.

**Reasoning for Foreman/Executor:** Brief intent was "close F-CRIT-3 in one merge to main." Inverted count was a typo, not a scope decision. Closing only 7 would leave admin RPCs (`delete_tenant`, `suspend_tenant`, `activate_tenant`, etc.) anon-callable until SECURITY_HOTFIX_3 — exactly the breach class F-CRIT-3 is supposed to close. SPEC §3 success criteria enumerate all 17. Per-RPC Option A/B rubric in Brief §1.3 applies identically; just 17 iterations instead of 7.

**Resume instruction:** Author SPEC under Option B scope. Documented count = 17 anon-callable + 7 non-anon-callable + 24 total. SPEC §1.3 must enumerate the per-RPC Option A/B decision and rationale for each of the 17 anon-callable. Cross-reference findings into FOREMAN_REVIEW as author-skill improvement: "Briefs must verify anon-grant counts via `has_function_privilege`, not proacl text parsing."

Decided 2026-05-15T08:35Z by Daniel via AskUserQuestion in the same chat.

---

## Resolution log

Once the Architect's decision is pasted in above AND the pipeline successfully resumes, prepend `RESOLVED_` to this file's name (per Brief Contract E — Escalation File Lifecycle, never deleted).
