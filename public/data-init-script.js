/**
 * 作物管理模块数据流转验证 - 数据初始化脚本
 *
 * 使用方法：
 * 1. 在浏览器中打开 V1.1 系统
 * 2. 打开开发者工具 (F12) -> Console
 * 3. 复制本脚本的全部代码到控制台执行
 * 4. 执行完毕后刷新页面查看数据
 *
 * 功能：
 * - 一键初始化测试数据（6订单+12实例+24种源+12育苗+12种植+6采收）
 * - 可以多次运行，每次会先清理旧数据再创建新数据
 *
 * 版本：v1.2（修复采收数据字段完整性）
 * 生成时间：2026-05-01
 */

// ============================================
// 配置
// ============================================

// 是否在创建前清理现有数据
const CLEAN_BEFORE_INIT = true;

// 品种配置
const VARIETIES = [
  { cropName: '红果番茄', cropCode: 'PD0301004001', category: '蔬菜类', variety: '红果番茄' },
  { cropName: '水果黄瓜', cropCode: 'PD0201001001', category: '蔬菜类', variety: '水果黄瓜' },
  { cropName: '散叶生菜', cropCode: 'PD0102001001', category: '蔬菜类', variety: '散叶生菜' },
  { cropName: '红颜草莓', cropCode: 'FR0101001001', category: '水果类', variety: '红颜' },
  { cropName: '紫长茄子', cropCode: 'PD0303001001', category: '蔬菜类', variety: '紫长茄子' },
  { cropName: '红尖椒', cropCode: 'PD0304006001', category: '蔬菜类', variety: '尖椒' },
];

// 场地配置
const SITES = [
  { id: 'G001', name: '玻璃温室A区' },
  { id: 'G002', name: '玻璃温室B区' },
  { id: 'SITE001', name: '育苗温室A区' },
  { id: 'SITE002', name: '育苗温室B区' },
];

// ============================================
// 工具函数
// ============================================

function generateId(prefix) {
  return `${prefix}${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
}

function now() {
  return new Date().toLocaleString('zh-CN');
}

function generateOrderCode() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  return `DD${dateStr}${String(Math.floor(Math.random() * 900) + 100)}`;
}

function generateInstanceCode(cropCode) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth()+1).padStart(2,'0');
  const day = String(now.getDate()).padStart(2,'0');
  return `${cropCode}${year}${month}${day}${String(Math.floor(Math.random() * 900) + 100)}`;
}

function generateSeedCode() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  return `ZZ${dateStr}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function generateSeedlingCode() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  return `YM${dateStr}-${String(Math.floor(Math.random() * 900) + 100)}`;
}

function generatePlantCode() {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth()+1).padStart(2,'0');
  return `ZZ20${year}${month}-${String(Math.floor(Math.random() * 90) + 10)}`;
}

