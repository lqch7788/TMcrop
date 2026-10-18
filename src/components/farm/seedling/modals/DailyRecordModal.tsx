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
import { todayLocal } from '@/lib/dateUtils';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { getMotherLossCapacity, getSeedlingRemainingCount } from '@/lib/seedlingPool';
import {
  WATERING_METHOD_MAP,
  WATERING_UNIT_MAP,
  FEED_UNIT_MAP,
} from '@/constants/cropConstants';
import type { FeedRecordItem } from './FeedRecordCard';
import { Button } from '@/components/ui';
import { Edit2, Trash2, Download, X, Check, Lock } from 'lucide-react';
import * as XLSX from 'xlsx';
// 2026-10-18：大组件拆分 —— 添加新记录表单区移入 ./daily-record/*（纯移动，无逻辑变更）
import { DailyRecordFormSection } from './daily-record/DailyRecordFormSection';
import type { DailyFormData } from './daily-record/types';

interface DailyRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Seedling;
  // 2026-07-03：只读模式（已结束的记录）— 禁用所有写操作，保留查看+导出
  readOnly?: boolean;
}

export function DailyRecordModal({ isOpen, onClose, onSuccess, record, readOnly }: DailyRecordModalProps) {
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
  // 2026-07-10 P0-5 修复：用 crypto.randomUUID() 替代 Date.now()+Math.random() 避免碰撞
  /** 生成前端唯一 ID（编辑时识别行） */
  const genFeedId = (prefix: 'fr' | 'pr') =>
    `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
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
    // 2026-06-28：浇水方式 + 浇水量（PR1）
    watering: false,
    wateringMethod: undefined as string | undefined,
    wateringAmount: undefined as number | undefined,
    wateringUnit: 'L' as string | undefined,
    // 2026-06-28：施肥/用药记录子表（1:N 嵌套，存储到 daily_records.data JSON）
    fertilizerRecords: [] as FeedRecordItem[],
    pesticideRecords: [] as FeedRecordItem[],
    abnormality: '',
    survivalCountChange: undefined as number | undefined,
    lossCountChange: undefined as number | undefined,
    runnerIncreaseCount: undefined as number | undefined,
    replantChange: undefined as number | undefined,
    remarks: '',
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

    // 2026-10-17 单池化：数量字段按模式路由
    // 1:多（双池）：sc=母株损耗, ri=小苗产出, lc=小苗损耗, rc=补苗
    // 1:1（单池） ：损耗全部走母株池 —— sc=母株损耗（原"小苗损耗"输入），无小苗产出/小苗损耗
    const sc = formData.survivalCountChange || 0;                       // 母株损耗（两种模式）
    const ri = isMotherMode ? (formData.runnerIncreaseCount || 0) : 0;  // 小苗产出（仅 1:多）
    const lc = isMotherMode ? (formData.lossCountChange || 0) : 0;      // 小苗损耗（仅 1:多）
    const rc = formData.replantChange || 0;                            // 2026-06-16: 补苗

    if (isMotherMode) {
      // ── 1:多 双池口径（统一走 seedlingPool 单一真理源，避免第四套算式）──
      // 母株池可用 = 母株 + 补苗 − 母株损耗
      const motherAvailable = getMotherLossCapacity(record);
      // 小苗池可用 = 当前剩余 + 本次产出（本次损耗不参与，避免双重扣减）
      const seedlingAvailable = getSeedlingRemainingCount(record) + ri;
      if (sc > 0 && sc > motherAvailable) {
        await showAlert(`1:多 模式：母株损耗 ${sc} 超过母株剩余可用 ${motherAvailable} 株，请调整（母株池：${motherAvailable} 株）`);
        return;
      }
      if (lc > 0 && lc > seedlingAvailable) {
        await showAlert(`1:多 模式：小苗损耗 ${lc} 超过小苗剩余可用 ${seedlingAvailable} 株，请调整（小苗池：${seedlingAvailable} 株）`);
        return;
      }
    } else {
      // ── 1:1 单池口径：损耗只能扣母株池（母株 + 补苗 − 母株损耗 − 历史小苗损耗 − 已入库）──
      const motherLossCapacity = getMotherLossCapacity(record);
      if (sc > 0 && sc > motherLossCapacity) {
        await showAlert(`1:1 模式：母株损耗 ${sc} 超过母株可损耗数量 ${motherLossCapacity} 株，请调整（母株池：${motherLossCapacity} 株）`);
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
        // 5 个新业务字段（2026-10-17 单池化：1:1 的损耗统一走 motherLossChange）
        motherLossChange: sc,      // 母株损耗（1:1 的损耗也从这里入母株池）
        seedlingLossChange: lc,    // 小苗损耗（仅 1:多）
        expandedChange: ri,        // 小苗产出（仅 1:多）
        replantChange: rc,         // 2026-06-16: 补苗（两种模式都支持）
        // 4 个旧字段名（兼容历史 data 读取）— 2026-06-27 移除 transplantedChange/plantedCountChange
        survivalCountChange: sc,
        lossCountChange: lc,
        runnerIncreaseCount: ri,
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
      // 重置表单（2026-08-21：环境参数 8 字段）
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
        fertilizerRecords: [],  // ← 新增：清空施肥子表
        pesticideRecords: [],   // ← 新增：清空用药子表
        abnormality: '',
        survivalCountChange: undefined,
        lossCountChange: undefined,
        runnerIncreaseCount: undefined,
        replantChange: undefined,
        remarks: '',
        operator: '',
        // 兼容字段（同步添加 — 2026-06-30 tsc 兼容）
        motherLossCount: undefined,
        replantCount: undefined,
        expandedPlantCount: undefined,
        seedlingLossCount: undefined,
      } as any);
    } catch (error) {
      // 2026-08-14：显示具体失败原因（后端 400 校验文案如"小苗损耗超过剩余可用"、网络错误等）
      const msg = (error as Error)?.message || '未知错误';
      await showAlert(`添加记录失败：${msg}`);
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
      // 2026-10-18 P0 修复：以旧 data 为基准合并本次编辑字段。
      // 原实现用固定白名单重建 data，会清空施肥/用药明细、浇水方式/水量。
      const baseData = editingRow.data && typeof editingRow.data === 'object' ? editingRow.data : {};
      const data: any = { ...baseData };
      BUSINESS_FIELDS.forEach((k) => {
        if (k === 'recordDate' || k === 'remarks') return;
        if (editingRow[k as keyof typeof editingRow] !== undefined) {
          data[k] = editingRow[k as keyof typeof editingRow];
        }
      });
      // 兼容新版字段名（后端 PUT 归一化优先读新名）
      data.motherLossChange = Number(editingRow.survivalCountChange) || 0;
      data.seedlingLossChange = Number(editingRow.lossCountChange) || 0;
      data.expandedChange = Number(editingRow.runnerIncreaseCount) || 0;
      data.replantChange = Number(editingRow.replantChange) || 0;
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
      // 2026-08-14 M2 修复：显示具体失败原因（后端校验文案等）
      const msg = (error as Error)?.message || '未知错误';
      await showAlert(`更新记录失败：${msg}`);
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
      // 2026-08-14 M2 修复：显示具体失败原因（后端校验文案等）
      const msg = (error as Error)?.message || '未知错误';
      await showAlert(`删除记录失败：${msg}`);
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
        // 2026-08-21：环境参数 8 字段（新字段优先，旧字段 fallback 兼容历史数据）
        '空气温度(℃)': r.airTemperature ?? r.temperature ?? '',
        '空气湿度(%)': r.airHumidity ?? r.humidity ?? '',
        '光照度(lux)': r.lightIntensity ?? '',
        'CO₂含量(ppm)': r.co2 ?? '',
        '土壤温度(℃)': r.soilTemperature ?? '',
        '土壤湿度(%)': r.soilHumidity ?? '',
        '土壤pH值': r.soilPhValue ?? r.phValue ?? '',
        '土壤EC值(mS/cm)': r.soilEcValue ?? r.ecValue ?? '',
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
    if (field === 'airTemperature' || field === 'soilTemperature') return `${value}℃`;
    if (field === 'airHumidity' || field === 'soilHumidity') return `${value}%`;
    if (field === 'lightIntensity') return `${value} lux`;
    if (field === 'co2') return `${value} ppm`;
    if (field === 'soilEcValue') return `${value} mS/cm`;
    // 兼容旧字段
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
      onSubmit={readOnly ? onClose : handleSubmit}
      submitText={readOnly ? '关闭' : '添加记录'}
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 2026-07-03：只读模式横幅（已结束的记录） */}
        {readOnly && (
          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-600 shrink-0" />
            <span className="text-sm text-gray-700">该育苗已结束，每日记录处于<strong>只读模式</strong>（可查看、导出）</span>
          </div>
        )}
        <DailyRecordFormSection
          readOnly={readOnly}
          isMotherMode={isMotherMode}
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
          {latestDailyRecords.length === 0 ? (
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
                    {/* 2026-06-28：PR1 浇水方式 + 量（新增两列） */}
                    <th className="px-2 py-2 text-left font-semibold w-24">浇水方式</th>
                    <th className="px-2 py-2 text-left font-semibold w-24">浇水量</th>
                    {/* 2026-06-28：施肥/用药子表（种类计数，详情 hover tooltip） */}
                    <th className="px-2 py-2 text-left font-semibold w-16 text-emerald-700">施肥</th>
                    <th className="px-2 py-2 text-left font-semibold w-16 text-red-700">用药</th>
                    {/* 2026-10-17 单池化：母株损耗列两种模式都显示（1:1 的损耗也记在母株池） */}
                    <th className="px-2 py-2 text-left font-semibold">母株损耗</th>
                    {/* 2026-06-28：补苗列移到母株损耗后（母株池字段先排列） */}
                    <th className="px-2 py-2 text-left font-semibold">补苗</th>
                    {isMotherMode && <th className="px-2 py-2 text-left font-semibold">小苗产出</th>}
                    {/* 2026-06-27：移除"人工定植"列（按业务规则：所有成品小苗必须先入库再出库） */}
                    {isMotherMode && <th className="px-2 py-2 text-left font-semibold">小苗损耗</th>}
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
                      {/* 2026-08-21：环境参数 8 列单元格（新字段优先，旧字段 fallback 兼容历史）*/}
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'airTemperature', r.airTemperature ?? r.temperature)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'airHumidity', r.airHumidity ?? r.humidity)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'lightIntensity', r.lightIntensity)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'co2', r.co2)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'soilTemperature', r.soilTemperature)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'soilHumidity', r.soilHumidity)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'soilPhValue', r.soilPhValue ?? r.phValue)}</td>
                      <td className="px-2 py-1.5">{renderEditableCell(r, 'soilEcValue', r.soilEcValue ?? r.ecValue)}</td>
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
                      {/* 2026-10-17 单池化：母株损耗列两种模式都显示 */}
                      <td className="px-2 py-1.5">
                        {renderEditableCell(r, 'survivalCountChange', r.survivalCountChange)}
                      </td>
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
                      {isMotherMode && (
                        <td className="px-2 py-1.5">
                          {renderEditableCell(r, 'lossCountChange', r.lossCountChange)}
                        </td>
                      )}
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
