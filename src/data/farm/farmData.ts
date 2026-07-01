// 农场生产数据
// 智慧种植生产管理系统模拟数据 - 农场生产相关

import {
  User, CropBatch, Task, Material, MaterialRequest, Greenhouse,
  IoTSensor, InspectionRecord, HarvestRecord,
  DashboardStats, CropType, Process, Equipment, Infrastructure
} from '../../types';
import { PlanType } from '../../types';

// 用户数据
export const users: User[] = [
  { id: 'U001', name: '王建华', avatar: 'WJH', role: 'admin', department: '管理层', position: '管理员' },
  { id: 'U002', name: '李明辉', avatar: 'LMH', role: 'manager', department: '生产部', position: '生产主管' },
  { id: 'U003', name: '王建国', avatar: 'WJG', role: 'manager', department: '生产部', position: '生产经理' },
  { id: 'U006', name: '陈小芳', avatar: 'CXF', role: 'worker', department: '生产部', position: '种植工' },
  { id: 'U007', name: '周志强', avatar: 'ZZQ', role: 'worker', department: '生产部', position: '种植工' },
  { id: 'U008', name: '吴美丽', avatar: 'WML', role: 'worker', department: '生产部', position: '种植工' },
  { id: 'U009', name: '郑胜利', avatar: 'ZSL', role: 'worker', department: '生产部', position: '农机手' },
  { id: 'U012', name: '黄敏', avatar: 'HM', role: 'supervisor', department: '生产部', position: '生产组长' },
  { id: 'U013', name: '陆启闯', avatar: 'LQC', role: 'admin', department: '管理层', position: '管理员' },
];

// 基地数据
export interface Base {
  id: string;
  name: string;
  location: string;
  type: 'glass' | 'solar' | 'open';
  area: number;
  status: 'active' | 'inactive';
}

export const bases: Base[] = [
  { id: 'BASE001', name: '总部基地', location: 'A区', type: 'glass', area: 50000, status: 'active' },
  { id: 'BASE002', name: '东区基地', location: 'B区', type: 'solar', area: 30000, status: 'active' },
  { id: 'BASE003', name: '南区基地', location: 'C区', type: 'open', area: 40000, status: 'active' },
  { id: 'BASE004', name: '西区基地', location: 'D区', type: 'glass', area: 25000, status: 'inactive' },
];

// 温室大棚数据
export const greenhouses: Greenhouse[] = [
  { id: 'G001', code: 'BLT-001', name: '玻璃温室A区', type: 'glass', area: 5000, location: 'A区东侧', status: 'active' },
  { id: 'G002', code: 'BLT-002', name: '玻璃温室B区', type: 'glass', area: 5000, location: 'A区西侧', status: 'active' },
  { id: 'G003', code: 'BLT-003', name: '玻璃温室C区', type: 'glass', area: 3000, location: 'B区东侧', status: 'active' },
  { id: 'G004', code: 'RGT-001', name: '日光温室1号', type: 'solar', area: 800, location: 'C区北侧', status: 'active' },
  { id: 'G005', code: 'RGT-002', name: '日光温室2号', type: 'solar', area: 800, location: 'C区北侧', status: 'active' },
  { id: 'G006', code: 'RGT-003', name: '日光温室3号', type: 'solar', area: 800, location: 'C区中侧', status: 'maintenance' },
  { id: 'G007', code: 'RGT-004', name: '日光温室4号', type: 'solar', area: 800, location: 'C区南侧', status: 'active' },
  { id: 'G008', code: 'PLT-001', name: '塑料大棚1号', type: 'open', area: 1200, location: 'D区', status: 'active' },
  { id: 'G009', code: 'PLT-002', name: '塑料大棚2号', type: 'open', area: 1200, location: 'D区', status: 'active' },
  { id: 'G010', code: 'PLT-003', name: '露天种植区', type: 'open', area: 10000, location: 'E区', status: 'active' },
];

// 作物类型数据
export const cropTypes: CropType[] = [
  { id: 'C001', name: '番茄', category: '茄果类', growthDays: 120, suitableTemp: '20-30℃', varieties: ['红果番茄', '樱桃番茄', '黄果番茄'] },
  { id: 'C002', name: '黄瓜', category: '瓜类', growthDays: 90, suitableTemp: '18-28℃', varieties: ['水果黄瓜', '刺黄瓜', '荷兰黄瓜'] },
  { id: 'C003', name: '辣椒', category: '茄果类', growthDays: 100, suitableTemp: '20-30℃', varieties: ['青椒', '彩椒', '尖椒'] },
  { id: 'C004', name: '草莓', category: '浆果类', growthDays: 180, suitableTemp: '15-25℃', varieties: ['红颜', '章姬', '甜查理'] },
  { id: 'C005', name: '生菜', category: '叶菜类', growthDays: 60, suitableTemp: '15-22℃', varieties: ['散叶生菜', '结球生菜', '罗马生菜'] },
  { id: 'C006', name: '菠菜', category: '叶菜类', growthDays: 45, suitableTemp: '15-20℃', varieties: ['圆叶菠菜', '尖叶菠菜'] },
  { id: 'C007', name: '茄子', category: '茄果类', growthDays: 110, suitableTemp: '20-30℃', varieties: ['紫茄', '绿茄', '白茄'] },
  { id: 'C008', name: '西瓜', category: '瓜类', growthDays: 90, suitableTemp: '25-35℃', varieties: ['小型西瓜', '中型西瓜'] },
];

// 工序数据
export const processes: Process[] = [
  { id: 'P001', name: '基质消毒', category: '准备', unit: '平方米', unitPrice: 2.5, rewardRate: 1.0 },
  { id: 'P002', name: '定植', category: '种植', unit: '株', unitPrice: 0.3, rewardRate: 1.2 },
  { id: 'P003', name: '浇水', category: '灌溉', unit: '次', unitPrice: 50, rewardRate: 1.0 },
  { id: 'P004', name: '施肥', category: '施肥', unit: '次', unitPrice: 80, rewardRate: 1.1 },
  { id: 'P005', name: '打药', category: '植保', unit: '次', unitPrice: 100, rewardRate: 1.2 },
  { id: 'P006', name: '中耕除草', category: '田间管理', unit: '平方米', unitPrice: 3, rewardRate: 1.0 },
  { id: 'P007', name: '疏花疏果', category: '田间管理', unit: '株', unitPrice: 0.5, rewardRate: 1.3 },
  { id: 'P008', name: '人工授粉', category: '田间管理', unit: '次', unitPrice: 60, rewardRate: 1.1 },
  { id: 'P009', name: '绑蔓', category: '田间管理', unit: '次', unitPrice: 40, rewardRate: 1.0 },
  { id: 'P010', name: '采收', category: '收获', unit: '公斤', unitPrice: 1.5, rewardRate: 1.5 },
  { id: 'P011', name: '整枝', category: '田间管理', unit: '次', unitPrice: 70, rewardRate: 1.2 },
  { id: 'P012', name: '巡田', category: '巡查', unit: '次', unitPrice: 30, rewardRate: 1.0 },
];

// 种植模式数据
export const plantingModes = [
  { id: 'M001', name: '混合基质种植', description: '使用椰糠、珍珠岩混合基质' },
  { id: 'M002', name: '土壤种植', description: '传统土壤栽培方式' },
  { id: 'M003', name: '椰糠种植', description: '纯椰糠基质栽培' },
  { id: 'M004', name: '水培', description: '营养液水培方式' },
  { id: 'M005', name: '岩棉培', description: '岩棉基质栽培' },
];

