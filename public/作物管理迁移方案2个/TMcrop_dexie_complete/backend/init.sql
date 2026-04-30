-- TM-Crop 数据库初始化脚本
-- 9 张核心表 + 索引

-- 1. 种源表 seed_sources
CREATE TABLE IF NOT EXISTS seed_sources (
  id TEXT PRIMARY KEY,
  seed_code TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL,
  source_origin TEXT NOT NULL,
  crop_category TEXT,
  type_name TEXT,
  variety_name TEXT,
  crop_name TEXT,
  crop_variety TEXT,
  crop_code TEXT,
  supplier_id TEXT,
  supplier_name TEXT,
  purchase_date TEXT,
  quantity INTEGER DEFAULT 0,
  unit TEXT,
  unit_price REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  initial_count INTEGER DEFAULT 0,
  available_count INTEGER DEFAULT 0,
  pictures TEXT, -- JSON array of picture ids
  remarks TEXT,
  status TEXT,
  print_count INTEGER DEFAULT 0,
  create_by TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_seed_sources_code ON seed_sources(seed_code);
CREATE INDEX IF NOT EXISTS idx_seed_sources_crop_code ON seed_sources(crop_code);
CREATE INDEX IF NOT EXISTS idx_seed_sources_status ON seed_sources(status);

-- 2. 育苗表 seedlings
CREATE TABLE IF NOT EXISTS seedlings (
  id TEXT PRIMARY KEY,
  seedling_code TEXT NOT NULL UNIQUE,
  source_id TEXT,
  source_code TEXT,
  crop_name TEXT,
  crop_variety TEXT,
  seedling_type TEXT,
  site_id TEXT,
  site_name TEXT,
  start_date TEXT,
  end_date TEXT,
  expected_end_date TEXT,
  initial_count INTEGER DEFAULT 0,
  survival_count INTEGER DEFAULT 0,
  planted_count INTEGER DEFAULT 0,
  survival_rate REAL DEFAULT 0,
  loss_count INTEGER DEFAULT 0,
  loss_rate REAL DEFAULT 0,
  is_finished INTEGER DEFAULT 0,
  status TEXT,
  pictures TEXT, -- JSON array of picture ids
  quality_grade TEXT,
  print_count INTEGER DEFAULT 0,
  remarks TEXT,
  create_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (source_id) REFERENCES seed_sources(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_seedlings_source_id ON seedlings(source_id);
CREATE INDEX IF NOT EXISTS idx_seedlings_status ON seedlings(status);

-- 3. 种植表 plantings
CREATE TABLE IF NOT EXISTS plantings (
  id TEXT PRIMARY KEY,
  plant_code TEXT NOT NULL UNIQUE,
  source_type TEXT,
  source_id TEXT,
  source_code TEXT,
  crop_name TEXT,
  crop_variety TEXT,
  area_id TEXT,
  area_name TEXT,
  root_name TEXT,
  planting_count INTEGER DEFAULT 0,
  planting_date TEXT,
  soil_ph REAL,
  soil_ec REAL,
  transplant_count INTEGER DEFAULT 0,
  transplant_date TEXT,
  is_harvest INTEGER DEFAULT 0,
  harvest_date TEXT,
  attrition_rate REAL DEFAULT 0,
  print_count INTEGER DEFAULT 0,
  traceability_code TEXT,
  pictures TEXT, -- JSON array of picture ids
  status TEXT,
  remarks TEXT,
  create_by TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (source_id) REFERENCES seedlings(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_plantings_source_id ON plantings(source_id);
CREATE INDEX IF NOT EXISTS idx_plantings_status ON plantings(status);

-- 4. 育苗每日记录表 daily_records
CREATE TABLE IF NOT EXISTS daily_records (
  id TEXT PRIMARY KEY,
  seedling_id TEXT NOT NULL,
  record_date TEXT,
  temperature REAL,
  humidity REAL,
  watering INTEGER DEFAULT 0,
  remarks TEXT,
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (seedling_id) REFERENCES seedlings(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_daily_records_seedling_id ON daily_records(seedling_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(record_date);

-- 5. 采收表 harvests
CREATE TABLE IF NOT EXISTS harvests (
  id TEXT PRIMARY KEY,
  harvest_code TEXT NOT NULL UNIQUE,
  batch_id TEXT,
  batch_code TEXT,
  crop_name TEXT,
  greenhouse_id TEXT,
  greenhouse_name TEXT,
  harvest_date TEXT,
  harvest_area REAL DEFAULT 0,
  harvest_quantity REAL DEFAULT 0,
  unit TEXT,
  quality TEXT,
  grade TEXT,
  harvester_ids TEXT, -- JSON array
  harvester_names TEXT, -- JSON array
  warehouse_id TEXT,
  warehouse_name TEXT,
  status TEXT,
  auditor TEXT,
  variety TEXT,
  planting_mode TEXT,
  target_yield REAL DEFAULT 0,
  related_task_id TEXT,
  related_task_code TEXT,
  pictures TEXT,
  remarks TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_harvests_batch_code ON harvests(batch_code);
CREATE INDEX IF NOT EXISTS idx_harvests_date ON harvests(harvest_date);

-- 6. 作物实例表 crop_instances
CREATE TABLE IF NOT EXISTS crop_instances (
  id TEXT PRIMARY KEY,
  instance_code TEXT NOT NULL UNIQUE,
  order_id TEXT,
  order_code TEXT,
  crop_category TEXT,
  crop_name TEXT,
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
  status TEXT,
  seed_entry_date TEXT,
  seedling_start_date TEXT,
  planting_date TEXT,
  harvest_date TEXT,
  source_instance_id TEXT,
  create_by TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_instances_order_id ON crop_instances(order_id);
CREATE INDEX IF NOT EXISTS idx_instances_crop_code ON crop_instances(instance_code);

-- 7. 作物订单表 crop_orders
CREATE TABLE IF NOT EXISTS crop_orders (
  id TEXT PRIMARY KEY,
  order_code TEXT NOT NULL UNIQUE,
  customer_name TEXT,
  customer_contact TEXT,
  order_date TEXT,
  delivery_date TEXT,
  quantity INTEGER DEFAULT 0,
  unit TEXT,
  price REAL DEFAULT 0,
  total_amount REAL DEFAULT 0,
  status TEXT,
  instance_ids TEXT, -- JSON array
  remarks TEXT,
  create_by TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_code ON crop_orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_status ON crop_orders(status);

-- 8. 品种库表 crop_varieties
CREATE TABLE IF NOT EXISTS crop_varieties (
  id TEXT PRIMARY KEY,
  crop_code TEXT NOT NULL UNIQUE,
  category_code TEXT,
  category_name TEXT,
  type_code TEXT,
  type_name TEXT,
  variety_code TEXT,
  variety_name TEXT,
  sub_variety1_code TEXT,
  sub_variety1_name TEXT,
  sub_variety2_code TEXT,
  sub_variety2_name TEXT,
  detail_variety_code TEXT,
  alias TEXT, -- JSON array
  growth_cycle INTEGER,
  target_yield REAL,
  yield_unit TEXT,
  status TEXT,
  remarks TEXT,
  created_at TEXT,
  updated_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_varieties_code ON crop_varieties(crop_code);
CREATE INDEX IF NOT EXISTS idx_varieties_category ON crop_varieties(category_code);
CREATE INDEX IF NOT EXISTS idx_varieties_status ON crop_varieties(status);

-- 9. 图片表 pictures
CREATE TABLE IF NOT EXISTS pictures (
  id TEXT PRIMARY KEY,
  ref_type TEXT, -- 关联类型: seed_source, seedling, planting, harvest, etc.
  ref_id TEXT,
  filename TEXT,
  mime_type TEXT,
  size INTEGER,
  data BLOB, -- 二进制数据存储
  created_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_pictures_ref ON pictures(ref_type, ref_id);
