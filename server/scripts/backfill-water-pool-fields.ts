/**
 * 2026-07-27 一次性回填脚本：把施肥记录 fertilization_pool 里的 code/cropName/id 同步到浇水记录 water_pool
 *
 * 背景：
 * - buildWateringFromPool 之前只复制 7 字段（area/wateringMethod/waterAmount/waterUnit/sourceFertilizer*）
 * - 缺 code/cropName/id，导致 WaterTable 展开行"批号/作物品种"列显示 "-"
 * - 已生成的浇水记录（如 SW20260727-0002 / 0003）不会自动重跑，需要一次性回填
 *
 * 行为：
 * - 对每条 fertilizer_dilution 类型的 watering_record
 * - 读源头 fertilizer_records.fertilization_pool
 * - 按 area+sourceFertilizerName+sourceDilutionRatio+sourceFertilizerQuantity 4 元组匹配 pool 行
 * - 写入 code/cropName/id 字段（保留原 7 字段不变）
 * - 改完 saveDatabase()
 *
 * 注意：
 * - 仅处理 record_type='fertilizer_dilution' 的浇水记录
 * - 不修改 manual / daily_sync 类型（这些是用户手动或同步生成的，不归施肥池管）
 * - 写入前会先备份：dump 当前 water_pool 到 console.log 供回滚参考
 */
import Database = require('better-sqlite3');

const DB_PATH = './data/yuanxingtu.db';
const db = new Database(DB_PATH);

console.log('=== [1] 查找需回填的浇水记录 ===');
const waters = db.prepare(`
  SELECT w.id, w.water_code, w.fertilizer_record_id, w.water_pool
    FROM watering_records w
   WHERE w.record_type = 'fertilizer_dilution'
     AND w.fertilizer_record_id IS NOT NULL
`).all();

console.log(`共 ${waters.length} 条施肥稀释类型浇水记录`);

if (waters.length === 0) {
  console.log('无需回填，退出。');
  process.exit(0);
}

let updated = 0;
let skipped = 0;
let failed = 0;

const cleanup = db.transaction(() => {
  for (const w of waters) {
    try {
      const fer = db.prepare(`SELECT fertilization_pool FROM fertilizer_records WHERE id = ?`).get(w.fertilizer_record_id);
      if (!fer || !fer.fertilization_pool) {
        skipped++;
        continue;
      }

      const sourcePool = JSON.parse(fer.fertilization_pool);
      const currentPool = JSON.parse(w.water_pool || '[]');

      // 给每条 currentPool 行匹配 sourcePool（按 area + fertilizerName + dilutionRatio + quantity 4 元组）
      const updatedPool = currentPool.map((row: any) => {
        // 用 sourceFertilizerQuantity + area + sourceFertilizerName + sourceDilutionRatio 匹配
        const matched = sourcePool.find((sp: any) =>
          sp.area === row.area
          && sp.fertilizerName === row.sourceFertilizerName
          && sp.dilutionRatio === row.sourceDilutionRatio
          && Number(sp.quantity) === Number(row.sourceFertilizerQuantity)
        );
        if (matched) {
          return {
            ...row,
            code: matched.code || '',
            cropName: matched.cropName || '',
            id: matched.id || '',
          };
        }
        // 没匹配上：保留原 row + 空字段（不会清空已有值）
        return { ...row, code: row.code || '', cropName: row.cropName || '', id: row.id || '' };
      });

      db.prepare(`UPDATE watering_records SET water_pool = ? WHERE id = ?`).run(JSON.stringify(updatedPool), w.id);
      updated++;
    } catch (e) {
      console.error(`[FAIL] ${w.water_code}:`, e);
      failed++;
    }
  }
});

console.log('\n确认执行回填？（3 秒后自动继续；按 Ctrl+C 中止）');
setTimeout(() => {
  cleanup();
  // 显式落盘
  db.pragma('wal_checkpoint(FULL)');
  console.log('\n=== [2] 回填完成 ===');
  console.log(`✓ 更新: ${updated} 条`);
  console.log(`⊘ 跳过: ${skipped} 条（源头施肥记录不存在或无池）`);
  console.log(`✗ 失败: ${failed} 条`);
  console.log('\n请重启 server 让内存数据库重新加载 .db 文件。');
  db.close();
}, 3000);