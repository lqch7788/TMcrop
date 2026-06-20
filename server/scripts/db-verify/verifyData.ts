/**
 * 数据迁移验证脚本
 * 用于验证数据库数据的完整性、一致性和溯源链
 *
 * 功能：
 * 1. 数据完整性验证 - 验证各表记录数、必填字段、外键关联
 * 2. 数据一致性验证 - 验证表间数据关联、数量守恒
 * 3. 溯源链验证 - 验证采收→种植→育苗→种源 链条
 * 4. 统计报告 - 生成数据迁移报告
 */

import { getDatabase } from './index';

// ========== 类型定义 ==========

/** 验证问题级别 */
type ProblemLevel = 'error' | 'warning' | 'info';

/** 验证问题 */
interface VerificationProblem {
  table: string;
  field?: string;
  recordId?: string;
  level: ProblemLevel;
  message: string;
  code: string;
}

/** 模块验证结果 */
interface ModuleVerification {
  moduleName: string;
  passed: boolean;
  recordCount: number;
  problems: VerificationProblem[];
  warnings: number;
  errors: number;
}

/** 完整性验证结果 */
interface IntegrityVerification {
  tableName: string;
  totalRecords: number;
  problems: VerificationProblem[];
}

/** 一致性验证结果 */
interface ConsistencyVerification {
  checkName: string;
  passed: boolean;
  details: string;
  problems: VerificationProblem[];
}

/** 溯源链验证结果 */
interface TraceabilityVerification {
  recordId: string;
  recordCode: string;
  chain: {
    level: number;
    table: string;
    recordId: string;
    recordCode: string;
    found: boolean;
  }[];
  passed: boolean;
  problems: VerificationProblem[];
}

/** 完整验证报告 */
interface VerificationReport {
  timestamp: string;
  overallPassed: boolean;
  summary: {
    totalTables: number;
    totalRecords: number;
    totalProblems: number;
    errors: number;
    warnings: number;
    infos: number;
  };
  integrityResults: IntegrityVerification[];
  consistencyResults: ConsistencyVerification[];
  traceabilityResults: TraceabilityVerification[];
  moduleResults: ModuleVerification[];
  allProblems: VerificationProblem[];
}

// ========== 辅助函数 ==========

/**
 * 将查询结果转换为对象数组
 */
function queryToArray<T>(result: any[]): T[] {
  if (!result || result.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => {
      obj[col] = row[i];
    });
    return obj as T;
  });
}

/**
 * 获取表的所有记录
 */
function getAllRecords(tableName: string): any[] {
  const db = getDatabase();
  const result = db.exec(`SELECT * FROM ${tableName}`);
  return queryToArray<any>(result);
}

/**
 * 获取表记录数
 */
function getRecordCount(tableName: string): number {
  const db = getDatabase();
  const result = db.exec(`SELECT COUNT(*) as count FROM ${tableName}`);
  if (result.length === 0) return 0;
  return result[0].values[0][0] as number;
}

/**
 * 获取表的所有列
 */
function getTableColumns(tableName: string): string[] {
  const db = getDatabase();
  const result = db.exec(`PRAGMA table_info(${tableName})`);
  return queryToArray<any>(result).map((col: any) => col.name);
}

/**
 * 添加问题
 */
function addProblem(
  problems: VerificationProblem[],
  level: ProblemLevel,
  table: string,
  message: string,
  code: string,
  field?: string,
  recordId?: string
): void {
  problems.push({
    table,
    field,
    recordId,
    level,
    message,
    code,
  });
}

// ========== 1. 数据完整性验证 ==========

/**
 * 验证表是否存在
 */
function verifyTableExists(tableName: string): boolean {
  const db = getDatabase();
  const result = db.exec(`
    SELECT name FROM sqlite_master
    WHERE type='table' AND name='${tableName}'
  `);
  return result.length > 0 && result[0].values.length > 0;
}

/**
 * 验证必填字段
 */
function verifyRequiredFields(
  tableName: string,
  requiredFields: string[]
): VerificationProblem[] {
  const problems: VerificationProblem[] = [];
  const records = getAllRecords(tableName);

  records.forEach((record: any) => {
    requiredFields.forEach((field) => {
      const value = record[field];
      if (value === null || value === undefined || value === '') {
        addProblem(
          problems,
          'error',
          tableName,
          `必填字段 "${field}" 为空或缺失`,
          'REQUIRED_FIELD_EMPTY',
          field,
          record.id || record.oid || record.code
        );
      }
    });
  });

  return problems;
}

/**
 * 验证外键关联
 */
