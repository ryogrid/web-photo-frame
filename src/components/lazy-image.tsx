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
    let timer: NodeJS.Timeout | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!timer) {
              timer = setTimeout(() => {
                setIsIntersecting(true);
                observer.disconnect();
              }, 1000); // 1000ms以上表示されていた場合のみロード
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
        rootMargin: '0px', // 画面に入ったときのみ
        threshold: 0.1,    // 10%以上表示されたとき
      }
    );
    
    if (imgRef.current) {
      observer.observe(imgRef.current);
    }
    
    return () => {
      observer.disconnect();
      if (timer) {
        clearTimeout(timer);
      }
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
