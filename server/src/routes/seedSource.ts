/**
 * 种源路由
 * 精简为直接调用 Controller
 */

import { Router } from 'express';
import { seedSourceController } from '../controllers/seedSource.controller';
import { getDatabase } from '../db';

const router = Router();

// 注意：generate-code 和 batch 路由必须在 :id 路由之前，否则会被 :id 匹配

// 生成种源编码
router.get('/generate-code', (req, res, next) => seedSourceController.generateCode(req, res, next));

// 批量删除路由必须在 /:id 之前
router.delete('/batch', (req, res, next) => seedSourceController.deleteBatch(req, res, next));

// 检查种源是否可删除（被育苗引用则不可删）
router.get('/:id/check-deletable', (req, res) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const cntResult = db.exec('SELECT COUNT(*) as cnt FROM seedlings WHERE source_id = ?', [id]);
    const refCount = Number(cntResult[0]?.values[0]?.[0]) || 0;
    res.json({ success: true, data: { deletable: refCount === 0, refCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: '检查失败' });
  }
});

// 将请求传递给 controller
router.get('/', (req, res, next) => seedSourceController.getAll(req, res, next));
router.get('/:id', (req, res, next) => seedSourceController.getById(req, res, next));
router.post('/', (req, res, next) => seedSourceController.create(req, res, next));
router.put('/:id', (req, res, next) => seedSourceController.update(req, res, next));
router.delete('/:id', (req, res, next) => seedSourceController.delete(req, res, next));

export default router;
