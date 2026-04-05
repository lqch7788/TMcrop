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
