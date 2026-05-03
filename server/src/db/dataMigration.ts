/**
 * V6.0 数据清洗脚本
 * 将业务表中的字符串字段清洗为ID关联
 *
 * 清洗规则：
 * 1. create_by (字符串) → create_by_id (用户ID)
 * 2. supplier_name (字符串) → supplier_id (供应商ID)
 * 3. warehouse_name (字符串) → warehouse_id (仓库ID)
 * 4. greenhouse_name (字符串) → greenhouse_id (温室ID)
 * 5. worker_name (字符串) → worker_id (工人ID)
 * 6. inspector_name (字符串) → inspector_id (巡查员ID)
 * 7. reporter_name (字符串) → reporter_id (报告人ID)
 * 8. assignee_name (字符串) → assignee_id (指派人ID)
 */

import { getDatabase } from './index';

// 辅助函数：将查询结果转换为对象数组
function queryToArray<T>(result: any[]): T[] {
  if (result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

// 清洗结果类型
interface MigrationResult {
  tableName: string;
  fieldName: string;
  success: number;
  failed: number;
  notFound: string[];
}

/**
 * 获取所有用户列表（用于名称匹配）
 */
interface UserInfo {
  id: string;
  oid: string;
  username: string;
  real_name: string;
}

function getUserList(): UserInfo[] {
  const db = getDatabase();
  const result = db.exec(`
    SELECT id, oid, username, real_name
    FROM users
    WHERE status = 'active'
  `);
  return queryToArray<UserInfo>(result);
}

/**
 * 获取所有仓库列表
 */
interface WarehouseInfo {
  id: string;
  oid: string;
  code: string;
  name: string;
}

function getWarehouseList(): WarehouseInfo[] {
  const db = getDatabase();
  const result = db.exec(`
    SELECT id, oid, code, name
    FROM warehouses
    WHERE status = 'active'
  `);
  return queryToArray<WarehouseInfo>(result);
}

/**
 * 获取所有供应商列表
 */
interface SupplierInfo {
  id: string;
  supplier_code: string;
  supplier_name: string;
}

function getSupplierList(): SupplierInfo[] {
  const db = getDatabase();
  const result = db.exec(`
    SELECT id, supplier_code, supplier_name
    FROM suppliers
    WHERE status = 'active'
  `);
  return queryToArray<SupplierInfo>(result);
}

/**
 * 获取所有温室列表
 */
interface GreenhouseInfo {
  id: string;
  oid: string;
  code: string;
  name: string;
}

function getGreenhouseList(): GreenhouseInfo[] {
  const db = getDatabase();
  const result = db.exec(`
    SELECT id, oid, code, name
    FROM greenhouses
    WHERE status = 'active'
  `);
  return queryToArray<GreenhouseInfo>(result);
}

/**
 * 清洗种源表的createBy（字符串→ID）
 */
export function migrateSeedSourceCreateBy(): MigrationResult {
  const db = getDatabase();
  const tableName = 'seed_sources';
  const fieldName = 'create_by';

  const seedSources = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (seedSources.length === 0 || seedSources[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const users = getUserList();
  const columns = seedSources[0].columns;
  const createByIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of seedSources[0].values) {
    const id = row[idIndex];
    const createBy = row[createByIndex] as string;

    if (!createBy) continue;

    // 优先匹配 real_name，其次匹配 username
    const matched = users.find(u => u.real_name === createBy || u.username === createBy);

    if (matched) {
      db.run(`UPDATE ${tableName} SET create_by_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(createBy);
      console.warn(`[${tableName}] 未匹配到用户: ${createBy}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗种源表的supplierName（字符串→ID）
 */
export function migrateSeedSourceSupplier(): MigrationResult {
  const db = getDatabase();
  const tableName = 'seed_sources';
  const fieldName = 'supplier_name';

  const seedSources = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (seedSources.length === 0 || seedSources[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const suppliers = getSupplierList();
  const columns = seedSources[0].columns;
  const supplierNameIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of seedSources[0].values) {
    const id = row[idIndex];
    const supplierName = row[supplierNameIndex] as string;

    if (!supplierName) continue;

    const matched = suppliers.find(s => s.supplier_name === supplierName);

    if (matched) {
      db.run(`UPDATE ${tableName} SET supplier_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(supplierName);
      console.warn(`[${tableName}] 未匹配到供应商: ${supplierName}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗育苗表的createBy（字符串→ID）
 */
export function migrateSeedlingCreateBy(): MigrationResult {
  const db = getDatabase();
  const tableName = 'seedlings';
  const fieldName = 'create_by';

  const seedlings = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (seedlings.length === 0 || seedlings[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const users = getUserList();
  const columns = seedlings[0].columns;
  const createByIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of seedlings[0].values) {
    const id = row[idIndex];
    const createBy = row[createByIndex] as string;

    if (!createBy) continue;

    const matched = users.find(u => u.real_name === createBy || u.username === createBy);

    if (matched) {
      db.run(`UPDATE ${tableName} SET create_by_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(createBy);
      console.warn(`[${tableName}] 未匹配到用户: ${createBy}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗种植表的createBy（字符串→ID）
 */
export function migratePlantingCreateBy(): MigrationResult {
  const db = getDatabase();
  const tableName = 'plantings';
  const fieldName = 'create_by';

  const plantings = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (plantings.length === 0 || plantings[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const users = getUserList();
  const columns = plantings[0].columns;
  const createByIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of plantings[0].values) {
    const id = row[idIndex];
    const createBy = row[createByIndex] as string;

    if (!createBy) continue;

    const matched = users.find(u => u.real_name === createBy || u.username === createBy);

    if (matched) {
      db.run(`UPDATE ${tableName} SET create_by_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(createBy);
      console.warn(`[${tableName}] 未匹配到用户: ${createBy}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗采收记录表的createBy（字符串→ID）
 */
export function migrateHarvestCreateBy(): MigrationResult {
  const db = getDatabase();
  const tableName = 'harvest_records';
  const fieldName = 'create_by';

  const harvests = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (harvests.length === 0 || harvests[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const users = getUserList();
  const columns = harvests[0].columns;
  const createByIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of harvests[0].values) {
    const id = row[idIndex];
    const createBy = row[createByIndex] as string;

    if (!createBy) continue;

    const matched = users.find(u => u.real_name === createBy || u.username === createBy);

    if (matched) {
      db.run(`UPDATE ${tableName} SET create_by_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(createBy);
      console.warn(`[${tableName}] 未匹配到用户: ${createBy}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗采收记录表的仓库名称（字符串→ID）
 */
export function migrateHarvestWarehouse(): MigrationResult {
  const db = getDatabase();
  const tableName = 'harvest_records';
  const fieldName = 'warehouse_name';

  const harvests = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (harvests.length === 0 || harvests[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const warehouses = getWarehouseList();
  const columns = harvests[0].columns;
  const warehouseNameIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of harvests[0].values) {
    const id = row[idIndex];
    const warehouseName = row[warehouseNameIndex] as string;

    if (!warehouseName) continue;

    const matched = warehouses.find(w => w.name === warehouseName);

    if (matched) {
      db.run(`UPDATE ${tableName} SET warehouse_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(warehouseName);
      console.warn(`[${tableName}] 未匹配到仓库: ${warehouseName}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗供应商表的createBy（字符串→ID）
 */
export function migrateSupplierCreateBy(): MigrationResult {
  const db = getDatabase();
  const tableName = 'suppliers';
  const fieldName = 'create_by';

  const suppliers = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (suppliers.length === 0 || suppliers[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const users = getUserList();
  const columns = suppliers[0].columns;
  const createByIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of suppliers[0].values) {
    const id = row[idIndex];
    const createBy = row[createByIndex] as string;

    if (!createBy) continue;

    const matched = users.find(u => u.real_name === createBy || u.username === createBy);

    if (matched) {
      db.run(`UPDATE ${tableName} SET create_by_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(createBy);
      console.warn(`[${tableName}] 未匹配到用户: ${createBy}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗农事任务表的createBy（字符串→ID）
 */
export function migrateFarmTaskCreateBy(): MigrationResult {
  const db = getDatabase();
  const tableName = 'farm_tasks';
  const fieldName = 'create_by';

  const tasks = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (tasks.length === 0 || tasks[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const users = getUserList();
  const columns = tasks[0].columns;
  const createByIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of tasks[0].values) {
    const id = row[idIndex];
    const createBy = row[createByIndex] as string;

    if (!createBy) continue;

    const matched = users.find(u => u.real_name === createBy || u.username === createBy);

    if (matched) {
      db.run(`UPDATE ${tableName} SET create_by_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(createBy);
      console.warn(`[${tableName}] 未匹配到用户: ${createBy}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗巡查记录表的温室名称（字符串→ID）
 */
export function migrateInspectionGreenhouse(): MigrationResult {
  const db = getDatabase();
  const tableName = 'inspections';
  const fieldName = 'greenhouse_name';

  const inspections = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (inspections.length === 0 || inspections[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const greenhouses = getGreenhouseList();
  const columns = inspections[0].columns;
  const greenhouseNameIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of inspections[0].values) {
    const id = row[idIndex];
    const greenhouseName = row[greenhouseNameIndex] as string;

    if (!greenhouseName) continue;

    const matched = greenhouses.find(g => g.name === greenhouseName);

    if (matched) {
      db.run(`UPDATE ${tableName} SET greenhouse_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(greenhouseName);
      console.warn(`[${tableName}] 未匹配到温室: ${greenhouseName}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗问题记录表的温室名称（字符串→ID）
 */
export function migrateProblemGreenhouse(): MigrationResult {
  const db = getDatabase();
  const tableName = 'problems';
  const fieldName = 'greenhouse_name';

  const problems = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (problems.length === 0 || problems[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const greenhouses = getGreenhouseList();
  const columns = problems[0].columns;
  const greenhouseNameIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of problems[0].values) {
    const id = row[idIndex];
    const greenhouseName = row[greenhouseNameIndex] as string;

    if (!greenhouseName) continue;

    const matched = greenhouses.find(g => g.name === greenhouseName);

    if (matched) {
      db.run(`UPDATE ${tableName} SET greenhouse_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(greenhouseName);
      console.warn(`[${tableName}] 未匹配到温室: ${greenhouseName}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗人工记录表的工人名称（字符串→ID）
 */
export function migrateLaborWorker(): MigrationResult {
  const db = getDatabase();
  const tableName = 'labor_records';
  const fieldName = 'worker_name';

  const records = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (records.length === 0 || records[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const users = getUserList();
  const columns = records[0].columns;
  const workerNameIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of records[0].values) {
    const id = row[idIndex];
    const workerName = row[workerNameIndex] as string;

    if (!workerName) continue;

    const matched = users.find(u => u.real_name === workerName || u.username === workerName);

    if (matched) {
      db.run(`UPDATE ${tableName} SET worker_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(workerName);
      console.warn(`[${tableName}] 未匹配到工人: ${workerName}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗作物实例表的createBy（字符串→ID）
 */
export function migrateCropInstanceCreateBy(): MigrationResult {
  const db = getDatabase();
  const tableName = 'crop_instances';
  const fieldName = 'create_by';

  const instances = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (instances.length === 0 || instances[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const users = getUserList();
  const columns = instances[0].columns;
  const createByIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of instances[0].values) {
    const id = row[idIndex];
    const createBy = row[createByIndex] as string;

    if (!createBy) continue;

    const matched = users.find(u => u.real_name === createBy || u.username === createBy);

    if (matched) {
      db.run(`UPDATE ${tableName} SET create_by_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(createBy);
      console.warn(`[${tableName}] 未匹配到用户: ${createBy}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 清洗库存表的createBy（字符串→ID）
 */
export function migrateInventoryCreateBy(): MigrationResult {
  const db = getDatabase();
  const tableName = 'inventory';
  const fieldName = 'create_by';

  const inventories = db.exec(`SELECT id, ${fieldName} FROM ${tableName} WHERE ${fieldName} IS NOT NULL AND ${fieldName} != ''`);
  if (inventories.length === 0 || inventories[0].values.length === 0) {
    console.log(`[${tableName}] ${fieldName}为空或无数据，跳过清洗`);
    return { tableName, fieldName, success: 0, failed: 0, notFound: [] };
  }

  const users = getUserList();
  const columns = inventories[0].columns;
  const createByIndex = columns.indexOf(fieldName);
  const idIndex = columns.indexOf('id');

  let success = 0;
  let failed = 0;
  const notFound: string[] = [];

  for (const row of inventories[0].values) {
    const id = row[idIndex];
    const createBy = row[createByIndex] as string;

    if (!createBy) continue;

    const matched = users.find(u => u.real_name === createBy || u.username === createBy);

    if (matched) {
      db.run(`UPDATE ${tableName} SET create_by_id = ? WHERE id = ?`, [matched.id, id]);
      success++;
    } else {
      failed++;
      notFound.push(createBy);
      console.warn(`[${tableName}] 未匹配到用户: ${createBy}`);
    }
  }

  console.log(`[${tableName}] ${fieldName}清洗完成: 成功${success}, 失败${failed}`);
  return { tableName, fieldName, success, failed, notFound };
}

/**
 * 执行所有数据清洗
 */
export function runAllMigrations(): { success: boolean; results: MigrationResult[] } {
  console.log('========== 开始数据清洗 ==========');
  console.log('清洗规则：将业务表中的字符串字段清洗为ID关联\n');

  const results: MigrationResult[] = [];

  try {
    // 1. 种源表清洗
    results.push(migrateSeedSourceCreateBy());
    results.push(migrateSeedSourceSupplier());

    // 2. 育苗表清洗
    results.push(migrateSeedlingCreateBy());

    // 3. 种植表清洗
    results.push(migratePlantingCreateBy());

    // 4. 采收记录表清洗
    results.push(migrateHarvestCreateBy());
    results.push(migrateHarvestWarehouse());

    // 5. 供应商表清洗
    results.push(migrateSupplierCreateBy());

    // 6. 农事任务表清洗
    results.push(migrateFarmTaskCreateBy());

    // 7. 巡查记录表清洗
    results.push(migrateInspectionGreenhouse());

    // 8. 问题记录表清洗
    results.push(migrateProblemGreenhouse());

    // 9. 人工记录表清洗
    results.push(migrateLaborWorker());

    // 10. 作物实例表清洗
    results.push(migrateCropInstanceCreateBy());

    // 11. 库存表清洗
    results.push(migrateInventoryCreateBy());

    // 汇总统计
    const totalSuccess = results.reduce((sum, r) => sum + r.success, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    console.log('\n========== 数据清洗完成 ==========');
    console.log(`总计：成功 ${totalSuccess} 条，失败 ${totalFailed} 条`);

    // 输出失败详情
    const failures = results.filter(r => r.failed > 0);
    if (failures.length > 0) {
      console.log('\n失败详情：');
      failures.forEach(f => {
        console.log(`  - [${f.tableName}] ${f.fieldName}: 未匹配到 ${f.notFound.join(', ')}`);
      });
    }

    return { success: true, results };
  } catch (error) {
    console.error('数据清洗失败:', error);
    return { success: false, results };
  }
}

export default {
  // 单个清洗函数
  migrateSeedSourceCreateBy,
  migrateSeedSourceSupplier,
  migrateSeedlingCreateBy,
  migratePlantingCreateBy,
  migrateHarvestCreateBy,
  migrateHarvestWarehouse,
  migrateSupplierCreateBy,
  migrateFarmTaskCreateBy,
  migrateInspectionGreenhouse,
  migrateProblemGreenhouse,
  migrateLaborWorker,
  migrateCropInstanceCreateBy,
  migrateInventoryCreateBy,
  // 批量清洗
  runAllMigrations,
};
