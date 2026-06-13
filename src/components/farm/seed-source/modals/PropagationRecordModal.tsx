/**
 * 繁殖过程记录弹窗（V2：与育苗每日记录对齐）
 * - 上半：添加繁殖过程记录表单（根据途径类型和当前阶段动态显示不同字段）
 * - 下半：历史记录列表（表格形式，每行支持内联编辑 / 删除）
 * - 顶部：支持 Excel 导出
 *
 * 2026-06-13 改造说明：
 * 1. 列表由原来的时间线样式改为表格样式（与 DailyRecordModal 一致）
 * 2. 新增内联编辑、删除能力，调用后端 PUT/DELETE 接口持久化到 DB
 * 3. 新增 XLSX 导出按钮（导出当前种源的全部繁殖过程记录）
 */

import { useState, useEffect, useCallback } from 'react';
import { UnifiedModal } from '@/components/ui';
import { Plus, Clock, Thermometer, Droplets, AlertTriangle, Download, X, Check, Edit2, Trash2 } from 'lucide-react';
import { SeedSource, PropagationType, PropagationStatus, PropagationRecord } from '../../../../types/crop';
import { useSeedSourceStore } from '../../../../stores/useSeedSourceStore';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Button } from '@/components/ui';
import { PROPAGATION_STATUS_LABELS as STAGE_LABELS, PROPAGATION_STATUS_COLORS as STAGE_COLORS } from '../../../../constants/cropConstants';
import { showAlert, showConfirm } from '@/lib/dialogService';
import * as XLSX from 'xlsx';

interface PropagationRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: SeedSource | null;
  onSuccess?: () => void;
}

