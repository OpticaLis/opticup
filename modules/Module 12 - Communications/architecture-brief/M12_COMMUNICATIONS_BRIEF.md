# Module 12 — Communications — Architecture Brief

**Brief version:** v1
**Date:** 2026-05-09
**Author:** Main Strategic Architect
**Hand-off to:** Module Strategist (`opticup-strategic` skill)
**Status:** Locked. Ready for Module Strategist to begin SPEC authoring.

---

## 1. Mission (1 paragraph)

M12 is the **outbound + inbound communication backbone** for Optic Up. Every customer-touching message — order confirmations, recall reminders, appointment reminders, payment confirmations, marketing campaigns — flows through this module. M12 owns the templates, the sending engine (Edge Function `send-message`), the message log, the unified Inbox screen for staff to receive and reply to incoming WhatsApp messages, and the consent infrastructure mandated by Israeli Section 30א of the Communications Law. M12 ships in three channels day-1: **WhatsApp (via 360dialog Coexistence), SMS (via GLOBAL SMS through Make), Email (via Gmail through Make)**. WhatsApp is the day-1 critical-path channel — without it, the LIVE cutover regresses Prizma's daily operations.

---

## 2. Scope — In (LIVE day-1)

**Sending engine + infrastructure:**
- Edge Function `send-message` extended to support 3 channels (already exists for SMS+Email; WhatsApp is new).
- `channel_configs` table per-tenant — defines which Sender ID / phone / email each channel uses for each tenant.
- Hybrid model: platform-default shared channel + per-tenant override (own number = upgrade). Day-1 Prizma uses own-number for WhatsApp + SMS + Email; future new tenants default to shared.
- `message_templates` table (already exists, extend for multi-channel + transactional/marketing flag).
- `message_log` table (already exists, extend for full lifecycle: pending → sent → delivered → read → failed; bidirectional for WhatsApp).
- `conversations` table (NEW) — groups messages per customer per channel; backbone of the WhatsApp Inbox.

**WhatsApp specifically (day-1 critical):**
- 360dialog as BSP, Coexistence Mode (staff phone WhatsApp Business app stays live + API works in parallel).
- Direct Edge Function ↔ 360dialog REST API integration (NOT through Make — Make is one-way only; WhatsApp is two-way).
- `smb_message_echoes` webhook → DB → unified Inbox (staff phone replies appear in the system automatically).
- Inbox screen: 3-pane RTL layout (conversations right, thread center, customer context left). Multi-agent: claim/assign, internal notes (yellow inline), filter chips (All / Mine / Unassigned / Open / Closed).
- 17 templates carried over from `doc_title` in OpticPlus → migrated to `message_templates` with WhatsApp template approval submitted to Meta.

**SMS:**
- GLOBAL SMS stays. Sender ID "PrizmaOptic" stays (already approved with all Israeli carriers). One-way only (alphanumeric Sender ID limitation).
- Edge Function → Make webhook → GLOBAL SMS API. Existing pattern.

**Email:**
- Gmail through Make stays. `info@prizma-optic.co.il` Sender stays.
- One-way send-only at day-1. Inbound email replies → existing `info@` mailbox (no system-Inbox yet).

**Consent (legal mandate, not optional):**
- 3 separate consent flags per customer: `consent_sms`, `consent_whatsapp`, `consent_email`.
- `consent_log` append-only audit table (timestamp, source, consent text shown, IP/device, opt-out events).
- Hard code separation: `transactional` templates skip consent check; `marketing` templates enforce `consent_<channel>=true` at send-time.
- Opt-out mechanism in every marketing message (one-click for email/SMS via short-link; STOP/הסר reply for SMS/WhatsApp).
- Opt-out honored within 24h via webhook → DB flag flip.

**Customer-card integration (M5 hook):**
- New "תקשורת" tab inside M5 customer card showing message timeline + statistics + consent summary.
- Quick actions: "Open WhatsApp conversation" (jumps to Inbox), "Send manual message" (template picker + recipient locked).

**Channel admin UI (per-tenant):**
- Single screen showing this tenant's channels (own vs shared, sender IDs, statistics).
- "Upgrade" CTA for shared channels — triggers manual onboarding by Optic Up team (NOT self-service day-1).

---

## 3. Scope — Out (explicit anti-creep list)

