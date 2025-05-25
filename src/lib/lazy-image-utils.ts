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

// Fetch only the list of photo set names (directories)
export async function fetchPhotoSetNames(): Promise<string[]> {
  const response = await fetch('/api/photo-sets');
  if (!response.ok) {
    throw new Error('Failed to fetch photo set names');
  }
  return await response.json();
}

// Fetch images for a specific photo set (directory)
export async function fetchImagesForSet(setName: string): Promise<Image[]> {
  const response = await fetch(`/api/image-sets/${encodeURIComponent(setName)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch images for set');
  }
  return await response.json();
}

// Hook to get the list of photo set names
export function usePhotoSetNames() {
  const [setNames, setSetNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPhotoSetNames()
      .then(setSetNames)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return { setNames, loading, error };
}

// Hook to get images for a specific set
export function useImagesForSet(setName: string | null) {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setName) return;
    setLoading(true);
    setError(null);
    fetchImagesForSet(setName)
      .then(setImages)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setName]);

  return { images, loading, error };
}

