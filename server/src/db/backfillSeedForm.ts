/**
 * 一次性回填脚本：把 seed_sources 表中 seed_form 为 NULL/空/英文的值
 * 根据 source_type 映射到 SEED_FORM_OPTIONS 中文枚举值
 *
 * 2026-07-22 背景：
 * - 用户反馈"内部种源列表 → 编辑弹窗 → 种源形态没有自动获取列表信息"
 * - 诊断：DB 中绝大多数种源 seed_form 是 NULL
 * - 列表"形态"列 fallback 显示 sourceType 翻译 → 让用户误以为有种源形态
 * - 编辑弹窗 select value='null' → 显示"未选择"
 * - 修复：数据迁移 + AddModal 强制必填（前端代码另修）
 *
 * 幂等：可重入（再次运行只会跳过已正确填写的记录）
 *
 * 运行：npx ts-node src/db/backfillSeedForm.ts
 */

import { getDatabase, initDatabase, saveDatabase } from './index';

const SEED_FORM_OPTIONS = [
  '种子', '种苗', '实生苗', '扦插苗', '嫁接苗', '组培苗', '分株苗',
  '种球', '球根', '块根', '块茎', '鳞茎', '穗条', '枝条',
  '叶片', '花朵', '果实', '整株', '其他',
] as const;

// sourceType → seedForm 映射（中文枚举）
const SOURCE_TYPE_TO_SEED_FORM: Record<string, string> = {
  seed: '种子',
  seedling: '种苗',
  cutting: '枝条',
  grafting: '嫁接苗',
  tissue_culture: '组培苗',
  split: '分株苗',
  bulb: '种球',
  spore: '其他', // 孢子不在字典中，兜底"其他"
  mushroom: '其他',
  tuber_root: '块根',
  tuber_bulb: '球茎',
  other: '其他',
};

// 英文 seedForm → 中文（兼容历史英文数据）
const EN_SEED_FORM_TO_CN: Record<string, string> = {
  seed: '种子',
  seedling: '种苗',
  cutting: '枝条',
  grafting: '嫁接苗',
  tissue_culture: '组培苗',
  split: '分株苗',
  bulb: '种球',
  tuber: '块根',
};

export interface BackfillResult {
  total: number;
  updated: number;
  alreadyCorrect: number;
  bySourceType: Record<string, number>;
}

export async function backfillSeedForm(): Promise<BackfillResult> {
  const db = getDatabase();
  const result: BackfillResult = {
    total: 0,
    updated: 0,
    alreadyCorrect: 0,
    bySourceType: {},
  };

  // 1. 找出所有 active 种源
  const allRows = db.prepare(
    `SELECT id, source_type, seed_form FROM seed_sources WHERE deleted_at IS NULL`
  );
  const idsToUpdate: Array<{ id: string; oldValue: string | null; newValue: string; sourceType: string }> = [];

  while (allRows.step()) {
    const row = allRows.getAsObject() as { id: string; source_type: string | null; seed_form: string | null };
    result.total++;
    const sourceType = (row.source_type || 'other').toLowerCase();
    const currentForm = row.seed_form;

    // 已是合法中文枚举 → 跳过
    if (currentForm && (SEED_FORM_OPTIONS as readonly string[]).includes(currentForm)) {
      result.alreadyCorrect++;
      continue;
    }

    // 计算新值：优先 seedForm 本身映射英文，否则按 sourceType
    let newValue: string;
    if (currentForm && EN_SEED_FORM_TO_CN[currentForm.toLowerCase()]) {
      newValue = EN_SEED_FORM_TO_CN[currentForm.toLowerCase()];
    } else {
      newValue = SOURCE_TYPE_TO_SEED_FORM[sourceType] || '其他';
    }

    idsToUpdate.push({
      id: row.id,
      oldValue: currentForm,
      newValue,
      sourceType,
    });
    result.bySourceType[sourceType] = (result.bySourceType[sourceType] || 0) + 1;
  }
  allRows.free();

  // 2. 批量 UPDATE
  if (idsToUpdate.length === 0) {
    console.log('[backfillSeedForm] 无需迁移');
    return result;
  }

  console.log(`[backfillSeedForm] 待迁移 ${idsToUpdate.length} 条：`);
  for (const item of idsToUpdate.slice(0, 5)) {
    console.log(`  ${item.id}: ${JSON.stringify(item.oldValue)} → ${item.newValue} (sourceType=${item.sourceType})`);
  }
  if (idsToUpdate.length > 5) console.log(`  ... 等共 ${idsToUpdate.length} 条`);

  const updateStmt = db.prepare(`UPDATE seed_sources SET seed_form = ? WHERE id = ?`);
  for (const item of idsToUpdate) {
    updateStmt.run([item.newValue, item.id]);
    result.updated++;
  }
  updateStmt.free();

  saveDatabase();
  return result;
}

// 独立运行入口
if (require.main === module) {
  (async () => {
    await initDatabase();
    console.log('[backfillSeedForm] 开始回填 seed_form...');
    const result = await backfillSeedForm();
    saveDatabase();
    console.log(`[backfillSeedForm] 完成：`);
    console.log(`  总数: ${result.total}`);
    console.log(`  已正确: ${result.alreadyCorrect}`);
    console.log(`  已更新: ${result.updated}`);
    console.log(`  按 source_type 分布:`, result.bySourceType);
    process.exit(0);
  })();
}