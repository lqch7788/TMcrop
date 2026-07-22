/**
 * 上游溯源链面板（2026-07-22 · 折叠组版本）
 *
 * 每个入库路径一个可折叠的追溯组，用户可看到每条入库的来源
 * 数据源：GET /api/seed-sources/:id/upstream-trace
 */

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle, ChevronDown, ChevronRight, ArrowUp, Package, Sprout, Leaf, Store, HelpCircle } from 'lucide-react';
import { enhancedApiClient } from '@/lib/apiClient';

// ========== 类型 ==========

interface UpstreamNode {
  id: string;
  type: string;
  code: string;
  label: string;
  relation: string;
  relationLabel: string;
  occurredAt: string;
  operatorName?: string;
  quantity?: number;
  unit?: string;
  cropName?: string;
  cropVariety?: string;
  seedForm?: string;
  supplierName?: string;
  supplierId?: string;
  sourceModule?: string;
  children: UpstreamNode[];
  isOrphan?: boolean;
  isCycle?: boolean;
  depth: number;
}

interface UpstreamTraceData {
  root: UpstreamNode;
  depth: number;
  totalNodes: number;
  truncated: boolean;
  hasCycle: boolean;
  traceTime: number;
}

// ========== 常量 ==========

const TYPE_ICON: Record<string, JSX.Element> = {
  seed_source: <Package className="w-4 h-4 text-emerald-600" />,
  inventory_stock: <Package className="w-4 h-4 text-blue-600" />,
  inventory_inbound: <Package className="w-4 h-4 text-gray-500" />,
  planting: <Leaf className="w-4 h-4 text-amber-600" />,
  seedling: <Sprout className="w-4 h-4 text-teal-600" />,
  harvest_record: <Leaf className="w-4 h-4 text-orange-500" />,
  supplier: <Store className="w-4 h-4 text-purple-500" />,
  unknown: <HelpCircle className="w-4 h-4 text-red-400" />,
};

const TYPE_BADGE: Record<string, string> = {
  seed_source: 'bg-emerald-100 text-emerald-700',
  inventory_stock: 'bg-blue-100 text-blue-700',
  inventory_inbound: 'bg-gray-100 text-gray-700',
  planting: 'bg-amber-100 text-amber-700',
  seedling: 'bg-teal-100 text-teal-700',
  harvest_record: 'bg-orange-100 text-orange-700',
  supplier: 'bg-purple-100 text-purple-700',
  unknown: 'bg-red-100 text-red-700',
};

const TYPE_LABEL: Record<string, string> = {
  seed_source: '种源',
  inventory_stock: '作物库存',
  inventory_inbound: '入库记录',
  planting: '种植批次',
  seedling: '育苗批次',
  harvest_record: '采收记录',
  crop_circulation: '回流记录',
  supplier: '供应商',
  unknown: '未知',
};

// ========== 子组件 ==========

/** 把树展平为列表（深度优先） */
function flattenTree(node: UpstreamNode): UpstreamNode[] {
  const list: UpstreamNode[] = [node];
  for (const child of node.children) {
    list.push(...flattenTree(child));
  }
  return list;
}

