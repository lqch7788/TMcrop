/**
 * 物料流转流水写入服务
 * material_flow_log 读写 — 所有调用方必须在事务内调用
 * 2026-06-13 新建
 */

import { getDatabase } from '../db';
import { v4 } from 'crypto';

interface FlowLogInput {
  flow_type: string;
  crop_code?: string;
  crop_name: string;
  crop_variety?: string;
  source_type?: string | null;
  source_id?: string | null;
  source_code?: string | null;
  source_quantity?: number | null;
  source_unit?: string | null;
  source_category?: string | null;
  target_type: string;
  target_id: string;
  target_code: string;
  target_quantity?: number | null;
  target_unit?: string | null;
  business_id?: string | null;
  business_code?: string | null;
  created_by?: string | null;
}

let _oidCounter: number | null = null;

function nextOid(): number {
  if (_oidCounter === null) {
    try {
      const db = getDatabase();
      const rows = db.exec("SELECT COALESCE(MAX(oid), 0) FROM material_flow_log");
      _oidCounter = Number(rows[0]?.values?.[0]?.[0] || 0);
    } catch {
      _oidCounter = 0;
    }
  }
  return ++_oidCounter;
}

/** 写入一条流水记录（调用方管理事务） */
export function writeFlowLog(input: FlowLogInput): string {
  const db = getDatabase();
  const id = v4();
  const oid = nextOid();
  const now = new Date().toISOString();

  db.run(`
    INSERT INTO material_flow_log (
      id, oid, flow_type, crop_code, crop_name, crop_variety,
      source_type, source_id, source_code, source_quantity, source_unit, source_category,
      target_type, target_id, target_code, target_quantity, target_unit,
      business_id, business_code, created_at, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id, oid, input.flow_type, input.crop_code || null, input.crop_name, input.crop_variety || null,
    input.source_type ?? null, input.source_id ?? null, input.source_code ?? null,
    input.source_quantity ?? null, input.source_unit ?? null, input.source_category ?? null,
    input.target_type, input.target_id, input.target_code,
    input.target_quantity ?? null, input.target_unit ?? null,
    input.business_id ?? null, input.business_code ?? null,
    now, input.created_by || null,
  ]);
  return id;
}

/** 写入 correction 补偿流水（数量变更时调用） */
export function writeCorrection(params: {
  flow_type: string;
  source_type?: string;
  source_id?: string;
  target_type: string;
  target_id: string;
  source_quantity_delta: number;
  source_unit?: string;
  crop_name: string;
  crop_variety?: string;
  created_by?: string;
}): void {
  writeFlowLog({
    flow_type: 'correction',
    crop_name: params.crop_name,
    crop_variety: params.crop_variety,
    source_type: params.source_type ?? null,
    source_id: params.source_id ?? null,
    source_category: 'manual',
    source_quantity: params.source_quantity_delta,
    source_unit: params.source_unit ?? null,
    target_type: params.target_type,
    target_id: params.target_id,
    target_code: params.target_id,
    target_quantity: null,
    created_by: params.created_by ?? null,
  });
}
