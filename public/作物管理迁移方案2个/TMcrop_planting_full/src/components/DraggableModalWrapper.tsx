import { useDraggableModal } from '../hooks/useDraggableModal';
import { ReactNode } from 'react';

interface DraggableModalWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  dialogClassName?: string;
  headerClassName?: string;
}

export function DraggableModalWrapper({ 
  isOpen, 
  onClose, 
  children,
  dialogClassName = '',
  headerClassName = ''
}: DraggableModalWrapperProps) {
  const { handleMouseDown, dialogStyle } = useDraggableModal();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div 
        className={`bg-white rounded-xl shadow-xl ${dialogClassName}`}
        style={dialogStyle}
      >
        <div 
          className={`cursor-grab active:cursor-grabbing select-none ${headerClassName}`}
          onMouseDown={handleMouseDown}
        >
          {/* 子组件需要提供头部内容 */}
        </div>
        {children}
      </div>
    </div>
  );
}
