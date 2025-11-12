'use client';

import { useState, useEffect } from 'react';
import { Search, Play, Film, Tv, TrendingUp, Star, Info, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { streamingAPI, Movie, TVShow } from '@/lib/api';
import VideoPlayer from '@/components/VideoPlayer';
import ContentCard from '@/components/ContentCard';
import EpisodeSelector from '@/components/EpisodeSelector';
import Pagination from '@/components/Pagination';
import HeroSection from '@/components/HeroSection';
import ContentDetail from '@/components/ContentDetail';

export default function Home() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [shows, setShows] = useState<TVShow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ movies: Movie[]; shows: TVShow[] }>({
    movies: [],
    shows: [],
  });
  const [selectedContent, setSelectedContent] = useState<{
    type: 'movie' | 'show' | null;
    id: string | null;
    title: string;
  }>({ type: null, id: null, title: '' });
  const [showEpisodeSelector, setShowEpisodeSelector] = useState(false);
  const [selectedShow, setSelectedShow] = useState<{ id: string; title: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'movies' | 'shows' | 'all'>('all');
  const [showDetail, setShowDetail] = useState<{ content: Movie | TVShow; type: 'movie' | 'show' } | null>(null);
  const [featuredContent, setFeaturedContent] = useState<Movie | TVShow | null>(null);
  
  // Pagination state
  const [moviesPage, setMoviesPage] = useState(1);
  const [showsPage, setShowsPage] = useState(1);
  const [searchMoviesPage, setSearchMoviesPage] = useState(1);
  const [searchShowsPage, setSearchShowsPage] = useState(1);

  useEffect(() => {
    loadPopularContent();
  }, []);

  useEffect(() => {
    if (!searchQuery) {
      loadPopularContent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moviesPage, showsPage]);

  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery, searchMoviesPage, searchShowsPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMoviesPage, searchShowsPage]);

  const loadPopularContent = async () => {
    setLoading(true);
    try {
      console.log('Loading popular content...');
      const [popularMovies, popularShows] = await Promise.all([
        streamingAPI.getPopularMovies(moviesPage),
        streamingAPI.getPopularShows(showsPage),
      ]);
      
      console.log('Received movies:', popularMovies.length, popularMovies);
      console.log('Received shows:', popularShows.length, popularShows);
      
      setMovies(popularMovies);
      setShows(popularShows);
      
      console.log('State updated - movies:', popularMovies.length, 'shows:', popularShows.length);
      
      // Set featured content (first movie or show)
      if (popularMovies.length > 0 && !featuredContent) {
        setFeaturedContent(popularMovies[0]);
      } else if (popularShows.length > 0 && !featuredContent) {
        setFeaturedContent(popularShows[0]);
      }
    } catch (error) {
      console.error('Failed to load content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string, moviePage: number = 1, showPage: number = 1) => {
    if (!query.trim()) {
      setSearchResults({ movies: [], shows: [] });
      setSearchMoviesPage(1);
      setSearchShowsPage(1);
      return;
    }

    try {
      const [movieResults, showResults] = await Promise.all([
        streamingAPI.searchMovies(query, moviePage),
        streamingAPI.searchShows(query, showPage),
      ]);
      setSearchResults({ movies: movieResults, shows: showResults });
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const handleSearchInput = (query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setSearchMoviesPage(1);
      setSearchShowsPage(1);
      handleSearch(query, 1, 1);
    } else {
      setSearchResults({ movies: [], shows: [] });
    }
  };

  const handlePlayMovie = async (movie: Movie) => {
    setSelectedContent({
      type: 'movie',
      id: movie._id,
      title: movie.title,
    });
  };

  const handlePlayShow = async (show: TVShow) => {
    setSelectedShow({ id: show._id, title: show.title });
    setShowEpisodeSelector(true);
  };

  const handleShowDetail = (content: Movie | TVShow, type: 'movie' | 'show') => {
    setShowDetail({ content, type });
  };

  const handleHeroPlay = () => {
    if (featuredContent) {
      if ('torrents' in featuredContent) {
        // It's a movie
        handlePlayMovie(featuredContent as Movie);
      } else {
        // It's a show
        handlePlayShow(featuredContent as TVShow);
      }
    }
  };

  const handleHeroInfo = () => {
    if (featuredContent) {
      const type = 'torrents' in featuredContent ? 'movie' : 'show';
      handleShowDetail(featuredContent, type);
    }
  };

  const handleClosePlayer = () => {
    setSelectedContent({ type: null, id: null, title: '' });
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const displayMovies = searchQuery ? searchResults.movies : movies;
  const displayShows = searchQuery ? searchResults.shows : shows;

  // Debug logging
  useEffect(() => {
    console.log('Display state:', {
      searchQuery,
      moviesCount: movies.length,
      showsCount: shows.length,
      displayMoviesCount: displayMovies.length,
      displayShowsCount: displayShows.length,
      loading,
      activeTab,
    });
  }, [movies, shows, displayMovies, displayShows, loading, activeTab, searchQuery]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm border-b border-gray-900">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Film className="w-8 h-8 text-red-600" />
              <h1 className="text-2xl font-bold text-white">StreamFlix</h1>
            </div>
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search movies and TV shows..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    handleSearchInput(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section - Only show when not searching */}
      {!searchQuery && featuredContent && (
        <HeroSection
          featuredContent={featuredContent}
          onPlay={handleHeroPlay}
          onInfo={handleHeroInfo}
        />
      )}

      {/* Main Content */}
      <main className={`container mx-auto px-4 ${!searchQuery && featuredContent ? 'py-8' : 'py-8'}`}>
        {showDetail ? (
          <ContentDetail
            content={showDetail.content}
            type={showDetail.type}
            onClose={() => setShowDetail(null)}
            onPlay={(content) => {
              setShowDetail(null);
              if (showDetail.type === 'movie') {
                handlePlayMovie(content as Movie);
              } else {
                handlePlayShow(content as TVShow);
              }
            }}
          />
        ) : showEpisodeSelector && selectedShow ? (
          <EpisodeSelector
            showId={selectedShow.id}
            showTitle={selectedShow.title}
            onClose={() => {
              setShowEpisodeSelector(false);
              setSelectedShow(null);
            }}
          />
        ) : selectedContent.id ? (
          <VideoPlayer
            type={selectedContent.type!}
            id={selectedContent.id}
            title={selectedContent.title}
            onClose={handleClosePlayer}
          />
        ) : (
          <>
            {/* Tabs - Only show when not in hero view */}
            {!searchQuery && (
              <div className="flex space-x-4 mb-8">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    activeTab === 'all'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  All Content
                </button>
                <button
                  onClick={() => setActiveTab('movies')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    activeTab === 'movies'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Movies
                </button>
                <button
                  onClick={() => setActiveTab('shows')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                    activeTab === 'shows'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-900 text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  TV Shows
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600"></div>
              </div>
            ) : (
              <>
                {/* Trending Movies Section */}
                {!searchQuery && (activeTab === 'all' || activeTab === 'movies') && displayMovies.length > 0 && (
                  <section className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-6 h-6 text-red-600" />
                        <h2 className="text-2xl font-bold text-white">Trending Movies</h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {displayMovies.slice(0, 18).map((movie) => (
                        <ContentCard
                          key={movie._id}
                          id={movie._id}
                          title={movie.title}
                          year={movie.year}
                          poster={movie.images?.poster}
                          rating={movie.rating?.percentage}
                          onPlay={() => handlePlayMovie(movie)}
                          onInfo={() => handleShowDetail(movie, 'movie')}
                          type="movie"
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* Movies Section */}
                {(activeTab === 'all' || activeTab === 'movies') && displayMovies.length > 0 && searchQuery && (
                  <section className="mb-12">
                    <div className="flex items-center space-x-2 mb-6">
                      <Film className="w-6 h-6 text-red-600" />
                      <h2 className="text-2xl font-bold text-white">
                        {searchQuery ? 'Search Results' : 'Popular Movies'}
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {displayMovies.map((movie) => (
                        <ContentCard
                          key={movie._id}
                          id={movie._id}
                          title={movie.title}
                          year={movie.year}
                          poster={movie.images?.poster}
                          rating={movie.rating?.percentage}
                          onPlay={() => handlePlayMovie(movie)}
                          onInfo={() => handleShowDetail(movie, 'movie')}
                          type="movie"
                        />
                      ))}
                    </div>
                    {!searchQuery && (
                      <Pagination
                        currentPage={moviesPage}
                        onPageChange={(page) => {
                          setMoviesPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isLoading={loading}
                      />
                    )}
                    {searchQuery && (
                      <Pagination
                        currentPage={searchMoviesPage}
                        onPageChange={(page) => {
                          setSearchMoviesPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isLoading={loading}
                      />
                    )}
                  </section>
                )}

                {/* Trending TV Shows Section */}
                {!searchQuery && (activeTab === 'all' || activeTab === 'shows') && displayShows.length > 0 && (
                  <section className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-6 h-6 text-red-600" />
                        <h2 className="text-2xl font-bold text-white">Trending TV Shows</h2>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {displayShows.slice(0, 18).map((show) => (
                        <ContentCard
                          key={show._id}
                          id={show._id}
                          title={show.title}
                          year={show.year}
                          poster={show.images?.poster}
                          rating={show.rating?.percentage}
                          onPlay={() => handlePlayShow(show)}
                          onInfo={() => handleShowDetail(show, 'show')}
                          type="show"
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* TV Shows Section */}
                {(activeTab === 'all' || activeTab === 'shows') && displayShows.length > 0 && searchQuery && (
                  <section className="mb-12">
                    <div className="flex items-center space-x-2 mb-6">
                      <Tv className="w-6 h-6 text-red-600" />
                      <h2 className="text-2xl font-bold text-white">
                        {searchQuery ? 'Search Results' : 'Popular TV Shows'}
                      </h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                      {displayShows.map((show) => (
                        <ContentCard
                          key={show._id}
                          id={show._id}
                          title={show.title}
                          year={show.year}
                          poster={show.images?.poster}
                          rating={show.rating?.percentage}
                          onPlay={() => handlePlayShow(show)}
                          onInfo={() => handleShowDetail(show, 'show')}
                          type="show"
                        />
                      ))}
                    </div>
                    {!searchQuery && (
                      <Pagination
                        currentPage={showsPage}
                        onPageChange={(page) => {
                          setShowsPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isLoading={loading}
                      />
                    )}
                    {searchQuery && (
                      <Pagination
                        currentPage={searchShowsPage}
                        onPageChange={(page) => {
                          setSearchShowsPage(page);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        isLoading={loading}
                      />
                    )}
                  </section>
                )}

                {!loading && displayMovies.length === 0 && displayShows.length === 0 && (
                  <div className="text-center py-16">
                    <p className="text-gray-400 text-lg">
                      {searchQuery ? 'No results found' : 'No content available'}
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

