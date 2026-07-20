/**
 * 种植管理 Repository 层（2026-07-21 新建）
 *
 * 目的：把 planting.ts 路由中的内联 SQL 提取到数据访问层
 * 模式：参照 fertilizer.repository.ts — 白名单过滤 + 参数化查询 + 分页
 */
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

export interface PlantingRow {
  id: string;
  planting_code: string;
  source_type: string | null;
  source_id: string | null;
  source_name: string | null;
  crop_code: string | null;
  crop_name: string;
  crop_variety: string | null;
  greenhouse_id: string | null;
  greenhouse_name: string | null;
  area_id: string | null;
  area_name: string | null;
  planting_quantity: number;
  planting_date: string | null;
  status: string;
  is_harvest: number;  // SQLite stores boolean as 0/1
  is_deleted: number;
  deleted_at: string | null;
  create_time: string;
  update_time: string;
  [key: string]: unknown;  // 保留已有 SQL AS 别名列的灵活性
}

/** 筛选白名单 — 防 SQL 注入 */
const FILTER_WHITELIST: Record<string, string> = {
  crop_name: 'crop_name', cropName: 'crop_name',
  status: 'status',
  greenhouse_name: 'greenhouse_name', greenhouseName: 'greenhouse_name',
  planting_code: 'planting_code', plantingCode: 'planting_code',
  is_harvest: 'is_harvest', isHarvest: 'is_harvest',
};

export class PlantingRepository {
  /** 单条查询 */
  findById(id: string): PlantingRow | null {
    const db = getDatabase();
    const rows = queryToObjects<PlantingRow>(db, 'SELECT * FROM plantings WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] ?? null;
  }

  /** 条件查询 + 分页（简化版 — 不含种植路由的 130 行大 SQL；大 SQL 保留在路由层） */
  findAll(filters: Record<string, string | undefined>, page: number, pageSize: number): { rows: PlantingRow[]; total: number } {
    const db = getDatabase();
    const wheres: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      const col = FILTER_WHITELIST[key];
      if (!col) continue;
      if (col === 'is_harvest') {
        wheres.push(`${col} = ?`);
        params.push(value === '1' || value === 'true' ? 1 : 0);
      } else {
        wheres.push(`${col} LIKE '%' || ? || '%'`);
        params.push(value);
      }
    }

    const whereSql = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';
    const offset = (page - 1) * pageSize;
    const rows = queryToObjects<PlantingRow>(db,
      `SELECT * FROM plantings ${whereSql} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );
    const totalRows = queryToObjects<{ total: number }>(db,
      `SELECT COUNT(*) AS total FROM plantings ${whereSql}`, params,
    );
    return { rows, total: totalRows[0]?.total ?? 0 };
  }

  /** 插入 */
  insert(row: Record<string, any>): void {
    const db = getDatabase();
    const keys = Object.keys(row);
    const placeholders = keys.map(() => '?').join(', ');
    const values = keys.map(k => row[k]);
    db.run(`INSERT INTO plantings (${keys.join(', ')}) VALUES (${placeholders})`, values);
  }

  /** 白名单更新 */
  update(id: string, updates: Record<string, any>, allowedCols: Set<string>): number {
    const db = getDatabase();
    const sets: string[] = [];
    const params: any[] = [];
    for (const [k, v] of Object.entries(updates)) {
      if (k === 'id') continue;
      const matchedKey = allowedCols.has(k) ? k : null;
      if (!matchedKey) continue;
      sets.push(`${matchedKey} = ?`);
      params.push(v);
    }
    if (sets.length === 0) return 0;
    params.push(id);
    db.run(`UPDATE plantings SET ${sets.join(', ')} WHERE id = ?`, params);
    return sets.length;
  }

  /** 软删除 */
  softDelete(id: string, now: string): void {
    const db = getDatabase();
    db.run('UPDATE plantings SET deleted_at = ?, update_time = ? WHERE id = ?', [now, now, id]);
  }

  /** 按来源查 */
  findBySourceId(sourceId: string): PlantingRow[] {
    const db = getDatabase();
    return queryToObjects<PlantingRow>(db,
      'SELECT * FROM plantings WHERE source_id = ? AND deleted_at IS NULL ORDER BY create_time DESC', [sourceId],
    );
  }
}

export const plantingRepository = new PlantingRepository();
