/**
 * E2E 回归验证：自审自批防护 + 金额服务端回填（第 6 批，P1-1 / P1-2）
 *
 * 覆盖：
 *   T1 自审 + 金额低于免审批阈值 → 放行（保留免审批直通）
 *   T2 自审 + 金额高于阈值       → 403 拒绝
 *   T3 自审 + 金额缺失           → 403 拒绝（fail-closed）
 *   T4 他人审批 + 大额           → 放行（不受自审规则影响）
 *   T5 POST 未传 amount + businessLink 指向领料单 → 服务端回填真实金额
 *   T6 单号自愈：提交业务单号当审批单号 → 被改写为 AP 前缀且不重复
 *
 * 用法：node server/scripts/e2e-approval-self-guard.cjs
 * 安全：测试单以 AUDIT29G- 前缀标识；终态审批单无法经 API 删除，运行后需停服清理（脚本会提示）。
 */
const http = require('http');
const Database = require('better-sqlite3');
const path = require('path');

const API = 'http://127.0.0.1:3001/api';
// 每次运行唯一前缀：终态审批单无法经 API 删除，固定前缀会让重复运行撞主键、对上轮旧行断言
const P = `AUDIT29G${Date.now().toString(36)}`;
const SRC_REQUEST = 'MR20260927-0002';   // 库中存在的领料单（total_amount=801）

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

const AJ = { id: 'USER_ADMIN_001', name: '陆启闯' };   // 申请人（同时也是审批人 → 构成自审）
const OTHER = { id: 'USER_MANAGER_001', name: '张俊生' };

/** 建一张待审批单；applicant 默认与审批人同人（自审场景） */
async function mkApproval(suffix, { amount, approvers, applicant = AJ, businessLink = null, code }) {
  const now = new Date();
  const payload = {
    id: `${P}-${suffix}`, code: code || `${P}-${suffix}`,
    type: 'material_request', typeName: '领料单', category: 'business',
    title: `E2E 自审防护 ${suffix}`, description: '',
    applicantId: applicant.id, applicantName: applicant.name, applicantDepartment: '生产部',
    applyDate: now.toISOString().slice(0, 10), applyTime: now.toISOString().slice(11, 19),
    currentStep: 1, totalSteps: 1,
    approvers: approvers || [], records: [],
    status: 'pending', businessLink, attachments: [], materials: [],
    priority: 'normal', dueDate: '', relatedBatchCode: '', workflowId: '', workflowName: '',
  };
  if (amount !== undefined) payload.amount = amount;
  return req('POST', '/approvals', payload);
}

