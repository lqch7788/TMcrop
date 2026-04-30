// 物料分类辅助函数
export const getCategoryByCode = (code: string): string => {
  const prefix = code.substring(0, 2);
  const categoryMap: Record<string, string> = {
    'SP': '种质资源',
    'EQ': '农业机械',
    'OP': '劳保与防护用品',
    'PH': '采收容器',
    'IT': '监测设备'
  };
  // SP开头需要进一步判断
  if (prefix === 'SP') {
    const subPrefix = code.substring(2, 4);
    if (subPrefix === '02') return '肥料与土壤改良剂';
    if (subPrefix === '03') return '农药与植保产品';
    if (subPrefix === '01') return '种质资源';
  }
  return categoryMap[prefix] || '其他';
};

// 领料单数据
import type { MaterialReceivingRecord } from '../types/materialReceiving';

export const materialReceivingDetails: MaterialReceivingRecord[] = [
  { id: 1, code: 'LL20260301001', date: '2026-03-01', applicant: '张伟民', department: '生产部', warehouseLocation: '仓库A区', plantArea: '1号棚-叶菜区', reviewer: '王志刚', productionBatchCode: 'FQ2024-001', status: '已审批', statusClass: 'approved', materials: [
    { materialCode: 'SP0201001', materialName: '商品有机肥', spec: '50kg/袋', unit: '袋', category: '肥料与土壤改良剂', requestedQuantity: 10, stockQuantity: 150, unitPrice: 45.00, warehousePosition: 'A-01-01', remark: '正常出库' },
    { materialCode: 'SP0202001', materialName: '尿素', spec: '50kg/袋', unit: '袋', category: '肥料与土壤改良剂', requestedQuantity: 5, stockQuantity: 80, unitPrice: 85.00, warehousePosition: 'A-01-02', remark: '正常出库' },
  ]},
  { id: 2, code: 'LL20260302002', date: '2026-03-02', applicant: '李明轩', department: '生产部', warehouseLocation: '仓库B区', plantArea: '2号棚-茄果区', reviewer: '李志刚', productionBatchCode: 'FQ2024-002', status: '已审批', statusClass: 'approved', materials: [
    { materialCode: 'SP0301001', materialName: '吡虫啉', spec: '100g/瓶', unit: '瓶', category: '农药与植保产品', requestedQuantity: 8, stockQuantity: 120, unitPrice: 28.00, warehousePosition: 'B-02-03', remark: '正常出库' },
  ]},
  { id: 3, code: 'LL20260303003', date: '2026-03-03', applicant: '王建国', department: '生产部', warehouseLocation: '仓库C区', plantArea: '3号棚-育苗区', reviewer: '张志远', productionBatchCode: 'FQ2024-003', status: '待审批', statusClass: 'pending', materials: [
    { materialCode: 'SP0302001', materialName: '多菌灵', spec: '200g/袋', unit: '袋', category: '农药与植保产品', requestedQuantity: 15, stockQuantity: 45, unitPrice: 35.00, warehousePosition: 'C-03-01', remark: '待审批' },
    { materialCode: 'SP0301001', materialName: '吡虫啉', spec: '100g/瓶', unit: '瓶', category: '农药与植保产品', requestedQuantity: 10, stockQuantity: 120, unitPrice: 28.00, warehousePosition: 'C-03-02', remark: '待审批' },
  ]},
  { id: 4, code: 'LL20260304004', date: '2026-03-04', applicant: '赵俊杰', department: '生产部', warehouseLocation: '仓库A区', plantArea: '1号棚-叶菜区', reviewer: '王志刚', productionBatchCode: 'FQ2024-004', status: '已审批', statusClass: 'approved', materials: [
    { materialCode: 'SP0103001', materialName: '番茄种子', spec: '50g/袋', unit: '袋', category: '种质资源', requestedQuantity: 12, stockQuantity: 60, unitPrice: 120.00, warehousePosition: 'A-02-01', remark: '正常出库' },
  ]},
  { id: 5, code: 'LL20260305005', date: '2026-03-05', applicant: '钱文涛', department: '后勤部', warehouseLocation: '仓库D区', plantArea: '办公区绿化', reviewer: '陈志明', productionBatchCode: 'FQ2024-005', status: '已拒绝', statusClass: 'rejected', rejectReason: '库存不足，该物料当前库存为0，无法满足申请数量', materials: []},
  { id: 6, code: 'LL20260306006', date: '2026-03-06', applicant: '孙晓峰', department: '生产部', warehouseLocation: '仓库B区', plantArea: '4号棚-水稻区', reviewer: '李志刚', productionBatchCode: 'FQ2024-006', status: '待审批', statusClass: 'pending', materials: [
    { materialCode: 'SP0202001', materialName: '尿素', spec: '50kg/袋', unit: '袋', category: '肥料与土壤改良剂', requestedQuantity: 20, stockQuantity: 80, unitPrice: 85.00, warehousePosition: 'B-01-02', remark: '库存充足' },
  ]},
  { id: 7, code: 'LL20260307007', date: '2026-03-07', applicant: '周志强', department: '生产部', warehouseLocation: '仓库C区', plantArea: '5号棚-水果区', reviewer: '张志远', productionBatchCode: 'FQ2024-007', status: '已审批', statusClass: 'approved', materials: [
    { materialCode: 'OP0201001', materialName: '锄头', spec: '标准型', unit: '把', category: '劳保与防护用品', requestedQuantity: 5, stockQuantity: 35, unitPrice: 42.00, warehousePosition: 'C-04-01', remark: '正常出库' },
    { materialCode: 'OP0102001', materialName: '劳保胶靴', spec: '标准码', unit: '双', category: '劳保与防护用品', requestedQuantity: 10, stockQuantity: 50, unitPrice: 68.00, warehousePosition: 'C-04-02', remark: '正常出库' },
  ]},
  { id: 8, code: 'LL20260308008', date: '2026-03-08', applicant: '吴海龙', department: '设备部', warehouseLocation: '仓库A区', plantArea: '灌溉系统维护', reviewer: '王志刚', productionBatchCode: 'FQ2024-008', status: '已审批', statusClass: 'approved', materials: [
    { materialCode: 'EQ0103001', materialName: '电动喷雾机', spec: '标准型', unit: '台', category: '农业机械', requestedQuantity: 2, stockQuantity: 15, unitPrice: 580.00, warehousePosition: 'A-05-01', remark: '正常出库' },
  ]},
  { id: 9, code: 'LL20260309009', date: '2026-03-09', applicant: '郑志远', department: '技术部', warehouseLocation: '仓库E区', plantArea: '实验室', reviewer: '赵志鹏', productionBatchCode: 'FQ2024-001', status: '已取消', statusClass: 'cancelled', materials: []},
  { id: 10, code: 'LL20260310010', date: '2026-03-10', applicant: '陈思远', department: '生产部', warehouseLocation: '仓库B区', plantArea: '2号棚-茄果区', reviewer: '李志刚', productionBatchCode: 'FQ2024-002', status: '已审批', statusClass: 'approved', materials: [
    { materialCode: 'SP0101001', materialName: '水稻种子', spec: '20kg/袋', unit: '袋', category: '种质资源', requestedQuantity: 30, stockQuantity: 100, unitPrice: 65.00, warehousePosition: 'B-02-01', remark: '正常出库' },
  ]},
  { id: 11, code: 'LL20260311011', date: '2026-03-11', applicant: '刘志伟', department: '生产部', warehouseLocation: '仓库C区', plantArea: '6号棚-花卉区', reviewer: '张志远', productionBatchCode: 'FQ2024-003', status: '待审批', statusClass: 'pending', materials: [
    { materialCode: 'EQ0306001', materialName: '滴灌带', spec: '50m/卷', unit: '卷', category: '农业机械', requestedQuantity: 20, stockQuantity: 200, unitPrice: 38.00, warehousePosition: 'C-05-01', remark: '待审批' },
  ]},
  { id: 12, code: 'LL20260312012', date: '2026-03-12', applicant: '杨文博', department: '采后处理部', warehouseLocation: '仓库A区', plantArea: '采后处理车间', reviewer: '王志刚', productionBatchCode: 'FQ2024-004', status: '已审批', statusClass: 'approved', materials: [
    { materialCode: 'PH0104001', materialName: '塑料袋', spec: '标准型', unit: '卷', category: '采收容器', requestedQuantity: 50, stockQuantity: 500, unitPrice: 8.50, warehousePosition: 'A-03-01', remark: '正常出库' },
    { materialCode: 'IT0101001', materialName: '土壤温湿度传感器', spec: '标准型', unit: '个', category: '监测设备', requestedQuantity: 5, stockQuantity: 30, unitPrice: 260.00, warehousePosition: 'A-04-01', remark: '正常出库' },
  ]},
];

