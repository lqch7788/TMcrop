/**
 * 种源数据访问层 (Repository)
 * 负责所有数据库 SQL 操作
 */

import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { SeedSourceRecord, SeedSourceQuery } from '../types/seedSource';

/**
 * 种源 Repository 类
 * 提供种源数据的增删改查操作
 */
export class SeedSourceRepository {
  /**
   * 查询种源列表（分页、筛选）
   * @param query 查询条件
   * @returns 种源数据列表和总数
   */
  async findAll(query: SeedSourceQuery): Promise<{ data: SeedSourceRecord[]; total: number }> {
    const db = getDatabase();
    const { crop_name, status, page = 1, limit = 50 } = query;

    // 使用 SQL 别名将数据库字段映射到前端期望的字段名
    // 通过 LEFT JOIN 获取 crop_varieties 表的详细信息
    let baseSql = `SELECT
      ss.id,
      ss.source_code AS seedCode,
      ss.source_name AS sourceName,
      ss.source_type AS sourceType,
      COALESCE(ss.source_origin, 'external_purchase') AS sourceOrigin,
      COALESCE(cv.category_name, ss.crop_category, '') AS cropCategory,
      COALESCE(cv.type_name, ss.type_name, '') AS typeName,
      COALESCE(cv.sub_variety1_name, cv.variety_name, ss.variety_name, '') AS varietyName,
      ss.crop_name AS cropName,
      COALESCE(ss.crop_variety, '') AS cropVariety,
      COALESCE(cv.crop_code, ss.crop_code, '') AS cropCode,
      ss.supplier_id AS supplierId,
      ss.supplier_name AS supplierName,
      ss.purchase_date AS purchaseDate,
      ss.quantity,
      ss.unit,
      ss.purchase_price AS unitPrice,
      ss.total_amount AS totalAmount,
      ss.remaining_quantity AS availableCount,
      ss.quantity AS initialCount,
      '[]' AS pictures,
      ss.used_quantity AS usedQuantity,
      ss.remaining_quantity,
      ss.status,
      ss.remarks,
      ss.production_plan_code AS productionPlanCode,
      0 AS printCount,
      ss.create_by AS createBy,
      ss.create_time AS createTime,
      ss.update_time AS updateTime
    FROM seed_sources ss
    LEFT JOIN crop_varieties cv
      ON ss.crop_code = cv.crop_code
    WHERE 1=1`;

    const params: any[] = [];

    if (crop_name) {
      baseSql += ' AND ss.crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      baseSql += ' AND ss.status = ?';
      params.push(status);
    }

    // Count 查询
    let countSql = `SELECT COUNT(*) as total FROM seed_sources ss LEFT JOIN crop_varieties cv ON ss.crop_code = cv.crop_code WHERE 1=1`;
    const countParams: any[] = [];

    if (crop_name) {
      countSql += ' AND ss.crop_name LIKE ?';
      countParams.push(`%${crop_name}%`);
    }
    if (status) {
      countSql += ' AND ss.status = ?';
      countParams.push(status);
    }

    baseSql += ' ORDER BY ss.create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, countParams);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    baseSql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects<SeedSourceRecord>(db, baseSql, params);

    return { data: items, total };
  }

  /**
   * 根据ID查询种源详情
   * @param id 种源ID
   * @returns 种源记录或 undefined
   */
  async findById(id: string): Promise<SeedSourceRecord | undefined> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM seed_sources WHERE id = ?');
    stmt.bind([id]);

    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return undefined;
    }

    // 先转换为 unknown 再转换为目标类型
    return item as unknown as SeedSourceRecord;
  }

  /**
   * 创建种源记录
   * @param data 种源数据
   * @returns 创建的种源记录
   */
  async create(data: Partial<SeedSourceRecord>): Promise<SeedSourceRecord> {
    const db = getDatabase();
    const newId = data.id || `SS${Date.now()}`;
    const now = new Date().toISOString();

    // 使用 any[] 来避免 sql.js 类型严格检查问题
    const params: any[] = [
      newId,
      data.source_code || '',
      data.source_name || '',
      data.source_type || '',
      data.source_origin || 'external_purchase',
      data.production_plan_code || '',
      data.crop_category || '',
      data.type_name || '',
      data.variety_name || '',
      data.crop_name || '',
      data.crop_variety || '',
      data.crop_code || '',
      data.supplier_id || '',
      data.supplier_name || '',
      data.quantity || 0,
      data.unit || '',
      data.purchase_date || '',
      data.purchase_price || 0,
      data.total_amount || 0,
      data.used_quantity || 0,
      data.remaining_quantity || data.quantity || 0,
      data.status || 'active', // TODO: 使用 CommonStatus.ACTIVE 枚举
      data.remarks || '',
      data.create_by || '',
      data.create_by_id || '',
      now,
      now
    ];

    db.run(`
      INSERT INTO seed_sources (id, source_code, source_name, source_type, source_origin,
        production_plan_code, crop_category, type_name, variety_name, crop_name, crop_variety, crop_code,
        supplier_id, supplier_name, quantity, unit, purchase_date, purchase_price,
        total_amount, used_quantity, remaining_quantity, status, remarks, create_by, create_by_id, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, params);

    saveDatabase();

    return { ...data, id: newId, create_time: now, update_time: now } as SeedSourceRecord;
  }

  /**
   * 更新种源记录
   * @param id 种源ID
   * @param data 更新数据
   * @returns 更新后的种源记录
   */
  async update(id: string, data: Partial<SeedSourceRecord>): Promise<SeedSourceRecord> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const fields = Object.keys(data).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');

    if (fields.length === 0) {
      throw new Error('没有需要更新的字段');
    }

    // 使用 any[] 来避免 sql.js 类型严格检查问题
    const values: any[] = Object.keys(data).filter(k => k !== 'id').map(k => data[k as keyof SeedSourceRecord]);
    values.push(now, id);

    db.run(`UPDATE seed_sources SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();

    // 返回更新后的记录
    return this.findById(id) as Promise<SeedSourceRecord>;
  }

  /**
   * 删除种源记录
   * @param id 种源ID
   */
  async delete(id: string): Promise<void> {
    const db = getDatabase();
    db.run('DELETE FROM seed_sources WHERE id = ?', [id]);
    saveDatabase();
  }

  /**
   * 批量删除种源记录
   * @param ids 种源ID数组
   * @returns 删除数量
   */
  async deleteBatch(ids: string[]): Promise<number> {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM seed_sources WHERE id IN (${placeholders})`, ids);
    saveDatabase();
    return ids.length;
  }
}

// 导出单例
export const seedSourceRepository = new SeedSourceRepository();
