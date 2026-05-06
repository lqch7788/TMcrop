/**
 * 种植数据表格组件
 */

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Printer, Image, CheckCircle, Download, ChevronLeft, ChevronRight, Plus, XCircle } from 'lucide-react';
import { Planting, PlantingStatus } from '../../../../types/crop';
import { CropVariety } from '../../../../types/crop';
import * as cropVarietyService from '../../../../services/apiCropVarietyService';

// 操作模式类型
type PlantingOperationMode = 'normal' | 'detail' | 'edit' | 'harvest' | 'print' | 'image' | 'delete' | 'export';

interface PlantingTableProps {
  data: Planting[];
  pagination: { current: number; pageSize: number };
  onChange: (pagination: { current: number; pageSize: number }) => void;
  onPageSizeChange?: (pageSize: number) => void;
  selectedRows: string[];
  onSelectionChange: (keys: string[]) => void;
  onAdd?: () => void;  // 新增回调
  onEdit: (record: Planting) => void;
  onDetail: (record: Planting) => void;
  onHarvest: (record: Planting) => void;
  onPrint: (record: Planting) => void;
  onDelete: (ids: string[]) => void;
  onImageClick: (images: string[]) => void;
  // 结束相关回调
  onEnd: (record: Planting, endType: 'normal' | 'abnormal') => void;
  // 模式状态
  operationMode?: PlantingOperationMode;
  onOperationModeChange?: (mode: PlantingOperationMode) => void;
  // 导出相关
  exportMode?: boolean;
  onExportClick?: () => void;
  onExportSelectAll?: () => void;
  onExportCancel?: () => void;
  onConfirmExport?: () => void;
  // 打印相关
  printMode?: boolean;
  onPrintModeChange?: (mode: boolean) => void;
  onConfirmPrint?: (records: Planting[]) => void;
  // 权限控制
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  canPrint?: boolean;
}

