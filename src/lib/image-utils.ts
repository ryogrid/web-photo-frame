import { useState, useEffect, useCallback } from 'react';

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
export function useImagesForImageSet(setName: string | null, refreshKey: number = 0) {
  const [allImages, setAllImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const isVirtualSet = setName?.startsWith('__');

  // Reset and fetch first page when setName or refreshKey changes
  useEffect(() => {
    if (!setName) return;
    setAllImages([]);
    setOffset(0);
    setTotal(0);
    setLoading(true);
    setError(null);

    const url = isVirtualSet
      ? `/api/image-sets/${encodeURIComponent(setName)}?limit=${PAGE_SIZE}&offset=0`
      : `/api/image-sets/${encodeURIComponent(setName)}`;

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
        } else {
          setAllImages(Array.isArray(data) ? data : []);
          setTotal(Array.isArray(data) ? data.length : 0);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setName, refreshKey]);

  const loadMore = useCallback(() => {
    if (!setName || loading || !isVirtualSet || offset >= total) return;
    setLoading(true);
    fetch(`/api/image-sets/${encodeURIComponent(setName)}?limit=${PAGE_SIZE}&offset=${offset}`)
      .then((r) => {
        if (!r.ok) throw new Error('Failed to fetch images');
        return r.json();
      })
      .then((data) => {
        setAllImages((prev) => [...prev, ...(data.images || [])]);
        setOffset((prev) => prev + (data.images?.length || 0));
        setTotal(data.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setName, offset, loading, isVirtualSet, total]);

  return { images: allImages, loading, error, hasMore: offset < total, loadMore };
}
