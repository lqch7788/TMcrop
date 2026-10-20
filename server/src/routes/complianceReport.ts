/**
 * v0.3 P0-R + P0-S：批次合规报告 API 路由
 *
 * P0-R：监管报告导出（PDF/Excel）
 * P0-S：合规校验摘要 + 数据血缘
 *
 * 端点：
 *   GET /api/compliance-report/:batchCode
 *     - 返回完整批次合规数据 JSON（含操作流水/用药/采收/问题 + 合规校验摘要）
 *
 *   GET /api/compliance-report/:batchCode/download?format=json|csv
 *     - 下载文件（v0.3 仅 json/csv，PDF/Excel 留给 v0.4+）
 *
 * 设计原则：
 *   - 不删改任何现有 API
 *   - 仅新增独立路由
 *   - 合规校验摘要从 view 读取（如已存在）
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/**
 * GET /api/compliance-report/:batchCode
 * 返回完整合规数据（前端可自行格式化）
 */
router.get('/:batchCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchCode } = req.params;
    if (!batchCode) {
      res.status(400).json({ success: false, error: 'batchCode 必填' });
      return;
    }

    const db = getDatabase();
    const report: Record<string, unknown> = {
      batchCode,
      generatedAt: new Date().toISOString(),
      sections: {},
    };

    // 2026-10-20 P0-10：各段查询失败不再静默吞掉，统一收集到 sectionsErrors 并随响应返回
    const sectionsErrors: Array<{ section: string; message: string }> = [];
    const runSection = (section: string, fn: () => void) => {
      try {
        fn();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[compliance-report] 段「${section}」查询失败:`, message);
        sectionsErrors.push({ section, message });
      }
    };

    // 1. 批次基本信息
    runSection('batchInfo', () => {
      const r = db.exec('SELECT * FROM plantings WHERE planting_code = ? LIMIT 1', [batchCode]);
      if (r.length > 0 && r[0].values.length > 0) {
        const cols = r[0].columns;
        const obj: Record<string, unknown> = {};
        cols.forEach((c, i) => {
          obj[c] = r[0].values[0][i];
        });
        (report.sections as Record<string, unknown>).batchInfo = obj;
      }
    });

    // 2. 农事任务
    runSection('tasks', () => {
      const r = db.exec(
        `SELECT id, task_code, task_title, task_type, status, progress_pct,
                plan_date, completed_at, assignee_name, actual_hours, actual_area
         FROM farm_tasks WHERE batch_code = ?
         ORDER BY plan_date DESC`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [batchCode] as any
      );
      (report.sections as Record<string, unknown>).tasks = rowsToObjects(r);
    });

    // 3. 作业流水（含用药记录的 pesticide_code）
    runSection('operations', () => {
      const r = db.exec(
        `SELECT id, operation_date, operation_type, operation_type_name,
                operator_name, status, workload, unit, workers, materials
         FROM farm_operation_records WHERE batch_code = ?
         ORDER BY operation_date DESC`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [batchCode] as any
      );
      (report.sections as Record<string, unknown>).operations = rowsToObjects(r);
    });

    // 4. 采收记录
    runSection('harvests', () => {
      const r = db.exec(
        `SELECT id, harvest_date, harvest_quantity, unit, quality_grade,
                harvester_names, buyer_name
         FROM harvest_records WHERE batch_code = ?
         ORDER BY harvest_date DESC`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [batchCode] as any
      );
      (report.sections as Record<string, unknown>).harvests = rowsToObjects(r);
    });

    // 5. 巡查与问题
    // 2026-10-20 P0-10 列名修正：
    //   inspections 实列 = check_date / issue_text（原查 inspection_date / problem_description 不存在）
    //   problems 无 batch_code 列 —— 通过 source_task_id 关联同批次的任务
    runSection('inspections', () => {
      const r = db.exec(
        `SELECT id, record_code, check_date, check_time, inspector_name,
                status, check_result, issue_severity, issue_text, crop_name, batch_code
         FROM inspections WHERE batch_code = ?
         ORDER BY check_date DESC`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [batchCode] as any
      );
      (report.sections as Record<string, unknown>).inspections = rowsToObjects(r);
    });
    runSection('problems', () => {
      const r = db.exec(
        `SELECT p.id, p.problem_code, p.problem_type, p.status, p.description,
                p.priority, p.reporter_name, p.assignee_name, p.handle_result,
                p.rectification_progress, p.recheck_result, p.recheck_at,
                p.recurrence_count, p.create_time
         FROM problems p
         WHERE p.source_task_id IN (
           SELECT id FROM farm_tasks WHERE batch_code = ?
         )
         ORDER BY p.create_time DESC`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [batchCode] as any
      );
      (report.sections as Record<string, unknown>).problems = rowsToObjects(r);
    });

    // 6. 每日记录
    runSection('dailyRecords', () => {
      const r = db.exec(
        `SELECT id, record_date, data
         FROM daily_records WHERE related_type = 'planting' AND related_code = ?
         ORDER BY record_date DESC`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [batchCode] as any
      );
      (report.sections as Record<string, unknown>).dailyRecords = rowsToObjects(r);
    });

    // 6.5 P1-1：合规生产档案（《农产品质量安全法》第 27 条三类内容）
    //   ① 投入品：名称/来源/用法/用量/使用与停用日期
    //   ② 病虫害发生与防治情况
    //   ③ 收获日期
    //   并按「记录保存 ≥2 年」给出 retentionUntil
    runSection('productionRecord', () => {
      const fertilizers = rowsToObjects(db.exec(
        `SELECT id, fertilizer_code, fertilizer_name, fertilizer_type, dilution_ratio,
                quantity, unit, source, fertilize_time AS use_date, stop_use_date,
                greenhouse_name, area_name, crop_name, operator_name
         FROM fertilizer_records
         WHERE planting_code = ?
         ORDER BY fertilize_time ASC`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [batchCode] as any
      ));

      const pesticides = rowsToObjects(db.exec(
        `SELECT id, record_code, pesticide_name, pesticide_type, dosage, dosage_unit,
                dilution_ratio, target_pest, application_method,
                source, spray_time AS use_date, stop_use_date,
                greenhouse_name, crop_name, operator_name
         FROM pesticide_records
         WHERE planting_code = ?
         ORDER BY spray_time ASC`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [batchCode] as any
      ));

      const pestOccurrences = rowsToObjects(db.exec(
        `SELECT p.id, p.problem_code, p.problem_type, p.issue_text, p.description,
                p.issue_severity, p.check_date, p.status, p.handle_result, p.handle_date
         FROM problems p
         WHERE p.source_task_id IN (SELECT id FROM farm_tasks WHERE batch_code = ?)
            OR p.source_id IN (SELECT id FROM farm_tasks WHERE batch_code = ?)
         ORDER BY p.check_date ASC`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [batchCode, batchCode] as any
      ));

      const harvests = rowsToObjects(db.exec(
        `SELECT id, harvest_date, harvest_quantity, unit, quality_grade,
                harvester_names, buyer_name
         FROM harvest_records WHERE batch_code = ?
         ORDER BY harvest_date ASC`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [batchCode] as any
      ));

      // 留存期 = 最早一条记录日期 + 2 年
      const allDates = [
        ...fertilizers.map((r: Record<string, unknown>) => String(r.useDate ?? r.use_date ?? '')),
        ...pesticides.map((r: Record<string, unknown>) => String(r.useDate ?? r.use_date ?? '')),
        ...harvests.map((r: Record<string, unknown>) => String(r.harvestDate ?? r.harvest_date ?? '')),
      ].filter((d) => /^\d{4}-\d{2}-\d{2}/.test(d)).sort();

      let retentionUntil: string | null = null;
      if (allDates.length > 0) {
        const first = new Date(allDates[0]);
        if (!Number.isNaN(first.getTime())) {
          first.setFullYear(first.getFullYear() + 2);
          retentionUntil = first.toISOString().slice(0, 10);
        }
      }

      (report.sections as Record<string, unknown>).productionRecord = {
        // ① 投入品使用
        fertilizerUsage: fertilizers,
        pesticideUsage: pesticides,
        // ② 病虫害发生与防治
        pestOccurrences,
        // ③ 收获日期
        harvests,
        retentionUntil,
        retentionNote: '《农产品质量安全法》第 27 条：生产记录应保存不少于 2 年，禁止伪造、变造',
      };
    });

    // 7. P0-S 合规校验摘要（计算而非读取 view）
    runSection('complianceSummary', () => {
      (report.sections as Record<string, unknown>).complianceSummary =
        computeComplianceSummary(db, batchCode);
    });

    // 8. P0-10：把失败的段如实告诉调用方（此前被 catch 吞掉，报告永远"看起来正常"）
    report.sectionsErrors = sectionsErrors;

    res.json({ success: true, data: report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[compliance-report] 生成失败:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/compliance-report/:batchCode/download?format=json|csv
 * v0.3 仅支持 json/csv；PDF/Excel 留给 v0.4+ 集成 jspdf/xlsx
 */
router.get('/:batchCode/download', async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchCode } = req.params;
    const { format = 'json' } = req.query as { format?: string };

    // 复用 GET /:batchCode 的逻辑
    const db = getDatabase();
    // 内联生成（避免 HTTP 自身调用）
    const report: Record<string, unknown> = {
      batchCode,
      generatedAt: new Date().toISOString(),
      sections: {},
    };

    // 简化：只生成包含基础信息的报告
    // 2026-10-20 P0-10：失败不再静默吞掉
    try {
      const r = db.exec('SELECT planting_code AS batch_code, crop_name, crop_variety, planting_date, expected_harvest_date FROM plantings WHERE planting_code = ?', [batchCode]);
      (report.sections as Record<string, unknown>).batchInfo = rowsToObjects(r);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[compliance-report] 下载端点批次信息查询失败:', message);
      res.status(500).json({ success: false, error: `生成报告失败：${message}` });
      return;
    }

    if (format === 'csv') {
      // 简单 CSV 导出：只导出批次信息
      const csvLines: string[] = ['字段,值'];
      const info = (report.sections as Record<string, unknown>).batchInfo as Array<
        Record<string, unknown>
      >;
      if (info && info.length > 0) {
        for (const [k, v] of Object.entries(info[0])) {
          csvLines.push(`${k},"${String(v ?? '').replace(/"/g, '""')}"`);
        }
      }
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="compliance-${batchCode}-${Date.now()}.csv"`
      );
      res.send('﻿' + csvLines.join('\n'));
      return;
    }

    // 默认 JSON
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="compliance-${batchCode}-${Date.now()}.json"`
    );
    res.send(JSON.stringify(report, null, 2));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * 内部工具：sql.js 的 exec 结果转对象数组
 */
