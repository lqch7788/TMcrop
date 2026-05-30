/**
 * 编码规则迁移脚本 V5 - 最终版
 * 格式：
 * - 基地编码: B{序号}  如 B001
 * - 温室编码: GH{基地序号(2位)}-{温室序号(3位)}  如 GH01-001
 * - 区块编码: Z{温室序号(3位)}-{区块序号(3位)}  如 Z001-001
 */

const Database = require('better-sqlite3');
const db = new Database('./data/yuanxingtu.db');

console.log('开始编码迁移 V5...\n');

// 1. 迁移基地编码: BASE_X -> B{序号}
console.log('=== 1. 迁移基地编码 ===');
const bases = db.prepare("SELECT rowid, oid, code, name FROM bases WHERE deleted_at IS NULL ORDER BY rowid").all();
const baseCodeMap = {}; // oid -> newCode

bases.forEach((base, index) => {
  const newCode = `B${String(index + 1).padStart(3, '0')}`;
  db.prepare("UPDATE bases SET code = ? WHERE oid = ?").run(newCode, base.oid);
  baseCodeMap[base.oid] = newCode;
  console.log(`  ${base.code} -> ${newCode} (${base.name})`);
});

// 2. 迁移温室编码
console.log('\n=== 2. 迁移温室编码 ===');
const greenhouses = db.prepare("SELECT rowid, oid, code, name, base_oid FROM greenhouses ORDER BY base_oid, rowid").all();

// 建立旧编码->新编码的映射
const oldGhCodeToNewCode = {}; // 旧温室编码 -> 新温室编码

// 按base_oid分组
const ghByBase = {};
greenhouses.forEach(gh => {
  if (!gh.base_oid) return;
  if (!ghByBase[gh.base_oid]) {
    ghByBase[gh.base_oid] = [];
  }
  ghByBase[gh.base_oid].push(gh);
});

Object.keys(ghByBase).forEach(baseOid => {
  const ghs = ghByBase[baseOid];
  let baseSeq = '01';
  if (baseCodeMap[baseOid]) {
    const match = baseCodeMap[baseOid].match(/^B(\d+)$/);
    if (match) {
      baseSeq = String(parseInt(match[1], 10)).padStart(2, '0');
    }
  }

  ghs.forEach((gh, index) => {
    const newCode = `GH${baseSeq}-${String(index + 1).padStart(3, '0')}`;
    oldGhCodeToNewCode[gh.code] = newCode; // 用旧编码映射
    db.prepare("UPDATE greenhouses SET code = ? WHERE oid = ?").run(newCode, gh.oid);
    console.log(`  ${gh.code} -> ${newCode} (${gh.name})`);
  });
});

// 处理没有base_oid的温室
const orphanGreenhouses = greenhouses.filter(gh => !gh.base_oid);
if (orphanGreenhouses.length > 0) {
  console.log('\n  处理无基地温室:');
  orphanGreenhouses.forEach((gh, index) => {
    const newCode = `GH00-${String(index + 1).padStart(3, '0')}`;
    oldGhCodeToNewCode[gh.code] = newCode;
    db.prepare("UPDATE greenhouses SET code = ? WHERE oid = ?").run(newCode, gh.oid);
    console.log(`  ${gh.code} -> ${newCode} (${gh.name})`);
  });
}

// 3. 迁移区块编码
console.log('\n=== 3. 迁移区块编码 ===');
const zones = db.prepare("SELECT rowid, oid, zone_code, zone_name, greenhouse_oid FROM zones ORDER BY greenhouse_oid, rowid").all();

// 从greenhouse_oid（旧温室编码）获取温室新编码的温室序号部分
// greenhouse_oid 在zones表中存的是温室的旧编码（如GH001, GH007等）

zones.forEach((zone, index) => {
  const oldGhCode = zone.greenhouse_oid; // 如 "GH001", "GH007"
  let ghSeq = '001';

  // 从旧编码映射到新编码，然后提取温室序号
  if (oldGhCodeToNewCode[oldGhCode]) {
    const newCode = oldGhCodeToNewCode[oldGhCode];
    const match = newCode.match(/GH\d+-(\d+)/); // 提取温室部分
    if (match) {
      ghSeq = match[1]; // 如 "001", "002"
    }
  } else {
    // 如果没有找到映射，用zones表中的rowid作为序号
    ghSeq = String(zone.rowid || index + 1).padStart(3, '0');
  }

  // 按温室分组计算区块序号
  const zonesOfSameGh = zones.filter(z => z.greenhouse_oid === oldGhCode);
  const zoneIndexInGroup = zonesOfSameGh.indexOf(zone);

  const newCode = `Z${ghSeq}-${String(zoneIndexInGroup + 1).padStart(3, '0')}`;
  db.prepare("UPDATE zones SET zone_code = ? WHERE oid = ?").run(newCode, zone.oid);
  console.log(`  ${zone.zone_code} -> ${newCode} (${zone.zone_name}) [gh: ${oldGhCode}]`);
});

console.log('\n编码迁移完成！');

// 验证
console.log('\n=== 验证结果 ===');
console.log('基地编码:');
db.prepare("SELECT code, name FROM bases WHERE deleted_at IS NULL").all().forEach(b => {
  console.log(`  ${b.code} - ${b.name}`);
});

console.log('\n温室编码:');
db.prepare("SELECT code, name FROM greenhouses").all().forEach(g => {
  console.log(`  ${g.code} - ${g.name}`);
});

console.log('\n区块编码:');
db.prepare("SELECT zone_code, zone_name FROM zones").all().forEach(z => {
  console.log(`  ${z.zone_code} - ${z.zone_name}`);
});
