/**
 * 肥料库扁平化数据迁移脚本（一次性，2026-07-12）
 * 把 fertilizer_library 表的 216 条记录生成 216 条占位 spec
 * 保留已存在的 6 条 spec（其 fertilizer_code 由 Phase B 补齐）
 *
 * 幂等保护：通过 spec_check_migration 表的两个独立标记分阶段控制
 *
 * 偏差说明：
 * - INSERT 实际为 26 列（含 fertilizer_id，因 NOT NULL 约束；Phase B 已 DROP COLUMN）
 * - ID 前缀用 fs- 而非 fl-（与现有 6 条 spec 一致）
 * - fertilizer_code 直接复制主表（保持编码连续性）
 * - Phase B 删除 fertilizer_id 列彻底断开主表引用
 * - ALTER TABLE 补齐 10 个新列（旧表实际有 16 列，比 task 描述多 3 列）
 */
import { initDatabase, saveDatabase, getDatabase } from '../src/db';

// 主表关键字段类型（snake_case 与 DB 一致）
interface MasterRecord {
  id: string;
  fertilizer_code: string;
  fertilizer_name: string;
  fertilizer_type: string;
  application_timing: string;
  function_desc: string;
  taboo_desc: string;
  shelf_life: string;
  storage_condition: string;
  supplier_info: string;
  current_stock: number;
}

/**
 * 把主表记录转换为占位 spec 的 INSERT 参数
 * - id 用 fs- 前缀与现有 6 条 spec 命名一致（实际 ID 由调用方生成，此处不产生随机后缀）
 * - fertilizer_code 复用主表编码（保留可追溯性）
 * - stock_quantity 直接搬运主表 current_stock
 */
function migrateMasterToSpec(master: MasterRecord): { code: string; params: any[] } {
  const code = master.fertilizer_code || '';
  const now = new Date().toISOString();
  return {
    code,
    // 26 列：16 旧列 + 10 新增列。params[0] (id) 由调用方填充，避免与主表脱钩
    params: [
      '',                              // 1. id（占位，调用方覆盖为 fs-<ts>-<counter>）
      master.id,                       // 2. fertilizer_id（关联源主表 ID，列有 NOT NULL 约束）
      master.fertilizer_name || '',    // 3. spec_content（暂用名称占位）
      '',                              // 4. manufacturer
      '',                              // 5. suggested_dosage
      '',                              // 6. suggested_ratio
      'kg/亩',                          // 7. dosage_unit
      '',                              // 8. remark
      'active',                        // 9. status
      now,                             // 10. create_time
      '主品牌',                         // 11. brand_name
      0,                               // 12. unit_price
      '',                              // 13. batch_number
      '',                              // 14. production_date
      '',                              // 15. expiration_date
      Number(master.current_stock) || 0,// 16. stock_quantity（从主表搬运）
      // --- 以下为本次 ALTER TABLE 新增的 10 列 ---
      code,                            // 17. fertilizer_code（复用主表）
      master.fertilizer_name || '',    // 18. fertilizer_name
      master.fertilizer_type || '',    // 19. fertilizer_type
      master.application_timing || '', // 20. application_timing
      master.function_desc || '',      // 21. function_desc
      master.taboo_desc || '',         // 22. taboo_desc
      master.shelf_life || '',         // 23. shelf_life
      master.storage_condition || '',  // 24. storage_condition
      master.supplier_info || '',      // 25. supplier_info
      now                              // 26. update_time
    ]
  };
}

/**
 * 给 fertilizer_specs 表补齐本次迁移需要的 10 个新列
 * 旧表 16 列只覆盖 spec 维度字段，主表业务字段需要新列承载
 */
