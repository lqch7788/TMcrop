// 智慧种植生产管理系统类型定义

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'admin' | 'manager' | 'supervisor' | 'technician' | 'worker' | 'storekeeper';
  department: string;
  position: string;
}

export interface CropBatch {
  id: string;
  batchCode: string;
  cropName: string;
  cropType: string;
  variety: string;
  greenhouseId: string;
  greenhouseName: string;
  plantingArea: number;
  stage: 'seedling' | 'vegetative' | 'flowering' | 'fruiting' | 'harvest';
  stageName: string;
  startDate: string;
  expectedHarvestDate: string;
  targetYield: number;
  actualYield: number;
  status: 'planned' | 'in_progress' | 'suspended' | 'completed';
  plantingMode: string;
  responsiblePerson: string;
  // 新增字段
  publisher?: string; // 发布人
  publishDate?: string; // 初次发布时间
  lastModifyDate?: string; // 最后修改时间
  batchStatus?: 'draft' | 'published' | 'in_progress' | 'completed' | 'cancelled'; // 当前状态
  planDetailFileName?: string; // 计划详情文件名
  planDetail?: string; // 计划详情内容
}

export interface Task {
  id: string;
  taskCode: string;
  title: string;
  type: 'irrigation' | 'fertilization' | 'pruning' | 'harvest' | 'scouting' | 'spraying' | 'weeding';
  typeName: string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  batchId: string;
  batchCode: string;
  greenhouseId: string;
  greenhouseName: string;
  mode: 'glass' | 'solar';
  assigneeId: string;
  assigneeName: string;
  assignerId: string;
  assignerName: string;
  dueDate: string;
  startTime?: string;
  endTime?: string;
  workDuration: number;
  requiredMaterials: MaterialUsage[];
  description: string;
  actualWorkload: number;
  notes?: string;
  images?: string[];
  // 问题来源关联
  sourceProblemId?: number;
  // 任务进度（0-100）
  progress?: number;
}

// 临时任务类型
export type TempTaskUrgency = 'normal' | 'urgent' | 'critical';

export interface TempTask {
  id: string;
  taskCode: string;
  title: string;
  priority: 'high' | 'medium' | 'low';
  status: 'draft' | 'pending' | 'in_progress' | 'waiting_acceptance' | 'completed' | 'cancelled' | 'rejected' | 'pending_reassign';
  assigneeId: string;
  assigneeName: string;
  assignerId: string;
  assignerName: string;
  dueDate: string;
  description?: string;
  notes?: string;
  images?: string[];
  urgency: TempTaskUrgency;
  tempTaskType: string;
  workLocation: string;
  estimatedHours: number;
  rejectCount?: number;
}

