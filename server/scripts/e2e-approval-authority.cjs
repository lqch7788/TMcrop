/**
 * E2E 回归验证：审批权限校验 + 多级审批推进 + 批量审批语义对齐
 * 对应 2026-09-29 第 1 批修复（P0-1 / P0-2 / P0-3）
 *
 * 前置：后端已重启（tsx watch 不热重载）
 * 用法：node server/scripts/e2e-approval-authority.cjs
 *
 * ⚠️ 造数与断言全部走 HTTP API（服务端是 sql.js 内存库，直连文件写入对运行中的服务不可见）。
 * ⚠️ 测试单以 AUDIT29- 前缀标识；终态审批单无法经 API 删除，
 *    因此运行完成后须执行 server/scripts/_audit29-cleanup.cjs（停服后运行）清理。
 */
const http = require('http');

const API = 'http://127.0.0.1:3001/api';
// 2026-09-29：改为**每次运行唯一**的前缀。此前是固定 'AUDIT29-'，重复运行时
// POST 因主键冲突静默失败，测试却继续对**上一轮的旧行**断言 → 出现假失败。
// 终态审批单无法经 API 删除，故用唯一 id 做隔离，残留由停服清理脚本统一处理。
const PREFIX = `AUDIT29-${Date.now().toString(36)}-`;

let pass = 0, fail = 0;
const failures = [];

function check(name, cond, detail) {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; failures.push(name); console.log(`  ❌ ${name}${detail ? ' → ' + detail : ''}`); }
}

/** HTTP 请求封装（返回 {status, body}） */
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

/** 经 API 创建一张测试审批单（businessLink=null → 不触发任何业务联动） */
async function createApproval(id, { totalSteps, currentStep, approvers, status = 'pending' }) {
  const now = new Date();
  return req('POST', '/approvals', {
    id, code: `${PREFIX}${id}`, type: 'material_request', typeName: '领料单',
    category: 'business', title: `E2E ${id}`, description: '',
    applicantId: 'USER_REGULAR_001', applicantName: '王建国', applicantDepartment: '生产部',
    applyDate: now.toISOString().slice(0, 10), applyTime: now.toISOString().slice(11, 19),
    currentStep, totalSteps, approvers, records: [],
    status, businessLink: null, attachments: [], materials: [],
    priority: 'normal', dueDate: '', relatedBatchCode: '', amount: '', workflowId: '', workflowName: '',
  });
}

/** 经 API 读取审批单当前状态 */
async function readApproval(id) {
  const r = await req('GET', `/approvals/${id}`);
  const d = r.body?.data ?? r.body;
  return {
    status: d?.status,
    currentStep: d?.currentStep ?? d?.current_step,
    totalSteps: d?.totalSteps ?? d?.total_steps,
    approvers: d?.approvers,
    records: d?.records,
  };
}

const mkApprovers = (ids) => ids.map((uid, i) => ({ userId: uid, userName: uid, role: '审批人', order: i + 1, status: 'pending' }));

