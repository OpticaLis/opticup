// Helpers for import-monday-data.mjs (extracted to satisfy 350-line cap).
// Pure functions + small lookup tables; no module-level state.

import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';

// File-prefix resolver. Matches "Tier_2_Master_Board_*.xlsx" against actual
// files in dir; picks lexicographically last match (newest timestamp suffix).
export function resolveExport(exportsDir, declaredName) {
  const exactPath = path.join(exportsDir, declaredName);
  if (fs.existsSync(exactPath)) return declaredName;
  const m = declaredName.match(/^(.+?)_\d+\.xlsx$/);
  const prefix = m ? m[1] + '_' : declaredName.replace(/\.xlsx$/, '_');
  if (!fs.existsSync(exportsDir)) {
    throw new Error(`Source directory does not exist: ${exportsDir}`);
  }
  const candidates = fs
    .readdirSync(exportsDir)
    .filter((f) => f.startsWith(prefix) && f.endsWith('.xlsx'));
  if (candidates.length === 0) {
    throw new Error(`No file matching ${prefix}*.xlsx in ${exportsDir}`);
  }
  candidates.sort();
  return candidates[candidates.length - 1];
}

export function readSheet(exportsDir, fileName) {
  const resolved = resolveExport(exportsDir, fileName);
  if (resolved !== fileName) {
    console.log(`  (resolved ${fileName} → ${resolved})`);
  }
  const wb = XLSX.readFile(path.join(exportsDir, resolved), { cellDates: true });
  return XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {
    header: 1,
    defval: null,
    raw: true,
  });
}

// SQL-escape a value. Returns a literal SQL fragment (quoted if string).
export function q(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return 'NULL';
    return String(v);
  }
  if (v instanceof Date) {
    if (isNaN(v.getTime())) return 'NULL';
    return `'${v.toISOString()}'`;
  }
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

// Normalize a phone per DATA_DISCOVERY_REPORT §4.
// REC-007 (D-7) corrupt-phone fix-and-import: SPEC text said "12-digit starts
// with 972". Inspection of Tier_2 rows 222 and 710 found:
//   row 222 = 9720528088322 (13 digits, leading 972)
//   row 710 = 526411712972  (12 digits, *trailing* 972)
// Encoded broader fix below. SPEC delta logged in §14 Δ-7.
export function normalizePhone(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  let s = String(raw).trim();
  if (s === 'Phone Number' || s === 'טלפון' || s === 'שם מלא') return null;
  s = s.replace(/\D/g, '');
  if (s.length === 0) return null;
  if (s.length === 12 && s.startsWith('972')) return '+' + s;
  if (s.length === 9 && s.startsWith('5')) return '+972' + s;
  if (s.length === 10 && s.startsWith('05')) return '+972' + s.slice(1);
  if (s.length === 13 && s.startsWith('972')) return normalizePhone(s.slice(3));
  if (s.length === 12 && s.endsWith('972')) return normalizePhone(s.slice(0, -3));
  return null;
}

export function toDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

export function toISODate(v) {
  const d = toDate(v);
  if (!d) return null;
  // Compensate UTC ↔ local-midnight drift on event dates.
  const shifted = new Date(d.getTime() + 6 * 3600 * 1000);
  return shifted.toISOString().slice(0, 10);
}

export function toISOTimestamp(v) {
  const d = toDate(v);
  return d ? d.toISOString() : null;
}

export function nonNullCount(row) {
  return row.filter((c) => c !== null && c !== '').length;
}

export function trimOrNull(v) {
  if (v === null || v === undefined) return null;
  if (v instanceof Date) {
    return isNaN(v.getTime()) ? null : v.toISOString();
  }
  const s = String(v).trim();
  return s === '' ? null : s;
}

export function lower(v) {
  const s = trimOrNull(v);
  return s === null ? null : s.toLowerCase();
}

export function makeSkipLogger(skippedArray) {
  return function logSkip(file, rowIndex, reason, row) {
    skippedArray.push({
      file,
      row_index: rowIndex,
      reason,
      row: row
        ? row.slice(0, 8).map((c) => (c instanceof Date ? c.toISOString() : c))
        : null,
    });
  };
}

// Status-string lookup tables (Hebrew → canonical Optic Up enum).
export const eventStatusMap = {
  'Completed': 'completed',
  'Closed': 'closed',
  'Registration Open': 'registration_open',
};

export const leadStatusMap = {
  'ממתין לאירוע': 'waiting',
  'ביטל Unsubscribe': 'unsubscribed',
  'הוזמן לאירוע': 'invited',
  'לא מעוניין': 'not_interested',
};

export const attendeeStatusMap = {
  'הגיע': 'attended',
  'אישר': 'confirmed',
  'ביטל': 'cancelled',
  'כבר נרשם': 'duplicate',
  'חדש': 'registered',
  'רשימת המתנה': 'waiting_list',
  'לא הגיע': 'no_show',
  'אירוע נסגר': 'event_closed',
  'הגיע ולא קנה': 'attended', // with purchase_amount = NULL
};

export function mapHebrewLang(v) {
  if (v === 'עברית') return 'he';
  if (v === 'רוסית') return 'ru';
  return null;
}

// REC-006 (D-6) eye-exam answer mapping.
export function mapEyeExamDefault(raw) {
  const v = trimOrNull(raw);
  if (!v) return null;
  if (v === 'כן') return 'כן, בדיקה רגילה';
  if (v === 'לא') return 'לא, אין צורך בבדיקה';
  return v; // pass-through for non-canonical values
}
