# Optic Up — Storefront

Public-facing storefront for Optic Up tenants. Auto-syncs with ERP inventory.

## Stack

- **Astro 6** + TypeScript + Tailwind CSS 4
- **Vercel** — deployment + CDN
- **Supabase** — read-only Views (never queries tables directly)

## Setup

```bash
npm install
cp .env.example .env
# Fill in Supabase anon key in .env
npm run dev
```

## Commands

| Command           | Action                                       |
| :---------------- | :------------------------------------------- |
| `npm install`     | Install dependencies                         |
| `npm run dev`     | Start local dev server at `localhost:4321`    |
| `npm run build`   | Build production site to `./dist/`           |
| `npm run preview` | Preview build locally before deploying       |

## Architecture

- Tenant resolution: URL slug → Supabase `tenants` + `storefront_config`
- Products: queried from `v_storefront_products` View
- i18n: Hebrew (RTL), English, Russian
- Theme: injected from `storefront_config.theme` as CSS variables

## SQL Setup

SQL files in `sql/` must be run manually in Supabase SQL Editor:
1. `001-seed-storefront-config.sql` — seed Prizma storefront config
2. `002-v-storefront-products.sql` — create product/category Views (requires Phase 2 columns)
