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
  const imgRef = useRef<HTMLDivElement>(null);
  
  const { isLoading, error, imageSrc } = useLazyImage({
    src,
    thumbnail,
    alt,
  });
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsIntersecting(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '100px', // Start loading when image is 100px from viewport
        threshold: 0.1,
      }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => {
      observer.disconnect();
    };
  }, []);
  
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
