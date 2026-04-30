import { useDraggable } from '../hooks/useDraggable';
import { ReactNode } from 'react';

interface DraggableContainerProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  titleClassName?: string;
  onTitleMouseDown?: (e: React.MouseEvent) => void;
}

export function DraggableContainer({ 
  children, 
  className = '', 
  style = {},
  titleClassName = '',
  onTitleMouseDown 
}: DraggableContainerProps) {
  const { handleMouseDown, draggableStyle } = useDraggable();

  return (
    <div 
      className={`bg-white rounded-xl shadow-xl ${className}`}
      style={{ ...draggableStyle, ...style }}
    >
      <div 
        className={`cursor-grab active:cursor-grabbing select-none ${titleClassName}`}
        onMouseDown={onTitleMouseDown || handleMouseDown}
      >
        {/* 内容通过children传入，这里只处理拖动 */}
      </div>
      {children}
    </div>
  );
}
