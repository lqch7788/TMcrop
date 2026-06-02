/**
 * 采购计划 API 路由（V3.0 重构 - 薄层适配器）
 * 路由只做 HTTP 适配：参数解析 → service 调用 → 响应格式化
 * 所有业务逻辑、状态校验、字段映射在 PurchasePlanService 中
 *
 * 路由顺序注意事项：
 * - 静态路径（/options, /batch-delete）必须定义在动态路径（/:id）之前
 * - Express 按注册顺序匹配
 */

import { Router, Request, Response } from 'express';
import {
  purchasePlanService,
  type CreatePurchasePlanInput,
  type UpdatePurchasePlanInput,
  type PurchasePlanQuery,
} from '../services/purchasePlan.service';

const router = Router();

/**
 * GET /api/purchase-plans/options
 * 获取下拉选项（状态/优先级/采购类型），供前端统一加载
 * 必须放在 /:id 之前，否则会被 :id 捕获
 */
router.get('/options', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      statuses: purchasePlanService.getStatusOptions(),
      priorities: purchasePlanService.getPriorityOptions(),
      purchaseTypes: purchasePlanService.getPurchaseTypeOptions(),
    },
  });
});

/**
 * GET /api/purchase-plans/next-code
 * 按 PA+YYYYMM+4位流水号 规则获取下一个可用的采购申请批次号
 * 必须放在 /:id 之前
 */
router.get('/next-code', (_req: Request, res: Response) => {
  const result = purchasePlanService.nextPurchaseApplicationCode();
  if (!result.success) {
    return res.status(500).json({ success: false, error: result.error });
  }
  res.json({ success: true, data: result.data });
});

/**
 * GET /api/purchase-plans
 * 查询采购计划列表
 */
router.get('/', async (req: Request, res: Response) => {
  const query: PurchasePlanQuery = {
    planType: req.query.plan_type as string | undefined,
    status: req.query.status as string | undefined,
    approvalStatus: req.query.approval_status as string | undefined,
    departmentName: req.query.department_name as string | undefined,
    applicantName: req.query.applicant_name as string | undefined,
    priority: req.query.priority as string | undefined,
    page: req.query.page as string | undefined,
    limit: req.query.limit as string | undefined,
  };
  const result = await purchasePlanService.list(query);
  if (!result.success) {
    return res.status(500).json({ success: false, error: result.error });
  }
  res.json({
    success: true,
    data: result.data,
    meta: result.meta,
  });
});

/**
 * GET /api/purchase-plans/:id
 * 获取单个采购计划详情
 */
router.get('/:id', async (req: Request, res: Response) => {
  const result = await purchasePlanService.getById(req.params.id);
  if (!result.success) {
    const status = result.error === '采购计划不存在' ? 404 : 500;
    return res.status(status).json({ success: false, error: result.error });
  }
  res.json({ success: true, data: result.data });
});

/**
 * POST /api/purchase-plans
 * 创建采购计划
 */
router.post('/', async (req: Request, res: Response) => {
  const result = await purchasePlanService.create(req.body as CreatePurchasePlanInput);
  if (!result.success) {
    // 业务校验失败 → 400；其他错误 → 500
    const status = result.error?.includes('不允许') || result.error?.includes('不能为空') || result.error?.includes('已存在') || result.error?.includes('无效') ? 400 : 500;
    return res.status(status).json({ success: false, error: result.error });
  }
  res.status(201).json({ success: true, data: result.data });
});

/**
 * PUT /api/purchase-plans/:id
 * 更新采购计划
 */
router.put('/:id', async (req: Request, res: Response) => {
  const result = await purchasePlanService.update(req.params.id, req.body as UpdatePurchasePlanInput);
  if (!result.success) {
    let status = 500;
    if (result.error === '采购计划不存在') status = 404;
    else if (result.error?.includes('不允许') || result.error?.includes('没有需要')) status = 400;
    return res.status(status).json({ success: false, error: result.error });
  }
  res.json({ success: true, data: result.data });
});

/**
 * DELETE /api/purchase-plans/:id
 * 单条删除（带状态校验）
 */
router.delete('/:id', async (req: Request, res: Response) => {
  const result = await purchasePlanService.deleteById(req.params.id);
  if (!result.success) {
    let status = 500;
    if (result.error === '采购计划不存在') status = 404;
    else if (result.error?.includes('不允许')) status = 400;
    return res.status(status).json({ success: false, error: result.error });
  }
  res.json({ success: true, data: result.data });
});

/**
 * PATCH /api/purchase-plans/:id/execution-status
 * 更新采购执行状态（4 档：pending_execution / purchasing / completed / cancelled）
 */
router.patch('/:id/execution-status', async (req: Request, res: Response) => {
  const { executionStatus } = req.body || {};
  if (!executionStatus || typeof executionStatus !== 'string') {
    return res.status(400).json({ success: false, error: '执行状态不能为空' });
  }
  const result = await purchasePlanService.updateExecutionStatus(req.params.id, executionStatus);
  if (!result.success) {
    const status = result.error?.includes('不存在') ? 404
      : result.error?.includes('无效') ? 400
      : 500;
    return res.status(status).json({ success: false, error: result.error });
  }
  res.json({ success: true, data: result.data });
});

/**
 * POST /api/purchase-plans/batch-delete
 * 批量删除（每条单独校验状态）
 * 路径是 /batch-delete（具体路径），与 /:id 不冲突；但建议放在 :id 之后以保持代码组织清晰
 */
router.post('/batch-delete', async (req: Request, res: Response) => {
  const { ids } = req.body || {};
  const result = await purchasePlanService.deleteMany(ids);
  if (!result.success) {
    return res.status(400).json({ success: false, error: result.error });
  }
  // 即便有跳过，也返回 200，由前端根据 skipped 数量提示用户
  res.json({
    success: true,
    data: result.data,
    message: `成功删除 ${result.data?.deleted || 0} 个采购计划${(result.data?.skipped.length || 0) > 0 ? `，跳过 ${result.data?.skipped.length} 个不允许删除的` : ''}`,
  });
});

export default router;
