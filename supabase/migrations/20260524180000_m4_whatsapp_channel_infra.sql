-- M4_WHATSAPP_CHANNEL_INFRA: Wire WhatsApp as first-class M4 channel via Dialog360.
-- channel_configs table + template/log column extensions + seed data.

-- 1. channel_configs table (per-tenant per-channel vendor config)
CREATE TABLE channel_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  channel text NOT NULL CHECK (channel IN ('whatsapp','sms','email')),
  provider text NOT NULL CHECK (provider IN ('dialog360','global_sms','gmail')),
  sender_identity text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  provider_credentials jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel)
);
ALTER TABLE channel_configs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "tenant_isolation" ON channel_configs
    FOR ALL USING (tenant_id = (current_setting('request.jwt.claims',true)::json->>'tenant_id')::uuid);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
GRANT SELECT ON channel_configs TO authenticated, service_role;

-- 2. Extend crm_message_templates with whatsapp_template_name
ALTER TABLE crm_message_templates ADD COLUMN IF NOT EXISTS whatsapp_template_name text;

-- 3. Extend crm_message_log with meta_message_id (Dialog360/Meta message tracking)
ALTER TABLE crm_message_log ADD COLUMN IF NOT EXISTS meta_message_id text;
