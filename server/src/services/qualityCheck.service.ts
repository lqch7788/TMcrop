/**
 * 质检记录服务
 */
import { getDatabase, saveDatabase } from '../db';

export interface QualityCheckRecord {
  id: string;
  delivery_record_id?: string;
  order_id?: string;
  check_date: string;
  check_result: string;
  check_person?: string;
  check_items?: string; // JSON string
  remarks?: string;
  create_time: string;
}

export class QualityCheckService {
  /**
   * 根据交付记录ID获取质检记录列表
   */
  async getByDeliveryId(deliveryRecordId: string): Promise<QualityCheckRecord[]> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM quality_check_records WHERE delivery_record_id = ?');
    stmt.bind([deliveryRecordId]);
    const items: QualityCheckRecord[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as QualityCheckRecord);
    }
    stmt.free();
    return items;
  }

  /**
   * 创建质检记录
   */
  async create(record: Partial<QualityCheckRecord>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = record.id || `qc_${Date.now()}`;

    db.run(`
      INSERT INTO quality_check_records (id, delivery_record_id, order_id, check_date, check_result, check_person, check_items, remarks, create_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, record.delivery_record_id || null, record.order_id || null,
      record.check_date || now.split('T')[0], record.check_result || '',
      record.check_person || '', record.check_items || '[]',
      record.remarks || '', now
    ]);

    saveDatabase();
    return id;
  }

  /**
   * 更新质检记录
   */
  async update(id: string, updates: Partial<QualityCheckRecord>): Promise<boolean> {
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
    db.run(`UPDATE quality_check_records SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  /**
   * 删除质检记录
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM quality_check_records WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const qualityCheckService = new QualityCheckService();
