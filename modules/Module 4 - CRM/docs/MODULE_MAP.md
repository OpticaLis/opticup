# Module 4 — CRM: Module Map

> **Last updated:** 2026-04-24 (CRM_PRE_MERGE — Integration Ceremony)

---

## Files

### HTML & CSS
| File | Lines | Purpose |
|------|-------|---------|
| `crm.html` | 330 | Main CRM page — sidebar nav (5 tabs), role toggle, page header, 5 tab panels with skeleton containers, 23 CRM script tags. **[B8]** Loads Tailwind CDN + `tailwind.config` (RTL, Heebo, custom `crm.*` palette). **[P2b]** Events tab filter bar gained "יצירת אירוע +" button. **[P3a]** Incoming tab filter bar gained "+ הוסף ליד" button; added `<script src="modules/crm/crm-lead-modals.js">` after crm-lead-actions.js. **[P3b]** Added 2 `<script>` tags for `crm-messaging-config.js` + `crm-messaging-send.js` (Make dispatcher helper). |
| `css/crm.css` | 215 | Foundation: palette tokens, base, sidebar, page header, tab panels, role visibility, responsive, utilities |
| `css/crm-components.css` | 76 | **[B8]** Reduced from 276 → shell only: cards, filter bar, table-wrap, view toggle, badge (legacy helper), leads-view show/hide |
| `css/crm-screens.css` | 98 | **[B8]** Reduced from 325 → shell only: KPI grid + loading shimmer, alert strip, activity feed, timeline scroll, messaging split, event-day counter-bar + 3-col grid + barcode input |
| `css/crm-visual.css` | 20 | **[B8]** Reduced from 347 → near-empty placeholder (pagination baseline + legacy pulse keyframe). All B7 visual components moved into JS as Tailwind classes |