function verifyForeignKey(
  tableName: string,
  foreignKeyField: string,
  referencedTable: string,
  referencedField: string = 'id'
): VerificationProblem[] {
  const problems: VerificationProblem[] = [];
  const records = getAllRecords(tableName);
  const referencedRecords = getAllRecords(referencedTable);
  const validIds = new Set(referencedRecords.map((r: any) => r[referencedField]));

  records.forEach((record: any) => {
    const fkValue = record[foreignKeyField];
    if (fkValue && !validIds.has(fkValue)) {
      addProblem(
        problems,
        'error',
        tableName,
        `外键 "${foreignKeyField}" 的值 "${fkValue}" 在表 "${referencedTable}" 中不存在`,
        'FOREIGN_KEY_INVALID',
        foreignKeyField,
        record.id || record.oid || record.code
      );
    }
  });

  return problems;
}

/**
 * 验证唯一性字段
 */
function verifyUniqueFields(
  tableName: string,
  uniqueFields: string[]
): VerificationProblem[] {
  const problems: VerificationProblem[] = [];
  const records = getAllRecords(tableName);
  const seen = new Map<string, Map<string, string>>();

  // 初始化跟踪Map
  uniqueFields.forEach((field) => {
    seen.set(field, new Map());
  });

  records.forEach((record: any) => {
    uniqueFields.forEach((field) => {
      const value = record[field];
      if (!value) return;

      const fieldSeen = seen.get(field)!;
      const existing = fieldSeen.get(value);
      if (existing) {
        addProblem(
          problems,
          'error',
          tableName,
          `字段 "${field}" 的值 "${value}" 不唯一（与记录 "${existing}" 重复）`,
          'UNIQUE_FIELD_DUPLICATE',
          field,
          record.id || record.oid || record.code
        );
      } else {
        fieldSeen.set(value, record.id || record.oid || record.code);
      }
    });
  });

  return problems;
}

/**
 * 验证表完整性
 */
function verifyTableIntegrity(
  tableName: string,
  options: {
    requiredFields?: string[];
    uniqueFields?: string[];
    foreignKeys?: { field: string; referencedTable: string; referencedField?: string }[];
  }
): IntegrityVerification {
  const { requiredFields = [], uniqueFields = [], foreignKeys = [] } = options;
  const problems: VerificationProblem[] = [];
  const totalRecords = getRecordCount(tableName);

  // 验证表是否存在
  if (!verifyTableExists(tableName)) {
    addProblem(
      problems,
      'error',
      tableName,
      `表 "${tableName}" 不存在`,
      'TABLE_NOT_EXISTS'
    );
    return { tableName, totalRecords: 0, problems };
  }

  // 验证必填字段
  if (requiredFields.length > 0) {
    problems.push(...verifyRequiredFields(tableName, requiredFields));
  }

  // 验证唯一性字段
  if (uniqueFields.length > 0) {
    problems.push(...verifyUniqueFields(tableName, uniqueFields));
  }

  // 验证外键关联
  foreignKeys.forEach((fk) => {
    problems.push(...verifyForeignKey(tableName, fk.field, fk.referencedTable, fk.referencedField));
  });

  return { tableName, totalRecords, problems };
}

// ========== 2. 数据一致性验证 ==========

/**
 * 验证数量守恒：种源 used_quantity + remaining_quantity = quantity
 */
function verifySeedSourceQuantityConservation(): ConsistencyVerification {
  const problems: VerificationProblem[] = [];
  const records = getAllRecords('seed_sources');

  let inconsistentCount = 0;

  records.forEach((record: any) => {
    const total = record.quantity || 0;
    const used = record.used_quantity || 0;
    const remaining = record.remaining_quantity || 0;

    if (used + remaining !== total) {
      inconsistentCount++;
      addProblem(
        problems,
        'error',
        'seed_sources',
        `种源 "${record.source_code}" 数量不守恒：使用量(${used}) + 剩余量(${remaining}) = ${used + remaining}，不等于总量(${total})`,
        'QUANTITY_NOT_CONSERVED',
        'quantity',
        record.id
      );
    }
  });

  return {
    checkName: '种源数量守恒验证',
    passed: inconsistentCount === 0,
    details: inconsistentCount === 0
      ? '所有种源记录数量守恒'
      : `发现 ${inconsistentCount} 条数量不守恒的记录`,
    problems,
  };
}

/**
 * 验证数量守恒：种植 planted_quantity + survival_quantity 不应超过 seedling_quantity
 */
