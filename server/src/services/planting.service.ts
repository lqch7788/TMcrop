/**
 * 种植管理 Service 层（2026-07-21 重写）
 *
 * 旧版问题：
 * - 使用错误的列名 created_at/updated_at（实际是 create_time/update_time）
 * - Date.now() 生成 ID（违反 code-generation-contract-rule）
 * - 物理 DELETE 而非软删除
 * - Interface 只有 19 字段，实际表有 50+ 字段
 *
 * 新版：委托 plantingRepository + 业务校验 + BusinessError 抛出
 */
import { z } from 'zod';
import { getDatabase } from '../db';
import { plantingRepository, PlantingRow } from '../repositories/planting.repository';

function nowLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export class PlantingBusinessError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.name = 'PlantingBusinessError';
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

export const PlantingErrorCode = {
  NOT_FOUND: 'PLANTING_NOT_FOUND',
  INVALID_INPUT: 'PLANTING_INVALID_INPUT',
  ALREADY_ENDED: 'PLANTING_ALREADY_ENDED',
} as const;

/** 兼容旧调用方的 Planting 接口（19 字段 ⚠️ 不完整，新代码走 PlantingRow） */
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
  [key: string]: unknown;
}

export class PlantingService {
  findAll(filters: Record<string, string | undefined>, page: number, pageSize: number) {
    return plantingRepository.findAll(filters, page, pageSize);
  }

  findById(id: string): PlantingRow | null {
    return plantingRepository.findById(id);
  }

  findBySourceId(sourceId: string): PlantingRow[] {
    return plantingRepository.findBySourceId(sourceId);
  }

  /** 校验存在且未结束 */
  requireActive(id: string): PlantingRow {
    const p = plantingRepository.findById(id);
    if (!p) throw new PlantingBusinessError(PlantingErrorCode.NOT_FOUND, '种植记录不存在', 404);
    if (p.end_time) throw new PlantingBusinessError(PlantingErrorCode.ALREADY_ENDED, '种植已结束，无法操作', 400);
    return p;
  }

  /** 兼容旧调用方 getPlantings */
  async getPlantings(params: Record<string, any> = {}): Promise<{ data: Planting[]; total: number }> {
    const { rows, total } = plantingRepository.findAll(
      params, Number(params.page) || 1, Number(params.limit) || 20,
    );
    return { data: rows as unknown as Planting[], total };
  }

  /** 兼容旧调用方 getById */
  async getById(id: string): Promise<Planting | null> {
    return plantingRepository.findById(id) as unknown as Planting | null;
  }

  /** 兼容旧调用方 create — 已弃用，新路由不要调此方法 */
  async create(planting: Partial<Planting>): Promise<string> {
    const db = getDatabase();
    const now = nowLocal();
    const id = `pl-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const code = planting.planting_code || `PL${Date.now()}`;
    db.run(
      `INSERT INTO plantings (id, planting_code, crop_name, crop_variety, greenhouse_id, greenhouse_name,
        source_id, planting_date, expected_harvest_date, status, remarks, create_time, update_time)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, code, planting.crop_name || '', planting.crop_variety || '', planting.greenhouse_id || '',
       planting.greenhouse_name || '', planting.source_id || '', planting.planting_date || now.split(' ')[0],
       planting.expected_harvest_date || null, planting.status || 'active', planting.remarks || '', now, now],
    );
    return id;
  }

  /** 兼容旧调用方 update — 已弃用 */
  async update(id: string, updates: Partial<Planting>): Promise<boolean> {
    const db = getDatabase();
    const now = nowLocal();
    const fields: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id' || key === 'create_time' || key === 'created_at') continue;
      const col = key === 'updated_at' ? 'update_time' : key;
      fields.push(`${col} = ?`);
      values.push(value);
    }
    fields.push('update_time = ?');
    values.push(now);
    values.push(id);
    db.run(`UPDATE plantings SET ${fields.join(', ')} WHERE id = ?`, values);
    return true;
  }

  /** 兼容旧调用方 delete — 已弃用，使用软删除 */
  async delete(id: string): Promise<boolean> {
    plantingRepository.softDelete(id, nowLocal());
    return true;
  }
}

export const plantingService = new PlantingService();

// ========== Zod Schema（保留旧版兼容） ==========
export const CreatePlantingSchema = z.object({
  origin_path: z.enum(['direct_from_seed', 'via_seedling'], {
    message: '来源路径必填 (direct_from_seed 或 via_seedling)',
  }),
  source_id: z.string().optional(),
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
  { message: 'direct_from_seed 必须填 source_id (种源)', path: ['source_id'] },
);

export function validateCreatePlanting(input: unknown) {
  return CreatePlantingSchema.parse(input);
}