### JavaScript — `modules/crm/` (32 files, all ≤350 lines)
| File | Lines | Purpose |
|------|-------|---------|
| `crm-init.js` | 75 | Page bootstrap, tab orchestration stub, status cache gate, error banner |
| `crm-bootstrap.js` | 106 | **[B6]** Extracted from crm.html inline JS: page header updater, theme switcher, `toggleCrmRole()`, `switchCrmLeadsView()`, Lucide init, barcode auto-focus on event-day entry. **[P3a]** Added missing `incoming` case to `showCrmTab` that wires `loadCrmIncomingTab()` — M4-BUG-04 pre-existing hotfix. |
| `crm-helpers.js` | 141 | **[C1]** Shared utilities: phone format, currency, date, language, status cache/badges. Added `TIER1_STATUSES` + `TIER2_STATUSES` constants (exported on window). **[P3a]** Added `pending_terms` to `TIER1_STATUSES`. |
| `crm-lead-actions.js` | 165 | **[P2a + P3a]** Lead mutation helpers (core writes only — UI modals live in crm-lead-modals.js after the P3a split). Exports `CrmLeadActions.{changeLeadStatus, bulkChangeStatus, addLeadNote, createManualLead, transferLeadToTier2, leadTier}`. Direct Supabase writes with `tenant_id: getTenantId()` on every `.update()/.insert()/.eq()` (Rule 22). Status change inserts audit note "סטטוס שונה מ-X ל-Y". **[P3a]** `createManualLead` inserts lead with `status='pending_terms'`, `source='manual'`, `terms_approved=false`. `transferLeadToTier2` now pre-checks `terms_approved` and returns `{blocked:true, reason:'terms_not_approved'}` when false. |
| `crm-lead-modals.js` | 219 | **[P3a]** UI flows extracted from crm-lead-actions.js during the P3a split (Rule 12). Extends `window.CrmLeadActions` with `{openStatusDropdown, closeStatusDropdown, openBulkStatusPicker, openCreateLeadModal}`. Calls core writes via `window.CrmLeadActions.*`. `openCreateLeadModal` renders 6-field form (name/phone required, email/city/language/notes optional) with Modal footer submit+cancel buttons; uses the Modal.show `footer` config pattern discovered in P2b. |
| `crm-incoming-tab.js` | 215 | **[C1 + P2a + P3a]** Tier 1 "לידים נכנסים" tab: fetch leads from `v_crm_leads_with_tags` (full field set as of P2a), status filter dropdown, search, paginated table with new "פעולה" column (green "אשר ✓" button → `transferLeadToTier2`). Rows clickable → `openCrmLeadDetail`. Exports `reloadCrmIncomingTab` + `getCrmIncomingLeadById`. **[P3a]** Wires "+ הוסף ליד" button to `CrmLeadActions.openCreateLeadModal` with `reloadCrmIncomingTab` callback. Handles new `{blocked:true}` return from `transferLeadToTier2` by re-enabling the approve button without a success toast. |
| `crm-dashboard.js` | 295 | **[B8]** Dashboard via Tailwind: 4 gradient KPI cards (indigo/cyan/emerald/amber) with per-variant sparkline bars, 3-column alert strip, gradient stacked bar chart, 3 conic-gradient gauges (inline style), animate-pulse activity feed, horizontal timeline cards with progress bars |
| `crm-leads-tab.js` | 313 | **[B8 + P2a]** Leads via Tailwind: white-card table, indigo filter chips, indigo bulk bar (now with working "שנה סטטוס" → `CrmLeadActions.openBulkStatusPicker`), pagination, delegates kanban + cards to `crm-leads-views.js`. Exports `reloadCrmLeadsTab`. |
| `crm-leads-views.js` | 112 | **[B8]** Kanban (4 status columns with colored headers — emerald/amber/violet/indigo) + Cards (3-col grid with gradient avatars + tag pills) |
| `crm-leads-detail.js` | 295 | **[B8 + P2a]** Lead detail modal via Tailwind: gradient-avatar header + clickable status badge → tier-filtered dropdown (P2a) + 5 underline tabs (events/messages/notes/timeline/details) — notes tab has textarea + "הוסף" button at top (P2a) + 4 gradient action buttons. Falls back to `getCrmIncomingLeadById` when `getCrmLeadById` misses. |
| `crm-event-actions.js` | 266 | **[P2b]** Event mutation helpers + UI flows. Exports `CrmEventActions.{openCreateEventModal, createEvent, changeEventStatus, openEventStatusDropdown, closeEventStatusDropdown}`. Event creation modal uses `next_crm_event_number` RPC for atomic auto-numbering (Rule 11) and `crm_events.insert()` with `tenant_id: getTenantId()` (Rule 22). Campaign dropdown + campaign-based defaults that re-seed when campaign changes. Status dropdown anchored to any DOM element, iterates `CRM_STATUSES._all` to show all 10 event statuses in sort order. |
| `crm-event-register.js` | 122 | **[P2b]** Tier 2 lead → event registration flow. Exports `CrmEventRegister.{openRegisterLeadModal, registerLeadToEvent}`. Search modal filters `crm_leads` to `TIER2_STATUSES` only, debounced (200ms) name/phone/email ilike search, limit 20. Click-to-register calls `register_lead_to_event` RPC; 4 response branches: `registered` → Toast.success, `waiting_list` → Toast.warning, `already_registered` → Toast.info, `event_not_found` → Toast.error. |
| `crm-events-tab.js` | 135 | **[B8 + P2b]** Events list via Tailwind: white-card table, indigo event number, emerald revenue column (admin-only). **[P2b]** Added "יצירת אירוע +" button wired to `CrmEventActions.openCreateEventModal` with reload callback. |
| `crm-events-detail.js` | 255 | **[B8 + P2b]** Event detail modal: gradient header (indigo→violet) with glass-morphism controls, segmented capacity bar, 3 sub-tabs, grouped attendee list with gradient avatars, delegates KPI+funnel+analytics to `crm-events-detail-charts.js`. **[P2b]** Wired "שנה סטטוס" button (`data-action="change-status"`) to `CrmEventActions.openEventStatusDropdown`, updates status badge in-place via `data-role="event-status-badge"`. Added "רשום משתתף +" button at top of attendees sub-tab wired to `CrmEventRegister.openRegisterLeadModal`; on registration, detail modal is closed and reopened to refresh attendees. |
| `crm-events-detail-charts.js` | 201 | **[B8]** 6 gradient KPI cards with trend arrows (sky/emerald/amber/violet), SVG funnel wrapped in white chart card, gradient analytics bars |
| `crm-event-day.js` | 196 | **[B8]** Event Day main: 5 gradient counter cards (sky/violet/emerald/amber/teal) with tabular-nums, live clock with animate-pulse dot, role toggle, sub-tab routing |
| `crm-event-day-checkin.js` | 217 | **[B8]** Check-in 3-column grid: LEFT waiting (amber) with overdue/selected states + CENTER dark barcode scanner (slate-900 + emerald) with gradient selected-attendee detail card (indigo→violet) + RIGHT delegates to arrived column |
| `crm-event-day-schedule.js` | 160 | **[B8]** Scheduled times: grouped chip board (white chips + emerald checked-in) |
| `crm-event-day-manage.js` | 278 | **[B8]** Manage table (Tailwind) + arrived column widget (waiting-to-purchase + purchased sections with amount badges) + running-total bar + purchase amount modal with 3xl tabular-nums input |
| `crm-messaging-tab.js` | 101 | **[B8]** Messaging Hub orchestrator — rounded tab bar with indigo underline active state, 4 sub-tabs |
| `crm-messaging-templates.js` | 325 | **[CRM_UX_REDESIGN_TEMPLATES]** Logical-template grouping: sidebar shows one card per base slug (with active-channel badges) + editor renders 3 channel accordion sections via `window.CrmTemplateSection`. Save logic diffs channels → INSERT / UPDATE / SOFT-DELETE (is_active=false). Backward-compat: 4 public globals preserved (`renderMessagingTemplates`, `loadMessagingTemplates`, `_crmMessagingTemplates`, `CRM_TEMPLATE_VARIABLES`); new global `CrmTemplateSubstitute` for the section module's preview. |
| `crm-template-section.js` | 141 | **[CRM_UX_REDESIGN_TEMPLATES]** Channel-section component for the templates accordion editor. Public API: `window.CrmTemplateSection.{render, wire, updatePreview, isInactive}`. Renders one accordion section per channel (SMS/WhatsApp/Email) with active/inactive states, per-channel preview, char counter. WhatsApp interactions on a disabled section fire `Toast.info` informing the user the channel is not yet active. Consumed only by `crm-messaging-templates.js`. |
| `crm-messaging-rules.js` | 227 | **[CRM_UX_REDESIGN_AUTOMATION]** Rules orchestrator. Pill bar above the table (5 pills — הכל + 4 boards with active-rule counts), board column with colored chip per row, filter-by-pill on click. Editor delegated to `window.CrmRuleEditor.open()`. Backward-compat: `renderMessagingRules`, `loadMessagingRules` preserve unchanged signatures. |
| `crm-rule-editor.js` | 273 | **[CRM_UX_REDESIGN_AUTOMATION]** Board-led rule editor (Mockup C). Public API: `window.CrmRuleEditor.{open, _boardOf, _summaryFor, BOARDS}`. Editor leads with 4-card board picker (📥 לידים נכנסים / 👥 רשומים / 📅 אירועים / ✅ נרשמים לאירוע); conditional fields reveal after board choice and are themed by the board's color. Templates dropdown filters by board prefix. Plain-Hebrew summary block updates live. action_config preserves unknown fields (post_action_status_update, language) on round-trip via Object.assign spread. |
| `crm-automation-engine.js` | 348 | **[P8 + P20 + P21 + EVENT_CONFIRMATION_EMAIL + CRM_HOTFIXES + CRM_PRE_MERGE]** Rule evaluation engine. `CrmAutomation.evaluate(triggerType, data)` loads matching `crm_automation_rules`, evaluates conditions (always/status_equals/count_threshold/source_equals), resolves recipients, builds `sendPlan`. **[P20]** Shows `CrmConfirmSend` modal if loaded; falls back to immediate `CrmMessaging.sendMessage` dispatch. **[P21]** `resolveRecipients` accepts optional 4th param `actionConfig`; when `action_config.recipient_status_filter` is set and recipient_type is tier2*, filters the `crm_leads.status IN (...)` list to the chosen statuses. **[EVENT_CONFIRMATION_EMAIL]** `buildVariables` composes `%lead_id%` / `%event_id%` for the confirmation email QR code. **[CRM_HOTFIXES]** New `promoteWaitingLeadsToInvited(planItems, results)` runs after an event-invitation rule dispatches — atomic UPDATE of `crm_leads.status` from `waiting`→`invited` for the targeted leads. Exposed on `window.CrmAutomation`. **[CRM_PRE_MERGE]** `buildVariables` now injects `vars.lead_id = lead.id` so `%lead_id%` resolves on the UI-register path (fixes the broken QR where the literal `%lead_id%` was encoded). |
| `crm-confirm-send.js` | 255 | **[P20 + P21]** Confirmation Gate shown before any automated send. **[P21]** Redesigned to 2-tab layout: Messages tab (1 card per channel per rule with representative body preview) + Recipients tab (sortable paginated table, 50/page, dedup by lead_id with ×N badge when same lead is targeted by multiple rules). Approve → `CrmMessaging.sendMessage` per plan item; Cancel → inserts `pending_review` rows into `crm_message_log`. Exports `window.CrmConfirmSend.show(sendPlan)`. |
| `crm-messaging-log.js` | 201 | **[P8 + P20]** Message log table (split from broadcast file 2026-04-22, Rule 12). JOINs `crm_leads` (full_name, phone) + `crm_message_templates` (name, slug). Channel/status filters, pagination (50/page), click-to-expand row showing full body + metadata + error. **[P20]** `pending_review` (amber) + `superseded` (slate strikethrough) badges; resend button on pending_review opens `CrmSendDialog.openQuickSend` pre-filled with preserved body, marks original row superseded on successful send. |
| `crm-send-dialog.js` | 131 | **[P20]** Quick-send dialog for ad-hoc messages. `CrmSendDialog.openQuickSend({lead, prefill, onSent})` shows a modal with channel picker + editable body, calls `CrmMessaging.sendMessage`, then invokes `onSent` callback. Used by the pending_review resend flow. |
| `crm-event-send-message.js` | 186 | **[CRM_HOTFIXES]** Compose-and-send modal for event-wide broadcasts. Opens from the "שלח הודעה" button in the event detail modal header. Raw-body mode only (no template) — per-recipient dispatch via `CrmMessaging.sendMessage`, with status-filter chips, channel picker (SMS/Email), and per-lead result summary. Exports `window.CrmEventSendMessage.{open, wire}`. |
| `crm-activity-log.js` | 262 | **[P12]** CRM activity timeline sub-view. Renders paginated list of rows from `activity_log` scoped to CRM entity types (leads, events, attendees, messages) with colored severity badges and action-specific icons. |
| `crm-broadcast-filters.js` | 286 | **[B8]** Recipient filter chip bar shared by broadcast wizard and log. Renders tier/status/tag/source/event filters with AND/OR semantics; previews live recipient count. |
| `crm-lead-filters.js` | 221 | **[P2a]** Advanced filter panel for the leads table — multi-select by status/source/tag/city + date range. Emits filter objects consumed by `crm-leads-tab.js`. |
| `crm-messaging-broadcast.js` | 341 | **[B8]** 5-step wizard with progress connectors (green ✓ on completed, indigo ring on active), step body Tailwind forms, message log with status chip pills (sky sent / emerald delivered / indigo read / rose failed), channel + status filters, pagination |
| `crm-messaging-config.js` | 17 | **[P3b→P3c+P4]** Documentation-only pointer. Since Architecture v3, the Make webhook URL lives in the `send-message` Edge Function as `MAKE_WEBHOOK_URL_DEFAULT` (env-overridable via the `MAKE_SEND_MESSAGE_WEBHOOK_URL` Supabase secret); `window.CrmMessagingConfig.MAKE_SEND_WEBHOOK` here mirrors that URL for humans reading the client-side code. |
| `crm-messaging-send.js` | 69 | **[P3b→P3c+P4]** `window.CrmMessaging.sendMessage({leadId, channel, templateSlug?, body?, subject?, variables?, eventId?, language?})` — calls the `send-message` Edge Function via `sb.functions.invoke()`. Supports template mode (`templateSlug`) and raw-body mode (`body` XOR `templateSlug`) for ad-hoc broadcasts. The Edge Function handles template fetch, `%name%`/`%phone%`/... substitution, `crm_message_log` write, and Make webhook dispatch. Returns `{ok, logId?, channel?, error?}`. |

