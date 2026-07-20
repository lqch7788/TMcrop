const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('data/yuanxingtu.db');
  const db = new SQL.Database(buf);

  // 修复所有 pool JSON 中的英文 area
  let fixed = 0;
  const r = db.exec("SELECT id, fertilizer_code, seedling_id, planting_id, greenhouse_name, area_name, fertilization_pool FROM fertilizer_records WHERE fertilization_pool IS NOT NULL");
  if (r.length > 0) {
    for (const row of r[0].values) {
      const id = row[0], code = row[1], sId = row[2], pId = row[3], ghName = row[4], areaName = row[5];
      let pool; try { pool = JSON.parse(row[6]); } catch (e) { continue; }
      let realGh = ghName || areaName || '';
      if (sId) {
        const sr = db.exec('SELECT greenhouse_name FROM seedlings WHERE id = ?', [sId]);
        if (sr.length > 0 && sr[0].values.length > 0) realGh = sr[0].values[0][0] || realGh;
      } else if (pId) {
        const pr = db.exec('SELECT greenhouse_name FROM plantings WHERE id = ?', [pId]);
        if (pr.length > 0 && pr[0].values.length > 0) realGh = pr[0].values[0][0] || realGh;
      }
      let changed = false;
      for (const item of pool) {
        // 检测英文 area（纯字母+下划线+数字）
        const isEnglish = item.area && /^[a-z_][a-z_0-9]*$/i.test(String(item.area));
        if (isEnglish) {
          item.area = realGh || item.area;
          changed = true;
        }
      }
      if (changed) {
        db.run('UPDATE fertilizer_records SET fertilization_pool = ?, greenhouse_name = ?, area_name = ? WHERE id = ?',
          [JSON.stringify(pool), realGh || ghName || '', realGh || areaName || '', id]);
        console.log('Fixed:', code, 'area ->', realGh);
        fixed++;
      }
    }
  }
  console.log('Total fixed:', fixed, 'fertilizer records');

  const data = db.export();
  fs.writeFileSync('data/yuanxingtu.db', Buffer.from(data));
  db.close();
}
main().catch(e => console.error(e));
