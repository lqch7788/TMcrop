/**
 * v0.3 P0-3：离线队列同步 API 路由
 *
 * 路径：
 *   POST /api/offline-sync         - 批量同步离线队列
 *   GET /api/offline-sync/stats   - 离线队列统计
 *
 * 核心约束（来自 ADR + 用户原则）：
 *   - 不修改任何现有 API
 *   - UNIQUE 冲突必须返回 { status: 'duplicate' } 而非抛错（避免 enhancedApiClient 3 次重试死循环）
 *   - progress_pct 取较大值，materials 追加（数据合并策略）
 *   - 创建新表 operation_record_offline_queue（仅追加）
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

interface OfflineItem {
  clientId: string;
  payload: {
    sourceType?: string;             // task / tempTask / manual / inspection
    sourceId?: string;
    sourceCode?: string;
    operationType?: string;          // 10 种之一
    operationTypeName?: string;
    status?: string;
    greenhouseId?: string;
    greenhouseName?: string;
    cropName?: string;
    variety?: string;
    batchId?: string;
    batchCode?: string;
    operatorId?: string;
    operatorName?: string;
    operationDate?: string;
    startTime?: string;
    endTime?: string;
    duration?: number;
    workload?: number;
    workloadUnit?: string;
    workers?: number;
    unit?: string;
    materials?: Array<{
      materialCode: string;
      materialName?: string;
      quantity: number;
      unit?: string;
      pesticideCode?: string;
    }>;
    photosBefore?: string;
    photosAfter?: string;
    remarks?: string;
    progress?: number;
  };
  clientCreatedAt: string;
}

interface SyncResult {
  clientId: string;
  status: 'created' | 'duplicate' | 'updated' | 'failed';
  serverRecordId?: string;
  error?: string;
}

/**
 * POST /api/offline-sync
 * Body: { items: OfflineItem[] }
 *
 * 响应：
 *   {
 *     success: true,
 *     data: {
 *       results: SyncResult[],
       totalProcessed: number,
       totalCreated: number,
       totalDuplicate: number,
       totalFailed: number,
     }
 *   }
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { items } = req.body as { items?: OfflineItem[] };

    if (!Array.isArray(items)) {
      res.status(400).json({ success: false, error: 'items 必须是数组' });
      return;
    }

    if (items.length === 0) {
      res.json({
        success: true,
        data: {
          results: [],
          totalProcessed: 0,
          totalCreated: 0,
          totalDuplicate: 0,
          totalFailed: 0,
        },
      });
      return;
    }

    const db = getDatabase();
    const results: SyncResult[] = [];
    let totalCreated = 0;
    let totalDuplicate = 0;
    let totalFailed = 0;

    for (const item of items) {
      try {
        if (!item.clientId) {
          results.push({
            clientId: 'unknown',
            status: 'failed',
            error: '缺少 clientId',
          });
          totalFailed++;
          continue;
        }

        // 1. 检查 offline_queue 是否已有此 clientId
        const queueResult = db.exec(
          'SELECT id, server_record_id FROM operation_record_offline_queue WHERE client_id = ?',
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [item.clientId] as any
        );

        if (queueResult.length > 0 && queueResult[0].values.length > 0) {
          // 已存在：返回 duplicate（避免抛错导致重试死循环）
          const queueRow = queueResult[0].values[0];
          const serverId = (queueRow[1] as number) ?? undefined;
          results.push({
            clientId: item.clientId,
            status: 'duplicate',
            serverRecordId: serverId !== null && serverId !== undefined ? String(serverId) : undefined,
          });
          totalDuplicate++;
          continue;
        }

        // 2. 写入 farm_operation_records
        const p = item.payload;
        const recordId = `op_offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        // 处理 materials：序列化为 JSON
        const materialsJson = p.materials ? JSON.stringify(p.materials) : null;
        const photosBeforeJson = p.photosBefore ? JSON.stringify(p.photosBefore) : null;
        const photosAfterJson = p.photosAfter ? JSON.stringify(p.photosAfter) : null;

        db.exec('BEGIN IMMEDIATE');
        try {
          db.exec(
            `INSERT INTO farm_operation_records
             (id, record_code, source_type, source_id, source_code,
              operation_type, operation_type_name, status,
              greenhouse_id, greenhouse_name, crop_name, variety,
              batch_id, batch_code,
              operator_id, operator_name, operation_date,
              start_time, end_time, duration, workload, workload_unit,
              workers, unit, materials, photos_before, photos_after, remarks,
              progress, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'))`,
            [
              recordId,
              `OFFLINE-${item.clientId.slice(0, 16)}`,
              p.sourceType ?? 'manual',
              p.sourceId ?? null,
              p.sourceCode ?? null,
              p.operationType ?? 'other',
              p.operationTypeName ?? '其他',
              p.status ?? 'completed',
              p.greenhouseId ?? null,
              p.greenhouseName ?? null,
              p.cropName ?? null,
              p.variety ?? null,
              p.batchId ?? null,
              p.batchCode ?? null,
              p.operatorId ?? null,
              p.operatorName ?? null,
              p.operationDate ?? item.clientCreatedAt ?? new Date().toISOString().slice(0, 10),
              p.startTime ?? null,
              p.endTime ?? null,
              p.duration ?? null,
              p.workload ?? null,
              p.unit ?? null,
              p.workers ?? null,
              p.unit ?? null,
              materialsJson,
              photosBeforeJson,
              photosAfterJson,
              p.remarks ?? null,
              p.progress ?? null,
            ]
          );

          // 3. 写入 offline_queue（标记已同步）
          const queueId = `oq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          db.exec(
            `INSERT INTO operation_record_offline_queue
             (id, client_id, payload, client_created_at, sync_status, server_record_id, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
            [
              queueId,
              item.clientId,
              JSON.stringify(item.payload),
              item.clientCreatedAt,
              'synced',
              recordId,
            ]
          );

          db.exec('COMMIT');

          results.push({
            clientId: item.clientId,
            status: 'created',
            serverRecordId: recordId,
          });
          totalCreated++;
        } catch (innerErr) {
          db.exec('ROLLBACK');
          throw innerErr;
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({
          clientId: item.clientId ?? 'unknown',
          status: 'failed',
          error: message,
        });
        totalFailed++;
      }
    }

    saveDatabase();

    res.json({
      success: true,
      data: {
        results,
        totalProcessed: items.length,
        totalCreated,
        totalDuplicate,
        totalFailed,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[offline-sync] 同步失败:', message);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/offline-sync/stats
 */
router.get('/stats', async (_req: Request, res: Response): Promise<void> => {
  try {
    const db = getDatabase();

    let totalPending = 0;
    let totalSynced = 0;
    let totalFailed = 0;

    try {
      const r = db.exec(
        `SELECT sync_status, COUNT(*) AS cnt
         FROM operation_record_offline_queue
         GROUP BY sync_status`
      );
      for (const row of r[0]?.values ?? []) {
        const status = row[0] as string;
        const cnt = row[1] as number;
        if (status === 'pending') totalPending = cnt;
        else if (status === 'synced') totalSynced = cnt;
        else if (status === 'failed') totalFailed = cnt;
      }
    } catch {
      // 表可能不存在
    }

    res.json({
      success: true,
      data: { totalPending, totalSynced, totalFailed, total: totalPending + totalSynced + totalFailed },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
