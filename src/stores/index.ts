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

export { useOrderDataStore } from './useOrderDataStore';

export { useProductionPlanStore } from './useProductionPlanStore';

export { useTechSolutionStore } from './useTechSolutionStore';
export type { TechSolution } from '../services/techSolutionService';

export { usePurchasePlanStore } from './usePurchasePlanStore';
export type { PurchasePlanStatusUpdate } from './usePurchasePlanStore';

export { useSeedSourceStore } from './useSeedSourceStore';

export { useSeedlingStore } from './useSeedlingStore';

export { usePlantingStore } from './usePlantingStore';

export { useHarvestStore } from './useHarvestStore';

export { useWarehouseMaterialStore } from './useWarehouseMaterialStore';
export { useInboundStore } from './useInboundStore';
export { useSupplierStore } from './useSupplierStore';
export { useMaterialReturnStore } from './useMaterialReturnStore';

export { useSettingsStore } from './useSettingsStore';

export { useOrganizationStore } from './useOrganizationStore';

export { useApprovalStore } from './useApprovalStore';

export { useMaterialRequestDataStore } from './useMaterialRequestDataStore';

export { useNotificationStore, type Notification, type NotificationVariant } from './useNotificationStore';

// SettingsDataProvider 迁移到 Zustand
export { useDepartmentStore, getDepartmentByOid, getActiveDepartments } from './useDepartmentStore';
export type { Department } from '../services/apiBasicDataService';

export { usePositionStore, getPositionByOid, getPositionsByDepartment, getActivePositions } from './usePositionStore';
export type { Position } from '../services/apiBasicDataService';

export { useDictionaryStore, getDictItems, getDictItemName, getDictionaryCategories } from './useDictionaryStore';
export type { Dictionary } from '../services/apiBasicDataService';

export { useGreenhouseStore, getGreenhouseByOid, getGreenhousesByBase, getActiveGreenhouses } from './useGreenhouseStore';
export type { Greenhouse } from '../services/apiBasicDataService';

export { useWarehouseStore, getWarehouseByOid, getActiveWarehouses } from './useWarehouseStore';
export type { Warehouse } from '../services/apiBasicDataService';

export { useZoneStore, getZoneByOid, getZonesByBase, getActiveZones } from './useZoneStore';
export type { Zone } from '../services/apiBasicDataService';

export { useDeviceStore, getDeviceByOid, getDevicesByGreenhouseOid, getActiveDevices } from './useDeviceStore';
export type { Device } from '../services/apiBasicDataService';

export { useTeamStore, getTeamByOid, getTeamsByDepartment, getActiveTeams } from './useTeamStore';
export type { Team } from '../services/apiBasicDataService';

export { useBlockStore, getBlockByOid, getBlocksByZone, getActiveBlocks } from './useBlockStore';
export type { Block } from '../services/apiBasicDataService';

export { useUserStore, getUserByOid, getUsersByDepartment, getActiveUsers } from './useUserStore';
export type { User } from '../services/authorityService';

export { useWorkerStore } from './useWorkerStore';
export type { Worker } from '../services/apiWorkerService';

export { useTempTaskStore } from './useTempTaskStore';
export type { TempTaskData } from './useTempTaskStore';

export { useInspectionDataStore } from './useInspectionDataStore';
export type { InspectionData } from './useInspectionDataStore';

export { useProblemStore } from './useProblemStore';
export type { ProblemData } from './useProblemStore';

export { useSupplierCodeRuleStore } from './useSupplierCodeRuleStore';

// ==================== 人工管理模块 V2.0 Stores ====================
export { useContractStore } from './useContractStore';
export type { ContractData, ContractFormData, ContractFilters, ContractType, ContractStatus } from './useContractStore';

export { useContractRenewalStore } from './useContractRenewalStore';
export type { ContractRenewalData } from './useContractRenewalStore';

export { useSalaryAdjustmentStore } from './useSalaryAdjustmentStore';
export type { SalaryAdjustmentData } from './useSalaryAdjustmentStore';

export { useSalaryBudgetStore } from './useSalaryBudgetStore';
export type { SalaryBudgetData } from './useSalaryBudgetStore';

// ==================== 绩效考核 V2.0 Store ====================
export { usePerformanceStore } from './usePerformanceStore';

// ==================== 劳动风险预警 V2.0 Store ====================
export { useRiskStore } from './useRiskStore';
export type { RiskStats } from './useRiskStore';

// ==================== 考勤补录 V2.0 Store ====================
export { useAttendanceRepairStore } from './useAttendanceRepairStore';
export type { AttendanceRepairRecord, CreateAttendanceRepairParams, UpdateAttendanceRepairParams } from './useAttendanceRepairStore';

// ==================== 入职办理 V2.0 Store（pages版 + components版共用）====================
export { useOnboardingStore } from './useOnboardingStore';
export type { OnboardingData, OnboardingProgressStep } from './useOnboardingStore';

// ==================== 人效分析 V2.0 Store ====================
export { useEfficiencyStore } from './useEfficiencyStore';
export type { EfficiencyMetrics } from './useEfficiencyStore';

// ==================== 月度报表 V2.0 Store ====================
export { useMonthlyReportStore } from './useMonthlyReportStore';
export type { MonthlyReport } from './useMonthlyReportStore';

// ==================== 派工调度 V2.0 Store ====================
export { useDispatchStore } from './useDispatchStore';
export type { DispatchTask, MockWorker } from './useDispatchStore';

// ==================== 招聘管理(管理端) V2.0 Store ====================
export { useRecruitmentManageStore, generateRequestCode } from './useRecruitmentManageStore';
export type { RecruitmentRequest, RecruitmentStatus, RecruitmentSource, ApprovalHistoryItem } from './useRecruitmentManageStore';

// ==================== 离职办理 V2.0 Store ====================
export { useResignationStore } from './useResignationStore';
export type { ResignationData } from './useResignationStore';

// ==================== 招聘管理(pages版) V2.0 Store ====================
export { useRecruitmentStore } from './useRecruitmentStore';
export type { RecruitmentData } from './useRecruitmentStore';

// ==================== 工资管理 V2.0 Store ====================
export { useSalaryStore } from './useSalaryStore';
export type { SalaryRecord as SalaryRecordV2, SalaryCalcType, SalaryStatus } from './useSalaryStore';

// ==================== 临时工入职 V2.0 Store ====================
export { useTempWorkerStore } from './useTempWorkerStore';
export type { TempWorker, WorkerType, ContractType, StaffStatus, SkillTag } from './useTempWorkerStore';

// ==================== 计件工资 V2.0 Store ====================
export { usePieceworkStore } from './usePieceworkStore';
export type { PieceRate, PieceRateStatus } from './usePieceworkStore';

// ==================== 技能档案 V2.0 Store ====================
export { useSkillStore } from './useSkillStore';
export type { StaffSkill, TrainingRecord as TrainingRecordV2, SkillItem, SkillLevel as SkillLevelV2 } from './useSkillStore';

// ==================== 班组分配管理 V2.0 Store ====================
export { useTeamManageStore } from './useTeamManageStore';
export type { Team as TeamManage, UnassignedWorker } from './useTeamManageStore';

// ==================== 工作日志 V2.0 Store ====================
export { useWorkLogStore } from './useWorkLogStore';
export type { WorkLog, WorkLogFilters } from './useWorkLogStore';
