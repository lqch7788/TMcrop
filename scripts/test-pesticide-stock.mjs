/**
 * 端到端测试：防治记录肥料联用库存扣减
 * 验证 4 个场景：
 * 1. 创建防治记录 → 库存扣减
 * 2. 库存不足 → 报错回滚
 * 3. 编辑记录 → delta 调整
 * 4. 删除记录 → 库存回补
 */
import { writeFileSync, readFileSync } from 'fs';

const BASE = 'http://localhost:3001';

async function api(method, path, body) {
  const url = `${BASE}${path}`;
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(url, opts);
  const text = await resp.text();
  try { return { status: resp.status, data: JSON.parse(text) }; }
  catch { return { status: resp.status, data: text }; }
}

async function getStock(specId) {
  const r = await api('GET', `/api/fertilizer-specs/${specId}`);
  return r.data?.data?.stockQuantity;
}

async function getFirstPesticide() {
  const r = await api('GET', '/api/pesticide-library?limit=1');
  return r.data?.data?.[0];
}

function logResult(label, ok, detail) {
  const tag = ok ? '✅ PASS' : '❌ FAIL';
  console.log(`${tag} ${label}`);
  if (detail) console.log(`   ${detail}`);
  return ok;
}

async function main() {
  console.log('========== 防治记录肥料联用库存扣减 - 端到端测试 ==========\n');

  // === 准备：取一个 spec + 一个药剂 ===
  const SPEC_ID = 'fs-1783843117776-000204';  // 硝酸钙，库存 96 kg
  const SPEC_NAME = '硝酸钙';
  const pest = await getFirstPesticide();
  if (!pest) {
    console.error('无法获取药剂，跳过测试');
    process.exit(1);
  }
  console.log(`测试用 spec: ${SPEC_ID} (${SPEC_NAME})`);
  console.log(`测试用 pesticide: ${pest.id} (${pest.pesticideName})\n`);

  const stockBefore = await getStock(SPEC_ID);
  console.log(`硝酸钙 初始库存: ${stockBefore} kg\n`);

  // ==========================================
  // 测试 1: 创建防治记录 → 库存扣减
  // ==========================================
  console.log('=== 测试 1: 创建防治记录 → 应扣库存 5kg ===');
  const DOSAGE = 5;
  const t1Body = {
    spray_time: '2026-07-17 16:00',
    crop_name: '测试作物-扣库存',
    greenhouse_name: '测试区',
    pesticide_id: pest.id,
    pesticide_name: pest.pesticideName,
    pesticide_list: JSON.stringify([{
      name: pest.pesticideName,
      pesticideId: pest.id,
      dosage: '100',
      unit: 'g',
    }]),
    leaf_fertilizer_list: JSON.stringify([{
      specId: SPEC_ID,
      fertilizerName: SPEC_NAME,
      fertilizerType: 'trace',
      dosage: DOSAGE,
      unit: 'kg',
      unitPrice: 15,
    }]),
  };
  const t1 = await api('POST', '/api/pest-records', t1Body);
  let allOk = true;
  allOk &= logResult('POST 创建防治记录', t1.data?.success, `recordCode=${t1.data?.data?.recordCode}, id=${t1.data?.data?.id}`);
  const recordId = t1.data?.data?.id;
  writeFileSync('/tmp/test_record_id.txt', recordId || '');

  const stockAfterCreate = await getStock(SPEC_ID);
  allOk &= logResult('库存扣减 5kg', stockBefore - stockAfterCreate === DOSAGE,
    `扣减前 ${stockBefore} → 扣减后 ${stockAfterCreate}（差 ${stockBefore - stockAfterCreate}）`);

  // 验证 leaf_fertilizer_list JSON 池里有完整信息（肥料名称、用量、用在哪）
  const leafList = t1.data?.data?.leafFertilizerList;
  if (Array.isArray(leafList) && leafList.length > 0) {
    const first = leafList[0];
    const hasFullInfo = first?.specId === SPEC_ID &&
                       first?.fertilizerName === SPEC_NAME &&
                       Number(first?.dosage) === DOSAGE;
    allOk &= logResult('叶面肥料池记录完整', hasFullInfo,
      `池首条: specId=${first?.specId}, name=${first?.fertilizerName}, dosage=${first?.dosage}${first?.unit}, type=${first?.fertilizerType}`);
  } else {
    allOk &= logResult('叶面肥料池存在', false, `leafFertilizerList=${JSON.stringify(leafList)}`);
  }
  // 验证 crop_name / greenhouse_name（用在哪）
  allOk &= logResult('记录包含"用在哪"信息',
    t1.data?.data?.cropName === '测试作物-扣库存' && t1.data?.data?.greenhouseName === '测试区',
    `cropName=${t1.data?.data?.cropName}, greenhouseName=${t1.data?.data?.greenhouseName}`);
  console.log('');

  // ==========================================
  // 测试 2: 库存不足 → 报错回滚
  // ==========================================
  console.log('=== 测试 2: 库存不足 → 应返回 INSUFFICIENT_STOCK 错误 ===');
  const t2Body = {
    ...t1Body,
    leaf_fertilizer_list: JSON.stringify([{
      specId: SPEC_ID,
      fertilizerName: SPEC_NAME,
      fertilizerType: 'trace',
      dosage: 99999,  // 远超库存 91
      unit: 'kg',
    }]),
  };
  const t2 = await api('POST', '/api/pest-records', t2Body);
  allOk &= logResult('库存不足 → POST 应失败', !t2.data?.success && t2.status === 400,
    `status=${t2.status}, error=${t2.data?.error}, code=${t2.data?.code}`);
  const stockAfterFail = await getStock(SPEC_ID);
  allOk &= logResult('库存不足时事务回滚（库存不变）', stockAfterFail === stockAfterCreate,
    `扣减前 ${stockAfterCreate} → 失败后 ${stockAfterFail}（应相同）`);
  console.log('');

  // ==========================================
  // 测试 3: 编辑记录 → delta 调整
  // ==========================================
  console.log('=== 测试 3: 编辑记录 → 肥料用量从 5kg → 8kg（应再扣 3kg） ===');
  const t3Body = {
    crop_name: '测试作物-扣库存-已编辑',
    leaf_fertilizer_list: JSON.stringify([{
      specId: SPEC_ID,
      fertilizerName: SPEC_NAME,
      fertilizerType: 'trace',
      dosage: 8,  // 5 → 8，应再扣 3
      unit: 'kg',
    }]),
  };
  const t3 = await api('PUT', `/api/pest-records/${recordId}`, t3Body);
  allOk &= logResult('PUT 编辑成功', t3.data?.success, `新 cropName=${t3.data?.data?.cropName}`);
  const stockAfterEdit = await getStock(SPEC_ID);
  allOk &= logResult('delta 调整：再扣 3kg', stockAfterCreate - stockAfterEdit === 3,
    `${stockAfterCreate} → ${stockAfterEdit}（差 ${stockAfterCreate - stockAfterEdit}）`);
  console.log('');

  // ==========================================
  // 测试 4: 删除记录 → 库存回补 8kg
  // ==========================================
  console.log('=== 测试 4: 删除记录 → 应回补 8kg ===');
  const t4 = await api('DELETE', `/api/pest-records/${recordId}`);
  allOk &= logResult('DELETE 成功', t4.data?.success);
  const stockAfterDelete = await getStock(SPEC_ID);
  allOk &= logResult('库存回补 8kg', stockAfterDelete - stockAfterEdit === 8,
    `${stockAfterEdit} → ${stockAfterDelete}（差 ${stockAfterDelete - stockAfterEdit}）`);
  allOk &= logResult('库存完全恢复（应等于初始）', stockAfterDelete === stockBefore,
    `初始 ${stockBefore} → 最终 ${stockAfterDelete}`);
  console.log('');

  console.log('========== 总结 ==========');
  if (allOk) {
    console.log('✅ 所有测试通过！');
    process.exit(0);
  } else {
    console.log('❌ 部分测试失败');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('测试脚本异常:', e);
  process.exit(2);
});