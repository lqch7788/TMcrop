/**
 * 通用统计卡 Loading 骨架屏
 * 2026-06-15 P1-4: 三态(loading/empty/error)中的 loading 态
 * 使用 animate-pulse 提供呼吸感，结构与真实卡保持一致避免布局跳动
 */
export function CardSkeleton() {
  return (
    <div
      className="bg-white rounded-xl shadow-none border border-gray-100 p-4 animate-pulse"
      aria-busy="true"
      aria-label="加载中"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gray-200" />
          <div className="h-4 w-20 bg-gray-200 rounded" />
        </div>
        <div className="h-7 w-10 bg-gray-200 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded" />
        <div className="h-3 w-4/5 bg-gray-100 rounded" />
        <div className="h-3 w-3/5 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
