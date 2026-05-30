/**
 * 质检记录路由
 */
import { Router } from 'express';
import { qualityCheckService } from '../services/qualityCheck.service';

const router = Router();

// 获取交付记录的质检记录列表
router.get('/delivery/:deliveryId', async (req, res) => {
  try {
    const records = await qualityCheckService.getByDeliveryId(req.params.deliveryId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 创建质检记录
router.post('/', async (req, res) => {
  try {
    const id = await qualityCheckService.create(req.body);
    res.json({ id, success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 更新质检记录
router.put('/:id', async (req, res) => {
  try {
    await qualityCheckService.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 删除质检记录
router.delete('/:id', async (req, res) => {
  try {
    await qualityCheckService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
