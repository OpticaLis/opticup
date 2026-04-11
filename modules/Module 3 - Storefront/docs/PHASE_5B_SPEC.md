# Phase 5B — Blog System Rebuild (JSON → DB)

> **Module:** 3 — Storefront
> **Repos:** opticup (ERP — blog editor UI) AND opticup-storefront (blog display)
> **Execution mode:** AUTONOMOUS (continues from 5A if quality gate passed)
> **Depends on:** Phase 5A (ai_content table, Edge Function)
> **Created:** March 2026

---

## Objective

Migrate blog system from static JSON files to database, add AI blog post generator, and build blog editor in ERP.

**Current state:** Blog posts stored in `scripts/seo/output/blog-content.json`, read by `src/data/blog-posts.ts`. Works but not manageable.

**Target state:** Blog posts in `blog_posts` DB table, read by Storefront via View, managed in ERP with AI-assisted draft generation.

**Success = blog posts served from DB, AI can generate drafts, ERP has blog editor with draft → edit → publish flow.**

---

## Autonomous Execution Plan

### Step 0 — Backup

```powershell
$ts = Get-Date -Format "yyyy-MM-dd_HH-mm"
$backupDir = "C:\Users\User\opticup\modules\Module 3 - Storefront\backups\${ts}_pre-phase5b"
New-Item -ItemType Directory -Force -Path $backupDir
robocopy "C:\Users\User\opticup-storefront" "$backupDir\opticup-storefront" /E /XD node_modules .git dist .vercel /XF .env
robocopy "C:\Users\User\opticup" "$backupDir\opticup-erp" /E /XD node_modules .git /XF .env
```

---

### Step 1 — Database: blog_posts Table

**Repo:** opticup-storefront
**Files to create:** `sql/015-blog-posts-table.sql`

```sql
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  slug TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'he' CHECK (lang IN ('he', 'en', 'ru')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,           -- HTML content
  excerpt TEXT,
  featured_image TEXT,             -- path in public/blog/images/ or storage_path
  categories TEXT[] DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  og_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('wordpress', 'ai', 'manual')),
  translation_of UUID REFERENCES blog_posts(id),  -- links to HE version for EN/RU
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(tenant_id, slug, lang)
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blog_posts_tenant_isolation" ON blog_posts
  FOR ALL USING (tenant_id = (current_setting('request.jwt.claims', true)::json->>'tenant_id')::uuid);

-- Public view for storefront (anon key)
CREATE OR REPLACE VIEW v_storefront_blog_posts AS
SELECT
  id, tenant_id, slug, lang, title, content, excerpt,
  featured_image, categories, tags,
  seo_title, seo_description, og_image,
  status, source, translation_of,
  published_at, created_at, updated_at
FROM blog_posts
WHERE is_deleted = false
  AND status = 'published';

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_tenant_slug ON blog_posts(tenant_id, slug, lang) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(tenant_id, lang, status, published_at DESC) WHERE is_deleted = false;
```

**Verify:**
- [ ] SQL file created
- [ ] tenant_id + RLS
- [ ] UNIQUE includes tenant_id
- [ ] View filters published only

---

### Step 2 — Migrate WordPress Blog Data to DB

**Repo:** opticup-storefront
**Files to create:** `scripts/seo/migrate-blog-to-db.ts`

**What to do:**
Script that reads `scripts/seo/output/blog-content.json` and inserts all posts into `blog_posts` table.

**For each post:**
```
{
  tenant_id: prizma_tenant_id,
  slug: post.slug,
  lang: post.lang,
  title: post.title,
  content: post.content,
  excerpt: post.excerpt,
  featured_image: post.featuredImage,
  categories: post.categories,
  seo_title: post.seo.title,
  seo_description: post.seo.description,
  status: 'published',
  source: 'wordpress',
  translation_of: (link to HE version for EN/RU posts),
  published_at: post.date,
  created_at: post.date,
  updated_at: post.modified
}
```

**⛔ Script uses service role key (not anon key) to bypass RLS.**
**⛔ Script checks if posts already exist (by slug+lang+tenant_id) and skips duplicates.**

**Run:** `npx tsx scripts/seo/migrate-blog-to-db.ts`