**Deferred features (post-LIVE, NOT in M12 day-1):**
- AI agent that replies autonomously to customers (architecture slot reserved; build is later).
- Migration from Gmail to Resend/Postmark (deferred until volume exceeds 100 emails/day or first deliverability complaint).
- Self-service tenant onboarding (Embedded Signup wizard for new tenants to bring their own WhatsApp number) — day-1 = manual onboarding by Optic Up team.
- Email Inbox in the system (inbound email goes to `info@` mailbox; system Inbox is WhatsApp-only day-1).
- SMS Inbox (Israeli alphanumeric Sender IDs cannot receive replies — fundamental limitation).
- Per-template A/B testing.
- Per-template scheduled sends (templates fire when triggered; scheduling is owned by the calling module).
- Conversation intent classification UI (data field reserved; no UI strip).
- Multi-language template auto-translation (each language is a separate template row).
- Conversation transfer between agents with notification (claim model is enough day-1).
- Birthday auto-message (deferred per M5 brief; field reserved, automation off).
- SMS broadcast 1000+ recipients (POST-1 backlog item, not in M12 day-1).

**Owned by other modules (M12 must NOT replicate):**
- Customer profile data → M5 (`customers` table).
- Order data → M7 (M12 templates use `%order_number%` variable, never store order data).
- Appointment data → M14 (M12 templates use `%appointment_time%` variable; appointment events trigger M12 sends).
- Recall logic / cadence rules → M6 (M6 owns "when to send recall"; M12 owns "how to send it").
- Payment confirmation logic → M8 (M8 fires "payment received" event; M12 sends the confirmation).

---

## 4. Locked Decisions

These are pre-locked from the 2026-05-09 strategic session. Do not relitigate without Main Strategic consultation.

| # | Decision | Source |
|---|---|---|
| 1 | WhatsApp BSP = **360dialog** | DECISIONS_LOG 2026-05-09 #1 |
| 2 | WhatsApp mode = **Coexistence** (staff phone app + API in parallel) | DECISIONS_LOG 2026-05-09 #2 |
| 3 | WhatsApp connection = **Edge Function direct → 360dialog REST API** (NOT through Make) | DECISIONS_LOG 2026-05-09 #4 |
| 4 | SMS provider = **GLOBAL SMS stays** (existing Make integration, "PrizmaOptic" Sender ID approved) | DECISIONS_LOG 2026-05-09 #5 |
| 5 | Email provider = **Gmail through Make stays** day-1; deferred Resend/Postmark migration post-LIVE | DECISIONS_LOG 2026-05-09 #6 |
| 6 | Channel architecture = **`channel_configs` table per-tenant + per-module routing** | DECISIONS_LOG 2026-05-09 #7 |
| 7 | Channel ownership model = **hybrid** — platform-default shared channel + per-tenant override (upgrade tier) | DECISIONS_LOG 2026-05-09 #8 |
| 8 | WhatsApp Inbox in the system = **day-1 mandatory** (Coexistence + smb_message_echoes mirroring) | DECISIONS_LOG 2026-05-09 #9 |
| 9 | AI agent = **deferred post-LIVE**, but architecture slot reserved (data fields + UI strip behind feature flag) | DECISIONS_LOG 2026-05-09 #9 |
| 10 | Inbox UX = **3-pane RTL** (conversations-right, thread-center, customer-context-left) per SmartSend + global leaders convergence | DECISIONS_LOG 2026-05-09 #10 |
| 11 | Consent = **3 separate flags per customer** (`consent_sms`, `consent_whatsapp`, `consent_email`), append-only `consent_log`, hard separation transactional/marketing | DECISIONS_LOG 2026-05-09 #12 |
| 12 | Consent capture UX = **contextual** (per touchpoint, not bundled in one screen) — UX design deferred to a separate session, but infra supports it | DECISIONS_LOG 2026-05-09 #12 |
| 13 | Tenant channel admin = **single screen per tenant** showing own/shared status; cross-tenant Platform Admin view = NOT in scope day-1 | DECISIONS_LOG 2026-05-09 #8 |
| 14 | Variable syntax = `%name%` (decided 2026-04-22 in Architecture v2) | auto-memory `project_messaging_architecture_v2.md` |
| 15 | Template language strategy = **one template row per language** (no auto-translation), HE/RU/EN day-1, ES later | per Launch Decision Q15 |

---

## 5. Entities (day-1 + deferred)

### 5.1 Day-1 entities (must ship)

