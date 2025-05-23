import express from 'express';
import path from 'path';
import fs from 'fs';
import cors from 'cors';
import imageRoutes from './routes/image-routes.js';
import imageMetadataRoutes from './routes/image-metadata-routes.js';

const app = express();
const PORT = 3000; //process.env.PORT || 3000;

app.use(cors());

const FRONTEND_BUILD_DIR = path.join(process.cwd(), '../dist');
const PICTURES_DIR = path.join(process.cwd(), '../public/pictures');
const THUMBNAILS_DIR = path.join(process.cwd(), '../public/thumbnails');

if (!fs.existsSync(THUMBNAILS_DIR)) {
  fs.mkdirSync(THUMBNAILS_DIR, { recursive: true });
}

app.use(express.static(FRONTEND_BUILD_DIR));

app.use('/pictures', express.static(PICTURES_DIR));

app.use('/thumbnails', express.static(THUMBNAILS_DIR));

app.use('/api', imageRoutes);
app.use('/api', imageMetadataRoutes);

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
