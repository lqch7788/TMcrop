/**
 * 物料管理数据库操作
 */

import { getDatabase, saveDatabase } from './index';

/**
 * 获取所有物料
 */
export function getAllMaterials(): any[] {
  const db = getDatabase();
  const results = db.exec('SELECT * FROM materials ORDER BY code');
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
 */
export function getMaterialById(id: number): any | null {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM materials WHERE id = ?');
  stmt.bind([id]);
  const item = stmt.getAsObject();
  stmt.free();
  return Object.keys(item).length > 0 ? item : null;
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
  saveDatabase();
  // 返回最后插入的ID
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0]?.values[0]?.[0] as number || 0;
}

/**
 * 更新物料
 */
export function updateMaterial(id: number, updates: Record<string, any>): boolean {
  const db = getDatabase();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  if (fields.length === 0) return false;

  const values = Object.keys(updates).map(k => updates[k]);
  db.run(`UPDATE materials SET ${fields} WHERE id = ?`, [...values, id]);
  saveDatabase();
  return true;
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
  const item = stmt.getAsObject();
  stmt.free();
  return Object.keys(item).length > 0 ? item : null;
}

/**
 * 创建入库记录
 */
export function createInboundRecord(record: {
  code: string;
  inboundDate: string;
  supplier: string;
  operator: string;
  status: string;
  materials: any[];
}): number {
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
  saveDatabase();
  const result = db.exec('SELECT last_insert_rowid() as id');
  return result[0]?.values[0]?.[0] as number || 0;
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
