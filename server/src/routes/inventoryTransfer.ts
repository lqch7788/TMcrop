/**
 * 库存调拨入种源路由（2026-06-24）
 *
 * POST /api/inventory/transfer-to-source
 *   - 入参：{ items: [{ sourceStockId, transferQuantity, unit }, ...] }
 *   - 业务：多选 3 种 stock_type 库存 → 调入种源（移动语义）
 *
 * GET /api/inventory/transferable-sources
 *   - Query: stockType=seed,seedling,product & keyword=... & dateFrom=... & dateTo=...
 *   - 返回可调拨库存列表
 *
 * 路由必须在 inventory.ts 的 /:id 之前挂载（避免被通配截胡）
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  executeTransferToSource,
  listTransferableSources,
  InventoryTransferBusinessError,
  InventoryTransferErrorCode,
  type TransferInput,
  type TransferStockType,
} from '../services/inventoryTransfer.service';

const router = Router();

// ============ Zod Schemas ============

const TransferItemSchema = z.object({
  sourceStockId: z.union([z.string().min(1), z.number().int().positive()], {
    error: 'sourceStockId 必填（字符串或正整数）',
  }),
  transferQuantity: z.number().int().positive({ message: '调拨数量必须为正整数' }).max(1e7, { message: '调拨数量单次最多 10000000' }),
  unit: z.string().min(1, { message: '调拨单位必填' }),
});

const TransferToSourceSchema = z.object({
  items: z.array(TransferItemSchema).min(1, { message: '至少需要 1 条调拨明细' }).max(100, { message: '批量调拨单次最多 100 条' }),
  operatorId: z.string().optional(),
  operatorName: z.string().optional(),
});

const ListTransferableQuerySchema = z.object({
  stockType: z.string().optional(),          // 逗号分隔: "seed,seedling,product"
  keyword: z.string().optional(),
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateFrom 格式必须为 YYYY-MM-DD' }).optional(),
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateTo 格式必须为 YYYY-MM-DD' }).optional(),
  // P2-8 修复：分页参数
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  // 2026-06-26 修复：追加模式作物过滤（避免显示不相关作物的库存）
  cropName: z.string().optional(),
  cropVariety: z.string().optional(),
});

// ============ 路由处理器 ============

/**
 * POST /api/inventory/transfer-to-source
 * Body: { items: TransferItem[], operatorId?, operatorName? }
 */
router.post('/transfer-to-source', async (req: Request, res: Response) => {
  try {
    // 1. Zod 校验
    const parsed = TransferToSourceSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues: any[] = (parsed.error as any)?.issues || (parsed.error as any)?.errors || [];
      const firstMsg = issues[0]?.message || '参数校验失败';
      const firstPath = Array.isArray(issues[0]?.path) ? issues[0].path.join('.') : '';
      return res.status(400).json({
        success: false,
        error: firstPath ? `${firstPath}: ${firstMsg}` : firstMsg,
        issues,
      });
    }
    const { items, operatorId, operatorName } = parsed.data;

    // P1-6 修复：操作员信息优先级 — req.user (JWT) > body > system
    // 防止前端伪冒其他用户名（operatorId/operatorName 仅作 fallback）
    const userFromJwt = (req as any).user as { id?: string; name?: string } | undefined;
    const operator = {
      id: userFromJwt?.id || operatorId || 'system',
      name: userFromJwt?.name || operatorName || userFromJwt?.id || 'system',
    };

    // 2. 执行调拨事务（service 层含业务校验 + 5 步写入 + 原子回滚）
    const results = await executeTransferToSource(items as TransferInput[], operator);
    res.status(201).json({ success: true, data: results });
  } catch (e: any) {
    // P1-5：InventoryTransferBusinessError 直接错误（4xx）
    if (e instanceof InventoryTransferBusinessError) {
      console.warn('[POST /inventory/transfer-to-source] business error:', e.code, e.message);
      return res.status(e.httpStatus).json({ success: false, code: e.code, error: e.message });
    }
    // P1-5：wrapped error（含 rollback 失败信息，code 来自 InventoryTransferBusinessError）
    if (e && typeof e === 'object' && 'code' in e && 'httpStatus' in e) {
      const wrapped = e as { code: string; httpStatus: number; message: string };
      console.error('[POST /inventory/transfer-to-source] wrapped error:', wrapped.code, wrapped.message);
      return res.status(wrapped.httpStatus).json({
        success: false,
        code: wrapped.code,
        error: wrapped.message,
      });
    }
    console.error('[POST /inventory/transfer-to-source] server error:', e);
    res.status(500).json({ success: false, error: e?.message || '库存调拨失败' });
  }
});

/**
 * GET /api/inventory/transferable-sources
 * Query: stockType?, keyword?, dateFrom?, dateTo?
 */
router.get('/transferable-sources', async (req: Request, res: Response) => {
  try {
    // 1. Query 参数校验
    const parsed = ListTransferableQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      const issues: any[] = (parsed.error as any)?.issues || (parsed.error as any)?.errors || [];
      const firstMsg = issues[0]?.message || 'Query 参数校验失败';
      return res.status(400).json({ success: false, error: firstMsg, issues });
    }
    const { stockType, keyword, dateFrom, dateTo, limit, offset, cropName, cropVariety } = parsed.data;

    // 2. stockType 字符串解析
    let stockTypeFilter: TransferStockType[] | undefined;
    if (stockType) {
      stockTypeFilter = stockType.split(',').map(s => s.trim()).filter(Boolean) as TransferStockType[];
      const validTypes: TransferStockType[] = ['seed', 'seedling', 'product'];
      const invalid = stockTypeFilter.filter(t => !validTypes.includes(t));
      if (invalid.length > 0) {
        return res.status(400).json({
          success: false,
          error: `无效的 stockType: ${invalid.join(',')}，仅支持 seed/seedling/product`,
        });
      }
    }

    // 3. 调用 service（带分页）
    const rows = await listTransferableSources({
      stockType: stockTypeFilter,
      keyword,
      dateFrom,
      dateTo,
      limit,
      offset,
      cropName,
      cropVariety,
    });
    res.json({
      success: true,
      data: rows,
      meta: { total: rows.length, limit, offset },
    });
  } catch (e: any) {
    console.error('[GET /inventory/transferable-sources]', e);
    res.status(500).json({ success: false, error: e?.message || '查询可调拨库存失败' });
  }
});

// 暴露错误码常量，方便测试参考
export { InventoryTransferErrorCode };

export default router;
