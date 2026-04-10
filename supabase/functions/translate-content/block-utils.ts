/**
 * Block text extraction and RTL cleanup utilities.
 */
import {
  TRANSLATABLE_FIELDS,
  TRANSLATABLE_ARRAY_FIELDS,
} from './field-maps.ts';

// ─── Strip RTL artifacts from translated HTML ───────────────
export function cleanRtlForLtr(html: string, targetLang: string): string {
  if (targetLang === 'he') return html;
  return html
    .replace(/\s*class="ql-direction-rtl"/g, '')
    .replace(/\s*dir="rtl"/g, '');
}

// ─── Extract translatable text from blocks ───────────────────

export interface TextEntry { path: string; text: string }

export function extractBlockTexts(blocks: any[]): TextEntry[] {
  const entries: TextEntry[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockType = block.type || 'unknown';
    const data = block.data || {};

    // Top-level fields
    const fields = TRANSLATABLE_FIELDS[blockType] ?? [];
    for (const field of fields) {
      const val = data[field];
      if (typeof val === 'string' && val.trim()) {
        entries.push({ path: `blocks.${i}.data.${field}`, text: val });
      }
    }

    // Array fields
    const arrayFields = TRANSLATABLE_ARRAY_FIELDS[blockType] ?? {};
    for (const [arrayKey, subFields] of Object.entries(arrayFields)) {
      const arr = data[arrayKey];
      if (!Array.isArray(arr)) continue;
      for (let j = 0; j < arr.length; j++) {
        const item = arr[j];
        if (!item || typeof item !== 'object') continue;
        for (const sf of subFields) {
          const val = item[sf];
          if (typeof val === 'string' && val.trim()) {
            entries.push({ path: `blocks.${i}.data.${arrayKey}.${j}.${sf}`, text: val });
          }
        }
        // String array fields (e.g. features in campaign_tiers)
        if (blockType === 'campaign_tiers' && arrayKey === 'tiers' && Array.isArray(item.features)) {
          for (let k = 0; k < item.features.length; k++) {
            if (typeof item.features[k] === 'string' && item.features[k].trim()) {
              entries.push({
                path: `blocks.${i}.data.tiers.${j}.features.${k}`,
                text: item.features[k],
              });
            }
          }
        }
      }
    }
  }

  return entries;
}
