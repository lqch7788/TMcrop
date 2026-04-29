/**
 * 种子数据导入
 * 从数据导入 SQLite
 */

import { getDatabase, saveDatabase } from './index';
import path from 'path';
import fs from 'fs';

/**
 * 导入作物品种数据
 */
function seedCropVarieties() {
  const db = getDatabase();

  const cropVarieties = [
    {
      id: 'CV001',
      crop_code: '030101001',
      category_code: '03',
      category_name: '蔬菜类',
      type_code: '01',
      type_name: '叶菜类',
      variety_code: '01',
      variety_name: '生菜',
      sub_variety1_code: '001',
      sub_variety1_name: '红生菜',
      detail_variety_code: '01',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV002',
      crop_code: '030101002',
      category_code: '03',
      category_name: '蔬菜类',
      type_code: '01',
      type_name: '叶菜类',
      variety_code: '02',
      variety_name: '菠菜',
      sub_variety1_code: '001',
      sub_variety1_name: '大叶菠菜',
      detail_variety_code: '01',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV003',
      crop_code: '030102001',
      category_code: '03',
      category_name: '蔬菜类',
      type_code: '02',
      type_name: '茄果类',
      variety_code: '01',
      variety_name: '番茄',
      sub_variety1_code: '001',
      sub_variety1_name: '大番茄',
      detail_variety_code: '01',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV004',
      crop_code: '030102002',
      category_code: '03',
      category_name: '蔬菜类',
      type_code: '02',
      type_name: '茄果类',
      variety_code: '02',
      variety_name: '辣椒',
      sub_variety1_code: '001',
      sub_variety1_name: '青椒',
      detail_variety_code: '01',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV005',
      crop_code: '010101001',
      category_code: '01',
      category_name: '水果类',
      type_code: '01',
      type_name: '浆果类',
      variety_code: '01',
      variety_name: '草莓',
      sub_variety1_code: '001',
      sub_variety1_name: '红颜',
      detail_variety_code: '01',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const v of cropVarieties) {
    db.run(`
      INSERT OR REPLACE INTO crop_varieties
      (id, crop_code, category_code, category_name, type_code, type_name,
       variety_code, variety_name, sub_variety1_code, sub_variety1_name,
       detail_variety_code, status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      v.id, v.crop_code, v.category_code, v.category_name, v.type_code, v.type_name,
      v.variety_code, v.variety_name, v.sub_variety1_code, v.sub_variety1_name,
      v.detail_variety_code, v.status, v.create_time, v.update_time
    ]);
  }

  console.log(`已导入 ${cropVarieties.length} 条作物品种数据`);
}

/**
 * 导入库存数据
 */
function seedInventory() {
  const db = getDatabase();

  const inventoryData = [
    {
      id: 'INV001',
      product_code: '030101001260429001',
      crop_name: '红生菜',
      variety: '红生菜',
      quantity: 100,
      unit: 'kg',
      grade: 'A',
      warehouse_name: '宁波仓库',
      storage_location: 'A区-01',
      harvest_date: '2026-04-20',
      storage_date: '2026-04-21',
      batch_code: 'SC2026042001',
      greenhouse_name: '1号大棚',
      planting_mode: '设施栽培',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'INV002',
      product_code: '030102001260428001',
      crop_name: '大番茄',
      variety: '大番茄',
      quantity: 250,
      unit: 'kg',
      grade: 'A',
      warehouse_name: '宁波仓库',
      storage_location: 'B区-02',
      harvest_date: '2026-04-18',
      storage_date: '2026-04-19',
      batch_code: 'SC2026041801',
      greenhouse_name: '2号大棚',
      planting_mode: '设施栽培',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'INV003',
      product_code: '010101001260425001',
      crop_name: '草莓',
      variety: '红颜',
      quantity: 50,
      unit: 'kg',
      grade: 'A',
      warehouse_name: '宁波仓库',
      storage_location: 'C区-01',
      harvest_date: '2026-04-15',
      storage_date: '2026-04-16',
      batch_code: 'SC2026041501',
      greenhouse_name: '3号大棚',
      planting_mode: '设施栽培',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const inv of inventoryData) {
    db.run(`
      INSERT OR REPLACE INTO inventory
      (id, product_code, crop_name, variety, quantity, unit, grade,
       warehouse_name, storage_location, harvest_date, storage_date,
       batch_code, greenhouse_name, planting_mode, status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      inv.id, inv.product_code, inv.crop_name, inv.variety, inv.quantity, inv.unit, inv.grade,
      inv.warehouse_name, inv.storage_location, inv.harvest_date, inv.storage_date,
      inv.batch_code, inv.greenhouse_name, inv.planting_mode, inv.status, inv.create_time, inv.update_time
    ]);
  }

  console.log(`已导入 ${inventoryData.length} 条库存数据`);
}

/**
 * 导入供应商数据
 */
function seedSuppliers() {
  const db = getDatabase();

  const suppliers = [
    {
      id: 'SUP001',
      supplier_code: 'GYS001',
      supplier_name: '杭州农资公司',
      contact_person: '张经理',
      contact_phone: '13800138001',
      address: '浙江省杭州市西湖区',
      supplier_type: '种子',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'SUP002',
      supplier_code: 'GYS002',
      supplier_name: '上海肥料批发',
      contact_person: '李经理',
      contact_phone: '13800138002',
      address: '上海市浦东新区',
      supplier_type: '肥料',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'SUP003',
      supplier_code: 'GYS003',
      supplier_name: '宁波农膜厂',
      contact_person: '王经理',
      contact_phone: '13800138003',
      address: '浙江省宁波市鄞州区',
      supplier_type: '农资',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const sup of suppliers) {
    db.run(`
      INSERT OR REPLACE INTO suppliers
      (id, supplier_code, supplier_name, contact_person, contact_phone,
       address, supplier_type, status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sup.id, sup.supplier_code, sup.supplier_name, sup.contact_person, sup.contact_phone,
      sup.address, sup.supplier_type, sup.status, sup.create_time, sup.update_time
    ]);
  }

  console.log(`已导入 ${suppliers.length} 条供应商数据`);
}

/**
 * 导入种源数据
 */
function seedSeedSources() {
  const db = getDatabase();

  const seedSources = [
    {
      id: 'SS001',
      source_code: 'ZY202604001',
      source_name: '红生菜种子',
      source_type: '种子',
      crop_name: '红生菜',
      crop_variety: '红生菜',
      supplier_id: 'SUP001',
      supplier_name: '杭州农资公司',
      quantity: 1000,
      unit: '粒',
      purchase_date: '2026-04-01',
      purchase_price: 0.5,
      total_amount: 500,
      used_quantity: 200,
      remaining_quantity: 800,
      status: 'active',
      create_by: '系统',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'SS002',
      source_code: 'ZY202604002',
      source_name: '大番茄种子',
      source_type: '种子',
      crop_name: '大番茄',
      crop_variety: '大番茄',
      supplier_id: 'SUP001',
      supplier_name: '杭州农资公司',
      quantity: 500,
      unit: '粒',
      purchase_date: '2026-04-05',
      purchase_price: 0.8,
      total_amount: 400,
      used_quantity: 100,
      remaining_quantity: 400,
      status: 'active',
      create_by: '系统',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const ss of seedSources) {
    db.run(`
      INSERT OR REPLACE INTO seed_sources
      (id, source_code, source_name, source_type, crop_name, crop_variety,
       supplier_id, supplier_name, quantity, unit, purchase_date, purchase_price,
       total_amount, used_quantity, remaining_quantity, status, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ss.id, ss.source_code, ss.source_name, ss.source_type, ss.crop_name, ss.crop_variety,
      ss.supplier_id, ss.supplier_name, ss.quantity, ss.unit, ss.purchase_date, ss.purchase_price,
      ss.total_amount, ss.used_quantity, ss.remaining_quantity, ss.status, ss.create_by, ss.create_time, ss.update_time
    ]);
  }

  console.log(`已导入 ${seedSources.length} 条种源数据`);
}

/**
 * 导入育苗数据
 */
function seedSeedlings() {
  const db = getDatabase();

  const seedlings = [
    {
      id: 'SD001',
      seedling_code: 'YM202604001',
      source_id: 'SS001',
      source_name: '红生菜种子',
      crop_name: '红生菜',
      crop_variety: '红生菜',
      seedling_type: '穴盘育苗',
      greenhouse_name: '育苗大棚',
      area_name: '1号区',
      seedling_date: '2026-04-10',
      expected_finish_date: '2026-04-25',
      seedling_quantity: 500,
      survival_quantity: 450,
      survival_rate: 90,
      status: 'in_progress',
      seedling_status: '生长中',
      create_by: '系统',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'SD002',
      seedling_code: 'YM202604002',
      source_id: 'SS002',
      source_name: '大番茄种子',
      crop_name: '大番茄',
      crop_variety: '大番茄',
      seedling_type: '穴盘育苗',
      greenhouse_name: '育苗大棚',
      area_name: '2号区',
      seedling_date: '2026-04-08',
      expected_finish_date: '2026-04-23',
      seedling_quantity: 300,
      survival_quantity: 280,
      survival_rate: 93,
      status: 'completed',
      seedling_status: '待定植',
      create_by: '系统',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const sd of seedlings) {
    db.run(`
      INSERT OR REPLACE INTO seedlings
      (id, seedling_code, source_id, source_name, crop_name, crop_variety,
       seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
       seedling_quantity, survival_quantity, survival_rate, status, seedling_status, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sd.id, sd.seedling_code, sd.source_id, sd.source_name, sd.crop_name, sd.crop_variety,
      sd.seedling_type, sd.greenhouse_name, sd.area_name, sd.seedling_date, sd.expected_finish_date,
      sd.seedling_quantity, sd.survival_quantity, sd.survival_rate, sd.status, sd.seedling_status, sd.create_by, sd.create_time, sd.update_time
    ]);
  }

  console.log(`已导入 ${seedlings.length} 条育苗数据`);
}

/**
 * 导入种植数据
 */
function seedPlantings() {
  const db = getDatabase();

  const plantings = [
    {
      id: 'PL001',
      planting_code: 'ZZ202604001',
      source_type: '育苗',
      source_id: 'SD001',
      source_name: 'YM202604001',
      crop_name: '红生菜',
      crop_variety: '红生菜',
      greenhouse_name: '1号大棚',
      area_name: '01区',
      planting_date: '2026-04-26',
      planting_quantity: 400,
      planted_quantity: 380,
      survival_quantity: 370,
      survival_rate: 92.5,
      growth_status: '幼苗期',
      expected_harvest_date: '2026-05-20',
      status: 'growing',
      create_by: '系统',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'PL002',
      planting_code: 'ZZ202604002',
      source_type: '育苗',
      source_id: 'SD002',
      source_name: 'YM202604002',
      crop_name: '大番茄',
      crop_variety: '大番茄',
      greenhouse_name: '2号大棚',
      area_name: '01区',
      planting_date: '2026-04-24',
      planting_quantity: 250,
      planted_quantity: 245,
      survival_quantity: 240,
      survival_rate: 96,
      growth_status: '开花期',
      expected_harvest_date: '2026-06-15',
      status: 'growing',
      create_by: '系统',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const pl of plantings) {
    db.run(`
      INSERT OR REPLACE INTO plantings
      (id, planting_code, source_type, source_id, source_name, crop_name, crop_variety,
       greenhouse_name, area_name, planting_date, planting_quantity, planted_quantity,
       survival_quantity, survival_rate, growth_status, expected_harvest_date, status, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pl.id, pl.planting_code, pl.source_type, pl.source_id, pl.source_name, pl.crop_name, pl.crop_variety,
      pl.greenhouse_name, pl.area_name, pl.planting_date, pl.planting_quantity, pl.planted_quantity,
      pl.survival_quantity, pl.survival_rate, pl.growth_status, pl.expected_harvest_date, pl.status, pl.create_by, pl.create_time, pl.update_time
    ]);
  }

  console.log(`已导入 ${plantings.length} 条种植数据`);
}

/**
 * 导入采收记录
 */
function seedHarvestRecords() {
  const db = getDatabase();

  const harvests = [
    {
      id: 'HV001',
      harvest_code: 'CS202604001',
      source_id: 'PL001',
      source_name: 'ZZ202604001',
      crop_name: '红生菜',
      crop_variety: '红生菜',
      greenhouse_name: '1号大棚',
      harvest_date: '2026-04-28',
      harvest_quantity: 50,
      unit: 'kg',
      unit_price: 8,
      total_amount: 400,
      quality_grade: 'A',
      buyer_id: 'PUR001',
      buyer_name: '张三',
      sales_channel: '批发',
      status: 'completed',
      create_by: '系统',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const hv of harvests) {
    db.run(`
      INSERT OR REPLACE INTO harvest_records
      (id, harvest_code, source_id, source_name, crop_name, crop_variety, greenhouse_name,
       harvest_date, harvest_quantity, unit, unit_price, total_amount, quality_grade,
       buyer_id, buyer_name, sales_channel, status, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      hv.id, hv.harvest_code, hv.source_id, hv.source_name, hv.crop_name, hv.crop_variety, hv.greenhouse_name,
      hv.harvest_date, hv.harvest_quantity, hv.unit, hv.unit_price, hv.total_amount, hv.quality_grade,
      hv.buyer_id, hv.buyer_name, hv.sales_channel, hv.status, hv.create_by, hv.create_time, hv.update_time
    ]);
  }

  console.log(`已导入 ${harvests.length} 条采收记录`);
}

/**
 * 导入农事任务
 */
function seedFarmTasks() {
  const db = getDatabase();

  const tasks = [
    {
      id: 'TK001',
      task_code: 'NS202604001',
      task_title: '红生菜浇水',
      task_type: '浇水',
      task_content: '1号大棚红生菜区域浇水',
      assignee_id: 'USR001',
      assignee_name: '张三',
      greenhouse_id: 'GH001',
      greenhouse_name: '1号大棚',
      area_name: '01区',
      plan_date: '2026-04-29',
      plan_time: '08:00',
      priority: 'medium',
      status: 'pending',
      create_by: '管理员',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'TK002',
      task_code: 'NS202604002',
      task_title: '番茄施肥',
      task_type: '施肥',
      task_content: '2号大棚番茄区域施肥',
      assignee_id: 'USR002',
      assignee_name: '李四',
      greenhouse_id: 'GH002',
      greenhouse_name: '2号大棚',
      area_name: '01区',
      plan_date: '2026-04-29',
      plan_time: '09:00',
      priority: 'high',
      status: 'pending',
      create_by: '管理员',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const tk of tasks) {
    db.run(`
      INSERT OR REPLACE INTO farm_tasks
      (id, task_code, task_title, task_type, task_content, assignee_id, assignee_name,
       greenhouse_id, greenhouse_name, area_name, plan_date, plan_time, priority, status, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      tk.id, tk.task_code, tk.task_title, tk.task_type, tk.task_content, tk.assignee_id, tk.assignee_name,
      tk.greenhouse_id, tk.greenhouse_name, tk.area_name, tk.plan_date, tk.plan_time, tk.priority, tk.status, tk.create_by, tk.create_time, tk.update_time
    ]);
  }

  console.log(`已导入 ${tasks.length} 条农事任务`);
}

/**
 * 导入人工记录
 */
function seedLaborRecords() {
  const db = getDatabase();

  const records = [
    {
      id: 'LB001',
      worker_id: 'USR001',
      worker_name: '张三',
      work_type: '浇水',
      work_date: '2026-04-28',
      work_hours: 2,
      hourly_rate: 50,
      total_amount: 100,
      greenhouse_id: 'GH001',
      greenhouse_name: '1号大棚',
      task_description: '1号大棚红生菜区域浇水作业',
      status: 'completed',
      remarks: '完成良好',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'LB002',
      worker_id: 'USR002',
      worker_name: '李四',
      work_type: '施肥',
      work_date: '2026-04-28',
      work_hours: 3,
      hourly_rate: 50,
      total_amount: 150,
      greenhouse_id: 'GH002',
      greenhouse_name: '2号大棚',
      task_description: '2号大棚番茄区域施肥作业',
      status: 'completed',
      remarks: '完成良好',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'LB003',
      worker_id: 'USR001',
      worker_name: '张三',
      work_type: '除草',
      work_date: '2026-04-29',
      work_hours: 1.5,
      hourly_rate: 50,
      total_amount: 75,
      greenhouse_id: 'GH001',
      greenhouse_name: '1号大棚',
      task_description: '1号大棚红生菜区域除草作业',
      status: 'pending',
      remarks: '',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const record of records) {
    db.run(`
      INSERT OR REPLACE INTO labor_records
      (id, worker_id, worker_name, work_type, work_date, work_hours, hourly_rate,
       total_amount, greenhouse_id, greenhouse_name, task_description, status, remarks, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      record.id, record.worker_id, record.worker_name, record.work_type, record.work_date,
      record.work_hours, record.hourly_rate, record.total_amount, record.greenhouse_id,
      record.greenhouse_name, record.task_description, record.status, record.remarks,
      record.create_time, record.update_time
    ]);
  }

  console.log(`已导入 ${records.length} 条人工记录`);
}

/**
 * 导入巡查记录
 */
function seedInspections() {
  const db = getDatabase();

  const inspections = [
    {
      id: 'INS001',
      record_code: 'XC202604001',
      inspection_type: '日常巡查',
      inspector_id: 'USR001',
      inspector_name: '张三',
      greenhouse_name: '1号大棚',
      check_date: '2026-04-28',
      check_time: '10:00',
      check_result: '正常',
      issue_severity: 'none',
      issue_text: '未发现问题',
      images: null,
      status: 'completed',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'INS002',
      record_code: 'XC202604002',
      inspection_type: '日常巡查',
      inspector_id: 'USR002',
      inspector_name: '李四',
      greenhouse_name: '2号大棚',
      check_date: '2026-04-28',
      check_time: '14:00',
      check_result: '发现问题',
      issue_severity: 'medium',
      issue_text: '发现少量蚜虫，需要进行防治',
      images: null,
      status: 'pending',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'INS003',
      record_code: 'XC202604003',
      inspection_type: '定期巡查',
      inspector_id: 'USR001',
      inspector_name: '张三',
      greenhouse_name: '1号大棚',
      check_date: '2026-04-29',
      check_time: '09:00',
      check_result: '正常',
      issue_severity: 'none',
      issue_text: '生长状况良好',
      images: null,
      status: 'completed',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const ins of inspections) {
    db.run(`
      INSERT OR REPLACE INTO inspections
      (id, record_code, inspection_type, inspector_id, inspector_name, greenhouse_name,
       check_date, check_time, check_result, issue_severity, issue_text, images, status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ins.id, ins.record_code, ins.inspection_type, ins.inspector_id, ins.inspector_name,
      ins.greenhouse_name, ins.check_date, ins.check_time, ins.check_result, ins.issue_severity,
      ins.issue_text, ins.images, ins.status, ins.create_time, ins.update_time
    ]);
  }

  console.log(`已导入 ${inspections.length} 条巡查记录`);
}

/**
 * 导入问题记录
 */
function seedProblems() {
  const db = getDatabase();

  const problems = [
    {
      id: 'PRB001',
      problem_code: 'WT202604001',
      problem_type: '病虫害',
      title: '番茄叶片发现蚜虫',
      description: '2号大棚番茄区域发现少量蚜虫，需要进行防治处理',
      greenhouse_name: '2号大棚',
      reporter_id: 'USR002',
      reporter_name: '李四',
      assignee_id: 'USR001',
      assignee_name: '张三',
      priority: 'medium',
      status: 'in_progress',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'PRB002',
      problem_code: 'WT202604002',
      problem_type: '环境问题',
      title: '1号大棚温度过高',
      description: '1号大棚中午温度达到38度，需要通风降温',
      greenhouse_name: '1号大棚',
      reporter_id: 'USR001',
      reporter_name: '张三',
      assignee_id: 'USR002',
      assignee_name: '李四',
      priority: 'high',
      status: 'pending',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const prb of problems) {
    db.run(`
      INSERT OR REPLACE INTO problems
      (id, problem_code, problem_type, title, description, greenhouse_name,
       reporter_id, reporter_name, assignee_id, assignee_name, priority, status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      prb.id, prb.problem_code, prb.problem_type, prb.title, prb.description,
      prb.greenhouse_name, prb.reporter_id, prb.reporter_name, prb.assignee_id,
      prb.assignee_name, prb.priority, prb.status, prb.create_time, prb.update_time
    ]);
  }

  console.log(`已导入 ${problems.length} 条问题记录`);
}

/**
 * 导入作物实例
 */
function seedCropInstances() {
  const db = getDatabase();

  const instances = [
    {
      id: 'CI001',
      instance_code: 'YJ202604001',
      order_id: null,
      order_code: null,
      crop_category: '蔬菜类',
      crop_name: '红生菜',
      crop_variety: '红生菜',
      category_code: '03',
      type_code: '01',
      sub_code: '001',
      source_origin: '自育',
      source_description: '本地育苗',
      initial_quantity: 500,
      current_quantity: 450,
      planted_quantity: 380,
      harvested_quantity: 0,
      status: 'growing',
      seed_entry_date: '2026-04-01',
      seedling_start_date: '2026-04-10',
      planting_date: '2026-04-26',
      harvest_date: null,
      source_instance_id: null,
      create_by: '系统',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CI002',
      instance_code: 'YJ202604002',
      order_id: null,
      order_code: null,
      crop_category: '蔬菜类',
      crop_name: '大番茄',
      crop_variety: '大番茄',
      category_code: '03',
      type_code: '02',
      sub_code: '001',
      source_origin: '自育',
      source_description: '本地育苗',
      initial_quantity: 300,
      current_quantity: 280,
      planted_quantity: 245,
      harvested_quantity: 0,
      status: 'growing',
      seed_entry_date: '2026-04-05',
      seedling_start_date: '2026-04-08',
      planting_date: '2026-04-24',
      harvest_date: null,
      source_instance_id: null,
      create_by: '系统',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const ci of instances) {
    db.run(`
      INSERT OR REPLACE INTO crop_instances
      (id, instance_code, order_id, order_code, crop_category, crop_name, crop_variety,
       category_code, type_code, sub_code, source_origin, source_description,
       initial_quantity, current_quantity, planted_quantity, harvested_quantity, status,
       seed_entry_date, seedling_start_date, planting_date, harvest_date, source_instance_id, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ci.id, ci.instance_code, ci.order_id, ci.order_code, ci.crop_category, ci.crop_name,
      ci.crop_variety, ci.category_code, ci.type_code, ci.sub_code, ci.source_origin,
      ci.source_description, ci.initial_quantity, ci.current_quantity, ci.planted_quantity,
      ci.harvested_quantity, ci.status, ci.seed_entry_date, ci.seedling_start_date,
      ci.planting_date, ci.harvest_date, ci.source_instance_id, ci.create_by,
      ci.create_time, ci.update_time
    ]);
  }

  console.log(`已导入 ${instances.length} 条作物实例`);
}

/**
 * 导出数据库
 */
export function exportDatabase() {
  seedCropVarieties();
  seedSuppliers();
  seedSeedSources();
  seedSeedlings();
  seedPlantings();
  seedHarvestRecords();
  seedFarmTasks();
  seedLaborRecords();
  seedInspections();
  seedProblems();
  seedCropInstances();
  seedInventory();

  saveDatabase();
  console.log('数据库种子数据导入完成');
}
