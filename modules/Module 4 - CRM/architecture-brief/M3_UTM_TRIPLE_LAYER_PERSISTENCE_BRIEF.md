# M3_UTM_TRIPLE_LAYER_PERSISTENCE — Architecture Brief

**Type:** Phase 1 P1.1 of `roles/site-overseer/FUNNEL_ROADMAP.md`. Second SPEC of Phase 1 (after P1.4 RPC map + RETURN_SHAPE_FIX, both closed 2026-05-14). Cross-cut SPEC: M3 storefront capture + M4 lead-intake + M4 DB schema + M4 RPC.

**Decision context:** Daniel + Architect agreed 2026-05-14:
- **Option A** (separate touchpoints table over per-lead UTM columns) — rationale: forward-compat with Phase 4 E1 (MTA Engine) + E7 (Customer Journey Analytics).
- **A2 scope** (system-event touchpoints only — not page-views) — rationale: A1 (full page-view capture) doubles cost + adds bot/GDPR/dedup risk without doubling value for MTA models that need active interactions only. Upgrade path to A1 remains open (same table, new touchpoint_type added later).

**Purpose:** Build the `crm_lead_touchpoints` table + capture logic so every active funnel interaction (short-link click → lead submit → event registration) is recorded as a separate row. Today UTMs are frozen at first insert on `crm_leads` and never updated — ~35% of leads leak attribution. After this SPEC: every active touchpoint is captured with its own UTM context + timestamp; first-touch becomes ONE view over the touchpoint log, not the only truth.

---

## 1. Scope

**In scope (A2 — system-event touchpoints):**

1. **New table `crm_lead_touchpoints`** with `tenant_id` + RLS + canonical JWT-claim policy (Iron Rules 14, 15). Columns at minimum:
   - `id`, `tenant_id`, `lead_id` (nullable for pre-lead clicks), `phone_normalized` (for join when lead_id not yet known), `touchpoint_type` (enum: `short_link_click`, `lead_submit`, `event_register`), `occurred_at` timestamptz, `utm_source/medium/campaign/content/term/campaign_id` (text, nullable), `referrer_url` (text, nullable), `landing_url` (text, nullable), `short_link_code` (text, nullable), `broadcast_id` (uuid, nullable — depends on P1.2), `event_id` (uuid, nullable), `created_at`, plus tenant_id index + lead_id index + occurred_at index.
   - UNIQUE constraint scoped to tenant per Iron Rule 18 — Foreman decides the right tuple (likely `(tenant_id, lead_id, touchpoint_type, occurred_at)` with millisecond resolution OR a `dedupe_key` text).

2. **Capture point 1 — `resolve-link` Edge Function** (handles `/r/<code>` short-link clicks): on every short-link click, INSERT a `short_link_click` touchpoint row. UTMs are extracted from the destination URL (which carries the campaign UTMs) + the request's `Referer` header. `lead_id` is NULL at this stage (pre-lead). `phone_normalized` is NULL. Match to a `lead_id` happens later via `resolve_touchpoints_to_lead` deferred-resolution step.

3. **Capture point 2 — `lead-intake` Edge Function** (handles `/supersale/` form submits + similar): on every fresh-or-duplicate lead insertion, INSERT a `lead_submit` touchpoint row with UTMs from the request body + landing_url + referrer_url. Same transaction as the lead INSERT or UPDATE.

4. **Capture point 3 — `register_lead_to_event` RPC** (now mapped per P1.4): on every fresh registration AND every revival, INSERT an `event_register` touchpoint row inside the same transaction. UTMs are inherited from the current request context (passed via RPC params — see §2 for the parameter wiring).

5. **Deferred touchpoint resolution.** New RPC `resolve_touchpoints_to_lead(p_lead_id, p_phone_normalized)`. When a fresh lead is created, all prior `short_link_click` rows for the same `phone_normalized` (within a configurable window — default 30 days) get their `lead_id` filled. Called from `lead-intake` after lead creation, async (`EdgeRuntime.waitUntil`) — does NOT block the response.

6. **First-touch view `v_crm_lead_first_touch`** — preserves backward-compatible read shape so any existing query that reads `crm_leads.utm_*` keeps working. The view returns the EARLIEST `lead_submit` touchpoint's UTMs as the first-touch values (or the earliest `short_link_click` resolved to that lead — Foreman decides priority).