(async () => {
  console.log('='.repeat(66));
  console.log('第 1 批 E2E：审批权限校验 / 多级推进 / 批量审批');
  console.log('='.repeat(66));

  // 注意：审批人必须与申请人（USER_REGULAR_001 王建国）**不同人** ——
  // 2026-09-29 加了"自审自批防护"后，用申请人身份审批会按免审批资格判定，
  // 多级审批场景（金额缺失）会被正确拒绝。A3 故改用第三个账号。
  const A1 = 'USER_ADMIN_001', A2 = 'USER_MANAGER_001', A3 = 'USER_1778894576564';
  const N1 = '陆启闯', N2 = '张俊生', N3 = '访客01';

  try {
    // ───────── T1 多级审批推进（total_steps=3，approvers 为有效配置）─────────
    console.log('\n▶ T1 多级审批推进（3 级）');
    await createApproval(`${PREFIX}T1`, { totalSteps: 3, currentStep: 1, approvers: mkApprovers([A1, A2, A3]) });

    let r = await req('PATCH', `/approvals/${PREFIX}T1/action`, { action: 'approve', comment: '第1级', approverId: A1, approverName: N1 });
    let row = await readApproval(`${PREFIX}T1`);
    check('第 1 级 → HTTP 200', r.status === 200, `${r.status} ${r.body?.error || ''}`);
    check('第 1 级 → status 保持 pending', row.status === 'pending', `实际 ${row.status}`);
    check('第 1 级 → current_step 推进到 2', Number(row.currentStep) === 2, `实际 ${row.currentStep}`);

    r = await req('PATCH', `/approvals/${PREFIX}T1/action`, { action: 'approve', comment: '第2级', approverId: A2, approverName: N2 });
    row = await readApproval(`${PREFIX}T1`);
    check('第 2 级 → status 仍 pending', row.status === 'pending', `实际 ${row.status}`);
    check('第 2 级 → current_step 推进到 3', Number(row.currentStep) === 3, `实际 ${row.currentStep}`);

    r = await req('PATCH', `/approvals/${PREFIX}T1/action`, { action: 'approve', comment: '第3级', approverId: A3, approverName: N3 });
    row = await readApproval(`${PREFIX}T1`);
    check('末级 → status=approved', row.status === 'approved', `实际 ${row.status}`);
    check('末级 → current_step=total_steps', Number(row.currentStep) === 3, `实际 ${row.currentStep}`);
    check('末级 → 审批记录 3 条', Array.isArray(row.records) && row.records.length === 3, `实际 ${Array.isArray(row.records) ? row.records.length : row.records}`);
    check('末级 → 无审批人被伪写为"开发模式"', !JSON.stringify(row.approvers || '').includes('开发模式'));

    // ───────── T2 审批人身份校验 ─────────
    console.log('\n▶ T2 审批人身份校验');
    await createApproval(`${PREFIX}T2`, { totalSteps: 1, currentStep: 1, approvers: mkApprovers([A1]) });
    r = await req('PATCH', `/approvals/${PREFIX}T2/action`, { action: 'approve', comment: '越权', approverId: A3, approverName: N3 });
    check('非当前步审批人 → HTTP 403', r.status === 403, `实际 ${r.status} ${r.body?.error || ''}`);
    check('越权审批 → 单据仍 pending', (await readApproval(`${PREFIX}T2`)).status === 'pending');
    r = await req('PATCH', `/approvals/${PREFIX}T2/action`, { action: 'approve', comment: '正确', approverId: A1, approverName: N1 });
    check('正确审批人 → HTTP 200', r.status === 200, `实际 ${r.status} ${r.body?.error || ''}`);
    check('正确审批人 → status=approved', (await readApproval(`${PREFIX}T2`)).status === 'approved');

    // ───────── T3 存量兼容：approvers 为空 ─────────
    console.log('\n▶ T3 存量兼容（approvers 为空 → 放行）');
    await createApproval(`${PREFIX}T3`, { totalSteps: 1, currentStep: 1, approvers: [] });
    r = await req('PATCH', `/approvals/${PREFIX}T3/action`, { action: 'approve', comment: '空审批人', approverId: A1, approverName: N1 });
    check('approvers 为空 → HTTP 200（不卡死）', r.status === 200, `${r.status} ${r.body?.error || ''}`);
    check('approvers 为空 → status=approved', (await readApproval(`${PREFIX}T3`)).status === 'approved');

    // ───────── T4 历史脏配置兜底 ─────────
    console.log('\n▶ T4 历史脏配置兜底（userId 不在 users 表）');
    await createApproval(`${PREFIX}T4`, { totalSteps: 1, currentStep: 1, approvers: [{ userId: 'user_历史用户', userName: '历史用户', role: '审批人', order: 1, status: 'pending' }] });
    r = await req('PATCH', `/approvals/${PREFIX}T4/action`, { action: 'approve', comment: '脏配置', approverId: A1, approverName: N1 });
    check('脏配置 → 宽松放行 HTTP 200', r.status === 200, `${r.status} ${r.body?.error || ''}`);
    check('脏配置 → status=approved', (await readApproval(`${PREFIX}T4`)).status === 'approved');

    // ───────── T5 批量审批：approvers 为空 ─────────
    console.log('\n▶ T5 批量审批对 approvers 为空的单据');
    await createApproval(`${PREFIX}T5`, { totalSteps: 1, currentStep: 1, approvers: [] });
    r = await req('POST', '/approvals/batch-action', { approvalIds: [`${PREFIX}T5`], action: 'approve', approverId: A1, approverName: N1, comment: '批量' });
    check('批量审批 approvers 为空 → HTTP 200', r.status === 200, `实际 ${r.status}`);
    check('批量审批 → status=approved', (await readApproval(`${PREFIX}T5`)).status === 'approved', JSON.stringify(r.body?.data));

    // ───────── T6 批量审批：身份不匹配 ─────────
    console.log('\n▶ T6 批量审批身份校验');
    await createApproval(`${PREFIX}T6`, { totalSteps: 1, currentStep: 1, approvers: mkApprovers([A2]) });
    r = await req('POST', '/approvals/batch-action', { approvalIds: [`${PREFIX}T6`], action: 'approve', approverId: A3, approverName: N3, comment: '越权批量' });
    const res6 = (r.body?.data || [])[0] || {};
    check('批量越权 → 该条失败', res6.success === false, JSON.stringify(res6));
    check('批量越权 → 单据仍 pending', (await readApproval(`${PREFIX}T6`)).status === 'pending');

    // ───────── T7 批量审批多级推进 ─────────
    console.log('\n▶ T7 批量审批多级推进（2 级）');
    await createApproval(`${PREFIX}T7`, { totalSteps: 2, currentStep: 1, approvers: mkApprovers([A1, A2]) });
    await req('POST', '/approvals/batch-action', { approvalIds: [`${PREFIX}T7`], action: 'approve', approverId: A1, approverName: N1, comment: '批量1' });
    let row7 = await readApproval(`${PREFIX}T7`);
    check('批量第 1 级 → 仍 pending', row7.status === 'pending', `实际 ${row7.status}`);
    check('批量第 1 级 → current_step=2', Number(row7.currentStep) === 2, `实际 ${row7.currentStep}`);
    await req('POST', '/approvals/batch-action', { approvalIds: [`${PREFIX}T7`], action: 'approve', approverId: A2, approverName: N2, comment: '批量2' });
    row7 = await readApproval(`${PREFIX}T7`);
    check('批量第 2 级（末级）→ approved', row7.status === 'approved', `实际 ${row7.status}`);

    // ───────── T8 驳回语义回归 ─────────
    console.log('\n▶ T8 驳回语义回归');
    await createApproval(`${PREFIX}T8`, { totalSteps: 3, currentStep: 1, approvers: mkApprovers([A1, A2, A3]) });
    r = await req('PATCH', `/approvals/${PREFIX}T8/action`, { action: 'reject', comment: '驳回', approverId: A1, approverName: N1 });
    const row8 = await readApproval(`${PREFIX}T8`);
    check('驳回 → HTTP 200', r.status === 200, `实际 ${r.status} ${r.body?.error || ''}`);
    check('驳回 → status=rejected', row8.status === 'rejected', `实际 ${row8.status}`);
    const pending8 = (row8.approvers || []).filter(a => a.status === 'pending').length;
    check('驳回 → 剩余审批人全部 skipped', pending8 === 0, `仍有 ${pending8} 个 pending`);

    // ───────── T9 重复审批防护 ─────────
    console.log('\n▶ T9 重复审批防护回归');
    r = await req('PATCH', `/approvals/${PREFIX}T3/action`, { action: 'approve', comment: '重复', approverId: A1, approverName: N1 });
    check('已终态单据重复审批 → HTTP 400', r.status === 400, `实际 ${r.status}`);

  } catch (e) {
    console.error('\n[脚本异常]', e);
    fail++;
    failures.push('脚本异常：' + e.message);
  }

  console.log('\n' + '='.repeat(66));
  console.log(`结果：通过 ${pass} / 失败 ${fail}`);
  if (fail > 0) console.log('失败项：\n - ' + failures.join('\n - '));
  console.log(`注意：测试单（${PREFIX}T1~T8）需停服后运行 _audit29-cleanup.cjs 清理`);
  console.log('='.repeat(66));
  process.exit(fail > 0 ? 1 : 0);
})();
