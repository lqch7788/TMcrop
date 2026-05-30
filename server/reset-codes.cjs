/**
 * 重置编码脚本
 */

const Database = require('better-sqlite3');
const db = new Database('./data/yuanxingtu.db');

console.log('重置编码...\n');

// 重置基地编码
console.log('重置基地编码:');
const resetBases = [
  ['BASE_2', 'base_1780023507644'],
  ['BASE_3', 'base_1780023507783'],
  ['BASE_7', 'base_1780023507910'],
  ['BASE_12', 'base_1780023508034'],
  ['BASE_1', 'base_1780023508160'],
  ['BASE_6', 'base_1780023508285'],
  ['BASE_4', 'base_1780023508412'],
  ['BASE_10', 'base_1780023508665'],
];

resetBases.forEach(([code, oid]) => {
  db.prepare("UPDATE bases SET code = ? WHERE oid = ?").run(code, oid);
  console.log(`  ${oid.substring(0,15)} -> ${code}`);
});

// 重置温室编码
console.log('\n重置温室编码:');
const resetGreenhouses = [
  ['PLT-003', 'GH010'],
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

resetGreenhouses.forEach(([code, oid]) => {
  db.prepare("UPDATE greenhouses SET code = ? WHERE oid = ?").run(code, oid);
  console.log(`  ${oid.substring(0,15)} -> ${code}`);
});

// 重置区块编码
console.log('\n重置区块编码:');
const resetZones = [
  ['ZN001', 'ZN001'],
  ['ZN002', 'ZN002'],
  ['ZN003', 'ZN003'],
  ['ZN004', 'ZN004'],
  ['ZN005', 'ZN005'],
  ['ZN006', 'ZN006'],
  ['ZN007', 'ZN007'],
  ['ZN008', 'ZN008'],
  ['ZN009', 'ZN009'],
  ['ZN010', 'ZN010'],
  ['ZN011', 'ZN011'],
  ['ZN012', 'ZN012'],
  ['ZN013', 'ZN013'],
  ['ZN014', 'ZN014'],
  ['ZN015', 'ZN015'],
  ['ZN016', 'ZN016'],
  ['ZN017', 'ZN017'],
  ['ZN018', 'ZN018'],
  ['ZN019', 'ZN019'],
  ['ZN020', 'ZN020'],
  ['ZN021', 'ZN021'],
];

// 获取所有zone oid
const zones = db.prepare("SELECT oid, zone_code FROM zones ORDER BY rowid").all();
zones.forEach((z, i) => {
  const newCode = 'ZN' + String(i + 1).padStart(3, '0');
  db.prepare("UPDATE zones SET zone_code = ? WHERE oid = ?").run(newCode, z.oid);
  console.log(`  ${z.oid.substring(0,15)} -> ${newCode}`);
});

console.log('\n重置完成！');
