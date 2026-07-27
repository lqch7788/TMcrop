/**
 * 浇水记录 Repository（数据访问层）
 * 2026-07-20：Phase 1 - 独立浇水记录 CRUD
 *
 * 设计文档：docs/superpowers/specs/2026-07-20-water-fertilizer-design.md §3
 */

import { getDatabase, saveDatabase } from '../db';
import { nowLocalTimestamp } from '../lib/timeUtils';

export interface WateringRecord {
  id: string;
  waterCode: string;
  recordType: 'manual' | 'fertilizer_dilution' | 'daily_sync';
  fertilizerRecordId?: string | null;
  sourceDailyRecordId?: string | null;
  cropName: string;
  // 2026-07-24：多区域多作物时汇总所有作物名（JSON 字符串），与施肥记录一致
  cropNames?: string | null;
  cropVariety?: string | null;
  greenhouseId?: string | null;
  greenhouseName: string;
  areaId?: string | null;
  areaName?: string | null;
  plantingId?: string | null;
  plantingCode?: string | null;
  seedlingId?: string | null;
  seedlingCode?: string | null;
  waterPool?: string | null;
  totalWater: number;
  waterUnit: string;
  waterCost?: number;
  waterTime: string;
  operatorId?: string | null;
  operatorName?: string | null;
  dataSource: 'manual' | 'auto_iot';
  iotDeviceId?: string | null;
  description?: string | null;
  status: string;
  createTime: string;
  updateTime: string;
}

