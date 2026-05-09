/**
 * 离职申请页面类型定义
 */
import { Approval, ApprovalType, ApprovalStatus } from '../../../types/approval';

/** 离职类型 */
export type ResignationType = '主动离职' | '被动离职';

/** 主动离职原因 */
export type VoluntaryReason = '个人发展' | '家庭原因' | '薪资待遇' | '工作环境' | '其他';

/** 被动离职原因 */
export type InvoluntaryReason = '合同到期' | '试用期不合格' | '绩效不达标' | '违纪' | '其他';

/** 离职记录状态 */
export type ResignationStatus = '待审批' | '已通过' | '已拒绝' | '已取消';

/** 离职记录 */
export interface ResignationRecord {
  id: string;
  resignationCode: string;      // 离职编号
  workerId: string;             // 申请人ID
  workerName: string;           // 申请人
  resignationType: ResignationType;  // 离职类型
  reason: string;              // 离职原因
  expectedLastDay: string;      // 预计最后工作日
  handoverNote: string;        // 交接说明
  handoverUserId: string;       // 交接人ID
  handoverUserName: string;     // 交接人姓名
  status: ResignationStatus;   // 状态
  createTime: string;          // 申请时间
}

/** 筛选条件 */
export interface ResignationFilters {
  workerName: string;
  resignationType: ResignationType | '';
  status: ResignationStatus | '';
  startDate: string;
  endDate: string;
}

/** 表单数据 */
export interface ResignationFormData {
  workerId: string;
  workerName: string;
  resignationType: ResignationType;
  reason: string;
  expectedLastDay: string;
  handoverUserId: string;
  handoverUserName: string;
  handoverNote: string;
}

/** 批量操作模式 */
export type BatchMode = 'none' | 'approve' | 'reject' | 'export';

/** 分页状态 */
export interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
}

/** 离职类型选项 */
export const RESIGNATION_TYPE_OPTIONS: { value: ResignationType; label: string }[] = [
  { value: '主动离职', label: '主动离职' },
  { value: '被动离职', label: '被动离职' },
];

/** 主动离职原因选项 */
export const VOLUNTARY_REASONS: { value: VoluntaryReason; label: string }[] = [
  { value: '个人发展', label: '个人发展' },
  { value: '家庭原因', label: '家庭原因' },
  { value: '薪资待遇', label: '薪资待遇' },
  { value: '工作环境', label: '工作环境' },
  { value: '其他', label: '其他' },
];

/** 被动离职原因选项 */
export const INVOLUNTARY_REASONS: { value: InvoluntaryReason; label: string }[] = [
  { value: '合同到期', label: '合同到期' },
  { value: '试用期不合格', label: '试用期不合格' },
  { value: '绩效不达标', label: '绩效不达标' },
  { value: '违纪', label: '违纪' },
  { value: '其他', label: '其他' },
];

/** 状态筛选选项 */
export const RESIGNATION_STATUS_OPTIONS = [
  { value: '', label: '全部' },
  { value: '待审批', label: '待审批' },
  { value: '已通过', label: '已通过' },
  { value: '已拒绝', label: '已拒绝' },
  { value: '已取消', label: '已取消' },
];

/** 状态映射 - 将ApprovalStatus转换为ResignationStatus */
export function mapResignationStatus(status: ApprovalStatus): ResignationStatus {
  switch (status) {
    case ApprovalStatus.PENDING: return '待审批';
    case ApprovalStatus.APPROVED: return '已通过';
    case ApprovalStatus.REJECTED: return '已拒绝';
    case ApprovalStatus.CANCELLED: return '已取消';
    default: return '待审批';
  }
}

/** 状态配置映射 */
export const RESIGNATION_STATUS_CONFIG_MAP: Record<ResignationStatus, { label: string; status: string }> = {
  '待审批': { label: '待审批', status: 'pending' },
  '已通过': { label: '已通过', status: 'completed' },
  '已拒绝': { label: '已拒绝', status: 'rejected' },
  '已取消': { label: '已取消', status: 'cancelled' },
};
