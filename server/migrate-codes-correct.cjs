/**
 * 编码规则迁移脚本 - 正确版
 * 理解数据模型:
 * - greenhouses.oid = 温室的标识（旧编码如 NB-SH-001）
 * - greenhouses.code = 温室编码
 * - zones.greenhouse_oid = 关联温室的 oid
 */

const Database = require('better-sqlite3');
const db = new Database('./data/yuanxingtu.db');

console.log('开始编码迁移...\n');

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
// greenhouse.oid 就是温室的标识（如 NB-SH-001）
const greenhouses = db.prepare("SELECT oid, code, name, base_oid FROM greenhouses ORDER BY base_oid, oid").all();

// 建立 oid -> base_oid 映射和旧温室编码 -> 新温室编码映射
const ghOidToBaseOid = {}; // greenhouse oid -> base oid
const oldGhCodeToNewCode = {}; // 旧温室编码 -> 新温室编码

// 按base_oid分组
const ghByBase = {};
greenhouses.forEach(gh => {
  ghOidToBaseOid[gh.oid] = gh.base_oid;
  if (!gh.base_oid) return;
  if (!ghByBase[gh.base_oid]) {
    ghByBase[gh.base_oid] = [];
  }
  ghByBase[gh.base_oid].push(gh);
});

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
    oldGhCodeToNewCode[gh.oid] = newCode; // 用 oid（旧的温室编码）作为 key
    db.prepare("UPDATE greenhouses SET code = ? WHERE oid = ?").run(newCode, gh.oid);
    console.log(`  ${gh.oid} -> ${newCode} (${gh.name})`);
  });
});

// 处理没有base_oid的温室
const orphanGreenhouses = greenhouses.filter(gh => !gh.base_oid);
if (orphanGreenhouses.length > 0) {
  console.log('\n  处理无基地温室:');
  orphanGreenhouses.forEach((gh, index) => {
    const newCode = `GH00-${String(index + 1).padStart(3, '0')}`;
    oldGhCodeToNewCode[gh.oid] = newCode;
    db.prepare("UPDATE greenhouses SET code = ? WHERE oid = ?").run(newCode, gh.oid);
    console.log(`  ${gh.oid} -> ${newCode} (${gh.name})`);
  });
}

// 3. 迁移区块编码
console.log('\n=== 3. 迁移区块编码 ===');
// zones.greenhouse_oid 存储的是温室的 oid（旧的温室编码）
const zones = db.prepare("SELECT oid, zone_code, greenhouse_oid FROM zones ORDER BY greenhouse_oid, oid").all();

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
  // 获取温室序号（从新温室编码提取）
  let ghSeq = '001';
  if (oldGhCodeToNewCode[ghOid]) {
    const match = oldGhCodeToNewCode[ghOid].match(/GH\d+-(\d+)/);
    if (match) {
      ghSeq = match[1]; // 如 "001", "002"
    }
  }

  zoneList.forEach((zone, index) => {
    const newCode = `Z${ghSeq}-${String(index + 1).padStart(3, '0')}`;
    db.prepare("UPDATE zones SET zone_code = ? WHERE oid = ?").run(newCode, zone.oid);
    console.log(`  ${zone.zone_code} -> ${newCode} (${zone.greenhouse_oid})`);
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
