/**
 * 2026-09-27 materials.remarks 列迁移
 *
 * 背景：
 *  入库单明细（inbound_records.materials JSON）含 remarks 备注字段，但物料主表 materials
 *  无对应列可落 —— 入库录的备注在物料库存页/编辑弹窗无处可看。本次补列，
 *  并把历史入库明细的 remarks 回填到主表（仅回填主表当前为空的物料，不覆盖已有值）。
 *
 * 策略：
 *  1. 幂等：ALTER TABLE materials ADD COLUMN remarks TEXT（列已存在则跳过）
 *  2. 回填：扫描所有 inbound_records.materials JSON，按 code 收集明细 remarks（取最新入库单的值）；
 *     仅当 materials.remarks 为空时写入（不覆盖）
 *  3. 验证：打印列存在 + 回填/跳过统计
 *
 * 运行（必须先停后端，避免运行时内存 DB 覆盖脚本写入）：
 *  cd server && npm run migrate:materials-remarks
 */

import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');

async function main() {
  console.log(`[addMaterialsRemarksColumn] DB: ${DB_PATH}`);

  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  // 1) 补列（幂等）
  const cols = db.exec('PRAGMA table_info(materials)');
  const colNames = cols.length > 0 ? cols[0].values.map((v: any[]) => v[1] as string) : [];
  if (colNames.includes('remarks')) {
    console.log('[addMaterialsRemarksColumn] materials.remarks 列已存在，跳过 ALTER');
  } else {
    db.run('ALTER TABLE materials ADD COLUMN remarks TEXT');
    console.log('[addMaterialsRemarksColumn] ✓ materials 表添加 remarks 列');
  }

  // 2) 回填：扫描入库明细 JSON，按 code 收集 remarks（后写入的入库单覆盖先前的 = 取最新）
  const irRows = db.exec('SELECT id, materials FROM inbound_records ORDER BY id ASC');
  const latestRemarks = new Map<string, string>();
  let detailTotal = 0;
  if (irRows.length > 0) {
    for (const row of irRows[0].values) {
      let list: any[] = [];
      try {
        list = JSON.parse(String(row[1] || '[]'));
      } catch (e) {
        console.warn(`[addMaterialsRemarksColumn] 入库单 id=${row[0]} 明细 JSON 解析失败，跳过`);
        continue;
      }
      if (!Array.isArray(list)) continue;
      for (const m of list) {
        detailTotal++;
        const code = String(m?.code || m?.materialCode || '').trim();
        const remarks = String(m?.remarks || '').trim();
        if (code && remarks) latestRemarks.set(code, remarks);
      }
    }
  }
  console.log(`[addMaterialsRemarksColumn] 扫描入库单明细 ${detailTotal} 条，含备注的物料 code ${latestRemarks.size} 个`);

  let filled = 0;
  let skippedHasValue = 0;
  let skippedNoCode = 0;
  for (const [code, remarks] of latestRemarks) {
    const cur = db.exec('SELECT id, remarks FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1', [code]);
    if (cur.length === 0 || cur[0].values.length === 0) {
      skippedNoCode++;
      continue;
    }
    const existingRemarks = String(cur[0].values[0][1] ?? '').trim();
    if (existingRemarks) {
      skippedHasValue++;
      continue;
    }
    db.run('UPDATE materials SET remarks = ? WHERE id = ?', [remarks, cur[0].values[0][0]]);
    filled++;
  }
  console.log(`[addMaterialsRemarksColumn] 回填 ${filled} 行；跳过（已有备注）${skippedHasValue} 行；物料不存在 ${skippedNoCode} 个`);

  // 3) 落盘 + 验证
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  const verify = db.exec("SELECT COUNT(*) FROM materials WHERE remarks IS NOT NULL AND remarks <> ''");
  const verifyCount = verify.length > 0 ? verify[0].values[0][0] : 0;
  const verifyCols = db.exec('PRAGMA table_info(materials)')[0].values.map((v: any[]) => v[1] as string);
  console.log(`[addMaterialsRemarksColumn] 验证：remarks 列存在=${verifyCols.includes('remarks')}，有备注的物料行=${verifyCount}`);
  console.log('[addMaterialsRemarksColumn] 完成');
}

main().catch((e) => {
  console.error('[addMaterialsRemarksColumn] 失败:', e);
  process.exit(1);
});