(async () => {
  console.log('='.repeat(66));
  console.log('第 6 批 E2E：自审自批防护 / 金额服务端回填 / 单号自愈');
  console.log('='.repeat(66));

  try {
    // ───────── T1 自审 + 小额 → 放行 ─────────
    console.log('\n▶ T1 自审 + 金额 500（低于免审批上限 1000）');
    let r = await mkApproval('T1', { amount: 500 });
    check('创建审批单 → 2xx', r.status < 300, `${r.status} ${r.body?.error || ''}`);
    r = await req('PATCH', `/approvals/${P}-T1/action`, { action: 'approve', comment: '自审小额', approverId: AJ.id, approverName: AJ.name });
    check('自审小额 → HTTP 200 放行', r.status === 200, `${r.status} ${r.body?.error || ''}`);

    // ───────── T2 自审 + 大额 → 403 ─────────
    console.log('\n▶ T2 自审 + 金额 50000（高于免审批上限）');
    r = await mkApproval('T2', { amount: 50000 });
    check('创建审批单 → 2xx', r.status < 300, `${r.status}`);
    r = await req('PATCH', `/approvals/${P}-T2/action`, { action: 'approve', comment: '自审大额', approverId: AJ.id, approverName: AJ.name });
    check('自审大额 → HTTP 403 拒绝', r.status === 403, `${r.status} ${r.body?.error || ''}`);
    check('拒绝原因可读（含"不能审批自己提交的单据"）', String(r.body?.error || '').includes('不能审批自己提交的单据'), JSON.stringify(r.body?.error));
    const db = openDb();
    const st2 = db.prepare('SELECT status FROM approvals WHERE id = ?').get(`${P}-T2`)?.status;
    db.close();
    check('被拒后单据仍 pending', st2 === 'pending', `实际 ${st2}`);

    // ───────── T3 自审 + 金额缺失 → 403 ─────────
    console.log('\n▶ T3 自审 + 金额缺失（fail-closed）');
    r = await mkApproval('T3', {});   // 不传 amount，且无 businessLink 可回填
    check('创建审批单 → 2xx', r.status < 300, `${r.status}`);
    r = await req('PATCH', `/approvals/${P}-T3/action`, { action: 'approve', comment: '自审无金额', approverId: AJ.id, approverName: AJ.name });
    check('自审无金额 → HTTP 403 拒绝', r.status === 403, `${r.status} ${r.body?.error || ''}`);

    // ───────── T4 他人审批 + 大额 → 放行 ─────────
    console.log('\n▶ T4 他人审批 + 金额 50000（不受自审规则影响）');
    r = await mkApproval('T4', { amount: 50000 });
    check('创建审批单 → 2xx', r.status < 300, `${r.status}`);
    r = await req('PATCH', `/approvals/${P}-T4/action`, { action: 'approve', comment: '他人审批', approverId: OTHER.id, approverName: OTHER.name });
    check('他人审批大额 → HTTP 200 放行', r.status === 200, `${r.status} ${r.body?.error || ''}`);

    // ───────── T5 金额服务端回填 ─────────
    console.log('\n▶ T5 POST 未传 amount，businessLink 指向真实领料单');
    const db0 = openDb();
    const reqRow = db0.prepare('SELECT id, request_code, total_amount FROM material_requests WHERE request_code = ?').get(SRC_REQUEST);
    db0.close();
    check('前置：来源领料单存在且有金额', !!reqRow && Number(reqRow.total_amount) > 0, JSON.stringify(reqRow));
    r = await mkApproval('T5', {
      applicant: OTHER,
      businessLink: { type: 'material', requestId: String(reqRow.id), requestCode: reqRow.request_code },
    });
    check('创建审批单 → 2xx', r.status < 300, `${r.status} ${r.body?.error || ''}`);
    const db1 = openDb();
    const amt5 = db1.prepare('SELECT amount FROM approvals WHERE id = ?').get(`${P}-T5`)?.amount;
    db1.close();
    check('金额被服务端回填为业务单金额', Number(amt5) === Number(reqRow.total_amount), `库中 amount=${amt5}，业务单=${reqRow.total_amount}`);

    // ───────── T6 单号自愈 ─────────
    console.log('\n▶ T6 提交业务单号当审批单号 → 应被改写');
    r = await mkApproval('T6', { amount: 100, applicant: OTHER, code: reqRow.request_code });
    check('创建审批单 → 2xx', r.status < 300, `${r.status}`);
    const db2 = openDb();
    const code6 = db2.prepare('SELECT code FROM approvals WHERE id = ?').get(`${P}-T6`)?.code;
    const dupCount = db2.prepare('SELECT COUNT(*) c FROM approvals WHERE code = ?').get(code6 || '').c;
    db2.close();
    check('单号被改写（不再等于业务单号）', code6 !== reqRow.request_code, `实际 ${code6}`);
    check('改写后单号在 approvals 内唯一', dupCount === 1, `出现 ${dupCount} 次`);

  } catch (e) {
    console.error('\n[脚本异常]', e);
    fail++;
    failures.push('脚本异常：' + e.message);
  }

  console.log('\n' + '='.repeat(66));
  console.log(`结果：通过 ${pass} / 失败 ${fail}`);
  if (fail > 0) console.log('失败项：\n - ' + failures.join('\n - '));
  console.log(`注意：测试单（${P}-T1~T6）需停服后清理`);
  console.log('='.repeat(66));
  process.exit(fail > 0 ? 1 : 0);
})();
