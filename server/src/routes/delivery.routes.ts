/**
 * 交付记录路由
 */
import { Router } from 'express';
import { deliveryRecordService } from '../services/deliveryRecord.service';

const router = Router();

// 获取订单的交付记录列表
router.get('/order/:orderId', async (req, res) => {
  try {
    const records = await deliveryRecordService.getByOrderId(req.params.orderId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 创建交付记录
router.post('/', async (req, res) => {
  try {
    const id = await deliveryRecordService.create(req.body);
    res.json({ id, success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 更新交付记录
router.put('/:id', async (req, res) => {
  try {
    await deliveryRecordService.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 删除交付记录
router.delete('/:id', async (req, res) => {
  try {
    await deliveryRecordService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
