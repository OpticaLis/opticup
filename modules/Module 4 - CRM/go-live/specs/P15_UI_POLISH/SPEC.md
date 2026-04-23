# SPEC — P15_UI_POLISH

> **Module:** Module 4 — CRM
> **Location:** `modules/Module 4 - CRM/go-live/specs/P15_UI_POLISH/`
> **Author:** opticup-strategic (Cowork)
> **Written:** 2026-04-23
> **Status:** READY FOR EXECUTION
> **Priority:** Pre-P7 — not a blocker, but Daniel explicitly requested

---

## 1. Goal

Polish the CRM leads table and lead detail modal per Daniel's feedback
(2026-04-23). Five changes, all UI-only, no DB changes:

1. **Remove language column** from registered leads table (everyone is Hebrew)
2. **Remove tags column** from registered leads table (confusing to staff)
3. **Add email column** to registered leads table
4. **Add eye exam field** in lead detail "פרטים" tab (extracted from `client_notes`)
5. **Add UTM panel** — collapsible section in lead detail "פרטים" tab showing
   all 6 UTM fields (source, medium, campaign, content, term, campaign_id)

---

## 2. Files Affected

| File | Changes | Current lines |
|------|---------|---------------|
| `modules/crm/crm-leads-tab.js` | Remove language + tags columns, add email column, update SELECT | ~307 |
| `modules/crm/crm-leads-detail.js` | Rewrite `renderFullDetails` — add eye_exam, expand UTM panel, remove language row | ~345 |

**2 files only.** No other files should be modified.

---

## 3. Detailed Changes

### Track A — Registered Leads Table (`crm-leads-tab.js`)

**A1. Update SELECT (line ~34):**
Current:
```javascript
.select('id, full_name, phone, email, city, language, status, source, client_notes, terms_approved, marketing_consent, unsubscribed_at, created_at, updated_at, tag_names, tag_colors, utm_source, utm_campaign, monday_item_id')
```
New — add missing UTM fields, keep everything else:
```javascript
.select('id, full_name, phone, email, city, language, status, source, client_notes, terms_approved, marketing_consent, unsubscribed_at, created_at, updated_at, tag_names, tag_colors, utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_campaign_id, monday_item_id')
```
Note: `language` stays in the SELECT (used by filters and detail modal) — we
just remove the TABLE COLUMN, not the data.

**A2. Remove column headers (lines ~214-215):**
Remove:
```html
<th>שפה</th>
<th>תגיות</th>
```
Add:
```html
<th>אימייל</th>
```

**A3. Remove column data cells (lines ~226-227):**
Remove:
```javascript
'<td>' + CrmHelpers.formatLanguage(r.language) + '</td>' +
'<td>' + renderTagPillsHtml(r.tag_names) + '</td>' +
```
Add:
```javascript
'<td>' + escapeHtml(r.email || '—') + '</td>' +
```

### Track B — Lead Detail Modal (`crm-leads-detail.js`)

**B1. Rewrite `renderFullDetails` function (lines ~222-243):**

The new layout for the "פרטים" tab:

```
Standard details section:
  אימייל: ...
  עיר: ...
  מקור: ...
  תנאים: ✅/—
  שיווק: ✅/❌/—
  נוצר: ...
  עודכן: ...

Eye exam section (only if client_notes contains eye_exam data):
  בדיקת עיניים: [extracted value]

UTM panel (collapsible, only if any UTM field has data):
  ▸ מידע UTM
    מקור (source): ...
    מדיום (medium): ...
    קמפיין (campaign): ...
    תוכן (content): ...
    מונח (term): ...
    מזהה קמפיין (campaign_id): ...

Tags section (kept, but only if tags exist):
  [tag pills]

Client notes section (kept, but only if has content):
  [raw text]
```

