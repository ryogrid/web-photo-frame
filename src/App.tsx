import React, { useState, useRef } from 'react'
import './App.css'
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { usePhotoSetNames } from '@/lib/lazy-image-utils'
import { useImagesForImageSet } from '@/lib/image-utils'
import { LazyImage } from './components/lazy-image'
import { globalRequestQueue } from './lib/RequestQueue'
// import { simpleObjectURLManager } from './lib/SimpleObjectURLManager'

function App() {
  const { setNames, loading: setsLoading, error: setsError } = usePhotoSetNames();
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState<number | null>(null);

  const currentSetName = setNames[currentSetIndex] || '';
  const { images, loading: imagesLoading, error: imagesError } = useImagesForImageSet(currentSetName);

  const thumbGridRef = useRef<HTMLDivElement>(null);

  // アプリケーション終了時のクリーンアップ（一時的に無効化）
  // React.useEffect(() => {
  //   return () => {
  //     simpleObjectURLManager.clear();
  //   };
  // }, []);

  // Reset image index and slideshow when set changes
  React.useEffect(() => {
    globalRequestQueue.setSetKey();
    // 一時的にSimpleObjectURLManager無効化
    // simpleObjectURLManager.clear(); // シンプルObjectURL管理をクリア
    
    // スライドショーの状態を完全にリセット
    setIsPlaying(false);
    setCurrentIndex(0);
    
    console.log(`Changed to image set: ${currentSetIndex}, reset to index 0`);
  }, [currentSetIndex]);

  React.useEffect(() => {
    // 既存のインターバルをクリア
    if (slideshowInterval !== null) {
      clearInterval(slideshowInterval);
      setSlideshowInterval(null);
    }

    if (isPlaying && images.length > 0) {
      const interval = window.setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % images.length;
          // デバッグ用ログ（開発時に有用）
          console.log(`Slideshow: ${prevIndex} → ${nextIndex} (total: ${images.length})`);
          return nextIndex;
        });
      }, 5000);
      setSlideshowInterval(interval);
    }

    return () => {
      if (slideshowInterval !== null) {
        clearInterval(slideshowInterval);
        setSlideshowInterval(null);
      }
    }
  }, [isPlaying, images]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + images.length) % images.length);
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
  }

  const toggleSlideshow = () => {
    setIsSlideshow(!isSlideshow);
  }

  const togglePlayPause = () => {
    setIsPlaying(!isPlaying);
  }

  const selectImage = (index: number) => {
    setCurrentIndex(index);
    if (!isSlideshow) {
      setIsSlideshow(true);
    }
  }

  const handleSetChange = (value: string) => {
    const index = parseInt(value);
    if (!isNaN(index) && index >= 0 && index < setNames.length) {
      setCurrentSetIndex(index);
    }
  }

  const scrollToFirst = () => {
    if (thumbGridRef.current) {
      thumbGridRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToLast = () => {
    if (thumbGridRef.current) {
      thumbGridRef.current.scrollTo({ top: thumbGridRef.current.scrollHeight, behavior: 'smooth' });
    }
  };

  if (setsLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <p className="text-xl">Loading photo sets...</p>
      </div>
    );
  }

  if (setsError || setNames.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <p className="text-xl text-red-500">
          {setsError || "No photo sets found. Please add images to subdirectories in the pictures folder."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header - Only shown in thumbnail mode */}
      {!isSlideshow && (
        <header className="p-4 bg-gray-800 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Photo Frame</h1>
            <div className="flex gap-2">
              <button 
                onClick={toggleSlideshow} 
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                {isSlideshow ? 'View Thumbnails' : 'View Slideshow'}
              </button>
            </div>
          </div>
          {/* Photo set selector */}
          <Tabs 
            value={currentSetIndex.toString()} 
            onValueChange={handleSetChange}
            className="w-full"
          >
            <TabsList className="w-full flex justify-start overflow-x-auto">
              {setNames.map((set, index: number) => (
                <TabsTrigger 
                  key={index} 
                  value={index.toString()}
                  className="flex-shrink-0"
                >
                  {set}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </header>
      )}
      {/* Main content */}
      {isSlideshow ? (
        <div className="relative flex-1 flex items-center justify-center">
          {imagesLoading ? (
            <p className="text-xl">Loading images...</p>
          ) : imagesError ? (
            <p className="text-xl text-red-500">{imagesError}</p>
          ) : images.length > 0 ? (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <LazyImage 
                  src={images[currentIndex].src} 
                  alt={images[currentIndex].alt} 
                  className="h-full w-full object-contain"
                />
              </div>
              {/* Left click/tap area for navigation */}
              <div 
                className="absolute left-0 top-0 w-1/4 h-full cursor-pointer z-10"
                onClick={goToPrevious}
                aria-label="Previous image"
              />
              {/* Right click/tap area for navigation */}
              <div 
                className="absolute right-0 top-0 w-1/4 h-full cursor-pointer z-10"
                onClick={goToNext}
                aria-label="Next image"
              />
              {/* Play/pause button - repositioned to top-right in slideshow mode */}
              <button 
                onClick={togglePlayPause} 
                className="absolute top-4 right-4 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-20"
              >
                {isPlaying ? <Pause size={24} /> : <Play size={24} />}
              </button>
              {/* View Thumbnails button - positioned in top-left in slideshow mode */}
              <button 
                onClick={toggleSlideshow} 
                className="absolute top-4 left-4 px-3 py-2 bg-black/50 rounded hover:bg-black/70 transition-colors z-20 text-sm"
              >
                View Thumbnails
              </button>
              <button 
                onClick={goToPrevious} 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-20"
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={goToNext} 
                className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors z-20"
              >
                <ChevronRight size={24} />
              </button>
            </>
          ) : (
            <p className="text-xl">No images found in this set.</p>
          )}
        </div>
      ) : (
        <div className="flex-1 p-4 grid gap-2 bg-gray-900 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', display: 'grid', maxHeight: '100vh'}} ref={thumbGridRef}>
          {imagesLoading ? (
            <p className="text-xl">Loading images...</p>
          ) : imagesError ? (
            <p className="text-xl text-red-500">{imagesError}</p>
          ) : images.length > 0 ? (
            images.map((img, idx) => (
              <div key={idx} className="cursor-pointer" onClick={() => selectImage(idx)}>
                <LazyImage src={img.thumbnail || img.src} alt={img.alt} className="w-40 h-40 object-cover" />
              </div>
            ))
          ) : (
            <p className="text-xl">No images found in this set.</p>
          )}
        </div>
      )}
      {/* スクロール先頭・末尾ボタン（サムネイルモードでのみ表示）*/}
      {!isSlideshow && (
        <>
          <button
            onClick={scrollToFirst}
            className="fixed bottom-24 right-4 bg-black/50 text-white rounded-full p-3 mb-2 shadow-lg hover:bg-black/70 transition-colors z-30"
            style={{backdropFilter: 'blur(4px)'}}
            aria-label="最初に移動"
          >
            ⬆
          </button>
          <button
            onClick={scrollToLast}
            className="fixed bottom-4 right-4 bg-black/50 text-white rounded-full p-3 shadow-lg hover:bg-black/70 transition-colors z-30"
            style={{backdropFilter: 'blur(4px)'}}
            aria-label="最後に移動"
          >
            ⬇
          </button>
        </>
      )}
    </div>
  );
}

export default App;
