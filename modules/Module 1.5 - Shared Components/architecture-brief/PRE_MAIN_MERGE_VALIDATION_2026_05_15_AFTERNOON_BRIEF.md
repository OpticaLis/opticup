# PRE-MAIN-MERGE VALIDATION — develop → main (2026-05-15 afternoon)

**Type:** Pre-merge gate. Read-only verification of the SECURITY_HOTFIX_3 delta (11 commits since the midday merge) before Daniel approves the PR.

**Why this exists:** SECURITY_HOTFIX_3 closed F-CRIT-2 from 15→8 (7 closed: 2 storefront views + 5 admin lockdowns) + F-CRIT-3 from 17→2 (15 closed via Block A or Option B REVOKE FROM anon) + base-table RLS for blog_posts + ai_content. The two remaining F-CRIT-3 RPCs are intentionally anon-callable (validate_slug + verify_campaign_page_password). 8 deferred views go to HOTFIX_4 with separate strategic discussion needed.

**Scope is intentionally narrow** — 11-commit delta validation. Plus any parallel-session commits that landed since midday. ~15-20 minutes.

---

## 1. Scope

**In scope:**
1. Working tree clean for HOTFIX_3 scope (pre-existing dirty from earlier sessions allowed as WARNING).
2. `npm run verify:integrity` — exit 0.
3. Both servers responsive (ERP :3000 + Storefront :4321) — already up.
4. `npm run smoke` — 7/7 PASS on demo tenant.
5. **HOTFIX_3 effects still active (regression check):**
   - 2 storefront views fixed: `v_storefront_blog_posts` + `v_storefront_pages` BOTH have `security_invoker=on` AND base tables have `_public_read_published` RLS policy.
   - 5 admin views locked: `v_ai_content`, `v_content_translations`, `v_tenant_i18n_overrides`, `v_translation_dashboard`, `v_crm_event_stats` — all have `security_invoker=on` AND zero anon EXECUTE/SELECT.
   - `save_translation_memory_batch` second overload: Block A header present.
   - 5 random RPCs from the 15 newly-hardened: JWT header + Block A pattern present.
6. **Storefront probe — no outage:**
   - Storefront homepage HTTP 200 + non-empty body.
   - `/about` (consumes v_storefront_pages) HTTP 200 + non-empty body.
   - `/supersale` HTTP 200 + non-empty body.
7. **The 8 deferred views are STILL unfixed (correct deferred state):**
   - Sample 3 from the 8 (e.g. `v_storefront_products`, `v_storefront_brand_page`, `v_storefront_categories`). Confirm `security_invoker=on` is ABSENT.
8. `git diff main..develop --stat` — should be 11 HOTFIX_3 commits + (if any) unrelated commits since midday merge.
9. `git merge-tree $(git merge-base main develop) main develop` — zero conflict markers.
10. Supabase advisor `get_advisors --type security`:
    - F-CRIT-2 count: 15 → 8 (7 closed).
    - F-CRIT-3 count: 17 → 2 (15 closed).
    - No NEW finding types vs baseline.

**Out of scope:**
- Code changes. Read-only.
- Commits. Validation produces a report only.
- The merge itself (Daniel does that via GitHub PR UI).
- Verifying the 8 deferred views work for storefront (they were already working pre-HOTFIX).

---

## 2. Expected Outcomes

| # | Check | Expected |
|---|-------|----------|
| 1 | Working tree status | WARNING acceptable; FAIL if HOTFIX_3 outputs dirty |
| 2 | `npm run verify:integrity` | exit 0 |
| 3 | ERP :3000 + Storefront :4321 | both HTTP 200 |
| 4 | `npm run smoke` | 7/7 PASS |
| 5 | HOTFIX_3 regression checks | all PASS |
| 6 | Storefront homepage + /about + /supersale | all HTTP 200 + non-empty |
| 7 | 3 sample deferred views: `security_invoker=on` ABSENT | as expected |
| 8 | `git diff main..develop --stat` | 11 HOTFIX_3 commits + parallel commits documented |
| 9 | `git merge-tree` conflict prediction | 0 conflict markers |
| 10 | Advisor: F-CRIT-2 15→8, F-CRIT-3 17→2, no new types | as designed |

If ANY check fails → STOP, do NOT recommend merge, write Hebrew escalation.

---

## 3. Output

Hebrew status block + (if GREEN) proposed PR title. Report at `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MERGE_VALIDATION_2026_05_15_AFTERNOON_REPORT.md`.

---

## 4. Destructive Operations

**None.** Pure read-only validation. No commits, no DB writes, no deploys.

---

## 5. Notes

- Skill load: `opticup-localhost-tester` for runtime + storefront probe. `opticup-executor` for advisor + pg queries. `opticup-reviewer` for git sanity.
- Time-box: 20 minutes. If a check takes >5 min — STOP, surface the surprise.
- This is the THIRD merge of the day (morning 351-commit + midday 29-commit + this afternoon 11+ commits). Daniel is on a productive day; the cadence is intentional.

End of Brief.
