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
import { UnifiedModal, Button } from '@/components/ui';
import { Download, X, Sprout, Wheat, GitBranch } from 'lucide-react';
import { todayLocal } from '@/lib/dateUtils';
import { showAlert, showConfirm } from '@/lib/dialogService';
import {
  apiPlantingSubRecordService,
  type BreedingRecord,
  type SeedSavingRecord,
  type BreedingRecordInput,
  type SeedSavingRecordInput,
  type SeedSavingPart,
} from '@/services/apiPlantingSubRecordService';
import {
  apiSeedlingPropagationService,
  type SeedlingPropagationRecord,
  type PropagationRecordInput,
} from '@/services/apiSeedlingPropagationService';
import { OPERATION_TYPE_LABELS, ASEXUAL_OPERATION_TYPES, PROPAGATION_METHOD_LABELS } from './recordModalConstants'
import { validateBreedingForm } from './recordModalValidators'
import { validateSeedSavingForm } from './seedSavingConstants'
import {
  HARVEST_PART_LABELS, PURPOSE_LABEL_MAP, PROCESSING_LABEL_MAP,
  CONTAINER_LABEL_MAP, SEED_TREATMENT_LABEL_MAP, MATURITY_LABEL_MAP,
  SIZE_GRADE_LABEL_MAP, HEALTH_STATUS_LABEL_MAP, DORMANCY_LABEL_MAP,
} from './seedSavingConstants'
import { deepInputClass } from './BreedingFields'
import { BreedingFields } from './BreedingFields'
import { BreedingHistoryTable } from './BreedingHistoryTable'
import { SeedSavingFields } from './SeedSavingFields'
import { SeedSavingHistoryTable } from './SeedSavingHistoryTable'
import { PropagationFields } from './PropagationFields'
import { PropagationHistoryTable } from './PropagationHistoryTable'
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

