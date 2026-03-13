-- ============================================================
-- Phase 5a: AI Agent DB Tables
-- 5 new tables: ai_agent_config, supplier_ocr_templates,
--   ocr_extractions, alerts, weekly_reports
-- ============================================================

-- 1. AI Agent Configuration (one row per tenant)
CREATE TABLE IF NOT EXISTS ai_agent_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID UNIQUE NOT NULL REFERENCES tenants(id),

  -- OCR settings
  ocr_enabled             BOOLEAN DEFAULT true,
  auto_match_supplier     BOOLEAN DEFAULT true,
  auto_match_po           BOOLEAN DEFAULT true,
  confidence_threshold    DECIMAL(3,2) DEFAULT 0.80,

  -- Alert settings
  alerts_enabled          BOOLEAN DEFAULT true,
  payment_reminder_days   INTEGER DEFAULT 7,
  overdue_alert           BOOLEAN DEFAULT true,
  prepaid_threshold_alert BOOLEAN DEFAULT true,
  anomaly_alert           BOOLEAN DEFAULT true,

  -- Weekly report
  weekly_report_enabled   BOOLEAN DEFAULT true,
  weekly_report_day       INTEGER DEFAULT 1,

  -- API source
  api_key_source          TEXT DEFAULT 'platform',
  tenant_api_key          TEXT,

  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- 2. Supplier OCR Templates (learning)
CREATE TABLE IF NOT EXISTS supplier_ocr_templates (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),
  supplier_id             UUID NOT NULL REFERENCES suppliers(id),

  template_name           TEXT,
  document_type_code      TEXT,
  extraction_hints        JSONB NOT NULL DEFAULT '{}',

  times_used              INTEGER DEFAULT 0,
  times_corrected         INTEGER DEFAULT 0,
  accuracy_rate           DECIMAL(5,2),
  last_used_at            TIMESTAMPTZ,

  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT now(),
  updated_at              TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, supplier_id, document_type_code)
);

-- 3. OCR Extractions
CREATE TABLE IF NOT EXISTS ocr_extractions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),

  file_url                TEXT NOT NULL,
  file_name               TEXT,

  raw_response            JSONB NOT NULL,
  model_used              TEXT DEFAULT 'claude-sonnet-4-20250514',

  extracted_data          JSONB NOT NULL,

  confidence_score        DECIMAL(3,2),
  status                  TEXT DEFAULT 'pending',
  corrections             JSONB,

  supplier_document_id    UUID REFERENCES supplier_documents(id),
  template_id             UUID REFERENCES supplier_ocr_templates(id),
  processed_by            UUID REFERENCES employees(id),

  processing_time_ms      INTEGER,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- 4. Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),

  alert_type              TEXT NOT NULL,
  severity                TEXT DEFAULT 'info',
  title                   TEXT NOT NULL,
  message                 TEXT,
  data                    JSONB,

  status                  TEXT DEFAULT 'unread',
  read_at                 TIMESTAMPTZ,
  dismissed_at            TIMESTAMPTZ,
  dismissed_by            UUID REFERENCES employees(id),
  action_taken            TEXT,

  entity_type             TEXT,
  entity_id               UUID,

  expires_at              TIMESTAMPTZ,
  created_at              TIMESTAMPTZ DEFAULT now()
);

-- 5. Weekly Reports
CREATE TABLE IF NOT EXISTS weekly_reports (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id),

  week_start              DATE NOT NULL,
  week_end                DATE NOT NULL,

  report_data             JSONB NOT NULL,

  pdf_url                 TEXT,
  pdf_generated_at        TIMESTAMPTZ,

  created_at              TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RLS — Enable + tenant isolation + service bypass
-- ============================================================

ALTER TABLE ai_agent_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON ai_agent_config
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "service_bypass" ON ai_agent_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE supplier_ocr_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON supplier_ocr_templates
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "service_bypass" ON supplier_ocr_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE ocr_extractions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON ocr_extractions
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "service_bypass" ON ocr_extractions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON alerts
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "service_bypass" ON alerts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON weekly_reports
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
CREATE POLICY "service_bypass" ON weekly_reports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_ocr_extractions_tenant ON ocr_extractions(tenant_id);
CREATE INDEX idx_ocr_extractions_status ON ocr_extractions(tenant_id, status);
CREATE INDEX idx_ocr_templates_tenant_supplier ON supplier_ocr_templates(tenant_id, supplier_id);
CREATE INDEX idx_alerts_tenant ON alerts(tenant_id);
CREATE INDEX idx_alerts_tenant_status ON alerts(tenant_id, status);
CREATE INDEX idx_alerts_tenant_type ON alerts(tenant_id, alert_type);
CREATE INDEX idx_alerts_expires ON alerts(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_weekly_reports_tenant ON weekly_reports(tenant_id);
CREATE INDEX idx_weekly_reports_period ON weekly_reports(tenant_id, week_start);

-- ============================================================
-- Seed: ai_agent_config for Prizma tenant
-- ============================================================

INSERT INTO ai_agent_config (tenant_id)
SELECT id FROM tenants WHERE slug = 'prizma'
ON CONFLICT (tenant_id) DO NOTHING;
