/**
 * Stores 导出入口
 *
 * Phase 0 基础设施：统一状态管理
 *
 * 使用方式：
 * import { useScheduleStore } from '@/stores';
 */

export { useScheduleStore, getScheduleByDate, getScheduleByStaffAndDate, getWeekDateRange, getMonthDateRange } from './scheduleStore';
export { useCustomerStore } from './useCustomerStore';
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

// V2.1 公告数据 Store（完整 CRUD + 审批集成）
export { useAnnouncementDataStore } from './useAnnouncementDataStore';
export type { AnnouncementData } from './useAnnouncementDataStore';

// V2.1 公告模板 Store
export { useAnnouncementTemplateStore } from './useAnnouncementTemplateStore';
export type { AnnouncementTemplate } from './useAnnouncementTemplateStore';

export { useBudgetStore } from './useBudgetStore';
export type { BudgetStatusUpdate, Budget, BudgetItem } from './useBudgetStore';

export { useCropStorageStore } from './useCropStorageStore';
export type { CropStorageStatusUpdate, CropStorageRecord } from './useCropStorageStore';
export { useCropVarietyStore } from './useCropVarietyStore';

export { useIndicatorStore } from './useIndicatorStore';
export type { IndicatorStatusUpdate, Indicator } from './useIndicatorStore';

export { useIndicatorDataStore } from './useIndicatorDataStore';
export type { IndicatorDataState } from './useIndicatorDataStore';

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

export { useDailyPlanStore } from './useDailyPlanStore';
export { useMonthlyPlanStore } from './useMonthlyPlanStore';

export { useSeedSourceStore } from './useSeedSourceStore';

export { useSeedlingStore } from './useSeedlingStore';

export { usePlantingStore } from './usePlantingStore';
export { useFarmPartitionStore } from './useFarmPartitionStore';
export type { FarmPartition } from './useFarmPartitionStore';
export { useAreaSystemStore } from './useAreaSystemStore';
export type { AreaSystemMapping } from './useAreaSystemStore';
export { usePlantLabelStore } from './usePlantLabelStore';
export type { PlantLabel, PlantLabelResume, PlantMark, MoveFormData } from './usePlantLabelStore';

export { useHarvestStore } from './useHarvestStore';

export { useWarehouseMaterialStore } from './useWarehouseMaterialStore';
export { useInboundStore } from './useInboundStore';
export { useSupplierStore } from './useSupplierStore';
export { useMaterialReturnStore } from './useMaterialReturnStore';

export { useSettingsStore } from './useSettingsStore';

export { useOrganizationStore } from './useOrganizationStore';
export { useAuthStore } from './useAuthStore';
export type { CurrentUser, RoleSummary, AuthorityEntry, MyPermissionsResponse } from './useAuthStore';

export { useApprovalStore } from './useApprovalStore';

export { useMaterialRequestDataStore } from './useMaterialRequestDataStore';

// 物料编码规则分类树 Store
export { useMaterialCodeRuleStore } from './useMaterialCodeRuleStore';
export type { BigCategory, MidCategory, SubCategory } from './useMaterialCodeRuleStore';

export { useExecuteDataStore } from './useExecuteDataStore';
export { useStatisticsStore, getMonthSummaries, getMonthDetails, getYearTotalQuantity, getYearTotalAmount, getSingleMonthTableData, getMonthCategoryData, getMonthSummary } from './useStatisticsStore';
export type { MaterialStatItem, MonthlyStatItem, CategorySummaryItem, CategoryTrendItem, MonthSummaryRow, MonthDetailRow } from './useStatisticsStore';

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

export { useBaseOperationsStore } from './useBaseOperationsStore';
export type { BaseStats, SelectedNodeInfo } from './useBaseOperationsStore';

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

export { useEquipmentStore } from './useEquipmentStore';
export type { Equipment } from './useEquipmentStore';

export { useInfrastructureStore } from './useInfrastructureStore';
export type { Infrastructure } from './useInfrastructureStore';

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

// ==================== 班次管理 Store ====================
export { useShiftStore } from './useShiftStore';
export type { Shift } from '../services/apiBasicDataService';

// ==================== 成本核算 Store ====================
export { useCostStore } from './useCostStore';
export type { CostCategoryItem, CostBudgetItem } from '../services/apiBasicDataService';

