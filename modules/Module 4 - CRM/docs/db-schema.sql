-- Module 4 — CRM: module-local DB schema
-- Scope: payment-lifecycle additions from M4_ATTENDEE_PAYMENT_SCHEMA (2026-04-25).
-- Full Module 4 schema (23+ tables) is deferred to the next Integration Ceremony
-- per Sentinel alert M7-DOC-02. This file currently documents ONLY the payment
-- lifecycle additions; future SPECs that touch Module 4 schema should append.

-- =============================================================================
-- crm_event_attendees — payment lifecycle columns (added 2026-04-25)
-- =============================================================================
-- 6 new columns + 1 CHECK constraint + 2 partial indexes + 1 RPC.
-- Legacy columns booking_fee_paid, booking_fee_refunded DROPPED in same SPEC.

-- ALTER reference (canonical migration applied via apply_migration; see
-- modules/Module 4 - CRM/migrations/2026_04_25_payment_*.sql)
ALTER TABLE crm_event_attendees
  ADD COLUMN payment_status text NOT NULL DEFAULT 'pending_payment',
  ADD COLUMN paid_at timestamptz,
  ADD COLUMN refund_requested_at timestamptz,
  ADD COLUMN refunded_at timestamptz,
  ADD COLUMN credit_expires_at timestamptz,
  ADD COLUMN credit_used_for_attendee_id uuid REFERENCES crm_event_attendees(id);

ALTER TABLE crm_event_attendees
  ADD CONSTRAINT crm_event_attendees_payment_status_check
    CHECK (payment_status IN (
      'pending_payment', 'paid', 'unpaid',
      'refund_requested', 'refunded',
      'credit_pending', 'credit_used'
    ));

CREATE INDEX idx_crm_attendees_payment_status
  ON crm_event_attendees(tenant_id, payment_status)
  WHERE is_deleted = false;

CREATE INDEX idx_crm_attendees_credit_pending
  ON crm_event_attendees(tenant_id, credit_expires_at)
  WHERE payment_status = 'credit_pending' AND is_deleted = false;

-- =============================================================================
-- transfer_credit_to_new_attendee(uuid, uuid) — atomic credit transfer RPC
-- =============================================================================
-- Validates: old in 'credit_pending', new in 'pending_payment', same tenant.
-- Atomic flip: old → 'credit_used' + back-pointer FK; new → 'paid' + paid_at.
-- SECURITY DEFINER. GRANT EXECUTE TO authenticated, service_role.

-- (See migrations/2026_04_25_payment_04_credit_transfer_rpc.sql for full body.)

-- =============================================================================
-- DROPPED at SPEC close (2026-04-25)
-- =============================================================================
-- The legacy boolean fields are gone:
--   - crm_event_attendees.booking_fee_paid (replaced by payment_status='paid')
--   - crm_event_attendees.booking_fee_refunded (replaced by payment_status='refunded')
-- The temporary sync trigger (sync_booking_fee_paid_from_status) was also dropped.

-- =============================================================================
-- v_crm_event_attendees_full — view recreated 2026-04-25
-- =============================================================================
-- Recreated to expose payment_status + 5 new columns; removed booking_fee_paid +
-- booking_fee_refunded. No dependent views (verified pre-recreation).
-- Full definition in migrations/2026_04_25_payment_05_recreate_view.sql.

-- =============================================================================
-- crm_message_templates — payment_received seeded on demo + prizma
-- =============================================================================
-- 4 rows: payment_received_sms_he + payment_received_email_he × demo + prizma.
-- Tenant-neutral content (no hardcoded business names per Iron Rule 9).
-- Variables used: %name%, %event_name%, %event_date%, %unsubscribe_url%.

-- End of payment-lifecycle additions. Full Module 4 schema reconstruction
-- pending Integration Ceremony.

