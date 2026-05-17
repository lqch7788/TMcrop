/**
 * 数据库结构修复脚本 - 添加缺失的列和表
 * 支持独立运行: npx ts-node src/db/fixMissingSchema.ts
 * 或被导入调用: import { fixMissingSchema } from './fixMissingSchema'
 */

import { getDatabase, saveDatabase, initDatabase } from './index';

/**
 * 修复数据库结构 - 添加缺失的列和表
 */
export async function fixMissingSchema(): Promise<void> {
  const db = getDatabase();

  console.log('开始修复数据库结构...\n');

  // 1. 修复 positions 表 - 添加 description 和 sort_order 列
  try {
    db.run(`ALTER TABLE positions ADD COLUMN description TEXT`);
    console.log('✓ positions 表添加 description 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log('• positions.description 列已存在');
    } else {
      console.log('• positions.description:', e.message);
    }
  }
  try {
    db.run(`ALTER TABLE positions ADD COLUMN sort_order INTEGER DEFAULT 0`);
    console.log('✓ positions 表添加 sort_order 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log('• positions.sort_order 列已存在');
    } else {
      console.log('• positions.sort_order:', e.message);
    }
  }

  // 2. organizations 表已在 schema.ts 中创建，此处补充缺失列
  const orgColumnsToAdd = [
    { name: 'parent_oid', sql: 'ALTER TABLE organizations ADD COLUMN parent_oid TEXT' },
    { name: 'aid', sql: 'ALTER TABLE organizations ADD COLUMN aid TEXT' },
    { name: 'org_type', sql: "ALTER TABLE organizations ADD COLUMN org_type TEXT DEFAULT 'department'" },
    { name: 'org_relationship', sql: 'ALTER TABLE organizations ADD COLUMN org_relationship TEXT' },
    { name: 'description', sql: 'ALTER TABLE organizations ADD COLUMN description TEXT' },
    { name: 'address', sql: 'ALTER TABLE organizations ADD COLUMN address TEXT' },
    { name: 'contact_person', sql: 'ALTER TABLE organizations ADD COLUMN contact_person TEXT' },
    { name: 'contact_phone', sql: 'ALTER TABLE organizations ADD COLUMN contact_phone TEXT' },
    { name: 'sort_order', sql: 'ALTER TABLE organizations ADD COLUMN sort_order INTEGER DEFAULT 0' },
  ];
  for (const col of orgColumnsToAdd) {
    try {
      db.run(col.sql);
      console.log(`✓ organizations 表添加 ${col.name} 列`);
    } catch (addErr: any) {
      if (!addErr.message.includes('duplicate column')) {
        // 列已存在或表未创建（由 schema.ts 负责）
      }
    }
  }

  // 3. 创建 devices 表（完整结构匹配 basicData.ts 的查询和操作）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS devices (
        id TEXT PRIMARY KEY,
        oid TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        device_type TEXT,
        device_code TEXT,
        device_name TEXT,
        manufacturer TEXT,
        serial_number TEXT,
        model TEXT,
        greenhouse_oid TEXT,
        location TEXT,
        install_date TEXT,
        last_maintenance_date TEXT,
        next_maintenance_date TEXT,
        status TEXT DEFAULT 'active',
        remarks TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);
    console.log('✓ devices 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      // 表已存在，尝试添加缺失的列
      const columnsToAdd = [
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
      for (const col of columnsToAdd) {
        try {
          db.run(col.sql);
          console.log(`✓ devices 表添加 ${col.name} 列`);
        } catch (addErr: any) {
          if (!addErr.message.includes('duplicate column')) {
            // console.log(`• devices.${col.name}:`, addErr.message);
          }
        }
      }
      console.log('• devices 表已存在，已补充缺失列');
    } else {
      console.log('• devices:', e.message);
    }
  }

  // 4. 创建 sys_code_rules 表（完整结构匹配 basicData.ts 的查询和操作）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS sys_code_rules (
        id TEXT PRIMARY KEY,
        oid TEXT UNIQUE NOT NULL,
        entity_type TEXT NOT NULL,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        prefix TEXT,
        seq_length INTEGER DEFAULT 3,
        current_seq INTEGER DEFAULT 0,
        date_pattern TEXT,
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT,
        updated_at TEXT
      )
    `);
    console.log('✓ sys_code_rules 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      // 表已存在，尝试添加缺失的列
      const columnsToAdd = [
        { name: 'oid', sql: 'ALTER TABLE sys_code_rules ADD COLUMN oid TEXT' },
        { name: 'entity_type', sql: 'ALTER TABLE sys_code_rules ADD COLUMN entity_type TEXT' },
        { name: 'seq_length', sql: 'ALTER TABLE sys_code_rules ADD COLUMN seq_length INTEGER DEFAULT 3' },
        { name: 'current_seq', sql: 'ALTER TABLE sys_code_rules ADD COLUMN current_seq INTEGER DEFAULT 0' },
        { name: 'date_pattern', sql: 'ALTER TABLE sys_code_rules ADD COLUMN date_pattern TEXT' },
        { name: 'description', sql: 'ALTER TABLE sys_code_rules ADD COLUMN description TEXT' },
      ];
      for (const col of columnsToAdd) {
        try {
          db.run(col.sql);
          console.log(`✓ sys_code_rules 表添加 ${col.name} 列`);
        } catch (addErr: any) {
          if (!addErr.message.includes('duplicate column')) {
            // console.log(`• sys_code_rules.${col.name}:`, addErr.message);
          }
        }
      }
      console.log('• sys_code_rules 表已存在，已补充缺失列');
    } else {
      console.log('• sys_code_rules:', e.message);
    }
  }

  // 5. 创建 sys_dictionary_categories 表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS sys_dictionary_categories (
        id TEXT PRIMARY KEY,
        oid TEXT UNIQUE NOT NULL,
        code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        module TEXT,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT,
        updated_at TEXT
      )
    `);
    console.log('✓ sys_dictionary_categories 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      // 表已存在，尝试添加缺失的列
      const columnsToAdd = [
        { name: 'oid', sql: 'ALTER TABLE sys_dictionary_categories ADD COLUMN oid TEXT' },
        { name: 'module', sql: 'ALTER TABLE sys_dictionary_categories ADD COLUMN module TEXT' },
        { name: 'description', sql: 'ALTER TABLE sys_dictionary_categories ADD COLUMN description TEXT' },
      ];
      for (const col of columnsToAdd) {
        try {
          db.run(col.sql);
          console.log(`✓ sys_dictionary_categories 表添加 ${col.name} 列`);
        } catch (addErr: any) {
          if (!addErr.message.includes('duplicate column')) {
            // console.log(`• sys_dictionary_categories.${col.name}:`, addErr.message);
          }
        }
      }
      console.log('• sys_dictionary_categories 表已存在');
    } else {
      console.log('• sys_dictionary_categories:', e.message);
    }
  }

  // 5.1 创建 sys_approval_rules 表（匹配 basicData.ts 的查询）
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
    console.log('✓ sys_approval_rules 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('• sys_approval_rules 表已存在');
    } else {
      console.log('• sys_approval_rules:', e.message);
    }
  }

  // 6. 查找缺少 sort_number 列的表并添加
  const tablesNeedSortNumber = [
    'actions',
    'permissions',
    'roles',
    'resources'
  ];

  for (const table of tablesNeedSortNumber) {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN sort_number INTEGER DEFAULT 0`);
      console.log(`✓ ${table} 表添加 sort_number 列`);
    } catch (e: any) {
      if (e.message.includes('duplicate column') || e.message.includes('no such column')) {
        // 列已存在或表不存在
        if (e.message.includes('no such table')) {
          console.log(`• ${table} 表不存在，跳过`);
        } else {
          console.log(`• ${table}.sort_number 列已存在`);
        }
      } else {
        console.log(`• ${table}.sort_number:`, e.message);
      }
    }
  }

  // 7. 查找缺少 sort_order 列的表并添加
  const tablesNeedSortOrder = [
    'notification_channels',
    'notification_rules'
  ];

  for (const table of tablesNeedSortOrder) {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN sort_order INTEGER DEFAULT 0`);
      console.log(`✓ ${table} 表添加 sort_order 列`);
    } catch (e: any) {
      if (e.message.includes('duplicate column') || e.message.includes('no such column')) {
        if (e.message.includes('no such table')) {
          console.log(`• ${table} 表不存在，跳过`);
        } else {
          console.log(`• ${table}.sort_order 列已存在`);
        }
      } else {
        console.log(`• ${table}.sort_order:`, e.message);
      }
    }
  }

  // 7.1 为 notification_rules 表添加 conditions 列（basicData.ts 查询需要）
  try {
    db.run(`ALTER TABLE notification_rules ADD COLUMN conditions TEXT`);
    console.log('✓ notification_rules 表添加 conditions 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log('• notification_rules.conditions 列已存在');
    } else {
      console.log('• notification_rules.conditions:', e.message);
    }
  }

  // 8. 查找缺少 template_id 列的表并添加
  const tablesNeedTemplateId = [
    'notification_rules'
  ];

  for (const table of tablesNeedTemplateId) {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN template_id TEXT`);
      console.log(`✓ ${table} 表添加 template_id 列`);
    } catch (e: any) {
      if (e.message.includes('duplicate column') || e.message.includes('no such column')) {
        if (e.message.includes('no such table')) {
          console.log(`• ${table} 表不存在，跳过`);
        } else {
          console.log(`• ${table}.template_id 列已存在`);
        }
      } else {
        console.log(`• ${table}.template_id:`, e.message);
      }
    }
  }

  // 9. 创建 approval_nodes 表（basicData.ts 查询需要）
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
    console.log('✓ approval_nodes 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      console.log('• approval_nodes 表已存在');
    } else {
      console.log('• approval_nodes:', e.message);
    }
  }

  // 10. RBAC 权限系统列补建 — roles 表添加 org_oid
  try {
    db.run(`ALTER TABLE roles ADD COLUMN org_oid TEXT`);
    console.log('✓ roles 表添加 org_oid 列');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) {
      console.log('• roles.org_oid:', e.message);
    }
  }

  // 11. RBAC — processes 表添加 route/icon/is_hidden 列
  const processColumns = [
    { name: 'route', sql: 'ALTER TABLE processes ADD COLUMN route TEXT' },
    { name: 'icon', sql: 'ALTER TABLE processes ADD COLUMN icon TEXT' },
    { name: 'is_hidden', sql: 'ALTER TABLE processes ADD COLUMN is_hidden INTEGER DEFAULT 0' },
  ];
  for (const col of processColumns) {
    try {
      db.run(col.sql);
      console.log(`✓ processes 表添加 ${col.name} 列`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        console.log(`• processes.${col.name}:`, e.message);
      }
    }
  }

  // 12. 创建 roles_data_authority 表（角色-组织数据权限，schema.ts 负责优先创建）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS roles_data_authority (
        id TEXT PRIMARY KEY,
        role_oid TEXT NOT NULL,
        org_oid TEXT NOT NULL,
        created_at TEXT,
        UNIQUE(role_oid, org_oid)
      )
    `);
    console.log('✓ roles_data_authority 表创建成功');
  } catch (e: any) {
    console.log('• roles_data_authority:', e.message);
  }

  // 13. 创建 users_authority 表（用户特殊权限覆盖）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS users_authority (
        id TEXT PRIMARY KEY,
        user_oid TEXT NOT NULL,
        process_oid TEXT NOT NULL,
        action_oid TEXT NOT NULL,
        value INTEGER DEFAULT 1,
        created_at TEXT,
        updated_at TEXT,
        UNIQUE(user_oid, process_oid, action_oid)
      )
    `);
    console.log('✓ users_authority 表创建成功');
  } catch (e: any) {
    console.log('• users_authority:', e.message);
  }

  // 14. 创建 projects 表（多项目/APP 配置）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        project_name TEXT UNIQUE NOT NULL,
        project_label TEXT,
        process_table TEXT DEFAULT 'processes',
        action_table TEXT DEFAULT 'actions',
        role_authority_table TEXT DEFAULT 'roles_authority',
        user_authority_table TEXT DEFAULT 'users_authority',
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT,
        updated_at TEXT
      )
    `);
    console.log('✓ projects 表创建成功');
  } catch (e: any) {
    console.log('• projects:', e.message);
  }

  // V10.0: IoT设备白名单表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS iot_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL UNIQUE,
        device_name TEXT NOT NULL,
        api_key TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        create_time TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    console.log('✓ iot_devices 表创建成功');
  } catch (e: any) {
    console.log('• iot_devices:', e.message);
  }

  saveDatabase();
  console.log('\n数据库结构修复完成！');
}

// 独立运行时执行
async function main() {
  await initDatabase();
  await fixMissingSchema();
}

main().catch(console.error);
