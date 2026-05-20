/**
 * 数据库表结构定义
 * 对应现有 LocalStorage 的数据存储
 * V5.0重构：新增系统设置相关表
 */

import { getDatabase } from './index';
import { createIndexes } from './createIndexes';

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

  // 温室/基地表 - 扩展字段支持园区导览
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
      company_id TEXT,
      company_name TEXT,
      lng REAL DEFAULT 0,
      lat REAL DEFAULT 0,
      crop TEXT,
      growth_day INTEGER DEFAULT 0,
      manager TEXT,
      phone TEXT,
      soil_type TEXT,
      ph REAL DEFAULT 0,
      intro TEXT,
      greenhouse_count INTEGER DEFAULT 0,
      field_area REAL DEFAULT 0,
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

  // 物料编码分类树表（大类/中类/小类 三级层次）
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
      detail_variety_name TEXT,
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
      crop_code TEXT,
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
      planted_count INTEGER DEFAULT 0,
      pictures TEXT,
      quality_grade TEXT,
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
      batch_id TEXT,
      batch_code TEXT,
      create_by TEXT,
      version INTEGER DEFAULT 1,
      create_time TEXT,
      update_time TEXT
      team_id TEXT DEFAULT '',
      team_name TEXT DEFAULT '',
      tools_remarks TEXT DEFAULT ''
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
      area_name TEXT,
      task_description TEXT,
      batch_id TEXT,
      batch_code TEXT,
      status TEXT DEFAULT 'pending',
      remarks TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 创建考勤记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      name TEXT NOT NULL,
      dept TEXT,
      date TEXT NOT NULL,
      check_in TEXT,
      check_out TEXT,
      hours REAL DEFAULT 0,
      status TEXT DEFAULT '正常',
      status_class TEXT DEFAULT 'normal',
      task_id TEXT,
      batch_id TEXT,
      remarks TEXT,
      version INTEGER DEFAULT 1,
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

  // 临时任务表新列（向后兼容）
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN estimated_hours REAL DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN worker_count INTEGER DEFAULT 1`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN actual_hours REAL DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN progress INTEGER DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN reject_count INTEGER DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN urgency TEXT DEFAULT 'normal'`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN estimated_days INTEGER DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN reject_reason TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN acceptance_remarks TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN operation_records TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN greenhouse_name TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN title TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE temp_tasks ADD COLUMN location TEXT`); } catch (e) {}

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
      items TEXT,
      related_batch_code TEXT,
      approval_person TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 为采购计划表添加items列（如果不存在）
  try {
    db.run(`ALTER TABLE purchase_plans ADD COLUMN items TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为采购计划表添加related_batch_code列（如果不存在）
  try {
    db.run(`ALTER TABLE purchase_plans ADD COLUMN related_batch_code TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为采购计划表添加approval_person列（如果不存在）
  try {
    db.run(`ALTER TABLE purchase_plans ADD COLUMN approval_person TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

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
      plant_area TEXT,
      production_batch_code TEXT,
      total_amount REAL DEFAULT 0,
      priority TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'draft',
      approval_status TEXT DEFAULT 'pending',
      remarks TEXT,
      attachments TEXT,
      materials TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 为领料申请添加缺失的列
  try {
    db.run(`ALTER TABLE material_requests ADD COLUMN plant_area TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  try {
    db.run(`ALTER TABLE material_requests ADD COLUMN production_batch_code TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  try {
    db.run(`ALTER TABLE material_requests ADD COLUMN materials TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // ==================== 生产退料表 ====================
  db.run(`
    CREATE TABLE IF NOT EXISTS material_returns (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      date TEXT,
      type TEXT DEFAULT '生产退料',
      applicant TEXT,
      department TEXT,
      warehouseLocation TEXT,
      status TEXT DEFAULT '待审批',
      statusClass TEXT DEFAULT 'pending',
      remark TEXT,
      operator TEXT,
      reviewer TEXT,
      reviewDate TEXT,
      rejectReason TEXT,
      materials TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ==================== 领料出库表 ====================
  db.run(`
    CREATE TABLE IF NOT EXISTS material_executes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      date TEXT,
      applicant TEXT,
      warehouse_location TEXT,
      reviewer TEXT,
      operator TEXT,
      production_batch_code TEXT,
      source_application_codes TEXT,
      execute_status TEXT DEFAULT '已出库',
      execute_status_class TEXT DEFAULT 'completed',
      materials TEXT,
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
  // ========== V10.0: 种植模块补充字段 ==========
  try { db.run(`ALTER TABLE plantings ADD COLUMN soil_ph REAL DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE plantings ADD COLUMN soil_ec REAL DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE plantings ADD COLUMN attrition_rate REAL DEFAULT 0`); } catch (e) {}
  // ========== V12.0: 种源繁殖途径字段 ==========
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN propagation_type TEXT DEFAULT 'external'`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN propagation_status TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN propagation_method TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN parent_male_id TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN parent_male_code TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN parent_female_id TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN parent_female_code TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN mother_plant_id TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN mother_plant_code TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN linked_planting_id TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN linked_planting_code TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN propagation_start_date TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN expected_harvest_date TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN actual_harvest_date TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN breeding_location TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN target_traits TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE seed_sources ADD COLUMN generation TEXT`); } catch (e) {}

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

  // 供应商管理扩展字段（前端完整字段）
  try { db.run(`ALTER TABLE suppliers ADD COLUMN mobile_phone TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN work_phone TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN fax TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN country TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN province TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN city TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN bank_name TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN bank_card_number TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN organization TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN supplier_attribute TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN create_date TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE suppliers ADD COLUMN area TEXT DEFAULT ''`); } catch (e) {}

  // 为农事任务表添加创建者ID关联（如果还没有的话）
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN create_by_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN batch_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN batch_code TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  // 为农事任务表添加更多字段（支持完整任务流程）
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN title TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN source_type TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN source_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN progress INTEGER DEFAULT 0`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN assigner_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN assigner_name TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN due_date TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN accepted_at TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN completed_at TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN rework_count INTEGER DEFAULT 0`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN version INTEGER DEFAULT 1`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN dispatch_mode TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN feedback_requirements TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE farm_tasks ADD COLUMN remarks TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  // 数据改造：补齐前端通过API传递但后端未落库的关键字段
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN crop TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN estimated_hours INTEGER DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN estimated_days INTEGER DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN type_name TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN materials TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN tools TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN rework_history TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN deadline_extensions TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN type_config TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN sop_content TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE farm_tasks ADD COLUMN description TEXT`); } catch (e) {}

  // 创建任务操作记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS task_operation_records (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      task_code TEXT NOT NULL,
      task_title TEXT,
      operator_id TEXT,
      operator_name TEXT,
      action TEXT NOT NULL,
      action_name TEXT,
      from_status TEXT,
      to_status TEXT NOT NULL,
      progress INTEGER,
      progress_increment INTEGER,
      comment TEXT,
      reason TEXT,
      feedback TEXT,
      action_time TEXT NOT NULL,
      create_time TEXT NOT NULL
    )
  `);

  // 为巡查记录表添加关联字段
  try {
    db.run(`ALTER TABLE inspections ADD COLUMN greenhouse_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 添加反馈人员字段
  try {
    db.run(`ALTER TABLE inspections ADD COLUMN feedback_users TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为问题记录表添加关联字段
  try { db.run(`ALTER TABLE problems ADD COLUMN greenhouse_id TEXT`); } catch (e) {}
  // 巡查问题流转闭环字段（V2.0 数据层迁移）
  try { db.run(`ALTER TABLE problems ADD COLUMN crop_name TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN inspector_id TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN inspector_name TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN check_date TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN check_time TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN weather TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN temperature REAL DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN humidity REAL DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN crop_status TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN plant_height REAL DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN leaf_count INTEGER DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN issue_text TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN issue_severity TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN handler TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN handle_date TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN handle_result TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN source_task_id TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN flow_records TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN rework_count INTEGER DEFAULT 0`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN accepted_by TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN accepted_time TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN rejected_by TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN rejected_reason TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN rejected_time TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN completion_time TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN expected_completion TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN remarks TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN images TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN source_module TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN source_id TEXT`); } catch (e) {}
  try { db.run(`ALTER TABLE problems ADD COLUMN source_detail TEXT`); } catch (e) {}

  // 创建问题流转记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS problem_flow_records (
      id TEXT PRIMARY KEY,
      problem_id TEXT NOT NULL,
      operator_id TEXT,
      operator_name TEXT,
      action TEXT NOT NULL,
      from_status TEXT,
      to_status TEXT,
      comment TEXT,
      feedback_data TEXT,
      action_time TEXT NOT NULL,
      create_time TEXT NOT NULL
    )
  `);

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
  try {
    db.run(`ALTER TABLE labor_records ADD COLUMN area_name TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE labor_records ADD COLUMN batch_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE labor_records ADD COLUMN batch_code TEXT`);
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

  // ========== V6.1: 为作物品种表添加详细品种名称字段 ==========
  try {
    db.run(`ALTER TABLE crop_varieties ADD COLUMN detail_variety_name TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // ========== V6.2: 作物品种表扩展字段（环境参数、生长周期、别名、描述等） ==========
  const cropVarietyExtendedColumns = [
    { name: 'alias', type: 'TEXT' },
    { name: 'image', type: 'TEXT' },
    { name: 'description', type: 'TEXT' },
    { name: 'germination_period', type: 'REAL' },
    { name: 'seedling_period', type: 'REAL' },
    { name: 'flowering_period', type: 'REAL' },
    { name: 'fruiting_period', type: 'REAL' },
    { name: 'harvest_period', type: 'REAL' },
    { name: 'air_temperature', type: 'REAL' },
    { name: 'air_humidity', type: 'REAL' },
    { name: 'co2_content', type: 'REAL' },
    { name: 'light_intensity', type: 'REAL' },
    { name: 'soil_temperature', type: 'REAL' },
    { name: 'soil_humidity', type: 'REAL' },
    { name: 'soil_ph', type: 'REAL' },
    { name: 'soil_ec', type: 'REAL' },
    { name: 'remarks', type: 'TEXT' },
  ];
  for (const col of cropVarietyExtendedColumns) {
    try {
      db.run(`ALTER TABLE crop_varieties ADD COLUMN ${col.name} ${col.type}`);
    } catch (e) {
      // 列可能已存在，忽略错误
    }
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

  // ========== V6.0 Phase 4: 用户与权限表（完整 RBAC 体系）==========

  // 组织表（树形组织架构，root 为根节点）
  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      parent_oid TEXT,
      aid TEXT,
      org_type TEXT DEFAULT 'department',
      org_relationship TEXT,
      description TEXT,
      address TEXT,
      contact_person TEXT,
      contact_phone TEXT,
      department_id TEXT,
      department_name TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 角色表（关联组织 org_oid，is_system=1 为系统保护角色不可删除）
  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      role_code TEXT NOT NULL,
      role_name TEXT NOT NULL,
      org_oid TEXT,
      description TEXT,
      is_system INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 权限表（权限项定义）
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

  // 用户-角色关联表
  db.run(`
    CREATE TABLE IF NOT EXISTS user_roles (
      id TEXT PRIMARY KEY,
      user_oid TEXT NOT NULL,
      role_oid TEXT NOT NULL,
      created_at TEXT,
      UNIQUE(user_oid, role_oid)
    )
  `);

  // 角色-权限关联表（旧版）
  db.run(`
    CREATE TABLE IF NOT EXISTS role_permissions (
      id TEXT PRIMARY KEY,
      role_oid TEXT NOT NULL,
      permission_oid TEXT NOT NULL,
      created_at TEXT,
      UNIQUE(role_oid, permission_oid)
    )
  `);

  // 工序/菜单表（树形结构，route 绑定前端路由，is_hidden 控制菜单显隐）
  db.run(`
    CREATE TABLE IF NOT EXISTS processes (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      process_code TEXT NOT NULL,
      process_name TEXT NOT NULL,
      parent_oid TEXT,
      route TEXT,
      icon TEXT,
      category TEXT,
      app_type INTEGER DEFAULT 0,
      is_hidden INTEGER DEFAULT 0,
      description TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT
    )
  `);

  // 动作表（权限动作定义：view/create/edit/delete/export/approve 等）
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

  // 角色-工序-动作 权限矩阵表（value: 0=无权限, 1=有权限）
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

  // 角色-组织 数据权限表（控制角色可访问哪些组织的数据）
  db.run(`
    CREATE TABLE IF NOT EXISTS roles_data_authority (
      id TEXT PRIMARY KEY,
      role_oid TEXT NOT NULL,
      org_oid TEXT NOT NULL,
      created_at TEXT,
      UNIQUE(role_oid, org_oid)
    )
  `);

  // 用户特殊权限覆盖表（在角色权限基础上对单用户做增强/限制）
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

  // 项目/APP 配置表（多应用隔离，定义各应用使用的表名）
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

  // 迁移：给 crop_orders 表添加缺失的字段（幂等操作，忽略已存在列）
  const cropOrdersMigrations = [
    `ALTER TABLE crop_orders ADD COLUMN order_name TEXT`,
    `ALTER TABLE crop_orders ADD COLUMN crop_category TEXT`,
    `ALTER TABLE crop_orders ADD COLUMN planned_quantity INTEGER DEFAULT 0`,
    `ALTER TABLE crop_orders ADD COLUMN actual_quantity INTEGER DEFAULT 0`,
    `ALTER TABLE crop_orders ADD COLUMN expected_harvest_date TEXT`,
    `ALTER TABLE crop_orders ADD COLUMN supplier_name TEXT`,
  ];
  for (const sql of cropOrdersMigrations) {
    try {
      db.run(sql);
    } catch (e: any) {
      // 忽略 "duplicate column" 错误，确保幂等性
      if (!e.message.includes('duplicate column')) {
        console.log(`• crop_orders 迁移: ${e.message}`);
      }
    }
  }

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
      update_time TEXT,
      responsible_person TEXT,
      unit TEXT,
      publish_date TEXT,
      batch_status TEXT DEFAULT 'draft',
      plan_detail TEXT,
      plan_detail_file_name TEXT,
      planting_area REAL DEFAULT 0,
      planting_mode TEXT,
      supplier_name TEXT,
      seedling_site_name TEXT,
      seed_quantity INTEGER DEFAULT 0,
      target_seedling_count INTEGER DEFAULT 0
    )
  `);

  // ========== V8.0: 技术方案表 ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS tech_solutions (
      id TEXT PRIMARY KEY,
      solution_code TEXT NOT NULL,
      solution_title TEXT NOT NULL,
      crop_name TEXT,
      crop_code TEXT,
      planting_mode TEXT,
      stage TEXT,
      version TEXT DEFAULT 'V1.0',
      content TEXT,
      author TEXT,
      author_id TEXT,
      create_time TEXT,
      update_time TEXT,
      status TEXT DEFAULT 'draft',
      batch_status TEXT DEFAULT 'draft',
      approval_code TEXT,
      approved_at TEXT,
      approver TEXT,
      related_batch_code TEXT,
      plan_detail_file_name TEXT,
      priority TEXT DEFAULT 'normal',
      remarks TEXT
    )
  `);

  // 为技术方案表添加作物编码字段（如果不存在）
  try {
    db.run(`ALTER TABLE tech_solutions ADD COLUMN crop_code TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为技术方案表添加最后提交时间字段（如果不存在）
  try {
    db.run(`ALTER TABLE tech_solutions ADD COLUMN last_submit_time TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // 为技术方案表添加方案是否有效字段（如果不存在）
  try {
    db.run(`ALTER TABLE tech_solutions ADD COLUMN is_valid TEXT DEFAULT '有效'`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // ========== 作物品种库扩展表（用户新增的类别/类型/品种/子品种）==========

  db.run(`
    CREATE TABLE IF NOT EXISTS crop_variety_category_extensions (
      id TEXT PRIMARY KEY,
      category_code TEXT NOT NULL,
      category_name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(category_code)
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS crop_variety_type_extensions (
      id TEXT PRIMARY KEY,
      category_code TEXT NOT NULL,
      category_name TEXT,
      type_code TEXT NOT NULL,
      type_name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(category_code, type_code)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crop_variety_variety_extensions (
      id TEXT PRIMARY KEY,
      category_code TEXT NOT NULL,
      type_code TEXT NOT NULL,
      variety_code TEXT NOT NULL,
      variety_name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(category_code, type_code, variety_code)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS crop_variety_sub1_extensions (
      id TEXT PRIMARY KEY,
      category_code TEXT NOT NULL,
      type_code TEXT NOT NULL,
      variety_code TEXT NOT NULL,
      sub_variety1_code TEXT NOT NULL,
      sub_variety1_name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT,
      updated_at TEXT,
      UNIQUE(category_code, type_code, variety_code, sub_variety1_code)
    )
  `);

  // ========== V8.0: 物料成本表 ==========
  // 物料成本表 - 用于统计生产过程中的物料消耗成本
  db.run(`
    CREATE TABLE IF NOT EXISTS material_costs (
      id TEXT PRIMARY KEY,
      cost_code TEXT NOT NULL,
      cost_type TEXT NOT NULL,
      cost_name TEXT NOT NULL,
      category TEXT,
      batch_id TEXT,
      batch_code TEXT,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      crop_name TEXT,
      material_name TEXT,
      material_type TEXT,
      unit TEXT,
      quantity REAL DEFAULT 0,
      unit_price REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      cost_date TEXT,
      supplier_id TEXT,
      supplier_name TEXT,
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V8.0: 能源成本表 ==========
  // 能源成本表 - 用于统计生产过程中的能源消耗（电、水、燃气等）
  db.run(`
    CREATE TABLE IF NOT EXISTS energy_costs (
      id TEXT PRIMARY KEY,
      cost_code TEXT NOT NULL,
      cost_type TEXT NOT NULL,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      batch_id TEXT,
      batch_code TEXT,
      quantity REAL DEFAULT 0,
      unit TEXT,
      unit_price REAL DEFAULT 0,
      total_amount REAL DEFAULT 0,
      cost_date TEXT,
      meter_start REAL DEFAULT 0,
      meter_end REAL DEFAULT 0,
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 为能源成本表添加ALTER TABLE（向后兼容）
  try {
    db.run(`ALTER TABLE energy_costs ADD COLUMN crop_name TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE energy_costs ADD COLUMN supplier_id TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }
  try {
    db.run(`ALTER TABLE energy_costs ADD COLUMN supplier_name TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // ========== V8.0: 加班记录表 ==========
  // 加班记录表 - 用于存储员工加班申请记录
  db.run(`
    CREATE TABLE IF NOT EXISTS overtime_records (
      id TEXT PRIMARY KEY,
      worker_id TEXT,
      worker_name TEXT,
      overtime_type TEXT DEFAULT 'workday',
      work_date TEXT,
      start_time TEXT,
      end_time TEXT,
      hours REAL DEFAULT 0,
      base_salary REAL DEFAULT 0,
      hourly_rate REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approval_code TEXT,
      approved_at TEXT,
      department_id TEXT,
      department_name TEXT,
      greenhouse_id TEXT,
      greenhouse_name TEXT,
      remarks TEXT,
      version INTEGER DEFAULT 1,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V8.0: 请假记录表 ==========
  // 请假记录表 - 用于存储员工请假申请记录
  db.run(`
    CREATE TABLE IF NOT EXISTS leave_records (
      id TEXT PRIMARY KEY,
      worker_id TEXT,
      worker_name TEXT,
      leave_type TEXT,
      start_date TEXT,
      end_date TEXT,
      days INTEGER DEFAULT 0,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      approval_code TEXT,
      approved_at TEXT,
      department_id TEXT,
      department_name TEXT,
      remarks TEXT,
      version INTEGER DEFAULT 1,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V8.0: 请假额度表 ==========
  // 请假额度表 - 用于存储员工每年的请假额度
  db.run(`
    CREATE TABLE IF NOT EXISTS leave_quotas (
      id TEXT PRIMARY KEY,
      worker_id TEXT NOT NULL,
      worker_name TEXT,
      year INTEGER NOT NULL,
      leave_category TEXT NOT NULL,
      total_days REAL DEFAULT 0,
      used_days REAL DEFAULT 0,
      frozen_days REAL DEFAULT 0,
      remaining_days REAL DEFAULT 0,
      department_id TEXT,
      department_name TEXT,
      remarks TEXT,
      create_time TEXT,
      update_time TEXT,
      UNIQUE(worker_id, year, leave_category)
    )
  `);

  // ========== V9.0: 入职记录表 ==========
  // 入职记录表 - 用于存储员工入职办理记录
  db.run(`
    CREATE TABLE IF NOT EXISTS onboarding_records (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      id_card TEXT,
      phone TEXT,
      position TEXT,
      department TEXT,
      department_oid TEXT,
      contract_type TEXT,
      daily_wage REAL,
      hourly_wage REAL,
      join_date TEXT,
      status TEXT DEFAULT 'pending',
      progress TEXT,
      request_code TEXT,
      recruitment_id TEXT,
      operator_id TEXT,
      operator_name TEXT,
      approved_at TEXT,
      remarks TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V8.0: 每日记录表 ==========
  // 每日记录表 - 用于存储各类业务的每日汇总或明细记录
  db.run(`
    CREATE TABLE IF NOT EXISTS daily_records (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      record_type TEXT NOT NULL,
      record_date TEXT NOT NULL,
      related_id TEXT,
      related_code TEXT,
      related_type TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      greenhouse_name TEXT,
      quantity REAL DEFAULT 0,
      unit TEXT,
      data TEXT,
      status TEXT DEFAULT 'active',
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V8.0: 打印记录表 ==========
  // 打印记录表 - 用于存储打印操作的历史记录
  db.run(`
    CREATE TABLE IF NOT EXISTS print_records (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      print_type TEXT NOT NULL,
      print_title TEXT,
      related_id TEXT,
      related_code TEXT,
      related_type TEXT,
      printer_name TEXT,
      paper_size TEXT,
      copies INTEGER DEFAULT 1,
      print_status TEXT DEFAULT 'success',
      error_message TEXT,
      data TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V8.0: 定植记录表 ==========
  // 定植记录表 - 用于存储定植操作的相关记录
  db.run(`
    CREATE TABLE IF NOT EXISTS transplant_records (
      id TEXT PRIMARY KEY,
      oid TEXT UNIQUE NOT NULL,
      transplant_code TEXT NOT NULL,
      source_type TEXT,
      source_id TEXT,
      source_name TEXT,
      crop_name TEXT,
      crop_variety TEXT,
      greenhouse_name TEXT,
      area_name TEXT,
      from_location TEXT,
      to_location TEXT,
      transplant_date TEXT,
      transplant_quantity INTEGER DEFAULT 0,
      survival_quantity INTEGER DEFAULT 0,
      survival_rate REAL DEFAULT 0,
      operator_id TEXT,
      operator_name TEXT,
      status TEXT DEFAULT 'completed',
      remarks TEXT,
      data TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);
  // ========== V12.0: 繁殖过程记录表 ==========
  // 存储育种/留种/无性繁殖各阶段的过程记录
  db.run(`
    CREATE TABLE IF NOT EXISTS propagation_records (
      id TEXT PRIMARY KEY,
      seed_source_id TEXT NOT NULL,
      record_date TEXT NOT NULL,
      stage TEXT NOT NULL,
      temperature REAL,
      humidity REAL,
      abnormality TEXT,
      operator TEXT,
      remarks TEXT,
      pictures TEXT,
      pollination_type TEXT,
      pollinator_crop TEXT,
      flower_count INTEGER DEFAULT 0,
      fruit_set_count INTEGER DEFAULT 0,
      harvest_seed_count INTEGER DEFAULT 0,
      seed_weight REAL DEFAULT 0,
      harvest_plant_count INTEGER DEFAULT 0,
      germination_rate REAL DEFAULT 0,
      purity REAL DEFAULT 0,
      moisture REAL DEFAULT 0,
      survival_rate REAL DEFAULT 0,
      rooted_rate REAL DEFAULT 0,
      graft_success_rate REAL DEFAULT 0,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 为生产计划表添加新字段（向后兼容）
  const productionPlanColumns = [
    'responsible_person',
    'unit',
    'publish_date',
    'batch_status',
    'plan_detail',
    'plan_detail_file_name',
    'planting_area',
    'planting_mode',
    'supplier_name',
    'seedling_site_name',
    'seed_quantity',
    'target_seedling_count'
  ];

  for (const col of productionPlanColumns) {
    try {
      db.run(`ALTER TABLE production_plans ADD COLUMN ${col} TEXT`);
    } catch (e) {
      // 列可能已存在，忽略错误
    }
  }

  // 确保 batch_status 有默认值
  try {
    db.run(`ALTER TABLE production_plans ADD COLUMN batch_status TEXT DEFAULT 'draft'`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // ========== V8.0: 公告模板表 ==========
  // 公告模板表 - 用于存储公告模板，支持快速创建公告
  db.run(`
    CREATE TABLE IF NOT EXISTS announcement_templates (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT,
      title_template TEXT,
      content TEXT,
      default_priority TEXT DEFAULT 'normal',
      usage_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V8.0: 公告表 ==========
  // 公告表 - 用于存储系统公告
  db.run(`
    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT,
      category TEXT,
      priority TEXT DEFAULT '中',
      status TEXT DEFAULT '草稿',
      sender TEXT,
      date TEXT,
      deadline TEXT,
      read_count INTEGER DEFAULT 0,
      recipients TEXT,
      content TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V8.0: 指标表 ==========
  // 指标表 - 用于存储生产管理指标
  db.run(`
    CREATE TABLE IF NOT EXISTS indicators (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      unit TEXT,
      target REAL DEFAULT 0,
      actual REAL DEFAULT 0,
      trend TEXT DEFAULT 'stable',
      frequency TEXT,
      source TEXT,
      warning REAL DEFAULT 0,
      weight REAL DEFAULT 0,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== 指标评估表（基地综合评分）==========
  db.run(`
    CREATE TABLE IF NOT EXISTS indicator_evaluations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      production_score REAL DEFAULT 0,
      quality_score REAL DEFAULT 0,
      cost_score REAL DEFAULT 0,
      efficiency_score REAL DEFAULT 0,
      total_score REAL DEFAULT 0,
      rank INTEGER DEFAULT 0,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== 员工表（人工管理模块核心表）==========
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id TEXT PRIMARY KEY,
      employee_code TEXT NOT NULL,
      name TEXT NOT NULL,
      gender TEXT,
      phone TEXT,
      id_card TEXT,
      position_id TEXT,
      position_name TEXT,
      department_id TEXT,
      department_name TEXT,
      employee_type TEXT,
      hire_date TEXT,
      status TEXT DEFAULT 'active',
      skills TEXT,
      remarks TEXT,
      create_by TEXT,
      create_time TEXT,
      update_time TEXT,
      leave_date TEXT,
      leave_reason TEXT,
      resigned_at TEXT,
      transferred_at TEXT,
      approval_code TEXT
    )
  `);

  // ========== V9.0: 排班管理表 ==========
  // 排班表 - 用于存储员工排班信息
  db.run(`
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY,
      staff_id TEXT NOT NULL,
      staff_name TEXT,
      date TEXT NOT NULL,
      shift TEXT,
      work_zone TEXT,
      status TEXT DEFAULT '已排班',
      check_in TEXT,
      check_out TEXT,
      remarks TEXT,
      version INTEGER DEFAULT 1,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 调班申请表
  db.run(`
    CREATE TABLE IF NOT EXISTS swap_requests (
      id TEXT PRIMARY KEY,
      requester_id TEXT NOT NULL,
      requester_name TEXT,
      target_id TEXT NOT NULL,
      target_name TEXT,
      original_date TEXT NOT NULL,
      target_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT '待审批',
      create_time TEXT,
      update_time TEXT
    )
  `);

  // 为 schedules 表添加索引
  try {
    db.run(`CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_schedules_staff_id ON schedules(staff_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_schedules_date_staff ON schedules(date, staff_id)`);
  } catch (e) {
    // 索引可能已存在
  }

  // ========== 仓库物料管理表 ==========

  // 物料表
  db.run(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT,
      specification TEXT,
      unit TEXT,
      quantity REAL DEFAULT 0,
      minStock REAL DEFAULT 0,
      maxStock REAL DEFAULT 0,
      price TEXT,
      supplier TEXT,
      location TEXT,
      barcode TEXT,
      batchNo TEXT,
      productionDate TEXT,
      expiryDate TEXT,
      lastUpdateTime TEXT,
      dataStatus TEXT DEFAULT '启用'
    )
  `);

  // 物料批次索引（code + batchNo 联合查询加速）
  try {
    db.run('CREATE INDEX IF NOT EXISTS idx_materials_code_batch ON materials(code, batchNo)');
  } catch (e) {
    // 索引可能已存在
  }

  // 入库记录表
  db.run(`
    CREATE TABLE IF NOT EXISTS inbound_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL,
      inboundDate TEXT,
      supplier TEXT,
      operator TEXT,
      status TEXT DEFAULT 'pending',
      materials TEXT,
      voidedDate TEXT
    )
  `);

  // ========== V9.0: 离职记录表 ==========
  // 离职记录表 - 用于存储员工离职申请记录
  db.run(`
    CREATE TABLE IF NOT EXISTS resignation_records (
      id TEXT PRIMARY KEY,
      resignation_code TEXT NOT NULL,
      worker_id TEXT,
      worker_name TEXT,
      department TEXT,
      position TEXT,
      resignation_type TEXT,
      reason TEXT,
      expected_last_day TEXT,
      actual_last_day TEXT,
      handover_user_id TEXT,
      handover_user_name TEXT,
      handover_note TEXT,
      status TEXT DEFAULT 'pending',
      status_label TEXT DEFAULT '待审批',
      approver TEXT,
      approve_time TEXT,
      remarks TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V9.0: 招聘记录表 ==========
  // 招聘记录表 - 用于存储招聘申请记录
  db.run(`
    CREATE TABLE IF NOT EXISTS recruitment_records (
      id TEXT PRIMARY KEY,
      recruitment_code TEXT NOT NULL,
      dept_id TEXT,
      dept_name TEXT,
      position_id TEXT,
      position TEXT,
      headcount INTEGER DEFAULT 1,
      employment_type TEXT,
      salary_min REAL DEFAULT 0,
      salary_max REAL DEFAULT 0,
      priority TEXT DEFAULT 'normal',
      priority_label TEXT DEFAULT '普通',
      status TEXT DEFAULT 'pending',
      status_label TEXT DEFAULT '待审批',
      reason TEXT,
      remarks TEXT,
      applicant_id TEXT,
      applicant_name TEXT,
      apply_date TEXT,
      approve_time TEXT,
      approver TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V9.0: 合同续签记录表 ==========
  // 合同续签记录表 - 用于存储合同续签记录
  db.run(`
    CREATE TABLE IF NOT EXISTS contract_renewal_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT,
      employee_name TEXT,
      department TEXT,
      position TEXT,
      current_contract_end TEXT,
      new_contract_start TEXT,
      new_contract_end TEXT,
      renewal_period INTEGER,
      new_salary REAL,
      terms_change TEXT,
      status TEXT DEFAULT 'pending',
      status_label TEXT DEFAULT '待审批',
      approver TEXT,
      approve_time TEXT,
      remarks TEXT,
      create_time TEXT
    )
  `);

  // ========== V9.0: 工资预算记录表 ==========
  // 工资预算记录表 - 用于存储工资预算记录
  db.run(`
    CREATE TABLE IF NOT EXISTS salary_budget_records (
      id TEXT PRIMARY KEY,
      budget_code TEXT NOT NULL,
      dept_id TEXT,
      dept_name TEXT,
      budget_month TEXT,
      total_base_salary REAL DEFAULT 0,
      total_overtime_pay REAL DEFAULT 0,
      total_bonus REAL DEFAULT 0,
      grand_total REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      status_label TEXT DEFAULT '待审批',
      applicant_id TEXT,
      applicant_name TEXT,
      apply_date TEXT,
      remark TEXT,
      create_time TEXT,
      update_time TEXT
    )
  `);

  // ========== V10.0: 施肥管理模块 ==========
  // 施肥记录表 — 手动记录 + IoT自动记录
  db.run(`
    CREATE TABLE IF NOT EXISTS fertilizer_records (
      id TEXT PRIMARY KEY,
      fertilizer_code TEXT NOT NULL UNIQUE,
      farm_task_id TEXT,
      production_plan_id TEXT,
      production_plan_code TEXT,
      planting_id TEXT,
      planting_code TEXT,
      greenhouse_id TEXT,
      greenhouse_name TEXT NOT NULL,
      area_name TEXT,
      crop_name TEXT NOT NULL,
      crop_variety TEXT,
      fertilizer_name TEXT NOT NULL,
      fertilizer_type TEXT NOT NULL,
      dilution_ratio TEXT NOT NULL,
      quantity REAL NOT NULL DEFAULT 0,
      unit TEXT DEFAULT '千克',
      unit_price REAL DEFAULT 0,
      total_cost REAL DEFAULT 0,
      fertilize_time TEXT NOT NULL,
      operator_id TEXT,
      operator_name TEXT,
      data_source TEXT NOT NULL DEFAULT 'manual',
      iot_device_id TEXT,
      iot_record_id TEXT,
      description TEXT,
      status TEXT DEFAULT 'completed',
      create_time TEXT DEFAULT (datetime('now','localtime')),
      update_time TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== V10.0: 行政区划字典表 ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS region_data (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id INTEGER,
      level TEXT NOT NULL CHECK(level IN ('country', 'province', 'city', 'area'))
    )
  `);

  // ========== V10.0: 种植标签管理 ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS plant_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label_number TEXT NOT NULL,
      planting_id TEXT,
      seedling_id TEXT,
      move_in_area_id INTEGER,
      move_in_area_name TEXT,
      move_in_date TEXT,
      move_out_area_id INTEGER,
      move_out_area_name TEXT,
      move_out_date TEXT,
      create_time TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS plant_label_resume (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      label_id INTEGER NOT NULL,
      operation_type TEXT NOT NULL,
      from_area_name TEXT,
      to_area_name TEXT,
      mark_id INTEGER,
      mark_name TEXT,
      mark_color TEXT,
      operation_date TEXT NOT NULL,
      operator_name TEXT,
      create_time TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS plant_marks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT,
      icon TEXT,
      parent_id INTEGER DEFAULT 0,
      mark_aid TEXT,
      is_use INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0
    )
  `);

  // ========== V10.0: IoT设备白名单 ==========
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

  // 为 departments 表添加缺失的描述列
  try {
    db.run(`ALTER TABLE departments ADD COLUMN description TEXT`);
  } catch (e) {
    // 列可能已存在，忽略错误
  }

  // ========== V11.0: 工序定义表（系统设置 - 工序管理）==========
  db.run(`
    CREATE TABLE IF NOT EXISTS process_definitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oid TEXT UNIQUE NOT NULL,
      process_code TEXT NOT NULL,
      process_name TEXT NOT NULL,
      process_type TEXT,
      unit TEXT DEFAULT '亩',
      default_price REAL DEFAULT 0,
      default_bonus REAL DEFAULT 0,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== V11.0: 分级审批配置表 ==========

  // 审批级别配置表 — 4个审批级别的详细配置
  db.run(`
    CREATE TABLE IF NOT EXISTS approval_level_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oid TEXT UNIQUE NOT NULL,
      level_code TEXT NOT NULL UNIQUE,
      level_name TEXT NOT NULL,
      description TEXT,
      approver_count INTEGER DEFAULT 0,
      require_multi_approver INTEGER DEFAULT 0,
      approver_roles TEXT,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // 审批金额阈值表 — 金额区间对应的审批级别
  db.run(`
    CREATE TABLE IF NOT EXISTS approval_amount_thresholds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oid TEXT UNIQUE NOT NULL,
      max_amount REAL NOT NULL,
      level_code TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== V11.0: 通知偏好设置表 ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_oid TEXT NOT NULL UNIQUE,
      approval_notify INTEGER DEFAULT 1,
      alert_notify INTEGER DEFAULT 1,
      daily_summary INTEGER DEFAULT 0,
      announcement_notify INTEGER DEFAULT 1,
      dnd_enabled INTEGER DEFAULT 0,
      dnd_start_time TEXT,
      dnd_end_time TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // 审批类型规则表 — 37种审批类型的特殊规则
  db.run(`
    CREATE TABLE IF NOT EXISTS approval_type_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oid TEXT UNIQUE NOT NULL,
      approval_type TEXT NOT NULL UNIQUE,
      force_exempt INTEGER DEFAULT 0,
      force_strict INTEGER DEFAULT 0,
      forced_level TEXT,
      batch_approval_supported INTEGER DEFAULT 0,
      custom_approver_count INTEGER,
      remark TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== V11.0: 成本核算管理表 ==========

  db.run(`
    CREATE TABLE IF NOT EXISTS cost_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oid TEXT UNIQUE NOT NULL,
      category_code TEXT NOT NULL,
      category_name TEXT NOT NULL,
      category_type TEXT NOT NULL DEFAULT 'other',
      unit TEXT DEFAULT '元',
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS cost_budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oid TEXT UNIQUE NOT NULL,
      budget_name TEXT NOT NULL,
      category_oid TEXT NOT NULL,
      budget_year INTEGER NOT NULL,
      budget_month INTEGER,
      budget_amount REAL DEFAULT 0,
      used_amount REAL DEFAULT 0,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== V11.0: 班次管理表 ==========
  db.run(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oid TEXT UNIQUE NOT NULL,
      shift_code TEXT NOT NULL,
      shift_name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      shift_type TEXT DEFAULT '早班',
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== V11.0: 农事活动定义表（系统设置 - 农事活动管理）==========
  db.run(`
    CREATE TABLE IF NOT EXISTS farm_activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oid TEXT UNIQUE NOT NULL,
      activity_code TEXT NOT NULL,
      activity_name TEXT NOT NULL,
      activity_type TEXT,
      priority TEXT DEFAULT 'MEDIUM',
      branch_oid TEXT,
      block_oid TEXT,
      start_time TEXT,
      end_time TEXT,
      assignee_ids TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  // ========== V11.0: 物料类型定义表（系统设置 - 物料管理）==========
  db.run(`
    CREATE TABLE IF NOT EXISTS material_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      oid TEXT UNIQUE NOT NULL,
      type_code TEXT NOT NULL,
      type_name TEXT NOT NULL,
      category TEXT,
      default_unit TEXT,
      default_price REAL DEFAULT 0,
      specifications TEXT,
      description TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now','localtime')),
      updated_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  console.log('数据库表初始化完成');

  // 创建索引
  try {
    createIndexes();
  } catch (e) {
    console.error('索引创建失败:', e);
  }
}
