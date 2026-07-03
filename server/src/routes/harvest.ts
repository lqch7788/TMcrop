/**
 * 采收记录只读路由（2026-06-29 精简）
 *
 * 采收入库独立页面已删除，仅保留 GET 接口供前端 3 处只读查询：
 * - useProductionChainStats（生产链统计）
 * - productionPlanService（生产计划关联）
 * - useApprovalBusinessDetail（审批详情）
 *
 * 2026-07-01：新增 sourceModule / sourceId 过滤参数
 *   - 给 UnifiedRowHarvestInboundModal 弹窗底部"采收记录"历史表用
 *   - 让种源 / 育苗 / 种植 3 页面共用同一个接口查自己的入库历史
 *   - harvest_records 表已有 source_module + source_id 字段（2026-06-19）
 *   - products JSON 字段（2026-06-19）存完整产品明细
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';
import { authenticate } from '../middleware/auth';
import { checkHarvestRecordDeletable } from '../services/inventoryDeleteGuard.service';

const router = Router();
router.use(authenticate);

/**
 * GET /api/harvest — 获取采收记录
 * 查询参数：
 *   - sourceModule: 'seed_source' | 'seedling' | 'planting' （可选）
 *   - sourceId: 来源记录 ID（可选，配合 sourceModule 用）
 *   - stockType: 'seed' | 'seedling' | 'product' （可选）
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { sourceModule, sourceId, stockType } = req.query as Record<string, string | undefined>;
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    if (sourceModule) { conditions.push('hr.source_module = ?'); params.push(sourceModule); }
    if (sourceId) { conditions.push('hr.source_id = ?'); params.push(sourceId); }
    if (stockType) { conditions.push('hr.stock_type = ?'); params.push(stockType); }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    // 2026-07-01: LEFT JOIN warehouses 解析仓库名称（harvest_records 表不存 warehouse_name）
    const rows = queryToObjects<any>(db,
      `SELECT hr.*, w.name AS warehouse_name
       FROM harvest_records hr
       LEFT JOIN warehouses w ON hr.warehouse_id = w.id
       ${where}
       ORDER BY hr.create_time DESC`,
      params
    );
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/** GET /api/harvest/:id — 获取单条采收记录 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = queryToObjects<any>(db, 'SELECT * FROM harvest_records WHERE id = ?', [req.params.id]);
    const row = rows[0];
    if (!row) return res.status(404).json({ success: false, error: '记录不存在' });
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/**
 * DELETE /api/harvest/:id — 删除 1 条采收入库记录
 * 2026-07-01 新增：给 UnifiedRowHarvestInboundModal 弹窗底部的"删除"按钮用
 *
 * 级联清理 4 张表（事务性）：
 * - harvest_records（主单）
 * - inventory_inbound_records（business_id 关联）
 * - inventory_stock（business_id + business_type='harvest' 关联，可能 N 条）
 * - inventory_transaction（business_id + business_type='harvest' 关联，可能 N 条）
 *
 * 安全校验（防止破坏追溯链）：
 * 1. inventory_freeze.harvest_record_id = ? — 该库存有冻结（财务对账相关）→ 拒绝
 * 2. inventory_stock.business_id = ? AND frozen_quantity > 0 — 库存还有冻结数 → 拒绝
 * 3. inventory_transaction.business_id = ? AND transaction_type != 'inbound' — 库存已被出库/调拨 → 拒绝
 *    （inbound 流水是本次入库自己的，可以一起删；其他类型流水是后续消耗，不能断链）
 *
 * 不做软删除（与 planting DELETE 路由保持一致），用物理 DELETE。
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const id = req.params.id;

    // 2026-07-03：使用共享校验服务（统一校验冻结 + 下游出库/调拨）
    const checkResult = checkHarvestRecordDeletable(id);
    if (!checkResult.ok) {
      return res.status(400).json({
        success: false,
        error: checkResult.error,
        blockingRecords: checkResult.blockingRecords || [],
      });
    }

    // 级联清理 4 张表
    // 1. 删 inventory_transaction（流水；该表有 business_id + business_type）
    db.run(`DELETE FROM inventory_transaction WHERE business_id = ? AND business_type = 'harvest'`, [id]);
    // 2. 删 inventory_stock（库存实例；有 business_id + business_type）
    db.run(`DELETE FROM inventory_stock WHERE business_id = ? AND business_type = 'harvest'`, [id]);
    // 3. 删 inventory_inbound_records（入库审计；该表只有 business_id，没有 business_type，按 business_id 删即可）
    db.run(`DELETE FROM inventory_inbound_records WHERE business_id = ?`, [id]);
    // 4. 删 harvest_records（主单）
    db.run('DELETE FROM harvest_records WHERE id = ?', [id]);

    // 持久化到磁盘
    try {
      const { saveDatabase } = require('../db');
      saveDatabase();
    } catch (_) { /* noop — 测试环境可能未注册 saveDatabase */ }

    res.json({ success: true, data: { id } });
  } catch (e: any) {
    console.error('[DELETE /api/harvest/:id]', e);
    res.status(500).json({ success: false, error: e?.message || '删除失败' });
  }
});

export default router;