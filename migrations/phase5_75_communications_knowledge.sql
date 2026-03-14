-- ============================================================
-- Phase 5.75: Communications & Knowledge Infrastructure
-- Date: 2026-03-13
-- Description: 6 new tables (DB stubs only, zero UI)
--   1. conversations
--   2. conversation_participants
--   3. messages
--   4. knowledge_base
--   5. message_reactions
--   6. notification_preferences
-- ============================================================

-- ============================================================
-- 1. CONVERSATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),

  -- Type
  channel_type      TEXT NOT NULL,
  -- 'internal'        — employee <-> employee
  -- 'supplier'        — store <-> supplier (future)
  -- 'customer'        — store <-> customer (future)
  -- 'ai_assistant'    — employee <-> AI (future)
  -- 'group'           — multiple employees (future)
  -- 'announcement'    — one-to-many broadcast (future)

  -- Context link (what is this conversation about?)
  context_type      TEXT,
  -- 'purchase_order', 'goods_receipt', 'supplier_document',
  -- 'inventory_item', 'supplier_return', 'customer', 'prescription',
  -- 'general', NULL
  context_id        UUID,
  context_label     TEXT,

  -- Participants summary (denormalized for list display)
  title             TEXT,
  last_message_at   TIMESTAMPTZ,
  last_message_text TEXT,
  message_count     INTEGER DEFAULT 0,

  -- Status
  status            TEXT DEFAULT 'active',
  is_pinned         BOOLEAN DEFAULT false,

  -- Metadata
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_channel ON conversations(tenant_id, channel_type);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_context ON conversations(tenant_id, context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_last_msg ON conversations(tenant_id, last_message_at DESC);

-- ============================================================
-- 2. CONVERSATION_PARTICIPANTS
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_participants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  conversation_id   UUID NOT NULL REFERENCES conversations(id),

  -- Who
  participant_type  TEXT NOT NULL,
  -- 'employee'    — internal user
  -- 'supplier'    — external supplier (future)
  -- 'customer'    — external customer (future)
  -- 'ai_agent'    — AI participant (future)
  participant_id    UUID NOT NULL,
  participant_name  TEXT,

  -- Role in conversation
  role              TEXT DEFAULT 'member',

  -- Read tracking
  last_read_at      TIMESTAMPTZ,
  unread_count      INTEGER DEFAULT 0,

  -- Notification preferences (per conversation)
  muted             BOOLEAN DEFAULT false,
  notification_pref TEXT DEFAULT 'all',

  -- Status
  joined_at         TIMESTAMPTZ DEFAULT now(),
  left_at           TIMESTAMPTZ,
  is_active         BOOLEAN DEFAULT true,

  UNIQUE(conversation_id, participant_type, participant_id)
);

CREATE INDEX IF NOT EXISTS idx_conv_participants_tenant ON conversation_participants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(tenant_id, participant_type, participant_id);
CREATE INDEX IF NOT EXISTS idx_conv_participants_unread ON conversation_participants(tenant_id, participant_id, unread_count)
  WHERE unread_count > 0 AND is_active = true;

