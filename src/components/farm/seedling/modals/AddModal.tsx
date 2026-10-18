/**
 * 育苗新增弹窗 - 重新规划版本
 * 三区段式布局：关联种源信息 | 场地与计划 | 数量与品质
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
// 2026-10-17：单位口径判断 —— 种源单位 ≠ 育苗单位时，不能按育苗数量扣减种源
import { isSameUnitDimension } from '@/constants/units';
import { getSeedSourceVarietyName } from '../../../../constants/seedSourceDict';
import { RefreshCw } from 'lucide-react';
import { SeedSource, SeedlingStatus, SeedlingCalculateMode } from '../../../../types/crop';
import { generateSeedlingCodeByDate } from '../../../../services/apiSeedlingService';
import { decreaseAvailableCount, getSeedSourceById } from '../../../../services/apiSeedSourceService';
import * as cropInstanceService from '../../../../services/apiCropInstanceService';
import { CropVarietyOption, CropVariety } from '../../../../types/cropVariety';
import { todayLocal } from '@/lib/dateUtils';
// 2026-10-17 修复：品种路径曾用 services/cropVarietyService（localStorage 旧品种库，编码为 11 位如 FL010100000），
//   与种源的后端 cropCode（11 位标准码 / 9 位历史码，如 FR0101001）对不上 → 品种路径恒为空。
//   改用 API 品种库（与育苗列表 SeedlingTable 同一数据源）。
import * as apiCropVarietyService from '../../../../services/apiCropVarietyService';
import { useDictionaryStore, getDictItems, useProductionPlanStore, useUserStore, useAuthStore } from '../../../../stores';
import { useTasks } from '../../../../hooks/useTasks';
import { PlanType } from '../../../../types';
import { useApprovalContext } from '../../../../contexts/ApprovalContext';
import { ApprovalType, ApprovalStatus } from '../../../../types/approval';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';
// 2026-10-18：大组件拆分 —— 四个 JSX 区段移入 ./add-modal/*（纯移动，无逻辑变更）
import { SeedlingSourceSection } from './add-modal/SeedlingSourceSection';
import { QuantityQualitySection } from './add-modal/QuantityQualitySection';
import { SitePlanSection } from './add-modal/SitePlanSection';
import { RemarkAttachmentSection } from './add-modal/RemarkAttachmentSection';
import { deepInputClass } from './add-modal/helpers';
import type { AddFormData } from './add-modal/types';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  seedSources: SeedSource[];
  seedlingTypes: Array<{ value: string; label: string }>;
  sites: Array<{ value: string; label: string }>;
}

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  seedSources = [],
  seedlingTypes,
  sites
}: AddModalProps) {
  // 使用任务管理hook，用于创建草稿任务
  const tasksHook = useTasks();

  // 使用审批Context
  const { addApproval } = useApprovalContext();

  // 字典数据转换（使用 Zustand store 获取）
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);

  useEffect(() => {
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [dictionaries.length, loadDictionaries]);

  // 目标成苗率选项
  const survivalRateOptions = useMemo(() => {
    return getDictItems('survival_rate_target').map(d => ({ value: Number(d.dictCode), label: d.dictLabel }));
  }, [dictionaries]);

  // 育苗计划类型选项
  const seedlingPlanTypes = useMemo(() => {
    return getDictItems('seedling_plan_type').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

  // 扩繁倍数预设选项
  const propagationMultiples = useMemo(() => {
    return getDictItems('propagation_multiple').map(d => ({ value: Number(d.dictCode), label: d.dictLabel }));
  }, [dictionaries]);

  // 操作人员选项
  const OPERATORS = useMemo(() => {
    return getDictItems('operator').map(d => ({ value: d.dictCode, label: d.dictLabel }));
  }, [dictionaries]);

  // 初始表单数据（弹窗每次打开时重置）
  const INITIAL_FORM_DATA: AddFormData = {
    sourceId: '',
    sourceCode: '',
    sourceType: '',
    selectedCropCode: '',
    cropName: '',
    cropVariety: '',
    seedlingType: '',
    seedlingTypeOther: '',
    // 2026-10-11：补齐两个此前只在运行时动态挂到 state 上的字段（原代码靠 (formData as any) 读写）
    seedForm: '',        // 种源形态（选择种源后自动带入，只读展示）
    seedlingForm: '',    // 育苗后形态（必填，写入 seedlings.seedling_form）
    unit: '株',  // 2026-07-01: 单位（株/粒/颗/盆等）
    siteId: '',
    siteName: '',
    seedlingCode: '',
    productionPlanId: '',
    startDate: '',
    expectedEndDate: '',
    initialCount: 0,
    // 2026-10-17：种源消耗量（单位=种源单位）—— 种源单位与育苗单位不同时必填
    sourceConsumedQuantity: 0,
    targetSurvivalRate: 90,
    chargePerson: '',
    // 2026-10-17：品质等级此前只能在编辑弹窗补录，新增时无法设置
    qualityGrade: '',
    remarks: '',
    calculateMode: SeedlingCalculateMode.SINGLE,
    motherPlantCount: 0,
    propagationMultiple: 0,
    customMultiple: 0,
    theoreticalYield: 0,
    // 2026-10-17：删除 workHours（新增弹窗已按业务决定移除工时输入，提交恒为 undefined）
    // 2026-06-15: 数量体系重构 — 繁殖模式合并为 2 种（1:1 / 1:多）
    propagationMode: 'one_to_one' as 'one_to_one' | 'one_to_many',
    propagationMotherPlantCount: 0,  // 兼容字段（后续可移除）
    propagationScionCount: 0,         // 兼容字段（后续可移除）
  };

  // 2026-06-15: 数量体系重构 — 6 种模式合并为 2 种
  // 2026-06-24: 育苗吸收种源管理的「无性繁殖」功能
  // 1:1 涵盖种子/嫁接/单种球；1:多 涵盖匍匐茎/组培/扦插/分株/块茎/枝条等所有无性繁殖方式
  const PROPAGATION_MODES = [
    { value: 'one_to_one', label: '1:1 育苗', desc: '一对一（种子 / 嫁接 / 单种球）', needsMother: false, needsScion: false },
    { value: 'one_to_many', label: '1:多 育苗', desc: '母株+子苗（匍匐茎 / 组培 / 扦插 / 分株 / 块茎 / 枝条）', needsMother: true, needsScion: false },
  ] as const;

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // 图片上传状态
  const [pictures, setPictures] = useState<string[]>([]);

  // 方案2.7: combogrid种源选择器状态
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourcePopoverOpen, setSourcePopoverOpen] = useState(false);

  // 品种库缓存（按 cropCode 索引）—— 用于「品种路径」展示，与育苗列表 SeedlingTable 同一数据源
  const [varietyCache, setVarietyCache] = useState<Map<string, CropVariety>>(new Map());
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const varieties = await apiCropVarietyService.getAllVarieties();
        if (cancelled) return;
        const cache = new Map<string, CropVariety>();
        varieties.forEach(v => {
          const code = v.cropCode || '';
          if (code && !cache.has(code)) cache.set(code, v);
        });
        setVarietyCache(cache);
      } catch (e) {
        // 品种库加载失败不阻断建档：品种路径将回退为种源自身字段拼接
        console.warn('[AddModal] 加载品种库失败，品种路径改用种源字段兜底', e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ═══════════════════════════════════════════════════
  // 2026-07-04：所有种源必须录入内部种源后使用，不再区分内/外
  // ═══════════════════════════════════════════════════

  // 弹窗每次打开时重置所有状态
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_DATA);
      setPictures([]);
      setSourceSearch('');
      setSourcePopoverOpen(false);
    }
  }, [isOpen]);

  // 方案2.7: 过滤种源列表用于combogrid展示
  // 2026-06-12: 联动过滤版本下移到 availableProductionPlans 之后(避免 TDZ)

  // 方案2.7: 获取选中种源的显示文本（2026-10-17：名称口径与下拉表格一致，显示品种而非作物名）
  const selectedSourceLabel = useMemo(() => {
    const source = seedSources.find(s => s.id === formData.sourceId);
    return source ? `${source.seedCode} - ${getSeedSourceVarietyName(source)}` : '';
  }, [seedSources, formData.sourceId]);

  // 方案2.7: combogrid popover 外部点击关闭
  const sourcePopoverRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sourcePopoverOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (sourcePopoverRef.current && !sourcePopoverRef.current.contains(e.target as Node)) {
        setSourcePopoverOpen(false);
        setSourceSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [sourcePopoverOpen]);

  // 关联种源信息（用于数量上限校验 + 品种路径兜底）
  // 2026-10-17：声明提前到 fullVarietyPath 之前（避免 TDZ —— const 在其声明前被引用会抛错）
  const selectedSource = useMemo(
    () => seedSources.find(s => s.id === formData.sourceId) || null,
    [seedSources, formData.sourceId]
  );
  const sourceAvailableCount = selectedSource?.availableCount ?? 0;
  // 2026-10-17：种源单位与育苗单位不同口径（如 千克→株）时，不可按育苗数量扣减，
  //   必须由用户填写「种源消耗量（种源单位）」
  const sourceRequiresExplicitConsumption = !!selectedSource
    && !isSameUnitDimension(selectedSource.unit, formData.unit);

  // 完整品种路径：与种源列表/育苗列表的"品种路径"列保持一致（4 段）
  // 2026-10-17 修复：主数据源改为 API 品种库（按 cropCode 精确匹配）；
  //   品种库未命中（加载失败/编码缺失）时回退用种源自身字段拼接，避免字段恒空
  const fullVarietyPath = useMemo(() => {
    const variety = formData.selectedCropCode ? varietyCache.get(formData.selectedCropCode) : undefined;
    if (variety) {
      return {
        categoryName: variety.categoryName || '',
        typeName: variety.typeName || '',
        varietyName: variety.varietyName || '',
        subVariety1Name: variety.subVariety1Name || '',
      };
    }
    if (!selectedSource) return null;
    return {
      categoryName: selectedSource.cropCategory || '',
      typeName: selectedSource.typeName || '',
      varietyName: selectedSource.cropName || '',
      subVariety1Name: selectedSource.cropVariety && selectedSource.cropVariety !== selectedSource.cropName
        ? selectedSource.cropVariety
        : '',
    };
  }, [formData.selectedCropCode, varietyCache, selectedSource]);

  // 自动计算目标成苗数
  const targetSurvivalCount = useMemo(() => {
    if (formData.calculateMode === SeedlingCalculateMode.PROPAGATION) {
      // 扩繁模式：理论产量 × 目标成苗率
      if (formData.theoreticalYield && formData.targetSurvivalRate) {
        return Math.round(formData.theoreticalYield * (formData.targetSurvivalRate / 100));
      }
    } else {
      // 单株育苗模式：初始数量 × 目标成苗率
      if (formData.initialCount && formData.targetSurvivalRate) {
        return Math.round(formData.initialCount * (formData.targetSurvivalRate / 100));
      }
    }
    return 0;
  }, [formData.calculateMode, formData.initialCount, formData.theoreticalYield, formData.targetSurvivalRate]);

  // 自动计算理论产量（扩繁模式）
  const theoreticalYield = useMemo(() => {
    if (formData.calculateMode === SeedlingCalculateMode.PROPAGATION) {
      if (formData.motherPlantCount) {
        const multiple = formData.propagationMultiple === 0
          ? formData.customMultiple  // 自定义倍数
          : formData.propagationMultiple;
        if (multiple > 0) {
          return formData.motherPlantCount * multiple;
        }
      }
    }
    return 0;
  }, [formData.calculateMode, formData.motherPlantCount, formData.propagationMultiple, formData.customMultiple]);

  // 同步理论产量到formData
  useEffect(() => {
    if (formData.calculateMode === SeedlingCalculateMode.PROPAGATION && theoreticalYield > 0 && formData.theoreticalYield !== theoreticalYield) {
      setFormData(prev => ({ ...prev, theoreticalYield }));
    }
  }, [theoreticalYield, formData.calculateMode, formData.theoreticalYield]);

  // 数量上限校验：单株模式 initialCount / 扩繁模式 motherPlantCount 不能超过种源可用数量
  // 2026-10-17：单位不同口径时不比较育苗数量与种源数量（维度不同），改校验种源消耗量
  const initialCountExceeds = !sourceRequiresExplicitConsumption
    && formData.calculateMode === SeedlingCalculateMode.SINGLE
    && formData.initialCount > 0
    && formData.initialCount > sourceAvailableCount;
  const motherCountExceeds = !sourceRequiresExplicitConsumption
    && formData.calculateMode === SeedlingCalculateMode.PROPAGATION
    && formData.motherPlantCount > 0
    && formData.motherPlantCount > sourceAvailableCount;
  const isCountExceeded = initialCountExceeds || motherCountExceeds;

  // 自动计算育苗周期（天）
  const seedlingCycle = useMemo(() => {
    if (formData.startDate && formData.expectedEndDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.expectedEndDate);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return diff > 0 ? diff : 0;
    }
    return 0;
  }, [formData.startDate, formData.expectedEndDate]);

  // 点击生成批次号按钮（直接用当天日期）
  const handleGenerateSeedlingCode = async () => {
    const today = new Date();
    const code = await generateSeedlingCodeByDate(today);
    setFormData({ ...formData, seedlingCode: code });
  };

  // 从Store获取生产计划和当前用户
  const storePlans = useProductionPlanStore((s) => s.batches);
  const fetchPlans = useProductionPlanStore((s) => s.fetchPlans);
  const storeUsers = useUserStore((s) => s.users);
  const loadUsers = useUserStore((s) => s.loadUsers);

  useEffect(() => {
    if (storePlans.length === 0) fetchPlans();
    if (storeUsers.length === 0) loadUsers();
  }, [storePlans.length, fetchPlans, storeUsers.length, loadUsers]);

  // 当前用户（优先登录用户，其次用户列表首条；2026-10-18 移除 localStorage）
  const authUser = useAuthStore((s) => s.currentUser);
  const currentUser = useMemo(() => ({
    id: authUser?.oid || storeUsers[0]?.oid || '',
    name: authUser?.realName || authUser?.username || storeUsers[0]?.name || '未知用户',
    department: authUser?.orgOid || storeUsers[0]?.orgOid || '生产部',
  }), [authUser, storeUsers]);

  // 筛选可用的生产计划批次（已发布和执行中，且只显示育苗计划类型）
  const availableProductionPlans = useMemo(() => {
    return storePlans.filter((batch: any) =>
      (batch.batchStatus === 'published' || batch.batchStatus === 'in_progress' || batch.status === 'published' || batch.status === 'in_progress') &&
      batch.planType === PlanType.SEEDLING
    );
  }, [storePlans]);

  // 联动过滤 — 选了种源后,生产计划下拉只显示同品种(variety)的计划
  // 2026-10-17：种源侧改用「作物品种」口径（cropVariety/varietyName，如"红颜"）。
  //   原用 cropName（如"草莓"）与计划的 variety（"红颜"）永远不相等，导致选种源后计划下拉被清空
  const productionPlanVarietyFilter = useMemo(() => {
    if (!formData.sourceId) return null;
    const source = seedSources.find(s => s.id === formData.sourceId);
    return source ? getSeedSourceVarietyName(source) : null;
  }, [formData.sourceId, seedSources]);

  const filteredProductionPlans = useMemo(() => {
    let list = availableProductionPlans;
    if (productionPlanVarietyFilter) {
      list = list.filter(p => p.variety === productionPlanVarietyFilter);
    }
    return list;
  }, [availableProductionPlans, productionPlanVarietyFilter]);

  // 联动过滤 — 选了生产计划后种源下拉只显示同品种(variety)
  const productionPlanVarietyFilterFromPlan = useMemo(() => {
    if (!formData.productionPlanId) return null;
    const plan = availableProductionPlans.find(p => p.batchCode === formData.productionPlanId);
    return plan?.variety || null;
  }, [formData.productionPlanId, availableProductionPlans]);

  const filteredSeedSources = useMemo(() => {
    let list = seedSources || [];
    if (productionPlanVarietyFilterFromPlan) {
      // 2026-10-17：按「作物品种」匹配（原用 cropName 与计划 variety 永不相等，选了计划后种源列表恒为空）
      list = list.filter(s => getSeedSourceVarietyName(s) === productionPlanVarietyFilterFromPlan);
    }
    if (sourceSearch) {
      const q = sourceSearch.toLowerCase();
      list = list.filter(s =>
        s.seedCode?.toLowerCase().includes(q) ||
        s.cropName?.toLowerCase().includes(q) ||
        s.cropVariety?.toLowerCase().includes(q) ||
        s.varietyName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [seedSources, sourceSearch, productionPlanVarietyFilterFromPlan]);

  // 跳转种源管理 (空状态"去添加"按钮用)
  const navigate = useNavigate();

  // 来源类型映射（枚举值 -> 中文）
  const sourceTypeLabels: Record<string, string> = {
    'seed': '种子',
    'seedling': '种苗',
    'cutting': '扦插苗',
    'grafting': '嫁接苗',
    'tissue_culture': '组培苗',
    'split': '分株苗',
    'bulb': '种球',
    'other': '其他'
  };

  const handleSubmit = async () => {
    if (!formData.sourceId) {
      await showAlert('请先选择种源');
      return;
    }

    // 基本信息验证
    if (!formData.selectedCropCode || !formData.siteId) {
      await showAlert('请填写完整信息：作物品种、育苗区域为必填项');
      return;
    }

    if (!formData.seedlingCode) {
      await showAlert('请先生成育苗批次号');
      return;
    }

    // 2026-07-23：育苗后形态必填（入库后写入详情弹窗"种苗类型"列）
    if (!formData.seedlingForm) {
      await showAlert('请选择育苗后形态（必填）');
      return;
    }

    // 2026-10-17：日期逻辑校验 —— 预计结束日期必须晚于开始日期（两者均已选时校验）
    if (formData.startDate && formData.expectedEndDate
      && new Date(formData.expectedEndDate) <= new Date(formData.startDate)) {
      await showAlert('预计结束日期必须晚于开始日期，请调整');
      return;
    }

    // 2026-10-17 单位口径：种源单位与育苗单位不同 → 必填种源消耗量，且不得超可用量
    if (sourceRequiresExplicitConsumption) {
      const srcUnit = selectedSource?.unit || '';
      if (!formData.sourceConsumedQuantity || formData.sourceConsumedQuantity <= 0) {
        await showAlert(`种源按「${srcUnit}」计量，与育苗单位「${formData.unit}」不同，请填写种源消耗量（${srcUnit}）`);
        return;
      }
      if (formData.sourceConsumedQuantity > sourceAvailableCount) {
        await showAlert(`种源消耗量 ${formData.sourceConsumedQuantity}${srcUnit} 超过可用数量 ${sourceAvailableCount}${srcUnit}，请调整`);
        return;
      }
    }

    // 单株育苗模式验证
    if (formData.calculateMode === SeedlingCalculateMode.SINGLE) {
      if (!formData.initialCount || formData.initialCount <= 0) {
        await showAlert('请输入初始数量');
        return;
      }
      if (!sourceRequiresExplicitConsumption && formData.sourceId && formData.initialCount > sourceAvailableCount) {
        await showAlert(`初始数量 ${formData.initialCount} 超过种源可用数量 ${sourceAvailableCount}，请调整`);
        return;
      }
    }

    // 扩繁育苗模式验证
    if (formData.calculateMode === SeedlingCalculateMode.PROPAGATION) {
      if (!formData.motherPlantCount || formData.motherPlantCount <= 0) {
        await showAlert('请输入母株数量');
        return;
      }
      if (!sourceRequiresExplicitConsumption && formData.sourceId && formData.motherPlantCount > sourceAvailableCount) {
        await showAlert(`母株数量 ${formData.motherPlantCount} 超过种源可用数量 ${sourceAvailableCount}，请调整`);
        return;
      }
      if (formData.propagationMultiple === 0) {
        if (!formData.customMultiple || formData.customMultiple <= 0) {
          await showAlert('请输入扩繁倍数');
          return;
        }
      }
    }

    // 处理"其他"选项
    const finalSeedlingType = formData.seedlingType === '其他'
      ? formData.seedlingTypeOther
      : formData.seedlingType;

    if (formData.seedlingType === '其他' && !formData.seedlingTypeOther.trim()) {
      await showAlert('请输入其他育苗方式的具体描述');
      return;
    }

    // 获取场地名称
    const site = sites.find(s => s.value === formData.siteId);
    const siteName = site?.label || '';

    // 获取种源批号
    const source = seedSources.find(s => s.id === formData.sourceId);
    const sourceCode = source?.seedCode || '';

    // 2026-06-15: 数量体系重构 — finalInitialCount 改按 propagationMode 2 模式决定
    //  - one_to_many（1:多 育苗） → 用户填的是 formData.motherPlantCount（母株数）
    //  - one_to_one（1:1 育苗） → 用户填的是 formData.initialCount
    const isOneToMany = formData.propagationMode === 'one_to_many';
    const finalInitialCount = isOneToMany
      ? formData.motherPlantCount
      : formData.initialCount;

    // 后端 mother_plant_count 字段（两种模式都存 finalInitialCount）
    // - 1:多：母株数 = initial，作为后续"母株存活数 - 损耗 + 补苗"的基线
    // - 1:1：母株数 = initial（与"种子/嫁接"投入的种子数等价），否则 daily record 派生 expanded 会丢 initial
    // 2026-06-16 修复：1:1 模式此前写 0，导致补苗后 expanded_plant_count = 0 + 补苗，丢掉 initial
    const motherCountForBackend = finalInitialCount;

    // 构建育苗数据
    const seedlingData: Record<string, unknown> = {
      seedlingCode: formData.seedlingCode,
      sourceId: formData.sourceId,         // 关联种源 DB 主键
      sourceCode: sourceCode,
      cropName: formData.cropName,
      cropVariety: formData.cropVariety,
      cropCode: formData.selectedCropCode,
      unit: formData.unit || '株',  // 2026-07-01: 单位
      seedlingType: finalSeedlingType,
      // 2026-10-11：补 seedlingForm —— 必填校验已拦「育苗后形态」，但 payload 从未带该字段，
      //   导致 seedlings.seedling_form 恒为 null、详情弹窗"种苗类型"永远为空
      //   （services/apiSeedlingService.ts 已有 seedlingForm → seedling_form 映射）
      seedlingForm: formData.seedlingForm,
      siteId: formData.siteId,
      siteName,
      startDate: formData.startDate,
      expectedEndDate: formData.expectedEndDate || undefined,
      initialCount: finalInitialCount,
      survivalCount: 0,
      // 2026-06-28：移除 plantedCount 写入（业务规则：种植管理不再从育苗取苗）
      survivalRate: 0,
      lossCount: 0,
      lossRate: 0,
      // 2026-10-17：删除 isFinished（DB 无此列，后端白名单不支持；结束状态由列表「结束」按钮维护）
      status: SeedlingStatus.IN_PROGRESS,
      dailyRecords: [],
      pictures: pictures,
      printCount: 0,
      remarks: formData.remarks,
      // 2026-10-18 P2 修复：移除 localStorage 兜底，使用 Store 中的当前用户
      createBy: currentUser.name,
      targetSurvivalRate: formData.targetSurvivalRate,
      targetSurvivalCount: targetSurvivalCount,
      chargePerson: formData.chargePerson || undefined,
      // 2026-10-17：品质等级新增入口（quality_level 字典值）
      qualityGrade: formData.qualityGrade || undefined,
      productionPlanCode: formData.productionPlanId || undefined,
      calculateMode: formData.calculateMode,
      propagationMultiple: formData.calculateMode === SeedlingCalculateMode.PROPAGATION
        ? (formData.propagationMultiple === 0 ? formData.customMultiple : formData.propagationMultiple)
        : undefined,
      theoreticalYield: formData.calculateMode === SeedlingCalculateMode.PROPAGATION ? theoreticalYield : undefined,
      // 2026-06-14: 繁殖模式（建档后锁定）
      propagationMode: formData.propagationMode,
      motherPlantCount: motherCountForBackend,  // 映射到后端 mother_plant_count
      expandedPlantCount: 0,
      scionCount: formData.propagationScionCount,
    };

    // 保存育苗数据：使用 /with-deduct 原子端点（扣减种源 + 创建育苗）
    let addedSeedlingId: string | null = null;
    try {
      // V2.1: 使用 /with-deduct 原子端点，替代 addItem + decreaseAvailableCount 两步调用
      const { addSeedlingWithDeduct } = await import('../../../../services/apiSeedlingService');
      const result = await addSeedlingWithDeduct({
        sourceId: formData.sourceId,
        count: finalInitialCount,
        // 2026-10-17：种源与育苗单位不同口径时，扣减量 = 用户填写的种源消耗量
        sourceConsumedQuantity: sourceRequiresExplicitConsumption ? formData.sourceConsumedQuantity : undefined,
        seedling: seedlingData,
      });
      addedSeedlingId = result.id;
    } catch (error) {
      // 2026-06-14: 透出真正的错误信息（后端校验失败、种源余量不足等）
      const msg = error instanceof Error ? error.message : String(error);
      await showAlert(`保存失败：${msg}`);
      return;
    }

    // 创建草稿任务（供任务中心分派执行人）
    if (addedSeedlingId) {
      const unitLabel = formData.unit || '株';
      const workContent = `作物品种：${formData.cropVariety || formData.cropName}
育苗方式：${formData.seedlingType}
初始数量：${formData.initialCount}${unitLabel}
目标成活率：${formData.targetSurvivalRate}%
目标成活数量：${targetSurvivalCount}${unitLabel}
${formData.calculateMode === SeedlingCalculateMode.PROPAGATION ? `扩繁模式：母株${formData.motherPlantCount}${unitLabel} × ${formData.propagationMultiple === 0 ? formData.customMultiple : formData.propagationMultiple}倍` : ''}`;

      tasksHook.createTask({
        title: `【育苗】${formData.cropName}-${formData.seedlingCode}`,
        type: 'seedling',
        typeName: '育苗任务',
        sourceType: 'dispatch',
        sourceId: addedSeedlingId,
        sourceCode: formData.seedlingCode,
        remarks: workContent,
        // 2026-10-11：Task 无 siteName 字段，育苗场地写入 greenhouseName（farm_tasks.greenhouse_name 在白名单内，可落库）
        greenhouseName: siteName,
        // 2026-10-11：原 startDate/initialCount/targetSurvivalCount 均非 Task 字段，
        //   后端白名单也无对应列（恒被丢弃）；数量/成活率已写在 remarks 的 workContent 文本中
      }, 'farm', 'draft');
    }

    // 更新作物实例状态为育苗中
    if (source?.instanceId) {
      try {
        await cropInstanceService.updateQuantity(source.instanceId, 'seedling', 0);
      } catch (error) {
        // logger.error('更新作物实例状态失败:', error);
      }
    }

    onClose();
    onSuccess?.();
  };

  // 根据选择的种源自动填充作物信息
  const handleSourceChange = (sourceId: string) => {
    const source = seedSources.find(s => s.id === sourceId);
    if (source) {
      // 转换来源类型枚举值为中文
      const sourceTypeLabel = source.sourceType ? (sourceTypeLabels[source.sourceType] || source.sourceType) : '';

      // 2026-06-12: 一致性校验 — 选种源后,若已选生产计划不匹配则清空
      // 2026-06-14: 计划侧用 variety（品种名）对比，不用 cropName（作物名）
      // 2026-10-17: 种源侧同步改为品种口径（原 source.cropName 与 plan.variety 永不相等，导致选了种源就被误清空计划）
      const currentPlanId = formData.productionPlanId;
      let shouldClearPlan = false;
      let mismatchPlan: { batchCode: string; variety: string } | null = null;
      if (currentPlanId) {
        const plan = availableProductionPlans.find(p => p.batchCode === currentPlanId);
        if (plan && plan.variety !== getSeedSourceVarietyName(source)) {
          shouldClearPlan = true;
          mismatchPlan = { batchCode: plan.batchCode, variety: plan.variety };
        }
      }

      setFormData({
        ...formData,
        sourceId,
        sourceCode: source.seedCode,
        sourceType: sourceTypeLabel,
        seedForm: (source as any).seedForm || '',
        selectedCropCode: source.cropCode || '',
        cropName: source.cropName || '',
        cropVariety: source.cropVariety || '',
        // 2026-10-17：换种源后单位可能变化，消耗量必须重新填写
        sourceConsumedQuantity: 0,
        // 一致性:清空不匹配的生产计划
        productionPlanId: shouldClearPlan ? '' : formData.productionPlanId,
      });

      if (shouldClearPlan && mismatchPlan) {
        showAlert(`已选生产计划 [${mismatchPlan.batchCode}] 品种为 ${mismatchPlan.variety}，与新种源 ${getSeedSourceVarietyName(source)} 不一致,已自动清空关联计划。`);
      }
    }
  };

  // 场地选择时获取名称
  const handleSiteChange = (siteId: string) => {
    const site = sites.find(s => s.value === siteId);
    setFormData({ ...formData, siteId, siteName: site?.label || '' });
  };

  // 育苗方式选择
  const handleSeedlingTypeChange = (type: string) => {
    setFormData({ ...formData, seedlingType: type, seedlingTypeOther: '' });
  };

  // 处理计算模式切换
  const handleCalculateModeChange = (mode: SeedlingCalculateMode) => {
    setFormData({
      ...formData,
      calculateMode: mode,
      // 切换时重置扩繁相关字段
      motherPlantCount: 0,
      propagationMultiple: 0,
      customMultiple: 0,
      theoreticalYield: 0
    });
  };

  // 处理扩繁倍数选择
  const handlePropagationMultipleChange = (value: number) => {
    setFormData({
      ...formData,
      propagationMultiple: value,
      customMultiple: value === 0 ? formData.customMultiple : 0
    });
  };

  return (
    <UnifiedModal
      isOpen={isOpen}
      onClose={onClose}
      title="新增育苗"
      size="xl"
      // 2026-07-08 V3.4：弹窗高度 +30%（xl 默认 600px → 780px）
      // 注意：Modal 仅在 width+height 同时设置时使用 prop，否则 fall back 到 size 默认
      width={900}
      height={780}
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* ========== 2026-06-24: 新流程 Banner — 育苗吸收种源管理「无性繁殖」
            2026-07-08 V3.4 UI 改造：前端隐藏 banner 文字（用户决定），仅保留代码注释说明业务背景
            原显示文字：
            育苗已吸收无性繁殖：选 1:多 模式可记录扦插 / 嫁接 / 分株 / 块茎 / 枝条 / 组培 / 匍匐茎等所有无性繁殖方式。
            育苗成品同样通过「行级采收入库」入作物库存，再调拨入种源管理。 ========== */}

        {/* ========== 2026-06-14: 繁殖模式选择（建档后锁定） ==========
            V3.4 UI 统一：去掉 indigo 背景色块，改为 h3 + 灰下边框分组（与种源/种植一致） */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">
            繁殖模式 <span className="text-red-500">*</span>
            <span className="text-xs text-gray-500 ml-2 font-normal">建档后不可修改，决定数量字段语义</span>
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {PROPAGATION_MODES.map(m => (
              <label
                key={m.value}
                className={`flex items-start gap-2 p-3 border rounded-lg cursor-pointer transition-colors
                  ${formData.propagationMode === m.value
                    ? 'border-indigo-500 bg-indigo-100 ring-2 ring-indigo-200'
                    : 'border-gray-300 bg-white hover:border-indigo-300'}`}
              >
                <input
                  type="radio"
                  name="propagationMode"
                  value={m.value}
                  checked={formData.propagationMode === m.value}
                  onChange={() => setFormData({
                    ...formData,
                    propagationMode: m.value,
                    // 2026-06-16: 取消 UI 重复选择 — propagationMode 自动联动 calculateMode
                    // 1:1 ↔ single，1:多 ↔ propagation（语义 1:1 对应）
                    calculateMode: m.value === 'one_to_many' ? SeedlingCalculateMode.PROPAGATION : SeedlingCalculateMode.SINGLE,
                    // 切换模式时重置对应字段
                    initialCount: 0,
                    motherPlantCount: 0,
                    propagationMotherPlantCount: 0,
                    propagationScionCount: 0,
                  })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="text-sm font-bold text-gray-900">{m.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* ========== 育苗批次号（最顶层） ==========
            V3.4 UI 统一：去掉 purple 背景色块，改为 h3 + 灰下边框分组 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 pb-2 mb-3 border-b border-gray-200">育苗批次号</h3>
          <div className="grid grid-cols-2 gap-4">
            {/* 育苗批次号 */}
            <div>
              <Label className="text-gray-900">
                育苗批次号 <span className="text-red-500">*</span>
              </Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  value={formData.seedlingCode}
                  onChange={(e) => setFormData({ ...formData, seedlingCode: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="点击生成获取批次号"
                />
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleGenerateSeedlingCode}
                  className="gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  生成
                </Button>
              </div>
            </div>

            {/* 关联生产计划批次号 */}
            <div>
              <Label className="text-gray-900">
                关联生产计划批次号
              </Label>
              <Select
                value={formData.productionPlanId || '__none__'}
                onValueChange={(val) => {
                  const nextId = val === '__none__' ? '' : val;
                  // 2026-06-12: 一致性校验 — 选生产计划后,若已选种源不匹配则清空
                  // 2026-06-14: 计划侧用 variety（品种名）对比；
                  // 2026-10-17: 种源侧同步改为品种口径（原 source.cropName 恒不相等，选计划即误清空种源）
                  let shouldClearSource = false;
                  let mismatchSource: { seedCode: string; varietyName: string } | null = null;
                  if (nextId && formData.sourceId) {
                    const plan = availableProductionPlans.find(p => p.batchCode === nextId);
                    if (plan) {
                      const source = seedSources.find(s => s.id === formData.sourceId);
                      if (source && getSeedSourceVarietyName(source) !== plan.variety) {
                        shouldClearSource = true;
                        mismatchSource = { seedCode: source.seedCode, varietyName: getSeedSourceVarietyName(source) };
                      }
                    }
                  }

                  setFormData({
                    ...formData,
                    productionPlanId: nextId,
                    // 一致性:清空不匹配的种源
                    sourceId: shouldClearSource ? '' : formData.sourceId,
                    sourceCode: shouldClearSource ? '' : formData.sourceCode,
                    sourceType: shouldClearSource ? '' : formData.sourceType,
                  });

                  if (shouldClearSource && mismatchSource) {
                    showAlert(`已选种源 [${mismatchSource.seedCode}] 为 ${mismatchSource.varietyName}，与新生产计划不匹配,已自动清空关联种源。`);
                  }
                }}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="不关联（独立批次）" />
                </SelectTrigger>
                <SelectContent>
                  {/* 固定"不关联"选项 — 2026-06-12 修复：之前漏写在 SelectContent 里 */}
                  <SelectItem value="__none__">不关联（独立批次）</SelectItem>
                  {/* 2026-06-12: 联动过滤 — 选了种源后只显示同品种（variety）的计划 */}
                  {filteredProductionPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.batchCode}>
                      [{plan.planTypeName || '育苗计划'}] {plan.batchCode} - {plan.variety}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ========== 关联种源信息区（2026-10-18 拆分为子组件） ========== */}
        <SeedlingSourceSection
          formData={formData}
          setFormData={setFormData}
          filteredSeedSources={filteredSeedSources}
          productionPlanVarietyFilterFromPlan={productionPlanVarietyFilterFromPlan}
          sourcePopoverOpen={sourcePopoverOpen}
          setSourcePopoverOpen={setSourcePopoverOpen}
          sourceSearch={sourceSearch}
          setSourceSearch={setSourceSearch}
          sourcePopoverRef={sourcePopoverRef}
          selectedSourceLabel={selectedSourceLabel}
          selectedSource={selectedSource}
          fullVarietyPath={fullVarietyPath}
          handleSourceChange={handleSourceChange}
          navigate={navigate}
        />
        {/* ========== 数量与品质区（2026-10-18 拆分为子组件） ========== */}
        <QuantityQualitySection
          formData={formData}
          setFormData={setFormData}
          OPERATORS={OPERATORS}
          propagationMultiples={propagationMultiples}
          sourceRequiresExplicitConsumption={sourceRequiresExplicitConsumption}
          sourceAvailableCount={sourceAvailableCount}
          selectedSource={selectedSource}
          initialCountExceeds={initialCountExceeds}
          motherCountExceeds={motherCountExceeds}
          targetSurvivalCount={targetSurvivalCount}
          theoreticalYield={theoreticalYield}
          handlePropagationMultipleChange={handlePropagationMultipleChange}
        />
        {/* ========== 场地与计划区（2026-10-18 拆分为子组件） ========== */}
        <SitePlanSection
          formData={formData}
          setFormData={setFormData}
          sites={sites}
          seedlingCycle={seedlingCycle}
          handleSiteChange={handleSiteChange}
          handleSeedlingTypeChange={handleSeedlingTypeChange}
        />
        {/* ========== 备注与附件区（2026-10-18 拆分为子组件） ========== */}
        <RemarkAttachmentSection
          formData={formData}
          setFormData={setFormData}
          pictures={pictures}
          setPictures={setPictures}
        />
      </div>
    </UnifiedModal>
  );
}
