/**
 * 2026-07-21：手动添加育苗表缺失列（fixMissingSchema 在启动时被禁用）
 * 运行方式：cd server && npx tsx scripts/add-seedling-columns.ts
 */

import { getDatabase, saveDatabase, initDatabase } from '../src/db';

async function main() {
  console.log('正在初始化数据库...');
  await initDatabase();
  const db = getDatabase();

  const columns: Array<{ name: string; type: string; def?: string }> = [
    { name: 'calculate_mode', type: 'TEXT', def: "DEFAULT 'single'" },
    { name: 'propagation_multiple', type: 'REAL', def: 'DEFAULT 0' },
    { name: 'custom_multiple', type: 'REAL', def: 'DEFAULT 0' },
    { name: 'theoretical_yield', type: 'REAL', def: 'DEFAULT 0' },
    { name: 'available_transplant_count', type: 'INTEGER', def: 'DEFAULT 0' },
  ];

  for (const col of columns) {
    try {
      db.run(`ALTER TABLE seedlings ADD COLUMN ${col.name} ${col.type} ${col.def}`);
      console.log(`  ✓ 已添加 ${col.name}`);
    } catch (e: any) {
      if (e.message?.includes('duplicate column')) {
        console.log(`  - ${col.name} 已存在，跳过`);
      } else {
        console.error(`  ✗ ${col.name} 失败: ${e.message}`);
      }
    }
  }

  saveDatabase();
  console.log('\n✓ 数据库已保存');
}

main();