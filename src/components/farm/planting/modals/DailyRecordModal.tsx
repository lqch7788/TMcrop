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
import { Button } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { showAlert, showConfirm } from '@/lib/dialogService';
import {
  WATERING_METHOD_MAP,
  WATERING_UNIT_MAP,
  FEED_UNIT_MAP,
} from '@/constants/cropConstants';
import type { FeedRecordItem } from '@/components/farm/seedling/modals/FeedRecordCard';
import { Edit2, Trash2, Download, X, Check, Lock } from 'lucide-react';

import { exportPlantingDailyRecordsToExcel } from '../../../../services/excelExportService';
// 2026-10-18：大组件拆分 —— 添加新记录表单区移入 ./daily-record/*（纯移动，无逻辑变更）
import { DailyRecordFormSection } from './daily-record/DailyRecordFormSection';
import type { DailyFormData } from './daily-record/types';

interface DailyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Planting;
  // 2026-07-03：只读模式（已结束的记录）— 禁用所有写操作，保留查看+导出
  readOnly?: boolean;
}

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
      // 2026-10-18 P2 修复：加载失败必须告知用户，不能伪装成"暂无记录"
      setDailyRecords([]);
      await showAlert(`加载每日记录失败：${(error as Error)?.message || '请稍后重试'}`);
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

  const [formData, setFormData] = useState<DailyFormData>({
    recordDate: todayLocal(),
    // 2026-08-21：环境参数 8 字段
    airTemperature: undefined as number | undefined,
    airHumidity: undefined as number | undefined,
    lightIntensity: undefined as number | undefined,
    co2: undefined as number | undefined,
    soilTemperature: undefined as number | undefined,
    soilHumidity: undefined as number | undefined,
    soilPhValue: undefined as number | undefined,
    soilEcValue: undefined as number | undefined,
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
        // 2026-08-21：环境参数 8 字段
        airTemperature: formData.airTemperature,
        airHumidity: formData.airHumidity,
        lightIntensity: formData.lightIntensity,
        co2: formData.co2,
        soilTemperature: formData.soilTemperature,
        soilHumidity: formData.soilHumidity,
        soilPhValue: formData.soilPhValue,
        soilEcValue: formData.soilEcValue,
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
      // 重置表单（2026-08-21：8 字段）
      setFormData({
        recordDate: todayLocal(),
        airTemperature: undefined,
        airHumidity: undefined,
        lightIntensity: undefined,
        co2: undefined,
        soilTemperature: undefined,
        soilHumidity: undefined,
        soilPhValue: undefined,
        soilEcValue: undefined,
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
  // 2026-08-21：环境参数改为 8 字段（保留旧字段以兼容历史数据编辑）
  const BUSINESS_FIELDS = [
    'recordDate',
    'airTemperature', 'airHumidity', 'lightIntensity', 'co2',
    'soilTemperature', 'soilHumidity', 'soilPhValue', 'soilEcValue',
    // 兼容旧字段（读取历史数据用，不会在新建时写入）
    'temperature', 'humidity', 'phValue', 'ecValue',
    'watering', 'wateringMethod', 'wateringAmount', 'wateringUnit',
    'fertilizerRecords', 'pesticideRecords',
    'abnormality',
    'lossChange', 'supplementChange',
    'operator', 'remarks',
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
      // 2026-10-18 P0 修复：以旧 data 为基准合并本次编辑字段。
      // 原实现用固定白名单重建 data，会清空 8 项环境参数、施肥/用药明细、浇水方式/水量。
      const baseData = editingRow.data && typeof editingRow.data === 'object' ? editingRow.data : {};
      const data: any = { ...baseData };
      BUSINESS_FIELDS.forEach((k) => {
        if (k === 'recordDate' || k === 'remarks') return;
        if (editingRow[k] !== undefined) data[k] = editingRow[k];
      });
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
    if (field === 'airTemperature' || field === 'soilTemperature') return `${value}℃`;
    if (field === 'airHumidity' || field === 'soilHumidity') return `${value}%`;
    if (field === 'lightIntensity') return `${value} lux`;
    if (field === 'co2') return `${value} ppm`;
    if (field === 'soilEcValue') return `${value} mS/cm`;
    // 兼容旧字段（编辑历史数据）
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
        <DailyRecordFormSection
          readOnly={readOnly}
          record={record}
          currentAvailable={currentAvailable}
          formData={formData}
          setFormData={setFormData}
          OPERATORS={OPERATORS}
          handleAddFertilizer={handleAddFertilizer}
          handleUpdateFertilizer={handleUpdateFertilizer}
          handleRemoveFertilizer={handleRemoveFertilizer}
          handleAddPesticide={handleAddPesticide}
          handleUpdatePesticide={handleUpdatePesticide}
          handleRemovePesticide={handleRemovePesticide}
        />
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
                    {/* 2026-08-21：环境参数 8 列（空气×4 + 土壤×4）*/}
                    <th className="px-2 py-2 text-left font-semibold">空气温</th>
                    <th className="px-2 py-2 text-left font-semibold">空气湿</th>
                    <th className="px-2 py-2 text-left font-semibold">光照</th>
                    <th className="px-2 py-2 text-left font-semibold">CO₂</th>
                    <th className="px-2 py-2 text-left font-semibold">土壤温</th>
                    <th className="px-2 py-2 text-left font-semibold">土壤湿</th>
                    <th className="px-2 py-2 text-left font-semibold">土壤pH</th>
                    <th className="px-2 py-2 text-left font-semibold">土壤EC</th>
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
                      {/* 2026-08-21：环境参数 8 列单元格（新字段优先，旧字段 fallback 兼容历史）*/}
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'airTemperature', r.airTemperature ?? r.temperature)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'airHumidity', r.airHumidity ?? r.humidity)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'lightIntensity', r.lightIntensity)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'co2', r.co2)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'soilTemperature', r.soilTemperature)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'soilHumidity', r.soilHumidity)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'soilPhValue', r.soilPhValue ?? r.phValue)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'soilEcValue', r.soilEcValue ?? r.ecValue)}</td>
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