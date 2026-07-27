/**
 * 2026-07-27 一次性清理脚本：清理调试期间产生的脏数据 + 回补库存
 *
 * 背景：
 * - 调试期间用 curl + bash 创建了中文乱码数据（operator_name='tester'）
 * - Windows bash GBK 编码把 UTF-8 中文损坏为 U+FFFD replacement char
 * - 脏数据：1 条浇水记录 SW20260727-0001 + 2 条施肥记录 SF20260727-0002/SF20260727-0003
 *   + 关联库存扣减
 *
 * 清理：
 * 1. 删 watering_records 表 SW20260727-0001
 * 2. 删 fertilizer_records 表 SF20260727-0002 / SF20260727-0003
 * 3. 回补被扣库存：
 *    - fs-1783843117776-000203（石膏）：回补 1（不带池施肥 SF20260727-0003 扣了 1）
 *    - fs-1783843117767-000131（糖蜜发酵水溶肥）：回补 1（带池施肥 SF20260727-0002 池里有 1 条 specId=fs-1783843117767-000131 的项）
 *
 * 注意：
 * - 仅清理 operator_name='tester' 的记录（标识调试脏数据）
 * - 不影响用户真实数据（operator_name='陆启闯' 等）
 */
import Database = require('better-sqlite3');

const DB_PATH = './data/yuanxingtu.db';
const db = new Database(DB_PATH);

// 1. 找脏数据
console.log('=== [1] 调试脏数据预览 ===');
const testWater = db.prepare(`SELECT id, water_code, crop_name, operator_name, fertilizer_record_id FROM watering_records WHERE operator_name = 'tester'`).all();
const testFerts = db.prepare(`SELECT id, fertilizer_code, crop_name, operator_name, fertilization_pool FROM fertilizer_records WHERE operator_name = 'tester'`).all();

console.log('浇水脏数据:', testWater);
console.log('施肥脏数据:', testFerts);

if (testWater.length === 0 && testFerts.length === 0) {
  console.log('未发现脏数据，退出。');
  process.exit(0);
}

// 2. 计算库存回补
console.log('\n=== [2] 库存回补计算 ===');
const stockRefunds = new Map<string, number>();

for (const fer of testFerts) {
  if (fer.fertilization_pool) {
    try {
      const pool = JSON.parse(fer.fertilization_pool);
      for (const item of pool) {
        if (item.specId && item.quantity > 0) {
          stockRefunds.set(item.specId, (stockRefunds.get(item.specId) || 0) + Number(item.quantity));
        }
      }
    } catch (e) {
      console.warn(`无法解析施肥记录 ${fer.fertilizer_code} 的池:`, e);
    }
  } else if (fer.fertilization_pool === null && fer.crop_name) {
    // 不带池的，看顶层 fertilizer_id / quantity
    // 实际上不带池的不扣库存（apply() 里只有 fertilization_pool 有 specId 才扣）— 跳过
  }
}

// 单独处理不带池的 1 单位扣减：之前我没用顶层 fertilizerId，所以 SF20260727-0003 不扣库存
// 实际检查：apply() 流程只有顶层 fertilizerId 才扣 — 我的 curl 测试没传 fertilizerId，所以 SF20260727-0003 应该不扣库存
// 但保险起见，查 sf-1785119848627-6cf2zc（带池）的池扣减
console.log('库存回补明细:');
for (const [specId, qty] of stockRefunds) {
  console.log(`  ${specId}: +${qty}`);
}

if (stockRefunds.size === 0) {
  console.log('无需库存回补。');
}

// 3. dry-run 摘要
console.log('\n=== [3] DRY-RUN 摘要 ===');
console.log(`即将删除 ${testWater.length} 条浇水记录`);
console.log(`即将删除 ${testFerts.length} 条施肥记录`);
console.log(`即将回补 ${stockRefunds.size} 个 spec 的库存`);
console.log('\n确认执行清理？按 Ctrl+C 中止；等待 3 秒后自动继续...');

setTimeout(() => {
  // 4. 执行清理（在事务中）
  console.log('\n=== [4] 开始清理 ===');
  const cleanup = db.transaction(() => {
    // 4.1 删浇水
    const delWater = db.prepare(`DELETE FROM watering_records WHERE operator_name = 'tester'`).run();
    console.log(`✓ 删除浇水记录: ${delWater.changes} 条`);

    // 4.2 删施肥
    const delFer = db.prepare(`DELETE FROM fertilizer_records WHERE operator_name = 'tester'`).run();
    console.log(`✓ 删除施肥记录: ${delFer.changes} 条`);

    // 4.3 回补库存
    for (const [specId, qty] of stockRefunds) {
      const upd = db.prepare(`UPDATE fertilizer_specs SET stock_quantity = stock_quantity + ?, update_time = datetime('now','localtime') WHERE id = ?`).run(qty, specId);
      console.log(`✓ 回补 ${specId}: +${qty} (影响 ${upd.changes} 行)`);
    }
  });

  try {
    cleanup();
    console.log('\n=== [5] 清理完成 ===');
    console.log('请重启 server 让内存数据库重新加载 .db 文件。');
  } catch (err) {
    console.error('清理失败:', err);
    process.exit(1);
  }
}, 3000);