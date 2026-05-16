/**
 * 弹窗拖拽 + 8方向缩放 Hook
 * 用法：在弹窗组件中调用，拖拽标题栏移动，拖拽四角/四边缩放
 */

import { useState, useCallback, useRef } from 'react';

interface DragResizeOptions {
  minWidth?: number;
  minHeight?: number;
  initialWidth?: number;
  initialHeight?: number;
}

export function useDragResize(options: DragResizeOptions = {}) {
  const { minWidth = 400, minHeight = 300, initialWidth = 500, initialHeight = 400 } = options;

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: initialWidth, height: initialHeight });
  const dragState = useRef<{ startX: number; startY: number; startPosX: number; startPosY: number } | null>(null);
  const resizeState = useRef<{ dir: string; startX: number; startY: number; startW: number; startH: number; startPosX: number; startPosY: number } | null>(null);

  // ========== 拖拽 ==========

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragState.current) return;
      const dx = ev.clientX - dragState.current.startX;
      const dy = ev.clientY - dragState.current.startY;
      setPosition({
        x: dragState.current.startPosX + dx,
        y: dragState.current.startPosY + dy,
      });
    };

    const onUp = () => {
      dragState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [position]);

  // ========== 缩放 ==========

  const startResize = useCallback((dir: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizeState.current = {
      dir,
      startX: e.clientX,
      startY: e.clientY,
      startW: size.width,
      startH: size.height,
      startPosX: position.x,
      startPosY: position.y,
    };

    const onMove = (ev: MouseEvent) => {
      if (!resizeState.current) return;
      const { dir: d, startX, startY, startW, startH, startPosX, startPosY } = resizeState.current;
      let dw = 0, dh = 0, dx = 0, dy = 0;
      const mx = ev.clientX - startX;
      const my = ev.clientY - startY;

      if (d.includes('e')) { dw = mx; }
      if (d.includes('w')) { dw = -mx; dx = mx; }
      if (d.includes('s')) { dh = my; }
      if (d.includes('n')) { dh = -my; dy = my; }

      const newW = Math.max(minWidth, startW + dw);
      const newH = Math.max(minHeight, startH + dh);
      // 修正位移（当宽度/高度被 min 限制时）
      const actualDw = newW - startW;
      const actualDh = newH - startH;
      if (d.includes('w')) dx = -actualDw;
      if (d.includes('n')) dy = -actualDh;

      setSize({ width: newW, height: newH });
      setPosition({ x: startPosX + dx, y: startPosY + dy });
    };

    const onUp = () => {
      resizeState.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [size, position, minWidth, minHeight]);

  // ========== 重置 ==========

  const resetPosition = useCallback(() => {
    setPosition({ x: 0, y: 0 });
    setSize({ width: initialWidth, height: initialHeight });
  }, [initialWidth, initialHeight]);

  // ========== 缩放把手渲染 ==========

  const resizeHandles = (
    <>
      {/* 四角 */}
      <div className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize z-10" onMouseDown={startResize('nw')} />
      <div className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize z-10" onMouseDown={startResize('ne')} />
      <div className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize z-10" onMouseDown={startResize('sw')} />
      <div className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize z-10" onMouseDown={startResize('se')} />
      {/* 四边 */}
      <div className="absolute top-0 left-3 right-3 h-1.5 cursor-n-resize z-10" onMouseDown={startResize('n')} />
      <div className="absolute bottom-0 left-3 right-3 h-1.5 cursor-s-resize z-10" onMouseDown={startResize('s')} />
      <div className="absolute left-0 top-3 bottom-3 w-1.5 cursor-w-resize z-10" onMouseDown={startResize('w')} />
      <div className="absolute right-0 top-3 bottom-3 w-1.5 cursor-e-resize z-10" onMouseDown={startResize('e')} />
    </>
  );

  return { position, size, startDrag, resetPosition, resizeHandles };
}
