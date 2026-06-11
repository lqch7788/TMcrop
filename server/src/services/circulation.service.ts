/**
 * 回流服务 circulationService (任务 7: Phase 2 业务逻辑)
 *
 * 3 种 circulationType:
 * - PROPAGATION (代际型): 建新种源 + 关联 parent_source_id
 * - QUANTITY (数量型): 原种源 remaining_quantity += quantity (V1.1 实际字段名, 非 availableCount)
 * - DISPOSAL (废弃): 只写记录, 不动种源
 *
 * 2 种 destination (2026-06-11 用户决策):
 * - seed_source (默认): 回流到种源管理模块 (内部种源仓库)
 * - inventory_stock: 回流后入作物库存 (对外可销售)
 *
 * 软删除:
 * - is_revoked=1 + 库存/种源数量回退
 * - PROPAGATION 撤销: 保留新种源 7 天可恢复窗口
 */
import { getDatabase, saveDatabase } from '../db';
import { formatLocalDateISO } from '../utils/dateUtil';
import { z } from 'zod';

// ============================================================
// Zod Schemas
// ============================================================

export const CirculationTypeEnum = z.enum(['PROPAGATION', 'QUANTITY', 'DISPOSAL']);
export const SourceModuleEnum = z.enum(['planting', 'harvest', 'seedling']);
export const DestinationEnum = z.enum(['seed_source', 'inventory_stock']);
export const PropagationSubTypeEnum = z.enum(['cutting', 'seed_saving', 'g0_g1']);

export const CirculationInputSchema = z.object({
  circulationType: CirculationTypeEnum,
  sourceModule: SourceModuleEnum,
  sourceId: z.string().min(1),
  parentSourceId: z.string().min(1),
  subType: PropagationSubTypeEnum.optional(),
  destination: DestinationEnum.default('seed_source'),
  warehouseId: z.string().optional(),
  quantity: z.number().nonnegative().optional(),
  unit: z.string().optional(),
  notes: z.string().optional(),
  operatorId: z.string().optional(),
});

export type CirculationInput = z.infer<typeof CirculationInputSchema>;

export interface CirculationResult {
  circulationId: string;
  newSourceId?: string;
  stockId?: string;
}

// ============================================================
// 业务规则
// ============================================================

/**
 * PROPAGATION 路径的 source_origin 派生规则
 */
