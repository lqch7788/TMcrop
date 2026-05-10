/**
 * 公告 LocalStorage 服务
 * 作为 API 降级方案
 */

import type { Notice } from '../pages/types/announcement.types';

const STORAGE_KEY = 'announcement_notices';

// 初始公告数据
const INITIAL_NOTICES: Notice[] = [
  { id: '1', code: 'N20260401', title: '关于2026年春季种植计划的通知', type: '生产公告', category: '生产计划', priority: '高', status: '已发布', sender: '生产管理部', date: '2026-04-15', deadline: '2026-05-15', readCount: 156, recipients: '全体基地', content: '为确保2026年春季种植工作顺利开展，现将种植计划通知如下...' },
  { id: '2', code: 'N20260402', title: '温室环境控制标准更新', type: '生产公告', category: '技术标准', priority: '高', status: '已发布', sender: '技术部', date: '2026-04-18', deadline: '2026-05-01', readCount: 142, recipients: '温室管理人员', content: '根据最新研究成果，现对温室环境控制标准进行更新...' },
  { id: '3', code: 'N20260403', title: '劳动节放假安排通知', type: '行政公告', category: '行政通知', priority: '中', status: '已发布', sender: '行政人事部', date: '2026-04-20', deadline: '2026-05-10', readCount: 234, recipients: '全体员工', content: '根据国家法定节假日安排，现将劳动节放假事宜通知如下...' },
  { id: '4', code: 'N20260404', title: '新员工入职培训通知', type: '行政公告', category: '培训通知', priority: '中', status: '审批中', sender: '行政人事部', date: '2026-04-22', deadline: '2026-05-05', readCount: 0, recipients: '新入职员工', content: '欢迎新员工加入公司，现将入职培训安排通知如下...' },
  { id: '5', code: 'N20260405', title: '农药使用安全规范', type: '生产公告', category: '安全规范', priority: '高', status: '已发布', sender: '安全生产部', date: '2026-04-25', deadline: '2026-06-01', readCount: 128, recipients: '生产人员', content: '为确保农药使用安全，特制定本规范...' },
  { id: '6', code: 'N20260406', title: '办公设备采购通知', type: '行政公告', category: '采购通知', priority: '低', status: '草稿', sender: '行政部', date: '2026-04-28', deadline: '2026-05-15', readCount: 0, recipients: '各部门负责人', content: '根据公司需求，现计划采购一批办公设备...' },
  { id: '7', code: 'N20260501', title: '采收标准更新通知', type: '生产公告', category: '技术标准', priority: '高', status: '已发布', sender: '质量管理部', date: '2026-05-01', deadline: '2026-05-15', readCount: 98, recipients: '采收人员', content: '为提高产品质量，现对采收标准进行更新...' },
  { id: '8', code: 'N20260502', title: '安全生产月活动通知', type: '行政公告', category: '活动通知', priority: '中', status: '已发布', sender: '安全生产部', date: '2026-05-05', deadline: '2026-06-05', readCount: 187, recipients: '全体员工', content: '为提高全员安全意识，现将安全生产月活动安排通知如下...' },
  { id: '9', code: 'N20260503', title: '灌溉系统维护通知', type: '生产公告', category: '设备维护', priority: '中', status: '审批中', sender: '设备管理部', date: '2026-05-08', deadline: '2026-05-20', readCount: 0, recipients: '设备维护人员', content: '为确保灌溉系统正常运行，现将维护计划通知如下...' },
  { id: '10', code: 'N20260504', title: '考勤管理制度修订', type: '行政公告', category: '制度修订', priority: '高', status: '已发布', sender: '行政人事部', date: '2026-05-10', deadline: '2026-06-01', readCount: 210, recipients: '全体员工', content: '为规范考勤管理，现对考勤管理制度进行修订...' },
];

/**
 * 从 localStorage 获取公告列表
 */
function getNoticesFromStorage(): Notice[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    // 初始化数据
    saveNoticesToStorage(INITIAL_NOTICES);
    return INITIAL_NOTICES;
  } catch (error) {
    console.error('读取公告数据失败:', error);
    return INITIAL_NOTICES;
  }
}

/**
 * 保存公告列表到 localStorage
 */
function saveNoticesToStorage(notices: Notice[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notices));
  } catch (error) {
    console.error('保存公告数据失败:', error);
  }
}

/**
 * 生成唯一ID
 */
function generateId(): string {
  return `notice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 获取所有公告
 */
export function getNotices(): Notice[] {
  return getNoticesFromStorage();
}

/**
 * 根据ID获取单个公告
 */
export function getNoticeById(id: string): Notice | undefined {
  const notices = getNoticesFromStorage();
  return notices.find(n => n.id === id);
}

/**
 * 根据ID数组获取多个公告
 */
export function getNoticesByIds(ids: string[]): Notice[] {
  const notices = getNoticesFromStorage();
  return notices.filter(n => ids.includes(n.id));
}

/**
 * 创建公告
 */
export function createNotice(noticeData: Omit<Notice, 'id'>): Notice {
  const notices = getNoticesFromStorage();
  const now = new Date().toISOString().substring(0, 10);

  // 生成公告编号
  const year = now.substring(0, 4);
  const month = now.substring(5, 7);
  const day = now.substring(8, 10);
  const maxCode = notices
    .filter(n => n.code.startsWith(`N${year}${month}${day}`))
    .map(n => {
      const seq = n.code.slice(-3);
      return parseInt(seq, 10) || 0;
    })
    .reduce((max, val) => Math.max(max, val), 0);

  const newNotice: Notice = {
    ...noticeData,
    id: generateId(),
    code: `N${year}${month}${day}${String(maxCode + 1).padStart(3, '0')}`,
    date: now,
    readCount: 0,
  } as Notice;

  notices.unshift(newNotice);
  saveNoticesToStorage(notices);
  return newNotice;
}

/**
 * 更新公告
 */
export function updateNotice(id: string, updates: Partial<Notice>): Notice | null {
  const notices = getNoticesFromStorage();
  const index = notices.findIndex(n => n.id === id);

  if (index === -1) {
    return null;
  }

  notices[index] = { ...notices[index], ...updates };
  saveNoticesToStorage(notices);
  return notices[index];
}

/**
 * 删除公告
 */
export function deleteNotice(id: string): boolean {
  const notices = getNoticesFromStorage();
  const index = notices.findIndex(n => n.id === id);

  if (index === -1) {
    return false;
  }

  notices.splice(index, 1);
  saveNoticesToStorage(notices);
  return true;
}

/**
 * 批量删除公告
 */
export function deleteNotices(ids: string[]): boolean {
  const notices = getNoticesFromStorage();
  const filteredNotices = notices.filter(n => !ids.includes(n.id));
  saveNoticesToStorage(filteredNotices);
  return true;
}

/**
 * 更新公告状态
 */
export function updateNoticeStatus(id: string, status: string): boolean {
  const notices = getNoticesFromStorage();
  const index = notices.findIndex(n => n.id === id);

  if (index === -1) {
    return false;
  }

  notices[index].status = status;
  saveNoticesToStorage(notices);
  return true;
}

/**
 * 增加阅读数
 */
export function incrementReadCount(id: string): boolean {
  const notices = getNoticesFromStorage();
  const index = notices.findIndex(n => n.id === id);

  if (index === -1) {
    return false;
  }

  notices[index].readCount = (notices[index].readCount || 0) + 1;
  saveNoticesToStorage(notices);
  return true;
}

/**
 * 重置公告数据
 */
export function resetNotices(): void {
  saveNoticesToStorage(INITIAL_NOTICES);
}
