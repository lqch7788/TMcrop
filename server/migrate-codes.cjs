/**
 * 编码规则迁移脚本 V2
 * 将基地、温室、区块的编码统一为新格式
 */

const Database = require('better-sqlite3');
const db = new Database('./data/yuanxingtu.db');

console.log('开始编码迁移 V2...\n');

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

// 2. 迁移温室编码: 统一为 GH{基地序号}-{温室序号}
console.log('\n=== 2. 迁移温室编码 ===');

// 先按base_oid分组，每组内按rowid排序
const greenhouses = db.prepare("SELECT rowid, oid, code, name, base_oid FROM greenhouses ORDER BY base_oid, rowid").all();

// 按基地分组
const ghByBase = {};
greenhouses.forEach(gh => {
  if (!ghByBase[gh.base_oid]) {
    ghByBase[gh.base_oid] = [];
  }
  ghByBase[gh.base_oid].push(gh);
});

const ghNewCodes = {}; // oid -> newCode

Object.keys(ghByBase).forEach(baseOid => {
  const ghs = ghByBase[baseOid];
  // 解析基地序号
  let baseSeq = '01';
  if (baseCodeMap[baseOid]) {
    const match = baseCodeMap[baseOid].match(/^B(\d+)$/);
    if (match) {
      baseSeq = String(parseInt(match[1], 10)).padStart(2, '0');
    }
  }

  ghs.forEach((gh, index) => {
    const newCode = `GH${baseSeq}-${String(index + 1).padStart(3, '0')}`;
    ghNewCodes[gh.oid] = newCode;
    db.prepare("UPDATE greenhouses SET code = ? WHERE oid = ?").run(newCode, gh.oid);
    console.log(`  ${gh.code} -> ${newCode} (${gh.name})`);
  });
});

// 3. 迁移区块编码: 统一为 Z{温室序号}-{区块序号}
console.log('\n=== 3. 迁移区块编码 ===');

// 按greenhouse_oid分组，每组内按rowid排序
const zones = db.prepare("SELECT rowid, oid, zone_code, zone_name, greenhouse_oid FROM zones ORDER BY greenhouse_oid, rowid").all();

// 按温室分组
const zonesByGh = {};
zones.forEach(z => {
  if (!zonesByGh[z.greenhouse_oid]) {
    zonesByGh[z.greenhouse_oid] = [];
  }
  zonesByGh[z.greenhouse_oid].push(z);
});

Object.keys(zonesByGh).forEach(ghOid => {
  const zoneList = zonesByGh[ghOid];
  // 解析温室序号
  let ghSeq = '001';
  if (ghNewCodes[ghOid]) {
    const match = ghNewCodes[ghOid].match(/GH(\d+)-(\d+)/);
    if (match) {
      ghSeq = match[1] + match[2]; // 基地序号 + 温室序号
    }
  } else {
    // 对于不在ghNewCodes中的温室，使用温室的rowid补零
    const gh = greenhouses.find(g => g.oid === ghOid);
    if (gh) {
      ghSeq = String(gh.rowid || 1).padStart(3, '0');
    }
  }

  zoneList.forEach((zone, index) => {
    const newCode = `Z${ghSeq}-${String(index + 1).padStart(3, '0')}`;
    db.prepare("UPDATE zones SET zone_code = ? WHERE oid = ?").run(newCode, zone.oid);
    console.log(`  ${zone.zone_code || '-'} -> ${newCode} (${zone.zone_name})`);
  });
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
