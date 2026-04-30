

-- ============================================
-- 扩展模块表定义（新增）
-- 版本 2.0：追加基础设置、库存管理、审批中心、人工管理等模块表
-- ============================================

-- ===== 基础设置层 =====

-- 公司分组表
CREATE TABLE IF NOT EXISTS company_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  create_by TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 基地表
CREATE TABLE IF NOT EXISTS bases (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  area REAL DEFAULT 0,
  unit TEXT,
  crop TEXT,
  growth_day INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  status_text TEXT,
  manager TEXT,
  phone TEXT,
  soil_type TEXT,
  ph REAL,
  coords TEXT,
  city TEXT,
  province TEXT,
  lng REAL,
  lat REAL,
  intro TEXT,
  greenhouse_count INTEGER DEFAULT 0,
  field_area REAL DEFAULT 0,
  company_id TEXT,
  company_name TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 管理指标表
CREATE TABLE IF NOT EXISTS indicators (
  id TEXT PRIMARY KEY,
  data_json TEXT, -- JSON 存储所有字段
  created_at TEXT,
  updated_at TEXT
);

-- 农事活动表
CREATE TABLE IF NOT EXISTS farm_activities (
  id TEXT PRIMARY KEY,
  data_json TEXT, -- JSON 存储所有字段
  created_at TEXT,
  updated_at TEXT
);

-- ===== 库存管理 =====

-- 产品库存表
CREATE TABLE IF NOT EXISTS produce_inventories (
  id TEXT PRIMARY KEY,
  data_json TEXT, -- JSON 存储所有字段
  created_at TEXT,
  updated_at TEXT
);

-- 仓库表
CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  data_json TEXT, -- JSON 存储所有字段
  created_at TEXT,
  updated_at TEXT
);

-- 物料表
CREATE TABLE IF NOT EXISTS materials (
  id TEXT PRIMARY KEY,
  data_json TEXT, -- JSON 存储所有字段
  created_at TEXT,
  updated_at TEXT
);

-- 领料记录表
CREATE TABLE IF NOT EXISTS material_receiving_records (
  id TEXT PRIMARY KEY,
  data_json TEXT, -- JSON 存储所有字段
  created_at TEXT,
  updated_at TEXT
);

-- 物料使用表
CREATE TABLE IF NOT EXISTS material_usages (
  id TEXT PRIMARY KEY,
  data_json TEXT, -- JSON 存储所有字段
  created_at TEXT,
  updated_at TEXT
);

-- 退料记录表
CREATE TABLE IF NOT EXISTS material_returns (
  id TEXT PRIMARY KEY,
  data_json TEXT, -- JSON 存储所有字段
  created_at TEXT,
  updated_at TEXT
);

-- ===== 审批中心 =====

-- 审批单表
CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY,
  data_json TEXT, -- JSON 存储所有字段
  created_at TEXT,
  updated_at TEXT
);

-- ===== 人工管理（12个模块） =====

-- 考勤记录表
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 考勤补卡表
CREATE TABLE IF NOT EXISTS attendance_repairs (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 请假记录表
CREATE TABLE IF NOT EXISTS leave_records (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 加班记录表
CREATE TABLE IF NOT EXISTS overtime_records (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 招聘记录表
CREATE TABLE IF NOT EXISTS recruitment_records (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 合同记录表
CREATE TABLE IF NOT EXISTS contracts (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 入职记录表
CREATE TABLE IF NOT EXISTS onboardings (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 离职记录表
CREATE TABLE IF NOT EXISTS resignations (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 薪资调整表
CREATE TABLE IF NOT EXISTS salary_adjustments (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 薪资预算表
CREATE TABLE IF NOT EXISTS salary_budgets (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 任务中心表
CREATE TABLE IF NOT EXISTS task_center_records (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 人员档案表
CREATE TABLE IF NOT EXISTS personnel_records (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- ===== 生产计划 =====

-- 生产计划表
CREATE TABLE IF NOT EXISTS production_plans (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 日计划表
CREATE TABLE IF NOT EXISTS daily_plans (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 月计划表
CREATE TABLE IF NOT EXISTS monthly_plans (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- ===== 系统设置 =====

-- 部门表
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 职位表
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 员工表
CREATE TABLE IF NOT EXISTS staff (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_configs (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 字典表
CREATE TABLE IF NOT EXISTS dictionaries (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- ===== 种植模式与区域 =====

-- 种植模式表
CREATE TABLE IF NOT EXISTS planting_modes (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 种植区域表
CREATE TABLE IF NOT EXISTS plant_areas (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);

-- 地块表
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  data_json TEXT,
  created_at TEXT,
  updated_at TEXT
);
