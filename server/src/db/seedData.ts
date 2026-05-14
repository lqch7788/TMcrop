/**
 * 种子数据导入
 * 从数据导入 SQLite
 */

import { getDatabase, saveDatabase } from './index';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';

/**
 * 导入作物品种数据
 * 注意：只在数据库为空时才导入，避免覆盖已有数据
 */
function seedCropVarieties() {
  const db = getDatabase();

  // 检查是否已有数据
  const existing = db.exec('SELECT COUNT(*) FROM crop_varieties');
  const count = Number(existing[0]?.values[0]?.[0]) || 0;

  if (count > 0) {
    console.log(`作物品种数据已存在 (${count} 条)，跳过导入`);
    return;
  }

  // 如果数据库为空，使用正确的11位编码格式
  const cropVarieties = [
    {
      id: 'CV001',
      crop_code: 'PD03010100100',  // 蔬菜类-叶菜类-生菜-红生菜
      category_code: '03',
      category_name: '蔬菜类',
      type_code: '01',
      type_name: '叶菜类',
      variety_code: '01',
      variety_name: '生菜',
      sub_variety1_code: '001',
      sub_variety1_name: '红生菜',
      detail_variety_code: '00',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV002',
      crop_code: 'PD03010100200',  // 蔬菜类-叶菜类-生菜-大叶菠菜
      category_code: '03',
      category_name: '蔬菜类',
      type_code: '01',
      type_name: '叶菜类',
      variety_code: '01',
      variety_name: '生菜',
      sub_variety1_code: '002',
      sub_variety1_name: '大叶菠菜',
      detail_variety_code: '00',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV003',
      crop_code: 'PD03030200100',  // 蔬菜类-茄果类-番茄-大番茄
      category_code: '03',
      category_name: '蔬菜类',
      type_code: '03',
      type_name: '茄果类',
      variety_code: '02',
      variety_name: '番茄',
      sub_variety1_code: '001',
      sub_variety1_name: '大番茄',
      detail_variety_code: '00',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV004',
      crop_code: 'PD03030400200',  // 蔬菜类-茄果类-辣椒-青椒
      category_code: '03',
      category_name: '蔬菜类',
      type_code: '03',
      type_name: '茄果类',
      variety_code: '04',
      variety_name: '辣椒',
      sub_variety1_code: '002',
      sub_variety1_name: '青椒',
      detail_variety_code: '00',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV005',
      crop_code: 'FR01010100100',  // 水果类-浆果类-草莓-红颜
      category_code: '01',
      category_name: '水果类',
      type_code: '01',
      type_name: '浆果类',
      variety_code: '01',
      variety_name: '草莓',
      sub_variety1_code: '001',
      sub_variety1_name: '红颜',
      detail_variety_code: '00',
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

  // 从前端mock数据迁移的完整供应商数据
  const suppliers = [
    { id: 'SUP001', supplier_code: 'SU_SP01001', supplier_name: '金色稻种有限公司', contact_person: '张志远', contact_phone: '13800138001', mobile_phone: '13800138001', work_phone: '0571-88886666', fax: '0571-88886667', address: '岳麓区科技园路1号', supplier_type: 'SP', supplier_attribute: '企业', status: 'active', country: '中国', province: '湖南省', city: '长沙市', bank_name: '中国农业银行长沙分行', bank_card_number: '6228481234567890123', organization: '宁波帮帮忙公司', create_date: '2024-01-15', remarks: '长期合作供应商，品质稳定' },
    { id: 'SUP002', supplier_code: 'SU_SP01002', supplier_name: '丰收种业公司', contact_person: '李志刚', contact_phone: '13800138002', mobile_phone: '13800138002', work_phone: '025-88888888', fax: '025-88888889', address: '江宁区农业路88号', supplier_type: 'SP', supplier_attribute: '企业', status: 'active', country: '中国', province: '江苏省', city: '南京市', bank_name: '中国工商银行南京分行', bank_card_number: '6228881234567890124', organization: '成都帮帮您公司', create_date: '2024-02-20', remarks: '' },
    { id: 'SUP003', supplier_code: 'SU_SP03001', supplier_name: '绿叶蔬菜种苗基地', contact_person: '王老板', contact_phone: '13800138003', mobile_phone: '13800138003', work_phone: '0536-88888888', fax: '0536-88888889', address: '蔬菜批发市场A区12号', supplier_type: 'SP', supplier_attribute: '个体户', status: 'active', country: '中国', province: '山东省', city: '寿光市', bank_name: '中国建设银行寿光支行', bank_card_number: '6227001234567890125', organization: '宁波帮帮忙公司', create_date: '2024-03-10', remarks: '主营蔬菜种苗' },
    { id: 'SUP004', supplier_code: 'SU_FE01001', supplier_name: '有机肥生产厂家', contact_person: '赵总', contact_phone: '13800138004', mobile_phone: '13800138004', work_phone: '0371-88886666', fax: '0371-88886667', address: '中原区化工路56号', supplier_type: 'FE', supplier_attribute: '企业', status: 'active', country: '中国', province: '河南省', city: '郑州市', bank_name: '中国银行郑州分行', bank_card_number: '6228881234567890126', organization: '成都帮帮您公司', create_date: '2024-01-25', remarks: '' },
    { id: 'SUP005', supplier_code: 'SU_FE02001', supplier_name: '复合化肥供应公司', contact_person: '钱厂', contact_phone: '13800138005', mobile_phone: '13800138005', work_phone: '0311-88888888', fax: '0311-88888889', address: '裕华区农资中心B座', supplier_type: 'FE', supplier_attribute: '企业', status: 'active', country: '中国', province: '河北省', city: '石家庄市', bank_name: '中国农业银行石家庄支行', bank_card_number: '6228482345678900127', organization: '宁波帮帮忙公司', create_date: '2024-04-05', remarks: '化肥批发商' },
    { id: 'SUP006', supplier_code: 'SU_PP01001', supplier_name: '高效杀虫剂供应商', contact_person: '孙经理', contact_phone: '13800138006', mobile_phone: '13800138006', work_phone: '0512-88886666', fax: '0512-88886667', address: '工业园区东兴路128号', supplier_type: 'PP', supplier_attribute: '企业', status: 'active', country: '中国', province: '江苏省', city: '苏州市', bank_name: '中国工商银行苏州分行', bank_card_number: '6228883456789010128', organization: '宁波帮帮忙公司', create_date: '2024-02-18', remarks: '' },
    { id: 'SUP007', supplier_code: 'SU_PP02001', supplier_name: '杀菌剂供应中心', contact_person: '周经理', contact_phone: '13800138007', mobile_phone: '13800138007', work_phone: '0571-88888888', fax: '0571-88888889', address: '西湖区文三路45号', supplier_type: 'PP', supplier_attribute: '个体户', status: 'active', country: '中国', province: '浙江省', city: '杭州市', bank_name: '中国建设银行杭州分行', bank_card_number: '6227004567890120129', organization: '成都帮帮您公司', create_date: '2024-03-22', remarks: '农药批发' },
    { id: 'SUP008', supplier_code: 'SU_EQ01001', supplier_name: '拖拉机制造商', contact_person: '吴总', contact_phone: '13800138008', mobile_phone: '13800138008', work_phone: '0537-88886666', fax: '0537-88886667', address: '任城区农机工业园68号', supplier_type: 'EQ', supplier_attribute: '企业', status: 'active', country: '中国', province: '山东省', city: '济宁市', bank_name: '中国农业银行济宁分行', bank_card_number: '6228484567890120130', organization: '宁波帮帮忙公司', create_date: '2024-01-30', remarks: '' },
    { id: 'SUP009', supplier_code: 'SU_EQ03001', supplier_name: '植保无人机公司', contact_person: '郑经理', contact_phone: '13800138009', mobile_phone: '13800138009', work_phone: '0755-88888888', fax: '0755-88888889', address: '南山区科技园北区A栋', supplier_type: 'EQ', supplier_attribute: '企业', status: 'active', country: '中国', province: '广东省', city: '深圳市', bank_name: '招商银行深圳分行', bank_card_number: '6228885678901230131', organization: '成都帮帮您公司', create_date: '2024-05-12', remarks: '提供无人机植保服务' },
    { id: 'SUP010', supplier_code: 'SU_FA01001', supplier_name: '温室大棚骨架厂', contact_person: '王老板', contact_phone: '13800138010', mobile_phone: '13800138010', work_phone: '010-88886666', fax: '010-88886667', address: '大兴区农业装备基地3号', supplier_type: 'FA', supplier_attribute: '个体户', status: 'active', country: '中国', province: '北京市', city: '北京市', bank_name: '中国工商银行北京分行', bank_card_number: '6228886789012340132', organization: '宁波帮帮忙公司', create_date: '2024-02-08', remarks: '' },
    { id: 'SUP011', supplier_code: 'SU_FA02001', supplier_name: 'PO膜供应商', contact_person: '冯总', contact_phone: '13800138011', mobile_phone: '13800138011', work_phone: '0513-88888888', fax: '0513-88888889', address: '崇川区工业园纬一路', supplier_type: 'FA', supplier_attribute: '企业', status: 'inactive', country: '中国', province: '江苏省', city: '南通市', bank_name: '中国建设银行南通支行', bank_card_number: '6227006789012340133', organization: '成都帮帮您公司', create_date: '2024-03-18', remarks: '暂停合作' },
    { id: 'SUP012', supplier_code: 'SU_IR01001', supplier_name: '水泵设备供应商', contact_person: '陈志明', contact_phone: '13800138012', mobile_phone: '13800138012', work_phone: '0577-88886666', fax: '0577-88886667', address: '瓯海区机械工业园12号', supplier_type: 'IR', supplier_attribute: '个体户', status: 'active', country: '中国', province: '浙江省', city: '温州市', bank_name: '中国农业银行温州分行', bank_card_number: '6228487890123450134', organization: '宁波帮帮忙公司', create_date: '2024-04-25', remarks: '' },
    { id: 'SUP013', supplier_code: 'SU_OP01001', supplier_name: '劳保用品公司', contact_person: '刘总', contact_phone: '13800138013', mobile_phone: '13800138013', work_phone: '021-88888888', fax: '021-88888889', address: '浦东新区商城路368号', supplier_type: 'OP', supplier_attribute: '企业', status: 'active', country: '中国', province: '上海市', city: '上海市', bank_name: '中国银行上海分行', bank_card_number: '6228887890123450135', organization: '成都帮帮您公司', create_date: '2024-05-08', remarks: '' },
    { id: 'SUP014', supplier_code: 'SU_TS01001', supplier_name: '土壤检测服务中心', contact_person: '黄经理', contact_phone: '13800138014', mobile_phone: '13800138014', work_phone: '020-88886666', fax: '020-88886667', address: '天河区农业技术中心大厦', supplier_type: 'TS', supplier_attribute: '事业单位', status: 'active', country: '中国', province: '广东省', city: '广州市', bank_name: '中国建设银行广州分行', bank_card_number: '6227008901234560136', organization: '宁波帮帮忙公司', create_date: '2024-03-30', remarks: '提供专业检测报告' },
    { id: 'SUP015', supplier_code: 'SU_UT03001', supplier_name: '电线电缆供应商', contact_person: '许总', contact_phone: '13800138015', mobile_phone: '13800138015', work_phone: '0514-88888888', fax: '0514-88888889', address: '广陵区工业园电缆路1号', supplier_type: 'UT', supplier_attribute: '企业', status: 'active', country: '中国', province: '江苏省', city: '扬州市', bank_name: '中国工商银行扬州分行', bank_card_number: '6228888901234560137', organization: '成都帮帮您公司', create_date: '2024-06-15', remarks: '' },
  ];

  const nowStr = new Date().toISOString();
  for (const sup of suppliers) {
    db.run(`
      INSERT OR REPLACE INTO suppliers
      (id, supplier_code, supplier_name, contact_person, contact_phone,
       mobile_phone, work_phone, fax, address, supplier_type, supplier_attribute,
       status, country, province, city, bank_name, bank_card_number,
       organization, create_date, remarks, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      sup.id, sup.supplier_code, sup.supplier_name, sup.contact_person, sup.contact_phone,
      sup.mobile_phone, sup.work_phone, sup.fax, sup.address, sup.supplier_type, sup.supplier_attribute,
      sup.status, sup.country, sup.province, sup.city, sup.bank_name, sup.bank_card_number,
      sup.organization, sup.create_date, sup.remarks, nowStr, nowStr
    ]);
  }

  console.log(`已导入 ${suppliers.length} 条供应商数据`);
}

/**
 * 导入种源数据
 * 注意：source_type 使用英文枚举值，source_origin 表示来源途径
 */
function seedSeedSources() {
  const db = getDatabase();

  // 检查是否已有数据
  const existing = db.exec('SELECT COUNT(*) FROM seed_sources');
  const count = Number(existing[0]?.values[0]?.[0]) || 0;

  if (count > 0) {
    console.log(`种源数据已存在 (${count} 条)，跳过导入`);
    return;
  }

  // 种源数据 - 与前端 SeedSource 类型对齐
  // source_type: seed/seedling/cutting/grafting/tissue_culture/split/bulb/other
  // source_origin: external_purchase/internal_seed/tissue_culture/grafting/seedling_split/cutting/direct_seedling/direct_planting/external_harvest
  const seedSources = [
    {
      id: 'SS001',
      source_code: 'ZZ20260115-001',
      source_name: '红果番茄种子',
      source_type: 'seed',
      source_origin: 'external_purchase',
      crop_category: '蔬菜类',
      type_name: '茄果类',
      variety_name: '番茄',
      crop_name: '红果番茄',
      crop_variety: '番茄',
      crop_code: 'PD030102001',
      supplier_id: 'SUP001',
      supplier_name: '金色稻种有限公司',
      quantity: 50,
      unit: '袋',
      purchase_date: '2026-01-15',
      purchase_price: 150,
      total_amount: 7500,
      used_quantity: 15,
      remaining_quantity: 35,
      status: 'sufficient',
      production_plan_code: 'JZB2026-001',
      create_by: '李明辉',
      create_time: '2026-01-15T10:00:00.000Z',
      update_time: '2026-04-20T14:30:00.000Z'
    },
    {
      id: 'SS002',
      source_code: 'ZZ20260201-001',
      source_name: '大叶生菜种子',
      source_type: 'seed',
      source_origin: 'external_purchase',
      crop_category: '蔬菜类',
      type_name: '叶菜类',
      variety_name: '生菜',
      crop_name: '大叶生菜',
      crop_variety: '生菜',
      crop_code: 'PD030201001',
      supplier_id: 'SUP002',
      supplier_name: '丰收种业公司',
      quantity: 30,
      unit: '袋',
      purchase_date: '2026-02-01',
      purchase_price: 5,
      total_amount: 150,
      used_quantity: 15,
      remaining_quantity: 15,
      status: 'low',
      production_plan_code: 'JZB2026-002',
      create_by: '王建国',
      create_time: '2026-02-01T09:00:00.000Z',
      update_time: '2026-04-18T11:20:00.000Z'
    },
    {
      id: 'SS003',
      source_code: 'ZZ20260215-001',
      source_name: '水果黄瓜种子',
      source_type: 'seed',
      source_origin: 'external_purchase',
      crop_category: '蔬菜类',
      type_name: '瓜菜类',
      variety_name: '黄瓜',
      crop_name: '水果黄瓜',
      crop_variety: '黄瓜',
      crop_code: 'PD030301001',
      supplier_id: 'SUP001',
      supplier_name: '金色稻种有限公司',
      quantity: 40,
      unit: '袋',
      purchase_date: '2026-02-15',
      purchase_price: 120,
      total_amount: 4800,
      used_quantity: 10,
      remaining_quantity: 30,
      status: 'sufficient',
      production_plan_code: 'JZB2026-003',
      create_by: '李明辉',
      create_time: '2026-02-15T14:00:00.000Z',
      update_time: '2026-04-20T09:00:00.000Z'
    },
    {
      id: 'SS004',
      source_code: 'ZZ20260301-001',
      source_name: '紫长茄子种子',
      source_type: 'seed',
      source_origin: 'external_purchase',
      crop_category: '蔬菜类',
      type_name: '茄果类',
      variety_name: '茄子',
      crop_name: '紫长茄子',
      crop_variety: '茄子',
      crop_code: 'PD030103001',
      supplier_id: 'SUP003',
      supplier_name: '绿野种苗公司',
      quantity: 20,
      unit: '袋',
      purchase_date: '2026-03-01',
      purchase_price: 200,
      total_amount: 4000,
      used_quantity: 20,
      remaining_quantity: 0,
      status: 'depleted',
      production_plan_code: 'JZB2026-004',
      create_by: '张伟',
      create_time: '2026-03-01T08:30:00.000Z',
      update_time: '2026-04-15T16:00:00.000Z'
    },
    {
      id: 'SS005',
      source_code: 'ZZ20260310-001',
      source_name: '大叶空心菜扦插苗',
      source_type: 'cutting',
      source_origin: 'self_produced',
      crop_category: '蔬菜类',
      type_name: '叶菜类',
      variety_name: '空心菜',
      crop_name: '大叶空心菜',
      crop_variety: '空心菜',
      crop_code: 'PD030202001',
      supplier_id: '',
      supplier_name: '基地自繁',
      quantity: 100,
      unit: '株',
      purchase_date: '2026-03-10',
      purchase_price: 0,
      total_amount: 0,
      used_quantity: 20,
      remaining_quantity: 80,
      status: 'sufficient',
      production_plan_code: 'YMB2026-001',
      create_by: '王建国',
      create_time: '2026-03-10T09:00:00.000Z',
      update_time: '2026-04-20T10:00:00.000Z'
    },
    {
      id: 'SS006',
      source_code: 'ZZ20260315-001',
      source_name: '黑美人西瓜嫁接苗',
      source_type: 'grafting',
      source_origin: 'commissioned',
      crop_category: '蔬菜类',
      type_name: '瓜菜类',
      variety_name: '西瓜',
      crop_name: '黑美人西瓜',
      crop_variety: '西瓜',
      crop_code: 'PD030302001',
      supplier_id: '',
      supplier_name: '委托培育',
      quantity: 50,
      unit: '株',
      purchase_date: '2026-03-15',
      purchase_price: 80,
      total_amount: 4000,
      used_quantity: 10,
      remaining_quantity: 40,
      status: 'sufficient',
      production_plan_code: 'YMB2026-002',
      create_by: '李明辉',
      create_time: '2026-03-15T14:00:00.000Z',
      update_time: '2026-04-18T16:00:00.000Z'
    },
    {
      id: 'SS007',
      source_code: 'ZZ20260320-001',
      source_name: '奶油生菜组培苗',
      source_type: 'tissue_culture',
      source_origin: 'gift',
      crop_category: '蔬菜类',
      type_name: '叶菜类',
      variety_name: '生菜',
      crop_name: '奶油生菜',
      crop_variety: '生菜',
      crop_code: 'PD030202002',
      supplier_id: '',
      supplier_name: '省农业厅赠送',
      quantity: 200,
      unit: '株',
      purchase_date: '2026-03-20',
      purchase_price: 0,
      total_amount: 0,
      used_quantity: 50,
      remaining_quantity: 150,
      status: 'sufficient',
      production_plan_code: 'YMB2026-003',
      create_by: '张伟',
      create_time: '2026-03-20T10:00:00.000Z',
      update_time: '2026-04-19T09:00:00.000Z'
    }
  ];

  for (const ss of seedSources) {
    db.run(`
      INSERT OR REPLACE INTO seed_sources
      (id, source_code, source_name, source_type, source_origin,
       crop_category, type_name, variety_name, crop_name, crop_variety, crop_code,
       supplier_id, supplier_name, quantity, unit, purchase_date, purchase_price,
       total_amount, used_quantity, remaining_quantity, status, production_plan_code, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ss.id, ss.source_code, ss.source_name, ss.source_type, ss.source_origin,
      ss.crop_category, ss.type_name, ss.variety_name, ss.crop_name, ss.crop_variety, ss.crop_code,
      ss.supplier_id, ss.supplier_name, ss.quantity, ss.unit, ss.purchase_date, ss.purchase_price,
      ss.total_amount, ss.used_quantity, ss.remaining_quantity, ss.status, ss.production_plan_code, ss.create_by, ss.create_time, ss.update_time
    ]);
  }

  console.log(`已导入 ${seedSources.length} 条种源数据`);
}

/**
 * 导入生产计划数据
 */
function seedProductionPlans() {
  const db = getDatabase();

  // 生产计划数据 - 与计划管理-生产计划表对齐
  // JZB=育种计划, YMB=育苗计划, ZZB=种植计划
  const productionPlans = [
    {
      id: 'PP001',
      plan_code: 'JZB2026-001',
      plan_name: '红果番茄种源采购计划',
      plan_type: 'seed_breeding',
      crop_name: '红果番茄',
      crop_variety: '番茄',
      greenhouse_name: '',
      area_name: '',
      planned_quantity: 50,
      actual_quantity: 50,
      planting_date: '2026-01-15',
      expected_harvest_date: '',
      actual_harvest_date: '',
      status: 'completed',
      priority: 'medium',
      remarks: '用于种源库补充',
      create_by: '李明辉',
      create_time: '2026-01-15T10:00:00.000Z',
      update_time: '2026-04-20T14:30:00.000Z',
      responsible_person: '李明辉',
      unit: 'kg',
      publish_date: '2026-01-10',
      batch_status: 'completed',
      plan_detail: '',
      plan_detail_file_name: '',
      planting_area: 0,
      planting_mode: '',
      supplier_name: '北京某种子公司',
      seedling_site_name: '',
      seed_quantity: 50,
      target_seedling_count: 0
    },
    {
      id: 'PP002',
      plan_code: 'JZB2026-002',
      plan_name: '大叶生菜种源采购计划',
      plan_type: 'seed_breeding',
      crop_name: '大叶生菜',
      crop_variety: '生菜',
      greenhouse_name: '',
      area_name: '',
      planned_quantity: 30,
      actual_quantity: 30,
      planting_date: '2026-02-01',
      expected_harvest_date: '',
      actual_harvest_date: '',
      status: 'completed',
      priority: 'low',
      remarks: '',
      create_by: '王建国',
      create_time: '2026-02-01T09:00:00.000Z',
      update_time: '2026-04-18T11:20:00.000Z',
      responsible_person: '王建国',
      unit: 'kg',
      publish_date: '2026-01-25',
      batch_status: 'completed',
      plan_detail: '',
      plan_detail_file_name: '',
      planting_area: 0,
      planting_mode: '',
      supplier_name: '山东寿光种子基地',
      seedling_site_name: '',
      seed_quantity: 30,
      target_seedling_count: 0
    },
    {
      id: 'PP003',
      plan_code: 'JZB2026-003',
      plan_name: '水果黄瓜种源采购计划',
      plan_type: 'seed_breeding',
      crop_name: '水果黄瓜',
      crop_variety: '黄瓜',
      greenhouse_name: '',
      area_name: '',
      planned_quantity: 40,
      actual_quantity: 40,
      planting_date: '2026-02-15',
      expected_harvest_date: '',
      actual_harvest_date: '',
      status: 'completed',
      priority: 'medium',
      remarks: '',
      create_by: '李明辉',
      create_time: '2026-02-15T14:00:00.000Z',
      update_time: '2026-04-20T09:00:00.000Z',
      responsible_person: '李明辉',
      unit: 'kg',
      publish_date: '2026-02-10',
      batch_status: 'completed',
      plan_detail: '',
      plan_detail_file_name: '',
      planting_area: 0,
      planting_mode: '',
      supplier_name: '上海蔬菜种子公司',
      seedling_site_name: '',
      seed_quantity: 40,
      target_seedling_count: 0
    },
    {
      id: 'PP004',
      plan_code: 'JZB2026-004',
      plan_name: '紫长茄子种源采购计划',
      plan_type: 'seed_breeding',
      crop_name: '紫长茄子',
      crop_variety: '茄子',
      greenhouse_name: '',
      area_name: '',
      planned_quantity: 20,
      actual_quantity: 20,
      planting_date: '2026-03-01',
      expected_harvest_date: '',
      actual_harvest_date: '',
      status: 'completed',
      priority: 'high',
      remarks: '紧急采购',
      create_by: '张伟',
      create_time: '2026-03-01T08:30:00.000Z',
      update_time: '2026-04-15T16:00:00.000Z',
      responsible_person: '张伟',
      unit: 'kg',
      publish_date: '2026-02-25',
      batch_status: 'completed',
      plan_detail: '',
      plan_detail_file_name: '',
      planting_area: 0,
      planting_mode: '',
      supplier_name: '南京农科院种子站',
      seedling_site_name: '',
      seed_quantity: 20,
      target_seedling_count: 0
    },
    {
      id: 'PP005',
      plan_code: 'YMB2026-001',
      plan_name: '大叶空心菜扦插苗培育计划',
      plan_type: 'seedling',
      crop_name: '大叶空心菜',
      crop_variety: '空心菜',
      greenhouse_name: '育苗基地A区',
      area_name: '',
      planned_quantity: 100,
      actual_quantity: 100,
      planting_date: '2026-03-10',
      expected_harvest_date: '2026-03-25',
      actual_harvest_date: '',
      status: 'in_progress',
      priority: 'medium',
      remarks: '自繁扦插苗',
      create_by: '王建国',
      create_time: '2026-03-10T09:00:00.000Z',
      update_time: '2026-04-20T10:00:00.000Z',
      responsible_person: '王建国',
      unit: '株',
      publish_date: '2026-03-05',
      batch_status: 'in_progress',
      plan_detail: '',
      plan_detail_file_name: '',
      planting_area: 0,
      planting_mode: '',
      supplier_name: '',
      seedling_site_name: '育苗基地A区',
      seed_quantity: 0,
      target_seedling_count: 100
    },
    {
      id: 'PP006',
      plan_code: 'YMB2026-002',
      plan_name: '黑美人西瓜嫁接苗培育计划',
      plan_type: 'seedling',
      crop_name: '黑美人西瓜',
      crop_variety: '西瓜',
      greenhouse_name: '育苗基地B区',
      area_name: '',
      planned_quantity: 50,
      actual_quantity: 50,
      planting_date: '2026-03-15',
      expected_harvest_date: '2026-04-10',
      actual_harvest_date: '',
      status: 'in_progress',
      priority: 'high',
      remarks: '委托培育嫁接苗',
      create_by: '李明辉',
      create_time: '2026-03-15T14:00:00.000Z',
      update_time: '2026-04-18T16:00:00.000Z',
      responsible_person: '李明辉',
      unit: '株',
      publish_date: '2026-03-10',
      batch_status: 'in_progress',
      plan_detail: '',
      plan_detail_file_name: '',
      planting_area: 0,
      planting_mode: '',
      supplier_name: '',
      seedling_site_name: '育苗基地B区',
      seed_quantity: 0,
      target_seedling_count: 50
    },
    {
      id: 'PP007',
      plan_code: 'YMB2026-003',
      plan_name: '奶油生菜组培苗培育计划',
      plan_type: 'seedling',
      crop_name: '奶油生菜',
      crop_variety: '生菜',
      greenhouse_name: '组培中心',
      area_name: '',
      planned_quantity: 200,
      actual_quantity: 200,
      planting_date: '2026-03-20',
      expected_harvest_date: '2026-04-15',
      actual_harvest_date: '',
      status: 'in_progress',
      priority: 'medium',
      remarks: '省农业厅赠送组培苗',
      create_by: '张伟',
      create_time: '2026-03-20T10:00:00.000Z',
      update_time: '2026-04-19T09:00:00.000Z',
      responsible_person: '张伟',
      unit: '株',
      publish_date: '2026-03-15',
      batch_status: 'in_progress',
      plan_detail: '',
      plan_detail_file_name: '',
      planting_area: 0,
      planting_mode: '',
      supplier_name: '',
      seedling_site_name: '组培中心',
      seed_quantity: 0,
      target_seedling_count: 200
    },
    // 种植计划 (ZZB)
    {
      id: 'PP008',
      plan_code: 'ZZB2026-001',
      plan_name: 'A1区散叶生菜种植计划',
      plan_type: 'planting',
      crop_name: '散叶生菜',
      crop_variety: '散叶生菜',
      greenhouse_name: 'A1区',
      area_name: 'A1区',
      planned_quantity: 500,
      actual_quantity: 0,
      planting_date: '2026-04-01',
      expected_harvest_date: '2026-05-15',
      actual_harvest_date: '',
      status: 'planning',
      priority: 'high',
      remarks: '春季种植计划',
      create_by: '王建国',
      create_time: '2026-03-25T10:00:00.000Z',
      update_time: '2026-03-25T10:00:00.000Z',
      responsible_person: '王建国',
      unit: 'kg',
      publish_date: '2026-03-28',
      batch_status: 'published',
      plan_detail: '',
      plan_detail_file_name: '',
      planting_area: 1000,
      planting_mode: '水培',
      supplier_name: '',
      seedling_site_name: '',
      seed_quantity: 0,
      target_seedling_count: 0
    },
    {
      id: 'PP009',
      plan_code: 'ZZB2026-002',
      plan_name: 'B2区黑美人西瓜种植计划',
      plan_type: 'planting',
      crop_name: '黑美人西瓜',
      crop_variety: '黑美人',
      greenhouse_name: 'B2区',
      area_name: 'B2区',
      planned_quantity: 2000,
      actual_quantity: 0,
      planting_date: '2026-03-20',
      expected_harvest_date: '2026-06-15',
      actual_harvest_date: '',
      status: 'in_progress',
      priority: 'medium',
      remarks: '春季大棚西瓜',
      create_by: '李明辉',
      create_time: '2026-03-15T09:00:00.000Z',
      update_time: '2026-03-20T08:00:00.000Z',
      responsible_person: '李明辉',
      unit: 'kg',
      publish_date: '2026-03-18',
      batch_status: 'in_progress',
      plan_detail: '',
      plan_detail_file_name: '',
      planting_area: 2000,
      planting_mode: '大棚种植',
      supplier_name: '',
      seedling_site_name: '',
      seed_quantity: 0,
      target_seedling_count: 0
    },
    {
      id: 'PP010',
      plan_code: 'ZZB2026-003',
      plan_name: 'C3区圆叶菠菜种植计划',
      plan_type: 'planting',
      crop_name: '圆叶菠菜',
      crop_variety: '圆叶菠菜',
      greenhouse_name: 'C3区',
      area_name: 'C3区',
      planned_quantity: 800,
      actual_quantity: 0,
      planting_date: '2026-04-10',
      expected_harvest_date: '2026-05-20',
      actual_harvest_date: '',
      status: 'planning',
      priority: 'low',
      remarks: '轮作计划',
      create_by: '张伟',
      create_time: '2026-04-05T14:00:00.000Z',
      update_time: '2026-04-05T14:00:00.000Z',
      responsible_person: '张伟',
      unit: 'kg',
      publish_date: '2026-04-08',
      batch_status: 'draft',
      plan_detail: '',
      plan_detail_file_name: '',
      planting_area: 800,
      planting_mode: '露地种植',
      supplier_name: '',
      seedling_site_name: '',
      seed_quantity: 0,
      target_seedling_count: 0
    }
  ];

  for (const plan of productionPlans) {
    db.run(`
      INSERT OR REPLACE INTO production_plans
      (id, plan_code, plan_name, plan_type, crop_name, crop_variety,
       greenhouse_name, area_name, planned_quantity, actual_quantity,
       planting_date, expected_harvest_date, actual_harvest_date,
       status, priority, remarks, create_by, create_time, update_time,
       responsible_person, unit, publish_date, batch_status,
       plan_detail, plan_detail_file_name, planting_area, planting_mode,
       supplier_name, seedling_site_name, seed_quantity, target_seedling_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      plan.id, plan.plan_code, plan.plan_name, plan.plan_type, plan.crop_name, plan.crop_variety,
      plan.greenhouse_name || '', plan.area_name || '', plan.planned_quantity || 0, plan.actual_quantity || 0,
      plan.planting_date || '', plan.expected_harvest_date || '', plan.actual_harvest_date || '',
      plan.status || 'planning', plan.priority || 'medium', plan.remarks || '', plan.create_by || '', plan.create_time || '', plan.update_time || '',
      plan.responsible_person || '', plan.unit || '', plan.publish_date || '', plan.batch_status || 'draft',
      plan.plan_detail || '', plan.plan_detail_file_name || '', plan.planting_area || 0, plan.planting_mode || '',
      plan.supplier_name || '', plan.seedling_site_name || '', plan.seed_quantity || 0, plan.target_seedling_count || 0
    ]);
  }

  console.log(`已导入 ${productionPlans.length} 条生产计划数据`);
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
    // 2026年1月
    {
      id: 'HV001',
      harvest_code: 'CS202601001',
      source_id: 'PL001',
      source_name: 'ZZ202601001',
      crop_name: '番茄',
      crop_variety: '樱桃番茄',
      greenhouse_name: '1号大棚',
      harvest_date: '2026-01-15',
      harvest_quantity: 120,
      unit: 'kg',
      unit_price: 6,
      total_amount: 720,
      quality_grade: 'A',
      buyer_id: 'PUR001',
      buyer_name: '张三',
      sales_channel: '批发',
      status: 'completed',
      create_by: '系统',
      create_time: '2026-01-15T10:00:00.000Z',
      update_time: '2026-01-15T10:00:00.000Z'
    },
    {
      id: 'HV002',
      harvest_code: 'CS202601002',
      source_id: 'PL002',
      source_name: 'ZZ202601002',
      crop_name: '黄瓜',
      crop_variety: '水果黄瓜',
      greenhouse_name: '2号大棚',
      harvest_date: '2026-01-20',
      harvest_quantity: 85,
      unit: 'kg',
      unit_price: 5,
      total_amount: 425,
      quality_grade: 'A',
      buyer_id: 'PUR002',
      buyer_name: '李四',
      sales_channel: '批发',
      status: 'completed',
      create_by: '系统',
      create_time: '2026-01-20T10:00:00.000Z',
      update_time: '2026-01-20T10:00:00.000Z'
    },
    // 2026年2月
    {
      id: 'HV003',
      harvest_code: 'CS202602001',
      source_id: 'PL001',
      source_name: 'ZZ202601001',
      crop_name: '番茄',
      crop_variety: '樱桃番茄',
      greenhouse_name: '1号大棚',
      harvest_date: '2026-02-10',
      harvest_quantity: 150,
      unit: 'kg',
      unit_price: 6.5,
      total_amount: 975,
      quality_grade: 'A',
      buyer_id: 'PUR001',
      buyer_name: '张三',
      sales_channel: '批发',
      status: 'completed',
      create_by: '系统',
      create_time: '2026-02-10T10:00:00.000Z',
      update_time: '2026-02-10T10:00:00.000Z'
    },
    {
      id: 'HV004',
      harvest_code: 'CS202602002',
      source_id: 'PL003',
      source_name: 'ZZ202602001',
      crop_name: '草莓',
      crop_variety: '红颜草莓',
      greenhouse_name: '3号大棚',
      harvest_date: '2026-02-18',
      harvest_quantity: 60,
      unit: 'kg',
      unit_price: 25,
      total_amount: 1500,
      quality_grade: 'A',
      buyer_id: 'PUR003',
      buyer_name: '王五',
      sales_channel: '采摘',
      status: 'completed',
      create_by: '系统',
      create_time: '2026-02-18T10:00:00.000Z',
      update_time: '2026-02-18T10:00:00.000Z'
    },
    // 2026年3月
    {
      id: 'HV005',
      harvest_code: 'CS202603001',
      source_id: 'PL002',
      source_name: 'ZZ202601002',
      crop_name: '黄瓜',
      crop_variety: '水果黄瓜',
      greenhouse_name: '2号大棚',
      harvest_date: '2026-03-05',
      harvest_quantity: 95,
      unit: 'kg',
      unit_price: 5.5,
      total_amount: 522.5,
      quality_grade: 'A',
      buyer_id: 'PUR002',
      buyer_name: '李四',
      sales_channel: '批发',
      status: 'completed',
      create_by: '系统',
      create_time: '2026-03-05T10:00:00.000Z',
      update_time: '2026-03-05T10:00:00.000Z'
    },
    {
      id: 'HV006',
      harvest_code: 'CS202603002',
      source_id: 'PL004',
      source_name: 'ZZ202603001',
      crop_name: '生菜',
      crop_variety: '奶油生菜',
      greenhouse_name: '1号大棚',
      harvest_date: '2026-03-12',
      harvest_quantity: 200,
      unit: 'kg',
      unit_price: 4,
      total_amount: 800,
      quality_grade: 'A',
      buyer_id: 'PUR001',
      buyer_name: '张三',
      sales_channel: '批发',
      status: 'completed',
      create_by: '系统',
      create_time: '2026-03-12T10:00:00.000Z',
      update_time: '2026-03-12T10:00:00.000Z'
    },
    {
      id: 'HV007',
      harvest_code: 'CS202603003',
      source_id: 'PL001',
      source_name: 'ZZ202601001',
      crop_name: '番茄',
      crop_variety: '樱桃番茄',
      greenhouse_name: '1号大棚',
      harvest_date: '2026-03-25',
      harvest_quantity: 180,
      unit: 'kg',
      unit_price: 6,
      total_amount: 1080,
      quality_grade: 'A',
      buyer_id: 'PUR001',
      buyer_name: '张三',
      sales_channel: '批发',
      status: 'completed',
      create_by: '系统',
      create_time: '2026-03-25T10:00:00.000Z',
      update_time: '2026-03-25T10:00:00.000Z'
    },
    // 2026年4月
    {
      id: 'HV008',
      harvest_code: 'CS202604001',
      source_id: 'PL005',
      source_name: 'ZZ202604001',
      crop_name: '红生菜',
      crop_variety: '红生菜',
      greenhouse_name: '1号大棚',
      harvest_date: '2026-04-08',
      harvest_quantity: 75,
      unit: 'kg',
      unit_price: 7,
      total_amount: 525,
      quality_grade: 'A',
      buyer_id: 'PUR001',
      buyer_name: '张三',
      sales_channel: '批发',
      status: 'completed',
      create_by: '系统',
      create_time: '2026-04-08T10:00:00.000Z',
      update_time: '2026-04-08T10:00:00.000Z'
    },
    {
      id: 'HV009',
      harvest_code: 'CS202604002',
      source_id: 'PL002',
      source_name: 'ZZ202601002',
      crop_name: '黄瓜',
      crop_variety: '水果黄瓜',
      greenhouse_name: '2号大棚',
      harvest_date: '2026-04-15',
      harvest_quantity: 110,
      unit: 'kg',
      unit_price: 5,
      total_amount: 550,
      quality_grade: 'A',
      buyer_id: 'PUR002',
      buyer_name: '李四',
      sales_channel: '批发',
      status: 'completed',
      create_by: '系统',
      create_time: '2026-04-15T10:00:00.000Z',
      update_time: '2026-04-15T10:00:00.000Z'
    },
    {
      id: 'HV010',
      harvest_code: 'CS202604003',
      source_id: 'PL003',
      source_name: 'ZZ202602001',
      crop_name: '草莓',
      crop_variety: '红颜草莓',
      greenhouse_name: '3号大棚',
      harvest_date: '2026-04-22',
      harvest_quantity: 45,
      unit: 'kg',
      unit_price: 28,
      total_amount: 1260,
      quality_grade: 'A',
      buyer_id: 'PUR003',
      buyer_name: '王五',
      sales_channel: '采摘',
      status: 'completed',
      create_by: '系统',
      create_time: '2026-04-22T10:00:00.000Z',
      update_time: '2026-04-22T10:00:00.000Z'
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
 * 注意：TK001, TK002 已从种子数据中移除，需要删除请直接操作数据库
 */
function seedFarmTasks() {
  const db = getDatabase();

  // 已移除 TK001, TK002 种子数据
  console.log('seedFarmTasks: 无需导入农事任务（已清空）');
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
      feedback_users: '["令狐冲"]',
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
      feedback_users: '["任盈盈","向问天"]',
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
      feedback_users: '["乔峰"]',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    }
  ];

  for (const ins of inspections) {
    db.run(`
      INSERT OR REPLACE INTO inspections
      (id, record_code, inspection_type, inspector_id, inspector_name, greenhouse_name,
       check_date, check_time, check_result, issue_severity, issue_text, images, status, feedback_users, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ins.id, ins.record_code, ins.inspection_type, ins.inspector_id, ins.inspector_name,
      ins.greenhouse_name, ins.check_date, ins.check_time, ins.check_result, ins.issue_severity,
      ins.issue_text, ins.images, ins.status, ins.feedback_users, ins.create_time, ins.update_time
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
 * 导入作物订单
 * 注意：如果表中已有数据（用户创建的订单），则跳过导入以保留用户数据
 */
function seedCropOrders() {
  const db = getDatabase();

  // 检查是否已有数据，如果有则跳过（保留用户创建的订单）
  const existingCount = db.exec('SELECT COUNT(*) as count FROM crop_orders');
  const count = existingCount[0]?.values[0]?.[0] || 0;
  if (count > 0) {
    console.log(`[seedData] crop_orders 表已有 ${count} 条数据，跳过种子数据导入`);
    return;
  }

  const orders = [
    {
      id: 'ORD001',
      order_code: 'DD202605010001',
      order_name: '番茄订单',
      order_type: 'production',
      crop_category: '蔬菜类',
      crop_name: '番茄',
      crop_variety: '红果番茄',
      planned_quantity: 1000,
      actual_quantity: 0,
      unit: 'kg',
      unit_price: 4.0,
      total_amount: 4000,
      customer_name: '永辉超市',
      customer_contact: '13800138000',
      delivery_address: '福州市鼓楼区',
      order_date: '2026-05-01',
      expected_harvest_date: '2026-05-15',
      actual_delivery_date: null,
      status: 'planned',
      remarks: '第一批番茄订单',
      create_by: '陆启闯',
      create_time: '2026-05-01T10:00:00.000Z',
      update_time: '2026-05-01T10:00:00.000Z'
    },
    {
      id: 'ORD002',
      order_code: 'DD202605020001',
      order_name: '黄瓜订单',
      order_type: 'production',
      crop_category: '蔬菜类',
      crop_name: '黄瓜',
      crop_variety: '水果黄瓜',
      planned_quantity: 800,
      actual_quantity: 500,
      unit: 'kg',
      unit_price: 3.5,
      total_amount: 2800,
      customer_name: '沃尔玛',
      customer_contact: '13900139000',
      delivery_address: '厦门市思明区',
      order_date: '2026-05-02',
      expected_harvest_date: '2026-05-16',
      actual_delivery_date: null,
      status: 'in_progress',
      remarks: '黄瓜订单',
      create_by: '陆启闯',
      create_time: '2026-05-02T10:00:00.000Z',
      update_time: '2026-05-02T10:00:00.000Z'
    },
    {
      id: 'ORD003',
      order_code: 'DD202605030001',
      order_name: '生菜订单',
      order_type: 'production',
      crop_category: '蔬菜类',
      crop_name: '生菜',
      crop_variety: '大叶生菜',
      planned_quantity: 500,
      actual_quantity: 0,
      unit: 'kg',
      unit_price: 5.0,
      total_amount: 2500,
      customer_name: '盒马鲜生',
      customer_contact: '13700137000',
      delivery_address: '上海市浦东新区',
      order_date: '2026-05-03',
      expected_harvest_date: '2026-05-17',
      actual_delivery_date: null,
      status: 'planned',
      remarks: '生菜订单',
      create_by: '王建国',
      create_time: '2026-05-03T10:00:00.000Z',
      update_time: '2026-05-03T10:00:00.000Z'
    },
    {
      id: 'ORD004',
      order_code: 'DD202605040001',
      order_name: '草莓种苗订单',
      order_type: 'seedling',
      crop_category: '水果类',
      crop_name: '草莓',
      crop_variety: '红颜草莓',
      planned_quantity: 200,
      actual_quantity: 150,
      unit: 'kg',
      unit_price: 25.0,
      total_amount: 5000,
      customer_name: '水果专营店',
      customer_contact: '13600136000',
      delivery_address: '杭州市西湖区',
      order_date: '2026-05-04',
      expected_harvest_date: '2026-05-20',
      actual_delivery_date: null,
      status: 'in_progress',
      remarks: '草莓种苗订单',
      create_by: '王建国',
      create_time: '2026-05-04T10:00:00.000Z',
      update_time: '2026-05-04T10:00:00.000Z'
    },
    {
      id: 'ORD005',
      order_code: 'DD202605050001',
      order_name: '辣椒订单',
      order_type: 'production',
      crop_category: '蔬菜类',
      crop_name: '辣椒',
      crop_variety: '朝天椒',
      planned_quantity: 300,
      actual_quantity: 300,
      unit: 'kg',
      unit_price: 8.0,
      total_amount: 2400,
      customer_name: '火锅连锁店',
      customer_contact: '13500135000',
      delivery_address: '成都市锦江区',
      order_date: '2026-05-05',
      expected_harvest_date: '2026-05-18',
      actual_delivery_date: '2026-05-18',
      status: 'completed',
      remarks: '辣椒订单已完成',
      create_by: '李明辉',
      create_time: '2026-05-05T10:00:00.000Z',
      update_time: '2026-05-08T10:00:00.000Z'
    }
  ];

  for (const order of orders) {
    db.run(`
      INSERT INTO crop_orders
      (id, order_code, order_name, order_type, crop_category, crop_name, crop_variety,
       planned_quantity, actual_quantity, unit, unit_price, total_amount,
       customer_name, customer_contact, delivery_address, order_date,
       expected_harvest_date, actual_delivery_date, status, remarks,
       create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      order.id, order.order_code, order.order_name, order.order_type,
      order.crop_category, order.crop_name, order.crop_variety,
      order.planned_quantity, order.actual_quantity, order.unit,
      order.unit_price, order.total_amount, order.customer_name,
      order.customer_contact, order.delivery_address, order.order_date,
      order.expected_harvest_date, order.actual_delivery_date,
      order.status, order.remarks, order.create_by,
      order.create_time, order.update_time
    ]);
  }

  console.log(`已导入 ${orders.length} 条作物订单记录`);
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
 * 导入温室/基地数据
 * 支持园区导览功能
 */
function seedGreenhouses() {
  const db = getDatabase();

  // 为旧数据库添加可能缺失的列（如果列已存在则忽略错误）
  const columnsToAdd = [
    'company_id TEXT DEFAULT ""',
    'company_name TEXT DEFAULT ""',
    'lng REAL DEFAULT 0',
    'lat REAL DEFAULT 0',
    'crop TEXT DEFAULT ""',
    'growth_day INTEGER DEFAULT 0',
    'manager TEXT DEFAULT ""',
    'phone TEXT DEFAULT ""',
    'soil_type TEXT DEFAULT ""',
    'ph REAL DEFAULT 0',
    'intro TEXT DEFAULT ""',
    'greenhouse_count INTEGER DEFAULT 0',
    'field_area REAL DEFAULT 0',
    'created_at TEXT',
    'updated_at TEXT'
  ];

  for (const colDef of columnsToAdd) {
    const colName = colDef.split(' ')[0];
    try {
      db.run(`ALTER TABLE greenhouses ADD COLUMN ${colDef}`);
      console.log(`已添加 greenhouses 表缺失的列: ${colName}`);
    } catch (e) {
      // 列可能已存在，忽略错误
    }
  }

  const greenhouses = [
    // 宁波帮帮忙公司
    {
      id: 'GH001', oid: 'GH001', code: 'NB-SH-001', name: '上海松江基地',
      greenhouse_type: '玻璃温室', area: 300, location: '上海',
      base_oid: 'BASE001', base_name: '上海松江基地',
      company_id: 'C001', company_name: '宁波帮帮忙公司',
      lng: 121.2234, lat: 31.0342, crop: '水稻', growth_day: 30,
      manager: '郭靖', phone: '13800138002', soil_type: '沙壤土', ph: 6.8,
      intro: '总种植面积300亩，包含玻璃温室2个，连栋薄膜温室5个，日光拱棚10个，大田200亩。',
      greenhouse_count: 17, field_area: 200, status: 'active',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'GH002', oid: 'GH002', code: 'NB-SH-002', name: '上海崇明基地',
      greenhouse_type: '玻璃温室', area: 800, location: '上海',
      base_oid: 'BASE002', base_name: '上海崇明基地',
      company_id: 'C001', company_name: '宁波帮帮忙公司',
      lng: 121.24416, lat: 31.73610, crop: '小麦', growth_day: 0,
      manager: '萧峰', phone: '13800138003', soil_type: '黏土', ph: 6.2,
      intro: '总种植面积800亩，包含玻璃温室3个，连栋薄膜温室8个，日光拱棚15个，大田650亩。',
      greenhouse_count: 26, field_area: 650, status: 'active',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'GH003', oid: 'GH003', code: 'NB-SH-003', name: '上海嘉定基地',
      greenhouse_type: '玻璃温室', area: 350, location: '上海',
      base_oid: 'BASE003', base_name: '上海嘉定基地',
      company_id: 'C001', company_name: '宁波帮帮忙公司',
      lng: 121.2654, lat: 31.3754, crop: '蔬菜', growth_day: 25,
      manager: '杨过', phone: '13800138007', soil_type: '沙土', ph: 7.0,
      intro: '总种植面积350亩，包含玻璃温室4个，连栋薄膜温室6个，日光拱棚8个，大田200亩。',
      greenhouse_count: 18, field_area: 200, status: 'active',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'GH004', oid: 'GH004', code: 'NB-SH-004', name: '上海奉贤基地',
      greenhouse_type: '玻璃温室', area: 550, location: '上海',
      base_oid: 'BASE004', base_name: '上海奉贤基地',
      company_id: 'C001', company_name: '宁波帮帮忙公司',
      lng: 121.4745, lat: 30.9123, crop: '玉米', growth_day: 50,
      manager: '张无忌', phone: '13800138012', soil_type: '黏土', ph: 6.8,
      intro: '总种植面积550亩，包含玻璃温室2个，连栋薄膜温室4个，日光拱棚12个，大田450亩。',
      greenhouse_count: 18, field_area: 450, status: 'active',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    // 成都帮帮您公司
    {
      id: 'GH005', oid: 'GH005', code: 'CD-XA-001', name: '西安雁塔基地',
      greenhouse_type: '日光温室', area: 500, location: '西安',
      base_oid: 'BASE005', base_name: '西安雁塔基地',
      company_id: 'C002', company_name: '成都帮帮您公司',
      lng: 108.9470, lat: 34.2194, crop: '番茄', growth_day: 45,
      manager: '令狐冲', phone: '13800138001', soil_type: '壤土', ph: 6.5,
      intro: '总种植面积500亩，包含玻璃温室3个，连栋薄膜温室7个，日光拱棚12个，大田380亩。',
      greenhouse_count: 22, field_area: 380, status: 'active',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'GH006', oid: 'GH006', code: 'CD-XA-002', name: '西安高新基地',
      greenhouse_type: '日光温室', area: 200, location: '西安',
      base_oid: 'BASE006', base_name: '西安高新基地',
      company_id: 'C002', company_name: '成都帮帮您公司',
      lng: 108.8789, lat: 34.2181, crop: '草莓', growth_day: 55,
      manager: '狄云', phone: '13800138006', soil_type: '营养土', ph: 6.4,
      intro: '总种植面积200亩，包含玻璃温室5个，连栋薄膜温室3个，日光拱棚5个，大田100亩。',
      greenhouse_count: 13, field_area: 100, status: 'active',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'GH007', oid: 'GH007', code: 'CD-NB-001', name: '宁波北仑基地',
      greenhouse_type: '塑料大棚', area: 600, location: '宁波',
      base_oid: 'BASE007', base_name: '宁波北仑基地',
      company_id: 'C002', company_name: '成都帮帮您公司',
      lng: 121.9701, lat: 29.8947, crop: '茶叶', growth_day: 60,
      manager: '石破天', phone: '13800138004', soil_type: '壤土', ph: 6.6,
      intro: '总种植面积600亩，包含玻璃温室1个，连栋薄膜温室4个，日光拱棚8个，大田550亩。',
      greenhouse_count: 13, field_area: 550, status: 'active',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'GH008', oid: 'GH008', code: 'CD-NB-002', name: '宁波镇海基地',
      greenhouse_type: '塑料大棚', area: 280, location: '宁波',
      base_oid: 'BASE008', base_name: '宁波镇海基地',
      company_id: 'C002', company_name: '成都帮帮您公司',
      lng: 121.7532, lat: 29.9543, crop: '水稻', growth_day: 40,
      manager: '陈家洛', phone: '13800138008', soil_type: '壤土', ph: 6.7,
      intro: '总种植面积280亩，包含玻璃温室2个，连栋薄膜温室3个，日光拱棚6个，大田220亩。',
      greenhouse_count: 11, field_area: 220, status: 'active',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'GH009', oid: 'GH009', code: 'CD-NB-003', name: '宁波慈溪基地',
      greenhouse_type: '日光温室', area: 420, location: '宁波',
      base_oid: 'BASE009', base_name: '宁波慈溪基地',
      company_id: 'C002', company_name: '成都帮帮您公司',
      lng: 121.2678, lat: 30.1543, crop: '葡萄', growth_day: 75,
      manager: '袁承志', phone: '13800138010', soil_type: '壤土', ph: 6.5,
      intro: '总种植面积420亩，包含玻璃温室3个，连栋薄膜温室5个，日光拱棚10个，大田320亩。',
      greenhouse_count: 18, field_area: 320, status: 'active',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    }
  ];

  for (const gh of greenhouses) {
    db.run(`
      INSERT OR REPLACE INTO greenhouses
      (id, oid, code, name, greenhouse_type, area, location, base_oid, base_name,
       company_id, company_name, lng, lat, crop, growth_day, manager, phone,
       soil_type, ph, intro, greenhouse_count, field_area, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      gh.id, gh.oid, gh.code, gh.name, gh.greenhouse_type, gh.area, gh.location,
      gh.base_oid, gh.base_name, gh.company_id, gh.company_name,
      gh.lng, gh.lat, gh.crop, gh.growth_day, gh.manager, gh.phone,
      gh.soil_type, gh.ph, gh.intro, gh.greenhouse_count, gh.field_area,
      gh.status, new Date().toISOString(), new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${greenhouses.length} 条温室/基地数据`);
}

/**
 * 导入区域/区块数据
 * 为每个基地创建默认的区域类型
 */
function seedZones() {
  const db = getDatabase();

  // 区域类型映射
  const zoneTypes = [
    { code: 'greenhouse', name: '温室大棚' },
    { code: 'plastic_house', name: '塑料大棚' },
    { code: 'glass_house', name: '玻璃温室' },
    { code: 'solar_greenhouse', name: '日光温室' },
    { code: 'open_field', name: '露天种植区' },
  ];

  // 为每个基地创建区域
  const zones = [
    // 上海松江基地
    { id: 'ZN001', oid: 'ZN001', zone_code: 'ZN001', zone_name: '玻璃温室A区', greenhouse_oid: 'GH001', greenhouse_name: '上海松江基地', zone_type: 'glass_house', area: 50, sort_order: 1 },
    { id: 'ZN002', oid: 'ZN002', zone_code: 'ZN002', zone_name: '塑料大棚B区', greenhouse_oid: 'GH001', greenhouse_name: '上海松江基地', zone_type: 'plastic_house', area: 80, sort_order: 2 },
    { id: 'ZN003', oid: 'ZN003', zone_code: 'ZN003', zone_name: '日光温室C区', greenhouse_oid: 'GH001', greenhouse_name: '上海松江基地', zone_type: 'solar_greenhouse', area: 60, sort_order: 3 },
    { id: 'ZN004', oid: 'ZN004', zone_code: 'ZN004', zone_name: '露天种植区', greenhouse_oid: 'GH001', greenhouse_name: '上海松江基地', zone_type: 'open_field', area: 110, sort_order: 4 },

    // 上海崇明基地
    { id: 'ZN005', oid: 'ZN005', zone_code: 'ZN005', zone_name: '玻璃温室1区', greenhouse_oid: 'GH002', greenhouse_name: '上海崇明基地', zone_type: 'glass_house', area: 100, sort_order: 1 },
    { id: 'ZN006', oid: 'ZN006', zone_code: 'ZN006', zone_name: '塑料大棚2区', greenhouse_oid: 'GH002', greenhouse_name: '上海崇明基地', zone_type: 'plastic_house', area: 150, sort_order: 2 },
    { id: 'ZN007', oid: 'ZN007', zone_code: 'ZN007', zone_name: '日光温室3区', greenhouse_oid: 'GH002', greenhouse_name: '上海崇明基地', zone_type: 'solar_greenhouse', area: 100, sort_order: 3 },

    // 上海嘉定基地
    { id: 'ZN008', oid: 'ZN008', zone_code: 'ZN008', zone_name: '玻璃温室A区', greenhouse_oid: 'GH003', greenhouse_name: '上海嘉定基地', zone_type: 'glass_house', area: 80, sort_order: 1 },
    { id: 'ZN009', oid: 'ZN009', zone_code: 'ZN009', zone_name: '塑料大棚B区', greenhouse_oid: 'GH003', greenhouse_name: '上海嘉定基地', zone_type: 'plastic_house', area: 100, sort_order: 2 },

    // 上海奉贤基地
    { id: 'ZN010', oid: 'ZN010', zone_code: 'ZN010', zone_name: '日光温室A区', greenhouse_oid: 'GH004', greenhouse_name: '上海奉贤基地', zone_type: 'solar_greenhouse', area: 120, sort_order: 1 },
    { id: 'ZN011', oid: 'ZN011', zone_code: 'ZN011', zone_name: '露天种植区', greenhouse_oid: 'GH004', greenhouse_name: '上海奉贤基地', zone_type: 'open_field', area: 200, sort_order: 2 },

    // 西安雁塔基地
    { id: 'ZN012', oid: 'ZN012', zone_code: 'ZN012', zone_name: '玻璃温室A区', greenhouse_oid: 'GH005', greenhouse_name: '西安雁塔基地', zone_type: 'glass_house', area: 100, sort_order: 1 },
    { id: 'ZN013', oid: 'ZN013', zone_code: 'ZN013', zone_name: '日光温室B区', greenhouse_oid: 'GH005', greenhouse_name: '西安雁塔基地', zone_type: 'solar_greenhouse', area: 150, sort_order: 2 },

    // 西安高新基地
    { id: 'ZN014', oid: 'ZN014', zone_code: 'ZN014', zone_name: '塑料大棚A区', greenhouse_oid: 'GH006', greenhouse_name: '西安高新基地', zone_type: 'plastic_house', area: 80, sort_order: 1 },
    { id: 'ZN015', oid: 'ZN015', zone_code: 'ZN015', zone_name: '温室大棚B区', greenhouse_oid: 'GH006', greenhouse_name: '西安高新基地', zone_type: 'greenhouse', area: 60, sort_order: 2 },

    // 宁波北仑基地
    { id: 'ZN016', oid: 'ZN016', zone_code: 'ZN016', zone_name: '露天种植区', greenhouse_oid: 'GH007', greenhouse_name: '宁波北仑基地', zone_type: 'open_field', area: 400, sort_order: 1 },
    { id: 'ZN017', oid: 'ZN017', zone_code: 'ZN017', zone_name: '日光温室', greenhouse_oid: 'GH007', greenhouse_name: '宁波北仑基地', zone_type: 'solar_greenhouse', area: 100, sort_order: 2 },

    // 宁波镇海基地
    { id: 'ZN018', oid: 'ZN018', zone_code: 'ZN018', zone_name: '玻璃温室', greenhouse_oid: 'GH008', greenhouse_name: '宁波镇海基地', zone_type: 'glass_house', area: 80, sort_order: 1 },
    { id: 'ZN019', oid: 'ZN019', zone_code: 'ZN019', zone_name: '露天种植区', greenhouse_oid: 'GH008', greenhouse_name: '宁波镇海基地', zone_type: 'open_field', area: 120, sort_order: 2 },

    // 宁波慈溪基地
    { id: 'ZN020', oid: 'ZN020', zone_code: 'ZN020', zone_name: '日光温室A区', greenhouse_oid: 'GH009', greenhouse_name: '宁波慈溪基地', zone_type: 'solar_greenhouse', area: 100, sort_order: 1 },
    { id: 'ZN021', oid: 'ZN021', zone_code: 'ZN021', zone_name: '塑料大棚B区', greenhouse_oid: 'GH009', greenhouse_name: '宁波慈溪基地', zone_type: 'plastic_house', area: 120, sort_order: 2 },
  ];

  for (const zone of zones) {
    db.run(`
      INSERT OR REPLACE INTO zones
      (id, oid, zone_code, zone_name, greenhouse_oid, greenhouse_name, zone_type, area, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [
      zone.id, zone.oid, zone.zone_code, zone.zone_name, zone.greenhouse_oid, zone.greenhouse_name,
      zone.zone_type, zone.area, zone.sort_order, new Date().toISOString(), new Date().toISOString()
    ]);
  }

  console.log(`已导入 ${zones.length} 条区域/区块数据`);
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

    // 种植模式 - 与seedBasicData.ts保持一致
    { id: 'PM001', category: 'planting_mode', code: 'direct_seeding', name: '直播', sort_number: 1 },
    { id: 'PM002', category: 'planting_mode', code: 'transplanting', name: '移栽', sort_number: 2 },
    { id: 'PM003', category: 'planting_mode', code: 'grafting', name: '嫁接', sort_number: 3 },
    { id: 'PM004', category: 'planting_mode', code: 'tissue_culture', name: '组培', sort_number: 4 },
    { id: 'PM005', category: 'planting_mode', code: 'greenhouse', name: '温室种植', sort_number: 5 },
    { id: 'PM006', category: 'planting_mode', code: 'open_field', name: '露天种植', sort_number: 6 },
    { id: 'PM007', category: 'planting_mode', code: 'hydroponic', name: '水培', sort_number: 7 },
    { id: 'PM008', category: 'planting_mode', code: 'substrate', name: '基质栽培', sort_number: 8 },
    { id: 'PM009', category: 'planting_mode', code: 'greenhouse_planting', name: '大棚种植', sort_number: 9 },
    { id: 'PM010', category: 'planting_mode', code: 'open_field_planting', name: '露地种植', sort_number: 10 },
    { id: 'PM011', category: 'planting_mode', code: 'coconut_coir', name: '椰糠种植', sort_number: 11 },
    { id: 'PM012', category: 'planting_mode', code: 'hydroponic_seedling', name: '水培育苗', sort_number: 12 },
    { id: 'PM013', category: 'planting_mode', code: 'soil_seedling', name: '土壤育苗', sort_number: 13 },
    { id: 'PM014', category: 'planting_mode', code: 'soil_planting', name: '土壤种植', sort_number: 14 },
    { id: 'PM015', category: 'planting_mode', code: 'other', name: '其他', sort_number: 15 },

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
    { id: 'dt-033', category: 'supplier_attribute', code: 'personal', name: '个人', sort_number: 4 },
    { id: 'dt-034', category: 'supplier_attribute', code: 'online_platform', name: '网络平台', sort_number: 5 },
    { id: 'dt-035', category: 'supplier_attribute', code: 'agent', name: '代理商', sort_number: 6 },

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

    // 反馈人员（金庸武侠人物名，用于巡查记录反馈）
    { id: 'dt-fb-001', category: 'feedback_personnel', code: 'guojing', name: '郭靖', sort_number: 1 },
    { id: 'dt-fb-002', category: 'feedback_personnel', code: 'huangrong', name: '黄蓉', sort_number: 2 },
    { id: 'dt-fb-003', category: 'feedback_personnel', code: 'yangguo', name: '杨过', sort_number: 3 },
    { id: 'dt-fb-004', category: 'feedback_personnel', code: 'xiaolongnv', name: '小龙女', sort_number: 4 },
    { id: 'dt-fb-005', category: 'feedback_personnel', code: 'linghuchong', name: '令狐冲', sort_number: 5 },
    { id: 'dt-fb-006', category: 'feedback_personnel', code: 'renyingying', name: '任盈盈', sort_number: 6 },
    { id: 'dt-fb-007', category: 'feedback_personnel', code: 'zhangwuji', name: '张无忌', sort_number: 7 },
    { id: 'dt-fb-008', category: 'feedback_personnel', code: 'zhaomin', name: '赵敏', sort_number: 8 },
    { id: 'dt-fb-009', category: 'feedback_personnel', code: 'qiaofeng', name: '乔峰', sort_number: 9 },
    { id: 'dt-fb-010', category: 'feedback_personnel', code: 'duanyu', name: '段誉', sort_number: 10 },
    { id: 'dt-fb-011', category: 'feedback_personnel', code: 'xuzhu', name: '虚竹', sort_number: 11 },
    { id: 'dt-fb-012', category: 'feedback_personnel', code: 'wangyuyan', name: '王语嫣', sort_number: 12 },
    { id: 'dt-fb-013', category: 'feedback_personnel', code: 'weixiaobao', name: '韦小宝', sort_number: 13 },
    { id: 'dt-fb-014', category: 'feedback_personnel', code: 'zhoubotong', name: '周伯通', sort_number: 14 },
    { id: 'dt-fb-015', category: 'feedback_personnel', code: 'hongqigong', name: '洪七公', sort_number: 15 },
    { id: 'dt-fb-016', category: 'feedback_personnel', code: 'xiangwentian', name: '向问天', sort_number: 16 },
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
 * 导入系统配置数据
 */
function seedSystemConfigs() {
  const db = getDatabase();

  const configs = [
    // 农事任务配置
    { id: 'cfg-001', config_key: 'task_accept_warning_hours', config_value: '12', config_type: 'number', category: 'task', description: '任务接受预警时间（小时）' },
    { id: 'cfg-002', config_key: 'task_accept_critical_hours', config_value: '24', config_type: 'number', category: 'task', description: '任务接受危急时间（小时）' },
    { id: 'cfg-003', config_key: 'task_execution_warning_hours', config_value: '24', config_type: 'number', category: 'task', description: '任务执行预警时间（小时）' },
    { id: 'cfg-004', config_key: 'task_execution_critical_hours', config_value: '48', config_type: 'number', category: 'task', description: '任务执行危急时间（小时）' },
    { id: 'cfg-005', config_key: 'task_reminder_interval', config_value: '60', config_type: 'number', category: 'task', description: '催办最小间隔（分钟）' },
    { id: 'cfg-006', config_key: 'task_max_extensions', config_value: '3', config_type: 'number', category: 'task', description: '最大延期次数' },
    { id: 'cfg-007', config_key: 'task_max_extension_hours', config_value: '72', config_type: 'number', category: 'task', description: '单次最大延期（小时）' },

    // 系统参数配置
    { id: 'cfg-010', config_key: 'session_timeout_minutes', config_value: '30', config_type: 'number', category: 'system', description: '会话超时时间（分钟）' },
    { id: 'cfg-011', config_key: 'password_min_length', config_value: '6', config_type: 'number', category: 'system', description: '密码最小长度' },
    { id: 'cfg-012', config_key: 'password_require_digit', config_value: 'false', config_type: 'boolean', category: 'system', description: '密码必须包含数字' },
    { id: 'cfg-013', config_key: 'login_max_attempts', config_value: '5', config_type: 'number', category: 'system', description: '登录失败最大次数' },
    { id: 'cfg-014', config_key: 'backup_auto_enabled', config_value: 'true', config_type: 'boolean', category: 'system', description: '自动备份启用' },
    { id: 'cfg-015', config_key: 'backup_interval_hours', config_value: '24', config_type: 'number', category: 'system', description: '自动备份间隔（小时）' },

    // 审批流程配置
    { id: 'cfg-020', config_key: 'approval_timeout_hours', config_value: '72', config_type: 'number', category: 'approval', description: '审批超时时间（小时）' },
    { id: 'cfg-021', config_key: 'approval_auto_threshold', config_value: '1000', config_type: 'number', category: 'approval', description: '自动审批金额阈值' },
    { id: 'cfg-022', config_key: 'approval_allow_delegate', config_value: 'true', config_type: 'boolean', category: 'approval', description: '允许委托审批' },
    { id: 'cfg-023', config_key: 'approval_require_comment', config_value: 'false', config_type: 'boolean', category: 'approval', description: '审批意见是否必填' },

    // 业务参数配置
    { id: 'cfg-030', config_key: 'inventory_safe_stock', config_value: '10', config_type: 'number', category: 'business', description: '物料安全库存' },
    { id: 'cfg-031', config_key: 'task_reward_multiplier', config_value: '1.0', config_type: 'number', category: 'business', description: '工序奖励系数' },
    { id: 'cfg-032', config_key: 'seedling_survival_threshold', config_value: '85', config_type: 'number', category: 'business', description: '育苗成活率阈值（%）' },
    { id: 'cfg-033', config_key: 'harvest_cycle_days', config_value: '7', config_type: 'number', category: 'business', description: '采收周期（天）' },
  ];

  for (const config of configs) {
    db.run(`
      INSERT OR REPLACE INTO system_configs
      (id, config_key, config_value, config_type, category, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
    `, [
      config.id,
      config.config_key,
      config.config_value,
      config.config_type,
      config.category,
      config.description
    ]);
  }

  console.log(`已导入 ${configs.length} 条系统配置数据`);
}

/**
 * 导入用户与角色数据
 * V6.0 Phase 4: 用户权限系统
 */
function seedUsersAndRoles() {
  const db = getDatabase();
  const now = new Date().toISOString();

  // ========== 角色数据 ==========
  const roles = [
    {
      id: 'role-admin',
      oid: 'ROLE_ADMIN',
      role_code: 'admin',
      role_name: '系统管理员',
      description: '拥有系统所有权限，可管理所有模块',
      is_system: 1,
      status: 'active'
    },
    {
      id: 'role-manager',
      oid: 'ROLE_MANAGER',
      role_code: 'manager',
      role_name: '管理员',
      description: '拥有大部分管理权限',
      is_system: 1,
      status: 'active'
    },
    {
      id: 'role-user',
      oid: 'ROLE_USER',
      role_code: 'user',
      role_name: '普通用户',
      description: '拥有基本操作权限',
      is_system: 1,
      status: 'active'
    }
  ];

  for (const role of roles) {
    db.run(`
      INSERT OR REPLACE INTO roles
      (id, oid, role_code, role_name, description, is_system, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [role.id, role.oid, role.role_code, role.role_name, role.description, role.is_system, role.status, now, now]);
  }

  // ========== 权限数据 ==========
  // 定义系统所有权限
  const permissions = [
    // 系统设置权限
    { id: 'perm-system-settings', oid: 'PERM_SYSTEM_SETTINGS', permission_code: 'system:settings', permission_name: '系统设置', category: 'system' },
    { id: 'perm-system-config', oid: 'PERM_SYSTEM_CONFIG', permission_code: 'system:config', permission_name: '系统配置', category: 'system' },
    { id: 'perm-system-dictionary', oid: 'PERM_SYSTEM_DICTIONARY', permission_code: 'system:dictionary', permission_name: '数据字典', category: 'system' },
    { id: 'perm-system-user', oid: 'PERM_SYSTEM_USER', permission_code: 'system:user', permission_name: '用户管理', category: 'system' },
    { id: 'perm-system-role', oid: 'PERM_SYSTEM_ROLE', permission_code: 'system:role', permission_name: '角色管理', category: 'system' },
    { id: 'perm-system-permission', oid: 'PERM_SYSTEM_PERMISSION', permission_code: 'system:permission', permission_name: '权限管理', category: 'system' },

    // 业务模块权限 - 种源
    { id: 'perm-seed-source-view', oid: 'PERM_SEED_SOURCE_VIEW', permission_code: 'seed-source:view', permission_name: '查看种源', category: 'seed-source' },
    { id: 'perm-seed-source-create', oid: 'PERM_SEED_SOURCE_CREATE', permission_code: 'seed-source:create', permission_name: '创建种源', category: 'seed-source' },
    { id: 'perm-seed-source-update', oid: 'PERM_SEED_SOURCE_UPDATE', permission_code: 'seed-source:update', permission_name: '编辑种源', category: 'seed-source' },
    { id: 'perm-seed-source-delete', oid: 'PERM_SEED_SOURCE_DELETE', permission_code: 'seed-source:delete', permission_name: '删除种源', category: 'seed-source' },

    // 业务模块权限 - 育苗
    { id: 'perm-seedling-view', oid: 'PERM_SEEDLING_VIEW', permission_code: 'seedling:view', permission_name: '查看育苗', category: 'seedling' },
    { id: 'perm-seedling-create', oid: 'PERM_SEEDLING_CREATE', permission_code: 'seedling:create', permission_name: '创建育苗', category: 'seedling' },
    { id: 'perm-seedling-update', oid: 'PERM_SEEDLING_UPDATE', permission_code: 'seedling:update', permission_name: '编辑育苗', category: 'seedling' },
    { id: 'perm-seedling-delete', oid: 'PERM_SEEDLING_DELETE', permission_code: 'seedling:delete', permission_name: '删除育苗', category: 'seedling' },

    // 业务模块权限 - 种植
    { id: 'perm-planting-view', oid: 'PERM_PLANTING_VIEW', permission_code: 'planting:view', permission_name: '查看种植', category: 'planting' },
    { id: 'perm-planting-create', oid: 'PERM_PLANTING_CREATE', permission_code: 'planting:create', permission_name: '创建种植', category: 'planting' },
    { id: 'perm-planting-update', oid: 'PERM_PLANTING_UPDATE', permission_code: 'planting:update', permission_name: '编辑种植', category: 'planting' },
    { id: 'perm-planting-delete', oid: 'PERM_PLANTING_DELETE', permission_code: 'planting:delete', permission_name: '删除种植', category: 'planting' },

    // 业务模块权限 - 采收
    { id: 'perm-harvest-view', oid: 'PERM_HARVEST_VIEW', permission_code: 'harvest:view', permission_name: '查看采收', category: 'harvest' },
    { id: 'perm-harvest-create', oid: 'PERM_HARVEST_CREATE', permission_code: 'harvest:create', permission_name: '创建采收', category: 'harvest' },
    { id: 'perm-harvest-update', oid: 'PERM_HARVEST_UPDATE', permission_code: 'harvest:update', permission_name: '编辑采收', category: 'harvest' },
    { id: 'perm-harvest-delete', oid: 'PERM_HARVEST_DELETE', permission_code: 'harvest:delete', permission_name: '删除采收', category: 'harvest' },

    // 业务模块权限 - 库存
    { id: 'perm-inventory-view', oid: 'PERM_INVENTORY_VIEW', permission_code: 'inventory:view', permission_name: '查看库存', category: 'inventory' },
    { id: 'perm-inventory-create', oid: 'PERM_INVENTORY_CREATE', permission_code: 'inventory:create', permission_name: '创建库存', category: 'inventory' },
    { id: 'perm-inventory-update', oid: 'PERM_INVENTORY_UPDATE', permission_code: 'inventory:update', permission_name: '编辑库存', category: 'inventory' },
    { id: 'perm-inventory-delete', oid: 'PERM_INVENTORY_DELETE', permission_code: 'inventory:delete', permission_name: '删除库存', category: 'inventory' },

    // 业务模块权限 - 人工
    { id: 'perm-labor-view', oid: 'PERM_LABOR_VIEW', permission_code: 'labor:view', permission_name: '查看人工', category: 'labor' },
    { id: 'perm-labor-create', oid: 'PERM_LABOR_CREATE', permission_code: 'labor:create', permission_name: '创建人工', category: 'labor' },
    { id: 'perm-labor-update', oid: 'PERM_LABOR_UPDATE', permission_code: 'labor:update', permission_name: '编辑人工', category: 'labor' },
    { id: 'perm-labor-delete', oid: 'PERM_LABOR_DELETE', permission_code: 'labor:delete', permission_name: '删除人工', category: 'labor' },

    // 农事任务权限
    { id: 'perm-task-view', oid: 'PERM_TASK_VIEW', permission_code: 'task:view', permission_name: '查看任务', category: 'task' },
    { id: 'perm-task-create', oid: 'PERM_TASK_CREATE', permission_code: 'task:create', permission_name: '创建任务', category: 'task' },
    { id: 'perm-task-update', oid: 'PERM_TASK_UPDATE', permission_code: 'task:update', permission_name: '编辑任务', category: 'task' },
    { id: 'perm-task-delete', oid: 'PERM_TASK_DELETE', permission_code: 'task:delete', permission_name: '删除任务', category: 'task' },
    { id: 'perm-task-assign', oid: 'PERM_TASK_ASSIGN', permission_code: 'task:assign', permission_name: '分配任务', category: 'task' },

    // 巡查权限
    { id: 'perm-inspection-view', oid: 'PERM_INSPECTION_VIEW', permission_code: 'inspection:view', permission_name: '查看巡查', category: 'inspection' },
    { id: 'perm-inspection-create', oid: 'PERM_INSPECTION_CREATE', permission_code: 'inspection:create', permission_name: '创建巡查', category: 'inspection' },
    { id: 'perm-inspection-update', oid: 'PERM_INSPECTION_UPDATE', permission_code: 'inspection:update', permission_name: '编辑巡查', category: 'inspection' },
    { id: 'perm-inspection-delete', oid: 'PERM_INSPECTION_DELETE', permission_code: 'inspection:delete', permission_name: '删除巡查', category: 'inspection' },

    // 问题权限
    { id: 'perm-problem-view', oid: 'PERM_PROBLEM_VIEW', permission_code: 'problem:view', permission_name: '查看问题', category: 'problem' },
    { id: 'perm-problem-create', oid: 'PERM_PROBLEM_CREATE', permission_code: 'problem:create', permission_name: '创建问题', category: 'problem' },
    { id: 'perm-problem-update', oid: 'PERM_PROBLEM_UPDATE', permission_code: 'problem:update', permission_name: '编辑问题', category: 'problem' },
    { id: 'perm-problem-delete', oid: 'PERM_PROBLEM_DELETE', permission_code: 'problem:delete', permission_name: '删除问题', category: 'problem' },

    // 审批权限
    { id: 'perm-approval-view', oid: 'PERM_APPROVAL_VIEW', permission_code: 'approval:view', permission_name: '查看审批', category: 'approval' },
    { id: 'perm-approval-create', oid: 'PERM_APPROVAL_CREATE', permission_code: 'approval:create', permission_name: '创建审批', category: 'approval' },
    { id: 'perm-approval-approve', oid: 'PERM_APPROVAL_APPROVE', permission_code: 'approval:approve', permission_name: '审批通过', category: 'approval' },
    { id: 'perm-approval-reject', oid: 'PERM_APPROVAL_REJECT', permission_code: 'approval:reject', permission_name: '审批拒绝', category: 'approval' },
  ];

  for (const perm of permissions) {
    db.run(`
      INSERT OR REPLACE INTO permissions
      (id, oid, permission_code, permission_name, category, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'active', ?, ?)
    `, [perm.id, perm.oid, perm.permission_code, perm.permission_name, perm.category, now, now]);
  }

  // ========== 管理员角色赋于所有权限 ==========
  for (const perm of permissions) {
    db.run(`
      INSERT OR REPLACE INTO role_permissions
      (id, role_oid, permission_oid, created_at)
      VALUES (?, 'ROLE_ADMIN', ?, ?)
    `, [`rp-admin-${perm.id}`, perm.oid, now]);
  }

  // ========== 用户数据 ==========
  // 管理员用户：陆启闯
  const adminUser = {
    id: 'user-admin',
    oid: 'USER_ADMIN_001',
    username: '陆启闯',
    password_hash: bcrypt.hashSync('123456', 10),  // 密码已哈希存储
    real_name: '陆启闯',
    org_oid: 'ORG_DEFAULT',
    org_name: '默认组织',
    department_oid: 'DEPT_ADMIN',
    department_name: '管理层',
    position: '系统管理员',
    email: 'admin@tmcloud.com',
    phone: '13800138000',
    status: 'active'
  };

  db.run(`
    INSERT OR REPLACE INTO users
    (id, oid, username, password_hash, real_name, org_oid, org_name, department_oid, department_name, position, email, phone, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    adminUser.id, adminUser.oid, adminUser.username, adminUser.password_hash,
    adminUser.real_name, adminUser.org_oid, adminUser.org_name,
    adminUser.department_oid, adminUser.department_name, adminUser.position,
    adminUser.email, adminUser.phone, adminUser.status, now, now
  ]);

  // ========== 用户角色关联 ==========
  // 陆启闯 关联 管理员角色
  db.run(`
    INSERT OR REPLACE INTO user_roles
    (id, user_oid, role_oid, created_at)
    VALUES (?, 'USER_ADMIN_001', 'ROLE_ADMIN', ?)
  `, ['ur-admin-001', now]);

  console.log(`已导入 ${roles.length} 个角色`);
  console.log(`已导入 ${permissions.length} 个权限`);
  console.log('已导入管理员用户：陆启闯');
}

/**
 * 导入作物批次数据（完整版）
 */
function seedBusinessCropBatches() {
  const db = getDatabase();

  const cropBatches = [
    // ========== 种源计划（育种计划）==========
    {
      id: 'B101', batch_code: 'JZB2026-001', plan_type: 'seed_breeding', plan_type_name: '育种计划',
      crop_name: '番茄', crop_type: '茄果类', variety: '红果番茄',
      greenhouse_id: '', greenhouse_name: '', planting_area: 0,
      stage: 'seedling', stage_name: '种子期',
      start_date: '2026-01-05', expected_harvest_date: '2026-01-15',
      target_yield: 0, actual_yield: 0,
      status: 'planned', planting_mode: '', responsible_person: '王建国',
      publisher: '陆启闯', publish_date: '2026-01-03', last_modify_date: '2026-01-03',
      batch_status: 'published', supplier_name: '先正达种业',
      seed_quantity: 500, unit: 'kg', target_quantity: 500,
      plan_detail_file_name: '番茄种子采购计划-JZB2026-001.md',
      plan_detail: '# 番茄种子采购计划 JZB2026-001\n\n## 基本信息\n- 批次号：JZB2026-001\n- 计划类型：育种计划（种源采购）\n- 作物：番茄\n- 品种：红果番茄\n- 供应商：先正达种业\n- 采购数量：500 kg\n- 采购负责人：王建国\n\n## 时间安排\n- 采购日期：2026-01-05\n- 预计到货：2026-01-15',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'B102', batch_code: 'JZB2026-002', plan_type: 'seed_breeding', plan_type_name: '育种计划',
      crop_name: '黄瓜', crop_type: '瓜类', variety: '水果黄瓜',
      greenhouse_id: '', greenhouse_name: '', planting_area: 0,
      stage: 'seedling', stage_name: '种子期',
      start_date: '2026-01-08', expected_harvest_date: '2026-01-18',
      target_yield: 0, actual_yield: 0,
      status: 'planned', planting_mode: '', responsible_person: '李明辉',
      publisher: '陆启闯', publish_date: '2026-01-06', last_modify_date: '2026-01-06',
      batch_status: 'in_progress', supplier_name: '圣尼斯种业',
      seed_quantity: 300, unit: 'kg', target_quantity: 300,
      plan_detail_file_name: '黄瓜种子采购计划-JZB2026-002.md',
      plan_detail: '# 黄瓜种子采购计划 JZB2026-002\n\n## 基本信息\n- 批次号：JZB2026-002\n- 计划类型：育种计划（种源采购）\n- 作物：黄瓜\n- 品种：水果黄瓜\n- 供应商：圣尼斯种业\n- 采购数量：300 kg\n- 采购负责人：李明辉',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    // ========== 育苗计划 ==========
    {
      id: 'B201', batch_code: 'YMB2026-001', plan_type: 'seedling', plan_type_name: '育苗计划',
      crop_name: '番茄', crop_type: '茄果类', variety: '红果番茄',
      greenhouse_id: 'G001', greenhouse_name: '玻璃温室A区', planting_area: 500,
      stage: 'seedling', stage_name: '苗期',
      start_date: '2026-01-20', expected_harvest_date: '2026-03-20',
      target_yield: 0, actual_yield: 0,
      status: 'planned', planting_mode: '椰糠育苗', responsible_person: '陈小芳',
      publisher: '陆启闯', publish_date: '2026-01-15', last_modify_date: '2026-01-15',
      batch_status: 'published', supplier_name: '',
      seed_quantity: 0, unit: '株', target_quantity: 0,
      seedling_site_name: '育苗基地A区', target_seedling_count: 45000,
      plan_detail_file_name: '番茄育苗计划-YMB2026-001.md',
      plan_detail: '# 番茄育苗计划 YMB2026-001\n\n## 基本信息\n- 批次号：YMB2026-001\n- 计划类型：育苗计划\n- 作物：番茄\n- 品种：红果番茄\n- 育苗场地：育苗基地A区\n- 负责人：陈小芳\n\n## 育苗目标\n- 目标成苗数：45000株\n- 开始日期：2026-01-20\n- 预计结束：2026-03-20',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'B202', batch_code: 'YMB2026-002', plan_type: 'seedling', plan_type_name: '育苗计划',
      crop_name: '黄瓜', crop_type: '瓜类', variety: '水果黄瓜',
      greenhouse_id: 'G002', greenhouse_name: '玻璃温室B区', planting_area: 400,
      stage: 'seedling', stage_name: '苗期',
      start_date: '2026-01-25', expected_harvest_date: '2026-03-15',
      target_yield: 0, actual_yield: 0,
      status: 'planned', planting_mode: '水培育苗', responsible_person: '周志强',
      publisher: '陆启闯', publish_date: '2026-01-20', last_modify_date: '2026-01-20',
      batch_status: 'in_progress', supplier_name: '',
      seed_quantity: 0, unit: '株', target_quantity: 0,
      seedling_site_name: '育苗基地B区', target_seedling_count: 35000,
      plan_detail_file_name: '黄瓜育苗计划-YMB2026-002.md',
      plan_detail: '# 黄瓜育苗计划 YMB2026-002\n\n## 基本信息\n- 批次号：YMB2026-002\n- 计划类型：育苗计划\n- 作物：黄瓜\n- 品种：水果黄瓜\n- 育苗场地：育苗基地B区\n- 负责人：周志强',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'B203', batch_code: 'YMB2026-003', plan_type: 'seedling', plan_type_name: '育苗计划',
      crop_name: '草莓', crop_type: '浆果类', variety: '红颜',
      greenhouse_id: 'G004', greenhouse_name: '日光温室1号', planting_area: 200,
      stage: 'seedling', stage_name: '苗期',
      start_date: '2026-02-01', expected_harvest_date: '2026-04-01',
      target_yield: 0, actual_yield: 0,
      status: 'planned', planting_mode: '土壤育苗', responsible_person: '吴美丽',
      publisher: '陆启闯', publish_date: '2026-01-28', last_modify_date: '2026-01-28',
      batch_status: 'published', supplier_name: '',
      seed_quantity: 0, unit: '株', target_quantity: 0,
      seedling_site_name: '草莓育苗区', target_seedling_count: 15000,
      plan_detail_file_name: '草莓育苗计划-YMB2026-003.md',
      plan_detail: '# 草莓育苗计划 YMB2026-003\n\n## 基本信息\n- 批次号：YMB2026-003\n- 计划类型：育苗计划\n- 作物：草莓\n- 品种：红颜\n- 育苗场地：草莓育苗区\n- 负责人：吴美丽',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    // ========== 种植计划 ==========
    {
      id: 'B301', batch_code: 'ZZB2026-001', plan_type: 'planting', plan_type_name: '种植计划',
      crop_name: '番茄', crop_type: '茄果类', variety: '红果番茄',
      greenhouse_id: 'G001', greenhouse_name: '玻璃温室A区', planting_area: 3000,
      stage: 'vegetative', stage_name: '生长期',
      start_date: '2026-03-25', expected_harvest_date: '2026-07-15',
      target_yield: 30000, actual_yield: 0,
      status: 'planned', planting_mode: '椰糠种植', responsible_person: '郭靖',
      publisher: '陆启闯', publish_date: '2026-03-20', last_modify_date: '2026-03-20',
      batch_status: 'published', supplier_name: '',
      seed_quantity: 0, unit: '', target_quantity: 30000,
      plan_detail_file_name: '番茄种植计划-ZZB2026-001.md',
      plan_detail: '# 番茄种植计划 ZZB2026-001\n\n## 基本信息\n- 批次号：ZZB2026-001\n- 计划类型：种植计划\n- 作物：番茄\n- 品种：红果番茄\n- 种植区域：玻璃温室A区\n- 种植面积：3000 m²\n- 负责人：郭靖',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'B302', batch_code: 'ZZB2026-002', plan_type: 'planting', plan_type_name: '种植计划',
      crop_name: '黄瓜', crop_type: '瓜类', variety: '水果黄瓜',
      greenhouse_id: 'G002', greenhouse_name: '玻璃温室B区', planting_area: 2500,
      stage: 'seedling', stage_name: '苗期',
      start_date: '2026-03-20', expected_harvest_date: '2026-06-20',
      target_yield: 25000, actual_yield: 0,
      status: 'planned', planting_mode: '椰糠种植', responsible_person: '黄蓉',
      publisher: '陆启闯', publish_date: '2026-03-15', last_modify_date: '2026-03-15',
      batch_status: 'published', supplier_name: '',
      seed_quantity: 0, unit: '', target_quantity: 25000,
      plan_detail_file_name: '黄瓜种植计划-ZZB2026-002.md',
      plan_detail: '# 黄瓜种植计划 ZZB2026-002\n\n## 基本信息\n- 批次号：ZZB2026-002\n- 计划类型：种植计划\n- 作物：黄瓜\n- 品种：水果黄瓜\n- 种植区域：玻璃温室B区\n- 种植面积：2500 m²\n- 负责人：黄蓉',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'B303', batch_code: 'ZZB2026-003', plan_type: 'planting', plan_type_name: '种植计划',
      crop_name: '草莓', crop_type: '浆果类', variety: '红颜',
      greenhouse_id: 'G004', greenhouse_name: '日光温室1号', planting_area: 800,
      stage: 'harvest', stage_name: '采收期',
      start_date: '2025-11-01', expected_harvest_date: '2026-04-30',
      target_yield: 5000, actual_yield: 2100,
      status: 'in_progress', planting_mode: '土壤种植', responsible_person: '张无忌',
      publisher: '陆启闯', publish_date: '2025-10-25', last_modify_date: '2026-04-10',
      batch_status: 'in_progress', supplier_name: '',
      seed_quantity: 0, unit: '', target_quantity: 5000,
      plan_detail_file_name: '草莓种植计划-ZZB2026-003.md',
      plan_detail: '# 草莓种植计划 ZZB2026-003\n\n## 基本信息\n- 批次号：ZZB2026-003\n- 计划类型：种植计划\n- 作物：草莓\n- 品种：红颜\n- 种植区域：日光温室1号\n- 种植面积：800 m²\n- 负责人：张无忌',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
  ];

  for (const batch of cropBatches) {
    db.run(`
      INSERT OR REPLACE INTO crop_batches
      (id, batch_code, plan_type, plan_type_name, crop_name, crop_type, variety,
       greenhouse_id, greenhouse_name, planting_area, stage, stage_name,
       start_date, expected_harvest_date, target_yield, actual_yield, status, planting_mode,
       responsible_person, publisher, publish_date, last_modify_date, batch_status,
       supplier_name, seed_quantity, unit, target_quantity, plan_detail_file_name, plan_detail,
       seedling_site_name, target_seedling_count, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      batch.id, batch.batch_code, batch.plan_type, batch.plan_type_name, batch.crop_name, batch.crop_type, batch.variety,
      batch.greenhouse_id || '', batch.greenhouse_name || '', batch.planting_area || 0, batch.stage || '', batch.stage_name || '',
      batch.start_date || '', batch.expected_harvest_date || '', batch.target_yield || 0, batch.actual_yield || 0, batch.status || '', batch.planting_mode || '',
      batch.responsible_person || '', batch.publisher || '', batch.publish_date || '', batch.last_modify_date || '', batch.batch_status || '',
      batch.supplier_name || '', batch.seed_quantity || 0, batch.unit || '', batch.target_quantity || 0, batch.plan_detail_file_name || '', batch.plan_detail || '',
      batch.seedling_site_name || '', batch.target_seedling_count || 0, batch.create_time || '', batch.update_time || ''
    ]);
  }

  console.log(`已导入 ${cropBatches.length} 条作物批次数据`);
}

/**
 * 导入农事任务数据（完整版）
 * 注意：T001, T002 已从种子数据中移除，需要删除请直接操作数据库
 */
function seedBusinessTasks() {
  const db = getDatabase();

  // 已移除 T001, T002 种子数据
  console.log('seedBusinessTasks: 无需导入农事任务（已清空）');
}

/**
 * 导入巡查记录数据（完整版）
 */
function seedBusinessInspectionRecords() {
  const db = getDatabase();

  const inspections = [
    {
      id: 'IR002', record_code: 'XT20260409-001', inspection_type: 'farm',
      inspector_id: 'U004', inspector_name: '郭靖',
      greenhouse_id: 'G002', greenhouse_name: '玻璃温室B区',
      crop_name: '黄瓜', check_date: '2026-04-09', check_time: '14:30:00',
      check_result: '发现问题', issue_severity: '中等',
      issue_text: '黄瓜叶片出现轻微萎蔫，大棚内温度偏高导致，建议增加通风遮阳',
      images: null, status: 'attention',
      feedback_users: '["郭靖","黄蓉"]',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'IR003', record_code: 'XT20260408-001', inspection_type: 'farm',
      inspector_id: 'U005', inspector_name: '杨过',
      greenhouse_id: 'G004', greenhouse_name: '日光温室1号',
      crop_name: '草莓', check_date: '2026-04-08', check_time: '10:00:00',
      check_result: '发现问题', issue_severity: '轻微',
      issue_text: '草莓叶片发现白粉虱成虫，数量较少但需密切关注，发现2株有虫害迹象',
      images: null, status: 'pending',
      feedback_users: '["杨过","小龙女"]',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
    {
      id: 'IR006', record_code: 'XT20260406-001', inspection_type: 'farm',
      inspector_id: 'U006', inspector_name: '黄蓉',
      greenhouse_id: 'G006', greenhouse_name: '日光温室3号',
      crop_name: '菠菜', check_date: '2026-04-06', check_time: '15:30:00',
      check_result: '发现问题', issue_severity: '轻微',
      issue_text: '土壤偏干，需要及时浇水',
      images: null, status: 'attention',
      feedback_users: '["黄蓉","郭靖"]',
      create_time: new Date().toISOString(), update_time: new Date().toISOString()
    },
  ];

  for (const ins of inspections) {
    db.run(`
      INSERT OR REPLACE INTO inspections
      (id, record_code, inspection_type, inspector_id, inspector_name, greenhouse_name,
       check_date, check_time, check_result, issue_severity, issue_text, images, status,
       feedback_users, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ins.id, ins.record_code, ins.inspection_type, ins.inspector_id, ins.inspector_name,
      ins.greenhouse_name, ins.check_date, ins.check_time, ins.check_result, ins.issue_severity,
      ins.issue_text, ins.images, ins.status, ins.feedback_users, ins.create_time, ins.update_time
    ]);
  }

  console.log(`已导入 ${inspections.length} 条巡查记录`);
}

/**
 * 导入临时任务数据（完整版）
 */
function seedBusinessTempTasks() {
  const db = getDatabase();

  const tempTasks = [
    { id: 'TT001', task_code: 'TT20260418-001', task_title: '设备日常维护检查', task_type: 'equipment_repair', task_content: '对温室内的灌溉系统进行例行检查和维护', assignee_id: 'U013', assignee_name: '陆启闯', greenhouse_id: 'G001', greenhouse_name: '玻璃温室A区', priority: 'low', status: 'draft', due_date: '2026-04-25T08:00:00', create_time: '2026-04-18T09:00:00.000Z', update_time: '2026-04-18T09:00:00.000Z' },
    { id: 'TT002', task_code: 'TT20260418-002', task_title: '紧急处理大棚A区虫害', task_type: 'farm_repair', task_content: '大棚A区发现蚜虫大量繁殖，需要紧急喷洒农药处理', assignee_id: 'U013', assignee_name: '陆启闯', greenhouse_id: 'G001', greenhouse_name: '大棚A区', priority: 'high', status: 'pending', due_date: '2026-04-20T17:00:00', create_time: '2026-04-18T08:00:00.000Z', update_time: '2026-04-18T08:00:00.000Z' },
    { id: 'TT003', task_code: 'TT20260417-003', task_title: '外出协助兄弟基地', task_type: 'farm_repair', task_content: '协助南京绿野农场基地进行番茄移栽作业', assignee_id: 'U013', assignee_name: '陆启闯', greenhouse_id: '', greenhouse_name: '外出协助', priority: 'medium', status: 'accepted', due_date: '2026-04-20T17:00:00', create_time: '2026-04-17T10:00:00.000Z', update_time: '2026-04-17T14:00:00.000Z' },
    { id: 'TT004', task_code: 'TT20260418-004', task_title: 'B区番茄追肥作业', task_type: 'farm_repair', task_content: '番茄进入结果期，需要追加钾肥促进果实发育', assignee_id: 'U013', assignee_name: '陆启闯', greenhouse_id: 'G002', greenhouse_name: '玻璃温室B区', priority: 'normal', status: 'in_progress', due_date: '2026-04-22T17:00:00', create_time: '2026-04-17T09:00:00.000Z', update_time: '2026-04-18T10:00:00.000Z' },
    { id: 'TT005', task_code: 'TT20260416-005', task_title: 'D区黄瓜采摘', task_type: 'farm_repair', task_content: 'D区黄瓜已成熟，需要及时采摘', assignee_id: 'U013', assignee_name: '陆启闯', greenhouse_id: '', greenhouse_name: '大棚D区', priority: 'normal', status: 'waiting_acceptance', due_date: '2026-04-18T17:00:00', create_time: '2026-04-16T08:00:00.000Z', update_time: '2026-04-18T16:00:00.000Z' },
    { id: 'TT006', task_code: 'TT20260415-006', task_title: '大棚B区消杀作业', task_type: 'farm_repair', task_content: '对大棚B区进行病虫害消杀作业', assignee_id: 'U013', assignee_name: '陆启闯', greenhouse_id: 'G002', greenhouse_name: '玻璃温室B区', priority: 'high', status: 'completed', due_date: '2026-04-18T12:00:00', create_time: '2026-04-15T08:00:00.000Z', update_time: '2026-04-16T16:00:00.000Z' },
  ];

  for (const task of tempTasks) {
    db.run(`
      INSERT OR REPLACE INTO temp_tasks
      (id, task_code, task_title, task_type, task_content, assignee_id, assignee_name,
       greenhouse_id, greenhouse_name, priority, status, due_date, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      task.id, task.task_code, task.task_title, task.task_type, task.task_content,
      task.assignee_id, task.assignee_name, task.greenhouse_id, task.greenhouse_name,
      task.priority, task.status, task.due_date, task.create_time, task.update_time
    ]);
  }

  console.log(`已导入 ${tempTasks.length} 条临时任务`);
}

/**
 * 导入员工数据（完整版）
 */
function seedBusinessWorkers() {
  const db = getDatabase();

  const workers = [
    { id: 'W011', worker_id: 'EMP20240011', name: '陆启闯', gender: '男', age: 32, birth_date: '1994-05-10', id_card: '320105199405101234', phone: '13811112222', email: 'luqc@example.com', wechat: 'luqichuang2024', address: '江苏省南京市江宁区科学园街道1号', residence_address: '江苏省南京市江宁区百家湖花园1栋101室', emergency_contact: '陆明', emergency_relation: '父亲', emergency_phone: '13911112222', department: '生产部', team: 'A班', position: '农技员', work_area: '全部生产区域', skill_level: '高级', skill_tags: '浇水灌溉,施肥作业,病虫害防治,温控管理', work_years: 6, wages_type: '月薪', hourly_rate: 0, hire_date: '2020-03-01', contract_status: '续签', contract_type: '固定期限', contract_expire_date: '2027-02-28', contract_no: 'HT-2020-008', education: '本科', major: '农学', training_records: '[{"id":"TR011","trainingDate":"2024-06-15","trainingType":"技能培训","trainingContent":"设施农业技术","trainingHours":24,"trainer":"张博士","certificate":"高级农技师证书","score":92}]', work_experiences: '[{"id":"WE011","company":"南京绿野农场","position":"农技员","startDate":"2018-07-01","endDate":"2020-02-28","workContent":"温室作物管理","leavingReason":"个人发展"}]', annual_assessments: '[{"id":"AS011","year":2024,"assessmentDate":"2024-12-20","assessor":"王建国","rating":"优秀","score":95,"strengths":"技术全面，能独立解决生产问题","weaknesses":"对新品种接受较慢","goals":"成为技术带头人"}]', status: '在职', remarks: '技术骨干，农技方面的带头人', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'W001', worker_id: 'EMP20240001', name: '张伟民', gender: '男', age: 35, birth_date: '1991-01-01', id_card: '320105199101011234', phone: '13812345678', email: 'zhangwm@example.com', wechat: 'zhangweimin2024', address: '江苏省南京市江宁区东山街道1号', residence_address: '江苏省南京市江宁区百家湖花园10栋201室', emergency_contact: '张伟', emergency_relation: '兄弟', emergency_phone: '13912345678', department: '生产部', team: 'A班', position: '种植工', work_area: '玻璃温室A区/B区', skill_level: '高级', skill_tags: '浇水灌溉,施肥作业,采摘技能,修剪整枝', work_years: 8, wages_type: '计件', hourly_rate: 0, hire_date: '2022-03-15', contract_status: '续签', contract_type: '固定期限', contract_expire_date: '2026-03-14', contract_no: 'HT-2022-001', education: '初中', major: '', training_records: '[{"id":"TR001","trainingDate":"2023-06-15","trainingType":"安全培训","trainingContent":"农业安全生产规范","trainingHours":8,"trainer":"李明辉","certificate":"安全员证书","score":95}]', work_experiences: '[{"id":"WE001","company":"南京绿野农场","position":"种植工","startDate":"2016-03-01","endDate":"2022-02-28","workContent":"蔬菜大棚种植管理","leavingReason":"个人发展"}]', annual_assessments: '[{"id":"AS001","year":2024,"assessmentDate":"2024-12-20","assessor":"王建国","rating":"优秀","score":92,"strengths":"技术过硬，能独立完成各项工作","weaknesses":"沟通协调能力可提升","goals":"提升管理能力"}]', status: '在职', remarks: '技术骨干，工作认真负责', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'W002', worker_id: 'EMP20240002', name: '李明轩', gender: '女', age: 28, birth_date: '1996-02-15', id_card: '320105199602021234', phone: '13923456789', email: 'limx@example.com', wechat: 'limingxuan1996', address: '江苏省南京市浦口区泰山街道2号', residence_address: '江苏省南京市浦口区威尼斯花园5栋301室', emergency_contact: '李强', emergency_relation: '父亲', emergency_phone: '13823456789', department: '技术部', team: '技术组', position: '农技员', work_area: '技术部全部区域', skill_level: '技师', skill_tags: '嫁接技术,育苗管理,温控管理,病虫害防治', work_years: 6, wages_type: '月薪', hourly_rate: 0, hire_date: '2021-06-20', contract_status: '续签', contract_type: '固定期限', contract_expire_date: '2025-06-19', contract_no: 'HT-2021-015', education: '大专', major: '园艺技术', training_records: '[{"id":"TR002","trainingDate":"2023-03-10","trainingType":"技能培训","trainingContent":"嫁接技术进阶","trainingHours":16,"trainer":"张博士","certificate":"技师证书","score":88}]', work_experiences: '[{"id":"WE002","company":"上海园艺研究所","position":"技术员","startDate":"2018-07-01","endDate":"2021-05-30","workContent":"花卉育苗与嫁接技术研究","leavingReason":"家庭原因回南京"}]', annual_assessments: '[{"id":"AS002","year":2024,"assessmentDate":"2024-12-18","assessor":"李明辉","rating":"优秀","score":95,"strengths":"专业知识扎实，善于技术创新","weaknesses":"现场管理经验不足","goals":"考取高级农技师证书"}]', status: '在职', remarks: '技术骨干，参与多项技术改进项目', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'W003', worker_id: 'EMP20240003', name: '王建国', gender: '男', age: 42, birth_date: '1982-03-20', id_card: '320105198203201234', phone: '13634567890', email: 'wangjg@example.com', wechat: 'wangjianguo1982', address: '江苏省南京市六合区雄州街道3号', residence_address: '江苏省南京市江宁区将军山花园3栋501室', emergency_contact: '王芳', emergency_relation: '妻子', emergency_phone: '13734567890', department: '生产部', team: 'B班', position: '生产主管', work_area: '全部生产区域', skill_level: '技师', skill_tags: '基地管理,灌溉系统操作,农机驾驶,质检分级', work_years: 15, wages_type: '月薪', hourly_rate: 0, hire_date: '2019-01-10', contract_status: '续签', contract_type: '无固定期限', contract_expire_date: '2027-01-09', contract_no: 'HT-2019-001', education: '高中', major: '', training_records: '[{"id":"TR003","trainingDate":"2022-09-15","trainingType":"管理培训","trainingContent":"农业生产管理","trainingHours":24,"trainer":"王总监","certificate":"管理资格证","score":90}]', work_experiences: '[{"id":"WE003","company":"苏州蔬菜基地","position":"生产主管","startDate":"2012-05-01","endDate":"2018-12-31","workContent":"蔬菜生产全面管理","leavingReason":"返乡就业"}]', annual_assessments: '[{"id":"AS003","year":2024,"assessmentDate":"2024-12-15","assessor":"李明辉","rating":"优秀","score":94,"strengths":"管理能力强，团队建设出色","weaknesses":"新技术学习较慢","goals":"推进基地数字化管理"}]', status: '在职', remarks: '优秀管理者，班组建设标兵', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'W004', worker_id: 'EMP20240004', name: '赵文静', gender: '女', age: 30, birth_date: '1994-04-18', id_card: '320105199404181234', phone: '13745678901', email: 'zhaowj@example.com', wechat: 'zhaowenjing1994', address: '江苏省南京市溧水区永阳街道4号', residence_address: '江苏省南京市溧水区财智广场6栋202室', emergency_contact: '赵军', emergency_relation: '父亲', emergency_phone: '13645678901', department: '技术部', team: '技术组', position: '质检员', work_area: '技术部全部区域', skill_level: '高级', skill_tags: '质检分级,采摘技能,包装发货', work_years: 5, wages_type: '月薪', hourly_rate: 0, hire_date: '2020-09-01', contract_status: '续签', contract_type: '固定期限', contract_expire_date: '2026-08-31', contract_no: 'HT-2020-008', education: '中专', major: '农产品质检', training_records: '[{"id":"TR004","trainingDate":"2023-11-20","trainingType":"质检培训","trainingContent":"农产品质量检测","trainingHours":12,"trainer":"张博士","certificate":"质检员证书","score":92}]', work_experiences: '[{"id":"WE004","company":"浙江果蔬集团","position":"质检员","startDate":"2019-06-01","endDate":"2020-08-25","workContent":"水果质量检测与分级","leavingReason":"个人发展"}]', annual_assessments: '[{"id":"AS004","year":2024,"assessmentDate":"2024-12-19","assessor":"李明辉","rating":"良好","score":88,"strengths":"工作细致，质检准确率高","weaknesses":"应急处理能力待加强","goals":"提升综合素质"}]', status: '在职', remarks: '质检工作零投诉', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'W005', worker_id: 'EMP20240005', name: '钱文涛', gender: '男', age: 25, birth_date: '1999-05-25', id_card: '320105199905251234', phone: '13556789012', email: 'qianwt@example.com', wechat: 'qianwentao99', address: '江苏省南京市高淳区淳溪街道5号', residence_address: '江苏省南京市高淳区碧桂园7栋101室', emergency_contact: '钱明', emergency_relation: '父亲', emergency_phone: '13456789012', department: '生产部', team: 'A班', position: '种植工', work_area: '玻璃温室C区', skill_level: '中级', skill_tags: '浇水灌溉,施肥作业,打药操作', work_years: 3, wages_type: '计件', hourly_rate: 0, hire_date: '2023-02-15', contract_status: '续签', contract_type: '固定期限', contract_expire_date: '2026-02-14', contract_no: 'HT-2023-003', education: '初中', major: '', training_records: '[{"id":"TR005","trainingDate":"2023-04-10","trainingType":"岗前培训","trainingContent":"农业基础知识","trainingHours":8,"trainer":"李明辉","score":85}]', work_experiences: '[{"id":"WE005","company":"无锡蔬菜基地","position":"种植工","startDate":"2021-03-01","endDate":"2023-01-30","workContent":"大棚蔬菜种植","leavingReason":"回家乡发展"}]', annual_assessments: '[{"id":"AS005","year":2024,"assessmentDate":"2024-12-20","assessor":"王建国","rating":"良好","score":85,"strengths":"学习积极，上手快","weaknesses":"重体力活经验不足","goals":"提升技能到高级"}]', status: '在职', remarks: '年轻有潜力，重点培养对象', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'W006', worker_id: 'EMP20240006', name: '孙晓峰', gender: '女', age: 33, birth_date: '1991-08-30', id_card: '320105199108301234', phone: '13467890123', email: 'sunxf@example.com', wechat: 'sxiaofeng1991', address: '江苏省南京市栖霞区迈皋桥街道6号', residence_address: '江苏省南京市栖霞区仙林花园8栋302室', emergency_contact: '孙强', emergency_relation: '兄弟', emergency_phone: '13367890123', department: '后勤部', team: '后勤组', position: '仓库管理员', work_area: '仓库区', skill_level: '中级', skill_tags: '包装发货,物资管理', work_years: 6, wages_type: '月薪', hourly_rate: 0, hire_date: '2021-11-01', contract_status: '续签', contract_type: '固定期限', contract_expire_date: '2025-10-31', contract_no: 'HT-2021-022', education: '高中', major: '', training_records: '[{"id":"TR006","trainingDate":"2022-05-15","trainingType":"仓储培训","trainingContent":"物资仓储管理","trainingHours":8,"trainer":"孙丽娜","certificate":"仓储管理员证书","score":90}]', work_experiences: '[{"id":"WE006","company":"南京物流公司","position":"仓库管理员","startDate":"2018-09-01","endDate":"2021-10-20","workContent":"物资出入库管理","leavingReason":"家庭原因换工作"}]', annual_assessments: '[{"id":"AS006","year":2024,"assessmentDate":"2024-12-18","assessor":"李明辉","rating":"良好","score":87,"strengths":"细心认真，账目清晰","weaknesses":"设备维护能力不足","goals":"学习叉车操作"}]', status: '在职', remarks: '仓库管理井井有条', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'W007', worker_id: 'EMP20240007', name: '周志强', gender: '男', age: 45, birth_date: '1979-11-12', id_card: '320105197911121234', phone: '13378901234', email: 'zhouzq@example.com', wechat: 'zhouzhiqiang1979', address: '江苏省南京市江宁区禄口街道7号', residence_address: '江苏省南京市江宁区翠屏花园9栋401室', emergency_contact: '周涛', emergency_relation: '儿子', emergency_phone: '13278901234', department: '生产部', team: 'C班', position: '农机手', work_area: '全部区域', skill_level: '高级', skill_tags: '农机驾驶,农机维修,灌溉系统操作', work_years: 18, wages_type: '计时', hourly_rate: 35, hire_date: '2018-05-20', contract_status: '续签', contract_type: '固定期限', contract_expire_date: '2026-05-19', contract_no: 'HT-2018-012', education: '初中', major: '', training_records: '[{"id":"TR007","trainingDate":"2021-08-20","trainingType":"技能培训","trainingContent":"新型农机操作","trainingHours":16,"trainer":"农机厂家","certificate":"农机驾驶证","score":94}]', work_experiences: '[{"id":"WE007","company":"安徽农机合作社","position":"农机手","startDate":"2006-04-01","endDate":"2018-05-10","workContent":"农业机械操作与维修","leavingReason":"来南京发展"}]', annual_assessments: '[{"id":"AS007","year":2024,"assessmentDate":"2024-12-16","assessor":"王建国","rating":"优秀","score":93,"strengths":"农机技术全面，经验丰富","weaknesses":"文化程度限制理论提升","goals":"带教更多年轻农机手"}]', status: '在职', remarks: '农机方面的专家，技术带头人', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'W008', worker_id: 'EMP20240008', name: '吴美丽', gender: '女', age: 27, birth_date: '1997-09-05', id_card: '320105199709051234', phone: '13289012345', email: 'wuml@example.com', wechat: 'wumeili1997', address: '江苏省南京市雨花台区铁心桥街道8号', residence_address: '江苏省南京市雨花台区锦明花园11栋102室', emergency_contact: '吴刚', emergency_relation: '父亲', emergency_phone: '13189012345', department: '生产部', team: 'A班', position: '采摘工', work_area: '草莓大棚区', skill_level: '初级', skill_tags: '采摘技能,修剪整枝', work_years: 1, wages_type: '计件', hourly_rate: 0, hire_date: '2024-01-10', contract_status: '新签', contract_type: '固定期限', contract_expire_date: '2025-01-09', contract_no: 'HT-2024-001', education: '初中', major: '', training_records: '[{"id":"TR008","trainingDate":"2024-01-15","trainingType":"岗前培训","trainingContent":"采摘技术基础","trainingHours":8,"trainer":"张伟民","score":82}]', work_experiences: '[]', annual_assessments: '[]', status: '在职', remarks: '新员工，手脚麻利', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'W009', worker_id: 'EMP20240009', name: '郑胜利', gender: '男', age: 38, birth_date: '1986-12-28', id_card: '320105198612281234', phone: '13190123456', email: 'zhengsl@example.com', wechat: 'zhengshengli1986', address: '江苏省南京市浦口区江浦街道9号', residence_address: '江苏省南京市浦口区旭日学府12栋301室', emergency_contact: '郑华', emergency_relation: '妻子', emergency_phone: '13090123456', department: '生产部', team: 'B班', position: '打药工', work_area: '日光温室区域', skill_level: '高级', skill_tags: '打药操作,病虫害防治,施肥作业', work_years: 10, wages_type: '计时', hourly_rate: 32, hire_date: '2020-03-01', contract_status: '续签', contract_type: '固定期限', contract_expire_date: '2026-02-28', contract_no: 'HT-2020-005', education: '初中', major: '', training_records: '[{"id":"TR009","trainingDate":"2022-04-10","trainingType":"安全培训","trainingContent":"农药安全使用","trainingHours":12,"trainer":"刘大海","certificate":"农药操作证","score":91}]', work_experiences: '[{"id":"WE009","company":"山东寿光蔬菜基地","position":"打药工","startDate":"2014-06-01","endDate":"2020-02-20","workContent":"大棚打药与病虫害防治","leavingReason":"返乡就业"}]', annual_assessments: '[{"id":"AS009","year":2024,"assessmentDate":"2024-12-17","assessor":"王建国","rating":"优秀","score":91,"strengths":"打药技术熟练，效率高","weaknesses":"团队协作意识待加强","goals":"竞聘班长"}]', status: '在职', remarks: '打药效率第一人', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'W010', worker_id: 'EMP20240010', name: '陈小芳', gender: '女', age: 24, birth_date: '2000-03-14', id_card: '320106200003141234', phone: '13001234567', email: 'chenxf@example.com', wechat: 'chenxiaofang2000', address: '江苏省南京市秦淮区中华路街道10号', residence_address: '江苏省南京市秦淮区雅居乐花园13栋202室', emergency_contact: '陈伟', emergency_relation: '父亲', emergency_phone: '13901234567', department: '生产部', team: 'C班', position: '种植工', work_area: '生菜大棚区', skill_level: '初级', skill_tags: '浇水灌溉,采摘技能', work_years: 1, wages_type: '计件', hourly_rate: 0, hire_date: '2024-03-15', contract_status: '新签', contract_type: '固定期限', contract_expire_date: '2025-03-14', contract_no: 'HT-2024-005', education: '初中', major: '', training_records: '[{"id":"TR010","trainingDate":"2024-03-20","trainingType":"岗前培训","trainingContent":"叶菜种植技术","trainingHours":8,"trainer":"王建国","score":80}]', work_experiences: '[]', annual_assessments: '[]', status: '在职', remarks: '年轻员工，可塑性强', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
  ];

  for (const worker of workers) {
    db.run(`
      INSERT OR REPLACE INTO workers
      (id, worker_id, name, gender, age, birth_date, id_card, phone, email, wechat,
       address, residence_address, emergency_contact, emergency_relation, emergency_phone,
       department, team, position, work_area, skill_level, skill_tags, work_years,
       wages_type, hourly_rate, hire_date, contract_status, contract_type, contract_expire_date,
       contract_no, education, major, training_records, work_experiences, annual_assessments,
       status, remarks, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      worker.id, worker.worker_id, worker.name, worker.gender, worker.age, worker.birth_date, worker.id_card,
      worker.phone, worker.email, worker.wechat, worker.address, worker.residence_address,
      worker.emergency_contact, worker.emergency_relation, worker.emergency_phone,
      worker.department, worker.team, worker.position, worker.work_area, worker.skill_level, worker.skill_tags,
      worker.work_years, worker.wages_type, worker.hourly_rate, worker.hire_date,
      worker.contract_status, worker.contract_type, worker.contract_expire_date, worker.contract_no,
      worker.education, worker.major, worker.training_records, worker.work_experiences,
      worker.annual_assessments, worker.status, worker.remarks, worker.create_time, worker.update_time
    ]);
  }

  console.log(`已导入 ${workers.length} 条员工数据`);
}

/**
 * 导入采购计划数据（完整版）
 * 注意：字段名必须与数据库schema保持一致
 */
function seedBusinessPurchasePlans() {
  const db = getDatabase();

  // 计算总金额
  const calculateTotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + (item.estimated_total_price || 0), 0);
  };

  const purchasePlans = [
    {
      id: 'PP001',
      plan_code: 'PA202601001',
      plan_title: '生产物资采购 - PA202601001',
      plan_type: 'production',
      department_id: '',
      department_name: '生产部',
      applicant_id: 'U003',
      applicant_name: '郭靖',
      apply_date: '2026-01-05',
      expected_date: '2026-02-15',
      supplier_id: '',
      supplier_name: '',
      total_amount: calculateTotal([
        { estimated_total_price: 6000 },
        { estimated_total_price: 2550 },
      ]),
      priority: 'high',
      status: 'completed',
      approval_status: 'approved',
      remarks: '春季番茄种植基肥和追肥采购',
      attachments: JSON.stringify([]),
      related_batch_code: 'ZZB2026-001',
      approval_person: 'Susan',
      items: JSON.stringify([
        { id: 'I001', related_batch_code: 'ZZB2026-001', material_id: 'MT001', material_code: 'SP0202001', material_name: '尿素', category: '肥料与土壤改良剂-化学肥料', specification: '46% 50kg/袋', unit: '袋', quantity: 50, estimated_price: 120, estimated_total_price: 6000, supplier: '鑫源农资公司', location: 'A区-01-01', batch_no: 'F20240101', production_date: '2024-01-10', expiry_date: '2026-01-10', purpose: '春季基肥施用', remark: '用于番茄种植区' },
        { id: 'I002', related_batch_code: 'ZZB2026-001', material_id: 'MT002', material_code: 'SP0201001', material_name: '商品有机肥', category: '肥料与土壤改良剂-有机肥', specification: '40kg/袋', unit: '袋', quantity: 30, estimated_price: 85, estimated_total_price: 2550, supplier: '鑫源农资公司', location: 'A区-01-02', batch_no: 'U20240102', production_date: '2024-01-15', expiry_date: '2026-01-15', purpose: '追肥使用', remark: '分两次施用' },
      ]),
      create_by: '郭靖',
      create_time: '2026-01-05T10:00:00.000Z',
      update_time: '2026-02-15T10:00:00.000Z'
    },
    {
      id: 'PP002',
      plan_code: 'PA202601002',
      plan_title: '生产物资采购 - PA202601002',
      plan_type: 'production',
      department_id: '',
      department_name: '生产部',
      applicant_id: 'U003',
      applicant_name: '黄蓉',
      apply_date: '2026-02-10',
      expected_date: '2026-03-20',
      supplier_id: '',
      supplier_name: '',
      total_amount: calculateTotal([
        { estimated_total_price: 6000 },
        { estimated_total_price: 5100 },
      ]),
      priority: 'high',
      status: 'in_progress',
      approval_status: 'approved',
      remarks: '黄瓜种植水溶肥和尿素采购',
      attachments: JSON.stringify([]),
      related_batch_code: 'ZZB2026-002',
      approval_person: 'Susan',
      items: JSON.stringify([
        { id: 'I003', related_batch_code: 'ZZB2026-002', material_id: 'MT003', material_code: 'SP0203001', material_name: '水溶肥', category: '肥料与土壤改良剂-水溶肥', specification: '20-20-20 5kg/袋', unit: '袋', quantity: 40, estimated_price: 150, estimated_total_price: 6000, supplier: '丰达化肥厂', location: 'A区-02-01', batch_no: 'WF20240201', production_date: '2024-02-01', expiry_date: '2025-08-01', purpose: '叶面喷施', remark: '稀释1000倍使用' },
        { id: 'I004', related_batch_code: 'ZZB2026-002', material_id: 'MT002', material_code: 'SP0202001', material_name: '尿素', category: '肥料与土壤改良剂-化学肥料', specification: '46% 50kg/袋', unit: '袋', quantity: 60, estimated_price: 85, estimated_total_price: 5100, supplier: '丰达化肥厂', location: 'A区-01-02', batch_no: 'U20240201', production_date: '2024-02-05', expiry_date: '2026-02-05', purpose: '根部追肥', remark: '分三次施用' },
      ]),
      create_by: '黄蓉',
      create_time: '2026-02-10T10:00:00.000Z',
      update_time: '2026-03-20T10:00:00.000Z'
    },
    {
      id: 'PP003',
      plan_code: 'PA202601003',
      plan_title: '生产物资采购 - PA202601003',
      plan_type: 'production',
      department_id: '',
      department_name: '生产部',
      applicant_id: 'U003',
      applicant_name: '杨过',
      apply_date: '2026-03-01',
      expected_date: '2026-05-01',
      supplier_id: '',
      supplier_name: '',
      total_amount: calculateTotal([
        { estimated_total_price: 9600 },
        { estimated_total_price: 9000 },
      ]),
      priority: 'high',
      status: 'pending',
      approval_status: 'pending',
      remarks: '茄子种植基地夏季肥料储备',
      attachments: JSON.stringify([]),
      related_batch_code: 'SC202604001',
      approval_person: 'Susan',
      items: JSON.stringify([
        { id: 'I005', related_batch_code: 'SC202604001', material_id: 'MT001', material_code: 'SP0202001', material_name: '尿素', category: '肥料与土壤改良剂-化学肥料', specification: '46% 50kg/袋', unit: '袋', quantity: 80, estimated_price: 120, estimated_total_price: 9600, supplier: '待确定', location: '待分配', batch_no: '', production_date: '', expiry_date: '2026-05-01', purpose: '夏季基肥', remark: '用于黄瓜种植区' },
        { id: 'I006', related_batch_code: 'SC202604001', material_id: 'MT003', material_code: 'SP0203001', material_name: '水溶肥', category: '肥料与土壤改良剂-水溶肥', specification: '20-20-20 5kg/袋', unit: '袋', quantity: 60, estimated_price: 150, estimated_total_price: 9000, supplier: '待确定', location: '待分配', batch_no: '', production_date: '', expiry_date: '2025-11-01', purpose: '滴灌施用', remark: '配合滴灌系统使用' },
      ]),
      create_by: '杨过',
      create_time: '2026-03-01T10:00:00.000Z',
      update_time: '2026-03-01T10:00:00.000Z'
    },
    {
      id: 'PP004',
      plan_code: 'PA202601004',
      plan_title: '生产物资采购 - PA202601004',
      plan_type: 'production',
      department_id: '',
      department_name: '生产部',
      applicant_id: 'U004',
      applicant_name: '小龙女',
      apply_date: '2026-03-10',
      expected_date: '2026-04-15',
      supplier_id: '',
      supplier_name: '',
      total_amount: calculateTotal([
        { estimated_total_price: 2500 },
        { estimated_total_price: 1440 },
      ]),
      priority: 'normal',
      status: 'pending',
      approval_status: 'pending',
      remarks: '辣椒病虫害防治农药采购',
      attachments: JSON.stringify([]),
      related_batch_code: 'SC202604002',
      approval_person: 'Susan',
      items: JSON.stringify([
        { id: 'I007', related_batch_code: 'SC202604002', material_id: 'MT004', material_code: 'SP0301001', material_name: '吡虫啉', category: '农药与植保产品-杀虫剂', specification: '10% 100g/袋', unit: '袋', quantity: 100, estimated_price: 25, estimated_total_price: 2500, supplier: '拜耳作物科学', location: 'B区-01-01', batch_no: 'P20240301', production_date: '2024-01-20', expiry_date: '2026-01-20', purpose: '防治蚜虫和白粉虱', remark: '安全间隔期7天' },
        { id: 'I008', related_batch_code: 'SC202604002', material_id: 'MT005', material_code: 'SP0302001', material_name: '多菌灵', category: '农药与植保产品-杀菌剂', specification: '50% 200g/袋', unit: '袋', quantity: 80, estimated_price: 18, estimated_total_price: 1440, supplier: '拜耳作物科学', location: 'B区-01-02', batch_no: 'P20240302', production_date: '2024-02-10', expiry_date: '2026-02-10', purpose: '防治灰霉病和早疫病', remark: '可与吡虫啉混用' },
      ]),
      create_by: '小龙女',
      create_time: '2026-03-10T10:00:00.000Z',
      update_time: '2026-03-10T10:00:00.000Z'
    },
    {
      id: 'PP005',
      plan_code: 'PA202602001',
      plan_title: '劳保用品采购 - PA202602001',
      plan_type: 'safety',
      department_id: '',
      department_name: '后勤部',
      applicant_id: 'U005',
      applicant_name: '张无忌',
      apply_date: '2026-03-12',
      expected_date: '2026-03-25',
      supplier_id: '',
      supplier_name: '',
      total_amount: calculateTotal([
        { estimated_total_price: 1600 },
        { estimated_total_price: 1250 },
      ]),
      priority: 'low',
      status: 'completed',
      approval_status: 'approved',
      remarks: '第二季度生产车间劳保用品配发',
      attachments: JSON.stringify([]),
      related_batch_code: '',
      approval_person: 'Susan',
      items: JSON.stringify([
        { id: 'I009', related_batch_code: '', material_id: 'SA001', material_code: 'SP0501001', material_name: '防护手套', category: '劳保用品-手部防护', specification: 'PU涂层 L码', unit: '双', quantity: 200, estimated_price: 8, estimated_total_price: 1600, supplier: '安全用品批发中心', location: '仓库C区-02-01', batch_no: '', production_date: '', expiry_date: '', purpose: '大棚作业防护', remark: '适合大棚潮湿环境使用' },
        { id: 'I010', related_batch_code: '', material_id: 'SA002', material_code: 'SP0502001', material_name: '安全帽', category: '劳保用品-头部防护', specification: 'ABS塑料 蓝色', unit: '个', quantity: 50, estimated_price: 25, estimated_total_price: 1250, supplier: '安全用品批发中心', location: '仓库C区-02-02', batch_no: '', production_date: '', expiry_date: '', purpose: '车间施工防护', remark: '符合GB标准' },
      ]),
      create_by: '张无忌',
      create_time: '2026-03-12T10:00:00.000Z',
      update_time: '2026-03-25T10:00:00.000Z'
    },
    {
      id: 'PP006',
      plan_code: 'PA202602002',
      plan_title: '通用物资采购 - PA202602002',
      plan_type: 'material',
      department_id: '',
      department_name: '办公室',
      applicant_id: 'U007',
      applicant_name: '令狐冲',
      apply_date: '2026-04-02',
      expected_date: '2026-04-10',
      supplier_id: '',
      supplier_name: '',
      total_amount: calculateTotal([
        { estimated_total_price: 1100 },
        { estimated_total_price: 300 },
        { estimated_total_price: 300 },
      ]),
      priority: 'normal',
      status: 'completed',
      approval_status: 'approved',
      remarks: '办公区域日常用品采购',
      attachments: JSON.stringify([]),
      related_batch_code: '',
      approval_person: 'Susan',
      items: JSON.stringify([
        { id: 'I011', related_batch_code: '', material_id: 'OF001', material_code: 'SP0601001', material_name: '打印纸', category: '办公用品-纸张', specification: 'A4 70g 500张/包', unit: '包', quantity: 50, estimated_price: 22, estimated_total_price: 1100, supplier: '得力文具供应商', location: '办公室仓库', batch_no: '', production_date: '', expiry_date: '', purpose: '日常办公使用', remark: '' },
        { id: 'I012', related_batch_code: '', material_id: 'OF002', material_code: 'SP0602001', material_name: '中性笔', category: '办公用品-书写工具', specification: '黑色 0.5mm', unit: '支', quantity: 200, estimated_price: 1.5, estimated_total_price: 300, supplier: '得力文具供应商', location: '办公室仓库', batch_no: '', production_date: '', expiry_date: '', purpose: '日常办公使用', remark: '每季度配发一次' },
        { id: 'I013', related_batch_code: '', material_id: 'OF003', material_code: 'SP0603001', material_name: '垃圾桶', category: '办公用品-清洁用品', specification: '塑料 10L', unit: '个', quantity: 20, estimated_price: 15, estimated_total_price: 300, supplier: '得力文具供应商', location: '办公室各楼层', batch_no: '', production_date: '', expiry_date: '', purpose: '办公室日常清洁', remark: '按楼层配置' },
      ]),
      create_by: '令狐冲',
      create_time: '2026-04-02T10:00:00.000Z',
      update_time: '2026-04-10T10:00:00.000Z'
    },
    {
      id: 'PP007',
      plan_code: 'PA202603001',
      plan_title: '设备采购 - PA202603001',
      plan_type: 'equipment',
      department_id: '',
      department_name: '技术部',
      applicant_id: 'U006',
      applicant_name: '任我行',
      apply_date: '2026-04-02',
      expected_date: '2026-05-15',
      supplier_id: '',
      supplier_name: '',
      total_amount: calculateTotal([
        { estimated_total_price: 11600 },
        { estimated_total_price: 4800 },
      ]),
      priority: 'urgent',
      status: 'pending',
      approval_status: 'pending',
      remarks: '番茄基地环境监测设备升级',
      attachments: JSON.stringify([]),
      related_batch_code: 'SC202603001',
      approval_person: 'Susan',
      items: JSON.stringify([
        { id: 'I014', related_batch_code: 'SC202603001', material_id: 'IT001', material_code: 'IT0101001', material_name: '土壤温湿度传感器', category: '监测设备-传感器', specification: 'RS485 Modbus', unit: '个', quantity: 20, estimated_price: 580, estimated_total_price: 11600, supplier: '深圳传感科技', location: 'D区-01-01', batch_no: 'EQ20240401', production_date: '2024-03-15', expiry_date: '', purpose: '测量土壤温湿度和EC值', remark: '精度±0.5%' },
        { id: 'I015', related_batch_code: 'SC202603001', material_id: 'IT002', material_code: 'IT0102001', material_name: '温湿度记录仪', category: '监测设备-记录仪', specification: 'TH-200/台', unit: '台', quantity: 15, estimated_price: 320, estimated_total_price: 4800, supplier: '深圳传感科技', location: 'D区-01-02', batch_no: 'EQ20240402', production_date: '2024-03-20', expiry_date: '', purpose: '记录温室环境数据', remark: '数据可导出' },
      ]),
      create_by: '任我行',
      create_time: '2026-04-02T10:00:00.000Z',
      update_time: '2026-04-02T10:00:00.000Z'
    },
  ];

  for (const plan of purchasePlans) {
    db.run(`
      INSERT OR REPLACE INTO purchase_plans
      (id, plan_code, plan_title, plan_type, department_id, department_name,
       applicant_id, applicant_name, apply_date, expected_date,
       supplier_id, supplier_name, total_amount, priority, status, approval_status,
       remarks, attachments, items, related_batch_code, approval_person, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      plan.id, plan.plan_code, plan.plan_title, plan.plan_type, plan.department_id, plan.department_name,
      plan.applicant_id, plan.applicant_name, plan.apply_date, plan.expected_date,
      plan.supplier_id, plan.supplier_name, plan.total_amount, plan.priority, plan.status, plan.approval_status,
      plan.remarks, plan.attachments, plan.items, plan.related_batch_code, plan.approval_person, plan.create_by, plan.create_time, plan.update_time
    ]);
  }

  console.log(`已导入 ${purchasePlans.length} 条采购计划`);
}

/**
 * 导入物料申请数据（完整版）
 */
function seedBusinessMaterialRequests() {
  const db = getDatabase();

  const materialRequests = [
    { id: 'MR001', request_code: 'RQ20240315-001', batch_id: 'B002', batch_code: 'FQ2024-002', greenhouse_id: 'G002', greenhouse_name: '玻璃温室B区', requester_id: 'U003', requester_name: '王建国', request_date: '2024-03-15', materials: JSON.stringify([{ material_id: 'MT003', material_name: '水溶肥', required_quantity: 5, actual_quantity: 5, unit: '袋' }]), status: 'approved', approver_id: 'U002', approver_name: '李明辉', approve_date: '2024-03-15', approver_comment: '同意领取', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'MR002', request_code: 'RQ20240315-002', batch_id: 'B005', batch_code: 'FQ2024-005', greenhouse_id: 'G003', greenhouse_name: '玻璃温室C区', requester_id: 'U005', requester_name: '刘大海', request_date: '2024-03-14', materials: JSON.stringify([{ material_id: 'MT004', material_name: '吡虫啉', required_quantity: 3, actual_quantity: 0, unit: '袋' }, { material_id: 'MT005', material_name: '多菌灵', required_quantity: 2, actual_quantity: 0, unit: '袋' }]), status: 'pending', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'MR003', request_code: 'RQ20240315-003', batch_id: 'B001', batch_code: 'FQ2024-001', greenhouse_id: 'G001', greenhouse_name: '玻璃温室A区', requester_id: 'U003', requester_name: '王建国', request_date: '2024-03-13', materials: JSON.stringify([{ material_id: 'MT007', material_name: '椰糠', required_quantity: 50, actual_quantity: 50, unit: '袋' }, { material_id: 'MT008', material_name: '珍珠岩', required_quantity: 30, actual_quantity: 30, unit: '袋' }]), status: 'fulfilled', approver_id: 'U010', approver_name: '孙丽娜', approve_date: '2024-03-13', create_time: new Date().toISOString(), update_time: new Date().toISOString() },
  ];

  for (const req of materialRequests) {
    db.run(`
      INSERT OR REPLACE INTO material_requests
      (id, request_code, batch_id, batch_code, greenhouse_id, greenhouse_name,
       requester_id, requester_name, request_date, materials, status,
       approver_id, approver_name, approve_date, approver_comment, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      req.id, req.request_code, req.batch_id || '', req.batch_code || '', req.greenhouse_id || '', req.greenhouse_name || '',
      req.requester_id || '', req.requester_name || '', req.request_date || '', req.materials || '', req.status || '',
      req.approver_id || '', req.approver_name || '', req.approve_date || '', req.approver_comment || '', req.create_time || '', req.update_time || ''
    ]);
  }

  console.log(`已导入 ${materialRequests.length} 条物料申请`);
}

/**
 * 导入产品库存数据（完整版）
 */
function seedBusinessProduceInventory() {
  const db = getDatabase();

  const produceInventory = [
    // 种源库存
    { id: 'PI001', harvest_record_id: 'SR001', product_code: 'SE0301001', crop_name: '番茄', variety: '红果番茄', stock_type: 'seed', quantity: 500, unit: '粒', grade: 'A', quality: 'excellent', warehouse_id: 'W005', warehouse_name: '种源库', storage_location: 'S区-01-01', harvest_date: '2026-01-15', storage_date: '2026-01-16', expiration_date: '2027-01-15', alert_settings: JSON.stringify({ enable_storage_time_alert: true, storage_time_threshold: 180, enable_quantity_alert: true, min_quantity_threshold: 200, max_quantity_threshold: 1000, min_stock: 200, max_stock: 1000, expiration_days: 365 }), batch_code: 'SZ2026-001', greenhouse_name: '种源繁育中心', planting_mode: '种子繁殖', status: 'in_stock', inbound_records: JSON.stringify([{ id: 'IT001', type: 'inbound', quantity: 600, date: '2026-01-16', operator: '陆启闯', remarks: '种源入库' }]), outbound_records: JSON.stringify([{ id: 'OT001', type: 'outbound', quantity: 100, date: '2026-02-20', operator: '陆启闯', remarks: '发放给育苗车间' }]), create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'PI002', harvest_record_id: 'SR002', product_code: 'SE0201001', crop_name: '黄瓜', variety: '津春四号', stock_type: 'seed', quantity: 150, unit: '粒', grade: 'B', quality: 'good', warehouse_id: 'W005', warehouse_name: '种源库', storage_location: 'S区-01-02', harvest_date: '2026-02-01', storage_date: '2026-02-02', expiration_date: '2027-02-01', alert_settings: JSON.stringify({ enable_storage_time_alert: true, storage_time_threshold: 180, enable_quantity_alert: true, min_quantity_threshold: 100, max_quantity_threshold: 500, min_stock: 100, max_stock: 500, expiration_days: 365 }), batch_code: 'SZ2026-002', greenhouse_name: '种源繁育中心', planting_mode: '种子繁殖', status: 'low_stock', inbound_records: JSON.stringify([{ id: 'IT002', type: 'inbound', quantity: 300, date: '2026-02-02', operator: '陆启闯', remarks: '种源入库' }]), outbound_records: JSON.stringify([{ id: 'OT002', type: 'outbound', quantity: 150, date: '2026-03-10', operator: '陆启闯', remarks: '发放给育苗车间' }]), create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'PI003', harvest_record_id: 'SR003', product_code: 'SE0102001', crop_name: '生菜', variety: '奶油生菜', stock_type: 'seed', quantity: 800, unit: '粒', grade: 'A', quality: 'excellent', warehouse_id: 'W005', warehouse_name: '种源库', storage_location: 'S区-02-01', harvest_date: '2026-02-10', storage_date: '2026-02-11', expiration_date: '2027-02-10', alert_settings: JSON.stringify({ enable_storage_time_alert: true, storage_time_threshold: 180, enable_quantity_alert: true, min_quantity_threshold: 300, max_quantity_threshold: 1500, min_stock: 300, max_stock: 1500, expiration_days: 365 }), batch_code: 'SZ2026-003', greenhouse_name: '种源繁育中心', planting_mode: '种子繁殖', status: 'in_stock', inbound_records: JSON.stringify([{ id: 'IT003', type: 'inbound', quantity: 1000, date: '2026-02-11', operator: '陆启闯', remarks: '种源入库' }]), outbound_records: JSON.stringify([{ id: 'OT003', type: 'outbound', quantity: 200, date: '2026-03-15', operator: '陆启闯', remarks: '发放给育苗车间' }]), create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    // 种苗库存
    { id: 'PI004', harvest_record_id: 'SL001', product_code: 'SL0101001', crop_name: '草莓', variety: '红颜', stock_type: 'seedling', quantity: 2000, unit: '株', grade: 'A', quality: 'excellent', warehouse_id: 'W006', warehouse_name: '种苗库', storage_location: 'M区-01-01', harvest_date: '2026-03-01', storage_date: '2026-03-02', expiration_date: '2026-05-01', alert_settings: JSON.stringify({ enable_storage_time_alert: true, storage_time_threshold: 30, enable_quantity_alert: true, min_quantity_threshold: 500, max_quantity_threshold: 5000, min_stock: 500, max_stock: 5000, expiration_days: 60 }), batch_code: 'SM2026-001', greenhouse_name: '育苗温室A区', planting_mode: '穴盘育苗', status: 'in_stock', inbound_records: JSON.stringify([{ id: 'IT004', type: 'inbound', quantity: 2500, date: '2026-03-02', operator: '陆启闯', remarks: '种苗入库' }]), outbound_records: JSON.stringify([{ id: 'OT004', type: 'outbound', quantity: 500, date: '2026-03-20', operator: '陆启闯', remarks: '移栽到日光温室1号' }]), create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'PI005', harvest_record_id: 'SL002', product_code: 'SL0301001', crop_name: '番茄', variety: '樱桃番茄', stock_type: 'seedling', quantity: 50, unit: '株', grade: 'C', quality: 'average', warehouse_id: 'W006', warehouse_name: '种苗库', storage_location: 'M区-02-02', harvest_date: '2026-02-15', storage_date: '2026-02-16', expiration_date: '2026-03-15', alert_settings: JSON.stringify({ enable_storage_time_alert: true, storage_time_threshold: 15, enable_quantity_alert: true, min_quantity_threshold: 200, max_quantity_threshold: 2000, min_stock: 200, max_stock: 2000, expiration_days: 28 }), batch_code: 'SM2026-002', greenhouse_name: '育苗温室B区', planting_mode: '穴盘育苗', status: 'expired', inbound_records: JSON.stringify([{ id: 'IT005', type: 'inbound', quantity: 800, date: '2026-02-16', operator: '陆启闯', remarks: '种苗入库' }]), outbound_records: JSON.stringify([{ id: 'OT005', type: 'outbound', quantity: 750, date: '2026-03-01', operator: '陆启闯', remarks: '移栽及淘汰' }]), create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'PI006', harvest_record_id: 'SL003', product_code: 'SL0304001', crop_name: '辣椒', variety: '螺丝椒', stock_type: 'seedling', quantity: 300, unit: '株', grade: 'B', quality: 'good', warehouse_id: 'W006', warehouse_name: '种苗库', storage_location: 'M区-03-01', harvest_date: '2026-03-05', storage_date: '2026-03-06', expiration_date: '2026-04-20', alert_settings: JSON.stringify({ enable_storage_time_alert: true, storage_time_threshold: 25, enable_quantity_alert: true, min_quantity_threshold: 500, max_quantity_threshold: 2000, min_stock: 500, max_stock: 2000, expiration_days: 45 }), batch_code: 'SM2026-003', greenhouse_name: '育苗温室A区', planting_mode: '穴盘育苗', status: 'low_stock', inbound_records: JSON.stringify([{ id: 'IT006', type: 'inbound', quantity: 600, date: '2026-03-06', operator: '陆启闯', remarks: '种苗入库' }]), outbound_records: JSON.stringify([{ id: 'OT006', type: 'outbound', quantity: 300, date: '2026-03-18', operator: '陆启闯', remarks: '移栽到日光温室2号' }]), create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    // 成品库存
    { id: 'PI007', harvest_record_id: 'H001', product_code: 'FR0101001', crop_name: '草莓', variety: '红颜', stock_type: 'product', quantity: 150, unit: '公斤', grade: 'A', quality: 'excellent', warehouse_id: 'W001', warehouse_name: '成品冷库A区', storage_location: 'A区-01-03', harvest_date: '2026-03-14', storage_date: '2026-03-15', expiration_date: '2026-04-14', alert_settings: JSON.stringify({ enable_storage_time_alert: true, storage_time_threshold: 25, enable_quantity_alert: true, min_quantity_threshold: 50, max_quantity_threshold: 300, min_stock: 50, max_stock: 300, expiration_days: 30 }), batch_code: 'FQ2026-003', greenhouse_name: '日光温室1号', planting_mode: '土壤种植', status: 'in_stock', inbound_records: JSON.stringify([{ id: 'IT007', type: 'inbound', quantity: 200, date: '2026-03-15', operator: '陆启闯', remarks: '采收入库' }]), outbound_records: JSON.stringify([{ id: 'OT007', type: 'outbound', quantity: 50, date: '2026-03-20', operator: '陆启闯', remarks: '销售出库' }]), create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'PI008', harvest_record_id: 'H002', product_code: 'PD0201001', crop_name: '黄瓜', variety: '津春四号', stock_type: 'product', quantity: 0, unit: '公斤', grade: 'B', quality: 'good', warehouse_id: 'W002', warehouse_name: '成品冷库B区', storage_location: 'B区-01-05', harvest_date: '2026-03-10', storage_date: '2026-03-11', expiration_date: '2026-03-25', alert_settings: JSON.stringify({ enable_storage_time_alert: true, storage_time_threshold: 10, enable_quantity_alert: true, min_quantity_threshold: 100, max_quantity_threshold: 500, min_stock: 100, max_stock: 500, expiration_days: 14 }), batch_code: 'FQ2026-008', greenhouse_name: '日光温室2号', planting_mode: '土壤种植', status: 'out_of_stock', inbound_records: JSON.stringify([{ id: 'IT008', type: 'inbound', quantity: 300, date: '2026-03-11', operator: '陆启闯', remarks: '采收入库' }]), outbound_records: JSON.stringify([{ id: 'OT008', type: 'outbound', quantity: 300, date: '2026-03-20', operator: '陆启闯', remarks: '全部销售出库' }]), create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'PI009', harvest_record_id: 'H003', product_code: 'PD0102001', crop_name: '生菜', variety: '罗马生菜', stock_type: 'product', quantity: 35, unit: '公斤', grade: 'A', quality: 'excellent', warehouse_id: 'W001', warehouse_name: '成品冷库A区', storage_location: 'A区-02-04', harvest_date: '2026-03-25', storage_date: '2026-03-26', expiration_date: '2026-04-02', alert_settings: JSON.stringify({ enable_storage_time_alert: true, storage_time_threshold: 5, enable_quantity_alert: true, min_quantity_threshold: 50, max_quantity_threshold: 200, min_stock: 50, max_stock: 200, expiration_days: 7 }), batch_code: 'FQ2026-009', greenhouse_name: '日光温室3号', planting_mode: '水培', status: 'low_stock', inbound_records: JSON.stringify([{ id: 'IT009', type: 'inbound', quantity: 100, date: '2026-03-26', operator: '陆启闯', remarks: '采收入库' }]), outbound_records: JSON.stringify([{ id: 'OT009', type: 'outbound', quantity: 65, date: '2026-03-28', operator: '陆启闯', remarks: '销售出库' }]), create_time: new Date().toISOString(), update_time: new Date().toISOString() },
  ];

  for (const inv of produceInventory) {
    db.run(`
      INSERT OR REPLACE INTO produce_inventory
      (id, harvest_record_id, product_code, crop_name, variety, stock_type, quantity, unit,
       grade, quality, warehouse_id, warehouse_name, storage_location, harvest_date, storage_date,
       expiration_date, alert_settings, batch_code, greenhouse_name, planting_mode, status,
       inbound_records, outbound_records, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      inv.id, inv.harvest_record_id, inv.product_code, inv.crop_name, inv.variety, inv.stock_type,
      inv.quantity, inv.unit, inv.grade, inv.quality, inv.warehouse_id, inv.warehouse_name,
      inv.storage_location, inv.harvest_date, inv.storage_date, inv.expiration_date,
      inv.alert_settings, inv.batch_code, inv.greenhouse_name, inv.planting_mode, inv.status,
      inv.inbound_records, inv.outbound_records, inv.create_time, inv.update_time
    ]);
  }

  console.log(`已导入 ${produceInventory.length} 条产品库存`);
}

/**
 * 导入采收记录数据（完整版）
 */
function seedBusinessHarvestRecords() {
  const db = getDatabase();

  const harvestRecords = [
    { id: 'H001', harvest_code: 'HS20260314-001', source_id: 'PL001', source_name: 'ZZ202604001', crop_name: '草莓', crop_variety: '红颜', greenhouse_id: 'G004', greenhouse_name: '日光温室1号', harvest_date: '2026-03-14', harvest_quantity: 120, unit: '公斤', quality: 'good', grade: 'A', harvester_ids: '["U008"]', harvester_names: '小龙女', warehouse_id: 'W001', warehouse_name: '冷库A区', status: 'stored', auditor: '陆启闯', planting_mode: '土壤种植', target_yield: 3000, create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'H002', harvest_code: 'HS20260313-001', source_id: 'PL002', source_name: 'ZZ202604002', crop_name: '生菜', crop_variety: '散叶生菜', greenhouse_id: 'G005', greenhouse_name: '日光温室2号', harvest_date: '2026-03-13', harvest_quantity: 350, unit: '公斤', quality: 'excellent', grade: 'A', harvester_ids: '["U006","U007"]', harvester_names: '郭靖,黄蓉', warehouse_id: 'W002', warehouse_name: '冷库B区', status: 'pending', auditor: '陆启闯', planting_mode: '水培', target_yield: 5000, create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'H003', harvest_code: 'HS20260312-001', source_id: 'PL003', source_name: 'ZZ202604003', crop_name: '菠菜', crop_variety: '圆叶菠菜', greenhouse_id: 'G008', greenhouse_name: '塑料大棚1号', harvest_date: '2026-03-12', harvest_quantity: 280, unit: '公斤', quality: 'good', grade: 'B', harvester_ids: '["U006"]', harvester_names: '杨过', warehouse_id: 'W002', warehouse_name: '冷库B区', status: 'harvesting', auditor: '陆启闯', planting_mode: '土壤种植', target_yield: 4000, create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'H004', harvest_code: 'HS20260310-001', source_id: 'PL004', source_name: 'ZZ202604004', crop_name: '番茄', crop_variety: '红果番茄', greenhouse_id: 'G001', greenhouse_name: '玻璃温室A区', harvest_date: '2026-03-10', harvest_quantity: 1850, unit: '公斤', quality: 'excellent', grade: 'A', harvester_ids: '["U006","U007","U008"]', harvester_names: '张无忌,令狐冲,段誉', warehouse_id: 'W001', warehouse_name: '冷库A区', status: 'harvested', auditor: '陆启闯', planting_mode: '椰糠种植', target_yield: 30000, create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'H005', harvest_code: 'HS20260315-001', source_id: 'PL005', source_name: 'ZZ202604005', crop_name: '黄瓜', crop_variety: '水果黄瓜', greenhouse_id: 'G002', greenhouse_name: '玻璃温室B区', harvest_date: '2026-03-15', harvest_quantity: 680, unit: '公斤', quality: 'excellent', grade: 'A', harvester_ids: '["U007","U008"]', harvester_names: '萧峰,虚竹', warehouse_id: 'W001', warehouse_name: '冷库A区', status: 'graded', auditor: '陆启闯', planting_mode: '椰糠种植', target_yield: 20000, create_time: new Date().toISOString(), update_time: new Date().toISOString() },
    { id: 'H006', harvest_code: 'HS20260316-001', source_id: 'PL006', source_name: 'ZZ202604006', crop_name: '辣椒', crop_variety: '青椒', greenhouse_id: 'G003', greenhouse_name: '玻璃温室C区', harvest_date: '2026-03-16', harvest_quantity: 420, unit: '公斤', quality: 'good', grade: 'B', harvester_ids: '["U006"]', harvester_names: '周伯通', warehouse_id: 'W002', warehouse_name: '冷库B区', status: 'stored', auditor: '陆启闯', planting_mode: '椰糠种植', target_yield: 15000, create_time: new Date().toISOString(), update_time: new Date().toISOString() },
  ];

  for (const record of harvestRecords) {
    db.run(`
      INSERT OR REPLACE INTO harvest_records
      (id, harvest_code, source_id, source_name, crop_name, crop_variety, greenhouse_id, greenhouse_name,
       harvest_date, harvest_quantity, unit, quality, grade, harvester_ids, harvester_names,
       warehouse_id, warehouse_name, status, auditor, planting_mode, target_yield, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      record.id, record.harvest_code, record.source_id, record.source_name, record.crop_name,
      record.crop_variety, record.greenhouse_id, record.greenhouse_name, record.harvest_date,
      record.harvest_quantity, record.unit, record.quality, record.grade, record.harvester_ids,
      record.harvester_names, record.warehouse_id, record.warehouse_name, record.status,
      record.auditor, record.planting_mode, record.target_yield, record.create_time, record.update_time
    ]);
  }

  console.log(`已导入 ${harvestRecords.length} 条采收记录`);
}

/**
 * 导入业务审批数据（完整版）
 */
function seedBusinessApprovals() {
  const db = getDatabase();

  const approvals = [
    {
      id: 'MAT-AP-001', code: 'LL20260301001', type: 'material_request', type_name: '领料单',
      category: 'business', title: '郭靖的领料申请', description: '申请从仓库A区领取肥料，用于襄阳城防种植基地',
      applicant_id: 'U003', applicant_name: '郭靖', applicant_department: '生产部',
      apply_date: '2026-03-01', apply_time: '08:30:00', current_step: 1, total_steps: 1,
      approvers: JSON.stringify([{ userId: 'U002', userName: '黄药师', role: '审批人', order: 1, status: 'pending' }]),
      records: '[]', status: 'pending', priority: 'high', reminder_count: 0,
      related_batch_code: 'SC202603001', business_link: JSON.stringify({
        type: 'material', request_id: '1', request_code: 'LL20260301001',
        warehouse_location: '仓库A区', plant_area: '1号大棚/番茄种植区',
        batch_code: 'SC202603001', materials: [
          { material_id: 'SP0201001', material_code: 'SP0201001', material_name: '商品有机肥', spec: '50kg/袋', unit: '袋', requested_quantity: 10, stock_quantity: 100, unit_price: 120.00, warehouse_position: 'A区-01-01', remark: '有机肥用于基肥' },
          { material_id: 'SP0202001', material_code: 'SP0202001', material_name: '尿素', spec: '50kg/袋', unit: '袋', requested_quantity: 5, stock_quantity: 80, unit_price: 95.00, warehouse_position: 'A区-01-02', remark: '追肥用' },
        ]
      }),
      create_time: '2026-03-01T08:30:00.000Z', update_time: '2026-03-01T08:30:00.000Z'
    },
    {
      id: 'MAT-AP-002', code: 'LL20260302002', type: 'material_request', type_name: '领料单',
      category: 'business', title: '杨过的领料申请', description: '申请从仓库B区领取农药，用于绝情谷基地',
      applicant_id: 'U004', applicant_name: '杨过', applicant_department: '生产部',
      apply_date: '2026-03-02', apply_time: '09:15:00', current_step: 1, total_steps: 1,
      approvers: JSON.stringify([{ userId: 'U002', userName: '郭靖', role: '审批人', order: 1, status: 'approved', comment: '同意领取', action_time: '2026-03-02T14:00:00.000Z' }]),
      records: JSON.stringify([{ id: 'REC-MAT-002', approval_id: 'MAT-AP-002', approver_id: 'U002', approver_name: '郭靖', action: 'approve', comment: '同意领取', action_time: '2026-03-02T14:00:00.000Z' }]),
      status: 'approved', priority: 'normal', reminder_count: 0,
      related_batch_code: 'SC202603002',
      create_time: '2026-03-02T09:15:00.000Z', update_time: '2026-03-02T14:00:00.000Z'
    },
    {
      id: 'MAT-AP-003', code: 'LL20260401003', type: 'material_request', type_name: '领料单',
      category: 'business', title: '张无忌的领料申请', description: '申请从仓库A区领取种子及育苗物资，用于明教光明顶基地',
      applicant_id: 'U005', applicant_name: '张无忌', applicant_department: '生产部',
      apply_date: '2026-04-01', apply_time: '07:45:00', current_step: 1, total_steps: 1,
      approvers: JSON.stringify([{ userId: 'U002', userName: '张三丰', role: '审批人', order: 1, status: 'pending' }]),
      records: '[]', status: 'pending', priority: 'high', reminder_count: 0,
      related_batch_code: 'SC202604001',
      create_time: '2026-04-01T07:45:00.000Z', update_time: '2026-04-01T07:45:00.000Z'
    },
    {
      id: 'MAT-AP-004', code: 'LL20260402004', type: 'material_request', type_name: '领料单',
      category: 'business', title: '令狐冲的领料申请', description: '用于病虫害防治，需领取农药及喷洒设备',
      applicant_id: 'U006', applicant_name: '令狐冲', applicant_department: '技术部',
      apply_date: '2026-04-02', apply_time: '10:20:00', current_step: 1, total_steps: 1,
      approvers: JSON.stringify([{ userId: 'U002', userName: '任我行', role: '审批人', order: 1, status: 'approved', comment: '同意，优先处理', action_time: '2026-04-02T11:30:00.000Z' }]),
      records: JSON.stringify([{ id: 'REC-MAT-004', approval_id: 'MAT-AP-004', approver_id: 'U002', approver_name: '任我行', action: 'approve', comment: '同意，优先处理', action_time: '2026-04-02T11:30:00.000Z' }]),
      status: 'approved', priority: 'high', reminder_count: 0,
      related_batch_code: 'SC202604002',
      create_time: '2026-04-02T10:20:00.000Z', update_time: '2026-04-02T11:30:00.000Z'
    },
    {
      id: 'MAT-AP-005', code: 'LL20260403005', type: 'material_request', type_name: '领料单',
      category: 'business', title: '韦小宝的领料申请', description: '肥料采购，用于皇宫菜园追肥',
      applicant_id: 'U007', applicant_name: '韦小宝', applicant_department: '生产部',
      apply_date: '2026-04-03', apply_time: '14:00:00', current_step: 1, total_steps: 1,
      approvers: JSON.stringify([{ userId: 'U002', userName: '康熙', role: '审批人', order: 1, status: 'rejected', comment: '库存不足，请分批领取', action_time: '2026-04-03T16:00:00.000Z' }]),
      records: JSON.stringify([{ id: 'REC-MAT-005', approval_id: 'MAT-AP-005', approver_id: 'U002', approver_name: '康熙', action: 'reject', comment: '库存不足，请分批领取', action_time: '2026-04-03T16:00:00.000Z' }]),
      status: 'rejected', priority: 'normal', reminder_count: 1,
      related_batch_code: 'SC202604003',
      create_time: '2026-04-03T14:00:00.000Z', update_time: '2026-04-03T16:00:00.000Z'
    },
  ];

  for (const approval of approvals) {
    db.run(`
      INSERT OR REPLACE INTO approvals
      (id, code, type, type_name, category, title, description, applicant_id, applicant_name,
       applicant_department, apply_date, apply_time, current_step, total_steps, approvers, records,
       status, priority, reminder_count, related_batch_code, business_link, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      approval.id, approval.code, approval.type || '', approval.type_name || '', approval.category || '',
      approval.title || '', approval.description || '', approval.applicant_id || '', approval.applicant_name || '',
      approval.applicant_department || '', approval.apply_date || '', approval.apply_time || '',
      approval.current_step || 1, approval.total_steps || 1, approval.approvers || '[]', approval.records || '[]',
      approval.status || '', approval.priority || '', approval.reminder_count || 0, approval.related_batch_code || '',
      approval.business_link || '', approval.create_time || '', approval.update_time || ''
    ]);
  }

  console.log(`已导入 ${approvals.length} 条业务审批数据`);
}

/**
 * 导入生产退料种子数据
 */
function seedMaterialReturns() {
  const db = getDatabase();
  const existing = db.exec('SELECT COUNT(*) FROM material_returns');
  const count = Number(existing[0]?.values[0]?.[0]) || 0;
  if (count > 0) {
    console.log(`退料数据已存在 (${count} 条)，跳过导入`);
    return;
  }

  const now = new Date().toISOString();
  const returns = [
    { id: 'MTR001', code: 'TL20240301001', date: '2024-03-05', type: '生产退料', applicant: '李建国', department: '生产部', warehouseLocation: 'A区-01', status: '已完成', statusClass: 'completed', remark: '', operator: '郭靖', reviewer: '黄药师', reviewDate: '2024-03-05', rejectReason: '', materials: JSON.stringify([{ sourceApplicationCode: 'CK20240301001', materialCode: 'SP0103001', category: '种质资源-粮食作物种子', materialName: '番茄种子', spec: '50g/袋', unit: '袋', returnQuantity: 5, unitPrice: 12.5, warehousePosition: 'A区-01-01', reason: '质量问题', remark: '' }, { sourceApplicationCode: 'CK20240301001', materialCode: 'SP0201001', category: '肥料与土壤改良剂-有机肥', materialName: '商品有机肥', spec: '50kg/袋', unit: '袋', returnQuantity: 10, unitPrice: 85, warehousePosition: 'A区-01-02', reason: '规格不符', remark: '' }]) },
    { id: 'MTR002', code: 'TL20240302001', date: '2024-03-08', type: '生产退料', applicant: '王建华', department: '种植部', warehouseLocation: 'B区-03', status: '待审批', statusClass: 'pending', remark: '', operator: '杨过', reviewer: '小龙女', reviewDate: '', rejectReason: '', materials: JSON.stringify([{ sourceApplicationCode: 'CK20240302001', materialCode: 'SP0302001', category: '农药与植保产品-杀菌剂', materialName: '多菌灵', spec: '100g/瓶', unit: '箱', returnQuantity: 3, unitPrice: 45, warehousePosition: 'B区-03-01', reason: '过期产品', remark: '' }]) },
    { id: 'MTR003', code: 'TL20240303001', date: '2024-03-10', type: '生产退料', applicant: '李建国', department: '生产部', warehouseLocation: 'A区-02', status: '已审批', statusClass: 'approved', remark: '', operator: '张无忌', reviewer: '周芷若', reviewDate: '2024-03-10', rejectReason: '', materials: JSON.stringify([{ sourceApplicationCode: 'CK20240303001', materialCode: 'EQ0202001', category: '设施与装备类-覆盖材料', materialName: 'PO膜', spec: '2m×100m', unit: '㎡', returnQuantity: 50, unitPrice: 8.5, warehousePosition: 'A区-02-01', reason: '运输损坏', remark: '' }, { sourceApplicationCode: 'CK20240303001', materialCode: 'SP0301001', category: '农药与植保产品-杀虫剂', materialName: '吡虫啉', spec: '10g×10袋/盒', unit: '盒', returnQuantity: 20, unitPrice: 28, warehousePosition: 'A区-02-02', reason: '库存积压', remark: '' }]) },
    { id: 'MTR004', code: 'TL20240304001', date: '2024-03-12', type: '生产退料', applicant: '张建华', department: '设备部', warehouseLocation: 'C区-05', status: '已完成', statusClass: 'completed', remark: '', operator: '段誉', reviewer: '萧峰', reviewDate: '2024-03-12', rejectReason: '', materials: JSON.stringify([{ sourceApplicationCode: 'CK20240304001', materialCode: 'SP0202001', category: '肥料与土壤改良剂-化学肥料', materialName: '尿素', spec: '50kg/袋', unit: '袋', returnQuantity: 8, unitPrice: 95, warehousePosition: 'C区-05-01', reason: '质量问题', remark: '' }]) },
    { id: 'MTR005', code: 'TL20240305001', date: '2024-03-15', type: '生产退料', applicant: '赵技术', department: '种植部', warehouseLocation: 'B区-01', status: '已驳回', statusClass: 'rejected', remark: '不符合退货条件', operator: '陈家洛', reviewer: '霍青桐', reviewDate: '2024-03-15', rejectReason: '超出退料期限', materials: JSON.stringify([{ sourceApplicationCode: 'CK20240305001', materialCode: 'SP0202002', category: '肥料与土壤改良剂-化学肥料', materialName: '复合肥', spec: '25kg/袋', unit: '袋', returnQuantity: 15, unitPrice: 120, warehousePosition: 'B区-01-01', reason: '规格不符', remark: '' }]) },
    { id: 'MTR006', code: 'TL20240306001', date: '2024-03-16', type: '生产退料', applicant: '李建国', department: '生产部', warehouseLocation: 'A区-03', status: '待审批', statusClass: 'pending', remark: '', operator: '令狐冲', reviewer: '任盈盈', reviewDate: '', rejectReason: '', materials: JSON.stringify([{ sourceApplicationCode: 'CK20240306001', materialCode: 'PH0104001', category: '采后处理与流通类-包装材料', materialName: '农药瓶', spec: '500ml/瓶', unit: '瓶', returnQuantity: 30, unitPrice: 3.5, warehousePosition: 'A区-03-01', reason: '过期产品', remark: '' }]) },
    { id: 'MTR007', code: 'TL20240307001', date: '2024-03-17', type: '生产退料', applicant: '王建华', department: '种植部', warehouseLocation: 'B区-02', status: '已审批', statusClass: 'approved', remark: '', operator: '袁承志', reviewer: '夏雪宜', reviewDate: '2024-03-17', rejectReason: '', materials: JSON.stringify([{ sourceApplicationCode: 'CK20240307001', materialCode: 'EQ0202002', category: '设施与装备类-覆盖材料', materialName: '农用薄膜', spec: '5m×100m', unit: '卷', returnQuantity: 25, unitPrice: 150, warehousePosition: 'B区-02-01', reason: '质量问题', remark: '' }]) },
    { id: 'MTR008', code: 'TL20240308001', date: '2024-03-18', type: '生产退料', applicant: '张建华', department: '设备部', warehouseLocation: 'C区-01', status: '已完成', statusClass: 'completed', remark: '', operator: '胡斐', reviewer: '程灵素', reviewDate: '2024-03-18', rejectReason: '', materials: JSON.stringify([{ sourceApplicationCode: 'CK20240308001', materialCode: 'EQ0103001', category: '设施与装备类-植保机械', materialName: '电动喷雾机', spec: '16L', unit: '台', returnQuantity: 5, unitPrice: 280, warehousePosition: 'C区-01-01', reason: '运输损坏', remark: '' }]) },
    { id: 'MTR009', code: 'TL20240309001', date: '2024-03-19', type: '生产退料', applicant: '王技术', department: '生产部', warehouseLocation: 'A区-04', status: '已作废', statusClass: 'voided', remark: '已重新开单', operator: '虚竹', reviewer: '扫地僧', reviewDate: '2024-03-19', rejectReason: '', materials: JSON.stringify([{ sourceApplicationCode: 'CK20240309001', materialCode: 'SP0203001', category: '肥料与土壤改良剂-叶面肥', materialName: '磷酸二氢钾', spec: '500g/袋', unit: '袋', returnQuantity: 20, unitPrice: 35, warehousePosition: 'A区-04-01', reason: '其他', remark: '' }]) },
    { id: 'MTR010', code: 'TL20240310001', date: '2024-03-20', type: '生产退料', applicant: '赵建华', department: '种植部', warehouseLocation: 'B区-03', status: '已作废', statusClass: 'voided', remark: '重复申请', operator: '狄云', reviewer: '丁典', reviewDate: '2024-03-20', rejectReason: '', materials: JSON.stringify([{ sourceApplicationCode: 'CK20240310001', materialCode: 'EQ0301001', category: '设施与装备类-灌溉设备', materialName: '滴灌管', spec: '16mm×500m', unit: '卷', returnQuantity: 10, unitPrice: 180, warehousePosition: 'B区-03-01', reason: '规格不符', remark: '' }]) },
  ];

  for (const ret of returns) {
    db.run(`
      INSERT OR REPLACE INTO material_returns
      (id, code, date, type, applicant, department, warehouseLocation, status, statusClass,
       remark, operator, reviewer, reviewDate, rejectReason, materials, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ret.id, ret.code, ret.date, ret.type, ret.applicant, ret.department,
      ret.warehouseLocation, ret.status, ret.statusClass,
      ret.remark, ret.operator, ret.reviewer, ret.reviewDate, ret.rejectReason,
      ret.materials, now, now
    ]);
  }

  console.log(`已导入 ${returns.length} 条退料数据`);
}

/**
 * 导入所有业务数据
 */
export function seedAllBusinessData() {
  // 以下种子数据函数引用了 schema 中不存在的表或列，临时注释掉
  // seedBusinessCropBatches(); // crop_batches 表不存在
  // seedBusinessWorkers(); // workers 表不存在
  seedBusinessPurchasePlans(); // purchase_plans 表列已匹配
  // seedBusinessMaterialRequests(); // material_requests 表列不匹配
  // seedBusinessProduceInventory(); // produce_inventory 表不存在
  // seedBusinessHarvestRecords(); // harvest_records 表列不匹配
  // seedBusinessApprovals(); // approvals 表列不匹配
  seedBusinessTasks();
  seedBusinessInspectionRecords();
  seedBusinessTempTasks();
  seedMaterialCosts();
  seedEnergyCosts();
  seedMaterialReturns();

  saveDatabase();
  console.log('业务数据种子数据导入完成');
}

/**
 * 导入物料成本记录
 */
function seedMaterialCosts() {
  const db = getDatabase();

  const records = [
    {
      id: 'MC001',
      cost_code: 'MC202603001',
      cost_type: 'fertilizer',
      cost_name: '番茄基肥',
      category: '番茄',
      batch_id: 'BP001',
      batch_code: 'SC202603001',
      greenhouse_id: 'GH001',
      greenhouse_name: '1号大棚',
      crop_name: '番茄',
      material_name: '商品有机肥',
      material_type: 'fertilizer',
      unit: 'kg',
      quantity: 500,
      unit_price: 2.5,
      total_amount: 1250,
      cost_date: '2026-03-15',
      supplier_id: 'SUP001',
      supplier_name: '绿野农资公司',
      remarks: '用于番茄定植前基肥',
      create_by: 'U001',
      create_time: '2026-03-15T08:00:00.000Z',
      update_time: '2026-03-15T08:00:00.000Z'
    },
    {
      id: 'MC002',
      cost_code: 'MC202603002',
      cost_type: 'pesticide',
      cost_name: '番茄病虫害防治',
      category: '番茄',
      batch_id: 'BP001',
      batch_code: 'SC202603001',
      greenhouse_id: 'GH001',
      greenhouse_name: '1号大棚',
      crop_name: '番茄',
      material_name: '多菌灵',
      material_type: 'pesticide',
      unit: 'kg',
      quantity: 20,
      unit_price: 45,
      total_amount: 900,
      cost_date: '2026-03-20',
      supplier_id: 'SUP002',
      supplier_name: '中化农药化肥店',
      remarks: '番茄灰霉病防治',
      create_by: 'U001',
      create_time: '2026-03-20T09:00:00.000Z',
      update_time: '2026-03-20T09:00:00.000Z'
    },
    {
      id: 'MC003',
      cost_code: 'MC202603003',
      cost_type: 'seed',
      cost_name: '黄瓜种子',
      category: '黄瓜',
      batch_id: 'BP002',
      batch_code: 'SC202603002',
      greenhouse_id: 'GH002',
      greenhouse_name: '2号大棚',
      crop_name: '黄瓜',
      material_name: '黄瓜优选品种',
      material_type: 'seed',
      unit: '袋',
      quantity: 50,
      unit_price: 80,
      total_amount: 4000,
      cost_date: '2026-03-05',
      supplier_id: 'SUP003',
      supplier_name: '寿光蔬菜种苗公司',
      remarks: '黄瓜春季种植用种',
      create_by: 'U001',
      create_time: '2026-03-05T10:00:00.000Z',
      update_time: '2026-03-05T10:00:00.000Z'
    },
    {
      id: 'MC004',
      cost_code: 'MC202604001',
      cost_type: 'film',
      cost_name: '番茄地膜',
      category: '番茄',
      batch_id: 'BP001',
      batch_code: 'SC202603001',
      greenhouse_id: 'GH001',
      greenhouse_name: '1号大棚',
      crop_name: '番茄',
      material_name: '黑色地膜',
      material_type: 'film',
      unit: 'kg',
      quantity: 100,
      unit_price: 15,
      total_amount: 1500,
      cost_date: '2026-04-01',
      supplier_id: 'SUP001',
      supplier_name: '绿野农资公司',
      remarks: '保温保湿用黑色地膜',
      create_by: 'U002',
      create_time: '2026-04-01T08:00:00.000Z',
      update_time: '2026-04-01T08:00:00.000Z'
    },
    {
      id: 'MC005',
      cost_code: 'MC202604002',
      cost_type: 'fertilizer',
      cost_name: '黄瓜追肥',
      category: '黄瓜',
      batch_id: 'BP002',
      batch_code: 'SC202603002',
      greenhouse_id: 'GH002',
      greenhouse_name: '2号大棚',
      crop_name: '黄瓜',
      material_name: '复合肥(NPK)',
      material_type: 'fertilizer',
      unit: 'kg',
      quantity: 300,
      unit_price: 4.2,
      total_amount: 1260,
      cost_date: '2026-04-10',
      supplier_id: 'SUP001',
      supplier_name: '绿野农资公司',
      remarks: '黄瓜结果期追肥',
      create_by: 'U002',
      create_time: '2026-04-10T07:30:00.000Z',
      update_time: '2026-04-10T07:30:00.000Z'
    },
    {
      id: 'MC006',
      cost_code: 'MC202604003',
      cost_type: 'pesticide',
      cost_name: '黄瓜霜霉病防治',
      category: '黄瓜',
      batch_id: 'BP002',
      batch_code: 'SC202603002',
      greenhouse_id: 'GH002',
      greenhouse_name: '2号大棚',
      crop_name: '黄瓜',
      material_name: '杜邦克露',
      material_type: 'pesticide',
      unit: 'kg',
      quantity: 15,
      unit_price: 120,
      total_amount: 1800,
      cost_date: '2026-04-15',
      supplier_id: 'SUP002',
      supplier_name: '中化农药化肥店',
      remarks: '黄瓜霜霉病预防性喷施',
      create_by: 'U002',
      create_time: '2026-04-15T09:00:00.000Z',
      update_time: '2026-04-15T09:00:00.000Z'
    }
  ];

  for (const record of records) {
    db.run(`
      INSERT OR REPLACE INTO material_costs
      (id, cost_code, cost_type, cost_name, category, batch_id, batch_code,
       greenhouse_id, greenhouse_name, crop_name, material_name, material_type,
       unit, quantity, unit_price, total_amount, cost_date,
       supplier_id, supplier_name, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      record.id, record.cost_code, record.cost_type, record.cost_name, record.category,
      record.batch_id, record.batch_code, record.greenhouse_id, record.greenhouse_name,
      record.crop_name, record.material_name, record.material_type, record.unit,
      record.quantity, record.unit_price, record.total_amount, record.cost_date,
      record.supplier_id, record.supplier_name, record.remarks, record.create_by,
      record.create_time, record.update_time
    ]);
  }

  console.log(`已导入 ${records.length} 条物料成本记录`);
}

/**
 * 导入能源成本记录
 */
function seedEnergyCosts() {
  const db = getDatabase();

  const records = [
    {
      id: 'EC001',
      cost_code: 'EC202603001',
      cost_type: 'electricity',
      greenhouse_id: 'GH001',
      greenhouse_name: '1号大棚',
      batch_id: 'BP001',
      batch_code: 'SC202603001',
      crop_name: '番茄',
      quantity: 2500,
      unit: '度',
      unit_price: 0.6,
      total_amount: 1500,
      cost_date: '2026-03-31',
      meter_start: 10500,
      meter_end: 13000,
      remarks: '3月份电费（滴灌+通风设备）',
      create_by: 'U001',
      create_time: '2026-03-31T18:00:00.000Z',
      update_time: '2026-03-31T18:00:00.000Z',
      supplier_id: null,
      supplier_name: '国家电网'
    },
    {
      id: 'EC002',
      cost_code: 'EC202603002',
      cost_type: 'electricity',
      greenhouse_id: 'GH002',
      greenhouse_name: '2号大棚',
      batch_id: 'BP002',
      batch_code: 'SC202603002',
      crop_name: '黄瓜',
      quantity: 2800,
      unit: '度',
      unit_price: 0.6,
      total_amount: 1680,
      cost_date: '2026-03-31',
      meter_start: 8200,
      meter_end: 11000,
      remarks: '3月份电费（加湿+保温）',
      create_by: 'U001',
      create_time: '2026-03-31T18:00:00.000Z',
      update_time: '2026-03-31T18:00:00.000Z',
      supplier_id: null,
      supplier_name: '国家电网'
    },
    {
      id: 'EC003',
      cost_code: 'EC202604001',
      cost_type: 'electricity',
      greenhouse_id: 'GH001',
      greenhouse_name: '1号大棚',
      batch_id: 'BP001',
      batch_code: 'SC202603001',
      crop_name: '番茄',
      quantity: 3200,
      unit: '度',
      unit_price: 0.6,
      total_amount: 1920,
      cost_date: '2026-04-30',
      meter_start: 13000,
      meter_end: 16200,
      remarks: '4月份电费',
      create_by: 'U001',
      create_time: '2026-04-30T18:00:00.000Z',
      update_time: '2026-04-30T18:00:00.000Z',
      supplier_id: null,
      supplier_name: '国家电网'
    },
    {
      id: 'EC004',
      cost_code: 'EC202604002',
      cost_type: 'water',
      greenhouse_id: 'GH001',
      greenhouse_name: '1号大棚',
      batch_id: 'BP001',
      batch_code: 'SC202603001',
      crop_name: '番茄',
      quantity: 800,
      unit: '吨',
      unit_price: 3.5,
      total_amount: 2800,
      cost_date: '2026-04-30',
      meter_start: 4500,
      meter_end: 5300,
      remarks: '4月份水费（滴灌用水）',
      create_by: 'U001',
      create_time: '2026-04-30T18:00:00.000Z',
      update_time: '2026-04-30T18:00:00.000Z',
      supplier_id: null,
      supplier_name: '自来水公司'
    },
    {
      id: 'EC005',
      cost_code: 'EC202604003',
      cost_type: 'electricity',
      greenhouse_id: 'GH002',
      greenhouse_name: '2号大棚',
      batch_id: 'BP002',
      batch_code: 'SC202603002',
      crop_name: '黄瓜',
      quantity: 3500,
      unit: '度',
      unit_price: 0.6,
      total_amount: 2100,
      cost_date: '2026-04-30',
      meter_start: 11000,
      meter_end: 14500,
      remarks: '4月份电费',
      create_by: 'U001',
      create_time: '2026-04-30T18:00:00.000Z',
      update_time: '2026-04-30T18:00:00.000Z',
      supplier_id: null,
      supplier_name: '国家电网'
    }
  ];

  for (const record of records) {
    db.run(`
      INSERT OR REPLACE INTO energy_costs
      (id, cost_code, cost_type, greenhouse_id, greenhouse_name, batch_id, batch_code,
       crop_name, quantity, unit, unit_price, total_amount, cost_date,
       meter_start, meter_end, remarks, create_by, create_time, update_time,
       supplier_id, supplier_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      record.id, record.cost_code, record.cost_type, record.greenhouse_id, record.greenhouse_name,
      record.batch_id, record.batch_code, record.crop_name, record.quantity, record.unit,
      record.unit_price, record.total_amount, record.cost_date, record.meter_start,
      record.meter_end, record.remarks, record.create_by, record.create_time, record.update_time,
      record.supplier_id, record.supplier_name
    ]);
  }

  console.log(`已导入 ${records.length} 条能源成本记录`);
}

/**
 * 导出数据库
 */
export function exportDatabase() {
  seedCropVarieties();
  seedSuppliers();
  seedSeedSources();
  seedProductionPlans();
  seedSeedlings();
  seedPlantings();
  seedHarvestRecords();
  seedFarmTasks();
  seedLaborRecords();
  seedInspections();
  seedProblems();
  seedCropOrders();
  seedCropInstances();
  seedInventory();
  seedDictionaries();
  seedGreenhouses();
  seedZones();
  seedSystemConfigs();
  seedUsersAndRoles();
  seedAllBusinessData();
  seedMaterialCosts();
  seedEnergyCosts();

  saveDatabase();
  console.log('数据库种子数据导入完成');
}
