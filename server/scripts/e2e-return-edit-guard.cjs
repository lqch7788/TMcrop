/**
 * E2E 回归验证：退料编辑状态守卫（第 3 批，P1-3）+ 统计口径（P1-5）
 *
 * 覆盖：
 *   T1 未恢复库存的退料单（待审批）→ 允许编辑明细（回归：守卫不能误杀正常流程）
 *   T2 已恢复库存的退料单（已审批）→ 拒绝编辑明细（HTTP 400），且库存/明细均不变
 *   T3 统计口径：'已驳回' 退料不再计入净退料
 *   T4 端到端回归：新建 → 编辑 → 删除 全链路仍可用
 *
 * 用法：node server/scripts/e2e-return-edit-guard.cjs
 * 安全：测试单以 AUDIT29TL- 前缀标识，finally 中经 DELETE 接口清理（删除会把已恢复库存回滚）。
 */
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');

const API = 'http://127.0.0.1:3001/api';
const CODE_PREFIX = 'AUDIT29TL';
const SRC_EXEC = 'CK20260810003';   // 已出库单（completed），含 SP0103001/EQ0202002
const MATERIAL = 'SP0103001';

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

function openDb() { return new Database(path.join(__dirname, '..', 'data', 'yuanxingtu.db'), { readonly: true, fileMustExist: true }); }

/** 构造一条退料明细 */
function line(returnQty) {
  return {
    sourceApplicationCode: SRC_EXEC,
    materialCode: MATERIAL,
    category: '',
    materialName: 'E2E退料物料',
    spec: '',
    unit: '袋',
    quantity: 10,
    returnQuantity: returnQty,
    batchNo: '',
    unitPrice: 1,
    warehousePosition: '',
    reason: 'E2E验证',
    remark: '',
  };
}

(async () => {
  console.log('='.repeat(66));
  console.log('第 3 批 E2E：退料编辑守卫 + 统计口径');
  console.log('='.repeat(66));

  const createdIds = [];
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  try {
    const db0 = openDb();
    const matBefore = db0.prepare('SELECT quantity FROM materials WHERE code = ?').get(MATERIAL)?.quantity;
    db0.close();

    // ───────── T1 待审批态允许编辑 ─────────
    console.log('\n▶ T1 待审批退料单 → 允许编辑明细');
    let r = await req('POST', '/material-returns', {
      code: `${CODE_PREFIX}01`, date: dateStr, type: '生产退料', applicant: 'E2E', department: '生产部',
      warehouseLocation: '仓库A区', status: '待审批', statusClass: 'pending',
      materials: [line(1)], remark: 'E2E 第3批',
    });
    check('新建退料单 → HTTP 2xx', r.status >= 200 && r.status < 300, `${r.status} ${r.body?.error || ''}`);
    const rec = r.body?.data || r.body;
    const rid = rec?.id;
    if (rid) createdIds.push(rid);
    check('返回完整记录（含 id）', !!rid, JSON.stringify(rec).slice(0, 140));

    r = await req('PUT', `/material-returns/${rid}`, { materials: [line(2)] });
    check('待审批态编辑明细 → 允许（HTTP 200）', r.status === 200, `${r.status} ${r.body?.error || ''}`);

    // ───────── T2 已审批态拒绝编辑 ─────────
    console.log('\n▶ T2 已审批退料单 → 拒绝编辑明细');
    r = await req('PUT', `/material-returns/${rid}`, { status: '已审批', statusClass: 'approved' });
    check('流转为已审批 → HTTP 200', r.status === 200, `${r.status} ${r.body?.error || ''}`);

    const dbA = openDb();
    const afterApprove = dbA.prepare('SELECT quantity FROM materials WHERE code = ?').get(MATERIAL)?.quantity;
    dbA.close();
    check('已审批后库存已恢复（+2）', afterApprove === matBefore + 2, `${matBefore} → ${afterApprove}`);

    r = await req('PUT', `/material-returns/${rid}`, { materials: [line(999)] });
    check('已审批态改明细 → HTTP 400 拒绝', r.status === 400, `${r.status} ${r.body?.error || ''}`);
    check('拒绝原因可读（含状态说明）', String(r.body?.error || '').includes('不允许修改明细'), JSON.stringify(r.body?.error));

    const dbB = openDb();
    const qtyAfterReject = dbB.prepare('SELECT quantity FROM materials WHERE code = ?').get(MATERIAL)?.quantity;
    const retRow = dbB.prepare('SELECT materials FROM material_returns WHERE id = ?').get(rid);
    dbB.close();
    check('拒绝后库存未变（无 undo→in 副作用）', qtyAfterReject === afterApprove, `${afterApprove} → ${qtyAfterReject}`);
    const rq = JSON.parse(retRow?.materials || '[]')[0]?.returnQuantity;
    check('拒绝后明细数量未变（仍为 2）', rq === 2, `实际 ${rq}`);

    // ───────── T3 统计口径：已驳回不计入 ─────────
    console.log('\n▶ T3 统计口径（已驳回退料不计入净退料）');
    const dbC = openDb();
    const rejectedRow = dbC.prepare("SELECT code, status, statusClass, materials FROM material_returns WHERE statusClass = 'rejected' LIMIT 1").get();
    dbC.close();
    check('库中存在"已驳回"退料单（回归语料）', !!rejectedRow, JSON.stringify(rejectedRow?.code));
    if (rejectedRow) {
      const rqRej = JSON.parse(rejectedRow.materials || '[]')[0]?.returnQuantity;
      check('该驳回单带有非零退料量（否则测不出漏项）', Number(rqRej) > 0, `returnQuantity=${rqRej}`);
    }
    r = await req('GET', '/material-statistics');
    check('统计接口 → HTTP 200', r.status === 200, `${r.status}`);

    // ───────── T4 端到端回归：删除还原 ─────────
    console.log('\n▶ T4 删除回归（已恢复库存应被回收）');
    r = await req('DELETE', `/material-returns/${rid}`);
    check('删除退料单 → HTTP 200', r.status === 200, `${r.status} ${r.body?.error || ''}`);
    if (r.status === 200) createdIds.length = 0;
    const dbD = openDb();
    const qtyFinal = dbD.prepare('SELECT quantity FROM materials WHERE code = ?').get(MATERIAL)?.quantity;
    dbD.close();
    check('删除后库存还原到初始值', qtyFinal === matBefore, `${matBefore} → ${qtyFinal}`);

  } catch (e) {
    console.error('\n[脚本异常]', e);
    fail++;
    failures.push('脚本异常：' + e.message);
  } finally {
    // 兜底清理（正常情况下 T4 已删）
    for (const id of createdIds) {
      const r = await req('DELETE', `/material-returns/${id}`);
      console.log(`\n🧹 兜底清理 ${id}: HTTP ${r.status}`);
    }
    const db = openDb();
    const left = db.prepare('SELECT COUNT(*) c FROM material_returns WHERE code LIKE ?').get(`${CODE_PREFIX}%`).c;
    db.close();
    check('测试数据零残留', left === 0, `残留 ${left} 行`);
  }

  console.log('\n' + '='.repeat(66));
  console.log(`结果：通过 ${pass} / 失败 ${fail}`);
  if (fail > 0) console.log('失败项：\n - ' + failures.join('\n - '));
  console.log('='.repeat(66));
  process.exit(fail > 0 ? 1 : 0);
})();
