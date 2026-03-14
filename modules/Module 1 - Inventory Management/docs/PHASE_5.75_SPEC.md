# Optic Up — Phase 5.75: Communications & Knowledge Infrastructure

> **Phase 5.75 — Infrastructure (DB stubs only)**
> **Dependencies:** Phase 5.5 complete
> **Location:** modules/Module 1 - Inventory Management/docs/PHASE_5.75_SPEC.md

---

## 1. Overview

Phase 5.75 is a **zero-UI phase** — like 3.75 was for multi-tenancy.
It creates the database foundation for a future communications platform that will
serve three expanding rings:

```
Ring 1 — Internal (MVP):
  Employee ↔ Employee messaging within a store
  Context-linked: messages attached to orders, customers, items
  Knowledge base: manager answers become reusable procedures

Ring 2 — AI Assistant:
  Employee → AI: "How do I process a return for a defective frame?"
  AI reads knowledge_base + logs → suggests answer
  Manager reviews AI answers → improves knowledge base

Ring 3 — External:
  Store ↔ Supplier (linked to supplier portal, Phase 6+)
  Store ↔ Customer (linked to future CRM/Storefront)
  AI-assisted: auto-draft responses based on context
```

**What we build now:** Tables for all three rings, empty and ready.
**What we do NOT build:** Any JS, UI, Edge Function, or AI integration.

The goal: when we build the communications module (future), zero schema changes.

---

## 2. Design Principles

### 2.1 One table for all message types

Not three separate tables for internal/supplier/customer messages.
One `messages` table with `channel_type` that determines who's talking to whom.
This means:
- One query engine
- One notification system
- One search index
- AI sees everything in one place (per tenant, per permission)

### 2.2 Conversations, not loose messages

Messages belong to a `conversation`. A conversation can be:
- A direct chat between two employees
- A group discussion about a specific order
- A thread with a supplier about a delivery
- A customer inquiry about their glasses

### 2.3 Context is king

Every conversation can be linked to a business entity:
- An order, a customer, an inventory item, a PO, a supplier document
- When someone opens a conversation from within an entity screen, they
  see the full business context alongside the chat

### 2.4 Knowledge extraction

Any message can be "promoted" to a knowledge base entry.
This is how the AI learns:
- Manager answers "how to handle Italian supplier returns?"
- Manager clicks "שמור כהנחיית עבודה"
- Entry goes to knowledge_base with tags and category
- Next time an employee asks something similar, AI finds it

---

## 3. Database Schema

### 3.1 Conversations

```sql
CREATE TABLE conversations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),

  -- Type
  channel_type      TEXT NOT NULL,
  -- 'internal'        — employee ↔ employee
  -- 'supplier'        — store ↔ supplier (future)
  -- 'customer'        — store ↔ customer (future)
  -- 'ai_assistant'    — employee ↔ AI (future)
  -- 'group'           — multiple employees (future)
  -- 'announcement'    — one-to-many broadcast (future)

  -- Context link (what is this conversation about?)
  context_type      TEXT,
  -- 'purchase_order', 'goods_receipt', 'supplier_document',
  -- 'inventory_item', 'supplier_return', 'customer', 'prescription',
  -- 'general', NULL
  context_id        UUID,               -- FK to the relevant entity (polymorphic)
  context_label     TEXT,               -- human-readable: "הזמנה PO-15-0042" (cached for display)

  -- Participants summary (denormalized for list display)
  title             TEXT,               -- conversation title (auto or manual)
  last_message_at   TIMESTAMPTZ,        -- for sorting conversation list
  last_message_text TEXT,               -- preview text (truncated)
  message_count     INTEGER DEFAULT 0,

  -- Status
  status            TEXT DEFAULT 'active',  -- 'active', 'archived', 'closed'
  is_pinned         BOOLEAN DEFAULT false,

  -- Metadata
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_tenant_channel ON conversations(tenant_id, channel_type);
CREATE INDEX idx_conversations_tenant_context ON conversations(tenant_id, context_type, context_id);
CREATE INDEX idx_conversations_tenant_last_msg ON conversations(tenant_id, last_message_at DESC);
```

### 3.2 Conversation Participants

