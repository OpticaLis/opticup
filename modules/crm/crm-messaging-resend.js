/* =============================================================================
   crm-messaging-resend.js — Failed-row resend logic, shared by the messaging
   log view and the live queue view.

   Authored by M4_NIGHT_RUN_2026_05_20 W1.1. Failure-class gating (F-M04-2),
   run_id=NULL on requeue (F-M04-1), and crm_audit_log entry (F-M04-3) all
   live here so both UI surfaces share the same gating + audit shape.

   Load order: after shared.js + crm-helpers.js, before crm-messaging-log.js +
   crm-queue-live.js.
   Exports window.CrmResend.
   ============================================================================= */
(function () {
  'use strict';

  // F-M04-2: classify a failed-row error_message into resendability buckets.
  // 'resendable' = transient (SMS-provider 4xx/5xx, timeouts, rate_limit).
  // 'template_error' = body validation failed (unsubstituted_placeholder,
  // template_not_found, payment_url_mismatch) — resend will fail again until
  // the template is fixed. 'recipient_blocked' = lead unsubscribed or outside
  // the test allowlist. 'unknown' = empty error_message on a failed row.
  // Default to NOT-resendable on unknown classes to avoid blind re-fail of
  // the 758 historical Prizma unsubstituted_placeholder rows.
  function classifyResend(errorMessage) {
    var msg = (errorMessage || '').toLowerCase();
    if (!msg) return 'unknown';
    if (msg.indexOf('unsubstituted_placeholder') === 0) return 'template_error';
    if (msg.indexOf('template_not_found') === 0)        return 'template_error';
    if (msg.indexOf('payment_url_mismatch') === 0)      return 'template_error';
    if (msg.indexOf('lead_unsubscribed') === 0)         return 'recipient_blocked';
    if (msg.indexOf('phone_not_allowed') === 0)         return 'recipient_blocked';
    if (msg.indexOf('email_not_allowed') === 0)         return 'recipient_blocked';
    if (msg.indexOf('make_webhook_4') === 0)            return 'resendable';
    if (msg.indexOf('make_webhook_5') === 0)            return 'resendable';
    if (msg.indexOf('rate_limit') !== -1)               return 'resendable';
    if (msg.indexOf('timeout') !== -1)                  return 'resendable';
    if (msg.indexOf('network') !== -1)                  return 'resendable';
    return 'rejected_other';
  }

  function reasonLabel(cls) {
    switch (cls) {
      case 'template_error':    return 'תקלת תבנית — תקן את התבנית לפני שליחה מחדש';
      case 'recipient_blocked': return 'הנמען חסום (הסיר הסכמה / לא ברשימת היתר)';
      case 'rejected_other':    return 'סיבה לא מזוהה — לא נשלח אוטומטית';
      case 'unknown':           return 'הודעת שגיאה חסרה — בדוק ידנית';
      default:                  return '';
    }
  }

  // Strip the `_<channel>_<lang>` suffix from a full template slug to get the
  // base slug used by crm_message_queue.template_slug. Mirrors the resolver
  // logic in crm-messaging-broadcast-queue.js#resolveTemplate.
  function deriveBaseSlug(fullSlug, channel, language) {
    if (!fullSlug) return null;
    var sfx = '_' + (channel || '') + '_' + (language || 'he');
    return (fullSlug.length > sfx.length && fullSlug.slice(-sfx.length) === sfx)
      ? fullSlug.slice(0, -sfx.length)
      : fullSlug;
  }

  // F-M04-1: build a crm_message_queue INSERT row for a single failed/rejected
  // source. run_id=NULL so the new row never clashes with the original on
  // uq_crm_message_queue_idem (the unique idem index ignores NULL run_ids).
  // tenantId is explicit on every column — Iron Rule 22 belt-and-suspenders.
  // `source` is one of: log_row | queue_row. Both shapes pass through here.
  function buildQueueRow(tenantId, source) {
    if (source.kind === 'log_row') {
      var tpl = source.row.crm_message_templates || {};
      var lead = source.row.crm_leads || {};
      var lang = (lead.language) || (tpl.language) || 'he';
      return {
        tenant_id: tenantId,
        lead_id: source.row.lead_id,
        event_id: source.row.event_id || null,
        broadcast_id: source.row.broadcast_id || null,
        channel: source.row.channel,
        template_slug: deriveBaseSlug(tpl.slug, tpl.channel || source.row.channel, lang),
        language: lang,
        status: 'queued',
        retries: 0,
        run_id: null,
        log_id: null
      };
    }
    // queue_row: re-queue from the live queue. Preserve the already-base
    // template_slug + language verbatim. event_id/broadcast_id flow through.
    var r = source.row;
    return {
      tenant_id: tenantId,
      lead_id: r.lead_id,
      event_id: r.event_id || null,
      broadcast_id: r.broadcast_id || null,
      channel: r.channel,
      template_slug: r.template_slug || null,
      language: r.language || 'he',
      status: 'queued',
      retries: 0,
      run_id: null,
      log_id: null
    };
  }

  // F-M04-3: write a single crm_audit_log entry for a resend action.
  // Non-fatal on insert failure so the user-visible resend still completes.
  async function writeAuditEntry(tenantId, originalEntityType, originalEntityId, newQueueId, channel, baseSlug, errorClass, surface) {
    var ins = await sb.from('crm_audit_log').insert({
      tenant_id: tenantId,
      entity_type: originalEntityType,
      entity_id: originalEntityId,
      action: 'crm.message.resend',
      metadata: {
        new_queue_id: newQueueId,
        channel: channel,
        template_slug: baseSlug,
        original_error_class: errorClass,
        surface: surface,
        spec: 'M4_NIGHT_RUN_2026_05_20'
      }
    });
    if (ins.error) console.warn('resend audit log insert failed:', ins.error.message);
  }

  // Single-row resend. Validates the failure class before doing any DB write.
  // Returns { ok: bool, error?: string, newQueueId?: string }.
  async function resendOne(tenantId, source, surface) {
    var cls = classifyResend(source.row.error_message);
    if (cls !== 'resendable') {
      return { ok: false, error: reasonLabel(cls), errorClass: cls };
    }
    var payload = buildQueueRow(tenantId, source);
    var ins = await sb.from('crm_message_queue').insert(payload).select('id').single();
    if (ins.error) return { ok: false, error: ins.error.message, errorClass: cls };
    var newQueueId = ins.data && ins.data.id;
    var entityType = source.kind === 'log_row' ? 'crm_message_log' : 'crm_message_queue';
    await writeAuditEntry(tenantId, entityType, source.row.id, newQueueId, source.row.channel, payload.template_slug, cls, surface);
    return { ok: true, newQueueId: newQueueId, errorClass: cls };
  }

  // Bulk resend over an array of {kind, row} sources. Classifies each first,
  // surfaces the resendable/blocked split via Modal.confirm, then processes
  // sequentially (chunked by JS event loop). Returns the modal result.
  function bulkResend(tenantId, sources, surface, onDone) {
    var resendable = [];
    var blocked = { template_error: 0, recipient_blocked: 0, rejected_other: 0, unknown: 0 };
    sources.forEach(function (s) {
      var cls = classifyResend(s.row.error_message);
      if (cls === 'resendable') resendable.push(s);
      else blocked[cls] = (blocked[cls] || 0) + 1;
    });
    var totalBlocked = blocked.template_error + blocked.recipient_blocked + blocked.rejected_other + blocked.unknown;
    if (!resendable.length) {
      if (window.Toast) Toast.error(totalBlocked ? 'אין שורות שניתן לשלוח מחדש (' + totalBlocked + ' חסומות)' : 'אין שורות לשליחה מחדש');
      return;
    }
    if (typeof Modal === 'undefined' || typeof Modal.confirm !== 'function') {
      if (window.Toast) Toast.error('חלון אישור לא זמין');
      return;
    }
    Modal.confirm({
      title: 'שליחה מחדש בכמות',
      message: 'יוחזרו לתור ' + resendable.length + ' הודעות.' +
        (totalBlocked ? ' ' + totalBlocked + ' לא ניתנות לשליחה מחדש וידולגו (תקלות תבנית / נמען חסום).' : '') +
        ' להמשיך?',
      confirmText: 'שלח שוב ' + resendable.length,
      confirmClass: 'btn-primary',
      onConfirm: async function () {
        var ok = 0, fail = 0;
        for (var i = 0; i < resendable.length; i++) {
          var res = await resendOne(tenantId, resendable[i], surface);
          if (res.ok) ok++; else fail++;
        }
        if (window.Toast) {
          if (fail) Toast.warning('הוחזרו לתור ' + ok + '; נכשלו ' + fail);
          else      Toast.success('הוחזרו לתור ' + ok + ' הודעות');
        }
        if (typeof onDone === 'function') onDone({ ok: ok, fail: fail, blocked: totalBlocked });
      }
    });
  }

  window.CrmResend = {
    classifyResend: classifyResend,
    reasonLabel: reasonLabel,
    deriveBaseSlug: deriveBaseSlug,
    resendOne: resendOne,
    bulkResend: bulkResend
  };
})();