function addMissingColumns(db: ReturnType<typeof getDatabase>): void {
  const columnsToAdd: Array<{ name: string; ddl: string }> = [
    { name: 'fertilizer_code',     ddl: 'TEXT' },
    { name: 'fertilizer_name',     ddl: 'TEXT' },
    { name: 'fertilizer_type',     ddl: 'TEXT' },
    { name: 'application_timing',  ddl: 'TEXT' },
    { name: 'function_desc',       ddl: 'TEXT' },
    { name: 'taboo_desc',          ddl: 'TEXT' },
    { name: 'shelf_life',          ddl: 'TEXT' },
    { name: 'storage_condition',   ddl: 'TEXT' },
    { name: 'supplier_info',       ddl: 'TEXT' },
    { name: 'update_time',         ddl: 'TEXT' },
  ];
  for (const col of columnsToAdd) {
    try {
      db.run(`ALTER TABLE fertilizer_specs ADD COLUMN ${col.name} ${col.ddl}`);
      console.log(`[migrate] 已添加列: ${col.name}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      // 重复列时跳过（兼容手动建过列的场景）
      if (msg.includes('duplicate column')) {
        console.log(`[migrate] 列已存在，跳过: ${col.name}`);
      } else {
        throw e;
      }
    }
  }
}

/**
 * 生成肥料编码 FG+年月日-4位流水号
 * 与 routes/fertilizerLibrary.ts 的规则一致，但改为从 fertilizer_specs 计算最大流水号
 * （Phase B 阶段主表已删或即将删除，唯一编码源变为 spec 表本身）
 */
function generateFertilizerCode(db: ReturnType<typeof getDatabase>): string {
  const today = new Date();
  const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `FG${datePrefix}`;

  const result = db.exec(`SELECT fertilizer_code FROM fertilizer_specs`);
  let maxSeq = 0;
  if (result.length > 0) {
    for (const row of result[0].values) {
      const code = (row[0] as string) || '';
      if (code.startsWith(prefix)) {
        const seq = parseInt(code.split('-').pop() || '0', 10);
        if (seq > maxSeq) maxSeq = seq;
      }
    }
  }
  return `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
}

/**
 * Phase A：216 主表 → 216 占位 spec
 * 幂等标记：fertilizer_library_to_specs
 */
function runPhaseA(db: ReturnType<typeof getDatabase>): void {
  const checkA = db.prepare(`SELECT name FROM spec_check_migration WHERE name='fertilizer_library_to_specs'`);
  const doneA = checkA.step();
  checkA.free();
  if (doneA) {
    console.log('[migrate] Phase A 已迁移过，跳过');
    return;
  }

  console.log('[migrate] Phase A: 216 主表 → 占位 spec');

  // 补齐 fertilizer_specs 表的 10 个新列
  addMissingColumns(db);

  // 读所有主表记录
  const masters = db.exec(`SELECT * FROM fertilizer_library`);
  const masterRows: MasterRecord[] = masters.length > 0
    ? masters[0].values.map(row => {
        const obj: Record<string, unknown> = {};
        masters[0].columns.forEach((col, i) => { obj[col] = row[i]; });
        return obj as MasterRecord;
      })
    : [];

  console.log(`[migrate] 发现 ${masterRows.length} 条主表记录`);

  // 对每条主表记录生成占位 spec；计数器避免同一毫秒 ID 碰撞
  let counter = 0;
  for (const master of masterRows) {
    const { params } = migrateMasterToSpec(master);
    params[0] = `fs-${Date.now()}-${String(counter).padStart(6, '0')}`;
    counter += 1;
    db.run(
      `INSERT INTO fertilizer_specs (
        id, fertilizer_id, spec_content, manufacturer, suggested_dosage, suggested_ratio, dosage_unit,
        remark, status, create_time, brand_name, unit_price, batch_number, production_date, expiration_date, stock_quantity,
        fertilizer_code, fertilizer_name, fertilizer_type, application_timing,
        function_desc, taboo_desc, shelf_life, storage_condition, supplier_info, update_time
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      params
    );
  }

  console.log(`[migrate] 已生成 ${masterRows.length} 条占位 spec`);
  db.run(`INSERT INTO spec_check_migration VALUES ('fertilizer_library_to_specs', ?)`, [new Date().toISOString()]);
}

/**
 * 重建 fertilizer_specs 表，去掉 fertilizer_id 列 + 去掉指向主表的外键
 * 用于 DROP COLUMN 因外键定义报错时的回退方案：
 * 依据 PRAGMA table_info 动态重构列定义，保留原类型/默认值/主键/NOT NULL
 */
function rebuildSpecsWithoutFertilizerId(db: ReturnType<typeof getDatabase>): void {
  const info = db.exec(`PRAGMA table_info(fertilizer_specs)`);
  if (info.length === 0) throw new Error('fertilizer_specs 表不存在，无法重建');

  // PRAGMA table_info 列顺序：cid, name, type, notnull, dflt_value, pk
  const rows = info[0].values;
  const kept = rows.filter(r => r[1] !== 'fertilizer_id');
  const keptNames = kept.map(r => r[1] as string);

  // 重建列定义（保留类型 / PRIMARY KEY / NOT NULL / DEFAULT）
  const columnDefs = kept.map(r => {
    const name = r[1] as string;
    const type = (r[2] as string) || 'TEXT';
    const notnull = r[3] as number;
    const dflt = r[4];
    const pk = r[5] as number;
    let def = `${name} ${type}`;
    if (pk) def += ' PRIMARY KEY';
    if (notnull) def += ' NOT NULL';
    // 默认值统一用括号包裹：字面量(0/'active')与函数表达式(datetime(...))都合法
    if (dflt !== null && dflt !== undefined) def += ` DEFAULT (${dflt})`;
    return def;
  });

  const colList = keptNames.join(', ');
  db.run(`CREATE TABLE fertilizer_specs_new (\n  ${columnDefs.join(',\n  ')}\n)`);
  db.run(`INSERT INTO fertilizer_specs_new (${colList}) SELECT ${colList} FROM fertilizer_specs`);
  db.run(`DROP TABLE fertilizer_specs`);
  db.run(`ALTER TABLE fertilizer_specs_new RENAME TO fertilizer_specs`);
}

/**
 * Phase B：6 条原 spec 编码补全 + DROP 主表 + DROP fertilizer_id 列
 * 幂等标记：fertilizer_specs_code_backfill
 */
function runPhaseB(db: ReturnType<typeof getDatabase>): void {
  const checkB = db.prepare(`SELECT name FROM spec_check_migration WHERE name='fertilizer_specs_code_backfill'`);
  const doneB = checkB.step();
  checkB.free();
  if (doneB) {
    console.log('[migrate] Phase B 已迁移过，跳过');
    return;
  }

  console.log('[migrate] Phase B: 6 原 spec 编码补全 + DROP 主表');

  // 补全无编码的原 spec 编码
  const specsWithoutCode = db.exec(`SELECT id FROM fertilizer_specs WHERE fertilizer_code IS NULL OR fertilizer_code = ''`);
  if (specsWithoutCode.length > 0) {
    const ids = specsWithoutCode[0].values.map(v => v[0] as string);
    console.log(`[migrate] 补全 ${ids.length} 条原 spec 的编码`);
    for (const id of ids) {
      const code = generateFertilizerCode(db);
      db.run(`UPDATE fertilizer_specs SET fertilizer_code = ? WHERE id = ?`, [code, id]);
    }
  } else {
    console.log('[migrate] 无需补全编码的原 spec');
  }

  // DROP 主表
  db.run(`DROP TABLE fertilizer_library`);
  console.log('[migrate] 已删除 fertilizer_library 主表');

  // DROP fertilizer_id 列（彻底断开主表引用）
  // 注意：fertilizer_specs 上有 FOREIGN KEY(fertilizer_id) REFERENCES fertilizer_library，
  // 直接 DROP COLUMN 会因外键定义指向已删列而报错，需回退到"重建表"方案
  try {
    db.run(`ALTER TABLE fertilizer_specs DROP COLUMN fertilizer_id`);
    console.log('[migrate] 已删除 fertilizer_specs.fertilizer_id 列（直接 DROP COLUMN）');
  } catch (e) {
    console.log('[migrate] DROP COLUMN fertilizer_id 直接失败，回退重建表:', (e as Error).message);
    rebuildSpecsWithoutFertilizerId(db);
    console.log('[migrate] 已删除 fertilizer_specs.fertilizer_id 列（重建表方案）');
  }

  db.run(`INSERT INTO spec_check_migration VALUES ('fertilizer_specs_code_backfill', ?)`, [new Date().toISOString()]);
}

async function migrate() {
  console.log('[migrate] 开始肥料库扁平化数据迁移...');
  await initDatabase();
  const db = getDatabase();

  // 确保幂等标记表存在（首次运行时创建）
  db.run(`CREATE TABLE IF NOT EXISTS spec_check_migration (name TEXT PRIMARY KEY, done_at TEXT)`);

  // Phase A：主表 → 占位 spec
  runPhaseA(db);

  // Phase B：编码补全 + DROP 主表 + DROP 列
  runPhaseB(db);

  saveDatabase();
  console.log('[migrate] 完成');
}

migrate().catch(err => {
  console.error('[migrate] 失败：', err);
  process.exit(1);
});
