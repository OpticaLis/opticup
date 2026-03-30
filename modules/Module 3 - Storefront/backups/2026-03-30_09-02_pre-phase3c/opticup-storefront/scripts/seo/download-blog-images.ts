/**
 * Phase 3B Step 2 — Download Blog Images
 * Downloads all blog images from WordPress to public/blog/images/
 *
 * Run: npx tsx scripts/seo/download-blog-images.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, 'output');
const IMAGES_DIR = resolve(__dirname, '../../public/blog/images');
mkdirSync(IMAGES_DIR, { recursive: true });

interface ImageEntry {
  url: string;
  filename: string;
}

async function downloadImage(url: string, filepath: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'OpticUp-Migration/1.0' },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.log(`  FAIL (${response.status}): ${url}`);
      return false;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    writeFileSync(filepath, buffer);
    return true;
  } catch (err: any) {
    console.log(`  ERROR: ${url} — ${err.message}`);
    return false;
  }
}

function sanitizeFilename(filename: string): string {
  // Decode URL encoding, keep safe chars
  const decoded = decodeURIComponent(filename);
  return decoded.replace(/[^a-zA-Z0-9._-]/g, '_').toLowerCase();
}

async function main() {
  console.log('=== Blog Image Downloader ===\n');

  const imagesData = JSON.parse(readFileSync(resolve(OUTPUT_DIR, 'blog-images-to-download.json'), 'utf8'));
  const images: ImageEntry[] = imagesData.images;

  console.log(`Images to download: ${images.length}`);
  console.log(`Output directory: ${IMAGES_DIR}\n`);

  const results: { url: string; localPath: string | null; success: boolean }[] = [];
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const filename = sanitizeFilename(img.filename);
    const filepath = resolve(IMAGES_DIR, filename);

    // Skip if already downloaded
    if (existsSync(filepath)) {
      console.log(`[${i + 1}/${images.length}] SKIP (exists): ${filename}`);
      results.push({ url: img.url, localPath: `/blog/images/${filename}`, success: true });
      skipCount++;
      successCount++;
      continue;
    }

    console.log(`[${i + 1}/${images.length}] Downloading: ${filename}`);
    const success = await downloadImage(img.url, filepath);

    if (success) {
      results.push({ url: img.url, localPath: `/blog/images/${filename}`, success: true });
      successCount++;
    } else {
      results.push({ url: img.url, localPath: null, success: false });
      failCount++;
    }

    // Rate limit: 100ms delay between downloads
    if (i < images.length - 1) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`\n=== Results ===`);
  console.log(`Success: ${successCount} (${skipCount} skipped)`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${images.length}`);

  // Write report
  const report = {
    total: images.length,
    success: successCount,
    skipped: skipCount,
    failed: failCount,
    successRate: Math.round((successCount / images.length) * 1000) / 10,
    results,
  };

  writeFileSync(resolve(OUTPUT_DIR, 'image-download-report.json'), JSON.stringify(report, null, 2));
  console.log('\nWritten: scripts/seo/output/image-download-report.json');

  if (failCount > 0) {
    console.log('\nFailed downloads:');
    results.filter(r => !r.success).forEach(r => console.log(`  ${r.url}`));
  }
}

main().catch(console.error);
