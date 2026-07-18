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
import { writeFlowLog } from './flowLogService';
import { SeedSourceRepository } from '../repositories/seedSource.repository';
import { z } from 'zod';

// ============================================================
// Zod Schemas
// ============================================================

export const CirculationTypeEnum = z.enum(['PROPAGATION', 'QUANTITY', 'DISPOSAL']);
export const SourceModuleEnum = z.enum(['planting', 'harvest', 'seedling']);
export const DestinationEnum = z.enum(['seed_source', 'inventory_stock']);
export const PropagationSubTypeEnum = z.enum(['cutting', 'seed_saving', 'g0_g1']);

// 2026-06-29: 种植自留种回流时的采收形态选项（写 seed_sources.seed_form）
// 果实/枝条/穗条/块根/块茎/鳞茎/叶片/花朵/整株 → cutting（取植物体）
// 种子/种苗                                                  → seed_saving
// 其他                                                       → cutting（兜底）
export const SEED_FORM_OPTIONS = [
  '果实', '种子', '种苗', '穗条', '枝条',
  '块根', '块茎', '鳞茎', '叶片', '花朵', '整株', '其他',
] as const;
export type SeedForm = typeof SEED_FORM_OPTIONS[number];

/**
 * 2026-06-29: 根据采收形态派生 PROPAGATION 子类型
 */
export function deriveSeedFormSubType(seedForm: string): 'cutting' | 'seed_saving' {
  const cuttingForms = ['果实', '枝条', '穗条', '块根', '块茎', '鳞茎', '叶片', '花朵', '整株'];
  if (cuttingForms.includes(seedForm)) return 'cutting';
  if (seedForm === '种子' || seedForm === '种苗') return 'seed_saving';
  // 兜底：种植留种操作默认按留种处理（前端已强制选 seedForm，此处仅为安全网）
  return 'seed_saving';
}

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
  // 2026-06-29: 种植自留种回流时存到 seed_sources.seed_form
  seedForm: z.string().optional(),
  // 2026-06-29: 来源单据编号（用于 flow_log 追踪，如 ZZ20260627-001）
  sourceRecordCode: z.string().optional(),
  // 2026-07-18: 用户输入 generation（不参与合并 = null/undefined）
  generation: z.string().optional(),
});

export type CirculationInput = z.infer<typeof CirculationInputSchema>;

export interface CirculationResult {
  circulationId: string;
  newSourceId?: string;
  stockId?: string;
  // 2026-07-18: 种源合并动作标识
  mergeAction?: 'create_new' | 'merge_into_existing';
}

// ============================================================
// 业务规则
// ============================================================

/**
 * PROPAGATION 路径的 source_origin 派生规则
 */