function deriveOriginFromContext(input: CirculationInput): string {
  if (input.subType === 'cutting') return 'cutting'
  if (input.subType === 'seed_saving') return 'internal_seed'
  if (input.subType === 'g0_g1') return 'seedling_split'
  // 默认按 sourceModule 派生
  return input.sourceModule === 'harvest' ? 'internal_seed' : 'seedling_split'
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

// ============================================================
// executeCirculation 主函数
// ============================================================

/**
 * 执行回流
 * @throws Error 参数校验失败或业务规则违反
 */
export function executeCirculation(rawInput: unknown): CirculationResult {
  const input = CirculationInputSchema.parse(rawInput)

  // PROPAGATION 必须填 subType
  if (input.circulationType === 'PROPAGATION' && !input.subType) {
    throw new Error('PROPAGATION 类型必须填 subType (cutting/seed_saving/g0_g1)')
  }
  // PROPAGATION 只能 destination=seed_source (代际型只能回种源, 不能入库存)
  // 这一条必须优先于 warehouseId 校验, 否则 PROPAGATION+inventory_stock+无 warehouseId 报"必须填 warehouseId" 而非"只能 seed_source"
  if (input.circulationType === 'PROPAGATION' && input.destination === 'inventory_stock') {
    throw new Error('PROPAGATION 类型只能 destination=seed_source (代际型只能回种源)')
  }
  // destination=inventory_stock 必须填 warehouseId + quantity
  if (input.destination === 'inventory_stock' && !input.warehouseId) {
    throw new Error('destination=inventory_stock 必须填 warehouseId')
  }
  if (input.destination === 'inventory_stock' && (input.quantity === undefined || input.quantity <= 0)) {
    throw new Error('destination=inventory_stock 必须填 quantity > 0')
  }

  const db = getDatabase()
  const circId = generateId('CIRC')

  // 业务规则:
  // 1. PROPAGATION: 始终回种源 (建新种源), 不入库存
  if (input.circulationType === 'PROPAGATION') {
    if (input.destination === 'inventory_stock') {
      throw new Error('PROPAGATION 类型只能 destination=seed_source (代际型只能回种源)')
    }
    return executePropagation(input, circId)
  }

  // 2. QUANTITY: 按 destination 决定回种源还是入库存
  if (input.circulationType === 'QUANTITY') {
    if (input.destination === 'inventory_stock') {
      return executeQuantityToInventory(input, circId)
    }
    return executeQuantityToSeedSource(input, circId)
  }

  // 3. DISPOSAL: 只写记录, 不动种源
  return executeDisposal(input, circId)
}

function executePropagation(input: CirculationInput, circId: string): CirculationResult {
  const db = getDatabase()
  const newSourceId = generateId('SRC')
  const newOrigin = deriveOriginFromContext(input)
  const circulationDate = formatLocalDateISO()

  db.run(`
    INSERT INTO seed_sources
    (id, source_code, source_type, source_origin, parent_source_id, remaining_quantity, status, create_time)
    VALUES (?, ?, 'seed', ?, ?, 0, 'active', datetime('now','localtime'))
  `, [newSourceId, `SRC-${Date.now()}`, newOrigin, input.parentSourceId])

  db.run(`
    INSERT INTO crop_circulation_records
    (id, circulation_type, source_module, source_id, parent_source_id, new_source_id, unit, circulation_date, operator_id, notes)
    VALUES (?, 'PROPAGATION', ?, ?, ?, ?, ?, ?, ?, ?)
  `, [circId, input.sourceModule, input.sourceId, input.parentSourceId, newSourceId, input.unit, circulationDate, input.operatorId, input.notes])

  saveDatabase()
  return { circulationId: circId, newSourceId }
}

function executeQuantityToSeedSource(input: CirculationInput, circId: string): CirculationResult {
  const db = getDatabase()
  const quantity = input.quantity ?? 0
  const circulationDate = formatLocalDateISO()

  db.run(`UPDATE seed_sources SET remaining_quantity = remaining_quantity + ? WHERE id = ?`, [quantity, input.parentSourceId])

  db.run(`
    INSERT INTO crop_circulation_records
    (id, circulation_type, source_module, source_id, parent_source_id, quantity, unit, circulation_date, operator_id, notes)
    VALUES (?, 'QUANTITY', ?, ?, ?, ?, ?, ?, ?, ?)
  `, [circId, input.sourceModule, input.sourceId, input.parentSourceId, quantity, input.unit, circulationDate, input.operatorId, input.notes])

  saveDatabase()
  return { circulationId: circId }
}

function executeQuantityToInventory(input: CirculationInput, circId: string): CirculationResult {
  const db = getDatabase()
  const quantity = input.quantity ?? 0
  const circulationDate = formatLocalDateISO()

  // 写 crop_circulation_records (DISPOSAL 类似, 但 disposition='SALES' 表示可销售)
  db.run(`
    INSERT INTO crop_circulation_records
    (id, circulation_type, source_module, source_id, parent_source_id, quantity, unit, circulation_date, operator_id, notes, disposition)
    VALUES (?, 'QUANTITY', ?, ?, ?, ?, ?, ?, ?, ?, 'SALES')
  `, [circId, input.sourceModule, input.sourceId, input.parentSourceId, quantity, input.unit, circulationDate, input.operatorId, input.notes])

  // 同步写 inventory_stock (残株入库, stock_type='residue', business_type='circulation')
  const stockId = generateId('STK')
  db.run(`
    INSERT INTO inventory_stock
    (id, stock_type, business_id, business_type, current_quantity, available_quantity, unit, warehouse_id, status, create_time)
    VALUES (?, 'residue', ?, 'circulation', ?, ?, ?, ?, 'active', datetime('now','localtime'))
  `, [stockId, circId, quantity, input.unit, input.warehouseId])

  saveDatabase()
  return { circulationId: circId, stockId }
}

function executeDisposal(input: CirculationInput, circId: string): CirculationResult {
  const db = getDatabase()
  const quantity = input.quantity ?? 0
  const circulationDate = formatLocalDateISO()

  db.run(`
    INSERT INTO crop_circulation_records
    (id, circulation_type, source_module, source_id, parent_source_id, quantity, unit, circulation_date, operator_id, notes, disposition)
    VALUES (?, 'DISPOSAL', ?, ?, ?, ?, ?, ?, ?, ?, 'DISPOSAL')
  `, [circId, input.sourceModule, input.sourceId, input.parentSourceId, quantity, input.unit, circulationDate, input.operatorId, input.notes])

  saveDatabase()
  return { circulationId: circId }
}

// ============================================================
// revokeCirculation 软删除
// ============================================================

export const RevokeInputSchema = z.object({
  reason: z.string().min(1, { message: '撤销原因必填' }),
  operatorId: z.string().min(1, { message: '操作员 ID 必填' }),
});

/**
 * 撤销回流 (软删除)
 * - 标记 is_revoked=1 + revoked_at + revoked_by + notes(原因)
 * - QUANTITY 撤销: 回退 inventory_stock.quantity 或 seed_sources.remaining_quantity
 * - PROPAGATION 撤销: 保留新种源 7 天可恢复窗口 (本期不实现物理删除)
 */
export function revokeCirculation(circId: string, rawInput: unknown): void {
  const input = RevokeInputSchema.parse(rawInput)
  const db = getDatabase()
  const circ = db.prepare(`SELECT * FROM crop_circulation_records WHERE id = ?`).get(circId) as any
  if (!circ) throw new Error('回流记录不存在')
  if (circ.is_revoked) throw new Error('回流已撤销')

  // 回退数量
  if (circ.circulation_type === 'QUANTITY' && circ.quantity && circ.disposition !== 'SALES') {
    // 回退到种源
    db.run(`UPDATE seed_sources SET remaining_quantity = remaining_quantity - ? WHERE id = ?`, [circ.quantity, circ.parent_source_id])
  }
  // QUANTITY + disposition='SALES' 撤销: 同时回退 inventory_stock (本期不实现, 留待 Phase 2 扩展)
  // PROPAGATION 撤销: 标记 is_revoked, 新种源记录保留 7 天可恢复窗口

  // 软删除标记
  db.run(`
    UPDATE crop_circulation_records
    SET is_revoked = 1, revoked_at = ?, revoked_by = ?, notes = ?
    WHERE id = ?
  `, [formatLocalDateISO(), input.operatorId, input.reason, circId])

  saveDatabase()
}

// ============================================================
// 业务便捷函数
// ============================================================

/**
 * 查询回流记录 (按 sourceId 或 parentSourceId 过滤)
 * 注: sql.js 用 step() + getAsObject() 遍历结果, 不用 .all()
 */
export function listCirculations(filter: { sourceModule?: string; sourceId?: string; parentSourceId?: string }): any[] {
  const db = getDatabase()
  const conditions: string[] = []
  const params: any[] = []
  if (filter.sourceModule) { conditions.push('source_module = ?'); params.push(filter.sourceModule) }
  if (filter.sourceId) { conditions.push('source_id = ?'); params.push(filter.sourceId) }
  if (filter.parentSourceId) { conditions.push('parent_source_id = ?'); params.push(filter.parentSourceId) }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const stmt = db.prepare(`SELECT * FROM crop_circulation_records ${where} ORDER BY created_at DESC`)
  stmt.bind(params)
  const records: any[] = []
  while (stmt.step()) {
    records.push(stmt.getAsObject())
  }
  stmt.free()
  return records
}
