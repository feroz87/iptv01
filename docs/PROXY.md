# Proxy Layer Configuration

This application includes a built-in proxy layer that routes all streaming requests through your Next.js server, effectively hiding your IP address from content sources and your ISP.

## How It Works

### Architecture

```
Your Browser → Next.js API Proxy → Content Source
     ↓              ↓                      ↓
  Your IP    Server IP (hidden)    Only sees server IP
```

1. **API Proxy** (`/api/proxy/api`): Routes all API requests (search, content metadata) through the server
2. **Stream Proxy** (`/api/proxy/stream`): Routes all video streaming through the server

### Benefits

- ✅ **IP Privacy**: Your ISP only sees connections to your own server, not content sources
- ✅ **No Direct Connections**: All traffic goes through your server first
- ✅ **Automatic**: Enabled by default, no configuration needed
- ✅ **Secure**: Includes SSRF protection and URL validation

## Configuration

The proxy is enabled by default. To disable it (not recommended), edit `lib/api.ts`:

```typescript
const USE_PROXY = false; // Disables proxy (not recommended)
```

## Technical Details

### API Proxy (`app/api/proxy/api/route.ts`)
- Proxies all API requests to PopcornTime/FilmPlus APIs
- Adds proper headers and user-agent
- Caches responses for 5 minutes
- Handles CORS automatically

### Stream Proxy (`app/api/proxy/stream/route.ts`)
- Streams video content through the server
- Supports HTTP/HTTPS protocols only
- Includes proper streaming headers
- Handles redirects and errors gracefully

### Security Features

1. **URL Validation**: Only allows http/https protocols
2. **SSRF Protection**: Validates all URLs before proxying
3. **Timeout Protection**: 30-second timeout for streams
4. **Error Handling**: Graceful error handling with proper status codes

## Performance Considerations

- **Bandwidth**: Your server will use bandwidth to proxy streams
- **Server Load**: Streaming through proxy increases server load
- **Latency**: Small increase in latency due to extra hop

For production deployments:
- Consider using a CDN or dedicated proxy service
- Monitor server bandwidth usage
- Use a server with good bandwidth allocation

## Troubleshooting

### Stream Not Loading Through Proxy

1. Check server logs for errors
2. Verify the original stream URL is accessible
3. Check server bandwidth limits
4. Ensure Next.js API routes are working

### High Server Bandwidth Usage

- This is expected when proxying streams
- Consider upgrading server bandwidth
- Or disable proxy (not recommended for privacy)

## Legal Note

⚠️ The proxy layer provides technical privacy but does not change the legal status of streaming content. Ensure you comply with local laws and regulations.