**`channel_configs`** — NEW. Per-tenant per-channel configuration.
- `id`, `tenant_id`, `channel` (enum: whatsapp / sms / email), `provider` (enum: 360dialog / global_sms / gmail / shared / future), `sender_identity` (phone / Sender ID / email address), `is_default` (bool — used when no per-module override), `is_active`, `is_two_way` (bool — true for WhatsApp own-number, false for SMS, future-true for Email), `webhook_url` (for Make-based channels), `provider_credentials` (encrypted JSONB — WABA ID, API keys, etc.), `created_at`, `updated_at`.

**`module_channel_routing`** — NEW. Optional per-module override of default `channel_configs`.
- `id`, `tenant_id`, `module_code` (text: 'M4' / 'M5' / 'M7' / etc.), `channel`, `channel_config_id` (FK). NULL = use the channel's default.

**`message_templates`** — EXTEND existing.
- Add: `template_type` (enum: transactional / marketing) — drives consent enforcement.
- Add: `channel_variants` (JSONB or separate sub-table) — stores per-channel body+subject for the same logical template.
- Add: `meta_template_status` (enum: draft / pending / approved / rejected) — for WhatsApp templates that go through Meta approval.
- Add: `category` (text — Orders / Appointments / Recall / Campaigns / Repairs / Returns).
- Keep: `tenant_id`, `template_slug`, `language`, `is_active`.

**`message_log`** — EXTEND existing.
- Add: `direction` (enum: outbound / inbound) — was outbound-only.
- Add: `conversation_id` (FK to new `conversations` table, NULL for SMS).
- Add: `channel_config_id` (FK — which channel sent it).
- Add: `meta_message_id` (text — for WhatsApp dedup + status webhook matching).
- Add: status enum extended: pending → sent → delivered → read → failed → blocked-by-consent.
- Add: `failed_reason` (text — for human triage).

**`conversations`** — NEW. WhatsApp-only at day-1; future Email.
- `id`, `tenant_id`, `customer_id` (FK), `channel` (enum: whatsapp / future-email), `channel_config_id` (FK — which Sender), `assigned_agent_id` (FK to staff users, NULL = unassigned), `status` (enum: open / pending / closed), `last_message_at`, `unread_count_for_staff`, `created_at`, `closed_at`.

**`customer_consent`** — NEW. Per-customer per-channel current state.
- `id`, `tenant_id`, `customer_id` (FK), `consent_sms` (bool, default false), `consent_whatsapp` (bool, default false), `consent_email` (bool, default false), `updated_at`. Unique (customer_id).

**`consent_log`** — NEW. Append-only audit trail.
- `id`, `tenant_id`, `customer_id` (FK), `channel` (enum), `event_type` (enum: granted / opted_out / updated_by_admin), `source` (text — which screen/flow gave consent), `consent_text_shown` (text — exact wording shown to customer at consent), `ip` (text), `device_info` (text), `created_at` (immutable, no update).

**`internal_notes`** — NEW. Yellow notes inside conversation threads.
- `id`, `conversation_id` (FK), `author_id` (FK to staff), `body` (text), `created_at`. Visible to all staff, never to customer.

### 5.2 Deferred entities (architecture slot reserved, not built day-1)

- `ai_knowledge_base` (per-tenant) — empty table created day-1, enables future AI agent.
- `conversation_intent` field on `conversations` — text column, NULL day-1, populated by future intent classifier.
- `ai_suggestions_log` — for future AI suggestion accept/dismiss tracking.

---

## 6. Contracts to other modules

M12 **exposes** these RPCs / Edge Functions for other modules to call. Other modules should NEVER write to M12 tables directly.