// ============================================
// 物料基础数据库（用于自动填充）
// ============================================
export interface MaterialBase {
  materialCode: string;
  materialName: string;
  spec: string;
  unit: string;
  category: string;
  stockQuantity: number;
  unitPrice: number;
  warehousePosition: string;
  remark: string;
}

// 物料数据库 - 包含所有物料的基础信息
export const materialBaseDatabase: MaterialBase[] = [
  { materialCode: 'SP0201001', materialName: '商品有机肥', spec: '50kg/袋', unit: '袋', category: '肥料与土壤改良剂', stockQuantity: 150, unitPrice: 45.00, warehousePosition: 'A-01-01', remark: '正常出库' },
  { materialCode: 'SP0202001', materialName: '尿素', spec: '50kg/袋', unit: '袋', category: '肥料与土壤改良剂', stockQuantity: 80, unitPrice: 85.00, warehousePosition: 'A-01-02', remark: '库存充足' },
  { materialCode: 'SP0301001', materialName: '吡虫啉', spec: '100g/瓶', unit: '瓶', category: '农药与植保产品', stockQuantity: 120, unitPrice: 28.00, warehousePosition: 'B-02-03', remark: '正常出库' },
  { materialCode: 'SP0302001', materialName: '多菌灵', spec: '200g/袋', unit: '袋', category: '农药与植保产品', stockQuantity: 45, unitPrice: 35.00, warehousePosition: 'C-03-01', remark: '待审批' },
  { materialCode: 'SP0103001', materialName: '番茄种子', spec: '50g/袋', unit: '袋', category: '种质资源', stockQuantity: 60, unitPrice: 120.00, warehousePosition: 'A-02-01', remark: '正常出库' },
  { materialCode: 'SP0101001', materialName: '水稻种子', spec: '20kg/袋', unit: '袋', category: '种质资源', stockQuantity: 100, unitPrice: 65.00, warehousePosition: 'B-02-01', remark: '正常出库' },
  { materialCode: 'OP0201001', materialName: '锄头', spec: '标准型', unit: '把', category: '劳保与防护用品', stockQuantity: 35, unitPrice: 42.00, warehousePosition: 'C-04-01', remark: '正常出库' },
  { materialCode: 'OP0102001', materialName: '劳保胶靴', spec: '标准码', unit: '双', category: '劳保与防护用品', stockQuantity: 50, unitPrice: 68.00, warehousePosition: 'C-04-02', remark: '正常出库' },
  { materialCode: 'EQ0103001', materialName: '电动喷雾机', spec: '标准型', unit: '台', category: '农业机械', stockQuantity: 15, unitPrice: 580.00, warehousePosition: 'A-05-01', remark: '正常出库' },
  { materialCode: 'EQ0306001', materialName: '滴灌带', spec: '50m/卷', unit: '卷', category: '农业机械', stockQuantity: 200, unitPrice: 38.00, warehousePosition: 'C-05-01', remark: '待审批' },
  { materialCode: 'PH0104001', materialName: '塑料袋', spec: '标准型', unit: '卷', category: '采收容器', stockQuantity: 500, unitPrice: 8.50, warehousePosition: 'A-03-01', remark: '正常出库' },
  { materialCode: 'IT0101001', materialName: '土壤温湿度传感器', spec: '标准型', unit: '个', category: '监测设备', stockQuantity: 30, unitPrice: 260.00, warehousePosition: 'A-04-01', remark: '正常出库' },
];

// 根据物料编码查找物料信息
export const findMaterialByCode = (code: string): MaterialBase | undefined => {
  return materialBaseDatabase.find(m => m.materialCode === code);
};

// 根据物料名称查找物料信息
export const findMaterialByName = (name: string): MaterialBase | undefined => {
  return materialBaseDatabase.find(m => m.materialName === name);
};

// ============================================
// 领料统计 Mock 数据
// ============================================

// 月度统计数据
import type { MonthlyStatistics } from '../types/materialReceiving';

