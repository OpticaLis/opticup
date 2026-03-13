// =========================================================
// ai-weekly-report.js — Weekly Report Screen + PDF Export (Phase 5g)
// Load after: ai-alerts.js, debt-dashboard.js
// Used on: suppliers-debt.html only
// Provides: initWeeklyReport(), loadWeeklyReport(), navigateWeek(), exportWeeklyPDF()
// =========================================================

var _wrWeekStart = null; // current week start (Date)
var _wrData = null;      // current report data object

// =========================================================
// 1. INIT + NAVIGATION
// =========================================================
function initWeeklyReport() {
  var today = new Date();
  _wrWeekStart = new Date(today);
  _wrWeekStart.setDate(today.getDate() - today.getDay()); // Sunday
  _wrWeekStart.setHours(0, 0, 0, 0);
  loadWeeklyReport(_wrWeekStart);
}

function navigateWeek(delta) {
  if (!_wrWeekStart) return;
  var next = new Date(_wrWeekStart);
  next.setDate(next.getDate() + delta * 7);
  var today = new Date();
  var curSun = new Date(today);
  curSun.setDate(today.getDate() - today.getDay());
  curSun.setHours(0, 0, 0, 0);
  if (next > curSun) return;
  _wrWeekStart = next;
  loadWeeklyReport(_wrWeekStart);
}

// =========================================================
// 2. LOAD REPORT
// =========================================================
async function loadWeeklyReport(weekStart) {
  var container = $('weeklyReportContent');
  if (!container) return;
  var tid = getTenantId();
  if (!tid) return;
  var weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  container.innerHTML = '<div class="empty-state">טוען דוח...</div>';
  try {
    var { data: saved } = await sb.from(T.WEEKLY_REPORTS)
      .select('*').eq('tenant_id', tid)
      .eq('week_start', _fd(weekStart)).limit(1);
    var snap = saved && saved.length ? saved[0] : null;
    if (snap && snap.report_data) {
      _wrData = snap.report_data;
      _wrData._saved = true;
      _wrData._pdf_url = snap.pdf_url || null;
      _wrData._report_id = snap.id;
    } else {
      _wrData = await _gatherReportData(tid, weekStart, weekEnd);
      _wrData._saved = false;
      _wrData._pdf_url = null;
    }
    _renderWeeklyReport(weekStart, weekEnd);
  } catch (e) {
    console.error('loadWeeklyReport error:', e);
    container.innerHTML = '<div class="empty-state">שגיאה בטעינת הדוח</div>';
  }
}

