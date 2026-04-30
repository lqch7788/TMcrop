/**
 * 育苗数据表格组件
 * 右上角按钮逻辑：编辑/删除/导出 → 需要选择记录后确认
 * 行内按钮逻辑：查看详情/每日记录/定植操作/打印/图片 → 直接执行
 */

import React, { useEffect } from 'react';
import { Edit2, Trash2, Printer, Eye, Image, Download, Plus, Calendar, Truck, ChevronLeft, ChevronRight, CheckCircle, XCircle } from 'lucide-react';
import { Seedling, SeedlingStatus } from '../../../../types/crop';
import * as cropVarietyService from '../../../../services/cropVarietyService';

// 操作模式类型（用于批量操作）
type SeedlingOperationMode = 'normal' | 'edit' | 'delete' | 'export' | 'print';

interface SeedlingTableProps {
  data: Seedling[];
  pagination: { current: number; pageSize: number };
  onChange: (pagination: { current: number; pageSize: number }) => void;
  onPageSizeChange?: (pageSize: number) => void;
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
  // 结束相关回调
  onEnd: (record: Seedling, endType: 'normal' | 'abnormal') => void;
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
  onPageSizeChange,
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
  onEnd,
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
  // 确保品种库数据正确初始化
  useEffect(() => {
    // 强制重置品种库数据，确保数据完整正确
    cropVarietyService.resetVarieties();
  }, []);

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

  // 获取作物品种路径显示（参照种源管理页面格式）
  // 格式：类别 - 类型 - 品种 - 作物品种
  const getCropVarietyPath = (record: Seedling) => {
    if (!record.cropCode || record.cropCode.length < 6) {
      return { categoryName: '', typeName: '', varietyName: '', subVarietyName: '' };
    }
    // 初始化品种库
    cropVarietyService.initVarieties();
    // 尝试精确匹配11位编码
    let variety = cropVarietyService.getVarietyByCode(record.cropCode);
    // 如果精确匹配失败，尝试用前9位匹配（去掉最后2位详细编码）
    if (!variety && record.cropCode.length >= 9) {
      const prefix9 = record.cropCode.substring(0, 9) + '00'; // 假设详细编码为00
      variety = cropVarietyService.getVarietyByCode(prefix9);
    }
    // 如果仍然失败，遍历品种库查找匹配的记录
    if (!variety) {
      const allVarieties = cropVarietyService.getAllVarieties();
      // 查找前9位匹配的记录
      variety = allVarieties.find(v =>
        v.cropCode && record.cropCode &&
        (record.cropCode.startsWith(v.cropCode.substring(0, Math.min(9, v.cropCode.length))) ||
         v.cropCode.startsWith(record.cropCode.substring(0, Math.min(9, record.cropCode.length))))
      );
    }

    if (variety && variety.categoryName) {
      return {
        categoryName: variety.categoryName,
        typeName: variety.typeName,
        varietyName: variety.varietyName,
        subVarietyName: variety.subVariety1Name || ''
      };
    }

    // 如果品种库查询失败，使用数据本身的字段
    return {
      categoryName: '',
      typeName: '',
      varietyName: record.cropVariety || '',
      subVarietyName: ''
    };
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
        <table className="w-full table-fixed">
          <colgroup>
            {showCheckbox && <col className="w-12" />}
            <col className="w-44" />
            <col className="w-36" />
            <col className="w-36" />
            <col className="w-52" />
            <col className="w-28" />
            <col className="w-52" />
            <col className="w-28" />
            <col className="w-16" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-20" />
            <col className="w-16" />
            <col className="w-40" />
          </colgroup>
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showCheckbox && (
                <th className="px-3 py-3 text-center text-sm font-semibold text-white whitespace-nowrap">
                  选择
                </th>
              )}
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">育苗批号</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">关联生产计划</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">作物编码</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">关联种源</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">作物品种</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">品种路径</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">场地</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">成苗率</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">入库数量</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">剩余总数</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">完成比例</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">状态</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={showCheckbox ? 14 : 13} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              currentData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  {showCheckbox && (
                    <td className="px-3 py-2 text-center">
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
                  <td className="px-3 py-2 text-sm">
                    <button
                      onClick={() => onDetail(record)}
                      className="font-mono text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      title="点击查看详情"
                    >
                      {record.seedlingCode}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap truncate" title={record.productionPlanCode || ''}>
                    {record.productionPlanCode ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-medium">
                        {record.productionPlanCode}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <span className="font-mono text-orange-600">{record.cropCode || '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{record.sourceCode}</td>
                  <td className="px-3 py-2 text-sm text-gray-900 truncate" title={record.cropVariety || record.cropName}>
                    {/* 作物品种列：从品种库获取最细化名称，参照种源管理页面格式显示 */}
                    {(() => {
                      cropVarietyService.initVarieties();
                      const variety = cropVarietyService.getVarietyByCode(record.cropCode);
                      if (variety) {
                        // 显示品种库中的完整品种名称（最后一级）
                        return variety.subVariety1Name || variety.varietyName;
                      }
                      // 找不到时显示cropVariety
                      return record.cropVariety || record.cropName;
                    })()}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
                    {/* 品种路径列，参照种源管理页面格式：类别-类型-品种-作物名称 */}
                    {(() => {
                      const pathInfo = getCropVarietyPath(record);
                      return (
                        <>
                          <span className="text-gray-400">{pathInfo.categoryName}</span>
                          <span className="text-gray-400 mx-0.5">-</span>
                          <span className="text-gray-700">{pathInfo.typeName}</span>
                          <span className="text-gray-400 mx-0.5">-</span>
                          <span className="text-gray-700">{pathInfo.varietyName}</span>
                          <span className="text-gray-400 mx-0.5">-</span>
                          <span className="text-gray-900 font-medium">{pathInfo.subVarietyName || record.cropName}</span>
                        </>
                      );
                    })()}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{record.siteName}</td>
                  <td className="px-3 py-2 text-sm text-emerald-600 font-medium">{record.survivalRate}%</td>
                  <td className="px-3 py-2 text-sm text-blue-600 font-medium">
                    {(record.survivalCount || 0).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm text-purple-600 font-medium">
                    {(record.initialCount - record.lossCount).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-sm whitespace-nowrap">
                    {record.targetSurvivalCount > 0 ? (
                      <span className={`font-medium ${
                        (record.survivalCount || 0) / record.targetSurvivalCount >= 0.8
                          ? 'text-green-600'
                          : (record.survivalCount || 0) / record.targetSurvivalCount >= 0.5
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {Math.round((record.survivalCount || 0) / record.targetSurvivalCount * 100)}%
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${statusMap[record.status]?.color || ''}`}>
                      {statusMap[record.status]?.label || record.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm">
                    <div className="flex gap-1">
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
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
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
