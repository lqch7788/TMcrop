/**
 * 2026-07-15：手动跑 method 迁移 + 输出 JSON 翻译前后状态
 * 用法：npx tsx server/scripts/runMethodMigration.ts
 */
import { initDatabase, getDatabase } from '../src/db';

(async () => {
  await initDatabase();
  const db = getDatabase();

  console.log('=== 重跑前 BY20260715-0001 状态 ===');
  const before = db.exec(`SELECT pesticide_list FROM pesticide_records WHERE record_code = 'BY20260715-0001'`);
  const itemBefore = JSON.parse(before[0]?.values?.[0]?.[0] || '[]');
  console.log('  JSON[0].applicationMethod =', itemBefore[0]?.applicationMethod);
  console.log('  JSON[1]?.applicationMethod =', itemBefore[1]?.applicationMethod);

  // 强制重跑
  db.run('DELETE FROM schema_migrations WHERE id = ?', ['daily_method_label_translation_v1']);

  const mod = await import('../src/db/fixMissingSchema');
  await mod.fixMissingSchema();

  console.log('=== 重跑后 BY20260715-0001 状态 ===');
  const after = db.exec(`SELECT pesticide_list FROM pesticide_records WHERE record_code = 'BY20260715-0001'`);
  const itemAfter = JSON.parse(after[0]?.values?.[0]?.[0] || '[]');
  console.log('  JSON[0].applicationMethod =', itemAfter[0]?.applicationMethod);
  console.log('  JSON[1]?.applicationMethod =', itemAfter[1]?.applicationMethod);

  // 验证列
  const col = db.exec(`SELECT application_method FROM pesticide_records WHERE record_code = 'BY20260715-0001'`);
  console.log('  列 application_method =', col[0]?.values?.[0]?.[0]);

  const m = db.exec('SELECT id FROM schema_migrations');
  console.log('=== schema_migrations ===');
  console.log('  ', m[0]?.values?.map(v => v[0]));
})().catch(e => {
  console.error('MIG ERR:', e);
  process.exit(1);
});
