import axios from 'axios';

// API endpoints - trying multiple sources for reliability
const POPCORN_TIME_APIS = [
  'https://tv-v2.api-fetch.website', // Primary endpoint
  'https://tv.api-fetch.website', // Alternative endpoint
  'https://tv-v2.api-fetch.sh', // Another alternative
];

// FilmPlus API endpoints - Based on common streaming service patterns
const FILMPLUS_APIS = [
  'https://www.filmplus.app/api',
  'https://filmplus.app/api',
  'https://api.filmplus.app',
  'https://www.filmplus.app',
  'https://filmplus.app',
];

// PrMovies API endpoints
const PRMOVIES_APIS = [
  'https://prmovies.sale',
  'https://www.prmovies.sale',
];

// YTS API (for movies)
const YTS_API = 'https://yts.mx/api/v2';

// EZTV API (for TV shows)
const EZTV_API = 'https://eztv.re/api';

// TMDB API as fallback (free, reliable, requires API key)
const TMDB_API = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

// Demo/Mock data as last resort fallback
const DEMO_MOVIES: Movie[] = [
  {
    _id: 'demo-1',
    title: 'The Matrix',
    year: 1999,
    synopsis: 'A computer hacker learns about the true nature of reality.',
    images: {
      poster: 'https://image.tmdb.org/t/p/w500/f89U3ADr1oiB1s9GkdPOEpXUk5H.jpg',
    },
    rating: { percentage: 87 },
    genres: ['Action', 'Sci-Fi'],
    torrents: {
      '1080p': {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        seed: 100,
        peer: 50,
        size: '2.1 GB',
      },
    },
  },
  {
    _id: 'demo-2',
    title: 'Inception',
    year: 2010,
    synopsis: 'A thief who steals corporate secrets through dream-sharing technology.',
    images: {
      poster: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    },
    rating: { percentage: 91 },
    genres: ['Action', 'Sci-Fi', 'Thriller'],
    torrents: {
      '1080p': {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        seed: 150,
        peer: 75,
        size: '1.8 GB',
      },
    },
  },
  {
    _id: 'demo-3',
    title: 'The Dark Knight',
    year: 2008,
    synopsis: 'Batman faces the Joker in Gotham City.',
    images: {
      poster: 'https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
    },
    rating: { percentage: 94 },
    genres: ['Action', 'Crime', 'Drama'],
    torrents: {
      '1080p': {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        seed: 200,
        peer: 100,
        size: '2.5 GB',
      },
    },
  },
];

const DEMO_SHOWS: TVShow[] = [
  {
    _id: 'demo-show-1',
    title: 'Breaking Bad',
    year: 2008,
    synopsis: 'A high school chemistry teacher turned methamphetamine manufacturer.',
    images: {
      poster: 'https://image.tmdb.org/t/p/w500/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
    },
    rating: { percentage: 96 },
    genres: ['Crime', 'Drama', 'Thriller'],
  },
  {
    _id: 'demo-show-2',
    title: 'Game of Thrones',
    year: 2011,
    synopsis: 'Nine noble families fight for control over the lands of Westeros.',
    images: {
      poster: 'https://image.tmdb.org/t/p/w500/u3bZgnGQ9T01sWNhyveQz0wH0Hl.jpg',
    },
    rating: { percentage: 85 },
    genres: ['Action', 'Adventure', 'Drama'],
  },
];

// Proxy configuration - routes requests through Next.js API to hide IP
const USE_PROXY = false; // Set to true to enable proxy (disabled for now)
const PROXY_API_BASE = '/api/proxy/api';
const PROXY_STREAM_BASE = '/api/proxy/stream';

export interface Movie {
  _id: string;
  imdb_id?: string;
  title: string;
  year: number;
  synopsis?: string;
  runtime?: string;
  released?: number;
  trailer?: string;
  certification?: string;
  torrents?: {
    [quality: string]: {
      url: string;
      seed: number;
      peer: number;
      size: string;
    };
  };
  images?: {
    poster?: string;
    fanart?: string;
    banner?: string;
  };
  rating?: {
    percentage?: number;
    watching?: number;
    votes?: number;
    loved?: number;
    hated?: number;
  };
  genres?: string[];
}

