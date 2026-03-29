/**
 * Shared column sorting utility for client-side table sorting.
 * Works with arrays of objects — sort by any key.
 */
const SortUtils = (() => {
  const _state = {};

  function sortArray(arr, key, dir) {
    dir = dir || 'asc';
    return arr.sort((a, b) => {
      var va = a[key], vb = b[key];
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return dir === 'asc' ? va - vb : vb - va;
      va = String(va); vb = String(vb);
      var cmp = va.localeCompare(vb, 'he');
      return dir === 'asc' ? cmp : -cmp;
    });
  }

  function toggle(tableId, key) {
    var prev = _state[tableId];
    _state[tableId] = (prev && prev.key === key)
      ? { key: key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key: key, dir: 'asc' };
    return _state[tableId];
  }

  function updateHeaders(thead, activeKey, dir) {
    if (!thead) return;
    thead.querySelectorAll('th[data-sort-key]').forEach(function(th) {
      th.classList.remove('sort-asc', 'sort-desc', 'sort-active');
      if (th.dataset.sortKey === activeKey) {
        th.classList.add(dir === 'asc' ? 'sort-asc' : 'sort-desc', 'sort-active');
      }
    });
  }

  function getState(tableId) { return _state[tableId] || null; }

  return { sortArray: sortArray, toggle: toggle, updateHeaders: updateHeaders, getState: getState };
})();
