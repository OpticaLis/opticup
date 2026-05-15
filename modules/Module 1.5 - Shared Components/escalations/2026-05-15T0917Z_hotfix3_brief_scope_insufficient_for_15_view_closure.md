# ESCALATION — SECURITY_HOTFIX_3 §1.1 scope insufficient for §1.2 closure

> **Filed:** 2026-05-15T0917Z by opticup-strategic (Foreman) during pre-SPEC pre-flight.
> **SPEC slug (proposed):** `SECURITY_HOTFIX_3_2026_05_15` (folder not yet created — escalation precedes SPEC authoring).
> **Trigger:** opticup-strategic Step 1.5.3 Runtime semantics rehearsal (the new sub-step added 2026-05-15 from SECURITY_HOTFIX_2 lessons) + Brief §7 STOP-trigger spirit (preempting predictable per-view anon probe failures).

---

## 1. Premise of the Brief

Brief `SECURITY_HOTFIX_3_2026_05_15_BRIEF.md` §1.1 + activation prompt:

> "3 base tables (`blog_posts`, `storefront_pages`, `ai_content`) get NEW `<table>_public_read_published` RLS policy + GRANT SELECT TO anon — **this is what enables the 15 deferred views' security_invoker=on to work without storefront outage.**"

Daniel + Architect locked the 3-table scope in the Brief. The activation prompt says "do not re-litigate".

## 2. What pre-flight reveals

The 15 deferred views read from **11 distinct base tables**, not 3. Per `pg_get_viewdef`:

| View | Base tables read | Anon-friendly RLS today? |
|---|---|---|
| v_storefront_blog_posts | `blog_posts` | NO → Yes after §1.1 (new policy) ✓ |
| v_storefront_pages | `storefront_pages` | YES (existing `storefront_pages_anon_read USING (status='published')`) ✓ |
| v_storefront_branches | `tenant_branches` | NO (JWT-only `tenant_isolation`) ❌ |
| v_storefront_brand_page | `brands`, `media_library`, `v_storefront_products` (cascade) | NO on all ❌ |
| v_storefront_brands | `brands`, `inventory`, `media_library`, `inventory_images` | NO on brands/inventory/media_library; YES on inventory_images (existing `anon_read_inventory_images USING true`) ❌ |
| v_storefront_products | `inventory`, `brands`, `inventory_images`, `ai_content` (scalar subqueries) | NO on inventory/brands; YES on inventory_images; ai_content gets §1.1 but 0 published rows ❌ |
| v_storefront_categories | `v_storefront_products` (cascade) | depends on above ❌ |
| v_storefront_config | `storefront_config` | NO (JWT-only `storefront_config_tenant_read`) ❌ |
| v_storefront_media | `media_library` | NO (JWT-only `tenant_isolation`) ❌ |
| v_public_tenant | `tenants` + `storefront_config` | tenants YES (existing `anon_read_tenants USING true`); storefront_config NO ❌ |
| **Admin cohort →** | | |
| v_ai_content | `ai_content` | scope to §1.3 REVOKE anon (admin-purpose, do not GRANT) |
| v_content_translations | `content_translations` | scope to §1.3 REVOKE anon (exposes status='draft' — admin/translator workflow) |
| v_tenant_i18n_overrides | `tenant_i18n_overrides` | scope to §1.3 REVOKE anon (admin) |
| v_translation_dashboard | `storefront_pages` (aggregate) | scope to §1.3 REVOKE anon (admin) |
| v_crm_event_stats | `crm_events`, `crm_event_attendees` | scope to §1.3 REVOKE anon (admin/CRM) |

### Base-table anon-RLS state today (verified via `pg_policies`)

| Base table | Has anon-friendly RLS policy? | §1.1 covers? |
|---|---|---|
| `blog_posts` | NO (JWT-only) | YES |
| `storefront_pages` | YES (`storefront_pages_anon_read USING (status='published')`) | YES (redundant grant) |
| `ai_content` | NO (JWT-only) | YES (but 0 published rows — admin-purpose) |
| `tenants` | YES (`anon_read_tenants USING true`) | n/a |
| `inventory_images` | YES (`anon_read_inventory_images USING true`) | n/a |
| `brands` | NO (JWT-only `tenant_isolation`) | **NOT in §1.1** ❌ |
| `inventory` | NO (JWT-only `tenant_isolation`) | **NOT in §1.1** ❌ |
| `media_library` | NO (JWT-only `tenant_isolation`) | **NOT in §1.1** ❌ |
| `tenant_branches` | NO (JWT-only `tenant_isolation`) | **NOT in §1.1** ❌ |
| `storefront_config` | NO (JWT-only `storefront_config_tenant_read`) | **NOT in §1.1** ❌ |
| `content_translations` | NO (JWT-only `ct_tenant_select`) | n/a (admin) |

## 3. Predicted execution outcome if Brief is taken literally (3-table §1.1)

Per Brief §7 STOP-trigger: "any view's post-migration anon probe returns 0 rows when pre-migration returned >0 → STOP, rollback that view, escalate."

Pre-flight predicts:

