// 智慧种植生产管理系统模拟数据

import {
  User, CropBatch, Task, Material, MaterialRequest, Greenhouse,
  IoTSensor, InspectionRecord, HarvestRecord, Approval, Message,
  DashboardStats, CropType, Process, Department
} from '../types';

// 用户数据
export const users: User[] = [
  { id: 'U001', name: '张建国', avatar: 'ZGJ', role: 'admin', department: '技术部', position: '系统管理员' },
  { id: 'U002', name: '李明辉', avatar: 'LMH', role: 'manager', department: '生产部', position: '基地经理' },
  { id: 'U003', name: '王建国', avatar: 'WJG', role: 'supervisor', department: '生产部', position: '生产主管' },
  { id: 'U004', name: '赵文静', avatar: 'ZWJ', role: 'technician', department: '技术部', position: '农技员' },
  { id: 'U005', name: '刘大海', avatar: 'LDH', role: 'technician', department: '技术部', position: '质检员' },
  { id: 'U006', name: '陈小芳', avatar: 'CXF', role: 'worker', department: '生产部', position: '种植工' },
  { id: 'U007', name: '周志强', avatar: 'ZZQ', role: 'worker', department: '生产部', position: '种植工' },
  { id: 'U008', name: '吴美丽', avatar: 'WML', role: 'worker', department: '生产部', position: '种植工' },
  { id: 'U009', name: '郑胜利', avatar: 'ZSL', role: 'worker', department: '生产部', position: '农机手' },
  { id: 'U010', name: '孙丽娜', avatar: 'SLN', role: 'storekeeper', department: '仓储部', position: '库管员' },
  { id: 'U011', name: '马超', avatar: 'MC', role: 'worker', department: '生产部', position: '临时工' },
  { id: 'U012', name: '黄敏', avatar: 'HM', role: 'supervisor', department: '生产部', position: '生产组长' },
  { id: 'V001', name: '访客用户', avatar: 'FK', role: 'visitor', department: '演示部', position: '演示员' },
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
export const cropBatches: CropBatch[] = [
  { id: 'B001', batchCode: 'FQ2024-001', cropName: '番茄', cropType: '茄果类', variety: '红果番茄', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', plantingArea: 3000, stage: 'fruiting', stageName: '结果期', startDate: '2024-01-15', expectedHarvestDate: '2024-04-20', targetYield: 30000, actualYield: 18500, status: 'in_progress', plantingMode: '椰糠种植', responsiblePerson: '王建国' },
  { id: 'B002', batchCode: 'FQ2024-002', cropName: '黄瓜', cropType: '瓜类', variety: '水果黄瓜', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', plantingArea: 2500, stage: 'vegetative', stageName: '生长期', startDate: '2024-02-10', expectedHarvestDate: '2024-04-25', targetYield: 20000, actualYield: 0, status: 'in_progress', plantingMode: '椰糠种植', responsiblePerson: '王建国' },
  { id: 'B003', batchCode: 'FQ2024-003', cropName: '草莓', cropType: '浆果类', variety: '红颜', greenhouseId: 'G004', greenhouseName: '日光温室1号', plantingArea: 600, stage: 'harvest', stageName: '采收期', startDate: '2023-11-01', expectedHarvestDate: '2024-04-30', targetYield: 3000, actualYield: 2100, status: 'in_progress', plantingMode: '土壤种植', responsiblePerson: '赵文静' },
  { id: 'B004', batchCode: 'FQ2024-004', cropName: '生菜', cropType: '叶菜类', variety: '散叶生菜', greenhouseId: 'G005', greenhouseName: '日光温室2号', plantingArea: 500, stage: 'harvest', stageName: '采收期', startDate: '2024-02-20', expectedHarvestDate: '2024-04-15', targetYield: 5000, actualYield: 3200, status: 'in_progress', plantingMode: '水培', responsiblePerson: '陈小芳' },
  { id: 'B005', batchCode: 'FQ2024-005', cropName: '辣椒', cropType: '茄果类', variety: '青椒', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', plantingArea: 2000, stage: 'flowering', stageName: '开花期', startDate: '2024-01-25', expectedHarvestDate: '2024-05-10', targetYield: 15000, actualYield: 0, status: 'in_progress', plantingMode: '椰糠种植', responsiblePerson: '刘大海' },
  { id: 'B006', batchCode: 'FQ2024-006', cropName: '菠菜', cropType: '叶菜类', variety: '圆叶菠菜', greenhouseId: 'G008', greenhouseName: '塑料大棚1号', plantingArea: 800, stage: 'harvest', stageName: '采收期', startDate: '2024-03-01', expectedHarvestDate: '2024-04-10', targetYield: 4000, actualYield: 2800, status: 'in_progress', plantingMode: '土壤种植', responsiblePerson: '吴美丽' },
  { id: 'B007', batchCode: 'FQ2024-007', cropName: '西瓜', cropType: '瓜类', variety: '小型西瓜', greenhouseId: 'G010', greenhouseName: '露天种植区', plantingArea: 5000, stage: 'seedling', stageName: '苗期', startDate: '2024-03-15', expectedHarvestDate: '2024-06-20', targetYield: 25000, actualYield: 0, status: 'in_progress', plantingMode: '土壤种植', responsiblePerson: '周志强' },
  { id: 'B008', batchCode: 'FQ2024-008', cropName: '茄子', cropType: '茄果类', variety: '紫茄', greenhouseId: 'G007', greenhouseName: '日光温室4号', plantingArea: 600, stage: 'vegetative', stageName: '生长期', startDate: '2024-02-28', expectedHarvestDate: '2024-05-25', targetYield: 6000, actualYield: 0, status: 'in_progress', plantingMode: '椰糠种植', responsiblePerson: '赵文静' },
];

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

export const inspectionRecords: InspectionRecord[] = [
  { id: 'IR001', recordCode: 'INS20240315-001', inspectorId: 'U004', inspectorName: '赵文静', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', cropName: '番茄', checkDate: '2024-03-15 09:00:00', cropStatus: '生长正常', plantHeight: 145, leafCount: 12, issues: [], images: tomatoImages, weather: '晴', temperature: 24, humidity: 65, remarks: '番茄植株长势良好，果实发育正常', status: 'normal', airTemperature: 24.5, airHumidity: 65, lightIntensity: 35000, co2Concentration: 450, soilTemperature: 22.3, soilMoisture: 55, soilEc: 1.2, soilPh: 6.5 },
  { id: 'IR002', recordCode: 'INS20240315-002', inspectorId: 'U004', inspectorName: '赵文静', greenhouseId: 'G002', greenhouseName: '玻璃温室B区', cropName: '黄瓜', checkDate: '2024-03-15 09:30:00', cropStatus: '轻微萎蔫', plantHeight: 85, leafCount: 8, issues: ['轻微缺水', '温度偏高'], images: cucumberImages, weather: '晴', temperature: 28, humidity: 55, remarks: '黄瓜有轻微缺水现象，需要及时浇水', status: 'attention', airTemperature: 28.2, airHumidity: 55, lightIntensity: 42000, co2Concentration: 380, soilTemperature: 24.1, soilMoisture: 42, soilEc: 1.5, soilPh: 6.8 },
  { id: 'IR003', recordCode: 'INS20240314-001', inspectorId: 'U005', inspectorName: '刘大海', greenhouseId: 'G004', greenhouseName: '日光温室1号', cropName: '草莓', checkDate: '2024-03-14 14:00:00', cropStatus: '生长正常', plantHeight: 25, leafCount: 6, issues: ['白粉虱'], images: strawberryImages, weather: '多云', temperature: 22, humidity: 70, remarks: '发现少量白粉虱，建议近期安排打药', status: 'attention', airTemperature: 22.1, airHumidity: 70, lightIntensity: 28000, co2Concentration: 520, soilTemperature: 20.5, soilMoisture: 65, soilEc: 1.0, soilPh: 6.2 },
  { id: 'IR004', recordCode: 'INS20240314-002', inspectorId: 'U004', inspectorName: '赵文静', greenhouseId: 'G003', greenhouseName: '玻璃温室C区', cropName: '辣椒', checkDate: '2024-03-14 15:00:00', cropStatus: '生长正常', plantHeight: 120, leafCount: 14, issues: [], images: pepperImages, weather: '多云', temperature: 26, humidity: 60, remarks: '辣椒正处于开花期，长势良好', status: 'normal', airTemperature: 26.3, airHumidity: 60, lightIntensity: 38000, co2Concentration: 480, soilTemperature: 23.5, soilMoisture: 58, soilEc: 1.3, soilPh: 6.7 },
];

// 采收记录数据
export const harvestRecords: HarvestRecord[] = [
  { id: 'H001', harvestCode: 'HS20240314-001', batchId: 'B003', batchCode: 'FQ2024-003', cropName: '草莓', greenhouseId: 'G004', greenhouseName: '日光温室1号', harvestDate: '2024-03-14', harvestArea: 600, harvestQuantity: 120, unit: '公斤', quality: 'good', grade: 'A', harvesterIds: ['U008'], harvesterNames: ['吴美丽'], warehouseId: 'W001', warehouseName: '冷库A区', status: 'stored' },
  { id: 'H002', harvestCode: 'HS20240313-001', batchId: 'B004', batchCode: 'FQ2024-004', cropName: '生菜', greenhouseId: 'G005', greenhouseName: '日光温室2号', harvestDate: '2024-03-13', harvestArea: 500, harvestQuantity: 350, unit: '公斤', quality: 'excellent', grade: 'A', harvesterIds: ['U006', 'U007'], harvesterNames: ['陈小芳', '周志强'], warehouseId: 'W002', warehouseName: '冷库B区', status: 'stored' },
  { id: 'H003', harvestCode: 'HS20240312-001', batchId: 'B006', batchCode: 'FQ2024-006', cropName: '菠菜', greenhouseId: 'G008', greenhouseName: '塑料大棚1号', harvestDate: '2024-03-12', harvestArea: 800, harvestQuantity: 280, unit: '公斤', quality: 'good', grade: 'B', harvesterIds: ['U006'], harvesterNames: ['陈小芳'], warehouseId: 'W002', warehouseName: '冷库B区', status: 'stored' },
  { id: 'H004', harvestCode: 'HS20240310-001', batchId: 'B001', batchCode: 'FQ2024-001', cropName: '番茄', greenhouseId: 'G001', greenhouseName: '玻璃温室A区', harvestDate: '2024-03-10', harvestArea: 3000, harvestQuantity: 1850, unit: '公斤', quality: 'excellent', grade: 'A', harvesterIds: ['U006', 'U007', 'U008'], harvesterNames: ['陈小芳', '周志强', '吴美丽'], warehouseId: 'W001', warehouseName: '冷库A区', status: 'stored' },
];

// 审批数据
export const approvals: Approval[] = [
  { id: 'AP001', approvalCode: 'AP20240315-001', type: 'material_request', typeName: '物资申请', title: '黄瓜种植区水溶肥申请', applicantId: 'U003', applicantName: '王建国', applicantDepartment: '生产部', applyDate: '2024-03-15', status: 'pending', currentStep: 1, totalSteps: 2 },
  { id: 'AP002', approvalCode: 'AP20240315-002', type: 'production_plan', typeName: '生产计划', title: '西瓜种植计划申请', applicantId: 'U003', applicantName: '王建国', applicantDepartment: '生产部', applyDate: '2024-03-14', status: 'approved', approverId: 'U002', approverName: '李明辉', approveDate: '2024-03-14', comment: '同意执行', currentStep: 2, totalSteps: 2 },
  { id: 'AP003', approvalCode: 'AP20240314-001', type: 'purchase', typeName: '采购申请', title: '农药采购申请', applicantId: 'U005', applicantName: '刘大海', applicantDepartment: '技术部', applyDate: '2024-03-13', status: 'rejected', approverId: 'U002', approverName: '李明辉', approveDate: '2024-03-14', comment: '库存充足，暂不批准', currentStep: 1, totalSteps: 2 },
  { id: 'AP004', approvalCode: 'AP20240313-001', type: 'leave', typeName: '请假申请', title: '事假申请', applicantId: 'U006', applicantName: '陈小芳', applicantDepartment: '生产部', applyDate: '2024-03-12', status: 'approved', approverId: 'U003', approverName: '王建国', approveDate: '2024-03-12', comment: '同意', currentStep: 1, totalSteps: 1 },
];

// 消息数据
export const messages: Message[] = [
  { id: 'M001', type: 'task', title: '新任务派发', content: '您有一个新的浇水任务：番茄浇水（玻璃温室A区）', senderId: 'U003', senderName: '王建国', receiverId: 'U006', isRead: false, sendTime: '2024-03-15 10:00:00', link: '/tasks' },
  { id: 'M002', type: 'approval', title: '审批通知', content: '您提交的物资申请已通过审批', senderId: 'U002', senderName: '李明辉', receiverId: 'U003', isRead: false, sendTime: '2024-03-15 09:30:00', link: '/approvals' },
  { id: 'M003', type: 'alert', title: '温度预警', content: '玻璃温室C区当前温度32.1℃，超过警戒值30℃', senderId: 'SYSTEM', senderName: '系统', receiverId: 'U002', isRead: false, sendTime: '2024-03-15 10:35:00', link: '/iot' },
  { id: 'M004', type: 'notice', title: '天气提醒', content: '预计明天有强降雨，请各班组做好防雨措施', senderId: 'SYSTEM', senderName: '系统', receiverId: 'U003', isRead: true, sendTime: '2024-03-14 16:00:00' },
  { id: 'M005', type: 'system', title: '系统通知', content: '系统将于今晚22:00进行例行维护，预计持续30分钟', senderId: 'SYSTEM', senderName: '系统', receiverId: 'U001', isRead: true, sendTime: '2024-03-14 15:00:00' },
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
  farming: 5,      // 农事任务
  harvest: 2,     // 采收任务
  equipment: 3,   // 设备任务
  approval: 2,    // 待审批
};

// 告警分类数据（4种告警）
export const alertsBreakdown = {
  total: 5,
  environment: 2,    // 环境告警
  equipment: 1,      // 设备故障告警
  pest: 1,           // 病虫害预警
  farming: 1,        // 农事任务预警
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

// 当前登录用户
export const currentUser: User = users[users.length - 1]; // 访客用户（演示用）

// 部门数据
export const departments: Department[] = [
  { id: 'D001', name: '生产部', managerId: 'U002', managerName: '李明辉' },
  { id: 'D002', name: '技术部', managerId: 'U004', managerName: '赵文静' },
  { id: 'D003', name: '仓储部', managerId: 'U010', managerName: '孙丽娜' },
  { id: 'D004', name: '财务部', managerId: 'U013', managerName: '财务经理' },
  { id: 'D005', name: '综合办', managerId: 'U014', managerName: '行政经理' },
];
