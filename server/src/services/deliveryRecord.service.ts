/**
 * 交付记录服务
 */
import { getDatabase, saveDatabase } from '../db';

export interface DeliveryRecord {
  id: string;
  order_id: string;
  order_code: string;
  delivery_batch: number;
  delivery_quantity: number;
  delivery_date: string;
  quality_check_id?: string;
  acceptance_id?: string;
  inventory_freeze_id?: string;
  remarks?: string;
  create_by?: string;
  create_time: string;
}

export class DeliveryRecordService {
  /**
   * 根据订单ID获取交付记录列表
   */
  async getByOrderId(orderId: string): Promise<DeliveryRecord[]> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM delivery_records WHERE order_id = ? ORDER BY delivery_batch ASC');
    stmt.bind([orderId]);
    const items: DeliveryRecord[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as DeliveryRecord);
    }
    stmt.free();
    return items;
  }

  /**
   * 创建交付记录
   */
  async create(record: Partial<DeliveryRecord>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = record.id || `del_${Date.now()}`;

    db.run(`
      INSERT INTO delivery_records (id, order_id, order_code, delivery_batch, delivery_quantity, delivery_date, quality_check_id, acceptance_id, inventory_freeze_id, remarks, create_by, create_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, record.order_id || '', record.order_code || '',
      record.delivery_batch || 1, record.delivery_quantity || 0,
      record.delivery_date || now.split('T')[0],
      record.quality_check_id || null, record.acceptance_id || null,
      record.inventory_freeze_id || null, record.remarks || '',
      record.create_by || '', now
    ]);

    saveDatabase();
    return id;
  }

  /**
   * 更新交付记录
   */
  async update(id: string, updates: Partial<DeliveryRecord>): Promise<boolean> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'create_time') {
        fields.push(`${key} = ?`);
        values.push(value as string | number | null);
      }
    });

    values.push(id);
    db.run(`UPDATE delivery_records SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  /**
   * 删除交付记录
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM delivery_records WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const deliveryRecordService = new DeliveryRecordService();
