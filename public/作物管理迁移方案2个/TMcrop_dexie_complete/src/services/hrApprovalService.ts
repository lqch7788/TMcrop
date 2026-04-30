/**
 * HR审批服务 - 人工管理模块
 * 处理员工相关审批流程，包括请假、加班、离职等审批业务
 */

import { LeaveRecord, LeaveType } from '../types/labor/employee';

// 审批类型枚举
export type ApprovalType = 'LEAVE' | 'OVERTIME' | 'RESIGNATION' | 'TRANSFER' | 'SALARY_ADJUSTMENT';

// 审批状态枚举
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

/**
 * 审批记录基础接口
 */
export interface Approval {
  /** 审批ID */
  id: string;
  /** 审批类型 */
  type: ApprovalType;
  /** 申请人ID */
  applicantId: string;
  /** 审批人ID */
  approverId: string;
  /** 审批状态 */
  status: ApprovalStatus;
  /** 申请时间 */
  applyTime: string;
  /** 审批时间 */
  approveTime?: string;
  /** 审批备注 */
  remark?: string;
  /** 关联业务数据ID */
  businessId: string;
}

/**
 * 请假审批记录
 */
export interface LeaveApproval extends Approval {
  type: 'LEAVE';
  businessId: string; // 关联LeaveRecord.id
}

/**
 * 审批查询过滤器
 */
export interface ApprovalFilter {
  /** 审批类型 */
  type?: ApprovalType;
  /** 申请人ID */
  applicantId?: string;
  /** 审批人ID */
  approverId?: string;
  /** 审批状态 */
  status?: ApprovalStatus;
  /** 开始日期筛选 */
  startDate?: string;
  /** 结束日期筛选 */
  endDate?: string;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  /** 当前页码（从1开始） */
  page?: number;
  /** 每页条数 */
  pageSize?: number;
}

/**
 * 分页结果
 */
export interface PaginatedResult<T> {
  /** 数据列表 */
  list: T[];
  /** 总条数 */
  total: number;
  /** 当前页码 */
  page: number;
  /** 每页条数 */
  pageSize: number;
  /** 总页数 */
  totalPages: number;
}

/**
 * 创建审批请求参数
 */
export interface CreateApprovalParams {
  type: ApprovalType;
  applicantId: string;
  approverId: string;
  businessId: string;
  remark?: string;
}

/**
 * LocalStorage存储键名
 */
const STORAGE_KEY = 'HR_APPROVALS';

/**
 * 生成审批ID
 */
function generateApprovalId(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `APR-${dateStr}-${random}`;
}

/**
 * 从LocalStorage获取审批列表
 */
function getStoredApprovals(): Approval[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    console.error('读取审批数据失败');
    return [];
  }
}

/**
 * 保存审批列表到LocalStorage
 */
function saveApprovals(approvals: Approval[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(approvals));
  } catch (error) {
    console.error('保存审批数据失败:', error);
  }
}

/**
 * HR审批服务类
 */
export class HrApprovalService {
  /**
   * 创建审批记录
   * @param data 审批数据
   * @returns 审批ID
   */
  createApproval(data: CreateApprovalParams): string {
    const approvals = getStoredApprovals();
    const now = new Date().toISOString();

    const approval: Approval = {
      id: generateApprovalId(),
      type: data.type,
      applicantId: data.applicantId,
      approverId: data.approverId,
      status: 'PENDING',
      applyTime: now,
      businessId: data.businessId,
      remark: data.remark,
    };

    approvals.push(approval);
    saveApprovals(approvals);

    return approval.id;
  }

