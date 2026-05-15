/**
 * 数据初始化模块 - 作物管理模块模拟数据自动初始化
 *
 * 同时写入 localStorage 和 IndexedDB
 * localStorage 用于与现有 service 层兼容
 * IndexedDB 用于大容量数据存储（未来扩展）
 *
 * 版本：v3.1（兼容 localStorage）
 * 创建时间：2026-05-01
 */

import { db, clearAllData, isDataInitialized } from '../db/database';

// ============================================
// localStorage 存储键名
// ============================================
const STORAGE_KEYS = {
  orders: 'crop_orders',
  instances: 'crop_instances',
  seedSources: 'crop_seed_sources',
  seedlings: 'crop_seedlings',
  plantings: 'crop_plantings',
  harvestRecords: 'harvest_records',
};

// ============================================
// 配置
// ============================================

const VARIETIES = [
  { cropCategory: '蔬菜类', typeName: '茄果类', varietyName: '番茄', cropName: '红果番茄', cropCode: 'PD0301004001' },
  { cropCategory: '蔬菜类', typeName: '瓜菜类', varietyName: '黄瓜', cropName: '水果黄瓜', cropCode: 'PD0201001001' },
  { cropCategory: '蔬菜类', typeName: '叶菜类', varietyName: '生菜', cropName: '散叶生菜', cropCode: 'PD0102001001' },
  { cropCategory: '水果类', typeName: '草莓类', varietyName: '草莓', cropName: '红颜草莓', cropCode: 'FR0101001001' },
  { cropCategory: '蔬菜类', typeName: '茄果类', varietyName: '茄子', cropName: '紫长茄子', cropCode: 'PD0303001001' },
  { cropCategory: '蔬菜类', typeName: '茄果类', varietyName: '辣椒', cropName: '红尖椒', cropCode: 'PD0304006001' },
];

const SITES = [
  { id: 'G001', name: '玻璃温室A区' },
  { id: 'G002', name: '玻璃温室B区' },
  { id: 'SITE001', name: '育苗温室A区' },
  { id: 'SITE002', name: '育苗温室B区' },
];

const SUPPLIERS = [
  { id: 'SUP001', name: '金色稻种有限公司' },
  { id: 'SUP002', name: '丰收种业公司' },
  { id: 'SUP003', name: '绿野种苗公司' },
  { id: 'SUP004', name: '省农业科学院' },
];

// ============================================
// 工具函数
// ============================================

function generateId(prefix: string): string {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
}

function now(): string {
  return new Date().toLocaleString('zh-CN');
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function generateOrderCode(): string {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  return `DD${dateStr}${String(Math.floor(Math.random() * 900) + 100)}`;
}

function generateInstanceCode(cropCode: string): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth()+1).padStart(2,'0');
  const day = String(now.getDate()).padStart(2,'0');
  return `${cropCode}${year}${month}${day}${String(Math.floor(Math.random() * 900) + 100)}`;
}

function generateSeedCode(): string {
  const dateStr = today().replace(/-/g, '');
  return `ZZ${dateStr}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function generateSeedlingCode(): string {
  const dateStr = today().replace(/-/g, '');
  return `YM${dateStr}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function generatePlantCode(): string {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth()+1).padStart(2,'0');
  return `ZZ20${year}${month}-${String(Math.floor(Math.random() * 90) + 10)}`;
}

function generateHarvestCode(): string {
  const dateStr = today().replace(/-/g, '');
  return `HS${dateStr}${String(Math.floor(Math.random() * 900) + 100)}`;
}

// 生产计划映射函数 - 根据作物名称获取对应的生产计划（返回空，生产计划数据由 API/Zustand Store 管理）
function getProductionPlan(_cropName: string, _type: 'seed' | 'seedling' | 'planting'): { id: string; code: string } {
  return { id: '', code: '' };
}

// ============================================
// 数据初始化函数
// ============================================

