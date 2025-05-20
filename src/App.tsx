import { useState, useEffect } from 'react'
import './App.css'
import { ChevronLeft, ChevronRight, Play, Pause, RefreshCw } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useImageSets } from '@/lib/image-utils'

function App() {
  const { imageSets, loading, error, refreshImageSets, lastRefreshed } = useImageSets();
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSlideshow, setIsSlideshow] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [slideshowInterval, setSlideshowInterval] = useState<number | null>(null);

  const currentSet = imageSets[currentSetIndex] || { name: '', images: [] };
  const images = currentSet.images;

  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(false);
  }, [currentSetIndex]);

  useEffect(() => {
    if (isPlaying && images.length > 0) {
      const interval = window.setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
      }, 3000);
      setSlideshowInterval(interval);
    } else if (slideshowInterval !== null) {
      clearInterval(slideshowInterval);
      setSlideshowInterval(null);
    }

    return () => {
      if (slideshowInterval !== null) {
        clearInterval(slideshowInterval);
      }
    }
  }, [isPlaying, images.length]);

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
    if (!isNaN(index) && index >= 0 && index < imageSets.length) {
      setCurrentSetIndex(index);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <p className="text-xl">Loading photo sets...</p>
      </div>
    );
  }

  if (error || imageSets.length === 0) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
        <p className="text-xl text-red-500">
          {error || "No photo sets found. Please add images to subdirectories in the pictures folder."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
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
            {isSlideshow && (
              <button 
                onClick={togglePlayPause} 
                className="p-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                {isPlaying ? <Pause size={20} /> : <Play size={20} />}
              </button>
            )}
            <button 
              onClick={() => refreshImageSets()} 
              className="p-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors"
              title="Refresh photo sets"
            >
              <RefreshCw size={20} />
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
            {imageSets.map((set, index) => (
              <TabsTrigger 
                key={index} 
                value={index.toString()}
                className="flex-shrink-0"
              >
                {set.name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4 flex flex-col">
        {isSlideshow ? (
          <div className="relative flex-1 flex items-center justify-center">
            {images.length > 0 ? (
              <>
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src={images[currentIndex].src} 
                    alt={images[currentIndex].alt} 
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
                  {images.map((_, index) => (
                    <button 
                      key={index} 
                      className={`w-3 h-3 rounded-full ${index === currentIndex ? 'bg-white' : 'bg-gray-500'}`}
                      onClick={() => setCurrentIndex(index)}
                    />
                  ))}
                </div>
                <button 
                  onClick={goToPrevious} 
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                  onClick={goToNext} 
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            ) : (
              <p className="text-xl">No images found in this set.</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4">
            {images.map((image, index) => (
              <div 
                key={index} 
                className={`relative cursor-pointer overflow-hidden rounded-lg ${index === currentIndex ? 'ring-4 ring-blue-500' : ''}`}
                onClick={() => selectImage(index)}
              >
                <img 
                  src={image.src} 
                  alt={image.alt} 
                  className="w-full h-64 object-cover"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-white text-lg font-medium">View</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 bg-gray-800 text-center text-sm">
        <p>Photo Frame App - Images from Unsplash</p>
        {lastRefreshed && <p className="text-xs text-gray-400">Last refreshed: {lastRefreshed.toLocaleTimeString()}</p>}
      </footer>
    </div>
  )
}

export default App
