import { useState, useEffect } from 'react';
import { OneDriveImage } from '@/lib/onedrive-auth';

interface UseOneDriveImagesResult {
  oneDriveImages: OneDriveImage[];
  setOneDriveImages: (images: OneDriveImage[]) => void;
  clearOneDriveImages: () => void;
  isUsingOneDrive: boolean;
}

export function useOneDriveImages(): UseOneDriveImagesResult {
  const [oneDriveImages, setOneDriveImagesState] = useState<OneDriveImage[]>([]);

  const setOneDriveImages = (images: OneDriveImage[]) => {
    setOneDriveImagesState(images);
    // Store in session storage to persist during session
    sessionStorage.setItem('onedrive-images', JSON.stringify(images));
  };

  const clearOneDriveImages = () => {
    setOneDriveImagesState([]);
    sessionStorage.removeItem('onedrive-images');
  };

  useEffect(() => {
    // Load from session storage on mount
    const stored = sessionStorage.getItem('onedrive-images');
    if (stored) {
      try {
        const images = JSON.parse(stored);
        setOneDriveImagesState(images);
      } catch (error) {
        console.error('Failed to load OneDrive images from storage:', error);
        sessionStorage.removeItem('onedrive-images');
      }
    }
  }, []);

  return {
    oneDriveImages,
    setOneDriveImages,
    clearOneDriveImages,
    isUsingOneDrive: oneDriveImages.length > 0,
  };
}

// Convert OneDriveImage to the app's Image format
export function convertOneDriveImageToAppImage(oneDriveImage: OneDriveImage) {
  return {
    src: oneDriveImage.src,
    alt: oneDriveImage.alt,
    thumbnail: oneDriveImage.thumbnail,
  };
}
