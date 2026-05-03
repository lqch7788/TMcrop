/**
 * V5.0 Phase 2: 数据清洗脚本
 * 将业务表中的字符串字段清洗为ID关联
 */

import { getDatabase } from './index';

/**
 * 获取所有员工列表（用于名称匹配）
 */
function getStaffList() {
  const db = getDatabase();
  const result = db.exec(`
    SELECT id, oid, code, name, department_oid, department_name
    FROM departments
    WHERE status = 'active'
  `);

  // 也需要从其他可能的员工表中获取，这里假设员工数据在departments表中
  // 实际可能需要从其他表如 staff, employees 等获取
  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * 获取所有仓库列表
 */
function getWarehouseList() {
  const db = getDatabase();
  const result = db.exec(`
    SELECT id, oid, code, name
    FROM warehouses
    WHERE status = 'active'
  `);

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * 获取所有供应商列表
 */
function getSupplierList() {
  const db = getDatabase();
  const result = db.exec(`
    SELECT id, supplier_code, supplier_name
    FROM suppliers
    WHERE status = 'active'
  `);

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * 获取所有温室列表
 */
function getGreenhouseList() {
  const db = getDatabase();
  const result = db.exec(`
    SELECT id, oid, code, name
    FROM greenhouses
    WHERE status = 'active'
  `);

  if (result.length === 0) return [];

  const columns = result[0].columns;
  return result[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => {
      obj[col] = row[i];
    });
    return obj;
  });
}

/**
 * 清洗种源表的createBy（字符串→ID）
 */
export async function migrateSeedSourceCreateBy() {
  const db = getDatabase();

  // 获取种源数据
  const seedSources = db.exec('SELECT id, create_by FROM seed_sources');
  if (seedSources.length === 0) {
    console.log('种源表为空，跳过清洗');
    return { success: true, message: '种源表为空' };
  }

  // 获取员工数据（假设员工名称存储在departments表的manager_name或name中）
  // 实际需要根据实际员工表结构调整
  const staffList = getStaffList();

  const columns = seedSources[0].columns;
  const createByIndex = columns.indexOf('create_by');
  const idIndex = columns.indexOf('id');

  let migrated = 0;
  let failed = 0;

  for (const row of seedSources[0].values) {
    const id = row[idIndex];
    const createBy = row[createByIndex];

    if (!createBy) continue;

    // 尝试匹配员工（通过名称模糊匹配）
    // 实际实现可能需要更复杂的匹配逻辑
    let matchedId: string | null = null;

    for (const staff of staffList) {
      if (staff.name === createBy || staff.manager_name === createBy) {
        matchedId = staff.id;
        break;
      }
    }

    if (matchedId) {
      db.run('UPDATE seed_sources SET create_by_id = ? WHERE id = ?', [matchedId, id]);
      migrated++;
    } else {
      failed++;
      console.warn(`未匹配到员工: ${createBy}`);
    }
  }

  console.log(`种源表createBy清洗完成: 成功${migrated}, 失败${failed}`);
  return { success: true, migrated, failed };
}

/**
 * 清洗种源表的supplierName（字符串→ID）
 */
export async function migrateSeedSourceSupplier() {
  const db = getDatabase();

  const seedSources = db.exec('SELECT id, supplier_name FROM seed_sources');
  if (seedSources.length === 0) {
    console.log('种源表为空，跳过清洗');
    return { success: true, message: '种源表为空' };
  }

  const suppliers = getSupplierList();

  const columns = seedSources[0].columns;
  const supplierNameIndex = columns.indexOf('supplier_name');
  const idIndex = columns.indexOf('id');

  let migrated = 0;
  let failed = 0;

  for (const row of seedSources[0].values) {
    const id = row[idIndex];
    const supplierName = row[supplierNameIndex];

    if (!supplierName) continue;

    const matched = suppliers.find(s => s.supplier_name === supplierName);

    if (matched) {
      db.run('UPDATE seed_sources SET supplier_id = ? WHERE id = ?', [matched.id, id]);
      migrated++;
    } else {
      failed++;
      console.warn(`未匹配到供应商: ${supplierName}`);
    }
  }

  console.log(`种源表supplierName清洗完成: 成功${migrated}, 失败${failed}`);
  return { success: true, migrated, failed };
}

/**
 * 清洗采收记录的仓库名称（字符串→ID）
 */
export async function migrateHarvestWarehouse() {
  const db = getDatabase();

  const harvests = db.exec('SELECT id, warehouse_name FROM harvest_records WHERE warehouse_name IS NOT NULL');
  if (harvests.length === 0) {
    console.log('采收记录表为空或无仓库信息，跳过清洗');
    return { success: true, message: '采收记录表为空' };
  }

  const warehouses = getWarehouseList();

  const columns = harvests[0].columns;
  const warehouseNameIndex = columns.indexOf('warehouse_name');
  const idIndex = columns.indexOf('id');

  let migrated = 0;
  let failed = 0;

  for (const row of harvests[0].values) {
    const id = row[idIndex];
    const warehouseName = row[warehouseNameIndex];

    if (!warehouseName) continue;

    const matched = warehouses.find(w => w.name === warehouseName);

    if (matched) {
      db.run('UPDATE harvest_records SET warehouse_id = ? WHERE id = ?', [matched.id, id]);
      migrated++;
    } else {
      failed++;
      console.warn(`未匹配到仓库: ${warehouseName}`);
    }
  }

  console.log(`采收记录表warehouseName清洗完成: 成功${migrated}, 失败${failed}`);
  return { success: true, migrated, failed };
}

/**
 * 清洗采收记录的采收人名称（字符串→ID数组）
 */
export async function migrateHarvestHarvesters() {
  const db = getDatabase();

  const harvests = db.exec('SELECT id, harvester_names FROM harvest_records WHERE harvester_names IS NOT NULL');
  if (harvests.length === 0) {
    console.log('采收记录表为空或无采收人信息，跳过清洗');
    return { success: true, message: '采收记录表为空' };
  }

  const staffList = getStaffList();

  const columns = harvests[0].columns;
  const harvesterNamesIndex = columns.indexOf('harvester_names');
  const idIndex = columns.indexOf('id');

  let migrated = 0;
  let failed = 0;

  for (const row of harvests[0].values) {
    const id = row[idIndex];
    let harvesterNames: string | string[] | null = row[harvesterNamesIndex] as string | null;

    if (!harvesterNames) continue;

    // 解析JSON数组
    try {
      if (typeof harvesterNames === 'string') {
        harvesterNames = JSON.parse(harvesterNames);
      }
    } catch (e) {
      // 如果不是JSON，尝试作为单个名称处理
      harvesterNames = [harvesterNames as string];
    }

    if (!Array.isArray(harvesterNames)) {
      harvesterNames = [harvesterNames as string];
    }

    const matchedIds: string[] = [];

    for (const name of harvesterNames) {
      const matched = staffList.find(s => s.name === name || s.manager_name === name);
      if (matched) {
        matchedIds.push(matched.id);
      }
    }

    if (matchedIds.length > 0) {
      db.run('UPDATE harvest_records SET harvester_ids = ? WHERE id = ?', [JSON.stringify(matchedIds), id]);
      migrated++;
    } else {
      failed++;
      console.warn(`未匹配到采收人: ${harvesterNames.join(', ')}`);
    }
  }

  console.log(`采收记录表harvesterNames清洗完成: 成功${migrated}, 失败${failed}`);
  return { success: true, migrated, failed };
}

/**
 * 清洗巡查记录的温室名称（字符串→ID）
 */
export async function migrateInspectionGreenhouse() {
  const db = getDatabase();

  const inspections = db.exec('SELECT id, greenhouse_name FROM inspections WHERE greenhouse_name IS NOT NULL');
  if (inspections.length === 0) {
    console.log('巡查记录表为空或无温室信息，跳过清洗');
    return { success: true, message: '巡查记录表为空' };
  }

  const greenhouses = getGreenhouseList();

  const columns = inspections[0].columns;
  const greenhouseNameIndex = columns.indexOf('greenhouse_name');
  const idIndex = columns.indexOf('id');

  let migrated = 0;
  let failed = 0;

  for (const row of inspections[0].values) {
    const id = row[idIndex];
    const greenhouseName = row[greenhouseNameIndex];

    if (!greenhouseName) continue;

    const matched = greenhouses.find(g => g.name === greenhouseName);

    if (matched) {
      db.run('UPDATE inspections SET greenhouse_id = ? WHERE id = ?', [matched.id, id]);
      migrated++;
    } else {
      failed++;
      console.warn(`未匹配到温室: ${greenhouseName}`);
    }
  }

  console.log(`巡查记录表greenhouseName清洗完成: 成功${migrated}, 失败${failed}`);
  return { success: true, migrated, failed };
}

/**
 * 清洗问题记录的温室名称（字符串→ID）
 */
export async function migrateProblemGreenhouse() {
  const db = getDatabase();

  const problems = db.exec('SELECT id, greenhouse_name FROM problems WHERE greenhouse_name IS NOT NULL');
  if (problems.length === 0) {
    console.log('问题记录表为空或无温室信息，跳过清洗');
    return { success: true, message: '问题记录表为空' };
  }

  const greenhouses = getGreenhouseList();

  const columns = problems[0].columns;
  const greenhouseNameIndex = columns.indexOf('greenhouse_name');
  const idIndex = columns.indexOf('id');

  let migrated = 0;
  let failed = 0;

  for (const row of problems[0].values) {
    const id = row[idIndex];
    const greenhouseName = row[greenhouseNameIndex];

    if (!greenhouseName) continue;

    const matched = greenhouses.find(g => g.name === greenhouseName);

    if (matched) {
      db.run('UPDATE problems SET greenhouse_id = ? WHERE id = ?', [matched.id, id]);
      migrated++;
    } else {
      failed++;
      console.warn(`未匹配到温室: ${greenhouseName}`);
    }
  }

  console.log(`问题记录表greenhouseName清洗完成: 成功${migrated}, 失败${failed}`);
  return { success: true, migrated, failed };
}

/**
 * 执行所有数据清洗
 */
export async function runAllMigrations() {
  console.log('========== 开始数据清洗 ==========');

  try {
    await migrateSeedSourceCreateBy();
    await migrateSeedSourceSupplier();
    await migrateHarvestWarehouse();
    await migrateHarvestHarvesters();
    await migrateInspectionGreenhouse();
    await migrateProblemGreenhouse();

    console.log('========== 数据清洗完成 ==========');
    return { success: true };
  } catch (error) {
    console.error('数据清洗失败:', error);
    return { success: false, error };
  }
}

export default {
  migrateSeedSourceCreateBy,
  migrateSeedSourceSupplier,
  migrateHarvestWarehouse,
  migrateHarvestHarvesters,
  migrateInspectionGreenhouse,
  migrateProblemGreenhouse,
  runAllMigrations,
};
