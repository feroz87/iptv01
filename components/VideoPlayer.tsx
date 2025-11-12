'use client';

// Polyfill global for WebTorrent
if (typeof window !== 'undefined' && typeof (window as any).global === 'undefined') {
  (window as any).global = globalThis;
}

import { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import ReactPlayer from 'react-player';
import { streamingAPI, StreamSource } from '@/lib/api';

interface VideoPlayerProps {
  type: 'movie' | 'show';
  id: string;
  title: string;
  season?: number;
  episode?: number;
  onClose: () => void;
}

export default function VideoPlayer({
  type,
  id,
  title,
  season,
  episode,
  onClose,
}: VideoPlayerProps) {
  const [streamSource, setStreamSource] = useState<StreamSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [torrentProgress, setTorrentProgress] = useState(0);
  const [torrentSpeed, setTorrentSpeed] = useState<string>('');
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [webtorrentLoaded, setWebtorrentLoaded] = useState(false);
  const clientRef = useRef<any>(null);
  const torrentRef = useRef<any>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Load WebTorrent on client side
    if (typeof window !== 'undefined' && !webtorrentLoaded) {
      import('webtorrent').then(() => {
        setWebtorrentLoaded(true);
      });
    }
  }, [webtorrentLoaded]);

  useEffect(() => {
    loadStream();
    
    // Listen for page unload/refresh to close player
    const handleBeforeUnload = () => {
      onClose();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup WebTorrent client on unmount
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      if (torrentRef.current) {
        torrentRef.current.destroy();
        torrentRef.current = null;
      }
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
    };
  }, [id, type, season, episode, onClose]);

  const loadStream = async () => {
    setLoading(true);
    setError(null);
    setStreamUrl(null);
    setTorrentProgress(0);
    setTorrentSpeed('');
    
    // Cleanup previous torrent
    if (torrentRef.current) {
      torrentRef.current.destroy();
      torrentRef.current = null;
    }
    if (clientRef.current) {
      clientRef.current.destroy();
      clientRef.current = null;
    }
    
    try {
      let source: StreamSource | null = null;

      if (type === 'movie') {
        source = await streamingAPI.getMovieStream(id);
      } else if (type === 'show' && season && episode) {
        source = await streamingAPI.getEpisodeStream(id, season, episode);
      }

      if (source) {
        setStreamSource(source);
        
        // Check if it's a torrent/magnet link or YTS torrent download URL
        const isTorrent = source.isTorrent || 
                         source.url.startsWith('magnet:') || 
                         source.url.endsWith('.torrent') ||
                         source.url.includes('yts.mx/torrent/download') ||
                         source.url.includes('/torrent/download');
        
        if (isTorrent) {
          // Use server-side streaming for torrents (better peer connectivity)
          const serverStreamUrl = `/api/torrent/stream?url=${encodeURIComponent(source.url)}&quality=${source.quality || '1080p'}`;
          console.log('Using server-side torrent streaming:', serverStreamUrl);
          setStreamUrl(serverStreamUrl);
          setLoading(false);
          
          // Also try client-side as fallback (commented out for now)
          // await streamTorrent(source.url);
        } else {
          // Direct streaming URL
          setStreamUrl(source.proxyUrl || source.url);
          setLoading(false);
        }
      } else {
        setError('Stream not available. Please try another quality or content.');
        setLoading(false);
      }
    } catch (err) {
      setError('Failed to load stream. Please try again later.');
      console.error('Stream loading error:', err);
      setLoading(false);
    }
  };

  const streamTorrent = async (torrentUrl: string) => {
    try {
      console.log('Starting torrent stream for:', torrentUrl);
      
      // Wait for WebTorrent to load
      if (!webtorrentLoaded) {
        console.log('Loading WebTorrent...');
        await import('webtorrent');
        setWebtorrentLoaded(true);
        console.log('WebTorrent loaded');
      }

      const WebTorrent = (await import('webtorrent')).default;

      // Create WebTorrent client with options for better connectivity
      const client = new WebTorrent({
        maxConns: 55,
        utp: true,
        dht: true, // Enable DHT for peer discovery
        tracker: {
          // Enable both UDP and WebSocket trackers
          rtcConfig: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:stun1.l.google.com:19302' },
            ],
          },
        },
        // Additional options for better connectivity
        nodeId: undefined, // Let WebTorrent generate a random node ID
        peerId: undefined, // Let WebTorrent generate a random peer ID
      });
      clientRef.current = client;
      
      // Log DHT status
      console.log('WebTorrent client created, DHT enabled:', client.dht !== null);

      console.log('WebTorrent client created, adding torrent...');

      // Handle YTS torrent download URLs - fetch via proxy and pass as File/Buffer
      let torrentInput: string | File | Buffer | null = null;
      
      if (torrentUrl.includes('yts.mx/torrent/download') && !torrentUrl.startsWith('magnet:')) {
        console.log('Detected YTS torrent download URL, fetching via proxy...');
        try {
          // Fetch the torrent file via our proxy API to avoid CORS issues
          const proxyUrl = `/api/proxy/torrent?url=${encodeURIComponent(torrentUrl)}`;
          const response = await fetch(proxyUrl);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch torrent file: ${response.status} ${response.statusText}`);
          }
          
          // Get the torrent file as ArrayBuffer
          const torrentBuffer = await response.arrayBuffer();
          console.log('Torrent file fetched via proxy, size:', torrentBuffer.byteLength, 'bytes');
          
          // Convert ArrayBuffer to Buffer for WebTorrent
          // WebTorrent can accept Buffer objects directly
          const buffer = Buffer.from(torrentBuffer);
          console.log('Converted to Buffer, passing to WebTorrent');
          
          torrentInput = buffer;
        } catch (fetchError: any) {
          console.error('Error fetching torrent file:', fetchError);
          // Fallback: try using the URL directly (may fail due to CORS)
          console.log('Falling back to direct URL usage (may fail due to CORS)');
          torrentInput = torrentUrl;
        }
      } else {
        torrentInput = torrentUrl;
      }

      // Add torrent with error handling
      let torrent: any;
      try {
        if (torrentInput instanceof Buffer) {
          console.log('Adding torrent from Buffer, size:', torrentInput.length, 'bytes');
        } else {
          console.log('Adding torrent with URL:', (torrentInput as string).substring(0, 100));
        }
        
        // Add torrent with multiple trackers for better connectivity
        // WebTorrent can accept Buffer, File, or URL strings
        torrent = client.add(torrentInput as any, {
          announce: [
            // WebSocket trackers (for browser)
            'wss://tracker.openwebtorrent.com',
            'wss://tracker.btorrent.xyz',
            'wss://tracker.fastcast.nz',
            'wss://tracker.webtorrent.io',
            // HTTP trackers (may work in some browsers)
            'https://tracker.openwebtorrent.com:443/announce',
            // UDP trackers (won't work in browser but included for completeness)
            'udp://tracker.openbittorrent.com:80/announce',
            'udp://tracker.opentrackr.org:1337/announce',
          ],
        });
        
        torrentRef.current = torrent;
        console.log('Torrent added, waiting for metadata...');
      } catch (addError: any) {
        console.error('Error adding torrent:', addError);
        setError(`Failed to add torrent: ${addError.message}. Make sure the torrent URL is valid.`);
        setLoading(false);
        return;
      }

      // Track torrent state
      let videoFile: any = null;
      let streamCreated = false;
      let blobUrl: string | null = null;
      let totalBytesReceived = 0;
      const MIN_BYTES_TO_START = 1024 * 1024; // Wait for 1MB before starting playback (reduced for faster start)

      // Add timeout for torrent connection (30 seconds)
      const connectionTimeout = setTimeout(() => {
        if (torrent && torrent.progress === 0 && !streamCreated) {
          console.warn('Torrent connection timeout - no progress after 30 seconds');
          setError('Torrent connection timeout. The torrent may have no seeders or your network may be blocking P2P connections.');
          setLoading(false);
        }
      }, 30000);

      // Handle torrent metadata download
      torrent.on('metadata', () => {
        console.log('Torrent metadata received');
      });

      // Handle torrent ready event
      torrent.on('ready', () => {
        clearTimeout(connectionTimeout);
        console.log('Torrent ready, infoHash:', torrent.infoHash);
        console.log('Torrent files:', torrent.files.map((f: any) => ({ name: f.name, length: f.length })));
        console.log('Torrent peers:', torrent.numPeers);
        
        // Find video file in torrent
        videoFile = torrent.files.find((file: any) => {
          const name = file.name.toLowerCase();
          return name.endsWith('.mp4') || 
                 name.endsWith('.mkv') || 
                 name.endsWith('.avi') || 
                 name.endsWith('.webm') ||
                 name.endsWith('.mov');
        });

        if (!videoFile) {
          console.error('No video file found in torrent');
          setError('No video file found in torrent.');
          setLoading(false);
          return;
        }

        console.log('Found video file:', videoFile.name, 'Size:', videoFile.length, 'bytes');
        
        // Start downloading the video file
        videoFile.select();
        
        // Create stream once we have enough data
        const checkAndCreateStream = () => {
          if (streamCreated) return;
          
          const downloaded = videoFile.downloaded || 0;
          totalBytesReceived = downloaded;
          
          console.log(`Downloaded: ${downloaded} bytes (${Math.round(downloaded / 1024 / 1024 * 100) / 100} MB), Progress: ${Math.round(torrent.progress * 100)}%`);
          
          // Wait for minimum data before creating stream
          // Also start if we have any progress and at least some data
          if (downloaded >= MIN_BYTES_TO_START || (torrent.progress > 0.01 && downloaded > 0)) {
            if (!streamCreated) {
              streamCreated = true;
              console.log('Creating blob stream...');
              createBlobStream();
            }
          }
        };

        // Check periodically
        const checkInterval = setInterval(() => {
          if (videoFile && !streamCreated) {
            checkAndCreateStream();
          } else {
            clearInterval(checkInterval);
          }
        }, 500); // Check more frequently

        // Also check on download progress
        torrent.on('download', () => {
          if (videoFile && !streamCreated) {
            checkAndCreateStream();
          }
        });
      });

      // Create blob stream from video file
      const createBlobStream = () => {
        if (!videoFile) {
          console.error('No video file available for streaming');
          return;
        }

        try {
          console.log('Creating read stream from video file...');
          
          // Create a readable stream from the video file
          const stream = videoFile.createReadStream();
          const blobParts: BlobPart[] = [];
          
          stream.on('data', (chunk: Buffer) => {
            blobParts.push(chunk);
            totalBytesReceived += chunk.length;
            
            // Create blob URL once we have enough data
            if (blobParts.length === 1 || totalBytesReceived >= MIN_BYTES_TO_START) {
              if (!blobUrl) {
                const blob = new Blob(blobParts, { type: 'video/mp4' });
                blobUrl = URL.createObjectURL(blob);
                console.log('Created blob URL:', blobUrl, 'Size:', totalBytesReceived);
                setStreamUrl(blobUrl);
                setLoading(false);
              } else {
                // Update blob URL with more data
                URL.revokeObjectURL(blobUrl);
                const blob = new Blob(blobParts, { type: 'video/mp4' });
                blobUrl = URL.createObjectURL(blob);
                setStreamUrl(blobUrl);
              }
            }
          });
          
          stream.on('end', () => {
            console.log('Stream ended, total bytes:', totalBytesReceived);
            if (blobUrl && blobParts.length > 0) {
              // Final blob URL update
              URL.revokeObjectURL(blobUrl);
              const blob = new Blob(blobParts, { type: 'video/mp4' });
              blobUrl = URL.createObjectURL(blob);
              setStreamUrl(blobUrl);
            }
            setLoading(false);
          });
          
          stream.on('error', (err: Error) => {
            console.error('Stream error:', err);
            if (blobUrl) {
              URL.revokeObjectURL(blobUrl);
            }
            setError(`Failed to create stream from torrent: ${err.message}`);
            setLoading(false);
          });
        } catch (err: any) {
          console.error('Error creating stream:', err);
          setError(`Failed to create stream from torrent: ${err.message}`);
          setLoading(false);
        }
      };

      // Handle torrent errors
      torrent.on('error', (err: Error) => {
        clearTimeout(connectionTimeout);
        console.error('Torrent error:', err);
        setError(`Torrent error: ${err.message}. Make sure the torrent URL is valid and accessible.`);
        setLoading(false);
      });

      // Handle no peers error
      torrent.on('noPeers', () => {
        console.warn('No peers found for torrent');
        // Don't set error immediately, give it more time
      });

      // Update progress periodically
      progressIntervalRef.current = setInterval(() => {
        if (torrent && torrent.progress !== undefined) {
          const progress = Math.round(torrent.progress * 100);
          setTorrentProgress(progress);
          
          if (torrent.downloadSpeed) {
            const speed = formatBytes(torrent.downloadSpeed);
            setTorrentSpeed(speed);
          }
          
          // Log connection status
          if (torrent.numPeers > 0) {
            console.log(`Connected to ${torrent.numPeers} peers, progress: ${progress}%`);
          } else {
            console.log(`No peers connected yet. DHT: ${torrent.dht ? 'enabled' : 'disabled'}, Progress: ${progress}%`);
          }
          
          // Warn if no progress after some time
          if (progress === 0 && torrent.timeRemaining === Infinity) {
            const elapsed = Date.now() - (torrent as any).startTime || 0;
            if (elapsed > 10000) { // 10 seconds
              console.warn('No download progress detected. This may be due to:');
              console.warn('1. No seeders/peers available for this torrent');
              console.warn('2. Browser security restrictions blocking P2P');
              console.warn('3. Network/firewall blocking BitTorrent traffic');
            }
          }
        }
      }, 500);
    } catch (err: any) {
      console.error('Torrent streaming error:', err);
      setError(`Failed to stream torrent: ${err.message}`);
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (!bytes || bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="bg-black/70 hover:bg-black/90 text-white rounded-full p-2 transition-colors"
          aria-label="Close player"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center h-full p-4">
        {loading ? (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-12 h-12 text-primary-500 animate-spin" />
            <p className="text-white text-lg">Loading stream...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center space-y-4 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-red-500" />
            <p className="text-white text-lg">{error}</p>
            <button
              onClick={loadStream}
              className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : streamSource ? (
          <div className="w-full max-w-7xl">
            <div className="mb-4 text-center">
              <h2 className="text-white text-2xl font-bold mb-1">{title}</h2>
              {streamSource.quality && (
                <p className="text-gray-400 text-sm">Quality: {streamSource.quality}</p>
              )}
            </div>
            <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
              {loading && streamSource && (streamSource.isTorrent || streamSource.url.startsWith('magnet:') || streamSource.url.endsWith('.torrent') || streamSource.url.includes('yts.mx/torrent/download') || streamSource.url.includes('/torrent/download')) ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <Loader2 className="w-16 h-16 text-red-600 animate-spin mb-4" />
                  <p className="text-white text-lg mb-2">Loading torrent...</p>
                  <p className="text-gray-400 text-sm mb-2">
                    Progress: {torrentProgress}%
                  </p>
                  {torrentSpeed && (
                    <p className="text-gray-500 text-xs mb-2">
                      Speed: {torrentSpeed}
                    </p>
                  )}
                  {torrentProgress === 0 && (
                    <p className="text-yellow-400 text-xs mb-2">
                      Connecting to peers... This may take a moment
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-4">
                    Streaming directly from torrent - no download required
                  </p>
                  <p className="text-gray-600 text-xs mt-2">
                    Check browser console for detailed progress
                  </p>
                </div>
              ) : streamUrl ? (
                <ReactPlayer
                  url={streamUrl}
                  controls
                  playing
                  width="100%"
                  height="100%"
                  onReady={() => setPlayerReady(true)}
                  onEnded={() => {
                    console.log('Video ended, closing player');
                    onClose();
                  }}
                  onError={(err) => {
                    console.error('Player error:', err);
                    // Check if it's a network/connection error
                    if (err && typeof err === 'object' && 'message' in err) {
                      const errorMsg = String(err.message || '').toLowerCase();
                      if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('aborted')) {
                        console.log('Stream connection lost, closing player');
                        onClose();
                        return;
                      }
                    }
                    setError('Failed to play video. The stream may be unavailable.');
                  }}
                  onDisconnect={() => {
                    console.log('Player disconnected, closing');
                    onClose();
                  }}
                  config={{
                    file: {
                      attributes: {
                        controlsList: 'nodownload',
                      },
                      forceVideo: true,
                      forceHLS: false,
                      forceDASH: false,
                    },
                  }}
                />
              ) : streamSource && (streamSource.isTorrent || streamSource.url.startsWith('magnet:') || streamSource.url.endsWith('.torrent') || streamSource.url.includes('yts.mx/torrent/download') || streamSource.url.includes('/torrent/download')) && !streamUrl ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                  <AlertCircle className="w-16 h-16 text-yellow-500 mb-4" />
                  <p className="text-white text-lg mb-2">
                    Preparing torrent stream...
                  </p>
                  <p className="text-gray-400 text-sm mb-4">
                    Connecting to peers and finding video file...
                  </p>
                </div>
              ) : streamSource ? (
                <ReactPlayer
                  url={streamSource.proxyUrl || streamSource.url}
                  controls
                  playing
                  width="100%"
                  height="100%"
                  onReady={() => setPlayerReady(true)}
                  onEnded={() => {
                    console.log('Video ended, closing player');
                    onClose();
                  }}
                  onError={(err) => {
                    console.error('Player error:', err);
                    // Check if it's a network/connection error
                    if (err && typeof err === 'object' && 'message' in err) {
                      const errorMsg = String(err.message || '').toLowerCase();
                      if (errorMsg.includes('network') || errorMsg.includes('connection') || errorMsg.includes('aborted')) {
                        console.log('Stream connection lost, closing player');
                        onClose();
                        return;
                      }
                    }
                    setError('Failed to play video. The stream may be unavailable.');
                  }}
                  onDisconnect={() => {
                    console.log('Player disconnected, closing');
                    onClose();
                  }}
                  config={{
                    file: {
                      attributes: {
                        controlsList: 'nodownload',
                      },
                      forceVideo: true,
                      forceHLS: false,
                      forceDASH: false,
                    },
                  }}
                />
              ) : null}
            </div>
            {streamSource && (streamSource.isTorrent || streamSource.url.startsWith('magnet:') || streamSource.url.endsWith('.torrent') || streamSource.url.includes('yts.mx/torrent/download') || streamSource.url.includes('/torrent/download')) && torrentProgress > 0 && (
              <div className="mt-2 text-center">
                <p className="text-gray-500 text-xs">
                  🔄 Streaming from torrent - Progress: {torrentProgress}% {torrentSpeed && `- ${torrentSpeed}`}
                </p>
              </div>
            )}
            {streamSource.useProxy && (
              <div className="mt-2 text-center">
                <p className="text-gray-500 text-xs">
                  🔒 Streaming through proxy - Your IP is protected
                </p>
              </div>
            )}
            {!playerReady && streamSource.url && !streamSource.url.startsWith('magnet:') && (
              <div className="mt-4 text-center">
                <Loader2 className="w-6 h-6 text-primary-500 animate-spin inline-block" />
                <p className="text-gray-400 text-sm mt-2">Preparing video player...</p>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

