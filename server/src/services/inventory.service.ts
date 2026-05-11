/**
 * 库存服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface Inventory {
  id: string;
  batch_code: string;
  crop_name: string;
  warehouse_id: string;
  warehouse_name: string;
  quantity: number;
  unit: string;
  status: string;
  harvest_record_id?: string;
  planting_id?: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class InventoryService {
  async getInventory(params: {
    cropName?: string;
    warehouseId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Inventory[]; total: number }> {
    const db = getDatabase();
    const { cropName, warehouseId, status, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM inventory WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (cropName) {
      conditions.push('crop_name LIKE ?');
      queryParams.push(`%${cropName}%`);
    }
    if (warehouseId) {
      conditions.push('warehouse_id = ?');
      queryParams.push(warehouseId);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: Inventory[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Inventory);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM inventory WHERE 1=1${whereClause}`;
    const countStmt = db.prepare(countSql);
    countStmt.bind(queryParams);
    countStmt.step();
    const countResult = countStmt.getAsObject();
    countStmt.free();

    return {
      data: items,
      total: countResult.total as number,
    };
  }

  async getById(id: string): Promise<Inventory | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM inventory WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as Inventory;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(inventory: Partial<Inventory>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = inventory.id || `inv_${Date.now()}`;

    db.run(`
      INSERT INTO inventory (
        id, batch_code, crop_name, warehouse_id, warehouse_name,
        quantity, unit, status, harvest_record_id, planting_id, remarks,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      inventory.batch_code || '',
      inventory.crop_name || '',
      inventory.warehouse_id || '',
      inventory.warehouse_name || '',
      inventory.quantity || 0,
      inventory.unit || '',
      inventory.status || 'in_stock',
      inventory.harvest_record_id || null,
      inventory.planting_id || null,
      inventory.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async updateQuantity(id: string, quantity: number): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();
    db.run('UPDATE inventory SET quantity = ?, updated_at = ? WHERE id = ?', [quantity, now, id]);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM inventory WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const inventoryService = new InventoryService();
