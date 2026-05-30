/**
 * 修复温室和区块的关联关系
 * 问题：迁移时温室 oid 被改成了新编码（GH001），但区块的 greenhouse_oid 仍保留旧值
 * 解决：将区块的 greenhouse_oid 更新为正确的新温室 oid
 */
const Database = require('better-sqlite3');
const db = new Database('./data/yuanxingtu.db');

console.log('开始修复温室和区块关联...\n');

// 创建临时表存储温室 code -> oid 映射
db.exec(`
  CREATE TABLE IF NOT EXISTS temp_gh_mapping (
    old_oid TEXT,
    new_oid TEXT,
    code TEXT
  )
`);

// 清空临时表
db.prepare('DELETE FROM temp_gh_mapping').run();

// 插入温室映射数据（旧的 oid 和 code 匹配关系）
const greenhouses = db.prepare('SELECT oid, code FROM greenhouses').all();
greenhouses.forEach(gh => {
  // 从 code 提取序号部分，如 GH01-001 -> 001, GH07-002 -> 002
  const match = gh.code.match(/GH\d+-(\d+)/);
  if (match) {
    const seq = match[1].padStart(3, '0');
    // 旧 oid 格式：GH001, GH002, ... GH007, GH008, GH009
    const oldOid = 'GH' + seq;
    db.prepare('INSERT INTO temp_gh_mapping (old_oid, new_oid, code) VALUES (?, ?, ?)').run(oldOid, gh.oid, gh.code);
  }
});

// 显示映射关系
console.log('温室 code -> oid 映射:');
const mappings = db.prepare('SELECT old_oid, new_oid, code FROM temp_gh_mapping').all();
mappings.forEach(m => console.log(`  ${m.code}: ${m.old_oid} -> ${m.new_oid}`));

// 更新区块的 greenhouse_oid
console.log('\n更新区块的 greenhouse_oid...');
let updateCount = 0;

db.transaction(() => {
  const zones = db.prepare('SELECT oid, zone_code, greenhouse_oid FROM zones').all();
  zones.forEach(zone => {
    const mapping = mappings.find(m => m.old_oid === zone.greenhouse_oid);
    if (mapping) {
      db.prepare('UPDATE zones SET greenhouse_oid = ? WHERE oid = ?').run(mapping.new_oid, zone.oid);
      updateCount++;
      console.log(`  ${zone.zone_code}: ${zone.greenhouse_oid} -> ${mapping.new_oid}`);
    }
  });
})();

console.log(`\n更新了 ${updateCount} 个区块的 greenhouse_oid`);

// 清理临时表
db.prepare('DROP TABLE temp_gh_mapping').run();

// 验证修复结果
console.log('\n=== 验证修复结果 ===');
const testZones = db.prepare('SELECT zone_code, zone_name, greenhouse_oid FROM zones WHERE greenhouse_oid LIKE ? LIMIT 10').all('GH0%');
testZones.forEach(z => {
  const gh = db.prepare('SELECT code, name FROM greenhouses WHERE oid = ?').get(z.greenhouse_oid);
  console.log(`  ${z.zone_code} (${z.zone_name}) -> ${gh ? gh.code + ' ' + gh.name : 'NOT FOUND'}`);
});

console.log('\n修复完成！');
