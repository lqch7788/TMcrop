/**
 * 育苗数据表格组件
 * 右上角按钮逻辑：编辑/删除/导出 → 需要选择记录后确认
 * 行内按钮逻辑：查看详情/每日记录/定植操作/打印/图片 → 直接执行
 */

import React, { useEffect, useState } from 'react';
import { Edit2, Trash2, Printer, Image, Download, Plus, Calendar, StopCircle, Tag, X, Package, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui';
import { ActionIconButton } from '@/components/ui';
import { Tooltip } from '@/components/ui';
import { Seedling, SeedlingStatus } from '../../../../types/crop';
import { CropVariety } from '../../../../types/cropVariety';
import * as cropVarietyService from '../../../../services/apiCropVarietyService';
import { SEEDLING_STATUS_MAP } from '../../../../constants/cropConstants';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Pagination } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import {
  getMotherAliveCount,
  getSeedlingRemainingCount,
  isOneToOneMode,
  getMotherLossDisplayCount,
  getMotherAliveFormula,
  getMotherLossFormula,
} from '@/lib/seedlingPool';

/**
 * 表头列说明（2026-10-17 统一）
 * 虚线+问号标记，鼠标悬浮显示该列的计算公式与口径说明。
 * 使用 portal 模式：表头位于 overflow-x-auto 容器内，普通绝对定位会被容器裁剪
 * （边缘列的提示只显示一半）；portal 挂到 body + fixed 定位后不再被裁剪。
 */
function HeaderHint({ label, maxWidth = 260, children }: {
  label: string;
  maxWidth?: number;
  children: React.ReactNode;
}) {
  return (
    <Tooltip position="bottom" multiline maxWidth={maxWidth} portal content={children}>
      <span className="cursor-help border-b border-dotted border-white/50">
        {label}<span className="text-[10px] opacity-70 ml-0.5 align-super">?</span>
      </span>
    </Tooltip>
  );
}

