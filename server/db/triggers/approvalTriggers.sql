-- ============================================
-- 审批联动触发器：审批通过后自动执行业务动作
-- 对应 V8.0 方案 §3 审批联动触发器
-- ============================================

-- 触发器1：采购审批通过后更新采购单状态
CREATE TRIGGER IF NOT EXISTS trg_approval_passed_purchase
AFTER UPDATE ON approvals
WHEN NEW.status = 'approved' AND OLD.status = 'pending' AND NEW.approval_type = 'purchase'
BEGIN
  UPDATE purchase_orders
  SET status = 'approved',
      approved_by = NEW.current_node_id,
      approved_at = datetime('now'),
      update_time = datetime('now')
  WHERE id = NEW.business_id;

  -- 记录审计日志
  INSERT INTO audit_logs (
    id, operation_type, resource_type, resource_id, operation,
    operator_id, operation_detail, result, create_time
  ) VALUES (
    lower(hex(randomblob(16))), 'approval', 'purchase_order', NEW.business_id,
    'approve', NEW.applicant_id, '采购审批通过，单号：' || NEW.approval_code,
    'success', datetime('now')
  );
END;

-- 触发器2：请假审批通过后更新考勤状态
CREATE TRIGGER IF NOT EXISTS trg_approval_passed_leave
AFTER UPDATE ON approvals
WHEN NEW.status = 'approved' AND OLD.status = 'pending' AND NEW.approval_type = 'leave'
BEGIN
  UPDATE leave_records
  SET status = 'approved',
      approver_id = NEW.current_node_id,
      update_time = datetime('now')
  WHERE id = NEW.business_id;

  -- 同步更新考勤记录为请假状态
  UPDATE attendance_records
  SET status = 'leave',
      leave_type = (SELECT leave_type FROM leave_records WHERE id = NEW.business_id),
      update_time = datetime('now')
  WHERE staff_id = NEW.applicant_id
    AND record_date BETWEEN
      (SELECT start_date FROM leave_records WHERE id = NEW.business_id)
      AND (SELECT end_date FROM leave_records WHERE id = NEW.business_id);
END;

-- 触发器3：加班审批通过后更新考勤状态
CREATE TRIGGER IF NOT EXISTS trg_approval_passed_overtime
AFTER UPDATE ON approvals
WHEN NEW.status = 'approved' AND OLD.status = 'pending' AND NEW.approval_type = 'overtime'
BEGIN
  UPDATE overtime_records
  SET status = 'approved',
      update_time = datetime('now')
  WHERE id = NEW.business_id;

  -- 同步更新考勤记录的加班时长
  UPDATE attendance_records
  SET overtime_hours = (SELECT hours FROM overtime_records WHERE id = NEW.business_id),
      update_time = datetime('now')
  WHERE staff_id = NEW.applicant_id
    AND record_date = (SELECT overtime_date FROM overtime_records WHERE id = NEW.business_id);
END;

-- 触发器4：薪资调整审批通过后更新薪资记录
CREATE TRIGGER IF NOT EXISTS trg_approval_passed_salary
AFTER UPDATE ON approvals
WHEN NEW.status = 'approved' AND OLD.status = 'pending' AND NEW.approval_type = 'salary_adjustment'
BEGIN
  UPDATE salary_adjustments
  SET status = 'approved',
      effective_date = date('now'),
      update_time = datetime('now')
  WHERE id = NEW.business_id;

  -- 同步更新员工表薪资
  UPDATE staff
  SET hourly_rate = (SELECT new_salary FROM salary_adjustments WHERE id = NEW.business_id),
      update_time = datetime('now')
  WHERE id = (SELECT staff_id FROM salary_adjustments WHERE id = NEW.business_id);
END;

-- 触发器5：离职审批通过后更新员工状态
CREATE TRIGGER IF NOT EXISTS trg_approval_passed_resignation
AFTER UPDATE ON approvals
WHEN NEW.status = 'approved' AND OLD.status = 'pending' AND NEW.approval_type = 'resignation'
BEGIN
  UPDATE resignations
  SET status = 'approved',
      update_time = datetime('now')
  WHERE id = NEW.business_id;

  -- 同步更新员工状态为离职
  UPDATE staff
  SET status = 'resigned',
      update_time = datetime('now')
  WHERE id = (SELECT staff_id FROM resignations WHERE id = NEW.business_id);

  -- 同步更新用户状态为禁用
  UPDATE users
  SET status = 'inactive',
      update_time = datetime('now')
  WHERE id = (SELECT id FROM users WHERE real_name = (SELECT staff_name FROM staff WHERE id = (SELECT staff_id FROM resignations WHERE id = NEW.business_id)));
END;

