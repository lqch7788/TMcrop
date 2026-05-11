/**
 * 数据同步工具 - 将后端API数据同步到前端localStorage
 *
 * 使用场景：
 * 1. 后端有数据，前端localStorage为空或数据不一致
 * 2. 需要将后端数据离线化
 * 3. 数据初始化
 *
 * 使用方法：
 * import { syncAllToLocalStorage } from './syncToLocalStorage';
 * await syncAllToLocalStorage();
 */

import { apiClient } from './apiClient';

// 各模块的 localStorage key
const STORAGE_KEYS = {
  seedSources: 'crop_seed_sources',
  seedlings: 'crop_seedlings',
  plantings: 'crop_plantings',
  harvestRecords: 'harvest_records',
  cropInstances: 'crop_instances',
  cropOrders: 'crop_orders',
  cropVarieties: 'crop_varieties',
  productionPlans: 'production_plans',
  techSolutions: 'tech_solutions',
  purchasePlans: 'purchase_plans',
  dictionaries: 'yuanxingtu_dictionaries',
};

// ==================== 字段转换函数 ====================

// 后端返回的字段映射到前端格式 (snake_case -> camelCase)
function transformSeedSource(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformSeedSource);

  return {
    id: data.id,
    seedCode: data.seedCode || data.seed_code || '',
    sourceType: data.sourceType || data.source_type || 'seed',
    sourceOrigin: data.sourceOrigin || data.source_origin || 'external_purchase',
    cropCategory: data.cropCategory || data.crop_category || '',
    typeName: data.typeName || data.type_name || '',
    varietyName: data.varietyName || data.variety_name || '',
    cropName: data.cropName || data.crop_name || '',
    cropVariety: data.cropVariety || data.crop_variety || '',
    cropCode: data.cropCode || data.crop_code || '',
    supplierId: data.supplierId || data.supplier_id || '',
    supplierName: data.supplierName || data.supplier_name || '',
    purchaseDate: data.purchaseDate || data.purchase_date || '',
    quantity: data.quantity || 0,
    unit: data.unit || '',
    unitPrice: data.unitPrice || data.unit_price || 0,
    totalAmount: data.totalAmount || data.total_amount || 0,
    initialCount: data.initialCount || data.initial_count || 0,
    availableCount: data.availableCount || data.available_count || 0,
    pictures: Array.isArray(data.pictures) ? data.pictures : [],
    remarks: data.remarks || '',
    status: data.status || 'sufficient',
    printCount: data.printCount || data.print_count || 0,
    createBy: data.createBy || data.create_by || '',
    createTime: data.createTime || data.create_time || '',
    updateTime: data.updateTime || data.update_time || '',
  };
}

function transformSeedling(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformSeedling);

  return {
    id: data.id,
    seedlingCode: data.seedlingCode || data.seedling_code || '',
    sourceId: data.sourceId || data.source_id || '',
    sourceCode: data.sourceCode || data.source_code || '',
    productionPlanCode: data.productionPlanCode || data.production_plan_code || '',
    cropName: data.cropName || data.crop_name || '',
    cropVariety: data.cropVariety || data.crop_variety || '',
    cropCode: data.cropCode || data.crop_code || '',
    seedlingType: data.seedlingType || data.seedling_type || '',
    siteId: data.siteId || data.site_id || '',
    siteName: data.siteName || data.site_name || '',
    startDate: data.startDate || data.start_date || '',
    expectedEndDate: data.expectedEndDate || data.expected_end_date || '',
    endDate: data.endDate || data.end_date || '',
    initialCount: data.initialCount || data.initial_count || 0,
    survivalCount: data.survivalCount || data.survival_count || 0,
    plantedCount: data.plantedCount || data.planted_count || 0,
    survivalRate: data.survivalRate || data.survival_rate || 0,
    lossCount: data.lossCount || data.loss_count || 0,
    lossRate: data.lossRate || data.loss_rate || 0,
    isFinished: data.isFinished || data.is_finished || false,
    status: data.status || 'in_progress',
    dailyRecords: Array.isArray(data.dailyRecords) ? data.dailyRecords : [],
    pictures: Array.isArray(data.pictures) ? data.pictures : [],
    qualityGrade: data.qualityGrade || data.quality_grade || '',
    printCount: data.printCount || data.print_count || 0,
    remarks: data.remarks || '',
    createBy: data.createBy || data.create_by || '',
    createTime: data.createTime || data.create_time || '',
    updateTime: data.updateTime || data.update_time || '',
  };
}

