/**
 * 任务验收后补录投入品用量（P0-3）
 *
 * 设计要点：
 * - 走既有 useFertilizerStore.createItem / usePestControlStore.createItem
 * - 库存扣减与「库存不足」校验完全由服务端完成，这里不重复实现
 * - 补录是可选步骤，可「跳过」
 */
import { useEffect, useMemo, useState } from 'react';
import { Modal, Input, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
import { todayLocal } from '@/lib/dateUtils';
import {
  useFertilizerStore,
  usePestControlStore,
  useFertilizerLibraryStore,
  usePesticideLibraryStore,
  useAuthStore,
} from '@/stores';

export interface TaskInputUsageTarget {
  id: string;
  taskCode?: string;
  type?: string;
  typeName?: string;
  greenhouseName?: string;
  crop?: string;
}

interface TaskInputUsageModalProps {
  isOpen: boolean;
  task: TaskInputUsageTarget | null;
  onClose: () => void;
  onSaved: () => void;
}

const inputClass =
  'w-full h-10 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

/** 根据任务类型推断默认投入品类型 */
function inferKind(task: TaskInputUsageTarget | null): 'fertilizer' | 'pesticide' {
  const t = String(task?.type || '');
  if (/pest|植保|防治|农药/.test(t)) return 'pesticide';
  return 'fertilizer';
}

export function TaskInputUsageModal({ isOpen, task, onClose, onSaved }: TaskInputUsageModalProps) {
  const [kind, setKind] = useState<'fertilizer' | 'pesticide'>('fertilizer');
  const [specId, setSpecId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [dilutionRatio, setDilutionRatio] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fertilizerSpecs = useFertilizerLibraryStore((s) => s.items);
  const fetchFertilizerSpecs = useFertilizerLibraryStore((s) => s.fetchItems);
  const fertilizerLoading = useFertilizerLibraryStore((s) => s.isLoading);
  const pesticideSpecs = usePesticideLibraryStore((s) => s.items);
  const fetchPesticideSpecs = usePesticideLibraryStore((s) => s.fetchItems);
  const pesticideLoading = usePesticideLibraryStore((s) => s.isLoading);

  const currentUser = useAuthStore((s) => s.currentUser);
  const operatorName = currentUser?.realName || currentUser?.username || '';

  // 打开时按任务类型重置
  useEffect(() => {
    if (!isOpen) return;
    setKind(inferKind(task));
    setSpecId('');
    setQuantity('');
    setUnit('');
    setDilutionRatio('');
    setError(null);
  }, [isOpen, task]);

  // 按需加载规格库
  useEffect(() => {
    if (!isOpen) return;
    if (kind === 'fertilizer' && fertilizerSpecs.length === 0 && !fertilizerLoading) {
      void fetchFertilizerSpecs();
    }
    if (kind === 'pesticide' && pesticideSpecs.length === 0 && !pesticideLoading) {
      void fetchPesticideSpecs();
    }
  }, [isOpen, kind, fertilizerSpecs.length, fertilizerLoading, fetchFertilizerSpecs, pesticideSpecs.length, pesticideLoading, fetchPesticideSpecs]);

  const options = useMemo(
    () => (kind === 'fertilizer' ? fertilizerSpecs : pesticideSpecs),
    [kind, fertilizerSpecs, pesticideSpecs],
  );

  const selectedSpec = useMemo(
    () => options.find((s: any) => s.id === specId),
    [options, specId],
  );

  // 选中规格后带出默认单位
  useEffect(() => {
    if (selectedSpec) {
      setUnit((prev) => prev || String((selectedSpec as any).stockUnit || ''));
    }
  }, [selectedSpec]);

  const handleSelectSpec = (id: string) => {
    setSpecId(id);
    const spec: any = options.find((s: any) => s.id === id);
    setUnit(String(spec?.stockUnit || ''));
  };

  const handleSave = async () => {
    if (!task) return;
    const qty = Number(quantity);
    if (!specId) { setError('请选择投入品规格'); return; }
    if (!quantity || Number.isNaN(qty) || qty <= 0) { setError('用量必须大于 0'); return; }

    setSaving(true);
    setError(null);
    try {
      if (kind === 'fertilizer') {
        const spec: any = selectedSpec;
        const created = await useFertilizerStore.getState().createItem({
          farmTaskId: task.id,
          fertilizeTime: `${todayLocal()} 00:00:00`,
          greenhouseName: task.greenhouseName || '未指定区域',
          cropName: task.crop || '未指定作物',
          fertilizerName: spec?.fertilizerName || '',
          quantity: qty,
          unit: unit || spec?.stockUnit || 'kg',
          dilutionRatio,
          operatorName,
          dataSource: 'manual',
          specId,
          specBrandName: spec?.brandName,
          specUnitPriceSnapshot: spec?.unitPrice,
          fertilizationPool: JSON.stringify([{
            specId,
            quantity: qty,
            unit: unit || spec?.stockUnit || 'kg',
            dilutionRatio,
            fertilizerName: spec?.fertilizerName || '',
            unitPrice: Number(spec?.unitPrice) || 0,
          }]),
        } as any);
        if (!created) throw new Error('保存失败（详见上方提示）');
      } else {
        const spec: any = selectedSpec;
        const created = await usePestControlStore.getState().createItem({
          farmTaskId: task.id,
          sprayTime: `${todayLocal()} 00:00:00`,
          cropName: task.crop || '未指定作物',
          greenhouseName: task.greenhouseName || '未指定区域',
          operatorName,
          pesticideName: spec?.pesticideName || '',
          specId,
          dosage: qty,
          dosageUnit: unit || spec?.stockUnit || 'kg',
          dilutionRatio,
          useLeafFertilizer: 'no',
          pesticideList: JSON.stringify([{
            name: spec?.pesticideName || '',
            pesticideCode: spec?.pesticideCode,
            specId,
            dosage: qty,
            unit: unit || spec?.stockUnit || 'kg',
            ratio: dilutionRatio,
          }]),
        } as any);
        if (!created) throw new Error('保存失败（详见上方提示）');
      }

      await showAlert('投入品用量已记录，库存已按用量扣减');
      onSaved();
      onClose();
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
      await showAlert(`保存失败：${message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="补录本次投入品用量"
      size="md"
      onSubmit={handleSave}
      submitText={saving ? '保存中…' : '保存'}
      cancelText="跳过"
    >
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-800">
          任务 <span className="font-mono">{task?.taskCode || task?.id}</span>
          {task?.typeName ? ` · ${task.typeName}` : ''}
          {task?.greenhouseName ? ` · ${task.greenhouseName}` : ''}
        </div>

        <div>
          <Label className="text-gray-700">投入品类型</Label>
          <div className="flex gap-3 mt-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={kind === 'fertilizer'}
                onChange={() => { setKind('fertilizer'); setSpecId(''); setUnit(''); }}
              />
              肥料
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                checked={kind === 'pesticide'}
                onChange={() => { setKind('pesticide'); setSpecId(''); setUnit(''); }}
              />
              农药
            </label>
          </div>
        </div>

        <div>
          <Label className="text-gray-700">
            {kind === 'fertilizer' ? '肥料规格' : '农药规格'} <span className="text-red-500">*</span>
          </Label>
          <Select value={specId || '__none__'} onValueChange={(v) => handleSelectSpec(v === '__none__' ? '' : v)}>
            <SelectTrigger className={inputClass}>
              <SelectValue placeholder="请选择规格" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">请选择规格</SelectItem>
              {options.slice(0, 300).map((spec: any) => (
                <SelectItem key={spec.id} value={spec.id}>
                  {kind === 'fertilizer' ? spec.fertilizerName : spec.pesticideName}
                  {spec.specContent ? ` · ${spec.specContent}` : ''}
                  {spec.brandName ? ` · ${spec.brandName}` : ''}
                  {`（库存 ${spec.stockQuantity ?? 0}${spec.stockUnit || ''}）`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-700">用量 <span className="text-red-500">*</span></Label>
            <Input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="本次实际用量"
              className="h-10"
            />
          </div>
          <div>
            <Label className="text-gray-700">单位</Label>
            <Input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="默认取库存单位"
              className="h-10"
            />
          </div>
        </div>

        <div>
          <Label className="text-gray-700">稀释倍数</Label>
          <Input
            type="text"
            value={dilutionRatio}
            onChange={(e) => setDilutionRatio(e.target.value)}
            placeholder="例如 1:1000（可留空）"
            className="h-10"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

export default TaskInputUsageModal;
