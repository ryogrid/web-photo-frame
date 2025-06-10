import { useState, useEffect } from 'react';
import { globalRequestQueue } from '../lib/RequestQueue';
// import { simpleObjectURLManager } from '../lib/SimpleObjectURLManager';

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
    let retryTimeoutId: NodeJS.Timeout | null = null;
    
    const url = thumbnail || src;
    
    setIsLoading(true);
    setError(null);

    // 一時的にキャッシュ機能を無効化してテスト
    // const cachedObjectUrl = thumbnailMemoryManager.getObjectUrl(url);
    // if (cachedObjectUrl) {
    //   setImageSrc(cachedObjectUrl);
    //   setIsLoading(false);
    //   return;
    // }

    setImageSrc(null);

    const RETRY_DELAY_MS = 1000;
    const TIMEOUT_MS = 30000;
    const MAX_RETRIES = 1;

    const loadImage = async (retryCount = 0) => {
      if (!isMounted) return;
      
      const controller = new AbortController();
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
        
        // 一時的にSimpleObjectURLManager登録を無効化
        // simpleObjectURLManager.add(url, objectUrl);
        
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
      
      if (retryTimeoutId) {
        clearTimeout(retryTimeoutId);
      }
    };
  }, [src, thumbnail]);

  // コンポーネントアンマウント時のクリーンアップ
  useEffect(() => {
    return () => {
      // 一時的にSimpleObjectURLManager削除を無効化
      // const url = thumbnail || src;
      // simpleObjectURLManager.remove(url);
      
      // 元のクリーンアップ方式に戻す
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
