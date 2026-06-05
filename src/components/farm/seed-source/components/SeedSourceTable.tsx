/**
 * 种源数据表格组件
 * 右上角按钮逻辑：编辑/删除/导出 → 需要选择记录后确认
 * 行内按钮逻辑：查看详情/打印/图片 → 直接执行
 */

import React from 'react';
import { Edit2, Trash2, Printer, Image, Download, Plus, CheckCircle, XCircle, ClipboardList, GitBranch, Info } from 'lucide-react';
import { Button } from '../../../ui/button';
import { SeedSource, StockStatus, SourceType, PropagationType, PropagationStatus } from '../../../../types/crop';
import { UNIT_MAP, STOCK_STATUS_MAP, SOURCE_TYPE_MAP, SOURCE_ORIGIN_MAP } from '../../../../constants/cropConstants';
import { computeStockStatus, getCompletionRate, getStatusColorClass } from '../../../../lib/stockStatus';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Pagination } from '@/components/ui/Pagination';
import { showAlert } from '@/lib/dialogService';

// 繁殖途径标签颜色
const PROPAGATION_TYPE_LABELS: Record<string, string> = {
  external: '外购入库',
  breeding: '育种计划',
  seed_saving: '种植留种',
  asexual: '无性繁殖',
};
const PROPAGATION_TYPE_COLORS: Record<string, string> = {
  external: 'bg-gray-100 text-gray-600',
  breeding: 'bg-orange-100 text-orange-700',
  seed_saving: 'bg-green-100 text-green-700',
  asexual: 'bg-purple-100 text-purple-700',
};
const PROPAGATION_STATUS_LABELS: Record<string, string> = {
  planned: '已计划',
  in_progress: '进行中',
  harvested: '已采收',
  quality_checked: '已质检',
  completed: '已入库',
  failed: '失败',
};
const PROPAGATION_STATUS_COLORS: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  harvested: 'bg-green-100 text-green-700',
  quality_checked: 'bg-purple-100 text-purple-700',
  completed: 'bg-emerald-100 text-emerald-700',
  failed: 'bg-red-100 text-red-700',
};

// 操作模式类型（用于批量操作）
type SeedSourceOperationMode = 'normal' | 'edit' | 'delete' | 'export' | 'print';

// 单位格式化函数（优先使用常量映射，兜底返回原值）
function formatUnit(unit: string): string {
  return UNIT_MAP[unit] || unit || '';
}

interface SeedSourceTableProps {
  data: SeedSource[];
  pagination: { current: number; pageSize: number };
  onChange: (pagination: { current: number; pageSize: number }) => void;
  onPageSizeChange?: (pageSize: number) => void;
  selectedRows: string[];
  onSelectionChange: (keys: string[]) => void;
  // 批量操作回调（选中后执行）
  onEdit: (record: SeedSource) => void;
  onDelete: (ids: string[]) => void;
  onAdd?: () => void;
  // 直接执行的操作回调
  onDetail: (record: SeedSource) => void;
  onPrint: (record: SeedSource) => void;
  onImageClick: (images: string[]) => void;
  // 结束相关回调
  onEnd: (record: SeedSource, endType: 'normal' | 'abnormal') => void;
  // 繁殖途径回调
  onPropagationRecord: (record: SeedSource) => void;
  onPropagationStage: (record: SeedSource) => void;
  // 模式状态
  operationMode: SeedSourceOperationMode;
  onOperationModeChange: (mode: SeedSourceOperationMode) => void;
  // 导出相关
  exportMode: boolean;
  onExportSelectAll: () => void;
  onExportCancel: () => void;
  onConfirmExport: () => void;
  // 打印相关
  printMode: boolean;
  onPrintModeChange: (mode: boolean) => void;
  onConfirmPrint: (records: SeedSource[]) => void;
  // 权限控制
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  canPrint?: boolean;
}

