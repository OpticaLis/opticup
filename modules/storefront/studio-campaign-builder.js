// modules/storefront/studio-campaign-builder.js
// AI Campaign Builder: template selection → variables → AI generation → preview → publish
// Phase: AI Campaign Builder — Phase C

let campaignTemplates = [];
let campaignBuilderState = {
  step: 1,
  selectedTemplate: null,
  variables: {},
  prompt: '',
  generatedPageId: null,
  generatedSlug: null,
};

const CAMPAIGN_EDGE_FN = SUPABASE_URL + '/functions/v1/generate-campaign-page';

// ============================================================
// Open Campaign Builder wizard
// ============================================================

async function openCampaignBuilder() {
  // Reset state
  campaignBuilderState = {
    step: 1,
    selectedTemplate: null,
    variables: {},
    prompt: '',
    generatedPageId: null,
    generatedSlug: null,
  };

  // Load templates
  try {
    const { data, error } = await sb.from('v_admin_campaign_templates').select('*');
    if (error) throw error;
    campaignTemplates = data || [];
  } catch (e) {
    console.error('[CampaignBuilder] Failed to load templates:', e);
    campaignTemplates = [];
  }

  renderCampaignWizard();
}

// ============================================================
// Render wizard overlay
// ============================================================

function renderCampaignWizard() {
  // Remove existing
  const existing = document.getElementById('cb-wizard-container');
  if (existing) existing.remove();

  const container = document.createElement('div');
  container.id = 'cb-wizard-container';

  const state = campaignBuilderState;
  let bodyHtml = '';

  // --- Step 1: Choose Template ---
  if (state.step === 1) {
    const cards = campaignTemplates.length > 0
      ? campaignTemplates.map(t => {
          const catIcon = t.category === 'sales_event' ? '📦' : t.category === 'success' ? '✅' : '📄';
          return `<div class="cb-template-card" onclick="cbSelectTemplate('${t.slug}')" data-slug="${t.slug}">
            <div class="cb-template-icon">${catIcon}</div>
            <div class="cb-template-name">${escapeHtml(t.name)}</div>
            <div class="cb-template-desc">${escapeHtml(t.description || '')}</div>
          </div>`;
        }).join('')
      : '<p style="color:#999;text-align:center;padding:20px;">אין תבניות זמינות. יש להריץ את SQL 083 קודם.</p>';

    bodyHtml = `
      <div class="cb-step-title">בחר תבנית:</div>
      <div class="cb-template-grid">${cards}</div>
    `;
  }

  // --- Step 2: Fill Details + Prompt ---
  if (state.step === 2) {
    const tmpl = state.selectedTemplate;
    const variables = tmpl.variables || [];

    const varFields = variables.map(v => {
      const val = state.variables[v.key] || v.default || '';
      return `<div class="lp-wizard-section">
        <label>${escapeHtml(v.label)}</label>
        <input type="text" id="cb-var-${v.key}" value="${escapeHtml(val)}" placeholder="${escapeHtml(v.default || '')}">
      </div>`;
    }).join('');

    // Add slug field
    const slugField = `<div class="lp-wizard-section">
      <label>Slug (URL)</label>
      <input type="text" id="cb-slug" dir="ltr" placeholder="campaign-name" value="${escapeHtml(state.variables._slug || '')}">
      <div style="font-size:.75rem;color:#999;margin-top:4px;">יישאר ריק = ייווצר אוטומטית משם האירוע</div>
    </div>`;

    bodyHtml = `
      <div class="cb-step-title">פרטי הקמפיין — ${escapeHtml(tmpl.name)}</div>
      ${varFields}
      ${slugField}
      <hr style="margin:16px 0;border:none;border-top:1px solid #e5e5e5;">
      <div class="lp-wizard-section">
        <label>📝 תיאור הקמפיין (prompt ל-AI):</label>
        <textarea id="cb-prompt" rows="5" style="min-height:120px;" placeholder="תאר את הקמפיין שלך... מה האירוע? מה המבצעים? מה המסרים העיקריים?">${escapeHtml(state.prompt)}</textarea>
        <div style="font-size:.75rem;color:#999;margin-top:4px;">מינימום 20 תווים. ה-AI ישנה את התוכן בהתאם לתיאור שלך.</div>
      </div>
    `;
  }

  // --- Step 3: Loading ---
  if (state.step === 3) {
    bodyHtml = `
      <div style="text-align:center;padding:60px 20px;">
        <div style="font-size:2.5rem;margin-bottom:20px;">🤖</div>
        <div style="font-size:1.25rem;font-weight:700;margin-bottom:12px;">בונה את העמוד...</div>
        <div class="cb-progress-bar"><div class="cb-progress-fill" id="cb-progress"></div></div>
        <div style="color:#666;font-size:.9rem;margin-top:16px;" id="cb-loading-text">מתאים תוכן לקמפיין שלך</div>
      </div>
    `;
  }

  // --- Step 4: Preview + Approve ---
  if (state.step === 4) {
    const previewUrl = `http://localhost:4321${state.generatedSlug}?preview=true`;
    bodyHtml = `
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:1.5rem;font-weight:700;color:#1a8d1a;">✅ העמוד נוצר בהצלחה!</div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;font-size:.9rem;">
        <div><strong>שם:</strong> ${escapeHtml(state.variables.event_name || 'קמפיין')}</div>
        <div><strong>סטטוס:</strong> <span style="background:#fef3c7;color:#92400e;padding:2px 8px;border-radius:4px;font-size:.8rem;">טיוטה</span></div>
        <div style="grid-column:1/-1;"><strong>כתובת:</strong> <code dir="ltr" style="background:#f3f4f6;padding:2px 6px;border-radius:4px;">${escapeHtml(state.generatedSlug || '')}</code></div>
      </div>
      <div style="border:1px solid #e5e5e5;border-radius:10px;overflow:hidden;height:400px;margin-bottom:16px;">
        <iframe src="${escapeHtml(previewUrl)}" style="width:100%;height:100%;border:none;" id="cb-preview-iframe"></iframe>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;">
        <button class="btn btn-sm" onclick="window.open('${escapeHtml(previewUrl)}','_blank')" style="background:#f3f4f6;">👁️ פתח בחלון חדש</button>
        <button class="btn btn-sm" onclick="cbEditBlocks()" style="background:#f3f4f6;">✏️ ערוך בלוקים</button>
      </div>
    `;
  }

  // Footer buttons
  let footerHtml = '';
  if (state.step === 1) {
    footerHtml = `<button class="btn-cancel" onclick="closeCampaignBuilder()">ביטול</button>`;
  } else if (state.step === 2) {
    footerHtml = `
      <button class="btn-create" id="cb-generate-btn" onclick="cbGenerate()">🤖 בנה עמוד עם AI</button>
      <button class="btn-cancel" onclick="cbGoStep(1)">← חזור</button>
    `;
  } else if (state.step === 3) {
    footerHtml = `<button class="btn-cancel" disabled>ממתין...</button>`;
  } else if (state.step === 4) {
    footerHtml = `
      <button class="btn-create" onclick="cbPublish()">✅ פרסם</button>
      <button class="btn-cancel" onclick="cbTryAgain()" style="color:#c9a555;">📝 נסה שוב עם prompt אחר</button>
      <button class="btn-cancel" onclick="cbDelete()" style="color:#ef4444;">🗑️ מחק</button>
    `;
  }

  container.innerHTML = `
    <div class="lp-wizard-overlay" id="cb-overlay" onclick="if(event.target===this)closeCampaignBuilder()">
      <div class="lp-wizard" style="max-width:700px;">
        <div class="lp-wizard-header">
          <h3>🚀 בניית קמפיין חדש</h3>
          <button class="close-btn" onclick="closeCampaignBuilder()">✕</button>
        </div>
        <div class="lp-wizard-body">${bodyHtml}</div>
        <div class="lp-wizard-footer">${footerHtml}</div>
      </div>
    </div>
    <style>
      .cb-template-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
      .cb-template-card { padding: 20px; border: 2px solid #e5e5e5; border-radius: 12px; cursor: pointer; transition: all .2s; text-align: center; }
      .cb-template-card:hover { border-color: #c9a555; background: #fefdf8; transform: translateY(-2px); }
      .cb-template-icon { font-size: 2rem; margin-bottom: 8px; }
      .cb-template-name { font-weight: 700; font-size: 1rem; margin-bottom: 4px; }
      .cb-template-desc { font-size: .8rem; color: #666; line-height: 1.4; }
      .cb-step-title { font-size: 1rem; font-weight: 700; margin-bottom: 16px; color: #374151; }
      .cb-progress-bar { width: 80%; max-width: 300px; height: 8px; background: #e5e5e5; border-radius: 4px; margin: 0 auto; overflow: hidden; }
      .cb-progress-fill { height: 100%; width: 0%; background: linear-gradient(135deg, #c9a555, #e8da94); border-radius: 4px; transition: width .5s ease; }
    </style>
  `;

  document.body.appendChild(container);

  // Auto-start progress animation in step 3
  if (state.step === 3) {
    cbAnimateProgress();
  }
}

