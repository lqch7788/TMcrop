/**
 * 数据迁移校验工具
 * Phase 0: 校验 localStorage 与 SQLite 数据一致性
 *
 * 功能：
 * - 校验记录数一致性
 * - 校验外键完整性
 * - 生成校验报告
 */

// API基础URL
const API_BASE_URL = 'http://localhost:3001/api';

// 校验结果接口
interface ValidationResult {
  passed: boolean;
  message: string;
  details?: {
    localCount?: number;
    sqliteCount?: number;
    issues?: any[];
  };
}

// 校验报告接口
interface ValidationReport {
  total: number;
  passed: number;
  failed: number;
  results: ValidationResult[];
}

// API路径映射
const API_ENDPOINTS: Record<string, string> = {
  crop_varieties: 'crop-varieties',
  crop_seed_sources: 'seed-sources',
  crop_seedlings: 'seedlings',
  crop_plantings: 'plantings',
  harvest_records: 'harvest',
  crop_orders: 'crop-orders',
  crop_instances: 'crop-instances',
  inventory_stock_v3: 'inventory',
  inventory_transaction_v3: 'inventory/transactions',
  inventory_freeze_v3: 'inventory/freezes',
};

class MigrationValidator {
  /**
   * 校验单表记录数一致性
   * @param tableName - SQLite表名
   * @param localStorageKey - localStorage键名
   */
  async validateRecordCount(
    tableName: string,
    localStorageKey: string
  ): Promise<ValidationResult> {
    // 获取localStorage数据
    const localData = localStorage.getItem(localStorageKey);
    const localCount = localData ? JSON.parse(localData).length : 0;

    try {
      // 调用API获取SQLite记录数
      const apiPath = API_ENDPOINTS[tableName] || tableName;
      const response = await fetch(`${API_BASE_URL}/${apiPath}/count`);

      if (!response.ok) {
        return {
          passed: false,
          message: `❌ ${tableName}: API调用失败 (${response.status})`,
        };
      }

      const result = await response.json();
      const sqliteCount = result.count || 0;

      const passed = localCount === sqliteCount;
      return {
        passed,
        message: passed
          ? `✅ ${tableName}: ${localCount} 条`
          : `❌ ${tableName}: localStorage=${localCount}, SQLite=${sqliteCount}`,
        details: { localCount, sqliteCount },
      };
    } catch (e) {
      return {
        passed: false,
        message: `❌ ${tableName}: 校验失败 - ${e}`,
      };
    }
  }

  /**
   * 校验外键完整性
   */
  async validateForeignKeys(): Promise<ValidationResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/integrity/foreign-keys`);
      const result = await response.json();
      const issues = result.issues || [];

      return {
        passed: issues.length === 0,
        message: issues.length === 0
          ? '✅ 外键关联完整'
          : `❌ 有 ${issues.length} 个外键问题`,
        details: { issues },
      };
    } catch (e) {
      return {
        passed: false,
        message: `❌ 外键校验失败: ${e}`,
      };
    }
  }

  /**
   * 校验必填字段完整性
   */
  async validateRequiredFields(): Promise<ValidationResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/integrity/required-fields`);
      const result = await response.json();
      const issues = result.issues || [];

      return {
        passed: issues.length === 0,
        message: issues.length === 0
          ? '✅ 必填字段完整'
          : `❌ 有 ${issues.length} 个必填字段问题`,
        details: { issues },
      };
    } catch (e) {
      return {
        passed: false,
        message: `❌ 必填字段校验失败: ${e}`,
      };
    }
  }

  /**
   * 校验业务规则
   */
  async validateBusinessRules(): Promise<ValidationResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/integrity/business-rules`);
      const result = await response.json();
      const violations = result.violations || [];

      return {
        passed: violations.length === 0,
        message: violations.length === 0
          ? '✅ 业务规则校验通过'
          : `❌ 有 ${violations.length} 个业务规则违规`,
        details: { violations },
      };
    } catch (e) {
      return {
        passed: false,
        message: `❌ 业务规则校验失败: ${e}`,
      };
    }
  }

  /**
   * 执行全部校验
   */
  async validateAll(): Promise<ValidationReport> {
    const results: ValidationResult[] = [];

    // 定义需要校验的数据表
    const checks = [
      { table: 'crop_varieties', key: 'crop_varieties' },
      { table: 'crop_seed_sources', key: 'crop_seed_sources' },
      { table: 'crop_seedlings', key: 'crop_seedlings' },
      { table: 'crop_plantings', key: 'crop_plantings' },
      { table: 'harvest_records', key: 'harvest_records' },
      { table: 'crop_orders', key: 'crop_orders' },
      { table: 'crop_instances', key: 'crop_instances' },
    ];

    // 逐个校验记录数
    for (const check of checks) {
      results.push(await this.validateRecordCount(check.table, check.key));
    }

    // 校验外键完整性
    results.push(await this.validateForeignKeys());

    // 校验必填字段
    results.push(await this.validateRequiredFields());

    // 校验业务规则
    results.push(await this.validateBusinessRules());

    // 统计结果
    const passedCount = results.filter(r => r.passed).length;
    return {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      results,
    };
  }

  /**
   * 快速检查：仅校验记录数
   */
  async quickCheck(): Promise<ValidationReport> {
    const results: ValidationResult[] = [];

    const checks = [
      { table: 'crop_varieties', key: 'crop_varieties' },
      { table: 'crop_seed_sources', key: 'crop_seed_sources' },
      { table: 'crop_seedlings', key: 'crop_seedlings' },
      { table: 'crop_plantings', key: 'crop_plantings' },
      { table: 'harvest_records', key: 'harvest_records' },
      { table: 'crop_orders', key: 'crop_orders' },
      { table: 'crop_instances', key: 'crop_instances' },
    ];

    for (const check of checks) {
      results.push(await this.validateRecordCount(check.table, check.key));
    }

    const passedCount = results.filter(r => r.passed).length;
    return {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
      results,
    };
  }
}

// 导出单例
export const migrationValidator = new MigrationValidator();

// 导出类
export { MigrationValidator };
export type { ValidationResult, ValidationReport };
