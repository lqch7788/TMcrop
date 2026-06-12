/**
 * 数据库结构修复脚本 - 添加缺失的列和表
 * 支持独立运行: npx ts-node src/db/fixMissingSchema.ts
 * 或被导入调用: import { fixMissingSchema } from './fixMissingSchema'
 */

import { getDatabase, saveDatabase, initDatabase } from './index';
import { seedLog } from '../lib/seedLogger';

/**
 * 修复数据库结构 - 添加缺失的列和表
 */
export async function fixMissingSchema(): Promise<void> {
  const db = getDatabase();

  seedLog.info('开始修复数据库结构...\n');

  // 1. 修复 positions 表 - 添加 description 和 sort_order 列
  try {
    db.run(`ALTER TABLE positions ADD COLUMN description TEXT`);
    seedLog.info('✓ positions 表添加 description 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• positions.description 列已存在');
    } else {
      seedLog.skip('• positions.description:', e.message);
    }
  }
  try {
    db.run(`ALTER TABLE positions ADD COLUMN sort_order INTEGER DEFAULT 0`);
    seedLog.info('✓ positions 表添加 sort_order 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• positions.sort_order 列已存在');
    } else {
      seedLog.skip('• positions.sort_order:', e.message);
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
    { name: 'department_id', sql: 'ALTER TABLE organizations ADD COLUMN department_id TEXT' },
    { name: 'department_name', sql: 'ALTER TABLE organizations ADD COLUMN department_name TEXT' },
  ];
  for (const col of orgColumnsToAdd) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ organizations 表添加 ${col.name} 列`);
    } catch (addErr: any) {
      if (!addErr.message.includes('duplicate column')) {
        // 列已存在或表未创建（由 schema.ts 负责）
      }
    }
  }

  // 2.5 数据修复：为没有 department_id 的部门类型组织自动补齐
  try {
    const orgsToFix = db.exec(`
      SELECT oid, name, parent_oid, contact_person, description
      FROM organizations
      WHERE org_type = 'department' AND (department_id IS NULL OR department_id = '') AND status = 'active'
    `);
    if (orgsToFix.length > 0 && orgsToFix[0].values.length > 0) {
      const cols = orgsToFix[0].columns;
      const oidIdx = cols.indexOf('oid');
      const nameIdx = cols.indexOf('name');
      const parentIdx = cols.indexOf('parent_oid');
      const contactIdx = cols.indexOf('contact_person');
      const descIdx = cols.indexOf('description');
      const now = new Date().toISOString();
      for (const row of orgsToFix[0].values) {
        const oid = row[oidIdx] as string;
        const name = row[nameIdx] as string;
        const parentOid = (row[parentIdx] || '') as string;
        const contactPerson = (row[contactIdx] || '') as string;
        const description = (row[descIdx] || '') as string;
        // 检查是否已有同名部门（防重复）
        const dupCheck = db.prepare(`SELECT id FROM departments WHERE name = ? AND status = 'active'`);
        dupCheck.bind([name]);
        if (dupCheck.step()) {
          // 已有同名部门，直接关联
          const existingId = (dupCheck.getAsObject()).id as string;
          db.run('UPDATE organizations SET department_id = ?, department_name = ? WHERE oid = ?', [existingId, name, oid]);
          dupCheck.free();
          continue;
        }
        dupCheck.free();
        const deptId = `DEPT_${Date.now()}`;
        // 回填 organizations.department_id
        db.run('UPDATE organizations SET department_id = ?, department_name = ? WHERE oid = ?', [deptId, name, oid]);
        // 创建对应部门记录
        db.run(`
          INSERT OR IGNORE INTO departments (id, oid, name, code, parent_oid, manager_id, manager_name, sort_number, description, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
        `, [deptId, deptId, name, deptId, parentOid, '', contactPerson, 0, description, now, now]);
        seedLog.info(`✓ 回填组织 "${name}" → 部门 ${deptId}`);
      }
    }
  } catch (fixErr: any) {
    seedLog.info('回填 department_id 数据修复跳过:', fixErr.message);
  }

  // 2.6 数据修复：回填部门编码（code），根据部门名称映射
  try {
    const nameCodeMap: Record<string, string> = {
      '生产部': 'DEPT_PROD',
      '技术部': 'DEPT_TECH',
      '仓储部': 'DEPT_WH',
      '财务部': 'DEPT_FIN',
      '综合办': 'DEPT_ADMIN',
      '后勤部': 'DEPT_LOG',
    };
    const deptsToFix = db.exec(`SELECT id, oid, name, code FROM departments`);
    if (deptsToFix.length > 0 && deptsToFix[0].values.length > 0) {
      const cols = deptsToFix[0].columns;
      const idIdx = cols.indexOf('id');
      const nameIdx = cols.indexOf('name');
      const codeIdx = cols.indexOf('code');
      for (const row of deptsToFix[0].values) {
        const id = row[idIdx] as string;
        const name = row[nameIdx] as string;
        const currentCode = (row[codeIdx] || '') as string;
        const mappedCode = nameCodeMap[name];
        // 仅当有映射且编码不匹配时更新
        if (mappedCode && mappedCode !== currentCode) {
          db.run('UPDATE departments SET code = ? WHERE id = ?', [mappedCode, id]);
          // 同步更新关联组织的 department_id（组织用 department_id 关联部门记录）
          db.run('UPDATE organizations SET department_id = ? WHERE department_id = ?', [mappedCode, currentCode || id]);
          seedLog.info(`✓ 回填部门编码: "${name}" → ${mappedCode}`);
        }
      }
    }
  } catch (codeFixErr: any) {
    seedLog.info('回填部门编码跳过:', codeFixErr.message);
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
    seedLog.info('✓ devices 表创建成功');
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
          seedLog.info(`✓ devices 表添加 ${col.name} 列`);
        } catch (addErr: any) {
          if (!addErr.message.includes('duplicate column')) {
            // seedLog.skip(`• devices.${col.name}:`, addErr.message);
          }
        }
      }
      seedLog.skip('• devices 表已存在，已补充缺失列');
    } else {
      seedLog.skip('• devices:', e.message);
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
    seedLog.info('✓ sys_code_rules 表创建成功');
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
          seedLog.info(`✓ sys_code_rules 表添加 ${col.name} 列`);
        } catch (addErr: any) {
          if (!addErr.message.includes('duplicate column')) {
            // seedLog.skip(`• sys_code_rules.${col.name}:`, addErr.message);
          }
        }
      }
      seedLog.skip('• sys_code_rules 表已存在，已补充缺失列');
    } else {
      seedLog.skip('• sys_code_rules:', e.message);
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
    seedLog.info('✓ sys_dictionary_categories 表创建成功');
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
          seedLog.info(`✓ sys_dictionary_categories 表添加 ${col.name} 列`);
        } catch (addErr: any) {
          if (!addErr.message.includes('duplicate column')) {
            // seedLog.skip(`• sys_dictionary_categories.${col.name}:`, addErr.message);
          }
        }
      }
      seedLog.skip('• sys_dictionary_categories 表已存在');
    } else {
      seedLog.skip('• sys_dictionary_categories:', e.message);
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
    seedLog.info('✓ sys_approval_rules 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      seedLog.skip('• sys_approval_rules 表已存在');
    } else {
      seedLog.skip('• sys_approval_rules:', e.message);
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
      seedLog.info(`✓ ${table} 表添加 sort_number 列`);
    } catch (e: any) {
      if (e.message.includes('duplicate column') || e.message.includes('no such column')) {
        // 列已存在或表不存在
        if (e.message.includes('no such table')) {
          seedLog.skip(`• ${table} 表不存在，跳过`);
        } else {
          seedLog.skip(`• ${table}.sort_number 列已存在`);
        }
      } else {
        seedLog.skip(`• ${table}.sort_number:`, e.message);
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
      seedLog.info(`✓ ${table} 表添加 sort_order 列`);
    } catch (e: any) {
      if (e.message.includes('duplicate column') || e.message.includes('no such column')) {
        if (e.message.includes('no such table')) {
          seedLog.skip(`• ${table} 表不存在，跳过`);
        } else {
          seedLog.skip(`• ${table}.sort_order 列已存在`);
        }
      } else {
        seedLog.skip(`• ${table}.sort_order:`, e.message);
      }
    }
  }

  // 7.0 为 purchase_plans 表添加 approval_code / approved_at 列（审批联动需要）
  try {
    db.run(`ALTER TABLE purchase_plans ADD COLUMN approval_code TEXT`);
    db.run(`ALTER TABLE purchase_plans ADD COLUMN approved_at TEXT`);
    seedLog.info('✓ purchase_plans 表添加 approval_code / approved_at 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• purchase_plans.approval_code / approved_at 列已存在');
    } else {
      seedLog.skip('• purchase_plans 列添加失败:', e.message);
    }
  }
  // 7.0.1 为 purchase_plans 表添加 execution_status 列（采购执行状态：待执行/采购中/已完成/已取消）
  try {
    db.run(`ALTER TABLE purchase_plans ADD COLUMN execution_status TEXT DEFAULT 'pending_execution'`);
    seedLog.info('✓ purchase_plans 表添加 execution_status 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• purchase_plans.execution_status 列已存在');
    } else {
      seedLog.skip('• purchase_plans.execution_status:', e.message);
    }
  }
  // 7.0.2 为 purchase_plans 表添加 otherBatchReason 列（关联批次=其他时的说明）
  try {
    db.run(`ALTER TABLE purchase_plans ADD COLUMN otherBatchReason TEXT`);
    seedLog.info('✓ purchase_plans 表添加 otherBatchReason 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• purchase_plans.otherBatchReason 列已存在');
    } else {
      seedLog.skip('• purchase_plans.otherBatchReason:', e.message);
    }
  }
  try {
    db.run(`ALTER TABLE dictionaries ADD COLUMN display_name TEXT`);
    seedLog.info('✓ dictionaries 表添加 display_name 列');
    // 同步已有数据：display_name 初始值 = dict_label
    db.run(`UPDATE dictionaries SET display_name = dict_label WHERE display_name IS NULL OR display_name = ''`);
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• dictionaries.display_name 列已存在');
    } else {
      seedLog.skip('• dictionaries.display_name:', e.message);
    }
  }

  // 7.1 为 notification_rules 表添加 conditions 列（basicData.ts 查询需要）
  try {
    db.run(`ALTER TABLE notification_rules ADD COLUMN conditions TEXT`);
    seedLog.info('✓ notification_rules 表添加 conditions 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• notification_rules.conditions 列已存在');
    } else {
      seedLog.skip('• notification_rules.conditions:', e.message);
    }
  }

  // 8. 查找缺少 template_id 列的表并添加
  const tablesNeedTemplateId = [
    'notification_rules'
  ];

  for (const table of tablesNeedTemplateId) {
    try {
      db.run(`ALTER TABLE ${table} ADD COLUMN template_id TEXT`);
      seedLog.info(`✓ ${table} 表添加 template_id 列`);
    } catch (e: any) {
      if (e.message.includes('duplicate column') || e.message.includes('no such column')) {
        if (e.message.includes('no such table')) {
          seedLog.skip(`• ${table} 表不存在，跳过`);
        } else {
          seedLog.skip(`• ${table}.template_id 列已存在`);
        }
      } else {
        seedLog.skip(`• ${table}.template_id:`, e.message);
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
    seedLog.info('✓ approval_nodes 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) {
      seedLog.skip('• approval_nodes 表已存在');
    } else {
      seedLog.skip('• approval_nodes:', e.message);
    }
  }

  // 10. RBAC 权限系统列补建 — roles 表添加 org_oid
  try {
    db.run(`ALTER TABLE roles ADD COLUMN org_oid TEXT`);
    seedLog.info('✓ roles 表添加 org_oid 列');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) {
      seedLog.skip('• roles.org_oid:', e.message);
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
      seedLog.info(`✓ processes 表添加 ${col.name} 列`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        seedLog.skip(`• processes.${col.name}:`, e.message);
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
    seedLog.info('✓ roles_data_authority 表创建成功');
  } catch (e: any) {
    seedLog.skip('• roles_data_authority:', e.message);
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
    seedLog.info('✓ users_authority 表创建成功');
  } catch (e: any) {
    seedLog.skip('• users_authority:', e.message);
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
    seedLog.info('✓ projects 表创建成功');
  } catch (e: any) {
    seedLog.skip('• projects:', e.message);
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
    seedLog.info('✓ iot_devices 表创建成功');
  } catch (e: any) {
    seedLog.skip('• iot_devices:', e.message);
  }

  // V10.1: IoT传感器表（iotMonitor.ts 路由使用）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS iot_sensors (
        id TEXT PRIMARY KEY,
        greenhouse_id TEXT,
        sensor_id TEXT,
        type TEXT,
        type_name TEXT,
        status TEXT DEFAULT 'online',
        value TEXT,
        unit TEXT,
        last_update TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ iot_sensors 表创建成功');
  } catch (e: any) {
    seedLog.skip('• iot_sensors:', e.message);
  }

  // 18.5 确保 material_code_categories 表存在
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS material_code_categories (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL,
        name TEXT NOT NULL,
        name_en TEXT DEFAULT '',
        parent_code TEXT DEFAULT '',
        level TEXT NOT NULL DEFAULT 'big',
        rule_type TEXT DEFAULT 'material',
        sort_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT,
        updated_at TEXT
      )
    `);
    seedLog.info('✓ material_code_categories 表创建成功');
  } catch (e: any) {
    seedLog.skip('• material_code_categories:', e.message);
  }

  // 19. material_code_categories 表添加 rule_type 列（区分物料/供应商编码规则）
  try {
    db.run(`ALTER TABLE material_code_categories ADD COLUMN rule_type TEXT DEFAULT 'material'`);
    seedLog.info('✓ material_code_categories 表添加 rule_type 列');
    // SQLite ALTER TABLE ADD COLUMN 不向已有行填充默认值，需手动更新 NULL 行
    const nullCount = db.exec(`SELECT COUNT(*) as cnt FROM material_code_categories WHERE rule_type IS NULL`);
    const cnt = nullCount.length > 0 && nullCount[0].values.length > 0 ? Number(nullCount[0].values[0][0] ?? 0) : 0;
    if (cnt > 0) {
      db.run(`UPDATE material_code_categories SET rule_type = 'material' WHERE rule_type IS NULL`);
      seedLog.info(`✓ 已更新 ${cnt} 条旧记录的 rule_type = 'material'`);
    }
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) {
      seedLog.skip('• material_code_categories.rule_type:', e.message);
    }
  }

  // 20. 创建 bases 表（基地主数据 — 基地空间架构 V1.0）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS bases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        code TEXT,
        name TEXT NOT NULL,
        company_oid TEXT NOT NULL,
        company_name TEXT,
        area REAL DEFAULT 0,
        unit TEXT DEFAULT '亩',
        province TEXT,
        city TEXT,
        lng REAL DEFAULT 0,
        lat REAL DEFAULT 0,
        manager TEXT,
        phone TEXT,
        soil_type TEXT,
        ph REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        intro TEXT,
        greenhouse_count INTEGER DEFAULT 0,
        field_area REAL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime')),
        deleted_at TEXT
      )
    `);
    seedLog.info('✓ bases 表创建成功');
  } catch (e: any) {
    seedLog.skip('• bases:', e.message);
  }

  // 21. ALTER greenhouses 表添加设施管理新字段（基地空间架构 V1.0）
  const ghColumnsToAdd = [
    { name: 'planting_method', sql: 'ALTER TABLE greenhouses ADD COLUMN planting_method TEXT' },
    { name: 'purpose', sql: 'ALTER TABLE greenhouses ADD COLUMN purpose TEXT' },
    { name: 'current_crop', sql: 'ALTER TABLE greenhouses ADD COLUMN current_crop TEXT' },
    { name: 'current_variety', sql: 'ALTER TABLE greenhouses ADD COLUMN current_variety TEXT' },
    { name: 'current_season_code', sql: 'ALTER TABLE greenhouses ADD COLUMN current_season_code TEXT' },
    { name: 'unit', sql: "ALTER TABLE greenhouses ADD COLUMN unit TEXT DEFAULT '亩'" },
    { name: 'description', sql: "ALTER TABLE greenhouses ADD COLUMN description TEXT" },
  ];
  for (const col of ghColumnsToAdd) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ greenhouses 表添加 ${col.name} 列`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        seedLog.skip(`• greenhouses.${col.name}:`, e.message);
      }
    }
  }
  // 同时扩展 zones 表（如果缺少字段）
  const zoneColumnsToAdd = [
    { name: 'description', sql: 'ALTER TABLE zones ADD COLUMN description TEXT' },
    { name: 'greenhouse_name', sql: 'ALTER TABLE zones ADD COLUMN greenhouse_name TEXT' },
  ];
  for (const col of zoneColumnsToAdd) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ zones 表添加 ${col.name} 列`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        // 可能已存在
      }
    }
  }

  // 22. 创建 planting_records 表（种植季记录 — 基地空间架构 V1.0）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS planting_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        facility_oid TEXT NOT NULL,
        block_oid TEXT,
        season_code TEXT NOT NULL,
        crop_variety_oid TEXT,
        crop_name TEXT,
        variety_name TEXT,
        start_date TEXT,
        end_date TEXT,
        status TEXT DEFAULT 'planting',
        yield_amount REAL,
        yield_unit TEXT DEFAULT 'kg',
        quality_grade TEXT,
        notes TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime')),
        deleted_at TEXT
      )
    `);
    seedLog.info('✓ planting_records 表创建成功');
    // 创建索引
    try { db.run('CREATE INDEX IF NOT EXISTS idx_pr_facility ON planting_records(facility_oid)'); } catch {}
    try { db.run('CREATE INDEX IF NOT EXISTS idx_pr_season ON planting_records(season_code)'); } catch {}
    try { db.run('CREATE INDEX IF NOT EXISTS idx_pr_status ON planting_records(status)'); } catch {}
  } catch (e: any) {
    seedLog.skip('• planting_records:', e.message);
  }

  // ========== Phase 0: iAGS 系统设置集成 — 新增数据库表 ==========

  // 23. 创建 farm_partitions 表（分区管理 — iAGS GreenHouseArea）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS farm_partitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        parent_oid TEXT,
        name TEXT NOT NULL,
        area_type TEXT NOT NULL DEFAULT 'greenhouse',
        greenhouse_type TEXT,
        area REAL DEFAULT 0,
        area_unit TEXT DEFAULT '亩',
        manager_oid TEXT,
        manager_name TEXT,
        hmi_device_oid TEXT,
        sensor_config TEXT,
        camera_config TEXT,
        water_fertilizer_config TEXT,
        address TEXT,
        description TEXT,
        sort_order INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ farm_partitions 表创建成功（分区管理）');
  } catch (e: any) {
    seedLog.skip('• farm_partitions:', e.message);
  }

  // 24. 创建 device_systems 表（系统管理 — iAGS deviceSystem）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS device_systems (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        system_code TEXT NOT NULL,
        system_name TEXT NOT NULL,
        system_type TEXT,
        idc_oid TEXT,
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ device_systems 表创建成功（系统管理）');
  } catch (e: any) {
    seedLog.skip('• device_systems:', e.message);
  }

  // 25. 创建 area_system_mappings 表（区域系统 — iAGS AreaSystem）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS area_system_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        partition_oid TEXT NOT NULL,
        system_oid TEXT NOT NULL,
        device_oid TEXT,
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        UNIQUE(partition_oid, system_oid)
      )
    `);
    seedLog.info('✓ area_system_mappings 表创建成功（区域系统）');
  } catch (e: any) {
    seedLog.skip('• area_system_mappings:', e.message);
  }

  // 26. 创建 camera_devices 表（视频管理 — iAGS Camera）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS camera_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        camera_name TEXT NOT NULL,
        camera_code TEXT,
        rtsp_url TEXT,
        http_url TEXT,
        partition_oid TEXT,
        greenhouse_oid TEXT,
        brand TEXT,
        model TEXT,
        username TEXT,
        password TEXT,
        channel_count INTEGER DEFAULT 1,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ camera_devices 表创建成功（视频管理）');
  } catch (e: any) {
    seedLog.skip('• camera_devices:', e.message);
  }

  // 27. 创建 energy_configs 表（能耗管理 — iAGS AreaEnery）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS energy_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        partition_oid TEXT NOT NULL,
        energy_type TEXT NOT NULL,
        device_oid TEXT,
        device_name TEXT,
        meter_code TEXT,
        unit TEXT DEFAULT 'kWh',
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ energy_configs 表创建成功（能耗管理）');
  } catch (e: any) {
    seedLog.skip('• energy_configs:', e.message);
  }

  // 28. 创建 alarm_level_configs 表（警报级别配置 — iAGS Warning）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS alarm_level_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        level INTEGER NOT NULL UNIQUE,
        level_name TEXT NOT NULL,
        notify_email INTEGER DEFAULT 0,
        notify_sms INTEGER DEFAULT 0,
        notify_phone INTEGER DEFAULT 0,
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ alarm_level_configs 表创建成功（警报级别）');
  } catch (e: any) {
    seedLog.skip('• alarm_level_configs:', e.message);
  }

  // 29. 创建 alarm_contacts 表（警报联系人 — iAGS Warning）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS alarm_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        level INTEGER NOT NULL,
        contact_name TEXT NOT NULL,
        contact_info TEXT NOT NULL,
        contact_type TEXT NOT NULL DEFAULT 'email',
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ alarm_contacts 表创建成功（警报联系人）');
  } catch (e: any) {
    seedLog.skip('• alarm_contacts:', e.message);
  }

  // 30. 创建 water_fertilizer_configs 表（水肥一体机 — iAGS WaterFertilizer）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS water_fertilizer_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        partition_oid TEXT NOT NULL,
        device_oid TEXT,
        device_code TEXT,
        machine_addr TEXT,
        mac_addr TEXT,
        start_time TEXT,
        end_time TEXT,
        interval_value INTEGER DEFAULT 1,
        interval_unit TEXT DEFAULT 'day',
        mix_ratio_a REAL DEFAULT 0,
        mix_ratio_b REAL DEFAULT 0,
        mix_ratio_c REAL DEFAULT 0,
        total_water REAL DEFAULT 0,
        water_unit TEXT DEFAULT 'L',
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ water_fertilizer_configs 表创建成功（水肥一体机）');
  } catch (e: any) {
    seedLog.skip('• water_fertilizer_configs:', e.message);
  }

  // 31. 创建 debug_logs 表（工程调试 — iAGS ProjectDebug）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS debug_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        debug_type TEXT NOT NULL,
        test_target TEXT,
        test_result TEXT,
        error_message TEXT,
        duration_ms INTEGER,
        created_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ debug_logs 表创建成功（工程调试）');
  } catch (e: any) {
    seedLog.skip('• debug_logs:', e.message);
  }

  // 32. 创建 plant_settings 表（种植设置 — iAGS Plantset）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS plant_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        setting_key TEXT NOT NULL,
        setting_value TEXT,
        crop_variety_oid TEXT,
        icon_url TEXT,
        description TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ plant_settings 表创建成功（种植设置）');
  } catch (e: any) {
    seedLog.skip('• plant_settings:', e.message);
  }

  // 33. 创建 device_distributions 表（设备分配 — iAGS DeviceDistribution 预留端口）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS device_distributions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        oid TEXT UNIQUE NOT NULL,
        device_name TEXT NOT NULL,
        device_code TEXT,
        site_name TEXT,
        area_name TEXT,
        device_type TEXT,
        motor_name TEXT,
        sort_order INTEGER DEFAULT 0,
        allow_runtime TEXT,
        rest_time TEXT,
        initial_status TEXT,
        circuit TEXT,
        slave_devices TEXT,
        start_time TEXT,
        show_curve INTEGER DEFAULT 0,
        specs TEXT,
        remarks TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ device_distributions 表创建成功（设备分配）');
  } catch (e: any) {
    seedLog.skip('• device_distributions:', e.message);
  }

  // 34. fertilizer_records 表添加 unit 列
  try {
    db.run(`ALTER TABLE fertilizer_records ADD COLUMN unit TEXT DEFAULT '千克'`);
    seedLog.info('✓ fertilizer_records 表添加 unit 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• fertilizer_records.unit 列已存在');
    } else {
      seedLog.skip('• fertilizer_records.unit:', e.message);
    }
  }

  // 34.1 G11 V1.1: fertilizer_records 表添加 fertilizer_id 列（关联肥料库）
  try {
    db.run(`ALTER TABLE fertilizer_records ADD COLUMN fertilizer_id TEXT`);
    seedLog.info('✓ fertilizer_records 表添加 fertilizer_id 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• fertilizer_records.fertilizer_id 列已存在');
    } else {
      seedLog.skip('• fertilizer_records.fertilizer_id:', e.message);
    }
  }

  // 35. production_plans 表添加 planting_area_unit 列（种植面积单位）
  try {
    db.run(`ALTER TABLE production_plans ADD COLUMN planting_area_unit TEXT DEFAULT 'm²'`);
    seedLog.info('✓ production_plans 表添加 planting_area_unit 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• production_plans.planting_area_unit 列已存在');
    } else {
      seedLog.skip('• production_plans.planting_area_unit:', e.message);
    }
  }

  // 36. production_plans 表添加关联订单字段（生产计划可关联订单）
  try {
    db.run(`ALTER TABLE production_plans ADD COLUMN order_id TEXT`);
    seedLog.info('✓ production_plans 表添加 order_id 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• production_plans.order_id 列已存在');
    } else {
      seedLog.skip('• production_plans.order_id:', e.message);
    }
  }
  try {
    db.run(`ALTER TABLE production_plans ADD COLUMN order_code TEXT`);
    seedLog.info('✓ production_plans 表添加 order_code 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• production_plans.order_code 列已存在');
    } else {
      seedLog.skip('• production_plans.order_code:', e.message);
    }
  }

  // 36.5 production_plans 表添加 execution_status 执行状态字段
  try {
    db.run(`ALTER TABLE production_plans ADD COLUMN execution_status TEXT DEFAULT 'pending_execution'`);
    seedLog.info('✓ production_plans 表添加 execution_status 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• production_plans.execution_status 列已存在');
    } else {
      seedLog.skip('• production_plans.execution_status:', e.message);
    }
  }

  // 36.6 production_plans 表添加 greenhouse_id 字段（种植区域ID）
  try {
    db.run(`ALTER TABLE production_plans ADD COLUMN greenhouse_id TEXT`);
    seedLog.info('✓ production_plans 表添加 greenhouse_id 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• production_plans.greenhouse_id 列已存在');
    } else {
      seedLog.skip('• production_plans.greenhouse_id:', e.message);
    }
  }

  // 2026-06-05: production_plans 表添加 crop_code 字段（修复弹窗作物品种显示空的根因）
  // 此前只存 cropName/variety/cropVariety，没有 cropCode；现统一加 cropCode 用于精准关联
  try {
    db.run(`ALTER TABLE production_plans ADD COLUMN crop_code TEXT`);
    seedLog.info('✓ production_plans 表添加 crop_code 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• production_plans.crop_code 列已存在');
    } else {
      seedLog.skip('• production_plans.crop_code:', e.message);
    }
  }

  // 2026-06-05: 数据迁移 — 给存量 production_plans 灌 crop_code
  // 优先路径：通过 plantings 表（plantings.crop_code 通过 production_plan_code 关联）
  // 兜底路径：直接通过 production_plans.crop_name + crop_variety 查 crop_varieties 表
  try {
    db.run(`
      UPDATE production_plans
      SET crop_code = (
        SELECT p.crop_code FROM plantings p
        WHERE p.production_plan_code = production_plans.plan_code
          AND p.crop_code IS NOT NULL AND p.crop_code != ''
        LIMIT 1
      )
      WHERE (crop_code IS NULL OR crop_code = '')
        AND EXISTS (
          SELECT 1 FROM plantings p
          WHERE p.production_plan_code = production_plans.plan_code
            AND p.crop_code IS NOT NULL AND p.crop_code != ''
        )
    `);
    seedLog.info('✓ 通过 plantings 关联为存量生产计划灌入 crop_code');
  } catch (e: any) {
    seedLog.skip('• 数据迁移（plantings→production_plans）失败:', e.message);
  }

  try {
    // 兜底：未灌上的记录用 crop_name + crop_variety 反查 crop_varieties
    // 仅匹配 variety_name 命中，subVariety1Name 命中留给前端 useMemo 兜底
    db.run(`
      UPDATE production_plans
      SET crop_code = (
        SELECT cv.crop_code FROM crop_varieties cv
        WHERE cv.variety_name = production_plans.crop_variety
           OR cv.crop_code = production_plans.crop_name
        LIMIT 1
      )
      WHERE (crop_code IS NULL OR crop_code = '')
        AND EXISTS (
          SELECT 1 FROM crop_varieties cv
          WHERE cv.variety_name = production_plans.crop_variety
             OR cv.crop_code = production_plans.crop_name
        )
    `);
    seedLog.info('✓ 通过 crop_varieties 表兜底为存量生产计划灌入 crop_code');
  } catch (e: any) {
    seedLog.skip('• 数据迁移（crop_varieties→production_plans）失败:', e.message);
  }

  // 2026-06-05: 数据迁移 — 给 plant_labels 空 seedling_id 关联到真实 seedlings
  // 原因：种子数据漏填 seedling_id，导致育苗管理→标签管理弹窗按 seedling_id 过滤时 0 条匹配
  // 兜底策略：按 plant_labels.id 顺序 round-robin 分配到现有 seedlings
  try {
    db.run(`
      UPDATE plant_labels
      SET seedling_id = (
        SELECT id FROM seedlings
        WHERE id IS NOT NULL AND id != ''
        ORDER BY create_time, id
        LIMIT 1 OFFSET (
          SELECT (ROW_NUMBER() OVER (ORDER BY id) - 1) % (SELECT COUNT(*) FROM seedlings WHERE id IS NOT NULL AND id != '')
          FROM plant_labels pl2
          WHERE pl2.id = plant_labels.id
        )
      )
      WHERE (seedling_id IS NULL OR seedling_id = '')
        AND EXISTS (SELECT 1 FROM seedlings WHERE id IS NOT NULL AND id != '')
    `);
    seedLog.info('✓ plant_labels 存量空 seedling_id 已 round-robin 关联到现有 seedlings');
  } catch (e: any) {
    seedLog.skip('• 数据迁移（plant_labels→seedlings）失败:', e.message);
  }

  // 37. farm_tasks 表添加缺失的关联字段（问题分派/巡查关联）
  const farmTaskColumnsToAdd = [
    { name: 'source_problem_id', sql: 'ALTER TABLE farm_tasks ADD COLUMN source_problem_id TEXT' },
    { name: 'source_inspection_id', sql: 'ALTER TABLE farm_tasks ADD COLUMN source_inspection_id TEXT' },
    { name: 'source_id', sql: 'ALTER TABLE farm_tasks ADD COLUMN source_id TEXT' },
    { name: 'source_code', sql: 'ALTER TABLE farm_tasks ADD COLUMN source_code TEXT' },
  ];
  for (const col of farmTaskColumnsToAdd) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ farm_tasks 表添加 ${col.name} 列`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        seedLog.skip(`• farm_tasks.${col.name}:`, e.message);
      }
    }
  }

  // 37. harvest_records 表添加缺失的列
  const harvestColumnsToAdd = [
    { name: 'greenhouse_id', sql: 'ALTER TABLE harvest_records ADD COLUMN greenhouse_id TEXT' },
    { name: 'warehouse_id', sql: 'ALTER TABLE harvest_records ADD COLUMN warehouse_id TEXT' },
    { name: 'auditor_id', sql: 'ALTER TABLE harvest_records ADD COLUMN auditor_id TEXT' },
    { name: 'harvester_ids', sql: 'ALTER TABLE harvest_records ADD COLUMN harvester_ids TEXT' },
    { name: 'harvester_names', sql: 'ALTER TABLE harvest_records ADD COLUMN harvester_names TEXT' },
    { name: 'inbound_type', sql: 'ALTER TABLE harvest_records ADD COLUMN inbound_type TEXT' },
    { name: 'batch_code', sql: 'ALTER TABLE harvest_records ADD COLUMN batch_code TEXT' },
    // V3.0 补漏：FIELD_MAP 写了但 schema 漏建的列
    { name: 'planting_mode', sql: 'ALTER TABLE harvest_records ADD COLUMN planting_mode TEXT' },     // 种植模式（FIELD_MAP 第 37 行）
    { name: 'target_yield', sql: 'ALTER TABLE harvest_records ADD COLUMN target_yield REAL DEFAULT 0' }, // 目标产量（FIELD_MAP 第 38 行）
    { name: 'harvest_area', sql: 'ALTER TABLE harvest_records ADD COLUMN harvest_area REAL DEFAULT 0' },   // 采收面积（FIELD_MAP 第 39 行）
    // V3.1 1:N 产品明细：1 条主单 + products JSON 数组存 N 个产品（修复"主单被拆成 N 条"bug）
    { name: 'products', sql: 'ALTER TABLE harvest_records ADD COLUMN products TEXT' },                 // 产品明细 JSON 数组字符串
    // 2026-06-04: 软删除列 — 修复"用户删除后重启被 seed 复活"bug。删除时只标 deleted_at，物理行保留
    { name: 'deleted_at', sql: 'ALTER TABLE harvest_records ADD COLUMN deleted_at TEXT' },
  ];
  for (const col of harvestColumnsToAdd) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ harvest_records 表添加 ${col.name} 列`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        // seedLog.skip(`• harvest_records.${col.name}:`, e.message);
      }
    }
  }

  // 38. temp_tasks 表添加状态流转所需列（与农事任务流程一致）
  const tempTaskColumnsToAdd = [
    { name: 'start_time', sql: 'ALTER TABLE temp_tasks ADD COLUMN start_time TEXT' },
    { name: 'accepted_at', sql: 'ALTER TABLE temp_tasks ADD COLUMN accepted_at TEXT' },
    { name: 'completed_at', sql: 'ALTER TABLE temp_tasks ADD COLUMN completed_at TEXT' },
    { name: 'version', sql: 'ALTER TABLE temp_tasks ADD COLUMN version INTEGER DEFAULT 1' },
    { name: 'assigner_id', sql: 'ALTER TABLE temp_tasks ADD COLUMN assigner_id TEXT' },
    { name: 'assigner_name', sql: 'ALTER TABLE temp_tasks ADD COLUMN assigner_name TEXT' },
    { name: 'source_type', sql: 'ALTER TABLE temp_tasks ADD COLUMN source_type TEXT DEFAULT \'tempTask\'' },
    { name: 'dispatch_mode', sql: 'ALTER TABLE temp_tasks ADD COLUMN dispatch_mode TEXT DEFAULT \'tempTask\'' },
    { name: 'required_feedback', sql: 'ALTER TABLE temp_tasks ADD COLUMN required_feedback TEXT DEFAULT \'[]\'' },
  ];
  for (const col of tempTaskColumnsToAdd) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ temp_tasks 表添加 ${col.name} 列`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        seedLog.skip(`• temp_tasks.${col.name}:`, e.message);
      }
    }
  }

  // V12.0: 病虫害防治管理表（如果从旧版本升级）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS pesticide_library (
        id TEXT PRIMARY KEY,
        pesticide_code TEXT NOT NULL UNIQUE,
        pesticide_name TEXT NOT NULL,
        control_type TEXT NOT NULL,
        function_desc TEXT,
        taboo_desc TEXT,
        target_pests TEXT,
        status TEXT DEFAULT 'active',
        create_time TEXT DEFAULT (datetime('now','localtime')),
        update_time TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ pesticide_library 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) seedLog.skip('• pesticide_library 已存在');
    else seedLog.error('pesticide_library:', e.message);
  }

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS pesticide_specs (
        id TEXT PRIMARY KEY,
        pesticide_id TEXT NOT NULL,
        spec_content TEXT,
        formulation TEXT,
        manufacturer TEXT,
        suggested_dosage TEXT,
        suggested_ratio TEXT,
        dosage_unit TEXT,
        status TEXT DEFAULT 'active',
        create_time TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ pesticide_specs 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) seedLog.skip('• pesticide_specs 已存在');
    else seedLog.error('pesticide_specs:', e.message);
  }

  // V12.0: 肥料库表（如果从旧版本升级）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS fertilizer_library (
        id TEXT PRIMARY KEY,
        fertilizer_code TEXT NOT NULL UNIQUE,
        fertilizer_name TEXT NOT NULL,
        fertilizer_type TEXT CHECK(fertilizer_type IN ('organic', 'inorganic', 'water_soluble', 'compound', 'bio', 'slow_release', 'trace')),
        application_timing TEXT,
        function_desc TEXT,
        taboo_desc TEXT,
        shelf_life TEXT,
        storage_condition TEXT,
        supplier_info TEXT,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
        create_time TEXT DEFAULT (datetime('now','localtime')),
        update_time TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ fertilizer_library 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) seedLog.skip('• fertilizer_library 已存在');
    else seedLog.error('fertilizer_library:', e.message);
  }

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS fertilizer_specs (
        id TEXT PRIMARY KEY,
        fertilizer_id TEXT NOT NULL,
        spec_content TEXT,
        manufacturer TEXT,
        suggested_dosage TEXT,
        suggested_ratio TEXT,
        dosage_unit TEXT,
        remark TEXT,
        status TEXT DEFAULT 'active',
        create_time TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (fertilizer_id) REFERENCES fertilizer_library(id) ON DELETE CASCADE
      )
    `);
    seedLog.info('✓ fertilizer_specs 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) seedLog.skip('• fertilizer_specs 已存在');
    else seedLog.error('fertilizer_specs:', e.message);
  }

  // 为 fertilizer_specs 表添加品牌名称字段
  try {
    db.run(`ALTER TABLE fertilizer_specs ADD COLUMN brand_name TEXT`);
    seedLog.info('✓ fertilizer_specs 表添加 brand_name 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• brand_name 列已存在');
    else seedLog.skip('• brand_name 列添加: ' + e.message);
  }

  // V12.0: 为 fertilizer_library 表添加 application_timing 字段（替换 fertilizer_category）
  try {
    db.run(`ALTER TABLE fertilizer_library ADD COLUMN application_timing TEXT`);
    seedLog.info('✓ fertilizer_library 表添加 application_timing 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• application_timing 列已存在');
    else seedLog.skip('• application_timing 列添加: ' + e.message);
  }

  // G11 V1.1: 为 fertilizer_library 表添加 current_stock 字段（当前库存，千克）
  try {
    db.run(`ALTER TABLE fertilizer_library ADD COLUMN current_stock REAL DEFAULT 0`);
    seedLog.info('✓ fertilizer_library 表添加 current_stock 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• current_stock 列已存在');
    else seedLog.skip('• current_stock 列添加: ' + e.message);
  }

  // 为 pesticide_specs 表添加作用机制字段
  try {
    db.run(`ALTER TABLE pesticide_specs ADD COLUMN mechanism TEXT`);
    seedLog.info('✓ pesticide_specs 表添加 mechanism 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• mechanism 列已存在');
    else seedLog.skip('• mechanism 列添加: ' + e.message);
  }

  // 为 pesticide_specs 表添加品牌名称字段
  try {
    db.run(`ALTER TABLE pesticide_specs ADD COLUMN brand_name TEXT`);
    seedLog.info('✓ pesticide_specs 表添加 brand_name 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• brand_name 列已存在');
    else seedLog.skip('• brand_name 列添加: ' + e.message);
  }

  // 为 pesticide_library 表添加药剂成分字段
  try {
    db.run(`ALTER TABLE pesticide_library ADD COLUMN ingredient TEXT`);
    seedLog.info('✓ pesticide_library 表添加 ingredient 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• ingredient 列已存在');
    else seedLog.skip('• ingredient 列添加: ' + e.message);
  }

  // 为 pesticide_library 表添加作用机制字段
  try {
    db.run(`ALTER TABLE pesticide_library ADD COLUMN mechanism TEXT`);
    seedLog.info('✓ pesticide_library 表添加 mechanism 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• mechanism 列已存在');
    else seedLog.skip('• mechanism 列添加: ' + e.message);
  }

  // 为 pesticide_specs 表添加备注字段
  try {
    db.run(`ALTER TABLE pesticide_specs ADD COLUMN remark TEXT`);
    seedLog.info('✓ pesticide_specs 表添加 remark 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• remark 列已存在');
    else seedLog.skip('• remark 列添加: ' + e.message);
  }

  // 为 plantings 表添加缺失的列
  const plantingsColumns = [
    { name: 'crop_code', sql: 'ALTER TABLE plantings ADD COLUMN crop_code TEXT' },
    { name: 'area_id', sql: 'ALTER TABLE plantings ADD COLUMN area_id TEXT' },
    { name: 'root_name', sql: 'ALTER TABLE plantings ADD COLUMN root_name TEXT' },
    { name: 'soil_ph', sql: 'ALTER TABLE plantings ADD COLUMN soil_ph REAL' },
    { name: 'soil_ec', sql: 'ALTER TABLE plantings ADD COLUMN soil_ec REAL' },
    { name: 'attrition_rate', sql: 'ALTER TABLE plantings ADD COLUMN attrition_rate REAL' },
    { name: 'transplant_count', sql: 'ALTER TABLE plantings ADD COLUMN transplant_count INTEGER DEFAULT 0' },
    { name: 'transplant_date', sql: 'ALTER TABLE plantings ADD COLUMN transplant_date TEXT' },
    { name: 'is_harvest', sql: 'ALTER TABLE plantings ADD COLUMN is_harvest INTEGER DEFAULT 0' },
    { name: 'harvest_date', sql: 'ALTER TABLE plantings ADD COLUMN harvest_date TEXT' },
    { name: 'print_count', sql: 'ALTER TABLE plantings ADD COLUMN print_count INTEGER DEFAULT 0' },
    { name: 'traceability_code', sql: 'ALTER TABLE plantings ADD COLUMN traceability_code TEXT' },
    { name: 'pictures', sql: 'ALTER TABLE plantings ADD COLUMN pictures TEXT' },
    { name: 'production_plan_id', sql: 'ALTER TABLE plantings ADD COLUMN production_plan_id TEXT' },
    { name: 'production_plan_code', sql: 'ALTER TABLE plantings ADD COLUMN production_plan_code TEXT' },
    // 2026-06-05: 强结分支写入
    { name: 'end_type', sql: 'ALTER TABLE plantings ADD COLUMN end_type TEXT' },
    { name: 'end_time', sql: 'ALTER TABLE plantings ADD COLUMN end_time TEXT' },
  ];

  for (const col of plantingsColumns) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ plantings 表添加 ${col.name} 列成功`);
    } catch (e: any) {
      if (e.message.includes('duplicate column')) seedLog.skip(`• plantings.${col.name} 列已存在`);
      else seedLog.skip(`• plantings.${col.name} 列添加: ${e.message}`);
    }
  }

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS pest_disease_dict (
        id TEXT PRIMARY KEY,
        dict_code TEXT NOT NULL UNIQUE,
        dict_name TEXT NOT NULL,
        dict_type TEXT NOT NULL,
        target_crops TEXT,
        description TEXT,
        status TEXT DEFAULT 'active',
        create_time TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ pest_disease_dict 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) seedLog.skip('• pest_disease_dict 已存在');
    else seedLog.error('pest_disease_dict:', e.message);
  }

  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS pesticide_records (
        id TEXT PRIMARY KEY,
        record_code TEXT NOT NULL UNIQUE,
        spray_time TEXT NOT NULL,
        operator_id TEXT,
        operator_name TEXT,
        crop_name TEXT NOT NULL,
        greenhouse_name TEXT,
        control_type TEXT NOT NULL,
        pesticide_id TEXT,
        pesticide_name TEXT,
        pesticide_type TEXT,
        spec_id TEXT,
        spec_content TEXT,
        dosage REAL,
        dosage_unit TEXT,
        dilution_ratio TEXT,
        target_pest TEXT,
        application_method TEXT,
        bio_agent_id TEXT,
        bio_agent_name TEXT,
        bio_agent_type TEXT,
        equipment_name TEXT,
        equipment_count TEXT,
        use_leaf_fertilizer TEXT DEFAULT 'no',
        leaf_fertilizer_name TEXT,
        leaf_fertilizer_dosage REAL,
        leaf_fertilizer_unit TEXT,
        pesticide_list TEXT,
        description TEXT,
        photos TEXT,
        status TEXT DEFAULT 'completed',
        create_time TEXT DEFAULT (datetime('now','localtime')),
        update_time TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ pesticide_records 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) seedLog.skip('• pesticide_records 已存在');
    else seedLog.error('pesticide_records:', e.message);
  }

  // V12.0: 为 pesticide_records 表添加 pesticide_list 列（支持多药剂）
  try {
    db.run(`ALTER TABLE pesticide_records ADD COLUMN pesticide_list TEXT`);
    seedLog.info('✓ pesticide_records 表添加 pesticide_list 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• pesticide_records.pesticide_list 列已存在');
    } else {
      seedLog.skip('• pesticide_records.pesticide_list:', e.message);
    }
  }

  // V12.0: 为 pesticide_records 表添加 bio_agent_list 列（支持多生物制剂）
  try {
    db.run(`ALTER TABLE pesticide_records ADD COLUMN bio_agent_list TEXT`);
    seedLog.info('✓ pesticide_records 表添加 bio_agent_list 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• pesticide_records.bio_agent_list 列已存在');
    } else {
      seedLog.skip('• pesticide_records.bio_agent_list:', e.message);
    }
  }

  // V12.0: 为 pesticide_records 表添加 equipment_list 列（支持多设备/方式）
  try {
    db.run(`ALTER TABLE pesticide_records ADD COLUMN equipment_list TEXT`);
    seedLog.info('✓ pesticide_records 表添加 equipment_list 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• pesticide_records.equipment_list 列已存在');
    } else {
      seedLog.skip('• pesticide_records.equipment_list:', e.message);
    }
  }

  // V12.0: 药剂-病虫害关联表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS pesticide_pest_relation (
        id TEXT PRIMARY KEY,
        pesticide_id TEXT NOT NULL,
        pest_id TEXT NOT NULL,
        create_time TEXT DEFAULT (datetime('now','localtime')),
        UNIQUE(pesticide_id, pest_id)
      )
    `);
    seedLog.info('✓ pesticide_pest_relation 表创建成功');
    // 创建索引
    try { db.run('CREATE INDEX IF NOT EXISTS idx_relation_pesticide ON pesticide_pest_relation(pesticide_id);'); } catch {}
    try { db.run('CREATE INDEX IF NOT EXISTS idx_relation_pest ON pesticide_pest_relation(pest_id);'); } catch {}
    seedLog.info('✓ pesticide_pest_relation 索引创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) seedLog.skip('• pesticide_pest_relation 已存在');
    else seedLog.error('pesticide_pest_relation:', e.message);
  }

  // V13.0: 种源打印记录表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS seed_source_print_records (
        id TEXT PRIMARY KEY,
        seed_source_id TEXT NOT NULL,
        print_type TEXT NOT NULL,
        print_count INTEGER DEFAULT 1,
        operator TEXT,
        label_numbers TEXT,
        print_time TEXT DEFAULT (datetime('now','localtime')),
        create_time TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ seed_source_print_records 表创建成功');
    try { db.run('CREATE INDEX IF NOT EXISTS idx_sspr_seed_source ON seed_source_print_records(seed_source_id)'); } catch {}
  } catch (e: any) {
    if (e.message.includes('already exists')) seedLog.skip('• seed_source_print_records 已存在');
    else seedLog.error('seed_source_print_records:', e.message);
  }

  // 为 seed_sources 表添加打印相关列
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN print_count INTEGER DEFAULT 0`);
    seedLog.info('✓ seed_sources 表添加 print_count 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• seed_sources.print_count 列已存在');
    else seedLog.skip('• seed_sources.print_count:', e.message);
  }

  // P0 #1: 为 seed_sources 表添加 pictures 列（种源图片）
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN pictures TEXT DEFAULT '[]'`);
    seedLog.info('✓ seed_sources 表添加 pictures 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• seed_sources.pictures 列已存在');
    else seedLog.skip('• seed_sources.pictures:', e.message);
  }

  // 2026-06-05: 为 seed_sources 表添加 end_type / end_time 字段
  // 用途：种源"正常/异常结束"时记录，强结分支绕过生产计划联动
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN end_type TEXT`);
    seedLog.info('✓ seed_sources 表添加 end_type 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• seed_sources.end_type 列已存在');
    else seedLog.skip('• seed_sources.end_type:', e.message);
  }
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN end_time TEXT`);
    seedLog.info('✓ seed_sources 表添加 end_time 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• seed_sources.end_time 列已存在');
    else seedLog.skip('• seed_sources.end_time:', e.message);
  }

  // 为 seedlings 表添加打印相关列
  try {
    db.run(`ALTER TABLE seedlings ADD COLUMN print_count INTEGER DEFAULT 0`);
    seedLog.info('✓ seedlings 表添加 print_count 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• seedlings.print_count 列已存在');
    else seedLog.skip('• seedlings.print_count:', e.message);
  }

  // 2026-06-05: 为 seedlings 表添加 end_type / end_time 字段
  // 用途：育苗"正常/异常结束"时记录，强结分支绕过生产计划联动
  try {
    db.run(`ALTER TABLE seedlings ADD COLUMN end_type TEXT`);
    seedLog.info('✓ seedlings 表添加 end_type 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• seedlings.end_type 列已存在');
    else seedLog.skip('• seedlings.end_type:', e.message);
  }
  try {
    db.run(`ALTER TABLE seedlings ADD COLUMN end_time TEXT`);
    seedLog.info('✓ seedlings 表添加 end_time 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• seedlings.end_time 列已存在');
    else seedLog.skip('• seedlings.end_time:', e.message);
  }

  // 创建 daily_plans 表（每日计划持久化）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS daily_plans (
        id TEXT PRIMARY KEY,
        plan_date TEXT NOT NULL,
        plan_data TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);
    seedLog.info('✓ daily_plans 表创建成功');
  } catch (e: any) {
    seedLog.skip('• daily_plans:', e.message);
  }

  // 创建 monthly_plans 表（月度计划持久化）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS monthly_plans (
        id TEXT PRIMARY KEY,
        plan_month TEXT NOT NULL,
        plan_data TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT,
        updated_at TEXT
      )
    `);
    seedLog.info('✓ monthly_plans 表创建成功');
  } catch (e: any) {
    seedLog.skip('• monthly_plans:', e.message);
  }

  // ========== 订单管理扩展表 (Order Management V2) ==========

  // 1. 客户档案表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        customer_code TEXT NOT NULL,
        customer_name TEXT NOT NULL,
        contact_person TEXT,
        contact_phone TEXT,
        delivery_address TEXT,
        remarks TEXT,
        create_by TEXT,
        create_time TEXT,
        update_time TEXT
      )
    `);
    seedLog.info('✓ customers 表创建成功');
  } catch (e: any) {
    if (!e.message.includes('already exists')) {
      seedLog.skip('• customers:', e.message);
    }
  }

  // 2. 库存冻结表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory_freeze (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        order_code TEXT,
        harvest_record_id TEXT,
        harvest_code TEXT,
        freeze_quantity INTEGER DEFAULT 0,
        used_quantity INTEGER DEFAULT 0,
        status TEXT DEFAULT 'frozen',
        remarks TEXT,
        create_by TEXT,
        create_time TEXT
      )
    `);
    seedLog.info('✓ inventory_freeze 表创建成功');
  } catch (e: any) {
    if (!e.message.includes('already exists')) {
      seedLog.skip('• inventory_freeze:', e.message);
    }
  }

  // 3. 交付记录表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS delivery_records (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        order_code TEXT,
        delivery_batch INTEGER,
        delivery_quantity INTEGER DEFAULT 0,
        delivery_date TEXT,
        quality_check_id TEXT,
        acceptance_id TEXT,
        inventory_freeze_id TEXT,
        remarks TEXT,
        create_by TEXT,
        create_time TEXT
      )
    `);
    seedLog.info('✓ delivery_records 表创建成功');
  } catch (e: any) {
    if (!e.message.includes('already exists')) {
      seedLog.skip('• delivery_records:', e.message);
    }
  }

  // 4. 质检记录表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS quality_check_records (
        id TEXT PRIMARY KEY,
        delivery_record_id TEXT,
        order_id TEXT,
        check_date TEXT,
        check_result TEXT,
        check_person TEXT,
        check_items TEXT,
        remarks TEXT,
        create_time TEXT
      )
    `);
    seedLog.info('✓ quality_check_records 表创建成功');
  } catch (e: any) {
    if (!e.message.includes('already exists')) {
      seedLog.skip('• quality_check_records:', e.message);
    }
  }

  // 5. 验收记录表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS acceptance_records (
        id TEXT PRIMARY KEY,
        delivery_record_id TEXT,
        order_id TEXT,
        acceptance_date TEXT,
        acceptance_result TEXT,
        acceptance_person TEXT,
        remarks TEXT,
        create_time TEXT
      )
    `);
    seedLog.info('✓ acceptance_records 表创建成功');
  } catch (e: any) {
    if (!e.message.includes('already exists')) {
      seedLog.skip('• acceptance_records:', e.message);
    }
  }

  // 6. 生产批次订单关联表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS production_batch_orders (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        order_code TEXT,
        batch_type TEXT,
        batch_id TEXT,
        batch_code TEXT,
        quantity INTEGER DEFAULT 0,
        remarks TEXT,
        create_time TEXT
      )
    `);
    seedLog.info('✓ production_batch_orders 表创建成功');
  } catch (e: any) {
    if (!e.message.includes('already exists')) {
      seedLog.skip('• production_batch_orders:', e.message);
    }
  }

  // 7. 订单变更日志表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS order_change_logs (
        id TEXT PRIMARY KEY,
        order_id TEXT,
        order_code TEXT,
        change_type TEXT,
        change_content TEXT,
        change_reason TEXT,
        operator TEXT,
        create_time TEXT
      )
    `);
    seedLog.info('✓ order_change_logs 表创建成功');
  } catch (e: any) {
    if (!e.message.includes('already exists')) {
      seedLog.skip('• order_change_logs:', e.message);
    }
  }

  // 8. crop_orders 表新增字段迁移
  const cropOrdersNewFields = [
    `ALTER TABLE crop_orders ADD COLUMN customer_id TEXT`,
    `ALTER TABLE crop_orders ADD COLUMN customer_phone TEXT`,
    `ALTER TABLE crop_orders ADD COLUMN delivery_plan TEXT`,
    `ALTER TABLE crop_orders ADD COLUMN total_delivered_quantity INTEGER DEFAULT 0`,
  ];
  for (const sql of cropOrdersNewFields) {
    try {
      db.run(sql);
      const fieldName = sql.split('ADD COLUMN ')[1].split(' ')[0];
      seedLog.info(`✓ crop_orders 表添加 ${fieldName} 列`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        const fieldName = sql.split('ADD COLUMN ')[1].split(' ')[0];
        seedLog.skip(`• crop_orders.${fieldName}: ${e.message}`);
      }
    }
  }

  // G11 V1.1 数据修复：把所有肥料库 current_stock 初始化为 100（已有库/新装库通用）
  try {
    const now = new Date().toISOString();
    const updated = db.run(
      `UPDATE fertilizer_library SET current_stock = 100, update_time = ? WHERE current_stock IS NULL OR current_stock = 0`,
      [now],
    );
    seedLog.info(`✓ 肥料库初始库存 100kg：${db.getRowsModified()} 条更新`);
  } catch (fixErr: any) {
    seedLog.skip('• 肥料库库存初始化跳过:', fixErr.message);
  }

  saveDatabase();
  seedLog.info('\n数据库结构修复完成！');

  // ========== 库存中心表 (inventory_stock) 扩展字段（V3.0 关联采收入库）==========
  // 这些字段由采收入库 API 在调用 inventoryInbound 时一起传入并落库，
  // 让"作物库存"页能展示完整的采收元数据（品级 / 区域 / 编码 / 备注等）
  seedLog.info('\n检查 inventory_stock 扩展字段...');
  const inventoryStockExtColumns = [
    { name: 'crop_code', sql: "ALTER TABLE inventory_stock ADD COLUMN crop_code TEXT" },          // 11 位品种库编码
    { name: 'planting_mode', sql: "ALTER TABLE inventory_stock ADD COLUMN planting_mode TEXT" },   // 种植模式
    { name: 'target_yield', sql: "ALTER TABLE inventory_stock ADD COLUMN target_yield REAL DEFAULT 0" }, // 目标产量
    { name: 'grade', sql: "ALTER TABLE inventory_stock ADD COLUMN grade TEXT" },                  // 品质等级 A/B/C
    { name: 'auditor', sql: "ALTER TABLE inventory_stock ADD COLUMN auditor TEXT" },              // 审核人
    { name: 'remarks', sql: "ALTER TABLE inventory_stock ADD COLUMN remarks TEXT" },              // 备注
    { name: 'greenhouse_name', sql: "ALTER TABLE inventory_stock ADD COLUMN greenhouse_name TEXT" }, // 采收区域
    // 供应商+价格+采购日期（外购入库财务字段, 对齐种源管理）
    { name: 'supplier_id', sql: "ALTER TABLE inventory_stock ADD COLUMN supplier_id TEXT" },
    { name: 'supplier_name', sql: "ALTER TABLE inventory_stock ADD COLUMN supplier_name TEXT" },
    { name: 'unit_price', sql: "ALTER TABLE inventory_stock ADD COLUMN unit_price REAL DEFAULT 0" },
    { name: 'total_amount', sql: "ALTER TABLE inventory_stock ADD COLUMN total_amount REAL DEFAULT 0" },
    { name: 'purchase_date', sql: "ALTER TABLE inventory_stock ADD COLUMN purchase_date TEXT" },
  ];
  for (const col of inventoryStockExtColumns) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ inventory_stock 表添加 ${col.name} 列`);
    } catch (e: any) {
      if (e.message.includes('duplicate column')) {
        seedLog.skip(`• inventory_stock.${col.name} 列已存在`);
      } else {
        seedLog.skip(`• inventory_stock.${col.name}: ${e.message}`);
      }
    }
  }

  // 37.5 出库流水表索引（出库记录查询性能优化，V3.1）
  // 设计文档：docs/superpowers/specs/2026-06-04-outbound-records-design.md §6.5
  const outboundRecordIndexes = [
    { name: 'idx_inventory_tx_type_date', sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_tx_type_date ON inventory_transaction(transaction_type, operate_date DESC)' },
    { name: 'idx_inventory_tx_instance',  sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_tx_instance  ON inventory_transaction(instance_id)' },
    { name: 'idx_inventory_tx_business',  sql: 'CREATE INDEX IF NOT EXISTS idx_inventory_tx_business  ON inventory_transaction(business_type)' },
  ];
  for (const idx of outboundRecordIndexes) {
    try {
      db.run(idx.sql);
      seedLog.info(`✓ 出库流水索引 ${idx.name} 创建成功`);
    } catch (e: any) {
      // 重复创建等错误静默
    }
  }

  // ============================================================
  // V2 改造 (回流闭环 + 出库多来源) 增量迁移
  // 任务 3: 在 fixMissingSchema 末尾追加 2 个迁移函数调用
  // 顺序: 先建 crop_circulation_records 新表, 后改 plantings 加列
  // ============================================================

  // ① crop_circulation_records 新表 + 3 索引 (任务 1)
  try {
    const { runCreateCropCirculationRecordsMigration } = await import('./migrations/cropCirculationRecords');
    runCreateCropCirculationRecordsMigration(db);
  } catch (e: any) {
    seedLog.skip('• crop_circulation_records 迁移:', e.message);
  }

  // ①b seed_sources.parent_source_id 字段 (任务 7 实施时发现 Phase 1a 遗漏)
  // PROPAGATION 回流需要建新种源记录关联 parent_source_id
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN parent_source_id TEXT REFERENCES seed_sources(id)`);
    seedLog.info('✓ seed_sources.parent_source_id 列已添加');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) {
      seedLog.skip('• seed_sources.parent_source_id:', e.message);
    }
  }
  try {
    db.run(`CREATE INDEX IF NOT EXISTS idx_seed_parent_source ON seed_sources(parent_source_id)`);
  } catch (e: any) {
    // 索引已存在, 忽略
  }

  // ② plantings.origin_path 两步迁移 (任务 2)
  try {
    const { runAddOriginPathMigration } = await import('./migrations/originPath');
    runAddOriginPathMigration(db, { dryRun: false });
  } catch (e: any) {
    seedLog.skip('• plantings.origin_path 迁移:', e.message);
  }

  // 2026-06-12: 修复历史 B201/B202/B203 三条育苗计划 plan_code 为 NULL 的问题
  // 根因：seedData.ts 早期版本用 batch_code 字段名（DB 列名是 plan_code），导致 plan_code 全为 NULL
  fixProductionPlanSeedlingPlanCode();

  // 2026-06-12: 回溯修复历史"已审批通过但生产计划 batch_status 还是 pending"的脏数据
  fixApprovedProductionPlanStatus();

  saveDatabase();
}

/**
 * 字典数据去重 — 合并每对 (category_code, dict_code) 的多条记录
 * 保留最完整的行，合并最佳字段，软删除其余
 * 幂等操作，可安全重复执行
 */
export function deduplicateDictionaries(): void {
  const db = getDatabase();

  // 仅对活跃记录去重（inactive 是用户已删除，不纳入）
  const stmt = db.prepare(`
    SELECT category_code, dict_code, COUNT(*) as cnt
    FROM dictionaries
    WHERE status = 'active'
    GROUP BY category_code, dict_code
    HAVING cnt > 1
  `);

  const duplicates: Array<{ category_code: string; dict_code: string; cnt: number }> = [];
  while (stmt.step()) {
    const row = stmt.getAsObject() as { category_code: string; dict_code: string; cnt: number };
    duplicates.push(row);
  }
  stmt.free();

  if (duplicates.length === 0) {
    seedLog.info('字典数据无重复，跳过去重');
    return;
  }

  seedLog.info(`发现 ${duplicates.length} 组重复字典数据，开始去重...`);

  for (const dup of duplicates) {
    const categoryCode = dup.category_code;
    const dictCode = dup.dict_code;

    // 获取该组的所有行，按数据完整性排序
    const rowsStmt = db.prepare(`
      SELECT * FROM dictionaries
      WHERE category_code = ? AND dict_code = ?
      ORDER BY
        CASE WHEN color IS NOT NULL AND color != '' THEN 0 ELSE 1 END,
        CASE WHEN status = 'active' THEN 0 ELSE 1 END,
        sort_order DESC,
        updated_at DESC
    `);
    rowsStmt.bind([categoryCode, dictCode]);
    const rows: Array<Record<string, unknown>> = [];
    while (rowsStmt.step()) {
      rows.push(rowsStmt.getAsObject());
    }
    rowsStmt.free();

    if (rows.length < 2) continue;

    // 保留第一条（排序后最优），融合其他行的更好字段
    const keeper = rows[0];
    const toDelete = rows.slice(1);

    // 从所有行中取最佳字段值
    let bestLabel = keeper.dict_label as string;
    let bestColor = keeper.color as string | null;
    let bestValue = keeper.dict_value as string;
    let bestSortOrder = (keeper.sort_order as number) || 0;

    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const label = r.dict_label as string;
      const color = r.color as string | null;
      const value = r.dict_value as string;
      const sortOrder = (r.sort_order as number) || 0;

      // 优先选有内容的 label（更长的）
      if (label && label.length > bestLabel.length) bestLabel = label;
      // 优先选有 color 值的
      if (color && !bestColor) bestColor = color;
      // 优先选有内容的 value
      if (value && value.length > bestValue.length) bestValue = value;
      // 取最大 sort_order
      if (sortOrder > bestSortOrder) bestSortOrder = sortOrder;
    }

    // 更新保留行
    db.run(`
      UPDATE dictionaries
      SET dict_label = ?, dict_value = ?, color = ?, sort_order = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [bestLabel, bestValue, bestColor, bestSortOrder, keeper.id as string]);

    // 硬删除重复行（最优行已融合全部数据，重复行无保留价值）
    for (const row of toDelete) {
      db.run(`DELETE FROM dictionaries WHERE id = ?`, [row.id as string]);
    }

    seedLog.info(`  去重: ${categoryCode}/${dictCode} → 保留 ${keeper.id}, 删除 ${toDelete.map(r => r.id).join(', ')}`);
  }

  saveDatabase();
  seedLog.info('字典数据去重完成');
}

