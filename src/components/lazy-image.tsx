import { useRef, useEffect, useState } from 'react';
import { useLazyImage } from '../hooks/use-lazy-image';
import { isMemoryConstrainedWebKit } from '../lib/device-utils';

interface LazyImageProps {
  src: string;
  thumbnail?: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  preferDirectSrc?: boolean;
  disableInitialLoadDelay?: boolean;
}

export function LazyImage({
  src,
  thumbnail,
  alt,
  className,
  onClick,
  preferDirectSrc = false,
  disableInitialLoadDelay = false,
}: LazyImageProps) {
  const isConstrainedWebKit = isMemoryConstrainedWebKit();
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const hasEnteredRef = useRef(false);
  const shouldUseManagedLoading = !preferDirectSrc;

  const { isLoading, error, imageSrc } = useLazyImage({
    src,
    thumbnail,
    alt,
    retryKey,
    active: shouldUseManagedLoading && isIntersecting,
  });

  // Cache successfully loaded image
  useEffect(() => {
    if (!shouldUseManagedLoading) {
      return;
    }

    if (imageSrc) {
      setLoadedSrc(imageSrc);
    }
  }, [imageSrc, shouldUseManagedLoading]);

  // Reset loadedSrc and retryKey when src/thumbnail changes
  useEffect(() => {
    setLoadedSrc(null);
    setRetryKey(0);
    hasEnteredRef.current = false;
    setIsIntersecting(preferDirectSrc);
  }, [preferDirectSrc, src, thumbnail]);

  useEffect(() => {
    if (!shouldUseManagedLoading) {
      setIsIntersecting(true);
      hasEnteredRef.current = true;
      return;
    }

    let timer: NodeJS.Timeout | null = null;
    const currentElement = imgRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!hasEnteredRef.current) {
              // First time entering — wait for delay before loading
              if (!timer) {
                timer = setTimeout(() => {
                  setIsIntersecting(true);
                  hasEnteredRef.current = true;
                }, disableInitialLoadDelay ? 0 : 500);
              }
            } else {
              // Re-entering after leaving — resume immediately
              if (timer) {
                clearTimeout(timer);
                timer = null;
              }
              setIsIntersecting(true);
            }
          } else {
            if (timer) {
              clearTimeout(timer);
              timer = null;
            }
            // Cancel loading when element leaves viewport
            setIsIntersecting(false);
          }
        });
      },
      {
        rootMargin: isConstrainedWebKit ? '0px' : '100px',
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
  }, [disableInitialLoadDelay, isConstrainedWebKit, shouldUseManagedLoading, src, thumbnail]);

  // Automatic retry on error
  useEffect(() => {
    if (error && retryKey < 3 && isIntersecting) {
      const retryTimer = setTimeout(() => {
        console.log(`Retrying image load (attempt ${retryKey + 1}):`, thumbnail || src);
        setRetryKey(prev => prev + 1);
      }, 1000);

      return () => {
        clearTimeout(retryTimer);
      };
    }
  }, [error, retryKey, src, thumbnail, isIntersecting]);

  // Determine what to render
  const showImage = loadedSrc || imageSrc;

  if (preferDirectSrc) {
    return (
      <div
        ref={imgRef}
        className="w-full h-full"
        onClick={onClick}
      >
        <img
          src={src}
          alt={alt}
          className={className}
        />
      </div>
    );
  }

  return (
    <div
      ref={imgRef}
      className="w-full h-full"
      onClick={onClick}
    >
      {isIntersecting ? (
        isLoading && !showImage ? (
          <div className="w-full h-full flex items-center justify-center bg-gray-800">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
          </div>
        ) : error && !showImage ? (
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
        ) : showImage ? (
          <img
            src={showImage}
            alt={alt}
            className={className}
          />
        ) : (
          <div className="w-full h-full bg-gray-800"></div>
        )
      ) : showImage ? (
        <img
          src={showImage}
          alt={alt}
          className={className}
        />
      ) : (
        <div className="w-full h-full bg-gray-800"></div>
      )}
    </div>
  );
}
