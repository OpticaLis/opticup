# SPEC — M3_FUNNEL_PIXEL_BACKWIRE

> **Location:** `modules/Module 3 - Storefront/docs/specs/M3_FUNNEL_PIXEL_BACKWIRE/SPEC.md`
> **Authored by:** opticup-strategic (Foreman) — Full-Auto Pipeline, Opus 4.7
> **Authored on:** 2026-05-16
> **Module:** 3 — Storefront (ERP-side authority per CLAUDE.md §7 phase-label ownership)
> **Phase:** Funnel Phase 2 — P2.1 measurement-loop completion (back-wire half)
> **Author signature:** Foreman / Architect chat 2026-05-16 morning

---

## 0. Pre-Authoring Reality Check

Brief read in full 2026-05-16 morning. Cross-reference sweep complete. **Two Brief-level inaccuracies caught at author time per Author Proposal #1 from `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/FOREMAN_REVIEW.md` (2026-05-15) — storefront-form code-path discovery at SPEC-author time.** Both are corrected in this SPEC's §3 + §8 against actual repo state, not against the Brief's literal claims.

### Iron Rule 21 — existing-mechanism sweep

| Probe | Result |
|---|---|
| `Grep "pixel-fired\|pixel-fire-back\|fb_pixel_fired_at" supabase/functions/` | 0 hits — no existing EF or RPC implements this back-wire. |
| `ls supabase/functions/` | 25 EFs enumerated; none named `pixel-fired` or similar. |
| `Grep "fb_pixel_fired_at" --type ts` (storefront repo) | 0 hits — storefront does not currently POST anywhere to set this column. |

**Conclusion:** `pixel-fired` EF is genuinely new. Rule 21 clean.

### Brief Drift #1 — pixel-firing code-path is UNIFIED, not per-template

The Brief §3 says: *"Thank-you-page templates (HE + EN + RU + multi variants): after `fbq('track','Lead',...,{eventID:uuid})` fires, append a `fetch()` POST."* This is INCORRECT. The pixel-firing in storefront is **a single unified code-path**, not per-template:

- `src/lib/analytics.ts::getPixelEventsScript(events)` generates inline JS that fires `fbq('track', r.e, ...)` based on URL path matching against `pixel_events` rules from `storefront_config.analytics.pixel_events`.
- This function is called exactly once, from `src/layouts/BaseLayout.astro:212`, and the resulting `<script>` is injected on **every** BaseLayout-using page (which includes all thank-you-page URLs across all locales).
- There are NO separate HE/EN/RU/multi thank-you-page files with hardcoded pixel-firing code.

**The actual scope is ONE edit to `src/lib/analytics.ts::getPixelEventsScript()` — not 4-8 edits to per-template files.** Stop-trigger "more than one thank-you-page firing path exists" is FALSE — there is exactly one. The Brief's intent is preserved (every variant of the thank-you-page that fires the pixel must also fire the back-wire POST); the implementation locus is narrower than the Brief specified.

### Brief Drift #2 — referenced doc does not exist

The Brief §3 also says: *"Update `roles/site-overseer/knowledge-build/funnel-q3/M4_PIXEL_VALIDATION_GAP_QUERY.md` §4: mark back-wire as DEPLOYED, remove the caveat banner instruction for P2.2b."* This file **does not exist** — `roles/site-overseer/knowledge-build/` contains only `ACTIVATION_PROMPT.md`, `EXECUTION_REPORT.md`, `FINDINGS.md`, `KNOWLEDGE_MAP.md`, `SPEC.md` (no `funnel-q3/` subfolder). Substitute deliverable: update `roles/site-overseer/FUNNEL_ROADMAP.md` row P2.2 (currently `PLANNED — substrate ready...`) to flip to `UNBLOCKED — back-wire live 2026-05-16 via M3_FUNNEL_PIXEL_BACKWIRE` AND remove the caveat language from `docs/FB_CAPI.md` §1 architecture diagram.

### tenant_id derivation on thank-you page (D5)

