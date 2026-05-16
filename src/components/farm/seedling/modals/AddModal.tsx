/**
 * 育苗新增弹窗 - 重新规划版本
 * 三区段式布局：关联种源信息 | 场地与计划 | 数量与品质
 * V3.1: 支持补录申请功能
 */

import React, { useState, useMemo, useEffect } from 'react';
import { UnifiedModal } from '../../../ui/UnifiedModal';
import { X, Upload, Link2, MapPin, BarChart3, FileText, RefreshCw } from 'lucide-react';
import { SeedSource, SeedlingStatus, SeedlingPlanType, SeedlingCalculateMode } from '../../../../types/crop';
import { generateSeedlingCodeByDate } from '../../../../services/seedlingService';
import { decreaseAvailableCount, getSeedSourceById } from '../../../../services/apiSeedSourceService';
import * as cropInstanceService from '../../../../services/apiCropInstanceService';
import CropCodeSelector from '../../common/CropCodeSelector';
import { CropVarietyOption } from '../../../../types/cropVariety';
import { useDictionaryStore, getDictItems, useProductionPlanStore, useUserStore, useSeedlingStore } from '../../../../stores';
import { useTasks } from '../../../../hooks/useTasks';
import { PlanType } from '../../../../types';
import { useApprovalContext } from '../../../../contexts/ApprovalContext';
import { ApprovalType, ApprovalStatus } from '../../../../types/approval';
import { DictSelect } from '../../../common/settings/DictSelect';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  seedSources: SeedSource[];
  cropVarietyOptions: CropVarietyOption[];
  seedlingTypes: Array<{ value: string; label: string }>;
  sites: Array<{ value: string; label: string }>;
}

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

  const [formData, setFormData] = useState({
    sourceId: '',
    sourceCode: '',
    sourceType: '',           // 来源类型（自动带入）
    supplierName: '',        // 供应商（自动带入）
    selectedCropCode: '',
    cropName: '',
    cropVariety: '',
    seedlingType: '',
    seedlingTypeOther: '',   // 当选择"其他"时的自定义输入
    siteId: '',
    siteName: '',
    seedlingCode: '',        // 育苗批次号（可手动编辑）
    productionPlanId: '',    // 关联生产计划批次号
    startDate: '',
    expectedEndDate: '',
    initialCount: 0,
    targetSurvivalRate: 90,  // 目标成苗率默认值90%（可手动输入0-100）
    planType: SeedlingPlanType.ROUTINE, // 计划类型默认常规
    chargePerson: '',         // 负责人
    remarks: '',
    // 扩繁计算模式
    calculateMode: SeedlingCalculateMode.SINGLE,  // 计算模式：单株育苗/扩繁育苗
    motherPlantCount: 0,       // 母株数量（扩繁模式用）
    propagationMultiple: 0,   // 扩繁倍数（扩繁模式用）
    customMultiple: 0,        // 自定义扩繁倍数
    theoreticalYield: 0,        // 理论产量（扩繁模式用）
    // V3.1 补录相关字段
    isSupplementary: false,  // 是否补录
    supplementaryReason: '',  // 补录原因
  });

  // 图片上传状态
  const [pictures, setPictures] = useState<string[]>([]);

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
  const handleGenerateSeedlingCode = () => {
    const today = new Date();
    const code = generateSeedlingCodeByDate(today);
    setFormData({ ...formData, seedlingCode: code });
  };

  // 从Store获取生产计划和当前用户
  const storePlans = useProductionPlanStore((s) => s.plans);
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
    // 基本信息验证
    if (!formData.sourceId || !formData.selectedCropCode || !formData.siteId) {
      alert('请填写完整信息：关联种源、作物品种、育苗区域为必填项');
      return;
    }

    if (!formData.seedlingCode) {
      alert('请先生成育苗批次号');
      return;
    }

    // 单株育苗模式验证
    if (formData.calculateMode === SeedlingCalculateMode.SINGLE) {
      if (!formData.initialCount || formData.initialCount <= 0) {
        alert('请输入初始数量');
        return;
      }
    }

    // 扩繁育苗模式验证
    if (formData.calculateMode === SeedlingCalculateMode.PROPAGATION) {
      if (!formData.motherPlantCount || formData.motherPlantCount <= 0) {
        alert('请输入母株数量');
        return;
      }
      if (formData.propagationMultiple === 0) {
        if (!formData.customMultiple || formData.customMultiple <= 0) {
          alert('请输入扩繁倍数');
          return;
        }
      }
    }

    // 处理"其他"选项
    const finalSeedlingType = formData.seedlingType === '其他'
      ? formData.seedlingTypeOther
      : formData.seedlingType;

    if (formData.seedlingType === '其他' && !formData.seedlingTypeOther.trim()) {
      alert('请输入其他育苗方式的具体描述');
      return;
    }

    // 获取场地名称
    const site = sites.find(s => s.value === formData.siteId);
    const siteName = site?.label || '';

    // 获取种源批号
    const source = seedSources.find(s => s.id === formData.sourceId);
    const sourceCode = source?.seedCode || '';

    // 构建育苗数据
    const seedlingData = {
      seedlingCode: formData.seedlingCode,
      sourceCode,
      cropName: formData.cropName,
      cropVariety: formData.cropVariety,
      cropCode: formData.selectedCropCode,
      seedlingType: finalSeedlingType,
      siteId: formData.siteId,
      siteName,
      startDate: formData.startDate,
      expectedEndDate: formData.expectedEndDate || undefined,
      initialCount: formData.initialCount,
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
      calculateMode: formData.calculateMode,
      motherPlantCount: formData.calculateMode === SeedlingCalculateMode.PROPAGATION ? formData.motherPlantCount : undefined,
      propagationMultiple: formData.calculateMode === SeedlingCalculateMode.PROPAGATION
        ? (formData.propagationMultiple === 0 ? formData.customMultiple : formData.propagationMultiple)
        : undefined,
      theoreticalYield: formData.calculateMode === SeedlingCalculateMode.PROPAGATION ? theoreticalYield : undefined
    };

    // 保存育苗数据
    let addedSeedling;
    try {
      addedSeedling = await useSeedlingStore.getState().addItem(seedlingData);
    } catch (error) {
      console.error('保存育苗记录失败:', error);
      alert('保存失败，请重试');
      return;
    }

    // 创建草稿任务（供任务中心分派执行人）
    if (addedSeedling?.id) {
      // 构建详细的工作内容描述
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
        sourceId: addedSeedling.id,  // 关联育苗ID
        sourceCode: formData.seedlingCode,  // 育苗批号（来源编号）
        remarks: workContent,
        siteName: siteName,
        startDate: formData.startDate,
        endDate: formData.expectedEndDate,
        initialCount: formData.initialCount,
        targetSurvivalCount: targetSurvivalCount,
      }, 'farm', 'draft');
    }

    // 扣减种源可用数量
    // 单株育苗模式：扣减 initialCount
    // 扩繁育苗模式：扣减 motherPlantCount
    const deductCount = formData.calculateMode === SeedlingCalculateMode.PROPAGATION
      ? formData.motherPlantCount
      : formData.initialCount;
    try {
      await decreaseAvailableCount(formData.sourceId, deductCount);
    } catch (error) {
      console.error('扣减种源可用数量失败:', error);
    }

    // 更新作物实例状态为育苗中
    if (source?.instanceId) {
      try {
        await cropInstanceService.updateQuantity(source.instanceId, 'seedling', 0);
      } catch (error) {
        console.error('更新作物实例状态失败:', error);
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
          requestId: addedSeedling?.id || '',
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

      setFormData({
        ...formData,
        sourceId,
        sourceCode: source.seedCode,
        sourceType: sourceTypeLabel,
        supplierName: supplierName,
        selectedCropCode: source.cropCode || '',
        cropName: source.cropName || '',
        cropVariety: source.cropVariety || ''
      });
    }
  };

  // 处理作物品种选择
  const handleCropCodeChange = (cropCode: string, varietyInfo: unknown) => {
    setFormData({
      ...formData,
      selectedCropCode: cropCode,
      cropName: varietyInfo?.varietyName || '',
      cropVariety: varietyInfo?.subVariety1Name || varietyInfo?.varietyName || ''
    });
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
        {/* ========== 育苗批次号（最顶层） ========== */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCw className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-semibold text-purple-900">育苗批次号</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* 育苗批次号 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                育苗批次号 <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.seedlingCode}
                  onChange={(e) => setFormData({ ...formData, seedlingCode: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  placeholder="点击生成获取批次号"
                />
                <button
                  type="button"
                  onClick={handleGenerateSeedlingCode}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-4 h-4" />
                  生成
                </button>
              </div>
            </div>

            {/* 关联生产计划批次号 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                关联生产计划批次号
              </label>
              <select
                value={formData.productionPlanId}
                onChange={(e) => setFormData({ ...formData, productionPlanId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">不关联（独立批次）</option>
                {availableProductionPlans.map(plan => (
                  <option key={plan.id} value={plan.batchCode}>
                    [{plan.planTypeName || '育苗计划'}] {plan.batchCode} - {plan.cropName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ========== 关联种源信息区 ========== */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Link2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-semibold text-blue-900">关联种源信息</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {/* 关联种源 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                关联种源 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.sourceId}
                onChange={(e) => handleSourceChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择</option>
                {Array.isArray(seedSources) && seedSources.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.seedCode} - {s.cropName} ({s.cropVariety})
                  </option>
                ))}
              </select>
            </div>

            {/* 来源类型（只读自动带入） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">来源类型</label>
              <input
                type="text"
                value={formData.sourceType || '请先选择种源'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600"
              />
            </div>

            {/* 供应商（只读自动带入） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
              <input
                type="text"
                value={formData.supplierName || '请先选择种源'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600"
              />
            </div>

            {/* 作物品种选择 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                作物品种 <span className="text-red-500">*</span>
              </label>
              <CropCodeSelector
                value={formData.selectedCropCode}
                onChange={handleCropCodeChange}
                placeholder="搜索或选择作物品种..."
                size="md"
              />
            </div>

            {/* 作物名称（只读显示） */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">作物名称</label>
              <input
                type="text"
                value={formData.cropName ? `${formData.cropName} - ${formData.cropVariety}` : '请选择作物品种'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600"
              />
            </div>
          </div>
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
              <label className="block text-sm font-medium text-gray-900 mb-1">
                育苗区域 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.siteId}
                onChange={(e) => handleSiteChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择</option>
                {sites.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* 育苗方式 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                育苗方式 <span className="text-red-500">*</span>
              </label>
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
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  其他方式说明 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.seedlingTypeOther}
                  onChange={(e) => setFormData({ ...formData, seedlingTypeOther: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="请输入具体的育苗方式"
                />
              </div>
            )}

            {/* 计划类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                计划类型 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.planType}
                onChange={(e) => setFormData({ ...formData, planType: e.target.value as SeedlingPlanType })}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {seedlingPlanTypes.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* 开始日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                开始日期 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 预计结束日期 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">预计结束日期</label>
              <input
                type="date"
                value={formData.expectedEndDate}
                onChange={(e) => setFormData({ ...formData, expectedEndDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* 育苗周期（自动计算） */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">育苗周期（天）</label>
              <input
                type="text"
                value={seedlingCycle > 0 ? `${seedlingCycle}天` : '请选择日期'}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600"
              />
            </div>
          </div>
        </div>

        {/* ========== 数量与品质区 ========== */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-900">数量与品质</h3>
          </div>

          {/* 育苗计算模式切换 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              育苗计算模式 <span className="text-red-500">*</span>
            </label>
            <DictSelect
              category="calculate_mode"
              value={formData.calculateMode}
              onChange={(value) => handleCalculateModeChange(value as SeedlingCalculateMode)}
              placeholder="选择育苗计算模式"
            />
          </div>

          {/* 单株育苗模式 */}
          {formData.calculateMode === SeedlingCalculateMode.SINGLE && (
            <div className="grid grid-cols-2 gap-4">
              {/* 初始数量 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  初始数量 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.initialCount || ''}
                  onChange={(e) => setFormData({ ...formData, initialCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="请输入播种数量"
                />
              </div>

              {/* 目标成苗率 */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  目标成苗率（%）<span className="text-red-500">*</span>
                </label>
                <input
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
                  className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="0-100%"
                  step="0.01"
                />
              </div>

              {/* 目标成苗数（自动计算） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目标成苗数</label>
                <input
                  type="text"
                  value={targetSurvivalCount > 0 ? targetSurvivalCount.toLocaleString() : '—'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600 font-mono"
                />
              </div>
            </div>
          )}

          {/* 扩繁育苗模式 */}
          {formData.calculateMode === SeedlingCalculateMode.PROPAGATION && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* 母株数量 */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    母株数量 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.motherPlantCount || ''}
                    onChange={(e) => setFormData({ ...formData, motherPlantCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="投入的基础种苗数量"
                  />
                </div>

                {/* 扩繁倍数 */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    扩繁倍数 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.propagationMultiple}
                    onChange={(e) => handlePropagationMultipleChange(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value={0}>请选择扩繁倍数</option>
                    {propagationMultiples.map(p => (
                      <option key={p.value} value={p.value}>{p.label} - {p.description}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 自定义扩繁倍数输入（当选择"其他"时显示） */}
              {formData.propagationMultiple === 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    自定义扩繁倍数 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.customMultiple || ''}
                    onChange={(e) => setFormData({ ...formData, customMultiple: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="请输入扩繁倍数"
                  />
                </div>
              )}

              {/* 理论产量（自动计算） */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">理论产量</label>
                  <input
                    type="text"
                    value={theoreticalYield > 0 ? theoreticalYield.toLocaleString() : '—'}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">母株数量 × 扩繁倍数</p>
                </div>

                {/* 目标成苗率 */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">
                    目标成苗率（%）<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.targetSurvivalRate || ''}
                    onChange={(e) => setFormData({ ...formData, targetSurvivalRate: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="0-100%"
                  step="0.01"
                  />
                </div>
              </div>

              {/* 目标成苗数（自动计算） */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目标成苗数</label>
                <input
                  type="text"
                  value={targetSurvivalCount > 0 ? targetSurvivalCount.toLocaleString() : '—'}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-600 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">理论产量 × 目标成苗率</p>
              </div>
            </div>
          )}

          {/* 负责人 */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* 负责人 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">负责人</label>
              <select
                value={formData.chargePerson}
                onChange={(e) => setFormData({ ...formData, chargePerson: e.target.value })}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">请选择</option>
                {OPERATORS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
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
              <label className="block text-sm font-medium text-gray-900 mb-1">备注</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                placeholder="请输入备注信息"
              />
            </div>

            {/* V3.1 补录字段 */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">是否补录</label>
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
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  补录原因 <span className="text-red-500">*</span>
                </label>
                <textarea
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
              <label className="block text-sm font-medium text-gray-900 mb-1">图片上传</label>
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
                        <button
                          type="button"
                          onClick={() => setPictures(pictures.filter((_, i) => i !== index))}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {/* 上传按钮 */}
                <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 rounded-lg py-4">
                  <Upload className="w-8 h-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">点击上传图片</span>
                  <input
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
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </UnifiedModal>
  );
}
