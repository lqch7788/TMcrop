/**
 * 2026-07-10：99 条药剂库数据迁移
 * 1. 把 pesticide_type 从单值（dictCode）转换为 JSON 数组字符串
 * 2. 根据 ingredient/functionDesc 推断二级子类（如 insecticide_chewing、fungicide_fungi）
 * 3. 保持 pesticide_code 不变（不重新生成）
 *
 * 执行方式：npm run migrate-pesticide-type
 * 干跑模式：npm run migrate-pesticide-type -- --dry-run
 */
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.resolve(__dirname, '../../data/yuanxingtu.db');
const isDryRun = process.argv.includes('--dry-run');

interface OldRecord {
  id: string;
  pesticide_code: string;
  pesticide_name: string;
  pesticide_type: string | null;
  ingredient: string | null;
  function_desc: string | null;
  mechanism: string | null;
}

/**
 * 根据药剂成分 + 功能说明推断二级子类
 * 优先级：ingredient 关键字 > functionDesc 关键字 > 一级类（保持原值）
 */
function inferSubType(oldType: string, ingredient: string, functionDesc: string): string[] {
  const result: string[] = [];

  // 转为小写便于匹配
  const ing = (ingredient || '').toLowerCase();
  const func = (functionDesc || '').toLowerCase();
  const mech = (functionDesc || '').toLowerCase(); // mechanism 也用 func 兜底

  switch (oldType) {
    case 'insecticide':
      result.push('insecticide');
      // 咀嚼式关键字：咀嚼口器、咀嚼式、咀嚼害虫
      if (/咀嚼|甲虫|鳞翅目幼虫|毛毛虫|菜青虫|棉铃虫|夜蛾|螟虫/.test(ing) ||
          /咀嚼|甲虫|鳞翅|幼虫/.test(func)) {
        result.push('insecticide_chewing');
      }
      // 刺吸式关键字：蚜虫、飞虱、粉虱、螨、蝽、蚧
      if (/蚜虫|飞虱|粉虱|蚧|蝽|刺吸|螨/.test(ing) ||
          /蚜虫|飞虱|粉虱|刺吸/.test(func)) {
        result.push('insecticide_sucking');
      }
      // 默认给一个咀嚼式（覆盖大部分鳞翅目幼虫）
      if (result.length === 1) result.push('insecticide_chewing');
      break;

    case 'fungicide':
      result.push('fungicide');
      // 真菌关键字：霜霉、白粉、锈病、炭疽、灰霉、黑斑、疫病
      if (/霜霉|白粉|锈病|炭疽|灰霉|黑斑|疫病|真菌|晚疫|早疫|枯萎|根腐|立枯|黑穗|纹枯/.test(ing) ||
          /霜霉|白粉|锈病|炭疽|灰霉|真菌|晚疫|早疫/.test(func)) {
        result.push('fungicide_fungi');
      }
      // 细菌关键字：细菌、青枯、角斑、溃疡、软腐
      if (/细菌|青枯|角斑|溃疡|软腐/.test(ing) || /细菌|青枯|角斑|溃疡/.test(func)) {
        result.push('fungicide_bacteria');
      }
      // 病毒关键字：病毒、花叶、矮化、丛枝
      if (/病毒|花叶|矮化|丛枝/.test(ing) || /病毒|花叶/.test(func)) {
        result.push('fungicide_virus');
      }
      // 默认真菌
      if (result.length === 1) result.push('fungicide_fungi');
      break;

    case 'herbicide':
      result.push('herbicide');
      break;

    case 'acaricide':
      result.push('acaricide');
      result.push('acaricide_mite');
      break;

    case 'protective':
      result.push('protective');
      // 系统性关键字：内吸
      if (/内吸|系统性/.test(ing) || /内吸|系统性/.test(func)) {
        result.push('protective_systemic');
      } else {
        result.push('protective_contact');
      }
      break;

    case 'adjuvant':
      result.push('adjuvant');
      if (/渗透|展着|润湿/.test(ing) || /渗透|展着|润湿/.test(func)) {
        result.push('adjuvant_penetration');
      } else if (/增效/.test(ing) || /增效/.test(func)) {
        result.push('adjuvant_synergist');
      } else {
        result.push('adjuvant_penetration');
      }
      break;

    case 'nematicide':
      result.push('nematicide');
      break;

    case 'other':
    default:
      result.push('other');
      break;
  }

  return result;
}

function main() {
  console.log(`[migrate-pesticide-type] 开始迁移 pesticide_type → JSON 数组`);
  console.log(`[migrate-pesticide-type] DB: ${DB_PATH}`);
  console.log(`[migrate-pesticide-type] 模式: ${isDryRun ? 'DRY-RUN（不写入）' : '实际写入'}`);

  const db = new Database(DB_PATH);

  // 验证表结构
  const columns = db.prepare("PRAGMA table_info(pesticide_library)").all() as any[];
  const hasControlType = columns.some(c => c.name === 'control_type');
  const hasPesticideType = columns.some(c => c.name === 'pesticide_type');
  console.log(`[migrate-pesticide-type] control_type 列存在: ${hasControlType}`);
  console.log(`[migrate-pesticide-type] pesticide_type 列存在: ${hasPesticideType}`);

  if (!hasPesticideType) {
    console.error('[migrate-pesticide-type] ✗ pesticide_type 列不存在，请先跑 fixMissingSchema');
    process.exit(1);
  }

  // 读取所有记录
  const records = db.prepare(
    'SELECT id, pesticide_code, pesticide_name, pesticide_type, ingredient, function_desc, mechanism FROM pesticide_library'
  ).all() as OldRecord[];
  console.log(`[migrate-pesticide-type] 读取 ${records.length} 条记录`);

  let migratedCount = 0;
  let skippedCount = 0;
  const updateStmt = db.prepare(
    'UPDATE pesticide_library SET pesticide_type = ? WHERE id = ?'
  );

  for (const record of records) {
    const oldType = record.pesticide_type;

    // 已是 JSON 数组（以 [ 开头）则跳过
    if (oldType && oldType.trim().startsWith('[')) {
      skippedCount++;
      continue;
    }

    // 空值处理：归为 other
    const types = oldType
      ? inferSubType(oldType, record.ingredient || '', record.function_desc || '')
      : ['other'];

    const newValue = JSON.stringify(types);

    if (!isDryRun) {
      updateStmt.run(newValue, record.id);
    }

    // 打印所有迁移记录
    console.log(`  ${record.pesticide_code} (${record.pesticide_name}): "${oldType}" → ${newValue}`);
    migratedCount++;
  }

  console.log(`\n[migrate-pesticide-type] === 迁移汇总 ===`);
  console.log(`  迁移: ${migratedCount} 条`);
  console.log(`  跳过（已是 JSON 数组）: ${skippedCount} 条`);
  console.log(`  模式: ${isDryRun ? 'DRY-RUN（未实际写入）' : '已写入数据库'}`);

  if (isDryRun) {
    console.log(`\n[migrate-pesticide-type] 提示：去掉 --dry-run 参数实际写入`);
  }

  db.close();
}

try {
  main();
} catch (err) {
  console.error('[migrate-pesticide-type] ✗ 迁移失败:', err);
  process.exit(1);
}