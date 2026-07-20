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
  // 2026-07-20：多作物名 JSON 数组（支持跨作物批量施肥编辑）
  'crop_names',
]);

export interface FertilizerRecord {
  id: string;
  fertilizer_code: string;
  farm_task_id: string | null;
  production_plan_id: string | null;
  production_plan_code: string | null;
  planting_id: string | null;
  planting_code: string | null;
  // 2026-07-05: seedling 关联（与 planting 二选一）；2026-07-16 审核修复：删 [key:string]:any 后补声明
  seedling_id: string | null;
  seedling_code: string | null;
  greenhouse_id: string | null;
  greenhouse_name: string;
  area_name: string | null;
  crop_name: string;
  // 2026-07-20：多作物名 JSON 数组（支持跨作物批量施肥）
  crop_names: string | null;
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
  // 2026-07-12：spec 快照字段（spec 删除后仍能查"当时用了什么"）
  spec_id: string | null;
  spec_brand_name: string | null;
  spec_unit_price_snapshot: number | null;
  spec_batch_number: string | null;
}

/**
 * 2026-07-16：service 层用 queryToObjects 后会得到 camelCase 字段。
 * 为避免使用 [key: string]: any（这破坏类型保护），强制约定：
 * - SQL 列与 FertilizerRecord 字段一一对应（snake_case）
 * - service 层只在反序列化时显式映射
 */