| Caller | Contract | Notes |
|---|---|---|
| ANY module | `send_message_by_template(template_slug, recipient_id, variables, channel_override?, channel_config_override?)` → returns `message_log.id` | Edge Function. Variables are name-keyed dict. Channel auto-resolved via `module_channel_routing`. |
| ANY module | `send_message_raw(channel, recipient_phone_or_email, body, channel_config_override?)` → returns `message_log.id` | For ad-hoc broadcasts that don't use a template. Bypasses templates table. Subject to consent if `template_type=marketing` is passed. |
| M4 (CRM) | `send_message_by_template` for: lead intake, event invitations, registration links | Already wired in current pre-cutover implementation. M12 generalizes the pattern. |
| M5 (Customers) | `send_message_by_template` for: welcome message after first purchase, profile update notifications | M5 customer card "Send manual message" button calls Edge Function. |
| M6 (Prescriptions) | `send_message_by_template` for: recall reminders. M6 owns WHEN; M12 owns HOW. | Recall trigger fires from M6 cron/scheduler → calls M12. |
| M7 (Orders) | `send_message_by_template` for: order confirmation, "thanks" (state=active + payment ≥1), order ready, lab status update, reservation expiry. | M7 emits events → M12 sends. |
| M8 (Payments) | `send_message_by_template` for: payment confirmation. Deferred-check banner alert is staff-internal (M8) NOT customer-facing. | |
| M11 (Reports) | `send_message_by_template` for: scheduled report email (deferred post-LIVE, contract-only day-1) | M11 brief documents this as deferred dependency. |
| M13 (Loyalty) | `send_message_by_template` for: tier promotion, credit balance notification, club enrollment confirmation. | |
| M14 (Appointments) | `send_message_by_template` for: appointment confirmation, reminders (1-day-before, day-of), cancellation, reschedule. M14 owns the trigger; suppress-checkbox honored. | |
| M15 (Queue) | Day-1: internal-only, no M12 calls. Post-LIVE: queue position SMS to customer = M12 call. | Per M15 brief. |

M12 **calls** these contracts on other modules:

| M12 calls | Contract | Notes |
|---|---|---|
| M5 | `get_customer_by_phone(phone, tenant_id)` → customer_id | When inbound WhatsApp message arrives, look up which customer it's from. |
| M5 | `get_customer_summary(customer_id)` → JSONB | For Inbox right-pane (orders, last visit, club tier, etc.). |
| M3 (Storefront short-links) | `create_short_link(target_url, customer_id?, channel)` → short URL | For unsubscribe links + registration links in messages. Already exists from supersale campaign. |

---

## 7. Design patterns

### Pattern 1 — Edge Function as the single send-point
Every send goes through `send-message` Edge Function. No module writes directly to `message_log` or calls Make/360dialog directly. This is the **single point of policy enforcement**: consent check, channel resolution, log writing, audit trail, retry logic.

### Pattern 2 — Make as one-way pipe only
Make scenarios for SMS + Email are **send-only**. They receive a ready-to-send payload from Edge Function and forward to vendor. **No DB access from Make.** No logic. WhatsApp does NOT route through Make at all (Edge Function direct to 360dialog).

### Pattern 3 — Hybrid channel ownership (Platform default + tenant override)
A new tenant gets shared default channels (one phone, one Sender ID, one email — owned by Optic Up). Working tenant immediately, zero config. Tenant who wants own number/email/Sender ID upgrades to a paid tier; manual onboarding by Optic Up team (day-1, not self-service).

### Pattern 4 — Transactional vs Marketing hard separation
Templates carry a `template_type` flag. Marketing templates are blocked at send-time if `consent_<channel>=false`. Transactional templates skip the check. The two paths are code-isolated to prevent accidental classification drift.

### Pattern 5 — Coexistence echo as audit
WhatsApp Coexistence's `smb_message_echoes` webhook gives us free CRM logging of staff phone replies. Without it, staff using the WhatsApp Business app on their phones would create an invisible-to-system blind spot. With it, every customer interaction is in `message_log` regardless of where it was typed.

### Pattern 6 — Inbox as a `conversations`-first view
The Inbox screen is a view over the `conversations` table — NOT over `message_log`. `conversations` aggregates, owns assignment + status + unread count. `message_log` rows reference `conversation_id`. This makes filters + sort + assignment clean.

### Pattern 7 — Variable substitution in Edge Function, never in Make
Variables (`%customer_name%`, `%order_number%`) are substituted in the Edge Function before payload leaves to Make/360dialog. Make/360dialog see fully-rendered text. This means swapping vendors doesn't require updating substitution logic.

### Pattern 8 — AI architectural slot
Reserved: `conversation_intent` field on conversations (NULL day-1). Reserved: `ai_knowledge_base` table per-tenant (empty day-1). Reserved: ~70px UI strip above composer in Inbox (hidden behind feature flag). When AI agent module ships (post-LIVE), no schema migrations required.

---

## 8. Risks

