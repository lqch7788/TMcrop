/**
 * 数据库表结构定义
 * 对应现有 LocalStorage 的数据存储
 * V5.0重构：新增系统设置相关表
 */

import { getDatabase } from './index';

export function initializeDatabase() {
  const db = getDatabase();

  // ========== 系统设置表（V5.0新增）==========

  // 部门表
  db.run(`
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      manager_id TEXT,
      manager_name TEXT,
      parent_oid TEXT,
      sort_number INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 职位表
  db.run(`
    CREATE TABLE IF NOT EXISTS positions (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      department_oid TEXT,
      department_name TEXT,
      level INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 班组表
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      team_code TEXT NOT NULL,
      team_name TEXT NOT NULL,
      department_oid TEXT,
      department_name TEXT,
      leader_id TEXT,
      leader_name TEXT,
      shift_type TEXT,
      member_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 仓库表
  db.run(`
    CREATE TABLE IF NOT EXISTS warehouses (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      warehouse_type TEXT,
      location TEXT,
      capacity REAL DEFAULT 0,
      current_stock REAL DEFAULT 0,
      manager_id TEXT,
      manager_name TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 温室表
  db.run(`
    CREATE TABLE IF NOT EXISTS greenhouses (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      greenhouse_type TEXT,
      area REAL DEFAULT 0,
      location TEXT,
      base_oid TEXT,
      base_name TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 区域表
  db.run(`
    CREATE TABLE IF NOT EXISTS zones (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      zone_code TEXT NOT NULL,
      zone_name TEXT NOT NULL,
      greenhouse_oid TEXT,
      greenhouse_name TEXT,
      zone_type TEXT,
      area REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 地块表
  db.run(`
    CREATE TABLE IF NOT EXISTS blocks (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      block_code TEXT NOT NULL,
      block_name TEXT NOT NULL,
      zone_oid TEXT,
      zone_name TEXT,
      block_type TEXT,
      area REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 编码规则表
  db.run(`
    CREATE TABLE IF NOT EXISTS code_rules (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      prefix TEXT NOT NULL,
      seq_length INTEGER DEFAULT 3,
      current_seq INTEGER DEFAULT 0,
      date_pattern TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 通知渠道表
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_channels (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      channel_code TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      channel_type TEXT,
      is_active INTEGER DEFAULT 1,
      config TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 通知规则表
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_rules (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      rule_code TEXT NOT NULL,
      rule_name TEXT NOT NULL,
      event_type TEXT,
      recipient_type TEXT,
      recipient_ids TEXT,
      channel_ids TEXT,
      frequency TEXT DEFAULT 'immediate',
      template TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 审批规则表
  db.run(`
    CREATE TABLE IF NOT EXISTS approval_rules (
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

  // 审批工作流表
  db.run(`
    CREATE TABLE IF NOT EXISTS approval_workflows (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT,
      module TEXT,
      trigger_condition TEXT,
      nodes TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 审批单表
  db.run(`
    CREATE TABLE IF NOT EXISTS approvals (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      type TEXT NOT NULL,
      type_name TEXT,
      category TEXT,
      title TEXT NOT NULL,
      description TEXT,
      applicant_id TEXT,
      applicant_name TEXT,
      applicant_department TEXT,
      apply_date TEXT,
      apply_time TEXT,
      current_step INTEGER DEFAULT 1,
      total_steps INTEGER DEFAULT 1,
      approvers TEXT,
      records TEXT,
      status TEXT DEFAULT 'pending',
      business_link TEXT,
      attachments TEXT,
      priority TEXT DEFAULT 'normal',
      due_date TEXT,
      reminder_count INTEGER DEFAULT 0,
      related_batch_code TEXT,
      related_task_ids TEXT,
      notification_sent INTEGER DEFAULT 0,
      amount TEXT,
      materials TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // ========== 数据字典表（V5.0新增）==========

  // 字典分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS dictionary_categories (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      module TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 字典项表
  db.run(`
    CREATE TABLE IF NOT EXISTS dictionaries (
      id TEXT PRIMARY KEY,
      category_code TEXT NOT NULL,
      dict_code TEXT NOT NULL,
      dict_label TEXT NOT NULL,
      dict_value TEXT NOT NULL,
      color TEXT,
      sort_order INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 创建作物品种表
  db.run(`
    CREATE TABLE IF NOT EXISTS crop_varieties (
      id TEXT PRIMARY KEY,
      crop_code TEXT NOT NULL,
      category_code TEXT,
      category_name TEXT,
      type_code TEXT,
      type_name TEXT,
      variety_code TEXT,
      variety_name TEXT,
      sub_variety1_code TEXT,
      sub_variety1_name TEXT,
      detail_variety_code TEXT,
      status TEXT DEFAULT 'active',
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建库存表
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id TEXT PRIMARY KEY,
      harvest_record_id TEXT,
      product_code TEXT,
      crop_name TEXT,
      variety TEXT,
      stock_type TEXT DEFAULT 'product',
      quantity REAL DEFAULT 0,
      unit TEXT,
      grade TEXT,
      warehouse_id TEXT,
      warehouse_name TEXT,
      storage_location TEXT,
      harvest_date TEXT,
      storage_date TEXT,
      expiration_date TEXT,
      batch_code TEXT,
      greenhouse_name TEXT,
      planting_mode TEXT,
      production_plan_code TEXT,
      status TEXT DEFAULT 'active',
      alert_settings TEXT,
      inbound_records TEXT,
      outbound_records TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建作物实例表
  db.run(`
    CREATE TABLE IF NOT EXISTS crop_instances (
      id TEXT PRIMARY KEY,
      instance_code TEXT NOT NULL,
      order_id TEXT,
      order_code TEXT,
      crop_category TEXT,
      crop_name TEXT NOT NULL,
      crop_variety TEXT,
      category_code TEXT,
      type_code TEXT,
      sub_code TEXT,
      source_origin TEXT,
      source_description TEXT,
      initial_quantity INTEGER DEFAULT 0,
      current_quantity INTEGER DEFAULT 0,
      planted_quantity INTEGER DEFAULT 0,
      harvested_quantity INTEGER DEFAULT 0,
      status TEXT DEFAULT 'seedling',
      seed_entry_date TEXT,
      seedling_start_date TEXT,
      planting_date TEXT,
      harvest_date TEXT,
      source_instance_id TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建种源表
  db.run(`
    CREATE TABLE IF NOT EXISTS seed_sources (
      id TEXT PRIMARY KEY,
      source_code TEXT NOT NULL,
      source_name TEXT,
      source_type TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      supplier_id TEXT,
      supplier_name TEXT,
      production_plan_code TEXT,
      quantity INTEGER DEFAULT 0,
      unit TEXT,
      purchase_date TEXT,
      purchase_price REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      used_quantity INTEGER DEFAULT 0,
      remaining_quantity INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建育苗表
  db.run(`
    CREATE TABLE IF NOT EXISTS seedlings (
      id TEXT PRIMARY KEY,
      seedling_code TEXT NOT NULL,
      source_id TEXT,
      source_name TEXT,
      production_plan_code TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      seedling_type TEXT,
      greenhouse_name TEXT,
      area_name TEXT,
      seedling_date TEXT,
      expected_finish_date TEXT,
      actual_finish_date TEXT,
      seedling_quantity INTEGER DEFAULT 0,
      survival_quantity INTEGER DEFAULT 0,
      survival_rate REAL DEFAULT 0,
      status TEXT DEFAULT 'in_progress',
      seedling_status TEXT,
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建种植表
  db.run(`
    CREATE TABLE IF NOT EXISTS plantings (
      id TEXT PRIMARY KEY,
      planting_code TEXT NOT NULL,
      source_type TEXT,
      source_id TEXT,
      source_name TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      greenhouse_name TEXT,
      area_name TEXT,
      planting_date TEXT,
      planting_quantity INTEGER DEFAULT 0,
      planted_quantity INTEGER DEFAULT 0,
      survival_quantity INTEGER DEFAULT 0,
      survival_rate REAL DEFAULT 0,
      growth_status TEXT,
      expected_harvest_date TEXT,
      actual_harvest_date TEXT,
      harvest_quantity INTEGER DEFAULT 0,
      status TEXT DEFAULT 'planted',
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建采收记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS harvest_records (
      id TEXT PRIMARY KEY,
      harvest_code TEXT NOT NULL,
      source_id TEXT,
      source_name TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      greenhouse_name TEXT,
      harvest_date TEXT,
      harvest_quantity REAL DEFAULT 0,
      unit TEXT,
      unit_price REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      quality_grade TEXT,
      buyer_id TEXT,
      buyer_name TEXT,
      sales_channel TEXT,
      status TEXT DEFAULT 'pending',
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建供应商表
  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      supplier_code TEXT NOT NULL,
      supplier_name TEXT NOT NULL,
      contact_person TEXT,
      contact_phone TEXT,
      address TEXT,
      supplier_type TEXT,
      status TEXT DEFAULT 'active',
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建农事任务表
  db.run(`
    CREATE TABLE IF NOT EXISTS farm_tasks (
      id TEXT PRIMARY KEY,
      task_code TEXT NOT NULL,
      task_title TEXT NOT NULL,
      task_type TEXT,
      task_content TEXT,
      assignee_id TEXT,
      assignee_name TEXT,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      area_name TEXT,
      plan_date TEXT,
      plan_time TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      completion_date TEXT,
      completion_note TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建巡查记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      record_code TEXT NOT NULL,
      inspection_type TEXT,
      inspector_id TEXT,
      inspector_name TEXT,
      greenhouse_name TEXT,
      check_date TEXT,
      check_time TEXT,
      check_result TEXT,
      issue_severity TEXT,
      issue_text TEXT,
      images TEXT,
      status TEXT DEFAULT 'pending',
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建问题记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS problems (
      id TEXT PRIMARY KEY,
      problem_code TEXT NOT NULL,
      problem_type TEXT,
      title TEXT,
      description TEXT,
      greenhouse_name TEXT,
      reporter_id TEXT,
      reporter_name TEXT,
      assignee_id TEXT,
      assignee_name TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建人工记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS labor_records (
      id TEXT PRIMARY KEY,
      worker_id TEXT,
      worker_name TEXT,
      work_type TEXT,
      work_date TEXT,
      work_hours REAL DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      task_description TEXT,
      status TEXT DEFAULT 'pending',
      remarks TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 为已有表添加新列（如果列不存在则添加）
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN production_plan_code TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  try {
    db.run(`ALTER TABLE seedlings ADD COLUMN production_plan_code TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // ========== V5.0 Phase 2: 关联字段迁移 ==========
  // 为种源表添加创建者ID关联
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN create_by_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为育苗表添加创建者ID关联
  try {
    db.run(`ALTER TABLE seedlings ADD COLUMN create_by_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为种植表添加创建者ID关联
  try {
    db.run(`ALTER TABLE plantings ADD COLUMN create_by_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为采收记录表添加关联字段
  try {
    db.run(`ALTER TABLE harvest_records ADD COLUMN create_by_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE harvest_records ADD COLUMN warehouse_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE harvest_records ADD COLUMN harvester_ids TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE harvest_records ADD COLUMN auditor_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为供应商表添加创建者ID关联
  try {
    db.run(`ALTER TABLE suppliers ADD COLUMN create_by_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为农事任务表添加创建者ID关联（如果还没有的话）
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN create_by_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为巡查记录表添加关联字段
  try {
    db.run(`ALTER TABLE inspections ADD COLUMN greenhouse_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为问题记录表添加关联字段
  try {
    db.run(`ALTER TABLE problems ADD COLUMN greenhouse_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为人工记录表添加工人ID关联
  try {
    db.run(`ALTER TABLE labor_records ADD COLUMN worker_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE labor_records ADD COLUMN department_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为库存表添加入库记录ID关联
  try {
    db.run(`ALTER TABLE inventory ADD COLUMN create_by_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为作物实例表添加创建者ID关联
  try {
    db.run(`ALTER TABLE crop_instances ADD COLUMN create_by_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  console.log('数据库表初始化完成');
}
