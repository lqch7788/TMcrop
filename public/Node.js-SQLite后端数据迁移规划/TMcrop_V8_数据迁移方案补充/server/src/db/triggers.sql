/**
 * 审批联动触发器 SQL
 * 在 SQLite 中通过 INSTEAD OF 触发器模拟审批状态联动
 * 实际项目中如果切换 PostgreSQL/MySQL，可直接使用原生触发器
 */

-- 采购审批通过后自动创建采购订单记录
CREATE TRIGGER IF NOT EXISTS trg_purchase_approval_passed
AFTER UPDATE ON purchase_plans
WHEN NEW.approval_status = 'approved' AND OLD.approval_status != 'approved'
BEGIN
  INSERT INTO operation_logs (id, module, action, resource_id, description, created_at)
  VALUES (
    'LOG' || strftime('%s','now') || random(),
    'purchase',
    'approval_passed',
    NEW.id,
    '采购计划 ' || NEW.plan_code || ' 审批通过',
    datetime('now')
  );
END;

-- 请假审批通过后同步考勤状态
CREATE TRIGGER IF NOT EXISTS trg_leave_approval_passed
AFTER UPDATE ON leave_records
WHEN NEW.status = 'approved' AND OLD.status != 'approved'
BEGIN
  INSERT INTO attendance_records (id, record_code, staff_id, staff_name, attendance_date, status, leave_type, remarks, created_at, updated_at)
  VALUES (
    'AT' || strftime('%s','now') || random(),
    'AUTO-' || strftime('%s','now'),
    NEW.staff_id,
    NEW.staff_name,
    NEW.start_date,
    'leave',
    NEW.leave_type,
    '请假审批通过自动生成',
    datetime('now'),
    datetime('now')
  );
  INSERT INTO operation_logs (id, module, action, resource_id, description, created_at)
  VALUES (
    'LOG' || strftime('%s','now') || random(),
    'leave',
    'approval_passed',
    NEW.id,
    '请假 ' || NEW.leave_code || ' 审批通过，已同步考勤',
    datetime('now')
  );
END;

-- 加班审批通过后同步考勤加班时长
CREATE TRIGGER IF NOT EXISTS trg_overtime_approval_passed
AFTER UPDATE ON overtime_records
WHEN NEW.status = 'approved' AND OLD.status != 'approved'
BEGIN
  UPDATE attendance_records
  SET overtime_hours = COALESCE(overtime_hours, 0) + NEW.overtime_hours,
      updated_at = datetime('now')
  WHERE staff_id = NEW.staff_id AND attendance_date = NEW.overtime_date;
  INSERT INTO operation_logs (id, module, action, resource_id, description, created_at)
  VALUES (
    'LOG' || strftime('%s','now') || random(),
    'overtime',
    'approval_passed',
    NEW.id,
    '加班 ' || NEW.overtime_code || ' 审批通过，已同步考勤加班时长',
    datetime('now')
  );
END;

-- 薪资调整审批通过（模拟通过更新 staff 表薪资字段）
CREATE TRIGGER IF NOT EXISTS trg_salary_adjustment_passed
AFTER UPDATE ON approvals
WHEN NEW.status = 'approved' AND OLD.status != 'approved' AND NEW.type = 'salary_adjustment'
BEGIN
  INSERT INTO operation_logs (id, module, action, resource_id, description, created_at)
  VALUES (
    'LOG' || strftime('%s','now') || random(),
    'salary',
    'approval_passed',
    NEW.id,
    '薪资调整审批 ' || NEW.approval_code || ' 已通过',
    datetime('now')
  );
END;

-- 离职审批通过后自动更新员工状态
CREATE TRIGGER IF NOT EXISTS trg_resignation_approval_passed
AFTER UPDATE ON resignations
WHEN NEW.status = 'approved' AND OLD.status != 'approved'
BEGIN
  UPDATE staff SET status = 'resigned', updated_at = datetime('now') WHERE id = NEW.staff_id;
  INSERT INTO operation_logs (id, module, action, resource_id, description, created_at)
  VALUES (
    'LOG' || strftime('%s','now') || random(),
    'resignation',
    'approval_passed',
    NEW.id,
    '离职申请 ' || NEW.resignation_code || ' 审批通过，员工状态已更新为离职',
    datetime('now')
  );
END;

-- 通用审批驳回触发器（记录驳回日志）
CREATE TRIGGER IF NOT EXISTS trg_approval_rejected
AFTER UPDATE ON approvals
WHEN NEW.status = 'rejected' AND OLD.status != 'rejected'
BEGIN
  INSERT INTO operation_logs (id, module, action, resource_id, description, created_at)
  VALUES (
    'LOG' || strftime('%s','now') || random(),
    COALESCE(NEW.type, 'approval'),
    'approval_rejected',
    NEW.id,
    '审批单 ' || COALESCE(NEW.approval_code, NEW.id) || ' 已被驳回',
    datetime('now')
  );
END;
