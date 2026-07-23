/**
 * 2026-07-04 v2 育苗繁殖记录弹窗（完整版）
 *
 * 与种植/RecordModal 的 asexual 分支 100% 对齐：
 * - 顶部繁殖模式切换 banner（默认无性）
 * - 完整繁殖字段：操作人 / 操作类型 / 世代 / 母株编码 / 繁殖方式
 * - 目标性状（多选）
 * - 无性繁殖指标：接种数 / 成活数 / 繁殖系数（派生）
 * - 通用字段：日期 / 温度 / 湿度 / 子苗状态 / 移栽位置 / 备注
 * - 历史表 / XLSX 导出 / readOnly 模式
 *
 * 数据：apiSeedlingPropagationService（写入 propagation_records 表，关联 seedling_id）
 * 复用常量：recordModalConstants / BreedingFields deepInputClass
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { UnifiedModal, Button } from '@/components/ui';
import { Download, Lock, GitBranch, X, Sprout, Pencil, Trash2 } from 'lucide-react';
import { Seedling } from '../../../../types/crop';
import { todayLocal } from '@/lib/dateUtils';
import { showAlert, showConfirm } from '@/lib/dialogService';
import {
  apiSeedlingPropagationService,
  type SeedlingSeedlingPropagationRecord,
  type SeedlingPropagationRecordInput,
  type AsexualOperationType,
  type ReproductionMode,
} from '@/services/apiSeedlingPropagationService';
import {
  ASEXUAL_OPERATION_TYPES,
  OPERATION_TYPE_LABELS,
  PROPAGATION_METHOD_LABELS,
  GENERATION_OPTIONS,
  TARGET_TRAIT_OPTIONS,
  getRateColor,
} from '../../planting/modals/recordModalConstants';
import { OPERATORS } from '@/data/cropData';
import { deepInputClass as inputClass } from '../../planting/modals/BreedingFields';
import * as XLSX from 'xlsx';
import { Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker, TextArea } from '@/components/ui';

interface SeedlingPropagationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  record: Seedling;
  /** 只读模式：已结束的育苗禁用新增/编辑/删除 */
  readOnly?: boolean;
}

// 继承 BreedingFields 的 deepInputClass 样式
const deepInputClass = inputClass;

const EMPTY_FORM: SeedlingPropagationRecordInput = {
  recordDate: todayLocal(),
  operationType: 'cutting',
  reproductionMode: 'asexual',
  generation: '',
  motherPlantCode: '',
  propagationMethod: undefined,
  inoculationCount: undefined,
  survivalCountAsexual: undefined,
  targetTraits: [],
  temperature: undefined,
  humidity: undefined,
  seedlingStatus: 'healthy',
  transplantPosition: '',
  operator: '',
  remarks: '',
};