export const monthlyStatisticsData: MonthlyStatistics[] = [
  { year: '2025', month: '01', department: '生产部', requisitionCount: 15, materialTypes: 8, totalQuantity: 1200, actualQuantity: 1180, differenceRate: -1.7, totalAmount: 25680 },
  { year: '2025', month: '02', department: '生产部', requisitionCount: 18, materialTypes: 10, totalQuantity: 1450, actualQuantity: 1420, differenceRate: -2.1, totalAmount: 31560 },
  { year: '2025', month: '03', department: '生产部', requisitionCount: 22, materialTypes: 12, totalQuantity: 1680, actualQuantity: 1650, differenceRate: -1.8, totalAmount: 38250 },
  { year: '2025', month: '01', department: '技术部', requisitionCount: 8, materialTypes: 5, totalQuantity: 450, actualQuantity: 445, differenceRate: -1.1, totalAmount: 12800 },
  { year: '2025', month: '02', department: '技术部', requisitionCount: 10, materialTypes: 6, totalQuantity: 520, actualQuantity: 510, differenceRate: -1.9, totalAmount: 14200 },
  { year: '2025', month: '03', department: '技术部', requisitionCount: 12, materialTypes: 7, totalQuantity: 680, actualQuantity: 670, differenceRate: -1.5, totalAmount: 18650 },
  { year: '2025', month: '01', department: '设备部', requisitionCount: 5, materialTypes: 4, totalQuantity: 280, actualQuantity: 275, differenceRate: -1.8, totalAmount: 8960 },
  { year: '2025', month: '02', department: '设备部', requisitionCount: 6, materialTypes: 5, totalQuantity: 320, actualQuantity: 315, differenceRate: -1.6, totalAmount: 10240 },
  { year: '2025', month: '03', department: '设备部', requisitionCount: 7, materialTypes: 5, totalQuantity: 380, actualQuantity: 370, differenceRate: -2.6, totalAmount: 12180 },
  { year: '2025', month: '01', department: '后勤部', requisitionCount: 4, materialTypes: 3, totalQuantity: 180, actualQuantity: 178, differenceRate: -1.1, totalAmount: 5640 },
  { year: '2025', month: '02', department: '后勤部', requisitionCount: 5, materialTypes: 4, totalQuantity: 220, actualQuantity: 215, differenceRate: -2.3, totalAmount: 6920 },
  { year: '2025', month: '03', department: '后勤部', requisitionCount: 6, materialTypes: 4, totalQuantity: 260, actualQuantity: 255, differenceRate: -1.9, totalAmount: 8120 },
];

// 物料统计数据
import type { MaterialStatistics } from '../types/materialReceiving';

