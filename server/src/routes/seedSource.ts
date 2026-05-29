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

// 可用留种的种植记录（必须在 :id 路由之前，避免被 :id 匹配）
router.get('/available-for-seed-saving', (req, res, next) => seedSourceController.getPlantingsForSeedSaving(req, res, next));

// 繁殖阶段操作（带 :id 参数）
router.get('/:id/propagation-records', (req, res, next) => seedSourceController.getPropagationRecords(req, res, next));
router.post('/:id/propagation-records', (req, res, next) => seedSourceController.addPropagationRecord(req, res, next));
router.put('/:id/propagation-stage', (req, res, next) => seedSourceController.updatePropagationStage(req, res, next));
router.post('/:id/complete-propagation', (req, res, next) => seedSourceController.completePropagation(req, res, next));

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

// 打印记录相关路由
// 获取打印记录
router.get('/:id/print-records', (req, res) => {
  try {
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
  } catch (error) {
    console.error('获取打印记录失败:', error);
    res.status(500).json({ success: false, error: '获取打印记录失败' });
  }
});

// 创建打印记录
router.post('/:id/print', (req, res) => {
  try {
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

    res.json({ success: true, data: { id: recordId, printCount: printCount || 1 } });
  } catch (error) {
    console.error('创建打印记录失败:', error);
    res.status(500).json({ success: false, error: '创建打印记录失败' });
  }
});

// 将请求传递给 controller
router.get('/', (req, res, next) => seedSourceController.getAll(req, res, next));
router.get('/:id', (req, res, next) => seedSourceController.getById(req, res, next));
router.post('/', (req, res, next) => seedSourceController.create(req, res, next));
router.put('/:id', (req, res, next) => seedSourceController.update(req, res, next));
router.delete('/:id', (req, res, next) => seedSourceController.delete(req, res, next));

export default router;
