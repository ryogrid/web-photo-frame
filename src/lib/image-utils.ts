import { useState, useEffect} from 'react';

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

// Custom hook: Get image list for specified set name.
// Use refreshKey to trigger re-fetch without changing setName.
export function useImagesForImageSet(setName: string | null, refreshKey: number = 0) {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setName) return;
    setLoading(true);
    setError(null);
    fetchImagesForImageSet(setName)
      .then(setImages)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setName, refreshKey]);

  return { images, loading, error };
}
