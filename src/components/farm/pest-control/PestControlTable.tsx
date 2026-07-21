/**
 * 病虫害防治记录表格组件
 * V12.0 新增 - 折叠形式展示多药剂/多制剂/多肥料详情
 * 列：勾选框、展开、编号、防治日期、作物、防治区域、操作人、施用方法、目标病虫害、备注、状态、操作（编辑/删除）
 * 2026-06-21: 删除操作列"查看"按钮（与点击编号重复，统一通过编号查看详情）
 * 2026-07-21：放宽同一次多作物/多类型限制后，列表展示参照水肥管理列表样式：
 *   - 「作物」列：多作物 Badge 多色板（CROP_COLORS，继承自 FertilizerTable）
 *   - 「防治区域」列：作物·区域；... 摘要格式 + title 完整列表
 *   - 后端字段 crop_names（JSON 字符串）优先，fallback 到 cropName 单字段
 */
import React, { useMemo } from 'react';
import { ChevronDown, ChevronRight, Download, Edit2, Plus, Trash2, X } from 'lucide-react';
import { PestControlData, useDictionaryStore } from '@/stores';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
// 2026-07-18 P3-L7：共用 JSON 列表解析
import { parseJsonList } from '@/lib/jsonPool';

/** 2026-07-21：作物 Badge 色板（与 FertilizerTable CROP_COLORS 一致，颜色循环分配多作物） */
const CROP_COLORS = [
  'bg-amber-100 text-amber-700',
  'bg-sky-100 text-sky-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-cyan-100 text-cyan-700',
  'bg-pink-100 text-pink-700',
];

interface PestControlTableProps {
  data: PestControlData[];
  isLoading: boolean;
  operationMode: string;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onDetail: (record: PestControlData) => void;
  onEdit: (record: PestControlData) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onBatchDeleteMode: () => void;
  onBatchDelete: () => void;
  onBatchDeleteConfirm: () => void;
  onExportMode: () => void;
  onExportConfirm: () => void;
}

// 2026-07-10 P1-6：抽到 constants/cropEnums.ts 共享（替代 3 处 inline 定义）
// 保留函数名 getControlTypeLabel 以兼容现有调用
import { CONTROL_TYPE_OPTIONS, lookupEnumLabel } from '@/constants/cropEnums';
const getControlTypeLabel = (type: string): string =>
  lookupEnumLabel(CONTROL_TYPE_OPTIONS, type, type);
// 2026-07-18 P3-L6 清理：getControlTypeBadgeColor 已删除（controlType 已取消，Badge 颜色映射无 caller）

// 2026-07-18 P3-L7：从共享工具导入（避免 4 处重复实现）
// (import 已移至顶部)

// 解析目标病虫害（可能是JSON数组、单个字符串、或空格分隔的多值）
// 2026-07-18 P1-H3 修复：兼容旧 schema 空格 join 的多值
function parseTargetPests(targetPest: string | null | undefined): string[] {
  if (!targetPest) return [];
  try {
    const parsed = JSON.parse(targetPest);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    // 旧数据：用空格 join 的多值，按空格 split
    const split = targetPest.split(/\s+/).filter(Boolean);
    return split.length > 1 ? split : [targetPest];
  }
}

// 解析防治区域（可能是JSON数组或单个字符串）
function parseGreenhouses(greenhouseName: string | null | undefined): string[] {
  if (!greenhouseName) return [];
  try {
    const parsed = JSON.parse(greenhouseName);
    if (Array.isArray(parsed)) return parsed;
    return [parsed];
  } catch {
    return [greenhouseName];
  }
}

/**
 * 2026-07-21：解析 cropNames JSON 数组，fallback 到 cropName 单字段
 * - 与 fertilizer_records 的 cropNames 语义对齐：放宽后允许同次防治跨多作物
 * - 旧数据无 cropNames 字段时，仅返回 [cropName]（确保列表至少显示一种作物）
 */
