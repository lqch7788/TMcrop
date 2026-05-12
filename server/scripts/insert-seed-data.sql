-- 人工管理模块种子数据填充脚本

-- =============================================
-- 1. 请假记录 (leave_records) - 6条，状态分散
-- =============================================
INSERT INTO leave_records (id, worker_id, worker_name, leave_type, start_date, end_date, days, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('LV2026051201', 'W001', '郭靖', '年假', '2026-05-15', '2026-05-17', 3, '回家探亲', 'pending', 'D001', '种植部', '回老家探亲', datetime('now'), datetime('now'));

INSERT INTO leave_records (id, worker_id, worker_name, leave_type, start_date, end_date, days, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('LV2026051202', 'W002', '黄蓉', '病假', '2026-05-10', '2026-05-12', 3, '身体不适', 'approved', 'D002', '采摘部', '感冒发烧', datetime('now', '-5 days'), datetime('now', '-5 days'));

INSERT INTO leave_records (id, worker_id, worker_name, leave_type, start_date, end_date, days, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('LV2026051203', 'W003', '杨过', '事假', '2026-05-20', '2026-05-20', 1, '处理私事', 'rejected', 'D003', '加工部', '家中有事', datetime('now', '-3 days'), datetime('now', '-2 days'));

INSERT INTO leave_records (id, worker_id, worker_name, leave_type, start_date, end_date, days, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('LV2026051204', 'W004', '小龙女', '婚假', '2026-06-01', '2026-06-10', 10, '婚礼筹备', 'approved', 'D001', '种植部', '结婚请假', datetime('now', '-10 days'), datetime('now', '-8 days'));

INSERT INTO leave_records (id, worker_id, worker_name, leave_type, start_date, end_date, days, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('LV2026051205', 'W005', '萧峰', '年假', '2026-05-25', '2026-05-30', 6, '年度休假', 'pending', 'D004', '物流部', '安排旅游', datetime('now'), datetime('now'));

INSERT INTO leave_records (id, worker_id, worker_name, leave_type, start_date, end_date, days, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('LV2026051206', 'W006', '段誉', '丧假', '2026-05-08', '2026-05-12', 5, '家中有丧', 'cancelled', 'D005', '仓储部', '亲人去世', datetime('now', '-7 days'), datetime('now', '-6 days'));

-- =============================================
-- 2. 加班记录 (overtime_records) - 6条，状态分散
-- =============================================
INSERT INTO overtime_records (id, worker_id, worker_name, overtime_type, work_date, start_time, end_time, hours, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('OT2026051201', 'W001', '郭靖', 'workday', '2026-05-08', '18:00', '22:00', 4, '紧急采收任务', 'approved', 'D001', '种植部', '8号棚辣椒紧急采收', datetime('now', '-4 days'), datetime('now', '-3 days'));

INSERT INTO overtime_records (id, worker_id, worker_name, overtime_type, work_date, start_time, end_time, hours, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('OT2026051202', 'W002', '黄蓉', 'weekend', '2026-05-10', '08:00', '16:00', 8, '周末加班', 'pending', 'D002', '采摘部', '周末值班', datetime('now', '-2 days'), datetime('now'));

INSERT INTO overtime_records (id, worker_id, worker_name, overtime_type, work_date, start_time, end_time, hours, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('OT2026051203', 'W003', '杨过', 'holiday', '2026-05-01', '09:00', '18:00', 9, '节假日工作', 'rejected', 'D003', '加工部', '五一加班', datetime('now', '-11 days'), datetime('now', '-10 days'));

INSERT INTO overtime_records (id, worker_id, worker_name, overtime_type, work_date, start_time, end_time, hours, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('OT2026051204', 'W004', '小龙女', 'workday', '2026-05-09', '18:00', '21:00', 3, '设备维护', 'approved', 'D001', '种植部', '灌溉系统维修', datetime('now', '-3 days'), datetime('now', '-2 days'));

INSERT INTO overtime_records (id, worker_id, worker_name, overtime_type, work_date, start_time, end_time, hours, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('OT2026051205', 'W005', '萧峰', 'weekend', '2026-05-11', '08:00', '17:00', 9, '仓库整理', 'pending', 'D004', '物流部', '周末仓库盘点', datetime('now', '-1 days'), datetime('now'));

INSERT INTO overtime_records (id, worker_id, worker_name, overtime_type, work_date, start_time, end_time, hours, reason, status, department_id, department_name, remarks, create_time, update_time)
VALUES
  ('OT2026051206', 'W006', '段誉', 'workday', '2026-05-12', '19:00', '23:00', 4, '订单打包', 'approved', 'D005', '仓储部', '紧急订单处理', datetime('now'), datetime('now'));

-- =============================================
-- 3. 离职记录 (resignation_records) - 6条，状态分散
-- =============================================
INSERT INTO resignation_records (id, resignation_code, worker_id, worker_name, department, position, resignation_type, reason, expected_last_day, status, status_label, remarks, create_time, update_time)
VALUES
  ('RS2026051201', 'RZ20260001', 'W010', '令狐冲', '物流部', '技术员', '主动离职', '个人发展', '2026-06-15', 'pending', '待审批', '计划去其他城市发展', datetime('now', '-2 days'), datetime('now', '-2 days'));

INSERT INTO resignation_records (id, resignation_code, worker_id, worker_name, department, position, resignation_type, reason, expected_last_day, status, status_label, remarks, create_time, update_time)
VALUES
  ('RS2026051202', 'RZ20260002', 'W011', '任盈盈', '行政部', '专员', '主动离职', '家庭原因', '2026-05-30', 'approved', '已通过', '回老家照顾家人', datetime('now', '-10 days'), datetime('now', '-8 days'));

INSERT INTO resignation_records (id, resignation_code, worker_id, worker_name, department, position, resignation_type, reason, expected_last_day, status, status_label, remarks, create_time, update_time)
VALUES
  ('RS2026051203', 'RZ20260003', 'W012', '岳不群', '销售部', '经理', '被动离职', '岗位调整', '2026-05-20', 'rejected', '已拒绝', '部门合并', datetime('now', '-5 days'), datetime('now', '-4 days'));

INSERT INTO resignation_records (id, resignation_code, worker_id, worker_name, department, position, resignation_type, reason, expected_last_day, status, status_label, remarks, create_time, update_time)
VALUES
  ('RS2026051204', 'RZ20260004', 'W013', '张无忌', '加工部', '技术员', '合同到期', '合同到期不续签', '2026-06-01', 'pending', '待审批', '合同到期', datetime('now', '-1 days'), datetime('now', '-1 days'));

INSERT INTO resignation_records (id, resignation_code, worker_id, worker_name, department, position, resignation_type, reason, expected_last_day, status, status_label, remarks, create_time, update_time)
VALUES
  ('RS2026051205', 'RZ20260005', 'W014', '赵敏', '仓储部', '助理', '主动离职', '继续深造', '2026-07-01', 'approved', '已通过', '准备考研', datetime('now', '-15 days'), datetime('now', '-12 days'));

INSERT INTO resignation_records (id, resignation_code, worker_id, worker_name, department, position, resignation_type, reason, expected_last_day, status, status_label, remarks, create_time, update_time)
VALUES
  ('RS2026051206', 'RZ20260006', 'W015', '周芷若', '采摘部', '工人', '个人原因', '身体原因', '2026-05-25', 'pending', '待审批', '体力不支', datetime('now'), datetime('now'));

-- =============================================
-- 4. 招聘记录 (recruitment_records) - 6条，状态分散
-- =============================================
INSERT INTO recruitment_records (id, recruitment_code, dept_id, dept_name, position_id, position, headcount, employment_type, salary_min, salary_max, priority, priority_label, status, status_label, reason, remarks, applicant_id, applicant_name, apply_date, create_time, update_time)
VALUES
  ('RE2026051201', 'RC20260001', 'D001', '种植部', 'P001', '技术员', 2, '正式工', 5000, 8000, 'high', '高', 'pending', '待审批', '业务扩展', '需要补充种植技术人员', 'U001', '虚竹', '2026-05-10', datetime('now', '-2 days'), datetime('now', '-2 days'));

INSERT INTO recruitment_records (id, recruitment_code, dept_id, dept_name, position_id, position, headcount, employment_type, salary_min, salary_max, priority, priority_label, status, status_label, reason, remarks, applicant_id, applicant_name, apply_date, create_time, update_time)
VALUES
  ('RE2026051202', 'RC20260002', 'D002', '采摘部', 'P002', '工人', 5, '临时工', 3000, 5000, 'urgent', '紧急', 'approved', '已通过', '人员离职补充', '采收季需要更多人手', 'U001', '王语嫣', '2026-05-01', datetime('now', '-11 days'), datetime('now', '-10 days'));

INSERT INTO recruitment_records (id, recruitment_code, dept_id, dept_name, position_id, position, headcount, employment_type, salary_min, salary_max, priority, priority_label, status, status_label, reason, remarks, applicant_id, applicant_name, apply_date, create_time, update_time)
VALUES
  ('RE2026051203', 'RC20260003', 'D003', '加工部', 'P003', '主管', 1, '正式工', 8000, 12000, 'normal', '普通', 'rejected', '已拒绝', '部门调整', '暂无招聘需求', 'U001', '阿朱', '2026-05-05', datetime('now', '-7 days'), datetime('now', '-6 days'));

INSERT INTO recruitment_records (id, recruitment_code, dept_id, dept_name, position_id, position, headcount, employment_type, salary_min, salary_max, priority, priority_label, status, status_label, reason, remarks, applicant_id, applicant_name, apply_date, create_time, update_time)
VALUES
  ('RE2026051204', 'RC20260004', 'D004', '物流部', 'P004', '司机', 3, '正式工', 6000, 9000, 'high', '高', 'pending', '待审批', '业务扩展', '新线路开通', 'U001', '阿紫', '2026-05-08', datetime('now', '-4 days'), datetime('now', '-4 days'));

INSERT INTO recruitment_records (id, recruitment_code, dept_id, dept_name, position_id, position, headcount, employment_type, salary_min, salary_max, priority, priority_label, status, status_label, reason, remarks, applicant_id, applicant_name, apply_date, create_time, update_time)
VALUES
  ('RE2026051205', 'RC20260005', 'D005', '仓储部', 'P005', '专员', 1, '实习生', 2500, 3500, 'low', '低', 'approved', '已通过', '项目需求', '暑期实习生', 'U001', '慕容复', '2026-04-20', datetime('now', '-22 days'), datetime('now', '-20 days'));

INSERT INTO recruitment_records (id, recruitment_code, dept_id, dept_name, position_id, position, headcount, employment_type, salary_min, salary_max, priority, priority_label, status, status_label, reason, remarks, applicant_id, applicant_name, apply_date, create_time, update_time)
VALUES
  ('RE2026051206', 'RC20260006', 'D006', '销售部', 'P006', '经理', 1, '正式工', 10000, 15000, 'urgent', '紧急', 'pending', '待审批', '岗位空缺', '销售总监离职', 'U001', '游坦之', '2026-05-11', datetime('now', '-1 days'), datetime('now', '-1 days'));

-- =============================================
-- 5. 合同续签记录 (contract_renewal_records) - 6条
-- =============================================
INSERT INTO contract_renewal_records (id, employee_id, employee_name, department, position, current_contract_end, new_contract_start, new_contract_end, renewal_period, new_salary, terms_change, status, status_label, approver, approve_time, remarks, create_time)
VALUES
  ('CR2026051201', 'E001', '虚竹', '种植部', '技术员', '2026-06-30', '2026-07-01', '2027-06-30', 12, 6500, '薪资调整', 'pending', '待审批', NULL, NULL, '表现优秀', datetime('now', '-1 days'));

INSERT INTO contract_renewal_records (id, employee_id, employee_name, department, position, current_contract_end, new_contract_start, new_contract_end, renewal_period, new_salary, terms_change, status, status_label, approver, approve_time, remarks, create_time)
VALUES
  ('CR2026051202', 'E002', '王语嫣', '采摘部', '工人', '2026-05-31', '2026-06-01', '2027-05-31', 12, 5000, '合同延续', 'approved', '已通过', '管理员', datetime('now', '-5 days'), '同意续签', datetime('now', '-6 days'));

INSERT INTO contract_renewal_records (id, employee_id, employee_name, department, position, current_contract_end, new_contract_start, new_contract_end, renewal_period, new_salary, terms_change, status, status_label, approver, approve_time, remarks, create_time)
VALUES
  ('CR2026051203', 'E003', '阿朱', '加工部', '主管', '2026-07-15', '2026-07-16', '2027-07-15', 12, 9000, '合同条款变更', 'rejected', '已拒绝', '管理员', datetime('now', '-3 days'), '条款协商未果', datetime('now', '-4 days'));

INSERT INTO contract_renewal_records (id, employee_id, employee_name, department, position, current_contract_end, new_contract_start, new_contract_end, renewal_period, new_salary, terms_change, status, status_label, approver, approve_time, remarks, create_time)
VALUES
  ('CR2026051204', 'E004', '阿紫', '物流部', '专员', '2026-08-31', '2026-09-01', '2027-08-31', 12, 6000, '薪资调整', 'pending', '待审批', NULL, NULL, '续签申请', datetime('now'));

INSERT INTO contract_renewal_records (id, employee_id, employee_name, department, position, current_contract_end, new_contract_start, new_contract_end, renewal_period, new_salary, terms_change, status, status_label, approver, approve_time, remarks, create_time)
VALUES
  ('CR2026051205', 'E005', '慕容复', '仓储部', '经理', '2026-06-15', '2026-06-16', '2028-06-15', 24, 12000, '长期合同', 'approved', '已通过', '管理员', datetime('now', '-10 days'), '签订两年合同', datetime('now', '-11 days'));

INSERT INTO contract_renewal_records (id, employee_id, employee_name, department, position, current_contract_end, new_contract_start, new_contract_end, renewal_period, new_salary, terms_change, status, status_label, approver, approve_time, remarks, create_time)
VALUES
  ('CR2026051206', 'E006', '游坦之', '销售部', '助理', '2026-09-30', '2026-10-01', '2027-09-30', 12, 5500, '合同延续', 'pending', '待审批', NULL, NULL, '合同到期续签', datetime('now', '-2 days'));

-- =============================================
-- 6. 薪资预算记录 (salary_budget_records) - 6条
-- =============================================
INSERT INTO salary_budget_records (id, budget_code, dept_id, dept_name, budget_month, total_base_salary, total_overtime_pay, total_bonus, grand_total, status, status_label, applicant_id, applicant_name, apply_date, remark, create_time, update_time)
VALUES
  ('SB2026051201', 'SB20260501', 'D001', '种植部', '2026-05', 50000, 5000, 10000, 65000, 'pending', '待审批', 'U001', '虚竹', '2026-05-10', '5月预算申请', datetime('now', '-2 days'), datetime('now', '-2 days'));

INSERT INTO salary_budget_records (id, budget_code, dept_id, dept_name, budget_month, total_base_salary, total_overtime_pay, total_bonus, grand_total, status, status_label, applicant_id, applicant_name, apply_date, remark, create_time, update_time)
VALUES
  ('SB2026051202', 'SB20260502', 'D002', '采摘部', '2026-05', 80000, 8000, 15000, 103000, 'approved', '已通过', 'U001', '王语嫣', '2026-05-01', '5月预算', datetime('now', '-11 days'), datetime('now', '-10 days'));

INSERT INTO salary_budget_records (id, budget_code, dept_id, dept_name, budget_month, total_base_salary, total_overtime_pay, total_bonus, grand_total, status, status_label, applicant_id, applicant_name, apply_date, remark, create_time, update_time)
VALUES
  ('SB2026051203', 'SB20260503', 'D003', '加工部', '2026-05', 60000, 3000, 8000, 71000, 'rejected', '已拒绝', 'U001', '阿朱', '2026-05-05', '预算超支', datetime('now', '-7 days'), datetime('now', '-6 days'));

INSERT INTO salary_budget_records (id, budget_code, dept_id, dept_name, budget_month, total_base_salary, total_overtime_pay, total_bonus, grand_total, status, status_label, applicant_id, applicant_name, apply_date, remark, create_time, update_time)
VALUES
  ('SB2026051204', 'SB20260504', 'D004', '物流部', '2026-05', 70000, 6000, 12000, 88000, 'pending', '待审批', 'U001', '阿紫', '2026-05-08', '5月物流预算', datetime('now', '-4 days'), datetime('now', '-4 days'));

INSERT INTO salary_budget_records (id, budget_code, dept_id, dept_name, budget_month, total_base_salary, total_overtime_pay, total_bonus, grand_total, status, status_label, applicant_id, applicant_name, apply_date, remark, create_time, update_time)
VALUES
  ('SB2026051205', 'SB20260505', 'D005', '仓储部', '2026-05', 45000, 2000, 5000, 52000, 'approved', '已通过', 'U001', '慕容复', '2026-04-28', '5月仓储预算', datetime('now', '-14 days'), datetime('now', '-12 days'));

INSERT INTO salary_budget_records (id, budget_code, dept_id, dept_name, budget_month, total_base_salary, total_overtime_pay, total_bonus, grand_total, status, status_label, applicant_id, applicant_name, apply_date, remark, create_time, update_time)
VALUES
  ('SB2026051206', 'SB20260506', 'D006', '销售部', '2026-05', 90000, 10000, 20000, 120000, 'pending', '待审批', 'U001', '游坦之', '2026-05-11', '5月销售预算', datetime('now', '-1 days'), datetime('now', '-1 days'));

-- =============================================
-- 7. 入职记录 (onboarding_requests) - 6条
-- =============================================
INSERT INTO onboarding_requests (id, worker_id, worker_name, department, department_name, position, position_id, expected_start_date, actual_start_date, status, status_label, progress, recruitment_id, remarks, create_time, update_time)
VALUES
  ('OB2026051201', 'W020', '韦小宝', 'D001', '种植部', '技术员', 'P001', '2026-05-20', NULL, 'pending', '待入职', 30, 'RE2026051201', '新招聘技术员', datetime('now', '-1 days'), datetime('now', '-1 days'));

INSERT INTO onboarding_requests (id, worker_id, worker_name, department, department_name, position, position_id, expected_start_date, actual_start_date, status, status_label, progress, recruitment_id, remarks, create_time, update_time)
VALUES
  ('OB2026051202', 'W021', '双儿', 'D002', '采摘部', '工人', 'P002', '2026-05-15', '2026-05-15', 'onboarded', '已入职', 100, 'RE2026051202', '已入职', datetime('now', '-10 days'), datetime('now', '-5 days'));

INSERT INTO onboarding_requests (id, worker_id, worker_name, department, department_name, position, position_id, expected_start_date, actual_start_date, status, status_label, progress, recruitment_id, remarks, create_time, update_time)
VALUES
  ('OB2026051203', 'W022', '阿珂', 'D003', '加工部', '主管', 'P003', '2026-05-25', NULL, 'processing', '办理中', 70, 'RE2026051203', '入职手续办理中', datetime('now', '-3 days'), datetime('now', '-2 days'));

INSERT INTO onboarding_requests (id, worker_id, worker_name, department, department_name, position, position_id, expected_start_date, actual_start_date, status, status_label, progress, recruitment_id, remarks, create_time, update_time)
VALUES
  ('OB2026051204', 'W023', '建宁公主', 'D004', '物流部', '司机', 'P004', '2026-06-01', NULL, 'pending', '待入职', 30, 'RE2026051204', '等待入职', datetime('now', '-2 days'), datetime('now', '-2 days'));

INSERT INTO onboarding_requests (id, worker_id, worker_name, department, department_name, position, position_id, expected_start_date, actual_start_date, status, status_label, progress, recruitment_id, remarks, create_time, update_time)
VALUES
  ('OB2026051205', 'W024', '苏荃', 'D005', '仓储部', '专员', 'P005', '2026-05-10', '2026-05-10', 'onboarded', '已入职', 100, 'RE2026051205', '实习生入职', datetime('now', '-20 days'), datetime('now', '-15 days'));

INSERT INTO onboarding_requests (id, worker_id, worker_name, department, department_name, position, position_id, expected_start_date, actual_start_date, status, status_label, progress, recruitment_id, remarks, create_time, update_time)
VALUES
  ('OB2026051206', 'W025', '曾柔', 'D006', '销售部', '经理', 'P006', '2026-05-18', NULL, 'processing', '办理中', 60, 'RE2026051206', '背景调查中', datetime('now', '-4 days'), datetime('now', '-3 days'));

-- =============================================
-- 8. 调薪记录 (salary_adjustment_records) - 6条
-- =============================================
INSERT INTO salary_adjustment_records (id, worker_id, worker_name, department, position, current_salary, proposed_salary, adjustment_amount, adjustment_ratio, adjustment_type, effective_date, reason, status, status_label, approver, approve_time, remarks, create_time, update_time)
VALUES
  ('SA2026051201', 'W001', '陈家洛', '种植部', '主管', 8000, 10000, 2000, 25.00, '年度调薪', '2026-06-01', '工作表现优秀', 'pending', '待审批', NULL, NULL, '年度绩效A', datetime('now', '-1 days'), datetime('now', '-1 days'));

INSERT INTO salary_adjustment_records (id, worker_id, worker_name, department, position, current_salary, proposed_salary, adjustment_amount, adjustment_ratio, adjustment_type, effective_date, reason, status, status_label, approver, approve_time, remarks, create_time, update_time)
VALUES
  ('SA2026051202', 'W002', '霍青桐', '采摘部', '技术员', 6000, 7200, 1200, 20.00, '晋升调薪', '2026-05-01', '晋升为组长', 'approved', '已通过', '管理员', datetime('now', '-10 days'), '晋升调薪', datetime('now', '-11 days'), datetime('now', '-10 days'));

INSERT INTO salary_adjustment_records (id, worker_id, worker_name, department, position, current_salary, proposed_salary, adjustment_amount, adjustment_ratio, adjustment_type, effective_date, reason, status, status_label, approver, approve_time, remarks, create_time, update_time)
VALUES
  ('SA2026051203', 'W003', '香香公主', '加工部', '专员', 5500, 5500, 0, 0.00, '市场调整', '2026-06-01', '市场薪资调整', 'rejected', '已拒绝', '管理员', datetime('now', '-5 days'), '暂缓调整', datetime('now', '-6 days'), datetime('now', '-5 days'));

INSERT INTO salary_adjustment_records (id, worker_id, worker_name, department, position, current_salary, proposed_salary, adjustment_amount, adjustment_ratio, adjustment_type, effective_date, reason, status, status_label, approver, approve_time, remarks, create_time, update_time)
VALUES
  ('SA2026051204', 'W004', '袁承志', '物流部', '司机', 7000, 8500, 1500, 21.43, '绩效调薪', '2026-07-01', '年度绩效优秀', 'pending', '待审批', NULL, NULL, '绩效A+', datetime('now', '-2 days'), datetime('now', '-2 days'));

INSERT INTO salary_adjustment_records (id, worker_id, worker_name, department, position, current_salary, proposed_salary, adjustment_amount, adjustment_ratio, adjustment_type, effective_date, reason, status, status_label, approver, approve_time, remarks, create_time, update_time)
VALUES
  ('SA2026051205', 'W005', '温青青', '仓储部', '助理', 4500, 5000, 500, 11.11, '年度调薪', '2026-05-01', '年度调薪', 'approved', '已通过', '管理员', datetime('now', '-15 days'), '普通调薪', datetime('now', '-16 days'), datetime('now', '-15 days'));

INSERT INTO salary_adjustment_records (id, worker_id, worker_name, department, position, current_salary, proposed_salary, adjustment_amount, adjustment_ratio, adjustment_type, effective_date, reason, status, status_label, approver, approve_time, remarks, create_time, update_time)
VALUES
  ('SA2026051206', 'W006', '狄云', '销售部', '经理', 12000, 14400, 2400, 20.00, '晋升调薪', '2026-08-01', '晋升为总监', 'pending', '待审批', NULL, NULL, '管理层调整', datetime('now'), datetime('now'));