function transformPlanting(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformPlanting);

  return {
    id: data.id,
    plantCode: data.plantCode || data.plant_code || '',
    sourceType: data.sourceType || data.source_type || 'seedling',
    sourceId: data.sourceId || data.source_id || '',
    sourceCode: data.sourceCode || data.source_code || '',
    cropName: data.cropName || data.crop_name || '',
    cropVariety: data.cropVariety || data.crop_variety || '',
    cropCode: data.cropCode || data.crop_code || '',
    areaId: data.areaId || data.area_id || '',
    areaName: data.areaName || data.area_name || '',
    rootName: data.rootName || data.root_name || '',
    plantingCount: data.plantingCount || data.planting_count || 0,
    plantingDate: data.plantingDate || data.planting_date || '',
    soilPH: data.soilPH || data.soil_ph || 0,
    soilEC: data.soilEC || data.soil_ec || 0,
    transplantCount: data.transplantCount || data.transplant_count || 0,
    transplantDate: data.transplantDate || data.transplant_date || '',
    isHarvest: data.isHarvest || data.is_harvest || false,
    harvestDate: data.harvestDate || data.harvest_date || '',
    attritionRate: data.attritionRate || data.attrition_rate || 0,
    printCount: data.printCount || data.print_count || 0,
    traceabilityCode: data.traceabilityCode || data.traceability_code || '',
    pictures: Array.isArray(data.pictures) ? data.pictures : [],
    remarks: data.remarks || '',
    status: data.status || 'planted',
    createBy: data.createBy || data.create_by || '',
    createTime: data.createTime || data.create_time || '',
    updateTime: data.updateTime || data.update_time || '',
  };
}

function transformHarvest(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformHarvest);

  return {
    id: data.id,
    harvestCode: data.harvestCode || data.harvest_code || '',
    batchId: data.batchId || data.batch_id || '',
    batchCode: data.batchCode || data.batch_code || '',
    cropName: data.cropName || data.crop_name || '',
    greenhouseId: data.greenhouseId || data.greenhouse_id || '',
    greenhouseName: data.greenhouseName || data.greenhouse_name || '',
    harvestDate: data.harvestDate || data.harvest_date || '',
    harvestArea: data.harvestArea || data.harvest_area || 0,
    harvestQuantity: data.harvestQuantity || data.harvest_quantity || 0,
    unit: data.unit || '',
    quality: data.quality || 'good',
    grade: data.grade || 'B',
    harvesterIds: Array.isArray(data.harvesterIds) ? data.harvesterIds : [],
    harvesterNames: Array.isArray(data.harvesterNames) ? data.harvesterNames : [],
    warehouseId: data.warehouseId || data.warehouse_id || '',
    warehouseName: data.warehouseName || data.warehouse_name || '',
    status: data.status || 'stored',
    auditor: data.auditor || '',
    variety: data.variety || '',
    plantingMode: data.plantingMode || data.planting_mode || '',
    targetYield: data.targetYield || data.target_yield || 0,
    relatedTaskId: data.relatedTaskId || data.related_task_id || '',
    relatedTaskCode: data.relatedTaskCode || data.related_task_code || '',
  };
}

