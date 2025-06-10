# Web Photo Frame

A modern web-based digital photo frame application built with React and Express. Features lazy loading, automatic thumbnail generation, memory-optimized image handling, and both slideshow and gallery viewing modes with automatic retry mechanisms for reliable performance.

## ✨ Features

### Frontend
- **React 18** with TypeScript and Vite for fast development
- **Tailwind CSS** with Radix UI components for modern, accessible design
- **Lazy Loading**: Images load only when visible with intersection observer
- **Memory Management**: Automatic ObjectURL cleanup to prevent memory leaks
- **Automatic Retry**: Failed image loads retry automatically with visual feedback
- **Slideshow Mode**: Auto-advancing slideshow with configurable intervals
- **Gallery Mode**: Responsive thumbnail grid with smooth scrolling
- **Request Queue**: Concurrent request limiting for optimal performance

### Backend
- **Express.js** server with TypeScript
- **Sharp** for high-quality thumbnail generation
- **HTTP Caching**: ETags, Last-Modified, and Cache-Control headers
- **Compression**: Gzip compression for non-image assets
- **Range Requests**: Support for partial downloads
- **Fast Static Serving**: Optimized endpoints for parallel image requests
- **Automatic Metadata**: JSON caching for image set information

### Performance Optimizations
- **Concurrent Request Control**: Maximum 10 simultaneous image requests
- **Thumbnail Caching**: Generated thumbnails stored persistently
- **Memory Leak Prevention**: Proper cleanup of blob URLs and resources
- **HTTP/2 Ready**: Optimized for modern browsers and protocols

---

## 🏗️ Project Structure

```
web-photo-frame/
├── backend/                    # Express.js backend server
│   ├── src/
│   │   ├── routes/
│   │   │   ├── image-routes.ts # Image metadata and thumbnail generation
│   │   │   └── static-routes.ts # Fast static file serving with caching
│   │   ├── server.ts           # Main server with compression & optimization
│   │   ├── types.ts            # TypeScript interfaces
│   │   └── build.ts            # Build utilities
│   ├── package.json
│   └── tsconfig.json
├── src/                        # React frontend
│   ├── components/
│   │   ├── lazy-image.tsx      # Lazy loading with retry logic
│   │   └── ui/                 # Radix UI components
│   ├── hooks/
│   │   ├── use-lazy-image.ts   # Image loading with memory management
│   │   ├── use-mobile.tsx      # Mobile responsiveness
│   │   └── use-toast.ts        # Toast notifications
│   ├── lib/
│   │   ├── RequestQueue.ts     # Concurrent request management
│   │   ├── image-utils.ts      # Image loading utilities
│   │   ├── lazy-image-utils.ts # Lazy loading helpers
│   │   └── utils.ts            # General utilities
│   ├── App.tsx                 # Main application component
│   └── main.tsx               # Application entry point
├── public/
│   ├── pictures/               # Source images organized by sets
│   │   ├── nature/
│   │   ├── cities/
│   │   └── ...
│   └── thumbnails/             # Auto-generated thumbnails (150x100)
│       ├── nature/
│       ├── cities/
│       └── ...
├── package.json
└── vite.config.ts             # Vite config with backend proxy
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**

### 1. Install Dependencies

#### Frontend Dependencies
```bash
npm install
```

#### Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 2. Add Your Images

Create image sets by adding folders to `public/pictures/`:

```
public/pictures/
├── nature/
│   ├── landscape1.jpg
│   ├── sunset.png
│   └── forest.jpeg
├── cities/
│   ├── tokyo.jpg
│   └── paris.png
└── family/
    ├── vacation.jpg
    └── birthday.png