/** 折叠组内的追溯行（包含根节点及其所有子节点） */
function TraceGroupRows({ root }: { root: UpstreamNode }) {
  const flat = flattenTree(root); // 全部展开（根节点也显示）
  return (
    <div>
      {flat.map((node, idx) => (
        <div
          key={`${node.id}-${idx}`}
          className="grid grid-cols-[180px_1fr_130px_130px_100px_100px] gap-2 items-center py-2 transition-colors border-b border-gray-200"
        >
          {/* 第一列：箭头 + 关系说明 */}
          <div className="flex items-center gap-2 min-w-0">
            <ArrowUp className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="text-xs text-gray-600 truncate">{node.relationLabel}</span>
          </div>

          {/* 来源信息：图标 + badge + 名称 */}
          <div className="min-w-0">
            {node.isCycle ? (
              <span className="text-xs text-blue-600 truncate">{node.label}</span>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  {TYPE_ICON[node.type]}
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_BADGE[node.type] || 'bg-gray-100 text-gray-600'}`}>
                    {TYPE_LABEL[node.type] || '-'}
                  </span>
                  <span className="text-sm font-medium text-gray-900 truncate">{node.label}</span>
                  {node.cropVariety && !node.label.includes(node.cropVariety) && (
                    <span className="text-sm text-gray-700">{node.cropVariety}</span>
                  )}
                  {node.isOrphan && <span className="text-xs text-red-400">数据已删除</span>}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600 mt-0.5 flex-wrap">
                  {node.supplierName && <span>供应商: {node.supplierName}</span>}
                  {node.seedForm && <span>形态: {node.seedForm}</span>}
                  {node.operatorName && <span>操作: {node.operatorName}</span>}
                </div>
              </>
            )}
          </div>

          {/* 编号 */}
          <span className="text-xs font-mono text-gray-700 truncate">
            {node.code || (node.id || '').substring(0, 16) || '-'}
          </span>

          {/* 时间 */}
          <span className="text-xs text-gray-600">
            {(node.occurredAt || '').slice(0, 10) || '-'}
          </span>

          {/* 数量 */}
          <span className="text-xs text-gray-700 truncate">
            {node.quantity != null && node.quantity > 0
              ? `${node.quantity.toLocaleString()}${node.unit || ''}`
              : '-'}
          </span>

          {/* 备注 */}
          <span className="text-xs text-gray-600 truncate">
            {node.sourceModule || node.operatorName || '-'}
          </span>
        </div>
      ))}
    </div>
  );
}

// ========== 主组件 ==========

interface UpstreamTracePanelProps {
  seedSourceId: string;
}

export function UpstreamTracePanel({ seedSourceId }: UpstreamTracePanelProps) {
  const [data, setData] = useState<UpstreamTraceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 折叠组展开状态：childIndex → boolean
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setLoading(true);
    setError(null);
    enhancedApiClient
      .get<UpstreamTraceData>(`/seed-sources/${seedSourceId}/upstream-trace?maxDepth=10`)
      .then((d) => {
        const result = d as unknown as UpstreamTraceData;
        setData(result);
        // 默认全部折叠
        setExpanded({});
        setLoading(false);
      })
      .catch((e) => {
        setError(String(e?.message || e));
        setLoading(false);
      });
  }, [seedSourceId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-500 justify-center">
        <Loader2 className="w-5 h-5 animate-spin" />正在追溯上游链路...
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-red-600 bg-red-50 rounded">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <span>追溯失败：{error}</span>
      </div>
    );
  }
  if (!data || !data.root) {
    return (
      <div className="text-center py-8 text-sm text-gray-400">
        <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />暂无溯源数据
      </div>
    );
  }

  const { root, depth, totalNodes, truncated, traceTime } = data;
  const groups = root.children; // 每个子节点是一组独立的入库路径

  const toggleGroup = (idx: number) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-3">
      {/* 概览栏 */}
      <div className="flex items-center gap-3 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
        <span className="font-medium text-gray-700">
          {TYPE_ICON[root.type]}
          <span className="ml-1">{root.label}</span>
          {root.cropVariety && !root.label.includes(root.cropVariety) && (
            <span className="ml-1 text-gray-500">({root.cropVariety})</span>
          )}
        </span>
        <span className="text-gray-300">|</span>
        <span>追溯深度 {depth} 层</span>
        <span>·</span>
        <span>共 {totalNodes} 个节点</span>
        {truncated && <span className="text-amber-500">· 已截断</span>}
        <span className="ml-auto text-gray-400">{traceTime}ms</span>
      </div>

      {/* 表头 */}
      <div className="grid grid-cols-[180px_1fr_130px_130px_100px_100px] gap-2 px-3 py-2 text-xs font-semibold bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-lg">
        <span>来源说明</span>
        <span>来源信息</span>
        <span>编号</span>
        <span>时间</span>
        <span>数量</span>
        <span>备注</span>
      </div>

      {/* 折叠组 */}
      {groups.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">
          当前种源为直接入库，无进一步上游信息
        </p>
      ) : (
        <div className="space-y-2">
          {groups.map((child, idx) => {
            const isOpen = expanded[idx] || false;
            // 摘要节点：优先 child 的第一个子节点，否则 child 自身
            const summary = child.children?.[0] || child;
            return (
              <div key={`group-${idx}`} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* 折叠组标题 */}
                <button
                  className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  onClick={() => toggleGroup(idx)}
                >
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  )}
                  <span className="text-xs font-medium text-gray-600">
                    第 {idx + 1} 次入库
                  </span>
                  <span className="text-xs text-gray-500">
                    {child.relationLabel}
                  </span>
                  <span className="text-gray-300">—</span>
                  {TYPE_ICON[summary.type]}
                  <span className="text-sm text-gray-900">{summary.label}</span>
                  {summary.cropVariety && (
                    <span className="text-xs text-gray-500">{summary.cropVariety}</span>
                  )}
                  <span className="text-xs text-gray-400">{summary.code}</span>
                  <span className="text-xs text-gray-400">
                    {(summary.occurredAt || '').slice(0, 10)}
                  </span>
                  {summary.quantity! > 0 && (
                    <span className="text-xs text-gray-500">
                      {summary.quantity!.toLocaleString()}{summary.unit || ''}
                    </span>
                  )}
                </button>

                {/* 折叠内容：追溯行 */}
                {isOpen && <TraceGroupRows root={child} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default UpstreamTracePanel;