function verifyPlantingQuantityConservation(): ConsistencyVerification {
  const problems: VerificationProblem[] = [];
  const plantings = getAllRecords('plantings');
  const seedlings = getAllRecords('seedlings');

  // 建立育苗记录索引
  const seedlingMap = new Map<string, any>();
  seedlings.forEach((s: any) => {
    seedlingMap.set(s.id, s);
  });

  let inconsistentCount = 0;

  plantings.forEach((planting: any) => {
    // 如果种植记录关联了育苗记录，验证数量关系
    if (planting.source_type === 'seedling' && planting.source_id) {
      const seedling = seedlingMap.get(planting.source_id);
      if (seedling) {
        const seedlingQty = seedling.seedling_quantity || 0;
        const plantedQty = planting.planted_quantity || 0;

        if (plantedQty > seedlingQty) {
          inconsistentCount++;
          addProblem(
            problems,
            'warning',
            'plantings',
            `种植记录 "${planting.planting_code}" 的已种植面积(${plantedQty})超过育苗数量(${seedlingQty})`,
            'QUANTITY_EXCEEDS_SOURCE',
            'planted_quantity',
            planting.id
          );
        }
      }
    }
  });

  return {
    checkName: '种植数量守恒验证',
    passed: inconsistentCount === 0,
    details: inconsistentCount === 0
      ? '所有种植记录数量合理'
      : `发现 ${inconsistentCount} 条数量异常的记录`,
    problems,
  };
}

/**
 * 验证采收数量合理性
 */
function verifyHarvestQuantity合理性(): ConsistencyVerification {
  const problems: VerificationProblem[] = [];
  const harvests = getAllRecords('harvest_records');

  let invalidCount = 0;

  harvests.forEach((harvest: any) => {
    const qty = harvest.harvest_quantity || 0;
    const price = harvest.unit_price || 0;
    const total = harvest.total_amount || 0;

    // 验证采收数量为正数
    if (qty <= 0) {
      invalidCount++;
      addProblem(
        problems,
        'error',
        'harvest_records',
        `采收记录 "${harvest.harvest_code}" 的采收数量无效(${qty})`,
        'HARVEST_QUANTITY_INVALID',
        'harvest_quantity',
        harvest.id
      );
    }

    // 验证金额计算一致性（允许浮点误差）
    if (price > 0 && total > 0) {
      const calculatedTotal = qty * price;
      const diff = Math.abs(calculatedTotal - total);
      if (diff > 0.01) {
        addProblem(
          problems,
          'warning',
          'harvest_records',
          `采收记录 "${harvest.harvest_code}" 的金额可能不一致：数量(${qty}) × 单价(${price}) = ${calculatedTotal}，记录总金额为 ${total}`,
          'HARVEST_AMOUNT_MISMATCH',
          'total_amount',
          harvest.id
        );
      }
    }
  });

  return {
    checkName: '采收数量合理性验证',
    passed: invalidCount === 0,
    details: invalidCount === 0
      ? '所有采收记录数量合理'
      : `发现 ${invalidCount} 条数量无效的记录`,
    problems,
  };
}

/**
 * 验证库存数据关联
 */
function verifyInventoryConsistency(): ConsistencyVerification {
  const problems: VerificationProblem[] = [];
  const inventories = getAllRecords('inventory');
  const warehouses = getAllRecords('warehouses');
  const harvestRecords = getAllRecords('harvest_records');

  // 建立仓库索引
  const warehouseIds = new Set(warehouses.map((w: any) => w.id));
  // 建立采收记录索引
  const harvestIds = new Set(harvestRecords.map((h: any) => h.id));

  let invalidCount = 0;

  inventories.forEach((inv: any) => {
    // 验证仓库ID有效性
    if (inv.warehouse_id && !warehouseIds.has(inv.warehouse_id)) {
      invalidCount++;
      addProblem(
        problems,
        'error',
        'inventory',
        `库存记录 "${inv.product_code}" 的仓库ID "${inv.warehouse_id}" 不存在`,
        'INVENTORY_WAREHOUSE_INVALID',
        'warehouse_id',
        inv.id
      );
    }

    // 验证采收记录ID有效性
    if (inv.harvest_record_id && !harvestIds.has(inv.harvest_record_id)) {
      addProblem(
        problems,
        'warning',
        'inventory',
        `库存记录 "${inv.product_code}" 的采收记录ID "${inv.harvest_record_id}" 不存在`,
        'INVENTORY_HARVEST_INVALID',
        'harvest_record_id',
        inv.id
      );
    }

    // 验证数量非负
    if (inv.quantity < 0) {
      invalidCount++;
      addProblem(
        problems,
        'error',
        'inventory',
        `库存记录 "${inv.product_code}" 的数量为负数(${inv.quantity})`,
        'INVENTORY_QUANTITY_NEGATIVE',
        'quantity',
        inv.id
      );
    }
  });

  return {
    checkName: '库存一致性验证',
    passed: invalidCount === 0,
    details: invalidCount === 0
      ? '所有库存记录有效'
      : `发现 ${invalidCount} 条无效的库存记录`,
    problems,
  };
}

/**
 * 验证用户与创建者关联
 */
