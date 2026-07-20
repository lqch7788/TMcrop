/**
 * 采收记录 Service 层（2026-07-21 新建）
 *
 * 目的：消除 planting.ts 中 3 处重复的 harvest_records 写入逻辑
 * - POST /:id/harvest-records（行级采收）
 * - PUT /:id/harvest-records/:recordId（编辑采收）
 * - POST /:id/end（种植结束 — harvest 分支）
 *
 * 统一入口：writeHarvestRecord() — 事务包裹 + 库存联动 + 审计写 planting_harvest_records
 */
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';
import { formatLocalDateISO } from '../utils/dateUtil';

function nowLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export interface HarvestRecordInput {
  plantingId: string;
  plantingCode: string;
  recordDate?: string;
  destination: 'harvest' | 'circulate' | 'self_seed' | 'planting_self_kept';
  subType?: string;
  quantity: number;
  unit: string;
  notes?: string;
  operatorName?: string;
  createBy?: string;
  createById?: string;
  warehouseId?: string;
  warehouseName?: string;
  circulationRecordId?: string;
  harvestRecordId?: string;
  inventoryStockId?: string;
  seedForm?: string;
  generation?: number;
  isSupplementary?: boolean;
  supplementaryReason?: string;
}

export interface HarvestRecordResult {
  id: string;
  recordId: string;
}

export class HarvestService {
  /**
   * 写入单条采收记录到 planting_harvest_records（审计表）
   * 注意：harvest_records + inventory_stock 写入由 inventory/inbound-from-source 负责，
   * 这里只写审计记录。与 UnifiedRowHarvestInboundModal 的数据流保持一致。
   */
  writePlantingAuditRecord(input: HarvestRecordInput): HarvestRecordResult {
    const db = getDatabase();
    const now = nowLocal();
    const id = `phr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    db.run(`
      INSERT INTO planting_harvest_records (
        id, record_type, record_date, planting_id, planting_code,
        destination, sub_type, warehouse_id, warehouse_name,
        quantity, unit, notes, operator_name, create_by, create_by_id,
        create_time, update_time,
        harvest_record_id, inventory_stock_id, circulation_record_id,
        source_form,
        is_supplementary, supplementary_reason, supplementary_at, supplementary_by
      ) VALUES (?, 'harvest', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      input.recordDate || formatLocalDateISO(), input.plantingId, input.plantingCode,
      input.destination, input.subType || null,
      input.warehouseId || null, input.warehouseName || null,
      input.quantity, input.unit, input.notes || null,
      input.operatorName || input.createBy || null,
      input.createBy || null, input.createById || null,
      now, now,
      input.harvestRecordId || null, input.inventoryStockId || null,
      input.circulationRecordId || null,
      input.seedForm || null,
      input.isSupplementary ? 1 : 0,
      input.supplementaryReason || null,
      input.isSupplementary ? now : null,
      input.isSupplementary ? (input.createBy || input.operatorName || null) : null,
    ]);

    saveDatabase();
    return { id, recordId: id };
  }

  /**
   * 查询种植的采收记录列表
   */
  findHarvestRecords(plantingId: string): any[] {
    const db = getDatabase();
    return queryToObjects(db,
      `SELECT * FROM planting_harvest_records
       WHERE planting_id = ? ORDER BY create_time DESC`,
      [plantingId],
    );
  }

  /**
   * 更新采收记录
   */
  updateHarvestRecord(recordId: string, updates: Record<string, any>): void {
    const db = getDatabase();
    const now = nowLocal();
    const sets: string[] = [];
    const params: any[] = [];

    const allowedFields = ['quantity', 'unit', 'notes', 'record_date', 'operator_name', 'warehouse_id', 'warehouse_name'];
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedFields.includes(key)) continue;
      sets.push(`${key} = ?`);
      params.push(value);
    }

    if (sets.length === 0) return;
    sets.push('update_time = ?');
    params.push(now);
    params.push(recordId);

    db.run(`UPDATE planting_harvest_records SET ${sets.join(', ')} WHERE id = ?`, params);
    saveDatabase();
  }

  /**
   * 删除采收记录（含库存守卫校验结果）
   */
  deleteHarvestRecord(recordId: string): { ok: boolean; reason?: string } {
    const db = getDatabase();
    const rows = queryToObjects<{ id: string; planting_id: string }>(db,
      `SELECT id, planting_id FROM planting_harvest_records WHERE id = ?`, [recordId],
    );
    if (rows.length === 0) {
      return { ok: false, reason: '采收记录不存在' };
    }

    db.run('DELETE FROM planting_harvest_records WHERE id = ?', [recordId]);
    saveDatabase();
    return { ok: true };
  }
}

export const harvestService = new HarvestService();
