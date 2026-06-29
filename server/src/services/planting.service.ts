/**
 * 种植服务
 */

import { getDatabase, saveDatabase } from '../db';

export interface Planting {
  id: string;
  planting_code: string;
  crop_name: string;
  crop_variety: string;
  greenhouse_id: string;
  greenhouse_name: string;
  source_id: string;
  planting_date: string;
  expected_harvest_date?: string;
  status: string;
  remarks?: string;
  created_at: string;
  updated_at: string;
}

export class PlantingService {
  async getPlantings(params: {
    cropName?: string;
    greenhouseId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Planting[]; total: number }> {
    const db = getDatabase();
    const { cropName, greenhouseId, status, startDate, endDate, page = 1, limit = 20 } = params;

    const sql = 'SELECT * FROM plantings WHERE 1=1';
    const conditions: string[] = [];
    const queryParams: any[] = [];

    if (cropName) {
      conditions.push('crop_name LIKE ?');
      queryParams.push(`%${cropName}%`);
    }
    if (greenhouseId) {
      conditions.push('greenhouse_id = ?');
      queryParams.push(greenhouseId);
    }
    if (status) {
      conditions.push('status = ?');
      queryParams.push(status);
    }
    if (startDate) {
      conditions.push('planting_date >= ?');
      queryParams.push(startDate);
    }
    if (endDate) {
      conditions.push('planting_date <= ?');
      queryParams.push(endDate);
    }

    const whereClause = conditions.length > 0 ? ` AND ${conditions.join(' AND ')}` : '';
    const offset = (page - 1) * limit;

    const finalSql = `${sql}${whereClause} ORDER BY planting_date DESC LIMIT ? OFFSET ?`;

    const stmt = db.prepare(finalSql);
    stmt.bind([...queryParams, limit, offset]);

    const items: Planting[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject() as unknown as Planting);
    }
    stmt.free();

    const countSql = `SELECT COUNT(*) as total FROM plantings WHERE 1=1${whereClause}`;
    const countStmt = db.prepare(countSql);
    countStmt.bind(queryParams);
    countStmt.step();
    const countResult = countStmt.getAsObject();
    countStmt.free();

    return {
      data: items,
      total: countResult.total as number,
    };
  }

  async getById(id: string): Promise<Planting | null> {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM plantings WHERE id = ?');
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as Planting;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  }

  async create(planting: Partial<Planting>): Promise<string> {
    const db = getDatabase();
    const now = new Date().toISOString();
    const id = planting.id || `plant_${Date.now()}`;

    db.run(`
      INSERT INTO plantings (
        id, planting_code, crop_name, crop_variety, greenhouse_id, greenhouse_name,
        source_id, planting_date, expected_harvest_date, status, remarks,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      planting.planting_code || `PL${Date.now()}`,
      planting.crop_name || '',
      planting.crop_variety || '',
      planting.greenhouse_id || '',
      planting.greenhouse_name || '',
      planting.source_id || '',
      planting.planting_date || now.split('T')[0],
      planting.expected_harvest_date || null,
      planting.status || 'active',
      planting.remarks || '',
      now,
      now,
    ]);

    saveDatabase();
    return id;
  }

  async update(id: string, updates: Partial<Planting>): Promise<boolean> {
    const db = getDatabase();
    const now = new Date().toISOString();

    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    fields.push('updated_at = ?');
    values.push(now);
    values.push(id);

    db.run(`UPDATE plantings SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    return true;
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    db.run('DELETE FROM plantings WHERE id = ?', [id]);
    saveDatabase();
    return true;
  }
}

export const plantingService = new PlantingService();

// ============================================================
// V2 改造: Zod 校验 schema + 工具函数
// 任务 6: origin_path 互斥校验 (direct_from_seed 必须填 source_id)
// V1.1 现状约束: plantings 表无 seedling_batch_id 字段, via_seedling 路径暂不强校验
// ============================================================
import { z } from 'zod';

/**
 * 种植创建请求 Zod schema
 * - origin_path: 来源路径 (新增字段, 与 db origin_path 列对应)
 * - source_id: 种源 ID, 当 origin_path=direct_from_seed 时必填
 * - via_seedling 路径暂不强校验 (V1.1 现状: 无 seedling_batch_id 字段)
 */
export const CreatePlantingSchema = z.object({
  // 2026-06-29: Zod v4 移除 errorMap，改用 message 字段
  origin_path: z.enum(['direct_from_seed', 'via_seedling'], {
    message: '来源路径必填 (direct_from_seed 或 via_seedling)',
  }),
  source_id: z.string().optional(), // 强校验由 .refine 决定
  planting_code: z.string().optional(),
  source_type: z.string().optional(),
  source_name: z.string().optional(),
  crop_name: z.string().optional(),
  crop_variety: z.string().optional(),
  greenhouse_id: z.string().optional(),
  greenhouse_name: z.string().optional(),
  planting_date: z.string().optional(),
  planting_quantity: z.number().int().nonnegative().optional(),
}).refine(
  (data) => data.origin_path === 'direct_from_seed' ? !!data.source_id : true,
  {
    message: 'direct_from_seed 必须填 source_id (种源)',
    path: ['source_id'],
  },
);

/**
 * 校验并解析种植创建请求
 * @throws ZodError 校验失败
 */
export function validateCreatePlanting(input: unknown) {
  return CreatePlantingSchema.parse(input);
}
