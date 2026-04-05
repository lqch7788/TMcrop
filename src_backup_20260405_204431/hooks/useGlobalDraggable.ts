import { useState, useCallback, useRef, useEffect } from 'react';

const dragStateMap = new Map<string, {
  position: { x: number; y: number };
  isDragging: boolean;
  dragRef: { startX: number; startY: number; initialX: number; initialY: number };
}>();

export function useGlobalDraggable(id: string) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  if (!dragStateMap.has(id)) {
    dragStateMap.set(id, {
      position: { x: 0, y: 0 },
      isDragging: false,
      dragRef: { startX: 0, startY: 0, initialX: 0, initialY: 0 }
    });
  }
  
  const state = dragStateMap.get(id)!;

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    state.isDragging = true;
    state.dragRef = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: state.position.x,
      initialY: state.position.y,
    };
  }, [state]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!state.isDragging) return;
      const deltaX = e.clientX - state.dragRef.startX;
      const deltaY = e.clientY - state.dragRef.startY;
      const newPos = {
        x: state.dragRef.initialX + deltaX,
        y: state.dragRef.initialY + deltaY,
      };
      state.position = newPos;
      setPosition({ ...newPos });
    };

    const handleMouseUp = () => {
      if (state.isDragging) {
        state.isDragging = false;
        setIsDragging(false);
      }
    };

    if (state.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [state.isDragging, state.dragRef]);

  const dialogStyle: React.CSSProperties = {
    transform: `translate(${position.x}px, ${position.y}px)`,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return { position, isDragging, handleMouseDown, dialogStyle };
}
