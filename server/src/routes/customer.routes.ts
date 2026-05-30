/**
 * 客户档案路由
 */
import { Router } from 'express';
import { customerService } from '../services/customer.service';

const router = Router();

// 获取客户列表
router.get('/', async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const result = await customerService.getCustomers({
      search: search as string,
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 获取客户详情
router.get('/:id', async (req, res) => {
  try {
    const customer = await customerService.getById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: '客户不存在' });
    }
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 创建客户
router.post('/', async (req, res) => {
  try {
    const id = await customerService.create(req.body);
    const customer = await customerService.getById(id);
    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 更新客户
router.put('/:id', async (req, res) => {
  try {
    await customerService.update(req.params.id, req.body);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// 删除客户
router.delete('/:id', async (req, res) => {
  try {
    await customerService.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
