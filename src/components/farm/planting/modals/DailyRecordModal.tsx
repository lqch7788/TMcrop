/**
 * 种植管理每日记录弹窗（2026-06-28）
 *
 * 与育苗管理 DailyRecordModal 的差异：
 * - 种植只有 1 个池（活体剩余 = plantingCount + supplementCount - lossCount）
 * - 数量统计简化为 2 个字段：lossChange（损耗）、supplementChange（补栽）
 * - 无母株/小苗双池逻辑
 * - 校验：损耗 ≤ 当前活体剩余；补栽无上限
 *
 * 功能：新增 / 编辑 / 删除 / 导出 每日记录
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Planting, PlantingDailyRecord } from '../../../../types/crop';
import { useDictionaryStore, getDictItems, usePlantingStore } from '../../../../stores';
import { getPlantingDailyRecords } from '../../../../services/apiPlantingDailyRecordService';
import { Input } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Button } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { showAlert, showConfirm } from '@/lib/dialogService';
import {
  WATERING_METHOD_MAP,
  WATERING_UNIT_MAP,
  FEED_UNIT_MAP,
} from '@/constants/cropConstants';
import { FeedRecordCard, type FeedRecordItem } from '@/components/farm/seedling/modals/FeedRecordCard';
import { Edit2, Trash2, Download, X, Check, Lock } from 'lucide-react';

import { exportPlantingDailyRecordsToExcel } from '../../../../services/excelExportService';

interface DailyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Planting;
  // 2026-07-03：只读模式（已结束的记录）— 禁用所有写操作，保留查看+导出
  readOnly?: boolean;
}

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function DailyRecordModal({ isOpen, onClose, onSuccess, record, readOnly }: DailyRecordModalProps) {
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);
  const addDailyRecord = usePlantingStore((state) => state.addDailyRecord);
  const updateDailyRecord = usePlantingStore((state) => state.updateDailyRecord);
  const deleteDailyRecord = usePlantingStore((state) => state.deleteDailyRecord);

  const [refreshKey, setRefreshKey] = useState(0);
  const [dailyRecords, setDailyRecords] = useState<PlantingDailyRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 拉取每日记录历史
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const list = await getPlantingDailyRecords(String(record.id));
      setDailyRecords(list || []);
    } catch (error) {
      setDailyRecords([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [record.id]);

  useEffect(() => {
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [dictionaries.length, loadDictionaries]);

  useEffect(() => {
    if (isOpen) {
      void loadHistory();
    }
  }, [isOpen, refreshKey, loadHistory]);

  const latestDailyRecords = useMemo(() => {
    void refreshKey;
    return dailyRecords;
  }, [dailyRecords, refreshKey]);

  const handleSuccess = () => {
    setRefreshKey((k) => k + 1);
    onSuccess?.();
  };

  // 施肥/用药子表辅助函数（与育苗 DailyRecordModal 一致）
  const genFeedId = (prefix: 'fr' | 'pr') =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const makeEmptyFeedRecord = (mode: 'fertilizer' | 'pesticide'): FeedRecordItem => ({
    id: genFeedId(mode === 'fertilizer' ? 'fr' : 'pr'),
    name: '',
    category: mode === 'fertilizer' ? 'foliar' : 'fungicide',
    amount: undefined,
    unit: 'g',
    dilution: undefined,
    dilutionType: 'dilute',
    applicationMethod: 'spray',
    notes: '',
    ...(mode === 'pesticide' ? { safetyInterval: undefined, targetPest: '' } : {}),
  });
  const handleAddFertilizer = () => {
    setFormData((prev) => ({
      ...prev,
      fertilizerRecords: [makeEmptyFeedRecord('fertilizer'), ...(prev.fertilizerRecords || [])],
    }));
  };
  const handleAddPesticide = () => {
    setFormData((prev) => ({
      ...prev,
      pesticideRecords: [makeEmptyFeedRecord('pesticide'), ...(prev.pesticideRecords || [])],
    }));
  };
  const handleUpdateFertilizer = (idx: number, next: FeedRecordItem) => {
    setFormData((prev) => ({
      ...prev,
      fertilizerRecords: (prev.fertilizerRecords || []).map((r, i) => (i === idx ? next : r)),
    }));
  };
  const handleUpdatePesticide = (idx: number, next: FeedRecordItem) => {
    setFormData((prev) => ({
      ...prev,
      pesticideRecords: (prev.pesticideRecords || []).map((r, i) => (i === idx ? next : r)),
    }));
  };
  const handleRemoveFertilizer = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      fertilizerRecords: (prev.fertilizerRecords || []).filter((_, i) => i !== idx),
    }));
  };
  const handleRemovePesticide = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      pesticideRecords: (prev.pesticideRecords || []).filter((_, i) => i !== idx),
    }));
  };

  const OPERATORS = useMemo(() => {
    return getDictItems('operator').map((d) => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

  const [formData, setFormData] = useState({
    recordDate: todayLocal(),
    temperature: undefined as number | undefined,
    humidity: undefined as number | undefined,
    watering: false,
    wateringMethod: undefined as string | undefined,
    wateringAmount: undefined as number | undefined,
    wateringUnit: 'L' as string | undefined,
    fertilizerRecords: [] as FeedRecordItem[],
    pesticideRecords: [] as FeedRecordItem[],
    abnormality: '',
    // 2026-06-28：种植单池 — 只有损耗/补栽 2 个字段
    lossChange: undefined as number | undefined,
    supplementChange: undefined as number | undefined,
    remarks: '',
    phValue: undefined as number | undefined,
    ecValue: undefined as number | undefined,
    operator: '',
  });

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Partial<PlantingDailyRecord>>({});

  // 计算当前活体剩余（实时预览）
  const currentAvailable = useMemo(() => {
    return Math.max(
      0,
      (record.plantingCount || 0) +
        (record.supplementCount || 0) -
        (record.lossCount || 0)
    );
  }, [record.plantingCount, record.supplementCount, record.lossCount]);

  const handleSubmit = async () => {
    if (!formData.recordDate) {
      await showAlert('请选择记录日期');
      return;
    }

    const lc = formData.lossChange || 0;
    const rc = formData.supplementChange || 0;

    // 严格校验：损耗 ≤ 当前活体剩余
    if (lc > currentAvailable) {
      await showAlert(
        `损耗数量 ${lc} 超过当前活体剩余 ${currentAvailable} 株（种植 ${record.plantingCount || 0} + 补栽 ${record.supplementCount || 0} − 损耗 ${record.lossCount || 0}）`
      );
      return;
    }
    if (lc < 0) {
      await showAlert('损耗数量不能为负数');
      return;
    }

    try {
      const hasWatering = !!(formData.wateringMethod || formData.wateringAmount != null);
      const bizData: any = {
        temperature: formData.temperature,
        humidity: formData.humidity,
        watering: hasWatering,
        wateringMethod: hasWatering ? formData.wateringMethod : undefined,
        wateringAmount: hasWatering ? formData.wateringAmount : undefined,
        wateringUnit: hasWatering ? formData.wateringUnit : undefined,
        fertilizerRecords: (formData.fertilizerRecords || [])
          .filter((r) => r.name && r.amount && r.amount > 0)
          .map((r) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            amount: r.amount,
            unit: r.unit,
            dilution: r.dilution,
            dilutionType: r.dilutionType,
            applicationMethod: r.applicationMethod,
            notes: r.notes || undefined,
          })),
        pesticideRecords: (formData.pesticideRecords || [])
          .filter((r) => r.name && r.amount && r.amount > 0)
          .map((r) => ({
            id: r.id,
            name: r.name,
            category: r.category,
            amount: r.amount,
            unit: r.unit,
            dilution: r.dilution,
            dilutionType: r.dilutionType,
            applicationMethod: r.applicationMethod,
            safetyInterval: r.safetyInterval,
            targetPest: r.targetPest || undefined,
            notes: r.notes || undefined,
          })),
        abnormality: formData.abnormality || undefined,
        // 核心：2 个数量变化字段（后端自动累加到 plantings 主表）
        lossChange: lc,
        supplementChange: rc,
        phValue: formData.phValue,
        ecValue: formData.ecValue,
        operator: formData.operator || undefined,
      };
      const result = await addDailyRecord(String(record.id), {
        recordDate: formData.recordDate,
        data: bizData,
        remarks: formData.remarks || undefined,
      } as any);
      if (!result) {
        await showAlert('添加记录失败，请重试');
        return;
      }
      // 重置表单
      setFormData({
        recordDate: todayLocal(),
        temperature: undefined,
        humidity: undefined,
        watering: false,
        wateringMethod: undefined,
        wateringAmount: undefined,
        wateringUnit: 'L',
        fertilizerRecords: [],
        pesticideRecords: [],
        abnormality: '',
        lossChange: undefined,
        supplementChange: undefined,
        remarks: '',
        phValue: undefined,
        ecValue: undefined,
        operator: '',
      });
    } catch (error) {
      // 2026-08-14：显示具体失败原因（后端校验文案如"损耗超过当前活体剩余"等）
      const msg = (error as Error)?.message || '未知错误';
      await showAlert(`添加记录失败：${msg}`);
      return;
    }

    handleSuccess();
  };

  // 编辑逻辑（与育苗一致：只挑业务字段，data JSON 已展开）
  const BUSINESS_FIELDS = [
    'recordDate', 'temperature', 'humidity', 'watering',
    'wateringMethod', 'wateringAmount', 'wateringUnit',
    'fertilizerRecords', 'pesticideRecords',
    'abnormality',
    'lossChange', 'supplementChange',
    'phValue', 'ecValue', 'operator', 'remarks',
  ] as const;

  const handleStartEdit = (r: PlantingDailyRecord) => {
    setEditingId(r.id);
    const cleanRow: Partial<PlantingDailyRecord> = {};
    BUSINESS_FIELDS.forEach((k) => {
      if (r[k] !== undefined) {
        (cleanRow as any)[k] = r[k];
      }
    });
    setEditingRow(cleanRow);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingRow({});
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    if (!editingRow.recordDate) {
      await showAlert('请选择记录日期');
      return;
    }
    try {
      const data = editingRow.data && typeof editingRow.data === 'object'
        ? editingRow.data
        : (() => {
            const biz: any = {};
            ['temperature', 'humidity', 'watering', 'abnormality',
             'lossChange', 'supplementChange',
             'phValue', 'ecValue', 'operator'].forEach((k) => {
              if (editingRow[k as keyof PlantingDailyRecord] !== undefined) {
                biz[k] = editingRow[k as keyof PlantingDailyRecord];
              }
            });
            return biz;
          })();
      const payload: any = {
        recordDate: editingRow.recordDate,
        data,
        remarks: editingRow.remarks,
      };
      const success = await updateDailyRecord(record.id, editingId, payload);
      if (!success) {
        await showAlert('更新记录失败，请重试');
        return;
      }
      setEditingId(null);
      setEditingRow({});
      handleSuccess();
    } catch (error) {
      // 2026-08-14：显示具体失败原因（后端校验文案等）
      const msg = (error as Error)?.message || '未知错误';
      await showAlert(`更新记录失败：${msg}`);
    }
  };

  const handleDelete = async (r: PlantingDailyRecord) => {
    const confirmed = await showConfirm(`确定要删除 ${r.recordDate} 的这条记录吗？`);
    if (!confirmed) return;
    try {
      const success = await deleteDailyRecord(record.id, r.id);
      if (!success) {
        await showAlert('删除记录失败，请重试');
        return;
      }
      handleSuccess();
    } catch (error) {
      // 2026-08-14：显示具体失败原因（后端校验文案等）
      const msg = (error as Error)?.message || '未知错误';
      await showAlert(`删除记录失败：${msg}`);
    }
  };

  // 导出（调用 service 层函数）
  const handleExport = () => {
    if (latestDailyRecords.length === 0) {
      void showAlert('没有记录可导出');
      return;
    }
    exportPlantingDailyRecordsToExcel(record, latestDailyRecords);
  };

  // 渲染可编辑单元格
  const renderEditableCell = (r: PlantingDailyRecord, field: keyof PlantingDailyRecord, value: any) => {
    if (editingId === r.id) {
      if (field === 'watering') {
        return (
          <Input
            type="checkbox"
            checked={editingRow.watering || false}
            onChange={(e) => setEditingRow({ ...editingRow, watering: e.target.checked })}
            className="w-5 h-5"
          />
        );
      }
      if (field === 'recordDate') {
        return (
          <Input
            type="date"
            value={editingRow.recordDate || ''}
            onChange={(e) => setEditingRow({ ...editingRow, recordDate: e.target.value })}
            className="w-full px-1 py-0.5 text-xs border border-gray-400 rounded"
          />
        );
      }
      return (
        <Input
          type="number"
          value={editingRow[field as keyof PlantingDailyRecord] ?? ''}
          onChange={(e) =>
            setEditingRow({
              ...editingRow,
              [field]: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          className="w-full px-1 py-0.5 text-xs border border-gray-400 rounded"
        />
      );
    }
    if (field === 'watering') return r.watering ? '✓' : '✗';
    if (field === 'lossChange' && value !== undefined) {
      return <span className="text-red-600">+{value}</span>;
    }
    if (field === 'supplementChange' && value !== undefined) {
      return <span className="text-emerald-600">+{value}</span>;
    }
    if (value === undefined || value === null || value === '') return '-';
    if (field === 'temperature') return `${value}℃`;
    if (field === 'humidity') return `${value}%`;
    return value;
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`每日记录 - ${record.plantCode || record.id}`}
      size="xxxl"
      showFooter={true}
      onSubmit={readOnly ? onClose : handleSubmit}
      submitText={readOnly ? '关闭' : '添加记录'}
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 2026-07-03：只读模式横幅（已结束的记录） */}
        {readOnly && (
          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-600 shrink-0" />
            <span className="text-sm text-gray-700">该种植已结束，每日记录处于<strong>只读模式</strong>（可查看、导出）</span>
          </div>
        )}
        {/* 添加新记录 */}
        {!readOnly && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">添加新记录</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-gray-700">记录日期 <span className="text-red-500">*</span></Label>
              <DatePicker
                className="w-full"
                selected={formData.recordDate ? new Date(formData.recordDate) : undefined}
                onChange={(date) => setFormData({ ...formData, recordDate: todayLocal(date) })}
              />
            </div>
            <div>
              <Label className="text-gray-700">操作人员</Label>
              <Select
                value={formData.operator}
                onValueChange={(val) => setFormData({ ...formData, operator: val })}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择操作人员" />
                </SelectTrigger>
                <SelectContent>
                  {OPERATORS.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700">异常情况</Label>
              <Input
                type="text"
                value={formData.abnormality}
                onChange={(e) => setFormData({ ...formData, abnormality: e.target.value })}
                placeholder="无异常请留空"
                className={deepInputClass}
              />
            </div>

            {/* 环境参数折叠面板 */}
            <details className="md:col-span-3 border border-blue-100 rounded-lg bg-blue-50/20 overflow-hidden" open>
              <summary className="cursor-pointer select-none px-3 py-2 bg-blue-50/50 hover:bg-blue-50 text-sm font-semibold text-blue-800 flex items-center justify-between">
                <span>▼ 环境参数（温度/湿度/pH/EC — 4 项）</span>
                <span className="text-xs text-blue-600 font-normal">
                  {formData.temperature != null ? `${formData.temperature}℃` : '-'}
                  {' / '}
                  {formData.humidity != null ? `${formData.humidity}%` : '-'}
                  {' / pH '}{formData.phValue ?? '-'}
                  {' / EC '}{formData.ecValue ?? '-'}
                </span>
              </summary>
              <div className="p-3 grid grid-cols-4 gap-3">
                <div>
                  <Label className="text-gray-700">温度（℃）</Label>
                  <Input
                    type="number"
                    value={formData.temperature || ''}
                    onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                    placeholder="如：25"
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-700">湿度（%）</Label>
                  <Input
                    type="number"
                    value={formData.humidity || ''}
                    onChange={(e) => setFormData({ ...formData, humidity: Number(e.target.value) })}
                    placeholder="如：65"
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-700">pH值</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.phValue ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phValue: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="如：6.5"
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-700">EC值（mS/cm）</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.ecValue ?? ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ecValue: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    placeholder="如：2.0"
                    className={deepInputClass}
                  />
                </div>
              </div>
            </details>

            {/* 浇水折叠面板 */}
            <details
              className="md:col-span-3 border border-cyan-100 rounded-lg bg-cyan-50/20 overflow-hidden"
              open={!!(formData.wateringMethod || formData.wateringAmount != null)}
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-cyan-50/50 hover:bg-cyan-50 text-sm font-semibold text-cyan-800 flex items-center justify-between">
                <span>▼ 浇水（{(formData.wateringMethod || formData.wateringAmount != null) ? '已填写' : '未填写'}）</span>
                <span className="text-xs text-cyan-700 font-normal">
                  {formData.wateringMethod
                    ? `${WATERING_METHOD_MAP[formData.wateringMethod] || formData.wateringMethod}`
                    : ''}
                  {formData.wateringAmount != null
                    ? ` / ${formData.wateringAmount}${WATERING_UNIT_MAP[formData.wateringUnit as string] || formData.wateringUnit || ''}`
                    : ''}
                </span>
              </summary>
              <div className="p-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700">浇水方式</Label>
                  <Select
                    value={formData.wateringMethod || 'spray'}
                    onValueChange={(v) => setFormData({ ...formData, wateringMethod: v })}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="选择浇水方式（可选）" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(WATERING_METHOD_MAP).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-700">浇水量</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.1"
                      value={formData.wateringAmount ?? ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wateringAmount: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      placeholder="如：5（可选）"
                      className={`${deepInputClass} flex-1`}
                    />
                    <Select
                      value={formData.wateringUnit || 'L'}
                      onValueChange={(v) => setFormData({ ...formData, wateringUnit: v })}
                    >
                      <SelectTrigger className={`${deepInputClass} w-24`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(WATERING_UNIT_MAP).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </details>

            {/* 施肥折叠面板 */}
            <details
              className="md:col-span-3 border border-emerald-100 rounded-lg bg-emerald-50/20 overflow-hidden"
              open={(formData.fertilizerRecords?.length || 0) > 0}
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-emerald-50/50 hover:bg-emerald-50 text-sm font-semibold text-emerald-800 flex items-center justify-between">
                <span>▼ 施肥（{(formData.fertilizerRecords?.length || 0)} 种）</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddFertilizer();
                  }}
                  className="text-xs px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
                >
                  + 添加
                </button>
              </summary>
              <div className="p-3 space-y-2">
                {(formData.fertilizerRecords?.length || 0) === 0 ? (
                  <div className="text-center py-3 text-xs text-gray-500">
                    暂无施肥记录 — 点击「+ 添加」记录
                  </div>
                ) : (
                  formData.fertilizerRecords!.map((rec, idx) => (
                    <FeedRecordCard
                      key={rec.id}
                      mode="fertilizer"
                      value={rec}
                      onChange={(next) => handleUpdateFertilizer(idx, next)}
                      onRemove={() => handleRemoveFertilizer(idx)}
                    />
                  ))
                )}
              </div>
            </details>

            {/* 用药折叠面板 */}
            <details
              className="md:col-span-3 border border-red-100 rounded-lg bg-red-50/20 overflow-hidden"
              open={(formData.pesticideRecords?.length || 0) > 0}
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-red-50/50 hover:bg-red-50 text-sm font-semibold text-red-800 flex items-center justify-between">
                <span>▼ 用药（{(formData.pesticideRecords?.length || 0)} 种）</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    handleAddPesticide();
                  }}
                  className="text-xs px-2 py-1 rounded bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  + 添加
                </button>
              </summary>
              <div className="p-3 space-y-2">
                {(formData.pesticideRecords?.length || 0) === 0 ? (
                  <div className="text-center py-3 text-xs text-gray-500">
                    暂无用药记录 — 点击「+ 添加」记录
                  </div>
                ) : (
                  formData.pesticideRecords!.map((rec, idx) => (
                    <FeedRecordCard
                      key={rec.id}
                      mode="pesticide"
                      value={rec}
                      onChange={(next) => handleUpdatePesticide(idx, next)}
                      onRemove={() => handleRemovePesticide(idx)}
                    />
                  ))
                )}
              </div>
            </details>

            {/* 数量统计折叠面板 — 种植单池（损耗 + 补栽） */}
            <details
              className="md:col-span-3 border border-orange-100 rounded-lg bg-orange-50/20 overflow-hidden"
              open
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-orange-50/50 hover:bg-orange-50 text-sm font-semibold text-orange-800 flex items-center justify-between">
                <span>▼ 数量统计（损耗 + 补栽）</span>
                <span className="text-xs text-orange-700 font-normal">
                  当前活体剩余 {currentAvailable} {record.unit || '株'} ｜
                  本次操作后{' '}
                  <span className="font-semibold">
                    {Math.max(
                      0,
                      currentAvailable - (formData.lossChange || 0) + (formData.supplementChange || 0)
                    )}
                  </span>
                  {' '}{record.unit || '株'}
                </span>
              </summary>
              <div className="p-3 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-700">
                    损耗
                    <span className="text-xs text-gray-500 ml-1">（死亡/淘汰，存入 plantings.loss_count）</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.lossChange ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || v === '-') {
                        setFormData({ ...formData, lossChange: undefined });
                        return;
                      }
                      const n = Number(v);
                      if (!isNaN(n) && n >= 0) {
                        setFormData({ ...formData, lossChange: n });
                      }
                    }}
                    placeholder={`今日损耗（不可超过 ${currentAvailable}）`}
                    className={deepInputClass}
                  />
                </div>
                <div>
                  <Label className="text-gray-700">
                    补栽
                    <span className="text-xs text-gray-500 ml-1">（补种/补苗，存入 plantings.supplement_count）</span>
                  </Label>
                  {/* 2026-06-30: 补栽不关联种源溯源警告
                      缘由：补栽只更新 plantings.supplement_count 累加数字，不写入 planting_seed_sources，
                      会破坏全链路追溯。建议使用「调入」功能选择具体种源批号 — 补栽仅作为应急通道。 */}
                  <div className="bg-amber-50 border border-amber-300 rounded p-2 text-xs text-amber-800 mb-2">
                    ⚠️ 补栽不关联种源溯源，建议使用「调入」功能选择具体种源批号。补栽仅作为无法溯源时的应急通道。
                  </div>
                  <Input
                    type="number"
                    min="0"
                    value={formData.supplementChange ?? ''}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || v === '-') {
                        setFormData({ ...formData, supplementChange: undefined });
                        return;
                      }
                      const n = Number(v);
                      if (!isNaN(n) && n >= 0) {
                        setFormData({ ...formData, supplementChange: n });
                      }
                    }}
                    placeholder="今日补栽数量（无上限）"
                    className={deepInputClass}
                  />
                </div>
              </div>
            </details>

            {/* 备注 */}
            <div className="col-span-3">
              <Label className="text-gray-700">备注</Label>
              <TextArea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                className={deepInputClass}
                placeholder="请输入备注信息"
              />
            </div>
          </div>
        </div>
        )}

        {/* 历史记录列表 */}
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">
              历史记录 ({latestDailyRecords.length} 条)
            </h4>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={latestDailyRecords.length === 0}
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
          </div>
          {loadingHistory ? (
            <div className="text-center py-8 text-gray-500">加载中…</div>
          ) : latestDailyRecords.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无记录</div>
          ) : (
            <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-blue-500 text-white sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold w-24">日期</th>
                    <th className="px-2 py-2 text-left font-semibold">温度</th>
                    <th className="px-2 py-2 text-left font-semibold">湿度</th>
                    <th className="px-2 py-2 text-left font-semibold">pH</th>
                    <th className="px-2 py-2 text-left font-semibold">EC</th>
                    <th className="px-2 py-2 text-left font-semibold">浇水</th>
                    <th className="px-2 py-2 text-left font-semibold w-24">浇水方式</th>
                    <th className="px-2 py-2 text-left font-semibold w-24">浇水量</th>
                    <th className="px-2 py-2 text-left font-semibold w-16 text-emerald-700">施肥</th>
                    <th className="px-2 py-2 text-left font-semibold w-16 text-red-700">用药</th>
                    <th className="px-2 py-2 text-left font-semibold text-red-700">损耗</th>
                    <th className="px-2 py-2 text-left font-semibold text-emerald-700">补栽</th>
                    <th className="px-2 py-2 text-left font-semibold">操作员</th>
                    <th className="px-2 py-2 text-left font-semibold">备注</th>
                    <th className="px-2 py-2 text-center font-semibold w-24">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {latestDailyRecords.map((r, index) => (
                    <tr key={r.id || index} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5">
                        {editingId === r.id ? (
                          <Input
                            type="date"
                            value={editingRow.recordDate || ''}
                            onChange={(e) => setEditingRow({ ...editingRow, recordDate: e.target.value })}
                            className="w-full px-1 py-0.5 text-xs border border-gray-400 rounded"
                          />
                        ) : (
                          r.recordDate
                        )}
                      </td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'temperature', r.temperature)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'humidity', r.humidity)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'phValue', r.phValue)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'ecValue', r.ecValue)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'watering', r.watering)}</td>
                      <td className="px-2 py-1.5 text-xs">
                        {r.watering ? (WATERING_METHOD_MAP[r.wateringMethod as string] || r.wateringMethod || '-') : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-xs">
                        {r.watering && r.wateringAmount != null
                          ? `${r.wateringAmount} ${WATERING_UNIT_MAP[r.wateringUnit as string] || r.wateringUnit || ''}`
                          : '-'}
                      </td>
                      <td className="px-2 py-1.5">
                        {(r.fertilizerRecords?.length || 0) > 0 ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 cursor-help"
                            title={(r.fertilizerRecords || []).map((f) =>
                              `${f.name} ${f.amount || 0}${FEED_UNIT_MAP[f.unit as string] || f.unit}${f.dilutionType === 'dilute' && f.dilution ? `×${f.dilution}倍` : '(干施)'}`
                            ).join('\n')}
                          >
                            {r.fertilizerRecords!.length} 种
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        {(r.pesticideRecords?.length || 0) > 0 ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 cursor-help"
                            title={(r.pesticideRecords || []).map((p) =>
                              `${p.name} ${p.amount || 0}${FEED_UNIT_MAP[p.unit as string] || p.unit}${p.dilutionType === 'dilute' && p.dilution ? `×${p.dilution}倍` : ''}${p.targetPest ? `/${p.targetPest}` : ''}${p.safetyInterval ? `(间隔${p.safetyInterval}天)` : ''}`
                            ).join('\n')}
                          >
                            {r.pesticideRecords!.length} 种
                          </span>
                        ) : (
                          <span className="text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'lossChange', r.lossChange)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'supplementChange', r.supplementChange)}</td>
                      <td className="px-2 py-1.5">{r.operator || '-'}</td>
                      <td className="px-2 py-1.5 text-gray-500 truncate max-w-[120px]">{r.remarks || '-'}</td>
                      <td className="px-2 py-1.5 text-center">
                        {editingId === r.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleSaveEdit}
                              className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCancelEdit}
                              className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            {!readOnly && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleStartEdit(r)}
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(r)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {readOnly && (
                              <span className="text-gray-400 text-xs">只读</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}