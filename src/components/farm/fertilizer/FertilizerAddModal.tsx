/**
 * 施肥新增弹窗组件
 * 4个区域：基础信息、肥料与用量、位置与时间、操作与备注
 * 使用 UnifiedModal 包装，提交时调用 store.createItem()
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, X, Plus } from 'lucide-react';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { DictSelect } from '../../common/settings/DictSelect';

import CropCodeSelector from '../../farm/common/CropCodeSelector';
import { useFertilizerStore, useFertilizerLibraryStore, usePlantingStore, useSeedlingStore, useDictionaryStore } from '@/stores';
import { useGreenhouseStore } from '@/stores';
import { validateDateNotFuture } from '@/lib/validators';
import FertilizerCodeGenerator from './FertilizerCodeGenerator';
import type { CropVariety } from '@/types/cropVariety';
import { showAlert } from '@/lib/dialogService';
// 2026-07-05: 单位换算工具（修复"1000克 > 100kg库存"误报 bug）
import { toBaseUnit, isConvertibleUnit, getUnitCategory } from '@/lib/unitConversions';

interface FertilizerAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

// 2026-07-12：施肥区域池 — 每行独立「区域 + 用量 + 单位 + 稀释倍数」（同一次施肥同种作物+多区域不同用量）
// 2026-07-12：增加 spec 追溯字段（specId/specBrandName/specUnitPrice/specBatchNumber）— 直接从肥料库 spec 联动
interface FertilizationPoolItem {
  type: 'planting' | 'seedling';
  id: string;              // 区域记录 ID（plant/seedling.id）
  code: string;            // 批号
  cropName: string;        // 该区域作物
  cropCode?: string;
  area: string;            // 区域（可手改）
  quantity: number;        // 用量
  unit: string;            // 单位
  dilutionRatio: string;   // 稀释倍数
  fertilizationMethod: string;
  fertilizerName: string;
  unitPrice: number;       // 每行肥料单价（多肥时各自独立）
  // 2026-07-12：spec 精确追溯字段（与 fertilization_records.spec_* 列对齐，便于事后回溯到具体 spec）
  fertilizerSpecId?: string;
  specBrandName?: string;
  specUnitPrice?: number;
  specBatchNumber?: string;
}

// 2026-07-12：肥料种类选项（用户预选；池行 fertilizerName 从这里选）
// 2026-07-12：扩展携带 spec 品牌/单价/批次/库存（从肥料库选时一并带入；自定义无）
interface FertilizerChoice {
  id: string;              // spec.id（库选）或 custom-{ts}（自定义）
  name: string;            // 肥料名（必填）
  brandName?: string;      // 品牌（库选携带；自定义空）
  unitPrice?: number;      // 单价快照（库选携带；自定义默认 0，可手改）
  batchNumber?: string;    // 批次号（库选携带）
  stockQuantity?: number;  // 库存量（展示用，不参与计算）
}

// 默认表单数据
// 2026-07-12：unitPrice / totalCost / inputMode / selectedFertilizerId 等已迁到施肥区域池每行
const defaultForm = {
  fertilizerCode: '',
  cropName: '',
  greenhouseName: '',
  fertilizeTime: '',
  operatorName: '',
  dataSource: 'manual' as const,
  description: '',
  plantingId: '',
  plantingCode: '',
  seedlingId: '',
  seedlingCode: '',
};

export function FertilizerAddModal({ isOpen, onClose, onSaved }: FertilizerAddModalProps) {
  const store = useFertilizerStore();
  const fertilizerLibraryStore = useFertilizerLibraryStore();
  // 2026-07-12：施肥方式字典（cat='fertilization_method'，每区域独立）
  const dictionaryStore = useDictionaryStore();

  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [cropCode, setCropCode] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);
  // 2026-07-12: 施肥量/单位/稜稣倍数已迁到施肥区域池每行，不在顶层维护

  // 2026-07-12：改造为多区域多选（参考病虫害防治管理）
  // - Tab 切换种植/育苗，可同时勾选多条 record；同一次施肥只能同一作物
  const [bizTabType, setBizTabType] = useState<'planting' | 'seedling'>('planting');
  const [selectedBizRecords, setSelectedBizRecords] = useState<FertilizationPoolItem[]>([]);
  // 2026-07-12：肥料种类多选池（用户从肥料库选 / 自定义输入）；池行的 fertilizerName 从这里取
  const [selectedFertilizers, setSelectedFertilizers] = useState<FertilizerChoice[]>([]);
  // 自定义肥料名输入缓存
  const [customFertilizerName, setCustomFertilizerName] = useState('');
  const [bizSearchKeyword, setBizSearchKeyword] = useState('');
  const [showBizSearch, setShowBizSearch] = useState(false);
  const bizSearchRef = useRef<HTMLDivElement>(null);

  // 种植记录列表（过滤未采收，按 tab 切换）
  const plantingOptions = useMemo(() => {
    const plantings = usePlantingStore.getState().items;
    const activePlantings = plantings.filter((p: any) => !p.isHarvest);
    if (bizTabType !== 'planting') return [];
    if (!bizSearchKeyword.trim()) return activePlantings;
    const kw = bizSearchKeyword.toLowerCase();
    return activePlantings.filter((p: any) =>
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

  // 操作员选项（从系统设置→基地管理→温室负责人提取，去重排序）
  const greenhouses = useGreenhouseStore(state => state.greenhouses);
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

  // 作物选择处理
  const handleCropCodeChange = useCallback((_code: string, varietyInfo: CropVariety | null) => {
    if (varietyInfo) {
      setSelectedCrop(varietyInfo);
      setCropCode(varietyInfo.cropCode);
      const cropNameValue = varietyInfo.detailVarietyCode && varietyInfo.detailVarietyCode !== '00'
        ? varietyInfo.varietyName
        : (varietyInfo.subVariety1Name || varietyInfo.varietyName);
      setForm(prev => ({
        ...prev,
        cropName: cropNameValue,
      }));
    }
  }, []);

  // 2026-07-12：移除 getUnitPriceFromLibrary — 现改用 selectedFertilizers[id].unitPrice（直接由 spec 携带）
  // 原因：肥料库已扁平化为 FertilizerSpec 单层结构（无嵌套 specs[]），原函数读取 nested specs 已失效
  // 单价现在直接跟随用户在「肥料种类」段的选择进入池行；自定义无值时为 0（用户手输覆盖）

  // 2026-07-12：施肥区域池 handlers — 多 record 多选 + 作物一致性校验 + 单行编辑
  const toggleBizRecord = (kind: 'planting' | 'seedling', record: any, area: string) => {
    const recordId = record.id;
    const cropName = record.cropName || '';
    const cropCode = record.cropCode || '';
    const code = kind === 'planting' ? record.plantCode : record.seedlingCode;
    setSelectedBizRecords((prev) => {
      const isSelected = prev.some((r) => r.type === kind && r.id === recordId);
      if (isSelected) {
        const next = prev.filter((r) => !(r.type === kind && r.id === recordId));
        return next;
      }
      // 作物一致性校验：同一次施肥只能同一作物，混合作物拒绝
      if (prev.length > 0 && prev[0].cropName && cropName && prev[0].cropName !== cropName) {
        showAlert(`同一次施肥记录只能针对同一作物。已选作物：${prev[0].cropName}，该区域作物：${cropName}`);
        return prev;
      }
      const newItem: FertilizationPoolItem = {
        type: kind,
        id: recordId,
        code: code || '',
        cropName,
        cropCode,
        area,
        quantity: 0,
        unit: '千克',
        dilutionRatio: '',
        fertilizationMethod: '',
        // 2026-07-12：自动预填已勾选的第一种肥料（用户多选时第一行默认首肥，下一行需用"+"手动选第二种）
        fertilizerName: selectedFertilizers[0]?.name || '',
        // 2026-07-12：单价自动跟随用户在「肥料种类」段的预选（spec 携带；自定义为 0）
        unitPrice: Number(selectedFertilizers[0]?.unitPrice) || 0,
        // 2026-07-12：spec 追溯字段（库选时携带；自定义无）
        fertilizerSpecId: selectedFertilizers[0]?.id,
        specBrandName: selectedFertilizers[0]?.brandName || '',
        specUnitPrice: Number(selectedFertilizers[0]?.unitPrice) || 0,
        specBatchNumber: selectedFertilizers[0]?.batchNumber || '',
      };
      const next = [...prev, newItem];
      // 自动反填作物（仅首次）
      if (next.length === 1 && cropName && !form.cropName) {
        updateField('cropName', cropName);
        setCropCode(cropCode);
      }
      // 同步 plantingId/Code 或 seedlingId/Code（首条 planting/seedling 用于溯源）
      if (kind === 'planting' && !form.plantingId) {
        updateField('plantingId', recordId);
        updateField('plantingCode', code || '');
      } else if (kind === 'seedling' && !form.seedlingId) {
        updateField('seedlingId', recordId);
        updateField('seedlingCode', code || '');
      }
      // 同步施肥时间为当前（仅在未填时）
      if (!form.fertilizeTime) {
        const now = new Date();
        const tzOffset = now.getTimezoneOffset() * 60000;
        const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
        updateField('fertilizeTime', localISO);
      }
      // 同步 greenhouseName 为已选区域去重 join
      const areas = Array.from(new Set(next.map((r) => r.area))).filter(Boolean);
      updateField('greenhouseName', areas.join(','));
      return next;
    });
  };

  // 更新池中某行的字段（按 type+id 复合 key）
  const updateBizRecordField = (compositeKey: string, field: keyof FertilizationPoolItem, value: any) => {
    const [type, id] = compositeKey.split('-') as ['planting' | 'seedling', string];
    setSelectedBizRecords((prev) => {
      const next = prev.map((r) => (r.type === type && r.id === id ? { ...r, [field]: value } : r));
      // 同步 greenhouseName（区域可能手改）
      if (field === 'area') {
        const areas = Array.from(new Set(next.map((r) => r.area))).filter(Boolean);
        updateField('greenhouseName', areas.join(','));
      }
      return next;
    });
  };

  // 清除全部已选
  const handleClearBizRecords = () => {
    setSelectedBizRecords([]);
    updateField('greenhouseName', '');
    // 不清 planting/seedlingId（向后兼容老数据）
  };

  // 2026-07-12：同区域再添加另一种肥料 — 复制当前行的 record 信息，但肥料名清空
  const duplicateRowWithNewFertilizer = (r: FertilizationPoolItem) => {
    const newRow: FertilizationPoolItem = {
      ...r,
      fertilizerName: '',  // 不复用，留空让用户填
      quantity: 0,
      dilutionRatio: '',
      fertilizationMethod: '',
      unitPrice: 0,
      // 2026-07-12：spec 字段一并清空，等用户选新肥时自动联动
      fertilizerSpecId: undefined,
      specBrandName: undefined,
      specUnitPrice: undefined,
      specBatchNumber: undefined,
    };
    setSelectedBizRecords((prev) => [...prev, newRow]);
  };

  // 2026-07-12：肥料种类多选 handler — 从 fertilizer_library 选
  // 2026-07-12：改用 spec.id 作为唯一 key；携带品牌/单价/批次/库存进入 selectedFertilizers
  const toggleFertilizerFromLibrary = (spec: any) => {
    setSelectedFertilizers((prev) => {
      const exists = prev.some((f) => f.id === spec.id);
      if (exists) {
        return prev.filter((f) => f.id !== spec.id);
      }
      return [...prev, {
        id: spec.id,
        name: spec.fertilizerName,
        brandName: spec.brandName || '',
        unitPrice: Number(spec.unitPrice) || 0,
        batchNumber: spec.batchNumber || '',
        stockQuantity: Number(spec.stockQuantity) || 0,
      }];
    });
  };

  // 2026-07-12：从自定义输入框追加一种肥料（无 spec 字段）
  const addCustomFertilizer = () => {
    const name = customFertilizerName.trim();
    if (!name) return;
    setSelectedFertilizers((prev) => {
      // 自定义肥料按 name 去重（与库选按 id 去重不同维度）
      if (prev.some((f) => f.name === name && f.id.startsWith('custom-'))) return prev;
      return [...prev, {
        id: `custom-${Date.now()}`,
        name,
        brandName: '',
        unitPrice: 0,
        batchNumber: '',
        stockQuantity: 0,
      }];
    });
    setCustomFertilizerName('');
  };

  // 2026-07-12：移除已选肥料（按 id 定位；同时把池行里用该肥料的 fertilizerName + spec 字段清空——避免失效引用）
  const removeFertilizer = (id: string) => {
    let removedName = '';
    setSelectedFertilizers((prev) => {
      const removed = prev.find((f) => f.id === id);
      removedName = removed?.name || '';
      return prev.filter((f) => f.id !== id);
    });
    // 池行里凡是引用该 id 的清空肥料与 spec（同步）
    setSelectedBizRecords((prev) =>
      prev.map((r) => (
        r.fertilizerSpecId === id || (removedName && r.fertilizerName === removedName && !r.fertilizerSpecId)
          ? {
              ...r,
              fertilizerName: '',
              fertilizerSpecId: undefined,
              specBrandName: undefined,
              specUnitPrice: undefined,
              specBatchNumber: undefined,
            }
          : r
      ))
    );
  };

  // 获取 fetchItems 方法 (稳定的函数引用，避免 useEffect 依赖对象引用导致无限循环)
  const fetchLibraryItems = useFertilizerLibraryStore(state => state.fetchItems);

  useEffect(() => {
    fetchLibraryItems({ limit: '10000' });
  }, [fetchLibraryItems]);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setForm({ ...defaultForm });
      setCropCode('');
      setSelectedCrop(null);
      // 2026-07-12：施肥区域多选重置
      setSelectedBizRecords([]);
      setBizSearchKeyword('');
      setShowBizSearch(false);
      setBizTabType('planting');
      // 2026-07-12：肥料种类多选重置
      setSelectedFertilizers([]);
      setCustomFertilizerName('');
      // 加载种植和育苗记录列表
      usePlantingStore.getState().loadItems();
      useSeedlingStore.getState().loadItems();
      // 加载温室数据（操作员下拉用温室负责人）
      if (useGreenhouseStore.getState().greenhouses.length === 0) {
        useGreenhouseStore.getState().loadGreenhouses();
      }
    }
  }, [isOpen]);

  // 更新表单字段（2026-07-12：quantity 已迁到池，此函数仅维护顶层字段）
  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      return next;
    });
  }, []);

  // 2026-07-12：施肥区域池用量合计 + 库存校验提示（独立小组件）
  const PoolSummaryInline = ({ selectedBizRecords, libraryItems }: {
    selectedBizRecords: FertilizationPoolItem[];
    libraryItems: any[];
    }) => {
    if (selectedBizRecords.length === 0) return null;
    // 按单位分组求 sum
    const totalByUnit: Record<string, number> = {};
    for (const r of selectedBizRecords) {
      const u = r.unit || '千克';
      totalByUnit[u] = (totalByUnit[u] || 0) + (Number(r.quantity) || 0);
    }
    // 转基准单位（kg / L）用于库存校验
    let baseTotal: number | null = null;
    let baseUnit: string | null = null;
    for (const [u, q] of Object.entries(totalByUnit)) {
      const c = toBaseUnit(q, u);
      if (c) { baseTotal = (baseTotal ?? 0) + c.baseQuantity; baseUnit = c.baseUnit; }
      else if (baseUnit === null) { baseTotal = q; baseUnit = u; }
    }
    const lib = null;  // 2026-07-12：多肥场景下库存校验交给每行级对应库（不在 PoolSummary 跨种汇总）
    const overStock = false;
    return (
      <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
        <div className="text-emerald-700">
          用量合计：{Object.entries(totalByUnit).map(([u, q]) => `${q} ${u}`).join(' + ')}
          {baseTotal != null && baseUnit && Object.keys(totalByUnit).length > 1 && (
            <>（≈ <span className="font-bold">{baseTotal.toLocaleString(undefined, { maximumFractionDigits: 3 })}</span> {baseUnit}）</>
          )}
        </div>
        {overStock && (
          <div className="text-amber-600 mt-1" data-testid="stock-warning">
            ⚠ 合计用量（约 {baseTotal!.toLocaleString(undefined, { maximumFractionDigits: 3 })} {baseUnit}）超过建议库存
          </div>
        )}
      </div>
    );
  };

  // 提交表单
  const handleSubmit = async () => {
    // 前端必填校验（与后端 Zod schema 对齐，避免静默 400 错误）
    if (!form.cropName.trim()) {
      await showAlert('请选择作物品种（从施肥区域池自动反填或手动选择）');
      return;
    }
    // 2026-07-12：施肥区域池必填（至少 1 条不同区域，含用量）
    if (selectedBizRecords.length === 0) {
      await showAlert('请至少选择 1 个施肥区域');
      return;
    }
    const totalQuantity = selectedBizRecords.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    if (totalQuantity <= 0) {
      await showAlert('施肥区域用量总和必须大于 0');
      return;
    }
    // 2026-07-12：校验每行（quantity>0 必须有 fertilizerName + dilutionRatio）
    const activeRows = selectedBizRecords.filter((r) => (Number(r.quantity) || 0) > 0);
    const missingFertilizer = activeRows.find((r) => !r.fertilizerName.trim());
    if (missingFertilizer) {
      await showAlert(`区域「${missingFertilizer.area}」用量 > 0 但肥料名未填写`);
      return;
    }
    const missingDilution = activeRows.find((r) => !r.dilutionRatio.trim());
    if (missingDilution) {
      await showAlert(`区域「${missingDilution.area}」（肥料：${missingDilution.fertilizerName}）稀释倍数未填写`);
      return;
    }
    // 至少有 1 个真实肥料记录
    if (activeRows.length === 0) {
      await showAlert('没有有效施肥行（所有行用量都为 0）');
      return;
    }
    if (!form.fertilizeTime) {
      await showAlert('请选择施肥时间');
      return;
    }
    // 方案5.1: 施肥日期不能大于当前时间
    if (form.fertilizeTime && !validateDateNotFuture(form.fertilizeTime)) {
      await showAlert('施肥日期不能大于当前时间');
      return;
    }
    setSubmitting(true);
    // 2026-07-12：序列化施肥池 — 每行独立肥料 + 区域用量（多肥+多区域）
    // 兼容：顶层仍写 record.quantity = 各行总和（兼容旧报表）+ 顶层 fertilizerName = 第一个有肥行（向后兼容）
    const firstActiveRow = activeRows[0];
    const firstPoolUnit = firstActiveRow?.unit || '千克';
    const quantityConverted = toBaseUnit(totalQuantity, firstPoolUnit);
    // 顶层 fertilizerName / fertilizerType / dilutionRatio 取首个有肥行（向后兼容 schema）
    const legacyFertilizerName = firstActiveRow?.fertilizerName || '';
    const legacyDilution = firstActiveRow?.dilutionRatio || '';
    // 2026-07-12：序列化施肥池 — 每行独立肥料 + 区域用量 + spec 追溯字段（精确到具体 spec）
    const enrichedPool = selectedBizRecords.map((r) => ({
      ...r,
      dilutionRatio: r.dilutionRatio || '',
      // 2026-07-12：spec 字段兜底（空值统一为空串/0，避免后端 Zod 校验失败）
      specBrandName: r.specBrandName || '',
      specBatchNumber: r.specBatchNumber || '',
      specUnitPrice: Number(r.specUnitPrice) || 0,
      fertilizerSpecId: r.fertilizerSpecId || '',
    }));
    // 2026-07-12：总成本 = 各行 (quantity × unitPrice) 累加（每行独立单价，多肥精确计算）
    const computedTotalCost = enrichedPool.reduce(
      (sum, r) => sum + (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
      0
    );
    const payload: Record<string, any> = {
      fertilizerCode: form.fertilizerCode,
      // 顶层兼容：首行肥料名（老数据展示维持兼容；新客户端用 pool.fertilizerName）
      fertilizerName: legacyFertilizerName,      cropName: form.cropName,
      greenhouseName: form.greenhouseName,
      dilutionRatio: legacyDilution,
      quantity: quantityConverted ? quantityConverted.baseQuantity : totalQuantity,
      unit: firstPoolUnit,
      // 2026-07-12：unitPrice 已迁到池行（unitPrice in pool），顶层不再维护
      totalCost: computedTotalCost,
      fertilizeTime: form.fertilizeTime,
      operatorName: form.operatorName,
      dataSource: form.dataSource,
      description: form.description,      plantingId: form.plantingId,
      plantingCode: form.plantingCode,
      seedlingId: form.seedlingId,
      seedlingCode: form.seedlingCode,
      // 2026-07-12：施肥区域池（每行：独立 [肥料, 区域, 用量, 单位, 稀释, 施肥方式]）
      // 多肥多区域同存：同区域多条记录（不同肥料）；list/详情会按肥料分组
      fertilizationPool: JSON.stringify(enrichedPool),
    };
    const result = await store.createItem(payload);
    if (!result) {
      // createItem 失败：后端校验/网络错误/库存不足等，store.error 已有错误信息
      setSubmitting(false);
      const errMsg = useFertilizerStore.getState().error;
      await showAlert(errMsg || '保存失败，请重试');
      return;
    }
    // G11 V1.1：创建成功后刷新肥料库库存（让 UI 立即看到扣减）
    // 2026-07-12：多肥场景下每种肥料自动刷新（pool 中的每条 fertilizerName 都查询对应库）
    const uniqueFertilizerNames = Array.from(new Set(enrichedPool.map((r) => r.fertilizerName).filter(Boolean)));
    if (uniqueFertilizerNames.length > 0) {
      try { await fetchLibraryItems(); } catch (e) { console.warn('[FertilizerAddModal] 刷新肥料库库存失败:', e) }
    }
    setSubmitting(false);
    onSaved();
  };

  // 区域标题（纯文本粗体，无折叠功能）
  const SectionTitle = ({ title, icon }: { title: string; icon: string }) => (
    <h3 className="text-sm font-bold text-gray-900 mb-3">{icon} {title}</h3>
  );

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增施肥记录"
      // 2026-07-05: 弹窗宽度 +30%（xl → xxxl：max-w-4xl → max-w-6xl）
      size="xxxl"
      showFooter={false}
    >
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: 基础信息 */}
        <div>
          <SectionTitle title="基础信息" icon="📋" />
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">施肥编号</Label>
                <FertilizerCodeGenerator
                  value={form.fertilizerCode}
                  onChange={(code) => updateField('fertilizerCode', code)}
                />
              </div>
              <div>
                <Label className="text-gray-900">数据来源</Label>
                <Select
                  value={form.dataSource}
                  onValueChange={(val) => updateField('dataSource', val)}
                >
                  <SelectTrigger className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <SelectValue placeholder="手动录入" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">手动录入</SelectItem>
                    <SelectItem value="auto_iot">IoT自动</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {/* 2026-07-12: 施肥区域池 — Tab 切换种植/育苗 + 每行独立用量/单位/稀释倍数（参考病虫害多区域多选模式） */}
            <div ref={bizSearchRef} className="relative mb-3">
              <div className="flex items-center gap-2 mb-1">
                <Label className="text-gray-900 shrink-0">
                  🧪 施肥区域池 <span className="text-red-500">*</span>
                  <span className="ml-1 text-gray-500 text-xs">（可多选；同一次施肥只能同一作物；每行用量/单位独立）</span>
                </Label>
                {/* Tab 切换 */}
                <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setBizTabType('planting'); setShowBizSearch(true); }}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      bizTabType === 'planting' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🌱 种植
                  </button>
                  <button
                    type="button"
                    onClick={() => { setBizTabType('seedling'); setShowBizSearch(true); }}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      bizTabType === 'seedling' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    🌿 育苗
                  </button>
                </div>
                <Input
                  type="text"
                  value={bizSearchKeyword}
                  onChange={(e) => { setBizSearchKeyword(e.target.value); setShowBizSearch(true); }}
                  onFocus={() => setShowBizSearch(true)}
                  placeholder={bizTabType === 'planting' ? '搜索种植批号/作物/区域...' : '搜索育苗批号/作物/区域...'}
                  className={`flex-1 ${deepInputClass} rounded-l-lg`}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowBizSearch(!showBizSearch)}
                  className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg"
                >
                  <Search className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
              {showBizSearch && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {bizTabType === 'planting' && plantingOptions.length > 0 && (
                    plantingOptions.map((planting: any) => {
                      const checked = selectedBizRecords.some((r) => r.type === 'planting' && r.id === planting.id);
                      return (
                        <Button
                          key={planting.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBizRecord('planting', planting, planting.rootName || planting.areaName || '')}
                          className="w-full justify-between rounded-none border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-2 text-left">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                            }`}>
                              {checked && <span className="text-xs">✓</span>}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{planting.plantCode}</p>
                              <p className="text-xs text-gray-500">{planting.cropName || ''} · {planting.rootName || planting.areaName || ''}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                            planting.isHarvest ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'
                          }`}>
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
                        <Button
                          key={seedling.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleBizRecord('seedling', seedling, seedling.siteName || '')}
                          className="w-full justify-between rounded-none border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-2 text-left">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'
                            }`}>
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

            {/* 2026-07-12：肥料种类多选（与"关联业务"多选对称） — 用户从肥料库勾选多种肥料；池行的肥料字段从已选集合选 */}
            <div className="mb-3 p-2 border border-amber-200 bg-amber-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-amber-900">🧪 肥料种类（多选；池行使用以下种类）</span>
                <span className="text-xs text-amber-700">已选 {selectedFertilizers.length} 种</span>
              </div>
              {/* 已选肥料 chips（可移除） */}
              {selectedFertilizers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedFertilizers.map((f) => (
                    <span key={f.id} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white border border-amber-300 text-amber-900 text-sm">
                      🧪 {f.name}
                      {/* 2026-07-12：展示品牌与单价（库选携带；自定义无） */}
                      {f.brandName && <span className="text-xs text-amber-700">·{f.brandName}</span>}
                      <span className="text-xs text-amber-700">¥{Number(f.unitPrice || 0).toFixed(2)}</span>
                      <button
                        type="button"
                        onClick={() => removeFertilizer(f.id)}
                        className="ml-1 text-amber-700 hover:text-red-600"
                        title="移除该肥料"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* 自定义肥料名 */}
              <div className="flex items-center gap-2 mb-2">
                <Input
                  type="text"
                  value={customFertilizerName}
                  onChange={(e) => setCustomFertilizerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCustomFertilizer();
                    }
                  }}
                  placeholder="自定义肥料名（按 Enter 添加）"
                  className={`${deepInputClass} flex-1`}
                />
                <Button type="button" variant="secondary" size="sm" onClick={addCustomFertilizer}>
                  添加
                </Button>
              </div>
              {/* 肥料库候选（按 type 过滤可选 chip） */}
              {fertilizerLibraryStore.items.filter((it: any) => it.status === 'active').length > 0 && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-amber-700 hover:text-amber-900 select-none">
                    从肥料库选（点击展开 {fertilizerLibraryStore.items.filter((it: any) => it.status === 'active').length} 项）
                  </summary>
                  <div className="mt-2 max-h-40 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-1">
                    {fertilizerLibraryStore.items
                      .filter((it: any) => it.status === 'active')
                      .map((it: any) => {
                        // 2026-07-12：按 spec.id 去重（扁平结构每个 item 就是一条 spec）
                        const checked = selectedFertilizers.some((f) => f.id === it.id);
                        return (
                          <label
                            key={it.id}
                            className={`flex flex-col gap-0.5 px-2 py-1 rounded cursor-pointer border ${
                              checked ? 'bg-amber-100 border-amber-400' : 'bg-white border-amber-200'
                            } hover:bg-amber-50`}
                          >
                            <div className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleFertilizerFromLibrary(it)}
                                className="w-3 h-3"
                              />
                              <span className="truncate font-medium">{it.fertilizerName}</span>
                            </div>
                            <div className="text-[11px] text-gray-500 truncate pl-4">
                              {it.brandName || '主品牌'} · ¥{Number(it.unitPrice || 0).toFixed(2)}/单位 · 库存 {Number(it.stockQuantity || 0).toFixed(0)}{it.dosageUnit || 'kg'}
                            </div>
                          </label>
                        );
                      })}
                  </div>
                </details>
              )}
            </div>

            {/* 已选池（每行独立 quantity/unit/dilutionRatio） */}
            {selectedBizRecords.length > 0 && (
              <div className="space-y-2 mb-3">
                {selectedBizRecords.map((r) => (
                  <div key={`${r.type}-${r.id}-${r.fertilizerName || '-'}`} className="grid grid-cols-12 gap-2 items-center p-2 border border-emerald-200 bg-emerald-50 rounded-lg">
                    <div className="col-span-3 text-sm">
                      <div className="flex items-center gap-1">
                        <span className="text-xs">{r.type === 'planting' ? '🌱' : '🌿'}</span>
                        <span className="font-mono text-xs text-emerald-800">{r.code}</span>
                      </div>
                      <Input
                        type="text"
                        value={r.area}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'area', e.target.value)}
                        className="mt-1 h-7 text-xs"
                        placeholder="区域（可手改）"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-700 mb-1 block">肥料名 <span className="text-red-500">*</span></Label>
                      {/* 2026-07-12：肥料池下拉选择（选项 = 「肥料种类」段已选的多种肥料）；切换时同步联动 spec 字段 */}
                      <select
                        value={r.fertilizerName}
                        onChange={(e) => {
                          const newName = e.target.value;
                          const compositeKey = `${r.type}-${r.id}-${r.fertilizerName || '-'}`;
                          const choice = selectedFertilizers.find((f) => f.name === newName);
                          if (choice) {
                            // 库选/自定义：同步联动 spec 字段（单价随之刷新）
                            updateBizRecordField(compositeKey, 'fertilizerName', newName);
                            updateBizRecordField(compositeKey, 'fertilizerSpecId', choice.id);
                            updateBizRecordField(compositeKey, 'specBrandName', choice.brandName || '');
                            updateBizRecordField(compositeKey, 'specUnitPrice', Number(choice.unitPrice) || 0);
                            updateBizRecordField(compositeKey, 'specBatchNumber', choice.batchNumber || '');
                            updateBizRecordField(compositeKey, 'unitPrice', Number(choice.unitPrice) || 0);
                          } else {
                            // 清空（"请选择肥料…"）
                            updateBizRecordField(compositeKey, 'fertilizerName', '');
                            updateBizRecordField(compositeKey, 'fertilizerSpecId', undefined);
                            updateBizRecordField(compositeKey, 'specBrandName', undefined);
                            updateBizRecordField(compositeKey, 'specUnitPrice', undefined);
                            updateBizRecordField(compositeKey, 'specBatchNumber', undefined);
                            updateBizRecordField(compositeKey, 'unitPrice', 0);
                          }
                        }}
                        className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm bg-white"
                      >
                        <option value="">请选择肥料…</option>
                        {selectedFertilizers.map((f) => (
                          <option key={f.id} value={f.name}>
                            🧪 {f.name}{f.brandName ? ` · ${f.brandName}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-700 mb-1 block">用量</Label>
                      <Input
                        type="number"
                        value={String(r.quantity || '')}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'quantity', Number(e.target.value) || 0)}
                        className="h-8"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-gray-700 mb-1 block">单位</Label>
                      <select
                        value={r.unit}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'unit', e.target.value)}
                        className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm"
                      >
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
                      <Input
                        type="text"
                        value={r.dilutionRatio}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'dilutionRatio', e.target.value)}
                        className="h-8"
                      />
                    </div>
                    <div className="col-span-1">
                      {/* 2026-07-12：单价（自动从肥料库取；用户在库改的会自动同步过来；可手改覆盖） */}
                      <Label className="text-xs text-gray-700 mb-1 block">单价 <span className="text-emerald-600 text-[10px]">(元/单位)</span></Label>
                      <Input
                        type="number"
                        value={r.unitPrice || ''}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'unitPrice', Number(e.target.value) || 0)}
                        className="h-8"
                        step="0.01"
                        min="0"
                      />
                    </div>
                    <div className="col-span-1">
                      <Label className="text-xs text-gray-700 mb-1 block">施肥方式</Label>
                      <select
                        value={r.fertilizationMethod}
                        onChange={(e) => updateBizRecordField(`${r.type}-${r.id}-${r.fertilizerName || '-'}`, 'fertilizationMethod', e.target.value)}
                        className="w-full h-8 px-2 border border-gray-300 rounded-md text-sm"
                      >
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
                      {/* 2026-07-12：同区域再加另一种肥料（复制当前行的 record 信息，新行的肥料名留空） */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => duplicateRowWithNewFertilizer(r)}
                        className="text-emerald-600 hover:text-blue-600"
                        title="同区域再加另一种肥料"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleBizRecord(r.type, { id: r.id }, r.area)}
                        className="text-emerald-600 hover:text-red-600"
                        title="移除该行"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearBizRecords}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X className="w-3 h-3 mr-1" />清除全部
                  </Button>
                </div>
              </div>
            )}

            {/* 作物品种（由所选批次反填，可手改）+ 区域汇总 chips */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">
                  作物品种 <span className="text-red-500">*</span>
                  {selectedBizRecords.length > 0 && selectedBizRecords[0].cropName && (
                    <span className="ml-2 text-xs text-emerald-600">
                      （由所选批次反填：{selectedBizRecords[0].cropName}，可手改）
                    </span>
                  )}
                </Label>
                <CropCodeSelector
                  value={cropCode}
                  onChange={handleCropCodeChange}
                  placeholder={selectedBizRecords.length > 0 ? '由所选批次反填' : '请先选择施肥区域或手动选择品种'}
                  size="md"
                  showFullPath={true}
                />
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
                <div className={`${deepInputClass} min-h-[42px] flex flex-wrap items-center gap-1.5 px-2 py-1`}>
                  {(() => {
                    const areas = Array.from(new Set(selectedBizRecords.map((r) => r.area))).filter(Boolean);
                    return areas.length > 0 ? areas.map((area) => (
                      <span
                        key={area}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs"
                      >
                        📍 {area}
                      </span>
                    )) : <span className="text-gray-400 text-sm">尚未选择区域</span>;
                  })()}
                </div>
              </div>
            </div>

                        {/* 2026-07-05 字段锁定：温室/作物选中关联后只读（避免溯源链断裂） */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">
                  区域位置
                  {(form.plantingId || form.seedlingId) && (
                    <span className="ml-2 text-xs text-gray-500">（已锁定）</span>
                  )}
                </Label>
                <Input
                  type="text"
                  value={form.greenhouseName}
                  onChange={(e) => updateField('greenhouseName', e.target.value)}
                  placeholder={form.plantingId || form.seedlingId ? '由关联业务自动填充' : '请先选择关联业务'}
                  readOnly={!!(form.plantingId || form.seedlingId)}
                  className={`${deepInputClass} ${form.plantingId || form.seedlingId ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                />
              </div>
              <div>
                <Label className="text-gray-900">
                  作物品种
                  {(form.plantingId || form.seedlingId) && (
                    <span className="ml-2 text-xs text-gray-500">（已锁定）</span>
                  )}
                </Label>
                <CropCodeSelector
                  value={cropCode}
                  onChange={handleCropCodeChange}
                  placeholder={form.plantingId || form.seedlingId ? '由关联业务自动填充' : '请先选择关联业务'}
                  size="md"
                  showFullPath={true}
                  disabled={!!(form.plantingId || form.seedlingId)}
                />
                {selectedCrop && (
                  <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                    <div className="text-emerald-700">
                      {selectedCrop.categoryName} &gt; {selectedCrop.typeName} &gt; {selectedCrop.varietyName}
                      {selectedCrop.subVariety1Name && ` > ${selectedCrop.subVariety1Name}`}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 时间 + 操作员 + 备注（无分区标题，紧凑布局） */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-900">施肥时间</Label>
              <Input
                type="datetime-local"
                value={form.fertilizeTime}
                onChange={(e) => updateField('fertilizeTime', e.target.value)}
                className={deepInputClass}
              />
            </div>
            <div>
              <Label className="text-gray-900">操作员</Label>
              <Select
                value={form.operatorName || undefined}
                onValueChange={(val) => updateField('operatorName', val)}
              >
                <SelectTrigger className={`w-full h-10 ${deepInputClass}`}>
                  <SelectValue placeholder="选择操作员" />
                </SelectTrigger>
                <SelectContent>
                  {operatorOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-gray-900">备注</Label>
            <TextArea
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="请输入备注信息"
              rows={3}
              className={`${deepInputClass} resize-none`}
            />
          </div>
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={onClose}
        >
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button
          variant="default"
          size="sm"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