export function SeedlingPropagationModal({
  isOpen,
  onClose,
  onSuccess,
  record,
  readOnly = false,
}: SeedlingPropagationModalProps) {
  const [records, setRecords] = useState<SeedlingPropagationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SeedlingPropagationRecordInput>(EMPTY_FORM);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiSeedlingPropagationService.list(String(record.id));
      setRecords(Array.isArray(list) ? list : []);
    } catch (error) {
      const msg = error instanceof Error ? error.message : '加载失败';
      await showAlert(`加载繁殖记录失败：${msg}`);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [record.id]);

  useEffect(() => {
    if (isOpen) {
      void loadHistory();
      setForm(EMPTY_FORM);
      setEditingId(null);
    }
  }, [isOpen, loadHistory]);

  const handleSubmit = async () => {
    if (readOnly) {
      await showAlert('该育苗已结束，无法新增记录');
      return;
    }
    if (!form.recordDate) {
      await showAlert('请选择记录日期');
      return;
    }
    try {
      await apiSeedlingPropagationService.create(String(record.id), form);
      await loadHistory();
      setForm({ ...EMPTY_FORM, recordDate: todayLocal() });
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '添加失败';
      await showAlert(`添加失败：${msg}`);
    }
  };

  const handleStartEdit = (r: SeedlingPropagationRecord) => {
    if (readOnly) return;
    setEditingId(r.id);
    setForm({
      recordDate: r.recordDate,
      operationType: r.operationType ?? 'cutting',
      reproductionMode: (r.reproductionMode ?? 'asexual') as ReproductionMode,
      generation: r.generation ?? '',
      motherPlantCode: r.motherPlantCode ?? '',
      propagationMethod: r.propagationMethod ?? undefined,
      inoculationCount: r.inoculationCount ?? undefined,
      survivalCountAsexual: r.survivalCountAsexual ?? undefined,
      targetTraits: r.targetTraits ?? [],
      temperature: r.temperature ?? undefined,
      humidity: r.humidity ?? undefined,
      seedlingStatus: r.seedlingStatus ?? 'healthy',
      transplantPosition: r.transplantPosition ?? '',
      operator: r.operator ?? '',
      remarks: r.remarks ?? '',
    });
  };

  const handleCancelEdit = () => setEditingId(null);

  const handleSaveEdit = async () => {
    if (readOnly || !editingId) return;
    try {
      await apiSeedlingPropagationService.update(String(record.id), editingId, form);
      setEditingId(null);
      await loadHistory();
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '更新失败';
      await showAlert(`更新失败：${msg}`);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (readOnly) {
      await showAlert('该育苗已结束，无法删除记录');
      return;
    }
    const ok = await showConfirm('确定删除这条繁殖记录？');
    if (!ok) return;
    try {
      await apiSeedlingPropagationService.delete(String(record.id), recordId);
      await loadHistory();
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '删除失败';
      await showAlert(`删除失败：${msg}`);
    }
  };

  // 繁殖系数（派生）
  const rate = useMemo(() => {
    const inoc = form.inoculationCount ?? 0;
    const surv = form.survivalCountAsexual ?? 0;
    if (inoc <= 0) return null;
    return (surv / inoc) * 100;
  }, [form.inoculationCount, form.survivalCountAsexual]);

  const handleExport = () => {
    if (records.length === 0) {
      void showAlert('没有记录可导出');
      return;
    }
    const data = records.map((r) => {
      const inoc = r.inoculationCount ?? 0;
      const surv = r.survivalCountAsexual ?? 0;
      const reproductionRate = inoc > 0 ? ((surv / inoc) * 100).toFixed(1) + '%' : '';
      return {
        '日期': r.recordDate,
        '操作类型': OPERATION_TYPE_LABELS[r.operationType as keyof typeof OPERATION_TYPE_LABELS] || r.operationType || '',
        '繁殖模式': r.reproductionMode === 'asexual' ? '无性' : '有性',
        '世代': r.generation || '',
        '母株编码': r.motherPlantCode || '',
        '繁殖方式': r.propagationMethod ? (PROPAGATION_METHOD_LABELS[r.propagationMethod as keyof typeof PROPAGATION_METHOD_LABELS] || r.propagationMethod) : '',
        '接种数': inoc || '',
        '成活数': surv || '',
        '繁殖系数': reproductionRate,
        '目标性状': (r.targetTraits || []).join('、'),
        '温度(℃)': r.temperature ?? '',
        '湿度(%)': r.humidity ?? '',
        '子苗状态': r.seedlingStatus ?? '',
        '移栽位置': r.transplantPosition || '',
        '操作人': r.operator || '',
        '备注': r.remarks || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '繁殖记录');
    XLSX.writeFile(wb, `繁殖记录_${record.seedlingCode}.xlsx`);
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`繁殖记录 - ${record.seedlingCode}${readOnly ? '（只读）' : ''}`}
      size="xxxl"
      showFooter={true}
      onSubmit={readOnly ? onClose : (editingId ? handleSaveEdit : handleSubmit)}
      submitText={
        readOnly
          ? '关闭'
          : editingId
          ? '保存修改'
          : '添加记录'
      }
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 只读模式横幅 */}
        {readOnly && (
          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg flex items-center gap-2">
            <Lock className="w-4 h-4 text-gray-600 shrink-0" />
            <span className="text-sm text-gray-700">该育苗已结束，繁殖记录处于<strong>只读模式</strong>（可查看、导出）</span>
          </div>
        )}

        {/* 添加 / 编辑表单 */}
        {!readOnly && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-600" />
              {editingId ? '编辑繁殖记录' : '添加繁殖记录'}
              {editingId && (
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="ml-auto text-gray-500">
                  <X className="w-4 h-4 mr-1" />取消编辑
                </Button>
              )}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Row 1：日期 / 操作人 / 操作类型 / 世代 */}
              <div>
                <Label className="text-gray-700">记录日期 <span className="text-red-500">*</span></Label>
                <DatePicker className="w-full"
                  selected={form.recordDate ? new Date(form.recordDate) : undefined}
                  onChange={(date) => setForm({ ...form, recordDate: todayLocal(date) })}
                />
              </div>
              <div>
                <Label className="text-gray-700">操作人</Label>
                <Select
                  value={form.operator ?? ''}
                  onValueChange={(v) => setForm({ ...form, operator: v })}
                >
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="请选择操作人" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-700">操作类型 <span className="text-red-500">*</span></Label>
                <Select
                  value={String(form.operationType ?? 'cutting')}
                  onValueChange={(v) => setForm({ ...form, operationType: v as AsexualOperationType })}
                >
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ASEXUAL_OPERATION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{OPERATION_TYPE_LABELS[t]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-700">世代</Label>
                <Select
                  value={form.generation ?? ''}
                  onValueChange={(v) => setForm({ ...form, generation: v })}
                >
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="请选择世代（如 F1/BC1/G1）" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {(() => {
                      const groups = Array.from(new Set(GENERATION_OPTIONS.map((o) => o.group)));
                      return groups.map((g) => (
                        <div key={g}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b border-gray-100">
                            {g}
                          </div>
                          {GENERATION_OPTIONS.filter((o) => o.group === g).map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </div>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>

              {/* Row 2：母株编码 / 繁殖方式 / 温度 / 湿度 */}
              <div>
                <Label className="text-gray-700">
                  母株编码 <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.motherPlantCode ?? ''}
                  onChange={(e) => setForm({ ...form, motherPlantCode: e.target.value })}
                  placeholder="母株编号（单亲来源：本株是克隆源）"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-700">
                  繁殖方式 <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.propagationMethod ?? undefined}
                  onValueChange={(v) => setForm({ ...form, propagationMethod: v as any })}
                >
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="请选择繁殖方式" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PROPAGATION_METHOD_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-700">温度（℃）</Label>
                <Input type="number" step="0.1" value={form.temperature ?? ''}
                  onChange={(e) => setForm({ ...form, temperature: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="环境温度" className={deepInputClass} />
              </div>
              <div>
                <Label className="text-gray-700">湿度（%）</Label>
                <Input type="number" step="0.1" value={form.humidity ?? ''}
                  onChange={(e) => setForm({ ...form, humidity: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="环境湿度" className={deepInputClass} />
              </div>

              {/* Row 3：移栽位置 / 子苗状态 / 占位 */}
              <div>
                <Label className="text-gray-700">移栽位置</Label>
                <Input value={form.transplantPosition ?? ''}
                  onChange={(e) => setForm({ ...form, transplantPosition: e.target.value })}
                  placeholder="如 温室B区 / 3号苗床" className={deepInputClass} />
              </div>
              <div>
                <Label className="text-gray-700">子苗状态</Label>
                <Select
                  value={form.seedlingStatus ?? 'healthy'}
                  onValueChange={(v) => setForm({ ...form, seedlingStatus: v as any })}
                >
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthy">健康</SelectItem>
                    <SelectItem value="weak">弱苗</SelectItem>
                    <SelectItem value="diseased">病害</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2"></div>

              {/* Row 4：目标性状（多选 chip） */}
              <div className="col-span-4">
                <Label className="text-gray-700">目标性状（多选）</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {TARGET_TRAIT_OPTIONS.map((trait) => {
                    const selected = (form.targetTraits || []).includes(trait);
                    return (
                      <label
                        key={trait}
                        title={`目标性状：${trait}`}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded border cursor-pointer text-sm transition-colors ${
                          selected
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-medium'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5"
                          checked={selected}
                          onChange={(e) => {
                            const list = form.targetTraits || [];
                            setForm({
                              ...form,
                              targetTraits: e.target.checked
                                ? [...list, trait]
                                : list.filter((t) => t !== trait),
                            });
                          }}
                        />
                        {trait}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Row 5：接种数 / 成活数 / 繁殖系数（派生） */}
              <div>
                <Label className="text-gray-700" title="接种的插穗/接芽/外植体/球茎等数量">
                  接种数（个）
                </Label>
                <Input type="number" min="0" value={form.inoculationCount ?? ''}
                  onChange={(e) => setForm({ ...form, inoculationCount: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  title="接种的插穗/接芽/外植体/球茎等数量"
                  className={deepInputClass} />
                <div className="mt-1 text-xs text-gray-500 leading-relaxed">
                  接种的插穗 / 接芽 / 外植体 / 球茎等数量
                  <span className="ml-1 text-gray-400">（繁殖系数的基数）</span>
                </div>
              </div>
              <div>
                <Label className="text-gray-700" title="实际成活/生根/萌芽的数量">
                  成活数（个）
                </Label>
                <Input type="number" min="0" value={form.survivalCountAsexual ?? ''}
                  onChange={(e) => setForm({ ...form, survivalCountAsexual: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="0"
                  title="实际成活/生根/萌芽的数量"
                  className={deepInputClass} />
                <div className="mt-1 text-xs text-gray-500 leading-relaxed">
                  实际生根 / 成活 / 萌芽的苗数
                  <span className="ml-1 text-gray-400">（繁殖系数 = 成活数 ÷ 接种数）</span>
                </div>
              </div>
              <div>
                <Label className="text-gray-700" title="繁殖系数 = 成活数 ÷ 接种数">
                  繁殖系数（派生）
                </Label>
                <div
                  className={`px-4 py-3 border border-gray-300 rounded-lg text-sm shadow-inner flex items-center ${
                    rate !== null ? 'bg-emerald-50 text-emerald-700 font-medium' : 'bg-gray-50 text-gray-400'
                  }`}
                  title={`繁殖系数 = 成活数 ÷ 接种数 = ${form.survivalCountAsexual ?? 0} ÷ ${form.inoculationCount ?? 0}`}
                >
                  {rate === null ? (
                    <span>— （需先填接种数）</span>
                  ) : (
                    <span className={getRateColor(rate, 'asexual')}>
                      {rate.toFixed(1)}%
                      <span className="ml-2 text-xs text-gray-500 font-normal">
                        ({form.survivalCountAsexual ?? 0} / {form.inoculationCount ?? 0})
                      </span>
                    </span>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-500 leading-relaxed">
                  公式：繁殖系数 = 成活数 ÷ 接种数 × 100%
                  <span className="ml-1 text-gray-400">（≥ 80% 优良，50-80% 一般，&lt; 50% 偏低）</span>
                </div>
              </div>
              <div className="col-span-1"></div>

              {/* Row 6：备注 */}
              <div className="col-span-4">
                <Label className="text-gray-700">备注</Label>
                <TextArea
                  value={form.remarks ?? ''}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  rows={2}
                  placeholder="目标性状、过程记录、异常情况等"
                  className={deepInputClass}
                />
              </div>
            </div>
          </div>
        )}

        {/* 历史记录列表 */}
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-600" />
              历史记录 ({records.length} 条)
            </h4>
            <Button variant="default" size="sm" onClick={handleExport} disabled={records.length === 0} className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              导出
            </Button>
          </div>
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-emerald-500 text-white">
                  <tr>
                    <th className="px-2 py-2 text-left">日期</th>
                    <th className="px-2 py-2 text-left">操作类型</th>
                    <th className="px-2 py-2 text-left">世代</th>
                    <th className="px-2 py-2 text-left">母株编码</th>
                    <th className="px-2 py-2 text-left">繁殖方式</th>
                    <th className="px-2 py-2 text-left">接种数</th>
                    <th className="px-2 py-2 text-left">成活数</th>
                    <th className="px-2 py-2 text-left">繁殖系数</th>
                    <th className="px-2 py-2 text-left">目标性状</th>
                    <th className="px-2 py-2 text-left">子苗状态</th>
                    <th className="px-2 py-2 text-left">移栽位置</th>
                    <th className="px-2 py-2 text-left">操作人</th>
                    <th className="px-2 py-2 text-left">备注</th>
                    {!readOnly && <th className="px-2 py-2 text-center w-20">操作</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {records.map((r) => {
                    const inoc = r.inoculationCount ?? 0;
                    const surv = r.survivalCountAsexual ?? 0;
                    const rRate = inoc > 0 ? (surv / inoc) * 100 : null;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50">
                        <td className="px-2 py-1.5 whitespace-nowrap">{r.recordDate}</td>
                        <td className="px-2 py-1.5">{OPERATION_TYPE_LABELS[r.operationType as keyof typeof OPERATION_TYPE_LABELS] || r.operationType || '-'}</td>
                        <td className="px-2 py-1.5">{r.generation || '-'}</td>
                        <td className="px-2 py-1.5 font-mono text-emerald-700">{r.motherPlantCode || '-'}</td>
                        <td className="px-2 py-1.5">{r.propagationMethod ? (PROPAGATION_METHOD_LABELS[r.propagationMethod as keyof typeof PROPAGATION_METHOD_LABELS] || r.propagationMethod) : '-'}</td>
                        <td className="px-2 py-1.5">{inoc || '-'}</td>
                        <td className="px-2 py-1.5 text-emerald-600 font-medium">{surv || '-'}</td>
                        <td className="px-2 py-1.5">
                          {rRate !== null ? (
                            <span className={getRateColor(rRate, 'asexual')}>
                              {rRate.toFixed(1)}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-2 py-1.5 text-xs">
                          {(r.targetTraits || []).length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {(r.targetTraits || []).map((t) => (
                                <span key={t} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs">{t}</span>
                              ))}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.seedlingStatus === 'healthy' ? '健康' : r.seedlingStatus === 'weak' ? '弱苗' : r.seedlingStatus === 'diseased' ? '病害' : '-'}
                        </td>
                        <td className="px-2 py-1.5 text-gray-500 max-w-[120px] truncate" title={r.transplantPosition || ''}>
                          {r.transplantPosition || '-'}
                        </td>
                        <td className="px-2 py-1.5">{r.operator || '-'}</td>
                        <td className="px-2 py-1.5 text-gray-500 max-w-[160px] truncate" title={r.remarks || ''}>
                          {r.remarks || '-'}
                        </td>
                        {!readOnly && (
                          <td className="px-2 py-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleStartEdit(r)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" title="编辑">
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="删除">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        )}
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
