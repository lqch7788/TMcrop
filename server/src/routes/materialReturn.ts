/**
 * 生产退料 API 路由
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { nowLocalTimestamp } from '../lib/timeUtils';
import { writeStockTransaction, parseBatchAllocations } from './materialExecute';

const router = Router();

/** 退料单是否处于"库存已恢复"的有效态（被拒绝/作废/取消的退料不占用库存） */
function isReturnStockActive(status: unknown): boolean {
  const s = String(status || '').toLowerCase();
  return s !== 'rejected' && s !== 'cancelled' && s !== 'voided' && s !== '已拒绝' && s !== '已作废' && s !== '已取消';
}

/**
 * 退料库存联动（事务内调用）：direction='in' 退料入库 / 'undo' 撤销退料回收库存
 * 2026-09-27 审计修复：此前退料路由完全不碰库存与流水（只写单据），
 * 退料后物料缺还原；前端唯一的恢复调用又因字段名错配（actualQuantity vs returnQuantity）恒不触发。
 * 现由服务端统一处理：materials 主表 + batch_inventory 批次账 + inventory_transaction 流水。
 */
function applyReturnStock(
  db: any,
  materials: any[],
  returnId: string | number,
  returnCode: string,
  operatorInfo: { applicant?: string },
  direction: 'in' | 'undo'
): void {
  const now = nowLocalTimestamp();
  const operatorName = String(operatorInfo?.applicant || '').trim() || '仓库';
  let seq = 0;
  for (const m of materials) {
    const code = String(m.materialCode || m.code || '');
    // 退料量字段：表单存 returnQuantity（历史数据兜底 quantity）
    const qty = Number(m.returnQuantity ?? m.quantity ?? 0) || 0;
    if (!code || qty <= 0) continue;

    // 2026-09-27 修复：主表按 code 锁定单行（防同 code 多行被连坐）；
    // 此前 WHERE code 更新全部匹配行（与出库端同款结构性炸弹）
    const mainRows = db.exec('SELECT id, quantity FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1', [code]);
    if (mainRows.length === 0 || mainRows[0].values.length === 0) {
      throw new Error(`物料 ${code} 不存在，无法${direction === 'in' ? '退料入库' : '撤销退料'}`);
    }
    const mainId = mainRows[0].values[0][0];
    const mainQty = Number(mainRows[0].values[0][1]) || 0;
    if (direction === 'undo' && mainQty < qty) {
      throw new Error(`物料 ${code} 当前库存 ${mainQty} 不足以回收退料量 ${qty}（库存已被后续使用），无法撤销`);
    }

    // 主表：退料 +qty / 撤销 -qty（按主键更新）
    db.run(
      'UPDATE materials SET quantity = quantity + ?, lastUpdateTime = ? WHERE id = ?',
      [direction === 'in' ? qty : -qty, now, mainId]
    );

    // 批次账：2026-09-27 修复——退料行 batchNo 可能是出库时 FEFO 写回的显示串
    // （如 "B20260415(5袋),EQ20260125(2卷)"）。此前把整串当单个批次号查询，
    // 查不到就新建脏批次行（批次号=显示串），原真实批次反而没恢复。
    // 现按显示串解析出子批次，逐批恢复；无子批次细分时走单批次（原逻辑）。
    const allocs = parseBatchAllocations(m);
    // 子批次恢复量按本次退料量截断（显示串合计是出库时各批扣减量，可能大于本次退料量）
    const batchTargets: Array<{ batchNo: string; qty: number }> = [];
    if (allocs.length > 0 && allocs[0].batchNo) {
      let remaining = qty;
      for (const a of allocs) {
        if (remaining <= 0) break;
        const take = Math.min(a.qty, remaining);
        batchTargets.push({ batchNo: a.batchNo, qty: take });
        remaining -= take;
      }
    }
    if (batchTargets.length === 0) {
      batchTargets.push({ batchNo: String(m.batchNo || '').trim() || '默认批次', qty });
    }

    for (const target of batchTargets) {
      const batchNo = target.batchNo;
      const targetQty = target.qty;
      const bRows = db.exec('SELECT remaining_quantity FROM batch_inventory WHERE material_code = ? AND batch_no = ?', [code, batchNo]);
      const hasBatch = bRows.length > 0 && bRows[0].values.length > 0;
      if (hasBatch) {
        const batchRemaining = Number(bRows[0].values[0][0]) || 0;
        if (direction === 'undo' && batchRemaining < targetQty) {
          throw new Error(`物料 ${code} 批次 ${batchNo} 余量 ${batchRemaining} 不足以回收退料量 ${targetQty}`);
        }
        db.run(
          'UPDATE batch_inventory SET remaining_quantity = remaining_quantity + ?, update_time = ? WHERE material_code = ? AND batch_no = ?',
          [direction === 'in' ? targetQty : -targetQty, now, code, batchNo]
        );
      } else if (direction === 'in') {
        db.run(
          `INSERT INTO batch_inventory (id, material_code, material_name, batch_no, production_date, expiry_date, unit, total_quantity, remaining_quantity, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`bi-return-${code}-${Date.now()}-${seq}`, code, String(m.materialName || ''), batchNo, '', '', String(m.unit || ''), targetQty, targetQty, now, now]
        );
      } else {
        // undo 且批次不存在：主表已回收，批次无账可回，显式告警
        console.warn(`[生产退料] 撤销退料时批次未命中：物料 ${code} 批次 ${batchNo}（退料单 ${returnCode}）`);
      }
    }

    // 流水（按行总退料量记一笔，余额链以主表为准）
    writeStockTransaction(db, ++seq, direction === 'in' ? 'material_return_in' : 'material_return_undo',
      returnId, returnCode, code, qty, {
        operatorName,
        balanceBefore: mainQty,
        balanceAfter: direction === 'in' ? mainQty + qty : mainQty - qty,
        remark: direction === 'in' ? `生产退料 ${returnCode}｜退料人 ${operatorName}` : `撤销退料 ${returnCode}`,
        businessType: 'material_return',
      });
  }
}

// GET /api/material-returns - 获取退料列表
router.get('/', (req: Request, res: Response) => {
  try {
    const { status, applicant, department, page = 1, limit = 50 } = req.query;
    const db = getDatabase();
    let sql = 'SELECT * FROM material_returns WHERE 1=1';
    const params: (string | number)[] = [];
    if (status) { sql += ' AND status = ?'; params.push(status as string); }
    if (applicant) { sql += ' AND applicant LIKE ?'; params.push(`%${applicant}%`); }
    if (department) { sql += ' AND department LIKE ?'; params.push(`%${department}%`); }
    const countSql = sql;
    sql += ' ORDER BY create_time DESC';
    const total = execCount(db, countSql, params);
    const offset = (Number(page) - 1) * Number(limit);
    sql += ' LIMIT ? OFFSET ?';
    params.push(Number(limit), offset);
    const items = queryToObjects(db, sql, params);
    // 解析materials JSON字段
    const result = items.map((item: Record<string, unknown>) => ({
      ...item,
      materials: item.materials ? JSON.parse(item.materials as string) : [],
    }));
    res.json({ success: true, data: result, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取退料列表失败:', error);
    res.status(500).json({ success: false, error: '获取退料列表失败' });
  }
});

// GET /api/material-returns/:id - 获取单条退料详情
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM material_returns WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) item = stmt.getAsObject();
    stmt.free();
    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '退料记录不存在' });
    }
    item.materials = item.materials ? JSON.parse(item.materials as string) : [];
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取退料详情失败' });
  }
});

// POST /api/material-returns - 创建退料记录（事务内：落库 + 恢复库存 + 流水）
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, code, date, type, applicant, department, warehouseLocation, status, statusClass,
      remark, operator, reviewer, reviewDate, rejectReason, materials, create_by } = req.body;
    const newId = id || `TL${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();
    const matList = Array.isArray(materials) ? materials : [];
    const returnCode = String(code || newId);

    // 2026-09-27 审计修复：整个流程放进事务——退料落库即恢复库存（有效态才恢复），
    // 任一环节失败整体回滚，避免"单据在、库存没还"的断裂（此前二者完全脱节）
    db.run('BEGIN');
    try {
      db.run(`
        INSERT INTO material_returns (
          id, code, date, type, applicant, department, warehouseLocation, status, statusClass,
          remark, operator, reviewer, reviewDate, rejectReason, materials, create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId, code, date || null, type || null, applicant || null, department || null,
        warehouseLocation || null, status || '待审批', statusClass || 'pending',
        remark || null, operator || null, reviewer || null, reviewDate || null,
        rejectReason || null, JSON.stringify(matList), create_by || null, now, now,
      ]);
      if (isReturnStockActive(status || 'pending')) {
        applyReturnStock(db, matList, newId, returnCode, { applicant }, 'in');
      }
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[生产退料] 创建失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '创建退料失败' });
    }
    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId, code } });
  } catch (error) {
    console.error('创建退料失败:', error);
    res.status(500).json({ success: false, error: '创建退料失败' });
  }
});

// PUT /api/material-returns/:id - 更新退料记录
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 2026-09-27 安全修复：列名白名单（与 materialRequest 同款，此前直接拼接任意列名）
    const ALLOWED_COLUMNS = new Set([
      'code', 'date', 'type', 'applicant', 'department', 'warehouseLocation', 'status', 'statusClass',
      'remark', 'operator', 'reviewer', 'reviewDate', 'rejectReason', 'materials', 'create_by', 'update_time',
    ]);
    const illegalKeys = Object.keys(updates).filter(k => !ALLOWED_COLUMNS.has(k));
    if (illegalKeys.length > 0) {
      return res.status(400).json({ success: false, error: `包含非法更新字段: ${illegalKeys.join(', ')}` });
    }

    // 读旧行（库存联动需要旧状态/旧明细/旧单号）
    const preStmt = db.prepare('SELECT code, applicant, status, materials FROM material_returns WHERE id = ?');
    preStmt.bind([id]);
    let oldCode = '';
    let oldApplicant = '';
    let oldStatus = '';
    let oldMaterials: any[] = [];
    let exists = false;
    if (preStmt.step()) {
      const row = preStmt.getAsObject();
      exists = true;
      oldCode = String(row.code || '');
      oldApplicant = String(row.applicant || '');
      oldStatus = String(row.status || '');
      try { const p = JSON.parse(String(row.materials || '[]')); oldMaterials = Array.isArray(p) ? p : []; } catch { oldMaterials = []; }
    }
    preStmt.free();
    if (!exists) {
      return res.status(404).json({ success: false, error: '退料记录不存在' });
    }

    const updateKeys = Object.keys(updates).filter(k => ALLOWED_COLUMNS.has(k) && k !== 'update_time');
    if (updateKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    // 2026-09-27 审计修复：状态感知的库存联动（与出库单 PUT 同模式）——
    // 明细变化或状态进出"有效态"（非拒绝/作废/取消）时，先回收旧账再应用新账
    const materialsChanged = updates.materials !== undefined;
    const statusChanged = updates.status !== undefined && String(updates.status) !== oldStatus;
    const oldActive = isReturnStockActive(oldStatus);
    const newActive = isReturnStockActive(updates.status !== undefined ? updates.status : oldStatus);
    const newMaterials: any[] = materialsChanged
      ? (Array.isArray(updates.materials) ? updates.materials : [])
      : oldMaterials;

    const fields = updateKeys.map(k => `${k} = ?`).join(', ');
    const values = updateKeys.map(k => k === 'materials' ? JSON.stringify(updates[k] || []) : updates[k]);

    db.run('BEGIN');
    try {
      if (materialsChanged || statusChanged) {
        if (oldActive) {
          applyReturnStock(db, oldMaterials, id, oldCode, { applicant: oldApplicant }, 'undo');
        }
        if (newActive) {
          applyReturnStock(db, newMaterials, id, String(updates.code || oldCode),
            { applicant: String(updates.applicant || oldApplicant) }, 'in');
        }
      }
      values.push(now, id);
      db.run(`UPDATE material_returns SET ${fields}, update_time = ? WHERE id = ?`, values);
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[生产退料] 更新失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '更新退料失败' });
    }
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新退料失败:', error);
    res.status(500).json({ success: false, error: '更新退料失败' });
  }
});

// DELETE /api/material-returns/:id - 删除退料记录（事务内：回收已恢复的库存）
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const preStmt = db.prepare('SELECT code, applicant, status, materials FROM material_returns WHERE id = ?');
    preStmt.bind([id]);
    let oldCode = '';
    let oldApplicant = '';
    let oldStatus = '';
    let oldMaterials: any[] = [];
    let exists = false;
    if (preStmt.step()) {
      const row = preStmt.getAsObject();
      exists = true;
      oldCode = String(row.code || '');
      oldApplicant = String(row.applicant || '');
      oldStatus = String(row.status || '');
      try { const p = JSON.parse(String(row.materials || '[]')); oldMaterials = Array.isArray(p) ? p : []; } catch { oldMaterials = []; }
    }
    preStmt.free();
    if (!exists) {
      return res.status(404).json({ success: false, error: '退料记录不存在' });
    }

    db.run('BEGIN');
    try {
      // 有效态退料单删除 → 回收此前恢复的库存（非有效态从未恢复，无需回收）
      if (isReturnStockActive(oldStatus)) {
        applyReturnStock(db, oldMaterials, id, oldCode, { applicant: oldApplicant }, 'undo');
      }
      db.run('DELETE FROM material_returns WHERE id = ?', [id]);
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[生产退料] 删除失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '删除退料失败' });
    }
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除退料失败:', error);
    res.status(500).json({ success: false, error: '删除退料失败' });
  }
});

export default router;
