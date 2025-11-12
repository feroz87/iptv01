import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

// Proxy endpoint to fetch torrent files (bypasses CORS)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const torrentUrl = searchParams.get('url');

  if (!torrentUrl) {
    return NextResponse.json(
      { error: 'Torrent URL is required' },
      { status: 400 }
    );
  }

  try {
    // Validate URL
    let targetUrl: URL;
    try {
      targetUrl = new URL(torrentUrl);
      if (!['http:', 'https:'].includes(targetUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    // Fetch the torrent file
    const response = await axios({
      method: 'GET',
      url: targetUrl.toString(),
      responseType: 'arraybuffer',
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/x-bittorrent, */*',
      },
    });

    // Return the torrent file with proper headers
    return new NextResponse(response.data, {
      headers: {
        'Content-Type': 'application/x-bittorrent',
        'Content-Disposition': `attachment; filename="torrent.torrent"`,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
      },
    });
  } catch (error: any) {
    console.error('Error fetching torrent file:', error);
    return NextResponse.json(
      { error: `Failed to fetch torrent file: ${error.message}` },
      { status: 500 }
    );
  }
}