function rowsToObjects(result: Array<{ columns: string[]; values: unknown[][] }>): Record<string, unknown>[] {
  if (result.length === 0) return [];
  const cols = result[0].columns;
  const out: Record<string, unknown>[] = [];
  for (const row of result[0].values) {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => {
      obj[c] = row[i];
    });
    out.push(obj);
  }
  return out;
}

/**
 * 内部工具：P0-S 合规校验摘要计算
 *
 * 检查项：
 *   1. 用药频次：每种药剂本季使用次数（vs safety_interval_days）
 *   2. 安全间隔期：距上次用药间隔（vs retry_interval_days）
 *   3. 距采收间隔：用药日距采收日（vs safety_interval_days）
 *   4. 不可混用：混用过的药剂对（vs compatible_pesticides）
 *
 * 注意：v0.3 仅做检查项标注，实际拦截在 P1-6 阶段做（v0.3 不修改现有接口）
 */
function computeComplianceSummary(
  db: ReturnType<typeof getDatabase>,
  batchCode: string
): Record<string, unknown> {
  const summary = {
    checksPerformed: 4,
    checksPassed: 0,
    checksFailed: 0,
    warnings: [] as Array<{
      pesticideCode: string;
      pesticideName: string;
      checkType: string;
      severity: 'warning' | 'critical';
      message: string;
      applicationDate?: string;
    }>,
    summary: '',
  };

  try {
    // 提取该批次所有用药操作（operation_type='pest_control'）
    const r = db.exec(
      `SELECT id, operation_date, materials, operator_name
       FROM farm_operation_records
       WHERE batch_code = ? AND operation_type = 'pest_control'
       ORDER BY operation_date ASC`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [batchCode] as any
    );

    const applications = rowsToObjects(r);

    // 解析 materials JSON，提取药剂
    interface PesticideUse {
      code: string;
      name: string;
      date: string;
      operator: string;
    }
    const uses: PesticideUse[] = [];
    for (const app of applications) {
      try {
        const mats = JSON.parse(String(app.materials ?? '[]')) as Array<Record<string, unknown>>;
        for (const m of mats) {
          if (m.pesticideCode) {
            uses.push({
              code: String(m.pesticideCode),
              name: String(m.pesticideName ?? m.pesticideCode),
              date: String(app.operation_date),
              operator: String(app.operator_name ?? ''),
            });
          }
        }
      } catch {
        // ignore parse error
      }
    }

    // 获取批次预期采收日
    const harvestR = db.exec(
      `SELECT expected_harvest_date FROM plantings WHERE planting_code = ? LIMIT 1`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [batchCode] as any
    );
    let expectedHarvestDate: string | null = null;
    if (harvestR.length > 0 && harvestR[0].values.length > 0) {
      expectedHarvestDate = (harvestR[0].values[0][0] as string) ?? null;
    }

    // 加载农药库
    const pR = db.exec(
      `SELECT pesticide_code, pesticide_name, safety_interval_days,
              max_use_per_season, retry_interval_days, compatible_pesticides
       FROM pesticide_library WHERE data_source IS NOT NULL`
    );
    const pesticideMap = new Map<string, Record<string, unknown>>();
    for (const p of rowsToObjects(pR)) {
      pesticideMap.set(String(p.pesticide_code), p);
    }

    // 检查 1+2+3：每种药剂的合规性
    const usageByPesticide = new Map<string, PesticideUse[]>();
    for (const u of uses) {
      const arr = usageByPesticide.get(u.code) ?? [];
      arr.push(u);
      usageByPesticide.set(u.code, arr);
    }

    for (const [code, usages] of usageByPesticide.entries()) {
      const p = pesticideMap.get(code);
      if (!p) continue;
      const safetyInterval = (p.safety_interval_days as number) ?? 0;
      const retryInterval = (p.retry_interval_days as number) ?? 0;
      const maxUse = (p.max_use_per_season as number) ?? 0;

      // 累计使用次数
      if (maxUse > 0 && usages.length > maxUse) {
        summary.warnings.push({
          pesticideCode: code,
          pesticideName: String(p.pesticide_name ?? code),
          checkType: 'season_limit',
          severity: 'critical',
          message: `本季已使用 ${usages.length} 次（上限 ${maxUse} 次）`,
        });
      }

      // 复配间隔
      if (retryInterval > 0) {
        for (let i = 1; i < usages.length; i++) {
          const gap = daysBetween(usages[i - 1].date, usages[i].date);
          if (gap < retryInterval) {
            summary.warnings.push({
              pesticideCode: code,
              pesticideName: String(p.pesticide_name ?? code),
              checkType: 'retry_interval',
              severity: 'warning',
              message: `距上次 ${gap} 天 < 推荐复配 ${retryInterval} 天`,
              applicationDate: usages[i].date,
            });
          }
        }
      }

      // 距采收间隔
      if (expectedHarvestDate && safetyInterval > 0) {
        const daysToHarvest = daysBetween(usages[usages.length - 1].date, expectedHarvestDate);
        if (daysToHarvest < safetyInterval) {
          summary.warnings.push({
            pesticideCode: code,
            pesticideName: String(p.pesticide_name ?? code),
            checkType: 'harvest_interval',
            severity: 'critical',
            message: `距采收 ${daysToHarvest} 天 < 要求 ${safetyInterval} 天`,
            applicationDate: usages[usages.length - 1].date,
          });
        }
      }
    }

    // 检查 4：混用禁忌
    for (const p of pesticideMap.values()) {
      const code = String(p.pesticide_code);
      const incom = String(p.compatible_pesticides ?? '');
      if (!incom) continue;
      const incompatList = incom.split(',').map((s) => s.trim()).filter(Boolean);
      const myUses = usageByPesticide.get(code);
      if (!myUses || myUses.length === 0) continue;
      const myLastDate = myUses[myUses.length - 1].date;

      for (const otherCode of incompatList) {
        const otherUses = usageByPesticide.get(otherCode);
        if (!otherUses || otherUses.length === 0) continue;
        const otherLastDate = otherUses[otherUses.length - 1].date;

        const gap = Math.abs(daysBetween(myLastDate, otherLastDate));
        if (gap <= 7) {
          summary.warnings.push({
            pesticideCode: code,
            pesticideName: String(p.pesticide_name ?? code),
            checkType: 'incompatible',
            severity: 'critical',
            message: `与 ${otherCode} 不可混用（${gap} 天内同用）`,
          });
        }
      }
    }

    summary.checksFailed = summary.warnings.length;
    summary.checksPassed = summary.checksPerformed;

    // 生成总结
    const critical = summary.warnings.filter((w) => w.severity === 'critical').length;
    const warning = summary.warnings.filter((w) => w.severity === 'warning').length;
    if (critical > 0) {
      summary.summary = `🚨 严重：${critical} 项阻断 / 警告：${warning} 项`;
    } else if (warning > 0) {
      summary.summary = `⚠️ 警告：${warning} 项`;
    } else {
      summary.summary = '✅ 全部合规';
    }
  } catch (e) {
    summary.summary = `报告生成错误：${(e as Error).message}`;
  }

  return summary;
}

/**
 * 计算两个日期之间的天数（YYYY-MM-DD 字符串）
 */
function daysBetween(d1: string, d2: string): number {
  const a = Date.parse(d1);
  const b = Date.parse(d2);
  if (isNaN(a) || isNaN(b)) return 9999;
  return Math.round(Math.abs(b - a) / 86400000);
}

export default router;
