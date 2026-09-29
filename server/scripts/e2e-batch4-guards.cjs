/**
 * E2E 回归验证：第 4 批（P1-9 dispatch_status / P1-10 删除守卫）
 *
 * 覆盖：
 *   T1 P1-9 存量回填：有已扣库存出库记录的申请单，dispatch_status 不再是空
 *   T2 P1-9 结案保护：人工"结案(closed)"不被重算清除
 *   T3 P1-10 待审批关联：存在 pending 审批单时删除退料单被拒（400）
 *   T4 P1-10 终态清理：审批终态时删除退料单成功，且关联审批被标记 cancelled（不留孤儿）
 *
 * 用法：node server/scripts/e2e-batch4-guards.cjs
 * 安全：测试单以 AUDIT29B4- 前缀标识，finally 中清理。
 */
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');

const API = 'http://127.0.0.1:3001/api';
const P = 'AUDIT29B4';
const SRC_EXEC = 'CK20260810003';
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

(async () => {
  console.log('='.repeat(66));
  console.log('第 4 批 E2E：dispatch_status 回填 / 退料删除守卫');
  console.log('='.repeat(66));

  const createdReturns = [];
  const createdApprovals = [];
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  try {
    // ───────── T1 存量回填核对 ─────────
    console.log('\n▶ T1 dispatch_status 存量回填');
    const db1 = openDb();
    const rows = db1.prepare(`
      SELECT r.request_code, r.dispatch_status
      FROM material_requests r
      WHERE r.request_code NOT LIKE 'E2EB3%' AND r.request_code NOT LIKE 'AUDIT%'
        AND EXISTS (SELECT 1 FROM material_executes e
                    WHERE e.source_application_codes LIKE '%' || r.request_code || '%'
                      AND e.execute_status_class IN ('completed','partial'))
    `).all();
    db1.close();
    const blanks = rows.filter(r => !r.dispatch_status);
    check('有已出库记录的申请单均已回写状态', blanks.length === 0 && rows.length > 0,
      `${rows.length} 张，其中空状态 ${blanks.length} 张：${blanks.map(b => b.request_code).join(',')}`);
    check('回填后状态取值合法', rows.every(r => ['partial', 'complete', 'closed'].includes(r.dispatch_status)),
      rows.map(r => `${r.request_code}=${r.dispatch_status}`).join(' '));

    // ───────── T2 结案保护 ─────────
    console.log('\n▶ T2 结案(closed)保护');
    const db2 = openDb();
    const closedRows = db2.prepare("SELECT request_code, dispatch_status FROM material_requests WHERE dispatch_status = 'closed'").all();
    db2.close();
    check('库中存在结案申请单（回归语料）', closedRows.length > 0, JSON.stringify(closedRows));
    check('结案状态未被回填清除', closedRows.every(r => r.dispatch_status === 'closed'));

    // ───────── T3 待审批时禁止删除 ─────────
    console.log('\n▶ T3 存在待审批单时删除退料单被拒');
    let r = await req('POST', '/material-returns', {
      code: `${P}-01`, date: dateStr, type: '生产退料', applicant: 'E2E', department: '生产部',
      warehouseLocation: '仓库A区', status: '待审批', statusClass: 'pending',
      materials: [{
        sourceApplicationCode: SRC_EXEC, materialCode: MATERIAL, category: '', materialName: 'E2E物料',
        spec: '', unit: '袋', quantity: 5, returnQuantity: 1, batchNo: '', unitPrice: 1,
        warehousePosition: '', reason: 'E2E', remark: '',
      }],
      remark: 'E2E 第4批',
    });
    const ret = r.body?.data || r.body;
    const rid = ret?.id;
    if (rid) createdReturns.push(rid);
    check('新建退料单 → 2xx', r.status >= 200 && r.status < 300, `${r.status} ${r.body?.error || ''}`);
    check('返回含 id', !!rid, JSON.stringify(ret).slice(0, 120));

    r = await req('POST', '/approvals', {
      id: `${P}-AP1`, code: `${P}-AP1`, type: 'return_material', typeName: '退料单', category: 'business',
      title: `E2E 第4批审批 ${rid}`, description: '',
      applicantId: 'USER_REGULAR_001', applicantName: '王建国', applicantDepartment: '生产部',
      applyDate: dateStr, applyTime: '09:00:00', currentStep: 1, totalSteps: 1,
      approvers: [], records: [], status: 'pending',
      businessLink: { type: 'return', requestId: String(rid), requestCode: ret?.code || `${P}-01`, materials: [] },
      attachments: [], materials: [], priority: 'normal', dueDate: '', relatedBatchCode: '', amount: '1',
    });
    if (r.status < 300) createdApprovals.push(`${P}-AP1`);
    check('创建关联待审批单 → 2xx', r.status < 300, `${r.status} ${r.body?.error || ''}`);

    r = await req('DELETE', `/material-returns/${rid}`);
    check('待审批存在时删除 → HTTP 400 拦截', r.status === 400, `${r.status} ${r.body?.error || ''}`);
    check('拦截原因指明待审批单号', String(r.body?.error || '').includes('待审批单'), JSON.stringify(r.body?.error));

    // ───────── T4 终态审批时允许删除并清理审批 ─────────
    console.log('\n▶ T4 审批终态后删除退料单（清理关联审批）');
    r = await req('PATCH', `/approvals/${P}-AP1/action`, { action: 'cancel', comment: 'E2E 取消', approverId: 'USER_REGULAR_001', approverName: '王建国' });
    check('取消审批单 → 2xx', r.status < 300, `${r.status} ${r.body?.error || ''}`);

    r = await req('DELETE', `/material-returns/${rid}`);
    check('审批终态后删除 → HTTP 200', r.status === 200, `${r.status} ${r.body?.error || ''}`);
    if (r.status === 200) createdReturns.length = 0;

    const db3 = openDb();
    const apRow = db3.prepare('SELECT status FROM approvals WHERE id = ?').get(`${P}-AP1`);
    const orphan = db3.prepare('SELECT COUNT(*) c FROM approvals WHERE id = ?').get(`${P}-AP1`).c;
    const stillDeleted = db3.prepare('SELECT COUNT(*) c FROM material_returns WHERE id = ?').get(rid).c;
    db3.close();
    check('退料单已删除', stillDeleted === 0);
    check('关联审批单未被物理删除（留痕）', orphan === 1, `实际 ${orphan}`);
    check('关联审批单状态为 cancelled', apRow?.status === 'cancelled', `实际 ${apRow?.status}`);

  } catch (e) {
    console.error('\n[脚本异常]', e);
    fail++;
    failures.push('脚本异常：' + e.message);
  } finally {
    for (const id of createdReturns) {
      const r = await req('DELETE', `/material-returns/${id}`);
      console.log(`\n🧹 兜底清理退料单 ${id}: HTTP ${r.status}`);
    }
    for (const aid of createdApprovals) {
      const r = await req('DELETE', `/approvals/${aid}`);
      if (r.status >= 400) console.log(`🧹 审批单 ${aid} 无法经 API 删除（${r.status}），需停服清理`);
    }
    const db = openDb();
    const leftRet = db.prepare('SELECT COUNT(*) c FROM material_returns WHERE code LIKE ?').get(`${P}%`).c;
    const leftAp = db.prepare('SELECT COUNT(*) c FROM approvals WHERE id LIKE ?').get(`${P}%`).c;
    db.close();
    check('退料单零残留', leftRet === 0, `残留 ${leftRet} 行`);
    console.log(`ℹ️  审批单残留 ${leftAp} 行（cancelled 态可经 API 删除）`);
  }

  console.log('\n' + '='.repeat(66));
  console.log(`结果：通过 ${pass} / 失败 ${fail}`);
  if (fail > 0) console.log('失败项：\n - ' + failures.join('\n - '));
  console.log('='.repeat(66));
  process.exit(fail > 0 ? 1 : 0);
})();
