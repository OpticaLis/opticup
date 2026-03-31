// =============================================================
// Studio Reviews Management — CRUD, visibility, Google sync
// CMS-7
// =============================================================

let studioReviews = [];
let reviewsLoaded = false;

/** Load reviews for current tenant */
async function loadReviews() {
  if (reviewsLoaded) { renderReviewsManager(); return; }
  const tid = getTenantId();
  try {
    const { data, error } = await sb.from('storefront_reviews')
      .select('*')
      .eq('tenant_id', tid)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });
    if (error) throw error;
    studioReviews = data || [];
    reviewsLoaded = true;
  } catch (err) {
    console.error('Load reviews error:', err);
    studioReviews = [];
  }
  renderReviewsManager();
}

/** Render reviews management UI */
function renderReviewsManager() {
  const container = document.getElementById('studio-reviews-content');
  if (!container) return;

  const stars = (n) => { let s = ''; for (let i = 1; i <= 5; i++) s += i <= n ? '\u2605' : '\u2606'; return s; };

  const rows = studioReviews.map((r, i) => `
    <div class="rv-row ${r.is_visible ? '' : 'opacity-50'}">
      <div class="rv-stars">${stars(r.rating)}</div>
      <div class="rv-content">
        <div class="rv-author">${escapeHtml(r.author_name)}</div>
        ${r.text ? `<div class="rv-text">${escapeHtml(r.text).substring(0, 150)}${r.text.length > 150 ? '...' : ''}</div>` : ''}
        <div class="rv-meta">
          <span class="rv-source ${r.source === 'google' ? 'rv-source-google' : 'rv-source-manual'}">${r.source === 'google' ? 'Google' : 'ידני'}</span>
          ${r.review_date ? `<span>${escapeHtml(r.review_date)}</span>` : ''}
          <span>${r.is_visible ? '👁 גלוי' : '🙈 מוסתר'}</span>
        </div>
      </div>
      <div class="rv-actions">
        <button onclick="rvMove(${i}, -1)" ${i === 0 ? 'disabled' : ''} title="הזז למעלה">▲</button>
        <button onclick="rvMove(${i}, 1)" ${i === studioReviews.length - 1 ? 'disabled' : ''} title="הזז למטה">▼</button>
        <button onclick="rvToggleVisibility('${r.id}', ${r.is_visible})" title="${r.is_visible ? 'הסתר' : 'הצג'}">
          ${r.is_visible ? '🙈' : '👁'}
        </button>
        <button onclick="rvEdit('${r.id}')" title="ערוך">✏️</button>
        <button onclick="rvDelete('${r.id}')" title="מחק" class="text-red-500">🗑</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 style="margin:0">⭐ ביקורות (${studioReviews.length})</h3>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm btn-secondary" onclick="rvSyncGoogle()">🔄 סנכרן מגוגל</button>
        <button class="btn btn-sm btn-primary" onclick="rvAddManual()">+ הוסף ביקורת</button>
      </div>
    </div>
    ${studioReviews.length === 0
      ? '<div class="studio-empty">אין ביקורות — הוסיפו ביקורות ידנית או סנכרנו מ-Google</div>'
      : rows}
  `;
}

/** Add manual review */
function rvAddManual() {
  let selectedRating = 5;
  const starsHtml = [1,2,3,4,5].map(n =>
    `<span class="rv-star-btn" data-val="${n}" onclick="rvSelectRating(${n})" style="cursor:pointer;font-size:1.5rem;color:${n <= selectedRating ? '#f59e0b' : '#d1d5db'}">\u2605</span>`
  ).join('');

  Modal.show({
    title: 'הוסף ביקורת',
    content: `
      <div dir="rtl">
        <div class="studio-field-group">
          <label>שם הכותב</label>
          <input type="text" id="rv-author" class="form-control" placeholder="ישראל ישראלי">
        </div>
        <div class="studio-field-group">
          <label>דירוג</label>
          <div id="rv-stars-select">${starsHtml}</div>
          <input type="hidden" id="rv-rating" value="5">
        </div>
        <div class="studio-field-group">
          <label>טקסט הביקורת</label>
          <textarea id="rv-text" class="form-control" rows="4" placeholder="הביקורת..."></textarea>
        </div>
        <div class="studio-field-group">
          <label>תאריך (אופציונלי)</label>
          <input type="text" id="rv-date" class="form-control" placeholder="מרץ 2026">
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>
      <button class="btn btn-primary" onclick="rvSaveManual()">שמור</button>
    `
  });
}

/** Star rating click handler */
function rvSelectRating(val) {
  document.getElementById('rv-rating').value = val;
  document.querySelectorAll('.rv-star-btn').forEach(el => {
    el.style.color = parseInt(el.dataset.val) <= val ? '#f59e0b' : '#d1d5db';
  });
}

/** Save manual review */
async function rvSaveManual() {
  const author = document.getElementById('rv-author')?.value?.trim();
  const rating = parseInt(document.getElementById('rv-rating')?.value || '5');
  const text = document.getElementById('rv-text')?.value?.trim();
  const reviewDate = document.getElementById('rv-date')?.value?.trim();

  if (!author) { Toast.error('נא למלא שם כותב'); return; }

  const tid = getTenantId();
  const maxSort = studioReviews.reduce((m, r) => Math.max(m, r.sort_order || 0), 0);

  try {
    const { error } = await sb.from('storefront_reviews').insert({
      tenant_id: tid, source: 'manual', author_name: author,
      rating, text: text || null, review_date: reviewDate || null,
      sort_order: maxSort + 1
    });
    if (error) throw error;
    Modal.close();
    Toast.success('ביקורת נוספה');
    reviewsLoaded = false;
    loadReviews();
  } catch (err) {
    console.error('Save review error:', err);
    Toast.error('שגיאה בשמירה');
  }
}

/** Toggle review visibility */
async function rvToggleVisibility(id, current) {
  try {
    const { error } = await sb.from('storefront_reviews')
      .update({ is_visible: !current })
      .eq('id', id);
    if (error) throw error;
    const r = studioReviews.find(r => r.id === id);
    if (r) r.is_visible = !current;
    renderReviewsManager();
    Toast.success(current ? 'ביקורת הוסתרה' : 'ביקורת מוצגת');
  } catch (err) {
    console.error('Toggle visibility error:', err);
    Toast.error('שגיאה');
  }
}

/** Move review up/down */
async function rvMove(idx, dir) {
  const newIdx = idx + dir;
  if (newIdx < 0 || newIdx >= studioReviews.length) return;

  [studioReviews[idx], studioReviews[newIdx]] = [studioReviews[newIdx], studioReviews[idx]];

  // Update sort_order for both
  try {
    await Promise.all([
      sb.from('storefront_reviews').update({ sort_order: idx }).eq('id', studioReviews[idx].id),
      sb.from('storefront_reviews').update({ sort_order: newIdx }).eq('id', studioReviews[newIdx].id),
    ]);
    studioReviews[idx].sort_order = idx;
    studioReviews[newIdx].sort_order = newIdx;
    renderReviewsManager();
  } catch (err) {
    console.error('Move review error:', err);
  }
}

/** Edit review */
function rvEdit(id) {
  const r = studioReviews.find(rv => rv.id === id);
  if (!r) return;

  const starsHtml = [1,2,3,4,5].map(n =>
    `<span class="rv-star-btn" data-val="${n}" onclick="rvSelectRating(${n})" style="cursor:pointer;font-size:1.5rem;color:${n <= r.rating ? '#f59e0b' : '#d1d5db'}">\u2605</span>`
  ).join('');

  Modal.show({
    title: 'עריכת ביקורת',
    content: `
      <div dir="rtl">
        <div class="studio-field-group">
          <label>שם הכותב</label>
          <input type="text" id="rv-author" class="form-control" value="${escapeHtml(r.author_name)}">
        </div>
        <div class="studio-field-group">
          <label>דירוג</label>
          <div id="rv-stars-select">${starsHtml}</div>
          <input type="hidden" id="rv-rating" value="${r.rating}">
        </div>
        <div class="studio-field-group">
          <label>טקסט הביקורת</label>
          <textarea id="rv-text" class="form-control" rows="4">${escapeHtml(r.text || '')}</textarea>
        </div>
        <div class="studio-field-group">
          <label>תאריך</label>
          <input type="text" id="rv-date" class="form-control" value="${escapeHtml(r.review_date || '')}">
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>
      <button class="btn btn-primary" onclick="rvUpdateReview('${id}')">שמור</button>
    `
  });
}

/** Update existing review */
async function rvUpdateReview(id) {
  const author = document.getElementById('rv-author')?.value?.trim();
  const rating = parseInt(document.getElementById('rv-rating')?.value || '5');
  const text = document.getElementById('rv-text')?.value?.trim();
  const reviewDate = document.getElementById('rv-date')?.value?.trim();

  if (!author) { Toast.error('נא למלא שם כותב'); return; }

  try {
    const { error } = await sb.from('storefront_reviews')
      .update({ author_name: author, rating, text: text || null, review_date: reviewDate || null })
      .eq('id', id);
    if (error) throw error;
    Modal.close();
    Toast.success('ביקורת עודכנה');
    reviewsLoaded = false;
    loadReviews();
  } catch (err) {
    console.error('Update review error:', err);
    Toast.error('שגיאה בעדכון');
  }
}

/** Delete review */
async function rvDelete(id) {
  if (!confirm('למחוק ביקורת זו?')) return;
  try {
    const { error } = await sb.from('storefront_reviews').delete().eq('id', id);
    if (error) throw error;
    studioReviews = studioReviews.filter(r => r.id !== id);
    renderReviewsManager();
    Toast.success('ביקורת נמחקה');
  } catch (err) {
    console.error('Delete review error:', err);
    Toast.error('שגיאה במחיקה');
  }
}

/** Sync reviews from Google Places API */
async function rvSyncGoogle() {
  const tid = getTenantId();

  // Check if google_place_id is configured
  const { data: config } = await sb.from('storefront_config')
    .select('google_place_id, google_api_key')
    .eq('tenant_id', tid)
    .single();

  if (!config?.google_place_id) {
    rvSetupGooglePlaceId();
    return;
  }

  if (!config?.google_api_key) {
    Toast.warning('נדרש Google API Key — הגדר בהגדרות החנות');
    return;
  }

  Toast.info('מסנכרן ביקורות מ-Google...');

  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/fetch-google-reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        google_place_id: config.google_place_id,
        google_api_key: config.google_api_key,
        tenant_id: tid
      })
    });

    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();

    // Update config with rating info
    if (result.rating != null) {
      await sb.from('storefront_config')
        .update({ google_rating: result.rating, google_review_count: result.review_count })
        .eq('tenant_id', tid);
    }

    // Save reviews
    const maxSort = studioReviews.reduce((m, r) => Math.max(m, r.sort_order || 0), 0);
    let added = 0;
    for (const review of (result.reviews || [])) {
      // Skip if already exists (by google_review_id)
      const exists = studioReviews.some(r => r.google_review_id === review.google_review_id);
      if (exists) continue;

      await sb.from('storefront_reviews').insert({
        tenant_id: tid, source: 'google', author_name: review.author,
        rating: review.rating, text: review.text,
        review_date: review.date, google_review_id: review.google_review_id,
        sort_order: maxSort + added + 1
      });
      added++;
    }

    Toast.success(`סונכרנו ${added} ביקורות חדשות מ-Google`);
    reviewsLoaded = false;
    loadReviews();
  } catch (err) {
    console.error('Google sync error:', err);
    Toast.error('שגיאה בסנכרון מ-Google');
  }
}

