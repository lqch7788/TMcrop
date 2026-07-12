/**
 * 施肥数据表格组件
 * 列：施肥编号(链接→详情)、肥料名称(加粗)、肥料类型(Badge)、作物品种、
 *     温室位置、稀释比例、施肥量(绿色加粗)、总成本(amber)、
 *     施肥时间(日期时间)、数据来源(Badge)、操作员、操作区(编辑/删除)
 * IoT记录行有绿色左边框，仅可查看不可编辑删除
 */
import React from 'react';
import { Edit2, Trash2, Plus, Download, BarChart3, ChevronDown, ChevronRight, ChevronUp, X } from 'lucide-react';
import { FertilizerData, useDictionaryStore } from '@/stores';
import { getDictItemName } from '@/stores/useDictionaryStore';
import IotDataIndicator, { IotDeviceStatus } from './IotDataIndicator';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';

// 2026-07-12：施肥区域池折叠行展示项（与 AddModal 池字段一致）
interface FertilizationPoolRow {
  type: 'planting' | 'seedling';
  id: string;
  code: string;
  cropName: string;
  area: string;
  quantity: number;
  unit: string;
  dilutionRatio: string;
  fertilizationMethod: string;
  fertilizerName: string;
  unitPrice: number;  // 2026-07-12：单行单价（多肥各自定价）
}

// 解析 JSON 池（容错）；返回空数组说明该记录无池数据（退化为单条总用量）
function parseFertilizationPool(jsonStr: string | null | undefined): FertilizationPoolRow[] {
  if (!jsonStr) return [];
  try {
    const arr = JSON.parse(jsonStr);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((it) => it && (it.type === 'planting' || it.type === 'seedling'))
      .map((it) => ({
        type: it.type,
        id: String(it.id || ''),
        code: String(it.code || ''),
        cropName: String(it.cropName || ''),
        area: String(it.area || ''),
        quantity: Number(it.quantity) || 0,
        unit: String(it.unit || '千克'),
        dilutionRatio: String(it.dilutionRatio || ''),
        fertilizationMethod: String(it.fertilizationMethod || ''),
        fertilizerName: String(it.fertilizerName || ''),
        unitPrice: Number(it.unitPrice) || 0,
      }));
  } catch {
    return [];
  }
}

interface FertilizerTableProps {
  data: FertilizerData[];
  isLoading: boolean;
  operationMode: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDetail: (record: FertilizerData) => void;
  onEdit: (record: FertilizerData) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onBatchDeleteMode: () => void;
  onConfirmBatchDelete: () => void;
  onCancelBatchDelete: () => void;
  onExportMode: () => void;
  iotDevices?: IotDeviceStatus[];
  iotLoading?: boolean;
  showStats?: boolean;
  onToggleStats?: () => void;
}

