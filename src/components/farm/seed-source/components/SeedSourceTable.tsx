/**
 * 种源数据表格组件
 * 右上角按钮逻辑：编辑/删除/导出 → 需要选择记录后确认
 * 行内按钮逻辑：查看详情/打印/图片 → 直接执行
 */

import React from 'react';
import { Edit2, Trash2, Printer, Image, Download, Plus, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { SeedSource, StockStatus, SourceType } from '../../../../types/crop';

// 操作模式类型（用于批量操作）
type SeedSourceOperationMode = 'normal' | 'edit' | 'delete' | 'export' | 'print';

// 单位转换函数（英文→中文）
const unitMap: Record<string, string> = {
  'bag': '袋',
  'plant': '株',
  'grain': '粒',
  'kg': '千克',
  'g': '克',
  'ton': '吨',
  'mu': '亩',
  '个': '个',
  '袋': '袋',
  '株': '株',
  '粒': '粒',
  '千克': '千克',
  '克': '克',
  '吨': '吨',
  '亩': '亩',
};

function formatUnit(unit: string): string {
  return unitMap[unit] || unit || '';
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

  // 状态映射
  const statusMap = {
    [StockStatus.SUFFICIENT]: { label: '充足', color: 'text-green-600 bg-green-50' },
    [StockStatus.LOW]: { label: '不足', color: 'text-amber-600 bg-amber-50' },
    [StockStatus.DEPLETED]: { label: '耗尽', color: 'text-red-600 bg-red-50' }
  };

  // 类型映射
  const sourceTypeMap = {
    [SourceType.SEED]: '种子',
    [SourceType.SEEDLING]: '种苗/实生苗',
    [SourceType.CUTTING]: '扦插苗',
    [SourceType.GRAFTING]: '嫁接苗',
    [SourceType.TISSUE_CULTURE]: '组培苗',
    [SourceType.SPLIT]: '分株苗',
    [SourceType.BULB]: '种球/球根',
    [SourceType.OTHER]: '其他'
  };

  // 来源途径映射 - 与数据库字典保持一致
  const sourceOriginMap: Record<string, string> = {
    'internal_seed': '内部种源',
    'self_produced': '自产自繁',
    'commissioned': '委托培育',
    'external_purchase': '外部采购',
    'gift': '政府/机构赠送',
    'tissue_culture': '组培苗',
    'grafting': '嫁接苗',
    'seedling_split': '分株繁殖',
    'cutting': '扦插繁殖',
    'direct_seedling': '直播育苗',
    'direct_planting': '直接定植',
    'external_harvest': '外部采收',
    'other': '其他'
  };

  // 获取选中的第一条记录
  const getFirstSelectedRecord = () => {
    if (selectedRows.length === 0) return null;
    return data.find(r => r.id === selectedRows[0]) || null;
  };

  // 执行业务操作
  const executeOperation = (op: SeedSourceOperationMode) => {
    const record = getFirstSelectedRecord();
    if (!record) {
      alert('请先在表格中选择一条记录');
      return;
    }
    switch (op) {
      case 'edit':
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
      alert('请先选择要打印的记录');
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
              <button
                onClick={onConfirmExport}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button
                onClick={() => { onExportCancel(); onSelectionChange([]); }}
                className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </>
          ) : operationMode === 'edit' ? (
            /* 编辑模式 */
            <>
              <span className="text-sm text-gray-500 mr-2">请在表格中选择一条记录</span>
              <button
                onClick={() => executeOperation('edit')}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 flex items-center gap-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit2 className="w-4 h-4" />
                确认编辑
              </button>
              <button
                onClick={cancelOperation}
                className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </>
          ) : operationMode === 'delete' ? (
            /* 删除模式 */
            <>
              <span className="text-sm text-gray-500 mr-2">已选择 {selectedRows.length} 项</span>
              <button
                onClick={() => executeOperation('delete')}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 flex items-center gap-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </button>
              <button
                onClick={cancelOperation}
                className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </>
          ) : printMode ? (
            /* 打印模式 */
            <>
              <span className="text-sm text-gray-500 mr-2">已选择 {selectedRows.length} 项</span>
              <button
                onClick={confirmPrint}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 flex items-center gap-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="w-4 h-4" />
                确认打印
              </button>
              <button
                onClick={cancelPrintMode}
                className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </>
          ) : (
            /* 正常模式 - 显示所有操作按钮 */
            <>
              {canCreate && onAdd && (
                <button
                  onClick={onAdd}
                  className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              )}
              {canEdit && (
                <button
                  onClick={() => onOperationModeChange('edit')}
                  className="h-8 px-3 flex items-center gap-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  编辑
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => onOperationModeChange('delete')}
                  className="h-8 px-3 flex items-center gap-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
              {canExport && (
                <button
                  onClick={() => { onOperationModeChange('export'); }}
                  className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
              {canPrint && (
                <button
                  onClick={() => { onPrintModeChange(true); }}
                  className="h-8 px-3 flex items-center gap-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  标签打印
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showCheckbox && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange(data.map(item => item.id));
                      } else {
                        onSelectionChange([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">种源批号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">关联生产计划</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">作物编码</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">作物品种</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">品种路径</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">种源类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">来源途径</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">供应商</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">采购/入库日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">入库数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">剩余数量</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">完成比例</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">操作</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">备注</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">创建人</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={showCheckbox ? 17 : 16} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              currentData.map((record) => (
                <tr key={record.id} className="hover:bg-emerald-50">
                  {showCheckbox && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRows.includes(record.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onSelectionChange([...selectedRows, record.id]);
                          } else {
                            onSelectionChange(selectedRows.filter(k => k !== record.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                    <button
                      onClick={() => onDetail(record)}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                      title="点击查看详情"
                    >
                      {record.seedCode}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.productionPlanCode ? (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                        {record.productionPlanCode}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-mono text-orange-600">{getStandardCropCode(record) || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{getCropVarietyName(record)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {getVarietyPath(record)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {sourceTypeMap[record.sourceType] || record.sourceType}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {sourceOriginMap[record.sourceOrigin] || record.sourceOrigin || '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.supplierName || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.purchaseDate}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600 whitespace-nowrap">
                    {record.initialCount.toLocaleString()} {formatUnit(record.unit)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.availableCount.toLocaleString()} {formatUnit(record.unit)}
                  </td>
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {record.initialCount > 0 ? (
                      <span className={`font-medium ${
                        record.availableCount / record.initialCount >= 0.8
                          ? 'text-green-600'
                          : record.availableCount / record.initialCount >= 0.5
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {Math.round(record.availableCount / record.initialCount * 100)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusMap[record.status]?.color || ''}`}>
                      {statusMap[record.status]?.label || record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onDetail(record)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="查看详情"
                      >
                        <Image className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEnd(record, 'normal')}
                        className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                        title="正常结束"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEnd(record, 'abnormal')}
                        className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                        title="异常结束"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{record.remarks || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.createBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination - 固定在表格外部底部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pagination.pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              onPageSizeChange?.(newSize);
              onChange({ ...pagination, pageSize: newSize, current: 1 });
            }}
            className="px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {data.length} 条</span>
          <button
            onClick={() => onChange({ ...pagination, current: Math.max(1, pagination.current - 1) })}
            disabled={pagination.current === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm">{pagination.current} / {totalPages || 1}</span>
          <button
            onClick={() => onChange({ ...pagination, current: Math.min(totalPages || 1, pagination.current + 1) })}
            disabled={pagination.current >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
