// Standalone worker process for scanning directories and populating the favorites database.
// Invoked via: node dist/favorite-worker.js --prefix "..." --picturesDir "..."

import { getDatabase, extractPrefix, getPrefixId, insertImage, upsertFavoriteState, closeDatabase } from './database.js';
import fs from 'fs';
import path from 'path';

function parseArgs(): { prefix: string; picturesDir: string } {
  const args = process.argv.slice(2);
  let prefix = '';
  let picturesDir = '';

  for (const arg of args) {
    if (arg.startsWith('--prefix=')) {
      prefix = arg.slice('--prefix='.length);
    } else if (arg.startsWith('--picturesDir=')) {
      picturesDir = arg.slice('--picturesDir='.length);
    }
  }

  if (!prefix) {
    console.error(JSON.stringify({ event: 'error', message: 'Missing --prefix argument' }));
    process.exit(1);
  }

  if (!picturesDir) {
    // Default: relative to this script's location
    picturesDir = path.resolve(process.cwd(), '..', 'public', 'pictures');
  }

  return { prefix, picturesDir };
}

function scanDirectories(picturesDir: string, targetPrefix: string): number {
  const db = getDatabase();
  const prefixId = getPrefixId(db, targetPrefix);

  if (!fs.existsSync(picturesDir)) {
    console.error(JSON.stringify({ event: 'error', message: `Pictures directory not found: ${picturesDir}` }));
    process.exit(1);
  }

  const directories = fs.readdirSync(picturesDir, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  let totalMatched = 0;

  for (const dir of directories) {
    const dirPath = path.join(picturesDir, dir);
    const files = fs.readdirSync(dirPath, { withFileTypes: true })
      .filter((dirent) => dirent.isFile())
      .map((dirent) => dirent.name);

    for (const file of files) {
      // Only process image files
      if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(file)) continue;

      const filePrefix = extractPrefix(file);
      if (filePrefix === targetPrefix) {
        insertImage(db, targetPrefix, dir, file);
        totalMatched++;
      }
    }
  }

  // Set favorite state after all images are inserted
  upsertFavoriteState(db, targetPrefix, 'favorite');

  return totalMatched;
}

try {
  const { prefix, picturesDir } = parseArgs();
  const imageCount = scanDirectories(picturesDir, prefix);
  console.log(JSON.stringify({ event: 'complete', prefix, imageCount }));
  closeDatabase();
  process.exit(0);
} catch (err) {
  console.error(JSON.stringify({
    event: 'error',
    message: err instanceof Error ? err.message : String(err),
  }));
  closeDatabase();
  process.exit(1);
}