```sql
CREATE TABLE conversation_participants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  conversation_id   UUID NOT NULL REFERENCES conversations(id),

  -- Who
  participant_type  TEXT NOT NULL,
  -- 'employee'    — internal user
  -- 'supplier'    — external supplier (future)
  -- 'customer'    — external customer (future)
  -- 'ai_agent'    — AI participant (future)
  participant_id    UUID NOT NULL,       -- FK to employees/suppliers/customers (polymorphic)
  participant_name  TEXT,                -- cached display name

  -- Role in conversation
  role              TEXT DEFAULT 'member',  -- 'owner', 'admin', 'member', 'observer'

  -- Read tracking
  last_read_at      TIMESTAMPTZ,         -- last time this participant read the conversation
  unread_count      INTEGER DEFAULT 0,   -- messages since last_read_at

  -- Notification preferences (per conversation)
  muted             BOOLEAN DEFAULT false,
  notification_pref TEXT DEFAULT 'all',   -- 'all', 'mentions', 'none'

  -- Status
  joined_at         TIMESTAMPTZ DEFAULT now(),
  left_at           TIMESTAMPTZ,         -- NULL if still active
  is_active         BOOLEAN DEFAULT true,

  UNIQUE(conversation_id, participant_type, participant_id)
);

CREATE INDEX idx_conv_participants_tenant ON conversation_participants(tenant_id);
CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(tenant_id, participant_type, participant_id);
CREATE INDEX idx_conv_participants_unread ON conversation_participants(tenant_id, participant_id, unread_count)
  WHERE unread_count > 0 AND is_active = true;
```

### 3.3 Messages

```sql
CREATE TABLE messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  conversation_id   UUID NOT NULL REFERENCES conversations(id),

  -- Sender
  sender_type       TEXT NOT NULL,        -- 'employee', 'supplier', 'customer', 'ai_agent', 'system'
  sender_id         UUID,                 -- NULL for system messages
  sender_name       TEXT,                 -- cached display name

  -- Content
  message_type      TEXT DEFAULT 'text',
  -- 'text'          — regular text message
  -- 'file'          — file attachment
  -- 'image'         — image attachment
  -- 'entity_ref'    — reference/link to a business entity
  -- 'ai_suggestion' — AI-generated response (future)
  -- 'system'        — system notification (user joined, status changed, etc.)

  content           TEXT,                 -- message text (or description for non-text)
  content_html      TEXT,                 -- rich text version (future)

  -- File attachment (if message_type = 'file' or 'image')
  file_url          TEXT,
  file_name         TEXT,
  file_size          INTEGER,
  file_mime_type    TEXT,

  -- Entity reference (if message_type = 'entity_ref')
  ref_entity_type   TEXT,                -- 'inventory_item', 'purchase_order', etc.
  ref_entity_id     UUID,
  ref_entity_label  TEXT,                -- "מסגרת RB5154 ברקוד 0012345"

  -- AI metadata (future)
  is_ai_generated   BOOLEAN DEFAULT false,
  ai_confidence     DECIMAL(3,2),        -- 0.00 - 1.00
  ai_source_ids     UUID[],              -- which knowledge_base entries were used
  ai_approved_by    UUID REFERENCES employees(id),
  ai_approved_at    TIMESTAMPTZ,

  -- Threading
  reply_to_id       UUID REFERENCES messages(id),  -- for threaded replies
  thread_count      INTEGER DEFAULT 0,              -- replies to this message

  -- Status
  status            TEXT DEFAULT 'sent',  -- 'sent', 'delivered', 'read', 'edited', 'deleted'
  edited_at         TIMESTAMPTZ,
  edited_content    TEXT,                 -- original content before edit

  -- Metadata
  created_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

CREATE INDEX idx_messages_tenant ON messages(tenant_id);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX idx_messages_tenant_sender ON messages(tenant_id, sender_type, sender_id);
CREATE INDEX idx_messages_reply ON messages(reply_to_id) WHERE reply_to_id IS NOT NULL;
CREATE INDEX idx_messages_ai ON messages(tenant_id, is_ai_generated) WHERE is_ai_generated = true;
```

### 3.4 Knowledge Base

