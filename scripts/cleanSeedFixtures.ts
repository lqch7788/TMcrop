/**
 * 清理测试数据脚本 (V3.1)
 * 删除所有非用户真实操作产生的假数据：
 *  - TRX-FIX-* (seedOutboundFixtures.ts 生成的 1000 条)
 *  - TRX-OUT-* (V3.0 服务跑测试时产生的 outbound)
 *  - TXN-* (V2 时代系统操作员测试数据)
 *
 * 实际按 outbound 全清：当前阶段用户没真实业务出库操作，
 * 所有 outbound 都是开发/V3.0 测试残留。
 *
 * 用法：cd D:/TMcrop/yuanxingtu/V1.1 && npx tsx scripts/cleanSeedFixtures.ts
 *
 * 幂等：每次运行只删 outbound 测试数据，可重复执行
 * 重要：**保留 inbound**（入库可能是真实的，如外购/赠送等）
 */

import { initDatabase, saveDatabase, getDatabase } from '../server/src/db';
import { execCount } from '../server/src/utils/queryHelper';

(async () => {
  console.log('初始化数据库...');
  await initDatabase();
  const db = getDatabase();

  // 删前快照
  const beforeOutbound = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE transaction_type='outbound'");
  const beforeFix      = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE id LIKE 'TRX-FIX-%'");
  const beforeTxn     = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE id LIKE 'TXN-%'");
  const beforeInbound = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE transaction_type='inbound'");
  console.log(`删前：outbound=${beforeOutbound} (TRX-FIX-*=${beforeFix}, TXN-*=${beforeTxn}), inbound=${beforeInbound}`);

  if (beforeOutbound === 0) {
    console.log('✅ 没有 outbound 假数据（已干净）');
    process.exit(0);
  }

  // 删所有 outbound（保留 inbound — 入库可能是真实）
  db.run("DELETE FROM inventory_transaction WHERE transaction_type='outbound'");
  saveDatabase();

  // 删后验证
  const afterOutbound = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE transaction_type='outbound'");
  const afterInbound = execCount(db, "SELECT COUNT(*) FROM inventory_transaction WHERE transaction_type='inbound'");
  const deleted = beforeOutbound - afterOutbound;
  console.log(`删后：outbound=${afterOutbound}, inbound=${afterInbound}`);
  console.log(`✅ 删除 ${deleted} 条 outbound 假数据，保留 ${afterInbound} 条 inbound`);
  process.exit(0);
})();