`src/layouts/BaseLayout.astro:42-66` accepts `tenantId?: string | null` as a prop, currently passed through from page-level Astro components after `resolveTenant()` returns the tenant config. **The function `getPixelEventsScript(events)` currently does NOT receive `tenantId`** — this SPEC extends the function signature to `getPixelEventsScript(events, tenantId)` and bakes `tenantId` as a string literal into the generated inline JS. `BaseLayout.astro:212` is updated to pass the new arg. Stop-trigger "Storefront thank-you-page lacks derivable tenant_id" is FALSE — tenant_id IS derivable, it just needs to be threaded through one more call site.

### Origin-allowlist canonical pattern (pre-flight per Brief)

The Brief says: *"Origin-allowlisted to the same domains as `lead-intake` + `submit-lead` + `fb-capi-dispatch`."* `lead-intake/index.ts:35-39` uses `*` wildcard (the pre-SECURITY_HOTFIX pattern). `submit-lead/index.ts:29-49` uses the canonical post-SECURITY_HOTFIX_2026_05_13 allowlist: an `ALLOWED_ORIGINS_EXACT` Set + a `VERCEL_PREVIEW_RE` regex + an `isAllowedOrigin()` function returning bool. **The new `pixel-fired` EF MUST mirror `submit-lead`'s allowlist byte-for-byte** (SaaS-clean, tight, current pattern). Following `lead-intake`'s wildcard would be a regression.

### Pre-existing untracked files survey (per Bounded Autonomy clean-repo discipline)