function transformCropInstance(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformCropInstance);

  return {
    id: data.id,
    instanceCode: data.instanceCode || data.instance_code || '',
    orderId: data.orderId || data.order_id || '',
    orderCode: data.orderCode || data.order_code || '',
    cropCategory: data.cropCategory || data.crop_category || '',
    cropName: data.cropName || data.crop_name || '',
    cropVariety: data.cropVariety || data.crop_variety || '',
    categoryCode: data.categoryCode || data.category_code || '',
    typeCode: data.typeCode || data.type_code || '',
    subCode: data.subCode || data.sub_code || '',
    sourceOrigin: data.sourceOrigin || data.source_origin || '',
    sourceDescription: data.sourceDescription || data.source_description || '',
    initialQuantity: data.initialQuantity || data.initial_quantity || 0,
    currentQuantity: data.currentQuantity || data.current_quantity || 0,
    plantedQuantity: data.plantedQuantity || data.planted_quantity || 0,
    harvestedQuantity: data.harvestedQuantity || data.harvested_quantity || 0,
    status: data.status || 'seedling',
    seedEntryDate: data.seedEntryDate || data.seed_entry_date || '',
    seedlingStartDate: data.seedlingStartDate || data.seedling_start_date || '',
    plantingDate: data.plantingDate || data.planting_date || '',
    harvestDate: data.harvestDate || data.harvest_date || '',
    sourceInstanceId: data.sourceInstanceId || data.source_instance_id || '',
    createBy: data.createBy || data.create_by || '',
    createTime: data.createTime || data.create_time || '',
    updateTime: data.updateTime || data.update_time || '',
  };
}

function transformCropOrder(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformCropOrder);

  return {
    id: data.id,
    orderCode: data.orderCode || data.order_code || '',
    orderName: data.orderName || data.order_name || '',
    orderType: data.orderType || data.order_type || '',
    cropCategory: data.cropCategory || data.crop_category || '',
    cropName: data.cropName || data.crop_name || '',
    cropVariety: data.cropVariety || data.crop_variety || '',
    plannedQuantity: data.plannedQuantity || data.planned_quantity || 0,
    actualQuantity: data.actualQuantity || data.actual_quantity || 0,
    unit: data.unit || '',
    orderDate: data.orderDate || data.order_date || '',
    expectedHarvestDate: data.expectedHarvestDate || data.expected_harvest_date || '',
    status: data.status || 'planned',
    createBy: data.createBy || data.create_by || '',
    createTime: data.createTime || data.create_time || '',
    updateTime: data.updateTime || data.update_time || '',
    remarks: data.remarks || '',
  };
}

function transformProductionPlan(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformProductionPlan);

  return {
    id: data.id,
    batchCode: data.batchCode || '',
    batchName: data.batchName || '',
    planType: data.planType || '',
    cropName: data.cropName || '',
    variety: data.variety || '',
    greenhouseName: data.greenhouseName || '',
    areaName: data.areaName || '',
    targetQuantity: data.targetQuantity || 0,
    actualYield: data.actualYield || 0,
    startDate: data.startDate || '',
    expectedHarvestDate: data.expectedHarvestDate || '',
    actualHarvestDate: data.actualHarvestDate || '',
    status: data.status || 'planning',
    priority: data.priority || 'normal',
    remarks: data.remarks || '',
    publisher: data.publisher || '',
    createTime: data.createTime || '',
    updateTime: data.updateTime || '',
    responsiblePerson: data.responsiblePerson || '',
    unit: data.unit || '',
    publishDate: data.publishDate || '',
    batchStatus: data.batchStatus || 'draft',
    planDetail: data.planDetail || '',
    planDetailFileName: data.planDetailFileName || '',
    plantingArea: data.plantingArea || 0,
    plantingMode: data.plantingMode || '',
    supplierName: data.supplierName || '',
    seedlingSiteName: data.seedlingSiteName || '',
    seedQuantity: data.seedQuantity || 0,
    targetSeedlingCount: data.targetSeedlingCount || 0,
  };
}

function transformTechSolution(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformTechSolution);

  return {
    id: data.id,
    code: data.code || '',
    title: data.title || '',
    crop: data.crop || '',
    cropCode: data.cropCode || '',
    plantingMode: data.plantingMode || '',
    stage: data.stage || '',
    version: data.version || 'V1.0',
    content: data.content || '',
    author: data.author || '',
    authorId: data.authorId || '',
    createDate: data.createDate || '',
    updateTime: data.updateTime || '',
    status: data.status || '草稿',
    batchStatus: data.batchStatus || 'draft',
    statusClass: data.statusClass || 'draft',
    approveStatus: data.approveStatus || '待审批',
    approvalCode: data.approvalCode || '',
    approvalDate: data.approvalDate || '',
    approver: data.approver || '',
    relatedBatchCode: data.relatedBatchCode || '',
    planDetailFileName: data.planDetailFileName || '',
    priority: data.priority || 'normal',
    remarks: data.remarks || '',
  };
}

