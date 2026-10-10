/**
 * 一次性迁移：为 labor 模块历史 pending 记录补建人事审批单
 *
 * 背景（2026-10-10）：labor 模块此前为"就地审批"（页面直接改业务表），不产生审批单。
 * 接入统一审批体系（人事审批页）后，历史 pending 记录若无对应审批单，在 labor 页面
 * 就地审批按钮移除后将无法处理（僵死）。本脚本为 6 类 pending 记录补建审批单。
 *
 * 用法：
 *   node scripts/migrate-hr-pending-approvals.cjs --dry-run   # 只盘点，不写入
 *   node scripts/migrate-hr-pending-approvals.cjs             # 实际补建
 *
 * 安全：
 *   - 审批单 id 用确定性规则 `APR-MIG-{类短名}-{记录id}`（重复执行幂等）
 *   - 执行前先拉取现有审批单的 businessLink.requestId 集合，已挂单的记录跳过
 *   - 写入走 POST /api/approvals（服务端逻辑 + 落盘），不直接改 .db
 */
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const API = 'http://localhost:3001/api';
const DB_PATH = path.join(__dirname, '..', 'data', 'yuanxingtu.db');
const DRY_RUN = process.argv.includes('--dry-run');

/** 6 类 pending 记录 → 审批单的映射 */
const MAPPINGS = [
  {
    table: 'leave_records', type: 'leave', linkType: 'leave', idTag: 'LV',
    sql: "SELECT id, worker_id, worker_name, days, start_date, end_date, department_name, create_time FROM leave_records WHERE status = 'pending'",
    build: (r) => ({
      title: `请假申请: ${r.worker_name} ${r.days}天（${r.start_date}~${r.end_date}）`,
      applicantId: r.worker_id || '', applicantName: r.worker_name || '',
      applicantDepartment: r.department_name || '', applyDate: String(r.create_time || '').slice(0, 10),
      requestCode: r.id,
    }),
  },
  {
    table: 'overtime_records', type: 'overtime', linkType: 'overtime', idTag: 'OT',
    sql: "SELECT id, worker_id, worker_name, work_date, hours, department_name, create_time FROM overtime_records WHERE status = 'pending'",
    build: (r) => ({
      title: `加班申请: ${r.worker_name} ${r.work_date} ${r.hours}小时`,
      applicantId: r.worker_id || '', applicantName: r.worker_name || '',
      applicantDepartment: r.department_name || '', applyDate: String(r.create_time || '').slice(0, 10),
      requestCode: r.id,
    }),
  },
  {
    table: 'resignation_records', type: 'resignation', linkType: 'resign', idTag: 'RS',
    sql: "SELECT id, resignation_code, worker_id, worker_name, department, create_time FROM resignation_records WHERE status = 'pending'",
    build: (r) => ({
      title: `离职申请: ${r.worker_name}（${r.resignation_code || r.id}）`,
      applicantId: r.worker_id || '', applicantName: r.worker_name || '',
      applicantDepartment: r.department || '', applyDate: String(r.create_time || '').slice(0, 10),
      requestCode: r.resignation_code || r.id,
    }),
  },
  {
    table: 'recruitment_records', type: 'recruitment', linkType: 'recruitment', idTag: 'RC',
    sql: "SELECT id, recruitment_code, dept_name, position, headcount, applicant_id, applicant_name, apply_date, create_time FROM recruitment_records WHERE status = 'pending'",
    build: (r) => ({
      title: `招聘申请: ${r.position} ${r.headcount}人（${r.dept_name}）`,
      applicantId: r.applicant_id || '', applicantName: r.applicant_name || '',
      applicantDepartment: r.dept_name || '', applyDate: String(r.apply_date || r.create_time || '').slice(0, 10),
      requestCode: r.recruitment_code || r.id,
    }),
  },
  {
    table: 'contract_renewal_records', type: 'contract_renewal', linkType: 'contract_renewal', idTag: 'CR',
    sql: "SELECT id, employee_id, employee_name, department, current_contract_end, create_time FROM contract_renewal_records WHERE status = 'pending'",
    build: (r) => ({
      title: `合同续签: ${r.employee_name}（现合同至 ${r.current_contract_end}）`,
      applicantId: r.employee_id || '', applicantName: r.employee_name || '',
      applicantDepartment: r.department || '', applyDate: String(r.create_time || '').slice(0, 10),
      requestCode: r.id,
    }),
  },
  {
    table: 'salary_budget_records', type: 'salary_budget', linkType: 'salary_budget', idTag: 'SB',
    sql: "SELECT id, budget_code, dept_name, budget_month, grand_total, applicant_id, applicant_name, apply_date, create_time FROM salary_budget_records WHERE status = 'pending'",
    build: (r) => ({
      title: `工资预算: ${r.dept_name}${r.budget_month}月（${r.grand_total}元）`,
      applicantId: r.applicant_id || '', applicantName: r.applicant_name || '',
      applicantDepartment: r.dept_name || '', applyDate: String(r.apply_date || r.create_time || '').slice(0, 10),
      requestCode: r.budget_code || r.id,
    }),
  },
];

