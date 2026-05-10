/**
 * 技术方案数据服务
 * 使用 localStorage 实现数据持久化
 */

const STORAGE_KEY = 'tech_solutions';

// 技术方案类型
export interface TechSolution {
  id: string;
  code: string;
  title: string;
  crop: string;
  cropCode: string;
  plantingMode: string;
  stage: string;
  version: string;
  content: string;
  author: string;
  authorId: string;
  createDate: string;
  updateTime: string;
  status: string;
  batchStatus: string;
  statusClass: string;
  approveStatus: string;
  approvalCode: string;
  approvalDate: string;
  approver: string;
  relatedBatchCode: string;
  planDetailFileName: string;
  priority: string;
  remarks: string;
}

// 初始化默认数据
const defaultData: TechSolution[] = [
  {
    id: 'TS001',
    code: 'T202601001',
    title: '番茄春季高产栽培技术方案',
    crop: '番茄',
    cropCode: 'PD030102001',
    plantingMode: '水培',
    stage: '生长全周期',
    version: 'V2.1',
    content: '本方案针对春季番茄栽培，从品种选择、育苗、定植、田间管理、病虫害防治等方面进行详细介绍，旨在提高番茄产量和品质。',
    author: '李建国',
    authorId: 'U001',
    createDate: '2026-01-10',
    updateTime: '2026-01-10 10:00:00',
    status: '已发布',
    batchStatus: 'published',
    statusClass: 'normal',
    approveStatus: '已审批',
    approvalCode: 'AP-T202601001',
    approvalDate: '2026-01-12',
    approver: 'Susan',
    relatedBatchCode: 'ZZB2026-001',
    planDetailFileName: '番茄春季高产栽培技术方案-T202601001.md',
    priority: 'normal',
    remarks: '',
  },
  {
    id: 'TS002',
    code: 'T202601002',
    title: '黄瓜设施栽培技术方案',
    crop: '黄瓜',
    cropCode: 'PD030301001',
    plantingMode: '土培',
    stage: '设施栽培',
    version: 'V1.5',
    content: '本方案介绍黄瓜设施栽培的关键技术，包括温室环境调控、水肥管理、植株调整等内容，适用于温室大棚种植。',
    author: '王建华',
    authorId: 'U002',
    createDate: '2026-01-15',
    updateTime: '2026-01-15 14:00:00',
    status: '已发布',
    batchStatus: 'published',
    statusClass: 'normal',
    approveStatus: '已审批',
    approvalCode: 'AP-T202601002',
    approvalDate: '2026-01-18',
    approver: 'Susan',
    relatedBatchCode: 'ZZB2026-002',
    planDetailFileName: '黄瓜设施栽培技术方案-T202601002.docx',
    priority: 'normal',
    remarks: '',
  },
  {
    id: 'TS003',
    code: 'T202602001',
    title: '草莓冬季促成栽培技术方案',
    crop: '草莓',
    cropCode: 'FR010100100',
    plantingMode: '基质培',
    stage: '冬季促成',
    version: 'V1.0',
    content: '本方案针对草莓冬季促成栽培技术，包括保温措施，光照调控、肥水管理等进行详细说明。',
    author: '李建国',
    authorId: 'U001',
    createDate: '2026-02-01',
    updateTime: '2026-02-01 09:00:00',
    status: '待审批',
    batchStatus: 'pending',
    statusClass: 'pending',
    approveStatus: '待审批',
    approvalCode: '',
    approvalDate: '',
    approver: 'Susan',
    relatedBatchCode: 'ZZB2026-003',
    planDetailFileName: '草莓冬季促成栽培技术方案-T202602001.md',
    priority: 'normal',
    remarks: '',
  },
  {
    id: 'TS004',
    code: 'T202602002',
    title: '辣椒越夏栽培技术方案',
    crop: '辣椒',
    cropCode: 'PD030104001',
    plantingMode: '土培',
    stage: '越夏管理',
    version: 'V1.2',
    content: '本方案介绍辣椒越夏栽培技术，重点解决夏季高温对辣椒生长的影响，确保高产稳产。',
    author: '王建华',
    authorId: 'U002',
    createDate: '2026-02-20',
    updateTime: '2026-02-20 10:00:00',
    status: '已发布',
    batchStatus: 'published',
    statusClass: 'normal',
    approveStatus: '已审批',
    approvalCode: 'AP-T202602002',
    approvalDate: '2026-02-25',
    approver: 'Susan',
    relatedBatchCode: 'ZZB2026-001',
    planDetailFileName: '辣椒越夏栽培技术方案-T202602002.docx',
    priority: 'normal',
    remarks: '',
  },
];

/**
 * 从 localStorage 读取数据
 */
function getStoredData(): TechSolution[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (error) {
      console.error('技术方案数据解析失败:', error);
      return defaultData;
    }
  }
  return defaultData;
}

/**
 * 保存数据到 localStorage
 */
function saveData(data: TechSolution[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// ==================== 对外接口 ====================

/**
 * 获取所有技术方案
 */
export function getTechSolutions(): TechSolution[] {
  return getStoredData();
}

/**
 * 根据ID获取单个技术方案
 */
export function getTechSolutionById(id: string): TechSolution | undefined {
  const data = getStoredData();
  return data.find(item => item.id === id);
}

/**
 * 根据编码获取技术方案
 */
export function getTechSolutionByCode(code: string): TechSolution | undefined {
  const data = getStoredData();
  return data.find(item => item.code === code);
}

/**
 * 添加技术方案
 */
export function addTechSolution(solution: Omit<TechSolution, 'id'>): TechSolution {
  const data = getStoredData();
  const newSolution: TechSolution = {
    ...solution,
    id: `TS${Date.now()}`,
  };
  data.unshift(newSolution);
  saveData(data);
  return newSolution;
}

/**
 * 更新技术方案
 */
export function updateTechSolution(id: string, updates: Partial<TechSolution>): TechSolution | null {
  const data = getStoredData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return null;

  data[index] = { ...data[index], ...updates };
  saveData(data);
  return data[index];
}

/**
 * 删除技术方案
 */
export function deleteTechSolution(id: string): boolean {
  const data = getStoredData();
  const index = data.findIndex(item => item.id === id);
  if (index === -1) return false;

  data.splice(index, 1);
  saveData(data);
  return true;
}

/**
 * 批量删除技术方案
 */
export function deleteTechSolutions(ids: string[]): boolean {
  const data = getStoredData();
  const filtered = data.filter(item => !ids.includes(item.id));
  if (filtered.length === data.length) return false;
  saveData(filtered);
  return true;
}

/**
 * 重置数据到默认状态
 */
export function resetTechSolutions(): void {
  saveData(defaultData);
}
