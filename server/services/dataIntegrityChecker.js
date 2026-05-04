/**
 * 数据一致性校验脚本
 * Phase 2: 定时校验 SQLite 与 localStorage 数据一致性
 *
 * 校验内容：
 * - 记录数一致性
 * - 外键完整性
 * - 必填字段完整性
 * - 业务规则校验
 */

const fs = require('fs');
const path = require('path');

// 数据库路径
const DB_PATH = path.join(__dirname, '../data/TMcrop.db');

// 校验配置
const CONFIG = {
  // 校验模块
  modules: [
    'crop_varieties',
    'seed_sources',
    'seedlings',
    'plantings',
    'harvest_records',
    'crop_instances',
    'crop_orders',
    'departments',
    'positions',
    'teams',
    'warehouses',
    'greenhouses',
    'zones',
    'blocks'
  ],

  // 外键关系表
  foreignKeys: [
    { table: 'seedlings', column: 'source_id', refTable: 'seed_sources', refColumn: 'id' },
    { table: 'plantings', column: 'source_id', refTable: 'seed_sources', refColumn: 'id' },
    { table: 'plantings', column: 'seedling_id', refTable: 'seedlings', refColumn: 'id' },
    { table: 'plantings', column: 'greenhouse_id', refTable: 'greenhouses', refColumn: 'id' },
    { table: 'plantings', column: 'block_id', refTable: 'blocks', refColumn: 'id' },
    { table: 'harvest_records', column: 'source_id', refTable: 'seed_sources', refColumn: 'id' },
    { table: 'harvest_records', column: 'plant_id', refTable: 'plantings', refColumn: 'id' },
    { table: 'crop_instances', column: 'order_id', refTable: 'crop_orders', refColumn: 'id' },
    { table: 'crop_instances', column: 'source_id', refTable: 'seed_sources', refColumn: 'id' },
    { table: 'crop_instances', column: 'greenhouse_id', refTable: 'greenhouses', refColumn: 'id' },
    { table: 'departments', column: 'parent_oid', refTable: 'departments', refColumn: 'oid' },
    { table: 'positions', column: 'department_oid', refTable: 'departments', refColumn: 'oid' },
    { table: 'teams', column: 'department_oid', refTable: 'departments', refColumn: 'oid' },
    { table: 'teams', column: 'leader_id', refTable: 'staff', refColumn: 'id' },
    { table: 'zones', column: 'greenhouse_oid', refTable: 'greenhouses', refColumn: 'oid' },
    { table: 'blocks', column: 'zone_oid', refTable: 'zones', refColumn: 'oid' },
    { table: 'blocks', column: 'base_oid', refTable: 'bases', refColumn: 'oid' }
  ],

  // 必填字段
  requiredFields: {
    crop_varieties: ['id', 'crop_code', 'variety_name'],
    seed_sources: ['id', 'seed_code', 'crop_name'],
    seedlings: ['id', 'batch_code', 'source_id', 'crop_name'],
    plantings: ['id', 'plant_code', 'source_id', 'crop_name'],
    harvest_records: ['id', 'harvest_code', 'source_id', 'crop_name'],
    crop_instances: ['id', 'instance_code', 'crop_name'],
    crop_orders: ['id', 'order_code', 'customer_name'],
    departments: ['id', 'oid', 'name'],
    positions: ['id', 'oid', 'name', 'code'],
    teams: ['id', 'oid', 'team_name'],
    warehouses: ['id', 'oid', 'name', 'code'],
    greenhouses: ['id', 'oid', 'name', 'code'],
    zones: ['id', 'oid', 'zone_name', 'zone_code'],
    blocks: ['id', 'oid', 'block_name', 'block_code']
  }
};

class DataIntegrityChecker {
  constructor() {
    this.results = [];
    this.db = null;
  }

  /**
   * 初始化数据库连接
   */
  initDatabase() {
    try {
      const Database = require('better-sqlite3');
      this.db = new Database(DB_PATH, { readonly: true });
      console.log('[Integrity] 数据库连接成功');
      return true;
    } catch (error) {
      console.error('[Integrity] 数据库连接失败:', error.message);
      return false;
    }
  }

