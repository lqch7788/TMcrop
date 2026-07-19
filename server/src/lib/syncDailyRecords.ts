/**
 * 每日记录施肥/用药子记录同步到施肥/病虫害管理页
 *
 * 设计原则（2026-07-15 重构）：
 * - 写入时同步（每日记录 POST 成功后）
 * - **池模式聚合**：一个 daily record → 一条 fertilizer_record / pesticide_record（多条物品存入 fertilization_pool / pesticide_list JSON 字段）
 * - **标准编号**：fertilizer_code 用 SF{YYYYMMDD}-NNNN 格式；record_code 用 BY{YYYYMMDD}-NNNN 格式
 * - **操作人/方法/防治对象** 字段从 ctx 传入
 * - **字典翻译**：applicationMethod dict_code → 中文 label
 * - 库存扣减：每条 item 单独扣减（用 item.fertilizerCode 关联库）
 * - 库存恢复：DELETE daily record 时从 real_fertilizer_code 字段读取真实 codes 逐条恢复
 * - 失败不阻断主流程（内部 catch 只 console.error）
 */

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
  // 2026-07-15：库中真实 code（用于库存扣减与溯源）
  fertilizerCode?: string;
  // 2026-07-15：选择库后自动填充（用于费用统计 + 折叠信息显示）
  brandName?: string;
  unitPrice?: number;
  // 药剂特有
  safetyInterval?: number;
  targetPest?: string;
}

interface SyncContext {
  relatedId: string;
  relatedCode: string;
  relatedType: 'planting' | 'seedling';
  recordDate: string;
  cropName: string;
  cropVariety: string;
  greenhouseName: string;
  // 2026-07-15：地块/区域（planting.area_name 优先，greenhouse_name 回退）
  areaId?: string;
  areaName?: string;
  // 2026-07-15：操作人/方法/防治对象
  operatorId?: string;
  operatorName?: string;
  // 2026-07-15：第一个 item 的 applicationMethod（中文 label 优先，否则原值）
  primaryMethod?: string;
  // 2026-07-15：第一个 item 的 targetPest（药剂记录用）
  primaryTargetPest?: string;
}

// ============ 工具函数 ============

/**
 * 2026-07-15：内置兜底映射（DB 字典漏掉时，代码层兜底保证翻译）
 * 应用方法 dict_code → 中文 label
 */
const FALLBACK_APP_METHOD_LABELS: Record<string, string> = {
  // 2026-07-15：补齐常用方法，防止 FeedRecordCard 错用施肥字典时回退到原码
  spray: '喷雾',
  drench: '灌根',
  fumigation: '熏蒸',
  broadcast: '撒施',
  irrigation: '灌施',
  injection: '注射',
  foliar_spray: '叶面喷雾',
  soil_drench: '土壤浇灌',
  trunk_injection: '树干注射',
  drip_irrigation: '滴灌',
  flood_irrigation: '冲施/漫灌',
  spread: '撒施',
  buried: '埋施/穴施',
  base: '基施/底肥',
  top_dressing: '追肥',
  mist_spray: '弥雾',
  dusting: '喷粉',
  seed_dressing: '拌种',
  bait: '诱杀',
};
const FALLBACK_FERT_METHOD_LABELS: Record<string, string> = {
  foliar_spray: '叶面喷施',
  drip_irrigation: '滴灌施肥',
  flood_irrigation: '冲施/漫灌',
  spread: '撒施',
  buried: '埋施/穴施',
  injection: '注射施肥',
  base: '基施/底肥',
  top_dressing: '追肥',
  spray: '叶面喷施',
  drench: '浇根',
  fumigation: '土壤熏蒸',
  broadcast: '撒施',
  irrigation: '随水冲施',
};

