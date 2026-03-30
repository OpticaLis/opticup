# Fix: Blog Pages Return 404 on Vercel

Context: Optic Up Storefront — Astro 6 + TypeScript + Tailwind, deployed on Vercel.
Repo: OpticaLis/opticup-storefront
Working directory: C:\Users\User\opticup-storefront
Machine: 🖥️ Windows

## ⛔ CRITICAL RULE ⛔
After EVERY deploy to main — verify ALL pages using curl. Do NOT finish until every page returns HTTP 200.

## Problem

After deploying Phase 3 (SEO Migration), ALL blog pages return "Not Found":
- `/בלוג/` → Not Found
- `/en/blog/` → Not Found
- `/ru/blog/` → Not Found
- Individual blog posts → Not Found
- Landing pages (`/משקפי-מולטיפוקל/`, `/lab/`, `/multi/`) → Not Found

Pages that DO work:
- `/` (homepage)
- `/products/`
- `/brands/`
- `/robots.txt`
- `/sitemap-index.xml`

## Likely Causes (investigate in order)

1. **Hebrew filename `גולב.astro`** — Astro/Vercel may not support Hebrew filenames for pages. Check if Vercel can resolve Unicode page filenames.

2. **Blog data JSON files not included in build** — `src/data/blog-posts.ts` reads JSON from `scripts/seo/output/`. These files might not be bundled in the Vercel deployment. Check if the data is available at build time.

3. **Landing page data JSON** — same issue: `src/data/landing-pages.ts` reads from `scripts/seo/output/landing-pages-content.json`. Check if file exists at build time.

4. **Catch-all route `[...slug].astro`** — might have a runtime error that results in 404 instead of the page. Check Vercel function logs.

5. **Build output** — check if the blog/landing routes are included in Vercel build output.

## Steps

### Step 1 — Setup
```bash
cd C:/Users/User/opticup-storefront
git checkout develop
git pull origin develop
```
Read CLAUDE.md, SESSION_CONTEXT.md.

### Step 2 — Local test first
```bash
npm run dev
```
Open http://localhost:4321/בלוג/ in browser. Does it work locally?
Open http://localhost:4321/en/blog/ — works?
Open http://localhost:4321/lab/ — works?

### Step 3 — Check build
```bash
npm run build
```
Check for errors. Look at the build output — are blog routes listed?

### Step 4 — Investigate and fix each issue found

**If Hebrew filename doesn't work:**
- Rename `src/pages/גולב.astro` → handle `/בלוג/` via the catch-all `[...slug].astro` instead
- Add blog index detection in catch-all: if slug === 'בלוג' → render blog index

**If JSON data files not found at build time:**
- Move the JSON data to `src/data/` directory (bundled by Astro)
- Or change imports to use relative paths that work in both dev and build

**If catch-all has runtime errors:**
- Add try/catch and logging
- Check Vercel function logs for errors

### Step 5 — Test fix locally
```bash
npm run build && npm run preview
```
Verify all blog URLs work in preview mode.

### Step 6 — Deploy and verify
```bash
git add -A
git commit -m "Fix: blog pages 404 on Vercel — [describe fix]"
git push origin develop
git checkout main && git merge develop && git push origin main && git checkout develop
```
Wait 2 minutes for Vercel to deploy, then verify EVERY page using curl:

```bash
# Must return HTTP 200 (not 404):
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/products/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/brands/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/%D7%91%D7%9C%D7%95%D7%92/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/en/blog/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/ru/blog/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/lab/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/multi/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/%D7%9E%D7%A9%D7%A7%D7%A4%D7%99-%D7%9E%D7%95%D7%9C%D7%98%D7%99%D7%A4%D7%95%D7%A7%D7%9C/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/%D7%90%D7%95%D7%93%D7%95%D7%AA/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/%D7%A6%D7%95%D7%A8-%D7%A7%D7%A9%D7%A8/"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/robots.txt"
curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app/sitemap-index.xml"
```

If ANY returns 404 — investigate and fix BEFORE finishing.
ALL must return 200.

### Step 7 — Update SESSION_CONTEXT.md
Document what was broken, root cause, and how it was fixed.

Do NOT change anything unrelated to this bug. Focus only on making blog pages, blog index, and landing pages work.
