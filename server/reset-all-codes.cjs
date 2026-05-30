/**
 * 重置所有编码为原始状态
 */

const Database = require('better-sqlite3');
const db = new Database('./data/yuanxingtu.db');

console.log('重置所有编码...\n');

// 重置基地编码
const resetBases = [
  ['BASE_2', 'base_1780023507644'],
  ['BASE_3', 'base_1780023507783'],
  ['BASE_7', 'base_1780023507910'],
  ['BASE_12', 'base_1780023508034'],
  ['BASE_1', 'base_1780023508160'],
  ['BASE_6', 'base_1780023508285'],
  ['BASE_4', 'base_1780023508412'],
  ['BASE_8', 'base_1780023508540'], // 宁波镇海基地
  ['BASE_10', 'base_1780023508665'],
];

console.log('重置基地编码:');
resetBases.forEach(([code, oid]) => {
  db.prepare("UPDATE bases SET code = ? WHERE oid = ?").run(code, oid);
  console.log(`  ${oid.substring(0,15)} -> ${code}`);
});

// 重置温室编码
const resetGreenhouses = [
  ['PLT-003', 'GH010'],  // 无基地
  ['NB-SH-001', 'GH001'],
  ['NB-SH-002', 'GH002'],
  ['NB-SH-003', 'GH003'],
  ['NB-SH-004', 'GH004'],
  ['CD-XA-001', 'GH005'],
  ['CD-XA-002', 'GH006'],
  ['A001', 'GH007'],
  ['CD-NB-002', 'GH008'],
  ['CD-NB-003', 'GH009'],
  ['A002', 'GH1780064185192'],
  ['A003', 'GH1780064784224'],
  ['A004', 'GH1780092020356'],
  ['A005', 'GH1780092060239'],
  ['TEST001', 'GH1780092275162'],
  ['TEST002', 'GH1780092314173'],
  ['A006', 'GH1780092366860'],
];

console.log('\n重置温室编码:');
resetGreenhouses.forEach(([code, oid]) => {
  db.prepare("UPDATE greenhouses SET code = ? WHERE oid = ?").run(code, oid);
  console.log(`  ${oid.substring(0,15)} -> ${code}`);
});

// 重置区块编码
console.log('\n重置区块编码:');
const zones = db.prepare("SELECT oid FROM zones ORDER BY rowid").all();
zones.forEach((z, i) => {
  const newCode = 'ZN' + String(i + 1).padStart(3, '0');
  db.prepare("UPDATE zones SET zone_code = ? WHERE oid = ?").run(newCode, z.oid);
  console.log(`  ${z.oid.substring(0,15)} -> ${newCode}`);
});

console.log('\n重置完成！');

// 验证
console.log('\n=== 验证 ===');
console.log('基地:', db.prepare("SELECT code FROM bases WHERE deleted_at IS NULL").all().map(b => b.code).join(', '));
console.log('温室:', db.prepare("SELECT code FROM greenhouses").all().map(g => g.code).join(', '));
console.log('区块:', db.prepare("SELECT zone_code FROM zones").all().map(z => z.zone_code).join(', '));
