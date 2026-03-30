# Phase 1 — Astro Setup + Infrastructure

> **Module:** 3 — Storefront
> **Status:** ⬜ Not started
> **Execution mode:** AUTONOMOUS
> **Estimated time:** 1-2 sessions
> **Risk level:** LOW — new repo, no existing files to modify
> **Machine:** 🖥️ Windows (`C:\Users\User\`)

---

## Goal

Create a working Astro website in a new repo (`opticup-storefront`), deployed to Vercel, connected to Supabase, with tenant resolution and a basic homepage showing Prizma Optics branding.

**End result:** A live site at `opticup-storefront.vercel.app` that shows:
- Prizma Optics logo + name
- Navigation (משקפי שמש, מסגרות ראייה, מותגים, בלוג, מולטיפוקל)
- Hero section with placeholder content
- Footer with contact info
- RTL Hebrew layout
- Responsive (mobile + desktop)
- Connected to Supabase (reads storefront_config)

**WordPress stays untouched.** The live `prizma-optic.co.il` continues to run on WordPress. DNS switch happens much later.

---

## Safety Rules — NON-NEGOTIABLE

1. This phase works on a **NEW repo** (`opticup-storefront`). NOT the `opticup` repo.
2. **NEVER** touch, clone, or modify the `opticup` repo from this session.
3. **NEVER** run DROP TABLE, DELETE FROM, or TRUNCATE on Supabase.
4. **NEVER** commit `.env` files to git.
5. All Supabase access is **READ-ONLY** (anon key, public Views only).
6. SQL migrations are **saved to files only** — Daniel runs them manually in Supabase Dashboard.
7. Do NOT connect the custom domain (`prizma-optic.co.il`) — WordPress stays live.

---

## Prerequisites (Daniel has completed)

- [x] GitHub repo `OpticaLis/opticup-storefront` — created, empty, private
- [x] Vercel account — created, connected to GitHub, project `opticup-storefront` exists
- [ ] Supabase anon key — Daniel provides (already known from ERP)

---

## Stack

- **Astro 5** — static site generator with SSR capability
- **TypeScript** — type safety
- **Tailwind CSS 4** — utility-first styling
- **Supabase JS v2** — database client (read-only, anon key)
- **Vercel** — hosting, CDN, auto-deploy from GitHub

---

## Working Directory

**IMPORTANT:** This is a NEW project, separate from opticup.

```
C:\Users\User\opticup-storefront\    ← NEW directory (clone of new repo)
```

NOT `C:\Users\User\opticup\` — that's the ERP.

---

## Output Structure

```
opticup-storefront/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── tailwind.config.mjs
├── vercel.json
├── .gitignore
├── .env                              ← NEVER committed (Supabase keys)
├── .env.example                      ← Template (committed, no real values)
├── CLAUDE.md                         ← Project rules for storefront repo
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro          ← RTL, header, footer, theme, responsive
│   ├── pages/
│   │   └── index.astro               ← Homepage
│   ├── components/
│   │   ├── Header.astro              ← Logo, nav, language switcher placeholder
│   │   ├── Footer.astro              ← Contact info, social links, copyright
│   │   ├── Hero.astro                ← Hero section with CTA
│   │   └── WhatsAppButton.astro      ← Floating WhatsApp button
│   ├── lib/
│   │   ├── supabase.ts               ← Supabase client (anon key, read-only)
│   │   └── tenant.ts                 ← Tenant resolution from storefront_config
│   └── styles/
│       └── global.css                ← Tailwind directives + RTL + theme vars
├── public/
│   ├── favicon.ico                   ← Prizma favicon (placeholder)
│   └── robots.txt                    ← Basic robots.txt
└── sql/
    ├── 001-storefront-views.sql      ← Views for storefront (Daniel runs manually)
    └── 002-seed-prizma-config.sql    ← Seed storefront_config for Prizma
```

---

## Autonomous Execution Plan

### Step 1 — Clone repo, init Astro project

**Directory:** `C:\Users\User\` (create `opticup-storefront` here)
**What to do:**

1. Verify we're NOT in the opticup directory:
   ```bash
   pwd  # Must NOT be opticup
   ```

2. Clone the empty repo:
   ```bash
   cd C:/Users/User
   git clone https://github.com/OpticaLis/opticup-storefront.git
   cd opticup-storefront
   ```

3. Create Astro project (in current directory since repo already exists):
   ```bash
   npm create astro@latest . -- --template minimal --typescript strict --install --no-git
   ```
   Note: `--no-git` because git is already initialized from clone. If the command fails with "directory not empty", use `--force` or init manually.

4. Install Tailwind CSS:
   ```bash
   npx astro add tailwind -y
   ```

5. Install Supabase client:
   ```bash
   npm install @supabase/supabase-js
   ```

6. Install Astro Vercel adapter:
   ```bash
   npx astro add vercel -y
   ```

7. Verify project runs:
   ```bash
   npm run build
   ```

**Verify:**
- [ ] `opticup-storefront` directory exists at `C:\Users\User\`
- [ ] `package.json` has astro, tailwind, supabase dependencies
- [ ] `npm run build` succeeds
- [ ] NOT in the opticup ERP directory

---

### Step 2 — Configure project files

**What to do:**

1. **Update `astro.config.mjs`:**
```javascript
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  integrations: [tailwind()],
  site: 'https://opticup-storefront.vercel.app',
  i18n: {
    defaultLocale: 'he',
    locales: ['he', 'en', 'ru'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
});
```

2. **Create `.env.example`** (committed — no real values):
```
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Create `.env`** (NOT committed — real values):
```
PUBLIC_SUPABASE_URL=https://tsxrrxzmdxaenlvocyit.supabase.co
PUBLIC_SUPABASE_ANON_KEY=REPLACE_ME
```

4. **Update `.gitignore`** — ensure these are present:
```
node_modules/
dist/
.env
.env.*
!.env.example
.astro/
```

5. **Create `vercel.json`:**
```json
{
  "framework": "astro",
  "buildCommand": "npm run build",
  "outputDirectory": "dist"
}
```

6. **Create `CLAUDE.md`** for the storefront repo:
```markdown
# Optic Up Storefront — Claude Code Guide

## Project
- Optic Up Storefront — public-facing website for optical stores
- Astro + TypeScript + Tailwind CSS
- Deployed to Vercel
- Reads from Supabase (Views + RPCs only, NEVER direct table access)

## Stack
- Astro 5, TypeScript strict, Tailwind CSS 4
- Supabase JS v2 (anon key, read-only)
- Vercel (auto-deploy from main branch)

## Rules
1. NEVER access Supabase tables directly — use Views and RPCs only
2. NEVER commit .env files
3. Every component must support RTL (Hebrew default)
4. Every page must be responsive (mobile-first)
5. All text content comes from Supabase or i18n files — no hardcoded Hebrew strings in components
6. tenant_id isolation — every query must filter by tenant_id
7. File size limits: .ts/.astro files max 350 lines, .css files max 250 lines

## Branches
- main = production (auto-deploys to Vercel)
- develop = development work

## Supabase
- URL: https://tsxrrxzmdxaenlvocyit.supabase.co
- Access: anon key (public, read-only via RLS)
- Views: v_storefront_config, v_storefront_products (created in Phase 2)
```

**Verify:**
- [ ] `astro.config.mjs` has Vercel adapter + Tailwind + i18n config
- [ ] `.env.example` exists and is committed
- [ ] `.env` exists and is NOT committed
- [ ] `.gitignore` blocks .env
- [ ] `vercel.json` exists
- [ ] `CLAUDE.md` exists

---

### Step 3 — Create Supabase client + tenant resolution

**What to do:**

1. **Create `src/lib/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not set — using placeholder mode');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);
```

2. **Create `src/lib/tenant.ts`:**
```typescript
import { supabase } from './supabase';

export interface TenantConfig {
  id: string;
  tenant_id: string;
  business_name: string;
  logo_url: string | null;
  theme: Record<string, string>;
  whatsapp_number: string | null;
  booking_url: string | null;
  categories: string[];
  social_links: Record<string, string>;
  footer_text: string | null;
}

const DEFAULT_CONFIG: TenantConfig = {
  id: '',
  tenant_id: '',
  business_name: 'אופטיקה פריזמה',
  logo_url: null,
  theme: {
    primary: '#1e3a5f',
    secondary: '#ffffff',
    accent: '#c9a84c',
  },
  whatsapp_number: '972544807770',
  booking_url: 'https://yoman.co.il/Prizamaoptic',
  categories: ['משקפי שמש', 'מסגרות ראייה', 'עדשות מגע'],
  social_links: {
    facebook: 'https://facebook.com/prizmaoptic',
    instagram: 'https://instagram.com/prizma_express',
    waze: '',
  },
  footer_text: 'כל הזכויות שמורות לאופטיקה פריזמה © 2025',
};

export async function getTenantConfig(tenantSlug = 'prizma'): Promise<TenantConfig> {
  try {
    const { data, error } = await supabase
      .from('storefront_config')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .single();

    if (error || !data) {
      console.warn(`Tenant "${tenantSlug}" not found, using defaults`);
      return DEFAULT_CONFIG;
    }

    return {
      ...DEFAULT_CONFIG,
      ...data,
    };
  } catch (err) {
    console.warn('Supabase connection failed, using defaults');
    return DEFAULT_CONFIG;
  }
}

export function resolveTenantSlug(url: URL): string {
  // For now: subdomain-based resolution
  // prizma-optic.co.il → prizma
  // hadar.opticalis.co.il → hadar
  // Default: prizma
  const hostname = url.hostname;

  if (hostname.includes('prizma')) return 'prizma';
  if (hostname.endsWith('.opticalis.co.il')) {
    const subdomain = hostname.split('.')[0];
    return subdomain;
  }

  // Fallback: query param for development
  const param = url.searchParams.get('t');
  if (param) return param;

  return 'prizma';
}
```

**Verify:**
- [ ] `src/lib/supabase.ts` — valid TypeScript, handles missing env vars
- [ ] `src/lib/tenant.ts` — valid TypeScript, has fallback defaults, under 350 lines
- [ ] `npm run build` still succeeds

---

### CHECKPOINT — Steps 1-3

Commit and push:
```bash
git add -A
git status  # Verify no .env
git commit -m "Phase 1 Steps 1-3: Astro project + Supabase client + tenant resolution"
git push -u origin main
```

Verify Vercel auto-deploys (may still fail — that's OK at this stage).

---

### Step 4 — Create global styles + RTL support

**What to do:**

1. **Create `src/styles/global.css`:**
```css
@import 'tailwindcss';

/* RTL Support */
html {
  direction: rtl;
}

html[dir="ltr"] {
  direction: ltr;
}

/* Theme CSS Variables — loaded from tenant config */
:root {
  --color-primary: #1e3a5f;
  --color-secondary: #ffffff;
  --color-accent: #c9a84c;
  --color-bg: #f8f9fa;
  --color-text: #1a1a2e;
  --color-text-muted: #6b7280;
  --color-border: #e5e7eb;
  --font-primary: 'Heebo', 'Arial', sans-serif;
}

/* Base Typography */
body {
  font-family: var(--font-primary);
  color: var(--color-text);
  background-color: var(--color-bg);
  line-height: 1.7;
}

/* Smooth scrolling */
html {
  scroll-behavior: smooth;
}

/* Focus styles for accessibility */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Link styles */
a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.2s;
}

a:hover {
  color: var(--color-accent);
}
```

2. **Update `tailwind.config.mjs`** (if it exists — Astro may auto-create it):
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
      },
      fontFamily: {
        primary: ['Heebo', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

**Verify:**
- [ ] `global.css` under 250 lines
- [ ] RTL direction set
- [ ] CSS variables defined
- [ ] `npm run build` succeeds

---

### Step 5 — Create Header component

**What to do:**

Create `src/components/Header.astro`:

A responsive, RTL header with:
- Logo placeholder (text "אופטיקה פריזמה" for now)
- Navigation links: משקפי שמש, מסגרות ראייה, מותגים, בלוג, משקפי מולטיפוקל, מעבדת מסגורים
- Mobile hamburger menu (CSS-only or minimal JS)
- Booking CTA button: "תיאום בדיקת ראיה" (links to yoman.co.il)
- Sticky on scroll

Props:
```typescript
interface Props {
  businessName?: string;
  bookingUrl?: string;
}
```

Design:
- Background: white
- Text: dark blue (`var(--color-primary)`)
- CTA button: accent color (`var(--color-accent)`)
- Height: ~70px desktop, ~60px mobile
- Shadow on scroll
- Mobile: hamburger icon, slide-in menu from right (RTL)

**Verify:**
- [ ] File under 350 lines
- [ ] RTL layout works
- [ ] Mobile hamburger menu works
- [ ] All nav links present

---

### Step 6 — Create Footer component

**What to do:**

Create `src/components/Footer.astro`:

Footer with:
- Business name + address (הרצל 32, אשקלון)
- Phone: 08-6751313
- WhatsApp link
- Social links (Facebook, Instagram, Waze)
- Copyright text
- Opening hours section

Props:
```typescript
interface Props {
  businessName?: string;
  phone?: string;
  address?: string;
  whatsappNumber?: string;
  socialLinks?: Record<string, string>;
  footerText?: string;
}
```

Design:
- Background: dark blue (`var(--color-primary)`)
- Text: white
- Links: accent color on hover
- Responsive: 3 columns on desktop, stacked on mobile

**Verify:**
- [ ] File under 350 lines
- [ ] RTL layout
- [ ] All contact info present
- [ ] Responsive

---

### CHECKPOINT — Steps 4-6

Commit and push.

---

### Step 7 — Create Hero + WhatsApp components

**What to do:**

1. **Create `src/components/Hero.astro`:**

Hero section for homepage:
- Large heading: "האופטיקה המובילה בדרום משנת 1985"
- Subheading: "40 שנות ניסיון, מותגים מובילים, שירות אישי"
- CTA button: "תיאום בדיקת ראיה" → booking URL
- Secondary CTA: "דברו איתנו בוואטסאפ" → WhatsApp
- Background: gradient or solid primary color
- Responsive layout

2. **Create `src/components/WhatsAppButton.astro`:**

Floating WhatsApp button (bottom-left in RTL):
- Green circle with WhatsApp icon (SVG)
- Fixed position
- Links to `https://wa.me/972544807770`
- Hover animation (slight scale)
- Always visible

**Verify:**
- [ ] Hero renders with correct Hebrew text
- [ ] WhatsApp button is fixed position, bottom-left
- [ ] Both under 350 lines each

---

### Step 8 — Create BaseLayout + Homepage

**What to do:**

1. **Create `src/layouts/BaseLayout.astro`:**

Full page layout:
- HTML lang="he" dir="rtl"
- `<head>`: meta charset, viewport, title, description, Google Fonts (Heebo), global.css
- `<body>`: Header + `<slot />` + Footer + WhatsAppButton
- OG meta tags (basic)
- Favicon link

Props:
```typescript
interface Props {
  title: string;
  description?: string;
}
```

2. **Update `src/pages/index.astro`:**

Homepage using BaseLayout:
- Hero section
- "למה אנחנו?" section with 4 feature cards:
  - 40 שנות ניסיון
  - מגוון מותגים נרחב
  - מבצעים משתלמים
  - שליח עד הבית חינם
- "תהליך הכנת המשקפיים" section (6 steps — text only, from current WP site)
- CTA section at bottom

3. **Create `public/robots.txt`:**
```
User-agent: *
Disallow: /api/
Allow: /

Sitemap: https://opticup-storefront.vercel.app/sitemap.xml
```

4. **Create `public/favicon.ico`:** Use a simple placeholder (1x1 pixel or Astro default).

**Verify:**
- [ ] Homepage renders with all sections
- [ ] Header + Footer + WhatsApp button visible
- [ ] RTL layout correct
- [ ] Page title shows "אופטיקה פריזמה"
- [ ] `npm run build` succeeds

---

### Step 9 — SQL migrations (save to files, do NOT run)

**What to do:**

Create SQL files that Daniel will run manually in Supabase Dashboard.

1. **Create `sql/001-storefront-views.sql`:**
```sql
-- View: storefront_config for public access
CREATE OR REPLACE VIEW v_storefront_config AS
SELECT
  sc.id,
  sc.tenant_id,
  t.slug AS tenant_slug,
  t.name AS business_name,
  sc.logo_url,
  sc.theme,
  sc.whatsapp_number,
  sc.booking_url,
  sc.categories,
  sc.social_links,
  sc.footer_text,
  sc.seo_defaults,
  sc.analytics
FROM storefront_config sc
JOIN tenants t ON t.id = sc.tenant_id
WHERE t.is_deleted = false;

-- RLS: Allow anon users to read storefront config
ALTER VIEW v_storefront_config OWNER TO authenticated;
GRANT SELECT ON v_storefront_config TO anon;
```

NOTE: The exact column names depend on what exists in `storefront_config` from Module 2. The SQL may need adjustment based on actual schema. Mark as DECISION_NEEDED if columns don't match.

2. **Create `sql/002-seed-prizma-config.sql`:**
```sql
-- Check if storefront_config already has a row for Prizma
-- If not, insert one. If yes, update it.
-- Prizma tenant_id: get from tenants table where slug='prizma'

INSERT INTO storefront_config (
  tenant_id,
  logo_url,
  theme,
  whatsapp_number,
  booking_url,
  categories,
  social_links,
  footer_text,
  seo_defaults
)
SELECT
  id AS tenant_id,
  NULL AS logo_url,
  '{"primary": "#1e3a5f", "secondary": "#ffffff", "accent": "#c9a84c"}'::jsonb AS theme,
  '972544807770' AS whatsapp_number,
  'https://yoman.co.il/Prizamaoptic' AS booking_url,
  '["משקפי שמש", "מסגרות ראייה", "עדשות מגע", "מולטיפוקל"]'::jsonb AS categories,
  '{"facebook": "https://facebook.com/prizmaoptic", "instagram": "https://instagram.com/prizma_express"}'::jsonb AS social_links,
  'כל הזכויות שמורות לאופטיקה פריזמה' AS footer_text,
  '{"title": "אופטיקה פריזמה - האופטיקה המובילה בדרום משנת 1985", "description": "בדיקות ראיה מקצועיות, משקפי מולטיפוקל, מסגרות ראייה ומשקפי שמש ממותגים מובילים. 40 שנות ניסיון."}'::jsonb AS seo_defaults
FROM tenants
WHERE slug = 'prizma'
ON CONFLICT (tenant_id) DO UPDATE SET
  theme = EXCLUDED.theme,
  whatsapp_number = EXCLUDED.whatsapp_number,
  booking_url = EXCLUDED.booking_url,
  categories = EXCLUDED.categories,
  social_links = EXCLUDED.social_links,
  footer_text = EXCLUDED.footer_text,
  seo_defaults = EXCLUDED.seo_defaults;
```

NOTE: These SQL files are **saved in the repo for reference only**. Daniel runs them manually in Supabase Dashboard SQL Editor. Claude Code does NOT have Supabase admin access from this repo.

**Verify:**
- [ ] `sql/001-storefront-views.sql` exists and is valid SQL
- [ ] `sql/002-seed-prizma-config.sql` exists and is valid SQL
- [ ] SQL files clearly marked as "run manually"
- [ ] No actual DB operations performed by Claude Code

---

### CHECKPOINT — Steps 7-9

Commit and push.

---

### Step 10 — Test build + deploy, verify Vercel

**What to do:**

1. Final build test:
   ```bash
   npm run build
   ```
   Must succeed with zero errors.

2. Push to main (triggers Vercel deploy):
   ```bash
   git add -A
   git status  # No .env
   git commit -m "Phase 1 complete: Astro storefront with layout, homepage, Supabase client"
   git push origin main
   ```

3. Wait 60 seconds, then check if Vercel deploy succeeded. If Claude Code can't check Vercel directly, document: "Daniel should verify at vercel.com that deploy succeeded."

4. Create develop branch:
   ```bash
   git checkout -b develop
   git push -u origin develop
   ```

**Verify:**
- [ ] `npm run build` — zero errors
- [ ] Pushed to main
- [ ] Develop branch created and pushed
- [ ] `.env` NOT in git

---

### Step 11 — Final documentation

**What to do:**

1. Update/verify CLAUDE.md is complete
2. Create `docs/SESSION_CONTEXT.md` with all steps ✅
3. Create `docs/MODULE_MAP.md` listing all files
4. Create `docs/CHANGELOG.md`

5. Final commit on develop:
   ```bash
   git add -A
   git commit -m "Phase 1 docs: SESSION_CONTEXT, MODULE_MAP, CHANGELOG"
   git push
   ```

6. Merge to main:
   ```bash
   git checkout main
   git merge develop
   git push
   git checkout develop
   ```

7. Git tag:
   ```bash
   git tag v3.1-phase1-astro-setup -m "Phase 1: Astro setup + infrastructure"
   git push origin v3.1-phase1-astro-setup
   ```

**Verify:**
- [ ] All 11 steps ✅
- [ ] Vercel shows successful deploy (or Daniel verifies)
- [ ] Develop branch exists
- [ ] Tag created
- [ ] `.env` never committed

---

## Autonomous Rules

- Checkpoint every 3 steps
- BLOCKED after 3 attempts → document, skip
- DECISION_NEEDED → document, choose simpler option
- This is a **NEW repo** — do NOT cd into opticup or modify ERP files
- SQL files are saved but NOT executed
- Before EVERY commit: verify `.env` not in git
- All work starts from `C:\Users\User\opticup-storefront\`

## IMPORTANT: .env Setup

Claude Code creates `.env` with Supabase placeholder.

**Daniel must fill BEFORE Step 3 verification:**
```
PUBLIC_SUPABASE_URL=https://tsxrrxzmdxaenlvocyit.supabase.co
PUBLIC_SUPABASE_ANON_KEY=<get from Supabase Dashboard → Settings → API → anon public>
```

The site works WITHOUT Supabase (fallback defaults) so this is not blocking.

## Completion Checklist

- [ ] All 11 steps ✅
- [ ] Site builds with `npm run build`
- [ ] Vercel deploy succeeds
- [ ] Homepage shows Hebrew content with RTL
- [ ] Header has navigation links
- [ ] Footer has contact info
- [ ] WhatsApp button visible
- [ ] Mobile responsive
- [ ] `.env` NOT in git
- [ ] SQL migrations saved (not executed)
- [ ] CLAUDE.md, SESSION_CONTEXT, MODULE_MAP, CHANGELOG exist
- [ ] Git tag v3.1-phase1-astro-setup created
- [ ] `develop` branch exists

## What Happens Next

1. Daniel runs SQL migrations in Supabase Dashboard
2. Daniel fills `.env` with real Supabase anon key
3. Daniel verifies Vercel deploy at `opticup-storefront.vercel.app`
4. Phase 2 — Product Catalog (Views, product pages, category pages, search)
