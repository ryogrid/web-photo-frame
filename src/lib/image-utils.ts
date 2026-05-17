import { useState, useEffect, useCallback, useRef } from 'react';

export interface Image {
  src: string;
  alt: string;
  thumbnail?: string;
  filename?: string;
  prefix?: string;
}

export interface ImageSet {
  name: string;
  images: Image[];
}

const PAGE_SIZE = 100;

export function getDirectoryName(path: string): string {
  const name = path.split('/').pop() || '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// API: Fetch image list for a given image set name
export async function fetchImagesForImageSet(setName: string): Promise<Image[]> {
  const response = await fetch(`/api/image-sets/${encodeURIComponent(setName)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch images for image set');
  }
  return await response.json();
}

// Custom hook: Get image list for specified set name with pagination for virtual sets.
// Use refreshKey to trigger re-fetch without changing setName.
// sortMode only affects virtual sets (__favorites__/__oldfav__).
export function useImagesForImageSet(setName: string | null, refreshKey: number = 0, sortMode: 'author' | 'random' = 'author') {
  const [allImages, setAllImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const loadingRef = useRef(false);
  const seedRef = useRef<number | null>(null);
  const isVirtualSet = setName?.startsWith('__');

  // Reset and fetch first page when setName, refreshKey, or sortMode changes
  useEffect(() => {
    if (!setName) return;
    setAllImages([]);
    setOffset(0);
    setTotal(0);
    seedRef.current = null;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    let url = `/api/image-sets/${encodeURIComponent(setName)}`;
    if (isVirtualSet) {
      const params = new URLSearchParams();
      params.set('limit', String(PAGE_SIZE));
      params.set('offset', '0');
      if (sortMode === 'random') params.set('sort', 'random');
      url += `?${params.toString()}`;
    }

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch images for image set');
        return r.json();
      })
      .then((data) => {
        if (isVirtualSet && data.images) {
          setAllImages(data.images);
          setOffset(data.images.length);
          setTotal(data.total);
          if (data.seed != null) seedRef.current = data.seed;
        } else {
          setAllImages(Array.isArray(data) ? data : []);
          setTotal(Array.isArray(data) ? data.length : 0);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });
  }, [setName, refreshKey, sortMode]);

  const loadMore = useCallback(() => {
    if (!setName || loadingRef.current || !isVirtualSet || offset >= total) return;
    loadingRef.current = true;
    setLoading(true);

    const params = new URLSearchParams();
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    if (sortMode === 'random') {
      params.set('sort', 'random');
      if (seedRef.current != null) params.set('seed', String(seedRef.current));
    }
    const url = `/api/image-sets/${encodeURIComponent(setName)}?${params.toString()}`;

    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch images');
        return r.json();
      })
      .then((data) => {
        setAllImages((prev) => [...prev, ...(data.images || [])]);
        setOffset((prev) => prev + (data.images?.length || 0));
        setTotal(data.total);
        if (data.seed != null) seedRef.current = data.seed;
      })
      .catch((err) => setError(err.message))
      .finally(() => {
        loadingRef.current = false;
        setLoading(false);
      });
  }, [setName, offset, isVirtualSet, total, sortMode]);

  return { images: allImages, loading, error, hasMore: offset < total, loadMore };
}