### Modified shared files
| File | Change | Phase |
|------|--------|-------|
| `index.html` | Added CRM card to MODULES config array (line 152) | B3 |
| `js/shared.js` | Added FIELD_MAP entries for `crm_leads`, `crm_events`, `crm_lead_notes`, `crm_event_attendees` (+29 lines) | B3 |

### Edge Functions — `supabase/functions/` (owned by Module 4)
| Slug | Files | Lines | Phase | Purpose |
|------|-------|-------|-------|---------|
| `lead-intake` | `index.ts` + `deno.json` | 342 | P1, P3c+P4 | Public form intake: validate payload, resolve tenant by slug, normalize Israeli phones to E.164, duplicate-check (tenant_id, phone), INSERT `crm_leads` with `status='new'`. Returns 201 `{id, is_new: true}` on new, 409 `{duplicate, existing_name}` on dup, 400 on validation fail, 401 on unknown tenant. `verify_jwt: false` (public endpoint). Uses `SUPABASE_SERVICE_ROLE_KEY` server-side to bypass RLS. **[P3c+P4]** After new-lead INSERT or duplicate detection (both initial check and 23505 race branch), dispatches SMS + Email via the `send-message` Edge Function using `lead_intake_new` or `lead_intake_duplicate` templates. Uses a hardcoded legacy JWT anon key for the cross-function fetch (Finding M4-INFRA-01). |
| `send-message` | `index.ts` + `deno.json` | 277 | P3c+P4 | Messaging pipeline core. Receives `{tenant_id, lead_id, event_id?, channel, template_slug?, body?, subject?, variables?, language?}`, looks up template in `crm_message_templates` (composing full slug = `{base_slug}_{channel}_{language}`), substitutes `%name%`/`%phone%`/`%email%`/`%event_*%` placeholders, writes `crm_message_log` with `status='pending'`, calls Make webhook with ready-to-send payload `{channel, recipient_phone, recipient_email, subject, body}`, updates log to `sent` or `failed` based on Make response. Supports raw broadcast (body without template — `templateSlug` XOR `body`). `verify_jwt: true`. Make URL read from `MAKE_SEND_MESSAGE_WEBHOOK_URL` env with a hardcoded fallback matching `crm-messaging-config.js`. |

