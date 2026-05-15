# M3_SHORTGY_TO_INTERNAL_REDIRECT — Architecture Brief

**Type:** Phase 1 P1.3 of `roles/site-overseer/FUNNEL_ROADMAP.md`. **LAST execution-SPEC of Phase 1** (after P1.4 RPC map + RETURN_SHAPE_FIX + P1.1 UTM Triple Layer + P1.2 broadcast_id propagation — all closed 2026-05-14).

**Purpose:** Migrate all customer-facing short-link usage from the external `prizmaoptic.short.gy` service to the internal `/r/<code>` system. Every click should flow through `resolve-link` EF — which (post-P1.1+P1.2) already records `short_link_clicks` + `crm_lead_touchpoints` rows with full UTM + broadcast_id attribution. Today short.gy links bypass measurement entirely.

**Decision context (Daniel + Architect, 2026-05-14):**
- Migration to internal `/r/<code>` chosen — Daniel: "I do see click stats there [short.gy], but obviously it would be much more convenient to see it in our system."
- Phase 1 P1.3 is the natural slot — already on the build sequence.

---

## 1. Scope

**In scope:**

1. **Inventory of `prizmaoptic.short.gy` usage** — pre-flight read-only audit:
   - Grep storefront repo (`opticup-storefront/src/`) for any reference to `short.gy`.
   - Grep ERP repo for any reference to `short.gy` in JS, HTML, templates, or migrations.
   - Query Supabase: every `crm_message_templates.body` containing `short.gy`, every `crm_broadcasts.draft_body`, every CMS row in `storefront_pages.blocks` containing `short.gy`.
   - Query: `short_links` table (any rows pointing to short.gy targets? unlikely but verify).
   - Produce an `INVENTORY.md` artifact listing every occurrence with file:line or DB row identifier.

