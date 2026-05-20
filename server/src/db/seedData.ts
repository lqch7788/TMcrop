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
      crop_code: 'PD010200600',  // 蔬菜类-叶菜类-生菜-红生菜 (PD+01+02+006+00)
      category_code: 'PD',
      category_name: '蔬菜类',
      type_code: '01',
      type_name: '叶菜类',
      variety_code: '02',
      variety_name: '生菜',
      sub_variety1_code: '006',
      sub_variety1_name: '红生菜',
      detail_variety_code: '00',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV002',
      crop_code: 'PD010100300',  // 蔬菜类-叶菜类-菠菜-大叶菠菜 (PD+01+01+003+00)
      category_code: 'PD',
      category_name: '蔬菜类',
      type_code: '01',
      type_name: '叶菜类',
      variety_code: '01',
      variety_name: '菠菜',
      sub_variety1_code: '003',
      sub_variety1_name: '大叶菠菜',
      detail_variety_code: '00',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV003',
      crop_code: 'PD030100600',  // 蔬菜类-茄果类-番茄-大番茄 (PD+03+01+006+00)
      category_code: 'PD',
      category_name: '蔬菜类',
      type_code: '03',
      type_name: '茄果类',
      variety_code: '01',
      variety_name: '番茄',
      sub_variety1_code: '006',
      sub_variety1_name: '大番茄',
      detail_variety_code: '00',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV004',
      crop_code: 'PD030400700',  // 蔬菜类-茄果类-辣椒-青椒 (PD+03+04+007+00)
      category_code: 'PD',
      category_name: '蔬菜类',
      type_code: '03',
      type_name: '茄果类',
      variety_code: '04',
      variety_name: '辣椒',
      sub_variety1_code: '007',
      sub_variety1_name: '青椒',
      detail_variety_code: '00',
      status: 'active',
      create_time: new Date().toISOString(),
      update_time: new Date().toISOString()
    },
    {
      id: 'CV005',
      crop_code: 'FR010100100',  // 水果类-浆果类-草莓-红颜 (FR+01+01+001+00)
      category_code: 'FR',
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
      crop_code: 'PD030100400',
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
      crop_code: 'PD010200700',
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
      crop_code: 'PD020100100',
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
      crop_code: 'PD030300100',
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
      crop_code: 'PD011300100',
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
      crop_category: '水果类',
      type_name: '瓜类水果',
      variety_name: '西瓜',
      crop_name: '黑美人西瓜',
      crop_variety: '西瓜',
      crop_code: 'FR060100100',
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
      crop_code: 'PD010200800',
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
 * 导入繁殖途径种源数据（育种/留种/无性繁殖）
 * 独立于基础种源数据，支持已有数据库升级
 */
function seedPropagationSeedSources() {
  const db = getDatabase();

  const existing = db.exec("SELECT COUNT(*) FROM seed_sources WHERE propagation_type IS NOT NULL AND propagation_type != 'external'");
  const count = Number(existing[0]?.values[0]?.[0]) || 0;

  if (count > 0) {
    console.log(`繁殖途径种源数据已存在 (${count} 条)，跳过导入`);
    return;
  }

  const propagationSources = [
    // ===== 3条育种计划产出 (breeding) =====
    {
      id: 'SS008', source_code: 'ZZ20260401-001', source_name: 'F1杂交辣椒种子',
      source_type: 'seed', source_origin: 'internal_seed',
      crop_category: '蔬菜类', type_name: '茄果类', variety_name: '辣椒',
      crop_name: '杂交辣椒F1', crop_variety: '辣椒', crop_code: 'PD030200100',
      supplier_id: '', supplier_name: '自育种',
      quantity: 0, unit: '粒', purchase_date: '2026-04-01',
      purchase_price: 0, total_amount: 0, used_quantity: 0, remaining_quantity: 0,
      status: 'depleted', production_plan_code: 'JZB2026-001',
      create_by: '李明辉', create_time: '2026-04-01T08:00:00.000Z', update_time: '2026-04-01T08:00:00.000Z',
      propagation_type: 'breeding', propagation_status: 'planned', propagation_method: 'crossbreeding',
      parent_male_id: 'SS001', parent_male_code: 'ZZ20260115-001',
      parent_female_id: 'SS004', parent_female_code: 'ZZ20260215-003',
      propagation_start_date: '2026-04-01', expected_harvest_date: '2026-06-15',
      breeding_location: '育种温室A区', target_traits: '抗病性强、果实均匀、辣度适中', generation: 'F1',
    },
    {
      id: 'SS009', source_code: 'ZZ20260410-002', source_name: '选择育种番茄种子',
      source_type: 'seed', source_origin: 'internal_seed',
      crop_category: '蔬菜类', type_name: '茄果类', variety_name: '番茄',
      crop_name: '大红番茄908', crop_variety: '番茄', crop_code: 'PD030100400',
      supplier_id: '', supplier_name: '自育种',
      quantity: 0, unit: '粒', purchase_date: '2026-04-10',
      purchase_price: 0, total_amount: 0, used_quantity: 0, remaining_quantity: 0,
      status: 'depleted', production_plan_code: 'JZB2026-002',
      create_by: '陈建国', create_time: '2026-04-10T09:00:00.000Z', update_time: '2026-04-10T09:00:00.000Z',
      propagation_type: 'breeding', propagation_status: 'in_progress', propagation_method: 'selection',
      parent_female_id: 'SS002', parent_female_code: 'ZZ20260120-002',
      propagation_start_date: '2026-04-10', expected_harvest_date: '2026-07-01',
      breeding_location: '育种温室B区', target_traits: '大果型、耐储运、高产', generation: 'F3',
    },
    {
      id: 'SS010', source_code: 'ZZ20260420-003', source_name: '回交育种黄瓜种子',
      source_type: 'seed', source_origin: 'internal_seed',
      crop_category: '蔬菜类', type_name: '瓜类', variety_name: '黄瓜',
      crop_name: '抗病黄瓜BC2', crop_variety: '黄瓜', crop_code: 'PD030300200',
      supplier_id: '', supplier_name: '自育种',
      quantity: 0, unit: '粒', purchase_date: '2026-04-20',
      purchase_price: 0, total_amount: 0, used_quantity: 0, remaining_quantity: 0,
      status: 'depleted', production_plan_code: 'JZB2026-003',
      create_by: '李明辉', create_time: '2026-04-20T10:00:00.000Z', update_time: '2026-04-20T10:00:00.000Z',
      propagation_type: 'breeding', propagation_status: 'in_progress', propagation_method: 'backcross',
      parent_male_id: 'SS005', parent_male_code: 'ZZ20260301-001',
      parent_female_id: 'SS003', parent_female_code: 'ZZ20260201-002',
      propagation_start_date: '2026-04-20', expected_harvest_date: '2026-07-20',
      breeding_location: '育种温室A区', target_traits: '白粉病抗性、早熟', generation: 'BC2',
    },
    // ===== 1条种植留种 (seed_saving) =====
    {
      id: 'SS011', source_code: 'ZZ20260501-001', source_name: '大叶菠菜留种',
      source_type: 'seed', source_origin: 'internal_seed',
      crop_category: '蔬菜类', type_name: '叶菜类', variety_name: '菠菜',
      crop_name: '大叶菠菜', crop_variety: '菠菜', crop_code: 'PD010100300',
      supplier_id: '', supplier_name: '种植留种',
      quantity: 0, unit: '粒', purchase_date: '2026-05-01',
      purchase_price: 0, total_amount: 0, used_quantity: 0, remaining_quantity: 0,
      status: 'depleted', production_plan_code: '',
      create_by: '张伟', create_time: '2026-05-01T06:00:00.000Z', update_time: '2026-05-01T06:00:00.000Z',
      propagation_type: 'seed_saving', propagation_status: 'planned', propagation_method: '',
      linked_planting_id: 'PL001', linked_planting_code: 'ZZB20260301-001',
      propagation_start_date: '2026-05-01', expected_harvest_date: '2026-06-20',
      breeding_location: 'B2地块', target_traits: '叶片肥厚、耐抽薹', generation: '',
    },
    // ===== 2条无性繁殖 (asexual) =====
    {
      id: 'SS012', source_code: 'ZZ20260505-001', source_name: '玫瑰香葡萄扦插苗',
      source_type: 'cutting', source_origin: 'cutting',
      crop_category: '果树类', type_name: '浆果类', variety_name: '葡萄',
      crop_name: '玫瑰香葡萄', crop_variety: '葡萄', crop_code: 'GS010100200',
      supplier_id: '', supplier_name: '无性繁殖',
      quantity: 0, unit: '株', purchase_date: '2026-05-05',
      purchase_price: 0, total_amount: 0, used_quantity: 0, remaining_quantity: 0,
      status: 'depleted', production_plan_code: '',
      create_by: '赵志强', create_time: '2026-05-05T08:00:00.000Z', update_time: '2026-05-05T08:00:00.000Z',
      propagation_type: 'asexual', propagation_status: 'planned', propagation_method: 'cutting',
      mother_plant_id: 'SS006', mother_plant_code: 'ZZ20260315-001',
      propagation_start_date: '2026-05-05', expected_harvest_date: '2026-06-15',
      breeding_location: '育苗温室C区', target_traits: '根系发达、成活率高', generation: '',
    },
    {
      id: 'SS013', source_code: 'ZZ20260510-002', source_name: '红富士苹果嫁接苗',
      source_type: 'grafting', source_origin: 'grafting',
      crop_category: '果树类', type_name: '仁果类', variety_name: '苹果',
      crop_name: '红富士苹果', crop_variety: '苹果', crop_code: 'GS020100100',
      supplier_id: '', supplier_name: '无性繁殖',
      quantity: 0, unit: '株', purchase_date: '2026-05-10',
      purchase_price: 0, total_amount: 0, used_quantity: 0, remaining_quantity: 0,
      status: 'depleted', production_plan_code: '',
      create_by: '赵志强', create_time: '2026-05-10T09:00:00.000Z', update_time: '2026-05-10T09:00:00.000Z',
      propagation_type: 'asexual', propagation_status: 'in_progress', propagation_method: 'grafting',
      mother_plant_id: 'SS007', mother_plant_code: 'ZZ20260320-001',
      propagation_start_date: '2026-05-10', expected_harvest_date: '2026-06-30',
      breeding_location: '果园嫁接区', target_traits: '矮化砧木、早果性强', generation: '',
    },
  ];

  for (const ps of propagationSources as any[]) {
    db.run(`
      INSERT OR REPLACE INTO seed_sources
      (id, source_code, source_name, source_type, source_origin,
       crop_category, type_name, variety_name, crop_name, crop_variety, crop_code,
       supplier_id, supplier_name, quantity, unit, purchase_date, purchase_price,
       total_amount, used_quantity, remaining_quantity, status, production_plan_code,
       create_by, create_time, update_time,
       propagation_type, propagation_status, propagation_method,
       parent_male_id, parent_male_code, parent_female_id, parent_female_code,
       mother_plant_id, mother_plant_code,
       linked_planting_id, linked_planting_code,
       propagation_start_date, expected_harvest_date, actual_harvest_date,
       breeding_location, target_traits, generation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ps.id, ps.source_code, ps.source_name, ps.source_type, ps.source_origin,
      ps.crop_category, ps.type_name, ps.variety_name, ps.crop_name, ps.crop_variety, ps.crop_code,
      ps.supplier_id, ps.supplier_name, ps.quantity, ps.unit, ps.purchase_date, ps.purchase_price,
      ps.total_amount, ps.used_quantity, ps.remaining_quantity, ps.status, ps.production_plan_code,
      ps.create_by, ps.create_time, ps.update_time,
      ps.propagation_type || null, ps.propagation_status || null, ps.propagation_method || null,
      ps.parent_male_id || null, ps.parent_male_code || null, ps.parent_female_id || null, ps.parent_female_code || null,
      ps.mother_plant_id || null, ps.mother_plant_code || null,
      ps.linked_planting_id || null, ps.linked_planting_code || null,
      ps.propagation_start_date || null, ps.expected_harvest_date || null, ps.actual_harvest_date || null,
      ps.breeding_location || null, ps.target_traits || null, ps.generation || null,
    ]);
  }

  console.log(`已导入 ${propagationSources.length} 条繁殖途径种源数据`);
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

  // 检查是否已有数据，避免每次重启覆盖用户增删改的数据
  const existing = db.exec('SELECT COUNT(*) FROM seedlings');
  const count = Number(existing[0]?.values[0]?.[0]) || 0;
  if (count > 0) {
    console.log(`育苗数据已存在 (${count} 条)，跳过导入`);
    return;
  }

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
  const count = Number(existingCount[0]?.values[0]?.[0] || 0);
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

  // 方案2.5: 添加区域类型列
  columnsToAdd.push('area_type TEXT DEFAULT "4"');

  for (const colDef of columnsToAdd) {
    const colName = colDef.split(' ')[0];
    try {
      db.run(`ALTER TABLE greenhouses ADD COLUMN ${colDef}`);
      console.log(`已添加 greenhouses 表缺失的列: ${colName}`);
    } catch (e) {
      // 列可能已存在，忽略错误
    }
  }

  // 方案2.6: 添加育苗工时列
  {
    const seedlingCols = ['work_hours REAL DEFAULT NULL'];
    for (const colDef of seedlingCols) {
      const colName = colDef.split(' ')[0];
      try {
        db.run(`ALTER TABLE seedlings ADD COLUMN ${colDef}`);
        console.log(`已添加 seedlings 表缺失的列: ${colName}`);
      } catch (e) {
        // 列可能已存在，忽略错误
      }
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

    // 来源途径（获取渠道分类，与 source_type 种源类型区分）
    { id: 'biz-028', category: 'source_origin', code: 'external_purchase', name: '外部采购', sort_number: 1 },
    { id: 'biz-029', category: 'source_origin', code: 'internal_seed', name: '内部育种/留种', sort_number: 2 },
    { id: 'biz-036', category: 'source_origin', code: 'self_produced', name: '自产', sort_number: 3 },
    { id: 'biz-037', category: 'source_origin', code: 'commissioned', name: '委托生产', sort_number: 4 },
    { id: 'biz-038', category: 'source_origin', code: 'gift', name: '赠送/受赠', sort_number: 5 },
    { id: 'biz-039', category: 'source_origin', code: 'direct_seedling', name: '直接育苗', sort_number: 6 },
    { id: 'biz-090', category: 'source_origin', code: 'direct_planting', name: '直接定植', sort_number: 7 },
    { id: 'biz-091', category: 'source_origin', code: 'external_harvest', name: '外部采收', sort_number: 8 },

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

  let inserted = 0;
  let skipped = 0;

  for (const dict of dictionaries) {
    // 检查 (category_code, dict_code) 是否已存在（不管状态），存在则跳过
    const checkStmt = db.prepare(
      'SELECT id FROM dictionaries WHERE category_code = ? AND dict_code = ?'
    );
    checkStmt.bind([dict.category, dict.code]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
      skipped++;
      continue;
    }

    // 插入新条目；若ID冲突（极罕见），自动生成唯一ID回退
    try {
      db.run(`
        INSERT INTO dictionaries
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
    } catch {
      const fallbackId = `${dict.id}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      db.run(`
        INSERT INTO dictionaries
        (id, category_code, dict_code, dict_label, dict_value, sort_order, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
      `, [
        fallbackId,
        dict.category,
        dict.code,
        dict.name,
        dict.name,
        dict.sort_number
      ]);
    }
    inserted++;
  }

  console.log(`已处理 ${dictionaries.length} 条字典数据（新增 ${inserted}，跳过 ${skipped}）`);
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

    // 界面设置（旧 TAB 还原）
    { id: 'cfg-040', config_key: 'theme_color', config_value: 'emerald', config_type: 'string', category: 'ui', description: '系统主题色' },
    { id: 'cfg-041', config_key: 'page_size', config_value: '10', config_type: 'number', category: 'ui', description: '列表默认分页大小' },

    // 功能设置（旧 TAB 还原）
    { id: 'cfg-042', config_key: 'enable_notifications', config_value: 'true', config_type: 'boolean', category: 'feature', description: '是否启用系统通知' },
    { id: 'cfg-043', config_key: 'enable_export', config_value: 'true', config_type: 'boolean', category: 'feature', description: '是否启用数据导出功能' },

    // 演示设置（旧 TAB 还原）
    { id: 'cfg-044', config_key: 'demo_mode', config_value: 'true', config_type: 'boolean', category: 'demo', description: '是否启用演示模式' },
    { id: 'cfg-045', config_key: 'show_tutorial', config_value: 'true', config_type: 'boolean', category: 'demo', description: '是否显示新手引导' },

    // 系统设置补充（旧 TAB 还原）
    { id: 'cfg-046', config_key: 'system_name', config_value: '智慧种植生产管理系统', config_type: 'string', category: 'system', description: '系统显示名称' },
    // ★ V3.0 Phase 1: 新增命名空间键 system.name（与 system_name 共存，逐步迁移）
    { id: 'cfg-046n', config_key: 'system.name', config_value: '智慧种植生产管理系统', config_type: 'string', category: 'system', description: '系统显示名称（新命名空间）' },
    { id: 'cfg-047', config_key: 'system_version', config_value: 'V1.1', config_type: 'string', category: 'system', description: '当前系统版本' },
    { id: 'cfg-048', config_key: 'auto_save_interval', config_value: '5000', config_type: 'number', category: 'system', description: '自动保存间隔（毫秒）' },
    { id: 'cfg-049', config_key: 'data_retention_days', config_value: '365', config_type: 'number', category: 'system', description: '本地数据保留天数' },

    // ═══════════════════════════════════════
    // ★ V3.0 Phase 2: 任务/派工命名空间配置
    // ═══════════════════════════════════════

    // — task.overtime.* (7个参数) —
    { id: 'cfg-050', config_key: 'task.overtime.accept-warning-hours', config_value: '12', config_type: 'number', category: 'farm_task', description: '任务接受预警时间（小时）' },
    { id: 'cfg-051', config_key: 'task.overtime.accept-critical-hours', config_value: '24', config_type: 'number', category: 'farm_task', description: '任务接受危急时间（小时）' },
    { id: 'cfg-052', config_key: 'task.overtime.execution-warning-hours', config_value: '24', config_type: 'number', category: 'farm_task', description: '任务执行预警时间（小时）' },
    { id: 'cfg-053', config_key: 'task.overtime.execution-critical-hours', config_value: '48', config_type: 'number', category: 'farm_task', description: '任务执行危急时间（小时）' },
    { id: 'cfg-054', config_key: 'task.overtime.acceptance-warning-hours', config_value: '24', config_type: 'number', category: 'farm_task', description: '任务验收预警时间（小时）' },
    { id: 'cfg-055', config_key: 'task.overtime.acceptance-critical-hours', config_value: '48', config_type: 'number', category: 'farm_task', description: '任务验收危急时间（小时）' },
    { id: 'cfg-056', config_key: 'task.overtime.check-interval-ms', config_value: '300000', config_type: 'number', category: 'farm_task', description: '超时检测间隔（毫秒）' },

    // — task.deadline.* (3个参数) —
    { id: 'cfg-057', config_key: 'task.deadline.max-extensions', config_value: '3', config_type: 'number', category: 'farm_task', description: '任务最大延期次数' },
    { id: 'cfg-058', config_key: 'task.deadline.max-extension-hours', config_value: '72', config_type: 'number', category: 'farm_task', description: '单次最大延期小时数' },
    { id: 'cfg-059', config_key: 'task.deadline.total-max-extension-hours', config_value: '168', config_type: 'number', category: 'farm_task', description: '累计最大延期小时数' },

    // — task.reminder.* (3个参数) —
    { id: 'cfg-060', config_key: 'task.reminder.min-interval-minutes', config_value: '60', config_type: 'number', category: 'farm_task', description: '催办最小间隔（分钟）' },
    { id: 'cfg-061', config_key: 'task.reminder.max-per-day', config_value: '5', config_type: 'number', category: 'farm_task', description: '每日最大催办次数' },
    { id: 'cfg-062', config_key: 'task.reminder.auto-reminder-hours', config_value: '12', config_type: 'number', category: 'farm_task', description: '自动催办阈值（派发后N小时未接受）' },

    // — task.rework.* (1个参数) —
    { id: 'cfg-063', config_key: 'task.rework.max-count', config_value: '2', config_type: 'number', category: 'farm_task', description: '最大返工次数' },

    // — task.storage.* (5个参数) —
    { id: 'cfg-064', config_key: 'task.storage.max-per-task', config_value: '100', config_type: 'number', category: 'farm_task', description: '每个任务最大操作记录数' },
    { id: 'cfg-065', config_key: 'task.storage.max-records', config_value: '500', config_type: 'number', category: 'farm_task', description: '操作记录总数上限' },
    { id: 'cfg-066', config_key: 'task.storage.archive-after-days', config_value: '90', config_type: 'number', category: 'farm_task', description: '归档天数' },
    { id: 'cfg-067', config_key: 'task.storage.warn-threshold', config_value: '0.8', config_type: 'number', category: 'farm_task', description: '存储警告阈值（80%）' },
    { id: 'cfg-068', config_key: 'task.storage.critical-threshold', config_value: '0.95', config_type: 'number', category: 'farm_task', description: '存储危急阈值（95%）' },

    // — task.permissions / status-transitions / status-config / action-config (JSON) —
    { id: 'cfg-069', config_key: 'task.permissions', config_value: '{"withdraw":{"roles":["admin"],"statuses":["pending"]},"cancel":{"roles":["admin"],"statuses":["accepted","in_progress"]},"reassign":{"roles":["admin"],"statuses":["failed","abandoned"]},"accept":{"roles":["assignee"],"statuses":["pending"]},"verify":{"roles":["assigner","admin"],"statuses":["waiting_acceptance"]},"continue":{"roles":["assignee"],"statuses":["rejected"]},"submitProgress":{"roles":["assignee"],"statuses":["accepted","in_progress"]},"remind":{"roles":["admin"],"statuses":["*"]}}', config_type: 'json', category: 'farm_task', description: '任务操作权限矩阵（JSON）' },
    { id: 'cfg-070', config_key: 'task.status-transitions', config_value: '{"draft":["pending","cancelled"],"pending":["accepted","cancelled"],"accepted":["in_progress","cancelled"],"in_progress":["waiting_acceptance","cancelled","abandoned"],"waiting_acceptance":["completed","rejected"],"rejected":["in_progress","failed"],"failed":["pending"],"abandoned":["pending"],"cancelled":[],"completed":[]}', config_type: 'json', category: 'farm_task', description: '任务状态流转规则（JSON）' },
    { id: 'cfg-071', config_key: 'task.status-config', config_value: '{"draft":{"label":"草稿","color":"text-gray-600","bg":"bg-gray-100"},"pending":{"label":"待接受","color":"text-gray-600","bg":"bg-gray-100"},"accepted":{"label":"已接受","color":"text-blue-600","bg":"bg-blue-100"},"in_progress":{"label":"处理中","color":"text-blue-600","bg":"bg-blue-100"},"waiting_acceptance":{"label":"待验收","color":"text-orange-600","bg":"bg-orange-100"},"completed":{"label":"已完成","color":"text-green-600","bg":"bg-green-100"},"rejected":{"label":"返工中","color":"text-red-600","bg":"bg-red-100"},"failed":{"label":"任务失败","color":"text-purple-600","bg":"bg-purple-100"},"cancelled":{"label":"已取消","color":"text-gray-500","bg":"bg-gray-50"},"abandoned":{"label":"已放弃","color":"text-red-400","bg":"bg-red-50"}}', config_type: 'json', category: 'farm_task', description: '任务状态显示配置（JSON）' },
    { id: 'cfg-072', config_key: 'task.action-config', config_value: '{"create":{"label":"创建任务","color":"text-blue-600","bg":"bg-blue-50"},"publish":{"label":"派发任务","color":"text-blue-600","bg":"bg-blue-50"},"withdraw":{"label":"撤回任务","color":"text-gray-600","bg":"bg-gray-50"},"cancel":{"label":"取消任务","color":"text-gray-600","bg":"bg-gray-50"},"accept":{"label":"接受任务","color":"text-green-600","bg":"bg-green-50"},"start":{"label":"开始执行","color":"text-green-600","bg":"bg-green-50"},"progress":{"label":"提交进度","color":"text-blue-600","bg":"bg-blue-50"},"submit":{"label":"申请验收","color":"text-orange-600","bg":"bg-orange-50"},"overtime_continue":{"label":"超时继续","color":"text-amber-600","bg":"bg-amber-50"},"overtime_abandon":{"label":"超时放弃","color":"text-red-600","bg":"bg-red-50"},"complete":{"label":"验收通过","color":"text-green-600","bg":"bg-green-50"},"reject":{"label":"验收驳回","color":"text-red-600","bg":"bg-red-50"},"continue":{"label":"继续执行","color":"text-blue-600","bg":"bg-blue-50"},"reassign":{"label":"重新派发","color":"text-purple-600","bg":"bg-purple-50"},"remind":{"label":"催办","color":"text-red-600","bg":"bg-red-50"},"extend_deadline":{"label":"延期","color":"text-amber-600","bg":"bg-amber-50"}}', config_type: 'json', category: 'farm_task', description: '任务操作行为显示配置（JSON）' },

    // — dispatch.weights.farm.* (3个参数) —
    { id: 'cfg-073', config_key: 'dispatch.weights.farm.workload', config_value: '0.5', config_type: 'number', category: 'dispatch', description: '农事派工-工作量权重' },
    { id: 'cfg-074', config_key: 'dispatch.weights.farm.skill', config_value: '0.3', config_type: 'number', category: 'dispatch', description: '农事派工-技能匹配权重' },
    { id: 'cfg-075', config_key: 'dispatch.weights.farm.location', config_value: '0.2', config_type: 'number', category: 'dispatch', description: '农事派工-地理位置权重' },

    // — dispatch.weights.smart.* (5个参数) —
    { id: 'cfg-076', config_key: 'dispatch.weights.smart.skill-match', config_value: '0.30', config_type: 'number', category: 'dispatch', description: '智能派工-技能匹配权重' },
    { id: 'cfg-077', config_key: 'dispatch.weights.smart.location', config_value: '0.25', config_type: 'number', category: 'dispatch', description: '智能派工-地理位置权重' },
    { id: 'cfg-078', config_key: 'dispatch.weights.smart.current-load', config_value: '0.20', config_type: 'number', category: 'dispatch', description: '智能派工-当前负荷权重' },
    { id: 'cfg-079', config_key: 'dispatch.weights.smart.historical-performance', config_value: '0.15', config_type: 'number', category: 'dispatch', description: '智能派工-历史表现权重' },
    { id: 'cfg-080', config_key: 'dispatch.weights.smart.urgency', config_value: '0.10', config_type: 'number', category: 'dispatch', description: '智能派工-紧急程度权重' },

    // — dispatch.priority.* (4个优先级 × 3字段 = 12个参数) —
    { id: 'cfg-081', config_key: 'dispatch.priority.urgent.label', config_value: '紧急', config_type: 'string', category: 'dispatch', description: '紧急优先级-标签' },
    { id: 'cfg-082', config_key: 'dispatch.priority.urgent.color', config_value: 'red', config_type: 'string', category: 'dispatch', description: '紧急优先级-颜色' },
    { id: 'cfg-083', config_key: 'dispatch.priority.urgent.weight', config_value: '100', config_type: 'number', category: 'dispatch', description: '紧急优先级-权重' },
    { id: 'cfg-084', config_key: 'dispatch.priority.high.label', config_value: '高', config_type: 'string', category: 'dispatch', description: '高优先级-标签' },
    { id: 'cfg-085', config_key: 'dispatch.priority.high.color', config_value: 'orange', config_type: 'string', category: 'dispatch', description: '高优先级-颜色' },
    { id: 'cfg-086', config_key: 'dispatch.priority.high.weight', config_value: '80', config_type: 'number', category: 'dispatch', description: '高优先级-权重' },
    { id: 'cfg-087', config_key: 'dispatch.priority.normal.label', config_value: '普通', config_type: 'string', category: 'dispatch', description: '普通优先级-标签' },
    { id: 'cfg-088', config_key: 'dispatch.priority.normal.color', config_value: 'blue', config_type: 'string', category: 'dispatch', description: '普通优先级-颜色' },
    { id: 'cfg-089', config_key: 'dispatch.priority.normal.weight', config_value: '60', config_type: 'number', category: 'dispatch', description: '普通优先级-权重' },
    { id: 'cfg-090', config_key: 'dispatch.priority.low.label', config_value: '低', config_type: 'string', category: 'dispatch', description: '低优先级-标签' },
    { id: 'cfg-091', config_key: 'dispatch.priority.low.color', config_value: 'gray', config_type: 'string', category: 'dispatch', description: '低优先级-颜色' },
    { id: 'cfg-092', config_key: 'dispatch.priority.low.weight', config_value: '40', config_type: 'number', category: 'dispatch', description: '低优先级-权重' },

    // ═══════════════════════════════════════
    // ★ V3.0 Phase 3: 审批配置
    // ═══════════════════════════════════════

    // — approval.timeout.* (11个参数：5个类型的timeout+escalation + ultimate) —
    { id: 'cfg-093', config_key: 'approval.timeout.urgent-hours', config_value: '4', config_type: 'number', category: 'approval', description: '紧急审批超时（小时）' },
    { id: 'cfg-094', config_key: 'approval.timeout.urgent-escalation', config_value: '2', config_type: 'number', category: 'approval', description: '紧急审批升级时间（小时）' },
    { id: 'cfg-095', config_key: 'approval.timeout.normal-hours', config_value: '48', config_type: 'number', category: 'approval', description: '普通审批超时（小时）' },
    { id: 'cfg-096', config_key: 'approval.timeout.normal-escalation', config_value: '24', config_type: 'number', category: 'approval', description: '普通审批升级时间（小时）' },
    { id: 'cfg-097', config_key: 'approval.timeout.hr-hours', config_value: '24', config_type: 'number', category: 'approval', description: 'HR审批超时（小时）' },
    { id: 'cfg-098', config_key: 'approval.timeout.hr-escalation', config_value: '12', config_type: 'number', category: 'approval', description: 'HR审批升级时间（小时）' },
    { id: 'cfg-099', config_key: 'approval.timeout.finance-hours', config_value: '72', config_type: 'number', category: 'approval', description: '财务审批超时（小时）' },
    { id: 'cfg-100', config_key: 'approval.timeout.finance-escalation', config_value: '48', config_type: 'number', category: 'approval', description: '财务审批升级时间（小时）' },
    { id: 'cfg-101', config_key: 'approval.timeout.exempt-hours', config_value: '1', config_type: 'number', category: 'approval', description: '免审批超时（小时）' },
    { id: 'cfg-102', config_key: 'approval.timeout.ultimate-hours', config_value: '168', config_type: 'number', category: 'approval', description: '最终超时（小时）— 超此时间自动处理' },
    { id: 'cfg-103', config_key: 'approval.timeout.ultimate-action', config_value: 'auto_approve', config_type: 'string', category: 'approval', description: '最终超时动作（auto_approve/auto_reject）' },

    // — approval.threshold.* (4个金额阈值) —
    { id: 'cfg-104', config_key: 'approval.threshold.exempt-max', config_value: '1000', config_type: 'number', category: 'approval', description: '免审批金额上限（元）— 低于此金额自动通过' },
    { id: 'cfg-105', config_key: 'approval.threshold.quick-max', config_value: '10000', config_type: 'number', category: 'approval', description: '快速审批金额上限（元）' },
    { id: 'cfg-106', config_key: 'approval.threshold.standard-max', config_value: '50000', config_type: 'number', category: 'approval', description: '标准审批金额上限（元）' },
    { id: 'cfg-107', config_key: 'approval.threshold.high-value', config_value: '100000', config_type: 'number', category: 'approval', description: '高价值订单阈值（元）' },

    // — approval.delegation.* —
    { id: 'cfg-108', config_key: 'approval.delegation.enabled', config_value: 'true', config_type: 'boolean', category: 'approval', description: '是否启用审批委托' },
    { id: 'cfg-109', config_key: 'approval.delegation.rules', config_value: '[{"fromRole":"manager","toRole":"department_head","enabled":true,"remark":"经理外出时委托给部门主管"},{"fromRole":"department_head","toRole":"manager","enabled":true,"remark":"部门主管外出时委托给经理"},{"fromRole":"director","toRole":"manager","enabled":true,"remark":"总监外出时委托给经理"},{"fromRole":"hr","toRole":"hr_manager","enabled":true,"remark":"人事专员外出时委托给人事经理"}]', config_type: 'json', category: 'approval', description: '委托规则列表（JSON）' },

    // — approval.workflow.* —
    { id: 'cfg-110', config_key: 'approval.workflow.require-comment', config_value: 'false', config_type: 'boolean', category: 'approval', description: '审批意见是否必填' },

    // ★ V3.0 Phase 4: 动态主题变量（CSS自定义属性，由 useThemeConfig 同步到 :root）
    { id: 'cfg-111', config_key: 'theme.sidebar-bg', config_value: '#F2F6FA', config_type: 'string', category: 'theme', description: '侧边栏背景色' },
    { id: 'cfg-112', config_key: 'theme.sidebar-active-bg', config_value: '#dbeafe', config_type: 'string', category: 'theme', description: '侧边栏激活项背景色' },
    { id: 'cfg-113', config_key: 'theme.sidebar-active-text', config_value: '#1d4ed8', config_type: 'string', category: 'theme', description: '侧边栏激活项文字色' },
    { id: 'cfg-114', config_key: 'theme.sidebar-collapsed-w', config_value: '64px', config_type: 'string', category: 'theme', description: '侧边栏收起宽度' },
    { id: 'cfg-115', config_key: 'theme.sidebar-expanded-w', config_value: '208px', config_type: 'string', category: 'theme', description: '侧边栏展开宽度' },
    { id: 'cfg-116', config_key: 'theme.header-bg', config_value: '#F2F6FA', config_type: 'string', category: 'theme', description: '顶栏背景色' },
    { id: 'cfg-117', config_key: 'theme.header-height', config_value: '48px', config_type: 'string', category: 'theme', description: '顶栏高度' },
    { id: 'cfg-118', config_key: 'theme.primary-color', config_value: '#059669', config_type: 'string', category: 'theme', description: '主题主色' },
    { id: 'cfg-119', config_key: 'theme.primary-hover', config_value: '#047857', config_type: 'string', category: 'theme', description: '主题主色悬停' },

    // ★ V3.0 Phase 5: 基础设施参数化
    { id: 'cfg-120', config_key: 'api.timeout', config_value: '30000', config_type: 'number', category: 'api', description: 'API请求超时时间（毫秒）' },
    { id: 'cfg-121', config_key: 'query.stale-time', config_value: '300000', config_type: 'number', category: 'query', description: 'React Query 数据新鲜时间（毫秒）' },
    { id: 'cfg-122', config_key: 'query.gc-time', config_value: '600000', config_type: 'number', category: 'query', description: 'React Query 垃圾回收时间（毫秒）' },
    { id: 'cfg-123', config_key: 'query.retry', config_value: '2', config_type: 'number', category: 'query', description: 'React Query 失败重试次数' },
    { id: 'cfg-124', config_key: 'ui.table.default-page-size', config_value: '20', config_type: 'number', category: 'ui', description: '表格默认分页大小' },

    // ★ V3.0 Phase 7: 功能开关
    { id: 'cfg-125', config_key: 'feature.demo-mode', config_value: 'true', config_type: 'boolean', category: 'feature', description: '演示模式开关' },
    { id: 'cfg-126', config_key: 'feature.enable-export', config_value: 'true', config_type: 'boolean', category: 'feature', description: '数据导出功能开关' },
    { id: 'cfg-127', config_key: 'feature.enable-batch-ops', config_value: 'true', config_type: 'boolean', category: 'feature', description: '批量操作功能开关' },
    { id: 'cfg-128', config_key: 'feature.enable-multi-tenant', config_value: 'false', config_type: 'boolean', category: 'feature', description: '多租户功能开关' },
    { id: 'cfg-129', config_key: 'feature.enable-audit-log', config_value: 'true', config_type: 'boolean', category: 'feature', description: '审计日志功能开关' },
    { id: 'cfg-130', config_key: 'feature.enable-iot', config_value: 'false', config_type: 'boolean', category: 'feature', description: 'IoT设备集成开关' },
    { id: 'cfg-131', config_key: 'feature.enable-ai-optimization', config_value: 'false', config_type: 'boolean', category: 'feature', description: 'AI优化建议开关' },
    { id: 'cfg-132', config_key: 'feature.show-tutorial', config_value: 'true', config_type: 'boolean', category: 'feature', description: '新手引导开关' },

    // ★ V3.0 Phase 6: 作物生长引擎参数化（JSON blob 存储在 system_configs）
    { id: 'cfg-133', config_key: 'crop.growth.stage-days', config_value: '{"seedling":30,"vegetative":45,"flowering":30,"fruiting":40,"harvest":20}', config_type: 'json', category: 'crop', description: '默认生长阶段天数配置（JSON，可按作物覆盖）' },
    { id: 'cfg-134', config_key: 'crop.growth.crop-configs', config_value: '[{"name":"番茄","stages":[{"stage":"seedling","startDay":1,"endDay":30,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":2,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1,"description":"幼苗期需保持土壤湿润"},{"type":"fertilization","typeName":"施肥","frequency":7,"priority":"medium","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"幼苗期以氮肥为主促进生长"}]},{"stage":"vegetative","startDay":31,"endDay":75,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":2,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1.5,"description":"营养生长期需定期灌溉"},{"type":"fertilization","typeName":"施肥","frequency":10,"priority":"high","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"营养生长期补充复合肥"},{"type":"pruning","typeName":"整枝","frequency":14,"priority":"medium","skillRequired":["整枝修剪"],"estimatedHours":3,"description":"及时摘除侧枝"},{"type":"scouting","typeName":"巡田","frequency":5,"priority":"medium","skillRequired":["病害识别","巡田检查"],"estimatedHours":1,"description":"检查植株健康状况"}]},{"stage":"flowering","startDay":76,"endDay":105,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":3,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1.5,"description":"花期需保证水分供应"},{"type":"fertilization","typeName":"施肥","frequency":7,"priority":"high","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"花期增施磷钾肥"},{"type":"pruning","typeName":"整枝","frequency":10,"priority":"medium","skillRequired":["整枝修剪"],"estimatedHours":2,"description":"调整植株结构"}]},{"stage":"fruiting","startDay":106,"endDay":145,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":2,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1.5,"description":"结果期需充足水分"},{"type":"fertilization","typeName":"施肥","frequency":7,"priority":"high","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"结果期补充钾肥"},{"type":"spraying","typeName":"病虫防治","frequency":14,"priority":"high","skillRequired":["农药配制","喷雾操作","生物防治"],"estimatedHours":2,"description":"防治病虫害"},{"type":"pruning","typeName":"整枝","frequency":14,"priority":"medium","skillRequired":["整枝修剪","疏花疏果"],"estimatedHours":3,"description":"疏果和整理植株"}]},{"stage":"harvest","startDay":146,"endDay":165,"tasks":[{"type":"harvest","typeName":"采收","frequency":3,"priority":"high","skillRequired":["果蔬采收","分级包装"],"estimatedHours":4,"description":"及时采收成熟果实"},{"type":"scouting","typeName":"巡田","frequency":5,"priority":"low","skillRequired":["病害识别","巡田检查"],"estimatedHours":1,"description":"检查植株状况"}]}]},{"name":"黄瓜","stages":[{"stage":"seedling","startDay":1,"endDay":25,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":2,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1,"description":"幼苗期保持基质湿润"},{"type":"fertilization","typeName":"施肥","frequency":7,"priority":"medium","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":1.5,"description":"幼苗期轻施氮肥"}]},{"stage":"vegetative","startDay":26,"endDay":60,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":1,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1.5,"description":"快速生长期需水量大"},{"type":"fertilization","typeName":"施肥","frequency":5,"priority":"high","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"补充氮磷钾复合肥"},{"type":"pruning","typeName":"整枝","frequency":7,"priority":"medium","skillRequired":["整枝修剪"],"estimatedHours":2.5,"description":"及时摘除卷须和侧枝"}]},{"stage":"flowering","startDay":61,"endDay":80,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":2,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1.5,"description":"花期保持水分均衡"},{"type":"fertilization","typeName":"施肥","frequency":5,"priority":"high","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"增施磷钾肥促花"},{"type":"plant_protection","typeName":"植保","frequency":7,"priority":"high","skillRequired":["农药配制","喷雾操作","生物防治"],"estimatedHours":2,"description":"预防白粉病和霜霉病"}]},{"stage":"fruiting","startDay":81,"endDay":120,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":1,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1.5,"description":"结果期需充足均匀供水"},{"type":"fertilization","typeName":"施肥","frequency":4,"priority":"high","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"高钾肥促进果实膨大"},{"type":"plant_protection","typeName":"植保","frequency":7,"priority":"high","skillRequired":["农药配制","喷雾操作","生物防治"],"estimatedHours":2,"description":"防治蚜虫和螨类"},{"type":"harvest","typeName":"采收","frequency":1,"priority":"high","skillRequired":["果蔬采收","分级包装"],"estimatedHours":4,"description":"及时采收嫩瓜"}]},{"stage":"harvest","startDay":121,"endDay":140,"tasks":[{"type":"harvest","typeName":"采收","frequency":1,"priority":"high","skillRequired":["果蔬采收","分级包装"],"estimatedHours":5,"description":"盛产期每日采收"}]}]},{"name":"辣椒","stages":[{"stage":"seedling","startDay":1,"endDay":35,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":2,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1,"description":"幼苗期保持土壤湿润但不过湿"},{"type":"fertilization","typeName":"施肥","frequency":7,"priority":"medium","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"幼苗期以氮肥为主"}]},{"stage":"vegetative","startDay":36,"endDay":70,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":2,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1,"description":"保持土壤湿润"},{"type":"fertilization","typeName":"施肥","frequency":5,"priority":"high","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"补充复合肥"},{"type":"pruning","typeName":"修剪","frequency":10,"priority":"medium","skillRequired":["整枝修剪"],"estimatedHours":2,"description":"摘除底部老叶"}]},{"stage":"flowering","startDay":71,"endDay":95,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":2,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1,"description":"花期保持适宜湿度"},{"type":"fertilization","typeName":"施肥","frequency":5,"priority":"high","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"花期增施磷钾肥"},{"type":"plant_protection","typeName":"植保","frequency":7,"priority":"high","skillRequired":["农药配制","喷雾操作","生物防治"],"estimatedHours":2,"description":"防治蚜虫和疫病"}]},{"stage":"fruiting","startDay":96,"endDay":150,"tasks":[{"type":"irrigation","typeName":"灌溉","frequency":2,"priority":"high","skillRequired":["微喷灌溉","滴灌操作"],"estimatedHours":1,"description":"结果期需充足水分"},{"type":"fertilization","typeName":"施肥","frequency":5,"priority":"high","skillRequired":["施肥操作","水肥一体化"],"estimatedHours":2,"description":"高钾肥促进果实发育"},{"type":"plant_protection","typeName":"植保","frequency":7,"priority":"high","skillRequired":["农药配制","喷雾操作","生物防治"],"estimatedHours":2,"description":"防治炭疽病和烟青虫"},{"type":"harvest","typeName":"采收","frequency":2,"priority":"high","skillRequired":["果蔬采收","分级包装"],"estimatedHours":3.5,"description":"分批采收成熟果实"}]},{"stage":"harvest","startDay":151,"endDay":180,"tasks":[{"type":"harvest","typeName":"采收","frequency":1,"priority":"high","skillRequired":["果蔬采收","分级包装"],"estimatedHours":4,"description":"盛产期采收"}]}]}]', config_type: 'json', category: 'crop', description: '作物生长阶段任务配置（JSON数组，支持番茄/黄瓜/辣椒等）' },
    { id: 'cfg-135', config_key: 'crop.pest.alert-rules', config_value: '[{"id":"pest_aphid","name":"蚜虫预警","symptom":["蚜虫","蚜","虫眼","卷叶"],"cropType":["番茄","黄瓜","辣椒"],"severity":"high","suggestion":"发现蚜虫，立即进行生物防治或药物喷洒","priority":"high"},{"id":"pest_powdery_mildew","name":"白粉病预警","symptom":["白粉","粉末","叶面白","粉状"],"cropType":["番茄","黄瓜","南瓜"],"severity":"high","suggestion":"发现白粉病症状，使用杀菌剂防治","priority":"high"},{"id":"pest_rot","name":"腐烂病预警","symptom":["腐烂","软腐","水渍"],"cropType":["番茄","辣椒"],"severity":"high","suggestion":"发现腐烂病株，立即清除并喷洒杀菌剂","priority":"high"},{"id":"pest_yellow_leaf","name":"黄叶病预警","symptom":["黄叶","叶片发黄","叶脉黄"],"cropType":["番茄","黄瓜"],"severity":"medium","suggestion":"检查是否为营养缺乏或病害，进行对症处理","priority":"medium"}]', config_type: 'json', category: 'crop', description: '病虫害预警规则（JSON数组）' },

    // ★ V3.0 阶段8: 消除魔法数字（人力/薪资参数）
    { id: 'cfg-136', config_key: 'labor.work-hours-per-day', config_value: '8', config_type: 'number', category: 'labor', description: '每日标准工时（小时）' },
    { id: 'cfg-137', config_key: 'labor.work-days-per-month', config_value: '21.75', config_type: 'number', category: 'labor', description: '月标准计薪天数' },
    { id: 'cfg-138', config_key: 'labor.full-attendance-bonus', config_value: '500', config_type: 'number', category: 'labor', description: '全勤奖金额（元）' },
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
    org_oid: 'ORG001',
    org_name: '宁波帮帮忙公司',
    department_oid: 'ORG001',
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

  // ========== 经理用户：张俊生 ==========
  const managerUser = {
    id: 'user-manager',
    oid: 'USER_MANAGER_001',
    username: '张俊生',
    password_hash: bcrypt.hashSync('123456', 10),
    real_name: '张俊生',
    org_oid: 'ORG002',
    org_name: '生产部',
    department_oid: 'ORG002',
    department_name: '生产部',
    position: '生产经理',
    email: 'zhangjs@tmcloud.com',
    phone: '13800138001',
    status: 'active'
  };

  db.run(`
    INSERT OR REPLACE INTO users
    (id, oid, username, password_hash, real_name, org_oid, org_name, department_oid, department_name, position, email, phone, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    managerUser.id, managerUser.oid, managerUser.username, managerUser.password_hash,
    managerUser.real_name, managerUser.org_oid, managerUser.org_name,
    managerUser.department_oid, managerUser.department_name, managerUser.position,
    managerUser.email, managerUser.phone, managerUser.status, now, now
  ]);

  // ========== 普通用户：王建国 ==========
  const regularUser = {
    id: 'user-regular',
    oid: 'USER_REGULAR_001',
    username: '王建国',
    password_hash: bcrypt.hashSync('123456', 10),
    real_name: '王建国',
    org_oid: 'ORG002',
    org_name: '生产部',
    department_oid: 'ORG002',
    department_name: '生产部',
    position: '农艺师',
    email: 'wangjg@tmcloud.com',
    phone: '13800138002',
    status: 'active'
  };

  db.run(`
    INSERT OR REPLACE INTO users
    (id, oid, username, password_hash, real_name, org_oid, org_name, department_oid, department_name, position, email, phone, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    regularUser.id, regularUser.oid, regularUser.username, regularUser.password_hash,
    regularUser.real_name, regularUser.org_oid, regularUser.org_name,
    regularUser.department_oid, regularUser.department_name, regularUser.position,
    regularUser.email, regularUser.phone, regularUser.status, now, now
  ]);

  // ========== 用户角色关联 ==========
  // 陆启闯 关联 管理员角色（含所有权限）
  db.run(`
    INSERT OR REPLACE INTO user_roles
    (id, user_oid, role_oid, created_at)
    VALUES (?, 'USER_ADMIN_001', 'ROLE_ADMIN', ?)
  `, ['ur-admin-001', now]);

  // 张俊生 关联 管理员角色（含编辑权限，无删除）
  db.run(`
    INSERT OR REPLACE INTO user_roles
    (id, user_oid, role_oid, created_at)
    VALUES (?, 'USER_MANAGER_001', 'ROLE_MANAGER', ?)
  `, ['ur-manager-001', now]);

  // 王建国 关联 普通用户角色（仅查看）
  db.run(`
    INSERT OR REPLACE INTO user_roles
    (id, user_oid, role_oid, created_at)
    VALUES (?, 'USER_REGULAR_001', 'ROLE_USER', ?)
  `, ['ur-user-001', now]);

  console.log(`已导入 ${roles.length} 个角色`);
  console.log(`已导入 ${permissions.length} 个权限`);
  console.log('已导入3个用户：陆启闯(管理员)、张俊生(经理)、王建国(普通用户)');
}

/**
 * 导入 RBAC 权限系统种子数据
 * 工序树、动作定义、角色权限矩阵、组织树
 */
function seedAuthorityData() {
  const db = getDatabase();
  const now = new Date().toISOString();

  // ========== 组织数据 ==========
  // 使用固定 OID 避免重复创建
  const orgs = [
    { id: 'org-root', oid: 'ORG001', parent_oid: null, name: '宁波帮帮忙公司', org_type: 'company', sort_number: 1, status: 'active', description: '总公司', department_id: null },
    { id: 'org-prod', oid: 'ORG002', parent_oid: 'ORG001', name: '生产部', org_type: 'department', sort_number: 2, status: 'active', description: '生产管理部门', department_id: 'DEPT001' },
    { id: 'org-tech', oid: 'ORG003', parent_oid: 'ORG001', name: '技术部', org_type: 'department', sort_number: 3, status: 'active', description: '技术研发部门', department_id: 'DEPT002' },
    { id: 'org-logistics', oid: 'ORG004', parent_oid: 'ORG001', name: '后勤部', org_type: 'department', sort_number: 4, status: 'active', description: '后勤保障部门', department_id: null },
    { id: 'org-finance', oid: 'ORG005', parent_oid: 'ORG001', name: '财务部', org_type: 'department', sort_number: 5, status: 'active', description: '财务管理部门', department_id: 'DEPT004' },
  ];

  for (const org of orgs) {
    db.run(`
      INSERT OR REPLACE INTO organizations (id, oid, parent_oid, aid, name, org_type, sort_order, status, description, department_id, department_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [org.id, org.oid, org.parent_oid, org.oid, org.name, org.org_type, org.sort_number, org.status, org.description, org.department_id, org.department_id ? org.name : null, now, now]);
  }

  // ========== 动作定义 ==========
  const actions = [
    { id: 'act-view', oid: 'ACT001', code: 'view', name: '查看', category: 'common', sort_number: 1 },
    { id: 'act-create', oid: 'ACT002', code: 'create', name: '新增', category: 'common', sort_number: 2 },
    { id: 'act-edit', oid: 'ACT003', code: 'edit', name: '编辑', category: 'common', sort_number: 3 },
    { id: 'act-delete', oid: 'ACT004', code: 'delete', name: '删除', category: 'common', sort_number: 4 },
    { id: 'act-export', oid: 'ACT005', code: 'export', name: '导出', category: 'common', sort_number: 5 },
    { id: 'act-approve', oid: 'ACT006', code: 'approve', name: '审核', category: 'common', sort_number: 6 },
  ];

  for (const action of actions) {
    db.run(`
      INSERT OR REPLACE INTO actions (id, oid, action_code, action_name, category, sort_order, sort_number, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [action.id, action.oid, action.code, action.name, action.category, action.sort_number, action.sort_number, now, now]);
  }

  // ========== 工序树（菜单树）==========
  // 与 V1.1 Sidebar 菜单结构一一对应
  const processes = [
    // 一级菜单
    { id: 'proc-park', oid: 'PROC_PARK', parent_oid: null, code: 'park-archive', name: '园区导览', route: '/park-archive', app_type: 0, is_hidden: 0, sort_number: 1 },
    { id: 'proc-dashboard', oid: 'PROC_DASHBOARD', parent_oid: null, code: 'dashboard', name: '基地总览', route: '/dashboard', app_type: 0, is_hidden: 0, sort_number: 2 },
    { id: 'proc-indicators', oid: 'PROC_INDICATORS', parent_oid: null, code: 'indicators', name: '指标数据', route: '/indicators', app_type: 0, is_hidden: 0, sort_number: 3 },
    { id: 'proc-announcement', oid: 'PROC_ANNOUNCE', parent_oid: null, code: 'announcement', name: '公告管理', route: '/announcement', app_type: 0, is_hidden: 0, sort_number: 4 },
    { id: 'proc-production', oid: 'PROC_PRODUCTION', parent_oid: null, code: 'production', name: '计划管理', route: '/production', app_type: 0, is_hidden: 0, sort_number: 5 },
    { id: 'proc-crop', oid: 'PROC_CROP', parent_oid: null, code: 'crop', name: '作物管理', route: '/crop/seed-source', app_type: 0, is_hidden: 0, sort_number: 6 },
    { id: 'proc-farm', oid: 'PROC_FARM', parent_oid: null, code: 'farm', name: '农事管理', route: '/farm-hub', app_type: 0, is_hidden: 0, sort_number: 7 },
    { id: 'proc-materials', oid: 'PROC_MATERIALS', parent_oid: null, code: 'materials', name: '库存管理', route: '/warehouse-overview', app_type: 0, is_hidden: 0, sort_number: 8 },
    { id: 'proc-labor', oid: 'PROC_LABOR', parent_oid: null, code: 'labor', name: '人工管理', route: '/labor/attendance', app_type: 0, is_hidden: 0, sort_number: 9 },
    { id: 'proc-summary', oid: 'PROC_SUMMARY', parent_oid: null, code: 'summary', name: '生产汇总表', route: '/summary/overview', app_type: 0, is_hidden: 0, sort_number: 10 },
    { id: 'proc-workflow', oid: 'PROC_WORKFLOW', parent_oid: null, code: 'workflow', name: '审批中心', route: '/approvals', app_type: 0, is_hidden: 0, sort_number: 11 },
    { id: 'proc-settings', oid: 'PROC_SETTINGS', parent_oid: null, code: 'settings', name: '系统设置', route: '/settings', app_type: 0, is_hidden: 0, sort_number: 12 },

    // 计划管理子菜单
    { id: 'proc-order', oid: 'PROC_ORDER', parent_oid: 'PROC_PRODUCTION', code: 'order', name: '订单管理', route: '/crop/order', app_type: 0, is_hidden: 0, sort_number: 1 },
    { id: 'proc-plan', oid: 'PROC_PLAN', parent_oid: 'PROC_PRODUCTION', code: 'plan', name: '生产计划', route: '/production', app_type: 0, is_hidden: 0, sort_number: 2 },
    { id: 'proc-tech', oid: 'PROC_TECH', parent_oid: 'PROC_PRODUCTION', code: 'tech-solution', name: '技术方案', route: '/tech-solution', app_type: 0, is_hidden: 0, sort_number: 3 },
    { id: 'proc-purchase', oid: 'PROC_PURCHASE', parent_oid: 'PROC_PRODUCTION', code: 'purchase-plan', name: '采购计划', route: '/purchase-plan', app_type: 0, is_hidden: 0, sort_number: 4 },

    // 作物管理子菜单
    { id: 'proc-seed-source', oid: 'PROC_SEED_SOURCE', parent_oid: 'PROC_CROP', code: 'seed-source', name: '种源管理', route: '/crop/seed-source', app_type: 0, is_hidden: 0, sort_number: 1 },
    { id: 'proc-seedling', oid: 'PROC_SEEDLING', parent_oid: 'PROC_CROP', code: 'seedling', name: '育苗管理', route: '/crop/seedling', app_type: 0, is_hidden: 0, sort_number: 2 },
    { id: 'proc-planting', oid: 'PROC_PLANTING', parent_oid: 'PROC_CROP', code: 'planting', name: '种植管理', route: '/crop/planting', app_type: 0, is_hidden: 0, sort_number: 3 },
    { id: 'proc-crop-harvest', oid: 'PROC_CROP_HARVEST', parent_oid: 'PROC_CROP', code: 'crop-harvest', name: '采收入库', route: '/crop/harvest', app_type: 0, is_hidden: 0, sort_number: 4 },
    { id: 'proc-crop-inventory', oid: 'PROC_CROP_INVENTORY', parent_oid: 'PROC_CROP', code: 'crop-inventory', name: '作物库存', route: '/crop-inventory', app_type: 0, is_hidden: 0, sort_number: 5 },
    { id: 'proc-crop-instance', oid: 'PROC_CROP_INSTANCE', parent_oid: 'PROC_CROP', code: 'crop-instance', name: '实例追溯', route: '/crop/instance', app_type: 0, is_hidden: 0, sort_number: 6 },

    // 农事管理子菜单
    { id: 'proc-farm-hub', oid: 'PROC_FARM_HUB', parent_oid: 'PROC_FARM', code: 'farm-hub', name: '农事任务中心', route: '/farm-hub', app_type: 0, is_hidden: 0, sort_number: 1 },
    { id: 'proc-task-center', oid: 'PROC_TASK_CENTER', parent_oid: 'PROC_FARM', code: 'task-center', name: '任务中心', route: '/task-center', app_type: 0, is_hidden: 0, sort_number: 2 },
    { id: 'proc-schedule', oid: 'PROC_SCHEDULE', parent_oid: 'PROC_FARM', code: 'schedule', name: '排班调度', route: '/schedule', app_type: 0, is_hidden: 0, sort_number: 3 },
    { id: 'proc-team', oid: 'PROC_TEAM', parent_oid: 'PROC_FARM', code: 'team', name: '班组分配', route: '/team', app_type: 0, is_hidden: 0, sort_number: 4 },
    { id: 'proc-daily-summary', oid: 'PROC_DAILY_SUMMARY', parent_oid: 'PROC_FARM', code: 'daily-summary', name: '每日工单汇总', route: '/daily-work-summary', app_type: 0, is_hidden: 0, sort_number: 5 },

    // 库存管理子菜单
    { id: 'proc-warehouse-overview', oid: 'PROC_WH_OVERVIEW', parent_oid: 'PROC_MATERIALS', code: 'warehouse-overview', name: '库存总览', route: '/warehouse-overview', app_type: 0, is_hidden: 0, sort_number: 1 },
    { id: 'proc-warehouse-inbound', oid: 'PROC_WH_INBOUND', parent_oid: 'PROC_MATERIALS', code: 'warehouse-inbound', name: '物料入库', route: '/warehouse-inbound', app_type: 0, is_hidden: 0, sort_number: 2 },
    { id: 'proc-supplier', oid: 'PROC_SUPPLIER', parent_oid: 'PROC_MATERIALS', code: 'supplier', name: '供应商管理', route: '/supplier-management', app_type: 0, is_hidden: 0, sort_number: 3 },
    { id: 'proc-material-receiving', oid: 'PROC_MAT_RECEIVING', parent_oid: 'PROC_MATERIALS', code: 'material-receiving', name: '生产领料', route: '/material-receiving', app_type: 0, is_hidden: 0, sort_number: 4 },
    { id: 'proc-material-return', oid: 'PROC_MAT_RETURN', parent_oid: 'PROC_MATERIALS', code: 'material-return', name: '生产退料', route: '/material-return', app_type: 0, is_hidden: 0, sort_number: 5 },

    // 人工管理子菜单
    { id: 'proc-labor-attendance', oid: 'PROC_LABOR_ATTEND', parent_oid: 'PROC_LABOR', code: 'labor-attendance', name: '考勤管理', route: '/labor/attendance', app_type: 0, is_hidden: 0, sort_number: 1 },
    { id: 'proc-labor-personnel', oid: 'PROC_LABOR_PERSONNEL', parent_oid: 'PROC_LABOR', code: 'labor-personnel', name: '人事管理', route: '/labor/personnel', app_type: 0, is_hidden: 0, sort_number: 2 },
    { id: 'proc-labor-compensation', oid: 'PROC_LABOR_COMP', parent_oid: 'PROC_LABOR', code: 'labor-compensation', name: '薪酬管理', route: '/labor/compensation', app_type: 0, is_hidden: 0, sort_number: 3 },
    { id: 'proc-labor-analytics', oid: 'PROC_LABOR_ANALYTICS', parent_oid: 'PROC_LABOR', code: 'labor-analytics', name: '运营分析', route: '/labor/analytics', app_type: 0, is_hidden: 0, sort_number: 4 },

    // 生产汇总表子菜单
    { id: 'proc-summary-overview', oid: 'PROC_SUM_OVERVIEW', parent_oid: 'PROC_SUMMARY', code: 'summary-overview', name: '汇总看板', route: '/summary/overview', app_type: 0, is_hidden: 0, sort_number: 1 },
    { id: 'proc-summary-yield', oid: 'PROC_SUM_YIELD', parent_oid: 'PROC_SUMMARY', code: 'summary-yield', name: '产量分析', route: '/summary/yield', app_type: 0, is_hidden: 0, sort_number: 2 },
    { id: 'proc-summary-cost', oid: 'PROC_SUM_COST', parent_oid: 'PROC_SUMMARY', code: 'summary-cost', name: '成本分析', route: '/summary/cost', app_type: 0, is_hidden: 0, sort_number: 3 },
    { id: 'proc-summary-labor', oid: 'PROC_SUM_LABOR', parent_oid: 'PROC_SUMMARY', code: 'summary-labor', name: '人工分析', route: '/summary/labor', app_type: 0, is_hidden: 0, sort_number: 4 },
    { id: 'proc-summary-batch', oid: 'PROC_SUM_BATCH', parent_oid: 'PROC_SUMMARY', code: 'summary-batch', name: '批次汇总', route: '/summary/batch', app_type: 0, is_hidden: 0, sort_number: 5 },
    { id: 'proc-summary-chain', oid: 'PROC_SUM_CHAIN', parent_oid: 'PROC_SUMMARY', code: 'summary-chain', name: '全链条追溯', route: '/summary/chain', app_type: 0, is_hidden: 0, sort_number: 6 },
    { id: 'proc-summary-problems', oid: 'PROC_SUM_PROBLEMS', parent_oid: 'PROC_SUMMARY', code: 'summary-problems', name: '问题汇总', route: '/summary/problems', app_type: 0, is_hidden: 0, sort_number: 7 },
    { id: 'proc-summary-indicators', oid: 'PROC_SUM_INDICATORS', parent_oid: 'PROC_SUMMARY', code: 'summary-indicators', name: '指标看板', route: '/summary/indicators', app_type: 0, is_hidden: 0, sort_number: 8 },

    // 审批中心子菜单
    { id: 'proc-approval-center', oid: 'PROC_APPROVAL_CENTER', parent_oid: 'PROC_WORKFLOW', code: 'approval-center', name: '审批中心', route: '/approvals', app_type: 0, is_hidden: 0, sort_number: 1 },
    { id: 'proc-approval-material', oid: 'PROC_APPROVAL_MAT', parent_oid: 'PROC_WORKFLOW', code: 'approval-material', name: '物料审批', route: '/material-approval', app_type: 0, is_hidden: 0, sort_number: 2 },
    { id: 'proc-approval-production', oid: 'PROC_APPROVAL_PROD', parent_oid: 'PROC_WORKFLOW', code: 'approval-production', name: '生产审批', route: '/production-approval', app_type: 0, is_hidden: 0, sort_number: 3 },
    { id: 'proc-approval-farm', oid: 'PROC_APPROVAL_FARM', parent_oid: 'PROC_WORKFLOW', code: 'approval-farm', name: '农事审批', route: '/farm-approval', app_type: 0, is_hidden: 0, sort_number: 4 },
    { id: 'proc-approval-indicator', oid: 'PROC_APPROVAL_IND', parent_oid: 'PROC_WORKFLOW', code: 'approval-indicator', name: '指标预算审批', route: '/indicator-budget-approval', app_type: 0, is_hidden: 0, sort_number: 5 },
    { id: 'proc-my-applications', oid: 'PROC_MY_APPLICATIONS', parent_oid: 'PROC_WORKFLOW', code: 'my-applications', name: '我的申请', route: '/my-applications', app_type: 0, is_hidden: 0, sort_number: 6 },
    { id: 'proc-hr-approval', oid: 'PROC_HR_APPROVAL', parent_oid: 'PROC_WORKFLOW', code: 'hr-approval', name: '人事审批', route: '/hr-approval', app_type: 0, is_hidden: 0, sort_number: 7 },
  ];

  for (const proc of processes) {
    db.run(`
      INSERT OR REPLACE INTO processes (id, oid, process_code, process_name, parent_oid, route, app_type, is_hidden, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
    `, [proc.id, proc.oid, proc.code, proc.name, proc.parent_oid, proc.route, proc.app_type, proc.is_hidden, proc.sort_number, now, now]);
  }

  // ========== 角色权限矩阵 ==========
  // ROLE_ADMIN: 所有工序 × 全部动作
  const allProcessOids = processes.map(p => p.oid);
  const allActionOids = actions.map(a => a.oid);

  for (const processOid of allProcessOids) {
    for (const actionOid of allActionOids) {
      db.run(`
        INSERT OR REPLACE INTO roles_authority (id, role_oid, process_oid, action_oid, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `, [`ra-admin-${processOid}-${actionOid}`, 'ROLE_ADMIN', processOid, actionOid, now, now]);
    }
  }

  // ROLE_MANAGER: 查看所有 + 新增/编辑/审核（无删除）
  const managerActionOids = ['ACT001', 'ACT002', 'ACT003', 'ACT005', 'ACT006']; // view, create, edit, export, approve
  for (const processOid of allProcessOids) {
    for (const actionOid of managerActionOids) {
      db.run(`
        INSERT OR REPLACE INTO roles_authority (id, role_oid, process_oid, action_oid, value, created_at, updated_at)
        VALUES (?, ?, ?, ?, 1, ?, ?)
      `, [`ra-manager-${processOid}-${actionOid}`, 'ROLE_MANAGER', processOid, actionOid, now, now]);
    }
  }

  // ROLE_USER: 仅查看所有
  for (const processOid of allProcessOids) {
    db.run(`
      INSERT OR REPLACE INTO roles_authority (id, role_oid, process_oid, action_oid, value, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `, [`ra-user-${processOid}-view`, 'ROLE_USER', processOid, 'ACT001', now, now]);
  }

  // ========== 角色数据权限 ==========
  // ROLE_ADMIN: 可看所有组织数据
  for (const org of orgs) {
    db.run(`
      INSERT OR REPLACE INTO roles_data_authority (id, role_oid, org_oid, created_at)
      VALUES (?, ?, ?, ?)
    `, [`rda-admin-${org.oid}`, 'ROLE_ADMIN', org.oid, now]);
  }

  // ROLE_MANAGER: 可看生产部+技术部
  ['ORG002', 'ORG003'].forEach(orgOid => {
    db.run(`
      INSERT OR REPLACE INTO roles_data_authority (id, role_oid, org_oid, created_at)
      VALUES (?, ?, ?, ?)
    `, [`rda-manager-${orgOid}`, 'ROLE_MANAGER', orgOid, now]);
  });

  console.log(`已导入 ${orgs.length} 个组织`);
  console.log(`已导入 ${actions.length} 个动作`);
  console.log(`已导入 ${processes.length} 个工序`);
  console.log(`已导入 ${allProcessOids.length * allActionOids.length} 条管理员角色权限`);
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
 * V10.0: 导入施肥管理相关种子数据
 * 包括 fertilizer_type 字典 和 plant_marks 标记
 */
function seedFertilizerAndMarks() {
  const db = getDatabase();

  // === fertilizer_type 字典分类 ===
  try {
    db.run(`INSERT OR IGNORE INTO dictionary_categories (category_code, category_name, description, sort_order) VALUES (?, ?, ?, ?)`,
      ['fertilizer_type', '肥料类型', '施肥管理中肥料类型分类', 90]);
  } catch (e) { /* 已存在 */ }

  // === fertilizer_type 字典项 ===
  const fertilizerTypes = [
    { id: 'fert-001', category: 'fertilizer_type', code: 'organic', name: '有机肥', sort: 1 },
    { id: 'fert-002', category: 'fertilizer_type', code: 'inorganic', name: '无机肥', sort: 2 },
    { id: 'fert-003', category: 'fertilizer_type', code: 'compound', name: '复合肥', sort: 3 },
    { id: 'fert-004', category: 'fertilizer_type', code: 'microbial', name: '微生物肥', sort: 4 },
    { id: 'fert-005', category: 'fertilizer_type', code: 'foliar', name: '叶面肥', sort: 5 },
    { id: 'fert-006', category: 'fertilizer_type', code: 'water_soluble', name: '水溶肥', sort: 6 },
    { id: 'fert-007', category: 'fertilizer_type', code: 'slow_release', name: '缓释肥', sort: 7 },
    { id: 'fert-008', category: 'fertilizer_type', code: 'other_fert', name: '其他', sort: 8 },
  ];

  for (const ft of fertilizerTypes) {
    db.run(
      `INSERT OR IGNORE INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, sort_order, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
      [ft.id, ft.category, ft.code, ft.name, ft.name, ft.sort]
    );
  }

  // === plant_marks 标记种子数据 ===
  const existingMarks = db.exec('SELECT COUNT(*) FROM plant_marks');
  if ((existingMarks[0]?.values[0]?.[0] ?? 0) === 0) {
    const marks = [
      { id: 1, name: '正常', color: '#22c55e', icon: 'CheckCircle', parent_id: 0, mark_aid: 'normal', is_use: 1, sort_order: 1 },
      { id: 2, name: '关注', color: '#f59e0b', icon: 'AlertTriangle', parent_id: 0, mark_aid: 'normal', is_use: 1, sort_order: 2 },
      { id: 3, name: '问题', color: '#ef4444', icon: 'AlertCircle', parent_id: 0, mark_aid: 'normal', is_use: 1, sort_order: 3 },
      { id: 4, name: '已采收', color: '#3b82f6', icon: 'PackageCheck', parent_id: 0, mark_aid: 'harvest', is_use: 1, sort_order: 4 },
      { id: 5, name: '废弃', color: '#9ca3af', icon: 'Trash2', parent_id: 0, mark_aid: 'disuse', is_use: 0, sort_order: 5 },
      { id: 6, name: '已移除', color: '#6b7280', icon: 'XCircle', parent_id: 0, mark_aid: 'removed', is_use: 0, sort_order: 6 },
    ];

    for (const mark of marks) {
      db.run(
        `INSERT INTO plant_marks (id, name, color, icon, parent_id, mark_aid, is_use, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [mark.id, mark.name, mark.color, mark.icon, mark.parent_id, mark.mark_aid, mark.is_use, mark.sort_order]
      );
    }
    console.log(`已导入 ${marks.length} 条种植标记数据`);
  }

  // === iot_devices IoT设备种子数据 ===
  const existingIotDevices = db.exec('SELECT COUNT(*) FROM iot_devices');
  if ((existingIotDevices[0]?.values[0]?.[0] ?? 0) === 0) {
    const devices = [
      { device_id: 'IOT-FERT-001', device_name: '施肥区1号传感器', api_key: 'iot-test-key-2026', is_active: 1, create_time: new Date().toISOString() },
      { device_id: 'IOT-FERT-002', device_name: '施肥区2号传感器', api_key: 'iot-test-key-2026', is_active: 1, create_time: new Date().toISOString() },
      { device_id: 'IOT-ENV-001', device_name: '环境监测主传感器', api_key: 'iot-test-key-2026', is_active: 1, create_time: new Date().toISOString() },
    ];

    for (const d of devices) {
      db.run(
        `INSERT INTO iot_devices (device_id, device_name, api_key, is_active, create_time)
         VALUES (?, ?, ?, ?, ?)`,
        [d.device_id, d.device_name, d.api_key, d.is_active, d.create_time]
      );
    }
    console.log(`已导入 ${devices.length} 条IoT设备种子数据`);
  }
}

/**
 * 行政区划种子数据（国家+34省+~340市）
 */
function seedRegionData() {
  const db = getDatabase();

  // 检查是否已有完整数据（市级）
  const existing = db.exec('SELECT COUNT(*) FROM region_data');
  const count = Number(existing[0]?.values[0]?.[0]) || 0;
  if (count > 40) {
    console.log(`行政区划数据已存在 (${count} 条)，跳过导入`);
    return;
  }
  if (count > 0) db.run('DELETE FROM region_data');

  const provinces = [
    '北京市','天津市','河北省','山西省','内蒙古自治区',
    '辽宁省','吉林省','黑龙江省','上海市','江苏省',
    '浙江省','安徽省','福建省','江西省','山东省',
    '河南省','湖北省','湖南省','广东省','广西壮族自治区',
    '海南省','重庆市','四川省','贵州省','云南省',
    '西藏自治区','陕西省','甘肃省','青海省','宁夏回族自治区',
    '新疆维吾尔自治区','香港特别行政区','澳门特别行政区','台湾省',
  ];

  const provinceCities: Record<string, string[]> = {
    '北京市': ['东城区','西城区','朝阳区','海淀区','丰台区','石景山区','通州区','大兴区','顺义区','昌平区','房山区','门头沟区','平谷区','怀柔区','密云区','延庆区'],
    '天津市': ['和平区','河东区','河西区','南开区','河北区','红桥区','滨海新区','东丽区','西青区','津南区','北辰区','武清区','宝坻区','宁河区','静海区','蓟州区'],
    '河北省': ['石家庄市','唐山市','秦皇岛市','邯郸市','邢台市','保定市','张家口市','承德市','沧州市','廊坊市','衡水市'],
    '山西省': ['太原市','大同市','阳泉市','长治市','晋城市','朔州市','晋中市','运城市','忻州市','临汾市','吕梁市'],
    '内蒙古自治区': ['呼和浩特市','包头市','乌海市','赤峰市','通辽市','鄂尔多斯市','呼伦贝尔市','巴彦淖尔市','乌兰察布市','兴安盟','锡林郭勒盟','阿拉善盟'],
    '辽宁省': ['沈阳市','大连市','鞍山市','抚顺市','本溪市','丹东市','锦州市','营口市','阜新市','辽阳市','盘锦市','铁岭市','朝阳市','葫芦岛市'],
    '吉林省': ['长春市','吉林市','四平市','辽源市','通化市','白山市','松原市','白城市','延边朝鲜族自治州'],
    '黑龙江省': ['哈尔滨市','齐齐哈尔市','鸡西市','鹤岗市','双鸭山市','大庆市','伊春市','佳木斯市','七台河市','牡丹江市','黑河市','绥化市','大兴安岭地区'],
    '上海市': ['黄浦区','徐汇区','长宁区','静安区','普陀区','虹口区','杨浦区','浦东新区','闵行区','宝山区','嘉定区','金山区','松江区','青浦区','奉贤区','崇明区'],
    '江苏省': ['南京市','无锡市','徐州市','常州市','苏州市','南通市','连云港市','淮安市','盐城市','扬州市','镇江市','泰州市','宿迁市'],
    '浙江省': ['杭州市','宁波市','温州市','嘉兴市','湖州市','绍兴市','金华市','衢州市','舟山市','台州市','丽水市'],
    '安徽省': ['合肥市','芜湖市','蚌埠市','淮南市','马鞍山市','淮北市','铜陵市','安庆市','黄山市','滁州市','阜阳市','宿州市','六安市','亳州市','池州市','宣城市'],
    '福建省': ['福州市','厦门市','莆田市','三明市','泉州市','漳州市','南平市','龙岩市','宁德市'],
    '江西省': ['南昌市','景德镇市','萍乡市','九江市','新余市','鹰潭市','赣州市','吉安市','宜春市','抚州市','上饶市'],
    '山东省': ['济南市','青岛市','淄博市','枣庄市','东营市','烟台市','潍坊市','济宁市','泰安市','威海市','日照市','临沂市','德州市','聊城市','滨州市','菏泽市'],
    '河南省': ['郑州市','开封市','洛阳市','平顶山市','安阳市','鹤壁市','新乡市','焦作市','濮阳市','许昌市','漯河市','三门峡市','南阳市','商丘市','信阳市','周口市','驻马店市','济源市'],
    '湖北省': ['武汉市','黄石市','十堰市','宜昌市','襄阳市','鄂州市','荆门市','孝感市','荆州市','黄冈市','咸宁市','随州市','恩施土家族苗族自治州','仙桃市','潜江市','天门市','神农架林区'],
    '湖南省': ['长沙市','株洲市','湘潭市','衡阳市','邵阳市','岳阳市','常德市','张家界市','益阳市','郴州市','永州市','怀化市','娄底市','湘西土家族苗族自治州'],
    '广东省': ['广州市','韶关市','深圳市','珠海市','汕头市','佛山市','江门市','湛江市','茂名市','肇庆市','惠州市','梅州市','汕尾市','河源市','阳江市','清远市','东莞市','中山市','潮州市','揭阳市','云浮市'],
    '广西壮族自治区': ['南宁市','柳州市','桂林市','梧州市','北海市','防城港市','钦州市','贵港市','玉林市','百色市','贺州市','河池市','来宾市','崇左市'],
    '海南省': ['海口市','三亚市','三沙市','儋州市','五指山市','琼海市','文昌市','万宁市','东方市','定安县','屯昌县','澄迈县','临高县','白沙黎族自治县','昌江黎族自治县','乐东黎族自治县','陵水黎族自治县','保亭黎族苗族自治县','琼中黎族苗族自治县'],
    '重庆市': ['万州区','涪陵区','渝中区','大渡口区','江北区','沙坪坝区','九龙坡区','南岸区','北碚区','綦江区','大足区','渝北区','巴南区','黔江区','长寿区','江津区','合川区','永川区','南川区','璧山区','铜梁区','潼南区','荣昌区','开州区','梁平区','武隆区','城口县','丰都县','垫江县','忠县','云阳县','奉节县','巫山县','巫溪县','石柱土家族自治县','秀山土家族苗族自治县','酉阳土家族苗族自治县','彭水苗族土家族自治县'],
    '四川省': ['成都市','自贡市','攀枝花市','泸州市','德阳市','绵阳市','广元市','遂宁市','内江市','乐山市','南充市','眉山市','宜宾市','广安市','达州市','雅安市','巴中市','资阳市','阿坝藏族羌族自治州','甘孜藏族自治州','凉山彝族自治州'],
    '贵州省': ['贵阳市','六盘水市','遵义市','安顺市','毕节市','铜仁市','黔西南布依族苗族自治州','黔东南苗族侗族自治州','黔南布依族苗族自治州'],
    '云南省': ['昆明市','曲靖市','玉溪市','保山市','昭通市','丽江市','普洱市','临沧市','楚雄彝族自治州','红河哈尼族彝族自治州','文山壮族苗族自治州','西双版纳傣族自治州','大理白族自治州','德宏傣族景颇族自治州','怒江傈僳族自治州','迪庆藏族自治州'],
    '西藏自治区': ['拉萨市','日喀则市','昌都市','林芝市','山南市','那曲市','阿里地区'],
    '陕西省': ['西安市','铜川市','宝鸡市','咸阳市','渭南市','延安市','汉中市','榆林市','安康市','商洛市'],
    '甘肃省': ['兰州市','嘉峪关市','金昌市','白银市','天水市','武威市','张掖市','平凉市','酒泉市','庆阳市','定西市','陇南市','临夏回族自治州','甘南藏族自治州'],
    '青海省': ['西宁市','海东市','海北藏族自治州','黄南藏族自治州','海南藏族自治州','果洛藏族自治州','玉树藏族自治州','海西蒙古族藏族自治州'],
    '宁夏回族自治区': ['银川市','石嘴山市','吴忠市','固原市','中卫市'],
    '新疆维吾尔自治区': ['乌鲁木齐市','克拉玛依市','吐鲁番市','哈密市','昌吉回族自治州','博尔塔拉蒙古自治州','巴音郭楞蒙古自治州','阿克苏地区','克孜勒苏柯尔克孜自治州','喀什地区','和田地区','伊犁哈萨克自治州','塔城地区','阿勒泰地区','石河子市','阿拉尔市','图木舒克市','五家渠市','北屯市','铁门关市','双河市','可克达拉市','昆玉市','胡杨河市'],
    '香港特别行政区': ['中西区','湾仔区','东区','南区','油尖旺区','深水埗区','九龙城区','黄大仙区','观塘区','荃湾区','屯门区','元朗区','北区','大埔区','西贡区','沙田区','葵青区','离岛区'],
    '澳门特别行政区': ['澳门半岛','氹仔','路环','路氹城'],
    '台湾省': ['台北市','高雄市','台中市','台南市','基隆市','新竹市','嘉义市','新北市','桃园市','新竹县','苗栗县','彰化县','南投县','云林县','嘉义县','屏东县','宜兰县','花莲县','台东县','澎湖县','金门县','连江县'],
  };

  db.run('INSERT INTO region_data (id, name, parent_id, level) VALUES (?, ?, ?, ?)', [1, '中国', 0, 'country']);

  let nextId = 2;
  for (const name of provinces) {
    db.run('INSERT INTO region_data (id, name, parent_id, level) VALUES (?, ?, ?, ?)', [nextId, name, 1, 'province']);
    nextId++;
  }

  let totalCities = 0;
  for (let i = 0; i < provinces.length; i++) {
    const provinceId = i + 2;
    const cities = provinceCities[provinces[i]] || [];
    for (const cityName of cities) {
      db.run('INSERT INTO region_data (id, name, parent_id, level) VALUES (?, ?, ?, ?)', [nextId, cityName, provinceId, 'city']);
      nextId++;
      totalCities++;
    }
  }

  console.log(`已导入行政区划种子数据: 1个国家, ${provinces.length}个省, ${totalCities}个市`);
}

/**
 * 工序定义种子数据
 */
function seedProcessDefinitions() {
  const db = getDatabase();

  const result = db.exec('SELECT COUNT(*) as cnt FROM process_definitions');
  const count: number = result.length > 0 ? Number(result[0].values[0][0]) : 0;
  if (count > 0) return;

  const items = [
    { code: 'PD001', name: '整地', type: '耕地', unit: '亩', price: 120, bonus: 5 },
    { code: 'PD002', name: '播种', type: '播种', unit: '亩', price: 80, bonus: 5 },
    { code: 'PD003', name: '施肥', type: '施肥', unit: '亩', price: 100, bonus: 10 },
    { code: 'PD004', name: '浇水', type: '灌溉', unit: '亩', price: 60, bonus: 0 },
    { code: 'PD005', name: '除草', type: '除草', unit: '亩', price: 90, bonus: 5 },
    { code: 'PD006', name: '打药', type: '植保', unit: '亩', price: 110, bonus: 10 },
    { code: 'PD007', name: '摘心', type: '修剪', unit: '株', price: 0.5, bonus: 0 },
    { code: 'PD008', name: '授粉', type: '授粉', unit: '亩', price: 150, bonus: 15 },
    { code: 'PD009', name: '采收', type: '采收', unit: '公斤', price: 2, bonus: 20 },
    { code: 'PD010', name: '分级包装', type: '包装', unit: '公斤', price: 1, bonus: 10 },
  ];

  const stmt = db.prepare(`
    INSERT INTO process_definitions (oid, process_code, process_name, process_type, unit, default_price, default_bonus, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);

  for (const item of items) {
    const oid = `PD${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    stmt.run([oid, item.code, item.name, item.type, item.unit, item.price, item.bonus, '']);
  }
  stmt.free();

  console.log(`已导入工序定义种子数据: ${items.length}条`);
}

/**
 * 审批级别配置种子数据（4个级别）
 */
function seedApprovalLevelConfigs() {
  const db = getDatabase();

  const result = db.exec('SELECT COUNT(*) as cnt FROM approval_level_configs');
  const count: number = result.length > 0 ? Number(result[0].values[0][0]) : 0;
  if (count > 0) return;

  const configs = [
    { code: 'exempt', name: '免审批', desc: '金额低于阈值，自动通过，无需人工审批', approverCount: 0, requireMulti: 0, roles: null, sort: 0 },
    { code: 'quick', name: '快速审批', desc: '单人审批，快速通过', approverCount: 1, requireMulti: 0, roles: JSON.stringify(['manager']), sort: 1 },
    { code: 'standard', name: '标准审批', desc: '部门主管 + 经理二级审批', approverCount: 2, requireMulti: 0, roles: JSON.stringify(['department_head', 'manager']), sort: 2 },
    { code: 'strict', name: '严格审批', desc: '部门主管 + 经理 + 总监三级审批', approverCount: 3, requireMulti: 1, roles: JSON.stringify(['department_head', 'manager', 'director']), sort: 3 },
  ];

  const stmt = db.prepare(`
    INSERT INTO approval_level_configs (oid, level_code, level_name, description, approver_count, require_multi_approver, approver_roles, sort_order, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);

  for (const item of configs) {
    const oid = `ALC${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    stmt.run([oid, item.code, item.name, item.desc, item.approverCount, item.requireMulti, item.roles, item.sort]);
  }
  stmt.free();

  console.log(`已导入审批级别配置种子数据: ${configs.length}条`);
}

/**
 * 审批金额阈值种子数据（4个阈值）
 */
function seedApprovalAmountThresholds() {
  const db = getDatabase();

  const result = db.exec('SELECT COUNT(*) as cnt FROM approval_amount_thresholds');
  const count: number = result.length > 0 ? Number(result[0].values[0][0]) : 0;
  if (count > 0) return;

  const thresholds = [
    { max: 1000, level: 'exempt', sort: 0 },
    { max: 10000, level: 'quick', sort: 1 },
    { max: 50000, level: 'standard', sort: 2 },
  ];

  const stmt = db.prepare(`
    INSERT INTO approval_amount_thresholds (oid, max_amount, level_code, sort_order, status)
    VALUES (?, ?, ?, ?, 'active')
  `);

  for (const item of thresholds) {
    const oid = `AAT${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    stmt.run([oid, item.max, item.level, item.sort]);
  }
  stmt.free();

  console.log(`已导入审批金额阈值种子数据: ${thresholds.length}条`);
}

/**
 * 审批类型规则种子数据（37种类型）
 */
function seedApprovalTypeRules() {
  const db = getDatabase();

  const result = db.exec('SELECT COUNT(*) as cnt FROM approval_type_rules');
  const count: number = result.length > 0 ? Number(result[0].values[0][0]) : 0;
  if (count > 0) return;

  const rules = [
    // 业务审批（10种）
    { type: 'material_request', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 1, customCount: null, remark: '领料申请，根据金额确定审批级别' },
    { type: 'return_material', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 1, customCount: null, remark: '退料单' },
    { type: 'purchase_request', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 1, customCount: null, remark: '采购申请，根据采购金额确定审批级别' },
    { type: 'material_inbound', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 1, customCount: null, remark: '物料入库' },
    { type: 'material_transfer', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 1, customCount: null, remark: '库存调拨' },
    { type: 'seed_source_inbound', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '种源入库，需要严格审批' },
    { type: 'seedling_plan', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '育苗计划' },
    { type: 'planting_plan', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '种植计划' },
    { type: 'order_create', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '订单创建，高价值订单需要严格审批' },
    { type: 'order_change', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '订单变更' },
    // 生产审批（5种）
    { type: 'production_plan', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '生产计划，需要标准审批' },
    { type: 'production_batch', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '生产批次' },
    { type: 'batch_change', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '批次变更' },
    { type: 'batch_void', forceExempt: 0, forceStrict: 1, forcedLevel: null, batch: 0, customCount: null, remark: '批次作废，强制严格审批' },
    { type: 'tech_solution', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '技术方案' },
    // 农事审批（4种）
    { type: 'task_dispatch', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '任务派发' },
    { type: 'task_change', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '任务变更' },
    { type: 'inspection_issue', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '巡查问题' },
    { type: 'issue_resolve', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '问题整改' },
    // 采收审批（1种）
    { type: 'harvest_request', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '采收申请' },
    // 作物补录审批（3种）
    { type: 'seed_source_supplementary', forceExempt: 0, forceStrict: 1, forcedLevel: null, batch: 0, customCount: null, remark: '种源补录，强制严格审批' },
    { type: 'seedling_supplementary', forceExempt: 0, forceStrict: 1, forcedLevel: null, batch: 0, customCount: null, remark: '育苗补录，强制严格审批' },
    { type: 'crop_storage_supplementary', forceExempt: 0, forceStrict: 1, forcedLevel: null, batch: 0, customCount: null, remark: '作物入库补录，强制严格审批' },
    // 指标/公告审批（2种）
    { type: 'indicator_approval', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '指标审批' },
    { type: 'announcement_approval', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '公告审批' },
    // 成本审批（2种）
    { type: 'budget_create', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '预算编制，高金额需要严格审批' },
    { type: 'budget_adjust', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '预算调整，高金额需要严格审批' },
    // HR审批（10种）
    { type: 'leave', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '请假，3天内快速审批' },
    { type: 'overtime', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '加班，2小时内免审批' },
    { type: 'resignation', forceExempt: 0, forceStrict: 1, forcedLevel: null, batch: 0, customCount: null, remark: '离职，强制严格审批' },
    { type: 'recruitment', forceExempt: 0, forceStrict: 0, forcedLevel: 'standard', batch: 0, customCount: null, remark: '招聘，标准二级审批（部门主管+经理）' },
    { type: 'onboarding', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '入职' },
    { type: 'attendance_repair', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '考勤补录' },
    { type: 'salary_adjustment', forceExempt: 0, forceStrict: 1, forcedLevel: null, batch: 0, customCount: null, remark: '调薪，强制严格审批' },
    { type: 'contract_renewal', forceExempt: 0, forceStrict: 0, forcedLevel: null, batch: 0, customCount: null, remark: '合同续签' },
    { type: 'salary_budget', forceExempt: 0, forceStrict: 1, forcedLevel: null, batch: 0, customCount: null, remark: '工资预算，强制严格审批' },
    { type: 'transfer', forceExempt: 0, forceStrict: 1, forcedLevel: null, batch: 0, customCount: null, remark: '转岗，强制严格审批' },
  ];

  const stmt = db.prepare(`
    INSERT INTO approval_type_rules (oid, approval_type, force_exempt, force_strict, forced_level, batch_approval_supported, custom_approver_count, remark, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
  `);

  for (const item of rules) {
    const oid = `ATR${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
    stmt.run([oid, item.type, item.forceExempt, item.forceStrict, item.forcedLevel, item.batch, item.customCount, item.remark]);
  }
  stmt.free();

  console.log(`已导入审批类型规则种子数据: ${rules.length}条`);
}

/**
 * 导入成本类别种子数据
 */
function seedCostCategories() {
  const db = getDatabase();
  const existing = db.exec('SELECT COUNT(*) FROM cost_categories');
  const count = existing.length > 0 ? Number(existing[0].values[0][0]) : 0;
  if (count > 0) return;

  const categories = [
    { oid: 'CC001', code: 'COST-MAT-001', name: '肥料成本', type: 'material', unit: '元/吨', description: '各种肥料采购成本' },
    { oid: 'CC002', code: 'COST-MAT-002', name: '农药成本', type: 'material', unit: '元/升', description: '农药采购成本' },
    { oid: 'CC003', code: 'COST-LAB-001', name: '人工成本', type: 'labor', unit: '元/工时', description: '工人工资和福利' },
    { oid: 'CC004', code: 'COST-EQP-001', name: '设备折旧', type: 'equipment', unit: '元/月', description: '设备折旧费用' },
    { oid: 'CC005', code: 'COST-ENR-001', name: '水电费', type: 'energy', unit: '元/度', description: '水电能源消耗' },
    { oid: 'CC006', code: 'COST-OTH-001', name: '其他费用', type: 'other', unit: '元', description: '其他杂项费用' },
  ];

  const stmt = db.prepare(`
    INSERT INTO cost_categories (oid, category_code, category_name, category_type, unit, description, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `);

  for (const c of categories) {
    stmt.run([c.oid, c.code, c.name, c.type, c.unit, c.description]);
  }
  stmt.free();
  console.log(`已导入成本类别种子数据: ${categories.length}条`);
}

/**
 * 导入成本预算种子数据
 */
function seedCostBudgets() {
  const db = getDatabase();
  const existing = db.exec('SELECT COUNT(*) FROM cost_budgets');
  const count = existing.length > 0 ? Number(existing[0].values[0][0]) : 0;
  if (count > 0) return;

  const budgets = [
    { oid: 'CB001', name: '2024年Q1肥料预算', categoryOid: 'CC001', year: 2024, month: 3, amount: 50000, used: 32000 },
    { oid: 'CB002', name: '2024年Q1农药预算', categoryOid: 'CC002', year: 2024, month: 3, amount: 20000, used: 15000 },
    { oid: 'CB003', name: '2024年Q1人工预算', categoryOid: 'CC003', year: 2024, month: 3, amount: 80000, used: 65000 },
  ];

  const stmt = db.prepare(`
    INSERT INTO cost_budgets (oid, budget_name, category_oid, budget_year, budget_month, budget_amount, used_amount, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `);

  for (const b of budgets) {
    stmt.run([b.oid, b.name, b.categoryOid, b.year, b.month, b.amount, b.used]);
  }
  stmt.free();
  console.log(`已导入成本预算种子数据: ${budgets.length}条`);
}

/**
 * 导入班次种子数据
 */
function seedShifts() {
  const db = getDatabase();
  const existing = db.exec('SELECT COUNT(*) FROM shifts');
  const count = existing.length > 0 ? Number(existing[0].values[0][0]) : 0;
  if (count > 0) return;

  const shifts = [
    { oid: 'SH001', code: 'SH001', name: '早班', startTime: '06:00', endTime: '14:00', type: '早班', description: '早班 06:00-14:00' },
    { oid: 'SH002', code: 'SH002', name: '中班', startTime: '14:00', endTime: '22:00', type: '中班', description: '中班 14:00-22:00' },
    { oid: 'SH003', code: 'SH003', name: '晚班', startTime: '22:00', endTime: '06:00', type: '晚班', description: '晚班 22:00-次日06:00' },
  ];

  const stmt = db.prepare(`
    INSERT INTO shifts (oid, shift_code, shift_name, start_time, end_time, shift_type, description, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `);

  for (const s of shifts) {
    stmt.run([s.oid, s.code, s.name, s.startTime, s.endTime, s.type, s.description]);
  }
  stmt.free();
  console.log(`已导入班次种子数据: ${shifts.length}条`);
}

function seedFarmActivities() {
  const db = getDatabase();
  const count = Number(db.exec("SELECT COUNT(*) FROM farm_activities")[0]?.values[0][0] || 0);
  if (count > 0) { console.log(`农事活动数据已存在 (${count}条)，跳过种子导入`); return; }

  const now = new Date().toISOString();
  const items = [
    { oid: 'FA001', code: 'FA202604001', name: '番茄地块浇水', type: 'WATERING', priority: 'MEDIUM', branchOid: 'BR001', startTime: '2026-04-15T08:00', endTime: '2026-04-15T10:00', assigneeIds: '["陈小芳"]', description: '根据土壤湿度情况进行灌溉', status: 'active' },
    { oid: 'FA002', code: 'FA202604002', name: '黄瓜地块施肥', type: 'FERTILIZING', priority: 'HIGH', branchOid: 'BR001', startTime: '2026-04-14T14:00', endTime: '2026-04-14T17:00', assigneeIds: '["周志强","吴美丽"]', description: '按照施肥计划执行', status: 'completed' },
    { oid: 'FA003', code: 'FA202604003', name: '生菜地块采收', type: 'HARVESTING', priority: 'HIGH', branchOid: 'BR002', startTime: '2026-04-16T06:00', endTime: '2026-04-16T12:00', assigneeIds: '["吴美丽","郑胜利","马超"]', description: '按时采收保证品质', status: 'in_progress' },
    { oid: 'FA004', code: 'FA202604004', name: '草莓地块巡田', type: 'INSPECTION', priority: 'LOW', branchOid: 'BR003', startTime: '2026-04-15T09:00', endTime: '2026-04-15T11:00', assigneeIds: '["赵文静"]', description: '日常巡田检查', status: 'active' },
  ];

  const stmt = db.prepare(`INSERT INTO farm_activities (oid, activity_code, activity_name, activity_type, priority, branch_oid, start_time, end_time, assignee_ids, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const item of items) {
    stmt.run([item.oid, item.code, item.name, item.type, item.priority, item.branchOid, item.startTime, item.endTime, item.assigneeIds, item.description, item.status, now, now]);
  }
  stmt.free();
  console.log(`已导入农事活动种子数据: ${items.length}条`);
}

function seedMaterialTypes() {
  const db = getDatabase();
  const count = Number(db.exec("SELECT COUNT(*) FROM material_types")[0]?.values[0][0] || 0);
  if (count > 0) { console.log(`物料类型数据已存在 (${count}条)，跳过种子导入`); return; }

  const now = new Date().toISOString();
  const items = [
    { oid: 'MT001', code: 'FERT001', name: '复合肥', category: '肥料', unit: '公斤', price: 8.5, spec: 'N-P-K 15-15-15', desc: '通用复合肥', status: 'active' },
    { oid: 'MT002', code: 'FERT002', name: '尿素', category: '肥料', unit: '公斤', price: 3.2, spec: '含氮46%', desc: '氮肥', status: 'active' },
    { oid: 'MT003', code: 'FERT003', name: '有机肥', category: '肥料', unit: '吨', price: 1200, spec: '腐熟有机肥', desc: '有机肥', status: 'active' },
    { oid: 'MT004', code: 'PEST001', name: '除草剂', category: '农药', unit: '升', price: 45, spec: '500ml/瓶', desc: '除草剂', status: 'active' },
    { oid: 'MT005', code: 'PEST002', name: '杀虫剂', category: '农药', unit: '升', price: 68, spec: '1L/瓶', desc: '杀虫剂', status: 'active' },
    { oid: 'MT006', code: 'PEST003', name: '杀菌剂', category: '农药', unit: '升', price: 55, spec: '500ml/瓶', desc: '杀菌剂', status: 'active' },
    { oid: 'MT007', code: 'FILM001', name: '地膜', category: '农膜', unit: '公斤', price: 15, spec: '宽1.2m', desc: '地膜', status: 'active' },
    { oid: 'MT008', code: 'FILM002', name: '棚膜', category: '农膜', unit: '公斤', price: 22, spec: '宽8m', desc: '棚膜', status: 'active' },
    { oid: 'MT009', code: 'TOOL001', name: '铁锹', category: '工具', unit: '把', price: 35, spec: '标准', desc: '铁锹', status: 'active' },
    { oid: 'MT010', code: 'TOOL002', name: '剪刀', category: '工具', unit: '把', price: 18, spec: '标准', desc: '修枝剪', status: 'active' },
  ];

  const stmt = db.prepare(`INSERT INTO material_types (oid, type_code, type_name, category, default_unit, default_price, specifications, description, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const item of items) {
    stmt.run([item.oid, item.code, item.name, item.category, item.unit, item.price, item.spec, item.desc, item.status, now, now]);
  }
  stmt.free();
  console.log(`已导入物料类型种子数据: ${items.length}条`);
}

/**
 * 导出数据库
 */
export function exportDatabase() {
  seedCropVarieties();
  seedSuppliers();
  seedSeedSources();
  seedPropagationSeedSources();
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
  seedAuthorityData();
  seedAllBusinessData();
  seedMaterialCosts();
  seedEnergyCosts();
  seedFertilizerAndMarks();
  seedRegionData();
  seedProcessDefinitions();
  seedCostCategories();
  seedCostBudgets();
  seedShifts();
  seedApprovalLevelConfigs();
  seedApprovalAmountThresholds();
  seedApprovalTypeRules();
  seedMaterialTypes();

  saveDatabase();
  console.log('数据库种子数据导入完成');
}
