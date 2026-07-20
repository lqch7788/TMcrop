/**
 * 育苗管理 Repository 层（2026-07-21 新建）
 *
 * 目的：把 seedling.ts 路由中的内联 SQL 提取到数据访问层
 * 模式：参照 fertilizer.repository.ts — 白名单过滤 + 参数化查询 + 分页
 */
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

export interface SeedlingRow {
  id: string;
  seedling_code: string;
  source_mode: string | null;
  source_id: string | null;
  source_name: string | null;
  source_deducted_quantity: number;
  crop_code: string | null;
  crop_name: string;
  crop_variety: string | null;
  seedling_type: string | null;
  seedling_form: string | null;
  greenhouse_id: string | null;
  greenhouse_name: string | null;
  area_name: string | null;
  seedling_date: string | null;
  seedling_quantity: number;
  survival_quantity: number;
  status: string;
  end_time: string | null;
  deleted_at: string | null;
  create_time: string;
  update_time: string;
  [key: string]: unknown;
}

const FILTER_WHITELIST: Record<string, string> = {
  crop_name: 'crop_name', cropName: 'crop_name',
  status: 'status',
  seedling_status: 'seedling_status', seedlingStatus: 'seedling_status',
  greenhouse_name: 'greenhouse_name', greenhouseName: 'greenhouse_name',
  seedling_code: 'seedling_code', seedlingCode: 'seedling_code',
  source_mode: 'source_mode', sourceMode: 'source_mode',
};

export class SeedlingRepository {
  findById(id: string): SeedlingRow | null {
    const db = getDatabase();
    const rows = queryToObjects<SeedlingRow>(db,
      'SELECT * FROM seedlings WHERE id = ? AND deleted_at IS NULL', [id]);
    return rows[0] ?? null;
  }

  findAll(filters: Record<string, string | undefined>, page: number, pageSize: number): { rows: SeedlingRow[]; total: number } {
    const db = getDatabase();
    const wheres: string[] = ['deleted_at IS NULL'];
    const params: any[] = [];

    for (const [key, value] of Object.entries(filters)) {
      if (!value) continue;
      const col = FILTER_WHITELIST[key];
      if (!col) continue;
      wheres.push(`${col} LIKE '%' || ? || '%'`);
      params.push(value);
    }

    const whereSql = `WHERE ${wheres.join(' AND ')}`;
    const offset = (page - 1) * pageSize;

    const rows = queryToObjects<SeedlingRow>(db,
      `SELECT * FROM seedlings ${whereSql} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    );
    const totalRows = queryToObjects<{ total: number }>(db,
      `SELECT COUNT(*) AS total FROM seedlings ${whereSql}`, params,
    );
    return { rows, total: totalRows[0]?.total ?? 0 };
  }

  /** 批量查询 */
  findByIds(ids: string[]): SeedlingRow[] {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    return queryToObjects<SeedlingRow>(db,
      `SELECT * FROM seedlings WHERE id IN (${placeholders})`, ids);
  }

  /** 白名单更新 */
  update(id: string, updates: Record<string, any>, allowedCols: Set<string>, now: string): number {
    const db = getDatabase();
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      if (!allowedCols.has(key)) continue;
      sets.push(`${key} = ?`);
      params.push(value);
    }
    if (sets.length === 0) return 0;
    sets.push('update_time = ?');
    params.push(now);
    params.push(id);
    db.run(`UPDATE seedlings SET ${sets.join(', ')} WHERE id = ?`, params);
    return sets.length;
  }

  /** 批量更新 */
  batchUpdate(ids: string[], updates: Record<string, any>, allowedCols: Set<string>, now: string): void {
    const db = getDatabase();
    const sets: string[] = [];
    const params: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;
      if (!allowedCols.has(key)) continue;
      sets.push(`${key} = ?`);
      params.push(value);
    }
    if (sets.length === 0) return;
    params.push(now);
    const placeholders = ids.map(() => '?').join(',');
    db.run(`UPDATE seedlings SET ${sets.join(', ')}, update_time = ? WHERE id IN (${placeholders})`,
      [...params, ...ids]);
  }

  /** 软删除 */
  softDelete(id: string, now: string): void {
    const db = getDatabase();
    db.run('UPDATE seedlings SET deleted_at = ?, update_time = ? WHERE id = ?', [now, now, id]);
  }

  /** 批量软删除 */
  batchSoftDelete(ids: string[], now: string): void {
    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.run(`UPDATE seedlings SET deleted_at = ?, update_time = ? WHERE id IN (${placeholders})`,
      [now, now, ...ids]);
  }

  /** 按来源查 */
  findBySourceId(sourceId: string): SeedlingRow[] {
    const db = getDatabase();
    return queryToObjects<SeedlingRow>(db,
      'SELECT * FROM seedlings WHERE source_id = ? AND deleted_at IS NULL ORDER BY create_time DESC',
      [sourceId]);
  }

  /** 待定植列表 */
  findTransplantReady(): SeedlingRow[] {
    const db = getDatabase();
    return queryToObjects<SeedlingRow>(db,
      `SELECT * FROM seedlings WHERE deleted_at IS NULL AND status IN ('in_progress','growing')
       AND end_time IS NULL ORDER BY create_time DESC`);
  }

  save(): void {
    saveDatabase();
  }
}

export const seedlingRepository = new SeedlingRepository();