**B2. Eye exam extraction logic:**
The `lead-intake` Edge Function stores `eye_exam` inside `client_notes` as
a JSON string or plain text. The detail view should:
1. Try to parse `client_notes` as JSON
2. If it has an `eye_exam` key → display it as a separate row
3. If parsing fails → treat `client_notes` as plain text (current behavior)

**B3. UTM collapsible panel:**
Use a `<details>` + `<summary>` HTML5 element (no JS needed) for the
collapsible UTM section. Only render if at least one UTM field has data.
Show all 6 fields, with `—` for empty ones.

**B4. Remove language row:**
Remove `row('שפה', CrmHelpers.formatLanguage(lead.language))` from the
details section. Everyone is Hebrew — the row adds no value.

---

## 4. Success Criteria

| # | Criterion | Expected |
|---|-----------|----------|
| 1 | Registered leads table columns | שם, טלפון, אימייל, עיר, סטטוס, מקור, תאריך (7 columns). No שפה, no תגיות. |
| 2 | Email column shows data | Email from DB or `—` for empty |
| 3 | Lead detail "פרטים" tab: no language row | No "שפה:" row visible |
| 4 | Lead detail "פרטים" tab: eye_exam row | Shows extracted eye_exam value if present in client_notes |
| 5 | Lead detail "פרטים" tab: UTM panel | Collapsible panel with 6 UTM fields, only visible when data exists |
| 6 | `wc -l modules/crm/crm-leads-tab.js` | ≤ 310 (removing 2 cols, adding 1 — net ~same) |
| 7 | `wc -l modules/crm/crm-leads-detail.js` | ≤ 350 (adding ~15 lines for UTM panel, removing language row) |
| 8 | `git diff --stat` | 2 files changed |
| 9 | Zero new console errors on `localhost:3000/crm.html?t=demo` | 0 |
| 10 | Zero new console errors on `localhost:3000/crm.html?t=prizma` | 0 |
| 11 | Incoming tab unchanged | No visual or functional change to incoming tab |

---

## 5. Autonomy Envelope

**MAXIMUM AUTONOMY.** All changes are explicit. No strategic decisions needed.

---

## 6. Stop-on-Deviation Triggers

1. Any file other than `crm-leads-tab.js` or `crm-leads-detail.js` needs changes
2. Either file exceeds 350 lines after edits
3. Console errors appear after the changes
4. `crm-leads-detail.js` is above 345 lines at session start (may need a
   split before adding the UTM panel — stop and report)

---

## 7. Out of Scope

- No changes to incoming tab (`crm-incoming-tab.js`)
- No changes to lead filters (`crm-lead-filters.js`)
- No changes to lead modals (`crm-lead-modals.js`)
- No DB changes (no DDL, no schema, no views)
- No changes to Edge Functions
- No tags feature removal from the system — just from the table column.
  Tags still appear in lead detail and can be managed elsewhere.
- No internationalization changes

---

## 8. Expected Final State

```
modules/crm/crm-leads-tab.js     — ≤310 lines, language+tags cols removed, email col added, SELECT updated
modules/crm/crm-leads-detail.js  — ≤350 lines, language row removed, eye_exam extracted, UTM panel added
```

One commit:
```
feat(crm): polish leads table and detail — email col, eye_exam, UTM panel

Per Daniel's feedback (2026-04-23):
- Registered leads table: remove language and tags columns, add email column
- Lead detail: remove language row, extract eye_exam from client_notes,
  add collapsible UTM panel with all 6 fields
```

---

## 9. Rollback Plan

Revert the single commit. Two files.

---

## 10. Commit Plan

Single commit with the message from §8.

---

## 11. Lessons Already Incorporated

- **From P13 FOREMAN_REVIEW:** verified current file sizes before setting
  line-count criteria. `crm-leads-detail.js` at 345 is dangerously close to
  350 — the SPEC accounts for this in stop-trigger #4.
- **Cross-Reference Check completed 2026-04-23:** no new globals, no new
  functions, no name collisions. 0 hits.

---

*End of SPEC — P15_UI_POLISH*
