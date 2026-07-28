/**
 * ChainTimeline - 全链路操作时间线组件（2026-07-22 新增）
 *
 * 用法：
 *   <ChainTimeline batchCode="PLAN001" />
 *   <ChainTimeline instanceId="INS-20260722-0001" />
 *   <ChainTimeline seedlingId="SDxxx" />
 *
 * 数据源：/api/summary/chain-timeline
 */

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, FileText, Sprout, Leaf, Package, Warehouse, Printer } from 'lucide-react';
import { enhancedApiClient } from '@/lib/apiClient';

interface ChainTimelineProps {
  batchCode?: string;
  instanceId?: string;
  seedSourceId?: string;
  seedlingId?: string;
  plantingId?: string;
  limit?: number;
}

interface TimelineItem {
  id: string;
  occurredAt: string;
  category: string;
  action: string;
  quantityDelta?: number;
  unit?: string;
  refCode?: string;
  operatorName?: string;
  remarks?: string;
  cropName?: string;
}

const CATEGORY_ICON: Record<string, JSX.Element> = {
  lifecycle: <FileText className="w-4 h-4 text-gray-500" />,
  inbound: <Package className="w-4 h-4 text-emerald-500" />,
  transaction: <Package className="w-4 h-4 text-blue-500" />,
  circulation: <Sprout className="w-4 h-4 text-teal-500" />,
  movement: <Leaf className="w-4 h-4 text-green-500" />,
  daily: <FileText className="w-4 h-4 text-purple-500" />,
  print: <Printer className="w-4 h-4 text-pink-500" />,
};

export function ChainTimeline({
  batchCode,
  instanceId,
  seedSourceId,
  seedlingId,
  plantingId,
  limit = 50,
}: ChainTimelineProps) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 2026-07-28 审核 M：cancelled 标志防止快速切换批次时后发先至覆盖最新响应
    let cancelled = false;
    if (!batchCode && !instanceId && !seedSourceId && !seedlingId && !plantingId) {
      setItems([]);
      return () => { cancelled = true; };
    }
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    if (batchCode) params.set('batchCode', batchCode);
    else if (instanceId) params.set('instanceId', instanceId);
    else if (seedSourceId) params.set('seedSourceId', seedSourceId);
    else if (seedlingId) params.set('seedlingId', seedlingId);
    else if (plantingId) params.set('plantingId', plantingId);
    if (limit) params.set('limit', String(limit));

    const url = `/summary/chain-timeline?${params.toString()}`;
    enhancedApiClient
      .get<{ items: TimelineItem[]; total: number }>(url)
      .then((data) => { if (!cancelled) setItems(data.items || []); })
      .catch((e) => { if (!cancelled) setError(String(e?.message || e)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [batchCode, instanceId, seedSourceId, seedlingId, plantingId, limit]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        加载时间线…
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>加载失败：{error}</span>
      </div>
    );
  }
  if (items.length === 0) {
    return <p className="text-sm text-gray-400 py-3 text-center">暂无操作记录</p>;
  }

  return (
    <div className="space-y-1 max-h-96 overflow-y-auto">
      {items.map((item, idx) => (
        <div
          key={`${item.id}-${item.category}-${idx}`}
          className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded transition-colors"
        >
          <div className="flex-shrink-0 mt-0.5">
            {CATEGORY_ICON[item.category] || <Warehouse className="w-4 h-4 text-gray-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-gray-900">{item.action}</span>
              {item.quantityDelta != null && item.quantityDelta !== 0 && (
                <span
                  className={`text-xs font-medium ${
                    item.quantityDelta > 0 ? 'text-emerald-600' : 'text-amber-600'
                  }`}
                >
                  {item.quantityDelta > 0 ? '+' : ''}
                  {item.quantityDelta}
                  {item.unit || ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
              <span>{(item.occurredAt || '').slice(0, 16).replace('T', ' ')}</span>
              {item.operatorName && <span>· {item.operatorName}</span>}
              {item.refCode && <span>· {item.refCode}</span>}
            </div>
            {item.remarks && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{item.remarks}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default ChainTimeline;