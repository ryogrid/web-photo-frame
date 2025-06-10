import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';
import imageRoutes from './routes/image-routes.js';
import staticRoutes from './routes/static-routes.js';

const app = express();
const PORT = 3000;

app.use(cors());

// Compression middleware (for non-image files)
app.use(compression({
  filter: (req, res) => {
    // Don't compress image files (already compressed + reduce CPU load)
    if (req.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9, 6 is recommended balance)
  threshold: 1024, // Only compress files larger than 1KB
}));

const FRONTEND_BUILD_DIR = path.join(process.cwd(), '../dist');
const PICTURES_DIR = path.join(process.cwd(), '../public/pictures');
const THUMBNAILS_DIR = path.join(process.cwd(), '../public/thumbnails');

if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

// Static file serving optimization
const staticOptions = {
  maxAge: '1d', // Cache for 1 day
  etag: true,   // Enable ETags
  lastModified: true, // Enable Last-Modified
  setHeaders: (res: any, path: string) => {
    // Cache image files for longer
    if (path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
  }
};

app.use(express.static(FRONTEND_BUILD_DIR, staticOptions));

app.use('/pictures', express.static(PICTURES_DIR, staticOptions));

app.use('/thumbnails', express.static(THUMBNAILS_DIR, staticOptions));

app.use('/api', imageRoutes);
app.use('/api', staticRoutes); // Fast static file serving

app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_BUILD_DIR, 'index.html'));
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api/image-sets`);
    console.log(`SPA available at http://localhost:${PORT}`);
  });
}

export default app;
