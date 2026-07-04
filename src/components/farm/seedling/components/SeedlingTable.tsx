/**
 * 育苗数据表格组件
 * 右上角按钮逻辑：编辑/删除/导出 → 需要选择记录后确认
 * 行内按钮逻辑：查看详情/每日记录/定植操作/打印/图片 → 直接执行
 */

import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Printer, Eye, Image, Download, Plus, Calendar, StopCircle, Tag, X, Package, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui';
import { Seedling, SeedlingStatus } from '../../../../types/crop';
import { CropVariety } from '../../../../types/crop';
import * as cropVarietyService from '../../../../services/apiCropVarietyService';
import { SEEDLING_STATUS_MAP } from '../../../../constants/cropConstants';
import { Input } from '@/components/ui';
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
  onPrint: (record: Seedling) => void;
  onLabelManage?: (record: Seedling) => void;
  onImageClick: (images: string[]) => void;
  // 结束相关回调
  onEnd: (record: Seedling) => void;
  // 2026-06-18: 任务 5 — 出圃入库回调
  onInbound?: (record: Seedling) => void;
  // 2026-07-04：无性繁殖记录回调（1:多模式可见）
  onPropagation?: (record: Seedling) => void;
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
  onPrint,
  onLabelManage,
  onImageClick,
  onEnd,
  onInbound,
  onPropagation,
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

  // 2026-07-04 v2：6 态对齐 PlantingStatus
  // 未知/孤儿值 fallback：「已出圃」（保留显示，避免空白）
  const statusMap: Record<string, { label: string; color: string }> = {
    [SeedlingStatus.SOWN]: { label: '已播种', color: 'text-blue-600 bg-blue-50' },
    [SeedlingStatus.IN_PROGRESS]: { label: '生长中', color: 'text-amber-600 bg-amber-50' },
    [SeedlingStatus.TRANSPLANT_READY]: { label: '待出圃', color: 'text-emerald-600 bg-emerald-50' },
    [SeedlingStatus.COMPLETED]: { label: '已出圃', color: 'text-green-600 bg-green-50' },
    [SeedlingStatus.CANCELLED]: { label: '已取消', color: 'text-gray-600 bg-gray-100' },
    [SeedlingStatus.ABNORMAL]: { label: '异常', color: 'text-red-600 bg-red-50' },
    // 历史孤儿值兼容（不应再出现，但安全网）
    transplanted: { label: '已出圃', color: 'text-green-600 bg-green-50' },
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

  // 2026-06-27：去掉 overflow-hidden，否则会截断内部 overflow-x-auto 的水平滚动条
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
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
                <X className="w-4 h-4" />
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
                <X className="w-4 h-4" />
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
                <X className="w-4 h-4" />
                取消
              </Button>
            </>
          ) : printMode ? (
            /* 打印模式 */
            <>
              <span className="text-sm text-gray-500 mr-2">已选择 {selectedRows.length} 项</span>
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
                <X className="w-4 h-4" />
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
                  variant="purple"
                  size="sm"
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

      {/* 表格 — 2026-06-27：固定宽度 2400px + 强制横向滚动条
    容器 1022px → 表格 2400px → 溢出 1378px 出滚动条
    数值列 8% × 2400 = 192px（够 4-5 中文字符 + 千位数字）
    关键列 9-10% = 216-240px（够 13 字符单据号） */}
      <div className="overflow-x-auto" style={{ overflowX: 'auto', width: '100%' }}>
        <table
          style={{ width: '2400px', tableLayout: 'fixed', minWidth: '2400px' }}
          className="text-sm"
        >
          {/* 2026-07-01 修复：colgroup 内联写法 — 去除行内 {/} 与 JSX 注释，避免 validateDOMNesting
              Whitespace text nodes cannot appear as a child of <colgroup> 警告
              列宽分配：基本 8%+5%+6%+10%+9%+6%+9%+7%+4%=64%；数值 4 列×8%=32%；完成6%；状态5%；操作14% — 总和 121% 触发横向滚动 */}
          <colgroup><>{showCheckbox && <col className="w-[2.5%]" />}<col className="w-[8%]" /><col className="w-[5%]" /><col className="w-[6%]" /><col className="w-[10%]" /><col className="w-[9%]" /><col className="w-[6%]" /><col className="w-[9%]" /><col className="w-[7%]" /><col className="w-[4%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[6%]" /><col className="w-[5%]" /><col className="w-[14%]" /></></colgroup>
          {/* thead 正常布局（不 sticky，避免和操作列 sticky 冲突） */}
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showCheckbox && (
                <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">
                  选择
                </th>
              )}
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">育苗批号</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">繁殖模式</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">关联生产计划</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">关联种源</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">作物编码</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">作物品种</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">品种路径</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">育苗区域</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">单位</th>
              {/* ===== 母株池（4 列） — 蓝色半透明背景标识 ===== */}
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-indigo-500/30" title="母株池初始数量（建档时投入）">初始数量</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-indigo-500/30" title="母株池当前存活数">母株存活数</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-indigo-500/30" title="母株池累计损耗">母株累计损耗</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-indigo-500/30" title="母株池累计补栽">补苗累计</th>
              {/* ===== 小苗池（5 列） — 绿色半透明背景标识 ===== */}
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-emerald-500/30" title="小苗池累计产出">小苗累计产出</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-emerald-500/30" title="小苗池累计损耗">小苗累计损耗</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-emerald-500/30" title="小苗池剩余 = 产出 - 损耗 - 采收入库（2026-06-28 移除已定植统计）">小苗剩余数量</th>
              {/* ===== 派生 ===== */}
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">目标成苗数</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap" title="完成比例 = (小苗累计产出 − 小苗累计损耗) / 目标成苗数">完成比例</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">状态</th>
              {/* 操作列 sticky right-0 — 水平滚动时始终吸右可见（不设 z-index，避免脱离 thead） */}
              <th className="sticky right-0 px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-blue-700 shadow-[-2px_0_4px_rgba(0,0,0,0.15)]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={showCheckbox ? 21 : 20} className="px-4 py-8 text-center text-gray-500">
                  暂无数据
                </td>
              </tr>
            ) : (
              currentData.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  {showCheckbox && (
                    <td className="px-2 py-1.5 text-center">
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
                    </td>
                  )}
                  <td className="px-2 py-1.5 text-xs text-center">
                    <Button
                      variant="link"
                      size="sm"
                      onClick={() => onDetail(record)}
                      title="点击查看详情"
                    >
                      {record.seedlingCode}
                    </Button>
                  </td>
                  <td className="px-2 py-1.5 text-xs text-center whitespace-nowrap">
                    {(() => {
                      // 2026-06-15: 数量体系重构 — 6 模式 → 2 模式
                      const mode = record.propagationMode || 'one_to_one';
                      const map: Record<string, {label:string, color:string}> = {
                        one_to_one:   {label:'1:1', color:'bg-blue-100 text-blue-700'},
                        one_to_many:  {label:'1:多', color:'bg-pink-100 text-pink-700'},
                      };
                      const m = map[mode] || map.one_to_one;
                      return <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${m.color}`}>{m.label}</span>;
                    })()}
                  </td>
                  <td className="px-2 py-1.5 text-sm text-gray-600 text-center whitespace-nowrap truncate" title={record.productionPlanCode || ''}>
                    {record.productionPlanCode ? (
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-xs font-medium">
                        {record.productionPlanCode}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-sm text-gray-700 text-center truncate" title={record.sourceCode || ''}>{record.sourceCode}</td>
                  <td className="px-2 py-1.5 text-xs text-center">
                    <span className="font-mono text-orange-600 truncate inline-block max-w-full" title={getStandardCropCode(record) || ''}>{getStandardCropCode(record) || '-'}</span>
                  </td>
                  <td className="px-2 py-1.5 text-sm text-gray-900 text-center truncate" title={record.cropVariety || record.cropName}>
                    {/* 作物品种列：从品种库获取最细化名称 */}
                    {getCropVarietyName(record)}
                  </td>
                  <td className="px-2 py-1.5 text-sm text-gray-600 text-center whitespace-nowrap overflow-hidden text-ellipsis">
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
                  <td className="px-2 py-1.5 text-sm text-gray-700 text-center whitespace-nowrap">{record.siteName}</td>
                  <td className="px-2 py-1.5 text-sm text-gray-600 text-center whitespace-nowrap">{record.unit || '株'}</td>
                  {/* ===== 母株池（4 列） — 与 thead bg-indigo-500/30 对应 ===== */}
                  {/* 初始数量 = seedlingQuantity（建档时投入） */}
                  <td className="px-2 py-1.5 text-sm text-gray-700 text-center whitespace-nowrap bg-indigo-50/30">
                    {(record.initialCount || 0).toLocaleString()}
                  </td>
                  {/* 母株存活数 = motherPlantCount */}
                  <td className="px-2 py-1.5 text-sm text-gray-700 text-center whitespace-nowrap bg-indigo-50/30">
                    {(record.motherPlantCount || 0).toLocaleString()}
                  </td>
                  {/* 母株累计损耗 = motherLossCount（1:1 模式恒 0） */}
                  <td className="px-2 py-1.5 text-sm text-red-500 font-medium text-center bg-indigo-50/30">
                    {(record.motherLossCount || 0).toLocaleString()}
                  </td>
                  {/* 补苗累计 = replantCount */}
                  <td className="px-2 py-1.5 text-sm text-emerald-600 font-medium text-center bg-indigo-50/30">
                    {(record.replantCount || 0).toLocaleString()}
                  </td>
                  {/* ===== 小苗池（5 列） — 与 thead bg-emerald-500/30 对应 ===== */}
                  {/* 小苗累计产出 = expandedPlantCount */}
                  <td className="px-2 py-1.5 text-sm text-emerald-600 font-medium text-center bg-emerald-50/30">
                    {(record.expandedPlantCount || 0).toLocaleString()}
                  </td>
                  {/* 小苗累计损耗 = seedlingLossCount */}
                  <td className="px-2 py-1.5 text-sm text-red-500 font-medium text-center bg-emerald-50/30">
                    {(record.seedlingLossCount || 0).toLocaleString()}
                  </td>
                  {/* 小苗剩余数量 = expanded - loss - harvest（2026-06-28：彻底移除已定植/自动定植统计，业务上种植管理不再从育苗管理取苗） */}
                  <td className="px-2 py-1.5 text-sm text-emerald-700 font-medium text-center bg-emerald-50/30">
                    {(() => {
                      const expanded = record.expandedPlantCount || 0;
                      const loss = record.seedlingLossCount || 0;
                      const harvest = record.harvestStockedCount || 0;
                      const remaining = Math.max(0, expanded - loss - harvest);
                      return remaining.toLocaleString();
                    })()}
                  </td>
                  {/* ===== 派生 ===== */}
                  {/* 目标成苗数 = targetSurvivalCount */}
                  <td className="px-2 py-1.5 text-sm text-gray-500 text-center">
                    {(record.targetSurvivalCount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-center whitespace-nowrap">
                    {/* 2026-06-28: 完成比例 = (累计产出 - 累计损耗) / 目标成苗数
                          扣损耗反映"实际可用苗数"对目标的达成率，避免已死苗数虚增完成度 */}
                    {record.targetSurvivalCount && record.targetSurvivalCount > 0 ? (() => {
                      const expanded = Math.max(0, record.expandedPlantCount || 0);
                      const loss = Math.max(0, record.seedlingLossCount || 0);
                      const available = Math.max(0, expanded - loss);
                      const ratio = available / record.targetSurvivalCount;
                      return (
                        <span className={`font-medium ${
                          ratio >= 0.8 ? 'text-green-600' : ratio >= 0.5 ? 'text-amber-600' : 'text-red-600'
                        }`}>
                          {Math.round(Math.max(0, Math.min(ratio, 9.99)) * 100)}%
                        </span>
                      );
                    })() : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-center whitespace-nowrap">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusMap[record.status]?.color || statusMap.transplanted.color}`}>
                        {statusMap[record.status]?.label || statusMap.transplanted.label}
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
                  </td>
                  {/* 操作列 sticky right-0 — 水平滚动时始终吸右可见（不设 z-index） */}
                  <td className="sticky right-0 px-2 py-1.5 text-xs text-center bg-white hover:bg-gray-50 shadow-[-2px_0_4px_rgba(0,0,0,0.05)]">
                    {/* 2026-07-03 v2：写读分离 — 写操作在结束态灰显+禁用（保留补录例外），读操作（每日记录/标签/图片）始终可用
                        正常结束(status=completed 或 endType=normal) → 写操作全锁；读操作可用；补录关闭
                        异常结束(status=abnormal 或 endType=abnormal) → 写操作全锁（除补录）；读操作可用；补录保留
                        进行中 → 全部可用 */}
                    {(() => {
                      const isNormalEnded = record.status === 'completed' || record.endType === 'normal'
                      const isAbnormalEnded = record.status === 'abnormal' || record.endType === 'abnormal'
                      const isEnded = isNormalEnded || isAbnormalEnded
                      const lockReason = isNormalEnded ? '已正常结束，禁止编辑/新增' : '已异常结束，禁止编辑/新增'
                      const writeClass = 'text-gray-400 cursor-not-allowed opacity-40'
                      const guardClick = (msg: string, action?: () => void) => {
                        // 仅在"正常结束"或"被显式禁用的写操作"时弹提示；异常结束的写操作可正常通过
                        if (isNormalEnded) {
                          showAlert(msg)
                          return
                        }
                        action?.()
                      }
                      return (
                        <div className="flex gap-1 justify-center">
                          {/* 读操作 — 始终可用 */}
                          {record.pictures && record.pictures.length > 0 && (
                            <Button variant="ghost" size="icon" onClick={() => onImageClick(record.pictures)} title="查看图片">
                              <Image className="w-4 h-4" />
                            </Button>
                          )}
                          {onDailyRecord && (
                            <Button variant="ghost" size="icon" onClick={() => onDailyRecord(record)} title={`每日记录${isEnded ? '（只读）' : ''}`}>
                              <Calendar className={`w-4 h-4 ${isEnded ? 'text-blue-400' : 'text-blue-600'}`} />
                            </Button>
                          )}
                          {/* 2026-07-04：无性繁殖记录 — 1:多模式可见，结束态变只读 */}
                          {onPropagation && record.propagationMode === 'one_to_many' && (
                            <Button variant="ghost" size="icon" onClick={() => onPropagation(record)} title={`无性繁殖记录${isEnded ? '（只读）' : ''}`}>
                              <GitBranch className={`w-4 h-4 ${isEnded ? 'text-emerald-400' : 'text-emerald-600'}`} />
                            </Button>
                          )}
                          {onLabelManage && (
                            <Button variant="ghost" size="icon" onClick={() => onLabelManage(record)} title={`标签管理${isEnded ? '（只读）' : ''}`}>
                              <Tag className="w-4 h-4" />
                            </Button>
                          )}

                          {/* 写操作 — 结束态灰显+禁用 */}
                          {onEdit && (
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => guardClick(lockReason, () => onEdit(record))}
                              disabled={isEnded}
                              className={isEnded ? writeClass : ''}
                              title={isEnded ? lockReason : '编辑'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                          )}
                          {/* 出圃入库（onInbound）：进行中 + 异常结束都显示（补录标识） */}
                          {onInbound && !record.isHarvestLocked && (
                            <Button
                              variant="ghost" size="icon"
                              onClick={() => onInbound(record)}
                              className={isAbnormalEnded
                                ? 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                : 'text-orange-500 hover:text-orange-600 hover:bg-orange-50'}
                              title={isAbnormalEnded ? '出圃入库（补录）' : '出圃入库 / 采收'}
                            >
                              <Package className="w-4 h-4" />
                            </Button>
                          )}
                          {/* 结束按钮：仅进行中显示 */}
                          {!isEnded && onEnd && (
                            <Button variant="ghost" size="icon" onClick={() => onEnd(record)} title="结束">
                              <StopCircle className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      )
                    })()}
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
          pageSizeOptions={[10, 20, 50, 100]}
          showPageSize
        />
      </div>
    </div>
  );
}
