/**
 * 编辑病虫害防治记录弹窗
 * 2026-07-10：完全重构，与 Add 一致使用统一字段方案
 * 2026-07-17：肥料联用字段复用 FertilizerPoolEditor（与新增施肥记录 + 新增防治记录一致）
 * 2026-07-21 P2 重构：与 AddPestControlModal 完全对齐，修复以下历史问题：
 * - 药剂类型筛选样式不一致：去掉每项目独立卡片 + 垂直 checkbox tree，
 *   改为顶部多选 checkbox 过滤 + 下拉选规格 → 池化添加，与新增统一
 * - 用量字段过窄：单位改用 grid-cols-12 分列，用量 5 列 + 单位 3 列 + 稀释/方法各自展开
 * - 缺规格信息展示：specId/specContent/manufacturer/brandName 全部回填并显示在池中
 * - 防治区域单选限制：去掉 SearchableSelect 单选，改成 Add 同款 chip 多选下拉
 *   （关联业务与种植/育苗记录 id 多值逗号分隔解析）
 * - 目标病虫害单字符串：改为病害/虫害 Tab + 搜索下拉多选 chip
 * - 多作物 JSON 字段 cropNames：回填展示
 * - 模态框尺寸：显式 width=1170 height=780（与 AddModal 一致）
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Trash2, X, Search } from 'lucide-react';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { DictSelect } from '@/components/common/settings/DictSelect';
import { UnitDictSelect } from '@/components/common/settings/UnitDictSelect';
import {
  usePestControlStore,
  usePesticideLibraryStore,
  usePestDiseaseDictStore,
  usePlantingStore,
  useSeedlingStore,
} from '@/stores';
import { useDictionaryStore, getDictLabel } from '@/stores/useDictionaryStore';
import { PestControlData } from '@/stores';
import { showAlert } from '@/lib/dialogService';
// 2026-07-18 P3-L7：从共享工具导入
import { parseJsonList } from '@/lib/jsonPool';
import { FertilizerPoolEditor } from '@/components/farm/fertilizer/FertilizerPoolEditor';
import type { FertilizerPoolItem } from '@/components/farm/fertilizer/FertilizerPoolEditor';

// 2026-07-18 P3-L11：从共享工具导入
import { deepInputClass } from '@/components/common/deepInputClass';

// 2026-07-21 P2 重构：从共享类型导入（PesticidePoolItem 与新增弹窗同款定义）
import type { PesticidePoolItem } from '@/types/farm/pest-control';

// 2026-07-21 P2：与 AddModal 对齐 — 防御传染，编辑/新增 共享数据结构

// 2026-07-21 P2：防治区域多选回填的临时结构（与 AddModal 同款）
interface SelectedBizRecord {
  type: 'planting' | 'seedling';
  id: string;
  code: string;
  cropName: string;
  area: string;
}

export function EditPestControlModal({ isOpen, record, onClose, onSaved }: {
  isOpen: boolean;
  record: PestControlData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const pestStore = usePestControlStore();
  const pesticideStore = usePesticideLibraryStore();
  const pestDiseaseStore = usePestDiseaseDictStore();
  const plantingStore = usePlantingStore();
  const seedlingStore = useSeedlingStore();
  const dictionaries = useDictionaryStore((s) => s.dictionaries);

  // 2026-07-21 P2 重构：与 AddModal 对齐 — 用统一 form + 多状态
  const [form, setForm] = useState({
    recordCode: '',
    sprayTime: '',
    cropName: '',
    greenhouseName: '',
    operatorName: '',
    // 2026-07-21：targetPests 改为数组（与 AddModal 一致），原 targetPest 单字符串按 pestDiseaseStore 解析为 dictName 数组
    targetPests: [] as string[],
    description: '',
  });
  // 2026-07-21 P2：药剂池（与 AddModal PesticidePoolItem 同款结构，specId/specContent 全展示）
  const [pesticidePool, setPesticidePool] = useState<PesticidePoolItem[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [pesticideSearchKeyword, setPesticideSearchKeyword] = useState('');
  const [showPesticideDropdown, setShowPesticideDropdown] = useState(false);
  const pesticideDropdownRef = useRef<HTMLDivElement>(null);

  // 2026-07-21 P2：肥料池（沿用 FertilizerPoolEditor）
  const [fertilizerPool, setFertilizerPool] = useState<FertilizerPoolItem[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // 2026-07-21 P2：防治区域多选 — 与 AddModal 同款 Tab + chip 结构
  const [bizTabType, setBizTabType] = useState<'planting' | 'seedling'>('planting');
  const [selectedBizRecords, setSelectedBizRecords] = useState<SelectedBizRecord[]>([]);
  const [bizSearchKeyword, setBizSearchKeyword] = useState('');
  const [showBizSearch, setShowBizSearch] = useState(false);
  const bizSearchRef = useRef<HTMLDivElement>(null);

  // 2026-07-21 P2：目标病虫害多选（与 AddModal 同款病害/虫害 Tab + chip）
  const [pestTabType, setPestTabType] = useState<'pest' | 'disease'>('pest');
  const [pestSearchKeyword, setPestSearchKeyword] = useState('');
  const [showPestSearch, setShowPestSearch] = useState(false);
  const pestSearchRef = useRef<HTMLDivElement>(null);

  // 标记 cropName 是否仍处于"由所选批次自动反填"状态（用户手动改过 Input 后置 false）
  const cropNameAutoFilledRef = useRef<boolean>(false);

  // 加载数据：药剂库 + 种植/育苗 + 病虫害词典（与 AddModal 一致）
  useEffect(() => {
    if (isOpen) {
      pesticideStore.fetchItems();
      pestDiseaseStore.fetchItems();
      if (plantingStore.items.length === 0) plantingStore.fetchItems();
      if (seedlingStore.items.length === 0) seedlingStore.fetchItems();
    }
  }, [isOpen]);

  // 2026-07-21 P2：初始化表单（从 record 全面回填所有字段，对齐 AddModal）
  useEffect(() => {
    if (!isOpen || !record) return;

    // 基础字段回填
    setForm({
      recordCode: record.recordCode || '',
      sprayTime: record.sprayTime || '',
      // 2026-07-21：cropName 优先用 cropNames JSON 解析回退到单字段
      cropName: (() => {
        try {
          if (record.cropNames) {
            const arr = JSON.parse(record.cropNames);
            if (Array.isArray(arr) && arr.length > 0) return arr.join(',');
          }
        } catch {}
        return record.cropName || '';
      })(),
      greenhouseName: record.greenhouseName || '',
      operatorName: record.operatorName || '',
      // 2026-07-21：targetPest 解析为数组（JSON 数组 / 空格 join / 单字符串）
      targetPests: (() => {
        if (!record.targetPest) return [];
        try {
          const arr = JSON.parse(record.targetPest);
          if (Array.isArray(arr)) return arr.filter((v: any) => typeof v === 'string');
        } catch {}
        // 空格 join 旧数据
        const split = record.targetPest.split(/\s+/).filter(Boolean);
        return split.length > 1 ? split : [record.targetPest];
      })(),
      description: record.description || '',
    });

    // 2026-07-21 P2：药剂池回填 — 优先读 pesticideList JSON，回退到主字段 + bio/physical
    const storedPesticides = parseJsonList(record.pesticideList);
    if (storedPesticides.length > 0) {
      setPesticidePool(storedPesticides.map((it: any) => ({
        pesticideId: it.pesticideId,
        pesticideName: it.name || it.pesticideName || '',
        pesticideCode: it.pesticideCode || '',
        pesticideTypes: Array.isArray(it.pesticideTypes) ? it.pesticideTypes : [],
        specId: it.specId,
        specContent: it.specContent,
        formulation: it.formulation,
        manufacturer: it.manufacturer,
        brandName: it.brandName,
        dosage: it.dosage != null ? String(it.dosage) : '',
        unit: it.unit || '',
        dilutionRatio: it.ratio || it.dilutionRatio || '',
        applicationMethod: it.applicationMethod || '',
        remarks: it.remarks || '',
      } as PesticidePoolItem)));
      // 初始类型筛选：从池中所有条目类型并集导入（避免下拉空）
      const allTypesSet = new Set<string>();
      storedPesticides.forEach((it: any) => {
        if (Array.isArray(it.pesticideTypes)) it.pesticideTypes.forEach((t: string) => allTypesSet.add(t));
      });
      setSelectedTypes(Array.from(allTypesSet));
    } else {
      // 回退：主字段单条 + bio/physical
      const items: PesticidePoolItem[] = [];
      if (record.pesticideName || record.pesticideId) {
        items.push({
          pesticideId: record.pesticideId,
          pesticideName: record.pesticideName || '',
          pesticideCode: '',
          pesticideTypes: record.pesticideTypes || (record.pesticideType ? [record.pesticideType] : []),
          specId: undefined,
          specContent: record.specContent,
          formulation: undefined,
          manufacturer: undefined,
          brandName: undefined,
          dosage: record.dosage != null ? String(record.dosage) : '',
          unit: record.dosageUnit || '',
          dilutionRatio: record.dilutionRatio || '',
          applicationMethod: record.applicationMethod || '',
          remarks: '',
        });
      }
      if (record.bioAgentName) {
        items.push({
          pesticideName: record.bioAgentName,
          pesticideCode: '',
          pesticideTypes: [],
          dosage: record.dosage != null ? String(record.dosage) : '',
          unit: record.dosageUnit || '',
          dilutionRatio: record.dilutionRatio || '',
          applicationMethod: record.applicationMethod || '',
        });
      }
      setPesticidePool(items);
      const allTypesSet = new Set<string>();
      items.forEach((it) => it.pesticideTypes?.forEach((t) => allTypesSet.add(t)));
      setSelectedTypes(Array.from(allTypesSet));
    }

    // 2026-07-21 P2：肥料池回填（与 AddModal 一致；支持新/旧/最旧 schema）
    if (record.leafFertilizerList) {
      const parsed = parseJsonList(record.leafFertilizerList);
      if (parsed.length > 0) {
        setFertilizerPool(parsed.map((it: any) => {
          const isNewFormat = 'specId' in it || 'fertilizerName' in it;
          if (isNewFormat) {
            return {
              specId: it.specId || '',
              fertilizerName: it.fertilizerName || '',
              fertilizerCode: it.fertilizerCode || '',
              fertilizerType: it.fertilizerType || '',
              brandName: it.brandName || '主品牌',
              specContent: it.specContent || '',
              manufacturer: it.manufacturer || '',
              dosage: it.dosage != null ? String(it.dosage) : '',
              unit: it.unit || 'kg',
              dilutionRatio: it.dilutionRatio || '',
              fertilizationMethod: it.fertilizationMethod || '',
              unitPrice: Number(it.unitPrice) || 0,
              stockQuantity: Number(it.stockQuantity) || 0,
              stockUnit: it.stockUnit || 'kg',
            } as FertilizerPoolItem;
          }
          return {
            specId: '',
            fertilizerName: it.name || '',
            fertilizerCode: '',
            fertilizerType: '',
            brandName: '',
            specContent: '',
            manufacturer: '',
            dosage: it.dosage != null ? String(it.dosage) : '',
            unit: it.unit || '',
            dilutionRatio: it.ratio || '',
            fertilizationMethod: '',
            unitPrice: 0,
            stockQuantity: 0,
            stockUnit: '',
          } as FertilizerPoolItem;
        }));
      } else {
        setFertilizerPool([]);
      }
    } else if (record.leafFertilizerName || record.leafFertilizerUnit) {
      setFertilizerPool([{
        specId: '',
        fertilizerName: record.leafFertilizerName || '',
        fertilizerCode: '',
        fertilizerType: '',
        brandName: '',
        specContent: '',
        manufacturer: '',
        dosage: record.leafFertilizerDosage != null ? String(record.leafFertilizerDosage) : '',
        unit: record.leafFertilizerUnit || '',
        dilutionRatio: '',
        fertilizationMethod: '',
        unitPrice: 0,
        stockQuantity: 0,
        stockUnit: '',
      } as FertilizerPoolItem]);
    } else {
      setFertilizerPool([]);
    }

    // 2026-07-21 P2：防治区域多选回填（plantingId/seedlingId 是逗号分隔的多值，与 AddModal 同步）
    const restoredBiz: SelectedBizRecord[] = [];
    const plantingIds = (record.plantingId || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const plantingCodes = (record.plantingCode || '').split(',').map((s: string) => s.trim());
    plantingIds.forEach((pid: string, i: number) => {
      const p = plantingStore.items.find((it: any) => it.id === pid);
      if (p) {
        restoredBiz.push({
          type: 'planting',
          id: pid,
          code: plantingCodes[i] || p.plantCode || p.plantingCode || '',
          // 2026-07-24：与种植管理列表一致，存品种（红颜）而非作物大类（草莓）
          cropName: p.subVariety1Name || p.cropVariety || p.cropName || '',
          area: p.rootName || p.areaName || '',
        });
      } else if (plantingCodes[i]) {
        // 找不到的孤儿数据：用 code 占位
        restoredBiz.push({
          type: 'planting',
          id: pid,
          code: plantingCodes[i],
          cropName: '',
          area: '',
        });
      }
    });
    const seedlingIds = (record.seedlingId || '').split(',').map((s: string) => s.trim()).filter(Boolean);
    const seedlingCodes = (record.seedlingCode || '').split(',').map((s: string) => s.trim());
    seedlingIds.forEach((sid: string, i: number) => {
      const s = seedlingStore.items.find((it: any) => it.id === sid);
      if (s) {
        restoredBiz.push({
          type: 'seedling',
          id: sid,
          code: seedlingCodes[i] || s.seedlingCode || '',
          // 2026-07-24：与种植管理列表一致，存品种
          cropName: s.subVariety1Name || s.cropVariety || s.cropName || '',
          area: s.siteName || '',
        });
      } else if (seedlingCodes[i]) {
        restoredBiz.push({
          type: 'seedling',
          id: sid,
          code: seedlingCodes[i],
          cropName: '',
          area: '',
        });
      }
    });
    setSelectedBizRecords(restoredBiz);
    // cropNames 自动反填 flag：因回填已完成，自动反填 flag=false（用户后续手动改 cropName 时再变化）
    cropNameAutoFilledRef.current = false;
  }, [isOpen, record, plantingStore.items, seedlingStore.items]);

  const updateForm = useCallback((field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  // 2026-07-21 P2：从共享类型导入的 PesticidePoolItem（与 AddModal 同款业务函数）

  // 顶部类型筛选（与 AddModal 同款）
  const toggleTypeFilter = useCallback((typeCode: string) => {
    setSelectedTypes((prev) =>
      prev.includes(typeCode) ? prev.filter((t) => t !== typeCode) : [...prev, typeCode]
    );
  }, []);

  // 已激活的药剂类型字典
  const pesticideTypeItems = useMemo(
    () => dictionaries.filter((d: any) => (d.categoryCode || d.category_code || d.category) === 'pesticide_type'),
    [dictionaries]
  );

  // 杀线虫剂 tab 已下线，过滤掉废弃标签
  const EXCLUDED_PESTICIDE_TYPE_LABELS = ['杀线虫剂', 'nematicide'];
  const topLevelPesticideTypes = useMemo(
    () =>
      pesticideTypeItems.filter((d: any) => {
        if (d.parentId || d.parent_id) return false;
        const label = d.dictLabel || d.dict_label;
        const code = d.dictCode || d.dict_code;
        return !EXCLUDED_PESTICIDE_TYPE_LABELS.includes(label) && !EXCLUDED_PESTICIDE_TYPE_LABELS.includes(code);
      }),
    [pesticideTypeItems]
  );

  // 过滤规格（与 AddModal 同款：类型筛选 + 关键字）
  const filteredSpecs = useMemo(() => {
    const items = (pesticideStore.items as any[]).filter(
      (p) => p.status === 'active' || !p.status
    );
    let pool = items;
    if (selectedTypes.length > 0) {
      pool = pool.filter((p) =>
        (p.pesticideTypes || []).some((t: string) => selectedTypes.includes(t))
      );
    }
    const kw = pesticideSearchKeyword.trim().toLowerCase();
    const rows: { pesticide: any; spec: any }[] = [];
    for (const p of pool) {
      if (kw) {
        const hay = [p.pesticideName, p.pesticideCode, p.ingredient, p.specContent, p.manufacturer, p.brandName]
          .filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(kw)) continue;
      }
      rows.push({ pesticide: p, spec: p });
    }
    return rows;
  }, [selectedTypes, pesticideSearchKeyword, pesticideStore.items]);

  // 添加到池（按 specId 去重）
  const addToPool = useCallback((pesticide: any, spec: any | null) => {
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
        // 2026-07-26：从药剂库携带库存信息，池内行展示剩余用量（对照 FertilizerPoolEditor）
        stockQuantity: spec?.stockQuantity ?? pesticide.stockQuantity ?? 0,
        stockUnit: spec?.stockUnit || pesticide.stockUnit || 'kg',
        unitPrice: spec?.unitPrice ?? pesticide.unitPrice ?? 0,
      };
      return [...prev, newItem];
    });
    setPesticideSearchKeyword('');
    setShowPesticideDropdown(false);
  }, []);

  const removeFromPool = useCallback((index: number) => {
    setPesticidePool((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updatePoolField = useCallback(
    (index: number, field: keyof PesticidePoolItem, value: any) => {
      setPesticidePool((prev) =>
        prev.map((it, i) => (i === index ? { ...it, [field]: value } : it))
      );
    },
    []
  );

  // 病虫害词典过滤（与 AddModal 同款）
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

  const togglePest = useCallback((dictName: string) => {
    setForm((prev) => {
      const list = prev.targetPests;
      return {
        ...prev,
        targetPests: list.includes(dictName) ? list.filter((n) => n !== dictName) : [...list, dictName],
      };
    });
    setShowPestSearch(false);
  }, []);

  const removePest = useCallback((dictName: string) => {
    setForm((prev) => ({ ...prev, targetPests: prev.targetPests.filter((n) => n !== dictName) }));
  }, []);

  // 种植记录选项（按 Tab 过滤 + 搜索）
  // 2026-07-24：搜索增加 cropVariety / subVariety1Name 字段（与种植管理列表一致）
  const plantingOptions = useMemo(() => {
    const plantings = plantingStore.items as any[];
    const activePlantings = plantings.filter((p: any) => !p.isHarvest);
    if (!bizSearchKeyword.trim() || bizTabType !== 'planting') {
      return bizTabType === 'planting' ? activePlantings : [];
    }
    const kw = bizSearchKeyword.toLowerCase();
    return activePlantings.filter((p: any) =>
      (p.plantCode || '').toLowerCase().includes(kw) ||
      (p.cropName || '').toLowerCase().includes(kw) ||
      (p.cropVariety || '').toLowerCase().includes(kw) ||
      (p.subVariety1Name || '').toLowerCase().includes(kw) ||
      (p.rootName || '').toLowerCase().includes(kw) ||
      (p.areaName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizTabType, plantingStore.items]);

  // 育苗记录选项
  const seedlingOptions = useMemo(() => {
    const seedlings = seedlingStore.items as any[];
    if (!bizSearchKeyword.trim() || bizTabType !== 'seedling') {
      return bizTabType === 'seedling' ? seedlings : [];
    }
    const kw = bizSearchKeyword.toLowerCase();
    return seedlings.filter((s: any) =>
      (s.seedlingCode || '').toLowerCase().includes(kw) ||
      (s.cropName || '').toLowerCase().includes(kw) ||
      (s.siteName || '').toLowerCase().includes(kw)
    );
  }, [bizSearchKeyword, bizTabType, seedlingStore.items]);

  // 2026-07-24：种植/育苗项展示用品种（与种植管理列表一致：红颜 > 草莓）
  const formatPlantingDisplay = (p: any) => p.subVariety1Name || p.cropVariety || p.cropName || '';

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

  // 2026-07-21 P2：放宽防治区域选择限制（与 AddModal 同款 — 取消同作物/同类型互斥）
  const handleToggleBizRecord = (kind: 'planting' | 'seedling', recordRef: any, area: string) => {
    const recordId = recordRef.id;
    // 2026-07-24：cropName 优先存品种（与种植管理列表一致：红颜）
    const cropNameVal = recordRef.subVariety1Name || recordRef.cropVariety || recordRef.cropName || '';
    const code = kind === 'planting' ? recordRef.plantCode : recordRef.seedlingCode;
    setSelectedBizRecords((prev) => {
      const isSelected = prev.some((r) => r.type === kind && r.id === recordId);
      if (isSelected) {
        const next = prev.filter((r) => !(r.type === kind && r.id === recordId));
        if (cropNameAutoFilledRef.current) {
          const cropNames = [...new Set(next.map((r) => r.cropName).filter(Boolean))];
          updateForm('cropName', cropNames.join(','));
          if (next.length === 0) cropNameAutoFilledRef.current = true;
        }
        const areas = Array.from(new Set(next.map((r) => r.area))).filter(Boolean);
        updateForm('greenhouseName', areas.join(','));
        return next;
      }
      const nextItem: SelectedBizRecord = { type: kind, id: recordId, code: code || '', cropName: cropNameVal, area };
      const next = [...prev, nextItem];
      if (cropNameAutoFilledRef.current) {
        const cropNames = [...new Set(next.map((r) => r.cropName).filter(Boolean))];
        updateForm('cropName', cropNames.join(','));
      }
      const areas = Array.from(new Set(next.map((r) => r.area))).filter(Boolean);
      updateForm('greenhouseName', areas.join(','));
      return next;
    });
  };

  const handleClearBizRecords = () => {
    setSelectedBizRecords([]);
    updateForm('greenhouseName', '');
    cropNameAutoFilledRef.current = true;
  };

  const handleSubmit = async () => {
    if (!form.sprayTime) {
      await showAlert('请选择防治日期');
      return;
    }
    if (!form.cropName) {
      await showAlert('请输入或选择作物名称');
      return;
    }
    const filledItems = pesticidePool.filter((it) => it.pesticideName && it.pesticideName.trim());
    if (filledItems.length === 0) {
      await showAlert('请至少填写 1 个防治项目');
      return;
    }

    setSubmitting(true);
    try {
      const allTypes = Array.from(new Set(filledItems.flatMap((it) => it.pesticideTypes || [])));
      const first = filledItems[0];
      // 2026-07-21 P2：序列化药剂池为 pesticideList JSON（含 spec 级字段，与 AddModal 一致）
      const pesticideListJson = JSON.stringify(
        filledItems.map((it) => ({
          name: it.pesticideName,
          pesticideId: it.pesticideId,
          pesticideCode: it.pesticideCode,
          specId: it.specId,
          specContent: it.specContent,
          formulation: it.formulation,
          manufacturer: it.manufacturer,
          brandName: it.brandName,
          pesticideTypes: it.pesticideTypes || [],
          dosage: it.dosage,
          unit: it.unit,
          ratio: it.dilutionRatio,
          applicationMethod: it.applicationMethod,
          remarks: it.remarks,
        }))
      );

      await pestStore.updateItem(record.id, {
        sprayTime: form.sprayTime,
        operatorName: form.operatorName,
        cropName: form.cropName,
        // 2026-07-21：多作物 JSON 数组（与 AddModal 一致）
        cropNames: JSON.stringify(
          Array.from(new Set(selectedBizRecords.map((r) => r.cropName).filter(Boolean))).length > 0
            ? Array.from(new Set(selectedBizRecords.map((r) => r.cropName).filter(Boolean)))
            : [form.cropName].filter(Boolean)
        ),
        greenhouseName: form.greenhouseName,
        // 2026-07-21：targetPests 多选用 JSON 数组存储（与 AddModal 一致）
        targetPest: JSON.stringify(form.targetPests),
        description: form.description,
        // 2026-07-21：防治区域多选 → 逗号分隔的 plantingId/Code/seedlingId/Code
        plantingId: selectedBizRecords.filter((r) => r.type === 'planting').map((r) => r.id).join(',') || undefined,
        plantingCode: selectedBizRecords.filter((r) => r.type === 'planting').map((r) => r.code).filter(Boolean).join(',') || undefined,
        seedlingId: selectedBizRecords.filter((r) => r.type === 'seedling').map((r) => r.id).join(',') || undefined,
        seedlingCode: selectedBizRecords.filter((r) => r.type === 'seedling').map((r) => r.code).filter(Boolean).join(',') || undefined,
        pesticideTypes: allTypes,
        pesticideName: first.pesticideName,
        pesticideId: first.pesticideId,
        dosage: first.dosage ? Number(first.dosage) : undefined,
        dosageUnit: first.unit,
        dilutionRatio: first.dilutionRatio,
        applicationMethod: first.applicationMethod,
        pesticideList: pesticideListJson,
        useLeafFertilizer: fertilizerPool.length > 0 ? 'yes' : 'no',
        leafFertilizerList: fertilizerPool.length > 0 ? JSON.stringify(fertilizerPool) : null,
        leafFertilizerName: fertilizerPool[0]?.fertilizerName,
        leafFertilizerDosage: fertilizerPool[0]?.dosage ? Number(fertilizerPool[0].dosage) : undefined,
        leafFertilizerUnit: fertilizerPool[0]?.unit,
      } as any);
      onSaved();
    } catch (err) {
      await showAlert('保存失败：' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!record) return null;

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="编辑防治记录"
      size="xl"
      width={1170}
      height={780}
      showFooter={false}
    >
      <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
        {/* 基础信息：与 AddModal 一致 — 防治日期 + 操作员（移到关联业务上方） */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">📋 基础信息</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">防治日期 <span className="text-red-500">*</span><span className="text-gray-500 text-xs ml-1">（精确到整点）</span></Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={form.sprayTime ? form.sprayTime.split(' ')[0] : ''}
                    onChange={(e) => {
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

            {/* 防治区域多选 — 与 AddModal 一致（chip + 下拉选项） */}
            <div ref={bizSearchRef} className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <Label className="text-gray-900 mb-1">
                    📍 防治区域 <span className="text-gray-500 text-xs">（可多选；可跨作物/跨类型，共用同一套药剂）</span>
                  </Label>
                  <div className="flex items-center gap-2">
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
              {showBizSearch && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {bizTabType === 'planting' && plantingOptions.length > 0 && plantingOptions.map((p: any) => {
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
                          <span className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                            <span className="text-sm font-mono font-semibold text-blue-700 truncate" title={p.plantCode}>{p.plantCode}</span>
                            <span className="text-gray-300 shrink-0">|</span>
                            <span className="text-sm font-medium text-emerald-700 truncate" title={formatPlantingDisplay(p)}>{formatPlantingDisplay(p) || '-'}</span>
                            <span className="text-gray-300 shrink-0">|</span>
                            <span className="text-xs text-gray-600 truncate" title={area}>{area || '-'}</span>
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                          p.isHarvest ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-600'
                        }`}>
                          {p.isHarvest ? '已采收' : '种植中'}
                        </span>
                      </Button>
                    );
                  })}
                  {bizTabType === 'seedling' && seedlingOptions.length > 0 && seedlingOptions.map((s: any) => {
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
                          <span className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
                            <span className="text-sm font-mono font-semibold text-blue-700 truncate" title={s.seedlingCode}>{s.seedlingCode}</span>
                            <span className="text-gray-300 shrink-0">|</span>
                            <span className="text-sm font-medium text-emerald-700 truncate" title={formatPlantingDisplay(s)}>{formatPlantingDisplay(s) || '-'}</span>
                            <span className="text-gray-300 shrink-0">|</span>
                            <span className="text-xs text-gray-600 truncate" title={area}>{area || '-'}</span>
                          </span>
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 shrink-0 ml-2">育苗中</span>
                      </Button>
                    );
                  })}
                  {((bizTabType === 'planting' && plantingOptions.length === 0) ||
                    (bizTabType === 'seedling' && seedlingOptions.length === 0)) && (
                    <div className="p-4 text-center text-sm text-gray-400">
                      无匹配的{bizTabType === 'planting' ? '种植' : '育苗'}记录
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 作物名称 + 防治区域明细 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">
                  作物名称 <span className="text-red-500">*</span>
                  {selectedBizRecords.length > 0 && (
                    <span className="ml-2 text-xs text-emerald-600">
                      （由所选批次反填，多个作物逗号分隔，可手改）
                    </span>
                  )}
                </Label>
                <Input
                  type="text"
                  value={form.cropName}
                  onChange={(e) => {
                    cropNameAutoFilledRef.current = false;
                    updateForm('cropName', e.target.value);
                  }}
                  placeholder={selectedBizRecords.length > 0 ? '由所选批次反填（逗号分隔）' : '请输入作物名称'}
                  className={deepInputClass}
                />
              </div>
              <div>
                <Label className="text-gray-900">防治区域明细（已选，去重）</Label>
                <div className={`${deepInputClass} min-h-[42px] flex flex-wrap items-center gap-1.5 px-2 py-1`}>
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

            {/* 目标病虫害多选 — 与 AddModal 一致（病害/虫害 Tab + chip） */}
            <div ref={pestSearchRef} className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <Label className="text-gray-900 mb-1">
                    目标病虫害 <span className="text-gray-500 text-xs">（多选，可同时防病害+虫害）</span>
                  </Label>
                  <div className="flex items-center gap-2">
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
                              isPest ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {name}
                            <button type="button" onClick={() => removePest(name)} className="hover:bg-white/50 rounded-full w-3 h-3 flex items-center justify-center">
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
              {showPestSearch && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {pestDictOptions.length > 0 ? pestDictOptions.map((d: any) => {
                    const selected = form.targetPests.includes(d.dictName);
                    return (
                      <Button
                        key={d.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePest(d.dictName)}
                        className={`w-full justify-start rounded-none border-b border-gray-100 last:border-b-0 ${selected ? 'bg-emerald-50' : ''}`}
                      >
                        <span className={`w-4 h-4 mr-2 rounded border-2 flex items-center justify-center shrink-0 ${
                          selected ? (pestTabType === 'pest' ? 'bg-orange-500 border-orange-500' : 'bg-purple-500 border-purple-500') : 'border-gray-300'
                        }`}>
                          {selected && (
                            <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                              <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </span>
                        <span className="text-sm text-gray-800 flex-1 text-left">{d.dictName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ml-2 ${
                          pestTabType === 'pest' ? 'bg-orange-100 text-orange-600' : 'bg-purple-100 text-purple-600'
                        }`}>
                          {pestTabType === 'pest' ? '虫害' : '病害'}
                        </span>
                      </Button>
                    );
                  }) : (
                    <div className="p-4 text-center text-sm text-gray-400">暂无{pestTabType === 'pest' ? '虫害' : '病害'}字典数据</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">💊 防治药剂池（多选，先选类型再选药剂）</h3>
          {/* 第 1 步 + 第 2 步：同排并排，各占一半 */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            {/* 左半：药剂类型（多选 checkbox） */}
            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs text-gray-700 font-semibold">① 药剂类型（过滤）<span className="text-red-500">*</span></Label>
                {selectedTypes.length > 0 && (
                  <button type="button" onClick={() => setSelectedTypes([])} className="text-xs text-gray-500 hover:text-red-600">清空</button>
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
                        checked ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
                      }`}
                    >
                      <input type="checkbox" className="hidden" checked={checked} onChange={() => toggleTypeFilter(code)} />
                      {label}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 右半：选择药剂 */}
            <div ref={pesticideDropdownRef} className="relative">
              <div className="mb-1">
                <Label className="text-xs text-gray-700 font-semibold">
                  ② 选择规格（精确到含量/厂家）
                  <span className="ml-2 text-xs text-gray-500 font-normal">
                    共 {filteredSpecs.length} 个规格
                    {selectedTypes.length > 0 && <span className="text-emerald-600">（{selectedTypes.length} 个类型）</span>}
                  </span>
                </Label>
              </div>
              <div className="flex items-center gap-1">
                <Input
                  type="text"
                  value={pesticideSearchKeyword}
                  onChange={(e) => { setPesticideSearchKeyword(e.target.value); setShowPesticideDropdown(true); }}
                  onFocus={() => setShowPesticideDropdown(true)}
                  placeholder="搜索名称/规格/厂家/品牌..."
                  className={`flex-1 ${deepInputClass} rounded-l-lg`}
                />
                <Button type="button" variant="secondary" size="sm" onClick={() => setShowPesticideDropdown(!showPesticideDropdown)} className="border border-l-0 border-gray-400 rounded-l-none rounded-r-lg">
                  <Search className="w-4 h-4 text-gray-500" />
                </Button>
              </div>
              {showPesticideDropdown && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                  {filteredSpecs.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-400">
                      无匹配规格{selectedTypes.length > 0 && '（请调整类型筛选）'}
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
                          className={`w-full justify-between rounded-none border-b border-gray-100 last:border-b-0 py-2 px-3 ${inPool ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <div className="text-left flex-1 min-w-0">
                            <div className="flex items-center gap-2 truncate">
                              <span className="text-sm font-medium text-gray-800">{p.pesticideName}</span>
                              {inPool && <span className="text-xs text-emerald-600 shrink-0">✓ 已添加</span>}
                              <span className="text-gray-400 shrink-0">|</span>
                              <span className="text-xs text-gray-600 truncate">{spec?.specContent || '无规格'}{spec?.manufacturer ? ` · ${spec.manufacturer}` : ''}{spec?.brandName ? ` · ${spec.brandName}` : ''}</span>
                              <span className="text-gray-400 shrink-0">|</span>
                              {(p.pesticideTypes || []).slice(0, 1).map((t: string) => (
                                <span key={t} className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 shrink-0">
                                  {getDictLabel('pesticide_type', t) || t}
                                </span>
                              ))}
                              {(spec?.unitPrice ?? p.unitPrice) > 0 && (
                                <>
                                  <span className="text-gray-400 shrink-0">|</span>
                                  <span className="text-xs text-amber-600 shrink-0">¥{Number(spec?.unitPrice ?? p.unitPrice).toFixed(2)}</span>
                                </>
                              )}
                              <span className="text-gray-400 shrink-0">|</span>
                              <span className={`text-xs shrink-0 ${(spec?.stockQuantity ?? p.stockQuantity ?? 0) > 0 ? 'text-emerald-600' : 'text-red-400'}`}>
                                库存 {Number(spec?.stockQuantity ?? p.stockQuantity ?? 0).toFixed(2)} {spec?.stockUnit || p.stockUnit || 'kg'}
                              </span>
                            </div>
                          </div>
                        </Button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 第 3 步：药剂池（每个药剂一行） */}
          <div className="border-2 border-emerald-200 rounded-lg p-3 bg-emerald-50/30">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs text-gray-700 font-semibold">③ 药剂池（已添加 {pesticidePool.length} 个）</Label>
              {pesticidePool.length > 0 && (
                <button type="button" onClick={() => setPesticidePool([])} className="text-xs text-red-500 hover:text-red-700">清空药剂池</button>
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
                        {item.pesticideCode && <span className="text-xs text-gray-400 font-mono shrink-0">{item.pesticideCode}</span>}
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
                        {/* 2026-07-26：显示库存与价格（对照 FertilizerPoolEditor 池内行头部） */}
                        {(item.unitPrice ?? 0) > 0 && (
                          <span className="text-xs text-emerald-600 whitespace-nowrap shrink-0">
                            ¥{Number(item.unitPrice ?? 0).toFixed(2)}
                          </span>
                        )}
                        <span className="text-xs text-emerald-600 whitespace-nowrap shrink-0">
                          · 库存 {Number(item.stockQuantity ?? 0).toFixed(2)} {item.stockUnit || 'kg'}
                        </span>
                      </div>
                      <button type="button" onClick={() => removeFromPool(idx)} className="text-red-500 hover:text-red-700 shrink-0 ml-2" title="从药剂池移除">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-5">
                        <Label className="text-xs text-gray-600">用量</Label>
                        <Input
                          type="text"
                          value={item.dosage || ''}
                          onChange={(e) => updatePoolField(idx, 'dosage', e.target.value)}
                          placeholder="如 50"
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs w-full"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label className="text-xs text-gray-600">单位</Label>
                        <UnitDictSelect
                          value={item.unit || ''}
                          onChange={(val) => updatePoolField(idx, 'unit', val)}
                          placeholder="单位"
                          className="text-xs w-full"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-600">稀释</Label>
                        <Input
                          type="text"
                          value={item.dilutionRatio || ''}
                          onChange={(e) => updatePoolField(idx, 'dilutionRatio', e.target.value)}
                          placeholder="1:1500"
                          className="px-2 py-1.5 border border-gray-300 rounded text-xs w-full"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label className="text-xs text-gray-600">方法</Label>
                        <DictSelect
                          category="application_method"
                          value={item.applicationMethod || ''}
                          onChange={(val) => updatePoolField(idx, 'applicationMethod', val)}
                          placeholder="请选择"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 肥料联用池复用 FertilizerPoolEditor（与新增一致） */}
        <div>
          <h3 className="text-sm font-bold text-gray-900 mb-3">🧪 肥料联用（可选，先选类型再选肥料）</h3>
          <FertilizerPoolEditor pool={fertilizerPool} onChange={setFertilizerPool} />
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