export interface TVShow {
  _id: string;
  imdb_id?: string;
  title: string;
  year: number;
  synopsis?: string;
  runtime?: string;
  released?: number;
  trailer?: string;
  certification?: string;
  images?: {
    poster?: string;
    fanart?: string;
    banner?: string;
  };
  rating?: {
    percentage?: number;
    watching?: number;
    votes?: number;
    loved?: number;
    hated?: number;
  };
  genres?: string[];
  num_seasons?: number;
}

export interface Episode {
  _id: string;
  tvshow_id: string;
  title: string;
  season: number;
  episode: number;
  overview?: string;
  released?: number;
  torrents?: {
    [quality: string]: {
      url: string;
      seed: number;
      peer: number;
      size: string;
    };
  };
  images?: {
    screenshot?: string;
  };
}

export interface StreamSource {
  url: string;
  proxyUrl?: string; // Proxied URL that hides your IP
  quality?: string;
  type?: 'movie' | 'episode';
  title?: string;
  useProxy?: boolean; // Whether to use proxy
  isTorrent?: boolean; // Indicates if this is a torrent/magnet link
}

class StreamingAPI {
  private currentApiIndex = 0;

  // Get current API endpoint
  private getCurrentApi(): string {
    return POPCORN_TIME_APIS[this.currentApiIndex] || POPCORN_TIME_APIS[0];
  }

  // Try next API endpoint
  private tryNextApi(): boolean {
    if (this.currentApiIndex < POPCORN_TIME_APIS.length - 1) {
      this.currentApiIndex++;
      return true;
    }
    return false;
  }

  // Reset to first API
  private resetApi(): void {
    this.currentApiIndex = 0;
  }

  // Generate proxy URL for API requests
  private getProxyApiUrl(endpoint: string, params?: any, apiBase?: string): string {
    const baseUrl = apiBase || this.getCurrentApi();
    if (!USE_PROXY) {
      return `${baseUrl}${endpoint}`;
    }
    const searchParams = new URLSearchParams({
      endpoint,
      baseUrl,
      ...params,
    });
    return `${PROXY_API_BASE}?${searchParams.toString()}`;
  }

  // Generate proxy URL for streaming
  private getProxyStreamUrl(originalUrl: string): string {
    if (!USE_PROXY) {
      return originalUrl;
    }
    const searchParams = new URLSearchParams({
      url: originalUrl,
      type: 'video',
    });
    return `${PROXY_STREAM_BASE}?${searchParams.toString()}`;
  }