function parseCropNames(cropNames: string | null | undefined, cropName: string | null | undefined): string[] {
  if (cropNames && cropNames.trim()) {
    try {
      const parsed = JSON.parse(cropNames);
      if (Array.isArray(parsed)) {
        const arr = parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
        if (arr.length > 0) return arr;
      }
    } catch {
      // 单字符串兜底
      if (cropNames.trim()) return [cropNames.trim()];
    }
  }
  return cropName ? [cropName] : [];
}

export function PestControlTable({
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
  onBatchDelete,
  onBatchDeleteConfirm,
  onExportMode,
  onExportConfirm,
}: PestControlTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [expandedIds, setExpandedIds] = React.useState<Set<string>>(new Set());
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  // 获取字典项标签
  const getDictLabel = (category: string, code: string) => {
    if (!code || !dictionaries.length) return code;
    const items = dictionaries.filter(d => (d as any).categoryCode === category);
    const item = items.find(d => (d as any).dictCode === code);
    return item ? (item as any).dictLabel : code;
  };

  // 2026-07-18 P3-L12：用 Set 替代 .includes 避免 O(N²)
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const totalPages = Math.ceil(data.length / pageSize) || 1;
  const showCheckbox = operationMode === 'delete' || operationMode === 'export';
  const startIdx = (currentPage - 1) * pageSize;
  const currentData = data.slice(startIdx, startIdx + pageSize);

  // 切换页面时重置
  React.useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(1);
  }, [data.length, totalPages, currentPage]);

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

  // 展开/折叠
  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const isExpanded = (id: string) => expandedIds.has(id);

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
          <h3 className="text-lg font-semibold text-gray-900">防治记录列表</h3>
          <span className="text-sm text-gray-500">（点击展开查看多药剂/肥料详情）</span>
        </div>
        {/* 批量删除模式：进入后立即显示确认栏（确认删除按键在 0 选中时置灰） */}
        {operationMode === 'delete' ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-red-600 font-medium">
              {selectedIds.length > 0 ? `已选择 ${selectedIds.length} 条记录` : '请勾选要删除的记录'}
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={onBatchDeleteConfirm}
              disabled={selectedIds.length === 0}
            >
              <Trash2 className="w-4 h-4" />确认删除
            </Button>
            <Button variant="secondary" size="sm" onClick={onBatchDeleteMode}><X className="w-4 h-4" /> 取消</Button>
          </div>
        ) : operationMode === 'export' ? (
          /* 导出模式：进入后立即显示确认栏（确认导出按键在 0 选中时置灰） */
          <div className="flex items-center gap-3">
            <span className="text-sm text-blue-600 font-medium">
              {selectedIds.length > 0 ? `已选择 ${selectedIds.length} 条记录（不勾选默认导出全部）` : '请勾选要导出的记录（不勾选默认导出全部）'}
            </span>
            <Button
              variant="default"
              size="sm"
              onClick={onExportConfirm}
            >
              <Download className="w-4 h-4" />确认导出
            </Button>
            <Button variant="secondary" size="sm" onClick={onExportMode}><X className="w-4 h-4" /> 取消</Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600">
            <TableRow className="hover:bg-blue-400/30">
              {showCheckbox && (
                <TableHead className="py-3 font-bold text-white whitespace-nowrap w-12">
                  <Input
                    type="checkbox"
                    checked={data.length > 0 && selectedIds.length === data.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  />
                </TableHead>
              )}
              <TableHead className="py-3 font-bold text-white whitespace-nowrap w-10"></TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">编号</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">防治日期</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">作物</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">防治区域</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">操作人</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">施用方法</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">目标病虫害</TableHead>
              {/* 2026-07-17：主行新增「药剂」「肥料」2 列，所有药剂/肥料池 chips 直接显示（无需展开） */}
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">药剂</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">肥料</TableHead>
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">备注</TableHead>
              {/* 2026-07-17：移除「状态」列（DB 中 10 条记录全部 status=completed，业务上防治=已完成事件，无中间态）*/}
              <TableHead className="py-3 font-bold text-white whitespace-nowrap">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 13 : 12} className="px-4 py-12 text-center text-gray-400">
                  暂无防治记录
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => {
                const expanded = isExpanded(record.id);
                const pesticideList = parseJsonList((record as any).pesticideList);
                const bioAgentList = parseJsonList((record as any).bioAgentList);
                const equipmentList = parseJsonList((record as any).equipmentList);
                // 2026-07-12：肥料池必须读 leafFertilizerList（旧代码误读 leafFertilizerName 单字段，永远为空）
                const leafFertilizerList = parseJsonList(record.leafFertilizerList);

                return (
                  <React.Fragment key={record.id}>
                    {/* 主行 */}
                    <TableRow
                      className="bg-white hover:bg-emerald-50 transition-colors"
                    >
                      {showCheckbox && (
                        <TableCell className="px-4 py-3">
                          <Input
                            type="checkbox"
                            checked={selectedSet.has(record.id)}
                            onChange={(e) => handleSelectRow(record.id, e.target.checked)}
                            className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                          />
                        </TableCell>
                      )}
                      {/* 展开/折叠按钮 */}
                      <TableCell className="px-2 py-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleExpand(record.id)}
                          className="text-gray-500 hover:text-emerald-600"
                        >
                          {expanded ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </Button>
                      </TableCell>
                      {/* 编号 */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => onDetail(record)}
                          className="font-mono p-0 h-auto text-emerald-600 hover:text-emerald-800"
                          title="查看详情"
                        >
                          {record.recordCode}
                        </Button>
                      </TableCell>
                      {/* 防治日期 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {record.sprayTime ? record.sprayTime.slice(0, 16) : '-'}
                      </TableCell>
                      {/* 作物 — 2026-07-21：多作物 Badge 展示（参照水肥管理样式） */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        {(() => {
                          const cropNames = parseCropNames(record.cropNames, record.cropName);
                          if (cropNames.length === 0) return <span className="text-gray-400">-</span>;
                          return (
                            <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
                              {cropNames.slice(0, 3).map((cn, i) => (
                                <span
                                  key={cn}
                                  className={`inline-flex px-1.5 py-0.5 rounded text-xs font-medium ${CROP_COLORS[i % CROP_COLORS.length]}`}
                                  title={cn}
                                >
                                  {cn}
                                </span>
                              ))}
                              {cropNames.length > 3 && (
                                <span className="text-xs text-gray-400">+{cropNames.length - 3}</span>
                              )}
                            </div>
                          );
                        })()}
                      </TableCell>
                      {/* 防治区域 — 2026-07-21：摘要文本 + tooltip 显示所有作物+区域组合（参照水肥管理样式） */}
                      <TableCell className="px-4 py-3 text-xs text-gray-600 max-w-[260px]">
                        {(() => {
                          const areas = parseGreenhouses(record.greenhouseName);
                          const cropNames = parseCropNames(record.cropNames, record.cropName);
                          if (areas.length === 0) return <span className="text-gray-400">-</span>;
                          // 摘要："作物·区域；作物·区域；..."
                          const summary = cropNames.length > 0 && areas.length === cropNames.length
                            ? cropNames.map((cn, i) => `${cn}·${areas[i]}`).join('；')
                            : areas.join('，');
                          const tooltip = cropNames.length > 0 && areas.length === cropNames.length
                            ? cropNames.map((cn, i) => `${cn}·${areas[i]}`).join('\n')
                            : areas.join('\n');
                          return (
                            <span className="truncate block" title={tooltip}>
                              {summary.length > 25 ? summary.slice(0, 25) + '…' : summary}
                            </span>
                          );
                        })()}
                      </TableCell>
                      {/* 操作人 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {record.operatorName || '-'}
                      </TableCell>
                      {/* 施用方法 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {getDictLabel('application_method', record.applicationMethod || '') || '-'}
                      </TableCell>
                      {/* 目标病虫害 */}
                      <TableCell className="px-4 py-3">
                        {parseTargetPests(record.targetPest).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {parseTargetPests(record.targetPest).map((pest, idx) => (
                              <span
                                key={idx}
                                className="inline-flex px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700"
                              >
                                {pest}
                              </span>
                            ))}
                          </div>
                        ) : '-'}
                      </TableCell>
                      {/* 药剂 chips — 2026-07-17：从 pesticideList 派生所有药剂名+类型，类型中文靠 getDictLabel */}
                      <TableCell className="px-4 py-3">
                        {(() => {
                          // 优先 pesticideList 池；池为空时用 pesticideName 单条兜底
                          // 2026-07-18 P0-C6 修复：统一读 pesticideTypes 字段名
                          const items = pesticideList.length > 0
                            ? pesticideList
                            : (record.pesticideName ? [{
                                name: record.pesticideName,
                                pesticideTypes: record.pesticideTypes || [],
                              }] : []);
                          if (items.length === 0) return <span className="text-gray-400">-</span>;
                          return (
                            <div className="flex flex-wrap gap-1 max-w-[260px]">
                              {items.map((it: any, idx: number) => {
                                const typeLabel = (it.pesticideTypes && it.pesticideTypes.length > 0 ? it.pesticideTypes : [])
                                  .map((t: string) => getDictLabel('pesticide_type', t) || t)
                                  .join('·');
                                return (
                                  <span
                                    key={idx}
                                    title={typeLabel || ''}
                                    className="inline-flex px-2 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  >
                                    {it.name || '-'}
                                  </span>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </TableCell>
                      {/* 肥料 chips — 2026-07-17：从 leafFertilizerList 派生 */}
                      {/* 2026-07-17：兼容 fertilizerName（新格式，从肥料库选）+ name（旧格式，自由输入）*/}
                      <TableCell className="px-4 py-3">
                        {leafFertilizerList.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[260px]">
                            {leafFertilizerList.map((it: any, idx: number) => (
                              <span
                                key={idx}
                                title={`${it.dosage || ''}${it.unit || ''} · ${it.dilutionRatio || it.ratio || ''}`}
                                className="inline-flex px-2 py-0.5 rounded text-xs bg-purple-50 text-purple-700 border border-purple-200"
                              >
                                {it.fertilizerName || it.name || '-'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                      {/* 备注 */}
                      <TableCell className="px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate" title={record.description || ''}>
                        {record.description || '-'}
                      </TableCell>
                      {/* 2026-07-17：移除「状态」单元格（与表头对应）*/}
                      {/* 操作 - 2026-06-21: 删除"查看"按钮（与点击编号重复） */}
                      <TableCell className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1">
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
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* 折叠的详情行 */}
                    {expanded && (
                      <TableRow className="bg-gray-50 hover:bg-gray-50">
                        <TableCell colSpan={showCheckbox ? 14 : 13} className="px-6 py-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* 左侧：防治详情表格 — 2026-07-12：改用 pesticideTypes 判定药剂池类型，移除废弃 controlType */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                                    <tr>
                                      {/* 药剂池：依 pesticideList 长度判定有无，老字段（pesticideName 单条）也兜底 */}
                                      {(pesticideList.length > 0 || (record as any).pesticideName || (record.pesticideTypes || []).length > 0) && (
                                        <>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">药剂名称</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">药剂类型</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">含量/规格</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用药量</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">单位</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">稀释倍数</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">施用方法</th>
                                        </>
                                      )}
                                      {/* 制剂池 */}
                                      {bioAgentList.length > 0 && (
                                        <>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">制剂名称</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">制剂类型</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用量</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">单位</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">稀释倍数</th>
                                        </>
                                      )}
                                      {/* 设备池 */}
                                      {equipmentList.length > 0 && (
                                        <>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">设备/方式</th>
                                          <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用量/次数</th>
                                        </>
                                      )}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {/* 药剂池内容（JSON 列表优先；老字段兜底单条） */}
                                    {(pesticideList.length > 0 ? pesticideList : (record as any).pesticideName ? [{
                                      name: (record as any).pesticideName,
                                      pesticideTypes: record.pesticideTypes || [(record as any).pesticideType],
                                      specContent: (record as any).specContent,
                                      dosage: (record as any).dosage,
                                      unit: (record as any).dosageUnit,
                                      ratio: (record as any).dilutionRatio,
                                      applicationMethod: (record as any).applicationMethod,
                                    }] : []).map((item: any, idx: number) => {
                                      // 2026-07-21 修复：统一读 pesticideTypes（与 AddModal 序列化字段名一致）
                                      const pestTypes = item.pesticideTypes && item.pesticideTypes.length > 0 ? item.pesticideTypes : (item.type ? [item.type] : []);
                                      return (
                                        <tr key={idx} className="hover:bg-emerald-50">
                                          <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                          <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">
                                            {pestTypes.length > 0 ? pestTypes.map((t: string, ti: number) => (
                                              <span key={ti}>
                                                {ti > 0 && '、'}
                                                {getDictLabel('pesticide_type', t) || t}
                                              </span>
                                            )) : '-'}
                                          </td>
                                          <td className="px-3 py-2 text-gray-600">{item.specContent || '-'}</td>
                                          <td className="px-3 py-2 text-orange-600 font-medium">{item.dosage || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.unit || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{item.ratio || '-'}</td>
                                          <td className="px-3 py-2 text-gray-600">{getDictLabel('application_method', item.applicationMethod || '') || '-'}</td>
                                        </tr>
                                      );
                                    })}
                                    {/* 制剂池内容 */}
                                    {bioAgentList.length > 0 && bioAgentList.map((item: any, idx: number) => (
                                      <tr key={`bio-${idx}`} className="hover:bg-emerald-50">
                                        <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                        <td className="px-3 py-2 text-gray-600">{getDictLabel('bio_agent_type', item.type) || '-'}</td>
                                        <td className="px-3 py-2 text-orange-600 font-medium">{item.dosage || '-'}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.unit || '-'}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.ratio || '-'}</td>
                                      </tr>
                                    ))}
                                    {/* 设备池内容 */}
                                    {equipmentList.length > 0 && equipmentList.map((item: any, idx: number) => (
                                      <tr key={`eq-${idx}`} className="hover:bg-emerald-50">
                                        <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{item.name || '-'}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.count || '-'}</td>
                                      </tr>
                                    ))}
                                    {/* 完全无内容兜底 */}
                                    {pesticideList.length === 0 && bioAgentList.length === 0 && equipmentList.length === 0 && !(record as any).pesticideName && (record.pesticideTypes || []).length === 0 && (
                                      <tr>
                                        <td className="px-3 py-4 text-center text-gray-400">暂无防治数据</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* 右侧：肥料联用 — 读 leafFertilizerList（修复点） */}
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white">
                                    <tr>
                                      <th className="px-3 py-2 text-left font-bold whitespace-nowrap">序号</th>
                                      <th className="px-3 py-2 text-left font-bold whitespace-nowrap">肥料名称</th>
                                      <th className="px-3 py-2 text-left font-bold whitespace-nowrap">用量</th>
                                      <th className="px-3 py-2 text-left font-bold whitespace-nowrap">单位</th>
                                      <th className="px-3 py-2 text-left font-bold whitespace-nowrap">稀释倍数</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {/* 2026-07-17：兼容 fertilizerName（新格式）+ name（旧格式） */}
                                    {leafFertilizerList.length > 0 ? leafFertilizerList.map((item: any, idx: number) => (
                                      <tr key={idx} className="hover:bg-purple-50">
                                        <td className="px-3 py-2 text-center text-gray-500">{idx + 1}</td>
                                        <td className="px-3 py-2 font-medium text-gray-900">{item.fertilizerName || item.name || '-'}</td>
                                        <td className="px-3 py-2 text-orange-600 font-medium">{item.dosage || '-'}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.unit || '-'}</td>
                                        <td className="px-3 py-2 text-gray-600">{item.dilutionRatio || item.ratio || '-'}</td>
                                      </tr>
                                    )) : (
                                      <tr>
                                        <td colSpan={5} className="px-3 py-4 text-center text-gray-400">
                                          {record.useLeafFertilizer === 'yes' ? '暂无肥料明细' : '未启用肥料联用'}
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
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
