/**
 * 数据库结构修复脚本 - 添加缺失的列和表
 * 支持独立运行: npx ts-node src/db/fixMissingSchema.ts
 * 或被导入调用: import { fixMissingSchema } from './fixMissingSchema'
 */

import { getDatabase, saveDatabase, initDatabase } from './index';
import { seedLog } from '../lib/seedLogger';
import { createMaterialFlowLogTable } from './materialFlowLog';
import { createPlantingAreaStocksTable, migrateToAreaStocks } from './plantingAreaStocks';
// 2026-07-14：方案 C — 启动时批量重算 inventory_stock.status
import { recomputeAllStockStatus } from '../lib/inventoryStockStatus';

/**
 * 2026-07-17 审核修复：本地时间戳（替代 toISOString 的 UTC 错位 — utc-timezone-id-bug 教训）
 * 用于 backfill 补录的 create_time，与 datetime('now','localtime') 行为一致
 */
function nowLocalTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

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

  // 30.5. 创建 watering_records 表（浇水记录 — 农事管理 V10.0）
  // 手动记录 + IoT 自动记录，source_daily_record_id 唯一索引保证每日记录同步幂等
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS watering_records (
        id                      TEXT PRIMARY KEY,
        water_code              TEXT NOT NULL UNIQUE,
        record_type             TEXT NOT NULL DEFAULT 'manual',
        fertilizer_record_id    TEXT,
        source_daily_record_id  TEXT,
        crop_name               TEXT NOT NULL,
        crop_variety            TEXT,
        greenhouse_id           TEXT,
        greenhouse_name         TEXT NOT NULL,
        area_id                 TEXT,
        area_name               TEXT,
        planting_id             TEXT,
        planting_code           TEXT,
        seedling_id             TEXT,
        seedling_code           TEXT,
        water_pool              TEXT,
        total_water             REAL NOT NULL DEFAULT 0,
        water_unit              TEXT DEFAULT 'L',
        water_cost              REAL DEFAULT 0,
        water_time              TEXT NOT NULL,
        operator_id             TEXT,
        operator_name           TEXT,
        data_source             TEXT NOT NULL DEFAULT 'manual',
        iot_device_id           TEXT,
        description             TEXT,
        status                  TEXT DEFAULT 'completed',
        create_time             TEXT DEFAULT (datetime('now','localtime')),
        update_time             TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (fertilizer_record_id) REFERENCES fertilizer_records(id) ON DELETE CASCADE
      )
    `);
    try { db.run('CREATE INDEX IF NOT EXISTS idx_watering_records_water_time ON watering_records(water_time)'); } catch {}
    try { db.run('CREATE INDEX IF NOT EXISTS idx_watering_records_crop_name ON watering_records(crop_name)'); } catch {}
    try { db.run('CREATE INDEX IF NOT EXISTS idx_watering_records_record_type ON watering_records(record_type)'); } catch {}
    try { db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_watering_records_daily_sync ON watering_records(source_daily_record_id) WHERE source_daily_record_id IS NOT NULL'); } catch {}
    seedLog.info('✓ watering_records 表创建成功（浇水记录）');
  } catch (e: any) {
    seedLog.skip('• watering_records:', e.message);
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

  // 34.2 2026-07-05: fertilizer_records 表添加 seedling_id / seedling_code 列（关联育苗记录，与 planting_id 二选一）
  try {
    db.run(`ALTER TABLE fertilizer_records ADD COLUMN seedling_id TEXT`);
    seedLog.info('✓ fertilizer_records 表添加 seedling_id 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• fertilizer_records.seedling_id 列已存在');
    } else {
      seedLog.skip('• fertilizer_records.seedling_id:', e.message);
    }
  }
  try {
    db.run(`ALTER TABLE fertilizer_records ADD COLUMN seedling_code TEXT`);
    seedLog.info('✓ fertilizer_records 表添加 seedling_code 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• fertilizer_records.seedling_code 列已存在');
    } else {
      seedLog.skip('• fertilizer_records.seedling_code:', e.message);
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
    // 2026-06-19 unify-harvest-inbound-into-source-operations: 溯源字段
    { name: 'source_module', sql: "ALTER TABLE harvest_records ADD COLUMN source_module TEXT" },        // 来源模块 'seed_source'|'seedling'|'planting'
    // 2026-06-27: 成品形态（果实/种子/种苗/枝条 等）— schema.ts 已含但 fixMissingSchema 漏补，导致老 DB 升级后 INSERT 报"no such column: harvest_form"
    { name: 'harvest_form', sql: "ALTER TABLE harvest_records ADD COLUMN harvest_form TEXT" },
    // 2026-06-04: 软删除列 — 修复"用户删除后重启被 seed 复活"bug。删除时只标 deleted_at，物理行保留
    { name: 'deleted_at', sql: 'ALTER TABLE harvest_records ADD COLUMN deleted_at TEXT' },
    // 2026-07-03：补录标记（异常结束后补录的入库需留痕，弹窗历史表"补录"列依赖）
    { name: 'is_supplementary', sql: 'ALTER TABLE harvest_records ADD COLUMN is_supplementary INTEGER DEFAULT 0' },
    { name: 'supplementary_reason', sql: 'ALTER TABLE harvest_records ADD COLUMN supplementary_reason TEXT' },
    // 2026-07-06：种源外购入库联动成本（区别于现有 unit_price/total_amount 的"售价"语义，新增"采购价"列）
    { name: 'purchase_plan_id', sql: 'ALTER TABLE harvest_records ADD COLUMN purchase_plan_id TEXT' },           // 关联采购计划 ID（自动生成或前端传入）
    { name: 'supplier_id', sql: 'ALTER TABLE harvest_records ADD COLUMN supplier_id TEXT' },                     // 供应商 ID（外购必填）
    { name: 'supplier_name', sql: 'ALTER TABLE harvest_records ADD COLUMN supplier_name TEXT' },                 // 供应商名称（冗余，便于追溯）
    { name: 'purchaser_ids', sql: 'ALTER TABLE harvest_records ADD COLUMN purchaser_ids TEXT' },                 // 采购员 ID 列表（JSON 字符串）
    { name: 'purchaser_names', sql: 'ALTER TABLE harvest_records ADD COLUMN purchaser_names TEXT' },             // 采购员姓名列表（JSON 字符串）
    { name: 'purchase_price', sql: 'ALTER TABLE harvest_records ADD COLUMN purchase_price REAL DEFAULT 0' },     // 采购单价（区别于 unit_price "售价"）
    { name: 'purchase_total_amount', sql: 'ALTER TABLE harvest_records ADD COLUMN purchase_total_amount REAL DEFAULT 0' }, // 采购总额 = purchase_price × quantity
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

  // 2026-07-12：为 fertilizer_specs 表添加 unit_price（施肥时自动带价）
  try {
    db.run('ALTER TABLE fertilizer_specs ADD COLUMN unit_price REAL DEFAULT 0');
    seedLog.info('✓ fertilizer_specs 表添加 unit_price 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• unit_price 列已存在');
    else seedLog.skip('• unit_price 列添加: ' + e.message);
  }

  // 2026-07-12：肥料库存单位（支持液体/颗粒/块状等不同形态）
  try {
    db.run("ALTER TABLE fertilizer_specs ADD COLUMN stock_unit TEXT DEFAULT 'kg'");
    seedLog.info('✓ fertilizer_specs 表添加 stock_unit 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• stock_unit 列已存在');
    else seedLog.skip('• stock_unit 列添加: ' + e.message);
  }

  // 2026-07-12：肥料入库记录表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS fertilizer_stock_in_records (
        id TEXT PRIMARY KEY,
        spec_id TEXT NOT NULL,
        fertilizer_code TEXT,
        fertilizer_name TEXT,
        quantity REAL NOT NULL,
        remark TEXT,
        create_time TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ fertilizer_stock_in_records 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) seedLog.skip('• fertilizer_stock_in_records 已存在');
    else seedLog.error('fertilizer_stock_in_records:', e.message);
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

  // 2026-07-10：为 pesticide_library 表添加 pesticide_type 字段（关联 pesticide_type 字典）
  // 用途：病虫害防治弹窗按药剂类型过滤药剂名称选项
  try {
    db.run(`ALTER TABLE pesticide_library ADD COLUMN pesticide_type TEXT`);
    seedLog.info('✓ pesticide_library 表添加 pesticide_type 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• pesticide_type 列已存在');
    else seedLog.skip('• pesticide_type 列添加: ' + e.message);
  }

  // 2026-07-10：药剂库重构（取消 chemical/bio/physical 分类），删除 control_type 列
  // 注意：DROP COLUMN 需要 SQLite ≥ 3.35.0（sql.js 应已支持）
  try {
    db.run(`ALTER TABLE pesticide_library DROP COLUMN control_type`);
    seedLog.info('✓ pesticide_library 表删除 control_type 列成功');
  } catch (e: any) {
    if (e.message.includes('no such column')) seedLog.skip('• control_type 列不存在（已删除或从未添加）');
    else seedLog.skip('• control_type 列删除: ' + e.message);
  }

  // 2026-07-10：pesticide_records 表删除 control_type 列（同上）
  try {
    db.run(`ALTER TABLE pesticide_records DROP COLUMN control_type`);
    seedLog.info('✓ pesticide_records 表删除 control_type 列成功');
  } catch (e: any) {
    if (e.message.includes('no such column')) seedLog.skip('• pesticide_records.control_type 列不存在');
    else seedLog.skip('• pesticide_records.control_type 列删除: ' + e.message);
  }

  // 2026-07-18 P2-H9 修复：pesticide_records 表删除 status 列（业务上防治记录无中间态，schema 已 DROP）
  try {
    db.run(`ALTER TABLE pesticide_records DROP COLUMN status`);
    seedLog.info('✓ pesticide_records 表删除 status 列成功');
  } catch (e: any) {
    if (e.message.includes('no such column')) seedLog.skip('• pesticide_records.status 列不存在');
    else seedLog.skip('• pesticide_records.status 列删除: ' + e.message);
  }

  // 2026-07-10：删除 control_type 相关索引（如果存在）
  try {
    db.run(`DROP INDEX IF EXISTS idx_pesticide_control_type`);
    seedLog.info('✓ idx_pesticide_control_type 索引已删除');
  } catch (e: any) {
    seedLog.skip('• idx_pesticide_control_type 索引删除: ' + e.message);
  }
  try {
    db.run(`DROP INDEX IF EXISTS idx_pest_records_type`);
    seedLog.info('✓ idx_pest_records_type 索引已删除');
  } catch (e: any) {
    seedLog.skip('• idx_pest_records_type 索引删除: ' + e.message);
  }

  // 2026-07-10：dictionaries 表新增 parent_id 字段（支持层级化：杀虫剂→咀嚼式/刺吸式）
  try {
    db.run(`ALTER TABLE dictionaries ADD COLUMN parent_id TEXT`);
    seedLog.info('✓ dictionaries 表添加 parent_id 列成功');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• dictionaries.parent_id 列已存在');
    else seedLog.skip('• dictionaries.parent_id 列添加: ' + e.message);
  }

  // 2026-07-12：药剂库扁平化迁移 — 检查旧表结构并迁移到新扁平表
  // 检测条件：pesticide_specs 存在 pesticide_id 列（旧 FK 结构）且不存在 stock_quantity（新扁平结构）
  let needsPesticideMigration = false;
  try {
    db.run(`ALTER TABLE pesticide_specs ADD COLUMN stock_quantity REAL DEFAULT 0`);
    // 如果上面成功了，说明表不存在或要加列；但如果是旧表则列已存在
    seedLog.info('✓ pesticide_specs 表添加 stock_quantity 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• pesticide_specs.stock_quantity 列已存在（可能已扁平化）');
    } else if (e.message.includes('no such table')) {
      needsPesticideMigration = true;
      seedLog.info('→ pesticide_specs 表不存在，将创建新扁平表');
    } else {
      seedLog.skip('• pesticide_specs.stock_quantity: ' + e.message);
    }
  }

  // 二次检测：用 PRAGMA table_info 检查旧 FK 列是否存在（兼容 sql.js 和 better-sqlite3）
  try {
    const tableInfo = db.exec("PRAGMA table_info(pesticide_specs)");
    if (tableInfo.length > 0 && tableInfo[0].values) {
      const columns = tableInfo[0].values.map((row: any[]) => row[1]); // column name is index 1
      if (columns.includes('pesticide_id')) {
        needsPesticideMigration = true;
        seedLog.info('→ 检测到旧版 pesticide_specs（含 pesticide_id FK），需要扁平化迁移');
      }
    }
  } catch {}

  if (needsPesticideMigration) {
    seedLog.info('→ 开始药剂库扁平化迁移...');
    try {
      // 步骤 1：用 queryToObjects 读旧数据（兼容 sql.js）
      const { queryToObjects: qto } = require('../utils/queryHelper');
      const oldSpecs = qto(db, 'SELECT * FROM pesticide_specs', []);
      const oldLibrary = qto(db, 'SELECT * FROM pesticide_library', []);

      seedLog.info(`  已读取旧数据: ${oldSpecs.length} 条 specs, ${oldLibrary.length} 条 library`);

      // 步骤 2：删除旧表（先删子表再删主表，避免 FK 约束问题）
      db.run('DROP TABLE IF EXISTS pesticide_specs');
      seedLog.info('  已删除旧 pesticide_specs 表');

      // 步骤 3：创建新扁平表
      db.run(`
        CREATE TABLE pesticide_specs (
          id TEXT PRIMARY KEY,
          pesticide_code TEXT NOT NULL UNIQUE,
          pesticide_name TEXT NOT NULL,
          pesticide_type TEXT,
          ingredient TEXT,
          mechanism TEXT,
          function_desc TEXT,
          taboo_desc TEXT,
          target_pests TEXT,
          spec_content TEXT,
          formulation TEXT,
          manufacturer TEXT,
          brand_name TEXT,
          suggested_dosage TEXT,
          suggested_ratio TEXT,
          dosage_unit TEXT,
          remark TEXT,
          stock_quantity REAL DEFAULT 0,
          stock_unit TEXT DEFAULT 'kg',
          unit_price REAL DEFAULT 0,
          batch_number TEXT,
          production_date TEXT,
          expiration_date TEXT,
          package_spec TEXT,
          status TEXT DEFAULT 'active',
          create_time TEXT DEFAULT (datetime('now','localtime')),
          update_time TEXT DEFAULT (datetime('now','localtime'))
        )
      `);
      seedLog.info('  ✓ 新扁平 pesticide_specs 表已创建');

      // 步骤 4：迁移数据 — 为每个旧 spec 行生成新编码（PC-XXXX 全表递增）
      const libMap = new Map<string, any>();
      for (const row of oldLibrary) {
        libMap.set(row.id, row);
      }

      let codeSeq = 0;
      const now = new Date().toISOString();

      // 4a：迁移有 spec 的记录
      for (const specRow of oldSpecs) {
        const specId = specRow.id;
        const pesticideId = specRow.pesticide_id;
        const libRow = libMap.get(pesticideId);

        codeSeq++;
        const newCode = `PC-${String(codeSeq).padStart(4, '0')}`;

        db.run(`INSERT INTO pesticide_specs (
          id, pesticide_code, pesticide_name, pesticide_type, ingredient, mechanism,
          function_desc, taboo_desc, target_pests,
          spec_content, formulation, manufacturer, brand_name,
          suggested_dosage, suggested_ratio, dosage_unit, remark,
          stock_quantity, stock_unit, unit_price, status, create_time, update_time
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [
            specId, newCode,
            libRow?.pesticide_name || '未知药剂',
            libRow?.pesticide_type || null,
            libRow?.ingredient || null,
            libRow?.mechanism || null,
            libRow?.function_desc || null,
            libRow?.taboo_desc || null,
            libRow?.target_pests || null,
            specRow.spec_content || null,
            specRow.formulation || null,
            specRow.manufacturer || null,
            specRow.brand_name || null,
            specRow.suggested_dosage || null,
            specRow.suggested_ratio || null,
            specRow.dosage_unit || null,
            specRow.remark || null,
            0, 'kg', 0,
            libRow?.status || 'active',
            specRow.create_time || now,
            now
          ]
        );
      }

      // 4b：为没有 spec 的主表行创建占位行
      const specIds = new Set(oldSpecs.map((s: any) => s.pesticide_id));
      for (const libRow of oldLibrary) {
        if (!specIds.has(libRow.id)) {
          codeSeq++;
          const newCode = `PC-${String(codeSeq).padStart(4, '0')}`;
          const newId = `ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          db.run(`INSERT INTO pesticide_specs (
            id, pesticide_code, pesticide_name, pesticide_type, ingredient, mechanism,
            function_desc, taboo_desc, target_pests,
            stock_quantity, stock_unit, unit_price, status, create_time, update_time
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
            [newId, newCode, libRow.pesticide_name, libRow.pesticide_type,
             libRow.ingredient, libRow.mechanism,
             libRow.function_desc, libRow.taboo_desc, libRow.target_pests,
             0, 'kg', 0, libRow.status || 'active', libRow.create_time || now, now]
          );
        }
      }

      seedLog.info(`  ✓ 已迁移 ${codeSeq} 条记录到新扁平表`);
      saveDatabase();
      seedLog.info('✓ 药剂库扁平化迁移完成');
    } catch (e: any) {
      seedLog.error('药剂库扁平化迁移失败: ' + e.message);
    }
  }

  // 2026-07-12：创建药剂入库记录表
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS pesticide_stock_in_records (
        id TEXT PRIMARY KEY,
        spec_id TEXT NOT NULL,
        pesticide_code TEXT,
        pesticide_name TEXT,
        quantity REAL NOT NULL,
        remark TEXT,
        create_time TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ pesticide_stock_in_records 表创建成功');
  } catch (e: any) {
    if (e.message.includes('already exists')) seedLog.skip('• pesticide_stock_in_records 已存在');
    else seedLog.error('pesticide_stock_in_records:', e.message);
  }

  // 为 plantings 表添加缺失的列
  const plantingsColumns = [
    { name: 'crop_code', sql: 'ALTER TABLE plantings ADD COLUMN crop_code TEXT' },
    { name: 'area_id', sql: 'ALTER TABLE plantings ADD COLUMN area_id TEXT' },
    { name: 'root_name', sql: 'ALTER TABLE plantings ADD COLUMN root_name TEXT' },
    { name: 'soil_ph', sql: 'ALTER TABLE plantings ADD COLUMN soil_ph REAL' },
    { name: 'soil_ec', sql: 'ALTER TABLE plantings ADD COLUMN soil_ec REAL' },
    { name: 'attrition_rate', sql: 'ALTER TABLE plantings ADD COLUMN attrition_rate REAL' },
    // 2026-06-18: 种植目标产量（完成比例 = harvestToInventoryQty / target_yield）
    { name: 'target_yield', sql: 'ALTER TABLE plantings ADD COLUMN target_yield REAL DEFAULT 0' },
    // 2026-06-18: 目标产量单位（从数据词典 unit 选，默认 '克'）
    { name: 'target_yield_unit', sql: 'ALTER TABLE plantings ADD COLUMN target_yield_unit TEXT DEFAULT \'克\'' },
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
    // 2026-06-13: 修复 — plantings.planted_quantity 列缺失导致种植 POST 报"no such column"
    // schema.ts L421 有，fixMissingSchema 历史漏补，存量 DB 升级失败
    { name: 'planted_quantity', sql: 'ALTER TABLE plantings ADD COLUMN planted_quantity INTEGER DEFAULT 0' },
    // 2026-06-28：种植管理每日记录累加字段
    // 活体剩余 = planting_quantity + supplement_count - loss_count
    // 补栽无上限；损耗必须 ≤ 当前活体剩余（POST 路由校验）
    { name: 'loss_count', sql: 'ALTER TABLE plantings ADD COLUMN loss_count INTEGER DEFAULT 0' },
    { name: 'supplement_count', sql: 'ALTER TABLE plantings ADD COLUMN supplement_count INTEGER DEFAULT 0' },
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

  // 2026-07-11：肥料池字段（JSON 数组，支持多肥料联用）
  try {
    db.run(`ALTER TABLE pesticide_records ADD COLUMN leaf_fertilizer_list TEXT`);
    seedLog.info('✓ pesticide_records 表添加 leaf_fertilizer_list 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• pesticide_records.leaf_fertilizer_list 列已存在');
    } else {
      seedLog.skip('• pesticide_records.leaf_fertilizer_list:', e.message);
    }
  }

  // 2026-07-05: 为 pesticide_records 添加关联业务字段（与施肥管理对齐）
  const pestBizCols = [
    { col: 'planting_id', label: 'planting_id' },
    { col: 'planting_code', label: 'planting_code' },
    { col: 'seedling_id', label: 'seedling_id' },
    { col: 'seedling_code', label: 'seedling_code' },
  ];
  for (const { col, label } of pestBizCols) {
    try {
      db.run(`ALTER TABLE pesticide_records ADD COLUMN ${col} TEXT`);
      seedLog.info(`✓ pesticide_records 表添加 ${label} 列`);
    } catch (e: any) {
      if (e.message.includes('duplicate column')) {
        seedLog.skip(`• pesticide_records.${label} 列已存在`);
      } else {
        seedLog.skip(`• pesticide_records.${label}:`, e.message);
      }
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

  // 2026-06-19: 添加 initial_count 列（创建种源时填的初始登记数量，固定值）
  // 区别于 quantity（入库累计 = initial + 累加入库）
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN initial_count REAL DEFAULT 0`);
    seedLog.info('✓ seed_sources 表添加 initial_count 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• seed_sources.initial_count 列已存在');
    else seedLog.skip('• seed_sources.initial_count:', e.message);
  }
  // 老数据回填：initial_count 默认等于 quantity（创建时填的数量等于 initial）
  try {
    const stmt = db.prepare(`UPDATE seed_sources SET initial_count = quantity WHERE initial_count = 0 AND quantity > 0 AND deleted_at IS NULL`);
    stmt.run();
    const changes = db.exec('SELECT changes()')[0]?.values[0]?.[0] || 0;
    if (Number(changes) > 0) {
      seedLog.info(`  ✓ 老种源 initial_count 回填：${changes} 条`);
    }
  } catch (e: any) {
    seedLog.error('initial_count 回填失败:', e.message);
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

  // 2026-06-29: 种植自留种功能合并 — seed_sources 加 seed_form 列
  // 存储种植自留种回流时的采收形态（果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他）
  // 老种源记录保持 NULL 不变（外部购买/历史数据不涉及此字段）
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN seed_form TEXT`);
    seedLog.info('✓ seed_sources 表添加 seed_form 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• seed_sources.seed_form 列已存在');
    else seedLog.skip('• seed_sources.seed_form:', e.message);
  }

  // 2026-07-01: 种源审计字段 — seed_sources 加 update_by 列
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN update_by TEXT`);
    seedLog.info('✓ seed_sources 表添加 update_by 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) seedLog.skip('• seed_sources.update_by 列已存在');
    else seedLog.skip('• seed_sources.update_by:', e.message);
  }

  // 注 2026-07-07: seed_sources.stock_instance_id 列已迁移至 server/scripts/db-migrations/migrateSeedSourcesToInventoryStock.ts
  //   原因: 启动白名单禁用了 fixMissingSchema（YELLOW 级），所有 schema 变更需走 scripts 路径

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

  // 2.1 库存冻结表补充列（2026-07-02: 实例级冻结功能补全）
  const freezeColumnsToAdd = [
    { name: 'instance_id', sql: 'ALTER TABLE inventory_freeze ADD COLUMN instance_id TEXT' },
    { name: 'freeze_type', sql: "ALTER TABLE inventory_freeze ADD COLUMN freeze_type TEXT DEFAULT 'manual'" },
    { name: 'customer_name', sql: 'ALTER TABLE inventory_freeze ADD COLUMN customer_name TEXT' },
    { name: 'delivery_date', sql: 'ALTER TABLE inventory_freeze ADD COLUMN delivery_date TEXT' },
    { name: 'purpose', sql: 'ALTER TABLE inventory_freeze ADD COLUMN purpose TEXT' },
    { name: 'operator_id', sql: 'ALTER TABLE inventory_freeze ADD COLUMN operator_id TEXT' },
    { name: 'operator_name', sql: 'ALTER TABLE inventory_freeze ADD COLUMN operator_name TEXT' },
    { name: 'freeze_date', sql: 'ALTER TABLE inventory_freeze ADD COLUMN freeze_date TEXT' },
    { name: 'unfreeze_date', sql: 'ALTER TABLE inventory_freeze ADD COLUMN unfreeze_date TEXT' },
    { name: 'updated_at', sql: 'ALTER TABLE inventory_freeze ADD COLUMN updated_at TEXT' },
  ];
  for (const col of freezeColumnsToAdd) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ inventory_freeze 表添加 ${col.name} 列`);
    } catch (e: any) {
      if (e.message.includes('duplicate column')) {
        seedLog.skip(`• inventory_freeze.${col.name} 列已存在`);
      } else {
        seedLog.skip(`• inventory_freeze.${col.name}:`, e.message);
      }
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

  // G12 2026-06-22: plant_label_resume 加 image_base64 列（履历拍照存证）
  try {
    db.run(`ALTER TABLE plant_label_resume ADD COLUMN image_base64 TEXT`);
    seedLog.info('✓ plant_label_resume 表添加 image_base64 列');
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) {
      seedLog.skip('• plant_label_resume.image_base64:', e.message);
    }
  }

  // 2026-06-23: 标签粒度扩展 — plant_labels +quantity/status, plant_label_resume +quantity_change/quantity_after/reason
  const labelCols = [
    { name: 'quantity', sql: 'ALTER TABLE plant_labels ADD COLUMN quantity INTEGER DEFAULT 1' },
    { name: 'status', sql: "ALTER TABLE plant_labels ADD COLUMN status TEXT DEFAULT 'active'" },
    { name: 'quantity_change', sql: 'ALTER TABLE plant_label_resume ADD COLUMN quantity_change INTEGER' },
    { name: 'quantity_after', sql: 'ALTER TABLE plant_label_resume ADD COLUMN quantity_after INTEGER' },
    { name: 'reason', sql: 'ALTER TABLE plant_label_resume ADD COLUMN reason TEXT' },
  ];
  for (const col of labelCols) {
    try {
      db.run(col.sql);
      seedLog.info(`✓ ${col.name} 列添加成功`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        seedLog.skip(`• ${col.name}: ${e.message}`);
      }
    }
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
    // 2026-06-19 unify-harvest-inbound-into-source-operations: 形态/类型字段
    { name: 'product_form', sql: "ALTER TABLE inventory_stock ADD COLUMN product_form TEXT" },        // 采收形态（果实/籽/枝条等）
    { name: 'propagation_form', sql: "ALTER TABLE inventory_stock ADD COLUMN propagation_form TEXT" }, // 种源形态（种子/种苗/实生苗/扦插苗/嫁接苗/组培苗/分株苗/种球/球根）
    { name: 'source_form', sql: "ALTER TABLE inventory_stock ADD COLUMN source_form TEXT" },          // 育苗/种植产物类型
    { name: 'area_name', sql: "ALTER TABLE inventory_stock ADD COLUMN area_name TEXT" },              // 2026-06-19: 种植区域（反查 plantings.area_name）
    // 2026-07-09 v5 阶段二（路径 B）：补录下沉到 inventory_stock 表
    // "自产（兜底）"模式作为统一入库入口，4 字段记录补录审计
    { name: 'is_supplementary', sql: "ALTER TABLE inventory_stock ADD COLUMN is_supplementary INTEGER DEFAULT 0" },  // 0=正常入库, 1=补录
    { name: 'supplementary_reason', sql: "ALTER TABLE inventory_stock ADD COLUMN supplementary_reason TEXT" },
    { name: 'supplementary_at', sql: "ALTER TABLE inventory_stock ADD COLUMN supplementary_at TEXT" },
    { name: 'supplementary_by', sql: "ALTER TABLE inventory_stock ADD COLUMN supplementary_by TEXT" },
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
    // 2026-07-14：补 FK 列索引——inventory_inbound_records.business_id 高频在 history-inbound 查询
    { name: 'idx_inbound_business', sql: 'CREATE INDEX IF NOT EXISTS idx_inbound_business ON inventory_inbound_records(business_id)' },
    // 2026-07-14：补 FK 列索引——propagation_records.seed_source_id 高频按种源查询
    { name: 'idx_propagation_seed_source', sql: 'CREATE INDEX IF NOT EXISTS idx_propagation_seed_source ON propagation_records(seed_source_id)' },
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
    // 2026-06-29: scripts/db-migrations 不在 tsconfig rootDir 内，用 Function 包装绕开 TS 模块解析
    const { runCreateCropCirculationRecordsMigration } = await (Function('return import("../../scripts/db-migrations/cropCirculationRecords")')() as Promise<any>);
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
    // 2026-06-29: scripts/db-migrations 不在 tsconfig rootDir 内，用 Function 包装绕开 TS 模块解析
    const { runAddOriginPathMigration } = await (Function('return import("../../scripts/db-migrations/originPath")')() as Promise<any>);
    runAddOriginPathMigration(db, { dryRun: false });
  } catch (e: any) {
    seedLog.skip('• plantings.origin_path 迁移:', e.message);
  }

  // 2026-06-12: 修复历史 B201/B202/B203 三条育苗计划 plan_code 为 NULL 的问题
  // 根因：seedData.ts 早期版本用 batch_code 字段名（DB 列名是 plan_code），导致 plan_code 全为 NULL
  fixProductionPlanSeedlingPlanCode();

  // 2026-06-12: 回溯修复历史"已审批通过但生产计划 batch_status 还是 pending"的脏数据
  fixApprovedProductionPlanStatus();

  // ============================================================
  // 2026-06-13: material_flow_log 流水表 + 存量表字段补齐
  // ============================================================
  seedLog.info('开始 material_flow_log 流水表迁移...\n');
  createMaterialFlowLogTable();

  // seedlings 加 unit 字段
  try {
    db.run("ALTER TABLE seedlings ADD COLUMN unit TEXT DEFAULT '株'");
    seedLog.info('  ✓ seedlings.unit 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - seedlings.unit 已存在，跳过');
    } else { seedLog.error(`  ✗ seedlings.unit 失败: ${e.message}`); }
  }
  // seedlings 加 deleted_at 字段
  try {
    db.run('ALTER TABLE seedlings ADD COLUMN deleted_at TEXT');
    seedLog.info('  ✓ seedlings.deleted_at 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - seedlings.deleted_at 已存在，跳过');
    } else { seedLog.error(`  ✗ seedlings.deleted_at 失败: ${e.message}`); }
  }
  // seedlings 加外部种源字段（2026-06-13）
  try { db.run("ALTER TABLE seedlings ADD COLUMN source_mode TEXT DEFAULT 'internal'"); seedLog.info('  ✓ seedlings.source_mode 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.source_mode 已存在，跳过'); else seedLog.error(`  ✗ seedlings.source_mode 失败: ${e.message}`); }
  // 2026-07-08 E2E 紧急修复：seedlings 表缺 crop_id 列（与 inventory_inbound_records 对齐；routes/inventory.ts fetchSourceRow 的 seedling 路由需要 SELECT crop_id）
  try { db.run("ALTER TABLE seedlings ADD COLUMN crop_id TEXT"); seedLog.info('  ✓ seedlings.crop_id 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.crop_id 已存在，跳过'); else seedLog.error(`  ✗ seedlings.crop_id 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN external_seed_code TEXT"); seedLog.info('  ✓ seedlings.external_seed_code 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.external_seed_code 已存在，跳过'); else seedLog.error(`  ✗ seedlings.external_seed_code 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN external_seed_name TEXT"); seedLog.info('  ✓ seedlings.external_seed_name 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.external_seed_name 已存在，跳过'); else seedLog.error(`  ✗ seedlings.external_seed_name 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN external_seed_quantity INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.external_seed_quantity 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.external_seed_quantity 已存在，跳过'); else seedLog.error(`  ✗ seedlings.external_seed_quantity 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN external_seed_note TEXT"); seedLog.info('  ✓ seedlings.external_seed_note 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.external_seed_note 已存在，跳过'); else seedLog.error(`  ✗ seedlings.external_seed_note 失败: ${e.message}`); }
  // 2026-06-14: 繁殖模式字段
  try { db.run("ALTER TABLE seedlings ADD COLUMN propagation_mode TEXT DEFAULT 'seed'"); seedLog.info('  ✓ seedlings.propagation_mode 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.propagation_mode 已存在，跳过'); else seedLog.error(`  ✗ seedlings.propagation_mode 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN mother_plant_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.mother_plant_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.mother_plant_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.mother_plant_count 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN expanded_plant_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.expanded_plant_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.expanded_plant_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.expanded_plant_count 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN scion_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.scion_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.scion_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.scion_count 失败: ${e.message}`); }
  // 2026-06-14: 种源扣减记录字段（用于 DELETE/PUT 反向补偿）
  try { db.run("ALTER TABLE seedlings ADD COLUMN source_deducted_quantity INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.source_deducted_quantity 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.source_deducted_quantity 已存在，跳过'); else seedLog.error(`  ✗ seedlings.source_deducted_quantity 失败: ${e.message}`); }
  // 2026-06-15: 负责人/工时字段（编辑弹窗"负责人"显示空 bug 修复）
  try { db.run("ALTER TABLE seedlings ADD COLUMN charge_person TEXT"); seedLog.info('  ✓ seedlings.charge_person 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.charge_person 已存在，跳过'); else seedLog.error(`  ✗ seedlings.charge_person 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN work_hours REAL"); seedLog.info('  ✓ seedlings.work_hours 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.work_hours 已存在，跳过'); else seedLog.error(`  ✗ seedlings.work_hours 失败: ${e.message}`); }

  // 2026-06-15: 数量体系重构 — 5 个新字段 DDL（拆分损耗/定植/采收）
  try { db.run("ALTER TABLE seedlings ADD COLUMN mother_loss_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.mother_loss_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.mother_loss_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.mother_loss_count 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN seedling_loss_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.seedling_loss_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.seedling_loss_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.seedling_loss_count 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN transplanted_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.transplanted_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.transplanted_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.transplanted_count 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN auto_planted_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.auto_planted_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.auto_planted_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.auto_planted_count 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN harvest_stocked_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.harvest_stocked_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.harvest_stocked_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.harvest_stocked_count 失败: ${e.message}`); }
  // 2026-06-16: 母株损耗历史脏数据修复标记列（防重复修复）
  try { db.run("ALTER TABLE seedlings ADD COLUMN mother_loss_fixed INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.mother_loss_fixed 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.mother_loss_fixed 已存在，跳过'); else seedLog.error(`  ✗ seedlings.mother_loss_fixed 失败: ${e.message}`); }
  // 2026-06-16: 补苗累计字段（1:1=补种子；1:多=补母株；严格区分母株/小苗池子）
  try { db.run("ALTER TABLE seedlings ADD COLUMN replant_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.replant_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.replant_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.replant_count 失败: ${e.message}`); }

  // 2026-07-21: 补全 5 个缺失字段（calculate_mode / propagation_multiple / custom_multiple / theoretical_yield / available_transplant_count）
  try { db.run("ALTER TABLE seedlings ADD COLUMN calculate_mode TEXT"); seedLog.info('  ✓ seedlings.calculate_mode 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.calculate_mode 已存在，跳过'); else seedLog.error(`  ✗ seedlings.calculate_mode 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN propagation_multiple REAL DEFAULT 0"); seedLog.info('  ✓ seedlings.propagation_multiple 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.propagation_multiple 已存在，跳过'); else seedLog.error(`  ✗ seedlings.propagation_multiple 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN custom_multiple REAL DEFAULT 0"); seedLog.info('  ✓ seedlings.custom_multiple 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.custom_multiple 已存在，跳过'); else seedLog.error(`  ✗ seedlings.custom_multiple 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN theoretical_yield REAL DEFAULT 0"); seedLog.info('  ✓ seedlings.theoretical_yield 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.theoretical_yield 已存在，跳过'); else seedLog.error(`  ✗ seedlings.theoretical_yield 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN available_transplant_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.available_transplant_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.available_transplant_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.available_transplant_count 失败: ${e.message}`); }

  // 2026-07-04 v3: 无性繁殖母株溯源列（铁律 #8 同步 schema.ts CREATE TABLE）
  // 2026-07-04 修复：POST /api/seedlings/with-deduct 报 no such column: mother_source_type
  // 根因：seedling.ts INSERT 列表加了 10 列（2026-07-03 v5），但 fixMissingSchema.ts 漏同步 ALTER TABLE
  try { db.run("ALTER TABLE seedlings ADD COLUMN mother_source_type TEXT"); seedLog.info('  ✓ seedlings.mother_source_type 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.mother_source_type 已存在，跳过'); else seedLog.error(`  ✗ seedlings.mother_source_type 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN mother_source_id TEXT"); seedLog.info('  ✓ seedlings.mother_source_id 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.mother_source_id 已存在，跳过'); else seedLog.error(`  ✗ seedlings.mother_source_id 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN mother_source_code TEXT"); seedLog.info('  ✓ seedlings.mother_source_code 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.mother_source_code 已存在，跳过'); else seedLog.error(`  ✗ seedlings.mother_source_code 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN propagation_method TEXT"); seedLog.info('  ✓ seedlings.propagation_method 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.propagation_method 已存在，跳过'); else seedLog.error(`  ✗ seedlings.propagation_method 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN inoculation_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.inoculation_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.inoculation_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.inoculation_count 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN survival_count INTEGER DEFAULT 0"); seedLog.info('  ✓ seedlings.survival_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.survival_count 已存在，跳过'); else seedLog.error(`  ✗ seedlings.survival_count 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN mother_generation TEXT"); seedLog.info('  ✓ seedlings.mother_generation 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.mother_generation 已存在，跳过'); else seedLog.error(`  ✗ seedlings.mother_generation 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN mother_crop_name TEXT"); seedLog.info('  ✓ seedlings.mother_crop_name 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.mother_crop_name 已存在，跳过'); else seedLog.error(`  ✗ seedlings.mother_crop_name 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN mother_propagation_method TEXT"); seedLog.info('  ✓ seedlings.mother_propagation_method 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.mother_propagation_method 已存在，跳过'); else seedLog.error(`  ✗ seedlings.mother_propagation_method 失败: ${e.message}`); }
  try { db.run("ALTER TABLE seedlings ADD COLUMN asexual_propagation_note TEXT"); seedLog.info('  ✓ seedlings.asexual_propagation_note 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - seedlings.asexual_propagation_note 已存在，跳过'); else seedLog.error(`  ✗ seedlings.asexual_propagation_note 失败: ${e.message}`); }

  // 2026-06-15: 数据迁移 — propagation_mode 6 种 → 2 种合并
  // 旧值: seed / layering / tissue_culture / cutting / division / grafting
  // 新值: one_to_one (seed/grafting) | one_to_many (layering/tissue_culture/cutting/division)
  try {
    db.run("UPDATE seedlings SET propagation_mode = 'one_to_one' WHERE propagation_mode IN ('seed', 'grafting')");
    db.run("UPDATE seedlings SET propagation_mode = 'one_to_many' WHERE propagation_mode IN ('layering', 'tissue_culture', 'cutting', 'division')");
    seedLog.info('  ✓ seedlings.propagation_mode 6→2 合并完成');
  } catch (e: any) { seedLog.error(`  ✗ propagation_mode 合并失败: ${e.message}`); }

  // 2026-06-15: 数据迁移 — 1:1 模式 mother_plant_count 回填为 seedling_quantity
  // 兜底历史数据：早期 1:1 模式没填 mother_plant_count，按 seedling_quantity 等价回填
  try {
    db.run("UPDATE seedlings SET mother_plant_count = seedling_quantity WHERE propagation_mode = 'one_to_one' AND (mother_plant_count IS NULL OR mother_plant_count = 0)");
    seedLog.info('  ✓ seedlings 1:1 模式 mother_plant_count 回填完成');
  } catch (e: any) { seedLog.error(`  ✗ 1:1 模式 mother_plant_count 回填失败: ${e.message}`); }

  // 2026-06-16: 1:多 模式回填 — mother_plant_count=seedling_quantity, expanded_plant_count=COALESCE(survival_quantity, mother_plant_count)
  // 兜底历史数据：1:多 模式 initial 字段 = 母株数，survival_quantity = 累计小苗产出
  try {
    db.run(`UPDATE seedlings
            SET mother_plant_count = COALESCE(mother_plant_count, seedling_quantity, 0),
                expanded_plant_count = COALESCE(NULLIF(expanded_plant_count, 0), survival_quantity, mother_plant_count, 0)
            WHERE propagation_mode = 'one_to_many'`);
    seedLog.info('  ✓ seedlings 1:多 模式回填完成');
  } catch (e: any) { seedLog.error(`  ✗ 1:多 模式回填失败: ${e.message}`); }

  // 2026-06-16: 1:多 模式历史脏数据修复 — 见 POST /api/seedlings/fix-mother-loss
  // 不在启动时自动跑（避免重复修复），需手动调一次 API

  // 2026-06-15: 数据迁移 — 旧字段值迁移到新字段（保留历史已记录的数据）
  // planted_count → transplanted_count（已定植数）
  // loss_count → seedling_loss_count（已损耗苗数）
  try {
    db.run("UPDATE seedlings SET transplanted_count = planted_count WHERE transplanted_count = 0 AND planted_count > 0");
    db.run("UPDATE seedlings SET seedling_loss_count = loss_count WHERE seedling_loss_count = 0 AND loss_count > 0");
    seedLog.info('  ✓ seedlings 旧字段值迁移到新字段完成');
  } catch (e: any) { seedLog.error(`  ✗ 旧字段迁移失败: ${e.message}`); }
  // 2026-06-14: 生产计划目标语义字段（区分投入/产出/扩繁）
  try { db.run("ALTER TABLE production_plans ADD COLUMN target_input_count INTEGER DEFAULT 0"); seedLog.info('  ✓ production_plans.target_input_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - production_plans.target_input_count 已存在，跳过'); else seedLog.error(`  ✗ production_plans.target_input_count 失败: ${e.message}`); }
  try { db.run("ALTER TABLE production_plans ADD COLUMN target_output_count INTEGER DEFAULT 0"); seedLog.info('  ✓ production_plans.target_output_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - production_plans.target_output_count 已存在，跳过'); else seedLog.error(`  ✗ production_plans.target_output_count 失败: ${e.message}`); }
  try { db.run("ALTER TABLE production_plans ADD COLUMN target_expanded_count INTEGER DEFAULT 0"); seedLog.info('  ✓ production_plans.target_expanded_count 字段已添加'); } catch (e: any) { if (e.message?.includes('duplicate column')) seedLog.info('  - production_plans.target_expanded_count 已存在，跳过'); else seedLog.error(`  ✗ production_plans.target_expanded_count 失败: ${e.message}`); }
  // 2026-06-14: 历史数据回填 — 所有现有 seedlings 默认视为 seed 模式
  try {
    const upd = db.run("UPDATE seedlings SET propagation_mode = 'seed' WHERE propagation_mode IS NULL OR propagation_mode = ''");
    seedLog.info(`  ✓ seedlings 历史 propagation_mode 回填完成`);
  } catch (e: any) { seedLog.error(`  ✗ propagation_mode 历史回填失败: ${e.message}`); }
  // plantings 加 unit 字段
  try {
    db.run("ALTER TABLE plantings ADD COLUMN unit TEXT DEFAULT '株'");
    seedLog.info('  ✓ plantings.unit 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - plantings.unit 已存在，跳过');
    } else { seedLog.error(`  ✗ plantings.unit 失败: ${e.message}`); }
  }
  // plantings 加 deleted_at 字段
  try {
    db.run('ALTER TABLE plantings ADD COLUMN deleted_at TEXT');
    seedLog.info('  ✓ plantings.deleted_at 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - plantings.deleted_at 已存在，跳过');
    } else { seedLog.error(`  ✗ plantings.deleted_at 失败: ${e.message}`); }
  }
  // seed_sources 加 deleted_at 字段
  try {
    db.run('ALTER TABLE seed_sources ADD COLUMN deleted_at TEXT');
    seedLog.info('  ✓ seed_sources.deleted_at 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - seed_sources.deleted_at 已存在，跳过');
    } else { seedLog.error(`  ✗ seed_sources.deleted_at 失败: ${e.message}`); }
  }

  // 2026-06-28: 一次性补偿存量数据 — 把所有 seedlings 旧字段（survival_quantity/loss_count/survival_rate/loss_rate）从新字段派生同步
  // 修复"标签打印预览显示成活数量=0、成活率=0%"的 bug
  // 根因：daily_records 累加只更新了新字段，旧字段从未同步
  try {
    const result = db.run(`
      UPDATE seedlings
      SET
        loss_count = seedling_loss_count,
        survival_quantity = MAX(0, seedling_quantity - seedling_loss_count),
        survival_rate = CASE
          WHEN seedling_quantity > 0
          THEN ROUND((CAST(MAX(0, seedling_quantity - seedling_loss_count) AS REAL) / seedling_quantity) * 100, 1)
          ELSE 0
        END,
        loss_rate = CASE
          WHEN seedling_quantity > 0
          THEN ROUND((CAST(seedling_loss_count AS REAL) / seedling_quantity) * 100, 1)
          ELSE 0
        END
      WHERE deleted_at IS NULL
    `);
    seedLog.info(`  ✓ seedlings 旧字段一次性同步完成（影响行数：${(result as any)?.changes ?? '?'}）`);
  } catch (e: any) {
    seedLog.error(`  ✗ seedlings 旧字段同步失败: ${e.message}`);
  }

  // 2026-06-28: 修复"标签重复入库"bug — 给 plant_labels.label_number 加 UNIQUE 索引（先清理重复数据）
  // 根因：原 schema label_number 无 UNIQUE 约束 + 后端 /batch-create 不检查重复，导致前端生成相同编号多次入库
  // 修复策略：先按 (label_number, seedling_id) 分组保留 id 最小的一条，其他删除；然后加 UNIQUE INDEX
  try {
    // 步骤 1：清理重复数据（保留每组最早的记录）
    const dedupeResult = db.run(`
      DELETE FROM plant_labels
      WHERE id NOT IN (
        SELECT MIN(id) FROM plant_labels GROUP BY label_number
      )
    `);
    seedLog.info(`  ✓ plant_labels 重复数据清理完成（删除行数：${(dedupeResult as any)?.changes ?? '?'}）`);

    // 步骤 2：添加 UNIQUE INDEX（幂等：CREATE UNIQUE INDEX IF NOT EXISTS）
    db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_plant_labels_label_number_unique ON plant_labels(label_number)`);
    seedLog.info(`  ✓ plant_labels.label_number UNIQUE INDEX 已添加`);
  } catch (e: any) {
    seedLog.error(`  ✗ plant_labels UNIQUE 约束添加失败: ${e.message}`);
  }

  // 2026-06-27: seedlings 加 seedling_form 列（种苗形态 — 详情弹窗"种苗类型"列数据源）
  try {
    db.run(`ALTER TABLE seedlings ADD COLUMN seedling_form TEXT`);
    seedLog.info('✓ seedlings 表添加 seedling_form 列');
  } catch (e: any) {
    seedLog.skip('• seedlings.seedling_form:', e.message);
  }

  // 2026-07-01: 种源标签管理 — plant_labels 加 seed_source_id 列
  try {
    db.run(`ALTER TABLE plant_labels ADD COLUMN seed_source_id TEXT`);
    seedLog.info('✓ plant_labels 表添加 seed_source_id 列');
  } catch (e: any) {
    seedLog.skip('• plant_labels.seed_source_id:', e.message);
  }

  // 2026-06-24: 库存调拨入种源功能 — seed_sources 加 14 个 transfer 元数据列
  // transferred_from_stock_id: 外键回指原 inventory_stock.id（追溯锚点）
  // transferred_from_business_type / business_id: 原库存所属业务类型 + 业务ID
  // original_*: 全量携带原库存元数据（品种/采收时间/来源/价格等）
  const transferColumns = [
    { name: 'transferred_from_stock_id', sql: 'INTEGER REFERENCES inventory_stock(id)' },
    { name: 'transferred_from_business_type', sql: 'TEXT' },
    { name: 'transferred_from_business_id', sql: 'TEXT' },
    { name: 'original_inbound_date', sql: 'TEXT' },
    { name: 'original_source_module', sql: 'TEXT' },
    { name: 'original_source_id', sql: 'TEXT' },
    { name: 'original_harvest_record_id', sql: 'TEXT' },
    { name: 'original_crop_id', sql: 'TEXT' },
    { name: 'original_crop_name', sql: 'TEXT' },
    { name: 'original_variety_id', sql: 'TEXT' },
    { name: 'original_variety_name', sql: 'TEXT' },
    { name: 'original_unit', sql: 'TEXT' },
    { name: 'original_unit_price', sql: 'REAL' },
    { name: 'original_supplier_id', sql: 'TEXT' },
    { name: 'original_supplier_name', sql: 'TEXT' },
    { name: 'original_production_plan_code', sql: 'TEXT' },
  ];
  for (const col of transferColumns) {
    try {
      db.run(`ALTER TABLE seed_sources ADD COLUMN ${col.name} ${col.sql}`);
      seedLog.info(`  ✓ seed_sources.${col.name} 字段已添加`);
    } catch (e: any) {
      if (e.message?.includes('duplicate column')) {
        seedLog.info(`  - seed_sources.${col.name} 已存在，跳过`);
      } else { seedLog.error(`  ✗ seed_sources.${col.name} 失败: ${e.message}`); }
    }
  }

  // material_flow_log 加 business_code 字段（幂等补列）
  try {
    db.run('ALTER TABLE material_flow_log ADD COLUMN business_code TEXT');
    seedLog.info('  ✓ material_flow_log.business_code 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - material_flow_log.business_code 已存在，跳过');
    } else { seedLog.error(`  ✗ material_flow_log.business_code 失败: ${e.message}`); }
  }

  // 2026-06-17: 种植采收记录功能（Phase 1）— 4 个改动
  // 1. plantings 表加 is_harvest_locked 列（软锁：标 1 后不允许新增采收记录）
  try {
    db.run('ALTER TABLE plantings ADD COLUMN is_harvest_locked INTEGER DEFAULT 0');
    seedLog.info('  ✓ plantings.is_harvest_locked 字段已添加');
  } catch (e: any) {
    if (e.message?.includes('duplicate column')) {
      seedLog.info('  - plantings.is_harvest_locked 已存在，跳过');
    } else { seedLog.error(`  ✗ plantings.is_harvest_locked 失败: ${e.message}`); }
  }

  // 2. 建 planting_harvest_records 表（采收/淘汰/损耗/分级 多记录明细）
  db.run(`
    CREATE TABLE IF NOT EXISTS planting_harvest_records (
      id TEXT PRIMARY KEY,
      oid TEXT,
      record_type TEXT DEFAULT 'planting',
      record_date TEXT NOT NULL,
      planting_id TEXT NOT NULL,
      planting_code TEXT,
      destination TEXT NOT NULL,
      sub_type TEXT,
      warehouse_id TEXT,
      warehouse_name TEXT,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT 'g',
      notes TEXT,
      operator_name TEXT,
      create_by TEXT,
      create_by_id TEXT,
      create_time TEXT NOT NULL,
      update_time TEXT NOT NULL,
      harvest_record_id TEXT,
      inventory_stock_id TEXT,
      circulation_record_id TEXT,
      -- 2026-07-19: circulation revoke audit (留种回流撤销 — 撤销不删本行，仅记录)
      circulation_revoked_at TEXT,
      circulation_revoked_by TEXT,
      circulation_revoke_reason TEXT,
      -- 2026-06-19 unify-harvest-inbound-into-source-operations: 采收形态
      source_form TEXT,  -- 果实/种子/种苗/穗条/枝条/块根/块茎/鳞茎/叶片/花朵/整株/其他
      FOREIGN KEY (planting_id) REFERENCES plantings(id)
    )
  `);
  seedLog.info('  ✓ planting_harvest_records 表结构确认');

  // 2.5 ALTER TABLE 补列（已存在的表）
  const plantingHarvestColumnsToAdd = [
    // 2026-06-19 unify-harvest-inbound-into-source-operations: 采收形态
    { name: 'source_form', sql: "ALTER TABLE planting_harvest_records ADD COLUMN source_form TEXT" },
    // 2026-07-09 v5 阶段二（方案 E）：补录是采收记录的属性 — 不再依赖 planting.endType='abnormal' 字段
    // 任何"已结束"种植/育苗行写采收记录时自动打标 is_supplementary=1，必填补录原因
    { name: 'is_supplementary', sql: "ALTER TABLE planting_harvest_records ADD COLUMN is_supplementary INTEGER DEFAULT 0" },
    { name: 'supplementary_reason', sql: "ALTER TABLE planting_harvest_records ADD COLUMN supplementary_reason TEXT" },
    { name: 'supplementary_at', sql: "ALTER TABLE planting_harvest_records ADD COLUMN supplementary_at TEXT" },
    { name: 'supplementary_by', sql: "ALTER TABLE planting_harvest_records ADD COLUMN supplementary_by TEXT" },
    // 2026-07-19：留种回流撤销时记录"该次采收对应的回流被撤销"（仅记录不删数据）
    { name: 'circulation_revoked_at', sql: "ALTER TABLE planting_harvest_records ADD COLUMN circulation_revoked_at TEXT" },
    { name: 'circulation_revoked_by', sql: "ALTER TABLE planting_harvest_records ADD COLUMN circulation_revoked_by TEXT" },
    { name: 'circulation_revoke_reason', sql: "ALTER TABLE planting_harvest_records ADD COLUMN circulation_revoke_reason TEXT" },
  ]
  for (const col of plantingHarvestColumnsToAdd) {
    try {
      db.run(col.sql)
      seedLog.info(`✓ planting_harvest_records 表添加 ${col.name} 列`)
    } catch (e: any) {
      if (e.message.includes('duplicate column')) {
        seedLog.skip(`• planting_harvest_records.${col.name} 列已存在`)
      } else {
        seedLog.skip(`• planting_harvest_records.${col.name}: ${e.message}`)
      }
    }
  }

  // 3. 索引：加速 GET /plantings 列表的 4 列聚合（harvest_total / cull_total / loss_total / grade_total）
  db.run(`CREATE INDEX IF NOT EXISTS idx_phr_planting_dest ON planting_harvest_records (planting_id, destination)`);
  seedLog.info('  ✓ idx_phr_planting_dest 索引确认');

  // 4. 历史数据迁移：旧已结束记录自动标锁定（一次性，幂等 — 已锁的不会重复执行）
  const lockStmt = db.prepare(`
    UPDATE plantings
    SET is_harvest_locked = 1
    WHERE deleted_at IS NULL
      AND is_harvest_locked = 0
      AND (end_time IS NOT NULL OR status IN ('ended', 'cancelled'))
  `);
  lockStmt.run();
  lockStmt.free();
  seedLog.info('  ✓ 历史已结束种植记录已自动锁定（is_harvest_locked=1）');

  // ============================================================
  // P1 修复 (2026-06-17): crop_circulation_records.parent_source_id NOT NULL 约束
  // 根因: dispose 分支(planting.ts:980-991 和 1175-1192)写 circulation 记录时
  //   parent_source_id 传 NULL, 但 schema 是 NOT NULL, 导致 dispose 调用必失败
  // 修复: 重建表让 parent_source_id 和 source_id 变为 nullable (12 步法)
  //   - DISPOSAL 类型销毁无"父种源", NULL 是业务正确语义
  //   - PROPAGATION/QUANTITY 业务代码仍强制填非空值(CirculationInputSchema)
  //   - FK 约束保留(SQLite FK 允许 NULL, 且项目 fk pragma=0 不强制检查)
  // 幂等: 用 PRAGMA table_info 检查现状, 已 nullable 则跳过
  // ============================================================
  try {
    const circInfo = db.exec("PRAGMA table_info(crop_circulation_records)");
    const cols = (circInfo[0]?.values || []) as Array<[number, string, string, number, unknown, number]>;
    const parentNotNull = cols.find(c => c[1] === 'parent_source_id')?.[3] === 1;
    const sourceNotNull = cols.find(c => c[1] === 'source_id')?.[3] === 1;
    if (parentNotNull || sourceNotNull) {
      seedLog.info('  [P1-fix] crop_circulation_records parent_source_id/source_id NOT NULL 检测到, 开始重建表...');
      db.run(`
        CREATE TABLE crop_circulation_records_new (
          id TEXT PRIMARY KEY,
          circulation_type TEXT NOT NULL
            CHECK(circulation_type IN ('PROPAGATION','QUANTITY','DISPOSAL')),
          source_module TEXT NOT NULL
            CHECK(source_module IN ('planting','harvest','seedling')),
          source_id TEXT,
          parent_source_id TEXT,
          new_source_id TEXT,
          quantity REAL,
          unit TEXT,
          circulation_date TEXT NOT NULL,
          operator_id TEXT,
          notes TEXT,
          residue_type TEXT
            CHECK(residue_type IS NULL OR residue_type IN ('STEM','ROOT','BRANCH','OTHER')),
          disposition TEXT
            CHECK(disposition IS NULL OR disposition IN ('CIRCULATE','DISPOSAL','SALES')),
          is_revoked INTEGER DEFAULT 0,
          revoked_at TEXT,
          revoked_by TEXT,
          created_at TEXT DEFAULT (datetime('now','localtime')),
          FOREIGN KEY (parent_source_id) REFERENCES seed_sources(id),
          FOREIGN KEY (new_source_id) REFERENCES seed_sources(id)
        )
      `);
      const copyStmt = db.prepare(`INSERT INTO crop_circulation_records_new SELECT * FROM crop_circulation_records`);
      copyStmt.run();
      copyStmt.free();
      db.run('DROP TABLE crop_circulation_records');
      db.run('ALTER TABLE crop_circulation_records_new RENAME TO crop_circulation_records');
      db.run('CREATE INDEX idx_circ_parent ON crop_circulation_records(parent_source_id)');
      db.run('CREATE INDEX idx_circ_source ON crop_circulation_records(source_module, source_id)');
      db.run('CREATE INDEX idx_circ_revoked ON crop_circulation_records(is_revoked) WHERE is_revoked = 0');
      const afterInfo = db.exec("PRAGMA table_info(crop_circulation_records)");
      const afterCols = (afterInfo[0]?.values || []) as Array<[number, string, string, number, unknown, number]>;
      const parentOk = afterCols.find(c => c[1] === 'parent_source_id')?.[3] === 0;
      const sourceOk = afterCols.find(c => c[1] === 'source_id')?.[3] === 0;
      if (parentOk && sourceOk) {
        seedLog.info('  [P1-fix] ✓ crop_circulation_records 重建成功 (parent_source_id/source_id nullable)');
      } else {
        seedLog.error(`  [P1-fix] ✗ 重建后字段未变 nullable, parentOk=${parentOk} sourceOk=${sourceOk}`);
      }
    } else {
      seedLog.skip('  [P1-fix] crop_circulation_records.parent_source_id/source_id 已 nullable, 跳过重建');
    }
  } catch (e: any) {
    seedLog.error(`  [P1-fix] ✗ crop_circulation_records 重建失败: ${e.message}`);
  }

  // 2026-06-21: 种植 stocks 表（任务 1+2 引入）
  createPlantingAreaStocksTable(db);
  migrateToAreaStocks(db);

  // 2026-06-30：seed_sources.seed_form 一次性回填（按 source_type 映射）
  // 老种源记录保持 NULL 不变时（外部购买/历史数据不涉及此字段），按 source_type 给个合理默认值
  // 外部购买/采购基本是"种子"，回流的"cutting/grafting/..."等是繁殖类型
  try {
    const seedFormMap: Array<[string, string]> = [
      ['seed', '种子'], ['seedling', '种苗'], ['cutting', '穗条'],
      ['grafting', '枝条'], ['tissue_culture', '其他'], ['split', '整株'],
      ['bulb', '鳞茎'], ['other', '其他'],
    ];
    for (const [srcType, seedForm] of seedFormMap) {
      db.run(
        `UPDATE seed_sources SET seed_form = ? WHERE source_type = ? AND (seed_form IS NULL OR seed_form = '')`,
        [seedForm, srcType]
      );
    }
    saveDatabase();
  } catch (e: any) {
    seedLog.error('seed_form 回填失败：', e.message);
  }

  // 2026-07-15：每日记录同步溯源列（fertilizer_records / pesticide_records 加 source 字段）
  const syncSourceColumns = [
    { table: 'fertilizer_records', col: 'source_daily_record_id', sql: 'ALTER TABLE fertilizer_records ADD COLUMN source_daily_record_id TEXT' },
    { table: 'fertilizer_records', col: 'source_item_id', sql: 'ALTER TABLE fertilizer_records ADD COLUMN source_item_id TEXT' },
    { table: 'fertilizer_records', col: 'source_type', sql: "ALTER TABLE fertilizer_records ADD COLUMN source_type TEXT DEFAULT 'manual'" },
    { table: 'pesticide_records', col: 'source_daily_record_id', sql: 'ALTER TABLE pesticide_records ADD COLUMN source_daily_record_id TEXT' },
    { table: 'pesticide_records', col: 'source_item_id', sql: 'ALTER TABLE pesticide_records ADD COLUMN source_item_id TEXT' },
    { table: 'pesticide_records', col: 'source_type', sql: "ALTER TABLE pesticide_records ADD COLUMN source_type TEXT DEFAULT 'manual'" },
    // 2026-07-15：真实 code 列（用于 DELETE 恢复库存时关联 fertilizer_specs / pesticide_specs）
    // 因为 fertilizer_code / record_code 存 syncId 是 UNIQUE 的，无法用真实 code 重复
    { table: 'fertilizer_records', col: 'real_fertilizer_code', sql: 'ALTER TABLE fertilizer_records ADD COLUMN real_fertilizer_code TEXT' },
    { table: 'pesticide_records', col: 'real_pesticide_code', sql: 'ALTER TABLE pesticide_records ADD COLUMN real_pesticide_code TEXT' },
    // 2026-07-15：区域字段（修复同步后 greenhouse_name 为空 — 改用 area_name 优先）
    { table: 'fertilizer_records', col: 'area_id', sql: 'ALTER TABLE fertilizer_records ADD COLUMN area_id TEXT' },
    { table: 'fertilizer_records', col: 'area_name', sql: 'ALTER TABLE fertilizer_records ADD COLUMN area_name TEXT' },
    // 2026-07-20：多作物名 JSON 数组（支持跨作物批量施肥）
    { table: 'fertilizer_records', col: 'crop_names', sql: 'ALTER TABLE fertilizer_records ADD COLUMN crop_names TEXT' },
    // 2026-07-21：病虫害记录同步加多作物名支持
    { table: 'pesticide_records', col: 'crop_names', sql: 'ALTER TABLE pesticide_records ADD COLUMN crop_names TEXT' },
    // 2026-07-21：浇水记录同步加多作物名支持
    { table: 'watering_records', col: 'crop_names', sql: 'ALTER TABLE watering_records ADD COLUMN crop_names TEXT' },
    { table: 'pesticide_records', col: 'area_id', sql: 'ALTER TABLE pesticide_records ADD COLUMN area_id TEXT' },
    { table: 'pesticide_records', col: 'area_name', sql: 'ALTER TABLE pesticide_records ADD COLUMN area_name TEXT' },
  ];
  for (const { table, col, sql } of syncSourceColumns) {
    try {
      db.run(sql);
      seedLog.info(`✓ ${table} 添加 ${col} 列（每日记录同步溯源）`);
    } catch (e: any) {
      if (e.message.includes('duplicate column')) {
        seedLog.skip(`• ${table}.${col} 列已存在`);
      } else {
        seedLog.error(`• ${table}.${col} 失败:`, e.message);
      }
    }
  }

  // 2026-07-16：肥料模块 3 张表补索引（修 database-reviewer M-3 表无索引导致 10k+ 行时劣化 100x）
  const fertilizerIndexes = [
    { name: 'idx_fertilizer_records_create_time', sql: 'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_create_time ON fertilizer_records(create_time DESC)' },
    { name: 'idx_fertilizer_records_fertilize_time', sql: 'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_fertilize_time ON fertilizer_records(fertilize_time DESC)' },
    { name: 'idx_fertilizer_records_planting_id', sql: 'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_planting_id ON fertilizer_records(planting_id)' },
    { name: 'idx_fertilizer_records_seedling_id', sql: 'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_seedling_id ON fertilizer_records(seedling_id)' },
    { name: 'idx_fertilizer_records_data_source', sql: 'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_data_source ON fertilizer_records(data_source)' },
    { name: 'idx_fertilizer_records_crop_name', sql: 'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_crop_name ON fertilizer_records(crop_name)' },
    { name: 'idx_fertilizer_specs_fertilizer_code', sql: 'CREATE INDEX IF NOT EXISTS idx_fertilizer_specs_fertilizer_code ON fertilizer_specs(fertilizer_code)' },
    { name: 'idx_fertilizer_specs_status', sql: 'CREATE INDEX IF NOT EXISTS idx_fertilizer_specs_status ON fertilizer_specs(status)' },
    // 2026-07-16 审核补充：generateCode LIKE 前缀查询 + IoT 去重高频索引
    { name: 'idx_fertilizer_records_fertilizer_code', sql: 'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_fertilizer_code ON fertilizer_records(fertilizer_code)' },
    { name: 'idx_fertilizer_records_iot_record_id', sql: 'CREATE INDEX IF NOT EXISTS idx_fertilizer_records_iot_record_id ON fertilizer_records(iot_record_id)' },
  ];
  for (const idx of fertilizerIndexes) {
    try {
      db.exec(idx.sql);
      seedLog.info(`✓ 创建索引 ${idx.name}`);
    } catch (e: any) {
      seedLog.skip(`• 索引 ${idx.name}: ${e.message}`);
    }
  }

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
// 2026-07-15：存量每日记录施肥/用药子记录同步到施肥/病虫害管理页（一次性迁移）
// 幂等设计：检查 source_daily_record_id 存在则跳过
export function backfillDailyFertilPesticide(): void {
  const db = getDatabase();

  // 安全检查：列存在才执行
  try {
    db.exec('SELECT source_daily_record_id FROM fertilizer_records LIMIT 0');
    db.exec('SELECT source_daily_record_id FROM pesticide_records LIMIT 0');
  } catch (e: any) {
    seedLog.skip('• 每日记录同步溯源列不存在，跳过存量补录');
    return;
  }

  let fertCount = 0;
  let pestCount = 0;

  try {
    const rows = db.exec(
      `SELECT id, record_type, related_id, record_date, data
       FROM daily_records
       WHERE record_type IN ('planting', 'seedling')
         AND data IS NOT NULL AND data != ''`
    );
    if (!rows || rows.length === 0 || !rows[0].values || rows[0].values.length === 0) {
      seedLog.info('• 每日记录为空，跳过存量补录');
      return;
    }

    const cols = rows[0].columns;
    const dataIdx = cols.indexOf('data');
    const idIdx = cols.indexOf('id');
    const typeIdx = cols.indexOf('record_type');
    const relatedIdx = cols.indexOf('related_id');
    const dateIdx = cols.indexOf('record_date');

    for (const row of rows[0].values) {
      const dailyRecordId = row[idIdx] as string;
      const recordType = row[typeIdx] as string;
      const relatedId = row[relatedIdx] as string;
      const recordDate = row[dateIdx] as string;
      const dataJson = row[dataIdx] as string;

      if (!dataJson) continue;
      let parsed: any;
      try { parsed = JSON.parse(dataJson); } catch { continue; }

      // 施肥
      const fertItems: any[] = parsed?.fertilizerRecords || [];
      if (fertItems.length > 0) {
        for (const item of fertItems) {
          if (!item.name || !item.amount) continue;
          // 幂等检查
          const existing = db.exec(
            `SELECT id FROM fertilizer_records WHERE source_daily_record_id = ? AND source_item_id = ?`,
            [dailyRecordId, item.id]
          );
          if (existing?.[0]?.values?.length) continue;

          const itemId = `FR-${dailyRecordId.slice(-6)}-${item.id}`;
          const dil = item.dilutionType === 'dilute' && item.dilution ? `1:${item.dilution}` : 'dry';
          // 2026-07-15：存量补录也带上 relatedCode 便于溯源
          const relatedCode = (() => {
            try {
              const stmt = db.prepare(`SELECT ${recordType === 'planting' ? 'planting_code' : 'seedling_code'} FROM ${recordType === 'planting' ? 'plantings' : 'seedlings'} WHERE id = ?`);
              stmt.bind([relatedId]);
              if (stmt.step()) return stmt.getAsObject()[0] as string || '';
            } catch { /* ignore */ }
            return '';
          })();
          db.run(
            `INSERT OR IGNORE INTO fertilizer_records (id, fertilizer_code, planting_id, planting_code, seedling_id, seedling_code, greenhouse_name, crop_name, crop_variety, fertilizer_name, fertilizer_type, dilution_ratio, quantity, unit, fertilize_time, description, data_source, source_type, source_daily_record_id, source_item_id, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'daily_record', 'daily_record_sync', ?, ?, ?)`,
            [itemId, itemId, recordType === 'planting' ? relatedId : null, recordType === 'planting' ? relatedCode : null, recordType === 'seedling' ? relatedId : null, recordType === 'seedling' ? relatedCode : null, '', '', '', item.name, item.category || '', dil, item.amount || 0, item.unit || 'kg', recordDate, item.notes || item.applicationMethod || '', dailyRecordId, item.id, nowLocalTimestamp()]
          );
          fertCount++;
        }
      }

      // 用药
      const pestItems: any[] = parsed?.pesticideRecords || [];
      if (pestItems.length > 0) {
        for (const item of pestItems) {
          if (!item.name || !item.amount) continue;
          const existing = db.exec(
            `SELECT id FROM pesticide_records WHERE source_daily_record_id = ? AND source_item_id = ?`,
            [dailyRecordId, item.id]
          );
          if (existing?.[0]?.values?.length) continue;

          const itemId = `PR-${dailyRecordId.slice(-6)}-${item.id}`;
          const dil = item.dilutionType === 'dilute' && item.dilution ? `1:${item.dilution}` : 'dry';
          const relatedCode2 = (() => {
            try {
              const stmt = db.prepare(`SELECT ${recordType === 'planting' ? 'planting_code' : 'seedling_code'} FROM ${recordType === 'planting' ? 'plantings' : 'seedlings'} WHERE id = ?`);
              stmt.bind([relatedId]);
              if (stmt.step()) return stmt.getAsObject()[0] as string || '';
            } catch { /* ignore */ }
            return '';
          })();
          db.run(
            `INSERT OR IGNORE INTO pesticide_records (id, record_code, planting_id, planting_code, seedling_id, seedling_code, greenhouse_name, crop_name, pesticide_name, pesticide_type, dilution_ratio, dosage, dosage_unit, target_pest, safety_interval, description, source_type, source_daily_record_id, source_item_id, spray_time, create_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'daily_record_sync', ?, ?, ?)`,
            [itemId, itemId, recordType === 'planting' ? relatedId : null, recordType === 'planting' ? relatedCode2 : null, recordType === 'seedling' ? relatedId : null, recordType === 'seedling' ? relatedCode2 : null, '', '', item.name, item.category || '', dil, item.amount || 0, item.unit || 'L', item.targetPest || '', item.safetyInterval || null, item.notes || item.applicationMethod || '', dailyRecordId, item.id, recordDate, nowLocalTimestamp()]
          );
          pestCount++;
        }
      }
    }

    saveDatabase();
    seedLog.info(`✓ 存量补录完成: ${fertCount} 条施肥 + ${pestCount} 条用药`);
  } catch (e: any) {
    seedLog.error('• 存量补录失败（不影响其他迁移）:', e.message);
  }
}

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

  // ========== 2026-06-18: 库存入库按模块下沉 (方向 A + 选项 B) ==========
  // 1) inventory_stock 缺失列：unit_price / total_amount / quality_grade /
  //    supplier_id / supplier_name / source_id / source_module / notes / source_type / production_plan_id
  // 2) 新表 inventory_inbound_records：入库审计
  // 3) 3 个索引加速 source / stock_type+date / warehouse 查询
  try {
    // 列补全（duplicate column 自动跳过）
    const stockColumns = [
      { name: 'unit_price', sql: 'ALTER TABLE inventory_stock ADD COLUMN unit_price REAL DEFAULT 0' },
      { name: 'total_amount', sql: 'ALTER TABLE inventory_stock ADD COLUMN total_amount REAL DEFAULT 0' },
      { name: 'quality_grade', sql: 'ALTER TABLE inventory_stock ADD COLUMN quality_grade TEXT' },
      { name: 'supplier_id', sql: 'ALTER TABLE inventory_stock ADD COLUMN supplier_id TEXT' },
      { name: 'supplier_name', sql: 'ALTER TABLE inventory_stock ADD COLUMN supplier_name TEXT' },
      { name: 'source_module', sql: "ALTER TABLE inventory_stock ADD COLUMN source_module TEXT" },
      { name: 'source_id', sql: 'ALTER TABLE inventory_stock ADD COLUMN source_id TEXT' },
      { name: 'notes', sql: 'ALTER TABLE inventory_stock ADD COLUMN notes TEXT' },
      { name: 'source_type', sql: "ALTER TABLE inventory_stock ADD COLUMN source_type TEXT" },
      { name: 'production_plan_id', sql: 'ALTER TABLE inventory_stock ADD COLUMN production_plan_id TEXT' },
    ];
    for (const c of stockColumns) {
      try {
        db.run(c.sql);
        seedLog.info(`  ✓ inventory_stock.${c.name} 字段已添加`);
      } catch (e: any) {
        if (e.message?.includes('duplicate column')) {
          seedLog.info(`  - inventory_stock.${c.name} 已存在，跳过`);
        } else {
          seedLog.error(`  ✗ inventory_stock.${c.name} 失败: ${e.message}`);
        }
      }
    }
  } catch (e: any) {
    seedLog.error('inventory_stock 补列失败:', e.message);
  }

  // inventory_inbound_records 表 + 3 索引
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS inventory_inbound_records (
        id TEXT PRIMARY KEY,
        record_type TEXT DEFAULT 'inbound',
        record_date TEXT NOT NULL,
        source_module TEXT NOT NULL,
        source_id TEXT NOT NULL,
        source_code TEXT,
        stock_type TEXT NOT NULL,
        source_type TEXT NOT NULL,
        warehouse_id TEXT,
        warehouse_name TEXT,
        crop_id TEXT,
        crop_code TEXT,
        crop_name TEXT,
        variety_name TEXT,
        quantity REAL NOT NULL DEFAULT 0,
        returned_quantity REAL DEFAULT 0,
        unit TEXT NOT NULL,
        unit_price REAL DEFAULT 0,
        total_amount REAL DEFAULT 0,
        quality_grade TEXT,
        supplier_id TEXT,
        supplier_name TEXT,
        -- 2026-07-08 T8.5：6 套字段矩阵补 8 字段（前 4 字段）
        supplier_phone TEXT,            -- 外购入库：供应商电话
        gift_from TEXT,                  -- 赠品入库：赠送方
        consignor TEXT,                  -- 委托入库：委托方
        source_warehouse_name TEXT,      -- 调拨入库：源仓库名
        stocktake_no TEXT,               -- 盘盈入库：盘点单号
        base_id TEXT,                    -- 自产入库：基地 ID
        base_name TEXT,                  -- 自产入库：基地名
        planting_mode TEXT,              -- 自产入库：种植模式
        greenhouse_name TEXT,            -- 自产入库：温室名（与 inventory_stock 对齐）
        production_plan_id TEXT,
        production_plan_code TEXT,
        business_id TEXT,
        notes TEXT,
        operator_name TEXT,
        create_by TEXT,
        create_time TEXT,
        update_time TEXT
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_inbound_source ON inventory_inbound_records (source_module, source_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_inbound_stock_type ON inventory_inbound_records (stock_type, record_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_inbound_warehouse ON inventory_inbound_records (warehouse_id)');
    // 2026-06-26: 退库功能 — inventory_inbound_records 加 returned_quantity 列
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN returned_quantity REAL DEFAULT 0'); } catch (e: any) { /* duplicate column */ }
    // 2026-07-08 T8.5：作物库存入库弹窗重设计补 8 字段（已存在列的 DB 自动跳过）
    // 字段语义：见上面 CREATE TABLE 注释
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN supplier_phone TEXT'); } catch (e: any) { /* duplicate column */ }
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN gift_from TEXT'); } catch (e: any) { /* duplicate column */ }
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN consignor TEXT'); } catch (e: any) { /* duplicate column */ }
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN source_warehouse_name TEXT'); } catch (e: any) { /* duplicate column */ }
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN stocktake_no TEXT'); } catch (e: any) { /* duplicate column */ }
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN base_id TEXT'); } catch (e: any) { /* duplicate column */ }
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN base_name TEXT'); } catch (e: any) { /* duplicate column */ }
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN planting_mode TEXT'); } catch (e: any) { /* duplicate column */ }
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN greenhouse_name TEXT'); } catch (e: any) { /* duplicate column */ }
    // 2026-07-08 T13：作物形态字段（整株/果实/种子/叶片/花朵/其他）
    try { db.run('ALTER TABLE inventory_inbound_records ADD COLUMN crop_form TEXT'); } catch (e: any) { /* duplicate column */ }
    seedLog.info('  ✓ inventory_inbound_records 表 + 3 索引就绪');
  } catch (e: any) {
    seedLog.error('inventory_inbound_records 创建失败:', e.message);
  }

  // 2026-07-08 T13：创建"作物形态"字典类别 + 6 个项目
  // 在 inventory_inbound_records 表就绪后、planting_move_records 表创建前插入
  // 字典语义：入库时记录作物形态（整株/果实/种子/叶片/花朵/其他），前端 AddStockModal 从字典加载
  // 幂等：先用 SELECT 检查类别是否存在，避免 duplicate row 错误
  try {
    // better-sqlite3 标准 API：prepare(sql).get(...) / .all() / .run()
    const catExists = !!db.prepare("SELECT id FROM dictionary_categories WHERE code = ?").get('crop_form' as any);
    if (!catExists) {
      // category_code 必须唯一；时间戳保证幂等 id
      const catId = `DC_CROP_FORM_${Date.now()}`;
      db.run(
        `INSERT INTO dictionary_categories (id, code, name, module, description, sort_order, status, created_at, updated_at)
         VALUES (?, 'crop_form', '作物形态', 'crop', '入库时记录作物的形态，12 项与种植管理采收弹窗一致', 38, 'active', datetime('now', 'localtime'), datetime('now', 'localtime'))`,
        [catId],
      );
      // 12 个项目（顺序按业务常用度：果实 > 种子 > 种苗 > 穗条 > 枝条 > 块根 > 块茎 > 鳞茎 > 叶片 > 花朵 > 整株 > 其他）
      // 与种植管理 HarvestRecordModal.tsx:85-86 的"形态"下拉保持完全一致
      const cropFormItems: Array<[string, string]> = [
        ['fruit', '果实'],
        ['seed', '种子'],
        ['seedling', '种苗'],
        ['spike', '穗条'],
        ['branch', '枝条'],
        ['root_tuber', '块根'],
        ['tuber', '块茎'],
        ['bulb', '鳞茎'],
        ['leaf', '叶片'],
        ['flower', '花朵'],
        ['whole_plant', '整株'],
        ['other', '其他'],
      ];
      const now = new Date().toISOString();
      for (let i = 0; i < cropFormItems.length; i++) {
        const [code, label] = cropFormItems[i];
        // 用 item id 保证幂等（重复执行不会插第二份）
        db.run(
          `INSERT INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, color, sort_order, is_default, status, display_name, created_at, updated_at)
           VALUES (?, 'crop_form', ?, ?, ?, 'gray', ?, 0, 'active', ?, ?, ?)`,
          [`CF_${i + 1}`, code, label, label, i + 1, label, now, now],
        );
      }
      seedLog.info('  ✓ crop_form 字典类别 + 12 项目创建成功');
    } else {
      seedLog.skip('  • crop_form 字典类别已存在，跳过');
    }
  } catch (e: any) {
    seedLog.skip(`  • crop_form 字典创建失败: ${e.message}`);
  }

  // 2026-06-19: 种植移入/移出履历表（整批级别，不依赖 plant_labels 单株粒度）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS planting_move_records (
        id TEXT PRIMARY KEY,
        planting_id TEXT NOT NULL,
        planting_code TEXT,
        operation_type TEXT NOT NULL CHECK(operation_type IN ('move_in','move_out')),
        from_area_id TEXT,
        from_area_name TEXT,
        to_area_id TEXT,
        to_area_name TEXT,
        quantity INTEGER DEFAULT 0,
        operation_date TEXT,
        operator_name TEXT,
        remarks TEXT,
        create_time TEXT
      )
    `);
    db.run('CREATE INDEX IF NOT EXISTS idx_move_planting ON planting_move_records (planting_id, operation_date)');
    db.run('CREATE INDEX IF NOT EXISTS idx_move_type ON planting_move_records (operation_type)');
    seedLog.info('  ✓ planting_move_records 表 + 2 索引就绪');
  } catch (e: any) {
    seedLog.error('planting_move_records 创建失败:', e.message);
  }

  // 2026-06-19: 回流种源 propagation_status 修正（in_stock → completed）
  // executePropagation 旧代码写 'in_stock'，但这值不属于 PropagationStatus 枚举。
  // 新代码写 'completed'（已完成整个繁殖过程）；老数据需要一次迁移。
  // 判别条件：source_origin ∈ {cutting, internal_seed, seedling_split} 且 linkedPlantingId 有值（回流特征）
  try {
    const stmt = db.prepare(`
      UPDATE seed_sources
      SET propagation_status = 'completed'
      WHERE deleted_at IS NULL
        AND propagation_status = 'in_stock'
        AND source_origin IN ('cutting', 'internal_seed', 'seedling_split')
        AND linked_planting_id IS NOT NULL
        AND linked_planting_id != ''
    `);
    stmt.run();
    const changes = db.exec('SELECT changes()')[0]?.values[0]?.[0] || 0;
    if (Number(changes) > 0) {
      seedLog.info(`  ✓ 回流种源 propagation_status 修正：${changes} 条 in_stock → completed`);
    }
  } catch (e: any) {
    seedLog.error('回流种源状态修正失败:', e.message);
  }

  // 2026-06-19: 回流记录 → material_flow_log 老数据回填
  // executePropagation 旧代码没写 material_flow_log，导致 FlowLogTab 看不到回流链路。
  // 从 crop_circulation_records 反向生成 material_flow_log 记录：
  // - PROPAGATION: source=(source_module, source_id, planting_code) → target=(new_source_id, source_code)
  // - QUANTITY:    source=(source_module, source_id, planting_code) → target=(parent_source_id, source_code)
  // 判重：business_code = CIRC.id，重复运行不会重复插入（INSERT OR IGNORE）
  try {
    const existsCheck = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='material_flow_log'");
    if (!existsCheck || existsCheck.length === 0) {
      seedLog.skip('material_flow_log 表未创建，跳过回流流水回填');
    } else {
      const stmt = db.prepare(`
        INSERT OR IGNORE INTO material_flow_log (
          id, oid, flow_type,
          crop_code, crop_name, crop_variety,
          source_type, source_id, source_code, source_quantity, source_unit, source_category,
          target_type, target_id, target_code, target_quantity, target_unit,
          business_id, business_code, created_at, created_by
        )
        SELECT
          lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6))),
          (SELECT COALESCE(MAX(oid), 0) FROM material_flow_log) + ROW_NUMBER() OVER (ORDER BY cr.circulation_date, cr.id),
          cr.source_module || '→seed_source',
          ss.crop_code, ss.crop_name, ss.crop_variety,
          cr.source_module, cr.source_id,
          (SELECT planting_code FROM plantings WHERE id = cr.source_id AND cr.source_module = 'planting'),
          cr.quantity, cr.unit,
          CASE cr.source_module WHEN 'planting' THEN 'planting' WHEN 'seedling' THEN 'seedling' ELSE 'seed_source' END,
          'seed_source',
          CASE WHEN cr.circulation_type = 'PROPAGATION' THEN cr.new_source_id ELSE cr.parent_source_id END,
          COALESCE((SELECT source_code FROM seed_sources WHERE id = CASE WHEN cr.circulation_type = 'PROPAGATION' THEN cr.new_source_id ELSE cr.parent_source_id END), ''),
          cr.quantity, cr.unit,
          cr.id, cr.id,
          cr.created_at, COALESCE(cr.operator_id, 'system')
        FROM crop_circulation_records cr
        LEFT JOIN seed_sources ss ON ss.id = CASE WHEN cr.circulation_type = 'PROPAGATION' THEN cr.new_source_id ELSE cr.parent_source_id END
        WHERE cr.is_revoked = 0
          AND cr.circulation_type IN ('PROPAGATION', 'QUANTITY')
          AND cr.id NOT IN (SELECT business_code FROM material_flow_log WHERE business_code IS NOT NULL)
      `);
      stmt.run();
      const inserted = db.exec('SELECT changes()')[0]?.values[0]?.[0] || 0;
      if (Number(inserted) > 0) {
        seedLog.info(`  ✓ material_flow_log 回流链路回填：${inserted} 条新记录`);
      } else {
        seedLog.skip('• material_flow_log 回流回填：无新记录（可能已全部迁移）');
      }
    }
  } catch (e: any) {
    seedLog.error('material_flow_log 回流回填失败:', e.message);
  }

  // 2026-06-19: crop_circulation_records.PROPAGATION 老记录 quantity 补全
  // 旧代码 executePropagation 写入 crop_circulation_records 时漏了 quantity 列
  // 从对应 seed_sources.quantity 反查补全（回流时新种源的 quantity = input.quantity）
  try {
    const stmt = db.prepare(`
      UPDATE crop_circulation_records
      SET quantity = (SELECT quantity FROM seed_sources WHERE id = crop_circulation_records.new_source_id)
      WHERE circulation_type = 'PROPAGATION'
        AND quantity IS NULL
        AND new_source_id IS NOT NULL
        AND (SELECT quantity FROM seed_sources WHERE id = crop_circulation_records.new_source_id) IS NOT NULL
    `);
    stmt.run();
    const changes = db.exec('SELECT changes()')[0]?.values[0]?.[0] || 0;
    if (Number(changes) > 0) {
      seedLog.info(`  ✓ crop_circulation_records.PROPAGATION 数量补全：${changes} 条`);
    } else {
      seedLog.skip('• crop_circulation_records.PROPAGATION 数量补全：无新记录');
    }
  } catch (e: any) {
    seedLog.error('PROPAGATION 数量补全失败:', e.message);
  }

  // ========== V13.0: 审计日志表 ==========
  // 2026-07-14：移除 harvest_inbounds 表（独立采收入库页面已下线，row-level 弹窗使用 inventory_* 表）
  try {
    seedLog.info('检查 audit_logs 表...');
    db.run(`CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      business_type TEXT NOT NULL,
      business_id TEXT NOT NULL,
      action TEXT NOT NULL,
      operator_id TEXT,
      operator_name TEXT,
      opinion TEXT,
      created_at TEXT
    )`);
    try { db.run('CREATE INDEX IF NOT EXISTS idx_audit_logs_business ON audit_logs(business_type, business_id)'); } catch (e) {}
    seedLog.info('  audit_logs 表初始化完成');
  } catch (e: any) {
    seedLog.error('audit_logs 表创建失败:', e.message);
  }

  // 2026-07-01: 一次性迁移 — harvest_records.products JSON 里 cropName/cropVariety 互换
  // 历史 bug：seedlings/seed_sources/plantings 主表的 crop_name 字段实际存"品种"（如"红富士"），
  // crop_variety 字段实际存"类型/名称"（如"苹果"），字段名与值语义相反。
  // 旧入库代码未做字段绑定交换，直接把 seedlings.crop_name 存到 harvest_records.products[].cropName，
  // 导致弹窗里"作物名称"列显示"红富士"而非"苹果"。
  // 前端已修复（UnifiedRowHarvestInboundModal 默认值做交换），这里做一次性历史数据修复：
  // 把所有 harvest_records.products JSON 里的 cropName ↔ cropVariety 互换，
  // 之后再入库的 records 字段值就与用户期望语义一致了。
  // 幂等保护：用一个 schema_migrations 表记录是否已执行过（如果已有 'harvest_crop_field_swap_v1' 则跳过）
  try {
    db.run(`CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )`);
    const checkStmt = db.prepare(`SELECT id FROM schema_migrations WHERE id = ?`);
    checkStmt.bind(['harvest_crop_field_swap_v1']);
    const alreadyApplied = checkStmt.step();
    checkStmt.free();
    if (alreadyApplied) {
      seedLog.skip('• harvest_records.products cropName/cropVariety 互换：已执行过，跳过');
    } else {
      // 1. 读所有 harvest_records
      const stmt = db.prepare(`SELECT id, products FROM harvest_records WHERE products IS NOT NULL AND products != '' AND deleted_at IS NULL`);
      let migratedCount = 0;
      const updateStmt = db.prepare(`UPDATE harvest_records SET products = ? WHERE id = ?`);
      while (stmt.step()) {
        const row = stmt.getAsObject() as any;
        const id = row.id;
        const productsStr = row.products;
        try {
          const products = JSON.parse(productsStr);
          if (!Array.isArray(products) || products.length === 0) continue
          let changed = false
          const swapped = products.map((p: any) => {
            if (p && typeof p === 'object' && ('cropName' in p || 'cropVariety' in p)) {
              changed = true
              return { ...p, cropName: p.cropVariety, cropVariety: p.cropName }
            }
            return p
          })
          if (changed) {
            updateStmt.bind([JSON.stringify(swapped), id])
            updateStmt.step()
            updateStmt.reset()
            migratedCount++
          }
        } catch { /* 跳过非 JSON 数据 */ }
      }
      stmt.free()
      updateStmt.free()
      // 2. 记录已执行
      if (migratedCount > 0) {
        const insertStmt = db.prepare(`INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`)
        insertStmt.bind(['harvest_crop_field_swap_v1', new Date().toISOString()])
        insertStmt.step()
        insertStmt.free()
        seedLog.info(`  ✓ harvest_records.products cropName/cropVariety 互换：${migratedCount} 条记录已迁移`)
      } else {
        seedLog.skip('• harvest_records.products cropName/cropVariety 互换：无可迁移数据')
      }
    }
  } catch (e: any) {
    seedLog.error('harvest_records.products 迁移失败:', e.message)
  }

  // ============================================================
  // 2026-07-03 v3：planting_breeding_records.reproduction_mode 老数据 backfill
  // 老数据无 reproduction_mode 字段，按 operationType 推断：
  // - clonal/cutting/grafting/layering/tissue/division → 'asexual'
  // - 其他 → 'sexual'
  // ============================================================
  try {
    // 检查表是否存在
    const tblStmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='planting_breeding_records'`)
    const tableExists = tblStmt.step()
    tblStmt.free()
    if (!tableExists) {
      seedLog.skip('• planting_breeding_records 表不存在，跳过 backfill')
      return
    }
    // 检查列是否存在
    const colStmt = db.prepare(`PRAGMA table_info(planting_breeding_records)`)
    let hasMode = false
    while (colStmt.step()) {
      const row = colStmt.getAsObject() as { name: string }
      if (row.name === 'reproduction_mode') { hasMode = true; break }
    }
    colStmt.free()
    if (!hasMode) {
      seedLog.skip('• planting_breeding_records.reproduction_mode 列不存在，跳过 backfill')
      return
    }
    // 查 NULL 数量
    const cntStmt = db.prepare(`SELECT COUNT(*) as cnt FROM planting_breeding_records WHERE reproduction_mode IS NULL`)
    let nullCnt = 0
    if (cntStmt.step()) {
      nullCnt = (cntStmt.getAsObject() as { cnt: number }).cnt
    }
    cntStmt.free()
    if (nullCnt > 0) {
      // 推断：6 个无性 op → asexual
      db.run(`UPDATE planting_breeding_records SET reproduction_mode = 'asexual' WHERE reproduction_mode IS NULL AND operation_type IN ('clonal','cutting','grafting','layering','tissue','division')`)
      // 剩余 → sexual
      db.run(`UPDATE planting_breeding_records SET reproduction_mode = 'sexual' WHERE reproduction_mode IS NULL`)
      saveDatabase()
      seedLog.info(`✓ planting_breeding_records.reproduction_mode backfill 完成：${nullCnt} 行`)
    } else {
      seedLog.skip('• planting_breeding_records.reproduction_mode 全部已 backfill')
    }
  } catch (e: any) {
    seedLog.skip('• planting_breeding_records.reproduction_mode backfill:', e.message)
  }

  // ============================================================
  // 2026-07-03 v4：字典表补留种/营养体保存专用单位
  // 新增: 个/公斤/筐/箱/盘/捆（若已存在则跳过）
  // ============================================================
  try {
    const newUnits = [
      { id: 'UT008', dictCode: '个', dictLabel: '个', dictValue: '个', color: 'green', sortOrder: 8 },
      { id: 'UT009', dictCode: '公斤', dictLabel: '公斤', dictValue: '公斤', color: 'orange', sortOrder: 9 },
      { id: 'UT010', dictCode: '筐', dictLabel: '筐', dictValue: '筐', color: 'amber', sortOrder: 10 },
      { id: 'UT011', dictCode: '箱', dictLabel: '箱', dictValue: '箱', color: 'gray', sortOrder: 11 },
      { id: 'UT012', dictCode: '盘', dictLabel: '盘', dictValue: '盘', color: 'cyan', sortOrder: 12 },
      { id: 'UT013', dictCode: '捆', dictLabel: '捆', dictValue: '捆', color: 'lime', sortOrder: 13 },
    ]
    let added = 0
    for (const u of newUnits) {
      const exist = db.prepare(`SELECT id FROM dictionaries WHERE id = ?`)
      exist.bind([u.id])
      if (!exist.step()) {
        exist.free()
        db.run(`INSERT OR IGNORE INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, color, sort_order, status)
          VALUES (?, 'unit', ?, ?, ?, ?, ?, 'active')`,
          [u.id, u.dictCode, u.dictLabel, u.dictValue, u.color, u.sortOrder])
        added++
      } else {
        exist.free()
      }
    }
    if (added > 0) {
      saveDatabase()
      seedLog.info(`✓ 字典 unit 类别补 ${added} 个新单位（个/公斤/筐/箱/盘/捆）`)
    } else {
      seedLog.skip('• 字典 unit 类别单位已齐全')
    }

    // 2026-07-16：用户需求给 application_method 字典补 诱捕/浸泡/其他 3 个选项
    const newMethods = [
      { id: 'AM008', dictCode: 'trap',   dictLabel: '诱捕', dictValue: 'trap',   color: 'rose',   sortOrder: 8 },
      { id: 'AM009', dictCode: 'soak',   dictLabel: '浸泡', dictValue: 'soak',   color: 'indigo', sortOrder: 9 },
      { id: 'AM010', dictCode: 'other',  dictLabel: '其他', dictValue: 'other',  color: 'gray',   sortOrder: 10 },
    ]
    let methodAdded = 0
    for (const m of newMethods) {
      const exist = db.prepare(`SELECT id FROM dictionaries WHERE id = ?`)
      exist.bind([m.id])
      if (!exist.step()) {
        exist.free()
        db.run(`INSERT OR IGNORE INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, color, sort_order, status)
          VALUES (?, 'application_method', ?, ?, ?, ?, ?, 'active')`,
          [m.id, m.dictCode, m.dictLabel, m.dictValue, m.color, m.sortOrder])
        methodAdded++
      } else {
        exist.free()
      }
    }
    if (methodAdded > 0) {
      saveDatabase()
      seedLog.info(`✓ 字典 application_method 类别补 ${methodAdded} 个新施用方法（诱捕/浸泡/其他）`)
    } else {
      seedLog.skip('• 字典 application_method 类别已含诱捕/浸泡/其他')
    }
  } catch (e: any) {
    seedLog.skip('• 字典 unit 补单位:', e.message)
  }

  // ============================================================
  // 2026-07-03 v5：seedlings 表加无性繁殖母株溯源列
  // 将组培/扦插/嫁接/压条/分株等无性繁殖从种植育种迁移到育苗
  // 新增 10 列：母株溯源(3)+繁殖方式(1)+指标(2)+世代信息(2)+预留(2)
  // ============================================================
  try {
    const seedlingAsexualCols = [
      { col: 'mother_source_type', type: 'TEXT' },       // 'planting' | 'seed_source'
      { col: 'mother_source_id', type: 'TEXT' },         // 种植ID 或 种源ID
      { col: 'mother_source_code', type: 'TEXT' },       // 种植批号 或 种源代码
      { col: 'propagation_method', type: 'TEXT' },       // cutting/grafting/tissue_culture/layering/division/bulb/tuber/runner
      { col: 'inoculation_count', type: 'INTEGER' },     // 接种数（插穗/接芽/外植体/球茎）
      { col: 'survival_count', type: 'INTEGER' },        // 成活数
      { col: 'mother_generation', type: 'TEXT' },        // 母株世代（从育种记录读取）
      { col: 'mother_crop_name', type: 'TEXT' },         // 母株品种名
      { col: 'mother_propagation_method', type: 'TEXT' },// 母株繁殖方式（冗余备份）
      { col: 'asexual_propagation_note', type: 'TEXT' }, // 无性繁殖备注
    ]
    let seedlingColsAdded = 0
    for (const { col, type } of seedlingAsexualCols) {
      try {
        db.run(`ALTER TABLE seedlings ADD COLUMN ${col} ${type}`)
        seedlingColsAdded++
      } catch (_) { /* 列已存在，跳过 */ }
    }
    if (seedlingColsAdded > 0) {
      saveDatabase()
      seedLog.info(`✓ seedlings 表加 ${seedlingColsAdded} 列（无性繁殖母株溯源）`)
    } else {
      seedLog.skip('• seedlings 无性繁殖列全部已存在')
    }
  } catch (e: any) {
    seedLog.skip('• seedlings 加无性繁殖列:', e.message)
  }

  // ============================================================
  // 2026-07-04 v3：育苗状态机升级（与 PlantingStatus 6 态对齐）
  // 老数据迁移：
  //   - 'transplanted'（孤儿状态）→ 'completed'（历史上有"已出圃"含义）
  //   - 'in_progress' + end_type=<NULL> + 已播种 → 保留 in_progress（生长中）
  // 此处只清理孤儿值，状态机语义由客户端枚举保证
  // ============================================================
  try {
    const db = getDatabase()
    // 检查表是否存在
    const tblStmt = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='seedlings'`)
    const tableExists = tblStmt.step()
    tblStmt.free()
    if (!tableExists) {
      seedLog.skip('• seedlings 状态迁移：表不存在，跳过')
    } else {
      // 1. 修复孤儿状态 'transplanted' → 'completed'
      const orphan = db.prepare(`SELECT COUNT(*) AS cnt FROM seedlings WHERE status = 'transplanted'`)
      orphan.step()
      const cnt = (orphan.getAsObject() as { cnt: number }).cnt
      orphan.free()
      if (cnt > 0) {
        db.run(`UPDATE seedlings SET status = 'completed' WHERE status = 'transplanted'`)
        saveDatabase()
        seedLog.info(`✓ seedlings 孤儿状态迁移：transplanted → completed，${cnt} 行`)
      } else {
        seedLog.skip('• seedlings 状态迁移：无 transplanted 孤儿数据')
      }
    }
  } catch (e: any) {
    seedLog.skip('• seedlings 状态迁移:', e.message)
  }

  // V14.0: 批次库存表（FEFO 先进先出追踪）
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS batch_inventory (
        id TEXT PRIMARY KEY,
        material_code TEXT NOT NULL,
        material_name TEXT,
        batch_no TEXT NOT NULL,
        production_date TEXT,
        expiry_date TEXT,
        unit TEXT,
        total_quantity REAL DEFAULT 0,
        remaining_quantity REAL DEFAULT 0,
        inbound_record_id INTEGER,
        create_time TEXT DEFAULT (datetime('now','localtime')),
        update_time TEXT DEFAULT (datetime('now','localtime'))
      )
    `);
    seedLog.info('✓ batch_inventory 表创建成功');
  } catch (e: any) {
    seedLog.error('batch_inventory:', e.message);
  }
  try { db.run('CREATE INDEX IF NOT EXISTS idx_batch_fefo ON batch_inventory(material_code, expiry_date, batch_no)'); } catch {}

  // ========== 2026-07-14：迁移 — 批量重算 inventory_stock.status ==========
  // 方案 C：status 改为基于 current_quantity/frozen_quantity 自动计算
  // 启动时执行一次，修复历史脏数据（status 与实际数量不一致）
  try {
    const result = recomputeAllStockStatus(db);
    if (result.updated > 0) {
      seedLog.info(`✓ inventory_stock.status 批量重算：${result.updated}/${result.total} 条已更新`);
    } else {
      seedLog.skip(`• inventory_stock.status 批量重算：无需更新（${result.total} 条全部一致）`);
    }
  } catch (e: any) {
    seedLog.error('inventory_stock.status 批量重算失败:', e.message);
  }

  // ========== 2026-07-15：迁移 — 修复历史正数 transfer_out / outbound 流水 ==========
  // 历史 bug：inventoryTransfer.service.ts 写 transfer_out 时未取负，inventoryService.writeFlowLog 写 outbound 时也错
  // 修复：扣减类业务（outbound/transfer_out/unfreeze）quantity > 0 的记录批量取负
  try {
    const stmt = db.prepare(`
      SELECT id, balance_before, balance_after
      FROM inventory_transaction
      WHERE transaction_type IN ('outbound', 'transfer_out', 'unfreeze')
        AND quantity > 0
    `);
    const toFix: Array<{ id: string; oldBefore: number; oldAfter: number }> = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as any;
      toFix.push({
        id: String(row.id),
        oldBefore: Number(row.balance_before) || 0,
        oldAfter: Number(row.balance_after) || 0,
      });
    }
    stmt.free();

    if (toFix.length > 0) {
      const updStmt = db.prepare(`
        UPDATE inventory_transaction
        SET quantity = -quantity,
            balance_before = ?,
            balance_after = ?,
            operate_date = ?
        WHERE id = ?
      `);
      for (const r of toFix) {
        // 反转 balance_before/balance_after：扣减前的余额 = 扣减后的余额（这一笔之前）
        // 注意：inventory_transaction 表没有 update_time 列，用 operate_date（同前面的 transfer_out INSERT）
        const today = new Date().toISOString().slice(0, 10);
        updStmt.run([r.oldAfter, r.oldBefore, today, r.id]);
      }
      updStmt.free();
      saveDatabase();
      seedLog.info(`✓ inventory_transaction 扣减流水符号修复：${toFix.length} 条已取负 + balance 对调`);
    } else {
      seedLog.skip('• inventory_transaction 扣减流水符号修复：无需更新');
    }
  } catch (e: any) {
    seedLog.error('inventory_transaction 扣减流水符号修复失败:', e.message);
  }

  // ========== 2026-07-16：病虫害字典加 images 列（用户可上传最多 5 张 base64 图） ==========
  try {
    db.run(`ALTER TABLE pest_disease_dict ADD COLUMN images TEXT`);
    seedLog.info('✓ pest_disease_dict 表添加 images 列（病虫害图片 base64 JSON 数组）');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      seedLog.skip('• pest_disease_dict.images 列已存在');
    } else {
      seedLog.skip('• pest_disease_dict.images:', e.message);
    }
  }

  // ========== 2026-07-14：迁移 — 删除 harvest_inbounds 表 ==========
  // 独立采收入库页面已下线，所有入库走 inventory_* 表（行级弹窗）。
  // 一次性 DROP，下次启动自动跳过（IF EXISTS 保护）。
  try {
    db.run('DROP INDEX IF EXISTS idx_harvest_inbounds_code');
    db.run('DROP INDEX IF EXISTS idx_harvest_inbounds_status');
    db.run('DROP INDEX IF EXISTS idx_harvest_inbounds_source_type');
    db.run('DROP INDEX IF EXISTS idx_harvest_inbounds_date');
    db.run('DROP TABLE IF EXISTS harvest_inbounds');
    seedLog.info('✓ harvest_inbounds 表已清理（独立采收入库页面下线）');
  } catch (e: any) {
    seedLog.error('harvest_inbounds 清理失败:', e.message);
  }

  // ========== 2026-07-15：存量每日记录施肥/用药子记录同步到施肥/病虫害管理页 ==========
  backfillDailyFertilPesticide();

  // ========== 2026-07-15：迁移 — 历史脏数据 method 字段翻译回中文 ==========
  // 历史 bug：daily record 同步时（修复前）application_method 列存了 raw English code（如 drip_irrigation）
  // 现在 translateDictCode 已支持 DB + fallback + 跨字典，把历史脏数据按当前规则重新翻译回中文 label
  // 幂等设计：用 schema_migrations 记录只跑一次
  try {
    db.run(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at TEXT NOT NULL)`);
    const checkStmt = db.prepare(`SELECT id FROM schema_migrations WHERE id = ?`);
    checkStmt.bind(['daily_method_label_translation_v1']);
    const alreadyApplied = checkStmt.step();
    checkStmt.free();
    if (alreadyApplied) {
      seedLog.skip('• 历史 method 字段翻译：已执行过，跳过');
    } else {
      // 安全检查：先 PRAGMA 查 application_method 列是否存在（兼容老 DB）
      const pestCols = db.exec(`PRAGMA table_info(pesticide_records)`);
      const hasCol = pestCols[0]?.values?.some(v => v[1] === 'application_method');
      if (!hasCol) {
        seedLog.skip('• pesticide_records.application_method 列不存在，跳过迁移');
      } else {
        // 内置兜底（同步 syncDailyRecords.FALLBACK_APP_METHOD_LABELS，避免循环依赖）
        const FALLBACK: Record<string, string> = {
          spray: '喷雾', drench: '灌根', fumigation: '熏蒸', broadcast: '撒施',
          irrigation: '灌施', injection: '注射', foliar_spray: '叶面喷雾',
          soil_drench: '土壤浇灌', trunk_injection: '树干注射',
          drip_irrigation: '滴灌', flood_irrigation: '冲施/漫灌',
          spread: '撒施', buried: '埋施/穴施', base: '基施/底肥',
          top_dressing: '追肥', mist_spray: '弥雾', dusting: '喷粉',
          seed_dressing: '拌种', bait: '诱杀',
        };

        const pestStmt = db.prepare(`SELECT id, application_method, pesticide_list FROM pesticide_records WHERE pesticide_list IS NOT NULL AND pesticide_list != ''`);
        let pestFixed = 0;
        const updateStmt = db.prepare(`UPDATE pesticide_records SET application_method = ? WHERE id = ?`);
        const updateJsonStmt = db.prepare(`UPDATE pesticide_records SET pesticide_list = ? WHERE id = ?`);
        while (pestStmt.step()) {
          const row = pestStmt.getAsObject() as any;
          const id = row.id;
          const rawCol = String(row.application_method || '');
          // 翻译 ①：列 application_method（仅当不是中文时）
          if (rawCol && !/[一-龥]/.test(rawCol)) {
            const r1 = db.exec(`SELECT dict_label FROM dictionaries WHERE category_code = 'application_method' AND dict_code = ? LIMIT 1`, [rawCol]);
            let label = r1?.[0]?.values?.[0]?.[0] as string | undefined;
            if (!label) {
              const r2 = db.exec(`SELECT dict_label FROM dictionaries WHERE category_code = 'fertilization_method' AND dict_code = ? LIMIT 1`, [rawCol]);
              label = r2?.[0]?.values?.[0]?.[0] as string | undefined;
            }
            if (!label) label = FALLBACK[rawCol];
            if (label && label !== rawCol) {
              updateStmt.bind([label, id]);
              updateStmt.step();
              updateStmt.reset();
              pestFixed++;
            }
          }

          // 翻译 ②：JSON pool 内的 applicationMethod
          const listRaw = String(row.pesticide_list || '');
          if (listRaw) {
            try {
              const arr = JSON.parse(listRaw);
              let changed = false;
              for (const item of Array.isArray(arr) ? arr : []) {
                if (!item || typeof item !== 'object') continue;
                const m = item.applicationMethod;
                if (typeof m !== 'string' || /[一-龥]/.test(m)) continue;
                let itemLabel: string | undefined;
                const rr1 = db.exec(`SELECT dict_label FROM dictionaries WHERE category_code = 'application_method' AND dict_code = ? LIMIT 1`, [m]);
                itemLabel = rr1?.[0]?.values?.[0]?.[0] as string | undefined;
                if (!itemLabel) {
                  const rr2 = db.exec(`SELECT dict_label FROM dictionaries WHERE category_code = 'fertilization_method' AND dict_code = ? LIMIT 1`, [m]);
                  itemLabel = rr2?.[0]?.values?.[0]?.[0] as string | undefined;
                }
                if (!itemLabel) itemLabel = FALLBACK[m];
                if (itemLabel && itemLabel !== m) {
                  item.applicationMethod = itemLabel;
                  changed = true;
                  pestFixed++;
                }
              }
              if (changed) {
                updateJsonStmt.bind([JSON.stringify(arr), id]);
                updateJsonStmt.step();
                updateJsonStmt.reset();
              }
            } catch { /* 跳过非法 JSON */ }
          }
        }
        pestStmt.free();
        updateStmt.free();
        updateJsonStmt.free();

        if (pestFixed > 0) {
          saveDatabase();
          const ins = db.prepare(`INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)`);
          ins.bind(['daily_method_label_translation_v1', new Date().toISOString()]);
          ins.step();
          ins.free();
          seedLog.info(`✓ 历史 method 字段翻译：pesticide_records ${pestFixed} 条已更新为中文`);
        } else {
          seedLog.skip('• 历史 method 字段翻译：无需更新（已全是中文）');
        }
      }
    }
  } catch (e: any) {
    seedLog.error('历史 method 字段翻译失败:', e.message);
  }

  // 2026-07-16：库存 crop_name 数据错位迁移已移至独立脚本 server/scripts/migrateInventoryCropName.ts
  //   原因：fixMissingSchema 被启动白名单禁用（index.ts:173 注释：YELLOW 级含 UPDATE 迁移，c55 事故），
  //   即使把迁移函数加到这里，启动也不会跑。改用独立脚本，用户手动跑 npx tsx 执行。
}

// 不再模块级自动执行 — 由 index.ts 统一控制启动顺序
// 如需独立运行，执行: npx tsx src/db/fixMissingSchema.ts

// 2026-07-03 v3：standalone runner — 启动白名单禁用了 index.ts 自动调用，所以保留手动入口
if (require.main === module) {
  (async () => {
    await initDatabase()
    await fixMissingSchema()
    process.exit(0)
  })().catch((e) => {
    // eslint-disable-next-line no-console
    console.error('fixMissingSchema failed:', e)
    process.exit(1)
  })
}