// 临时任务配置
export const TEMP_TASK_URGENCY_CONFIG = {
  normal: { label: '普通', color: 'bg-gray-100 text-gray-600', badge: 'bg-gray-100 text-gray-700' },
  urgent: { label: '紧急', color: 'bg-amber-100 text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  critical: { label: '非常紧急', color: 'bg-red-100 text-red-700', badge: 'bg-red-500 text-white' },
} as const;

export const TEMP_TASK_TYPES = [
  '病虫害处理',
  '设备维修',
  '人员调配',
  '应急抢修',
  '其他',
] as const;

export interface Material {
  id: string;
  code: string;
  name: string;
  category: string;
  specification: string;
  unit: string;
  unitPrice: number;
  stockQuantity: number;
  safeStock: number;
  supplier: string;
  location: string;
}

export interface MaterialUsage {
  materialId: string;
  materialName: string;
  requiredQuantity: number;
  actualQuantity: number;
  unit: string;
}

export interface MaterialRequest {
  id: string;
  requestCode: string;
  batchId: string;
  batchCode: string;
  greenhouseId: string;
  greenhouseName: string;
  requesterId: string;
  requesterName: string;
  requestDate: string;
  materials: MaterialUsage[];
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled';
  approverId?: string;
  approverName?: string;
  approveDate?: string;
  approverComment?: string;
}

export interface Greenhouse {
  id: string;
  code: string;
  name: string;
  type: 'glass' | 'solar' | 'open';
  area: number;
  location: string;
  status: 'active' | 'maintenance' | 'inactive';
}

export interface IoTSensor {
  id: string;
  sensorId: string;
  greenhouseId: string;
  greenhouseName: string;
  type: 'air_temp' | 'air_humidity' | 'soil_temp' | 'soil_moisture' | 'soil_ec' | 'soil_ph' | 'light' | 'co2';
  typeName: string;
  value: number;
  unit: string;
  status: 'normal' | 'warning' | 'critical';
  lastUpdate: string;
}

// 设备数据（用于设备保养巡查）
export interface Equipment {
  id: string;
  code: string;           // 设备编号 E001
  name: string;            // 设备名称
  type: string;            // 设备类型：水泵/电机/通风扇/卷帘机等
  location: string;         // 安装位置
  greenhouseId?: string;   // 所属温室
  status: 'normal' | 'maintenance' | 'broken';
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
}

// 基础设施数据（用于基础设施巡检）
export interface Infrastructure {
  id: string;
  code: string;           // 设施编号 I001
  name: string;            // 设施名称
  type: string;            // 类型：灌溉/排水/供电/房屋/道路
  location: string;         // 位置描述
  greenhouseId?: string;   // 所属温室
  status: 'normal' | 'warning' | 'damaged';
}

export interface InspectionRecord {
  id: string;
  recordCode: string;
  inspectorId: string;
  inspectorName: string;
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  checkDate: string;
  checkTime?: string;        // 监测时间
  cropStatus: string;
  plantHeight?: number;
  leafCount?: number;
  issues: string[];
  images: string[];
  weather: string;
  temperature: number;
  humidity: number;
  remarks: string;
  status: 'normal' | 'attention' | 'critical';
  // 问题处理状态
  issueStatus?: 'pending' | 'processing' | 'resolved';
  // 巡田时长（分钟）
  duration?: number;
  // 环境参数
  airTemperature?: number;
  airHumidity?: number;
  lightIntensity?: number;
  co2Concentration?: number;
  soilTemperature?: number;
  soilMoisture?: number;
  soilEc?: number;
  soilPh?: number;
  // 数据闭环关联字段
  relatedTaskId?: string;   // 关联任务ID
  relatedTaskCode?: string; // 关联任务编号
  // 关联批次
  batchId?: string;
  batchCode?: string;
  // 巡查类型（扩展字段）
  inspectionType?: 'farm' | 'equipment' | 'infrastructure' | 'other';
  // 位置信息（二维码扫描）
  locationCode?: string;
  locationName?: string;
  // 设备保养专用
  equipmentId?: string;
  equipmentName?: string;
  // 基础设施巡检专用
  infrastructureId?: string;
  infrastructureName?: string;
  // 问题分类（多选）
  issueCategories?: string[];
  // 快速勾选的问题
  issuePresets?: string[];
  // 问题描述
  issueText?: string;
  // 问题严重程度
  issueSeverity?: '轻微' | '中等' | '严重';
  // 问题照片
  issuePhotos?: string[];
  // 反馈人员ID列表
  feedbackUsers?: string[];
  // 期望完成时间
  expectedCompletion?: string;
}

export interface HarvestRecord {
  id: string;
  harvestCode: string;
  batchId: string;
  batchCode: string;
  cropName: string;
  greenhouseId: string;
  greenhouseName: string;
  harvestDate: string;
  harvestArea: number;
  harvestQuantity: number;
  unit: string;
  quality: 'excellent' | 'good' | 'average' | 'poor';
  grade: 'A' | 'B' | 'C';
  harvesterIds: string[];
  harvesterNames: string[];
  warehouseId: string;
  warehouseName: string;
  status: 'harvested' | 'graded' | 'stored';
  // 数据闭环关联字段
  relatedTaskId?: string;   // 关联任务ID
  relatedTaskCode?: string; // 关联任务编号
}

export interface Approval {
  id: string;
  approvalCode: string;
  type: 'material_request' | 'production_plan' | 'purchase' | 'leave';
  typeName: string;
  title: string;
  applicantId: string;
  applicantName: string;
  applicantDepartment: string;
  applyDate: string;
  status: 'pending' | 'approved' | 'rejected';
  approverId?: string;
  approverName?: string;
  approveDate?: string;
  comment?: string;
  currentStep: number;
  totalSteps: number;
}

export interface Message {
  id: string;
  type: 'task' | 'approval' | 'alert' | 'notice' | 'system';
  title: string;
  content: string;
  senderId: string;
  senderName: string;
  receiverId: string;
  isRead: boolean;
  sendTime: string;
  link?: string;
}

export interface DashboardStats {
  activeBatches: number;
  tasksDueToday: number;
  pendingApprovals: number;
  alerts: number;
  inventoryAlerts: number;
  totalYield: number;
  averageYield: number;
  costThisMonth: number;
  workerCount: number;
}

export interface CropType {
  id: string;
  name: string;
  category: string;
  growthDays: number;
  suitableTemp: string;
  varieties: string[];
}

export interface Process {
  id: string;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  rewardRate: number;
}

export interface Department {
  id: string;
  name: string;
  parentId?: string;
  managerId: string;
  managerName: string;
}

export interface Position {
  id: string;
  name: string;
  departmentId: string;
  level: number;
  parentId?: string;
}

// 员工类型 - 农业种植管理系统专用
export interface Worker {
  // 基本信息
  id: string;
  workerId: string;           // 工号
  name: string;               // 姓名
  gender: '男' | '女';
  age: number;
  birthDate: string;          // 出生日期
  idCard: string;             // 身份证号
  photo?: string;             // 照片

  // 联系方式
  phone: string;              // 联系电话
  email?: string;            // 电子邮箱
  wechat?: string;           // 微信
  address: string;           // 户籍地址
  residenceAddress: string;  // 现居住地址

  // 紧急联系人
  emergencyContact: string;    // 紧急联系人
  emergencyRelation: string;  // 与紧急联系人关系
  emergencyPhone: string;    // 紧急联系电话

  // 工作信息
  department: string;         // 部门
  team: string;              // 班组
  position: string;          // 岗位/工种
  workArea: string;          // 作业区域
  skillLevel: '初级' | '中级' | '高级' | '技师';  // 技能等级
  skillTags: string[];        // 技能标签（如：打药、采摘、修剪、农机操作等）
  workYears: number;          // 工作年限
  wagesType: '计时' | '计件' | '月薪';  // 工资类型
  hourlyRate: number;        // 时薪（元）

  // 合同信息
  hireDate: string;          // 入职日期
  contractStatus: '新签' | '续签' | '到期' | '终止';
  contractType: '固定期限' | '无固定期限' | '临时';
  contractExpireDate: string; // 合同到期日期
  contractNo: string;         // 合同编号

  // 教育与培训
  education: '小学' | '初中' | '高中' | '中专' | '大专' | '本科' | '硕士及以上';
  major?: string;             // 专业
  trainingRecords: TrainingRecord[];  // 培训记录

  // 工作经历
  workExperiences: WorkExperience[];  // 工作经验

  // 考核信息
  annualAssessments: AssessmentRecord[];  // 年度考核记录

  // 状态
  status: '在职' | '离职' | '退休';
  leaveDate?: string;        // 离职日期（离职时填写）
  leaveReason?: string;      // 离职原因

  // 备注
  remarks?: string;           // 备注
}

// 培训记录
export interface TrainingRecord {
  id: string;
  trainingDate: string;      // 培训日期
  trainingType: string;      // 培训类型
  trainingContent: string;   // 培训内容
  trainingHours: number;    // 培训时长（小时）
  trainer: string;           // 培训讲师
  certificate?: string;      // 获得证书
  score?: number;            // 考核成绩
}

// 工作经验
export interface WorkExperience {
  id: string;
  company: string;          // 工作单位
  position: string;          // 岗位
  startDate: string;         // 开始日期
  endDate: string;           // 结束日期
  workContent: string;       // 工作内容
  leavingReason: string;     // 离职原因
}

// 考核记录
export interface AssessmentRecord {
  id: string;
  year: number;             // 考核年度
  assessmentDate: string;    // 考核日期
  assessor: string;          // 考核人
  rating: '优秀' | '良好' | '合格' | '不合格';  // 考核等级
  score: number;            // 考核得分
  strengths: string;        // 主要优点
  weaknesses: string;       // 不足之处
  goals: string;            // 改进目标
}

// 员工状态配置
export const WORKER_STATUS_CONFIG = {
  在职: { label: '在职', badge: 'bg-green-100 text-green-700' },
  离职: { label: '离职', badge: 'bg-gray-100 text-gray-700' },
  退休: { label: '退休', badge: 'bg-amber-100 text-amber-700' },
} as const;

// 技能等级配置
export const SKILL_LEVEL_CONFIG = {
  初级: { label: '初级', badge: 'bg-gray-100 text-gray-600' },
  中级: { label: '中级', badge: 'bg-blue-100 text-blue-600' },
  高级: { label: '高级', badge: 'bg-green-100 text-green-600' },
  技师: { label: '技师', badge: 'bg-amber-100 text-amber-600' },
} as const;

// 常用技能标签
export const SKILL_TAGS = [
  '浇水灌溉', '施肥作业', '病虫害防治', '打药操作', '采摘技能',
  '修剪整枝', '农机驾驶', '农机维修', '嫁接技术', '育苗管理',
  '温控管理', '灌溉系统操作', '质检分级', '包装发货', '基地管理'
] as const;

// 视图类型导出（聚合数据）
export type {
  BatchSummaryRow,
  SummaryStatCard,
  CostComparison,
  BatchDetailTab,
  BatchFilters,
  BatchYieldStats,
  BatchWorkHourStats,
  BatchCostDetail,
  BatchFilterSelect,
  BatchTableColumn,
} from './views';

// 采购计划类型导出
export type {
  PurchasePlan,
  PurchasePlanItem,
  PurchasePlanStatus,
  PurchasePlanPriority,
  PurchasePlanType,
  PurchasePlanSortField,
  SortDirection,
  SortConfig,
  PurchasePlanFilters,
} from './purchase';

export {
  PURCHASE_PLAN_STATUS_TEXT,
  PURCHASE_PLAN_PRIORITY_TEXT,
  PURCHASE_PLAN_TYPE_TEXT,
  PURCHASE_PLAN_STATUS_STYLE,
  PURCHASE_PLAN_PRIORITY_STYLE,
} from './purchase';

// 巡查管理模块类型导出
export type {
  Equipment,
  Infrastructure,
} from './index';

