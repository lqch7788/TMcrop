/**
 * 种植移入/移出（POST /api/plantings/:id/move）业务核心
 * 2026-06-21：抽取为可注入 db 的纯函数，便于单测
 *
 * 设计动机：
 *   - 路由层 src/routes/planting.ts 的 getDatabase() 是模块单例，无法在测试中替换为内存 db
 *   - 把核心校验 + 事务逻辑抽到本文件，路由层只做：(req.params.id, req.body, req.user) → handleMove(...) → res.json
 *   - 测试可直接 import { handleMove }，传 sql.js 内存 db，避开 supertest / mock 整个 db 模块
 *
 * 返回契约：{ status: number, body: { success?, data?, error? } }
 */
import type { Database } from 'sql.js'
import { queryToObjects } from '../utils/queryHelper'

export interface MoveBody {
  operationType?: string
  toAreaId?: string
  toAreaName?: string
  fromAreaId?: string
  fromAreaName?: string
  quantity?: number | string
  operationDate?: string
  remarks?: string
  sourceType?: string
  sourceId?: string
  sourceCode?: string
  targetPlantingId?: string
  targetAreaId?: string
  targetAreaName?: string
}

export interface MoveUser {
  realName?: string
  username?: string
}

export interface MoveResponse {
  status: number
  body: { success?: boolean; data?: any; error?: string }
}

/** 生成 move/stock ID（与原路由一致） */
function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** ISO 时间 */
function nowIso(): string {
  return new Date().toISOString()
}

/**
 * 校验 + 执行 调入/调出
 * 事务语义：db.exec('BEGIN' / 'COMMIT' / 'ROLLBACK')
 */
