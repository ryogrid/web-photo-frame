import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import compression from 'compression';
import imageRoutes from './routes/image-routes.js';
import staticRoutes from './routes/static-routes.js';
//import imageMetadataRoutes from './routes/image-metadata-routes.js';

const app = express();
const PORT = 3000; //process.env.PORT || 3000;

app.use(cors());

// 圧縮ミドルウェア（画像以外に有効）
app.use(compression({
  filter: (req, res) => {
    // 画像ファイルは圧縮しない（既に圧縮済み + CPU負荷軽減）
    if (req.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // 圧縮レベル（1-9、6が推奨バランス）
  threshold: 1024, // 1KB以上のファイルのみ圧縮
}));

const FRONTEND_BUILD_DIR = path.join(process.cwd(), '../dist');
const PICTURES_DIR = path.join(process.cwd(), '../public/pictures');
const THUMBNAILS_DIR = path.join(process.cwd(), '../public/thumbnails');

if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

// 静的ファイル配信の最適化
const staticOptions = {
  maxAge: '1d', // 1日間キャッシュ
  etag: true,   // ETags有効化
  lastModified: true, // Last-Modified有効化
  setHeaders: (res: any, path: string) => {
    // 画像ファイルはより長期間キャッシュ
    if (path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1日
    }
  }
};

app.use(express.static(FRONTEND_BUILD_DIR, staticOptions));

app.use('/pictures', express.static(PICTURES_DIR, staticOptions));

app.use('/thumbnails', express.static(THUMBNAILS_DIR, staticOptions));

app.use('/api', imageRoutes);
app.use('/api', staticRoutes); // 高速静的ファイル配信
//app.use('/api', imageMetadataRoutes);

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
