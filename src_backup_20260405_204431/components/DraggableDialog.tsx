import { useDraggable } from '../hooks/useDraggable';
import { ReactNode } from 'react';

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
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
          <span className="text-2xl text-gray-400">&times;</span>
        </button>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}
