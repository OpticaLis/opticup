# POST-MERGE HEALTH REPORT — develop → main batch (2026-05-14)

**Reframed from:** `PRE_MAIN_MERGE_VALIDATION_2026_05_14_BRIEF.md` (pre-merge gate).
**Why reframed:** Mid-session discovery that the merge already shipped. Daniel approved continuing the runtime checks as a POST-merge health verification of the deployed `main`.

**Verdict:** 🟢 GREEN — `main` is healthy. All runtime gates pass. 1 informational finding (Brief port typo on 4 page URLs). 1 prior WARNING (dirty working tree, governance-only files, Daniel-accepted).

---

## 0. Merge State Discovery

| Item | Value |
|------|-------|
| origin/main tip | `7137c39 2026-05-14 13:51:30 +0300 — Merge pull request #80 from OpticaLis/develop` |
| origin/develop tip | `c39e9be 2026-05-14 13:44:30 +0300 — chore(spec): close M4_V2_MODAL_SESSION_RESTORE_FIX with retrospective` |
| develop ahead of origin/main | **0 commits** |
| merge-base | `c39e9be` (= develop tip) |
| Outcome | Merge already shipped. PR #80 was the final 6-file/1-commit drop (`M4_V2_MODAL_SESSION_RESTORE_FIX` + allowlist update). The earlier 47-commit batch (4 Hybrid+Navy migrations + SECURITY_HOTFIX_2026_05_13 + M4 overnight harvest + STATUS_CHANGE_TRIGGERS_FRAMEWORK + BROADCAST_EVENT_LINK_SUPPORT) had been merged in a prior PR earlier today. |

---

## 1. Check-by-Check Result

| # | Check | Expected | Observed | Status |
|---|-------|----------|----------|--------|
| 1 | Working tree clean | empty `git status --porcelain` | 9 modified governance docs + ~80 untracked briefs/SPEC scaffolds. **Zero production code (no `.html`, no `.js` under `modules/*/code/`, no root entrypoints) modified.** | 🟡 WARNING (Daniel-accepted) |
| 2 | `npm run verify:integrity` exit code | 0 | 0 — 102 files scanned in 4ms, all clear (Rule 31 gate) | 🟢 PASS |
| 3 | `npm run smoke` on demo tenant | 7/7 PASS | 7/7 PASS (PIN login 935ms, lead create 160ms, inventory read 121ms, storefront `/` 1298ms, `/supersale` 784ms, RLS cross-module read 142ms, no-5xx 1024ms) | 🟢 PASS |
| 4 | ERP :3000 responsive | HTTP 200 | 200 (`Invoke-WebRequest http://localhost:3000/index.html` 200 via start-local.ps1 health-check) | 🟢 PASS |
| 5 | Storefront :4321 responsive | HTTP 200 | 200 (start-local.ps1 health-check) | 🟢 PASS |
| 6 | 7 migration target pages | all HTTP 200 | 8/8 200 (after correcting Brief port typo) — see §2 below | 🟢 PASS |
| 7 | Supabase advisor (security) | 0 new LIVE / STAFF beyond post-hotfix baseline | 17 ERROR + 107 WARN. **All 17 ERROR are `security_definer_view` on the carry-allowlist (M-5 design-choice).** Zero `rls_disabled_in_public`, zero `policy_exists_rls_disabled`, zero `rls_policy_always_true`, zero secret-in-DDL. | 🟢 PASS |
| 8 | `git diff main..develop --stat` | matches SPECs declared in Brief | 0 files (merge already shipped) | 🟢 PASS (trivially) |
| 9 | `git merge-tree` conflict prediction | 0 conflict markers | 0 | 🟢 PASS (trivially) |
| 10 | `OPEN_TASKS.md` Last updated | 2026-05-13 or 2026-05-14 | "Last updated: 2026-05-13" — matches close of SECURITY_HOTFIX_2026_05_13 | 🟢 PASS |

---

## 2. Page HTTP-200 Detail

**Brief specified 7 URLs (3 on :3000, 4 on :4321). Actual file ownership: all 4 `storefront-*.html` pages live in the opticup ERP repo root (per `CLAUDE.md §0.5 Category 3`) and are served on :3000, not :4321. The opticup-storefront repo contains no `storefront-*.html` files.** Re-tested on :3000 — all pass.

| URL | Status | Bytes |
|-----|--------|-------|
| `http://localhost:3000/suppliers-debt.html` | 200 | 15,104 |
| `http://localhost:3000/settings.html` | 200 | 12,373 |
| `http://localhost:3000/settings.html#permissions` | 200 | 12,373 (hash routing client-side) |
| `http://localhost:3000/crm.html` | 200 | 24,218 |
| `http://localhost:3000/storefront-blog.html` | 200 | 19,759 |
| `http://localhost:3000/storefront-content.html` | 200 | 20,048 |
| `http://localhost:3000/storefront-landing-content.html` | 200 | 7,197 |
| `http://localhost:3000/storefront-studio.html` | 200 | 16,306 |