export const materialStatisticsData: MaterialStatistics[] = [
  { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', barcode: '6932456780001', unit: '袋', supplier: '有机肥供应商A', batchCode: 'YC20260301', productionDate: '2026-03-01', expiryDate: '2028-03-01', productionPlanBatchCode: 'FQ2026-001', requisitionDepartment: '生产部', usageArea: '玻璃温室A区', requisitioner: '张伟民', requisitionTime: '2026-04-01', requisitionCount: 35, totalQuantity: 580, actualQuantity: 565, totalAmount: 25425, mainWarehouse: '仓库A区' },
  { materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂', spec: '50kg/袋', barcode: '6932456780002', unit: '袋', supplier: '化肥供应商B', batchCode: 'HF20260315', productionDate: '2026-03-15', expiryDate: '2027-03-15', productionPlanBatchCode: 'FQ2026-002', requisitionDepartment: '生产部', usageArea: '日光温室1号', requisitioner: '李明轩', requisitionTime: '2026-04-02', requisitionCount: 28, totalQuantity: 420, actualQuantity: 410, totalAmount: 34850, mainWarehouse: '仓库A区' },
  { materialCode: 'SP0301001', materialName: '吡虫啉', category: '农药与植保产品', spec: '100g/瓶', barcode: '6932456780003', unit: '瓶', supplier: '农药供应商C', batchCode: 'NY20260220', productionDate: '2026-02-20', expiryDate: '2028-02-20', productionPlanBatchCode: 'FQ2026-003', requisitionDepartment: '生产部', usageArea: '塑料大棚1号', requisitioner: '王建国', requisitionTime: '2026-03-28', requisitionCount: 42, totalQuantity: 380, actualQuantity: 370, totalAmount: 10660, mainWarehouse: '仓库B区' },
  { materialCode: 'SP0302001', materialName: '多菌灵', category: '农药与植保产品', spec: '200g/袋', barcode: '6932456780004', unit: '袋', supplier: '农药供应商C', batchCode: 'NY20260110', productionDate: '2026-01-10', expiryDate: '2027-01-10', productionPlanBatchCode: 'FQ2026-004', requisitionDepartment: '技术部', usageArea: '露天种植区', requisitioner: '赵俊杰', requisitionTime: '2026-03-25', requisitionCount: 30, totalQuantity: 280, actualQuantity: 275, totalAmount: 9625, mainWarehouse: '仓库B区' },
  { materialCode: 'SP0101001', materialName: '水稻种子', category: '种质资源', spec: '20kg/袋', barcode: '6932456780005', unit: '袋', supplier: '种子供应商D', batchCode: 'ZZ20260201', productionDate: '2026-02-01', expiryDate: '2027-02-01', productionPlanBatchCode: 'FQ2026-005', requisitionDepartment: '生产部', usageArea: '大田A区', requisitioner: '郑志远', requisitionTime: '2026-02-20', requisitionCount: 15, totalQuantity: 180, actualQuantity: 175, totalAmount: 11375, mainWarehouse: '仓库B区' },
  { materialCode: 'SP0103001', materialName: '番茄种子', category: '种质资源', spec: '50g/袋', barcode: '6932456780006', unit: '袋', supplier: '种子供应商D', batchCode: 'ZZ20260115', productionDate: '2026-01-15', expiryDate: '2026-07-15', productionPlanBatchCode: 'FQ2026-006', requisitionDepartment: '生产部', usageArea: '玻璃温室B区', requisitioner: '陈思远', requisitionTime: '2026-04-01', requisitionCount: 20, totalQuantity: 160, actualQuantity: 155, totalAmount: 18600, mainWarehouse: '仓库B区' },
  { materialCode: 'OP0201001', materialName: '锄头', category: '劳保与防护用品', spec: '标准型', barcode: '6932456780007', unit: '把', supplier: '劳保用品供应商E', batchCode: 'LB20260228', productionDate: '2026-02-28', expiryDate: '2029-02-28', productionPlanBatchCode: 'FQ2026-007', requisitionDepartment: '生产部', usageArea: '全园区', requisitioner: '吴海龙', requisitionTime: '2026-03-30', requisitionCount: 25, totalQuantity: 120, actualQuantity: 118, totalAmount: 4956, mainWarehouse: '仓库C区' },
  { materialCode: 'OP0102001', materialName: '劳保胶靴', category: '劳保与防护用品', spec: '标准码', barcode: '6932456780008', unit: '双', supplier: '劳保用品供应商E', batchCode: 'LB20260305', productionDate: '2026-03-05', expiryDate: '2028-03-05', productionPlanBatchCode: 'FQ2026-008', requisitionDepartment: '生产部', usageArea: '日光温室2号', requisitioner: '孙晓峰', requisitionTime: '2026-04-02', requisitionCount: 30, totalQuantity: 150, actualQuantity: 148, totalAmount: 10064, mainWarehouse: '仓库C区' },
  { materialCode: 'EQ0103001', materialName: '电动喷雾机', category: '农业机械', spec: '标准型', barcode: '6932456780009', unit: '台', supplier: '农机供应商F', batchCode: 'NJ20260120', productionDate: '2026-01-20', expiryDate: '2031-01-20', productionPlanBatchCode: 'FQ2026-009', requisitionDepartment: '设备部', usageArea: '设备维修间', requisitioner: '周志刚', requisitionTime: '2026-03-15', requisitionCount: 8, totalQuantity: 15, actualQuantity: 15, totalAmount: 8700, mainWarehouse: '仓库A区' },
  { materialCode: 'EQ0306001', materialName: '滴灌带', category: '农业机械', spec: '50m/卷', barcode: '6932456780010', unit: '卷', supplier: '农机供应商F', batchCode: 'NJ20260210', productionDate: '2026-02-10', expiryDate: '2029-02-10', productionPlanBatchCode: 'FQ2026-010', requisitionDepartment: '生产部', usageArea: '滴灌系统', requisitioner: '吴海龙', requisitionTime: '2026-04-01', requisitionCount: 18, totalQuantity: 200, actualQuantity: 195, totalAmount: 7410, mainWarehouse: '仓库C区' },
  { materialCode: 'PH0104001', materialName: '塑料袋', category: '采收容器', spec: '标准型', barcode: '6932456780011', unit: '卷', supplier: '包装材料供应商G', batchCode: 'BZ20260320', productionDate: '2026-03-20', expiryDate: '2028-03-20', productionPlanBatchCode: 'FQ2026-011', requisitionDepartment: '采后处理部', usageArea: '采后处理车间', requisitioner: '郑志明', requisitionTime: '2026-04-02', requisitionCount: 40, totalQuantity: 600, actualQuantity: 590, totalAmount: 5015, mainWarehouse: '仓库A区' },
  { materialCode: 'IT0101001', materialName: '土壤温湿度传感器', category: '监测设备', spec: '标准型', barcode: '6932456780012', unit: '个', supplier: '监测设备供应商H', batchCode: 'JC20260105', productionDate: '2026-01-05', expiryDate: '2031-01-05', productionPlanBatchCode: 'FQ2026-012', requisitionDepartment: '技术部', usageArea: '监测室', requisitioner: '陈思远', requisitionTime: '2026-03-28', requisitionCount: 12, totalQuantity: 45, actualQuantity: 42, totalAmount: 11760, mainWarehouse: '仓库A区' },
];

// 部门统计数据
import type { DepartmentStatistics } from '../types/materialReceiving';

export const departmentStatisticsData: DepartmentStatistics[] = [
  { applicant: '张伟民', department: '生产部', requisitionCount: 18, requisitionOrders: 12, materialTypes: 15, totalQuantity: 680, totalAmount: 18650, avgPerOrder: 38, avgAmount: 1036, topMaterials: ['商品有机肥', '尿素', '吡虫啉'] },
  { applicant: '李明轩', department: '生产部', requisitionCount: 15, requisitionOrders: 10, materialTypes: 12, totalQuantity: 520, totalAmount: 14280, avgPerOrder: 35, avgAmount: 952, topMaterials: ['商品有机肥', '番茄种子', '滴灌带'] },
  { applicant: '王建国', department: '生产部', requisitionCount: 20, requisitionOrders: 14, materialTypes: 18, totalQuantity: 750, totalAmount: 20580, avgPerOrder: 38, avgAmount: 1029, topMaterials: ['尿素', '多菌灵', '锄头'] },
  { applicant: '赵俊杰', department: '生产部', requisitionCount: 16, requisitionOrders: 11, materialTypes: 14, totalQuantity: 580, totalAmount: 15860, avgPerOrder: 36, avgAmount: 990, topMaterials: ['商品有机肥', '水稻种子', '劳保胶靴'] },
  { applicant: '郑志远', department: '技术部', requisitionCount: 12, requisitionOrders: 8, materialTypes: 10, totalQuantity: 280, totalAmount: 7680, avgPerOrder: 23, avgAmount: 640, topMaterials: ['多菌灵', '土壤温湿度传感器', '吡虫啉'] },
  { applicant: '陈思远', department: '技术部', requisitionCount: 10, requisitionOrders: 7, materialTypes: 8, totalQuantity: 220, totalAmount: 6040, avgPerOrder: 22, avgAmount: 604, topMaterials: ['土壤温湿度传感器', '滴灌带', '多菌灵'] },
  { applicant: '吴海龙', department: '设备部', requisitionCount: 8, requisitionOrders: 6, materialTypes: 7, totalQuantity: 180, totalAmount: 12480, avgPerOrder: 23, avgAmount: 1560, topMaterials: ['电动喷雾机', '滴灌带', '锄头'] },
  { applicant: '孙晓峰', department: '生产部', requisitionCount: 14, requisitionOrders: 9, materialTypes: 12, totalQuantity: 480, totalAmount: 13160, avgPerOrder: 34, avgAmount: 940, topMaterials: ['商品有机肥', '尿素', '塑料袋'] },
];

// 大棚统计数据
import type { GreenhouseStatistics } from '../types/materialReceiving';

export const greenhouseStatisticsData: GreenhouseStatistics[] = [
  { greenhouse: '玻璃温室A区', greenhouseType: '玻璃温室', period: '2025-03', requisitionCount: 8, materialTypes: 6, totalQuantity: 520, totalAmount: 14260, comparison: { lastMonth: { quantity: 480, amount: 12850, changeRate: 8.3 } } },
  { greenhouse: '玻璃温室B区', greenhouseType: '玻璃温室', period: '2025-03', requisitionCount: 6, materialTypes: 5, totalQuantity: 380, totalAmount: 9840, comparison: { lastMonth: { quantity: 350, amount: 8920, changeRate: 8.6 } } },
  { greenhouse: '玻璃温室C区', greenhouseType: '玻璃温室', period: '2025-03', requisitionCount: 5, materialTypes: 4, totalQuantity: 280, totalAmount: 7260, comparison: { lastMonth: { quantity: 260, amount: 6580, changeRate: 7.7 } } },
  { greenhouse: '日光温室1号', greenhouseType: '日光温室', period: '2025-03', requisitionCount: 4, materialTypes: 4, totalQuantity: 180, totalAmount: 4860, comparison: { lastMonth: { quantity: 160, amount: 4280, changeRate: 12.5 } } },
  { greenhouse: '日光温室2号', greenhouseType: '日光温室', period: '2025-03', requisitionCount: 4, materialTypes: 3, totalQuantity: 160, totalAmount: 4320, comparison: { lastMonth: { quantity: 150, amount: 3980, changeRate: 6.7 } } },
  { greenhouse: '日光温室3号', greenhouseType: '日光温室', period: '2025-03', requisitionCount: 3, materialTypes: 3, totalQuantity: 120, totalAmount: 3240, comparison: { lastMonth: { quantity: 110, amount: 2920, changeRate: 9.1 } } },
  { greenhouse: '日光温室4号', greenhouseType: '日光温室', period: '2025-03', requisitionCount: 4, materialTypes: 4, totalQuantity: 150, totalAmount: 4080, comparison: { lastMonth: { quantity: 140, amount: 3720, changeRate: 7.1 } } },
  { greenhouse: '塑料大棚1号', greenhouseType: '塑料大棚', period: '2025-03', requisitionCount: 5, materialTypes: 4, totalQuantity: 220, totalAmount: 5980, comparison: { lastMonth: { quantity: 200, amount: 5360, changeRate: 10.0 } } },
  { greenhouse: '塑料大棚2号', greenhouseType: '塑料大棚', period: '2025-03', requisitionCount: 4, materialTypes: 3, totalQuantity: 180, totalAmount: 4860, comparison: { lastMonth: { quantity: 165, amount: 4380, changeRate: 9.1 } } },
  { greenhouse: '露天种植区', greenhouseType: '露天', period: '2025-03', requisitionCount: 3, materialTypes: 3, totalQuantity: 140, totalAmount: 3780, comparison: { lastMonth: { quantity: 130, amount: 3440, changeRate: 7.7 } } },
];

// 大田统计数据
import type { FieldStatistics } from '../types/materialReceiving';

export const fieldStatisticsData: FieldStatistics[] = [
  { field: 'A1地块', crop: '水稻', period: '2025-03', requisitionCount: 5, materialTypes: 6, totalQuantity: 380, totalAmount: 10360, comparison: { lastMonth: { quantity: 350, amount: 9360, changeRate: 8.6 } } },
  { field: 'A2地块', crop: '水稻', period: '2025-03', requisitionCount: 5, materialTypes: 5, totalQuantity: 360, totalAmount: 9820, comparison: { lastMonth: { quantity: 330, amount: 8820, changeRate: 9.1 } } },
  { field: 'A3地块', crop: '水稻', period: '2025-03', requisitionCount: 4, materialTypes: 5, totalQuantity: 320, totalAmount: 8720, comparison: { lastMonth: { quantity: 290, amount: 7760, changeRate: 10.3 } } },
  { field: 'B1地块', crop: '小麦', period: '2025-03', requisitionCount: 4, materialTypes: 4, totalQuantity: 280, totalAmount: 7640, comparison: { lastMonth: { quantity: 260, amount: 6980, changeRate: 7.7 } } },
  { field: 'B2地块', crop: '小麦', period: '2025-03', requisitionCount: 4, materialTypes: 4, totalQuantity: 260, totalAmount: 7080, comparison: { lastMonth: { quantity: 240, amount: 6420, changeRate: 8.3 } } },
  { field: 'C1地块', crop: '油菜', period: '2025-03', requisitionCount: 3, materialTypes: 3, totalQuantity: 180, totalAmount: 4920, comparison: { lastMonth: { quantity: 165, amount: 4420, changeRate: 9.1 } } },
  { field: 'C2地块', crop: '油菜', period: '2025-03', requisitionCount: 3, materialTypes: 3, totalQuantity: 160, totalAmount: 4360, comparison: { lastMonth: { quantity: 145, amount: 3880, changeRate: 10.3 } } },
  { field: 'D1地块', crop: '蔬菜', period: '2025-03', requisitionCount: 4, materialTypes: 5, totalQuantity: 240, totalAmount: 6540, comparison: { lastMonth: { quantity: 220, amount: 5860, changeRate: 9.1 } } },
];

// 种植批次统计数据
import type { BatchStatistics } from '../types/materialReceiving';

export const batchStatisticsData: BatchStatistics[] = [
  {
    batchCode: 'FQ2024-001', cropName: '番茄', variety: '红果番茄', plantArea: '玻璃温室A区', areaSize: '3000 m²',
    plannedStartDate: '2026-03-01', plannedEndDate: '2026-09-30', requisitionCount: 12, materialTypes: 8,
    totalQuantity: 680, actualQuantity: 665, totalAmount: 18560,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 150, actualQuantity: 148, totalAmount: 6660, mainWarehouse: '仓库A区', mainApplicant: '张伟民' },
      { materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 80, actualQuantity: 78, totalAmount: 6630, mainWarehouse: '仓库A区', mainApplicant: '王建国' },
      { materialCode: 'SP0301001', materialName: '吡虫啉', category: '农药与植保产品', spec: '100g/瓶', unit: '瓶', totalQuantity: 60, actualQuantity: 58, totalAmount: 1624, mainWarehouse: '仓库B区', mainApplicant: '李明轩' },
      { materialCode: 'SP0302001', materialName: '多菌灵', category: '农药与植保产品', spec: '200g/袋', unit: '袋', totalQuantity: 45, actualQuantity: 44, totalAmount: 1540, mainWarehouse: '仓库B区', mainApplicant: '赵俊杰' },
    ]
  },
  {
    batchCode: 'FQ2024-002', cropName: '黄瓜', variety: '水果黄瓜', plantArea: '玻璃温室B区', areaSize: '2500 m²',
    plannedStartDate: '2026-03-01', plannedEndDate: '2026-08-31', requisitionCount: 10, materialTypes: 6,
    totalQuantity: 520, actualQuantity: 510, totalAmount: 14240,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 120, actualQuantity: 118, totalAmount: 5310, mainWarehouse: '仓库A区', mainApplicant: '张伟民' },
      { materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 70, actualQuantity: 68, totalAmount: 5780, mainWarehouse: '仓库A区', mainApplicant: '王建国' },
      { materialCode: 'EQ0306001', materialName: '滴灌带', category: '农业机械', spec: '50m/卷', unit: '卷', totalQuantity: 50, actualQuantity: 50, totalAmount: 1900, mainWarehouse: '仓库C区', mainApplicant: '孙晓峰' },
    ]
  },
  {
    batchCode: 'FQ2024-003', cropName: '草莓', variety: '红颜', plantArea: '日光温室1号', areaSize: '600 m²',
    plannedStartDate: '2026-01-01', plannedEndDate: '2026-05-31', requisitionCount: 8, materialTypes: 5,
    totalQuantity: 280, actualQuantity: 275, totalAmount: 7680,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 60, actualQuantity: 60, totalAmount: 2700, mainWarehouse: '仓库A区', mainApplicant: '张伟民' },
      { materialCode: 'OP0102001', materialName: '劳保胶靴', category: '劳保与防护用品', spec: '标准码', unit: '双', totalQuantity: 20, actualQuantity: 20, totalAmount: 1360, mainWarehouse: '仓库C区', mainApplicant: '赵俊杰' },
    ]
  },
  {
    batchCode: 'FQ2024-004', cropName: '生菜', variety: '散叶生菜', plantArea: '日光温室2号', areaSize: '500 m²',
    plannedStartDate: '2026-02-01', plannedEndDate: '2026-06-30', requisitionCount: 6, materialTypes: 4,
    totalQuantity: 180, actualQuantity: 178, totalAmount: 4920,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 40, actualQuantity: 40, totalAmount: 1800, mainWarehouse: '仓库A区', mainApplicant: '李明轩' },
    ]
  },
  {
    batchCode: 'FQ2024-005', cropName: '辣椒', variety: '青椒', plantArea: '玻璃温室C区', areaSize: '2000 m²',
    plannedStartDate: '2026-03-01', plannedEndDate: '2026-08-31', requisitionCount: 9, materialTypes: 7,
    totalQuantity: 420, actualQuantity: 412, totalAmount: 11480,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 100, actualQuantity: 98, totalAmount: 4410, mainWarehouse: '仓库A区', mainApplicant: '张伟民' },
    ]
  },
  {
    batchCode: 'FQ2024-006', cropName: '菠菜', variety: '圆叶菠菜', plantArea: '塑料大棚1号', areaSize: '800 m²',
    plannedStartDate: '2026-01-15', plannedEndDate: '2026-04-30', requisitionCount: 5, materialTypes: 4,
    totalQuantity: 160, actualQuantity: 158, totalAmount: 4360,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 35, actualQuantity: 35, totalAmount: 1575, mainWarehouse: '仓库A区', mainApplicant: '孙晓峰' },
    ]
  },
  {
    batchCode: 'FQ2024-007', cropName: '西瓜', variety: '小型西瓜', plantArea: '露天种植区', areaSize: '5000 m²',
    plannedStartDate: '2026-03-15', plannedEndDate: '2026-07-31', requisitionCount: 7, materialTypes: 5,
    totalQuantity: 320, actualQuantity: 315, totalAmount: 8740,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 80, actualQuantity: 78, totalAmount: 3510, mainWarehouse: '仓库A区', mainApplicant: '周志强' },
    ]
  },
  {
    batchCode: 'FQ2024-008', cropName: '茄子', variety: '紫茄', plantArea: '日光温室4号', areaSize: '600 m²',
    plannedStartDate: '2026-02-15', plannedEndDate: '2026-07-15', requisitionCount: 6, materialTypes: 5,
    totalQuantity: 220, actualQuantity: 215, totalAmount: 6020,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 50, actualQuantity: 50, totalAmount: 2250, mainWarehouse: '仓库A区', mainApplicant: '赵文静' },
    ]
  },
];

