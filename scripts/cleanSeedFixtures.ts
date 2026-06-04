/**
 * 清理测试数据脚本 (V3.1)
 * 删除 seedOutboundFixtures.ts 生成的假数据（TRX-FIX-* 1000 条）
 *
 * 用法：cd D:/TMcrop/yuanxingtu/V1.1 && npx tsx scripts/cleanSeedFixtures.ts
 *
 * 幂等：每次运行只删 TRX-FIX-*，可重复执行
 * 注意：只删假数据（张三/李四/王五/赵六/system），不动真实业务数据
 */

import { initDatabase, saveDatabase, getDatabase } from '../server/src/db';
import { execCount } from '../server/src/utils/queryHelper';

(async () => {
  console.log('初始化数据库...');
  await initDatabase();
  const db = getDatabase();

  // 1. 删 outbound 类型 = TRX-FIX-* 的假数据
  const beforeTotal = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE transaction_type='outbound'");
  const beforeSeed = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE id LIKE 'TRX-FIX-%'");

  console.log(`删前：总 outbound ${beforeTotal} 条，其中 TRX-FIX-* 假数据 ${beforeSeed} 条`);

  if (beforeSeed === 0) {
    console.log('✅ 没有需要清理的假数据（已干净）');
    process.exit(0);
  }

  db.run("DELETE FROM inventory_transaction WHERE id LIKE 'TRX-FIX-%'");
  saveDatabase();

  // 2. 验证
  const afterTotal = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE transaction_type='outbound'");
  const afterSeed = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE id LIKE 'TRX-FIX-%'");

  console.log(`删后：总 outbound ${afterTotal} 条，TRX-FIX-* ${afterSeed} 条`);
  console.log(`✅ 删除 ${beforeSeed - afterSeed} 条假数据，保留 ${afterTotal} 条真实/历史数据`);
  process.exit(0);
})();
