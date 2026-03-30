/**
 * Phase 3B — Fetch Blog Content from WordPress REST API
 * Downloads actual HTML content for all blog posts.
 *
 * Run: npx tsx scripts/seo/fetch-blog-content.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, 'output');
mkdirSync(OUTPUT_DIR, { recursive: true });

const WP_API_BASE = 'https://prizma-optic.co.il/wp-json/wp/v2';
const EN_API_BASE = 'https://en.prizma-optic.co.il/wp-json/wp/v2';
const RU_API_BASE = 'https://ru.prizma-optic.co.il/wp-json/wp/v2';

interface WpApiPost {
  id: number;
  slug: string;
  title: { rendered: string };
  content: { rendered: string };
  excerpt: { rendered: string };
  date: string;
  modified: string;
  categories: number[];
  featured_media: number;
  _embedded?: any;
}

async function fetchAllPosts(apiBase: string, lang: string): Promise<WpApiPost[]> {
  const posts: WpApiPost[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    try {
      const url = `${apiBase}/posts?per_page=${perPage}&page=${page}&_fields=id,slug,title,content,excerpt,date,modified,categories,featured_media&_embed=wp:featuredmedia`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'OpticUp-Migration/1.0' },
        signal: AbortSignal.timeout(30000),
      });

      if (!res.ok) {
        if (res.status === 400) break; // No more pages
        console.log(`  ${lang} page ${page}: HTTP ${res.status}`);
        break;
      }

      const data: WpApiPost[] = await res.json();
      if (data.length === 0) break;

      posts.push(...data);
      console.log(`  ${lang} page ${page}: ${data.length} posts (total: ${posts.length})`);

      const totalPages = parseInt(res.headers.get('x-wp-totalpages') || '1');
      if (page >= totalPages) break;

      page++;
      await new Promise(r => setTimeout(r, 200)); // Rate limit
    } catch (err: any) {
      console.log(`  ${lang} page ${page} error: ${err.message}`);
      break;
    }
  }

  return posts;
}

function cleanHtml(html: string, imageMapping: Map<string, string>): string {
  let cleaned = html;

  // Remove WordPress shortcodes
  cleaned = cleaned.replace(/\[caption[^\]]*\](.*?)\[\/caption\]/gs, '$1');
  cleaned = cleaned.replace(/\[gallery[^\]]*\]/g, '');
  cleaned = cleaned.replace(/\[\/?[a-zA-Z_]+[^\]]*\]/g, '');

  // Replace WordPress image URLs with local paths
  for (const [wpUrl, localPath] of imageMapping) {
    cleaned = cleaned.replace(new RegExp(escapeRegex(wpUrl), 'g'), localPath);
  }

  // Remove WordPress-specific classes
  cleaned = cleaned.replace(/\s*class="wp-[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*class="aligncenter[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*class="alignleft[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*class="alignright[^"]*"/g, '');

  // Remove data attributes
  cleaned = cleaned.replace(/\s*data-[a-z-]+="[^"]*"/g, '');

  // Clean up srcset (not needed for static content)
  cleaned = cleaned.replace(/\s*srcset="[^"]*"/g, '');
  cleaned = cleaned.replace(/\s*sizes="[^"]*"/g, '');

  // Remove empty paragraphs
  cleaned = cleaned.replace(/<p>\s*<\/p>/g, '');

  return cleaned.trim();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
}

async function main() {
  console.log('=== Blog Content Fetcher ===\n');

  // Load image mapping
  const imageReport = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'image-download-report.json'), 'utf8'));
  const imageMapping = new Map<string, string>();
  for (const r of imageReport.results) {
    if (r.success && r.localPath) {
      imageMapping.set(r.url, r.localPath);
    }
  }
  console.log(`Image mapping: ${imageMapping.size} entries\n`);

  // Load blog mapping for metadata
  const blogMapping = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'blog-mapping.json'), 'utf8'));
  const blogMetaMap = new Map<number, any>();
  for (const m of blogMapping.mappings) {
    blogMetaMap.set(m.id, m);
  }

  // Fetch content from WordPress
  console.log('Fetching HE posts...');
  const hePosts = await fetchAllPosts(WP_API_BASE, 'he');

  console.log('\nFetching EN posts...');
  const enPosts = await fetchAllPosts(EN_API_BASE, 'en');

  console.log('\nFetching RU posts...');
  const ruPosts = await fetchAllPosts(RU_API_BASE, 'ru');

  console.log(`\nFetched: HE=${hePosts.length}, EN=${enPosts.length}, RU=${ruPosts.length}`);

  // Build blog posts data
  interface BlogPostData {
    id: number;
    slug: string;
    lang: string;
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
  }

  const allPosts: BlogPostData[] = [];

  function processPost(post: WpApiPost, lang: string): BlogPostData {
    const meta = blogMetaMap.get(post.id);
    const content = cleanHtml(post.content.rendered, imageMapping);
    const excerpt = stripHtml(post.excerpt.rendered).substring(0, 200);

    // Try to get featured image
    let featuredImage: string | null = null;
    if (meta?.seo?.ogImage) {
      const localImg = imageMapping.get(meta.seo.ogImage);
      featuredImage = localImg || null;
    }

    return {
      id: post.id,
      slug: post.slug,
      lang,
      title: post.title.rendered,
      content,
      excerpt,
      date: post.date,
      modified: post.modified,
      categories: post.categories,
      featuredImage,
      seo: {
        title: meta?.seo?.title || post.title.rendered,
        description: meta?.seo?.description || excerpt,
        ogImage: featuredImage,
      },
      wordCount: content.split(/\s+/).length,
    };
  }

  for (const post of hePosts) allPosts.push(processPost(post, 'he'));
  for (const post of enPosts) allPosts.push(processPost(post, 'en'));
  for (const post of ruPosts) allPosts.push(processPost(post, 'ru'));

  console.log(`Total processed: ${allPosts.length}`);

  // Write full content data
  writeFileSync(resolve(OUTPUT_DIR, 'blog-content.json'), JSON.stringify(allPosts, null, 2));
  console.log('Written: scripts/seo/output/blog-content.json');

  // Stats
  const byLang = { he: 0, en: 0, ru: 0 };
  allPosts.forEach(p => { byLang[p.lang as keyof typeof byLang]++; });
  console.log(`Posts by language: HE=${byLang.he}, EN=${byLang.en}, RU=${byLang.ru}`);
  console.log(`With featured images: ${allPosts.filter(p => p.featuredImage).length}`);
}

main().catch(console.error);
