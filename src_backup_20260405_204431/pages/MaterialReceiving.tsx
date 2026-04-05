import { useState } from 'react';
import { ClipboardList, Search, Download, Eye, Edit, ChevronLeft, ChevronRight, Trash2, ChevronDown, ChevronRight as ChevronRightIcon, Plus, AlertTriangle, X, ClipboardCheck, BarChart3, DollarSign, FileText, RefreshCw, TrendingUp, TrendingDown, Package, MapPin } from 'lucide-react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';

// 物料分类辅助函数
const getCategoryByCode = (code: string): string => {
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

// 物料明细类型
interface MaterialItem {
  materialCode: string;
  materialName: string;
  spec: string;
  unit: string;
  category: string;
  requestedQuantity: number;
  stockQuantity: number;
  unitPrice: number;
  warehousePosition: string;
  remark?: string;
}

// 领料单数据
const materialReceivingDetails = [
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
// 领料统计 Mock 数据
// ============================================

// 月度统计数据
const monthlyStatisticsData = [
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
const materialStatisticsData = [
  { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', requisitionCount: 35, departmentCount: 4, totalQuantity: 580, actualQuantity: 565, totalAmount: 25425, mainWarehouse: '仓库A区', mainDepartment: '生产部' },
  { materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', requisitionCount: 28, departmentCount: 3, totalQuantity: 420, actualQuantity: 410, totalAmount: 34850, mainWarehouse: '仓库A区', mainDepartment: '生产部' },
  { materialCode: 'SP0301001', materialName: '吡虫啉', category: '农药与植保产品', spec: '100g/瓶', unit: '瓶', requisitionCount: 42, departmentCount: 5, totalQuantity: 380, actualQuantity: 370, totalAmount: 10660, mainWarehouse: '仓库B区', mainDepartment: '生产部' },
  { materialCode: 'SP0302001', materialName: '多菌灵', category: '农药与植保产品', spec: '200g/袋', unit: '袋', requisitionCount: 30, departmentCount: 4, totalQuantity: 280, actualQuantity: 275, totalAmount: 9625, mainWarehouse: '仓库B区', mainDepartment: '技术部' },
  { materialCode: 'SP0101001', materialName: '水稻种子', category: '种质资源', spec: '20kg/袋', unit: '袋', requisitionCount: 15, departmentCount: 2, totalQuantity: 180, actualQuantity: 175, totalAmount: 11375, mainWarehouse: '仓库B区', mainDepartment: '生产部' },
  { materialCode: 'SP0103001', materialName: '番茄种子', category: '种质资源', spec: '50g/袋', unit: '袋', requisitionCount: 20, departmentCount: 3, totalQuantity: 160, actualQuantity: 155, totalAmount: 18600, mainWarehouse: '仓库B区', mainDepartment: '生产部' },
  { materialCode: 'OP0201001', materialName: '锄头', category: '劳保与防护用品', spec: '标准型', unit: '把', requisitionCount: 25, departmentCount: 4, totalQuantity: 120, actualQuantity: 118, totalAmount: 4956, mainWarehouse: '仓库C区', mainDepartment: '生产部' },
  { materialCode: 'OP0102001', materialName: '劳保胶靴', category: '劳保与防护用品', spec: '标准码', unit: '双', requisitionCount: 30, departmentCount: 5, totalQuantity: 150, actualQuantity: 148, totalAmount: 10064, mainWarehouse: '仓库C区', mainDepartment: '生产部' },
  { materialCode: 'EQ0103001', materialName: '电动喷雾机', category: '农业机械', spec: '标准型', unit: '台', requisitionCount: 8, departmentCount: 2, totalQuantity: 15, actualQuantity: 15, totalAmount: 8700, mainWarehouse: '仓库A区', mainDepartment: '设备部' },
  { materialCode: 'EQ0306001', materialName: '滴灌带', category: '农业机械', spec: '50m/卷', unit: '卷', requisitionCount: 18, departmentCount: 3, totalQuantity: 200, actualQuantity: 195, totalAmount: 7410, mainWarehouse: '仓库C区', mainDepartment: '生产部' },
  { materialCode: 'PH0104001', materialName: '塑料袋', category: '采收容器', spec: '标准型', unit: '卷', requisitionCount: 40, departmentCount: 6, totalQuantity: 600, actualQuantity: 590, totalAmount: 5015, mainWarehouse: '仓库A区', mainDepartment: '采后处理部' },
  { materialCode: 'IT0101001', materialName: '土壤温湿度传感器', category: '监测设备', spec: '标准型', unit: '个', requisitionCount: 12, departmentCount: 2, totalQuantity: 45, actualQuantity: 42, totalAmount: 11760, mainWarehouse: '仓库A区', mainDepartment: '技术部' },
];

// 部门统计数据
const departmentStatisticsData = [
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
const greenhouseStatisticsData = [
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
const fieldStatisticsData = [
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
const batchStatisticsData = [
  { 
    batchCode: 'FQ2024-001', 
    cropName: '番茄', 
    variety: '红果番茄',
    plantArea: '玻璃温室A区',
    areaSize: '3000 m²',
    plannedStartDate: '2026-03-01',
    plannedEndDate: '2026-09-30',
    requisitionCount: 12, 
    materialTypes: 8, 
    totalQuantity: 680, 
    actualQuantity: 665,
    totalAmount: 18560,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 150, actualQuantity: 148, totalAmount: 6660, mainWarehouse: '仓库A区', mainApplicant: '张伟民' },
      { materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 80, actualQuantity: 78, totalAmount: 6630, mainWarehouse: '仓库A区', mainApplicant: '王建国' },
      { materialCode: 'SP0301001', materialName: '吡虫啉', category: '农药与植保产品', spec: '100g/瓶', unit: '瓶', totalQuantity: 60, actualQuantity: 58, totalAmount: 1624, mainWarehouse: '仓库B区', mainApplicant: '李明轩' },
      { materialCode: 'SP0302001', materialName: '多菌灵', category: '农药与植保产品', spec: '200g/袋', unit: '袋', totalQuantity: 45, actualQuantity: 44, totalAmount: 1540, mainWarehouse: '仓库B区', mainApplicant: '赵俊杰' },
    ]
  },
  { 
    batchCode: 'FQ2024-002', 
    cropName: '黄瓜', 
    variety: '水果黄瓜',
    plantArea: '玻璃温室B区',
    areaSize: '2500 m²',
    plannedStartDate: '2026-03-01',
    plannedEndDate: '2026-08-31',
    requisitionCount: 10, 
    materialTypes: 6, 
    totalQuantity: 520, 
    actualQuantity: 510,
    totalAmount: 14240,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 120, actualQuantity: 118, totalAmount: 5310, mainWarehouse: '仓库A区', mainApplicant: '张伟民' },
      { materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 70, actualQuantity: 68, totalAmount: 5780, mainWarehouse: '仓库A区', mainApplicant: '王建国' },
      { materialCode: 'EQ0306001', materialName: '滴灌带', category: '农业机械', spec: '50m/卷', unit: '卷', totalQuantity: 50, actualQuantity: 50, totalAmount: 1900, mainWarehouse: '仓库C区', mainApplicant: '孙晓峰' },
    ]
  },
  { 
    batchCode: 'FQ2024-003', 
    cropName: '草莓', 
    variety: '红颜',
    plantArea: '日光温室1号',
    areaSize: '600 m²',
    plannedStartDate: '2026-01-01',
    plannedEndDate: '2026-05-31',
    requisitionCount: 8, 
    materialTypes: 5, 
    totalQuantity: 280, 
    actualQuantity: 275,
    totalAmount: 7680,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 60, actualQuantity: 60, totalAmount: 2700, mainWarehouse: '仓库A区', mainApplicant: '张伟民' },
      { materialCode: 'OP0102001', materialName: '劳保胶靴', category: '劳保与防护用品', spec: '标准码', unit: '双', totalQuantity: 20, actualQuantity: 20, totalAmount: 1360, mainWarehouse: '仓库C区', mainApplicant: '赵俊杰' },
    ]
  },
  { 
    batchCode: 'FQ2024-004', 
    cropName: '生菜', 
    variety: '散叶生菜',
    plantArea: '日光温室2号',
    areaSize: '500 m²',
    plannedStartDate: '2026-02-01',
    plannedEndDate: '2026-06-30',
    requisitionCount: 6, 
    materialTypes: 4, 
    totalQuantity: 180, 
    actualQuantity: 178,
    totalAmount: 4920,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 40, actualQuantity: 40, totalAmount: 1800, mainWarehouse: '仓库A区', mainApplicant: '李明轩' },
    ]
  },
  { 
    batchCode: 'FQ2024-005', 
    cropName: '辣椒', 
    variety: '青椒',
    plantArea: '玻璃温室C区',
    areaSize: '2000 m²',
    plannedStartDate: '2026-03-01',
    plannedEndDate: '2026-08-31',
    requisitionCount: 9, 
    materialTypes: 7, 
    totalQuantity: 420, 
    actualQuantity: 412,
    totalAmount: 11480,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 100, actualQuantity: 98, totalAmount: 4410, mainWarehouse: '仓库A区', mainApplicant: '张伟民' },
    ]
  },
  { 
    batchCode: 'FQ2024-006', 
    cropName: '菠菜', 
    variety: '圆叶菠菜',
    plantArea: '塑料大棚1号',
    areaSize: '800 m²',
    plannedStartDate: '2026-01-15',
    plannedEndDate: '2026-04-30',
    requisitionCount: 5, 
    materialTypes: 4, 
    totalQuantity: 160, 
    actualQuantity: 158,
    totalAmount: 4360,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 35, actualQuantity: 35, totalAmount: 1575, mainWarehouse: '仓库A区', mainApplicant: '孙晓峰' },
    ]
  },
  { 
    batchCode: 'FQ2024-007', 
    cropName: '西瓜', 
    variety: '小型西瓜',
    plantArea: '露天种植区',
    areaSize: '5000 m²',
    plannedStartDate: '2026-03-15',
    plannedEndDate: '2026-07-31',
    requisitionCount: 7, 
    materialTypes: 5, 
    totalQuantity: 320, 
    actualQuantity: 315,
    totalAmount: 8740,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 80, actualQuantity: 78, totalAmount: 3510, mainWarehouse: '仓库A区', mainApplicant: '周志强' },
    ]
  },
  { 
    batchCode: 'FQ2024-008', 
    cropName: '茄子', 
    variety: '紫茄',
    plantArea: '日光温室4号',
    areaSize: '600 m²',
    plannedStartDate: '2026-02-15',
    plannedEndDate: '2026-07-15',
    requisitionCount: 6, 
    materialTypes: 5, 
    totalQuantity: 220, 
    actualQuantity: 215,
    totalAmount: 6020,
    details: [
      { materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂', spec: '50kg/袋', unit: '袋', totalQuantity: 50, actualQuantity: 50, totalAmount: 2250, mainWarehouse: '仓库A区', mainApplicant: '赵文静' },
    ]
  },
];

// ============================================
// 仪表盘图表数据（仅月度汇总使用）
// ============================================

// 物料分类7色渐变配色方案（按新编码规则）
const CATEGORY_COLORS = {
  生产投入: { gradient: ['#06B6D4', '#0891B2'], solid: '#06B6D4' },
  设施装备: { gradient: ['#8B5CF6', '#7C3AED'], solid: '#8B5CF6' },
  作业支持: { gradient: ['#F59E0B', '#D97706'], solid: '#F59E0B' },
  采后流通: { gradient: ['#F97316', '#EA580C'], solid: '#F97316' },
  数字管理: { gradient: ['#EC4899', '#DB2777'], solid: '#EC4899' },
  能源耗材: { gradient: ['#64748B', '#475569'], solid: '#64748B' },
  其他: { gradient: ['#9CA3AF', '#6B7280'], solid: '#9CA3AF' },
};

// 物料分类年度汇总数据（按新编码规则）
const categorySummaryData = [
  { name: 'SP-生产投入类', key: '生产投入', value: 12580, amount: 38.5, percentage: 34.2, ...CATEGORY_COLORS.生产投入 },
  { name: 'EQ-设施与装备类', key: '设施装备', value: 6280, amount: 18.6, percentage: 20.8, ...CATEGORY_COLORS.设施装备 },
  { name: 'OP-作业支持类', key: '作业支持', value: 4180, amount: 12.8, percentage: 13.8, ...CATEGORY_COLORS.作业支持 },
  { name: 'PH-采后处理与流通类', key: '采后流通', value: 3180, amount: 9.8, percentage: 10.5, ...CATEGORY_COLORS.采后流通 },
  { name: 'IT-数字化与管理类', key: '数字管理', value: 1580, amount: 4.8, percentage: 5.2, ...CATEGORY_COLORS.数字管理 },
  { name: 'EC-能源与通用耗材', key: '能源耗材', value: 980, amount: 2.9, percentage: 3.2, ...CATEGORY_COLORS.能源耗材 },
  { name: 'OT-其他类', key: '其他', value: 680, amount: 2.1, percentage: 2.3, ...CATEGORY_COLORS.其他 },
];

