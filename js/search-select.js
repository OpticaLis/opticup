// =========================================================
// SEARCHABLE SELECT — Fixed positioning dropdown
// =========================================================
let activeDropdown = null; // Track the currently open dropdown

// Shared MutationObserver for search-select dropdown cleanup (STAB-06)
const _searchSelectCleanups = new Set();
window._sharedSearchObserver = new MutationObserver(() => {
  for (const fn of [..._searchSelectCleanups]) {
    if (fn()) _searchSelectCleanups.delete(fn);
  }
});
window._sharedSearchObserver.observe(document.body, {childList: true, subtree: true});

function closeAllDropdowns() {
  document.querySelectorAll('.ss-dropdown.open').forEach(d => d.classList.remove('open'));
  activeDropdown = null;
}

// Single global click listener for closing dropdowns
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-select') && !e.target.closest('.ss-dropdown')) {
    closeAllDropdowns();
  }
});

// Reposition dropdown on scroll
document.addEventListener('scroll', repositionDropdown, true);
window.addEventListener('resize', repositionDropdown);

function repositionDropdown() {
  if (!activeDropdown) return;
  const {input, dropdown} = activeDropdown;
  if (!input.isConnected) { closeAllDropdowns(); return; }
  const rect = input.getBoundingClientRect();
  dropdown.style.top = rect.bottom + 2 + 'px';
  dropdown.style.right = (window.innerWidth - rect.right) + 'px';
  dropdown.style.width = Math.max(rect.width, 180) + 'px';
}

function createSearchSelect(items, value, onChange) {
  const wrap = document.createElement('div');
  wrap.className = 'search-select';

  const inp = document.createElement('input');
  inp.type = 'text';
  inp.placeholder = 'חפש חברה...';
  inp.value = value || '';
  inp.setAttribute('autocomplete', 'off');

  const hidden = document.createElement('input');
  hidden.type = 'hidden';
  hidden.className = 'col-brand';
  hidden.value = value || '';

  // Create dropdown in body (outside table) for fixed positioning
  const dropdown = document.createElement('div');
  dropdown.className = 'ss-dropdown';
  document.body.appendChild(dropdown);

  function render(filter) {
    const f = (filter||'').toLowerCase();
    const filtered = items.filter(it => !f || it.toLowerCase().includes(f));
    if (!filtered.length) {
      dropdown.innerHTML = '<div class="ss-empty">לא נמצאו תוצאות</div>';
    } else {
      dropdown.innerHTML = filtered
        .map(it => `<div class="ss-item${it===hidden.value?' selected':''}" data-val="${escapeHtml(it)}">${escapeHtml(it)}</div>`).join('');
    }
    dropdown.querySelectorAll('.ss-item').forEach(el => {
      el.onmousedown = (e) => {
        e.preventDefault(); // Prevent input blur
        hidden.value = el.dataset.val;
        inp.value = el.dataset.val;
        dropdown.classList.remove('open');
        activeDropdown = null;
        if (onChange) onChange(el.dataset.val);
      };
    });
  }

  function openDropdown() {
    closeAllDropdowns();
    render(inp.value);
    const rect = inp.getBoundingClientRect();
    dropdown.style.top = rect.bottom + 2 + 'px';
    dropdown.style.right = (window.innerWidth - rect.right) + 'px';
    dropdown.style.width = Math.max(rect.width, 180) + 'px';
    dropdown.classList.add('open');
    activeDropdown = {input: inp, dropdown};
  }

  inp.addEventListener('focus', openDropdown);
  inp.addEventListener('click', openDropdown);
  inp.addEventListener('input', () => {
    render(inp.value);
    if (!dropdown.classList.contains('open')) openDropdown();
  });
  inp.addEventListener('blur', () => {
    // Small delay to allow click on item
    setTimeout(() => {
      if (activeDropdown?.input === inp) {
        dropdown.classList.remove('open');
        activeDropdown = null;
      }
      // If text doesn't match any item, clear or keep last valid
      if (inp.value && !items.includes(inp.value)) {
        // Try to find a match
        const match = items.find(it => it.toLowerCase() === inp.value.toLowerCase());
        if (match) {
          inp.value = match;
          hidden.value = match;
          if (onChange) onChange(match);
        }
      }
    }, 200);
  });

  // Clean up dropdown when row is removed (uses shared observer — STAB-06)
  _searchSelectCleanups.add(() => {
    if (!wrap.isConnected) {
      dropdown.remove();
      return true;
    }
    return false;
  });

  wrap.appendChild(inp);
  wrap.appendChild(hidden);
  wrap._dropdown = dropdown;
  wrap._hidden = hidden;
  wrap._input = inp;
  render('');
  return wrap;
}
