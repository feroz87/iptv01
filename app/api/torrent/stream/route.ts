import { NextRequest, NextResponse } from 'next/server';
import WebTorrent from 'webtorrent';
import axios from 'axios';
import parseTorrent from 'parse-torrent';

// Server-side WebTorrent client (reusable instance)
let client: WebTorrent.Instance | null = null;

// Track active streams per torrent (reference counting)
const activeStreams = new Map<string, number>();

function getClient(): WebTorrent.Instance {
  if (!client) {
    client = new WebTorrent({
      maxConns: 55,
      utp: false, // Disable uTP to avoid native build issues in Next.js
      dht: true, // DHT works on server-side
      tracker: true,
    });
  }
  return client;
}

// Clean up torrent if no active streams
function cleanupTorrent(infoHash: string, client: WebTorrent.Instance) {
  const count = activeStreams.get(infoHash) || 0;
  if (count <= 0) {
    // Find torrent from client.torrents array to ensure we have a valid object
    let torrent: WebTorrent.Torrent | null = null;
    
    if (client.torrents && Array.isArray(client.torrents)) {
      torrent = client.torrents.find((t: any) => 
        t && t.infoHash && 
        (typeof t.infoHash === 'string' ? t.infoHash.toLowerCase() === infoHash : 
         Buffer.isBuffer(t.infoHash) ? t.infoHash.toString('hex').toLowerCase() === infoHash : false)
      ) || null;
    }
    
    // Fallback to client.get() if not found in array
    if (!torrent) {
      const getResult = client.get(infoHash);
      if (getResult && typeof getResult === 'object' && 'infoHash' in getResult) {
        torrent = getResult as WebTorrent.Torrent;
      }
    }
    
    if (torrent && torrent.infoHash) {
      console.log(`Server-side: No active streams for ${infoHash}, removing torrent`);
      try {
        // WebTorrent remove method - pass the torrent object directly
        (client as any).remove(torrent, (err: Error | null) => {
          if (err) {
            console.error(`Server-side: Error removing torrent ${infoHash}:`, err.message);
          } else {
            console.log(`Server-side: Torrent ${infoHash} removed successfully`);
          }
        });
      } catch (e: any) {
        console.error(`Server-side: Error removing torrent ${infoHash}:`, e.message);
      }
    } else {
      console.log(`Server-side: Torrent ${infoHash} not found or invalid, skipping cleanup`);
    }
    activeStreams.delete(infoHash);
  }
}