### Migration & import scripts (campaign-scoped)
| File | Purpose | Phase |
|------|---------|-------|
| `campaigns/supersale/migrations/001_crm_schema.sql` | Full schema: 23 tables, RLS, Views, RPCs, seeds (incl. 4 messaging tables: `crm_message_templates`, `crm_automation_rules`, `crm_broadcasts`, `crm_message_log`) | A |
| `campaigns/supersale/scripts/import-monday-data.mjs` | Monday xlsx parser | B2 |
| `campaigns/supersale/scripts/rest-import.mjs` | PostgREST bulk import runner | B2 |
| `campaigns/supersale/DATA_DISCOVERY_REPORT.md` | Analysis of 9 Monday export boards | B1 |

---

## Global Functions (exposed on `window`)

| Function | File | Purpose |
|----------|------|---------|
| `showCrmTab(name)` | crm-init.js | Switch between dashboard/incoming/leads/events/messaging/event-day tabs |
| `ensureCrmStatusCache()` | crm-init.js | Load `crm_statuses` table once, cache in `CRM_STATUSES` |
| `showCrmError(panelId, msg)` | crm-init.js | Display error banner in a tab panel |
| `loadCrmDashboard()` | crm-dashboard.js | Fetch + render dashboard (stat cards, event table, status bars) |
| `loadCrmIncomingTab()` | crm-incoming-tab.js | **[C1]** Fetch Tier 1 leads, populate status filter, render table with search |
| `reloadCrmIncomingTab()` | crm-incoming-tab.js | **[P2a]** Force re-fetch of Tier 1 leads and re-render (bypasses load-once cache; used after status change / transfer) |
| `getCrmIncomingLeadById(id)` | crm-incoming-tab.js | **[P2a]** Return cached incoming (Tier 1) lead row by ID — used as fallback by `openCrmLeadDetail` |
| `loadCrmLeadsTab()` | crm-leads-tab.js | Fetch Tier 2 leads (was: all leads), populate filters, render paginated table |
| `reloadCrmLeadsTab()` | crm-leads-tab.js | **[P2a]** Force re-fetch of Tier 2 leads and re-render; called by bulk status change, transfer, and individual status change |
| `getCrmLeadById(id)` | crm-leads-tab.js | Return cached lead row by ID (for detail modal) |
| `openCrmLeadDetail(leadId)` | crm-leads-detail.js | Open lead detail modal (info + notes + events). **[P2a]** Now falls back to `getCrmIncomingLeadById` when primary getter misses, so rows on both incoming and registered tabs open the same modal |
| `CrmLeadActions.changeLeadStatus(id, newStatus, oldStatus, opts?)` | crm-lead-actions.js | **[P2a]** Atomic status update + audit note (Hebrew "סטטוס שונה מ-X ל-Y"). `opts.silent` skips toast (used by bulk) |
| `CrmLeadActions.bulkChangeStatus(ids, newStatus)` | crm-lead-actions.js | **[P2a]** Per-lead loop; pre-fetches current statuses in one query for accurate audit notes; returns `{ok, fail[]}` |
| `CrmLeadActions.addLeadNote(leadId, content)` | crm-lead-actions.js | **[P2a]** Insert a free-text note into `crm_lead_notes`. Returns the new row |
| `CrmLeadActions.createManualLead(data)` | crm-lead-actions.js | **[P3a]** Insert a manually-entered lead with `status='pending_terms'`, `source='manual'`, `terms_approved=false`, `marketing_consent=false`. Validates name + phone required. Writes optional note to `crm_lead_notes`. Returns `{id, full_name, status}` |
| `CrmLeadActions.transferLeadToTier2(leadId)` | crm-lead-actions.js | **[P2a + P3a]** Pre-checks `terms_approved`; if false returns `{blocked:true, reason:'terms_not_approved'}` and shows error toast. Otherwise sets status='waiting' + inserts note "הועבר ל-Tier 2 (אושר)" |
| `CrmLeadActions.openStatusDropdown(anchor, tier, currentStatus, onPick)` | crm-lead-modals.js | **[P2a + P3a split]** Tier-filtered anchored dropdown; fixed-positioned, closes on outside click |
| `CrmLeadActions.openBulkStatusPicker(ids, tier, onDone)` | crm-lead-modals.js | **[P2a + P3a split]** Modal grid of statuses for bulk change |
| `CrmLeadActions.openCreateLeadModal(onCreated)` | crm-lead-modals.js | **[P3a]** Open a 6-field form modal (name/phone required + email/city/language/notes optional) that calls `createManualLead` on submit |
| `CrmLeadActions.leadTier(status)` | crm-lead-actions.js | **[P2a]** Returns 1 or 2 based on TIER1_STATUSES / TIER2_STATUSES membership |
| `CrmEventActions.openCreateEventModal(onCreated)` | crm-event-actions.js | **[P2b]** Open modal form to create a new event; on submit calls `next_crm_event_number` RPC + inserts `crm_events` row |
| `CrmEventActions.createEvent(data)` | crm-event-actions.js | **[P2b]** Insert event row with atomic auto-numbered event_number (Rule 11) |
| `CrmEventActions.changeEventStatus(eventId, newStatus)` | crm-event-actions.js | **[P2b]** Update `crm_events.status` (tenant-scoped write, Rule 22) |
| `CrmEventActions.openEventStatusDropdown(anchor, currentStatus, onPick)` | crm-event-actions.js | **[P2b]** Anchored dropdown of all 10 event statuses (excludes current), closes on outside click |
| `CrmEventRegister.openRegisterLeadModal(eventId, onRegistered)` | crm-event-register.js | **[P2b]** Search-and-pick modal for Tier 2 leads; on pick calls `register_lead_to_event` RPC with Toast branching |
| `CrmEventRegister.registerLeadToEvent(leadId, eventId, method)` | crm-event-register.js | **[P2b]** Invoke `register_lead_to_event` RPC; returns `{success, status|error, attendee_id}` |
| `loadCrmEventsTab()` | crm-events-tab.js | Fetch events from `v_crm_event_stats`, render table |
| `getCrmEventStatsById(id)` | crm-events-tab.js | Return cached event stats row by ID |
| `openCrmEventDetail(eventId)` | crm-events-detail.js | Open event detail modal (info + stats + attendees + event-day entry) |
| `loadCrmEventDay()` | crm-event-day.js | Entry point for hidden Event Day tab |
| `getEventDayState()` | crm-event-day.js | Return current `{ eventId, event, attendees, stats, subTab }` |
| `refreshEventDayStats()` | crm-event-day.js | Re-fetch `v_crm_event_stats` and re-render stats bar |
| `renderEventDaySubTab()` | crm-event-day.js | Route to active sub-tab renderer |
| `renderEventDayCheckin(host)` | crm-event-day-checkin.js | Render check-in sub-tab contents |
| `renderEventDaySchedule(host)` | crm-event-day-schedule.js | Render scheduled-times board |
| `renderEventDayManage(host)` | crm-event-day-manage.js | Render attendee management sub-tab |
| `loadCrmMessagingTab()` | crm-messaging-tab.js | Entry point for Messaging Hub tab |
| `showMessagingSub(key)` | crm-messaging-tab.js | Switch active messaging sub-tab (templates/rules/broadcast/log) |
| `getMessagingSubTab()` | crm-messaging-tab.js | Current sub-tab key |
| `renderMessagingActiveSub()` | crm-messaging-tab.js | Re-render the currently active messaging sub-tab |
| `renderMessagingTemplates(host)` | crm-messaging-templates.js | Templates sub-tab entry: sidebar (1 card per logical template, base slug) + editor (3 channel accordion sections) |
| `loadMessagingTemplates()` | crm-messaging-templates.js | Force refresh of template cache |
| `_crmMessagingTemplates()` | crm-messaging-templates.js | Internal: expose cached templates list to sibling files (raw rows, not grouped) |
| `CrmTemplateSubstitute(text)` | crm-messaging-templates.js | Variable substitution (`%name%`, `%event_*%`, …) for previews — exposed for the section module |
| `CrmTemplateSection.render(channel, channelState, opts)` | crm-template-section.js | Render markup for one channel accordion section |
| `CrmTemplateSection.wire(rootEl, channel, channelState, callbacks)` | crm-template-section.js | Attach DOM events to a rendered section (toggle, body input, subject input, head click) |
| `CrmTemplateSection.updatePreview(rootEl, channel, body, subject)` | crm-template-section.js | Re-render preview content for one section |
| `CrmTemplateSection.isInactive(channel, channelState)` | crm-template-section.js | True if the section's checkbox is unchecked |
| `renderMessagingRules(host)` | crm-messaging-rules.js | Automation rules sub-tab: list + toolbar |
| `loadMessagingRules()` | crm-messaging-rules.js | Force refresh of rules cache |
| `renderMessagingBroadcast(host)` | crm-messaging-broadcast.js | Broadcast sub-tab: filter + recipient preview + send |
| `renderMessagingLog(host)` | crm-messaging-broadcast.js | Log sub-tab: history table + filters + pagination |
| `loadMessagingLog()` | crm-messaging-broadcast.js | Force refresh of log rows |
| `CrmMessagingConfig.MAKE_SEND_WEBHOOK` | crm-messaging-config.js | **[P3b]** Webhook URL for "Optic Up — Send Message" Make scenario |
| `CrmMessaging.sendMessage({leadId, templateSlug, channel, variables, eventId?, language?})` | crm-messaging-send.js | **[P3b]** POST to Make webhook dispatcher; returns `{ok, error?}`. Make resolves full slug as `{templateSlug}_{channel}_{language}` and logs to `crm_message_log`. |
| `CrmEventSendMessage.open(event, attendees)` | crm-event-send-message.js | **[CRM_HOTFIXES]** Open compose modal for event-wide raw-body broadcast (SMS or Email). Filters recipients by status + channel, dispatches per-lead via `CrmMessaging.sendMessage`, returns summary. |
| `CrmEventSendMessage.wire(container)` | crm-event-send-message.js | **[CRM_HOTFIXES]** Wire the "שלח הודעה" button in the event detail modal header to `open`. |
| `CrmAutomation.promoteWaitingLeadsToInvited(planItems, results)` | crm-automation-engine.js | **[CRM_HOTFIXES]** After an event-invitation rule dispatches, atomically UPDATE `crm_leads.status` from `waiting`→`invited` for the leads that received the invitation (tenant-scoped write, Rule 22). |

