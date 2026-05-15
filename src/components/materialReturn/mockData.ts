import { ReturnRecord } from './types';
import { users } from '../../data/farm/farmData';

// 当前登录用户（默认用户 U013）
export const currentUser = users.find(u => u.id === 'U013') || users[0];

export const mockReturns: ReturnRecord[] = [
  { id: 1, code: 'TL20240301001', date: '2024-03-05', type: '生产退料', applicant: '李建国', department: '生产部', warehouseLocation: 'A区-01', status: '已完成', statusClass: 'completed', remark: '', operator: '郭靖', reviewer: '黄药师', reviewDate: '2024-03-05', rejectReason: '', materials: [
    { sourceApplicationCode: 'CK20240301001', materialCode: 'SP0103001', category: '种质资源-粮食作物种子', materialName: '番茄种子', spec: '50g/袋', unit: '袋', returnQuantity: 5, unitPrice: 12.5, warehousePosition: 'A区-01-01', reason: '质量问题', remark: '' },
    { sourceApplicationCode: 'CK20240301001', materialCode: 'SP0201001', category: '肥料与土壤改良剂-有机肥', materialName: '商品有机肥', spec: '50kg/袋', unit: '袋', returnQuantity: 10, unitPrice: 85, warehousePosition: 'A区-01-02', reason: '规格不符', remark: '' },
  ]},
  { id: 2, code: 'TL20240302001', date: '2024-03-08', type: '生产退料', applicant: '王建华', department: '种植部', warehouseLocation: 'B区-03', status: '待审批', statusClass: 'pending', remark: '', operator: '杨过', reviewer: '小龙女', reviewDate: '', rejectReason: '', materials: [
    { sourceApplicationCode: 'CK20240302001', materialCode: 'SP0302001', category: '农药与植保产品-杀菌剂', materialName: '多菌灵', spec: '100g/瓶', unit: '箱', returnQuantity: 3, unitPrice: 45, warehousePosition: 'B区-03-01', reason: '过期产品', remark: '' },
  ]},
  { id: 3, code: 'TL20240303001', date: '2024-03-10', type: '生产退料', applicant: '李建国', department: '生产部', warehouseLocation: 'A区-02', status: '已审批', statusClass: 'approved', remark: '', operator: '张无忌', reviewer: '周芷若', reviewDate: '2024-03-10', rejectReason: '', materials: [
    { sourceApplicationCode: 'CK20240303001', materialCode: 'EQ0202001', category: '设施与装备类-覆盖材料', materialName: 'PO膜', spec: '2m×100m', unit: '㎡', returnQuantity: 50, unitPrice: 8.5, warehousePosition: 'A区-02-01', reason: '运输损坏', remark: '' },
    { sourceApplicationCode: 'CK20240303001', materialCode: 'SP0301001', category: '农药与植保产品-杀虫剂', materialName: '吡虫啉', spec: '10g×10袋/盒', unit: '盒', returnQuantity: 20, unitPrice: 28, warehousePosition: 'A区-02-02', reason: '库存积压', remark: '' },
  ]},
  { id: 4, code: 'TL20240304001', date: '2024-03-12', type: '生产退料', applicant: '张建华', department: '设备部', warehouseLocation: 'C区-05', status: '已完成', statusClass: 'completed', remark: '', operator: '段誉', reviewer: '萧峰', reviewDate: '2024-03-12', rejectReason: '', materials: [
    { sourceApplicationCode: 'CK20240304001', materialCode: 'SP0202001', category: '肥料与土壤改良剂-化学肥料', materialName: '尿素', spec: '50kg/袋', unit: '袋', returnQuantity: 8, unitPrice: 95, warehousePosition: 'C区-05-01', reason: '质量问题', remark: '' },
  ]},
  { id: 5, code: 'TL20240305001', date: '2024-03-15', type: '生产退料', applicant: '赵技术', department: '种植部', warehouseLocation: 'B区-01', status: '已驳回', statusClass: 'rejected', remark: '不符合退货条件', operator: '陈家洛', reviewer: '霍青桐', reviewDate: '2024-03-15', rejectReason: '超出退料期限', materials: [
    { sourceApplicationCode: 'CK20240305001', materialCode: 'SP0202002', category: '肥料与土壤改良剂-化学肥料', materialName: '复合肥', spec: '25kg/袋', unit: '袋', returnQuantity: 15, unitPrice: 120, warehousePosition: 'B区-01-01', reason: '规格不符', remark: '' },
  ]},
  { id: 6, code: 'TL20240306001', date: '2024-03-16', type: '生产退料', applicant: '李建国', department: '生产部', warehouseLocation: 'A区-03', status: '待审批', statusClass: 'pending', remark: '', operator: '令狐冲', reviewer: '任盈盈', reviewDate: '', rejectReason: '', materials: [
    { sourceApplicationCode: 'CK20240306001', materialCode: 'PH0104001', category: '采后处理与流通类-包装材料', materialName: '农药瓶', spec: '500ml/瓶', unit: '瓶', returnQuantity: 30, unitPrice: 3.5, warehousePosition: 'A区-03-01', reason: '过期产品', remark: '' },
  ]},
  { id: 7, code: 'TL20240307001', date: '2024-03-17', type: '生产退料', applicant: '王建华', department: '种植部', warehouseLocation: 'B区-02', status: '已审批', statusClass: 'approved', remark: '', operator: '袁承志', reviewer: '夏雪宜', reviewDate: '2024-03-17', rejectReason: '', materials: [
    { sourceApplicationCode: 'CK20240307001', materialCode: 'EQ0202002', category: '设施与装备类-覆盖材料', materialName: '农用薄膜', spec: '5m×100m', unit: '卷', returnQuantity: 25, unitPrice: 150, warehousePosition: 'B区-02-01', reason: '质量问题', remark: '' },
  ]},
  { id: 8, code: 'TL20240308001', date: '2024-03-18', type: '生产退料', applicant: '张建华', department: '设备部', warehouseLocation: 'C区-01', status: '已完成', statusClass: 'completed', remark: '', operator: '胡斐', reviewer: '程灵素', reviewDate: '2024-03-18', rejectReason: '', materials: [
    { sourceApplicationCode: 'CK20240308001', materialCode: 'EQ0103001', category: '设施与装备类-植保机械', materialName: '电动喷雾机', spec: '16L', unit: '台', returnQuantity: 5, unitPrice: 280, warehousePosition: 'C区-01-01', reason: '运输损坏', remark: '' },
  ]},
  { id: 9, code: 'TL20240309001', date: '2024-03-19', type: '生产退料', applicant: '王技术', department: '生产部', warehouseLocation: 'A区-04', status: '已作废', statusClass: 'voided', remark: '已重新开单', operator: '虚竹', reviewer: '扫地僧', reviewDate: '2024-03-19', rejectReason: '', materials: [
    { sourceApplicationCode: 'CK20240309001', materialCode: 'SP0203001', category: '肥料与土壤改良剂-叶面肥', materialName: '磷酸二氢钾', spec: '500g/袋', unit: '袋', returnQuantity: 20, unitPrice: 35, warehousePosition: 'A区-04-01', reason: '其他', remark: '' },
  ]},
  { id: 10, code: 'TL20240310001', date: '2024-03-20', type: '生产退料', applicant: '赵建华', department: '种植部', warehouseLocation: 'B区-03', status: '已作废', statusClass: 'voided', remark: '重复申请', operator: '狄云', reviewer: '丁典', reviewDate: '2024-03-20', rejectReason: '', materials: [
    { sourceApplicationCode: 'CK20240310001', materialCode: 'EQ0301001', category: '设施与装备类-灌溉设备', materialName: '滴灌管', spec: '16mm×500m', unit: '卷', returnQuantity: 10, unitPrice: 180, warehousePosition: 'B区-03-01', reason: '规格不符', remark: '' },
  ]},
];

