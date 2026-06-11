/**
 * 生产计划表单 Hook
 * C5 阶段 2 拆分：从 useProductionPage.ts 抽出
 *
 * 负责：表单状态变更、验证、重置、生成批次编号
 */
import { useCallback } from 'react';
import * as apiProductionPlanService from '../../../services/apiProductionPlanService';
import { showAlert } from '@/lib/dialogService';
import { getInitialFormData } from './initialFormData';
import type { ProductionFormData } from './types';

interface UseProductionFormParams {
  formData: ProductionFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProductionFormData>>;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function useProductionForm({
  formData,
  setFormData,
  setErrors,
}: UseProductionFormParams) {
  const handleFormChange = useCallback((field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, [setFormData]);

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};
    if (!formData.batchCode.trim()) newErrors.batchCode = '请输入批次编号';
    if (!formData.cropName) newErrors.cropName = '请选择作物';
    if (!formData.variety.trim()) newErrors.variety = '请输入品种';
    if (formData.greenhouseId.length === 0) newErrors.greenhouseId = '请选择区域';
    if (!formData.startDate) newErrors.startDate = '请选择定植日期';
    if (!formData.expectedHarvestDate) newErrors.expectedHarvestDate = '请选择预计采收日期';
    if (!formData.targetYield) newErrors.targetYield = '请输入目标产量';
    if (formData.plantingMode.length === 0) newErrors.plantingMode = '请选择种植模式';
    if (!formData.responsiblePerson) newErrors.responsiblePerson = '请选择负责人';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, setErrors]);

  const resetForm = useCallback(() => {
    setFormData(getInitialFormData());
  }, [setFormData]);

  // H-03: 改用后端 service 生成编码（之前 batches.length+1 会导致编号重复）
  const generateBatchCode = useCallback(async () => {
    try {
      const code = await apiProductionPlanService.generateProductionPlanCode(formData.planType as string);
      if (code) {
        setFormData((prev) => ({ ...prev, batchCode: code }));
      }
    } catch (error) {
      console.error('[ProductionPlan] 生成批次编号失败:', error);
      await showAlert('生成批次编号失败，请重试');
    }
  }, [formData.planType, setFormData]);

  return {
    handleFormChange,
    validateForm,
    resetForm,
    generateBatchCode,
  };
}