// =========================================================
// 3. GATHER LIVE DATA (8 parallel queries)
// =========================================================
async function _gatherReportData(tid, weekStart, weekEnd) {
  var ws = _fd(weekStart), we = _fd(weekEnd);
  var todayStr = _fd(new Date());
  var in14 = new Date(); in14.setDate(in14.getDate() + 14);
  var prevStart = new Date(weekStart); prevStart.setDate(prevStart.getDate() - 7);

  var r = await Promise.all([
    sb.from(T.SUP_DOCS).select('total_amount, paid_amount, due_date, exchange_rate')
      .eq('tenant_id', tid).eq('is_deleted', false).not('status', 'in', '("paid","cancelled")'),
    sb.from(T.SUP_PAYMENTS).select('amount, exchange_rate')
      .eq('tenant_id', tid).gte('payment_date', ws).lte('payment_date', we),
    sb.from(T.SUP_DOCS).select('id')
      .eq('tenant_id', tid).eq('is_deleted', false)
      .gte('created_at', ws + 'T00:00:00').lte('created_at', we + 'T23:59:59'),
    sb.from(T.SUP_DOCS).select('id,supplier_id,document_number,total_amount,paid_amount,due_date,exchange_rate')
      .eq('tenant_id', tid).eq('is_deleted', false).in('status', ['open', 'partial'])
      .gte('due_date', todayStr).lte('due_date', _fd(in14))
      .order('due_date', { ascending: true }).limit(10),
    sb.from(T.PREPAID_DEALS).select('id,supplier_id,total_prepaid,total_used,total_remaining,status')
      .eq('tenant_id', tid).eq('is_deleted', false).eq('status', 'active'),
    sb.from(T.OCR_EXTRACTIONS).select('id, status')
      .eq('tenant_id', tid).gte('created_at', ws + 'T00:00:00').lte('created_at', we + 'T23:59:59'),
    sb.from(T.SUPPLIERS).select('id, name').eq('tenant_id', tid).eq('active', true),
    sb.from(T.WEEKLY_REPORTS).select('report_data')
      .eq('tenant_id', tid).eq('week_start', _fd(prevStart)).limit(1)
  ]);

  var openDocs = r[0].data || [], weekPay = r[1].data || [], newDocs = r[2].data || [];
  var upcoming = r[3].data || [], prepaid = r[4].data || [], ocrRows = r[5].data || [];
  var supMap = {};
  (r[6].data || []).forEach(function(s) { supMap[s.id] = s.name; });
  var prevSnap = r[7].data && r[7].data.length ? r[7].data[0].report_data : null;

  // Summary
  var totalDebt = 0, overdueAmt = 0, overdueCount = 0;
  openDocs.forEach(function(d) {
    var rem = (Number(d.total_amount) - Number(d.paid_amount)) * (Number(d.exchange_rate) || 1);
    if (rem <= 0) return;
    totalDebt += rem;
    if (d.due_date && d.due_date < todayStr) { overdueAmt += rem; overdueCount++; }
  });
  var paidWeek = 0;
  weekPay.forEach(function(p) { paidWeek += Number(p.amount) * (Number(p.exchange_rate) || 1); });
  var prevDebt = prevSnap ? (prevSnap.total_debt || 0) : null;

  // Upcoming
  var upArr = upcoming.map(function(d) {
    var rem = (Number(d.total_amount) - Number(d.paid_amount)) * (Number(d.exchange_rate) || 1);
    return { supplier: supMap[d.supplier_id] || 'לא ידוע', amount: rem, due_date: d.due_date, doc_number: d.document_number };
  });

  // Prepaid
  var preArr = prepaid.map(function(dl) {
    var total = Number(dl.total_prepaid) || 0;
    var rem = Number(dl.total_remaining) || (total - (Number(dl.total_used) || 0));
    var pct = total > 0 ? Math.round(rem / total * 100) : 0;
    return { supplier: supMap[dl.supplier_id] || 'לא ידוע', total: total, remaining: rem, pct: pct, low: pct < 20 };
  });

  // OCR
  var ocrT = ocrRows.length;
  var ocrA = ocrRows.filter(function(x) { return x.status === 'accepted'; }).length;
  var ocrC = ocrRows.filter(function(x) { return x.status === 'corrected'; }).length;

  return {
    total_debt: totalDebt, debt_change: prevDebt !== null ? totalDebt - prevDebt : null,
    overdue: overdueAmt, overdue_count: overdueCount,
    paid_this_week: paidWeek, new_documents: newDocs.length,
    upcoming_payments: upArr, prepaid_deals_status: preArr,
    ocr_stats: { scanned: ocrT, auto_filled: ocrA, corrected: ocrC, accuracy: ocrT > 0 ? Math.round(ocrA / ocrT * 100) : 0 }
  };
}