**Action item (informational):** Update Brief template / future activation prompts to reflect that `storefront-*.html` ERP CMS pages live on :3000, not :4321. The :4321 Astro storefront serves dynamic routes (`/`, `/supersale`, `/glossary/...`, etc.), not these `.html` filenames.

---

## 3. Supabase Advisor Detail

**By level:**
- ERROR: 17
- WARN: 107
- INFO: 0
- **TOTAL: 124**

**Top 5 lint types:**
- `authenticated_security_definer_function_executable` × 44 (WARN, design-choice carry)
- `function_search_path_mutable` × 30 (WARN, design-choice carry; partial cleanup ongoing per SECURITY_HOTFIX_2026_05_13 §6.4 retrofit pattern)
- `anon_security_definer_function_executable` × 29 (WARN, design-choice carry)
- `security_definer_view` × 17 (ERROR, carry-allowlist — all 17 are storefront/admin/CRM read-only views)
- `extension_in_public` × 2 (WARN — `pg_trgm` + `pg_net`, see M-NEW-28-2)

**Critical: zero ERROR findings outside the carry-allowlist.** The 17 affected views: `v_storefront_products`, `v_storefront_branches`, `v_storefront_categories`, `v_storefront_reviews`, `v_storefront_pages`, `v_translation_dashboard`, `v_storefront_blog_posts`, `v_crm_event_stats`, `v_storefront_components`, `v_storefront_brands`, `v_storefront_brand_page`, `v_tenant_i18n_overrides`, `v_storefront_config`, `v_public_tenant`, `v_content_translations`, `v_storefront_media`, `v_ai_content`.

**Closed since hotfix (baseline confirmed holding):** no `rls_disabled_in_public`, no `policy_exists_rls_disabled`, no `rls_policy_always_true` (`audit_log_admin_insert` was dropped in §6.9), `public_bucket_allows_listing` reduced from ERROR to WARN-level on `tenant-logos` only (per SECURITY_HOTFIX §6.8 authenticated-scope policy replacement).

---

## 4. Working-Tree Inventory (the WARNING)

**Modified (9 files, all governance/docs — no production code):**
- `.claude/skills/opticup-architect/SKILL.md`
- `.claude/skills/opticup-architect/references/DECISIONS_LOG.md`
- `.claude/skills/opticup-executor/SKILL.md`
- `.claude/skills/opticup-strategic/SKILL.md`
- `.claude/skills/opticup-strategic/references/SPEC_TEMPLATE.md`
- `docs/guardian/GUARDIAN_ALERTS.md` (Sentinel-owned; expected to mutate)
- `modules/Module 4 - CRM/docs/audits/M4_DEEP_AUDIT_2026_05_13.md`
- `roles/campaign-overseer/CAMPAIGN_OVERSEER_HANDOFF.md`
- `roles/campaign-overseer/OPEN_EVENTS_TICKETS.md`
- `roles/site-overseer/SITE_OVERSEER_SKILL.md`

**Untracked (~80 items):** architecture briefs, activation prompts, SPEC scaffolds (FOREMAN_REVIEW.md / SKILL_IMPROVEMENTS_TO_APPLY.md for closed SPECs), `__LAUNCH_PLAN_DRAFT__/`, 3 Access-DB binaries in `tests/`, plus an open ACTIVATION_PROMPT/SPEC pair for `M4_LEAD_INTAKE_ASYNC_DISPATCH` and `M4_EVENT_24_LEAD_FUNNEL_DIAGNOSTIC`.

**Why this is not a fail:** the merge already shipped from a clean point earlier today. The dirty state on the local working copy reflects in-flight WIP from concurrent sessions (Sentinel, opticup-architect drafting briefs) and does not affect anything in `main`.

---

## 5. Sign-off

`main` @ `7137c39` is healthy. No customer-facing regression, no new advisor findings, no broken pages, no smoke failure, no merge artifacts. The post-hotfix security baseline from 2026-05-13 holds.

**Single follow-up worth doing (optional, ~5 min):** correct the port-:4321-vs-:3000 confusion in the Brief template at `modules/Module 1.5 - Shared Components/architecture-brief/PRE_MAIN_MERGE_VALIDATION_2026_05_14_BRIEF.md` §1 so the next pre-merge gate doesn't fire ECONNRESET on 4 valid pages.

— *Generated by Claude Code (Opus 4.7) session, 2026-05-14, Windows desktop.*
