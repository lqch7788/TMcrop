/**
 * 浇水记录 API 路由
 * 2026-07-20：Phase 1 - 独立浇水 CRUD
 *
 * 设计文档：docs/superpowers/specs/2026-07-20-water-fertilizer-design.md §4.2
 * 8 个端点：generate-code / list / stats / create / detail / update / delete / batch-delete
 */

import { Router } from 'express';
import { wateringService } from '../services/watering.service';

const router = Router();

/**
 * GET /api/watering/generate-code
 * 生成浇水编号 SW+YYYYMMDD-NNNN
 */
router.get('/generate-code', (_req, res) => {
  const code = wateringService.generateCode();
  if (!code) {
    return res.status(500).json({ success: false, error: '生成浇水编号失败' });
  }
  res.json({ success: true, data: { code } });
});

/**
 * GET /api/watering
 * 分页查询浇水记录（支持筛选）
 * Query: page, pageSize, recordType, cropName, greenhouseName, operatorName, startDate, endDate
 */
router.get('/', (req, res, next) => {
  try {
    const page = parseInt(String(req.query.page || 1), 10);
    const pageSize = parseInt(String(req.query.pageSize || 20), 10);
    const filters: Record<string, any> = {};
    if (req.query.recordType) filters.recordType = req.query.recordType;
    if (req.query.cropName) filters.cropName = req.query.cropName;
    if (req.query.greenhouseName) filters.greenhouseName = req.query.greenhouseName;
    if (req.query.operatorName) filters.operatorName = req.query.operatorName;
    if (req.query.startDate) filters.startDate = req.query.startDate;
    if (req.query.endDate) filters.endDate = req.query.endDate;
    const result = wateringService.findAll(filters, page, pageSize);
    res.json({
      success: true,
      data: result.items,
      meta: { total: result.total, page, pageSize },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/watering/:id
 * 单条详情
 */
router.get('/:id', (req, res, next) => {
  try {
    const record = wateringService.findById(req.params.id);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/watering
 * 新增浇水记录（manual 类型）
 */
router.post('/', async (req, res, next) => {
  try {
    const record = await wateringService.create(req.body);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/watering/:id
 * 编辑浇水记录（仅 manual 类型）
 */
router.put('/:id', async (req, res, next) => {
  try {
    const record = await wateringService.update(req.params.id, req.body);
    res.json({ success: true, data: record });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/watering/:id
 * 删除单条（仅 manual 类型）
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await wateringService.remove(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/watering/batch-delete
 * 批量删除（最多 200 条，跳过非 manual）
 */
router.post('/batch-delete', async (req, res, next) => {
  try {
    const { ids } = req.body || {};
    const result = await wateringService.removeBatch(ids);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
