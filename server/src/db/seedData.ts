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
      source_code: 'ZZ20260115-001',
      source_name: '红果番茄种子',
      source_type: '种子',
      crop_name: '红果番茄',
      crop_variety: '番茄',
      supplier_id: 'SUP001',
      supplier_name: '金色稻种有限公司',
      quantity: 50,
      unit: '袋',
      purchase_date: '2026-01-15',
      purchase_price: 150,
      total_amount: 7500,
      used_quantity: 20000,
      remaining_quantity: 35000,
      status: 'active',
      production_plan_code: 'SC20260115-001',
      create_by: '李明辉',
      create_time: '2026-01-15T10:00:00.000Z',
      update_time: '2026-04-20T14:30:00.000Z'
    },
    {
      id: 'SS002',
      source_code: 'ZZ20260201-001',
      source_name: '大叶生菜种子',
      source_type: '种苗',
      crop_name: '大叶生菜',
      crop_variety: '生菜',
      supplier_id: 'SUP002',
      supplier_name: '丰收种业公司',
      quantity: 30,
      unit: '株',
      purchase_date: '2026-02-01',
      purchase_price: 5,
      total_amount: 150,
      used_quantity: 1500,
      remaining_quantity: 1500,
      status: 'active',
      production_plan_code: 'SC20260201-001',
      create_by: '王建国',
      create_time: '2026-02-01T09:00:00.000Z',
      update_time: '2026-04-18T11:20:00.000Z'
    },
    {
      id: 'SS003',
      source_code: 'ZZ20260215-001',
      source_name: '水果黄瓜种子',
      source_type: '种子',
      crop_name: '水果黄瓜',
      crop_variety: '黄瓜',
      supplier_id: 'SUP001',
      supplier_name: '金色稻种有限公司',
      quantity: 40,
      unit: '袋',
      purchase_date: '2026-02-15',
      purchase_price: 120,
      total_amount: 4800,
      used_quantity: 0,
      remaining_quantity: 40000,
      status: 'active',
      production_plan_code: 'SC20260215-001',
      create_by: '李明辉',
      create_time: '2026-02-15T14:00:00.000Z',
      update_time: '2026-04-20T09:00:00.000Z'
    },
    {
      id: 'SS004',
      source_code: 'ZZ20260301-001',
      source_name: '紫长茄子种子',
      source_type: '种子',
      crop_name: '紫长茄子',
      crop_variety: '茄子',
      supplier_id: 'SUP003',
      supplier_name: '绿野种苗公司',
      quantity: 20,
      unit: '袋',
      purchase_date: '2026-03-01',
      purchase_price: 200,
      total_amount: 4000,
      used_quantity: 20000,
      remaining_quantity: 0,
      status: 'depleted',
      production_plan_code: 'SC20260301-001',
      create_by: '张伟',
      create_time: '2026-03-01T08:30:00.000Z',
      update_time: '2026-04-15T16:00:00.000Z'
    },
    {
      id: 'SS005',
      source_code: 'ZZ20260310-001',
      source_name: '大叶空心菜种苗',
      source_type: '扦插苗',
      crop_name: '大叶空心菜',
      crop_variety: '空心菜',
      supplier_id: '',
      supplier_name: '基地自繁',
      quantity: 100,
      unit: '株',
      purchase_date: '2026-03-10',
      purchase_price: 0,
      total_amount: 0,
      used_quantity: 2000,
      remaining_quantity: 8000,
      status: 'active',
      production_plan_code: 'SC20260310-001',
      create_by: '王建国',
      create_time: '2026-03-10T09:00:00.000Z',
      update_time: '2026-04-20T10:00:00.000Z'
    },
    {
      id: 'SS006',
      source_code: 'ZZ20260315-001',
      source_name: '黑美人西瓜嫁接苗',
      source_type: '嫁接苗',
      crop_name: '黑美人西瓜',
      crop_variety: '西瓜',
      supplier_id: '',
      supplier_name: '委托培育',
      quantity: 50,
      unit: '株',
      purchase_date: '2026-03-15',
      purchase_price: 80,
      total_amount: 4000,
      used_quantity: 0,
      remaining_quantity: 5000,
      status: 'active',
      production_plan_code: 'SC20260315-001',
      create_by: '李明辉',
      create_time: '2026-03-15T14:00:00.000Z',
      update_time: '2026-04-18T16:00:00.000Z'
    },
    {
      id: 'SS007',
      source_code: 'ZZ20260320-001',
      source_name: '奶油生菜组培苗',
      source_type: '组培苗',
      crop_name: '奶油生菜',
      crop_variety: '生菜',
      supplier_id: '',
      supplier_name: '省农业厅赠送',
      quantity: 200,
      unit: '株',
      purchase_date: '2026-03-20',
      purchase_price: 0,
      total_amount: 0,
      used_quantity: 5000,
      remaining_quantity: 15000,
      status: 'active',
      production_plan_code: 'SC20260320-001',
      create_by: '张伟',
      create_time: '2026-03-20T10:00:00.000Z',
      update_time: '2026-04-19T09:00:00.000Z'
    }
  ];

  for (const ss of seedSources) {
    db.run(`
      INSERT OR REPLACE INTO seed_sources
      (id, source_code, source_name, source_type, crop_name, crop_variety,
       supplier_id, supplier_name, quantity, unit, purchase_date, purchase_price,
       total_amount, used_quantity, remaining_quantity, status, production_plan_code, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ss.id, ss.source_code, ss.source_name, ss.source_type, ss.crop_name, ss.crop_variety,
      ss.supplier_id, ss.supplier_name, ss.quantity, ss.unit, ss.purchase_date, ss.purchase_price,
      ss.total_amount, ss.used_quantity, ss.remaining_quantity, ss.status, ss.production_plan_code, ss.create_by, ss.create_time, ss.update_time
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
      seedling_code: 'YM20260201-001',
      source_id: 'SS001',
      source_name: '红果番茄种子',
      production_plan_code: 'SC20260115-001',
      crop_name: '番茄',
      crop_variety: '红果番茄',
      seedling_type: '穴盘育苗',
      greenhouse_name: '育苗温室A区',
      area_name: '1号区',
      seedling_date: '2026-02-01',
      expected_finish_date: '2026-02-28',
      seedling_quantity: 50000,
      survival_quantity: 45000,
      survival_rate: 90,
      status: 'completed',
      seedling_status: '待定植',
      create_by: '李明辉',
      create_time: '2026-02-01T08:00:00.000Z',
      update_time: '2026-02-28T17:00:00.000Z'
    },
    {
      id: 'SD002',
      seedling_code: 'YM20260301-001',
      source_id: 'SS002',
      source_name: '大叶生菜种子',
      production_plan_code: 'SC20260201-001',
      crop_name: '生菜',
      crop_variety: '大叶生菜',
      seedling_type: '直播育苗',
      greenhouse_name: '育苗温室B区',
      area_name: '2号区',
      seedling_date: '2026-03-01',
      expected_finish_date: '2026-03-31',
      seedling_quantity: 3000,
      survival_quantity: 2700,
      survival_rate: 90,
      status: 'in_progress',
      seedling_status: '生长中',
      create_by: '王建国',
      create_time: '2026-03-01T09:00:00.000Z',
      update_time: '2026-04-20T10:00:00.000Z'
    },
    {
      id: 'SD003',
      seedling_code: 'YM20260310-001',
      source_id: 'SS003',
      source_name: '水果黄瓜种子',
      production_plan_code: 'SC20260215-001',
      crop_name: '黄瓜',
      crop_variety: '水果黄瓜',
      seedling_type: '穴盘育苗',
      greenhouse_name: '育苗温室A区',
      area_name: '1号区',
      seedling_date: '2026-03-10',
      expected_finish_date: '2026-04-10',
      seedling_quantity: 10000,
      survival_quantity: 9500,
      survival_rate: 95,
      status: 'in_progress',
      seedling_status: '生长中',
      create_by: '李明辉',
      create_time: '2026-03-10T08:00:00.000Z',
      update_time: '2026-04-20T15:00:00.000Z'
    },
    {
      id: 'SD004',
      seedling_code: 'YM20260420-001',
      source_id: '',
      source_name: '',
      production_plan_code: '',
      crop_name: '红颜草莓',
      crop_variety: '红颜草莓',
      seedling_type: '扦插育苗',
      greenhouse_name: '育苗温室A区',
      area_name: '1号区',
      seedling_date: '2026-04-20',
      expected_finish_date: '2026-06-20',
      seedling_quantity: 0,
      survival_quantity: 0,
      survival_rate: 0,
      status: 'in_progress',
      seedling_status: '待扩繁',
      create_by: '张伟',
      create_time: '2026-04-20T09:00:00.000Z',
      update_time: '2026-04-20T09:00:00.000Z'
    },
    {
      id: 'SD005',
      seedling_code: 'YM20260415-001',
      source_id: 'SS005',
      source_name: '大叶空心菜种苗',
      production_plan_code: 'SC20260310-001',
      crop_name: '空心菜',
      crop_variety: '大叶空心菜',
      seedling_type: '扦插育苗',
      greenhouse_name: '育苗温室B区',
      area_name: '3号区',
      seedling_date: '2026-04-15',
      expected_finish_date: '2026-05-15',
      seedling_quantity: 10000,
      survival_quantity: 8500,
      survival_rate: 85,
      status: 'in_progress',
      seedling_status: '生长中',
      create_by: '王建国',
      create_time: '2026-04-15T10:00:00.000Z',
      update_time: '2026-04-20T16:00:00.000Z'
    }
  ];

  for (const sd of seedlings) {
    db.run(`
      INSERT OR REPLACE INTO seedlings
      (id, seedling_code, source_id, source_name, production_plan_code, crop_name, crop_variety,
       seedling_type, greenhouse_name, area_name, seedling_date, expected_finish_date,
       seedling_quantity, survival_quantity, survival_rate, status, seedling_status, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sd.id, sd.seedling_code, sd.source_id, sd.source_name, sd.production_plan_code, sd.crop_name, sd.crop_variety,
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
      planting_code: 'ZZ20260228-001',
      source_type: '育苗',
      source_id: 'SD001',
      source_name: 'YM20260201-001',
      crop_name: '番茄',
      crop_variety: '红果番茄',
      greenhouse_name: '1号大棚',
      area_name: '01区',
      planting_date: '2026-02-28',
      planting_quantity: 40000,
      planted_quantity: 38000,
      survival_quantity: 37000,
      survival_rate: 92.5,
      growth_status: '开花结果期',
      expected_harvest_date: '2026-05-15',
      actual_harvest_date: null,
      harvest_quantity: 0,
      status: 'growing',
      create_by: '李明辉',
      create_time: '2026-02-28T08:00:00.000Z',
      update_time: '2026-04-20T10:00:00.000Z'
    },
    {
      id: 'PL002',
      planting_code: 'ZZ20260315-001',
      source_type: '育苗',
      source_id: 'SD002',
      source_name: 'YM20260301-001',
      crop_name: '生菜',
      crop_variety: '大叶生菜',
      greenhouse_name: '2号大棚',
      area_name: '01区',
      planting_date: '2026-03-15',
      planting_quantity: 2500,
      planted_quantity: 2400,
      survival_quantity: 2350,
      survival_rate: 94,
      growth_status: '幼苗期',
      expected_harvest_date: '2026-04-30',
      actual_harvest_date: null,
      harvest_quantity: 0,
      status: 'growing',
      create_by: '王建国',
      create_time: '2026-03-15T09:00:00.000Z',
      update_time: '2026-04-20T11:00:00.000Z'
    },
    {
      id: 'PL003',
      planting_code: 'ZZ20260320-001',
      source_type: '育苗',
      source_id: 'SD003',
      source_name: 'YM20260310-001',
      crop_name: '黄瓜',
      crop_variety: '水果黄瓜',
      greenhouse_name: '3号大棚',
      area_name: '01区',
      planting_date: '2026-03-20',
      planting_quantity: 9000,
      planted_quantity: 8800,
      survival_quantity: 8600,
      survival_rate: 95.5,
      growth_status: '伸蔓期',
      expected_harvest_date: '2026-05-10',
      actual_harvest_date: null,
      harvest_quantity: 0,
      status: 'growing',
      create_by: '李明辉',
      create_time: '2026-03-20T08:00:00.000Z',
      update_time: '2026-04-20T14:00:00.000Z'
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
 * 导入数据字典
 * 注意：此数据需与前端 DEFAULT_DICTIONARIES 保持同步
 */
function seedDictionaries() {
  const db = getDatabase();

  const dictionaries = [
    // ========== 原有数据 ==========
    // 作物类别
    { id: 'DICT001', category: 'crop_category', code: 'vegetable', name: '蔬菜类', sort_number: 1 },
    { id: 'DICT002', category: 'crop_category', code: 'fruit', name: '水果类', sort_number: 2 },
    { id: 'DICT003', category: 'crop_category', code: 'grain', name: '粮食类', sort_number: 3 },
    { id: 'DICT004', category: 'crop_category', code: 'other', name: '其他', sort_number: 4 },

    // 种植模式
    { id: 'DICT010', category: 'planting_mode', code: 'greenhouse', name: '温室种植', sort_number: 1 },
    { id: 'DICT011', category: 'planting_mode', code: 'open', name: '露天种植', sort_number: 2 },
    { id: 'DICT012', category: 'planting_mode', code: 'hydroponic', name: '水培', sort_number: 3 },
    { id: 'DICT013', category: 'planting_mode', code: 'substrate', name: '基质栽培', sort_number: 4 },

    // 温室类型
    { id: 'DICT020', category: 'greenhouse_type', code: 'glass', name: '玻璃温室', sort_number: 1 },
    { id: 'DICT021', category: 'greenhouse_type', code: 'solar', name: '日光温室', sort_number: 2 },
    { id: 'DICT022', category: 'greenhouse_type', code: 'plastic', name: '塑料大棚', sort_number: 3 },
    { id: 'DICT023', category: 'greenhouse_type', code: 'seedling', name: '育苗温室', sort_number: 4 },

    // ========== 前端同步数据 (dt-xxx 格式) ==========
    // 供应商类型
    { id: 'dt-001', category: 'supplier_type', code: 'SP', name: '原材料供应', sort_number: 1 },
    { id: 'dt-002', category: 'supplier_type', code: 'FE', name: '设施设备', sort_number: 2 },
    { id: 'dt-003', category: 'supplier_type', code: 'PP', name: '包装材料', sort_number: 3 },
    { id: 'dt-004', category: 'supplier_type', code: 'EQ', name: '设备配件', sort_number: 4 },
    { id: 'dt-005', category: 'supplier_type', code: 'FA', name: '工厂用品', sort_number: 5 },
    { id: 'dt-006', category: 'supplier_type', code: 'IR', name: '办公用品', sort_number: 6 },
    { id: 'dt-007', category: 'supplier_type', code: 'OP', name: '运营用品', sort_number: 7 },
    { id: 'dt-008', category: 'supplier_type', code: 'PH', name: '农药', sort_number: 8 },
    { id: 'dt-009', category: 'supplier_type', code: 'TS', name: '运输服务', sort_number: 9 },
    { id: 'dt-010', category: 'supplier_type', code: 'UT', name: '公用事业', sort_number: 10 },
    { id: 'dt-011', category: 'supplier_type', code: 'OT', name: '其他', sort_number: 11 },

    // 供应商状态
    { id: 'dt-020', category: 'supplier_status', code: 'active', name: '合作中', sort_number: 1 },
    { id: 'dt-021', category: 'supplier_status', code: 'paused', name: '暂停', sort_number: 2 },
    { id: 'dt-022', category: 'supplier_status', code: 'terminated', name: '终止', sort_number: 3 },

    // 供应商属性
    { id: 'dt-030', category: 'supplier_attribute', code: 'enterprise', name: '企业', sort_number: 1 },
    { id: 'dt-031', category: 'supplier_attribute', code: 'individual', name: '个体户', sort_number: 2 },
    { id: 'dt-032', category: 'supplier_attribute', code: 'institution', name: '事业单位', sort_number: 3 },

    // 审批状态
    { id: 'dt-040', category: 'approval_status', code: 'pending', name: '待审批', sort_number: 1 },
    { id: 'dt-041', category: 'approval_status', code: 'processing', name: '审批中', sort_number: 2 },
    { id: 'dt-042', category: 'approval_status', code: 'approved', name: '已通过', sort_number: 3 },
    { id: 'dt-043', category: 'approval_status', code: 'rejected', name: '已拒绝', sort_number: 4 },
    { id: 'dt-044', category: 'approval_status', code: 'withdrawn', name: '已撤回', sort_number: 5 },

    // 合同类型
    { id: 'dt-050', category: 'contract_type', code: 'labor', name: '劳动合同', sort_number: 1 },
    { id: 'dt-051', category: 'contract_type', code: 'internship', name: '实习协议', sort_number: 2 },
    { id: 'dt-052', category: 'contract_type', code: 'service', name: '劳务合同', sort_number: 3 },

    // 合同状态
    { id: 'dt-060', category: 'contract_status', code: 'effective', name: '生效中', sort_number: 1 },
    { id: 'dt-061', category: 'contract_status', code: 'pending', name: '待生效', sort_number: 2 },
    { id: 'dt-062', category: 'contract_status', code: 'expired', name: '已到期', sort_number: 3 },
    { id: 'dt-063', category: 'contract_status', code: 'terminated', name: '已终止', sort_number: 4 },

    // 入职状态
    { id: 'dt-070', category: 'onboarding_status', code: 'pending', name: '待入职', sort_number: 1 },
    { id: 'dt-071', category: 'onboarding_status', code: 'processing', name: '办理中', sort_number: 2 },
    { id: 'dt-072', category: 'onboarding_status', code: 'onboarded', name: '已入职', sort_number: 3 },

    // 招聘来源
    { id: 'dt-080', category: 'recruitment_source', code: 'campus', name: '校园招聘', sort_number: 1 },
    { id: 'dt-081', category: 'recruitment_source', code: 'social', name: '社会招聘', sort_number: 2 },
    { id: 'dt-082', category: 'recruitment_source', code: 'referral', name: '内部推荐', sort_number: 3 },
    { id: 'dt-083', category: 'recruitment_source', code: 'other', name: '其他', sort_number: 4 },

    // 成本分类
    { id: 'dt-090', category: 'cost_category', code: 'seed', name: '种质资源', sort_number: 1 },
    { id: 'dt-091', category: 'cost_category', code: 'fertilizer', name: '肥料与土壤改良剂', sort_number: 2 },
    { id: 'dt-092', category: 'cost_category', code: 'pesticide', name: '农药与植保产品', sort_number: 3 },
    { id: 'dt-093', category: 'cost_category', code: 'machinery', name: '农业机械', sort_number: 4 },
    { id: 'dt-094', category: 'cost_category', code: 'safety', name: '劳保与防护用品', sort_number: 5 },
    { id: 'dt-095', category: 'cost_category', code: 'harvest', name: '采收容器', sort_number: 6 },
    { id: 'dt-096', category: 'cost_category', code: 'monitoring', name: '监测设备', sort_number: 7 },
    { id: 'dt-097', category: 'cost_category', code: 'other', name: '其他', sort_number: 8 },

    // 仓库位置
    { id: 'dt-100', category: 'warehouse_location', code: 'A区', name: '仓库A区', sort_number: 1 },
    { id: 'dt-101', category: 'warehouse_location', code: 'B区', name: '仓库B区', sort_number: 2 },
    { id: 'dt-102', category: 'warehouse_location', code: 'C区', name: '仓库C区', sort_number: 3 },
    { id: 'dt-103', category: 'warehouse_location', code: 'D区', name: '仓库D区', sort_number: 4 },
    { id: 'dt-104', category: 'warehouse_location', code: 'E区', name: '仓库E区', sort_number: 5 },

    // 温室状态
    { id: 'dt-110', category: 'greenhouse_status', code: 'using', name: '使用中', sort_number: 1 },
    { id: 'dt-111', category: 'greenhouse_status', code: 'maintenance', name: '维护中', sort_number: 2 },
    { id: 'dt-112', category: 'greenhouse_status', code: 'idle', name: '空闲', sort_number: 3 },

    // 工人状态
    { id: 'dt-120', category: 'worker_status', code: 'working', name: '在职', sort_number: 1 },
    { id: 'dt-121', category: 'worker_status', code: 'resigned', name: '离职', sort_number: 2 },
    { id: 'dt-122', category: 'worker_status', code: 'retired', name: '退休', sort_number: 3 },

    // 薪资状态
    { id: 'dt-130', category: 'salary_status', code: 'pending', name: '待确认', sort_number: 1 },
    { id: 'dt-131', category: 'salary_status', code: 'confirmed', name: '已确认', sort_number: 2 },
    { id: 'dt-132', category: 'salary_status', code: 'paid', name: '已发放', sort_number: 3 },

    // 采购类型
    { id: 'dt-140', category: 'purchase_type', code: 'production', name: '生产性采购', sort_number: 1 },
    { id: 'dt-141', category: 'purchase_type', code: 'emergency', name: '紧急采购', sort_number: 2 },
    { id: 'dt-142', category: 'purchase_type', code: 'daily', name: '日常采购', sort_number: 3 },
    { id: 'dt-143', category: 'purchase_type', code: 'capital', name: '资本性采购', sort_number: 4 },

    // 物资状态
    { id: 'dt-150', category: 'material_status', code: 'in_stock', name: '库存', sort_number: 1 },
    { id: 'dt-151', category: 'material_status', code: 'out_of_stock', name: '缺货', sort_number: 2 },
    { id: 'dt-152', category: 'material_status', code: 'low_stock', name: '库存不足', sort_number: 3 },

    // 任务状态
    { id: 'dt-160', category: 'task_status', code: 'pending', name: '待处理', sort_number: 1 },
    { id: 'dt-161', category: 'task_status', code: 'in_progress', name: '进行中', sort_number: 2 },
    { id: 'dt-162', category: 'task_status', code: 'completed', name: '已完成', sort_number: 3 },
    { id: 'dt-163', category: 'task_status', code: 'cancelled', name: '已取消', sort_number: 4 },

    // 采收状态
    { id: 'dt-170', category: 'harvest_status', code: 'pending', name: '待采收', sort_number: 1 },
    { id: 'dt-171', category: 'harvest_status', code: 'harvested', name: '已采收', sort_number: 2 },
    { id: 'dt-172', category: 'harvest_status', code: 'graded', name: '已分级', sort_number: 3 },
    { id: 'dt-173', category: 'harvest_status', code: 'packaged', name: '已包装', sort_number: 4 },
    { id: 'dt-174', category: 'harvest_status', code: 'shipped', name: '已发货', sort_number: 5 },

    // 考核状态
    { id: 'dt-180', category: 'performance_status', code: 'pending', name: '待评估', sort_number: 1 },
    { id: 'dt-181', category: 'performance_status', code: 'evaluated', name: '已评估', sort_number: 2 },

    // 考勤状态
    { id: 'dt-190', category: 'attendance_status', code: 'normal', name: '正常', sort_number: 1 },
    { id: 'dt-191', category: 'attendance_status', code: 'late', name: '迟到', sort_number: 2 },
    { id: 'dt-192', category: 'attendance_status', code: 'early', name: '早退', sort_number: 3 },
    { id: 'dt-193', category: 'attendance_status', code: 'absent', name: '缺勤', sort_number: 4 },
    { id: 'dt-194', category: 'attendance_status', code: 'overtime', name: '加班', sort_number: 5 },

    // 技能状态
    { id: 'dt-200', category: 'skill_status', code: 'normal', name: '正常', sort_number: 1 },
    { id: 'dt-201', category: 'skill_status', code: 'expiring', name: '即将过期', sort_number: 2 },
    { id: 'dt-202', category: 'skill_status', code: 'expired', name: '已过期', sort_number: 3 },

    // 离职原因
    { id: 'dt-210', category: 'resignation_reason', code: 'personal', name: '个人原因', sort_number: 1 },
    { id: 'dt-211', category: 'resignation_reason', code: 'career', name: '职业发展', sort_number: 2 },
    { id: 'dt-212', category: 'resignation_reason', code: 'compensation', name: '薪酬原因', sort_number: 3 },
    { id: 'dt-213', category: 'resignation_reason', code: 'family', name: '家庭原因', sort_number: 4 },
    { id: 'dt-214', category: 'resignation_reason', code: 'other', name: '其他', sort_number: 5 },

    // 离职类型
    { id: 'dt-220', category: 'resignation_type', code: 'voluntary', name: '主动离职', sort_number: 1 },
    { id: 'dt-221', category: 'resignation_type', code: 'passive', name: '被动离职', sort_number: 2 },
    { id: 'dt-222', category: 'resignation_type', code: 'retirement', name: '退休', sort_number: 3 },

    // 物品归还状态
    { id: 'dt-230', category: 'return_status', code: 'pending', name: '待归还', sort_number: 1 },
    { id: 'dt-231', category: 'return_status', code: 'returned', name: '已归还', sort_number: 2 },
    { id: 'dt-232', category: 'return_status', code: 'damaged', name: '损坏', sort_number: 3 },
    { id: 'dt-233', category: 'return_status', code: 'lost', name: '丢失', sort_number: 4 },

    // 岗位类型
    { id: 'dt-240', category: 'position_type', code: 'full_time', name: '全职', sort_number: 1 },
    { id: 'dt-241', category: 'position_type', code: 'part_time', name: '兼职', sort_number: 2 },
    { id: 'dt-242', category: 'position_type', code: 'contract', name: '合同工', sort_number: 3 },
    { id: 'dt-243', category: 'position_type', code: 'intern', name: '实习生', sort_number: 4 },

    // 岗位职级
    { id: 'dt-250', category: 'position_level', code: 'senior', name: '高级', sort_number: 1 },
    { id: 'dt-251', category: 'position_level', code: 'mid', name: '中级', sort_number: 2 },
    { id: 'dt-252', category: 'position_level', code: 'junior', name: '初级', sort_number: 3 },
    { id: 'dt-253', category: 'position_level', code: 'entry', name: '入门级', sort_number: 4 },

    // 工人类型
    { id: 'dt-260', category: 'worker_type', code: 'formal', name: '正式工', sort_number: 1 },
    { id: 'dt-261', category: 'worker_type', code: 'temporary', name: '临时工', sort_number: 2 },
    { id: 'dt-262', category: 'worker_type', code: 'seasonal', name: '季节工', sort_number: 3 },
    { id: 'dt-263', category: 'worker_type', code: 'none', name: '无合同', sort_number: 4 },

    // 保险类型
    { id: 'dt-270', category: 'insurance_type', code: 'work_injury', name: '工伤险', sort_number: 1 },
    { id: 'dt-271', category: 'insurance_type', code: 'comprehensive', name: '综合险', sort_number: 2 },
    { id: 'dt-272', category: 'insurance_type', code: 'none', name: '无保险', sort_number: 3 },

    // 临时工来源
    { id: 'dt-280', category: 'temp_worker_source', code: 'agency', name: '劳务公司', sort_number: 1 },
    { id: 'dt-281', category: 'temp_worker_source', code: 'individual', name: '个人零工', sort_number: 2 },
    { id: 'dt-282', category: 'temp_worker_source', code: 'student', name: '学生实习', sort_number: 3 },

    // 作业区域
    { id: 'dt-290', category: 'work_zone', code: 'A区', name: 'A区', sort_number: 1 },
    { id: 'dt-291', category: 'work_zone', code: 'B区', name: 'B区', sort_number: 2 },
    { id: 'dt-292', category: 'work_zone', code: 'C区', name: 'C区', sort_number: 3 },
    { id: 'dt-293', category: 'work_zone', code: 'D区', name: 'D区', sort_number: 4 },

    // 临时工状态
    { id: 'dt-300', category: 'temp_worker_status', code: 'working', name: '在职', sort_number: 1 },
    { id: 'dt-301', category: 'temp_worker_status', code: 'resigned', name: '离职', sort_number: 2 },
    { id: 'dt-302', category: 'temp_worker_status', code: 'leave', name: '停薪留职', sort_number: 3 },
    { id: 'dt-303', category: 'temp_worker_status', code: 'probation', name: '试用期', sort_number: 4 },

    // 加班类型
    { id: 'dt-310', category: 'overtime_type', code: 'normal', name: '普通加班', sort_number: 1 },
    { id: 'dt-311', category: 'overtime_type', code: 'weekend', name: '周末加班', sort_number: 2 },
    { id: 'dt-312', category: 'overtime_type', code: 'holiday', name: '节假日加班', sort_number: 3 },

    // 请假类型
    { id: 'dt-320', category: 'leave_type', code: 'personal', name: '事假', sort_number: 1 },
    { id: 'dt-321', category: 'leave_type', code: 'sick', name: '病假', sort_number: 2 },
    { id: 'dt-322', category: 'leave_type', code: 'annual', name: '年假', sort_number: 3 },
    { id: 'dt-323', category: 'leave_type', code: 'marriage', name: '婚假', sort_number: 4 },
    { id: 'dt-324', category: 'leave_type', code: 'maternity', name: '产假', sort_number: 5 },
    { id: 'dt-325', category: 'leave_type', code: 'paternity', name: '陪产假', sort_number: 6 },
    { id: 'dt-326', category: 'leave_type', code: 'bereavement', name: '丧假', sort_number: 7 },
    { id: 'dt-327', category: 'leave_type', code: 'work_injury', name: '工伤假', sort_number: 8 },

    // ========== 业务模块字典 ==========
    // 育苗方式
    { id: 'biz-001', category: 'seedling_type', code: 'plug', name: '穴盘育苗', sort_number: 1 },
    { id: 'biz-002', category: 'seedling_type', code: 'direct', name: '直播育苗', sort_number: 2 },
    { id: 'biz-003', category: 'seedling_type', code: 'grafting', name: '嫁接育苗', sort_number: 3 },
    { id: 'biz-004', category: 'seedling_type', code: 'tissue', name: '组培育苗', sort_number: 4 },
    { id: 'biz-005', category: 'seedling_type', code: 'ground', name: '地栽育苗', sort_number: 5 },
    { id: 'biz-006', category: 'seedling_type', code: 'floating', name: '漂浮育苗', sort_number: 6 },
    { id: 'biz-007', category: 'seedling_type', code: 'ebb_flow', name: '潮汐育苗', sort_number: 7 },
    { id: 'biz-008', category: 'seedling_type', code: 'paper_pot', name: '纸袋育苗', sort_number: 8 },
    { id: 'biz-009', category: 'seedling_type', code: 'nutrition_cup', name: '营养杯育苗', sort_number: 9 },
    { id: 'biz-010', category: 'seedling_type', code: 'cutting', name: '扦插育苗', sort_number: 10 },
    { id: 'biz-011', category: 'seedling_type', code: 'division', name: '分株育苗', sort_number: 11 },
    { id: 'biz-012', category: 'seedling_type', code: 'other', name: '其他', sort_number: 12 },

    // 种源类型
    { id: 'biz-020', category: 'source_type', code: 'seed', name: '种子', sort_number: 1 },
    { id: 'biz-021', category: 'source_type', code: 'seedling', name: '种苗', sort_number: 2 },
    { id: 'biz-022', category: 'source_type', code: 'cutting', name: '扦插苗', sort_number: 3 },
    { id: 'biz-023', category: 'source_type', code: 'grafting', name: '嫁接苗', sort_number: 4 },
    { id: 'biz-024', category: 'source_type', code: 'tissue_culture', name: '组培苗', sort_number: 5 },
    { id: 'biz-025', category: 'source_type', code: 'split', name: '分株苗', sort_number: 6 },
    { id: 'biz-026', category: 'source_type', code: 'bulb', name: '种球', sort_number: 7 },
    { id: 'biz-027', category: 'source_type', code: 'other', name: '其他', sort_number: 8 },

    // 育苗场地/区域
    { id: 'biz-030', category: 'seedling_site', code: 'SITE001', name: '育苗温室A区', sort_number: 1 },
    { id: 'biz-031', category: 'seedling_site', code: 'SITE002', name: '育苗温室B区', sort_number: 2 },
    { id: 'biz-032', category: 'seedling_site', code: 'SITE003', name: '育苗温室C区', sort_number: 3 },
    { id: 'biz-033', category: 'seedling_site', code: 'SITE004', name: '育苗温室D区', sort_number: 4 },

    // 种植区域
    { id: 'biz-040', category: 'planting_area', code: 'G001', name: '一棚 > 01区', sort_number: 1 },
    { id: 'biz-041', category: 'planting_area', code: 'G002', name: '一棚 > 02区', sort_number: 2 },
    { id: 'biz-042', category: 'planting_area', code: 'G003', name: '二棚 > 01区', sort_number: 3 },
    { id: 'biz-043', category: 'planting_area', code: 'G004', name: '二棚 > 02区', sort_number: 4 },
    { id: 'biz-044', category: 'planting_area', code: 'G005', name: '三棚 > 01区', sort_number: 5 },

    // 目标成活率预设
    { id: 'biz-050', category: 'survival_rate_target', code: '85', name: '85%（保守）', sort_number: 1 },
    { id: 'biz-051', category: 'survival_rate_target', code: '90', name: '90%（标准）', sort_number: 2 },
    { id: 'biz-052', category: 'survival_rate_target', code: '95', name: '95%（乐观）', sort_number: 3 },

    // 育苗计划类型
    { id: 'biz-060', category: 'seedling_plan_type', code: 'routine', name: '常规', sort_number: 1 },
    { id: 'biz-061', category: 'seedling_plan_type', code: 'urgent', name: '加急', sort_number: 2 },
    { id: 'biz-062', category: 'seedling_plan_type', code: 'experiment', name: '实验', sort_number: 3 },

    // 扩繁倍数预设
    { id: 'biz-070', category: 'propagation_multiple', code: '5', name: '3-5倍（多肉植物等）', sort_number: 1 },
    { id: 'biz-071', category: 'propagation_multiple', code: '10', name: '5-10倍（吊兰、吊竹梅等）', sort_number: 2 },
    { id: 'biz-072', category: 'propagation_multiple', code: '20', name: '10-20倍（菊花分株等）', sort_number: 3 },
    { id: 'biz-073', category: 'propagation_multiple', code: '50', name: '30-50倍（普通草莓扩繁）', sort_number: 4 },
    { id: 'biz-074', category: 'propagation_multiple', code: '80', name: '50-80倍（草莓优良品种）', sort_number: 5 },
    { id: 'biz-075', category: 'propagation_multiple', code: '500', name: '100-500倍（普通组培）', sort_number: 6 },
    { id: 'biz-076', category: 'propagation_multiple', code: '1000', name: '500-1000倍（高品质组培）', sort_number: 7 },
    { id: 'biz-077', category: 'propagation_multiple', code: '0', name: '其他（自定义倍数）', sort_number: 8 },

    // 种植状态
    { id: 'biz-085', category: 'planting_status', code: 'planted', name: '已定植', sort_number: 1 },
    { id: 'biz-086', category: 'planting_status', code: 'growing', name: '生长期', sort_number: 2 },
    { id: 'biz-087', category: 'planting_status', code: 'harvested', name: '已采收', sort_number: 3 },
    { id: 'biz-088', category: 'planting_status', code: 'cancelled', name: '已取消', sort_number: 4 },

    // 操作人员
    { id: 'biz-080', category: 'operator', code: '李明辉', name: '李明辉', sort_number: 1 },
    { id: 'biz-081', category: 'operator', code: '王建国', name: '王建国', sort_number: 2 },
    { id: 'biz-082', category: 'operator', code: '张伟', name: '张伟', sort_number: 3 },
    { id: 'biz-083', category: 'operator', code: '刘洋', name: '刘洋', sort_number: 4 },
    { id: 'biz-084', category: 'operator', code: '陈静', name: '陈静', sort_number: 5 },

    // 物料类型
    { id: 'dt-mat-001', category: 'material_type', code: 'seed', name: '种子', sort_number: 1 },
    { id: 'dt-mat-002', category: 'material_type', code: 'seedling', name: '种苗', sort_number: 2 },
    { id: 'dt-mat-003', category: 'material_type', code: 'fertilizer', name: '肥料', sort_number: 3 },
    { id: 'dt-mat-004', category: 'material_type', code: 'pesticide', name: '农药', sort_number: 4 },
    { id: 'dt-mat-005', category: 'material_type', code: 'equipment', name: '设备', sort_number: 5 },
    { id: 'dt-mat-006', category: 'material_type', code: 'packaging', name: '包装材料', sort_number: 6 },
    { id: 'dt-mat-007', category: 'material_type', code: 'other', name: '其他', sort_number: 7 },

    // 员工状态
    { id: 'dt-emp-001', category: 'employee_status', code: 'active', name: '在职', sort_number: 1 },
    { id: 'dt-emp-002', category: 'employee_status', code: 'probation', name: '试用期', sort_number: 2 },
    { id: 'dt-emp-003', category: 'employee_status', code: 'intern', name: '实习', sort_number: 3 },
    { id: 'dt-emp-004', category: 'employee_status', code: 'resigned', name: '离职', sort_number: 4 },

    // 性别
    { id: 'dt-gender-001', category: 'gender', code: 'male', name: '男', sort_number: 1 },
    { id: 'dt-gender-002', category: 'gender', code: 'female', name: '女', sort_number: 2 },
  ];

  for (const dict of dictionaries) {
    db.run(`
      INSERT OR REPLACE INTO dictionaries
      (id, category_code, dict_code, dict_label, dict_value, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
    `, [
      dict.id,
      dict.category,
      dict.code,
      dict.name,
      dict.name,
      dict.sort_number
    ]);
  }

  console.log(`已导入 ${dictionaries.length} 条字典数据`);
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
  seedDictionaries();

  saveDatabase();
  console.log('数据库种子数据导入完成');
}