2. **Create internal `/r/<code>` short-links for every short.gy URL discovered** that is still in active use:
   - For each unique destination URL behind a short.gy link → create a `short_links` row pointing to that destination (`tenant_id`-scoped per Iron Rule 14).
   - Generate a stable code per destination (alphanumeric short codes — Foreman picks length, e.g. 6 chars).
   - For broadcast-emitted short-links (already covered by P1.2's per-message codes) → no change needed; P1.2 already handles new broadcasts going forward.
   - **This SPEC only deals with statically-embedded short.gy links** (templates, CMS blocks, storefront pages) — NOT broadcast-runtime-generated ones.

3. **Replace short.gy URLs with internal `/r/<code>` URLs** at every occurrence:
   - Templates (`crm_message_templates.body`) — Level 2 UPDATE per tenant, by row.
   - CMS blocks (`storefront_pages.blocks`) — Level 2 UPDATE per tenant, by row.
   - Storefront source files (any hardcoded short.gy in `.astro`/`.ts`) — git commit replace.
   - ERP source files (similar) — git commit replace.
   - Each replacement preserves the destination URL semantically (decoded by visiting the short.gy URL once to capture the final destination) — Foreman picks: use the short.gy resolution (visit + capture) or use a known mapping (if Daniel has the list).

4. **Optional: ERP stats page for short-link clicks** — basic table showing `short_links.code` + total click count + last click time + broadcast_id breakdown. Daniel mentioned wanting click stats visible in our system. Scope: minimal MVP table only. NO charts, NO filters beyond date range, NO export.

5. **short.gy deprecation timeline:**
   - This SPEC: replace + verify all internal references migrated.
   - Out of scope: deactivating the short.gy account itself. Daniel does that manually after observing zero traffic on short.gy stats for 30 days.

**Out of scope:**

- Migrating broadcast-runtime-generated short-links (already covered by P1.2's design — those are created per-message at broadcast send time via the internal system).
- Backfilling historical click data from short.gy → internal stats. The short.gy historical data stays in short.gy. From cutover day forward, all new clicks are internal.
- Deactivating the short.gy account or DNS for `prizmaoptic.short.gy`.
- ERP stats page beyond the minimal MVP table (charts, filters, exports — defer to Phase 2.5.1 Funnel Health Dashboard).
- 301 redirect from `prizmaoptic.short.gy/<code>` → `/r/<code>` — not technically possible without owning the short.gy DNS, and not needed if all our outbound links are migrated.

---

## 2. Critical Design Constraints

**SaaS-clean (Iron Rules 14, 15, 18):**

- All new `short_links` rows are tenant_id-scoped.
- Internal short-link generator (likely an RPC or existing helper) uses tenant_id from auth context.
- No tenant-specific behavior — same path for every future tenant.

**Forward-compat (per FUNNEL_ROADMAP Phase 4):**

- The migration is itself an enabler of E7 (Customer Journey Analytics) — once short.gy is gone, EVERY click flows through `resolve-link` and produces a touchpoint. No measurement gap remaining at click layer.

**Backward compatibility:**

- Existing customers who saved a short.gy link in their phone → the link continues to work (we don't deactivate short.gy). They'll click an external URL that's still alive. Phase 4 (or later cleanup) handles short.gy account deactivation.
- New messages from cutover day forward use `/r/<code>` exclusively.

**Performance & cost:**

- `resolve-link` EF already handles `/r/<code>` clicks since pre-P1.1. Adding more rows to `short_links` (a small table) has negligible impact.
- ERP stats page (if included in MVP) reads from `short_link_clicks` + `crm_lead_touchpoints` — both indexed in P1.1.

---

## 3. Method (high-level for Foreman)

1. **Foreman authors SPEC.** Includes: INVENTORY pre-flight + per-occurrence replacement plan + new `short_links` rows DDL + ERP stats page mockup (if MVP included).

2. **Executor runs INVENTORY first as Step 0 (read-only):**
   - Grep both repos.
   - Query DB for templates + CMS blocks + `short_links`.
   - Visit each unique short.gy URL once (browser MCP or curl with follow-redirects) to capture the destination.
   - Write `INVENTORY.md` listing every occurrence + destination.
   - **STOP for Foreman review** if the inventory turns up surprises (URLs to non-Prizma domains, dead URLs, unknown patterns). Otherwise continue.

3. **Executor creates internal short-links:**
   - For each unique destination → INSERT into `short_links` with tenant_id + generated code + destination URL.
   - Verify each new code resolves correctly via `resolve-link` EF curl probe.

4. **Executor performs replacements in order:**
   - DB rows first (templates + CMS blocks) via Level 2 UPDATE — backups to SPEC folder.
   - Storefront source second (if any).
   - ERP source last (if any).

5. **Executor (if ERP stats page in scope):**
   - Build minimal HTML + JS page reading from `short_link_clicks`.
   - Add nav entry under appropriate section (per Daniel's CRM nav).

6. **Reviewer verifies success criteria** — including a full grep for any remaining `short.gy` in scope.

7. **Localhost-Tester runs smoke 7/7 PASS** + manual click test on 3 random new short-links.

8. **Foreman closes** with FOREMAN_REVIEW.

---

## 4. Destructive Operations

**Limited and explicit.**

Destructive ops declared:
1. **UPDATE on `crm_message_templates.body`** — N rows. Each row backed up to SPEC folder as JSON pre-UPDATE.
2. **UPDATE on `storefront_pages.blocks`** — N rows. Each row backed up.
3. **Storefront source file edits** (git commit replace). Pre-edit copies in backup folder.
4. **ERP source file edits** (git commit replace). Pre-edit copies in backup folder.

NOT in scope:
- DROP of any table or column.
- DELETE of any row.
- `git rebase`, `git reset --hard`, `git push --force`.
- Deactivation of short.gy account.

Iron Rule 32 declaration: "4 UPDATE/Edit operations against documented row sets. No DROP/DELETE/git destructive ops."

---

## 5. Success Criteria

| # | Criterion | Method |
|---|---|---|
| 1 | INVENTORY.md complete: every short.gy reference in storefront + ERP + DB documented | grep + DB query |
| 2 | New `short_links` rows: one per unique destination, all tenant-scoped, all resolve via curl probe | curl test per code |
| 3 | `crm_message_templates.body`: zero remaining `short.gy` references for prizma tenant | `SELECT count(*) WHERE body LIKE '%short.gy%' AND tenant_id=prizma` = 0 |
| 4 | `storefront_pages.blocks`: zero remaining `short.gy` references for prizma | `SELECT count(*) WHERE blocks::text LIKE '%short.gy%' AND tenant_id=prizma` = 0 |
| 5 | Storefront source: zero remaining `short.gy` references | repo grep |
| 6 | ERP source: zero remaining `short.gy` references | repo grep |
| 7 | Each new `/r/<code>` resolves to the documented destination | 100% match per inventory |
| 8 | ERP stats page (if in scope): renders + shows accurate click counts for at least 1 demo short-link | manual probe |
| 9 | Demo: send a test broadcast / template message containing a migrated link → click → verify `short_link_clicks` + `crm_lead_touchpoints` rows created with correct broadcast_id + UTMs | integration test |
| 10 | Prizma untouched on DB writes against unrelated tables | audit log check |
| 11 | Smoke 7/7 PASS pre- AND post-migration | `npm run smoke` |
| 12 | Integrity gate exit 0 | `npm run verify:integrity` |
| 13 | KNOWLEDGE_MAP.md Layer 7 (Click Tracking) updated — short.gy now marked DEPRECATED for internal usage | grep |
| 14 | FUNNEL_ROADMAP.md P1.3 status flipped to ✅ CLOSED; Phase 1 marked COMPLETE | grep |
| 15 | All backup JSON files present in SPEC folder for every DB UPDATE | ls |
| 16 | Repo clean at close | `git status` |

---

## 6. Notes for the Foreman

- **Step 0 INVENTORY is mandatory** — DO NOT proceed past Step 0 if the inventory surfaces surprises (cross-tenant URLs, dead URLs, unknown short.gy patterns). Surface to Daniel via escalation.
- **Decision needed at SPEC author time: include ERP stats page (MVP) in this SPEC, or split as a follow-up?** Architect's leaning: **include MVP in this SPEC**. Reason: Daniel asked for visibility; including a 1-table page is cheap and closes the loop. Foreman validates effort estimate before sealing.
- **Code length for new short-link codes:** 6 alphanumeric chars (~57B^6 = 36B possibilities). Foreman validates no collision with existing `short_links` rows before sealing.
- **Mandatory backup:** SPEC touches potentially >5 files + multiple DB rows. Standard `modules/Module 4 - CRM/backups/{YYYY-MM-DD}_M3_SHORTGY_TO_INTERNAL_REDIRECT/` with pre-edit copies of every affected file + JSON dump of every UPDATED DB row.
- **Estimated effort:** 2-3 hours (excluding ERP stats page MVP — add ~1 hour if included).
- **Cross-repo:** changes likely in BOTH `opticalis/opticup` (ERP) AND `opticalis/opticup-storefront`. Storefront commits push to storefront's develop branch — separate PR for main-merge per `feedback_storefront_branch_model`.

---

## 7. Bounded Autonomy

Pipeline runs end-to-end in ONE Claude Code chat. STOP triggers:

- INVENTORY surfaces a short.gy URL pointing OUTSIDE prizma's known domains (e.g. an unknown landing page, a third-party tool) → STOP, escalate to Daniel.
- Any short.gy URL returns dead (HTTP 404/410) when visited → STOP, log in INVENTORY + ask Daniel whether to skip or replace with a placeholder.
- A `crm_message_templates` UPDATE accidentally touches non-prizma tenant rows → STOP, rollback.
- Any storefront source replacement breaks the storefront build → STOP, rollback.
- `resolve-link` EF returns non-301/302 for any new code → STOP, fix the row.
- Smoke <7/7 PASS pre-migration → STOP, something regressed since P1.2 closure.

End of Brief.