export function RecordModal({
  isOpen,
  onClose,
  onSuccess,
  recordType,
  parentRecord,
}: RecordModalProps) {
  const [records, setRecords] = useState<BreedingRecord[] | SeedSavingRecord[] | SeedlingPropagationRecord[]>([]);
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
    targetTraits: [],
    fruitCount: 0,
    seedCount: 0,
    pollinatedFlowerCount: 0,
    // 2026-07-03 v5：无性繁殖已迁移至育苗，以下字段保留兼容历史数据
  });
  const [seedSavingForm, setSeedSavingForm] = useState<SeedSavingRecordInput & { preservationMode?: 'seed' | 'vegetative' }>({
    recordDate: todayLocal(),
    plantMarker: '',
    harvestPart: 'seed',
    quantity: undefined,
    unit: '',
    operator: '',
    remarks: '',
    preservationMode: 'seed',
    lotNumber: '', purpose: undefined, processingMethod: undefined,
    storageLocation: '', containerType: undefined,
    germinationRate: undefined, thousandSeedWeight: undefined, purity: undefined,
    moistureContent: undefined, seedTreatment: undefined, maturityStage: undefined,
    sizeGrade: undefined, budNodeCount: undefined, healthStatus: undefined, dormancyState: undefined,
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
          targetTraits: [],
          fruitCount: 0,
          seedCount: 0,
          pollinatedFlowerCount: 0,
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
          preservationMode: 'seed',
          lotNumber: '', purpose: undefined, processingMethod: undefined,
          storageLocation: '', containerType: undefined,
          germinationRate: undefined, thousandSeedWeight: undefined, purity: undefined,
          moistureContent: undefined, seedTreatment: undefined, maturityStage: undefined,
          sizeGrade: undefined, budNodeCount: undefined, healthStatus: undefined, dormancyState: undefined,
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
        // 2026-07-03 v3：共享校验
        const err = validateBreedingForm(breedingForm)
        if (err) { await showAlert(err); return }
        await apiPlantingSubRecordService.createBreedingRecord(parentRecord.id, breedingForm);
      } else {
        // 2026-07-03 v4：共享校验
        const ssErr = validateSeedSavingForm(seedSavingForm)
        if (ssErr) { await showAlert(ssErr); return }
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
  const handleStartEdit = (record: BreedingRecord | SeedSavingRecord | SeedlingPropagationRecord) => {
    setEditingId(record.id);
    if (recordType === 'propagation') {
      const pr = record as SeedlingPropagationRecord;
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
        targetTraits: br.targetTraits ?? [],
        fruitCount: br.fruitCount ?? 0,
        seedCount: br.seedCount ?? 0,
        pollinatedFlowerCount: br.pollinatedFlowerCount ?? 0,
      });
    } else {
      const sr = record as SeedSavingRecord;
      const isVeg = sr.preservationMode === 'vegetative'
      setSeedSavingForm({
        recordDate: sr.recordDate,
        plantMarker: sr.plantMarker,
        harvestPart: sr.harvestPart ?? 'seed',
        quantity: sr.quantity ?? undefined,
        unit: sr.unit ?? '',
        operator: sr.operator ?? '',
        remarks: sr.remarks ?? '',
        // v4
        preservationMode: isVeg ? 'vegetative' : 'seed',
        lotNumber: sr.lotNumber ?? '',
        purpose: sr.purpose ?? undefined,
        processingMethod: sr.processingMethod ?? undefined,
        storageLocation: sr.storageLocation ?? '',
        containerType: sr.containerType ?? undefined,
        germinationRate: sr.germinationRate ?? undefined,
        thousandSeedWeight: sr.thousandSeedWeight ?? undefined,
        purity: sr.purity ?? undefined,
        moistureContent: sr.moistureContent ?? undefined,
        seedTreatment: sr.seedTreatment ?? undefined,
        maturityStage: sr.maturityStage ?? undefined,
        sizeGrade: sr.sizeGrade ?? undefined,
        budNodeCount: sr.budNodeCount ?? undefined,
        healthStatus: sr.healthStatus ?? undefined,
        dormancyState: sr.dormancyState ?? undefined,
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
        // 2026-07-03 v3：共享校验
        const err = validateBreedingForm(breedingForm)
        if (err) { await showAlert(err); return }
        await apiPlantingSubRecordService.updateBreedingRecord(parentRecord.id, editingId, breedingForm);
      } else {
        const ssErr = validateSeedSavingForm(seedSavingForm)
        if (ssErr) { await showAlert(ssErr); return }
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
        '父本来源': r.parentMaleSource === 'seed_source' ? '种源库编码' : r.parentMaleSource === 'planting' ? '种植批号' : r.parentMaleSource || '自由填写',
        '母本编码': r.parentFemaleCode || '',
        '母本来源': r.parentFemaleSource === 'seed_source' ? '种源库编码' : r.parentFemaleSource === 'planting' ? '种植批号' : r.parentFemaleSource || '自由填写',
        '结实数': r.fruitCount ?? '',
        '收获种子数': r.seedCount ?? '',
        '授粉花数': r.pollinatedFlowerCount ?? '',
        '结实率': r.pollinatedFlowerCount && r.pollinatedFlowerCount > 0 ? `${(((r.fruitCount || 0) / r.pollinatedFlowerCount) * 100).toFixed(1)}%` : '',
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
        '留种批次号': r.lotNumber || '',
        '留种株号': r.plantMarker,
        '保存模式': r.preservationMode === 'vegetative' ? '营养体' : '种子',
        '采收部位': r.harvestPart ? (HARVEST_PART_LABELS[r.harvestPart] || r.harvestPart) : '',
        '数量': r.quantity ?? '',
        '单位': r.unit || '',
        '用途': r.purpose ? PURPOSE_LABEL_MAP[r.purpose] || r.purpose : '',
        '处理方式': r.processingMethod ? PROCESSING_LABEL_MAP[r.processingMethod] || r.processingMethod : '',
        '存储位置': r.storageLocation || '',
        '容器类型': r.containerType ? CONTAINER_LABEL_MAP[r.containerType] || r.containerType : '',
        '发芽率(%)': r.germinationRate ?? '',
        '千粒重(g)': r.thousandSeedWeight ?? '',
        '纯度(%)': r.purity ?? '',
        '含水率(%)': r.moistureContent ?? '',
        '种子处理': r.seedTreatment ? SEED_TREATMENT_LABEL_MAP[r.seedTreatment] || r.seedTreatment : '',
        '成熟度': r.maturityStage ? MATURITY_LABEL_MAP[r.maturityStage] || r.maturityStage : '',
        '规格等级': r.sizeGrade ? SIZE_GRADE_LABEL_MAP[r.sizeGrade] || r.sizeGrade : '',
        '芽眼/节数': r.budNodeCount ?? '',
        '检疫状态': r.healthStatus ? HEALTH_STATUS_LABEL_MAP[r.healthStatus] || r.healthStatus : '',
        '休眠状态': r.dormancyState ? DORMANCY_LABEL_MAP[r.dormancyState] || r.dormancyState : '',
        '操作人': r.operator || '',
        '备注': r.remarks || '',
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, '留种记录');
      XLSX.writeFile(wb, `留种记录_${parentRecord.plantCode ?? ''}.xlsx`);
    } else {
      const data = (records as SeedlingPropagationRecord[]).map((r) => ({
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
              records={records as SeedlingPropagationRecord[]}
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
