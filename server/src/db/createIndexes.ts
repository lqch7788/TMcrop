/**
 * 数据库索引优化脚本
 * 为核心业务表创建复合索引，提升查询性能
 */

import { getDatabase } from './index';

export function createIndexes() {
  const db = getDatabase();

  console.log('开始创建索引...');

  // ========== 1. 作物品种表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_crop_varieties_category
    ON crop_varieties(category_code, crop_code)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_crop_varieties_status
    ON crop_varieties(status, crop_code)
  `);

  // ========== 2. 种源表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_seed_sources_crop
    ON seed_sources(crop_name, status, create_time)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_seed_sources_supplier
    ON seed_sources(supplier_id, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_seed_sources_status
    ON seed_sources(status, remaining_quantity)
  `);

  // ========== 3. 育苗表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_seedlings_source
    ON seedlings(source_id, crop_name, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_seedlings_greenhouse
    ON seedlings(greenhouse_name, seedling_date, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_seedlings_status
    ON seedlings(status, expected_finish_date)
  `);

  // ========== 4. 种植表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plantings_source
    ON plantings(source_id, crop_name, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plantings_greenhouse
    ON plantings(greenhouse_name, planting_date, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_plantings_crop_status
    ON plantings(crop_name, status, planting_date)
  `);

  // ========== 5. 采收记录表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_harvest_source
    ON harvest_records(source_id, crop_name, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_harvest_greenhouse
    ON harvest_records(greenhouse_name, harvest_date, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_harvest_crop_status
    ON harvest_records(crop_name, status, harvest_date)
  `);

  // ========== 6. 作物实例表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_crop_instances_order
    ON crop_instances(order_id, crop_name, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_crop_instances_source
    ON crop_instances(source_instance_id, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_crop_instances_crop_status
    ON crop_instances(crop_name, status, planting_date)
  `);

  // ========== 7. 订单表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_crop_orders_customer
    ON crop_orders(customer_name, status, order_date)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_crop_orders_status
    ON crop_orders(status, expected_delivery_date)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_crop_orders_crop
    ON crop_orders(crop_name, status)
  `);

  // ========== 8. 库存表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_inventory_warehouse
    ON inventory(warehouse_id, crop_name, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_inventory_batch
    ON inventory(batch_code, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_inventory_harvest
    ON inventory(harvest_record_id, status)
  `);

  // ========== 9. 审批表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_approvals_applicant
    ON approvals(applicant_id, status, apply_date)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_approvals_type_status
    ON approvals(type, status, current_step)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_approvals_business
    ON approvals(business_link, status)
  `);

  // ========== 10. 部门表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_departments_parent
    ON departments(parent_oid, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_departments_status
    ON departments(status, sort_number)
  `);

  // ========== 11. 职位表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_positions_department
    ON positions(department_oid, status)
  `);

  // ========== 12. 班组表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_teams_department
    ON teams(department_oid, status)
  `);

  // ========== 13. 温室表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_greenhouses_base
    ON greenhouses(base_oid, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_greenhouses_crop
    ON greenhouses(crop, status)
  `);

  // ========== 14. 区域表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_zones_greenhouse
    ON zones(greenhouse_oid, status)
  `);

  // ========== 15. 地块表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_blocks_zone
    ON blocks(zone_oid, status)
  `);

  // ========== 16. 农事任务表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_farm_tasks_assignee
    ON farm_tasks(assignee_id, status, plan_date)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_farm_tasks_greenhouse
    ON farm_tasks(greenhouse_id, status, plan_date)
  `);

  // ========== 17. 巡查记录表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_inspections_inspector
    ON inspections(inspector_id, check_date, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_inspections_greenhouse
    ON inspections(greenhouse_name, check_date, status)
  `);

  // ========== 18. 问题记录表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_problems_assignee
    ON problems(assignee_id, status, create_time)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_problems_greenhouse
    ON problems(greenhouse_name, status, priority)
  `);

  // ========== 19. 人工记录表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_labor_records_worker
    ON labor_records(worker_id, work_date, status)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_labor_records_greenhouse
    ON labor_records(greenhouse_id, work_date, status)
  `);

  // ========== 20. 生产计划表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_production_plans_crop
    ON production_plans(crop_name, status, planting_date)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_production_plans_greenhouse
    ON production_plans(greenhouse_name, status, expected_harvest_date)
  `);

  // ========== 21. 临时任务表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_temp_tasks_executor
    ON temp_tasks(assignee_id, status, create_time)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_temp_tasks_status
    ON temp_tasks(status, due_date, priority)
  `);

  // ========== 22. 加班记录表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_overtime_worker
    ON overtime_records(worker_id, work_date, status)
  `);

  // ========== 23. 请假记录表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_leave_worker
    ON leave_records(worker_id, start_date, end_date, status)
  `);

  // ========== 24. 物料申请表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_material_requests_applicant
    ON material_requests(applicant_id, status, apply_date)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_material_requests_warehouse
    ON material_requests(warehouse_id, status)
  `);

  // ========== 25. 采购计划表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_purchase_plans_applicant
    ON purchase_plans(applicant_id, status, apply_date)
  `);

  // ========== 26. 供应商表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_suppliers_type
    ON suppliers(supplier_type, status)
  `);

  // ========== 27. 操作日志表索引 ==========
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_operation_logs_user
    ON operation_logs(user_id, created_at)
  `);
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_operation_logs_module
    ON operation_logs(module, created_at)
  `);

  // ========== 28. 通知表索引 ==========
  // notifications 表不存在，跳过该索引
  // db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_receiver ON notifications(receiver_id, is_read, create_time)`);

  // ========== 29. V10.0 新表索引 ==========
  // 施肥记录表索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_fertilizer_code ON fertilizer_records(fertilizer_code)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_fertilizer_greenhouse ON fertilizer_records(greenhouse_name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_fertilizer_time ON fertilizer_records(fertilize_time)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_fertilizer_source ON fertilizer_records(data_source)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_fertilizer_crop ON fertilizer_records(crop_name)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_fertilizer_type ON fertilizer_records(fertilizer_type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_fertilizer_task ON fertilizer_records(farm_task_id)`);

  // 行政区划表索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_region_parent ON region_data(parent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_region_level ON region_data(level)`);

  // 种植标签表索引
  db.run(`CREATE INDEX IF NOT EXISTS idx_plant_labels_planting ON plant_labels(planting_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_plant_labels_number ON plant_labels(label_number)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_label_resume_label ON plant_label_resume(label_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_label_resume_type ON plant_label_resume(operation_type)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_plant_marks_parent ON plant_marks(parent_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_plant_marks_aid ON plant_marks(mark_aid)`);

  console.log('索引创建完成！共创建 70 个索引');
}

// 导出索引信息查询函数
export function getIndexes() {
  const db = getDatabase();
  const result = db.exec(`
    SELECT name, tbl_name, sql
    FROM sqlite_master
    WHERE type = 'index'
    AND sql IS NOT NULL
    ORDER BY tbl_name, name
  `);
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

// 导出索引统计函数
export function analyzeIndexes() {
  const db = getDatabase();
  db.run('ANALYZE');
  const result = db.exec(`
    SELECT name, tbl_name
    FROM sqlite_master
    WHERE type = 'table'
  `);
  if (result.length === 0) return [];
  const { columns, values } = result[0];
  return values.map(row => {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}
