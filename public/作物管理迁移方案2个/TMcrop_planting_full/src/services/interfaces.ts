/**
 * Service 统一接口定义
 * 所有前端 Service（API / LocalStorage）必须实现这些接口
 */

import {
  SeedSource, Seedling, DailyRecord, Planting,
  CropInstance, CropInstanceStatus, CropTraceChain,
  CropOrder, CropOrderStatus,
} from '@/types/crop';
import { HarvestRecord } from '@/types';
import {
  CropVariety, CreateCropVarietyInput, UpdateCropVarietyInput,
  CropVarietyOption, CropVarietySearchResult,
} from '@/types/cropVariety';
import { ProduceCodeInfo } from '@/data/produceCodeRule';

// ===== 种源 =====
export interface ISeedSourceService {
  initSeedSources(): Promise<SeedSource[]>;
  getSeedSources(): Promise<SeedSource[]>;
  getSeedSourceById(id: string): Promise<SeedSource | undefined>;
  getSeedSourcesByIds(ids: string[]): Promise<SeedSource[]>;
  addSeedSource(source: Omit<SeedSource, 'id' | 'createTime' | 'updateTime'>): Promise<SeedSource>;
  updateSeedSource(id: string, updates: Partial<SeedSource>): Promise<SeedSource | null>;
  deleteSeedSource(id: string): Promise<boolean>;
  deleteSeedSources(ids: string[]): Promise<boolean>;
  decreaseAvailableCount(id: string, count: number): Promise<boolean>;
  resetSeedSources(): Promise<void>;
  getTodayMaxSeedCodeSerial(dateStr: string): Promise<number>;
  generateSeedCode(dateStr: string): Promise<string>;
}

// ===== 育苗 =====
export interface ISeedlingService {
  initSeedlings(): Promise<Seedling[]>;
  getSeedlings(): Promise<Seedling[]>;
  getSeedlingById(id: string): Promise<Seedling | undefined>;
  getSeedlingsByIds(ids: string[]): Promise<Seedling[]>;
  getSeedlingsBySourceId(sourceId: string): Promise<Seedling[]>;
  addSeedling(seedling: Omit<Seedling, 'id' | 'createTime' | 'updateTime'>): Promise<Seedling>;
  updateSeedling(id: string, updates: Partial<Seedling>): Promise<Seedling | null>;
  deleteSeedling(id: string): Promise<boolean>;
  deleteSeedlings(ids: string[]): Promise<boolean>;
  addDailyRecord(seedlingId: string, record: Omit<DailyRecord, 'id' | 'seedlingId'>): Promise<DailyRecord | null>;
  deleteDailyRecord(seedlingId: string, recordId: string): Promise<boolean>;
  updateDailyRecord(seedlingId: string, recordId: string, updates: Partial<DailyRecord>): Promise<boolean>;
  increasePlantedCount(id: string, count: number): Promise<boolean>;
  getTransplantReadySeedlings(): Promise<Seedling[]>;
  getAvailableTransplantCount(id: string): Promise<number>;
  resetSeedlings(): Promise<void>;
}

// ===== 种植 =====
export interface IPlantingService {
  initPlantings(): Promise<Planting[]>;
  getPlantings(): Promise<Planting[]>;
  getPlantingById(id: string): Promise<Planting | undefined>;
  getPlantingsByIds(ids: string[]): Promise<Planting[]>;
  getPlantingsBySourceId(sourceId: string): Promise<Planting[]>;
  addPlanting(planting: Omit<Planting, 'id' | 'createTime' | 'updateTime'>): Promise<Planting>;
  updatePlanting(id: string, updates: Partial<Planting>): Promise<Planting | null>;
  deletePlanting(id: string): Promise<boolean>;
  deletePlantings(ids: string[]): Promise<boolean>;
  harvestPlanting(id: string, harvestDate: string, harvestCount?: number): Promise<boolean>;
  getUnharvestedPlantings(): Promise<Planting[]>;
  getHarvestedPlantings(): Promise<Planting[]>;
  generatePlantCode(sourceCode: string): Promise<string>;
  resetPlantings(): Promise<void>;
}

