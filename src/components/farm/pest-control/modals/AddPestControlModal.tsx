/**
 * 新增病虫害防治记录弹窗
 * 2026-07-10：完全重构，删除化学/生物/物理三分支，改为统一字段（pesticideList 多项目 + 肥料联用）
 * 2026-07-11：关联业务移到作物名称字段前面，与施肥管理新增弹窗一致
 * 2026-07-11：目标病虫害从纯文本输入改为"病害/虫害"Tab + 搜索下拉多选
 * 2026-07-11：防治项目改为"药剂池"模式（PesticidePoolItem[] 替代 PesticideItem[]）
 * - 顶部药剂类型多选 checkbox → 过滤下方药剂下拉
 * - 选择药剂后自动加入池（按 pesticideId 去重，自动用 specs[0] 默认值）
 * - 池中每行内联编辑：用量/单位/稀释倍数/使用方法/备注
 * - 一键清空药剂池、单个移除
 * - 提交时序列化为 pesticideList JSON（schema 兼容）
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, X, Search } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { DictSelect } from '@/components/common/settings/DictSelect';
import { UnitDictSelect } from '@/components/common/settings/UnitDictSelect';
import { usePestControlStore, usePesticideLibraryStore, usePestDiseaseDictStore, usePlantingStore, useSeedlingStore } from '@/stores';
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { showAlert } from '@/lib/dialogService';
import { todayLocal, currentTimeLocal } from '@/lib/dateUtils';

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

/**
 * 2026-07-11：药剂池条目（替代化学/生物/物理三分支 + 原 PesticideItem 多卡片）
 * - pesticideId: 药剂库 id（用于库存扣减 + 去重）
 * - pesticideName: 药剂名称
 * - pesticideCode: 编码
 * - pesticideTypes: 类型数组（从药剂库带入，冗余展示）
 * - 2026-07-11：精确到规格（spec）— 同一药剂名可能有多个不同含量/厂家规格
 *   - specId: 规格 id（按规格去重 + 库存扣减 + 详情定位）
 *   - specContent: 规格描述（如 "80%可湿性粉剂"）
 *   - formulation: 剂型
 *   - manufacturer: 厂家
 *   - brandName: 品牌名
 * - dosage / unit / ratio / applicationMethod: 用量/单位/稀释倍数/使用方法
 * - remarks: 备注
 * - 添加到池时自动用选中规格的 suggestedDosage/Ratio/Unit/remark 作默认值
 */
interface PesticidePoolItem {
  pesticideId?: string;
  pesticideName: string;
  pesticideCode?: string;
  pesticideTypes?: string[];
  specId?: string;
  specContent?: string;
  formulation?: string;
  manufacturer?: string;
  brandName?: string;
  dosage?: string;
  unit?: string;
  dilutionRatio?: string;
  applicationMethod?: string;
  remarks?: string;
}

// 2026-07-11：肥料池条目（替代原 LeafFertilizerItem 单一肥料）
// - name: 肥料名称（自由输入）
// - dosage / unit / ratio: 用量/单位/稀释倍数
// - remarks: 备注
interface FertilizerPoolItem {
  name: string;
  dosage: string;
  unit: string;
  ratio: string;
  remarks?: string;
}

// 2026-07-12：防治区域多选 — 每条选中的种植/育苗记录（含批次、区域、作物）
interface SelectedBizRecord {
  type: 'planting' | 'seedling';
  id: string;
  code: string;
  cropName: string;
  area: string;       // 种植用 rootName/areaName，育苗用 siteName
}

