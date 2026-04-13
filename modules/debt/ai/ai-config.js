// =========================================================
// ai-config.js — AI Agent Configuration Screen (Phase 5h)
// Load after: ai-weekly-report.js
// Used on: suppliers-debt.html only
// Provides: openAIConfig(), saveAIConfig()
// =========================================================

// =========================================================
// 1. PERMISSION CHECK + GEAR BUTTON INJECTION
// =========================================================
function _aiCfgHasAccess() {
  var role = sessionStorage.getItem('tenant_role');
  return role === 'ceo' || role === 'manager';
}

function _injectConfigGear() {
  if (!_aiCfgHasAccess()) return;
  var topbar = document.querySelector('.debt-topbar');
  if (!topbar || document.getElementById('ai-config-gear')) return;
  var btn = document.createElement('button');
  btn.id = 'ai-config-gear';
  btn.className = 'ai-config-gear-btn';
  btn.title = 'הגדרות AI';
  btn.textContent = '\u2699\uFE0F';
  btn.onclick = openAIConfig;
  topbar.appendChild(btn);
}

document.addEventListener('DOMContentLoaded', function() {
  setTimeout(_injectConfigGear, 500);
});

// =========================================================
// 2. OPEN CONFIG MODAL
// =========================================================
async function openAIConfig() {
  if (!_aiCfgHasAccess()) {
    toast('\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4', 'e');
    return;
  }
  showLoading('\u05D8\u05D5\u05E2\u05DF \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA...');
  try {
    var tid = getTenantId();
    // Load config
    var configRes = await sb.from(T.AI_CONFIG).select('*').eq('tenant_id', tid).limit(1);
    var config = (configRes.data && configRes.data.length) ? configRes.data[0] : null;
    if (!config) {
      // Create default row
      var ins = await sb.from(T.AI_CONFIG).insert({
        tenant_id: tid, ocr_enabled: true, auto_match_supplier: true,
        auto_match_po: true, confidence_threshold: 0.80, alerts_enabled: true,
        payment_reminder_days: 7, overdue_alert: true, prepaid_threshold_alert: true,
        anomaly_alert: true, weekly_report_enabled: true, weekly_report_day: 1
      }).select();
      config = (ins.data && ins.data.length) ? ins.data[0] : {};
    }

    // Gather stats in parallel
    var statsRes = await Promise.all([
      sb.from(T.OCR_EXTRACTIONS).select('id', { count: 'exact', head: true }).eq('tenant_id', tid),
      sb.from(T.OCR_EXTRACTIONS).select('confidence_score').eq('tenant_id', tid).in('status', ['accepted', 'corrected']),
      sb.from(T.OCR_TEMPLATES).select('id', { count: 'exact', head: true }).eq('tenant_id', tid).eq('is_active', true),
      sb.from(T.ALERTS).select('id', { count: 'exact', head: true }).eq('tenant_id', tid).in('status', ['unread', 'read'])
    ]);

    var totalScans = statsRes[0].count || 0;
    var accRows = statsRes[1].data || [];
    var avgAccuracy = 0;
    if (accRows.length > 0) {
      var sum = accRows.reduce(function(s, r) { return s + (Number(r.confidence_score) || 0); }, 0);
      avgAccuracy = Math.round((sum / accRows.length) * 100);
    }
    var templateCount = statsRes[2].count || 0;
    var activeAlerts = statsRes[3].count || 0;

    var stats = { totalScans: totalScans, avgAccuracy: avgAccuracy, templateCount: templateCount, activeAlerts: activeAlerts };

    hideLoading();
    _renderAIConfigModal(config, stats);
  } catch (e) {
    hideLoading();
    console.error('openAIConfig error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA', 'e');
  }
}