// ============================================================
// Navigation helpers
// ============================================================

function closeCampaignBuilder() {
  const el = document.getElementById('cb-wizard-container');
  if (el) el.remove();
  // Clear campaign context
  window._campaignBuilderTargetId = null;
}

function cbGoStep(step) {
  campaignBuilderState.step = step;
  renderCampaignWizard();
}

function cbSelectTemplate(slug) {
  const tmpl = campaignTemplates.find(t => t.slug === slug);
  if (!tmpl) return;
  campaignBuilderState.selectedTemplate = tmpl;

  // Pre-fill variables with defaults
  const vars = {};
  (tmpl.variables || []).forEach(v => {
    vars[v.key] = v.default || '';
  });
  campaignBuilderState.variables = vars;

  cbGoStep(2);
}

// ============================================================
// Collect form data and generate
// ============================================================

async function cbGenerate() {
  const state = campaignBuilderState;
  const tmpl = state.selectedTemplate;
  if (!tmpl) return;

  // Collect variables from form
  (tmpl.variables || []).forEach(v => {
    const el = document.getElementById('cb-var-' + v.key);
    if (el) state.variables[v.key] = el.value.trim() || v.default || '';
  });

  // Collect slug
  const slugEl = document.getElementById('cb-slug');
  state.variables._slug = slugEl ? slugEl.value.trim() : '';

  // Collect prompt
  const promptEl = document.getElementById('cb-prompt');
  state.prompt = promptEl ? promptEl.value.trim() : '';

  // Validate prompt
  if (state.prompt.length < 20) {
    showToast('יש להזין לפחות 20 תווים בתיאור הקמפיין', 'error');
    return;
  }

  // Move to loading step
  cbGoStep(3);

  // Call Edge Function
  try {
    const payload = {
      template_slug: tmpl.slug,
      prompt: state.prompt,
      variables: state.variables,
      tenant_id: getTenantId(),
    };
    if (state.variables._slug) {
      payload.slug_override = state.variables._slug;
    }

    const res = await fetch(CAMPAIGN_EDGE_FN, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SUPABASE_ANON,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (data.success && data.page_id) {
      state.generatedPageId = data.page_id;
      state.generatedSlug = data.slug;

      // If launched from a campaign context, link the page to that campaign
      const targetCampaignId = window._campaignBuilderTargetId;
      if (targetCampaignId) {
        try {
          await sb.from('storefront_pages')
            .update({ campaign_id: targetCampaignId })
            .eq('id', data.page_id);
        } catch (_e) {
          console.warn('[CampaignBuilder] Failed to link page to campaign:', _e);
        }
      }

      cbGoStep(4);
    } else {
      console.error('[CampaignBuilder] Edge Function error:', data);
      showToast('שגיאה ביצירת העמוד: ' + (data.error || 'שגיאה לא ידועה'), 'error');
      cbGoStep(2); // Back to form
    }
  } catch (err) {
    console.error('[CampaignBuilder] Fetch error:', err);
    showToast('שגיאת תקשורת — נסו שוב', 'error');
    cbGoStep(2);
  }
}

// ============================================================
// Progress animation for step 3
// ============================================================

function cbAnimateProgress() {
  const bar = document.getElementById('cb-progress');
  const text = document.getElementById('cb-loading-text');
  if (!bar) return;

  const messages = [
    'טוען את התבנית...',
    'שולח ל-AI...',
    'מתאים תוכן לקמפיין שלך...',
    'יוצר בלוקים מותאמים...',
    'שומר טיוטה...',
  ];

  let progress = 0;
  const interval = setInterval(() => {
    // Slower progress that plateaus near the end
    if (progress < 85) {
      progress += Math.random() * 8 + 2;
    } else if (progress < 95) {
      progress += 0.5;
    }
    progress = Math.min(progress, 95);
    bar.style.width = progress + '%';

    // Update message
    const msgIdx = Math.min(Math.floor(progress / 20), messages.length - 1);
    if (text) text.textContent = messages[msgIdx];

    // Stop when wizard moves away from step 3
    if (campaignBuilderState.step !== 3) {
      bar.style.width = '100%';
      clearInterval(interval);
    }
  }, 600);
}

// ============================================================
// Step 4 actions: Publish, Try Again, Delete, Edit
// ============================================================

async function cbPublish() {
  const pageId = campaignBuilderState.generatedPageId;
  if (!pageId) return;

  try {
    const { error } = await sb.from('storefront_pages')
      .update({ status: 'published' })
      .eq('id', pageId);

    if (error) throw error;
    showToast('העמוד פורסם בהצלחה!', 'success');
    const wasCampaignContext = !!window._campaignBuilderTargetId;
    const targetCid = window._campaignBuilderTargetId;
    closeCampaignBuilder();
    // Refresh pages list and campaign if applicable
    if (typeof loadStudioPages === 'function') await loadStudioPages();
    if (wasCampaignContext && typeof refreshCampaignData === 'function') refreshCampaignData(targetCid);
  } catch (e) {
    console.error('[CampaignBuilder] Publish error:', e);
    showToast('שגיאה בפרסום: ' + e.message, 'error');
  }
}

async function cbTryAgain() {
  const pageId = campaignBuilderState.generatedPageId;
  // Delete the draft
  if (pageId) {
    try {
      await sb.from('storefront_pages')
        .update({ status: 'archived' })
        .eq('id', pageId);
    } catch (e) {
      console.error('[CampaignBuilder] Delete draft error:', e);
    }
  }

  campaignBuilderState.generatedPageId = null;
  campaignBuilderState.generatedSlug = null;
  cbGoStep(2);
}

async function cbDelete() {
  const pageId = campaignBuilderState.generatedPageId;
  if (!pageId) return;

  Modal.confirm({
    title: 'מחיקת טיוטה',
    message: 'למחוק את הטיוטה?',
    confirmText: 'מחק',
    cancelText: 'ביטול',
    danger: true,
    onConfirm: async function() {
      try {
        await sb.from('storefront_pages')
          .update({ status: 'archived' })
          .eq('id', pageId);
        showToast('הטיוטה נמחקה', 'info');
        closeCampaignBuilder();
        if (typeof loadStudioPages === 'function') await loadStudioPages();
      } catch (e) {
        console.error('[CampaignBuilder] Delete error:', e);
        showToast('שגיאה במחיקה: ' + e.message, 'error');
      }
    }
  });
}

function cbEditBlocks() {
  const pageId = campaignBuilderState.generatedPageId;
  closeCampaignBuilder();
  // Navigate to the page in the editor
  if (pageId && typeof selectPage === 'function') {
    selectPage(pageId);
  }
}
