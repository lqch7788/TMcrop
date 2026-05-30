/**
 * 修复 zones 表的 greenhouse_oid 字段
 * 正确逻辑：zones.greenhouse_oid 应该存储温室的 oid（UUID），而不是 code
 *
 * 旧数据问题：
 * - 温室 oid 和 code 原来是一样的（如 GH001）
 * - 现在 oid 变成了 UUID（如 GH1780064185192），code 变成了 GH07-002
 * - zones.greenhouse_oid 存的是旧的温室 oid（GH001），需要更新为新的温室 oid
 *
 * 解决：根据温室的 code 找到对应的温室 oid，更新 zones 表
 */
const Database = require('better-sqlite3');
const db = new Database('./data/yuanxingtu.db');

console.log('开始修复 zones 表 greenhouse_oid...\n');

// 获取所有温室，建立 code -> oid 映射
console.log('建立温室 code -> oid 映射:');
const greenhouses = db.prepare('SELECT oid, code FROM greenhouses').all();
const codeToOid = {};
greenhouses.forEach(gh => {
  codeToOid[gh.code] = gh.oid;
  console.log(`  ${gh.code} -> ${gh.oid}`);
});

// 根据温室 code 的序号找到对应的旧 oid
// 例如：GH07-002 对应的旧 oid 是 "GH002"
function findOldOid(code) {
  // 从 code 提取序号，如 GH07-002 -> 002
  const match = code.match(/GH\d+-(\d+)/);
  if (match) {
    const seq = match[1].padStart(3, '0');
    return 'GH' + seq;
  }
  return null;
}

console.log('\n更新 zones 表:');
let successCount = 0;
let failCount = 0;

db.transaction(() => {
  const zones = db.prepare('SELECT oid, zone_code, greenhouse_oid FROM zones').all();
  zones.forEach(zone => {
    // 查找这个 zone 对应的温室（通过 zone_code 推断）
    // Z001-001 -> GH01-001 -> GH001 (旧 oid)
    // 但实际上需要根据当前的 greenhouse_oid 来找

    // 当前 greenhouse_oid 是旧的 oid 格式（如 GH001）
    const oldOid = zone.greenhouse_oid;

    // 从 greenhouses 表中找到所有温室，看哪个的旧 oid 等于当前值
    const matchingGh = greenhouses.find(gh => {
      const ghOldOid = findOldOid(gh.code);
      return ghOldOid === oldOid;
    });

    if (matchingGh) {
      console.log(`  ${zone.zone_code}: ${oldOid} -> ${matchingGh.oid} (${matchingGh.code})`);
      db.prepare('UPDATE zones SET greenhouse_oid = ? WHERE oid = ?').run(matchingGh.oid, zone.oid);
      successCount++;
    } else {
      console.log(`  ${zone.zone_code}: ${oldOid} -> 未找到匹配温室！`);
      failCount++;
    }
  });
})();

console.log(`\n更新完成: 成功 ${successCount}, 失败 ${failCount}`);

// 验证
console.log('\n=== 验证 ===');
const testZones = db.prepare('SELECT z.oid, z.zone_code, z.greenhouse_oid, g.code as gh_code, g.name as gh_name FROM zones z LEFT JOIN greenhouses g ON z.greenhouse_oid = g.oid LIMIT 10').all();
testZones.forEach(z => {
  console.log(`  ${z.zone_code} -> gh_oid: ${z.greenhouse_oid} (${z.gh_code || 'NOT FOUND'})`);
});