```sql
CREATE TABLE knowledge_base (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),

  -- Content
  title             TEXT NOT NULL,        -- "איך מזכים לקוח על מוצר פגום?"
  question          TEXT,                 -- the original question (if extracted from chat)
  answer            TEXT NOT NULL,        -- the procedure / answer
  answer_html       TEXT,                 -- rich text version (future)

  -- Classification
  category          TEXT,
  -- 'inventory'       — מלאי
  -- 'purchasing'      — רכש
  -- 'supplier_debt'   — חובות ספקים
  -- 'customer_service'— שירות לקוחות
  -- 'returns'         — החזרות
  -- 'operations'      — תפעול כללי
  -- 'policy'          — מדיניות
  -- custom per tenant

  tags              TEXT[],              -- ["החזרה", "זיכוי", "ספק חו\"ל"]
  language          TEXT DEFAULT 'he',   -- ISO 639-1

  -- Source
  source_type       TEXT DEFAULT 'manual',
  -- 'manual'         — someone wrote it directly
  -- 'from_message'   — extracted from a chat message
  -- 'from_ai'        — AI generated and approved (future)
  -- 'imported'       — imported from external source (future)
  source_message_id UUID REFERENCES messages(id),    -- if from_message
  source_conversation_id UUID REFERENCES conversations(id),

  -- AI usage
  ai_usable         BOOLEAN DEFAULT true,    -- can AI use this to answer questions?
  ai_use_count      INTEGER DEFAULT 0,       -- how many times AI referenced this
  ai_last_used_at   TIMESTAMPTZ,
  ai_effectiveness  DECIMAL(3,2),            -- positive feedback rate on AI answers using this

  -- Embeddings (future — for semantic search)
  embedding_vector  TEXT,                    -- stored as text, parsed to vector when needed
  -- Or: embedding VECTOR(1536) if pgvector extension is available

  -- Approval
  approved_by       UUID REFERENCES employees(id),
  approved_at       TIMESTAMPTZ,
  status            TEXT DEFAULT 'draft',    -- 'draft', 'approved', 'archived', 'deprecated'

  -- Versioning
  version           INTEGER DEFAULT 1,
  previous_version_id UUID REFERENCES knowledge_base(id),

  -- Metadata
  created_by        UUID REFERENCES employees(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  is_deleted        BOOLEAN DEFAULT false
);

CREATE INDEX idx_knowledge_tenant ON knowledge_base(tenant_id);
CREATE INDEX idx_knowledge_tenant_category ON knowledge_base(tenant_id, category);
CREATE INDEX idx_knowledge_tenant_status ON knowledge_base(tenant_id, status);
CREATE INDEX idx_knowledge_tenant_tags ON knowledge_base USING GIN(tags);
CREATE INDEX idx_knowledge_ai_usable ON knowledge_base(tenant_id, ai_usable)
  WHERE ai_usable = true AND status = 'approved' AND is_deleted = false;
```

### 3.5 Message Reactions (lightweight engagement tracking)

```sql
CREATE TABLE message_reactions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  message_id        UUID NOT NULL REFERENCES messages(id),
  employee_id       UUID NOT NULL REFERENCES employees(id),
  reaction          TEXT NOT NULL,        -- '👍', '✅', '❓', '⚠️', custom
  created_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(message_id, employee_id, reaction)
);

CREATE INDEX idx_reactions_message ON message_reactions(message_id);
```

### 3.6 Notification Preferences (global per employee)

```sql
CREATE TABLE notification_preferences (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id),
  employee_id       UUID NOT NULL REFERENCES employees(id),

  -- Channel preferences
  in_app            BOOLEAN DEFAULT true,
  email             BOOLEAN DEFAULT false,   -- future
  whatsapp          BOOLEAN DEFAULT false,   -- future
  push              BOOLEAN DEFAULT false,   -- future

  -- What to notify about
  notify_direct_messages    BOOLEAN DEFAULT true,
  notify_group_messages     BOOLEAN DEFAULT true,
  notify_mentions           BOOLEAN DEFAULT true,
  notify_ai_suggestions     BOOLEAN DEFAULT true,
  notify_context_updates    BOOLEAN DEFAULT true,  -- when entity you discussed changes

  -- Quiet hours
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start   TIME,              -- e.g., 22:00
  quiet_hours_end     TIME,              -- e.g., 07:00

  -- Summary
  daily_digest        BOOLEAN DEFAULT false,  -- future: daily email summary

  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),

  UNIQUE(tenant_id, employee_id)
);

CREATE INDEX idx_notif_prefs_tenant ON notification_preferences(tenant_id);
```

---

## 4. RLS Policies

All tables: standard tenant isolation + service bypass.

