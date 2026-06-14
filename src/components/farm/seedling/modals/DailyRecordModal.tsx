/**
 * 每日记录弹窗
 * 支持：添加记录、编辑记录、删除记录、导出记录
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Seedling, DailyRecord } from '../../../../types/crop';
import { useDictionaryStore, getDictItems, useSeedlingStore } from '../../../../stores';
import { getDailyRecords } from '../../../../services/apiSeedlingService';
import { Input } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { Button } from '@/components/ui';
import { Edit2, Trash2, Download, X, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

interface DailyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Seedling;
}

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function DailyRecordModal({ isOpen, onClose, onSuccess, record }: DailyRecordModalProps) {
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  // 2026-06-14: 繁殖模式（决定字段显示与文案）
  const propagationMode = (record.propagationMode as string) || 'seed';
  const isMotherMode = ['layering', 'tissue_culture', 'cutting'].includes(propagationMode);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);
  const updateDailyRecord = useSeedlingStore((state) => state.updateDailyRecord);
  const deleteDailyRecord = useSeedlingStore((state) => state.deleteDailyRecord);

  const [refreshKey, setRefreshKey] = useState(0);
  // 2026-06-05: 独立 local state 拉 daily-records（之前读 store.dailyRecords 永远 undefined）
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 拉取每日记录历史
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    const list = await getDailyRecords(String(record.id));
    setDailyRecords(list);
    setLoadingHistory(false);
  }, [record.id]);

  useEffect(() => {
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [dictionaries.length, loadDictionaries]);

  // 弹窗打开时 + refreshKey 变化时重新拉
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
    setRefreshKey(k => k + 1);
    onSuccess?.();
  };

  const OPERATORS = useMemo(() => {
    return getDictItems('operator').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

  const [formData, setFormData] = useState({
    recordDate: todayLocal(),
    temperature: undefined as number | undefined,
    humidity: undefined as number | undefined,
    watering: false,
    abnormality: '',
    survivalCountChange: undefined as number | undefined,
    plantedCountChange: undefined as number | undefined,
    lossCountChange: undefined as number | undefined,
    runnerIncreaseCount: undefined as number | undefined,
    remarks: '',
    phValue: undefined as number | undefined,
    ecValue: undefined as number | undefined,
    operator: ''
  });

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Partial<DailyRecord>>({});

  const handleSubmit = async () => {
    if (!formData.recordDate) {
      await showAlert('请选择记录日期');
      return;
    }

    // 2026-06-14: 上限自检 — 新增成活量不能超过"剩余可用小苗"
    // 剩余可用 = 现存小苗(survival - planted) + 本日损耗(本次录入)
    // 但本日的损耗还没计入，所以更严格：剩余可用 = survival - planted (录入前)
    const currentAvailable = (record.survivalCount || 0) - (record.plantedCount || 0);
    const sc = formData.survivalCountChange || 0;
    const ri = formData.runnerIncreaseCount || 0;
    if (sc > 0 && sc > currentAvailable) {
      await showAlert(`成活变化 +${sc} 超过当前剩余可用小苗 ${currentAvailable} 株，请调整`);
      return;
    }
    if (ri > 0 && ri > currentAvailable) {
      await showAlert(`扩繁小苗数量 +${ri} 超过当前剩余可用小苗 ${currentAvailable} 株，请调整`);
      return;
    }
    // 损耗不能为负
    if ((formData.lossCountChange || 0) < 0) {
      await showAlert('损耗数量不能为负数');
      return;
    }

    try {
      // 2026-06-05: 把业务字段打包成 data 对象（后端会 JSON.stringify 一次并存到 data 列，GET 时再 JSON.parse 还原）
      const bizData = {
        temperature: formData.temperature,
        humidity: formData.humidity,
        watering: formData.watering,
        abnormality: formData.abnormality || undefined,
        survivalCountChange: formData.survivalCountChange,
        plantedCountChange: formData.plantedCountChange,
        lossCountChange: formData.lossCountChange,
        runnerIncreaseCount: formData.runnerIncreaseCount,
        phValue: formData.phValue,
        ecValue: formData.ecValue,
        operator: formData.operator || undefined,
      };
      const result = await useSeedlingStore.getState().addDailyRecord(String(record.id), {
        recordDate: formData.recordDate,
        data: bizData,  // 后端 JSON.stringify 一次存到 data 列
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
        abnormality: '',
        survivalCountChange: undefined,
        plantedCountChange: undefined,
        lossCountChange: undefined,
        runnerIncreaseCount: undefined,
        remarks: '',
        phValue: undefined,
        ecValue: undefined,
        operator: ''
      });
    } catch (error) {
      // logger.error('添加每日记录失败:', error);
      await showAlert('添加记录失败，请重试');
      return;
    }

    handleSuccess();
  };

  // 开始编辑 — 2026-06-14: 修复编辑后字段被清空 bug
  // 根因：GET 返回的对象里混入了 data 字段（4 层嵌套的乱码 JSON 字符串）和 sql.js 展开的
  // 数字键 map（"0": "{", "1": "\""...），直接 `{ ...r }` 会把这些垃圾原样 PUT 给后端，
  // 后端再 stringify 一层写入 data 列 → 覆盖真实业务字段 → 下次 GET spread 时业务字段全消失。
  // 修复：只挑真正的业务字段作为 editingRow 初始值。
  const BUSINESS_FIELDS = [
    'recordDate', 'temperature', 'humidity', 'watering', 'abnormality',
    'survivalCountChange', 'plantedCountChange', 'lossCountChange',
    'runnerIncreaseCount', 'phValue', 'ecValue', 'operator', 'remarks',
  ] as const;

  const handleStartEdit = (r: DailyRecord) => {
    setEditingId(r.id);
    const cleanRow: Partial<DailyRecord> = {};
    BUSINESS_FIELDS.forEach(k => {
      if ((r as any)[k] !== undefined) {
        (cleanRow as any)[k] = (r as any)[k];
      }
    });
    setEditingRow(cleanRow);
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingRow({});
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      // 2026-06-14: 与 POST addDailyRecord 保持一致结构 — 业务字段打包成 data 对象
      // 后端 PUT 路由：req.body.data = 业务字段对象 → JSON.stringify 存到 data 列
      // 这样写入的 data JSON 结构干净，下次 GET 能正常 spread 还原
      const data = (editingRow as any).data && typeof (editingRow as any).data === 'object'
        ? (editingRow as any).data
        : (() => {
            const biz: any = {};
            ['temperature', 'humidity', 'watering', 'abnormality',
             'survivalCountChange', 'plantedCountChange', 'lossCountChange',
             'runnerIncreaseCount', 'phValue', 'ecValue', 'operator'].forEach(k => {
              if ((editingRow as any)[k] !== undefined) biz[k] = (editingRow as any)[k];
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
      // logger.error('更新每日记录失败:', error);
      await showAlert('更新记录失败，请重试');
    }
  };

  // 删除记录
  const handleDelete = async (r: DailyRecord) => {
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
      // logger.error('删除每日记录失败:', error);
      await showAlert('删除记录失败，请重试');
    }
  };

  // 导出记录
  const handleExport = async () => {
    if (latestDailyRecords.length === 0) {
      await showAlert('没有记录可导出');
      return;
    }
    const data = latestDailyRecords.map(r => ({
      '日期': r.recordDate,
      '温度(℃)': r.temperature ?? '',
      '湿度(%)': r.humidity ?? '',
      'pH值': r.phValue ?? '',
      'EC值(mS/cm)': r.ecValue ?? '',
      '浇水': r.watering ? '是' : '否',
      '成活变化': r.survivalCountChange ?? '',
      '扩繁小苗数量': r.runnerIncreaseCount ?? '',
      '定植变化': r.plantedCountChange ?? '',
      '损耗变化': r.lossCountChange ?? '',
      '操作员': r.operator ?? '',
      '备注': r.remarks ?? ''
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '每日记录');
    XLSX.writeFile(wb, `每日记录_${record.seedlingCode}.xlsx`);
  };

  // 渲染可编辑单元格
  const renderEditableCell = (r: DailyRecord, field: keyof DailyRecord, value: any) => {
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
          value={editingRow[field as keyof DailyRecord] ?? ''}
          onChange={(e) => setEditingRow({
            ...editingRow,
            [field]: e.target.value ? Number(e.target.value) : undefined
          })}
          className="w-full px-1 py-0.5 text-xs border border-gray-400 rounded"
        />
      );
    }
    // 显示模式
    if (field === 'watering') return r.watering ? '✓' : '✗';
    if (field === 'survivalCountChange' && value !== undefined) {
      return (
        <span className={value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-500'}>
          {value > 0 ? '+' : ''}{value}
        </span>
      );
    }
    if (field === 'plantedCountChange' && value !== undefined) {
      return (
        <span className={value > 0 ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-500'}>
          {value > 0 ? '+' : ''}{value}
        </span>
      );
    }
    if (field === 'lossCountChange' && value !== undefined) {
      return <span className="text-red-600">+{value}</span>;
    }
    if (field === 'runnerIncreaseCount' && value !== undefined) {
      return (
        <span className="text-emerald-600">
          {value > 0 ? '+' : ''}{value}
        </span>
      );
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
      title={`每日记录 - ${record.seedlingCode}`}
      size="xxxl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="添加记录"
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 添加新记录 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">添加新记录</h4>
          <div className="grid grid-cols-3 gap-4">
            {/* 第一行：记录日期 */}
            <div>
              <Label className="text-gray-700">记录日期</Label>
              <DatePicker className="w-full"
                selected={formData.recordDate ? new Date(formData.recordDate) : undefined}
                onChange={(date) => setFormData({ ...formData, recordDate: todayLocal(date) })}
              />
            </div>
            {/* 第一行：温度 */}
            <div>
              <Label className="text-gray-700">温度（℃）</Label>
              <Input
                type="number"
                value={formData.temperature || ''}
                onChange={(e) => setFormData({ ...formData, temperature: Number(e.target.value) })}
                className={deepInputClass}
              />
            </div>
            {/* 第一行：湿度 */}
            <div>
              <Label className="text-gray-700">湿度（%）</Label>
              <Input
                type="number"
                value={formData.humidity || ''}
                onChange={(e) => setFormData({ ...formData, humidity: Number(e.target.value) })}
                className={deepInputClass}
              />
            </div>
            {/* 第二行：pH值 */}
            <div>
              <Label className="text-gray-700">pH值</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.phValue ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
                  phValue: e.target.value ? Number(e.target.value) : undefined
                })}
                placeholder="如：6.5"
                className={deepInputClass}
              />
            </div>
            {/* 第二行：EC值 */}
            <div>
              <Label className="text-gray-700">EC值（mS/cm）</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.ecValue ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
                  ecValue: e.target.value ? Number(e.target.value) : undefined
                })}
                placeholder="如：2.0"
                className={deepInputClass}
              />
            </div>
            {/* 第二行：是否浇水 */}
            <div>
              <Label className="text-gray-700">是否浇水</Label>
              <div className="flex items-center h-full">
                <Input
                  type="checkbox"
                  checked={formData.watering}
                  onChange={(e) => setFormData({ ...formData, watering: e.target.checked })}
                  className="w-5 h-5 text-emerald-600 rounded border-gray-400"
                />
                <span className="ml-2 text-sm text-gray-600">{formData.watering ? '是' : '否'}</span>
              </div>
            </div>
            {/* 第三行：成活变化 / 母株变化（按模式） */}
            <div>
              <Label className="text-gray-700">
                {isMotherMode ? '母株变化' : '成活变化'}
                <span className="text-xs text-gray-500 ml-1">
                  （{isMotherMode ? '母株成活数变化' : '成活苗数变化'}）
                </span>
              </Label>
              <Input
                type="number"
                value={formData.survivalCountChange ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
                  survivalCountChange: e.target.value ? Number(e.target.value) : undefined
                })}
                placeholder="正数增加，负数减少"
                className={deepInputClass}
              />
              <p className="text-xs text-gray-500 mt-1">
                剩余可用小苗：{(record.survivalCount || 0) - (record.plantedCount || 0) + (record.lossCount || 0)} 株（不可超过）
              </p>
            </div>
            {/* 第三行：定植变化 */}
            <div>
              <Label className="text-gray-700">定植变化</Label>
              <Input
                type="number"
                value={formData.plantedCountChange ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
                  plantedCountChange: e.target.value ? Number(e.target.value) : undefined
                })}
                placeholder="正数增加，负数减少"
                className={deepInputClass}
              />
            </div>
            {/* 第三行：损耗数量 */}
            <div>
              <Label className="text-gray-700">损耗数量</Label>
              <Input
                type="number"
                min="0"
                value={formData.lossCountChange ?? ''}
                onChange={(e) => {
                  // 2026-06-14: 损耗只允许 ≥ 0（损耗不能减少）
                  const v = e.target.value;
                  if (v === '' || v === '-') {
                    setFormData({ ...formData, lossCountChange: undefined });
                    return;
                  }
                  const n = Number(v);
                  if (!isNaN(n) && n >= 0) {
                    setFormData({ ...formData, lossCountChange: n });
                  }
                }}
                placeholder="正数（不可为负）"
                className={deepInputClass}
              />
            </div>
            {/* 第四行：操作人员（占1列） + 异常情况 + 扩繁小苗数量 — 3 个一排 */}
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
                  {OPERATORS.map(op => (
                    <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* 第四行：异常情况 */}
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
            {/* 第四行：扩繁小苗数量（仅母株类模式显示） */}
            {isMotherMode && (
            <div>
              <Label className="text-gray-700">
                扩繁小苗数量
                <span className="text-xs text-gray-500 ml-1">
                  （{propagationMode === 'layering' ? '匍匐茎' : propagationMode === 'tissue_culture' ? '组培' : '扦插'}新出苗数）
                </span>
              </Label>
              <Input
                type="number"
                value={formData.runnerIncreaseCount ?? ''}
                onChange={(e) => setFormData({
                  ...formData,
                  runnerIncreaseCount: e.target.value ? Number(e.target.value) : undefined
                })}
                placeholder="每日新增的小苗数量统计"
                className={deepInputClass}
              />
            </div>
            )}
            {/* 备注（单独一行，占3列） */}
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
          {latestDailyRecords.length === 0 ? (
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
                    <th className="px-2 py-2 text-left font-semibold">{isMotherMode ? '母株变化' : '成活变化'}</th>
                    {isMotherMode && <th className="px-2 py-2 text-left font-semibold">扩繁小苗数量</th>}
                    <th className="px-2 py-2 text-left font-semibold">定植变化</th>
                    <th className="px-2 py-2 text-left font-semibold">损耗变化</th>
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
                        ) : r.recordDate}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'temperature', r.temperature)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'humidity', r.humidity)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'phValue', r.phValue)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'ecValue', r.ecValue)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'watering', r.watering)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'survivalCountChange', r.survivalCountChange)}
                      </td>
                      {isMotherMode && (
                        <td className="px-2 py-1.5">
                          {renderEditableCell(r, 'runnerIncreaseCount', r.runnerIncreaseCount)}
                        </td>
                      )}
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'plantedCountChange', r.plantedCountChange)}
                      </td>
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'lossCountChange', r.lossCountChange)}
                      </td>
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
