/**
 * 种植数据表格组件
 */

import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, Calendar, CheckCircle, Download, Edit2, History, Image, MoveRight, Package, Plus, Printer, Sprout, Tag, Trash2, Wheat, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { Planting, PlantingStatus } from '../../../../types/crop';
import { CropVariety } from '../../../../types/crop';
import * as cropVarietyService from '../../../../services/apiCropVarietyService';
import { PLANTING_STATUS_MAP, SOURCE_TYPE_MAP } from '../../../../constants/cropConstants';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui';
import { Pagination } from '@/components/ui';
import { Badge } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';

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
  onPrint: (record: Planting) => void;
  onDelete: (ids: string[]) => void;
  onImageClick: (images: string[]) => void;
  // V2 改造 (任务 16): 种植结束弹窗
  onEndV2?: (record: Planting) => void;
  // 2026-06-28: 直接结束回调（与育苗管理"正常结束"/"异常结束"按钮一致）
  onEnd?: (record: Planting, endType: 'normal' | 'abnormal') => void;
  // 2026-06-19: 行级采收入库回调（unify-harvest-inbound-into-source-operations）
  onInbound?: (record: Planting) => void;
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
  // 标签/移动/标记回调
  onLabelDetail?: (record: Planting) => void;
  onMove?: (record: Planting) => void;
  onMark?: (record: Planting) => void;
  // 2026-06-19: 移入/移出记录查看回调
  onViewMoveRecords?: (record: Planting) => void;
  // 2026-06-25 v3: 育种/留种记录回调
  onBreedingRecord?: (record: Planting) => void;
  onSeedSavingRecord?: (record: Planting) => void;
  // 2026-06-28: 每日记录回调
  onDailyRecord?: (record: Planting) => void;
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
  onPrint,
  onDelete,
  onImageClick,
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
  onEndV2,
  onEnd,
  onInbound,
  onLabelDetail,
  onMove,
  onMark,
  onViewMoveRecords,
  onBreedingRecord,
  onSeedSavingRecord,
  onDailyRecord,
}: PlantingTableProps) {
  // 品种数据缓存
  const [varietyCache, setVarietyCache] = useState<Map<string, CropVariety>>(new Map());
  // 使用 ref 保存最新的 selectedRows，避免闭包问题
  const selectedRowsRef = useRef(selectedRows);
  useEffect(() => {
    selectedRowsRef.current = selectedRows;
  }, [selectedRows]);

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

    // 2026-06-20 兜底：后端 GET /plantings 已 LEFT JOIN crop_varieties 带回 categoryName/typeName/varietyName/subVariety1Name
    // 当 cropCode 在前端 varietyCache 查不到时（如 GS010100200 未在 crop_varieties 表），
    // 用 record 自身 JOIN 出的字段组装一个伪 CropVariety，确保列表能展示
    if (record.cropCode && record.categoryName) {
      return {
        id: '',
        cropCode: record.cropCode,
        categoryCode: '' as any,
        categoryName: record.categoryName || '',
        typeCode: '',
        typeName: record.typeName || '',
        varietyCode: '',
        varietyName: record.varietyName || '',
        subVariety1Code: '',
        subVariety1Name: record.subVariety1Name || '',
        subVariety2Code: '',
        subVariety2Name: '',
        detailVarietyCode: '',
        detailVarietyName: '',
        alias: [],
        status: 'active',
        createTime: '',
        updateTime: '',
      } as CropVariety;
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

  // 判断是否需要显示复选框列（编辑模式、删除模式、导出模式、打印模式）
  const showCheckbox = operationMode === 'edit' || operationMode === 'delete' || exportMode || printMode;

  // 状态映射（PLANTING_STATUS 枚举值 → 标签 + 颜色）
  const statusMap: Record<string, { label: string; color: string }> = {
    [PlantingStatus.PLANTED]: { label: '已定植', color: 'text-blue-600 bg-blue-50' },
    [PlantingStatus.GROWING]: { label: '生长期', color: 'text-amber-600 bg-amber-50' },
    [PlantingStatus.HARVESTING]: { label: '采收中', color: 'text-amber-700 bg-amber-50' },
    [PlantingStatus.HARVESTED]: { label: '已采收', color: 'text-green-600 bg-green-50' },
    [PlantingStatus.ENDED]: { label: '已结束', color: 'text-gray-600 bg-gray-100' },
    [PlantingStatus.CANCELLED]: { label: '已取消', color: 'text-red-600 bg-red-50' },
  };

  // 根据showCheckbox动态生成列
  const getColumns = () => {
    const cols: Array<{
      title: string;
      dataIndex?: string;
      width?: number;
      render?: (value: unknown, record: Planting) => React.ReactNode;
    }> = [];

    // 选择列（编辑/删除/导出/打印模式显示）
    if (showCheckbox) {
      cols.push({
        title: '',
        dataIndex: 'id',
        width: 50,
        render: (_: unknown, record: Planting) => (
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
            className="w-4 h-4 text-emerald-600 rounded border-gray-400"
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
        render: (count: number, record: Planting) => (
          <span className="text-emerald-600 font-medium">{(count || 0).toLocaleString()}{record.unit || ''}</span>
        )
      },
      // 2026-06-28: 每日记录累加 3 列（损耗/补栽/剩余）
      {
        title: '损耗数量',
        dataIndex: 'lossCount',
        width: 100,
        render: (count: number, record: Planting) => (
          <span className={(count || 0) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
            {count ? `${count.toLocaleString()}${record.unit || ''}` : '-'}
          </span>
        )
      },
      {
        title: '补栽数量',
        dataIndex: 'supplementCount',
        width: 100,
        render: (count: number, record: Planting) => (
          <span className={(count || 0) > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
            {count ? `${count.toLocaleString()}${record.unit || ''}` : '-'}
          </span>
        )
      },
      {
        title: '剩余数量',
        dataIndex: 'remainingCount',
        width: 100,
        render: (_: unknown, record: Planting) => {
          // 活体剩余 = plantingCount + supplementCount - lossCount（MAX 0）
          const remaining = Math.max(0,
            (record.plantingCount || 0) +
            (record.supplementCount || 0) -
            (record.lossCount || 0)
          );
          return (
            <span className="text-blue-600 font-bold">
              {remaining.toLocaleString()}{record.unit || ''}
            </span>
          );
        }
      },
      {
        title: '种植日期',
        dataIndex: 'plantingDate',
        width: 120
      },
      {
        title: '土壤PH',
        dataIndex: 'soilPH',
        width: 90,
        render: (value: number) => (
          <span className={`font-mono ${value != null && value > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
            {value != null && value > 0 ? value.toFixed(1) : '-'}
          </span>
        )
      },
      {
        title: '土壤EC',
        dataIndex: 'soilEC',
        width: 90,
        render: (value: number) => (
          <span className={`font-mono ${value != null && value > 0 ? 'text-gray-700' : 'text-gray-400'}`}>
            {value != null && value > 0 ? value.toFixed(1) : '-'}
          </span>
        )
      },
      {
        title: '损耗率',
        dataIndex: 'attritionRate',
        width: 85,
        render: (value: number) => (
          <span className={value != null && value > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
            {value != null && value > 0 ? `${value.toFixed(1)}%` : '-'}
          </span>
        )
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
        title: '采收入库量',
        dataIndex: 'harvestToInventoryQty',
        width: 110,
        render: (qty: number, record: Planting) => (
          <span className={qty > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
            {qty ? `${qty.toLocaleString()}${record.unit || ''}` : '-'}
          </span>
        )
      },
      {
        title: '种植自留种量',
        dataIndex: 'selfKeptToSourceQty',
        width: 200,
        // 2026-06-29: 多产物明细 chip 显示（如「枝条 200根 · 种子 100粒」）
        // 退化到老数据：仅 selfKeptToSourceQty 总数（没 breakdown）
        render: (qty: number, record: Planting) => {
          const breakdown = record.selfKeptByForm || []
          if (breakdown.length === 0) {
            return (
              <span className={qty > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                {qty ? `${qty.toLocaleString()}${record.selfKeptToSourceUnit || record.unit || ''}` : '-'}
              </span>
            )
          }
          return (
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-xs text-emerald-600 font-medium">
                {qty.toLocaleString()}{record.selfKeptToSourceUnit || record.unit || ''}
              </span>
              <div className="flex flex-wrap gap-1">
                {breakdown.map((it, idx) => (
                  <span
                    key={`${it.seedForm}-${idx}`}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-emerald-50 text-emerald-700 border border-emerald-200"
                    title={`${it.seedForm} ${it.quantity}${it.unit}`}
                  >
                    {it.seedForm} {it.quantity.toLocaleString()}{it.unit}
                  </span>
                ))}
              </div>
            </div>
          )
        }
      },
      {
        title: '废弃量',
        dataIndex: 'disposeQty',
        width: 100,
        render: (qty: number, record: Planting) => (
          <span className={qty > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
            {qty ? `${qty.toLocaleString()}${record.unit || ''}` : '-'}
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
        width: 250,
        render: (_: unknown, record: Planting) => (
          <div className="flex gap-1">
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
            {!record.endTime && !record.isHarvestLocked && onEndV2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEndV2(record)}
                title="采收"
              >
                {/* 2026-06-28: 图标改为 Package（与育苗管理"采收"图标一致） */}
                <Package className="w-4 h-4" />
              </Button>
            )}
            {/* 2026-06-28: 每日记录按钮（与育苗管理一致 — endTime 存在时隐藏） */}
            {!record.endTime && onDailyRecord && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDailyRecord(record)}
                title="每日记录"
              >
                <Calendar className="w-4 h-4 text-blue-600" />
              </Button>
            )}
            {/* 2026-06-19: 行级采收入库按钮（unify-harvest-inbound-into-source-operations） */}
            {!record.endTime && !record.isHarvestLocked && onInbound && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onInbound(record)}
                title="采收入库（行级）"
              >
                <Package className="w-4 h-4" />
              </Button>
            )}
            {onLabelDetail && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onLabelDetail(record)}
                title="标签详情"
              >
                <Tag className="w-4 h-4" />
              </Button>
            )}
            {onMove && !record.isHarvest && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMove(record)}
                title="移入/移出"
              >
                <MoveRight className="w-4 h-4" />
              </Button>
            )}
            {onMark && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onMark(record)}
                title="标记管理"
              >
                <Bookmark className="w-4 h-4" />
              </Button>
            )}
            {/* 2026-06-28：与育苗管理一致 — 正常结束 / 异常结束 两个独立按钮（放在标记管理图标后面） */}
            {!record.endTime && !record.isHarvestLocked && onEnd && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEnd(record, 'normal')}
                  title="正常结束"
                >
                  <CheckCircle className="w-4 h-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEnd(record, 'abnormal')}
                  title="异常结束"
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                </Button>
              </>
            )}
            {/* 2026-06-25 v3: 育种记录按钮 — 仅 isBreeding=true 的行显示 */}
            {record.isBreeding && onBreedingRecord && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onBreedingRecord(record)}
                title="育种记录"
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <Sprout className="w-4 h-4" />
              </Button>
            )}
            {/* 2026-06-25 v3: 留种记录按钮 — 仅 isSeedSaving=true 的行显示 */}
            {record.isSeedSaving && onSeedSavingRecord && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onSeedSavingRecord(record)}
                title="留种记录"
                className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
              >
                <Wheat className="w-4 h-4" />
              </Button>
            )}
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
  const executeOperation = async (op: PlantingOperationMode) => {
    const record = getFirstSelectedRecord();
    if (!record) {
      showAlert('请先在表格中选择一条记录');
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
          showAlert('该记录已采收或无法进行采收操作');
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
          showAlert('该记录没有图片');
          return;
        }
        break;
      case 'delete':
        if (onDelete) onDelete(selectedRows);
        return; // 删除走弹窗确认流程, 不在此处重置 UI
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
      showAlert('请先选择要打印的记录');
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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onExportSelectAll}
                >
                  {selectedRows.length === data.length ? '全不选' : '全选'}
                </Button>
              )}
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
                onClick={onExportCancel}
              >
                <X className="w-4 h-4" /> 取消
              </Button>
            </>
          ) : printMode ? (
            /* 打印模式 */
            <>
              <span className="text-sm text-gray-500 mr-2">已选择 {selectedRows.length} 项</span>
              {onExportSelectAll && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onExportSelectAll}
                >
                  {selectedRows.length === data.length ? '全不选' : '全选'}
                </Button>
              )}
              <Button
                variant="purple"
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
                <X className="w-4 h-4" /> 取消
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
                <X className="w-4 h-4" /> 取消
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
                <X className="w-4 h-4" /> 取消
              </Button>
            </>
          ) : (
            /* 正常模式 */
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
                  onClick={() => { if (onOperationModeChange) onOperationModeChange('edit'); }}
                >
                  <Edit2 className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {canDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { if (onOperationModeChange) onOperationModeChange('delete'); }}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {canExport && onExportClick && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onExportClick}
                >
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
              {canPrint && (
                <Button
                  variant="purple"
                  size="sm"
                  onClick={() => { if (onPrintModeChange) onPrintModeChange(true); }}
                >
                  <Printer className="w-4 h-4" />
                  标签打印
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="overflow-auto max-h-[calc(100vh-380px)]">
        <Table className="min-w-[2200px]">
          <TableHeader className="bg-gradient-to-r from-blue-500 to-blue-600 sticky top-0 z-10">
            <TableRow className="hover:from-blue-500 hover:to-blue-600">
              {showCheckbox && (
                <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap w-12">
                  <Input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange(data.map(item => item.id));
                      } else {
                        onSelectionChange([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                  />
                </TableHead>
              )}
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">种植批号</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">关联生产计划</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">来源批号</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">来源类型</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">作物编码</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">作物品种</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">品种路径</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">种植区域</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">种植数量</TableHead>
              {/* 2026-06-28: 每日记录累加 3 列 */}
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap bg-orange-700/30">损耗数量</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap bg-orange-700/30">补栽数量</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap bg-orange-700/30">剩余数量</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">种植日期</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">土壤PH</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">土壤EC</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">损耗率</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">已采收</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">采收入库量</TableHead>
              {/* 2026-06-29: 合并残株回种源 + 自交种子入种源 + 种植自留种 为 1 列「种植自留种量」 */}
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">种植自留种量</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">废弃量</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">完成比例</TableHead>
              <TableHead className="px-4 py-3 text-white text-sm font-semibold whitespace-nowrap">状态</TableHead>
              {/* 操作列 sticky right-0 — 水平滚动时始终吸右可见（参照育苗列表） */}
              <TableHead className="sticky right-0 px-4 py-3 text-white text-sm font-semibold whitespace-nowrap bg-blue-700 shadow-[-2px_0_4px_rgba(0,0,0,0.15)] z-20">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showCheckbox ? 24 : 23} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </TableCell>
              </TableRow>
            ) : (
              currentData.map((record) => (
                <TableRow key={record.id} className="hover:bg-gray-50">
                  {showCheckbox && (
                    <TableCell className="px-4 py-3">
                      <Input
                        type="checkbox"
                        checked={selectedRows.includes(record.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onSelectionChange([...selectedRowsRef.current, record.id]);
                          } else {
                            onSelectionChange(selectedRowsRef.current.filter(k => k !== record.id));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-400 text-emerald-600 focus:ring-emerald-500"
                      />
                    </TableCell>
                  )}
                  <TableCell className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="font-mono text-blue-600 font-semibold cursor-pointer hover:text-blue-800 hover:underline"
                        onClick={() => onDetail(record)}
                        title="点击查看详情"
                      >
                        {record.plantCode}
                      </span>
                      {/* 2026-06-24: 用途标识 badge — 区分育种 / 留种 / 普通种植 */}
                      {record.isBreeding && (
                        <Badge
                          className="bg-emerald-100 text-emerald-700 text-[10px] px-1.5 py-0"
                          title={`育种计划 · 世代 ${record.generation || '-'}${record.parentMaleCode ? ' · 父本 ' + record.parentMaleCode : ''}${record.parentFemaleCode ? ' · 母本 ' + record.parentFemaleCode : ''}`}
                        >
                          🌱 育种{record.generation ? ' ' + record.generation : ''}
                        </Badge>
                      )}
                      {record.isSeedSaving && (
                        <Badge
                          className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0"
                          title={`种植留种 · 标记 ${record.seedPlantMarker || '-'}`}
                        >
                          🌾 留种
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {record.productionPlanCode ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-medium">
                        {record.productionPlanCode}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    <span className="font-mono text-gray-700">{record.sourceCode || '-'}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {/* 2026-06-25: 改用种源自身类型（badge 显示 SOURCE_TYPE_MAP），无关联时按历史 sourceType 兜底 */}
                    {record.sourceSeedSourceType ? (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">
                        {SOURCE_TYPE_MAP[record.sourceSeedSourceType] || record.sourceSeedSourceType}
                      </span>
                    ) : record.sourceType === 'seedling' ? (
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs font-medium">种苗</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs font-medium">种子</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm">
                    <span className="font-mono text-orange-600">{getStandardCropCode(record) || '-'}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {getCropVarietyName(record)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                    {getVarietyPath(record)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{record.areaName}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-emerald-600 font-medium whitespace-nowrap">
                    {(record.plantingCount || 0).toLocaleString()}{record.unit || ''}
                  </TableCell>
                  {/* 2026-06-28: 每日记录累加 3 列（损耗/补栽/剩余） */}
                  <TableCell className="px-4 py-3 text-sm bg-orange-50/30 whitespace-nowrap">
                    <span className={(record.lossCount || 0) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                      {record.lossCount ? `${record.lossCount.toLocaleString()}${record.unit || ''}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm bg-orange-50/30 whitespace-nowrap">
                    <span className={(record.supplementCount || 0) > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                      {record.supplementCount ? `${record.supplementCount.toLocaleString()}${record.unit || ''}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm bg-orange-50/30 whitespace-nowrap">
                    <span className="text-blue-600 font-bold">
                      {Math.max(0, (record.plantingCount || 0) + (record.supplementCount || 0) - (record.lossCount || 0)).toLocaleString()}{record.unit || ''}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{record.plantingDate}</TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {record.soilPH != null && record.soilPH > 0 ? record.soilPH.toFixed(1) : '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                    {record.soilEC != null && record.soilEC > 0 ? record.soilEC.toFixed(1) : '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    {record.attritionRate != null && record.attritionRate > 0 ? (
                      <span className="text-amber-600 font-medium">{record.attritionRate.toFixed(1)}%</span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-blue-600 font-medium whitespace-nowrap">
                    {(record.harvestQuantity || 0).toLocaleString()}{record.unit || ''}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className={(record.harvestToInventoryQty || 0) > 0 ? 'text-blue-600 font-medium' : 'text-gray-400'}>
                      {record.harvestToInventoryQty ? `${record.harvestToInventoryQty.toLocaleString()}${record.harvestToInventoryUnit || record.unit || ''}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className={(record.selfKeptToSourceQty || 0) > 0 ? 'text-emerald-600 font-medium' : 'text-gray-400'}>
                      {record.selfKeptToSourceQty ? `${record.selfKeptToSourceQty.toLocaleString()}${record.selfKeptToSourceUnit || record.unit || ''}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    <span className={(record.disposeQty || 0) > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                      {record.disposeQty ? `${record.disposeQty.toLocaleString()}${record.disposeUnit || record.unit || ''}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    {(() => {
                      const harvestQty = record.harvestQuantity || 0;
                      const target = record.targetYield;
                      if (!target || target === 0) return <span className="text-gray-400">-</span>;
                      const rate = harvestQty / target;
                      return (
                        <span className={`font-medium ${
                          rate >= 0.8 ? 'text-green-600' : rate >= 0.5 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {Math.round(rate * 100)}%
                        </span>
                      );
                    })()}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusMap[record.status as keyof typeof statusMap]?.color || ''}`}>
                        {statusMap[record.status as keyof typeof statusMap]?.label || record.status}
                      </span>
                      {/* 2026-06-05: 强结后显示"已结束"角标 */}
                      {record.endTime && (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
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
                  {/* 操作列 sticky right-0 — 水平滚动时始终吸右可见（参照育苗列表） */}
                  <TableCell className="sticky right-0 px-4 py-3 bg-white hover:bg-gray-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)] z-10">
                    <div className="flex gap-1">
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
                      {!record.endTime && !record.isHarvestLocked && onEndV2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEndV2(record)}
                          title="采收"
                        >
                          {/* 2026-06-28: 图标改为 Package（与育苗管理"采收"图标一致） */}
                          <Package className="w-4 h-4" />
                        </Button>
                      )}
                      {/* 2026-06-28: 每日记录按钮（与育苗管理一致 — endTime 存在时隐藏） */}
                      {!record.endTime && onDailyRecord && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDailyRecord(record)}
                          title="每日记录"
                        >
                          <Calendar className="w-4 h-4 text-blue-600" />
                        </Button>
                      )}
                      {onLabelDetail && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onLabelDetail(record)}
                          title="标签详情"
                        >
                          <Tag className="w-4 h-4" />
                        </Button>
                      )}
                      {onMove && !record.isHarvest && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onMove(record)}
                          title="移入/移出"
                        >
                          <MoveRight className="w-4 h-4" />
                        </Button>
                      )}
                      {onMark && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onMark(record)}
                          title="标记管理"
                        >
                          <Bookmark className="w-4 h-4" />
                        </Button>
                      )}
                      {/* 2026-06-28：与育苗管理一致 — 正常结束 / 异常结束（放在标记管理图标后面） */}
                      {!record.endTime && !record.isHarvestLocked && onEnd && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEnd(record, 'normal')}
                            title="正常结束"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEnd(record, 'abnormal')}
                            title="异常结束"
                          >
                            <XCircle className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        {/* 编辑/删除/导出/打印模式下显示选择状态和全选按钮 */}
        {(operationMode === 'edit' || operationMode === 'delete' || exportMode || printMode) && (
          <div className="flex items-center gap-4">
            {onExportSelectAll && (
              <Button
                variant="link"
                size="sm"
                onClick={onExportSelectAll}
              >
                {selectedRows.length === data.length ? '全不选' : '全选'}
              </Button>
            )}
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
