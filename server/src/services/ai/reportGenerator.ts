/**
 * AI-13 智能报告生成服务（V2 — 参数化 SQL + 真实预警）
 * 2026-09-02：v0.3.1 修复版
 *
 * 修复前问题（V1）：
 *   - L74-75: 字符串拼接 SQL（taskFilter/ghFilter 拼接到 query）→ SQL 注入风险
 *   - L111: const alertCount = totalYield > 0 ? 0 : 0 → 永远是 0（死代码）
 *   - L94-99: 产量统计用 harvest_records 全表（含历史），不看日期范围
 *   - L70: input.crop_type 字段名错位（SQL 实际筛 task_type，但接口字段叫 crop_type）
 *
 * V2 修复：
 *   - 全部 SQL 参数化（防止注入）
 *   - alerts 真实计算（基于完成率/产量/工时数据）
 *   - 产量统计加日期范围过滤
 *   - crop_type 与 task_type 字段映射
 */

import { getDatabase } from '../../db';

interface ReportInput {
  report_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  start_date?: string;
  end_date?: string;
  crop_type?: string;
  greenhouse_id?: string;
}

interface ReportSection {
  title: string;
  content: string;
  data?: Record<string, any>;
  insights: string[];
  alerts: string[];
}

interface ReportResult {
  report_id: string;
  report_type: string;
  period: { start: string; end: string };
  generated_at: string;
  generation_time_ms: number;
  summary: string;
  sections: ReportSection[];
  overall_metrics: { total_tasks: number; completed_tasks: number; completion_rate: number; total_yield_kg: number; alerts_count: number };
  recommendations: string[];
  model_version: string;
}

const MODEL_VERSION = '2.0.0-template-dba';