**Verify:**
- [ ] Script runs without errors
- [ ] 143 posts inserted (58 HE + 43 EN + 42 RU)
- [ ] Translation links set correctly
- [ ] Duplicate-safe (re-running doesn't create duplicates)

---

### Step 3 — Update Storefront to Read Blog from DB

**Repo:** opticup-storefront
**Files to modify:**
- `src/data/blog-posts.ts` — rewrite to query `v_storefront_blog_posts` view
- `src/pages/[...slug].astro` — update to use new data source
- `src/pages/en/[...slug].astro` — same
- `src/pages/ru/[...slug].astro` — same
- `src/pages/בלוג.astro` — update blog index
- `src/pages/en/blog.astro` — update
- `src/pages/ru/blog.astro` — update

**New blog-posts.ts:**
```typescript
import { getSupabase } from './supabase';

export async function getAllPosts(lang: string = 'he', tenantId: string): Promise<BlogPost[]> {
  const sb = getSupabase();
  const { data } = await sb
    .from('v_storefront_blog_posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('lang', lang)
    .order('published_at', { ascending: false });
  return data ?? [];
}

export async function getPostBySlug(slug: string, lang: string, tenantId: string): Promise<BlogPost | null> {
  const sb = getSupabase();
  const { data } = await sb
    .from('v_storefront_blog_posts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('slug', slug)
    .eq('lang', lang)
    .maybeSingle();
  return data;
}
```

**⛔ IMPORTANT:** The catch-all route must still work for root-level Hebrew blog posts. Same URL structure. Same behavior. Only the data source changes (JSON → DB).

**⛔ REGRESSION:** After this change, verify:
- [ ] `/בלוג/` shows blog index with posts
- [ ] Root-level Hebrew blog post URLs still work
- [ ] `/en/blog/` works
- [ ] `/ru/blog/` works
- [ ] Blog images still load

---

### Step 4 — Edge Function: Blog Post Generator

**Repo:** opticup
**Files to create:** `supabase/functions/generate-blog-post/index.ts`

**What to do:**
Edge Function that generates a blog post draft from a topic/prompt.

**Endpoint:** `POST /functions/v1/generate-blog-post`

**Request:**
```json
{
  "tenant_id": "uuid",
  "topic": "מדריך לבחירת משקפי מולטיפוקל",
  "style": "informative",
  "target_length": "medium",
  "keywords": ["מולטיפוקל", "עדשות", "בדיקת ראייה"]
}
```

**Claude prompt:**
```
You are writing a professional blog post for an Israeli optical store website.
Topic: {topic}
Style: Informative, professional, helpful
Language: Hebrew
Length: {target_length} (short=500 words, medium=1000, long=2000)
Keywords to include: {keywords}

Output HTML content with:
- H2 headings for sections
- Paragraphs
- Lists where appropriate
- Professional tone
- Include practical advice

Also generate:
- SEO title (50-60 chars)
- SEO description (150-160 chars)
- Suggested slug (URL-friendly Hebrew)
- Suggested categories
- Excerpt (2-3 sentences)
```

**Deploy with `--no-verify-jwt`**

**Verify:**
- [ ] Edge Function deployed
- [ ] Generates blog post from topic
- [ ] Output includes content + SEO fields

---

### Step 5 — ERP: Blog Editor

**Repo:** opticup
**Files to create:** `storefront-blog.html` + `modules/storefront/storefront-blog.js`

**UI:**
```
┌─────────────────────────────────────────────────┐
│  ניהול בלוג                                      │
├─────────────────────────────────────────────────┤
│  [+ פוסט חדש]  [ייצר פוסט AI 🤖]               │
│  [סינון: טיוטה / מפורסם / ארכיון]               │
├─────────────────────────────────────────────────┤
│  סטטוס │ כותרת │ קטגוריה │ תאריך │ פעולות      │
│  🟢    │ עדשות │ עדשות   │ 30/3  │ [✏️][🗑️]   │
│  🟡    │ מולטי │ מולטי   │ 30/3  │ [✏️][🗑️]   │
└─────────────────────────────────────────────────┘
```

**Status:** 🟢 = published, 🟡 = draft, ⚫ = archived

**"ייצר פוסט AI" flow:**
1. Modal: enter topic + keywords + target length
2. Click "ייצר" → calls Edge Function
3. AI generates draft
4. Draft saved to blog_posts with status='draft'
5. User redirected to edit view

**Blog post editor (click ✏️ or "פוסט חדש"):**
```
┌─────────────────────────────────────────────────┐
│  עריכת פוסט                              [✕]   │
├─────────────────────────────────────────────────┤
│  כותרת: [________________________]              │
│  Slug: [________________________]               │
│  קטגוריות: [____________] (comma separated)     │
│                                                  │
│  תוכן:                                          │
│  ┌──────────────────────────────────────────┐   │
│  │  [B] [I] [H2] [H3] [Link] [List]       │   │
│  │                                          │   │
│  │  Rich text editor area...               │   │
│  │  (or: textarea with HTML)               │   │
│  │                                          │   │
│  └──────────────────────────────────────────┘   │
│                                                  │
│  SEO Title: [________________________] 45/60    │
│  SEO Description: [__________________] 130/160  │
│                                                  │
│  סטטוס: [טיוטה ▼]                               │
│                                                  │
│  [שמור] [תצוגה מקדימה] [פרסם]                  │
└─────────────────────────────────────────────────┘
```

**Editor approach:** Simple textarea with HTML (not a full WYSIWYG). If possible, use a lightweight markdown editor or basic toolbar. Don't over-engineer — the priority is functionality.

**Verify:**
- [ ] Blog list shows all posts
- [ ] Create new post works
- [ ] AI generate creates draft
- [ ] Edit saves to DB
- [ ] Publish changes status + sets published_at
- [ ] Delete = soft delete

---

### Step 6 — Update Documentation

**Both repos:** SESSION_CONTEXT, CHANGELOG, CLAUDE.md, ROADMAP → "5B ✅"

---

## Quality Gate

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| Blog migration | 143 posts in DB | ⛔ STOP |
| Blog pages work | /בלוג/ shows posts from DB | ⛔ STOP |
| Root-level URLs | Hebrew posts still accessible | ⛔ STOP |
| Blog editor | Create + edit + publish works | ⛔ STOP |
| AI generate | Produces blog draft | ⛔ STOP |
| Images still load | Regression check | ⛔ STOP |
| Existing pages | All curl checks 200 | ⛔ STOP |

---

## Completion Checklist

- [ ] Backup exists
- [ ] blog_posts table + view created (SQL)
- [ ] 143 posts migrated to DB
- [ ] Storefront reads blog from DB (not JSON)
- [ ] Blog editor in ERP works
- [ ] AI blog generator works
- [ ] All blog URLs still work (regression)
- [ ] Documentation updated
- [ ] Committed to `develop`, tagged `v5.0-phase5b-blog-rebuild`