```

**Supported formats**: JPG, JPEG, PNG, GIF
**Thumbnails**: Generated automatically (150x100px) and cached

---

## 🛠️ Development

### Start Development Servers

#### Backend Server
```bash
cd backend
npm run dev
```
- Runs on http://localhost:3000
- Auto-restarts on file changes
- Serves API and static files

#### Frontend Server
```bash
npm run dev
```
- Runs on http://localhost:5173
- Hot module replacement enabled
- Proxies API requests to backend

### Development Workflow

1. **Add images** to `public/pictures/[set-name]/`
2. **Restart backend** to regenerate thumbnails
3. **Use refresh button** in UI to reload image sets
4. **View logs** in browser console for debugging

---

## 📦 Production Build

### Build Frontend
```bash
npm run build
```
Outputs optimized static files to `dist/`

### Build & Deploy Backend
```bash
cd backend
npm run build
npm start
```

The backend serves:
- **Frontend** from `dist/` directory
- **API endpoints** at `/api/*`
- **Static images** with optimized caching
- **Thumbnails** with fast serving

---

## 🔌 API Endpoints

### Image Metadata
- `GET /api/photo-sets`
  - Returns array of available image set names
  - Example: `["nature", "cities", "family"]`

- `GET /api/image-sets/:setName`
  - Returns image metadata for specified set
  - Includes src, thumbnail, and alt text
  - Generates thumbnails if missing
  - Caches metadata as JSON

### Fast Static Serving
- `GET /api/fast-pictures/:set/:filename`
  - Optimized image serving with HTTP caching
  - Supports range requests for large files
  - ETags and Last-Modified headers

- `GET /api/fast-thumbnails/:set/:filename`
  - Fast thumbnail serving
  - 1-day cache headers
  - Compressed response when beneficial

### Legacy Static Routes
- `GET /pictures/:set/:filename` - Direct image access
- `GET /thumbnails/:set/:filename` - Direct thumbnail access

---

## ⚙️ Configuration

### Performance Tuning

**Request Concurrency** (RequestQueue.ts):
```typescript
export const globalRequestQueue = new RequestQueue(10); // Max concurrent requests
```

**Cache Duration** (static-routes.ts):
```typescript
await serveStaticFile(req, res, filePath, 86400); // 1 day cache
```

**Thumbnail Size** (image-routes.ts):
```typescript
.resize(150, 100, { fit: 'cover' }) // Thumbnail dimensions
```

### Slideshow Settings

Configure in App.tsx:
- **Interval**: Time between slides
- **Auto-start**: Start slideshow automatically
- **Transition**: Fade or slide effects

---

## 🔧 Troubleshooting

### Common Issues

**Images not loading:**
- Check file permissions in `public/pictures/`
- Verify image formats (JPG, PNG, GIF supported)
- Check browser console for network errors

**Thumbnails missing:**
- Restart backend server to regenerate
- Check `public/thumbnails/` directory permissions
- Verify Sharp library installation

**Memory issues:**
- Monitor browser DevTools memory tab
- Check for proper ObjectURL cleanup
- Adjust request concurrency if needed

**Performance problems:**
- Enable compression middleware
- Check image file sizes (consider optimization)
- Monitor network requests in DevTools

### Debug Mode

Enable verbose logging:
```typescript
// In use-lazy-image.ts
console.log('Loading image:', url);
console.log('Retry attempt:', retryCount);
```

---

## 🎨 Customization

### Styling
- **Tailwind Config**: Modify `tailwind.config.js`
- **Components**: Edit files in `src/components/ui/`
- **Global Styles**: Update `src/index.css`

### Features
- **Add new image formats**: Update Sharp configuration
- **Modify thumbnail size**: Change Sharp resize parameters
- **Custom retry logic**: Edit `lazy-image.tsx`

### API Extensions
- **Add metadata fields**: Extend interfaces in `types.ts`
- **Custom routes**: Add to `backend/src/routes/`
- **Database integration**: Replace file-based storage

---

## 📄 License

MIT License - see LICENSE file for details

---

## 👨‍💻 Author

**ryo_grid**

---

## 🔗 Resources

- [Project Documentation](https://deepwiki.com/ryogrid/web-photo-frame)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Sharp Image Processing](https://sharp.pixelplumbing.com/)