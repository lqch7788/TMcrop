import { useState, useCallback, useEffect, useRef } from 'react';

interface DragInfo {
  position: { x: number; y: number };
  isDragging: boolean;
}

const globalDragState = new Map<string, DragInfo>();
const listeners = new Map<string, (info: DragInfo) => void>();

export function useGlobalDraggableV2(id: string) {
  const [, forceUpdate] = useState({});
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 });

  useEffect(() => {
    if (!globalDragState.has(id)) {
      globalDragState.set(id, { position: { x: 0, y: 0 }, isDragging: false });
    }

    const updateState = (info: DragInfo) => {
      forceUpdate({});
    };
    listeners.set(id, updateState);

    return () => {
      listeners.delete(id);
    };
  }, [id]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const current = globalDragState.get(id)!;
    globalDragState.set(id, { ...current, isDragging: true });
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: current.position.x,
      initialY: current.position.y,
    };
    forceUpdate({});
    
    const handleMouseMove = (e: MouseEvent) => {
      const info = globalDragState.get(id)!;
      if (!info.isDragging) return;
      const deltaX = e.clientX - dragRef.current.startX;
      const deltaY = e.clientY - dragRef.current.startY;
      globalDragState.set(id, {
        position: {
          x: dragRef.current.initialX + deltaX,
          y: dragRef.current.initialY + deltaY,
        },
        isDragging: true,
      });
      listeners.get(id)?.(globalDragState.get(id)!);
    };

    const handleMouseUp = () => {
      const info = globalDragState.get(id)!;
      globalDragState.set(id, { ...info, isDragging: false });
      listeners.get(id)?.(globalDragState.get(id)!);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [id]);

  const info = globalDragState.get(id) || { position: { x: 0, y: 0 }, isDragging: false };
  
  const dialogStyle: React.CSSProperties = {
    transform: `translate(${info.position.x}px, ${info.position.y}px)`,
    cursor: info.isDragging ? 'grabbing' : 'grab',
  };

  return { handleMouseDown, dialogStyle };
}