/**
 * 修复生产计划表 plan_code NULL 的历史数据
 * 根因：seedData.ts 早期版本 B201/B202/B203 三条育苗计划写成了 batch_code 字段（DB 列名是 plan_code），
 *       导致 INSERT 时 plan_code 全部是 NULL/空。
 *       表现：前端生产计划下拉只显示 1 条（React key 重复丢渲染）或全部不显示。
 * 修复：按 id 顺序为 B201/B202/B203 补 plan_code = YMB2026-001/002/003。
 */
function fixProductionPlanSeedlingPlanCode(): void {
  const db = getDatabase();
  const codeMap: Record<string, string> = {
    B201: 'YMB2026-001',
    B202: 'YMB2026-002',
    B203: 'YMB2026-003',
  };
  let fixed = 0;
  for (const [id, planCode] of Object.entries(codeMap)) {
    const stmt = db.prepare(`SELECT plan_code FROM production_plans WHERE id = ?`);
    stmt.bind([id]);
    let exists = false;
    let current: string | null = null;
    if (stmt.step()) {
      exists = true;
      const row = stmt.getAsObject() as { plan_code?: string | null };
      current = (row.plan_code ?? '').toString().trim() || null;
    }
    stmt.free();
    if (!exists) continue;
    if (current === planCode) {
      seedLog.skip(`• production_plans.${id}.plan_code 已正确 (${planCode})，跳过`);
      continue;
    }
    db.run(`UPDATE production_plans SET plan_code = ? WHERE id = ?`, [planCode, id]);
    seedLog.info(`✓ 修复 production_plans.${id}.plan_code: '${current ?? 'NULL'}' → '${planCode}'`);
    fixed += 1;
  }
  if (fixed > 0) saveDatabase();
  seedLog.info(`生产计划育苗计划 plan_code 修复完成（${fixed} 条）`);
}

