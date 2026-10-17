/**
 * 一次性回填：seedlings.replant_count（补苗累计）
 *
 * 背景（2026-10-17）：
 *   2026-07-21 每日记录重构后，补苗（replantChange）只写进 daily_records.data，
 *   主表 replant_count 再也没有累加路径 → 该窗口内创建的记录，补苗在列表里不显示。
 *   代码已修复（services/seedlingDailyChange.ts 补上 replant_count 累加），
 *   但存量数据需一次性回填。
 *
 * 回填口径：
 *   仅累加「2026-07-21 ~ 2026-10-17 09:03(本地) 修复上线前」创建的育苗每日记录里的 replantChange。
 *   - 早于 2026-07-21 的记录：当时旧代码有累加，不能重复加
 *   - 修复上线后的记录：新代码已累加，不能重复加
 *
 * 用法：
 *   node server/scripts/backfill-seedling-replant.cjs          # 预演（只打印，不写库）
 *   node server/scripts/backfill-seedling-replant.cjs --apply  # 实际写库（需先停服！）
 *
 * ⚠️ 必须在后端停止时运行：sql.js 服务进程内存态落盘会覆盖磁盘改动。
 */
const fs = require('fs');
const path = require('path');
const initSqlJs = require(path.join(__dirname, '..', 'node_modules', 'sql.js'));

const DB_PATH = path.join(__dirname, '..', 'data', 'yuanxingtu.db');
const APPLY = process.argv.includes('--apply');

// 回填窗口（本地时间字符串比较；create_time 为 ISO/UTC 字符串，同前缀可比）
const WINDOW_START = '2026-07-21';
const WINDOW_END = '2026-10-17T01:03';   // = 本地 09:03（修复上线时刻）

initSqlJs({ locateFile: (f) => path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', f) })
  .then((SQL) => {
    const db = new SQL.Database(fs.readFileSync(DB_PATH));

    const res = db.exec(
      `SELECT s.id, s.seedling_code, s.replant_count, dr.create_time, dr.data
       FROM daily_records dr JOIN seedlings s ON s.id = dr.related_id
       WHERE dr.related_type = 'seedling' ORDER BY dr.create_time`,
    );
    const rows = res[0] ? res[0].values : [];

    /** seedlingId → { code, current, add } */
    const targets = new Map();
    rows.forEach((v) => {
      const [id, code, current, createTime, dataRaw] = v;
      let d = {};
      try { if (dataRaw) d = JSON.parse(dataRaw); } catch { /* 脏 JSON 跳过 */ }
      const rc = Number(d.replantChange || 0);
      if (!rc) return;
      const t = String(createTime || '');
      const inWindow = t >= WINDOW_START && t < WINDOW_END;
      if (!inWindow) return;
      const cur = targets.get(id) || { code, current: Number(current) || 0, add: 0 };
      cur.add += rc;
      targets.set(id, cur);
    });

    if (targets.size === 0) {
      console.log('没有需要回填的育苗记录。');
      return;
    }

    console.log(`${APPLY ? '【实际写库】' : '【预演，未写库】'} 窗口 ${WINDOW_START} ~ ${WINDOW_END}`);
    let applied = 0;
    for (const [id, t] of targets) {
      const next = t.current + t.add;
      console.log(`  ${t.code}: 补苗 ${t.current} → ${next}（+${t.add}）`);
      if (APPLY) {
        db.run('UPDATE seedlings SET replant_count = ?, update_time = ? WHERE id = ?',
          [next, new Date().toISOString(), id]);
        applied++;
      }
    }

    if (APPLY) {
      fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
      console.log(`已写库：${applied} 条。`);
    } else {
      console.log('（预演结束，确认无误后加 --apply 执行）');
    }
  })
  .catch((e) => {
    console.error('回填失败：', e);
    process.exit(1);
  });