async function main() {
  console.log(`模式: ${DRY_RUN ? 'DRY-RUN（不写入）' : '实际执行'}`);

  // 1. 拉取现有审批单，收集已挂单的 requestId 集合（防重复）
  const listResp = await fetch(`${API}/approvals`);
  if (!listResp.ok) throw new Error(`拉取审批单失败: HTTP ${listResp.status}`);
  const listJson = await listResp.json();
  const existing = Array.isArray(listJson.data) ? listJson.data : (Array.isArray(listJson) ? listJson : []);
  const boundRequestIds = new Set();
  for (const a of existing) {
    let bl = a.businessLink ?? a.business_link;
    if (typeof bl === 'string') { try { bl = JSON.parse(bl); } catch { bl = null; } }
    if (bl && bl.requestId) boundRequestIds.add(String(bl.requestId));
  }
  console.log(`现有审批单 ${existing.length} 条，已挂单业务记录 ${boundRequestIds.size} 条`);

  // 2. 只读打开 DB，逐表取 pending 记录
  const SQL = await initSqlJs();
  const db = new SQL.Database(fs.readFileSync(DB_PATH));

  let created = 0, skipped = 0, failed = 0;
  const failures = [];

  for (const m of MAPPINGS) {
    const res = db.exec(m.sql);
    const cols = res.length ? res[0].columns : [];
    const rows = res.length ? res[0].values.map((vals) => Object.fromEntries(cols.map((c, i) => [c, vals[i]]))) : [];
    let tCreated = 0, tSkipped = 0;

    for (const r of rows) {
      const recordId = String(r.id);
      if (boundRequestIds.has(recordId)) { skipped++; tSkipped++; continue; }

      const f = m.build(r);
      const approval = {
        id: `APR-MIG-${m.idTag}-${recordId}`,
        type: m.type,
        title: f.title,
        category: 'hr',
        status: 'pending',
        applicantId: f.applicantId,
        applicantName: f.applicantName,
        applicantDepartment: f.applicantDepartment,
        applyDate: f.applyDate || new Date().toISOString().slice(0, 10),
        businessLink: { type: m.linkType, requestId: recordId, requestCode: f.requestCode },
      };

      if (DRY_RUN) {
        console.log(`  [DRY] ${m.type} ← ${recordId} | ${f.title}`);
        tCreated++;
        continue;
      }

      try {
        const resp = await fetch(`${API}/approvals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(approval),
        });
        const body = await resp.json().catch(() => ({}));
        if (resp.ok && body.success !== false) {
          created++; tCreated++;
        } else {
          failed++;
          failures.push(`${m.type}/${recordId}: HTTP ${resp.status} ${body.error || JSON.stringify(body).slice(0, 120)}`);
        }
      } catch (e) {
        failed++;
        failures.push(`${m.type}/${recordId}: ${e.message}`);
      }
    }
    console.log(`[${m.table}] pending=${rows.length} 补建=${tCreated} 已挂单跳过=${tSkipped}`);
  }

  console.log('');
  console.log(`汇总: 补建成功=${DRY_RUN ? created + '（dry）' : created} 跳过=${skipped} 失败=${failed}`);
  if (failures.length) {
    console.log('失败明细（fail-loud）:');
    failures.forEach((f) => console.log('  - ' + f));
    process.exitCode = 1;
  }
  db.close();
}

main().catch((e) => { console.error('迁移脚本异常:', e); process.exit(1); });