// ==================== 系统配置 Store ====================
export { useSystemConfigStore } from './useSystemConfigStore';
export type { SystemConfig } from './useSystemConfigStore';

// ==================== 作物生长配置 Store (V3.0 Phase 6) ====================
export { useCropGrowthConfigStore } from './useCropGrowthConfigStore';
export type {
  GrowthStage,
  GrowthStageDays,
  CropTaskItem,
  CropStageEntry,
  CropGrowthConfig,
  PestAlertRule,
} from './useCropGrowthConfigStore';

// ==================== 审批流程 Store ====================
export { useApprovalWorkflowStore } from './useApprovalWorkflowStore';

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

// ==================== Dashboard 总览 Store ====================
export { useDashboardStore } from './useDashboardStore';
export type { BatchStatItem, DashboardStats, AlertsBreakdown } from './useDashboardStore';

// ==================== 生产汇总数据 Store ====================
export { useSummaryDataStore } from './useSummaryDataStore';
export type {
  SummaryOverview, YieldStatItem, CostDetailItem, CostSummary,
  LaborStatItem, ProblemDailyItem, ProductionIndicator, IndicatorsRaw,
} from './useSummaryDataStore';

// V10.0 新增
export { useFertilizerStore } from './useFertilizerStore';
export type { FertilizerData } from './useFertilizerStore';

export { useRegionStore } from './useRegionStore';
export type { RegionNode } from './useRegionStore';

// V11.0: 工序定义管理
export { useProcessDefinitionStore } from './useProcessDefinitionStore';
export { useApprovalLevelStore } from './useApprovalLevelStore';
export { useNotificationSettingsStore } from './useNotificationSettingsStore';

// V11.0: 物料类型管理
export { useMaterialTypeStore } from './useMaterialTypeStore';

// 基地空间架构 V1.0
export { useBaseStore, getBaseByOid, getBasesByCompany, getActiveBases } from './useBaseStore';
export type { Base } from '../services/apiBasicDataService';

export { usePlantingRecordStore, getRecordByOid, getRecordsByFacility, getRecordsByStatus, getActivePlantingRecords } from './usePlantingRecordStore';
export type { PlantingRecord } from '../services/apiPlantingRecordService';

// iAGS 设备系统管理 V1.0
export { useDeviceSystemStore } from './useDeviceSystemStore';
export type { DeviceSystem } from './useDeviceSystemStore';

// iAGS 视频管理 V1.0
export { useCameraStore } from './useCameraStore';
export type { Camera } from './useCameraStore';

// iAGS 能耗管理 V1.0
export { useEnergyConfigStore } from './useEnergyConfigStore';
export type { EnergyConfig } from './useEnergyConfigStore';
export { ENERGY_TYPES } from './useEnergyConfigStore';

// iAGS 警报管理 V1.0
export { useAlarmConfigStore } from './useAlarmConfigStore';
export type { AlarmLevel, AlarmContact } from './useAlarmConfigStore';
export { LEVEL_DEFAULTS, LEVEL_LABELS, LEVEL_COLORS } from './useAlarmConfigStore';

// iAGS 水肥一体机 V1.0
export { useWaterFertilizerStore } from './useWaterFertilizerStore';
export type { WaterFertilizerConfig } from './useWaterFertilizerStore';
export { INTERVAL_UNITS } from './useWaterFertilizerStore';

// iAGS 种植设置 V1.0
export { usePlantSettingStore } from './usePlantSettingStore';
export type { PlantSetting } from './usePlantSettingStore';

// iAGS 设备分配 V1.0
export { useDeviceDistributionStore } from './useDeviceDistributionStore';
export type { DeviceDistribution } from '../services/apiDeviceDistributionService';

// V12.0: 病虫害防治管理 Stores
export { usePestControlStore } from './usePestControlStore';
export type { PestControlData } from './usePestControlStore';

export { usePesticideLibraryStore } from './usePesticideLibraryStore';
export type { PesticideLibrary, PesticideSpec } from './usePesticideLibraryStore';

export { usePestDiseaseDictStore } from './usePestDiseaseDictStore';
export type { PestDiseaseDict } from './usePestDiseaseDictStore';

// V12.0: 肥料库管理 Store
export { useFertilizerLibraryStore } from './useFertilizerLibraryStore';
export type { FertilizerLibrary, FertilizerSpec } from './useFertilizerLibraryStore';
