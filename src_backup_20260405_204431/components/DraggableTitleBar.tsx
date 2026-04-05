import { useDraggableModal } from '../hooks/useDraggableModal';
import { ReactNode } from 'react';

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
      <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
        <span className="text-2xl text-gray-400">&times;</span>
      </button>
    </div>
  );
}

export { useDraggableModal };
