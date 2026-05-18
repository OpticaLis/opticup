# EXECUTION_REPORT — M3_DEMO_WEBHOOK_SCRUB

**SPEC:** `modules/Module 3 - Storefront/docs/specs/M3_DEMO_WEBHOOK_SCRUB/SPEC.md`
**Executor:** opticup-executor (Claude Opus 4.7, Windows desktop)
**Started:** 2026-05-18 ~12:40 UTC
**Closed:** 2026-05-18 ~13:00 UTC
**Status:** 🟡 **PARTIAL** — 8 of 9 success criteria pass; criterion #7 fails (demo home `<title>` still says פריזמה because Astro renders it from `storefront_pages.meta_title`, NOT from `storefront_config.seo.title` as the SPEC §2 assumed).

---

## 1. Summary

The two real SaaS-isolation issues are fully closed: demo's `/supersale/` form no longer POSTs to prizma's Make webhook (0 occurrences of `jewyavndaly` in demo storefront_pages), and demo's 29 leaked prizma support emails (`service@`, `nayedet@`, `events@`) are rewritten to `demo@prizma-optic.co.il`. Demo's `storefront_config.seo.title` + `.description` now say "אופטיקה דמו | סביבת בדיקה".

What didn't land: the rendered `<title>` tag on `https://opticup-storefront-demo.vercel.app/` still says "אופטיקה פריזמה — משקפי ראייה ושמש מהמותגים המובילים". Investigation revealed the rendered title comes from `storefront_pages.meta_title` on the homepage row (`slug='/', lang='he'`), not from `storefront_config.seo.title`. The SPEC §2's F-3 source-of-truth assumption was wrong. Blast radius: 48 of 64 demo storefront_pages contain פריזמה/prizma in `meta_title`, 36 in `meta_description`, 10 in `title`. Fixing these is outside this SPEC's §4 declared destructive list (which only authorizes UPDATE on the `blocks` column for storefront_pages). Per Iron Rule 32, did not attempt mid-run. Documented in FINDINGS as primary follow-up `M3_DEMO_PAGE_META_REWRITE`.

Prizma production confirmed untouched (curl /supersale/ still has jewyavndaly, 64 published pages, service@ still present in 29 prizma pages).

No Vercel redeploy needed — storefront is SSR, DB changes propagated immediately.

---

## 2. Pre-flight (SPEC §3 Step 0)

| Check | Expected | Actual | Result |
|---|---|---|---|
| 0a demo tenant exists | 1 | 1 | ✅ |
| 0b webhook count | 1 | 1 | ✅ |
| 0c email count (total) | 29 | 29 (24 service + 3 nayedet + 2 events) | ✅ |
| 0d seo still says פריזמה | true | true (`אופטיקה פריזמה | משקפיים ועדשות מגע`) | ✅ |
| 0e prizma published pages | 64 | 64 | ✅ |
| 0f coord lock + collision | clean | claimed `pid-26580-664728eb`, no collision | ✅ |

All 6 pre-flight checks passed.

---

## 3. What was done

### Step 1 — Snapshots (rollback safety)
- `BACKUPS/demo_blocks_pre.json` — 29 rows (the OR `LIKE '%jewyavndaly%' OR LIKE '%@prizma-optic.co.il%'` deduped 1: supersale HE contains both webhook AND emails). 433 KB.
- `BACKUPS/demo_seo_pre.json` — 1 row, demo's pre-SPEC seo object.

Snapshot delivery method: query result exceeded MCP's 30k char limit, so used Python to slice the saved tool-results file and unwrap the doubly-escaped JSON envelope. Documented in §7 as a real-time decision.

### Step 2 — Webhook scrub (1 row affected) ✅
Used postgres E-string `E'webhook_url=\\"...\\"'` pattern derived from prior SPEC's hex-dump finding. The 2 stored bytes `5c 22` (backslash + quote) are escaped as `\\\"` in an E-string, which is 4 source chars per stored quote.
- Verification: `count(*) WHERE blocks::text LIKE '%jewyavndaly%' AND tenant_id=demo` = **0**
- jsonb_typeof(blocks) = **array** (Rule 31 integrity preserved)
- Empty `webhook_url=""` confirmed present in updated row