- **2 of 11 storefront views** will PASS the anon probe: `v_storefront_blog_posts` (relies only on `blog_posts` — §1.1 covers it), `v_storefront_pages` (relies only on `storefront_pages` — existing policy + §1.1 GRANT).
- **9 of 11 storefront views** will hit anon-probe = 0 → STOP + rollback + escalation. Each one re-litigates the same root issue (Brief scope is too narrow).
- **F-CRIT-2 advisor delta:** 15 → 13 (not 0). Plus §1.3 admin lockdowns close 4-5 more views (REVOKE anon doesn't affect advisor count since advisor flags security_definer view regardless of GRANT — flipping security_invoker=on closes the advisor entry). Conservative: F-CRIT-2 13 → 8 after §1.3.

The activation prompt's expected "F-CRIT-2 17→0" is **mathematically unreachable under the literal Brief**.

## 4. What opticup-strategic Step 1.5.3 prescribes

> "For each `security_invoker` flag change on a view: probe `has_table_privilege('anon', '<base_table>', 'SELECT')` AND `pg_policies` USING-clause anon-friendliness for EVERY base table the view reads from (including scalar-subquery base tables). **If any base table denies anon SELECT or has a JWT-claim-only USING, the view will go dark for anon after the flip — scope the view out of this SPEC and document the deferred follow-up.**"

The skill's prescribed remedy IS "scope-out unsafe views" — Option B below. The activation prompt's "do not re-litigate" conflicts with this prescription when applied to scope.

## 5. Options for Daniel

### Option A — Expand §1.1 scope to 11 base tables (full closure in this hotfix)

Add anon-read RLS policies + `GRANT SELECT TO anon` on the 8 additional base tables, with appropriate per-table filters:

- `brands`: `USING (active=true AND exclude_website IS NOT TRUE)` (matches existing storefront view filters)
- `inventory`: `USING (is_deleted=false AND website_sync<>'none' AND barcode IS NOT NULL AND display_mode_override<>'hidden')` (matches v_storefront_products filter) — this is the most invasive table
- `media_library`: `USING (is_deleted=false)` (matches v_storefront_media)
- `tenant_branches`: `USING (status='published' AND is_deleted=false)` (matches v_storefront_branches)
- `storefront_config`: `USING (enabled=true)` (matches v_public_tenant)
- `content_translations`: NOT expanded — admin-purpose, §1.3 REVOKE anon
- `crm_events` + `crm_event_attendees`: NOT expanded — admin-purpose, §1.3 REVOKE anon

**Result:** F-CRIT-2 17→0 achievable. SPEC size ~doubles (≈11 hours vs ~6 hour Brief estimate). Risk of inventory exposure (one of Prizma's most sensitive tables) becomes a major design decision in itself — exposing `barcode`, `model`, `color`, etc. to anon SELECT globally with only the "in-stock-and-active" filter is a structural change that may need column-restricted GRANT. SaaS implication: future tenants would need the same filter convention; could become tenant config.

### Option B — Scope out unsafe views, accept partial F-CRIT-2 closure (skill-prescribed path)

Keep §1.1 at literal 3-table scope. SPEC §1.2 limits to the 2 views whose probes will pass:
- `v_storefront_blog_posts` (passes — relies on §1.1 blog_posts policy)
- `v_storefront_pages` (passes — relies on existing storefront_pages_anon_read)

§1.3 lockdowns: 5 admin views (4 from HOTFIX_2 §10 + v_content_translations) get `REVOKE SELECT FROM anon` + `security_invoker=on` flip.

The remaining 8 storefront views (v_storefront_branches, v_storefront_brand_page, v_storefront_brands, v_storefront_products, v_storefront_categories, v_storefront_config, v_storefront_media, v_public_tenant) → defer to `SECURITY_HOTFIX_4` with a brief that pre-flights the additional 5 base tables (`brands`, `inventory`, `media_library`, `tenant_branches`, `storefront_config`).

**Result:** F-CRIT-2 17→8. F-CRIT-3 17→1-2 (depends on §1.5 A/B/C). HOTFIX_3 ships clean + small (~5 hours). HOTFIX_4 follows with the broader base-table RLS work. Two-step ratchet preferred by the skill.

### Option C — Halt HOTFIX_3, re-author Brief

Architect re-authors the Brief with corrected scope. No work this session beyond the escalation.

## 6. Foreman's recommendation

**Option B.** Reasons:
1. Matches the opticup-strategic Step 1.5.3 prescription verbatim ("scope the view out of this SPEC and document the deferred follow-up").
2. The remaining 8 storefront views need an architectural decision about exposing `inventory` and `brands` to anon — that decision belongs at the Brief level, not at SPEC pre-flight.
3. Step 1.5.3 was added FROM HOTFIX_2's pain — we wrote the lesson specifically so future SPECs would scope-out unsafe views rather than escalate mid-execution. This is the first test of that lesson.
4. Partial closure with a clean HOTFIX_3 + queued HOTFIX_4 is the lower-risk path.

## 7. Side-finding (orthogonal to A/B/C)

- `v_crm_lead_first_touch` has `anon_has_select=true` AND `security_invoker=true`. Not in the deferred-15 advisor list, so not part of F-CRIT-2. Admin-purpose view (CRM first-touch attribution). **Logged for FINDINGS.md but not in this SPEC's scope.**
- `register_lead_to_event` body inspection shows weaker Block A variant (no service_role bypass, no NULL trap). If Foreman picks Option B for §1.5 anyway (the activation prompt's default), REVOKE EXECUTE FROM anon handles the anon path; service_role calls bypass the IF entirely via PostgREST role context. Will be re-verified during execution.

End of escalation.