// ============================================
// 仪表盘图表数据（仅月度汇总使用）
// ============================================

// 物料分类7色渐变配色方案
export const CATEGORY_COLORS: Record<string, { gradient: string[]; solid: string }> = {
  生产投入: { gradient: ['#06B6D4', '#0891B2'], solid: '#06B6D4' },
  设施装备: { gradient: ['#8B5CF6', '#7C3AED'], solid: '#8B5CF6' },
  作业支持: { gradient: ['#F59E0B', '#D97706'], solid: '#F59E0B' },
  采后流通: { gradient: ['#F97316', '#EA580C'], solid: '#F97316' },
  数字管理: { gradient: ['#EC4899', '#DB2777'], solid: '#EC4899' },
  能源耗材: { gradient: ['#64748B', '#475569'], solid: '#64748B' },
  其他: { gradient: ['#9CA3AF', '#6B7280'], solid: '#9CA3AF' },
};

// 物料分类年度汇总数据
import type { CategorySummary } from '../types/materialReceiving';

export const categorySummaryData: CategorySummary[] = [
  { name: 'SP-生产投入类', key: '生产投入', value: 12580, amount: 38.5, percentage: 34.2, ...CATEGORY_COLORS.生产投入 },
  { name: 'EQ-设施与装备类', key: '设施装备', value: 6280, amount: 18.6, percentage: 20.8, ...CATEGORY_COLORS.设施装备 },
  { name: 'OP-作业支持类', key: '作业支持', value: 4180, amount: 12.8, percentage: 13.8, ...CATEGORY_COLORS.作业支持 },
  { name: 'PH-采后处理与流通类', key: '采后流通', value: 3180, amount: 9.8, percentage: 10.5, ...CATEGORY_COLORS.采后流通 },
  { name: 'IT-数字化与管理类', key: '数字管理', value: 1580, amount: 4.8, percentage: 5.2, ...CATEGORY_COLORS.数字管理 },
  { name: 'EC-能源与通用耗材', key: '能源耗材', value: 980, amount: 2.9, percentage: 3.2, ...CATEGORY_COLORS.能源耗材 },
  { name: 'OT-其他类', key: '其他', value: 680, amount: 2.1, percentage: 2.3, ...CATEGORY_COLORS.其他 },
];

