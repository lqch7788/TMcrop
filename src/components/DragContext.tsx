/**
 * 拖拽 Context
 * 已迁移到 Zustand Store (src/stores/useDragStore.ts)
 */
import { createContext, useContext, type ReactNode } from 'react';

interface DragState {
  isDragging: boolean;
  dragRef: React.RefObject<HTMLDivElement | null>;
}

interface DragContextType {
  getDragHandlers: (id: string) => {
    onMouseDown: (e: React.MouseEvent) => void;
    style: React.CSSProperties;
  };
}

const DragContext = createContext<DragContextType | null>(null);

export function DragProvider({ children }: { children: ReactNode }) {
  // 占位实现，实际拖拽功能在具体组件中实现
  const getDragHandlers = () => {
    return {
      onMouseDown: () => {},
      style: {},
    };
  };

  return (
    <DragContext.Provider value={{ getDragHandlers }}>
      {children}
    </DragContext.Provider>
  );
}

export function useDragContext() {
  return useContext(DragContext);
}
