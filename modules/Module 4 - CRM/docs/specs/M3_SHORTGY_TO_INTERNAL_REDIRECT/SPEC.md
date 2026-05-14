# SPEC — M3_SHORTGY_TO_INTERNAL_REDIRECT

> **Location:** `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/SPEC.md`
> **Authored by:** opticup-strategic (Foreman, M4)
> **Authored on:** 2026-05-14
> **Module:** 4 — CRM
> **Roadmap slot:** `roles/site-overseer/FUNNEL_ROADMAP.md` Phase 1 P1.3 — **LAST execution-SPEC of Phase 1**
> **Brief:** `modules/Module 4 - CRM/architecture-brief/M3_SHORTGY_TO_INTERNAL_REDIRECT_BRIEF.md`

> **Heading convention:** plain numbered `## N. Title` (no `§` prefix — Iron-Rule-32 hook's regex requires this form).

---

## 0. Pre-Authoring Reality Check

- Brief read in full on 2026-05-14.
- All target tables and helper EFs verified present at Foreman authoring time:
  - `short_links` (12 columns; columns confirmed via live `information_schema.columns` query; row count 7,459 — Sentinel 2026-05-14 daily refresh)
  - `short_link_clicks` (NEW 2026-05-14 from M4_MESSAGE_PERFORMANCE_TRACKING)
  - `crm_lead_touchpoints` (NEW 2026-05-14 from M3_UTM_TRIPLE_LAYER_PERSISTENCE / P1.1)
  - `resolve-link` EF v5 deployed and serving `/r/<code>` per `docs/GLOBAL_MAP.md:204`
  - `createShortLink` helper at `supabase/functions/send-message/url-builders.ts:48-104` (8-char alphanumeric code, 1-retry collision, `broadcast_id` substrate from P1.2)
- **Iron Rule 18 advisory:** `short_links_code_unique UNIQUE (code)` is GLOBAL, not tenant-scoped. This is pre-existing tech debt (not in this SPEC's scope; tracked as a finding for next M4 hygiene SPEC). Practical impact for this SPEC: codes must be globally unique — Executor will rely on 8-char random + 1-retry collision (the runtime pattern).
- **3 prior FOREMAN_REVIEW lessons applied** (see §11 for the full mapping):
  - P1.2 Author Proposal #2 (smoke pre/post in Pipeline mode): §3 criterion 11 split into "pre" (delegate to P1.2 TEST_REPORT) + "post" (LH-Tester deliverable).
  - P1.1 Author Proposal #2 (Pipeline-mode escalation discipline): §4 pre-enumerates auto-pivot vs Daniel-escalation triggers.
  - RETURN_SHAPE_FIX Author Proposal (gitignore-awareness pass): §8 lists no gitignored paths in "New files"; backups go to `modules/Module 4 - CRM/backups/...` which IS gitignored — those are local-only safety net per CLAUDE.md §9.9, not git artifacts.
  - RETURN_SHAPE_FIX Executor Proposal (Iron-Rule-32 keyword-literal awareness): §5 warns Executor to use tenant-scoped `WHERE tenant_id=` on every UPDATE — never bare `DELETE FROM <table>` without a tenant predicate, even in test/cleanup queries.

- **Pre-existing untracked files surveyed:** `git status --porcelain | grep '^??' | wc -l` = 103. Executor uses selective `git add` by filename throughout — leaves all pre-existing untracked alone.
- **Live INVENTORY baseline captured during authoring** (Executor re-validates in Step 0; any divergence = STOP per §5):

| Surface | Live count | Tenant breakdown | How measured |
|---|---|---|---|
| `crm_message_templates.body` rows with `%short.gy%` | **10** | demo: 3, prizma: 7 | `SELECT count(*) FROM crm_message_templates WHERE body ILIKE '%short.gy%' GROUP BY tenant_id` |
| `crm_message_templates.body` distinct URL occurrences | **12** | (some rows have 2 URLs) | `regexp_matches(body, 'https?://(?:www\.)?prizmaoptic\.short\.gy/[A-Za-z0-9_-]+', 'g')` |
| **Unique short.gy codes referenced** | **4** | (`gmapy`, `dgUUIn`, `gCCfZx`, `kuZSCu`) | `DISTINCT` over the regexp_matches results |
| `tenants.payment_links` rows with short.gy | **2** | demo: 1, prizma: 1 (both `gmapy`) | `SELECT slug, payment_links FROM tenants WHERE payment_links::text ILIKE '%short.gy%'` |
| `storefront_pages.blocks` rows with short.gy | **0** | (none) | `SELECT count(*) FROM storefront_pages WHERE blocks::text ILIKE '%short.gy%'` |
| `short_links.target_url` rows with short.gy | **0** | (none) | `SELECT count(*) FROM short_links WHERE target_url ILIKE '%short.gy%'` |
| `crm_message_log.content` rows with short.gy | **4,370** | (historical — OUT OF SCOPE) | `SELECT count(*) FROM crm_message_log WHERE content ILIKE '%short.gy%'` |
| `crm_message_queue.body` rows with short.gy | **1,170 — all `status='sent'`** | (historical — OUT OF SCOPE; 0 pending rows confirmed) | `SELECT status, count(*) FROM crm_message_queue WHERE body ILIKE '%short.gy%' GROUP BY status` |
| ERP source (`.js`/`.html`) | **0** | n/a | `Grep '*.{js,ts,html,astro,jsx,tsx}'` → no matches |
| Storefront source (`opticup-storefront/`) | **0** | n/a | `Grep -i 'short.gy' in opticup-storefront/` → no files |
| Content drafts (`campaigns/supersale/MESSAGES UPDATE/*.txt`, `*.html`) | **4 files** | (non-runtime — source-of-truth sync) | `Grep -li 'short.gy' in campaigns/supersale/MESSAGES UPDATE/` |

**Baselines as symbols (referenced in §3 success criteria):**

| Symbol | Value | How measured |
|---|---|---|
| `BASE_TEMPLATE_HITS_DEMO` | 3 | `SELECT count(*) FROM crm_message_templates WHERE body ILIKE '%short.gy%' AND tenant_id=(SELECT id FROM tenants WHERE slug='demo')` |
| `BASE_TEMPLATE_HITS_PRIZMA` | 7 | (same, tenant=prizma) |
| `BASE_PAYMENT_LINKS_HITS` | 2 | `SELECT count(*) FROM tenants WHERE payment_links::text ILIKE '%short.gy%'` |
| `BASE_CMS_HITS` | 0 | `SELECT count(*) FROM storefront_pages WHERE blocks::text ILIKE '%short.gy%'` |
| `BASE_UNIQUE_CODES` | 4 | DISTINCT codes in template bodies — `gmapy`, `dgUUIn`, `gCCfZx`, `kuZSCu` |
| `BASE_DEMO_DESTINATIONS_NEEDED` | 2 | demo references only `gmapy` + `dgUUIn` |
| `BASE_PRIZMA_DESTINATIONS_NEEDED` | 4 | prizma references all 4 |
| `BASE_NEW_SHORT_LINKS_ROWS` | 6 | demo: 2 + prizma: 4 |
| `BASE_CONTENT_DRAFT_FILES` | 4 | `campaigns/supersale/MESSAGES UPDATE/registration confirmation/{SMS.txt,EMAIL.txt}` + `.../COUPON/{SMS.txt,EMAIL.txt}` |
| `BASE_CRM_HTML_LINES` | 428 | `wc -l crm.html` |
| `BASE_PHASE_1_CLOSED_BEFORE_P1_3` | 3 of 4 | P1.4 + P1.1 + P1.2 all CLOSED 2026-05-14 per FUNNEL_ROADMAP rows |

---

## 1. Goal

Migrate every statically-embedded `prizmaoptic.short.gy/<code>` URL across the project (DB templates, tenant config, source-of-truth content files) to an internal `/r/<new-code>` redirect handled by the `resolve-link` Edge Function — so every click from a customer's message body or paid surface flows through our measurement chain (`short_links` → `short_link_clicks` → `crm_lead_touchpoints`, all carrying `broadcast_id` per P1.2). Ship a minimal MVP "Short Link Stats" view inside the CRM tab so Daniel can see per-code click totals in the ERP. **Phase 1 of FUNNEL_ROADMAP closes when this lands.**

---

## 2. Background & Motivation

- **Architectural premise (Brief §1):** today, ~10 template bodies + 2 tenant-config rows reference `prizmaoptic.short.gy/<code>`. Customer clicks on those links go to an external service whose clicks WE cannot see in our DB — bypassing the `short_link_clicks` + `crm_lead_touchpoints` chain that P1.1 (UTM Triple Layer) and P1.2 (broadcast_id propagation) just stood up.
- **Daniel's pull quote (Brief §"Decision context"):** *"I do see click stats there [short.gy], but obviously it would be much more convenient to see it in our system."*
- **Phase 1 dependency chain:** P1.4 → P1.1 → P1.2 → **P1.3 (this SPEC)**. P1.4 mapped the RPC contract, P1.1 stood up the touchpoint table, P1.2 wired `broadcast_id` end-to-end. P1.3 is what makes every click *reach* that chain.
- **Out-of-scope today (Brief §1):** broadcast-runtime short-link generation is already internal post-P1.2 — only **statically-embedded** short.gy links migrate here. The short.gy service itself stays alive (Daniel manually deactivates after 30 days of zero traffic).
- **Already-done discovery contingency:** If Step 0 INVENTORY surfaces fewer-than-baseline rows (e.g., a parallel session migrated some templates), the Executor reports the delta and continues — the SPEC tolerates downward drift but not upward (which would signal scope creep / new in-flight surfaces).

---

## 3. Success Criteria (Measurable)

Every criterion has an exact expected value. Executor captures actual values in EXECUTION_REPORT.md §2.

| # | Criterion | Expected value | Verify command |
|---|---|---|---|
| 1 | Branch state at close | On `develop`, clean | `git status --porcelain | wc -l` → 0 (after selective adds for SPEC-owned files only) |
| 2 | Commits produced in this SPEC's range | ≥ 3, ≤ 6 (per §9 commit plan; consolidation OK) | `git log origin/develop..HEAD --oneline | wc -l` |
| 3 | INVENTORY.md written | exists, lists every DB row + content-draft file by id/path | `ls modules/Module\ 4\ -\ CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/INVENTORY.md` → exit 0 |
| 4 | INVENTORY.md INVENTORY-baseline match | live rows match §0 baselines (`BASE_TEMPLATE_HITS_DEMO=3`, `BASE_TEMPLATE_HITS_PRIZMA=7`, `BASE_PAYMENT_LINKS_HITS=2`, `BASE_CMS_HITS=0`, `BASE_UNIQUE_CODES=4`) | Executor's Step 0 query results documented in INVENTORY.md table |
| 5 | New `short_links` rows | exactly `BASE_NEW_SHORT_LINKS_ROWS=6` rows (demo: 2, prizma: 4) | `SELECT t.slug, count(*) FROM short_links sl JOIN tenants t ON t.id=sl.tenant_id WHERE sl.link_type='template_static' GROUP BY t.slug` → `{demo:2, prizma:4}` |
| 6 | New codes are 8-char alphanumeric, all unique | `code ~ '^[A-Za-z0-9]{8}$'` AND no duplicates | `SELECT count(*) FROM short_links WHERE link_type='template_static' AND code !~ '^[A-Za-z0-9]{8}$'` → 0; `SELECT code, count(*) FROM short_links WHERE link_type='template_static' GROUP BY code HAVING count(*)>1` → empty |
| 7 | Curl probe each new code | each returns HTTP 302 with `Location: <documented destination>` | per-code: `curl -sI https://<storefront>/r/<code>` → status 302 + Location header matches INVENTORY.md target |
| 8 | `crm_message_templates.body` post-state — DEMO | 0 remaining short.gy refs on demo | `SELECT count(*) FROM crm_message_templates WHERE body ILIKE '%short.gy%' AND tenant_id=(SELECT id FROM tenants WHERE slug='demo')` → 0 |
| 9 | `crm_message_templates.body` post-state — PRIZMA | 0 remaining short.gy refs on prizma | `SELECT count(*) FROM crm_message_templates WHERE body ILIKE '%short.gy%' AND tenant_id=(SELECT id FROM tenants WHERE slug='prizma')` → 0 |
| 10 | `crm_message_templates.body` post-state — total | 0 total | `SELECT count(*) FROM crm_message_templates WHERE body ILIKE '%short.gy%'` → 0 |
| 11 | `tenants.payment_links` post-state | 0 rows reference short.gy | `SELECT count(*) FROM tenants WHERE payment_links::text ILIKE '%short.gy%'` → 0 |
| 12 | `tenants.payment_links` row count unchanged | exactly 2 rows still have a `payment_links."50"` key | `SELECT count(*) FROM tenants WHERE payment_links ? '50'` → 2 (Iron Rule 16 — contract preserved) |
| 13 | `storefront_pages.blocks` post-state (sanity — no regression) | still 0 short.gy refs | `SELECT count(*) FROM storefront_pages WHERE blocks::text ILIKE '%short.gy%'` → 0 |
| 14 | ERP source post-state | still 0 short.gy refs | `Grep '*.{js,ts,html,astro,jsx,tsx}' -i 'short.gy'` → no matches |
| 15 | Storefront source post-state | still 0 short.gy refs | `Grep -i 'short.gy' in opticup-storefront/` → no matches |
| 16 | Content draft files updated | 4 files no longer contain short.gy literal | `Grep -li 'short.gy' campaigns/supersale/MESSAGES\ UPDATE/` → 0 files (these files now contain `%payment_url_50%` / `%coupon_terms_url%` placeholders or direct `/r/<code>` URLs — Executor chooses the right form per file context, see §8) |
| 17 | Historical `crm_message_log.content` UNTOUCHED | row count + content unchanged | `SELECT count(*) FROM crm_message_log WHERE content ILIKE '%short.gy%'` → still 4,370 (immutable audit trail per CLAUDE.md hygiene) |
| 18 | Historical `crm_message_queue.body` UNTOUCHED | row count + content unchanged | `SELECT status, count(*) FROM crm_message_queue WHERE body ILIKE '%short.gy%' GROUP BY status` → still `{sent: 1170}` |
| 19 | MVP stats view shipped — new JS file | `modules/crm/crm-short-links-stats.js` exists, ≤ 250 lines (Rule 12) | `wc -l modules/crm/crm-short-links-stats.js` → ≤ 250 |
| 20 | MVP stats view shipped — new nav tab in `crm.html` | 1 new `data-tab="short-links"` button + 1 new section block; `crm.html` post-line count ≤ `BASE_CRM_HTML_LINES + 30` (capped well under Rule 12 limit of 350) | `wc -l crm.html` → ≤ 458 |
| 21 | MVP stats view loads on demo | navigating to the new tab renders the table without console error, displays ≥ 6 rows (the new short_links rows created by this SPEC) | LH-Tester manual probe; expected rows visible: 2 demo template_static rows immediately after migration |
| 22 | LH-Tester click test (post-migration) | for 3 random new codes, `curl -sI /r/<code>` returns 302 AND a `short_link_clicks` row appears within 10s AND a `crm_lead_touchpoints` row appears within 10s | LH-Tester `TEST_REPORT.md` §"P1.3 click probe" — 3/3 PASS |
| 23 | Smoke 7/7 PASS — post-migration | LH-Tester runs `npm run smoke` on demo | `tests/smoke/baseline.test.mjs` exit 0 with 7/7 PASS |
| 24 | Smoke 7/7 PASS — pre-migration (delegated) | delegated to P1.2's TEST_REPORT.md from 2026-05-14 (24h baseline) — Executor cites the prior TEST_REPORT.md commit hash + scenario IDs in EXECUTION_REPORT §6 | Reference: `modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/TEST_REPORT.md` last known green: commit `c8b5279` (per P1.2 FOREMAN_REVIEW §1) |
| 25 | Integrity Gate (Iron Rule 31) | exit 0 or 2 (no null-byte ERROR) | `npm run verify:integrity; echo $?` → 0 or 2 |
| 26 | `npm run verify` (full pre-commit suite) | exit 0 | `npm run verify` — includes destructive-ops gate per Iron Rule 32 |
| 27 | Backup folder populated | `modules/Module 4 - CRM/backups/2026-05-14_M3_SHORTGY_TO_INTERNAL_REDIRECT/` exists with: (a) 10 JSON files (one per pre-edit template row), (b) 2 JSON files (one per pre-edit tenants row), (c) 4 verbatim copies of content draft files (`*_PRE.txt` / `*_PRE.html`), (d) snapshots of CLAUDE.md + M4 SESSION_CONTEXT/MODULE_SPEC/MODULE_MAP/ROADMAP/CHANGELOG/db-schema | `ls modules/Module\ 4\ -\ CRM/backups/2026-05-14_M3_SHORTGY_TO_INTERNAL_REDIRECT/ | wc -l` ≥ 22 |
| 28 | KNOWLEDGE_MAP.md updated — Layer 7 | `prizmaoptic.short.gy` annotated as **DEPRECATED** for internal usage with commit ref; internal `/r/<code>` confirmed as canonical | `grep -nA2 'short.gy' roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` shows DEPRECATED marker referencing this SPEC |
| 29 | FUNNEL_ROADMAP.md updated — P1.3 status | row 4 (P1.3) flipped from `PLANNED` to `✅ CLOSED 2026-05-14 — <SPEC folder path>` AND a "**Phase 1 COMPLETE**" line added below the Phase 1 table | `grep '^.*P1.3.*✅' roles/site-overseer/FUNNEL_ROADMAP.md` returns the closure row; `grep 'Phase 1 COMPLETE' roles/site-overseer/FUNNEL_ROADMAP.md` returns ≥ 1 hit |
| 30 | M4 SESSION_CONTEXT updated | one-paragraph closure entry prepended at top with commit hashes + summary | `head -n 30 modules/Module\ 4\ -\ CRM/docs/SESSION_CONTEXT.md` contains the closure block |
| 31 | M4 `docs/db-schema.sql` updated | appendix block for `M3_SHORTGY_TO_INTERNAL_REDIRECT` added documenting: 6 new `short_links` rows with `link_type='template_static'` + tenants.payment_links migration + new ERP page file | `grep 'M3_SHORTGY_TO_INTERNAL_REDIRECT' modules/Module\ 4\ -\ CRM/docs/db-schema.sql` → ≥ 1 hit |
| 32 | M4 `MODULE_MAP.md` updated | new entry: `modules/crm/crm-short-links-stats.js` registered with one-line purpose | `grep 'crm-short-links-stats' modules/Module\ 4\ -\ CRM/docs/MODULE_MAP.md` → ≥ 1 hit |
| 33 | EXECUTION_REPORT.md + FINDINGS.md written | exist in SPEC folder | `ls modules/Module\ 4\ -\ CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/{EXECUTION_REPORT,FINDINGS}.md` exit 0 |
| 34 | Pre-existing untracked file mass UNTOUCHED | the 103 untracked files at SPEC start remain untracked (selective `git add` discipline) | `git status --porcelain | grep '^??' | wc -l` ≥ 103 (modulo SPEC's own new untracked artifacts before they are staged) |

---

## 3a. Shared Edit Block

Not applicable — this SPEC's edits are per-row UPDATEs and per-file replaces, each with bespoke before/after content (the short.gy code differs per row). The Reviewer verifies each replacement against INVENTORY.md's per-row plan.

---

## 4. Autonomy Envelope

### What the Executor CAN do without asking

- Read any file in either repo; query DB Level 1 (read-only SELECT).
- Run Step 0 INVENTORY (read-only) and write `INVENTORY.md`.
- Create the `modules/Module 4 - CRM/backups/2026-05-14_M3_SHORTGY_TO_INTERNAL_REDIRECT/` folder and populate it (gitignored — local-only safety net, NOT staged).
- INSERT new rows into `short_links` with `link_type='template_static'`, expires_at far in the future (2099-12-31).
- UPDATE `crm_message_templates.body` per-row, tenant-scoped (`WHERE id=<UUID> AND tenant_id=<UUID>` — both predicates mandatory per IR-32 keyword-literal awareness).
- UPDATE `tenants.payment_links` per-row, by slug (`WHERE slug='demo'` / `WHERE slug='prizma'`).
- Edit the 4 content-draft files under `campaigns/supersale/MESSAGES UPDATE/`.
- Add a new tab + section to `crm.html` (additive only — no removal/rename of existing tabs).
- Create `modules/crm/crm-short-links-stats.js` (≤ 250 lines, single responsibility).
- Update `KNOWLEDGE_MAP.md`, `FUNNEL_ROADMAP.md`, M4 `SESSION_CONTEXT.md`, M4 `db-schema.sql`, M4 `MODULE_MAP.md`.
- Commit and push to `develop` on BOTH repos (this SPEC only touches `opticup` — the storefront repo grep confirmed 0 occurrences, so no storefront commits are expected; if Step 0 INVENTORY surfaces unexpected storefront refs → STOP).
- Selective `git add <file>` ONLY — never `git add -A` / `-.`; never touch pre-existing untracked files.
- Apply harvested Pipeline-mode auto-pivots (OPEN-021 MCP→CLI, function-signature DROP) if they fire — but none are expected (no EF deploy, no PL/pgSQL function arg changes).

### What REQUIRES stopping and reporting (escalation triggers)

These are **Daniel-level decisions** (Pipeline-mode escalation discipline per P1.1 Author Proposal #2). Default: stop and emit ONE Hebrew chat line to Daniel.

- Step 0 INVENTORY count diverges UP from §0 baselines (e.g., a 5th unique short.gy code appears, or `crm_message_queue` shows pending rows).
- Any short.gy URL returns HTTP 4xx/5xx when curled (dead URL — Brief §7 STOP).
- A curl-resolved destination points OUTSIDE prizma's known domains (`prizma-optic.co.il`, `app.opticalis.co.il`, `opticalis.co.il`).
- A new `/r/<code>` curl probe returns anything other than 302 with the documented Location.
- Iron-Rule-32 destructive-ops gate fires unexpectedly during commit (escalation discipline — see P1.1 Author Proposal #2 #3).
- A `crm_message_templates` UPDATE returns row-count ≠ 1 (means tenant predicate is wrong or row drifted between INVENTORY and UPDATE).
- Adding the MVP stats nav tab requires modifying ≥ 50 lines of `crm.html` (additive-only constraint violated — reduce scope and re-author).
- `crm.html` line count would exceed Rule 12's 350-line hard cap after the additive change.

### Pre-authorized auto-pivots (do NOT ask)

- **OPEN-021 (MCP `deploy_edge_function` 5xx):** N/A — this SPEC does not redeploy any EF (resolve-link is unchanged).
- **DB row drift during transaction:** if a Level 2 UPDATE returns `0` rows affected, re-query the row by id, log the drift in EXECUTION_REPORT §4, and stop. Don't auto-retry; report.

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- Step 0 INVENTORY surfaces a short.gy URL whose decoded destination is OUTSIDE prizma-controlled domains → STOP, escalate.
- Step 0 INVENTORY surfaces a 5th distinct short.gy code (above `BASE_UNIQUE_CODES=4`) → STOP, escalate.
- Any of the 4 short.gy URLs returns HTTP 404/410/5xx when curl-resolved → STOP, ask Daniel whether to skip with a placeholder OR replace with a tenant home URL.
- A `crm_message_templates` UPDATE WHERE clause accidentally touches a non-target tenant row → STOP, rollback from JSON backup, escalate.
- `tenants.payment_links` UPDATE produces a malformed JSONB (missing `"50"` key, or value is not a fully qualified URL) → STOP, rollback from JSON backup, escalate.
- A `resolve-link` curl probe on a freshly-created code returns a 200/4xx/5xx instead of 302 → STOP, fix the row (likely a typo in `code` or `target_url`).
- Smoke 7/7 PASS pre-migration baseline is missing OR P1.2 TEST_REPORT.md commit cannot be located → STOP. (Note: this is a smoke "pre" delegation per P1.2 Author Proposal #2; the LH-Tester verifies "post" only.)
- Smoke <7/7 PASS post-migration → STOP. Something regressed.
- `crm.html` parser/loader breaks after the additive tab/section change → STOP, rollback that one file, escalate (likely a syntax error in injected HTML).
- The new `modules/crm/crm-short-links-stats.js` exceeds 250 lines OR introduces a Rule 7 violation (`sb.from()` direct call OK per existing CRM convention; but adding new globals tripping Rule 10 → STOP).

**Iron-Rule-32 keyword-literal awareness (per RETURN_SHAPE_FIX Executor Proposal):** Every Level 2 UPDATE in this SPEC uses tenant-scoped `WHERE` clauses. **NEVER** issue a bare `DELETE FROM <table>` (no WHERE) — not even in test scaffolding. If a code comment or doc string contains the literal `DROP TABLE`, `TRUNCATE`, `DELETE FROM ... ` without a tenant predicate → reword (e.g., "row teardown" instead) before commit, since the destructive-ops gate scans staged content broadly.

---

## 6. Rollback Plan

`ROLLBACK.md` (sibling file in this SPEC folder, doc-context per P1.1 Author Proposal #1) will contain:

1. **DB UPDATE rollback** — for each of the 10 template rows + 2 tenants rows, the JSON backup in `backups/2026-05-14_M3_SHORTGY_TO_INTERNAL_REDIRECT/` is the source of truth. Restore via per-row `UPDATE` from JSON.
2. **short_links rollback** — `DELETE FROM short_links WHERE link_type='template_static' AND created_at >= '<SPEC start ISO>'` (tenant-scoped via the link_type predicate already isolates SPEC-created rows; safe).
3. **Content draft file rollback** — restore from `*_PRE.txt` / `*_PRE.html` copies in the backup folder.
4. **crm.html + crm-short-links-stats.js rollback** — `git revert <commit>` for the MVP-stats commit.
5. **Doc rollback** — `git revert <commit>` for the docs-update commit.

Rollback is **per-step**, not all-or-nothing. If the Executor stops mid-run, only the completed steps need reversal.

Notify Foreman if rollback triggered; SPEC marked REOPEN.

---

## Destructive Operations

Per Iron Rule 32. Four UPDATE/Edit operations against documented row sets — NO `DROP/DELETE/TRUNCATE/git rebase/git reset/git push --force`, NO modification of `main`.

1. **UPDATE on `crm_message_templates.body`** — exactly 10 rows total (`BASE_TEMPLATE_HITS_DEMO=3` demo + `BASE_TEMPLATE_HITS_PRIZMA=7` prizma). Per row: `WHERE id='<UUID>' AND tenant_id='<UUID>'`, single-row JSON backup pre-edit.
2. **UPDATE on `tenants.payment_links`** — exactly 2 rows (`WHERE slug='demo'` + `WHERE slug='prizma'`). Per row: full-row JSON backup pre-edit.
3. **Edits to 4 content-draft files** in `campaigns/supersale/MESSAGES UPDATE/` (2 SMS.txt + 2 EMAIL.html). Per file: `*_PRE` verbatim copy in backup folder.
4. **Additive edit to `crm.html`** (≤ 30 line addition — new nav button + new tab section). Pre-edit copy in backup folder. NOT a removal/rename — purely additive.

All other operations in this SPEC are CREATEs (new `short_links` rows; new file `modules/crm/crm-short-links-stats.js`; new INVENTORY.md / EXECUTION_REPORT.md / FINDINGS.md / ROLLBACK.md inside the SPEC folder; new backup folder) — non-destructive.

Iron-Rule-32 hook regex confirmed pre-authoring: heading is plain `## Destructive Operations` (no `§` prefix per MIGRATION_1 Author Proposal #1).

---

## 7. Out of Scope (explicit)

Things that look related but MUST NOT be touched in this SPEC:

- **`crm_message_log.content` (4,370 rows with short.gy)** — historical audit trail of sent messages. Immutable. **DO NOT MODIFY** even if it would "look cleaner". Same standard as a financial transaction log: history is history.
- **`crm_message_queue.body` (1,170 rows, all `status='sent'`)** — historical render artifacts. Same immutability rule. 0 pending rows confirmed at SPEC authoring time, so no in-flight customer is affected by the cutover.
- **Broadcast-runtime short-link generation** — already internal post-P1.2. No code changes to `send-message/url-builders.ts` or any other EF.
- **Deactivation of the `prizmaoptic.short.gy` account or DNS** — Daniel does that manually after 30 days of zero traffic.
- **Backfilling historical click data from short.gy → internal `short_link_clicks`** — Brief §1 explicitly out-of-scope. From cutover day forward, internal-only. Pre-cutover stats remain in short.gy's UI.
- **301 redirect from `prizmaoptic.short.gy/<code>` → `/r/<code>`** — we don't own the DNS; not technically possible.
- **Charts / filters / exports on the MVP stats page** — defer to P2.5.1 Funnel Health Dashboard (Brief §1 #4). MVP = single sortable table only.
- **Adding link from the new tab to existing CRM screens (cross-linking)** — out of scope; only ONE new tab, nothing else relinked.
- **Iron Rule 18 fix on `short_links_code_unique`** — pre-existing global UNIQUE constraint. Tracked as a finding for next M4 hygiene SPEC; this SPEC works *with* the constraint (8-char random + retry-once on collision matches the runtime pattern).
- **Migration of `tenants.payment_links` to a richer multi-key structure** — Brief §1 mentions `{"50": ..., "75": ...}` future shape; this SPEC only swaps the URL inside the existing `"50"` key. Multi-key expansion is a separate SaaS SPEC.
- **Replacing all `%payment_url_50%` placeholders with hardcoded `/r/<code>`** — placeholders STAY as placeholders; they get resolved at send-time from `tenants.payment_links`. The MIGRATION only swaps what's *inside* `payment_links."50"`. Templates that already use `%payment_url_50%` need no body change for `gmapy` — they will auto-resolve to the new URL.
- **Pre-existing untracked file mass (103 paths at SPEC start)** — leave untouched. Selective `git add` discipline throughout.

### Subset relationships

- INVENTORY's "in-scope" predicate is **statically-embedded** short.gy URLs. The route `resolve-link` will of course also serve any future short.gy-derived `/r/<code>` IF Daniel ever populates one — but that's reactive, not in this SPEC's predicate.

---

## 8. Expected Final State

### New files (all committed to `develop` of `opticalis/opticup`)

- `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/INVENTORY.md` — Step 0 read-only audit (Executor writes during run)
- `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/ROLLBACK.md` — per-step rollback steps with restored JSON references
- `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/EXECUTION_REPORT.md` — Executor's retro
- `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/FINDINGS.md` — surprises + follow-ups
- `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/TEST_REPORT.md` — LH-Tester deliverable (smoke 7/7 post + 3-click probe)
- `modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/FOREMAN_REVIEW.md` — written by Foreman at close (this file's author writes it post-execution)
- `modules/crm/crm-short-links-stats.js` — new MVP stats view JS (≤ 250 lines)

**Gitignored — local-only safety-net (NOT staged, NOT in §8 git-add list, per RETURN_SHAPE_FIX Author Proposal):**
- `modules/Module 4 - CRM/backups/2026-05-14_M3_SHORTGY_TO_INTERNAL_REDIRECT/` (folder + ~22+ files inside per criterion 27)

### Modified files (all committed)

- `crm.html` — additive: 1 new nav button (`data-tab="short-links"`) + 1 new section (initially with `style="display:none"` until the tab activates); ≤ 30 lines added
- `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` — Layer 7 entry annotates `prizmaoptic.short.gy` as DEPRECATED with this SPEC's commit ref; `/r/<code>` confirmed canonical
- `roles/site-overseer/FUNNEL_ROADMAP.md` — row 4 (P1.3) flipped to ✅ CLOSED + Phase 1 COMPLETE banner line added under the Phase 1 table
- `modules/Module 4 - CRM/docs/SESSION_CONTEXT.md` — one-paragraph closure block prepended at top
- `modules/Module 4 - CRM/docs/db-schema.sql` — appendix block documenting the 6 new `short_links` rows + `tenants.payment_links` migration + new ERP file registration
- `modules/Module 4 - CRM/docs/MODULE_MAP.md` — new entry for `modules/crm/crm-short-links-stats.js`
- `campaigns/supersale/MESSAGES UPDATE/registration confirmation/SMS.txt` — short.gy literal replaced with `%payment_url_50%` placeholder (matches the live template body post-migration)
- `campaigns/supersale/MESSAGES UPDATE/registration confirmation/EMAIL.txt` — same: short.gy literal swapped for `%payment_url_50%`
- `campaigns/supersale/MESSAGES UPDATE/COUPON/SMS.txt` — short.gy literal swapped for `%coupon_terms_url%` (Executor confirms this is the right placeholder shape by reading the corresponding live template body; if no placeholder exists today, use the direct `/r/<code>` URL — Executor decides per file context with the live DB row as the reference)
- `campaigns/supersale/MESSAGES UPDATE/COUPON/EMAIL.txt` — same

**No deleted files. No renamed files.**

### DB state (after Step 4)

- `short_links` table: `+6` rows with `link_type='template_static'`, `expires_at='2099-12-31'`, 8-char codes; demo: 2 rows, prizma: 4 rows.
- `crm_message_templates`: 10 rows updated in body (3 demo + 7 prizma); row count unchanged.
- `tenants`: 2 rows updated (payment_links JSONB); row count unchanged.
- All other tables (`crm_message_log`, `crm_message_queue`, `storefront_pages`, `short_link_clicks`, `crm_lead_touchpoints`, `crm_broadcasts`, `crm_events`, `crm_leads`, `crm_event_attendees`, `crm_messaging_rules`, `crm_statuses`): UNTOUCHED.

### Build-side-effect file expectations

This SPEC issues NO `npm run build` / `npm run generate` step. ERP is vanilla HTML/JS, no build pipeline. Storefront is untouched in this SPEC. Therefore: zero build drift expected.

### Docs updated checklist

- [x] M4 `SESSION_CONTEXT.md` — closure block prepended
- [x] M4 `db-schema.sql` — appendix block
- [x] M4 `MODULE_MAP.md` — new JS file entry
- [x] `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` — Layer 7 DEPRECATED marker
- [x] `roles/site-overseer/FUNNEL_ROADMAP.md` — P1.3 ✅ + Phase 1 COMPLETE
- [ ] `MASTER_ROADMAP.md` §3 — NO (Phase 1 closure ≠ module-phase transition; tracked at next M4 Integration Ceremony per project pattern, same as P1.1 + P1.2)
- [ ] `docs/GLOBAL_MAP.md` / `docs/GLOBAL_SCHEMA.sql` — NO (Integration Ceremony deferred; new short_links rows + JS file are M4 internals)
- [ ] `TECH_DEBT.md` — OPTIONAL: new entry `M4-DEBT-IRON-RULE-18-SHORT-LINKS-CODE-UNIQUE-GLOBAL` (pre-existing); batch with next M4 hygiene SPEC, not this SPEC's commit
- [ ] `M4 CHANGELOG.md` — NO (out-of-band SPEC; next phase close batches it)

---

## 9. Commit Plan

Plan for 5 commits. Executor may consolidate the DB+content+stats commits into fewer if logical (e.g., one atomic "feat(m4)..." for the DB + content + ERP page); the retrospective commit MUST stand alone at the end.

1. **`docs(spec): seal M3_SHORTGY_TO_INTERNAL_REDIRECT SPEC`** — adds `SPEC.md` + this folder shell.
2. **`docs(spec): M3_SHORTGY_TO_INTERNAL_REDIRECT Step 0 INVENTORY`** — adds `INVENTORY.md` after read-only audit + ROLLBACK.md scaffolding. Backup folder created (gitignored).
3. **`feat(m4,db+templates+config): migrate short.gy → /r/<code> for templates and tenants.payment_links`** — INSERTs 6 short_links rows + UPDATEs 10 template rows + UPDATEs 2 tenants rows. Backup JSON files alongside.
4. **`feat(m4,content): sync supersale message drafts to placeholder form`** — edits 4 content-draft files under `campaigns/supersale/MESSAGES UPDATE/`.
5. **`feat(m4,erp): add MVP Short Link Stats tab in CRM`** — `modules/crm/crm-short-links-stats.js` + `crm.html` additive change.
6. **`docs(m4,roadmap): close P1.3 + mark Phase 1 COMPLETE`** — KNOWLEDGE_MAP + FUNNEL_ROADMAP + M4 SESSION_CONTEXT + db-schema + MODULE_MAP. All doc edits in one commit so the closure is atomic.
7. **`chore(spec): close M3_SHORTGY_TO_INTERNAL_REDIRECT with retrospective`** — EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md (after LH-Tester signs off).

(Note: commit 7's title says "retrospective" but does NOT contain a destructive keyword — IR-32 gate clean.)

Co-author trailer on every commit:
```
Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

---

## 10. Dependencies / Preconditions

- P1.4 + P1.1 + P1.2 all CLOSED 2026-05-14 (verified at §0 baseline `BASE_PHASE_1_CLOSED_BEFORE_P1_3=3/4`).
- `resolve-link` EF v5 deployed and serving `/r/<code>` (confirmed in `docs/GLOBAL_MAP.md:204`).
- `short_link_clicks` table + `crm_lead_touchpoints` table both live (M4_MESSAGE_PERFORMANCE_TRACKING + M3_UTM_TRIPLE_LAYER_PERSISTENCE — both shipped 2026-05-14).
- `createShortLink` helper in `send-message/url-builders.ts` provides the 8-char alphanumeric code pattern the SPEC mirrors (Executor may use the same generation algorithm via JS in a one-shot script OR via SQL `substring(md5(random()::text) || md5(random()::text), 1, 8)` style — Executor's choice, must verify collision-free).
- localhost server reachable on `http://localhost:3000` (ERP) for LH-Tester (the storefront localhost on `:4321` is not strictly required since `/r/<code>` is served by the deployed EF, but LH-Tester may use the test harness's tenant storefront origin).

### Browser readiness pre-flight

SPEC's QA combines:
- Curl/HTTP-level probes (criterion 7, 22) — no browser needed
- Smoke test script (criterion 23) — no browser needed
- LH-Tester manual page render check (criterion 21) — browser-QA needed

**Executor's start-of-execution pre-flight:** Confirm Chrome is running with `--remote-debugging-port=9222` BEFORE editing any file (criterion 21 will need it at LH-Tester time). If not detected → surface in readiness sentence: "Browser-QA required by SPEC §3 criterion 21 but Chrome debug-port not detected — please start Chrome with `--remote-debugging-port=9222` before I proceed past commit 5."

---

## 11. Lessons Already Incorporated

Cross-Reference Check completed 2026-05-14 against GLOBAL_SCHEMA + KNOWLEDGE_MAP + M4 db-schema. **0 name collisions** (the proposed new JS file `crm-short-links-stats.js` is unique; `link_type='template_static'` is a new free-text value with no CHECK constraint conflict; `crm.html` `data-tab="short-links"` does not collide with the 10 existing data-tab names enumerated in §0).

Harvested proposals from the 3 most recent FOREMAN_REVIEWs in this module:

- **FROM `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Author Proposal #1 (function-signature DROP discipline)** → NOT APPLICABLE (this SPEC modifies no PL/pgSQL function argument lists).
- **FROM `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Author Proposal #2 (smoke pre/post in Pipeline mode)** → APPLIED in §3 criteria 23 + 24 (split into post-LH-Tester-deliverable and pre-delegated-to-P1.2-baseline) AND in §5 stop-trigger ("Smoke 7/7 PASS pre-migration baseline is missing OR P1.2 TEST_REPORT.md cannot be located → STOP").
- **FROM `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Executor Proposal #1 (skip MCP simplified-payload retry — straight to CLI)** → NOT APPLICABLE (no EF deploy in this SPEC).
- **FROM `M4_BROADCAST_ID_PROPAGATION/FOREMAN_REVIEW.md` Executor Proposal #2 (pg_cron debugging recipes)** → NOT APPLICABLE (no pg_cron interaction in this SPEC).
- **FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #1 (`_down.sql` gate-compat → ROLLBACK.md doc-context)** → APPLIED — §6 + §8 ROLLBACK.md is a SPEC-folder Markdown file (doc-context per regex), no `_down.sql` artifacts in this SPEC.
- **FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Author Proposal #2 (Pipeline-mode escalation discipline)** → APPLIED in §4 ("Pre-authorized auto-pivots" section) + §5 stop-triggers (enumerates the 4 legitimate Daniel-escalations).
- **FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Executor Proposal #1 (auto-CLI EF deploy on MCP 5xx)** → NOT APPLICABLE.
- **FROM `M3_UTM_TRIPLE_LAYER_PERSISTENCE/FOREMAN_REVIEW.md` Executor Proposal #2 (function-signature-change awareness)** → NOT APPLICABLE.
- **FROM `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/FOREMAN_REVIEW.md` Author Proposal (gitignore-awareness on §8 paths)** → APPLIED — §8 separates "New files (committed)" from "Gitignored — local-only safety-net (NOT staged)". The backup folder is documented but explicitly excluded from git add.
- **FROM `M4_REGISTER_LEAD_TO_EVENT_RETURN_SHAPE_FIX/FOREMAN_REVIEW.md` Executor Proposal (Iron-Rule-32 keyword-literal awareness)** → APPLIED in §5 (tenant-scoped WHERE on every UPDATE; no bare DELETE FROM; reword DROP TABLE in comments before commit).

**Plus from SPEC_TEMPLATE §0 baselines policy** — every numeric symbol in the §0 Baselines sub-table cites the runnable command that produced it; all measured at SPEC authoring time, none from memory.

---

## 12. Pre-Merge Checklist

Every item must pass before the Executor closes this SPEC. Failing any → SPEC is REOPEN, not CLOSED.

- [ ] All §3 success criteria (1–34) pass with actual values captured in EXECUTION_REPORT.md §2.
- [ ] **Integrity Gate (Iron Rule 31):** `npm run verify:integrity` returns exit 0 or 2. Null-byte ERROR blocks closure.
- [ ] **Destructive Ops Gate (Iron Rule 32):** `npm run verify` includes the destructive-ops-declared.mjs check; exit 0.
- [ ] `git status --short` returns empty.
- [ ] HEAD pushed to `origin/develop` of `opticalis/opticup`. (No storefront commits expected; if any are produced, push to `origin/develop` of `opticalis/opticup-storefront`.)
- [ ] EXECUTION_REPORT.md + FINDINGS.md + TEST_REPORT.md written in this SPEC folder.
- [ ] M4 SESSION_CONTEXT, M4 db-schema, M4 MODULE_MAP updated.
- [ ] KNOWLEDGE_MAP + FUNNEL_ROADMAP P1.3 + Phase 1 COMPLETE banner updated.
- [ ] Backup folder populated and contains ≥ 22 files (10 template JSONs + 2 tenant JSONs + 4 content-draft `*_PRE` copies + 6 doc snapshots).
- [ ] Smoke 7/7 PASS post-migration via LH-Tester `TEST_REPORT.md`; smoke pre-migration baseline delegated to P1.2 TEST_REPORT.md commit `c8b5279` and cited in EXECUTION_REPORT.md §6.
- [ ] 3 random `/r/<code>` curl probes returned 302 + matching Location AND produced `short_link_clicks` + `crm_lead_touchpoints` rows within 10s (LH-Tester evidence).

---

*End of SPEC.md.*
