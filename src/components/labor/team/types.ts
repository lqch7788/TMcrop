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
  memberNames?: string[]; // 成员姓名列表（与 memberIds 同源，表格展示用）
  description?: string;   // 班组描述
  workZone?: string;      // 作业区域（历史文本字段，已由 zoneIds/zoneNames 取代）
  // 2026-09-17：作业区域统一用关联表数据（team_zone_assignments）
  zoneIds?: string[];     // 关联的区域ID列表
  zoneNames?: string[];   // 关联的区域名称列表（表格展示用）
  capabilityTags?: string[];      // 技能标签（历史字段，已由 taskCapabilities 取代）
  taskCapabilities?: string[];    // 技能标签（来源 team_task_capabilities 表，与派工消费口径一致）
  dailyCapacityHours?: number;    // 日产能上限（小时/天）
  weeklyCapacityHours?: number;   // 周产能上限（小时/周）
  coverageRadiusKm?: number;      // 作业半径（公里，0=不限）
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
  name: string;       // 班组名称
  leaderName: string; // 负责人
  // 2026-09-17：移除 workZone 筛选（作业区域界面已下线）
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
