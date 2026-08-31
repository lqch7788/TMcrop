/**
 * v0.3 P0-B：纸单兜底 API 路由
 *
 * 用途：班组长代填纸单内容（工人不会用手机时的 Plan B）
 *
 * 路径：
 *   POST /api/paper-report           - 单条纸单录入
 *   POST /api/paper-report/batch     - 批量纸单录入
 *   GET /api/paper-report/templates  - 纸单模板列表（按 operation_type）
 *
 * 设计原则：
 *   - 不修改任何现有 API
 *   - 数据写入 farm_operation_records（与移动端同源）
 *   - 字段简化（纸单通常只有少量关键信息）
 *   - 自动填入 reporter_id/agent_id 字段（班组长代填）
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

interface PaperReportItem {
  // 必填
  operationType: string;             // 10 种之一：planting/irrigation/fertilization/pest_control/pruning/harvest/weeding/farm_repair/equipment_repair/other
  operationDate: string;             // YYYY-MM-DD
  operatorName: string;              // 工人姓名
  greenhouseName?: string;
  batchCode?: string;
  // 可选（仅关键字段）
  duration?: number;
  workload?: number;
  unit?: string;
  workers?: number;
  pesticideCode?: string;            // pest_control 时必填
  pesticideName?: string;
  dosage?: string;                   // 用量描述
  remarks?: string;
  // 纸单特有
  paperBatchNo: string;              // 纸单批次号（手填编号）
  paperReporterId: string;           // 代填人（班组长）
}

/**
 * POST /api/paper-report
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const item = req.body as PaperReportItem;

    if (!item.operationType || !item.operationDate || !item.operatorName || !item.paperBatchNo || !item.paperReporterId) {
      res.status(400).json({
        success: false,
        error: '缺少必填字段：operationType/operationDate/operatorName/paperBatchNo/paperReporterId',
      });
      return;
    }

    const db = getDatabase();
    const recordId = `paper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const recordCode = `PAPER-${item.paperBatchNo}-${recordId.slice(-6)}`;

    // 材料 JSON（纸单简化：最多 1 条）
    const materialsJson = item.pesticideCode
      ? JSON.stringify([
          {
            materialCode: item.pesticideCode,
            materialName: item.pesticideName ?? item.pesticideCode,
            quantity: 1,
            unit: item.unit ?? '桶',
            pesticideCode: item.pesticideCode,
            dosage: item.dosage ?? '',
          },
        ])
      : null;

    // 备注追加：纸单批次号 + 代填人
    const remarks = [
      item.remarks ?? '',
      `[纸单:${item.paperBatchNo}]`,
      `[代填:${item.paperReporterId}]`,
    ]
      .filter(Boolean)
      .join(' ');

    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(
        `INSERT INTO farm_operation_records
         (id, record_code, source_type, source_id, source_code,
          operation_type, operation_type_name, status,
          greenhouse_name, batch_code,
          operator_name, operation_date,
          duration, workload, workload_unit, workers, unit,
          materials, remarks, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`,
        [
          recordId,
          recordCode,
          'manual',                   // 来源标记为 manual（区别于任务派发）
          item.paperBatchNo,          // 用纸单号作 sourceId
          item.paperBatchNo,
          item.operationType,
          getOperationTypeName(item.operationType),
          'completed',
          item.greenhouseName ?? null,
          item.batchCode ?? null,
          item.operatorName,
          item.operationDate,
          item.duration ?? null,
          item.workload ?? null,
          item.unit ?? null,
          item.workers ?? null,
          item.unit ?? null,
          materialsJson,
          remarks,
        ]
      );
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    saveDatabase();

    res.json({
      success: true,
      data: {
        recordId,
        recordCode,
        message: '纸单录入成功',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[paper-report] 录入失败:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/paper-report/batch
 */
