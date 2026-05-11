/**
 * 通知服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface Notification {
  id: string;
  receiver_id: string;
  receiver_name: string;
  title: string;
  content: string;
  type: string;
  related_id?: string;
  is_read: number;
  read_time?: string;
  created_at: string;
}

export class NotificationService {
  async getNotifications(params: {
    receiverId: string;
    isRead?: number;
    type?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Notification[]; total: number; unread: number }> {
    const db = getDatabase();
    const { receiverId, isRead, type, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM notifications WHERE receiver_id = ?';
    const conditions: string[] = ['receiver_id = ?'];
    const queryParams: any[] = [receiverId];

    if (isRead !== undefined) {
      conditions.push('is_read = ?');
      queryParams.push(isRead);
    }
    if (type) {
      conditions.push('type = ?');
      queryParams.push(type);
    }

    const whereClause = ` WHERE ${conditions.join(' AND ')}`;
    const offset = (page - 1) * limit;

    const finalSql = `SELECT * FROM notifications${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: Notification[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Notification);
    }
    stmt.free();

    // 获取总数
    const countSql = `SELECT COUNT(*) as total FROM notifications${whereClause}`;
    const countStmt = db.prepare(countSql);
    countStmt.bind(queryParams);
    countStmt.step();
    const countResult = countStmt.getAsObject();
    countStmt.free();

    // 获取未读数
    const unreadStmt = db.prepare('SELECT COUNT(*) as unread FROM notifications WHERE receiver_id = ? AND is_read = 0');
    unreadStmt.bind([receiverId]);
    unreadStmt.step();
    const unreadResult = unreadStmt.getAsObject();
    unreadStmt.free();

    return {
      data: items,
      total: countResult.total as number,
      unread: unreadResult.unread as number,
    };
  }

  async create(notification: Partial<Notification>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = notification.id || `notif_${Date.now()}`;

    db.run(`
      INSERT INTO notifications (
        id, receiver_id, receiver_name, title, content, type,
        related_id, is_read, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      notification.receiver_id || '',
      notification.receiver_name || '',
      notification.title || '',
      notification.content || '',
      notification.type || 'system',
      notification.related_id || null,
      0,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async markAsRead(id: string): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.run('UPDATE notifications SET is_read = 1, read_time = ? WHERE id = ?', [now, id]);
    saveDatabase();
    return true;
  }

  async markAllAsRead(receiverId: string): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    db.run('UPDATE notifications SET is_read = 1, read_time = ? WHERE receiver_id = ? AND is_read = 0', [now, receiverId]);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM notifications WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const notificationService = new NotificationService();