1. **+972 53-434-7265 connection delay** — number is currently in "Not Connected" WABA state. If migration to 360dialog hits the 7-day forced wait (low probability, ~12%, but not zero), WhatsApp activation slips by a week. **Mitigation:** identify a backup 053 number now; if blocker hits, switch to backup within 1-2 days. Strategic call already locked at 360dialog regardless.
2. **17 OpticPlus templates not yet extracted** — they live in `doc_title` queries; need extraction script. **Mitigation:** part of M12 SPEC scope; not a new risk.
3. **Meta template approval latency** — 14 of 17 templates already approved (per channel admin mockup); 3 remain. Marketing-category templates need 24h, sometimes longer. **Mitigation:** submit all templates immediately at SPEC start; transactional category for utility templates auto-approves in 15-30 min.
4. **Coexistence requires staff to open WhatsApp Business app at least once every 13-14 days** or link goes dormant. **Mitigation:** clinic uses it daily; non-issue. Alert in admin dashboard if last-open is >10 days.
5. **`smb_message_echoes` is a relatively new Meta feature** (2024-2025). If Meta deprecates or changes the webhook contract, the system Inbox loses the staff-phone-reply visibility. **Mitigation:** monitor Meta release notes; have a fallback "manual log" UI for staff to type what they replied (low priority unless triggered).
6. **GLOBAL SMS API documentation is not public** — need to email them to receive integration docs. **Mitigation:** existing Make integration already proves API works; SPEC re-uses existing flow without re-discovering API.
7. **Consent enforcement misses an edge case → class-action lawsuit** — Section 30א penalties are NIS 1,000 per message without proof of damage. **Mitigation:** transactional/marketing flag is hard-coded in template definition (not user-editable at send-time); consent_log is append-only; opt-out webhook fires within 60 seconds.
8. **AI agent slot becomes vestigial** — reserved fields/tables sit empty for 6+ months and become orphan code that confuses future developers. **Mitigation:** document the slot in `MODULE_MAP.md` with explicit "reserved for AI agent — see post-LIVE roadmap"; review at every module-close ceremony.

---

## 9. Day-1 skeleton vs deferred behavior (per Pattern P17)

### Day-1 skeleton (must ship for LIVE)

**Tables:** `channel_configs`, `module_channel_routing`, `customer_consent`, `consent_log`, `conversations`, `internal_notes`. Plus EXTEND: `message_templates`, `message_log`.

**Edge Functions:** Extend `send-message` with WhatsApp-via-360dialog branch. NEW Edge Function: `whatsapp-webhook` (receives 360dialog webhooks for inbound + smb_echoes + status updates).

**Screens:**
- WhatsApp Inbox (3-pane RTL).
- Templates management (3-pane: list / editor / preview).
- Customer card "תקשורת" tab.
- Tenant channel admin screen (own vs shared status, manage button per channel).

**Migrations:**
- 17 OpticPlus templates → `message_templates` table.
- WhatsApp template approval submitted to Meta for all 17.
- 360dialog WABA Migration of +972 53-434-7265 from Meta-direct to 360dialog.

**Integrations:**
- M5 customer card: tab + quick-action buttons + summary widget.
- M4 / M7 / M14: existing send-message calls verified working with extended Edge Function.

### Deferred (documented here, NOT built day-1)

- Resend/Postmark email migration (when volume > 100/day).
- AI agent UI strip implementation (data slot + table reserved day-1; UI behind feature flag).
- Email Inbox in system (inbound email goes to `info@` mailbox day-1).
- SMS Inbox (fundamental SMS limitation, not deferred — out of scope permanently for alphanumeric Sender IDs).
- Self-service tenant onboarding (Embedded Signup wizard).
- Conversation intent classification UI.
- Birthday auto-message activation.
- A/B testing on templates.
- Per-template scheduled sends.
- SMS broadcast 1000+ recipients.
- Cross-tenant Platform Admin channels view (separate later screen for Optic Up team).
- Family-pooled consent (M13 dependency).

---

## 10. Cross-module integration checklist

Before M12 SPECs are dispatched, verify these dependencies are met (or flag as blockers):

