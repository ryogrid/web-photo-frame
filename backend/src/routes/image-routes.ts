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
      .resize(150, 100, { fit: 'cover' }) // Reduced size by half
      .toFile(thumbnailPath);
  } catch (error) {
    console.error(`Error generating thumbnail for ${imagePath}:`, error);
    throw error;
  }
}

// Get list of photo set names
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

// Get images for a specific image set
router.get('/image-sets/:setName', (async (req: Request<{ setName: string }>, res: Response) => {
  try {
    const setName = req.params.setName;
    const PICTURES_DIR = path.join(process.cwd(), '../public/pictures');
    const THUMBNAILS_DIR = path.join(process.cwd(), '../public/thumbnails');
    const dirPath = path.join(PICTURES_DIR, setName);
    const thumbnailDirPath = path.join(THUMBNAILS_DIR, setName);
    const metadataPath = path.join(thumbnailDirPath, 'image-set-metadata.json');
    if (!fs.existsSync(dirPath)) {
      return res.status(404).json({ error: `Image set '${setName}' not found` });
    }
    if (!fs.existsSync(thumbnailDirPath)) {
      fs.mkdirSync(thumbnailDirPath, { recursive: true });
    }
    // Return existing metadata file if available
    if (fs.existsSync(metadataPath)) {
      try {
        const metadata = await fsPromises.readFile(metadataPath, 'utf-8');
        return res.json(JSON.parse(metadata));
      } catch (err) {
        // Regenerate if file is corrupted
        console.warn(`Failed to read image-set-metadata.json: ${err}`);
      }
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
        src: `/api/fast-pictures/${setName}/${file}`,
        alt: file.replace(/\.[^/.]+$/, ''),
        thumbnail: `/api/fast-thumbnails/${setName}/${file}`
      });
    }
    // Save metadata as JSON file
    await fsPromises.writeFile(metadataPath, JSON.stringify(images, null, 2), 'utf-8');
    res.json(images);
  } catch (error) {
    console.error('Error getting images for image set:', error);
    res.status(500).json({ error: 'Failed to get images for image set' });
  }
}) as any);

export default router;
