/**
 * 防治记录数据访问层 (Repository)
 * 2026-07-17 新增：防治记录 → 肥料库存扣减支持
 * - 封装 pesticide_records 表 CRUD
 * - 库存扣减委托 fertilizerRepository.decreaseStock / increaseStock（跨表，肥料规格唯一权威源）
 * - Repository 自身不持有事务边界，事务由 Service 层管理
 */
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

/**
 * 防治记录允许更新的列白名单（防止任意字段被写入 DB）
 * - 不含 leaf_fertilizer_list 等 JSON 池 — 池更新走 Service 层的 diff 逻辑
 */
const ALLOWED_UPDATE_COLUMNS = new Set<string>([
  'spray_time',
  'operator_id',
  'operator_name',
  'crop_name',
  // 2026-07-21：多作物 JSON 数组（与 fertilizer_records 对齐，允许 Put 时一并更新）
  'crop_names',
  'greenhouse_name',
  'planting_id',
  'planting_code',
  'seedling_id',
  'seedling_code',
  'pesticide_id',
  'pesticide_name',
  'pesticide_type',
  'spec_id',
  'spec_content',
  'dosage',
  'dosage_unit',
  'dilution_ratio',
  'target_pest',
  'application_method',
  'bio_agent_id',
  'bio_agent_name',
  'bio_agent_type',
  'equipment_name',
  'equipment_count',
  'pesticide_list',
  'bio_agent_list',
  'equipment_list',
  'use_leaf_fertilizer',
  'leaf_fertilizer_name',
  'leaf_fertilizer_dosage',
  'leaf_fertilizer_unit',
  'leaf_fertilizer_list',
  'description',
  'photos',
  'update_time',
]);

/**
 * 2026-07-17：防治记录主实体（与 DB 列 snake_case 一一对应）
 * - 注意 leaf_fertilizer_list 是 JSON 字符串，调用方按需 JSON.parse
 */
export interface PesticideRecord {
  id: string;
  record_code: string;
  spray_time: string;
  operator_id: string | null;
  operator_name: string | null;
  crop_name: string;
  // 2026-07-21：多作物名 JSON 数组（与 fertilizer_records 对齐；允许同一次防治覆盖多个作物）
  crop_names: string | null;
  greenhouse_name: string | null;
  planting_id: string | null;
  planting_code: string | null;
  seedling_id: string | null;
  seedling_code: string | null;
  pesticide_id: string | null;
  pesticide_name: string | null;
  pesticide_type: string | null;
  spec_id: string | null;
  spec_content: string | null;
  dosage: number | null;
  dosage_unit: string | null;
  dilution_ratio: string | null;
  target_pest: string | null;
  application_method: string | null;
  bio_agent_id: string | null;
  bio_agent_name: string | null;
  bio_agent_type: string | null;
  equipment_name: string | null;
  equipment_count: number | null;
  pesticide_list: string | null;
  bio_agent_list: string | null;
  equipment_list: string | null;
  use_leaf_fertilizer: string;
  leaf_fertilizer_name: string | null;
  leaf_fertilizer_dosage: number | null;
  leaf_fertilizer_unit: string | null;
  leaf_fertilizer_list: string | null;
  description: string | null;
  photos: string | null;
  create_time: string;
  update_time: string;
}

/**
 * 2026-07-17：解析后的 leafFertilizerList 条目
 * - 与 AddPestControlModal 的 FertilizerPoolItem 字段对应
 * - specId 是关键字段：为空表示旧 schema 兼容数据，跳过库存扣减
 */
export interface LeafFertilizerItem {
  specId?: string;
  fertilizerName?: string;
  fertilizerCode?: string;
  fertilizerType?: string;
  brandName?: string;
  specContent?: string;
  manufacturer?: string;
  dosage?: string | number;
  unit?: string;
  dilutionRatio?: string;
  fertilizationMethod?: string;
  unitPrice?: string | number;
}

/**
 * 2026-07-17：安全解析 leafFertilizerList（兼容 string JSON / 已解析的 array / null undefined）
 * 2026-07-18 P1-H5 修复：解析失败时记录 warning 日志，避免静默返回空数组（导致库存未扣但记录写入）
 */
export function parseLeafFertilizerList(raw: unknown): LeafFertilizerItem[] {
  if (raw == null) return [];
  let arr: any = raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      arr = JSON.parse(raw);
    } catch (e) {
      // 解析失败时记录 warning，便于排查"记录写入但库存未扣"的数据异常
      console.warn('[parseLeafFertilizerList] JSON.parse 失败，已忽略:', (e as Error).message, 'raw=', raw.slice(0, 100));
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  return arr.filter((x: any) => x && typeof x === 'object');
}

export class PesticideRepository {
  /**
   * 查询单条防治记录
   */
  findById(id: string): PesticideRecord | null {
    const db = getDatabase();
    const rows = queryToObjects<PesticideRecord>(
      db,
      `SELECT * FROM pesticide_records WHERE id = ?`,
      [id],
    );
    return rows[0] ?? null;
  }

