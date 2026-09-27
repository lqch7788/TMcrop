// MaterialTopRanking 组件（2026-09-27 审计缺功能补完：物料领用 TOP10 排行）
// 按领用数量排序取前 10 名，横条进度可视化
import type { MaterialStatItem } from '../types/statisticsTab.types';

interface MaterialTopRankingProps {
  /** 物料统计数据（全量，本组件内部排序取 TOP10） */
  data: MaterialStatItem[];
}

export function MaterialTopRanking({ data }: MaterialTopRankingProps) {
  // 按申请量排序取前 10（排除 0 数量行）
  const top = [...data]
    .filter((m) => (m.totalQuantity || 0) > 0)
    .sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0))
    .slice(0, 10);
  if (top.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <h3 className="text-base font-semibold text-gray-800 mb-3">物料领用 TOP10</h3>
        <div className="text-center py-6 text-gray-400 text-sm">暂无领用数据</div>
      </div>
    );
  }
  const maxQty = top[0].totalQuantity || 1;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
      <h3 className="text-base font-semibold text-gray-800 mb-3">物料领用 TOP10</h3>
      <div className="space-y-2">
        {top.map((m, i) => {
          const pct = Math.round(((m.totalQuantity || 0) / maxQty) * 100);
          return (
            <div key={m.materialCode} className="flex items-center gap-3">
              {/* 名次徽章 */}
              <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-orange-400' : 'bg-gray-300'
              }`}>
                {i + 1}
              </span>
              {/* 名称 */}
              <span className="w-28 shrink-0 text-sm text-gray-700 truncate" title={m.materialName}>
                {m.materialName}
              </span>
              <span className="w-24 shrink-0 text-xs text-gray-400 font-mono truncate" title={m.materialCode}>
                {m.materialCode}
              </span>
              {/* 横条 */}
              <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {/* 数量 */}
              <span className="w-16 shrink-0 text-right text-sm font-medium text-gray-800">
                {(m.totalQuantity || 0).toLocaleString()} {m.unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