-- =============================================================================
-- crm_leads.eye_exam_default — lead-level eye-exam preference (added 2026-05-03)
-- =============================================================================
-- Stores the lead's preferred eye-exam option captured at intake. Distinct from
-- crm_event_attendees.eye_exam_needed (per-event override). Body field name in
-- the lead-intake EF is `eye_exam` (mapped here). 4 canonical Hebrew options:
--   לא, אין צורך בבדיקה
--   כן, בדיקה רגילה
--   כן, בדיקת מולטיפוקל
--   יש לי כבר מרשם עדכני
-- NULL = lead created without specifying. EF rejects unknown values with HTTP
-- 400 INVALID_EYE_EXAM_DEFAULT. SPEC: M4_LEAD_EYE_EXAM_DEFAULT (Rung 1).

ALTER TABLE crm_leads
  ADD COLUMN eye_exam_default TEXT NULL;

-- =============================================================================
-- v_crm_leads_with_tags — view recreated 2026-05-03 (Rung 2)
-- =============================================================================
-- Recreated to expose crm_leads.eye_exam_default so the CRM lead-detail card
-- can read it from the in-memory cache populated by loadLeads(). Column
-- appended at the end of the SELECT list (after tag_colors) — Postgres
-- CREATE OR REPLACE VIEW cannot insert columns mid-list (42P16). Functionally
-- equivalent for callers (JS selects by name).
-- Full definition in migrations/2026_05_03_lead_eye_exam_default_02_view.sql.

-- =============================================================================
-- M4_TENANT_ISOLATION_HARDENING_PART1 (2026-05-06) — RLS + view security_invoker
-- =============================================================================
-- Closes Phase 1 audit G-CRIT-1 (cms_leads policy bypass) and G-CRIT-3 (7
-- SECURITY DEFINER views). G-CRIT-2 (12 anon-callable SECURITY DEFINER RPCs)
-- deferred to PART 2.
--
-- cms_leads policies — replaced 3 broken policies with the canonical 2-policy
-- pattern from CLAUDE.md §5 Rule 15:
--
--   DROP POLICY cms_leads_anon_insert        ON public.cms_leads;  -- WITH CHECK=true was a hole
--   DROP POLICY cms_leads_authenticated_read ON public.cms_leads;  -- USING=true was a hole
--   DROP POLICY cms_leads_service_all        ON public.cms_leads;  -- replaced by service_bypass
--
--   CREATE POLICY service_bypass ON public.cms_leads FOR ALL TO service_role
--     USING (true) WITH CHECK (true);
--
--   CREATE POLICY tenant_isolation ON public.cms_leads FOR ALL TO public
--     USING      (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid)
--     WITH CHECK (tenant_id = (((current_setting('request.jwt.claims', true))::json ->> 'tenant_id'))::uuid);
--
-- 7 v_crm_* views — added security_invoker=on so RLS on underlying tables
-- applies when the view is queried (replaces default SECURITY DEFINER behavior):
--
--   ALTER VIEW public.v_crm_campaign_performance SET (security_invoker = on);
--   ALTER VIEW public.v_crm_event_attendees_full SET (security_invoker = on);
--   ALTER VIEW public.v_crm_event_dashboard      SET (security_invoker = on);
--   ALTER VIEW public.v_crm_event_stats          SET (security_invoker = on);
--   ALTER VIEW public.v_crm_lead_event_history   SET (security_invoker = on);
--   ALTER VIEW public.v_crm_lead_timeline        SET (security_invoker = on);
--   ALTER VIEW public.v_crm_leads_with_tags      SET (security_invoker = on);
--
-- Full migration in migrations/2026_05_06_tenant_isolation_part1_up.sql.
-- Companion rollback in migrations/2026_05_06_tenant_isolation_part1_down.sql.

-- =============================================================================
-- M4_HARDCODED_PRIZMA_REMOVAL (2026-05-06) — tenant config seed
-- =============================================================================
-- Closes Phase 1 audit G-CRIT-4 + G-HIGH-3 + G-HIGH-6 + G-HIGH-7 by populating
-- previously-NULL columns + extending tenants.ui_config JSONB with 5 keys that
-- replace hardcoded values in source code (event-register UI, messaging-template
-- preview defaults, 3 EFs that hardcoded STOREFRONT_URL).
--
-- Top-level columns populated (already existed, were NULL on prizma):
--   tenants.business_phone   text
--   tenants.business_address text
--
-- New keys appended to tenants.ui_config JSONB (preserves existing keys via ||):
--   whatsapp_phone_e164   text  -- e.g. '972533645404'
--   support_phone_display text  -- e.g. '053-3645404'
--   storefront_url        text  -- e.g. 'https://prizma-optic.co.il'
--   brand                 object with { gold, gold_light, gold_hover } hex strings
--
-- Existing key preserved on prizma: `default_waze_url`.
-- Existing keys preserved on demo: `default_waze_url`, `--color-primary`,
--   `--color-primary-dark`, `--color-primary-hover`, `--color-primary-light`
--   (a separate pre-existing color-token namespace; coexists with `brand.*`).
--
-- Full migration in migrations/2026_05_06_tenant_config_seed_up.sql.
-- Companion rollback in migrations/2026_05_06_tenant_config_seed_down.sql.