function transformPurchasePlan(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformPurchasePlan);

  const items = Array.isArray(data.items) ? data.items.map((i: any) => ({
    id: i.id || '',
    materialId: i.materialId || '',
    materialCode: i.materialCode || '',
    materialName: i.materialName || '',
    category: i.category || '',
    specification: i.specification || '',
    unit: i.unit || '',
    quantity: i.quantity || 0,
    estimatedPrice: i.estimatedPrice || 0,
    estimatedTotalPrice: i.estimatedTotalPrice || 0,
    supplier: i.supplier || '',
    location: i.location || '',
    batchNo: i.batchNo || '',
    productionDate: i.productionDate || '',
    expiryDate: i.expiryDate || '',
    purpose: i.purpose || '',
    remark: i.remark || '',
    relatedBatchCode: i.relatedBatchCode || '',
  })) : [];

  return {
    id: data.id,
    purchaseApplicationCode: data.purchaseApplicationCode || '',
    relatedBatchCode: data.relatedBatchCode || '',
    purchaseType: data.purchaseType || '',
    purchaseTypeName: data.purchaseTypeName || '',
    applicant: data.applicant || '',
    applicantId: data.applicantId || '',
    applicantDepartment: data.applicantDepartment || '',
    applyDate: data.applyDate || '',
    requiredDate: data.requiredDate || '',
    priority: data.priority || 'normal',
    priorityText: data.priorityText || '中',
    status: data.status || 'draft',
    statusText: data.statusText || '草稿',
    itemCount: data.itemCount || items.length,
    items: items,
    remarks: data.remarks || '',
    approvalPerson: data.approvalPerson || '',
    approvalStatus: data.approvalStatus || 'pending',
    createdAt: data.createdAt || '',
    updatedAt: data.updatedAt || '',
    planCode: data.planCode || '',
    planTitle: data.planTitle || '',
    planType: data.planType || '',
    departmentName: data.departmentName || '',
    applicantName: data.applicantName || '',
    applyDate2: data.applyDate2 || '',
    expectedDate: data.expectedDate || '',
    supplierId: data.supplierId || '',
    supplierName: data.supplierName || '',
    totalAmount: data.totalAmount || 0,
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
  };
}

// ==================== 同步函数 ====================

interface SyncResult {
  success: boolean;
  module: string;
  count: number;
  error?: string;
}

async function syncSeedSources(): Promise<SyncResult> {
  try {
    const response = await apiClient.get<any[]>('/seed-sources');
    const data = response || [];
    const transformed = transformSeedSource(data);
    localStorage.setItem(STORAGE_KEYS.seedSources, JSON.stringify(transformed));
    console.log(`[Sync] 种源管理: 同步了 ${transformed.length} 条数据`);
    return { success: true, module: '种源管理', count: transformed.length };
  } catch (error) {
    console.error('[Sync] 种源管理同步失败:', error);
    return { success: false, module: '种源管理', count: 0, error: String(error) };
  }
}

async function syncSeedlings(): Promise<SyncResult> {
  try {
    const response = await apiClient.get<any[]>('/seedlings');
    const data = response || [];
    const transformed = transformSeedling(data);
    localStorage.setItem(STORAGE_KEYS.seedlings, JSON.stringify(transformed));
    console.log(`[Sync] 育苗管理: 同步了 ${transformed.length} 条数据`);
    return { success: true, module: '育苗管理', count: transformed.length };
  } catch (error) {
    console.error('[Sync] 育苗管理同步失败:', error);
    return { success: false, module: '育苗管理', count: 0, error: String(error) };
  }
}

async function syncPlantings(): Promise<SyncResult> {
  try {
    const response = await apiClient.get<any[]>('/plantings');
    const data = response || [];
    const transformed = transformPlanting(data);
    localStorage.setItem(STORAGE_KEYS.plantings, JSON.stringify(transformed));
    console.log(`[Sync] 种植管理: 同步了 ${transformed.length} 条数据`);
    return { success: true, module: '种植管理', count: transformed.length };
  } catch (error) {
    console.error('[Sync] 种植管理同步失败:', error);
    return { success: false, module: '种植管理', count: 0, error: String(error) };
  }
}