export function AddPestControlModal({ isOpen, onClose, onSaved }: {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const pestStore = usePestControlStore();
  const pesticideStore = usePesticideLibraryStore();
  const pestDiseaseStore = usePestDiseaseDictStore();
  const plantingStore = usePlantingStore();
  const seedlingStore = useSeedlingStore();
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  // 基础信息
  const [form, setForm] = useState({
    recordCode: '',
    sprayTime: '',
    cropName: '',
    greenhouseName: '',
    operatorName: '',
    // 2026-07-11：改为多选数组，从病虫害词典加载（兼容旧 schema 用空格 join 提交）
    targetPests: [] as string[],
    description: '',
  });

  // 2026-07-11：药剂池（每个条目是一个药剂 + 内联用量/单位/稀释/方法/备注）
  const [pesticidePool, setPesticidePool] = useState<PesticidePoolItem[]>([]);
  // 顶部类型筛选（多选）— 勾选后下拉只显示匹配类型的药剂
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  // 下拉搜索关键字 + 显示状态
  const [pesticideSearchKeyword, setPesticideSearchKeyword] = useState('');
  const [showPesticideDropdown, setShowPesticideDropdown] = useState(false);
  const pesticideDropdownRef = useRef<HTMLDivElement>(null);

  // 2026-07-11：肥料联用池化（多行，可增删）
  const [useFertilizer, setUseFertilizer] = useState(false);
  const [fertilizerPool, setFertilizerPool] = useState<FertilizerPoolItem[]>([]);

  const [submitting, setSubmitting] = useState(false);

  // 2026-07-12：防治区域多选 — 选项按 Tab 分种植/育苗（可同时多选 record；同一次只允许同一作物）
  const [bizTabType, setBizTabType] = useState<'planting' | 'seedling'>('planting');
  const [selectedBizRecords, setSelectedBizRecords] = useState<SelectedBizRecord[]>([]);
  const [bizSearchKeyword, setBizSearchKeyword] = useState('');
  const [showBizSearch, setShowBizSearch] = useState(false);
  const bizSearchRef = useRef<HTMLDivElement>(null);

  // 2026-07-11：目标病虫害多选（病害/虫害 Tab 切换 + 搜索下拉）
  const [pestTabType, setPestTabType] = useState<'pest' | 'disease'>('pest');
  const [pestSearchKeyword, setPestSearchKeyword] = useState('');
  const [showPestSearch, setShowPestSearch] = useState(false);
  const pestSearchRef = useRef<HTMLDivElement>(null);

  // 加载药剂列表 + 种植/育苗列表 + 病虫害词典
  useEffect(() => {
    if (isOpen) {
      // 2026-07-11：药剂池只需拉取 store，UI 中通过 useMemo 派生过滤列表
      pesticideStore.fetchItems();
      // 加载种植和育苗记录列表（用于关联业务下拉）
      if (plantingStore.items.length === 0) {
        plantingStore.loadItems();
      }
      if (seedlingStore.items.length === 0) {
        seedlingStore.loadItems();
      }
      // 加载病虫害词典（用于目标病虫害多选）
      pestDiseaseStore.fetchItems();
    }
  }, [isOpen]);

  // 2026-07-12：种植记录选项（按 Tab 过滤 + 搜索）
  const plantingOptions = useMemo(() => {
    const plantings = plantingStore.items as any[];
    const activePlantings = plantings.filter((p: any) => !p.isHarvest);
    if (!bizSearchKeyword.trim() || bizTabType !== 'planting') return bizTabType === 'planting' ? activePlantings : [];
    const kw = bizSearchKeyword.toLowerCase();
    return activePlantings.filter((p: any) =>
      (p.plantCode || '').toLowerCase().includes(kw) ||
      (p.cropName || '').toLowerCase().includes(kw) ||
      (p.rootName || '').toLowerCase().includes(kw) ||
      (p.areaName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizTabType, plantingStore.items]);

  // 2026-07-12：育苗记录选项（按 Tab 过滤 + 搜索）
  const seedlingOptions = useMemo(() => {
    const seedlings = seedlingStore.items as any[];
    if (!bizSearchKeyword.trim() || bizTabType !== 'seedling') return bizTabType === 'seedling' ? seedlings : [];
    const kw = bizSearchKeyword.toLowerCase();
    return seedlings.filter((s: any) =>
      (s.seedlingCode || '').toLowerCase().includes(kw) ||
      (s.cropName || '').toLowerCase().includes(kw) ||
      (s.siteName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizTabType, seedlingStore.items]);

  // 点击外部关闭搜索下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (bizSearchRef.current && !bizSearchRef.current.contains(e.target as Node)) {
        setShowBizSearch(false);
      }
      if (pestSearchRef.current && !pestSearchRef.current.contains(e.target as Node)) {
        setShowPestSearch(false);
      }
      if (pesticideDropdownRef.current && !pesticideDropdownRef.current.contains(e.target as Node)) {
        setShowPesticideDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 2026-07-11：药剂池相关
  // 切换类型筛选（多选）
  const toggleTypeFilter = useCallback((typeCode: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeCode) ? prev.filter((t) => t !== typeCode) : [...prev, typeCode]
    );
  }, []);

  // 已激活的药剂类型字典（用于顶部多选 checkbox）
  const pesticideTypeItems = useMemo(() => {
    return dictionaries.filter(
      (d: any) => (d.categoryCode || d.category_code || d.category) === 'pesticide_type'
    );
  }, [dictionaries]);

  // 2026-07-11：药剂库杀线虫剂 tab 已下线，顶部 checkbox 过滤掉
  const EXCLUDED_PESTICIDE_TYPE_LABELS = ['杀线虫剂', 'nematicide'];

  // 顶层类型（用于顶部 checkbox 行，过滤掉已废弃的杀线虫剂）
  const topLevelPesticideTypes = useMemo(() => {
    return pesticideTypeItems.filter((d: any) => {
      if (d.parentId || d.parent_id) return false;
      const label = d.dictLabel || d.dict_label;
      const code = d.dictCode || d.dict_code;
      return !EXCLUDED_PESTICIDE_TYPE_LABELS.includes(label) && !EXCLUDED_PESTICIDE_TYPE_LABELS.includes(code);
    });
  }, [pesticideTypeItems]);

  // 2026-07-12：扁平化后每个 item 本身就是规格，不再需要展开 specs[]
  // - 返回结构：{ pesticide, spec }[]，其中 spec === pesticide（扁平后每条即完整规格）
  const filteredSpecs = useMemo(() => {
    const items = (pesticideStore.items as any[]).filter(
      (p) => p.status === 'active' || !p.status
    );
    // 1. 类型筛选
    let pool = items;
    if (selectedTypes.length > 0) {
      pool = pool.filter((p) =>
        (p.pesticideTypes || []).some((t: string) => selectedTypes.includes(t))
      );
    }
    // 2. 关键字筛选（按药剂名/编码/含量/厂家/品牌）
    const kw = pesticideSearchKeyword.trim().toLowerCase();
    // 3. 扁平化后每条即完整规格，直接映射
    const rows: { pesticide: any; spec: any }[] = [];
    for (const p of pool) {
      if (kw) {
        const hay = [
          p.pesticideName,
          p.pesticideCode,
          p.ingredient,
          p.specContent,
          p.manufacturer,
          p.brandName,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(kw)) continue;
      }
      rows.push({ pesticide: p, spec: p }); // 扁平化：pesticide 和 spec 是同一个对象
    }
    return rows;
  }, [selectedTypes, pesticideSearchKeyword, pesticideStore.items]);

  // 选中"规格"加入池（按 specId 去重，自动用 spec 默认值）
  const addToPool = useCallback((pesticide: any, spec: any | null) => {
    // 无规格时用 pesticide.id 作 fallback key
    const dedupeKey = spec?.id || pesticide.id;
    setPesticidePool((prev) => {
      if (prev.some((p) => (p.specId || p.pesticideId) === dedupeKey)) return prev;
      const newItem: PesticidePoolItem = {
        pesticideId: pesticide.id,
        pesticideName: pesticide.pesticideName,
        pesticideCode: pesticide.pesticideCode,
        pesticideTypes: pesticide.pesticideTypes || [],
        specId: spec?.id,
        specContent: spec?.specContent,
        formulation: spec?.formulation,
        manufacturer: spec?.manufacturer,
        brandName: spec?.brandName,
        dosage: spec?.suggestedDosage || '',
        unit: spec?.dosageUnit || '',
        dilutionRatio: spec?.suggestedRatio || '',
        applicationMethod: '',
        remarks: spec?.remark || '',
      };
      return [...prev, newItem];
    });
    setPesticideSearchKeyword('');
    setShowPesticideDropdown(false);
  }, []);

  // 从池中移除
  const removeFromPool = useCallback((index: number) => {
    setPesticidePool((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // 更新池中某行字段
  const updatePoolField = useCallback(
    (index: number, field: keyof PesticidePoolItem, value: any) => {
      setPesticidePool((prev) =>
        prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
      );
    },
    []
  );

  // 病虫害词典过滤（按 tab 类型 + 关键字 + 状态）
  const pestDictOptions = useMemo(() => {
    const items = pestDiseaseStore.items.filter((d: any) => d.status === 'active' || !d.status);
    const typed = items.filter((d: any) => d.dictType === pestTabType);
    if (!pestSearchKeyword.trim()) return typed;
    const kw = pestSearchKeyword.toLowerCase();
    return typed.filter((d: any) =>
      (d.dictName || '').toLowerCase().includes(kw) ||
      (d.dictCode || '').toLowerCase().includes(kw)
    );
  }, [pestSearchKeyword, pestTabType, pestDiseaseStore.items]);

  // 切换病虫害多选（2026-07-11：勾选后自动隐藏下拉，避免遮挡已选 chip）
  const togglePest = useCallback((dictName: string) => {
    setForm((prev) => {
      const list = prev.targetPests;
      return {
        ...prev,
        targetPests: list.includes(dictName)
          ? list.filter((n) => n !== dictName)
          : [...list, dictName],
      };
    });
    setShowPestSearch(false);
  }, []);

  // 移除已选 chip
  const removePest = useCallback((dictName: string) => {
    setForm((prev) => ({ ...prev, targetPests: prev.targetPests.filter((n) => n !== dictName) }));
  }, []);

  // 重置表单
  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const dateStr = todayLocal(now);
      const timeStr = currentTimeLocal(now);
      // 2026-07-11：强制整点（HH:00:00），分钟/秒归零
      const hh = (timeStr || '').split(':')[0] || '00';
      const hhTimeStr = `${hh}:00:00`;
      setForm({
        recordCode: '',
        sprayTime: dateStr ? `${dateStr} ${hhTimeStr}` : '',
        cropName: '',
        greenhouseName: '',
        operatorName: '',
        targetPests: [],
        description: '',
      });
      // 药剂池重置
      setPesticidePool([]);
      setSelectedTypes([]);
      setPesticideSearchKeyword('');
      setShowPesticideDropdown(false);
      setUseFertilizer(false);
      setFertilizerPool([]);
      // 2026-07-12：防治区域多选重置
      setSelectedBizRecords([]);
      setBizSearchKeyword('');
      setShowBizSearch(false);
      setBizTabType('planting');
      // 目标病虫害选择器重置
      setPestSearchKeyword('');
      setPestTabType('pest');
      setShowPestSearch(false);
    }
  }, [isOpen]);

  // 更新表单字段
  const updateForm = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 2026-07-11：移除原 PesticideItem 多卡片相关函数（addPesticideItem/removePesticideItem/updatePesticideItem/togglePesticideTypeInItem/renderPesticideTypeSelector）
// 改为统一的药剂池（toggleTypeFilter/addToPool/removeFromPool/updatePoolField）

  // 2026-07-12：多选勾选一条种植/育苗记录 + 作物一致性校验
  const handleToggleBizRecord = (kind: 'planting' | 'seedling', record: any, area: string) => {
    const recordId = record.id;
    const cropName = record.cropName || '';
    const code = kind === 'planting' ? record.plantCode : record.seedlingCode;
    setSelectedBizRecords((prev) => {
      const isSelected = prev.some((r) => r.type === kind && r.id === recordId);
      if (isSelected) {
        const next = prev.filter((r) => !(r.type === kind && r.id === recordId));
        // 同步作物：若还剩已选，取首个 cropName；全部清空则不动 cropName 让用户保留或自填
        if (next.length > 0 && !form.cropName) {
          updateForm('cropName', next[0].cropName);
        }
        // 同步 greenhouseName：去重按区域排序 join
        const areas = Array.from(new Set(next.map((r) => r.area))).filter(Boolean);
        updateForm('greenhouseName', areas.join(','));
        return next;
      }
      // 新增：与已选作物一致性校验（混合作物拒绝）
      if (prev.length > 0 && prev[0].cropName && cropName && prev[0].cropName !== cropName) {
        showAlert(`同一次防治记录只能针对同一作物。已选作物：${prev[0].cropName}，该区域作物：${cropName}`);
        return prev;
      }
      const nextItem: SelectedBizRecord = { type: kind, id: recordId, code: code || '', cropName, area };
      const next = [...prev, nextItem];
      // 自动填入作物：仅在用户尚未手动改过 cropName 时
      if (next.length === 1 && cropName && !form.cropName) {
        updateForm('cropName', cropName);
      }
      // 同步 greenhouseName：去重按区域排序 join
      const areas = Array.from(new Set(next.map((r) => r.area))).filter(Boolean);
      updateForm('greenhouseName', areas.join(','));
      return next;
    });
  };

  // 2026-07-12：清除全部已选
  const handleClearBizRecords = () => {
    setSelectedBizRecords([]);
    updateForm('greenhouseName', '');
  };

  // 提交
  const handleSubmit = async () => {
    if (!form.sprayTime) {
      await showAlert('请选择防治日期');
      return;
    }
    if (!form.cropName) {
      await showAlert('请输入或选择作物名称');
      return;
    }
    // 2026-07-11：药剂池校验 — 至少 1 个药剂
    if (pesticidePool.length === 0) {
      await showAlert('请至少添加 1 个药剂到防治药剂池');
      return;
    }

    setSubmitting(true);
    try {
      // 2026-07-11：合并池中所有药剂类型的并集作为记录级 pesticideTypes
      const allTypes = Array.from(new Set(pesticidePool.flatMap((it) => it.pesticideTypes || [])));
      // 取第一个药剂的主字段作为记录级（兼容老字段 pesticideName/dosage 等）
      const first = pesticidePool[0];

      // 序列化药剂池为 pesticideList JSON（schema 兼容旧字段名 + 2026-07-11 规格级）
      const pesticideListJson = JSON.stringify(
        pesticidePool.map((it) => ({
          name: it.pesticideName,
          pesticideId: it.pesticideId,
          pesticideCode: it.pesticideCode,
          // 2026-07-11：精确到规格
          specId: it.specId,
          specContent: it.specContent,
          formulation: it.formulation,
          manufacturer: it.manufacturer,
          brandName: it.brandName,
          type: (it.pesticideTypes || [])[0] || '',   // 主类型
          types: it.pesticideTypes || [],              // 完整类型
          dosage: it.dosage,
          unit: it.unit,
          ratio: it.dilutionRatio,
          applicationMethod: it.applicationMethod,
          remarks: it.remarks,
        }))
      );

      await pestStore.createItem({
        sprayTime: form.sprayTime,
        operatorName: form.operatorName,
        cropName: form.cropName,
        greenhouseName: form.greenhouseName,
        // 目标病虫害多选用空格 join（兼容旧 schema 显示）
        targetPest: form.targetPests.join(' '),
        description: form.description,
        pesticideTypes: allTypes,
        // 兼容老字段（取池中第一个药剂）
        pesticideName: first.pesticideName,
        pesticideId: first.pesticideId,
        dosage: first.dosage ? Number(first.dosage) : undefined,
        dosageUnit: first.unit,
        dilutionRatio: first.dilutionRatio,
        applicationMethod: first.applicationMethod,
        // JSON 列表字段（池数据）
        pesticideList: pesticideListJson,
        // 2026-07-11：肥料联用池化（多肥料）
        useLeafFertilizer: useFertilizer ? 'yes' : 'no',
        // 池序列化为 JSON（叶面肥已重命名为肥料）
        leafFertilizerList: useFertilizer && fertilizerPool.length > 0
          ? JSON.stringify(fertilizerPool)
          : null,
        // 兼容旧字段（取池中第一个）
        leafFertilizerName: useFertilizer && fertilizerPool[0] ? fertilizerPool[0].name : undefined,
        leafFertilizerDosage: useFertilizer && fertilizerPool[0]?.dosage ? Number(fertilizerPool[0].dosage) : undefined,
        leafFertilizerUnit: useFertilizer && fertilizerPool[0] ? fertilizerPool[0].unit : undefined,
        // 兼容 bio/physical 字段（如有填）
        bioAgentList: JSON.stringify([]),
        equipmentList: JSON.stringify([]),
        // 2026-07-17：移除 status 字段（DB 列已删除，业务上防治记录无中间态）
      } as any);
      onSaved();
    } catch (err) {
      await showAlert('保存失败：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // 2026-07-12：选项按 Tab 类别计算为 plantingOptions / seedlingOptions

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增防治记录"
      size="xl"
      width={1170}   // 2026-07-11：默认尺寸整体 +30%（900 * 1.3 = 1170）
      height={780}   // 600 * 1.3 = 780
      showFooter={false}
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* 基础信息 */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">📋 基础信息</h3>
          <div className="space-y-4">
            {/* 2026-07-11：防治日期 + 操作员（移到关联业务上方） */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">防治日期 <span className="text-red-500">*</span><span className="text-gray-500 text-xs ml-1">（精确到整点）</span></Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={form.sprayTime ? form.sprayTime.split(' ')[0] : ''}
                    onChange={(e) => {
                      // 2026-07-11：拆成日期 + 小时两个独立控件（避免分钟干扰）
                      const date = e.target.value;
                      const hh = (form.sprayTime || '').split(' ')[1]?.split(':')[0] || '00';
                      updateForm('sprayTime', date ? `${date} ${hh}:00:00` : '');
                    }}
                    className={`${deepInputClass} flex-1`}
                  />
                  <select
                    value={(form.sprayTime || '').split(' ')[1]?.split(':')[0] || '00'}
                    onChange={(e) => {
                      const hh = e.target.value;
                      const date = (form.sprayTime || '').split(' ')[0] || '';
                      updateForm('sprayTime', date ? `${date} ${hh}:00:00` : ` ${hh}:00:00`);
                    }}
                    className="px-3 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner bg-white"
                  >
                    {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0')).map(hh => (
                      <option key={hh} value={hh}>{hh}:00</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <Label className="text-gray-900">操作员</Label>
                <Input
                  type="text"
                  value={form.operatorName}
                  onChange={(e) => updateForm('operatorName', e.target.value)}
                  placeholder="请输入操作员"
                  className={deepInputClass}
                />
              </div>
            </div>

            {/* 2026-07-12：防治区域多选 — Tab 切换种植/育苗 + record 列表多选；同一次防治仅同一作物 */}
            {/* 2026-07-16 重构：拆 grid-cols-2 — 左半 Tab+搜索，右半 已选 chips + 清除，与其他 row 视觉对齐 */}
            <div ref={bizSearchRef} className="relative">
              <div className="grid grid-cols-2 gap-4">
                {/* 左半：Label + Tab + 搜索框 */}
                <div className="flex flex-col">
                  <Label className="text-gray-900 mb-1">
                    📍 防治区域 <span className="text-gray-500 text-xs">（可多选；同一次只能针对同一作物）</span>
                  </Label>
                  <div className="flex items-center gap-2">
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
                    {/* 搜索框 */}
                    <Input
                      type="text"
                      value={bizSearchKeyword}
                      onChange={(e) => { setBizSearchKeyword(e.target.value); setShowBizSearch(true); }}
                      onFocus={() => setShowBizSearch(true)}
                      placeholder={bizTabType === 'planting' ? '搜索种植批号...' : '搜索育苗批号...'}
                      className={`flex-1 ${deepInputClass} rounded-l-lg`}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowBizSearch(!showBizSearch)}
                      className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg shrink-0"
                    >
                      <Search className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
                {/* 右半：已选 chips 显示（与其他 row 右列对齐） */}
                <div className="flex flex-col">
                  <Label className="text-gray-900 mb-1">
                    已选防治区域 <span className="text-gray-500 text-xs">（{selectedBizRecords.length} 个）</span>
                  </Label>
                  <div className={`${deepInputClass} min-h-[42px] flex flex-wrap items-center gap-1.5 px-2 py-1`}>
                    {selectedBizRecords.length > 0 ? (
                      <>
                        {selectedBizRecords.map((r) => (
                          <span
                            key={`${r.type}-${r.id}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs"
                          >
                            <span>{r.type === 'planting' ? '🌱' : '🌿'}</span>
                            <span className="font-mono">{r.code}</span>
                            <span>· {r.area}</span>
                            <button
                              type="button"
                              onClick={() => handleToggleBizRecord(r.type, { id: r.id, cropName: r.cropName, plantCode: r.code, seedlingCode: r.code }, r.area)}
                              className="ml-0.5 text-emerald-600 hover:text-red-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={handleClearBizRecords}
                          className="text-xs text-gray-500 hover:text-red-600 ml-auto"
                        >
                          清除全部
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-sm">请从左侧选择区域</span>
                    )}
                  </div>
                </div>
              </div>
              {/* 下拉选项列表 */}
              {showBizSearch && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {bizTabType === 'planting' && plantingOptions.length > 0 && (
                    plantingOptions.map((p: any) => {
                      const checked = selectedBizRecords.some((r) => r.type === 'planting' && r.id === p.id);
                      const area = p.rootName || p.areaName || '';
                      return (
                        <Button
                          key={p.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleBizRecord('planting', p, area)}
                          className="w-full justify-between rounded-none border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-2 text-left min-w-0 flex-1">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 bg-white'
                            }`}>
                              {checked && <span className="text-xs">✓</span>}
                            </span>
                            {/* 2026-07-16：单行 3 段（ID|作物|区域），竖线分隔，不同颜色 */}
                            <span className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <span className="text-sm font-mono font-semibold text-blue-700 truncate" title={p.plantCode}>
                                {p.plantCode}
                              </span>
                              <span className="text-gray-300 shrink-0">|</span>
                              <span className="text-sm font-medium text-emerald-700 truncate" title={p.cropName || ''}>
                                {p.cropName || '-'}
                              </span>
                              <span className="text-gray-300 shrink-0">|</span>
                              <span className="text-xs text-gray-600 truncate" title={area}>
                                {area || '-'}
                              </span>
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                            p.isHarvest ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'
                          }`}>
                            {p.isHarvest ? '已采收' : '种植中'}
                          </span>
                        </Button>
                      );
                    })
                  )}
                  {bizTabType === 'seedling' && seedlingOptions.length > 0 && (
                    seedlingOptions.map((s: any) => {
                      const checked = selectedBizRecords.some((r) => r.type === 'seedling' && r.id === s.id);
                      const area = s.siteName || '';
                      return (
                        <Button
                          key={s.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleBizRecord('seedling', s, area)}
                          className="w-full justify-between rounded-none border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-2 text-left min-w-0 flex-1">
                            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              checked ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 bg-white'
                            }`}>
                              {checked && <span className="text-xs">✓</span>}
                            </span>
                            {/* 2026-07-16：单行 3 段（ID|作物|区域），竖线分隔，不同颜色 */}
                            <span className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                              <span className="text-sm font-mono font-semibold text-blue-700 truncate" title={s.seedlingCode}>
                                {s.seedlingCode}
                              </span>
                              <span className="text-gray-300 shrink-0">|</span>
                              <span className="text-sm font-medium text-emerald-700 truncate" title={s.cropName || ''}>
                                {s.cropName || '-'}
                              </span>
                              <span className="text-gray-300 shrink-0">|</span>
                              <span className="text-xs text-gray-600 truncate" title={area}>
                                {area || '-'}
                              </span>
                            </span>
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

            {/* 作物名称（由所选首个 record 反填，可手改）+ 防治区域显示（多 chip，区域名去重） */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">
                  作物名称 <span className="text-red-500">*</span>
                  {selectedBizRecords.length > 0 && (
                    <span className="ml-2 text-xs text-emerald-600">
                      （由所选批次反填：{selectedBizRecords[0].cropName || '-'}，可手改）
                    </span>
                  )}
                </Label>
                <Input
                  type="text"
                  value={form.cropName}
                  onChange={(e) => updateForm('cropName', e.target.value)}
                  placeholder={selectedBizRecords.length > 0 ? '由所选批次反填' : '请输入作物名称'}
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">
                  防治区域明细（已选，去重）
                </Label>
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

            {/* 目标病虫害（2026-07-11：病害/虫害 Tab + 搜索下拉多选，从病虫害词典关联） */}
            {/* 2026-07-16 重构：拆 grid-cols-2 — 左半 Tab+搜索，右半 已选 chips，与其他 row 视觉对齐 */}
            <div ref={pestSearchRef} className="relative">
              <div className="grid grid-cols-2 gap-4">
                {/* 左半：Label + Tab + 搜索框 */}
                <div className="flex flex-col">
                  <Label className="text-gray-900 mb-1">
                    目标病虫害 <span className="text-gray-500 text-xs">（多选，可同时防病害+虫害）</span>
                  </Label>
                  <div className="flex items-center gap-2">
                    {/* Tab 切换 */}
                    <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 shrink-0">
                      <button
                        type="button"
                        onClick={() => { setPestTabType('pest'); setShowPestSearch(true); }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          pestTabType === 'pest' ? 'bg-orange-500 text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🐛 虫害
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPestTabType('disease'); setShowPestSearch(true); }}
                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                          pestTabType === 'disease' ? 'bg-purple-500 text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        🦠 病害
                      </button>
                    </div>
                    {/* 搜索框 */}
                    <Input
                      type="text"
                      value={pestSearchKeyword}
                      onChange={(e) => { setPestSearchKeyword(e.target.value); setShowPestSearch(true); }}
                      onFocus={() => setShowPestSearch(true)}
                      placeholder={pestTabType === 'pest' ? '搜索虫害名称...' : '搜索病害名称...'}
                      className={`flex-1 ${deepInputClass} rounded-l-lg`}
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowPestSearch(!showPestSearch)}
                      className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg shrink-0"
                    >
                      <Search className="w-4 h-4 text-gray-500" />
                    </Button>
                  </div>
                </div>
                {/* 右半：已选 chip 显示（与其他 row 右列对齐） */}
                <div className="flex flex-col">
                  <Label className="text-gray-900 mb-1">
                    已选病虫害 <span className="text-gray-500 text-xs">（{form.targetPests.length} 个）</span>
                  </Label>
                  <div className={`${deepInputClass} min-h-[42px] flex flex-wrap items-center gap-1.5 px-2 py-1`}>
                    {form.targetPests.length > 0 ? (
                      form.targetPests.map((name) => {
                        const matched = pestDiseaseStore.items.find((d: any) => d.dictName === name);
                        const isPest = matched?.dictType === 'pest';
                        return (
                          <span
                            key={name}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                              isPest
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {name}
                            <button
                              type="button"
                              onClick={() => removePest(name)}
                              className="hover:bg-white/50 rounded-full w-3 h-3 flex items-center justify-center"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-gray-400 text-sm">请从左侧选择病虫害</span>
                    )}
                  </div>
                </div>
              </div>
              {/* 下拉选项 */}
              {showPestSearch && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {pestDictOptions.length > 0 ? (
                    pestDictOptions.map((d: any) => {
                      const selected = form.targetPests.includes(d.dictName);
                      return (
                        <Button
                          key={d.id}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePest(d.dictName)}
                          className={`w-full justify-start rounded-none border-b border-gray-100 last:border-b-0 ${
                            selected ? 'bg-emerald-50' : ''
                          }`}
                        >
                          <span className={`w-4 h-4 mr-2 rounded border-2 flex items-center justify-center shrink-0 ${
                            selected
                              ? pestTabType === 'pest'
                                ? 'bg-orange-500 border-orange-500'
                                : 'bg-purple-500 border-purple-500'
                              : 'border-gray-300'
                          }`}>
                            {selected && (
                              <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className="text-sm text-gray-800 flex-1 text-left">{d.dictName}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                            pestTabType === 'pest'
                              ? 'bg-orange-100 text-orange-600'
                              : 'bg-purple-100 text-purple-600'
                          }`}>
                            {pestTabType === 'pest' ? '虫害' : '病害'}
                          </span>
                        </Button>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-sm text-gray-400">
                      暂无{pestTabType === 'pest' ? '虫害' : '病害'}字典数据，请到系统设置→病虫害字典添加
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 防治药剂池（2026-07-11：药剂类型筛选 → 过滤下拉 → 池化添加 → 每行内联编辑） */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">💊 防治药剂池（多选，先选类型再选药剂）</h3>

          {/* 第 1 步 + 第 2 步：同排并排，各占一半 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* 左半：药剂类型（多选 checkbox） */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-700 font-semibold">
                  ① 药剂类型（过滤）<span className="text-red-500">*</span>
                </Label>
                {selectedTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTypes([])}
                    className="text-xs text-gray-500 hover:text-red-600"
                  >
                    清空
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {topLevelPesticideTypes.map((d: any) => {
                  const code = d.dictCode || d.dict_code;
                  const label = d.dictLabel || d.dict_label;
                  const checked = selectedTypes.includes(code);
                  return (
                    <label
                      key={d.id}
                      className={`px-2 py-0.5 rounded border cursor-pointer text-xs font-medium transition-all select-none ${
                        checked
                          ? 'bg-emerald-500 text-white border-emerald-500'
                          : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={checked}
                        onChange={() => toggleTypeFilter(code)}
                      />
                      {label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 右半：选择药剂（按已选类型过滤的下拉） */}
            <div ref={pesticideDropdownRef} className="relative">
              <div className="mb-1">
                <Label className="text-xs text-gray-700 font-semibold">
                  ② 选择规格（精确到含量/厂家）
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    共 {filteredSpecs.length} 个规格
                    {selectedTypes.length > 0 && (
                      <span className="text-emerald-600">（{selectedTypes.length} 个类型）</span>
                    )}
                  </span>
                </Label>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  value={pesticideSearchKeyword}
                  onChange={(e) => { setPesticideSearchKeyword(e.target.value); setShowPesticideDropdown(true); }}
                  onFocus={() => setShowPesticideDropdown(true)}
                  placeholder={selectedTypes.length === 0 ? '搜索名称/规格/厂家/品牌...' : '搜索名称/规格/厂家/品牌...'}
                  className={`flex-1 ${deepInputClass} rounded-l-lg`}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowPesticideDropdown(!showPesticideDropdown)}
                  className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg"
                >
                  <Search className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
              {/* 下拉选项：每行 = 一个规格（含药剂名+规格+厂家），按 specId 去重 */}
              {showPesticideDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {filteredSpecs.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      无匹配规格
                      {selectedTypes.length > 0 && '（请调整类型筛选）'}
                    </div>
                  ) : (
                    filteredSpecs.map((row: { pesticide: any; spec: any }) => {
                      const { pesticide: p, spec } = row;
                      const dedupeKey = spec?.id || p.id;
                      const inPool = pesticidePool.some((it) => (it.specId || it.pesticideId) === dedupeKey);
                      return (
                        <Button
                          key={`${p.id}-${spec?.id || 'no-spec'}`}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => addToPool(p, spec)}
                          disabled={inPool}
                          className={`w-full justify-between rounded-none border-b border-gray-100 last:border-b-0 py-2 px-3 ${
                            inPool ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <div className="text-left flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-800 truncate">{p.pesticideName}</span>
                              {inPool && <span className="text-xs text-emerald-600 shrink-0">✓ 已添加</span>}
                            </div>
                            {/* 规格详情：含量+剂型+厂家+品牌 */}
                            <div className="text-xs text-gray-600 mt-0.5 truncate">
                              {spec?.specContent || '（无规格）'}
                              {spec?.manufacturer && <span className="text-gray-500"> · {spec.manufacturer}</span>}
                              {spec?.brandName && <span className="text-gray-400"> · {spec.brandName}</span>}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-2">
                            {(p.pesticideTypes || []).slice(0, 1).map((t: string) => (
                              <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
                                {getDictLabel('pesticide_type', t) || t}
                              </span>
                            ))}
                          </div>
                        </Button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
          {/* end grid-cols-2 容器 */}

          {/* 第 3 步：药剂池（每个药剂一行，可编辑用量/单位/稀释/方法/备注） */}
          <div className="border-2 border-emerald-200 rounded-lg p-3 bg-emerald-50/30">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-gray-700 font-semibold">
                ③ 药剂池（已添加 {pesticidePool.length} 个）
              </Label>
              {pesticidePool.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPesticidePool([])}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  清空药剂池
                </button>
              )}
            </div>
            {pesticidePool.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-400 bg-white rounded border border-dashed border-gray-300">
                药剂池为空，请先勾选类型，再从上方下拉选择药剂加入池
              </div>
            ) : (
              <div className="space-y-2">
                {pesticidePool.map((item, idx) => (
                  <div key={item.specId || item.pesticideId || idx} className="bg-white border border-emerald-200 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap">
                        <span className="text-xs font-bold text-emerald-700 shrink-0">#{idx + 1}</span>
                        <span className="text-sm font-semibold text-gray-900 truncate">{item.pesticideName}</span>
                        {item.pesticideCode && (
                          <span className="text-xs text-gray-400 font-mono shrink-0">{item.pesticideCode}</span>
                        )}
                        {/* 2026-07-11：规格详情（含量/剂型/厂家/品牌）— 用户精确选择依据 */}
                        {(item.specContent || item.manufacturer || item.brandName) && (
                          <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded truncate">
                            {item.specContent || ''}
                            {item.manufacturer && <span className="text-gray-600"> · {item.manufacturer}</span>}
                            {item.brandName && <span className="text-gray-500"> · {item.brandName}</span>}
                          </span>
                        )}
                        {(item.pesticideTypes || []).slice(0, 2).map((t) => (
                          <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
                            {getDictLabel('pesticide_type', t) || t}
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromPool(idx)}
                        className="text-red-500 hover:text-red-700 shrink-0 ml-2"
                        title="从药剂池移除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-3">
                        <Label className="text-xs text-gray-600">用量</Label>
                        <Input
                          type="text"
                          value={item.dosage || ''}
                          onChange={(e) => updatePoolField(idx, 'dosage', e.target.value)}
                          placeholder="如 50"
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-600">单位</Label>
                        <UnitDictSelect
                          value={item.unit || ''}
                          onChange={(val) => updatePoolField(idx, 'unit', val)}
                          placeholder="单位"
                          className="text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-600">稀释倍数</Label>
                        <Input
                          type="text"
                          value={item.dilutionRatio || ''}
                          onChange={(e) => updatePoolField(idx, 'dilutionRatio', e.target.value)}
                          placeholder="如 1:1500"
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-600">使用方法</Label>
                        <DictSelect
                          category="application_method"
                          value={item.applicationMethod || ''}
                          onChange={(val) => updatePoolField(idx, 'applicationMethod', val)}
                          placeholder="请选择"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs text-gray-600">备注</Label>
                        <Input
                          type="text"
                          value={item.remarks || ''}
                          onChange={(e) => updatePoolField(idx, 'remarks', e.target.value)}
                          placeholder="可选备注"
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 肥料联用池（2026-07-11：多行，可增删） */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-sm font-bold text-gray-900">🌱 肥料联用（可选）</h3>
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <Checkbox
                checked={useFertilizer}
                onCheckedChange={(checked) => setUseFertilizer(!!checked)}
              />
              启用肥料联用
            </label>
            {useFertilizer && fertilizerPool.length > 0 && (
              <span className="text-xs text-gray-500">已添加 {fertilizerPool.length} 种肥料</span>
            )}
            {useFertilizer && fertilizerPool.length > 0 && (
              <button
                type="button"
                onClick={() => setFertilizerPool([])}
                className="text-xs text-red-500 hover:text-red-700 ml-auto"
              >
                清空
              </button>
            )}
          </div>
          {useFertilizer && (
            <div className="border border-gray-200 rounded-lg p-3 bg-green-50/30">
              {fertilizerPool.length === 0 && (
                <div className="mb-2 p-3 text-center text-sm text-gray-400 bg-white rounded border border-dashed border-gray-300">
                  肥料池为空，点击下方"添加一行"添加肥料
                </div>
              )}
              {fertilizerPool.map((item, idx) => (
                <div key={idx} className="bg-white border border-green-200 rounded-lg p-3 mb-2 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-green-700">肥料 #{idx + 1}</span>
                    <button
                      type="button"
                      onClick={() => setFertilizerPool(prev => prev.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700"
                      title="删除该肥料"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-3">
                      <Label className="text-xs text-gray-600">肥料名称</Label>
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) => setFertilizerPool(prev => prev.map((it, i) => i === idx ? { ...it, name: e.target.value } : it))}
                        placeholder="如 磷酸二氢钾"
                        className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-600">用量</Label>
                      <Input
                        type="text"
                        value={item.dosage}
                        onChange={(e) => setFertilizerPool(prev => prev.map((it, i) => i === idx ? { ...it, dosage: e.target.value } : it))}
                        placeholder="如 100"
                        className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-600">单位</Label>
                      <UnitDictSelect
                        value={item.unit}
                        onChange={(val) => setFertilizerPool(prev => prev.map((it, i) => i === idx ? { ...it, unit: val } : it))}
                        placeholder="单位"
                        className="text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-600">稀释倍数</Label>
                      <Input
                        type="text"
                        value={item.ratio}
                        onChange={(e) => setFertilizerPool(prev => prev.map((it, i) => i === idx ? { ...it, ratio: e.target.value } : it))}
                        placeholder="如 1:800"
                        className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs text-gray-600">备注</Label>
                      <Input
                        type="text"
                        value={item.remarks || ''}
                        onChange={(e) => setFertilizerPool(prev => prev.map((it, i) => i === idx ? { ...it, remarks: e.target.value } : it))}
                        placeholder="可选备注"
                        className="px-2 py-1.5 border border-gray-300 rounded text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setFertilizerPool(prev => [...prev, { name: '', dosage: '', unit: '', ratio: '', remarks: '' }])}
                className="w-full mt-1"
              >
                <Plus className="w-4 h-4" /> 添加一行肥料
              </Button>
            </div>
          )}
        </div>

        {/* 备注 */}
        <div>
          <Label className="text-gray-900">备注</Label>
          <TextArea
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            placeholder="请输入备注"
            rows={2}
            className="px-3 py-2 border border-gray-400 rounded-lg text-sm resize-none"
          />
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" size="sm" onClick={onClose}>
          <X className="w-4 h-4" /> 取消
        </Button>
        <Button variant="default" size="sm" onClick={handleSubmit} disabled={submitting}>
          {submitting ? '保存中...' : '保存'}
        </Button>
      </div>
    </UnifiedModal>
  );
}