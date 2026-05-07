/**
 * 数据一致性校验脚本
 * 检测数据库中可能的数据不一致问题
 */

import { getDatabase } from '../db';
import { saveDatabase } from '../db';

interface CheckResult {
  check: string;
  passed: boolean;
  issues: string[];
}

export function runDataIntegrityChecks(): CheckResult[] {
  const db = getDatabase();
  const results: CheckResult[] = [];

  // 1. 检查外键引用一致性（模拟检查）
  try {
    const orphanBatches = db.exec(`SELECT p.* FROM plantings p LEFT JOIN crop_varieties c ON p.crop_variety_id = c.id WHERE c.id IS NULL AND p.crop_variety_id IS NOT NULL`);
    results.push({
      check: '种植批次作物品种引用一致性',
      passed: orphanBatches.length === 0 || orphanBatches[0].values.length === 0,
      issues: orphanBatches.length > 0 && orphanBatches[0].values.length > 0
        ? [`发现 ${orphanBatches[0].values.length} 条种植记录引用了不存在的作物品种`]
        : [],
    });
  } catch (e) {
    results.push({ check: '种植批次作物品种引用一致性', passed: false, issues: [String(e)] });
  }

  // 2. 检查库存数量非负
  try {
    const negativeStock = db.exec(`SELECT id, product_name FROM produce_inventories WHERE quantity < 0`);
    results.push({
      check: '库存数量非负',
      passed: negativeStock.length === 0 || negativeStock[0].values.length === 0,
      issues: negativeStock.length > 0 && negativeStock[0].values.length > 0
        ? [`发现 ${negativeStock[0].values.length} 条库存记录数量为负`]
        : [],
    });
  } catch (e) {
    results.push({ check: '库存数量非负', passed: false, issues: [String(e)] });
  }

  // 3. 检查员工编码唯一性
  try {
    const dupStaff = db.exec(`SELECT staff_code, COUNT(*) as cnt FROM staff WHERE status = 'active' GROUP BY staff_code HAVING cnt > 1`);
    results.push({
      check: '员工编码唯一性',
      passed: dupStaff.length === 0 || dupStaff[0].values.length === 0,
      issues: dupStaff.length > 0 && dupStaff[0].values.length > 0
        ? [`发现 ${dupStaff[0].values.length} 个重复的员工编码`]
        : [],
    });
  } catch (e) {
    results.push({ check: '员工编码唯一性', passed: false, issues: [String(e)] });
  }

  // 4. 检查请假时间有效性
  try {
    const invalidLeave = db.exec(`SELECT id FROM leave_records WHERE end_date < start_date`);
    results.push({
      check: '请假时间有效性',
      passed: invalidLeave.length === 0 || invalidLeave[0].values.length === 0,
      issues: invalidLeave.length > 0 && invalidLeave[0].values.length > 0
        ? [`发现 ${invalidLeave[0].values.length} 条请假记录的结束时间早于开始时间`]
        : [],
    });
  } catch (e) {
    results.push({ check: '请假时间有效性', passed: false, issues: [String(e)] });
  }

  // 5. 检查物料使用数量非负
  try {
    const negativeUsage = db.exec(`SELECT id FROM material_usages WHERE quantity_used < 0`);
    results.push({
      check: '物料使用数量非负',
      passed: negativeUsage.length === 0 || negativeUsage[0].values.length === 0,
      issues: negativeUsage.length > 0 && negativeUsage[0].values.length > 0
        ? [`发现 ${negativeUsage[0].values.length} 条物料使用记录数量为负`]
        : [],
    });
  } catch (e) {
    results.push({ check: '物料使用数量非负', passed: false, issues: [String(e)] });
  }

  return results;
}

// CLI 执行入口
if (require.main === module) {
  console.log('[DataIntegrity] 开始数据一致性校验...\n');
  const results = runDataIntegrityChecks();
  let allPassed = true;
  results.forEach(r => {
    console.log(`[${r.passed ? '✓' : '✗'}] ${r.check}`);
    if (!r.passed) {
      allPassed = false;
      r.issues.forEach(i => console.log(`   - ${i}`));
    }
  });
  console.log(`\n[DataIntegrity] 校验完成，${allPassed ? '全部通过' : '发现异常'}`);
  process.exit(allPassed ? 0 : 1);
}

export default runDataIntegrityChecks;
