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
      
      const response = await fetch('/api/image-sets-metadata');
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

export function usePaginatedImageSet(setName: string): { 
  imageSet: PaginatedImageSet | null; 
  loading: boolean; 
  error: string | null;
  loadMore: () => void;
  hasMore: boolean;
} {
  const [imageSet, setImageSet] = useState<PaginatedImageSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  
  const fetchImageSet = useCallback(async (currentPage: number) => {
    try {
      setLoading(true);
      
      await initDB();
      
      const response = await fetch(`/api/image-sets-metadata/paginated?set=${setName}&page=${currentPage}&limit=20`);
      if (!response.ok) {
        throw new Error(`Failed to fetch image set: ${response.statusText}`);
      }
      
      const data: PaginatedImageSet = await response.json();
      
      if (currentPage === 1) {
        setImageSet(data);
      } else if (imageSet) {
        setImageSet({
          ...data,
          images: [...imageSet.images, ...data.images]
        });
      }
      
      setHasMore(data.pagination.page < data.pagination.totalPages);
      setError(null);
    } catch (err) {
      console.error('Error loading image set:', err);
      setError('Failed to load image set.');
    } finally {
      setLoading(false);
    }
  }, [setName, imageSet]);
  
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchImageSet(nextPage);
    }
  }, [loading, hasMore, page, fetchImageSet]);
  
  useEffect(() => {
    setPage(1);
    fetchImageSet(1);
  }, [setName, fetchImageSet]);
  
  return { imageSet, loading, error, loadMore, hasMore };
}
