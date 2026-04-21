import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Plus, Edit, Trash2, Search, RefreshCw, Tag, ChevronLeft } from 'lucide-react';

interface DictItem {
  id: string;
  dictCode: string;
  dictLabel: string;
  dictValue: string;
  dictSort: number;
  status: 'active' | 'inactive';
  remark?: string;
}

interface DictType {
  dictCode: string;
  dictName: string;
  description: string;
  status: 'active' | 'inactive';
  items: DictItem[];
}

const DEFAULT_DICTS: DictType[] = [
  // ===== 审批流程字典 =====
  {
    dictCode: 'approval_status',
    dictName: '审批状态',
    description: '所有审批流程的通用状态',
    status: 'active',
    items: [
      { id: '1', dictCode: 'approval_status', dictLabel: '草稿', dictValue: 'draft', dictSort: 1, status: 'active' },
      { id: '2', dictCode: 'approval_status', dictLabel: '待审批', dictValue: 'pending', dictSort: 2, status: 'active' },
      { id: '3', dictCode: 'approval_status', dictLabel: '审批中', dictValue: 'in_progress', dictSort: 3, status: 'active' },
      { id: '4', dictCode: 'approval_status', dictLabel: '已通过', dictValue: 'approved', dictSort: 4, status: 'active' },
      { id: '5', dictCode: 'approval_status', dictLabel: '部分通过', dictValue: 'partially_approved', dictSort: 5, status: 'active' },
      { id: '6', dictCode: 'approval_status', dictLabel: '已拒绝', dictValue: 'rejected', dictSort: 6, status: 'active' },
      { id: '7', dictCode: 'approval_status', dictLabel: '已撤回', dictValue: 'cancelled', dictSort: 7, status: 'active' },
      { id: '8', dictCode: 'approval_status', dictLabel: '已超时', dictValue: 'timeout', dictSort: 8, status: 'active' },
    ],
  },
  {
    dictCode: 'approval_action',
    dictName: '审批操作',
    description: '审批人可执行的操作类型',
    status: 'active',
    items: [
      { id: '10', dictCode: 'approval_action', dictLabel: '通过', dictValue: 'approve', dictSort: 1, status: 'active' },
      { id: '11', dictCode: 'approval_action', dictLabel: '拒绝', dictValue: 'reject', dictSort: 2, status: 'active' },
      { id: '12', dictCode: 'approval_action', dictLabel: '部分通过', dictValue: 'partially_approve', dictSort: 3, status: 'active' },
      { id: '13', dictCode: 'approval_action', dictLabel: '撤回', dictValue: 'cancel', dictSort: 4, status: 'active' },
      { id: '14', dictCode: 'approval_action', dictLabel: '转交', dictValue: 'transfer', dictSort: 5, status: 'active' },
      { id: '15', dictCode: 'approval_action', dictLabel: '加签', dictValue: 'add_sign', dictSort: 6, status: 'active' },
    ],
  },
  {
    dictCode: 'approval_type',
    dictName: '审批类型',
    description: '系统中所有审批业务类型',
    status: 'active',
    items: [
      { id: '20', dictCode: 'approval_type', dictLabel: '生产计划审批', dictValue: 'production_plan', dictSort: 1, status: 'active' },
      { id: '21', dictCode: 'approval_type', dictLabel: '技术方案审批', dictValue: 'tech_solution', dictSort: 2, status: 'active' },
      { id: '22', dictCode: 'approval_type', dictLabel: '采购计划审批', dictValue: 'purchase_plan', dictSort: 3, status: 'active' },
      { id: '23', dictCode: 'approval_type', dictLabel: '物料领用审批', dictValue: 'material_usage', dictSort: 4, status: 'active' },
      { id: '24', dictCode: 'approval_type', dictLabel: '人员入职审批', dictValue: 'hr_onboard', dictSort: 5, status: 'active' },
      { id: '25', dictCode: 'approval_type', dictLabel: '人员离职审批', dictValue: 'hr_resign', dictSort: 6, status: 'active' },
      { id: '26', dictCode: 'approval_type', dictLabel: '请假审批', dictValue: 'hr_leave', dictSort: 7, status: 'active' },
      { id: '27', dictCode: 'approval_type', dictLabel: '费用报销审批', dictValue: 'expense_reimburse', dictSort: 8, status: 'active' },
      { id: '28', dictCode: 'approval_type', dictLabel: '设备维修审批', dictValue: 'device_repair', dictSort: 9, status: 'active' },
      { id: '29', dictCode: 'approval_type', dictLabel: '库存调整审批', dictValue: 'inventory_adjust', dictSort: 10, status: 'active' },
    ],
  },

  // ===== 任务管理字典 =====
  {
    dictCode: 'task_type',
    dictName: '任务类型',
    description: '所有农事任务的类型定义',
    status: 'active',
    items: [
      { id: '100', dictCode: 'task_type', dictLabel: '播种', dictValue: 'planting', dictSort: 1, status: 'active' },
      { id: '101', dictCode: 'task_type', dictLabel: '浇水', dictValue: 'watering', dictSort: 2, status: 'active' },
      { id: '102', dictCode: 'task_type', dictLabel: '施肥', dictValue: 'fertilizing', dictSort: 3, status: 'active' },
      { id: '103', dictCode: 'task_type', dictLabel: '修剪', dictValue: 'pruning', dictSort: 4, status: 'active' },
      { id: '104', dictCode: 'task_type', dictLabel: '病虫害防治', dictValue: 'pest_control', dictSort: 5, status: 'active' },
      { id: '105', dictCode: 'task_type', dictLabel: '采收', dictValue: 'harvesting', dictSort: 6, status: 'active' },
      { id: '106', dictCode: 'task_type', dictLabel: '除草', dictValue: 'weeding', dictSort: 7, status: 'active' },
      { id: '107', dictCode: 'task_type', dictLabel: '设备维护', dictValue: 'device_maintenance', dictSort: 8, status: 'active' },
      { id: '108', dictCode: 'task_type', dictLabel: '巡检', dictValue: 'inspection', dictSort: 9, status: 'active' },
    ],
  },
  {
    dictCode: 'task_status',
    dictName: '任务状态',
    description: '任务的生命周期状态',
    status: 'active',
    items: [
      { id: '110', dictCode: 'task_status', dictLabel: '待分配', dictValue: 'pending', dictSort: 1, status: 'active' },
      { id: '111', dictCode: 'task_status', dictLabel: '已分配', dictValue: 'assigned', dictSort: 2, status: 'active' },
      { id: '112', dictCode: 'task_status', dictLabel: '进行中', dictValue: 'in_progress', dictSort: 3, status: 'active' },
      { id: '113', dictCode: 'task_status', dictLabel: '已完成', dictValue: 'completed', dictSort: 4, status: 'active' },
      { id: '114', dictCode: 'task_status', dictLabel: '已取消', dictValue: 'cancelled', dictSort: 5, status: 'active' },
      { id: '115', dictCode: 'task_status', dictLabel: '已逾期', dictValue: 'overdue', dictSort: 6, status: 'active' },
    ],
  },
  {
    dictCode: 'priority',
    dictName: '优先级',
    description: '任务/审批/预警的优先级定义',
    status: 'active',
    items: [
      { id: '120', dictCode: 'priority', dictLabel: '低', dictValue: 'low', dictSort: 1, status: 'active' },
      { id: '121', dictCode: 'priority', dictLabel: '普通', dictValue: 'normal', dictSort: 2, status: 'active' },
      { id: '122', dictCode: 'priority', dictLabel: '紧急', dictValue: 'urgent', dictSort: 3, status: 'active' },
      { id: '123', dictCode: 'priority', dictLabel: '特急', dictValue: 'critical', dictSort: 4, status: 'active' },
    ],
  },

  // ===== 作物和种植字典 =====
  {
    dictCode: 'crop_type',
    dictName: '作物类型',
    description: '种植作物的分类',
    status: 'active',
    items: [
      { id: '130', dictCode: 'crop_type', dictLabel: '叶菜类', dictValue: 'leafy', dictSort: 1, status: 'active' },
      { id: '131', dictCode: 'crop_type', dictLabel: '果菜类', dictValue: 'fruit', dictSort: 2, status: 'active' },
      { id: '132', dictCode: 'crop_type', dictLabel: '根茎类', dictValue: 'root', dictSort: 3, status: 'active' },
      { id: '133', dictCode: 'crop_type', dictLabel: '花卉类', dictValue: 'flower', dictSort: 4, status: 'active' },
      { id: '134', dictCode: 'crop_type', dictLabel: '瓜果类', dictValue: 'melon', dictSort: 5, status: 'active' },
      { id: '135', dictCode: 'crop_type', dictLabel: '豆类', dictValue: 'bean', dictSort: 6, status: 'active' },
      { id: '136', dictCode: 'crop_type', dictLabel: '菌类', dictValue: 'mushroom', dictSort: 7, status: 'active' },
    ],
  },
  {
    dictCode: 'crop_variety',
    dictName: '作物品种',
    description: '具体作物品种列表',
    status: 'active',
    items: [
      { id: '140', dictCode: 'crop_variety', dictLabel: '番茄', dictValue: 'tomato', dictSort: 1, status: 'active' },
      { id: '141', dictCode: 'crop_variety', dictLabel: '黄瓜', dictValue: 'cucumber', dictSort: 2, status: 'active' },
      { id: '142', dictCode: 'crop_variety', dictLabel: '辣椒', dictValue: 'pepper', dictSort: 3, status: 'active' },
      { id: '143', dictCode: 'crop_variety', dictLabel: '茄子', dictValue: 'eggplant', dictSort: 4, status: 'active' },
      { id: '144', dictCode: 'crop_variety', dictLabel: '生菜', dictValue: 'lettuce', dictSort: 5, status: 'active' },
      { id: '145', dictCode: 'crop_variety', dictLabel: '草莓', dictValue: 'strawberry', dictSort: 6, status: 'active' },
      { id: '146', dictCode: 'crop_variety', dictLabel: '西瓜', dictValue: 'watermelon', dictSort: 7, status: 'active' },
      { id: '147', dictCode: 'crop_variety', dictLabel: '甜瓜', dictValue: 'melon', dictSort: 8, status: 'active' },
    ],
  },
  {
    dictCode: 'greenhouse_type',
    dictName: '温室类型',
    description: '温室大棚的类型',
    status: 'active',
    items: [
      { id: '150', dictCode: 'greenhouse_type', dictLabel: '玻璃温室', dictValue: 'glass', dictSort: 1, status: 'active' },
      { id: '151', dictCode: 'greenhouse_type', dictLabel: '薄膜温室', dictValue: 'film', dictSort: 2, status: 'active' },
      { id: '152', dictCode: 'greenhouse_type', dictLabel: '阳光板温室', dictValue: 'pc', dictSort: 3, status: 'active' },
      { id: '153', dictCode: 'greenhouse_type', dictLabel: '连栋温室', dictValue: 'multi_span', dictSort: 4, status: 'active' },
      { id: '154', dictCode: 'greenhouse_type', dictLabel: '日光温室', dictValue: 'solar', dictSort: 5, status: 'active' },
    ],
  },
  {
    dictCode: 'planting_mode',
    dictName: '种植模式',
    description: '农业生产种植模式',
    status: 'active',
    items: [
      { id: '160', dictCode: 'planting_mode', dictLabel: '土壤种植', dictValue: 'soil', dictSort: 1, status: 'active' },
      { id: '161', dictCode: 'planting_mode', dictLabel: '水培', dictValue: 'hydroponics', dictSort: 2, status: 'active' },
      { id: '162', dictCode: 'planting_mode', dictLabel: '基质栽培', dictValue: 'substrate', dictSort: 3, status: 'active' },
      { id: '163', dictCode: 'planting_mode', dictLabel: '气雾培', dictValue: 'aeroponics', dictSort: 4, status: 'active' },
    ],
  },
  {
    dictCode: 'growth_stage',
    dictName: '生长阶段',
    description: '作物生长阶段定义',
    status: 'active',
    items: [
      { id: '170', dictCode: 'growth_stage', dictLabel: '育苗期', dictValue: 'seedling', dictSort: 1, status: 'active' },
      { id: '171', dictCode: 'growth_stage', dictLabel: '定植期', dictValue: 'transplanting', dictSort: 2, status: 'active' },
      { id: '172', dictCode: 'growth_stage', dictLabel: '营养生长期', dictValue: 'vegetative', dictSort: 3, status: 'active' },
      { id: '173', dictCode: 'growth_stage', dictLabel: '开花期', dictValue: 'flowering', dictSort: 4, status: 'active' },
      { id: '174', dictCode: 'growth_stage', dictLabel: '结果期', dictValue: 'fruiting', dictSort: 5, status: 'active' },
      { id: '175', dictCode: 'growth_stage', dictLabel: '采收期', dictValue: 'harvest', dictSort: 6, status: 'active' },
    ],
  },

  // ===== 物料管理字典 =====
  {
    dictCode: 'material_type',
    dictName: '物料类型',
    description: '农业物料的分类',
    status: 'active',
    items: [
      { id: '200', dictCode: 'material_type', dictLabel: '种子', dictValue: 'seed', dictSort: 1, status: 'active' },
      { id: '201', dictCode: 'material_type', dictLabel: '肥料', dictValue: 'fertilizer', dictSort: 2, status: 'active' },
      { id: '202', dictCode: 'material_type', dictLabel: '农药', dictValue: 'pesticide', dictSort: 3, status: 'active' },
      { id: '203', dictCode: 'material_type', dictLabel: '基质', dictValue: 'substrate', dictSort: 4, status: 'active' },
      { id: '204', dictCode: 'material_type', dictLabel: '工具', dictValue: 'tool', dictSort: 5, status: 'active' },
      { id: '205', dictCode: 'material_type', dictLabel: '包装材料', dictValue: 'package', dictSort: 6, status: 'active' },
      { id: '206', dictCode: 'material_type', dictLabel: '设备配件', dictValue: 'spare_part', dictSort: 7, status: 'active' },
      { id: '207', dictCode: 'material_type', dictLabel: '耗材', dictValue: 'consumable', dictSort: 8, status: 'active' },
    ],
  },
  {
    dictCode: 'material_unit',
    dictName: '物料单位',
    description: '物料计量单位',
    status: 'active',
    items: [
      { id: '210', dictCode: 'material_unit', dictLabel: '千克', dictValue: 'kg', dictSort: 1, status: 'active' },
      { id: '211', dictCode: 'material_unit', dictLabel: '克', dictValue: 'g', dictSort: 2, status: 'active' },
      { id: '212', dictCode: 'material_unit', dictLabel: '吨', dictValue: 'ton', dictSort: 3, status: 'active' },
      { id: '213', dictCode: 'material_unit', dictLabel: '升', dictValue: 'L', dictSort: 4, status: 'active' },
      { id: '214', dictCode: 'material_unit', dictLabel: '毫升', dictValue: 'mL', dictSort: 5, status: 'active' },
      { id: '215', dictCode: 'material_unit', dictLabel: '袋', dictValue: 'bag', dictSort: 6, status: 'active' },
      { id: '216', dictCode: 'material_unit', dictLabel: '箱', dictValue: 'box', dictSort: 7, status: 'active' },
      { id: '217', dictCode: 'material_unit', dictLabel: '个', dictValue: 'piece', dictSort: 8, status: 'active' },
      { id: '218', dictCode: 'material_unit', dictLabel: '包', dictValue: 'pack', dictSort: 9, status: 'active' },
    ],
  },
  {
    dictCode: 'warehouse_type',
    dictName: '仓库类型',
    description: '仓库分类',
    status: 'active',
    items: [
      { id: '220', dictCode: 'warehouse_type', dictLabel: '原料仓库', dictValue: 'raw_material', dictSort: 1, status: 'active' },
      { id: '221', dictCode: 'warehouse_type', dictLabel: '成品仓库', dictValue: 'finished_product', dictSort: 2, status: 'active' },
      { id: '222', dictCode: 'warehouse_type', dictLabel: '耗材仓库', dictValue: 'consumable', dictSort: 3, status: 'active' },
      { id: '223', dictCode: 'warehouse_type', dictLabel: '农药仓库', dictValue: 'pesticide', dictSort: 4, status: 'active' },
      { id: '224', dictCode: 'warehouse_type', dictLabel: '化肥仓库', dictValue: 'fertilizer', dictSort: 5, status: 'active' },
      { id: '225', dictCode: 'warehouse_type', dictLabel: '设备仓库', dictValue: 'equipment', dictSort: 6, status: 'active' },
    ],
  },

  // ===== 生产管理字典 =====
  {
    dictCode: 'production_status',
    dictName: '生产状态',
    description: '生产计划/批次状态',
    status: 'active',
    items: [
      { id: '300', dictCode: 'production_status', dictLabel: '计划中', dictValue: 'planned', dictSort: 1, status: 'active' },
      { id: '301', dictCode: 'production_status', dictLabel: '进行中', dictValue: 'in_progress', dictSort: 2, status: 'active' },
      { id: '302', dictCode: 'production_status', dictLabel: '已完成', dictValue: 'completed', dictSort: 3, status: 'active' },
      { id: '303', dictCode: 'production_status', dictLabel: '已暂停', dictValue: 'paused', dictSort: 4, status: 'active' },
      { id: '304', dictCode: 'production_status', dictLabel: '已取消', dictValue: 'cancelled', dictSort: 5, status: 'active' },
    ],
  },
  {
    dictCode: 'batch_status',
    dictName: '批次状态',
    description: '生产批次状态',
    status: 'active',
    items: [
      { id: '310', dictCode: 'batch_status', dictLabel: '待播种', dictValue: 'pending_planting', dictSort: 1, status: 'active' },
      { id: '311', dictCode: 'batch_status', dictLabel: '生长中', dictValue: 'growing', dictSort: 2, status: 'active' },
      { id: '312', dictCode: 'batch_status', dictLabel: '待采收', dictValue: 'ready_harvest', dictSort: 3, status: 'active' },
      { id: '313', dictCode: 'batch_status', dictLabel: '已采收', dictValue: 'harvested', dictSort: 4, status: 'active' },
    ],
  },
  {
    dictCode: 'tech_solution_status',
    dictName: '技术方案状态',
    description: '农业技术方案的状态',
    status: 'active',
    items: [
      { id: '320', dictCode: 'tech_solution_status', dictLabel: '草稿', dictValue: 'draft', dictSort: 1, status: 'active' },
      { id: '321', dictCode: 'tech_solution_status', dictLabel: '审核中', dictValue: 'reviewing', dictSort: 2, status: 'active' },
      { id: '322', dictCode: 'tech_solution_status', dictLabel: '已发布', dictValue: 'published', dictSort: 3, status: 'active' },
      { id: '323', dictCode: 'tech_solution_status', dictLabel: '已归档', dictValue: 'archived', dictSort: 4, status: 'active' },
    ],
  },

  // ===== 设备管理字典 =====
  {
    dictCode: 'device_type',
    dictName: '设备类型',
    description: 'IoT设备类型分类',
    status: 'active',
    items: [
      { id: '400', dictCode: 'device_type', dictLabel: '传感器', dictValue: 'sensor', dictSort: 1, status: 'active' },
      { id: '401', dictCode: 'device_type', dictLabel: '摄像头', dictValue: 'camera', dictSort: 2, status: 'active' },
      { id: '402', dictCode: 'device_type', dictLabel: '控制器', dictValue: 'controller', dictSort: 3, status: 'active' },
      { id: '403', dictCode: 'device_type', dictLabel: '气象站', dictValue: 'weather_station', dictSort: 4, status: 'active' },
      { id: '404', dictCode: 'device_type', dictLabel: '灌溉设备', dictValue: 'irrigation', dictSort: 5, status: 'active' },
      { id: '405', dictCode: 'device_type', dictLabel: '施肥设备', dictValue: 'fertilizer_device', dictSort: 6, status: 'active' },
      { id: '406', dictCode: 'device_type', dictLabel: '通风设备', dictValue: 'ventilation', dictSort: 7, status: 'active' },
      { id: '407', dictCode: 'device_type', dictLabel: '补光设备', dictValue: 'lighting', dictSort: 8, status: 'active' },
    ],
  },
  {
    dictCode: 'device_status',
    dictName: '设备状态',
    description: 'IoT设备运行状态',
    status: 'active',
    items: [
      { id: '410', dictCode: 'device_status', dictLabel: '在线', dictValue: 'online', dictSort: 1, status: 'active' },
      { id: '411', dictCode: 'device_status', dictLabel: '离线', dictValue: 'offline', dictSort: 2, status: 'active' },
      { id: '412', dictCode: 'device_status', dictLabel: '维护中', dictValue: 'maintenance', dictSort: 3, status: 'active' },
      { id: '413', dictCode: 'device_status', dictLabel: '故障', dictValue: 'fault', dictSort: 4, status: 'active' },
    ],
  },
  {
    dictCode: 'sensor_type',
    dictName: '传感器类型',
    description: '环境传感器类型',
    status: 'active',
    items: [
      { id: '420', dictCode: 'sensor_type', dictLabel: '温度传感器', dictValue: 'temperature', dictSort: 1, status: 'active' },
      { id: '421', dictCode: 'sensor_type', dictLabel: '湿度传感器', dictValue: 'humidity', dictSort: 2, status: 'active' },
      { id: '422', dictCode: 'sensor_type', dictLabel: '光照传感器', dictValue: 'light', dictSort: 3, status: 'active' },
      { id: '423', dictCode: 'sensor_type', dictLabel: 'CO2传感器', dictValue: 'co2', dictSort: 4, status: 'active' },
      { id: '424', dictCode: 'sensor_type', dictLabel: '土壤湿度传感器', dictValue: 'soil_moisture', dictSort: 5, status: 'active' },
      { id: '425', dictCode: 'sensor_type', dictLabel: '土壤EC传感器', dictValue: 'soil_ec', dictSort: 6, status: 'active' },
      { id: '426', dictCode: 'sensor_type', dictLabel: 'pH传感器', dictValue: 'ph', dictSort: 7, status: 'active' },
    ],
  },

  // ===== 预警字典 =====
  {
    dictCode: 'alert_level',
    dictName: '预警级别',
    description: '系统预警等级',
    status: 'active',
    items: [
      { id: '500', dictCode: 'alert_level', dictLabel: '提示', dictValue: 'info', dictSort: 1, status: 'active' },
      { id: '501', dictCode: 'alert_level', dictLabel: '一般', dictValue: 'normal', dictSort: 2, status: 'active' },
      { id: '502', dictCode: 'alert_level', dictLabel: '警告', dictValue: 'warning', dictSort: 3, status: 'active' },
      { id: '503', dictCode: 'alert_level', dictLabel: '严重', dictValue: 'critical', dictSort: 4, status: 'active' },
    ],
  },
  {
    dictCode: 'alert_type',
    dictName: '预警类型',
    description: '系统预警类型分类',
    status: 'active',
    items: [
      { id: '510', dictCode: 'alert_type', dictLabel: '温度异常', dictValue: 'temp_abnormal', dictSort: 1, status: 'active' },
      { id: '511', dictCode: 'alert_type', dictLabel: '湿度异常', dictValue: 'humidity_abnormal', dictSort: 2, status: 'active' },
      { id: '512', dictCode: 'alert_type', dictLabel: '设备离线', dictValue: 'device_offline', dictSort: 3, status: 'active' },
      { id: '513', dictCode: 'alert_type', dictLabel: '设备故障', dictValue: 'device_fault', dictSort: 4, status: 'active' },
      { id: '514', dictCode: 'alert_type', dictLabel: '库存不足', dictValue: 'low_stock', dictSort: 5, status: 'active' },
      { id: '515', dictCode: 'alert_type', dictLabel: '任务逾期', dictValue: 'task_overdue', dictSort: 6, status: 'active' },
      { id: '516', dictCode: 'alert_type', dictLabel: '审批超时', dictValue: 'approval_timeout', dictSort: 7, status: 'active' },
    ],
  },

  // ===== 人事字典 =====
  {
    dictCode: 'employee_status',
    dictName: '员工状态',
    description: '员工在职状态',
    status: 'active',
    items: [
      { id: '600', dictCode: 'employee_status', dictLabel: '在职', dictValue: 'active', dictSort: 1, status: 'active' },
      { id: '601', dictCode: 'employee_status', dictLabel: '试用期', dictValue: 'probation', dictSort: 2, status: 'active' },
      { id: '602', dictCode: 'employee_status', dictLabel: '离职', dictValue: 'resigned', dictSort: 3, status: 'active' },
      { id: '603', dictCode: 'employee_status', dictLabel: '请假中', dictValue: 'on_leave', dictSort: 4, status: 'active' },
      { id: '604', dictCode: 'employee_status', dictLabel: '停职', dictValue: 'suspended', dictSort: 5, status: 'active' },
    ],
  },
  {
    dictCode: 'attendance_status',
    dictName: '考勤状态',
    description: '每日考勤状态',
    status: 'active',
    items: [
      { id: '610', dictCode: 'attendance_status', dictLabel: '正常', dictValue: 'normal', dictSort: 1, status: 'active' },
      { id: '611', dictCode: 'attendance_status', dictLabel: '迟到', dictValue: 'late', dictSort: 2, status: 'active' },
      { id: '612', dictCode: 'attendance_status', dictLabel: '早退', dictValue: 'early_leave', dictSort: 3, status: 'active' },
      { id: '613', dictCode: 'attendance_status', dictLabel: '缺勤', dictValue: 'absent', dictSort: 4, status: 'active' },
      { id: '614', dictCode: 'attendance_status', dictLabel: '请假', dictValue: 'leave', dictSort: 5, status: 'active' },
      { id: '615', dictCode: 'attendance_status', dictLabel: '加班', dictValue: 'overtime', dictSort: 6, status: 'active' },
    ],
  },
  {
    dictCode: 'leave_type',
    dictName: '请假类型',
    description: '请假类别',
    status: 'active',
    items: [
      { id: '620', dictCode: 'leave_type', dictLabel: '事假', dictValue: 'personal', dictSort: 1, status: 'active' },
      { id: '621', dictCode: 'leave_type', dictLabel: '病假', dictValue: 'sick', dictSort: 2, status: 'active' },
      { id: '622', dictCode: 'leave_type', dictLabel: '年假', dictValue: 'annual', dictSort: 3, status: 'active' },
      { id: '623', dictCode: 'leave_type', dictLabel: '婚假', dictValue: 'marriage', dictSort: 4, status: 'active' },
      { id: '624', dictCode: 'leave_type', dictLabel: '产假', dictValue: 'maternity', dictSort: 5, status: 'active' },
      { id: '625', dictCode: 'leave_type', dictLabel: '调休', dictValue: 'compensation', dictSort: 6, status: 'active' },
    ],
  },
  {
    dictCode: 'gender',
    dictName: '性别',
    description: '员工性别',
    status: 'active',
    items: [
      { id: '630', dictCode: 'gender', dictLabel: '男', dictValue: 'male', dictSort: 1, status: 'active' },
      { id: '631', dictCode: 'gender', dictLabel: '女', dictValue: 'female', dictSort: 2, status: 'active' },
    ],
  },
  {
    dictCode: 'education',
    dictName: '学历',
    description: '员工学历',
    status: 'active',
    items: [
      { id: '640', dictCode: 'education', dictLabel: '初中及以下', dictValue: 'junior_high', dictSort: 1, status: 'active' },
      { id: '641', dictCode: 'education', dictLabel: '高中/中专', dictValue: 'high_school', dictSort: 2, status: 'active' },
      { id: '642', dictCode: 'education', dictLabel: '大专', dictValue: 'college', dictSort: 3, status: 'active' },
      { id: '643', dictCode: 'education', dictLabel: '本科', dictValue: 'bachelor', dictSort: 4, status: 'active' },
      { id: '644', dictCode: 'education', dictLabel: '硕士', dictValue: 'master', dictSort: 5, status: 'active' },
      { id: '645', dictCode: 'education', dictLabel: '博士', dictValue: 'doctor', dictSort: 6, status: 'active' },
    ],
  },

  // ===== 采购字典 =====
  {
    dictCode: 'purchase_status',
    dictName: '采购状态',
    description: '采购计划状态',
    status: 'active',
    items: [
      { id: '700', dictCode: 'purchase_status', dictLabel: '草稿', dictValue: 'draft', dictSort: 1, status: 'active' },
      { id: '701', dictCode: 'purchase_status', dictLabel: '待审批', dictValue: 'pending_approval', dictSort: 2, status: 'active' },
      { id: '702', dictCode: 'purchase_status', dictLabel: '已审批', dictValue: 'approved', dictSort: 3, status: 'active' },
      { id: '703', dictCode: 'purchase_status', dictLabel: '采购中', dictValue: 'purchasing', dictSort: 4, status: 'active' },
      { id: '704', dictCode: 'purchase_status', dictLabel: '已到货', dictValue: 'delivered', dictSort: 5, status: 'active' },
      { id: '705', dictCode: 'purchase_status', dictLabel: '已入库', dictValue: 'stored', dictSort: 6, status: 'active' },
      { id: '706', dictCode: 'purchase_status', dictLabel: '已取消', dictValue: 'cancelled', dictSort: 7, status: 'active' },
    ],
  },
  {
    dictCode: 'supplier_type',
    dictName: '供应商类型',
    description: '供应商分类',
    status: 'active',
    items: [
      { id: '710', dictCode: 'supplier_type', dictLabel: '种子供应商', dictValue: 'seed_supplier', dictSort: 1, status: 'active' },
      { id: '711', dictCode: 'supplier_type', dictLabel: '肥料供应商', dictValue: 'fertilizer_supplier', dictSort: 2, status: 'active' },
      { id: '712', dictCode: 'supplier_type', dictLabel: '农药供应商', dictValue: 'pesticide_supplier', dictSort: 3, status: 'active' },
      { id: '713', dictCode: 'supplier_type', dictLabel: '设备供应商', dictValue: 'equipment_supplier', dictSort: 4, status: 'active' },
      { id: '714', dictCode: 'supplier_type', dictLabel: '包装材料供应商', dictValue: 'package_supplier', dictSort: 5, status: 'active' },
    ],
  },
  {
    dictCode: 'supplier_level',
    dictName: '供应商等级',
    description: '供应商评级',
    status: 'active',
    items: [
      { id: '720', dictCode: 'supplier_level', dictLabel: 'A级（优秀）', dictValue: 'A', dictSort: 1, status: 'active' },
      { id: '721', dictCode: 'supplier_level', dictLabel: 'B级（良好）', dictValue: 'B', dictSort: 2, status: 'active' },
      { id: '722', dictCode: 'supplier_level', dictLabel: 'C级（合格）', dictValue: 'C', dictSort: 3, status: 'active' },
      { id: '723', dictCode: 'supplier_level', dictLabel: 'D级（不合格）', dictValue: 'D', dictSort: 4, status: 'active' },
    ],
  },

  // ===== 通知字典 =====
  {
    dictCode: 'notification_type',
    dictName: '通知类型',
    description: '消息通知分类',
    status: 'active',
    items: [
      { id: '800', dictCode: 'notification_type', dictLabel: '系统通知', dictValue: 'system', dictSort: 1, status: 'active' },
      { id: '801', dictCode: 'notification_type', dictLabel: '审批通知', dictValue: 'approval', dictSort: 2, status: 'active' },
      { id: '802', dictCode: 'notification_type', dictLabel: '任务通知', dictValue: 'task', dictSort: 3, status: 'active' },
      { id: '803', dictCode: 'notification_type', dictLabel: '预警通知', dictValue: 'alert', dictSort: 4, status: 'active' },
      { id: '804', dictCode: 'notification_type', dictLabel: '公告', dictValue: 'announcement', dictSort: 5, status: 'active' },
    ],
  },
  {
    dictCode: 'notification_channel',
    dictName: '通知渠道',
    description: '消息发送渠道',
    status: 'active',
    items: [
      { id: '810', dictCode: 'notification_channel', dictLabel: '站内消息', dictValue: 'in_app', dictSort: 1, status: 'active' },
      { id: '811', dictCode: 'notification_channel', dictLabel: '邮件', dictValue: 'email', dictSort: 2, status: 'active' },
      { id: '812', dictCode: 'notification_channel', dictLabel: '短信', dictValue: 'sms', dictSort: 3, status: 'active' },
      { id: '813', dictCode: 'notification_channel', dictLabel: '企业微信', dictValue: 'wechat', dictSort: 4, status: 'active' },
      { id: '814', dictCode: 'notification_channel', dictLabel: '钉钉', dictValue: 'dingtalk', dictSort: 5, status: 'active' },
    ],
  },

  // ===== 视频监控字典 =====
  {
    dictCode: 'video_record_type',
    dictName: '录像类型',
    description: '视频监控录像类型',
    status: 'active',
    items: [
      { id: '900', dictCode: 'video_record_type', dictLabel: '定时录像', dictValue: 'timed', dictSort: 1, status: 'active' },
      { id: '901', dictCode: 'video_record_type', dictLabel: '移动侦测', dictValue: 'motion', dictSort: 2, status: 'active' },
      { id: '902', dictCode: 'video_record_type', dictLabel: '报警录像', dictValue: 'alarm', dictSort: 3, status: 'active' },
      { id: '903', dictCode: 'video_record_type', dictLabel: '手动录像', dictValue: 'manual', dictSort: 4, status: 'active' },
    ],
  },

  // ===== 追溯字典 =====
  {
    dictCode: 'trace_status',
    dictName: '追溯状态',
    description: '产品溯源状态',
    status: 'active',
    items: [
      { id: '910', dictCode: 'trace_status', dictLabel: '种植中', dictValue: 'growing', dictSort: 1, status: 'active' },
      { id: '911', dictCode: 'trace_status', dictLabel: '已采收', dictValue: 'harvested', dictSort: 2, status: 'active' },
      { id: '912', dictCode: 'trace_status', dictLabel: '已检测', dictValue: 'tested', dictSort: 3, status: 'active' },
      { id: '913', dictCode: 'trace_status', dictLabel: '已包装', dictValue: 'packaged', dictSort: 4, status: 'active' },
      { id: '914', dictCode: 'trace_status', dictLabel: '已发货', dictValue: 'shipped', dictSort: 5, status: 'active' },
      { id: '915', dictCode: 'trace_status', dictLabel: '已签收', dictValue: 'received', dictSort: 6, status: 'active' },
    ],
  },

  // ===== 成本核算字典 =====
  {
    dictCode: 'cost_type',
    dictName: '成本类型',
    description: '成本核算分类',
    status: 'active',
    items: [
      { id: '920', dictCode: 'cost_type', dictLabel: '物料成本', dictValue: 'material', dictSort: 1, status: 'active' },
      { id: '921', dictCode: 'cost_type', dictLabel: '人工成本', dictValue: 'labor', dictSort: 2, status: 'active' },
      { id: '922', dictCode: 'cost_type', dictLabel: '设备成本', dictValue: 'equipment', dictSort: 3, status: 'active' },
      { id: '923', dictCode: 'cost_type', dictLabel: '能源成本', dictValue: 'energy', dictSort: 4, status: 'active' },
      { id: '924', dictCode: 'cost_type', dictLabel: '其他成本', dictValue: 'other', dictSort: 5, status: 'active' },
    ],
  },
  {
    dictCode: 'budget_status',
    dictName: '预算状态',
    description: '预算执行状态',
    status: 'active',
    items: [
      { id: '930', dictCode: 'budget_status', dictLabel: '进行中', dictValue: 'active', dictSort: 1, status: 'active' },
      { id: '931', dictCode: 'budget_status', dictLabel: '已完成', dictValue: 'completed', dictSort: 2, status: 'active' },
      { id: '932', dictCode: 'budget_status', dictLabel: '已超支', dictValue: 'over_budget', dictSort: 3, status: 'active' },
      { id: '933', dictCode: 'budget_status', dictLabel: '已取消', dictValue: 'cancelled', dictSort: 4, status: 'active' },
    ],
  },

  // ===== 工单字典 =====
  {
    dictCode: 'work_order_status',
    dictName: '工单状态',
    description: '工单流转状态',
    status: 'active',
    items: [
      { id: '940', dictCode: 'work_order_status', dictLabel: '待处理', dictValue: 'pending', dictSort: 1, status: 'active' },
      { id: '941', dictCode: 'work_order_status', dictLabel: '处理中', dictValue: 'processing', dictSort: 2, status: 'active' },
      { id: '942', dictCode: 'work_order_status', dictLabel: '已完成', dictValue: 'completed', dictSort: 3, status: 'active' },
      { id: '943', dictCode: 'work_order_status', dictLabel: '已关闭', dictValue: 'closed', dictSort: 4, status: 'active' },
      { id: '944', dictCode: 'work_order_status', dictLabel: '已退回', dictValue: 'returned', dictSort: 5, status: 'active' },
    ],
  },
  {
    dictCode: 'work_order_type',
    dictName: '工单类型',
    description: '工单分类',
    status: 'active',
    items: [
      { id: '950', dictCode: 'work_order_type', dictLabel: '维修工单', dictValue: 'repair', dictSort: 1, status: 'active' },
      { id: '951', dictCode: 'work_order_type', dictLabel: '保养工单', dictValue: 'maintenance', dictSort: 2, status: 'active' },
      { id: '952', dictCode: 'work_order_type', dictLabel: '巡检工单', dictValue: 'inspection', dictSort: 3, status: 'active' },
      { id: '953', dictCode: 'work_order_type', dictLabel: '安装工单', dictValue: 'install', dictSort: 4, status: 'active' },
    ],
  },

  // ===== 通用状态字典 =====
  {
    dictCode: 'common_status',
    dictName: '通用状态',
    description: '通用的启用/停用状态',
    status: 'active',
    items: [
      { id: '960', dictCode: 'common_status', dictLabel: '启用', dictValue: 'active', dictSort: 1, status: 'active' },
      { id: '961', dictCode: 'common_status', dictLabel: '停用', dictValue: 'inactive', dictSort: 2, status: 'active' },
      { id: '962', dictCode: 'common_status', dictLabel: '草稿', dictValue: 'draft', dictSort: 3, status: 'active' },
      { id: '963', dictCode: 'common_status', dictLabel: '已发布', dictValue: 'published', dictSort: 4, status: 'active' },
      { id: '964', dictCode: 'common_status', dictLabel: '已归档', dictValue: 'archived', dictSort: 5, status: 'active' },
      { id: '965', dictCode: 'common_status', dictLabel: '已删除', dictValue: 'deleted', dictSort: 6, status: 'active' },
    ],
  },
  {
    dictCode: 'boolean_yes_no',
    dictName: '是/否',
    description: '布尔值显示',
    status: 'active',
    items: [
      { id: '970', dictCode: 'boolean_yes_no', dictLabel: '是', dictValue: 'true', dictSort: 1, status: 'active' },
      { id: '971', dictCode: 'boolean_yes_no', dictLabel: '否', dictValue: 'false', dictSort: 2, status: 'active' },
    ],
  },
  {
    dictCode: 'pagination_size',
    dictName: '分页大小',
    description: '表格分页选项',
    status: 'active',
    items: [
      { id: '980', dictCode: 'pagination_size', dictLabel: '10', dictValue: '10', dictSort: 1, status: 'active' },
      { id: '981', dictCode: 'pagination_size', dictLabel: '20', dictValue: '20', dictSort: 2, status: 'active' },
      { id: '982', dictCode: 'pagination_size', dictLabel: '50', dictValue: '50', dictSort: 3, status: 'active' },
      { id: '983', dictCode: 'pagination_size', dictLabel: '100', dictValue: '100', dictSort: 4, status: 'active' },
    ],
  },
];