export function PropagationRecordModal({
  isOpen,
  onClose,
  record,
  onSuccess,
}: PropagationRecordModalProps) {
  const {
    addPropagationRecord,
    loadPropagationRecords,
    updatePropagationRecord,
    deletePropagationRecord,
  } = useSeedSourceStore();

  // 列表数据（独立 local state，避免 store 没存）
  const [records, setRecords] = useState<PropagationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  // 触发刷新用的 key
  const [refreshKey, setRefreshKey] = useState(0);

  // 表单字段
  const [formData, setFormData] = useState<Partial<PropagationRecord>>({
    stage: PropagationStatus.IN_PROGRESS,
    recordDate: new Date().toISOString().slice(0, 16),
    temperature: undefined,
    humidity: undefined,
    abnormality: '',
    operator: '',
    remarks: '',
    pollinationType: undefined,
    pollinatorCrop: '',
    flowerCount: 0,
    fruitSetCount: 0,
    harvestSeedCount: 0,
    seedWeight: 0,
    harvestPlantCount: 0,
    germinationRate: 0,
    purity: 0,
    moisture: 0,
    survivalRate: 0,
    rootedRate: 0,
    graftSuccessRate: 0,
  });

  // 编辑状态
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRow, setEditingRow] = useState<Partial<PropagationRecord>>({});

  // 加载已有记录
  const loadList = useCallback(async () => {
    if (!record) return;
    setLoading(true);
    const data = await loadPropagationRecords(record.id);
    setRecords(data);
    setLoading(false);
  }, [record, loadPropagationRecords]);

  // 弹窗打开 + refreshKey 变化时重新拉
  useEffect(() => {
    if (isOpen) {
      void loadList();
    }
  }, [isOpen, refreshKey, loadList]);

  // 重置表单
  const resetForm = () => {
    setFormData({
      stage: PropagationStatus.IN_PROGRESS,
      recordDate: new Date().toISOString().slice(0, 16),
      temperature: undefined,
      humidity: undefined,
      abnormality: '',
      operator: '',
      remarks: '',
      pollinationType: undefined,
      pollinatorCrop: '',
      flowerCount: 0,
      fruitSetCount: 0,
      harvestSeedCount: 0,
      seedWeight: 0,
      harvestPlantCount: 0,
      germinationRate: 0,
      purity: 0,
      moisture: 0,
      survivalRate: 0,
      rootedRate: 0,
      graftSuccessRate: 0,
    });
  };

  const handleSubmit = async () => {
    if (!record) return;
    const data = {
      ...formData,
      seedSourceId: record.id,
      recordDate: formData.recordDate || new Date().toISOString(),
      stage: formData.stage || PropagationStatus.IN_PROGRESS,
    };
    const result = await addPropagationRecord(record.id, data as any);
    if (result) {
      resetForm();
      setRefreshKey(k => k + 1);
      onSuccess?.();
    }
  };

  // 开始编辑
  const handleStartEdit = (r: PropagationRecord) => {
    setEditingId(r.id);
    // 编辑时 recordDate 仅保留到分钟（去掉秒），与 datetime-local input 兼容
    setEditingRow({
      ...r,
      recordDate: typeof r.recordDate === 'string' && r.recordDate.length >= 16
        ? r.recordDate.slice(0, 16)
        : r.recordDate,
    });
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingRow({});
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!record || !editingId) return;
    try {
      const success = await updatePropagationRecord(record.id, editingId, editingRow);
      if (success) {
        setEditingId(null);
        setEditingRow({});
        setRefreshKey(k => k + 1);
        onSuccess?.();
      } else {
        await showAlert('更新记录失败，请重试');
      }
    } catch (err) {
      await showAlert(`更新记录失败：${(err as Error)?.message || String(err)}`);
    }
  };

  // 删除记录
  const handleDelete = async (r: PropagationRecord) => {
    if (!record) return;
    const dt = typeof r.recordDate === 'string' ? r.recordDate.slice(0, 16) : String(r.recordDate || '');
    const confirmed = await showConfirm(`确定要删除 ${dt || r.id} 的这条繁殖记录吗？`);
    if (!confirmed) return;
    try {
      await deletePropagationRecord(record.id, r.id);
      setRefreshKey(k => k + 1);
      onSuccess?.();
    } catch (err) {
      await showAlert(`删除记录失败：${(err as Error)?.message || String(err)}`);
    }
  };

  // 导出 Excel
  const handleExport = async () => {
    if (records.length === 0) {
      await showAlert('没有记录可导出');
      return;
    }
    const isBreeding = record?.propagationType === PropagationType.BREEDING;
    const isSeedSaving = record?.propagationType === PropagationType.SEED_SAVING;
    const isAsexual = record?.propagationType === PropagationType.ASEXUAL;

    // 导出表头与数据
    const headers: string[] = [
      '日期', '阶段', '温度(℃)', '湿度(%)', '操作员', '异常', '备注',
    ];
    if (isBreeding) {
      headers.push('授粉类型', '授粉作物', '花朵数', '坐果数');
    }
    if (isBreeding || isSeedSaving) {
      headers.push('采收种子数', '种子重量(g)');
    }
    if (isAsexual) {
      headers.push('采收苗数');
    }
    if (isBreeding || isSeedSaving) {
      headers.push('发芽率(%)', '净度(%)', '水分(%)');
    }
    if (isAsexual) {
      headers.push('成活率(%)', '生根率(%)', '嫁接成活率(%)');
    }

    const data = records.map(r => {
      const row: Record<string, any> = {
        '日期': typeof r.recordDate === 'string' ? r.recordDate.slice(0, 16) : r.recordDate || '',
        '阶段': STAGE_LABELS[r.stage] || r.stage,
        '温度(℃)': r.temperature ?? '',
        '湿度(%)': r.humidity ?? '',
        '操作员': r.operator ?? '',
        '异常': r.abnormality ?? '',
        '备注': r.remarks ?? '',
      };
      if (isBreeding) {
        row['授粉类型'] = r.pollinationType ?? '';
        row['授粉作物'] = r.pollinatorCrop ?? '';
        row['花朵数'] = r.flowerCount ?? '';
        row['坐果数'] = r.fruitSetCount ?? '';
      }
      if (isBreeding || isSeedSaving) {
        row['采收种子数'] = r.harvestSeedCount ?? '';
        row['种子重量(g)'] = r.seedWeight ?? '';
      }
      if (isAsexual) {
        row['采收苗数'] = r.harvestPlantCount ?? '';
      }
      if (isBreeding || isSeedSaving) {
        row['发芽率(%)'] = r.germinationRate ?? '';
        row['净度(%)'] = r.purity ?? '';
        row['水分(%)'] = r.moisture ?? '';
      }
      if (isAsexual) {
        row['成活率(%)'] = r.survivalRate ?? '';
        row['生根率(%)'] = r.rootedRate ?? '';
        row['嫁接成活率(%)'] = r.graftSuccessRate ?? '';
      }
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '繁殖过程记录');
    XLSX.writeFile(wb, `繁殖过程记录_${record?.seedCode || record?.id || '种源'}.xlsx`);
  };

  const isBreeding = record?.propagationType === PropagationType.BREEDING;
  const isSeedSaving = record?.propagationType === PropagationType.SEED_SAVING;
  const isAsexual = record?.propagationType === PropagationType.ASEXUAL;

  // ============ 单元格渲染工具 ============
  // 数字输入框（编辑态）
  const renderNumberEditor = (field: keyof PropagationRecord, step?: string) => (
    <Input
      type="number"
      step={step}
      value={(editingRow[field] as number | undefined) ?? ''}
      onChange={(e) => setEditingRow({
        ...editingRow,
        [field]: e.target.value === '' ? undefined : Number(e.target.value),
      })}
      className="w-full px-1 py-0.5 text-xs border border-gray-400 rounded"
    />
  );

  // 文本输入框（编辑态）
  const renderTextEditor = (field: keyof PropagationRecord) => (
    <Input
      type="text"
      value={(editingRow[field] as string | undefined) ?? ''}
      onChange={(e) => setEditingRow({ ...editingRow, [field]: e.target.value })}
      className="w-full px-1 py-0.5 text-xs border border-gray-400 rounded"
    />
  );

  // 显示态单元格：数字字段（含后缀）
  const renderDisplayNumber = (value: number | undefined | null, suffix = '') => {
    if (value === undefined || value === null) return '-';
    return `${value}${suffix}`;
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`繁殖过程记录 - ${record?.seedCode || ''}`}
      size="xxxl"
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="添加记录"
      cancelText="关闭"
    >
      <div className="space-y-6">
        {/* 上部：添加记录表单 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            添加过程记录
          </h4>
          <div className="grid grid-cols-2 gap-4">
            {/* 记录日期 */}
            <div>
              <Label className="text-gray-600 text-xs">记录日期</Label>
              <Input
                type="datetime-local"
                value={formData.recordDate || ''}
                onChange={(e) => setFormData({ ...formData, recordDate: e.target.value })}
              />
            </div>

            {/* 阶段 */}
            <div>
              <Label className="text-gray-600 text-xs">当前阶段</Label>
              <Select
                value={formData.stage}
                onValueChange={(val) => setFormData({ ...formData, stage: val as PropagationStatus })}
              >
                <SelectTrigger className="">
                  <SelectValue placeholder="选择阶段" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STAGE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 温度 */}
            <div>
              <Label className="text-gray-600 text-xs flex items-center gap-1">
                <Thermometer className="w-3 h-3 text-orange-500" /> 温度（℃）
              </Label>
              <Input
                type="number"
                step="0.1"
                value={formData.temperature ?? ''}
                onChange={(e) => setFormData({ ...formData, temperature: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="如 25.5"
              />
            </div>

            {/* 湿度 */}
            <div>
              <Label className="text-gray-600 text-xs flex items-center gap-1">
                <Droplets className="w-3 h-3 text-blue-500" /> 湿度（%）
              </Label>
              <Input
                type="number"
                step="0.1"
                value={formData.humidity ?? ''}
                onChange={(e) => setFormData({ ...formData, humidity: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="如 65"
              />
            </div>

            {/* 操作人 */}
            <div>
              <Label className="text-gray-600 text-xs">操作人</Label>
              <Input
                type="text"
                value={formData.operator || ''}
                onChange={(e) => setFormData({ ...formData, operator: e.target.value })}
                placeholder="操作人姓名"
              />
            </div>

            {/* === 育种途径字段 === */}
            {isBreeding && (
              <>
                <div>
                  <Label className="text-gray-600 text-xs">授粉类型</Label>
                  <Select
                    value={formData.pollinationType || '__none__'}
                    onValueChange={(val) => setFormData({ ...formData, pollinationType: val === '__none__' ? undefined : val as any })}
                  >
                    <SelectTrigger className="">
                      <SelectValue placeholder="未设置" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">未设置</SelectItem>
                      <SelectItem value="self">自花授粉</SelectItem>
                      <SelectItem value="cross">异花授粉</SelectItem>
                      <SelectItem value="open">开放授粉</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">授粉作物</Label>
                  <Input
                    type="text"
                    value={formData.pollinatorCrop || ''}
                    onChange={(e) => setFormData({ ...formData, pollinatorCrop: e.target.value })}
                    placeholder="授粉作物名称"
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">授粉花朵数</Label>
                  <Input
                    type="number"
                    value={formData.flowerCount || ''}
                    onChange={(e) => setFormData({ ...formData, flowerCount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">坐果数</Label>
                  <Input
                    type="number"
                    value={formData.fruitSetCount || ''}
                    onChange={(e) => setFormData({ ...formData, fruitSetCount: Number(e.target.value) })}
                  />
                </div>
              </>
            )}

            {/* === 采收阶段字段（育种+留种） === */}
            {(isBreeding || isSeedSaving) && (
              <>
                <div>
                  <Label className="text-gray-600 text-xs">采收种子数</Label>
                  <Input
                    type="number"
                    value={formData.harvestSeedCount || ''}
                    onChange={(e) => setFormData({ ...formData, harvestSeedCount: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">种子重量(g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.seedWeight || ''}
                    onChange={(e) => setFormData({ ...formData, seedWeight: Number(e.target.value) })}
                  />
                </div>
              </>
            )}

            {/* === 无性繁殖字段 === */}
            {isAsexual && (
              <div>
                <Label className="text-gray-600 text-xs">采收苗数</Label>
                <Input
                  type="number"
                  value={formData.harvestPlantCount || ''}
                  onChange={(e) => setFormData({ ...formData, harvestPlantCount: Number(e.target.value) })}
                />
              </div>
            )}

            {/* === 质检阶段字段 === */}
            {isBreeding || isSeedSaving ? (
              <>
                <div>
                  <Label className="text-gray-600 text-xs">发芽率(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.germinationRate || ''}
                    onChange={(e) => setFormData({ ...formData, germinationRate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">净度(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.purity || ''}
                    onChange={(e) => setFormData({ ...formData, purity: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">水分(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.moisture || ''}
                    onChange={(e) => setFormData({ ...formData, moisture: Number(e.target.value) })}
                  />
                </div>
              </>
            ) : isAsexual ? (
              <>
                <div>
                  <Label className="text-gray-600 text-xs">成活率(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.survivalRate || ''}
                    onChange={(e) => setFormData({ ...formData, survivalRate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">生根率(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.rootedRate || ''}
                    onChange={(e) => setFormData({ ...formData, rootedRate: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-gray-600 text-xs">嫁接成活率(%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.graftSuccessRate || ''}
                    onChange={(e) => setFormData({ ...formData, graftSuccessRate: Number(e.target.value) })}
                  />
                </div>
              </>
            ) : null}

            {/* 异常描述 - 占两列 */}
            <div className="col-span-2">
              <Label className="text-gray-600 text-xs flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-amber-500" /> 异常描述
              </Label>
              <Input
                type="text"
                value={formData.abnormality || ''}
                onChange={(e) => setFormData({ ...formData, abnormality: e.target.value })}
                placeholder="记录异常情况（如有）"
              />
            </div>

            {/* 备注 - 占两列 */}
            <div className="col-span-2">
              <Label className="text-gray-600 text-xs">备注</Label>
              <TextArea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                placeholder="补充说明"
              />
            </div>
          </div>
        </div>

        {/* 下部：历史记录列表（表格形式，与 DailyRecordModal 对齐） */}
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-500" />
              历史记录 ({records.length})
            </h4>
            <Button
              variant="default"
              size="sm"
              onClick={handleExport}
              disabled={records.length === 0}
              className="flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">加载中...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">暂无过程记录</div>
          ) : (
            <div className="max-h-96 overflow-x-auto overflow-y-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-blue-500 text-white sticky top-0">
                  <tr>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">日期</th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">阶段</th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">温度</th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">湿度</th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">操作员</th>
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">异常</th>
                    {isBreeding && (
                      <>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">授粉类型</th>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">授粉作物</th>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">花朵数</th>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">坐果数</th>
                      </>
                    )}
                    {(isBreeding || isSeedSaving) && (
                      <>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">采收种子数</th>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">种子重量(g)</th>
                      </>
                    )}
                    {isAsexual && (
                      <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">采收苗数</th>
                    )}
                    {(isBreeding || isSeedSaving) && (
                      <>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">发芽率(%)</th>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">净度(%)</th>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">水分(%)</th>
                      </>
                    )}
                    {isAsexual && (
                      <>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">成活率(%)</th>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">生根率(%)</th>
                        <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">嫁接成活率(%)</th>
                      </>
                    )}
                    <th className="px-2 py-2 text-left font-semibold whitespace-nowrap">备注</th>
                    <th className="px-2 py-2 text-center font-semibold whitespace-nowrap w-24">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((r, index) => {
                    const isEditing = editingId === r.id;
                    return (
                      <tr key={r.id || index} className="hover:bg-gray-50">
                        {/* 日期 */}
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {isEditing ? (
                            <Input
                              type="datetime-local"
                              value={(editingRow.recordDate as string | undefined) ?? ''}
                              onChange={(e) => setEditingRow({ ...editingRow, recordDate: e.target.value })}
                              className="w-full px-1 py-0.5 text-xs border border-gray-400 rounded"
                            />
                          ) : (
                            (typeof r.recordDate === 'string' ? r.recordDate.slice(0, 16) : r.recordDate) || '-'
                          )}
                        </td>
                        {/* 阶段（badge 形式，不可编辑） */}
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${STAGE_COLORS[r.stage] || 'bg-gray-100 text-gray-600'}`}>
                            {STAGE_LABELS[r.stage] || r.stage}
                          </span>
                        </td>
                        {/* 温度 */}
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {isEditing ? renderNumberEditor('temperature', '0.1') : renderDisplayNumber(r.temperature, '℃')}
                        </td>
                        {/* 湿度 */}
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {isEditing ? renderNumberEditor('humidity', '0.1') : renderDisplayNumber(r.humidity, '%')}
                        </td>
                        {/* 操作员 */}
                        <td className="px-2 py-1.5 whitespace-nowrap">
                          {isEditing ? renderTextEditor('operator') : (r.operator || '-')}
                        </td>
                        {/* 异常 */}
                        <td className="px-2 py-1.5 text-amber-700 max-w-[160px]">
                          {isEditing ? renderTextEditor('abnormality') : (r.abnormality || '-')}
                        </td>

                        {/* === 育种专属列 === */}
                        {isBreeding && (
                          <>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? (
                                <Select
                                  value={editingRow.pollinationType || '__none__'}
                                  onValueChange={(val) => setEditingRow({
                                    ...editingRow,
                                    pollinationType: val === '__none__' ? undefined : val as any,
                                  })}
                                >
                                  <SelectTrigger className="text-xs h-7">
                                    <SelectValue placeholder="未设置" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="__none__">未设置</SelectItem>
                                    <SelectItem value="self">自花授粉</SelectItem>
                                    <SelectItem value="cross">异花授粉</SelectItem>
                                    <SelectItem value="open">开放授粉</SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (r.pollinationType || '-')}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderTextEditor('pollinatorCrop') : (r.pollinatorCrop || '-')}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderNumberEditor('flowerCount') : renderDisplayNumber(r.flowerCount)}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderNumberEditor('fruitSetCount') : renderDisplayNumber(r.fruitSetCount)}
                            </td>
                          </>
                        )}

                        {/* === 采收阶段（育种/留种） === */}
                        {(isBreeding || isSeedSaving) && (
                          <>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderNumberEditor('harvestSeedCount') : renderDisplayNumber(r.harvestSeedCount)}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderNumberEditor('seedWeight', '0.1') : renderDisplayNumber(r.seedWeight)}
                            </td>
                          </>
                        )}

                        {/* === 无性繁殖专属列 === */}
                        {isAsexual && (
                          <td className="px-2 py-1.5 whitespace-nowrap">
                            {isEditing ? renderNumberEditor('harvestPlantCount') : renderDisplayNumber(r.harvestPlantCount)}
                          </td>
                        )}

                        {/* === 质检（育种/留种） === */}
                        {(isBreeding || isSeedSaving) && (
                          <>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderNumberEditor('germinationRate', '0.1') : renderDisplayNumber(r.germinationRate)}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderNumberEditor('purity', '0.1') : renderDisplayNumber(r.purity)}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderNumberEditor('moisture', '0.1') : renderDisplayNumber(r.moisture)}
                            </td>
                          </>
                        )}

                        {/* === 质检（无性繁殖） === */}
                        {isAsexual && (
                          <>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderNumberEditor('survivalRate', '0.1') : renderDisplayNumber(r.survivalRate)}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderNumberEditor('rootedRate', '0.1') : renderDisplayNumber(r.rootedRate)}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {isEditing ? renderNumberEditor('graftSuccessRate', '0.1') : renderDisplayNumber(r.graftSuccessRate)}
                            </td>
                          </>
                        )}

                        {/* 备注 */}
                        <td className="px-2 py-1.5 text-gray-500 max-w-[160px] truncate">
                          {isEditing ? renderTextEditor('remarks') : (r.remarks || '-')}
                        </td>

                        {/* 操作列 */}
                        <td className="px-2 py-1.5 text-center whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleSaveEdit}
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                title="保存"
                              >
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelEdit}
                                className="text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                                title="取消"
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
                                title="编辑"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(r)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="删除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}