function verifyUserConsistency(): ConsistencyVerification {
  const problems: VerificationProblem[] = [];

  const tablesWithCreateBy = [
    'seed_sources',
    'seedlings',
    'plantings',
    'harvest_records',
    'suppliers',
    'farm_tasks',
    'inspections',
    'problems',
    'labor_records',
    'crop_instances',
    'inventory',
  ];

  const users = getAllRecords('users');
  const userIds = new Set(users.map((u: any) => u.id));

  let orphanCount = 0;

  tablesWithCreateBy.forEach((tableName) => {
    if (!verifyTableExists(tableName)) return;

    const records = getAllRecords(tableName);

    records.forEach((record: any) => {
      // 检查 create_by_id 是否有关联的用户
      if (record.create_by_id && !userIds.has(record.create_by_id)) {
        orphanCount++;
        addProblem(
          problems,
          'warning',
          tableName,
          `表 "${tableName}" 中记录 "${record.id}" 的创建者ID "${record.create_by_id}" 不存在于用户表中`,
          'CREATE_BY_ORPHANED',
          'create_by_id',
          record.id
        );
      }
    });
  });

  return {
    checkName: '用户关联一致性验证',
    passed: orphanCount === 0,
    details: orphanCount === 0
      ? '所有创建者关联有效'
      : `发现 ${orphanCount} 条创建者关联异常的记录`,
    problems,
  };
}

// ========== 3. 溯源链验证 ==========

/**
 * 验证采收记录的完整溯源链
 */
function verifyHarvestTraceability(): TraceabilityVerification[] {
  const results: TraceabilityVerification[] = [];
  const harvests = getAllRecords('harvest_records');
  const plantings = getAllRecords('plantings');
  const seedlings = getAllRecords('seedlings');
  const seedSources = getAllRecords('seed_sources');

  // 建立索引
  const plantingMap = new Map<string, any>();
  plantings.forEach((p: any) => plantingMap.set(p.id, p));

  const seedlingMap = new Map<string, any>();
  seedlings.forEach((s: any) => seedlingMap.set(s.id, s));

  const seedSourceMap = new Map<string, any>();
  seedSources.forEach((s: any) => seedSourceMap.set(s.id, s));

  harvests.forEach((harvest: any) => {
    const chain: TraceabilityVerification['chain'] = [];
    const problems: VerificationProblem[] = [];

    // Level 0: 采收记录本身
    chain.push({
      level: 0,
      table: 'harvest_records',
      recordId: harvest.id,
      recordCode: harvest.harvest_code,
      found: true,
    });

    // Level 1: 种植记录
    if (harvest.source_type === 'planting' && harvest.source_id) {
      const planting = plantingMap.get(harvest.source_id);
      chain.push({
        level: 1,
        table: 'plantings',
        recordId: harvest.source_id,
        recordCode: planting?.planting_code || '未知',
        found: !!planting,
      });

      if (!planting) {
        addProblem(
          problems,
          'error',
          'harvest_records',
          `采收记录 "${harvest.harvest_code}" 关联的种植记录 "${harvest.source_id}" 不存在`,
          'TRACE_PLANTING_NOT_FOUND',
          'source_id',
          harvest.id
        );
      } else {
        // Level 2: 育苗记录
        if (planting.source_type === 'seedling' && planting.source_id) {
          const seedling = seedlingMap.get(planting.source_id);
          chain.push({
            level: 2,
            table: 'seedlings',
            recordId: planting.source_id,
            recordCode: seedling?.seedling_code || '未知',
            found: !!seedling,
          });

          if (!seedling) {
            addProblem(
              problems,
              'error',
              'plantings',
              `种植记录 "${planting.planting_code}" 关联的育苗记录 "${planting.source_id}" 不存在`,
              'TRACE_SEEDLING_NOT_FOUND',
              'source_id',
              planting.id
            );
          } else {
            // Level 3: 种源记录
            if (seedling.source_id) {
              const seedSource = seedSourceMap.get(seedling.source_id);
              chain.push({
                level: 3,
                table: 'seed_sources',
                recordId: seedling.source_id,
                recordCode: seedSource?.source_code || '未知',
                found: !!seedSource,
              });

              if (!seedSource) {
                addProblem(
                  problems,
                  'error',
                  'seedlings',
                  `育苗记录 "${seedling.seedling_code}" 关联的种源记录 "${seedling.source_id}" 不存在`,
                  'TRACE_SEED_SOURCE_NOT_FOUND',
                  'source_id',
                  seedling.id
                );
              }
            }
          }
        }
      }
    }

    // 检查溯源链是否完整（至少要能找到种植记录）
    const hasPlanting = chain.some((c) => c.table === 'plantings' && c.found);
    const passed = problems.length === 0;

    results.push({
      recordId: harvest.id,
      recordCode: harvest.harvest_code,
      chain,
      passed,
      problems,
    });
  });

  return results;
}

/**
 * 验证种植记录的完整溯源链
 */
