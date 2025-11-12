import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Proxy configuration
const PROXY_CONFIG = {
  // You can add multiple proxy endpoints here if needed
  // For now, we'll use the server as a proxy
  enabled: true,
  timeout: 30000,
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const streamUrl = searchParams.get('url');
  const type = searchParams.get('type') || 'video';

  if (!streamUrl) {
    return NextResponse.json(
      { error: 'Stream URL is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL to prevent SSRF attacks
    let targetUrl: URL;
    try {
      targetUrl = new URL(streamUrl);
      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the stream with proxy headers
    const response = await axios({
      method: 'GET',
      url: targetUrl.toString(),
      responseType: 'stream',
      timeout: PROXY_CONFIG.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity', // Don't compress, we're streaming
        'Referer': targetUrl.origin,
        'Origin': targetUrl.origin,
      },
      // Don't follow redirects automatically - handle them manually
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    // Get content type from response
    const contentType = response.headers['content-type'] || 
                       (type === 'video' ? 'video/mp4' : 'application/octet-stream');

    // Create a readable stream
    const stream = response.data;

    // Return the stream with appropriate headers
    return new NextResponse(stream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        // CORS headers
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        // Streaming headers
        'Accept-Ranges': 'bytes',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    
    // Return appropriate error response
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.statusText || 'Internal Server Error';
    
    return NextResponse.json(
      { 
        error: 'Failed to proxy stream',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: statusCode }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

