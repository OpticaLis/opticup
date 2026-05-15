# OVERNIGHT_BUNDLE_2026_05_14 — Architecture Brief

**Type:** Multi-item overnight autonomous run. Chained sequence of read-only audits + low-risk tech-debt fixes + Phase 2 measurement-quality SPECs + Module Close Ceremonies. Designed to advance the project as far as possible toward LIVE while Daniel sleeps, without requiring his judgment on any single item.

**Why this exists:** Today (2026-05-14) closed 8 SPECs incl. all of Phase 1 funnel infrastructure. Pipeline is battle-tested. The next critical-path items (P2.1 CAPI, M1 mockups, M13/M9 sketches) all require Daniel's involvement. But there is substantial low-risk/read-only work that does NOT need his input — bundling it overnight maximizes progress without risk.

**Execution model:** Single Claude Code chat running through the items sequentially. Skip-not-stop on per-item failures (per `feedback_overnight_run_pattern.md` memory). Sub-agents authorized for parallel execution where items are independent. Aggregate Hebrew summary at end.

---

## 1. Items in scope (4 tiers, ordered by risk/value)

### Tier A — Phase 2 Measurement Quality (4-6 hours)

**A.1 — `M4_TEMPLATE_VALIDATION_UNIFIED` (P2.3 of FUNNEL_ROADMAP, ~2-3 hrs)**

Unify template-placeholder validation. Today validation exists in 2 places (`send-message` EF + manual-send UI) but the auto-dispatch path via `automation-engine` does NOT validate before enqueueing — letting `unsubstituted_placeholder` messages reach `crm_message_log` with `status='rejected'` (per FUNNEL_ROADMAP Q5 / KNOWLEDGE_MAP Layer 6). This SPEC:
- Extracts the validator from `send-message/index.ts` into a shared module (`supabase/functions/_shared/template-validation.ts`).
- Calls it from `automation-engine` pre-enqueue.
- Adds a return-shape signal so caller can log `rejected` reason WITHOUT enqueueing a doomed message.
- Demo integration test: trigger an automation with an intentionally-broken template → verify zero queue rows + 1 `crm_automation_rules.last_error` populated.

**A.2 — `M3_PIXEL_VALIDATION_GAP_REPORTING` (P2.2 of FUNNEL_ROADMAP, ~2-3 hrs)**

Per Q7 decision: keep "thank-you page = real lead" Pixel model, BUT detect when a `crm_leads` row was saved AND the lead reached the thank-you page AND the Pixel did NOT fire. Today these are silent measurement gaps. This SPEC:
- New EF endpoint `/log-pixel-status` invoked from the thank-you page after attempting Pixel fire. Receives `lead_id` + `pixel_fired: boolean` + `failure_reason` (adblocker_detected / no_consent / network_error / unknown).
- New table `crm_pixel_fire_log` (tenant_id-scoped, RLS, FK to crm_leads).
- Storefront thank-you page emits the call after `fbq('track','Lead')` attempt — uses 2-second timeout to detect Pixel network failure.
- Weekly aggregate query computes "measurement gap rate" — Phase 2.5.1 will surface in dashboard later.

### Tier B — Tech Debt Sweep (1-2 hours)

**B.1 — `MIGRATION_4_STRANDED_RGBA_SWEEP` (LOW, ~15 min)**

Single-site stranded indigo rgba `rgba(99,102,241,.08)` at `storefront-blog.html:101` (F1 from MIGRATION_4 closure 2026-05-12). One-line edit + commit.

**B.2 — `M1_5_DEDUPLICATE_SETTINGS_EMPLOYEES_CSS` (~30-60 min)**

`css/settings.css` ≡ `css/employees.css` byte-identical (F1 from MIGRATION_2 closure 2026-05-11). Dedup to single `css/settings-permissions.css`, update `<link>` references, remove redundant file. employees.html ALREADY archived per SETTINGS_PERMISSIONS_CONSOLIDATION so only settings.html `<link>` needs swap.

**B.3 — `M1_5_CRM_CSS_STUB_CLEANUP` (~30 min)**

`css/crm-screens.css` + `css/crm-visual.css` are post-B8 stubs (F1 from MIGRATION_3 closure 2026-05-12). Verify no remaining `<link>` references in `crm.html`, then delete both files. If references remain → STOP (this means stub was actually load-bearing somewhere).

### Tier C — Sentinel + Audits (1-2 hours, read-only)

