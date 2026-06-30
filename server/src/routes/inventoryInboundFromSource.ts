/**
 * 行级采收入库路由（Phase 2）
 *
 * POST /api/inventory/inbound-from-source
 *
 * 接收 3 类源记录（种源/育苗/种植）的行级采收入库数据，
 * 完整执行 4 步写入（harvest_records + inventory_stock + inventory_inbound_records + inventory_transaction）
 *
 * 路由必须在 inventory.ts 的 /:id 之前挂载（避免被通配截胡）
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  executeInboundFromSource,
  type InboundFromSourceInput,
  type StockType,
  type SourceModule,
} from '../services/inventoryInboundFromSource.service';

const router = Router();

/**
 * Zod 校验 schema
 * - stockType ∈ {seed, seedling, product}
 * - sourceModule ∈ {seed_source, seedling, planting}
 * - sourceModule 与 stockType 一致性校验：
 *   - seed_source → seed
 *   - seedling → seedling
 *   - planting → product
 * - products[] 至少 1 条
 * - harvestDate ≤ 今天
 * - warehouseId 必填
 */
const ProductSchema = z.object({
  cropCode: z.string().optional(),
  cropName: z.string().min(1, { message: '产品名必填' }),
  cropVariety: z.string().optional(),
  plantingMode: z.string().optional(),
  harvestQuantity: z.number().positive({ message: '采收数量必须 > 0' }),
  unit: z.string().min(1, { message: '单位必填' }),
  targetYield: z.number().nonnegative().optional(),
  grade: z.string().optional(),
  auditor: z.string().optional(),
  remarks: z.string().optional(),
  // 2026-06-19: 形态/类型字段
  productForm: z.string().optional(),  // 采收形态（果实/籽/枝条等）
  sourceForm: z.string().optional(),   // 育苗/种植产物类型
});

const InboundFromSourceSchema = z.object({
  stockType: z.enum(['seed', 'seedling', 'product']),
  sourceModule: z.enum(['seed_source', 'seedling', 'planting']),
  // 2026-06-27: 种源入库专用 — 用户选的入库来源（外购/自产/内部）
  inboundSourceType: z.string().optional(),
  sourceRecordId: z.string().min(1, { message: '源记录 ID 必填' }),
  sourceRecordCode: z.string().min(1, { message: '源记录 code 必填' }),
  harvestDate: z.string().min(1, { message: '采收日期必填' }),
  greenhouseIds: z.array(z.string()).optional(),
  greenhouseNames: z.array(z.string()).optional(),
  harvesterIds: z.array(z.string()).optional(),
  harvesterNames: z.array(z.string()).optional(),
  operator: z.string().optional(),
  remarks: z.string().optional(),
  // 2026-06-30 Bug 18：删除 saleType 字段（无业务用途 + 污染 inbound_type 列）
  isSupplementary: z.boolean().optional(),
  supplementaryReason: z.string().optional(),
  unitPrice: z.number().nonnegative({ message: '单价不能为负' }).max(1000000, { message: '单价不能超过 1,000,000' }).optional(),
  unit: z.string().min(1, { message: '单位必填' }),
  warehouseId: z.string().min(1, { message: '仓库 ID 必填' }),
  warehouseName: z.string().optional(),
  products: z.array(ProductSchema).min(1, { message: '至少需要 1 条产品明细' }),
  operatorName: z.string().optional(),
  // 2026-06-19: 种源形态（仅种源行入库必填）
  propagationForm: z.string().optional(),
});

/**
 * 校验 sourceModule 与 stockType 一致性
 */
function validateSourceModuleStockType(sourceModule: SourceModule, stockType: StockType): string | null {
  if (sourceModule === 'seed_source' && stockType !== 'seed') return '种源行 stockType 必须为 "seed"';
  if (sourceModule === 'seedling' && stockType !== 'seedling') return '育苗行 stockType 必须为 "seedling"';
  if (sourceModule === 'planting' && stockType !== 'product') return '种植行 stockType 必须为 "product"';
  return null;
}

/**
 * POST /api/inventory/inbound-from-source
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // 1. Zod 校验
    const parsed = InboundFromSourceSchema.safeParse(req.body);
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
    const input: InboundFromSourceInput = parsed.data;

    // 2. sourceModule ↔ stockType 一致性校验
    const consistencyError = validateSourceModuleStockType(input.sourceModule, input.stockType);
    if (consistencyError) {
      return res.status(400).json({ success: false, error: consistencyError });
    }

    // 3. isSupplementary 时 supplementaryReason 必填
    if (input.isSupplementary && !input.supplementaryReason) {
      return res.status(400).json({ success: false, error: 'isSupplementary=true 时 supplementaryReason 必填' });
    }

    // 3.5 种源行入库时 propagationForm 必填（种源形态：种子/种苗/实生苗/扦插苗/嫁接苗/组培苗/分株苗/种球/球根）
    if (input.sourceModule === 'seed_source' && !input.propagationForm) {
      return res.status(400).json({
        success: false,
        error: '种源行入库必须填写种源形态（propagationForm）：种子/种苗/实生苗/扦插苗/嫁接苗/组培苗/分株苗/种球/球根',
      });
    }

    // 3.6 2026-06-26: 种源入库单位必须与种源记录单位一致（前端已自动锁定，后端兜底）
    if (input.sourceModule === 'seed_source') {
      const { getDatabase } = await import('../db');
      const db = getDatabase();
      const ssStmt = db.prepare('SELECT unit, source_code FROM seed_sources WHERE id = ? AND deleted_at IS NULL');
      ssStmt.bind([input.sourceRecordId]);
      const ss = ssStmt.step() ? (ssStmt.getAsObject() as any) : null;
      ssStmt.free();
      if (!ss) {
        return res.status(404).json({ success: false, error: '种源不存在或已删除' });
      }
      const seedUnit = String(ss.unit || '');
      const seedCode = String(ss.source_code || '');
      if (seedUnit && input.unit && seedUnit !== input.unit) {
        return res.status(400).json({
          success: false,
          error: `单位不一致：种源 ${seedCode} 单位为 ${seedUnit}，请求单位为 ${input.unit}`,
        });
      }
      for (const p of input.products || []) {
        if (seedUnit && p.unit && p.unit !== seedUnit) {
          return res.status(400).json({
            success: false,
            error: `产品单位不一致：种源单位 ${seedUnit} ≠ 产品单位 ${p.unit}`,
          });
        }
      }
    }

    // 4. harvestDate 不能晚于今天
    const today = new Date().toISOString().slice(0, 10);
    if (input.harvestDate > today) {
      return res.status(400).json({ success: false, error: '采收日期不能晚于今天' });
    }

    // 5. 执行 4 步写入（事务 + 回滚在 service 层）
    const result = await executeInboundFromSource(input);
    res.status(201).json({ success: true, data: result });
  } catch (e: any) {
    console.error('[POST /inventory/inbound-from-source]', e);
    res.status(500).json({ success: false, error: e?.message || '行级采收入库失败' });
  }
});

export default router;
