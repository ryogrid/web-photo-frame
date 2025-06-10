import { useRef, useEffect, useState } from 'react';
import { useLazyImage } from '../hooks/use-lazy-image';

interface LazyImageProps {
  src: string;
  thumbnail?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export function LazyImage({ src, thumbnail, alt, className, onClick }: LazyImageProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [retryKey, setRetryKey] = useState(0); // Retry counter
  const imgRef = useRef<HTMLDivElement>(null);
  
  const { isLoading, error, imageSrc } = useLazyImage({
    src,
    thumbnail,
    alt,
    retryKey, // Pass retry key to trigger useEffect re-execution
  });
  
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const currentElement = imgRef.current;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting;
          
          if (isVisible) {
            if (!timer) {
              timer = setTimeout(() => {
                setIsIntersecting(true);
                observer.disconnect();
              }, 500);
            }
          } else {
            if (timer) {
              clearTimeout(timer);
              timer = null;
            }
          }
        });
      },
      {
        rootMargin: '100px', // Start loading earlier
        threshold: 0.1,
      }
    );
    
    if (currentElement) {
      observer.observe(currentElement);
    }
    
    return () => {
      observer.disconnect();
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
  }, [src, thumbnail]);

  // Automatic retry on error
  useEffect(() => {
    if (error && retryKey < 3) { // Maximum 3 retries
      const retryTimer = setTimeout(() => {
        console.log(`Retrying image load (attempt ${retryKey + 1}):`, thumbnail || src);
        setRetryKey(prev => prev + 1);
      }, 1000); // Wait 1 second

      return () => {
        clearTimeout(retryTimer);
      };
    }
  }, [error, retryKey, src, thumbnail]);

  // Reset retry counter when src/thumbnail changes
  useEffect(() => {
    setRetryKey(0);
  }, [src, thumbnail]);
  
  return (
    <div 
      ref={imgRef}
      className="w-full h-full"
      onClick={onClick}
    >
      {isIntersecting ? (
        isLoading ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-red-500">
            {retryKey < 3 ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-red-500 mx-auto mb-2"></div>
                <span className="text-sm">Retrying... ({retryKey + 1}/3)</span>
              </div>
            ) : (
              <span>Error loading image</span>
            )}
          </div>
        ) : (
          <img 
            src={imageSrc || ''} 
            alt={alt} 
            className={className}
          />
        )
      ) : (
        <div className="w-full h-full bg-gray-800"></div>
      )}
    </div>
  );
}