export interface FertilizerRecordCamel {
  id: string;
  fertilizerCode: string;
  farmTaskId: string | null;
  productionPlanId: string | null;
  productionPlanCode: string | null;
  plantingId: string | null;
  plantingCode: string | null;
  greenhouseId: string | null;
  greenhouseName: string;
  areaName: string | null;
  cropName: string;
  cropVariety: string | null;
  fertilizerName: string;
  fertilizerType: string;
  dilutionRatio: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  fertilizeTime: string;
  operatorId: string | null;
  operatorName: string | null;
  dataSource: 'manual' | 'auto_iot';
  iotDeviceId: string | null;
  iotRecordId: string | null;
  description: string | null;
  status: string;
  createTime: string;
  updateTime: string;
  fertilizerId: string | null;
  fertilizationPool: string | null;
  specId: string | null;
  specBrandName: string | null;
  specUnitPriceSnapshot: number | null;
  specBatchNumber: string | null;
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
   * 通用条件查询（带分页 + 排序）
   * 2026-07-16：route 层不再允许 getDatabase() 直写 SQL
   */
  findAll(filters: Record<string, string | undefined>, page: number, pageSize: number): { rows: FertilizerRecord[]; total: number } {
    const db = getDatabase();
    const wheres: string[] = [];
    const params: any[] = [];
    // 白名单过滤字段（防 SQL 注入）
    // 2026-07-16 审核修复：
    // - 补 camelCase 别名（前端 query 发 camelCase，camelCaseRequestMiddleware 只转 body 不转 query）
    // - 文本字段恢复 LIKE 模糊匹配（原路由行为）
    // - 补 planting_code / iot_record_id
    const FILTER_WHITELIST: Record<string, string> = {
      crop_name: 'crop_name', cropName: 'crop_name',
      planting_id: 'planting_id', plantingId: 'planting_id',
      planting_code: 'planting_code', plantingCode: 'planting_code',
      seedling_id: 'seedling_id', seedlingId: 'seedling_id',
      data_source: 'data_source', dataSource: 'data_source',
      fertilizer_name: 'fertilizer_name', fertilizerName: 'fertilizer_name',
      fertilizer_type: 'fertilizer_type', fertilizerType: 'fertilizer_type',
      status: 'status',
      greenhouse_name: 'greenhouse_name', greenhouseName: 'greenhouse_name',
      operator_name: 'operator_name', operatorName: 'operator_name',
      start_date: 'fertilize_time', startDate: 'fertilize_time',
      end_date: 'fertilize_time', endDate: 'fertilize_time',
      iot_record_id: 'iot_record_id', iotRecordId: 'iot_record_id',
    };
    // 文本字段用 LIKE 模糊（与原路由行为一致）
    const LIKE_COLS = new Set(['crop_name', 'fertilizer_name', 'greenhouse_name', 'operator_name', 'planting_code']);
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      const col = FILTER_WHITELIST[key];
      if (!col) continue;
      if (key === 'start_date' || key === 'startDate') {
        wheres.push(`${col} >= ?`);
        params.push(value);
      } else if (key === 'end_date' || key === 'endDate') {
        // 2026-07-16 审核修复：补 23:59:59 — 否则带时间的记录在结束日当天被排除
        wheres.push(`${col} <= ?`);
        params.push(`${value} 23:59:59`);
      } else if (LIKE_COLS.has(col)) {
        // 2026-07-20：crop_name 筛选同时搜索 crop_names JSON 数组（支持跨作物查询）
        if (col === 'crop_name') {
          wheres.push(`(crop_name LIKE '%' || ? || '%' OR crop_names LIKE '%' || ? || '%')`);
          params.push(value, value);
        } else {
          wheres.push(`${col} LIKE '%' || ? || '%'`);
          params.push(value);
        }
      } else {
        wheres.push(`${col} = ?`);
        params.push(value);
      }
    }
    const whereSql = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;
    const rows = queryToObjects<FertilizerRecord>(db,
      `SELECT * FROM fertilizer_records ${whereSql} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]);
    const totalRows = queryToObjects<{ total: number }>(db,
      `SELECT COUNT(*) AS total FROM fertilizer_records ${whereSql}`,
      params);
    return { rows, total: totalRows[0]?.total ?? 0 };
  }

  /**
   * 统计聚合：按 group_by 字段分组
   */
  findStats(filters: Record<string, string | undefined>, groupBy: string): any[] {
    const db = getDatabase();
    const GROUP_WHITELIST: Record<string, string> = {
      month: "strftime('%Y-%m', fertilize_time)",
      crop_name: 'crop_name',
      fertilizer_type: 'fertilizer_type',
      greenhouse_name: 'greenhouse_name',
    };
    const groupExpr = GROUP_WHITELIST[groupBy];
    if (!groupExpr) return [];
    const wheres: string[] = [];
    const params: any[] = [];
    if (filters.start_date) { wheres.push('fertilize_time >= ?'); params.push(filters.start_date); }
    if (filters.end_date) { wheres.push('fertilize_time <= ?'); params.push(filters.end_date); }
    const whereSql = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';
    return queryToObjects(db,
      `SELECT ${groupExpr} AS label,
              COUNT(*) AS record_count,
              SUM(quantity) AS total_quantity,
              SUM(total_cost) AS total_cost,
              AVG(quantity) AS avg_quantity,
              AVG(total_cost) AS avg_cost
       FROM fertilizer_records ${whereSql}
       GROUP BY label ORDER BY label DESC LIMIT 100`,
      params);
  }

  /**
   * 按 IoT 记录 id 查施肥记录（用于幂等去重）
   */
  findByIotRecordId(iotRecordId: string): FertilizerRecord[] {
    const db = getDatabase();
    return queryToObjects<FertilizerRecord>(db,
      `SELECT * FROM fertilizer_records WHERE iot_record_id = ?`, [iotRecordId]);
  }

  /**
   * 查询编码是否存在（用于 generateCode 候选查重 — 精确匹配走 UNIQUE 索引）
   * 2026-07-16 审核修复：原 LIKE 前缀匹配返回全部编码是浪费，改精确 EXISTS
   */
  findAllCodesByPrefix(codeOrPrefix: string): string[] {
    const db = getDatabase();
    const rows = queryToObjects<{ fertilizerCode: string }>(db,
      `SELECT fertilizer_code FROM fertilizer_records WHERE fertilizer_code = ? LIMIT 1`,
      [codeOrPrefix]);
    // queryToObjects 已转 camelCase → fertilizerCode
    return rows.map((r) => r.fertilizerCode);
  }

  /** 查询某天的最大序号（用于 generateCode 不全表扫描） */
  findMaxCodeSeq(prefix: string): number {
    const db = getDatabase();
    // 2026-07-16 审核修复：
    // - SUBSTR 位置 +2（跳过前缀后的 '-' 连字符，否则 CAST('-0001') = -1）
    // - queryToObjects 转 camelCase → 读 maxSeq（原 max_seq 恒 undefined → baseSeq 恒 0）
    const rows = queryToObjects<{ maxSeq: number | null }>(db,
      `SELECT MAX(CAST(SUBSTR(fertilizer_code, ${prefix.length + 2}) AS INTEGER)) AS max_seq
       FROM fertilizer_records WHERE fertilizer_code LIKE ?`,
      [`${prefix}-%`]);
    return rows[0]?.maxSeq ?? 0;
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
        planting_id, planting_code, seedling_id, seedling_code, greenhouse_id, greenhouse_name, area_name,
        crop_name, crop_names, crop_variety, fertilizer_name, fertilizer_type, dilution_ratio,
        quantity, unit, unit_price, total_cost, fertilize_time,
        operator_id, operator_name, data_source, iot_device_id, iot_record_id,
        description, status, create_time, update_time, fertilizer_id,
        fertilization_pool,
        spec_id, spec_brand_name, spec_unit_price_snapshot, spec_batch_number
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `, [
      record.id, record.fertilizer_code, record.farm_task_id, record.production_plan_id,
      record.production_plan_code, record.planting_id, record.planting_code,
      // 2026-07-16 审核修复：补 seedling 2 列（原 insert 漏列 → 育苗关联字段从未落库）
      record.seedling_id ?? null, record.seedling_code ?? null,
      record.greenhouse_id, record.greenhouse_name, record.area_name,
      record.crop_name, record.crop_names ?? null, record.crop_variety, record.fertilizer_name, record.fertilizer_type,
      record.dilution_ratio, record.quantity, record.unit, record.unit_price,
      record.total_cost, record.fertilize_time, record.operator_id, record.operator_name,
      record.data_source, record.iot_device_id, record.iot_record_id,
      record.description, record.status, record.create_time, record.update_time,
      record.fertilizer_id,
      record.fertilization_pool ?? null,
      // 2026-07-12：spec 快照字段（spec 删除后仍能查"当时用了什么"）
      record.spec_id ?? null,
      record.spec_brand_name ?? null,
      record.spec_unit_price_snapshot ?? null,
      record.spec_batch_number ?? null,
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

  // 2026-07-18 P3-L3 清理：deleteByIds 死代码已删除（无 caller）

  /**
   * 查询单条 spec（替代原 findLibraryById）
   * 注意：queryToObjects 已转 camelCase，所以返回字段是 camelCase
   */
  findSpecById(specId: string): { id: string; fertilizerName: string; stockQuantity: number; brandName?: string; fertilizerCode?: string; unitPrice?: number; batchNumber?: string } | null {
    const db = getDatabase();
    const rows = queryToObjects<{ id: string; fertilizerName: string; stockQuantity: number; brandName?: string; fertilizerCode?: string; unitPrice?: number; batchNumber?: string }>(db,
      `SELECT id, fertilizer_code, fertilizer_name, brand_name, unit_price, batch_number, stock_quantity FROM fertilizer_specs WHERE id = ?`, [specId]);
    return rows[0] ?? null;
  }

  /**
   * 扣减 spec 库存（spec 级精确扣减，替代原主表聚合）
   * 2026-07-16：增加安全校验（database-reviewer M-7 TOCTOU）
   * - 只对 stock_quantity >= quantity 的记录扣减（防负数）
   * - 校验 affected_rows（防 specId 不存在导致误返回 0 误判为"扣成 0"）
   * @returns 更新后库存数；返回 null 表示扣减失败（specId 不存在或库存不够）
   */
  decreaseStock(specId: string, quantity: number, now: string): number | null {
    const db = getDatabase();
    db.run(
      `UPDATE fertilizer_specs SET stock_quantity = stock_quantity - ?, update_time = ?
       WHERE id = ? AND stock_quantity >= ?`,
      [quantity, now, specId, quantity],
    );
    const affected = db.getRowsModified();
    if (affected === 0) {
      // specId 不存在 或 库存不够
      return null;
    }
    const rows = queryToObjects<{ stockQuantity: number }>(db,
      `SELECT stock_quantity FROM fertilizer_specs WHERE id = ?`, [specId]);
    return rows[0]?.stockQuantity ?? 0;
  }

  /**
   * 恢复 spec 库存（DELETE 记录时调用）
   * 2026-07-18 P0-C5 修复：检测 specId 是否存在，不存在时抛业务错误避免库存永久丢失
   */
  increaseStock(specId: string, quantity: number, now: string): number {
    const db = getDatabase();
    // 先检查 spec 是否存在（避免 UPDATE 影响 0 行但静默成功）
    const exists = queryToObjects<{ id: string }>(db,
      `SELECT id FROM fertilizer_specs WHERE id = ?`, [specId]);
    if (exists.length === 0) {
      throw new Error(`肥料规格不存在，无法恢复库存：specId=${specId}`);
    }
    db.run(
      `UPDATE fertilizer_specs SET stock_quantity = stock_quantity + ?, update_time = ? WHERE id = ?`,
      [quantity, now, specId],
    );
    const rows = queryToObjects<{ stockQuantity: number }>(db,
      `SELECT stock_quantity FROM fertilizer_specs WHERE id = ?`, [specId]);
    return rows[0]?.stockQuantity ?? 0;
  }

  /**
   * 持久化到磁盘（sql.js 内存模式需要在事务结束后统一 save）
   */
  save(): void {
    saveDatabase();
  }
}

export const fertilizerRepository = new FertilizerRepository();
