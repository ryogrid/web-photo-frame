import { useState, useEffect } from 'react';

interface UseLazyImageProps {
  src: string;
  thumbnail?: string;
  alt: string;
}

interface UseLazyImageResult {
  isLoading: boolean;
  error: string | null;
  imageSrc: string | null;
}

export function useLazyImage({ src, thumbnail }: UseLazyImageProps): UseLazyImageResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    const loadImage = async () => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 100000); // 100秒タイムアウト
      try {
        const url = thumbnail || src;
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.statusText}`);
        }
        const blob = await response.blob();
        if (isMounted) {
          const objectUrl = URL.createObjectURL(blob);
          setImageSrc(objectUrl);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Error loading image:', err);
        if (isMounted) {
          setError(`Failed to load image: ${err instanceof Error ? err.message : String(err)}`);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      if (imageSrc) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [src, thumbnail]);

  return { isLoading, error, imageSrc };
}
