// 排班调度中心类型定义

// 班次类型
export type ShiftType = '早班' | '中班' | '晚班' | '全天' | '弹性';

// 排班状态
export type ScheduleStatus = '已排班' | '已执行' | '已取消';

// 排班记录
export interface ScheduleRecord {
  id: string;
  staffId: string;
  staffName: string;
  date: string;          // YYYY-MM-DD 格式
  shift: ShiftType;
  workZone: string;       // 工作区域
  status: ScheduleStatus;
  checkIn?: string;       // 签到时间 HH:mm
  checkOut?: string;      // 签退时间 HH:mm
}

// 班次配置
export interface ShiftConfig {
  name: ShiftType;
  startTime: string;      // HH:mm
  endTime: string;        // HH:mm
  color: string;         // 展示颜色
}

// 视图类型
export type ViewMode = 'month' | 'week' | 'day';

// 调班申请
export interface SwapRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  targetId: string;
  targetName: string;
  originalDate: string;
  targetDate: string;
  reason: string;
  status: '待审批' | '已同意' | '已拒绝';
  createTime: string;
}

// 员工类型
export interface Staff {
  id: string;
  name: string;
  workZone: string;
}

// 组件层接收的排班记录（兼容 snake_case 字段的宽松类型，避免 any）
export interface ScheduleRecordLike {
  id: string;
  staffId?: string | null;
  staffName?: string | null;
  staff_id?: string | null;
  staff_name?: string | null;
  workZone?: string | null;
  work_zone?: string | null;
  checkIn?: string | null;
  checkOut?: string | null;
  check_in?: string | null;
  check_out?: string | null;
  date: string;
  shift: ShiftType;
  status: ScheduleStatus;
  remarks?: string | null;
}

/**
 * 规范化排班记录（兼容 snake_case 与 camelCase，类型安全版，替代原 any 版本）
 */
export function normalizeRecord(record: ScheduleRecordLike): ScheduleRecord {
  return {
    ...record,
    staffId: record.staffId || record.staff_id || '',
    staffName: record.staffName || record.staff_name || '',
    workZone: record.workZone || record.work_zone || '',
    checkIn: record.checkIn ?? record.check_in ?? undefined,
    checkOut: record.checkOut ?? record.check_out ?? undefined,
  };
}
