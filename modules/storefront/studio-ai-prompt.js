// modules/storefront/studio-ai-prompt.js
// AI prompt bar, API calls, history, permission gating (CMS-5)
// Diff view + component AI logic is in studio-ai-diff.js

const AI_EDIT_ENDPOINT = 'https://tsxrrxzmdxaenlvocyit.supabase.co/functions/v1/cms-ai-edit';

// Prompt history (in memory only, per page)
const promptHistory = {};

/**
 * Send AI edit request for a PAGE
 */
async function aiEditPage(currentBlocks, prompt) {
  try {
    const response = await fetch(AI_EDIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks: currentBlocks, prompt, mode: 'page' })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('AI edit error:', err);
    return { error: err.message };
  }
}

/**
 * Send AI edit request for a COMPONENT
 */
async function aiEditComponent(currentConfig, prompt) {
  try {
    const response = await fetch(AI_EDIT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: currentConfig, prompt, mode: 'component' })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || `HTTP ${response.status}`);
    }
    return await response.json();
  } catch (err) {
    console.error('AI component edit error:', err);
    return { error: err.message };
  }
}

/**
 * Render AI prompt bar in the editor area
 */
function renderAiPromptBar(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const pageId = currentPage?.id || '';
  const history = getPromptHistory(pageId);
  const historyDisabled = history.length === 0 ? 'disabled' : '';

  container.innerHTML = `<div class="ai-prompt-bar">
    <div class="ai-prompt-header">
      <span class="ai-prompt-label">\u{1F916} עריכה עם AI</span>
      <button class="ai-history-btn" title="היסטוריה" ${historyDisabled} onclick="showPromptHistoryDropdown('${pageId}')">\u{1F550}</button>
    </div>
    <div class="ai-prompt-input-row">
      <textarea placeholder="כתוב הוראה... למשל: תחליף את הכותרת ב-hero לטקסט חדש"
        rows="2" id="ai-prompt-input"></textarea>
      <button id="ai-prompt-send" class="btn btn-gold ai-send-btn" onclick="handleAiPrompt()">שלח \u2728</button>
    </div>
    <div id="ai-prompt-status" class="ai-status hidden"></div>
    <div id="ai-history-dropdown" class="ai-history-dropdown hidden"></div>
  </div>`;

  // Ctrl+Enter shortcut
  const ta = document.getElementById('ai-prompt-input');
  if (ta) ta.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key === 'Enter') { e.preventDefault(); handleAiPrompt(); }
  });
  container.classList.remove('hidden');
}

/**
 * Handle AI prompt submission (for pages)
 */
async function handleAiPrompt() {
  const prompt = document.getElementById('ai-prompt-input')?.value?.trim();
  if (!prompt) return;

  showAiStatus('loading', 'AI מעבד את הבקשה...');
  disablePromptInput(true);

  // Permission-aware: tenant_admin sends only allowed blocks
  let blocksToSend = editedBlocks;
  let lockedBlockIds = [];
  if (!isSuperAdmin()) {
    blocksToSend = editedBlocks.filter(b => canEditBlockType(b.type));
    lockedBlockIds = editedBlocks.filter(b => !canEditBlockType(b.type)).map(b => b.id);
  }

  const result = await aiEditPage(blocksToSend, prompt);

  if (result.error) {
    showAiStatus('error', result.error);
    disablePromptInput(false);
    return;
  }

  addToPromptHistory(currentPage?.id, prompt);
  showAiStatus('hidden');

  // For tenant_admin: merge AI result back with locked blocks
  let finalNewBlocks = result.blocks;
  if (lockedBlockIds.length > 0) {
    finalNewBlocks = mergeWithLockedBlocks(editedBlocks, result.blocks, lockedBlockIds);
  }

  showAiDiffView(editedBlocks, finalNewBlocks, result.explanation, prompt);
  disablePromptInput(false);
}

/**
 * Merge AI-edited blocks back with locked blocks (tenant_admin)
 */
function mergeWithLockedBlocks(originalAll, aiEdited, lockedIds) {
  const merged = [];
  const aiMap = {};
  for (const b of aiEdited) aiMap[b.id] = b;

  for (const orig of originalAll) {
    if (lockedIds.includes(orig.id)) {
      merged.push(orig);
    } else if (aiMap[orig.id]) {
      merged.push(aiMap[orig.id]);
      delete aiMap[orig.id];
    }
  }
  for (const b of Object.values(aiMap)) merged.push(b);
  return merged;
}

/**
 * Show AI status messages
 */
function showAiStatus(type, message) {
  const el = document.getElementById('ai-prompt-status');
  if (!el) return;
  if (type === 'hidden') { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');
  el.className = 'ai-status ai-status-' + type;
  if (type === 'loading') {
    el.innerHTML = `<span class="ai-spinner"></span> ${escapeHtml(message)}`;
  } else {
    el.textContent = message;
  }
}

function disablePromptInput(disabled) {
  const ta = document.getElementById('ai-prompt-input');
  const btn = document.getElementById('ai-prompt-send');
  if (ta) ta.disabled = disabled;
  if (btn) btn.disabled = disabled;
}

/**
 * Prompt history management (in memory)
 */
function addToPromptHistory(pageId, prompt) {
  if (!pageId) return;
  if (!promptHistory[pageId]) promptHistory[pageId] = [];
  promptHistory[pageId].unshift({ prompt, timestamp: new Date().toISOString() });
  if (promptHistory[pageId].length > 5) promptHistory[pageId].pop();
  const btn = document.querySelector('.ai-history-btn');
  if (btn) btn.disabled = false;
}

function getPromptHistory(pageId) {
  return promptHistory[pageId] || [];
}

function showPromptHistoryDropdown(pageId) {
  const history = getPromptHistory(pageId);
  const dropdown = document.getElementById('ai-history-dropdown');
  if (!dropdown) return;
  if (history.length === 0) { Toast.info('אין היסטוריית פרומפטים'); return; }

  if (!dropdown.classList.contains('hidden')) { dropdown.classList.add('hidden'); return; }

  dropdown.innerHTML = history.map((h, i) => {
    const time = new Date(h.timestamp).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
    const text = h.prompt.length > 60 ? h.prompt.substring(0, 60) + '...' : h.prompt;
    return `<div class="ai-history-item" onclick="fillPromptFromHistory(${i},'${pageId}')">
      <span class="ai-history-text">${escapeHtml(text)}</span>
      <span class="ai-history-time">${time}</span>
    </div>`;
  }).join('');
  dropdown.classList.remove('hidden');

  setTimeout(() => {
    const closer = e => {
      if (!dropdown.contains(e.target)) { dropdown.classList.add('hidden'); document.removeEventListener('click', closer); }
    };
    document.addEventListener('click', closer);
  }, 0);
}

function fillPromptFromHistory(index, pageId) {
  const history = getPromptHistory(pageId);
  if (history[index]) {
    const ta = document.getElementById('ai-prompt-input');
    if (ta) ta.value = history[index].prompt;
  }
  document.getElementById('ai-history-dropdown')?.classList.add('hidden');
}
