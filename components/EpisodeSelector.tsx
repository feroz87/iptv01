'use client';

import { useState, useEffect } from 'react';
import { Play, ChevronDown, ChevronUp } from 'lucide-react';
import { streamingAPI, Episode } from '@/lib/api';
import VideoPlayer from './VideoPlayer';

interface EpisodeSelectorProps {
  showId: string;
  showTitle: string;
  onClose: () => void;
}

export default function EpisodeSelector({ showId, showTitle, onClose }: EpisodeSelectorProps) {
  const [seasons, setSeasons] = useState<{ [season: number]: Episode[] }>({});
  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [loading, setLoading] = useState(true);
  const [expandedSeasons, setExpandedSeasons] = useState<Set<number>>(new Set([1]));
  const [selectedEpisode, setSelectedEpisode] = useState<{
    season: number;
    episode: number;
  } | null>(null);

  useEffect(() => {
    loadSeasons();
  }, [showId]);

  const loadSeasons = async () => {
    setLoading(true);
    try {
      // Try to load multiple seasons (adjust based on API response)
      const seasonsData: { [season: number]: Episode[] } = {};
      
      // Load first 5 seasons (adjust as needed)
      for (let season = 1; season <= 5; season++) {
        try {
          const episodes = await streamingAPI.getEpisodes(showId, season);
          if (episodes.length > 0) {
            seasonsData[season] = episodes;
          }
        } catch (error) {
          // Season doesn't exist or failed to load
          break;
        }
      }

      setSeasons(seasonsData);
      if (Object.keys(seasonsData).length > 0) {
        setSelectedSeason(Math.min(...Object.keys(seasonsData).map(Number)));
      }
    } catch (error) {
      console.error('Failed to load seasons:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSeason = (season: number) => {
    const newExpanded = new Set(expandedSeasons);
    if (newExpanded.has(season)) {
      newExpanded.delete(season);
    } else {
      newExpanded.add(season);
    }
    setExpandedSeasons(newExpanded);
  };

  const handlePlayEpisode = (season: number, episode: number) => {
    setSelectedEpisode({ season, episode });
  };

  if (selectedEpisode) {
    return (
      <VideoPlayer
        type="show"
        id={showId}
        title={showTitle}
        season={selectedEpisode.season}
        episode={selectedEpisode.episode}
        onClose={() => setSelectedEpisode(null)}
      />
    );
  }

  const seasonNumbers = Object.keys(seasons).map(Number).sort((a, b) => a - b);

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{showTitle}</h1>
            <p className="text-gray-400">Select an episode to watch</p>
          </div>
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-white rounded-full p-2 transition-colors"
            aria-label="Close"
          >
            <ChevronUp className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : seasonNumbers.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-lg">No episodes available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {seasonNumbers.map((season) => (
              <div key={season} className="bg-gray-900 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleSeason(season)}
                  className="w-full px-6 py-4 flex items-center justify-between bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <h2 className="text-xl font-semibold text-white">
                    Season {season}
                  </h2>
                  {expandedSeasons.has(season) ? (
                    <ChevronUp className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  )}
                </button>
                {expandedSeasons.has(season) && (
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {seasons[season].map((episode) => (
                      <button
                        key={episode._id}
                        onClick={() => handlePlayEpisode(season, episode.episode)}
                        className="text-left p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="bg-primary-600 rounded px-2 py-1">
                              <span className="text-white text-xs font-semibold">
                                E{episode.episode}
                              </span>
                            </div>
                            <span className="text-gray-400 text-sm">
                              S{season}
                            </span>
                          </div>
                          <Play className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                        </div>
                        <h3 className="text-white font-semibold text-sm mb-1 line-clamp-1">
                          {episode.title}
                        </h3>
                        {episode.overview && (
                          <p className="text-gray-400 text-xs line-clamp-2">
                            {episode.overview}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