// 月度用量趋势数据（12个月 x 7分类）
import type { CategoryTrend } from '../types/materialReceiving';

export const categoryTrendData: CategoryTrend[] = [
  { month: '2025-01', 生产投入: 820, 设施装备: 480, 作业支持: 320, 采后流通: 280, 数字管理: 120, 能源耗材: 50, 其他: 30, total: 2080 },
  { month: '2025-02', 生产投入: 950, 设施装备: 560, 作业支持: 380, 采后流通: 320, 数字管理: 140, 能源耗材: 60, 其他: 40, total: 2450 },
  { month: '2025-03', 生产投入: 1080, 设施装备: 620, 作业支持: 420, 采后流通: 360, 数字管理: 160, 能源耗材: 70, 其他: 45, total: 2755 },
  { month: '2025-04', 生产投入: 1200, 设施装备: 680, 作业支持: 480, 采后流通: 400, 数字管理: 180, 能源耗材: 80, 其他: 50, total: 3070 },
  { month: '2025-05', 生产投入: 1350, 设施装备: 750, 作业支持: 520, 采后流通: 450, 数字管理: 200, 能源耗材: 90, 其他: 55, total: 3415 },
  { month: '2025-06', 生产投入: 1480, 设施装备: 820, 作业支持: 580, 采后流通: 480, 数字管理: 220, 能源耗材: 100, 其他: 60, total: 3740 },
  { month: '2025-07', 生产投入: 1400, 设施装备: 780, 作业支持: 540, 采后流通: 460, 数字管理: 200, 能源耗材: 95, 其他: 58, total: 3533 },
  { month: '2025-08', 生产投入: 1280, 设施装备: 720, 作业支持: 500, 采后流通: 420, 数字管理: 180, 能源耗材: 85, 其他: 52, total: 3237 },
  { month: '2025-09', 生产投入: 1150, 设施装备: 650, 作业支持: 460, 采后流通: 380, 数字管理: 165, 能源耗材: 78, 其他: 48, total: 2931 },
  { month: '2025-10', 生产投入: 1020, 设施装备: 580, 作业支持: 400, 采后流通: 340, 数字管理: 150, 能源耗材: 70, 其他: 42, total: 2602 },
  { month: '2025-11', 生产投入: 920, 设施装备: 520, 作业支持: 360, 采后流通: 300, 数字管理: 135, 能源耗材: 62, 其他: 38, total: 2335 },
  { month: '2025-12', 生产投入: 850, 设施装备: 480, 作业支持: 320, 采后流通: 270, 数字管理: 120, 能源耗材: 55, 其他: 35, total: 2130 },
];

