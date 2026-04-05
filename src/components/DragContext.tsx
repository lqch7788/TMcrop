import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

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
  const dragStates = useState<Record<string, DragState>>({});
  
  const getDragHandlers = useCallback((id: string) => {
    // 这个实现会比较复杂，需要为每个弹窗创建独立的状态
    return {
      onMouseDown: () => {},
      style: {},
    };
  }, []);

  return (
    <DragContext.Provider value={{ getDragHandlers }}>
      {children}
    </DragContext.Provider>
  );
}

export function useDragContext() {
  return useContext(DragContext);
}
