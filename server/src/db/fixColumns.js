/**
 * 直接修复数据库缺失列
 * 运行: node src/db/fixColumns.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../data/yuanxingtu.db');

async function fixColumns() {
  const SQL = await initSqlJs();
  const buffer = fs.readFileSync(DB_PATH);
  const db = new SQL.Database(buffer);

  const results = [];

  // 1. 检查并添加 organizations 表的缺失列
  const orgColumns = db.exec("PRAGMA table_info(organizations)");
  const orgColumnNames = orgColumns.length > 0 ? orgColumns[0].values.map(r => r[1]) : [];

  const orgMissingCols = [
    { name: 'parent_oid', sql: 'ALTER TABLE organizations ADD COLUMN parent_oid TEXT' },
    { name: 'aid', sql: 'ALTER TABLE organizations ADD COLUMN aid TEXT' },
    { name: 'description', sql: 'ALTER TABLE organizations ADD COLUMN description TEXT' },
    { name: 'address', sql: 'ALTER TABLE organizations ADD COLUMN address TEXT' },
    { name: 'contactor', sql: 'ALTER TABLE organizations ADD COLUMN contactor TEXT' },
    { name: 'contactor_phone', sql: 'ALTER TABLE organizations ADD COLUMN contactor_phone TEXT' },
    { name: 'contactor_mobile', sql: 'ALTER TABLE organizations ADD COLUMN contactor_mobile TEXT' },
    { name: 'contactor_email', sql: 'ALTER TABLE organizations ADD COLUMN contactor_email TEXT' },
    { name: 'org_type', sql: "ALTER TABLE organizations ADD COLUMN org_type TEXT DEFAULT 'department'" },
    { name: 'sort_order', sql: 'ALTER TABLE organizations ADD COLUMN sort_order INTEGER DEFAULT 0' },
  ];

  for (const col of orgMissingCols) {
    if (!orgColumnNames.includes(col.name)) {
      try {
        db.run(col.sql);
        results.push(`✓ organizations 添加列: ${col.name}`);
      } catch (e) {
        results.push(`✗ organizations.${col.name}: ${e.message}`);
      }
    } else {
      results.push(`• organizations.${col.name} 已存在`);
    }
  }

  // 2. 检查并添加 devices 表的缺失列
  const devColumns = db.exec("PRAGMA table_info(devices)");
  const devColumnNames = devColumns.length > 0 ? devColumns[0].values.map(r => r[1]) : [];

  const devMissingCols = [
    { name: 'oid', sql: 'ALTER TABLE devices ADD COLUMN oid TEXT' },
    { name: 'device_code', sql: 'ALTER TABLE devices ADD COLUMN device_code TEXT' },
    { name: 'device_name', sql: 'ALTER TABLE devices ADD COLUMN device_name TEXT' },
    { name: 'device_type', sql: 'ALTER TABLE devices ADD COLUMN device_type TEXT' },
    { name: 'serial_number', sql: 'ALTER TABLE devices ADD COLUMN serial_number TEXT' },
    { name: 'greenhouse_oid', sql: 'ALTER TABLE devices ADD COLUMN greenhouse_oid TEXT' },
    { name: 'location', sql: 'ALTER TABLE devices ADD COLUMN location TEXT' },
    { name: 'last_maintenance_date', sql: 'ALTER TABLE devices ADD COLUMN last_maintenance_date TEXT' },
    { name: 'next_maintenance_date', sql: 'ALTER TABLE devices ADD COLUMN next_maintenance_date TEXT' },
  ];

  for (const col of devMissingCols) {
    if (!devColumnNames.includes(col.name)) {
      try {
        db.run(col.sql);
        results.push(`✓ devices 添加列: ${col.name}`);
      } catch (e) {
        results.push(`✗ devices.${col.name}: ${e.message}`);
      }
    } else {
      results.push(`• devices.${col.name} 已存在`);
    }
  }

  // 3. 检查并添加 sys_code_rules 表的缺失列
  const codeColumns = db.exec("PRAGMA table_info(sys_code_rules)");
  const codeColumnNames = codeColumns.length > 0 ? codeColumns[0].values.map(r => r[1]) : [];

  const codeMissingCols = [
    { name: 'oid', sql: 'ALTER TABLE sys_code_rules ADD COLUMN oid TEXT' },
    { name: 'entity_type', sql: 'ALTER TABLE sys_code_rules ADD COLUMN entity_type TEXT' },
    { name: 'seq_length', sql: 'ALTER TABLE sys_code_rules ADD COLUMN seq_length INTEGER DEFAULT 3' },
    { name: 'current_seq', sql: 'ALTER TABLE sys_code_rules ADD COLUMN current_seq INTEGER DEFAULT 0' },
    { name: 'date_pattern', sql: 'ALTER TABLE sys_code_rules ADD COLUMN date_pattern TEXT' },
    { name: 'description', sql: 'ALTER TABLE sys_code_rules ADD COLUMN description TEXT' },
  ];

  for (const col of codeMissingCols) {
    if (!codeColumnNames.includes(col.name)) {
      try {
        db.run(col.sql);
        results.push(`✓ sys_code_rules 添加列: ${col.name}`);
      } catch (e) {
        results.push(`✗ sys_code_rules.${col.name}: ${e.message}`);
      }
    } else {
      results.push(`• sys_code_rules.${col.name} 已存在`);
    }
  }

  // 4. 检查并添加 sys_dictionary_categories 表的缺失列
  const dictColumns = db.exec("PRAGMA table_info(sys_dictionary_categories)");
  const dictColumnNames = dictColumns.length > 0 ? dictColumns[0].values.map(r => r[1]) : [];

  const dictMissingCols = [
    { name: 'oid', sql: 'ALTER TABLE sys_dictionary_categories ADD COLUMN oid TEXT' },
    { name: 'module', sql: 'ALTER TABLE sys_dictionary_categories ADD COLUMN module TEXT' },
    { name: 'description', sql: 'ALTER TABLE sys_dictionary_categories ADD COLUMN description TEXT' },
  ];

  for (const col of dictMissingCols) {
    if (!dictColumnNames.includes(col.name)) {
      try {
        db.run(col.sql);
        results.push(`✓ sys_dictionary_categories 添加列: ${col.name}`);
      } catch (e) {
        results.push(`✗ sys_dictionary_categories.${col.name}: ${e.message}`);
      }
    } else {
      results.push(`• sys_dictionary_categories.${col.name} 已存在`);
    }
  }

  // 5. 检查并添加 notification_rules 表的 conditions 列
  const notifColumns = db.exec("PRAGMA table_info(notification_rules)");
  const notifColumnNames = notifColumns.length > 0 ? notifColumns[0].values.map(r => r[1]) : [];

  if (!notifColumnNames.includes('conditions')) {
    try {
      db.run("ALTER TABLE notification_rules ADD COLUMN conditions TEXT");
      results.push('✓ notification_rules 添加列: conditions');
    } catch (e) {
      results.push(`✗ notification_rules.conditions: ${e.message}`);
    }
  } else {
    results.push('• notification_rules.conditions 已存在');
  }

  // 6. 检查并添加 positions 表的 sort_order 列
  const posColumns = db.exec("PRAGMA table_info(positions)");
  const posColumnNames = posColumns.length > 0 ? posColumns[0].values.map(r => r[1]) : [];

  if (!posColumnNames.includes('sort_order')) {
    try {
      db.run("ALTER TABLE positions ADD COLUMN sort_order INTEGER DEFAULT 0");
      results.push('✓ positions 添加列: sort_order');
    } catch (e) {
      results.push(`✗ positions.sort_order: ${e.message}`);
    }
  } else {
    results.push('• positions.sort_order 已存在');
  }

  // 7. 创建 sys_approval_rules 表（如果不存在）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS sys_approval_rules (
        id TEXT PRIMARY KEY,
        oid TEXT UNIQUE NOT NULL,
        rule_code TEXT NOT NULL,
        rule_name TEXT NOT NULL,
        business_type TEXT,
        flow_id TEXT,
        conditions TEXT,
        is_active INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT
      )
    `);
    results.push('✓ sys_approval_rules 表已创建或已存在');
  } catch (e) {
    results.push(`✗ sys_approval_rules: ${e.message}`);
  }

  // 8. 创建 approval_nodes 表（如果不存在）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS approval_nodes (
        id TEXT PRIMARY KEY,
        oid TEXT UNIQUE NOT NULL,
        workflow_oid TEXT,
        node_code TEXT,
        node_name TEXT,
        node_type TEXT,
        approver_type TEXT,
        approver_id TEXT,
        approver_name TEXT,
        timeout_hours INTEGER DEFAULT 0,
        timeout_action TEXT,
        is_required INTEGER DEFAULT 0,
        conditions TEXT,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT,
        updated_at TEXT
      )
    `);
    results.push('✓ approval_nodes 表已创建或已存在');
  } catch (e) {
    results.push(`✗ approval_nodes: ${e.message}`);
  }

  // 保存数据库
  const data = db.export();
  const bufferOut = Buffer.from(data);
  fs.writeFileSync(DB_PATH, bufferOut);

  console.log('\n========== 数据库列修复结果 ==========\n');
  results.forEach(r => console.log(r));
  console.log('\n数据库已保存！');
}

fixColumns().catch(console.error);
