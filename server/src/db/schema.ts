/**
 * 数据库表结构定义
 * 对应现有 LocalStorage 的数据存储
 */

import { getDatabase } from './index';

export function initializeDatabase() {
  const db = getDatabase();

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

  console.log('数据库表初始化完成');
}