export function FertilizerTable({
  data,
  isLoading,
  operationMode,
  selectedIds,
  onSelectionChange,
  onDetail,
  onEdit,
  onDelete,
  onAdd,
  onBatchDeleteMode,
  onConfirmBatchDelete,
  onCancelBatchDelete,
  onExportMode,
  iotDevices = [],
  iotLoading = false,
  showStats = false,
  onToggleStats,
}: FertilizerTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  // 2026-07-12：数据字典（用于施肥方式中文 label 显示）
  const dictionaryStore = useDictionaryStore();
  const [pageSize, setPageSize] = React.useState(10);
  // 2026-07-12：折叠展开 — 多区域池明细行
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const showCheckbox = operationMode === 'delete';
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  // 切换页面时重置
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

  // 2026-07-12：展开/折叠
  const toggleExpand = (id: string) => {
    const next = new Set(expandedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedIds(next);
  };

  // 全选/取消
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      onSelectionChange(data.map((it) => it.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedIds, id]);
    } else {
      onSelectionChange(selectedIds.filter((k) => k !== id));
    }
  };

  // 数据来源 Badge 样式
  const getSourceBadge = (source: string) => {
    if (source === 'auto_iot') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
          IoT自动
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        手动
      </span>
    );
  };

  // 获取肥料类型显示名
  const getFertilizerTypeLabel = (code: string): string => {
    return getDictItemName('fertilizer_type', code) || code;
  };

  // 肥料类型 Badge 颜色
  const getTypeBadgeColor = (type: string): string => {
    const colors: Record<string, string> = {
      'organic': 'bg-emerald-100 text-emerald-700',
      'inorganic': 'bg-blue-100 text-blue-700',
      'biological': 'bg-purple-100 text-purple-700',
      'compound': 'bg-amber-100 text-amber-700',
      'trace': 'bg-cyan-100 text-cyan-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-400">
        <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto mb-2" />
        加载中...
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表头操作栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">施肥记录列表</h3>
          <IotDataIndicator devices={iotDevices} loading={iotLoading} />
          {onToggleStats && (
            <Button
              variant="default"
              size="sm"
              onClick={onToggleStats}
            >
              <BarChart3 className="w-4 h-4" />
              统计分析
              {showStats ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {operationMode === 'delete' ? (
            <>
              <span className="text-sm text-red-700">已选择 {selectedIds.length} 条</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={onConfirmBatchDelete}
                disabled={selectedIds.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onCancelBatchDelete}
              >
                取消
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onAdd}
              >
                <Plus className="w-4 h-4" />
                新增
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={onBatchDeleteMode}
              >
                <Trash2 className="w-4 h-4" />
                批量删除
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={onExportMode}
              >
                <Download className="w-4 h-4" />
                导出
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow className="hover:bg-transparent">
              {showCheckbox && (
                <TableHead className="py-3 font-semibold text-white whitespace-nowrap w-12">
                  <Input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  />
                </TableHead>
              )}
              {/* 2026-07-12：展开/折叠列（多区域池折叠看明细） */}
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap w-10"></TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">施肥编号</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">肥料名称</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">肥料类型</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">作物品种</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">温室位置</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">稀释比例</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">施肥量</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">总成本</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">施肥时间</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">数据来源</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">操作员</TableHead>
              <TableHead className="py-3 font-semibold text-white whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 14 : 13} className="px-4 py-12 text-center text-gray-400">
                  暂无施肥记录
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => {
                const isIot = record.dataSource === 'auto_iot';
                const pool = parseFertilizationPool((record as any).fertilizationPool);
                const expanded = expandedIds.has(record.id);
                const hasPool = pool.length > 0;
                return (
                  <React.Fragment key={record.id}>
                    {/* 主行 */}
                    <TableRow
                      className={`hover:bg-emerald-50 transition-colors ${
                        isIot ? 'border-l-4 border-l-green-400' : ''
                      }`}
                    >
                      {showCheckbox && (
                        <TableCell className="px-4 py-3">
                          <Input
                            type="checkbox"
                            checked={selectedIds.includes(record.id)}
                            onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                          />
                        </TableCell>
                      )}
                      {/* 2026-07-12：展开/折叠按钮（无池数据则禁用以避免空展开） */}
                      <TableCell className="px-2 py-3">
                        {hasPool ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleExpand(record.id)}
                            className="text-gray-500 hover:text-emerald-600"
                            title={expanded ? '收起多区域池明细' : `展开多区域池（${pool.length} 个区域/用量）`}
                          >
                            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </Button>
                        ) : (
                          <span className="w-4 h-4 inline-block" />
                        )}
                      </TableCell>
                      {/* 施肥编号 - 蓝色链接 */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => onDetail(record)}
                          className="font-mono p-0 h-auto"
                          title="查看详情"
                        >
                          {record.fertilizerCode}
                        </Button>
                      </TableCell>
                      {/* 肥料名称 - 加粗 */}
                      <TableCell className="px-4 py-3 text-sm font-bold text-gray-900 whitespace-nowrap">
                        {record.fertilizerName}
                      </TableCell>
                      {/* 肥料类型 - Badge */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getTypeBadgeColor(record.fertilizerType)}`}>
                          {getFertilizerTypeLabel(record.fertilizerType)}
                        </span>
                      </TableCell>
                      {/* 作物品种 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {record.cropName || '-'}
                      </TableCell>
                      {/* 温室位置 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {record.greenhouseName || '-'}
                      </TableCell>
                      {/* 稀释比例 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {record.dilutionRatio || '-'}
                      </TableCell>
                      {/* 施肥量 - 绿色加粗（汇总 = 各区域用量之和；兼容老数据无池时直接用 record.quantity） */}
                      <TableCell className="px-4 py-3 text-sm font-bold text-emerald-600 whitespace-nowrap">
                        {hasPool ? `${pool.reduce((s, r) => s + (Number(r.quantity) || 0), 0).toLocaleString()} ${record.unit || '千克'}` : `${(record.quantity ?? 0).toLocaleString()} ${record.unit || '千克'}`}
                      </TableCell>
                      {/* 总成本 - amber */}
                      <TableCell className="px-4 py-3 text-sm font-medium text-amber-600 whitespace-nowrap">
                        {record.totalCost?.toLocaleString() || '0'} 元
                      </TableCell>
                      {/* 施肥时间 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {record.fertilizeTime || '-'}
                      </TableCell>
                      {/* 数据来源 - Badge */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        {getSourceBadge(record.dataSource)}
                      </TableCell>
                      {/* 操作员 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {record.operatorName || '-'}
                      </TableCell>
                      {/* 操作区 - 2026-06-21: 删除"查看"按钮（与点施肥编号重复，统一通过编号查看详情） */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
                          {!isIot && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onEdit(record)}
                                className="text-gray-500 hover:text-amber-600"
                                title="编辑"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => onDelete(record.id)}
                                className="text-gray-500 hover:text-red-600"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* 折叠行：施肥方案分组展示（支持 1 主记录多肥多区域） */}
                    {expanded && hasPool && (() => {
                      // 按 fertilizerName 分组（无肥料名归入 "（未指定肥料）"）
                      const groups = new Map<string, FertilizationPoolRow[]>();
                      for (const row of pool) {
                        const key = row.fertilizerName || '__no_fertilizer__';
                        if (!groups.has(key)) groups.set(key, []);
                        groups.get(key)!.push(row);
                      }
                      const groupEntries = Array.from(groups.entries());
                      const totalGroups = groupEntries.length;
                      return (
                        <TableRow className="bg-gray-50 hover:bg-gray-50">
                          <TableCell colSpan={showCheckbox ? 14 : 13} className="px-6 py-4">
                            <div className="space-y-3">
                              <div className="px-3 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-bold rounded-lg">
                                🧪 施肥方案明细 · 共 {totalGroups} 种肥料 / {pool.length} 个区域用量
                              </div>
                              {groupEntries.map(([fertName, rows]) => (
                                <div key={fertName} className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
                                  <div className="px-3 py-2 bg-emerald-50 text-emerald-900 text-sm font-bold border-b border-emerald-200">
                                    🌱 肥料：{fertName === '__no_fertilizer__' ? '（未指定肥料）' : fertName}
                                    <span className="ml-2 text-xs font-normal text-emerald-600">
                                      · {rows.length} 个区域用量 · 用量合计 {rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0).toLocaleString()} {rows[0]?.unit || '千克'}
                                      · 单价 {rows[0]?.unitPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'} 元/{rows[0]?.unit || '单位'}
                                      · 该肥料小计 {rows.reduce((s, r) => s + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} 元
                                    </span>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                      <thead className="bg-gray-50 text-gray-700 text-xs uppercase">
                                        <tr>
                                          <th className="px-3 py-2 text-left">序号</th>
                                          <th className="px-3 py-2 text-left">来源</th>
                                          <th className="px-3 py-2 text-left">批号</th>
                                          <th className="px-3 py-2 text-left">区域</th>
                                          <th className="px-3 py-2 text-left">作物</th>
                                          <th className="px-3 py-2 text-left">用量</th>
                                          <th className="px-3 py-2 text-left">稀释倍数</th>
                                          <th className="px-3 py-2 text-left">施肥方式</th>
                                          <th className="px-3 py-2 text-right">单价 (元)</th>
                                          <th className="px-3 py-2 text-right">小计 (元)</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                        {rows.map((row, idx) => (
                                          <tr key={`${row.type}-${row.id}-${idx}-${fertName}`} className="hover:bg-emerald-50/40">
                                            <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                            <td className="px-3 py-2 text-gray-700">{row.type === 'planting' ? '🌱 种植' : '🌿 育苗'}</td>
                                            <td className="px-3 py-2 font-mono text-xs text-gray-600">{row.code || '-'}</td>
                                            <td className="px-3 py-2 text-gray-800 font-medium">{row.area}</td>
                                            <td className="px-3 py-2 text-gray-600">{row.cropName || '-'}</td>
                                            <td className="px-3 py-2 font-bold text-emerald-600">{row.quantity} {row.unit}</td>
                                            <td className="px-3 py-2 text-gray-600">{row.dilutionRatio || '-'}</td>
                                            <td className="px-3 py-2 text-gray-600">
                                              {row.fertilizationMethod
                                                ? (getDictItemName('fertilization_method', row.fertilizationMethod) || row.fertilizationMethod)
                                                : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-600">{(row.unitPrice || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-3 py-2 text-right font-bold text-amber-600">
                                              {((Number(row.quantity) || 0) * (Number(row.unitPrice) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })()}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}
