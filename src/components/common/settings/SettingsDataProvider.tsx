/**
 * 设置数据Provider
 * 提供全局设置数据的状态管理
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

// 基础数据类型
export interface User {
  id: string;
  oid: string;
  username: string;
  realName: string;
  name?: string;
  orgOid: string;
  orgName?: string;
  departmentOid?: string;
  departmentName?: string;
  position?: string;
  email?: string;
  phone?: string;
  status: string;
  roleIds?: string[];
}

export interface Department {
  oid: string;
  name: string;
  managerName?: string;
  status: string;
}

export interface Position {
  id: string;
  oid: string;
  code: string;
  name: string;
  departmentOid: string;
  departmentName?: string;
  level: number;
  status: string;
}

export interface Team {
  id: string;
  oid: string;
  teamCode: string;
  teamName: string;
  departmentOid: string;
  departmentName?: string;
  leaderName: string;
  shiftType: string;
  memberCount: number;
  status: string;
}

export interface Warehouse {
  id: string;
  oid: string;
  code: string;
  name: string;
  warehouseType: string;
  location: string;
  capacity: number;
  status: string;
}

export interface Greenhouse {
  id: string;
  oid: string;
  code: string;
  name: string;
  greenhouseType: string;
  area: number;
  location: string;
  status: string;
}

export interface DictionaryItem {
  id: string;
  category: string;
  code: string;
  name: string;
  color?: string;
  sortNumber: number;
  status: string;
}

export interface Device {
  id: string;
  oid: string;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  manufacturer: string;
  greenhouseOid: string;
  greenhouseName?: string;
  location: string;
  status: string;
}

export interface NotificationChannel {
  id: string;
  oid: string;
  channelCode: string;
  channelName: string;
  channelType: string;
  isActive: number;
}

export interface NotificationRule {
  id: string;
  oid: string;
  ruleCode: string;
  ruleName: string;
  eventType: string;
  recipientType: string;
  channelIds: string;
  frequency: string;
  isActive: number;
}

export interface CodeRule {
  id: string;
  entityType: string;
  prefix: string;
  seqLength: number;
  currentSeq: number;
  description: string;
  status: string;
}

export interface Zone {
  id: string;
  zoneCode: string;
  zoneName: string;
  greenhouseId: string;
  greenhouseName?: string;
  zoneType: string;
  area: number;
  sortOrder: number;
  status: string;
}

export interface Block {
  id: string;
  blockCode: string;
  blockName: string;
  zoneId: string;
  zoneName?: string;
  blockType: string;
  area: number;
  sortOrder: number;
  status: string;
}

export interface DictionaryCategory {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
  sortOrder: number;
  status: string;
}

// Context类型
interface SettingsDataContextType {
  // 数据状态
  users: User[];
  departments: Department[];
  positions: Position[];
  teams: Team[];
  warehouses: Warehouse[];
  greenhouses: Greenhouse[];
  dictionaries: DictionaryItem[];
  devices: Device[];
  notificationChannels: NotificationChannel[];
  notificationRules: NotificationRule[];
  codeRules: CodeRule[];
  zones: Zone[];
  blocks: Block[];
  dictionaryCategories: DictionaryCategory[];

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // 刷新函数
  refreshAll: () => void;
  refreshUsers: () => void;
  refreshDepartments: () => void;
  refreshPositions: () => void;
  refreshTeams: () => void;
  refreshWarehouses: () => void;
  refreshGreenhouses: () => void;
  refreshDictionaries: () => void;
  refreshDevices: () => void;
  refreshNotificationChannels: () => void;
  refreshNotificationRules: () => void;
  refreshCodeRules: () => void;
  refreshZones: () => void;
  refreshBlocks: () => void;
  refreshDictionaryCategories: () => void;

  // 获取字典项
  getDictItems: (category: string) => DictionaryItem[];
  getDictItemName: (category: string, code: string) => string;
}

const SettingsDataContext = createContext<SettingsDataContextType | null>(null);

// API基础URL
const API_BASE = '/api/basic-data';

// 获取数据的辅助函数
async function fetchData<T>(url: string): Promise<T[]> {
  const response = await fetch(url);
  const result = await response.json();
  if (result.success) {
    return result.data || [];
  }
  return [];
}

interface SettingsDataProviderProps {
  children: ReactNode;
}

export function SettingsDataProvider({ children }: SettingsDataProviderProps) {
  // 数据状态
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [greenhouses, setGreenhouses] = useState<Greenhouse[]>([]);
  const [dictionaries, setDictionaries] = useState<DictionaryItem[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [notificationChannels, setNotificationChannels] = useState<NotificationChannel[]>([]);
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [codeRules, setCodeRules] = useState<CodeRule[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dictionaryCategories, setDictionaryCategories] = useState<DictionaryCategory[]>([]);

  // 加载状态
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 刷新函数
  const refreshUsers = useCallback(async () => {
    try {
      // 从权限系统获取用户列表
      const response = await fetch('/api/authority/users');
      const data = await response.json();
      if (Array.isArray(data)) {
        // 标准化用户数据，兼容realName和name字段
        const normalizedUsers: User[] = data.map((u: any) => ({
          id: u.id,
          oid: u.oid,
          username: u.username,
          realName: u.real_name || u.realName || u.name || u.username,
          name: u.real_name || u.realName || u.name || u.username,
          orgOid: u.org_oid || u.orgOid || '',
          orgName: u.org_name || u.orgName || '',
          departmentOid: u.department_oid || u.departmentOid || '',
          departmentName: u.department_name || u.departmentName || '',
          position: u.position || '',
          email: u.email || '',
          phone: u.phone || '',
          status: u.status || 'active',
          roleIds: u.role_ids || u.roleIds || [],
        }));
        setUsers(normalizedUsers);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  }, []);

  const refreshDepartments = useCallback(async () => {
    try {
      const data = await fetchData<Department>(`${API_BASE}/departments`);
      setDepartments(data);
    } catch (e) {
      console.error('Failed to fetch departments:', e);
    }
  }, []);

  const refreshPositions = useCallback(async () => {
    try {
      const data = await fetchData<Position>(`${API_BASE}/positions`);
      setPositions(data);
    } catch (e) {
      console.error('Failed to fetch positions:', e);
    }
  }, []);

  const refreshTeams = useCallback(async () => {
    try {
      const data = await fetchData<Team>(`${API_BASE}/teams`);
      setTeams(data);
    } catch (e) {
      console.error('Failed to fetch teams:', e);
    }
  }, []);

  const refreshWarehouses = useCallback(async () => {
    try {
      const data = await fetchData<Warehouse>(`${API_BASE}/warehouses`);
      setWarehouses(data);
    } catch (e) {
      console.error('Failed to fetch warehouses:', e);
    }
  }, []);

  const refreshGreenhouses = useCallback(async () => {
    try {
      const data = await fetchData<Greenhouse>(`${API_BASE}/greenhouses`);
      setGreenhouses(data);
    } catch (e) {
      console.error('Failed to fetch greenhouses:', e);
    }
  }, []);

  const refreshDictionaries = useCallback(async () => {
    try {
      // 字典 API 路径是 /api/dictionary/dictionaries
      const response = await fetch('/api/dictionary/dictionaries');
      const data = await response.json();
      // API 返回数组格式：[{id, category_code, dict_code, dict_label, ...}, ...]
      if (Array.isArray(data) && data.length > 0) {
        // 转换 API 字段名为前端期望的字段名
        const normalizedData: DictionaryItem[] = data.map((item: any) => ({
          id: item.id,
          category: item.category_code,      // category_code -> category
          code: item.dict_code,              // dict_code -> code
          name: item.dict_label,              // dict_label -> name
          color: item.color,
          sortNumber: item.sort_order || 0,   // sort_order -> sortNumber
          status: item.status || 'active',
        }));
        setDictionaries(normalizedData);
      } else {
        // API 返回空或无效时使用默认数据
        setDictionaries(DEFAULT_DICTIONARIES);
      }
    } catch (e) {
      console.error('Failed to fetch dictionaries:', e);
      // API 失败时使用默认字典数据
      setDictionaries(DEFAULT_DICTIONARIES);
    }
  }, []);

  // 默认字典数据 - 当 API 不可用时提供基础选项
  const DEFAULT_DICTIONARIES: DictionaryItem[] = [
    // 供应商类型
    { id: 'dt-001', category: 'supplier_type', code: 'SP', name: '原材料供应', sortNumber: 1, status: 'active' },
    { id: 'dt-002', category: 'supplier_type', code: 'FE', name: '设施设备', sortNumber: 2, status: 'active' },
    { id: 'dt-003', category: 'supplier_type', code: 'PP', name: '包装材料', sortNumber: 3, status: 'active' },
    { id: 'dt-004', category: 'supplier_type', code: 'EQ', name: '设备配件', sortNumber: 4, status: 'active' },
    { id: 'dt-005', category: 'supplier_type', code: 'FA', name: '工厂用品', sortNumber: 5, status: 'active' },
    { id: 'dt-006', category: 'supplier_type', code: 'IR', name: '办公用品', sortNumber: 6, status: 'active' },
    { id: 'dt-007', category: 'supplier_type', code: 'OP', name: '运营用品', sortNumber: 7, status: 'active' },
    { id: 'dt-008', category: 'supplier_type', code: 'PH', name: '农药', sortNumber: 8, status: 'active' },
    { id: 'dt-009', category: 'supplier_type', code: 'TS', name: '运输服务', sortNumber: 9, status: 'active' },
    { id: 'dt-010', category: 'supplier_type', code: 'UT', name: '公用事业', sortNumber: 10, status: 'active' },
    { id: 'dt-011', category: 'supplier_type', code: 'OT', name: '其他', sortNumber: 11, status: 'active' },

    // 供应商状态
    { id: 'dt-020', category: 'supplier_status', code: 'active', name: '合作中', sortNumber: 1, status: 'active' },
    { id: 'dt-021', category: 'supplier_status', code: 'paused', name: '暂停', sortNumber: 2, status: 'active' },
    { id: 'dt-022', category: 'supplier_status', code: 'terminated', name: '终止', sortNumber: 3, status: 'active' },

    // 供应商属性
    { id: 'dt-030', category: 'supplier_attribute', code: 'enterprise', name: '企业', sortNumber: 1, status: 'active' },
    { id: 'dt-031', category: 'supplier_attribute', code: 'individual', name: '个体户', sortNumber: 2, status: 'active' },
    { id: 'dt-032', category: 'supplier_attribute', code: 'institution', name: '事业单位', sortNumber: 3, status: 'active' },

    // 审批状态
    { id: 'dt-040', category: 'approval_status', code: 'pending', name: '待审批', sortNumber: 1, status: 'active' },
    { id: 'dt-041', category: 'approval_status', code: 'processing', name: '审批中', sortNumber: 2, status: 'active' },
    { id: 'dt-042', category: 'approval_status', code: 'approved', name: '已通过', sortNumber: 3, status: 'active' },
    { id: 'dt-043', category: 'approval_status', code: 'rejected', name: '已拒绝', sortNumber: 4, status: 'active' },
    { id: 'dt-044', category: 'approval_status', code: 'withdrawn', name: '已撤回', sortNumber: 5, status: 'active' },

    // 合同类型
    { id: 'dt-050', category: 'contract_type', code: 'labor', name: '劳动合同', sortNumber: 1, status: 'active' },
    { id: 'dt-051', category: 'contract_type', code: 'internship', name: '实习协议', sortNumber: 2, status: 'active' },
    { id: 'dt-052', category: 'contract_type', code: 'service', name: '劳务合同', sortNumber: 3, status: 'active' },

    // 合同状态
    { id: 'dt-060', category: 'contract_status', code: 'effective', name: '生效中', sortNumber: 1, status: 'active' },
    { id: 'dt-061', category: 'contract_status', code: 'pending', name: '待生效', sortNumber: 2, status: 'active' },
    { id: 'dt-062', category: 'contract_status', code: 'expired', name: '已到期', sortNumber: 3, status: 'active' },
    { id: 'dt-063', category: 'contract_status', code: 'terminated', name: '已终止', sortNumber: 4, status: 'active' },

    // 入职状态
    { id: 'dt-070', category: 'onboarding_status', code: 'pending', name: '待入职', sortNumber: 1, status: 'active' },
    { id: 'dt-071', category: 'onboarding_status', code: 'processing', name: '办理中', sortNumber: 2, status: 'active' },
    { id: 'dt-072', category: 'onboarding_status', code: 'onboarded', name: '已入职', sortNumber: 3, status: 'active' },

    // 招聘来源
    { id: 'dt-080', category: 'recruitment_source', code: 'campus', name: '校园招聘', sortNumber: 1, status: 'active' },
    { id: 'dt-081', category: 'recruitment_source', code: 'social', name: '社会招聘', sortNumber: 2, status: 'active' },
    { id: 'dt-082', category: 'recruitment_source', code: 'referral', name: '内部推荐', sortNumber: 3, status: 'active' },
    { id: 'dt-083', category: 'recruitment_source', code: 'other', name: '其他', sortNumber: 4, status: 'active' },

    // 成本分类
    { id: 'dt-090', category: 'cost_category', code: 'seed', name: '种质资源', sortNumber: 1, status: 'active' },
    { id: 'dt-091', category: 'cost_category', code: 'fertilizer', name: '肥料与土壤改良剂', sortNumber: 2, status: 'active' },
    { id: 'dt-092', category: 'cost_category', code: 'pesticide', name: '农药与植保产品', sortNumber: 3, status: 'active' },
    { id: 'dt-093', category: 'cost_category', code: 'machinery', name: '农业机械', sortNumber: 4, status: 'active' },
    { id: 'dt-094', category: 'cost_category', code: 'safety', name: '劳保与防护用品', sortNumber: 5, status: 'active' },
    { id: 'dt-095', category: 'cost_category', code: 'harvest', name: '采收容器', sortNumber: 6, status: 'active' },
    { id: 'dt-096', category: 'cost_category', code: 'monitoring', name: '监测设备', sortNumber: 7, status: 'active' },
    { id: 'dt-097', category: 'cost_category', code: 'other', name: '其他', sortNumber: 8, status: 'active' },

    // 仓库位置
    { id: 'dt-100', category: 'warehouse_location', code: 'A区', name: '仓库A区', sortNumber: 1, status: 'active' },
    { id: 'dt-101', category: 'warehouse_location', code: 'B区', name: '仓库B区', sortNumber: 2, status: 'active' },
    { id: 'dt-102', category: 'warehouse_location', code: 'C区', name: '仓库C区', sortNumber: 3, status: 'active' },
    { id: 'dt-103', category: 'warehouse_location', code: 'D区', name: '仓库D区', sortNumber: 4, status: 'active' },
    { id: 'dt-104', category: 'warehouse_location', code: 'E区', name: '仓库E区', sortNumber: 5, status: 'active' },

    // 温室状态
    { id: 'dt-110', category: 'greenhouse_status', code: 'using', name: '使用中', sortNumber: 1, status: 'active' },
    { id: 'dt-111', category: 'greenhouse_status', code: 'maintenance', name: '维护中', sortNumber: 2, status: 'active' },
    { id: 'dt-112', category: 'greenhouse_status', code: 'idle', name: '空闲', sortNumber: 3, status: 'active' },

    // 工人状态
    { id: 'dt-120', category: 'worker_status', code: 'working', name: '在职', sortNumber: 1, status: 'active' },
    { id: 'dt-121', category: 'worker_status', code: 'resigned', name: '离职', sortNumber: 2, status: 'active' },
    { id: 'dt-122', category: 'worker_status', code: 'retired', name: '退休', sortNumber: 3, status: 'active' },

    // 薪资状态
    { id: 'dt-130', category: 'salary_status', code: 'pending', name: '待确认', sortNumber: 1, status: 'active' },
    { id: 'dt-131', category: 'salary_status', code: 'confirmed', name: '已确认', sortNumber: 2, status: 'active' },
    { id: 'dt-132', category: 'salary_status', code: 'paid', name: '已发放', sortNumber: 3, status: 'active' },

    // 采购类型
    { id: 'dt-140', category: 'purchase_type', code: 'production', name: '生产性采购', sortNumber: 1, status: 'active' },
    { id: 'dt-141', category: 'purchase_type', code: 'emergency', name: '紧急采购', sortNumber: 2, status: 'active' },
    { id: 'dt-142', category: 'purchase_type', code: 'daily', name: '日常采购', sortNumber: 3, status: 'active' },
    { id: 'dt-143', category: 'purchase_type', code: 'capital', name: '资本性采购', sortNumber: 4, status: 'active' },

    // 物资状态
    { id: 'dt-150', category: 'material_status', code: 'in_stock', name: '库存', sortNumber: 1, status: 'active' },
    { id: 'dt-151', category: 'material_status', code: 'out_of_stock', name: '缺货', sortNumber: 2, status: 'active' },
    { id: 'dt-152', category: 'material_status', code: 'low_stock', name: '库存不足', sortNumber: 3, status: 'active' },

    // 任务状态
    { id: 'dt-160', category: 'task_status', code: 'pending', name: '待处理', sortNumber: 1, status: 'active' },
    { id: 'dt-161', category: 'task_status', code: 'in_progress', name: '进行中', sortNumber: 2, status: 'active' },
    { id: 'dt-162', category: 'task_status', code: 'completed', name: '已完成', sortNumber: 3, status: 'active' },
    { id: 'dt-163', category: 'task_status', code: 'cancelled', name: '已取消', sortNumber: 4, status: 'active' },

    // 采收状态
    { id: 'dt-170', category: 'harvest_status', code: 'pending', name: '待采收', sortNumber: 1, status: 'active' },
    { id: 'dt-171', category: 'harvest_status', code: 'harvested', name: '已采收', sortNumber: 2, status: 'active' },
    { id: 'dt-172', category: 'harvest_status', code: 'graded', name: '已分级', sortNumber: 3, status: 'active' },
    { id: 'dt-173', category: 'harvest_status', code: 'packaged', name: '已包装', sortNumber: 4, status: 'active' },
    { id: 'dt-174', category: 'harvest_status', code: 'shipped', name: '已发货', sortNumber: 5, status: 'active' },

    // 考核状态
    { id: 'dt-180', category: 'performance_status', code: 'pending', name: '待评估', sortNumber: 1, status: 'active' },
    { id: 'dt-181', category: 'performance_status', code: 'evaluated', name: '已评估', sortNumber: 2, status: 'active' },

    // 考勤状态
    { id: 'dt-190', category: 'attendance_status', code: 'normal', name: '正常', sortNumber: 1, status: 'active' },
    { id: 'dt-191', category: 'attendance_status', code: 'late', name: '迟到', sortNumber: 2, status: 'active' },
    { id: 'dt-192', category: 'attendance_status', code: 'early', name: '早退', sortNumber: 3, status: 'active' },
    { id: 'dt-193', category: 'attendance_status', code: 'absent', name: '缺勤', sortNumber: 4, status: 'active' },
    { id: 'dt-194', category: 'attendance_status', code: 'overtime', name: '加班', sortNumber: 5, status: 'active' },

    // 技能状态
    { id: 'dt-200', category: 'skill_status', code: 'normal', name: '正常', sortNumber: 1, status: 'active' },
    { id: 'dt-201', category: 'skill_status', code: 'expiring', name: '即将过期', sortNumber: 2, status: 'active' },
    { id: 'dt-202', category: 'skill_status', code: 'expired', name: '已过期', sortNumber: 3, status: 'active' },

    // 离职原因
    { id: 'dt-210', category: 'resignation_reason', code: 'personal', name: '个人原因', sortNumber: 1, status: 'active' },
    { id: 'dt-211', category: 'resignation_reason', code: 'career', name: '职业发展', sortNumber: 2, status: 'active' },
    { id: 'dt-212', category: 'resignation_reason', code: 'compensation', name: '薪酬原因', sortNumber: 3, status: 'active' },
    { id: 'dt-213', category: 'resignation_reason', code: 'family', name: '家庭原因', sortNumber: 4, status: 'active' },
    { id: 'dt-214', category: 'resignation_reason', code: 'other', name: '其他', sortNumber: 5, status: 'active' },

    // 离职类型
    { id: 'dt-220', category: 'resignation_type', code: 'voluntary', name: '主动离职', sortNumber: 1, status: 'active' },
    { id: 'dt-221', category: 'resignation_type', code: 'passive', name: '被动离职', sortNumber: 2, status: 'active' },
    { id: 'dt-222', category: 'resignation_type', code: 'retirement', name: '退休', sortNumber: 3, status: 'active' },

    // 物品归还状态
    { id: 'dt-230', category: 'return_status', code: 'pending', name: '待归还', sortNumber: 1, status: 'active' },
    { id: 'dt-231', category: 'return_status', code: 'returned', name: '已归还', sortNumber: 2, status: 'active' },
    { id: 'dt-232', category: 'return_status', code: 'damaged', name: '损坏', sortNumber: 3, status: 'active' },
    { id: 'dt-233', category: 'return_status', code: 'lost', name: '丢失', sortNumber: 4, status: 'active' },

    // 岗位类型
    { id: 'dt-240', category: 'position_type', code: 'full_time', name: '全职', sortNumber: 1, status: 'active' },
    { id: 'dt-241', category: 'position_type', code: 'part_time', name: '兼职', sortNumber: 2, status: 'active' },
    { id: 'dt-242', category: 'position_type', code: 'contract', name: '合同工', sortNumber: 3, status: 'active' },
    { id: 'dt-243', category: 'position_type', code: 'intern', name: '实习生', sortNumber: 4, status: 'active' },

    // 岗位职级
    { id: 'dt-250', category: 'position_level', code: 'senior', name: '高级', sortNumber: 1, status: 'active' },
    { id: 'dt-251', category: 'position_level', code: 'mid', name: '中级', sortNumber: 2, status: 'active' },
    { id: 'dt-252', category: 'position_level', code: 'junior', name: '初级', sortNumber: 3, status: 'active' },
    { id: 'dt-253', category: 'position_level', code: 'entry', name: '入门级', sortNumber: 4, status: 'active' },

    // 工人类型
    { id: 'dt-260', category: 'worker_type', code: 'formal', name: '正式工', sortNumber: 1, status: 'active' },
    { id: 'dt-261', category: 'worker_type', code: 'temporary', name: '临时工', sortNumber: 2, status: 'active' },
    { id: 'dt-262', category: 'worker_type', code: 'seasonal', name: '季节工', sortNumber: 3, status: 'active' },
    { id: 'dt-263', category: 'worker_type', code: 'none', name: '无合同', sortNumber: 4, status: 'active' },

    // 保险类型
    { id: 'dt-270', category: 'insurance_type', code: 'work_injury', name: '工伤险', sortNumber: 1, status: 'active' },
    { id: 'dt-271', category: 'insurance_type', code: 'comprehensive', name: '综合险', sortNumber: 2, status: 'active' },
    { id: 'dt-272', category: 'insurance_type', code: 'none', name: '无保险', sortNumber: 3, status: 'active' },

    // 临时工来源
    { id: 'dt-280', category: 'temp_worker_source', code: 'agency', name: '劳务公司', sortNumber: 1, status: 'active' },
    { id: 'dt-281', category: 'temp_worker_source', code: 'individual', name: '个人零工', sortNumber: 2, status: 'active' },
    { id: 'dt-282', category: 'temp_worker_source', code: 'student', name: '学生实习', sortNumber: 3, status: 'active' },

    // 作业区域
    { id: 'dt-290', category: 'work_zone', code: 'A区', name: 'A区', sortNumber: 1, status: 'active' },
    { id: 'dt-291', category: 'work_zone', code: 'B区', name: 'B区', sortNumber: 2, status: 'active' },
    { id: 'dt-292', category: 'work_zone', code: 'C区', name: 'C区', sortNumber: 3, status: 'active' },
    { id: 'dt-293', category: 'work_zone', code: 'D区', name: 'D区', sortNumber: 4, status: 'active' },

    // 临时工状态
    { id: 'dt-300', category: 'temp_worker_status', code: 'working', name: '在职', sortNumber: 1, status: 'active' },
    { id: 'dt-301', category: 'temp_worker_status', code: 'resigned', name: '离职', sortNumber: 2, status: 'active' },
    { id: 'dt-302', category: 'temp_worker_status', code: 'leave', name: '停薪留职', sortNumber: 3, status: 'active' },
    { id: 'dt-303', category: 'temp_worker_status', code: 'probation', name: '试用期', sortNumber: 4, status: 'active' },

    // 加班类型
    { id: 'dt-310', category: 'overtime_type', code: 'normal', name: '普通加班', sortNumber: 1, status: 'active' },
    { id: 'dt-311', category: 'overtime_type', code: 'weekend', name: '周末加班', sortNumber: 2, status: 'active' },
    { id: 'dt-312', category: 'overtime_type', code: 'holiday', name: '节假日加班', sortNumber: 3, status: 'active' },

    // 请假类型
    { id: 'dt-320', category: 'leave_type', code: 'personal', name: '事假', sortNumber: 1, status: 'active' },
    { id: 'dt-321', category: 'leave_type', code: 'sick', name: '病假', sortNumber: 2, status: 'active' },
    { id: 'dt-322', category: 'leave_type', code: 'annual', name: '年假', sortNumber: 3, status: 'active' },
    { id: 'dt-323', category: 'leave_type', code: 'marriage', name: '婚假', sortNumber: 4, status: 'active' },
    { id: 'dt-324', category: 'leave_type', code: 'maternity', name: '产假', sortNumber: 5, status: 'active' },
    { id: 'dt-325', category: 'leave_type', code: 'paternity', name: '陪产假', sortNumber: 6, status: 'active' },
    { id: 'dt-326', category: 'leave_type', code: 'bereavement', name: '丧假', sortNumber: 7, status: 'active' },
    { id: 'dt-327', category: 'leave_type', code: 'work_injury', name: '工伤假', sortNumber: 8, status: 'active' },

    // ========== 业务模块字典 ==========
    // 育苗方式
    { id: 'biz-001', category: 'seedling_type', code: 'plug', name: '穴盘育苗', sortNumber: 1, status: 'active' },
    { id: 'biz-002', category: 'seedling_type', code: 'direct', name: '直播育苗', sortNumber: 2, status: 'active' },
    { id: 'biz-003', category: 'seedling_type', code: 'grafting', name: '嫁接育苗', sortNumber: 3, status: 'active' },
    { id: 'biz-004', category: 'seedling_type', code: 'tissue', name: '组培育苗', sortNumber: 4, status: 'active' },
    { id: 'biz-005', category: 'seedling_type', code: 'ground', name: '地栽育苗', sortNumber: 5, status: 'active' },
    { id: 'biz-006', category: 'seedling_type', code: 'floating', name: '漂浮育苗', sortNumber: 6, status: 'active' },
    { id: 'biz-007', category: 'seedling_type', code: 'ebb_flow', name: '潮汐育苗', sortNumber: 7, status: 'active' },
    { id: 'biz-008', category: 'seedling_type', code: 'paper_pot', name: '纸袋育苗', sortNumber: 8, status: 'active' },
    { id: 'biz-009', category: 'seedling_type', code: 'nutrition_cup', name: '营养杯育苗', sortNumber: 9, status: 'active' },
    { id: 'biz-010', category: 'seedling_type', code: 'cutting', name: '扦插育苗', sortNumber: 10, status: 'active' },
    { id: 'biz-011', category: 'seedling_type', code: 'division', name: '分株育苗', sortNumber: 11, status: 'active' },
    { id: 'biz-012', category: 'seedling_type', code: 'other', name: '其他', sortNumber: 12, status: 'active' },

    // 种源类型
    { id: 'biz-020', category: 'source_type', code: 'seed', name: '种子', sortNumber: 1, status: 'active' },
    { id: 'biz-021', category: 'source_type', code: 'seedling', name: '种苗', sortNumber: 2, status: 'active' },
    { id: 'biz-022', category: 'source_type', code: 'cutting', name: '扦插苗', sortNumber: 3, status: 'active' },
    { id: 'biz-023', category: 'source_type', code: 'grafting', name: '嫁接苗', sortNumber: 4, status: 'active' },
    { id: 'biz-024', category: 'source_type', code: 'tissue_culture', name: '组培苗', sortNumber: 5, status: 'active' },
    { id: 'biz-025', category: 'source_type', code: 'split', name: '分株苗', sortNumber: 6, status: 'active' },
    { id: 'biz-026', category: 'source_type', code: 'bulb', name: '种球', sortNumber: 7, status: 'active' },
    { id: 'biz-027', category: 'source_type', code: 'other', name: '其他', sortNumber: 8, status: 'active' },

    // 育苗场地/区域
    { id: 'biz-030', category: 'seedling_site', code: 'SITE001', name: '育苗温室A区', sortNumber: 1, status: 'active' },
    { id: 'biz-031', category: 'seedling_site', code: 'SITE002', name: '育苗温室B区', sortNumber: 2, status: 'active' },
    { id: 'biz-032', category: 'seedling_site', code: 'SITE003', name: '育苗温室C区', sortNumber: 3, status: 'active' },
    { id: 'biz-033', category: 'seedling_site', code: 'SITE004', name: '育苗温室D区', sortNumber: 4, status: 'active' },

    // 种植区域
    { id: 'biz-040', category: 'planting_area', code: 'G001', name: '一棚 > 01区', sortNumber: 1, status: 'active' },
    { id: 'biz-041', category: 'planting_area', code: 'G002', name: '一棚 > 02区', sortNumber: 2, status: 'active' },
    { id: 'biz-042', category: 'planting_area', code: 'G003', name: '二棚 > 01区', sortNumber: 3, status: 'active' },
    { id: 'biz-043', category: 'planting_area', code: 'G004', name: '二棚 > 02区', sortNumber: 4, status: 'active' },
    { id: 'biz-044', category: 'planting_area', code: 'G005', name: '三棚 > 01区', sortNumber: 5, status: 'active' },

    // 目标成活率预设
    { id: 'biz-050', category: 'survival_rate_target', code: '85', name: '85%（保守）', sortNumber: 1, status: 'active' },
    { id: 'biz-051', category: 'survival_rate_target', code: '90', name: '90%（标准）', sortNumber: 2, status: 'active' },
    { id: 'biz-052', category: 'survival_rate_target', code: '95', name: '95%（乐观）', sortNumber: 3, status: 'active' },

    // 育苗计划类型
    { id: 'biz-060', category: 'seedling_plan_type', code: 'routine', name: '常规', sortNumber: 1, status: 'active' },
    { id: 'biz-061', category: 'seedling_plan_type', code: 'urgent', name: '加急', sortNumber: 2, status: 'active' },
    { id: 'biz-062', category: 'seedling_plan_type', code: 'experiment', name: '实验', sortNumber: 3, status: 'active' },

    // 扩繁倍数预设
    { id: 'biz-070', category: 'propagation_multiple', code: '5', name: '3-5倍（多肉植物等）', sortNumber: 1, status: 'active' },
    { id: 'biz-071', category: 'propagation_multiple', code: '10', name: '5-10倍（吊兰、吊竹梅等）', sortNumber: 2, status: 'active' },
    { id: 'biz-072', category: 'propagation_multiple', code: '20', name: '10-20倍（菊花分株等）', sortNumber: 3, status: 'active' },
    { id: 'biz-073', category: 'propagation_multiple', code: '50', name: '30-50倍（普通草莓扩繁）', sortNumber: 4, status: 'active' },
    { id: 'biz-074', category: 'propagation_multiple', code: '80', name: '50-80倍（草莓优良品种）', sortNumber: 5, status: 'active' },
    { id: 'biz-075', category: 'propagation_multiple', code: '500', name: '100-500倍（普通组培）', sortNumber: 6, status: 'active' },
    { id: 'biz-076', category: 'propagation_multiple', code: '1000', name: '500-1000倍（高品质组培）', sortNumber: 7, status: 'active' },
    { id: 'biz-077', category: 'propagation_multiple', code: '0', name: '其他（自定义倍数）', sortNumber: 8, status: 'active' },

    // 来源类型
    { id: 'biz-078', category: 'source_type', code: 'seed', name: '种子', sortNumber: 1, status: 'active' },
    { id: 'biz-079', category: 'source_type', code: 'seedling', name: '种苗', sortNumber: 2, status: 'active' },

    // 种植状态
    { id: 'biz-085', category: 'planting_status', code: 'planted', name: '已定植', sortNumber: 1, status: 'active' },
    { id: 'biz-086', category: 'planting_status', code: 'growing', name: '生长期', sortNumber: 2, status: 'active' },
    { id: 'biz-087', category: 'planting_status', code: 'harvested', name: '已采收', sortNumber: 3, status: 'active' },
    { id: 'biz-088', category: 'planting_status', code: 'cancelled', name: '已取消', sortNumber: 4, status: 'active' },

    // 操作人员
    { id: 'biz-080', category: 'operator', code: '李明辉', name: '李明辉', sortNumber: 1, status: 'active' },
    { id: 'biz-081', category: 'operator', code: '王建国', name: '王建国', sortNumber: 2, status: 'active' },
    { id: 'biz-082', category: 'operator', code: '张伟', name: '张伟', sortNumber: 3, status: 'active' },
    { id: 'biz-083', category: 'operator', code: '刘洋', name: '刘洋', sortNumber: 4, status: 'active' },
    { id: 'biz-084', category: 'operator', code: '陈静', name: '陈静', sortNumber: 5, status: 'active' },

    // ========== 新增字典分类 ==========
    // 作物类别
    { id: 'dt-crop-001', category: 'crop_category', code: 'vegetable', name: '蔬菜类', sortNumber: 1, status: 'active' },
    { id: 'dt-crop-002', category: 'crop_category', code: 'fruit', name: '水果类', sortNumber: 2, status: 'active' },
    { id: 'dt-crop-003', category: 'crop_category', code: 'grain', name: '粮食类', sortNumber: 3, status: 'active' },
    { id: 'dt-crop-004', category: 'crop_category', code: 'other', name: '其他', sortNumber: 4, status: 'active' },

    // 种植模式
    { id: 'dt-plant-001', category: 'planting_mode', code: 'greenhouse', name: '温室种植', sortNumber: 1, status: 'active' },
    { id: 'dt-plant-002', category: 'planting_mode', code: 'open', name: '露天种植', sortNumber: 2, status: 'active' },
    { id: 'dt-plant-003', category: 'planting_mode', code: 'hydroponic', name: '水培', sortNumber: 3, status: 'active' },
    { id: 'dt-plant-004', category: 'planting_mode', code: 'substrate', name: '基质栽培', sortNumber: 4, status: 'active' },
    { id: 'dt-plant-005', category: 'planting_mode', code: 'vertical', name: '立体种植', sortNumber: 5, status: 'active' },

    // 物料类型
    { id: 'dt-mat-001', category: 'material_type', code: 'seed', name: '种子', sortNumber: 1, status: 'active' },
    { id: 'dt-mat-002', category: 'material_type', code: 'seedling', name: '种苗', sortNumber: 2, status: 'active' },
    { id: 'dt-mat-003', category: 'material_type', code: 'fertilizer', name: '肥料', sortNumber: 3, status: 'active' },
    { id: 'dt-mat-004', category: 'material_type', code: 'pesticide', name: '农药', sortNumber: 4, status: 'active' },
    { id: 'dt-mat-005', category: 'material_type', code: 'equipment', name: '设备', sortNumber: 5, status: 'active' },
    { id: 'dt-mat-006', category: 'material_type', code: 'packaging', name: '包装材料', sortNumber: 6, status: 'active' },
    { id: 'dt-mat-007', category: 'material_type', code: 'other', name: '其他', sortNumber: 7, status: 'active' },

    // 工序类型
    { id: 'dt-proc-001', category: 'process_type', code: 'soil_preparation', name: '整地', sortNumber: 1, status: 'active' },
    { id: 'dt-proc-002', category: 'process_type', code: 'seeding', name: '播种', sortNumber: 2, status: 'active' },
    { id: 'dt-proc-003', category: 'process_type', code: 'transplanting', name: '定植', sortNumber: 3, status: 'active' },
    { id: 'dt-proc-004', category: 'process_type', code: 'fertilizing', name: '施肥', sortNumber: 4, status: 'active' },
    { id: 'dt-proc-005', category: 'process_type', code: 'irrigation', name: '灌溉', sortNumber: 5, status: 'active' },
    { id: 'dt-proc-006', category: 'process_type', code: 'pest_control', name: '病虫害防治', sortNumber: 6, status: 'active' },
    { id: 'dt-proc-007', category: 'process_type', code: 'harvesting', name: '采收', sortNumber: 7, status: 'active' },
    { id: 'dt-proc-008', category: 'process_type', code: 'other', name: '其他', sortNumber: 8, status: 'active' },

    // 员工状态
    { id: 'dt-emp-001', category: 'employee_status', code: 'active', name: '在职', sortNumber: 1, status: 'active' },
    { id: 'dt-emp-002', category: 'employee_status', code: 'probation', name: '试用期', sortNumber: 2, status: 'active' },
    { id: 'dt-emp-003', category: 'employee_status', code: 'intern', name: '实习', sortNumber: 3, status: 'active' },
    { id: 'dt-emp-004', category: 'employee_status', code: 'resigned', name: '离职', sortNumber: 4, status: 'active' },

    // 性别
    { id: 'dt-gender-001', category: 'gender', code: 'male', name: '男', sortNumber: 1, status: 'active' },
    { id: 'dt-gender-002', category: 'gender', code: 'female', name: '女', sortNumber: 2, status: 'active' },

    // ========== 业务模块补充字典 ==========
    // 来源途径（种源）
    { id: 'biz-origin-001', category: 'source_origin', code: 'external_purchase', name: '外部采购', sortNumber: 1, status: 'active' },
    { id: 'biz-origin-002', category: 'source_origin', code: 'self_produced', name: '内部自繁', sortNumber: 2, status: 'active' },
    { id: 'biz-origin-003', category: 'source_origin', code: 'commissioned', name: '委托培育', sortNumber: 3, status: 'active' },
    { id: 'biz-origin-004', category: 'source_origin', code: 'gift', name: '政府/机构赠送', sortNumber: 4, status: 'active' },
    { id: 'biz-origin-005', category: 'source_origin', code: 'self_retained', name: '自留种', sortNumber: 5, status: 'active' },
    { id: 'biz-origin-006', category: 'source_origin', code: 'other', name: '其他', sortNumber: 6, status: 'active' },

    // 采收类型
    { id: 'biz-harvest-001', category: 'harvest_type', code: 'product', name: '成品采收', sortNumber: 1, status: 'active' },
    { id: 'biz-harvest-002', category: 'harvest_type', code: 'seed', name: '种子采收', sortNumber: 2, status: 'active' },
    { id: 'biz-harvest-003', category: 'harvest_type', code: 'seedling', name: '种苗采收', sortNumber: 3, status: 'active' },

    // 目标库存
    { id: 'biz-target-001', category: 'target_inventory', code: 'product', name: '产品库存', sortNumber: 1, status: 'active' },
    { id: 'biz-target-002', category: 'target_inventory', code: 'seed', name: '种源库存', sortNumber: 2, status: 'active' },
    { id: 'biz-target-003', category: 'target_inventory', code: 'seedling', name: '育苗库存', sortNumber: 3, status: 'active' },

    // 品质等级
    { id: 'biz-grade-001', category: 'quality_grade', code: 'A', name: 'A级', sortNumber: 1, status: 'active' },
    { id: 'biz-grade-002', category: 'quality_grade', code: 'B', name: 'B级', sortNumber: 2, status: 'active' },
    { id: 'biz-grade-003', category: 'quality_grade', code: 'C', name: 'C级', sortNumber: 3, status: 'active' },

    // 任务优先级
    { id: 'biz-priority-001', category: 'task_priority', code: 'urgent', name: '紧急', sortNumber: 1, status: 'active' },
    { id: 'biz-priority-002', category: 'task_priority', code: 'high', name: '高', sortNumber: 2, status: 'active' },
    { id: 'biz-priority-003', category: 'task_priority', code: 'normal', name: '普通', sortNumber: 3, status: 'active' },

    // 入库类型
    { id: 'biz-inbound-001', category: 'inbound_type', code: 'planting_harvest', name: '种植采收入库', sortNumber: 1, status: 'active' },
    { id: 'biz-inbound-002', category: 'inbound_type', code: 'seedling', name: '育苗成活入库', sortNumber: 2, status: 'active' },
    { id: 'biz-inbound-003', category: 'inbound_type', code: 'seed_source', name: '种源入库', sortNumber: 3, status: 'active' },
  ];

  const refreshDevices = useCallback(async () => {
    try {
      const data = await fetchData<Device>(`${API_BASE}/devices`);
      setDevices(data);
    } catch (e) {
      console.error('Failed to fetch devices:', e);
    }
  }, []);

  const refreshNotificationChannels = useCallback(async () => {
    try {
      const data = await fetchData<NotificationChannel>(`${API_BASE}/notification-channels`);
      setNotificationChannels(data);
    } catch (e) {
      console.error('Failed to fetch notification channels:', e);
    }
  }, []);

  const refreshNotificationRules = useCallback(async () => {
    try {
      const data = await fetchData<NotificationRule>(`${API_BASE}/notification-rules`);
      setNotificationRules(data);
    } catch (e) {
      console.error('Failed to fetch notification rules:', e);
    }
  }, []);

  const refreshCodeRules = useCallback(async () => {
    try {
      const data = await fetchData<CodeRule>(`${API_BASE}/code-rules`);
      setCodeRules(data);
    } catch (e) {
      console.error('Failed to fetch code rules:', e);
    }
  }, []);

  const refreshZones = useCallback(async () => {
    try {
      const data = await fetchData<Zone>(`${API_BASE}/zones`);
      setZones(data);
    } catch (e) {
      console.error('Failed to fetch zones:', e);
    }
  }, []);

  const refreshBlocks = useCallback(async () => {
    try {
      const data = await fetchData<Block>(`${API_BASE}/blocks`);
      setBlocks(data);
    } catch (e) {
      console.error('Failed to fetch blocks:', e);
    }
  }, []);

  const refreshDictionaryCategories = useCallback(async () => {
    try {
      const data = await fetchData<DictionaryCategory>(`${API_BASE}/dictionary-categories`);
      setDictionaryCategories(data);
    } catch (e) {
      console.error('Failed to fetch dictionary categories:', e);
    }
  }, []);

  // 刷新所有数据
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        refreshUsers(),
        refreshDepartments(),
        refreshPositions(),
        refreshTeams(),
        refreshWarehouses(),
        refreshGreenhouses(),
        refreshDictionaries(),
        refreshDevices(),
        refreshNotificationChannels(),
        refreshNotificationRules(),
        refreshCodeRules(),
        refreshZones(),
        refreshBlocks(),
        refreshDictionaryCategories(),
      ]);
    } catch (e) {
      setError('Failed to load settings data');
      console.error('Failed to refresh all settings data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [
    refreshUsers,
    refreshDepartments,
    refreshPositions,
    refreshTeams,
    refreshWarehouses,
    refreshGreenhouses,
    refreshDictionaries,
    refreshDevices,
    refreshNotificationChannels,
    refreshNotificationRules,
    refreshCodeRules,
    refreshZones,
    refreshBlocks,
    refreshDictionaryCategories,
  ]);

  // 获取字典项
  const getDictItems = useCallback((category: string): DictionaryItem[] => {
    return dictionaries.filter(d => d.category === category && d.status === 'active');
  }, [dictionaries]);

  const getDictItemName = useCallback((category: string, code: string): string => {
    const item = dictionaries.find(d => d.category === category && d.code === code);
    return item?.name || code;
  }, [dictionaries]);

  // 初始加载
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // 监听全局刷新事件
  useEffect(() => {
    const handleRefresh = () => {
      refreshAll();
    };
    window.addEventListener('settings:refresh', handleRefresh);
    return () => {
      window.removeEventListener('settings:refresh', handleRefresh);
    };
  }, [refreshAll]);

  const value: SettingsDataContextType = {
    users,
    departments,
    positions,
    teams,
    warehouses,
    greenhouses,
    dictionaries,
    devices,
    notificationChannels,
    notificationRules,
    codeRules,
    zones,
    blocks,
    dictionaryCategories,
    isLoading,
    error,
    refreshAll,
    refreshUsers,
    refreshDepartments,
    refreshPositions,
    refreshTeams,
    refreshWarehouses,
    refreshGreenhouses,
    refreshDictionaries,
    refreshDevices,
    refreshNotificationChannels,
    refreshNotificationRules,
    refreshCodeRules,
    refreshZones,
    refreshBlocks,
    refreshDictionaryCategories,
    getDictItems,
    getDictItemName,
  };

  return (
    <SettingsDataContext.Provider value={value}>
      {children}
    </SettingsDataContext.Provider>
  );
}

export function useSettingsData() {
  const context = useContext(SettingsDataContext);
  if (!context) {
    throw new Error('useSettingsData must be used within a SettingsDataProvider');
  }
  return context;
}

export function useUsers() {
  const { users, refreshUsers } = useSettingsData();
  return { users, refreshUsers };
}

export function useDepartments() {
  const { departments, refreshDepartments } = useSettingsData();
  return { departments, refreshDepartments };
}

export function usePositions() {
  const { positions, refreshPositions } = useSettingsData();
  return { positions, refreshPositions };
}

export function useTeams() {
  const { teams, refreshTeams } = useSettingsData();
  return { teams, refreshTeams };
}

export function useWarehouses() {
  const { warehouses, refreshWarehouses } = useSettingsData();
  return { warehouses, refreshWarehouses };
}

export function useGreenhouses() {
  const { greenhouses, refreshGreenhouses } = useSettingsData();
  return { greenhouses, refreshGreenhouses };
}

export function useDictionaries() {
  const { dictionaries, getDictItems, getDictItemName, refreshDictionaries } = useSettingsData();
  return { dictionaries, getDictItems, getDictItemName, refreshDictionaries };
}

export function useDevices() {
  const { devices, refreshDevices } = useSettingsData();
  return { devices, refreshDevices };
}

export function useNotificationChannels() {
  const { notificationChannels, refreshNotificationChannels } = useSettingsData();
  return { notificationChannels, refreshNotificationChannels };
}

export function useNotificationRules() {
  const { notificationRules, refreshNotificationRules } = useSettingsData();
  return { notificationRules, refreshNotificationRules };
}

export function useCodeRules() {
  const { codeRules, refreshCodeRules } = useSettingsData();
  return { codeRules, refreshCodeRules };
}

export function useZones() {
  const { zones, refreshZones } = useSettingsData();
  return { zones, refreshZones };
}

export function useBlocks() {
  const { blocks, refreshBlocks } = useSettingsData();
  return { blocks, refreshBlocks };
}

export function useDictionaryCategories() {
  const { dictionaryCategories, refreshDictionaryCategories } = useSettingsData();
  return { dictionaryCategories, refreshDictionaryCategories };
}

// 触发全局刷新的函数
export function triggerSettingsRefresh() {
  window.dispatchEvent(new CustomEvent('settings:refresh'));
}
