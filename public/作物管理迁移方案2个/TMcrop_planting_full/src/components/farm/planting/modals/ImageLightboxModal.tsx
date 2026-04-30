/**
 * 图片放大弹窗
 */

import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageLightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
}

export function ImageLightboxModal({ isOpen, onClose, images }: ImageLightboxModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  if (!isOpen || images.length === 0) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {images.length > 1 && (
        <button
          onClick={handlePrev}
          className="absolute left-4 p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      <div className="max-w-4xl max-h-[90vh] mx-4">
        <img
          src={images[currentIndex]}
          alt={`图片 ${currentIndex + 1}`}
          className="max-w-full max-h-[85vh] object-contain rounded-lg"
        />
      </div>

      {images.length > 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
          {currentIndex + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
