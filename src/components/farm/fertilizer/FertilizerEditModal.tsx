/**
 * 施肥编辑弹窗组件
 * 2026-07-05 重构：完整对齐新增弹窗字段/布局/功能
 * - 关联业务选择器（种植/育苗二选一，自动填充+锁定）
 * - 施肥量小数输入修复
 * - 单位换算预览 + 库存校验
 * - 温室负责人下拉操作员
 * - 去分区标题（时间/操作与备注合并）
 * - IoT 只读保护
 * 提交时调用 store.updateItem()
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, X, AlertTriangle, Plus } from 'lucide-react';
import { UnifiedModal, Button, Input, Label, TextArea } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { DictSelect } from '../../common/settings/DictSelect';
import CropCodeSelector from '../../farm/common/CropCodeSelector';
import { useFertilizerStore, useFertilizerLibraryStore, usePlantingStore, useSeedlingStore, useDictionaryStore, FertilizerData } from '@/stores';
import { useGreenhouseStore } from '@/stores';
import { validateDateNotFuture } from '@/lib/validators';
import type { CropVariety } from '@/types/cropVariety';
import { showAlert } from '@/lib/dialogService';
import { toBaseUnit, isConvertibleUnit } from '@/lib/unitConversions';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

interface FertilizerEditModalProps {
  isOpen: boolean;
  record: FertilizerData;
  onClose: () => void;
  onSaved: () => void;
}

export function FertilizerEditModal({ isOpen, record, onClose, onSaved }: FertilizerEditModalProps) {
  const store = useFertilizerStore();
  const fertilizerLibraryStore = useFertilizerLibraryStore();
  const isIot = record.dataSource === 'auto_iot';

  const [form, setForm] = useState({
    // 2026-07-12：quantity / unit / dilutionRatio / unitPrice 已迁到池每行；顶层仅保留公共信息
    fertilizerCode: '',
    cropName: '',
    greenhouseName: '',
    fertilizeTime: '',
    operatorName: '',
    description: '',
    plantingId: '',
    plantingCode: '',
    seedlingId: '',
    seedlingCode: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [cropCode, setCropCode] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);

  // 施肥量原始输入追踪
  const [quantityInputText, setQuantityInputText] = useState('');

  // 2026-07-12：施肥区域多选 record（同一次施肥同种作物+多区域不同用量；参考病虫害多区域模式）
  // 接口（与 AddModal 保持一致，便于反向解析）
  interface FertilizationPoolItemForEdit {
    type: 'planting' | 'seedling';
    id: string;
    code: string;
    cropName: string;
    cropCode?: string;
    area: string;
    quantity: number;
    unit: string;
    dilutionRatio: string;
    fertilizationMethod: string;
    fertilizerName: string;
    unitPrice: number;  // 2026-07-12：每行独立单价（自动从库取，可手改）
  }

  // 关联业务选择器（2026-07-12 重构为多区域多选）
  const [bizSearchKeyword, setBizSearchKeyword] = useState('');
  const [selectedBizRecords, setSelectedBizRecords] = useState<FertilizationPoolItemForEdit[]>([]);
  const [showBizSearch, setShowBizSearch] = useState(false);
  const [bizTabType, setBizTabType] = useState<'planting' | 'seedling'>('planting');
  const bizSearchRef = useRef<HTMLDivElement>(null);
  // 2026-07-12：肥料种类多选（从池的 fertilizerName 反向推；编辑模式下无需再次勾选）
  const [selectedFertilizers, setSelectedFertilizers] = useState<{ id: string; name: string }[]>([]);

  // 种植记录列表
  const plantingOptions = useMemo(() => {
    const plantings = usePlantingStore.getState().items;
    if (bizTabType !== 'planting') return [];
    if (!bizSearchKeyword.trim()) return plantings;
    const kw = bizSearchKeyword.toLowerCase();
    return plantings.filter((p: any) =>
      (p.plantCode || '').toLowerCase().includes(kw) ||
      (p.cropName || '').toLowerCase().includes(kw) ||
      (p.rootName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizTabType]);

  // 育苗记录列表
  const seedlingOptions = useMemo(() => {
    const seedlings = useSeedlingStore.getState().items as any[];
    if (bizTabType !== 'seedling') return [];
    if (!bizSearchKeyword.trim()) return seedlings;
    const kw = bizSearchKeyword.toLowerCase();
    return seedlings.filter((s: any) =>
      (s.seedlingCode || '').toLowerCase().includes(kw) ||
      (s.cropName || '').toLowerCase().includes(kw) ||
      (s.siteName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizTabType]);

  // 操作员选项（从温室负责人提取）
  const greenhouses = useGreenhouseStore(state => state.greenhouses);
  // 2026-07-12：施肥方式字典
  const dictionaryStore = useDictionaryStore();
  const operatorOptions = useMemo(() => {
    const seen = new Set<string>();
    return greenhouses
      .map(g => (g.manager || '').trim())
      .filter(name => name && !seen.has(name) && seen.add(name))
      .sort((a, b) => a.localeCompare(b, 'zh-CN'))
      .map(name => ({ value: name, label: name }));
  }, [greenhouses]);

  // 点击外部关闭搜索下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bizSearchRef.current && !bizSearchRef.current.contains(e.target as Node)) {
        setShowBizSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCropCodeChange = useCallback((_code: string, varietyInfo: CropVariety | null) => {
    if (isIot) return;
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      setCropCode(varietyInfo.cropCode);
      const cropNameValue = varietyInfo.detailVarietyCode && varietyInfo.detailVarietyCode !== '00'
        ? varietyInfo.varietyName
        : (varietyInfo.subVariety1Name || varietyInfo.varietyName);
      setForm(prev => ({ ...prev, cropName: cropNameValue }));
    }
  }, [isIot]);

  const fetchLibraryItems = useFertilizerLibraryStore(state => state.fetchItems);

  useEffect(() => {
    fetchLibraryItems({ limit: '10000' });
  }, [fetchLibraryItems]);

  // 预填充数据
  useEffect(() => {
    if (isOpen && record) {
      const hasFertilizerId = !!(record as any).fertilizerId;
      const hasPlanting = !!(record.plantingId || record.plantingCode);
      const hasSeedling = !!(record as any).seedlingId || (record as any).seedlingCode;
      const ghName = record.greenhouseName || '';

      // 2026-07-12：精简顶层 form（quantity/unit/dilutionRatio/unitPrice 等已迁到池行）
      setForm({
        fertilizerCode: record.fertilizerCode || '',
        cropName: record.cropName || '',
        greenhouseName: ghName,
        fertilizeTime: record.fertilizeTime || '',
        operatorName: record.operatorName || '',
        description: record.description || '',
        plantingId: record.plantingId || '',
        plantingCode: record.plantingCode || '',
        seedlingId: (record as any).seedlingId || '',
        seedlingCode: (record as any).seedlingCode || '',
      });
      setCropCode((record as any).cropCode || '');

      // 2026-07-12：反向解析 fertilizationPool → selectedBizRecords
      let parsedPool: FertilizationPoolItemForEdit[] = [];
      const rawPool = (record as any).fertilizationPool;
      if (rawPool && typeof rawPool === 'string') {
        try {
          const arr = JSON.parse(rawPool);
          if (Array.isArray(arr)) {
            parsedPool = arr
              .filter((it) => it && (it.type === 'planting' || it.type === 'seedling'))
              .map((it) => ({
                type: it.type,
                id: String(it.id || ''),
                code: String(it.code || ''),
                cropName: String(it.cropName || ''),
                cropCode: it.cropCode ? String(it.cropCode) : undefined,
                area: String(it.area || ''),
                quantity: Number(it.quantity) || 0,
                unit: String(it.unit || '千克'),
                dilutionRatio: String(it.dilutionRatio || ''),
                fertilizationMethod: String(it.fertilizationMethod || ''),
                fertilizerName: String(it.fertilizerName || ''),
                unitPrice: Number(it.unitPrice) || 0,  // 2026-07-12：单价（自动从库取，可手改）
              }));
          }
        } catch {
          // 解析失败忽略，老数据走原 planting/seedling 字段回退
        }
      }
      // 老数据无 fertilizationPool 时：用 plantingId/seedlingId + greenhouseName 兜底为 1 行（仅展示）
      if (parsedPool.length === 0 && !isIot) {
        if (hasPlanting && record.plantingId) {
          parsedPool = [{
            type: 'planting',
            id: record.plantingId,
            code: record.plantingCode || '',
            cropName: record.cropName || '',
            cropCode: (record as any).cropCode || undefined,
            area: ghName,
            quantity: record.quantity || 0,
            unit: record.unit || '千克',
            dilutionRatio: record.dilutionRatio || '',
            fertilizationMethod: '',
            fertilizerName: record.fertilizerName || '',
            unitPrice: record.unitPrice || 0,
          }];
        } else if (hasSeedling && (record as any).seedlingId) {
          parsedPool = [{
            type: 'seedling',
            id: (record as any).seedlingId,
            code: (record as any).seedlingCode || '',
            cropName: record.cropName || '',
            cropCode: (record as any).cropCode || undefined,
            area: ghName,
            quantity: record.quantity || 0,
            unit: record.unit || '千克',
            dilutionRatio: record.dilutionRatio || '',
            fertilizationMethod: '',
            fertilizerName: record.fertilizerName || '',
            unitPrice: record.unitPrice || 0,
          }];
        }
      }
      setSelectedBizRecords(parsedPool);

      // 2026-07-12：从池去重出肥料种类（用于池行 select 选项）
      const fertSet = new Set<string>();
      for (const r of parsedPool) {
        if (r.fertilizerName) fertSet.add(r.fertilizerName);
      }
      setSelectedFertilizers(
        Array.from(fertSet).map((name, idx) => ({ id: `pool-${idx}`, name }))
      );

      // 加载下拉数据
      usePlantingStore.getState().loadItems();
      useSeedlingStore.getState().loadItems();
      if (useGreenhouseStore.getState().greenhouses.length === 0) {
        useGreenhouseStore.getState().loadGreenhouses();
      }
    }
  }, [isOpen, record]);

  const updateField = useCallback((field: string, value: any) => {
    if (isIot) return;
    setForm((prev) => ({ ...prev, [field]: value }));
  }, [isIot]);

  // 2026-07-12：施肥区域池 handlers（与 AddModal 同语义）
  const toggleBizRecord = (kind: 'planting' | 'seedling', recordData: any, area: string) => {
    if (isIot) return;
    const recordId = recordData.id;
    const cropName = recordData.cropName || '';
    const cropCode = recordData.cropCode || '';
    const code = kind === 'planting' ? recordData.plantCode : recordData.seedlingCode;
    setSelectedBizRecords((prev) => {
      const isSelected = prev.some((r) => r.type === kind && r.id === recordId);
      if (isSelected) {
        return prev.filter((r) => !(r.type === kind && r.id === recordId));
      }
      if (prev.length > 0 && prev[0].cropName && cropName && prev[0].cropName !== cropName) {
        showAlert(`同一次施肥记录只能针对同一作物。已选作物：${prev[0].cropName}，该区域作物：${cropName}`);
        return prev;
      }
      const newItem: FertilizationPoolItemForEdit = {
        type: kind,
        id: recordId,
        code: code || '',
        cropName,
        cropCode,
        area,
        quantity: 0,  // 2026-07-12：每行独立用量（旧代码从顶层 form.quantity 同步，现已迁出）
        unit: '千克',
        dilutionRatio: '',
        fertilizationMethod: '',
        fertilizerName: '',
        unitPrice: 0,  // 2026-07-12：单价（施肥时从库取，可手改）
      };
      return [...prev, newItem];
    });
  };

  const updateBizRecordField = (compositeKey: string, field: keyof FertilizationPoolItemForEdit, value: any) => {
    if (isIot) return;
    const [type, id] = compositeKey.split('-') as ['planting' | 'seedling', string];
    setSelectedBizRecords((prev) => prev.map((r) => (r.type === type && r.id === id ? { ...r, [field]: value } : r)));
  };

  const handleClearBizRecords = () => {
    if (isIot) return;
    setSelectedBizRecords([]);
  };

  // 2026-07-12：同区域再添加另一种肥料（复制当前行的 record，肥料名清空）
  const duplicateRowWithNewFertilizer = (r: FertilizationPoolItemForEdit) => {
    if (isIot) return;
    const newRow: FertilizationPoolItemForEdit = {
      ...r,
      fertilizerName: '',
      quantity: 0,
      dilutionRatio: '',
      fertilizationMethod: '',
      unitPrice: 0,
    };
    setSelectedBizRecords((prev) => [...prev, newRow]);
  };

  const handleSubmit = async () => {
    if (isIot) return;
    // 前端必填校验
    if (!form.cropName.trim()) { await showAlert('请选择作物品种'); return; }
    // 2026-07-12：施肥区域池校验（至少 1 行）
    if (selectedBizRecords.length === 0) {
      await showAlert('请至少选择 1 个施肥区域');
      return;
    }
    const totalQuantity = selectedBizRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    if (totalQuantity <= 0) {
      await showAlert('施肥区域用量总和必须大于 0');
      return;
    }
    if (!form.fertilizeTime) { await showAlert('请选择施肥时间'); return; }
    if (form.fertilizeTime && !validateDateNotFuture(form.fertilizeTime)) {
      await showAlert('施肥日期不能大于当前时间');
      return;
    }

    setSubmitting(true);
    // 2026-07-12：record.quantity = 池各区域用量总和，单位按首行
    const firstPoolUnit = selectedBizRecords[0].unit || '千克';
    const quantityConverted = toBaseUnit(totalQuantity, firstPoolUnit);
    const enrichedPool = selectedBizRecords.map((r) => ({
      ...r,
      dilutionRatio: r.dilutionRatio || '',
    }));
    const areas = Array.from(new Set(enrichedPool.map((r) => r.area))).filter(Boolean);
    // 总成本按行 sum（每行 quantity × unitPrice — 多肥各自价）
    const computedTotalCost = enrichedPool.reduce(
      (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
      0
    );
    const payload: Record<string, any> = {
      fertilizerCode: form.fertilizerCode,
      // 顶层兼容：首条肥料名（向后兼容；新客户端读 pool.fertilizerName）
      fertilizerName: enrichedPool.find((r) => r.fertilizerName)?.fertilizerName || '',
      cropName: form.cropName,
      greenhouseName: areas.join(','),
      dilutionRatio: enrichedPool.find((r) => r.dilutionRatio)?.dilutionRatio || '',
      quantity: quantityConverted ? quantityConverted.baseQuantity : totalQuantity,
      unit: firstPoolUnit,
      // 2026-07-12：unitPrice 已迁到池行，顶层不再维护
      totalCost: computedTotalCost,
      fertilizeTime: form.fertilizeTime,
      operatorName: form.operatorName,
      description: form.description,
      // 2026-07-12：仍保留首条 planting/seedling 用于旧 schema 兼容
      plantingId: selectedBizRecords.find((r) => r.type === 'planting')?.id || '',
      plantingCode: selectedBizRecords.find((r) => r.type === 'planting')?.code || '',
      seedlingId: selectedBizRecords.find((r) => r.type === 'seedling')?.id || '',
      seedlingCode: selectedBizRecords.find((r) => r.type === 'seedling')?.code || '',
      // 2026-07-12：施肥区域池整池 JSON
      fertilizationPool: JSON.stringify(enrichedPool),
    };
    const result = await store.updateItem(record.id, payload);
    if (!result) {
      setSubmitting(false);
      const errMsg = useFertilizerStore.getState().error;
      await showAlert(errMsg || '保存失败，请重试');
      return;
    }
    // 2026-07-12：刷新肥料库库存（让 UI 立即看到扣减；多肥场景下每条肥料都查对应库）
    try { await fetchLibraryItems(); } catch (e) { console.warn('[FertilizerEditModal] 刷新肥料库库存失败:', e) }
    setSubmitting(false);
    onSaved();
  };

  const SectionTitle = ({ title, icon }: { title: string; icon: string }) => (
    <h3 className="text-sm font-bold text-gray-900 mb-3">{icon} {title}</h3>
  );

  const iotClass = isIot ? 'bg-gray-100 cursor-not-allowed text-gray-500' : '';
  const inputClass = isIot
    ? 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 cursor-not-allowed text-gray-500'
    : deepInputClass;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title={`编辑施肥记录 - ${record.fertilizerCode}`}
      size="xxxl"
      showFooter={false}
    >
      {/* IoT 警告 */}
      {isIot && (
        <div className="mb-4 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
          <span>IoT自动记录不可编辑，仅可查看。如需调整，请修改IoT设备的采集参数。</span>
        </div>
      )}

      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: 基础信息 */}
        <div>
          <SectionTitle title="基础信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">施肥编号</Label>
                <Input type="text" value={form.fertilizerCode} readOnly className={inputClass + ' font-mono'} />
              </div>
              <div>
                <Label className="text-gray-900">数据来源</Label>
                <Input
                  type="text"
                  value={isIot ? 'IoT自动' : '手动录入'}
                  readOnly
                  className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-100 font-medium ${isIot ? 'text-green-600' : 'text-blue-600'}`}
                />
              </div>
            </div>
            {/* 2026-07-12: 施肥区域池（多 record + 每行独立用量/单位/稀释倍数） */}
            <div ref={bizSearchRef} className="relative mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-gray-900 shrink-0">
                  🧪 施肥区域池 <span className="text-red-500">*</span>
                  <span className="ml-1 text-gray-500 text-xs">（可多选；同一次施肥只能同一作物；每行用量/单位独立）</span>
                </Label>
                {!isIot && (
                  <>
                    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
                      <button type="button"
                        onClick={() => { setBizTabType('planting'); setShowBizSearch(true); }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${bizTabType === 'planting' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                        🌱 种植
                      </button>
                      <button type="button"
                        onClick={() => { setBizTabType('seedling'); setShowBizSearch(true); }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${bizTabType === 'seedling' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                        🌿 育苗
                      </button>
                    </div>
                    <Input type="text" value={bizSearchKeyword}
                      onChange={(e) => { setBizSearchKeyword(e.target.value); setShowBizSearch(true); }}
                      onFocus={() => setShowBizSearch(true)}
                      placeholder={bizTabType === 'planting' ? '搜索种植批号/作物/区域...' : '搜索育苗批号/作物/区域...'}
                      className={`flex-1 ${deepInputClass} rounded-l-lg`} />
                    <Button type="button" variant="secondary" size="sm"
                      onClick={() => setShowBizSearch(!showBizSearch)}
                      className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg">
                      <Search className="w-4 h-4 text-gray-500" />
                    </Button>
                  </>
                )}
              </div>
              {showBizSearch && !isIot && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {bizTabType === 'planting' && plantingOptions.length > 0 && (
                    plantingOptions.map((planting: any) => {
                      const checked = selectedBizRecords.some((r) => r.type === 'planting' && r.id === planting.id);
                      return (
                        <Button key={planting.id} type="button" variant="ghost" size="sm"
                          onClick={() => toggleBizRecord('planting', planting, planting.rootName || planting.areaName || '')}
                          className="w-full justify-between rounded-none border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center gap-2 text-left">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'}`}>
                              {checked && <span className="text-xs">✓</span>}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{planting.plantCode}</p>
                              <p className="text-xs text-gray-500">{planting.cropName || ''} · {planting.rootName || planting.areaName || ''}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${planting.isHarvest ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'}`}>
                            {planting.isHarvest ? '已采收' : '种植中'}
                          </span>
                        </Button>
                      );
                    })
                  )}
                  {bizTabType === 'seedling' && seedlingOptions.length > 0 && (
                    seedlingOptions.map((seedling: any) => {
                      const checked = selectedBizRecords.some((r) => r.type === 'seedling' && r.id === seedling.id);
                      return (
                        <Button key={seedling.id} type="button" variant="ghost" size="sm"
                          onClick={() => toggleBizRecord('seedling', seedling, seedling.siteName || '')}
                          className="w-full justify-between rounded-none border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center gap-2 text-left">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'}`}>
                              {checked && <span className="text-xs">✓</span>}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{seedling.seedlingCode}</p>
                              <p className="text-xs text-gray-500">{seedling.cropName || ''} · {seedling.siteName || ''}</p>
                            </div>
                          </div>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0 ml-2">
                            育苗中
                          </span>
                        </Button>
                      );
                    })
                  )}
                  {((bizTabType === 'planting' && plantingOptions.length === 0) ||
                    (bizTabType === 'seedling' && seedlingOptions.length === 0)) && (
                    <div className="p-4 text-center text-sm text-gray-400">
                      无匹配的{bizTabType === 'planting' ? '种植' : '育苗'}记录
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 已选池（每行独立 [区域, 肥料名, 用量, 单位, 稀释, 方式]） */}
            {selectedBizRecords.length > 0 && (
              <div className="space-y-2 mb-3">
                {selectedBizRecords.map((r) => (
                  <div key={`${r.type}-${r.id}-${r.fertilizerName || '-'}`} className={`grid grid-cols-12 gap-2 items-center p-2 border border-emerald-200 bg-emerald-50 rounded-lg ${isIot ? 'opacity-60' : ''}`}>
                    <div className="col-span-3 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{r.type === 'planting' ? '🌱' : '🌿'}</span>
                        <span className="font-mono text-xs text-emerald-800">{r.code || '-'}</span>
                      </div>
                      <Input type="text" value={r.area}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'area', e.target.value)}
                        className="mt-1 h-7 text-xs" placeholder="区域（可手改）" disabled={isIot} />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-700 mb-1 block">肥料名 <span className="text-red-500">*</span></Label>
                      {/* 2026-07-12：肥料名下拉选择（选项来自 selectedFertilizers — 由池反向推出） */}
                      <select
                        value={r.fertilizerName}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'fertilizerName', e.target.value)}
                        disabled={isIot}
                        className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100 bg-white"
                      >
                        <option value="">请选择肥料…</option>
                        {selectedFertilizers.map((f) => (
                          <option key={f.id} value={f.name}>🧪 {f.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-700 mb-1 block">用量</Label>
                      <Input type="number" value={String(r.quantity || '')}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'quantity', Number(e.target.value) || 0)}
                        className="h-8" step="0.01" disabled={isIot} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-gray-700 mb-1 block">单位</Label>
                      <select value={r.unit}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'unit', e.target.value)}
                        disabled={isIot}
                        className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100">
                        <option value="千克">千克</option>
                        <option value="克">克</option>
                        <option value="升">升</option>
                        <option value="毫升">毫升</option>
                        <option value="包">包</option>
                        <option value="袋">袋</option>
                      </select>
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-gray-700 mb-1 block">稀释倍数</Label>
                      <Input type="text" value={r.dilutionRatio}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'dilutionRatio', e.target.value)}
                        className="h-8" disabled={isIot} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-gray-700 mb-1 block">单价 <span className="text-emerald-600 text-[10px]">(元/单位)</span></Label>
                      <Input type="number" value={r.unitPrice || ''}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'unitPrice', Number(e.target.value) || 0)}
                        className="h-8" step="0.01" min="0" disabled={isIot} />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-gray-700 mb-1 block">施肥方式</Label>
                      <select value={r.fertilizationMethod}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'fertilizationMethod', e.target.value)}
                        disabled={isIot}
                        className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-100">
                        <option value="">…</option>
                        {dictionaryStore.dictionaries
                          .filter((d: any) => (d as any).categoryCode === 'fertilization_method' && (d as any).status === 'active')
                          .map((d: any) => (
                            <option key={(d as any).dictCode} value={(d as any).dictCode}>
                              {(d as any).dictLabel}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="col-span-1 flex justify-end gap-1">
                      {/* 同区域再添加另一种肥料 — 2026-07-12 */}
                      {!isIot && (
                        <Button type="button" variant="ghost" size="icon"
                          onClick={() => duplicateRowWithNewFertilizer(r)}
                          className="text-emerald-600 hover:text-blue-600" title="同区域再加另一种肥料">
                          <Plus className="w-4 h-4" />
                        </Button>
                      )}
                      {!isIot && (
                        <Button type="button" variant="ghost" size="icon"
                          onClick={() => toggleBizRecord(r.type, { id: r.id }, r.area)}
                          className="text-emerald-600 hover:text-red-600" title="移除该行">
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {!isIot && (
                  <div className="flex justify-end">
                    <Button type="button" variant="ghost" size="sm"
                      onClick={handleClearBizRecords}
                      className="text-gray-500 hover:text-red-600">
                      <X className="w-3 h-3 mr-1" />清除全部
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* 作物品种（按所选批次反填）+ 区域汇总 chips */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">
                  作物品种 <span className="text-red-500">*</span>
                  {selectedBizRecords.length > 0 && selectedBizRecords[0].cropName && (
                    <span className="ml-2 text-xs text-emerald-600">
                      （由所选批次反填：{selectedBizRecords[0].cropName}）
                    </span>
                  )}
                </Label>
                <CropCodeSelector value={cropCode} onChange={handleCropCodeChange}
                  placeholder={selectedBizRecords.length > 0 ? '由所选批次反填' : '请先选择施肥区域或手动选择品种'}
                  size="md" showFullPath={true} disabled={isIot} />
                {selectedCrop && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                    <div className="text-emerald-700">
                      {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                      {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <Label className="text-gray-900">区域汇总（去重）</Label>
                <div className={`${inputClass} min-h-[42px] flex flex-wrap items-center gap-1.5 px-2 py-1`}>
                  {(() => {
                    const areas = Array.from(new Set(selectedBizRecords.map((r) => r.area))).filter(Boolean);
                    return areas.length > 0 ? areas.map((area) => (
                      <span key={area} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                        📍 {area}
                      </span>
                    )) : <span className="text-gray-400 text-sm">尚未选择区域</span>;
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* 时间 + 操作员 + 备注（无分区标题，紧凑布局） */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-900">施肥时间</Label>
              <Input type="datetime-local" value={form.fertilizeTime}
                onChange={(e) => updateField('fertilizeTime', e.target.value)}
                disabled={isIot} className={inputClass} />
            </div>
            <div>
              <Label className="text-gray-900">操作员</Label>
              <Select value={form.operatorName || undefined}
                onValueChange={(val) => updateField('operatorName', val)}
                disabled={isIot}>
                <SelectTrigger className={`w-full h-10 ${isIot ? 'bg-gray-100' : deepInputClass}`}>
                  <SelectValue placeholder="选择操作员" />
                </SelectTrigger>
                <SelectContent>
                  {operatorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-gray-900">备注</Label>
            <TextArea value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="请输入备注信息" rows={3} disabled={isIot}
              className={`w-full px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none ${isIot ? 'border border-gray-200 bg-gray-100 cursor-not-allowed text-gray-500' : 'border border-gray-400'}`} />
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        {!isIot && (
          <Button variant="default" size="sm" onClick={handleSubmit}
            disabled={submitting}>
            {submitting ? '保存中...' : '保存修改'}
          </Button>
        )}
      </div>
    </UnifiedModal>
  );
}