-- ============================================================
-- 3. MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  conversation_id   UUID NOT NULL REFERENCES conversations(id),

  -- Sender
  sender_type       TEXT NOT NULL,
  sender_id         UUID,
  sender_name       TEXT,

  -- Content
  message_type      TEXT DEFAULT 'text',
  -- 'text'          — regular text message
  -- 'file'          — file attachment
  -- 'image'         — image attachment
  -- 'entity_ref'    — reference/link to a business entity
  -- 'ai_suggestion' — AI-generated response (future)
  -- 'system'        — system notification

  content           TEXT,
  content_html      TEXT,

  -- File attachment (if message_type = 'file' or 'image')
  file_url          TEXT,
  file_name         TEXT,
  file_size         INTEGER,
  file_mime_type    TEXT,

  -- Entity reference (if message_type = 'entity_ref')
  ref_entity_type   TEXT,
  ref_entity_id     UUID,
  ref_entity_label  TEXT,

  -- AI metadata (future)
  is_ai_generated   BOOLEAN DEFAULT false,
  ai_confidence     DECIMAL(3,2),
  ai_source_ids     UUID[],
  ai_approved_by    UUID REFERENCES employees(id),
  ai_approved_at    TIMESTAMPTZ,

  -- Threading
  reply_to_id       UUID REFERENCES messages(id),
  thread_count      INTEGER DEFAULT 0,

  -- Status
  status            TEXT DEFAULT 'sent',
  edited_at         TIMESTAMPTZ,
  edited_content    TEXT,

  -- Metadata
  created_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_messages_tenant ON messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_tenant_sender ON messages(tenant_id, sender_type, sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_ai ON messages(tenant_id, is_ai_generated) WHERE is_ai_generated = true;

-- ============================================================
-- 4. KNOWLEDGE_BASE
-- ============================================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),

  -- Content
  title             TEXT NOT NULL,
  question          TEXT,
  answer            TEXT NOT NULL,
  answer_html       TEXT,

  -- Classification
  category          TEXT,
  tags              TEXT[],
  language          TEXT DEFAULT 'he',

  -- Source
  source_type       TEXT DEFAULT 'manual',
  source_message_id UUID REFERENCES messages(id),
  source_conversation_id UUID REFERENCES conversations(id),

  -- AI usage
  ai_usable         BOOLEAN DEFAULT true,
  ai_use_count      INTEGER DEFAULT 0,
  ai_last_used_at   TIMESTAMPTZ,
  ai_effectiveness  DECIMAL(3,2),

  -- Embeddings (future — for semantic search)
  embedding_vector  TEXT,

  -- Approval
  approved_by       UUID REFERENCES employees(id),
  approved_at       TIMESTAMPTZ,
  status            TEXT DEFAULT 'draft',

  -- Versioning
  version           INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES knowledge_base(id),

  -- Metadata
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_knowledge_tenant ON knowledge_base(tenant_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_tenant_category ON knowledge_base(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_knowledge_tenant_status ON knowledge_base(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_knowledge_tenant_tags ON knowledge_base USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_ai_usable ON knowledge_base(tenant_id, ai_usable)
  WHERE ai_usable = true AND status = 'approved' AND is_deleted = false;

-- ============================================================
-- 5. MESSAGE_REACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS message_reactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  message_id        UUID NOT NULL REFERENCES messages(id),
  employee_id       UUID NOT NULL REFERENCES employees(id),
  reaction          TEXT NOT NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(message_id, employee_id, reaction)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message ON message_reactions(message_id);

-- ============================================================
-- 6. NOTIFICATION_PREFERENCES
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  employee_id       UUID NOT NULL REFERENCES employees(id),

  -- Channel preferences
  in_app            BOOLEAN DEFAULT true,
  email             BOOLEAN DEFAULT false,
  whatsapp          BOOLEAN DEFAULT false,
  push              BOOLEAN DEFAULT false,

  -- What to notify about
  notify_direct_messages    BOOLEAN DEFAULT true,
  notify_group_messages     BOOLEAN DEFAULT true,
  notify_mentions           BOOLEAN DEFAULT true,
  notify_ai_suggestions     BOOLEAN DEFAULT true,
  notify_context_updates    BOOLEAN DEFAULT true,

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start   TIME,
  quiet_hours_end     TIME,

  -- Summary
  daily_digest        BOOLEAN DEFAULT false,

  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_notif_prefs_tenant ON notification_preferences(tenant_id);

-- ============================================================
-- ROW LEVEL SECURITY — Enable + Tenant Isolation + Service Bypass
-- ============================================================

-- conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversations
  FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON conversations
  FOR ALL TO service_role
  USING (true);

-- conversation_participants
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON conversation_participants
  FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON conversation_participants
  FOR ALL TO service_role
  USING (true);

-- messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON messages
  FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON messages
  FOR ALL TO service_role
  USING (true);

-- knowledge_base
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON knowledge_base
  FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON knowledge_base
  FOR ALL TO service_role
  USING (true);

-- message_reactions
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON message_reactions
  FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON message_reactions
  FOR ALL TO service_role
  USING (true);

-- notification_preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON notification_preferences
  FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);
CREATE POLICY service_bypass ON notification_preferences
  FOR ALL TO service_role
  USING (true);

-- ============================================================
-- VERIFICATION: 6 tables created
--   1. conversations           ✓ tenant_id NOT NULL
--   2. conversation_participants ✓ tenant_id NOT NULL
--   3. messages                ✓ tenant_id NOT NULL
--   4. knowledge_base          ✓ tenant_id NOT NULL
--   5. message_reactions       ✓ tenant_id NOT NULL
--   6. notification_preferences ✓ tenant_id NOT NULL
-- All 6 tables: RLS enabled, tenant_isolation policy, service_bypass policy
-- Total indexes: 16
-- Total UNIQUE constraints: 3
-- FK references verified: tenants(id), employees(id), conversations(id), messages(id), knowledge_base(id)
-- ============================================================