async function syncHarvestRecords(): Promise<SyncResult> {
  try {
    const response = await apiClient.get<any[]>('/harvest');
    const data = response || [];
    const transformed = transformHarvest(data);
    localStorage.setItem(STORAGE_KEYS.harvestRecords, JSON.stringify(transformed));
    console.log(`[Sync] 采收入库: 同步了 ${transformed.length} 条数据`);
    return { success: true, module: '采收入库', count: transformed.length };
  } catch (error) {
    console.error('[Sync] 采收入库同步失败:', error);
    return { success: false, module: '采收入库', count: 0, error: String(error) };
  }
}

async function syncCropInstances(): Promise<SyncResult> {
  try {
    const response = await apiClient.get<any[]>('/crop-instances');
    const data = response || [];
    const transformed = transformCropInstance(data);
    localStorage.setItem(STORAGE_KEYS.cropInstances, JSON.stringify(transformed));
    console.log(`[Sync] 作物库存/实例追溯: 同步了 ${transformed.length} 条数据`);
    return { success: true, module: '作物库存/实例追溯', count: transformed.length };
  } catch (error) {
    console.error('[Sync] 作物库存/实例追溯同步失败:', error);
    return { success: false, module: '作物库存/实例追溯', count: 0, error: String(error) };
  }
}

async function syncCropOrders(): Promise<SyncResult> {
  try {
    const response = await apiClient.get<any[]>('/crop-orders');
    const data = response || [];
    const transformed = transformCropOrder(data);
    localStorage.setItem(STORAGE_KEYS.cropOrders, JSON.stringify(transformed));
    console.log(`[Sync] 订单管理: 同步了 ${transformed.length} 条数据`);
    return { success: true, module: '订单管理', count: transformed.length };
  } catch (error) {
    console.error('[Sync] 订单管理同步失败:', error);
    return { success: false, module: '订单管理', count: 0, error: String(error) };
  }
}

async function syncProductionPlans(): Promise<SyncResult> {
  try {
    const response = await apiClient.get<any[]>('/production-plans');
    const data = response || [];
    const transformed = transformProductionPlan(data);
    localStorage.setItem(STORAGE_KEYS.productionPlans, JSON.stringify(transformed));
    console.log(`[Sync] 生产计划: 同步了 ${transformed.length} 条数据`);
    return { success: true, module: '生产计划', count: transformed.length };
  } catch (error) {
    console.error('[Sync] 生产计划同步失败:', error);
    return { success: false, module: '生产计划', count: 0, error: String(error) };
  }
}

async function syncTechSolutions(): Promise<SyncResult> {
  try {
    const response = await apiClient.get<any[]>('/tech-solutions');
    const data = response || [];
    const transformed = transformTechSolution(data);
    localStorage.setItem(STORAGE_KEYS.techSolutions, JSON.stringify(transformed));
    console.log(`[Sync] 技术方案: 同步了 ${transformed.length} 条数据`);
    return { success: true, module: '技术方案', count: transformed.length };
  } catch (error) {
    console.error('[Sync] 技术方案同步失败:', error);
    return { success: false, module: '技术方案', count: 0, error: String(error) };
  }
}

async function syncPurchasePlans(): Promise<SyncResult> {
  try {
    const response = await apiClient.get<any[]>('/purchase-plans');
    const data = response || [];
    const transformed = transformPurchasePlan(data);
    localStorage.setItem(STORAGE_KEYS.purchasePlans, JSON.stringify(transformed));
    console.log(`[Sync] 采购计划: 同步了 ${transformed.length} 条数据`);
    return { success: true, module: '采购计划', count: transformed.length };
  } catch (error) {
    console.error('[Sync] 采购计划同步失败:', error);
    return { success: false, module: '采购计划', count: 0, error: String(error) };
  }
}

