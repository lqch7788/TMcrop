/**
 * 更新供应商类型字典脚本
 * 执行方式：node server/src/db/updateSupplierType.js
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

async function main() {
  const dbPath = path.join(__dirname, '../../data/yuanxingtu.db');
  console.log('数据库路径:', dbPath);
  console.log('正在更新供应商类型字典...\n');

  const SQL = await initSqlJs();

  // 加载数据库
  let db;
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    console.error('数据库文件不存在!');
    process.exit(1);
  }

  // 0. 先查看当前数据
  console.log('=== 更新前的供应商类型 ===');
  let beforeResults = db.exec("SELECT id, dict_code, dict_label, sort_order FROM dictionaries WHERE category_code = 'supplier_type' ORDER BY id");
  if (beforeResults.length > 0) {
    console.log(`共 ${beforeResults[0].values.length} 条记录:`);
    beforeResults[0].values.forEach(row => {
      console.log(`  [${row[1]}] ${row[2]}`);
    });
  } else {
    console.log('0 条记录');
  }

  // 1. 删除现有的供应商类型字典项
  const deleteStmt = db.prepare("DELETE FROM dictionaries WHERE category_code = ?");
  deleteStmt.bind(['supplier_type']);
  deleteStmt.step();
  deleteStmt.free();
  console.log('\n=== 执行 DELETE ===');
  console.log('已删除 supplier_type 记录');

  // 2. 验证删除结果
  console.log('\n=== 验证删除结果 ===');
  let afterDeleteResults = db.exec("SELECT COUNT(*) as cnt FROM dictionaries WHERE category_code = 'supplier_type'");
  if (afterDeleteResults.length > 0) {
    console.log(`剩余 ${afterDeleteResults[0].values[0][0]} 条记录`);
  }

  // 3. 插入正确的供应商类型
  const now = new Date().toISOString();
  const supplierTypes = [
    ['D001', 'supplier_type', 'SP', '种子与种苗类', 'SP', 'blue', 1, 1, 'active', now, now],
    ['D002', 'supplier_type', 'FE', '肥料与土壤改良类', 'FE', 'green', 2, 1, 'active', now, now],
    ['D003', 'supplier_type', 'PP', '农药与植保产品类', 'PP', 'red', 3, 1, 'active', now, now],
    ['D004', 'supplier_type', 'EQ', '农业机械与设备类', 'EQ', 'orange', 4, 1, 'active', now, now],
    ['D005', 'supplier_type', 'FA', '设施农业资材类', 'FA', 'purple', 5, 1, 'active', now, now],
    ['D006', 'supplier_type', 'IR', '灌溉与水肥一体化类', 'IR', 'cyan', 6, 1, 'active', now, now],
    ['D007', 'supplier_type', 'OP', '日常劳保与劳动工具类', 'OP', 'pink', 7, 1, 'active', now, now],
    ['D008', 'supplier_type', 'PH', '仓储与物流资材类', 'PH', 'indigo', 8, 1, 'active', now, now],
    ['D009', 'supplier_type', 'TS', '检测与技术服务类', 'TS', 'teal', 9, 1, 'active', now, now],
    ['D010', 'supplier_type', 'UT', '能源与辅助耗材类', 'UT', 'yellow', 10, 1, 'active', now, now],
    ['D011', 'supplier_type', 'OT', '其他综合类', 'OT', 'gray', 11, 1, 'active', now, now],
  ];

  console.log('\n=== 插入新数据 ===');
  for (const item of supplierTypes) {
    db.run(
      "INSERT INTO dictionaries (id, category_code, dict_code, dict_label, dict_value, color, sort_order, is_default, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      item
    );
    console.log(`插入: [${item[2]}] ${item[3]}`);
  }

  // 4. 验证最终结果
  console.log('\n=== 最终验证 ===');
  const finalResults = db.exec("SELECT id, dict_code, dict_label, sort_order FROM dictionaries WHERE category_code = 'supplier_type' ORDER BY sort_order");
  if (finalResults.length > 0) {
    console.log(`共 ${finalResults.length} 条记录:`);
    finalResults[0].values.forEach(row => {
      console.log(`  ${row[3]}. [${row[1]}] ${row[2]}`);
    });
  }

  // 5. 保存数据库
  console.log('\n=== 保存数据库 ===');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
  console.log('数据库已保存到:', dbPath);
  console.log('\n更新完成！');
}

main().catch(err => {
  console.error('更新失败:', err);
  process.exit(1);
});
