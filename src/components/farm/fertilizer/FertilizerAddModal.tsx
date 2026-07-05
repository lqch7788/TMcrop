/**
 * 施肥新增弹窗组件
 * 4个区域：基础信息、肥料与用量、位置与时间、操作与备注
 * 使用 UnifiedModal 包装，提交时调用 store.createItem()
 */
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Search, X } from 'lucide-react';

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
import { useFertilizerStore, useFertilizerLibraryStore, usePlantingStore, useSeedlingStore } from '@/stores';
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

// 默认表单数据
const defaultForm = {
  fertilizerCode: '',
  fertilizerName: '',
  fertilizerType: '',
  cropName: '',
  greenhouseName: '',
  dilutionRatio: '',
  quantity: 0,
  unit: '千克',
  unitPrice: 0,
  totalCost: 0,
  fertilizeTime: '',
  operatorName: '',
  dataSource: 'manual' as const,
  description: '',
  inputMode: 'library' as 'library' | 'manual',
  selectedFertilizerId: '',
  // 关联种植记录（与 seedling 二选一，互斥）
  plantingId: '',
  plantingCode: '',
  // 关联育苗记录（与 planting 二选一，互斥）
  seedlingId: '',
  seedlingCode: '',
};

export function FertilizerAddModal({ isOpen, onClose, onSaved }: FertilizerAddModalProps) {
  const store = useFertilizerStore();
  const fertilizerLibraryStore = useFertilizerLibraryStore();

  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [cropCode, setCropCode] = useState('');
  const [selectedCrop, setSelectedCrop] = useState<CropVariety | null>(null);
  // Bug 修复: 独立追踪施肥量原始输入字符串（value={String(form.quantity)} 会把 "0."→0→"0"，吞掉小数点）
  const [quantityInputText, setQuantityInputText] = useState('');

  // 2026-07-05 重构：合并种植/育苗为统一"关联业务"选择器
  // - bizType: 'planting' | 'seedling'，互斥
  // - 选中后自动填 greenhouseName/cropName/关联单号，并锁定只读
  const [bizSearchKeyword, setBizSearchKeyword] = useState('');
  const [selectedBizLabel, setSelectedBizLabel] = useState('');
  const [showBizSearch, setShowBizSearch] = useState(false);
  const [bizType, setBizType] = useState<'planting' | 'seedling'>('planting');
  const bizSearchRef = useRef<HTMLDivElement>(null);

  // 种植记录列表（过滤未采收）
  const plantingOptions = useMemo(() => {
    if (bizType !== 'planting') return [];
    const plantings = usePlantingStore.getState().items;
    const activePlantings = plantings.filter((p: any) => !p.isHarvest);
    if (!bizSearchKeyword.trim()) return activePlantings;
    const kw = bizSearchKeyword.toLowerCase();
    return activePlantings.filter((p: any) =>
      (p.plantCode || '').toLowerCase().includes(kw) ||
      (p.cropName || '').toLowerCase().includes(kw) ||
      (p.rootName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizType]);

  // 育苗记录列表（2026-07-05 新增）
  const seedlingOptions = useMemo(() => {
    if (bizType !== 'seedling') return [];
    const seedlings = useSeedlingStore.getState().items as any[];
    if (!bizSearchKeyword.trim()) return seedlings;
    const kw = bizSearchKeyword.toLowerCase();
    return seedlings.filter((s: any) =>
      (s.seedlingCode || '').toLowerCase().includes(kw) ||
      (s.cropName || '').toLowerCase().includes(kw) ||
      (s.siteName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizType]);

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

  // 当前选中肥料的品牌名称
  const selectedFertilizerBrand = useMemo(() => {
    const selected = fertilizerLibraryStore.items.find(i => i.id === form.selectedFertilizerId);
    return selected?.specs?.[0]?.brandName || '-';
  }, [fertilizerLibraryStore.items, form.selectedFertilizerId]);

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

  // 获取 fetchItems 方法 (稳定的函数引用，避免 useEffect 依赖对象引用导致无限循环)
  const fetchLibraryItems = useFertilizerLibraryStore(state => state.fetchItems);

  useEffect(() => {
    fetchLibraryItems({ limit: '10000' });
  }, [fetchLibraryItems]);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      setForm({ ...defaultForm, inputMode: 'library', selectedFertilizerId: '' });
      setCropCode('');
      setSelectedCrop(null);
      setBizSearchKeyword('');
      setSelectedBizLabel('');
      setBizType('planting');
      setQuantityInputText('');
      // 加载种植和育苗记录列表
      usePlantingStore.getState().loadItems();
      useSeedlingStore.getState().loadItems();
      // 加载温室数据（操作员下拉用温室负责人）
      if (useGreenhouseStore.getState().greenhouses.length === 0) {
        useGreenhouseStore.getState().loadGreenhouses();
      }
    }
  }, [isOpen]);

  // 更新表单字段
  const updateField = useCallback((field: string, value: any) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // 自动计算总成本 = 施肥量 * 单价
      if (field === 'quantity' || field === 'unitPrice') {
        next.totalCost = (field === 'quantity' ? value : prev.quantity) * (field === 'unitPrice' ? value : prev.unitPrice);
      }
      return next;
    });
  }, []);

  // 提交表单
  const handleSubmit = async () => {
    // 前端必填校验（与后端 Zod schema 对齐，避免静默 400 错误）
    if (!form.fertilizerName.trim()) {
      await showAlert('请填写肥料名称');
      return;
    }
    if (!form.fertilizerType) {
      await showAlert('请选择肥料类型');
      return;
    }
    if (!form.cropName.trim()) {
      await showAlert('请选择作物品种（选择关联业务自动填充，或手动选择）');
      return;
    }
    if (!form.greenhouseName.trim()) {
      await showAlert('请填写区域位置（选择关联业务自动填充，或手动输入）');
      return;
    }
    if (!form.dilutionRatio.trim()) {
      await showAlert('请填写稀释比例');
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
    // 2026-07-05: 单位换算 — quantity 永远按基准单位（kg 或 L）提交
    // 库存比较、后端扣减逻辑都按基准单位算（数据库约定 quantity 是 kg）
    const quantityConverted = toBaseUnit(Number(form.quantity) || 0, form.unit);
    const payload: Record<string, any> = {
      fertilizerCode: form.fertilizerCode,
      fertilizerName: form.fertilizerName,
      fertilizerType: form.fertilizerType,
      cropName: form.cropName,
      greenhouseName: form.greenhouseName,
      dilutionRatio: form.dilutionRatio,
      // quantity 转 kg；不可换算单位（如"包/袋"）保留原值 + warning
      quantity: quantityConverted ? quantityConverted.baseQuantity : Number(form.quantity) || 0,
      unit: form.unit,  // 保留用户原选单位，仅用于显示
      unitPrice: form.unitPrice,
      totalCost: form.totalCost,
      fertilizeTime: form.fertilizeTime,
      operatorName: form.operatorName,
      dataSource: form.dataSource,
      description: form.description,
      // G11 V1.1：肥料库 id（与后端 FIELD_MAP 配套）— 之前 selectedFertilizerId 被忽略
      fertilizerId: form.selectedFertilizerId || null,
      // 关联业务：planting 和 seedling 二选一（互斥），前端表单已校验
      plantingId: form.plantingId,
      plantingCode: form.plantingCode,
      seedlingId: form.seedlingId,
      seedlingCode: form.seedlingCode,
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
    if (form.selectedFertilizerId) {
      try { await fetchLibraryItems(); } catch { /* refetch 失败不影响主流程 */ }
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
            <div className="grid grid-cols-2 gap-4">
              {/* 2026-07-05 重构：合并种植/育苗为统一"关联业务"选择器（二选一互斥）
                  Tab + 搜索框 inline 同一行（更紧凑布局） */}
              <div ref={bizSearchRef} className="relative">
                <div className="flex items-center gap-2 mb-1">
                  <Label className="text-gray-900 shrink-0">
                    关联业务 <span className="text-red-500">*</span>
                  </Label>
                  {/* 类型切换 Tab + 搜索框 inline */}
                  {!selectedBizLabel && (
                    <>
                      <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
                        <button
                          type="button"
                          onClick={() => setBizType('planting')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            bizType === 'planting' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          种植
                        </button>
                        <button
                          type="button"
                          onClick={() => setBizType('seedling')}
                          className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                            bizType === 'seedling' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          育苗
                        </button>
                      </div>
                      <Input
                        type="text"
                        value={bizSearchKeyword}
                        onChange={(e) => { setBizSearchKeyword(e.target.value); setShowBizSearch(true); }}
                        onFocus={() => setShowBizSearch(true)}
                        placeholder={bizType === 'planting' ? '搜索种植批号/作物/温室...' : '搜索育苗批号/作物/区域...'}
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
                    </>
                  )}
                </div>
                {/* 已选中业务 */}
                {selectedBizLabel ? (
                  <div className={`p-2 border rounded-lg ${
                    form.plantingId || form.seedlingId
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-medium ${
                        form.plantingId || form.seedlingId ? 'text-emerald-800' : 'text-gray-500'
                      }`}>
                        {selectedBizLabel}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          // 清空全部关联字段
                          updateField('plantingId', '');
                          updateField('plantingCode', '');
                          updateField('seedlingId', '');
                          updateField('seedlingCode', '');
                          updateField('greenhouseName', '');
                          updateField('cropName', '');
                          updateField('fertilizeTime', '');
                          setCropCode('');
                          setSelectedCrop(null);
                          setBizSearchKeyword('');
                          setSelectedBizLabel('');
                        }}
                      >
                        <X className="w-4 h-4 text-emerald-600" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 下拉选项 — 输入框已在上方 inline */}
                    {showBizSearch && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // 不关联任何业务（清空所有关联字段）
                            updateField('plantingId', '');
                            updateField('plantingCode', '');
                            updateField('seedlingId', '');
                            updateField('seedlingCode', '');
                            updateField('greenhouseName', '');
                            updateField('cropName', '');
                            updateField('fertilizeTime', '');
                            setCropCode('');
                            setSelectedCrop(null);
                            setBizSearchKeyword('');
                            setSelectedBizLabel('不关联任何业务');
                            setShowBizSearch(false);
                          }}
                          className="w-full justify-start rounded-none border-b border-gray-100"
                        >
                          <X className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-500">不关联任何业务</span>
                        </Button>
                        {bizType === 'planting' && plantingOptions.length > 0 && (
                          plantingOptions.map((planting: any) => (
                            <Button
                              key={planting.id}
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // 互斥：清空 seedling 字段
                                updateField('seedlingId', '');
                                updateField('seedlingCode', '');
                                // 填 planting 关联 + 自动填字段
                                updateField('plantingId', planting.id);
                                updateField('plantingCode', planting.plantCode);
                                updateField('greenhouseName', planting.rootName || planting.areaName || '');
                                updateField('cropName', planting.cropName || '');
                                // 施肥时间默认填当前时间（datetime-local 格式）
                                const now = new Date();
                                const tzOffset = now.getTimezoneOffset() * 60000;
                                const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
                                updateField('fertilizeTime', localISO);
                                setCropCode(planting.cropCode || '');
                                setBizSearchKeyword(planting.plantCode);
                                setSelectedBizLabel(`${bizType === 'planting' ? '种植' : '育苗'} · ${planting.plantCode} · ${planting.cropName || ''}`);
                                setShowBizSearch(false);
                              }}
                              className="w-full justify-start rounded-none border-b border-gray-100 last:border-b-0"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-800">{planting.plantCode}</p>
                                <p className="text-xs text-gray-500">{planting.cropName || ''} · {planting.rootName || planting.areaName || ''}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                planting.isHarvest ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'
                              }`}>
                                {planting.isHarvest ? '已采收' : '种植中'}
                              </span>
                            </Button>
                          ))
                        )}
                        {bizType === 'seedling' && seedlingOptions.length > 0 && (
                          seedlingOptions.map((seedling: any) => (
                            <Button
                              key={seedling.id}
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                // 互斥：清空 planting 字段
                                updateField('plantingId', '');
                                updateField('plantingCode', '');
                                // 填 seedling 关联 + 自动填字段
                                updateField('seedlingId', seedling.id);
                                updateField('seedlingCode', seedling.seedlingCode);
                                // 育苗记录用 siteName（育苗区域），非 greenhouseName（Seedling 类型无此字段）
                                updateField('greenhouseName', seedling.siteName || '');
                                updateField('cropName', seedling.cropName || '');
                                // 施肥时间默认填当前时间
                                const now = new Date();
                                const tzOffset = now.getTimezoneOffset() * 60000;
                                const localISO = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
                                updateField('fertilizeTime', localISO);
                                setCropCode(seedling.cropCode || '');
                                setBizSearchKeyword(seedling.seedlingCode);
                                setSelectedBizLabel(`育苗 · ${seedling.seedlingCode} · ${seedling.cropName || ''}`);
                                setShowBizSearch(false);
                              }}
                              className="w-full justify-start rounded-none border-b border-gray-100 last:border-b-0"
                            >
                              <div>
                                <p className="text-sm font-medium text-gray-800">{seedling.seedlingCode}</p>
                                <p className="text-xs text-gray-500">{seedling.cropName || ''} · {seedling.siteName || ''}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600`}>
                                育苗中
                              </span>
                            </Button>
                          ))
                        )}
                        {((bizType === 'planting' && plantingOptions.length === 0) ||
                          (bizType === 'seedling' && seedlingOptions.length === 0)) && (
                          <div className="p-4 text-center text-sm text-gray-400">
                            无匹配的{bizType === 'planting' ? '种植' : '育苗'}记录
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
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

        {/* Section 2: 肥料与用量 */}
        <div>
          <SectionTitle title="肥料与用量" icon="🧪" />
          <div className="space-y-3">
            {/* 模式切换：库选择 / 手动输入 */}
            <div className="flex gap-4 mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMode"
                  value="library"
                  checked={form.inputMode === 'library'}
                  onChange={() => setForm(f => ({ ...f, inputMode: 'library', selectedFertilizerId: '' }))}
                />
                从库选择
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="inputMode"
                  value="manual"
                  checked={form.inputMode === 'manual'}
                  onChange={() => setForm(f => ({ ...f, inputMode: 'manual', selectedFertilizerId: '' }))}
                />
                手动输入
              </label>
            </div>

            {/* 肥料类型 + 选择肥料/肥料名称 + 品牌名称 */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-gray-900">肥料类型</Label>
                <select
                  className={`w-full h-10 ${deepInputClass}`}
                  value={form.fertilizerType}
                  onChange={(e) => {
                    updateField('fertilizerType', e.target.value);
                    if (form.selectedFertilizerId) {
                      updateField('selectedFertilizerId', '');
                      updateField('fertilizerName', '');
                      updateField('dilutionRatio', '');
                    }
                  }}
                >
                  <option value="">选择肥料类型</option>
                  <option value="organic">有机肥</option>
                  <option value="inorganic">无机肥</option>
                  <option value="water_soluble">水溶肥</option>
                  <option value="compound">复合肥</option>
                  <option value="bio">生物肥</option>
                  <option value="slow_release">缓释肥</option>
                  <option value="trace">微量元素肥</option>
                </select>
              </div>
              {form.inputMode === 'manual' ? (
                <div>
                  <Label className="text-gray-900">
                    肥料名称 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    value={form.fertilizerName}
                    onChange={(e) => updateField('fertilizerName', e.target.value)}
                    placeholder="请输入肥料名称"
                    className={deepInputClass}
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-gray-900">选择肥料</Label>
                  <select
                    className={`w-full h-10 ${deepInputClass}`}
                    value={form.selectedFertilizerId}
                    onChange={(e) => {
                      const selected = fertilizerLibraryStore.items.find(i => i.id === e.target.value);
                      if (selected) {
                        setForm(f => ({
                          ...f,
                          selectedFertilizerId: selected.id,
                          fertilizerName: selected.fertilizerName,
                          fertilizerType: selected.fertilizerType || '',
                          dilutionRatio: selected.specs?.[0]?.suggestedRatio || '',
                        }));
                      }
                    }}
                  >
                    <option value="">-- 请先选择肥料类型 --</option>
                    {fertilizerLibraryStore.items
                      .filter(item => item.status === 'active' && (!form.fertilizerType || item.fertilizerType === form.fertilizerType))
                      .map(item => (
                        <option key={item.id} value={item.id}>
                          {item.fertilizerName}
                          {item.currentStock != null ? `（库存 ${item.currentStock}kg）` : ''}
                        </option>
                      ))}
                  </select>
                </div>
              )}
              {form.inputMode === 'library' && (
                <div>
                  <Label className="text-gray-900">品牌名称</Label>
                  <Input
                    type="text"
                    value={selectedFertilizerBrand}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-600"
                  />
                </div>
              )}
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <Label className="text-gray-900">稀释比例</Label>
                <Input
                  type="text"
                  value={form.dilutionRatio}
                  onChange={(e) => updateField('dilutionRatio', e.target.value)}
                  placeholder="如 1:500"
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">施肥量</Label>
                {/* 2026-07-05: 改用 type="text" + inputMode="decimal"
                    修复 type="number" 下"输入 0.1 时 0 丢失 + 0. 被截断"的浏览器 quirk */}
                <Input
                  type="text"
                  inputMode="decimal"
                  value={quantityInputText}
                  onChange={(e) => {
                    const v = e.target.value;
                    // 始终保留原始输入字符串（不通过 String(form.quantity) 反向转换，避免 "0."→0→"0" 吞小数点）
                    setQuantityInputText(v);
                    if (v === '') {
                      updateField('quantity', 0);
                      return;
                    }
                    // 用 parseFloat 宽容处理 "0." / "0.1" / ".5" / "abc"
                    const num = parseFloat(v);
                    if (!isNaN(num) && num >= 0) {
                      updateField('quantity', num);
                    }
                  }}
                  placeholder="0"
                  className={deepInputClass}
                />
                {(() => {
                  if (form.inputMode !== 'library' || !form.selectedFertilizerId) return null;
                  const lib = fertilizerLibraryStore.items.find(i => i.id === form.selectedFertilizerId);
                  if (!lib || lib.currentStock == null) return null;
                  // 2026-07-05: 用 toBaseUnit 把用户输入换算成基准单位（kg 或 L）后比对库存
                  const converted = toBaseUnit(Number(form.quantity) || 0, form.unit);
                  // 换算预览（用户填了非基准单位时显示）
                  let previewEl = null;
                  if (converted && form.unit !== converted.baseUnit) {
                    previewEl = (
                      <div className="text-xs text-gray-500 mt-1" data-testid="unit-conversion-preview">
                        = {converted.baseQuantity.toLocaleString(undefined, { maximumFractionDigits: 3 })} {converted.baseUnit}
                      </div>
                    );
                  } else if (!isConvertibleUnit(form.unit) && form.unit) {
                    previewEl = (
                      <div className="text-xs text-amber-600 mt-1" data-testid="unit-conversion-warning">
                        ⚠ 单位「{form.unit}」无法自动换算，库存校验仅供参考，请人工核对
                      </div>
                    );
                  }
                  // 库存校验：converted 存在时用基准值；不存在时用 number（参考）
                  const compareQty = (converted?.baseQuantity ?? Number(form.quantity)) || 0;
                  let warnEl = null;
                  if (converted && compareQty > lib.currentStock) {
                    warnEl = (
                      <div className="text-amber-600 text-sm mt-1" data-testid="stock-warning">
                        ⚠ 施肥量 {form.quantity} {form.unit}（≈ {compareQty.toLocaleString(undefined, { maximumFractionDigits: 3 })} {converted.baseUnit}）超过库存 {lib.currentStock}{converted.baseUnit}
                      </div>
                    );
                  }
                  return (
                    <>
                      {previewEl}
                      {warnEl}
                    </>
                  );
                })()}
              </div>
              <div>
                <Label className="text-gray-900">单位</Label>
                <DictSelect
                  category="unit"
                  value={form.unit}
                  onChange={(value) => updateField('unit', value)}
                  placeholder="选择单位"
                />
              </div>
              <div>
                <Label className="text-gray-900">单价 (元/{form.unit || '单位'})</Label>
                <Input
                  type="number"
                  value={form.unitPrice || ''}
                  onChange={(e) => updateField('unitPrice', Number(e.target.value))}
                  min="0"
                  step="0.01"
                  placeholder="0"
                  className={deepInputClass}
                />
              </div>
            </div>
            <div>
              <Label className="text-gray-900">总成本（自动计算）</Label>
              <Input
                type="text"
                value={`${form.totalCost.toFixed(2)} 元`}
                readOnly
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-green-50 font-bold text-emerald-700"
              />
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
          disabled={submitting || !form.fertilizerName.trim()}
        >
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}
