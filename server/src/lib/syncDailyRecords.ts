/**
 * 每日记录施肥/用药子记录同步到施肥/病虫害管理页
 *
 * 设计原则：
 * - 写入时同步（每日记录 POST 成功后）
 * - 幂等设计（先 DELETE 旧同步行再 INSERT）
 * - 失败不阻断主流程（内部 catch 只 console.error）
 * - 仅做数据复制，不联动删除/编辑
 *
 * 2026-07-15 新增
 */

// 前端 FeedRecordItem 类型（与 src/components/farm/seedling/modals/FeedRecordCard.tsx 保持一致）
interface FeedRecordItem {
  id: string;
  name: string;
  category: string;
  amount: number | undefined;
  unit: string;
  dilution?: number;
  dilutionType: 'dilute' | 'dry';
  applicationMethod: string;
  notes?: string;
  // 药剂特有
  safetyInterval?: number;
  targetPest?: string;
}

interface SyncContext {
  /** planting_id 或 seedling_id */
  relatedId: string;
  /** planting_code 或 seed育苗_code（用于溯源显示） */
  relatedCode: string;
  relatedType: 'planting' | 'seedling';
  recordDate: string;
  cropName: string;
  cropVariety: string;
  greenhouseName: string;
}

/**
 * 将 dilution 格式化为 dilution_ratio 字符串
 * - dilute 模式 → "1:500"
 * - dry 模式 → "dry"
 */
function formatDilution(item: FeedRecordItem): string {
  if (item.dilutionType === 'dilute' && item.dilution) {
    return `1:${item.dilution}`;
  }
  return 'dry';
}

/**
 * 生成同步记录 ID（格式：FR-{dailyRecordId后6位}-{itemId}）
 */
function makeSyncId(prefix: string, dailyRecordId: string, itemId: string): string {
  const shortDaily = dailyRecordId.slice(-8);
  return `${prefix}-${shortDaily}-${itemId.slice(0, 8)}`;
}

/**
 * 同步施肥记录到 fertilizer_records 表
 * - 幂等：先 DELETE 匹配 source_daily_record_id 的旧行，再 INSERT
 * - 失败只 console.error 不抛错
 */
export async function syncFertilizerRecords(
  db: any,
  dailyRecordId: string,
  items: FeedRecordItem[],
  ctx: SyncContext,
): Promise<void> {
  if (!items || items.length === 0) return;

  try {
    // 1. 删除旧同步行（幂等）
    db.run('DELETE FROM fertilizer_records WHERE source_daily_record_id = ?', [dailyRecordId]);

    // 2. 批量 INSERT
    for (const item of items) {
      if (!item.name || !item.amount || item.amount <= 0) continue;

      const syncId = makeSyncId('FR', dailyRecordId, item.id);
      const dilutionRatio = formatDilution(item);
      const description = [item.applicationMethod, item.notes].filter(Boolean).join(' | ');

      db.run(
        `INSERT INTO fertilizer_records (
          id, fertilizer_code, planting_id, planting_code, seedling_id, seedling_code,
          greenhouse_name, crop_name, crop_variety,
          fertilizer_name, fertilizer_type, dilution_ratio,
          quantity, unit, fertilize_time, description,
          data_source, source_type,
          source_daily_record_id, source_item_id,
          create_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'daily_record', 'daily_record_sync', ?, ?, ?)`,
        [
          syncId, syncId,
          ctx.relatedType === 'planting' ? ctx.relatedId : null,
          ctx.relatedType === 'planting' ? ctx.relatedCode : null,
          ctx.relatedType === 'seedling' ? ctx.relatedId : null,
          ctx.relatedType === 'seedling' ? ctx.relatedCode : null,
          ctx.greenhouseName || '',
          ctx.cropName || '',
          ctx.cropVariety || '',
          item.name,
          item.category || '',
          dilutionRatio,
          item.amount || 0,
          item.unit || 'kg',
          ctx.recordDate,
          description,
          dailyRecordId,
          item.id,
          new Date().toISOString(),
        ]
      );
    }
  } catch (err) {
    // 同步失败不阻断主流程（每日记录已写入成功）
    console.error('[syncFertilizerRecords] 同步失败（不影响主记录）:', (err as Error)?.message || err);
  }
}

/**
 * 同步用药记录到 pesticide_records 表
 * - 幂等：先 DELETE 匹配 source_daily_record_id 的旧行，再 INSERT
 * - 失败只 console.error 不抛错
 */
export async function syncPesticideRecords(
  db: any,
  dailyRecordId: string,
  items: FeedRecordItem[],
  ctx: SyncContext,
): Promise<void> {
  if (!items || items.length === 0) return;

  try {
    // 1. 删除旧同步行（幂等）
    db.run('DELETE FROM pesticide_records WHERE source_daily_record_id = ?', [dailyRecordId]);

    // 2. 批量 INSERT
    for (const item of items) {
      if (!item.name || !item.amount || item.amount <= 0) continue;

      const syncId = makeSyncId('PR', dailyRecordId, item.id);
      const dilutionRatio = formatDilution(item);
      const description = [item.applicationMethod, item.notes].filter(Boolean).join(' | ');

      // 2026-07-15：pesticide_records 无 safety_interval 列，安全间隔期追加到 description
      const safetyText = item.safetyInterval ? `安全间隔期:${item.safetyInterval}天` : null;
      const descWithSafety = [description, safetyText].filter(Boolean).join(' | ');

      db.run(
        `INSERT INTO pesticide_records (
          id, record_code, planting_id, planting_code, seedling_id, seedling_code,
          greenhouse_name, crop_name,
          pesticide_name, pesticide_type, dilution_ratio,
          dosage, dosage_unit, target_pest,
          description, source_type,
          source_daily_record_id, source_item_id,
          spray_time, create_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          syncId, syncId,
          ctx.relatedType === 'planting' ? ctx.relatedId : null,
          ctx.relatedType === 'planting' ? ctx.relatedCode : null,
          ctx.relatedType === 'seedling' ? ctx.relatedId : null,
          ctx.relatedType === 'seedling' ? ctx.relatedCode : null,
          ctx.greenhouseName || '',
          ctx.cropName || '',
          item.name,
          item.category || '',
          dilutionRatio,
          item.amount || 0,
          item.unit || 'L',
          item.targetPest || '',
          descWithSafety,
          'daily_record_sync',
          dailyRecordId,
          item.id,
          ctx.recordDate,
          new Date().toISOString(),
        ]
      );
    }
  } catch (err) {
    console.error('[syncPesticideRecords] 同步失败（不影响主记录）:', (err as Error)?.message || err);
  }
}
