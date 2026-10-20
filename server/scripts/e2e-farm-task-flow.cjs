/**
 * 农事任务全链路 E2E 回归脚本
 *
 * 覆盖：正常流 / 驳回 / 二次驳回 / 撤回 / 取消 / 重新派发 / 无执行人 /
 *       PUT 守卫 / 审计列清理 / 批量派发删除 / 批量守卫 / 自动排班幂等 /
 *       accepted 直提验收 / completed 禁重派 / 静态端点可达
 *
 * 前置：后端已启动（localhost:3001）
 * 用法：node server/scripts/e2e-farm-task-flow.cjs
 * 行为：创建 E2E-* 临时任务 → 逐场景断言 → 结束时自动清理，不留脏数据
 * 退出码：0 全通过 / 1 有失败 / 2 脚本异常
 */
const ROOT = 'http://localhost:3001/api/farm-tasks';
const SCH = 'http://localhost:3001/api/farm-task-schedules';
const results = [];

function ok(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: detail === undefined ? '' : String(detail) });
}

async function j(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await r.json(); } catch { /* 非 JSON */ }
  return { status: r.status, data };
}

const get = async (id) => {
  const { data } = await j('GET', ROOT);
  return (data && data.data ? data.data : []).find((t) => t.id === id);
};
const mk = async (code, extra) =>
  j('POST', ROOT, Object.assign({
    taskCode: code, title: 'E2E ' + code, type: 'other', typeName: '其他',
    status: 'pending', priority: 'normal', sourceType: 'dispatch', dispatchMode: 'farm',
  }, extra || {}));
const post = (id, p, b) => j('POST', ROOT + '/' + id + p, b || {});
const put = (id, b) => j('PUT', ROOT + '/' + id, b);
const del = (id) => j('DELETE', ROOT + '/' + id);

