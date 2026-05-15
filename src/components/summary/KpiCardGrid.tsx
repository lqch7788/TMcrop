/**
 * KPI 卡片网格容器 - 响应式网格布局
 */

export interface KpiCardGridProps {
  /** 子元素（通常为 KpiCard 组件） */
  children: React.ReactNode;
  /** 每行列数，默认 6 */
  columns?: 2 | 3 | 4 | 5 | 6;
}

/** columns 到 CSS 类名的映射 */
const GRID_COLS: Record<number, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
  6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6',
};

export function KpiCardGrid({ children, columns = 6 }: KpiCardGridProps) {
  const colClass = GRID_COLS[columns] || GRID_COLS[6];

  return (
    <div className={`grid ${colClass} gap-4`}>
      {children}
    </div>
  );
}
