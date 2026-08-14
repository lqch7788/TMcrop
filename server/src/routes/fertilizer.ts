/**
 * 施肥管理 API 路由
 * 施肥记录 CRUD + 统计分析 + IoT数据接入
 * V10.0 新增
 * G11 V1.1：路由层改调 fertilizerService（含事务 + 库存扣减）
 *
 * 2026-07-16 全面重构：
 * - 删除 route 内 inline generateFertilizerCode / toCamelResponse（重复实现）
 * - GET /、/stats、/:id 路由改用 service + repository，不再直写 SQL
 * - 9 处 catch 块抽 handleError helper：BusinessError 友好错误 + 5xx 脱敏
 */
import { Router, Request, Response } from 'express';
import { iotAuth } from '../middleware/iotAuth';
import { iotIngestSchema } from '../validation/iotIngest';
import { fertilizerService, BusinessError } from '../services/fertilizer.service';

const router = Router();

/**
 * 统一错误处理（修 P0：UI 错误脱敏 — 不向用户泄露内部堆栈/SQL）
 */
function handleError(res: Response, error: unknown, logTag: string, fallback: string): void {
  console.error(`[${logTag}]`, error);
  if (error instanceof BusinessError) {
    res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
    return;
  }
  res.status(500).json({ success: false, error: fallback });
}

/** GET /api/fertilizer/generate-code — 调 service.generateCode（消除与 service 重复实现） */
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const code = fertilizerService.generateCode();
    if (!code) {
      res.status(500).json({ success: false, error: '生成编号失败，请稍后重试' });
      return;
    }
    res.json({ success: true, data: { code } });
  } catch (error) {
    handleError(res, error, 'generate-code', '生成编号失败');
  }
});

/** POST /api/fertilizer/batch-delete — 批量删除（G11：service.removeBatch 含事务 + 库存恢复） */
router.post('/batch-delete', async (req: Request, res: Response) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const result = await fertilizerService.removeBatch(ids);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'batch-delete', '批量删除失败');
  }
});

/** GET /api/fertilizer — 分页查询（repository.findAll 替代内联 SQL） */
router.get('/', (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(q.page ?? '1', 10) || 1);
    // 2026-08-14：上限 100 → 1000（前端全量加载 limit=500 曾被截到 100，数据超 100 条静默丢列表）
    const limitNum = Math.min(1000, Math.max(1, parseInt(q.limit ?? '20', 10) || 20));
    // 2026-07-16：service.findAll 包含所有筛选 + 分页
    const list = fertilizerService.findAll(q, pageNum, limitNum);
    res.json({ success: true, data: list.rows, meta: { total: list.total, page: pageNum, limit: limitNum } });
  } catch (error) {
    handleError(res, error, 'list', '查询失败');
  }
});

/** POST /api/fertilizer — 新增（service.apply 含事务 + 库存扣减） */
router.post('/', async (req: Request, res: Response) => {
  try {
    // 2026-07-16：service.apply 内部用 Zod 校验，这里不再二层校验
    const record = await fertilizerService.apply(req.body);
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    handleError(res, error, 'create', '新建失败');
  }
});

/** GET /api/fertilizer/stats — 统计（repository.findStats 替代内联 SQL） */
router.get('/stats', (req: Request, res: Response) => {
  try {
    const q = req.query as Record<string, string>;
    const items = fertilizerService.findStats(q, q.group_by ?? 'month');
    res.json({ success: true, data: items });
  } catch (error) {
    handleError(res, error, 'stats', '统计失败');
  }
});

/** POST /api/fertilizer/iot-ingest — IoT数据接入（service.ingestIot 含事务） */
router.post('/iot-ingest', iotAuth, async (req: Request, res: Response) => {
  try {
    const parsed = iotIngestSchema.safeParse(req.body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      res.status(400).json({
        success: false,
        error: `请求格式错误：${issue?.path?.join('.') || '?'} ${issue?.message || ''}`,
      });
      return;
    }
    const { device_id, device_name, records } = parsed.data;
    const result = await fertilizerService.ingestIot(device_id!, device_name ?? '', records as any);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'iot-ingest', 'IoT 数据接入失败');
  }
});

/** GET /api/fertilizer/:id — 单条记录（service.findById 替代内联 SQL） */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const record = fertilizerService.findById(req.params.id);
    if (!record) {
      res.status(404).json({ success: false, error: '记录不存在' });
      return;
    }
    res.json({ success: true, data: record });
  } catch (error) {
    handleError(res, error, 'get-one', '查询失败');
  }
});

/** PUT /api/fertilizer/:id — 更新（service.update 含事务 + delta 库存调整） */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updated = await fertilizerService.update(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    handleError(res, error, 'update', '更新失败');
  }
});

/** DELETE /api/fertilizer/:id — 删除（service.remove 含事务 + 库存恢复） */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const result = await fertilizerService.remove(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'delete', '删除失败');
  }
});

export default router;
