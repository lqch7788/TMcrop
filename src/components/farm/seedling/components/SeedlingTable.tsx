/**
 * 育苗数据表格组件
 * 右上角按钮逻辑：编辑/删除/导出 → 需要选择记录后确认
 * 行内按钮逻辑：查看详情/每日记录/定植操作/打印/图片 → 直接执行
 */

import React from 'react';
import { Edit2, Trash2, Printer, Eye, Image, Download, Plus, Calendar, Truck } from 'lucide-react';
import { Seedling, SeedlingStatus } from '../../../../types/crop';

// 操作模式类型（用于批量操作）
type SeedlingOperationMode = 'normal' | 'edit' | 'delete' | 'export' | 'print';

interface SeedlingTableProps {
  data: Seedling[];
  pagination: { current: number; pageSize: number };
  onChange: (pagination: { current: number; pageSize: number }) => void;
  selectedRows: string[];
  onSelectionChange: (keys: string[]) => void;
  // 批量操作回调（选中后执行）
  onEdit: (record: Seedling) => void;
  onDelete: (ids: string[]) => void;
  onAdd?: () => void;
  // 直接执行的操作回调
  onDetail: (record: Seedling) => void;
  onDailyRecord: (record: Seedling) => void;
  onTransplant: (record: Seedling) => void;
  onPrint: (record: Seedling) => void;
  onImageClick: (images: string[]) => void;
  // 模式状态
  operationMode: SeedlingOperationMode;
  onOperationModeChange: (mode: SeedlingOperationMode) => void;
  // 导出相关
  exportMode: boolean;
  onExportSelectAll: () => void;
  onExportCancel: () => void;
  onConfirmExport: () => void;
  // 打印相关
  printMode: boolean;
  onPrintModeChange: (mode: boolean) => void;
  onConfirmPrint: (records: Seedling[]) => void;
}

export function SeedlingTable({
  data,
  pagination,
  onChange,
  selectedRows,
  onSelectionChange,
  onEdit,
  onDelete,
  onAdd,
  onDetail,
  onDailyRecord,
  onTransplant,
  onPrint,
  onImageClick,
  operationMode,
  onOperationModeChange,
  exportMode,
  onExportSelectAll,
  onExportCancel,
  onConfirmExport,
  printMode,
  onPrintModeChange,
  onConfirmPrint
}: SeedlingTableProps) {
  // 计算分页
  const totalPages = Math.ceil(data.length / pagination.pageSize);
  const startIndex = (pagination.current - 1) * pagination.pageSize;
  const endIndex = Math.min(startIndex + pagination.pageSize, data.length);
  const currentData = data.slice(startIndex, endIndex);

  // 判断是否需要显示复选框列
  const showCheckbox = operationMode !== 'normal' || exportMode || printMode;

  // 状态映射
  const statusMap = {
    [SeedlingStatus.IN_PROGRESS]: { label: '进行中', color: 'text-amber-600 bg-amber-50' },
    [SeedlingStatus.TRANSPLANT_READY]: { label: '待定植', color: 'text-blue-600 bg-blue-50' },
    [SeedlingStatus.COMPLETED]: { label: '已完成', color: 'text-green-600 bg-green-50' },
    [SeedlingStatus.ABNORMAL]: { label: '异常', color: 'text-red-600 bg-red-50' }
  };

  // 获取选中的第一条记录
  const getFirstSelectedRecord = () => {
    if (selectedRows.length === 0) return null;
    return data.find(r => r.id === selectedRows[0]) || null;
  };

  // 执行业务操作
  const executeOperation = (op: SeedlingOperationMode) => {
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
        <h3 className="text-lg font-semibold text-gray-900">育苗列表</h3>
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
              {onAdd && (
                <button
                  onClick={onAdd}
                  className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              )}
              <button
                onClick={() => onOperationModeChange('edit')}
                className="h-8 px-3 flex items-center gap-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={() => onOperationModeChange('delete')}
                className="h-8 px-3 flex items-center gap-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              <button
                onClick={() => { onOperationModeChange('export'); }}
                className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                导出
              </button>
              <button
                onClick={() => { onPrintModeChange(true); }}
                className="h-8 px-3 flex items-center gap-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                <Printer className="w-4 h-4" />
                标签打印
              </button>
            </>
          )}
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-emerald-600">
            <tr>
              {showCheckbox && (
                <th className="px-4 py-3 text-center text-sm font-semibold text-white whitespace-nowrap">
                  选择
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">育苗批号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">作物编码</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">关联种源</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">作物品种</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">品种</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">场地</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">成苗率</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={showCheckbox ? 11 : 10} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              currentData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  {showCheckbox && (
                    <td className="px-4 py-3 text-center">
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
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm">
                    <span className="font-mono text-blue-600">{record.seedlingCode}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-mono text-orange-600">{record.cropCode || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{record.sourceCode}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{record.cropName}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{record.cropVariety}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{record.siteName}</td>
                  <td className="px-4 py-3 text-sm text-emerald-600 font-medium">{record.survivalRate}%</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusMap[record.status]?.color || ''}`}>
                      {statusMap[record.status]?.label || record.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-1">
                      <button
                        onClick={() => onDetail(record)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDailyRecord(record)}
                        className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded"
                        title="每日记录"
                      >
                        <Calendar className="w-4 h-4" />
                      </button>
                      {record.status === SeedlingStatus.TRANSPLANT_READY && (
                        <button
                          onClick={() => onTransplant(record)}
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="定植操作"
                        >
                          <Truck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => onPrint(record)}
                        className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                        title="打印标签"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      {record.pictures && record.pictures.length > 0 && (
                        <button
                          onClick={() => onImageClick(record.pictures)}
                          className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded"
                          title="查看图片"
                        >
                          <Image className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
        {/* 操作模式下显示选择状态和全选按钮 */}
        {(operationMode !== 'normal' || exportMode || printMode) && (
          <div className="flex items-center gap-4">
            <button
              onClick={onExportSelectAll}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              {selectedRows.length === data.length ? '全不选' : '全选'}
            </button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        )}
        <div className="text-sm text-gray-500">
          共 {data.length} 条
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onChange({ ...pagination, current: pagination.current - 1 })}
            disabled={pagination.current === 1}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50 hover:bg-gray-100"
          >
            上一页
          </button>
          <span className="px-3 py-1 text-sm">
            {pagination.current} / {totalPages || 1}
          </span>
          <button
            onClick={() => onChange({ ...pagination, current: pagination.current + 1 })}
            disabled={pagination.current >= totalPages}
            className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50 hover:bg-gray-100"
          >
            下一页
          </button>
        </div>
      </div>
    </div>
  );
}