- [x] M4 (CRM) `crm_message_templates` table exists — extending, not creating from scratch.
- [x] M4 `crm_message_log` table exists — extending.
- [x] M3 short-links Edge Function (`resolve-link`) live — needed for unsubscribe URLs.
- [ ] M5 customer card has a "tabs" component that M12 can hook into — verify with M5 Module Strategist when M5 SPECs begin.
- [ ] M14 (Appointments) emits events with required fields (appointment_time, customer_id, suppress_message flag) — verify with M14 Module Strategist when M14 SPECs begin.
- [ ] M6 recall engine exposes a callable RPC that triggers M12 sends with prescription-specific variables — verify with M6 Module Strategist.
- [ ] Platform Admin team workflow for "manual onboarding of tenant's own WhatsApp number" — documented for Optic Up internal ops team, not a SPEC.

---

## 11. Open questions for Module Strategist (non-blocking)

The Module Strategist should answer these during SPEC authoring, escalating to Main Strategic only if the answer requires cross-module impact:

1. Should `internal_notes` support @-mentions of teammates day-1 (with notification badge in Inbox), or defer? → suggest **defer**.
2. Conversation auto-close after N days of no activity — N = ? Default suggestion: 30 days, configurable per-tenant.
3. Inbox typing indicator (when staff is composing reply, show "Daniel is typing...") — day-1 or defer? → suggest **defer** unless trivial.
4. Inbox unread badge in main app navigation (top bar, like other apps) — yes or no? → suggest **yes**, simple feature.
5. Template duplication across languages (HE template as "source of truth" with RU/EN as clones) — UX flow? Suggest a simple "copy template" button + manual translation.
6. WhatsApp template auto-categorization: Meta will reclassify templates Utility → Marketing if content reads promotional. Should there be a pre-submission linter? → suggest **simple keyword warning** (presence of "מבצע", "הנחה", "%" without context flags as marketing).
7. Inbox bulk actions (mark N conversations as read, assign N to agent) — day-1 or defer? → suggest **defer**.

---

## 12. References

**Sketches (in this folder):**
- `M12_WHATSAPP_INBOX_MOCKUP.html` — primary screen, 3-pane RTL with AI slot reserved.
- `M12_TEMPLATES_MOCKUP.html` — template management, multi-channel editor.
- `M12_CUSTOMER_HISTORY_MOCKUP.html` — "תקשורת" tab in M5 customer card.
- `M12_CHANNEL_CONFIGS_MOCKUP.html` — tenant channel admin (own vs shared).

**Decision sources:**
- `.claude/skills/opticup-main-strategic/references/DECISIONS_LOG.md` — 2026-05-09 entries (decisions 1-13).
- Auto-memory: `project_messaging_architecture_v2.md` (decided 2026-04-22).
- `_archive/launch-plan-versions/MASTER_LIVE_PLAN_v1.md` §4 (M12 requirements).
- `modules/Module 12 - Communications/architecture-brief/M12_HANDOFF.md` (this brief's predecessor handoff).

**Cross-module briefs that depend on M12:**
- M4 (CRM) — already lives; M12 generalizes its messaging.
- M5 (Customers) — customer-card tab.
- M6 (Prescriptions) — recall sends.
- M7 (Orders) — order lifecycle messages.
- M8 (Payments) — payment confirmations.
- M11 (Reports) — deferred scheduled email.
- M13 (Loyalty) — tier/club messages.
- M14 (Appointments) — reminders.

---

## 13. Self-improvement notes (Main Strategic → SKILL.md)

This brief was authored after a strategic session in which Daniel corrected the Main Strategic 4 times. The lessons (logged in DECISIONS_LOG.md 2026-05-09) are candidates for SKILL.md update at module-close:

1. **Don't flow** — when user asks clarifying question, stop & restate the goal before proposing fix.
2. **Verify existing vendor before recommending switch** (twice in one session: SMS, Email).
3. **Research subagents are 6-12 months stale on platform features** — explicitly request "what changed recently".
4. **Hybrid models > pure-flexibility OR pure-control** for SaaS multi-tenant.
5. **Single sentence from Daniel can reshape module scope** — let "what about X" surface before locking.
6. **Sketch the feature, not the host screen.**
7. **Lock infrastructure, defer UX** when legal mandates.
8. **Log decisions in flight, not at session end.**
9. **Read-only mode promise for Chrome MCP** on auth/billing surfaces.
10. **Connection-direction test for Make vs Edge Function** (one-way → Make; two-way → Edge Function direct).

These lessons will be applied to the Main Strategic SKILL.md after M12 module-close ceremony.

---

*End of M12 Architecture Brief v1. Locked for Module Strategist hand-off.*
*Next handoff document: `M13_HANDOFF.md` for Loyalty Club.*
