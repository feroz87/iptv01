'use client';

import { useState, useEffect } from 'react';
import { Play, Info, Star, Calendar, Clock, Film } from 'lucide-react';
import { Movie, TVShow } from '@/lib/api';
import Image from 'next/image';

interface HeroSectionProps {
  featuredContent: Movie | TVShow | null;
  onPlay: () => void;
  onInfo: () => void;
}

export default function HeroSection({ featuredContent, onPlay, onInfo }: HeroSectionProps) {
  if (!featuredContent) {
    return null;
  }

  const backgroundImage = featuredContent.images?.fanart || featuredContent.images?.poster || '';

  return (
    <div className="relative w-full h-[80vh] min-h-[600px] overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        {backgroundImage && (
          <Image
            src={backgroundImage}
            alt={featuredContent.title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
        <div className="max-w-2xl">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-primary-600/80 backdrop-blur-sm rounded-full text-sm font-semibold text-white">
              {featuredContent.rating?.percentage ? `${featuredContent.rating.percentage}% Match` : 'Featured'}
            </span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-2xl">
            {featuredContent.title}
          </h1>
          
          <div className="flex items-center space-x-4 mb-6 text-gray-300">
            {featuredContent.year && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>{featuredContent.year}</span>
              </div>
            )}
            {featuredContent.rating?.percentage && (
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{featuredContent.rating.percentage}%</span>
              </div>
            )}
            {featuredContent.genres && featuredContent.genres.length > 0 && (
              <div className="flex items-center space-x-2">
                {featuredContent.genres.slice(0, 2).map((genre, idx) => (
                  <span key={idx} className="text-sm">{genre}</span>
                ))}
              </div>
            )}
          </div>

          {featuredContent.synopsis && (
            <p className="text-lg text-gray-300 mb-8 line-clamp-3 drop-shadow-lg">
              {featuredContent.synopsis}
            </p>
          )}

          <div className="flex space-x-4">
            <button
              onClick={onPlay}
              className="px-8 py-3 bg-white text-black rounded-lg font-semibold hover:bg-gray-200 transition-colors flex items-center space-x-2 shadow-xl"
            >
              <Play className="w-5 h-5 fill-black" />
              <span>Play</span>
            </button>
            <button
              onClick={onInfo}
              className="px-8 py-3 bg-gray-700/80 backdrop-blur-sm text-white rounded-lg font-semibold hover:bg-gray-600 transition-colors flex items-center space-x-2"
            >
              <Info className="w-5 h-5" />
              <span>More Info</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

