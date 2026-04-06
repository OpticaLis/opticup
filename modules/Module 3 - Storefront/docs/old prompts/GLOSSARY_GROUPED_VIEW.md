# Fix Glossary — Grouped View (One Row Per Term)

## Context
- **Repo:** opticalis/opticup (ERP)
- **Branch:** develop
- **Machine:** Windows PC — `C:\Users\User\opticup`
- **File to fix:** `modules/storefront/studio-translation-glossary.js`

## First Action
1. `git branch` — confirm on develop
2. `git pull`
3. Read `CLAUDE.md`

---

## The Problem
Glossary currently shows a flat list — each term_he appears twice (once for EN, once for RU). This wastes space. Daniel wants ONE row per Hebrew term with EN + RU in the same row.

## Current DB Schema
Table: `translation_glossary`
- id, tenant_id, lang, term_he, term_translated, context, source, is_deleted
- UNIQUE(tenant_id, lang, term_he)
- Each Hebrew term has 2 rows: one with lang='en', one with lang='ru'

## Required Change

### Display — Grouped Table
Render a table with columns:
| עברית | אנגלית | רוסית | הקשר | פעולות |
|-------|--------|-------|------|--------|

Group rows by term_he. For each unique term_he:
- Show term_he in first column
- Show EN translation (where lang='en') in second column
- Show RU translation (where lang='ru') in third column
- Show context in fourth column (same for both langs — use whichever is available)
- Actions: edit ✏️ and delete 🗑️ buttons

### Data Loading
Fetch all glossary rows, then group client-side:
```javascript
// Fetch
const { data } = await sb.from('translation_glossary')
  .select('*')
  .eq('tenant_id', tenantId)
  .eq('is_deleted', false)
  .order('term_he');

// Group by term_he
const grouped = {};
data.forEach(row => {
  if (!grouped[row.term_he]) {
    grouped[row.term_he] = { term_he: row.term_he, context: row.context, en: '', ru: '', en_id: null, ru_id: null };
  }
  if (row.lang === 'en') {
    grouped[row.term_he].en = row.term_translated;
    grouped[row.term_he].en_id = row.id;
  }
  if (row.lang === 'ru') {
    grouped[row.term_he].ru = row.term_translated;
    grouped[row.term_he].ru_id = row.id;
  }
});
```

### Edit Modal
Click ✏️ → Modal.show({ content: ... }) with:
- term_he (read-only display)
- EN translation input (pre-filled)
- RU translation input (pre-filled)
- Context dropdown (exam, marketing, service, general, optical)
- Save button → upsert both rows (EN + RU)

### Add New Term
"+ הוסף מונח" button → Modal with:
- term_he input (required)
- EN translation input
- RU translation input
- Context dropdown
- Save → insert 2 rows (one per lang)

### Delete
🗑️ button → confirmation dialog "האם למחוק את המונח [term_he]?"
→ soft delete BOTH rows (EN + RU): set is_deleted=true where term_he=X

### Count
Header should show: "גלוסרי (X מונחים)" where X = number of unique term_he values, NOT total rows

---

## Rules
1. Do NOT rewrite the entire file from scratch — fix the render function and data loading
2. If diff > 20 lines on a single function, that's OK for a rewrite of the render — but show the diff before committing
3. Use Modal.show({ content: ... }) — NOT body:
4. max 350 lines for the file
5. Colors: gold #c9a555, black, white. No blue
6. RTL-aware: table should be dir="rtl"

---

## After completing this task
```
move "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\current prompt\GLOSSARY_GROUPED_VIEW.md" "C:\Users\User\opticup\modules\Module 3 - Storefront\docs\old prompts\"
```