// 操作模式类型（用于批量操作）
// 2026-10-11：与 SeedlingPage 的 operationMode state 联合对齐（原缺 detail/dailyRecord/image，
//   页面类型是这些值的超集 → 传参报 TS2322）。与 PlantingTable 的同名联合保持一致口径。
type SeedlingOperationMode = 'normal' | 'detail' | 'edit' | 'dailyRecord' | 'print' | 'image' | 'delete' | 'export';

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
  onExportClick?: () => void;  // 2026-07-19 P2-fix：点击"导出"按钮的入口（SeedlingPage.handleExportClick 同时设 exportMode + operationMode）
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
  onExportClick,
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
    [SeedlingStatus.ABNORMAL]: { label: '异常结束', color: 'text-red-600 bg-red-50' },
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
              {/* 2026-07-26：工具栏"编辑"按钮移除，保留行内编辑 */}
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
                  // 2026-07-19 P2-fix：调 onExportClick（SeedlingPage.handleExportClick 同时设 exportMode + operationMode）
                  // 旧版只 setOperationMode('export') → exportMode 保持 false → "确认导出"按钮不显示
                  onClick={() => onExportClick ? onExportClick() : onOperationModeChange('export')}
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

      {/* 表格 — 2026-06-27：固定宽度 + 强制横向滚动条（2026-08-14 新增"已入库数量"列 → 2400px → 2600px）
    容器 1022px → 表格 2600px → 溢出 1578px 出滚动条
    数值列 8% × 2600 ≈ 208px（够 4-5 中文字符 + 千位数字）
    关键列 9-10% = 234-260px（够 13 字符单据号） */}
      <div className="overflow-x-auto" style={{ overflowX: 'auto', width: '100%' }}>
        <table
          style={{ width: '2600px', tableLayout: 'fixed', minWidth: '2600px' }}
          className="text-sm"
        >
          {/* 2026-07-01 修复：colgroup 内联写法 — 去除行内 {/} 与 JSX 注释，避免 validateDOMNesting
              Whitespace text nodes cannot appear as a child of <colgroup> 警告
              2026-08-14：新增"已入库数量"列（8%），插在"小苗剩余数量"与"目标成苗数"之间
              列宽分配：基本 8%+5%+6%+10%+9%+6%+9%+7%+4%=64%；数值 5 列×8%=40%；完成6%；状态5%；操作14% — 总和 129% 触发横向滚动 */}
          <colgroup><>{showCheckbox && <col className="w-[2.5%]" />}<col className="w-[8%]" /><col className="w-[5%]" /><col className="w-[6%]" /><col className="w-[10%]" /><col className="w-[9%]" /><col className="w-[6%]" /><col className="w-[9%]" /><col className="w-[7%]" /><col className="w-[4%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[8%]" /><col className="w-[6%]" /><col className="w-[5%]" /><col className="w-[14%]" /></></colgroup>
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
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-indigo-500/30">
                <HeaderHint label="初始数量">
                  <>
                    <div className="font-semibold mb-1">初始数量</div>
                    <div>建档时投入的数量（1:1＝播种/嫁接数；1:多＝母株数）</div>
                    <div className="mt-1">存活 = 初始 + 补苗 − 损耗累计</div>
                  </>
                </HeaderHint>
              </th>
              {/* 2026-10-17：1:1 模式下"苗即母株"，标题改为两种模式都成立的说法 + 悬浮说明口径 */}
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-indigo-500/30">
                <HeaderHint label="母株/植株存活数">
                  <>
                    <div className="font-semibold mb-1">存活数的两种口径</div>
                    <div>1:多：母株 + 补苗 − 母株损耗</div>
                    <div>1:1：初始 + 补苗 − 损耗（苗即母株）</div>
                  </>
                </HeaderHint>
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-indigo-500/30">
                <HeaderHint label="母株/植株累计损耗">
                  <>
                    <div className="font-semibold mb-1">损耗累计的两种口径</div>
                    <div>1:多：母株死亡/减少累计</div>
                    <div>1:1：植株死亡累计（含历史"小苗损耗"数据）</div>
                  </>
                </HeaderHint>
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-indigo-500/30">
                <HeaderHint label="补苗累计">
                  <>
                    <div className="font-semibold mb-1">补苗累计</div>
                    <div>每日记录登记的补苗总数（1:1＝补种子；1:多＝补母株）</div>
                    <div className="mt-1">计入存活：存活 = 初始 + 补苗 − 损耗累计</div>
                  </>
                </HeaderHint>
              </th>
              {/* ===== 小苗池（4 列） — 绿色半透明背景标识 ===== */}
              {/* 2026-10-17 列序调整：按"收→支→余"排 —— 累计产出（毛）→ 累计损耗 → 剩余数量（净）→ 已入库 */}
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-emerald-500/30">
                {/* 列名回归真实含义 —— 该列值是"累计产出"（毛值），与「小苗剩余数量」（净值）职责不同 */}
                <HeaderHint label="小苗累计产出" maxWidth={280}>
                  <>
                    <div className="font-semibold mb-1">小苗累计产出的两种口径</div>
                    <div>1:多：匍匐茎/组培/扦插等每日新增的累计产出（毛值，不扣损耗与入库）</div>
                    <div>1:1：无小苗产出池（苗即母株），不适用；当前可用数量见「小苗剩余数量」</div>
                  </>
                </HeaderHint>
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-emerald-500/30">
                <HeaderHint label="小苗累计损耗">
                  <>
                    <div className="font-semibold mb-1">小苗累计损耗</div>
                    <div>1:多：小苗池累计损耗（每日记录累加）</div>
                    <div>1:1：不适用（损耗计入「母株/植株累计损耗」）</div>
                    <div className="mt-1">剩余 = 产出 − 损耗 − 已入库</div>
                  </>
                </HeaderHint>
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-emerald-500/30">
                <HeaderHint label="小苗剩余数量">
                  <>
                    <div className="font-semibold mb-1">小苗剩余数量</div>
                    <div>1:多：产出 − 小苗损耗 − 已入库</div>
                    <div>1:1：存活 − 已入库（单池）</div>
                    <div className="mt-1">用途：出圃入库的可用上限</div>
                  </>
                </HeaderHint>
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-emerald-500/30">
                <HeaderHint label="已入库数量">
                  <>
                    <div className="font-semibold mb-1">已入库数量</div>
                    <div>通过「出圃入库/采收」累计入库的小苗总量</div>
                    <div className="mt-1">入库后不再计入「小苗剩余数量」</div>
                  </>
                </HeaderHint>
              </th>
              {/* ===== 派生 ===== */}
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">
                <HeaderHint label="目标成苗数" maxWidth={220}>
                  <>
                    <div className="font-semibold mb-1">目标成苗数</div>
                    <div>生产计划设定的目标数量，是「完成比例」的分母</div>
                  </>
                </HeaderHint>
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">
                <HeaderHint label="完成比例" maxWidth={240}>
                  <>
                    <div className="font-semibold mb-1">完成比例</div>
                    <div>已完成 = 已入库数量 ÷ 目标成苗数</div>
                    <div className="mt-1">≥80% 绿 / ≥50% 黄 / &lt;50% 红</div>
                  </>
                </HeaderHint>
              </th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap">状态</th>
              {/* 操作列 sticky right-0 — 水平滚动时始终吸右可见（不设 z-index，避免脱离 thead） */}
              <th className="sticky right-0 px-2 py-2 text-center text-xs font-semibold text-white whitespace-nowrap bg-blue-700 shadow-[-2px_0_4px_rgba(0,0,0,0.15)]">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {currentData.length === 0 ? (
              <tr>
                <td colSpan={showCheckbox ? 22 : 21} className="px-4 py-8 text-center text-gray-500">
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
                  {/* 母株/植株存活数（2026-10-17：真存活 = 母株 + 补苗 − 损耗；1:1 另扣历史小苗损耗）
                      单元格悬浮显示该行的具体算式，用户可当场对账 */}
                  <td className="px-2 py-1.5 text-sm text-gray-700 text-center whitespace-nowrap bg-indigo-50/30"
                      title={getMotherAliveFormula(record)}>
                    {getMotherAliveCount(record).toLocaleString()}
                  </td>
                  {/* 母株/植株累计损耗（2026-10-17：1:1 把历史小苗损耗并入，使"存活 = 初始 + 补苗 − 损耗"两模式同式） */}
                  <td className="px-2 py-1.5 text-sm text-red-500 font-medium text-center bg-indigo-50/30"
                      title={getMotherLossFormula(record)}>
                    {getMotherLossDisplayCount(record).toLocaleString()}
                  </td>
                  {/* 补苗累计 = replantCount */}
                  <td className="px-2 py-1.5 text-sm text-emerald-600 font-medium text-center bg-indigo-50/30">
                    {(record.replantCount || 0).toLocaleString()}
                  </td>
                  {/* ===== 小苗池（4 列） — 与 thead bg-emerald-500/30 对应（2026-10-17 列序：产出 → 损耗 → 剩余 → 已入库） ===== */}
                  {/* 小苗累计产出（2026-10-17：1:1 无产出池 → 显示 —；当前可用数量在「小苗剩余数量」列） */}
                  {isOneToOneMode(record) ? (
                    <td className="px-2 py-1.5 text-sm text-gray-400 text-center bg-emerald-50/30"
                        title="1:1 模式：苗即母株，无独立小苗产出池；当前可用数量见「小苗剩余数量」列">
                      —
                    </td>
                  ) : (
                    <td className="px-2 py-1.5 text-sm text-emerald-600 font-medium text-center bg-emerald-50/30"
                        title="1:多 模式：小苗产出池累计产出（毛值，每日记录累加）">
                      {(record.expandedPlantCount || 0).toLocaleString()}
                    </td>
                  )}
                  {/* 小苗累计损耗（2026-10-17：1:1 单池化后该值已并入「母株/植株累计损耗」，此处显示 — 避免重复计数） */}
                  {isOneToOneMode(record) ? (
                    <td className="px-2 py-1.5 text-sm text-gray-400 text-center bg-emerald-50/30"
                        title="1:1 模式下损耗已统一计入「母株/植株累计损耗」">
                      —
                    </td>
                  ) : (
                    <td className="px-2 py-1.5 text-sm text-red-500 font-medium text-center bg-emerald-50/30"
                        title="1:多 模式：小苗池累计损耗">
                      {(record.seedlingLossCount || 0).toLocaleString()}
                    </td>
                  )}
                  {/* 小苗剩余数量（2026-10-17 单池化：1:1 镜像母株池；1:多 = 产出 − 损耗 − 已入库） */}
                  <td className="px-2 py-1.5 text-sm text-emerald-700 font-medium text-center bg-emerald-50/30"
                      title={isOneToOneMode(record) ? '1:1 模式：小苗即母株，剩余 = 母株池可用 − 已入库' : '1:多 模式：产出 − 小苗损耗 − 已入库'}>
                    {getSeedlingRemainingCount(record).toLocaleString()}
                  </td>
                  {/* 已入库数量 = harvestStockedCount（2026-08-14 新增列，由采收入库弹窗入库累加） */}
                  <td className="px-2 py-1.5 text-sm text-emerald-600 font-medium text-center bg-emerald-50/30">
                    {(record.harvestStockedCount || 0).toLocaleString()}
                  </td>
                  {/* ===== 派生 ===== */}
                  {/* 目标成苗数 = targetSurvivalCount */}
                  <td className="px-2 py-1.5 text-sm text-gray-500 text-center">
                    {(record.targetSurvivalCount ?? 0).toLocaleString()}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-center whitespace-nowrap">
                    {/* 2026-08-14: 完成比例 = 已入库数量 / 目标成苗数
                          以实际入库量衡量目标达成度（原公式 (累计产出-累计损耗)/目标 已于 2026-08-14 废弃） */}
                    {record.targetSurvivalCount && record.targetSurvivalCount > 0 ? (() => {
                      const stocked = Math.max(0, record.harvestStockedCount || 0);
                      const ratio = stocked / record.targetSurvivalCount;
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
                    {/* 2026-07-03 v2：写读分离 — 写操作在结束态灰显+禁用，读操作（每日记录/标签/图片）始终可用
                        正常结束(status=completed 或 endType=normal) → 写操作全锁；读操作可用
                        异常结束(status=abnormal 或 endType=abnormal) → 写操作全锁；读操作可用
                        已取消(status=cancelled) → 写操作全锁；读操作可用
                        进行中 → 全部可用 */}
                    {(() => {
                      const isNormalEnded = record.status === 'completed' || record.endType === 'normal'
                      const isAbnormalEnded = record.status === 'abnormal' || record.endType === 'abnormal'
                      const isCancelled = record.status === 'cancelled'
                      const isEnded = isNormalEnded || isAbnormalEnded || isCancelled
                      const lockReason = isCancelled ? '已取消，禁止编辑/新增' : isNormalEnded ? '已正常结束，禁止编辑/新增' : '已异常结束，禁止编辑/新增'
                      const writeClass = 'text-gray-400 cursor-not-allowed opacity-40'
                      const guardClick = (msg: string, action?: () => void) => {
                        // 正常结束/已取消 → 弹提示并阻止；异常结束 → 写操作可正常通过
                        if (isNormalEnded || isCancelled) {
                          showAlert(msg)
                          return
                        }
                        action?.()
                      }
                      return (
                        <div className="flex gap-1 justify-center">
                          {/* 读操作 — 始终可用 */}
                          {record.pictures && record.pictures.length > 0 && (
                            <ActionIconButton
                              variant="view"
                              icon={<Image className="w-4 h-4" />}
                              onClick={() => onImageClick(record.pictures)}
                              title="查看图片"
                            />
                          )}
                          {onDailyRecord && (
                            <ActionIconButton
                              variant="record"
                              icon={<Calendar className="w-4 h-4" />}
                              onClick={() => onDailyRecord(record)}
                              title={`每日记录${isEnded ? '（只读）' : ''}`}
                              className={isEnded ? 'text-blue-400' : ''}
                            />
                          )}
                          {/* 2026-07-04：无性繁殖记录 — 1:多模式可见，结束态变只读 */}
                          {onPropagation && record.propagationMode === 'one_to_many' && (
                            <ActionIconButton
                              variant="breeding"
                              icon={<GitBranch className="w-4 h-4" />}
                              onClick={() => onPropagation(record)}
                              title={`繁殖记录${isEnded ? '（只读）' : ''}`}
                              className={isEnded ? 'text-emerald-400' : ''}
                            />
                          )}
                          {onLabelManage && (
                            <ActionIconButton
                              variant="tag"
                              icon={<Tag className="w-4 h-4" />}
                              onClick={() => onLabelManage(record)}
                              title={`标签管理${isEnded ? '（只读）' : ''}`}
                            />
                          )}

                          {/* 写操作 — 结束态灰显+禁用 */}
                          {onEdit && (
                            <ActionIconButton
                              variant="edit"
                              icon={<Edit2 className="w-4 h-4" />}
                              onClick={() => guardClick(lockReason, () => onEdit(record))}
                              disabled={isEnded}
                              className={isEnded ? writeClass : ''}
                              title={isEnded ? lockReason : '编辑'}
                            />
                          )}
                          {/* 出圃入库（onInbound）：进行中+异常结束可用+已取消可查看
                              注：育苗表无 is_harvest_locked 列（该软锁仅种植有），原 !record.isHarvestLocked 恒为 true，故移除 */}
                          {onInbound && (
                            <ActionIconButton
                              variant="harvest"
                              icon={<Package className="w-4 h-4" />}
                              onClick={() => onInbound(record)}
                              className={isAbnormalEnded
                                ? 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                                : isCancelled
                                ? 'text-gray-400 hover:text-gray-500 hover:bg-gray-50'
                                : ''}
                              title={isAbnormalEnded ? '出圃入库' : isCancelled ? '出圃入库（已取消，仅查看）' : '出圃入库 / 采收'}
                            />
                          )}
                          {/* 2026-07-09 v5（方案 A 阶段一）：单态结束按钮 — 仅进行中显示 */}
                          {!isEnded && onEnd && (
                            <ActionIconButton
                              variant="end"
                              icon={<StopCircle className="w-4 h-4" />}
                              onClick={() => onEnd(record)}
                              title="结束"
                            />
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
