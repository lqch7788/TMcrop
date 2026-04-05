import { useState, useMemo } from 'react';
import type { BudgetInput, BudgetOutput, MonthlyBudget, QuarterlyBudget, YearlyBudget, BudgetWarning } from '../types';

// 默认预算输入
const defaultBudgetInput: BudgetInput = {
  batchCount: 12,
  expectedYield: 500000,
  laborCostRatio: 35,
  seasonFactor: 10,
  isPeakSeason: true,
  tempWorkerRatio: 30,
  tempWorkerDailyRate: 200,
  formalWorkerCount: 50,
  formalWorkerAvgSalary: 6000,
  socialSecurityRate: 25,
  benefitsRate: 8,
  warningThreshold: 15,
};

// 季节性系数 (月份 -> 系数)
const SEASON_FACTORS: Record<number, number> = {
  1: 0.8,   // 1月
  2: 0.85,  // 2月
  3: 0.9,   // 3月
  4: 1.0,   // 4月 (旺季)
  5: 1.1,   // 5月 (旺季)
  6: 1.05,  // 6月 (旺季)
  7: 1.0,   // 7月
  8: 0.95,  // 8月
  9: 0.9,   // 9月
  10: 0.85, // 10月
  11: 0.8,  // 11月
  12: 0.75, // 12月
};

