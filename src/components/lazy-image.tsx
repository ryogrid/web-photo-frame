import { useRef, useEffect, useState } from 'react';
import { useLazyImage } from '../hooks/use-lazy-image';
// import { thumbnailMemoryManager } from '../lib/ThumbnailMemoryManager';

interface LazyImageProps {
  src: string;
  thumbnail?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
}

export function LazyImage({ src, thumbnail, alt, className, onClick }: LazyImageProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const imgRef = useRef<HTMLDivElement>(null);
  
  const { isLoading, error, imageSrc } = useLazyImage({
    src,
    thumbnail,
    alt,
  });
  
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    const currentElement = imgRef.current;
    // const url = thumbnail || src;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const isVisible = entry.isIntersecting;
          
          // 一時的にメモリマネージャーへの通知を無効化
          // thumbnailMemoryManager.updateVisibility(url, isVisible);
          
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
        rootMargin: '100px', // より早めにロード開始
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
      // 一時的にメモリマネージャーへの通知を無効化
      // thumbnailMemoryManager.updateVisibility(url, false);
    };
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
            <span>Error loading image</span>
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
