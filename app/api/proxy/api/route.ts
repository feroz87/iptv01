import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// PopcornTime API endpoints for fallback
// Only include endpoints that are known to work
const POPCORN_TIME_APIS = [
  'https://tv-v2.api-fetch.website', // Primary endpoint (slow but working)
  // Removed non-working endpoints: tv-v2.api-fetch.sh, tv.api-fetch.website, tv.api-fetch.sh
];

// Proxy API requests to hide IP from content sources
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const apiUrl = searchParams.get('url');
  const endpoint = searchParams.get('endpoint');
  const baseUrl = searchParams.get('baseUrl') || POPCORN_TIME_APIS[0];

  if (!apiUrl && !endpoint) {
    return NextResponse.json(
      { error: 'API URL or endpoint is required' },
      { status: 400 }
    );
  }

  // Try multiple endpoints if the first one fails
  let lastError: any = null;
  const endpointsToTry = baseUrl && baseUrl !== POPCORN_TIME_APIS[0] 
    ? [baseUrl, ...POPCORN_TIME_APIS.filter(api => api !== baseUrl)]
    : POPCORN_TIME_APIS;
  
  for (let i = 0; i < endpointsToTry.length; i++) {
    const apiBase = endpointsToTry[i];
    try {
      let targetUrl: string;
      
      if (apiUrl) {
        // Validate URL
        try {
          const url = new URL(apiUrl);
          if (!['http:', 'https:'].includes(url.protocol)) {
            throw new Error('Invalid protocol');
          }
          targetUrl = apiUrl;
        } catch (error) {
          return NextResponse.json(
            { error: 'Invalid URL format' },
            { status: 400 }
          );
        }
      } else if (endpoint) {
        // Build URL from endpoint using current API base
        targetUrl = `${apiBase}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      } else {
        return NextResponse.json(
          { error: 'Either API URL or endpoint is required' },
          { status: 400 }
        );
      }

      // Log which endpoint we're trying (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.log(`[API Proxy] Trying endpoint ${i + 1}/${endpointsToTry.length}: ${apiBase}`);
      }

      const response = await axios({
        method: 'GET',
        url: targetUrl,
        params: Object.fromEntries(
          Array.from(searchParams.entries()).filter(([key]) => 
            !['url', 'endpoint', 'baseUrl'].includes(key)
          )
        ),
        timeout: 20000, // Increased timeout since the API is slow
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (process.env.NODE_ENV === 'development') {
        console.log(`[API Proxy] Success with ${apiBase}`);
      }

      return NextResponse.json(response.data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cache-Control': 'public, max-age=300', // Cache API responses for 5 minutes
        },
      });
    } catch (error: any) {
      lastError = error;
      
      // Log the error (only in development)
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[API Proxy] Failed with ${apiBase}: ${error.code || error.message}`);
      }
      
      // If it's not a network/DNS error, don't try other endpoints
      if (error.code !== 'ENOTFOUND' && error.code !== 'ECONNREFUSED' && error.code !== 'EAI_AGAIN' && error.response?.status < 500) {
        break;
      }
      
      // If this is the last API, break
      if (i === endpointsToTry.length - 1) {
        break;
      }
      
      // Try next API endpoint
      continue;
    }
  }

  // All endpoints failed
  console.error('API Proxy error (all endpoints failed):', lastError?.message || 'Unknown error');
  
  const statusCode = lastError?.response?.status || 500;
  const errorMessage = lastError?.response?.statusText || lastError?.message || 'Internal Server Error';
  
  return NextResponse.json(
    { 
      error: 'Failed to proxy API request',
      message: errorMessage,
      code: lastError?.code,
    },
    { status: statusCode }
  );
}

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

