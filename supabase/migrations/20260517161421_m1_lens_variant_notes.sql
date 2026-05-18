-- M1 Lens — SPEC M1_LENS_DB_SCHEMA_RECEIPTS_NOTES Commit 3
-- Creates lens_variant_notes table backing the Pricing screen's לוגים+הערות
-- drawer (Brief decision #18). Notes are freeform multi-line text per variant,
-- scoped per tenant, with author attribution + created/updated timestamps.
-- Canonical 2-policy RLS: service_bypass (service_role) + tenant_isolation
-- (public, JWT-claim USING per Iron Rule 15).

CREATE TABLE lens_variant_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id  UUID NOT NULL REFERENCES lens_variant(id) ON DELETE CASCADE,
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  author_id   UUID NOT NULL REFERENCES auth.users(id),
  body        TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lens_variant_notes_variant_id ON lens_variant_notes(variant_id);
CREATE INDEX idx_lens_variant_notes_tenant_id  ON lens_variant_notes(tenant_id);

ALTER TABLE lens_variant_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_bypass ON lens_variant_notes
  TO service_role
  USING (true);

CREATE POLICY tenant_isolation ON lens_variant_notes
  TO public
  USING (tenant_id = (((current_setting('request.jwt.claims'::text, true))::json ->> 'tenant_id'::text))::uuid);

COMMENT ON TABLE lens_variant_notes IS
  'Freeform notes attached to lens_variant entries. Backs the Pricing screen לוגים+הערות drawer (Brief decision #18 — M1_LENS_DB_SCHEMA_RECEIPTS_NOTES SPEC, 2026-05-17). Tenant-scoped via JWT claim. Multiple notes per variant allowed.';
