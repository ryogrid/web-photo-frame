import { useState, useEffect} from 'react';

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

// New API: Fetch image list for a given image set name
export async function fetchImagesForImageSet(setName: string): Promise<Image[]> {
  const response = await fetch(`/api/image-sets/${encodeURIComponent(setName)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch images for image set');
  }
  return await response.json();
}

// Custom hook: Get image list for specified set name
export function useImagesForImageSet(setName: string | null) {
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
  }, [setName]);

  return { images, loading, error };
}