-- =============================================================================
-- M4_TENANT_ISOLATION_HARDENING_PART2 (2026-05-06) — RPC EXECUTE hardening
-- =============================================================================
-- Closes Phase 1 audit G-CRIT-2 — last of the 4 audit CRITICALs. Reduces the
-- attack surface of 11 SECURITY DEFINER RPCs by revoking anon (and where
-- applicable authenticated) EXECUTE access AND the Postgres-default PUBLIC
-- EXECUTE inheritance. The 3 public-ingress RPCs are intentionally unchanged.
--
-- Group 1 — REVOKE-ANON (9 RPCs): anon=false, authenticated=true, service=true
--   move_attendee_between_events(uuid, uuid)
--   check_in_attendee(uuid, uuid)
--   transfer_credit_to_new_attendee(uuid, uuid)
--   next_crm_event_number(uuid, uuid)
--   restore_event_from_log(uuid, uuid)
--   soft_delete_event_if_empty(uuid, uuid)
--   sync_lead_status_from_attendee(uuid, uuid)
--
-- Group 2 — REVOKE-ANON-AND-AUTH (2 RPCs): anon=false, authenticated=false, service=true
--   cascade_attendee_soft_delete()                — DB trigger only
--   import_leads_from_monday(uuid, text, jsonb)   — admin migration tool only
--
-- Group 3 — KEEP-ANON (3 RPCs, unchanged): anon=true, authenticated=true, service=true
--   register_lead_to_event(uuid, uuid, uuid, text)        — public form + WhatsApp QR
--   submit_storefront_lead(uuid, uuid, text, text)        — storefront ingress
--   verify_campaign_page_password(uuid, text, text)       — storefront password gate
--   Tenant validation in body (WHERE tenant_id = p_tenant_id) is the second defense layer.
--
-- Important Postgres semantics: functions get `EXECUTE TO PUBLIC` at creation by
-- default. `REVOKE EXECUTE FROM anon` strips anon's direct grant but anon still
-- inherits via PUBLIC. The forward migration applies BOTH stages (FROM anon,
-- then FROM PUBLIC) to actually deny anon access. See finding M4-DB-01 in this
-- SPEC's FINDINGS.md.
--
-- Full migration in migrations/2026_05_06_revoke_anon_rpc_execute_up.sql.
-- Companion rollback in migrations/2026_05_06_revoke_anon_rpc_execute_down.sql.

-- =============================================================================
-- updated_at columns + auto-stamp triggers (added 2026-05-14)
-- =============================================================================
-- SPEC: modules/Module 4 - CRM/docs/specs/M4_UPDATED_AT_BACKFILL/SPEC.md
-- Closes Audit Rec 8 + debt M4-DEBT-CRM-AUTO-RULES-UPDATED-AT.
-- Reuses project-shared function public.update_updated_at() (Rule 21).
-- crm_automation_rules already had column + trigger pre-SPEC — verify-only.

ALTER TABLE public.crm_lead_notes
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.crm_lead_notes SET updated_at = created_at;  -- backfill historical rows
CREATE TRIGGER crm_lead_notes_set_updated_at_trg
  BEFORE UPDATE ON public.crm_lead_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.crm_event_attendees
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
UPDATE public.crm_event_attendees SET updated_at = created_at;
CREATE TRIGGER crm_event_attendees_set_updated_at_trg
  BEFORE UPDATE ON public.crm_event_attendees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- crm_automation_rules: pre-existing column + crm_automation_rules_set_updated_at_trg trigger.