7. **`crm_leads.utm_*` columns: KEEP, NOT DROP.** Backward compatibility: existing reports + CRM UI continue reading from `crm_leads`. Going forward, those columns are populated by a trigger that fills them from the FIRST touchpoint per lead, never updated after. **No DROP migration.** Phase 4+ may revisit.

**Out of scope:**

- Page-view tracking (A1 — deferred to Phase 4 if MTA model demands it).
- Bot/crawler filtering (no JS in browser to attack; EF-only writes are inherently bot-resistant for our use case — bots don't submit forms).
- UI to visualize touchpoint history per lead (Phase 2.5 — Funnel Health Dashboard).
- `crm_leads.utm_*` deprecation or removal.
- Updating `crm_event_attendees` schema (no UTM columns added — touchpoints carry that). The attendee row stays minimal per design.
- Broadcast attribution at touchpoint level beyond `broadcast_id` column (deeper analytics in Phase 2.5).

---

## 2. Critical Design Constraints

**Forward-compat (per FUNNEL_ROADMAP Phase 4):**

- **E1 (MTA Engine):** SATISFIED — touchpoint log is the substrate.
- **E2 (Predictive LTV per channel):** REQUIRES that every revenue event (order, redemption) can join to its originating touchpoint chain. → Add note to M5/M7 SPECs: store `originating_touchpoint_id` on revenue rows.
- **E7 (Customer Journey Analytics):** SATISFIED for active interactions; page-view upgrade path = add `page_view` enum value + browser endpoint, no schema change.

**SaaS-clean (Iron Rule 14, 15, 18, 20):**

- `tenant_id` mandatory on every row.
- RLS canonical JWT-claim pattern (from CLAUDE.md §5 Rule 15).
- UNIQUE constraint scoped to tenant.
- Zero hardcoded tenant-specific behavior.

**Performance & cost:**

- Touchpoint INSERTs happen inside same-transaction with lead/attendee writes — adds <5ms per request (single INSERT, indexed table).
- Deferred touchpoint resolution runs async (`EdgeRuntime.waitUntil`) — does NOT delay user response.
- Expected volume: ~200-500 touchpoints/day baseline, ~5,000-10,000/day in SuperSale campaigns → <4M rows/year. Postgres handles 100x this easily.
- Indices on `tenant_id`, `lead_id`, `phone_normalized`, `occurred_at` cover the queries Phase 2.5 will run.

**Backward compatibility:**

- `crm_leads.utm_*` columns NOT dropped. Every existing query / report keeps working.
- `v_crm_lead_first_touch` view provides the canonical first-touch read.
- No caller of `register_lead_to_event` breaks — RPC signature gains optional UTM params with NULL defaults.

---

## 3. Method (high-level for Foreman)

1. **Foreman authors SPEC.** Includes: full table DDL + RLS policies + indices + the 3 capture-point code changes + `resolve_touchpoints_to_lead` RPC body + view DDL + integration test plan + rollback plan.

2. **Executor runs migrations** via `apply_migration` MCP. Order:
   - Create table + indices + RLS.
   - Create `resolve_touchpoints_to_lead` RPC.
   - Create `v_crm_lead_first_touch` view.
   - Modify `register_lead_to_event` RPC (CREATE OR REPLACE) to accept optional UTM params + INSERT touchpoint row.
   - Deploy updated `resolve-link` EF + `lead-intake` EF.

3. **Executor runs integration tests on demo:**
   - Click short-link → 1 touchpoint row created with NULL lead_id.
   - Submit lead form (same phone) → 1 lead_submit touchpoint + the prior click row's lead_id filled.
   - Register to event → 1 event_register touchpoint.
   - Query `v_crm_lead_first_touch` → returns the earliest UTM bag for that lead.

4. **Reviewer verifies success criteria.**

5. **Localhost-Tester runs smoke 7/7 PASS** pre and post.

6. **Foreman closes** with FOREMAN_REVIEW.

---

## 4. Destructive Operations

**None.**

- All migrations are CREATE (table, view, RPC, indices).
- `register_lead_to_event` modification uses `CREATE OR REPLACE` (not destructive per Iron Rule 32).
- `crm_leads.utm_*` columns NOT dropped.
- No file deletes, no git destructive ops, no main deploys.

If any deviation surfaces mid-run that would require a destructive op → STOP, escalate.

---

## 5. Success Criteria

| # | Criterion | Method |
|---|---|---|
| 1 | `crm_lead_touchpoints` table exists with tenant_id NOT NULL + canonical RLS (JWT-claim USING clause) + service_bypass policy + tenant-scoped UNIQUE | `\d+ crm_lead_touchpoints` + `pg_policies` query |
| 2 | All 3 capture points fire: short-link click → 1 row, lead submit → 1 row, event register → 1 row | demo integration test |
| 3 | `resolve_touchpoints_to_lead` correctly fills `lead_id` on prior `short_link_click` rows matching `phone_normalized` within 30-day window | demo integration test (sequence: click → wait → submit) |
| 4 | `v_crm_lead_first_touch` returns the earliest touchpoint's UTM bag for a given lead, with `security_invoker=true` + correct grants | view definition + sample query |
| 5 | All existing readers of `crm_leads.utm_*` continue to work (no regression) | smoke 7/7 PASS + targeted query check |
| 6 | `register_lead_to_event` new optional UTM params default to NULL; old callers that don't pass them STILL WORK | re-run P1.4 caller inventory queries |
| 7 | Demo: 5 end-to-end scenarios pass (no-UTM lead, FB-UTM lead, SMS-broadcast click then submit then register, duplicate submit, revival of soft-deleted attendee) | integration test |
| 8 | Prizma untouched: zero writes during SPEC's session against Prizma | audit log check |
| 9 | Smoke 7/7 PASS pre- AND post-migration | `npm run smoke` |
| 10 | Integrity gate exit 0 | `npm run verify:integrity` |
| 11 | KNOWLEDGE_MAP.md Layer 2 expanded with touchpoint architecture diagram | grep file |
| 12 | FUNNEL_ROADMAP.md P1.1 status flipped to ✅ CLOSED | grep file |
| 13 | All 7 forward-compat E1-E7 verdicts re-evaluated and updated in FUNNEL_ROADMAP.md Phase 4 table (any that moved BLOCK → SUPPORT?) | grep file |

---

## 6. Notes for the Foreman

- **Read `STATE_TRANSITIONS.md` first** from `modules/Module 4 - CRM/docs/specs/M4_REGISTER_LEAD_TO_EVENT_RPC_MAP/` to understand every code path before adding UTM params.
- **Read `KNOWLEDGE_MAP.md` Layer 2** for the existing UTM capture flow before designing the new one.
- **Match the canonical RLS pattern from CLAUDE.md §5 Rule 15** exactly. Two policies: `service_bypass` + `tenant_isolation`. Do NOT use `auth.uid()`.
- **Migration must include `SET search_path = 'public'`** on the new RPC + view per SECURITY_HOTFIX_2026_05_13 hardening pattern.
- **The `dedupe_key` decision** (composite UNIQUE vs separate text column) — Foreman picks one and documents the rationale in SPEC.
- **Estimated effort:** 4-6 hours including tests. This is the most complex Phase 1 SPEC.
- **Mandatory backup** under `modules/Module 4 - CRM/backups/{YYYY-MM-DD}_M3_UTM_TRIPLE_LAYER_PERSISTENCE/` since this SPEC touches >5 files (RPC + 2 EFs + table + view + 2 doc files).
- **Touchpoint table OWNERSHIP:** lives in M4 (CRM owns lead-related entities) but capture points span M3 + M4 — this is fine, cross-cut is expected.

---

## 7. Bounded Autonomy

Pipeline runs end-to-end in ONE Claude Code chat (Foreman → Executor → Reviewer → Localhost-Tester → Foreman closure).

**STOP triggers (in addition to the standard CLAUDE.md §9 list):**

- The RPC body in `pg_proc` for `register_lead_to_event` differs from the post-FIND-1-fix body → something changed, STOP.
- Any UNIQUE constraint violation surfaces on touchpoint inserts during the demo integration test → schema bug, STOP.
- The deferred `resolve_touchpoints_to_lead` call delays the user-facing response by >100ms → architectural issue, STOP.
- Any caller of `register_lead_to_event` breaks (return-value contract or param shape) → regression, STOP.
- Any existing `crm_leads.utm_*` query returns unexpected NULLs post-migration → regression, STOP.

End of Brief.
