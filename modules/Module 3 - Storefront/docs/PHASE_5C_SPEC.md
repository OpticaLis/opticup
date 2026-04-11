# Phase 5C — Landing Page AI Content + Learning System

> **Module:** 3 — Storefront
> **Repos:** opticup (ERP) AND opticup-storefront
> **Execution mode:** AUTONOMOUS (continues from 5B if quality gate passed)
> **Depends on:** Phase 5A (ai_content + corrections tables), Phase 5B (Edge Functions pattern)
> **Created:** March 2026

---

## Objective

1. AI generates content for landing pages (headlines, descriptions, CTAs)
2. Learning system: corrections feed back into AI prompts
3. ERP UI for landing page content management

**Success = AI can generate landing page content, corrections improve future output, ERP has content editor for landing pages.**

---

## Autonomous Execution Plan

### Step 0 — Backup

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase5c"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
robocopy "C:\Users\User\opticup" "$backupDir\opticup-erp" /E /XD node_modules .git /XF .env
```

---

### Step 1 — Edge Function: Landing Page Content Generator

**Repo:** opticup
**Files to create:** `supabase/functions/generate-landing-content/index.ts`

**Endpoint:** `POST /functions/v1/generate-landing-content`

**Request:**
```json
{
  "tenant_id": "uuid",
  "page_type": "campaign",
  "topic": "מבצע סופר סייל — משקפי שמש",
  "products_context": ["brand1", "brand2"],
  "tone": "promotional"
}
```

**Output:** headline, subheadline, description, CTA text, SEO title, SEO description

**Saved to ai_content** with entity_type = 'landing_page'

**Deploy with `--no-verify-jwt`**

**Verify:**
- [ ] Edge Function deployed
- [ ] Generates landing page content
- [ ] Saves to ai_content

---

### Step 2 — Learning System Implementation

**Repo:** opticup
**Modify:** `modules/storefront/storefront-content.js`

**What to do:**
When tenant edits AI-generated content and saves:

1. Original content saved to `ai_content_corrections` with `brand_id` (if product content)
2. Next time AI generates content for same brand:
   - Query corrections for that brand
   - Include up to 5 recent corrections as examples in Claude prompt
   - Prompt says: "Learn from these corrections — adopt the style and terminology the store owner prefers"

**Implementation:**
```javascript
async function getCorrectionsForBrand(tenantId, brandId) {
  const { data } = await sb.from('ai_content_corrections')
    .select('original_content, corrected_content')
    .eq('tenant_id', tenantId)
    .eq('brand_id', brandId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
    .limit(5);
  return data ?? [];
}
```

**On save in content editor:**
```javascript
async function saveContentEdit(aiContentId, originalContent, newContent, brandId) {
  // 1. Update ai_content
  await sb.from('ai_content').update({
    content: newContent,
    status: 'edited',
    updated_at: new Date().toISOString()
  }).eq('id', aiContentId);

  // 2. Save correction for learning (only if content actually changed)
  if (originalContent !== newContent) {
    await sb.from('ai_content_corrections').insert({
      tenant_id: getTenantId(),
      ai_content_id: aiContentId,
      original_content: originalContent,
      corrected_content: newContent,
      brand_id: brandId
    });
    toast('התיאור עודכן. ה-AI ילמד מהתיקון הזה 🧠');
  }
}
```

**Update Edge Function** (`generate-ai-content`) to accept and use corrections:
- Add `brand_corrections` parameter to request
- Include corrections in Claude prompt as examples
- ERP sends corrections when calling Edge Function

**Verify:**
- [ ] Edit saves correction to ai_content_corrections
- [ ] Next AI generation for same brand includes corrections in prompt
- [ ] Toast feedback to tenant

---

### Step 3 — ERP: Landing Page Content Editor

**Repo:** opticup
**Files to create:** `storefront-landing-content.html` + `modules/storefront/storefront-landing-content.js`

**What to do:**
Page for managing AI-generated landing page content.

**UI:**
- List of landing pages (from landing-pages-content.json or DB)
- Click to edit: headline, description, CTA, SEO fields
- "ייצר מחדש" button for AI regeneration
- Preview of how it looks on storefront

**Simpler than blog editor** — landing pages have less editable content (mostly headlines + CTA, not full articles).

**Verify:**
- [ ] Landing page list loads
- [ ] Edit saves to DB
- [ ] AI regeneration works

---

### Step 4 — Update Navigation

**Repo:** opticup
**Modify:** `index.html` or storefront navigation

Add links for:
- ניהול תוכן מוצרים → storefront-content.html (already from 5A)
- ניהול בלוג → storefront-blog.html (already from 5B)
- ניהול דפי נחיתה → storefront-landing-content.html (new)

Or: consolidate into a single "ניהול תוכן" page with tabs (products / blog / landing pages).

**Verify:**
- [ ] All content management pages accessible from ERP nav

---

### Step 5 — Update Documentation

**Both repos:** SESSION_CONTEXT, CHANGELOG, CLAUDE.md, ROADMAP → Phase 5: "5A ✅, 5B ✅, 5C ✅"

---

## Quality Gate

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| Landing page AI | Generates content | ⛔ STOP |
| Learning works | Corrections included in next prompt | ⚠️ Continue, flag |
| Landing editor | Edit + save works | ⛔ STOP |
| All existing pages | curl 200 | ⛔ STOP |
| Images load | Regression | ⛔ STOP |

---

## Completion Checklist

- [ ] Backup exists
- [ ] Landing page content Edge Function deployed
- [ ] Learning system: corrections → improved prompts
- [ ] ERP landing page editor works
- [ ] Navigation updated
- [ ] Documentation updated
- [ ] Committed to `develop`, tagged `v5.0-phase5c-learning-landing`
