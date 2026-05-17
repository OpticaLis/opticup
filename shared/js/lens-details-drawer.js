/* lens-details-drawer.js — Lens Variant Details right-pinned drawer
   ============================================================================
   Right-pinned drawer with 2 tabs: לוגים (logs — price history + stock
   movements, read-only always) and הערות (notes — freeform text with
   author + timestamp, CRUD in 'edit' mode / read-only in 'readonly' mode).

   Authored 2026-05-17 for M1_5_SHARED_COMPONENTS_PHASE_0 (per Brief §SPEC 2
   #8 + Daniel decision Round 2). Used by Pricing screen now, will be
   reused by Inventory side-panel and M7 Orders detail view.

   API:
     LensDetailsDrawer.init(container, {
       variantId,
       mode: 'edit' | 'readonly',
       fetchLogs: (variantId) => Promise<Log[]>,
       fetchNotes: (variantId) => Promise<Note[]>,
       onAddNote?: (variantId, body) => Promise<Note>,
       onEditNote?: (noteId, body) => Promise<Note>,
       onDeleteNote?: (noteId) => Promise<void>
     }) → {
       open(variantId?, mode?), close(), isOpen(),
       setMode(mode), setVariant(variantId),
       reload(), destroy()
     }

   Log[]:  { id, kind: 'price' | 'movement', date, label, delta?, value? }
   Note[]: { id, body, author_name, created_at }

   Class prefix `.ldd-*` matches LENS_PRICING_MOCKUP.html.
   Deps: shared/css/lens-details.css. Soft dep on Toast for errors.
   ============================================================================ */