  /**
   * 获取审批列表（支持分页）
   * @param filters 筛选条件
   * @param pagination 分页参数
   * @returns 分页结果
   */
  getApprovalList(filters?: ApprovalFilter, pagination?: PaginationParams): PaginatedResult<Approval> {
    let approvals = getStoredApprovals();

    if (!filters) {
      approvals = [];
    } else {
      // 按筛选条件过滤
      if (filters.type) {
        approvals = approvals.filter(a => a.type === filters.type);
      }
      if (filters.applicantId) {
        approvals = approvals.filter(a => a.applicantId === filters.applicantId);
      }
      if (filters.approverId) {
        approvals = approvals.filter(a => a.approverId === filters.approverId);
      }
      if (filters.status) {
        approvals = approvals.filter(a => a.status === filters.status);
      }
      if (filters.startDate) {
        approvals = approvals.filter(a => a.applyTime >= filters.startDate!);
      }
      if (filters.endDate) {
        approvals = approvals.filter(a => a.applyTime <= filters.endDate!);
      }
    }

    // 按申请时间倒序排列
    approvals.sort((a, b) =>
      new Date(b.applyTime).getTime() - new Date(a.applyTime).getTime()
    );

    // 计算总数
    const total = approvals.length;

    // 如果没有分页参数，返回全部数据（兼容旧代码）
    if (!pagination) {
      return {
        list: approvals,
        total,
        page: 1,
        pageSize: total,
        totalPages: 1,
      };
    }

    // 分页参数
    const page = pagination.page || 1;
    const pageSize = pagination.pageSize || 10;

    // 计算分页
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const list = approvals.slice(startIndex, endIndex);

    return {
      list,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * 审批通过
   * @param id 审批ID
   * @returns 是否成功
   */
  approve(id: string): boolean {
    const approvals = getStoredApprovals();
    const index = approvals.findIndex(a => a.id === id);

    if (index === -1) {
      console.error(`审批记录不存在: ${id}`);
      return false;
    }

    if (approvals[index].status !== 'PENDING') {
      console.error(`审批状态不是待审批: ${id}`);
      return false;
    }

    approvals[index] = {
      ...approvals[index],
      status: 'APPROVED',
      approveTime: new Date().toISOString(),
    };

    saveApprovals(approvals);
    return true;
  }

  /**
   * 审批拒绝
   * @param id 审批ID
   * @param remark 拒绝原因
   * @returns 是否成功
   */
  reject(id: string, remark?: string): boolean {
    const approvals = getStoredApprovals();
    const index = approvals.findIndex(a => a.id === id);

    if (index === -1) {
      console.error(`审批记录不存在: ${id}`);
      return false;
    }

    if (approvals[index].status !== 'PENDING') {
      console.error(`审批状态不是待审批: ${id}`);
      return false;
    }

    approvals[index] = {
      ...approvals[index],
      status: 'REJECTED',
      approveTime: new Date().toISOString(),
      remark: remark || approvals[index].remark,
    };

    saveApprovals(approvals);
    return true;
  }

  /**
   * 获取审批详情
   * @param id 审批ID
   * @returns 审批记录
   */
  getApprovalDetail(id: string): Approval | null {
    const approvals = getStoredApprovals();
    return approvals.find(a => a.id === id) || null;
  }

  /**
   * 取消审批
   * @param id 审批ID
   * @returns 是否成功
   */
  cancelApproval(id: string): boolean {
    const approvals = getStoredApprovals();
    const index = approvals.findIndex(a => a.id === id);

    if (index === -1) {
      console.error(`审批记录不存在: ${id}`);
      return false;
    }

    if (approvals[index].status !== 'PENDING') {
      console.error(`只能取消待审批状态: ${id}`);
      return false;
    }

    approvals[index] = {
      ...approvals[index],
      status: 'CANCELLED',
    };

    saveApprovals(approvals);
    return true;
  }

  /**
   * 获取待我审批的数量
   * @param approverId 审批人ID
   * @returns 待审批数量
   */
  getPendingCount(approverId: string): number {
    const approvals = getStoredApprovals();
    return approvals.filter(
      a => a.approverId === approverId && a.status === 'PENDING'
    ).length;
  }
}

// 导出单例实例
export const hrApprovalService = new HrApprovalService();
