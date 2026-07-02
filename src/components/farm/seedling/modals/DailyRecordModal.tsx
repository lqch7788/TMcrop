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
import {
  WATERING_METHOD_MAP,
  WATERING_UNIT_MAP,
  FERTILIZER_CATEGORY_MAP,
  PESTICIDE_CATEGORY_MAP,
  APPLICATION_METHOD_MAP,
  FEED_UNIT_MAP,
} from '@/constants/cropConstants';
import { FeedRecordCard, type FeedRecordItem } from './FeedRecordCard';
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
  // 6 种繁殖模式：seed/layering/tissue_culture/cutting = 1:1 逻辑；one_to_many = 母株+小苗双池逻辑
  const isMotherMode = propagationMode === 'one_to_many';
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);
  const addDailyRecord = useSeedlingStore((state) => state.addDailyRecord);
  const updateDailyRecord = useSeedlingStore((state) => state.updateDailyRecord);
  const deleteDailyRecord = useSeedlingStore((state) => state.deleteDailyRecord);

  const [refreshKey, setRefreshKey] = useState(0);
  // 2026-06-05: 独立 local state 拉 daily-records（之前读 store.dailyRecords 永远 undefined）
  const [dailyRecords, setDailyRecords] = useState<DailyRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // 拉取每日记录历史
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const list = await getDailyRecords(String(record.id));
      setDailyRecords(list || []);
    } catch (error) {
      // logger.error('加载每日记录失败:', error);
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

  // 2026-06-28：施肥/用药子表辅助函数
  /** 生成前端唯一 ID（编辑时识别行） */
  const genFeedId = (prefix: 'fr' | 'pr') =>
    `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  /** 创建一行默认空记录 */
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
  /** 添加一行施肥 */
  const handleAddFertilizer = () => {
    setFormData(prev => ({
      ...prev,
      fertilizerRecords: [makeEmptyFeedRecord('fertilizer'), ...(prev.fertilizerRecords || [])],
    }));
  };
  /** 添加一行用药 */
  const handleAddPesticide = () => {
    setFormData(prev => ({
      ...prev,
      pesticideRecords: [makeEmptyFeedRecord('pesticide'), ...(prev.pesticideRecords || [])],
    }));
  };
  /** 更新施肥行 */
  const handleUpdateFertilizer = (idx: number, next: FeedRecordItem) => {
    setFormData(prev => ({
      ...prev,
      fertilizerRecords: (prev.fertilizerRecords || []).map((r, i) => (i === idx ? next : r)),
    }));
  };
  /** 更新用药行 */
  const handleUpdatePesticide = (idx: number, next: FeedRecordItem) => {
    setFormData(prev => ({
      ...prev,
      pesticideRecords: (prev.pesticideRecords || []).map((r, i) => (i === idx ? next : r)),
    }));
  };
  /** 删除施肥行 */
  const handleRemoveFertilizer = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      fertilizerRecords: (prev.fertilizerRecords || []).filter((_, i) => i !== idx),
    }));
  };
  /** 删除用药行 */
  const handleRemovePesticide = (idx: number) => {
    setFormData(prev => ({
      ...prev,
      pesticideRecords: (prev.pesticideRecords || []).filter((_, i) => i !== idx),
    }));
  };

  const OPERATORS = useMemo(() => {
    return getDictItems('operator').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

  const [formData, setFormData] = useState({
    recordDate: todayLocal(),
    temperature: undefined as number | undefined,
    humidity: undefined as number | undefined,
    // 2026-06-28：浇水方式 + 浇水量（PR1）
    // watering=false 时隐藏方式/量；watering=true 时显示
    watering: false,
    wateringMethod: undefined as string | undefined,  // 浇水方式：spray/drip/flood/mist/dip/pot
    wateringAmount: undefined as number | undefined,  // 浇水量（数值）
    wateringUnit: 'L' as string | undefined,          // 单位：L/ml/kg/pot
    // 2026-06-28：施肥/用药记录子表（1:N 嵌套，存储到 daily_records.data JSON）
    fertilizerRecords: [] as FeedRecordItem[],
    pesticideRecords: [] as FeedRecordItem[],
    abnormality: '',
    survivalCountChange: undefined as number | undefined,
    lossCountChange: undefined as number | undefined,
    runnerIncreaseCount: undefined as number | undefined,
    replantChange: undefined as number | undefined,  // 2026-06-16: 补苗数（1:1=补种子；1:多=补母株）
    remarks: '',
    phValue: undefined as number | undefined,
    ecValue: undefined as number | undefined,
    operator: '',
    // 兼容字段：母株/小苗数量统计别名（2026-06-30 tsc 兼容）
    motherLossCount: undefined as number | undefined,
    replantCount: undefined as number | undefined,
    expandedPlantCount: undefined as number | undefined,
    seedlingLossCount: undefined as number | undefined,
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
    const rc = formData.replantChange || 0;                            // 2026-06-16: 补苗

    // 2026-06-16: 母株池 / 小苗池 严格分离计算（不合并！）
    // 母株池剩余可用 = 母株存活 - 母株损耗 + 补苗累计（1:1 = 母株存活 + 补苗；1:多 = 母株存活 - 母株损耗 + 补苗）
    const motherAvailable = Math.max(0,
      (record.motherPlantCount || 0) - (record.motherLossCount || 0) + (record.replantCount || 0)
    );
    // 小苗池剩余可用 = DB 累计产出 + 本次产出 + 本次补苗（1:1 模式补种子计入小苗池；1:多 模式补母株不计入小苗池） - DB 累计消耗（损耗/采收入库）
    // 2026-06-28：彻底移除 transplantedCount（已定植）业务字段，业务规则：种植管理不再从育苗取苗
    // ⚠️ 注意：本次损耗 lc 不参与"剩余可用"计算（避免双重扣减）
    const seedlingAvailable = Math.max(0,
      (record.expandedPlantCount || 0)
      + ri                          // 本次产出
      + (isMotherMode ? 0 : rc)     // 1:1 模式补苗计入小苗池（补种子）
      - (record.seedlingLossCount || 0)
      - (record.harvestStockedCount || 0)
    );

    if (isMotherMode) {
      // 1:多 模式：母株池校验 — 母株损耗不能超过母株剩余可用
      if (sc > 0 && sc > motherAvailable) {
        await showAlert(`1:多 模式：母株损耗 ${sc} 超过母株剩余可用 ${motherAvailable} 株，请调整（母株池：${motherAvailable} 株）`);
        return;
      }
      // 1:多 模式：小苗池校验 — 小苗损耗不能超过小苗剩余可用
      if (lc > 0 && lc > seedlingAvailable) {
        await showAlert(`1:多 模式：小苗损耗 ${lc} 超过小苗剩余可用 ${seedlingAvailable} 株，请调整（小苗池：${seedlingAvailable} 株）`);
        return;
      }
    } else {
      // 1:1 模式：小苗池校验（母株池无损耗概念，无需校验）
      if (lc > 0 && lc > seedlingAvailable) {
        await showAlert(`1:1 模式：小苗损耗 ${lc} 超过小苗剩余可用 ${seedlingAvailable} 株，请调整（小苗池：${seedlingAvailable} 株）`);
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
      // 2026-06-28：浇水推断 — 填了方式或量就算浇了（不再依赖复选框 watering 字段）
      const hasWatering = !!(formData.wateringMethod || formData.wateringAmount != null);
      const bizData: any = {
        temperature: formData.temperature,
        humidity: formData.humidity,
        watering: hasWatering,
        // 2026-06-28：浇水方式 + 浇水量（PR1）— 仅当 hasWatering 时写入
        wateringMethod: hasWatering ? formData.wateringMethod : undefined,
        wateringAmount: hasWatering ? formData.wateringAmount : undefined,
        wateringUnit: hasWatering ? formData.wateringUnit : undefined,
        // 2026-06-28：施肥/用药记录子表（仅写入有效行：name 非空 + amount > 0）
        fertilizerRecords: (formData.fertilizerRecords || [])
          .filter(r => r.name && r.amount && r.amount > 0)
          .map(r => ({
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
          .filter(r => r.name && r.amount && r.amount > 0)
          .map(r => ({
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
        // 5 个新业务字段
        motherLossChange: sc,      // 1:多=母株损耗；1:1=0
        seedlingLossChange: lc,    // 两种模式=小苗损耗
        expandedChange: ri,        // 1:多=小苗产出；1:1=0
        replantChange: rc,         // 2026-06-16: 补苗（两种模式都支持）
        // 4 个旧字段名（兼容历史 data 读取）— 2026-06-27 移除 transplantedChange/plantedCountChange
        survivalCountChange: sc,
        lossCountChange: lc,
        runnerIncreaseCount: ri,
        phValue: formData.phValue,
        ecValue: formData.ecValue,
        operator: formData.operator || undefined,
      };
      const result = await addDailyRecord(String(record.id), {
        recordDate: formData.recordDate,
        data: bizData,  // 后端 JSON.stringify 一次存到 data 列
        remarks: formData.remarks || undefined,
      } as any);
      if (!result) {
        await showAlert('添加记录失败，请重试');
        return;
      }
      // 重置表单（2026-06-28 修复：必须重置施肥/用药子表数组，否则下次新建会残留上次数据）
      setFormData({
        recordDate: todayLocal(),
        temperature: undefined,
        humidity: undefined,
        watering: false,
        wateringMethod: undefined,
        wateringAmount: undefined,
        wateringUnit: 'L',
        fertilizerRecords: [],  // ← 新增：清空施肥子表
        pesticideRecords: [],   // ← 新增：清空用药子表
        abnormality: '',
        survivalCountChange: undefined,
        lossCountChange: undefined,
        runnerIncreaseCount: undefined,
        replantChange: undefined,
        remarks: '',
        phValue: undefined,
        ecValue: undefined,
        operator: '',
        // 兼容字段（同步添加 — 2026-06-30 tsc 兼容）
        motherLossCount: undefined,
        replantCount: undefined,
        expandedPlantCount: undefined,
        seedlingLossCount: undefined,
      } as any);
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
    'recordDate', 'temperature', 'humidity', 'watering',
    'wateringMethod', 'wateringAmount', 'wateringUnit',  // 2026-06-28：浇水方式 + 量
    'fertilizerRecords', 'pesticideRecords',            // 2026-06-28：施肥/用药子表
    'abnormality',
    'survivalCountChange', 'lossCountChange',
    'runnerIncreaseCount', 'replantChange', 'phValue', 'ecValue', 'operator', 'remarks',
  ] as const;

  const handleStartEdit = (r: DailyRecord) => {
    setEditingId(r.id);
    const cleanRow: Partial<DailyRecord> = {};
    // 2026-07-01 P1-5 修复：保留 data JSON 里的 fertilizerRecords/pesticideRecords 等子表
    // 原因：之前只复制 BUSINESS_FIELDS 顶层，老 data 中的 1:N 数组被丢，
    //       编辑保存时 PUT 缺这些字段 → 历史施肥/用药明细被覆盖为 undefined
    if (r.data && typeof r.data === 'object') {
      Object.entries(r.data as Record<string, unknown>).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          (cleanRow as any)[k] = v;
        }
      });
    }
    BUSINESS_FIELDS.forEach(k => {
      if (r[k as keyof DailyRecord] !== undefined) {
        (cleanRow as any)[k] = r[k as keyof DailyRecord];
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
    if (!editingRow.recordDate) { await showAlert('请选择记录日期'); return; }
    try {
      // 2026-06-14: 与 POST addDailyRecord 保持一致结构 — 业务字段打包成 data 对象
      // 后端 PUT 路由：req.body.data = 业务字段对象 → JSON.stringify 存到 data 列
      // 这样写入的 data JSON 结构干净，下次 GET 能正常 spread 还原
      const data = editingRow.data && typeof editingRow.data === 'object'
        ? editingRow.data
        : (() => {
            const biz: any = {};
            ['temperature', 'humidity', 'watering', 'abnormality',
             'survivalCountChange', 'lossCountChange',
             'runnerIncreaseCount', 'phValue', 'ecValue', 'operator'].forEach(k => {
              if (editingRow[k] !== undefined) biz[k] = editingRow[k];
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
    const data = latestDailyRecords.map(r => {
      // 2026-06-28：施肥/用药明细（多行转文本）
      const fertText = (r.fertilizerRecords || [])
        .map(f => `${f.name} ${f.amount || 0}${FEED_UNIT_MAP[f.unit as string] || f.unit}${f.dilutionType === 'dilute' && f.dilution ? `×${f.dilution}倍` : '(干施)'}`)
        .join('; ');
      const pestText = (r.pesticideRecords || [])
        .map(p => `${p.name} ${p.amount || 0}${FEED_UNIT_MAP[p.unit as string] || p.unit}${p.dilutionType === 'dilute' && p.dilution ? `×${p.dilution}倍` : ''}${p.targetPest ? `/${p.targetPest}` : ''}${p.safetyInterval ? `(安全间隔${p.safetyInterval}天)` : ''}`)
        .join('; ');
      return {
        '日期': r.recordDate,
        '温度(℃)': r.temperature ?? '',
        '湿度(%)': r.humidity ?? '',
        'pH值': r.phValue ?? '',
        'EC值(mS/cm)': r.ecValue ?? '',
        '浇水': r.watering ? '是' : '否',
        // 2026-06-28：PR1 浇水方式 + 量（参考字典）
        '浇水方式': r.watering ? (WATERING_METHOD_MAP[r.wateringMethod as string] || r.wateringMethod || '-') : '-',
        '浇水量': r.watering && r.wateringAmount != null
          ? `${r.wateringAmount} ${WATERING_UNIT_MAP[r.wateringUnit as string] || r.wateringUnit || ''}`
          : '-',
        // 2026-06-28：施肥/用药子表（种类数 + 明细）
        '施肥种类': (r.fertilizerRecords || []).length,
        '施肥明细': fertText || '-',
        '用药种类': (r.pesticideRecords || []).length,
        '用药明细': pestText || '-',
        '母株损耗': r.survivalCountChange ?? '',
        '补苗': r.replantChange ?? '',
        '小苗产出': r.runnerIncreaseCount ?? '',
        // 2026-06-27：移除"人工定植"列
        '小苗损耗': r.lossCountChange ?? '',
        '操作员': r.operator ?? '',
        '备注': r.remarks ?? ''
      };
    });
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
    // 2026-06-27：移除 plantedCountChange 字段路由
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
            {/* 2026-06-28：UI 重构 — 第 1 行：记录日期 + 操作人员 + 异常情况（基础信息紧凑排列） */}
            <div>
              <Label className="text-gray-700">记录日期 <span className="text-red-500">*</span></Label>
              <DatePicker className="w-full"
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
            {/* 2026-06-28：环境参数折叠面板（参照施肥/用药模式）— 默认展开 */}
            <details
              className="md:col-span-3 border border-blue-100 rounded-lg bg-blue-50/20 overflow-hidden"
              open
            >
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
                    onChange={(e) => setFormData({
                      ...formData,
                      phValue: e.target.value ? Number(e.target.value) : undefined
                    })}
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
                    onChange={(e) => setFormData({
                      ...formData,
                      ecValue: e.target.value ? Number(e.target.value) : undefined
                    })}
                    placeholder="如：2.0"
                    className={deepInputClass}
                  />
                </div>
              </div>
            </details>
            {/* 2026-06-28：浇水折叠面板（简化版）— 不再需要勾选，用户填了就记录 */}
            {/* open 状态：用户填了方式/量 → 自动展开（视觉反馈），否则保持折叠 */}
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
                      {/* 16 种浇水方式（2026-06-28：PR1）— 从 WATERING_METHOD_MAP 自动渲染，便于维护 */}
                      {Object.entries(WATERING_METHOD_MAP).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
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
                      onChange={(e) => setFormData({
                        ...formData,
                        wateringAmount: e.target.value ? Number(e.target.value) : undefined
                      })}
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
                        {/* 单位（2026-06-28：PR1）— 从 WATERING_UNIT_MAP 自动渲染 */}
                        {Object.entries(WATERING_UNIT_MAP).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </details>
            {/* 2026-06-28：施肥折叠面板（动态列表，1:N 嵌套）— md:col-span-3 占满弹窗宽度 */}
            <details
              className="md:col-span-3 border border-emerald-100 rounded-lg bg-emerald-50/20 overflow-hidden"
              open={(formData.fertilizerRecords?.length || 0) > 0}
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-emerald-50/50 hover:bg-emerald-50 text-sm font-semibold text-emerald-800 flex items-center justify-between">
                <span>▼ 施肥（{(formData.fertilizerRecords?.length || 0)} 种）</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleAddFertilizer(); }}
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
            {/* 2026-06-28：用药折叠面板（动态列表，1:N 嵌套，含安全间隔期/防治对象）— md:col-span-3 占满宽度 */}
            <details
              className="md:col-span-3 border border-red-100 rounded-lg bg-red-50/20 overflow-hidden"
              open={(formData.pesticideRecords?.length || 0) > 0}
            >
              <summary className="cursor-pointer select-none px-3 py-2 bg-red-50/50 hover:bg-red-50 text-sm font-semibold text-red-800 flex items-center justify-between">
                <span>▼ 用药（{(formData.pesticideRecords?.length || 0)} 种）</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); handleAddPesticide(); }}
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
            {/* 2026-06-28：数量池统计折叠到二级（避免与施肥/用药面板混淆，UI 更整洁）— md:col-span-3 占满宽度 */}
            <details
              className="md:col-span-3 border border-gray-200 rounded-lg bg-gray-50/50 overflow-hidden"
              open={false}
            >
              <summary className="cursor-pointer select-none px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 flex items-center justify-between">
                <span>▼ 母株/小苗数量统计</span>
                <span className="text-xs text-gray-500 font-normal">
                  {(formData.motherLossCount || 0) > 0 ? '母株损耗 ' + formData.motherLossCount : ''}
                  {(formData.replantCount || 0) > 0 ? ' 补苗 ' + formData.replantCount : ''}
                  {(formData.expandedPlantCount || 0) > 0 ? ' 小苗产出 ' + formData.expandedPlantCount : ''}
                  {(formData.seedlingLossCount || 0) > 0 ? ' 小苗损耗 ' + formData.seedlingLossCount : ''}
                </span>
              </summary>
              {/* 2026-06-28：内部 4 列布局 — 1:多 模式 4 字段一行（母株损耗/补苗/小苗产出/小苗损耗 — 母株池先排，再小苗池）；1:1 模式 2 字段（补苗/小苗损耗） */}
              <div className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
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
            {/* 2026-06-28：补苗移到母株损耗之后（按"母株池 → 小苗池"业务分组：母株损耗+补苗=母株池；小苗产出+小苗损耗=小苗池） */}
            {/* 补苗（两种模式都显示）— 1:1=补种子进入；1:多=补母株进入；补入"补苗累计"字段 */}
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
            {/* 2026-06-27：移除"人工定植"录入字段（按业务规则：所有成品小苗必须先入库再出库） */}
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
              </div>{/* 关闭数量统计 details 内层 grid */}
            </details>{/* 关闭数量统计 details 面板 */}
            {/* 2026-06-28：操作人员 + 异常情况 已移到第 1 行（与记录日期同排），此处不再重复 */}
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
                    {/* 2026-06-28：PR1 浇水方式 + 量（新增两列） */}
                    <th className="px-2 py-2 text-left font-semibold w-24">浇水方式</th>
                    <th className="px-2 py-2 text-left font-semibold w-24">浇水量</th>
                    {/* 2026-06-28：施肥/用药子表（种类计数，详情 hover tooltip） */}
                    <th className="px-2 py-2 text-left font-semibold w-16 text-emerald-700">施肥</th>
                    <th className="px-2 py-2 text-left font-semibold w-16 text-red-700">用药</th>
                    {/* 2026-06-16: 列名对齐 DB 字段 — 1:1 模式无 sc 累加（死字段），隐藏"成活变化"列；1:多 模式显示"母株损耗"列 */}
                    {isMotherMode && <th className="px-2 py-2 text-left font-semibold">母株损耗</th>}
                    {/* 2026-06-28：补苗列移到母株损耗后（母株池字段先排列） */}
                    <th className="px-2 py-2 text-left font-semibold">补苗</th>
                    {isMotherMode && <th className="px-2 py-2 text-left font-semibold">小苗产出</th>}
                    {/* 2026-06-27：移除"人工定植"列（按业务规则：所有成品小苗必须先入库再出库） */}
                    <th className="px-2 py-2 text-left font-semibold">小苗损耗</th>
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
                      {/* 2026-06-28：PR1 浇水方式 + 浇水量（2 列） */}
                      <td className="px-2 py-1.5 text-xs">
                        {r.watering ? (WATERING_METHOD_MAP[r.wateringMethod as string] || r.wateringMethod || '-') : '-'}
                      </td>
                      <td className="px-2 py-1.5 text-xs">
                        {r.watering && r.wateringAmount != null
                          ? `${r.wateringAmount} ${WATERING_UNIT_MAP[r.wateringUnit as string] || r.wateringUnit || ''}`
                          : '-'}
                      </td>
                      {/* 2026-06-28：修复 bug — 施肥/用药 必须在 小苗损耗/补苗 之前渲染（对齐 thead 顺序）
                          之前 bug：thead 顺序是「施肥/用药 → 母株损耗/小苗产出 → 小苗损耗/补苗」，
                          但 tbody 顺序是「母株损耗/小苗产出 → 小苗损耗/补苗 → 施肥/用药」，
                          导致列错位，用户看到的"施肥"列实际是母株损耗数据，"小苗损耗"列实际是施肥种数 */}
                      <td className="px-2 py-1.5">
                        {(r.fertilizerRecords?.length || 0) > 0 ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 cursor-help"
                            title={(r.fertilizerRecords || []).map(f =>
                              `${f.name} ${f.amount || 0}${FEED_UNIT_MAP[f.unit as string] || f.unit}${f.dilutionType === 'dilute' && f.dilution ? `×${f.dilution}倍` : '(干施)'}`
                            ).join('\n')}
                          >
                            {r.fertilizerRecords!.length} 种
                          </span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-2 py-1.5">
                        {(r.pesticideRecords?.length || 0) > 0 ? (
                          <span
                            className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 cursor-help"
                            title={(r.pesticideRecords || []).map(p =>
                              `${p.name} ${p.amount || 0}${FEED_UNIT_MAP[p.unit as string] || p.unit}${p.dilutionType === 'dilute' && p.dilution ? `×${p.dilution}倍` : ''}${p.targetPest ? `/${p.targetPest}` : ''}${p.safetyInterval ? `(间隔${p.safetyInterval}天)` : ''}`
                            ).join('\n')}
                          >
                            {r.pesticideRecords!.length} 种
                          </span>
                        ) : <span className="text-gray-300">-</span>}
                      </td>
                      {/* 2026-06-16: 1:多 模式才显示母株损耗列（1:1 模式 sc 是死字段） */}
                      {isMotherMode && (
                        <td className="px-2 py-1.5">
                          {renderEditableCell(r, 'survivalCountChange', r.survivalCountChange)}
                        </td>
                      )}
                      {/* 2026-06-28：补苗列移到母株损耗后（母株池字段先排列） */}
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'replantChange', r.replantChange)}
                      </td>
                      {isMotherMode && (
                        <td className="px-2 py-1.5">
                          {renderEditableCell(r, 'runnerIncreaseCount', r.runnerIncreaseCount)}
                        </td>
                      )}
                      {/* 2026-06-27：移除 plantedCountChange 数据列 */}
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'lossCountChange', r.lossCountChange)}
                      </td>
                      <td className="px-2 py-1.5">{r.operator || '-'}</td>
                      {/* 2026-07-01 P0-6 修复：备注超长时支持悬停查看完整内容（与种植 modal 对齐） */}
                      <td className="px-2 py-1.5 text-gray-500 truncate max-w-[120px]" title={r.remarks || ''}>
                        {r.remarks || '-'}
                      </td>
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
