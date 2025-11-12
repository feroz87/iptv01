'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages?: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  isLoading = false,
}: PaginationProps) {
  const handlePrevious = () => {
    if (currentPage > 1 && !isLoading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (!isLoading) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page: number) => {
    if (page !== currentPage && !isLoading) {
      onPageChange(page);
    }
  };

  // Show pagination only if we're past page 1 or if we know there are more pages
  if (currentPage === 1 && !totalPages) {
    return (
      <div className="flex justify-center items-center mt-8">
        <button
          onClick={handleNext}
          disabled={isLoading}
          className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <span>Load More</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    
    if (!totalPages || totalPages <= maxVisible) {
      // Show all pages if total is small
      for (let i = 1; i <= (totalPages || currentPage + 2); i++) {
        pages.push(i);
      }
    } else {
      // Show smart pagination
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div className="flex justify-center items-center mt-8 space-x-2">
      <button
        onClick={handlePrevious}
        disabled={currentPage === 1 || isLoading}
        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-lg transition-colors flex items-center space-x-2"
      >
        <ChevronLeft className="w-4 h-4" />
        <span>Previous</span>
      </button>

      <div className="flex space-x-2">
        {getPageNumbers().map((page, index) => {
          if (page === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-4 py-2 text-gray-400">
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => handlePageClick(pageNum)}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-900 hover:bg-gray-800 text-gray-300 disabled:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50'
              }`}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      <button
        onClick={handleNext}
        disabled={isLoading}
        className="px-4 py-2 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 text-white rounded-lg transition-colors flex items-center space-x-2"
      >
        <span>Next</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

