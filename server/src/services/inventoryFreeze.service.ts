/**
 * 库存冻结服务
 */
import { getDatabase, saveDatabase } from '../db';

export interface InventoryFreeze {
  id: string;
  order_id?: string;
  order_code?: string;
  harvest_record_id?: string;
  harvest_code?: string;
  freeze_quantity: number;
  used_quantity: number;
  status: 'frozen' | 'used' | 'released';
  remarks?: string;
  create_by?: string;
  create_time: string;
}

export class InventoryFreezeService {
  /**
   * 根据订单ID获取库存冻结记录列表
   */
  async getByOrderId(orderId: string): Promise<InventoryFreeze[]> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM inventory_freeze WHERE order_id = ?');
    stmt.bind([orderId]);
    const items: InventoryFreeze[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as InventoryFreeze);
    }
    stmt.free();
    return items;
  }

  /**
   * 创建库存冻结记录
   */
  async create(record: Partial<InventoryFreeze>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = record.id || `freeze_${Date.now()}`;

    db.run(`
      INSERT INTO inventory_freeze (id, order_id, order_code, harvest_record_id, harvest_code, freeze_quantity, used_quantity, status, remarks, create_by, create_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, record.order_id || null, record.order_code || null,
      record.harvest_record_id || null, record.harvest_code || null,
      record.freeze_quantity || 0, 0, record.status || 'frozen',
      record.remarks || '', record.create_by || '', now
    ]);

    saveDatabase();
    return id;
  }

  /**
   * 使用冻结库存
   */
  async use(id: string, quantity: number): Promise<boolean> {
    const db = getDatabase();
    db.run(`
      UPDATE inventory_freeze
      SET used_quantity = used_quantity + ?, status = CASE WHEN used_quantity + ? >= freeze_quantity THEN 'used' ELSE status END
      WHERE id = ?
    `, [quantity, quantity, id]);
    saveDatabase();
    return true;
  }

  /**
   * 释放冻结库存
   */
  async release(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run(`UPDATE inventory_freeze SET status = 'released' WHERE id = ?`, [id]);
    saveDatabase();
    return true;
  }

  /**
   * 删除冻结记录
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM inventory_freeze WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const inventoryFreezeService = new InventoryFreezeService();
