import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import sharp from 'sharp';
import { Image, ImageSet } from '../types.js';

const router = express.Router();

function getDirectoryName(dirPath: string): string {
  const name = path.basename(dirPath);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

async function generateThumbnail(
  imagePath: string, 
  thumbnailPath: string
): Promise<void> {
  try {
    const thumbnailDir = path.dirname(thumbnailPath);
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }
    
    await sharp(imagePath)
      .resize(150, 100, { fit: 'cover' }) // サイズを半分に変更
      .toFile(thumbnailPath);
  } catch (error) {
    console.error(`Error generating thumbnail for ${imagePath}:`, error);
    throw error;
  }
}

router.get('/image-sets', async (req, res) => {
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
          const imagePath = path.join(dirPath, file);
          const thumbnailPath = path.join(thumbnailDirPath, file);
          
          if (!fs.existsSync(thumbnailPath)) {
            await generateThumbnail(imagePath, thumbnailPath);
          }
          
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
    console.error('Error getting image sets:', error);
    res.status(500).json({ error: 'Failed to get image sets' });
  }
});

// Add endpoint to get list of photo set names
router.get('/photo-sets', async (req, res) => {
  try {
    const PICTURES_DIR = path.join(process.cwd(), '../public/pictures');
    const directories = await fsPromises.readdir(PICTURES_DIR, { withFileTypes: true });
    const setNames = directories.filter(dir => dir.isDirectory()).map(dir => dir.name);
    res.json(setNames);
  } catch (error) {
    console.error('Error getting photo set names:', error);
    res.status(500).json({ error: 'Failed to get photo set names' });
  }
});

// Add endpoint to get images for a specific set
router.get('/photo-sets/:setName', (async (req: Request<{ setName: string }>, res: Response) => {
  try {
    const setName = req.params.setName;
    const PICTURES_DIR = path.join(process.cwd(), '../public/pictures');
    const THUMBNAILS_DIR = path.join(process.cwd(), '../public/thumbnails');
    const dirPath = path.join(PICTURES_DIR, setName);
    const thumbnailDirPath = path.join(THUMBNAILS_DIR, setName);
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: `Photo set '${setName}' not found` });
    }
    if (!fs.existsSync(thumbnailDirPath)) {
      fs.mkdirSync(thumbnailDirPath, { recursive: true });
    }
    const files = await fsPromises.readdir(dirPath);
    const imageFiles = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
    const images: Image[] = [];
    for (const file of imageFiles) {
      const imagePath = path.join(dirPath, file);
      const thumbnailPath = path.join(thumbnailDirPath, file);
      if (!fs.existsSync(thumbnailPath)) {
        await generateThumbnail(imagePath, thumbnailPath);
      }
      images.push({
        src: `/pictures/${setName}/${file}`,
        alt: file.replace(/\.[^/.]+$/, ''),
        thumbnail: `/thumbnails/${setName}/${file}`
      });
    }
    res.json(images);
  } catch (error) {
    console.error('Error getting images for set:', error);
    res.status(500).json({ error: 'Failed to get images for set' });
  }
}) as any);

export default router;
