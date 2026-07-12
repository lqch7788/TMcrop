/**
 * 施肥数据访问层 (Repository)
 * G11 V1.1：新增库关联追溯 + 库存扣减/恢复支持
 * 负责所有数据库 SQL 操作
 */

import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

/**
 * 施肥记录允许更新的列白名单（防止任意字段被写入 DB）
 * 路由层 PUT 必须只允许这些字段；FK 列 fertilizer_id 单独走专用方法
 */
const ALLOWED_UPDATE_COLUMNS = new Set<string>([
  'farm_task_id',
  'production_plan_id',
  'production_plan_code',
  'planting_id',
  'planting_code',
  'greenhouse_id',
  'greenhouse_name',
  'area_name',
  'crop_name',
  'crop_variety',
  'fertilizer_name',
  'fertilizer_type',
  'dilution_ratio',
  'quantity',
  'unit',
  'unit_price',
  'total_cost',
  'fertilize_time',
  'operator_id',
  'operator_name',
  'description',
  'update_time',
  'fertilization_pool',
]);

export interface FertilizerRecord {
  id: string;
  fertilizer_code: string;
  farm_task_id: string | null;
  production_plan_id: string | null;
  production_plan_code: string | null;
  planting_id: string | null;
  planting_code: string | null;
  greenhouse_id: string | null;
  greenhouse_name: string;
  area_name: string | null;
  crop_name: string;
  crop_variety: string | null;
  fertilizer_name: string;
  fertilizer_type: string;
  dilution_ratio: string;
  quantity: number;
  unit: string;
  unit_price: number;
  total_cost: number;
  fertilize_time: string;
  operator_id: string | null;
  operator_name: string | null;
  data_source: 'manual' | 'auto_iot';
  iot_device_id: string | null;
  iot_record_id: string | null;
  description: string | null;
  status: string;
  create_time: string;
  update_time: string;
  /** G11 V1.1：关联肥料库 id（外键到 fertilizer_library.id），老数据可空 */
  fertilizer_id: string | null;
  // 2026-07-12：施肥区域池（JSON 字符串），每条独立区域+用量+单位+稀释倍数
  fertilization_pool: string | null;
  // 注意：运行时通过 queryToObjects 获取的对象会自动转 camelCase
  // 这里用 [key: string]: any 让 service 端可用 camelCase 字段而不报错
  [key: string]: any;
}

export class FertilizerRepository {
  /**
   * 查询单条施肥记录
   * @param id 记录 id
   */
  findById(id: string): FertilizerRecord | null {
    const db = getDatabase();
    const rows = queryToObjects<FertilizerRecord>(db, `SELECT * FROM fertilizer_records WHERE id = ?`, [id]);
    return rows[0] ?? null;
  }

  /**
   * 查询某肥料库的所有施肥记录（用于删除/重建库存校验）
   * @param fertilizerId 肥料库 id
   */
  findByFertilizerId(fertilizerId: string): FertilizerRecord[] {
    const db = getDatabase();
    return queryToObjects<FertilizerRecord>(db,
      `SELECT * FROM fertilizer_records WHERE fertilizer_id = ?`, [fertilizerId]);
  }

