/**
 * Stores 导出入口
 *
 * Phase 0 基础设施：统一状态管理
 *
 * 使用方式：
 * import { useScheduleStore } from '@/stores';
 */

export { useScheduleStore, getScheduleByDate, getScheduleByStaffAndDate, getWeekDateRange, getMonthDateRange } from './scheduleStore';
export type { ScheduleRecord, ShiftConfig, ShiftType, ScheduleStatus, SwapRequest, Staff } from './scheduleStore';

export { useAttendanceStore, getAttendanceByDate, getAttendanceByWorker, getAttendanceByDateRange } from './attendanceStore';
export type { AttendanceRecord, AttendanceFilters, AttendanceStatus, StatusClass } from './attendanceStore';

export { useFarmTaskStore, getTasksByStatus, getTasksByAssignee, getTasksByDateRange, getOverdueTasks } from './farmTaskStore';
export type { Task, TaskStatus, FarmTaskFilters } from './farmTaskStore';

export { useLeaveStore, getLeaveByWorker, getLeaveByStatus, getLeaveByDateRange } from './leaveStore';
export type { LeaveRecord, LeaveType, LeaveStatus, LeaveFilters } from './leaveStore';

export { useOvertimeStore, getOvertimeByWorker, getOvertimeByStatus, getOvertimeByDateRange, getTotalOvertimeHours } from './overtimeStore';
export type { OvertimeRecord, OvertimeType, OvertimeStatus, OvertimeFilters } from './overtimeStore';

export { usePersonnelStore, getPersonnelByDepartment, getPersonnelByStatus, getActivePersonnel } from './personnelStore';
export type { PersonnelRecord, PersonnelFilters, EmployeeStatus, Gender } from './personnelStore';

export { useCompensationStore, getSalaryByWorker, getSalaryByPeriod, getPendingSalary, getTotalPayroll } from './compensationStore';
export type { SalaryRecord, CompensationFilters, PayPeriod } from './compensationStore';

export { useIotStore, getDevicesByGreenhouse, getDevicesByType, getOnlineDevices } from './iotStore';
export type { Device, DeviceReading, DeviceType, DeviceStatus, EnvironmentDataPoint } from './iotStore';

export { useAlertStore, getPendingAlerts, getAlertsByLevel, getAlertsByGreenhouse, getCriticalAlerts } from './alertStore';
export type { Alert, AlertStats, AlertLevel, AlertStatus, AlertFilters } from './alertStore';

export { useToastStore } from './useToastStore';
export type { ToastItem } from './useToastStore';

// 假 Store 升级到 Zustand
export { useTaskStore } from './useTaskStore';
export type { TaskStatusUpdate, Task } from './useTaskStore';

export { useAnnouncementStore } from './useAnnouncementStore';
export type { AnnouncementStatusUpdate, Announcement } from './useAnnouncementStore';

export { useBudgetStore } from './useBudgetStore';
export type { BudgetStatusUpdate, Budget, BudgetItem } from './useBudgetStore';

export { useCropStorageStore } from './useCropStorageStore';
export type { CropStorageStatusUpdate, CropStorageRecord } from './useCropStorageStore';

export { useIndicatorStore } from './useIndicatorStore';
export type { IndicatorStatusUpdate, Indicator } from './useIndicatorStore';

export { useInspectionStore } from './useInspectionStore';
export type { InspectionStatusUpdate, Inspection } from './useInspectionStore';

export { useOrderStore } from './useOrderStore';
export type { OrderStatusUpdate, Order, OrderItem } from './useOrderStore';

export { usePurchasePlanStore } from './usePurchasePlanStore';
export type { PurchasePlanStatusUpdate } from './usePurchasePlanStore';