// Stream torrent video file
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let torrentUrl = searchParams.get('url');
  const quality = searchParams.get('quality') || '1080p';

  if (!torrentUrl) {
    return NextResponse.json(
      { error: 'Torrent URL is required' },
      { status: 400 }
    );
  }

  let infoHash: string | null = null; // Declare outside try for cleanup access
  
  try {
    const client = getClient();
    
    // Handle YTS torrent download URLs - fetch the torrent file first
    let torrentInput: string | Buffer = torrentUrl;
    
    if (torrentUrl.includes('yts.mx/torrent/download') && !torrentUrl.startsWith('magnet:')) {
      console.log('Server-side: Fetching YTS torrent file:', torrentUrl);
      try {
        const response = await axios({
          method: 'GET',
          url: torrentUrl,
          responseType: 'arraybuffer',
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/x-bittorrent, */*',
          },
        });
        
        torrentInput = Buffer.from(response.data);
        console.log('Server-side: Torrent file fetched, size:', torrentInput.length, 'bytes');
      } catch (fetchError: any) {
        console.error('Server-side: Error fetching torrent file:', fetchError.message);
        return NextResponse.json(
          { error: `Failed to fetch torrent file: ${fetchError.message}` },
          { status: 500 }
        );
      }
    }
    
    console.log('Server-side: Adding torrent...');
    
    // Get infoHash first to check for duplicates
    let infoHash: string | null = null;
    
    try {
      if (Buffer.isBuffer(torrentInput)) {
        // Parse Buffer to get infoHash - parseTorrent returns infoHash as Buffer
        const parsed = parseTorrent(torrentInput);
        // infoHash can be Buffer or string
        if (parsed.infoHash) {
          if (Buffer.isBuffer(parsed.infoHash)) {
            infoHash = parsed.infoHash.toString('hex').toLowerCase();
          } else {
            infoHash = String(parsed.infoHash).toLowerCase();
          }
        }
        console.log('Server-side: Parsed torrent buffer, infoHash:', infoHash);
      } else if (typeof torrentInput === 'string' && torrentInput.startsWith('magnet:')) {
        // Parse magnet link to get infoHash
        const parsed = parseTorrent(torrentInput);
        if (parsed.infoHash) {
          if (Buffer.isBuffer(parsed.infoHash)) {
            infoHash = parsed.infoHash.toString('hex').toLowerCase();
          } else {
            infoHash = String(parsed.infoHash).toLowerCase();
          }
        }
        console.log('Server-side: Parsed magnet link, infoHash:', infoHash);
      }
    } catch (e: any) {
      // If parsing fails, we'll handle duplicate error after adding
      console.log('Server-side: Could not parse torrent:', e.message);
    }
    
    // Get or add torrent - always ensure it's ready with files
    let torrent: WebTorrent.Torrent | null = null;
    
    // Try to get existing torrent first
    if (infoHash) {
      const existingTorrent = client.get(infoHash);
      if (existingTorrent && existingTorrent.infoHash) {
        torrent = existingTorrent;
        console.log('Server-side: Found existing torrent:', infoHash);
      }
    }
    
    // If no existing torrent, add a new one
    if (!torrent) {
      console.log('Server-side: Adding new torrent...');
      try {
        torrent = client.add(torrentInput);
      } catch (addError: any) {
        // Handle duplicate error
        if (addError.message && addError.message.includes('duplicate')) {
          const match = addError.message.match(/([a-f0-9]{40})/i);
          if (match) {
            infoHash = match[1].toLowerCase();
            // Wait a moment for torrent to be added to client
            await new Promise(resolve => setTimeout(resolve, 500));
            const existingTorrent = client.get(infoHash);
            if (existingTorrent && existingTorrent.infoHash) {
              torrent = existingTorrent;
              console.log('Server-side: Found existing torrent from duplicate error:', infoHash);
            } else {
              throw new Error('Duplicate torrent exists but is not accessible');
            }
          } else {
            throw addError;
          }
        } else {
          throw addError;
        }
      }
    }
    
    if (!torrent) {
      throw new Error('Failed to get or create torrent');
    }
    
    // Always wait for torrent to be ready and get infoHash
    if (!torrent.ready) {
      console.log('Server-side: Waiting for torrent to be ready...');
      if (torrent && typeof torrent.on === 'function') {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Torrent timeout - not ready after 30 seconds'));
          }, 30000);
          
          const onReady = () => {
            clearTimeout(timeout);
            if (torrent && typeof torrent.removeListener === 'function') {
              torrent.removeListener('error', onError);
            }
            resolve();
          };
          
          const onError = async (err: Error) => {
            // Handle duplicate error - just wait for the existing torrent to be ready
            if (err.message && err.message.includes('duplicate')) {
              // Extract infoHash from error message
              const match = err.message.match(/([a-f0-9]{40})/i);
              if (match) {
                infoHash = match[1].toLowerCase();
                console.log('Server-side: Duplicate torrent detected, finding existing torrent:', infoHash);
                
                // Retry multiple times to get the existing torrent
                let retries = 30; // 15 seconds total
                let existingTorrent: WebTorrent.Torrent | null = null;
                
                while (retries > 0 && !existingTorrent) {
                  await new Promise(resolve => setTimeout(resolve, 500));
                  
                  // Try client.get() first
                  existingTorrent = client.get(infoHash);
                  
                  // If not found, check torrents array
                  if (!existingTorrent && client.torrents && Array.isArray(client.torrents)) {
                    existingTorrent = client.torrents.find((t: any) => 
                      t && t.infoHash && t.infoHash.toLowerCase() === infoHash
                    ) || null;
                  }
                  
                  if (existingTorrent && existingTorrent.infoHash) {
                    torrent = existingTorrent;
                    console.log('Server-side: Found existing torrent after async duplicate error:', infoHash);
                    
                    // Wait for this torrent to be ready
                    if (!existingTorrent.ready && typeof existingTorrent.on === 'function') {
                      existingTorrent.once('ready', () => {
                        clearTimeout(timeout);
                        if (torrent && typeof torrent.removeListener === 'function') {
                          torrent.removeListener('error', onError);
                        }
                        resolve();
                      });
                      existingTorrent.once('error', (err2: Error) => {
                        clearTimeout(timeout);
                        if (torrent && typeof torrent.removeListener === 'function') {
                          torrent.removeListener('ready', onReady);
                        }
                        reject(err2);
                      });
                    } else if (existingTorrent.ready) {
                      clearTimeout(timeout);
                      if (torrent && typeof torrent.removeListener === 'function') {
                        torrent.removeListener('error', onError);
                      }
                      resolve();
                    } else {
                      clearTimeout(timeout);
                      if (torrent && typeof torrent.removeListener === 'function') {
                        torrent.removeListener('error', onError);
                      }
                      resolve(); // Assume ready if no event emitter
                    }
                    return;
                  }
                  retries--;
                }
                
                // If still not found after retries, check if the torrent we added is still valid
                // Sometimes WebTorrent keeps the duplicate torrent anyway
                console.log('Server-side: Existing torrent not found after retries, checking if added torrent is still valid...');
                
                // Check if the torrent we tried to add is still in the client and valid
                if (torrent && torrent.infoHash) {
                  // Verify it's actually in the client
                  const verifyTorrent = client.get(torrent.infoHash) || 
                    (client.torrents && Array.isArray(client.torrents) ? 
                      client.torrents.find((t: any) => 
                        t && t.infoHash && t.infoHash.toLowerCase() === torrent.infoHash.toLowerCase()
                      ) : null);
                  
                  if (verifyTorrent && verifyTorrent.infoHash) {
                    // The torrent we added is still valid, continue waiting for it
                    torrent = verifyTorrent;
                    console.log('Server-side: Added torrent still valid, continuing to wait for ready event...');
                    // Don't remove error listener - let it continue waiting for ready event
                    return;
                  }
                }
                
                // If torrent is invalid or not found, try one more time to find existing torrent
                // Wait a bit longer and check again (torrent might have been removed and re-added)
                console.log('Server-side: Added torrent not found, doing final check for existing torrent...');
                await new Promise(resolve => setTimeout(resolve, 2000));
                
                const finalCheck = client.get(infoHash) || 
                  (client.torrents && Array.isArray(client.torrents) ? 
                    client.torrents.find((t: any) => 
                      t && t.infoHash && 
                      (typeof t.infoHash === 'string' ? t.infoHash.toLowerCase() === infoHash :
                       Buffer.isBuffer(t.infoHash) ? t.infoHash.toString('hex').toLowerCase() === infoHash : false)
                    ) : null);
                
                if (finalCheck && finalCheck.infoHash) {
                  torrent = finalCheck;
                  console.log('Server-side: Found existing torrent on final check:', infoHash);
                  if (finalCheck.ready) {
                    clearTimeout(timeout);
                    if (torrent && typeof torrent.removeListener === 'function') {
                      torrent.removeListener('error', onError);
                    }
                    resolve();
                  } else {
                    // Wait for ready
                    if (typeof finalCheck.on === 'function') {
                      finalCheck.once('ready', () => {
                        clearTimeout(timeout);
                        if (torrent && typeof torrent.removeListener === 'function') {
                          torrent.removeListener('error', onError);
                        }
                        resolve();
                      });
                      finalCheck.once('error', (err2: Error) => {
                        clearTimeout(timeout);
                        if (torrent && typeof torrent.removeListener === 'function') {
                          torrent.removeListener('ready', onReady);
                        }
                        reject(err2);
                      });
                    } else {
                      // No event emitter, assume ready
                      clearTimeout(timeout);
                      resolve();
                    }
                  }
                  return;
                }
                
                // If still not found, the torrent was likely removed
                // Try adding it again (it should work now since the old one is gone)
                console.log('Server-side: Existing torrent not found, torrent may have been removed. Waiting before retry...');
                
                // Wait a bit longer to ensure the torrent is fully removed
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Check one more time if torrent exists
                const preRetryCheck = client.get(infoHash) || 
                  (client.torrents && Array.isArray(client.torrents) ? 
                    client.torrents.find((t: any) => 
                      t && t.infoHash && 
                      (typeof t.infoHash === 'string' ? t.infoHash.toLowerCase() === infoHash :
                       Buffer.isBuffer(t.infoHash) ? t.infoHash.toString('hex').toLowerCase() === infoHash : false)
                    ) : null);
                
                if (preRetryCheck && preRetryCheck.infoHash) {
                  // Torrent still exists, use it
                  torrent = preRetryCheck;
                  console.log('Server-side: Found torrent on pre-retry check, using existing:', infoHash);
                  if (preRetryCheck.ready) {
                    clearTimeout(timeout);
                    if (torrent && typeof torrent.removeListener === 'function') {
                      torrent.removeListener('error', onError);
                    }
                    resolve();
                  } else {
                    if (typeof preRetryCheck.on === 'function') {
                      preRetryCheck.once('ready', () => {
                        clearTimeout(timeout);
                        if (torrent && typeof torrent.removeListener === 'function') {
                          torrent.removeListener('error', onError);
                        }
                        resolve();
                      });
                      preRetryCheck.once('error', (err2: Error) => {
                        clearTimeout(timeout);
                        if (torrent && typeof torrent.removeListener === 'function') {
                          torrent.removeListener('ready', onReady);
                        }
                        reject(err2);
                      });
                    } else {
                      clearTimeout(timeout);
                      resolve();
                    }
                  }
                  return;
                }
                
                // Now try adding again
                try {
                  // Remove error listener from old torrent first
                  if (torrent && typeof torrent.removeListener === 'function') {
                    torrent.removeListener('ready', onReady);
                    torrent.removeListener('error', onError);
                  }
                  
                  // Try adding again - this time it should work since the duplicate is gone
                  console.log('Server-side: Retrying add after cleanup...');
                  let newTorrent: WebTorrent.Torrent;
                  
                  try {
                    newTorrent = client.add(torrentInput);
                  } catch (syncError: any) {
                    // Handle synchronous duplicate error
                    if (syncError.message && syncError.message.includes('duplicate')) {
                      const match = syncError.message.match(/([a-f0-9]{40})/i);
                      if (match) {
                        const dupInfoHash = match[1].toLowerCase();
                        console.log('Server-side: Retry got duplicate error, finding existing torrent:', dupInfoHash);
                        await new Promise(resolve => setTimeout(resolve, 500));
                        const dupTorrent = client.get(dupInfoHash) ||
                          (client.torrents && Array.isArray(client.torrents) ?
                            client.torrents.find((t: any) =>
                              t && t.infoHash &&
                              (typeof t.infoHash === 'string' ? t.infoHash.toLowerCase() === dupInfoHash :
                               Buffer.isBuffer(t.infoHash) ? t.infoHash.toString('hex').toLowerCase() === dupInfoHash : false)
                            ) : null);
                        
                        if (dupTorrent && dupTorrent.infoHash) {
                          torrent = dupTorrent;
                          console.log('Server-side: Found duplicate torrent after retry sync error:', dupInfoHash);
                          if (dupTorrent.ready) {
                            clearTimeout(timeout);
                            resolve();
                          } else {
                            if (typeof dupTorrent.on === 'function') {
                              dupTorrent.once('ready', () => {
                                clearTimeout(timeout);
                                resolve();
                              });
                              dupTorrent.once('error', (err2: Error) => {
                                clearTimeout(timeout);
                                reject(err2);
                              });
                            } else {
                              clearTimeout(timeout);
                              resolve();
                            }
                          }
                          return;
                        }
                      }
                    }
                    // If can't handle sync error, throw it
                    throw syncError;
                  }
                  
                  torrent = newTorrent;
                  
                  // Handle async duplicate error in retry
                  if (typeof newTorrent.on === 'function') {
                    const retryErrorHandler = (retryErr: Error) => {
                      if (retryErr.message && retryErr.message.includes('duplicate')) {
                        // Still duplicate, try to get existing one
                        const match = retryErr.message.match(/([a-f0-9]{40})/i);
                        if (match) {
                          const dupInfoHash = match[1].toLowerCase();
                          const dupTorrent = client.get(dupInfoHash);
                          if (dupTorrent && dupTorrent.infoHash) {
                            torrent = dupTorrent;
                            if (dupTorrent.ready) {
                              clearTimeout(timeout);
                              resolve();
                            } else {
                              dupTorrent.once('ready', () => {
                                clearTimeout(timeout);
                                resolve();
                              });
                            }
                            return;
                          }
                        }
                      }
                      // Not duplicate or can't find existing, reject
                      clearTimeout(timeout);
                      reject(retryErr);
                    };
                    
                    newTorrent.once('error', retryErrorHandler);
                  }
                  
                  // Wait for this new torrent to be ready
                  if (!newTorrent.ready && typeof newTorrent.on === 'function') {
                    newTorrent.once('ready', () => {
                      clearTimeout(timeout);
                      if (torrent && typeof torrent.removeListener === 'function') {
                        torrent.removeListener('error', onError);
                      }
                      resolve();
                    });
                  } else if (newTorrent.ready) {
                    clearTimeout(timeout);
                    resolve();
                  } else {
                    clearTimeout(timeout);
                    resolve();
                  }
                  return;
                } catch (retryError: any) {
                  // If retry also fails with duplicate, try to get existing torrent
                  if (retryError.message && retryError.message.includes('duplicate')) {
                    const match = retryError.message.match(/([a-f0-9]{40})/i);
                    if (match) {
                      const dupInfoHash = match[1].toLowerCase();
                      await new Promise(resolve => setTimeout(resolve, 500));
                      const dupTorrent = client.get(dupInfoHash) ||
                        (client.torrents && Array.isArray(client.torrents) ?
                          client.torrents.find((t: any) =>
                            t && t.infoHash &&
                            (typeof t.infoHash === 'string' ? t.infoHash.toLowerCase() === dupInfoHash :
                             Buffer.isBuffer(t.infoHash) ? t.infoHash.toString('hex').toLowerCase() === dupInfoHash : false)
                          ) : null);
                      if (dupTorrent && dupTorrent.infoHash) {
                        torrent = dupTorrent;
                        console.log('Server-side: Found duplicate torrent after retry error:', dupInfoHash);
                        if (dupTorrent.ready) {
                          clearTimeout(timeout);
                          resolve();
                        } else {
                          if (typeof dupTorrent.on === 'function') {
                            dupTorrent.once('ready', () => {
                              clearTimeout(timeout);
                              resolve();
                            });
                          } else {
                            clearTimeout(timeout);
                            resolve();
                          }
                        }
                        return;
                      }
                    }
                  }
                  // If retry fails for other reasons, reject
                  console.error('Server-side: Retry add also failed:', retryError.message);
                  clearTimeout(timeout);
                  reject(new Error(`Failed to add torrent after duplicate error: ${retryError.message}`));
                  return;
                }
              }
            }
            // If not duplicate, reject
            clearTimeout(timeout);
            if (torrent && typeof torrent.removeListener === 'function') {
              torrent.removeListener('ready', onReady);
            }
            reject(err);
          };
          
          torrent.on('ready', onReady);
          torrent.on('error', onError);
        });
      }
    }
    
    // Get infoHash and refresh torrent reference
    if (torrent.infoHash) {
      infoHash = torrent.infoHash.toLowerCase();
      // Always get fresh reference after ready
      const freshTorrent = client.get(infoHash);
      if (freshTorrent && freshTorrent.infoHash) {
        torrent = freshTorrent;
        console.log('Server-side: Using fresh torrent reference after ready');
      }
    } else {
      console.error('Server-side: Torrent ready but no infoHash available');
      return NextResponse.json(
        { error: 'Torrent is invalid. Please try again.' },
        { status: 500 }
      );
    }
    
    // Wait for files to be available
    // CRITICAL: Even if torrent is ready, files might not be populated yet
    // Always wait for files to be available before proceeding
    if (!torrent.files || !Array.isArray(torrent.files) || torrent.files.length === 0) {
      console.log('Server-side: Waiting for torrent files to be populated...');
      console.log(`Server-side: Torrent ready: ${torrent.ready}, infoHash: ${torrent.infoHash}`);
      
      let filesFound = false;
      const maxWait = 20000; // 20 seconds
      const pollInterval = 100; // Check every 100ms
      const startTime = Date.now();
      
      while (!filesFound && (Date.now() - startTime) < maxWait) {
        // Always get fresh reference from client to avoid stale objects
        if (infoHash) {
          const freshTorrent = client.get(infoHash);
          // Only use if it's valid and has files
          if (freshTorrent && freshTorrent.infoHash) {
            torrent = freshTorrent;
            // Check if files are available now
            if (freshTorrent.files && Array.isArray(freshTorrent.files) && freshTorrent.files.length > 0) {
              filesFound = true;
              console.log(`Server-side: Files found! Count: ${freshTorrent.files.length}`);
              break;
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
      
      // Final check with fresh reference
      if (!filesFound && infoHash) {
        const freshTorrent = client.get(infoHash);
        if (freshTorrent && freshTorrent.infoHash && freshTorrent.files && Array.isArray(freshTorrent.files) && freshTorrent.files.length > 0) {
          torrent = freshTorrent;
          filesFound = true;
          console.log('Server-side: Files found on final check!');
        }
      }
      
      if (!filesFound) {
        console.error('Server-side: Files still not available after waiting');
        console.error(`Server-side: Torrent state - ready: ${torrent?.ready}, infoHash: ${torrent?.infoHash || 'none'}, files: ${torrent?.files ? torrent.files.length : 'undefined'}`);
        return NextResponse.json(
          { error: 'Torrent files not available. Please try again in a moment.' },
          { status: 503 }
        );
      }
    } else {
      console.log(`Server-side: Files already available! Count: ${torrent.files.length}`);
    }

    console.log('Server-side: Torrent ready, finding video file...');
    
    // Ensure torrent has files array
    if (!torrent.files || !Array.isArray(torrent.files) || torrent.files.length === 0) {
      console.error('Server-side: Torrent has no files or files not ready yet');
      return NextResponse.json(
        { error: 'Torrent files not available yet. Please try again in a moment.' },
        { status: 503 } // Service Unavailable
      );
    }
    
    console.log(`Server-side: Torrent has ${torrent.files.length} file(s)`);
    
    // Find video file
    const videoFile = torrent.files.find((file: any) => {
      const name = file.name.toLowerCase();
      return name.endsWith('.mp4') || 
             name.endsWith('.mkv') || 
             name.endsWith('.avi') || 
             name.endsWith('.webm') ||
             name.endsWith('.mov');
    });

    if (!videoFile) {
      console.error('Server-side: No video file found. Available files:', torrent.files.map((f: any) => f.name));
      return NextResponse.json(
        { error: 'No video file found in torrent' },
        { status: 404 }
      );
    }

    console.log('Server-side: Found video file:', videoFile.name);
    
    // Get file size
    const fileSize = videoFile.length;
    
    // Parse Range header for seeking support
    const rangeHeader = request.headers.get('range');
    let start = 0;
    let end = fileSize - 1;
    let status = 200;
    let contentLength = fileSize;
    
    if (rangeHeader) {
      // Parse Range header: "bytes=start-end"
      const matches = rangeHeader.match(/bytes=(\d+)-(\d*)/);
      if (matches) {
        start = parseInt(matches[1], 10);
        end = matches[2] ? parseInt(matches[2], 10) : fileSize - 1;
        
        // Ensure valid range
        if (start > end || start < 0 || end >= fileSize) {
          return new NextResponse(null, {
            status: 416, // Range Not Satisfiable
            headers: {
              'Content-Range': `bytes */${fileSize}`,
            },
          });
        }
        
        contentLength = end - start + 1;
        status = 206; // Partial Content
        console.log(`Server-side: Range request: bytes ${start}-${end}/${fileSize}`);
      }
    }
    
    // Create readable stream from video file with range support
    const streamOptions: any = {};
    if (status === 206) {
      streamOptions.start = start;
      streamOptions.end = end;
    }
    
    // Track active stream
    const currentInfoHash = infoHash; // Capture infoHash for cleanup
    if (currentInfoHash) {
      const currentCount = activeStreams.get(currentInfoHash) || 0;
      activeStreams.set(currentInfoHash, currentCount + 1);
      console.log(`Server-side: Active streams for ${currentInfoHash}: ${currentCount + 1}`);
    }
    
    const stream = videoFile.createReadStream(streamOptions);
    
    // Handle client disconnection (abort signal)
    let streamEnded = false;
    const cleanup = () => {
      if (streamEnded) return;
      streamEnded = true;
      
      if (currentInfoHash) {
        const currentCount = activeStreams.get(currentInfoHash) || 0;
        const newCount = Math.max(0, currentCount - 1);
        activeStreams.set(currentInfoHash, newCount);
        console.log(`Server-side: Stream ended for ${currentInfoHash}, active streams: ${newCount}`);
        
        // Clean up torrent if no active streams
        if (newCount === 0) {
          setTimeout(() => cleanupTorrent(currentInfoHash, client), 5000); // Wait 5s before cleanup
        }
      }
      
      // Destroy stream if still active
      if (stream && typeof (stream as any).destroy === 'function') {
        try {
          (stream as any).destroy();
        } catch (e) {
          // Ignore destroy errors
        }
      }
    };
    
    // Listen for abort signal (client disconnection)
    if (request.signal) {
      request.signal.addEventListener('abort', () => {
        console.log('Server-side: Client disconnected, cleaning up stream');
        cleanup();
      });
    }
    
    // Handle stream end
    if (stream && typeof (stream as any).on === 'function') {
      stream.on('end', cleanup);
      stream.on('error', (err: Error) => {
        console.error('Server-side: Stream error:', err.message);
        cleanup();
      });
      stream.on('close', cleanup);
    }
    
    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'video/mp4',
      'Content-Disposition': `inline; filename="${videoFile.name}"`,
      'Accept-Ranges': 'bytes',
      'Content-Length': contentLength.toString(),
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };
    
    // Only include Content-Range for partial content (206)
    if (status === 206) {
      headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
    }
    
    // Return stream with appropriate headers
    return new NextResponse(stream as any, {
      status,
      headers,
    });
  } catch (error: any) {
    console.error('Server-side torrent error:', error);
    
    // Clean up stream count on error
    // Note: infoHash might not be set if error occurs early
    const errorInfoHash = infoHash;
    if (errorInfoHash) {
      const currentCount = activeStreams.get(errorInfoHash) || 0;
      const newCount = Math.max(0, currentCount - 1);
      activeStreams.set(errorInfoHash, newCount);
      if (newCount === 0) {
        setTimeout(() => cleanupTorrent(errorInfoHash, getClient()), 5000);
      }
    }
    
    return NextResponse.json(
      { error: `Failed to stream torrent: ${error.message}` },
      { status: 500 }
    );
  }
}

