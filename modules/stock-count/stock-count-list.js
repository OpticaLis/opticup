// ============================================================
// stock-count-list.js — Stock Count list screen
// ============================================================

// ── Status labels ────────────────────────────────────────────
const SC_STATUS = {
  in_progress: { text: 'בתהליך',  color: '#2196F3' },
  completed:   { text: 'הושלם',   color: '#4CAF50' },
  cancelled:   { text: 'בוטל',    color: '#9e9e9e' }
};

// ── Tab entry point ──────────────────────────────────────────
async function loadStockCountTab() {
  const body = document.getElementById('sc-list-body');
  if (!body) return;
  body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#999">טוען...</td></tr>';

  try {
    showLoading('טוען ספירות מלאי...');
    const counts = await fetchAll(T.STOCK_COUNTS, null);
    counts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Summary cards
    const now = new Date();
    const thisMonth = counts.filter(c => {
      const d = new Date(c.count_date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const open = counts.filter(c => c.status === 'in_progress').length;
    const completedMonth = thisMonth.filter(c => c.status === 'completed').length;
    const diffsMonth = thisMonth.reduce((sum, c) => sum + (c.total_diffs || 0), 0);

    document.getElementById('sc-open').textContent = open;
    document.getElementById('sc-completed').textContent = completedMonth;
    document.getElementById('sc-diffs').textContent = diffsMonth;

    renderStockCountList(counts);
  } catch (err) {
    setAlert('sc-list-alerts', 'שגיאה בטעינת ספירות: ' + err.message, 'e');
    body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--error)">שגיאה בטעינה</td></tr>';
  } finally {
    hideLoading();
  }
}

// ── Render table ─────────────────────────────────────────────
function renderStockCountList(counts) {
  const body = document.getElementById('sc-list-body');
  if (!counts.length) {
    body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#999">אין ספירות מלאי עדיין</td></tr>';
    return;
  }

  body.innerHTML = counts.map(c => {
    const s = SC_STATUS[c.status] || { text: c.status, color: '#888' };
    const date = c.count_date ? new Date(c.count_date).toLocaleDateString('he-IL') : '—';
    const counted = c.total_items || 0;
    const diffs = c.total_diffs || 0;
    const performer = c.counted_by ? escapeHtml(c.counted_by) : '—';

    let actions = '';
    if (c.status === 'in_progress') {
      actions = `<button class="btn btn-p btn-sm" onclick="toast('בקרוב','w')">המשך</button>
        <button class="btn btn-d btn-sm" onclick="toast('בקרוב','w')">ביטול</button>`;
    } else if (c.status === 'completed') {
      actions = `<button class="btn btn-g btn-sm" onclick="toast('בקרוב','w')">צפייה</button>`;
    } else {
      actions = '—';
    }

    return `<tr>
      <td style="font-weight:600">${escapeHtml(c.count_number || '—')}</td>
      <td>${date}</td>
      <td><span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:.78rem;font-weight:600;color:white;background:${s.color}">${s.text}</span></td>
      <td>${counted}</td>
      <td>${diffs}</td>
      <td>${performer}</td>
      <td>${actions}</td>
    </tr>`;
  }).join('');
}

// ── Count number generation ──────────────────────────────────
async function generateCountNumber() {
  const year = new Date().getFullYear();
  const prefix = `SC-${year}-`;
  const { data } = await sb.from(T.STOCK_COUNTS)
    .select('count_number')
    .like('count_number', `${prefix}%`)
    .order('count_number', { ascending: false })
    .limit(1);
  let seq = 1;
  if (data?.length) {
    const parts = data[0].count_number.split('-');
    seq = (parseInt(parts[parts.length - 1]) || 0) + 1;
  }
  return `${prefix}${String(seq).padStart(4, '0')}`;
}

// ── Start new count (stub) ───────────────────────────────────
async function startNewCount() {
  try {
    showLoading('יוצר ספירה חדשה...');
    const countNumber = await generateCountNumber();
    const { data, error } = await sb.from(T.STOCK_COUNTS).insert({
      count_number: countNumber,
      status: 'in_progress',
      branch_id: branchCode || '00'
    }).select().single();
    if (error) throw error;
    toast('ספירה ' + countNumber + ' נוצרה — מסך ספירה בקרוב', 'w');
    loadStockCountTab();
  } catch (err) {
    toast('שגיאה ביצירת ספירה: ' + err.message, 'e');
  } finally {
    hideLoading();
  }
}
