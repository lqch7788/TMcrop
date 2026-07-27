/**
 * 2026-07-26 作物编码规则改制迁移
 * 旧: 类别(2字母)+类型(2数字)+品种(2数字)+子品种(3数字)+详细品种(2数字) = 11位
 * 新: 类别(2字母)+类型(2数字)+作物(2数字)+品种(3数字) = 9位
 *
 * 操作：截断所有 crop_code 字段最后2位（detail_variety_code 部分）
 */
import { initDatabase, getDatabase, saveDatabase, closeDatabase } from '../src/db';
import { initializeDatabase } from '../src/db/schema';

async function main() {
  await initDatabase();
  initializeDatabase();
  const db = getDatabase();

  const tables = [
    'crop_varieties',
    'plantings',
    'seedlings',
    'seed_sources',
    'inventory_stock',
    'tech_solutions',
    'crop_orders',
    'crop_instances',
  ];

  console.log('[cropcode 9-digit] 开始迁移...\n');

  for (const table of tables) {
    try {
      // 只更新11位长且有值的
      const before = db.exec(`SELECT COUNT(*) FROM ${table} WHERE length(crop_code) = 11`)[0]?.values[0]?.[0] || 0;
      if (before > 0) {
        db.run(`UPDATE ${table} SET crop_code = substr(crop_code, 1, 9) WHERE length(crop_code) = 11`);
        console.log(`  ✓ ${table}: ${before} 条 (11→9位)`);
      } else {
        console.log(`  - ${table}: 0 条(跳过)`);
      }
    } catch (e: any) {
      console.log(`  ✗ ${table}: ${e.message}`);
    }
  }

  console.log('\n[cropcode 9-digit] 写盘...');
  saveDatabase();
  closeDatabase();
  console.log('[cropcode 9-digit] 完成');
}

main().catch(e => { console.error(e); process.exit(1); });
