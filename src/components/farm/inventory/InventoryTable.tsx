/**
 * 库存数据表格组件
 * 样式与 OrderTable 保持一致（gradient header / sticky / hover emerald-50）
 */

import React, { useMemo, useState } from 'react';
import { Package, Leaf, Sprout, ArrowUpCircle, Snowflake, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Pagination } from '@/components/ui';
// 2026-07-14：操作列编辑按钮 + 编辑弹窗
import { InventoryEditModal } from './InventoryEditModal';
// 2026-07-10 P1-4：抽到 LoadingSpinner 共享组件
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import {
  StockType,
  SourceType,
  InventoryStatus,
  InventoryStock,
  TraceResult,
  DownstreamTraceResult,
} from '../../../types/inventory';
import { initVarieties, getVarietyByName } from '../../../services/cropVarietyService';
import { SOURCE_ORIGIN_MAP } from '../../../constants/cropConstants';
import { translateForm, translateArea } from '../../../constants/formDictionary';

interface InventoryTableProps {
  data: InventoryStock[];
  loading: boolean;
  pagination: { current: number; pageSize: number };
  onChange: (pagination: { current: number; pageSize: number }) => void;
  onOutbound: (stock: InventoryStock) => void;
  onFreeze?: (stock: InventoryStock) => void;
  onViewDetail: (stock: InventoryStock) => void;
  // 批量操作相关（与 ActionToolbar 协同）
  selectedRows?: string[];
  onSelectionChange?: (instanceIds: string[]) => void;
  showCheckboxes?: boolean;
  onSelectAll?: () => void;
  // 2026-07-14：操作列编辑
  onEdit?: (stock: InventoryStock) => void;
}

const getStockTypeIcon = (stockType: StockType | string) => {
  switch (stockType) {
    case StockType.SEED:
    case 'seed':
      return <Leaf className="w-4 h-4 text-amber-600" />;
    case StockType.SEEDLING:
    case 'seedling':
      return <Sprout className="w-4 h-4 text-green-600" />;
    case StockType.PRODUCT:
    case 'product':
      return <Package className="w-4 h-4 text-emerald-600" />;
    default:
      return <Package className="w-4 h-4 text-gray-600" />;
  }
};

const getStockTypeName = (stockType: StockType | string) => {
  switch (stockType) {
    case StockType.SEED:
    case 'seed':
      return '种源';
    case StockType.SEEDLING:
    case 'seedling':
      return '种苗';
    case StockType.PRODUCT:
    case 'product':
      return '成品';
    default:
      return '未知';
  }
};

const getStockTypeBadge = (stockType: StockType | string) => {
  switch (stockType) {
    case StockType.SEED:
    case 'seed':
      return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">种源</span>;
    case StockType.SEEDLING:
    case 'seedling':
      return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">种苗</span>;
    case StockType.PRODUCT:
    case 'product':
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">成品</span>;
    default:
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">未知</span>;
  }
};

const getStatusBadge = (status: InventoryStatus | string) => {
  switch (status) {
    case InventoryStatus.IN_STOCK:
    case 'in_stock':
      return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">库存中</span>;
    case InventoryStatus.LOW_STOCK:
    case 'low_stock':
      return <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">低库存</span>;
    // 2026-07-14：区分全部冻结 vs 部分冻结
    case InventoryStatus.FROZEN:
    case 'frozen':
    case 'frozen_full':
      return <span className="px-2 py-1 bg-blue-200 text-blue-800 text-xs rounded-full font-semibold">全部冻结</span>;
    case 'frozen_partial':
      return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">部分冻结</span>;
    case InventoryStatus.OUTBOUND:
    case 'outbound':
      return <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">已出库</span>;
    case InventoryStatus.EMPTY:
    case 'empty':
      return <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">已用完</span>;
    case InventoryStatus.TRANSFERRED:
    case 'transferred':
      return <span className="px-2 py-1 bg-cyan-100 text-cyan-700 text-xs rounded-full">已调拨</span>;
    default:
      return null;
  }
};