// 月度用量趋势数据（12个月 x 7分类）
const categoryTrendData = [
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
const getMonthCategoryData = (month: string) => {
  const monthData = categoryTrendData.find(d => d.month === month);
  if (!monthData) return [];
  
  return categorySummaryData.map(cat => {
    const value = (monthData as any)[cat.key] || 0;
    const amount = Math.round(value * 30); // 假设均价30元/件
    return {
      ...cat,
      value,
      amount,
      month: month.replace('2025-', '') + '月',
    };
  });
};

// 计算选中月份的汇总
const getMonthSummary = (month: string) => {
  const data = getMonthCategoryData(month);
  const totalQuantity = data.reduce((sum, d) => sum + d.value, 0);
  const totalAmount = data.reduce((sum, d) => sum + d.amount, 0);
  return { totalQuantity, totalAmount };
};

// ============================================
// 月度汇总表格数据处理
// ============================================

// 月份汇总行（未展开状态）
interface MonthSummaryRow {
  month: string;
  monthName: string;
  totalQuantity: number;
  totalAmount: number;
  percentage: number;
}

// 月份明细行（展开状态）
interface MonthDetailRow {
  month: string;
  monthName: string;
  categoryKey: string;
  categoryName: string;
  quantity: number;
  amount: number;
  percentage: number;
}

// 获取月份汇总数据（用于折叠表格）
const getMonthSummaries = (year: string): MonthSummaryRow[] => {
  return categoryTrendData
    .filter(d => d.month.startsWith(year))
    .map(data => {
      const totalQuantity = categorySummaryData.reduce((sum, cat) => sum + ((data as any)[cat.key] || 0), 0);
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

// 获取月份明细数据（展开后显示7分类）
const getMonthDetails = (month: string): MonthDetailRow[] => {
  const monthData = categoryTrendData.find(d => d.month === month);
  if (!monthData) return [];
  
  const totalQuantity = categorySummaryData.reduce((sum, cat) => sum + ((monthData as any)[cat.key] || 0), 0);
  
  return categorySummaryData.map(cat => {
    const quantity = (monthData as any)[cat.key] || 0;
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
const getYearTotalQuantity = (year: string): number => {
  return categoryTrendData
    .filter(d => d.month.startsWith(year))
    .reduce((sum, data) => {
      return sum + categorySummaryData.reduce((s, cat) => s + ((data as any)[cat.key] || 0), 0);
    }, 0);
};

// 获取年度总金额
const getYearTotalAmount = (year: string): number => {
  return getYearTotalQuantity(year) * 30;
};

// 获取单月视图数据（不折叠，直接显示7分类）
const getSingleMonthTableData = (year: string, month: string): MonthDetailRow[] => {
  return getMonthDetails(`${year}-${month}`);
};

// 获取单月汇总
const getSingleMonthTotal = (year: string, month: string) => {
  const data = getSingleMonthTableData(year, month);
  const totalQty = data.reduce((sum, d) => sum + d.quantity, 0);
  const totalAmt = data.reduce((sum, d) => sum + d.amount, 0);
  return { totalQty, totalAmt };
};

// 图表数据 - 月度趋势（兼容旧数据）
const trendChartData = [
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
const departmentPieData = [
  { name: '生产部', value: 58000, percentage: 62.8 },
  { name: '技术部', value: 16000, percentage: 17.3 },
  { name: '设备部', value: 12000, percentage: 13.0 },
  { name: '后勤部', value: 3600, percentage: 3.9 },
  { name: '采后处理部', value: 2600, percentage: 2.8 },
];

// 图表数据 - 物料分类占比
const categoryPieData = [
  { name: '肥料与土壤改良剂', value: 32000, percentage: 34.6 },
  { name: '农药与植保产品', value: 18000, percentage: 19.5 },
  { name: '种质资源', value: 15000, percentage: 16.2 },
  { name: '农业机械', value: 12000, percentage: 13.0 },
  { name: '劳保与防护用品', value: 8000, percentage: 8.7 },
  { name: '监测设备', value: 5000, percentage: 5.4 },
  { name: '采收容器', value: 2200, percentage: 2.4 },
];

// 领料出库物料明细类型
interface ExecuteMaterialItem {
  materialCode: string;
  materialName: string;
  spec: string;
  unit: string;
  category: string;
  requestedQuantity: number;
  stockQuantity: number;
  actualQuantity: number;
  remark: string;
  applicationCode: string;
  unitPrice?: number;
  warehousePosition?: string;
}

// 领料出库单数据（出库单）
const materialExecuteDetails = [
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

export default function MaterialReceiving() {
  const [activeTab, setActiveTab] = useState('application');
  const [searchCode, setSearchCode] = useState('');
  const [searchApplicant, setSearchApplicant] = useState('');
  const [searchBatchCode, setSearchBatchCode] = useState('');
  const [searchWarehouse, setSearchWarehouse] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [exportMode, setExportMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<typeof materialReceivingDetails[0] | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [showExportTypeModal, setShowExportTypeModal] = useState(false);
  const [exportFileType, setExportFileType] = useState('xlsx');
  const [showEditAlert, setShowEditAlert] = useState(false);
  const [editAlertMessage, setEditAlertMessage] = useState('');
  const [batchEditMode, setBatchEditMode] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showEditWarning, setShowEditWarning] = useState(false);
  const [showDeleteWarning, setShowDeleteWarning] = useState(false);
  const [batchEditedRecords, setBatchEditedRecords] = useState<Record<number, typeof materialReceivingDetails[0]>>({});
  const [currentBatchEditIndex, setCurrentBatchEditIndex] = useState(0);

  // 领料出库页面状态
  const [executeSearchCode, setExecuteSearchCode] = useState('');
  const [executeSearchApplicant, setExecuteSearchApplicant] = useState('');
  const [executeSearchBatchCode, setExecuteSearchBatchCode] = useState('');
  const [executeSearchWarehouse, setExecuteSearchWarehouse] = useState('');
  const [executeStatusFilter, setExecuteStatusFilter] = useState('all');
  const [executeCurrentPage, setExecuteCurrentPage] = useState(1);
  const [executePageSize, setExecutePageSize] = useState(10);
  const [executeExportMode, setExecuteExportMode] = useState(false);
  const [executeSelectedRows, setExecuteSelectedRows] = useState<number[]>([]);
  const [executeShowDetailModal, setExecuteShowDetailModal] = useState(false);
  const [executeShowEditModal, setExecuteShowEditModal] = useState(false);
  const [executeShowDeleteConfirm, setExecuteShowDeleteConfirm] = useState(false);
  const [executeShowAddModal, setExecuteShowAddModal] = useState(false);
  const [executeSelectedRecord, setExecuteSelectedRecord] = useState<typeof materialExecuteDetails[0] | null>(null);
  const [executeDeletingId, setExecuteDeletingId] = useState<number | null>(null);
  const [executeExpandedRows, setExecuteExpandedRows] = useState<Set<number>>(new Set());
  const [executeShowExportTypeModal, setExecuteShowExportTypeModal] = useState(false);
  const [executeExportFileType, setExecuteExportFileType] = useState('xlsx');
  const [executeBatchEditMode, setExecuteBatchEditMode] = useState(false);
  const [executeShowBatchEditModal, setExecuteShowBatchEditModal] = useState(false);
  const [executeShowBatchDeleteConfirm, setExecuteShowBatchDeleteConfirm] = useState(false);
  const [executeShowEditWarning, setExecuteShowEditWarning] = useState(false);
  const [executeShowDeleteWarning, setExecuteShowDeleteWarning] = useState(false);
  const [executeBatchEditedRecords, setExecuteBatchEditedRecords] = useState<Record<number, typeof materialExecuteDetails[0]>>({});
  const [executeCurrentBatchEditIndex, setExecuteCurrentBatchEditIndex] = useState(0);
  const [executeSelectedApplicationCode, setExecuteSelectedApplicationCode] = useState('');
  const [executeSelectedMaterialIndices, setExecuteSelectedMaterialIndices] = useState<Set<number>>(new Set());
  const [executeMaterialActualQuantities, setExecuteMaterialActualQuantities] = useState<Record<number, number>>({});
  const [executeMaterialPool, setExecuteMaterialPool] = useState<ExecuteMaterialItem[]>([]);

  const [executeEditForm, setExecuteEditForm] = useState({
    date: '',
    applicant: '',
    warehouseLocation: '',
    reviewer: '',
    productionBatchCode: '',
    executeStatus: '',
    materials: [] as ExecuteMaterialItem[]
  });

  const [executeAddForm, setExecuteAddForm] = useState({
    code: '',
    date: new Date().toISOString().split('T')[0],
    applicant: '',
    warehouseLocation: '仓库A区',
    reviewer: '王志刚',
    productionBatchCode: '',
    materials: [] as ExecuteMaterialItem[]
  });

  // 领料出库页面过滤后的数据
  const executeFilteredData = materialExecuteDetails.filter(item => {
    if (executeSearchCode && !item.code.toLowerCase().includes(executeSearchCode.toLowerCase())) return false;
    if (executeSearchApplicant && !item.applicant.toLowerCase().includes(executeSearchApplicant.toLowerCase())) return false;
    if (executeSearchBatchCode && !item.productionBatchCode.toLowerCase().includes(executeSearchBatchCode.toLowerCase())) return false;
    if (executeSearchWarehouse && !item.warehouseLocation.toLowerCase().includes(executeSearchWarehouse.toLowerCase())) return false;
    if (executeStatusFilter !== 'all' && item.executeStatus !== executeStatusFilter) return false;
    return true;
  });

  const executeTotalPages = Math.ceil(executeFilteredData.length / executePageSize);

  // ============================================
  // 领料统计页面状态
  // ============================================
  const [statActiveTab, setStatActiveTab] = useState<'monthly' | 'material' | 'department' | 'area'>('monthly');
  const [statActiveAreaTab, setStatActiveAreaTab] = useState<'greenhouse' | 'field' | 'batch'>('greenhouse');
  
  // 通用筛选条件
  const [statDepartmentFilter, setStatDepartmentFilter] = useState<string[]>([]);
  const [statDateRange, setStatDateRange] = useState<{ start: string; end: string }>({ start: '2025-01-01', end: '2025-12-31' });
  const [statCategoryFilter, setStatCategoryFilter] = useState<string[]>([]);
  const [statWarehouseFilter, setStatWarehouseFilter] = useState<string[]>([]);
  
  // 月份切换器状态（仪表盘用）
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  
  // 月度汇总表格专用筛选状态
  const [statYearFilter, setStatYearFilter] = useState<string>('2025');
  const [statMonthFilter, setStatMonthFilter] = useState<string>('all');
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc' | 'desc'}>({ key: 'month', direction: 'asc' });
  
  // 大棚筛选
  const [statGreenhouseTypeFilter, setStatGreenhouseTypeFilter] = useState<string>('all');
  const [statGreenhouseFilter, setStatGreenhouseFilter] = useState<string[]>([]);
  
  // 大田筛选
  const [statFieldFilter, setStatFieldFilter] = useState<string[]>([]);
  
  // 批次筛选
  const [statBatchFilter, setStatBatchFilter] = useState<string>('');
  
  // 对比周期
  const [statComparisonPeriod, setStatComparisonPeriod] = useState<string>('none');
  
  // 分页
  const [statCurrentPage, setStatCurrentPage] = useState(1);
  const [statPageSize, setStatPageSize] = useState(10);
  
  // 导出
  const [statExportMode, setStatExportMode] = useState(false);
  const [statSelectedRows, setStatSelectedRows] = useState<number[]>([]);
  const [statShowExportTypeModal, setStatShowExportTypeModal] = useState(false);
  const [statExportFileType, setStatExportFileType] = useState('xlsx');
  
  // 弹窗
  const [statShowDetailModal, setStatShowDetailModal] = useState(false);
  const [statShowOrderDetailModal, setStatShowOrderDetailModal] = useState(false);
  const [statShowMaterialDetailModal, setStatShowMaterialDetailModal] = useState(false);
  const [statSelectedRecord, setStatSelectedRecord] = useState<any>(null);
  const [statSelectedOrder, setStatSelectedOrder] = useState<any>(null);

  // 领料统计页面快捷筛选
  const handleStatQuickFilter = (period: string) => {
    const now = new Date();
    let start = '';
    let end = '';
    
    switch (period) {
      case 'currentWeek':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        start = weekStart.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
        break;
      case 'currentMonth':
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        end = now.toISOString().split('T')[0];
        break;
      case 'currentQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        start = `${now.getFullYear()}-${String(quarter * 3 + 1).padStart(2, '0')}-01`;
        end = now.toISOString().split('T')[0];
        break;
      case 'currentYear':
        start = `${now.getFullYear()}-01-01`;
        end = `${now.getFullYear()}-12-31`;
        break;
    }
    
    setStatDateRange({ start, end });
    setStatCurrentPage(1);
  };

  // 领料统计页面重置筛选
  const handleStatReset = () => {
    setStatDepartmentFilter([]);
    setStatDateRange({ start: '2025-01-01', end: '2025-12-31' });
    setStatCategoryFilter([]);
    setStatWarehouseFilter([]);
    setStatGreenhouseTypeFilter('all');
    setStatGreenhouseFilter([]);
    setStatFieldFilter([]);
    setStatBatchFilter('');
    setStatComparisonPeriod('none');
    setStatCurrentPage(1);
    // 重置月度汇总专用筛选
    setStatYearFilter('2025');
    setStatMonthFilter('all');
    setExpandedMonths(new Set());
    setSortConfig({ key: 'month', direction: 'asc' });
  };

  // 月度汇总表格辅助函数
  const toggleMonthExpand = (month: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(month)) {
      newExpanded.delete(month);
    } else {
      newExpanded.add(month);
    }
    setExpandedMonths(newExpanded);
  };

  const handleMonthSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortedMonthSummaries = () => {
    const data = getMonthSummaries(statYearFilter);
    const key = sortConfig.key;
    const sorted = [...data].sort((a, b) => {
      if (a[key as keyof typeof a] < b[key as keyof typeof b]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[key as keyof typeof a] > b[key as keyof typeof b]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  };

  // 月度统计辅助函数 - 排名/占比/环比/同比
  const getMonthStats = (month: string) => {
    const allMonthSummaries = getSortedMonthSummaries();
    const yearTotalQty = getYearTotalQuantity(statYearFilter);
    const sortedByQty = [...allMonthSummaries].sort((a, b) => b.totalQuantity - a.totalQuantity);
    const rank = sortedByQty.findIndex(m => m.month === month) + 1;
    const currentData = allMonthSummaries.find(m => m.month === month);
    const percent = yearTotalQty > 0 ? ((currentData?.totalQuantity || 0) / yearTotalQty * 100).toFixed(1) + '%' : '0.0%';
    
    const [year, m] = month.split('-');
    const monthNum = parseInt(m);
    let qoq = '-';
    if (monthNum > 1) {
      const prevMonth = `${year}-${String(monthNum - 1).padStart(2, '0')}`;
      const prevData = allMonthSummaries.find(am => am.month === prevMonth);
      if (prevData && prevData.totalQuantity > 0) {
        const change = ((currentData?.totalQuantity || 0) - prevData.totalQuantity) / prevData.totalQuantity * 100;
        qoq = change >= 0 ? `↑${change.toFixed(1)}%` : `↓${Math.abs(change).toFixed(1)}%`;
      }
    }
    
    let yoy = '-';
    const lastYearMonth = `${parseInt(year) - 1}-${m}`;
    const lastYearData = allMonthSummaries.find(am => am.month === lastYearMonth);
    if (lastYearData && lastYearData.totalQuantity > 0) {
      const change = ((currentData?.totalQuantity || 0) - lastYearData.totalQuantity) / lastYearData.totalQuantity * 100;
      yoy = change >= 0 ? `↑${change.toFixed(1)}%` : `↓${Math.abs(change).toFixed(1)}%`;
    }
    
    return { rank, percent, qoq, yoy };
  };

  const getCategoryStats = (detailQty: number, monthQty: number) => {
    const percent = monthQty > 0 ? ((detailQty / monthQty) * 100).toFixed(1) + '%' : '0.0%';
    return percent;
  };

  // 获取所有月份数据的key（用于全选）
  const getAllMonthKeys = (): number[] => {
    if (statMonthFilter !== 'all') {
      return getSingleMonthTableData(statYearFilter, statMonthFilter).map((_, idx) => idx);
    }
    return getSortedMonthSummaries().map((_, idx) => idx);
  };

  // 月度统计全选
  const handleStatSelectAll = () => {
    const allKeys = getAllMonthKeys();
    if (statSelectedRows.length === allKeys.length) {
      setStatSelectedRows([]);
    } else {
      setStatSelectedRows(allKeys);
    }
  };

  // 月度统计取消导出
  const handleStatCancelExport = () => {
    setStatExportMode(false);
    setStatSelectedRows([]);
  };

  // 月度统计确认导出
  const handleStatExportConfirm = async () => {
    if (statSelectedRows.length === 0) {
      alert('请选择要导出的数据');
      return;
    }
    setStatShowExportTypeModal(true);
  };

  // 月度统计执行导出
  const confirmStatExport = async () => {
    const escapeCSV = (str: string): string => {
      if (str === null || str === undefined) return '';
      const strValue = String(str);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return '"' + strValue.replace(/"/g, '""') + '"';
      }
      return strValue;
    };

    let content = '';
    let mimeType = '';
    let extension = '';

    const headers = ['月份', '物料分类', '领料数量', '领料金额', '排名', '占比', '环比变化', '同比变化'];
    const allMonthSummaries = getSortedMonthSummaries();
    const yearTotalQty = getYearTotalQuantity(statYearFilter);
    const yearTotalAmt = getYearTotalAmount(statYearFilter);
    const selectedData = statMonthFilter === 'all' 
      ? statSelectedRows.map(idx => allMonthSummaries[idx]).filter(Boolean)
      : getSingleMonthTableData(statYearFilter, statMonthFilter).filter((_, idx) => statSelectedRows.includes(idx));

    const sortedByQty = [...allMonthSummaries].sort((a, b) => b.totalQuantity - a.totalQuantity);
    const sortedByAmt = [...allMonthSummaries].sort((a, b) => b.totalAmount - a.totalAmount);

    const getMonthRank = (month: string, sortBy: 'qty' | 'amt') => {
      const arr = sortBy === 'qty' ? sortedByQty : sortedByAmt;
      const idx = arr.findIndex(m => m.month === month);
      return idx >= 0 ? idx + 1 : '-';
    };

    const getMonthPercent = (qty: number) => {
      if (yearTotalQty === 0) return '0.00%';
      return ((qty / yearTotalQty) * 100).toFixed(2) + '%';
    };

    const getPrevMonth = (month: string) => {
      const monthNum = parseInt(month.split('-')[1]);
      if (monthNum === 1) return null;
      const prevMonth = monthNum - 1;
      return `${month.split('-')[0]}-${String(prevMonth).padStart(2, '0')}`;
    };

    const getNextMonth = (month: string) => {
      const monthNum = parseInt(month.split('-')[1]);
      if (monthNum === 12) return null;
      const nextMonth = monthNum + 1;
      return `${month.split('-')[0]}-${String(nextMonth).padStart(2, '0')}`;
    };

    const getMonthQoQ = (month: string) => {
      const prev = getPrevMonth(month);
      if (!prev) return '-';
      const prevData = allMonthSummaries.find(m => m.month === prev);
      if (!prevData || prevData.totalQuantity === 0) return '-';
      const curr = allMonthSummaries.find(m => m.month === month);
      if (!curr) return '-';
      const change = ((curr.totalQuantity - prevData.totalQuantity) / prevData.totalQuantity) * 100;
      return change >= 0 ? `↑${change.toFixed(1)}%` : `↓${Math.abs(change).toFixed(1)}%`;
    };

    const getMonthYoY = (month: string) => {
      const [year, m] = month.split('-');
      const lastYearMonth = `${parseInt(year) - 1}-${m}`;
      const lastYearData = allMonthSummaries.find(m => m.month === lastYearMonth);
      if (!lastYearData || lastYearData.totalQuantity === 0) return '-';
      const curr = allMonthSummaries.find(m => m.month === month);
      if (!curr) return '-';
      const change = ((curr.totalQuantity - lastYearData.totalQuantity) / lastYearData.totalQuantity) * 100;
      return change >= 0 ? `↑${change.toFixed(1)}%` : `↓${Math.abs(change).toFixed(1)}%`;
    };

    const getCategoryPercent = (detailQty: number, monthQty: number) => {
      if (monthQty === 0) return '0.00%';
      return ((detailQty / monthQty) * 100).toFixed(2) + '%';
    };

    const formatDate = () => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    };

    if (statExportFileType === 'csv') {
      let csvContent = '\uFEFF';
      csvContent += `月度领料统计\n`;
      csvContent += `年度,${statYearFilter}年\n`;
      csvContent += `筛选条件,${statMonthFilter === 'all' ? '全部月份' : statMonthFilter + '月'}\n`;
      csvContent += `导出时间,${formatDate()}\n`;
      csvContent += `\n`;
      csvContent += headers.map(h => escapeCSV(h)).join(',') + '\n';
      selectedData.forEach(row => {
        csvContent += `${escapeCSV(row.monthName)},合计,${escapeCSV(row.totalQuantity.toString())},${escapeCSV(row.totalAmount.toString())},${escapeCSV(getMonthRank(row.month, 'qty').toString())},${escapeCSV(getMonthPercent(row.totalQuantity))},${escapeCSV(getMonthQoQ(row.month))},${escapeCSV(getMonthYoY(row.month))}\n`;
        getMonthDetails(row.month).forEach(detail => {
          csvContent += `,,${escapeCSV(detail.categoryName)},${escapeCSV(detail.quantity.toString())},${escapeCSV(detail.amount.toString())},,${escapeCSV(getCategoryPercent(detail.quantity, row.totalQuantity))},,\n`;
        });
      });
      csvContent += `\n`;
      csvContent += `合计,,,,${escapeCSV(yearTotalQty.toString())},${escapeCSV(yearTotalAmt.toString())}\n`;
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (statExportFileType === 'xlsx') {
      let tableContent = `<html><head><meta charset="utf-8"></head><body>`;
      tableContent += `<div style="margin-bottom:20px;font-size:16px;"><b>月度领料统计</b></div>`;
      tableContent += `<div style="margin-bottom:10px;">年度：${statYearFilter}年 | 筛选条件：${statMonthFilter === 'all' ? '全部月份' : statMonthFilter + '月'} | 导出时间：${formatDate()}</div>`;
      tableContent += `<table border="1" style="border-collapse:collapse;width:100%;">`;
      tableContent += `<tr style="background-color:#e5e7eb;font-weight:bold;">${headers.map(h => `<th style="padding:8px;border:1px solid #ccc;">${h}</th>`).join('')}</tr>`;
      selectedData.forEach(row => {
        tableContent += `<tr style="background-color:#fef3c7;font-weight:bold;">`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">${row.monthName}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;">合计</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${row.totalQuantity.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">¥${row.totalAmount.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${getMonthRank(row.month, 'qty')}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${getMonthPercent(row.totalQuantity)}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${getMonthQoQ(row.month)}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${getMonthYoY(row.month)}</td>`;
        tableContent += `</tr>`;
        getMonthDetails(row.month).forEach(detail => {
          tableContent += `<tr>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;">${detail.categoryName}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${detail.quantity.toLocaleString()}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">¥${detail.amount.toLocaleString()}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:center;">${getCategoryPercent(detail.quantity, row.totalQuantity)}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
          tableContent += `</tr>`;
        });
      });
      tableContent += `<tr style="background-color:#d1fae5;font-weight:bold;">`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;" colspan="2">年度合计</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">${yearTotalQty.toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;text-align:right;">¥${yearTotalAmt.toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #ccc;"></td>`;
      tableContent += `</tr>`;
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (statExportFileType === 'doc') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body>`;
      tableContent += `<div style="margin-bottom:20px;font-size:16px;"><b>月度领料统计</b></div>`;
      tableContent += `<div style="margin-bottom:10px;">年度：${statYearFilter}年 | 筛选条件：${statMonthFilter === 'all' ? '全部月份' : statMonthFilter + '月'} | 导出时间：${formatDate()}</div>`;
      tableContent += `<table border="1" style="border-collapse:collapse;width:100%;">`;
      tableContent += `<tr style="background-color:#e5e7eb;font-weight:bold;">${headers.map(h => `<th style="padding:8px;border:1px solid #000;">${h}</th>`).join('')}</tr>`;
      selectedData.forEach(row => {
        tableContent += `<tr style="background-color:#fef3c7;font-weight:bold;">`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">${row.monthName}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;">合计</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${row.totalQuantity.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">¥${row.totalAmount.toLocaleString()}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${getMonthRank(row.month, 'qty')}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${getMonthPercent(row.totalQuantity)}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${getMonthQoQ(row.month)}</td>`;
        tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${getMonthYoY(row.month)}</td>`;
        tableContent += `</tr>`;
        getMonthDetails(row.month).forEach(detail => {
          tableContent += `<tr>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;">${detail.categoryName}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${detail.quantity.toLocaleString()}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">¥${detail.amount.toLocaleString()}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;text-align:center;">${getCategoryPercent(detail.quantity, row.totalQuantity)}</td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
          tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
          tableContent += `</tr>`;
        });
      });
      tableContent += `<tr style="background-color:#d1fae5;font-weight:bold;">`;
      tableContent += `<td style="padding:8px;border:1px solid #000;" colspan="2">年度合计</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">${yearTotalQty.toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;text-align:right;">¥${yearTotalAmt.toLocaleString()}</td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
      tableContent += `<td style="padding:8px;border:1px solid #000;"></td>`;
      tableContent += `</tr>`;
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `月度领料统计_${statYearFilter}年_${statMonthFilter === 'all' ? '全部' : statMonthFilter + '月'}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: statExportFileType.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setStatShowExportTypeModal(false);
    setStatExportMode(false);
    setStatSelectedRows([]);
  };

  // 领料统计页面计算统计卡片数据
  const getStatSummaryData = () => {
    const allData = statActiveTab === 'monthly' ? monthlyStatisticsData :
                     statActiveTab === 'material' ? materialStatisticsData :
                     statActiveTab === 'department' ? departmentStatisticsData :
                     statActiveTab === 'area' ? 
                       (statActiveAreaTab === 'greenhouse' ? greenhouseStatisticsData :
                        statActiveAreaTab === 'field' ? fieldStatisticsData :
                        batchStatisticsData) : [];
    
    const totalRequisitions = allData.reduce((sum, item: any) => sum + (item.requisitionCount || 0), 0);
    const totalQuantity = allData.reduce((sum, item: any) => sum + (item.totalQuantity || 0), 0);
    const totalAmount = allData.reduce((sum, item: any) => sum + (item.totalAmount || 0), 0);
    const avgDifferenceRate = allData.length > 0 ? 
      allData.reduce((sum, item: any) => sum + (item.differenceRate || 0), 0) / allData.length : 0;
    
    return {
      requisitionCount: totalRequisitions,
      totalQuantity,
      totalAmount,
      avgDifferenceRate,
      yearOnYearChange: 5.2
    };
  };

  // 领料出库页面重置搜索
  const handleExecuteReset = () => {
    setExecuteSearchCode('');
    setExecuteSearchApplicant('');
    setExecuteSearchBatchCode('');
    setExecuteSearchWarehouse('');
    setExecuteStatusFilter('all');
    setExecuteCurrentPage(1);
  };

  // 领料出库页面展开/折叠行
  const toggleExecuteExpandRow = (id: number) => {
    const newExpandedRows = new Set(executeExpandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExecuteExpandedRows(newExpandedRows);
  };

  // 领料出库页面全选
  const handleExecuteSelectAll = () => {
    if (executeSelectedRows.length === executeFilteredData.length) {
      setExecuteSelectedRows([]);
    } else {
      setExecuteSelectedRows(executeFilteredData.map(item => item.id));
    }
  };

  // 领料出库页面选择单行
  const handleExecuteSelectRow = (id: number) => {
    if (executeSelectedRows.includes(id)) {
      setExecuteSelectedRows(executeSelectedRows.filter(rowId => rowId !== id));
    } else {
      setExecuteSelectedRows([...executeSelectedRows, id]);
    }
  };

  // 领料出库页面导出
  const handleExecuteExportClick = () => {
    setExecuteShowExportTypeModal(true);
  };

  const confirmExecuteExport = async () => {
    const exportData = materialExecuteDetails.filter(item => executeSelectedRows.includes(item.id));
    const headers = ['出库单号', '日期', '申领人', '仓库地点', '审核人', '操作人', '生产批次号', '执行状态'];
    const fields = ['code', 'date', 'applicant', 'warehouseLocation', 'reviewer', 'operator', 'productionBatchCode', 'executeStatus'];
    const materialHeaders = ['来源领料单号', '物料编码', '物料名称', '规格', '单位', '申请数量', '实际库存', '本次实发', '备注'];
    const materialFields = ['applicationCode', 'materialCode', 'materialName', 'spec', 'unit', 'requestedQuantity', 'stockQuantity', 'actualQuantity', 'remark'];

    const escapeCSV = (str: string): string => {
      if (str === null || str === undefined) return '';
      const strValue = String(str);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return '"' + strValue.replace(/"/g, '""') + '"';
      }
      return strValue;
    };

    let content = '';
    let mimeType = '';
    let extension = '';

    if (executeExportFileType === 'csv') {
      let csvContent = '\uFEFF' + headers.map(h => escapeCSV(h)).join(',') + ',' + materialHeaders.map(h => escapeCSV(h)).join(',') + '\n';
      exportData.forEach(row => {
        const mainRow = fields.map(f => escapeCSV((row as any)[f] || '')).join(',');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              csvContent += mainRow + ',' + materialFields.map(f => escapeCSV(mat[f] || '')).join(',') + '\n';
            } else {
              csvContent += ','.repeat(headers.length) + materialFields.map(f => escapeCSV(mat[f] || '')).join(',') + '\n';
            }
          });
        } else {
          csvContent += mainRow + ',' + ','.repeat(materialHeaders.length) + '\n';
        }
      });
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (executeExportFileType === 'xlsx') {
      let tableContent = `<html><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (executeExportFileType === 'word') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `领料出库_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: executeExportFileType.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setExecuteShowExportTypeModal(false);
    setExecuteExportMode(false);
    setExecuteSelectedRows([]);
  };

  // 领料出库页面取消导出
  const handleExecuteCancelExport = () => {
    setExecuteExportMode(false);
    setExecuteSelectedRows([]);
  };

  // 领料出库页面查看详情
  const handleExecuteView = (item: typeof materialExecuteDetails[0]) => {
    setExecuteSelectedRecord(item);
    setExecuteShowDetailModal(true);
  };

  // 领料出库页面新增
  const handleExecuteAdd = () => {
    const newCode = 'CK' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + String(materialExecuteDetails.length + 1).padStart(3, '0');
    setExecuteAddForm({
      code: newCode,
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      warehouseLocation: '仓库A区',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: []
    });
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
    setExecuteShowAddModal(true);
  };

  // 添加选中物料到物料池
  const handleAddToMaterialPool = () => {
    if (!executeSelectedApplicationCode || executeSelectedMaterialIndices.size === 0) {
      alert('请先选择领料单并勾选要出库的物料');
      return;
    }
    const selectedApp = materialReceivingDetails.find(app => app.code === executeSelectedApplicationCode);
    if (!selectedApp) return;

    const newMaterials: ExecuteMaterialItem[] = Array.from(executeSelectedMaterialIndices).map(idx => {
      const material = selectedApp.materials[idx];
      const actualQty = executeMaterialActualQuantities[idx] ?? material.requestedQuantity;
      return {
        materialCode: material.materialCode,
        materialName: material.materialName,
        spec: material.spec,
        unit: material.unit,
        category: material.category,
        requestedQuantity: material.requestedQuantity,
        stockQuantity: actualQty,
        actualQuantity: actualQty,
        remark: actualQty === material.requestedQuantity ? '正常出库' : '部分出库',
        applicationCode: executeSelectedApplicationCode
      };
    });

    setExecuteMaterialPool([...executeMaterialPool, ...newMaterials]);
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteSelectedApplicationCode('');
  };

  // 从物料池移除物料
  const handleRemoveFromMaterialPool = (index: number) => {
    setExecuteMaterialPool(executeMaterialPool.filter((_, i) => i !== index));
  };

  // 更新物料池中物料的实发数量
  const handleUpdateMaterialPoolQuantity = (index: number, actualQuantity: number) => {
    const updatedPool = [...executeMaterialPool];
    updatedPool[index] = {
      ...updatedPool[index],
      actualQuantity: actualQuantity,
      remark: actualQuantity === updatedPool[index].requestedQuantity ? '正常出库' : '部分出库'
    };
    setExecuteMaterialPool(updatedPool);
  };

  // 领料出库页面编辑
  const handleExecuteEdit = (item: typeof materialExecuteDetails[0]) => {
    setExecuteSelectedRecord(item);
    setExecuteEditForm({
      date: item.date,
      applicant: item.applicant,
      warehouseLocation: item.warehouseLocation,
      reviewer: item.reviewer,
      productionBatchCode: item.productionBatchCode,
      executeStatus: item.executeStatus,
      materials: item.materials
    });
    setExecuteShowEditModal(true);
  };

  // 领料出库页面删除
  const handleExecuteDeleteClick = (id: number) => {
    setExecuteDeletingId(id);
    setExecuteShowDeleteConfirm(true);
  };

  const confirmExecuteDelete = () => {
    console.log('Delete confirmed for id:', executeDeletingId);
    setExecuteShowDeleteConfirm(false);
    setExecuteDeletingId(null);
  };

  const handleExecuteSaveEdit = () => {
    console.log('Save edit:', executeEditForm);
    setExecuteShowEditModal(false);
    alert('保存成功');
  };

  const handleExecuteSaveAdd = () => {
    if (executeMaterialPool.length === 0) {
      alert('请先添加物料到物料池');
      return;
    }

    const sourceAppCodes = [...new Set(executeMaterialPool.map(m => m.applicationCode))];
    const firstMaterial = executeMaterialPool[0];
    const sourceApp = materialReceivingDetails.find(app => app.code === firstMaterial.applicationCode);

    const newRecord = {
      id: materialExecuteDetails.length + 1,
      code: executeAddForm.code || `CK${new Date().toISOString().split('T')[0].replace(/-/g, '')}${String(materialExecuteDetails.length + 1).padStart(3, '0')}`,
      date: executeAddForm.date,
      applicant: sourceApp?.applicant || '',
      warehouseLocation: executeAddForm.warehouseLocation,
      reviewer: sourceApp?.reviewer || '',
      operator: executeAddForm.reviewer,
      productionBatchCode: sourceApp?.productionBatchCode || '',
      sourceApplicationCodes: sourceAppCodes,
      executeStatus: executeMaterialPool.some(m => m.actualQuantity < m.requestedQuantity) ? '部分出库' : '已出库',
      executeStatusClass: executeMaterialPool.some(m => m.actualQuantity < m.requestedQuantity) ? 'partial' : 'completed',
      materials: executeMaterialPool
    };

    console.log('新增出库单:', newRecord);
    
    setExecuteShowAddModal(false);
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
    setExecuteAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      warehouseLocation: '仓库A区',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: []
    });
    alert('新增成功');
  };

  const handleExecuteCancelAdd = () => {
    setExecuteShowAddModal(false);
    setExecuteSelectedApplicationCode('');
    setExecuteSelectedMaterialIndices(new Set());
    setExecuteMaterialActualQuantities({});
    setExecuteMaterialPool([]);
  };

  const handleExecuteCancelEdit = () => {
    setExecuteShowEditModal(false);
  };

  const handleExecuteCancelDetail = () => {
    setExecuteShowDetailModal(false);
  };

  const handleExecuteEditAddMaterial = () => {
    setExecuteEditForm({
      ...executeEditForm,
      materials: [
        ...executeEditForm.materials,
        { materialCode: '', materialName: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '' }
      ]
    });
  };

  const handleExecuteEditRemoveMaterial = (index: number) => {
    setExecuteEditForm({
      ...executeEditForm,
      materials: executeEditForm.materials.filter((_, i) => i !== index)
    });
  };

  const handleExecuteEditMaterialChange = (index: number, field: keyof ExecuteMaterialItem, value: any) => {
    const newMaterials = [...executeEditForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setExecuteEditForm({ ...executeEditForm, materials: newMaterials });
  };

  const handleExecuteBatchMaterialChange = (materialIndex: number, field: string, value: any) => {
    if (!currentRecordId) return;
    const currentData = executeBatchEditedRecords[currentRecordId] || currentRecord || {};
    const currentMaterials = currentData.materials || [];
    const newMaterials = [...currentMaterials];
    newMaterials[materialIndex] = { ...newMaterials[materialIndex], [field]: value };
    setExecuteBatchEditedRecords({
      ...executeBatchEditedRecords,
      [currentRecordId]: { ...currentData, materials: newMaterials }
    });
  };

  const handleExecuteAddAddMaterial = () => {
    setExecuteAddForm({
      ...executeAddForm,
      materials: [
        ...executeAddForm.materials,
        { materialCode: '', materialName: '', spec: '', unit: '', category: '', requestedQuantity: 0, stockQuantity: 0, actualQuantity: 0, remark: '' }
      ]
    });
  };

  const handleExecuteAddRemoveMaterial = (index: number) => {
    setExecuteAddForm({
      ...executeAddForm,
      materials: executeAddForm.materials.filter((_, i) => i !== index)
    });
  };

  const handleExecuteAddMaterialChange = (index: number, field: keyof ExecuteMaterialItem, value: any) => {
    const newMaterials = [...executeAddForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setExecuteAddForm({ ...executeAddForm, materials: newMaterials });
  };

  const [editForm, setEditForm] = useState({
    date: '',
    applicant: '',
    department: '',
    warehouseLocation: '',
    plantArea: '',
    reviewer: '',
    productionBatchCode: '',
    status: '',
    materials: [] as MaterialItem[]
  });

  const [addForm, setAddForm] = useState({
    code: '',
    date: new Date().toISOString().split('T')[0],
    applicant: '',
    department: '',
    warehouseLocation: '仓库A区',
    plantArea: '',
    reviewer: '王志刚',
    productionBatchCode: '',
    materials: [] as MaterialItem[]
  });

  // 过滤后的数据
  const filteredData = materialReceivingDetails.filter(item => {
    if (searchCode && !item.code.toLowerCase().includes(searchCode.toLowerCase())) return false;
    if (searchApplicant && !item.applicant.toLowerCase().includes(searchApplicant.toLowerCase())) return false;
    if (searchBatchCode && !item.productionBatchCode.toLowerCase().includes(searchBatchCode.toLowerCase())) return false;
    if (searchWarehouse && !item.warehouseLocation.toLowerCase().includes(searchWarehouse.toLowerCase())) return false;
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);

  // 重置搜索
  const handleReset = () => {
    setSearchCode('');
    setSearchApplicant('');
    setSearchBatchCode('');
    setSearchWarehouse('');
    setStatusFilter('all');
    setCurrentPage(1);
  };

  // 展开/折叠行
  const toggleExpandRow = (id: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  // 全选
  const handleSelectAll = () => {
    if (selectedRows.length === filteredData.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredData.map(item => item.id));
    }
  };

  // 选择单行
  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter(rowId => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  // 导出
  const handleExportClick = () => {
    setShowExportTypeModal(true);
  };

  const confirmExport = async () => {
    // 获取选中的数据
    const exportData = materialReceivingDetails.filter(item => selectedRows.includes(item.id));

    // 主表表头和字段映射
    const headers = ['领料单号', '日期', '申领人', '仓库地点', '审核人', '生产批次号', '状态'];
    const fields = ['code', 'date', 'applicant', 'warehouseLocation', 'reviewer', 'productionBatchCode', 'status'];

    // 物料明细表头和字段映射
    const materialHeaders = ['物料编码', '物料名称', '规格', '单位', '申领数量', '当前库存', '单价(元)', '小计(元)', '备注'];
    const materialFields = ['materialCode', 'materialName', 'spec', 'unit', 'requestedQuantity', 'stockQuantity', 'unitPrice'];

    // 准备导出内容
    let content = '';
    let mimeType = '';
    let extension = '';

    if (exportFileType === 'csv') {
      let csvContent = '\uFEFF' + headers.join(',') + ',' + materialHeaders.join(',') + '\n';
      exportData.forEach(row => {
        const mainRow = fields.map(f => `"${(row as any)[f] || ''}"`).join(',');
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              csvContent += mainRow + ',' + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            } else {
              csvContent += ','.repeat(headers.length) + ',' + materialFields.map(f => `"${mat[f] || ''}"`).join(',') + '\n';
            }
          });
        } else {
          csvContent += mainRow + ',' + ','.repeat(materialHeaders.length) + '\n';
        }
      });
      content = csvContent;
      mimeType = 'text/csv;charset=utf-8';
      extension = 'csv';
    } else if (exportFileType === 'xlsx') {
      let tableContent = `<html><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-excel;charset=utf-8';
      extension = 'xls';
    } else if (exportFileType === 'word') {
      let tableContent = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"></head><body><table border="1">`;
      tableContent += `<tr>${headers.map(h => `<th>${h}</th>`).join('')}${materialHeaders.map(h => `<th>${h}</th>`).join('')}</tr>`;
      exportData.forEach(row => {
        if (row.materials && row.materials.length > 0) {
          row.materials.forEach((mat: any, idx: number) => {
            if (idx === 0) {
              tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            } else {
              tableContent += `<tr>${'<td></td>'.repeat(headers.length)}${materialFields.map(f => `<td>${mat[f] || ''}</td>`).join('')}</tr>`;
            }
          });
        } else {
          tableContent += `<tr>${fields.map(f => `<td>${(row as any)[f] || ''}</td>`).join('')}${'<td></td>'.repeat(materialHeaders.length)}</tr>`;
        }
      });
      tableContent += '</table></body></html>';
      content = tableContent;
      mimeType = 'application/vnd.ms-word;charset=utf-8';
      extension = 'doc';
    }

    const fileName = `生产领料_${new Date().toISOString().slice(0, 10)}.${extension}`;

    try {
      if (window.showSaveFilePicker) {
        const handle = await window.showSaveFilePicker({
          suggestedName: fileName,
          types: [{
            description: exportFileType.toUpperCase() + ' Files',
            accept: { [mimeType]: ['.' + extension] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
      } else {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    }

    setShowExportTypeModal(false);
    setExportMode(false);
    setSelectedRows([]);
  };

  const handleCancelExport = () => {
    setExportMode(false);
    setSelectedRows([]);
  };

  // 查看详情
  const handleView = (item: typeof materialReceivingDetails[0]) => {
    setSelectedRecord(item);
    setShowDetailModal(true);
  };

  // 编辑
  const handleEdit = (item: typeof materialReceivingDetails[0]) => {
    // 只有待审批状态的记录可以编辑
    if (item.status !== '待审批') {
      setEditAlertMessage(`该领料单当前状态为「${item.status}」，非待审批状态无法编辑。如需处理，可选择「作废申请」。`);
      setShowEditAlert(true);
      return;
    }
    setSelectedRecord(item);
    setEditForm({
      date: item.date,
      applicant: item.applicant,
      department: item.department,
      warehouseLocation: item.warehouseLocation,
      plantArea: item.plantArea,
      reviewer: item.reviewer,
      productionBatchCode: item.productionBatchCode,
      status: item.status,
      materials: [...item.materials],
    });
    setShowEditModal(true);
  };

  // 编辑弹窗 - 添加物料行
  const handleEditAddMaterial = () => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      spec: '',
      unit: '',
      category: '种质资源',
      requestedQuantity: 0,
      stockQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      remark: ''
    };
    setEditForm({ ...editForm, materials: [...editForm.materials, newMaterial] });
  };

  // 编辑弹窗 - 删除物料行
  const handleEditRemoveMaterial = (index: number) => {
    const newMaterials = [...editForm.materials];
    newMaterials.splice(index, 1);
    setEditForm({ ...editForm, materials: newMaterials });
  };

  // 编辑弹窗 - 更新物料行
  const handleEditMaterialChange = (index: number, field: keyof MaterialItem, value: string | number) => {
    const newMaterials = [...editForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setEditForm({ ...editForm, materials: newMaterials });
  };

  // 删除确认
  const handleDeleteClick = (id: number) => {
    setDeletingId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    console.log('删除记录 ID:', deletingId);
    setShowDeleteConfirm(false);
    setDeletingId(null);
  };

  // 保存编辑（重新提交）
  const handleSaveEdit = () => {
    console.log('保存编辑（重新提交）:', editForm);
    // 编辑后状态改为待审批（重新提交）
    setShowEditModal(false);
    // 可以这里添加更新本地数据的逻辑
    alert('编辑已保存，领料单已重新提交，等待审批');
  };

  // 作废申请按钮点击
  const handleVoidApply = () => {
    if (!selectedRecord) return;
    setVoidReason('');
    setShowVoidModal(true);
  };

  // 提交作废申请
  const submitVoidApply = () => {
    if (!voidReason.trim()) {
      alert('请填写作废原因');
      return;
    }
    console.log('提交作废申请:', { recordId: selectedRecord?.id, voidReason });
    // 更新本地数据状态为已作废
    const recordIndex = materialReceivingDetails.findIndex(r => r.id === selectedRecord?.id);
    if (recordIndex !== -1) {
      materialReceivingDetails[recordIndex].status = '已作废';
      materialReceivingDetails[recordIndex].statusClass = 'voided';
    }
    setShowVoidModal(false);
    setShowEditModal(false);
  };

  // 添加物料行
  const handleAddMaterial = () => {
    const newMaterial: MaterialItem = {
      materialCode: '',
      materialName: '',
      spec: '',
      unit: '',
      category: '种质资源',
      requestedQuantity: 0,
      stockQuantity: 0,
      unitPrice: 0,
      warehousePosition: '',
      remark: ''
    };
    setAddForm({ ...addForm, materials: [...addForm.materials, newMaterial] });
  };

  // 删除物料行
  const handleRemoveMaterial = (index: number) => {
    const newMaterials = [...addForm.materials];
    newMaterials.splice(index, 1);
    setAddForm({ ...addForm, materials: newMaterials });
  };

  // 更新物料行
  const handleMaterialChange = (index: number, field: keyof MaterialItem, value: string | number) => {
    const newMaterials = [...addForm.materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setAddForm({ ...addForm, materials: newMaterials });
  };

  // 保存新增
  const handleSaveAdd = () => {
    const newCode = `LL${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}${String(new Date().getDate()).padStart(2, '0')}${String(materialReceivingDetails.length + 1).padStart(3, '0')}`;
    const newRecord = {
      id: materialReceivingDetails.length + 1,
      code: newCode,
      date: addForm.date,
      applicant: addForm.applicant,
      department: addForm.department,
      warehouseLocation: addForm.warehouseLocation,
      plantArea: addForm.plantArea,
      reviewer: addForm.reviewer,
      productionBatchCode: addForm.productionBatchCode,
      status: '待审批',
      statusClass: 'pending',
      materials: addForm.materials.map(m => ({ ...m, actualQuantity: 0 }))
    };
    console.log('新增记录:', newRecord);
    setShowAddModal(false);
    setAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      department: '',
      warehouseLocation: '仓库A区',
      plantArea: '',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: []
    });
  };

  // 取消新增
  const handleCancelAdd = () => {
    setShowAddModal(false);
    setAddForm({
      code: '',
      date: new Date().toISOString().split('T')[0],
      applicant: '',
      department: '',
      warehouseLocation: '仓库A区',
      plantArea: '',
      reviewer: '王志刚',
      productionBatchCode: '',
      materials: []
    });
  };

  return (
    <div className="space-y-6">
      {/* 页面头部 */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">生产领料</h1>
            <p className="text-gray-500">生产领料记录管理</p>
          </div>
        </div>
      </div>

      {/* Tab切换区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex gap-1">
        {[
          { key: 'application', label: '领料申请', icon: FileText },
          { key: 'execute', label: '领料出库', icon: ClipboardCheck },
          { key: 'statistics', label: '领料统计', icon: BarChart3 },
          { key: 'cost', label: '成本核算', icon: DollarSign },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

    {/* Tab内容区域 */}
    <div>
      {/* 领料申请 Tab内容 */}
      <div className={activeTab === 'application' ? '' : 'hidden'}>
      {/* 搜索区域 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">领料单号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索领料单号..."
                value={searchCode}
                onChange={(e) => { setSearchCode(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">申领人</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索申领人..."
                value={searchApplicant}
                onChange={(e) => { setSearchApplicant(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索生产计划批次号..."
                value={searchBatchCode}
                onChange={(e) => { setSearchBatchCode(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
            <select
              value={searchWarehouse}
              onChange={(e) => { setSearchWarehouse(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="仓库A区">仓库A区</option>
              <option value="仓库B区">仓库B区</option>
              <option value="仓库C区">仓库C区</option>
              <option value="仓库D区">仓库D区</option>
              <option value="仓库E区">仓库E区</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">审批状态</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="待审批">待审批</option>
              <option value="已审批">已审批</option>
              <option value="已拒绝">已拒绝</option>
              <option value="已作废">已作废</option>
              <option value="已取消">已取消</option>
            </select>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            重置
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">领料申请单列表</h3>
          {exportMode ? (
            <div className="flex gap-2">
              <button
                onClick={handleExportClick}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={handleCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              {/* 编辑删除按钮 - 默认显示 */}
              {!batchEditMode && (
                <>
                  <button
                    onClick={() => { setBatchEditMode(true); setShowEditWarning(true); }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(true); setShowDeleteWarning(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </>
              )}

              {/* 选择模式下显示确认/取消按钮 */}
              {batchEditMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (selectedRows.length === 0) {
                        alert('请先选择要编辑的记录');
                        setBatchEditMode(false);
                      } else {
                        setShowBatchEditModal(true);
                      }
                    }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    确认编辑
                  </button>
                  <button
                    onClick={() => { setShowBatchDeleteConfirm(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => { setBatchEditMode(false); setSelectedRows([]); }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
                  >
                    取消
                  </button>
                </div>
              )}

              {!batchEditMode && (
                <button
                  onClick={() => setExportMode(true)}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {(exportMode || batchEditMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                    <input
                      type="checkbox"
                      checked={selectedRows.length === filteredData.length && filteredData.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-8"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">领料单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">部门</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">库存地点</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料种类</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">种植区域/用途</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审核人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">生产计划批次号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">备注</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-400">
              {filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-gray-50">
                    {(exportMode || batchEditMode) && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(item.id)}
                          onChange={() => handleSelectRow(item.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExpandRow(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {expandedRows.has(item.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-700" onClick={() => handleView(item)}>{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.applicant}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.department}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.warehouseLocation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.materials.length > 0 ? `${item.materials.length}种` : '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.plantArea}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.reviewer}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.productionBatchCode}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium w-fit ${
                          item.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
                          item.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                          item.statusClass === 'rejected' ? 'bg-red-100 text-red-700' :
                          item.statusClass === 'cancelled' ? 'bg-gray-100 text-blue-700' :
                          item.statusClass === 'voided' ? 'bg-gray-200 text-gray-600' :
                          item.statusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-blue-700'
                        }`}>
                          {item.status}
                        </span>
                        {item.statusClass === 'rejected' && item.rejectReason && (
                          <span className="text-xs text-red-600 max-w-[150px] truncate" title={item.rejectReason}>
                            原因：{item.rejectReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {item.materials.length > 0 ? item.materials[0].remark : '-'}
                    </td>
                  </tr>
                  {expandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-white">
                      <td colSpan={(exportMode || batchEditMode) ? 10 : 9} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-blue-800 mb-2">物料明细</div>
                          {item.materials.length > 0 ? (
                            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                              <thead className="bg-[#F2F6FA]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">物料编码</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">物料名称</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">规格</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">单位</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">申领数量</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">当前库存</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">单价(元)</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">小计(元)</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">仓库货位</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">备注</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {item.materials.map((material, idx) => {
                                  const subtotal = material.requestedQuantity * material.unitPrice;
                                  const isStockWarning = material.requestedQuantity > material.stockQuantity;
                                  return (
                                    <tr key={idx} className="hover:bg-[#F2F6FA]/50">
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                      <td className={`px-3 py-2 text-sm ${isStockWarning ? 'text-red-600 font-bold' : 'text-blue-800'}`}>{material.requestedQuantity}{isStockWarning && ' ⚠️'}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.stockQuantity}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.unitPrice.toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.remark}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* 导出模式底部 */}
        {exportMode && selectedRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={handleSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {selectedRows.length === filteredData.length ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {filteredData.length} 条</span>
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{currentPage} / {totalPages || 1}</span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 查看详情弹窗 */}
      {showDetailModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">领料单详情</h3>
              <button onClick={() => setShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <span className="text-2xl text-gray-400">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">领料单号</label>
                  <p className="font-mono font-semibold text-gray-900">{selectedRecord.code}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">申请日期</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.date}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">申请人</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.applicant}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">部门</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.department}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">库存地点</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.warehouseLocation}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">物料种类</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.materials.length > 0 ? `${selectedRecord.materials.length}种` : '-'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">种植区域/用途</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.plantArea}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">审核人</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.reviewer}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">生产计划批次号</label>
                  <p className="font-semibold text-gray-900">{selectedRecord.productionBatchCode}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">状态</label>
                  <p className="font-semibold">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      selectedRecord.statusClass === 'approved' ? 'bg-green-100 text-green-700' :
                      selectedRecord.statusClass === 'pending' ? 'bg-amber-100 text-amber-700' :
                      selectedRecord.statusClass === 'rejected' ? 'bg-red-100 text-red-700' :
                      selectedRecord.statusClass === 'cancelled' ? 'bg-gray-100 text-blue-700' :
                      selectedRecord.statusClass === 'voided' ? 'bg-gray-200 text-gray-600' :
                      'bg-gray-100 text-blue-700'
                    }`}>
                      {selectedRecord.status}
                    </span>
                  </p>
                  {selectedRecord.statusClass === 'rejected' && selectedRecord.rejectReason && (
                    <p className="text-xs text-red-600 mt-1">拒绝原因：{selectedRecord.rejectReason}</p>
                  )}
                </div>
              </div>
              {selectedRecord.materials.length > 0 && (
                <div className="mt-6">
                  <label className="text-sm text-gray-500 block mb-2">物料明细</label>
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">申领数量</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">当前库存</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单价(元)</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">小计(元)</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">仓库货位</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedRecord.materials.map((material: MaterialItem, idx: number) => {
                        const subtotal = material.requestedQuantity * material.unitPrice;
                        const isStockWarning = material.requestedQuantity > material.stockQuantity;
                        return (
                          <tr key={idx} className="hover:bg-emerald-100">
                            <td className="px-3 py-2 text-sm text-blue-700 font-mono">{material.materialCode}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.materialName}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.spec}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.unit}</td>
                            <td className={`px-3 py-2 text-sm ${isStockWarning ? 'text-red-600 font-bold' : 'text-blue-700'}`}>{material.requestedQuantity}{isStockWarning && ' (!)'}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.stockQuantity}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{subtotal.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.warehousePosition}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.remark || '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">编辑领料单</h3>
              <button onClick={() => setShowEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                {/* 领料单号 - 只读 */}
                <div className="bg-gray-100 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">领料单号</label>
                  <div className="text-sm font-medium text-gray-900">{selectedRecord?.code}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请日期</label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请人</label>
                  <input
                    type="text"
                    value={editForm.applicant}
                    onChange={(e) => setEditForm({ ...editForm, applicant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">部门</label>
                  <select
                    value={editForm.department}
                    onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择部门</option>
                    <option value="生产部">生产部</option>
                    <option value="后勤部">后勤部</option>
                    <option value="设备部">设备部</option>
                    <option value="技术部">技术部</option>
                    <option value="采后处理部">采后处理部</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">库存地点</label>
                  <select
                    value={editForm.warehouseLocation}
                    onChange={(e) => setEditForm({ ...editForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="仓库A区">仓库A区</option>
                    <option value="仓库B区">仓库B区</option>
                    <option value="仓库C区">仓库C区</option>
                    <option value="仓库D区">仓库D区</option>
                    <option value="仓库E区">仓库E区</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">种植区域/用途</label>
                  <input
                    type="text"
                    value={editForm.plantArea}
                    onChange={(e) => setEditForm({ ...editForm, plantArea: e.target.value })}
                    placeholder="如：1号棚-叶菜区"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">审核人</label>
                  <select
                    value={editForm.reviewer}
                    onChange={(e) => setEditForm({ ...editForm, reviewer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="王经理">王经理</option>
                    <option value="李经理">李经理</option>
                    <option value="张经理">张经理</option>
                    <option value="陈经理">陈经理</option>
                    <option value="赵经理">赵经理</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">生产计划批次号</label>
                  <input
                    type="text"
                    value={editForm.productionBatchCode}
                    onChange={(e) => setEditForm({ ...editForm, productionBatchCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 物料明细 */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">物料明细</label>
                  <button
                    onClick={handleEditAddMaterial}
                    className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加物料
                  </button>
                </div>
                {editForm.materials.length > 0 ? (
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">申领数量</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">当前库存</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">单价(元)</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">小计(元)</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">仓库货位</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">备注</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {editForm.materials.map((material, idx) => {
                        const subtotal = material.requestedQuantity * (material.unitPrice || 0);
                        const isStockWarning = material.requestedQuantity > (material.stockQuantity || 0);
                        return (
                          <tr key={idx}>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.materialCode}
                                onChange={(e) => handleEditMaterialChange(idx, 'materialCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.materialName}
                                onChange={(e) => handleEditMaterialChange(idx, 'materialName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.spec}
                                onChange={(e) => handleEditMaterialChange(idx, 'spec', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.unit}
                                onChange={(e) => handleEditMaterialChange(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.requestedQuantity}
                                onChange={(e) => handleEditMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                                className={`w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.stockQuantity || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.unitPrice || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-sm text-blue-700 bg-gray-50">
                              {subtotal.toFixed(2)}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.warehousePosition || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'warehousePosition', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.remark || ''}
                                onChange={(e) => handleEditMaterialChange(idx, 'remark', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => handleEditRemoveMaterial(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
                    暂无物料明细，请点击"添加物料"按钮添加
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 bg-gray-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              {(selectedRecord?.status === '待审批' || selectedRecord?.status === '已审批') && (
                <button
                  onClick={handleVoidApply}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  作废申请
                </button>
              )}
              <button
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑警告弹窗 */}
      {showEditWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">批量编辑警告</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mb-6">
              <p>编辑后可能存在以下问题：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>该领料单的历史记录可能无法追溯</li>
                <li>已生成的出库单据数据可能不一致</li>
                <li>相关的统计报表数据可能需要重新核算</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowEditWarning(false); setBatchEditMode(false); setSelectedRows([]); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => { setShowEditWarning(false); }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除警告弹窗 */}
      {showDeleteWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">批量删除警告</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mb-6">
              <p>删除后可能存在以下问题：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>所有选中的领料单将被永久删除</li>
                <li>相关的物料明细也将被删除</li>
                <li>历史数据将无法恢复</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteWarning(false); setBatchEditMode(false); setSelectedRows([]); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => { setShowDeleteWarning(false); }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">确认删除</h3>
                  <p className="text-sm text-gray-500">此操作不可恢复</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>警告：</strong> 删除此领料记录可能会导致相关数据丢失，无法恢复。请确认是否继续删除操作。
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-6">确定要删除这条领料记录吗？</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 bg-gray-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认弹窗 */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                批量删除确认
              </h3>
              <button onClick={() => setShowBatchDeleteConfirm(false)} className="text-white hover:bg-red-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">警告：批量删除领料记录将造成严重后果！</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在删除 <strong>{selectedRows.length}</strong> 项领料记录
                  </p>
                  <ul className="text-sm text-red-500 mt-2 space-y-1">
                    <li>• 此操作将删除所有选中的领料记录</li>
                    <li>• 相关物料明细也将被删除</li>
                    <li>• 历史数据将无法恢复</li>
                    <li>• 可能导致库存数据错乱</li>
                  </ul>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                此操作不可撤销！请确认是否继续删除？
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowBatchDeleteConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Batch deleting records:', selectedRows);
                    setShowBatchDeleteConfirm(false);
                    setSelectedRows([]);
                    setBatchEditMode(false);
                    alert(`已删除 ${selectedRows.length} 项领料记录`);
                  }}
                  className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量编辑弹窗 */}
      {showBatchEditModal && (() => {
        const selectedRecordsList = materialReceivingDetails.filter(r => selectedRows.includes(r.id));
        const currentRecordId = selectedRows[currentBatchEditIndex];
        const currentRecord = selectedRecordsList.find(r => r.id === currentRecordId);
        const currentEditedData = batchEditedRecords[currentRecordId] || currentRecord || {};
        const editedCount = Object.keys(batchEditedRecords).length;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
                <h3 className="text-lg font-semibold text-white">批量编辑领料记录</h3>
                <button onClick={() => { setShowBatchEditModal(false); setBatchEditedRecords({}); setCurrentBatchEditIndex(0); }} className="text-white hover:bg-blue-700 p-1 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">已选择 <strong>{selectedRows.length}</strong> 条领料记录进行批量编辑，已编辑 <strong>{editedCount}</strong> 条</p>
                </div>

                {/* 领料单选择下拉 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-1">选择领料单</label>
                  <select
                    value={currentRecordId || ''}
                    onChange={(e) => {
                      const idx = selectedRows.indexOf(Number(e.target.value));
                      setCurrentBatchEditIndex(idx >= 0 ? idx : 0);
                    }}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    {selectedRecordsList.map((record, idx) => (
                      <option key={record.id} value={record.id}>
                        {record.code} ({record.applicant}) {batchEditedRecords[record.id] ? '✓ 已编辑' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 编辑表单 */}
                <div className="grid grid-cols-2 gap-4">
                  {/* 领料单号 - 只读 */}
                  <div className="bg-gray-100 rounded-lg p-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">领料单号</label>
                    <div className="text-sm font-medium text-gray-900">{currentEditedData.code}</div>
                  </div>
                  {/* 日期 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">日期</label>
                    <input
                      type="date"
                      value={currentEditedData.date || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, date: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {/* 申领人 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">申领人</label>
                    <input
                      type="text"
                      value={currentEditedData.applicant || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, applicant: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {/* 仓库地点 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">仓库地点</label>
                    <select
                      value={currentEditedData.warehouseLocation || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, warehouseLocation: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="仓库A区">仓库A区</option>
                      <option value="仓库B区">仓库B区</option>
                      <option value="仓库C区">仓库C区</option>
                      <option value="仓库D区">仓库D区</option>
                      <option value="仓库E区">仓库E区</option>
                    </select>
                  </div>
                  {/* 生产批次号 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">生产批次号</label>
                    <input
                      type="text"
                      value={currentEditedData.productionBatchCode || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, productionBatchCode: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {/* 状态 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">状态</label>
                    <select
                      value={currentEditedData.status || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, status: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="待审批">待审批</option>
                      <option value="已审批">已审批</option>
                      <option value="已拒绝">已拒绝</option>
                      <option value="已取消">已取消</option>
                    </select>
                  </div>
                  {/* 审核人 */}
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">审核人</label>
                    <input
                      type="text"
                      value={currentEditedData.reviewer || ''}
                      onChange={(e) => setBatchEditedRecords({
                        ...batchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, reviewer: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* 物料明细表格 */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">物料明细</h4>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料编码</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">物料名称</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">规格</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">单位</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">申请数量</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">当前库存</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">单价(元)</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">小计(元)</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">仓库货位</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">备注</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(currentEditedData.materials || []).map((mat: any, idx: number) => {
                          const subtotal = (mat.requestedQuantity || 0) * (mat.unitPrice || 0);
                          const isStockWarning = (mat.requestedQuantity || 0) > (mat.stockQuantity || 0);
                          return (
                            <tr key={idx}>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={mat.materialCode || ''}
                                  onChange={(e) => {
                                    const newMaterials = [...(currentEditedData.materials || [])];
                                    newMaterials[idx] = { ...newMaterials[idx], materialCode: e.target.value };
                                    setBatchEditedRecords({
                                      ...batchEditedRecords,
                                      [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                    });
                                  }}
                                  className="w-24 h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={mat.materialName || ''}
                                  onChange={(e) => {
                                    const newMaterials = [...(currentEditedData.materials || [])];
                                    newMaterials[idx] = { ...newMaterials[idx], materialName: e.target.value };
                                    setBatchEditedRecords({
                                      ...batchEditedRecords,
                                      [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                    });
                                  }}
                                  className="w-24 h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={mat.spec || ''}
                                  onChange={(e) => {
                                    const newMaterials = [...(currentEditedData.materials || [])];
                                    newMaterials[idx] = { ...newMaterials[idx], spec: e.target.value };
                                    setBatchEditedRecords({
                                      ...batchEditedRecords,
                                      [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                    });
                                  }}
                                  className="w-20 h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={mat.unit || ''}
                                  onChange={(e) => {
                                    const newMaterials = [...(currentEditedData.materials || [])];
                                    newMaterials[idx] = { ...newMaterials[idx], unit: e.target.value };
                                    setBatchEditedRecords({
                                      ...batchEditedRecords,
                                      [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                    });
                                  }}
                                  className="w-12 h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={mat.requestedQuantity || 0}
                                  onChange={(e) => {
                                    const newMaterials = [...(currentEditedData.materials || [])];
                                    newMaterials[idx] = { ...newMaterials[idx], requestedQuantity: Number(e.target.value) };
                                    setBatchEditedRecords({
                                      ...batchEditedRecords,
                                      [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                    });
                                  }}
                                  className={`w-16 h-8 px-2 border border-gray-200 rounded text-right text-xs focus:outline-none focus:border-blue-500 ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={mat.stockQuantity || 0}
                                  onChange={(e) => {
                                    const newMaterials = [...(currentEditedData.materials || [])];
                                    newMaterials[idx] = { ...newMaterials[idx], stockQuantity: Number(e.target.value) };
                                    setBatchEditedRecords({
                                      ...batchEditedRecords,
                                      [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                    });
                                  }}
                                  className="w-16 h-8 px-2 border border-gray-200 rounded text-right text-xs focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={mat.unitPrice || 0}
                                  onChange={(e) => {
                                    const newMaterials = [...(currentEditedData.materials || [])];
                                    newMaterials[idx] = { ...newMaterials[idx], unitPrice: Number(e.target.value) };
                                    setBatchEditedRecords({
                                      ...batchEditedRecords,
                                      [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                    });
                                  }}
                                  className="w-16 h-8 px-2 border border-gray-200 rounded text-right text-xs focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-right text-xs text-blue-700 bg-gray-50">
                                {subtotal.toFixed(2)}
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={mat.warehousePosition || ''}
                                  onChange={(e) => {
                                    const newMaterials = [...(currentEditedData.materials || [])];
                                    newMaterials[idx] = { ...newMaterials[idx], warehousePosition: e.target.value };
                                    setBatchEditedRecords({
                                      ...batchEditedRecords,
                                      [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                    });
                                  }}
                                  className="w-24 h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={mat.remark || ''}
                                  onChange={(e) => {
                                    const newMaterials = [...(currentEditedData.materials || [])];
                                    newMaterials[idx] = { ...newMaterials[idx], remark: e.target.value };
                                    setBatchEditedRecords({
                                      ...batchEditedRecords,
                                      [currentRecordId]: { ...currentEditedData, materials: newMaterials }
                                    });
                                  }}
                                  className="w-24 h-8 px-2 border border-gray-200 rounded text-xs focus:outline-none focus:border-blue-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                        {(!currentEditedData.materials || currentEditedData.materials.length === 0) && (
                          <tr>
                            <td colSpan={10} className="px-3 py-4 text-center text-gray-500">暂无物料明细</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      const nextIndex = currentBatchEditIndex + 1;
                      if (nextIndex < selectedRows.length) {
                        setCurrentBatchEditIndex(nextIndex);
                      } else {
                        setCurrentBatchEditIndex(0);
                      }
                    }}
                    className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                  >
                    确认 {currentBatchEditIndex + 1 < selectedRows.length ? '(下一个)' : '(已最后一个)'}
                  </button>
                  <button
                    onClick={() => {
                      console.log('Saving all batch edits:', batchEditedRecords);
                      setShowBatchEditModal(false);
                      setBatchEditMode(false);
                      setSelectedRows([]);
                      setBatchEditedRecords({});
                      setCurrentBatchEditIndex(0);
                    }}
                    className="flex-1 h-10 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                  >
                    保存全部 ({editedCount} 个)
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 编辑提示弹窗 */}
      {showEditAlert && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Edit className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">无法编辑</h3>
                  <p className="text-sm text-gray-500">领料单状态限制</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-amber-800">
                  {editAlertMessage}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowEditAlert(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  知道了
                </button>
                <button
                  onClick={() => {
                    setShowEditAlert(false);
                    handleVoidApply();
                  }}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  前往作废申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 作废申请弹窗 */}
      {showVoidModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Trash2 className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">作废申请</h3>
                  <p className="text-sm text-gray-500">请填写作废原因</p>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-1">领料单号</label>
                <p className="font-mono text-gray-900">{selectedRecord?.code}</p>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  作废原因 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="请输入作废原因"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowVoidModal(false)}
                  className="px-4 py-2 bg-gray-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={submitVoidApply}
                  className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600"
                >
                  确认申请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 新增领料单弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-[66vw] mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">新增领料单</h3>
              <button onClick={handleCancelAdd} className="p-1 hover:bg-gray-100 rounded">
                <span className="text-2xl text-gray-400">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">领料单号</label>
                  <input
                    type="text"
                    value={addForm.code}
                    readOnly
                    placeholder="系统自动生成"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">申请日期</label>
                  <input
                    type="date"
                    value={addForm.date}
                    onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">申请人</label>
                  <input
                    type="text"
                    value={addForm.applicant}
                    onChange={(e) => setAddForm({ ...addForm, applicant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">部门</label>
                  <select
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择部门</option>
                    <option value="生产部">生产部</option>
                    <option value="后勤部">后勤部</option>
                    <option value="设备部">设备部</option>
                    <option value="技术部">技术部</option>
                    <option value="采后处理部">采后处理部</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
                  <select
                    value={addForm.warehouseLocation}
                    onChange={(e) => setAddForm({ ...addForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="仓库A区">仓库A区</option>
                    <option value="仓库B区">仓库B区</option>
                    <option value="仓库C区">仓库C区</option>
                    <option value="仓库D区">仓库D区</option>
                    <option value="仓库E区">仓库E区</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">种植区域/用途</label>
                  <input
                    type="text"
                    value={addForm.plantArea}
                    onChange={(e) => setAddForm({ ...addForm, plantArea: e.target.value })}
                    placeholder="如：1号棚-叶菜区"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">审核人</label>
                  <select
                    value={addForm.reviewer}
                    onChange={(e) => setAddForm({ ...addForm, reviewer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="王经理">王经理</option>
                    <option value="李经理">李经理</option>
                    <option value="张经理">张经理</option>
                    <option value="陈经理">陈经理</option>
                    <option value="赵经理">赵经理</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
                  <input
                    type="text"
                    value={addForm.productionBatchCode}
                    onChange={(e) => setAddForm({ ...addForm, productionBatchCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* 物料明细 */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">物料明细</label>
                  <button
                    onClick={handleAddMaterial}
                    className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加物料
                  </button>
                </div>
                {addForm.materials.length > 0 ? (
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">申领数量</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">当前库存</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">单价(元)</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">小计(元)</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">仓库货位</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600">备注</th>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-600 w-12">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {addForm.materials.map((material, idx) => {
                        const subtotal = material.requestedQuantity * (material.unitPrice || 0);
                        const isStockWarning = material.requestedQuantity > (material.stockQuantity || 0);
                        return (
                          <tr key={idx}>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.materialCode}
                                onChange={(e) => handleMaterialChange(idx, 'materialCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.materialName}
                                onChange={(e) => handleMaterialChange(idx, 'materialName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.spec}
                                onChange={(e) => handleMaterialChange(idx, 'spec', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.unit}
                                onChange={(e) => handleMaterialChange(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.requestedQuantity}
                                onChange={(e) => handleMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                                className={`w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 ${isStockWarning ? 'border-red-500 text-red-600' : ''}`}
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.stockQuantity || ''}
                                onChange={(e) => handleMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="number"
                                value={material.unitPrice || ''}
                                onChange={(e) => handleMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2 text-sm text-blue-700 bg-gray-50">
                              {subtotal.toFixed(2)}
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.warehousePosition || ''}
                                onChange={(e) => handleMaterialChange(idx, 'warehousePosition', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <input
                                type="text"
                                value={material.remark}
                                onChange={(e) => handleMaterialChange(idx, 'remark', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-2">
                              <button
                                onClick={() => handleRemoveMaterial(idx)}
                                className="p-1 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-500 italic border border-gray-200 rounded-lg p-4 text-center">
                    暂无物料明细，请点击"添加物料"按钮添加
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleCancelAdd}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleSaveAdd}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出文件类型选择弹窗 */}
      {showExportTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">选择导出文件类型</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportType"
                    value="xlsx"
                    checked={exportFileType === 'xlsx'}
                    onChange={(e) => setExportFileType(e.target.value)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">Excel 文件 (.xlsx)</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportType"
                    value="csv"
                    checked={exportFileType === 'csv'}
                    onChange={(e) => setExportFileType(e.target.value)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">CSV 文件 (.csv)</span>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="exportType"
                    value="word"
                    checked={exportFileType === 'word'}
                    onChange={(e) => setExportFileType(e.target.value)}
                    className="w-4 h-4 text-emerald-600"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">Word 文件 (.doc)</span>
                  </div>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setShowExportTypeModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={confirmExport}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* 领料出库 Tab内容 */}
      <div className={activeTab === 'execute' ? '' : 'hidden'}>
      {/* 搜索区域 */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">出库单号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索出库单号..."
                value={executeSearchCode}
                onChange={(e) => { setExecuteSearchCode(e.target.value); setExecuteCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">申领人</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索申领人..."
                value={executeSearchApplicant}
                onChange={(e) => { setExecuteSearchApplicant(e.target.value); setExecuteCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="搜索生产计划批次号..."
                value={executeSearchBatchCode}
                onChange={(e) => { setExecuteSearchBatchCode(e.target.value); setExecuteCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
            <select
              value={executeSearchWarehouse}
              onChange={(e) => { setExecuteSearchWarehouse(e.target.value); setExecuteCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="">全部</option>
              <option value="仓库A区">仓库A区</option>
              <option value="仓库B区">仓库B区</option>
              <option value="仓库C区">仓库C区</option>
              <option value="仓库D区">仓库D区</option>
              <option value="仓库E区">仓库E区</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-1">执行状态</label>
            <select
              value={executeStatusFilter}
              onChange={(e) => { setExecuteStatusFilter(e.target.value); setExecuteCurrentPage(1); }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            >
              <option value="all">全部状态</option>
              <option value="待出库">待出库</option>
              <option value="部分出库">部分出库</option>
              <option value="已出库">已出库</option>
              <option value="已取消">已取消</option>
            </select>
          </div>
          <button
            onClick={handleExecuteReset}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
          >
            重置
          </button>
        </div>
      </div>

      {/* 数据表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">出库单列表</h3>
          {executeExportMode ? (
            <div className="flex gap-2">
              <button
                onClick={handleExecuteExportClick}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button onClick={handleExecuteCancelExport} className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
                取消
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleExecuteAdd}
                className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                新增
              </button>
              {!executeBatchEditMode && (
                <>
                  <button
                    onClick={() => { setExecuteBatchEditMode(true); setExecuteShowEditWarning(true); }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Edit className="w-4 h-4" />
                    编辑
                  </button>
                  <button
                    onClick={() => { setExecuteBatchEditMode(true); setExecuteShowDeleteWarning(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    删除
                  </button>
                </>
              )}
              {executeBatchEditMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (executeSelectedRows.length === 0) {
                        alert('请先选择要编辑的记录');
                        setExecuteBatchEditMode(false);
                      } else {
                        setExecuteShowBatchEditModal(true);
                      }
                    }}
                    className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    确认编辑
                  </button>
                  <button
                    onClick={() => { setExecuteShowBatchDeleteConfirm(true); }}
                    className="h-8 px-3 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                  >
                    确认删除
                  </button>
                  <button
                    onClick={() => { setExecuteBatchEditMode(false); setExecuteSelectedRows([]); }}
                    className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
                  >
                    取消
                  </button>
                </div>
              )}
              {!executeBatchEditMode && (
                <button
                  onClick={() => setExecuteExportMode(true)}
                  className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {(executeExportMode || executeBatchEditMode) && (
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                    <input
                      type="checkbox"
                      checked={executeSelectedRows.length === executeFilteredData.length && executeFilteredData.length > 0}
                      onChange={handleExecuteSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-8"></th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">出库单号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请日期</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">申请人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">库存地点</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">审核人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作人</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">生产计划批次号</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">执行状态</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-400">
              {executeFilteredData.slice((executeCurrentPage - 1) * executePageSize, executeCurrentPage * executePageSize).map((item) => (
                <>
                  <tr key={item.id} className="hover:bg-gray-50">
                    {(executeExportMode || executeBatchEditMode) && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={executeSelectedRows.includes(item.id)}
                          onChange={() => handleExecuteSelectRow(item.id)}
                          className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleExecuteExpandRow(item.id)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        {executeExpandedRows.has(item.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600 cursor-pointer hover:text-blue-700" onClick={() => handleExecuteView(item)}>{item.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.applicant}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.warehouseLocation}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.reviewer}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.operator}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{item.productionBatchCode}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        item.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
                        item.executeStatusClass === 'pending_out' ? 'bg-amber-100 text-amber-700' :
                        item.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                        item.executeStatusClass === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.executeStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleExecuteView(item)}
                          className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="查看"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {executeExpandedRows.has(item.id) && (
                    <tr key={`${item.id}-expanded`} className="bg-white">
                      <td colSpan={(executeExportMode || executeBatchEditMode) ? 14 : 13} className="px-4 py-3">
                        <div className="text-sm">
                          <div className="font-medium text-blue-800 mb-2">物料明细</div>
                          {item.materials.length > 0 ? (
                            <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                              <thead className="bg-[#F2F6FA]">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">来源领料单号</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">物料编码</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">物料名称</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">规格</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">单位</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">申请数量</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">实际库存</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">本次实发</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">单价(元)</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">小计(元)</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">仓库货位</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">差异</th>
                                  <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">备注</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-200">
                                {item.materials.map((material, idx) => {
                                  const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                                  const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                                  return (
                                    <tr key={idx} className={`hover:bg-[#F2F6FA]/50 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.applicationCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.materialCode}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.requestedQuantity}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">
                                        <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                                          {material.stockQuantity}
                                        </span>
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">
                                        {material.actualQuantity > 0 ? (
                                          <span className={material.actualQuantity < material.requestedQuantity ? 'text-amber-600 font-medium' : 'text-green-600'}>
                                            {material.actualQuantity}
                                          </span>
                                        ) : (
                                          <span className={material.stockQuantity === 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                                            {material.actualQuantity}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{(material.unitPrice || 0).toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{subtotal.toFixed(2)}</td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.warehousePosition || '-'}</td>
                                      <td className="px-3 py-2 text-sm">
                                        {material.requestedQuantity - material.actualQuantity > 0 ? (
                                          <span className="text-red-600 font-medium">-{material.requestedQuantity - material.actualQuantity}</span>
                                        ) : (
                                          <span className="text-green-600">0</span>
                                        )}
                                      </td>
                                      <td className="px-3 py-2 text-sm text-blue-800">{material.remark}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          ) : (
                            <div className="text-blue-800 text-center py-4">暂无物料明细</div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* 导出模式底部 */}
        {executeExportMode && executeSelectedRows.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <button
                onClick={handleExecuteSelectAll}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {executeSelectedRows.length === executeFilteredData.length ? '全不选' : '全选'}
              </button>
              <span className="text-sm text-gray-500">已选择 {executeSelectedRows.length} 项</span>
            </div>
          </div>
        )}

        {/* 分页 */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={executePageSize}
              onChange={(e) => { setExecutePageSize(Number(e.target.value)); setExecuteCurrentPage(1); }}
              className="px-2 py-1 border border-gray-200 rounded text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span className="text-sm text-gray-500">条</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">共 {executeFilteredData.length} 条</span>
            <button
              onClick={() => setExecuteCurrentPage(Math.max(1, executeCurrentPage - 1))}
              disabled={executeCurrentPage === 1}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm">{executeCurrentPage} / {executeTotalPages || 1}</span>
            <button
              onClick={() => setExecuteCurrentPage(Math.min(executeTotalPages, executeCurrentPage + 1))}
              disabled={executeCurrentPage >= executeTotalPages}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 查看详情弹窗 */}
      {executeShowDetailModal && executeSelectedRecord && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">出库单详情</h3>
              <button onClick={() => setExecuteShowDetailModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <span className="text-2xl text-gray-400">&times;</span>
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">出库单号</label>
                  <p className="font-mono font-semibold text-gray-900">{executeSelectedRecord.code}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">关联领料单号</label>
                  <p className="font-mono font-semibold text-gray-900">{executeSelectedRecord.sourceApplicationCodes?.join(', ')}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">申请日期</label>
                  <p className="font-semibold text-gray-900">{executeSelectedRecord.date}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">申请人</label>
                  <p className="font-semibold text-gray-900">{executeSelectedRecord.applicant}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">库存地点</label>
                  <p className="font-semibold text-gray-900">{executeSelectedRecord.warehouseLocation}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">审核人</label>
                  <p className="font-semibold text-gray-900">{executeSelectedRecord.reviewer}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">操作人</label>
                  <p className="font-semibold text-gray-900">{executeSelectedRecord.operator}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">生产计划批次号</label>
                  <p className="font-semibold text-gray-900">{executeSelectedRecord.productionBatchCode}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">执行状态</label>
                  <p className="font-semibold">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      executeSelectedRecord.executeStatusClass === 'completed' ? 'bg-green-100 text-green-700' :
                      executeSelectedRecord.executeStatusClass === 'pending_out' ? 'bg-amber-100 text-amber-700' :
                      executeSelectedRecord.executeStatusClass === 'partial' ? 'bg-blue-100 text-blue-700' :
                      executeSelectedRecord.executeStatusClass === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {executeSelectedRecord.executeStatus}
                    </span>
                  </p>
                </div>
              </div>
              {executeSelectedRecord.materials.length > 0 && (
                <div className="mt-6">
                  <label className="text-sm text-gray-500 block mb-2">物料明细</label>
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-emerald-100">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">来源领料单号</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">申请数量</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">实际库存</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">本次实发</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单价(元)</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">小计(元)</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">仓库货位</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">备注</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {executeSelectedRecord.materials.map((material: ExecuteMaterialItem, idx: number) => {
                        const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                        const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                        return (
                          <tr key={idx} className={`hover:bg-emerald-100 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                            <td className="px-3 py-2 text-sm text-blue-700 font-mono">{material.applicationCode}</td>
                            <td className="px-3 py-2 text-sm text-blue-700 font-mono">{material.materialCode}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.materialName}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.spec}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.unit}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.requestedQuantity}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">
                              <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                                {material.stockQuantity}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-blue-700">
                              {material.actualQuantity > 0 ? (
                                <span className={material.actualQuantity < material.requestedQuantity ? 'text-amber-600 font-medium' : 'text-green-600'}>
                                  {material.actualQuantity}
                                </span>
                              ) : (
                                <span className={material.stockQuantity === 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                                  {material.actualQuantity}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-sm text-blue-700">{(material.unitPrice || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{subtotal.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.warehousePosition || '-'}</td>
                            <td className="px-3 py-2 text-sm text-blue-700">{material.remark}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setExecuteShowDetailModal(false)}
                className="px-4 py-2 bg-gray-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 新增弹窗 */}
      {executeShowAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-emerald-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">新增领料出库单</h3>
              <button onClick={() => setExecuteShowAddModal(false)} className="text-white hover:bg-emerald-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">出库单号</label>
                  <div className="text-sm font-medium text-gray-900">{executeAddForm.code || '系统自动生成'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">关联领料单号</label>
                  <select
                    value={executeSelectedApplicationCode}
                    onChange={(e) => {
                      setExecuteSelectedApplicationCode(e.target.value);
                      setExecuteSelectedMaterialIndices(new Set());
                      setExecuteMaterialActualQuantities({});
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">请选择领料单</option>
                    {materialReceivingDetails
                      .filter(app => app.status === '已审批' && app.materials.length > 0)
                      .map(app => (
                        <option key={app.id} value={app.code}>
                          {app.code} - {app.applicant}
                        </option>
                      ))
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请日期</label>
                  <input
                    type="date"
                    value={executeAddForm.date}
                    onChange={(e) => setExecuteAddForm({ ...executeAddForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">库存地点</label>
                  <select
                    value={executeAddForm.warehouseLocation}
                    onChange={(e) => setExecuteAddForm({ ...executeAddForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="仓库A区">仓库A区</option>
                    <option value="仓库B区">仓库B区</option>
                    <option value="仓库C区">仓库C区</option>
                    <option value="仓库D区">仓库D区</option>
                    <option value="仓库E区">仓库E区</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">操作人</label>
                  <input
                    type="text"
                    value={executeAddForm.reviewer}
                    onChange={(e) => setExecuteAddForm({ ...executeAddForm, reviewer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {executeSelectedApplicationCode && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">选择物料（勾选要出库的物料并填写实发数量）</label>
                    <button
                      onClick={handleAddToMaterialPool}
                      disabled={executeSelectedMaterialIndices.size === 0}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      添加到物料池 ({executeSelectedMaterialIndices.size})
                    </button>
                  </div>
                  {(() => {
                    const selectedApp = materialReceivingDetails.find(app => app.code === executeSelectedApplicationCode);
                    if (!selectedApp) return null;
                    return (
                      <table className="w-full border border-gray-200 rounded-lg overflow-hidden mt-2">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-10">选择</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">申请数量</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">当前库存</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单价(元)</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">仓库货位</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">实发数量</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {selectedApp.materials.map((material, idx) => (
                            <tr key={idx} className={executeSelectedMaterialIndices.has(idx) ? 'bg-emerald-50' : ''}>
                              <td className="px-3 py-2">
                                <input
                                  type="checkbox"
                                  checked={executeSelectedMaterialIndices.has(idx)}
                                  onChange={(e) => {
                                    const newSelected = new Set(executeSelectedMaterialIndices);
                                    if (e.target.checked) {
                                      newSelected.add(idx);
                                      setExecuteMaterialActualQuantities({
                                        ...executeMaterialActualQuantities,
                                        [idx]: material.requestedQuantity
                                      });
                                    } else {
                                      newSelected.delete(idx);
                                      const newQuantities = { ...executeMaterialActualQuantities };
                                      delete newQuantities[idx];
                                      setExecuteMaterialActualQuantities(newQuantities);
                                    }
                                    setExecuteSelectedMaterialIndices(newSelected);
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-sm text-gray-600 font-mono">{material.materialCode}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.materialName}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.spec}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.unit}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.requestedQuantity}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.stockQuantity}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{(material.unitPrice || 0).toFixed(2)}</td>
                              <td className="px-3 py-2 text-sm text-gray-600">{material.warehousePosition || '-'}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min="0"
                                  max={material.requestedQuantity}
                                  value={executeMaterialActualQuantities[idx] ?? material.requestedQuantity}
                                  onChange={(e) => {
                                    setExecuteMaterialActualQuantities({
                                      ...executeMaterialActualQuantities,
                                      [idx]: Number(e.target.value)
                                    });
                                  }}
                                  disabled={!executeSelectedMaterialIndices.has(idx)}
                                  className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    );
                  })()}
                </div>
              )}

              {executeMaterialPool.length > 0 && (
                <div className="mt-6">
                  <label className="text-sm font-medium text-gray-700 mb-2">物料池（可修改实发数量或移除）</label>
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden mt-2">
                    <thead className="bg-emerald-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 w-16">操作</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">来源领料单号</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">申请数量</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单价(元)</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">小计(元)</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">仓库货位</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">本次实发</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {executeMaterialPool.map((material, idx) => {
                        const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                        const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                        return (
                          <tr key={idx} className={isQuantityDifferent ? 'bg-amber-50' : ''}>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => handleRemoveFromMaterialPool(idx)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                移除
                              </button>
                            </td>
                            <td className="px-3 py-2 text-sm text-blue-700 font-mono">{material.applicationCode}</td>
                            <td className="px-3 py-2 text-sm text-gray-600 font-mono">{material.materialCode}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{material.materialName}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{material.spec}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{material.unit}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{material.requestedQuantity}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{(material.unitPrice || 0).toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{subtotal.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-gray-600">{material.warehousePosition || '-'}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min="0"
                                max={material.requestedQuantity}
                                value={material.actualQuantity}
                                onChange={(e) => handleUpdateMaterialPoolQuantity(idx, Number(e.target.value))}
                                className={`w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleExecuteCancelAdd}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleExecuteSaveAdd}
                disabled={executeMaterialPool.length === 0}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑弹窗 */}
      {executeShowEditModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
              <h3 className="text-lg font-semibold text-white">编辑领料出库单</h3>
              <button onClick={() => setExecuteShowEditModal(false)} className="text-white hover:bg-blue-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-100 rounded-lg p-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">领料单号</label>
                  <div className="text-sm font-medium text-gray-900">{executeSelectedRecord?.code}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请日期</label>
                  <input
                    type="date"
                    value={executeEditForm.date}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">申请人</label>
                  <input
                    type="text"
                    value={executeEditForm.applicant}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, applicant: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">库存地点</label>
                  <select
                    value={executeEditForm.warehouseLocation}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, warehouseLocation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="仓库A区">仓库A区</option>
                    <option value="仓库B区">仓库B区</option>
                    <option value="仓库C区">仓库C区</option>
                    <option value="仓库D区">仓库D区</option>
                    <option value="仓库E区">仓库E区</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">审核人</label>
                  <input
                    type="text"
                    value={executeEditForm.reviewer}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, reviewer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">生产计划批次号</label>
                  <input
                    type="text"
                    value={executeEditForm.productionBatchCode}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, productionBatchCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-blue-700 mb-1">执行状态</label>
                  <select
                    value={executeEditForm.executeStatus}
                    onChange={(e) => setExecuteEditForm({ ...executeEditForm, executeStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="待出库">待出库</option>
                    <option value="部分出库">部分出库</option>
                    <option value="已出库">已出库</option>
                    <option value="已取消">已取消</option>
                  </select>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">物料明细</label>
                  <button
                    onClick={handleExecuteEditAddMaterial}
                    className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加物料
                  </button>
                </div>
                {executeEditForm.materials.length > 0 && (
                  <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">来源领料单号</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料编码</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">物料名称</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">规格</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单位</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">申请数量</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">实际库存</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">本次实发</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">单价(元)</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">小计(元)</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">仓库货位</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">备注</th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {executeEditForm.materials.map((material, idx) => {
                        const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                        const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                        return (
                          <tr key={idx} className={isQuantityDifferent ? 'bg-amber-50' : ''}>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.applicationCode || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'applicationCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm font-mono bg-gray-50"
                                readOnly
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.materialCode}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'materialCode', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.materialName}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'materialName', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.spec}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'spec', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.unit}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'unit', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={material.requestedQuantity}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'requestedQuantity', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={material.stockQuantity}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'stockQuantity', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={material.actualQuantity}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'actualQuantity', Number(e.target.value))}
                                className={`w-full px-2 py-1 border border-gray-200 rounded text-sm ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={material.unitPrice || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm text-blue-700 bg-gray-50">
                              {subtotal.toFixed(2)}
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.warehousePosition || ''}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'warehousePosition', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="text"
                                value={material.remark}
                                onChange={(e) => handleExecuteEditMaterialChange(idx, 'remark', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-200 rounded text-sm"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <button
                                onClick={() => handleExecuteEditRemoveMaterial(idx)}
                                className="text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={handleExecuteCancelEdit}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={handleExecuteSaveEdit}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {executeShowDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">确认删除</h3>
              <p className="text-gray-500">确定要删除这条领料出库记录吗？此操作不可撤销。</p>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setExecuteShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={confirmExecuteDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 导出类型选择弹窗 */}
      {executeShowExportTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">选择导出格式</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="exportFileType"
                    value="xlsx"
                    checked={executeExportFileType === 'xlsx'}
                    onChange={(e) => setExecuteExportFileType(e.target.value)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Excel (.xlsx)</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="exportFileType"
                    value="csv"
                    checked={executeExportFileType === 'csv'}
                    onChange={(e) => setExecuteExportFileType(e.target.value)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">CSV (.csv)</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="exportFileType"
                    value="word"
                    checked={executeExportFileType === 'word'}
                    onChange={(e) => setExecuteExportFileType(e.target.value)}
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">Word (.doc)</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setExecuteShowExportTypeModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={confirmExecuteExport}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                确认导出
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑警告弹窗 */}
      {executeShowEditWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">批量编辑警告</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mb-6">
              <p>编辑后可能存在以下问题：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>该领料单的历史记录可能无法追溯</li>
                <li>已生成的出库单据数据可能不一致</li>
                <li>相关的统计报表数据可能需要重新核算</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setExecuteShowEditWarning(false); setExecuteBatchEditMode(false); setExecuteSelectedRows([]); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => { setExecuteShowEditWarning(false); }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 删除警告弹窗 */}
      {executeShowDeleteWarning && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-96 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">批量删除警告</h3>
            </div>
            <div className="text-sm text-gray-600 space-y-2 mb-6">
              <p>删除后可能存在以下问题：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>所有选中的领料出库单将被永久删除</li>
                <li>相关的物料明细也将被删除</li>
                <li>历史数据将无法恢复</li>
              </ul>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setExecuteShowDeleteWarning(false); setExecuteBatchEditMode(false); setExecuteSelectedRows([]); }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => { setExecuteShowDeleteWarning(false); }}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认弹窗 */}
      {executeShowBatchDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-red-600">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                批量删除确认
              </h3>
              <button onClick={() => setExecuteShowBatchDeleteConfirm(false)} className="text-white hover:bg-red-700 p-1 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">警告：批量删除领料出库记录将造成严重后果！</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    您正在删除 <strong>{executeSelectedRows.length}</strong> 项领料出库记录
                  </p>
                  <ul className="text-sm text-red-500 mt-2 space-y-1">
                    <li>• 此操作将删除所有选中的领料出库记录</li>
                    <li>• 相关物料明细也将被删除</li>
                    <li>• 历史数据将无法恢复</li>
                    <li>• 可能导致库存数据错乱</li>
                  </ul>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                此操作不可撤销！请确认是否继续删除？
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setExecuteShowBatchDeleteConfirm(false)}
                  className="flex-1 h-10 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Batch deleting records:', executeSelectedRows);
                    setExecuteShowBatchDeleteConfirm(false);
                    setExecuteSelectedRows([]);
                    setExecuteBatchEditMode(false);
                    alert(`已删除 ${executeSelectedRows.length} 项领料出库记录`);
                  }}
                  className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量编辑弹窗 */}
      {executeShowBatchEditModal && (() => {
        const selectedRecordsList = materialExecuteDetails.filter(r => executeSelectedRows.includes(r.id));
        const currentRecordId = executeSelectedRows[executeCurrentBatchEditIndex];
        const currentRecord = selectedRecordsList.find(r => r.id === currentRecordId);
        const currentEditedData = executeBatchEditedRecords[currentRecordId] || currentRecord || {};
        const editedCount = Object.keys(executeBatchEditedRecords).length;

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-blue-600 sticky top-0">
                <h3 className="text-lg font-semibold text-white">批量编辑领料出库记录</h3>
                <button onClick={() => { setExecuteShowBatchEditModal(false); setExecuteBatchEditedRecords({}); setExecuteCurrentBatchEditIndex(0); }} className="text-white hover:bg-blue-700 p-1 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">已选择 <strong>{executeSelectedRows.length}</strong> 条领料出库记录进行批量编辑，已编辑 <strong>{editedCount}</strong> 条</p>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-1">选择领料单</label>
                  <select
                    value={currentRecordId || ''}
                    onChange={(e) => {
                      const idx = executeSelectedRows.indexOf(Number(e.target.value));
                      setExecuteCurrentBatchEditIndex(idx >= 0 ? idx : 0);
                    }}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    {selectedRecordsList.map((record, idx) => (
                      <option key={record.id} value={record.id}>
                        {record.code} ({record.applicant}) {executeBatchEditedRecords[record.id] ? '✓ 已编辑' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-100 rounded-lg p-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">领料单号</label>
                    <div className="text-sm font-medium text-gray-900">{currentEditedData.code}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">日期</label>
                    <input
                      type="date"
                      value={currentEditedData.date || ''}
                      onChange={(e) => setExecuteBatchEditedRecords({
                        ...executeBatchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, date: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">申请人</label>
                    <input
                      type="text"
                      value={currentEditedData.applicant || ''}
                      onChange={(e) => setExecuteBatchEditedRecords({
                        ...executeBatchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, applicant: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">仓库地点</label>
                    <select
                      value={currentEditedData.warehouseLocation || ''}
                      onChange={(e) => setExecuteBatchEditedRecords({
                        ...executeBatchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, warehouseLocation: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="仓库A区">仓库A区</option>
                      <option value="仓库B区">仓库B区</option>
                      <option value="仓库C区">仓库C区</option>
                      <option value="仓库D区">仓库D区</option>
                      <option value="仓库E区">仓库E区</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">生产批次号</label>
                    <input
                      type="text"
                      value={currentEditedData.productionBatchCode || ''}
                      onChange={(e) => setExecuteBatchEditedRecords({
                        ...executeBatchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, productionBatchCode: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">执行状态</label>
                    <select
                      value={currentEditedData.executeStatus || ''}
                      onChange={(e) => setExecuteBatchEditedRecords({
                        ...executeBatchEditedRecords,
                        [currentRecordId]: { ...currentEditedData, executeStatus: e.target.value }
                      })}
                      className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    >
                      <option value="">请选择</option>
                      <option value="待出库">待出库</option>
                      <option value="部分出库">部分出库</option>
                      <option value="已出库">已出库</option>
                      <option value="已取消">已取消</option>
                    </select>
                  </div>
                </div>

                {currentEditedData.materials && currentEditedData.materials.length > 0 && (
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">物料明细</label>
                    <table className="w-full border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-blue-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">物料编码</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">来源领料单号</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">物料名称</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">规格</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">单位</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">申请数量</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">实际库存</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">本次实发</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">单价(元)</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">仓库货位</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-blue-800">备注</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {currentEditedData.materials.map((material: any, idx: number) => {
                          const subtotal = (material.requestedQuantity || 0) * (material.unitPrice || 0);
                          const isQuantityDifferent = material.actualQuantity < material.requestedQuantity;
                          return (
                            <tr key={idx} className={`hover:bg-blue-50 ${isQuantityDifferent ? 'bg-amber-50' : ''}`}>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={material.materialCode || ''}
                                  onChange={(e) => handleExecuteBatchMaterialChange(idx, 'materialCode', e.target.value)}
                                  className="w-full h-8 px-2 border border-gray-200 rounded text-sm font-mono focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-sm text-blue-800 font-mono">{material.applicationCode}</td>
                              <td className="px-3 py-2 text-sm text-blue-800">{material.materialName}</td>
                              <td className="px-3 py-2 text-sm text-blue-800">{material.spec}</td>
                              <td className="px-3 py-2 text-sm text-blue-800">{material.unit}</td>
                              <td className="px-3 py-2 text-sm text-blue-800">{material.requestedQuantity}</td>
                              <td className="px-3 py-2 text-sm">
                                <span className={material.stockQuantity < material.requestedQuantity ? 'text-red-600 font-medium' : 'text-green-600'}>
                                  {material.stockQuantity}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-sm">
                                <input
                                  type="number"
                                  value={material.actualQuantity}
                                  onChange={(e) => handleExecuteBatchMaterialChange(idx, 'actualQuantity', Number(e.target.value))}
                                  className={`w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500 ${isQuantityDifferent ? 'border-amber-500 text-amber-600' : ''}`}
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  value={material.unitPrice || ''}
                                  onChange={(e) => handleExecuteBatchMaterialChange(idx, 'unitPrice', Number(e.target.value))}
                                  className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={material.warehousePosition || ''}
                                  onChange={(e) => handleExecuteBatchMaterialChange(idx, 'warehousePosition', e.target.value)}
                                  className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                />
                              </td>
                              <td className="px-3 py-2">
                                <input
                                  type="text"
                                  value={material.remark || ''}
                                  onChange={(e) => handleExecuteBatchMaterialChange(idx, 'remark', e.target.value)}
                                  className="w-full h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-blue-500"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      if (executeCurrentBatchEditIndex > 0) {
                        setExecuteCurrentBatchEditIndex(executeCurrentBatchEditIndex - 1);
                      }
                    }}
                    disabled={executeCurrentBatchEditIndex === 0}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                  >
                    上一条
                  </button>
                  <button
                    onClick={() => {
                      if (executeCurrentBatchEditIndex < executeSelectedRows.length - 1) {
                        setExecuteCurrentBatchEditIndex(executeCurrentBatchEditIndex + 1);
                      }
                    }}
                    disabled={executeCurrentBatchEditIndex >= executeSelectedRows.length - 1}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
                  >
                    下一条
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                <button
                  onClick={() => { setExecuteShowBatchEditModal(false); setExecuteBatchEditedRecords({}); setExecuteCurrentBatchEditIndex(0); setExecuteBatchEditMode(false); setExecuteSelectedRows([]); }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    console.log('Batch edited records:', executeBatchEditedRecords);
                    setExecuteShowBatchEditModal(false);
                    setExecuteBatchEditedRecords({});
                    setExecuteCurrentBatchEditIndex(0);
                    setExecuteBatchEditMode(false);
                    setExecuteSelectedRows([]);
                    alert('批量编辑成功');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  保存全部
                </button>
              </div>
            </div>
          </div>
        );
      })()}
      </div>

      {/* 领料统计 Tab内容 */}
      <div className={activeTab === 'statistics' ? '' : 'hidden'}>
        {/* Tab切换 - 主Tab */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="border-b border-gray-100">
            <div className="flex items-center gap-1 p-2">
              <button
                onClick={() => { setStatActiveTab('monthly'); setStatCurrentPage(1); }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  statActiveTab === 'monthly'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                📅 月度汇总
              </button>
              <button
                onClick={() => { setStatActiveTab('material'); setStatCurrentPage(1); }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  statActiveTab === 'material'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                📦 物料汇总
              </button>
              <button
                onClick={() => { setStatActiveTab('department'); setStatCurrentPage(1); }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  statActiveTab === 'department'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                👤 部门汇总
              </button>
              <button
                onClick={() => { setStatActiveTab('area'); setStatCurrentPage(1); }}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  statActiveTab === 'area'
                    ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                🏠 区域统计
              </button>
            </div>
          </div>

          {/* 区域统计子Tab */}
          {statActiveTab === 'area' && (
            <div className="border-b border-gray-100 bg-gray-50/50">
              <div className="flex items-center gap-1 p-2">
                <button
                  onClick={() => { setStatActiveAreaTab('greenhouse'); setStatCurrentPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statActiveAreaTab === 'greenhouse'
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  🏠 大棚统计
                </button>
                <button
                  onClick={() => { setStatActiveAreaTab('field'); setStatCurrentPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statActiveAreaTab === 'field'
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  🌾 大田统计
                </button>
                <button
                  onClick={() => { setStatActiveAreaTab('batch'); setStatCurrentPage(1); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    statActiveAreaTab === 'batch'
                      ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  🌱 种植批次统计
                </button>
              </div>
            </div>
          )}

          <div className="p-6">
            {/* 统计卡片区域 */}
            <div className="grid grid-cols-5 gap-4 mb-6">
              {/* 卡片1: 领料单数 */}
              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-4 border border-emerald-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
                    <ClipboardList className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-emerald-600 bg-emerald-200/50 px-2 py-1 rounded-full">本月</span>
                </div>
                <div className="text-2xl font-bold text-emerald-700 mb-1">{getStatSummaryData().requisitionCount}</div>
                <div className="text-xs text-emerald-600/70">领料单数</div>
              </div>

              {/* 卡片2: 领料总量 */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-4 border border-blue-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center shadow-md shadow-blue-500/30">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-blue-600 bg-blue-200/50 px-2 py-1 rounded-full">累计</span>
                </div>
                <div className="text-2xl font-bold text-blue-700 mb-1">{getStatSummaryData().totalQuantity.toLocaleString()}</div>
                <div className="text-xs text-blue-600/70">领料总量</div>
              </div>

              {/* 卡片3: 总金额 */}
              <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-4 border border-amber-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center shadow-md shadow-amber-500/30">
                    <span className="text-lg font-bold">¥</span>
                  </div>
                  <span className="text-xs font-medium text-amber-600 bg-amber-200/50 px-2 py-1 rounded-full">元</span>
                </div>
                <div className="text-2xl font-bold text-amber-700 mb-1">¥{getStatSummaryData().totalAmount.toLocaleString()}</div>
                <div className="text-xs text-amber-600/70">总金额</div>
              </div>

              {/* 卡片4: 差异率 */}
              <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-4 border border-purple-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-md ${
                    getStatSummaryData().avgDifferenceRate < 0 
                      ? 'bg-green-500 shadow-green-500/30' 
                      : 'bg-red-500 shadow-red-500/30'
                  }`}>
                    <TrendingDown className={`w-5 h-5 text-white ${getStatSummaryData().avgDifferenceRate >= 0 ? 'transform rotate-180' : ''}`} />
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    getStatSummaryData().avgDifferenceRate < 0 
                      ? 'text-green-600 bg-green-200/50' 
                      : 'text-red-600 bg-red-200/50'
                  }`}>
                    {getStatSummaryData().avgDifferenceRate < 0 ? '正常' : '异常'}
                  </span>
                </div>
                <div className={`text-2xl font-bold mb-1 ${
                  getStatSummaryData().avgDifferenceRate < 0 ? 'text-green-700' : 'text-red-700'
                }`}>
                  {getStatSummaryData().avgDifferenceRate.toFixed(1)}%
                </div>
                <div className="text-xs text-purple-600/70">平均差异率</div>
              </div>

              {/* 卡片5: 同比变化 */}
              <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-xl p-4 border border-rose-200/50 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-10 h-10 rounded-lg bg-rose-500 flex items-center justify-center shadow-md shadow-rose-500/30">
                    <TrendingUp className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-rose-600 bg-rose-200/50 px-2 py-1 rounded-full">同比</span>
                </div>
                <div className="text-2xl font-bold text-rose-700 mb-1">+{getStatSummaryData().yearOnYearChange}%</div>
                <div className="text-xs text-rose-600/70">较上年同期</div>
              </div>
            </div>

            {/* 仪表盘 - 仅月度汇总Tab显示 */}
            {statActiveTab === 'monthly' && (
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl p-6 mb-6 shadow-lg shadow-cyan-500/10">
                {/* 仪表盘标题 + 月份切换器 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-lg">领料统计概览</h4>
                      <p className="text-sm text-gray-500">2025年度物料领取分析</p>
                    </div>
                  </div>
                  {/* 月份切换器 */}
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className="h-8 px-3 bg-white/60 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="all">全部月份</option>
                      <option value="2025-01">1月</option>
                      <option value="2025-02">2月</option>
                      <option value="2025-03">3月</option>
                      <option value="2025-04">4月</option>
                      <option value="2025-05">5月</option>
                      <option value="2025-06">6月</option>
                      <option value="2025-07">7月</option>
                      <option value="2025-08">8月</option>
                      <option value="2025-09">9月</option>
                      <option value="2025-10">10月</option>
                      <option value="2025-11">11月</option>
                      <option value="2025-12">12月</option>
                    </select>
                  </div>
                </div>

                {/* 仪表盘主体 - 左侧环形图 + 右侧堆叠柱状图 */}
                <div className="grid grid-cols-12 gap-6 mb-6">
                  {/* 左侧：环形图 */}
                  <div className="col-span-3 bg-white/50 rounded-xl p-4 border border-gray-100">
                    <h5 className="font-semibold text-gray-700 mb-4 text-center">物料分类占比</h5>
                    <div className="h-64 relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={categorySummaryData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {categorySummaryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.solid} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: 'rgba(255,255,255,0.9)',
                              backdropFilter: 'blur(12px)',
                              borderRadius: '12px',
                              border: '1px solid rgba(255,255,255,0.5)'
                            }}
                            formatter={(value: number, name: string, props: any) => [
                              `${value.toLocaleString()} 件`,
                              props.payload.name
                            ]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* 环形图中心 */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <div className="text-2xl font-bold text-gray-800">
                          {selectedMonth === 'all' ? '29,450' : '2,450'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {selectedMonth === 'all' ? '年度总计' : '当月总计'}
                        </div>
                      </div>
                    </div>
                    {/* 分类列表 */}
                    <div className="mt-4 space-y-2">
                      {categorySummaryData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})` }}></span>
                            <span className="text-gray-600 truncate" title={item.name}>{item.name}</span>
                          </div>
                          <span className="font-medium text-gray-800">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 右侧：堆叠柱状图 / 单独月份分组柱状图 */}
                  <div className="col-span-9 bg-white/50 rounded-xl p-4 border border-gray-100">
                    <h5 className="font-semibold text-gray-700 mb-4">
                      月度用量趋势（按物料分类）
                      {selectedMonth !== 'all' && <span className="ml-2 text-cyan-600">- {selectedMonth.replace('2025-','')}月 各分类详情</span>}
                    </h5>
                    
                    {/* 全部月份：堆叠柱状图 */}
                    {selectedMonth === 'all' && (
                      <div className="h-[480px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={categoryTrendData}>
                            <defs>
                              <linearGradient id="grad-production" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#06B6D4"/><stop offset="100%" stopColor="#0891B2" stopOpacity={0.7}/>
                              </linearGradient>
                              <linearGradient id="grad-facility" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8B5CF6"/><stop offset="100%" stopColor="#7C3AED" stopOpacity={0.7}/>
                              </linearGradient>
                              <linearGradient id="grad-operation" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F59E0B"/><stop offset="100%" stopColor="#D97706" stopOpacity={0.7}/>
                              </linearGradient>
                              <linearGradient id="grad-postprocess" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#F97316"/><stop offset="100%" stopColor="#EA580C" stopOpacity={0.7}/>
                              </linearGradient>
                              <linearGradient id="grad-digital" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#EC4899"/><stop offset="100%" stopColor="#DB2777" stopOpacity={0.7}/>
                              </linearGradient>
                              <linearGradient id="grad-energy" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#64748B"/><stop offset="100%" stopColor="#475569" stopOpacity={0.7}/>
                              </linearGradient>
                              <linearGradient id="grad-other" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#9CA3AF"/><stop offset="100%" stopColor="#6B7280" stopOpacity={0.7}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
                            <XAxis 
                              dataKey="month" 
                              tickFormatter={(v) => v.replace('2025-','')+'月'} 
                              tick={{ fontSize: 11, fill: '#64748B' }}
                            />
                            <YAxis tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v} tick={{ fontSize: 11, fill: '#64748B' }} domain={[0, 5000]} />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: 'rgba(255,255,255,0.9)',
                                backdropFilter: 'blur(12px)',
                                borderRadius: '12px',
                                border: '1px solid rgba(255,255,255,0.5)'
                              }}
                              formatter={(value: number, name: string, props: any) => {
                                const cat = categorySummaryData.find(c => c.key === name);
                                const amount = Math.round(value * 30);
                                return [`${value} 件 / ¥${(amount/10000).toFixed(2)} 万`, cat?.name || name];
                              }}
                            />
                            <Legend formatter={(value) => {
                              const cat = categorySummaryData.find(c => c.key === value);
                              return <span className="text-gray-600 text-xs">{cat?.name || value}</span>;
                            }} />
                            <Bar dataKey="生产投入" stackId="a" fill="url(#grad-production)" radius={[0,0,0,0]} barSize={28} />
                            <Bar dataKey="设施装备" stackId="a" fill="url(#grad-facility)" radius={[0,0,0,0]} />
                            <Bar dataKey="作业支持" stackId="a" fill="url(#grad-operation)" radius={[0,0,0,0]} />
                            <Bar dataKey="采后流通" stackId="a" fill="url(#grad-postprocess)" radius={[0,0,0,0]} />
                            <Bar dataKey="数字管理" stackId="a" fill="url(#grad-digital)" radius={[0,0,0,0]} />
                            <Bar dataKey="能源耗材" stackId="a" fill="url(#grad-energy)" radius={[0,0,0,0]} />
                            <Bar dataKey="其他" stackId="a" fill="url(#grad-other)" radius={[4,4,0,0]} />
                            <Bar dataKey="total" stackId="b" fill="transparent" label={{ position: 'top', formatter: (value: number) => value > 0 ? value.toLocaleString() : '', fontSize: 11, fill: '#374151', dy: -10 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* 单独月份：7个竖向柱子 + 月份汇总 */}
                    {selectedMonth !== 'all' && (
                      <>
                        {/* 月份汇总提示 */}
                        <div className="mb-4 px-4 py-3 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-gray-600">选中月份：</span>
                              <span className="font-bold text-gray-800 ml-2">{selectedMonth.replace('2025-', '')}月</span>
                            </div>
                            <div className="flex items-center gap-6">
                              <div>
                                <span className="text-gray-500 text-sm">总用量：</span>
                                <span className="font-bold text-cyan-600 ml-1">{getMonthSummary(selectedMonth).totalQuantity.toLocaleString()} 件</span>
                              </div>
                              <div>
                                <span className="text-gray-500 text-sm">总金额：</span>
                                <span className="font-bold text-purple-600 ml-1">¥{(getMonthSummary(selectedMonth).totalAmount / 10000).toFixed(1)} 万元</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 7分类竖向柱状图 */}
                        <div className="h-[480px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={getMonthCategoryData(selectedMonth)}>
                              <defs>
                                <linearGradient id="grad-production-single" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#06B6D4"/><stop offset="100%" stopColor="#0891B2" stopOpacity={0.8}/>
                                </linearGradient>
                                <linearGradient id="grad-facility-single" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#8B5CF6"/><stop offset="100%" stopColor="#7C3AED" stopOpacity={0.8}/>
                                </linearGradient>
                                <linearGradient id="grad-operation-single" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#F59E0B"/><stop offset="100%" stopColor="#D97706" stopOpacity={0.8}/>
                                </linearGradient>
                                <linearGradient id="grad-postprocess-single" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#F97316"/><stop offset="100%" stopColor="#EA580C" stopOpacity={0.8}/>
                                </linearGradient>
                                <linearGradient id="grad-digital-single" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#EC4899"/><stop offset="100%" stopColor="#DB2777" stopOpacity={0.8}/>
                                </linearGradient>
                                <linearGradient id="grad-energy-single" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#64748B"/><stop offset="100%" stopColor="#475569" stopOpacity={0.8}/>
                                </linearGradient>
                                <linearGradient id="grad-other-single" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#9CA3AF"/><stop offset="100%" stopColor="#6B7280" stopOpacity={0.8}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="4 4" stroke="#E2E8F0" vertical={false} />
                              <XAxis 
                                dataKey="name" 
                                tick={{ fontSize: 11, fill: '#64748B' }}
                                tickFormatter={(v) => v.replace('类', '').replace('与', '/')}
                              />
                              <YAxis 
                                yAxisId="left"
                                tickFormatter={(v) => v >= 1000 ? `${v/1000}k` : v}
                                tick={{ fontSize: 11, fill: '#64748B' }}
                                label={{ value: '用量(件)', angle: -90, position: 'insideLeft', fill: '#64748B', fontSize: 11 }}
                                domain={[0, 5000]}
                              />
                              <YAxis 
                                yAxisId="right" 
                                orientation="right"
                                tickFormatter={(v) => `¥${(v/10000).toFixed(1)}万`}
                                tick={{ fontSize: 11, fill: '#64748B' }}
                                label={{ value: '金额(万元)', angle: 90, position: 'insideRight', fill: '#64748B', fontSize: 11 }}
                              />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'rgba(255,255,255,0.95)',
                                  backdropFilter: 'blur(12px)',
                                  borderRadius: '12px',
                                  border: '1px solid rgba(255,255,255,0.5)'
                                }}
                                formatter={(value: number, name: string, props: any) => [
                                  `${value} 件 / ¥${(props.payload.amount/10000).toFixed(2)} 万`,
                                  props.payload.name
                                ]}
                              />
                              <Bar 
                                dataKey="value" 
                                yAxisId="left"
                                radius={[6, 6, 0, 0]}
                                barSize={48}
                                label={{ 
                                  position: 'top', 
                                  formatter: (value: number) => value > 0 ? value.toLocaleString() : '',
                                  fontSize: 11,
                                  fill: '#374151'
                                }}
                              >
                                {getMonthCategoryData(selectedMonth).map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.solid} />
                                ))}
                              </Bar>
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 底部：分类汇总卡片 */}
                <div className="grid grid-cols-8 gap-3">
                  {categorySummaryData.map((item) => (
                    <div key={item.name} className="bg-white/60 rounded-xl p-3 border border-gray-100 hover:shadow-md transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-full" style={{ background: `linear-gradient(135deg, ${item.gradient[0]}, ${item.gradient[1]})` }}></span>
                        <span className="text-xs text-gray-600 truncate" title={item.name}>{item.name}</span>
                      </div>
                      <div className="text-lg font-bold text-gray-800">{item.value.toLocaleString()}</div>
                      <div className="text-sm text-gray-500">件</div>
                      <div className="text-xs text-gray-400 mt-1">¥{item.amount}万</div>
                    </div>
                  ))}
                  {/* 合计卡片 */}
                  <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-3 text-white">
                    <div className="text-xs opacity-80 mb-1">年度合计</div>
                    <div className="text-xl font-bold">29,450</div>
                    <div className="text-sm">件</div>
                    <div className="text-xs opacity-80 mt-1">¥89.5万</div>
                  </div>
                </div>
              </div>
            )}

            {/* 筛选表单区域 - 月度汇总Tab专用 */}
            {statActiveTab === 'monthly' && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900 mb-1">年份</label>
                    <select
                      value={statYearFilter}
                      onChange={(e) => {
                        setStatYearFilter(e.target.value);
                        setStatCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="2025">2025年</option>
                      <option value="2024">2024年</option>
                      <option value="2023">2023年</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-900 mb-1">月份</label>
                    <select
                      value={statMonthFilter}
                      onChange={(e) => {
                        setStatMonthFilter(e.target.value);
                        setExpandedMonths(new Set());
                        setStatCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="all">全部月份</option>
                      <option value="01">1月</option>
                      <option value="02">2月</option>
                      <option value="03">3月</option>
                      <option value="04">4月</option>
                      <option value="05">5月</option>
                      <option value="06">6月</option>
                      <option value="07">7月</option>
                      <option value="08">8月</option>
                      <option value="09">9月</option>
                      <option value="10">10月</option>
                      <option value="11">11月</option>
                      <option value="12">12月</option>
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      setStatYearFilter('2025');
                      setStatMonthFilter('all');
                      setExpandedMonths(new Set());
                      setStatCurrentPage(1);
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
                  >
                    重置
                  </button>
                </div>
              </div>
            )}

            {/* 筛选表单区域 - 其他Tab专用 */}
            {statActiveTab !== 'monthly' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex items-center gap-4 flex-wrap">
                  {/* 部门筛选 */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">部门:</label>
                    <select
                      value={statDepartmentFilter[0] || ''}
                      onChange={(e) => setStatDepartmentFilter(e.target.value ? [e.target.value] : [])}
                      className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">全部</option>
                      <option value="生产部">生产部</option>
                      <option value="技术部">技术部</option>
                      <option value="设备部">设备部</option>
                      <option value="后勤部">后勤部</option>
                      <option value="采后处理部">采后处理部</option>
                    </select>
                  </div>

                  {/* 时间范围 */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">时间:</label>
                    <input
                      type="date"
                      value={statDateRange.start}
                      onChange={(e) => setStatDateRange({ ...statDateRange, start: e.target.value })}
                      className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="text-gray-400">至</span>
                    <input
                      type="date"
                      value={statDateRange.end}
                      onChange={(e) => setStatDateRange({ ...statDateRange, end: e.target.value })}
                      className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* 快捷筛选按钮 */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                    <button onClick={() => handleStatQuickFilter('currentWeek')} className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white hover:shadow-sm transition-all">本周</button>
                    <button onClick={() => handleStatQuickFilter('currentMonth')} className="px-3 py-1.5 text-xs font-medium rounded-md bg-emerald-500 text-white shadow-sm">本月</button>
                    <button onClick={() => handleStatQuickFilter('currentQuarter')} className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white hover:shadow-sm transition-all">本季</button>
                    <button onClick={() => handleStatQuickFilter('currentYear')} className="px-3 py-1.5 text-xs font-medium rounded-md hover:bg-white hover:shadow-sm transition-all">本年</button>
                  </div>

                  {/* 重置按钮 */}
                  <button
                    onClick={handleStatReset}
                    className="h-9 px-4 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-all flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    重置
                  </button>
                </div>

                {/* 区域统计特有筛选 */}
                {statActiveTab === 'area' && statActiveAreaTab === 'greenhouse' && (
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">大棚类型:</label>
                    <select
                      value={statGreenhouseTypeFilter}
                      onChange={(e) => setStatGreenhouseTypeFilter(e.target.value)}
                      className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="all">全部</option>
                      <option value="玻璃温室">玻璃温室</option>
                      <option value="日光温室">日光温室</option>
                      <option value="塑料大棚">塑料大棚</option>
                      <option value="露天">露天</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">具体大棚:</label>
                    <select
                      value={statGreenhouseFilter[0] || ''}
                      onChange={(e) => setStatGreenhouseFilter(e.target.value ? [e.target.value] : [])}
                      className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">全部</option>
                      <option value="玻璃温室A区">玻璃温室A区</option>
                      <option value="玻璃温室B区">玻璃温室B区</option>
                      <option value="玻璃温室C区">玻璃温室C区</option>
                      <option value="日光温室1号">日光温室1号</option>
                      <option value="日光温室2号">日光温室2号</option>
                      <option value="日光温室3号">日光温室3号</option>
                      <option value="日光温室4号">日光温室4号</option>
                      <option value="塑料大棚1号">塑料大棚1号</option>
                      <option value="塑料大棚2号">塑料大棚2号</option>
                      <option value="露天种植区">露天种植区</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">对比周期:</label>
                    <select
                      value={statComparisonPeriod}
                      onChange={(e) => setStatComparisonPeriod(e.target.value)}
                      className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="none">不对比</option>
                      <option value="lastWeek">上周对比</option>
                      <option value="lastMonth">上月对比</option>
                      <option value="lastQuarter">上季度对比</option>
                      <option value="lastYear">去年同期</option>
                    </select>
                  </div>
                </div>
              )}

              {statActiveTab === 'area' && statActiveAreaTab === 'field' && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">具体地块:</label>
                    <select
                      value={statFieldFilter[0] || ''}
                      onChange={(e) => setStatFieldFilter(e.target.value ? [e.target.value] : [])}
                      className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">全部</option>
                      <option value="A1地块">A1地块</option>
                      <option value="A2地块">A2地块</option>
                      <option value="A3地块">A3地块</option>
                      <option value="B1地块">B1地块</option>
                      <option value="B2地块">B2地块</option>
                      <option value="C1地块">C1地块</option>
                      <option value="C2地块">C2地块</option>
                      <option value="D1地块">D1地块</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">对比周期:</label>
                    <select
                      value={statComparisonPeriod}
                      onChange={(e) => setStatComparisonPeriod(e.target.value)}
                      className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="none">不对比</option>
                      <option value="lastWeek">上周对比</option>
                      <option value="lastMonth">上月对比</option>
                      <option value="lastQuarter">上季度对比</option>
                      <option value="lastYear">去年同期</option>
                    </select>
                  </div>
                </div>
              )}

              {statActiveTab === 'area' && statActiveAreaTab === 'batch' && (
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">批次选择:</label>
                    <select
                      value={statBatchFilter}
                      onChange={(e) => setStatBatchFilter(e.target.value)}
                      className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 min-w-[280px]"
                    >
                      <option value="">全部批次</option>
                      <option value="FQ2024-001">FQ2024-001（番茄-玻璃温室A区）</option>
                      <option value="FQ2024-002">FQ2024-002（黄瓜-玻璃温室B区）</option>
                      <option value="FQ2024-003">FQ2024-003（草莓-日光温室1号）</option>
                      <option value="FQ2024-004">FQ2024-004（生菜-日光温室2号）</option>
                      <option value="FQ2024-005">FQ2024-005（辣椒-玻璃温室C区）</option>
                      <option value="FQ2024-006">FQ2024-006（菠菜-塑料大棚1号）</option>
                      <option value="FQ2024-007">FQ2024-007（西瓜-露天种植区）</option>
                      <option value="FQ2024-008">FQ2024-008（茄子-日光温室4号）</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}



            {/* 月度汇总表格 - 按物料分类统计（折叠模式） */}
            {statActiveTab === 'monthly' && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">月度领料统计</h3>
                  <div className="flex gap-2">
                    {statExportMode ? (
                      <>
                        <button
                          onClick={handleStatExportConfirm}
                          className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                        >
                          <Download className="w-4 h-4" />
                          确认导出
                        </button>
                        <button
                          onClick={handleStatCancelExport}
                          className="h-8 px-3 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setStatExportMode(true)}
                        className="h-8 px-3 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <Download className="w-4 h-4" />
                        导出
                      </button>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        {statExportMode && (
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-12">
                            <input
                              type="checkbox"
                              checked={statSelectedRows.length === getAllMonthKeys().length && getAllMonthKeys().length > 0}
                              onChange={handleStatSelectAll}
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                            />
                          </th>
                        )}
                        <th 
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100 whitespace-nowrap"
                          onClick={() => handleMonthSort('month')}
                        >
                          月份 {sortConfig.key === 'month' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">物料分类</th>
                        <th 
                          className="px-4 py-3 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleMonthSort('totalQuantity')}
                        >
                          领料数量 {sortConfig.key === 'totalQuantity' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th 
                          className="px-4 py-3 text-right text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleMonthSort('totalAmount')}
                        >
                          领料金额 {sortConfig.key === 'totalAmount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">排名</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">占比</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">环比</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">同比</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-400">
                    {/* 单月视图：直接显示7分类 */}
                    {statMonthFilter !== 'all' && (
                      <>
                        {getSingleMonthTableData(statYearFilter, statMonthFilter).map((row, idx) => (
                          <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                            {statExportMode && (
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={statSelectedRows.includes(idx)}
                                  onChange={() => {
                                    if (statSelectedRows.includes(idx)) {
                                      setStatSelectedRows(statSelectedRows.filter(r => r !== idx));
                                    } else {
                                      setStatSelectedRows([...statSelectedRows, idx]);
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">{row.monthName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{row.categoryName}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{row.quantity.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">¥{row.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500">-</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500">{getCategoryStats(row.quantity, getSingleMonthTotal(statYearFilter, statMonthFilter).totalQty)}</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500">-</td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500">-</td>
                          </tr>
                        ))}
                        {/* 当月合计 */}
                        <tr className="bg-emerald-50 font-bold">
                          {statExportMode && <td className="px-4 py-3"></td>}
                          <td className="px-4 py-3 text-sm text-emerald-700 whitespace-nowrap">当月合计</td>
                          <td className="px-4 py-3 text-sm text-emerald-600">-</td>
                          <td className="px-4 py-3 text-sm text-right text-emerald-700">{getSingleMonthTotal(statYearFilter, statMonthFilter).totalQty.toLocaleString()}</td>
                          <td className="px-4 py-3 text-sm text-right text-emerald-700">¥{getSingleMonthTotal(statYearFilter, statMonthFilter).totalAmt.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-sm text-emerald-700">-</td>
                          <td className="px-4 py-3 text-center text-sm text-emerald-700">100%</td>
                          <td className="px-4 py-3 text-center text-sm text-emerald-700">-</td>
                          <td className="px-4 py-3 text-center text-sm text-emerald-700">-</td>
                        </tr>
                      </>
                    )}

                    {/* 全部月份视图：折叠模式 */}
                    {statMonthFilter === 'all' && (
                      <>
                        {getSortedMonthSummaries().map((monthRow, monthIdx) => (
                          <>
                            {/* 月份汇总行（可点击展开） */}
                            <tr 
                              key={monthRow.month} 
                              className="cursor-pointer hover:bg-emerald-50/50 bg-gray-50"
                              onClick={() => toggleMonthExpand(monthRow.month)}
                            >
                              {statExportMode && (
                                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={statSelectedRows.includes(monthIdx)}
                                    onChange={() => {
                                      if (statSelectedRows.includes(monthIdx)) {
                                        setStatSelectedRows(statSelectedRows.filter(r => r !== monthIdx));
                                      } else {
                                        setStatSelectedRows([...statSelectedRows, monthIdx]);
                                      }
                                    }}
                                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                  />
                                </td>
                              )}
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-emerald-600 font-bold">
                                    {expandedMonths.has(monthRow.month) ? '▼' : '▶'}
                                  </span>
                                  <span className="text-sm font-medium text-gray-900">{monthRow.monthName}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                点击展开7分类详情
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">
                                {monthRow.totalQuantity.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">
                                ¥{monthRow.totalAmount.toLocaleString()}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-500">
                                {getMonthStats(monthRow.month).rank}
                              </td>
                              <td className="px-4 py-3 text-center text-sm text-gray-500">
                                {getMonthStats(monthRow.month).percent}
                              </td>
                              <td className="px-4 py-3 text-center text-sm">
                                <span className={getMonthStats(monthRow.month).qoq.startsWith('↑') ? 'text-green-600' : getMonthStats(monthRow.month).qoq.startsWith('↓') ? 'text-red-600' : 'text-gray-400'}>
                                  {getMonthStats(monthRow.month).qoq}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-center text-sm">
                                <span className={getMonthStats(monthRow.month).yoy.startsWith('↑') ? 'text-green-600' : getMonthStats(monthRow.month).yoy.startsWith('↓') ? 'text-red-600' : 'text-gray-400'}>
                                  {getMonthStats(monthRow.month).yoy}
                                </span>
                              </td>
                            </tr>
                            
                            {/* 展开的7分类明细 */}
                            {expandedMonths.has(monthRow.month) && getMonthDetails(monthRow.month).map((detail, idx) => (
                              <tr key={`${monthRow.month}-${idx}`} className="hover:bg-emerald-50/50">
                                <td className="px-4 py-3 pl-10 text-sm text-gray-400 whitespace-nowrap">
                                  └ {detail.monthName}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700">
                                  <div className="flex items-center gap-2">
                                    <span 
                                      className="w-2 h-2 rounded-full" 
                                      style={{ backgroundColor: (categorySummaryData.find(c => c.key === detail.categoryKey) as any)?.solid || '#999' }}
                                    />
                                    {detail.categoryName}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-600">
                                  {detail.quantity.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-gray-600">
                                  ¥{detail.amount.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-400">-</td>
                                <td className="px-4 py-3 text-center text-sm text-gray-500">
                                  {getCategoryStats(detail.quantity, monthRow.totalQuantity)}
                                </td>
                                <td className="px-4 py-3 text-center text-gray-400">-</td>
                                <td className="px-4 py-3 text-center text-gray-400">-</td>
                              </tr>
                            ))}
                          </>
                        ))}
                        
                        {/* 年度合计 */}
                        <tr className="bg-emerald-100 font-bold text-emerald-800">
                          {statExportMode && <td className="px-4 py-3"></td>}
                          <td className="px-4 py-3 whitespace-nowrap">年度合计</td>
                          <td className="px-4 py-3">-</td>
                          <td className="px-4 py-3 text-right">{getYearTotalQuantity(statYearFilter).toLocaleString()}</td>
                          <td className="px-4 py-3 text-right">¥{getYearTotalAmount(statYearFilter).toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">-</td>
                          <td className="px-4 py-3 text-center">100%</td>
                          <td className="px-4 py-3 text-center">-</td>
                          <td className="px-4 py-3 text-center">-</td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {/* 物料汇总表格 */}
            {statActiveTab === 'material' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold">物料编码</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">物料名称</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">物料分类</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">规格</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold">单位</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">领料次数</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">总数量</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">总金额(元)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">主要仓库</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {materialStatisticsData.slice((statCurrentPage - 1) * statPageSize, statCurrentPage * statPageSize).map((item, idx) => (
                      <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.materialCode}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.materialName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.spec}</td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600">{item.unit}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-blue-600">{item.requisitionCount}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.totalQuantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">¥{item.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.mainWarehouse}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => { setStatSelectedRecord(item); setStatShowDetailModal(true); }}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            查看明细
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 部门汇总表格 */}
            {statActiveTab === 'department' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold">部门名称</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">领料次数</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">领料单数</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">物料种类</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">总数量</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">总金额(元)</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">常用物料</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {departmentStatisticsData.slice((statCurrentPage - 1) * statPageSize, statCurrentPage * statPageSize).map((item, idx) => (
                      <tr key={idx} className="hover:bg-purple-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.department}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-purple-600">{item.requisitionCount}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.requisitionOrders}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.materialTypes}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.totalQuantity.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">¥{item.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <div className="flex flex-wrap gap-1">
                            {item.topMaterials.slice(0, 2).map((mat, i) => (
                              <span key={i} className="inline-flex items-center px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                                {mat}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => { setStatSelectedRecord(item); setStatShowDetailModal(true); }}
                            className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                          >
                            查看明细
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 大棚统计表格 */}
            {statActiveTab === 'area' && statActiveAreaTab === 'greenhouse' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold">大棚名称</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">类型</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">领料次数</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">物料种类</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">本期用量</th>
                      {statComparisonPeriod !== 'none' && (
                        <th className="px-4 py-3 text-right text-xs font-semibold">上期用量</th>
                      )}
                      {statComparisonPeriod !== 'none' && (
                        <th className="px-4 py-3 text-right text-xs font-semibold">变化率</th>
                      )}
                      <th className="px-4 py-3 text-right text-xs font-semibold">本期金额(元)</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {greenhouseStatisticsData.slice((statCurrentPage - 1) * statPageSize, statCurrentPage * statPageSize).map((item, idx) => (
                      <tr key={idx} className="hover:bg-cyan-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.greenhouse}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.greenhouseType}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-cyan-600">{item.requisitionCount}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.materialTypes}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.totalQuantity.toLocaleString()}</td>
                        {statComparisonPeriod !== 'none' && (
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{item.comparison.lastMonth.quantity.toLocaleString()}</td>
                        )}
                        {statComparisonPeriod !== 'none' && (
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.comparison.lastMonth.changeRate > 0 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {item.comparison.lastMonth.changeRate > 0 ? '↑' : '↓'} {Math.abs(item.comparison.lastMonth.changeRate).toFixed(1)}%
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">¥{item.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => { setStatSelectedRecord(item); setStatShowDetailModal(true); }}
                            className="text-cyan-600 hover:text-cyan-800 font-medium text-sm"
                          >
                            查看明细
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 大田统计表格 */}
            {statActiveTab === 'area' && statActiveAreaTab === 'field' && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-amber-500 to-amber-600 text-white">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold">地块名称</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold">作物</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">领料次数</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">物料种类</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold">本期用量</th>
                      {statComparisonPeriod !== 'none' && (
                        <th className="px-4 py-3 text-right text-xs font-semibold">上期用量</th>
                      )}
                      {statComparisonPeriod !== 'none' && (
                        <th className="px-4 py-3 text-right text-xs font-semibold">变化率</th>
                      )}
                      <th className="px-4 py-3 text-right text-xs font-semibold">本期金额(元)</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fieldStatisticsData.slice((statCurrentPage - 1) * statPageSize, statCurrentPage * statPageSize).map((item, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.field}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{item.crop}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-amber-600">{item.requisitionCount}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600">{item.materialTypes}</td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.totalQuantity.toLocaleString()}</td>
                        {statComparisonPeriod !== 'none' && (
                          <td className="px-4 py-3 text-sm text-right text-gray-600">{item.comparison.lastMonth.quantity.toLocaleString()}</td>
                        )}
                        {statComparisonPeriod !== 'none' && (
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              item.comparison.lastMonth.changeRate > 0 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {item.comparison.lastMonth.changeRate > 0 ? '↑' : '↓'} {Math.abs(item.comparison.lastMonth.changeRate).toFixed(1)}%
                            </span>
                          </td>
                        )}
                        <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">¥{item.totalAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => { setStatSelectedRecord(item); setStatShowDetailModal(true); }}
                            className="text-amber-600 hover:text-amber-800 font-medium text-sm"
                          >
                            查看明细
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 种植批次统计表格 */}
            {statActiveTab === 'area' && statActiveAreaTab === 'batch' && (
              <div className="space-y-4">
                {/* 批次选择卡片 */}
                <div className="grid grid-cols-4 gap-4">
                  {batchStatisticsData.map((batch) => (
                    <div
                      key={batch.batchCode}
                      onClick={() => setStatBatchFilter(batch.batchCode)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${
                        statBatchFilter === batch.batchCode
                          ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-500/20'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-bold text-gray-900">{batch.batchCode}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          statBatchFilter === batch.batchCode
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {batch.cropName}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mb-1">{batch.plantArea}</div>
                      <div className="text-xs text-gray-400">{batch.plannedStartDate} 至 {batch.plannedEndDate}</div>
                      <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-500">物料种类</span>
                        <span className="text-sm font-semibold text-emerald-600">{batch.materialTypes}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 选中批次的明细表格 */}
                {statBatchFilter && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden mt-4">
                    <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="text-white">
                          <div className="font-semibold">{statBatchFilter}</div>
                          <div className="text-sm text-emerald-100">
                            {batchStatisticsData.find(b => b.batchCode === statBatchFilter)?.cropName} - 
                            {batchStatisticsData.find(b => b.batchCode === statBatchFilter)?.plantArea}
                          </div>
                        </div>
                        <div className="text-right text-white">
                          <div className="text-sm text-emerald-100">总金额</div>
                          <div className="text-xl font-bold">¥{batchStatisticsData.find(b => b.batchCode === statBatchFilter)?.totalAmount.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                    <table className="w-full">
                      <thead className="bg-emerald-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-800">物料编码</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-800">物料名称</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-800">物料分类</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-emerald-800">单位</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-800">总申请数量</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-800">总出库数量</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-800">差异</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-emerald-800">总金额(元)</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-emerald-800">主要仓库</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {batchStatisticsData.find(b => b.batchCode === statBatchFilter)?.details.map((item, idx) => (
                          <tr key={idx} className="hover:bg-emerald-50/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-mono text-blue-600">{item.materialCode}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{item.materialName}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                            <td className="px-4 py-3 text-sm text-center text-gray-600">{item.unit}</td>
                            <td className="px-4 py-3 text-sm text-right text-gray-600">{item.totalQuantity}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-gray-900">{item.actualQuantity}</td>
                            <td className="px-4 py-3 text-sm text-right">
                              <span className={`text-sm font-medium ${
                                item.totalQuantity - item.actualQuantity > 0 ? 'text-amber-600' : 'text-green-600'
                              }`}>
                                {item.totalQuantity - item.actualQuantity > 0 ? '↓' : '-'} {item.totalQuantity - item.actualQuantity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-bold text-emerald-600">¥{item.totalAmount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.mainWarehouse}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 分页组件 */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-500">
                显示第 {(statCurrentPage - 1) * statPageSize + 1} 至 {Math.min(statCurrentPage * statPageSize, 
                  statActiveTab === 'monthly' ? monthlyStatisticsData.length :
                  statActiveTab === 'material' ? materialStatisticsData.length :
                  statActiveTab === 'department' ? departmentStatisticsData.length :
                  statActiveTab === 'area' ? 
                    (statActiveAreaTab === 'greenhouse' ? greenhouseStatisticsData.length :
                     statActiveAreaTab === 'field' ? fieldStatisticsData.length :
                     batchStatisticsData.length) : 0
                )} 条，共 {
                  statActiveTab === 'monthly' ? monthlyStatisticsData.length :
                  statActiveTab === 'material' ? materialStatisticsData.length :
                  statActiveTab === 'department' ? departmentStatisticsData.length :
                  statActiveTab === 'area' ? 
                    (statActiveAreaTab === 'greenhouse' ? greenhouseStatisticsData.length :
                     statActiveAreaTab === 'field' ? fieldStatisticsData.length :
                     batchStatisticsData.length) : 0
                } 条
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatCurrentPage(Math.max(1, statCurrentPage - 1))}
                  disabled={statCurrentPage === 1}
                  className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(5, Math.ceil(
                  (statActiveTab === 'monthly' ? monthlyStatisticsData.length :
                  statActiveTab === 'material' ? materialStatisticsData.length :
                  statActiveTab === 'department' ? departmentStatisticsData.length :
                  statActiveTab === 'area' ? 
                    (statActiveAreaTab === 'greenhouse' ? greenhouseStatisticsData.length :
                     statActiveAreaTab === 'field' ? fieldStatisticsData.length :
                     batchStatisticsData.length) : 0) / statPageSize
                )) }).map((_, i) => {
                  const totalPages = Math.ceil(
                    (statActiveTab === 'monthly' ? monthlyStatisticsData.length :
                    statActiveTab === 'material' ? materialStatisticsData.length :
                    statActiveTab === 'department' ? departmentStatisticsData.length :
                    statActiveTab === 'area' ? 
                      (statActiveAreaTab === 'greenhouse' ? greenhouseStatisticsData.length :
                       statActiveAreaTab === 'field' ? fieldStatisticsData.length :
                       batchStatisticsData.length) : 0) / statPageSize
                  );
                  const startPage = Math.max(1, Math.min(statCurrentPage - 2, totalPages - 4));
                  return (
                    <button
                      key={i}
                      onClick={() => setStatCurrentPage(startPage + i)}
                      className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        statCurrentPage === startPage + i
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                          : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {startPage + i}
                    </button>
                  );
                })}
                <button
                  onClick={() => setStatCurrentPage(statCurrentPage + 1)}
                  disabled={statCurrentPage >= Math.ceil(
                    (statActiveTab === 'monthly' ? monthlyStatisticsData.length :
                    statActiveTab === 'material' ? materialStatisticsData.length :
                    statActiveTab === 'department' ? departmentStatisticsData.length :
                    statActiveTab === 'area' ? 
                      (statActiveAreaTab === 'greenhouse' ? greenhouseStatisticsData.length :
                       statActiveAreaTab === 'field' ? fieldStatisticsData.length :
                       batchStatisticsData.length) : 0) / statPageSize
                  )}
                  className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 导出格式选择弹窗 */}
        {statShowExportTypeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setStatShowExportTypeModal(false)}>
            <div className="bg-white rounded-xl p-6 w-96 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">导出统计报表</h3>
                <button onClick={() => setStatShowExportTypeModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <div className="space-y-3 mb-6">
                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="exportType"
                    value="xlsx"
                    checked={statExportFileType === 'xlsx'}
                    onChange={() => setStatExportFileType('xlsx')}
                    className="w-4 h-4 text-emerald-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-green-500 flex items-center justify-center text-white text-sm font-bold">X</div>
                    <div>
                      <div className="font-medium text-gray-900">Excel (.xlsx)</div>
                      <div className="text-xs text-gray-500">适合数据分析</div>
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="exportType"
                    value="csv"
                    checked={statExportFileType === 'csv'}
                    onChange={() => setStatExportFileType('csv')}
                    className="w-4 h-4 text-emerald-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-blue-500 flex items-center justify-center text-white text-sm font-bold">CSV</div>
                    <div>
                      <div className="font-medium text-gray-900">CSV (.csv)</div>
                      <div className="text-xs text-gray-500">适合导入其他系统</div>
                    </div>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 rounded-lg border-2 border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="exportType"
                    value="doc"
                    checked={statExportFileType === 'doc'}
                    onChange={() => setStatExportFileType('doc')}
                    className="w-4 h-4 text-emerald-500"
                  />
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-indigo-500 flex items-center justify-center text-white text-sm font-bold">W</div>
                    <div>
                      <div className="font-medium text-gray-900">Word (.docx)</div>
                      <div className="text-xs text-gray-500">适合打印报告</div>
                    </div>
                  </div>
                </label>
              </div>
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setStatShowExportTypeModal(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    confirmStatExport();
                  }}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  确认导出
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 详情查看弹窗 */}
        {statShowDetailModal && statSelectedRecord && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setStatShowDetailModal(false)}>
            <div className="bg-white rounded-xl w-[800px] max-h-[80vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">统计明细</h3>
                <button onClick={() => setStatShowDetailModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors">
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="text-xs text-emerald-600 mb-1">领料次数</div>
                    <div className="text-lg font-bold text-emerald-700">{statSelectedRecord.requisitionCount}</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-xs text-blue-600 mb-1">物料种类</div>
                    <div className="text-lg font-bold text-blue-700">{statSelectedRecord.materialTypes}</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3">
                    <div className="text-xs text-amber-600 mb-1">总数量</div>
                    <div className="text-lg font-bold text-amber-700">{statSelectedRecord.totalQuantity?.toLocaleString()}</div>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="text-xs text-emerald-600 mb-1">总金额</div>
                    <div className="text-lg font-bold text-emerald-700">¥{statSelectedRecord.totalAmount?.toLocaleString()}</div>
                  </div>
                </div>
                <div className="text-center text-gray-500 py-8">
                  详细数据展示...
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 成本核算 Tab内容 */}
      <div className={activeTab === 'cost' ? '' : 'hidden'}>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">成本核算</h3>
          </div>
          <p className="text-gray-500 mt-4">功能开发中...</p>
        </div>
      </div>
      </div>
    </div>
  );
}
