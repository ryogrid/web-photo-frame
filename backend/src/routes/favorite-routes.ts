import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { getDatabase, extractPrefix, getPrefixStates, getFavoriteState, upsertFavoriteState } from '../database.js';

const router = express.Router();

// Helper: spawn the favorite worker process
function spawnWorker(prefix: string): void {
  const picturesDir = path.resolve(process.cwd(), '..', 'public', 'pictures');

  // Try compiled JS first, fall back to ts-node for dev
  const distPath = path.resolve(process.cwd(), 'dist', 'favorite-worker.js');
  const srcPath = path.resolve(process.cwd(), 'src', 'favorite-worker.ts');

  let child;
  if (fs.existsSync(distPath)) {
    child = spawn(process.execPath, [
      distPath,
      `--prefix=${prefix}`,
      `--picturesDir=${picturesDir}`,
    ], {
      detached: true,
      stdio: 'ignore',
    });
  } else {
    // Dev mode: use ts-node
    child = spawn('npx', [
      'ts-node', '--esm',
      srcPath,
      `--prefix=${prefix}`,
      `--picturesDir=${picturesDir}`,
    ], {
      detached: true,
      stdio: 'ignore',
    });
  }

  child.unref();
}

// GET /api/favorites/prefixes - Returns all prefix -> state mappings
router.get('/favorites/prefixes', (_req, res) => {
  try {
    const db = getDatabase();
    const prefixes = getPrefixStates(db);
    res.json({ prefixes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get favorite prefixes' });
  }
});

// GET /api/favorites/status - Check state for a specific file
router.get('/favorites/status', (req, res) => {
  try {
    const { filename } = req.query;
    if (!filename || typeof filename !== 'string') {
      res.status(400).json({ error: 'Missing filename query parameter' });
      return;
    }

    const db = getDatabase();
    const prefix = extractPrefix(filename);
    const state = getFavoriteState(db, prefix);

    res.json({ prefix, state });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check favorite status' });
  }
});

// POST /api/favorites/add - Add a prefix to favorites (spawns worker)
router.post('/favorites/add', express.json(), (req, res) => {
  try {
    const { prefix } = req.body;
    if (!prefix || typeof prefix !== 'string') {
      res.status(400).json({ error: 'Missing prefix in request body' });
      return;
    }

    const db = getDatabase();
    const existingState = getFavoriteState(db, prefix);

    if (existingState === 'favorite') {
      res.json({ status: 'already_favorite', prefix });
      return;
    }

    // If was oldfav, just reactivate — no need to re-scan
    if (existingState === 'oldfav') {
      upsertFavoriteState(db, prefix, 'favorite');
      res.json({ status: 'reactivated', prefix });
      return;
    }

    // Spawn worker to scan directories
    spawnWorker(prefix);

    res.status(202).json({ status: 'started', prefix });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

// POST /api/favorites/remove - Move from favorite to oldfav
router.post('/favorites/remove', express.json(), (req, res) => {
  try {
    const { prefix } = req.body;
    if (!prefix || typeof prefix !== 'string') {
      res.status(400).json({ error: 'Missing prefix in request body' });
      return;
    }

    const db = getDatabase();
    upsertFavoriteState(db, prefix, 'oldfav');

    res.json({ status: 'ok', prefix, newState: 'oldfav' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

// POST /api/favorites/reactivate - Move from oldfav back to favorite
router.post('/favorites/reactivate', express.json(), (req, res) => {
  try {
    const { prefix } = req.body;
    if (!prefix || typeof prefix !== 'string') {
      res.status(400).json({ error: 'Missing prefix in request body' });
      return;
    }

    const db = getDatabase();
    upsertFavoriteState(db, prefix, 'favorite');

    res.json({ status: 'ok', prefix, newState: 'favorite' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reactivate favorite' });
  }
});

export default router;
