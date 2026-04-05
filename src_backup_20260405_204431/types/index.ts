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
}

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

export interface InspectionRecord {
  id: string;
  recordCode: string;
  inspectorId: string;
  inspectorName: string;
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  checkDate: string;
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
  // 环境参数
  airTemperature?: number;
  airHumidity?: number;
  lightIntensity?: number;
  co2Concentration?: number;
  soilTemperature?: number;
  soilMoisture?: number;
  soilEc?: number;
  soilPh?: number;
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
