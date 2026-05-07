/**
 * 种子数据脚本：从 mockData 读取并导入 SQLite
 * 要求导入 >=50 条记录
 */

import { getDatabase, saveDatabase } from '../db';
import fs from 'fs';
import path from 'path';

let seeded = false;

export function seedFromMockData() {
  if (seeded) return;
  const db = getDatabase();

  function count(table: string): number {
    try {
      const r = db.exec(`SELECT COUNT(*) as c FROM ${table}`);
      return r.length > 0 && r[0].values.length > 0 ? (r[0].values[0][0] as number) : 0;
    } catch (e) { return 0; }
  }

  // 已有数据则跳过
  const totalExisting =
    count('staff') + count('bases') + count('materials') + count('planting_modes') +
    count('farm_activities') + count('daily_plans') + count('monthly_plans') +
    count('indicators') + count('production_records') + count('device_management') +
    count('cost_accounting') + count('attendance_records') + count('leave_records') +
    count('overtime_records') + count('recruitment_records') + count('contracts') +
    count('onboardings') + count('resignations');

  if (totalExisting >= 50) {
    console.log('[Seed] 数据库已有足够数据，跳过种子导入');
    seeded = true;
    return;
  }

  const now = new Date().toISOString();
  let inserted = 0;

  // 1. 员工 (10条)
  const staffData = [
    { id: 'ST001', staff_code: 'EMP001', name: '王建华', gender: '男', phone: '13800000001', email: 'wang@example.com', department_oid: 'D001', department_name: '管理层', position_oid: 'P001', position_name: '管理员', entry_date: '2020-01-01', status: 'active' },
    { id: 'ST002', staff_code: 'EMP002', name: '李明辉', gender: '男', phone: '13800000002', email: 'li@example.com', department_oid: 'D002', department_name: '生产部', position_oid: 'P002', position_name: '生产主管', entry_date: '2020-03-01', status: 'active' },
    { id: 'ST003', staff_code: 'EMP003', name: '王建国', gender: '男', phone: '13800000003', email: 'wang2@example.com', department_oid: 'D002', department_name: '生产部', position_oid: 'P003', position_name: '生产经理', entry_date: '2019-06-01', status: 'active' },
    { id: 'ST004', staff_code: 'EMP004', name: '陈小芳', gender: '女', phone: '13800000004', email: 'chen@example.com', department_oid: 'D002', department_name: '生产部', position_oid: 'P004', position_name: '种植工', entry_date: '2021-02-01', status: 'active' },
    { id: 'ST005', staff_code: 'EMP005', name: '周志强', gender: '男', phone: '13800000005', email: 'zhou@example.com', department_oid: 'D002', department_name: '生产部', position_oid: 'P004', position_name: '种植工', entry_date: '2021-05-01', status: 'active' },
    { id: 'ST006', staff_code: 'EMP006', name: '吴美丽', gender: '女', phone: '13800000006', email: 'wu@example.com', department_oid: 'D002', department_name: '生产部', position_oid: 'P004', position_name: '种植工', entry_date: '2021-08-01', status: 'active' },
    { id: 'ST007', staff_code: 'EMP007', name: '郑胜利', gender: '男', phone: '13800000007', email: 'zheng@example.com', department_oid: 'D002', department_name: '生产部', position_oid: 'P005', position_name: '农机手', entry_date: '2020-11-01', status: 'active' },
    { id: 'ST008', staff_code: 'EMP008', name: '黄敏', gender: '女', phone: '13800000008', email: 'huang@example.com', department_oid: 'D002', department_name: '生产部', position_oid: 'P006', position_name: '生产组长', entry_date: '2019-09-01', status: 'active' },
    { id: 'ST009', staff_code: 'EMP009', name: '陆启闯', gender: '男', phone: '13800000009', email: 'lu@example.com', department_oid: 'D001', department_name: '管理层', position_oid: 'P001', position_name: '管理员', entry_date: '2018-01-01', status: 'active' },
    { id: 'ST010', staff_code: 'EMP010', name: '赵文静', gender: '女', phone: '13800000010', email: 'zhao@example.com', department_oid: 'D003', department_name: '技术部', position_oid: 'P007', position_name: '技术员', entry_date: '2022-01-01', status: 'active' },
  ];

  staffData.forEach(s => {
    try {
      db.run('INSERT OR IGNORE INTO staff (id, staff_code, name, gender, phone, email, department_oid, department_name, position_oid, position_name, entry_date, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [s.id, s.staff_code, s.name, s.gender, s.phone, s.email, s.department_oid, s.department_name, s.position_oid, s.position_name, s.entry_date, s.status, now, now]);
      inserted++;
    } catch (e) {}
  });

  // 2. 基地 (4条)
  const baseData = [
    { id: 'BS001', base_code: 'BASE001', base_name: '总部基地', location: 'A区', base_type: 'glass', area: 50000, status: 'active' },
    { id: 'BS002', base_code: 'BASE002', base_name: '东区基地', location: 'B区', base_type: 'solar', area: 30000, status: 'active' },
    { id: 'BS003', base_code: 'BASE003', base_name: '南区基地', location: 'C区', base_type: 'open', area: 40000, status: 'active' },
    { id: 'BS004', base_code: 'BASE004', base_name: '西区基地', location: 'D区', base_type: 'glass', area: 25000, status: 'inactive' },
  ];
  baseData.forEach(b => {
    try {
      db.run('INSERT OR IGNORE INTO bases (id, base_code, base_name, location, base_type, area, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [b.id, b.base_code, b.base_name, b.location, b.base_type, b.area, b.status, now, now]);
      inserted++;
    } catch (e) {}
  });

  // 3. 物料 (12条)
  const materialData = [
    { id: 'MT001', material_code: 'FERT-001', material_name: '复合肥NPK', category: '化肥', specification: '15-15-15 50kg/袋', unit: '袋', unit_price: 120, stock_quantity: 150, safe_stock: 50, supplier_name: '金正大化肥', warehouse_location: '仓库A区' },
    { id: 'MT002', material_code: 'FERT-002', material_name: '尿素', category: '化肥', specification: '46% 50kg/袋', unit: '袋', unit_price: 85, stock_quantity: 200, safe_stock: 80, supplier_name: '中化化肥', warehouse_location: '仓库A区' },
    { id: 'MT003', material_code: 'FERT-003', material_name: '水溶肥', category: '化肥', specification: '20-20-20 5kg/袋', unit: '袋', unit_price: 150, stock_quantity: 80, safe_stock: 30, supplier_name: '以色列化工', warehouse_location: '仓库B区' },
    { id: 'MT004', material_code: 'PEST-001', material_name: '吡虫啉', category: '农药', specification: '10% 100g/袋', unit: '袋', unit_price: 25, stock_quantity: 300, safe_stock: 100, supplier_name: '拜耳作物', warehouse_location: '农药库' },
    { id: 'MT005', material_code: 'PEST-002', material_name: '多菌灵', category: '农药', specification: '50% 200g/袋', unit: '袋', unit_price: 18, stock_quantity: 250, safe_stock: 80, supplier_name: '先正达', warehouse_location: '农药库' },
    { id: 'MT006', material_code: 'PEST-003', material_name: '阿维菌素', category: '农药', specification: '1.8% 100ml/瓶', unit: '瓶', unit_price: 12, stock_quantity: 180, safe_stock: 60, supplier_name: '巴斯夫', warehouse_location: '农药库' },
    { id: 'MT007', material_code: 'SUB-001', material_name: '椰糠', category: '基质', specification: '50L/袋', unit: '袋', unit_price: 35, stock_quantity: 500, safe_stock: 200, supplier_name: '海南绿洲', warehouse_location: '基质库' },
    { id: 'MT008', material_code: 'SUB-002', material_name: '珍珠岩', category: '基质', specification: '50L/袋', unit: '袋', unit_price: 20, stock_quantity: 300, safe_stock: 100, supplier_name: '建材市场', warehouse_location: '基质库' },
    { id: 'MT009', material_code: 'FILM-001', material_name: 'PO膜', category: '农膜', specification: '0.1mm 2m宽', unit: '平方米', unit_price: 2.5, stock_quantity: 5000, safe_stock: 2000, supplier_name: '山东华熔', warehouse_location: '农膜库' },
    { id: 'MT010', material_code: 'SEED-001', material_name: '番茄种子', category: '种子', specification: '1000粒/袋', unit: '袋', unit_price: 150, stock_quantity: 50, safe_stock: 20, supplier_name: '先正达', warehouse_location: '种子库' },
    { id: 'MT011', material_code: 'SEED-002', material_name: '黄瓜种子', category: '种子', specification: '1000粒/袋', unit: '袋', unit_price: 120, stock_quantity: 60, safe_stock: 25, supplier_name: '圣尼斯', warehouse_location: '种子库' },
    { id: 'MT012', material_code: 'SEED-003', material_name: '草莓苗', category: '种苗', specification: '裸根苗', unit: '株', unit_price: 0.8, stock_quantity: 10000, safe_stock: 3000, supplier_name: '丹东草莓', warehouse_location: '种苗区' },
  ];
  materialData.forEach(m => {
    try {
      db.run('INSERT OR IGNORE INTO materials (id, material_code, material_name, category, specification, unit, unit_price, stock_quantity, safe_stock, supplier_name, warehouse_location, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [m.id, m.material_code, m.material_name, m.category, m.specification, m.unit, m.unit_price, m.stock_quantity, m.safe_stock, m.supplier_name, m.warehouse_location, 'active', now, now]);
      inserted++;
    } catch (e) {}
  });

  // 4. 种植模式 (5条)
  const modeData = [
    { id: 'PM001', mode_code: 'M001', mode_name: '混合基质种植', description: '使用椰糠、珍珠岩混合基质', substrate: '椰糠+珍珠岩', irrigation_method: '滴灌', status: 'active' },
    { id: 'PM002', mode_code: 'M002', mode_name: '土壤种植', description: '传统土壤栽培方式', substrate: '土壤', irrigation_method: '漫灌', status: 'active' },
    { id: 'PM003', mode_code: 'M003', mode_name: '椰糠种植', description: '纯椰糠基质栽培', substrate: '椰糠', irrigation_method: '滴灌', status: 'active' },
    { id: 'PM004', mode_code: 'M004', mode_name: '水培', description: '营养液水培方式', substrate: '营养液', irrigation_method: 'NFT', status: 'active' },
    { id: 'PM005', mode_code: 'M005', mode_name: '岩棉培', description: '岩棉基质栽培', substrate: '岩棉', irrigation_method: '滴灌', status: 'active' },
  ];
  modeData.forEach(m => {
    try {
      db.run('INSERT OR IGNORE INTO planting_modes (id, mode_code, mode_name, description, substrate, irrigation_method, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [m.id, m.mode_code, m.mode_name, m.description, m.substrate, m.irrigation_method, m.status, now, now]);
      inserted++;
    } catch (e) {}
  });

  // 5. 农事活动 (8条)
  for (let i = 1; i <= 8; i++) {
    try {
      db.run('INSERT OR IGNORE INTO farm_activities (id, activity_code, activity_type, activity_name, batch_id, batch_code, crop_name, greenhouse_id, greenhouse_name, executor_id, executor_name, plan_date, duration, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`FA${String(i).padStart(3, '0')}`, `FA2026-${String(i).padStart(3, '0')}`, ['irrigation', 'fertilization', 'spraying', 'pruning', 'harvest', 'scouting', 'weeding', 'seeding'][i-1],
         ['浇水', '施肥', '打药', '整枝', '采收', '巡田', '除草', '播种'][i-1], `B${String(i).padStart(3, '0')}`, `B2026-${String(i).padStart(3, '0')}`,
         ['番茄', '黄瓜', '草莓', '辣椒', '生菜', '菠菜', '茄子', '西瓜'][i-1], `G00${i}`, `温室${i}`, `ST00${i}`, ['陈小芳', '周志强', '吴美丽', '郑胜利', '黄敏', '赵文静', '王建华', '李明辉'][i-1],
         '2026-04-01', 2, 'completed', now, now]);
      inserted++;
    } catch (e) {}
  }

  // 6. 日计划 (7条)
  for (let i = 1; i <= 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i + 1);
    const dstr = date.toISOString().slice(0, 10);
    try {
      db.run('INSERT OR IGNORE INTO daily_plans (id, plan_code, plan_date, department_id, department_name, task_count, completion_rate, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`DP${String(i).padStart(3, '0')}`, `DP${dstr}-${i}`, dstr, 'D002', '生产部', 5 + i, 0.6 + i * 0.05, 'published', now, now]);
      inserted++;
    } catch (e) {}
  }

  // 7. 月计划 (6条)
  for (let i = 1; i <= 6; i++) {
    try {
      db.run('INSERT OR IGNORE INTO monthly_plans (id, plan_code, plan_year, plan_month, department_id, department_name, target_crop, target_area, target_yield, planned_cost, completion_rate, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`MP${String(i).padStart(3, '0')}`, `MP2026-${String(i).padStart(2, '0')}`, 2026, i, 'D002', '生产部',
         ['番茄', '黄瓜', '草莓', '辣椒', '生菜', '菠菜'][i-1], 1000 + i * 100, 5000 + i * 500, 10000 + i * 1000, 0.5 + i * 0.08, 'approved', now, now]);
      inserted++;
    } catch (e) {}
  }

  // 8. 管理指标 (6条)
  const indicatorData = [
    { id: 'IND001', indicator_code: 'KPI001', indicator_name: '单位面积产量', category: '产量', unit: 'kg/m²', target_value: 5.0, actual_value: 4.2, warning_threshold: 4.0, critical_threshold: 3.0, frequency: 'monthly' },
    { id: 'IND002', indicator_code: 'KPI002', indicator_name: '肥料利用率', category: '效率', unit: '%', target_value: 80, actual_value: 72, warning_threshold: 70, critical_threshold: 60, frequency: 'monthly' },
    { id: 'IND003', indicator_code: 'KPI003', indicator_name: '病虫害发生率', category: '质量', unit: '%', target_value: 5, actual_value: 3.5, warning_threshold: 10, critical_threshold: 20, frequency: 'weekly' },
    { id: 'IND004', indicator_code: 'KPI004', indicator_name: '人工成本占比', category: '成本', unit: '%', target_value: 30, actual_value: 32, warning_threshold: 35, critical_threshold: 40, frequency: 'monthly' },
    { id: 'IND005', indicator_code: 'KPI005', indicator_name: '设备完好率', category: '设备', unit: '%', target_value: 95, actual_value: 92, warning_threshold: 90, critical_threshold: 85, frequency: 'weekly' },
    { id: 'IND006', indicator_code: 'KPI006', indicator_name: '计划完成率', category: '计划', unit: '%', target_value: 95, actual_value: 88, warning_threshold: 85, critical_threshold: 75, frequency: 'daily' },
  ];
  indicatorData.forEach(ind => {
    try {
      db.run('INSERT OR IGNORE INTO indicators (id, indicator_code, indicator_name, category, unit, target_value, actual_value, warning_threshold, critical_threshold, frequency, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [ind.id, ind.indicator_code, ind.indicator_name, ind.category, ind.unit, ind.target_value, ind.actual_value, ind.warning_threshold, ind.critical_threshold, ind.frequency, 'active', now, now]);
      inserted++;
    } catch (e) {}
  });

  // 9. 生产记录 (8条)
  for (let i = 1; i <= 8; i++) {
    try {
      db.run('INSERT OR IGNORE INTO production_records (id, record_code, batch_id, batch_code, crop_name, variety, greenhouse_id, greenhouse_name, record_date, record_type, quantity, unit, quality_grade, worker_id, worker_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`PR${String(i).padStart(3, '0')}`, `PR2026-${String(i).padStart(3, '0')}`, `B${String(i).padStart(3, '0')}`, `B2026-${String(i).padStart(3, '0')}`,
         ['番茄', '黄瓜', '草莓', '辣椒', '生菜', '菠菜', '茄子', '西瓜'][i-1],
         ['红果番茄', '水果黄瓜', '红颜', '青椒', '散叶生菜', '圆叶菠菜', '紫茄', '小型西瓜'][i-1],
         `G00${i}`, `温室${i}`, '2026-04-01', 'harvest', 100 + i * 20, 'kg',
         ['A', 'A', 'B', 'A', 'A', 'B', 'A', 'B'][i-1], `ST00${(i % 5) + 4}`,
         ['陈小芳', '周志强', '吴美丽', '郑胜利', '黄敏'][i % 5], 'active', now, now]);
      inserted++;
    } catch (e) {}
  }

  // 10. 设备管理 (6条)
  const deviceData = [
    { id: 'DEV001', device_code: 'EQ001', device_name: '1号灌溉水泵', device_type: '灌溉设备', model: 'WQ15-15-1.5', manufacturer: '南方泵业', purchase_date: '2022-03-01', warranty_expire: '2025-03-01', location: 'A区泵房', next_maintenance: '2026-06-01' },
    { id: 'DEV002', device_code: 'EQ002', device_name: '2号灌溉水泵', device_type: '灌溉设备', model: 'WQ20-20-2.2', manufacturer: '南方泵业', purchase_date: '2022-03-01', warranty_expire: '2025-03-01', location: 'B区泵房', next_maintenance: '2026-06-15' },
    { id: 'DEV003', device_code: 'EQ003', device_name: '温室A区风机', device_type: '通风设备', model: 'SF-1380', manufacturer: '大牧人', purchase_date: '2023-01-01', warranty_expire: '2026-01-01', location: '玻璃温室A区', next_maintenance: '2026-05-01' },
    { id: 'DEV004', device_code: 'EQ004', device_name: '温室B区风机', device_type: '通风设备', model: 'SF-1380', manufacturer: '大牧人', purchase_date: '2023-01-01', warranty_expire: '2026-01-01', location: '玻璃温室B区', next_maintenance: '2026-05-01' },
    { id: 'DEV005', device_code: 'EQ005', device_name: '施肥机1号', device_type: '施肥设备', model: 'FERT-2000', manufacturer: '耐特菲姆', purchase_date: '2023-06-01', warranty_expire: '2026-06-01', location: '中央控制室', next_maintenance: '2026-07-01' },
    { id: 'DEV006', device_code: 'EQ006', device_name: '环境监测主机', device_type: '监测设备', model: 'ENV-Master', manufacturer: '海睿科技', purchase_date: '2024-01-01', warranty_expire: '2027-01-01', location: '数据中心', next_maintenance: '2026-08-01' },
  ];
  deviceData.forEach(d => {
    try {
      db.run('INSERT OR IGNORE INTO device_management (id, device_code, device_name, device_type, model, manufacturer, purchase_date, warranty_expire, location, status, next_maintenance, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [d.id, d.device_code, d.device_name, d.device_type, d.model, d.manufacturer, d.purchase_date, d.warranty_expire, d.location, 'active', d.next_maintenance, now, now]);
      inserted++;
    } catch (e) {}
  });

  // 11. 成本核算 (6条)
  for (let i = 1; i <= 6; i++) {
    try {
      db.run('INSERT OR IGNORE INTO cost_accounting (id, accounting_code, batch_id, batch_code, crop_name, cost_type, cost_category, amount, unit, record_date, department_id, department_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`CA${String(i).padStart(3, '0')}`, `CA2026-${String(i).padStart(3, '0')}`, `B${String(i).padStart(3, '0')}`, `B2026-${String(i).padStart(3, '0')}`,
         ['番茄', '黄瓜', '草莓', '辣椒', '生菜', '菠菜'][i-1],
         ['material', 'labor', 'equipment', 'energy', 'transport', 'other'][i-1],
         ['物料成本', '人工成本', '设备折旧', '能源成本', '运输成本', '其他费用'][i-1],
         5000 + i * 1000, '元', '2026-04-01', 'D002', '生产部', 'active', now, now]);
      inserted++;
    } catch (e) {}
  }

  // 12. 考勤记录 (8条)
  for (let i = 1; i <= 8; i++) {
    const d = new Date(); d.setDate(d.getDate() - i + 1);
    try {
      db.run('INSERT OR IGNORE INTO attendance_records (id, record_code, staff_id, staff_name, department_id, department_name, attendance_date, check_in_time, check_out_time, work_hours, overtime_hours, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [`AT${String(i).padStart(3, '0')}`, `AT${d.toISOString().slice(0,10).replace(/-/g,'')}-${i}`, `ST00${i}`,
         ['王建华', '李明辉', '王建国', '陈小芳', '周志强', '吴美丽', '郑胜利', '黄敏'][i-1],
         'D002', '生产部', d.toISOString().slice(0,10), '08:00:00', '17:00:00', 8, i % 3, 'normal', now, now]);
      inserted++;
    } catch (e) {}
  }

  // 13. 请假记录 (4条)
  const leaveData = [
    { id: 'LV001', leave_code: 'LV20260401-001', staff_id: 'ST004', staff_name: '陈小芳', leave_type: 'annual', start_date: '2026-04-05', end_date: '2026-04-07', leave_days: 3, reason: '年假休息', status: 'approved' },
    { id: 'LV002', leave_code: 'LV20260401-002', staff_id: 'ST005', staff_name: '周志强', leave_type: 'sick', start_date: '2026-04-10', end_date: '2026-04-11', leave_days: 2, reason: '身体不适', status: 'pending' },
    { id: 'LV003', leave_code: 'LV20260401-003', staff_id: 'ST006', staff_name: '吴美丽', leave_type: 'personal', start_date: '2026-04-15', end_date: '2026-04-15', leave_days: 1, reason: '家中有事', status: 'approved' },
    { id: 'LV004', leave_code: 'LV20260401-004', staff_id: 'ST007', staff_name: '郑胜利', leave_type: 'annual', start_date: '2026-04-20', end_date: '2026-04-22', leave_days: 3, reason: '年假休息', status: 'pending' },
  ];
  leaveData.forEach(l => {
    try {
      db.run('INSERT OR IGNORE INTO leave_records (id, leave_code, staff_id, staff_name, department_id, department_name, leave_type, start_date, end_date, leave_days, reason, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [l.id, l.leave_code, l.staff_id, l.staff_name, 'D002', '生产部', l.leave_type, l.start_date, l.end_date, l.leave_days, l.reason, l.status, now, now]);
      inserted++;
    } catch (e) {}
  });

  // 14. 加班记录 (4条)
  const otData = [
    { id: 'OT001', overtime_code: 'OT20260401-001', staff_id: 'ST004', staff_name: '陈小芳', overtime_date: '2026-04-02', start_time: '18:00', end_time: '20:00', overtime_hours: 2, reason: '紧急采收', status: 'approved' },
    { id: 'OT002', overtime_code: 'OT20260401-002', staff_id: 'ST005', staff_name: '周志强', overtime_date: '2026-04-03', start_time: '18:00', end_time: '21:00', overtime_hours: 3, reason: '设备维修', status: 'approved' },
    { id: 'OT003', overtime_code: 'OT20260401-003', staff_id: 'ST006', staff_name: '吴美丽', overtime_date: '2026-04-08', start_time: '18:00', end_time: '19:00', overtime_hours: 1, reason: '订单赶工', status: 'pending' },
    { id: 'OT004', overtime_code: 'OT20260401-004', staff_id: 'ST007', staff_name: '郑胜利', overtime_date: '2026-04-12', start_time: '18:00', end_time: '22:00', overtime_hours: 4, reason: '大型灌溉', status: 'pending' },
  ];
  otData.forEach(o => {
    try {
      db.run('INSERT OR IGNORE INTO overtime_records (id, overtime_code, staff_id, staff_name, department_id, department_name, overtime_date, start_time, end_time, overtime_hours, reason, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [o.id, o.overtime_code, o.staff_id, o.staff_name, 'D002', '生产部', o.overtime_date, o.start_time, o.end_time, o.overtime_hours, o.reason, o.status, now, now]);
      inserted++;
    } catch (e) {}
  });

  // 15. 招聘记录 (3条)
  const recruitData = [
    { id: 'RC001', recruitment_code: 'RC2026-001', position_name: '高级种植技术员', department_id: 'D002', department_name: '生产部', required_count: 2, salary_range: '8k-12k', status: 'open' },
    { id: 'RC002', recruitment_code: 'RC2026-002', position_name: '设备维护工程师', department_id: 'D003', department_name: '技术部', required_count: 1, salary_range: '10k-15k', status: 'open' },
    { id: 'RC003', recruitment_code: 'RC2026-003', position_name: '仓库管理员', department_id: 'D004', department_name: '仓储部', required_count: 1, salary_range: '5k-7k', status: 'closed' },
  ];
  recruitData.forEach(r => {
    try {
      db.run('INSERT OR IGNORE INTO recruitment_records (id, recruitment_code, position_name, department_id, department_name, required_count, applied_count, hired_count, salary_range, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.recruitment_code, r.position_name, r.department_id, r.department_name, r.required_count, 0, 0, r.salary_range, r.status, now, now]);
      inserted++;
    } catch (e) {}
  });

  // 16. 合同 (4条)
  const contractData = [
    { id: 'CT001', contract_code: 'CT2026-001', contract_type: 'labor', party_a: '原形图农业', party_b: '王建华', staff_id: 'ST001', staff_name: '王建华', sign_date: '2020-01-01', start_date: '2020-01-01', end_date: '2025-12-31', contract_value: 0 },
    { id: 'CT002', contract_code: 'CT2026-002', contract_type: 'labor', party_a: '原形图农业', party_b: '李明辉', staff_id: 'ST002', staff_name: '李明辉', sign_date: '2020-03-01', start_date: '2020-03-01', end_date: '2025-12-31', contract_value: 0 },
    { id: 'CT003', contract_code: 'CT2026-003', contract_type: 'purchase', party_a: '原形图农业', party_b: '金正大化肥', sign_date: '2026-01-01', start_date: '2026-01-01', end_date: '2026-12-31', contract_value: 50000 },
    { id: 'CT004', contract_code: 'CT2026-004', contract_type: 'lease', party_a: '原形图农业', party_b: '某农机租赁公司', sign_date: '2026-01-01', start_date: '2026-01-01', end_date: '2026-12-31', contract_value: 12000 },
  ];
  contractData.forEach(c => {
    try {
      db.run('INSERT OR IGNORE INTO contracts (id, contract_code, contract_type, party_a, party_b, staff_id, staff_name, sign_date, start_date, end_date, contract_value, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [c.id, c.contract_code, c.contract_type, c.party_a, c.party_b, c.staff_id, c.staff_name, c.sign_date, c.start_date, c.end_date, c.contract_value, 'active', now, now]);
      inserted++;
    } catch (e) {}
  });

  // 17. 入职 (3条)
  const onboardData = [
    { id: 'OB001', onboarding_code: 'OB2026-001', staff_id: 'ST010', staff_name: '赵文静', department_id: 'D003', department_name: '技术部', position_id: 'P007', position_name: '技术员', onboarding_date: '2022-01-01', mentor_id: 'ST001', mentor_name: '王建华', progress: 100, status: 'completed' },
    { id: 'OB002', onboarding_code: 'OB2026-002', staff_id: 'ST004', staff_name: '陈小芳', department_id: 'D002', department_name: '生产部', position_id: 'P004', position_name: '种植工', onboarding_date: '2021-02-01', mentor_id: 'ST003', mentor_name: '王建国', progress: 100, status: 'completed' },
    { id: 'OB003', onboarding_code: 'OB2026-003', staff_id: 'ST005', staff_name: '周志强', department_id: 'D002', department_name: '生产部', position_id: 'P004', position_name: '种植工', onboarding_date: '2021-05-01', mentor_id: 'ST003', mentor_name: '王建国', progress: 100, status: 'completed' },
  ];
  onboardData.forEach(o => {
    try {
      db.run('INSERT OR IGNORE INTO onboardings (id, onboarding_code, staff_id, staff_name, department_id, department_name, position_id, position_name, onboarding_date, mentor_id, mentor_name, progress, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [o.id, o.onboarding_code, o.staff_id, o.staff_name, o.department_id, o.department_name, o.position_id, o.position_name, o.onboarding_date, o.mentor_id, o.mentor_name, o.progress, o.status, now, now]);
      inserted++;
    } catch (e) {}
  });

  // 18. 离职 (2条)
  const resignData = [
    { id: 'RS001', resignation_code: 'RS2026-001', staff_id: 'ST008', staff_name: '黄敏', department_id: 'D002', department_name: '生产部', position_name: '生产组长', apply_date: '2026-03-01', last_work_date: '2026-03-31', resignation_type: 'voluntary', reason: '个人发展', handover_status: 'completed', status: 'approved' },
    { id: 'RS002', resignation_code: 'RS2026-002', staff_id: 'ST009', staff_name: '陆启闯', department_id: 'D001', department_name: '管理层', position_name: '管理员', apply_date: '2026-02-15', last_work_date: '2026-04-15', resignation_type: 'voluntary', reason: '家庭原因', handover_status: 'pending', status: 'pending' },
  ];
  resignData.forEach(r => {
    try {
      db.run('INSERT OR IGNORE INTO resignations (id, resignation_code, staff_id, staff_name, department_id, department_name, position_name, apply_date, last_work_date, resignation_type, reason, handover_status, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [r.id, r.resignation_code, r.staff_id, r.staff_name, r.department_id, r.department_name, r.position_name, r.apply_date, r.last_work_date, r.resignation_type, r.reason, r.handover_status, r.status, now, now]);
      inserted++;
    } catch (e) {}
  });

  saveDatabase();
  seeded = true;
  console.log(`[Seed] 种子数据导入完成，共插入 ${inserted} 条记录`);
}

export default seedFromMockData;