  private async request(url: string, params?: any, retryCount: number = 0): Promise<any> {
    const maxRetries = POPCORN_TIME_APIS.length - 1;
    
    try {
      // Determine if this is a PopcornTime API request
      const isPopcornTimeApi = POPCORN_TIME_APIS.some(api => url.includes(api));
      
      if (isPopcornTimeApi) {
        // When proxy is disabled, use the URL directly
        const requestUrl = USE_PROXY
          ? (() => {
              // Extract endpoint for proxy
              const currentApi = this.getCurrentApi();
              const endpoint = url.replace(currentApi, '').replace(/^https?:\/\/[^\/]+/, '') || url;
              return this.getProxyApiUrl(endpoint, params, currentApi);
            })()
          : url; // Direct URL when proxy is disabled

        const response = await axios.get(requestUrl, {
          params: USE_PROXY ? undefined : params, // Params are in URL if using proxy
          timeout: 20000, // Increased timeout since API can be slow
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        
        // Log response for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log('API Response:', {
            url: requestUrl,
            status: response.status,
            dataType: typeof response.data,
            dataLength: Array.isArray(response.data) ? response.data.length : 'not array',
            dataPreview: Array.isArray(response.data) && response.data.length > 0 
              ? response.data[0] 
              : response.data,
          });
        }
        
        // Reset to first API on success
        this.resetApi();
        return response.data;
      } else {
        // Direct request for non-PopcornTime APIs
        const response = await axios.get(url, {
          params,
          timeout: 20000, // Increased timeout since API can be slow
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        return response.data;
      }
    } catch (error: any) {
      // If it's a network/DNS error and we have more APIs to try, retry with next API
      if (
        retryCount < maxRetries &&
        isPopcornTimeApi &&
        (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'EAI_AGAIN' || error.response?.status >= 500)
      ) {
        console.warn(`API endpoint failed (${this.getCurrentApi()}), trying next...`);
        if (this.tryNextApi()) {
          // Retry with next API endpoint
          const currentApi = this.getCurrentApi();
          const endpoint = url.replace(POPCORN_TIME_APIS[0], '').replace(/^https?:\/\/[^\/]+/, '') || url;
          const newUrl = `${currentApi}${endpoint}`;
          return this.request(newUrl, params, retryCount + 1);
        }
      }
      
      // Log detailed error information
      if (error.response) {
        console.error('API request failed:', {
          status: error.response.status,
          statusText: error.response.statusText,
          url: error.config?.url,
          data: error.response.data,
        });
      } else {
        console.error('API request failed:', error.message || error, 'URL:', url);
      }
      throw error;
    }
  }

  // Get popular movies - YTS API only
  async getPopularMovies(page: number = 1): Promise<Movie[]> {
    // Retry logic for YTS API (sometimes first call fails with 502)
    const maxRetries = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(`${YTS_API}/list_movies.json`, {
          params: {
            sort_by: 'download_count',
            order_by: 'desc',
            limit: 20,
            page,
          },
          timeout: 15000, // Increased timeout
        });
        
        if (response.data) {
          // Handle different YTS response structures
          let moviesArray: any[] = [];
          
          if (response.data.data && response.data.data.movies && Array.isArray(response.data.data.movies)) {
            moviesArray = response.data.data.movies;
          } else if (response.data.movies && Array.isArray(response.data.movies)) {
            moviesArray = response.data.movies;
          } else if (Array.isArray(response.data)) {
            moviesArray = response.data;
          }
          
          if (moviesArray.length > 0) {
            console.log(`Found ${moviesArray.length} movies in YTS response`);
            const movies = this.mapYTSToMovies(moviesArray);
            console.log(`✅ Successfully fetched ${movies.length} movies from YTS API${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
            console.log('Returning movies:', movies.length, 'First movie:', movies[0]?.title);
            if (movies.length > 0) {
              return movies;
            } else {
              console.warn('⚠️ mapYTSToMovies returned empty array!');
            }
          } else {
            console.warn('⚠️ YTS API returned empty movies array');
          }
        }
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;
        const isRetryable = status === 502 || status === 503 || status === 504 || !status; // Network errors or server errors
        
        if (isRetryable && attempt < maxRetries) {
          const delay = attempt * 1000; // Exponential backoff: 1s, 2s
          console.warn(`YTS API attempt ${attempt} failed (${status || error.message}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          console.error(`YTS API failed after ${attempt} attempts:`, status || error.message);
          break;
        }
      }
    }
    
    return [];
  }

  // Get popular TV shows - YTS doesn't have TV shows, return empty array
  async getPopularShows(page: number = 1): Promise<TVShow[]> {
    // YTS API only provides movies, not TV shows
    console.warn('YTS API does not provide TV shows');
    return [];
  }

  // Helper methods to map different API formats to our Movie/TVShow interfaces
  private mapFilmPlusToMovies(data: any[]): Movie[] {
    return data.map((item: any) => ({
      _id: item.id || item._id || item.movie_id || `filmplus-${item.imdb_id || Math.random()}`,
      imdb_id: item.imdb_id || item.imdb_code,
      title: item.title || item.name || item.original_title,
      year: item.year || item.release_date ? new Date(item.release_date).getFullYear() : item.release_year || 2020,
      synopsis: item.overview || item.description || item.synopsis || item.plot,
      runtime: item.runtime ? `${item.runtime} min` : undefined,
      images: {
        poster: item.poster_path || item.poster || item.poster_url || 
                (item.images?.poster) || 
                (item.backdrop_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined),
        fanart: item.backdrop_path || item.backdrop || item.backdrop_url || 
                (item.images?.fanart) ||
                (item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : undefined),
        banner: item.banner || item.images?.banner,
      },
      rating: {
        percentage: item.vote_average ? Math.round(item.vote_average * 10) :
                   item.rating ? Math.round((typeof item.rating === 'number' ? item.rating : parseFloat(item.rating)) * 10) : undefined,
      },
      genres: item.genres || (item.genre_ids ? [] : []) || [],
      torrents: item.streaming_urls || item.video_urls || item.sources || item.torrents || {},
    }));
  }

  private mapFilmPlusToShows(data: any[]): TVShow[] {
    return data.map((item: any) => ({
      _id: item.id || item._id || item.show_id || `filmplus-show-${item.imdb_id || Math.random()}`,
      imdb_id: item.imdb_id || item.imdb_code,
      title: item.title || item.name || item.original_name,
      year: item.year || item.first_air_date ? new Date(item.first_air_date).getFullYear() : item.release_year || 2020,
      synopsis: item.overview || item.description || item.synopsis || item.plot,
      images: {
        poster: item.poster_path || item.poster || item.poster_url || 
                (item.images?.poster) ||
                (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : undefined),
        fanart: item.backdrop_path || item.backdrop || item.backdrop_url || 
                (item.images?.fanart) ||
                (item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : undefined),
        banner: item.banner || item.images?.banner,
      },
      rating: {
        percentage: item.vote_average ? Math.round(item.vote_average * 10) :
                   item.rating ? Math.round((typeof item.rating === 'number' ? item.rating : parseFloat(item.rating)) * 10) : undefined,
      },
      genres: item.genres || (item.genre_ids ? [] : []) || [],
      num_seasons: item.number_of_seasons || item.seasons || item.season_count,
    }));
  }

  private mapPrMoviesToShows(data: any[]): TVShow[] {
    return data.map((item: any) => ({
      _id: item.id || item._id || item.show_id || `prmovies-show-${Math.random()}`,
      imdb_id: item.imdb_id || item.imdb,
      title: item.title || item.name,
      year: item.year || item.release_year || new Date(item.first_air_date || item.created_at).getFullYear() || 2020,
      synopsis: item.overview || item.description || item.synopsis || item.plot,
      images: {
        poster: item.poster || item.poster_path || item.thumbnail || item.image,
        fanart: item.backdrop || item.backdrop_path || item.background || item.fanart,
        banner: item.banner,
      },
      rating: {
        percentage: item.rating ? Math.round((typeof item.rating === 'number' ? item.rating : parseFloat(item.rating)) * 10) : 
                   item.vote_average ? Math.round(item.vote_average * 10) : undefined,
      },
      genres: item.genres || item.genre || [],
      num_seasons: item.number_of_seasons || item.seasons,
    }));
  }

  private mapYTSToMovies(data: any[]): Movie[] {
    if (!Array.isArray(data)) {
      console.warn('mapYTSToMovies: data is not an array', typeof data, data);
      return [];
    }
    
    console.log(`mapYTSToMovies: Processing ${data.length} items`);
    if (data.length > 0) {
      console.log('Sample YTS item:', JSON.stringify(data[0], null, 2));
    }
    
    const mapped = data
      .filter((item: any) => {
        // More lenient filtering - only require title
        const isValid = item && (item.title || item.name);
        if (!isValid) {
          console.warn('Filtered out invalid item (missing title):', item);
        }
        return isValid;
      })
      .map((item: any) => {
        try {
          const movie = {
            _id: `yts-${item.id || item.movie_id || Math.random()}`,
            imdb_id: item.imdb_code || item.imdb_id,
            title: item.title || item.name || 'Untitled',
            year: item.year || new Date().getFullYear(),
            synopsis: item.summary || item.description_full || item.synopsis || item.description || '',
            runtime: item.runtime ? `${item.runtime} min` : undefined,
            images: {
              poster: item.large_cover_image || item.medium_cover_image || item.small_cover_image || item.poster,
              fanart: item.background_image || item.background_image_original || item.backdrop,
            },
            rating: {
              percentage: item.rating ? Math.round(item.rating * 10) : undefined,
            },
            genres: Array.isArray(item.genres) ? item.genres : (item.genre ? [item.genre] : []),
            torrents: item.torrents && Array.isArray(item.torrents) ? this.mapYTSTorrents(item.torrents) : {},
          };
          return movie;
        } catch (err) {
          console.warn('Error mapping YTS movie:', item, err);
          return null;
        }
      })
      .filter((movie: Movie | null) => movie !== null) as Movie[];
    
    console.log(`mapYTSToMovies: Mapped ${mapped.length} movies from ${data.length} items`);
    if (mapped.length > 0) {
      console.log('First mapped movie:', mapped[0]);
    }
    return mapped;
  }

  private mapYTSTorrents(torrents: any[]): { [quality: string]: any } {
    const result: { [quality: string]: any } = {};
    if (!Array.isArray(torrents)) {
      return result;
    }
    
    torrents.forEach((torrent: any) => {
      // YTS torrents have quality field like "720p", "1080p", "3D", etc.
      const quality = torrent.quality || torrent.type || 'unknown';
      
      // YTS provides torrent URL directly, or hash for magnet link
      let url = torrent.url;
      if (!url && torrent.hash) {
        // Create magnet link from hash if URL not provided
        url = `magnet:?xt=urn:btih:${torrent.hash}`;
      }
      
      result[quality] = {
        url: url || '',
        seed: torrent.seeds || 0,
        peer: torrent.peers || 0,
        size: torrent.size || '',
      };
    });
    return result;
  }

  // Helper methods to map different API formats to our Movie/TVShow interfaces
  private mapPrMoviesToMovies(data: any[]): Movie[] {
    return data.map((item: any) => ({
      _id: item.id || item._id || item.movie_id || `prmovies-${Math.random()}`,
      imdb_id: item.imdb_id || item.imdb,
      title: item.title || item.name,
      year: item.year || item.release_year || new Date(item.release_date || item.created_at).getFullYear() || 2020,
      synopsis: item.overview || item.description || item.synopsis || item.plot,
      runtime: item.runtime ? `${item.runtime} min` : undefined,
      images: {
        poster: item.poster || item.poster_path || item.thumbnail || item.image,
        fanart: item.backdrop || item.backdrop_path || item.background || item.fanart,
        banner: item.banner,
      },
      rating: {
        percentage: item.rating ? Math.round((typeof item.rating === 'number' ? item.rating : parseFloat(item.rating)) * 10) : 
                   item.vote_average ? Math.round(item.vote_average * 10) : undefined,
      },
      genres: item.genres || item.genre || [],
      torrents: item.streaming_urls || item.video_urls || item.sources ? this.mapPrMoviesStreams(item.streaming_urls || item.video_urls || item.sources) : {},
    }));
  }

  private mapPrMoviesStreams(streams: any): { [quality: string]: any } {
    const result: { [quality: string]: any } = {};
    
    if (Array.isArray(streams)) {
      streams.forEach((stream: any, index: number) => {
        const quality = stream.quality || stream.label || `quality-${index + 1}`;
        result[quality] = {
          url: stream.url || stream.src || stream.link,
          seed: stream.seeds || 0,
          peer: stream.peers || 0,
          size: stream.size || '',
        };
      });
    } else if (typeof streams === 'object') {
      Object.keys(streams).forEach((quality) => {
        const stream = streams[quality];
        result[quality] = {
          url: typeof stream === 'string' ? stream : (stream.url || stream.src || stream.link),
          seed: stream.seeds || 0,
          peer: stream.peers || 0,
          size: stream.size || '',
        };
      });
    }
    
    return result;
  }

  // Search movies - YTS API only
  async searchMovies(query: string, page: number = 1): Promise<Movie[]> {
    // Retry logic for YTS API (sometimes first call fails with 502)
    const maxRetries = 3;
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await axios.get(`${YTS_API}/list_movies.json`, {
          params: {
            query_term: query,
            limit: 20,
            page,
          },
          timeout: 15000, // Increased timeout
        });
        
        if (response.data) {
          // Handle different YTS response structures
          let moviesArray: any[] = [];
          
          if (response.data.data && response.data.data.movies && Array.isArray(response.data.data.movies)) {
            moviesArray = response.data.data.movies;
          } else if (response.data.movies && Array.isArray(response.data.movies)) {
            moviesArray = response.data.movies;
          } else if (Array.isArray(response.data)) {
            moviesArray = response.data;
          }
          
          if (moviesArray.length > 0) {
            const movies = this.mapYTSToMovies(moviesArray);
            console.log(`✅ Successfully searched ${movies.length} movies from YTS API${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
            return movies;
          }
        }
      } catch (error: any) {
        lastError = error;
        const status = error.response?.status;
        const isRetryable = status === 502 || status === 503 || status === 504 || !status; // Network errors or server errors
        
        if (isRetryable && attempt < maxRetries) {
          const delay = attempt * 1000; // Exponential backoff: 1s, 2s
          console.warn(`YTS search attempt ${attempt} failed (${status || error.message}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        } else {
          console.error(`YTS search failed after ${attempt} attempts:`, status || error.message);
          break;
        }
      }
    }
    
    return [];
  }

  // Search TV shows - YTS doesn't have TV shows, return empty array
  async searchShows(query: string, page: number = 1): Promise<TVShow[]> {
    // YTS API only provides movies, not TV shows
    console.warn('YTS API does not provide TV shows');
    return [];
  }

  // Get movie details - YTS API only
  async getMovieDetails(movieId: string): Promise<Movie | null> {
    // Check if it's a demo movie
    const demoMovie = DEMO_MOVIES.find(m => m._id === movieId);
    if (demoMovie) {
      return demoMovie;
    }
    
    // Check if it's a YTS movie
    if (movieId.startsWith('yts-')) {
      // Retry logic for YTS API (sometimes first call fails with 502)
      const maxRetries = 3;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const ytsId = movieId.replace('yts-', '');
          const response = await axios.get(`${YTS_API}/movie_details.json`, {
            params: {
              movie_id: ytsId,
              with_images: true,
              with_cast: true,
            },
            timeout: 15000, // Increased timeout
          });
          
          if (response.data && response.data.data && response.data.data.movie) {
            const movie = response.data.data.movie;
            return {
              _id: `yts-${movie.id}`,
              imdb_id: movie.imdb_code,
              title: movie.title,
              year: movie.year,
              synopsis: movie.description_full || movie.summary || '',
              runtime: `${movie.runtime} min`,
              images: {
                poster: movie.large_cover_image || movie.medium_cover_image,
                fanart: movie.background_image || movie.background_image_original,
              },
              rating: {
                percentage: movie.rating ? Math.round(movie.rating * 10) : undefined,
              },
              genres: movie.genres || [],
              torrents: movie.torrents ? this.mapYTSTorrents(movie.torrents) : {},
            };
          }
        } catch (error: any) {
          const status = error.response?.status;
          const isRetryable = status === 502 || status === 503 || status === 504 || !status;
          
          if (isRetryable && attempt < maxRetries) {
            const delay = attempt * 1000;
            console.warn(`YTS movie details attempt ${attempt} failed (${status || error.message}), retrying...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            console.error(`Failed to fetch YTS movie details after ${attempt} attempts:`, error);
            break;
          }
        }
      }
    }
    
    return null;
  }

  // Get TV show details
  async getShowDetails(showId: string): Promise<TVShow | null> {
    // Check if it's a demo show
    const demoShow = DEMO_SHOWS.find(s => s._id === showId);
    if (demoShow) {
      return demoShow;
    }
    
    this.resetApi(); // Start with first API
    try {
      const data = await this.request(`${this.getCurrentApi()}/show/${showId}`);
      return data || null;
    } catch (error) {
      console.error('Failed to fetch show details:', error);
      return null;
    }
  }

  // Get episodes for a TV show
  async getEpisodes(showId: string, season: number = 1): Promise<Episode[]> {
    // Check if it's a demo show
    if (showId.startsWith('demo-show-')) {
      // Return demo episodes
      return [
        {
          _id: `${showId}-s${season}-e1`,
          tvshow_id: showId,
          title: `Episode 1`,
          season: season,
          episode: 1,
          overview: 'Demo episode for testing purposes.',
          torrents: {
            '1080p': {
              url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
              seed: 100,
              peer: 50,
              size: '500 MB',
            },
          },
        },
        {
          _id: `${showId}-s${season}-e2`,
          tvshow_id: showId,
          title: `Episode 2`,
          season: season,
          episode: 2,
          overview: 'Demo episode for testing purposes.',
          torrents: {
            '1080p': {
              url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
              seed: 100,
              peer: 50,
              size: '500 MB',
            },
          },
        },
      ];
    }
    
    this.resetApi(); // Start with first API
    try {
      const data = await this.request(`${this.getCurrentApi()}/show/${showId}`, {
        season,
      });
      if (data && data.episodes) {
        return Array.isArray(data.episodes) ? data.episodes : [];
      }
      return [];
    } catch (error) {
      console.error('Failed to fetch episodes:', error);
      return [];
    }
  }

  // Get streaming URL for a movie - YTS API only
  async getMovieStream(movieId: string, quality: string = '1080p'): Promise<StreamSource | null> {
    try {
      console.log(`Getting movie stream for ${movieId}, quality: ${quality}`);
      const movie = await this.getMovieDetails(movieId);
      
      if (!movie) {
        console.error('Movie not found:', movieId);
        return null;
      }
      
      console.log('Movie details:', {
        id: movie._id,
        title: movie.title,
        hasTorrents: !!movie.torrents,
        torrentKeys: movie.torrents ? Object.keys(movie.torrents) : [],
      });
      
      if (!movie.torrents || Object.keys(movie.torrents).length === 0) {
        console.warn('Movie has no torrents available');
        return null;
      }

      // Try to get the requested quality, fallback to best available
      let torrent = movie.torrents[quality];
      if (!torrent) {
        const qualities = Object.keys(movie.torrents);
        const preferredOrder = ['1080p', '720p', '480p', '3D'];
        for (const q of preferredOrder) {
          if (movie.torrents[q]) {
            torrent = movie.torrents[q];
            quality = q;
            break;
          }
        }
        if (!torrent && qualities.length > 0) {
          torrent = movie.torrents[qualities[0]];
          quality = qualities[0];
        }
      }

      if (!torrent || !torrent.url) {
        console.warn('No torrent URL found for quality:', quality);
        return null;
      }

      console.log('Selected torrent:', {
        quality,
        url: torrent.url.substring(0, 100),
        isMagnet: torrent.url.startsWith('magnet:'),
        isTorrentFile: torrent.url.endsWith('.torrent'),
        isYTSDownload: torrent.url.includes('yts.mx/torrent/download'),
      });

      // YTS provides torrent URLs, not direct streaming URLs
      // These need to be handled differently
      const proxyUrl = this.getProxyStreamUrl(torrent.url);
      
      return {
        url: torrent.url, // Original URL (torrent/magnet)
        proxyUrl, // Proxied URL (won't work for torrents)
        quality,
        type: 'movie',
        title: movie.title,
        useProxy: USE_PROXY,
        isTorrent: torrent.url.startsWith('magnet:') || torrent.url.endsWith('.torrent') || torrent.url.includes('yts.mx/torrent/download'),
      };
    } catch (error) {
      console.error('Failed to get movie stream:', error);
      return null;
    }
  }

  // Get streaming URL for an episode
  async getEpisodeStream(
    showId: string,
    season: number,
    episode: number,
    quality: string = '1080p'
  ): Promise<StreamSource | null> {
    try {
      const episodes = await this.getEpisodes(showId, season);
      const episodeData = episodes.find(
        (ep) => ep.season === season && ep.episode === episode
      );

      if (!episodeData || !episodeData.torrents) {
        return null;
      }

      let torrent = episodeData.torrents[quality];
      if (!torrent) {
        const qualities = Object.keys(episodeData.torrents);
        const preferredOrder = ['1080p', '720p', '480p'];
        for (const q of preferredOrder) {
          if (episodeData.torrents[q]) {
            torrent = episodeData.torrents[q];
            quality = q;
            break;
          }
        }
        if (!torrent && qualities.length > 0) {
          torrent = episodeData.torrents[qualities[0]];
          quality = qualities[0];
        }
      }

      if (!torrent) {
        return null;
      }

      // Generate proxy URL to hide IP from streaming source
      const proxyUrl = this.getProxyStreamUrl(torrent.url);
      
      return {
        url: torrent.url, // Original URL (for reference)
        proxyUrl, // Proxied URL that hides your IP
        quality,
        type: 'episode',
        title: episodeData.title,
        useProxy: USE_PROXY,
      };
    } catch (error) {
      console.error('Failed to get episode stream:', error);
      return null;
    }
  }
}

export const streamingAPI = new StreamingAPI();

