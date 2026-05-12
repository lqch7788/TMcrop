/**
 * 仓库物料 Mock 数据 Seed 脚本
 * 将前端 mock 数据导入后端数据库
 */

import { initDatabase, getDatabase, saveDatabase } from '../src/db';
import { initializeDatabase } from '../src/db/schema';

async function main() {
  // 初始化数据库
  await initDatabase();
  // 初始化表结构
  initializeDatabase();

const db = getDatabase();

// 物料 Mock 数据 (来自 WarehouseOverviewPage.tsx)
const materials = [
  { id: 1, code: 'SP0101001', name: '水稻种子', category: '种质资源-粮食作物种子', unit: '袋', quantity: 200, minStock: 50, maxStock: 500, price: '30元', supplier: '金种子业公司', location: 'A区-01', specification: '25kg/袋', barcode: '6932456789012', batchNo: 'PC20260301', productionDate: '2026-01-15', expiryDate: '2027-01-15', lastUpdateTime: '2026-03-20 10:30:00', dataStatus: '启用' },
  { id: 2, code: 'SP0102001', name: '棉花种子', category: '种质资源-经济作物种子', unit: '袋', quantity: 80, minStock: 30, maxStock: 200, price: '25元', supplier: '丰收种业', location: 'A区-02', specification: '20kg/袋', barcode: '6932456789013', batchNo: 'PC20260220', productionDate: '2026-02-01', expiryDate: '2027-02-01', lastUpdateTime: '2026-03-19 14:20:00', dataStatus: '启用' },
  { id: 3, code: 'SP0103001', name: '番茄种子', category: '种质资源-蔬菜种子', unit: '袋', quantity: 100, minStock: 50, maxStock: 300, price: '25元', supplier: '鑫源农资公司', location: 'A区-03', specification: '10g/袋', barcode: '6932456789014', batchNo: 'PC20260305', productionDate: '2026-02-20', expiryDate: '2026-08-20', lastUpdateTime: '2026-03-18 09:15:00', dataStatus: '启用' },
  { id: 4, code: 'SP0201001', name: '商品有机肥', category: '肥料与土壤改良剂-有机肥', unit: '袋', quantity: 50, minStock: 100, maxStock: 400, price: '45元', supplier: '丰达化肥厂', location: 'B区-01', specification: '40kg/袋', barcode: '6932456789015', batchNo: 'PC20260110', productionDate: '2026-01-10', expiryDate: '2026-07-10', lastUpdateTime: '2026-03-20 08:00:00', dataStatus: '启用' },
  { id: 5, code: 'SP0202001', name: '尿素', category: '肥料与土壤改良剂-化学肥料', unit: '袋', quantity: 150, minStock: 50, maxStock: 500, price: '80元', supplier: '丰达化肥厂', location: 'B区-02', specification: '50kg/袋', barcode: '6932456789016', batchNo: 'PC20260228', productionDate: '2026-02-28', expiryDate: '2028-02-28', lastUpdateTime: '2026-03-17 16:45:00', dataStatus: '启用' },
  { id: 6, code: 'SP0301001', name: '吡虫啉', category: '农药与植保产品-杀虫剂', unit: '箱', quantity: 30, minStock: 20, maxStock: 100, price: '120元', supplier: '绿叶农业用品店', location: 'C区-01', specification: '100g/瓶', barcode: '6932456789017', batchNo: 'PC20251215', productionDate: '2025-12-15', expiryDate: '2027-12-15', lastUpdateTime: '2026-03-16 11:30:00', dataStatus: '启用' },
  { id: 7, code: 'SP0302001', name: '多菌灵', category: '农药与植保产品-杀菌剂', unit: '箱', quantity: 20, minStock: 20, maxStock: 80, price: '150元', supplier: '绿叶农业用品店', location: 'C区-02', specification: '200g/瓶', barcode: '6932456789018', batchNo: 'PC20251120', productionDate: '2025-11-20', expiryDate: '2027-11-20', lastUpdateTime: '2026-03-15 13:20:00', dataStatus: '停用' },
  { id: 8, code: 'EQ0103001', name: '电动喷雾机', category: '农业机械-植保机械', unit: '台', quantity: 10, minStock: 5, maxStock: 30, price: '280元', supplier: '农机设备公司', location: 'D区-01', specification: '3W-16L', barcode: '6932456789019', batchNo: 'EQ20260301', productionDate: '2026-02-15', expiryDate: '2031-02-15', lastUpdateTime: '2026-03-14 10:00:00', dataStatus: '启用' },
  { id: 9, code: 'EQ0306001', name: '滴灌带', category: '灌溉与水肥系统-灌溉终端', unit: '卷', quantity: 500, minStock: 200, maxStock: 1000, price: '25元', supplier: '节水灌溉设备厂', location: 'E区-01', specification: 'D16-2.0L/h', barcode: '6932456789020', batchNo: 'EQ20260125', productionDate: '2026-01-25', expiryDate: '2031-01-25', lastUpdateTime: '2026-03-13 15:30:00', dataStatus: '启用' },
  { id: 10, code: 'OP0102001', name: '劳保胶靴', category: '劳保与防护用品-足部防护', unit: '双', quantity: 40, minStock: 20, maxStock: 100, price: '35元', supplier: '劳保用品商店', location: 'F区-01', specification: '39-43码', barcode: '6932456789021', batchNo: 'OP20260201', productionDate: '2026-02-01', expiryDate: '2028-02-01', lastUpdateTime: '2026-03-12 09:45:00', dataStatus: '启用' },
  { id: 11, code: 'OP0201001', name: '锄头', category: '日常劳动工具-手动农具', unit: '把', quantity: 25, minStock: 10, maxStock: 80, price: '18元', supplier: '五金工具店', location: 'F区-02', specification: '1.2kg', barcode: '6932456789022', batchNo: 'OP20260115', productionDate: '2026-01-15', expiryDate: '2031-01-15', lastUpdateTime: '2026-03-11 14:00:00', dataStatus: '启用' },
  { id: 12, code: 'PH0104001', name: '塑料袋', category: '采收容器-包装材料', unit: '卷', quantity: 200, minStock: 100, maxStock: 500, price: '15元', supplier: '包装材料公司', location: 'G区-01', specification: '50cm*80cm', barcode: '6932456789023', batchNo: 'PH20260210', productionDate: '2026-02-10', expiryDate: '2027-02-10', lastUpdateTime: '2026-03-10 16:20:00', dataStatus: '启用' },
  { id: 13, code: 'IT0101001', name: '土壤温湿度传感器', category: '监测设备-传感器', unit: '个', quantity: 20, minStock: 10, maxStock: 50, price: '150元', supplier: '智慧农业设备商', location: 'H区-01', specification: 'RS485 Modbus', barcode: '6932456789024', batchNo: 'IT20260308', productionDate: '2026-03-08', expiryDate: '2031-03-08', lastUpdateTime: '2026-03-20 17:00:00', dataStatus: '启用' },
];

// 入库记录 Mock 数据 (来自 useWarehouseInbound.ts)
const inboundRecords = [
  {
    id: 1,
    code: 'RK20260401-001',
    inboundDate: '2026-04-01',
    supplier: '鑫源农资公司',
    operator: '张伟',
    status: 'pending',
    materials: [
      { id: 1, materialCode: 'SP0103001', materialName: '番茄种子', category: '种质资源-蔬菜种子', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '蔬菜种子', specification: '10g/袋', barcode: '6932456789014', unit: '袋', quantity: 100, price: '25', supplier: '鑫源农资公司', location: 'A-03', batchNo: 'PC20260305', productionDate: '2026-02-20', expiryDate: '2026-08-20', remarks: '' },
      { id: 2, materialCode: 'SP0101001', materialName: '水稻种子', category: '种质资源-粮食作物种子', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '粮食作物种子', specification: '25kg/袋', barcode: '6932456789012', unit: '袋', quantity: 200, price: '30', supplier: '鑫源农资公司', location: 'A-01', batchNo: 'PC20260301', productionDate: '2026-01-15', expiryDate: '2027-01-15', remarks: '' },
    ]
  },
  {
    id: 2,
    code: 'RK20260328-002',
    inboundDate: '2026-03-28',
    supplier: '丰达化肥厂',
    operator: '李明',
    status: 'pending',
    materials: [
      { id: 3, materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂-有机肥', bigCategory: '生产投入类', midCategory: '肥料与土壤改良剂', subCategory: '有机肥', specification: '40kg/袋', barcode: '6932456789015', unit: '袋', quantity: 50, price: '45', supplier: '丰达化肥厂', location: 'B-01', batchNo: 'PC20260110', productionDate: '2026-01-10', expiryDate: '2026-07-10', remarks: '' },
      { id: 4, materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂-化学肥料', bigCategory: '生产投入类', midCategory: '肥料与土壤改良剂', subCategory: '化学肥料', specification: '50kg/袋', barcode: '6932456789016', unit: '袋', quantity: 150, price: '80', supplier: '丰达化肥厂', location: 'B-02', batchNo: 'PC20260228', productionDate: '2026-02-28', expiryDate: '2028-02-28', remarks: '' },
    ]
  },
  {
    id: 3,
    code: 'RK20260325-003',
    inboundDate: '2026-03-25',
    supplier: '绿叶农业用品店',
    operator: '王建',
    status: 'pending',
    materials: [
      { id: 5, materialCode: 'SP0302001', materialName: '多菌灵', category: '农药与植保产品-杀菌剂', bigCategory: '生产投入类', midCategory: '农药与植保产品', subCategory: '杀菌剂', specification: '200g/瓶', barcode: '6932456789018', unit: '瓶', quantity: 20, price: '150', supplier: '绿叶农业用品店', location: 'C-02', batchNo: 'PC20251120', productionDate: '2025-11-20', expiryDate: '2027-11-20', remarks: '' },
      { id: 6, materialCode: 'SP0301001', materialName: '吡虫啉', category: '农药与植保产品-杀虫剂', bigCategory: '生产投入类', midCategory: '农药与植保产品', subCategory: '杀虫剂', specification: '100g/瓶', barcode: '6932456789017', unit: '瓶', quantity: 30, price: '120', supplier: '绿叶农业用品店', location: 'C-01', batchNo: 'PC20251215', productionDate: '2025-12-15', expiryDate: '2027-12-15', remarks: '' },
    ]
  },
  {
    id: 4,
    code: 'RK20260311-004',
    inboundDate: '2026-03-11',
    supplier: '劳保用品商店',
    operator: '李明',
    status: 'pending',
    materials: [
      { id: 7, materialCode: 'OP0102001', materialName: '劳保胶靴', category: '劳保与防护用品-足部防护', bigCategory: '作业支持类', midCategory: '劳保与防护用品', subCategory: '足部防护', specification: '39-43码', barcode: '6932456789021', unit: '双', quantity: 40, price: '35', supplier: '劳保用品商店', location: 'F-01', batchNo: 'OP20260201', productionDate: '2026-02-01', expiryDate: '2028-02-01', remarks: '' },
      { id: 8, materialCode: 'OP0201001', materialName: '锄头', category: '日常劳动工具-手动农具', bigCategory: '作业支持类', midCategory: '日常劳动工具', subCategory: '手动农具', specification: '1.2kg', barcode: '6932456789022', unit: '把', quantity: 25, price: '18', supplier: '劳保用品商店', location: 'F-02', batchNo: 'OP20260115', productionDate: '2026-01-15', expiryDate: '2031-01-15', remarks: '' },
    ]
  },
  {
    id: 5,
    code: 'RK20260402-005',
    inboundDate: '2026-04-02',
    supplier: '华东农机销售中心',
    operator: '张伟',
    status: 'pending',
    materials: [
      { id: 9, materialCode: 'EQ0101001', materialName: '微耕机', category: '农业机械-耕作机械', bigCategory: '设施与装备类', midCategory: '农业机械', subCategory: '耕作机械', specification: '1WG-4.0', barcode: '6932456789030', unit: '台', quantity: 5, price: '3200', supplier: '华东农机销售中心', location: 'D-01', batchNo: 'EQ20260401', productionDate: '2026-03-15', expiryDate: '2031-03-15', remarks: '' },
      { id: 10, materialCode: 'EQ0102001', materialName: '播种机', category: '农业机械-播种/移栽设备', bigCategory: '设施与装备类', midCategory: '农业机械', subCategory: '播种/移栽设备', specification: '2BX-6', barcode: '6932456789031', unit: '台', quantity: 3, price: '5600', supplier: '华东农机销售中心', location: 'D-02', batchNo: 'EQ20260402', productionDate: '2026-03-20', expiryDate: '2031-03-20', remarks: '' },
    ]
  },
  {
    id: 6,
    code: 'RK20260403-006',
    inboundDate: '2026-04-03',
    supplier: '蔬菜种苗培育基地',
    operator: '赵敏',
    status: 'pending',
    materials: [
      { id: 11, materialCode: 'SP0104001', materialName: '辣椒种苗', category: '种质资源-蔬菜种苗', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '蔬菜种苗', specification: '100株/箱', barcode: '6932456789040', unit: '箱', quantity: 50, price: '80', supplier: '蔬菜种苗培育基地', location: 'A-04', batchNo: 'SP20260401', productionDate: '2026-03-25', expiryDate: '2026-05-25', remarks: '' },
      { id: 12, materialCode: 'SP0104002', materialName: '茄子种苗', category: '种质资源-蔬菜种苗', bigCategory: '生产投入类', midCategory: '种质资源', subCategory: '蔬菜种苗', specification: '100株/箱', barcode: '6932456789041', unit: '箱', quantity: 40, price: '75', supplier: '蔬菜种苗培育基地', location: 'A-05', batchNo: 'SP20260402', productionDate: '2026-03-26', expiryDate: '2026-05-26', remarks: '' },
    ]
  },
  {
    id: 7,
    code: 'RK20260320-007',
    inboundDate: '2026-03-20',
    supplier: '农机设备公司',
    operator: '张伟',
    status: 'completed',
    materials: [
      { id: 13, materialCode: 'EQ0103001', materialName: '电动喷雾器', category: '农业机械-植保机械', bigCategory: '设施与装备类', midCategory: '农业机械', subCategory: '植保机械', specification: '3W-16L', barcode: '6932456789019', unit: '台', quantity: 10, price: '280', supplier: '农机设备公司', location: 'D-01', batchNo: 'EQ20260301', productionDate: '2026-02-15', expiryDate: '2031-02-15', remarks: '' },
      { id: 14, materialCode: 'EQ0306001', materialName: '滴灌带', category: '灌溉与水肥系统-灌溉终端', bigCategory: '设施与装备类', midCategory: '灌溉与水肥系统', subCategory: '灌溉终端', specification: 'D16-2.0L/h', barcode: '6932456789020', unit: '卷', quantity: 500, price: '25', supplier: '农机设备公司', location: 'E-01', batchNo: 'EQ20260125', productionDate: '2026-01-25', expiryDate: '2031-01-25', remarks: '' },
    ]
  },
  {
    id: 8,
    code: 'RK20260315-008',
    inboundDate: '2026-03-15',
    supplier: '包装材料公司',
    operator: '王建',
    status: 'completed',
    materials: [
      { id: 15, materialCode: 'PH0104001', materialName: '塑料袋', category: '采收容器-包装材料', bigCategory: '采后处理与流通类', midCategory: '包装材料', subCategory: '包装材料', specification: '50cm*80cm', barcode: '6932456789023', unit: '个', quantity: 200, price: '15', supplier: '包装材料公司', location: 'G-01', batchNo: 'PH20260210', productionDate: '2026-02-10', expiryDate: '2027-02-10', remarks: '' },
      { id: 16, materialCode: 'PH0105001', materialName: '纸箱', category: '采收容器-纸箱', bigCategory: '采后处理与流通类', midCategory: '包装材料', subCategory: '纸箱', specification: '40cm*30cm*20cm', barcode: '6932456789027', unit: '个', quantity: 150, price: '12', supplier: '包装材料公司', location: 'G-02', batchNo: 'PH20260301', productionDate: '2026-03-01', expiryDate: '2027-03-01', remarks: '' },
    ]
  },
  {
    id: 9,
    code: 'RK20260312-009',
    inboundDate: '2026-03-12',
    supplier: '丰和复合肥厂',
    operator: '李明',
    status: 'completed',
    materials: [
      { id: 17, materialCode: 'SP0203001', materialName: '水溶肥', category: '肥料与土壤改良剂-水溶肥', bigCategory: '生产投入类', midCategory: '肥料与土壤改良剂', subCategory: '水溶肥', specification: '5kg/袋', barcode: '6932456789028', unit: '袋', quantity: 100, price: '65', supplier: '丰和复合肥厂', location: 'B-03', batchNo: 'SP020301', productionDate: '2026-03-01', expiryDate: '2028-03-01', remarks: '' },
    ]
  },
  {
    id: 10,
    code: 'RK20260309-010',
    inboundDate: '2026-03-09',
    supplier: '智慧农业设备厂',
    operator: '张伟',
    status: 'voided',
    voidedDate: '2026-03-10',
    materials: [
      { id: 18, materialCode: 'IT0101001', materialName: '土壤温湿度传感器', category: '监测设备-传感器', bigCategory: '数字化与管理类', midCategory: '监测设备', subCategory: '传感器', specification: 'RS485 Modbus', barcode: '6932456789024', unit: '个', quantity: 20, price: '150', supplier: '智慧农业设备厂', location: 'H-01', batchNo: 'IT20260308', productionDate: '2026-03-08', expiryDate: '2031-03-08', remarks: '' },
    ]
  },
  {
    id: 11,
    code: 'RK20260308-011',
    inboundDate: '2026-03-08',
    supplier: '塑料制品厂',
    operator: '李明',
    status: 'voided',
    voidedDate: '2026-03-10',
    materials: [
      { id: 19, materialCode: 'PH0201001', materialName: '塑料筐', category: '采收容器-周转箱', bigCategory: '采后处理与流通类', midCategory: '周转箱', subCategory: '周转箱', specification: '60cm*40cm*30cm', barcode: '6932456789025', unit: '个', quantity: 100, price: '22', supplier: '塑料制品厂', location: 'G-02', batchNo: 'PH20260301', productionDate: '2026-03-01', expiryDate: '2027-03-01', remarks: '' },
    ]
  },
  {
    id: 12,
    code: 'RK20260307-012',
    inboundDate: '2026-03-07',
    supplier: '金属制品厂',
    operator: '王建',
    status: 'voided',
    voidedDate: '2026-03-09',
    materials: [
      { id: 20, materialCode: 'TK0101001', materialName: '塑料托盘', category: '仓储设备-托盘', bigCategory: '仓储设备', midCategory: '托盘', subCategory: '托盘', specification: '1200mm*1000mm', barcode: '6932456789026', unit: '个', quantity: 50, price: '180', supplier: '金属制品厂', location: 'H-02', batchNo: 'TK20260220', productionDate: '2026-02-20', expiryDate: '2031-02-20', remarks: '' },
    ]
  },
];

console.log('开始导入仓库物料 Mock 数据...');

// 导入物料数据
console.log('\n1. 导入物料数据...');
for (const material of materials) {
  db.run(`
    INSERT OR REPLACE INTO materials
    (id, code, name, category, specification, unit, quantity, minStock, maxStock, price, supplier, location, barcode, batchNo, productionDate, expiryDate, lastUpdateTime, dataStatus)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    material.id,
    material.code,
    material.name,
    material.category,
    material.specification,
    material.unit,
    material.quantity,
    material.minStock,
    material.maxStock,
    material.price,
    material.supplier,
    material.location,
    material.barcode,
    material.batchNo,
    material.productionDate,
    material.expiryDate,
    material.lastUpdateTime,
    material.dataStatus
  ]);
}
console.log(`   成功导入 ${materials.length} 条物料数据`);

// 导入入库记录数据
console.log('\n2. 导入入库记录数据...');
for (const record of inboundRecords) {
  db.run(`
    INSERT OR REPLACE INTO inbound_records
    (id, code, inboundDate, supplier, operator, status, materials, voidedDate)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    record.id,
    record.code,
    record.inboundDate,
    record.supplier,
    record.operator,
    record.status,
    JSON.stringify(record.materials),
    record.voidedDate || null
  ]);
}
console.log(`   成功导入 ${inboundRecords.length} 条入库记录数据`);

  saveDatabase();
  console.log('\n✅ 仓库物料 Mock 数据导入完成！');
}

main().catch(console.error);
