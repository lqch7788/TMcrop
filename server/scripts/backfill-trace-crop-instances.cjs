/**
 * 2026-07-04：追溯链数据回填脚本
 *
 * 背景：
 * - 2026-06-24 引入 crop_instances 表后，新建的种植/育苗/种源会自动建 CI 行
 * - 但之前创建的旧数据没有 crop_instances 行
 * - 导致上游/下游追溯页空白
 *
 * 功能：
 * 1. 为无 CI 行的种植/育苗/种源补建 crop_instances
 * 2. 将采收入库记录的 source_instance_id 关联到对应的 crop_instance
 *
 * 用法：cd server && node scripts/backfill-trace-crop-instances.cjs
 * 每次运行自动备份原 DB 到 data/yuanxingtu.db.backup
 */

const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔧 追溯链数据回填脚本');
  console.log('══════════════════════\n');

  const dbPath = path.join(__dirname, '..', 'data', 'yuanxingtu.db');
  const backupPath = dbPath + '.backup';

  // 1. 备份
  console.log('📦 备份数据库...');
  fs.copyFileSync(dbPath, backupPath);
  console.log('   ✓ 已备份到 yuanxingtu.db.backup\n');

  // 2. 加载数据库
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();
  const buf = fs.readFileSync(dbPath);
  const db = new SQL.Database(buf);
  const now = new Date().toISOString();

  // 统计
  const count = (sql, params = []) => {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    let n = 0;
    if (stmt.step()) n = (stmt.getAsObject()).cnt || 0;
    stmt.free();
    return n;
  };

  const queryRows = (sql, params = []) => {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  };

  // ==========================================================
  // Step 1：为 plantings 补建 crop_instances
  // ==========================================================
  console.log('🌱 Step 1: plantings → crop_instances');
  const plantingsWithoutCI = queryRows(`
    SELECT p.id, p.planting_code, p.crop_name, p.crop_variety,
           p.planting_quantity, p.survival_quantity, p.status,
           p.create_by, p.planting_date, p.create_time
    FROM plantings p
    WHERE p.deleted_at IS NULL
      AND p.id NOT IN (SELECT business_id FROM crop_instances WHERE business_type = 'planting')
  `);
  console.log(`   找到 ${plantingsWithoutCI.length} 条缺失记录`);

  let plantedCI = 0;
  for (let i = 0; i < plantingsWithoutCI.length; i++) {
    const p = plantingsWithoutCI[i];
    const ciId = `CI${Date.now() + i}-pl`;
    try {
      db.run(
        `INSERT INTO crop_instances (
          id, instance_code, crop_name, crop_variety, business_id, business_type,
          source_instance_id, initial_quantity, current_quantity,
          planted_quantity, harvested_quantity, status, planting_date,
          create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ciId,
          p.planting_code || `PL${Date.now()}-${i}`,
          p.crop_name || null,
          p.crop_variety || null,
          p.id,
          'planting',
          null,
          Number(p.planting_quantity) || 0,
          Number(p.survival_quantity || p.planting_quantity) || 0,
          0, 0,
          p.status || 'growing',
          p.planting_date || null,
          p.create_by || null,
          p.create_time || now,
          now,
        ]
      );
      plantedCI++;
    } catch (e) {
      console.log(`   ✗ ${p.planting_code}: ${e.message}`);
    }
  }
  console.log(`   ✓ 创建了 ${plantedCI} 条 crop_instances\n`);

  // ==========================================================
  // Step 2：为 seedlings 补建 crop_instances
  // ==========================================================
  console.log('🌿 Step 2: seedlings → crop_instances');
  const seedlingsWithoutCI = queryRows(`
    SELECT s.id, s.seedling_code, s.crop_name, s.crop_variety,
           s.seedling_quantity, s.survival_quantity, s.status,
           s.source_id, s.create_by, s.seedling_date, s.create_time
    FROM seedlings s
    WHERE s.deleted_at IS NULL
      AND s.id NOT IN (SELECT business_id FROM crop_instances WHERE business_type = 'seedling')
  `);
  console.log(`   找到 ${seedlingsWithoutCI.length} 条缺失记录`);

  let seedlingCI = 0;
  for (let i = 0; i < seedlingsWithoutCI.length; i++) {
    const s = seedlingsWithoutCI[i];
    const ciId = `CI${Date.now() + plantedCI + i}-sd`;
    try {
      db.run(
        `INSERT INTO crop_instances (
          id, instance_code, crop_name, crop_variety, business_id, business_type,
          source_instance_id, initial_quantity, current_quantity,
          planted_quantity, harvested_quantity, status, seedling_start_date,
          create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ciId,
          s.seedling_code || `YM${Date.now()}-${i}`,
          s.crop_name || null,
          s.crop_variety || null,
          s.id,
          'seedling',
          null,
          Number(s.seedling_quantity) || 0,
          Number(s.survival_quantity || s.seedling_quantity) || 0,
          0, 0,
          s.status || 'sown',
          s.seedling_date || null,
          s.create_by || null,
          s.create_time || now,
          now,
        ]
      );
      seedlingCI++;
    } catch (e) {
      console.log(`   ✗ ${s.seedling_code}: ${e.message}`);
    }
  }
  console.log(`   ✓ 创建了 ${seedlingCI} 条 crop_instances\n`);

  // ==========================================================
  // Step 3：为 seed_sources 补建 crop_instances
  // ==========================================================
  console.log('🌾 Step 3: seed_sources → crop_instances');
  const sourcesWithoutCI = queryRows(`
    SELECT ss.id, ss.source_code, ss.crop_name, ss.crop_variety,
           ss.quantity, ss.remaining_quantity,
           ss.create_by, ss.purchase_date, ss.create_time
    FROM seed_sources ss
    WHERE ss.deleted_at IS NULL
      AND ss.id NOT IN (SELECT business_id FROM crop_instances WHERE business_type = 'seed_source')
  `);
  console.log(`   找到 ${sourcesWithoutCI.length} 条缺失记录`);

  let sourceCI = 0;
  for (let i = 0; i < sourcesWithoutCI.length; i++) {
    const s = sourcesWithoutCI[i];
    const ciId = `CI${Date.now() + plantedCI + seedlingCI + i}-ss`;
    try {
      db.run(
        `INSERT INTO crop_instances (
          id, instance_code, crop_name, crop_variety, business_id, business_type,
          source_instance_id, initial_quantity, current_quantity,
          planted_quantity, harvested_quantity, status, seed_entry_date,
          create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          ciId,
          s.source_code || `ZZ${Date.now()}-${i}`,
          s.crop_name || null,
          s.crop_variety || null,
          s.id,
          'seed_source',
          null,
          Number(s.quantity) || 0,
          Number(s.remaining_quantity || s.quantity) || 0,
          0, 0,
          'sufficient',
          s.purchase_date || null,
          s.create_by || null,
          s.create_time || now,
          now,
        ]
      );
      sourceCI++;
    } catch (e) {
      console.log(`   ✗ ${s.source_code}: ${e.message}`);
    }
  }
  console.log(`   ✓ 创建了 ${sourceCI} 条 crop_instances\n`);

  // ==========================================================
  // Step 4：回填 inventory_stock 的 source_instance_id
  // harvest_records.source_id 指向种植/育苗/种源记录
  // harvest_records.source_module 指示是 planting/seedling/seed_source
  // ==========================================================
  console.log('🔗 Step 4: 回填 inventory_stock.source_instance_id');

  const orphanHarvestStocks = queryRows(`
    SELECT is2.instance_id, is2.business_id, hr.source_id, hr.source_module
    FROM inventory_stock is2
    JOIN harvest_records hr ON is2.business_id = hr.id
    WHERE is2.business_type = 'harvest'
      AND is2.source_instance_id IS NULL
      AND hr.source_id IS NOT NULL
      AND hr.source_module IS NOT NULL
  `);
  console.log(`   harvest 无溯源 inventory_stock: ${orphanHarvestStocks.length} 条`);

  let fixedHarvest = 0;
  for (const row of orphanHarvestStocks) {
    // source_module: 'planting' | 'seedling' | 'seed_source'
    // 映射到 crop_instances.business_type
    const businessType = row.source_module;
    const ci = queryRows(
      'SELECT id FROM crop_instances WHERE business_id = ? AND business_type = ? LIMIT 1',
      [row.source_id, businessType]
    );
    if (ci.length > 0) {
      db.run('UPDATE inventory_stock SET source_instance_id = ? WHERE instance_id = ?',
        [ci[0].id, row.instance_id]);
      fixedHarvest++;
    }
  }
  console.log(`   ✓ 回填了 ${fixedHarvest} 条 inventory_stock.source_instance_id\n`);

  // ==========================================================
  // 保存
  // ==========================================================
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
  db.close();

  // 汇总
  console.log('══════════════════════');
  console.log('📊 回填汇总');
  console.log(`   planting crop_instances:  +${plantedCI}`);
  console.log(`   seedling crop_instances:  +${seedlingCI}`);
  console.log(`   seed_source crop_instances: +${sourceCI}`);
  console.log(`   inventory_stock 溯源链: ${fixedHarvest} 条`);
  console.log(`   总新增 crop_instances: ${plantedCI + seedlingCI + sourceCI}`);
  console.log('══════════════════════');
  console.log('✅ 完成！重启 server 后上下游追溯即可显示数据。');
}

main().catch(e => {
  console.error('❌ 回填失败:', e.message);
  process.exit(1);
});
