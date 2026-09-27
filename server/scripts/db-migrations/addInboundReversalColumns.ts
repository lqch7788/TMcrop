/**
 * 2026-09-27 入库冲销功能：inbound_records 补 3 列
 *
 * 背景：
 *  已完成入库单的货被部分/全部领用后无法作废（库存不足以全额回收）。
 *  引入 ERP 标准"冲销单"：原单不可改写（审计），另开红字单抵消；
 *  冲销量 = min(原入库量, 该批次当前剩余)——完全消耗的单冲销量 0（仅做标记）。
 *
 * 新增列：
 *  - recordType    'inbound'（默认）| 'reversal'（冲销单）
 *  - reversalOf    冲销关联的原单 id（仅 reversal 单有值）
 *  - reversalReason 冲销原因（操作留痕）
 *
 * 运行（必须先停后端）：
 *  cd server && npm run migrate:inbound-reversal
 */
import initSqlJs from 'sql.js';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');

async function main() {
  console.log(`[addInboundReversalColumns] DB: ${DB_PATH}`);
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  const cols = db.exec('PRAGMA table_info(inbound_records)');
  const existing = new Set<string>(cols.length ? cols[0].values.map((v: any[]) => v[1] as string) : []);

  const toAdd: Array<[string, string]> = [
    ['recordType', "ALTER TABLE inbound_records ADD COLUMN recordType TEXT DEFAULT 'inbound'"],
    ['reversalOf', 'ALTER TABLE inbound_records ADD COLUMN reversalOf INTEGER'],
    ['reversalReason', 'ALTER TABLE inbound_records ADD COLUMN reversalReason TEXT'],
  ];
  for (const [name, sql] of toAdd) {
    if (existing.has(name)) {
      console.log(`  • ${name} 列已存在，跳过`);
    } else {
      db.run(sql);
      console.log(`  ✓ 已添加 ${name} 列`);
    }
  }

  // 历史行回填 recordType（ALTER 的 DEFAULT 不会写入已有行）
  db.run("UPDATE inbound_records SET recordType = 'inbound' WHERE recordType IS NULL OR recordType = ''");
  const backfilled = db.exec("SELECT COUNT(*) FROM inbound_records WHERE recordType = 'inbound'");
  console.log(`  ✓ 历史行回填 recordType='inbound'：${backfilled.length ? backfilled[0].values[0][0] : 0} 行`);

  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  const verify = db.exec('PRAGMA table_info(inbound_records)')[0].values.map((v: any[]) => v[1] as string);
  console.log(`[addInboundReversalColumns] 验证：recordType=${verify.includes('recordType')} reversalOf=${verify.includes('reversalOf')} reversalReason=${verify.includes('reversalReason')}`);
}

main().catch((e) => {
  console.error('[addInboundReversalColumns] 失败:', e);
  process.exit(1);
});