/** dict_code → 中文 label 查询（dictionaries 表 + 内置兜底 + 跨字典兜底） */
function translateDictCode(db: any, categoryCode: string, dictCode: string | undefined): string {
  if (!dictCode) return '';
  // 1. 优先查 DB 字典
  try {
    const r = db.exec(
      `SELECT dict_label FROM dictionaries WHERE category_code = ? AND dict_code = ? LIMIT 1`,
      [categoryCode, dictCode]
    );
    const label = r?.[0]?.values?.[0]?.[0];
    if (label) return label as string;
  } catch { /* 忽略 */ }
  // 2. DB 找不到时查内置兜底
  const fallback = categoryCode === 'application_method'
    ? FALLBACK_APP_METHOD_LABELS
    : categoryCode === 'fertilization_method'
      ? FALLBACK_FERT_METHOD_LABELS
      : null;
  if (fallback && fallback[dictCode]) return fallback[dictCode];
  // 3. 跨字典兜底：drip_irrigation 等可能在另一个字典里有 label
  //    解决"前端用了 fertilization_method 字典，但 ptt 写到 application_method 列"的场景
  const other = categoryCode === 'application_method' ? 'fertilization_method' : 'application_method';
  if (other) {
    try {
      const r2 = db.exec(
        `SELECT dict_label FROM dictionaries WHERE category_code = ? AND dict_code = ? LIMIT 1`,
        [other, dictCode]
      );
      const label2 = r2?.[0]?.values?.[0]?.[0];
      if (label2) return label2 as string;
    } catch { /* 忽略 */ }
  }
  return dictCode;  // 都没找到回退原值
}

/** 施肥方式字典 category_code */
const METHOD_DICT_FERT = 'fertilization_method';
/** 施药方式字典 category_code（与防治记录一致） */
const METHOD_DICT_PEST = 'application_method';

/** 生成 SF{YYYYMMDD}-NNNN 编号 */
function generateFertilizerCode(db: any, dateStr: string): string {
  const prefix = `SF${dateStr}`;
  // 查所有 SF{date} 开头的 code 计算 max
  const r = db.exec(
    `SELECT fertilizer_code FROM fertilizer_records WHERE fertilizer_code LIKE ?`,
    [`${prefix}%`]
  );
  let maxSeq = 0;
  for (const row of r?.[0]?.values || []) {
    const code = (row[0] || '') as string;
    const tail = code.split('-').pop() || '';
    const n = parseInt(tail, 10);
    if (!isNaN(n) && n > maxSeq) maxSeq = n;
  }
  return `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
}

/** 生成 BY{YYYYMMDD}-NNNN 编号 */
function generatePesticideCode(db: any, dateStr: string): string {
  const prefix = `BY${dateStr}`;
  const r = db.exec(
    `SELECT record_code FROM pesticide_records WHERE record_code LIKE ?`,
    [`${prefix}%`]
  );
  let maxSeq = 0;
  for (const row of r?.[0]?.values || []) {
    const code = (row[0] || '') as string;
    const tail = code.split('-').pop() || '';
    const n = parseInt(tail, 10);
    if (!isNaN(n) && n > maxSeq) maxSeq = n;
  }
  return `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
}