### Shared namespace: `window.CrmHelpers`
| Method | Purpose |
|--------|---------|
| `formatPhone(raw)` | `+972507175675` → `050-717-5675` |
| `formatCurrency(n)` | `39460` → `₪39,460` |
| `formatDate(iso)` | `2026-03-27` → `27.03.2026` |
| `formatDateTime(iso)` | Date + HH:MM |
| `formatLanguage(code)` | `he` → `עברית` |
| `loadStatusCache()` | Fetch `crm_statuses` → `window.CRM_STATUSES` |
| `getStatusInfo(type, slug)` | Returns `{ label, color }` from cache |
| `statusBadgeHtml(type, slug)` | Returns safe HTML badge string |
| `distinctValues(rows, key)` | Unique values from array for filter dropdowns |
| `heCompare(a, b)` | Hebrew-locale string comparison |

---

## Data Sources (Views & Tables)

| View/Table | Used by | Purpose |
|------------|---------|---------|
| `v_crm_leads_with_tags` | crm-leads-tab.js | All leads with tag arrays (893 rows) |
| `v_crm_event_stats` | crm-events-tab.js, crm-dashboard.js, crm-event-day.js | Event-level aggregates (11 rows) |
| `v_crm_lead_event_history` | crm-leads-detail.js, crm-dashboard.js | Lead-level event history + returning flag |
| `v_crm_event_attendees_full` | crm-events-detail.js, crm-event-day.js | Event attendees with lead info |
| `crm_leads` | crm-dashboard.js, crm-messaging-broadcast.js | Direct count queries for dashboard, lead-id filter for broadcast recipients, name lookup for log display. **[C1]** Also used by Make scenario for duplicate check (HTTP GET) and insert (HTTP POST) |
| `crm_lead_notes` | crm-leads-detail.js | Notes for lead detail modal |
| `crm_events` | crm-events-detail.js, crm-event-day.js, crm-messaging-broadcast.js, crm-event-actions.js | Single event row for detail modal, event list for broadcast filter dropdown. **[P2b]** INSERT (create event with auto-numbered event_number) + UPDATE status via `CrmEventActions` |
| `crm_campaigns` | crm-event-actions.js | **[P2b]** SELECT active campaigns for the event creation form dropdown |
| `crm_event_attendees` | crm-event-day.js, crm-event-register.js | **[P2b]** INSERT via `register_lead_to_event` RPC only (Rule 11 — atomic capacity check + insert) |
| `crm_leads` (Tier 2 filter) | crm-event-register.js | **[P2b]** SELECT for Tier 2 lead search in the register-to-event modal |
| `crm_event_attendees` | crm-event-day-manage.js, crm-messaging-broadcast.js | Direct updates (purchase/coupon/payment_status) and lead_id lookup for event filter. **[M4_ATTENDEE_PAYMENT_SCHEMA]** Replaced legacy booking_fee_paid/refunded booleans with payment_status (7-value enum) + 4 timestamps + credit_used_for_attendee_id self-FK. |
| `crm_statuses` | crm-helpers.js, crm-messaging-broadcast.js | Status labels + colors (31 seed rows), filter dropdown source |

