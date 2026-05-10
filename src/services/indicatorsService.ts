/**
 * 指标 LocalStorage 服务
 * 作为 API 降级方案
 */

import type { Indicator } from '../pages/types/indicators.types';

const STORAGE_KEY = 'indicators_data';

// 初始指标数据
const INITIAL_INDICATORS: Indicator[] = [
  { id: '1', code: 'KPI001', name: '月产量完成率', category: '生产指标', unit: '%', target: 95, actual: 92.5, trend: 'up', frequency: '月度', source: '自动采集', warning: 90, weight: 15 },
  { id: '2', code: 'KPI002', name: '温室利用率', category: '资源指标', unit: '%', target: 90, actual: 88.3, trend: 'down', frequency: '月度', source: '自动采集', warning: 85, weight: 10 },
  { id: '3', code: 'KPI003', name: '种苗成活率', category: '质量指标', unit: '%', target: 98, actual: 97.2, trend: 'up', frequency: '季度', source: '自动采集', warning: 95, weight: 12 },
  { id: '4', code: 'KPI004', name: '病虫害发生率', category: '质量指标', unit: '%', target: 5, actual: 3.8, trend: 'down', frequency: '月度', source: '自动采集', warning: 8, weight: 10 },
  { id: '5', code: 'KPI005', name: '采收损耗率', category: '质量指标', unit: '%', target: 3, actual: 2.5, trend: 'down', frequency: '月度', source: '人工录入', warning: 5, weight: 8 },
  { id: '6', code: 'KPI006', name: '人工成本占比', category: '成本指标', unit: '%', target: 25, actual: 26.2, trend: 'up', frequency: '月度', source: '自动采集', warning: 28, weight: 10 },
  { id: '7', code: 'KPI007', name: '肥料利用率', category: '效率指标', unit: '%', target: 85, actual: 82.1, trend: 'up', frequency: '季度', source: '人工录入', warning: 80, weight: 8 },
  { id: '8', code: 'KPI008', name: '亩均产值', category: '效益指标', unit: '万元/亩', target: 3.5, actual: 3.2, trend: 'up', frequency: '年度', source: '人工录入', warning: 3.0, weight: 15 },
  { id: '9', code: 'KPI009', name: '客户满意度', category: '服务指标', unit: '分', target: 90, actual: 92, trend: 'up', frequency: '季度', source: '人工录入', warning: 85, weight: 10 },
  { id: '10', code: 'KPI010', name: '设备完好率', category: '设备指标', unit: '%', target: 95, actual: 94.5, trend: 'down', frequency: '月度', source: '自动采集', warning: 90, weight: 8 },
  { id: '11', code: 'KPI011', name: '水资源利用率', category: '效率指标', unit: '%', target: 80, actual: 78.5, trend: 'up', frequency: '月度', source: '自动采集', warning: 75, weight: 8 },
  { id: '12', code: 'KPI012', name: '农残检测合格率', category: '质量指标', unit: '%', target: 100, actual: 99.8, trend: 'stable', frequency: '批次', source: '人工录入', warning: 98, weight: 12 },
  { id: '13', code: 'KPI013', name: '新品研发周期', category: '效率指标', unit: '天', target: 60, actual: 55, trend: 'down', frequency: '年度', source: '人工录入', warning: 70, weight: 6 },
  { id: '14', code: 'KPI014', name: '能源消耗强度', category: '成本指标', unit: 'kWh/亩', target: 800, actual: 850, trend: 'up', frequency: '月度', source: '自动采集', warning: 900, weight: 8 },
  { id: '15', code: 'KPI015', name: '员工培训完成率', category: '服务指标', unit: '%', target: 95, actual: 93, trend: 'up', frequency: '季度', source: '人工录入', warning: 90, weight: 5 },
  { id: '16', code: 'KPI016', name: '安全事故发生率', category: '安全指标', unit: '次', target: 0, actual: 1, trend: 'up', frequency: '月度', source: '人工录入', warning: 2, weight: 15 },
];

/**
 * 从 localStorage 获取指标列表
 */
function getIndicatorsFromStorage(): Indicator[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // 初始化数据
    saveIndicatorsToStorage(INITIAL_INDICATORS);
    return INITIAL_INDICATORS;
  } catch (error) {
    console.error('读取指标数据失败:', error);
    return INITIAL_INDICATORS;
  }
}

/**
 * 保存指标列表到 localStorage
 */
function saveIndicatorsToStorage(indicators: Indicator[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(indicators));
  } catch (error) {
    console.error('保存指标数据失败:', error);
  }
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `indicator_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 获取所有指标
 */
export function getIndicators(): Indicator[] {
  return getIndicatorsFromStorage();
}

/**
 * 根据ID获取单个指标
 */
export function getIndicatorById(id: string): Indicator | undefined {
  const indicators = getIndicatorsFromStorage();
  return indicators.find(ind => ind.id === id);
}

/**
 * 根据ID数组获取多个指标
 */
export function getIndicatorsByIds(ids: string[]): Indicator[] {
  const indicators = getIndicatorsFromStorage();
  return indicators.filter(ind => ids.includes(ind.id));
}

/**
 * 创建指标
 */
export function createIndicator(indicatorData: Omit<Indicator, 'id' | 'code'>): Indicator {
  const indicators = getIndicatorsFromStorage();

  // 生成指标编码
  const prefix = 'KPI';
  const year = new Date().getFullYear().toString().slice(-2);
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const maxCode = indicators
    .filter(ind => ind.code.startsWith(`${prefix}${year}${month}`))
    .map(ind => {
      const seq = ind.code.slice(-3);
      return parseInt(seq, 10) || 0;
    })
    .reduce((max, val) => Math.max(max, val), 0);

  const newIndicator: Indicator = {
    ...indicatorData,
    id: generateId(),
    code: `${prefix}${year}${month}${String(maxCode + 1).padStart(3, '0')}`,
  } as Indicator;

  indicators.unshift(newIndicator);
  saveIndicatorsToStorage(indicators);
  return newIndicator;
}

/**
 * 更新指标
 */
export function updateIndicator(id: string, updates: Partial<Indicator>): Indicator | null {
  const indicators = getIndicatorsFromStorage();
  const index = indicators.findIndex(ind => ind.id === id);

  if (index === -1) {
    return null;
  }

  indicators[index] = { ...indicators[index], ...updates };
  saveIndicatorsToStorage(indicators);
  return indicators[index];
}

/**
 * 删除指标
 */
export function deleteIndicator(id: string): boolean {
  const indicators = getIndicatorsFromStorage();
  const index = indicators.findIndex(ind => ind.id === id);

  if (index === -1) {
    return false;
  }

  indicators.splice(index, 1);
  saveIndicatorsToStorage(indicators);
  return true;
}

/**
 * 批量删除指标
 */
export function deleteIndicators(ids: string[]): boolean {
  const indicators = getIndicatorsFromStorage();
  const filteredIndicators = indicators.filter(ind => !ids.includes(ind.id));
  saveIndicatorsToStorage(filteredIndicators);
  return true;
}

/**
 * 重置指标数据
 */
export function resetIndicators(): void {
  saveIndicatorsToStorage(INITIAL_INDICATORS);
}
