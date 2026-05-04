/**
 * 修正作物品种数据错误
 * 执行方法: node fixCropVarietyData.js
 */

const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../data/yuanxingtu.db');
const db = new Database(dbPath);

console.log('开始修正作物品种数据...\n');

try {
  // 1. 修正 FR01 (草莓) 的 variety_name
  const result1 = db.prepare(`
    UPDATE crop_varieties
    SET variety_name = '草莓'
    WHERE crop_code LIKE 'FR01%'
      AND variety_code = '01'
      AND (variety_name != '草莓' OR variety_name IS NULL)
  `).run();
  console.log(`修正 FR01 (草莓): ${result1.changes} 条记录`);

  // 2. 修正 FR02 (蓝莓) 的 variety_name
  const result2 = db.prepare(`
    UPDATE crop_varieties
    SET variety_name = '蓝莓'
    WHERE crop_code LIKE 'FR02%'
      AND variety_code = '02'
      AND (variety_name != '蓝莓' OR variety_name IS NULL)
  `).run();
  console.log(`修正 FR02 (蓝莓): ${result2.changes} 条记录`);

  // 3. 修正 FR03 (树莓) 的 variety_name
  const result3 = db.prepare(`
    UPDATE crop_varieties
    SET variety_name = '树莓'
    WHERE crop_code LIKE 'FR03%'
      AND variety_code = '03'
      AND (variety_name != '树莓' OR variety_name IS NULL)
  `).run();
  console.log(`修正 FR03 (树莓): ${result3.changes} 条记录`);

  // 4. 修正 FR04 (葡萄) 的 variety_name
  const result4 = db.prepare(`
    UPDATE crop_varieties
    SET variety_name = '葡萄'
    WHERE crop_code LIKE 'FR04%'
      AND variety_code = '04'
      AND (variety_name != '葡萄' OR variety_name IS NULL)
  `).run();
  console.log(`修正 FR04 (葡萄): ${result4.changes} 条记录`);

  // 5. 修正 FR05 (猕猴桃) 的 variety_name
  const result5 = db.prepare(`
    UPDATE crop_varieties
    SET variety_name = '猕猴桃'
    WHERE crop_code LIKE 'FR05%'
      AND variety_code = '05'
      AND (variety_name != '猕猴桃' OR variety_name IS NULL)
  `).run();
  console.log(`修正 FR05 (猕猴桃): ${result5.changes} 条记录`);

  // 6. 修正 FR06 (火龙果) 的 variety_name
  const result6 = db.prepare(`
    UPDATE crop_varieties
    SET variety_name = '火龙果'
    WHERE crop_code LIKE 'FR06%'
      AND variety_code = '06'
      AND (variety_name != '火龙果' OR variety_name IS NULL)
  `).run();
  console.log(`修正 FR06 (火龙果): ${result6.changes} 条记录`);

  // 7. 修正 FR99 (其他浆果) 的 variety_name
  const result7 = db.prepare(`
    UPDATE crop_varieties
    SET variety_name = '其他浆果'
    WHERE crop_code LIKE 'FR99%'
      AND variety_code = '99'
      AND (variety_name != '其他浆果' OR variety_name IS NULL)
  `).run();
  console.log(`修正 FR99 (其他浆果): ${result7.changes} 条记录`);

  console.log('\n数据修正完成！验证结果:');

  // 验证修正结果
  const rows = db.prepare(`
    SELECT crop_code, category_name, type_name, variety_name, sub_variety1_name
    FROM crop_varieties
    WHERE category_code = 'FR'
    ORDER BY crop_code
    LIMIT 10
  `).all();

  console.log('\nFR类别品种路径示例:');
  rows.forEach(row => {
    console.log(`${row.crop_code}: ${row.category_name}-${row.type_name}-${row.variety_name}-${row.sub_variety1_name || ''}`);
  });

} catch (error) {
  console.error('修正失败:', error);
} finally {
  db.close();
}
