/**
 * 育苗新增弹窗 - 重新规划版本
 * 三区段式布局：关联种源信息 | 场地与计划 | 数量与品质
 * V3.1: 支持补录申请功能
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UnifiedModal } from '@/components/ui';
import { Button } from '@/components/ui';
import { X, Upload, Link2, MapPin, BarChart3, FileText, RefreshCw } from 'lucide-react';
import { SeedSource, SeedlingStatus, SeedlingPlanType, SeedlingCalculateMode } from '../../../../types/crop';
import { generateSeedlingCodeByDate } from '../../../../services/apiSeedlingService';
import { decreaseAvailableCount, getSeedSourceById } from '../../../../services/apiSeedSourceService';
import * as cropInstanceService from '../../../../services/apiCropInstanceService';
import { CropVarietyOption } from '../../../../types/cropVariety';
import { todayLocal } from '@/lib/dateUtils';
import { getVarietyByCode } from '../../../../services/cropVarietyService';
import { useDictionaryStore, getDictItems, useProductionPlanStore, useUserStore, useSeedlingStore } from '../../../../stores';
import { useTasks } from '../../../../hooks/useTasks';
import { PlanType } from '../../../../types';
import { useApprovalContext } from '../../../../contexts/ApprovalContext';
import { ApprovalType, ApprovalStatus } from '../../../../types/approval';
import { DictSelect } from '../../../common/settings/DictSelect';
import { Input } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Label } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { showAlert } from '@/lib/dialogService';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  seedSources: SeedSource[];
  cropVarietyOptions: CropVarietyOption[];
  seedlingTypes: Array<{ value: string; label: string }>;
  sites: Array<{ value: string; label: string }>;
}

// 深度输入框样式
const deepInputClass = "px-4 py-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 shadow-inner";

export function AddModal({
  isOpen,
  onClose,
  onSuccess,
  seedSources = [],
  cropVarietyOptions,
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
  const INITIAL_FORM_DATA = {
    sourceId: '',
    sourceCode: '',
    sourceType: '',
    supplierName: '',
    selectedCropCode: '',
    cropName: '',
    cropVariety: '',
    seedlingType: '',
    seedlingTypeOther: '',
    siteId: '',
    siteName: '',
    seedlingCode: '',
    productionPlanId: '',
    startDate: '',
    expectedEndDate: '',
    initialCount: 0,
    targetSurvivalRate: 90,
    planType: SeedlingPlanType.ROUTINE,
    chargePerson: '',
    remarks: '',
    calculateMode: SeedlingCalculateMode.SINGLE,
    motherPlantCount: 0,
    propagationMultiple: 0,
    customMultiple: 0,
    theoreticalYield: 0,
    workHours: 0,
    isSupplementary: false,
    supplementaryReason: '',
    // 2026-06-15: 数量体系重构 — 繁殖模式合并为 2 种（1:1 / 1:多）
    propagationMode: 'one_to_one' as 'one_to_one' | 'one_to_many',
    propagationMotherPlantCount: 0,  // 兼容字段（后续可移除）
    propagationScionCount: 0,         // 兼容字段（后续可移除）
  };

  // 2026-06-15: 数量体系重构 — 6 种模式合并为 2 种
  const PROPAGATION_MODES = [
    { value: 'one_to_one', label: '1:1 育苗', desc: '一对一（种子/嫁接）', needsMother: false, needsScion: false },
    { value: 'one_to_many', label: '1:多 育苗', desc: '母株+子苗（匍匐茎/组培/扦插/分株）', needsMother: true, needsScion: false },
  ] as const;

  const [formData, setFormData] = useState(INITIAL_FORM_DATA);

  // 图片上传状态
  const [pictures, setPictures] = useState<string[]>([]);

  // 方案2.7: combogrid种源选择器状态
  const [sourceSearch, setSourceSearch] = useState('');
  const [sourcePopoverOpen, setSourcePopoverOpen] = useState(false);

  // ═══════════════════════════════════════════════════
  // 种源来源切换：内部种源（combogrid选择）/ 外部种源（手动录入）
  // ═══════════════════════════════════════════════════
  const [sourceMode, setSourceMode] = useState<'internal' | 'external'>('internal');
  const [externalSeedCode, setExternalSeedCode] = useState('');
  const [externalSeedName, setExternalSeedName] = useState('');
  const [externalSeedQuantity, setExternalSeedQuantity] = useState<number>(0);
  const [externalSeedNote, setExternalSeedNote] = useState('');

  // 弹窗每次打开时重置所有状态
  useEffect(() => {
    if (isOpen) {
      setFormData(INITIAL_FORM_DATA);
      setPictures([]);
      setSourceSearch('');
      setSourcePopoverOpen(false);
      setSourceMode('internal');
      setExternalSeedCode('');
      setExternalSeedName('');
      setExternalSeedQuantity(0);
      setExternalSeedNote('');
    }
  }, [isOpen]);

  // 方案2.7: 过滤种源列表用于combogrid展示
  // 2026-06-12: 联动过滤版本下移到 availableProductionPlans 之后(避免 TDZ)

  // 方案2.7: 获取选中种源的显示文本
  const selectedSourceLabel = useMemo(() => {
    const source = seedSources.find(s => s.id === formData.sourceId);
    return source ? `${source.seedCode} - ${source.cropName}` : '';
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

  // 完整品种路径：与种源列表/育苗列表的"品种路径"列保持一致（4 段）
  const fullVarietyPath = useMemo(() => {
    if (!formData.selectedCropCode) return null;
    const variety = getVarietyByCode(formData.selectedCropCode);
    if (!variety) return null;
    return {
      categoryName: variety.categoryName || '',
      typeName: variety.typeName || '',
      varietyName: variety.varietyName || '',
      subVariety1Name: variety.subVariety1Name || '',
    };
  }, [formData.selectedCropCode]);

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

  // 关联种源信息（用于实时校验数量上限）
  const selectedSource = useMemo(
    () => seedSources.find(s => s.id === formData.sourceId) || null,
    [seedSources, formData.sourceId]
  );
  const sourceAvailableCount = selectedSource?.availableCount ?? 0;

  // 数量上限校验：单株模式 initialCount / 扩繁模式 motherPlantCount 不能超过种源可用数量
  // 2026-06-16: 仅内部种源模式校验；外部种源用户自填数量不限制
  const initialCountExceeds = sourceMode === 'internal'
    && formData.calculateMode === SeedlingCalculateMode.SINGLE
    && formData.initialCount > 0
    && formData.initialCount > sourceAvailableCount;
  const motherCountExceeds = sourceMode === 'internal'
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

  // 当前用户（从Store获取，后备从localStorage读取）
  const currentUser = useMemo(() => ({
    id: storeUsers[0]?.oid || localStorage.getItem('userOid') || 'U013',
    name: storeUsers[0]?.name || localStorage.getItem('username') || '未知用户',
    department: storeUsers[0]?.orgOid || '生产部',
  }), [storeUsers]);

  // 筛选可用的生产计划批次（已发布和执行中，且只显示育苗计划类型）
  const availableProductionPlans = useMemo(() => {
    return storePlans.filter((batch: any) =>
      (batch.batchStatus === 'published' || batch.batchStatus === 'in_progress' || batch.status === 'published' || batch.status === 'in_progress') &&
      batch.planType === PlanType.SEEDLING
    );
  }, [storePlans]);

  // 联动过滤 — 选了种源后,生产计划下拉只显示同品种(variety)的计划
  // 种源的 cropName 是最细化名称(如"红颜"),生产计划的 variety 是品种名(如"红颜"),两者语义一致
  const productionPlanVarietyFilter = useMemo(() => {
    if (!formData.sourceId) return null;
    const source = seedSources.find(s => s.id === formData.sourceId);
    return source?.cropName || null;
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
      list = list.filter(s => s.cropName === productionPlanVarietyFilterFromPlan);
    }
    if (sourceSearch) {
      const q = sourceSearch.toLowerCase();
      list = list.filter(s =>
        s.seedCode?.toLowerCase().includes(q) ||
        s.cropName?.toLowerCase().includes(q) ||
        s.cropVariety?.toLowerCase().includes(q)
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
    // 内部种源模式：关联种源必填
    if (sourceMode === 'internal' && !formData.sourceId) {
      await showAlert('请先选择种源');
      return;
    }

    // 外部种源模式：必须填写种源批号和名称
    if (sourceMode === 'external') {
      if (!externalSeedCode.trim()) {
        await showAlert('请输入外部种源批号');
        return;
      }
      if (!externalSeedName.trim()) {
        await showAlert('请输入种源名称');
        return;
      }
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

    // 单株育苗模式验证
    if (formData.calculateMode === SeedlingCalculateMode.SINGLE) {
      if (!formData.initialCount || formData.initialCount <= 0) {
        await showAlert('请输入初始数量');
        return;
      }
      if (sourceMode === 'internal' && formData.sourceId && formData.initialCount > sourceAvailableCount) {
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
      if (sourceMode === 'internal' && formData.sourceId && formData.motherPlantCount > sourceAvailableCount) {
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

    // 后端 mother_plant_count 字段（仅 1:多 模式才校验 > 0）
    const motherCountForBackend = isOneToMany ? finalInitialCount : 0;

    // 构建育苗数据
    const seedlingData: Record<string, unknown> = {
      seedlingCode: formData.seedlingCode,
      sourceId: formData.sourceId,         // 关联种源 DB 主键（后端 source_id 字段）；外部种源时为空
      sourceCode: sourceMode === 'internal' ? sourceCode : externalSeedCode,
      cropName: formData.cropName,
      cropVariety: formData.cropVariety,
      cropCode: formData.selectedCropCode,
      seedlingType: finalSeedlingType,
      siteId: formData.siteId,
      siteName,
      startDate: formData.startDate,
      expectedEndDate: formData.expectedEndDate || undefined,
      initialCount: finalInitialCount,
      survivalCount: 0,
      plantedCount: 0,
      survivalRate: 0,
      lossCount: 0,
      lossRate: 0,
      isFinished: false,
      status: SeedlingStatus.IN_PROGRESS,
      dailyRecords: [],
      pictures: pictures,
      printCount: 0,
      remarks: formData.remarks,
      createBy: localStorage.getItem('username') || '未知用户',
      planType: formData.planType,
      targetSurvivalRate: formData.targetSurvivalRate,
      targetSurvivalCount: targetSurvivalCount,
      chargePerson: formData.chargePerson || undefined,
      productionPlanCode: formData.productionPlanId || undefined,
      workHours: formData.workHours || undefined,
      calculateMode: formData.calculateMode,
      propagationMultiple: formData.calculateMode === SeedlingCalculateMode.PROPAGATION
        ? (formData.propagationMultiple === 0 ? formData.customMultiple : formData.propagationMultiple)
        : undefined,
      theoreticalYield: formData.calculateMode === SeedlingCalculateMode.PROPAGATION ? theoreticalYield : undefined,
      // 外部种源信息
      sourceMode,
      externalSeedCode: sourceMode === 'external' ? externalSeedCode : undefined,
      externalSeedName: sourceMode === 'external' ? externalSeedName : undefined,
      externalSeedQuantity: sourceMode === 'external' ? externalSeedQuantity : undefined,
      externalSeedNote: sourceMode === 'external' ? externalSeedNote : undefined,
      // 2026-06-14: 繁殖模式（建档后锁定）
      propagationMode: formData.propagationMode,
      motherPlantCount: motherCountForBackend,  // 映射到后端 mother_plant_count
      expandedPlantCount: 0,
      scionCount: formData.propagationScionCount,
    };

    // 保存育苗数据（内部种源：原子操作扣减 + 创建；外部种源：直接创建）
    let addedSeedlingId: string | null = null;
    try {
      if (sourceMode === 'internal' && formData.sourceId) {
        // 2026-06-14: 扣种源数量 = finalInitialCount（已统一按模式选取真实输入值）
        const deductCount = finalInitialCount;
        // V2.1: 使用 /with-deduct 原子端点，替代 addItem + decreaseAvailableCount 两步调用
        const { addSeedlingWithDeduct } = await import('../../../../services/apiSeedlingService');
        const result = await addSeedlingWithDeduct({
          sourceId: formData.sourceId,
          count: deductCount,
          seedling: seedlingData,
        });
        addedSeedlingId = result.id;
      } else if (sourceMode === 'external') {
        // 外部种源：直接创建育苗记录，不扣减种源
        const addedSeedling = await useSeedlingStore.getState().addItem(seedlingData);
        addedSeedlingId = addedSeedling?.id || null;
      } else {
        const addedSeedling = await useSeedlingStore.getState().addItem(seedlingData);
        addedSeedlingId = addedSeedling?.id || null;
      }
    } catch (error) {
      // 2026-06-14: 透出真正的错误信息（后端校验失败、种源余量不足等）
      const msg = error instanceof Error ? error.message : String(error);
      await showAlert(`保存失败：${msg}`);
      return;
    }

    // 创建草稿任务（供任务中心分派执行人）
    if (addedSeedlingId) {
      const workContent = `作物品种：${formData.cropVariety || formData.cropName}
育苗方式：${formData.seedlingType}
初始数量：${formData.initialCount}株
目标成活率：${formData.targetSurvivalRate}%
目标成活数量：${targetSurvivalCount}株
${formData.calculateMode === SeedlingCalculateMode.PROPAGATION ? `扩繁模式：母株${formData.motherPlantCount}株 × ${formData.propagationMultiple === 0 ? formData.customMultiple : formData.propagationMultiple}倍` : ''}`;

      tasksHook.createTask({
        title: `【育苗】${formData.cropName}-${formData.seedlingCode}`,
        type: 'seedling',
        typeName: '育苗任务',
        sourceType: 'dispatch',
        sourceId: addedSeedlingId,
        sourceCode: formData.seedlingCode,
        remarks: workContent,
        siteName: siteName,
        startDate: formData.startDate,
        endDate: formData.expectedEndDate,
        initialCount: formData.initialCount,
        targetSurvivalCount: targetSurvivalCount,
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

    // V3.1 补录申请：如果勾选了补录，创建审批记录
    if (formData.isSupplementary) {
      const approvalCode = `YM-SUP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
      const approval = {
        id: 'APPROVAL-' + Date.now(),
        code: approvalCode,
        type: ApprovalType.SEEDLING_SUPPLEMENTARY,
        title: `育苗补录申请 - ${formData.seedlingCode}`,
        description: `育苗补录申请：${formData.cropName}，初始数量：${formData.initialCount}株，育苗区域：${siteName}，补录原因：${formData.supplementaryReason}`,
        status: ApprovalStatus.PENDING,
        applicantId: currentUser.id,
        applicantName: currentUser.name,
        applicantDept: currentUser.department || '生产部',
        createTime: new Date().toLocaleString('zh-CN'),
        updateTime: new Date().toLocaleString('zh-CN'),
        steps: [
          {
            id: 'STEP-001',
            name: '生产主管',
            status: 'pending' as const,
            order: 1,
          },
          {
            id: 'STEP-002',
            name: '基地负责人',
            status: 'pending' as const,
            order: 2,
          },
        ],
        currentStep: 1,
        businessLink: {
          type: 'seedling' as const,
          requestCode: formData.seedlingCode,
          requestId: addedSeedlingId || '',
        },
        supplementaryData: {
          reason: formData.supplementaryReason,
          quantity: formData.initialCount,
          cropName: formData.cropName,
          siteName: siteName,
        },
      };
      addApproval(approval);
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
      // 供应商为空时显示"无"
      const supplierName = source.supplierName?.trim() || '无';

      // 2026-06-12: 一致性校验 — 选种源后,若已选生产计划不匹配则清空
      // 2026-06-14: 修复字段错配 — 计划用 variety（品种名）对比，不是 cropName（作物名）
      const currentPlanId = formData.productionPlanId;
      let shouldClearPlan = false;
      let mismatchPlan: { batchCode: string; variety: string } | null = null;
      if (currentPlanId) {
        const plan = availableProductionPlans.find(p => p.batchCode === currentPlanId);
        if (plan && plan.variety !== source.cropName) {
          shouldClearPlan = true;
          mismatchPlan = { batchCode: plan.batchCode, variety: plan.variety };
        }
      }

      setFormData({
        ...formData,
        sourceId,
        sourceCode: source.seedCode,
        sourceType: sourceTypeLabel,
        supplierName: supplierName,
        selectedCropCode: source.cropCode || '',
        cropName: source.cropName || '',
        cropVariety: source.cropVariety || '',
        // 一致性:清空不匹配的生产计划
        productionPlanId: shouldClearPlan ? '' : formData.productionPlanId,
      });

      if (shouldClearPlan && mismatchPlan) {
        showAlert(`已选生产计划 [${mismatchPlan.batchCode}] 品种为 ${mismatchPlan.variety}，与新种源 ${source.cropName} 不一致,已自动清空关联计划。`);
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
      showFooter={true}
      onSubmit={handleSubmit}
      submitText="保存"
      cancelText="取消"
    >
      <div className="space-y-6">
        {/* ========== 2026-06-14: 繁殖模式选择（建档后锁定） ========== */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-semibold text-indigo-900">
              繁殖模式 <span className="text-red-500">*</span>
              <span className="text-xs text-gray-500 ml-2 font-normal">建档后不可修改，决定数量字段语义</span>
            </h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
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
                  <div className="text-sm font-medium text-gray-900">{m.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{m.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>


        {/* ========== 育苗批次号（最顶层） ========== */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-purple-900">育苗批次号</h3>
          </div>
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
                  // 2026-06-14: 修复字段错配 — 计划用 variety（品种名）对比种源 cropName
                  let shouldClearSource = false;
                  let mismatchSource: { seedCode: string; cropName: string } | null = null;
                  if (nextId && formData.sourceId) {
                    const plan = availableProductionPlans.find(p => p.batchCode === nextId);
                    if (plan) {
                      const source = seedSources.find(s => s.id === formData.sourceId);
                      if (source && source.cropName !== plan.variety) {
                        shouldClearSource = true;
                        mismatchSource = { seedCode: source.seedCode, cropName: source.cropName };
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
                    supplierName: shouldClearSource ? '' : formData.supplierName,
                  });

                  if (shouldClearSource && mismatchSource) {
                    showAlert(`已选种源 [${mismatchSource.seedCode}] 为 ${mismatchSource.cropName}，与新生产计划不匹配,已自动清空关联种源。`);
                  }
                }}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="不关联（独立批次）" />
                </SelectTrigger>
                <SelectContent>
                  {/* 固定"不关联"选项 — 2026-06-12 修复：之前漏写在 SelectContent 里 */}
                  <SelectItem value="__none__">不关联（独立批次）</SelectItem>
                  {/* 2026-06-12: 联动过滤 — 选了种源后只显示同 cropName 的计划 */}
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

        {/* ========== 关联种源信息区 ========== */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">关联种源信息</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3">种源必须先在种源管理中录入</p>
          {/* 种源来源类型切换 */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={sourceMode === 'internal' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => { setSourceMode('internal'); setFormData(prev => ({ ...prev, sourceId: '', sourceCode: '', sourceType: '', supplierName: '' })); }}
            >
              内部种源
            </Button>
            <Button
              variant={sourceMode === 'external' ? 'default' : 'secondary'}
              size="sm"
              onClick={() => setSourceMode('external')}
            >
              外部种源
            </Button>
          </div>

          {sourceMode === 'internal' ? (
            /* 内部种源：combogrid 种源选择器 */
            <div className="grid grid-cols-2 gap-4">
              {/* 关联种源 - 方案2.7: combogrid下拉表格替代Select */}
              <div>
                <Label className="text-gray-900">
                  关联种源 <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type="text"
                    value={sourcePopoverOpen ? sourceSearch : selectedSourceLabel}
                    placeholder="搜索种源批号或作物名称..."
                    onFocus={() => {
                      setSourcePopoverOpen(true);
                      setSourceSearch('');
                    }}
                    onChange={(e) => {
                      setSourceSearch(e.target.value);
                      setSourcePopoverOpen(true);
                    }}
                    className={deepInputClass}
                  />
                  {/* 清除按钮 */}
                  {formData.sourceId && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, sourceId: '', sourceCode: '', sourceType: '', supplierName: '' }));
                        setSourceSearch('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                  {/* 下拉表格 Popover */}
                  {sourcePopoverOpen && (
                    <div ref={sourcePopoverRef} className="absolute z-50 mt-1 w-full bg-white border border-gray-400 rounded-lg shadow-lg max-h-64 overflow-hidden"
                      style={{ minWidth: '500px', left: 0 }}
                    >
                      {/* 表头 */}
                      <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
                        <div>作物名称</div>
                        <div>种源批号</div>
                        <div>采购数量</div>
                        <div>可用数量</div>
                      </div>
                      {/* 表格行 */}
                      <div className="overflow-y-auto max-h-48">
                        {filteredSeedSources.length === 0 ? (
                          <div className="px-3 py-4 text-sm text-gray-500 text-center space-y-2">
                            <div>
                              {productionPlanVarietyFilterFromPlan
                                ? `所选生产计划 [${productionPlanVarietyFilterFromPlan}] 暂无对应种源`
                                : '未找到匹配的种源'}
                            </div>
                            <div className="text-xs text-gray-400">请前往「种源管理」添加种源后，再返回此处选择</div>
                            <Button
                              type="button"
                              variant="default"
                              size="sm"
                              onClick={() => navigate('/crop/seed-source')}
                            >
                              去种源管理添加
                            </Button>
                          </div>
                        ) : (
                          filteredSeedSources.map(s => (
                            <div
                              key={s.id}
                              onClick={() => {
                                handleSourceChange(s.id);
                                setSourcePopoverOpen(false);
                                setSourceSearch('');
                              }}
                              className={`grid grid-cols-4 gap-2 px-3 py-2 text-sm border-b border-gray-100 cursor-pointer hover:bg-emerald-50 transition-colors
                                ${formData.sourceId === s.id ? 'bg-emerald-100' : ''}`}
                            >
                              <div className="truncate font-medium text-gray-800">{s.cropName}</div>
                              <div className="truncate text-emerald-700">{s.seedCode}</div>
                              <div className="text-gray-600">{s.quantity} {s.unit}</div>
                              <div className={`font-medium ${s.availableCount <= 0 ? 'text-red-500' : s.availableCount < 10 ? 'text-amber-500' : 'text-gray-700'}`}>
                                {s.availableCount} {s.unit}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                      {/* 底部提示 */}
                      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
                        共 {filteredSeedSources.length} 条 | 点击行选择 | 点击外部关闭
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 来源类型（只读自动带入） */}
              <div>
                <Label className="text-gray-700">来源类型</Label>
                <Input
                  type="text"
                  value={formData.sourceType || '请先选择种源'}
                  readOnly
                  className={`${deepInputClass} bg-gray-100 text-gray-600`}
                />
              </div>

              {/* 供应商（只读自动带入） */}
              <div>
                <Label className="text-gray-700">供应商</Label>
                <Input
                  type="text"
                  value={formData.supplierName || '请先选择种源'}
                  readOnly
                  className={`${deepInputClass} bg-gray-100 text-gray-600`}
                />
              </div>

              {/* 作物品种：与种源列表"作物品种"列一致，仅显示最终品种名（由种源自动带入） */}
              <div>
                <Label className="text-gray-900">
                  作物品种 <span className="text-red-500">*</span>
                </Label>
                <div className={`${deepInputClass} bg-gray-100 text-gray-600 flex items-center min-h-[46px]`}>
                  {formData.cropVariety ? (
                    <span>{formData.cropVariety}</span>
                  ) : (
                    <span className="text-gray-400">请先选择种源</span>
                  )}
                </div>
              </div>

              {/* 品种路径：与种源列表/育苗列表"品种路径"列 4 段格式保持一致 */}
              <div className="col-span-2">
                <Label className="text-gray-700">品种路径</Label>
                <div className={`${deepInputClass} bg-gray-100 text-gray-600 flex items-center gap-1 flex-wrap min-h-[46px]`}>
                  {fullVarietyPath ? (
                    <>
                      <span className="text-gray-400">{fullVarietyPath.categoryName}</span>
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-700">{fullVarietyPath.typeName}</span>
                      <span className="text-gray-400">-</span>
                      <span className="text-gray-700">{fullVarietyPath.varietyName}</span>
                      {fullVarietyPath.subVariety1Name && (
                        <>
                          <span className="text-gray-400">-</span>
                          <span className="text-gray-900 font-medium">{fullVarietyPath.subVariety1Name}</span>
                        </>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">请先选择种源</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* 外部种源：手动录入 */
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-900">外部种源批号</Label>
                <Input type="text" value={externalSeedCode} onChange={(e) => setExternalSeedCode(e.target.value)}
                  className={deepInputClass} placeholder="如：EXT-2026-001" />
              </div>
              <div>
                <Label className="text-gray-900">种源名称</Label>
                <Input type="text" value={externalSeedName} onChange={(e) => setExternalSeedName(e.target.value)}
                  className={deepInputClass} placeholder="如：红富士自留种" />
              </div>
              <div>
                <Label className="text-gray-900">数量</Label>
                <Input type="number" min={0} value={externalSeedQuantity || ''} onChange={(e) => setExternalSeedQuantity(Number(e.target.value))}
                  className={deepInputClass} placeholder="外部种源数量" />
              </div>
              <div>
                <Label className="text-gray-900">来源说明</Label>
                <Input type="text" value={externalSeedNote} onChange={(e) => setExternalSeedNote(e.target.value)}
                  className={deepInputClass} placeholder="如：本地农资店购买" />
              </div>
            </div>
          )}
        </div>

        {/* ========== 数量与品质区（2026-06-16: 移到批次号上方） ========== */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-900">数量与品质</h3>
          </div>

          {/* 2026-06-16: 育苗计算模式取消 UI 选择（propagationMode 自动联动，避免前后矛盾）
              字段保留在 state 中（calculateMode）以兼容 EditModal/apiSeedlingService/历史数据 */}

          {/* 单株育苗模式 */}
          {formData.calculateMode === SeedlingCalculateMode.SINGLE && (
            <div className="grid grid-cols-2 gap-4">
              {/* 2026-06-15: 数量体系重构 — 1:多 模式显示母株数量输入框 */}
              {formData.propagationMode === 'one_to_many' ? (
                /* 1:多 模式：母株数量 */
                <div>
                  <Label className="text-gray-900">
                    母株数量 <span className="text-red-500">*</span>
                    <span className="text-xs text-gray-500 ml-2">（匍匐茎/组培/扦插/分株）</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.motherPlantCount || ''}
                    onChange={(e) => setFormData({ ...formData, motherPlantCount: Number(e.target.value) })}
                    className={`${deepInputClass} ${motherCountExceeds ? 'border-red-500 ring-1 ring-red-300' : ''}`}
                    placeholder="请输入母株数量（>0）"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    子苗通过每日记录"新出苗数"累加；母株可继续产苗或一次性分出
                  </p>
                </div>
              ) : (
                /* 1:1 模式：初始数量 */
                <div>
                  <Label className="text-gray-900">
                    初始数量 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.initialCount || ''}
                    onChange={(e) => setFormData({ ...formData, initialCount: Number(e.target.value) })}
                    className={`${deepInputClass} ${initialCountExceeds ? 'border-red-500 ring-1 ring-red-300' : ''}`}
                    placeholder={formData.propagationMode === 'division' ? '分株出的苗数' : '请输入播种数量'}
                  />
                  {initialCountExceeds && (
                    <p className="text-xs text-red-500 mt-1">
                      超过种源可用数量（{sourceAvailableCount}）
                    </p>
                  )}
                </div>
              )}

              {/* 目标成苗率 */}
              <div>
                <Label className="text-gray-900">
                  目标成苗率（%）<span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.targetSurvivalRate || ''}
                  onChange={(e) => setFormData({ ...formData, targetSurvivalRate: Number(e.target.value) })}
                  onBlur={(e) => {
                    const val = Number(e.target.value);
                    if (!isNaN(val) && val > 0) {
                      setFormData({ ...formData, targetSurvivalRate: Math.round(val * 100) / 100 });
                    }
                  }}
                  className={deepInputClass}
                  placeholder="0-100%"
                  step="0.01"
                />
              </div>

              {/* 目标成苗数（自动计算） */}
              <div>
                <Label className="text-gray-700">目标成苗数</Label>
                <Input
                  type="text"
                  value={targetSurvivalCount > 0 ? targetSurvivalCount.toLocaleString() : '—'}
                  readOnly
                  className={`${deepInputClass} bg-gray-100 text-gray-600 font-mono`}
                />
                <p className="text-xs text-gray-500 mt-1">初始数量 × 目标成苗率</p>
              </div>

              {/* 负责人（与目标成苗数配对，2 个一排） */}
              <div>
                <Label className="text-gray-900">负责人</Label>
                <Select
                  value={formData.chargePerson}
                  onValueChange={(val) => setFormData({ ...formData, chargePerson: val })}
                >
                  <SelectTrigger className={deepInputClass}>
                    <SelectValue placeholder="请选择" />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map(op => (
                      <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* 扩繁育苗模式 */}
          {formData.calculateMode === SeedlingCalculateMode.PROPAGATION && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 母株数量 */}
                <div>
                  <Label className="text-gray-900">
                    母株数量 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.motherPlantCount || ''}
                    onChange={(e) => setFormData({ ...formData, motherPlantCount: Number(e.target.value) })}
                    className={`${deepInputClass} ${motherCountExceeds ? 'border-red-500 ring-1 ring-red-300' : ''}`}
                    placeholder="投入的基础种苗数量"
                  />
                  {motherCountExceeds && (
                    <p className="text-xs text-red-500 mt-1">
                      超过种源可用数量（{sourceAvailableCount}）
                    </p>
                  )}
                </div>

                {/* 扩繁倍数 */}
                <div>
                  <Label className="text-gray-900">
                    扩繁倍数 <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={String(formData.propagationMultiple)}
                    onValueChange={(val) => handlePropagationMultipleChange(Number(val))}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="请选择扩繁倍数" />
                    </SelectTrigger>
                    <SelectContent>
                      {propagationMultiples.map(p => (
                        <SelectItem key={p.value} value={String(p.value)}>{p.label} - {p.description}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 自定义扩繁倍数输入（当选择"其他"时显示） */}
              {formData.propagationMultiple === 0 && (
                <div>
                  <Label className="text-gray-900">
                    自定义扩繁倍数 <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    value={formData.customMultiple || ''}
                    onChange={(e) => setFormData({ ...formData, customMultiple: Number(e.target.value) })}
                    className={deepInputClass}
                    placeholder="请输入扩繁倍数"
                  />
                </div>
              )}

              {/* 理论产量（自动计算） */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">理论产量</Label>
                  <Input
                    type="text"
                    value={theoreticalYield > 0 ? theoreticalYield.toLocaleString() : '—'}
                    readOnly
                    className={`${deepInputClass} bg-gray-100 text-gray-600 font-mono`}
                  />
                  <p className="text-xs text-gray-500 mt-1">母株数量 × 扩繁倍数</p>
                </div>

                {/* 目标成苗率 */}
                <div>
                  <Label className="text-gray-900">
                    目标成苗率（%）<span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.targetSurvivalRate || ''}
                    onChange={(e) => setFormData({ ...formData, targetSurvivalRate: Number(e.target.value) })}
                    className={deepInputClass}
                    placeholder="0-100%"
                  step="0.01"
                  />
                </div>
              </div>

              {/* 目标成苗数（自动计算） */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-700">目标成苗数</Label>
                  <Input
                    type="text"
                    value={targetSurvivalCount > 0 ? targetSurvivalCount.toLocaleString() : '—'}
                    readOnly
                    className={`${deepInputClass} bg-gray-100 text-gray-600 font-mono`}
                  />
                  <p className="text-xs text-gray-500 mt-1">理论产量 × 目标成苗率</p>
                </div>

                {/* 负责人（与目标成苗数配对，2 个一排） */}
                <div>
                  <Label className="text-gray-900">负责人</Label>
                  <Select
                    value={formData.chargePerson}
                    onValueChange={(val) => setFormData({ ...formData, chargePerson: val })}
                  >
                    <SelectTrigger className={deepInputClass}>
                      <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATORS.map(op => (
                        <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* 2026-06-16: 负责人已迁移到"数量与品质"区与目标成苗数配对 */}
        </div>
        {/* ========== 场地与计划区 ========== */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-emerald-900">场地与计划</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* 育苗区域 */}
            <div>
              <Label className="text-gray-900">
                育苗区域 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.siteId}
                onValueChange={(val) => handleSiteChange(val)}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 育苗方式 */}
            <div>
              <Label className="text-gray-900">
                育苗方式 <span className="text-red-500">*</span>
              </Label>
              <DictSelect
                category="seedling_type"
                value={formData.seedlingType}
                onChange={(value) => handleSeedlingTypeChange(value)}
                placeholder="请选择育苗方式"
              />
            </div>

            {/* 其他育苗方式输入框（占满整行） */}
            {formData.seedlingType === '其他' && (
              <div className="col-span-2">
                <Label className="text-gray-900">
                  其他方式说明 <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="text"
                  value={formData.seedlingTypeOther}
                  onChange={(e) => setFormData({ ...formData, seedlingTypeOther: e.target.value })}
                  className={deepInputClass}
                  placeholder="请输入具体的育苗方式"
                />
              </div>
            )}

            {/* 计划类型 */}
            <div>
              <Label className="text-gray-900">
                计划类型 <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.planType}
                onValueChange={(val) => setFormData({ ...formData, planType: val as SeedlingPlanType })}
              >
                <SelectTrigger className={deepInputClass}>
                  <SelectValue placeholder="请选择计划类型" />
                </SelectTrigger>
                <SelectContent>
                  {seedlingPlanTypes.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 开始日期 */}
            <div>
              <Label className="text-gray-900">
                开始日期 <span className="text-red-500">*</span>
              </Label>
              <DatePicker className="w-full"
                selected={formData.startDate ? new Date(formData.startDate) : undefined}
                onChange={(date) => setFormData({ ...formData, startDate: todayLocal(date) })}
              />
            </div>

            {/* 预计结束日期 */}
            <div>
              <Label className="text-gray-900">预计结束日期</Label>
              <DatePicker className="w-full"
                selected={formData.expectedEndDate ? new Date(formData.expectedEndDate) : undefined}
                onChange={(date) => setFormData({ ...formData, expectedEndDate: todayLocal(date) })}
              />
            </div>

            {/* 育苗周期（自动计算） */}
            <div>
              <Label className="text-gray-700">育苗周期（天）</Label>
              <Input
                type="text"
                value={seedlingCycle > 0 ? `${seedlingCycle}天` : '请选择日期'}
                readOnly
                className={`${deepInputClass} bg-gray-100 text-gray-600`}
              />
            </div>

            {/* 方案2.6: 育苗工时（整行独占，2 个一排规则例外） */}
            <div className="col-span-2">
              <Label className="text-gray-900">工时（小时）</Label>
              <Input
                type="number"
                value={formData.workHours || ''}
                onChange={(e) => setFormData({ ...formData, workHours: Number(e.target.value) || 0 })}
                className={deepInputClass}
                placeholder="请输入育苗工时（预估执行时间）"
                min="0"
                step="0.5"
              />
              <p className="text-xs text-gray-500 mt-1">预估本次育苗的执行工时</p>
            </div>
          </div>
        </div>


        {/* ========== 备注与附件区 ========== */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="w-4 h-4 text-gray-600" />
            <h3 className="text-sm font-semibold text-gray-900">备注与附件</h3>
          </div>
          <div className="space-y-4">
            {/* 备注 */}
            <div>
              <Label className="text-gray-900">备注</Label>
              <TextArea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="请输入备注信息"
              />
            </div>

            {/* V3.1 补录字段 */}
            <div>
              <Label className="text-gray-900">是否补录</Label>
              <DictSelect
                category="is_supplementary"
                value={formData.isSupplementary ? 'yes' : 'no'}
                onChange={(value) => setFormData({ ...formData, isSupplementary: value === 'yes' })}
                placeholder="选择是否补录"
              />
              <p className="mt-1 text-xs text-amber-500">选择"是"时，该育苗记录将提交审批审核</p>
            </div>

            {/* V3.1 补录原因 */}
            {formData.isSupplementary && (
              <div>
                <Label className="text-gray-900">
                  补录原因 <span className="text-red-500">*</span>
                </Label>
                <TextArea
                  value={formData.supplementaryReason}
                  onChange={(e) => setFormData({ ...formData, supplementaryReason: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                  placeholder="请输入补录原因，说明为什么需要补录此育苗记录"
                />
              </div>
            )}

            {/* 图片上传 */}
            <div>
              <Label className="text-gray-900">图片上传</Label>
              <div className="border-2 border-dashed border-gray-400 rounded-lg p-4">
                {/* 已上传的图片预览 */}
                {pictures.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {pictures.map((pic, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={pic}
                          alt={`预览${index + 1}`}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setPictures(pictures.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                {/* 上传按钮 */}
                <Label className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 rounded-lg py-4">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">点击上传图片</span>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files) {
                        Array.from(files).forEach(file => {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const result = event.target?.result as string;
                            setPictures([...pictures, result]);
                          };
                          reader.readAsDataURL(file);
                        });
                      }
                      e.target.value = '';
                    }}
                  />
                </Label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
