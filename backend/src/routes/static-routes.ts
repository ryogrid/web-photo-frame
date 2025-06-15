import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';

const router = express.Router();
const stat = promisify(fs.stat);
const readFile = promisify(fs.readFile);

// Fast static file serving
async function serveStaticFile(
  req: Request, 
  res: Response, 
  filePath: string, 
  maxAge: number = 86400
) {
  try {
    // Check if file exists
    const stats = await stat(filePath);
    
    // Security: Prevent directory traversal
    const normalizedPath = path.normalize(filePath);
    if (!normalizedPath.startsWith(path.resolve(process.cwd(), '../public'))) {
      return res.status(403).send('Forbidden');
    }

    // Cache headers
    const lastModified = stats.mtime.toUTCString();
    const etag = `"${stats.size}-${stats.mtime.getTime()}"`;
    
    // Check client cache
    const clientEtag = req.headers['if-none-match'];
    const clientLastModified = req.headers['if-modified-since'];
    
    if (clientEtag === etag || clientLastModified === lastModified) {
      return res.status(304).end();
    }

    // Set response headers
    res.set({
      'Content-Type': getContentType(filePath),
      'Content-Length': stats.size.toString(),
      'Last-Modified': lastModified,
      'ETag': etag,
      'Cache-Control': `public, max-age=${maxAge}`,
      'Accept-Ranges': 'bytes'
    });

    // Range requests support (partial downloads)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : stats.size - 1;
      const chunksize = (end - start) + 1;
      
      res.status(206);
      res.set({
        'Content-Range': `bytes ${start}-${end}/${stats.size}`,
        'Content-Length': chunksize.toString()
      });
      
      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      // Normal file serving
      const fileContent = await readFile(filePath);
      res.send(fileContent);
    }

  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      res.status(404).send('File not found');
    } else {
      console.error('Error serving static file:', error);
      res.status(500).send('Internal server error');
    }
  }
}

// Content-Type determination
function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Fast image serving endpoints
router.get('/fast-pictures/:set/:filename', async (req, res) => {
  const { set, filename } = req.params;
  const filePath = path.join(process.cwd(), '../public/pictures', set, filename);
  await serveStaticFile(req, res, filePath, 86400); // 1 day cache
});

router.get('/fast-thumbnails/:set/:filename', async (req, res) => {
  const { set, filename } = req.params;
  const filePath = path.join(process.cwd(), '../public/thumbnails', set, filename);
  await serveStaticFile(req, res, filePath, 86400); // 1 day cache
});

export default router;