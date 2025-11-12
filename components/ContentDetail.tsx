'use client';

import { useState } from 'react';
import { X, Play, Star, Calendar, Clock, Film, Tv } from 'lucide-react';
import { Movie, TVShow } from '@/lib/api';
import Image from 'next/image';
import VideoPlayer from './VideoPlayer';

interface ContentDetailProps {
  content: Movie | TVShow;
  type: 'movie' | 'show';
  onClose: () => void;
  onPlay: (content: Movie | TVShow) => void;
}

export default function ContentDetail({ content, type, onClose, onPlay }: ContentDetailProps) {
  const [showPlayer, setShowPlayer] = useState(false);

  const handlePlay = () => {
    setShowPlayer(true);
  };

  if (showPlayer) {
    return (
      <VideoPlayer
        type={type}
        id={content._id}
        title={content.title}
        onClose={() => setShowPlayer(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black overflow-y-auto">
      <div className="relative">
        {/* Background Image */}
        {content.images?.fanart && (
          <div className="absolute inset-0 h-[60vh]">
            <Image
              src={content.images.fanart}
              alt={content.title}
              fill
              className="object-cover opacity-30"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black via-black/50 to-black" />
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row gap-8">
            {/* Poster */}
            <div className="flex-shrink-0">
              {content.images?.poster && (
                <div className="relative w-64 h-96 rounded-lg overflow-hidden shadow-2xl">
                  <Image
                    src={content.images.poster}
                    alt={content.title}
                    fill
                    className="object-cover"
                    sizes="256px"
                  />
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 text-white">
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{content.title}</h1>
              
              <div className="flex flex-wrap items-center gap-4 mb-6 text-gray-300">
                {content.year && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>{content.year}</span>
                  </div>
                )}
                {content.rating?.percentage && (
                  <div className="flex items-center space-x-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{content.rating.percentage}%</span>
                  </div>
                )}
                {content.runtime && (
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{content.runtime}</span>
                  </div>
                )}
                {type === 'show' && 'num_seasons' in content && content.num_seasons && (
                  <div className="flex items-center space-x-1">
                    <Tv className="w-4 h-4" />
                    <span>{content.num_seasons} Seasons</span>
                  </div>
                )}
              </div>

              {content.genres && content.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {content.genres.map((genre, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-gray-800 rounded-full text-sm"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              <div className="mb-8">
                <button
                  onClick={handlePlay}
                  className="px-8 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors flex items-center space-x-2"
                >
                  <Play className="w-5 h-5 fill-white" />
                  <span>Play Now</span>
                </button>
              </div>

              {content.synopsis && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-2">Overview</h2>
                  <p className="text-gray-300 leading-relaxed">{content.synopsis}</p>
                </div>
              )}

              {type === 'movie' && 'torrents' in content && content.torrents && (
                <div>
                  <h2 className="text-xl font-semibold mb-2">Available Qualities</h2>
                  <div className="flex flex-wrap gap-2">
                    {Object.keys(content.torrents).map((quality) => (
                      <span
                        key={quality}
                        className="px-3 py-1 bg-gray-800 rounded text-sm"
                      >
                        {quality}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

