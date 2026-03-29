// ai-learning-dashboard.js — Per-supplier AI learning status dashboard
// Load after: ai-config.js, shared.js, supabase-ops.js
// Provides: loadAILearningTab(), _resetSupplierLearning()

// =========================================================
// 1. Load tab — fetch templates + render
// =========================================================
var _aiLearnLoaded = false;

async function loadAILearningTab() {
  var container = document.getElementById('dtab-ai-learning');
  if (!container) return;
  if (_aiLearnLoaded) return; // only load once per page (refresh on reset)
  showLoading('\u05D8\u05D5\u05E2\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9 \u05DC\u05DE\u05D9\u05D3\u05D4...');
  try {
    var tid = getTenantId();
    var { data, error } = await sb.from(T.OCR_TEMPLATES)
      .select('*, suppliers!inner(name)')
      .eq('tenant_id', tid)
      .eq('is_active', true)
      .order('last_used_at', { ascending: false });
    if (error) throw error;
    var templates = data || [];
    container.innerHTML = '';
    _renderAILearningSummary(container, templates);
    _renderAILearningTable(container, templates);
    _aiLearnLoaded = true;
  } catch (e) {
    console.error('loadAILearningTab error:', e);
    container.innerHTML = '<div class="empty-state">\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9 \u05DC\u05DE\u05D9\u05D3\u05D4</div>';
  } finally {
    hideLoading();
  }
}

// =========================================================
// 2. Summary cards
// =========================================================
function _renderAILearningSummary(container, templates) {
  var total = templates.length;
  var learning = templates.filter(function(t) { return t.learning_stage === 'learning'; }).length;
  var suggesting = templates.filter(function(t) { return t.learning_stage === 'suggesting'; }).length;
  var auto = templates.filter(function(t) { return t.learning_stage === 'auto'; }).length;

  var html = '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">';
  html += _aiLearnCard('\uD83E\uDD16', '\u05E1\u05E4\u05E7\u05D9\u05DD \u05E2\u05DD AI', total, '#e0e7ff', '#3730a3');
  html += _aiLearnCard('\uD83D\uDD34', '\u05DC\u05D5\u05DE\u05D3\u05D9\u05DD', learning, '#fef2f2', '#dc2626');
  html += _aiLearnCard('\uD83D\uDFE1', '\u05DE\u05E6\u05D9\u05E2\u05D9\u05DD', suggesting, '#fefce8', '#ca8a04');
  html += _aiLearnCard('\uD83D\uDFE2', '\u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05D9\u05DD', auto, '#f0fdf4', '#16a34a');
  html += '</div>';
  container.insertAdjacentHTML('beforeend', html);
}

function _aiLearnCard(icon, label, value, bg, color) {
  return '<div style="flex:1;min-width:120px;background:' + bg + ';border-radius:10px;padding:12px 16px;text-align:center">' +
    '<div style="font-size:1.8rem;font-weight:700;color:' + color + '">' + value + '</div>' +
    '<div style="font-size:.82rem;color:' + color + '">' + icon + ' ' + label + '</div></div>';
}

