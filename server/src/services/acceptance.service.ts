/**
 * 验收记录服务
 */
import { getDatabase, saveDatabase } from '../db';

export interface AcceptanceRecord {
  id: string;
  delivery_record_id?: string;
  order_id?: string;
  acceptance_date: string;
  acceptance_result: string;
  acceptance_person?: string;
  remarks?: string;
  create_time: string;
}

export class AcceptanceService {
  /**
   * 根据交付记录ID获取验收记录列表
   */
  async getByDeliveryId(deliveryRecordId: string): Promise<AcceptanceRecord[]> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM acceptance_records WHERE delivery_record_id = ?');
    stmt.bind([deliveryRecordId]);
    const items: AcceptanceRecord[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as AcceptanceRecord);
    }
    stmt.free();
    return items;
  }

  /**
   * 创建验收记录
   */
  async create(record: Partial<AcceptanceRecord>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = record.id || `acc_${Date.now()}`;

    db.run(`
      INSERT INTO acceptance_records (id, delivery_record_id, order_id, acceptance_date, acceptance_result, acceptance_person, remarks, create_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, record.delivery_record_id || null, record.order_id || null,
      record.acceptance_date || now.split('T')[0], record.acceptance_result || '',
      record.acceptance_person || '', record.remarks || '', now
    ]);

    saveDatabase();
    return id;
  }

  /**
   * 更新验收记录
   */
  async update(id: string, updates: Partial<AcceptanceRecord>): Promise<boolean> {
    const db = getDatabase();
    const fields: string[] = [];
    const values: (string | null)[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'create_time') {
        fields.push(`${key} = ?`);
        values.push(value as string | null);
      }
    });

    values.push(id);
    db.run(`UPDATE acceptance_records SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  /**
   * 删除验收记录
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM acceptance_records WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const acceptanceService = new AcceptanceService();