function verifyPlantingTraceability(): TraceabilityVerification[] {
  const results: TraceabilityVerification[] = [];
  const plantings = getAllRecords('plantings');
  const seedlings = getAllRecords('seedlings');
  const seedSources = getAllRecords('seed_sources');

  // 建立索引
  const seedlingMap = new Map<string, any>();
  seedlings.forEach((s: any) => seedlingMap.set(s.id, s));

  const seedSourceMap = new Map<string, any>();
  seedSources.forEach((s: any) => seedSourceMap.set(s.id, s));

  plantings.forEach((planting: any) => {
    const chain: TraceabilityVerification['chain'] = [];
    const problems: VerificationProblem[] = [];

    // Level 0: 种植记录本身
    chain.push({
      level: 0,
      table: 'plantings',
      recordId: planting.id,
      recordCode: planting.planting_code,
      found: true,
    });

    // Level 1: 育苗记录
    if (planting.source_type === 'seedling' && planting.source_id) {
      const seedling = seedlingMap.get(planting.source_id);
      chain.push({
        level: 1,
        table: 'seedlings',
        recordId: planting.source_id,
        recordCode: seedling?.seedling_code || '未知',
        found: !!seedling,
      });

      if (!seedling) {
        addProblem(
          problems,
          'error',
          'plantings',
          `种植记录 "${planting.planting_code}" 关联的育苗记录 "${planting.source_id}" 不存在`,
          'TRACE_SEEDLING_NOT_FOUND',
          'source_id',
          planting.id
        );
      } else {
        // Level 2: 种源记录
        if (seedling.source_id) {
          const seedSource = seedSourceMap.get(seedling.source_id);
          chain.push({
            level: 2,
            table: 'seed_sources',
            recordId: seedling.source_id,
            recordCode: seedSource?.source_code || '未知',
            found: !!seedSource,
          });

          if (!seedSource) {
            addProblem(
              problems,
              'error',
              'seedlings',
              `育苗记录 "${seedling.seedling_code}" 关联的种源记录 "${seedling.source_id}" 不存在`,
              'TRACE_SEED_SOURCE_NOT_FOUND',
              'source_id',
              seedling.id
            );
          }
        }
      }
    }

    const passed = problems.length === 0;

    results.push({
      recordId: planting.id,
      recordCode: planting.planting_code,
      chain,
      passed,
      problems,
    });
  });

  return results;
}

// ========== 4. 模块验证 ==========

/**
 * 验证溯源模块（种源→育苗→种植→采收）
 */
function verifyTraceabilityModule(): ModuleVerification {
  const moduleName = '溯源链';
  const problems: VerificationProblem[] = [];

  const harvestResults = verifyHarvestTraceability();
  const plantingResults = verifyPlantingTraceability();

  harvestResults.forEach((result) => problems.push(...result.problems));
  plantingResults.forEach((result) => problems.push(...result.problems));

  const harvestCount = getRecordCount('harvest_records');
  const plantingCount = getRecordCount('plantings');

  const passed = problems.filter((p) => p.level === 'error').length === 0;

  return {
    moduleName,
    passed,
    recordCount: harvestCount + plantingCount,
    problems,
    warnings: problems.filter((p) => p.level === 'warning').length,
    errors: problems.filter((p) => p.level === 'error').length,
  };
}

/**
 * 验证库存模块
 */
function verifyInventoryModule(): ModuleVerification {
  const moduleName = '库存管理';
  const problems: VerificationProblem[] = [];
  const recordCount = getRecordCount('inventory');

  // 验证库存一致性
  const consistencyResult = verifyInventoryConsistency();
  problems.push(...consistencyResult.problems);

  const passed = problems.filter((p) => p.level === 'error').length === 0;

  return {
    moduleName,
    passed,
    recordCount,
    problems,
    warnings: problems.filter((p) => p.level === 'warning').length,
    errors: problems.filter((p) => p.level === 'error').length,
  };
}

/**
 * 验证系统设置模块
 */