### Step 3 — Email rewrite (24 + 3 + 2 = 29 rows affected) ✅
Three separate UPDATE statements, one per email pattern. Used a single CTE with 3 RETURNINGs to keep all counts visible.
- 3a service@: 24 rows affected (matches SPEC §10 expected 24)
- 3b nayedet@: 3 rows affected (matches expected 3)
- 3c events@: 2 rows affected (matches expected 2)
- Verification: 0 rows still have old service/nayedet/events emails; 29 rows now have `demo@prizma-optic.co.il`; 0 non-array blocks.

### Step 4 — SEO identity flip (1 row affected) ✅
Used `jsonb_set(jsonb_set(seo, '{title}', ...), '{description}', ...)` to update both keys in a single UPDATE. Both values returned from RETURNING match the SPEC's target strings (`אופטיקה דמו | סביבת בדיקה` + `סביבת בדיקה (demo) של פלטפורמת אופטיקה. תוכן מבוסס על אופטיקה פריזמה לצורך טסטים.`).

**Note:** this UPDATE succeeded but DID NOT flip the rendered `<title>` (see D-1 below).

### Step 5 — Curl verification
| Check | Expected | Actual | Result |
|---|---|---|---|
| A. /supersale/ no jewyavndaly | 0 | 0 | ✅ |
| B. /supersale/ webhook_url="" rendered literally | yes | no match — Astro strips the attribute from rendered HTML | 🟡 spirit-satisfied |
| C. /privacy/ no prizma support emails | 0 | 0 | ✅ |
| D. /privacy/ has demo@ | informational | 1 | ℹ️ |
| E. demo home `<title>` contains דמו | yes | NO — title is `אופטיקה פריזמה — משקפי ראייה ושמש מהמותגים המובילים` | ❌ |
| F. prizma /supersale/ still has jewyavndaly | ≥1 | 1 | ✅ |
| F. prizma /supersale/ has service@ | informational | 1 | ℹ️ (unchanged) |
| (SC #9) prizma published pages | 64 | 64 | ✅ |

All curl HTML responses saved to `BACKUPS/demo-ss-post.html`, `demo-privacy-post.html`, `demo-home-post.html`, `prizma-ss-post.html`.

---

## 4. Deviations from SPEC

### D-1. Step 5-E fails — rendered `<title>` source is `storefront_pages.meta_title`, not `storefront_config.seo.title`
**🟡 Primary partial-close reason.**

SPEC §2 stated: "The `<title>` tag the storefront emits is built from `seo.title`. Updating these 2 keys flips the demo's branded identity." Step 4's UPDATE on `storefront_config.seo.title` did execute successfully (verified via SELECT RETURNING) but did NOT change the rendered `<title>`. Investigation:

- Curl of demo `/` returns `<title>אופטיקה פריזמה — משקפי ראייה ושמש מהמותגים המובילים</title>`
- This string does NOT match what's stored in `storefront_config.seo.title` (which is now `אופטיקה דמו | סביבת בדיקה`)
- DB probe found 3 demo `storefront_pages` rows for `slug='/'` (one per language: he, en, ru), all with `page_type='homepage'`, all with `meta_title` + `meta_description` copied verbatim from prizma. The HE row's `meta_title` is the exact string the browser rendered.
- Conclusion: Astro layouts use `storefront_pages.meta_title` (per-page) as the primary source for `<title>`, with `storefront_config.seo.title` as a fallback only. The SPEC's premise was wrong.

**Blast radius** (probed but NOT fixed in this SPEC):
- 48 of 64 demo pages have `meta_title` containing פריזמה / prizma
- 36 of 64 have `meta_description` containing פריזמה / prizma
- 10 of 64 have `title` containing פריזמה / prizma

**Why not auto-fixed:** SPEC §4 declared destructive list only authorizes UPDATE on `storefront_pages.blocks` and `storefront_config.seo`. UPDATE on `storefront_pages.meta_title` / `meta_description` / `title` is NOT in the declared list. Per Iron Rule 32 (non-overridable), the Executor cannot perform a destructive operation outside §4. Same regime as the prior SPEC's webhook restraint.

**Documented in FINDINGS as F-1** with a sketch for follow-up SPEC `M3_DEMO_PAGE_META_REWRITE`.

### D-2. Step 5-B verification interpretation
SPEC §6 Step 5-B verifies: `grep -oE 'webhook_url="[^"]*"' /tmp/demo-ss-post.html` → expected `webhook_url=""`. Actual: zero matches at all. Investigation: Astro processes the form block's html attribute server-side and emits a JS form-submit closure (`onsubmit="return scSubmitForm_sc_form_b0s1e4(event)"`). The literal `webhook_url=` text doesn't survive into the rendered HTML. The webhook URL itself (`jewyavndaly...`) IS absent (confirmed by check A: 0 hits). So the SaaS-isolation INTENT of check B is satisfied even though the literal pattern doesn't match. Logged as 🟡 spirit-satisfied, not a hard failure.

### D-3. MCP query result exceeded 30k char limit (Step 1)
The `json_agg()` snapshot returned 402,279 chars across the 29 affected rows, exceeding MCP's hard limit (results auto-saved to disk file). Switched to Python script that unwraps the doubly-escaped JSON envelope (outer MCP `{"result":...}` → inner `[{"j":"<escaped>"}]` → actual snapshot array) and writes the clean array to `BACKUPS/demo_blocks_pre.json` (433KB). Took ~3 extra min. Logged in §7 as an executor-skill improvement proposal.

---

## 5. Decisions made in real time

1. **Coordination lock collision resolution (Step 0f)** — `check-collision` without `--self` flag treats own lock as a collision. Passed `--spec-slug` + `--session-id pid-26580-664728eb` (read from lock filename) to identify ownership. The prior SPEC's FINDINGS F-6 already flagged this UX; not a new issue.
2. **Step 1 snapshot via Python script** — chose the file-extraction path instead of querying row-by-row (which would have been 29 separate SELECTs) or pg_dump (no shell credentials). Net: ~3 min extra vs. ~10 min for row-by-row.
3. **Step 5-B 🟡-not-❌ classification** — the literal `webhook_url=""` doesn't render, but the spirit (no webhook URL exposed) IS satisfied (check A confirms 0 jewyavndaly). Logged as spirit-satisfied 🟡 rather than hard fail.
4. **Did not retry seo.title fix once D-1 surfaced** — per SPEC §13 Notes: "If they [the patterns] don't [work], STOP and write a FINDINGS entry — do not retry blindly." Applied to D-1: the seo.title write SUCCEEDED, the render is unaffected. The problem is the architectural assumption, not the SQL. Stop, document, propose follow-up SPEC.
5. **Continue Steps 4-5 + close PARTIAL after D-1 surfaced** — per ABSOLUTE RULES (`feedback_no_polish_by_validation` + `feedback_never_propose_wind_down`) and matching the prior SPEC's chosen interpretation.

---

## 6. Iron-Rule Self-Audit

| Rule | Compliance | Evidence |
|---|---|---|
| Rule 14 (tenant_id NOT NULL) | ✅ | All UPDATEs include `WHERE tenant_id='8d8cfa7e-...'` |
| Rule 15 (RLS) | N/A | No new tables/policies |
| Rule 18 (UNIQUE) | N/A | No new constraints |
| Rule 21 (No orphans) | ✅ | Probed `storefront_pages.meta_title`/`meta_description`/`title` columns before deciding D-1 was out-of-scope. No new tables/columns created. |
| Rule 22 (Defense-in-depth tenant_id) | ✅ | Every read + write includes explicit `tenant_id` predicate |
| Rule 23 (No secrets) | ✅ | No PINs/tokens. The `jewyavndaly...` webhook URL appears in BACKUPS/demo_blocks_pre.json (rollback snapshot, intentional) and in EXECUTION_REPORT (referenced by name, not a new exposure — already documented in prior SPEC + public on prizma's site). |
| Rule 31 (Integrity gate) | ✅ | Ran `npm run verify:integrity` pre-execution: 2 files scanned, 1ms, clean. |
| Rule 32 (Destructive Ops Gate) | ✅ | 3 destructive ops match SPEC §4 declared list exactly: UPDATE storefront_pages.blocks (1 row Step 2, 29 rows Step 3), UPDATE storefront_config.seo (1 row Step 4). Did NOT attempt UPDATE on storefront_pages.meta_title/.meta_description/.title for D-1 — that would have been undeclared. |

---

## 7. What would have helped me go faster

1. **A SPEC-author guide rule: "Before declaring a SQL field as 'the source of truth for X', curl the rendered page and grep for the exact value to confirm the link."** D-1 was an avoidable defect. The SPEC author probed `storefront_config.seo.title` and reasonably assumed it backs the `<title>` tag, but never confirmed by curl. A simple `grep -F "$(SELECT seo->>'title' ...)" demo-home.html` would have surfaced the disconnect during SPEC authoring.
2. **An MCP execute_sql wrapper that splits large `json_agg` results across N pages, OR a `--save-to-file <path>` flag that bypasses the 30k char limit cleanly.** D-3 wasted ~3 min on Python unwrapping that should have been a 1-line `--save-to-file` invocation.
3. **A `pipeline-coordination.mjs check-collision --self` shortcut** (still tracked from prior SPEC F-6 — not yet implemented). Would have saved ~30 seconds parsing the lock filename.

---

## 8. Self-Assessment (1-10)

- **(a) Adherence to SPEC:** **8/10** — followed the protocol exactly, performed all declared writes, held Iron Rule 32 on the D-1 unauthorized UPDATE. -2 because the SPEC's F-3 assumption was wrong and 🟡 closed; the Executor didn't catch it in pre-flight either (would have required curl during 0a-0e).
- **(b) Adherence to Iron Rules:** **10/10** — every UPDATE explicitly tenant-scoped to demo, blocks integrity preserved (jsonb_typeof check post-write), no undeclared destructive ops, integrity gate clean.
- **(c) Commit hygiene:** **9/10** — single commit with explicit-filename `git add -f` for BACKUPS, conventional message starting with required prefix, body distinguishes 🟢 from 🟡 from ❌ findings.
- **(d) Documentation currency:** **8/10** — EXECUTION_REPORT + FINDINGS + 2 snapshots + 4 curl artifacts in SPEC folder. No project-wide reference-file updates needed (no schema change). One gap: the prior SPEC's FOREMAN_REVIEW.md exists but wasn't read by the Executor (untracked file, would need to be read for full continuity). Logged for future executors.

---

## 9. Two proposals to improve opticup-executor (this skill)

### Proposal #1 — Pre-execution "render-source confirmation" probe for SPEC F-* fixes
**Where:** `.claude/skills/opticup-executor/SKILL.md`, new bullet in "Step 1.5 — DB Pre-Flight Check (MANDATORY before any DDL or schema-touching work)" sub-section after the existing rule about jsonb-text hex-dump (proposed by prior SPEC):

> **Render-source confirmation probe (added 2026-05-18 from M3_DEMO_WEBHOOK_SCRUB D-1).** When a SPEC §2 (or §3 background) claims "X is the source of truth for the rendered Y", the Executor MUST curl the rendered page during Step 0 pre-flight and verify the assertion. Quick recipe:
> ```bash
> # Suppose the SPEC says storefront_config.seo.title backs the <title> tag.
> # During Step 0:
> ACTUAL_RENDERED=$(curl -sL https://demo.vercel.app/ -A "Mozilla/5.0" | grep -oE '<title>[^<]+</title>')
> CLAIMED_SOURCE=$(SELECT seo->>'title' FROM storefront_config WHERE tenant_id=demo)
> # If $ACTUAL_RENDERED does NOT contain $CLAIMED_SOURCE → STOP and tell the Foreman the SPEC's source assumption is wrong, BEFORE attempting the UPDATE.
> ```
> Rationale: D-1 wasted a Step 4 UPDATE on the wrong table. A 30-second curl probe pre-flight would have caught it.

### Proposal #2 — Document the "spirit-satisfied 🟡" verification category
**Where:** `.claude/skills/opticup-executor/SKILL.md`, in the "Verification After Changes" sub-section. Add a paragraph after the existing bullets:

> **Spirit-satisfied 🟡 verifications.** When a SPEC's literal verification pattern (e.g. `grep -oE 'webhook_url="[^"]*"'` expecting `webhook_url=""`) doesn't match in rendered output BUT the underlying intent is satisfied (e.g. the webhook URL is verifiably absent via a different grep), classify as 🟡 spirit-satisfied — not ❌ failure. Document the discrepancy in EXECUTION_REPORT §4 Deviations so the Foreman can refine the SPEC's verification recipe for next time. Example: SSR rendering may transform/strip server-side input attributes; the SaaS-isolation goal is still met if the sensitive value never appears in the response body.

---

*End of EXECUTION_REPORT.md. Next: Foreman review (writes FOREMAN_REVIEW.md).*
