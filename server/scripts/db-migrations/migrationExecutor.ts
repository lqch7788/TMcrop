/**
 * 数据迁移执行器
 * Phase 1: 将 localStorage 数据迁移到后端 SQLite 数据库
 *
 * 使用方式:
 *   npx tsx src/db/migrationExecutor.ts
 */

import fs from 'fs';
import path from 'path';
import { getDatabase } from './index.js';

// 使用 process.cwd() 代替 __dirname (tsx 支持 ES 模块语法)
const WORK_DIR = process.cwd();

/**
 * 迁移配置
 */
interface MigrationConfig {
  batchSize: number;      // 每批处理数量
  dryRun: boolean;         // 试运行模式（不实际写入）
  forceOverwrite: boolean; // 强制覆盖已存在数据
}

const DEFAULT_CONFIG: MigrationConfig = {
  batchSize: 100,
  dryRun: false,
  forceOverwrite: false,
};

/**
 * 迁移结果统计
 */
interface MigrationResult {
  tableName: string;
  success: boolean;
  totalRecords: number;
  migratedRecords: number;
  failedRecords: number;
  errors: string[];
  duration: number; // 毫秒
}

/**
 * localStorage 数据备份加载器
 */
function loadLocalStorageBackup(): Record<string, any[]> {
  // 相对于项目根目录
  const backupPath = path.join(WORK_DIR, 'server/src/data/localStorageBackup.json');

  if (!fs.existsSync(backupPath)) {
    console.error('❌ 备份文件不存在:', backupPath);
    console.log('请先在前端执行 backupLocalStorage.backup() 下载备份文件');
    process.exit(1);
  }

  const content = fs.readFileSync(backupPath, 'utf-8');
  const backup = JSON.parse(content);

  return backup.data || backup;
}

/**
 * 迁移执行器类
 */
class MigrationExecutor {
  private db: ReturnType<typeof getDatabase>;
  private config: MigrationConfig;
  private results: MigrationResult[] = [];

