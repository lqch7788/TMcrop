/**
 * 2026-06-25 v3: 种植/育苗 通用记录弹窗
 * 根据 recordType 渲染不同字段：
 *   - 'breeding': 育种记录（父本/母本/世代/方法/性状）
 *   - 'seed_saving': 留种记录（株号/部位/数量）
 *   - 'propagation': 繁殖记录（仅 1:多 模式 — Phase 5 接入）
 *
 * 数据流：组件 → apiPlantingSubRecordService → API
 */

import { useState, useEffect, useCallback } from 'react';
import { UnifiedModal, Button, Input, Label, NumberInput, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, DatePicker, TextArea, Badge } from '@/components/ui';
import { Edit2, Trash2, Download, X, Sprout, Wheat, GitBranch } from 'lucide-react';
import { todayLocal } from '@/lib/dateUtils';
import { showAlert, showConfirm } from '@/lib/dialogService';
import {
  apiPlantingSubRecordService,
  type BreedingRecord,
  type SeedSavingRecord,
  type BreedingRecordInput,
  type SeedSavingRecordInput,
  type BreedingOperationType,
  type SeedSavingPart,
} from '@/services/apiPlantingSubRecordService';
import {
  apiSeedlingPropagationService,
  type PropagationRecord,
  type PropagationRecordInput,
} from '@/services/apiSeedlingPropagationService';
import * as XLSX from 'xlsx';

export type RecordType = 'breeding' | 'seed_saving' | 'propagation';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  recordType: RecordType;
  parentRecord: {
    id: string;
    plantCode?: string;   // 种植批号（breeding/seed_saving）
    seedlingCode?: string; // 育苗批号（propagation）
    cropName?: string;
  };
}

// ============ 文案映射 ============

const OPERATION_TYPE_LABELS: Record<BreedingOperationType, string> = {
  cross: '杂交',
  self: '自交',
  selection: '选育',
  backcross: '回交',
  marker: '标记',
  other: '其他',
};

const HARVEST_PART_LABELS: Record<SeedSavingPart, string> = {
  fruit: '果实',
  seed: '种子',
  whole_plant: '全株',
  root: '根',
  stem: '茎',
  leaf: '叶',
  other: '其他',
};

const OPERATION_TYPES: BreedingOperationType[] = ['cross', 'self', 'selection', 'backcross', 'marker', 'other'];
const HARVEST_PARTS: SeedSavingPart[] = ['fruit', 'seed', 'whole_plant', 'root', 'stem', 'leaf', 'other'];

const SEEDLING_STATUS_LABELS: Record<string, string> = {
  healthy: '健康',
  weak: '弱苗',
  diseased: '病害',
};

// ============ 工具：snake_case → camelCase 适配 ============

interface RawBreedingRow {
  id: string;
  planting_id: string;
  record_date: string;
  operation_type: BreedingOperationType;
  generation: string | null;
  parent_male_code: string | null;
  parent_male_source: string | null;
  parent_female_code: string | null;
  parent_female_source: string | null;
  operator: string | null;
  remarks: string | null;
  create_time: string;
}

function toBreedingRecord(raw: RawBreedingRow): BreedingRecord {
  return {
    id: raw.id,
    plantingId: raw.planting_id,
    recordDate: raw.record_date,
    operationType: raw.operation_type,
    generation: raw.generation,
    parentMaleCode: raw.parent_male_code,
    parentMaleSource: (raw.parent_male_source as BreedingRecord['parentMaleSource']) ?? null,
    parentFemaleCode: raw.parent_female_code,
    parentFemaleSource: (raw.parent_female_source as BreedingRecord['parentFemaleSource']) ?? null,
    operator: raw.operator,
    remarks: raw.remarks,
    createTime: raw.create_time,
  };
}

interface RawSeedSavingRow {
  id: string;
  planting_id: string;
  record_date: string;
  plant_marker: string;
  harvest_part: string | null;
  quantity: number | null;
  unit: string | null;
  operator: string | null;
  remarks: string | null;
  create_time: string;
}

