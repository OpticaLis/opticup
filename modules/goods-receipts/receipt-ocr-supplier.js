// receipt-ocr-supplier.js — AI supplier auto-detection from OCR (Phase A-AI-1)
// Load before: receipt-ocr.js
// Provides: OcrSupplierMatch.matchSupplier(), OcrSupplierMatch.learnSupplierAlias()

var OcrSupplierMatch = (function() {
  // Normalize name for comparison (lowercase, trim, collapse whitespace)
  function _norm(s) { return (s || '').trim().toLowerCase().replace(/\s+/g, ' '); }

  /**
   * Match OCR-extracted supplier name to a known supplier.
   * Returns {supplierId, supplierName, confidence, matchType}
   */
  async function matchSupplier(ocrSupplierName, tenantId) {
    var none = { supplierId: null, supplierName: null, confidence: 'low', matchType: 'none' };
    if (!ocrSupplierName || !ocrSupplierName.trim()) return none;
    var name = _norm(ocrSupplierName);

    // Step 1: Check OCR templates for saved aliases (instant match)
    try {
      var { data: templates } = await sb.from(T.OCR_TEMPLATES)
        .select('supplier_id, supplier_name_aliases')
        .eq('tenant_id', tenantId)
        .not('supplier_name_aliases', 'eq', '{}');
      if (templates) {
        for (var i = 0; i < templates.length; i++) {
          var aliases = templates[i].supplier_name_aliases || [];
          for (var j = 0; j < aliases.length; j++) {
            if (_norm(aliases[j]) === name) {
              var sName = typeof supplierCacheRev !== 'undefined' ? supplierCacheRev[templates[i].supplier_id] : null;
              return { supplierId: templates[i].supplier_id, supplierName: sName, confidence: 'high', matchType: 'alias_exact' };
            }
          }
        }
      }
    } catch (e) { console.warn('OcrSupplierMatch alias check error:', e); }

    // Step 2: Exact match on suppliers.name
    if (typeof supplierCache !== 'undefined') {
      for (var sn in supplierCache) {
        if (_norm(sn) === name) {
          return { supplierId: supplierCache[sn], supplierName: sn, confidence: 'high', matchType: 'name_exact' };
        }
      }
    }

    // Step 3: Fuzzy match — contains check
    var bestScore = 0, bestId = null, bestName = null;
    if (typeof supplierCache !== 'undefined') {
      for (var sn2 in supplierCache) {
        var normSn = _norm(sn2);
        var score = 0;
        if (name.includes(normSn)) {
          score = normSn.length / name.length;
        } else if (normSn.includes(name)) {
          score = name.length / normSn.length;
        }
        if (score > bestScore) {
          bestScore = score;
          bestId = supplierCache[sn2];
          bestName = sn2;
        }
      }
    }
    if (bestScore > 0.5) {
      return { supplierId: bestId, supplierName: bestName, confidence: bestScore > 0.8 ? 'high' : 'medium', matchType: 'name_fuzzy' };
    }

    return none;
  }

  /**
   * Learn: save OCR name as alias for a supplier.
   */
  async function learnSupplierAlias(ocrSupplierName, supplierId, tenantId) {
    if (!ocrSupplierName || !supplierId || !tenantId) return;
    var name = ocrSupplierName.trim();
    if (!name) return;
    try {
      // Find existing template for this supplier
      var { data: existing } = await sb.from(T.OCR_TEMPLATES)
        .select('id, supplier_name_aliases')
        .eq('tenant_id', tenantId)
        .eq('supplier_id', supplierId)
        .limit(1);
      if (existing && existing.length) {
        var tmpl = existing[0];
        var aliases = tmpl.supplier_name_aliases || [];
        // Check if alias already exists (case-insensitive)
        var norm = _norm(name);
        var exists = aliases.some(function(a) { return _norm(a) === norm; });
        if (!exists) {
          aliases.push(name);
          await sb.from(T.OCR_TEMPLATES).update({ supplier_name_aliases: aliases })
            .eq('id', tmpl.id).eq('tenant_id', tenantId);
        }
      } else {
        // Create new template with alias
        await sb.from(T.OCR_TEMPLATES).insert({
          tenant_id: tenantId,
          supplier_id: supplierId,
          supplier_name_aliases: [name],
          document_type_code: 'invoice',
          template_name: name,
          extraction_hints: {}
        });
      }
    } catch (e) {
      console.warn('learnSupplierAlias error:', e);
    }
  }

  return { matchSupplier: matchSupplier, learnSupplierAlias: learnSupplierAlias };
})();
