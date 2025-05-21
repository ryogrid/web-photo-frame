import express from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import { Image, ImageSet } from '../types.js';

const router = express.Router();

function getDirectoryName(dirPath: string): string {
  const name = path.basename(dirPath);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

router.get('/image-sets-metadata', function(req, res) {
  (async () => {
    try {
      const imageSets: ImageSet[] = [];
      const PICTURES_DIR = path.join(process.cwd(), '../public/pictures');
      const THUMBNAILS_DIR = path.join(process.cwd(), '../public/thumbnails');
      
      const directories = await fsPromises.readdir(PICTURES_DIR, { withFileTypes: true });
      
      for (const dir of directories) {
        if (dir.isDirectory()) {
          const dirPath = path.join(PICTURES_DIR, dir.name);
          const thumbnailDirPath = path.join(THUMBNAILS_DIR, dir.name);
          
          if (!fs.existsSync(thumbnailDirPath)) {
            fs.mkdirSync(thumbnailDirPath, { recursive: true });
          }
          
          const files = await fsPromises.readdir(dirPath);
          const imageFiles = files.filter(file => 
            /\.(jpg|jpeg|png|gif)$/i.test(file)
          );
          
          const images: Image[] = [];
          
          for (const file of imageFiles) {
            images.push({
              src: `/pictures/${dir.name}/${file}`,
              alt: file.replace(/\.[^/.]+$/, ''), // Remove file extension
              thumbnail: `/thumbnails/${dir.name}/${file}`
            });
          }
          
          if (images.length > 0) {
            imageSets.push({
              name: getDirectoryName(dir.name),
              images
            });
          }
        }
      }
      
      res.json(imageSets);
    } catch (error) {
      console.error('Error getting image sets metadata:', error);
      res.status(500).json({ error: 'Failed to get image sets metadata' });
    }
  })();
});

router.get('/image-sets-metadata/paginated', function(req, res) {
  (async () => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const setName = req.query.set as string;
      
      const PICTURES_DIR = path.join(process.cwd(), '../public/pictures');
      const THUMBNAILS_DIR = path.join(process.cwd(), '../public/thumbnails');
      
      if (setName) {
        const dirPath = path.join(PICTURES_DIR, setName.toLowerCase());
        const thumbnailDirPath = path.join(THUMBNAILS_DIR, setName.toLowerCase());
        
        if (!fs.existsSync(dirPath)) {
          return res.status(404).json({ error: `Image set '${setName}' not found` });
        }
        
        if (!fs.existsSync(thumbnailDirPath)) {
          fs.mkdirSync(thumbnailDirPath, { recursive: true });
        }
        
        const files = await fsPromises.readdir(dirPath);
        const imageFiles = files.filter(file => 
          /\.(jpg|jpeg|png|gif)$/i.test(file)
        );
        
        const totalImages = imageFiles.length;
        const totalPages = Math.ceil(totalImages / limit);
        const startIndex = (page - 1) * limit;
        const endIndex = Math.min(startIndex + limit, totalImages);
        
        const paginatedFiles = imageFiles.slice(startIndex, endIndex);
        
        const images: Image[] = paginatedFiles.map(file => ({
          src: `/pictures/${setName.toLowerCase()}/${file}`,
          alt: file.replace(/\.[^/.]+$/, ''), // Remove file extension
          thumbnail: `/thumbnails/${setName.toLowerCase()}/${file}`
        }));
        
        return res.json({
          name: getDirectoryName(setName.toLowerCase()),
          images,
          pagination: {
            total: totalImages,
            page,
            limit,
            totalPages
          }
        });
      }
      
      const directories = await fsPromises.readdir(PICTURES_DIR, { withFileTypes: true });
      const imageSets = directories
        .filter(dir => dir.isDirectory())
        .map(dir => ({
          name: getDirectoryName(dir.name),
          imageCount: 0 // Will be updated below
        }));
      
      for (let i = 0; i < imageSets.length; i++) {
        const dirPath = path.join(PICTURES_DIR, imageSets[i].name.toLowerCase());
        const files = await fsPromises.readdir(dirPath);
        const imageFiles = files.filter(file => 
          /\.(jpg|jpeg|png|gif)$/i.test(file)
        );
        imageSets[i].imageCount = imageFiles.length;
      }
      
      res.json({
        sets: imageSets,
        pagination: {
          total: imageSets.length,
          page: 1,
          limit: imageSets.length,
          totalPages: 1
        }
      });
    } catch (error) {
      console.error('Error getting paginated image sets metadata:', error);
      res.status(500).json({ error: 'Failed to get paginated image sets metadata' });
    }
  })();
});

export default router;