  constructor(config: Partial<MigrationConfig> = {}) {
    this.db = getDatabase();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 执行所有迁移
   */
  async execute(): Promise<MigrationResult[]> {
    console.log('='.repeat(60));
    console.log('🚀 数据迁移执行器 v1.0');
    console.log('='.repeat(60));
    console.log(`模式: ${this.config.dryRun ? '🔍 试运行' : '✅ 正式执行'}`);
    console.log(`批次大小: ${this.config.batchSize}`);
    console.log(`强制覆盖: ${this.config.forceOverwrite ? '是' : '否'}`);
    console.log('');

    // 加载备份数据
    console.log('📂 加载 localStorage 备份...');
    const backupData = loadLocalStorageBackup();
    const keys = Object.keys(backupData);
    console.log(`找到 ${keys.length} 个数据项\n`);

    // 按优先级执行迁移
    const migrationOrder = [
      // 1. 基础数据（无依赖）
      { key: 'departments', table: 'departments', transform: this.transformDepartment },
      { key: 'positions', table: 'positions', transform: this.transformPosition },
      { key: 'teams', table: 'teams', transform: this.transformTeam },
      { key: 'warehouses', table: 'warehouses', transform: this.transformWarehouse },
      { key: 'greenhouses', table: 'greenhouses', transform: this.transformGreenhouse },
      { key: 'zones', table: 'zones', transform: this.transformZone },
      { key: 'blocks', table: 'blocks', transform: this.transformBlock },

      // 2. 字典数据
      { key: 'dictionary_categories', table: 'dictionary_categories', transform: this.transformDictionaryCategory },
      { key: 'dictionaries', table: 'dictionaries', transform: this.transformDictionary },

      // 3. 权限数据
      { key: 'roles', table: 'roles', transform: this.transformRole },
      { key: 'permissions', table: 'permissions', transform: this.transformPermission },
      { key: 'users', table: 'users', transform: this.transformUser },
      { key: 'processes', table: 'processes', transform: this.transformProcess },
      { key: 'actions', table: 'actions', transform: this.transformAction },

      // 4. 作物数据（有依赖关系）
      { key: 'crop_instances', table: 'crop_instances', transform: this.transformCropInstance },
      { key: 'seed_sources', table: 'seed_sources', transform: this.transformSeedSource },
      { key: 'seedlings', table: 'seedlings', transform: this.transformSeedling },
      { key: 'plantings', table: 'plantings', transform: this.transformPlanting },
      { key: 'harvest_records', table: 'harvest_records', transform: this.transformHarvest },
      { key: 'crop_orders', table: 'crop_orders', transform: this.transformCropOrder },
      { key: 'crop_batches', table: 'crop_batches', transform: this.transformCropBatch },

      // 5. 业务数据
      { key: 'farm_tasks', table: 'farm_tasks', transform: this.transformFarmTask },
      { key: 'inspections', table: 'inspections', transform: this.transformInspection },
      { key: 'problems', table: 'problems', transform: this.transformProblem },
      { key: 'suppliers', table: 'suppliers', transform: this.transformSupplier },

      // 6. 库存与采购
      { key: 'inventory', table: 'inventory', transform: this.transformInventory },
      { key: 'production_plans', table: 'production_plans', transform: this.transformProductionPlan },
      { key: 'purchase_plans', table: 'purchase_plans', transform: this.transformPurchasePlan },

      // 7. 审批数据
      { key: 'approvals', table: 'approvals', transform: this.transformApproval },
      { key: 'approval_workflows', table: 'approval_workflows', transform: this.transformApprovalWorkflow },
    ];

    // 执行迁移
    for (const item of migrationOrder) {
      if (backupData[item.key]) {
        await this.migrateTable(item.key, item.table, item.transform.bind(this));
      } else {
        console.log(`⏭️  跳过 ${item.key}（无数据）`);
      }
    }

    // 打印结果
    this.printResults();

    return this.results;
  }

  /**
   * 迁移单个表
   */
  private async migrateTable(
    storageKey: string,
    tableName: string,
    transform: (record: any) => any
  ): Promise<void> {
    const startTime = Date.now();
    console.log(`\n📤 迁移 ${storageKey} → ${tableName}...`);

    const backupData = loadLocalStorageBackup();
    const records = backupData[storageKey] || [];
    const result: MigrationResult = {
      tableName,
      success: true,
      totalRecords: records.length,
      migratedRecords: 0,
      failedRecords: 0,
      errors: [],
      duration: 0,
    };

    if (records.length === 0) {
      console.log(`  ⏭️  无数据，跳过`);
      this.results.push(result);
      return;
    }

    try {
      // 批量处理
      for (let i = 0; i < records.length; i += this.config.batchSize) {
        const batch = records.slice(i, i + this.config.batchSize);

        for (const record of batch) {
          try {
            const transformed = transform(record);

            if (this.config.dryRun) {
              console.log(`  🔍 [试运行] 会插入:`, JSON.stringify(transformed).slice(0, 100));
              result.migratedRecords++;
            } else {
              // 检查是否已存在
              const existing = this.db.prepare(
                `SELECT id FROM ${tableName} WHERE id = ?`
              ).get(transformed.id);

              if (existing && !this.config.forceOverwrite) {
                console.log(`  ⚠️  跳过已存在: ${transformed.id}`);
                continue;
              }

              // 构建 INSERT 语句
              const columns = Object.keys(transformed);
              const placeholders = columns.map(() => '?').join(', ');
              const values = columns.map(col => {
                const val = transformed[col];
                return typeof val === 'object' ? JSON.stringify(val) : val;
              });

              if (this.config.forceOverwrite && existing) {
                const setClause = columns.map(col => `${col} = ?`).join(', ');
                this.db.prepare(
                  `UPDATE ${tableName} SET ${setClause} WHERE id = ?`
                ).run(...values, transformed.id);
              } else {
                this.db.prepare(
                  `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`
                ).run(...values);
              }
              result.migratedRecords++;
            }
          } catch (err: any) {
            result.failedRecords++;
            result.errors.push(`${record.id || 'unknown'}: ${err.message}`);
          }
        }

        console.log(`  进度: ${Math.min(i + this.config.batchSize, records.length)}/${records.length}`);
      }

      result.duration = Date.now() - startTime;
      console.log(`  ✅ 成功: ${result.migratedRecords}, 失败: ${result.failedRecords}`);

    } catch (err: any) {
      result.success = false;
      result.errors.push(`表级错误: ${err.message}`);
      console.log(`  ❌ 迁移失败: ${err.message}`);
    }

    this.results.push(result);
  }

  // ==================== 数据转换函数 ====================

  private transformDepartment(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      name: record.name || '',
      code: record.code || '',
      manager_id: record.manager_id || '',
      manager_name: record.manager_name || '',
      parent_oid: record.parent_oid || '',
      sort_number: record.sort_number || 0,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformPosition(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      code: record.code || '',
      name: record.name || '',
      department_oid: record.department_oid || '',
      department_name: record.department_name || '',
      level: record.level || 1,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformTeam(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      team_code: record.team_code || '',
      team_name: record.team_name || '',
      department_oid: record.department_oid || '',
      department_name: record.department_name || '',
      leader_id: record.leader_id || '',
      leader_name: record.leader_name || '',
      shift_type: record.shift_type || '',
      member_count: record.member_count || 0,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformWarehouse(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      code: record.code || '',
      name: record.name || '',
      warehouse_type: record.warehouse_type || '',
      location: record.location || '',
      capacity: record.capacity || 0,
      current_stock: record.current_stock || 0,
      manager_id: record.manager_id || '',
      manager_name: record.manager_name || '',
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformGreenhouse(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      code: record.code || '',
      name: record.name || '',
      greenhouse_type: record.greenhouse_type || '',
      area: record.area || 0,
      location: record.location || '',
      base_oid: record.base_oid || '',
      base_name: record.base_name || '',
      company_id: record.company_id || '',
      company_name: record.company_name || '',
      lng: record.lng || 0,
      lat: record.lat || 0,
      crop: record.crop || '',
      growth_day: record.growth_day || 0,
      manager: record.manager || '',
      phone: record.phone || '',
      soil_type: record.soil_type || '',
      ph: record.ph || 0,
      intro: record.intro || '',
      greenhouse_count: record.greenhouse_count || 0,
      field_area: record.field_area || 0,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformZone(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      zone_code: record.zone_code || '',
      zone_name: record.zone_name || '',
      greenhouse_oid: record.greenhouse_oid || '',
      greenhouse_name: record.greenhouse_name || '',
      zone_type: record.zone_type || '',
      area: record.area || 0,
      sort_order: record.sort_order || 0,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformBlock(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      block_code: record.block_code || '',
      block_name: record.block_name || '',
      zone_oid: record.zone_oid || '',
      zone_name: record.zone_name || '',
      block_type: record.block_type || '',
      area: record.area || 0,
      sort_order: record.sort_order || 0,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformDictionaryCategory(record: any) {
    return {
      id: record.id || this.generateId(),
      code: record.code || '',
      name: record.name || '',
      module: record.module || '',
      description: record.description || '',
      sort_order: record.sort_order || 0,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformDictionary(record: any) {
    return {
      id: record.id || this.generateId(),
      category_code: record.category_code || '',
      dict_code: record.dict_code || '',
      dict_label: record.dict_label || '',
      dict_value: record.dict_value || '',
      color: record.color || '',
      sort_order: record.sort_order || 0,
      is_default: record.is_default ? 1 : 0,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformRole(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      role_code: record.role_code || '',
      role_name: record.role_name || '',
      description: record.description || '',
      is_system: record.is_system ? 1 : 0,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformPermission(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      permission_code: record.permission_code || '',
      permission_name: record.permission_name || '',
      category: record.category || '',
      description: record.description || '',
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformUser(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      username: record.username || '',
      password_hash: record.password_hash || '',
      real_name: record.real_name || '',
      org_oid: record.org_oid || '',
      org_name: record.org_name || '',
      department_oid: record.department_oid || '',
      department_name: record.department_name || '',
      position: record.position || '',
      email: record.email || '',
      phone: record.phone || '',
      avatar: record.avatar || '',
      status: record.status || 'active',
      last_login: record.last_login || '',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformProcess(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      process_code: record.process_code || '',
      process_name: record.process_name || '',
      category: record.category || '',
      app_type: record.app_type || 0,
      description: record.description || '',
      sort_order: record.sort_order || 0,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformAction(record: any) {
    return {
      id: record.id || this.generateId(),
      oid: record.oid || record.id,
      action_code: record.action_code || '',
      action_name: record.action_name || '',
      category: record.category || '',
      description: record.description || '',
      sort_order: record.sort_order || 0,
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformCropInstance(record: any) {
    return {
      id: record.id || this.generateId(),
      instance_code: record.instance_code || '',
      order_id: record.order_id || '',
      order_code: record.order_code || '',
      crop_category: record.crop_category || '',
      crop_name: record.crop_name || '',
      crop_variety: record.crop_variety || '',
      category_code: record.category_code || '',
      type_code: record.type_code || '',
      sub_code: record.sub_code || '',
      source_origin: record.source_origin || '',
      source_description: record.source_description || '',
      initial_quantity: record.initial_quantity || 0,
      current_quantity: record.current_quantity || 0,
      planted_quantity: record.planted_quantity || 0,
      harvested_quantity: record.harvested_quantity || 0,
      status: record.status || 'seedling',
      seed_entry_date: record.seed_entry_date || '',
      seedling_start_date: record.seedling_start_date || '',
      planting_date: record.planting_date || '',
      harvest_date: record.harvest_date || '',
      source_instance_id: record.source_instance_id || '',
      create_by: record.create_by || '',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformSeedSource(record: any) {
    return {
      id: record.id || this.generateId(),
      source_code: record.source_code || '',
      source_name: record.source_name || '',
      source_type: record.source_type || '',
      source_origin: record.source_origin || '',
      crop_category: record.crop_category || '',
      crop_name: record.crop_name || '',
      crop_variety: record.crop_variety || '',
      type_name: record.type_name || '',
      variety_name: record.variety_name || '',
      crop_code: record.crop_code || '',
      supplier_id: record.supplier_id || '',
      supplier_name: record.supplier_name || '',
      production_plan_code: record.production_plan_code || '',
      quantity: record.quantity || 0,
      unit: record.unit || '',
      purchase_date: record.purchase_date || '',
      purchase_price: record.purchase_price || 0,
      total_amount: record.total_amount || 0,
      used_quantity: record.used_quantity || 0,
      remaining_quantity: record.remaining_quantity || 0,
      status: record.status || 'active',
      remarks: record.remarks || '',
      create_by: record.create_by || '',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformSeedling(record: any) {
    return {
      id: record.id || this.generateId(),
      seedling_code: record.seedling_code || '',
      source_id: record.source_id || '',
      source_name: record.source_name || '',
      production_plan_code: record.production_plan_code || '',
      crop_name: record.crop_name || '',
      crop_variety: record.crop_variety || '',
      seedling_type: record.seedling_type || '',
      greenhouse_name: record.greenhouse_name || '',
      area_name: record.area_name || '',
      seedling_date: record.seedling_date || '',
      expected_finish_date: record.expected_finish_date || '',
      actual_finish_date: record.actual_finish_date || '',
      seedling_quantity: record.seedling_quantity || 0,
      survival_quantity: record.survival_quantity || 0,
      survival_rate: record.survival_rate || 0,
      status: record.status || 'in_progress',
      seedling_status: record.seedling_status || '',
      remarks: record.remarks || '',
      create_by: record.create_by || '',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformPlanting(record: any) {
    return {
      id: record.id || this.generateId(),
      planting_code: record.planting_code || '',
      source_type: record.source_type || '',
      source_id: record.source_id || '',
      source_name: record.source_name || '',
      crop_name: record.crop_name || '',
      crop_variety: record.crop_variety || '',
      greenhouse_name: record.greenhouse_name || '',
      area_name: record.area_name || '',
      planting_date: record.planting_date || '',
      planting_quantity: record.planting_quantity || 0,
      planted_quantity: record.planted_quantity || 0,
      survival_quantity: record.survival_quantity || 0,
      survival_rate: record.survival_rate || 0,
      growth_status: record.growth_status || '',
      expected_harvest_date: record.expected_harvest_date || '',
      actual_harvest_date: record.actual_harvest_date || '',
      harvest_quantity: record.harvest_quantity || 0,
      status: record.status || 'planted',
      remarks: record.remarks || '',
      create_by: record.create_by || '',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformHarvest(record: any) {
    return {
      id: record.id || this.generateId(),
      harvest_code: record.harvest_code || '',
      source_id: record.source_id || '',
      source_name: record.source_name || '',
      crop_name: record.crop_name || '',
      crop_variety: record.crop_variety || '',
      greenhouse_name: record.greenhouse_name || '',
      harvest_date: record.harvest_date || '',
      harvest_quantity: record.harvest_quantity || 0,
      unit: record.unit || '',
      unit_price: record.unit_price || 0,
      total_amount: record.total_amount || 0,
      quality_grade: record.quality_grade || '',
      buyer_id: record.buyer_id || '',
      buyer_name: record.buyer_name || '',
      sales_channel: record.sales_channel || '',
      status: record.status || 'pending',
      remarks: record.remarks || '',
      create_by: record.create_by || '',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformCropOrder(record: any) {
    return {
      id: record.id || this.generateId(),
      order_code: record.order_code || '',
      order_type: record.order_type || '',
      crop_name: record.crop_name || '',
      crop_variety: record.crop_variety || '',
      quantity: record.quantity || 0,
      unit: record.unit || '',
      unit_price: record.unit_price || 0,
      total_amount: record.total_amount || 0,
      customer_name: record.customer_name || '',
      customer_contact: record.customer_contact || '',
      delivery_address: record.delivery_address || '',
      order_date: record.order_date || '',
      expected_delivery_date: record.expected_delivery_date || '',
      actual_delivery_date: record.actual_delivery_date || '',
      status: record.status || 'pending',
      remarks: record.remarks || '',
      create_by: record.create_by || '',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformCropBatch(record: any) {
    return {
      id: record.id || this.generateId(),
      batch_code: record.batch_code || '',
      batch_name: record.batch_name || '',
      crop_name: record.crop_name || '',
      crop_variety: record.crop_variety || '',
      planting_date: record.planting_date || '',
      expected_harvest_date: record.expected_harvest_date || '',
      status: record.status || 'active',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformFarmTask(record: any) {
    return {
      id: record.id || this.generateId(),
      task_code: record.task_code || '',
      task_title: record.task_title || '',
      task_type: record.task_type || '',
      task_content: record.task_content || '',
      assignee_id: record.assignee_id || '',
      assignee_name: record.assignee_name || '',
      greenhouse_id: record.greenhouse_id || '',
      greenhouse_name: record.greenhouse_name || '',
      area_name: record.area_name || '',
      plan_date: record.plan_date || '',
      plan_time: record.plan_time || '',
      priority: record.priority || 'medium',
      status: record.status || 'pending',
      completion_date: record.completion_date || '',
      completion_note: record.completion_note || '',
      create_by: record.create_by || '',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformInspection(record: any) {
    return {
      id: record.id || this.generateId(),
      record_code: record.record_code || '',
      inspection_type: record.inspection_type || '',
      inspector_id: record.inspector_id || '',
      inspector_name: record.inspector_name || '',
      greenhouse_name: record.greenhouse_name || '',
      check_date: record.check_date || '',
      check_time: record.check_time || '',
      check_result: record.check_result || '',
      issue_severity: record.issue_severity || '',
      issue_text: record.issue_text || '',
      images: typeof record.images === 'object' ? JSON.stringify(record.images) : record.images || '',
      status: record.status || 'pending',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformProblem(record: any) {
    return {
      id: record.id || this.generateId(),
      problem_code: record.problem_code || '',
      problem_type: record.problem_type || '',
      title: record.title || '',
      description: record.description || '',
      greenhouse_name: record.greenhouse_name || '',
      reporter_id: record.reporter_id || '',
      reporter_name: record.reporter_name || '',
      assignee_id: record.assignee_id || '',
      assignee_name: record.assignee_name || '',
      priority: record.priority || 'medium',
      status: record.status || 'pending',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformSupplier(record: any) {
    return {
      id: record.id || this.generateId(),
      supplier_code: record.supplier_code || '',
      supplier_name: record.supplier_name || '',
      contact_person: record.contact_person || '',
      contact_phone: record.contact_phone || '',
      address: record.address || '',
      supplier_type: record.supplier_type || '',
      status: record.status || 'active',
      remarks: record.remarks || '',
      create_by: record.create_by || '',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformInventory(record: any) {
    return {
      id: record.id || this.generateId(),
      harvest_record_id: record.harvest_record_id || '',
      product_code: record.product_code || '',
      crop_name: record.crop_name || '',
      variety: record.variety || '',
      stock_type: record.stock_type || 'product',
      quantity: record.quantity || 0,
      unit: record.unit || '',
      grade: record.grade || '',
      warehouse_id: record.warehouse_id || '',
      warehouse_name: record.warehouse_name || '',
      storage_location: record.storage_location || '',
      harvest_date: record.harvest_date || '',
      storage_date: record.storage_date || '',
      expiration_date: record.expiration_date || '',
      batch_code: record.batch_code || '',
      greenhouse_name: record.greenhouse_name || '',
      planting_mode: record.planting_mode || '',
      production_plan_code: record.production_plan_code || '',
      status: record.status || 'active',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformProductionPlan(record: any) {
    return {
      id: record.id || this.generateId(),
      plan_code: record.plan_code || '',
      plan_name: record.plan_name || '',
      plan_type: record.plan_type || '',
      crop_name: record.crop_name || '',
      crop_variety: record.crop_variety || '',
      greenhouse_name: record.greenhouse_name || '',
      area_name: record.area_name || '',
      planned_quantity: record.planned_quantity || 0,
      actual_quantity: record.actual_quantity || 0,
      planting_date: record.planting_date || '',
      expected_harvest_date: record.expected_harvest_date || '',
      actual_harvest_date: record.actual_harvest_date || '',
      status: record.status || 'planning',
      priority: record.priority || 'normal',
      remarks: record.remarks || '',
      create_by: record.create_by || '',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformPurchasePlan(record: any) {
    return {
      id: record.id || this.generateId(),
      plan_code: record.plan_code || '',
      plan_title: record.plan_title || '',
      plan_type: record.plan_type || '',
      department_id: record.department_id || '',
      department_name: record.department_name || '',
      applicant_id: record.applicant_id || '',
      applicant_name: record.applicant_name || '',
      apply_date: record.apply_date || '',
      expected_date: record.expected_date || '',
      supplier_id: record.supplier_id || '',
      supplier_name: record.supplier_name || '',
      total_amount: record.total_amount || 0,
      priority: record.priority || 'medium',
      status: record.status || 'draft',
      approval_status: record.approval_status || 'pending',
      remarks: record.remarks || '',
      attachments: typeof record.attachments === 'object' ? JSON.stringify(record.attachments) : record.attachments || '',
      create_by: record.create_by || '',
      create_time: record.create_time || new Date().toISOString(),
      update_time: record.update_time || new Date().toISOString(),
    };
  }

  private transformApproval(record: any) {
    return {
      id: record.id || this.generateId(),
      code: record.code || '',
      type: record.type || '',
      type_name: record.type_name || '',
      category: record.category || '',
      title: record.title || '',
      description: record.description || '',
      applicant_id: record.applicant_id || '',
      applicant_name: record.applicant_name || '',
      applicant_department: record.applicant_department || '',
      apply_date: record.apply_date || '',
      apply_time: record.apply_time || '',
      current_step: record.current_step || 1,
      total_steps: record.total_steps || 1,
      approvers: typeof record.approvers === 'object' ? JSON.stringify(record.approvers) : record.approvers || '',
      records: typeof record.records === 'object' ? JSON.stringify(record.records) : record.records || '',
      status: record.status || 'pending',
      business_link: record.business_link || '',
      attachments: typeof record.attachments === 'object' ? JSON.stringify(record.attachments) : record.attachments || '',
      priority: record.priority || 'normal',
      due_date: record.due_date || '',
      reminder_count: record.reminder_count || 0,
      related_batch_code: record.related_batch_code || '',
      related_task_ids: record.related_task_ids || '',
      notification_sent: record.notification_sent ? 1 : 0,
      amount: record.amount || '',
      materials: typeof record.materials === 'object' ? JSON.stringify(record.materials) : record.materials || '',
      workflow_id: record.workflow_id || '',
      workflow_name: record.workflow_name || '',
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private transformApprovalWorkflow(record: any) {
    return {
      id: record.id || this.generateId(),
      name: record.name || '',
      code: record.code || '',
      description: record.description || '',
      module: record.module || '',
      business_type: record.business_type || '',
      trigger_condition: record.trigger_condition || '',
      nodes: typeof record.nodes === 'object' ? JSON.stringify(record.nodes) : record.nodes || '',
      status: record.status || 'active',
      version: record.version || 1,
      created_at: record.created_at || new Date().toISOString(),
      updated_at: record.updated_at || new Date().toISOString(),
    };
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 打印迁移结果
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 迁移结果汇总');
    console.log('='.repeat(60));

    const totalRecords = this.results.reduce((sum, r) => sum + r.totalRecords, 0);
    const totalMigrated = this.results.reduce((sum, r) => sum + r.migratedRecords, 0);
    const totalFailed = this.results.reduce((sum, r) => sum + r.failedRecords, 0);
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log(`总记录数: ${totalRecords}`);
    console.log(`成功迁移: ${totalMigrated}`);
    console.log(`失败记录: ${totalFailed}`);
    console.log(`总耗时: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log('-'.repeat(60));

    this.results.forEach(r => {
      const icon = r.success ? '✅' : '❌';
      const status = r.failedRecords > 0 ? `(${r.failedRecords}失败)` : '';
      console.log(`${icon} ${r.tableName}: ${r.migratedRecords}/${r.totalRecords} ${status} (${(r.duration / 1000).toFixed(2)}s)`);
    });

    console.log('='.repeat(60));
  }
}

// 主执行
const args = process.argv.slice(2);
const config: Partial<MigrationConfig> = {
  dryRun: args.includes('--dry-run'),
  forceOverwrite: args.includes('--force'),
  batchSize: parseInt(args.find(a => a.startsWith('--batch='))?.split('=')[1] || '100'),
};

const executor = new MigrationExecutor(config);
executor.execute().catch(console.error);