// ===== 采收 =====
export interface IHarvestService {
  initHarvestRecords(): Promise<HarvestRecord[]>;
  getHarvestRecords(): Promise<HarvestRecord[]>;
  getHarvestRecordById(id: string): Promise<HarvestRecord | undefined>;
  getHarvestRecordsByIds(ids: string[]): Promise<HarvestRecord[]>;
  getHarvestRecordsByBatchCode(batchCode: string): Promise<HarvestRecord[]>;
  addHarvestRecord(record: Omit<HarvestRecord, 'id'>): Promise<HarvestRecord>;
  addHarvestRecords(newRecords: Omit<HarvestRecord, 'id'>[]): Promise<HarvestRecord[]>;
  updateHarvestRecord(id: string, updates: Partial<HarvestRecord>): Promise<HarvestRecord | null>;
  deleteHarvestRecord(id: string): Promise<boolean>;
  deleteHarvestRecords(ids: string[]): Promise<boolean>;
  generateHarvestCode(): Promise<string>;
  resetHarvestRecords(): Promise<void>;
}

// ===== 作物实例 =====
export interface ICropInstanceService {
  initInstances(): Promise<CropInstance[]>;
  getInstances(): Promise<CropInstance[]>;
  getInstanceById(id: string): Promise<CropInstance | undefined>;
  getInstancesByIds(ids: string[]): Promise<CropInstance[]>;
  getInstancesByOrderId(orderId: string): Promise<CropInstance[]>;
  createInstance(
    cropInfo: { cropCategory: string; cropName: string; cropVariety: string },
    sourceOrigin: string,
    initialQuantity: number,
    options?: { orderId?: string; orderCode?: string; sourceDescription?: string; sourceInstanceId?: string }
  ): Promise<CropInstance>;
  updateInstance(id: string, updates: Partial<CropInstance>): Promise<CropInstance | null>;
  deleteInstance(id: string): Promise<boolean>;
  deleteInstances(ids: string[]): Promise<boolean>;
  updateQuantity(id: string, type: 'seedling' | 'plant' | 'harvest', quantity: number): Promise<boolean>;
  updateStatus(id: string, status: CropInstanceStatus): Promise<boolean>;
  getTraceChain(id: string): Promise<CropTraceChain | null>;
  resetInstances(): Promise<void>;
}

// ===== 作物订单 =====
export interface ICropOrderService {
  initOrders(): Promise<CropOrder[]>;
  getOrders(): Promise<CropOrder[]>;
  getOrderById(id: string): Promise<CropOrder | undefined>;
  getOrdersByIds(ids: string[]): Promise<CropOrder[]>;
  createOrder(orderData: Omit<CropOrder, 'id' | 'orderCode' | 'createTime' | 'updateTime'>): Promise<CropOrder>;
  updateOrder(id: string, updates: Partial<CropOrder>): Promise<CropOrder | null>;
  deleteOrder(id: string): Promise<boolean>;
  deleteOrders(ids: string[]): Promise<boolean>;
  linkInstances(orderId: string, instanceIds: string[]): Promise<boolean>;
  unlinkInstances(orderId: string, instanceIds: string[]): Promise<boolean>;
  updateOrderStatus(id: string, status: CropOrderStatus): Promise<boolean>;
  getOrderDetail(id: string): Promise<(CropOrder & { instances: string[] }) | null>;
  resetOrders(): Promise<void>;
}