export function SeedSourceTable({
  data,
  pagination,
  onChange,
  onPageSizeChange,
  selectedRows,
  onSelectionChange,
  onEdit,
  onDelete,
  onAdd,
  onDetail,
  onPrint,
  onImageClick,
  onEnd,
  onPropagationRecord,
  onPropagationStage,
  operationMode,
  onOperationModeChange,
  exportMode,
  onExportSelectAll,
  onExportCancel,
  onConfirmExport,
  printMode,
  onPrintModeChange,
  onConfirmPrint,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExport = true,
  canPrint = true,
}: SeedSourceTableProps) {
  // 根据记录存储的字段构建品种完整路径（不依赖品种缓存，避免缓存冲突）
  const getVarietyPath = (record: SeedSource): string => {
    const parts: string[] = [];
    if (record.cropCategory) parts.push(record.cropCategory);
    if (record.typeName) parts.push(record.typeName);
    if (record.varietyName) parts.push(record.varietyName);
    if (record.cropVariety && record.cropVariety !== record.varietyName) parts.push(record.cropVariety);
    return parts.join(' > ');
  };

  // 获取标准作物编码（直接使用记录存储的 cropCode）
  const getStandardCropCode = (record: SeedSource): string => {
    return record.cropCode || '';
  };

  // 获取作物品种名称（最细分：子品种 > 品种 > 作物名）
  const getCropVarietyName = (record: SeedSource): string => {
    return record.cropVariety || record.cropName || '';
  };

  // 计算分页
  const totalPages = Math.ceil(data.length / pagination.pageSize);
  const startIndex = (pagination.current - 1) * pagination.pageSize;
  const endIndex = Math.min(startIndex + pagination.pageSize, data.length);
  const currentData = data.slice(startIndex, endIndex);

  // 判断是否需要显示复选框列
  const showCheckbox = operationMode !== 'normal' || exportMode || printMode;

  // 获取选中的第一条记录
  const getFirstSelectedRecord = () => {
    if (selectedRows.length === 0) return null;
    return data.find(r => r.id === selectedRows[0]) || null;
  };

  // 执行业务操作
  const executeOperation = (op: SeedSourceOperationMode) => {
    const record = getFirstSelectedRecord();
    if (!record) {
      showAlert('请先在表格中选择一条记录');
      return;
    }
    switch (op) {
      case 'edit':
        // P2 #14 修复: 编辑模式多选时只编辑第一条与提示矛盾，加校验
        if (selectedRows.length > 1) {
          showAlert('编辑模式只能选择一条记录，请先取消其他选中项');
          return;
        }
        onEdit(record);
        break;
      case 'delete':
        onDelete(selectedRows);
        break;
    }
    // 操作完成后重置模式
    onOperationModeChange('normal');
    onSelectionChange([]);
  };

  // 取消操作
  const cancelOperation = () => {
    onOperationModeChange('normal');
    onSelectionChange([]);
  };

  // 取消打印模式
  const cancelPrintMode = () => {
    onPrintModeChange(false);
    onSelectionChange([]);
  };

  // 确认打印
  const confirmPrint = () => {
    if (selectedRows.length === 0) {
      showAlert('请先选择要打印的记录');
      return;
    }
    const selectedRecords = data.filter(item => selectedRows.includes(item.id));
    onConfirmPrint(selectedRecords);
    onPrintModeChange(false);
    onSelectionChange([]);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 右上角操作按钮栏 - 根据模式显示不同内容 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">种源列表</h3>
        <div className="flex items-center gap-2">
          {/* 导出模式 */}
          {exportMode ? (
            <>
              <span className="text-sm text-gray-500 mr-2">已选择 {selectedRows.length} 项</span>
              <Button
                variant="default"
                size="sm"
                onClick={onConfirmExport}
                disabled={selectedRows.length === 0}
              >
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { onExportCancel(); onSelectionChange([]); }}
              >
                取消
              </Button>
            </>
          ) : operationMode === 'edit' ? (
            /* 编辑模式 */
            <>
              <span className="text-sm text-gray-500 mr-2">请在表格中选择一条记录</span>
              <Button
                variant="blue"
                size="sm"
                onClick={() => executeOperation('edit')}
                disabled={selectedRows.length === 0}
              >
                <Edit2 className="w-4 h-4" />
                确认编辑
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={cancelOperation}
              >
                取消
              </Button>
            </>
          ) : operationMode === 'delete' ? (
            /* 删除模式 */
            <>
              <span className="text-sm text-gray-500 mr-2">已选择 {selectedRows.length} 项</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => executeOperation('delete')}
                disabled={selectedRows.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={cancelOperation}
              >
                取消
              </Button>
            </>
          ) : printMode ? (
            /* 打印模式 */
            <>
              <span className="text-sm text-gray-500 mr-2">已选择 {selectedRows.length} 项</span>
              <Button
                variant="default"
                size="sm"
                onClick={confirmPrint}
                disabled={selectedRows.length === 0}
              >
                <Printer className="w-4 h-4" />
                确认打印
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={cancelPrintMode}
              >
                取消
              </Button>
            </>
          ) : (
            /* 正常模式 - 显示所有操作按钮 */
            <>
              {canCreate && onAdd && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onAdd}
                >
                  <Plus className="w-4 h-4" />
                  新增
                </Button>
              )}
              {canEdit && (
                <Button
                  variant="blue"
                  size="sm"
                  onClick={() => onOperationModeChange('edit')}
                >
                  <Edit2 className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onOperationModeChange('delete')}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {canExport && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => { onOperationModeChange('export'); }}
                >
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
              {canPrint && (
                <Button
                  size="sm"
                  className="bg-purple-600 text-white hover:bg-purple-700"
                  onClick={() => { onPrintModeChange(true); }}
                >
                  <Printer className="w-4 h-4" />
                  标签打印
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <TableRow className="hover:from-blue-500 hover:to-blue-600">
              {showCheckbox && (
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-12">
                  <Input
                    type="checkbox"
                    // P2 #13 修复: 用 currentData 判断"当前页全选"，而非 data（避免多页时只选当前页却显示已全选）
                    checked={currentData.length > 0 && currentData.every(r => selectedRows.includes(r.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange(currentData.map(item => item.id));
                      } else {
                        onSelectionChange([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">种源批号</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">关联生产计划</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">作物编码</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">作物品种</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">品种路径</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">种源类型</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">来源途径</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">供应商</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">采购/入库日期</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">入库数量</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">剩余数量</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">完成比例</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">操作</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">备注</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">创建人</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 17 : 16} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => (
                <TableRow key={record.id} className="hover:bg-emerald-50">
                  {showCheckbox && (
                    <TableCell className="px-4 py-3">
                      <Input
                        type="checkbox"
                        checked={selectedRows.includes(record.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onSelectionChange([...selectedRows, record.id]);
                          } else {
                            onSelectionChange(selectedRows.filter(k => k !== record.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onDetail(record)}
                      title="点击查看详情"
                    >
                      {record.seedCode}
                    </Button>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.productionPlanCode ? (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                        {record.productionPlanCode}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <span className="font-mono text-orange-600">{getStandardCropCode(record) || '-'}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{getCropVarietyName(record)}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {getVarietyPath(record)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {SOURCE_TYPE_MAP[record.sourceType] || record.sourceType}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    <div className="flex flex-col gap-1">
                      {record.propagationType && record.propagationType !== 'external' ? (
                        <>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PROPAGATION_TYPE_COLORS[record.propagationType] || 'bg-gray-100 text-gray-600'}`}>
                            {PROPAGATION_TYPE_LABELS[record.propagationType] || record.propagationType}
                          </span>
                          {record.propagationStatus && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${PROPAGATION_STATUS_COLORS[record.propagationStatus] || 'bg-gray-100 text-gray-600'}`}>
                              {PROPAGATION_STATUS_LABELS[record.propagationStatus] || record.propagationStatus}
                            </span>
                          )}
                        </>
                      ) : (
                        <span>{SOURCE_ORIGIN_MAP[record.sourceOrigin]?.label || record.sourceOrigin || '-'}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.supplierName || '-'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.purchaseDate}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-emerald-600 whitespace-nowrap">
                    {record.initialCount.toLocaleString()} {formatUnit(record.unit)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.availableCount.toLocaleString()} {formatUnit(record.unit)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    {record.initialCount > 0 ? (
                      <span className={`font-medium ${getStatusColorClass(computeStockStatus(record.availableCount, record.initialCount)).text}`}>
                        {getCompletionRate(record.availableCount, record.initialCount)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      {(() => {
                        // 2026-06-04: 实时计算 status，不再依赖 record.status
                        const liveStatus = computeStockStatus(record.availableCount, record.initialCount);
                        return (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${STOCK_STATUS_MAP[liveStatus]?.color || ''}`}>
                            {STOCK_STATUS_MAP[liveStatus]?.label || liveStatus}
                          </span>
                        );
                      })()}
                      {/* 2026-06-05: 强结后显示"已结束"角标（区分正常/异常） */}
                      {record.endTime && (
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.endType === 'abnormal'
                              ? 'text-amber-600 bg-amber-50'
                              : 'text-gray-500 bg-gray-100'
                          }`}
                          title={`${record.endType === 'abnormal' ? '异常' : '正常'}结束于 ${record.endTime}`}
                        >
                          {record.endType === 'abnormal' ? '已异常结束' : '已结束'}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      {/* 2026-06-05: 删除操作列的「查看详情」按钮（与点击种源批号重复） */}
                      {/* 繁殖途径操作按钮（非外购 + 未完成时显示） */}
                      {record.propagationType && record.propagationType !== PropagationType.EXTERNAL && record.propagationStatus !== PropagationStatus.COMPLETED && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onPropagationRecord(record)}
                            className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                            title="过程记录"
                          >
                            <ClipboardList className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onPropagationStage(record)}
                            className="text-gray-500 hover:text-purple-600 hover:bg-purple-50"
                            title="阶段推进"
                          >
                            <GitBranch className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {/* 2026-06-05: 外购种源无繁殖过程，显示置灰提示（hover 解释为何无『过程记录/阶段推进』） */}
                      {(!record.propagationType || record.propagationType === PropagationType.EXTERNAL) && (
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled
                          className="text-gray-300 cursor-not-allowed"
                          title="外购种源无繁殖过程。如需追踪繁殖阶段，请编辑种源把『来源途径』改为：育种 / 留种 / 无性繁殖"
                        >
                          <Info className="w-4 h-4" />
                        </Button>
                      )}
                      {/* 2026-06-05: 去掉 productionPlanCode 守卫 — 新建未关联生产计划的种源也要能结束（强结） */}
                      {!record.endTime && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEnd(record, 'normal')}
                            className="text-gray-500 hover:text-green-600 hover:bg-green-50"
                            title="正常结束"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEnd(record, 'abnormal')}
                            className="text-gray-500 hover:text-amber-600 hover:bg-amber-50"
                            title="异常结束"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.remarks || '-'}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.createBy}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination - 固定在表格外部底部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        <Pagination
          currentPage={pagination.current}
          totalPages={totalPages || 1}
          onPageChange={(page) => onChange({ ...pagination, current: page })}
          pageSize={pagination.pageSize}
          onPageSizeChange={(size) => {
            onPageSizeChange?.(size);
            onChange({ ...pagination, pageSize: size, current: 1 });
          }}
          pageSizeOptions={[10, 20, 50]}
          showPageSize
        />
      </div>
    </div>
  );
}