function transformDictionary(data: any): any {
  if (!data) return data;
  if (Array.isArray(data)) return data.map(transformDictionary);

  return {
    id: data.id || '',
    category: data.category_code || data.category || '',
    code: data.dict_code || data.code || '',
    name: data.dict_label || data.name || '',
    sortNumber: data.sort_order || data.sortNumber || 0,
    status: data.status || 'active',
    createdAt: data.created_at || data.createdAt || '',
    updatedAt: data.updated_at || data.updatedAt || '',
  };
}

export async function syncDictionaries(): Promise<SyncResult> {
  try {
    const response = await apiClient.get<any[]>('/dictionary/dictionaries');
    const data = response || [];
    const transformed = transformDictionary(data);
    localStorage.setItem(STORAGE_KEYS.dictionaries, JSON.stringify(transformed));
    console.log(`[Sync] 数据字典: 同步了 ${transformed.length} 条数据`);
    return { success: true, module: '数据字典', count: transformed.length };
  } catch (error) {
    console.error('[Sync] 数据字典同步失败:', error);
    return { success: false, module: '数据字典', count: 0, error: String(error) };
  }
}

/**
 * 同步所有模块数据到 localStorage
 * @returns 同步结果列表
 */
export async function syncAllToLocalStorage(): Promise<SyncResult[]> {
  console.log('[Sync] 开始同步数据到 localStorage...');

  const results: SyncResult[] = [];

  // 同步各模块
  results.push(await syncSeedSources());
  results.push(await syncSeedlings());
  results.push(await syncPlantings());
  results.push(await syncHarvestRecords());
  results.push(await syncCropInstances());
  results.push(await syncCropOrders());
  results.push(await syncProductionPlans());
  results.push(await syncTechSolutions());
  results.push(await syncPurchasePlans());
  results.push(await syncDictionaries());

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.reduce((sum, r) => sum + r.count, 0);

  console.log(`[Sync] 同步完成: ${successCount}/${results.length} 个模块成功, 共 ${totalCount} 条数据`);

  return results;
}

/**
 * 同步指定模块
 * @param modules 要同步的模块列表
 */
export async function syncModules(modules: string[]): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  const moduleMap: Record<string, () => Promise<SyncResult>> = {
    '种源管理': syncSeedSources,
    '育苗管理': syncSeedlings,
    '种植管理': syncPlantings,
    '采收入库': syncHarvestRecords,
    '作物库存': syncCropInstances,
    '实例追溯': syncCropInstances,
    '订单管理': syncCropOrders,
    '生产计划': syncProductionPlans,
    '技术方案': syncTechSolutions,
    '采购计划': syncPurchasePlans,
    '数据字典': syncDictionaries,
  };

  for (const module of modules) {
    const syncFn = moduleMap[module];
    if (syncFn) {
      results.push(await syncFn());
    } else {
      results.push({
        success: false,
        module,
        count: 0,
        error: '未知的模块',
      });
    }
  }

  return results;
}

/**
 * 清除指定模块的 localStorage 数据
 * @param module 模块名称
 */
export function clearLocalStorage(module: string): void {
  const moduleMap: Record<string, string> = {
    '种源管理': STORAGE_KEYS.seedSources,
    '育苗管理': STORAGE_KEYS.seedlings,
    '种植管理': STORAGE_KEYS.plantings,
    '采收入库': STORAGE_KEYS.harvestRecords,
    '作物库存': STORAGE_KEYS.cropInstances,
    '实例追溯': STORAGE_KEYS.cropInstances,
    '订单管理': STORAGE_KEYS.cropOrders,
    '生产计划': STORAGE_KEYS.productionPlans,
    '技术方案': STORAGE_KEYS.techSolutions,
    '采购计划': STORAGE_KEYS.purchasePlans,
    '数据字典': STORAGE_KEYS.dictionaries,
  };

  const key = moduleMap[module];
  if (key) {
    localStorage.removeItem(key);
    console.log(`[Sync] 已清除 ${module} 的 localStorage 数据`);
  }
}

/**
 * 清除所有同步模块的 localStorage 数据
 */
export function clearAllLocalStorage(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('[Sync] 已清除所有模块的 localStorage 数据');
}
