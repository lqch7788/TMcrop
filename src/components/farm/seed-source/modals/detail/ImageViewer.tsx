/**
 * 图片放大查看器
 * 2026-10-18：从 DetailModal.tsx 拆出（纯移动，无逻辑变更）
 * 2026-10-17：与种植详情 DetailModal 同模式复用
 */
import { Button } from '@/components/ui';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

export function ImageViewer({ images, selectedIndex, onClose, onPrev, onNext }: {
  images: string[];
  selectedIndex: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClose}
        className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full z-10"
      >
        <X className="w-8 h-8" />
      </Button>
      {selectedIndex > 0 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrev}
          className="absolute left-4 text-white hover:bg-white/20 rounded-full z-10"
        >
          <ChevronLeft className="w-8 h-8" />
        </Button>
      )}
      <img
        src={images[selectedIndex]}
        alt={`图片${selectedIndex + 1}`}
        className="max-w-[90vw] max-h-[90vh] object-contain"
      />
      {selectedIndex < images.length - 1 && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          className="absolute right-4 text-white hover:bg-white/20 rounded-full z-10"
        >
          <ChevronRight className="w-8 h-8" />
        </Button>
      )}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm">
        {selectedIndex + 1} / {images.length}
      </div>
    </div>
  );
}