  /**
   * 查询所有防治记录（带分页 + 排序）
   */
  findAll(
    filters: Record<string, string | undefined>,
    page: number,
    pageSize: number,
  ): { rows: PesticideRecord[]; total: number } {
    const db = getDatabase();
    const wheres: string[] = [];
    const params: any[] = [];
    const FILTER_WHITELIST: Record<string, string> = {
      crop_name: 'crop_name', cropName: 'crop_name',
      greenhouse_name: 'greenhouse_name', greenhouseName: 'greenhouse_name',
      operator_name: 'operator_name', operatorName: 'operator_name',
      pesticide_type: 'pesticide_type', pesticideType: 'pesticide_type',
      start_date: 'spray_time', startDate: 'spray_time',
      end_date: 'spray_time', endDate: 'spray_time',
    };
    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      const col = FILTER_WHITELIST[key];
      if (!col) continue;
      if (key === 'start_date' || key === 'startDate') {
        wheres.push(`${col} >= ?`);
        params.push(value);
      } else if (key === 'end_date' || key === 'endDate') {
        // 补 23:59:59 — 否则带时间的记录在结束日当天被排除
        wheres.push(`${col} <= ?`);
        params.push(`${value} 23:59:59`);
      } else if (['crop_name', 'greenhouse_name', 'operator_name'].includes(col)) {
        wheres.push(`${col} LIKE '%' || ? || '%'`);
        params.push(value);
      } else {
        wheres.push(`${col} = ?`);
        params.push(value);
      }
    }
    const whereSql = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;
    const rows = queryToObjects<PesticideRecord>(
      db,
      `SELECT * FROM pesticide_records ${whereSql} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );
    const totalRows = queryToObjects<{ total: number }>(
      db,
      `SELECT COUNT(*) AS total FROM pesticide_records ${whereSql}`,
      params,
    );
    return { rows, total: totalRows[0]?.total ?? 0 };
  }

  /**
   * 查询使用过某肥料（specId）的所有防治记录
   * 2026-07-17：用于肥料库详情弹窗"使用记录"tab 的反向追溯
   * - 用 json_each 展开 leaf_fertilizer_list JSON 池，过滤匹配 specId 的条目
   */
  findByFertilizerSpecId(specId: string, page: number, pageSize: number): { rows: PesticideRecord[]; total: number } {
    const db = getDatabase();
    const offset = (page - 1) * pageSize;
    const rows = queryToObjects<PesticideRecord>(
      db,
      `SELECT * FROM pesticide_records
       WHERE EXISTS (
         SELECT 1 FROM json_each(pesticide_records.leaf_fertilizer_list)
         WHERE json_extract(json_each.value, '$.specId') = ?
       )
       ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [specId, pageSize, offset],
    );
    const totalRows = queryToObjects<{ total: number }>(
      db,
      `SELECT COUNT(*) AS total FROM pesticide_records
       WHERE EXISTS (
         SELECT 1 FROM json_each(pesticide_records.leaf_fertilizer_list)
         WHERE json_extract(json_each.value, '$.specId') = ?
       )`,
      [specId],
    );
    return { rows, total: totalRows[0]?.total ?? 0 };
  }

  /**
   * 插入防治记录（不含事务，由 service 层管理）
   */
  insert(record: PesticideRecord): void {
    const db = getDatabase();
    db.run(
      `INSERT INTO pesticide_records (
        id, record_code, spray_time, operator_id, operator_name, crop_name, crop_names, greenhouse_name,
        planting_id, planting_code, seedling_id, seedling_code,
        pesticide_id, pesticide_name, pesticide_type, spec_id, spec_content,
        dosage, dosage_unit, dilution_ratio, target_pest, application_method,
        bio_agent_id, bio_agent_name, bio_agent_type,
        equipment_name, equipment_count,
        pesticide_list, bio_agent_list, equipment_list,
        use_leaf_fertilizer, leaf_fertilizer_name, leaf_fertilizer_dosage, leaf_fertilizer_unit,
        leaf_fertilizer_list,
        description, photos, create_time, update_time
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        record.id, record.record_code, record.spray_time,
        record.operator_id, record.operator_name, record.crop_name, record.crop_names ?? null, record.greenhouse_name,
        record.planting_id, record.planting_code, record.seedling_id, record.seedling_code,
        record.pesticide_id, record.pesticide_name, record.pesticide_type,
        record.spec_id, record.spec_content,
        record.dosage, record.dosage_unit, record.dilution_ratio,
        record.target_pest, record.application_method,
        record.bio_agent_id, record.bio_agent_name, record.bio_agent_type,
        record.equipment_name, record.equipment_count,
        record.pesticide_list, record.bio_agent_list, record.equipment_list,
        record.use_leaf_fertilizer, record.leaf_fertilizer_name,
        record.leaf_fertilizer_dosage, record.leaf_fertilizer_unit,
        record.leaf_fertilizer_list,
        record.description, record.photos,
        record.create_time, record.update_time,
      ],
    );
  }

  /**
   * 更新防治记录（白名单字段）
   * - 接受 camelCase key（如 leafFertilizerList），内部按白名单 + 转换到 snake_case 列
   */
  update(id: string, updates: Record<string, any>): number {
    const db = getDatabase();
    const sets: string[] = [];
    const params: any[] = [];
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
    db.run(`UPDATE pesticide_records SET ${sets.join(', ')} WHERE id = ?`, params);
    return sets.length;
  }

  /**
   * 删除单条记录
   * @returns 受影响行数
   */
  deleteById(id: string): number {
    const db = getDatabase();
    const stmt = db.prepare(`DELETE FROM pesticide_records WHERE id = ?`);
    stmt.run([id]);
    stmt.free();
    return db.getRowsModified();
  }

  // 2026-07-18 P3-L3 清理：deleteByIds 死代码已删除（无 caller，service.removeBatch 用循环 remove 实现）

  /**
   * 持久化到磁盘（sql.js 内存模式需要在事务结束后统一 save）
   */
  save(): void {
    saveDatabase();
  }
}

export const pesticideRepository = new PesticideRepository();