/**
 * 迁移：创建 IoT 传感器数据表
 * 2026-08-22：M1.5 数据准备 — AI-05 病虫害预警需要环境数据
 *
 * 用法：cd server && npx tsx scripts/create-iot-tables.ts
 */

import { initDatabase, getDatabase, saveDatabase } from '../src/db';

async function main() {
  await initDatabase();
  const db = getDatabase();
  console.log('═'.repeat(60));
  console.log('  Migration: iot_sensor_readings 表');
  console.log('═'.repeat(60));

  // 创建 iot_sensor_readings 表（传感器读数，AI-05 环境数据源）
  db.run(`
    CREATE TABLE IF NOT EXISTS iot_sensor_readings (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL,
      sensor_type TEXT NOT NULL,
      value REAL NOT NULL,
      unit TEXT,
      recorded_at TEXT NOT NULL,
      greenhouse_id TEXT,
      received_at TEXT NOT NULL
    )
  `);
  console.log('✅ iot_sensor_readings 表创建');

  // 索引：加速按温室+时间查询
  db.run('CREATE INDEX IF NOT EXISTS idx_isr_device_time ON iot_sensor_readings(device_id, recorded_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_isr_greenhouse_time ON iot_sensor_readings(greenhouse_id, recorded_at)');
  db.run('CREATE INDEX IF NOT EXISTS idx_isr_type_time ON iot_sensor_readings(sensor_type, recorded_at)');
  console.log('✅ 3 个索引创建');

  // 验证
  const cols = db.exec('PRAGMA table_info(iot_sensor_readings)')[0].values.map((r: any[]) => r[1]);
  console.log('\n[验证] iot_sensor_readings 列:', cols.join(', '));

  saveDatabase();
  console.log('\n✅ 已写盘');
}

main().catch(e => {
  console.error('[migration] 异常:', e);
  process.exit(1);
});