// =========================================================
// 4. RENDER
// =========================================================
function _renderWeeklyReport(weekStart, weekEnd) {
  var c = $('weeklyReportContent');
  if (!c || !_wrData) return;
  var d = _wrData;
  var today = new Date(), curSun = new Date(today);
  curSun.setDate(today.getDate() - today.getDay());
  curSun.setHours(0, 0, 0, 0);
  var isCurWeek = weekStart.getTime() >= curSun.getTime();

  // Debt change badge
  var chgHtml = '';
  if (d.debt_change !== null) {
    var up = d.debt_change >= 0;
    chgHtml = ' <span style="font-size:.85rem;color:' + (up ? 'var(--error)' : 'var(--success,#155724)') + '">(' +
      (up ? '&#8593;' : '&#8595;') + formatILS(Math.abs(d.debt_change)) + ' מהשבוע שעבר)</span>';
  }

  // Upcoming payments
  var upHtml = (d.upcoming_payments && d.upcoming_payments.length)
    ? d.upcoming_payments.map(function(p) {
        return '<div class="weekly-upcoming-row">' +
          '<span class="wur-date">' + _fdh(new Date(p.due_date + 'T00:00:00')) + '</span>' +
          '<span class="wur-name">' + escapeHtml(p.supplier) + '</span>' +
          '<span class="wur-amount">' + formatILS(p.amount) + '</span>' +
          '<span class="wur-doc">' + (p.doc_number ? escapeHtml(p.doc_number) : '') + '</span></div>';
      }).join('')
    : '<div class="empty-state" style="padding:12px">אין תשלומים קרובים</div>';

  // Prepaid deals
  var preHtml = (d.prepaid_deals_status && d.prepaid_deals_status.length)
    ? d.prepaid_deals_status.map(function(dl) {
        var w = dl.low ? ' <span style="color:var(--error)">&#9888;&#65039;</span>' : '';
        return '<div class="weekly-prepaid-row"><span>' + escapeHtml(dl.supplier) + '</span>' +
          '<span>' + formatILS(dl.remaining) + ' / ' + formatILS(dl.total) + ' (' + dl.pct + '% נותר)' + w + '</span></div>';
      }).join('')
    : '<div class="empty-state" style="padding:12px">אין עסקאות מקדמה פעילות</div>';

  var ocr = d.ocr_stats || { scanned: 0, auto_filled: 0, corrected: 0, accuracy: 0 };
  var pdfBtn = d._pdf_url
    ? '<button class="btn btn-s" onclick="window.open(\'' + escapeHtml(d._pdf_url) + '\',\'_blank\')">&#128196; פתח PDF</button>'
    : '<button class="btn btn-s" onclick="exportWeeklyPDF()">&#128196; ייצוא PDF</button>';

  c.innerHTML =
    '<div id="weekly-report-wrap">' +
    '<div class="weekly-report-header">' +
      '<button class="btn btn-g btn-sm" onclick="navigateWeek(-1)">&#9664; קודם</button>' +
      '<h3>&#128202; דוח שבועי &mdash; ' + _fdh(weekStart) + ' &ndash; ' + _fdh(weekEnd) + '</h3>' +
      '<button class="btn btn-g btn-sm" onclick="navigateWeek(1)"' + (isCurWeek ? ' disabled' : '') + '>הבא &#9654;</button>' +
    '</div>' +
    _wrCard('סיכום',
      '<div class="weekly-stat"><span>חוב כולל:</span><strong>' + formatILS(d.total_debt) + '</strong>' + chgHtml + '</div>' +
      '<div class="weekly-stat"><span>שולם השבוע:</span><strong>' + formatILS(d.paid_this_week) + '</strong>' +
        '<span style="margin-right:16px">מסמכים חדשים:</span><strong>' + d.new_documents + '</strong></div>' +
      '<div class="weekly-stat"><span>באיחור:</span><strong style="color:' + (d.overdue > 0 ? 'var(--error)' : 'inherit') + '">' +
        formatILS(d.overdue) + '</strong>' + (d.overdue_count > 0 ? ' <span>(' + d.overdue_count + ' מסמכים)</span>' : '') + '</div>'
    ) +
    _wrCard('תשלומים קרובים (14 יום)', upHtml) +
    _wrCard('עסקאות מקדמה', preHtml) +
    _wrCard('סטטיסטיקות AI',
      '<div class="weekly-ocr-stats">' +
        '<span>נסרקו: <strong>' + ocr.scanned + '</strong></span>' +
        '<span>מילוי אוטומטי: <strong>' + ocr.auto_filled + '</strong></span>' +
        '<span>תוקנו: <strong>' + ocr.corrected + '</strong></span>' +
        '<span>דיוק: <strong>' + ocr.accuracy + '%</strong></span></div>'
    ) +
    '<div class="weekly-report-actions">' + pdfBtn +
      '<button class="btn btn-g" onclick="toast(\'בקרוב\',\'i\')">&#128231; שלח במייל (בקרוב)</button>' +
    '</div></div>';
}

function _wrCard(title, body) {
  return '<div class="weekly-report-section"><div class="weekly-report-card"><h4>' + title + '</h4>' + body + '</div></div>';
}

// =========================================================
// 5. PDF EXPORT
// =========================================================
async function exportWeeklyPDF() {
  if (!_wrData || !_wrWeekStart) return;
  var tid = getTenantId();
  if (!tid) return;
  if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
    toast('ספריות PDF לא נטענו — נסה שוב', 'e'); return;
  }
  showLoading('מייצר PDF...');
  try {
    var el = $('weekly-report-wrap');
    if (!el) { hideLoading(); return; }
    var canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#f5f6fa' });
    var imgData = canvas.toDataURL('image/jpeg', 0.95);
    var pdf = new window.jspdf.jsPDF({
      orientation: canvas.width > canvas.height ? 'l' : 'p',
      unit: 'px', format: [canvas.width, canvas.height]
    });
    pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
    pdf.save('weekly-report-' + _fd(_wrWeekStart) + '.pdf');

    // Save snapshot
    var weekEnd = new Date(_wrWeekStart); weekEnd.setDate(weekEnd.getDate() + 6);
    var snapData = Object.assign({}, _wrData);
    delete snapData._saved; delete snapData._pdf_url; delete snapData._report_id;
    if (_wrData._report_id) {
      await sb.from(T.WEEKLY_REPORTS)
        .update({ report_data: snapData, pdf_generated_at: new Date().toISOString() })
        .eq('id', _wrData._report_id);
    } else {
      await sb.from(T.WEEKLY_REPORTS).insert({
        tenant_id: tid, week_start: _fd(_wrWeekStart), week_end: _fd(weekEnd),
        report_data: snapData, pdf_generated_at: new Date().toISOString()
      });
    }
    _wrData._saved = true;
    toast('PDF יוצא בהצלחה', 's');
  } catch (e) {
    console.error('exportWeeklyPDF error:', e);
    toast('שגיאה בייצוא PDF', 'e');
  } finally { hideLoading(); }
}

// =========================================================
// 6. HELPERS
// =========================================================
function _fd(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function _fdh(d) {
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}
