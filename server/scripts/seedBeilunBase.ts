/**
 * 宁波北仑基地 演示数据种子脚本
 *
 * 2026-07-25：解决基地运营中心"种植中=0 / 当前作物=-"的演示空窗问题
 *
 * 数据链路：
 *   北仑基地 (base_1780023508412)
 *     └ 4 个 active 温室 + 1 个 育苗区
 *         └ 已有的 11 个 zone（覆盖 5 个 GH）
 *             └ ★ 本脚本新增的 4 个 block
 *                 └ ★ 本脚本新增的 6 条 planting_records
 *
 * 幂等设计：
 * - 用 INSERT OR IGNORE + 唯一 oid 前缀（BLK-BL-, PR-BL-）防重复
 * - 已存在则跳过；用户可放心重复运行
 * - 不修改任何已有数据（包括脏数据/inactive 温室）
 *
 * 运行方式：
 *   1. 停 dev server（避免内存 DB 覆盖文件改动）
 *   2. cd server && npx tsx scripts/seedBeilunBase.ts
 *   3. 重启 dev server
 */

const path = require('path');

async function main() {
  const initSqlJs = (await import('sql.js')).default;
  const fs = await import('fs');

  const DB_PATH = path.join(__dirname, '..', 'data', 'yuanxingtu.db');
  const BEILUN_OID = 'base_1780023508412';

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log('=== 北仑基地演示数据 seed ===\n');

  // ============================================
  // 0. 数据修复：之前版本用 code='GH07-001' 当 greenhouse_oid，
  //    但 greenhouses.oid 实际是 'GH007'——补一次 UPDATE 让历史数据归位
  //    注意：db.exec() 对 DML 的返回值不可靠，用 SELECT 先 COUNT 计数再 UPDATE
  // ============================================
  const fixCount = [];
  // zone ZN-BL-GH001-A.greenhouse_oid 错误时修正
  const c1 = db.exec(`SELECT COUNT(*) FROM zones WHERE oid='ZN-BL-GH001-A' AND greenhouse_oid='GH07-001'`)[0]?.values[0]?.[0] ?? 0;
  if (Number(c1) > 0) {
    db.run(`UPDATE zones SET greenhouse_oid='GH007' WHERE oid='ZN-BL-GH001-A' AND greenhouse_oid='GH07-001'`);
    fixCount.push(`zone→GH007 修正 ${c1} 条`);
  }
  // planting_records PR-BLK-BL-001.facility_oid 错误时修正
  const c2 = db.exec(`SELECT COUNT(*) FROM planting_records WHERE oid='PR-BLK-BL-001' AND facility_oid='GH07-001'`)[0]?.values[0]?.[0] ?? 0;
  if (Number(c2) > 0) {
    db.run(`UPDATE planting_records SET facility_oid='GH007' WHERE oid='PR-BLK-BL-001' AND facility_oid='GH07-001'`);
    fixCount.push(`planting→GH007 修正 ${c2} 条`);
  }
  if (fixCount.length > 0) {
    console.log('🔧 修正历史错误:', fixCount.join(', '));
  }

  // ============================================
  // 1. 给 GH07-001（连栋温室区，目前无 zone）补 1 个 zone
  //    2026-07-25 fix：绿houses.oid 实际是 'GH007'，不是 code 'GH07-001'
  // ============================================
  const gh001Oid = 'GH007'; // ★ 修正：使用真实 oid（不是 code 'GH07-001'）
  const gh001ZoneOid = 'ZN-BL-GH001-A';
  const gh001ZoneExists = db.exec(`SELECT oid FROM zones WHERE oid='${gh001ZoneOid}'`)[0]?.values.length ?? 0;

  if (gh001ZoneExists === 0) {
    const now = new Date().toISOString();
    db.run(`
      INSERT OR IGNORE INTO zones
      (id, oid, zone_code, zone_name, greenhouse_oid, greenhouse_name, zone_type, area, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      gh001ZoneOid, gh001ZoneOid, 'Z07-001-A', '连栋温室01区',
      gh001Oid, '连栋温室区', 'multi_span', 80, 1, 'active', now, now,
    ]);
    console.log('✓ 新增 zone: ZN-BL-GH001-A (连栋温室01区) 隶属 GH07-001');
  } else {
    console.log('• zone ZN-BL-GH001-A 已存在，跳过');
  }

  // ============================================
  // 2. 给 5 个 active 温室各加 1 个 block + 1 条 planting_record
  // ============================================
  //
  // 选 zone 策略：每个 active 温室的第一个 zoneOid
  const seeds = [
    {
      ghOid: 'GH007',  // ★ 修正：连栋温室区 oid 是 GH007（code 是 GH07-001）
      ghName: '连栋温室区',
      zoneOid: 'ZN-BL-GH001-A',
      blockOid: 'BLK-BL-001',
      blockCode: 'BL001',
      blockName: '北仑001号地块',
      cropName: '番茄',
      varietyName: '粉冠F1',
      areaBlock: 30,
    },
    {
      ghOid: 'GH1780064185192', // = GH07-002
      ghName: '玻璃温室区',
      zoneOid: 'ZN005',          // 玻璃温室1区
      blockOid: 'BLK-BL-002',
      blockCode: 'BL002',
      blockName: '玻璃温室1号地块',
      cropName: '草莓',
      varietyName: '红颜',
      areaBlock: 5,
    },
    {
      ghOid: 'GH1780064784224', // = GH07-003
      ghName: '日光温室区',
      zoneOid: 'ZN008',          // 玻璃温室2区
      blockOid: 'BLK-BL-003',
      blockCode: 'BL003',
      blockName: '日光温室1号地块',
      cropName: '黄瓜',
      varietyName: '津优35号',
      areaBlock: 8,
    },
    {
      ghOid: 'GH1780092020356', // = GH07-004
      ghName: '大田种植区',
      zoneOid: 'ZN010',          // 日光温室A区
      blockOid: 'BLK-BL-004',
      blockCode: 'BL004',
      blockName: '大田1号地块',
      cropName: '西瓜',
      varietyName: '早春红玉',
      areaBlock: 12,
    },
    {
      ghOid: 'GH1780092366860', // = GH07-008
      ghName: '育苗区',
      zoneOid: 'ZN018',          // 育苗1区
      blockOid: 'BLK-BL-005',
      blockCode: 'BL005',
      blockName: '育苗1号地块',
      cropName: '葡萄',
      varietyName: '巨峰',
      areaBlock: 6,
    },
  ];

  let blockInserted = 0;
  let plantInserted = 0;

  for (const s of seeds) {
    const now = new Date().toISOString();

    // 2a. 插入 block (idempotent by oid)
    const blockExists = db.exec(`SELECT oid FROM blocks WHERE oid='${s.blockOid}'`)[0]?.values.length ?? 0;
    if (blockExists === 0) {
      db.run(`
        INSERT OR IGNORE INTO blocks
        (id, oid, block_code, block_name, zone_oid, zone_name, block_type, area, sort_order, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        s.blockOid, s.blockOid, s.blockCode, s.blockName,
        s.zoneOid, '', 'planting', s.areaBlock, 1, 'active', now, now,
      ]);
      console.log(`✓ 新增 block: ${s.blockOid} (${s.blockName}) 隶属 zone ${s.zoneOid}`);
      blockInserted++;
    } else {
      console.log(`• block ${s.blockOid} 已存在，跳过`);
    }

    // 2b. 插入 planting_record (idempotent by oid prefix)
    const prOid = `PR-${s.blockOid}`;
    const prExists = db.exec(`SELECT oid FROM planting_records WHERE oid='${prOid}'`)[0]?.values.length ?? 0;
    if (prExists === 0) {
      const seasonCode = `BL-${Date.now()}-${s.blockCode}`;
      const startDate = new Date().toISOString().slice(0, 10);
      db.run(`
        INSERT OR IGNORE INTO planting_records
        (oid, season_code, facility_oid, block_oid, crop_name, variety_name, start_date, status, notes, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        prOid, seasonCode, s.ghOid, s.blockOid,
        s.cropName, s.varietyName, startDate, 'planting',
        `北仑基地 2026 演示数据`, now, now,
      ]);
      console.log(`✓ 新增 planting_record: ${prOid} (${s.cropName} ${s.varietyName}, status=planting)`);
      plantInserted++;
    } else {
      console.log(`• planting_record ${prOid} 已存在，跳过`);
    }
  }

  // ============================================
  // 3. 写回 .db 文件
  // ============================================
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
  db.close();

  console.log('\n=== seed 完成 ===');
  console.log(`  新增 block: ${blockInserted} 条`);
  console.log(`  新增 planting_record: ${plantInserted} 条`);
  console.log(`  DB: ${DB_PATH}`);
  console.log('\n⚠ 注意：若 dev server 正在运行，需重启 dev server 让内存 DB 重新加载文件');
}

main().catch((err) => {
  console.error('seed 失败:', err);
  process.exit(1);
});
