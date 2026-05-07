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
      business_type TEXT,
      trigger_condition TEXT,
      nodes TEXT,
      status TEXT DEFAULT 'active',
      version INTEGER DEFAULT 1,
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
      workflow_id TEXT,
      workflow_name TEXT,
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

  // 创建临时任务表
  db.run(`
    CREATE TABLE IF NOT EXISTS temp_tasks (
      id TEXT PRIMARY KEY,
      task_code TEXT NOT NULL,
      task_title TEXT NOT NULL,
      task_type TEXT,
      task_content TEXT,
      requester_id TEXT,
      requester_name TEXT,
      assignee_id TEXT,
      assignee_name TEXT,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      area_name TEXT,
      request_date TEXT,
      request_time TEXT,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'pending',
      due_date TEXT,
      completion_date TEXT,
      completion_note TEXT,
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建采购计划表
  db.run(`
    CREATE TABLE IF NOT EXISTS purchase_plans (
      id TEXT PRIMARY KEY,
      plan_code TEXT NOT NULL,
      plan_title TEXT NOT NULL,
      plan_type TEXT,
      department_id TEXT,
      department_name TEXT,
      applicant_id TEXT,
      applicant_name TEXT,
      apply_date TEXT,
      expected_date TEXT,
      supplier_id TEXT,
      supplier_name TEXT,
      total_amount REAL DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'draft',
      approval_status TEXT DEFAULT 'pending',
      remarks TEXT,
      attachments TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建物料申请表
  db.run(`
    CREATE TABLE IF NOT EXISTS material_requests (
      id TEXT PRIMARY KEY,
      request_code TEXT NOT NULL,
      request_title TEXT NOT NULL,
      request_type TEXT,
      department_id TEXT,
      department_name TEXT,
      applicant_id TEXT,
      applicant_name TEXT,
      apply_date TEXT,
      expected_date TEXT,
      warehouse_id TEXT,
      warehouse_name TEXT,
      total_amount REAL DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'draft',
      approval_status TEXT DEFAULT 'pending',
      remarks TEXT,
      attachments TEXT,
      create_by TEXT,
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

  // 为种源表添加来源途径字段（如果不存在则添加）
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN source_origin TEXT DEFAULT 'external_purchase'`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为种源表添加作物类别字段
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN crop_category TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为种源表添加类型名称字段
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN type_name TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为种源表添加品种名称字段
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN variety_name TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为种源表添加作物编码字段
  try {
    db.run(`ALTER TABLE seed_sources ADD COLUMN crop_code TEXT`);
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

  // ========== V6.0 Phase 2: 审批流程增强字段 ==========

  // 为审批工作流表添加业务类型和版本字段
  try {
    db.run(`ALTER TABLE approval_workflows ADD COLUMN business_type TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE approval_workflows ADD COLUMN version INTEGER DEFAULT 1`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为审批单表添加工 workflow_id 和 workflow_name 字段
  try {
    db.run(`ALTER TABLE approvals ADD COLUMN workflow_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE approvals ADD COLUMN workflow_name TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // ========== V6.0 Phase 1: 新增系统配置和操作日志表 ==========

  // 系统配置表 - 存储系统参数配置
  db.run(`
    CREATE TABLE IF NOT EXISTS system_configs (
      id TEXT PRIMARY KEY,
      config_key TEXT NOT NULL UNIQUE,
      config_value TEXT,
      config_type TEXT DEFAULT 'string',
      category TEXT,
      description TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 操作日志表 - 存储用户操作审计日志
  db.run(`
    CREATE TABLE IF NOT EXISTS operation_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      username TEXT,
      action TEXT NOT NULL,
      module TEXT,
      resource_type TEXT,
      resource_id TEXT,
      description TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      created_at TEXT
    )
  `);

  // ========== V6.0 Phase 4: 用户与权限表 ==========

  // 角色表
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      role_code TEXT NOT NULL,
      role_name TEXT NOT NULL,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 权限表
  db.run(`
    CREATE TABLE IF NOT EXISTS permissions (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      permission_code TEXT NOT NULL,
      permission_name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 用户表
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      username TEXT NOT NULL,
      password_hash TEXT,
      real_name TEXT,
      org_oid TEXT,
      org_name TEXT,
      department_oid TEXT,
      department_name TEXT,
      position TEXT,
      email TEXT,
      phone TEXT,
      avatar TEXT,
      status TEXT DEFAULT 'active',
      last_login TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 用户角色关联表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_oid TEXT NOT NULL,
      role_oid TEXT NOT NULL,
      created_at TEXT,
      UNIQUE(user_oid, role_oid)
    )
  `);

  // 角色权限关联表
  db.run(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_oid TEXT NOT NULL,
      permission_oid TEXT NOT NULL,
      created_at TEXT,
      UNIQUE(role_oid, permission_oid)
    )
  `);

  // 工序表（用于权限系统）
  db.run(`
    CREATE TABLE IF NOT EXISTS processes (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      process_code TEXT NOT NULL,
      process_name TEXT NOT NULL,
      category TEXT,
      app_type INTEGER DEFAULT 0,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 动作表（用于权限系统）
  db.run(`
    CREATE TABLE IF NOT EXISTS actions (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      action_code TEXT NOT NULL,
      action_name TEXT NOT NULL,
      category TEXT,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 角色权限关联表（authority 系统用）
  db.run(`
    CREATE TABLE IF NOT EXISTS roles_authority (
      id TEXT PRIMARY KEY,
      role_oid TEXT NOT NULL,
      process_oid TEXT NOT NULL,
      action_oid TEXT NOT NULL,
      value INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(role_oid, process_oid, action_oid)
    )
  `);

  // ========== V6.0 Phase 5: 订单与生产计划表 ==========

  // 订单表
  db.run(`
    CREATE TABLE IF NOT EXISTS crop_orders (
      id TEXT PRIMARY KEY,
      order_code TEXT NOT NULL,
      order_type TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      quantity INTEGER DEFAULT 0,
      unit TEXT,
      unit_price REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      customer_name TEXT,
      customer_contact TEXT,
      delivery_address TEXT,
      order_date TEXT,
      expected_delivery_date TEXT,
      actual_delivery_date TEXT,
      status TEXT DEFAULT 'pending',
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 生产计划表
  db.run(`
    CREATE TABLE IF NOT EXISTS production_plans (
      id TEXT PRIMARY KEY,
      plan_code TEXT NOT NULL,
      plan_name TEXT,
      plan_type TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      greenhouse_name TEXT,
      area_name TEXT,
      planned_quantity INTEGER DEFAULT 0,
      actual_quantity INTEGER DEFAULT 0,
      planting_date TEXT,
      expected_harvest_date TEXT,
      actual_harvest_date TEXT,
      status TEXT DEFAULT 'planning',
      priority TEXT DEFAULT 'normal',
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V8.0 新增核心表 ==========

  // 员工表
  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      staff_code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      gender TEXT,
      phone TEXT,
      email TEXT,
      department_oid TEXT,
      department_name TEXT,
      position_oid TEXT,
      position_name TEXT,
      team_oid TEXT,
      team_name TEXT,
      entry_date TEXT,
      status TEXT DEFAULT 'active',
      id_card TEXT,
      address TEXT,
      emergency_contact TEXT,
      emergency_phone TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 公司分组表
  db.run(`
    CREATE TABLE IF NOT EXISTS company_groups (
      id TEXT PRIMARY KEY,
      group_code TEXT NOT NULL UNIQUE,
      group_name TEXT NOT NULL,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 基地表
  db.run(`
    CREATE TABLE IF NOT EXISTS bases (
      id TEXT PRIMARY KEY,
      base_code TEXT NOT NULL UNIQUE,
      base_name TEXT NOT NULL,
      location TEXT,
      base_type TEXT,
      area REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      manager_id TEXT,
      manager_name TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 生产库存表（produce_inventories，与 inventory 并存）
  db.run(`
    CREATE TABLE IF NOT EXISTS produce_inventories (
      id TEXT PRIMARY KEY,
      inventory_code TEXT NOT NULL UNIQUE,
      product_name TEXT NOT NULL,
      crop_name TEXT,
      variety TEXT,
      stock_type TEXT DEFAULT 'product',
      quantity REAL DEFAULT 0,
      unit TEXT,
      grade TEXT,
      warehouse_id TEXT,
      warehouse_name TEXT,
      storage_location TEXT,
      batch_code TEXT,
      greenhouse_name TEXT,
      planting_mode TEXT,
      status TEXT DEFAULT 'active',
      alert_threshold REAL DEFAULT 0,
      expiration_date TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 物料表
  db.run(`
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      material_code TEXT NOT NULL UNIQUE,
      material_name TEXT NOT NULL,
      category TEXT,
      specification TEXT,
      unit TEXT,
      unit_price REAL DEFAULT 0,
      stock_quantity REAL DEFAULT 0,
      safe_stock REAL DEFAULT 0,
      supplier_id TEXT,
      supplier_name TEXT,
      warehouse_location TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 物料领用记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS material_receiving_records (
      id TEXT PRIMARY KEY,
      record_code TEXT NOT NULL UNIQUE,
      request_id TEXT,
      material_id TEXT,
      material_name TEXT,
      quantity REAL DEFAULT 0,
      unit TEXT,
      receiver_id TEXT,
      receiver_name TEXT,
      department_id TEXT,
      department_name TEXT,
      warehouse_id TEXT,
      warehouse_name TEXT,
      receive_date TEXT,
      status TEXT DEFAULT 'pending',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 物料使用记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS material_usages (
      id TEXT PRIMARY KEY,
      usage_code TEXT NOT NULL UNIQUE,
      material_id TEXT,
      material_name TEXT,
      quantity_used REAL DEFAULT 0,
      unit TEXT,
      batch_id TEXT,
      batch_code TEXT,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      used_by_id TEXT,
      used_by_name TEXT,
      use_date TEXT,
      purpose TEXT,
      status TEXT DEFAULT 'active',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 物料退库记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS material_returns (
      id TEXT PRIMARY KEY,
      return_code TEXT NOT NULL UNIQUE,
      receiving_record_id TEXT,
      material_id TEXT,
      material_name TEXT,
      return_quantity REAL DEFAULT 0,
      unit TEXT,
      returner_id TEXT,
      returner_name TEXT,
      warehouse_id TEXT,
      warehouse_name TEXT,
      return_date TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 农事活动表
  db.run(`
    CREATE TABLE IF NOT EXISTS farm_activities (
      id TEXT PRIMARY KEY,
      activity_code TEXT NOT NULL UNIQUE,
      activity_type TEXT,
      activity_name TEXT,
      batch_id TEXT,
      batch_code TEXT,
      crop_name TEXT,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      area_name TEXT,
      executor_id TEXT,
      executor_name TEXT,
      plan_date TEXT,
      actual_date TEXT,
      duration REAL DEFAULT 0,
      materials_used TEXT,
      result TEXT,
      status TEXT DEFAULT 'planned',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 种植模式表
  db.run(`
    CREATE TABLE IF NOT EXISTS planting_modes (
      id TEXT PRIMARY KEY,
      mode_code TEXT NOT NULL UNIQUE,
      mode_name TEXT NOT NULL,
      description TEXT,
      substrate TEXT,
      irrigation_method TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 种植区域表（plant_areas，与 zones 并存）
  db.run(`
    CREATE TABLE IF NOT EXISTS plant_areas (
      id TEXT PRIMARY KEY,
      area_code TEXT NOT NULL UNIQUE,
      area_name TEXT NOT NULL,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      area_type TEXT,
      area REAL DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 日计划表
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_plans (
      id TEXT PRIMARY KEY,
      plan_code TEXT NOT NULL UNIQUE,
      plan_date TEXT,
      department_id TEXT,
      department_name TEXT,
      batch_id TEXT,
      batch_code TEXT,
      crop_name TEXT,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      planned_tasks TEXT,
      completed_tasks TEXT,
      task_count INTEGER DEFAULT 0,
      completion_rate REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 月计划表
  db.run(`
    CREATE TABLE IF NOT EXISTS monthly_plans (
      id TEXT PRIMARY KEY,
      plan_code TEXT NOT NULL UNIQUE,
      plan_year INTEGER,
      plan_month INTEGER,
      department_id TEXT,
      department_name TEXT,
      target_crop TEXT,
      target_area REAL DEFAULT 0,
      target_yield REAL DEFAULT 0,
      planned_cost REAL DEFAULT 0,
      actual_cost REAL DEFAULT 0,
      completion_rate REAL DEFAULT 0,
      status TEXT DEFAULT 'draft',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 管理指标表
  db.run(`
    CREATE TABLE IF NOT EXISTS indicators (
      id TEXT PRIMARY KEY,
      indicator_code TEXT NOT NULL UNIQUE,
      indicator_name TEXT NOT NULL,
      category TEXT,
      unit TEXT,
      target_value REAL DEFAULT 0,
      actual_value REAL DEFAULT 0,
      warning_threshold REAL,
      critical_threshold REAL,
      frequency TEXT DEFAULT 'monthly',
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 生产记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS production_records (
      id TEXT PRIMARY KEY,
      record_code TEXT NOT NULL UNIQUE,
      batch_id TEXT,
      batch_code TEXT,
      crop_name TEXT,
      variety TEXT,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      record_date TEXT,
      record_type TEXT,
      quantity REAL DEFAULT 0,
      unit TEXT,
      quality_grade TEXT,
      worker_id TEXT,
      worker_name TEXT,
      status TEXT DEFAULT 'active',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 班组成员表
  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      team_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      join_date TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(team_id, staff_id)
    )
  `);

  // 设备管理表
  db.run(`
    CREATE TABLE IF NOT EXISTS device_management (
      id TEXT PRIMARY KEY,
      device_code TEXT NOT NULL UNIQUE,
      device_name TEXT NOT NULL,
      device_type TEXT,
      model TEXT,
      manufacturer TEXT,
      purchase_date TEXT,
      warranty_expire TEXT,
      location TEXT,
      status TEXT DEFAULT 'active',
      maintenance_date TEXT,
      next_maintenance TEXT,
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 物料分类表
  db.run(`
    CREATE TABLE IF NOT EXISTS material_categories (
      id TEXT PRIMARY KEY,
      category_code TEXT NOT NULL UNIQUE,
      category_name TEXT NOT NULL,
      parent_id TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 成本核算表
  db.run(`
    CREATE TABLE IF NOT EXISTS cost_accounting (
      id TEXT PRIMARY KEY,
      accounting_code TEXT NOT NULL UNIQUE,
      batch_id TEXT,
      batch_code TEXT,
      crop_name TEXT,
      cost_type TEXT,
      cost_category TEXT,
      amount REAL DEFAULT 0,
      unit TEXT,
      record_date TEXT,
      department_id TEXT,
      department_name TEXT,
      status TEXT DEFAULT 'active',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 通知消息表
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      notification_code TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      content TEXT,
      notification_type TEXT,
      sender_id TEXT,
      sender_name TEXT,
      recipient_id TEXT,
      recipient_name TEXT,
      is_read INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'normal',
      related_type TEXT,
      related_id TEXT,
      send_time TEXT,
      read_time TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 审批流程表（approval_flows，与 approval_workflows 并存）
  db.run(`
    CREATE TABLE IF NOT EXISTS approval_flows (
      id TEXT PRIMARY KEY,
      flow_code TEXT NOT NULL UNIQUE,
      flow_name TEXT NOT NULL,
      business_type TEXT,
      module TEXT,
      description TEXT,
      trigger_condition TEXT,
      status TEXT DEFAULT 'active',
      version INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 审批节点表
  db.run(`
    CREATE TABLE IF NOT EXISTS approval_nodes (
      id TEXT PRIMARY KEY,
      flow_id TEXT NOT NULL,
      node_name TEXT NOT NULL,
      node_order INTEGER DEFAULT 0,
      approver_type TEXT,
      approver_id TEXT,
      approver_name TEXT,
      node_condition TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 审批记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS approval_records (
      id TEXT PRIMARY KEY,
      approval_id TEXT NOT NULL,
      node_id TEXT,
      node_name TEXT,
      approver_id TEXT,
      approver_name TEXT,
      action TEXT,
      comment TEXT,
      action_time TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 审计日志表
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      log_code TEXT,
      user_id TEXT,
      username TEXT,
      action TEXT NOT NULL,
      module TEXT,
      resource_type TEXT,
      resource_id TEXT,
      description TEXT,
      old_value TEXT,
      new_value TEXT,
      ip_address TEXT,
      user_agent TEXT,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      created_at TEXT
    )
  `);

  // 考勤记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      record_code TEXT NOT NULL UNIQUE,
      staff_id TEXT,
      staff_name TEXT,
      department_id TEXT,
      department_name TEXT,
      attendance_date TEXT,
      check_in_time TEXT,
      check_out_time TEXT,
      work_hours REAL DEFAULT 0,
      overtime_hours REAL DEFAULT 0,
      status TEXT DEFAULT 'normal',
      leave_type TEXT,
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 考勤补卡表
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_repairs (
      id TEXT PRIMARY KEY,
      repair_code TEXT NOT NULL UNIQUE,
      attendance_record_id TEXT,
      staff_id TEXT,
      staff_name TEXT,
      repair_date TEXT,
      repair_type TEXT,
      original_time TEXT,
      repaired_time TEXT,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approver_id TEXT,
      approver_name TEXT,
      approve_time TEXT,
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 请假记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS leave_records (
      id TEXT PRIMARY KEY,
      leave_code TEXT NOT NULL UNIQUE,
      staff_id TEXT,
      staff_name TEXT,
      department_id TEXT,
      department_name TEXT,
      leave_type TEXT,
      start_date TEXT,
      end_date TEXT,
      leave_days REAL DEFAULT 0,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approver_id TEXT,
      approver_name TEXT,
      approve_time TEXT,
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 加班记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS overtime_records (
      id TEXT PRIMARY KEY,
      overtime_code TEXT NOT NULL UNIQUE,
      staff_id TEXT,
      staff_name TEXT,
      department_id TEXT,
      department_name TEXT,
      overtime_date TEXT,
      start_time TEXT,
      end_time TEXT,
      overtime_hours REAL DEFAULT 0,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approver_id TEXT,
      approver_name TEXT,
      approve_time TEXT,
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 招聘记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS recruitment_records (
      id TEXT PRIMARY KEY,
      recruitment_code TEXT NOT NULL UNIQUE,
      position_name TEXT,
      department_id TEXT,
      department_name TEXT,
      required_count INTEGER DEFAULT 1,
      applied_count INTEGER DEFAULT 0,
      hired_count INTEGER DEFAULT 0,
      publish_date TEXT,
      deadline TEXT,
      salary_range TEXT,
      requirements TEXT,
      status TEXT DEFAULT 'open',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 合同表
  db.run(`
    CREATE TABLE IF NOT EXISTS contracts (
      id TEXT PRIMARY KEY,
      contract_code TEXT NOT NULL UNIQUE,
      contract_type TEXT,
      party_a TEXT,
      party_b TEXT,
      staff_id TEXT,
      staff_name TEXT,
      sign_date TEXT,
      start_date TEXT,
      end_date TEXT,
      contract_value REAL DEFAULT 0,
      payment_terms TEXT,
      status TEXT DEFAULT 'active',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 入职表
  db.run(`
    CREATE TABLE IF NOT EXISTS onboardings (
      id TEXT PRIMARY KEY,
      onboarding_code TEXT NOT NULL UNIQUE,
      staff_id TEXT,
      staff_name TEXT,
      department_id TEXT,
      department_name TEXT,
      position_id TEXT,
      position_name TEXT,
      onboarding_date TEXT,
      mentor_id TEXT,
      mentor_name TEXT,
      training_plan TEXT,
      progress REAL DEFAULT 0,
      status TEXT DEFAULT 'in_progress',
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 离职表
  db.run(`
    CREATE TABLE IF NOT EXISTS resignations (
      id TEXT PRIMARY KEY,
      resignation_code TEXT NOT NULL UNIQUE,
      staff_id TEXT,
      staff_name TEXT,
      department_id TEXT,
      department_name TEXT,
      position_name TEXT,
      apply_date TEXT,
      last_work_date TEXT,
      resignation_type TEXT,
      reason TEXT,
      handover_status TEXT DEFAULT 'pending',
      status TEXT DEFAULT 'pending',
      approver_id TEXT,
      approver_name TEXT,
      approve_time TEXT,
      remarks TEXT,
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // ========== V8.0 索引优化 ==========
  db.run(`CREATE INDEX IF NOT EXISTS idx_staff_department ON staff(department_oid)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_staff_status ON staff(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_materials_category ON materials(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_farm_activities_batch ON farm_activities(batch_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_farm_activities_date ON farm_activities(plan_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_production_records_batch ON production_records(batch_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_production_records_date ON production_records(record_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cost_accounting_batch ON cost_accounting(batch_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_cost_accounting_type ON cost_accounting(cost_type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_attendance_staff_date ON attendance_records(staff_id, attendance_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leave_staff ON leave_records(staff_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_records(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_overtime_staff ON overtime_records(staff_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_overtime_status ON overtime_records(status)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_daily_plans_date ON daily_plans(plan_date)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_monthly_plans_ym ON monthly_plans(plan_year, plan_month)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_approval_records_approval ON approval_records(approval_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_material_receiving_material ON material_receiving_records(material_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_material_usage_material ON material_usages(material_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_plant_areas_greenhouse ON plant_areas(greenhouse_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)`);

  console.log('数据库表初始化完成');
}