export default function DictionaryManagement() {
  const [dicts, setDicts] = useState<DictType[]>([]);
  const [selectedDict, setSelectedDict] = useState<DictType | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showAddDict, setShowAddDict] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editingItem, setEditingItem] = useState<DictItem | null>(null);
  const [newDict, setNewDict] = useState<Partial<DictType>>({});
  const [newItem, setNewItem] = useState<Partial<DictItem>>({});

  useEffect(() => {
    const stored = localStorage.getItem('yuanxingtu_dictionaries');
    if (stored) {
      try {
        setDicts(JSON.parse(stored));
      } catch {
        setDicts(DEFAULT_DICTS);
      }
    } else {
      setDicts(DEFAULT_DICTS);
    }
  }, []);

  useEffect(() => {
    if (dicts.length > 0) {
      localStorage.setItem('yuanxingtu_dictionaries', JSON.stringify(dicts));
    }
  }, [dicts]);

  const filteredDicts = dicts.filter(d =>
    d.dictName.includes(searchKeyword) ||
    d.dictCode.includes(searchKeyword) ||
    d.description.includes(searchKeyword)
  );

  const handleAddDict = () => {
    if (!newDict.dictCode || !newDict.dictName) return;
    const dict: DictType = {
      dictCode: newDict.dictCode,
      dictName: newDict.dictName,
      description: newDict.description || '',
      status: 'active',
      items: [],
    };
    setDicts([...dicts, dict]);
    setNewDict({});
    setShowAddDict(false);
  };

  const handleDeleteDict = (dictCode: string) => {
    if (confirm(`确定要删除字典"${dicts.find(d => d.dictCode === dictCode)?.dictName}"吗？`)) {
      setDicts(dicts.filter(d => d.dictCode !== dictCode));
      if (selectedDict?.dictCode === dictCode) {
        setSelectedDict(null);
      }
    }
  };

  const handleSelectDict = (dict: DictType) => {
    setSelectedDict(dict);
    setShowAddItem(false);
    setEditingItem(null);
  };

  const handleAddItem = () => {
    if (!selectedDict || !newItem.dictLabel || !newItem.dictValue) return;
    const item: DictItem = {
      id: Date.now().toString(),
      dictCode: selectedDict.dictCode,
      dictLabel: newItem.dictLabel,
      dictValue: newItem.dictValue,
      dictSort: newItem.dictSort || 0,
      status: 'active',
      remark: newItem.remark,
    };
    const updatedDict = {
      ...selectedDict,
      items: [...selectedDict.items, item].sort((a, b) => a.dictSort - b.dictSort),
    };
    setDicts(dicts.map(d => d.dictCode === selectedDict.dictCode ? updatedDict : d));
    setSelectedDict(updatedDict);
    setNewItem({});
    setShowAddItem(false);
  };

  const handleEditItem = (item: DictItem) => {
    setEditingItem(item);
    setNewItem(item);
  };

  const handleSaveItem = () => {
    if (!selectedDict || !editingItem) return;
    const updatedItems = selectedDict.items.map(i =>
      i.id === editingItem.id
        ? { ...i, ...newItem, dictSort: newItem.dictSort || 0 }
        : i
    ).sort((a, b) => a.dictSort - b.dictSort);
    const updatedDict = { ...selectedDict, items: updatedItems };
    setDicts(dicts.map(d => d.dictCode === selectedDict.dictCode ? updatedDict : d));
    setSelectedDict(updatedDict);
    setEditingItem(null);
    setNewItem({});
  };

  const handleDeleteItem = (itemId: string) => {
    if (!selectedDict) return;
    if (confirm('确定要删除这个字典项吗？')) {
      const updatedDict = {
        ...selectedDict,
        items: selectedDict.items.filter(i => i.id !== itemId),
      };
      setDicts(dicts.map(d => d.dictCode === selectedDict.dictCode ? updatedDict : d));
      setSelectedDict(updatedDict);
    }
  };

  const handleRefresh = () => {
    if (confirm('确定要恢复默认字典吗？当前自定义的字典将被覆盖。')) {
      setDicts(DEFAULT_DICTS);
      setSelectedDict(null);
    }
  };

  const totalItems = dicts.reduce((sum, d) => sum + d.items.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/settings" className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </Link>
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">数据字典管理</h1>
            <p className="text-gray-500">管理系统中的所有枚举值、状态、类型等字典数据</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">共 <span className="font-bold text-gray-900">{dicts.length}</span> 个字典类型，<span className="font-bold text-gray-900">{totalItems}</span> 个字典项</span>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" />
            恢复默认
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-gray-900">字典类型</h2>
                <button
                  onClick={() => setShowAddDict(true)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                  placeholder="搜索字典..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {filteredDicts.map(dict => (
                <div
                  key={dict.dictCode}
                  onClick={() => handleSelectDict(dict)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedDict?.dictCode === dict.dictCode ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{dict.dictName}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDict(dict.dictCode);
                      }}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{dict.dictCode}</p>
                  <p className="text-xs text-gray-400 mt-1">{dict.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">{dict.items.length} 个字典项</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      dict.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {dict.status === 'active' ? '启用' : '禁用'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {selectedDict ? (
              <>
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">{selectedDict.dictName}</h2>
                      <p className="text-sm text-gray-500">{selectedDict.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddItem(true);
                        setEditingItem(null);
                        setNewItem({ dictSort: selectedDict.items.length + 1 });
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      新增字典项
                    </button>
                  </div>
                </div>

                {(showAddItem || editingItem) && (
                  <div className="p-4 bg-gray-50 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900 mb-3">
                      {editingItem ? '编辑字典项' : '新增字典项'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">字典标签</label>
                        <input
                          type="text"
                          value={newItem.dictLabel || ''}
                          onChange={(e) => setNewItem({ ...newItem, dictLabel: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="如：待审批"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">字典值</label>
                        <input
                          type="text"
                          value={newItem.dictValue || ''}
                          onChange={(e) => setNewItem({ ...newItem, dictValue: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="如：pending"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">排序</label>
                        <input
                          type="number"
                          value={newItem.dictSort || 0}
                          onChange={(e) => setNewItem({ ...newItem, dictSort: parseInt(e.target.value) })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                        <input
                          type="text"
                          value={newItem.remark || ''}
                          onChange={(e) => setNewItem({ ...newItem, remark: e.target.value })}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="可选"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={editingItem ? handleSaveItem : handleAddItem}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        {editingItem ? '保存' : '添加'}
                      </button>
                      <button
                        onClick={() => {
                          setShowAddItem(false);
                          setEditingItem(null);
                          setNewItem({});
                        }}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-gray-200">
                  {selectedDict.items.map(item => (
                    <div key={item.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                      <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-900 w-24">{item.dictLabel}</span>
                        <code className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{item.dictValue}</code>
                        <span className="text-xs text-gray-400">排序: {item.dictSort}</span>
                        {item.remark && <span className="text-xs text-gray-400">{item.remark}</span>}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditItem(item)}
                          className="text-gray-400 hover:text-blue-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">请在左侧选择一个字典类型</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddDict && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">新增字典类型</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">字典编码</label>
                <input
                  type="text"
                  value={newDict.dictCode || ''}
                  onChange={(e) => setNewDict({ ...newDict, dictCode: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：crop_type"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">字典名称</label>
                <input
                  type="text"
                  value={newDict.dictName || ''}
                  onChange={(e) => setNewDict({ ...newDict, dictName: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="如：作物类型"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
                <textarea
                  value={newDict.description || ''}
                  onChange={(e) => setNewDict({ ...newDict, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="描述这个字典的用途"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddDict(false);
                  setNewDict({});
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleAddDict}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