**C.1 — Sentinel 9-mission audit run (~1 hr, read-only)**

Run `opticup-sentinel` skill full sweep. Writes 9 reports to `docs/guardian/`. Generates `docs/guardian/GUARDIAN_ALERTS.md` updates. **Zero file modifications outside `docs/guardian/`.**

**C.2 — D1 unsubstituted_placeholder count (~30 min, read-only)**

Per FUNNEL_ROADMAP Diagnostic Tasks: query `crm_message_log` for `status='rejected'` rows with `error_message LIKE '%unsubstituted_placeholder%'` for the 2026-05-12 broadcast event. Report count + breakdown by template + recipient phone pattern. Single-file report at `roles/site-overseer/diagnostics/D1_UNSUBSTITUTED_PLACEHOLDER_2026_05_12.md`. No code change.

**C.3 — D2 fast-path automation documentation (~1 hr, read-only)**

Per FUNNEL_ROADMAP Q10 decision: document the `event_invite_new` fast-path that bypasses `crm_automation_rules`. Foreman authors a new section in `roles/site-overseer/knowledge-build/KNOWLEDGE_MAP.md` Layer 4 listing all fast-path patterns + when they apply + how to add new ones. Then proposes a SKILL update to `opticup-strategic` so future SPEC authors check the fast-path registry before changing automation behavior.

### Tier D — Module Close Ceremonies Backlog (2-3 hours, docs-only)

**D.1 through D.8 — 8 modules with sealed Briefs but no recorded Close Ceremony.**

Per `opticup-architect` SKILL.md Module Close Ceremony protocol: M5 (Customers), M6 (Prescriptions), M7 (Orders), M8 (Payments), M11 (Reports), M12 (Communications), M14 (Appointments), M15 (Queue) — all have sealed Architecture Briefs but no recorded close ceremony in `references/DECISIONS_LOG.md`.

For each module:
1. Read the module's Brief + the module's `decisions/<MODULE>.md` file.
2. Read every `FOREMAN_REVIEW.md` (if any) in that module's `docs/specs/`.
3. Synthesize 1-2 lessons.
4. If any lesson is a 3-strike pattern → propose update to `opticup-architect/SKILL.md`.
5. Append entry to `DECISIONS_LOG.md` index + module-level `decisions/<MODULE>.md`.

**Estimated effort:** ~20 min per module × 8 = 2-3 hours.

**Output:** 8 new DECISIONS_LOG entries + any harvested SKILL improvements bundled into one `chore(skills): module-close-ceremony-backlog-2026-05-14` commit.

---

## 2. Execution model

**Sequential within tier, parallel across tiers where safe:**

- Tier A items are SEQUENTIAL (A.1 → A.2). Both modify production code paths; cannot run in parallel.
- Tier B items are SEQUENTIAL (B.1 → B.2 → B.3). All touch CSS/HTML; serialize to avoid conflicts.
- Tier C items can run in PARALLEL (C.1 read-only Sentinel; C.2 read-only D1; C.3 read-only D2). All write to disjoint paths.
- Tier D items are SEQUENTIAL (D.1 → D.2 → ... → D.8). All touch `DECISIONS_LOG.md` index file.

**Tier ordering:** A first (highest value, highest complexity, freshest context from Phase 1). Then B (mechanical). Then C (read-only audits — these can also run as warm-up in parallel with A on a sub-agent). Then D (docs cleanup, easiest, but most schedule-flexible).

**Skip-not-stop rule (per `feedback_overnight_run_pattern.md`):** If any single item fails, log the failure + skip to the next item. Aggregate failures at end. The only HARD STOPS are: (a) Iron Rule violation (destructive op not declared, RLS missing, tenant_id missing), (b) Prizma data write that wasn't authorized, (c) test smoke <7/7 PASS pre-item (means the system regressed since session start).

**Sub-agent authorization:** Tier C items can spawn sub-agents (`opticup-sentinel`, `opticup-executor` for D1 query, `opticup-strategic` for D2 docs). Tier D items can spawn 2-3 parallel sub-agents to process modules in batches of 3.

---

## 3. Hard constraints

**Demo tenant only for ALL test writes.** Tier A SPECs write to demo tenant for integration tests; Prizma is read-only throughout (advisor queries, RPC body reads, audit log checks).

**No main-merge during overnight.** Every commit goes to `develop`. Daniel reviews + merges in the morning.

