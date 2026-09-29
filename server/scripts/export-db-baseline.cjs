/**
 * 导出「基线库」——把当前运行时库快照为 server/data/yuanxingtu-seed.db 并提交
 *
 * 背景（2026-09-29 架构调整）：
 *   运行时库 server/data/yuanxingtu.db 已移出版本控制（.gitignore）。
 *   原因：sql.js 每次落盘重写整个文件，而 operation_logs 审计表在每次交互时增长，
 *   「DB 入库 + 高频写入」必然导致 git status 长期 modified —— 这是运行时可变二进制
 *   文件放进版本控制的固有矛盾，无法通过优化写入消除。
 *   现改为：提交**基线库**（yuanxingtu-seed.db），运行时库由启动引导自动从基线复制。
 *
 * 何时运行：
 *   - 需要把当前业务数据（演示数据、初始化后的配置）共享给其他人或换机时
 *   - 调整了种子/字典/基础配置之后
 *
 * ⚠️ 必须先停后端（保证快照一致），再运行本脚本，然后提交 yuanxingtu-seed.db。
 *
 * 用法：停服 → node server/scripts/export-db-baseline.cjs [--apply] → 启服 → git add/commit
 *   默认干跑，只做校验与预检，不覆盖基线。
 */
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const APPLY = process.argv.includes('--apply');
const DATA = path.join(__dirname, '..', 'data');
const RUNTIME = path.join(DATA, 'yuanxingtu.db');
const BASELINE = path.join(DATA, 'yuanxingtu-seed.db');

console.log('='.repeat(72));
console.log(`导出基线库${APPLY ? '（执行）' : '（干跑）'}`);
console.log('='.repeat(72));

if (!fs.existsSync(RUNTIME)) {
  console.error(`❌ 运行时库不存在：${RUNTIME}`);
  process.exit(1);
}

// ── 1. 预检：能否打开、关键表是否健康、两本账是否自洽 ──
let check;
try {
  const db = new Database(RUNTIME, { readonly: true, fileMustExist: true });
  const g = (t) => { try { return db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c; } catch { return 'ERR'; } };
  const consistency = db.prepare(`
    SELECT COUNT(*) total,
      SUM(CASE WHEN ABS(m.quantity - COALESCE((SELECT SUM(b.remaining_quantity) FROM batch_inventory b WHERE b.material_code = m.code), 0)) > 0.001 THEN 1 ELSE 0 END) mm
    FROM materials m`).get();
  check = {
    materials: g('materials'),
    batch_inventory: g('batch_inventory'),
    suppliers: g('suppliers'),
    approvals: g('approvals'),
    material_returns: g('material_returns'),
    ledgerTotal: consistency.total,
    ledgerMismatch: consistency.mm,
  };
  db.close();
} catch (e) {
  console.error('❌ 运行时库无法读取（可能后端仍在写）：', e.message);
  process.exit(1);
}

console.log('\n【运行时库体检】');
Object.entries(check).forEach(([k, v]) => console.log(`  ${k}: ${v}`));
if (check.ledgerMismatch !== 0) {
  console.error(`\n❌ 两本账有 ${check.ledgerMismatch} 条不一致，拒绝导出基线。请先修复账目。`);
  process.exit(1);
}
console.log('  ✅ 两本账自洽');

// ── 2. 后端是否已停（端口探测）──
// 只提示不阻断：端口被占可能只是别的进程，具体以人工确认为准
console.log('\n【提醒】导出前请确认后端已停止（否则可能快照到写入中途的状态）');

const sizeMB = (fs.statSync(RUNTIME).size / 1024 / 1024).toFixed(1);
console.log(`\n【导出计划】`);
console.log(`  源  : ${RUNTIME}  (${sizeMB}MB)`);
console.log(`  目标: ${BASELINE}`);
if (fs.existsSync(BASELINE)) {
  const oldMB = (fs.statSync(BASELINE).size / 1024 / 1024).toFixed(1);
  console.log(`  ⚠️ 目标已存在（${oldMB}MB），将被覆盖（覆盖前自动留一份 .bak）`);
}

if (!APPLY) {
  console.log('\n[干跑] 未写入。加 --apply 执行。');
  process.exit(0);
}

// ── 3. 执行：先备份旧基线，再复制，再校验 ──
if (fs.existsSync(BASELINE)) {
  const bak = `${BASELINE}.bak-${Date.now()}`;
  fs.copyFileSync(BASELINE, bak);
  console.log(`\n  旧基线已备份：${path.basename(bak)}`);
}
fs.copyFileSync(RUNTIME, BASELINE);

const vdb = new Database(BASELINE, { readonly: true, fileMustExist: true });
const vMat = vdb.prepare('SELECT COUNT(*) c FROM materials').get().c;
const vConsistency = vdb.prepare(`
  SELECT SUM(CASE WHEN ABS(m.quantity - COALESCE((SELECT SUM(b.remaining_quantity) FROM batch_inventory b WHERE b.material_code = m.code), 0)) > 0.001 THEN 1 ELSE 0 END) mm
  FROM materials m`).get().mm;
vdb.close();

console.log(`\n  已导出：${path.basename(BASELINE)} (${(fs.statSync(BASELINE).size / 1024 / 1024).toFixed(1)}MB)`);
console.log(`  校验：materials ${vMat}（源 ${check.materials}）${vMat === check.materials ? '✅' : '❌'}；两本账不一致 ${vConsistency} ${vConsistency === 0 ? '✅' : '❌'}`);
console.log('\n下一步：git add server/data/yuanxingtu-seed.db && git commit');