// ===== 品种库 =====
export interface ICropVarietyService {
  initVarieties(): Promise<CropVariety[]>;
  getAllVarieties(): Promise<CropVariety[]>;
  getVarietiesByCategory(categoryCode: string): Promise<CropVariety[]>;
  getVarietyById(id: string): Promise<CropVariety | undefined>;
  getVarietyByCode(cropCode: string): Promise<CropVariety | undefined>;
  getVarietyByName(varietyName: string): Promise<CropVariety | undefined>;
  searchVarieties(keyword: string): Promise<CropVarietySearchResult[]>;
  getVarietyOptions(): Promise<CropVarietyOption[]>;
  getCategoryOptions(): Promise<Array<{ value: string; label: string }>>;
  getTypeOptionsByCategory(categoryCode: string): Promise<Array<{ value: string; label: string }>>;
  getVarietyOptionsByType(categoryCode: string, typeCode: string): Promise<Array<{ value: string; label: string }>>;
  getSubVariety1Options(categoryCode: string, typeCode: string, varietyCode: string): Promise<Array<{ value: string; label: string }>>;
  getSubVariety2Options(categoryCode: string, typeCode: string, varietyCode: string, subVariety1Code: string): Promise<Array<{ value: string; label: string }>>;
  generateCropCode(categoryCode: string, typeCode: string, varietyCode: string, subVariety1Code?: string, detailVarietyCode?: string): Promise<string>;
  getMaxDetailVarietyCode(categoryCode: string, typeCode: string, varietyCode: string, subVariety1Code?: string): Promise<string>;
  addVariety(input: CreateCropVarietyInput): Promise<CropVariety>;
  updateVariety(id: string, updates: UpdateCropVarietyInput): Promise<CropVariety | null>;
  deleteVariety(id: string): Promise<boolean>;
  deactivateVariety(id: string): Promise<CropVariety | null>;
  activateVariety(id: string): Promise<CropVariety | null>;
  getVarietyStats(): Promise<{ total: number; active: number; inactive: number; byCategory: Record<string, number> }>;
  resetVarieties(): Promise<void>;
  findVarietyByCropName(cropName: string): Promise<CropVariety | undefined>;
  getCropCodeInfo(cropName: string): Promise<ProduceCodeInfo | null>;
  checkDuplicateVariety(
    categoryCode: string, typeCode: string, varietyCode: string,
    subVariety1Code: string | undefined, subVariety2Code: string | undefined,
    varietyName: string, excludeId?: string
  ): Promise<{ isDuplicate: boolean; existingVariety?: CropVariety }>;
  getMaxSubVarietyCode(categoryCode: string, typeCode: string, varietyCode: string, subVariety1Code?: string): Promise<string>;
  getMaxSubVariety2Code(categoryCode: string, typeCode: string, varietyCode: string, subVariety1Code: string): Promise<string>;
}


// ===== 新增模块接口定义 =====
// ===== 公司分组 =====
export interface IBaseSettingsService {
  initCompanyGroups(): Promise<CompanyGroup[]>;
  getCompanyGroups(): Promise<CompanyGroup[]>;
  getCompanyGroupById(id: string): Promise<CompanyGroup | undefined>;
  addCompanyGroup(group: Omit<CompanyGroup, 'id' | 'createTime' | 'updateTime'>): Promise<CompanyGroup>;
  updateCompanyGroup(id: string, updates: Partial<CompanyGroup>): Promise<CompanyGroup | null>;
  deleteCompanyGroup(id: string): Promise<boolean>;

  getBases(): Promise<BaseData[]>;
  getBaseById(id: string): Promise<BaseData | undefined>;
  addBase(base: Omit<BaseData, 'id' | 'createTime' | 'updateTime'>): Promise<BaseData>;
  updateBase(id: string, updates: Partial<BaseData>): Promise<BaseData | null>;
  deleteBase(id: string): Promise<boolean>;
  getBasesByCompanyId(companyId: string): Promise<BaseData[]>;
  resetBaseSettings(): Promise<void>;
}

// ===== 管理指标 =====
export interface IIndicatorService {
  initIndicators(): Promise<Indicator[]>;
  getIndicators(): Promise<Indicator[]>;
  getIndicatorById(id: string): Promise<Indicator | undefined>;
  addIndicator(indicator: Omit<Indicator, 'id' | 'createTime' | 'updateTime'>): Promise<Indicator>;
  updateIndicator(id: string, updates: Partial<Indicator>): Promise<Indicator | null>;
  deleteIndicator(id: string): Promise<boolean>;
  deleteIndicators(ids: string[]): Promise<boolean>;
  getIndicatorsByCategory(category: string): Promise<Indicator[]>;
  resetIndicators(): Promise<void>;
}

// ===== 农事活动 =====
export interface IFarmActivityService {
  initFarmActivities(): Promise<FarmActivity[]>;
  getFarmActivities(): Promise<FarmActivity[]>;
  getFarmActivityById(id: string): Promise<FarmActivity | undefined>;
  addFarmActivity(activity: Omit<FarmActivity, 'id' | 'createTime' | 'updateTime'>): Promise<FarmActivity>;
  updateFarmActivity(id: string, updates: Partial<FarmActivity>): Promise<FarmActivity | null>;
  deleteFarmActivity(id: string): Promise<boolean>;
  deleteFarmActivities(ids: string[]): Promise<boolean>;
  getFarmActivitiesByStatus(status: string): Promise<FarmActivity[]>;
  getFarmActivitiesByAssignee(assigneeId: string): Promise<FarmActivity[]>;
  resetFarmActivities(): Promise<void>;
}