**Backup before each SPEC touches >5 files** (per CLAUDE.md §9 #9). Pipeline knows this.

**Localhost servers stay up.** Daniel left them running. Pipeline does NOT restart them.

**Whitelist phones/emails for test only:**
- Phones: 0537889878, 0503348349, 0507168471
- Emails: daniel@prizma-optic.co.il, alkimovich94@gmail.com, danylis92@gmail.com

**Iron Rule 32:** Each item that's a SPEC declares its `## Destructive Operations` section. Tier A.1/A.2 = `None.` Tier B.2/B.3 = file deletes (declared). Tier C+D = `None.` (docs only).

---

## 4. Output

Aggregate Hebrew status block at end with one bullet per item:
- 🟢 / 🟡 / 🔴 status
- 1-line outcome (commits / rows / findings / lessons)
- Item-level skip if any (with reason)

Plus a master report `OVERNIGHT_BUNDLE_2026_05_14_REPORT.md` next to the Brief listing every item's full result + commit SHAs + sub-agent breakdown.

---

## 5. Estimated total runtime

| Tier | Items | Hours |
|---|---|---|
| A | 2 SPECs (P2.3 + P2.2) | 4-6 |
| B | 3 cleanups (RGBA + CSS dedup + stub cleanup) | 1-2 |
| C | 3 audits in parallel (Sentinel + D1 + D2) | 1-2 |
| D | 8 Module Close Ceremonies | 2-3 |
| **Total** | **16 items** | **8-13 hrs** |

Fits an 8-12 hour overnight window (per `feedback_overnight_run_pattern.md` target: 15-21 commits). Expected commit range: 18-25 commits.

---

## 6. What remains AFTER this bundle (Daniel's morning view)

**Phase 2 still pending:**
- P2.1 M4_FB_CAPI_HYBRID_DEDUPLICATION (HIGH PRIORITY, 6-8 hrs) — REQUIRES Daniel decisions on dedup keys, Meta API setup.

**Phase 2.5 — Continuous Improvement:**
- P2.5.1 M11_FUNNEL_HEALTH_DASHBOARD (6-8 hrs)
- P2.5.2 M4_WEEKLY_OPTIMIZATION_BRIEF (4-6 hrs)

**Phase 3 — Tech Debt:**
- P3.1 M4_EVENT_STATUS_SPLIT_LIFECYCLE_AUTOMATION (8-12 hrs, HIGH RISK)
- P3.2 Legacy Make scenario cleanup (Q4 2026, 1 hr)

**Sketch work (UI involvement required):**
- M13 Loyalty full revision (~half day)
- M9 Lab/KDS sketches from scratch (~half day)

**M1 Expansion:**
- UI mockups for 2 screens (~half day, Daniel involved)
- M1_LENS_INVENTORY_PHASE_1 SPEC build (~1 week, Foreman + Executor)
- Contact-lenses + accessories follow-up SPECs

**Build sequence (after blockers clear):**
- M5/M6/M7 foundation modules build (~3-4 weeks)
- M8/M9/M11/M12/M13 parallel build (~3-4 weeks, requires Module Repo Split)
- M14/M15 build (~1-2 weeks)
- Module Repo Split SPEC (1-2 days)

**Phase 4 (post-LIVE):** Elite tier — MTA engine, predictive LTV, audience auto-export, creative A/B at scale, real-time anomaly detection, cross-channel orchestration, customer journey analytics. Documented for forward-compat, no SPECs.

**Rough total to LIVE-ready first tenant:** ~10-14 weeks of focused work from this point, assuming Phase 2 + 2.5 + remaining sketches + M1 expansion + 10 module builds.

---

## 7. Destructive Operations (this Brief)

Per Iron Rule 32 — declared at Brief level:

1. **B.1 RGBA sweep** — 1 file edit. Not destructive (additive replace).
2. **B.2 CSS dedup** — DELETE 1 file (`css/employees.css` after dedup), declared destructive.
3. **B.3 CSS stub cleanup** — DELETE 2 files (`css/crm-screens.css` + `css/crm-visual.css`), declared destructive.
4. **Tier A SPECs** — None (additive code + new table).
5. **Tier C audits** — None (read-only).
6. **Tier D ceremonies** — None (docs append-only).

**Total destructive ops:** 3 file deletes (B.2 + B.3 × 2), all preceded by mandatory backup per CLAUDE.md §9 #9.

End of Brief.
