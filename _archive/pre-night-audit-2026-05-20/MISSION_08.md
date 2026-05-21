# MISSION 08 — Sentinel + Guardian State

**Audit:** M4_PRE_NIGHT_COMPREHENSIVE_AUDIT  
**Date:** 2026-05-20  
**Auditor:** opticup-localhost-tester (read-only)

---

## 1. Active CRITICAL Alerts

**None.** GUARDIAN_ALERTS.md reports: "Active CRITICAL alerts: None."

---

## 2. Active HIGH Alerts (4 total)

### H-NEW-41-1 — M4 Phase 2 doc-drift cascade (HIGH, NEW today)
**Summary:** 7 new M4 JS files, 4 new doc files, new MV, new EF, 8 fresh migrations NOT reflected in canonical references (FILE_STRUCTURE.md, GLOBAL_MAP.md, M4 MODULE_MAP, GLOBAL_SCHEMA, DB_TABLES_REFERENCE). 29 migrations total un-merged.
**Night-run relevance:** DOES NOT block runtime. Code ships correctly; documentation is behind. The night-run SPEC for Resend button will add more JS files — these must be added to MODULE_MAP in the same commit to avoid compounding this debt.
**Recommendation:** Bundle M4_DOC_RESYNC_2026_05_20 SPEC into the night-run queue OR ensure the Resend button SPEC includes MODULE_MAP update in its success criteria.

### H-NEW-34-1 — `v_ai_content` anon-SELECT permission denied (HIGH, 7th day)
**Summary:** ~6 fires/hour. `anon` role has write grants on the view but no SELECT. Storefront AI copy may not load on anon-side reads.
**Night-run relevance:** NOT M4. Does not affect night-run deliverables. Low customer-visible impact (no reports). Continue monitoring.

### H-NEW-39-1 — M1 schema-doc drift (HIGH, carry)
**Summary:** 21 fresh migrations in M1 not in canonical schema docs.
**Night-run relevance:** NOT M4. Does not affect night-run deliverables.

### H-NEW-25-1 — `v_storefront_products.updated_at` (HIGH, re-opened)
**Summary:** Storefront consumer queries column that doesn't exist in the view.
**Night-run relevance:** NOT M4. Does not affect night-run deliverables.

---

## 3. Active MEDIUM Alerts (relevant to night-run)

### M-NEW-41-2 — M4 SESSION_CONTEXT 5 days stale
**Summary:** Last entry "2026-05-15 evening" — 13 SPECs closed since then including all of FUNNEL_ROADMAP Phase 2 closure.
**Night-run relevance:** MEDIUM. If the night-run Executor loads SESSION_CONTEXT and sees stale state, it may confabulate incorrect context. The Foreman's night-run SPEC should include SESSION_CONTEXT update as a mandatory step.

### M-NEW-41-3 — M4 MODULE_MAP 11 days stale
**Summary:** 7 new M4 JS files not indexed in MODULE_MAP.md.
**Night-run relevance:** MEDIUM (same as above). Resend button will add more files.

### M-NEW-40-1 / M-NEW-40-2 — column "attempts" + column "event_type" not found in Postgres logs
**Summary:** Two DB-level errors co-firing at ~04:04 UTC. Likely from `fb-capi-dispatch` EF or new triggers from `M4_FB_CAPI_PURCHASE_EVENTS` SPEC.
**Night-run relevance:** MEDIUM-HIGH. These are currently single-fire (not escalating), but they suggest the CAPI dispatch or purchase event triggers may have a column reference bug. If these escalate overnight during the night-run, the on-call automation may create noise. Recommend pre-triage before night-run start.
**Specific concern:** `crm_capi_dispatch_queue` has a `retries` column (confirmed) but `attempts` is NOT a column in any `public.*` table. If the dispatch EF or a trigger references `attempts`, it will error. The `fb-capi-dispatch` EF interface shows `retries: number` in its `QueueRow` interface — consistent with the `retries` column. Source of `attempts` reference unclear — may be from a newer EF version not read in this audit.

---

## 4. Outstanding FOREMAN_REVIEWs — 🟡 Status (Last 7 Days)

All 3 FOREMAN_REVIEWs from today closed 🟢 CLOSED:
- M4_SHORT_LINKS_400_FIX: 🟢 CLOSED
- M4_SMS_RATE_LIMIT_HOTFIX_2026_05_20: 🟢 CLOSED
- M4_SHORT_LINKS_DASHBOARD_REDESIGN: 🟢 CLOSED (after 4-round Chrome verification)

**No 🟡 CLOSED-PENDING items from today's work.**

Prior FOREMAN_REVIEWs from last 7 days not directly checked in this audit. Based on GUARDIAN_ALERTS.md, M4_REPAIR_FINAL_2026_05_19 (Path A rollback) was the prior major SPEC. Sentinel Mission 8 findings from last refresh did not flag any 🟡 open items for M4 in last 7 days.

---

## 5. Sentinel Mission Status (Recent Outputs)

From GUARDIAN_ALERTS.md metadata:
- Last 4-hour scan: 2026-05-20 ~06:50 UTC (Missions 3+4+5+8)
- Last hourly scan: 2026-05-20 ~06:10 UTC (Missions 1+2)
- This audit fills the ~10:00-16:00 UTC gap (no Sentinel run during this window)

**Expected next Sentinel run:** ~10:50 UTC (4-hour cycle from 06:50)

---

## 6. Night-Run Impact Assessment

If the night-run executes the following:
1. **Resend Failed Messages button:** adds 1-2 new JS files + possibly 1 EF. Will compound H-NEW-41-1 if not documented.
2. **Skill Harvest:** doc-only changes to SKILL.md files + CONVENTIONS.md. No DB, no EF. Sentinel will NOT flag these.
3. **M4 Regression sweep:** no code changes → no Sentinel impact.

**Pre-night-run Sentinel expectations:**
- Sentinel Mission 13 (UI Spec Verification) will scan M4_SHORT_LINKS_DASHBOARD_REDESIGN closure — expects Chrome MCP evidence. Since IR34 bypass was granted by Daniel in-chat (not via Sentinel's expected format), there may be a Mission 13 flag. This is acceptable — the bypass is documented in FOREMAN_REVIEW §10.4.

---

*Mission 08 complete.*