// 根据选中月份获取7分类柱状图数据
import type { MonthDetailRow } from '../types/materialReceiving';

export const getMonthCategoryData = (month: string) => {
  const monthData = categoryTrendData.find(d => d.month === month);
  if (!monthData) return [];

  return categorySummaryData.map(cat => {
    const value = (monthData as Record<string, number>)[cat.key] || 0;
    const amount = Math.round(value * 30);
    return {
      ...cat,
      value,
      amount,
      month: month.replace('2025-', '') + '月',
    };
  });
};

// 计算选中月份的汇总
export const getMonthSummary = (month: string) => {
  const data = getMonthCategoryData(month);
  const totalQuantity = data.reduce((sum, d) => sum + d.value, 0);
  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);
  return { totalQuantity, totalAmount };
};

// ============================================
// 月度汇总表格数据处理
// ============================================

import type { MonthSummaryRow as MonthSummaryRowType } from '../types/materialReceiving';

// 获取月份汇总数据（用于折叠表格）
export const getMonthSummaries = (year: string): MonthSummaryRowType[] => {
  return categoryTrendData
    .filter(d => d.month.startsWith(year))
    .map(data => {
      const totalQuantity = categorySummaryData.reduce((sum, cat) => sum + ((data as Record<string, number>)[cat.key] || 0), 0);
      const totalAmount = totalQuantity * 30;
      const yearTotal = getYearTotalQuantity(year);
      return {
        month: data.month,
        monthName: `${parseInt(data.month.split('-')[1])}月`,
        totalQuantity,
        totalAmount,
        percentage: yearTotal > 0 ? (totalQuantity / yearTotal) * 100 : 0,
      };
    });
};

// 获取月份明细数据（展开状态）
export const getMonthDetails = (month: string): MonthDetailRow[] => {
  const monthData = categoryTrendData.find(d => d.month === month);
  if (!monthData) return [];

  const totalQuantity = categorySummaryData.reduce((sum, cat) => sum + ((monthData as Record<string, number>)[cat.key] || 0), 0);

  return categorySummaryData.map(cat => {
    const quantity = (monthData as Record<string, number>)[cat.key] || 0;
    return {
      month: monthData.month,
      monthName: `${parseInt(monthData.month.split('-')[1])}月`,
      categoryKey: cat.key,
      categoryName: cat.name,
      quantity,
      amount: quantity * 30,
      percentage: totalQuantity > 0 ? (quantity / totalQuantity) * 100 : 0,
    };
  });
};

// 获取年度总数量
export const getYearTotalQuantity = (year: string): number => {
  return categoryTrendData
    .filter(d => d.month.startsWith(year))
    .reduce((sum, data) => {
      return sum + categorySummaryData.reduce((s, cat) => s + ((data as Record<string, number>)[cat.key] || 0), 0);
    }, 0);
};

// 获取年度总金额
export const getYearTotalAmount = (year: string): number => {
  return getYearTotalQuantity(year) * 30;
};

// 获取单月视图数据
export const getSingleMonthTableData = (year: string, month: string): MonthDetailRow[] => {
  return getMonthDetails(`${year}-${month}`);
};

// 获取单月汇总
export const getSingleMonthTotal = (year: string, month: string) => {
  const data = getSingleMonthTableData(year, month);
  const totalQty = data.reduce((sum, d) => sum + d.quantity, 0);
  const totalAmt = data.reduce((sum, d) => sum + d.amount, 0);
  return { totalQty, totalAmt };
};

// 图表数据 - 月度趋势
import type { TrendChartData } from '../types/materialReceiving';

export const trendChartData: TrendChartData[] = [
  { month: '2025-01', quantity: 2100, amount: 62000 },
  { month: '2025-02', quantity: 2350, amount: 68500 },
  { month: '2025-03', quantity: 2800, amount: 78000 },
  { month: '2025-04', quantity: 3200, amount: 89200 },
  { month: '2025-05', quantity: 3850, amount: 105800 },
  { month: '2025-06', quantity: 4200, amount: 118600 },
  { month: '2025-07', quantity: 3980, amount: 112200 },
  { month: '2025-08', quantity: 3650, amount: 99800 },
  { month: '2025-09', quantity: 3420, amount: 92600 },
  { month: '2025-10', quantity: 3180, amount: 85400 },
  { month: '2025-11', quantity: 2950, amount: 79200 },
  { month: '2025-12', quantity: 2680, amount: 72400 },
];

// 图表数据 - 部门占比
import type { DepartmentPieData } from '../types/materialReceiving';

export const departmentPieData: DepartmentPieData[] = [
  { name: '生产部', value: 58000, percentage: 62.8 },
  { name: '技术部', value: 16000, percentage: 17.3 },
  { name: '设备部', value: 12000, percentage: 13.0 },
  { name: '后勤部', value: 3600, percentage: 3.9 },
  { name: '采后处理部', value: 2600, percentage: 2.8 },
];

// 图表数据 - 物料分类占比
import type { CategoryPieData } from '../types/materialReceiving';

export const categoryPieData: CategoryPieData[] = [
  { name: '肥料与土壤改良剂', value: 32000, percentage: 34.6 },
  { name: '农药与植保产品', value: 18000, percentage: 19.5 },
  { name: '种质资源', value: 15000, percentage: 16.2 },
  { name: '农业机械', value: 12000, percentage: 13.0 },
  { name: '劳保与防护用品', value: 8000, percentage: 8.7 },
  { name: '监测设备', value: 5000, percentage: 5.4 },
  { name: '采收容器', value: 2200, percentage: 2.4 },
];

// 领料出库单数据
import type { MaterialExecuteRecord } from '../types/materialReceiving';

