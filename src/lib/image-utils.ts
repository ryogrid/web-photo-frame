import { useState, useEffect, useCallback } from 'react';

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
  error: string | null;
  refreshImageSets: () => void;
  lastRefreshed: Date | null;
} {
  const [imageSets, setImageSets] = useState<ImageSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  const fetchImageSets = useCallback(async () => {
    try {
      setLoading(true);
      
      const photoSetDirectories = [
        'landscapes',
        'animals',
        'cities',
        'nature'
      ];
      
      const sets: ImageSet[] = [];
      
      for (const dir of photoSetDirectories) {
        try {
          
          const setName = dir.charAt(0).toUpperCase() + dir.slice(1);
          
          const imageFiles = [
            { name: 'image1.jpg', alt: 'Image 1' },
            { name: 'image2.jpg', alt: 'Image 2' },
            { name: 'image3.jpg', alt: 'Image 3' },
            { name: 'cat1.jpg', alt: 'Cat 1' },
            { name: 'cat2.jpg', alt: 'Cat 2' },
            { name: 'dog1.jpg', alt: 'Dog 1' },
            { name: 'city1.jpg', alt: 'City 1' },
            { name: 'city2.jpg', alt: 'City 2' },
            { name: 'city3.jpg', alt: 'City 3' },
            { name: 'simon-berger-twukN12EN7c-unsplash.jpg', alt: 'Landscape' },
            { name: 'bailey-zindel-NRQV-hBF10M-unsplash.jpg', alt: 'Landscape' },
            { name: 'ken-cheung-KonWFWUaAuk-unsplash.jpg', alt: 'Landscape' }
          ];
          
          const images: Image[] = [];
          
          for (const file of imageFiles) {
            try {
              const response = await fetch(`/pictures/${dir}/${file.name}`, { method: 'HEAD' });
              if (response.ok) {
                images.push({
                  src: `/pictures/${dir}/${file.name}`,
                  alt: file.alt
                });
              }
            } catch (err) {
              console.warn(`Failed to check image ${file.name} in ${dir}:`, err);
            }
          }
          
          if (images.length > 0) {
            sets.push({
              name: setName,
              images
            });
          }
        } catch (err) {
          console.warn(`Failed to load images for ${dir}:`, err);
        }
      }
      
      setImageSets(sets);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      console.error('Error loading image sets:', err);
      setError('Failed to load image sets.');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const refreshImageSets = useCallback(() => {
    window.location.reload();
  }, []);
  
  useEffect(() => {
    fetchImageSets();
  }, [fetchImageSets]);
  
  return { imageSets, loading, error, refreshImageSets, lastRefreshed };
}