// =========================================================
// 3. RENDER MODAL
// =========================================================
function _renderAIConfigModal(config, stats) {
  // Remove existing modal
  var old = document.getElementById('ai-config-overlay');
  if (old) old.remove();

  var c = config;
  var confPct = Math.round((Number(c.confidence_threshold) || 0.80) * 100);
  var dayNames = [
    '', '\u05E8\u05D0\u05E9\u05D5\u05DF', '\u05E9\u05E0\u05D9', '\u05E9\u05DC\u05D9\u05E9\u05D9',
    '\u05E8\u05D1\u05D9\u05E2\u05D9', '\u05D7\u05DE\u05D9\u05E9\u05D9', '\u05E9\u05D9\u05E9\u05D9', '\u05E9\u05D1\u05EA'
  ];
  var dayOpts = '';
  for (var i = 1; i <= 7; i++) {
    dayOpts += '<option value="' + i + '"' + (Number(c.weekly_report_day) === i ? ' selected' : '') + '>' + dayNames[i] + '</option>';
  }

  var overlay = document.createElement('div');
  overlay.id = 'ai-config-overlay';
  overlay.className = 'ai-config-modal';
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML =
    '<div class="ai-config-card">' +
      '<h3>\u2699\uFE0F \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05E1\u05D5\u05DB\u05DF AI</h3>' +

      // OCR Section
      '<div class="ai-config-section">' +
        '<h4>\uD83D\uDCF7 \u05E1\u05E8\u05D9\u05E7\u05EA OCR</h4>' +
        _cfgCheckbox('cfg-ocr-enabled', '\u05E1\u05E8\u05D9\u05E7\u05D4 \u05E4\u05E2\u05D9\u05DC\u05D4', c.ocr_enabled) +
        _cfgCheckbox('cfg-auto-supplier', '\u05D4\u05EA\u05D0\u05DE\u05EA \u05E1\u05E4\u05E7 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA', c.auto_match_supplier) +
        _cfgCheckbox('cfg-auto-po', '\u05D4\u05EA\u05D0\u05DE\u05EA \u05D4\u05D6\u05DE\u05E0\u05EA \u05E8\u05DB\u05E9 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9\u05EA', c.auto_match_po) +
        '<div class="ai-config-row">' +
          '<label>\u05E1\u05E3 \u05D1\u05D9\u05D8\u05D7\u05D5\u05DF:</label>' +
          '<div class="ai-config-slider-wrap">' +
            '<input type="range" id="cfg-confidence" class="ai-config-slider" min="50" max="100" step="5" value="' + confPct + '" oninput="document.getElementById(\'cfg-conf-val\').textContent=this.value+\'%\'">' +
            '<span id="cfg-conf-val" class="ai-config-slider-val">' + confPct + '%</span>' +
          '</div>' +
        '</div>' +
      '</div>' +

      // Alerts Section
      '<div class="ai-config-section">' +
        '<h4>\uD83D\uDD14 \u05D4\u05EA\u05E8\u05D0\u05D5\u05EA</h4>' +
        _cfgCheckbox('cfg-alerts-enabled', '\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA', c.alerts_enabled) +
        '<div class="ai-config-row">' +
          '<label>\u05D9\u05DE\u05D9 \u05EA\u05D6\u05DB\u05D5\u05E8\u05EA \u05EA\u05E9\u05DC\u05D5\u05DD:</label>' +
          '<input type="number" id="cfg-reminder-days" class="ai-config-num" min="1" max="30" value="' + (c.payment_reminder_days || 7) + '">' +
        '</div>' +
        _cfgCheckbox('cfg-overdue', '\u05D4\u05EA\u05E8\u05D0\u05EA \u05D0\u05D9\u05D7\u05D5\u05E8', c.overdue_alert) +
        _cfgCheckbox('cfg-prepaid-alert', '\u05D4\u05EA\u05E8\u05D0\u05EA \u05E2\u05E1\u05E7\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4', c.prepaid_threshold_alert) +
        _cfgCheckbox('cfg-anomaly', '\u05D4\u05EA\u05E8\u05D0\u05EA \u05D0\u05D9-\u05D4\u05EA\u05D0\u05DE\u05D4', c.anomaly_alert) +
      '</div>' +

      // Weekly Report Section
      '<div class="ai-config-section">' +
        '<h4>\uD83D\uDCCA \u05D3\u05D5\u05D7 \u05E9\u05D1\u05D5\u05E2\u05D9</h4>' +
        _cfgCheckbox('cfg-weekly-enabled', '\u05E4\u05E2\u05D9\u05DC', c.weekly_report_enabled) +
        '<div class="ai-config-row">' +
          '<label>\u05D9\u05D5\u05DD \u05D4\u05E4\u05E7\u05EA \u05D3\u05D5\u05D7:</label>' +
          '<select id="cfg-weekly-day" class="ai-config-num">' + dayOpts + '</select>' +
        '</div>' +
      '</div>' +

      // Stats Section
      '<div class="ai-config-section ai-config-stats">' +
        '<h4>\uD83D\uDCC8 \u05E1\u05D8\u05D8\u05D9\u05E1\u05D8\u05D9\u05E7\u05D5\u05EA</h4>' +
        '<div class="ai-config-stats-grid">' +
          _cfgStat('\u05E1\u05E8\u05D9\u05E7\u05D5\u05EA OCR', stats.totalScans) +
          _cfgStat('\u05D3\u05D9\u05D5\u05E7 \u05DE\u05DE\u05D5\u05E6\u05E2', stats.avgAccuracy + '%') +
          _cfgStat('\u05EA\u05D1\u05E0\u05D9\u05D5\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA', stats.templateCount) +
          _cfgStat('\u05D4\u05EA\u05E8\u05D0\u05D5\u05EA \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA', stats.activeAlerts) +
        '</div>' +
      '</div>' +

      // Action buttons
      '<div class="ai-config-actions">' +
        '<button class="btn" style="background:#059669;color:#fff" onclick="saveAIConfig()">\u05E9\u05DE\u05D5\u05E8 \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA</button>' +
        '<button class="btn" style="background:#e5e7eb;color:#1e293b" onclick="document.getElementById(\'ai-config-overlay\').remove()">\u05D1\u05D9\u05D8\u05D5\u05DC</button>' +
      '</div>' +
    '</div>';

  document.body.appendChild(overlay);
}

