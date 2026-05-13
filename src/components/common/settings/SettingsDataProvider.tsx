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
  baseOid: string;
  baseName: string;
  companyId: string;
  companyName: string;
  lng: number;
  lat: number;
  crop: string;
  growthDay: number;
  manager: string;
  phone: string;
  soilType: string;
  ph: number;
  intro: string;
  greenhouseCount: number;
  fieldArea: number;
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
  oid: string;
  zoneCode: string;
  zoneName: string;
  baseOid: string;        // 所属基地OID (对应数据库 greenhouse_oid)
  baseName?: string;      // 基地名称（用于显示）
  greenhouseName?: string;
  zoneType: string;
  area: number;
  sortOrder: number;
  status: string;
  description?: string;
  createdAt?: string;
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

// 获取认证头
const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// 获取数据的辅助函数
async function fetchData<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { headers: getAuthHeaders() });
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
      const response = await fetch('/api/authority/users', { headers: getAuthHeaders() });
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
      const response = await fetch('/api/dictionary/dictionaries', { headers: getAuthHeaders() });

      if (!response.ok) {
        throw new Error(`API响应错误: ${response.status}`);
      }

      const rawData = await response.json();
      console.log('[SettingsDataProvider] 字典API原始返回:', typeof rawData, Array.isArray(rawData) ? rawData.length : '非数组', rawData);

      // 处理多种可能的响应格式
      let data: Record<string, unknown>[] = [];

      if (Array.isArray(rawData)) {
        // 格式1: 直接返回数组
        data = rawData;
      } else if (rawData && typeof rawData === 'object') {
        // 格式2: 包装格式 {success: true, data: [...]} 或 {data: [...]}
        if (Array.isArray((rawData as any).data)) {
          data = (rawData as any).data;
        } else if (Array.isArray((rawData as any).result)) {
          data = (rawData as any).result;
        }
      }

      console.log('[SettingsDataProvider] 处理后的字典数据量:', data.length);

      if (data.length > 0) {
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
        console.log('[SettingsDataProvider] normalizedData第一条:', normalizedData[0]);
        setDictionaries(normalizedData);
      } else {
        // API 返回空数据时设置空数组，不再使用本地默认数据
        console.log('[SettingsDataProvider] API返回空数据，设置空字典列表');
        setDictionaries([]);
      }
    } catch (e) {
      console.error('[SettingsDataProvider] 获取字典失败:', e);
      // API 失败时设置空数组，不再使用本地默认数据
      setDictionaries([]);
    }
  }, []);

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

  // 刷新所有数据 - 同时调用 Zustand Store 和旧 API
  const refreshAll = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 调用 Zustand Store 加载函数
      await Promise.all([
        useUserStore.getState().loadUsers(),
        useDepartmentStore.getState().loadDepartments(),
        usePositionStore.getState().loadPositions(),
        useTeamStore.getState().loadTeams(),
        useWarehouseStore.getState().loadWarehouses(),
        useGreenhouseStore.getState().loadGreenhouses(),
        useDictionaryStore.getState().loadDictionaries(),
        useDeviceStore.getState().loadDevices(),
        useZoneStore.getState().loadZones(),
        useBlockStore.getState().loadBlocks(),
      ]);
      // 旧 API（notification 等）
      await Promise.all([
        refreshNotificationChannels(),
        refreshNotificationRules(),
        refreshCodeRules(),
        refreshDictionaryCategories(),
      ]);
    } catch (e) {
      setError('Failed to load settings data');
      console.error('Failed to refresh all settings data:', e);
    } finally {
      setIsLoading(false);
    }
  }, [
    refreshNotificationChannels,
    refreshNotificationRules,
    refreshCodeRules,
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

  // 监听全局刷新事件 - 仅刷新字典数据
  useEffect(() => {
    const handleRefresh = () => {
      refreshDictionaries();
    };
    window.addEventListener('settings:refresh', handleRefresh);
    return () => {
      window.removeEventListener('settings:refresh', handleRefresh);
    };
  }, [refreshDictionaries]);

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

// Zustand Store 导入
import { useUserStore } from '../../../stores/useUserStore';
import { useDepartmentStore } from '../../../stores/useDepartmentStore';
import { usePositionStore } from '../../../stores/usePositionStore';
import { useTeamStore } from '../../../stores/useTeamStore';
import { useWarehouseStore } from '../../../stores/useWarehouseStore';
import { useGreenhouseStore } from '../../../stores/useGreenhouseStore';
import { useDictionaryStore } from '../../../stores/useDictionaryStore';
import { useDeviceStore } from '../../../stores/useDeviceStore';
import { useZoneStore } from '../../../stores/useZoneStore';
import { useBlockStore } from '../../../stores/useBlockStore';

export function useUsers() {
  const store = useUserStore();
  return { users: store.users, refreshUsers: store.refreshUsers };
}

export function useDepartments() {
  const store = useDepartmentStore();
  return { departments: store.departments, refreshDepartments: store.refreshDepartments };
}

export function usePositions() {
  const store = usePositionStore();
  return { positions: store.positions, refreshPositions: store.refreshPositions };
}

export function useTeams() {
  const store = useTeamStore();
  return { teams: store.teams, refreshTeams: store.refreshTeams };
}

export function useWarehouses() {
  const store = useWarehouseStore();
  return { warehouses: store.warehouses, refreshWarehouses: store.refreshWarehouses };
}

export function useGreenhouses() {
  const store = useGreenhouseStore();
  return { greenhouses: store.greenhouses, refreshGreenhouses: store.refreshGreenhouses };
}

export function useDictionaries() {
  const store = useDictionaryStore();
  const dictionaries = store.dictionaries.map(d => ({
    id: d.id,
    category: d.categoryCode,
    code: d.dictCode,
    name: d.dictLabel,
    color: d.color,
    sortNumber: d.sortOrder,
    status: d.status,
  }));
  const getDictItems = (category: string) => dictionaries.filter(d => d.category === category && d.status === 'active');
  const getDictItemName = (category: string, code: string) => {
    const item = dictionaries.find(d => d.category === category && d.code === code);
    return item?.name || code;
  };
  return { dictionaries, getDictItems, getDictItemName, refreshDictionaries: store.refreshDictionaries };
}

export function useDevices() {
  const store = useDeviceStore();
  return { devices: store.devices, refreshDevices: store.refreshDevices };
}

export function useZones() {
  const store = useZoneStore();
  return { zones: store.zones, refreshZones: store.refreshZones };
}

export function useBlocks() {
  const store = useBlockStore();
  return { blocks: store.blocks, refreshBlocks: store.refreshBlocks };
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

export function useDictionaryCategories() {
  const { dictionaryCategories, refreshDictionaryCategories } = useSettingsData();
  return { dictionaryCategories, refreshDictionaryCategories };
}

// 触发全局刷新的函数
export function triggerSettingsRefresh() {
  window.dispatchEvent(new CustomEvent('settings:refresh'));
}