router.post('/batch', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body as { items?: PaperReportItem[] };

    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, error: 'items 必须是数组' });
      return;
    }

    const results: Array<{
      paperBatchNo: string;
      success: boolean;
      recordId?: string;
      error?: string;
    }> = [];

    const db = getDatabase();
    db.exec('BEGIN IMMEDIATE');
    try {
      for (const item of items) {
        try {
          if (
            !item.operationType ||
            !item.operationDate ||
            !item.operatorName ||
            !item.paperBatchNo ||
            !item.paperReporterId
          ) {
            results.push({
              paperBatchNo: item.paperBatchNo ?? 'unknown',
              success: false,
              error: '缺少必填字段',
            });
            continue;
          }

          const recordId = `paper_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const recordCode = `PAPER-${item.paperBatchNo}-${recordId.slice(-6)}`;
          const materialsJson = item.pesticideCode
            ? JSON.stringify([
                {
                  materialCode: item.pesticideCode,
                  materialName: item.pesticideName ?? item.pesticideCode,
                  quantity: 1,
                  unit: item.unit ?? '桶',
                  pesticideCode: item.pesticideCode,
                  dosage: item.dosage ?? '',
                },
              ])
            : null;
          const remarks = [
            item.remarks ?? '',
            `[纸单:${item.paperBatchNo}]`,
            `[代填:${item.paperReporterId}]`,
          ]
            .filter(Boolean)
            .join(' ');

          db.exec(
            `INSERT INTO farm_operation_records
             (id, record_code, source_type, source_id, source_code,
              operation_type, operation_type_name, status,
              greenhouse_name, batch_code,
              operator_name, operation_date,
              duration, workload, workload_unit, workers, unit,
              materials, remarks, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`,
            [
              recordId,
              recordCode,
              'manual',
              item.paperBatchNo,
              item.paperBatchNo,
              item.operationType,
              getOperationTypeName(item.operationType),
              'completed',
              item.greenhouseName ?? null,
              item.batchCode ?? null,
              item.operatorName,
              item.operationDate,
              item.duration ?? null,
              item.workload ?? null,
              item.unit ?? null,
              item.workers ?? null,
              item.unit ?? null,
              materialsJson,
              remarks,
            ]
          );
          results.push({ paperBatchNo: item.paperBatchNo, success: true, recordId });
        } catch (e: unknown) {
          results.push({
            paperBatchNo: item.paperBatchNo ?? 'unknown',
            success: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    saveDatabase();

    const successCount = results.filter((r) => r.success).length;
    res.json({
      success: true,
      data: {
        results,
        totalSubmitted: items.length,
        totalSuccess: successCount,
        totalFailed: items.length - successCount,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/paper-report/templates
 * 返回纸单模板（按 operation_type）
 */
router.get('/templates', async (_req: Request, res: Response): Promise<void> => {
  const templates = [
    {
      operationType: 'pest_control',
      operationTypeName: '病虫害防治',
      fields: [
        { key: 'operationDate', label: '作业日期', type: 'date', required: true },
        { key: 'operatorName', label: '工人姓名', type: 'text', required: true },
        { key: 'batchCode', label: '批次编号', type: 'text', required: false },
        { key: 'pesticideCode', label: '药剂编号', type: 'text', required: true },
        { key: 'pesticideName', label: '药剂名称', type: 'text', required: false },
        { key: 'dosage', label: '用量', type: 'text', required: false },
        { key: 'duration', label: '耗时（小时）', type: 'number', required: false },
        { key: 'remarks', label: '备注', type: 'textarea', required: false },
      ],
    },
    {
      operationType: 'irrigation',
      operationTypeName: '灌溉',
      fields: [
        { key: 'operationDate', label: '作业日期', type: 'date', required: true },
        { key: 'operatorName', label: '工人姓名', type: 'text', required: true },
        { key: 'duration', label: '耗时（小时）', type: 'number', required: true },
        { key: 'workload', label: '灌溉量', type: 'number', required: false },
        { key: 'unit', label: '单位（吨/方）', type: 'text', required: false },
        { key: 'remarks', label: '备注', type: 'textarea', required: false },
      ],
    },
    {
      operationType: 'fertilization',
      operationTypeName: '施肥',
      fields: [
        { key: 'operationDate', label: '作业日期', type: 'date', required: true },
        { key: 'operatorName', label: '工人姓名', type: 'text', required: true },
        { key: 'batchCode', label: '批次编号', type: 'text', required: false },
        { key: 'workload', label: '施肥量', type: 'number', required: true },
        { key: 'unit', label: '单位（公斤/吨）', type: 'text', required: false },
        { key: 'remarks', label: '备注', type: 'textarea', required: false },
      ],
    },
    {
      operationType: 'harvest',
      operationTypeName: '采收',
      fields: [
        { key: 'operationDate', label: '采收日期', type: 'date', required: true },
        { key: 'operatorName', label: '采收人', type: 'text', required: true },
        { key: 'batchCode', label: '批次编号', type: 'text', required: true },
        { key: 'workload', label: '采收量', type: 'number', required: true },
        { key: 'unit', label: '单位（公斤/斤）', type: 'text', required: false },
        { key: 'remarks', label: '备注', type: 'textarea', required: false },
      ],
    },
  ];

  res.json({ success: true, data: templates });
});

/**
 * 内部工具：operation_type 中文名
 */
function getOperationTypeName(type: string): string {
  const map: Record<string, string> = {
    planting: '种植',
    irrigation: '灌溉',
    fertilization: '施肥',
    pest_control: '病虫害防治',
    pruning: '修剪',
    harvest: '采收',
    weeding: '除草',
    farm_repair: '农场维护',
    equipment_repair: '设备维修',
    other: '其他',
  };
  return map[type] ?? type;
}

export default router;
