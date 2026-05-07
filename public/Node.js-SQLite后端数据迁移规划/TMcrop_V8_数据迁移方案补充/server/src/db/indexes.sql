/**
 * 复合索引 SQL 定义
 * 在数据库初始化时执行，优化查询性能
 */

-- 作物品种相关索引
CREATE INDEX IF NOT EXISTS idx_crop_varieties_category ON crop_varieties(category);
CREATE INDEX IF NOT EXISTS idx_crop_varieties_status ON crop_varieties(status);

-- 种植批次复合索引
CREATE INDEX IF NOT EXISTS idx_plantings_batch ON plantings(batch_code);
CREATE INDEX IF NOT EXISTS idx_plantings_greenhouse ON plantings(greenhouse_id);
CREATE INDEX IF NOT EXISTS idx_plantings_status ON plantings(status);

-- 采收记录复合索引
CREATE INDEX IF NOT EXISTS idx_harvest_batch ON harvest_records(batch_id);
CREATE INDEX IF NOT EXISTS idx_harvest_date ON harvest_records(harvest_date);
CREATE INDEX IF NOT EXISTS idx_harvest_quality ON harvest_records(quality_grade);

-- 物料申请复合索引
CREATE INDEX IF NOT EXISTS idx_material_requests_status ON material_requests(status);
CREATE INDEX IF NOT EXISTS idx_material_requests_date ON material_requests(request_date);

-- 农事任务复合索引
CREATE INDEX IF NOT EXISTS idx_farm_tasks_assignee ON farm_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_farm_tasks_status ON farm_tasks(status);
CREATE INDEX IF NOT EXISTS idx_farm_tasks_due ON farm_tasks(due_date);

-- 审批复合索引
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_type ON approvals(type);
CREATE INDEX IF NOT EXISTS idx_approvals_applicant ON approvals(applicant_id);

-- 日志复合索引
CREATE INDEX IF NOT EXISTS idx_operation_logs_module ON operation_logs(module);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at);

-- 通知复合索引
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- 成本核算复合索引
CREATE INDEX IF NOT EXISTS idx_cost_accounting_date ON cost_accounting(record_date);

-- 设备管理复合索引
CREATE INDEX IF NOT EXISTS idx_device_status ON device_management(status);
CREATE INDEX IF NOT EXISTS idx_device_maintenance ON device_management(next_maintenance);