-- 触发器6：通用审批驳回处理
CREATE TRIGGER IF NOT EXISTS trg_approval_rejected
AFTER UPDATE ON approvals
WHEN NEW.status = 'rejected' AND OLD.status = 'pending'
BEGIN
  -- 更新对应业务表状态为驳回
  CASE NEW.approval_type
    WHEN 'purchase' THEN
      UPDATE purchase_orders SET status = 'rejected', update_time = datetime('now') WHERE id = NEW.business_id;
    WHEN 'leave' THEN
      UPDATE leave_records SET status = 'rejected', update_time = datetime('now') WHERE id = NEW.business_id;
    WHEN 'overtime' THEN
      UPDATE overtime_records SET status = 'rejected', update_time = datetime('now') WHERE id = NEW.business_id;
    WHEN 'salary_adjustment' THEN
      UPDATE salary_adjustments SET status = 'rejected', update_time = datetime('now') WHERE id = NEW.business_id;
    WHEN 'resignation' THEN
      UPDATE resignations SET status = 'rejected', update_time = datetime('now') WHERE id = NEW.business_id;
  END;

  -- 记录审计日志
  INSERT INTO audit_logs (
    id, operation_type, resource_type, resource_id, operation,
    operator_id, operation_detail, result, create_time
  ) VALUES (
    lower(hex(randomblob(16))), 'approval', NEW.approval_type, NEW.business_id,
    'reject', NEW.current_node_id, '审批被驳回，单号：' || NEW.approval_code,
    'success', datetime('now')
  );
END;

-- ============================================
-- 审计日志触发器：核心业务表变更自动记录
-- ============================================

-- 触发器：种源表变更审计
CREATE TRIGGER IF NOT EXISTS trg_audit_seed_sources_insert
AFTER INSERT ON seed_sources
BEGIN
  INSERT INTO audit_logs (
    id, operation_type, resource_type, resource_id, operation,
    operator_id, operation_detail, result, create_time
  ) VALUES (
    lower(hex(randomblob(16))), 'data_change', 'seed_source', NEW.id,
    'create', NEW.create_by, '创建种源：' || NEW.seed_code || '，品种：' || NEW.crop_name,
    'success', datetime('now')
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_audit_seed_sources_update
AFTER UPDATE ON seed_sources
BEGIN
  INSERT INTO audit_logs (
    id, operation_type, resource_type, resource_id, operation,
    operator_id, operation_detail, result, create_time
  ) VALUES (
    lower(hex(randomblob(16))), 'data_change', 'seed_source', NEW.id,
    'update', NEW.update_by, '更新种源：' || NEW.seed_code,
    'success', datetime('now')
  );
END;

-- 触发器：库存变更审计
CREATE TRIGGER IF NOT EXISTS trg_audit_inventory_update
AFTER UPDATE ON produce_inventories
WHEN OLD.quantity != NEW.quantity
BEGIN
  INSERT INTO audit_logs (
    id, operation_type, resource_type, resource_id, operation,
    operator_id, operation_detail, result, create_time
  ) VALUES (
    lower(hex(randomblob(16))), 'data_change', 'inventory', NEW.id,
    'update', NULL, '库存变更：' || NEW.crop_name || '，原数量：' || OLD.quantity || '，新数量：' || NEW.quantity,
    'success', datetime('now')
  );
END;

-- 触发器：员工状态变更审计
CREATE TRIGGER IF NOT EXISTS trg_audit_staff_status
AFTER UPDATE ON staff
WHEN OLD.status != NEW.status
BEGIN
  INSERT INTO audit_logs (
    id, operation_type, resource_type, resource_id, operation,
    operator_id, operation_detail, result, create_time
  ) VALUES (
    lower(hex(randomblob(16))), 'data_change', 'staff', NEW.id,
    'status_change', NULL, '员工状态变更：' || NEW.staff_name || '，' || OLD.status || ' → ' || NEW.status,
    'success', datetime('now')
  );
END;

-- 触发器：育苗表变更审计
CREATE TRIGGER IF NOT EXISTS trg_audit_seedlings_insert
AFTER INSERT ON seedlings
BEGIN
  INSERT INTO audit_logs (
    id, operation_type, resource_type, resource_id, operation,
    operator_id, operation_detail, result, create_time
  ) VALUES (
    lower(hex(randomblob(16))), 'data_change', 'seedling', NEW.id,
    'create', NEW.create_by, '创建育苗：' || NEW.batch_code || '，品种：' || NEW.crop_name,
    'success', datetime('now')
  );
END;

-- 触发器：种植表变更审计
CREATE TRIGGER IF NOT EXISTS trg_audit_plantings_insert
AFTER INSERT ON plantings
BEGIN
  INSERT INTO audit_logs (
    id, operation_type, resource_type, resource_id, operation,
    operator_id, operation_detail, result, create_time
  ) VALUES (
    lower(hex(randomblob(16))), 'data_change', 'planting', NEW.id,
    'create', NEW.create_by, '创建种植：' || NEW.plant_code || '，品种：' || NEW.crop_name,
    'success', datetime('now')
  );
END;

-- 触发器：采收表变更审计
CREATE TRIGGER IF NOT EXISTS trg_audit_harvest_insert
AFTER INSERT ON harvest_records
BEGIN
  INSERT INTO audit_logs (
    id, operation_type, resource_type, resource_id, operation,
    operator_id, operation_detail, result, create_time
  ) VALUES (
    lower(hex(randomblob(16))), 'data_change', 'harvest', NEW.id,
    'create', NEW.create_by, '创建采收：' || NEW.harvest_code || '，品种：' || NEW.crop_name,
    'success', datetime('now')
  );
END;
