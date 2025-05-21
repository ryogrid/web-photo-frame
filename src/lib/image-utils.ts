import { useState, useEffect, useCallback } from 'react';

export interface Image {
  src: string;
  alt: string;
  thumbnail?: string;
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
      
      const response = await fetch('/api/image-sets-metadata');
      if (!response.ok) {
        throw new Error(`Failed to fetch image sets: ${response.statusText}`);
      }
      
      const sets: ImageSet[] = await response.json();
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
    fetchImageSets();
  }, [fetchImageSets]);
  
  useEffect(() => {
    fetchImageSets();
  }, [fetchImageSets]);
  
  return { imageSets, loading, error, refreshImageSets, lastRefreshed };
}