export function PlantingTable({
  data,
  pagination,
  onChange,
  selectedRows,
  onSelectionChange,
  onAdd,
  onEdit,
  onDetail,
  onHarvest,
  onPrint,
  onDelete,
  onImageClick,
  onEnd,
  operationMode = 'normal',
  onOperationModeChange,
  exportMode = false,
  onExportClick,
  onExportSelectAll,
  onExportCancel,
  onConfirmExport,
  printMode = false,
  onPrintModeChange,
  onConfirmPrint,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExport = true,
  canPrint = true,
}: PlantingTableProps) {
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
  // 所有作物必须有编码！找不到时使用同品种下的"其他"类
  const getVarietyByAny = (record: Planting): CropVariety | null => {
    // 优先用 cropCode 查找（11位新编码）
    if (record.cropCode) {
      const v = varietyCache.get(record.cropCode);
      if (v) return v;
    }
    // 用 sourceCode 查找（迁移数据中 sourceCode 存储正确品种名）
    if (record.sourceCode) {
      const v = varietyCache.get(record.sourceCode);
      if (v) return v;
      // 模糊匹配
      for (const [key, variety] of varietyCache.entries()) {
        const varietyFullName = (variety.subVariety1Name || variety.varietyName || '');
        if (varietyFullName.includes(record.sourceCode) || record.sourceCode.includes(varietyFullName)) {
          return variety;
        }
      }
    }
    // 用 cropName 查找
    if (record.cropName) {
      const v = varietyCache.get(record.cropName);
      if (v) return v;
      // 模糊匹配
      for (const [key, variety] of varietyCache.entries()) {
        const varietyFullName = (variety.subVariety1Name || variety.varietyName || '');
        if (varietyFullName.includes(record.cropName) || record.cropName.includes(varietyFullName)) {
          return variety;
        }
      }
    }

    // 找不到时，在同品种下找"其他"子品种
    // 遍历品种库，查找 varietyName 相同但 subVariety1Name 为"其他"的品种
    for (const [key, variety] of varietyCache.entries()) {
      const searchName = record.sourceCode || record.cropName || '';
      if (!searchName) continue;

      // 检查该品种的 varietyName 是否匹配
      if (variety.varietyName && searchName.includes(variety.varietyName)) {
        // 在同品种下查找"其他"子品种
        for (const [k2, v2] of varietyCache.entries()) {
          if (v2.varietyName === variety.varietyName &&
              v2.typeName === variety.typeName &&
              v2.categoryName === variety.categoryName &&
              v2.subVariety1Name?.includes('其他')) {
            return v2;
          }
        }
      }
    }

    // 仍然找不到，返回 null（不应该发生，所有作物必须有编码）
    return null;
  };

  // 获取作物品种路径
  const getVarietyPath = (record: Planting): string => {
    const variety = getVarietyByAny(record);
    if (!variety) {
      // 找不到品种（不应该发生），返回原始名称
      return record.sourceCode || record.cropName || '-';
    }
    const parts: string[] = [];
    if (variety.categoryName) parts.push(variety.categoryName);
    if (variety.typeName) parts.push(variety.typeName);
    if (variety.varietyName) parts.push(variety.varietyName);
    if (variety.subVariety1Name) parts.push(variety.subVariety1Name);
    return parts.join('-') || record.sourceCode || record.cropName || '-';
  };

  // 获取标准作物编码
  const getStandardCropCode = (record: Planting): string => {
    const variety = getVarietyByAny(record);
    if (!variety) {
      // 找不到品种（不应该发生），返回空编码提示
      return '-';
    }
    return variety.cropCode || '-';
  };

  // 获取作物品种（最细分）
  const getCropVarietyName = (record: Planting): string => {
    const variety = getVarietyByAny(record);
    if (!variety) {
      // 找不到品种（不应该发生），返回原始名称
      return record.sourceCode || record.cropName || '-';
    }
    return variety.subVariety1Name || variety.varietyName || record.sourceCode || record.cropName || '-';
  };

  const totalPages = Math.ceil(data.length / pagination.pageSize);
  const startIndex = (pagination.current - 1) * pagination.pageSize;
  const endIndex = Math.min(startIndex + pagination.pageSize, data.length);
  const currentData = data.slice(startIndex, endIndex);

  // 判断是否需要显示复选框列（仅在导出模式下显示）
  const showCheckbox = exportMode;

  const statusMap = {
    [PlantingStatus.PLANTED]: { label: '已定植', color: 'text-blue-600 bg-blue-50' },
    [PlantingStatus.GROWING]: { label: '生长期', color: 'text-amber-600 bg-amber-50' },
    [PlantingStatus.HARVESTED]: { label: '已采收', color: 'text-green-600 bg-green-50' },
    [PlantingStatus.CANCELLED]: { label: '已取消', color: 'text-gray-600 bg-gray-50' }
  };

  // 根据showCheckbox动态生成列
  const getColumns = () => {
    const cols: Array<{
      title: string;
      dataIndex?: string;
      width?: number;
      render?: (value: unknown, record: Planting) => React.ReactNode;
    }> = [];

    // 选择列（仅导出模式显示）
    if (showCheckbox) {
      cols.push({
        title: '',
        dataIndex: 'id',
        width: 50,
        render: (id: string) => (
          <input
            type="checkbox"
            checked={selectedRows.includes(id)}
            onChange={(e) => {
              if (e.target.checked) {
                onSelectionChange([...selectedRows, id]);
              } else {
                onSelectionChange(selectedRows.filter(k => k !== id));
              }
            }}
            className="w-4 h-4 text-emerald-600 rounded border-gray-300"
          />
        )
      });
    }

    cols.push(
      {
        title: '种植批号',
        dataIndex: 'plantCode',
        width: 140,
        render: (code: string, record: Planting) => (
          <span
            className="font-mono text-blue-600 font-semibold cursor-pointer hover:text-blue-800 hover:underline"
            onClick={() => onDetail(record)}
            title="点击查看详情"
          >
            {code}
          </span>
        )
      },
      {
        title: '关联生产计划',
        dataIndex: 'productionPlanCode',
        width: 140,
        render: (code: string) => (
          code ? (
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-medium">
              {code}
            </span>
          ) : '-'
        )
      },
      {
        title: '作物编码',
        dataIndex: 'cropCode',
        width: 120,
        render: (code: string, record: Planting) => (
          <span className="font-mono text-orange-600">{getStandardCropCode(record) || '-'}</span>
        )
      },
      {
        title: '作物品种',
        dataIndex: 'cropName',
        width: 100,
        render: (name: string, record: Planting) => getCropVarietyName(record)
      },
      {
        title: '品种路径',
        dataIndex: 'cropVariety',
        width: 180,
        render: (value: string, record: Planting) => getVarietyPath(record)
      },
      {
        title: '种植区域',
        dataIndex: 'areaName',
        width: 140
      },
      {
        title: '种植数量',
        dataIndex: 'plantingCount',
        width: 100,
        render: (count: number) => (
          <span className="text-emerald-600 font-medium">{count.toLocaleString()}</span>
        )
      },
      {
        title: '种植日期',
        dataIndex: 'plantingDate',
        width: 120
      },
      {
        title: '已采收',
        dataIndex: 'harvestQuantity',
        width: 100,
        render: (quantity: number, record: Planting) => (
          <span className="text-blue-600 font-medium">
            {quantity ? `${quantity.toLocaleString()}${record.unit || ''}` : '0'}
          </span>
        )
      },
      {
        title: '完成比例',
        dataIndex: 'targetYield',
        width: 100,
        render: (target: number, record: Planting) => {
          const harvestQty = record.harvestQuantity || 0;
          if (!target || target === 0) {
            return <span className="text-gray-400">-</span>;
          }
          const rate = harvestQty / target;
          return (
            <span className={`font-medium ${
              rate >= 0.8
                ? 'text-green-600'
                : rate >= 0.5
                ? 'text-amber-600'
                : 'text-red-600'
            }`}>
              {Math.round(rate * 100)}%
            </span>
          );
        }
      },
      {
        title: '状态',
        dataIndex: 'status',
        width: 100,
        render: (status: PlantingStatus) => {
          const s = statusMap[status] || statusMap[PlantingStatus.GROWING];
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium ${s.color}`}>
              {s.label}
            </span>
          );
        }
      },
      {
        title: '操作',
        width: 180,
        render: (_: unknown, record: Planting) => (
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(record)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="编辑"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            {!record.isHarvest && (
              <button
                onClick={() => onHarvest(record)}
                className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                title="采收登记"
              >
                <CheckCircle className="w-4 h-4" />
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
              onClick={() => onDelete([record.id])}
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
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
        )
      }
    );

    return cols;
  };

  const columns = getColumns();

  // 获取选中的第一条记录
  const getFirstSelectedRecord = () => {
    if (selectedRows.length === 0) return null;
    return data.find(r => r.id === selectedRows[0]) || null;
  };

  // 执行业务操作
  const executeOperation = (op: PlantingOperationMode) => {
    const record = getFirstSelectedRecord();
    if (!record) {
      alert('请先在表格中选择一条记录');
      return;
    }
    switch (op) {
      case 'detail':
        if (onDetail) onDetail(record);
        break;
      case 'edit':
        if (onEdit) onEdit(record);
        break;
      case 'harvest':
        if (!record.isHarvest && onHarvest) {
          onHarvest(record);
        } else {
          alert('该记录已采收或无法进行采收操作');
          return;
        }
        break;
      case 'print':
        if (onPrint) onPrint(record);
        break;
      case 'image':
        if (record.pictures?.length > 0 && onImageClick) {
          onImageClick(record.pictures);
        } else {
          alert('该记录没有图片');
          return;
        }
        break;
      case 'delete':
        if (onDelete) onDelete(selectedRows);
        break;
    }
    // 操作完成后重置模式
    if (onOperationModeChange) onOperationModeChange('normal');
    // 清空选择
    onSelectionChange([]);
  };

  // 取消操作
  const cancelOperation = () => {
    if (onOperationModeChange) onOperationModeChange('normal');
    onSelectionChange([]);
  };

  // 取消打印模式
  const cancelPrintMode = () => {
    if (onPrintModeChange) onPrintModeChange(false);
    onSelectionChange([]);
  };

  // 确认打印
  const confirmPrint = () => {
    if (selectedRows.length === 0) {
      alert('请先选择要打印的记录');
      return;
    }
    const selectedRecords = data.filter(item => selectedRows.includes(item.id));
    if (onConfirmPrint) onConfirmPrint(selectedRecords);
    if (onPrintModeChange) onPrintModeChange(false);
    onSelectionChange([]);
  };

  // 获取模式对应的文字描述
  const getModeText = (mode: PlantingOperationMode) => {
    switch (mode) {
      case 'detail': return '查看详情';
      case 'edit': return '编辑';
      case 'harvest': return '采收登记';
      case 'print': return '打印标签';
      case 'image': return '查看图片';
      case 'delete': return '删除';
      case 'export': return '导出';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* 标题和操作按钮栏 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">种植作物列表</h3>
        <div className="flex items-center gap-2">
          {exportMode ? (
            /* 导出模式 */
            <>
              <span className="text-sm text-gray-500 mr-2">已选择 {selectedRows.length} 项</span>
              {onExportSelectAll && (
                <button
                  onClick={onExportSelectAll}
                  className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  {selectedRows.length === data.length ? '全不选' : '全选'}
                </button>
              )}
              <button
                onClick={onConfirmExport}
                disabled={selectedRows.length === 0}
                className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button
                onClick={onExportCancel}
                className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </>
          ) : (
            /* 正常模式 */
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
              {canExport && onExportClick && (
                <button
                  onClick={onExportClick}
                  className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-380px)]">
        <table className="w-full min-w-[1400px]">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 sticky top-0 z-10">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-sm font-semibold text-white whitespace-nowrap"
                  style={{ minWidth: col.width }}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              currentData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  {columns.map((col, index) => (
                    <td key={index} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap" style={{ minWidth: col.width }}>
                      {col.render
                        ? col.render(record[col.dataIndex as keyof Planting] as never, record)
                        : (record[col.dataIndex as keyof Planting] as never)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        {/* 导出模式下显示选择状态 */}
        {exportMode && (
          <div className="flex items-center gap-4">
            {onExportSelectAll && (
              <button
                onClick={onExportSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {selectedRows.length === data.length ? '全不选' : '全选'}
              </button>
            )}
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