// =========================================================
// 3. Table
// =========================================================
function _renderAILearningTable(container, templates) {
  if (!templates.length) {
    container.insertAdjacentHTML('beforeend',
      '<div class="empty-state" style="padding:30px;text-align:center;color:var(--g400)">' +
      '\uD83E\uDD16 \u05D0\u05D9\u05DF \u05E2\u05D3\u05D9\u05D9\u05DF \u05E0\u05EA\u05D5\u05E0\u05D9 \u05DC\u05DE\u05D9\u05D3\u05D4 \u2014 \u05E1\u05E8\u05D5\u05E7 \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05D5\u05EA \u05DB\u05D3\u05D9 \u05E9\u05D4-AI \u05D9\u05EA\u05D7\u05D9\u05DC \u05DC\u05DC\u05DE\u05D5\u05D3</div>');
    return;
  }

  var html = '<div style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:.88rem">';
  html += '<thead><tr>' +
    '<th>\u05E1\u05E4\u05E7</th>' +
    '<th>\u05E1\u05E8\u05D9\u05E7\u05D5\u05EA</th>' +
    '<th>\u05EA\u05D9\u05E7\u05D5\u05E0\u05D9\u05DD</th>' +
    '<th>\u05D3\u05D9\u05D5\u05E7</th>' +
    '<th>\u05E9\u05DC\u05D1</th>' +
    '<th>\u05E1\u05E8\u05D9\u05E7\u05D4 \u05D0\u05D7\u05E8\u05D5\u05E0\u05D4</th>' +
    '<th>\u05E4\u05E2\u05D5\u05DC\u05D5\u05EA</th>' +
    '</tr></thead><tbody>';

  templates.forEach(function(t) {
    var supName = t.suppliers ? t.suppliers.name : '\u2014';
    var acc = t.accuracy_rate != null ? Math.round(t.accuracy_rate) : 0;
    var accColor = acc >= 80 ? '#16a34a' : acc >= 50 ? '#ca8a04' : '#dc2626';
    var accBg = acc >= 80 ? '#dcfce7' : acc >= 50 ? '#fef9c3' : '#fee2e2';
    var stageBadge = _aiLearnStageBadge(t.learning_stage);
    var lastUsed = t.last_used_at ? new Date(t.last_used_at).toLocaleDateString('he-IL') : '\u2014';

    html += '<tr>' +
      '<td style="font-weight:600">' + escapeHtml(supName) + '</td>' +
      '<td style="text-align:center">' + (t.times_used || 0) + '</td>' +
      '<td style="text-align:center">' + (t.times_corrected || 0) + '</td>' +
      '<td style="min-width:100px">' +
        '<div style="display:flex;align-items:center;gap:6px">' +
          '<div style="flex:1;height:8px;background:var(--g200,#e5e7eb);border-radius:4px;overflow:hidden">' +
            '<div style="width:' + acc + '%;height:100%;background:' + accColor + ';border-radius:4px"></div>' +
          '</div>' +
          '<span style="font-size:.82rem;font-weight:600;color:' + accColor + '">' + acc + '%</span>' +
        '</div>' +
      '</td>' +
      '<td>' + stageBadge + '</td>' +
      '<td style="font-size:.82rem;color:var(--g500)">' + lastUsed + '</td>' +
      '<td><button class="btn btn-sm" style="background:#fee2e2;color:#dc2626;font-size:.78rem" ' +
        'onclick="_resetSupplierLearning(\'' + escapeHtml(t.id) + '\')">\u05D0\u05E4\u05E1 \u05DC\u05DE\u05D9\u05D3\u05D4</button></td>' +
      '</tr>';
  });

  html += '</tbody></table></div>';
  container.insertAdjacentHTML('beforeend', html);
}

function _aiLearnStageBadge(stage) {
  var map = {
    'learning':   { icon: '\uD83D\uDD34', text: '\u05DC\u05D5\u05DE\u05D3', bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
    'suggesting': { icon: '\uD83D\uDFE1', text: '\u05DE\u05E6\u05D9\u05E2', bg: '#fefce8', color: '#ca8a04', border: '#fde047' },
    'auto':       { icon: '\uD83D\uDFE2', text: '\u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9', bg: '#f0fdf4', color: '#16a34a', border: '#86efac' }
  };
  var s = map[stage] || map['learning'];
  return '<span style="display:inline-block;padding:2px 8px;border-radius:12px;font-size:.78rem;font-weight:600;' +
    'background:' + s.bg + ';color:' + s.color + ';border:1px solid ' + s.border + '">' +
    s.icon + ' ' + s.text + '</span>';
}

// =========================================================
// 4. Reset learning for a supplier
// =========================================================
function _resetSupplierLearning(templateId) {
  if (!templateId) return;
  promptPin('\u05D0\u05D9\u05E4\u05D5\u05E1 \u05DC\u05DE\u05D9\u05D3\u05EA AI', function(pin) {
    verifyPinOnly(pin).then(function(ok) {
      if (!ok) { toast('PIN \u05E9\u05D2\u05D5\u05D9', 'e'); return; }
      _doResetLearning(templateId);
    });
  });
}

async function _doResetLearning(templateId) {
  showLoading('\u05DE\u05D0\u05E4\u05E1...');
  try {
    var { error } = await sb.from(T.OCR_TEMPLATES).update({
      times_used: 0, times_corrected: 0,
      fields_suggested: 0, fields_accepted: 0,
      accuracy_rate: 0, learning_stage: 'learning',
      extraction_hints: '{}',
      updated_at: new Date().toISOString()
    }).eq('id', templateId).eq('tenant_id', getTenantId());
    if (error) throw error;
    await writeLog('ai_learning_reset', null, { template_id: templateId });
    toast('\u05DC\u05DE\u05D9\u05D3\u05EA AI \u05D0\u05D5\u05E4\u05E1\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4', 's');
    _aiLearnLoaded = false;
    loadAILearningTab();
  } catch (e) {
    console.error('_doResetLearning error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4: ' + (e.message || ''), 'e');
  } finally {
    hideLoading();
  }
}
