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
    { name: 'department_id', sql: 'ALTER TABLE organizations ADD COLUMN department_id TEXT' },
    { name: 'department_name', sql: 'ALTER TABLE organizations ADD COLUMN department_name TEXT' },
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
        console.log(`✓ 回填组织 "${name}" → 部门 ${deptId}`);
      }
    }
  } catch (fixErr: any) {
    console.log('回填 department_id 数据修复跳过:', fixErr.message);
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
          console.log(`✓ 回填部门编码: "${name}" → ${mappedCode}`);
        }
      }
    }
  } catch (codeFixErr: any) {
    console.log('回填部门编码跳过:', codeFixErr.message);
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
    console.log('✓ material_code_categories 表创建成功');
  } catch (e: any) {
    console.log('• material_code_categories:', e.message);
  }

  // 19. material_code_categories 表添加 rule_type 列（区分物料/供应商编码规则）
  try {
    db.run(`ALTER TABLE material_code_categories ADD COLUMN rule_type TEXT DEFAULT 'material'`);
    console.log('✓ material_code_categories 表添加 rule_type 列');
    // SQLite ALTER TABLE ADD COLUMN 不向已有行填充默认值，需手动更新 NULL 行
    const nullCount = db.exec(`SELECT COUNT(*) as cnt FROM material_code_categories WHERE rule_type IS NULL`);
    const cnt = nullCount.length > 0 && nullCount[0].values.length > 0 ? Number(nullCount[0].values[0][0] ?? 0) : 0;
    if (cnt > 0) {
      db.run(`UPDATE material_code_categories SET rule_type = 'material' WHERE rule_type IS NULL`);
      console.log(`✓ 已更新 ${cnt} 条旧记录的 rule_type = 'material'`);
    }
  } catch (e: any) {
    if (!e.message.includes('duplicate column')) {
      console.log('• material_code_categories.rule_type:', e.message);
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
    console.log('✓ bases 表创建成功');
  } catch (e: any) {
    console.log('• bases:', e.message);
  }

  // 21. ALTER greenhouses 表添加设施管理新字段（基地空间架构 V1.0）
  const ghColumnsToAdd = [
    { name: 'planting_method', sql: 'ALTER TABLE greenhouses ADD COLUMN planting_method TEXT' },
    { name: 'purpose', sql: 'ALTER TABLE greenhouses ADD COLUMN purpose TEXT' },
    { name: 'current_crop', sql: 'ALTER TABLE greenhouses ADD COLUMN current_crop TEXT' },
    { name: 'current_variety', sql: 'ALTER TABLE greenhouses ADD COLUMN current_variety TEXT' },
    { name: 'current_season_code', sql: 'ALTER TABLE greenhouses ADD COLUMN current_season_code TEXT' },
  ];
  for (const col of ghColumnsToAdd) {
    try {
      db.run(col.sql);
      console.log(`✓ greenhouses 表添加 ${col.name} 列`);
    } catch (e: any) {
      if (!e.message.includes('duplicate column')) {
        console.log(`• greenhouses.${col.name}:`, e.message);
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
      console.log(`✓ zones 表添加 ${col.name} 列`);
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
    console.log('✓ planting_records 表创建成功');
    // 创建索引
    try { db.run('CREATE INDEX IF NOT EXISTS idx_pr_facility ON planting_records(facility_oid)'); } catch {}
    try { db.run('CREATE INDEX IF NOT EXISTS idx_pr_season ON planting_records(season_code)'); } catch {}
    try { db.run('CREATE INDEX IF NOT EXISTS idx_pr_status ON planting_records(status)'); } catch {}
  } catch (e: any) {
    console.log('• planting_records:', e.message);
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
    console.log('✓ farm_partitions 表创建成功（分区管理）');
  } catch (e: any) {
    console.log('• farm_partitions:', e.message);
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
    console.log('✓ device_systems 表创建成功（系统管理）');
  } catch (e: any) {
    console.log('• device_systems:', e.message);
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
    console.log('✓ area_system_mappings 表创建成功（区域系统）');
  } catch (e: any) {
    console.log('• area_system_mappings:', e.message);
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
    console.log('✓ camera_devices 表创建成功（视频管理）');
  } catch (e: any) {
    console.log('• camera_devices:', e.message);
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
    console.log('✓ energy_configs 表创建成功（能耗管理）');
  } catch (e: any) {
    console.log('• energy_configs:', e.message);
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
    console.log('✓ alarm_level_configs 表创建成功（警报级别）');
  } catch (e: any) {
    console.log('• alarm_level_configs:', e.message);
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
    console.log('✓ alarm_contacts 表创建成功（警报联系人）');
  } catch (e: any) {
    console.log('• alarm_contacts:', e.message);
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
    console.log('✓ water_fertilizer_configs 表创建成功（水肥一体机）');
  } catch (e: any) {
    console.log('• water_fertilizer_configs:', e.message);
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
    console.log('✓ debug_logs 表创建成功（工程调试）');
  } catch (e: any) {
    console.log('• debug_logs:', e.message);
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
    console.log('✓ plant_settings 表创建成功（种植设置）');
  } catch (e: any) {
    console.log('• plant_settings:', e.message);
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
    console.log('✓ device_distributions 表创建成功（设备分配）');
  } catch (e: any) {
    console.log('• device_distributions:', e.message);
  }

  // 34. fertilizer_records 表添加 unit 列
  try {
    db.run(`ALTER TABLE fertilizer_records ADD COLUMN unit TEXT DEFAULT '千克'`);
    console.log('✓ fertilizer_records 表添加 unit 列');
  } catch (e: any) {
    if (e.message.includes('duplicate column')) {
      console.log('• fertilizer_records.unit 列已存在');
    } else {
      console.log('• fertilizer_records.unit:', e.message);
    }
  }

  saveDatabase();
  console.log('\n数据库结构修复完成！');
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
    console.log('字典数据无重复，跳过去重');
    return;
  }

  console.log(`发现 ${duplicates.length} 组重复字典数据，开始去重...`);

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

    console.log(`  去重: ${categoryCode}/${dictCode} → 保留 ${keeper.id}, 删除 ${toDelete.map(r => r.id).join(', ')}`);
  }

  saveDatabase();
  console.log('字典数据去重完成');
}

// 不再模块级自动执行 — 由 index.ts 统一控制启动顺序
// 如需独立运行，执行: npx tsx src/db/fixMissingSchema.ts
