/**
 * 农事操作记录 localStorage → 服务端 一次性迁移（P0-1）
 *
 * 纪律：
 * - 迁移成功后**不删除** localStorage 原数据，只写迁移标记
 * - 演示数据（id 以 DEMO_ 开头，由 generateDemoRecords 生成）不进库
 * - 失败不写标记，下次挂载自动重试
 */
import { enhancedApiClient } from '@/lib/apiClient';

const LEGACY_KEY = 'yuanxingtu_operationRecords';
const MIGRATION_FLAG = 'yuanxingtu_operationRecords_migrated';

export interface OperationRecordMigrationResult {
  migrated: number;
  skippedDemo: number;
  skippedDuplicate: number;
  failed: number;
}

interface BatchResponse {
  created: number;
  skipped: number;
  failed: number;
  errors?: { id: string; message: string }[];
}

const EMPTY_RESULT: OperationRecordMigrationResult = {
  migrated: 0,
  skippedDemo: 0,
  skippedDuplicate: 0,
  failed: 0,
};

/** 解析 localStorage 原始值：兼容 {version, data} 与旧版裸数组 */
export function parseStoredRecords(raw: string | null): Record<string, unknown>[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as Record<string, unknown>[];
    if (parsed && typeof parsed === 'object' && Array.isArray((parsed as { data?: unknown }).data)) {
      return (parsed as { data: Record<string, unknown>[] }).data;
    }
    return [];
  } catch {
    return [];
  }
}

/** 拆分演示数据与真实数据（演示数据不入库） */
export function splitDemoRecords(records: Record<string, unknown>[]): {
  real: Record<string, unknown>[];
  skippedDemo: number;
} {
  const real: Record<string, unknown>[] = [];
  let skippedDemo = 0;
  for (const record of records) {
    if (String(record.id ?? '').startsWith('DEMO_')) skippedDemo++;
    else real.push(record);
  }
  return { real, skippedDemo };
}

async function runMigration(): Promise<OperationRecordMigrationResult> {
  if (localStorage.getItem(MIGRATION_FLAG) === '1') return { ...EMPTY_RESULT };

  const { real, skippedDemo } = splitDemoRecords(parseStoredRecords(localStorage.getItem(LEGACY_KEY)));

  if (real.length === 0) {
    localStorage.setItem(MIGRATION_FLAG, '1');
    return { ...EMPTY_RESULT, skippedDemo };
  }

  const result = await enhancedApiClient.post<BatchResponse>('/farm-operation-records/batch', { records: real });

  if (!result || typeof result.failed !== 'number') {
    throw new Error('迁移农事操作记录失败：服务端未返回统计结果');
  }
  if (result.failed > 0) {
    const detail = (result.errors ?? []).map(e => `${e.id || '(无 id)'}: ${e.message}`).join('；');
    throw new Error(`迁移农事操作记录失败 ${result.failed} 条：${detail}`);
  }

  localStorage.setItem(MIGRATION_FLAG, '1');
  return {
    migrated: result.created,
    skippedDemo,
    skippedDuplicate: result.skipped,
    failed: 0,
  };
}

let inflight: Promise<OperationRecordMigrationResult> | null = null;

/** 幂等入口：多处挂载共享同一次迁移 */
export function migrateOperationRecordsOnce(): Promise<OperationRecordMigrationResult> {
  if (!inflight) {
    inflight = runMigration().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}
