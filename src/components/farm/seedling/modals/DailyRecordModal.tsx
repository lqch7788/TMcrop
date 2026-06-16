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
  // 2026-06-15: 数量体系重构 — 2 模式判断
  const propagationMode = (record.propagationMode as string) || 'one_to_one';
  const isMotherMode = propagationMode === 'one_to_many';  // 2026-06-15: 6 种 → 1 种（one_to_many）
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
    replantChange: undefined as number | undefined,  // 2026-06-16: 补苗数（1:1=补种子；1:多=补母株）
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

    // 2026-06-16: 数量体系重构 — 两池分离校验（母株池 + 小苗池 各自独立）
    // 1:多 模式：sc=母株损耗, ri=小苗产出, rc=补苗（新增母株）
    // 1:1 模式：sc/ri 都是死字段（强制 0），只校验 lc + tc + rc（补种子）
    const sc = isMotherMode ? (formData.survivalCountChange || 0) : 0;  // 1:多=母株损耗；1:1=0（死字段）
    const ri = isMotherMode ? (formData.runnerIncreaseCount || 0) : 0;  // 1:多=小苗产出；1:1=0（死字段）
    const lc = formData.lossCountChange || 0;
    const tc = formData.plantedCountChange || 0;                        // 人工定植
    const rc = formData.replantChange || 0;                            // 2026-06-16: 补苗

    // 2026-06-16: 母株池 / 小苗池 严格分离计算（不合并！）
    // 母株池剩余可用 = 母株存活 - 母株损耗 + 补苗累计（1:1 = 母株存活 + 补苗；1:多 = 母株存活 - 母株损耗 + 补苗）
    const motherAvailable = Math.max(0,
      ((record as any).motherPlantCount || 0) - ((record as any).motherLossCount || 0) + ((record as any).replantCount || 0)
    );
    // 小苗池剩余可用 = DB 累计产出 + 本次产出 + 本次补苗（1:1 模式补种子计入小苗池；1:多 模式补母株不计入小苗池） - DB 累计消耗（损耗/定植/自动定植/采收入库）
    // ⚠️ 注意：本次损耗 lc 和本次定植 tc 不参与"剩余可用"计算（避免双重扣减）
    //   校验逻辑是 lc+tc ≤ seedlingAvailable（即：用户本次最多可扣减多少）
    const seedlingAvailable = Math.max(0,
      ((record as any).expandedPlantCount || 0)
      + ri                          // 本次产出
      + (isMotherMode ? 0 : rc)     // 2026-06-16 修复：1:1 模式补苗计入小苗池（补种子）
      - (record.seedlingLossCount || 0)
      - (record.transplantedCount || 0)
      - (record.autoPlantedCount || 0)
      - (record.harvestStockedCount || 0)
    );

    if (isMotherMode) {
      // 1:多 模式：母株池校验 — 母株损耗不能超过母株剩余可用
      if (sc > 0 && sc > motherAvailable) {
        await showAlert(`1:多 模式：母株损耗 ${sc} 超过母株剩余可用 ${motherAvailable} 株，请调整（母株池：${motherAvailable} 株）`);
        return;
      }
      // 1:多 模式：小苗池校验 — 小苗损耗 + 人工定植不能超过小苗剩余可用
      if ((lc + tc) > 0 && (lc + tc) > seedlingAvailable) {
        await showAlert(`1:多 模式：小苗消耗（损耗 ${lc} + 人工定植 ${tc} = ${lc + tc}）超过小苗剩余可用 ${seedlingAvailable} 株，请调整（小苗池：${seedlingAvailable} 株）`);
        return;
      }
    } else {
      // 1:1 模式：小苗池校验（母株池无损耗概念，无需校验）
      if ((lc + tc) > 0 && (lc + tc) > seedlingAvailable) {
        await showAlert(`1:1 模式：小苗消耗（损耗 ${lc} + 人工定植 ${tc} = ${lc + tc}）超过小苗剩余可用 ${seedlingAvailable} 株，请调整（小苗池：${seedlingAvailable} 株）`);
        return;
      }
    }
    // 损耗不能为负
    if (lc < 0) {
      await showAlert('损耗数量不能为负数');
      return;
    }

    try {
      // 2026-06-16: 数量体系重构 — bizData 用 5 个新字段名（损耗/产出/定植 + 补苗）
      const bizData: any = {
        temperature: formData.temperature,
        humidity: formData.humidity,
        watering: formData.watering,
        abnormality: formData.abnormality || undefined,
        // 5 个新业务字段
        motherLossChange: sc,      // 1:多=母株损耗；1:1=0
        seedlingLossChange: lc,    // 两种模式=小苗损耗
        expandedChange: ri,        // 1:多=小苗产出；1:1=0
        transplantedChange: tc,    // 两种模式=人工定植
        replantChange: rc,         // 2026-06-16: 补苗（两种模式都支持）
        // 4 个旧字段名（兼容历史 data 读取）
        survivalCountChange: sc,
        plantedCountChange: tc,
        lossCountChange: lc,
        runnerIncreaseCount: ri,
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
        replantChange: undefined,  // 2026-06-16
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
      '母株损耗': r.survivalCountChange ?? '',
      '小苗产出': r.runnerIncreaseCount ?? '',
      '人工定植': r.plantedCountChange ?? '',
      '小苗损耗': r.lossCountChange ?? '',
      '补苗': r.replantChange ?? '',
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
            {/* 2026-06-16: 数量体系重构 — 1:1 模式只显示 2 个输入框（损耗 + 定植） */}
            {/* 1:多 模式：母株损耗（仅 1:多 模式） */}
            {isMotherMode && (
              <div>
                <Label className="text-gray-700">
                  母株损耗
                  <span className="text-xs text-gray-500 ml-1">（母株死亡/减少，存入"母株损耗"字段）</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.survivalCountChange ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || v === '-') {
                      setFormData({ ...formData, survivalCountChange: undefined });
                      return;
                    }
                    const n = Number(v);
                    if (!isNaN(n) && n >= 0) {
                      setFormData({ ...formData, survivalCountChange: n });
                    }
                  }}
                  placeholder="今日母株死亡数（不可为负）"
                  className={deepInputClass}
                />
              </div>
            )}
            {/* 小苗产出（仅 1:多 模式 — 1:1 模式无"小苗产出"业务概念） */}
            {isMotherMode && (
              <div>
                <Label className="text-gray-700">
                  小苗产出
                  <span className="text-xs text-gray-500 ml-1">（匍匐茎/组培/扦插/分株每日新增，存入"小苗产出"字段）</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.runnerIncreaseCount ?? ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || v === '-') {
                      setFormData({ ...formData, runnerIncreaseCount: undefined });
                      return;
                    }
                    const n = Number(v);
                    if (!isNaN(n) && n >= 0) {
                      setFormData({ ...formData, runnerIncreaseCount: n });
                    }
                  }}
                  placeholder="今日新增小苗数（不可为负）"
                  className={deepInputClass}
                />
              </div>
            )}
            {/* 人工定植（两种模式都显示） */}
            <div>
              <Label className="text-gray-700">
                人工定植
                <span className="text-xs text-gray-500 ml-1">（人工把小苗定植到种植区，存入"人工定植"字段）</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.plantedCountChange ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || v === '-') {
                    setFormData({ ...formData, plantedCountChange: undefined });
                    return;
                  }
                  const n = Number(v);
                  if (!isNaN(n) && n >= 0) {
                    setFormData({ ...formData, plantedCountChange: n });
                  }
                }}
                placeholder="今日人工定植数（不可为负）"
                className={deepInputClass}
              />
            </div>
            {/* 小苗损耗（两种模式都显示） */}
            <div>
              <Label className="text-gray-700">
                小苗损耗
                <span className="text-xs text-gray-500 ml-1">（小苗死亡/淘汰，存入"小苗损耗"字段）</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.lossCountChange ?? ''}
                onChange={(e) => {
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
                placeholder="今日小苗死亡数（不可为负）"
                className={deepInputClass}
              />
            </div>
            {/* 2026-06-16: 补苗（两种模式都显示）— 1:1=补种子进入；1:多=补母株进入；补入"补苗累计"字段 */}
            <div>
              <Label className="text-gray-700">
                补苗
                <span className="text-xs text-gray-500 ml-1">
                  （{isMotherMode ? '新增母株进入苗床，存入"补苗累计"字段' : '重新补种子进入苗床，存入"补苗累计"字段'}）
                </span>
              </Label>
              <Input
                type="number"
                min="0"
                value={formData.replantChange ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === '' || v === '-') {
                    setFormData({ ...formData, replantChange: undefined });
                    return;
                  }
                  const n = Number(v);
                  if (!isNaN(n) && n >= 0) {
                    setFormData({ ...formData, replantChange: n });
                  }
                }}
                placeholder={isMotherMode ? '今日新增母株数（不可为负）' : '今日补种子数（不可为负）'}
                className={deepInputClass}
              />
            </div>
            {/* 操作人员 + 异常情况 — 2 个一排 */}
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
                    {/* 2026-06-16: 列名对齐 DB 字段 — 1:1 模式无 sc 累加（死字段），隐藏"成活变化"列；1:多 模式显示"母株损耗"列 */}
                    {isMotherMode && <th className="px-2 py-2 text-left font-semibold">母株损耗</th>}
                    {isMotherMode && <th className="px-2 py-2 text-left font-semibold">小苗产出</th>}
                    <th className="px-2 py-2 text-left font-semibold">人工定植</th>
                    <th className="px-2 py-2 text-left font-semibold">小苗损耗</th>
                    {/* 2026-06-16: 补苗列（两种模式都显示） */}
                    <th className="px-2 py-2 text-left font-semibold">补苗</th>
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
                      {/* 2026-06-16: 1:多 模式才显示母株损耗列（1:1 模式 sc 是死字段） */}
                      {isMotherMode && (
                        <td className="px-2 py-1.5">
                          {renderEditableCell(r, 'survivalCountChange', r.survivalCountChange)}
                        </td>
                      )}
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
                      {/* 2026-06-16: 补苗列 */}
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'replantChange', r.replantChange)}
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