function verifySystemModule(): ModuleVerification {
  const moduleName = '系统设置';
  const problems: VerificationProblem[] = [];

  const tables = [
    { name: 'departments', requiredFields: ['id', 'oid', 'name'] },
    { name: 'positions', requiredFields: ['id', 'oid', 'code', 'name'] },
    { name: 'teams', requiredFields: ['id', 'oid', 'team_code', 'team_name'] },
    { name: 'warehouses', requiredFields: ['id', 'oid', 'code', 'name'] },
    { name: 'greenhouses', requiredFields: ['id', 'oid', 'code', 'name'] },
    { name: 'zones', requiredFields: ['id', 'oid', 'zone_code', 'zone_name'] },
    { name: 'blocks', requiredFields: ['id', 'oid', 'block_code', 'block_name'] },
    { name: 'users', requiredFields: ['id', 'oid', 'username'], uniqueFields: ['username', 'oid'] },
    { name: 'roles', requiredFields: ['id', 'oid', 'role_code', 'role_name'], uniqueFields: ['role_code', 'oid'] },
    { name: 'permissions', requiredFields: ['id', 'oid', 'permission_code', 'permission_name'], uniqueFields: ['permission_code', 'oid'] },
  ];

  let totalRecords = 0;
  let totalErrors = 0;
  let totalWarnings = 0;

  tables.forEach((table) => {
    if (!verifyTableExists(table.name)) {
      addProblem(
        problems,
        'error',
        table.name,
        `表 "${table.name}" 不存在`,
        'TABLE_NOT_EXISTS'
      );
      totalErrors++;
      return;
    }

    const integrity = verifyTableIntegrity(table.name, {
      requiredFields: table.requiredFields,
      uniqueFields: table.uniqueFields || [],
    });

    totalRecords += integrity.totalRecords;
    totalErrors += integrity.problems.filter((p) => p.level === 'error').length;
    totalWarnings += integrity.problems.filter((p) => p.level === 'warning').length;
    problems.push(...integrity.problems);
  });

  const passed = totalErrors === 0;

  return {
    moduleName,
    passed,
    recordCount: totalRecords,
    problems,
    warnings: totalWarnings,
    errors: totalErrors,
  };
}

/**
 * 验证字典模块
 */
function verifyDictionaryModule(): ModuleVerification {
  const moduleName = '数据字典';
  const problems: VerificationProblem[] = [];

  // 验证字典分类和字典项
  const categories = getAllRecords('dictionary_categories');
  const dictionaries = getAllRecords('dictionaries');

  const categoryCodes = new Set(categories.map((c: any) => c.code));

  // 验证字典项的分类是否存在
  dictionaries.forEach((dict: any) => {
    if (!categoryCodes.has(dict.category_code)) {
      addProblem(
        problems,
        'error',
        'dictionaries',
        `字典项 "${dict.dict_label}" 的分类编码 "${dict.category_code}" 不存在`,
        'DICT_CATEGORY_NOT_FOUND',
        'category_code',
        dict.id
      );
    }
  });

  // 验证作物品种表
  if (verifyTableExists('crop_varieties')) {
    const varietyProblems = verifyTableIntegrity('crop_varieties', {
      requiredFields: ['id', 'crop_code'],
      uniqueFields: ['crop_code'],
    });
    problems.push(...varietyProblems.problems);
  }

  const passed = problems.filter((p) => p.level === 'error').length === 0;

  return {
    moduleName,
    passed,
    recordCount: categories.length + dictionaries.length,
    problems,
    warnings: problems.filter((p) => p.level === 'warning').length,
    errors: problems.filter((p) => p.level === 'error').length,
  };
}

// ========== 5. 主验证函数 ==========

/**
 * 验证所有数据
 */