export async function handleMove(
  db: Database,
  plantingId: string,
  body: MoveBody,
  user: MoveUser = {},
): Promise<MoveResponse> {
  try {
    const {
      operationType,
      toAreaId,
      toAreaName,
      fromAreaId,
      fromAreaName,
      quantity = 0,
      operationDate,
      remarks = '',
      sourceType,
      sourceId,
      sourceCode,
      targetPlantingId,
    } = body || {}

    // 1. 基础校验
    if (!operationType || !['move_in', 'move_out'].includes(operationType)) {
      return { status: 400, body: { success: false, error: '操作类型无效' } }
    }
    const qty = Number(quantity)
    if (!Number.isFinite(qty) || qty <= 0) {
      return { status: 400, body: { success: false, error: '数量必须 > 0' } }
    }

    // 2. 查询当前 planting（queryToObjects 已转 camelCase）
    const current = queryToObjects<any>(db,
      `SELECT id, planting_code, crop_code, crop_variety, area_id, area_name, planting_quantity,
              status, is_harvest_locked, end_time
       FROM plantings WHERE id = ?`, [plantingId])
    if (current.length === 0) {
      return { status: 404, body: { success: false, error: '种植记录不存在' } }
    }
    const cur = current[0]

    // P0 校验 3：订单生命周期（已结束/已采收/已取消/有 end_time 不能调入调出）
    if (cur.status === 'ended' || cur.status === 'harvested' || cur.status === 'cancelled' || cur.endTime) {
      return { status: 400, body: { success: false, error: '订单已结束/已采收，不能调入/调出' } }
    }
    if (cur.isHarvestLocked) {
      return { status: 400, body: { success: false, error: '订单已锁定采收' } }
    }

    const operatorName = user.realName || user.username || 'system'

    // 3. 调入 / 调出 分支
    if (operationType === 'move_in') {
      if (!toAreaName) {
        return { status: 400, body: { success: false, error: '请选择目标区域' } }
      }
      if (!sourceType || !['seed', 'seedling'].includes(sourceType)) {
        return { status: 400, body: { success: false, error: '来源类型必须为 seed 或 seedling' } }
      }
      if (!sourceId) {
        return { status: 400, body: { success: false, error: '请选择来源批号' } }
      }

      const src = queryToObjects<any>(db,
        `SELECT id, source_code, crop_code, crop_variety, remaining_quantity, status, area_id
         FROM seed_sources WHERE id = ?`, [sourceId])
      if (src.length === 0) {
        return { status: 404, body: { success: false, error: '来源种源/育苗记录不存在' } }
      }
      const s = src[0]

      // P0 校验 1+2：作物编码 + 品种一致
      if (s.cropCode !== cur.cropCode) {
        return { status: 400, body: { success: false, error: '来源作物与目标订单作物不一致' } }
      }
      if (s.cropVariety && cur.cropVariety && s.cropVariety !== cur.cropVariety) {
        return { status: 400, body: { success: false, error: '来源品种与目标订单品种不一致' } }
      }
      // P1 校验 5：source 状态
      if (s.status === 'depleted' || s.status === 'cancelled') {
        return { status: 400, body: { success: false, error: '来源记录状态不可用' } }
      }
      // P1 校验 3：来源库存不足
      if (qty > s.remainingQuantity) {
        return {
          status: 400,
          body: { success: false, error: `来源库存不足：剩余 ${s.remainingQuantity} 株` },
        }
      }

      // 4. 事务：扣来源 + 加区域库存 + 写履历
      db.exec('BEGIN')
      try {
        db.run(
          `UPDATE seed_sources SET remaining_quantity = remaining_quantity - ?, used_quantity = used_quantity + ? WHERE id = ?`,
          [qty, qty, sourceId],
        )

        const existing = queryToObjects<any>(db,
          `SELECT id, quantity FROM planting_area_stocks WHERE planting_id = ? AND area_id = ?`,
          [plantingId, toAreaId || ''])
        const now = nowIso()
        const today = now.slice(0, 10)

        if (existing.length > 0) {
          db.run(
            `UPDATE planting_area_stocks SET quantity = quantity + ?, update_time = ? WHERE id = ?`,
            [qty, now, existing[0].id],
          )
        } else {
          db.run(
            `INSERT INTO planting_area_stocks
              (id, planting_id, area_id, area_name, quantity, source_type, source_id, source_code, operation_date, create_time, update_time)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [genId('STK'), plantingId, toAreaId || '', toAreaName, qty,
             sourceType, sourceId, sourceCode || '',
             operationDate || today, now, now],
          )
        }

        const moveId = genId('MOV')
        db.run(
          `INSERT INTO planting_move_records
            (id, planting_id, planting_code, operation_type,
             from_area_id, from_area_name, to_area_id, to_area_name,
             quantity, operation_date, operator_name, remarks, create_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [moveId, plantingId, cur.plantingCode, 'move_in',
           s.areaId || '', s.sourceCode || '',
           toAreaId || '', toAreaName,
           qty, operationDate || today, operatorName, remarks, now],
        )

        db.exec('COMMIT')
        return {
          status: 200,
          body: {
            success: true,
            data: { id: moveId, plantingId, toAreaName, quantity: qty, softWarning: null },
          },
        }
      } catch (txErr: any) {
        try { db.exec('ROLLBACK') } catch { /* ignore */ }
        throw txErr
      }
    }

    // move_out
    if (!fromAreaId) {
      return { status: 400, body: { success: false, error: '请选择调出区域' } }
    }
    if (!targetPlantingId) {
      return { status: 400, body: { success: false, error: '请选择目标种植订单' } }
    }
    if (!toAreaId || !toAreaName) {
      return { status: 400, body: { success: false, error: '请选择目标区域' } }
    }

    // P0 校验 5：self-move（同区域 + 同订单）
    if (targetPlantingId === plantingId && fromAreaId === toAreaId) {
      return { status: 400, body: { success: false, error: '源区域与目标区域相同' } }
    }

    const target = queryToObjects<any>(db,
      `SELECT id, planting_code, crop_code, crop_variety, status, is_harvest_locked, end_time
       FROM plantings WHERE id = ?`, [targetPlantingId])
    if (target.length === 0) {
      return { status: 404, body: { success: false, error: '目标种植订单不存在' } }
    }
    const t = target[0]

    if (t.status === 'ended' || t.status === 'harvested' || t.status === 'cancelled' || t.endTime) {
      return { status: 400, body: { success: false, error: '目标订单已结束/已采收' } }
    }
    if (t.isHarvestLocked) {
      return { status: 400, body: { success: false, error: '目标订单已锁定采收' } }
    }

    // P0 校验 2：作物一致
    if (t.cropCode !== cur.cropCode) {
      return { status: 400, body: { success: false, error: '目标订单作物不一致' } }
    }
    if (t.cropVariety && cur.cropVariety && t.cropVariety !== cur.cropVariety) {
      return { status: 400, body: { success: false, error: '目标订单品种与本订单不一致' } }
    }

    // P0 校验 4：调出区域库存
    const fromStock = queryToObjects<any>(db,
      `SELECT id, quantity FROM planting_area_stocks WHERE planting_id = ? AND area_id = ?`,
      [plantingId, fromAreaId])
    if (fromStock.length === 0) {
      return { status: 404, body: { success: false, error: '调出区域未种该作物' } }
    }
    if (qty > fromStock[0].quantity) {
      return {
        status: 400,
        body: {
          success: false,
          error: `调出区域当前只有 ${fromStock[0].quantity} 株，不足 ${qty} 株`,
        },
      }
    }

    // 5. 事务：减源 + 加目标 + 写履历
    db.exec('BEGIN')
    try {
      const now = nowIso()
      const today = now.slice(0, 10)

      db.run(
        `UPDATE planting_area_stocks SET quantity = quantity - ?, update_time = ? WHERE id = ?`,
        [qty, now, fromStock[0].id],
      )

      const toExisting = queryToObjects<any>(db,
        `SELECT id FROM planting_area_stocks WHERE planting_id = ? AND area_id = ?`,
        [targetPlantingId, toAreaId])
      if (toExisting.length > 0) {
        db.run(
          `UPDATE planting_area_stocks SET quantity = quantity + ?, update_time = ? WHERE id = ?`,
          [qty, now, toExisting[0].id],
        )
      } else {
        db.run(
          `INSERT INTO planting_area_stocks
            (id, planting_id, area_id, area_name, quantity, source_type, source_id, source_code, operation_date, create_time, update_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [genId('STK'), targetPlantingId, toAreaId, toAreaName, qty,
           'transfer_in', plantingId, cur.plantingCode,
           operationDate || today, now, now],
        )
      }

      const moveId = genId('MOV')
      db.run(
        `INSERT INTO planting_move_records
          (id, planting_id, planting_code, operation_type,
           from_area_id, from_area_name, to_area_id, to_area_name,
           quantity, operation_date, operator_name, remarks, create_time)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [moveId, plantingId, cur.plantingCode, 'move_out',
         fromAreaId, fromAreaName,
         toAreaId, toAreaName,
         qty, operationDate || today, operatorName, remarks, now],
      )

      db.exec('COMMIT')
      return {
        status: 200,
        body: {
          success: true,
          data: { id: moveId, plantingId, toAreaName, quantity: qty, softWarning: null },
        },
      }
    } catch (txErr: any) {
      try { db.exec('ROLLBACK') } catch { /* ignore */ }
      throw txErr
    }
  } catch (error: any) {
    return {
      status: 500,
      body: { success: false, error: error?.message || '移入/移出失败' },
    }
  }
}
