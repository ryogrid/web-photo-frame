/**
 * IndexedDB utility for caching thumbnails
 */
import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'photo-frame-db';
const THUMBNAIL_STORE = 'thumbnails';
const DB_VERSION = 1;

interface ThumbnailCache {
  path: string;
  blob: Blob;
  timestamp: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * Initialize the IndexedDB database
 */
export const initDB = async (): Promise<IDBPDatabase> => {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(THUMBNAIL_STORE)) {
          const store = db.createObjectStore(THUMBNAIL_STORE, { keyPath: 'path' });
          store.createIndex('timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
};

/**
 * Store a thumbnail in the cache
 */
export const cacheThumbnail = async (path: string, blob: Blob): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(THUMBNAIL_STORE, 'readwrite');
  await tx.store.put({
    path,
    blob,
    timestamp: Date.now(),
  });
  await tx.done;
};

/**
 * Get a thumbnail from the cache
 */
export const getThumbnail = async (path: string): Promise<Blob | null> => {
  try {
    const db = await initDB();
    const result = await db.get(THUMBNAIL_STORE, path) as ThumbnailCache | undefined;
    return result?.blob || null;
  } catch (error) {
    console.error('Error getting thumbnail from cache:', error);
    return null;
  }
};

/**
 * Clear old thumbnails from the cache (older than 7 days)
 */
export const clearOldThumbnails = async (): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(THUMBNAIL_STORE, 'readwrite');
  const store = tx.store;
  
  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const index = store.index('timestamp');
  
  let cursor = await index.openCursor();
  while (cursor) {
    if (cursor.value.timestamp < oneWeekAgo) {
      await cursor.delete();
    }
    cursor = await cursor.continue();
  }
  
  await tx.done;
};
