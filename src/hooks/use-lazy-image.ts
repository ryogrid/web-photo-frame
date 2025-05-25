import { useState, useEffect } from 'react';
import { globalRequestQueue } from '../lib/RequestQueue';

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

    const RETRY_DELAY_MS = 1000; // 1秒
    const TIMEOUT_MS = 100000; // 100秒
    const MAX_RETRIES = 1;

    const loadImage = async (retryCount = 0) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const url = thumbnail || src;
        const fetchTask = () => fetch(url, { signal: controller.signal });
        const response = await globalRequestQueue.enqueue(fetchTask, controller);
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
        clearTimeout(timeoutId);
        if (retryCount < MAX_RETRIES) {
          setTimeout(() => {
            if (isMounted) {
              loadImage(retryCount + 1);
            }
          }, RETRY_DELAY_MS);
        } else {
          console.error('Error loading image:', err);
          if (isMounted) {
            setError(`Failed to load image: ${err instanceof Error ? err.message : String(err)}`);
            setIsLoading(false);
          }
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
