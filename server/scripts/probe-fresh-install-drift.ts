/**
 * 探针：**完整启动序列**下的全新库 vs 生产库结构漂移
 *
 * 为什么需要它：`schema.ts` 的 `initializeDatabase()` 只是启动序列的第 1 步，
 * 后面还有 16 个 GREEN 级种子/回填/补列函数。只跑第 1 步会把"其他步骤会补齐"的表/列
 * 误报成漂移（前一版探针就因此报了 46 张表，偏大）。
 * 本探针按 `src/index.ts` 的真实顺序与实参逐个执行，给出可用于决策的准确清单。
 *
 * 安全：DB_PATH_OVERRIDE 指向临时文件，**绝不触碰** server/data/yuanxingtu.db（只读打开比对）。
 * 用法：npx tsx scripts/probe-fresh-install-drift.ts
 */
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const TMP_DB = path.join(__dirname, '..', 'data', '_probe_fresh_install.db');
const PROD_DB = path.join(__dirname, '..', 'data', 'yuanxingtu.db');
process.env.DB_PATH_OVERRIDE = TMP_DB;
process.env.DEMO_MODE = 'true';

/** 逐步执行并打印结果；单步失败不中断（与 index.ts 的容错策略一致） */
async function step(label: string, fn: () => unknown): Promise<void> {
  try {
    const r = fn();
    if (r && typeof (r as Promise<unknown>).then === 'function') await r;
    console.log(`  ✓ ${label}`);
  } catch (e) {
    console.log(`  ✗ ${label} — ${(e as Error)?.message || e}`);
  }
}

async function main() {
  for (const f of [TMP_DB, `${TMP_DB}-journal`]) if (fs.existsSync(f)) fs.unlinkSync(f);

  const dbModule = await import('../src/db/index');
  await dbModule.initDatabase();

  console.log('按 index.ts 顺序执行启动序列：');
  const schema = await import('../src/db/schema');
  await step('initializeDatabase', () => schema.initializeDatabase());

  const seedData = await import('../src/db/seedData');
  await step('seedMarkStatus', () => seedData.seedMarkStatus());
  await step('seedMonitoringDevicesStandalone', () => (seedData as any).seedMonitoringDevicesStandalone?.());
  await step('seedIotAlertsStandalone', () => (seedData as any).seedIotAlertsStandalone?.());
  await step('seedIotEnergyReadingsStandalone', () => (seedData as any).seedIotEnergyReadingsStandalone?.());
  await step('seedIotHistoryStandalone', () => (seedData as any).seedIotHistoryStandalone?.());
  await step('seedIotMonitoringConfigsStandalone', () => (seedData as any).seedIotMonitoringConfigsStandalone?.());
  await step('seedIotCamerasStandalone', () => (seedData as any).seedIotCamerasStandalone?.());

  const b1 = await import('../src/db/backfillTransferInboundRecords');
  await step('migrateBackfillIds', () => b1.migrateBackfillIds());
  await step('backfillTransferInboundRecords', () => b1.backfillTransferInboundRecords());

  const b2 = await import('../src/db/backfillSeedlingHarvestStocked');
  await step('backfillSeedlingHarvestStockedCount', () => b2.backfillSeedlingHarvestStockedCount());

  const fix = await import('../src/db/fixSchemaColumns');
  await step('fixSchemaColumns', () => fix.fixSchemaColumns());

  const b3 = await import('../src/db/backfillPlantingHarvestToInventory');
  await step('backfillPlantingHarvestToInventory', () => b3.backfillPlantingHarvestToInventory());

  const rep = await import('../src/db/materialReceivingDataRepair');
  await step('repairMaterialReceivingData', () => rep.repairMaterialReceivingData());

  const arch = await import('../src/db/deletedDocumentsArchive');
  await step('ensureDeletedDocumentsArchiveSchema', () => arch.ensureDeletedDocumentsArchiveSchema());

  const rec = await import('../src/db/materialLedgerReconciliation');
  await step('reconcileMaterialLedger', () => rec.reconcileMaterialLedger());

  const sup = await import('../src/db/supplierIdBackfill');
  await step('backfillSupplierIds', () => sup.backfillSupplierIds());

  const ds = await import('../src/db/dispatchStatusBackfill');
  await step('backfillDispatchStatus', () => ds.backfillDispatchStatus());

  // ---------- 比对 ----------
  const fresh = dbModule.getDatabase();
  const prodRaw = new Database(PROD_DB, { readonly: true, fileMustExist: true });
  const prod = {
    exec(sql: string) {
      const rows = prodRaw.prepare(sql).all() as Array<Record<string, unknown>>;
      if (rows.length === 0) return [];
      const columns = Object.keys(rows[0]);
      return [{ columns, values: rows.map(r => columns.map(c => r[c])) }];
    },
  };
  const tables = (db: any): string[] => {
    const r = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    return r.length ? (r[0].values as unknown[][]).map(v => String(v[0])) : [];
  };
  const cols = (db: any, t: string): string[] => {
    const r = db.exec(`PRAGMA table_info(${t})`);
    return r.length ? (r[0].values as unknown[][]).map(v => String(v[1])) : [];
  };
  const idx = (db: any): Array<{ n: string; t: string }> => {
    const r = db.exec("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'");
    return r.length ? (r[0].values as unknown[][]).map(v => ({ n: String(v[0]), t: String(v[1]) })) : [];
  };

  const fT = new Set(tables(fresh));
  const pT = tables(prod);

  console.log('\n' + '='.repeat(70));
  console.log(`完整启动后：全新库 ${fT.size} 表 | 生产库 ${pT.length} 表`);
  console.log('='.repeat(70));

  const missingTables = pT.filter(t => !fT.has(t));
  console.log(`\n【仍缺的表】${missingTables.length} 张`);
  if (missingTables.length) console.log('  ' + missingTables.join('\n  '));

  console.log('\n【列漂移】');
  let dT = 0, dC = 0;
  for (const t of pT) {
    if (!fT.has(t)) continue;
    const fc = new Set(cols(fresh, t));
    const miss = cols(prod, t).filter(c => !fc.has(c));
    if (miss.length) { dT++; dC += miss.length; console.log(`  ⚠️ ${t} (${miss.length}): ${miss.join(', ')}`); }
  }
  if (!dT) console.log('  ✅ 无');

  const fI = new Set(idx(fresh).map(i => i.n));
  const missIdx = idx(prod).filter(i => !fI.has(i.n));
  console.log(`\n【仍缺的索引】${missIdx.length} 个`);
  if (missIdx.length) console.log('  ' + missIdx.slice(0, 25).map(i => `${i.n} ON ${i.t}`).join('\n  '));

  console.log('\n' + '='.repeat(70));
  console.log(`结论：缺表 ${missingTables.length} | 列漂移 ${dT} 表/${dC} 列 | 缺索引 ${missIdx.length}`);

  try { dbModule.closeDatabase(); } catch { /* ignore */ }
  prodRaw.close();
  for (const f of [TMP_DB, `${TMP_DB}-journal`]) if (fs.existsSync(f)) fs.unlinkSync(f);
  console.log('[临时库已删除]');
}

main().catch(e => { console.error('探针异常:', e); process.exit(1); });
