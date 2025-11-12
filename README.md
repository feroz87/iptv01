# IPTV Streaming Application

A modern web-based IPTV application that allows you to stream movies and TV shows directly from PopcornTime/FilmPlus servers without requiring P2P/torrent downloads.

## Features

- 🎬 **Browse Movies & TV Shows** - Discover popular content from multiple sources
- 🔍 **Search Functionality** - Search for movies and TV shows by title
- 📺 **Direct Streaming** - Stream content directly without downloading
- 🔒 **Built-in Proxy Layer** - All streaming routes through your server to protect your IP address
- 🎨 **Modern UI** - Beautiful, responsive interface built with Next.js and Tailwind CSS
- ⚡ **Fast Performance** - Optimized for quick loading and smooth playback
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **React Player** - Video player component
- **Axios** - HTTP client for API requests

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
# or
pnpm install
```

2. Run the development server:
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

### Building for Production

```bash
npm run build
npm start
```

## Usage

1. **Browse Content**: The homepage displays popular movies and TV shows
2. **Search**: Use the search bar to find specific titles
3. **Filter**: Switch between "All Content", "Movies", or "TV Shows" tabs
4. **Watch**: Click on any content card to start streaming
5. **Close Player**: Press ESC or click the X button to close the video player

## API Integration

The application connects to PopcornTime API endpoints to fetch content metadata and streaming URLs. The API service layer (`lib/api.ts`) handles:

- Fetching popular movies and TV shows
- Searching content
- Getting detailed information
- Retrieving streaming URLs

## 🔒 Proxy Layer & Privacy Protection

**All streaming requests are automatically routed through your Next.js server**, which means:

- ✅ **Your IP is hidden** from content sources and your ISP
- ✅ **No direct connections** to streaming servers from your browser
- ✅ **Automatic protection** - enabled by default, no configuration needed
- ✅ **Secure** - includes SSRF protection and URL validation

### How It Works

```
Your Browser → Next.js API Proxy → Content Source
     ↓              ↓                      ↓
  Your IP    Server IP (hidden)    Only sees server IP
```

The proxy layer consists of:
- **API Proxy** (`/api/proxy/api`) - Routes all API requests through the server
- **Stream Proxy** (`/api/proxy/stream`) - Routes all video streaming through the server

Your ISP will only see connections to your own server, not the content sources. See `docs/PROXY.md` for detailed documentation.

⚠️ **Note**: The proxy increases server bandwidth usage as all streams go through your server. Ensure your hosting plan has adequate bandwidth.

## Important Notes

⚠️ **Legal Disclaimer**: This application is for educational purposes. Ensure you have the right to stream content in your jurisdiction. The application connects to third-party APIs and does not host any content itself.

⚠️ **Streaming URLs**: Some content may provide magnet links instead of direct streaming URLs. You may need to configure additional streaming proxy services for full compatibility.

## Project Structure

```
├── app/
│   ├── api/
│   │   └── proxy/
│   │       ├── api/route.ts      # API proxy endpoint
│   │       └── stream/route.ts   # Stream proxy endpoint
│   ├── layout.tsx                 # Root layout
│   ├── page.tsx                   # Homepage
│   └── globals.css                # Global styles
├── components/
│   ├── ContentCard.tsx            # Movie/TV show card component
│   ├── VideoPlayer.tsx            # Video player component
│   └── EpisodeSelector.tsx       # TV show episode selector
├── lib/
│   └── api.ts                     # API service layer
└── docs/
    └── PROXY.md                   # Proxy layer documentation
```

## Customization

### Disabling Proxy (Not Recommended)

To disable the proxy layer (not recommended for privacy), edit `lib/api.ts`:

```typescript
const USE_PROXY = false; // Disables proxy
```

⚠️ **Warning**: Disabling the proxy exposes your IP address to content sources and your ISP.

### Styling

Modify `tailwind.config.js` to customize colors and theme:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        // Your color palette
      },
    },
  },
}
```

## Troubleshooting

### Stream Not Loading

- Check your internet connection
- Verify the API endpoints are accessible
- Some content may require additional proxy configuration

### CORS Issues

The application includes CORS headers in `next.config.js`. If you encounter CORS errors, you may need to configure a proxy server.

## License

This project is provided as-is for educational purposes.

## Contributing

Feel free to submit issues and enhancement requests!

