import { useDraggableModal } from '../hooks/useDraggableModal';
import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface DraggableTitleBarProps {
  title: string;
  onClose: () => void;
  className?: string;
  icon?: ReactNode;
}

export function DraggableTitleBar({ title, onClose, className = '', icon }: DraggableTitleBarProps) {
  const { handleMouseDown, dialogStyle } = useDraggableModal();

  return (
    <div 
      className={`px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-grab active:cursor-grabbing select-none ${className}`}
      onMouseDown={handleMouseDown}
    >
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className="w-5 h-5 text-gray-400" />
      </Button>
    </div>
  );
}

export { useDraggableModal };