class WateringRepository {
  findById(id: string): WateringRecord | null {
    const db = getDatabase();
    // 2026-07-27 审核修复 C-1：改用 db.prepare/step 风格，让 mapRow 直接 getAsObject
    const stmt = db.prepare(`SELECT * FROM watering_records WHERE id = ?`);
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return null;
    }
    const rec = this.mapRow(stmt);
    stmt.free();
    return rec;
  }

  findAll(filters: Record<string, any> = {}, page = 1, pageSize = 20): { items: WateringRecord[]; total: number } {
    const db = getDatabase();
    const where: string[] = [];
    const params: any[] = [];

    if (filters.recordType) {
      where.push('record_type = ?');
      params.push(filters.recordType);
    }
    if (filters.cropName) {
      where.push('crop_name LIKE ?');
      params.push(`%${filters.cropName}%`);
    }
    if (filters.greenhouseName) {
      where.push('greenhouse_name LIKE ?');
      params.push(`%${filters.greenhouseName}%`);
    }
    if (filters.operatorName) {
      where.push('operator_name LIKE ?');
      params.push(`%${filters.operatorName}%`);
    }
    if (filters.startDate) {
      where.push('water_time >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      where.push('water_time <= ?');
      params.push(filters.endDate);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;

    const totalResult = db.exec(`SELECT COUNT(*) as cnt FROM watering_records ${whereClause}`, params);
    const total = totalResult[0].values[0][0] as number;

    const itemsResult = db.exec(
      `SELECT * FROM watering_records ${whereClause} ORDER BY water_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );
    const items = itemsResult.length > 0 ? itemsResult[0].values.map((row) => this.mapRow(row)) : [];

    return { items, total };
  }

  /**
   * 生成浇水编号 SW+YYYYMMDD-4位流水号
   * 参照 fertilizer.service.ts generateCode() 模式
   */
  generateCode(): string | null {
    const db = getDatabase();
    const today = new Date();
    const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const prefix = `SW${datePrefix}`;
    const MAX_RETRIES = 10;

    const baseSeqResult = db.exec(
      `SELECT MAX(CAST(SUBSTR(water_code, -4) AS INTEGER)) FROM watering_records WHERE water_code LIKE ?`,
      [`${prefix}%`],
    );
    const baseSeq = (baseSeqResult[0]?.values[0]?.[0] as number) || 0;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const candidate = `${prefix}-${String(baseSeq + 1 + attempt).padStart(4, '0')}`;
      const dupCheck = db.exec(`SELECT 1 FROM watering_records WHERE water_code = ? LIMIT 1`, [candidate]);
      if (dupCheck.length === 0 || dupCheck[0].values.length === 0) {
        return candidate;
      }
    }
    return null;
  }

  insert(record: WateringRecord): WateringRecord {
    const db = getDatabase();
    const now = nowLocalTimestamp();
    db.run(
      `INSERT INTO watering_records (
        id, water_code, record_type, fertilizer_record_id, source_daily_record_id,
        crop_name, crop_variety, greenhouse_id, greenhouse_name, area_id, area_name,
        planting_id, planting_code, seedling_id, seedling_code,
        water_pool, total_water, water_unit, water_cost,
        water_time, operator_id, operator_name,
        data_source, iot_device_id, description, status,
        create_time, update_time, crop_names
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.waterCode,
        record.recordType,
        record.fertilizerRecordId || null,
        record.sourceDailyRecordId || null,
        record.cropName,
        record.cropVariety || null,
        record.greenhouseId || null,
        record.greenhouseName,
        record.areaId || null,
        record.areaName || null,
        record.plantingId || null,
        record.plantingCode || null,
        record.seedlingId || null,
        record.seedlingCode || null,
        record.waterPool || null,
        record.totalWater,
        record.waterUnit,
        record.waterCost || 0,
        record.waterTime,
        record.operatorId || null,
        record.operatorName || null,
        record.dataSource,
        record.iotDeviceId || null,
        record.description || null,
        record.status,
        now,
        now,
        record.cropNames || null,
      ],
    );
    saveDatabase();
    return { ...record, createTime: now, updateTime: now };
  }

  update(id: string, updates: Partial<WateringRecord>): WateringRecord | null {
    const db = getDatabase();
    const now = nowLocalTimestamp();
    const allowed = [
      'crop_name',
      'crop_names',
      'crop_variety',
      'greenhouse_name',
      'area_id',
      'area_name',
      'water_pool',
      'total_water',
      'water_unit',
      'water_cost',
      'water_time',
      'operator_id',
      'operator_name',
      'description',
    ];
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      const snake = key.replace(/[A-Z]/g, (m) => '_' + m.toLowerCase());
      if (allowed.includes(snake)) {
        sets.push(`${snake} = ?`);
        params.push(value);
      }
    }
    if (sets.length === 0) return this.findById(id);
    sets.push('update_time = ?');
    params.push(now);
    params.push(id);
    db.run(`UPDATE watering_records SET ${sets.join(', ')} WHERE id = ?`, params);
    saveDatabase();
    return this.findById(id);
  }

  deleteById(id: string): boolean {
    const db = getDatabase();
    db.run(`DELETE FROM watering_records WHERE id = ?`, [id]);
    saveDatabase();
    return true;
  }

  /**
   * 删除施肥记录关联的浇水记录（Phase 2 调用）
   */
  deleteByFertilizerRecordId(fertilizerId: string): number {
    const db = getDatabase();
    db.run(
      `DELETE FROM watering_records WHERE fertilizer_record_id = ? AND record_type = 'fertilizer_dilution'`,
      [fertilizerId],
    );
    saveDatabase();
    return db.getRowsModified();
  }

  /**
   * 根据每日记录 ID 查找（Phase 2 调用）
   */
  findByDailyRecordId(dailyRecordId: string): WateringRecord | null {
    const db = getDatabase();
    const result = db.exec(
      `SELECT * FROM watering_records WHERE source_daily_record_id = ? LIMIT 1`,
      [dailyRecordId],
    );
    if (result.length === 0 || result[0].values.length === 0) return null;
    return this.mapRow(result[0].values[0]);
  }

  /**
   * mapRow: 数据库行 → WateringRecord（camelCase）
   * 2026-07-27 审核修复 C-1：支持两种入参
   * - stmt（sql.js Statement）：用 getAsObject 按列名取值（findById / findByFertilizerRecordId 用）
   * - row[]（db.exec 出来的位置数组）：保留向后兼容，row[28] 是 crop_names
   *   注意：位置数组对 schema 漂移敏感，新增列必须同步更新下方 row[N] 位置
   * - 列名兜底：缺列时给空字符串而非 undefined
   */
  private mapRow(input: any): WateringRecord {
    const row: Record<string, any> = (input && typeof input.getAsObject === 'function')
      ? (input.getAsObject() as Record<string, any>)
      : (Array.isArray(input) ? this.arrayRowToObject(input) : input);
    return {
      id: row.id ?? '',
      waterCode: row.water_code ?? '',
      recordType: row.record_type ?? 'manual',
      fertilizerRecordId: row.fertilizer_record_id ?? null,
      sourceDailyRecordId: row.source_daily_record_id ?? null,
      cropName: row.crop_name ?? '',
      cropVariety: row.crop_variety ?? null,
      greenhouseId: row.greenhouse_id ?? null,
      greenhouseName: row.greenhouse_name ?? '',
      areaId: row.area_id ?? null,
      areaName: row.area_name ?? null,
      plantingId: row.planting_id ?? null,
      plantingCode: row.planting_code ?? null,
      seedlingId: row.seedling_id ?? null,
      seedlingCode: row.seedling_code ?? null,
      waterPool: row.water_pool ?? null,
      totalWater: Number(row.total_water) || 0,
      waterUnit: row.water_unit ?? 'L',
      waterCost: Number(row.water_cost) || 0,
      waterTime: row.water_time ?? '',
      operatorId: row.operator_id ?? null,
      operatorName: row.operator_name ?? null,
      dataSource: row.data_source ?? 'manual',
      iotDeviceId: row.iot_device_id ?? null,
      description: row.description ?? null,
      status: row.status ?? 'completed',
      createTime: row.create_time ?? '',
      updateTime: row.update_time ?? '',
      // 2026-07-24：crop_names 列在表最后（fixMissingSchema ALTER TABLE ADD COLUMN 追加），可能缺列
      cropNames: row.crop_names ?? null,
    };
  }

  /**
   * 旧路径位置数组 → 对象映射（向后兼容）
   * 列顺序必须与 schema.ts 第 2760-2793 行 + ALTER crop_names 一致
   * 警告：新增列必须同步更新这里
   */
  private arrayRowToObject(row: any[]): Record<string, any> {
    const cols = [
      'id', 'water_code', 'record_type', 'fertilizer_record_id', 'source_daily_record_id',
      'crop_name', 'crop_variety', 'greenhouse_id', 'greenhouse_name', 'area_id', 'area_name',
      'planting_id', 'planting_code', 'seedling_id', 'seedling_code',
      'water_pool', 'total_water', 'water_unit', 'water_cost',
      'water_time', 'operator_id', 'operator_name',
      'data_source', 'iot_device_id', 'description', 'status',
      'create_time', 'update_time', 'crop_names',
    ];
    const obj: Record<string, any> = {};
    cols.forEach((c, i) => { obj[c] = row[i]; });
    return obj;
  }
}

export const wateringRepository = new WateringRepository();
