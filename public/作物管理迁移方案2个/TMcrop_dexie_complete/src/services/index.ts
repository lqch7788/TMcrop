/**
 * Service 切换入口（三级存储方案）
 * 根据 VITE_STORAGE_MODE 环境变量自动切换 api / dexie / localStorage
 * fallback：API 不可用自动降级到 Dexie.js，Dexie.js 不可用再降级到 LocalStorage
 *
 * 三种存储实现：
 * 1. api    → 后端 Node.js + SQLite（生产环境推荐）
 * 2. dexie  → Dexie.js IndexedDB（演示版/原型阶段推荐，纯前端）
 * 3. local  → LocalStorage（极简降级，5MB 限制）
 * 4. auto   → 自动探测：后端可用→api，否则→dexie，否则→local
 */

import type {
  ISeedSourceService, ISeedlingService, IPlantingService,
  IHarvestService, ICropInstanceService, ICropOrderService, ICropVarietyService,
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

/**
 * 探测后端是否可用
 */
async function checkApiHealth(): Promise<boolean> {
  try {
    const base = import.meta.env.VITE_API_BASE || '/api';
    const res = await fetch(base.replace('/api', '') + '/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * 探测 Dexie.js 是否可用（IndexedDB 支持检测）
 */
function checkDexieSupport(): boolean {
  try {
    return !!window.indexedDB;
  } catch {
    return false;
  }
}

/**
 * 选择实现：auto 模式下探测后端可用性，否则按配置
 */
async function resolveServices() {
  // 固定模式直接返回
  if (MODE === 'api') return apiServices;
  if (MODE === 'dexie') {
    if (checkDexieSupport()) return dexieServices;
    console.warn('[Dexie.js] IndexedDB 不可用，降级到 LocalStorage');
    return lsServices;
  }
  if (MODE === 'local') return lsServices;

  // auto 模式：探测后端 → Dexie.js → LocalStorage
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

// 动态代理：首次调用时解析实现
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
    // 同步 fallback：如果 dexie/local 直接选，auto 但尚未探测先用 dexie（启动最快）
    if (MODE === 'local') resolved = lsServices;
    else if (MODE === 'api') resolved = apiServices;
    else resolved = checkDexieSupport() ? dexieServices : lsServices;
  }
  return resolved;
}

// 导出各 Service（带动态降级）
export const seedSourceService: ISeedSourceService = createProxy(() => getResolved().seedSourceService as any);
export const seedlingService: ISeedlingService = createProxy(() => getResolved().seedlingService as any);
export const plantingService: IPlantingService = createProxy(() => getResolved().plantingService as any);
export const harvestService: IHarvestService = createProxy(() => getResolved().harvestService as any);
export const cropInstanceService: ICropInstanceService = createProxy(() => getResolved().cropInstanceService as any);
export const cropOrderService: ICropOrderService = createProxy(() => getResolved().cropOrderService as any);
export const cropVarietyService: ICropVarietyService = createProxy(() => getResolved().cropVarietyService as any);

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
