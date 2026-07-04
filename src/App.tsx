import React, { useState, useMemo, useRef, useEffect } from 'react'
import './App.css'
import { ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Slider } from '@/components/ui/slider'
import { usePhotoSetNames } from '@/lib/lazy-image-utils'
import { useImagesForImageSet, seededShuffle } from '@/lib/image-utils'
import { LazyImage } from './components/lazy-image'
import { FavoriteButton } from './components/FavoriteButton'
import { useFavorites, extractPrefix } from './lib/favorites-utils'
import { globalRequestQueue } from './lib/RequestQueue'

// Slideshow interval steps (ms); default is the centered value.
const INTERVAL_STEPS = [1000, 3000, 5000, 7000, 9000];
const DEFAULT_INTERVAL_INDEX = 2;

function App() {
  const { setNames, loading: setsLoading, error: setsError } = usePhotoSetNames();
  const { prefixStates, refreshKey, addFavorite, removeFavorite, reactivateFavorite } = useFavorites();
  const [activeTab, setActiveTab] = useState('0'); // Default to first real photo set
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sortMode, setSortMode] = useState<'author' | 'random'>('author');
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const [intervalIndex, setIntervalIndex] = useState(DEFAULT_INTERVAL_INDEX);

  const currentSetName = activeTab.startsWith('__')
    ? activeTab
    : setNames[parseInt(activeTab)] || '';

  const isVirtualSet = currentSetName.startsWith('__');
  // Virtual sets (favorites/oldfav) shuffle in the backend via seeded PRNG;
  // regular sets load in natural order and are shuffled client-side below.
  const hookSortMode = isVirtualSet ? sortMode : 'author';
  const { images, loading: imagesLoading, error: imagesError, hasMore, loadMore } = useImagesForImageSet(currentSetName, refreshKey, hookSortMode);

  const displayImages = useMemo(() => {
    if (sortMode === 'random' && !isVirtualSet) {
      return seededShuffle(images, shuffleSeed);
    }
    return images;
  }, [images, sortMode, isVirtualSet, shuffleSeed]);

  const prefetchedRef = useRef<Set<string>>(new Set());

  // Reset image index and slideshow when set changes
  React.useEffect(() => {
    globalRequestQueue.setSetKey();
    prefetchedRef.current.clear();
    setIsPlaying(false);
    setCurrentIndex(0);
  }, [currentSetName]);

  // Reset index when the ordering changes (sort toggle / reshuffle)
  React.useEffect(() => {
    setCurrentIndex(0);
  }, [sortMode, shuffleSeed]);

  // Slideshow timer
  React.useEffect(() => {
    if (!isPlaying || displayImages.length === 0) return;
    const interval = window.setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % displayImages.length);
    }, INTERVAL_STEPS[intervalIndex]);
    return () => clearInterval(interval);
  }, [isPlaying, displayImages.length, intervalIndex]);

  // Background-prefetch the next 1-2 images so the browser HTTP cache is warm
  // by the time useLazyImage fetches the same URL when the slide advances.
  React.useEffect(() => {
    if (!isSlideshow || displayImages.length === 0) return;
    for (let step = 1; step <= 2; step++) {
      const next = displayImages[(currentIndex + step) % displayImages.length];
      const url = next?.src;
      if (url && !prefetchedRef.current.has(url)) {
        prefetchedRef.current.add(url);
        // Consume the body so the response is fully downloaded and stored in
        // the HTTP cache (Safari/WebKit won't cache an unread fetch body).
        fetch(url)
          .then((r) => r.blob())
          .catch(() => prefetchedRef.current.delete(url));
      }
    }
  }, [currentIndex, displayImages, isSlideshow]);

  const gridRef = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  // Infinite scroll for virtual sets (thumbnail mode)
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !hasMore) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = grid;
      if (scrollHeight - scrollTop - clientHeight < 500) {
        loadMoreRef.current();
      }
    };

    grid.addEventListener('scroll', handleScroll, { passive: true });
    return () => grid.removeEventListener('scroll', handleScroll);
  }, [hasMore]);

  // Prefetch upcoming images when slideshow nears the end of loaded set
  useEffect(() => {
    if (!isSlideshow || !hasMore || displayImages.length === 0) return;
    if (currentIndex >= displayImages.length - 5) {
      loadMoreRef.current();
    }
  }, [currentIndex, displayImages.length, isSlideshow, hasMore]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + displayImages.length) % displayImages.length);
  }

  const goToNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % displayImages.length);
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
    setActiveTab(value);
  }

  // Build tab list: virtual tabs + photo set tabs
  const allTabs = useMemo(() => [
    { id: '__favorites__', label: '★ Favorites' },
    { id: '__oldfav__', label: 'Old Favs' },
    ...setNames.map((name, i) => ({ id: String(i), label: name })),
  ], [setNames]);

  // Get filename for the current slideshow image (for star button state)
  const currentImageFilename = displayImages.length > 0 && currentIndex < displayImages.length
    ? (displayImages[currentIndex].filename || displayImages[currentIndex].src.split('/').pop() || displayImages[currentIndex].alt)
    : '';
  const currentPrefix = currentImageFilename ? extractPrefix(currentImageFilename) : '';
  const currentStarState = currentPrefix ? prefixStates[currentPrefix] : undefined;

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
            <div className="flex gap-2 items-center">
              <div className="flex gap-1 mr-4">
                <button
                  onClick={() => setSortMode('author')}
                  className={`px-3 py-1 text-sm rounded transition-colors ${sortMode === 'author' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                >
                  By Author
                </button>
                <button
                  onClick={() => {
                    setSortMode('random');
                    setShuffleSeed(Math.floor(Math.random() * 2147483647));
                  }}
                  className={`px-3 py-1 text-sm rounded transition-colors ${sortMode === 'random' ? 'bg-blue-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                >
                  Random
                </button>
              </div>
              <button
                onClick={toggleSlideshow}
                className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                View Slideshow
              </button>
            </div>
          </div>
          {/* Photo set selector */}
          <Tabs
            value={activeTab}
            onValueChange={handleSetChange}
            className="w-full"
          >
            <TabsList className="w-full flex justify-start overflow-x-auto">
              {allTabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex-shrink-0"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </header>
      )}
      {/* Main content */}
      {isSlideshow ? (
        <div className="relative flex-1 flex items-center justify-center">
          {imagesLoading && displayImages.length === 0 ? (
            <p className="text-xl">Loading images...</p>
          ) : imagesError ? (
            <p className="text-xl text-red-500">{imagesError}</p>
          ) : displayImages.length > 0 ? (
            <>
              <div className="absolute inset-0 flex items-center justify-center">
                <LazyImage
                  src={displayImages[currentIndex].src}
                  alt={displayImages[currentIndex].alt}
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
              {/* Star/favorite button - top-right area */}
              <div className="absolute top-4 right-16 z-20">
                <FavoriteButton
                  filename={currentImageFilename}
                  state={currentStarState}
                  onAdd={addFavorite}
                  onRemove={removeFavorite}
                  onReactivate={reactivateFavorite}
                />
              </div>
              {/* Play/pause button */}
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
              {/* Slideshow interval slider - subtle, bottom-center */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 px-4 py-2 rounded-full bg-black/30 backdrop-blur-sm opacity-50 hover:opacity-100 transition-opacity">
                <Slider
                  min={0}
                  max={INTERVAL_STEPS.length - 1}
                  step={1}
                  value={[intervalIndex]}
                  onValueChange={([v]) => setIntervalIndex(v)}
                  className="w-48"
                />
                <span className="text-xs text-gray-300 tabular-nums w-6 text-right">
                  {INTERVAL_STEPS[intervalIndex] / 1000}s
                </span>
              </div>
            </>
          ) : (
            <p className="text-xl">No images found in this set.</p>
          )}
        </div>
      ) : (
        <>
          <div ref={gridRef} className="flex-1 p-4 grid gap-2 bg-gray-900 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900" style={{gridTemplateColumns: 'repeat(auto-fit, minmax(10rem, 1fr))', display: 'grid', maxHeight: '100vh'}}>
            {imagesLoading && displayImages.length === 0 ? (
              <p className="text-xl">Loading images...</p>
            ) : imagesError ? (
              <p className="text-xl text-red-500">{imagesError}</p>
            ) : displayImages.length > 0 ? (
              displayImages.map((img, idx) => (
                <div key={idx} className="cursor-pointer" onClick={() => selectImage(idx)}>
                  <LazyImage src={img.thumbnail || img.src} alt={img.alt} className="w-40 h-40 object-cover" />
                </div>
              ))
            ) : (
              <p className="text-xl">No images found in this set.</p>
            )}
          </div>
          {/* Scroll to top/bottom buttons (only shown in thumbnail mode) */}
          <button
            onClick={() => {
              const grid = document.querySelector('.overflow-y-auto');
              if (grid) grid.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="fixed bottom-24 right-4 bg-black/50 text-white rounded-full p-3 mb-2 shadow-lg hover:bg-black/70 transition-colors z-30"
            style={{backdropFilter: 'blur(4px)'}}
            aria-label="Scroll to top"
          >
            ⬆
          </button>
          <button
            onClick={() => {
              const grid = document.querySelector('.overflow-y-auto');
              if (grid) grid.scrollTo({ top: grid.scrollHeight, behavior: 'smooth' });
            }}
            className="fixed bottom-4 right-4 bg-black/50 text-white rounded-full p-3 shadow-lg hover:bg-black/70 transition-colors z-30"
            style={{backdropFilter: 'blur(4px)'}}
            aria-label="Scroll to bottom"
          >
            ⬇
          </button>
        </>
      )}
    </div>
  );
}

export default App;
