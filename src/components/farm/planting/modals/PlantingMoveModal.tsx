/**
 * 种植调入/调出弹窗 V4
 *
 * 2026-07-23 改造要点：
 * - 移除种源参与：调入/调出仅在种植管理内不同区域之间互调（与调出对称）
 * - 调入模式：源订单下拉（其他同作物同品种种植单）+ 调出区域 + 目标区域（本行）
 * - 调出模式：保留 V3 UI，调出区域 + 目标订单 + 目标区域
 * - 后端 move_in.sourceType 固定为 'planting'，seed/seedling 已废弃
 */
import React, { useEffect, useState } from 'react';
import {
  Button,
  UnifiedModal,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Label,
  Input,
  TextArea,
  useToast,
} from '@/components/ui';
import {
  MovePlantingInputV2,
  movePlantingV2,
  getPlantingAreaStocks,
  PlantingAreaStock,
  PlantingLookupRow,
} from '@/services/apiPlantingService';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { Sprout, AlertCircle } from 'lucide-react';

interface PlantingMoveModalProps {
  isOpen: boolean;
  // 默认选中的订单（操作列点中的那行）；弹窗内可改成其他订单
  initialPlanting: any | null;
  // 所有可选订单（来自 usePlantingStore）
  availablePlantings: any[];
  onClose: () => void;
  // 弹窗内部已调 movePlantingV2，onSubmit 只用于通知父组件刷新
  onSubmit: (input: MovePlantingInputV2) => Promise<boolean | void> | void;
}

// 2026-07-23: SEED_FORM_OPTIONS 已移除 — 种源不再参与调入/调出
// （原用于调入时的形态过滤下拉）

/**
 * 2026-06-30 Bug 修复：英文错误信息 → 中文兜底映射
 * 后端 SQL 异常（如 "no such column"）会直接冒到前端，
 * 这里拦截并转成中文，避免英文错误信息直接显示给用户
 */
function localizeError(rawMsg: string): string {
  // 中英对照表（按精确匹配 + 关键字匹配）
  const exactMap: Record<string, string> = {
    'no such column: area_id': '调入失败：种源表缺少区域字段（已修复，请刷新重试）',
    'no such column': '调入失败：数据库字段缺失，请联系管理员',
    'SQLITE_ERROR': '调入失败：数据库操作异常',
  }
  for (const [en, zh] of Object.entries(exactMap)) {
    if (rawMsg.includes(en)) return zh
  }
  // 已含中文 → 原样显示；否则兜底
  if (/[一-龥]/.test(rawMsg)) return `操作失败：${rawMsg}`
  return `操作失败：${rawMsg}（如重复出现请联系管理员）`
}

