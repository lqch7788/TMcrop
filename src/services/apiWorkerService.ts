/**
 * 员工API服务
 * 提供员工数据的API调用封装，支持降级方案
 */

import { Worker } from '../types';
import { getAllWorkers, getActiveWorkers } from './apiLaborService';

// 缓存的员工数据
let cachedWorkers: Worker[] = [];
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 缓存5分钟

// MOCK数据作为API失败时的降级方案
const FALLBACK_WORKERS: Worker[] = [
  { id: 'U001', workerId: 'U001', name: '陆启闯', gender: '男', phone: '13811112222', position: '管理员', department: '管理部', status: 'active' },
  { id: 'S001', workerId: 'S001', name: '郭靖', gender: '男', phone: '13800001001', position: '农艺师', department: '生产部', status: 'active' },
  { id: 'S002', workerId: 'S002', name: '杨过', gender: '男', phone: '13800001002', position: '技术员', department: '生产部', status: 'active' },
  { id: 'S003', workerId: 'S003', name: '张无忌', gender: '男', phone: '13800001003', position: '管理员', department: '生产部', status: 'active' },
  { id: 'S004', workerId: 'S004', name: '令狐冲', gender: '男', phone: '13800001004', position: '农艺师', department: '生产部', status: 'active' },
  { id: 'S005', workerId: 'S005', name: '段誉', gender: '男', phone: '13800001005', position: '技术员', department: '生产部', status: 'active' },
  { id: 'S006', workerId: 'S006', name: '黄蓉', gender: '女', phone: '13800001006', position: '管理员', department: '生产部', status: 'active' },
  { id: 'S007', workerId: 'S007', name: '陈家洛', gender: '男', phone: '13800001007', position: '农艺师', department: '生产部', status: 'active' },
  { id: 'S008', workerId: 'S008', name: '任盈盈', gender: '女', phone: '13800001008', position: '技术员', department: '生产部', status: 'active' },
];

/**
 * 获取所有员工列表（带缓存）
 * @param forceRefresh 是否强制刷新缓存
 * @returns 员工列表
 */
export async function getWorkers(forceRefresh: boolean = false): Promise<Worker[]> {
  const now = Date.now();

  // 如果缓存有效且不强制刷新，直接返回缓存
  if (!forceRefresh && cachedWorkers.length > 0 && (now - cacheTime) < CACHE_DURATION) {
    return cachedWorkers;
  }

  try {
    const workers = await getAllWorkers();
    // API 成功但返回空数据时，使用降级数据
    if (!workers || workers.length === 0) {
      console.warn('员工API返回空数据，使用降级员工列表');
      cachedWorkers = FALLBACK_WORKERS;
      cacheTime = now;
      return FALLBACK_WORKERS;
    }
    cachedWorkers = workers;
    cacheTime = now;
    return workers;
  } catch (error) {
    console.error('获取员工列表失败，使用降级方案:', error);
    // API失败时返回降级数据
    return FALLBACK_WORKERS;
  }
}

/**
 * 获取在职员工列表（带缓存）
 * @param forceRefresh 是否强制刷新缓存
 * @returns 在职员工列表
 */
export async function getWorkerList(forceRefresh: boolean = false): Promise<Worker[]> {
  const now = Date.now();

  // 如果缓存有效且不强制刷新，直接返回缓存
  if (!forceRefresh && cachedWorkers.length > 0 && (now - cacheTime) < CACHE_DURATION) {
    return cachedWorkers.filter(w => w.status === 'active');
  }

  try {
    const workers = await getActiveWorkers();
    // API 成功但返回空数据时（数据库无员工记录），使用降级数据
    if (!workers || workers.length === 0) {
      console.warn('员工API返回空数据，使用降级员工列表');
      cachedWorkers = FALLBACK_WORKERS;
      cacheTime = now;
      return FALLBACK_WORKERS;
    }
    cachedWorkers = workers;
    cacheTime = now;
    return workers;
  } catch (error) {
    console.error('获取在职员工列表失败，使用降级方案:', error);
    // API失败时返回降级数据
    return FALLBACK_WORKERS;
  }
}

/**
 * 根据ID获取员工姓名
 * @param employeeId 员工ID
 * @returns 员工姓名
 */
export async function getWorkerNameById(employeeId: string): Promise<string> {
  try {
    const workers = await getWorkers();
    const worker = workers.find(w => w.id === employeeId || w.workerId === employeeId);
    return worker?.name || '未知员工';
  } catch (error) {
    console.error('获取员工姓名失败:', error);
    // 尝试从降级数据中查找
    const fallbackWorker = FALLBACK_WORKERS.find(w => w.id === employeeId || w.workerId === employeeId);
    return fallbackWorker?.name || '未知员工';
  }
}

/**
 * 清除员工缓存
 */
export function clearWorkerCache(): void {
  cachedWorkers = [];
  cacheTime = 0;
}

/**
 * 获取员工选择列表（用于下拉框）
 * @returns 简化的员工选择项列表
 */
export async function getWorkerSelectList(): Promise<Array<{ id: string; name: string }>> {
  const workers = await getWorkerList();
  return workers.map(w => ({
    id: w.id,
    name: w.name,
  }));
}