-- No DDL applied — Rule 21 (no duplicates). 0 NULL rows in updated_at confirmed pre-flight.

-- =============================================================================
-- M3_UTM_TRIPLE_LAYER_PERSISTENCE — Phase 1 P1.1 (2026-05-14)
-- =============================================================================
-- New table crm_lead_touchpoints + 2 RPCs + 1 view.
-- See modules/Module 4 - CRM/migrations/2026_05_14_M3_UTM_TRIPLE_LAYER_*.sql
-- for canonical migrations. Below is the declarative summary.

CREATE TABLE crm_lead_touchpoints (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES public.tenants(id),
  lead_id             uuid NULL REFERENCES public.crm_leads(id) ON DELETE SET NULL,
  phone_normalized    text NULL,
  touchpoint_type     text NOT NULL,
  occurred_at         timestamptz NOT NULL DEFAULT now(),
  utm_source          text NULL,
  utm_medium          text NULL,
  utm_campaign        text NULL,
  utm_content         text NULL,
  utm_term            text NULL,
  utm_campaign_id     text NULL,
  referrer_url        text NULL,
  landing_url         text NULL,
  short_link_code     text NULL,
  short_link_id       uuid NULL REFERENCES public.short_links(id) ON DELETE SET NULL,
  broadcast_id        uuid NULL,  -- reserved for Phase 1 P1.2
  event_id            uuid NULL REFERENCES public.crm_events(id) ON DELETE SET NULL,
  attendee_id         uuid NULL REFERENCES public.crm_event_attendees(id) ON DELETE SET NULL,
  dedupe_key          text NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_lead_touchpoints_type_check CHECK (
    touchpoint_type IN ('short_link_click', 'lead_submit', 'event_register')
  ),
  CONSTRAINT crm_lead_touchpoints_tenant_dedupe_uq UNIQUE (tenant_id, dedupe_key)
);

-- Indices: 4 explicit + 1 PK auto + 1 UNIQUE auto = 6 total.
CREATE INDEX idx_crm_lead_touchpoints_tenant_lead_occurred
  ON public.crm_lead_touchpoints (tenant_id, lead_id, occurred_at);
CREATE INDEX idx_crm_lead_touchpoints_tenant_phone_type_occurred
  ON public.crm_lead_touchpoints (tenant_id, phone_normalized, touchpoint_type, occurred_at);
CREATE INDEX idx_crm_lead_touchpoints_tenant_occurred
  ON public.crm_lead_touchpoints (tenant_id, occurred_at DESC);
CREATE INDEX idx_crm_lead_touchpoints_tenant_short_link
  ON public.crm_lead_touchpoints (tenant_id, short_link_id)
  WHERE short_link_id IS NOT NULL;

