/**
 * 种源路由
 * 精简为直接调用 Controller
 * C1：所有路由都经过 authenticate 中间件（演示模式自动放行，生产模式需 token）
 */

import { Router } from 'express';
import { seedSourceController } from '../controllers/seedSource.controller';
import { getDatabase, saveDatabase } from '../db';
import { seedSourceRepository } from '../repositories/seedSource.repository';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// C1：全局应用 auth 中间件（演示模式下 DEMO_USERS 名单会跳过认证）
router.use(authenticate);

// 注意：generate-code 和 batch 路由必须在 :id 路由之前，否则会被 :id 匹配

// 生成种源编码
router.get('/generate-code', (req, res, next) => seedSourceController.generateCode(req, res, next));

// 批量删除路由必须在 /:id 之前
router.delete('/batch', (req, res, next) => seedSourceController.deleteBatch(req, res, next));

// 可用留种的种植记录（必须在 :id 路由之前，避免被 :id 匹配）
router.get('/available-for-seed-saving', (req, res, next) => seedSourceController.getPlantingsForSeedSaving(req, res, next));

// 繁殖阶段操作（带 :id 参数）
// 注意：全量查询路由 GET /propagation-records 必须注册在 :id 路由之前，否则 :id 会吞掉 propagation-records 字面量
router.get('/propagation-records', (req, res, next) => seedSourceController.getAllPropagationRecords(req, res, next));
router.get('/:id/propagation-records', (req, res, next) => seedSourceController.getPropagationRecords(req, res, next));
router.post('/:id/propagation-records', (req, res, next) => seedSourceController.addPropagationRecord(req, res, next));
router.put('/:id/propagation-stage', (req, res, next) => seedSourceController.updatePropagationStage(req, res, next));
router.post('/:id/complete-propagation', (req, res, next) => seedSourceController.completePropagation(req, res, next));

// 扣减可用数量（育苗新增时调用，2026-06-05 新增）
router.post('/:id/decrease-available', (req, res, next) => seedSourceController.decreaseAvailable(req, res, next));

// 检查种源是否可删除（C8：下沉到 repository，补全所有引用方）
// 引用方：seedlings.source_id / propagation_records.seed_source_id / seed_source_print_records.seed_source_id / plantings.linked_planting_id
router.get('/:id/check-deletable', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await seedSourceRepository.checkDeletable(id);
  res.json({ success: true, data });
}));

// 打印记录相关路由
// 获取打印记录
router.get('/:id/print-records', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const records = db.exec(`
    SELECT * FROM seed_source_print_records
    WHERE seed_source_id = ?
    ORDER BY print_time DESC
  `, [id]);
  const data = records.length > 0 ? records[0].values.map(row => {
    const obj: any = {};
    records[0].columns.forEach((col, idx) => obj[col] = row[idx]);
    if (obj.label_numbers) obj.label_numbers = JSON.parse(obj.label_numbers);
    return obj;
  }) : [];
  res.json({ success: true, data });
}));

// 创建打印记录
router.post('/:id/print', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { printType, printCount, operator, labelNumbers } = req.body;
  const db = getDatabase();

  // 生成打印记录ID
  const recordId = `SPR${Date.now()}`;
  const now = new Date().toISOString();

  // 插入打印记录
  db.run(`
    INSERT INTO seed_source_print_records (id, seed_source_id, print_type, print_count, operator, label_numbers, print_time, create_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [recordId, id, printType || 'new', printCount || 1, operator || '', JSON.stringify(labelNumbers || []), now, now]);

  // 更新种源的打印次数
  db.run(`UPDATE seed_sources SET print_count = print_count + ? WHERE id = ?`, [printCount || 1, id]);

  saveDatabase();
  res.json({ success: true, data: { id: recordId, printCount: printCount || 1 } });
}));

// ============================================================
// V2 改造: 回流闭环路由 (任务 9: Phase 2) - 必须在 /:id 路由之前定义
// ============================================================
import { executeCirculation, revokeCirculation, listCirculations } from '../services/circulation.service'

/**
 * POST /api/seed-sources/circulation
 * 执行回流 (PROPAGATION/QUANTITY/DISPOSAL, destination 决定去向)
 */
router.post('/circulation', (req, res) => {
  try {
    const result = executeCirculation(req.body)
    res.json({ success: true, data: result })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

/**
 * GET /api/seed-sources/circulation
 * 查询回流记录 (按 sourceModule/sourceId/parentSourceId 过滤)
 */
router.get('/circulation', (req, res) => {
  try {
    const { sourceModule, sourceId, parentSourceId } = req.query
    const records = listCirculations({
      sourceModule: sourceModule as string | undefined,
      sourceId: sourceId as string | undefined,
      parentSourceId: parentSourceId as string | undefined,
    })
    res.json({ success: true, data: records })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * POST /api/seed-sources/circulation/:id/revoke
 * 撤销回流 (软删除 + 数量回退)
 */
router.post('/circulation/:id/revoke', (req, res) => {
  try {
    revokeCirculation(req.params.id, req.body)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

// 将请求传递给 controller (放在 /circulation 之后, 避免 /circulation 被当成 :id)
router.get('/', (req, res, next) => seedSourceController.getAll(req, res, next));
router.get('/:id', (req, res, next) => seedSourceController.getById(req, res, next));
router.post('/', (req, res, next) => seedSourceController.create(req, res, next));
router.put('/:id', (req, res, next) => seedSourceController.update(req, res, next));
router.delete('/:id', (req, res, next) => seedSourceController.delete(req, res, next));

export default router;