// 物资数据
export const materials: Material[] = [
  { id: 'MT001', code: 'FERT-001', name: '复合肥NPK', category: '化肥', specification: '15-15-15 50kg/袋', unit: '袋', unitPrice: 120, stockQuantity: 150, safeStock: 50, supplier: '金正大化肥', location: '仓库A区' },
  { id: 'MT002', code: 'FERT-002', name: '尿素', category: '化肥', specification: '46% 50kg/袋', unit: '袋', unitPrice: 85, stockQuantity: 200, safeStock: 80, supplier: '中化化肥', location: '仓库A区' },
  { id: 'MT003', code: 'FERT-003', name: '水溶肥', category: '化肥', specification: '20-20-20 5kg/袋', unit: '袋', unitPrice: 150, stockQuantity: 80, safeStock: 30, supplier: '以色列化工', location: '仓库B区' },
  { id: 'MT004', code: 'PEST-001', name: '吡虫啉', category: '农药', specification: '10% 100g/袋', unit: '袋', unitPrice: 25, stockQuantity: 300, safeStock: 100, supplier: '拜耳作物', location: '农药库' },
  { id: 'MT005', code: 'PEST-002', name: '多菌灵', category: '农药', specification: '50% 200g/袋', unit: '袋', unitPrice: 18, stockQuantity: 250, safeStock: 80, supplier: '先正达', location: '农药库' },
  { id: 'MT006', code: 'PEST-003', name: '阿维菌素', category: '农药', specification: '1.8% 100ml/瓶', unit: '瓶', unitPrice: 12, stockQuantity: 180, safeStock: 60, supplier: '巴斯夫', location: '农药库' },
  { id: 'MT007', code: 'SUB-001', name: '椰糠', category: '基质', specification: '50L/袋', unit: '袋', unitPrice: 35, stockQuantity: 500, safeStock: 200, supplier: '海南绿洲', location: '基质库' },
  { id: 'MT008', code: 'SUB-002', name: '珍珠岩', category: '基质', specification: '50L/袋', unit: '袋', unitPrice: 20, stockQuantity: 300, safeStock: 100, supplier: '建材市场', location: '基质库' },
  { id: 'MT009', code: 'FILM-001', name: 'PO膜', category: '农膜', specification: '0.1mm 2m宽', unit: '平方米', unitPrice: 2.5, stockQuantity: 5000, safeStock: 2000, supplier: '山东华熔', location: '农膜库' },
  { id: 'MT010', code: 'SEED-001', name: '番茄种子', category: '种子', specification: '1000粒/袋', unit: '袋', unitPrice: 150, stockQuantity: 50, safeStock: 20, supplier: '先正达', location: '种子库' },
  { id: 'MT011', code: 'SEED-002', name: '黄瓜种子', category: '种子', specification: '1000粒/袋', unit: '袋', unitPrice: 120, stockQuantity: 60, safeStock: 25, supplier: '圣尼斯', location: '种子库' },
  { id: 'MT012', code: 'SEED-003', name: '草莓苗', category: '种苗', specification: '裸根苗', unit: '株', unitPrice: 0.8, stockQuantity: 10000, safeStock: 3000, supplier: '丹东草莓', location: '种苗区' },
];