```sql
-- Apply to: conversations, conversation_participants, messages,
--           knowledge_base, message_reactions, notification_preferences

ALTER TABLE {table} ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation ON {table}
  FOR ALL
  USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

CREATE POLICY service_bypass ON {table}
  FOR ALL TO service_role
  USING (true);
```

**Future enhancement (not now):** Row-level policies for message visibility —
employee sees only conversations they participate in. For now, tenant isolation
is sufficient since all employees in a store can see all internal messages.

---

## 5. How This Supports Future Rings

### Ring 1 — Internal Messaging (next feature module)

Uses: `conversations` (channel_type = 'internal'), `messages`, `conversation_participants`

Flow:
```
Employee opens PO → clicks 💬 → new conversation with context_type='purchase_order'
→ adds colleague as participant → sends message → colleague sees notification
→ colleague opens conversation → sees PO data alongside chat
```

Knowledge base:
```
Manager answers question → clicks "שמור כהנחיית עבודה"
→ message.content copied to knowledge_base.answer
→ source_message_id linked back
→ manager sets category + tags → status = 'approved'
```

### Ring 2 — AI Assistant (future)

Uses: `knowledge_base` (ai_usable = true), `messages` (is_ai_generated), `conversations` (channel_type = 'ai_assistant')

Flow:
```
Employee opens AI chat → asks "How do I return frames to Italian supplier?"
→ AI searches knowledge_base (by category, tags, future: embeddings)
→ AI also reads relevant inventory_logs, supplier_documents
→ AI drafts response with confidence score
→ If confidence > threshold → show directly
→ If confidence low → route to manager
→ Manager approves/edits → AI learns
```

### Ring 3 — External Communications (future)

Uses: `conversations` (channel_type = 'supplier' or 'customer'), `conversation_participants` (participant_type = 'supplier' or 'customer')

Flow:
```
Supplier sends message via portal → conversation created
→ employee notified → replies from within Optic Up
→ AI can auto-draft: "הסחורה התקבלה, חשבונית מספר X נרשמה"
```

Customer flow:
```
Customer asks about order via storefront → conversation created
→ AI answers based on order status + knowledge_base
→ Employee takes over if needed
```

---

## 6. Contracts (Future RPC Functions)

These will be built when the UI module is developed. Listed here for planning:

```sql
-- Not created now — just documented for future reference:

-- sendMessage(conversation_id, content, sender_id, tenant_id)
-- getConversations(tenant_id, participant_id, channel_type, limit)
-- getMessages(conversation_id, tenant_id, before_cursor, limit)
-- markAsRead(conversation_id, participant_id, tenant_id)
-- getUnreadCount(participant_id, tenant_id) → { total, per_conversation }
-- promoteToKnowledge(message_id, category, tags, tenant_id) → knowledge_base_id
-- searchKnowledge(query, category, tags, tenant_id) → knowledge_base[]
-- getContextConversations(context_type, context_id, tenant_id) → conversations[]
```

---

## 7. Execution Order

```
Step 1 — Create migration SQL with all 6 tables + indexes + RLS
Step 2 — Run migration against Supabase
Step 3 — Verify: all tables exist, RLS active, zero errors
Step 4 — Update documentation:
         - ROADMAP.md: add Phase 5.75 row
         - db-schema.sql: add new tables
         - CHANGELOG.md: new section
         - MODULE_SPEC.md: mention stubs exist
```

**Total estimated effort: 1-2 hours.**

---

## 8. Verification Checklist

- [ ] All 6 tables created successfully
- [ ] All tables have tenant_id NOT NULL
- [ ] All tables have RLS enabled with tenant isolation
- [ ] All indexes created
- [ ] GIN index on knowledge_base.tags works
- [ ] UNIQUE constraints enforce correctly
- [ ] No FK errors (all referenced tables exist)
- [ ] Zero console errors on all existing pages
- [ ] No regression on Phase 5/5.5 features

---

## 9. What's NOT in Phase 5.75

| Feature | When |
|---------|------|
| Any UI or JS code | Future communications module |
| Edge Functions for messaging | Future communications module |
| AI assistant integration | After communications module MVP |
| Supabase Realtime subscriptions | Future (for live chat) |
| pgvector for semantic search | Future (when AI assistant is built) |
| File upload for chat attachments | Future (reuse existing Storage) |
| Email/WhatsApp delivery | Future notification infrastructure |
| Row-level message visibility (beyond tenant) | Future (when needed for security) |
| Seed data | No seed needed — tables start empty |
