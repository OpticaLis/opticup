# SEO Parity Audit — WordPress vs Astro

Context: Optic Up Storefront — migrating from WordPress to Astro.
Repo: OpticaLis/opticup-storefront
Working directory: C:\Users\User\opticup-storefront
Machine: 🖥️ Windows

## Purpose

Before proceeding to Phase 4, we need to verify the new Astro site is an EXACT structural match of the WordPress site. Any mismatch = potential SEO ranking loss.

WordPress (LIVE): https://prizma-optic.co.il
Astro (NEW): https://opticup-storefront.vercel.app

## ⛔ RULES ⛔
- Do NOT change any page URLs
- Do NOT delete any pages or redirects
- DO fix any broken links, missing meta tags, or structural issues found
- Document EVERYTHING in a report

## Step 1 — Crawl WordPress Navigation

```bash
# Get homepage HTML and extract ALL links
curl -s "https://prizma-optic.co.il" > /tmp/wp-homepage.html

# Extract all internal links from WordPress homepage
grep -oP 'href="https?://prizma-optic\.co\.il[^"]*"' /tmp/wp-homepage.html | sort -u > /tmp/wp-links.txt

# Also extract nav menu links specifically
grep -oP '<nav[^>]*>.*?</nav>' /tmp/wp-homepage.html | grep -oP 'href="[^"]*"' | sort -u > /tmp/wp-nav-links.txt
```

Do the same for the Astro site:
```bash
curl -s "https://opticup-storefront.vercel.app" > /tmp/astro-homepage.html
grep -oP 'href="[^"]*"' /tmp/astro-homepage.html | sort -u > /tmp/astro-links.txt
```

Compare and document differences.

## Step 2 — Compare Header Navigation

Extract the EXACT menu items from WordPress header (top nav bar):
- What menu items exist? In what order?
- Do they have dropdowns/submenus?
- What are the exact URLs they link to?

Then compare with Astro Header.astro:
- Same items? Same order?
- Same URLs (adjusted for new structure)?
- Missing items?

Document: "WP has X, Astro has Y, MISSING: Z"

## Step 3 — Compare Footer

Same as Step 2 but for footer:
- Footer columns/sections
- Links in each section
- Contact info (phone, address, email)
- Social media links
- Copyright text
- WhatsApp link/button

## Step 4 — Compare Homepage Structure

Curl both homepages, extract and compare:
- Hero section: headline, subheadline, CTA button, background image
- Sections below hero: what sections exist, in what order
- Category grid: which categories, how many
- Featured products: how shown
- Any other sections (testimonials, about snippet, partners, etc.)

Document what WordPress has that Astro is missing.

## Step 5 — Meta Tags Comparison

For EACH of these pages, compare meta tags between WP and Astro:
- Homepage
- /products/ (or WP equivalent)
- One product page
- /בלוג/ (blog index)
- One blog post
- One landing page

Compare:
- <title>
- <meta name="description">
- <meta property="og:title">
- <meta property="og:description">
- <meta property="og:image">
- <link rel="canonical">
- hreflang tags

```bash
# Example for homepage
echo "=== WordPress ===" 
curl -s "https://prizma-optic.co.il" | grep -iE '<title|meta name="description|og:|hreflang|canonical' | head -20

echo "=== Astro ==="
curl -s "https://opticup-storefront.vercel.app" | grep -iE '<title|meta name="description|og:|hreflang|canonical' | head -20
```

## Step 6 — Schema.org Comparison

Extract JSON-LD from both sites:
```bash
# WordPress
curl -s "https://prizma-optic.co.il" | grep -oP '<script type="application/ld\+json">.*?</script>' 

# Astro
curl -s "https://opticup-storefront.vercel.app" | grep -oP '<script type="application/ld\+json">.*?</script>'
```

Compare: Does Astro have the same schema types as WordPress? Missing anything?

## Step 7 — Internal Links Audit

For EVERY link found on the Astro site, verify it returns 200:
```bash
# Get all internal links from Astro
curl -s "https://opticup-storefront.vercel.app" | grep -oP 'href="(/[^"]*)"' | sort -u > /tmp/astro-internal-links.txt

# Test each one
while read link; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://opticup-storefront.vercel.app${link}")
  if [ "$code" != "200" ]; then
    echo "BROKEN: ${link} → ${code}"
  fi
done < /tmp/astro-internal-links.txt
```

Also check:
- Blog posts: pick 5 random Hebrew blog post URLs, verify they work
- Landing pages: verify all 6 landing pages work
- Product pages: verify 5 random product pages work

## Step 8 — Mobile Menu

Check if the mobile menu has the same items as desktop:
```bash
# The mobile menu is usually hidden in HTML but present in source
curl -s "https://opticup-storefront.vercel.app" | grep -A 50 'mobile' | grep -oP 'href="[^"]*"' | sort -u
```

Compare with desktop nav links — they must match.

## Step 9 — Generate Audit Report

Create: `docs/SEO_PARITY_AUDIT.md`

Format:
```markdown
# SEO Parity Audit — WordPress vs Astro
Date: [date]

## Summary
- Total issues found: X
- Critical (will hurt SEO): Y
- Minor (cosmetic): Z

## Header Navigation
| Item | WordPress | Astro | Status |
|------|-----------|-------|--------|
| Home | / | / | ✅ |
| Products | /shop/ | /products/ | ✅ (redirect exists) |
| Blog | /בלוג/ | /בלוג/ | ✅ |
| ... | ... | ... | ... |

## Footer
[same format]

## Homepage Sections
| Section | WordPress | Astro | Status |
|---------|-----------|-------|--------|
| Hero | ✅ | ✅ | Match |
| Categories | ✅ | ✅ | Match |
| Testimonials | ✅ | ❌ MISSING | NEEDS FIX |

## Meta Tags
[comparison table]

## Schema.org
[comparison table]

## Broken Links
[list]

## Recommendations
1. [Critical fix]
2. [Critical fix]
3. [Minor improvement]
```

## Step 10 — Fix Critical Issues

If the audit finds critical issues (broken links, missing meta tags, missing redirects):
- Fix them immediately
- Commit: "SEO audit fix: [description]"
- Merge to main
- Verify with curl

Do NOT fix cosmetic/design issues — those belong in Design Phase.

## Step 11 — Update Documentation

- Add audit report to `docs/SEO_PARITY_AUDIT.md`
- Update SESSION_CONTEXT.md with audit results
- Commit and push

## What counts as CRITICAL (fix now):
- Broken internal links (404)
- Missing <title> or <meta description>
- Missing canonical URL
- Missing hreflang tags on pages that have translations
- Missing Schema.org that WordPress had
- Navigation items that WordPress has but Astro doesn't

## What counts as MINOR (fix in Design Phase):
- Visual differences (colors, fonts, layout)
- Different section ordering
- Missing decorative elements
- Content quality differences