/** Setup Google Place ID */
function rvSetupGooglePlaceId() {
  Modal.show({
    title: 'הגדרת Google Place ID',
    content: `
      <div dir="rtl">
        <p style="font-size:.85rem;color:var(--g500);margin-bottom:12px">
          כדי לסנכרן ביקורות מ-Google, צריך להגדיר את ה-Place ID של העסק שלך:
        </p>
        <ol style="font-size:.85rem;color:var(--g600);margin-bottom:16px;padding-right:20px">
          <li>חפש את העסק שלך ב-<a href="https://www.google.com/maps" target="_blank">Google Maps</a></li>
          <li>לחץ על העסק → העתק את הקישור מ-URL</li>
          <li>או השתמש ב-<a href="https://developers.google.com/maps/documentation/places/web-service/place-id-lookup" target="_blank">Place ID Finder</a></li>
          <li>הדבק את ה-Place ID כאן</li>
        </ol>
        <div class="studio-field-group">
          <label>Google Place ID</label>
          <input type="text" id="rv-place-id" class="form-control" placeholder="ChIJxxxxxxxxxxxxxxx" dir="ltr">
        </div>
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" onclick="Modal.close()">ביטול</button>
      <button class="btn btn-primary" onclick="rvSavePlaceId()">שמור</button>
    `
  });
}

/** Save Google Place ID */
async function rvSavePlaceId() {
  const placeId = document.getElementById('rv-place-id')?.value?.trim();
  if (!placeId) { Toast.error('נא להזין Place ID'); return; }

  try {
    const { error } = await sb.from('storefront_config')
      .update({ google_place_id: placeId })
      .eq('tenant_id', getTenantId());
    if (error) throw error;
    Modal.close();
    Toast.success('Place ID נשמר — לחץ "סנכרן מגוגל" שוב');
  } catch (err) {
    console.error('Save place ID error:', err);
    Toast.error('שגיאה בשמירה');
  }
}
