/* =============================================================================
   crm-template-section.js — Channel-section component for the templates
   accordion editor (Mockup B). One accordion section per channel
   (SMS / WhatsApp / Email). Public API: window.CrmTemplateSection.
   Consumed by crm-messaging-templates.js. WhatsApp interactions on a
   disabled section fire Toast.info — Meta WhatsApp dispatch is not yet wired.
   ============================================================================= */
(function () {
  'use strict';

  var LBL  = { sms: 'SMS', whatsapp: 'WhatsApp', email: 'אימייל' };
  var ICN  = { sms: '📱', whatsapp: '💬', email: '✉️' };
  var BORD = { sms: 'border-2 border-sky-200', whatsapp: 'border-2 border-emerald-200', email: 'border-2 border-amber-200' };
  var HBG  = { sms: 'bg-sky-50', whatsapp: 'bg-emerald-50', email: 'bg-amber-50' };
  var HTX  = { sms: 'text-sky-900', whatsapp: 'text-emerald-900', email: 'text-amber-900' };
  var CHK  = { sms: 'text-sky-600', whatsapp: 'text-emerald-600', email: 'text-amber-600' };
  var LBT  = { sms: 'text-sky-700', whatsapp: 'text-emerald-700', email: 'text-amber-700' };

  var WA_TOAST_MSG = 'WhatsApp עדיין לא פעיל — מתוכנן לרבעון הקרוב';

  function _esc(s) { return window.escapeHtml ? escapeHtml(String(s == null ? '' : s)) : String(s == null ? '' : s); }

  function _count(channel, body) {
    var n = (body || '').length;
    return channel === 'email' ? (n + ' תווים HTML') : (n + ' / 480 תווים');
  }

  function _toast(msg) {
    if (window.Toast && Toast.info) Toast.info(msg);
    else if (window.Toast && Toast.show) Toast.show(msg);
  }

  // Render the markup for one channel section. channelState shape:
  //   { exists: bool, id: uuid|null, body: string, subject: string|null, original: object|null }
  function render(channel, channelState, opts) {
    var active = !!channelState.exists;
    var open = !!(opts && opts.open);
    var border = active ? BORD[channel] : 'border border-slate-200';
    var headBg = active ? HBG[channel] : '';
    var headTx = active ? HTX[channel] : 'text-slate-700';
    var labelTxt = active ? 'ערוץ פעיל' : 'ערוץ לא פעיל — סמן להפעלה';
    var labelCls = active ? LBT[channel] : 'text-slate-500';
    var fadeCls = active ? '' : 'opacity-60';
    var arrow = open ? '▼' : '◀';
    var bodyHidden = open ? '' : 'hidden';

    var subjectField = (channel === 'email') ? (
      '<input type="text" value="' + _esc(channelState.subject || '') + '" placeholder="נושא (אימייל)" class="w-full px-3 py-2 mb-2 border border-slate-300 rounded-lg text-sm" data-section-subject' + (active ? '' : ' disabled') + '>'
    ) : '';

    var bodyHtml =
      '<div class="p-4 border-t border-slate-200 ' + bodyHidden + '" data-section-body>' +
        subjectField +
        '<textarea rows="' + (channel === 'email' ? 8 : 4) + '" class="w-full bg-slate-900 text-slate-100 p-3 border-0 font-mono text-sm rounded" style="direction:ltr;text-align:start" data-section-body-editor' + (active ? '' : ' disabled') + '>' + _esc(channelState.body || '') + '</textarea>' +
        '<div class="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3 max-w-md">' +
          '<div class="text-[10px] text-slate-500 font-semibold mb-1">תצוגה מקדימה</div>' +
          '<div class="bg-white rounded p-2 text-sm whitespace-pre-wrap" data-section-preview></div>' +
        '</div>' +
      '</div>';

    return '<div class="bg-white ' + border + ' rounded-xl overflow-hidden ' + fadeCls + '" data-section-channel="' + channel + '">' +
      '<div class="' + headBg + ' ' + headTx + ' px-4 py-3 flex items-center justify-between cursor-pointer" data-section-head>' +
        '<div class="flex items-center gap-3">' +
          '<span class="text-xl">' + ICN[channel] + '</span>' +
          '<span class="font-bold">' + _esc(LBL[channel]) + ' — עברית</span>' +
          '<span class="inline-flex items-center gap-2 mr-3" data-section-toggle-wrap>' +
            '<input type="checkbox"' + (active ? ' checked' : '') + ' class="rounded border-slate-300 ' + CHK[channel] + '" data-section-toggle>' +
            '<span class="text-xs ' + labelCls + ' font-semibold">' + _esc(labelTxt) + '</span>' +
          '</span>' +
        '</div>' +
        '<div class="flex items-center gap-2">' +
          '<span class="text-xs text-slate-500" data-section-count>' + _esc(_count(channel, channelState.body)) + '</span>' +
          '<span class="text-slate-400" data-section-arrow>' + arrow + '</span>' +
        '</div>' +
      '</div>' +
      bodyHtml +
    '</div>';
  }

  function wire(rootEl, channel, channelState, callbacks) {
    if (!rootEl) return;
    callbacks = callbacks || {};
    var toggle = rootEl.querySelector('[data-section-toggle]');
    var toggleWrap = rootEl.querySelector('[data-section-toggle-wrap]');
    var head = rootEl.querySelector('[data-section-head]');
    var bodyEl = rootEl.querySelector('[data-section-body]');
    var arrow = rootEl.querySelector('[data-section-arrow]');
    var bodyEd = rootEl.querySelector('[data-section-body-editor]');
    var subj = rootEl.querySelector('[data-section-subject]');
    var count = rootEl.querySelector('[data-section-count]');

    // Click on label/checkbox stops propagation so head-click toggle doesn't fire.
    if (toggleWrap) toggleWrap.addEventListener('click', function (e) { e.stopPropagation(); });
    if (toggle) toggle.addEventListener('change', function () {
      if (callbacks.onActiveChange) callbacks.onActiveChange(channel, !!toggle.checked);
    });

    // Head-click toggles open/closed. Doesn't re-render — toggles `hidden`.
    if (head && bodyEl) head.addEventListener('click', function () {
      var nowHidden = bodyEl.classList.toggle('hidden');
      if (arrow) arrow.textContent = nowHidden ? '◀' : '▼';
    });

    if (bodyEd) {
      bodyEd.addEventListener('input', function () {
        if (count) count.textContent = _count(channel, bodyEd.value);
        updatePreview(rootEl, channel, bodyEd.value, subj ? subj.value : null);
        if (callbacks.onBodyChange) callbacks.onBodyChange(channel, bodyEd.value);
      });
      // WhatsApp inactive interception: any focus/click on the disabled textarea fires the toast.
      if (channel === 'whatsapp' && !channelState.exists) {
        bodyEd.addEventListener('mousedown', function () { _toast(WA_TOAST_MSG); });
        bodyEd.addEventListener('focus', function () { _toast(WA_TOAST_MSG); });
      }
    }
    if (subj) subj.addEventListener('input', function () {
      updatePreview(rootEl, channel, bodyEd ? bodyEd.value : '', subj.value);
      if (callbacks.onSubjectChange) callbacks.onSubjectChange(channel, subj.value);
    });

    // Initial preview render so it's not blank when the section opens.
    updatePreview(rootEl, channel, channelState.body || '', channelState.subject || null);
  }

  function updatePreview(rootEl, channel, body, subject) {
    if (!rootEl) return;
    var host = rootEl.querySelector('[data-section-preview]');
    if (!host) return;
    var subFn = window.CrmTemplateSubstitute || function (s) { return s; };
    var rendered = subFn(body || '');
    var subjTxt = subject ? subFn(subject) : '';
    var html = '';
    if (subjTxt) html += '<div class="font-bold text-sm text-slate-800 mb-1">' + _esc(subjTxt) + '</div>';
    html += _esc(rendered);
    host.innerHTML = html;
  }

  function isInactive(channel, channelState) { return !channelState || !channelState.exists; }

  window.CrmTemplateSection = { render: render, wire: wire, updatePreview: updatePreview, isInactive: isInactive };
})();
