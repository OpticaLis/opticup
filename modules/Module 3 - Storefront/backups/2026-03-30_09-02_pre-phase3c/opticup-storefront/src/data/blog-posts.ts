/**
 * Blog Posts Data Module
 * Loads all blog posts from pre-fetched JSON content.
 * Used by Astro pages to render blog posts.
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface BlogPost {
  id: number;
  slug: string;
  lang: 'he' | 'en' | 'ru';
  title: string;
  content: string;
  excerpt: string;
  date: string;
  modified: string;
  categories: number[];
  featuredImage: string | null;
  seo: {
    title: string;
    description: string;
    ogImage: string | null;
  };
  wordCount: number;
  translations: {
    he: string | null;
    en: string | null;
    ru: string | null;
  };
}

let _posts: BlogPost[] | null = null;

function loadPosts(): BlogPost[] {
  if (_posts) return _posts;

  try {
    const dataPath = resolve(process.cwd(), 'scripts/seo/output/blog-content.json');
    const raw = JSON.parse(readFileSync(dataPath, 'utf8'));

    _posts = raw.map((post: any) => ({
      ...post,
      lang: post.lang as 'he' | 'en' | 'ru',
      translations: {
        he: post.lang === 'he' ? `/${post.slug}/` : null,
        en: post.lang === 'en' ? `/en/${post.slug}/` : null,
        ru: post.lang === 'ru' ? `/ru/${post.slug}/` : null,
      },
    }));

    // Link translations by matching categories + similar dates
    linkTranslations(_posts!);

    return _posts!;
  } catch {
    console.warn('Could not load blog posts data');
    _posts = [];
    return _posts;
  }
}

function linkTranslations(posts: BlogPost[]): void {
  const heMap = new Map<string, BlogPost>();
  const enMap = new Map<string, BlogPost>();
  const ruMap = new Map<string, BlogPost>();

  for (const p of posts) {
    if (p.lang === 'he') heMap.set(p.slug, p);
    else if (p.lang === 'en') enMap.set(p.slug, p);
    else if (p.lang === 'ru') ruMap.set(p.slug, p);
  }

  // Sort by date for index-based matching
  const hePosts = [...heMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const enPosts = [...enMap.values()].sort((a, b) => a.date.localeCompare(b.date));
  const ruPosts = [...ruMap.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Match by position (WPML often creates posts in same order)
  // This is a heuristic — works well for sites using WPML
  for (let i = 0; i < hePosts.length; i++) {
    const he = hePosts[i];
    const en = enPosts[i] || null;
    const ru = ruPosts[i] || null;

    he.translations.he = `/${he.slug}/`;
    if (en) {
      he.translations.en = `/en/${en.slug}/`;
      en.translations.he = `/${he.slug}/`;
      en.translations.en = `/en/${en.slug}/`;
      if (ru) en.translations.ru = `/ru/${ru.slug}/`;
    }
    if (ru) {
      he.translations.ru = `/ru/${ru.slug}/`;
      ru.translations.he = `/${he.slug}/`;
      ru.translations.ru = `/ru/${ru.slug}/`;
      if (en) ru.translations.en = `/en/${en.slug}/`;
    }
  }
}

export function getAllPosts(lang?: string): BlogPost[] {
  const posts = loadPosts();
  if (!lang) return posts;
  return posts.filter(p => p.lang === lang);
}

export function getPostBySlug(slug: string, lang: string): BlogPost | null {
  const posts = loadPosts();
  return posts.find(p => p.slug === slug && p.lang === lang) ||
         posts.find(p => decodeURIComponent(p.slug) === decodeURIComponent(slug) && p.lang === lang) ||
         null;
}

export function getPostSlugs(lang: string): string[] {
  return getAllPosts(lang).map(p => p.slug);
}

export function getRelatedPosts(post: BlogPost, max = 3): BlogPost[] {
  const posts = getAllPosts(post.lang);
  return posts
    .filter(p => p.id !== post.id && p.categories.some(c => post.categories.includes(c)))
    .slice(0, max);
}

export function getPostCategories(lang: string): { id: number; count: number }[] {
  const posts = getAllPosts(lang);
  const catMap = new Map<number, number>();
  for (const p of posts) {
    for (const c of p.categories) {
      catMap.set(c, (catMap.get(c) || 0) + 1);
    }
  }
  return [...catMap.entries()]
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count);
}
