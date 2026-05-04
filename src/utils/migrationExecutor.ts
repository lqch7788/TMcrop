/**
 * 数据迁移执行器
 * Phase 1: 将数据从 localStorage 迁移到 SQLite API
 *
 * 功能：
 * - 批量迁移数据到后端API
 * - 支持按批次顺序迁移
 * - 自动校验迁移结果
 */

import { migrationValidator } from './migrationValidator';

// API基础URL
const API_BASE_URL = 'http://localhost:3001/api';

// 迁移结果接口
interface MigrationResult {
  success: boolean;
  message: string;
  details?: {
    successCount: number;
    failCount: number;
    totalCount: number;
    sqliteCount: number;
    errors: string[];
  };
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

// 批次定义
interface MigrationBatch {
  name: string;
  storageKey: string;
  apiEndpoint: string;
  dependencies: string[];
}

const MIGRATION_BATCHES: MigrationBatch[] = [
  { name: 'Batch 1: 品种库', storageKey: 'crop_varieties', apiEndpoint: 'crop-varieties', dependencies: [] },
  { name: 'Batch 2: 种源', storageKey: 'crop_seed_sources', apiEndpoint: 'seed-sources', dependencies: ['crop_varieties'] },
  { name: 'Batch 3: 育苗', storageKey: 'crop_seedlings', apiEndpoint: 'seedlings', dependencies: ['crop_seed_sources'] },
  { name: 'Batch 4: 种植', storageKey: 'crop_plantings', apiEndpoint: 'plantings', dependencies: ['crop_seed_sources', 'crop_seedlings'] },
  { name: 'Batch 5: 采收', storageKey: 'harvest_records', apiEndpoint: 'harvest', dependencies: ['crop_plantings'] },
  { name: 'Batch 6: 订单', storageKey: 'crop_orders', apiEndpoint: 'crop-orders', dependencies: ['crop_varieties'] },
  { name: 'Batch 7: 实例', storageKey: 'crop_instances', apiEndpoint: 'crop-instances', dependencies: ['crop_seed_sources', 'crop_seedlings', 'crop_plantings'] },
];

class MigrationExecutor {
  private validator = migrationValidator;
  private migrationLog: Array<{ batch: string; result: MigrationResult }> = [];

  /**
   * 执行完整迁移
   */
  async execute(): Promise<void> {
    console.log('='.repeat(50));
    console.log('🚀 数据迁移开始');
    console.log('='.repeat(50));

    // 清空迁移日志
    this.migrationLog = [];

    // 按批次执行迁移
    for (const batch of MIGRATION_BATCHES) {
      console.log(`\n📦 ${batch.name}...`);
      const result = await this.migrateBatch(batch);
      this.migrationLog.push({ batch: batch.name, result });

      if (!result.success) {
        console.error(`\n❌ ${batch.name} 失败: ${result.message}`);
        break;
      }
    }

    // 校验
    console.log('\n🔍 执行校验...');
    const report = await this.validator.validateAll();

    console.log('\n' + '='.repeat(50));
    console.log('📊 迁移报告');
    console.log('='.repeat(50));
    console.log(`总检查项: ${report.total}`);
    console.log(`✅ 通过: ${report.passed}`);
    console.log(`❌ 失败: ${report.failed}`);

    if (report.failed > 0) {
      console.log('\n失败项:');
      report.results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.message}`);
      });
    }

    // 打印迁移日志
    console.log('\n📋 迁移日志:');
    for (const log of this.migrationLog) {
      const status = log.result.success ? '✅' : '❌';
      console.log(`  ${status} ${log.batch}: ${log.result.message}`);
    }

    if (report.failed === 0) {
      console.log('\n✅ 迁移完成！所有数据已迁移到 SQLite');
    } else {
      console.log('\n⚠️ 迁移完成，但有校验未通过。请检查上方失败项。');
    }

    console.log('='.repeat(50));
  }

  /**
   * 执行单个批次迁移
   */
  private async migrateBatch(batch: MigrationBatch): Promise<MigrationResult> {
    const localData = localStorage.getItem(batch.storageKey);

    if (!localData) {
      return {
        success: true,
        message: '无数据（跳过）',
        details: { successCount: 0, failCount: 0, totalCount: 0, sqliteCount: 0, errors: [] },
      };
    }

    const items = JSON.parse(localData);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // 逐条迁移
    for (const item of items) {
      try {
        const response = await fetch(`${API_BASE_URL}/${batch.apiEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item)
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          const errorText = await response.text();
          errors.push(`${item.id || item.code || 'unknown'}: ${response.status} - ${errorText}`.slice(0, 100));
        }
      } catch (e) {
        failCount++;
        errors.push(`${item.id || item.code || 'unknown'}: ${e}`.slice(0, 100));
      }
    }

    // 获取SQLite当前数量
    let sqliteCount = 0;
    try {
      const countResponse = await fetch(`${API_BASE_URL}/${batch.apiEndpoint}/count`);
      if (countResponse.ok) {
        const countResult = await countResponse.json();
        sqliteCount = countResult.count || 0;
      }
    } catch {
      // 忽略计数错误
    }

    console.log(`  成功 ${successCount}, 失败 ${failCount}, SQLite当前: ${sqliteCount} 条`);

    return {
      success: failCount === 0,
      message: `成功 ${successCount}, 失败 ${failCount}`,
      details: {
        successCount,
        failCount,
        totalCount: items.length,
        sqliteCount,
        errors: errors.slice(0, 10), // 最多显示10条错误
      },
    };
  }

  /**
   * 迁移单个批次（供外部调用）
   */
  async migrateSingleBatch(storageKey: string): Promise<MigrationResult> {
    const batch = MIGRATION_BATCHES.find(b => b.storageKey === storageKey);
    if (!batch) {
      return {
        success: false,
        message: `未找到批次: ${storageKey}`,
      };
    }

    return this.migrateBatch(batch);
  }

  /**
   * 获取迁移进度
   */
  getProgress(): { completed: number; total: number; batches: { name: string; status: string }[] } {
    const batches = this.migrationLog.map(log => ({
      name: log.batch,
      status: log.result.success ? '完成' : '失败',
    }));

    return {
      completed: this.migrationLog.filter(l => l.result.success).length,
      total: MIGRATION_BATCHES.length,
      batches,
    };
  }

  /**
   * 重置迁移状态（清空日志）
   */
  reset(): void {
    this.migrationLog = [];
    console.log('[MigrationExecutor] 已重置迁移状态');
  }
}

// 导出单例
export const migrationExecutor = new MigrationExecutor();

// 导出类
export { MigrationExecutor };
export type { MigrationResult, MigrationBatch };