export function useBudget() {
  const [input, setInput] = useState<BudgetInput>(defaultBudgetInput);
  const [selectedYear, setSelectedYear] = useState(2026);

  // 计算月度预算
  const calculateMonthlyBudget = (month: number): MonthlyBudget => {
    const seasonFactor = SEASON_FACTORS[month] || 1;
    const adjustedSeasonFactor = input.isPeakSeason ? seasonFactor : seasonFactor * 0.8;

    // 月度采收量
    const monthlyYield = Math.round(input.expectedYield / 12 * adjustedSeasonFactor);

    // 正式工月成本
    const formalWorkerCost = input.formalWorkerCount * input.formalWorkerAvgSalary;

    // 临时工月成本 (按天估算：每月22个工作日)
    const tempWorkerDays = 22;
    const tempWorkerCost = Math.round(
      input.formalWorkerCount * input.tempWorkerRatio / 100 *
      tempWorkerDays * input.tempWorkerDailyRate * adjustedSeasonFactor
    );

    // 社保公积金
    const socialSecurity = Math.round((formalWorkerCost + tempWorkerCost * 0.3) * input.socialSecurityRate / 100);

    // 福利补贴
    const benefits = Math.round((formalWorkerCost + tempWorkerCost * 0.3) * input.benefitsRate / 100);

    // 总人工成本
    const laborCost = formalWorkerCost + tempWorkerCost + socialSecurity + benefits;

    // 用工人数
    const headcount = input.formalWorkerCount + Math.round(input.formalWorkerCount * input.tempWorkerRatio / 100);

    // 单位成本
    const costPerUnit = monthlyYield > 0 ? laborCost / monthlyYield : 0;

    return {
      month: `${selectedYear}-${String(month).padStart(2, '0')}`,
      laborCost,
      formalWorkerCost,
      tempWorkerCost,
      socialSecurity,
      benefits,
      headcount,
      yieldPrediction: monthlyYield,
      costPerUnit: Math.round(costPerUnit * 100) / 100,
    };
  };

  // 生成月度预算
  const monthlyBudget = useMemo<MonthlyBudget[]>(() => {
    return Array.from({ length: 12 }, (_, i) => calculateMonthlyBudget(i + 1));
  }, [input, selectedYear]);

  // 计算季度预算
  const quarterlyBudget = useMemo<QuarterlyBudget[]>(() => {
    const quarters = [
      { months: [1, 2, 3], label: `${selectedYear}-Q1` },
      { months: [4, 5, 6], label: `${selectedYear}-Q2` },
      { months: [7, 8, 9], label: `${selectedYear}-Q3` },
      { months: [10, 11, 12], label: `${selectedYear}-Q4` },
    ];

    return quarters.map(({ months, label }) => {
      const quarterData = monthlyBudget.filter((m) => {
        const monthNum = parseInt(m.month.split('-')[1]);
        return months.includes(monthNum);
      });

      return {
        quarter: label,
        laborCost: quarterData.reduce((sum, m) => sum + m.laborCost, 0),
        formalWorkerCost: quarterData.reduce((sum, m) => sum + m.formalWorkerCost, 0),
        tempWorkerCost: quarterData.reduce((sum, m) => sum + m.tempWorkerCost, 0),
        socialSecurity: quarterData.reduce((sum, m) => sum + m.socialSecurity, 0),
        benefits: quarterData.reduce((sum, m) => sum + m.benefits, 0),
        headcount: Math.round(quarterData.reduce((sum, m) => sum + m.headcount, 0) / 3),
        yieldPrediction: quarterData.reduce((sum, m) => sum + m.yieldPrediction, 0),
        costPerUnit: quarterData.length > 0
          ? quarterData.reduce((sum, m) => sum + m.costPerUnit * m.yieldPrediction, 0) /
            quarterData.reduce((sum, m) => sum + m.yieldPrediction, 0)
          : 0,
        monthCount: months.length,
      };
    });
  }, [monthlyBudget, selectedYear]);

  // 计算年度预算
  const yearlyBudget = useMemo<YearlyBudget>(() => {
    return {
      year: selectedYear,
      totalLaborCost: monthlyBudget.reduce((sum, m) => sum + m.laborCost, 0),
      formalWorkerCost: monthlyBudget.reduce((sum, m) => sum + m.formalWorkerCost, 0),
      tempWorkerCost: monthlyBudget.reduce((sum, m) => sum + m.tempWorkerCost, 0),
      socialSecurity: monthlyBudget.reduce((sum, m) => sum + m.socialSecurity, 0),
      benefits: monthlyBudget.reduce((sum, m) => sum + m.benefits, 0),
      avgHeadcount: Math.round(monthlyBudget.reduce((sum, m) => sum + m.headcount, 0) / 12),
      totalYield: monthlyBudget.reduce((sum, m) => sum + m.yieldPrediction, 0),
      avgCostPerUnit: monthlyBudget.reduce((sum, m) => sum + m.costPerUnit * m.yieldPrediction, 0) /
        monthlyBudget.reduce((sum, m) => sum + m.yieldPrediction, 0),
      q1Cost: quarterlyBudget[0]?.laborCost || 0,
      q2Cost: quarterlyBudget[1]?.laborCost || 0,
      q3Cost: quarterlyBudget[2]?.laborCost || 0,
      q4Cost: quarterlyBudget[3]?.laborCost || 0,
    };
  }, [monthlyBudget, quarterlyBudget, selectedYear]);

  // 检查超预算预警
  const warnings = useMemo<BudgetWarning[]>(() => {
    const warningList: BudgetWarning[] = [];

    // 检查月度预算超限
    monthlyBudget.forEach((month) => {
      const threshold = yearlyBudget.totalLaborCost / 12 * (1 + input.warningThreshold / 100);
      if (month.laborCost > threshold) {
        warningList.push({
          type: 'over_budget',
          level: month.laborCost > threshold * 1.1 ? 'critical' : 'warning',
          message: `${month.month}人工成本超预算 ${input.warningThreshold}% 阈值，当前${Math.round(month.laborCost / 10000)}万元`,
          currentValue: month.laborCost,
          threshold,
        });
      }
    });

    // 检查单位成本异常
    const avgCost = yearlyBudget.avgCostPerUnit;
    monthlyBudget.forEach((month) => {
      if (month.costPerUnit > avgCost * 1.2) {
        warningList.push({
          type: 'high_cost',
          level: 'warning',
          message: `${month.month}单位成本偏高，当前${month.costPerUnit}元/斤，年度均值${avgCost.toFixed(2)}元/斤`,
          currentValue: month.costPerUnit,
          threshold: avgCost * 1.2,
        });
      }
    });

    // 旺季预警
    if (input.isPeakSeason) {
      const peakMonths = [4, 5, 6];
      const peakCost = monthlyBudget
        .filter((m) => peakMonths.includes(parseInt(m.month.split('-')[1])))
        .reduce((sum, m) => sum + m.laborCost, 0);
      const offPeakCost = monthlyBudget
        .filter((m) => !peakMonths.includes(parseInt(m.month.split('-')[1])))
        .reduce((sum, m) => sum + m.laborCost, 0) / 9;

      if (peakCost > offPeakCost * 1.5) {
        warningList.push({
          type: 'high_cost',
          level: 'info',
          message: '旺季人工成本预计将大幅上升，建议提前储备临时工',
          currentValue: peakCost,
          threshold: offPeakCost * 1.5,
        });
      }
    }

    return warningList;
  }, [monthlyBudget, yearlyBudget, input]);

  // 输出结果
  const output = useMemo<BudgetOutput>(() => ({
    monthlyBudget,
    quarterlyBudget,
    yearlyBudget,
    warnings,
    generatedAt: new Date().toISOString(),
  }), [monthlyBudget, quarterlyBudget, yearlyBudget, warnings]);

  // 更新输入参数
  const updateInput = (newInput: Partial<BudgetInput>) => {
    setInput((prev) => ({ ...prev, ...newInput }));
  };

  // 重置输入
  const resetInput = () => {
    setInput(defaultBudgetInput);
  };

  return {
    input,
    output,
    selectedYear,
    setSelectedYear,
    updateInput,
    resetInput,
  };
}