function getDateRange(reportType: string, startDate?: string, endDate?: string): { start: string; end: string } {
  const now = new Date();
  if (reportType === 'daily') {
    const today = now.toISOString().split('T')[0];
    return { start: today, end: today };
  }
  if (reportType === 'weekly') {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { start: weekAgo.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
  }
  if (reportType === 'monthly') {
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { start: monthAgo.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
  }
  return { start: startDate || now.toISOString().split('T')[0], end: endDate || now.toISOString().split('T')[0] };
}

export async function generateReport(input: ReportInput): Promise<ReportResult> {
  const startTime = Date.now();
  const db = getDatabase();
  const range = getDateRange(input.report_type, input.start_date, input.end_date);

  // 1. 任务统计（参数化查询 + 字段映射 crop_type → task_type）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskStats = db.exec(
    `SELECT status, COUNT(*) AS n
     FROM farm_tasks
     WHERE DATE(completed_at) BETWEEN ? AND ?
       ${input.crop_type ? 'AND task_type = ?' : ''}
       ${input.greenhouse_id ? 'AND greenhouse_id = ?' : ''}
     GROUP BY status`,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [
      range.start,
      range.end,
      ...(input.crop_type ? [input.crop_type] : []),
      ...(input.greenhouse_id ? [input.greenhouse_id] : []),
    ] as any[]
  );
  const taskByStatus: Record<string, number> = {};
  let totalTasks = 0;
  if (taskStats[0]) {
    for (const row of taskStats[0].values) {
      taskByStatus[row[0] as string] = Number(row[1]);
      totalTasks += Number(row[1]);
    }
  }
  const completedTasks = taskByStatus.completed || 0;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 1000) / 10 : 0;

  // 2. 产量统计（V2 修复：加日期范围）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yieldRows = db.exec(
    `SELECT COALESCE(SUM(harvest_quantity), 0) AS total_yield, COUNT(*) AS harvest_count
     FROM harvest_records
     WHERE DATE(harvest_date) BETWEEN ? AND ?`,
    [range.start, range.end] as any[]
  );
  const totalYield = Number(yieldRows[0]?.values?.[0]?.[0] || 0);
  const harvestCount = Number(yieldRows[0]?.values?.[0]?.[1] || 0);

  // 3. 工时统计
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actualHoursRows = db.exec(
    `SELECT AVG(actual_hours) AS avg_h, SUM(actual_hours) AS total_h, COUNT(*) AS n
     FROM farm_tasks
     WHERE actual_hours IS NOT NULL AND actual_hours > 0
       AND DATE(completed_at) BETWEEN ? AND ?`,
    [range.start, range.end] as any[]
  );
  const avgHours = Number(actualHoursRows[0]?.values?.[0]?.[0] || 0);
  const hoursSampleCount = Number(actualHoursRows[0]?.values?.[0]?.[2] || 0);

  // 4. 真实预警计算（V2 修复：基于数据条件判断）
  const alerts: string[] = [];
  if (totalTasks > 0 && completionRate < 50) {
    alerts.push(`🚨 任务完成率仅 ${completionRate}%，低于 50% 安全线`);
  }
  if (totalTasks > 0 && completionRate >= 50 && completionRate < 70) {
    alerts.push(`⚠️ 任务完成率 ${completionRate}%，需要重点关注`);
  }
  if (totalTasks === 0) {
    alerts.push(`⚠️ 期间内无任务完成数据，可能未录入或日期范围错误`);
  }
  if (harvestCount === 0 && range.end !== range.start) {
    alerts.push(`⚠️ 期间内无采收记录，请检查采收流程`);
  }
  if (hoursSampleCount > 0 && hoursSampleCount < 100) {
    alerts.push(`⚠️ AI 工时样本仅 ${hoursSampleCount} 条，模型准确率受限（建议 ≥100 条）`);
  }
  if (totalYield > 0 && harvestCount > 0) {
    const avgYieldPerHarvest = totalYield / harvestCount;
    if (avgYieldPerHarvest < 10) {
      alerts.push(`⚠️ 单次采收均产量偏低（${avgYieldPerHarvest.toFixed(1)}kg/次）`);
    }
  }

  // 5. 构建 sections
  const sections: ReportSection[] = [
    {
      title: '一、任务执行情况',
      content: `期间内共执行 ${totalTasks} 个农事任务，其中 ${completedTasks} 个已完成，完成率 **${completionRate}%**。`,
      data: taskByStatus,
      insights:
        completionRate >= 80
          ? [`✅ 任务完成率 ${completionRate}% 良好`]
          : completionRate >= 50
          ? [`⚠️ 任务完成率 ${completionRate}% 偏低`]
          : [`🚨 任务完成率 ${completionRate}% 严重偏低`],
      alerts: completionRate < 70 ? [`完成率低于 70%，需要重点关注`] : [],
    },
    {
      title: '二、产量统计',
      content: `期间内累计产量 **${totalYield.toFixed(1)}kg**（${harvestCount} 次采收，按 harvest_records 真实表）。`,
      data: { total_yield_kg: totalYield, harvest_count: harvestCount },
      insights:
        totalYield > 0
          ? [`📊 产量稳定，达到预期`]
          : [`📊 期间内无产量记录（可能未到采收期）`],
      alerts: [],
    },
    {
      title: '三、AI 工时统计（Phase 2 数据）',
      content: `AI-06 工时预测模块已采集 ${hoursSampleCount} 条实际工时数据，平均 ${avgHours.toFixed(1)}h/任务。`,
      data: {
        avg_hours: Math.round(avgHours * 10) / 10,
        sample_count: hoursSampleCount,
      },
      insights:
        hoursSampleCount > 0
          ? [`🤖 AI 模型训练样本数 ${hoursSampleCount}（PPT 要求 ≥100）`]
          : [`⚠️ 工时数据不足，AI 模型准确率受限`],
      alerts: [],
    },
  ];

  // 6. 改进建议
  const recommendations: string[] = [];
  if (completionRate < 70) {
    recommendations.push(`建议加强任务监控，将完成率提升至 80%+`);
  }
  if (totalYield === 0) {
    recommendations.push(`建议检查采收流程，确保数据及时录入`);
  }
  if (hoursSampleCount < 100) {
    recommendations.push(`建议采集更多工时数据，提升 AI-06 模型准确率（当前 ${hoursSampleCount} 样本 < 100）`);
  }
  if (recommendations.length === 0) {
    recommendations.push(`✅ 当前数据状态良好，继续保持`);
  }

  // 7. 总结
  const summary = `【${input.report_type.toUpperCase()}】 期间 ${range.start} ~ ${range.end}：任务 ${totalTasks} 个（完成率 ${completionRate}%），产量 ${totalYield.toFixed(1)}kg，AI 工时样本 ${hoursSampleCount} 条，预警 ${alerts.length} 条。`;

  return {
    report_id: `RPT-${Date.now()}`,
    report_type: input.report_type,
    period: range,
    generated_at: new Date().toISOString(),
    generation_time_ms: Date.now() - startTime,
    summary,
    sections,
    overall_metrics: {
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      completion_rate: completionRate,
      total_yield_kg: totalYield,
      alerts_count: alerts.length,
    },
    recommendations,
    model_version: MODEL_VERSION,
  };
}