/**
 * 2026-06-12: 回溯修复历史"已审批通过但生产计划 batch_status 还是 pending"的脏数据
 * 根因：AP* 系列审批单的 business_link 全部是 'null'（或双层 stringify 字符串），
 *       导致后端联动 SQL `if (businessLink?.type && businessLink?.requestId)` 永远 false，
 *       production_plans.batch_status 永远停留在 'pending'。
 * 修复：从 approvals.title 解析出 batchCode，UPDATE production_plans.batch_status='published'。
 *       title 格式: "生产计划审批：ZZ20260612-002" / "生产计划编辑审批：ZZB2026-003" / "生产计划作废审批：xxx"
 * 幂等：只把 batch_status='pending' 的改为 'published'，已是 'published' 的跳过。
 */
function fixApprovedProductionPlanStatus(): void {
  const db = getDatabase();
  const now = new Date().toISOString();

  // 1) 类型为 production_plan + 状态为 approved 的所有审批单
  const stmt = db.prepare(`
    SELECT code, title FROM approvals
    WHERE type = 'production_plan' AND status = 'approved'
  `);
  const rows: { code: string; title: string }[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as { code: string; title: string });
  }
  stmt.free();

  let fixed = 0;
  let noMatch = 0;
  for (const { code, title } of rows) {
    // title 解析: 三种审批单(新增/编辑/作废)都需要同步
    // 编辑和作废审批通过后,业务表状态应也是 published (作废) 或保持 published (编辑)
    // 这里只处理新增审批通过 → published,作废审批通过 → cancelled 由其它迁移负责
    if (title.includes('作废')) continue;  // 跳过作废审批 — 不应改成 published

    // 用正则提取 batchCode: title 末尾的 "[A-Z0-9-]+" 形式(生产计划批号)
    // 例: "生产计划审批：ZZ20260612-002" → "ZZ20260612-002"
    // 例: "生产计划编辑审批：ZZB2026-003" → "ZZB2026-003"
    const match = title.match(/[：:]\s*([A-Z]{2,4}[0-9-]+[0-9])$/);
    if (!match) {
      noMatch += 1;
      continue;
    }
    const batchCode = match[1];

    // 找对应生产计划
    const findStmt = db.prepare(`SELECT id, batch_status FROM production_plans WHERE plan_code = ?`);
    findStmt.bind([batchCode]);
    let planId: string | null = null;
    let currentStatus: string | null = null;
    if (findStmt.step()) {
      const row = findStmt.getAsObject() as { id: string; batch_status: string };
      planId = row.id;
      currentStatus = row.batch_status;
    }
    findStmt.free();
    if (!planId) {
      noMatch += 1;
      continue;
    }
    if (currentStatus === 'published') {
      seedLog.skip(`• production_plans[${batchCode}].batch_status 已正确,跳过`);
      continue;
    }

    db.run(
      `UPDATE production_plans SET batch_status = 'published', status = 'published', publish_date = COALESCE(NULLIF(publish_date, ''), ?), update_time = ? WHERE id = ?`,
      [now, now, planId]
    );
    seedLog.info(`✓ 修复 production_plans[${batchCode}]: batch_status '${currentStatus}' → 'published' (审批单 ${code})`);
    fixed += 1;
  }
  if (fixed > 0) saveDatabase();
  seedLog.info(`已审批通过的生产计划状态回溯完成（修复 ${fixed} 条，跳过/无匹配 ${noMatch} 条）`);

  // 2026-06-12: 补充修复"batch_status='published' 但 publish_date 为空"的历史行
  // 根因：旧版联动 SQL 只改 batch_status 不写 publish_date,导致发布时间列空
  // 兜底：用 update_time (这条记录一定有) 同步进 publish_date
  const missingDateStmt = db.prepare(`
    UPDATE production_plans
    SET publish_date = update_time
    WHERE batch_status = 'published'
      AND (publish_date IS NULL OR publish_date = '')
      AND update_time IS NOT NULL AND update_time != ''
  `);
  missingDateStmt.run();
  missingDateStmt.free();
  // sqlite 不直接返回 changed rows,这里用 prepare/step 重新统计
  const remainStmt = db.prepare(`
    SELECT COUNT(*) FROM production_plans
    WHERE batch_status = 'published'
      AND (publish_date IS NULL OR publish_date = '')
  `);
  remainStmt.step();
  const remaining = remainStmt.getAsObject()[0] as number;
  remainStmt.free();
  saveDatabase();
  seedLog.info(`发布时间补全完成（仍有 ${remaining} 条未补,需要手工核对）`);
}

// 不再模块级自动执行 — 由 index.ts 统一控制启动顺序
// 如需独立运行，执行: npx tsx src/db/fixMissingSchema.ts