  /**
   * 插入施肥记录（不含 fertilizer_id，由 service 层按业务决定是否传入）
   * @param record 完整记录
   */
  insert(record: FertilizerRecord): void {
    const db = getDatabase();
    db.run(`
      INSERT INTO fertilizer_records (
        id, fertilizer_code, farm_task_id, production_plan_id, production_plan_code,
        planting_id, planting_code, greenhouse_id, greenhouse_name, area_name,
        crop_name, crop_variety, fertilizer_name, fertilizer_type, dilution_ratio,
        quantity, unit, unit_price, total_cost, fertilize_time,
        operator_id, operator_name, data_source, iot_device_id, iot_record_id,
        description, status, create_time, update_time, fertilizer_id,
        fertilization_pool
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      record.id, record.fertilizer_code, record.farm_task_id, record.production_plan_id,
      record.production_plan_code, record.planting_id, record.planting_code,
      record.greenhouse_id, record.greenhouse_name, record.area_name,
      record.crop_name, record.crop_variety, record.fertilizer_name, record.fertilizer_type,
      record.dilution_ratio, record.quantity, record.unit, record.unit_price,
      record.total_cost, record.fertilize_time, record.operator_id, record.operator_name,
      record.data_source, record.iot_device_id, record.iot_record_id,
      record.description, record.status, record.create_time, record.update_time,
      record.fertilizer_id,
      record.fertilization_pool ?? null,
    ]);
  }

  /**
   * 更新施肥记录（白名单字段）
   * 接受 camelCase key（如 unitPrice），内部按白名单 + 转换到 snake_case 列
   * @returns 实际被更新的字段数（用于 service 校验"无变化"）
   */
  update(id: string, updates: Partial<FertilizerRecord>): number {
    const db = getDatabase();
    const sets: string[] = [];
    const params: any[] = [];
    // camelCase → snake_case 映射（与 FertilizerRecord 字段一致）
    const camelToSnake: Record<string, string> = {};
    for (const col of ALLOWED_UPDATE_COLUMNS) {
      const camel = col.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
      camelToSnake[camel] = col;
    }
    for (const [key, value] of Object.entries(updates)) {
      const col = camelToSnake[key] ?? (ALLOWED_UPDATE_COLUMNS.has(key) ? key : null);
      if (!col) continue;
      sets.push(`${col} = ?`);
      params.push(value);
    }
    if (sets.length === 0) return 0;
    params.push(id);
    db.run(`UPDATE fertilizer_records SET ${sets.join(', ')} WHERE id = ?`, params);
    return sets.length;
  }

  /**
   * 删除单条记录
   * @returns 受影响行数
   */
  deleteById(id: string): number {
    const db = getDatabase();
    const stmt = db.prepare(`DELETE FROM fertilizer_records WHERE id = ?`);
    stmt.run([id]);
    stmt.free();
    return db.getRowsModified();
  }

  /**
   * 批量删除记录
   * @returns 受影响行数
   */
  deleteByIds(ids: string[]): number {
    if (ids.length === 0) return 0;
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM fertilizer_records WHERE id IN (${placeholders})`, ids);
    return db.getRowsModified();
  }

  /**
   * 查询肥料库记录（用于库存检查）
   * 注意：queryToObjects 自动转 camelCase，所以 current_stock → currentStock
   * @param fertilizerId 肥料库 id
   */
  findLibraryById(fertilizerId: string): { id: string; fertilizerName: string; currentStock: number } | null {
    const db = getDatabase();
    const rows = queryToObjects<{ id: string; fertilizerName: string; currentStock: number }>(db,
      `SELECT id, fertilizer_name, current_stock FROM fertilizer_library WHERE id = ?`, [fertilizerId]);
    return rows[0] ?? null;
  }

  /**
   * 扣减肥料库库存（用于事务内调用）
   * @returns 更新后库存数（负数表示扣成负数，不允许 — 调用方需校验）
   */
  decreaseStock(fertilizerId: string, quantity: number, now: string): number {
    const db = getDatabase();
    db.run(
      `UPDATE fertilizer_library SET current_stock = current_stock - ?, update_time = ? WHERE id = ?`,
      [quantity, now, fertilizerId],
    );
    const rows = queryToObjects<{ currentStock: number }>(db,
      `SELECT current_stock FROM fertilizer_library WHERE id = ?`, [fertilizerId]);
    return rows[0]?.currentStock ?? 0;
  }

  /**
   * 恢复肥料库库存（DELETE 记录时调用）
   */
  increaseStock(fertilizerId: string, quantity: number, now: string): number {
    const db = getDatabase();
    db.run(
      `UPDATE fertilizer_library SET current_stock = current_stock + ?, update_time = ? WHERE id = ?`,
      [quantity, now, fertilizerId],
    );
    const rows = queryToObjects<{ currentStock: number }>(db,
      `SELECT current_stock FROM fertilizer_library WHERE id = ?`, [fertilizerId]);
    return rows[0]?.currentStock ?? 0;
  }

  /**
   * 持久化到磁盘（sql.js 内存模式需要在事务结束后统一 save）
   */
  save(): void {
    saveDatabase();
  }
}

export const fertilizerRepository = new FertilizerRepository();