### Payment lifecycle (DB) — added 2026-04-25 by `M4_ATTENDEE_PAYMENT_SCHEMA`

The `crm_event_attendees` table now carries a payment-lifecycle model:

- **`payment_status`** (text NOT NULL, default `'pending_payment'`, CHECK) — one of 7 values: `pending_payment`, `paid`, `unpaid`, `refund_requested`, `refunded`, `credit_pending`, `credit_used`.
- **`paid_at`** / **`refund_requested_at`** / **`refunded_at`** / **`credit_expires_at`** — supporting timestamptz columns (nullable).
- **`credit_used_for_attendee_id`** — uuid FK to `crm_event_attendees(id)` self-reference. When a credit moves from an old attendee to a new one, the old row points to the new.
- **2 partial indexes**: `(tenant_id, payment_status) WHERE NOT is_deleted` and `(tenant_id, credit_expires_at) WHERE payment_status='credit_pending' AND NOT is_deleted`.
- **RPC `transfer_credit_to_new_attendee(uuid, uuid)`** — atomic credit transfer: validates old=`credit_pending`+new=`pending_payment`+same tenant, flips old→`credit_used` (with FK back-pointer), new→`paid` + `paid_at=now()`. SECURITY DEFINER. GRANT EXECUTE TO authenticated + service_role.
- **Templates `payment_received_sms_he` + `payment_received_email_he`** — seeded on demo + prizma (4 rows total). Tenant-neutral content; uses `%name%`, `%event_name%`, `%event_date%`, `%unsubscribe_url%`.
- **Migration files** in `modules/Module 4 - CRM/migrations/2026_04_25_payment_*.sql` (6 files: `_01_add_columns`, `_02_sync_trigger`, `_03_backfill_demo`, `_04_credit_transfer_rpc`, `_05_recreate_view`, `_99_drop_legacy`).
- **Removed at SPEC close:** legacy `booking_fee_paid` + `booking_fee_refunded` columns, plus the temporary `sync_booking_fee_paid_from_status` trigger that bridged the old and new fields during the carve-out.
- **UI + automation work** depending on this schema lives in sibling SPECs `M4_ATTENDEE_PAYMENT_UI` (#2) and `M4_ATTENDEE_PAYMENT_AUTOMATION` (#3).
| `crm_message_templates` | crm-messaging-templates.js, crm-messaging-rules.js, crm-messaging-broadcast.js | Templates CRUD, template picker in rules + broadcasts, name lookup for log display |
| `crm_automation_rules` | crm-messaging-rules.js | Rules CRUD |
| `crm_broadcasts` | crm-messaging-broadcast.js | Broadcast records (insert on send) |
| `crm_message_log` | crm-messaging-broadcast.js | Message history with channel/status/date filters, paginated |

### RPCs
| RPC | Caller | Purpose |
|-----|--------|---------|
| `check_in_attendee(p_tenant_id, p_attendee_id)` | crm-event-day-checkin.js | Atomic check-in: sets `checked_in_at` + `status='attended'` |

---

## Dependencies

- `shared.js` — `sb`, `getTenantId()`, `escapeHtml()`, `FIELD_MAP`, `TENANT_SLUG`, `loadSession()`
- `shared-ui.js` — not directly used (CRM has own tab system)
- `auth-service.js` — `resolveTenant()`, `loadSession()`, `applyUIPermissions()`
- `shared/js/modal-builder.js` — `Modal.show()`, `Modal.form()`, `Modal.confirm()` for detail/edit/send modals
- `shared/js/toast.js` — `Toast.success/error/warning/show()` for user feedback
- `shared/js/activity-logger.js` — `ActivityLog.write()` (fire-and-forget on every write)