-- Canonical JWT-claim RLS pattern (Iron Rule 15).
ALTER TABLE public.crm_lead_touchpoints ENABLE ROW LEVEL SECURITY;
CREATE POLICY service_bypass ON public.crm_lead_touchpoints
  AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY tenant_isolation ON public.crm_lead_touchpoints
  AS PERMISSIVE FOR ALL TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid)
  WITH CHECK (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

GRANT SELECT, INSERT ON public.crm_lead_touchpoints TO authenticated, anon;
GRANT ALL ON public.crm_lead_touchpoints TO service_role;

-- Helper RPC (SECURITY DEFINER, search_path=public).
-- See migration 02_rpcs_up.sql for full body.
-- public._record_touchpoint(...) RETURNS uuid — ON CONFLICT DO NOTHING.

-- Deferred resolver (SECURITY DEFINER, search_path=public, JWT-claim gated).
-- public.resolve_touchpoints_to_lead(p_tenant_id, p_lead_id, p_phone_normalized) RETURNS int

-- First-touch view (security_invoker=true).
-- public.v_crm_lead_first_touch returns per-(tenant,lead) earliest UTM bag,
-- preferring lead_submit > short_link_click > event_register, with fallback
-- to crm_leads.utm_* when no touchpoint exists.

-- ========================================================================
-- M4_BROADCAST_ID_PROPAGATION (Phase 1 P1.2, 2026-05-14)
-- ========================================================================
-- Closes KNOWLEDGE_MAP Layer 5 Gap #1 + Gap #2. X1 substrate: broadcast_id
-- stamped on short_links at link-build time; propagates end-to-end through
-- queue→log→short_links→clicks→touchpoints. pg_cron periodic counter.
-- See modules/Module 4 - CRM/docs/specs/M4_BROADCAST_ID_PROPAGATION/.

-- 4 new broadcast_id columns + 5 FKs to crm_broadcasts(id) ON DELETE SET NULL:
ALTER TABLE crm_message_queue  ADD COLUMN broadcast_id uuid NULL REFERENCES crm_broadcasts(id) ON DELETE SET NULL;
ALTER TABLE short_link_clicks  ADD COLUMN broadcast_id uuid NULL REFERENCES crm_broadcasts(id) ON DELETE SET NULL;
ALTER TABLE short_links        ADD COLUMN broadcast_id uuid NULL REFERENCES crm_broadcasts(id) ON DELETE SET NULL;
-- crm_lead_touchpoints.broadcast_id column already added by P1.1 (M3_UTM_TRIPLE_LAYER);
-- P1.2 adds the FK that P1.1 deliberately deferred:
ALTER TABLE crm_lead_touchpoints
  ADD CONSTRAINT crm_lead_touchpoints_broadcast_id_fkey
  FOREIGN KEY (broadcast_id) REFERENCES crm_broadcasts(id) ON DELETE SET NULL;
-- crm_message_log.broadcast_id column + FK predate this SPEC.

-- 5 partial composite indices WHERE broadcast_id IS NOT NULL:
CREATE INDEX idx_crm_message_queue_tenant_broadcast_created    ON crm_message_queue   (tenant_id, broadcast_id, created_at)  WHERE broadcast_id IS NOT NULL;
CREATE INDEX idx_crm_message_log_tenant_broadcast_created      ON crm_message_log     (tenant_id, broadcast_id, created_at)  WHERE broadcast_id IS NOT NULL;
CREATE INDEX idx_short_link_clicks_tenant_broadcast_clicked    ON short_link_clicks   (tenant_id, broadcast_id, clicked_at)  WHERE broadcast_id IS NOT NULL;
CREATE INDEX idx_short_links_tenant_broadcast                  ON short_links         (tenant_id, broadcast_id)              WHERE broadcast_id IS NOT NULL;
CREATE INDEX idx_crm_lead_touchpoints_tenant_broadcast_occurred ON crm_lead_touchpoints (tenant_id, broadcast_id, occurred_at) WHERE broadcast_id IS NOT NULL;

-- register_lead_to_event RPC: 13→14 params. New 14th param: p_broadcast_id uuid DEFAULT NULL.
-- DROP FUNCTION required on old 13-arg signature (Postgres treats different arg counts
-- as different overloads; CREATE OR REPLACE alone wouldn't replace it).
-- Body propagates p_broadcast_id into each PERFORM public._record_touchpoint(...) call
-- in place of the prior NULL literal at position 9. See migration 02 in P1.2 SPEC folder.

-- pg_cron job: crm_broadcast_total_sent_refresh
-- Schedule: '* * * * *' (every minute). Pattern: direct SQL UPDATE (no EF round-trip).
-- Idempotent: WHERE b.status IN ('queued','sending'). Tenant-agnostic: JOIN on broadcast_id only.
-- Updates total_sent + total_failed from crm_message_log COUNT(*) FILTER status='sent'/'failed';
-- flips status 'queued'→'sending'→'sent' when (sent+failed+rejected) >= total_recipients.
-- See migration 03 in P1.2 SPEC folder for full body.

-- ========================================================================
-- M3_SHORTGY_TO_INTERNAL_REDIRECT (Phase 1 P1.3, 2026-05-14)
-- ========================================================================
-- Migrates statically-embedded prizmaoptic.short.gy URLs to internal /r/<code>
-- so every customer click flows through resolve-link EF and produces
-- short_link_clicks + crm_lead_touchpoints rows (P1.1+P1.2 chain).
-- Phase 1 COMPLETE with this SPEC. See SPEC folder:
-- modules/Module 4 - CRM/docs/specs/M3_SHORTGY_TO_INTERNAL_REDIRECT/.

-- DATA ONLY — no DDL. 6 new short_links rows + 10 template body UPDATEs +
-- 2 tenants.payment_links UPDATEs.

-- New short_links rows (link_type='template_static', expires_at='2099-12-31'):
--   demo:   dsruWc1z → gpw.gamaf.co.il/?id=IzQNzbZPhyDU&sid=... (Gama ₪50 deposit, Daniel-approved as known partner)
--           NCoQWzbd → www.prizma-optic.co.il/supersale-takanon/
--   prizma: KvSzd3Zz → (same gamaf URL as demo)
--           f9Avttrn → www.prizma-optic.co.il/supersale-takanon/
--           CEiBGCWj → www.prizma-optic.co.il/supersalepricescatalog/
--           5CBy1Do4 → www.prizma-optic.co.il/supersale-stock/
-- Code generation pattern: 8-char alphanumeric (62-char alphabet, A-Za-z0-9),
-- matching send-message/url-builders.ts createShortLink() runtime pattern.
-- Iron Rule 18 advisory: the existing code-uniqueness constraint on short_links
-- is project-wide rather than tenant-bound — pre-existing debt, not in scope here.

-- Templates UPDATEd (10 rows, all tenant-scoped):
--   demo: 292f7bc7 (registration confirmation Email), 4d42b03f (coupon Email), 784cdf1c (coupon SMS)
--   prizma: 988bca26, f00620cc, c60f47ff, 679c4510, b325481a, d3e19217, 2f4e7585

-- Tenants UPDATEd (2 rows): demo.payment_links.50 + prizma.payment_links.50
-- both gmapy → internal /r/<code> at their respective storefront origins.

-- NEW ERP file: modules/crm/crm-short-links-stats.js (192 lines)
-- New CRM tab "קישורים קצרים" (data-tab="short-links") in crm.html.
-- MVP — sortable table by total_clicks DESC, no charts/filters/exports.

-- Out-of-scope SURFACES (verified untouched):
--   crm_message_log.content: 4,370 rows with short.gy (historical audit, immutable)
--   crm_message_queue.body status='sent': 1,170 rows (historical render, immutable)
--   storefront_pages.blocks: 0 rows (pre-existing clean)
--   ERP source / storefront source: 0 rows (pre-existing clean)

-- =============================================================================
-- crm_message_log — acknowledge mechanism (added 2026-05-15, M4_FAILED_MESSAGE_BADGE_CLEANUP)
-- =============================================================================
-- 3 new NULL-able columns + 1 composite index + 1 new RPC + 1 new permission key.
-- All additive — no DROP, no rename, no destructive ops.

ALTER TABLE crm_message_log
  ADD COLUMN IF NOT EXISTS acknowledged_at  timestamptz NULL,
  ADD COLUMN IF NOT EXISTS acknowledged_by  uuid        NULL REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS acknowledged_reason text     NULL;

CREATE INDEX IF NOT EXISTS idx_crm_message_log_ack
  ON crm_message_log (tenant_id, acknowledged_at);

-- RPC: acknowledge_failed_messages
--   Canonical JWT-claim tenant isolation (Iron Rule 15).
--   SET search_path='public' (SECURITY_HOTFIX_2026_05_13 hardening).
--   Idempotent — UPDATE only rows where acknowledged_at IS NULL.
--   Cross-tenant log_ids rejected with code='cross_tenant' in errors array.
--   Returns jsonb { updated_count int, skipped_count int, errors jsonb[] }.
-- Full body: see modules/Module 4 - CRM/docs/specs/M4_FAILED_MESSAGE_BADGE_CLEANUP/migrations/01_failed_message_ack.sql

-- Permission key (per-tenant; new key, granted to all 5 default roles per tenant on insert):
--   id='crm.message_log.acknowledge', module='crm', action='acknowledge'
--   name_he='סימון הודעות כושלות כמטופלות'
--
-- Wired to UI:
--   modules/crm/crm-failed-messages-modal.js — bulk modal
--   modules/crm/crm-leads-tab.js — per-lead × on the ⚠️ badge
--   modules/crm/crm-leads-detail-messages.js — "מטופל" tag in history view
