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
  refreshImageSets: () => Promise<void>;
  lastRefreshed: Date | null;
} {
  const [imageSets, setImageSets] = useState<ImageSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  
  const fetchImageSets = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await fetch(`${apiUrl}/api/photosets`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image sets: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const transformedSets = data.map((set: any) => ({
        name: set.name,
        images: set.images.map((image: any) => ({
          src: `${apiUrl}${image.src}`,
          alt: image.alt
        }))
      }));
      
      setImageSets(transformedSets);
      setLastRefreshed(new Date());
      setError(null);
    } catch (err) {
      console.error('Error loading image sets:', err);
      setError('Failed to load image sets. Please check the API server is running.');
    } finally {
      setLoading(false);
    }
  }, [apiUrl]);
  
  const refreshImageSets = useCallback(async () => {
    try {
      await fetch(`${apiUrl}/api/refresh`);
      await fetchImageSets();
    } catch (err) {
      console.error('Error refreshing image sets:', err);
      setError('Failed to refresh image sets');
    }
  }, [apiUrl, fetchImageSets]);
  
  useEffect(() => {
    fetchImageSets();
  }, [fetchImageSets]);
  
  return { imageSets, loading, error, refreshImageSets, lastRefreshed };
}
