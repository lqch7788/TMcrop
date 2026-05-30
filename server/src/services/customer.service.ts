/**
 * 客户档案服务
 * 提供客户档案的 CRUD 操作
 */
import { getDatabase, saveDatabase } from '../db';

export interface Customer {
  id: string;
  customer_code: string;
  customer_name: string;
  contact_person?: string;
  contact_phone?: string;
  delivery_address?: string;
  remarks?: string;
  create_by?: string;
  create_time: string;
  update_time: string;
}

export class CustomerService {
  /**
   * 获取客户列表（支持搜索和分页）
   */
  async getCustomers(params: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Customer[]; total: number }> {
    const db = getDatabase();
    const { search, page = 1, limit = 20 } = params;

    let sql = 'SELECT * FROM customers WHERE 1=1';
    const queryParams: (string | number)[] = [];

    if (search) {
      sql += ' AND (customer_name LIKE ? OR contact_person LIKE ? OR contact_phone LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const offset = (page - 1) * limit;
    const finalSql = `${sql} ORDER BY create_time DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: Customer[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Customer);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM customers WHERE 1=1${search ? ' AND (customer_name LIKE ? OR contact_person LIKE ? OR contact_phone LIKE ?)' : ''}`;
    const countStmt = db.prepare(countSql);
    countStmt.bind(search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);
    countStmt.step();
    const total = countStmt.getAsObject().total as number;
    countStmt.free();

    return { data: items, total };
  }

  /**
   * 根据ID获取客户详情
   */
  async getById(id: string): Promise<Customer | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM customers WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as Customer;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  /**
   * 创建新客户
   */
  async create(customer: Partial<Customer>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = customer.id || `cust_${Date.now()}`;
    const code = customer.customer_code || `C${Date.now()}`;

    db.run(`
      INSERT INTO customers (id, customer_code, customer_name, contact_person, contact_phone, delivery_address, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, code, customer.customer_name || '', customer.contact_person || null,
      customer.contact_phone || null, customer.delivery_address || null,
      customer.remarks || '', customer.create_by || '', now, now
    ]);

    saveDatabase();
    return id;
  }

  /**
   * 更新客户信息
   */
  async update(id: string, updates: Partial<Customer>): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const fields: string[] = [];
    const values: (string | null)[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'create_time') {
        fields.push(`${key} = ?`);
        values.push(value as string | null);
      }
    });

    fields.push('update_time = ?');
    values.push(now);
    values.push(id);

    db.run(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  /**
   * 删除客户
   */
  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM customers WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const customerService = new CustomerService();