(function () {
  'use strict';

  function _esc(s) {
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _fmtDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d)) return String(iso);
    var dd = String(d.getDate()).padStart(2, '0');
    var mm = String(d.getMonth() + 1).padStart(2, '0');
    var h  = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return dd + '/' + mm + '/' + d.getFullYear() + ' ' + h + ':' + min;
  }

  function init(container, config) {
    if (!container) throw new Error('LensDetailsDrawer.init: container required');
    var mount = (typeof container === 'string') ? document.querySelector(container) : container;
    if (!mount) throw new Error('LensDetailsDrawer.init: mount not found: ' + container);

    var variantId    = (config && config.variantId) || null;
    var mode         = (config && config.mode) || 'readonly';
    var fetchLogs    = (config && typeof config.fetchLogs === 'function') ? config.fetchLogs : null;
    var fetchNotes   = (config && typeof config.fetchNotes === 'function') ? config.fetchNotes : null;
    var onAddNote    = (config && typeof config.onAddNote === 'function') ? config.onAddNote : null;
    var onEditNote   = (config && typeof config.onEditNote === 'function') ? config.onEditNote : null;
    var onDeleteNote = (config && typeof config.onDeleteNote === 'function') ? config.onDeleteNote : null;

    var open = false;
    var destroyed = false;
    var activeTab = 'logs';
    var logs = [];
    var notes = [];

    var root, tabsEl, bodyEl, logsPaneEl, notesPaneEl;

    function _build() {
      root = document.createElement('div');
      root.className = 'lens-details-drawer';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-label', 'פרטי וריאנט עדשה');
      root.innerHTML =
        '<div class="ldd-header">' +
          '<div class="ldd-title">📋 פרטי וריאנט</div>' +
          '<button type="button" class="ldd-close" aria-label="סגור">×</button>' +
        '</div>' +
        '<div class="ldd-tabs" role="tablist">' +
          '<button type="button" class="ldd-tab active" data-tab="logs" role="tab" aria-selected="true">📜 לוגים</button>' +
          '<button type="button" class="ldd-tab" data-tab="notes" role="tab" aria-selected="false">📝 הערות</button>' +
        '</div>' +
        '<div class="ldd-body">' +
          '<div class="ldd-tab-pane ldd-pane-logs active" data-tab="logs"><div class="ldd-empty">טוען...</div></div>' +
          '<div class="ldd-tab-pane ldd-pane-notes" data-tab="notes"><div class="ldd-empty">טוען...</div></div>' +
        '</div>' +
        '<div class="ldd-footer">' +
          '<button type="button" class="btn btn-ghost ldd-cancel">סגור</button>' +
        '</div>';
      mount.appendChild(root);

      tabsEl       = root.querySelector('.ldd-tabs');
      bodyEl       = root.querySelector('.ldd-body');
      logsPaneEl   = root.querySelector('.ldd-pane-logs');
      notesPaneEl  = root.querySelector('.ldd-pane-notes');

      root.querySelector('.ldd-close').addEventListener('click', closeFn);
      root.querySelector('.ldd-cancel').addEventListener('click', closeFn);
      tabsEl.addEventListener('click', function (e) {
        var b = e.target.closest('.ldd-tab');
        if (!b) return;
        _setTab(b.dataset.tab);
      });
      notesPaneEl.addEventListener('click', _handleNotesClick);
    }

    function _setTab(tab) {
      activeTab = tab;
      var btns = tabsEl.querySelectorAll('.ldd-tab');
      for (var i = 0; i < btns.length; i++) {
        var on = btns[i].dataset.tab === tab;
        btns[i].classList.toggle('active', on);
        btns[i].setAttribute('aria-selected', on ? 'true' : 'false');
      }
      logsPaneEl.classList.toggle('active', tab === 'logs');
      notesPaneEl.classList.toggle('active', tab === 'notes');
    }

    function _renderLogs() {
      if (!logs.length) {
        logsPaneEl.innerHTML = '<div class="ldd-empty">אין לוגים עדיין.</div>';
        return;
      }
      var groups = { price: [], movement: [] };
      for (var i = 0; i < logs.length; i++) {
        var k = logs[i].kind === 'price' ? 'price' : 'movement';
        groups[k].push(logs[i]);
      }
      var html = '';
      if (groups.price.length) {
        html += '<div class="ldd-section"><div class="ldd-section-title">היסטוריית מחירים</div><table class="ldd-mini-table"><thead><tr><th>תאריך</th><th>שינוי</th><th>ערך</th></tr></thead><tbody>';
        for (var j = 0; j < groups.price.length; j++) {
          var lp = groups.price[j];
          html += '<tr><td>' + _esc(_fmtDate(lp.date)) + '</td><td>' + _esc(lp.label || '') + '</td><td>' + _esc(lp.value != null ? lp.value : '') + '</td></tr>';
        }
        html += '</tbody></table></div>';
      }
      if (groups.movement.length) {
        html += '<div class="ldd-section"><div class="ldd-section-title">תנועות מלאי</div><table class="ldd-mini-table"><thead><tr><th>תאריך</th><th>פעולה</th><th>שינוי</th></tr></thead><tbody>';
        for (var m = 0; m < groups.movement.length; m++) {
          var lm = groups.movement[m];
          html += '<tr><td>' + _esc(_fmtDate(lm.date)) + '</td><td>' + _esc(lm.label || '') + '</td><td>' + _esc(lm.delta != null ? lm.delta : '') + '</td></tr>';
        }
        html += '</tbody></table></div>';
      }
      logsPaneEl.innerHTML = html;
    }

    function _renderNotes() {
      var html = '';
      if (mode === 'edit' && onAddNote) {
        html += '<button type="button" class="ldd-add-note-btn" data-action="open-add">➕ הוסף הערה</button>' +
                '<div class="ldd-add-note-form" data-add-form style="display:none;">' +
                  '<textarea data-add-note-body placeholder="כתוב הערה..."></textarea>' +
                  '<div class="form-actions">' +
                    '<button type="button" class="btn btn-ghost" data-action="cancel-add">ביטול</button>' +
                    '<button type="button" class="btn btn-primary" data-action="save-add">שמור</button>' +
                  '</div>' +
                '</div>';
      }
      if (!notes.length) {
        html += '<div class="ldd-empty">אין הערות עדיין.</div>';
      } else {
        for (var i = 0; i < notes.length; i++) {
          var n = notes[i];
          html += '<div class="ldd-note-card" data-note-id="' + _esc(n.id) + '">' +
            '<div class="ldd-note-meta">' +
              '<span class="ldd-note-author">' + _esc(n.author_name || 'אנונימי') + '</span>' +
              '<span>' + _esc(_fmtDate(n.created_at)) + '</span>' +
            '</div>' +
            '<div class="ldd-note-body">' + _esc(n.body || '') + '</div>';
          if (mode === 'edit') {
            html += '<div class="ldd-note-actions edit-mode">' +
              (onEditNote ? '<button type="button" data-action="edit-note">✏️ ערוך</button>' : '') +
              (onDeleteNote ? '<button type="button" data-action="delete-note">🗑️ מחק</button>' : '') +
            '</div>';
          }
          html += '</div>';
        }
      }
      notesPaneEl.innerHTML = html;
    }

    function _handleNotesClick(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;
      var action = btn.dataset.action;
      var noteCard = btn.closest('.ldd-note-card');
      var noteId = noteCard ? noteCard.dataset.noteId : null;
      if (action === 'open-add') {
        var f = notesPaneEl.querySelector('[data-add-form]'); if (f) f.style.display = '';
        var ta = notesPaneEl.querySelector('[data-add-note-body]'); if (ta) ta.focus();
      } else if (action === 'cancel-add') {
        var f2 = notesPaneEl.querySelector('[data-add-form]'); if (f2) f2.style.display = 'none';
        var ta2 = notesPaneEl.querySelector('[data-add-note-body]'); if (ta2) ta2.value = '';
      } else if (action === 'save-add' && onAddNote) {
        var ta3 = notesPaneEl.querySelector('[data-add-note-body]');
        var body = ta3 && ta3.value && ta3.value.trim();
        if (!body) return;
        Promise.resolve(onAddNote(variantId, body)).then(function (n) {
          if (n) notes.unshift(n);
          _renderNotes();
        }).catch(function (err) {
          if (window.Toast) window.Toast.error('שמירת הערה נכשלה: ' + (err && err.message ? err.message : 'שגיאה'));
        });
      } else if (action === 'edit-note' && onEditNote && noteId) {
        var current = notes.find(function (x) { return String(x.id) === String(noteId); });
        if (!current) return;
        var bodyEditor = window.prompt('ערוך הערה', current.body || '');
        if (bodyEditor == null) return;
        Promise.resolve(onEditNote(noteId, bodyEditor)).then(function (updated) {
          if (updated) {
            var i = notes.findIndex(function (x) { return String(x.id) === String(noteId); });
            if (i !== -1) notes[i] = updated;
          }
          _renderNotes();
        }).catch(function (err) {
          if (window.Toast) window.Toast.error('עריכת הערה נכשלה: ' + (err && err.message ? err.message : 'שגיאה'));
        });
      } else if (action === 'delete-note' && onDeleteNote && noteId) {
        if (!window.confirm('למחוק הערה זו?')) return;
        Promise.resolve(onDeleteNote(noteId)).then(function () {
          notes = notes.filter(function (x) { return String(x.id) !== String(noteId); });
          _renderNotes();
        }).catch(function (err) {
          if (window.Toast) window.Toast.error('מחיקת הערה נכשלה: ' + (err && err.message ? err.message : 'שגיאה'));
        });
      }
    }

    function reload() {
      if (!variantId) {
        logs = []; notes = [];
        _renderLogs(); _renderNotes();
        return Promise.resolve();
      }
      logsPaneEl.innerHTML  = '<div class="ldd-empty">טוען לוגים…</div>';
      notesPaneEl.innerHTML = '<div class="ldd-empty">טוען הערות…</div>';
      var pLogs  = fetchLogs  ? Promise.resolve(fetchLogs(variantId))  : Promise.resolve([]);
      var pNotes = fetchNotes ? Promise.resolve(fetchNotes(variantId)) : Promise.resolve([]);
      return Promise.all([pLogs, pNotes]).then(function (res) {
        logs  = Array.isArray(res[0]) ? res[0]  : [];
        notes = Array.isArray(res[1]) ? res[1] : [];
        _renderLogs(); _renderNotes();
      }).catch(function (err) {
        if (window.Toast) window.Toast.error('טעינת פרטים נכשלה: ' + (err && err.message ? err.message : 'שגיאה'));
      });
    }

    function openFn(vId, m) {
      if (destroyed) return;
      if (vId !== undefined) variantId = vId;
      if (m !== undefined)   mode = m;
      open = true;
      root.classList.add('active');
      reload();
    }
    function closeFn() { if (destroyed) return; open = false; root.classList.remove('active'); }
    function isOpen() { return open; }
    function setMode(m) { mode = m; _renderNotes(); }
    function setVariant(v) { variantId = v; reload(); }
    function destroy() { if (destroyed) return; destroyed = true; if (root && root.parentNode) root.parentNode.removeChild(root); }

    _build();
    return {
      open: openFn, close: closeFn, isOpen: isOpen,
      setMode: setMode, setVariant: setVariant, reload: reload,
      destroy: destroy
    };
  }

  window.LensDetailsDrawer = { init: init };
})();
