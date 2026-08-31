/**
 * sql.js 验证 batch_timeline_view
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');

(async () => {
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  console.log('=== sql.js 验证 batch_timeline_view ===\n');

  // 总数
  const totalResult = db.exec('SELECT COUNT(*) AS cnt FROM batch_timeline_view');
  console.log('事件总数:', totalResult[0]?.values[0]?.[0] ?? 0);

  // Top 批次
  const topResult = db.exec(`
    SELECT batch_code, COUNT(*) AS cnt
    FROM batch_timeline_view
    GROUP BY batch_code
    ORDER BY cnt DESC
    LIMIT 5
  `);
  console.log('\nTop 5 批次（事件数最多）:');
  if (topResult.length > 0) {
    topResult[0].values.forEach((row: unknown[]) => {
      console.log(`  ${row[0]}: ${row[1]} 事件`);
    });
  }

  // 按事件类型统计
  const summaryResult = db.exec(`
    SELECT event_type, COUNT(*) AS cnt
    FROM batch_timeline_view
    GROUP BY event_type
    ORDER BY cnt DESC
  `);
  console.log('\n按事件类型统计:');
  if (summaryResult.length > 0) {
    summaryResult[0].values.forEach((row: unknown[]) => {
      console.log(`  ${row[0]}: ${row[1]}`);
    });
  }

  // 示例查询：特定批次的事件
  const sampleResult = db.exec(`
    SELECT event_type, event_date, title, status
    FROM batch_timeline_view
    WHERE batch_code = 'ZZ20260619-003'
    ORDER BY event_date DESC
    LIMIT 5
  `);
  console.log('\nZZ20260619-003 批次最近 5 事件:');
  if (sampleResult.length > 0 && sampleResult[0].values.length > 0) {
    sampleResult[0].values.forEach((row: unknown[]) => {
      console.log(`  [${row[0]}] ${row[1]} - ${row[2]} (${row[3] ?? 'N/A'})`);
    });
  } else {
    console.log('  暂无数据');
  }

  db.close();
  console.log('\n=== 验证完成 ===');
})();