export const materialExecuteDetails: MaterialExecuteRecord[] = [
  { id: 1, code: 'CK20260301001', date: '2026-03-01', applicant: '张伟民', warehouseLocation: '仓库A区', reviewer: '王志刚', operator: '李操作员', productionBatchCode: 'FQ2024-001', sourceApplicationCodes: ['LL20260301001', 'LL20260302002'], executeStatus: '已出库', executeStatusClass: 'completed', materials: [
    { materialCode: 'SP0201001', materialName: '商品有机肥', spec: '50kg/袋', unit: '袋', category: '肥料与土壤改良剂', requestedQuantity: 10, stockQuantity: 100, actualQuantity: 10, remark: '正常出库', applicationCode: 'LL20260301001', unitPrice: 35.00, warehousePosition: '仓库A区-01-01' },
    { materialCode: 'SP0202001', materialName: '尿素', spec: '50kg/袋', unit: '袋', category: '肥料与土壤改良剂', requestedQuantity: 5, stockQuantity: 50, actualQuantity: 5, remark: '正常出库', applicationCode: 'LL20260301001', unitPrice: 85.00, warehousePosition: '仓库A区-01-02' },
    { materialCode: 'SP0301001', materialName: '吡虫啉', spec: '100g/瓶', unit: '瓶', category: '农药与植保产品', requestedQuantity: 8, stockQuantity: 200, actualQuantity: 8, remark: '正常出库', applicationCode: 'LL20260302002', unitPrice: 12.50, warehousePosition: '仓库A区-02-03' },
  ]},
  { id: 2, code: 'CK20260304002', date: '2026-03-04', applicant: '赵俊杰', warehouseLocation: '仓库A区', reviewer: '王志刚', operator: '张操作员', productionBatchCode: 'FQ2024-004', sourceApplicationCodes: ['LL20260304004'], executeStatus: '部分出库', executeStatusClass: 'partial', materials: [
    { materialCode: 'SP0103001', materialName: '番茄种子', spec: '50g/袋', unit: '袋', category: '种质资源', requestedQuantity: 12, stockQuantity: 8, actualQuantity: 8, remark: '库存不足，实际发放8袋', applicationCode: 'LL20260304004', unitPrice: 45.00, warehousePosition: '仓库B区-03-05' },
  ]},
  { id: 3, code: 'CK20260307003', date: '2026-03-07', applicant: '周志强', warehouseLocation: '仓库C区', reviewer: '张志远', operator: '王操作员', productionBatchCode: 'FQ2024-007', sourceApplicationCodes: ['LL20260307007'], executeStatus: '待出库', executeStatusClass: 'pending_out', materials: [
    { materialCode: 'OP0201001', materialName: '锄头', spec: '标准型', unit: '把', category: '劳保与防护用品', requestedQuantity: 5, stockQuantity: 50, actualQuantity: 0, remark: '待出库', applicationCode: 'LL20260307007', unitPrice: 28.00, warehousePosition: '仓库C区-04-02' },
    { materialCode: 'OP0102001', materialName: '劳保胶靴', spec: '标准码', unit: '双', category: '劳保与防护用品', requestedQuantity: 10, stockQuantity: 30, actualQuantity: 0, remark: '待出库', applicationCode: 'LL20260307007', unitPrice: 55.00, warehousePosition: '仓库C区-04-03' },
  ]},
  { id: 4, code: 'CK20260308004', date: '2026-03-08', applicant: '吴海龙', warehouseLocation: '仓库A区', reviewer: '王志刚', operator: '李操作员', productionBatchCode: 'FQ2024-008', sourceApplicationCodes: ['LL20260308008'], executeStatus: '待出库', executeStatusClass: 'pending_out', materials: [
    { materialCode: 'EQ0103001', materialName: '电动喷雾机', spec: '标准型', unit: '台', category: '农业机械', requestedQuantity: 2, stockQuantity: 10, actualQuantity: 0, remark: '待出库', applicationCode: 'LL20260308008', unitPrice: 680.00, warehousePosition: '仓库D区-05-01' },
  ]},
  { id: 5, code: 'CK20260310005', date: '2026-03-10', applicant: '陈思远', warehouseLocation: '仓库B区', reviewer: '李志刚', operator: '赵操作员', productionBatchCode: 'FQ2024-002', sourceApplicationCodes: ['LL20260310010'], executeStatus: '已出库', executeStatusClass: 'completed', materials: [
    { materialCode: 'SP0101001', materialName: '水稻种子', spec: '20kg/袋', unit: '袋', category: '种质资源', requestedQuantity: 30, stockQuantity: 200, actualQuantity: 30, remark: '正常出库', applicationCode: 'LL20260310010', unitPrice: 120.00, warehousePosition: '仓库B区-01-04' },
  ]},
  { id: 6, code: 'CK20260312006', date: '2026-03-12', applicant: '杨文博', warehouseLocation: '仓库A区', reviewer: '王志刚', operator: '张操作员', productionBatchCode: 'FQ2024-004', sourceApplicationCodes: ['LL20260312012'], executeStatus: '部分出库', executeStatusClass: 'partial', materials: [
    { materialCode: 'PH0104001', materialName: '塑料袋', spec: '标准型', unit: '卷', category: '采收容器', requestedQuantity: 50, stockQuantity: 50, actualQuantity: 50, remark: '正常出库', applicationCode: 'LL20260312012', unitPrice: 8.50, warehousePosition: '仓库A区-03-06' },
    { materialCode: 'IT0101001', materialName: '土壤温湿度传感器', spec: '标准型', unit: '个', category: '监测设备', requestedQuantity: 5, stockQuantity: 2, actualQuantity: 2, remark: '库存不足，实际发放2个', applicationCode: 'LL20260312012', unitPrice: 350.00, warehousePosition: '仓库D区-02-08' },
  ]},
  { id: 7, code: 'CK20260313007', date: '2026-03-13', applicant: '刘志刚', warehouseLocation: '仓库D区', reviewer: '张志明', operator: '孙操作员', productionBatchCode: 'FQ2024-005', sourceApplicationCodes: ['LL20260313013'], executeStatus: '已取消', executeStatusClass: 'cancelled', materials: []},
  { id: 8, code: 'CK20260314008', date: '2026-03-14', applicant: '王秀英', warehouseLocation: '仓库C区', reviewer: '李志远', operator: '周操作员', productionBatchCode: 'FQ2024-006', sourceApplicationCodes: ['LL20260314014'], executeStatus: '待出库', executeStatusClass: 'pending_out', materials: [
    { materialCode: 'EQ0306001', materialName: '滴灌带', spec: '50m/卷', unit: '卷', category: '农业机械', requestedQuantity: 20, stockQuantity: 0, actualQuantity: 0, remark: '库存为0，无法出库', applicationCode: 'LL20260314014', unitPrice: 95.00, warehousePosition: '仓库C区-06-01' },
  ]},
];
