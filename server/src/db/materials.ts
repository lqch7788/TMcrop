/**
 * 物料管理数据库操作
 */

import { getDatabase, saveDatabase } from './index';

/**
 * 获取所有物料
 */
export function getAllMaterials(): any[] {
  const db = getDatabase();
  // 修复：按 id DESC 排序，让新建物料显示在最前面
  // 旧 ORDER BY code 会让"ULTRATESTxxx"这种新编码排到 MAT_xxx 后面，用户分页看不到
  // 库存总览页面用户最关心"刚加了啥"，按 id DESC 符合该场景
  const results = db.exec('SELECT * FROM materials ORDER BY id DESC');
  if (results.length === 0) return [];

  const { columns, values } = results[0];
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * 根据ID获取物料
 * 修复：sql.js 必须先 stmt.step() 推进游标，再 getAsObject() 才有数据；原写法直接 getAsObject 永远返回空对象
 */
export function getMaterialById(id: number): any | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM materials WHERE id = ?');
  stmt.bind([id]);
  if (stmt.step()) {
    const item = stmt.getAsObject();
    stmt.free();
    return item;
  }
  stmt.free();
  return null;
}

/**
 * 创建物料
 */
export function createMaterial(material: {
  code: string;
  name: string;
  category: string;
  specification: string;
  unit: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  price: string;
  supplier: string;
  location: string;
  barcode: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  lastUpdateTime: string;
  dataStatus: string;
}): number {
  const db = getDatabase();
  db.run(`
    INSERT INTO materials
    (code, name, category, specification, unit, quantity, minStock, maxStock, price, supplier, location, barcode, batchNo, productionDate, expiryDate, lastUpdateTime, dataStatus)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    material.code,
    material.name,
    material.category,
    material.specification,
    material.unit,
    material.quantity,
    material.minStock,
    material.maxStock,
    material.price,
    material.supplier,
    material.location,
    material.barcode,
    material.batchNo,
    material.productionDate,
    material.expiryDate,
    material.lastUpdateTime,
    material.dataStatus
  ]);
  // 先取 last_insert_rowid，再 saveDatabase（sql.js 在 saveDatabase 后会重置该值为 0）
  const result = db.exec('SELECT last_insert_rowid() as id');
  const newId = (result[0]?.values[0]?.[0] as number) || 0;
  saveDatabase();
  return newId;
}

/**
 * 更新物料
 */
export function updateMaterial(id: number, updates: Record<string, any>): any | null {
  const db = getDatabase();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  if (fields.length === 0) return null;

  const values = Object.keys(updates).map(k => updates[k]);
  db.run(`UPDATE materials SET ${fields} WHERE id = ?`, [...values, id]);
  saveDatabase();
  // 修复：返回更新后的完整记录（不再只返回 true），符合"POST/PUT 必须返回完整记录"
  return getMaterialById(id);
}

/**
 * 删除物料
 */
export function deleteMaterial(id: number): boolean {
  const db = getDatabase();
  db.run('DELETE FROM materials WHERE id = ?', [id]);
  saveDatabase();
  return true;
}

/**
 * 获取所有入库记录
 */
export function getAllInboundRecords(): any[] {
  const db = getDatabase();
  const results = db.exec('SELECT * FROM inbound_records ORDER BY id DESC');
  if (results.length === 0) return [];

  const { columns, values } = results[0];
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * 根据ID获取入库记录
 */
export function getInboundRecordById(id: number): any | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM inbound_records WHERE id = ?');
  stmt.bind([id]);
  if (!stmt.step()) { stmt.free(); return null; }
  const item = stmt.getAsObject();
  stmt.free();
  return Object.keys(item).length > 0 ? item : null;
}

/**
 * 创建入库记录
 * @param opts.persist 事务内调用时传 false（sql.js 事务内禁止 saveDatabase），
 *                    由调用方在 COMMIT 后统一落盘
 */
export function createInboundRecord(record: {
  code: string;
  inboundDate: string;
  supplier: string;
  operator: string;
  status: string;
  materials: any[];
}, opts?: { persist?: boolean }): number {
  const db = getDatabase();
  db.run(`
    INSERT INTO inbound_records
    (code, inboundDate, supplier, operator, status, materials)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    record.code,
    record.inboundDate,
    record.supplier,
    record.operator,
    record.status,
    JSON.stringify(record.materials)
  ]);
  if (opts?.persist !== false) saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0]?.values[0]?.[0] as number || 0;
}

/**
 * 更新入库记录
 */
export function updateInboundRecord(id: number, updates: Record<string, any>): boolean {
  const db = getDatabase();
  const fields = Object.keys(updates)
    .filter(k => k !== 'id')
    .map(k => `${k} = ?`)
    .join(', ');
  if (fields.length === 0) return false;

  const values = Object.keys(updates)
    .filter(k => k !== 'id')
    .map(k => updates[k]);
  db.run(`UPDATE inbound_records SET ${fields} WHERE id = ?`, [...values, id]);
  saveDatabase();
  return true;
}

/**
 * 入库完成 → 自动同步物料库存（按 code 匹配累加或新增）
 * 2026-09-27 修复（P1-7）：主表行语义唯一化为"按 code 唯一的总量行"——
 * 此前按 code+batchNo 匹配，同码新批次会 INSERT 新行；而出库端主表 UPDATE 按 code 扣减，
 * 一旦同码多行会把所有批次行连坐扣减（结构性炸弹）。批次明细的权威在 batch_inventory。
 * 批次用完标记"已用完"而非删除，保留追溯。
 * @param opts.persist 事务内调用时传 false，由调用方在 COMMIT 后统一落盘（sql.js 事务内禁止 saveDatabase）
 */
export function syncInboundToMaterials(materials: any[], opts?: { persist?: boolean }): void {
  const db = getDatabase();

  for (const m of materials) {
    if (!m.code) continue; // 无物料编码则跳过

    // 按 code 匹配总量行（同码多行历史数据取 id 最小行）
    const existing = db.exec(
      'SELECT id, quantity FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1',
      [m.code]
    );
    if (existing.length > 0 && existing[0].values.length > 0) {
      // 已有该物料：累加数量 + 恢复启用状态（防止之前因用完被标记）
      const oldQty = existing[0].values[0][1] as number;
      const newQty = oldQty + (Number(m.quantity) || 0);
      db.run(
        'UPDATE materials SET quantity = ?, lastUpdateTime = ?, dataStatus = ? WHERE id = ?',
        [newQty, new Date().toISOString(), '启用', existing[0].values[0][0]]
      );
    } else {
      // 新物料：新增总量行（batchNo 留空——批次明细由 batch_inventory 承载）
      db.run(`
        INSERT INTO materials
        (code, name, category, specification, unit, quantity, minStock, maxStock, price, supplier, location, barcode, batchNo, productionDate, expiryDate, lastUpdateTime, dataStatus)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        m.code,
        m.name || '',
        m.category || '',
        m.specification || '',
        m.unit || '袋',
        Number(m.quantity) || 0,
        m.minStock || 0,
        m.maxStock || 0,
        m.price || '',
        m.supplier || '',
        m.location || '',
        m.barcode || '',
        '',
        m.productionDate || '',
        m.expiryDate || '',
        new Date().toISOString(),
        '启用'
      ]);
    }
  }
  if (opts?.persist !== false) saveDatabase();
}

/**
 * 删除入库记录
 */
export function deleteInboundRecord(id: number): boolean {
  const db = getDatabase();
  db.run('DELETE FROM inbound_records WHERE id = ?', [id]);
  saveDatabase();
  return true;
}
