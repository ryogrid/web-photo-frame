import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'favorites.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS prefixes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prefix TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prefix_id INTEGER NOT NULL REFERENCES prefixes(id),
      directory TEXT NOT NULL,
      filename TEXT NOT NULL,
      UNIQUE(prefix_id, directory, filename)
    );

    CREATE TABLE IF NOT EXISTS favorite_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prefix_id INTEGER NOT NULL UNIQUE REFERENCES prefixes(id),
      state TEXT NOT NULL CHECK(state IN ('favorite', 'oldfav'))
    );
  `);

  return db;
}

// Extract prefix from filename: everything before the first hyphen, trimmed.
// If no hyphen, the entire basename (minus extension) is the prefix.
export function extractPrefix(filename: string): string {
  // Remove directory path if present, keep just the filename
  const basename = path.basename(filename);
  const nameWithoutExt = basename.replace(/\.[^/.]+$/, '');
  const hyphenIndex = nameWithoutExt.indexOf('-');
  if (hyphenIndex !== -1) {
    return nameWithoutExt.substring(0, hyphenIndex).trim();
  }
  return nameWithoutExt.trim();
}

export function getPrefixId(database: Database.Database, prefix: string): number {
  const row = database.prepare('SELECT id FROM prefixes WHERE prefix = ?').get(prefix) as { id: number } | undefined;
  if (row) return row.id;
  const result = database.prepare('INSERT INTO prefixes (prefix) VALUES (?)').run(prefix);
  return Number(result.lastInsertRowid);
}

export function getPrefixById(database: Database.Database, id: number): string | undefined {
  const row = database.prepare('SELECT prefix FROM prefixes WHERE id = ?').get(id) as { prefix: string } | undefined;
  return row?.prefix;
}

export function upsertFavoriteState(database: Database.Database, prefix: string, state: 'favorite' | 'oldfav'): void {
  const prefixId = getPrefixId(database, prefix);
  database.prepare(`
    INSERT INTO favorite_state (prefix_id, state) VALUES (?, ?)
    ON CONFLICT(prefix_id) DO UPDATE SET state = excluded.state
  `).run(prefixId, state);
}

export function getFavoriteState(database: Database.Database, prefix: string): 'favorite' | 'oldfav' | null {
  const row = database.prepare(`
    SELECT s.state FROM favorite_state s
    JOIN prefixes p ON p.id = s.prefix_id
    WHERE p.prefix = ?
  `).get(prefix) as { state: 'favorite' | 'oldfav' } | undefined;
  return row?.state ?? null;
}

export function getPrefixStates(database: Database.Database): Record<string, 'favorite' | 'oldfav'> {
  const rows = database.prepare(`
    SELECT p.prefix, s.state FROM favorite_state s
    JOIN prefixes p ON p.id = s.prefix_id
  `).all() as { prefix: string; state: 'favorite' | 'oldfav' }[];
  const result: Record<string, 'favorite' | 'oldfav'> = {};
  for (const row of rows) {
    result[row.prefix] = row.state;
  }
  return result;
}

export function insertImage(database: Database.Database, prefix: string, directory: string, filename: string): void {
  const prefixId = getPrefixId(database, prefix);
  database.prepare(`
    INSERT OR IGNORE INTO images (prefix_id, directory, filename) VALUES (?, ?, ?)
  `).run(prefixId, directory, filename);
}

export function getImagesByState(
  database: Database.Database,
  state: 'favorite' | 'oldfav',
  limit?: number,
  offset?: number
): { images: Array<{ src: string; alt: string; filename: string; prefix: string }>; total: number } {
  const countRow = database.prepare(`
    SELECT COUNT(*) as count
    FROM images i
    JOIN prefixes p ON p.id = i.prefix_id
    JOIN favorite_state s ON s.prefix_id = p.id
    WHERE s.state = ?
  `).get(state) as { count: number };

  const rows = database.prepare(`
    SELECT i.directory, i.filename, p.prefix
    FROM images i
    JOIN prefixes p ON p.id = i.prefix_id
    JOIN favorite_state s ON s.prefix_id = p.id
    WHERE s.state = ?
    ORDER BY p.prefix, i.directory, i.filename
    ${limit != null ? 'LIMIT ?' : ''}
    ${offset != null ? 'OFFSET ?' : ''}
  `);

  const bindParams: unknown[] = [state];
  if (limit != null) bindParams.push(limit);
  if (offset != null) bindParams.push(offset);

  const rowsResult = rows.all(...bindParams) as Array<{ directory: string; filename: string; prefix: string }>;

  return {
    images: rowsResult.map((row) => ({
      src: `/api/fast-pictures/${row.directory}/${row.filename}`,
      alt: row.filename.replace(/\.[^/.]+$/, ''),
      filename: row.filename,
      prefix: row.prefix,
    })),
    total: countRow.count,
  };
}

// Close the database connection (useful for worker processes)
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

// Seeded PRNG (mulberry32) for deterministic shuffle
function mulberry32(seed: number): () => number {
  return function() {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getImagesByStateShuffled(
  database: Database.Database,
  state: 'favorite' | 'oldfav',
  seed: number,
  limit: number,
  offset: number
): { images: Array<{ src: string; alt: string; filename: string; prefix: string }>; total: number } {
  const allRows = database.prepare(`
    SELECT i.directory, i.filename, p.prefix
    FROM images i
    JOIN prefixes p ON p.id = i.prefix_id
    JOIN favorite_state s ON s.prefix_id = p.id
    WHERE s.state = ?
  `).all(state) as Array<{ directory: string; filename: string; prefix: string }>;

  const shuffled = seededShuffle(allRows, seed);
  const page = shuffled.slice(offset, offset + limit);

  return {
    images: page.map((row) => ({
      src: `/api/fast-pictures/${row.directory}/${row.filename}`,
      alt: row.filename.replace(/\.[^/.]+$/, ''),
      filename: row.filename,
      prefix: row.prefix,
    })),
    total: allRows.length,
  };
}
