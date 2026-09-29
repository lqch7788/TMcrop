/**
 * E2E 回归验证：供应商 ID 链路（第 2 批，P0-4）
 *
 * 覆盖：
 *   T1 供应商改名 → materials / inbound_records 名称级联同步（且可回滚还原）
 *   T2 物料编辑端点可写 supplierId（此前白名单缺失 → 只改名称不改 ID）
 *   T3 删除守卫在改名后仍然生效（回归：此前改名后守卫按旧名匹配不到，会放行删除）
 *   T4 回填结果核对（supplierId 已关联 / 存量未关联的恰为跳过的测试残留）
 *
 * 用法：node server/scripts/e2e-supplier-id-link.cjs
 * 安全：全部改动在 finally 中还原；只操作既有真实数据，不新增业务单据。
 */
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');

const API = 'http://127.0.0.1:3001/api';
const SUFFIX = '-AUDIT29';

let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ❌ ${name}${detail ? ' → ' + detail : ''}`); }
}

function req(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request(`${API}${urlPath}`, {
      method,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
    }, (res) => {
      let buf = '';
      res.on('data', (c) => { buf += c; });
      res.on('end', () => {
        let parsed = null;
        try { parsed = JSON.parse(buf); } catch { parsed = { raw: buf }; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

/** 只读快照（服务端是 sql.js 内存库，此处仅用于读断言；写一律走 API） */
function openDb() { return new Database(path.join(__dirname, '..', 'data', 'yuanxingtu.db'), { readonly: true, fileMustExist: true }); }

(async () => {
  console.log('='.repeat(66));
  console.log('第 2 批 E2E：供应商 ID 链路');
  console.log('='.repeat(66));

  let db = openDb();
  const target = db.prepare("SELECT id, supplier_name FROM suppliers WHERE supplier_code = 'SU_AUTO_0013'").get();
  const otherSupplier = db.prepare("SELECT id, supplier_name FROM suppliers WHERE supplier_code = 'SUP001'").get();
  const targetName = target?.supplier_name;
  // 注意：供应商主键 id 与 supplier_code 是两列（自动建档的 id 形如 AUTO_SU_AUTO_0013），
  // 所有写端点按 id 定位，用 code 会 404。
  const targetId = target?.id;
  const sampleMaterial = db.prepare("SELECT id, code, supplier, supplierId FROM materials WHERE supplier = ? LIMIT 1").get(targetName);
  db.close();

  if (!targetId || !sampleMaterial) {
    console.error('前置数据缺失：需要 SU_AUTO_0013 供应商及其引用物料。请先确认回填迁移已执行。');
    process.exit(1);
  }
  console.log(`用例对象：供应商「${targetName}」(id=${targetId})，样例物料 ${sampleMaterial.code}(id=${sampleMaterial.id})`);

  const newName = targetName + SUFFIX;
  let renamed = false;
  let materialPatched = false;

  try {
    // ───────── T4 回填结果核对 ─────────
    console.log('\n▶ T4 回填结果核对');
    db = openDb();
    const stat = db.prepare(`SELECT
      (SELECT COUNT(*) FROM suppliers) sup,
      (SELECT COUNT(*) FROM materials WHERE supplierId IS NOT NULL AND supplierId <> '') matLinked,
      (SELECT COUNT(*) FROM materials WHERE supplier IS NOT NULL AND supplier <> '') matNamed,
      (SELECT COUNT(*) FROM inbound_records WHERE supplierId IS NOT NULL AND supplierId <> '') inbLinked,
      (SELECT COUNT(*) FROM inbound_records WHERE supplier IS NOT NULL AND supplier <> '') inbNamed
    `).get();
    const unlinked = db.prepare(`SELECT supplier AS name FROM materials
      WHERE (supplierId IS NULL OR supplierId = '') AND supplier IS NOT NULL AND supplier <> ''
      GROUP BY supplier`).all().map(r => r.name);
    db.close();

    check('materials.supplierId 已回填 > 0', stat.matLinked > 0, `${stat.matLinked}/${stat.matNamed}`);
    check('inbound_records.supplierId 已全部回填', stat.inbLinked === stat.inbNamed, `${stat.inbLinked}/${stat.inbNamed}`);
    check('未关联的名称全部为测试/损坏残留（不含正常名称）',
      unlinked.every(n => /测试|审计|^12$|�/.test(n)),
      `未关联：${unlinked.join('、')}`);

    // ───────── T1 改名级联 ─────────
    console.log('\n▶ T1 供应商改名级联');
    db = openDb();
    const beforeMatCount = db.prepare('SELECT COUNT(*) c FROM materials WHERE supplier = ?').get(targetName).c;
    const beforeInbCount = db.prepare('SELECT COUNT(*) c FROM inbound_records WHERE supplier = ?').get(targetName).c;
    db.close();
    check('前置：该供应商确有物料引用', beforeMatCount > 0, `${beforeMatCount} 行`);

    let r = await req('PUT', `/suppliers/${targetId}`, { supplier_name: newName });
    check('改名 → HTTP 200', r.status === 200, `${r.status} ${r.body?.error || ''}`);
    renamed = r.status === 200;

    db = openDb();
    const afterMatOld = db.prepare('SELECT COUNT(*) c FROM materials WHERE supplier = ?').get(targetName).c;
    const afterMatNew = db.prepare('SELECT COUNT(*) c FROM materials WHERE supplier = ?').get(newName).c;
    const afterInbNew = db.prepare('SELECT COUNT(*) c FROM inbound_records WHERE supplier = ?').get(newName).c;
    const linkedId = db.prepare('SELECT supplierId FROM materials WHERE supplier = ? LIMIT 1').get(newName)?.supplierId;
    db.close();

    check('改名后 materials 旧名归零', afterMatOld === 0, `仍有 ${afterMatOld} 行`);
    check('改名后 materials 新名到位', afterMatNew === beforeMatCount, `${afterMatNew} vs 预期 ${beforeMatCount}`);
    check('改名后 inbound_records 新名到位', afterInbNew === beforeInbCount, `${afterInbNew} vs 预期 ${beforeInbCount}`);
    check('改名后 supplierId 关联未丢', linkedId === targetId, `实际 ${linkedId}，预期 ${targetId}`);
    check('响应含级联明细', !!r.body?.renamed?.cascade, JSON.stringify(r.body?.renamed || null));

    // ───────── T3 改名后删除守卫仍生效 ─────────
    console.log('\n▶ T3 改名后删除守卫');
    r = await req('DELETE', `/suppliers/${targetId}`);
    check('被引用供应商删除 → HTTP 409 拦截', r.status === 409, `${r.status} ${r.body?.error || ''}`);
    db = openDb();
    const stillThere = db.prepare("SELECT COUNT(*) c FROM suppliers WHERE supplier_code = 'SU_AUTO_0013'").get().c;
    db.close();
    check('删除被拦后供应商仍存在', stillThere === 1);

    // ───────── T2 物料编辑可写 supplierId ─────────
    console.log('\n▶ T2 物料编辑写 supplierId');
    const originalId = sampleMaterial.supplierId || '';
    const otherId = String(otherSupplier?.id || 'SUP001');
    r = await req('PUT', `/materials/${sampleMaterial.id}`, { supplierId: otherId });
    check('PUT 物料带 supplierId → HTTP 200', r.status === 200 && r.body?.success !== false, `${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
    db = openDb();
    const wroteId = db.prepare('SELECT supplierId FROM materials WHERE id = ?').get(sampleMaterial.id)?.supplierId;
    db.close();
    check('supplierId 已落库', wroteId === otherId, `实际 ${wroteId}`);
    materialPatched = true;

    // 还原
    r = await req('PUT', `/materials/${sampleMaterial.id}`, { supplierId: originalId });
    db = openDb();
    const restoredId = db.prepare('SELECT supplierId FROM materials WHERE id = ?').get(sampleMaterial.id)?.supplierId;
    db.close();
    check('supplierId 已还原', restoredId === originalId, `实际 ${restoredId}`);
    materialPatched = restoredId !== originalId;

  } catch (e) {
    console.error('\n[脚本异常]', e);
    fail++;
    failures.push('脚本异常：' + e.message);
  } finally {
    // ───────── 还原 ─────────
    if (materialPatched) {
      await req('PUT', `/materials/${sampleMaterial.id}`, { supplierId: sampleMaterial.supplierId || '' });
    }
    if (renamed) {
      const back = await req('PUT', `/suppliers/${targetId}`, { supplier_name: targetName });
      console.log(`\n↩️  还原供应商名称：HTTP ${back.status}`);
    }
    db = openDb();
    const leftNew = db.prepare('SELECT COUNT(*) c FROM materials WHERE supplier = ?').get(newName).c
      + db.prepare('SELECT COUNT(*) c FROM inbound_records WHERE supplier = ?').get(newName).c;
    const leftSupplier = db.prepare('SELECT COUNT(*) c FROM suppliers WHERE supplier_name = ?').get(newName).c;
    const finalId = db.prepare('SELECT supplierId FROM materials WHERE id = ?').get(sampleMaterial.id)?.supplierId;
    db.close();
    check('测试痕迹已清空（无 -AUDIT29 残留）', leftNew === 0 && leftSupplier === 0, `物料/入库 ${leftNew} 行、供应商 ${leftSupplier} 行`);
    check('样例物料 supplierId 复原', finalId === (sampleMaterial.supplierId || ''), `实际 ${finalId}`);
  }

  console.log('\n' + '='.repeat(66));
  console.log(`结果：通过 ${pass} / 失败 ${fail}`);
  if (fail > 0) console.log('失败项：\n - ' + failures.join('\n - '));
  console.log('='.repeat(66));
  process.exit(fail > 0 ? 1 : 0);
})();