`git status --porcelain | grep '^??'` returned 4 untracked files at SPEC author time:
- `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15_ACTIVATION_PROMPT.md`
- `modules/Module 1.5 - Shared Components/architecture-brief/OVERNIGHT_KNOWLEDGE_BUILD_2026_05_15_BRIEF.md`
- `modules/Module 3 - Storefront/architecture-brief/M3_FUNNEL_PIXEL_BACKWIRE_ACTIVATION_PROMPT.md` (THIS SPEC's activation prompt)
- `modules/Module 3 - Storefront/architecture-brief/M3_FUNNEL_PIXEL_BACKWIRE_BRIEF.md` (THIS SPEC's Brief)

**Executor instruction:** leave all 4 untracked alone. Use selective `git add <filename>` throughout — never `git add -A`, never `git add .`. The 2 Brief files for this SPEC are part of the project's permanent record but their commit-or-archive decision belongs to a later session (or to the Module Close Ceremony).

### Lessons applied from prior FOREMAN_REVIEW.md files

| From | Lesson | Applied here |
|---|---|---|
| `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/FOREMAN_REVIEW.md` Author Proposal #1 | Storefront-form code-path discovery at SPEC author time — grep at author time for the EF caller. | APPLIED — caught Brief Drift #1 above. Pre-flight grepped `fbq('track','Lead'` across storefront repo and discovered the unified single-function code-path. |
| `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/FOREMAN_REVIEW.md` Author Proposal #2 | E2E test-data state probe for SPECs requiring fresh demo submissions. | APPLIED — §3 SC #11 demands fresh-UUID E2E submission; §10 Dependencies authorizes Level 2 soft-delete of stale demo test rows if approved phones already have active rows. |
| `M4_FB_CAPI_HYBRID_DEDUPLICATION/FOREMAN_REVIEW.md` Author Proposal #2 | Rollback plans must use only `git`, no unverified CLI. | APPLIED — §6 uses only `git` + Supabase MCP `update_edge_function`/delete. |
| `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 | Headings use `## N.` plain numbered, no `§` prefix. | APPLIED — all headings here are plain numbered. |

### Baselines (referenced by §3)

| Symbol | File | Metric | Value (captured 2026-05-16) |
|---|---|---|---|
| `BASE_LINES_analytics_ts` | `opticup-storefront/src/lib/analytics.ts` | `wc -l` | 121 |
| `BASE_LINES_BaseLayout` | `opticup-storefront/src/layouts/BaseLayout.astro` | `wc -l` | ≥212 (need only 1-line change at :212) |
| `BASE_EF_COUNT` | `supabase/functions/` | directories with `index.ts` | 25 (will become 26 with `pixel-fired`) |
| `BASE_FB_CAPI_MD_LINES` | `docs/FB_CAPI.md` | `wc -l` | 274 |

---

## 1. Goal

Close the FB CAPI measurement loop by wiring the storefront thank-you-page Pixel-fire event back to the ERP. After this SPEC ships: when the browser Pixel actually fires on the thank-you page (vs being merely dispatched server-side via CAPI), the storefront POSTs `{event_id, tenant_id}` to a new `pixel-fired` Supabase Edge Function which atomically UPDATEs `crm_leads.fb_pixel_fired_at = NOW()`. P2.2 dashboard becomes meaningful; before this SPEC, the column stays NULL forever and the dashboard would show 100% gaps.

---

## 2. Background & Motivation

P2.1 of `roles/site-overseer/FUNNEL_ROADMAP.md` shipped 2026-05-15 evening: ERP-side substrate (`M4_FB_CAPI_HYBRID_DEDUPLICATION`) + storefront-side handoff (`M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF`). Both columns on `crm_leads` exist: `fb_event_id` populates from form submit; `fb_pixel_fired_at` was added in anticipation but left NULL because the back-wire was explicitly DEFERRED (P2.1 SC #12 — observational only). This SPEC delivers that deferred half. Without it, the `crm_capi_dispatch_queue.status='sent'` row tells you CAPI dispatched, but nothing tells you whether the browser Pixel actually fired (ad-blocker? redirect failure? user closed tab before page-load?). The back-wire is the only mechanism that distinguishes "CAPI sent" from "Meta actually saw the dedup'd browser event."

---

## 3. Success Criteria (Measurable)

| # | Criterion | Expected value | Verify command |
|---|-----------|---------------|----------------|
| 1 | Branch state both repos | On `develop`, clean | `git status` → "nothing to commit" in both repos |
| 2 | Commits produced — ERP | 2 commits (EF + docs) | `git log origin/develop..HEAD --oneline \| wc -l` → 2 (before retrospective commits at SPEC close) |
| 3 | Commits produced — storefront | 1-2 commits (analytics.ts + BaseLayout.astro + docs) | same as #2 in storefront repo |
| 4 | New EF file — ERP | `supabase/functions/pixel-fired/index.ts` exists | `ls supabase/functions/pixel-fired/index.ts` exit 0 |
| 5 | EF source line count | ≤ 100 lines | `wc -l supabase/functions/pixel-fired/index.ts` → ≤100 |
| 6 | EF deployed to Supabase | `pixel-fired` listed | `mcp__claude_ai_Supabase__list_edge_functions` returns row with `slug='pixel-fired'` and `verify_jwt=false` |
| 7 | POST valid UUID + valid tenant_id + allowed origin | 200 + `{ok:true, updated:1}` | `curl -X POST <project>/functions/v1/pixel-fired -H 'Origin: https://opticup-storefront-demo.vercel.app' -d '{"event_id":"<uuid>","tenant_id":"8d8cfa7e-ef58-49af-9702-a862d459cccb"}'` (after seed lead with that fb_event_id exists on demo) |
| 8 | Idempotency — second POST same event_id | 200 + `{ok:true, updated:0}` | repeat #7 |
| 9 | Bad UUID | 400 + `{ok:false, error:"invalid_event_id"}` | `curl ... -d '{"event_id":"not-a-uuid","tenant_id":"..."}'` |
| 10 | Bad origin | 403 | `curl ... -H 'Origin: https://evil.example.com' ...` |
| 11 | E2E on demo — form submit → thank-you-page → `crm_leads.fb_pixel_fired_at` set within 5s | populated within 5s | Localhost-Tester runs supersale form on demo storefront, then Supabase MCP `SELECT fb_pixel_fired_at FROM crm_leads WHERE fb_event_id='<uuid>' AND tenant_id='<demo>'` ≤5s after redirect |
| 12 | Graceful degradation — direct nav (no `?fbe=`) | NO POST issued (verify in Chrome DevTools Network panel) | Localhost-Tester opens thank-you-page directly; no `pixel-fired` request in Network |
| 13 | `keepalive: true` on storefront fetch | source contains `keepalive: true` | `Grep "keepalive: true" opticup-storefront/src/lib/analytics.ts` → 1 hit |
| 14 | Fire-and-forget (no `await` on POST) | source does NOT contain `await fetch(...pixel-fired...)` | `Grep "await fetch.*pixel-fired" opticup-storefront/src/lib/analytics.ts` → 0 hits |
| 15 | Iron Rule 22 — defense-in-depth `.eq('tenant_id', ...)` in EF | present | `Grep "\\.eq\\(.tenant_id." supabase/functions/pixel-fired/index.ts` → ≥1 hit |
| 16 | Iron Rule 23 — no hardcoded secrets in EF code | service_role from env | `Grep "SERVICE_ROLE\|SUPABASE_SERVICE" supabase/functions/pixel-fired/index.ts` ALL via `Deno.env.get(...)`; zero literal tokens |
| 17 | NO `crm_message_log` row written (D6) | 0 rows for `pixel-fired` operations | `SELECT count(*) FROM crm_message_log WHERE channel='pixel-fired' OR notes LIKE '%pixel-fired%'` → 0 |
| 18 | Smoke 7/7 PASS — ERP repo | exit 0 | `npm run smoke` in `C:\Users\User\opticup` |
| 19 | Smoke pass — storefront repo | smoke passes | per storefront's smoke script (Localhost-Tester runs this) |
| 20 | Iron Rule 31 Integrity Gate — ERP | exit 0 or 2 | `npm run verify:integrity; echo $?` → 0 or 2 (no null-byte ERROR) |
| 21 | Iron Rule 32 Destructive Ops Gate — ERP | exit 0 | pre-commit hook on each ERP commit passes |
| 22 | `docs/FB_CAPI.md` updated — back-wire marked IMPLEMENTED | line containing "DEFERRED: storefront SPEC" replaced with "IMPLEMENTED 2026-05-16 via `M3_FUNNEL_PIXEL_BACKWIRE`" | `Grep "DEFERRED: storefront SPEC" docs/FB_CAPI.md` → 0 hits |
| 23 | `roles/site-overseer/FUNNEL_ROADMAP.md` P2.2 row | annotated `back-wire LIVE 2026-05-16` | `Grep "back-wire LIVE 2026-05-16" roles/site-overseer/FUNNEL_ROADMAP.md` → ≥1 hit |
| 24 | Memory file `project_fb_capi_p21_state.md` updated | back-wire shipped note appended | inspection of memory file shows 2026-05-16 entry |
| 25 | OPEN_TASKS.md — P2.2 unblocked | row 6b (FB CAPI Purchase) or new row 6c (P2.2b dashboard SPEC stub `M4_PIXEL_VALIDATION_GAP_DASHBOARD`) added | manual inspection |

**Every SPEC must include an Integrity Gate criterion** (Iron Rule 31). Item #20 satisfies this. **Every SPEC must include an Iron Rule 32 declaration** (see §10 Destructive Operations below) — item #21 verifies enforcement.

---

## 4. Autonomy Envelope

### What the executor CAN do without asking

- Read any file in either repo (ERP + storefront).
- Run Level 1 read-only SQL via Supabase MCP (counts, advisor probes, lead lookups by `tenant_id='8d8cfa7e-ef58-49af-9702-a862d459cccb'` for demo).
- Run Level 2 DML SQL via Supabase MCP on **demo tenant only** (Iron Rule 3 soft delete on `crm_leads` if both approved E2E test phones already have active rows — see §10 Dependencies E2E test-data probe).
- Deploy the new `pixel-fired` EF via `mcp__claude_ai_Supabase__deploy_edge_function` with `verify_jwt=false` flag.
- Create + edit + commit files listed in §8 Expected Final State on either repo's `develop`.
- Run `npm run verify:integrity`, `npm run smoke`, and any other repo-provided verify scripts.
- Apply executor-improvement proposals from recent `FOREMAN_REVIEW.md` files (e.g., E2E test-data state pre-flight from Executor Proposal #2 in prior P2.1 SPEC).

### What REQUIRES stopping and reporting

- Any pre-flight finding that an existing pixel-fire back-wire EF/RPC ALREADY exists (would violate Iron Rule 21 from the Brief side — though pre-flight at §0 already cleared this).
- More than one thank-you-page firing path discovered in storefront (more than the single `getPixelEventsScript` code-path identified in §0).
- Any test failure (smoke regression, EF deploy 5xx, demo E2E POST 5xx).
- Iron Rule 31 integrity gate returning exit 1 (null-byte ERROR).
- Iron Rule 32 destructive-ops gate blocking (would indicate a destructive op crept in undeclared).
- DDL on `crm_leads` or any other table (this SPEC adds zero schema — column already exists from P2.1).
- Any merge to `main` request (only Daniel authorizes main merges).

---

## 5. Stop-on-Deviation Triggers (in addition to CLAUDE.md §9 globals)

- POST to `pixel-fired` returns 500 / 502 / 504 during E2E → STOP, investigate EF logs via `mcp__claude_ai_Supabase__get_logs`.
- `crm_leads.fb_pixel_fired_at` does NOT populate within 5 seconds of E2E thank-you-page navigation → STOP, debug whether the storefront `fetch()` is firing at all (check Network panel for 200 from `pixel-fired`).
- Storefront `verify:full` or `npm run smoke` reports a NEW violation (not pre-existing from the 60 archive-class violations carried per `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/REVIEW.md` C-1) → STOP, regression.
- ERP smoke 7/7 dropping to 6/7 or lower → STOP, regression.
- Any file at storefront repo root unexpectedly modified (e.g., `package.json`, `astro.config.mjs`) → STOP, scope creep.
- Demo `tenants.fb_capi_token IS NOT NULL` → STOP and report to Foreman (someone populated demo's token; would change `skipped_no_token` terminal-state assumption for this SPEC's verification — though this SPEC does NOT depend on token state, the change of state is itself a coordination event).

---

## 6. Rollback Plan

If the SPEC fails partway:

**ERP repo rollback:**
- `git reset --hard <START_COMMIT_ERP>` — START_COMMIT_ERP = HEAD before SPEC seal commit (Executor captures at run start).
- Undeploy EF: `mcp__claude_ai_Supabase__deploy_edge_function` with empty body OR `mcp__claude_ai_Supabase__delete_edge_function slug=pixel-fired` (Supabase MCP supports it). If deploy was the LAST step, the EF is safe to leave deployed since no caller exists yet — D7 from Brief.

**Storefront repo rollback:**
- `git reset --hard <START_COMMIT_STOREFRONT>` (captured by Executor at storefront-side start).
- No DB state to restore (storefront commits touch only TS source).

**Atomicity:** ERP and storefront commits are independent. If ERP ships but storefront breaks, ERP can stay (zero traffic). If storefront ships first and ERP breaks (unlikely — EF deploys first by SPEC plan), storefront calls return 404 silently (fire-and-forget); no user-visible failure.

**No DB state change.** Zero migrations, zero schema modifications, zero data writes outside of `crm_leads.fb_pixel_fired_at = NOW()` per the EF's normal write path (which is the *purpose* of the back-wire — these are not rollback targets). Rollback does NOT need to "un-set" `fb_pixel_fired_at` rows that were set by smoke tests on demo — they are intended writes.

---

## 7. Out of Scope (explicit)

- The P2.2b dashboard tile that consumes `fb_pixel_fired_at` — that is its own SPEC (`M4_PIXEL_VALIDATION_GAP_DASHBOARD`, stub queued in OPEN_TASKS via §3 SC #25).
- Backfilling historical leads' `fb_pixel_fired_at` (historical rows stay NULL — Meta API polling for retroactive Pixel-fire data is `P2.3-FB-CAPI-POST-LAUNCH-MONITORING`, separate SPEC, gated on Prizma token).
- Cookie forwarding `_fbp` / `_fbc` (deferred per `docs/FB_CAPI.md` §11 Future Work).
- Changing the existing pixel-firing logic in `getPixelEventsScript()`. The function still computes the same `rules`, still calls `fbq('track', r.e, ...)`, still strips `?fbe=` cosmetically. The ONLY change is appending an additional `fetch()` POST call after the `fbq` call when `fbEventId` is non-empty AND `tenantId` is non-empty.
- Adding `fb_pixel_fired_at` to any view (`v_storefront_*`, etc.) — read consumers will arrive in P2.2b.
- Modifications to `lead-intake`, `submit-lead`, or `fb-capi-dispatch` EFs.
- Modifications to `BaseLayout.astro` beyond the single 1-line call-site update on line 212 (passing the new 2nd arg).
- Any work on demo tenant beyond what's needed for E2E test (no demo-config changes, no new pixel_events rules, no test seed data beyond the lead created by the form submit itself).

---

## 8. Expected Final State

### ERP repo (`opticalis/opticup`, branch `develop`)

**New files:**
- `supabase/functions/pixel-fired/index.ts` — ≤100 lines. Origin-allowlisted (mirrors `submit-lead/index.ts` lines 29-49 byte-for-byte: `ALLOWED_ORIGINS_EXACT` Set + `VERCEL_PREVIEW_RE` regex + `isAllowedOrigin()`). `Deno.serve` handler: OPTIONS → 204 with CORS headers; POST with valid UUID + allowed Origin → service-role `db.from('crm_leads').update({fb_pixel_fired_at: new Date().toISOString()}).eq('fb_event_id', eventId).eq('tenant_id', tenantId).is('fb_pixel_fired_at', null).select('id')` → 200 with `{ok: true, updated: data.length}`. Validation: 400 on bad UUID for either field; 403 on bad Origin; 405 on non-POST.

**Modified files:**
- `docs/FB_CAPI.md` — §1 architecture diagram updated to remove `[DEFERRED: storefront SPEC]` markers on the back-wire path; §5 `fb_pixel_fired_at` row updated to "Populated by `pixel-fired` EF (M3_FUNNEL_PIXEL_BACKWIRE, 2026-05-16)"; §11 Future Work table reorganized (back-wire row REMOVED — now part of current state).
- `roles/site-overseer/FUNNEL_ROADMAP.md` — P2.2 row gets `— back-wire LIVE 2026-05-16` annotation.
- `MASTER_ROADMAP.md` §3 (Current State) — Foreman closure commit adds one-line back-wire completion note.
- `OPEN_TASKS.md` — Active task row 6b (FB CAPI Purchase) preserved; **new row 6c** added: `M4_PIXEL_VALIDATION_GAP_DASHBOARD` SPEC stub (P2.2b — now unblocked).
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md` — Add Recent SPECs row for `M3_FUNNEL_PIXEL_BACKWIRE` 🟢 (Foreman closure commit).
- Memory file `C:\Users\User\.claude\projects\C--Users-User-opticup\memory\project_fb_capi_p21_state.md` — appended with back-wire LIVE 2026-05-16 paragraph.

### Storefront repo (`opticalis/opticup-storefront`, branch `develop`)

**Modified files:**
- `src/lib/analytics.ts` — `getPixelEventsScript(events: PixelEvent[], tenantId?: string | null): string` signature extended. In the inline-JS payload, after the `fbq('track', r.e, {}, {eventID: fbEventId})` call but inside the same `if(fbEventId){...}` branch, append:
  ```javascript
  // Post-fire back-wire — set crm_leads.fb_pixel_fired_at via pixel-fired EF.
  // Fire-and-forget per D2/D3 of M3_FUNNEL_PIXEL_BACKWIRE Brief.
  if (tenantId) {
    try {
      fetch('${SUPABASE_URL}/functions/v1/pixel-fired', {
        method: 'POST',
        keepalive: true,
        headers: {'content-type':'application/json'},
        body: JSON.stringify({event_id: fbEventId, tenant_id: '${tenantId}'}),
      }).catch(function(){});
    } catch(_){}
  }
  ```
  Where `${SUPABASE_URL}` is interpolated at build-time from `import.meta.env.PUBLIC_SUPABASE_URL` and `${tenantId}` from the function arg. If `tenantId` is falsy → no POST issued (graceful — covers the rare case where BaseLayout did not receive tenant context).
- `src/layouts/BaseLayout.astro` — line 212 changed from `<script set:html={getPixelEventsScript(analytics.pixel_events)} />` to `<script set:html={getPixelEventsScript(analytics.pixel_events, tenantId)} />`. **One-line change.** No new prop, no destructuring change — `tenantId` is already destructured on line 66.
- `docs/FB_CAPI_HANDOFF.md` — "Files Modified in This SPEC" table extended with one row noting back-wire addition. "Why This Exists" + "Graceful Degradation" sections gain a back-wire paragraph each.

### DB state

- Column `crm_leads.fb_pixel_fired_at` (already exists from P2.1) becomes ACTIVE — populated on every successful E2E thank-you-page load that fires the back-wire. Zero schema changes.

### Docs updated (MUST include — verified in §3 SC #22-25)

- `docs/FB_CAPI.md` (back-wire marked IMPLEMENTED)
- `roles/site-overseer/FUNNEL_ROADMAP.md` (P2.2 annotation)
- `MASTER_ROADMAP.md` §3
- `OPEN_TASKS.md` (P2.2b stub added)
- `modules/Module 3 - Storefront/docs/SESSION_CONTEXT.md`
- Memory `project_fb_capi_p21_state.md`

`docs/GLOBAL_MAP.md` and `docs/GLOBAL_SCHEMA.sql` are NOT updated by this SPEC — no new tables, no new functions discoverable cross-module. The `pixel-fired` EF is an Edge Function (not a Postgres RPC); the EF inventory is not catalogued in `GLOBAL_MAP.md` per current convention. The EF is documented in `docs/FB_CAPI.md` instead.

---

## 9. Commit Plan

### ERP repo

- **C1** (Executor): `feat(m3,capi): pixel-fired EF for thank-you-page back-wire` — `supabase/functions/pixel-fired/index.ts` + EF deploy via Supabase MCP. Single commit covering the EF source + deployment confirmation (deploy is a Supabase MCP action, not a git artifact — but the SPEC seal commit notes the deployment occurred).
- **C2** (Executor): `docs(capi): mark pixel-fire back-wire IMPLEMENTED` — `docs/FB_CAPI.md` updates + `roles/site-overseer/FUNNEL_ROADMAP.md` P2.2 annotation.
- **C3** (Executor at retrospective close): `chore(spec): M3_FUNNEL_PIXEL_BACKWIRE EXECUTION_REPORT + FINDINGS.md`
- **C4** (Reviewer): `chore(review): M3_FUNNEL_PIXEL_BACKWIRE REVIEW.md`
- **C5** (Localhost-Tester): `test(spec): M3_FUNNEL_PIXEL_BACKWIRE TEST_REPORT.md`
- **C6** (Foreman closure): `chore(spec): close M3_FUNNEL_PIXEL_BACKWIRE with FOREMAN_REVIEW + memory + MASTER_ROADMAP + OPEN_TASKS + SESSION_CONTEXT updates`

### Storefront repo

- **C1-storefront** (Executor): `feat(analytics): pixel-fired back-wire from thank-you-page` — `src/lib/analytics.ts` + `src/layouts/BaseLayout.astro` (1-line).
- **C2-storefront** (Executor, optional combined with C1 if diff stays small): `docs(capi): document pixel-fired back-wire in FB_CAPI_HANDOFF.md`.

All commits use English `type(scope): description` per CLAUDE.md §9. No `git add -A`, no `--no-verify`, no `--amend`. Selective `git add <filename>` throughout. Pre-existing untracked files (§0 list) left alone.

---

## 10. Destructive Operations

Per Iron Rule 32: **None.**

This SPEC is **purely additive**:
- 1 new EF source file (no overwrite of existing).
- 1 EF deploy (creates new function; does not modify existing).
- Modifications to TS source extend a function signature (additive — old callers passing 1 arg still work because the new 2nd arg is optional; explicit `tenantId?: string | null = null`).
- Doc updates are append/replace within existing files (not delete-section).
- Zero file renames.
- Zero migrations.
- Zero column drops, table drops, policy drops.
- Zero `git rebase` / `git reset --hard` / `git push --force` outside of rollback (per §6, rollback is opt-in on failure only).
- Zero main-branch interaction.

Iron Rule 32 gate (`scripts/checks/destructive-ops-declared.mjs`) will scan this SPEC at commit time and accept the `None.` declaration. Any destructive pattern that fires would indicate scope creep.

---

## 10. Dependencies / Preconditions

- ERP repo on `develop`, clean working tree (pre-existing untracked files surveyed in §0 — leave alone).
- Storefront repo (`C:\Users\User\opticup-storefront`) accessible from this machine; on `develop`; pull latest before any storefront edit.
- Supabase MCP available (deploy + execute_sql + list_edge_functions tools loadable).
- Approved E2E test phones from memory `feedback_test_data_phones.md`: `+972537889878`, `+972503348349`. **E2E test-data state probe (per prior P2.1's Author Proposal #2):** before running E2E, run:
  ```sql
  SELECT id, phone, source, is_deleted
  FROM crm_leads
  WHERE tenant_id = '8d8cfa7e-ef58-49af-9702-a862d459cccb'
    AND phone IN ('+972537889878', '+972503348349')
    AND is_deleted = false
  LIMIT 5
  ```
  If active rows exist, soft-delete (Iron Rule 3) — Level 2 DML on demo only, within autonomy envelope per §4. Document the cleanup in EXECUTION_REPORT.md.
- Demo tenant UUID: `8d8cfa7e-ef58-49af-9702-a862d459cccb`. Prizma tenant UUID: `<look up at run time, do not hardcode in EF code>`.
- `tenants.fb_capi_token` for demo is expected NULL (per memory `project_fb_capi_p21_state.md` and stop-trigger in §5).

---

## 11. Lessons Already Incorporated

| From | Lesson | Applied? |
|---|---|---|
| `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/FOREMAN_REVIEW.md` Author Proposal #1 | Storefront-form code-path discovery at SPEC author time. | YES — §0 caught Brief Drift #1 (unified single-function pixel-firing code-path). |
| `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/FOREMAN_REVIEW.md` Author Proposal #2 | E2E test-data state probe. | YES — §10 Dependencies includes the probe + soft-delete authorization. |
| `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/FOREMAN_REVIEW.md` Executor Proposal #1 | Storefront-form code-path pre-flight (dual). | EXECUTOR will re-verify at pre-flight; SPEC §0 already supplies the discovery. |
| `M3_STOREFRONT_FB_CAPI_EVENT_ID_HANDOFF/FOREMAN_REVIEW.md` Executor Proposal #2 | E2E test-data state pre-flight (dual). | EXECUTOR + Localhost-Tester re-run the probe at chain hand-off. |
| `M4_FB_CAPI_HYBRID_DEDUPLICATION/FOREMAN_REVIEW.md` Author Proposal #2 | Rollback must use only `git`, no unverified CLI. | YES — §6 uses git + Supabase MCP only. |
| `MIGRATION_1_SUPPLIERS_DEBT/FOREMAN_REVIEW.md` Author Proposal #1 | Plain `## N.` headings (no `§` prefix) — Rule 32 hook regex requirement. | YES — all headings here. |
| `MIGRATION_2_SETTINGS_PERMISSIONS/FOREMAN_REVIEW.md` Author Proposal #2 | Baselines as symbols in §0. | YES — §0 Baselines table pins values. |
| `SECURITY_HOTFIX_2_2026_05_15/FOREMAN_REVIEW.md` Author Proposal #1 | Canonical JWT validation header for SECURITY DEFINER RPCs. | N/A — no RPCs in this SPEC. EF uses service_role + explicit `.eq('tenant_id', tenantId)` per Iron Rule 22. |
| `SECURITY_HOTFIX_2026_05_13` lessons | Origin allowlist (canonical post-HOTFIX pattern, NOT pre-HOTFIX wildcard). | YES — EF mirrors `submit-lead` allowlist. |

---

## 12. Pre-Merge Checklist (Executor closes when all green)

- [ ] All §3 success criteria pass with actual values captured in `EXECUTION_REPORT.md` §2.
- [ ] Iron Rule 31 Integrity Gate: `npm run verify:integrity` exit 0 or 2.
- [ ] Iron Rule 32 Destructive Ops Gate: pre-commit hook passes on every commit.
- [ ] `git status --short` returns empty in BOTH repos (clean tree).
- [ ] HEAD pushed to `origin/develop` in both repos.
- [ ] `EXECUTION_REPORT.md` + `FINDINGS.md` written in `modules/Module 3 - Storefront/docs/specs/M3_FUNNEL_PIXEL_BACKWIRE/`.
- [ ] Reviewer chain step + Localhost-Tester step both completed.

---

*End of SPEC.md — M3_FUNNEL_PIXEL_BACKWIRE.*
*Foreman seal commit follows.*