export function InventoryTable({
  data,
  loading,
  pagination,
  onChange,
  onOutbound,
  onFreeze,
  onViewDetail,
  onEdit,
  selectedRows = [],
  onSelectionChange,
  showCheckboxes = false,
  onSelectAll,
}: InventoryTableProps) {
  // 作物名称 → 作物编码（11位）映射，从品种库反查（只读，不自动建）
  // 与种源/育苗/种植管理页 CropCodeSelector 共享同一品种库
  const cropCodeMap = useMemo(() => {
    initVarieties();
    const map = new Map<string, string>();
    for (const stock of data) {
      const name = stock.cropName;
      if (name && !map.has(name)) {
        const v = getVarietyByName(name);
        if (v?.cropCode) map.set(name, v.cropCode);
      }
    }
    return map;
  }, [data]);

  const paginatedData = data.slice(
    (pagination.current - 1) * pagination.pageSize,
    pagination.current * pagination.pageSize
  );

  const allSelected = paginatedData.length > 0 && paginatedData.every(s => selectedRows.includes(s.instanceId));
  const handleSelectRow = (instanceId: string) => {
    if (!onSelectionChange) return;
    if (selectedRows.includes(instanceId)) {
      onSelectionChange(selectedRows.filter(id => id !== instanceId));
    } else {
      onSelectionChange([...selectedRows, instanceId]);
    }
  };

  // 2026-06-30 Bug 12 二轮：去掉「种植模式」列，改为独立「形态」列
  // 形态列单独提出比嵌在「类型」列下方更醒目（用户反馈嵌在小灰字不显眼）
  const colSpan = showCheckboxes ? 16 : 15;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-auto max-h-[calc(100vh-380px)]">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
            <tr>
              {showCheckboxes && (
                <th className="px-4 py-3 text-left text-sm font-semibold w-12 whitespace-nowrap">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => onSelectAll?.()}
                    className="border-white rounded"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">实例ID</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物编码</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">作物信息</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">品质</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采收区域</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">形态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">可用</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">冻结</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">单位</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">仓库</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">来源</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">入库日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    {/* 2026-07-10 P1-4：抽到 LoadingSpinner 共享组件 */}
                    <LoadingSpinner withText />
                    <span>加载中...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-8 text-center text-gray-500">
                  暂无库存数据
                </td>
              </tr>
            ) : (
              paginatedData.map((stock) => {
                const available = (stock.currentQuantity ?? 0) - (stock.frozenQuantity ?? 0);
                // 2026-07-14：适配新状态枚举（frozen_full/frozen_partial/empty/outbound/transferred）
                // 可出库：库存中 + 低库存 + 部分冻结（剩余可用部分可出）+ 全部冻结（不允许）
                const status = stock.status;
                const canOutbound = status === InventoryStatus.IN_STOCK
                  || status === InventoryStatus.LOW_STOCK
                  || status === 'in_stock' || status === 'low_stock'
                  || status === 'frozen_partial'
                  || (status as any) === 'frozen' /* 兼容历史 */;
                const isSelected = selectedRows.includes(stock.instanceId);
                return (
                  <tr key={stock.instanceId} className={`hover:bg-emerald-50 transition-colors ${isSelected ? 'bg-emerald-50/50' : ''}`}>
                    {showCheckboxes && (
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleSelectRow(stock.instanceId)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm font-mono whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewDetail(stock)}
                        className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-mono"
                        title="点击查看详情"
                      >
                        {stock.instanceId}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-700 whitespace-nowrap">
                      {stock.cropCode || cropCodeMap.get(stock.cropName || '') || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStockTypeBadge(stock.stockType)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900 truncate max-w-xs">{stock.cropName || '-'}</div>
                      <div className="text-xs text-gray-500 truncate max-w-xs" title={stock.varietyName}>
                        {stock.varietyName || '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {stock.grade ? (() => {
                        // 字典码（special/excellent/good/qualified/unqualified）→ 统一用 QUALITY_GRADE_MAP
                        // 兼容 A/B/C/D 老数据
                        const QUALITY_GRADE_BG: Record<string, { bg: string; label: string }> = {
                          special:     { bg: 'bg-emerald-600', label: '特优' },
                          excellent:   { bg: 'bg-emerald-500', label: '优' },
                          good:        { bg: 'bg-blue-600',    label: '良' },
                          qualified:   { bg: 'bg-amber-600',   label: '合格' },
                          unqualified: { bg: 'bg-red-600',     label: '不合格' },
                          A: { bg: 'bg-emerald-500', label: 'A级' },
                          B: { bg: 'bg-blue-600',    label: 'B级' },
                          C: { bg: 'bg-amber-600',   label: 'C级' },
                          D: { bg: 'bg-red-600',     label: '次品' },
                        };
                        const info = QUALITY_GRADE_BG[stock.grade];
                        return (
                          <span className={`px-2.5 py-0.5 text-xs rounded-full font-bold text-white shadow-sm ${
                            info?.bg || 'bg-slate-600'
                          }`}>
                            {info?.label || stock.grade}
                          </span>
                        );
                      })() : <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap truncate max-w-xs" title={translateArea(stock.greenhouseName) || translateArea(stock.areaName)}>
                      {translateArea(stock.greenhouseName) || translateArea(stock.areaName) || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {/* 2026-06-30 Bug 21 修复：库存形态列统一读产品明细「采收形态」sourceForm
                          后端仅写 source_form 列（统一写入字段）。
                          历史数据 productForm 的也保留作为 fallback（兼容老数据）。
                          2026-07-09：英文值（seed/seedling/plant/flower/fruit/leaf/...）翻译成中文 */}
                      {(() => {
                        const raw = stock.sourceForm || stock.productForm || ''
                        // 2026-07-09：英文形态码 → 中文（兼容历史 seed_sources 表里英文字段值）
                        const form = translateForm(raw)
                        return form ? (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium" title={form}>
                            {form}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {stock.currentQuantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-600 font-medium whitespace-nowrap">
                      {available}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-600 whitespace-nowrap">
                      {stock.frozenQuantity}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {stock.unit || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap truncate max-w-xs" title={stock.warehouseName}>
                      {stock.warehouseName || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {/* 2026-07-13：补录标记徽章（仅 isSupplementary=1 显示） */}
                        {stock.isSupplementary === 1 && (
                          <span
                            className="px-2 py-1 bg-purple-600 text-white text-xs rounded-full font-medium"
                            title={`补录原因：${stock.supplementaryReason || '-'}\n来源行：${stock.sourceCode || stock.sourceRecordId || '-'}`}
                          >
                            ⚙️ 补录
                          </span>
                        )}
                        {stock.sourceType ? (() => {
                          const info = SOURCE_ORIGIN_MAP[stock.sourceType];
                          if (info) {
                            return (
                              <span className={`px-2 py-1 ${info.bg} ${info.text} text-xs rounded-full font-medium`}>
                                {info.label}
                              </span>
                            );
                          }
                          // 未知来源码：fallback 显示原文
                          return (
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {stock.sourceType}
                            </span>
                          );
                        })() : <span className="text-gray-400">-</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getStatusBadge(stock.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {stock.inboundDate ? new Date(stock.inboundDate).toLocaleDateString('zh-CN') : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {/* 2026-07-14：操作列按钮（仅图标，无文字） */}
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(stock)}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="编辑"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        {canOutbound && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOutbound(stock)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="出库"
                          >
                            <ArrowUpCircle className="w-4 h-4" />
                          </Button>
                        )}
                        {canOutbound && onFreeze && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onFreeze(stock)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="冻结"
                          >
                            <Snowflake className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <Pagination
          currentPage={pagination.current}
          totalPages={Math.ceil(data.length / pagination.pageSize) || 1}
          onPageChange={(page) => onChange({ ...pagination, current: page })}
          pageSize={pagination.pageSize}
          onPageSizeChange={(size) => onChange({ pageSize: size, current: 1 })}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}

// 辅助类型导出（供其他组件使用）
export type { InventoryStock, TraceResult, DownstreamTraceResult };