function toSeedSavingRecord(raw: RawSeedSavingRow): SeedSavingRecord {
  return {
    id: raw.id,
    plantingId: raw.planting_id,
    recordDate: raw.record_date,
    plantMarker: raw.plant_marker,
    harvestPart: (raw.harvest_part as SeedSavingPart | null) ?? null,
    quantity: raw.quantity,
    unit: raw.unit,
    operator: raw.operator,
    remarks: raw.remarks,
    createTime: raw.create_time,
  };
}

// ============ 组件主体 ============

const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function RecordModal({
  isOpen,
  onClose,
  onSuccess,
  recordType,
  parentRecord,
}: RecordModalProps) {
  const [records, setRecords] = useState<BreedingRecord[] | SeedSavingRecord[] | PropagationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 表单数据
  const [propagationForm, setPropagationForm] = useState<PropagationRecordInput>({
    recordDate: todayLocal(),
    temperature: undefined,
    humidity: undefined,
    motherPlantCount: undefined,
    seedlingOutput: undefined,
    seedlingStatus: 'healthy',
    transplantPosition: '',
    operator: '',
    remarks: '',
  });
  const [breedingForm, setBreedingForm] = useState<BreedingRecordInput>({
    recordDate: todayLocal(),
    operationType: 'cross',
    generation: '',
    parentMaleCode: '',
    parentMaleSource: 'free',
    parentFemaleCode: '',
    parentFemaleSource: 'free',
    operator: '',
    remarks: '',
  });
  const [seedSavingForm, setSeedSavingForm] = useState<SeedSavingRecordInput>({
    recordDate: todayLocal(),
    plantMarker: '',
    harvestPart: 'seed',
    quantity: undefined,
    unit: '',
    operator: '',
    remarks: '',
  });

  // 加载历史
  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      if (recordType === 'breeding') {
        const list = await apiPlantingSubRecordService.listBreedingRecords(parentRecord.id);
        setRecords(list);
      } else if (recordType === 'seed_saving') {
        const list = await apiPlantingSubRecordService.listSeedSavingRecords(parentRecord.id);
        setRecords(list);
      } else {
        const list = await apiSeedlingPropagationService.list(parentRecord.id);
        setRecords(list);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : '加载失败';
      await showAlert(`加载记录失败：${msg}`);
    } finally {
      setLoading(false);
    }
  }, [recordType, parentRecord.id]);

  useEffect(() => {
    if (isOpen) {
      void loadHistory();
      // 重置表单
      if (recordType === 'breeding') {
        setBreedingForm({
          recordDate: todayLocal(),
          operationType: 'cross',
          generation: '',
          parentMaleCode: '',
          parentMaleSource: 'free',
          parentFemaleCode: '',
          parentFemaleSource: 'free',
          operator: '',
          remarks: '',
        });
      } else if (recordType === 'seed_saving') {
        setSeedSavingForm({
          recordDate: todayLocal(),
          plantMarker: '',
          harvestPart: 'seed',
          quantity: undefined,
          unit: '',
          operator: '',
          remarks: '',
        });
      } else {
        setPropagationForm({
          recordDate: todayLocal(),
          temperature: undefined,
          humidity: undefined,
          motherPlantCount: undefined,
          seedlingOutput: undefined,
          seedlingStatus: 'healthy',
          transplantPosition: '',
          operator: '',
          remarks: '',
        });
      }
      setEditingId(null);
    }
  }, [isOpen, loadHistory, recordType]);

  // 提交
  const handleSubmit = async () => {
    try {
      if (recordType === 'propagation') {
        if (!propagationForm.recordDate) { await showAlert('请选择记录日期'); return; }
        await apiSeedlingPropagationService.create(parentRecord.id, propagationForm);
      } else if (recordType === 'breeding') {
        // 校验
        if (!breedingForm.recordDate) {
          await showAlert('请选择记录日期');
          return;
        }
        if ((breedingForm.operationType === 'cross' || breedingForm.operationType === 'backcross') && !breedingForm.parentMaleCode) {
          await showAlert('杂交/回交时父本编码必填');
          return;
        }
        if (breedingForm.parentMaleCode && breedingForm.parentFemaleCode && breedingForm.parentMaleCode === breedingForm.parentFemaleCode) {
          await showAlert('父本编码不能与母本编码相同');
          return;
        }
        await apiPlantingSubRecordService.createBreedingRecord(parentRecord.id, breedingForm);
      } else {
        if (!seedSavingForm.recordDate) {
          await showAlert('请选择记录日期');
          return;
        }
        if (!seedSavingForm.plantMarker) {
          await showAlert('请输入留种株号');
          return;
        }
        await apiPlantingSubRecordService.createSeedSavingRecord(parentRecord.id, seedSavingForm);
      }
      await loadHistory();
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '添加失败';
      await showAlert(`添加失败：${msg}`);
    }
  };

  // 删除
  const handleDelete = async (recordId: string) => {
    const ok = await showConfirm('确定删除这条记录？');
    if (!ok) return;
    try {
      if (recordType === 'propagation') {
        await apiSeedlingPropagationService.delete(parentRecord.id, recordId);
      } else if (recordType === 'breeding') {
        await apiPlantingSubRecordService.deleteBreedingRecord(parentRecord.id, recordId);
      } else {
        await apiPlantingSubRecordService.deleteSeedSavingRecord(parentRecord.id, recordId);
      }
      await loadHistory();
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '删除失败';
      await showAlert(`删除失败：${msg}`);
    }
  };

  // 编辑（行内）
  const handleStartEdit = (record: BreedingRecord | SeedSavingRecord | PropagationRecord) => {
    setEditingId(record.id);
    if (recordType === 'propagation') {
      const pr = record as PropagationRecord;
      setPropagationForm({
        recordDate: pr.recordDate,
        temperature: pr.temperature,
        humidity: pr.humidity,
        motherPlantCount: pr.motherPlantCount,
        seedlingOutput: pr.seedlingOutput,
        seedlingStatus: pr.seedlingStatus,
        transplantPosition: pr.transplantPosition,
        operator: pr.operator,
        remarks: pr.remarks,
      });
    } else if (recordType === 'breeding') {
      const br = record as BreedingRecord;
      setBreedingForm({
        recordDate: br.recordDate,
        operationType: br.operationType,
        generation: br.generation ?? '',
        parentMaleCode: br.parentMaleCode ?? '',
        parentMaleSource: br.parentMaleSource ?? 'free',
        parentFemaleCode: br.parentFemaleCode ?? '',
        parentFemaleSource: br.parentFemaleSource ?? 'free',
        operator: br.operator ?? '',
        remarks: br.remarks ?? '',
      });
    } else {
      const sr = record as SeedSavingRecord;
      setSeedSavingForm({
        recordDate: sr.recordDate,
        plantMarker: sr.plantMarker,
        harvestPart: sr.harvestPart ?? 'seed',
        quantity: sr.quantity ?? undefined,
        unit: sr.unit ?? '',
        operator: sr.operator ?? '',
        remarks: sr.remarks ?? '',
      });
    }
  };

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      if (recordType === 'propagation') {
        await apiSeedlingPropagationService.update(parentRecord.id, editingId, propagationForm);
      } else if (recordType === 'breeding') {
        if ((breedingForm.operationType === 'cross' || breedingForm.operationType === 'backcross') && !breedingForm.parentMaleCode) {
          await showAlert('杂交/回交时父本编码必填');
          return;
        }
        if (breedingForm.parentMaleCode && breedingForm.parentFemaleCode && breedingForm.parentMaleCode === breedingForm.parentFemaleCode) {
          await showAlert('父本编码不能与母本编码相同');
          return;
        }
        await apiPlantingSubRecordService.updateBreedingRecord(parentRecord.id, editingId, breedingForm);
      } else {
        if (!seedSavingForm.plantMarker) {
          await showAlert('请输入留种株号');
          return;
        }
        await apiPlantingSubRecordService.updateSeedSavingRecord(parentRecord.id, editingId, seedSavingForm);
      }
      setEditingId(null);
      await loadHistory();
      onSuccess?.();
    } catch (error) {
      const msg = error instanceof Error ? error.message : '更新失败';
      await showAlert(`更新失败：${msg}`);
    }
  };

  // 导出 XLSX
  const handleExport = () => {
    if (records.length === 0) {
      void showAlert('没有记录可导出');
      return;
    }
    if (recordType === 'breeding') {
      const data = (records as BreedingRecord[]).map((r) => ({
        '日期': r.recordDate,
        '操作类型': OPERATION_TYPE_LABELS[r.operationType] || r.operationType,
        '世代': r.generation || '',
        '父本编码': r.parentMaleCode || '',
        '父本来源': r.parentMaleSource || '',
        '母本编码': r.parentFemaleCode || '',
        '母本来源': r.parentFemaleSource || '',
        '操作人': r.operator || '',
        '备注': r.remarks || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '育种记录');
      XLSX.writeFile(wb, `育种记录_${parentRecord.plantCode ?? parentRecord.seedlingCode ?? ''}.xlsx`);
    } else if (recordType === 'seed_saving') {
      const data = (records as SeedSavingRecord[]).map((r) => ({
        '日期': r.recordDate,
        '留种株号': r.plantMarker,
        '采收部位': r.harvestPart ? (HARVEST_PART_LABELS[r.harvestPart] || r.harvestPart) : '',
        '数量': r.quantity ?? '',
        '单位': r.unit || '',
        '操作人': r.operator || '',
        '备注': r.remarks || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '留种记录');
      XLSX.writeFile(wb, `留种记录_${parentRecord.plantCode ?? ''}.xlsx`);
    } else {
      const data = (records as PropagationRecord[]).map((r) => ({
        '日期': r.recordDate,
        '温度(℃)': r.temperature ?? '',
        '湿度(%)': r.humidity ?? '',
        '母株数量': r.motherPlantCount ?? '',
        '子苗产出': r.seedlingOutput ?? '',
        '子苗状态': SEEDLING_STATUS_LABELS[r.seedlingStatus ?? ''] ?? r.seedlingStatus ?? '',
        '移栽位置': r.transplantPosition ?? '',
        '操作人': r.operator || '',
        '备注': r.remarks || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '繁殖记录');
      XLSX.writeFile(wb, `繁殖记录_${parentRecord.seedlingCode ?? ''}.xlsx`);
    }
  };

  const parentCode = parentRecord.plantCode || parentRecord.seedlingCode || '';

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        recordType === 'propagation'
          ? `繁殖记录 - ${parentCode}`
          : recordType === 'breeding'
          ? `育种记录 - ${parentCode}`
          : `留种记录 - ${parentRecord.plantCode}`
      }
      size="xxxl"
      showFooter={true}
      onSubmit={editingId ? handleSaveEdit : handleSubmit}
      submitText={editingId ? '保存修改' : '添加记录'}
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* 添加/编辑表单 */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
            {recordType === 'propagation' ? (
              <><GitBranch className="w-4 h-4 text-indigo-600" />{editingId ? '编辑繁殖记录' : '添加繁殖记录'}</>
            ) : recordType === 'breeding' ? (
              <><Sprout className="w-4 h-4 text-emerald-600" />{editingId ? '编辑育种记录' : '添加育种记录'}</>
            ) : (
              <><Wheat className="w-4 h-4 text-amber-600" />{editingId ? '编辑留种记录' : '添加留种记录'}</>
            )}
            {editingId && (
              <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="ml-auto text-gray-500">
                <X className="w-4 h-4 mr-1" />取消编辑
              </Button>
            )}
          </h4>

          {recordType === 'propagation' ? (
            <PropagationFields form={propagationForm} onChange={setPropagationForm} deepInputClass={deepInputClass} />
          ) : recordType === 'breeding' ? (
            <BreedingFields form={breedingForm} onChange={setBreedingForm} deepInputClass={deepInputClass} />
          ) : (
            <SeedSavingFields form={seedSavingForm} onChange={setSeedSavingForm} deepInputClass={deepInputClass} />
          )}
        </div>

        {/* 历史记录列表 */}
        <div>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
            <h4 className="text-sm font-semibold text-gray-900">
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
          ) : recordType === 'propagation' ? (
            <PropagationHistoryTable
              records={records as PropagationRecord[]}
              editingId={editingId}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
            />
          ) : recordType === 'breeding' ? (
            <BreedingHistoryTable
              records={records as BreedingRecord[]}
              editingId={editingId}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
            />
          ) : (
            <SeedSavingHistoryTable
              records={records as SeedSavingRecord[]}
              editingId={editingId}
              onEdit={handleStartEdit}
              onDelete={handleDelete}
            />
          )}
        </div>
      </div>
    </UnifiedModal>
  );
}

// ============ 子组件：BreedingFields ============

interface BreedingFieldsProps {
  form: BreedingRecordInput;
  onChange: (form: BreedingRecordInput) => void;
  deepInputClass: string;
}

function BreedingFields({ form, onChange, deepInputClass }: BreedingFieldsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label className="text-gray-700">记录日期 *</Label>
        <DatePicker className="w-full"
          selected={form.recordDate ? new Date(form.recordDate) : undefined}
          onChange={(date) => onChange({ ...form, recordDate: todayLocal(date) })}
        />
      </div>
      <div>
        <Label className="text-gray-700">操作类型 *</Label>
        <Select
          value={form.operationType}
          onValueChange={(v) => onChange({ ...form, operationType: v as BreedingOperationType })}
        >
          <SelectTrigger className={deepInputClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OPERATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{OPERATION_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-gray-700">世代</Label>
        <Input
          value={form.generation ?? ''}
          onChange={(e) => onChange({ ...form, generation: e.target.value })}
          placeholder="如 F1 / F2 / BC1"
          className={deepInputClass}
        />
      </div>
      <div className="col-span-3">
        <div className="text-xs font-medium text-gray-700 mb-1">父本 *（杂交/回交必填）</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Input
              value={form.parentMaleCode ?? ''}
              onChange={(e) => onChange({ ...form, parentMaleCode: e.target.value })}
              placeholder="父本编码（关联品种编码 / 父本种植编号 / 自由填写）"
              className={deepInputClass}
            />
          </div>
          <Select
            value={form.parentMaleSource ?? 'free'}
            onValueChange={(v) => onChange({ ...form, parentMaleSource: v as BreedingRecord['parentMaleSource'] })}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seed_source">种源库编码</SelectItem>
              <SelectItem value="planting">种植批号</SelectItem>
              <SelectItem value="free">自由填写</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="col-span-3">
        <div className="text-xs font-medium text-gray-700 mb-1">母本</div>
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">
            <Input
              value={form.parentFemaleCode ?? ''}
              onChange={(e) => onChange({ ...form, parentFemaleCode: e.target.value })}
              placeholder="母本编码（默认本批种植，可填种源库编码）"
              className={deepInputClass}
            />
          </div>
          <Select
            value={form.parentFemaleSource ?? 'free'}
            onValueChange={(v) => onChange({ ...form, parentFemaleSource: v as BreedingRecord['parentFemaleSource'] })}
          >
            <SelectTrigger className={deepInputClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="seed_source">种源库编码</SelectItem>
              <SelectItem value="planting">种植批号</SelectItem>
              <SelectItem value="free">自由填写</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-gray-700">操作人</Label>
        <Input
          value={form.operator ?? ''}
          onChange={(e) => onChange({ ...form, operator: e.target.value })}
          placeholder="操作员姓名"
          className={deepInputClass}
        />
      </div>
      <div className="col-span-2">
        <Label className="text-gray-700">备注</Label>
        <TextArea
          value={form.remarks ?? ''}
          onChange={(e) => onChange({ ...form, remarks: e.target.value })}
          rows={1}
          placeholder="目标性状、过程记录等"
          className={deepInputClass}
        />
      </div>
    </div>
  );
}

// ============ 子组件：SeedSavingFields ============

interface SeedSavingFieldsProps {
  form: SeedSavingRecordInput;
  onChange: (form: SeedSavingRecordInput) => void;
  deepInputClass: string;
}

function SeedSavingFields({ form, onChange, deepInputClass }: SeedSavingFieldsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label className="text-gray-700">记录日期 *</Label>
        <DatePicker className="w-full"
          selected={form.recordDate ? new Date(form.recordDate) : undefined}
          onChange={(date) => onChange({ ...form, recordDate: todayLocal(date) })}
        />
      </div>
      <div className="col-span-2">
        <Label className="text-gray-700">留种株号 *</Label>
        <Input
          value={form.plantMarker}
          onChange={(e) => onChange({ ...form, plantMarker: e.target.value })}
          placeholder="例: A区第3排 #001-#050"
          className={deepInputClass}
        />
      </div>
      <div>
        <Label className="text-gray-700">采收部位</Label>
        <Select
          value={form.harvestPart ?? 'seed'}
          onValueChange={(v) => onChange({ ...form, harvestPart: v as SeedSavingPart })}
        >
          <SelectTrigger className={deepInputClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {HARVEST_PARTS.map((p) => (
              <SelectItem key={p} value={p}>{HARVEST_PART_LABELS[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-gray-700">数量</Label>
        <Input
          type="number"
          value={form.quantity ?? ''}
          onChange={(e) => onChange({ ...form, quantity: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="数量"
          className={deepInputClass}
        />
      </div>
      <div>
        <Label className="text-gray-700">单位</Label>
        <Input
          value={form.unit ?? ''}
          onChange={(e) => onChange({ ...form, unit: e.target.value })}
          placeholder="如 株 / 袋 / 克"
          className={deepInputClass}
        />
      </div>
      <div className="col-span-3">
        <Label className="text-gray-700">操作人</Label>
        <Input
          value={form.operator ?? ''}
          onChange={(e) => onChange({ ...form, operator: e.target.value })}
          placeholder="操作员姓名"
          className={deepInputClass}
        />
      </div>
      <div className="col-span-3">
        <Label className="text-gray-700">备注</Label>
        <TextArea
          value={form.remarks ?? ''}
          onChange={(e) => onChange({ ...form, remarks: e.target.value })}
          rows={1}
          placeholder="其他说明"
          className={deepInputClass}
        />
      </div>
    </div>
  );
}

// ============ 历史记录表 ============

interface HistoryTableProps<R> {
  records: R[];
  editingId: string | null;
  onEdit: (record: R) => void;
  onDelete: (recordId: string) => void;
}

function BreedingHistoryTable({ records, editingId, onEdit, onDelete }: HistoryTableProps<BreedingRecord>) {
  return (
    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-blue-500 text-white sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left">日期</th>
            <th className="px-2 py-2 text-left">操作</th>
            <th className="px-2 py-2 text-left">世代</th>
            <th className="px-2 py-2 text-left">父本</th>
            <th className="px-2 py-2 text-left">母本</th>
            <th className="px-2 py-2 text-left">操作人</th>
            <th className="px-2 py-2 text-left">备注</th>
            <th className="px-2 py-2 text-center w-24">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-2 py-1.5 whitespace-nowrap">{r.recordDate}</td>
              <td className="px-2 py-1.5">{OPERATION_TYPE_LABELS[r.operationType] || r.operationType}</td>
              <td className="px-2 py-1.5">{r.generation || '-'}</td>
              <td className="px-2 py-1.5 font-mono text-xs">
                {r.parentMaleCode ? (
                  <Badge variant="outline" className="text-xs">
                    {r.parentMaleCode} <span className="text-gray-400 ml-1">({r.parentMaleSource || 'free'})</span>
                  </Badge>
                ) : '-'}
              </td>
              <td className="px-2 py-1.5 font-mono text-xs">
                {r.parentFemaleCode ? (
                  <Badge variant="outline" className="text-xs">
                    {r.parentFemaleCode} <span className="text-gray-400 ml-1">({r.parentFemaleSource || 'free'})</span>
                  </Badge>
                ) : '-'}
              </td>
              <td className="px-2 py-1.5">{r.operator || '-'}</td>
              <td className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]">{r.remarks || '-'}</td>
              <td className="px-2 py-1.5 text-center">
                {editingId === r.id ? (
                  <span className="text-xs text-amber-600">编辑中</span>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(r)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
  );
}

function SeedSavingHistoryTable({ records, editingId, onEdit, onDelete }: HistoryTableProps<SeedSavingRecord>) {
  return (
    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-blue-500 text-white sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left">日期</th>
            <th className="px-2 py-2 text-left">留种株号</th>
            <th className="px-2 py-2 text-left">采收部位</th>
            <th className="px-2 py-2 text-left">数量</th>
            <th className="px-2 py-2 text-left">单位</th>
            <th className="px-2 py-2 text-left">操作人</th>
            <th className="px-2 py-2 text-left">备注</th>
            <th className="px-2 py-2 text-center w-24">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-2 py-1.5 whitespace-nowrap">{r.recordDate}</td>
              <td className="px-2 py-1.5 font-mono text-amber-700">{r.plantMarker}</td>
              <td className="px-2 py-1.5">{r.harvestPart ? (HARVEST_PART_LABELS[r.harvestPart] || r.harvestPart) : '-'}</td>
              <td className="px-2 py-1.5">{r.quantity ?? '-'}</td>
              <td className="px-2 py-1.5">{r.unit || '-'}</td>
              <td className="px-2 py-1.5">{r.operator || '-'}</td>
              <td className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]">{r.remarks || '-'}</td>
              <td className="px-2 py-1.5 text-center">
                {editingId === r.id ? (
                  <span className="text-xs text-amber-600">编辑中</span>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(r)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
  );
}

// ============ 子组件：PropagationFields ============

interface PropagationFieldsProps {
  form: PropagationRecordInput;
  onChange: (form: PropagationRecordInput) => void;
  deepInputClass: string;
}

function PropagationFields({ form, onChange, deepInputClass }: PropagationFieldsProps) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <Label className="text-gray-700">记录日期 *</Label>
        <DatePicker className="w-full"
          selected={form.recordDate ? new Date(form.recordDate) : undefined}
          onChange={(date) => onChange({ ...form, recordDate: todayLocal(date) })}
        />
      </div>
      <div>
        <Label className="text-gray-700">温度（℃）</Label>
        <Input type="number" value={form.temperature ?? ''}
          onChange={(e) => onChange({ ...form, temperature: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="环境温度" className={deepInputClass} />
      </div>
      <div>
        <Label className="text-gray-700">湿度（%）</Label>
        <Input type="number" value={form.humidity ?? ''}
          onChange={(e) => onChange({ ...form, humidity: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="环境湿度" className={deepInputClass} />
      </div>
      <div>
        <Label className="text-gray-700">母株数量</Label>
        <NumberInput value={String(form.motherPlantCount ?? '')}
          onChange={(v) => onChange({ ...form, motherPlantCount: v ? parseInt(v, 10) : undefined })}
          placeholder="当前母株总数" className={deepInputClass} />
      </div>
      <div>
        <Label className="text-gray-700">子苗产出</Label>
        <NumberInput value={String(form.seedlingOutput ?? '')}
          onChange={(v) => onChange({ ...form, seedlingOutput: v ? parseInt(v, 10) : undefined })}
          placeholder="当日新产子苗数" className={deepInputClass} />
      </div>
      <div>
        <Label className="text-gray-700">子苗状态</Label>
        <Select value={form.seedlingStatus ?? 'healthy'}
          onValueChange={(v) => onChange({ ...form, seedlingStatus: v as PropagationRecordInput['seedlingStatus'] })}>
          <SelectTrigger className={deepInputClass}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="healthy">健康</SelectItem>
            <SelectItem value="weak">弱苗</SelectItem>
            <SelectItem value="diseased">病害</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="col-span-3">
        <Label className="text-gray-700">移栽位置</Label>
        <Input value={form.transplantPosition ?? ''}
          onChange={(e) => onChange({ ...form, transplantPosition: e.target.value })}
          placeholder="如温室B区 / 3号苗床" className={deepInputClass} />
      </div>
      <div>
        <Label className="text-gray-700">操作人</Label>
        <Input value={form.operator ?? ''}
          onChange={(e) => onChange({ ...form, operator: e.target.value })}
          placeholder="操作员姓名" className={deepInputClass} />
      </div>
      <div className="col-span-2">
        <Label className="text-gray-700">备注</Label>
        <TextArea value={form.remarks ?? ''}
          onChange={(e) => onChange({ ...form, remarks: e.target.value })}
          rows={1} placeholder="异常情况、病虫害等" className={deepInputClass} />
      </div>
    </div>
  );
}

// ============ Propagation 历史记录表 ============

function PropagationHistoryTable({ records, editingId, onEdit, onDelete }: HistoryTableProps<PropagationRecord>) {
  return (
    <div className="max-h-80 overflow-y-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="bg-blue-500 text-white sticky top-0">
          <tr>
            <th className="px-2 py-2 text-left">日期</th>
            <th className="px-2 py-2 text-left">温度</th>
            <th className="px-2 py-2 text-left">湿度</th>
            <th className="px-2 py-2 text-left">母株</th>
            <th className="px-2 py-2 text-left">子苗</th>
            <th className="px-2 py-2 text-left">状态</th>
            <th className="px-2 py-2 text-left">移栽位置</th>
            <th className="px-2 py-2 text-left">操作人</th>
            <th className="px-2 py-2 text-left">备注</th>
            <th className="px-2 py-2 text-center w-24">操作</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {records.map((r) => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-2 py-1.5 whitespace-nowrap">{r.recordDate}</td>
              <td className="px-2 py-1.5">{r.temperature != null ? `${r.temperature}℃` : '-'}</td>
              <td className="px-2 py-1.5">{r.humidity != null ? `${r.humidity}%` : '-'}</td>
              <td className="px-2 py-1.5">{r.motherPlantCount ?? '-'}</td>
              <td className="px-2 py-1.5 text-emerald-600 font-medium">{r.seedlingOutput ?? '-'}</td>
              <td className="px-2 py-1.5">
                {r.seedlingStatus ? (
                  <Badge variant="outline" className="text-xs">{SEEDLING_STATUS_LABELS[r.seedlingStatus] || r.seedlingStatus}</Badge>
                ) : '-'}
              </td>
              <td className="px-2 py-1.5 text-gray-500 truncate max-w-[120px]">{r.transplantPosition || '-'}</td>
              <td className="px-2 py-1.5">{r.operator || '-'}</td>
              <td className="px-2 py-1.5 text-gray-500 truncate max-w-[200px]">{r.remarks || '-'}</td>
              <td className="px-2 py-1.5 text-center">
                {editingId === r.id ? (
                  <span className="text-xs text-amber-600">编辑中</span>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(r)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(r.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
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
  );
}
// Helper functions available via direct import from this file