(async () => {
  // ===== 场景1：正常全流程 =====
  const C1 = 'E2E-NORMAL-001';
  await mk(C1, { assigneeId: 'EMP_001', assigneeName: '张三' });
  let r;
  r = await post(C1, '/accept', { operator_id: 'EMP_001', operator_name: '张三' });
  ok('1.正常流 接受', r.status === 200 && (await get(C1)).status === 'accepted', r.status);
  r = await post(C1, '/start', { operator_id: 'EMP_001', operator_name: '张三' });
  ok('1.正常流 开始处理', r.status === 200 && (await get(C1)).status === 'in_progress', r.status);
  r = await post(C1, '/progress', { progress: 50, operator_id: 'EMP_001', operator_name: '张三' });
  ok('1.正常流 进度50', r.status === 200 && (await get(C1)).progress === 50, r.status);
  r = await post(C1, '/submit-acceptance', { operator_id: 'EMP_001', operator_name: '张三' });
  ok('1.正常流 申请验收', r.status === 200 && (await get(C1)).status === 'waiting_acceptance', r.status);
  r = await post(C1, '/complete', { operator_id: 'u', operator_name: '陆启闯', comments: 'ok' });
  const t1 = await get(C1);
  ok('1.正常流 验收通过', r.status === 200 && t1.status === 'completed', r.status);
  ok('1.正常流 completed_at 已写', !!t1.completedAt, t1.completedAt);

  // ===== 场景2：驳回 → 返工 → 二次驳回 → failed =====
  const C2 = 'E2E-REJECT-001';
  await mk(C2, { assigneeId: 'EMP_004', assigneeName: '赵六' });
  await post(C2, '/accept', { operator_id: 'EMP_004', operator_name: '赵六' });
  await post(C2, '/start', { operator_id: 'EMP_004', operator_name: '赵六' });
  await post(C2, '/progress', { progress: 100, operator_id: 'EMP_004', operator_name: '赵六' });
  await post(C2, '/submit-acceptance', { operator_id: 'EMP_004', operator_name: '赵六' });
  r = await post(C2, '/reject', { reason: '短', operator_id: 'u', operator_name: '陆启闯' });
  ok('2.驳回流 第1次驳回(1字符)', r.status === 200 && (await get(C2)).status === 'rejected', r.status);
  await post(C2, '/continue', { operator_id: 'EMP_004', operator_name: '赵六' });
  await post(C2, '/submit-acceptance', { operator_id: 'EMP_004', operator_name: '赵六' });
  r = await post(C2, '/reject', { reason: '再改', operator_id: 'u', operator_name: '陆启闯' });
  const t2 = await get(C2);
  ok('2.驳回流 第2次→failed', r.status === 200 && t2.status === 'failed' && t2.reworkCount === 2,
    r.status + ' ' + t2.status + ' rc=' + t2.reworkCount);

  // ===== 场景3：撤回 pending → draft =====
  const C3 = 'E2E-WITHDRAW-001';
  await mk(C3, { assigneeId: 'EMP_002', assigneeName: '李四' });
  r = await post(C3, '/withdraw', { reason: '撤回原因测试', operator_id: 'u', operator_name: '陆启闯' });
  ok('3.撤回 pending→draft', r.status === 200 && (await get(C3)).status === 'draft', r.status);

  // ===== 场景4：取消 accepted → cancelled =====
  const C4 = 'E2E-CANCEL-001';
  await mk(C4, { assigneeId: 'EMP_003', assigneeName: '王五' });
  await post(C4, '/accept', { operator_id: 'EMP_003', operator_name: '王五' });
  r = await post(C4, '/cancel', { reason: '取消原因测试', operator_id: 'u', operator_name: '陆启闯' });
  ok('4.取消 accepted→cancelled', r.status === 200 && (await get(C4)).status === 'cancelled', r.status);

  // ===== 场景5：重新派发 =====
  const C5 = 'E2E-REASSIGN-001';
  await mk(C5, { assigneeId: 'EMP_001', assigneeName: '张三' });
  await post(C5, '/accept', { operator_id: 'EMP_001', operator_name: '张三' });
  await post(C5, '/start', { operator_id: 'EMP_001', operator_name: '张三' });
  await post(C5, '/submit-acceptance', { operator_id: 'EMP_001', operator_name: '张三' });
  await post(C5, '/reject', { reason: '返工一下', operator_id: 'u', operator_name: '陆启闯' });
  r = await post(C5, '/reassign', { assigneeId: 'EMP_006', assigneeName: '孙八', operator_id: 'u', operator_name: '陆启闯' });
  const t5 = await get(C5);
  ok('5.重新派发 换人成功', r.status === 200 && t5.assigneeName === '孙八', r.status + ' ' + t5.assigneeName);

  // ===== 场景6：无执行人不可接受 =====
  const C6 = 'E2E-NOASSIGNEE-001';
  await mk(C6, {});
  r = await post(C6, '/accept', { operator_id: 'u', operator_name: '陆启闯' });
  ok('6.无执行人拒绝接受', r.status === 400 && (await get(C6)).status === 'pending',
    r.status + ' ' + (r.data && r.data.error ? r.data.error.slice(0, 30) : ''));

  // ===== 场景7：PUT 状态后门已封 =====
  const C7 = 'E2E-PUTGUARD-001';
  await mk(C7, { assigneeId: 'EMP_005', assigneeName: '钱七' });
  await post(C7, '/accept', { operator_id: 'EMP_005', operator_name: '钱七' });
  await post(C7, '/start', { operator_id: 'EMP_005', operator_name: '钱七' });
  await post(C7, '/submit-acceptance', { operator_id: 'EMP_005', operator_name: '钱七' });
  await post(C7, '/complete', { operator_id: 'u', operator_name: '陆启闯' });
  r = await put(C7, { status: 'pending' });
  ok('7.PUT 不能回退终态', r.status === 409 && (await get(C7)).status === 'completed', r.status);
  r = await put(C7, { remarks: '只改备注' });
  ok('7.PUT 非状态字段仍可改', r.status === 200, r.status);

  // ===== 场景8：验收后清理脏审计列 =====
  const C8 = 'E2E-AUDIT-001';
  await mk(C8, { assigneeId: 'EMP_002', assigneeName: '李四' });
  await post(C8, '/accept', { operator_id: 'EMP_002', operator_name: '李四' });
  await post(C8, '/start', { operator_id: 'EMP_002', operator_name: '李四' });
  await post(C8, '/submit-acceptance', { operator_id: 'EMP_002', operator_name: '李四' });
  await post(C8, '/reject', { reason: '先驳一次', operator_id: 'u', operator_name: '陆启闯' });
  await post(C8, '/continue', { operator_id: 'EMP_002', operator_name: '李四' });
  await post(C8, '/submit-acceptance', { operator_id: 'EMP_002', operator_name: '李四' });
  await post(C8, '/complete', { operator_id: 'u', operator_name: '陆启闯' });
  const t8 = await get(C8);
  ok('8.验收后 rejected_at 已清', t8.status === 'completed' && !t8.rejectedAt,
    'status=' + t8.status + ' rejectedAt=' + t8.rejectedAt);

  // ===== 场景9：批量派发 / 批量删除 =====
  const B1 = 'E2E-BATCH-001';
  const B2 = 'E2E-BATCH-002';
  await mk(B1, {});
  await mk(B2, {});
  r = await j('PUT', ROOT + '/batch', { ids: [B1, B2], updates: { assigneeId: 'EMP_001', assigneeName: '张三', status: 'pending' } });
  const b1 = await get(B1);
  const b2 = await get(B2);
  ok('9.批量派发生效', r.status === 200 && b1.assigneeName === '张三' && b2.assigneeName === '张三',
    r.status + ' updated=' + (r.data && r.data.data ? r.data.data.updated : '?'));
  r = await j('DELETE', ROOT + '/batch?ids=' + B1 + ',' + B2);
  ok('9.批量删除生效', r.status === 200 && !(await get(B1)) && !(await get(B2)),
    r.status + ' deleted=' + (r.data && r.data.data ? r.data.data.deleted : '?'));

  // ===== 场景10：批量改状态也受守卫 =====
  const C10 = 'E2E-BATCHGUARD-001';
  await mk(C10, { assigneeId: 'EMP_003', assigneeName: '王五' });
  await post(C10, '/accept', { operator_id: 'EMP_003', operator_name: '王五' });
  await post(C10, '/start', { operator_id: 'EMP_003', operator_name: '王五' });
  await post(C10, '/submit-acceptance', { operator_id: 'EMP_003', operator_name: '王五' });
  await post(C10, '/complete', { operator_id: 'u', operator_name: '陆启闯' });
  r = await j('PUT', ROOT + '/batch', { ids: [C10], updates: { status: 'pending' } });
  ok('10.批量改状态受守卫', r.status === 409 && (await get(C10)).status === 'completed', r.status);

  // ===== 场景11：自动排班幂等 =====
  const C11 = 'E2E-AUTOSCHED-001';
  await mk(C11, { assigneeId: 'EMP_001', assigneeName: '张三' });
  const a1 = await j('POST', SCH + '/auto-assign', { taskId: C11, workerId: 'EMP_001', workerName: '张三', planDate: '2026-11-01' });
  await j('POST', SCH + '/auto-assign', { taskId: C11, workerId: 'EMP_001', workerName: '张三', planDate: '2026-11-01' });
  const list = await j('GET', SCH + '/list?date=2026-11-01');
  const mine = ((list.data && list.data.data) || []).filter((x) => x.taskId === C11);
  ok('11.自动排班首次创建', a1.status === 200 && a1.data && a1.data.data && a1.data.data.created === true,
    JSON.stringify(a1.data && a1.data.data && a1.data.data.created));
  ok('11.自动排班幂等(仍1条)', mine.length === 1, 'count=' + mine.length);

  // ===== 场景13：accepted 直接申请验收（不点「开始处理」）=====
  {
    const C13 = 'E2E-SKIPSTART-001';
    await mk(C13, { assigneeId: 'EMP_001', assigneeName: '张三' });
    await post(C13, '/accept', { operator_id: 'EMP_001', operator_name: '张三' });
    r = await post(C13, '/submit-acceptance', { operator_id: 'EMP_001', operator_name: '张三' });
    ok('13.accepted 直接申请验收', r.status === 200 && (await get(C13)).status === 'waiting_acceptance', r.status);
  }

  // ===== 场景14：completed 不能重新派发（守卫）=====
  {
    const C14 = 'E2E-REASSIGN-GUARD';
    await mk(C14, { assigneeId: 'EMP_001', assigneeName: '张三' });
    await post(C14, '/accept', { operator_id: 'EMP_001', operator_name: '张三' });
    await post(C14, '/start', { operator_id: 'EMP_001', operator_name: '张三' });
    await post(C14, '/submit-acceptance', { operator_id: 'EMP_001', operator_name: '张三' });
    await post(C14, '/complete', { operator_id: 'u', operator_name: '陆启闯' });
    r = await post(C14, '/reassign', { assigneeId: 'EMP_002', assigneeName: '李四', operator_id: 'u', operator_name: '陆启闯' });
    ok('14.completed 不能重新派发', r.status === 409 && (await get(C14)).status === 'completed', r.status);
  }

  // ===== 场景12：静态端点可达（不再被 /:id 吞掉）=====
  for (const p of ['/stats', '/count', '/overdue', '/pending', '/in-progress', '/waiting-acceptance']) {
    const rr = await j('GET', ROOT + p);
    ok('12.静态端点 ' + p, rr.status === 200, rr.status);
  }
  // GET /batch 无 ids 应返回参数校验错误 400（说明到达了真正的处理器，而非被 /:id 吞成 404）
  {
    const rr = await j('GET', ROOT + '/batch');
    ok('12.静态端点 /batch（无ids→400 参数校验）', rr.status === 400, rr.status);
    const rr2 = await j('GET', ROOT + '/batch?ids=NOT-EXIST');
    ok('12.静态端点 /batch（带ids→200）', rr2.status === 200, rr2.status);
  }

  // ===== 清理 =====
  const all0 = (await j('GET', ROOT)).data;
  const all = (all0 && all0.data) || [];
  let cleaned = 0;
  for (const t of all) {
    if (String(t.id).startsWith('E2E-')) {
      const d = await del(t.id);
      if (d.status === 200) cleaned++;
    }
  }
  const schedAll = await j('GET', SCH + '/list?date=2026-11-01');
  for (const s of ((schedAll.data && schedAll.data.data) || [])) {
    if (String(s.taskId).startsWith('E2E-')) await j('DELETE', SCH + '/' + s.id);
  }

  // ===== 输出 =====
  const fail = results.filter((x) => !x.pass);
  console.log('\n========== 农事任务全链路 E2E ==========');
  results.forEach((x) => console.log((x.pass ? '[PASS] ' : '[FAIL] ') + x.name + (x.pass ? '' : '  → ' + x.detail)));
  console.log('\n清理 E2E 任务: ' + cleaned + ' 条');
  console.log('合计 ' + results.length + ' 项：通过 ' + (results.length - fail.length) + '，失败 ' + fail.length);
  process.exit(fail.length ? 1 : 0);
})().catch((e) => { console.error('E2E 脚本异常:', e); process.exit(2); });
