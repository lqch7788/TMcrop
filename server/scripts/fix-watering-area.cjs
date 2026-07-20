const initSqlJs = require('sql.js');
const fs = require('fs');

async function main() {
  const SQL = await initSqlJs();
  const buf = fs.readFileSync('data/yuanxingtu.db');
  const db = new SQL.Database(buf);
  let fixed = 0;

  const r = db.exec("SELECT id, water_code, seedling_id, planting_id, water_pool, greenhouse_name FROM watering_records WHERE record_type = 'daily_sync'");
  if (r.length > 0) {
    for (const row of r[0].values) {
      const wId = row[0], wCode = row[1], sId = row[2], pId = row[3], poolStr = row[4], ghName = row[5];
      if (!poolStr) continue;
      let pool; try { pool = JSON.parse(poolStr); } catch(e) { continue; }
      let realGh = ghName;
      if (sId) {
        const sr = db.exec('SELECT greenhouse_name FROM seedlings WHERE id = ?', [sId]);
        if (sr.length > 0 && sr[0].values.length > 0) realGh = sr[0].values[0][0] || realGh;
      } else if (pId) {
        const pr = db.exec('SELECT greenhouse_name FROM plantings WHERE id = ?', [pId]);
        if (pr.length > 0 && pr[0].values.length > 0) realGh = pr[0].values[0][0] || realGh;
      }
      let changed = false;
      for (const item of pool) {
        if (item.area && /^(seedling_greenhouse|greenhouse)_/i.test(item.area)) {
          item.area = realGh;
          changed = true;
        }
      }
      if (changed) {
        db.run('UPDATE watering_records SET water_pool = ?, area_name = ? WHERE id = ?', [JSON.stringify(pool), realGh, wId]);
        console.log('Fixed:', wCode, 'area ->', realGh);
        fixed++;
      }
    }
  }
  console.log('Total fixed:', fixed);
  const data = db.export();
  fs.writeFileSync('data/yuanxingtu.db', Buffer.from(data));
  db.close();
}
main().catch(e => console.error(e));