// 模拟领料出库单列表（用于来源领料单号选择）
export const mockSourceApplications = [
  { code: 'CK20240301001', date: '2024-03-01', applicant: '李建国', department: '生产部' },
  { code: 'CK20240302001', date: '2024-03-02', applicant: '王建华', department: '种植部' },
  { code: 'CK20240303001', date: '2024-03-03', applicant: '李建国', department: '生产部' },
  { code: 'CK20240304001', date: '2024-03-04', applicant: '张建华', department: '设备部' },
  { code: 'CK20240305001', date: '2024-03-05', applicant: '赵技术', department: '种植部' },
  { code: 'CK20240306001', date: '2024-03-06', applicant: '李建国', department: '生产部' },
  { code: 'CK20240307001', date: '2024-03-07', applicant: '王建华', department: '种植部' },
  { code: 'CK20240308001', date: '2024-03-08', applicant: '张建华', department: '设备部' },
];

// 领料单物料明细（用于选择物料）
export const mockSourceApplicationMaterials = [
  // CK20240301001 的物料
  { sourceApplicationCode: 'CK20240301001', materialCode: 'SP0103001', materialName: '番茄种子', spec: '50g/袋', unit: '袋', quantity: 20, warehousePosition: 'A区-01-01', category: '种质资源-粮食作物种子', unitPrice: 12.5 },
  { sourceApplicationCode: 'CK20240301001', materialCode: 'SP0201001', materialName: '商品有机肥', spec: '50kg/袋', unit: '袋', quantity: 50, warehousePosition: 'A区-01-02', category: '肥料与土壤改良剂-有机肥', unitPrice: 85 },
  { sourceApplicationCode: 'CK20240301001', materialCode: 'SP0201002', materialName: '尿素', spec: '50kg/袋', unit: '袋', quantity: 30, warehousePosition: 'A区-01-03', category: '肥料与土壤改良剂-化学肥料', unitPrice: 95 },
  // CK20240302001 的物料
  { sourceApplicationCode: 'CK20240302001', materialCode: 'SP0302001', materialName: '多菌灵', spec: '100g/瓶', unit: '箱', quantity: 15, warehousePosition: 'B区-03-01', category: '农药与植保产品-杀菌剂', unitPrice: 45 },
  { sourceApplicationCode: 'CK20240302001', materialCode: 'SP0301001', materialName: '吡虫啉', spec: '10g×10袋/盒', unit: '盒', quantity: 40, warehousePosition: 'B区-03-02', category: '农药与植保产品-杀虫剂', unitPrice: 28 },
  // CK20240303001 的物料
  { sourceApplicationCode: 'CK20240303001', materialCode: 'EQ0202001', materialName: 'PO膜', spec: '2m×100m', unit: '㎡', quantity: 200, warehousePosition: 'A区-02-01', category: '设施与装备类-覆盖材料', unitPrice: 8.5 },
  { sourceApplicationCode: 'CK20240303001', materialCode: 'EQ0202002', materialName: '农用薄膜', spec: '5m×100m', unit: '卷', quantity: 50, warehousePosition: 'A区-02-02', category: '设施与装备类-覆盖材料', unitPrice: 150 },
  { sourceApplicationCode: 'CK20240303001', materialCode: 'SP0301002', materialName: '百菌清', spec: '100g/瓶', unit: '瓶', quantity: 60, warehousePosition: 'A区-02-03', category: '农药与植保产品-杀菌剂', unitPrice: 22 },
  // CK20240304001 的物料
  { sourceApplicationCode: 'CK20240304001', materialCode: 'SP0202001', materialName: '尿素', spec: '50kg/袋', unit: '袋', quantity: 25, warehousePosition: 'C区-05-01', category: '肥料与土壤改良剂-化学肥料', unitPrice: 95 },
  { sourceApplicationCode: 'CK20240304001', materialCode: 'SP0202002', materialName: '复合肥', spec: '25kg/袋', unit: '袋', quantity: 40, warehousePosition: 'C区-05-02', category: '肥料与土壤改良剂-化学肥料', unitPrice: 120 },
  // CK20240305001 的物料
  { sourceApplicationCode: 'CK20240305001', materialCode: 'SP0202003', materialName: '磷肥', spec: '50kg/袋', unit: '袋', quantity: 35, warehousePosition: 'B区-01-01', category: '肥料与土壤改良剂-化学肥料', unitPrice: 78 },
  { sourceApplicationCode: 'CK20240305001', materialCode: 'SP0303001', materialName: '草甘膦', spec: '5L/桶', unit: '桶', quantity: 20, warehousePosition: 'B区-01-02', category: '农药与植保产品-除草剂', unitPrice: 35 },
  // CK20240306001 的物料
  { sourceApplicationCode: 'CK20240306001', materialCode: 'PH0104001', materialName: '农药瓶', spec: '500ml/瓶', unit: '瓶', quantity: 100, warehousePosition: 'A区-03-01', category: '采后处理与流通类-包装材料', unitPrice: 3.5 },
  { sourceApplicationCode: 'CK20240306001', materialCode: 'PH0104002', materialName: '肥料袋', spec: '25kg/袋', unit: '个', quantity: 80, warehousePosition: 'A区-03-02', category: '采后处理与流通类-包装材料', unitPrice: 2.8 },
  // CK20240307001 的物料
  { sourceApplicationCode: 'CK20240307001', materialCode: 'EQ0202003', materialName: '地膜', spec: '1m×100m', unit: '卷', quantity: 30, warehousePosition: 'B区-02-01', category: '设施与装备类-覆盖材料', unitPrice: 88 },
  { sourceApplicationCode: 'CK20240307001', materialCode: 'EQ0103001', materialName: '电动喷雾机', spec: '16L', unit: '台', quantity: 10, warehousePosition: 'B区-02-02', category: '设施与装备类-植保机械', unitPrice: 280 },
  // CK20240308001 的物料
  { sourceApplicationCode: 'CK20240308001', materialCode: 'EQ0103002', materialName: '手动喷雾器', spec: '5L', unit: '台', quantity: 15, warehousePosition: 'C区-01-01', category: '设施与装备类-植保机械', unitPrice: 65 },
  { sourceApplicationCode: 'CK20240308001', materialCode: 'EQ0201001', materialName: '防虫网', spec: '2m×50m', unit: '㎡', quantity: 120, warehousePosition: 'C区-01-02', category: '设施与装备类-覆盖材料', unitPrice: 5.5 },
];
