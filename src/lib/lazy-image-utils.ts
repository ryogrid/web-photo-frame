import { useState, useEffect, useCallback } from 'react';
import { initDB, clearOldThumbnails } from './indexed-db';

export interface Image {
  src: string;
  alt: string;
  thumbnail?: string;
}

export interface ImageSet {
  name: string;
  images: Image[];
}

export interface PaginatedImageSet {
  name: string;
  images: Image[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function getDirectoryName(path: string): string {
  const name = path.split('/').pop() || '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function useImageSetsMetadata(): { 
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
      
      await initDB();
      
      await clearOldThumbnails();
      
      const response = await fetch('/api/image-sets');
      if (!response.ok) {
        throw new Error(`Failed to fetch image sets metadata: ${response.statusText}`);
      }
      
      const sets: ImageSet[] = await response.json();
      setImageSets(sets);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      console.error('Error loading image sets metadata:', err);
      setError('Failed to load image sets metadata.');
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