function generateHarvestCode() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}`;
  return `HS${dateStr}${String(Math.floor(Math.random() * 900) + 100)}`;
}

// ============================================
// 清理函数
// ============================================

function cleanData() {
  console.log('🧹 清理现有数据...');
  localStorage.setItem('crop_orders', JSON.stringify([]));
  localStorage.setItem('crop_instances', JSON.stringify([]));
  localStorage.setItem('crop_seed_sources', JSON.stringify([]));
  localStorage.setItem('crop_seedlings', JSON.stringify([]));
  localStorage.setItem('crop_plantings', JSON.stringify([]));
  localStorage.setItem('harvest_records', JSON.stringify([]));
  console.log('  ✅ 清理完成');
}

// ============================================
// 主函数
// ============================================

function initData() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🚀 作物管理模块数据初始化');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('');

  // 1. 清理旧数据
  if (CLEAN_BEFORE_INIT) {
    cleanData();
    console.log('');
  }

  // 2. 创建订单
  console.log('📋 步骤1：创建6个订单');
  const orders = [
    { name: '番茄生产订单A', cropIndex: 0, quantity: 50000, customer: '客户A' },
    { name: '黄瓜生产订单A', cropIndex: 1, quantity: 40000, customer: '客户B' },
    { name: '生菜生产订单A', cropIndex: 2, quantity: 30000, customer: '客户C' },
    { name: '草莓生产订单A', cropIndex: 3, quantity: 15000, customer: '客户D' },
    { name: '茄子生产订单A', cropIndex: 4, quantity: 25000, customer: '客户E' },
    { name: '辣椒生产订单A', cropIndex: 5, quantity: 20000, customer: '客户F' },
  ].map((data, i) => {
    const v = VARIETIES[data.cropIndex];
    return {
      id: generateId('OR'),
      orderCode: generateOrderCode(),
      orderType: 'production',
      orderName: data.name,
      cropCategory: v.category,
      cropName: v.cropName,
      cropVariety: v.variety,
      plannedQuantity: data.quantity,
      actualQuantity: 0,
      unit: '株',
      customer: data.customer,
      status: 'planned',
      instanceIds: [],
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
    };
  });
  localStorage.setItem('crop_orders', JSON.stringify(orders));
  console.log(`  ✅ 已创建 ${orders.length} 个订单`);
  orders.forEach(o => console.log(`     - ${o.orderCode}: ${o.orderName}`));

  // 3. 创建实例
  console.log('');
  console.log('🌱 步骤2：创建12个作物实例（每个订单2个）');
  const instances = [];
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

  instanceConfigs.forEach((config, i) => {
    const v = VARIETIES[config.cropIndex];
    const order = orders[config.orderIndex];
    const instance = {
      id: generateId('CI'),
      instanceCode: generateInstanceCode(v.cropCode),
      orderId: order.id,
      orderCode: order.orderCode,
      cropCategory: v.category,
      cropName: v.cropName,
      cropVariety: v.variety,
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
  localStorage.setItem('crop_orders', JSON.stringify(orders));
  localStorage.setItem('crop_instances', JSON.stringify(instances));
  console.log(`  ✅ 已创建 ${instances.length} 个实例`);
  console.log('     关联到订单：');
  orders.forEach(o => console.log(`     - ${o.orderCode}: ${o.instanceIds.length}个实例`));

  // 4. 创建种源
  console.log('');
  console.log('🌿 步骤3：创建24条种源（每个实例2条）');
  const seedSources = [];
  const seedConfigs = [
    { instanceIndex: 0, supplier: '供应商A', quantity: 13000 },
    { instanceIndex: 0, supplier: '供应商A', quantity: 12000 },
    { instanceIndex: 1, supplier: '供应商A', quantity: 13000 },
    { instanceIndex: 1, supplier: '供应商A', quantity: 12000 },
    { instanceIndex: 2, supplier: '供应商B', quantity: 10000 },
    { instanceIndex: 2, supplier: '供应商B', quantity: 10000 },
    { instanceIndex: 3, supplier: '供应商B', quantity: 10000 },
    { instanceIndex: 3, supplier: '供应商B', quantity: 10000 },
    { instanceIndex: 4, supplier: '供应商C', quantity: 8000 },
    { instanceIndex: 4, supplier: '供应商C', quantity: 7000 },
    { instanceIndex: 5, supplier: '供应商C', quantity: 8000 },
    { instanceIndex: 5, supplier: '供应商C', quantity: 7000 },
    { instanceIndex: 6, supplier: '供应商D', quantity: 4000 },
    { instanceIndex: 6, supplier: '供应商D', quantity: 3500 },
    { instanceIndex: 7, supplier: '供应商D', quantity: 4000 },
    { instanceIndex: 7, supplier: '供应商D', quantity: 3500 },
    { instanceIndex: 8, supplier: '供应商E', quantity: 6500 },
    { instanceIndex: 8, supplier: '供应商E', quantity: 6000 },
    { instanceIndex: 9, supplier: '供应商E', quantity: 6500 },
    { instanceIndex: 9, supplier: '供应商E', quantity: 6000 },
    { instanceIndex: 10, supplier: '供应商F', quantity: 5500 },
    { instanceIndex: 10, supplier: '供应商F', quantity: 4500 },
    { instanceIndex: 11, supplier: '供应商F', quantity: 5500 },
    { instanceIndex: 11, supplier: '供应商F', quantity: 4500 },
  ];

  seedConfigs.forEach((config) => {
    const inst = instances[config.instanceIndex];
    const seedSource = {
      id: generateId('SS'),
      seedCode: generateSeedCode(),
      sourceType: 'seed',
      sourceOrigin: 'external_purchase',
      cropCategory: inst.cropCategory,
      cropName: inst.cropName,
      cropVariety: inst.cropVariety,
      supplierName: config.supplier,
      purchaseDate: new Date().toISOString().slice(0, 10),
      purchaseQuantity: config.quantity,
      initialCount: config.quantity,
      availableCount: config.quantity,
      lossCount: 0,
      unit: '株',
      instanceId: inst.id,
      orderId: inst.orderId,
      orderCode: inst.orderCode,
      status: 'in_stock',
      printRecords: [],
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
    };
    seedSources.push(seedSource);
  });
  localStorage.setItem('crop_seed_sources', JSON.stringify(seedSources));
  console.log(`  ✅ 已创建 ${seedSources.length} 条种源记录`);

  // 5. 创建育苗
  console.log('');
  console.log('🌾 步骤4：创建12条育苗记录（每个实例1条）');
  const seedlings = [];
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
    const seedling = {
      id: generateId('SD'),
      seedlingCode: generateSeedlingCode(),
      sourceId: relatedSeed ? relatedSeed.id : '',
      instanceId: inst.id,
      orderId: inst.orderId,
      orderCode: inst.orderCode,
      cropCategory: inst.cropCategory,
      cropName: inst.cropName,
      cropVariety: inst.cropVariety,
      siteId: site.id,
      siteName: site.name,
      sourceCode: inst.sourceOrigin === 'internal_seed' ? inst.sourceCode : '',
      sourceOrigin: inst.sourceOrigin,
      initialCount: config.initial,
      survivalCount: config.survival,
      lossCount: config.loss,
      remainingCount: config.survival,
      survivalRate: Math.round((config.survival / config.initial) * 100),
      lossRate: Math.round((config.loss / config.initial) * 100),
      startDate: new Date().toISOString().slice(0, 10),
      endDate: '',
      status: 'in_progress',
      dailyRecords: [],
      transplantRecords: [],
      printRecords: [],
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
    };
    seedlings.push(seedling);
  });
  localStorage.setItem('crop_seedlings', JSON.stringify(seedlings));
  console.log(`  ✅ 已创建 ${seedlings.length} 条育苗记录`);

  // 6. 创建种植（代表定植）
  console.log('');
  console.log('🌍 步骤5：创建12条种植记录（每个实例1条）');
  const plantings = [];
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
    const planting = {
      id: generateId('PL'),
      plantCode: generatePlantCode(),
      sourceType: 'seedling',
      sourceId: relatedSeedling ? relatedSeedling.id : '',
      instanceId: inst.id,
      orderId: inst.orderId,
      orderCode: inst.orderCode,
      cropCategory: inst.cropCategory,
      cropName: inst.cropName,
      cropVariety: inst.cropVariety,
      areaId: area.id,
      areaName: area.name,
      plantingDate: new Date().toISOString().slice(0, 10),
      plantingCount: config.quantity,
      lossRate: config.lossRate,
      lossCount: Math.round(config.quantity * config.lossRate / 100),
      survivalCount: config.quantity - Math.round(config.quantity * config.lossRate / 100),
      status: 'growing',
      harvestRecords: [],
      printRecords: [],
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
    };
    plantings.push(planting);

    // 更新实例：定植数量增加
    inst.plantedQuantity += config.quantity;
    inst.currentQuantity -= config.quantity;
    inst.plantingDate = planting.plantingDate;
    inst.status = 'growing';
    inst.updateTime = now();
  });
  localStorage.setItem('crop_instances', JSON.stringify(instances));
  localStorage.setItem('crop_plantings', JSON.stringify(plantings));
  console.log(`  ✅ 已创建 ${plantings.length} 条种植记录`);
  console.log('  ✅ 已更新所有实例的已定植数量和状态');

  // 7. 创建采收
  console.log('');
  console.log('🧺 步骤6：创建6条采收记录（部分实例）');
  const harvests = [];
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
    const harvest = {
      id: generateId('HV'),
      harvestCode: generateHarvestCode(),
      batchId: generateId('BA'),
      batchCode: `HS${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`,
      instanceId: inst.id,
      orderId: inst.orderId,
      orderCode: inst.orderCode,
      cropCategory: inst.cropCategory,
      cropName: inst.cropName,
      variety: inst.cropVariety,
      greenhouseId: 'G001',
      greenhouseName: '1号大棚',
      harvestDate: new Date().toISOString().slice(0, 10),
      harvestArea: 1000,
      harvestQuantity: config.quantity,
      unit: '公斤',
      quality: config.quality,
      grade: config.quality === 'excellent' ? 'A' : 'B',
      harvesterIds: ['U001', 'U002'],
      harvesterNames: ['张三', '李四'],
      warehouseId: 'W001',
      warehouseName: '冷库1号',
      status: 'stored',
      auditor: '陆启闯',
      plantingMode: '温室种植',
      targetYield: config.quantity * 1.2,
      storageLocation: '冷库1号',
      createBy: '陆启闯',
      createTime: now(),
      updateTime: now(),
    };
    harvests.push(harvest);

    // 更新实例：采收数量增加
    inst.harvestedQuantity += config.quantity;
    inst.currentQuantity -= config.quantity;
    inst.harvestDate = harvest.harvestDate;
    if (inst.currentQuantity <= 0) {
      inst.status = 'harvested';
    }
    inst.updateTime = now();
  });
  localStorage.setItem('crop_instances', JSON.stringify(instances));
  localStorage.setItem('harvest_records', JSON.stringify(harvests));
  console.log(`  ✅ 已创建 ${harvests.length} 条采收记录`);
  console.log('  ✅ 已更新对应实例的已采收数量');

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
  console.log('');
  console.log('📝 下一步操作：');
  console.log('   1. 刷新页面查看数据');
  console.log('   2. 前往"订单管理"查看6个订单');
  console.log('   3. 前往"实例追溯"页面，点击实例查看完整溯源链');
  console.log('   4. 验证溯源链包含：订单、种源、育苗、种植、采收');
  console.log('');
  console.log('🔄 如需重新初始化：');
  console.log('   再次执行本脚本即可（会先清理旧数据）');
  console.log('');
  console.log('🔍 验证公式（初始 - 已定植 - 已采收 = 当前剩余）：');
  console.log('');
  instances.forEach((inst, i) => {
    const expected = inst.initialQuantity - inst.plantedQuantity - inst.harvestedQuantity;
    const actual = inst.currentQuantity;
    const status = expected === actual ? '✅' : '❌';
    console.log(`   ${status} ${inst.cropName}实例${i+1}: ${inst.initialQuantity} - ${inst.plantedQuantity} - ${inst.harvestedQuantity} = ${expected} (实际: ${actual})`);
  });
}

// 执行初始化
initData();