export default function PlantingMoveModal({
  isOpen,
  initialPlanting,
  availablePlantings,
  onClose,
  onSubmit,
}: PlantingMoveModalProps) {
  const { toast } = useToast();

  // 操作类型 / 基础字段
  const [opType, setOpType] = useState<'move_in' | 'move_out'>('move_in');
  const [selectedPlantingId, setSelectedPlantingId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(0);
  const [operationDate, setOperationDate] = useState(todayLocal());
  const [remarks, setRemarks] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // 调入（源订单 + 调出区域 + 目标区域）
  // 2026-07-23: 移除种源参与；调入改为种植单对调（与调出对称）
  const [toAreaId, setToAreaId] = useState('');
  const [toAreaName, setToAreaName] = useState('');
  const [areaStocks, setAreaStocks] = useState<PlantingAreaStock[]>([]);
  const [sourcePlantings, setSourcePlantings] = useState<PlantingLookupRow[]>([]);
  const [sourcePlantingId, setSourcePlantingId] = useState('');
  const [sourceAreaStocks, setSourceAreaStocks] = useState<PlantingAreaStock[]>([]);
  // fromAreaId/fromAreaName 在调入/调出下都表示"调出区域"（扣减方），只是所属订单不同
  const [fromAreaId, setFromAreaId] = useState('');
  const [fromAreaName, setFromAreaName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);  // 弹窗内联错误条（不依赖 toast）

  // 调出
  const [targetPlantingId, setTargetPlantingId] = useState('');
  const [targetAreaName, setTargetAreaName] = useState('');
  // 2026-06-30: 调出模式 UI 重构 — 候选目标订单 + 目标区域 stocks
  const [targetPlantings, setTargetPlantings] = useState<PlantingLookupRow[]>([]);
  const [targetAreaStocks, setTargetAreaStocks] = useState<PlantingAreaStock[]>([]);

  // 弹窗打开时整体重置 + 初始化 selectedPlantingId
  useEffect(() => {
    if (isOpen && initialPlanting) {
      setOpType('move_in');
      setSelectedPlantingId(String(initialPlanting.id));
      setToAreaId('');
      setToAreaName('');
      setAreaStocks([]);
      // 2026-07-23: 调入源订单相关 state 重置
      setSourcePlantings([]);
      setSourcePlantingId('');
      setSourceAreaStocks([]);
      setQuantity(0);
      setOperationDate(todayLocal());
      setRemarks('');
      setFromAreaId('');
      setFromAreaName('');
      setTargetPlantingId('');
      setTargetAreaName('');
      setTargetPlantings([]);
      setTargetAreaStocks([]);
      setSubmitting(false);
      setErrorMessage(null);  // 2026-06-30 Bug 3：清空旧错误
    }
  }, [isOpen, initialPlanting]);

  // 拉取该订单的区域数量（弹窗打开 & 选了订单时）
  // 2026-07-23 源头修复后：移除主表兜底逻辑。创建种植单时已自动 INSERT area_stocks 初始记录，
  //                       历史数据已迁移。modal 直接读真实 area_stocks 数据。
  useEffect(() => {
    if (!isOpen || !selectedPlantingId) return;
    getPlantingAreaStocks(selectedPlantingId)
      .then((rows) => setAreaStocks(rows || []))
      .catch(() => setAreaStocks([]));
  }, [isOpen, selectedPlantingId]);

  // 用户改了 selectedPlantingId 后，调出模式下"调出区域"应该跟着新订单的主区域走
  useEffect(() => {
    if (!selectedPlantingId) return;
    const p = availablePlantings.find((x) => String(x.id) === String(selectedPlantingId));
    if (p && opType === 'move_out') {
      setFromAreaId(p.areaId || '');
      setFromAreaName(p.areaName || '');
    }
  }, [selectedPlantingId, opType, availablePlantings]);

  // 2026-06-30: 调出模式 — 选源订单后自动按其 cropName + cropVariety 筛候选目标订单（排除自己）
  // UI 简化：用户不需要输入 cropName 搜索，下拉直接显示同作物同品种候选
  // 注：直接用 availablePlantings 过滤（绕开后端 sql.js 对中文 LIKE 的兼容问题）
  useEffect(() => {
    if (!isOpen || opType !== 'move_out') return;
    if (!selectedPlantingId) {
      setTargetPlantings([]);
      return;
    }
    const source = availablePlantings.find((p) => String(p.id) === String(selectedPlantingId));
    if (!source?.cropName) {
      setTargetPlantings([]);
      return;
    }
    const candidates = availablePlantings
      .filter((p) =>
        String(p.id) !== String(selectedPlantingId) &&
        p.cropName === source.cropName &&
        // 品种一致（双方都有值时才校验，缺失则不限）
        (!source.cropVariety || !p.cropVariety || p.cropVariety === source.cropVariety)
      )
      .map((p) => ({
        id: String(p.id),
        plantCode: p.plantCode,
        cropName: p.cropName,
        cropVariety: p.cropVariety,
        cropCode: (p as any).cropCode || '',
        areaName: p.areaName,
      }));
    setTargetPlantings(candidates);
  }, [isOpen, opType, selectedPlantingId, availablePlantings]);

  // 2026-06-30: 调出模式 — 选目标订单后自动拉其 areaStocks 作为"目标区域"下拉
  // 2026-07-23 优化：单区域时自动选定（与调入模式对称），多区域时让用户选
  useEffect(() => {
    if (!isOpen || opType !== 'move_out') return;
    if (!targetPlantingId) {
      setTargetAreaStocks([]);
      return;
    }
    getPlantingAreaStocks(targetPlantingId)
      .then((rows) => {
        const safeRows = rows || [];
        setTargetAreaStocks(safeRows);
        // 单区域时自动选定（用户无需操作）
        if (safeRows.length === 1) {
          setToAreaId(safeRows[0].areaId);
          setToAreaName(safeRows[0].areaName);
        }
      })
      .catch(() => setTargetAreaStocks([]));
  }, [isOpen, opType, targetPlantingId]);

  // 2026-06-30 UI 调整：弹窗打开后自动默认选第一个目标区域（与列表显示对齐）
  // 优先选 planting.areaId 匹配的那个（与列表 COALESCE 显示一致），没有就选第一个
  useEffect(() => {
    if (!isOpen) return;
    if (areaStocks.length === 0) return;
    if (toAreaId) return;  // 已选过（含用户手动选）不覆盖
    const planting = availablePlantings.find(
      (p) => String(p.id) === String(selectedPlantingId)
    );
    const match =
      areaStocks.find((s) => s.areaId === planting?.areaId) || areaStocks[0];
    if (match) {
      setToAreaId(match.areaId);
      setToAreaName(match.areaName);
    }
  }, [isOpen, areaStocks, selectedPlantingId, availablePlantings, toAreaId]);

  // 2026-07-23: 调入模式 — 按本行订单的 cropName + cropVariety 筛候选源订单（排除自己）
  //            业务约束：同一区域内不会种植不同作物/品种
  //            与调出的 targetPlantings 效果完全对称，差异仅为 opType 守卫
  //            2026-07-23 合并：带出 plantingCount（迁移后 = Σ area_stocks 总和），用于下拉项显示"剩 X 株"
  useEffect(() => {
    if (!isOpen || opType !== 'move_in') return;
    if (!selectedPlantingId) {
      setSourcePlantings([]);
      return;
    }
    const cur = availablePlantings.find((p) => String(p.id) === String(selectedPlantingId));
    if (!cur?.cropName) {
      setSourcePlantings([]);
      return;
    }
    const candidates = availablePlantings
      .filter((p) =>
        String(p.id) !== String(selectedPlantingId) &&
        p.cropName === cur.cropName &&
        // 品种一致（双方都有值时才校验，缺失则不限）
        (!cur.cropVariety || !p.cropVariety || p.cropVariety === cur.cropVariety)
      )
      .map((p) => ({
        id: String(p.id),
        plantCode: p.plantCode,
        cropName: p.cropName,
        cropVariety: p.cropVariety,
        cropCode: (p as any).cropCode || '',
        areaName: p.areaName,
        // 数据迁移后主表 plantingCount === Σ area_stocks.quantity，可直接作为"剩余可调拨量"
        plantingCount: Number((p as any).plantingCount ?? 0),
      }));
    setSourcePlantings(candidates);
  }, [isOpen, opType, selectedPlantingId, availablePlantings]);

  // 2026-07-23: 调入模式 — 选源订单后自动拉其 areaStocks
  //            与调出的 targetAreaStocks 效果完全对称
  // 2026-07-23 源头修复后：移除主表兜底逻辑。创建种植单时已自动 INSERT area_stocks 初始记录，
  //                       历史数据已迁移。modal 直接读真实 area_stocks 数据，不再凭空虚拟。
  // 2026-07-23 合并优化：单区域时自动选定 fromArea（90% 场景），多区域时让用户选
  useEffect(() => {
    if (!isOpen || opType !== 'move_in') return;
    if (!sourcePlantingId) {
      setSourceAreaStocks([]);
      return;
    }
    getPlantingAreaStocks(sourcePlantingId)
      .then((rows) => {
        const safeRows = rows || [];
        setSourceAreaStocks(safeRows);
        // 单区域时自动选定（用户无需操作）
        if (safeRows.length === 1) {
          setFromAreaId(safeRows[0].areaId);
          setFromAreaName(safeRows[0].areaName);
        }
      })
      .catch(() => setSourceAreaStocks([]));
  }, [isOpen, opType, sourcePlantingId]);

  // 操作类型切换时清掉不相关的字段
  const handleOpTypeChange = (next: 'move_in' | 'move_out') => {
    setOpType(next);
    // 切换时清空来源/目标相关字段，避免旧状态污染
    setFromAreaId('');
    setFromAreaName('');
    setToAreaId('');
    setToAreaName('');
    setSourcePlantingId('');
    setSourceAreaStocks([]);
    setTargetPlantingId('');
    setTargetAreaStocks([]);
    setErrorMessage(null);
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    if (!selectedPlantingId) {
      setErrorMessage('请选择种植订单');
      return;
    }
    const targetRecord = availablePlantings.find(
      (x) => String(x.id) === String(selectedPlantingId)
    );
    if (!targetRecord) {
      setErrorMessage('所选订单不存在，请刷新后重试');
      return;
    }
    if (!quantity || quantity <= 0) {
      setErrorMessage(`请输入${opType === 'move_in' ? '调入' : '调出'}数量（必须 > 0）`);
      return;
    }

    if (opType === 'move_in') {
      // 2026-07-23: 调入改为种植单对调 — 校验源订单 + 调出区域 + 目标区域
      if (!sourcePlantingId) {
        setErrorMessage('请选择来源种植单');
        return;
      }
      if (!fromAreaId) {
        setErrorMessage('请选择调出区域');
        return;
      }
      if (!toAreaId) {
        setErrorMessage('请选择目标区域');
        return;
      }
      // 校验源 ≠ 目标（同区域同订单不可自调）
      if (sourcePlantingId === selectedPlantingId && fromAreaId === toAreaId) {
        setErrorMessage('调出区域与目标区域相同');
        return;
      }
      // 校验调出区域数量
      const sourceStock = sourceAreaStocks.find((s) => s.areaId === fromAreaId);
      if (sourceStock && quantity > sourceStock.quantity) {
        setErrorMessage(`调出区域当前只有 ${sourceStock.quantity} 株，不足 ${quantity} 株`);
        return;
      }
    } else {
      // move_out
      if (!fromAreaId) {
        setErrorMessage('请选择调出区域');
        return;
      }
      if (!targetPlantingId) {
        setErrorMessage('请选择目标订单（需同作物）');
        return;
      }
      if (!toAreaId) {
        setErrorMessage('请选择目标区域');
        return;
      }
      // 2026-06-30: 校验调出数量 ≤ 源 area_stocks
      const fromStock = areaStocks.find((s) => s.areaId === fromAreaId)
      if (fromStock && quantity > fromStock.quantity) {
        setErrorMessage(`调出数量超过调出区域数量 ${fromStock.quantity} ${fromStock.sourceCode || ''}`)
        return
      }
    }

    setSubmitting(true);
    try {
      if (opType === 'move_in') {
        // 2026-07-23: sourceType='planting' + fromAreaId/fromAreaName 为调出区域（源订单的扣减方）
        const sourcePlanting = sourcePlantings.find((p) => p.id === sourcePlantingId);
        const input: MovePlantingInputV2 = {
          operationType: 'move_in',
          toAreaId,
          toAreaName,
          fromAreaId,
          fromAreaName,
          quantity,
          operationDate,
          remarks,
          sourceType: 'planting',
          sourceId: sourcePlantingId,
          sourceCode: sourcePlanting?.plantCode || '',
        };
        await movePlantingV2(String(targetRecord.id), input);
        await showAlert(
          `调入成功：${sourcePlanting?.plantCode || ''} ${fromAreaName} → ${toAreaName}（${quantity} 株）`
        );
        await onSubmit(input);
      } else {
        // move_out：保留 V2 字段
        const input: MovePlantingInputV2 = {
          operationType: 'move_out',
          toAreaId,
          toAreaName,
          fromAreaId,
          fromAreaName,
          quantity,
          operationDate,
          remarks,
          targetPlantingId,
          targetAreaId: toAreaId,
          targetAreaName: toAreaName,
        };
        await movePlantingV2(String(targetRecord.id), input);
        await showAlert(`调出成功：${toAreaName}（${quantity} 株）`);
        await onSubmit(input);
      }
      onClose();
    } catch (e) {
      // 2026-07-10 P0-2 修复：catch(e) + narrowing 兼容 axios 风格错误
      const err = e as { message?: string; response?: { data?: { error?: string } } }
      // 2026-06-30 Bug 修复：英文错误信息转中文兜底
      // 后端 enhancedApiClient 抛错格式：{ error: '...', status: xxx } 或 axios 异常 message
      // 兼容：rawMessage 提取 → 中英对照表 → 兜底通用提示
      const rawMsg = String(err.response?.data?.error || err.message || '未知错误');
      const friendlyMsg = localizeError(rawMsg);
      setErrorMessage(friendlyMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={opType === 'move_in' ? '调入到种植订单' : '从种植订单调出'}
      size="md"
      width={884}
      height={860}
      showFooter
      footer={
        <div className="flex gap-3">
          <Button variant="secondary" onClick={onClose} disabled={submitting} className="flex-1">
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
            <Sprout className="w-4 h-4" /> 确认{opType === 'move_in' ? '调入' : '调出'}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {/* 2026-06-30 Bug 3 修复：内联错误条（不依赖 toast，toast 可能被 Modal 遮挡） */}
        {errorMessage && (
          <div className="flex items-start gap-2 px-3 py-2 bg-red-50 border border-red-300 rounded text-sm text-red-700">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 操作类型切换 */}
        <div>
          <Label>操作类型</Label>
          <div className="flex gap-4 mt-2">
            <Button
              size="default"
              className="text-base font-medium min-w-[80px]"
              variant={opType === 'move_in' ? 'default' : 'secondary'}
              onClick={() => handleOpTypeChange('move_in')}
            >
              调入
            </Button>
            <Button
              size="default"
              className="text-base font-medium min-w-[80px]"
              variant={opType === 'move_out' ? 'default' : 'secondary'}
              onClick={() => handleOpTypeChange('move_out')}
            >
              调出
            </Button>
          </div>
        </div>

        {/* 调入/调出订单 — 每行点开都是本行订单，固定展示，不可改；Label 随模式切换 */}
        <div>
          <Label>{opType === 'move_in' ? '调入订单' : '调出订单'}</Label>
          <div className="mt-1 px-3 py-2 text-sm border border-gray-300 bg-white rounded text-gray-900 h-10 flex items-center">
            {initialPlanting
              ? `${initialPlanting.plantCode} - ${initialPlanting.cropName}${initialPlanting.cropVariety ? `-${initialPlanting.cropVariety}` : ''} (${initialPlanting.areaName})`
              : '—'}
          </div>
        </div>

        {/* 目标区域：仅在调入模式下显示，固定展示本行的目标区域（含作物/品种/数量信息） */}
        {opType === 'move_in' && (
          <div>
            <Label>目标区域</Label>
            {areaStocks.length === 0 ? (
              <div className="mt-1 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                本订单暂无区域数量，请先确认订单区域信息
              </div>
            ) : (
              <div className="mt-1 px-3 py-2 text-sm border border-gray-300 bg-white rounded text-gray-900 flex items-center">
                {(() => {
                  const targetStock = areaStocks.find((s) => s.areaId === toAreaId) || areaStocks[0];
                  if (!targetStock) return '—';
                  const cropName = initialPlanting?.cropName || '';
                  const cropVariety = initialPlanting?.cropVariety || '';
                  const cropLabel = cropName + (cropVariety ? `-${cropVariety}` : '');
                  return (
                    <>
                      <span className="font-medium">{targetStock.areaName}</span>
                      <span className="ml-2 text-gray-600">
                        （{cropLabel} · 当前 {targetStock.quantity} 株{targetStock.quantity === 0 ? '（新区域）' : ''}）
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ============ 调入模式 ============ */}
        {/* 2026-07-23: 调入改为种植单对调 — 镜像调出结构（角色互换）
            调入：源订单(其他) → 调出区域 → 目标区域(本行)
            调出：调出区域(本行) → 目标订单(其他) → 目标区域 */}
        {opType === 'move_in' && (
          <>
            {/* 源订单：按本行 cropName + cropVariety 筛候选（排除自己）
                2026-07-23 修复：下拉项不再显示"剩 X 株"
                原因：plantingCount 是主表（创建总量，调入调出后不变），与调出区域的实际剩余会不一致。
                       真实剩余量由下方"调出区域"显示，单一数据源无歧义。 */}
            <div>
              <Label>源订单 *</Label>
              {sourcePlantings.length === 0 ? (
                <div className="mt-1 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                  未找到同作物同品种的其他种植订单
                </div>
              ) : (
                <Select
                  value={sourcePlantingId}
                  onValueChange={(v) => {
                    setSourcePlantingId(v);
                    setFromAreaId('');
                    setFromAreaName('');
                  }}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="选择同作物同品种的源订单" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourcePlantings.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.plantCode} - {p.cropName}{p.cropVariety ? `-${p.cropVariety}` : ''} ({p.areaName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 调出区域：选源订单后自动带出其 areaStocks
                2026-07-23 合并优化：
                - 单区域（90% 场景）：自动选定，静态展示，不再显示独立下拉
                - 多区域：保留独立下拉让用户选 */}
            {!sourcePlantingId ? (
              <div>
                <Label>调出区域</Label>
                <div className="mt-1 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                  请先选择源订单
                </div>
              </div>
            ) : sourceAreaStocks.length === 0 ? (
              <div>
                <Label>调出区域</Label>
                <div className="mt-1 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                  该源订单暂无区域数量
                </div>
              </div>
            ) : sourceAreaStocks.length === 1 ? (
              // 单区域：自动选定 + 静态展示（合并到源订单的简化体现）
              <div>
                <Label>调出区域</Label>
                <div className="mt-1 px-3 py-2 text-sm border border-gray-300 bg-white rounded text-gray-900 flex items-center">
                  <span className="font-medium">{sourceAreaStocks[0].areaName}</span>
                  <span className="ml-2 text-gray-600">（剩 {sourceAreaStocks[0].quantity} 株，已自动选定）</span>
                </div>
              </div>
            ) : (
              // 多区域：保留下拉选择
              <div>
                <Label>调出区域 *</Label>
                <Select
                  value={fromAreaId}
                  onValueChange={(v) => {
                    setFromAreaId(v);
                    const found = sourceAreaStocks.find((s) => s.areaId === v);
                    setFromAreaName(found?.areaName || '');
                  }}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="选择调出区域" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceAreaStocks.map((s) => (
                      <SelectItem key={s.areaId} value={s.areaId}>
                        {s.areaName}（剩 {s.quantity} 株）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </>
        )}

        {/* ============ 调出模式 ============ */}
        {opType === 'move_out' && (
          <>
            {/* 调出区域：取自源订单的 planting_area_stocks，下拉（自动默认选第一个） */}
            <div>
              <Label>调出区域 *</Label>
              {areaStocks.length === 0 ? (
                <div className="mt-1 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                  该订单暂无区域数量
                </div>
              ) : (
                <Select
                  value={fromAreaId}
                  onValueChange={(v) => {
                    setFromAreaId(v);
                    const found = areaStocks.find((s) => s.areaId === v);
                    setFromAreaName(found?.areaName || '');
                  }}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="选择调出区域" />
                  </SelectTrigger>
                  <SelectContent>
                    {areaStocks.map((s) => (
                      <SelectItem key={s.areaId} value={s.areaId}>
                        {s.areaName}（剩 {s.quantity}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 目标订单：按源订单 cropName 自动筛选同作物候选（已排除自己） */}
            <div>
              <Label>目标订单 *</Label>
              {targetPlantings.length === 0 ? (
                <div className="mt-1 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                  未找到同作物同品种的其他种植订单
                </div>
              ) : (
                <Select
                  value={targetPlantingId}
                  onValueChange={(v) => {
                    setTargetPlantingId(v);
                    setToAreaId('');
                    setToAreaName('');
                  }}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="选择同作物的目标订单" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetPlantings.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.plantCode} - {p.cropName}{p.cropVariety ? `-${p.cropVariety}` : ''} ({p.areaName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* 目标区域：选中目标订单后自动带出其 areaStocks
                2026-07-23 优化（与调入模式对称）：
                - 单区域（90% 场景）：自动选定 + 静态展示
                - 多区域：保留下拉让用户选 */}
            <div>
              <Label>目标区域</Label>
              {!targetPlantingId ? (
                <div className="mt-1 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                  请先选择目标订单
                </div>
              ) : targetAreaStocks.length === 0 ? (
                <div className="mt-1 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                  该目标订单暂无区域数量
                </div>
              ) : targetAreaStocks.length === 1 ? (
                // 单区域：自动选定 + 静态展示
                <div className="mt-1 px-3 py-2 text-sm border border-gray-300 bg-white rounded text-gray-900 flex items-center">
                  <span className="font-medium">{targetAreaStocks[0].areaName}</span>
                  <span className="ml-2 text-gray-600">
                    （已有 {targetAreaStocks[0].quantity} 株，已自动选定）
                  </span>
                </div>
              ) : (
                // 多区域：保留下拉
                <Select
                  value={toAreaId}
                  onValueChange={(v) => {
                    setToAreaId(v);
                    const found = targetAreaStocks.find((s) => s.areaId === v);
                    setToAreaName(found?.areaName || '');
                  }}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="选择目标区域" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetAreaStocks.map((s) => (
                      <SelectItem key={s.areaId} value={s.areaId}>
                        {s.areaName}（{s.quantity > 0 ? `已有 ${s.quantity} 株` : '0 株（新区域）'}）
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </>
        )}

        {/* ============ 公共字段 ============ */}
        <div>
          <Label>{opType === 'move_in' ? '调入数量' : '调出数量'} *</Label>
          <div className="mt-1 grid grid-cols-[1fr_120px] gap-2">
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={1}
            />
            <Input
              value={initialPlanting?.unit || '株'}
              readOnly
              className="bg-gray-100 cursor-not-allowed text-center"
              placeholder="单位"
              title="默认与调入订单的植株单位一致"
            />
          </div>
          {opType === 'move_in' && fromAreaId && (() => {
            const src = sourceAreaStocks.find((s) => s.areaId === fromAreaId);
            return src ? (
              <div className="text-xs text-gray-500 mt-1">
                （≤ {src.quantity} {initialPlanting?.unit || '株'}）
              </div>
            ) : null;
          })()}
        </div>
        <div>
          <Label>业务日期</Label>
          <Input
            type="date"
            value={operationDate}
            onChange={(e) => setOperationDate(e.target.value)}
          />
        </div>
        <div>
          <Label>备注</Label>
          <TextArea value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} />
        </div>
      </div>
    </UnifiedModal>
  );
}
