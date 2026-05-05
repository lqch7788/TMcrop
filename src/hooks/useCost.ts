/**
 * 成本核算 Hook
 * 整合 costService API 与成本类别、预算管理
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getMaterialCosts,
  getEnergyCosts,
  getCostStats,
  createMaterialCost,
  updateMaterialCost,
  deleteMaterialCost,
  createEnergyCost,
  updateEnergyCost,
  deleteEnergyCost,
  MaterialCost,
  EnergyCost,
  CostStats,
  CostStatsSummary,
} from '../services/costService';
import {
  CostCategory,
  CostBudget,
  CostCategoryType,
  COST_CATEGORY_TYPE_MAP,
} from '../types/cost';

/**
 * 成本类别 Hook
 */
export function useCostCategories() {
  const [categories, setCategories] = useState<CostCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 从数据字典加载成本类别
  const loadCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 从数据字典 DC022 (material_cost_type) 和 DC021 (energy_type) 加载
      const materialTypes = await loadDictionaryItems('DC022');
      const energyTypes = await loadDictionaryItems('DC021');

      // 转换为成本类别格式
      const materialCategories: CostCategory[] = (materialTypes || []).map((item: Record<string, unknown>, index: number) => ({
        id: `mat-${index + 1}`,
        name: item.label || item.value,
        code: item.value,
        type: 'material' as CostCategoryType,
        unit: '元',
        description: item.label || item.value,
        status: 'active' as const,
      }));

      const energyCategories: CostCategory[] = (energyTypes || []).map((item: Record<string, unknown>, index: number) => ({
        id: `energy-${index + 1}`,
        name: item.label || item.value,
        code: item.value,
        type: 'energy' as CostCategoryType,
        unit: '元/度',
        description: item.label || item.value,
        status: 'active' as const,
      }));

      // 默认成本类别（如果数据字典为空）
      const defaultCategories: CostCategory[] = [
        { id: '1', name: '肥料成本', code: 'COST-MAT-001', type: 'material', unit: '元/吨', description: '各种肥料采购成本', status: 'active' },
        { id: '2', name: '农药成本', code: 'COST-MAT-002', type: 'material', unit: '元/升', description: '农药采购成本', status: 'active' },
        { id: '3', name: '人工成本', code: 'COST-LAB-001', type: 'labor', unit: '元/工时', description: '工人工资和福利', status: 'active' },
        { id: '4', name: '设备折旧', code: 'COST-EQP-001', type: 'equipment', unit: '元/月', description: '设备折旧费用', status: 'active' },
        { id: '5', name: '水电费', code: 'COST-ENR-001', type: 'energy', unit: '元/度', description: '水电能源消耗', status: 'active' },
        { id: '6', name: '其他费用', code: 'COST-OTH-001', type: 'other', unit: '元', description: '其他杂项费用', status: 'active' },
      ];

      setCategories(
        materialCategories.length > 0 || energyCategories.length > 0
          ? [...materialCategories, ...energyCategories]
          : defaultCategories
      );
    } catch (err) {
      console.error('加载成本类别失败:', err);
      setError('加载成本类别失败');
      // 使用默认类别
      setCategories([
        { id: '1', name: '肥料成本', code: 'COST-MAT-001', type: 'material', unit: '元/吨', description: '各种肥料采购成本', status: 'active' },
        { id: '2', name: '农药成本', code: 'COST-MAT-002', type: 'material', unit: '元/升', description: '农药采购成本', status: 'active' },
        { id: '3', name: '人工成本', code: 'COST-LAB-001', type: 'labor', unit: '元/工时', description: '工人工资和福利', status: 'active' },
        { id: '4', name: '设备折旧', code: 'COST-EQP-001', type: 'equipment', unit: '元/月', description: '设备折旧费用', status: 'active' },
        { id: '5', name: '水电费', code: 'COST-ENR-001', type: 'energy', unit: '元/度', description: '水电能源消耗', status: 'active' },
        { id: '6', name: '其他费用', code: 'COST-OTH-001', type: 'other', unit: '元', description: '其他杂项费用', status: 'active' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return { categories, loading, error, reload: loadCategories };
}

/**
 * 成本预算 Hook
 */
export function useCostBudgets(categoryId?: string) {
  const [budgets, setBudgets] = useState<CostBudget[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 从API加载成本统计数据作为预算参考
  const loadBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const stats = await getCostStats({});
      if (stats?.data && stats.summary) {
        // 将成本统计数据转换为预算格式
        const materialBudgets: CostBudget[] = (stats.data.material || []).map((item, index) => ({
          id: `mat-budget-${index + 1}`,
          name: `${item.month} 物料成本`,
          categoryId: `mat-1`, // 物料类别
          amount: item.total_amount * 1.2, // 预算为实际使用的1.2倍
          usedAmount: item.total_amount,
          period: item.month,
          status: 'active' as const,
        }));

        const energyBudgets: CostBudget[] = (stats.data.energy || []).map((item, index) => ({
          id: `energy-budget-${index + 1}`,
          name: `${item.month} 能源成本`,
          categoryId: `energy-1`, // 能源类别
          amount: item.total_amount * 1.2,
          usedAmount: item.total_amount,
          period: item.month,
          status: 'active' as const,
        }));

        setBudgets([...materialBudgets, ...energyBudgets]);
      }
    } catch (err) {
      console.error('加载成本预算失败:', err);
      setError('加载成本预算失败');
      // 使用默认预算
      setBudgets([
        { id: '1', name: '2024年Q1肥料预算', categoryId: '1', amount: 50000, usedAmount: 32000, period: '2024-Q1', status: 'active' },
        { id: '2', name: '2024年Q1农药预算', categoryId: '2', amount: 20000, usedAmount: 15000, period: '2024-Q1', status: 'active' },
        { id: '3', name: '2024年Q1人工预算', categoryId: '3', amount: 80000, usedAmount: 65000, period: '2024-Q1', status: 'active' },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // 按类别筛选
  const filteredBudgets = categoryId
    ? budgets.filter(b => b.categoryId === categoryId)
    : budgets;

  return { budgets: filteredBudgets, allBudgets: budgets, loading, error, reload: loadBudgets };
}

/**
 * 成本统计数据 Hook
 */
export function useCostStats(params?: {
  start_date?: string;
  end_date?: string;
  batch_code?: string;
  cost_type?: 'labor' | 'material' | 'energy' | 'all';
}) {
  const [stats, setStats] = useState<CostStats | null>(null);
  const [summary, setSummary] = useState<CostStatsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCostStats(params);
      setStats(result.data);
      setSummary(result.summary);
    } catch (err) {
      console.error('加载成本统计失败:', err);
      setError('加载成本统计失败');
    } finally {
      setLoading(false);
    }
  }, [params?.start_date, params?.end_date, params?.batch_code, params?.cost_type]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, summary, loading, error, reload: loadStats };
}

/**
 * 物料成本列表 Hook
 */
export function useMaterialCosts(params?: {
  cost_type?: string;
  batch_code?: string;
  greenhouse_name?: string;
  crop_name?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}) {
  const [costs, setCosts] = useState<MaterialCost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMaterialCosts(params);
      setCosts(result.data);
      setTotal(result.meta.total);
    } catch (err) {
      console.error('加载物料成本失败:', err);
      setError('加载物料成本失败');
    } finally {
      setLoading(false);
    }
  }, [params?.cost_type, params?.batch_code, params?.greenhouse_name, params?.crop_name, params?.start_date, params?.end_date, params?.page, params?.limit]);

  useEffect(() => {
    loadCosts();
  }, [loadCosts]);

  return { costs, total, loading, error, reload: loadCosts };
}

/**
 * 能源成本列表 Hook
 */
export function useEnergyCosts(params?: {
  cost_type?: string;
  greenhouse_name?: string;
  batch_code?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
}) {
  const [costs, setCosts] = useState<EnergyCost[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getEnergyCosts(params);
      setCosts(result.data);
      setTotal(result.meta.total);
    } catch (err) {
      console.error('加载能源成本失败:', err);
      setError('加载能源成本失败');
    } finally {
      setLoading(false);
    }
  }, [params?.cost_type, params?.greenhouse_name, params?.batch_code, params?.start_date, params?.end_date, params?.page, params?.limit]);

  useEffect(() => {
    loadCosts();
  }, [loadCosts]);

  return { costs, total, loading, error, reload: loadCosts };
}

/**
 * 辅助函数：从数据字典加载字典项
 */
async function loadDictionaryItems(categoryCode: string): Promise<unknown[]> {
  try {
    // 动态导入 apiClient
    const { apiClient, USE_API } = await import('../services/apiClient');
    if (!USE_API) return [];
    const result = await apiClient.get(`/dictionary/items`, { category_code: categoryCode });
    return result?.data || [];
  } catch {
    return [];
  }
}