function deriveOriginFromContext(input: CirculationInput): string {
  // 种植留种统一使用 'planting_self_kept'，不再区分 cutting/internal_seed
  if (input.subType === 'cutting' || input.subType === 'seed_saving') return 'planting_self_kept';
  if (input.subType === 'g0_g1') return 'seedling_split';
  return input.sourceModule === 'harvest' ? 'planting_self_kept' : 'seedling_split';
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 2026-06-19: 生成业务编号（残株回种源 / 自交种子入种源时使用）
 * 规则：
 * - 扦插繁殖 → SRC-CUT-YYYYMMDD-XXX（3 位流水号，从 001 开始按日累加）
 * - 留种     → SRC-SS-YYYYMMDD-XXX（3 位流水号，从 001 开始按日累加）
 * - 数量回填 → 不建新种源，编号 = 原种源编号 + 后缀（如 SS-20260101-001+R1）
 */
function generatePropagationCode(method: 'cutting' | 'seed_saving'): string {
  const db = getDatabase()
  const today = formatLocalDateISO().replace(/-/g, '')  // YYYYMMDD
  const prefix = method === 'cutting' ? 'SRC-CUT' : 'SRC-SS'
  const pattern = `${prefix}-${today}-%`

  // 查询今日已生成的最大流水号
  const stmt = db.prepare(
    `SELECT source_code FROM seed_sources
     WHERE source_code LIKE ?
     ORDER BY LENGTH(source_code) DESC, source_code DESC
     LIMIT 1`
  )
  stmt.bind([pattern])
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()

  let seq = 1
  if (row && row.source_code) {
    // 提取末尾 3 位数字
    const m = String(row.source_code).match(/-(\d+)$/)
    if (m) {
      seq = parseInt(m[1], 10) + 1
    }
  }

  return `${prefix}-${today}-${String(seq).padStart(3, '0')}`
}

/**
 * 2026-06-19: 生成数量回填后缀
 * 在原种源编号后追加 +R{N}（N 从 1 开始，按原种源累加）
 * 例如 SS-20260101-001+R1, SS-20260101-001+R2
 *
 * 注：数量回填不建新种源记录（executeQuantityToSeedSource 只 UPDATE remaining_quantity），
 *     该函数保留供未来审计/追溯场景使用
 */
function generateQuantityRefillSuffix(parentSourceCode: string, parentSourceId: string): string {
  const db = getDatabase()
  const pattern = `${parentSourceCode}+R%`

  const stmt = db.prepare(
    `SELECT source_code FROM seed_sources
     WHERE source_code LIKE ?
     ORDER BY LENGTH(source_code) DESC, source_code DESC
     LIMIT 1`
  )
  stmt.bind([pattern])
  const row = stmt.step() ? stmt.getAsObject() : null
  stmt.free()

  let seq = 1
  if (row && row.source_code) {
    const m = String(row.source_code).match(/\+R(\d+)$/)
    if (m) {
      seq = parseInt(m[1], 10) + 1
    }
  }
  return `${parentSourceCode}+R${seq}`
}

// ============================================================
// executeCirculation 主函数
// ============================================================

/**
 * 执行回流
 * @throws Error 参数校验失败或业务规则违反
 */
export async function executeCirculation(rawInput: unknown): Promise<CirculationResult> {
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

async function executePropagation(input: CirculationInput, circId: string): Promise<CirculationResult> {
  const db = getDatabase()
  // 2026-06-19: 用完整 ISO 格式（new Date().toISOString()）作为 create_time/update_time
  const nowISO = new Date().toISOString()
  const circulationDate = formatLocalDateISO()
  const seedQuantity = input.quantity ?? 0
  // 2026-06-29: 种植自留种采收形态 — 写到 seed_sources.seed_form
  const seedForm = input.seedForm || null
  // 2026-07-18: generation 由用户输入决定（非硬编码 F1/无性）
  const generation = input.generation || null

  // ===== Step 1: 读 planting =====
  let planting: any = null
  let sourcePlantingCode: string | null = null
  let sourcePlantingId: string | null = null
  if (input.sourceModule === 'planting' && input.sourceId) {
    const pStmt = db.prepare('SELECT id, planting_code, crop_name, crop_variety, crop_code, source_id, source_type, production_plan_id, production_plan_code FROM plantings WHERE id = ?')
    pStmt.bind([input.sourceId])
    planting = pStmt.step() ? pStmt.getAsObject() : null
    pStmt.free()
    sourcePlantingCode = (planting as any)?.planting_code || null
    sourcePlantingId = (planting as any)?.id || null
  }

  // ===== Step 2: 读 parent（种源 OR 育苗，保留 fallback）=====
  let parent: any = null
  const parentSourceId = planting?.source_id || input.parentSourceId
  if (parentSourceId) {
    const ssStmt = db.prepare('SELECT id, source_name, crop_name, crop_variety, crop_code, crop_category, type_name, variety_name, supplier_id, supplier_name, production_plan_code, unit FROM seed_sources WHERE id = ?')
    ssStmt.bind([parentSourceId])
    parent = ssStmt.step() ? ssStmt.getAsObject() : null
    ssStmt.free()
    // 没找到就查育苗（cutting/seed_saving 可能引用育苗作为 parent）
    if (!parent) {
      const sdStmt = db.prepare('SELECT id, crop_name, crop_variety, crop_code, unit FROM seedlings WHERE id = ?')
      sdStmt.bind([parentSourceId])
      parent = sdStmt.step() ? sdStmt.getAsObject() : null
      sdStmt.free()
    }
  }

  // 种植留种统一使用 'planting_self_kept'
  const newOrigin = deriveOriginFromContext(input)

  // 解析合并键
  const cropCode = parent?.crop_code || planting?.crop_code || null
  const unit = input.unit || parent?.unit || null

  // ===== Step 3: BEGIN IMMEDIATE + 事务内查合并候选 =====
  db.run('BEGIN IMMEDIATE')
  let finalStockId: string
  let mergeAction: 'create_new' | 'merge_into_existing'
  let newSourceCode: string | null = null

  try {
    let mergeable: any = null
    if (newOrigin === 'planting_self_kept' && cropCode && seedForm && unit) {
      // 2026-07-18: 事务内查合并候选（防并发 race）
      const repo = new SeedSourceRepository()
      mergeable = repo.findMergeableSeedSource({
        cropCode, seedForm, unit, generation,
      })
    }

    if (mergeable) {
      // ===== Step 4a: 合并到现有种源 =====
      finalStockId = mergeable.id
      mergeAction = 'merge_into_existing'
      db.run(`
        UPDATE seed_sources
        SET quantity = quantity + ?,
            remaining_quantity = remaining_quantity + ?,
            reflow_count = reflow_count + 1,
            last_reflow_at = ?
        WHERE id = ?
      `, [seedQuantity, seedQuantity, nowISO, finalStockId])
    } else {
      // ===== Step 4b: 创建新种源 =====
      finalStockId = generateId('SRC')
      mergeAction = 'create_new'
      newSourceCode = input.subType === 'cutting' || input.subType === 'seed_saving'
        ? generatePropagationCode(input.subType)
        : generateId('SRC')

      const propagationMethod = input.subType === 'cutting' ? 'cutting'
        : input.subType === 'seed_saving' ? 'seed_saving'
        : input.subType === 'g0_g1' ? 'g0_g1'
        : null
      const propagationTypeDb = input.subType === 'g0_g1' ? 'breeding' : 'planting_self_kept';

      db.run(`
        INSERT INTO seed_sources (
          id, source_code, source_name, source_type, source_origin, parent_source_id,
          crop_name, crop_variety, crop_code, crop_category, type_name, variety_name,
          supplier_id, supplier_name, production_plan_code,
          quantity, unit, purchase_date, used_quantity, remaining_quantity,
          status, create_by, create_by_id, create_time, update_time,
          propagation_type, propagation_status, propagation_method,
          linked_planting_id, linked_planting_code,
          generation,
          seed_form
        ) VALUES (
          ?, ?, ?, 'seed', ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, 0, ?,
          'active', ?, ?, ?, ?,
          ?, 'completed', ?,
          ?, ?,
          ?,
          ?
        )
      `, [
        finalStockId, newSourceCode, parent?.source_name || null, newOrigin, input.parentSourceId,
        parent?.crop_name || planting?.crop_name || null,
        parent?.crop_variety || planting?.crop_variety || null,
        cropCode,
        parent?.crop_category || null,
        parent?.type_name || null,
        parent?.variety_name || null,
        null, null, parent?.production_plan_code || planting?.production_plan_code || null,
        seedQuantity, unit, circulationDate.split('T')[0], seedQuantity,
        input.operatorId || 'system', input.operatorId || null, nowISO, nowISO,
        propagationTypeDb, propagationMethod,
        input.sourceModule === 'planting' ? input.sourceId : null, sourcePlantingCode,
        generation,
        seedForm,
      ])
    }

    // ===== Step 5: 写 crop_circulation_records（含 merge_action）=====
    db.run(`
      INSERT INTO crop_circulation_records
      (id, circulation_type, source_module, source_id, parent_source_id, new_source_id,
       quantity, unit, generation, circulation_date, operator_id, notes, merge_action)
      VALUES (?, 'PROPAGATION', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      circId, input.sourceModule, input.sourceId, input.parentSourceId, finalStockId,
      seedQuantity, unit ?? null, generation,
      circulationDate, input.operatorId ?? null, input.notes ?? null, mergeAction,
    ])

    // ===== Step 6: 写 material_flow_log（统一字段，try/catch）=====
    try {
      const flowType = `${input.sourceModule || 'seed_source'}→seed_source`
      writeFlowLog({
        flow_type: flowType,
        crop_name: planting?.crop_name || (parent as any)?.crop_name || '',
        crop_variety: planting?.crop_variety || (parent as any)?.crop_variety || null,
        crop_code: cropCode,
        source_type: input.sourceModule || null,
        source_id: input.sourceId || null,
        source_code: input.sourceRecordCode || input.sourceId || null,
        source_quantity: input.quantity ?? null,
        source_unit: unit,
        source_category: input.sourceModule === 'planting' ? 'planting'
          : input.sourceModule === 'seedling' ? 'seedling' : 'seed_source',
        target_type: 'seed_source',
        target_id: finalStockId,
        target_code: newSourceCode || (mergeable?.sourceCode ?? ''),
        target_quantity: input.quantity ?? null,
        target_unit: unit,
        business_id: circId,
        business_code: circId,
        created_by: input.operatorId || 'system',
      })
    } catch (e: any) {
      // 写 flow_log 失败不阻断主流程（已 commit）
      console.warn('[executePropagation] writeFlowLog failed:', e.message)
    }

    db.run('COMMIT')
    saveDatabase()
  } catch (e) {
    db.run('ROLLBACK')
    throw e
  }

  return { circulationId: circId, newSourceId: finalStockId, stockId: finalStockId, mergeAction }
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
  `, [circId, input.sourceModule, input.sourceId, input.parentSourceId, quantity, input.unit ?? null, circulationDate, input.operatorId ?? null, input.notes ?? null])

  // 2026-06-19: 写 material_flow_log（数量回填到原种源）
  try {
    // P4 修复：尝试从源表查找 crop_name
    let quantityCropName = '';
    try {
      const srcTable = input.sourceModule === 'planting' ? 'plantings' : (input.sourceModule === 'seedling' ? 'seedlings' : 'seed_sources');
      const srcRow = db.exec(`SELECT crop_name FROM ${srcTable} WHERE id = ? LIMIT 1`, [input.sourceId]);
      quantityCropName = String(srcRow[0]?.values?.[0]?.[0] || '');
    } catch { /* 查不到就用空字符串 */ }
    writeFlowLog({
      flow_type: `${input.sourceModule || 'seed_source'}→seed_source`,
      crop_name: quantityCropName,
      source_type: input.sourceModule || null,
      source_id: input.sourceId || null,
      source_code: input.sourceRecordCode || input.sourceId || null,
      source_quantity: quantity,
      source_unit: input.unit || null,
      source_category: input.sourceModule === 'planting' ? 'planting' : (input.sourceModule === 'seedling' ? 'seedling' : 'seed_source'),
      target_type: 'seed_source',
      target_id: input.parentSourceId || '',
      target_code: input.parentSourceId || '',
      target_quantity: quantity,
      target_unit: input.unit || null,
      business_id: circId,
      business_code: circId,
      created_by: input.operatorId || 'system',
    })
  } catch (e: any) {
    console.warn('[executeQuantityToSeedSource] writeFlowLog failed:', e.message)
  }

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
  `, [circId, input.sourceModule, input.sourceId, input.parentSourceId, quantity, input.unit ?? null, circulationDate, input.operatorId ?? null, input.notes ?? null])

  // 同步写 inventory_stock (残株入库, stock_type='residue', business_type='circulation')
  const stockId = generateId('STK')
  const instanceId = generateId('INST')
  db.run(`
    INSERT INTO inventory_stock
    (id, instance_id, stock_type, business_id, business_type, current_quantity, available_quantity, unit, warehouse_id, status, create_time)
    VALUES (?, ?, 'residue', ?, 'circulation', ?, ?, ?, ?, 'active', datetime('now','localtime'))
  `, [stockId, instanceId, circId, quantity, quantity, input.unit ?? null, input.warehouseId ?? null])

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
  `, [circId, input.sourceModule, input.sourceId, input.parentSourceId, quantity, input.unit ?? null, circulationDate, input.operatorId ?? null, input.notes ?? null])

  // 2026-06-19: 写 material_flow_log（处置废弃）— 用 correction 类型记录数量变化
  try {
    // P4 修复：尝试从源表查找 crop_name
    let disposalCropName = '';
    try {
      const srcTable = input.sourceModule === 'planting' ? 'plantings' : (input.sourceModule === 'seedling' ? 'seedlings' : 'seed_sources');
      const srcRow = db.exec(`SELECT crop_name FROM ${srcTable} WHERE id = ? LIMIT 1`, [input.sourceId]);
      disposalCropName = String(srcRow[0]?.values?.[0]?.[0] || '');
    } catch { /* 查不到就用空字符串 */ }
    writeFlowLog({
      flow_type: 'correction',
      crop_name: disposalCropName,
      source_type: input.sourceModule || null,
      source_id: input.sourceId || null,
      source_code: input.sourceRecordCode || input.sourceId || null,
      source_quantity: -quantity, // 处置为减少
      source_unit: input.unit || null,
      source_category: input.sourceModule === 'planting' ? 'planting' : (input.sourceModule === 'seedling' ? 'seedling' : 'seed_source'),
      target_type: 'disposal',
      target_id: circId,
      target_code: circId,
      target_quantity: null,
      target_unit: input.unit || null,
      business_id: circId,
      business_code: circId,
      created_by: input.operatorId || 'system',
    })
  } catch (e: any) {
    console.warn('[executeDisposal] writeFlowLog failed:', e.message)
  }

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
  const circ = db.prepare(`SELECT * FROM crop_circulation_records WHERE id = ?`).get([circId]) as any
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
export function listCirculations(filter: {
  sourceModule?: string;
  sourceId?: string;
  parentSourceId?: string;
  newSourceId?: string;
  seedSourceId?: string;
}): any[] {
  const db = getDatabase()
  const conditions: string[] = []
  const params: any[] = []
  if (filter.sourceModule) { conditions.push('source_module = ?'); params.push(filter.sourceModule) }
  if (filter.sourceId) { conditions.push('source_id = ?'); params.push(filter.sourceId) }
  if (filter.parentSourceId) { conditions.push('parent_source_id = ?'); params.push(filter.parentSourceId) }
  if (filter.newSourceId) { conditions.push('new_source_id = ?'); params.push(filter.newSourceId) }
  // 2026-06-19: 双向上下溯源 — 同时查 parent_source_id 和 new_source_id
  if (filter.seedSourceId) {
    conditions.push('(parent_source_id = ? OR new_source_id = ?)')
    params.push(filter.seedSourceId, filter.seedSourceId)
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const stmt = db.prepare(`SELECT * FROM crop_circulation_records ${where} ORDER BY created_at DESC`)
  stmt.bind(params)
  const records: any[] = []
  while (stmt.step()) {
    records.push(stmt.getAsObject())
  }
  stmt.free()

  // 2026-06-19: 补 3 个来源批号字段（来源单号 / 父种源批号 / 子种源批号）
  // 用单条 SELECT CASE 一次性查，避免每行 3 次往返
  if (records.length === 0) return records
  const ids = new Set<string>()
  records.forEach((r) => {
    if (r.source_id) ids.add(r.source_id)
    if (r.parent_source_id) ids.add(r.parent_source_id)
    if (r.new_source_id) ids.add(r.new_source_id)
  })
  const idArr = Array.from(ids)
  const codeMap = new Map<string, { planting?: string; seedling?: string; seed?: string }>()
  if (idArr.length > 0) {
    const placeholders = idArr.map(() => '?').join(',')
    const pStmt = db.prepare(`SELECT id, planting_code FROM plantings WHERE id IN (${placeholders})`)
    pStmt.bind(idArr)
    while (pStmt.step()) {
      const r: any = pStmt.getAsObject()
      if (!codeMap.has(r.id)) codeMap.set(r.id, {})
      codeMap.get(r.id)!.planting = r.planting_code
    }
    pStmt.free()
    const sStmt = db.prepare(`SELECT id, seedling_code FROM seedlings WHERE id IN (${placeholders})`)
    sStmt.bind(idArr)
    while (sStmt.step()) {
      const r: any = sStmt.getAsObject()
      if (!codeMap.has(r.id)) codeMap.set(r.id, {})
      codeMap.get(r.id)!.seedling = r.seedling_code
    }
    sStmt.free()
    const ssStmt = db.prepare(`SELECT id, source_code FROM seed_sources WHERE id IN (${placeholders})`)
    ssStmt.bind(idArr)
    while (ssStmt.step()) {
      const r: any = ssStmt.getAsObject()
      if (!codeMap.has(r.id)) codeMap.set(r.id, {})
      codeMap.get(r.id)!.seed = r.source_code
    }
    ssStmt.free()
  }
  // 优先按 source_module 选对应表批号，兜底用 seed_sources
  records.forEach((r) => {
    const srcInfo = codeMap.get(r.source_id)
    r.sourceCode = r.source_module === 'planting' ? srcInfo?.planting
                 : r.source_module === 'seedling' ? srcInfo?.seedling
                 : srcInfo?.seed || srcInfo?.planting || srcInfo?.seedling || ''
    r.parentSourceCode = r.parent_source_id ? (codeMap.get(r.parent_source_id)?.seed || '') : ''
    r.newSourceCode = r.new_source_id ? (codeMap.get(r.new_source_id)?.seed || '') : ''
  })
  return records
}
