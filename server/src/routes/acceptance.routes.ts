/**
 * 验收记录路由
 */
import { Router } from 'express';
import { acceptanceService } from '../services/acceptance.service';

const router = Router();

// 获取交付记录的验收记录列表
router.get('/delivery/:deliveryId', async (req, res) => {
  try {
    const records = await acceptanceService.getByDeliveryId(req.params.deliveryId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 创建验收记录
router.post('/', async (req, res) => {
  try {
    const id = await acceptanceService.create(req.body);
    res.json({ id, success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 更新验收记录
router.put('/:id', async (req, res) => {
  try {
    await acceptanceService.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 删除验收记录
router.delete('/:id', async (req, res) => {
  try {
    await acceptanceService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