// ===== 库存产品 =====
export interface IInventoryService {
  initInventories(): Promise<ProduceInventory[]>;
  getInventories(): Promise<ProduceInventory[]>;
  getInventoryById(id: string): Promise<ProduceInventory | undefined>;
  addInventory(item: Omit<ProduceInventory, 'id' | 'createTime' | 'updateTime'>): Promise<ProduceInventory>;
  updateInventory(id: string, updates: Partial<ProduceInventory>): Promise<ProduceInventory | null>;
  deleteInventory(id: string): Promise<boolean>;
  deleteInventories(ids: string[]): Promise<boolean>;
  getInventoriesByWarehouse(warehouseId: string): Promise<ProduceInventory[]>;
  getInventoriesByCrop(cropName: string): Promise<ProduceInventory[]>;
  resetInventories(): Promise<void>;
}

// ===== 仓库 =====
export interface IWarehouseService {
  initWarehouses(): Promise<Warehouse[]>;
  getWarehouses(): Promise<Warehouse[]>;
  getWarehouseById(id: string): Promise<Warehouse | undefined>;
  addWarehouse(warehouse: Omit<Warehouse, 'id' | 'createTime' | 'updateTime'>): Promise<Warehouse>;
  updateWarehouse(id: string, updates: Partial<Warehouse>): Promise<Warehouse | null>;
  deleteWarehouse(id: string): Promise<boolean>;
  deleteWarehouses(ids: string[]): Promise<boolean>;
  getWarehousesByType(type: string): Promise<Warehouse[]>;
  resetWarehouses(): Promise<void>;
}

// ===== 物料 =====
export interface IMaterialService {
  // 物料基础
  initMaterials(): Promise<Material[]>;
  getMaterials(): Promise<Material[]>;
  getMaterialById(id: string): Promise<Material | undefined>;
  addMaterial(material: Omit<Material, 'id' | 'createTime' | 'updateTime'>): Promise<Material>;
  updateMaterial(id: string, updates: Partial<Material>): Promise<Material | null>;
  deleteMaterial(id: string): Promise<boolean>;
  deleteMaterials(ids: string[]): Promise<boolean>;
  getMaterialsByCategory(category: string): Promise<Material[]>;
  resetMaterials(): Promise<void>;

  // 领料记录
  getMaterialReceivingRecords(): Promise<MaterialReceivingRecord[]>;
  getMaterialReceivingRecordById(id: string): Promise<MaterialReceivingRecord | undefined>;
  addMaterialReceivingRecord(record: Omit<MaterialReceivingRecord, 'id' | 'createTime' | 'updateTime'>): Promise<MaterialReceivingRecord>;
  updateMaterialReceivingRecord(id: string, updates: Partial<MaterialReceivingRecord>): Promise<MaterialReceivingRecord | null>;
  deleteMaterialReceivingRecord(id: string): Promise<boolean>;

  // 物料使用
  getMaterialUsages(): Promise<MaterialUsage[]>;
  addMaterialUsage(usage: Omit<MaterialUsage, 'id' | 'createTime' | 'updateTime'>): Promise<MaterialUsage>;

  // 退料记录
  getMaterialReturns(): Promise<MaterialReturn[]>;
  addMaterialReturn(ret: Omit<MaterialReturn, 'id' | 'createTime' | 'updateTime'>): Promise<MaterialReturn>;
}

// ===== 审批单 =====
export interface IApprovalService {
  initApprovals(): Promise<Approval[]>;
  getApprovals(): Promise<Approval[]>;
  getApprovalById(id: string): Promise<Approval | undefined>;
  addApproval(approval: Omit<Approval, 'id' | 'createdAt' | 'updatedAt'>): Promise<Approval>;
  updateApproval(id: string, updates: Partial<Approval>): Promise<Approval | null>;
  deleteApproval(id: string): Promise<boolean>;
  deleteApprovals(ids: string[]): Promise<boolean>;
  getApprovalsByType(type: string): Promise<Approval[]>;
  getApprovalsByStatus(status: string): Promise<Approval[]>;
  approve(id: string, comment?: string): Promise<Approval | null>;
  reject(id: string, comment: string): Promise<Approval | null>;
  cancel(id: string, reason?: string): Promise<Approval | null>;
  resetApprovals(): Promise<void>;
}

