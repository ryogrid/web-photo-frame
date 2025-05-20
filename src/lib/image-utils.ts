import { useState, useEffect } from 'react';

export interface Image {
  src: string;
  alt: string;
}

export interface ImageSet {
  name: string;
  images: Image[];
}

export function getDirectoryName(path: string): string {
  const name = path.split('/').pop() || '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function useImageSets(): { 
  imageSets: ImageSet[]; 
  loading: boolean; 
  error: string | null 
} {
  const [imageSets, setImageSets] = useState<ImageSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadImageSets() {
      try {
        const imageModules = import.meta.glob('/src/assets/pictures/**/*.{jpg,jpeg,png,gif}', { eager: true });
        
        const imageSetMap = new Map<string, Image[]>();
        
        Object.entries(imageModules).forEach(([path, module]) => {
          if (path.match(/\/src\/assets\/pictures\/[^\/]+\.[^\/]+$/)) {
            return;
          }
          
          const dirPath = path.split('/').slice(0, -1).join('/');
          
          const imageUrl = (module as any).default;
          const fileName = path.split('/').pop() || '';
          const image: Image = {
            src: imageUrl,
            alt: fileName.split('.')[0].replace(/-/g, ' ')
          };
          
          if (!imageSetMap.has(dirPath)) {
            imageSetMap.set(dirPath, []);
          }
          imageSetMap.get(dirPath)?.push(image);
        });
        
        const sets: ImageSet[] = Array.from(imageSetMap.entries())
          .map(([dirPath, images]) => ({
            name: getDirectoryName(dirPath),
            images
          }));
        
        setImageSets(sets);
        setLoading(false);
      } catch (err) {
        console.error('Error loading image sets:', err);
        setError('Failed to load image sets');
        setLoading(false);
      }
    }
    
    loadImageSets();
  }, []);
  
  return { imageSets, loading, error };
}
