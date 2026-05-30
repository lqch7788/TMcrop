/**
 * 库存冻结路由
 */
import { Router } from 'express';
import { inventoryFreezeService } from '../services/inventoryFreeze.service';

const router = Router();

// 获取订单的库存冻结记录列表
router.get('/order/:orderId', async (req, res) => {
  try {
    const records = await inventoryFreezeService.getByOrderId(req.params.orderId);
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 创建库存冻结记录
router.post('/', async (req, res) => {
  try {
    const id = await inventoryFreezeService.create(req.body);
    res.json({ id, success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 使用冻结库存
router.post('/:id/use', async (req, res) => {
  try {
    const { quantity } = req.body;
    await inventoryFreezeService.use(req.params.id, quantity);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 释放冻结库存
router.post('/:id/release', async (req, res) => {
  try {
    await inventoryFreezeService.release(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 删除冻结记录
router.delete('/:id', async (req, res) => {
  try {
    await inventoryFreezeService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