  /**
   * 关闭数据库连接
   */
  closeDatabase() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 校验记录数
   */
  checkRecordCounts() {
    console.log('\n[Integrity] 校验记录数...');

    const results = [];

    for (const table of CONFIG.modules) {
      try {
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${table}`);
        const result = stmt.get();
        const count = result?.count || 0;

        results.push({
          table,
          count,
          status: count > 0 ? 'ok' : 'warning',
          message: count > 0 ? `正常 (${count} 条)` : '表为空'
        });

        console.log(`  ${table}: ${count} 条`);
      } catch (error) {
        results.push({
          table,
          count: 0,
          status: 'error',
          message: error.message
        });
        console.error(`  ${table}: 错误 - ${error.message}`);
      }
    }

    return results;
  }

  /**
   * 校验外键完整性
   */
  checkForeignKeys() {
    console.log('\n[Integrity] 校验外键完整性...');

    const results = [];

    for (const fk of CONFIG.foreignKeys) {
      try {
        // 查找孤儿记录
        const query = `
          SELECT COUNT(*) as count FROM ${fk.table}
          WHERE ${fk.column} IS NOT NULL
          AND ${fk.column} NOT IN (
            SELECT ${fk.refColumn} FROM ${fk.refTable}
          )
        `;

        const stmt = this.db.prepare(query);
        const result = stmt.get();
        const orphanCount = result?.count || 0;

        if (orphanCount > 0) {
          results.push({
            table: fk.table,
            column: fk.column,
            refTable: fk.refTable,
            orphanCount,
            status: 'error',
            message: `发现 ${orphanCount} 条孤儿记录`
          });
          console.error(`  ${fk.table}.${fk.column}: ${orphanCount} 条孤儿记录`);
        } else {
          results.push({
            table: fk.table,
            column: fk.column,
            refTable: fk.refTable,
            orphanCount: 0,
            status: 'ok',
            message: '正常'
          });
          console.log(`  ${fk.table}.${fk.column}: 正常`);
        }
      } catch (error) {
        results.push({
          table: fk.table,
          column: fk.column,
          refTable: fk.refTable,
          orphanCount: -1,
          status: 'error',
          message: error.message
        });
        console.error(`  ${fk.table}.${fk.column}: 错误 - ${error.message}`);
      }
    }

    return results;
  }

  /**
   * 校验必填字段
   */
  checkRequiredFields() {
    console.log('\n[Integrity] 校验必填字段...');

    const results = [];

    for (const [table, fields] of Object.entries(CONFIG.requiredFields)) {
      try {
        // 检查表是否存在
        const tableExists = this.db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
        ).get(table);

        if (!tableExists) {
          results.push({
            table,
            status: 'error',
            message: '表不存在'
          });
          continue;
        }

        // 检查每条记录的必填字段
        const whereClause = fields.map(f => `${f} IS NULL`).join(' OR ');
        const query = `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`;

        const stmt = this.db.prepare(query);
        const result = stmt.get();
        const nullCount = result?.count || 0;

        if (nullCount > 0) {
          results.push({
            table,
            nullFields: fields,
            nullCount,
            status: 'error',
            message: `发现 ${nullCount} 条记录必填字段为空`
          });
          console.error(`  ${table}: ${nullCount} 条记录必填字段为空`);
        } else {
          results.push({
            table,
            nullFields: fields,
            nullCount: 0,
            status: 'ok',
            message: '正常'
          });
          console.log(`  ${table}: 正常`);
        }
      } catch (error) {
        results.push({
          table,
          status: 'error',
          message: error.message
        });
        console.error(`  ${table}: 错误 - ${error.message}`);
      }
    }

    return results;
  }

  /**
   * 校验业务规则
   */
  checkBusinessRules() {
    console.log('\n[Integrity] 校验业务规则...');

    const results = [];

    // 规则1: 种源数量不能为负
    try {
      const query = 'SELECT COUNT(*) as count FROM seed_sources WHERE quantity < 0';
      const result = this.db.prepare(query).get();
      const count = result?.count || 0;

      if (count > 0) {
        results.push({ rule: 'seed_quantity_negative', count, status: 'error' });
        console.error(`  种源数量为负: ${count} 条`);
      } else {
        results.push({ rule: 'seed_quantity_negative', count: 0, status: 'ok' });
        console.log('  种源数量为负: 正常');
      }
    } catch (error) {
      console.error(`  种源数量校验: 错误 - ${error.message}`);
    }

    // 规则2: 育苗批次必须关联有效种源
    try {
      const query = `
        SELECT COUNT(*) as count FROM seedlings s
        WHERE s.source_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM seed_sources ss WHERE ss.id = s.source_id)
      `;
      const result = this.db.prepare(query).get();
      const count = result?.count || 0;

      if (count > 0) {
        results.push({ rule: 'seedling_invalid_source', count, status: 'error' });
        console.error(`  育苗关联无效种源: ${count} 条`);
      } else {
        results.push({ rule: 'seedling_invalid_source', count: 0, status: 'ok' });
        console.log('  育苗关联无效种源: 正常');
      }
    } catch (error) {
      console.error(`  育苗关联校验: 错误 - ${error.message}`);
    }

    // 规则3: 种植日期不能晚于采收日期
    try {
      const query = `
        SELECT COUNT(*) as count FROM plantings p
        INNER JOIN harvest_records h ON h.plant_id = p.id
        WHERE p.plant_date > h.harvest_date
      `;
      const result = this.db.prepare(query).get();
      const count = result?.count || 0;

      if (count > 0) {
        results.push({ rule: 'plant_after_harvest', count, status: 'error' });
        console.error(`  种植日期晚于采收: ${count} 条`);
      } else {
        results.push({ rule: 'plant_after_harvest', count: 0, status: 'ok' });
        console.log('  种植日期晚于采收: 正常');
      }
    } catch (error) {
      console.error(`  种植采收日期校验: 错误 - ${error.message}`);
    }

    // 规则4: 订单deadline不能早于创建日期
    try {
      const query = `
        SELECT COUNT(*) as count FROM crop_orders
        WHERE deadline < create_time
      `;
      const result = this.db.prepare(query).get();
      const count = result?.count || 0;

      if (count > 0) {
        results.push({ rule: 'order_deadline_before_create', count, status: 'error' });
        console.error(`  订单deadline早于创建: ${count} 条`);
      } else {
        results.push({ rule: 'order_deadline_before_create', count: 0, status: 'ok' });
        console.log('  订单deadline早于创建: 正常');
      }
    } catch (error) {
      console.error(`  订单日期校验: 错误 - ${error.message}`);
    }

    return results;
  }

  /**
   * 运行全部校验
   */
  async runAllChecks() {
    console.log('='.repeat(60));
    console.log('🔍 数据一致性校验开始');
    console.log('='.repeat(60));

    if (!this.initDatabase()) {
      return {
        success: false,
        message: '数据库连接失败'
      };
    }

    const report = {
      timestamp: new Date().toISOString(),
      recordCounts: [],
      foreignKeys: [],
      requiredFields: [],
      businessRules: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    try {
      // 执行各项校验
      report.recordCounts = this.checkRecordCounts();
      report.foreignKeys = this.checkForeignKeys();
      report.requiredFields = this.checkRequiredFields();
      report.businessRules = this.checkBusinessRules();

      // 统计
      const allResults = [
        ...report.recordCounts,
        ...report.foreignKeys,
        ...report.requiredFields,
        ...report.businessRules
      ];

      report.summary.total = allResults.length;
      report.summary.passed = allResults.filter(r => r.status === 'ok').length;
      report.summary.failed = allResults.filter(r => r.status === 'error').length;
      report.summary.warnings = allResults.filter(r => r.status === 'warning').length;

    } catch (error) {
      console.error('[Integrity] 校验过程出错:', error);
      report.error = error.message;
    } finally {
      this.closeDatabase();
    }

    // 打印汇总
    console.log('\n' + '='.repeat(60));
    console.log('📊 校验结果汇总');
    console.log('='.repeat(60));
    console.log(`总检查项: ${report.summary.total}`);
    console.log(`✅ 通过: ${report.summary.passed}`);
    console.log(`❌ 失败: ${report.summary.failed}`);
    console.log(`⚠️ 警告: ${report.summary.warnings}`);

    if (report.summary.failed > 0) {
      console.log('\n失败项:');
      const failedItems = [
        ...report.foreignKeys.filter(r => r.status === 'error'),
        ...report.requiredFields.filter(r => r.status === 'error'),
        ...report.businessRules.filter(r => r.status === 'error')
      ];
      failedItems.forEach(item => {
        console.log(`  - ${item.table || item.rule}: ${item.message || item.orphanCount + '条孤儿记录'}`);
      });
    }

    console.log('='.repeat(60));
    console.log(`校验完成: ${report.timestamp}`);

    return report;
  }

  /**
   * 保存校验报告
   */
  saveReport(report) {
    const reportPath = path.join(__dirname, '../../data/integrity_report.json');

    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`[Integrity] 报告已保存: ${reportPath}`);
      return reportPath;
    } catch (error) {
      console.error('[Integrity] 保存报告失败:', error.message);
      return null;
    }
  }
}

// 导出
module.exports = DataIntegrityChecker;
