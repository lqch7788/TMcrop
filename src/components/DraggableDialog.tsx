import { useDraggable } from '../hooks/useDraggable';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DraggableDialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function DraggableDialog({ title, onClose, children, className = '' }: DraggableDialogProps) {
  const { handleMouseDown, draggableStyle } = useDraggable();

  return (
    <div 
      className={`bg-white rounded-xl shadow-xl ${className}`}
      style={draggableStyle}
    >
      <div 
        className="px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleMouseDown}
      >
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5 text-gray-400" />
        </Button>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
