import { useState, useEffect, useRef } from 'react';
import { globalRequestQueue } from '../lib/RequestQueue';

interface UseLazyImageProps {
  src: string;
  thumbnail?: string;
  alt: string;
  retryKey?: number; // Retry counter
  active?: boolean;  // When false, abort any in-progress fetch and don't start new ones
}

interface UseLazyImageResult {
  isLoading: boolean;
  error: string | null;
  imageSrc: string | null;
}

export function useLazyImage({ src, thumbnail, retryKey = 0, active = true }: UseLazyImageProps): UseLazyImageResult {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const prevUrlRef = useRef<string>('');

  useEffect(() => {
    if (!active) return;

    let isMounted = true;
    let retryTimeoutId: NodeJS.Timeout | null = null;
    const controller = new AbortController();
    const url = thumbnail || src;
    const urlChanged = url !== prevUrlRef.current;
    prevUrlRef.current = url;

    setIsLoading(true);
    setError(null);

    if (urlChanged) {
      setImageSrc(null);
    }

    const RETRY_DELAY_MS = 1000;
    const TIMEOUT_MS = 30000;
    const MAX_RETRIES = 1;

    const loadImage = async (retryCount = 0) => {
      if (!isMounted) return;

      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const fetchTask = () => fetch(url, { signal: controller.signal });
        const response = await globalRequestQueue.enqueue(fetchTask, controller);
        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (!response.ok) {
          throw new Error(`Failed to load image: ${response.statusText}`);
        }

        const blob = await response.blob();

        if (!isMounted) return;
        const objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
        setIsLoading(false);
      } catch (err) {
        clearTimeout(timeoutId);

        if (!isMounted) return;

        if (retryCount < MAX_RETRIES && !(err instanceof Error && err.name === 'AbortError')) {
          retryTimeoutId = setTimeout(() => {
            if (isMounted) {
              loadImage(retryCount + 1);
            }
          }, RETRY_DELAY_MS);
        } else {
          console.error('Error loading image:', err);
          setError(`Failed to load image: ${err instanceof Error ? err.message : String(err)}`);
          setIsLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      isMounted = false;
      controller.abort();
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, [src, thumbnail, retryKey, active]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      if (imageSrc) {
        try {
          URL.revokeObjectURL(imageSrc);
        } catch (e) {
          // Already revoked - ignore
        }
      }
    };
  }, [imageSrc]);

  return { isLoading, error, imageSrc };
}
