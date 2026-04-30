/**
 * Service 切换入口（三级存储方案）
 * 根据 VITE_STORAGE_MODE 环境变量自动切换 api / dexie / localStorage
 * fallback：API 不可用自动降级到 Dexie.js，Dexie.js 不可用再降级到 LocalStorage
 */

import type {
  // 作物管理
  ISeedSourceService, ISeedlingService, IPlantingService,
  IHarvestService, ICropInstanceService, ICropOrderService, ICropVarietyService,
  // 基础设置
  IBaseSettingsService, IIndicatorService, IFarmActivityService,
  // 库存管理
  IInventoryService, IWarehouseService, IMaterialService,
  // 审批中心
  IApprovalService,
  // 人工管理
  IAttendanceService, IAttendanceRepairService, ILeaveService,
  IOvertimeService, IRecruitmentService, IContractService,
  IOnboardingService, IResignationService, ISalaryAdjustmentService,
  ISalaryBudgetService, ITaskCenterService, IPersonnelService,
  // 生产计划
  IProductionPlanService,
  // 系统设置
  IOrganizationService, ISystemConfigService,
  // 种植模式
  IPlantingConfigService,
} from './interfaces';

// 导入 API 实现（后端方案）
import * as apiServices from './api';
// 导入 LocalStorage 实现（降级方案）
import * as lsServices from './localStorage';
// 导入 Dexie.js 实现（第三种方案）
import * as dexieServices from './dexie';

const MODE = (import.meta.env.VITE_STORAGE_MODE || 'auto') as 'api' | 'dexie' | 'local' | 'auto';

let apiHealthy = true;
let dexieHealthy = true;

async function checkApiHealth(): Promise<boolean> {
  try {
    const base = import.meta.env.VITE_API_BASE || '/api';
    const res = await fetch(base.replace('/api', '') + '/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

function checkDexieSupport(): boolean {
  try {
    return !!window.indexedDB;
  } catch {
    return false;
  }
}

async function resolveServices() {
  if (MODE === 'api') return apiServices;
  if (MODE === 'dexie') {
    if (checkDexieSupport()) return dexieServices;
    console.warn('[Dexie.js] IndexedDB 不可用，降级到 LocalStorage');
    return lsServices;
  }
  if (MODE === 'local') return lsServices;

  if (apiHealthy) {
    const ok = await checkApiHealth();
    apiHealthy = ok;
    if (ok) return apiServices;
  }

  if (dexieHealthy && checkDexieSupport()) {
    return dexieServices;
  }

  console.warn('[Service] 所有高级存储不可用，降级到 LocalStorage');
  return lsServices;
}

function createProxy<T>(getter: () => T): T {
  return new Proxy({} as T, {
    get(_, prop) {
      const svc = getter();
      const fn = (svc as any)[prop];
      if (typeof fn === 'function') return fn.bind(svc);
      return fn;
    },
  });
}

let resolved: typeof apiServices | typeof dexieServices | typeof lsServices | null = null;
function getResolved() {
  if (!resolved) {
    if (MODE === 'local') resolved = lsServices;
    else if (MODE === 'api') resolved = apiServices;
    else resolved = checkDexieSupport() ? dexieServices : lsServices;
  }
  return resolved;
}

// ===== 作物管理 =====
export const seedSourceService: ISeedSourceService = createProxy(() => getResolved().seedSourceService as any);
export const seedlingService: ISeedlingService = createProxy(() => getResolved().seedlingService as any);
export const plantingService: IPlantingService = createProxy(() => getResolved().plantingService as any);
export const harvestService: IHarvestService = createProxy(() => getResolved().harvestService as any);
export const cropInstanceService: ICropInstanceService = createProxy(() => getResolved().cropInstanceService as any);
export const cropOrderService: ICropOrderService = createProxy(() => getResolved().cropOrderService as any);
export const cropVarietyService: ICropVarietyService = createProxy(() => getResolved().cropVarietyService as any);

// ===== 基础设置 =====
export const baseSettingsService: IBaseSettingsService = createProxy(() => getResolved().baseSettingsService as any);
export const indicatorService: IIndicatorService = createProxy(() => getResolved().indicatorService as any);
export const farmActivityService: IFarmActivityService = createProxy(() => getResolved().farmActivityService as any);

// ===== 库存管理 =====
export const inventoryService: IInventoryService = createProxy(() => getResolved().inventoryService as any);
export const warehouseService: IWarehouseService = createProxy(() => getResolved().warehouseService as any);
export const materialService: IMaterialService = createProxy(() => getResolved().materialService as any);

// ===== 审批中心 =====
export const approvalService: IApprovalService = createProxy(() => getResolved().approvalService as any);

// ===== 人工管理 =====
export const attendanceService: IAttendanceService = createProxy(() => getResolved().attendanceService as any);
export const attendanceRepairService: IAttendanceRepairService = createProxy(() => getResolved().attendanceRepairService as any);
export const leaveService: ILeaveService = createProxy(() => getResolved().leaveService as any);
export const overtimeService: IOvertimeService = createProxy(() => getResolved().overtimeService as any);
export const recruitmentService: IRecruitmentService = createProxy(() => getResolved().recruitmentService as any);
export const contractService: IContractService = createProxy(() => getResolved().contractService as any);
export const onboardingService: IOnboardingService = createProxy(() => getResolved().onboardingService as any);
export const resignationService: IResignationService = createProxy(() => getResolved().resignationService as any);
export const salaryAdjustmentService: ISalaryAdjustmentService = createProxy(() => getResolved().salaryAdjustmentService as any);
export const salaryBudgetService: ISalaryBudgetService = createProxy(() => getResolved().salaryBudgetService as any);
export const taskCenterService: ITaskCenterService = createProxy(() => getResolved().taskCenterService as any);
export const personnelService: IPersonnelService = createProxy(() => getResolved().personnelService as any);

// ===== 生产计划 =====
export const productionPlanService: IProductionPlanService = createProxy(() => getResolved().productionPlanService as any);

// ===== 系统设置 =====
export const organizationService: IOrganizationService = createProxy(() => getResolved().organizationService as any);
export const systemConfigService: ISystemConfigService = createProxy(() => getResolved().systemConfigService as any);

// ===== 种植模式与区域 =====
export const plantingConfigService: IPlantingConfigService = createProxy(() => getResolved().plantingConfigService as any);

// 手动切换接口
export async function switchToApi() {
  const ok = await checkApiHealth();
  if (!ok) throw new Error('API backend unreachable');
  resolved = apiServices;
  apiHealthy = true;
}

export function switchToDexie() {
  if (!checkDexieSupport()) throw new Error('IndexedDB not supported in this browser');
  resolved = dexieServices;
  apiHealthy = false;
}

export function switchToLocalStorage() {
  resolved = lsServices;
  apiHealthy = false;
  dexieHealthy = false;
}

export function getCurrentMode(): string {
  if (resolved === apiServices) return 'api';
  if (resolved === dexieServices) return 'dexie';
  if (resolved === lsServices) return 'localStorage';
  return MODE;
}