function initData(): void {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 作物管理模块数据初始化 (v3.1 - localStorage + IndexedDB)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // 1. 创建订单
  console.log('📋 步骤1：创建6个订单');
  const orders: any[] = [
    { name: '番茄生产订单A', cropIndex: 0, quantity: 50000, customer: '客户A' },
    { name: '黄瓜生产订单A', cropIndex: 1, quantity: 40000, customer: '客户B' },
    { name: '生菜生产订单A', cropIndex: 2, quantity: 30000, customer: '客户C' },
    { name: '草莓生产订单A', cropIndex: 3, quantity: 15000, customer: '客户D' },
    { name: '茄子生产订单A', cropIndex: 4, quantity: 25000, customer: '客户E' },
    { name: '辣椒生产订单A', cropIndex: 5, quantity: 20000, customer: '客户F' },
  ].map((data) => {
    const v = VARIETIES[data.cropIndex];
    return {
      id: generateId('OR'),
      orderCode: generateOrderCode(),
      orderType: 'production',
      orderName: data.name,
      cropCategory: v.cropCategory,
      cropName: v.cropName,
      cropVariety: v.varietyName,
      plannedQuantity: data.quantity,
      actualQuantity: 0,
      unit: '株',
      customerId: `CUST${data.cropIndex + 1}`,
      customerName: data.customer,
      status: 'planned',
      orderDate: today(),
      expectedHarvestDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      instanceIds: [],
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
    };
  });
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
  console.log(`  ✅ 已创建 ${orders.length} 个订单`);

  // 2. 创建实例
  console.log('');
  console.log('🌱 步骤2：创建12个作物实例（每个订单2个）');
  const instances: any[] = [];
  const instanceConfigs = [
    { orderIndex: 0, cropIndex: 0, quantity: 25000 },
    { orderIndex: 0, cropIndex: 0, quantity: 25000 },
    { orderIndex: 1, cropIndex: 1, quantity: 20000 },
    { orderIndex: 1, cropIndex: 1, quantity: 20000 },
    { orderIndex: 2, cropIndex: 2, quantity: 15000 },
    { orderIndex: 2, cropIndex: 2, quantity: 15000 },
    { orderIndex: 3, cropIndex: 3, quantity: 7500 },
    { orderIndex: 3, cropIndex: 3, quantity: 7500 },
    { orderIndex: 4, cropIndex: 4, quantity: 12500 },
    { orderIndex: 4, cropIndex: 4, quantity: 12500 },
    { orderIndex: 5, cropIndex: 5, quantity: 10000 },
    { orderIndex: 5, cropIndex: 5, quantity: 10000 },
  ];

  instanceConfigs.forEach((config) => {
    const v = VARIETIES[config.cropIndex];
    const order = orders[config.orderIndex];
    const instance = {
      id: generateId('CI'),
      instanceCode: generateInstanceCode(v.cropCode),
      orderId: order.id,
      orderCode: order.orderCode,
      cropCategory: v.cropCategory,
      cropName: v.cropName,
      cropVariety: v.varietyName,
      categoryCode: v.cropCode.slice(0, 2),
      typeCode: v.cropCode.slice(2, 4),
      subCode: v.cropCode.slice(6, 9),
      sourceOrigin: 'external_purchase',
      sourceDescription: `从${v.cropName}供应商采购`,
      initialQuantity: config.quantity,
      currentQuantity: config.quantity,
      plantedQuantity: 0,
      harvestedQuantity: 0,
      unit: '株',
      status: 'seedling',
      seedEntryDate: now(),
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
    };
    instances.push(instance);
    order.instanceIds.push(instance.id);
  });
  localStorage.setItem(STORAGE_KEYS.orders, JSON.stringify(orders));
  localStorage.setItem(STORAGE_KEYS.instances, JSON.stringify(instances));
  console.log(`  ✅ 已创建 ${instances.length} 个实例`);

  // 3. 创建种源
  console.log('');
  console.log('🌿 步骤3：创建24条种源（每个实例2条）');
  const seedSources: any[] = [];
  const seedConfigs = [
    { instanceIndex: 0, supplierIndex: 0, quantity: 13000 },
    { instanceIndex: 0, supplierIndex: 0, quantity: 12000 },
    { instanceIndex: 1, supplierIndex: 0, quantity: 13000 },
    { instanceIndex: 1, supplierIndex: 0, quantity: 12000 },
    { instanceIndex: 2, supplierIndex: 1, quantity: 10000 },
    { instanceIndex: 2, supplierIndex: 1, quantity: 10000 },
    { instanceIndex: 3, supplierIndex: 1, quantity: 10000 },
    { instanceIndex: 3, supplierIndex: 1, quantity: 10000 },
    { instanceIndex: 4, supplierIndex: 2, quantity: 8000 },
    { instanceIndex: 4, supplierIndex: 2, quantity: 7000 },
    { instanceIndex: 5, supplierIndex: 2, quantity: 8000 },
    { instanceIndex: 5, supplierIndex: 2, quantity: 7000 },
    { instanceIndex: 6, supplierIndex: 3, quantity: 4000 },
    { instanceIndex: 6, supplierIndex: 3, quantity: 3500 },
    { instanceIndex: 7, supplierIndex: 3, quantity: 4000 },
    { instanceIndex: 7, supplierIndex: 3, quantity: 3500 },
    { instanceIndex: 8, supplierIndex: 0, quantity: 6500 },
    { instanceIndex: 8, supplierIndex: 0, quantity: 6000 },
    { instanceIndex: 9, supplierIndex: 0, quantity: 6500 },
    { instanceIndex: 9, supplierIndex: 0, quantity: 6000 },
    { instanceIndex: 10, supplierIndex: 1, quantity: 5500 },
    { instanceIndex: 10, supplierIndex: 1, quantity: 4500 },
    { instanceIndex: 11, supplierIndex: 1, quantity: 5500 },
    { instanceIndex: 11, supplierIndex: 1, quantity: 4500 },
  ];

  seedConfigs.forEach((config) => {
    const inst = instances[config.instanceIndex];
    const supplier = SUPPLIERS[config.supplierIndex];
    const v = VARIETIES.find(variety => variety.cropName === inst.cropName) || VARIETIES[0];
    const plan = getProductionPlan(inst.cropName, 'seed');
    const seedSource = {
      id: generateId('SS'),
      seedCode: generateSeedCode(),
      sourceType: 'seed',
      sourceOrigin: 'external_purchase',
      cropCategory: inst.cropCategory,
      typeName: v.typeName,
      varietyName: v.varietyName,
      cropName: inst.cropName,
      cropVariety: inst.cropVariety,
      cropCode: v.cropCode,
      supplierId: supplier.id,
      supplierName: supplier.name,
      purchaseDate: today(),
      quantity: config.quantity,
      unit: '株',
      unitPrice: 0.5,
      totalAmount: config.quantity * 0.5,
      initialCount: config.quantity,
      availableCount: config.quantity,
      lossCount: 0,
      pictures: [],
      status: 'sufficient',
      printCount: 0,
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
      instanceId: inst.id,
      orderId: inst.orderId,
      orderCode: inst.orderCode,
      productionPlanId: plan.id,
      productionPlanCode: plan.code,
    };
    seedSources.push(seedSource);
  });
  localStorage.setItem(STORAGE_KEYS.seedSources, JSON.stringify(seedSources));
  console.log(`  ✅ 已创建 ${seedSources.length} 条种源记录`);

  // 4. 创建育苗
  console.log('');
  console.log('🌾 步骤4：创建12条育苗记录（每个实例1条）');
  const seedlings: any[] = [];
  const seedlingConfigs = [
    { instanceIndex: 0, siteIndex: 0, initial: 12000, survival: 10800, loss: 1200 },
    { instanceIndex: 1, siteIndex: 0, initial: 11000, survival: 9900, loss: 1100 },
    { instanceIndex: 2, siteIndex: 1, initial: 18000, survival: 17100, loss: 900 },
    { instanceIndex: 3, siteIndex: 1, initial: 18000, survival: 17100, loss: 900 },
    { instanceIndex: 4, siteIndex: 0, initial: 14000, survival: 12600, loss: 1400 },
    { instanceIndex: 5, siteIndex: 0, initial: 14000, survival: 12600, loss: 1400 },
    { instanceIndex: 6, siteIndex: 1, initial: 7000, survival: 6300, loss: 700 },
    { instanceIndex: 7, siteIndex: 1, initial: 7000, survival: 6300, loss: 700 },
    { instanceIndex: 8, siteIndex: 0, initial: 12000, survival: 10800, loss: 1200 },
    { instanceIndex: 9, siteIndex: 0, initial: 12000, survival: 10800, loss: 1200 },
    { instanceIndex: 10, siteIndex: 1, initial: 10000, survival: 9000, loss: 1000 },
    { instanceIndex: 11, siteIndex: 1, initial: 10000, survival: 9000, loss: 1000 },
  ];

  seedlingConfigs.forEach((config) => {
    const inst = instances[config.instanceIndex];
    const site = SITES[config.siteIndex];
    const relatedSeed = seedSources.find(s => s.instanceId === inst.id);
    const v = VARIETIES.find(variety => variety.cropName === inst.cropName) || VARIETIES[0];
    const plan = getProductionPlan(inst.cropName, 'seedling');
    const seedling = {
      id: generateId('SD'),
      seedlingCode: generateSeedlingCode(),
      sourceId: relatedSeed ? relatedSeed.id : '',
      sourceCode: relatedSeed ? relatedSeed.seedCode : '',
      cropName: inst.cropName,
      cropVariety: inst.cropVariety,
      cropCode: v.cropCode,
      seedlingType: '常规育苗',
      siteId: site.id,
      siteName: site.name,
      startDate: today(),
      initialCount: config.initial,
      survivalCount: config.survival,
      plantedCount: 0,
      survivalRate: Math.round((config.survival / config.initial) * 100),
      lossCount: config.loss,
      lossRate: Math.round((config.loss / config.initial) * 100),
      isFinished: false,
      status: 'in_progress',
      dailyRecords: [],
      pictures: [],
      printCount: 0,
      remarks: '',
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
      instanceId: inst.id,
      orderId: inst.orderId,
      orderCode: inst.orderCode,
      productionPlanId: plan.id,
      productionPlanCode: plan.code,
    };
    seedlings.push(seedling);
  });
  localStorage.setItem(STORAGE_KEYS.seedlings, JSON.stringify(seedlings));
  console.log(`  ✅ 已创建 ${seedlings.length} 条育苗记录`);

  // 5. 创建种植
  console.log('');
  console.log('🌍 步骤5：创建12条种植记录（每个实例1条）');
  const plantings: any[] = [];
  const plantingConfigs = [
    { instanceIndex: 0, areaIndex: 0, quantity: 10000, lossRate: 5 },
    { instanceIndex: 1, areaIndex: 0, quantity: 9000, lossRate: 5 },
    { instanceIndex: 2, areaIndex: 1, quantity: 16000, lossRate: 3 },
    { instanceIndex: 3, areaIndex: 1, quantity: 16000, lossRate: 3 },
    { instanceIndex: 4, areaIndex: 0, quantity: 12000, lossRate: 5 },
    { instanceIndex: 5, areaIndex: 0, quantity: 12000, lossRate: 5 },
    { instanceIndex: 6, areaIndex: 1, quantity: 6000, lossRate: 5 },
    { instanceIndex: 7, areaIndex: 1, quantity: 6000, lossRate: 5 },
    { instanceIndex: 8, areaIndex: 0, quantity: 10000, lossRate: 5 },
    { instanceIndex: 9, areaIndex: 0, quantity: 10000, lossRate: 5 },
    { instanceIndex: 10, areaIndex: 1, quantity: 8500, lossRate: 5 },
    { instanceIndex: 11, areaIndex: 1, quantity: 8500, lossRate: 5 },
  ];

  plantingConfigs.forEach((config) => {
    const inst = instances[config.instanceIndex];
    const area = SITES[config.areaIndex];
    const relatedSeedling = seedlings.find(s => s.instanceId === inst.id);
    const v = VARIETIES.find(variety => variety.cropName === inst.cropName) || VARIETIES[0];
    const plan = getProductionPlan(inst.cropName, 'planting');
    const planting = {
      id: generateId('PL'),
      plantCode: generatePlantCode(),
      sourceType: 'seedling',
      sourceId: relatedSeedling ? relatedSeedling.id : '',
      sourceCode: relatedSeedling ? relatedSeedling.seedlingCode : '',
      cropName: inst.cropName,
      cropVariety: inst.cropVariety,
      cropCode: v.cropCode,
      areaId: area.id,
      areaName: area.name,
      rootName: `${area.name}1号棚`,
      plantingCount: config.quantity,
      plantingDate: today(),
      soilPH: 6.5,
      soilEC: 2.0,
      transplantCount: 0,
      transplantDate: '',
      isHarvest: false,
      harvestDate: '',
      attritionRate: config.lossRate,
      printCount: 0,
      traceabilityCode: generateId('TC'),
      pictures: [],
      remarks: '',
      status: 'growing',
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
      instanceId: inst.id,
      orderId: inst.orderId,
      orderCode: inst.orderCode,
      productionPlanId: plan.id,
      productionPlanCode: plan.code,
    };
    plantings.push(planting);

    // 更新实例
    inst.plantedQuantity += config.quantity;
    inst.currentQuantity -= config.quantity;
    inst.plantingDate = planting.plantingDate;
    inst.status = 'growing';
    inst.updateTime = now();
  });
  localStorage.setItem(STORAGE_KEYS.instances, JSON.stringify(instances));
  localStorage.setItem(STORAGE_KEYS.plantings, JSON.stringify(plantings));
  console.log(`  ✅ 已创建 ${plantings.length} 条种植记录`);
  console.log('  ✅ 已更新所有实例的已定植数量和状态');

  // 6. 创建采收
  console.log('');
  console.log('🧺 步骤6：创建6条采收记录（部分实例）');
  const harvests: any[] = [];
  const harvestConfigs = [
    { instanceIndex: 0, quantity: 5000, quality: 'excellent', status: 'stored' },
    { instanceIndex: 1, quantity: 4500, quality: 'good', status: 'stored' },
    { instanceIndex: 2, quantity: 8000, quality: 'excellent', status: 'stored' },
    { instanceIndex: 3, quantity: 7500, quality: 'good', status: 'stored' },
    { instanceIndex: 6, quantity: 3000, quality: 'excellent', status: 'stored' },
    { instanceIndex: 7, quantity: 2800, quality: 'good', status: 'stored' },
  ];

  harvestConfigs.forEach((config) => {
    const inst = instances[config.instanceIndex];
    const relatedPlanting = plantings.find(p => p.instanceId === inst.id);
    const harvest = {
      id: generateId('HV'),
      harvestCode: generateHarvestCode(),
      batchId: generateId('BA'),
      batchCode: `HS${today().replace(/-/g, '')}`,
      instanceId: inst.id,
      orderId: inst.orderId,
      orderCode: inst.orderCode,
      cropCategory: inst.cropCategory,
      cropName: inst.cropName,
      variety: inst.cropVariety,
      greenhouseId: 'G001',
      greenhouseName: '1号大棚',
      harvestDate: today(),
      harvestArea: 1000,
      harvestQuantity: config.quantity,
      unit: '公斤',
      quality: config.quality,
      grade: config.quality === 'excellent' ? 'A' : 'B',
      harvesterIds: ['U001', 'U002'],
      harvesterNames: ['郭靖', '黄蓉'],
      warehouseId: 'W001',
      warehouseName: '冷库1号',
      status: 'stored',
      auditor: '陆启闯',
      plantingMode: '温室种植',
      targetYield: config.quantity * 1.2,
      storageLocation: '冷库1号',
      inboundType: 'planting_harvest',
      productionPlanId: relatedPlanting?.productionPlanId || '',
      productionPlanCode: relatedPlanting?.productionPlanCode || '',
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
    };
    harvests.push(harvest);

    // 更新实例
    inst.harvestedQuantity += config.quantity;
    inst.currentQuantity -= config.quantity;
    inst.harvestDate = harvest.harvestDate;
    if (inst.currentQuantity <= 0) {
      inst.status = 'harvested';
    }
    inst.updateTime = now();
  });
  localStorage.setItem(STORAGE_KEYS.instances, JSON.stringify(instances));
  localStorage.setItem(STORAGE_KEYS.harvestRecords, JSON.stringify(harvests));
  console.log(`  ✅ 已创建 ${harvests.length} 条采收记录`);
  console.log('  ✅ 已更新对应实例的已采收数量');

  // 标记已初始化
  localStorage.setItem('crop_data_initialized', 'v3.1');

  // ============================================
  // 完成
  // ============================================
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🎉 数据初始化完成！');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');
  console.log('📊 数据统计：');
  console.log(`   • 订单: ${orders.length} 条`);
  console.log(`   • 作物实例: ${instances.length} 条`);
  console.log(`   • 种源记录: ${seedSources.length} 条`);
  console.log(`   • 育苗记录: ${seedlings.length} 条`);
  console.log(`   • 种植记录: ${plantings.length} 条`);
  console.log(`   • 采收记录: ${harvests.length} 条`);
}

// ============================================
// 主动初始化函数
// ============================================

/**
 * 强制初始化数据（会先清理旧数据再创建新数据）
 */
export function forceInitData(): void {
  // 清空 localStorage
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.setItem(key, JSON.stringify([]));
  });
  localStorage.removeItem('crop_data_initialized');
  // 初始化
  initData();
}

/**
 * 自动初始化（仅在数据为空时）
 */
export function autoInitializeData(): Promise<void> {
  const initialized = localStorage.getItem('crop_data_initialized');
  if (initialized) {
    console.log('✅ 作物管理模拟数据已初始化，跳过自动初始化');
    return Promise.resolve();
  }
  console.log('🔄 自动初始化作物管理模拟数据...');
  initData();
  return Promise.resolve();
}

/**
 * 重置初始化状态
 */
export function resetInitializationFlag(): void {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.setItem(key, JSON.stringify([]));
  });
  localStorage.removeItem('crop_data_initialized');
  console.log('✅ 已重置数据，可重新初始化');
}
