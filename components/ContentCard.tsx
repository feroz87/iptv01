'use client';

import { Play, Info } from 'lucide-react';
import Image from 'next/image';

interface ContentCardProps {
  id: string;
  title: string;
  year: number;
  poster?: string;
  rating?: number;
  onPlay: () => void;
  onInfo?: () => void;
  type: 'movie' | 'show';
}

export default function ContentCard({
  title,
  year,
  poster,
  rating,
  onPlay,
  onInfo,
  type,
}: ContentCardProps) {
  const posterUrl = poster || `https://via.placeholder.com/300x450?text=${encodeURIComponent(title)}`;

  return (
    <div className="group relative cursor-pointer">
      <div className="relative aspect-[2/3] rounded-lg overflow-hidden bg-gray-900">
        <Image
          src={posterUrl}
          alt={title}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-110"
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
            className="bg-red-600 hover:bg-red-700 rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform shadow-lg"
            aria-label="Play"
          >
            <Play className="w-6 h-6 text-white fill-white" />
          </button>
          {onInfo && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onInfo();
              }}
              className="bg-gray-800/90 hover:bg-gray-700 rounded-full p-3 transform scale-90 group-hover:scale-100 transition-transform"
              aria-label="More Info"
            >
              <Info className="w-6 h-6 text-white" />
            </button>
          )}
        </div>
        {rating && (
          <div className="absolute top-2 right-2 bg-black/80 px-2 py-1 rounded flex items-center space-x-1">
            <span className="text-yellow-400 text-sm">★</span>
            <span className="text-white text-sm font-semibold">{rating}%</span>
          </div>
        )}
      </div>
      <div className="mt-2">
        <h3 className="text-white font-semibold text-sm line-clamp-1 group-hover:text-red-400 transition-colors">
          {title}
        </h3>
        <p className="text-gray-400 text-xs mt-1">{year}</p>
      </div>
    </div>
  );
}

