/**
 * 种植调入/调出弹窗 V3
 *
 * 改造要点（2026-06-30）：
 * - 移除来源类型 seed/seedling 单选（固定为 seed，与种源页面统一）
 * - 调入模式：目标区域下拉（取自 planting_area_stocks）+ 来源种源搜索（作物品种名 + 形态过滤 + 5 列表格）
 * - 调出模式：保留基本 UI，仅做小幅调整
 * - 后端契约 MovePlantingInputV2 完全保留
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
} from '@/services/apiPlantingService';
import {
  lookupAvailableSeedSources,
  SeedSourceLookupRow,
} from '@/services/apiSeedSourceService';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import { Sprout } from 'lucide-react';

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

// 形态选项（与 seed_sources.seed_form / inventory_stock.source_form 枚举保持一致）
const SEED_FORM_OPTIONS = [
  '全部',
  '果实',
  '种子',
  '种苗',
  '穗条',
  '枝条',
  '块根',
  '块茎',
  '鳞茎',
  '叶片',
  '花朵',
  '整株',
  '其他',
];

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

  // 调入（目标区域 + 种源搜索 + 选中行）
  const [toAreaId, setToAreaId] = useState('');
  const [toAreaName, setToAreaName] = useState('');
  const [areaStocks, setAreaStocks] = useState<PlantingAreaStock[]>([]);
  const [sourceCropName, setSourceCropName] = useState('');
  const [sourceSeedForm, setSourceSeedForm] = useState(''); // '' = 全部
  const [seedSources, setSeedSources] = useState<SeedSourceLookupRow[]>([]);
  const [selectedSource, setSelectedSource] = useState<SeedSourceLookupRow | null>(null);
  const [sourceLoading, setSourceLoading] = useState(false);

  // 调出
  const [fromAreaId, setFromAreaId] = useState('');
  const [fromAreaName, setFromAreaName] = useState('');
  const [targetPlantingId, setTargetPlantingId] = useState('');
  const [targetAreaName, setTargetAreaName] = useState('');

  // 弹窗打开时整体重置 + 初始化 selectedPlantingId
  useEffect(() => {
    if (isOpen && initialPlanting) {
      setOpType('move_in');
      setSelectedPlantingId(String(initialPlanting.id));
      setToAreaId('');
      setToAreaName('');
      setAreaStocks([]);
      setSourceCropName('');
      setSourceSeedForm('');
      setSeedSources([]);
      setSelectedSource(null);
      setQuantity(0);
      setOperationDate(todayLocal());
      setRemarks('');
      setFromAreaId(initialPlanting.areaId || '');
      setFromAreaName(initialPlanting.areaName || '');
      setTargetPlantingId('');
      setTargetAreaName('');
      setSubmitting(false);
    }
  }, [isOpen, initialPlanting]);

  // 拉取该订单的区域库存（弹窗打开 & 选了订单时）
  // 2026-06-30 Bug 修复：planting_area_stocks 表为空时，从 plantings 主表兜底
  // 原因：新建种植订单不写 planting_area_stocks（只写 plantings.area_id/area_name），
  //       但列表用 COALESCE 兜底显示，新订单在调入弹窗里"看不到"区域，导致无法调入
  useEffect(() => {
    if (!isOpen || !selectedPlantingId) return;
    getPlantingAreaStocks(selectedPlantingId)
      .then((rows) => {
        if (rows && rows.length > 0) {
          setAreaStocks(rows);
        } else {
          // 兜底：从 plantings 主表取 areaId/areaName 作为虚拟区域
          const planting = availablePlantings.find(
            (p) => String(p.id) === String(selectedPlantingId)
          );
          if (planting?.areaId) {
            setAreaStocks([
              {
                id: 'fallback',
                areaId: planting.areaId,
                areaName: planting.areaName || planting.areaId,
                quantity: Number(planting.plantingCount) || 0,
                sourceType: 'initial',
                sourceId: null,
                sourceCode: null,
              },
            ]);
          } else {
            setAreaStocks([]);
          }
        }
      })
      .catch(() => setAreaStocks([]));
  }, [isOpen, selectedPlantingId, availablePlantings]);

  // 用户改了 selectedPlantingId 后，调出模式下"调出区域"应该跟着新订单的主区域走
  useEffect(() => {
    if (!selectedPlantingId) return;
    const p = availablePlantings.find((x) => String(x.id) === String(selectedPlantingId));
    if (p && opType === 'move_out') {
      setFromAreaId(p.areaId || '');
      setFromAreaName(p.areaName || '');
    }
  }, [selectedPlantingId, opType, availablePlantings]);

  // 种源搜索 debounce 300ms
  useEffect(() => {
    if (opType !== 'move_in') return;
    const timer = setTimeout(() => {
      setSourceLoading(true);
      lookupAvailableSeedSources({
        cropName: sourceCropName.trim() || undefined,
        seedForm: sourceSeedForm || undefined,
      })
        .then((rows) => setSeedSources(rows || []))
        .catch(() => setSeedSources([]))
        .finally(() => setSourceLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [opType, sourceCropName, sourceSeedForm]);

  // 操作类型切换时清掉不相关的字段
  const handleOpTypeChange = (next: 'move_in' | 'move_out') => {
    setOpType(next);
    // 切换到调出时，清空种源选择
    if (next === 'move_out') {
      setSelectedSource(null);
    }
  };

  const handleSubmit = async () => {
    if (!selectedPlantingId) {
      await showAlert('请选择种植订单');
      return;
    }
    const targetRecord = availablePlantings.find(
      (x) => String(x.id) === String(selectedPlantingId)
    );
    if (!targetRecord) {
      await showAlert('所选订单不存在，请刷新后重试');
      return;
    }
    if (quantity <= 0) {
      toast.error('数量必须 > 0');
      return;
    }

    if (opType === 'move_in') {
      if (!toAreaId) {
        toast.error('请选择目标区域');
        return;
      }
      if (!selectedSource) {
        toast.error('请选择来源种源批号');
        return;
      }
      if (quantity > selectedSource.remainingQuantity) {
        toast.error(
          `数量超过种源可用库存 ${selectedSource.remainingQuantity} ${selectedSource.unit || ''}`
        );
        return;
      }
    } else {
      // move_out
      if (!targetPlantingId) {
        toast.error('请选择目标订单');
        return;
      }
      if (!toAreaId) {
        toast.error('请选择目标区域');
        return;
      }
    }

    setSubmitting(true);
    try {
      if (opType === 'move_in') {
        const input: MovePlantingInputV2 = {
          operationType: 'move_in',
          toAreaId,
          toAreaName,
          quantity,
          operationDate,
          remarks,
          sourceType: 'seed', // V3: 固定为 seed（前端不再允许 seedling）
          sourceId: selectedSource!.id,
          sourceCode: selectedSource!.sourceCode,
        };
        await movePlantingV2(String(targetRecord.id), input);
        await showAlert(
          `调入成功：${toAreaName}（${quantity} ${selectedSource!.unit || ''}）`
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
    } catch (e: any) {
      toast.error(`操作失败：${e?.message || '未知错误'}`);
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
      width={680}
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
        {/* 操作类型切换 */}
        <div>
          <Label>操作类型</Label>
          <div className="flex gap-2 mt-1">
            <Button
              size="sm"
              variant={opType === 'move_in' ? 'default' : 'secondary'}
              onClick={() => handleOpTypeChange('move_in')}
            >
              调入
            </Button>
            <Button
              size="sm"
              variant={opType === 'move_out' ? 'default' : 'secondary'}
              onClick={() => handleOpTypeChange('move_out')}
            >
              调出
            </Button>
          </div>
        </div>

        {/* 调入/调出订单 — 可改 Select */}
        <div>
          <Label>调入/调出订单</Label>
          <Select value={selectedPlantingId} onValueChange={setSelectedPlantingId}>
            <SelectTrigger className="border-gray-300">
              <SelectValue placeholder="选择种植订单" />
            </SelectTrigger>
            <SelectContent>
              {availablePlantings.map((p) => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.plantCode} - {p.cropName} ({p.areaName})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* ============ 调入模式 ============ */}
        {opType === 'move_in' && (
          <>
            {/* 目标区域：取自该订单的 planting_area_stocks，下拉 */}
            <div>
              <Label>目标区域 *</Label>
              {areaStocks.length === 0 ? (
                <div className="mt-1 px-3 py-2 text-sm text-gray-500 border border-dashed border-gray-300 rounded">
                  该订单暂无区域库存，请先去库存页登记
                </div>
              ) : (
                <Select
                  value={toAreaId}
                  onValueChange={(v) => {
                    setToAreaId(v);
                    const found = areaStocks.find((s) => s.areaId === v);
                    setToAreaName(found?.areaName || '');
                  }}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue placeholder="选择区域" />
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

            {/* 来源类型：固定显示（V3：移除 seedling 单选） */}
            <div>
              <Label>来源类型</Label>
              <div className="mt-1 px-3 py-2 text-sm border border-gray-200 bg-gray-50 rounded text-gray-700">
                种源（种源页面）
              </div>
            </div>

            {/* 来源种源搜索 */}
            <div>
              <Label>搜索来源批号</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <Input
                  value={sourceCropName}
                  onChange={(e) => setSourceCropName(e.target.value)}
                  placeholder="作物品种名（如 葡萄）"
                />
                <Select
                  value={sourceSeedForm || '全部'}
                  onValueChange={(v) => setSourceSeedForm(v === '全部' ? '' : v)}
                >
                  <SelectTrigger className="border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEED_FORM_OPTIONS.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 种源列表 5 列 */}
            <div>
              <Label>可用种源</Label>
              <div className="mt-1 border border-gray-200 rounded overflow-hidden">
                <div className="grid grid-cols-[40px_1fr_1fr_1fr_80px_80px] bg-gray-50 text-xs text-gray-600 px-2 py-1.5">
                  <div className="text-center">选</div>
                  <div>批号</div>
                  <div>作物</div>
                  <div>品种</div>
                  <div className="text-right">可用</div>
                  <div>形态</div>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {sourceLoading ? (
                    <div className="px-2 py-3 text-sm text-gray-500 text-center">加载中…</div>
                  ) : seedSources.length === 0 ? (
                    <div className="px-2 py-3 text-sm text-gray-500 text-center">
                      {sourceCropName || sourceSeedForm
                        ? '未找到符合该条件的种源'
                        : '请输入作物品种名筛选'}
                    </div>
                  ) : (
                    seedSources.map((row) => {
                      const checked = selectedSource?.id === row.id;
                      return (
                        <label
                          key={row.id}
                          className={`grid grid-cols-[40px_1fr_1fr_1fr_80px_80px] px-2 py-1.5 text-sm border-t border-gray-100 cursor-pointer hover:bg-blue-50 ${
                            checked ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="text-center">
                            <input
                              type="radio"
                              checked={checked}
                              onChange={() => setSelectedSource(row)}
                              className="cursor-pointer"
                            />
                          </div>
                          <div className="truncate">{row.sourceCode}</div>
                          <div className="truncate">{row.cropName}</div>
                          <div className="truncate">{row.cropVariety}</div>
                          <div className="text-right">
                            {row.remainingQuantity} {row.unit}
                          </div>
                          <div>{row.seedForm || '-'}</div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 选中行展示 */}
              {selectedSource && (
                <div className="mt-2 text-xs text-gray-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                  选中：{selectedSource.sourceCode} — {selectedSource.cropName}（
                  {selectedSource.cropVariety}）— 剩余 {selectedSource.remainingQuantity}{' '}
                  {selectedSource.unit}
                </div>
              )}
            </div>
          </>
        )}

        {/* ============ 调出模式 ============ */}
        {opType === 'move_out' && (
          <>
            <div>
              <Label>调出区域</Label>
              <Input value={fromAreaName} disabled />
            </div>
            <div>
              <Label>目标订单 *</Label>
              <Input
                value={targetPlantingId}
                onChange={(e) => setTargetPlantingId(e.target.value)}
                placeholder="目标种植订单 ID"
              />
            </div>
            <div>
              <Label>目标区域 *</Label>
              <Input
                value={toAreaName}
                onChange={(e) => {
                  setToAreaName(e.target.value);
                  setToAreaId(e.target.value);
                }}
                placeholder="如：二棚 > 01区"
              />
            </div>
          </>
        )}

        {/* ============ 公共字段 ============ */}
        <div>
          <Label>数量 *</Label>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            min={1}
          />
          {opType === 'move_in' && selectedSource && (
            <div className="text-xs text-gray-500 mt-1">
              （≤ {selectedSource.remainingQuantity} {selectedSource.unit}）
            </div>
          )}
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