// 种植批次数据
// ========== 三阶段生产计划数据 ==========
// 种源计划（2条）：JZB前缀，蓝色标签
// 育苗计划（3条）：YMB前缀，绿色标签
// 种植计划（3条）：ZZB前缀，橙色标签
export const cropBatches: CropBatch[] = [
  // ========== 种源计划（育种计划）==========
  { id: 'B101', batchCode: 'JZB2026-001', planType: PlanType.SEED_BREEDING, planTypeName: '育种计划', cropName: '番茄', cropType: '茄果类', variety: '红果番茄', greenhouseId: '', greenhouseName: '', plantingArea: 0, stage: 'seedling', stageName: '种子期', startDate: '2026-01-05', expectedHarvestDate: '2026-01-15', targetYield: 0, actualYield: 0, status: 'planned', plantingMode: '', responsiblePerson: '王建国', publisher: '陆启闯', publishDate: '2026-01-03', lastModifyDate: '2026-01-03', batchStatus: 'published', supplierName: '先正达种业', seedQuantity: 500, unit: 'kg', targetQuantity: 500, planDetailFileName: '番茄种子采购计划-JZB2026-001.md', planDetail: '# 番茄种子采购计划 JZB2026-001\n\n## 基本信息\n- 批次号：JZB2026-001\n- 计划类型：育种计划（种源采购）\n- 作物：番茄\n- 品种：红果番茄\n- 供应商：先正达种业\n- 采购数量：500 kg\n- 采购负责人：王建国\n\n## 时间安排\n- 采购日期：2026-01-05\n- 预计到货：2026-01-15' },
  { id: 'B102', batchCode: 'JZB2026-002', planType: PlanType.SEED_BREEDING, planTypeName: '育种计划', cropName: '黄瓜', cropType: '瓜类', variety: '水果黄瓜', greenhouseId: '', greenhouseName: '', plantingArea: 0, stage: 'seedling', stageName: '种子期', startDate: '2026-01-08', expectedHarvestDate: '2026-01-18', targetYield: 0, actualYield: 0, status: 'planned', plantingMode: '', responsiblePerson: '李明辉', publisher: '陆启闯', publishDate: '2026-01-06', lastModifyDate: '2026-01-06', batchStatus: 'in_progress', supplierName: '圣尼斯种业', seedQuantity: 300, unit: 'kg', targetQuantity: 300, planDetailFileName: '黄瓜种子采购计划-JZB2026-002.md', planDetail: '# 黄瓜种子采购计划 JZB2026-002\n\n## 基本信息\n- 批次号：JZB2026-002\n- 计划类型：育种计划（种源采购）\n- 作物：黄瓜\n- 品种：水果黄瓜\n- 供应商：圣尼斯种业\n- 采购数量：300 kg\n- 采购负责人：李明辉' },
  // ========== 育苗计划 ==========
  { id: 'B201', batchCode: 'YMB2026-001', planType: PlanType.SEEDLING, planTypeName: '育苗计划', cropName: '番茄', cropType: '茄果类', variety: '红果番茄', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', plantingArea: 500, stage: 'seedling', stageName: '苗期', startDate: '2026-01-20', expectedHarvestDate: '2026-03-20', targetYield: 0, actualYield: 0, status: 'planned', plantingMode: '椰糠育苗', responsiblePerson: '陈小芳', publisher: '陆启闯', publishDate: '2026-01-15', lastModifyDate: '2026-01-15', batchStatus: 'published', seedlingSiteName: '育苗基地A区', targetSeedlingCount: 45000, unit: '株', targetQuantity: 45000, planDetailFileName: '番茄育苗计划-YMB2026-001.md', planDetail: '# 番茄育苗计划 YMB2026-001\n\n## 基本信息\n- 批次号：YMB2026-001\n- 计划类型：育苗计划\n- 作物：番茄\n- 品种：红果番茄\n- 育苗场地：育苗基地A区\n- 负责人：陈小芳\n\n## 育苗目标\n- 目标成苗数：45000株\n- 开始日期：2026-01-20\n- 预计结束：2026-03-20' },
  { id: 'B202', batchCode: 'YMB2026-002', planType: PlanType.SEEDLING, planTypeName: '育苗计划', cropName: '黄瓜', cropType: '瓜类', variety: '水果黄瓜', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', plantingArea: 400, stage: 'seedling', stageName: '苗期', startDate: '2026-01-25', expectedHarvestDate: '2026-03-15', targetYield: 0, actualYield: 0, status: 'planned', plantingMode: '水培育苗', responsiblePerson: '周志强', publisher: '陆启闯', publishDate: '2026-01-20', lastModifyDate: '2026-01-20', batchStatus: 'in_progress', seedlingSiteName: '育苗基地B区', targetSeedlingCount: 35000, unit: '株', targetQuantity: 35000, planDetailFileName: '黄瓜育苗计划-YMB2026-002.md', planDetail: '# 黄瓜育苗计划 YMB2026-002\n\n## 基本信息\n- 批次号：YMB2026-002\n- 计划类型：育苗计划\n- 作物：黄瓜\n- 品种：水果黄瓜\n- 育苗场地：育苗基地B区\n- 负责人：周志强' },
  { id: 'B203', batchCode: 'YMB2026-003', planType: PlanType.SEEDLING, planTypeName: '育苗计划', cropName: '草莓', cropType: '浆果类', variety: '红颜', greenhouseId: 'G004', greenhouseName: '日光温室1号', plantingArea: 200, stage: 'seedling', stageName: '苗期', startDate: '2026-02-01', expectedHarvestDate: '2026-04-01', targetYield: 0, actualYield: 0, status: 'planned', plantingMode: '土壤育苗', responsiblePerson: '吴美丽', publisher: '陆启闯', publishDate: '2026-01-28', lastModifyDate: '2026-01-28', batchStatus: 'published', seedlingSiteName: '草莓育苗区', targetSeedlingCount: 15000, unit: '株', targetQuantity: 15000, planDetailFileName: '草莓育苗计划-YMB2026-003.md', planDetail: '# 草莓育苗计划 YMB2026-003\n\n## 基本信息\n- 批次号：YMB2026-003\n- 计划类型：育苗计划\n- 作物：草莓\n- 品种：红颜\n- 育苗场地：草莓育苗区\n- 负责人：吴美丽' },
  // ========== 种植计划 ==========
  { id: 'B301', batchCode: 'ZZB2026-001', planType: PlanType.PLANTING, planTypeName: '种植计划', cropName: '番茄', cropType: '茄果类', variety: '红果番茄', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', plantingArea: 3000, stage: 'vegetative', stageName: '生长期', startDate: '2026-03-25', expectedHarvestDate: '2026-07-15', targetYield: 30000, actualYield: 0, status: 'planned', plantingMode: '椰糠种植', responsiblePerson: '郭靖', publisher: '陆启闯', publishDate: '2026-03-20', lastModifyDate: '2026-03-20', batchStatus: 'published', targetQuantity: 30000, planDetailFileName: '番茄种植计划-ZZB2026-001.md', planDetail: '# 番茄种植计划 ZZB2026-001\n\n## 基本信息\n- 批次号：ZZB2026-001\n- 计划类型：种植计划\n- 作物：番茄\n- 品种：红果番茄\n- 种植区域：玻璃温室A区\n- 种植面积：3000 m²\n- 负责人：郭靖' },
  { id: 'B302', batchCode: 'ZZB2026-002', planType: PlanType.PLANTING, planTypeName: '种植计划', cropName: '黄瓜', cropType: '瓜类', variety: '水果黄瓜', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', plantingArea: 2500, stage: 'seedling', stageName: '苗期', startDate: '2026-03-20', expectedHarvestDate: '2026-06-20', targetYield: 25000, actualYield: 0, status: 'planned', plantingMode: '椰糠种植', responsiblePerson: '黄蓉', publisher: '陆启闯', publishDate: '2026-03-15', lastModifyDate: '2026-03-15', batchStatus: 'published', targetQuantity: 25000, planDetailFileName: '黄瓜种植计划-ZZB2026-002.md', planDetail: '# 黄瓜种植计划 ZZB2026-002\n\n## 基本信息\n- 批次号：ZZB2026-002\n- 计划类型：种植计划\n- 作物：黄瓜\n- 品种：水果黄瓜\n- 种植区域：玻璃温室B区\n- 种植面积：2500 m²\n- 负责人：黄蓉' },
  { id: 'B303', batchCode: 'ZZB2026-003', planType: PlanType.PLANTING, planTypeName: '种植计划', cropName: '草莓', cropType: '浆果类', variety: '红颜', greenhouseId: 'G004', greenhouseName: '日光温室1号', plantingArea: 800, stage: 'harvest', stageName: '采收期', startDate: '2025-11-01', expectedHarvestDate: '2026-04-30', targetYield: 5000, actualYield: 2100, status: 'in_progress', plantingMode: '土壤种植', responsiblePerson: '张无忌', publisher: '陆启闯', publishDate: '2025-10-25', lastModifyDate: '2026-04-10', batchStatus: 'in_progress', targetQuantity: 5000, planDetailFileName: '草莓种植计划-ZZB2026-003.md', planDetail: '# 草莓种植计划 ZZB2026-003\n\n## 基本信息\n- 批次号：ZZB2026-003\n- 计划类型：种植计划\n- 作物：草莓\n- 品种：红颜\n- 种植区域：日光温室1号\n- 种植面积：800 m²\n- 负责人：张无忌' },
] as any;

// 任务工单数据
export const tasks: Task[] = [
  { id: 'T001', taskCode: 'WD20240315-001', title: '番茄浇水', type: 'irrigation', typeName: '浇水', priority: 'high', status: 'pending', batchId: 'B001', batchCode: 'FQ2024-001', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', mode: 'glass', assigneeId: 'U006', assigneeName: '陈小芳', assignerId: 'U003', assignerName: '王建国', dueDate: '2024-03-15', workDuration: 2, requiredMaterials: [], description: '按照灌溉方案进行浇水，水量控制在每株2升', actualWorkload: 0 },
  { id: 'T002', taskCode: 'WD20240315-002', title: '黄瓜施肥', type: 'fertilization', typeName: '施肥', priority: 'high', status: 'in_progress', batchId: 'B002', batchCode: 'FQ2024-002', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', mode: 'glass', assigneeId: 'U007', assigneeName: '周志强', assignerId: 'U003', assignerName: '王建国', dueDate: '2024-03-15', startTime: '2024-03-15 08:30', workDuration: 3, requiredMaterials: [{ materialId: 'MT003', materialName: '水溶肥', requiredQuantity: 5, actualQuantity: 0, unit: '袋' }], description: '使用水溶肥20-20-20进行叶面喷施，每亩用量5公斤', actualWorkload: 0 },
  { id: 'T003', taskCode: 'WD20240315-003', title: '草莓采收', type: 'harvest', typeName: '采收', priority: 'high', status: 'completed', batchId: 'B003', batchCode: 'FQ2024-003', greenhouseId: 'G004', greenhouseName: '日光温室1号', mode: 'solar', assigneeId: 'U008', assigneeName: '吴美丽', assignerId: 'U012', assignerName: '马超', dueDate: '2024-03-14', startTime: '2024-03-14 07:00', endTime: '2024-03-14 11:00', workDuration: 4, requiredMaterials: [], description: '采摘成熟度达到90%的草莓果', actualWorkload: 120, notes: '采摘草莓120公斤，品质良好', images: [] },
  { id: 'T004', taskCode: 'WD20240315-004', title: '生菜巡田', type: 'scouting', typeName: '巡田', priority: 'medium', status: 'pending', batchId: 'B004', batchCode: 'FQ2024-004', greenhouseId: 'G005', greenhouseName: '日光温室2号', mode: 'solar', assigneeId: 'U004', assigneeName: '赵文静', assignerId: 'U003', assignerName: '王建国', dueDate: '2024-03-15', workDuration: 1, requiredMaterials: [], description: '检查生菜生长情况，记录温湿度数据', actualWorkload: 0 },
  { id: 'T005', taskCode: 'WD20240315-005', title: '辣椒打药', type: 'spraying', typeName: '打药', priority: 'medium', status: 'pending', batchId: 'B005', batchCode: 'FQ2024-005', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', mode: 'glass', assigneeId: 'U009', assigneeName: '郑胜利', assignerId: 'U005', assignerName: '刘大海', dueDate: '2024-03-16', workDuration: 2, requiredMaterials: [{ materialId: 'MT004', materialName: '吡虫啉', requiredQuantity: 3, actualQuantity: 0, unit: '袋' }, { materialId: 'MT005', materialName: '多菌灵', requiredQuantity: 2, actualQuantity: 0, unit: '袋' }], description: '预防白粉虱和灰霉病', actualWorkload: 0 },
  { id: 'T006', taskCode: 'WD20240315-006', title: '西瓜定植', type: 'pruning', typeName: '定植', priority: 'high', status: 'completed', batchId: 'B007', batchCode: 'FQ2024-007', greenhouseId: 'G010', greenhouseName: '露天种植区', mode: 'solar', assigneeId: 'U011', assigneeName: '马超', assignerId: 'U003', assignerName: '王建国', dueDate: '2024-03-15', startTime: '2024-03-15 06:00', endTime: '2024-03-15 12:00', workDuration: 6, requiredMaterials: [{ materialId: 'MT012', materialName: '草莓苗', requiredQuantity: 1000, actualQuantity: 1000, unit: '株' }], description: '按照行株距1.5m×0.5m进行定植', actualWorkload: 1000, notes: '已完成1000株西瓜苗的定植工作', images: [] },
  { id: 'T007', taskCode: 'WD20240315-007', title: '菠菜浇水', type: 'irrigation', typeName: '浇水', priority: 'medium', status: 'pending', batchId: 'B006', batchCode: 'FQ2024-006', greenhouseId: 'G008', greenhouseName: '塑料大棚1号', mode: 'solar', assigneeId: 'U006', assigneeName: '陈小芳', assignerId: 'U012', assignerName: '马超', dueDate: '2024-03-15', workDuration: 1.5, requiredMaterials: [], description: '保持土壤湿润', actualWorkload: 0 },
  { id: 'T008', taskCode: 'WD20240315-008', title: '茄子整枝', type: 'pruning', typeName: '整枝', priority: 'low', status: 'pending', batchId: 'B008', batchCode: 'FQ2024-008', greenhouseId: 'G007', greenhouseName: '日光温室4号', mode: 'solar', assigneeId: 'U007', assigneeName: '周志强', assignerId: 'U004', assignerName: '赵文静', dueDate: '2024-03-17', workDuration: 2, requiredMaterials: [], description: '去除侧枝和老叶', actualWorkload: 0 },
  { id: 'T009', taskCode: 'WD20240320-009', title: '水稻除草', type: 'weeding', typeName: '除草', priority: 'high', status: 'pending', batchId: 'B009', batchCode: 'FQ2024-009', greenhouseId: 'G011', greenhouseName: '大田A区', mode: 'field', assigneeId: 'U004', assigneeName: '赵文静', assignerId: 'U003', assignerName: '王建国', dueDate: '2024-03-20', workDuration: 3, requiredMaterials: [], description: '人工除草，保持田间清洁', actualWorkload: 0 },
  { id: 'T010', taskCode: 'WD20240320-010', title: '玉米施肥', type: 'fertilization', typeName: '施肥', priority: 'high', status: 'in_progress', batchId: 'B010', batchCode: 'FQ2024-010', greenhouseId: 'G012', greenhouseName: '大田B区', mode: 'field', assigneeId: 'U007', assigneeName: '周志强', assignerId: 'U003', assignerName: '王建国', dueDate: '2024-03-20', startTime: '2024-03-20 08:00', workDuration: 4, requiredMaterials: [{ materialId: 'MT006', materialName: '尿素', requiredQuantity: 10, actualQuantity: 0, unit: '袋' }], description: '使用尿素进行追肥，每亩用量15公斤', actualWorkload: 0 },
  { id: 'T011', taskCode: 'WD20240321-011', title: '小麦巡田', type: 'scouting', typeName: '巡田', priority: 'medium', status: 'pending', batchId: 'B011', batchCode: 'FQ2024-011', greenhouseId: 'G013', greenhouseName: '大田C区', mode: 'field', assigneeId: 'U008', assigneeName: '吴美丽', assignerId: 'U012', assignerName: '马超', dueDate: '2024-03-21', workDuration: 2, requiredMaterials: [], description: '检查小麦生长情况，记录病虫害情况', actualWorkload: 0 },
  { id: 'T012', taskCode: 'WD20240322-012', title: '水稻采收', type: 'harvest', typeName: '采收', priority: 'high', status: 'pending', batchId: 'B012', batchCode: 'FQ2024-012', greenhouseId: 'G014', greenhouseName: '大田D区', mode: 'field', assigneeId: 'U011', assigneeName: '马超', assignerId: 'U003', assignerName: '王建国', dueDate: '2024-03-22', workDuration: 6, requiredMaterials: [], description: '机械采收水稻，预计产量5000公斤', actualWorkload: 0 },
];

// 物资申请数据
export const materialRequests: MaterialRequest[] = [
  { id: 'MR001', requestCode: 'RQ20240315-001', batchId: 'B002', batchCode: 'FQ2024-002', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', requesterId: 'U003', requesterName: '王建国', requestDate: '2024-03-15', materials: [{ materialId: 'MT003', materialName: '水溶肥', requiredQuantity: 5, actualQuantity: 5, unit: '袋' }], status: 'approved', approverId: 'U002', approverName: '李明辉', approveDate: '2024-03-15', approverComment: '同意领取' },
  { id: 'MR002', requestCode: 'RQ20240315-002', batchId: 'B005', batchCode: 'FQ2024-005', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', requesterId: 'U005', requesterName: '刘大海', requestDate: '2024-03-14', materials: [{ materialId: 'MT004', materialName: '吡虫啉', requiredQuantity: 3, actualQuantity: 0, unit: '袋' }, { materialId: 'MT005', materialName: '多菌灵', requiredQuantity: 2, actualQuantity: 0, unit: '袋' }], status: 'pending' },
  { id: 'MR003', requestCode: 'RQ20240315-003', batchId: 'B001', batchCode: 'FQ2024-001', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', requesterId: 'U003', requesterName: '王建国', requestDate: '2024-03-13', materials: [{ materialId: 'MT007', materialName: '椰糠', requiredQuantity: 50, actualQuantity: 50, unit: '袋' }, { materialId: 'MT008', materialName: '珍珠岩', requiredQuantity: 30, actualQuantity: 30, unit: '袋' }], status: 'fulfilled', approverId: 'U010', approverName: '孙丽娜', approveDate: '2024-03-13' },
];

// IoT传感器数据
export const iotSensors: IoTSensor[] = [
  // 玻璃温室A区
  { id: 'S001', sensorId: 'TEMP-001', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', type: 'air_temp', typeName: '空气温度', value: 24.5, unit: '℃', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S002', sensorId: 'HUMI-001', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', type: 'air_humidity', typeName: '空气湿度', value: 68, unit: '%', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S003', sensorId: 'SOIL-001', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', type: 'soil_moisture', typeName: '土壤湿度', value: 45, unit: '%', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S004', sensorId: 'LIGHT-001', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', type: 'light', typeName: '光照强度', value: 850, unit: 'lux', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S005', sensorId: 'CO2-001', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', type: 'co2', typeName: 'CO2含量', value: 420, unit: 'ppm', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S011', sensorId: 'SOILTEMP-001', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', type: 'soil_temp', typeName: '土壤温度', value: 22.3, unit: '℃', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S012', sensorId: 'SOILEC-001', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', type: 'soil_ec', typeName: '土壤EC值', value: 1.2, unit: 'mS/cm', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S013', sensorId: 'SOILPH-001', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', type: 'soil_ph', typeName: '土壤PH值', value: 6.5, unit: '', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  // 玻璃温室B区
  { id: 'S006', sensorId: 'TEMP-002', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', type: 'air_temp', typeName: '空气温度', value: 26.2, unit: '℃', status: 'warning', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S007', sensorId: 'HUMI-002', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', type: 'air_humidity', typeName: '空气湿度', value: 75, unit: '%', status: 'warning', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S014', sensorId: 'SOIL-003', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', type: 'soil_moisture', typeName: '土壤湿度', value: 52, unit: '%', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S015', sensorId: 'LIGHT-002', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', type: 'light', typeName: '光照强度', value: 920, unit: 'lux', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S016', sensorId: 'CO2-002', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', type: 'co2', typeName: 'CO2含量', value: 380, unit: 'ppm', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S017', sensorId: 'SOILTEMP-002', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', type: 'soil_temp', typeName: '土壤温度', value: 23.1, unit: '℃', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S018', sensorId: 'SOILEC-002', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', type: 'soil_ec', typeName: '土壤EC值', value: 1.5, unit: 'mS/cm', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S019', sensorId: 'SOILPH-002', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', type: 'soil_ph', typeName: '土壤PH值', value: 6.8, unit: '', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  // 日光温室1号
  { id: 'S008', sensorId: 'TEMP-003', greenhouseId: 'G004', greenhouseName: '日光温室1号', type: 'air_temp', typeName: '空气温度', value: 22.8, unit: '℃', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S020', sensorId: 'HUMI-003', greenhouseId: 'G004', greenhouseName: '日光温室1号', type: 'air_humidity', typeName: '空气湿度', value: 72, unit: '%', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S009', sensorId: 'SOIL-002', greenhouseId: 'G004', greenhouseName: '日光温室1号', type: 'soil_moisture', typeName: '土壤湿度', value: 55, unit: '%', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S021', sensorId: 'LIGHT-003', greenhouseId: 'G004', greenhouseName: '日光温室1号', type: 'light', typeName: '光照强度', value: 1200, unit: 'lux', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S022', sensorId: 'CO2-003', greenhouseId: 'G004', greenhouseName: '日光温室1号', type: 'co2', typeName: 'CO2含量', value: 450, unit: 'ppm', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S023', sensorId: 'SOILTEMP-003', greenhouseId: 'G004', greenhouseName: '日光温室1号', type: 'soil_temp', typeName: '土壤温度', value: 21.5, unit: '℃', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S024', sensorId: 'SOILEC-003', greenhouseId: 'G004', greenhouseName: '日光温室1号', type: 'soil_ec', typeName: '土壤EC值', value: 0.8, unit: 'mS/cm', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S025', sensorId: 'SOILPH-003', greenhouseId: 'G004', greenhouseName: '日光温室1号', type: 'soil_ph', typeName: '土壤PH值', value: 7.2, unit: '', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  // 玻璃温室C区
  { id: 'S010', sensorId: 'TEMP-004', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', type: 'air_temp', typeName: '空气温度', value: 32.1, unit: '℃', status: 'critical', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S026', sensorId: 'HUMI-004', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', type: 'air_humidity', typeName: '空气湿度', value: 45, unit: '%', status: 'critical', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S027', sensorId: 'SOIL-004', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', type: 'soil_moisture', typeName: '土壤湿度', value: 38, unit: '%', status: 'warning', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S028', sensorId: 'LIGHT-004', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', type: 'light', typeName: '光照强度', value: 1500, unit: 'lux', status: 'critical', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S029', sensorId: 'CO2-004', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', type: 'co2', typeName: 'CO2含量', value: 350, unit: 'ppm', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S030', sensorId: 'SOILTEMP-004', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', type: 'soil_temp', typeName: '土壤温度', value: 26.8, unit: '℃', status: 'critical', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S031', sensorId: 'SOILEC-004', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', type: 'soil_ec', typeName: '土壤EC值', value: 2.1, unit: 'mS/cm', status: 'warning', lastUpdate: '2024-03-15 10:30:00' },
  { id: 'S032', sensorId: 'SOILPH-004', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', type: 'soil_ph', typeName: '土壤PH值', value: 6.2, unit: '', status: 'normal', lastUpdate: '2024-03-15 10:30:00' },
];

// 巡田记录数据
// 番茄图片（红色系）- 使用简化SVG
const tomatoImages = [
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23ff6b6b"%3E🍅%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23ee5a5a"%3E🍅%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23ff8787"%3E🍅%3C/text%3E%3C/svg%3E',
];

// 黄瓜图片（绿色系）
const cucumberImages = [
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%2300cc00"%3E🥒%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%2300e600"%3E🥒%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%2300ff00"%3E🥒%3C/text%3E%3C/svg%3E',
];

// 草莓图片（粉红色系）
const strawberryImages = [
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23ff6b9d"%3E🍓%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23ff8fab"%3E🍓%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23ff5a8a"%3E🍓%3C/text%3E%3C/svg%3E',
];

// 辣椒图片（红色系）
const pepperImages = [
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23ff0000"%3E🌶️%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23ee1111"%3E🌶️%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23ff3333"%3E🌶️%3C/text%3E%3C/svg%3E',
];

// 生菜图片（绿色系）
const lettuceImages = [
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%2300cc00"%3E🥬%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%2300dd00"%3E🥬%3C/text%3E%3C/svg%3E',
];

// 菠菜图片（深绿色系）
const spinachImages = [
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23006600"%3E🥬%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%23008800"%3E🥬%3C/text%3E%3C/svg%3E',
];

// 茄子图片（紫色系）
const eggplantImages = [
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%238B00FF"%3E🍆%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%239900FF"%3E🍆%3C/text%3E%3C/svg%3E',
];

// 白菜图片（浅绿色系）
const cabbageImages = [
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%2399ff00"%3E🥬%3C/text%3E%3C/svg%3E',
  'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23ffffff"/%3E%3Ctext x="50" y="55" font-size="40" text-anchor="middle" fill="%2388ee00"%3E🥬%3C/text%3E%3C/svg%3E',
];

// 巡查记录数据 - 完整模拟数据，匹配新建弹窗和表格所有字段
export const inspectionRecords: InspectionRecord[] = [
  // ========== 种植区域巡查记录 ==========
  {
    id: 'IR002',
    recordCode: 'XT20260409-001',
    inspectorId: 'U004',
    inspectorName: '郭靖',
    greenhouseId: 'G002',
    greenhouseName: '玻璃温室B区',
    cropName: '黄瓜',
    checkDate: '2026-04-09',
    checkTime: '14:30:00',
    cropStatus: '轻微萎蔫',
    plantHeight: 85,
    leafCount: 8,
    issues: ['轻微缺水', '温度偏高'],
    images: cucumberImages,
    weather: '晴',
    temperature: 32,
    humidity: 58,
    remarks: '黄瓜有轻微缺水现象，需要及时浇水',
    status: 'attention',
    airTemperature: 32.2,
    airHumidity: 58,
    lightIntensity: 45000,
    co2Concentration: 390,
    soilTemperature: 26.1,
    soilMoisture: 38,
    soilEc: 1.5,
    soilPh: 6.8,
    inspectionType: 'farm',
    batchId: 'B002',
    batchCode: 'FQ2026-002',
    issueCategories: ['environment'],
    issuePresets: ['温度过高', '湿度过大', '缺水'],
    issueText: '黄瓜叶片出现轻微萎蔫，大棚内温度偏高导致，建议增加通风遮阳',
    issueSeverity: '中等',
    issuePhotos: cucumberImages.slice(0, 2),
    feedbackUsers: ['郭靖', '黄蓉'],
    expectedCompletion: 'today',
    issueStatus: 'processing',
    problemId: 1,
  },
  {
    id: 'IR003',
    recordCode: 'XT20260408-001',
    inspectorId: 'U005',
    inspectorName: '杨过',
    greenhouseId: 'G004',
    greenhouseName: '日光温室1号',
    cropName: '草莓',
    checkDate: '2026-04-08',
    checkTime: '10:00:00',
    cropStatus: '生长正常',
    plantHeight: 25,
    leafCount: 6,
    issues: ['白粉虱'],
    images: strawberryImages,
    weather: '多云',
    temperature: 22,
    humidity: 70,
    remarks: '发现少量白粉虱，建议近期安排打药',
    status: 'attention',
    airTemperature: 22.1,
    airHumidity: 70,
    lightIntensity: 28000,
    co2Concentration: 520,
    soilTemperature: 20.5,
    soilMoisture: 65,
    soilEc: 1.0,
    soilPh: 6.2,
    inspectionType: 'farm',
    batchId: 'B003',
    batchCode: 'FQ2026-003',
    issueCategories: ['pest'],
    issuePresets: ['白粉虱', '蚜虫'],
    issueText: '草莓叶片发现白粉虱成虫，数量较少但需密切关注，发现2株有虫害迹象',
    issueSeverity: '轻微',
    issuePhotos: strawberryImages.slice(0, 3),
    feedbackUsers: ['杨过', '小龙女'],
    expectedCompletion: 'tomorrow',
    issueStatus: 'pending',
    problemId: 2,
  },
  {
    id: 'IR006',
    recordCode: 'XT20260406-001',
    inspectorId: 'U006',
    inspectorName: '黄蓉',
    greenhouseId: 'G006',
    greenhouseName: '日光温室3号',
    cropName: '菠菜',
    checkDate: '2026-04-06',
    checkTime: '15:30:00',
    cropStatus: '轻微萎蔫',
    plantHeight: 28,
    leafCount: 8,
    issues: ['土壤偏干'],
    images: spinachImages,
    weather: '阴',
    temperature: 18,
    humidity: 58,
    remarks: '菠菜需要尽快浇水，土壤湿度偏低',
    status: 'attention',
    airTemperature: 18.2,
    airHumidity: 58,
    lightIntensity: 22000,
    co2Concentration: 400,
    soilTemperature: 18.5,
    soilMoisture: 38,
    soilEc: 1.1,
    soilPh: 6.4,
    inspectionType: 'farm',
    batchId: 'B006',
    batchCode: 'FQ2026-006',
    issueCategories: ['environment'],
    issuePresets: ['缺水', '土壤偏干'],
    issueText: '菠菜出现轻微萎蔫，土壤湿度偏低，需要立即灌溉',
    issueSeverity: '轻微',
    issuePhotos: spinachImages.slice(0, 2),
    feedbackUsers: ['黄蓉', '郭靖'],
    expectedCompletion: 'today',
    issueStatus: 'resolved',
    problemId: 3,
  },
  {
    id: 'IR008',
    recordCode: 'XT20260404-001',
    inspectorId: 'U008',
    inspectorName: '小龙女',
    greenhouseId: 'G008',
    greenhouseName: '塑料大棚1号',
    cropName: '白菜',
    checkDate: '2026-04-04',
    checkTime: '14:15:00',
    cropStatus: '生长正常',
    plantHeight: 35,
    leafCount: 9,
    issues: ['少量菜青虫'],
    images: cabbageImages,
    weather: '多云',
    temperature: 19,
    humidity: 72,
    remarks: '发现少量菜青虫，已做记录',
    status: 'attention',
    airTemperature: 19.2,
    airHumidity: 72,
    lightIntensity: 26000,
    co2Concentration: 410,
    soilTemperature: 18.8,
    soilMoisture: 62,
    soilEc: 0.8,
    soilPh: 6.2,
    inspectionType: 'farm',
    batchId: undefined,
    batchCode: undefined,
    issueCategories: ['pest'],
    issuePresets: ['菜青虫', '蚜虫'],
    issueText: '大白菜叶片发现菜青虫虫害，发现3株有虫害迹象',
    issueSeverity: '中等',
    issuePhotos: cabbageImages.slice(0, 2),
    feedbackUsers: ['小龙女', '杨过'],
    expectedCompletion: 'tomorrow',
    issueStatus: 'pending',
    problemId: 4,
  },
  // ========== 设备保养巡查记录 ==========
  {
    id: 'IR009',
    recordCode: 'XT20260403-001',
    inspectorId: 'U003',
    inspectorName: '令狐冲',
    greenhouseId: 'G001',
    greenhouseName: '玻璃温室A区',
    cropName: '',
    checkDate: '2026-04-03',
    checkTime: '10:00:00',
    cropStatus: '',
    plantHeight: undefined,
    leafCount: undefined,
    issues: ['水泵轴承磨损'],
    images: [],
    weather: '晴',
    temperature: 22,
    humidity: 60,
    remarks: '1号水泵需要更换轴承，运行时异响',
    status: 'attention',
    inspectionType: 'equipment',
    batchId: undefined,
    batchCode: undefined,
    equipmentId: 'EQ001',
    equipmentName: '1号灌溉水泵',
    duration: 45,
    issueCategories: ['equipment'],
    issuePresets: ['滴灌异常', '设备异响'],
    issueText: '1号灌溉水泵运行时异响，拆检发现轴承磨损严重，需要更换轴承',
    issueSeverity: '中等',
    issuePhotos: [],
    feedbackUsers: ['令狐冲', '任盈盈'],
    expectedCompletion: 'three_days',
    issueStatus: 'processing',
    problemId: 5,
  },
  // ========== 基础设施巡检记录 ==========
  {
    id: 'IR012',
    recordCode: 'XT20260412-001',
    inspectorId: 'U006',
    inspectorName: '黄蓉',
    greenhouseId: 'G005',
    greenhouseName: '日光温室2号',
    cropName: '',
    checkDate: '2026-04-12',
    checkTime: '09:00:00',
    cropStatus: '',
    plantHeight: undefined,
    leafCount: undefined,
    issues: ['滴灌主管道漏水'],
    images: [],
    weather: '晴',
    temperature: 20,
    humidity: 70,
    remarks: '滴灌系统主管道接头处漏水，已临时封堵',
    status: 'critical',
    inspectionType: 'infrastructure',
    batchId: undefined,
    batchCode: undefined,
    infrastructureId: 'INF001',
    infrastructureName: '2号温室滴灌系统',
    duration: 60,
    issueCategories: ['equipment'],
    issuePresets: ['滴灌异常', '管道漏水'],
    issueText: '2号温室滴灌系统主供水管道接头处严重漏水，已用胶带临时封堵，需要采购新接头进行修复',
    issueSeverity: '严重',
    issuePhotos: [],
    feedbackUsers: ['郭靖', '黄蓉'],
    expectedCompletion: 'today',
    issueStatus: 'processing',
    problemId: 6,
  },
];

// 设备数据（用于设备保养巡查）
export const equipmentRecords: Equipment[] = [
  { id: 'EQ001', code: 'EQ001', name: '1号灌溉水泵', type: '水泵', location: '玻璃温室A区', greenhouseId: 'G001', status: 'normal', lastMaintenanceDate: '2026-01-15', nextMaintenanceDate: '2026-04-15' },
  { id: 'EQ002', code: 'EQ002', name: '2号灌溉水泵', type: '水泵', location: '玻璃温室B区', greenhouseId: 'G002', status: 'normal', lastMaintenanceDate: '2026-01-20', nextMaintenanceDate: '2026-04-20' },
  { id: 'EQ003', code: 'EQ003', name: '1号通风扇', type: '通风设备', location: '玻璃温室C区', greenhouseId: 'G003', status: 'normal', lastMaintenanceDate: '2026-02-10', nextMaintenanceDate: '2026-05-10' },
  { id: 'EQ004', code: 'EQ004', name: '2号通风扇', type: '通风设备', location: '日光温室1号', greenhouseId: 'G004', status: 'maintenance', lastMaintenanceDate: '2025-12-01', nextMaintenanceDate: '2026-03-01' },
  { id: 'EQ005', code: 'EQ005', name: '1号卷帘机', type: '卷帘设备', location: '日光温室2号', greenhouseId: 'G005', status: 'normal', lastMaintenanceDate: '2026-02-28', nextMaintenanceDate: '2026-05-28' },
  { id: 'EQ006', code: 'EQ006', name: '自动施肥机', type: '施肥设备', location: '塑料大棚1号', greenhouseId: 'G008', status: 'normal', lastMaintenanceDate: '2026-03-01', nextMaintenanceDate: '2026-06-01' },
  { id: 'EQ007', code: 'EQ007', name: '滴灌控制系统', type: '灌溉设备', location: '玻璃温室A区', greenhouseId: 'G001', status: 'normal', lastMaintenanceDate: '2026-01-10', nextMaintenanceDate: '2026-04-10' },
  { id: 'EQ008', code: 'EQ008', name: '温室监控摄像头', type: '监控设备', location: '玻璃温室A区', greenhouseId: 'G001', status: 'broken', lastMaintenanceDate: '2025-11-20', nextMaintenanceDate: '2026-02-20' },
];

// 基础设施数据（用于基础设施巡检）
export const infrastructureRecords: Infrastructure[] = [
  { id: 'INF001', code: 'INF001', name: '2号温室滴灌系统', type: '灌溉', location: '日光温室2号', greenhouseId: 'G005', status: 'warning' },
  { id: 'INF002', code: 'INF002', name: '1号温室滴灌系统', type: '灌溉', location: '玻璃温室A区', greenhouseId: 'G001', status: 'normal' },
  { id: 'INF003', code: 'INF003', name: 'A区排水沟渠', type: '排水', location: '园区A区', status: 'normal' },
  { id: 'INF004', code: 'INF004', name: 'B区排水沟渠', type: '排水', location: '园区B区', status: 'normal' },
  { id: 'INF005', code: 'INF005', name: '供电线路A', type: '供电', location: '园区主干道', status: 'normal' },
  { id: 'INF006', code: 'INF006', name: '管理房仓库', type: '房屋', location: '园区入口', status: 'normal' },
  { id: 'INF007', code: 'INF007', name: '生产资料仓库', type: '房屋', location: '园区中部', status: 'warning' },
  { id: 'INF008', code: 'INF008', name: '园区主干道', type: '道路', location: '园区环形通道', status: 'normal' },
];

// 采收记录数据
export const harvestRecords: HarvestRecord[] = [
  { id: 'H001', harvestCode: 'HS20260314-001', batchId: 'B303', batchCode: 'ZZB2026-003', cropName: '草莓', greenhouseId: 'G004', greenhouseName: '日光温室1号', harvestDate: '2026-03-14', harvestArea: 600, harvestQuantity: 120, unit: '公斤', quality: 'good', grade: 'A', harvesterIds: ['U008'], harvesterNames: ['小龙女'], warehouseId: 'W001', warehouseName: '冷库A区', status: 'stored', auditor: '陆启闯', variety: '红颜', plantingMode: '土壤种植', targetYield: 3000 },
  { id: 'H002', harvestCode: 'HS20260313-001', batchId: 'B004', batchCode: 'FQ2026-004', cropName: '生菜', greenhouseId: 'G005', greenhouseName: '日光温室2号', harvestDate: '2026-03-13', harvestArea: 500, harvestQuantity: 350, unit: '公斤', quality: 'excellent', grade: 'A', harvesterIds: ['U006', 'U007'], harvesterNames: ['郭靖', '黄蓉'], warehouseId: 'W002', warehouseName: '冷库B区', status: 'pending', auditor: '陆启闯', variety: '散叶生菜', plantingMode: '水培', targetYield: 5000 },
  { id: 'H003', harvestCode: 'HS20260312-001', batchId: 'B006', batchCode: 'FQ2026-006', cropName: '菠菜', greenhouseId: 'G008', greenhouseName: '塑料大棚1号', harvestDate: '2026-03-12', harvestArea: 800, harvestQuantity: 280, unit: '公斤', quality: 'good', grade: 'B', harvesterIds: ['U006'], harvesterNames: ['杨过'], warehouseId: 'W002', warehouseName: '冷库B区', status: 'harvesting', auditor: '陆启闯', variety: '圆叶菠菜', plantingMode: '土壤种植', targetYield: 4000 },
  { id: 'H004', harvestCode: 'HS20260310-001', batchId: 'B301', batchCode: 'ZZB2026-001', cropName: '番茄', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', harvestDate: '2026-03-10', harvestArea: 3000, harvestQuantity: 1850, unit: '公斤', quality: 'excellent', grade: 'A', harvesterIds: ['U006', 'U007', 'U008'], harvesterNames: ['张无忌', '令狐冲', '段誉'], warehouseId: 'W001', warehouseName: '冷库A区', status: 'harvested', auditor: '陆启闯', variety: '红果番茄', plantingMode: '椰糠种植', targetYield: 30000 },
  { id: 'H005', harvestCode: 'HS20260315-001', batchId: 'B302', batchCode: 'ZZB2026-002', cropName: '黄瓜', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', harvestDate: '2026-03-15', harvestArea: 2500, harvestQuantity: 680, unit: '公斤', quality: 'excellent', grade: 'A', harvesterIds: ['U007', 'U008'], harvesterNames: ['萧峰', '虚竹'], warehouseId: 'W001', warehouseName: '冷库A区', status: 'graded', auditor: '陆启闯', variety: '水果黄瓜', plantingMode: '椰糠种植', targetYield: 20000 },
  { id: 'H006', harvestCode: 'HS20260316-001', batchId: 'B005', batchCode: 'FQ2026-005', cropName: '辣椒', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', harvestDate: '2026-03-16', harvestArea: 2000, harvestQuantity: 420, unit: '公斤', quality: 'good', grade: 'B', harvesterIds: ['U006'], harvesterNames: ['周伯通'], warehouseId: 'W002', warehouseName: '冷库B区', status: 'stored', auditor: '陆启闯', variety: '青椒', plantingMode: '椰糠种植', targetYield: 15000 },
];

// 采购计划数据
export const purchasePlans = [
  {
    id: 'PP001',
    purchaseApplicationCode: 'PA202601001',
    relatedBatchCode: 'ZZB2026-001',
    purchaseType: 'production',
    purchaseTypeName: '生产物资采购',
    applicant: '郭靖',
    applicantId: 'U003',
    applicantDepartment: '生产部',
    applyDate: '2026-01-05',
    requiredDate: '2026-02-15',
    priority: 'high',
    priorityText: '高',
    status: 'completed',
    statusText: '已完成',
    itemCount: 2,
    remark: '春季番茄种植基肥和追肥采购',
    approvalPerson: 'Susan',
    items: [
      { id: 'I001', relatedBatchCode: 'ZZB2026-001', materialId: 'MT001', materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂-化学肥料', specification: '46% 50kg/袋', unit: '袋', quantity: 50, estimatedPrice: 120, estimatedTotalPrice: 6000, supplier: '鑫源农资公司', location: 'A区-01-01', batchNo: 'F20240101', productionDate: '2024-01-10', expiryDate: '2026-01-10', purpose: '春季基肥施用', remark: '用于番茄种植区' },
      { id: 'I002', relatedBatchCode: 'ZZB2026-001', materialId: 'MT002', materialCode: 'SP0201001', materialName: '商品有机肥', category: '肥料与土壤改良剂-有机肥', specification: '40kg/袋', unit: '袋', quantity: 30, estimatedPrice: 85, estimatedTotalPrice: 2550, supplier: '鑫源农资公司', location: 'A区-01-02', batchNo: 'U20240102', productionDate: '2024-01-15', expiryDate: '2026-01-15', purpose: '追肥使用', remark: '分两次施用' },
    ],
  },
  {
    id: 'PP002',
    purchaseApplicationCode: 'PA202601002',
    relatedBatchCode: 'ZZB2026-002',
    purchaseType: 'production',
    purchaseTypeName: '生产物资采购',
    applicant: '黄蓉',
    applicantId: 'U003',
    applicantDepartment: '生产部',
    applyDate: '2026-02-10',
    requiredDate: '2026-03-20',
    priority: 'high',
    priorityText: '高',
    status: 'purchasing',
    statusText: '采购中',
    itemCount: 2,
    remark: '黄瓜种植水溶肥和尿素采购',
    approvalPerson: 'Susan',
    items: [
      { id: 'I003', relatedBatchCode: 'ZZB2026-002', materialId: 'MT003', materialCode: 'SP0203001', materialName: '水溶肥', category: '肥料与土壤改良剂-水溶肥', specification: '20-20-20 5kg/袋', unit: '袋', quantity: 40, estimatedPrice: 150, estimatedTotalPrice: 6000, supplier: '丰达化肥厂', location: 'A区-02-01', batchNo: 'WF20240201', productionDate: '2024-02-01', expiryDate: '2025-08-01', purpose: '叶面喷施', remark: '稀释1000倍使用' },
      { id: 'I004', relatedBatchCode: 'ZZB2026-002', materialId: 'MT002', materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂-化学肥料', specification: '46% 50kg/袋', unit: '袋', quantity: 60, estimatedPrice: 85, estimatedTotalPrice: 5100, supplier: '丰达化肥厂', location: 'A区-01-02', batchNo: 'U20240201', productionDate: '2024-02-05', expiryDate: '2026-02-05', purpose: '根部追肥', remark: '分三次施用' },
    ],
  },
  {
    id: 'PP003',
    purchaseApplicationCode: 'PA202601003',
    relatedBatchCode: 'SC202604001',
    purchaseType: 'production',
    purchaseTypeName: '生产物资采购',
    applicant: '杨过',
    applicantId: 'U003',
    applicantDepartment: '生产部',
    applyDate: '2026-03-01',
    requiredDate: '2026-05-01',
    priority: 'high',
    priorityText: '高',
    status: 'pending',
    statusText: '待审批',
    itemCount: 2,
    remark: '茄子种植基地夏季肥料储备',
    approvalPerson: 'Susan',
    items: [
      { id: 'I005', relatedBatchCode: 'SC202604001', materialId: 'MT001', materialCode: 'SP0202001', materialName: '尿素', category: '肥料与土壤改良剂-化学肥料', specification: '46% 50kg/袋', unit: '袋', quantity: 80, estimatedPrice: 120, estimatedTotalPrice: 9600, supplier: '待确定', location: '待分配', batchNo: '', productionDate: '', expiryDate: '2026-05-01', purpose: '夏季基肥', remark: '用于黄瓜种植区' },
      { id: 'I006', relatedBatchCode: 'SC202604001', materialId: 'MT003', materialCode: 'SP0203001', materialName: '水溶肥', category: '肥料与土壤改良剂-水溶肥', specification: '20-20-20 5kg/袋', unit: '袋', quantity: 60, estimatedPrice: 150, estimatedTotalPrice: 9000, supplier: '待确定', location: '待分配', batchNo: '', productionDate: '', expiryDate: '2025-11-01', purpose: '滴灌施用', remark: '配合滴灌系统使用' },
    ],
  },
  {
    id: 'PP004',
    purchaseApplicationCode: 'PA202601004',
    relatedBatchCode: 'SC202604002',
    purchaseType: 'production',
    purchaseTypeName: '生产物资采购',
    applicant: '小龙女',
    applicantId: 'U004',
    applicantDepartment: '生产部',
    applyDate: '2026-03-10',
    requiredDate: '2026-04-15',
    priority: 'normal',
    priorityText: '中',
    status: 'pending',
    statusText: '待审批',
    itemCount: 2,
    remark: '辣椒病虫害防治农药采购',
    approvalPerson: 'Susan',
    items: [
      { id: 'I007', relatedBatchCode: 'SC202604002', materialId: 'MT004', materialCode: 'SP0301001', materialName: '吡虫啉', category: '农药与植保产品-杀虫剂', specification: '10% 100g/袋', unit: '袋', quantity: 100, estimatedPrice: 25, estimatedTotalPrice: 2500, supplier: '拜耳作物科学', location: 'B区-01-01', batchNo: 'P20240301', productionDate: '2024-01-20', expiryDate: '2026-01-20', purpose: '防治蚜虫和白粉虱', remark: '安全间隔期7天' },
      { id: 'I008', relatedBatchCode: 'SC202604002', materialId: 'MT005', materialCode: 'SP0302001', materialName: '多菌灵', category: '农药与植保产品-杀菌剂', specification: '50% 200g/袋', unit: '袋', quantity: 80, estimatedPrice: 18, estimatedTotalPrice: 1440, supplier: '拜耳作物科学', location: 'B区-01-02', batchNo: 'P20240302', productionDate: '2024-02-10', expiryDate: '2026-02-10', purpose: '防治灰霉病和早疫病', remark: '可与吡虫啉混用' },
    ],
  },
  {
    id: 'PP005',
    purchaseApplicationCode: 'PA202602001',
    relatedBatchCode: '',
    purchaseType: 'safety',
    purchaseTypeName: '劳保用品',
    applicant: '张无忌',
    applicantId: 'U005',
    applicantDepartment: '后勤部',
    applyDate: '2026-03-12',
    requiredDate: '2026-03-25',
    priority: 'low',
    priorityText: '低',
    status: 'completed',
    statusText: '已完成',
    itemCount: 2,
    remark: '第二季度生产车间劳保用品配发',
    approvalPerson: 'Susan',
    items: [
      { id: 'I009', relatedBatchCode: '', materialId: 'SA001', materialCode: 'SP0501001', materialName: '防护手套', category: '劳保用品-手部防护', specification: 'PU涂层 L码', unit: '双', quantity: 200, estimatedPrice: 8, estimatedTotalPrice: 1600, supplier: '安全用品批发中心', location: '仓库C区-02-01', batchNo: '', productionDate: '', expiryDate: '', purpose: '大棚作业防护', remark: '适合大棚潮湿环境使用' },
      { id: 'I010', relatedBatchCode: '', materialId: 'SA002', materialCode: 'SP0502001', materialName: '安全帽', category: '劳保用品-头部防护', specification: 'ABS塑料 蓝色', unit: '个', quantity: 50, estimatedPrice: 25, estimatedTotalPrice: 1250, supplier: '安全用品批发中心', location: '仓库C区-02-02', batchNo: '', productionDate: '', expiryDate: '', purpose: '车间施工防护', remark: '符合GB标准' },
    ],
  },
  {
    id: 'PP006',
    purchaseApplicationCode: 'PA202602002',
    relatedBatchCode: '',
    purchaseType: 'material',
    purchaseTypeName: '通用物资',
    applicant: '令狐冲',
    applicantId: 'U007',
    applicantDepartment: '办公室',
    applyDate: '2026-04-02',
    requiredDate: '2026-04-10',
    priority: 'normal',
    priorityText: '中',
    status: 'completed',
    statusText: '已完成',
    itemCount: 3,
    remark: '办公区域日常用品采购',
    approvalPerson: 'Susan',
    items: [
      { id: 'I011', relatedBatchCode: '', materialId: 'OF001', materialCode: 'SP0601001', materialName: '打印纸', category: '办公用品-纸张', specification: 'A4 70g 500张/包', unit: '包', quantity: 50, estimatedPrice: 22, estimatedTotalPrice: 1100, supplier: '得力文具供应商', location: '办公室仓库', batchNo: '', productionDate: '', expiryDate: '', purpose: '日常办公使用', remark: '' },
      { id: 'I012', relatedBatchCode: '', materialId: 'OF002', materialCode: 'SP0602001', materialName: '中性笔', category: '办公用品-书写工具', specification: '黑色 0.5mm', unit: '支', quantity: 200, estimatedPrice: 1.5, estimatedTotalPrice: 300, supplier: '得力文具供应商', location: '办公室仓库', batchNo: '', productionDate: '', expiryDate: '', purpose: '日常办公使用', remark: '每季度配发一次' },
      { id: 'I013', relatedBatchCode: '', materialId: 'OF003', materialCode: 'SP0603001', materialName: '垃圾桶', category: '办公用品-清洁用品', specification: '塑料 10L', unit: '个', quantity: 20, estimatedPrice: 15, estimatedTotalPrice: 300, supplier: '得力文具供应商', location: '办公室各楼层', batchNo: '', productionDate: '', expiryDate: '', purpose: '办公室日常清洁', remark: '按楼层配置' },
    ],
  },
  {
    id: 'PP007',
    purchaseApplicationCode: 'PA202603001',
    relatedBatchCode: 'SC202603001',
    purchaseType: 'equipment',
    purchaseTypeName: '设备采购',
    applicant: '任我行',
    applicantId: 'U006',
    applicantDepartment: '技术部',
    applyDate: '2026-04-02',
    requiredDate: '2026-05-15',
    priority: 'urgent',
    priorityText: '紧急',
    status: 'pending',
    statusText: '待审批',
    itemCount: 2,
    remark: '番茄基地环境监测设备升级',
    approvalPerson: 'Susan',
    items: [
      { id: 'I014', relatedBatchCode: 'SC202603001', materialId: 'IT001', materialCode: 'IT0101001', materialName: '土壤温湿度传感器', category: '监测设备-传感器', specification: 'RS485 Modbus', unit: '个', quantity: 20, estimatedPrice: 580, estimatedTotalPrice: 11600, supplier: '深圳传感科技', location: 'D区-01-01', batchNo: 'EQ20240401', productionDate: '2024-03-15', expiryDate: '', purpose: '测量土壤温湿度和EC值', remark: '精度±0.5%' },
      { id: 'I015', relatedBatchCode: 'SC202603001', materialId: 'IT002', materialCode: 'IT0102001', materialName: '温湿度记录仪', category: '监测设备-记录仪', specification: 'TH-200/台', unit: '台', quantity: 15, estimatedPrice: 320, estimatedTotalPrice: 4800, supplier: '深圳传感科技', location: 'D区-01-02', batchNo: 'EQ20240402', productionDate: '2024-03-20', expiryDate: '', purpose: '记录温室环境数据', remark: '数据可导出' },
    ],
  },
];

// 设备统计数据
export const equipmentStats = {
  autoMode: 8,
  manualMode: 2,
  faults: 1,
  offlineSensors: 3,
};

// 今日能耗数据
export const energyConsumption = {
  water: 120,
  electricity: 380,
  gas: 25,
  waterTrend: 10,
  electricityTrend: -5,
  gasTrend: 0,
  date: '2024-03-15',
};

// 生产进度数据
export const productionProgress = {
  harvestReady: 3,
  batches: [
    { name: '番茄', daysLeft: 3 },
    { name: '黄瓜', daysLeft: 5 },
    { name: '生菜', daysLeft: 7 },
  ],
};

// 库存预警数据
export const inventoryAlerts = {
  lowStockCount: 5,
  materials: [
    { name: '复合肥NPK', stock: 30, safeStock: 50 },
    { name: '尿素', stock: 50, safeStock: 80 },
    { name: '吡虫啉', stock: 60, safeStock: 100 },
  ],
};

// 今日任务分类数据
export const todayTasksBreakdown = {
  total: 12,
  farming: 5,
  harvest: 2,
  equipment: 3,
  approval: 2,
};

// 告警分类数据（4种告警）
export const alertsBreakdown = {
  total: 5,
  environment: 2,
  equipment: 1,
  pest: 1,
  farming: 1,
};

// 仪表盘统计数据
export const dashboardStats: DashboardStats = {
  activeBatches: 8,
  tasksDueToday: 8,
  pendingApprovals: 2,
  alerts: 3,
  inventoryAlerts: 5,
  totalYield: 6550,
  averageYield: 818.75,
  costThisMonth: 156800,
  workerCount: 12,
};

// 温度趋势数据
export const temperatureTrend = [
  { time: '00:00', value: 18.5 },
  { time: '02:00', value: 17.2 },
  { time: '04:00', value: 16.8 },
  { time: '06:00', value: 17.5 },
  { time: '08:00', value: 20.3 },
  { time: '10:00', value: 24.5 },
  { time: '12:00', value: 28.1 },
  { time: '14:00', value: 29.5 },
  { time: '16:00', value: 28.8 },
  { time: '18:00', value: 26.2 },
  { time: '20:00', value: 23.5 },
  { time: '22:00', value: 20.8 },
];

// 产量统计
export const yieldStats = [
  { month: '1月', yield: 1250, region: 'G001', crop: 'C001' },
  { month: '2月', yield: 1580, region: 'G001', crop: 'C001' },
  { month: '3月', yield: 2100, region: 'G002', crop: 'C002' },
  { month: '4月', yield: 1850, region: 'G002', crop: 'C002' },
  { month: '5月', yield: 2200, region: 'G003', crop: 'C003' },
  { month: '6月', yield: 1950, region: 'G004', crop: 'C004' },
];

// 成本分析
export const costAnalysis = [
  { name: '人工成本', value: 45000, period: 'month', crop: '', areaType: '' },
  { name: '化肥成本', value: 28000, period: 'month', crop: 'C001', areaType: 'greenhouse' },
  { name: '农药成本', value: 15000, period: 'month', crop: 'C002', areaType: 'greenhouse' },
  { name: '种子种苗', value: 22000, period: 'quarter', crop: '', areaType: '' },
  { name: '基质农膜', value: 18000, period: 'quarter', crop: 'C001', areaType: 'field' },
  { name: '能源成本', value: 15000, period: 'year', crop: '', areaType: '' },
  { name: '其他成本', value: 13800, period: 'month', crop: 'C003', areaType: 'field' },
];