export function verifyAllData(): VerificationReport {
  const timestamp = new Date().toISOString();
  const allProblems: VerificationProblem[] = [];

  console.log('========== 开始数据验证 ==========\n');

  // 1. 完整性验证
  console.log('1. 执行完整性验证...');
  const integrityTables = [
    { name: 'seed_sources', requiredFields: ['id', 'source_code'], uniqueFields: ['source_code'] },
    { name: 'seedlings', requiredFields: ['id', 'seedling_code'], uniqueFields: ['seedling_code'] },
    { name: 'plantings', requiredFields: ['id', 'planting_code'], uniqueFields: ['planting_code'] },
    { name: 'harvest_records', requiredFields: ['id', 'harvest_code'], uniqueFields: ['harvest_code'] },
    { name: 'inventory', requiredFields: ['id', 'product_code'], uniqueFields: ['product_code'] },
    { name: 'suppliers', requiredFields: ['id', 'supplier_code'], uniqueFields: ['supplier_code'] },
    { name: 'farm_tasks', requiredFields: ['id', 'task_code'], uniqueFields: ['task_code'] },
  ];

  const integrityResults: IntegrityVerification[] = [];
  integrityTables.forEach((table) => {
    if (verifyTableExists(table.name)) {
      const result = verifyTableIntegrity(table.name, {
        requiredFields: table.requiredFields,
        uniqueFields: table.uniqueFields || [],
      });
      integrityResults.push(result);
      allProblems.push(...result.problems);
      console.log(`   - ${table.name}: ${result.totalRecords} 条记录, ${result.problems.length} 个问题`);
    }
  });

  // 2. 一致性验证
  console.log('\n2. 执行一致性验证...');
  const consistencyResults: ConsistencyVerification[] = [];

  const quantityConserved = verifySeedSourceQuantityConservation();
  consistencyResults.push(quantityConserved);
  allProblems.push(...quantityConserved.problems);
  console.log(`   - ${quantityConserved.checkName}: ${quantityConserved.passed ? '通过' : '失败'}`);

  const plantingConserved = verifyPlantingQuantityConservation();
  consistencyResults.push(plantingConserved);
  allProblems.push(...plantingConserved.problems);
  console.log(`   - ${plantingConserved.checkName}: ${plantingConserved.passed ? '通过' : '失败'}`);

  const harvestValid = verifyHarvestQuantity合理性();
  consistencyResults.push(harvestValid);
  allProblems.push(...harvestValid.problems);
  console.log(`   - ${harvestValid.checkName}: ${harvestValid.passed ? '通过' : '失败'}`);

  const inventoryConsistent = verifyInventoryConsistency();
  consistencyResults.push(inventoryConsistent);
  allProblems.push(...inventoryConsistent.problems);
  console.log(`   - ${inventoryConsistent.checkName}: ${inventoryConsistent.passed ? '通过' : '失败'}`);

  const userConsistent = verifyUserConsistency();
  consistencyResults.push(userConsistent);
  allProblems.push(...userConsistent.problems);
  console.log(`   - ${userConsistent.checkName}: ${userConsistent.passed ? '通过' : '失败'}`);

  // 3. 溯源链验证
  console.log('\n3. 执行溯源链验证...');
  const traceabilityResults: TraceabilityVerification[] = [];

  const harvestTrace = verifyHarvestTraceability();
  harvestTrace.forEach((r) => {
    if (!r.passed) {
      allProblems.push(...r.problems);
    }
  });
  traceabilityResults.push(...harvestTrace);
  console.log(`   - 采收记录溯源: ${harvestTrace.filter((r) => r.passed).length}/${harvestTrace.length} 通过`);

  const plantingTrace = verifyPlantingTraceability();
  plantingTrace.forEach((r) => {
    if (!r.passed) {
      allProblems.push(...r.problems);
    }
  });
  traceabilityResults.push(...plantingTrace);
  console.log(`   - 种植记录溯源: ${plantingTrace.filter((r) => r.passed).length}/${plantingTrace.length} 通过`);

  // 4. 模块验证
  console.log('\n4. 执行模块验证...');
  const moduleResults: ModuleVerification[] = [];

  const traceModule = verifyTraceabilityModule();
  moduleResults.push(traceModule);
  allProblems.push(...traceModule.problems);
  console.log(`   - ${traceModule.moduleName}: ${traceModule.recordCount} 条记录, ${traceModule.errors} 个错误, ${traceModule.warnings} 个警告`);

  const inventoryModule = verifyInventoryModule();
  moduleResults.push(inventoryModule);
  allProblems.push(...inventoryModule.problems);
  console.log(`   - ${inventoryModule.moduleName}: ${inventoryModule.recordCount} 条记录, ${inventoryModule.errors} 个错误, ${inventoryModule.warnings} 个警告`);

  const systemModule = verifySystemModule();
  moduleResults.push(systemModule);
  allProblems.push(...systemModule.problems);
  console.log(`   - ${systemModule.moduleName}: ${systemModule.recordCount} 条记录, ${systemModule.errors} 个错误, ${systemModule.warnings} 个警告`);

  const dictModule = verifyDictionaryModule();
  moduleResults.push(dictModule);
  allProblems.push(...dictModule.problems);
  console.log(`   - ${dictModule.moduleName}: ${dictModule.recordCount} 条记录, ${dictModule.errors} 个错误, ${dictModule.warnings} 个警告`);

  // 汇总统计
  const totalRecords = integrityResults.reduce((sum, r) => sum + r.totalRecords, 0);
  const errors = allProblems.filter((p) => p.level === 'error').length;
  const warnings = allProblems.filter((p) => p.level === 'warning').length;
  const infos = allProblems.filter((p) => p.level === 'info').length;

  console.log('\n========== 验证完成 ==========');
  console.log(`总记录数: ${totalRecords}`);
  console.log(`问题总数: ${allProblems.length} (错误: ${errors}, 警告: ${warnings}, 信息: ${infos})`);

  return {
    timestamp,
    overallPassed: errors === 0,
    summary: {
      totalTables: integrityTables.filter((t) => verifyTableExists(t.name)).length,
      totalRecords,
      totalProblems: allProblems.length,
      errors,
      warnings,
      infos,
    },
    integrityResults,
    consistencyResults,
    traceabilityResults,
    moduleResults,
    allProblems,
  };
}

/**
 * 验证指定模块
 */
