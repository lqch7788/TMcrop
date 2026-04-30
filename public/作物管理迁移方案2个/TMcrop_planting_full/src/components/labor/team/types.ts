// 班组管理模块类型定义

/**
 * 班组
 */
export interface Team {
  id: string;
  name: string;           // 班组名称
  leaderId: string;       // 负责人ID
  leaderName: string;      // 负责人姓名
  memberIds: string[];    // 成员ID列表
  memberCount: number;     // 成员数量
  description?: string;   // 班组描述
  workZone?: string;      // 作业区域
  createdAt: string;
  updatedAt: string;
}

/**
 * 班组分配记录
 */
export interface TeamAssignment {
  id: string;
  workerId: string;        // 工人ID
  workerName: string;      // 工人姓名
  workerPhone: string;     // 工人电话
  teamId: string;          // 班组ID
  teamName: string;        // 班组名称
  assignDate: string;      // 分配日期
  operatorId: string;      // 操作人ID
  operatorName: string;    // 操作人姓名
  remark?: string;         // 备注
}

/**
 * 班组筛选条件
 */
export interface TeamFilters {
  keyword: string;
}

/**
 * 班组分页
 */
export interface TeamPagination {
  currentPage: number;
  pageSize: number;
  total: number;
}

/**
 * 未分配工人
 */
export interface UnassignedWorker {
  id: string;
  name: string;
  phone: string;
  skillTags: string[];
  workerType: string;
}