// ===== 考勤记录 =====
export interface IAttendanceService {
  // 考勤记录
  initAttendanceRecords(): Promise<AttendanceRecord[]>;
  getAttendanceRecords(): Promise<AttendanceRecord[]>;
  getAttendanceRecordById(id: string): Promise<AttendanceRecord | undefined>;
  addAttendanceRecord(item: Omit<AttendanceRecord, 'id' | 'createTime' | 'updateTime'>): Promise<AttendanceRecord>;
  updateAttendanceRecord(id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord | null>;
  deleteAttendanceRecord(id: string): Promise<boolean>;
  deleteAttendanceRecords(ids: string[]): Promise<boolean>;
  resetAttendanceRecords(): Promise<void>;
}

// ===== 考勤补卡 =====
export interface IAttendanceRepairService {
  // 考勤补卡
  initAttendanceRepairs(): Promise<AttendanceRepair[]>;
  getAttendanceRepairs(): Promise<AttendanceRepair[]>;
  getAttendanceRepairById(id: string): Promise<AttendanceRepair | undefined>;
  addAttendanceRepair(item: Omit<AttendanceRepair, 'id' | 'createTime' | 'updateTime'>): Promise<AttendanceRepair>;
  updateAttendanceRepair(id: string, updates: Partial<AttendanceRepair>): Promise<AttendanceRepair | null>;
  deleteAttendanceRepair(id: string): Promise<boolean>;
  deleteAttendanceRepairs(ids: string[]): Promise<boolean>;
  resetAttendanceRepairs(): Promise<void>;
}

// ===== 请假记录 =====
export interface ILeaveService {
  // 请假记录
  initLeaveRecords(): Promise<LeaveRecord[]>;
  getLeaveRecords(): Promise<LeaveRecord[]>;
  getLeaveRecordById(id: string): Promise<LeaveRecord | undefined>;
  addLeaveRecord(item: Omit<LeaveRecord, 'id' | 'createTime' | 'updateTime'>): Promise<LeaveRecord>;
  updateLeaveRecord(id: string, updates: Partial<LeaveRecord>): Promise<LeaveRecord | null>;
  deleteLeaveRecord(id: string): Promise<boolean>;
  deleteLeaveRecords(ids: string[]): Promise<boolean>;
  resetLeaveRecords(): Promise<void>;
}

// ===== 加班记录 =====
export interface IOvertimeService {
  // 加班记录
  initOvertimeRecords(): Promise<OvertimeRecord[]>;
  getOvertimeRecords(): Promise<OvertimeRecord[]>;
  getOvertimeRecordById(id: string): Promise<OvertimeRecord | undefined>;
  addOvertimeRecord(item: Omit<OvertimeRecord, 'id' | 'createTime' | 'updateTime'>): Promise<OvertimeRecord>;
  updateOvertimeRecord(id: string, updates: Partial<OvertimeRecord>): Promise<OvertimeRecord | null>;
  deleteOvertimeRecord(id: string): Promise<boolean>;
  deleteOvertimeRecords(ids: string[]): Promise<boolean>;
  resetOvertimeRecords(): Promise<void>;
}

// ===== 招聘记录 =====
export interface IRecruitmentService {
  // 招聘记录
  initRecruitmentRecords(): Promise<RecruitmentRecord[]>;
  getRecruitmentRecords(): Promise<RecruitmentRecord[]>;
  getRecruitmentRecordById(id: string): Promise<RecruitmentRecord | undefined>;
  addRecruitmentRecord(item: Omit<RecruitmentRecord, 'id' | 'createTime' | 'updateTime'>): Promise<RecruitmentRecord>;
  updateRecruitmentRecord(id: string, updates: Partial<RecruitmentRecord>): Promise<RecruitmentRecord | null>;
  deleteRecruitmentRecord(id: string): Promise<boolean>;
  deleteRecruitmentRecords(ids: string[]): Promise<boolean>;
  resetRecruitmentRecords(): Promise<void>;
}

// ===== 合同记录 =====
export interface IContractService {
  // 合同记录
  initContractRecords(): Promise<ContractRecord[]>;
  getContractRecords(): Promise<ContractRecord[]>;
  getContractRecordById(id: string): Promise<ContractRecord | undefined>;
  addContractRecord(item: Omit<ContractRecord, 'id' | 'createTime' | 'updateTime'>): Promise<ContractRecord>;
  updateContractRecord(id: string, updates: Partial<ContractRecord>): Promise<ContractRecord | null>;
  deleteContractRecord(id: string): Promise<boolean>;
  deleteContractRecords(ids: string[]): Promise<boolean>;
  resetContractRecords(): Promise<void>;
}

// ===== 入职记录 =====
export interface IOnboardingService {
  // 入职记录
  initOnboardingRecords(): Promise<OnboardingRecord[]>;
  getOnboardingRecords(): Promise<OnboardingRecord[]>;
  getOnboardingRecordById(id: string): Promise<OnboardingRecord | undefined>;
  addOnboardingRecord(item: Omit<OnboardingRecord, 'id' | 'createTime' | 'updateTime'>): Promise<OnboardingRecord>;
  updateOnboardingRecord(id: string, updates: Partial<OnboardingRecord>): Promise<OnboardingRecord | null>;
  deleteOnboardingRecord(id: string): Promise<boolean>;
  deleteOnboardingRecords(ids: string[]): Promise<boolean>;
  resetOnboardingRecords(): Promise<void>;
}

// ===== 离职记录 =====
export interface IResignationService {
  // 离职记录
  initResignationRecords(): Promise<ResignationRecord[]>;
  getResignationRecords(): Promise<ResignationRecord[]>;
  getResignationRecordById(id: string): Promise<ResignationRecord | undefined>;
  addResignationRecord(item: Omit<ResignationRecord, 'id' | 'createTime' | 'updateTime'>): Promise<ResignationRecord>;
  updateResignationRecord(id: string, updates: Partial<ResignationRecord>): Promise<ResignationRecord | null>;
  deleteResignationRecord(id: string): Promise<boolean>;
  deleteResignationRecords(ids: string[]): Promise<boolean>;
  resetResignationRecords(): Promise<void>;
}

// ===== 薪资调整 =====
export interface ISalaryAdjustmentService {
  // 薪资调整
  initSalaryAdjustments(): Promise<SalaryAdjustment[]>;
  getSalaryAdjustments(): Promise<SalaryAdjustment[]>;
  getSalaryAdjustmentById(id: string): Promise<SalaryAdjustment | undefined>;
  addSalaryAdjustment(item: Omit<SalaryAdjustment, 'id' | 'createTime' | 'updateTime'>): Promise<SalaryAdjustment>;
  updateSalaryAdjustment(id: string, updates: Partial<SalaryAdjustment>): Promise<SalaryAdjustment | null>;
  deleteSalaryAdjustment(id: string): Promise<boolean>;
  deleteSalaryAdjustments(ids: string[]): Promise<boolean>;
  resetSalaryAdjustments(): Promise<void>;
}

// ===== 薪资预算 =====
export interface ISalaryBudgetService {
  // 薪资预算
  initSalaryBudgets(): Promise<SalaryBudget[]>;
  getSalaryBudgets(): Promise<SalaryBudget[]>;
  getSalaryBudgetById(id: string): Promise<SalaryBudget | undefined>;
  addSalaryBudget(item: Omit<SalaryBudget, 'id' | 'createTime' | 'updateTime'>): Promise<SalaryBudget>;
  updateSalaryBudget(id: string, updates: Partial<SalaryBudget>): Promise<SalaryBudget | null>;
  deleteSalaryBudget(id: string): Promise<boolean>;
  deleteSalaryBudgets(ids: string[]): Promise<boolean>;
  resetSalaryBudgets(): Promise<void>;
}

// ===== 任务中心 =====
export interface ITaskCenterService {
  // 任务中心
  initTaskCenterRecords(): Promise<TaskCenterRecord[]>;
  getTaskCenterRecords(): Promise<TaskCenterRecord[]>;
  getTaskCenterRecordById(id: string): Promise<TaskCenterRecord | undefined>;
  addTaskCenterRecord(item: Omit<TaskCenterRecord, 'id' | 'createTime' | 'updateTime'>): Promise<TaskCenterRecord>;
  updateTaskCenterRecord(id: string, updates: Partial<TaskCenterRecord>): Promise<TaskCenterRecord | null>;
  deleteTaskCenterRecord(id: string): Promise<boolean>;
  deleteTaskCenterRecords(ids: string[]): Promise<boolean>;
  resetTaskCenterRecords(): Promise<void>;
}

// ===== 人员档案 =====
export interface IPersonnelService {
  // 人员档案
  initPersonnelRecords(): Promise<PersonnelRecord[]>;
  getPersonnelRecords(): Promise<PersonnelRecord[]>;
  getPersonnelRecordById(id: string): Promise<PersonnelRecord | undefined>;
  addPersonnelRecord(item: Omit<PersonnelRecord, 'id' | 'createTime' | 'updateTime'>): Promise<PersonnelRecord>;
  updatePersonnelRecord(id: string, updates: Partial<PersonnelRecord>): Promise<PersonnelRecord | null>;
  deletePersonnelRecord(id: string): Promise<boolean>;
  deletePersonnelRecords(ids: string[]): Promise<boolean>;
  resetPersonnelRecords(): Promise<void>;
}

// ===== 生产计划 =====
export interface IProductionPlanService {
  // 生产计划
  initProductionPlans(): Promise<ProductionPlan[]>;
  getProductionPlans(): Promise<ProductionPlan[]>;
  getProductionPlanById(id: string): Promise<ProductionPlan | undefined>;
  addProductionPlan(item: Omit<ProductionPlan, 'id' | 'createTime' | 'updateTime'>): Promise<ProductionPlan>;
  updateProductionPlan(id: string, updates: Partial<ProductionPlan>): Promise<ProductionPlan | null>;
  deleteProductionPlan(id: string): Promise<boolean>;
  deleteProductionPlans(ids: string[]): Promise<boolean>;
  resetProductionPlans(): Promise<void>;
  // 日计划
  initDailyPlans(): Promise<DailyPlan[]>;
  getDailyPlans(): Promise<DailyPlan[]>;
  getDailyPlanById(id: string): Promise<DailyPlan | undefined>;
  addDailyPlan(item: Omit<DailyPlan, 'id' | 'createTime' | 'updateTime'>): Promise<DailyPlan>;
  updateDailyPlan(id: string, updates: Partial<DailyPlan>): Promise<DailyPlan | null>;
  deleteDailyPlan(id: string): Promise<boolean>;
  deleteDailyPlans(ids: string[]): Promise<boolean>;
  resetDailyPlans(): Promise<void>;
  // 月计划
  initMonthlyPlans(): Promise<MonthlyPlan[]>;
  getMonthlyPlans(): Promise<MonthlyPlan[]>;
  getMonthlyPlanById(id: string): Promise<MonthlyPlan | undefined>;
  addMonthlyPlan(item: Omit<MonthlyPlan, 'id' | 'createTime' | 'updateTime'>): Promise<MonthlyPlan>;
  updateMonthlyPlan(id: string, updates: Partial<MonthlyPlan>): Promise<MonthlyPlan | null>;
  deleteMonthlyPlan(id: string): Promise<boolean>;
  deleteMonthlyPlans(ids: string[]): Promise<boolean>;
  resetMonthlyPlans(): Promise<void>;
}

// ===== 部门 =====
export interface IOrganizationService {
  // 部门
  initDepartments(): Promise<Department[]>;
  getDepartments(): Promise<Department[]>;
  getDepartmentById(id: string): Promise<Department | undefined>;
  addDepartment(item: Omit<Department, 'id' | 'createTime' | 'updateTime'>): Promise<Department>;
  updateDepartment(id: string, updates: Partial<Department>): Promise<Department | null>;
  deleteDepartment(id: string): Promise<boolean>;
  deleteDepartments(ids: string[]): Promise<boolean>;
  resetDepartments(): Promise<void>;
  // 职位
  initPositions(): Promise<Position[]>;
  getPositions(): Promise<Position[]>;
  getPositionById(id: string): Promise<Position | undefined>;
  addPosition(item: Omit<Position, 'id' | 'createTime' | 'updateTime'>): Promise<Position>;
  updatePosition(id: string, updates: Partial<Position>): Promise<Position | null>;
  deletePosition(id: string): Promise<boolean>;
  deletePositions(ids: string[]): Promise<boolean>;
  resetPositions(): Promise<void>;
  // 员工
  initStaffs(): Promise<Staff[]>;
  getStaffs(): Promise<Staff[]>;
  getStaffById(id: string): Promise<Staff | undefined>;
  addStaff(item: Omit<Staff, 'id' | 'createTime' | 'updateTime'>): Promise<Staff>;
  updateStaff(id: string, updates: Partial<Staff>): Promise<Staff | null>;
  deleteStaff(id: string): Promise<boolean>;
  deleteStaffs(ids: string[]): Promise<boolean>;
  resetStaffs(): Promise<void>;
}

// ===== 系统配置 =====
export interface ISystemConfigService {
  // 系统配置
  initSystemConfigs(): Promise<SystemConfig[]>;
  getSystemConfigs(): Promise<SystemConfig[]>;
  getSystemConfigById(id: string): Promise<SystemConfig | undefined>;
  addSystemConfig(item: Omit<SystemConfig, 'id' | 'createTime' | 'updateTime'>): Promise<SystemConfig>;
  updateSystemConfig(id: string, updates: Partial<SystemConfig>): Promise<SystemConfig | null>;
  deleteSystemConfig(id: string): Promise<boolean>;
  deleteSystemConfigs(ids: string[]): Promise<boolean>;
  resetSystemConfigs(): Promise<void>;
  // 字典数据
  initDictionarys(): Promise<Dictionary[]>;
  getDictionarys(): Promise<Dictionary[]>;
  getDictionaryById(id: string): Promise<Dictionary | undefined>;
  addDictionary(item: Omit<Dictionary, 'id' | 'createTime' | 'updateTime'>): Promise<Dictionary>;
  updateDictionary(id: string, updates: Partial<Dictionary>): Promise<Dictionary | null>;
  deleteDictionary(id: string): Promise<boolean>;
  deleteDictionarys(ids: string[]): Promise<boolean>;
  resetDictionarys(): Promise<void>;
}

// ===== 种植模式 =====
export interface IPlantingConfigService {
  // 种植模式
  initPlantingModes(): Promise<PlantingMode[]>;
  getPlantingModes(): Promise<PlantingMode[]>;
  getPlantingModeById(id: string): Promise<PlantingMode | undefined>;
  addPlantingMode(item: Omit<PlantingMode, 'id' | 'createTime' | 'updateTime'>): Promise<PlantingMode>;
  updatePlantingMode(id: string, updates: Partial<PlantingMode>): Promise<PlantingMode | null>;
  deletePlantingMode(id: string): Promise<boolean>;
  deletePlantingModes(ids: string[]): Promise<boolean>;
  resetPlantingModes(): Promise<void>;
  // 种植区域
  initPlantAreas(): Promise<PlantArea[]>;
  getPlantAreas(): Promise<PlantArea[]>;
  getPlantAreaById(id: string): Promise<PlantArea | undefined>;
  addPlantArea(item: Omit<PlantArea, 'id' | 'createTime' | 'updateTime'>): Promise<PlantArea>;
  updatePlantArea(id: string, updates: Partial<PlantArea>): Promise<PlantArea | null>;
  deletePlantArea(id: string): Promise<boolean>;
  deletePlantAreas(ids: string[]): Promise<boolean>;
  resetPlantAreas(): Promise<void>;
  // 地块
  initBlocks(): Promise<Block[]>;
  getBlocks(): Promise<Block[]>;
  getBlockById(id: string): Promise<Block | undefined>;
  addBlock(item: Omit<Block, 'id' | 'createTime' | 'updateTime'>): Promise<Block>;
  updateBlock(id: string, updates: Partial<Block>): Promise<Block | null>;
  deleteBlock(id: string): Promise<boolean>;
  deleteBlocks(ids: string[]): Promise<boolean>;
  resetBlocks(): Promise<void>;
}
