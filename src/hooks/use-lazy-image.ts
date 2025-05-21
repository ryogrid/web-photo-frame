import { useState, useEffect } from 'react';
import { getThumbnail, cacheThumbnail } from '../lib/indexed-db';

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
      try {
        if (thumbnail) {
          const cachedThumbnail = await getThumbnail(thumbnail);
          
          if (cachedThumbnail && isMounted) {
            const objectUrl = URL.createObjectURL(cachedThumbnail);
            setImageSrc(objectUrl);
            setIsLoading(false);
            return;
          }
          
          const response = await fetch(thumbnail);
          if (!response.ok) {
            throw new Error(`Failed to load thumbnail: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          
          await cacheThumbnail(thumbnail, blob);
          
          if (isMounted) {
            const objectUrl = URL.createObjectURL(blob);
            setImageSrc(objectUrl);
            setIsLoading(false);
          }
        } else {
          const response = await fetch(src);
          if (!response.ok) {
            throw new Error(`Failed to load image: ${response.statusText}`);
          }
          
          const blob = await response.blob();
          
          if (isMounted) {
            const objectUrl = URL.createObjectURL(blob);
            setImageSrc(objectUrl);
            setIsLoading(false);
          }
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
