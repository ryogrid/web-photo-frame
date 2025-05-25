import { useState, useEffect} from 'react';

export interface Image {
  src: string;
  alt: string;
  thumbnail?: string;
}

export interface ImageSet {
  name: string;
  images: Image[];
}

export function getDirectoryName(path: string): string {
  const name = path.split('/').pop() || '';
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// 新しいAPI: 画像セット名を受け取ってそのセットの画像一覧を取得
export async function fetchImagesForImageSet(setName: string): Promise<Image[]> {
  const response = await fetch(`/api/image-sets/${encodeURIComponent(setName)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch images for image set');
  }
  return await response.json();
}

// カスタムフック: 指定セット名の画像一覧を取得
export function useImagesForImageSet(setName: string | null) {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!setName) return;
    setLoading(true);
    setError(null);
    fetchImagesForImageSet(setName)
      .then(setImages)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [setName]);

  return { images, loading, error };
}
