/* =============================================================================
   crm-messaging-broadcast-queue.js — broadcast → crm_message_queue plumbing.

   Extracted from crm-messaging-broadcast.js on 2026-05-12 (BROADCAST_QUEUE_
   INTEGRATION) to keep the parent file under Iron Rule 12's 350-line cap.

   Why this exists:
   - Old broadcast UI fired N parallel fetch() calls (one per recipient) from
     the browser to send-message EF. At ~1000+ recipients this:
       (a) overflowed PostgREST URL via .in('id', [1000+ UUIDs]) → 400 Bad Request
       (b) flooded SMS/Email vendors with no throttle
   - New path: this module fetches lead contact info (chunked) and INSERTs rows
     into crm_message_queue. The dispatch-queue EF (pg_cron every minute,
     throttled at 500ms email / 1000ms SMS) drains the queue. Same path used
     by all automation rules — single source of truth.

   Public API:
     CrmBroadcastQueue.enqueueBroadcast(wizard, employeeId, supabaseClient)
       → { broadcastId, inserted, etaMin }
       throws on any DB error.

   Load order: AFTER crm-helpers.js, crm-messaging-broadcast.js may call this.
   ============================================================================= */
(function () {
  'use strict';

  var LEAD_FETCH_CHUNK = 200;   // UUIDs per .in('id', [...]) call (~7.5KB)
  var QUEUE_INSERT_CHUNK = 500; // rows per insert (well under payload limits)

  // Per-channel throttle estimate — must match dispatch-queue EF.
  var THROTTLE_MS = { email: 500, sms: 1000 };

  /**
   * Fetch lead contact rows for a list of lead UUIDs, chunked to keep each
   * PostgREST request below the URL-length limit.
   */
  async function fetchLeadRows(sb, tenantId, leadIds) {
    var out = [];
    for (var i = 0; i < leadIds.length; i += LEAD_FETCH_CHUNK) {
      var chunk = leadIds.slice(i, i + LEAD_FETCH_CHUNK);
      var res = await sb.from('crm_leads')
        .select('id, full_name, phone, email')
        .eq('tenant_id', tenantId)
        .in('id', chunk);
      if (res.error) throw new Error('lead fetch: ' + res.error.message);
      out = out.concat(res.data || []);
    }
    return out;
  }

  /**
   * Resolve the base template slug (without _<channel>_<lang> suffix) and
   * language from a wizard + the globally-cached template list. Returns
   * { baseSlug, lang } — baseSlug is null when the wizard chose raw body.
   */
  function resolveTemplate(wizard) {
    var lang = wizard.language || 'he';
    var tpls = window._crmMessagingTemplates ? window._crmMessagingTemplates() : [];
    var tpl = wizard.templateId ? tpls.find(function (t) { return t.id === wizard.templateId; }) : null;
    if (!tpl) return { baseSlug: null, lang: lang };
    lang = tpl.language || lang;
    var sfx = '_' + tpl.channel + '_' + lang;
    var baseSlug = (tpl.slug && tpl.slug.slice(-sfx.length) === sfx)
      ? tpl.slug.slice(0, -sfx.length)
      : (tpl.slug || null);
    return { baseSlug: baseSlug, lang: lang };
  }

  /**
   * Build queue rows for INSERT. Caller-wins variables (lead's stored
   * name/phone/email) — send-message EF's injectLeadVariables will still
   * fill any gaps from crm_leads at dispatch time.
   */
  function buildQueueRows(tenantId, wizard, leadRows, baseSlug, lang) {
    var now = new Date().toISOString();
    return leadRows.map(function (l) {
      var row = {
        tenant_id: tenantId,
        lead_id: l.id,
        channel: wizard.channel,
        language: lang,
        variables: { name: l.full_name || '', phone: l.phone || '', email: l.email || '' },
        status: 'queued',
        scheduled_at: now,
        // 2026-05-13 BROADCAST_EVENT_LINK_SUPPORT — carry event_id so the
        // send-message EF can build %registration_url% via injectAutoUrls
        // for each recipient. null when broadcast is not event-linked.
        event_id: wizard.eventId || null
      };
      if (baseSlug) {
        row.template_slug = baseSlug;
      } else {
        row.body = wizard.body;
        row.subject = wizard.name || '';
      }
      return row;
    });
  }

  async function insertQueueRowsChunked(sb, rows) {
    var inserted = 0;
    for (var j = 0; j < rows.length; j += QUEUE_INSERT_CHUNK) {
      var batch = rows.slice(j, j + QUEUE_INSERT_CHUNK);
      var res = await sb.from('crm_message_queue').insert(batch);
      if (res.error) throw new Error('queue insert: ' + res.error.message);
      inserted += batch.length;
    }
    return inserted;
  }

  async function insertBroadcastRecord(sb, tenantId, employeeId, wizard, totalRecipients) {
    var res = await sb.from('crm_broadcasts').insert({
      tenant_id: tenantId,
      employee_id: employeeId,
      name: wizard.name,
      channel: wizard.channel,
      template_id: wizard.templateId || null,
      filter_criteria: {
        board: wizard.board,
        statuses: wizard.statuses.slice(),
        events: wizard.events.slice(),
        openEventsOnly: !!wizard.openEventsOnly,
        language: wizard.language || null,
        source: wizard.source || null,
        // 2026-05-13 BROADCAST_EVENT_LINK_SUPPORT — audit trail for the
        // event the broadcast is linked to (separate from the filter
        // events[] used for audience selection). Stored in jsonb to avoid
        // DDL on crm_broadcasts.
        event_id: wizard.eventId || null
      },
      total_recipients: totalRecipients,
      total_sent: 0,
      total_failed: 0,
      status: 'queued'
    }).select('id').single();
    if (res.error) throw new Error('broadcast insert: ' + res.error.message);
    return res.data.id;
  }

  /**
   * Main entry point. Orchestrates: fetch leads → resolve template → create
   * tracking broadcast record → build & insert queue rows.
   *
   * @param {Object} wizard — broadcast wizard state (channel, name, body,
   *                          templateId, language, filter fields).
   * @param {Array<string>} leadIds — pre-resolved recipient lead UUIDs.
   * @param {string} employeeId
   * @param {Object} sb — Supabase client
   * @returns {Promise<{broadcastId:string, inserted:number, etaMin:number}>}
   */
  async function enqueueBroadcast(wizard, leadIds, employeeId, sb) {
    var tenantId = (typeof getTenantId === 'function') ? getTenantId() : null;
    if (!tenantId) throw new Error('tenant_id missing');
    if (!leadIds || !leadIds.length) throw new Error('no recipients');

    var leadRows = await fetchLeadRows(sb, tenantId, leadIds);
    var t = resolveTemplate(wizard);
    var broadcastId = await insertBroadcastRecord(sb, tenantId, employeeId, wizard, leadRows.length);

    if (window.CrmHelpers && CrmHelpers.logActivity) {
      CrmHelpers.logActivity('crm.broadcast.send', 'crm_broadcast', broadcastId, {
        name: wizard.name, recipients: leadRows.length
      });
    }

    var queueRows = buildQueueRows(tenantId, wizard, leadRows, t.baseSlug, t.lang);
    var inserted = await insertQueueRowsChunked(sb, queueRows);

    var perMsgMs = THROTTLE_MS[wizard.channel] || 1000;
    var etaMin = Math.ceil((inserted * perMsgMs) / 60000);

    return { broadcastId: broadcastId, inserted: inserted, etaMin: etaMin };
  }

  window.CrmBroadcastQueue = { enqueueBroadcast: enqueueBroadcast };
})();
