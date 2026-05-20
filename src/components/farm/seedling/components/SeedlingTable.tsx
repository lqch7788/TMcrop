/**
 * 育苗数据表格组件
 * 右上角按钮逻辑：编辑/删除/导出 → 需要选择记录后确认
 * 行内按钮逻辑：查看详情/每日记录/定植操作/打印/图片 → 直接执行
 */

import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Printer, Eye, Image, Download, Plus, Calendar, Truck, CheckCircle, XCircle, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Seedling, SeedlingStatus } from '../../../../types/crop';
import { CropVariety } from '../../../../types/crop';
import * as cropVarietyService from '../../../../services/apiCropVarietyService';
import { SEEDLING_STATUS_MAP } from '../../../../constants/cropConstants';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Pagination } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';

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
  onLabelManage?: (record: Seedling) => void;
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
  // 权限控制
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  canPrint?: boolean;
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
  onLabelManage,
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
}: SeedlingTableProps) {
  // 品种数据缓存
  const [varietyCache, setVarietyCache] = useState<Map<string, CropVariety>>(new Map());

  // 加载品种数据
  useEffect(() => {
    const loadVarieties = async () => {
      const varieties = await cropVarietyService.getAllVarieties();
      const cache = new Map<string, CropVariety>();
      varieties.forEach(v => {
        // 缓存最细分品种（subVariety1Name 优先）
        const key1 = v.subVariety1Name || '';
        if (key1 && !cache.has(key1)) {
          cache.set(key1, v);
        }
        // 也按 varietyName 缓存
        const key2 = v.varietyName || '';
        if (key2 && !cache.has(key2)) {
          cache.set(key2, v);
        }
        // 也按 cropCode 缓存
        const key3 = v.cropCode || '';
        if (key3 && !cache.has(key3)) {
          cache.set(key3, v);
        }
      });
      setVarietyCache(cache);
    };
    loadVarieties();
  }, []);

  // 根据 cropCode 或 cropName 获取品种信息
  const getVarietyByCodeOrName = (cropCode: string, cropName?: string): CropVariety | undefined => {
    // 如果有 cropCode，先尝试用编码查找
    if (cropCode) {
      // 尝试直接用编码查找
      const variety = varietyCache.get(cropCode);
      if (variety) return variety;

      // 尝试用前9位匹配
      if (cropCode.length >= 9) {
        const prefix9 = cropCode.substring(0, 9);
        for (const [key, v] of varietyCache.entries()) {
          if (key.startsWith(prefix9) || prefix9.startsWith(key.substring(0, Math.min(9, key.length)))) {
            return v;
          }
        }
      }
    }

    // 如果有 cropName，尝试用名称查找
    if (cropName) {
      // 尝试用 subVariety1Name 查找
      const variety = varietyCache.get(cropName);
      if (variety) return variety;

      // 尝试用 varietyName 查找
      for (const [key, v] of varietyCache.entries()) {
        if (key === cropName || v.varietyName === cropName || v.subVariety1Name === cropName) {
          return v;
        }
      }
    }

    return undefined;
  };

  // 获取作物品种路径显示
  const getCropVarietyPath = (record: Seedling) => {
    // 优先使用后端直接返回的品种路径字段
    if (record.categoryName || record.typeName || record.varietyName) {
      return {
        categoryName: record.categoryName || '',
        typeName: record.typeName || '',
        varietyName: record.varietyName || '',
        subVarietyName: record.subVarietyName || ''
      };
    }
    // 如果后端没有返回品种路径，则通过 cropCode 或 cropName 查询品种库
    const variety = getVarietyByCodeOrName(record.cropCode, record.cropName);
    if (variety && variety.categoryName) {
      return {
        categoryName: variety.categoryName,
        typeName: variety.typeName,
        varietyName: variety.varietyName,
        subVarietyName: variety.subVariety1Name || ''
      };
    }
    return {
      categoryName: '',
      typeName: '',
      varietyName: record.cropVariety || '',
      subVarietyName: ''
    };
  };

  // 获取标准作物编码
  const getStandardCropCode = (record: Seedling): string => {
    const variety = getVarietyByCodeOrName(record.cropCode, record.cropName);
    return variety?.cropCode || record.cropCode || '';
  };

  // 获取作物品种（最细分）
  const getCropVarietyName = (record: Seedling): string => {
    // 优先使用后端返回的最细化品种名称（subVarietyName）
    if (record.subVarietyName) {
      return record.subVarietyName;
    }
    // 其次使用 varietyName
    if (record.varietyName) {
      return record.varietyName;
    }
    // 如果后端没有返回品种路径，则通过 cropCode 或 cropName 查询品种库
    const variety = getVarietyByCodeOrName(record.cropCode, record.cropName);
    if (variety) {
      return variety.subVariety1Name || variety.varietyName || record.cropVariety || '';
    }
    return record.cropVariety || record.cropName || '';
  };

  // 计算分页
  const totalPages = Math.ceil(data.length / pagination.pageSize);
  const startIndex = (pagination.current - 1) * pagination.pageSize;
  const endIndex = Math.min(startIndex + pagination.pageSize, data.length);
  const currentData = data.slice(startIndex, endIndex);

  // 判断是否需要显示复选框列
  const showCheckbox = operationMode !== 'normal' || exportMode || printMode;

  // TODO: 颜色值与共享常量 SEEDLING_STATUS_MAP 不同（amber/blue/green vs blue/amber/emerald），暂保留本地定义
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
      showAlert('请先在表格中选择一条记录');
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
        <h3 className="text-lg font-semibold text-gray-900">育苗列表</h3>
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
                size="sm"
                className="bg-purple-600 text-white hover:bg-purple-700"
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
        <table className="w-full table-fixed">
          <colgroup>
            {showCheckbox && <col className="w-12" />}
            <col className="w-44" />
            <col className="w-36" />
            <col className="w-52" />
            <col className="w-36" />
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
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">关联种源</th>
              <th className="px-3 py-3 text-left text-sm font-semibold text-white whitespace-nowrap">作物编码</th>
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
                        className="w-4 h-4 text-emerald-600 rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-3 py-2 text-sm">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onDetail(record)}
                      title="点击查看详情"
                    >
                      {record.seedlingCode}
                    </Button>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap truncate" title={record.productionPlanCode || ''}>
                    {record.productionPlanCode ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-medium">
                        {record.productionPlanCode}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700 whitespace-nowrap">{record.sourceCode}</td>
                  <td className="px-3 py-2 text-sm">
                    <span className="font-mono text-orange-600">{getStandardCropCode(record) || '-'}</span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900 truncate" title={record.cropVariety || record.cropName}>
                    {/* 作物品种列：从品种库获取最细化名称 */}
                    {getCropVarietyName(record)}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600 whitespace-nowrap overflow-hidden text-ellipsis">
                    {/* 品种路径列，参照种源管理页面格式：类别-类型-品种-作物名称 */}
                    {(() => {
                      const pathInfo = getCropVarietyPath(record);
                      if (!pathInfo.categoryName) return record.cropVariety || '-';
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDailyRecord(record)}
                        title="每日记录"
                      >
                        <Calendar className="w-4 h-4" />
                      </Button>
                      {record.status === SeedlingStatus.TRANSPLANT_READY && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onTransplant(record)}
                          title="定植操作"
                        >
                          <Truck className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onPrint(record)}
                        title="打印标签"
                      >
                        <Printer className="w-4 h-4" />
                      </Button>
                      {onLabelManage && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onLabelManage(record)}
                          title="标签管理"
                        >
                          <Tag className="w-4 h-4" />
                        </Button>
                      )}
                      {record.pictures && record.pictures.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onImageClick(record.pictures)}
                          title="查看图片"
                        >
                          <Image className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEnd(record, 'normal')}
                        title="正常结束"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEnd(record, 'abnormal')}
                        title="异常结束"
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
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
            <Button
              variant="link"
              size="sm"
              onClick={onExportSelectAll}
            >
              {selectedRows.length === data.length ? '全不选' : '全选'}
            </Button>
            <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
          </div>
        )}
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