// =========================================================
// 4. HELPER BUILDERS
// =========================================================
function _cfgCheckbox(id, label, checked) {
  return '<div class="ai-config-row">' +
    '<label for="' + id + '">' + label + '</label>' +
    '<input type="checkbox" id="' + id + '" class="ai-config-checkbox"' + (checked ? ' checked' : '') + '>' +
  '</div>';
}

function _cfgStat(label, value) {
  return '<div class="ai-config-stat-item">' +
    '<div class="aics-value">' + value + '</div>' +
    '<div class="aics-label">' + label + '</div>' +
  '</div>';
}

// =========================================================
// 5. SAVE CONFIG
// =========================================================
async function saveAIConfig() {
  if (!_aiCfgHasAccess()) { toast('\u05D0\u05D9\u05DF \u05D4\u05E8\u05E9\u05D0\u05D4', 'e'); return; }
  var tid = getTenantId();
  if (!tid) return;

  var update = {
    ocr_enabled: document.getElementById('cfg-ocr-enabled').checked,
    auto_match_supplier: document.getElementById('cfg-auto-supplier').checked,
    auto_match_po: document.getElementById('cfg-auto-po').checked,
    confidence_threshold: Number(document.getElementById('cfg-confidence').value) / 100,
    alerts_enabled: document.getElementById('cfg-alerts-enabled').checked,
    payment_reminder_days: parseInt(document.getElementById('cfg-reminder-days').value, 10) || 7,
    overdue_alert: document.getElementById('cfg-overdue').checked,
    prepaid_threshold_alert: document.getElementById('cfg-prepaid-alert').checked,
    anomaly_alert: document.getElementById('cfg-anomaly').checked,
    weekly_report_enabled: document.getElementById('cfg-weekly-enabled').checked,
    weekly_report_day: parseInt(document.getElementById('cfg-weekly-day').value, 10) || 1,
    updated_at: new Date().toISOString()
  };

  try {
    await sb.from(T.AI_CONFIG).update(update).eq('tenant_id', tid);
    toast('\u05D4\u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05E0\u05E9\u05DE\u05E8\u05D5', 's');
    var overlay = document.getElementById('ai-config-overlay');
    if (overlay) overlay.remove();
  } catch (e) {
    console.error('saveAIConfig error:', e);
    toast('\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA', 'e');
  }
}