export function verifyModule(moduleName: string): ModuleVerification {
  console.log(`========== 验证模块: ${moduleName} ==========\n`);

  switch (moduleName) {
    case '溯源链':
      return verifyTraceabilityModule();
    case '库存管理':
      return verifyInventoryModule();
    case '系统设置':
      return verifySystemModule();
    case '数据字典':
      return verifyDictionaryModule();
    default:
      return {
        moduleName,
        passed: false,
        recordCount: 0,
        problems: [
          {
            table: '',
            level: 'error',
            message: `未知模块: ${moduleName}`,
            code: 'UNKNOWN_MODULE',
          },
        ],
        warnings: 0,
        errors: 1,
      };
  }
}

/**
 * 生成报告
 */
export function generateReport(report?: VerificationReport): string {
  const r = report || verifyAllData();

  const lines: string[] = [];
  const divider = '═'.repeat(60);

  lines.push(divider);
  lines.push('           数据迁移验证报告');
  lines.push(`生成时间: ${r.timestamp}`);
  lines.push(divider);

  // 汇总信息
  lines.push('\n【汇总信息】');
  lines.push(`验证状态: ${r.overallPassed ? '✓ 通过' : '✗ 未通过'}`);
  lines.push(`表数量: ${r.summary.totalTables}`);
  lines.push(`总记录数: ${r.summary.totalRecords}`);
  lines.push(`问题总数: ${r.summary.totalProblems}`);
  lines.push(`  - 错误: ${r.summary.errors}`);
  lines.push(`  - 警告: ${r.summary.warnings}`);
  lines.push(`  - 信息: ${r.summary.infos}`);

  // 完整性验证结果
  lines.push('\n【完整性验证】');
  r.integrityResults.forEach((result) => {
    const status = result.problems.filter((p) => p.level === 'error').length === 0 ? '✓' : '✗';
    lines.push(`  ${status} ${result.tableName}: ${result.totalRecords} 条记录`);
    if (result.problems.length > 0) {
      result.problems.slice(0, 3).forEach((p) => {
        lines.push(`      - [${p.level.toUpperCase()}] ${p.message}`);
      });
      if (result.problems.length > 3) {
        lines.push(`      ... 还有 ${result.problems.length - 3} 个问题`);
      }
    }
  });

  // 一致性验证结果
  lines.push('\n【一致性验证】');
  r.consistencyResults.forEach((result) => {
    const status = result.passed ? '✓' : '✗';
    lines.push(`  ${status} ${result.checkName}`);
    lines.push(`      ${result.details}`);
  });

  // 溯源链验证结果
  lines.push('\n【溯源链验证】');
  const harvestTrace = r.traceabilityResults.filter((r) => r.chain[0]?.table === 'harvest_records');
  const plantingTrace = r.traceabilityResults.filter((r) => r.chain[0]?.table === 'plantings');

  const harvestPassed = harvestTrace.filter((r) => r.passed).length;
  const harvestTotal = harvestTrace.length;
  lines.push(`  采收记录溯源: ${harvestPassed}/${harvestTotal} 通过`);

  const plantingPassed = plantingTrace.filter((r) => r.passed).length;
  const plantingTotal = plantingTrace.length;
  lines.push(`  种植记录溯源: ${plantingPassed}/${plantingTotal} 通过`);

  // 模块验证结果
  lines.push('\n【模块验证】');
  r.moduleResults.forEach((result) => {
    const status = result.passed ? '✓' : '✗';
    lines.push(`  ${status} ${result.moduleName}: ${result.recordCount} 条记录`);
    lines.push(`      错误: ${result.errors}, 警告: ${result.warnings}`);
  });

  // 问题详情（按级别分组）
  if (r.allProblems.length > 0) {
    lines.push('\n【问题详情】');

    const errors = r.allProblems.filter((p) => p.level === 'error');
    const warnings = r.allProblems.filter((p) => p.level === 'warning');

    if (errors.length > 0) {
      lines.push(`\n  错误 (${errors.length}个):`);
      errors.slice(0, 10).forEach((p) => {
        lines.push(`    - [${p.code}] ${p.table}${p.field ? `(${p.field})` : ''}: ${p.message}`);
      });
      if (errors.length > 10) {
        lines.push(`    ... 还有 ${errors.length - 10} 个错误`);
      }
    }

    if (warnings.length > 0) {
      lines.push(`\n  警告 (${warnings.length}个):`);
      warnings.slice(0, 10).forEach((p) => {
        lines.push(`    - [${p.code}] ${p.table}${p.field ? `(${p.field})` : ''}: ${p.message}`);
      });
      if (warnings.length > 10) {
        lines.push(`    ... 还有 ${warnings.length - 10} 个警告`);
      }
    }
  }

  lines.push('\n' + divider);
  lines.push('                    报告结束');
  lines.push(divider);

  return lines.join('\n');
}

/**
 * 打印报告到控制台
 */
export function printReport(report?: VerificationReport): void {
  console.log(generateReport(report));
}

// 默认导出
export default {
  verifyAllData,
  verifyModule,
  generateReport,
  printReport,
};