/** 将本地 Date 转 YYYYMMDD（用于肥料/药剂编号） */
function localDateYYYYMMDD(recordDate: string): string {
  // recordDate 已是 'YYYY-MM-DD' 格式（前端传或 backend ISO 截取）
  if (/^\d{4}-\d{2}-\d{2}$/.test(recordDate)) {
    return recordDate.replace(/-/g, '');
  }
  // 兜底：用当前本地日期
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

/** 将 dilution 格式化为 dilution_ratio 字符串 */
function formatDilution(item: FeedRecordItem): string {
  if (item.dilutionType === 'dilute' && item.dilution) {
    return `1:${item.dilution}`;
  }
  return 'dry';
}

// ============ 库存调整 ============

/** 扣减/恢复肥料库库存 — 用真实 code 关联 */
export function adjustFertilizerStock(db: any, fertilizerCode: string, delta: number): void {
  if (!fertilizerCode || !delta) return;
  try {
    const before = db.exec(
      'SELECT stock_quantity FROM fertilizer_specs WHERE fertilizer_code = ?',
      [fertilizerCode]
    );
    const oldQty = Number(before?.[0]?.values?.[0]?.[0] ?? 0);
    const newQty = oldQty + delta;
    db.run(
      'UPDATE fertilizer_specs SET stock_quantity = ? WHERE fertilizer_code = ?',
      [newQty, fertilizerCode]
    );
    if (newQty < 0) {
      console.warn(`[adjustFertilizerStock] ${fertilizerCode} 库存为负: ${oldQty} + (${delta}) = ${newQty}`);
    }
  } catch (e) {
    console.error('[adjustFertilizerStock] 失败:', (e as Error)?.message || e);
  }
}

/** 扣减/恢复药剂库库存 */
export function adjustPesticideStock(db: any, pesticideCode: string, delta: number): void {
  if (!pesticideCode || !delta) return;
  try {
    const before = db.exec(
      'SELECT stock_quantity FROM pesticide_specs WHERE pesticide_code = ?',
      [pesticideCode]
    );
    const oldQty = Number(before?.[0]?.values?.[0]?.[0] ?? 0);
    const newQty = oldQty + delta;
    db.run(
      'UPDATE pesticide_specs SET stock_quantity = ? WHERE pesticide_code = ?',
      [newQty, pesticideCode]
    );
    if (newQty < 0) {
      console.warn(`[adjustPesticideStock] ${pesticideCode} 库存为负: ${oldQty} + (${delta}) = ${newQty}`);
    }
  } catch (e) {
    console.error('[adjustPesticideStock] 失败:', (e as Error)?.message || e);
  }
}

// ============ 旧同步行恢复（DELETE 路由用）============

/** 查询某 dailyRecordId 在 fertilizer_records 中的旧同步行（JSON 解析 real_fertilizer_code 池） */
export function getOldFertilizerSync(db: any, dailyRecordId: string): Array<{ code: string; qty: number }> {
  try {
    const r = db.exec(
      'SELECT real_fertilizer_code, fertilization_pool FROM fertilizer_records WHERE source_daily_record_id = ?',
      [dailyRecordId]
    );
    const results: Array<{ code: string; qty: number }> = [];
    for (const row of r?.[0]?.values || []) {
      const realCodesJson = row[0] as string;
      const poolJson = row[1] as string;
      if (realCodesJson) {
        try {
          const codes = JSON.parse(realCodesJson);
          if (Array.isArray(codes)) {
            for (const code of codes) results.push({ code: String(code), qty: 0 });
          }
        } catch { /* ignore */ }
      }
      // 数量从 pool JSON 解析（按 item 索引对应）
      if (poolJson) {
        try {
          const pool = JSON.parse(poolJson);
          if (Array.isArray(pool)) {
            for (let i = 0; i < pool.length; i++) {
              const item = pool[i];
              const code = results[i]?.code;
              if (code && item) results[i] = { code, qty: Number(item.quantity) || 0 };
            }
          }
        } catch { /* ignore */ }
      }
    }
    return results;
  } catch { return []; }
}

/** 查询某 dailyRecordId 在 pesticide_records 中的旧同步行 */
export function getOldPesticideSync(db: any, dailyRecordId: string): Array<{ code: string; qty: number }> {
  try {
    const r = db.exec(
      'SELECT real_pesticide_code, pesticide_list FROM pesticide_records WHERE source_daily_record_id = ?',
      [dailyRecordId]
    );
    const results: Array<{ code: string; qty: number }> = [];
    for (const row of r?.[0]?.values || []) {
      const realCodesJson = row[0] as string;
      const listJson = row[1] as string;
      if (realCodesJson) {
        try {
          const codes = JSON.parse(realCodesJson);
          if (Array.isArray(codes)) {
            for (const code of codes) results.push({ code: String(code), qty: 0 });
          }
        } catch { /* ignore */ }
      }
      if (listJson) {
        try {
          const list = JSON.parse(listJson);
          if (Array.isArray(list)) {
            // 2026-07-18 P2-M5 修复：按 item.specId / item.fertilizerCode 配对，不再依赖位置索引
            // - 历史位置索引方案存在错位风险（数组长度不一致时关联错误规格）
            for (const item of list) {
              if (!item) continue;
              const itemCode = item.specId || item.fertilizerCode || item.code || '';
              if (!itemCode) continue;
              const existingIdx = results.findIndex((r) => r.code === String(itemCode));
              const qty = Number(item.dosage) || Number(item.amount) || 0;
              if (existingIdx >= 0) {
                results[existingIdx] = { code: String(itemCode), qty };
              } else {
                results.push({ code: String(itemCode), qty });
              }
            }
          }
        } catch { /* ignore */ }
      }
    }
    return results;
  } catch { return []; }
}

// ============ 主同步函数 ============

/**
 * 同步施肥记录（池模式聚合）
 * 一个 daily record → 一条 fertilizer_record，所有肥料存 fertilization_pool JSON
 */
export async function syncFertilizerRecords(
  db: any,
  dailyRecordId: string,
  items: FeedRecordItem[],
  ctx: SyncContext,
): Promise<void> {
  if (!items || items.length === 0) return;

  try {
    // 0. 恢复旧库存（编辑场景：先把旧数量加回去）
    const oldRows = getOldFertilizerSync(db, dailyRecordId);
    for (const old of oldRows) {
      if (old.qty) adjustFertilizerStock(db, old.code, old.qty);
    }

    // 1. 删除旧同步行（幂等）
    db.run('DELETE FROM fertilizer_records WHERE source_daily_record_id = ?', [dailyRecordId]);

    // 2. 过滤有效 items
    const validItems = items.filter((it) => it.name && it.amount && it.amount > 0);
    if (validItems.length === 0) return;

    // 3. 构建池 JSON（每条 item 按 FertilizerTable 期望的 PoolRow 格式）
    // 参考 src/components/farm/fertilizer/FertilizerTable.tsx parsePool()：
    //   type, id, code, cropName, area, quantity, unit, dilutionRatio,
    //   fertilizationMethod, fertilizerName, unitPrice, ...
    const methodCode = ctx.primaryMethod || '';  // 存 dict_code（让显示层 getDictItemName 翻译）
    const pool = validItems.map((item) => ({
      type: ctx.relatedType,                         // 'planting' | 'seedling'
      id: ctx.relatedId,
      code: ctx.relatedCode,
      cropName: ctx.cropName,
      area: ctx.areaName || '',                      // 用户实际用的"区域"（planting.area_name）
      quantity: Number(item.amount) || 0,
      unit: item.unit || 'kg',
      dilutionRatio: formatDilution(item),
      fertilizationMethod: methodCode,               // 存 dict_code（显示层翻译）
      fertilizerName: item.name,
      fertilizerType: item.category || '',
      fertilizerCode: item.fertilizerCode || '',
      specId: '',
      brandName: item.brandName || '',
      specBrandName: item.brandName || '',
      unitPrice: Number(item.unitPrice) || 0,
      specUnitPrice: Number(item.unitPrice) || 0,
      specBatchNumber: '',
      remarks: item.notes || '',
    }));

    // 4. 计算汇总字段（取第一个 item）
    const first = validItems[0];
    const totalQuantity = validItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
    const firstUnit = first.unit || 'kg';

    // 5. 生成标准编号 SF{YYYYMMDD}-NNNN
    const dateStr = localDateYYYYMMDD(ctx.recordDate);
    const fertilizerCode = generateFertilizerCode(db, dateStr);
    const id = fertilizerCode;  // id = fertilizer_code（与 AddFertilizerModal 风格一致）

    // 6. 真实 codes JSON 数组（用于 DELETE 恢复库存）
    const realCodes = validItems
      .map((it) => it.fertilizerCode)
      .filter((c): c is string => !!c);
    const realCodesJson = realCodes.length > 0 ? JSON.stringify(realCodes) : null;

    // 7. INSERT 一条聚合记录
    db.run(
      `INSERT INTO fertilizer_records (
        id, fertilizer_code, planting_id, planting_code, seedling_id, seedling_code,
        greenhouse_name, crop_name, crop_variety,
        fertilizer_name, fertilizer_type, dilution_ratio,
        quantity, unit, fertilize_time, description,
        operator_id, operator_name,
        data_source, source_type,
        source_daily_record_id, source_item_id,
        real_fertilizer_code, fertilization_pool,
        area_id, area_name,
        create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'daily_record', 'daily_record_sync', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, fertilizerCode,
        ctx.relatedType === 'planting' ? ctx.relatedId : null,
        ctx.relatedType === 'planting' ? ctx.relatedCode : null,
        ctx.relatedType === 'seedling' ? ctx.relatedId : null,
        ctx.relatedType === 'seedling' ? ctx.relatedCode : null,
        ctx.greenhouseName || '',
        ctx.cropName || '',
        ctx.cropVariety || '',
        // 2026-07-15：summary 用第一个 item + 总数量（与 AddFertilizerModal 一致）
        first.name,
        first.category || '',
        formatDilution(first),
        totalQuantity,
        firstUnit,
        ctx.recordDate,
        validItems.map((it) => it.notes).filter(Boolean).join(' | ') || `从每日记录同步（${validItems.length}种）`,
        ctx.operatorId || null,
        ctx.operatorName || null,
        dailyRecordId,
        // 2026-07-15：source_item_id 用 daily record 引用
        `pool-${dailyRecordId.slice(-6)}`,
        realCodesJson,
        JSON.stringify(pool),
        ctx.areaId || null,  // 2026-07-15：区域 ID
        ctx.areaName || null,  // 2026-07-15：区域名（用户实际用的"区域"）
        new Date().toISOString(),
      ]
    );

    // 8. 扣减库存（按每条 item 真实 code）
    for (const item of validItems) {
      if (item.fertilizerCode) {
        adjustFertilizerStock(db, item.fertilizerCode, -(item.amount ?? 0));
      }
    }
  } catch (err) {
    console.error('[syncFertilizerRecords] 同步失败（不影响主记录）:', (err as Error)?.message || err);
  }
}

/**
 * 同步用药记录（池模式聚合）
 * 一个 daily record → 一条 pesticide_record
 */
export async function syncPesticideRecords(
  db: any,
  dailyRecordId: string,
  items: FeedRecordItem[],
  ctx: SyncContext,
): Promise<void> {
  if (!items || items.length === 0) return;

  try {
    // 0. 恢复旧库存
    const oldRows = getOldPesticideSync(db, dailyRecordId);
    for (const old of oldRows) {
      if (old.qty) adjustPesticideStock(db, old.code, old.qty);
    }

    // 1. 删除旧同步行（幂等）
    db.run('DELETE FROM pesticide_records WHERE source_daily_record_id = ?', [dailyRecordId]);

    // 2. 过滤有效 items
    const validItems = items.filter((it) => it.name && it.amount && it.amount > 0);
    if (validItems.length === 0) return;

    // 3. 字典翻译：施用方法 + 防治对象（2026-07-15：column 存中文 label，pool 存 dict_code）
    const methodLabel = translateDictCode(db, METHOD_DICT_PEST, ctx.primaryMethod) || ctx.primaryMethod || '';
    const methodCode = ctx.primaryMethod || '';  // pool 存 dict_code
    const firstWithPest = validItems.find((it) => it.targetPest);

    // 4. 构建池 JSON（按 PestControlTable / AddPestControlModal 期望格式）
    const list = validItems.map((item) => ({
      name: item.name,                                          // 兼容 PestControlTable 的 `name` 字段
      pesticideName: item.name,                                 // 兼容 EditPestControlModal
      pesticideId: '',
      pesticideCode: item.fertilizerCode || '',
      specId: '',
      specContent: '',
      formulation: '',
      manufacturer: '',
      brandName: item.brandName || '',
      type: item.category || '',                                // 主类型
      types: item.category ? [item.category] : [],              // 完整类型数组
      dosage: String(item.amount || ''),
      unit: item.unit || 'L',
      ratio: formatDilution(item),                              // 兼容 dilutionRatio 别名
      dilutionRatio: formatDilution(item),
      applicationMethod: methodLabel,                           // 2026-07-15：存中文 label（与列保持一致，详情展开也直接显示中文）
      targetPest: item.targetPest || '',
      safetyInterval: item.safetyInterval || 0,
      remarks: item.notes || '',
      // 2026-07-15：附加字段（与 fertilizer pool 保持结构一致）
      area: ctx.areaName || '',
      type_source: ctx.relatedType,                             // 'planting' | 'seedling'
      sourceId: ctx.relatedId,
      sourceCode: ctx.relatedCode,
      cropName: ctx.cropName,
    }));

    // 5. 汇总
    const first = validItems[0];
    const totalDosage = validItems.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

    // 6. 标准编号 BY{YYYYMMDD}-NNNN
    const dateStr = localDateYYYYMMDD(ctx.recordDate);
    const recordCode = generatePesticideCode(db, dateStr);
    const id = recordCode;

    // 7. 真实 codes JSON
    const realCodes = validItems
      .map((it) => it.fertilizerCode)
      .filter((c): c is string => !!c);
    const realCodesJson = realCodes.length > 0 ? JSON.stringify(realCodes) : null;

    // 8. 备注（含安全间隔期中文）
    const safetySummary = validItems
      .map((it) => it.safetyInterval ? `安全间隔期:${it.safetyInterval}天` : null)
      .filter(Boolean)
      .join(' | ');
    const description = [
      validItems.map((it) => it.notes).filter(Boolean).join(' | '),
      safetySummary,
    ].filter(Boolean).join(' | ') || `从每日记录同步（${validItems.length}种）`;

    // 9+10. 2026-07-18 P2-H12 修复：INSERT + 库存扣减统一通过 pesticideService.applySyncRecord
    // - 避免与手动 apply() 路径维护双份逻辑
    // - 用 require 懒加载避免 syncDailyRecords ↔ pesticide.service 循环引用
    const { pesticideService } = require('../services/pesticide.service');
    await pesticideService.applySyncRecord({
      id, recordCode,
      sprayTime: ctx.recordDate + ' 12:00:00',
      plantingId: ctx.relatedType === 'planting' ? ctx.relatedId : null,
      plantingCode: ctx.relatedType === 'planting' ? ctx.relatedCode : null,
      seedlingId: ctx.relatedType === 'seedling' ? ctx.relatedId : null,
      seedlingCode: ctx.relatedType === 'seedling' ? ctx.relatedCode : null,
      greenhouseName: ctx.greenhouseName || '',
      cropName: ctx.cropName || '',
      pesticideName: first.name,
      pesticideType: JSON.stringify(first.category ? [first.category] : []),
      dilutionRatio: formatDilution(first),
      totalDosage,
      dosageUnit: first.unit || 'L',
      targetPest: ctx.primaryTargetPest || firstWithPest?.targetPest || '',
      applicationMethod: methodLabel,
      operatorId: ctx.operatorId || null,
      operatorName: ctx.operatorName || null,
      description,
      sourceType: 'daily_record_sync',
      sourceDailyRecordId: dailyRecordId,
      sourceItemId: `pool-${dailyRecordId.slice(-6)}`,
      realPesticideCode: realCodesJson,
      pesticideListJson: JSON.stringify(list),
      bioAgentListJson: JSON.stringify([]),
      equipmentListJson: JSON.stringify([]),
      leafFertilizerListJson: JSON.stringify([]),
      areaId: ctx.areaId || null,
      areaName: ctx.areaName || null,
      pesticideStockDeductions: validItems
        .filter((it) => it.fertilizerCode && it.amount)
        .map((it) => ({ code: String(it.fertilizerCode), qty: Number(it.amount) || 0 })),
    });
  } catch (err) {
    console.error('[syncPesticideRecords] 同步失败（不影响主记录）:', (err as Error)?.message || err);
  }
}
