/**
 * 育苗补录申请单路由（2026-10-09）
 *
 * 用于"物料审批 → 补录审批" tab 接收 HarvestRecordModal (destination='planting_self_kept') 提交
 *
 * 流程：
 * 1. POST /api/seedling-supplementary-applications
 *    - 事务内：写 seedling_supplementary_applications 表 + 写 approvals 表
 * 2. GET /api/seedling-supplementary-applications
 *    - 按 status / 分页 查询
 *
 * 审批通过 → approvalLinkage case 'seedling' 写 planting_harvest_records + 流转回流到 seed_sources
 * 审批驳回 → 申请单 status 改为 rejected
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase, saveDatabase } from '../db';
import { generateApprovalCode } from '../lib/approvalCode';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

const ApplicationSchema = z.object({
  sourceId: z.string().min(1, { message: 'sourceId 必填' }),
  sourceModule: z.string().optional(),
  sourceCode: z.string().optional(),
  cropId: z.string().optional(),
  cropCode: z.string().optional(),
  cropName: z.string().min(1, { message: 'cropName 必填' }),
  varietyName: z.string().optional(),
  seedForm: z.string().min(1, { message: 'seedForm 必填（采收形态）' }),
  generation: z.string().optional(),
  forceNew: z.number().int().min(0).max(1).optional(),
  quantity: z.number().positive({ message: 'quantity 必须 > 0' }),
  unit: z.string().min(1, { message: 'unit 必填' }),
  supplementaryReason: z.string().min(1, { message: 'supplementaryReason 必填' }),
  notes: z.string().optional(),
  applicantId: z.string().optional(),
  applicantName: z.string().min(1, { message: 'applicantName 必填' }),
  applicantDepartment: z.string().optional(),
  operatorName: z.string().optional(),
});

const ListQuerySchema = z.object({
  status: z.string().optional(),
  applicantName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// ==================== POST ====================

router.post('/', (req: Request, res: Response) => {
  const parsed = ApplicationSchema.safeParse(req.body);
  if (!parsed.success) {
    const issues: any[] = (parsed.error as any)?.issues || (parsed.error as any)?.errors || [];
    const firstMsg = issues[0]?.message || '参数校验失败';
    return res.status(400).json({ success: false, error: firstMsg, issues });
  }
  const input = parsed.data;
  const db = getDatabase();
  const now = new Date().toISOString();
  const id = `SSA_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const applicationCode = `SSA${now.slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const approvalCode = generateApprovalCode('AP');
  const approvalId = `approval_yb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  db.run('BEGIN');
  try {
    db.run(`
      INSERT INTO seedling_supplementary_applications (
        id, application_code, applicant_id, applicant_name, applicant_department,
        source_id, source_module, source_code,
        crop_id, crop_code, crop_name, variety_name,
        seed_form, generation, force_new,
        quantity, unit,
        supplementary_reason, notes,
        approval_id, approval_code, status,
        operator_name, create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, applicationCode, input.applicantId || '', input.applicantName, input.applicantDepartment || '',
      input.sourceId, input.sourceModule || 'planting', input.sourceCode || '',
      input.cropId || '', input.cropCode || '', input.cropName, input.varietyName || '',
      input.seedForm, input.generation || '', input.forceNew ? 1 : 0,
      input.quantity, input.unit,
      input.supplementaryReason, input.notes || '',
      approvalId, approvalCode, 'pending',
      input.operatorName || input.applicantName, input.applicantName,
      now, now,
    ]);

    // 写 approvals
    const businessLink = JSON.stringify({
      type: 'seedling',
      requestId: id,
      requestCode: applicationCode,
    });
    db.run(`
      INSERT INTO approvals (
        id, code, type, type_name, category, title, description,
        applicant_id, applicant_name, applicant_department,
        apply_date, apply_time, current_step, total_steps,
        status, priority, due_date, business_link, attachments,
        created_at, updated_at, materials
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      approvalId, approvalCode, 'seedling_supplementary', '育苗补录', 'business',
      `育苗补录：${input.cropName}${input.varietyName ? '·' + input.varietyName : ''} ${input.seedForm} ${input.quantity}${input.unit}`,
      `补录原因：${input.supplementaryReason}｜形态：${input.seedForm}${input.generation ? ' 世代:' + input.generation : ''}`,
      input.applicantId || '', input.applicantName, input.applicantDepartment || '',
      now.slice(0, 10), now.slice(11, 19), 1, 1, 'pending', 'normal', null, businessLink, null,
      now, now,
      JSON.stringify([{
        materialCode: input.cropCode || '', materialName: input.cropName,
        spec: input.varietyName || '', unit: input.unit, requestedQuantity: input.quantity,
      }]),
    ]);

    // 回填 approval_id
    db.run('UPDATE seedling_supplementary_applications SET approval_id = ? WHERE id = ?', [approvalId, id]);

    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    console.error('[POST /seedling-supplementary-applications] 创建失败:', e);
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : '创建失败' });
  }
  saveDatabase();

  res.status(201).json({
    success: true,
    data: { id, applicationCode, approvalId, approvalCode, status: 'pending' },
  });
});

// ==================== GET ====================

const CAM_MAP: Record<string, string> = {
  application_code: 'applicationCode',
  applicant_id: 'applicantId',
  applicant_name: 'applicantName',
  applicant_department: 'applicantDepartment',
  source_id: 'sourceId',
  source_module: 'sourceModule',
  source_code: 'sourceCode',
  crop_id: 'cropId',
  crop_code: 'cropCode',
  crop_name: 'cropName',
  variety_name: 'varietyName',
  seed_form: 'seedForm',
  force_new: 'forceNew',
  supplementary_reason: 'supplementaryReason',
  approval_id: 'approvalId',
  approval_code: 'approvalCode',
  operator_name: 'operatorName',
  create_by: 'createBy',
  create_time: 'createTime',
  update_time: 'updateTime',
};

const colsToCamel = (cols: string[], vals: any[]): any => {
  const obj: any = {};
  cols.forEach((c, i) => { obj[CAM_MAP[c] || c] = vals[i]; });
  return obj;
};

router.get('/', (req: Request, res: Response) => {
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: '查询参数不合法' });
  }
  const { status, applicantName, startDate, endDate, page = 1, limit = 20 } = parsed.data;
  const db = getDatabase();
  const offset = (page - 1) * limit;

  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (status) { where.push('status = ?'); params.push(status); }
  if (applicantName) { where.push('applicant_name LIKE ?'); params.push(`%${applicantName}%`); }
  if (startDate) { where.push('create_time >= ?'); params.push(startDate); }
  if (endDate) { where.push('create_time <= ?'); params.push(endDate + 'T23:59:59'); }
  const whereSql = where.join(' AND ');

  const totalRows = db.exec(`SELECT COUNT(*) AS cnt FROM seedling_supplementary_applications WHERE ${whereSql}`, params);
  const total = totalRows.length > 0 && totalRows[0].values.length > 0 ? Number(totalRows[0].values[0][0]) || 0 : 0;

  const rows = db.exec(`SELECT * FROM seedling_supplementary_applications WHERE ${whereSql} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]);
  const data = rows.length > 0 ? rows[0].values.map((v: any[]) => colsToCamel(rows[0].columns, v)) : [];
  res.json({ success: true, data, meta: { total, page, limit } });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const rows = db.exec(`SELECT * FROM seedling_supplementary_applications WHERE id = ?`, [req.params.id]);
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.status(404).json({ success: false, error: '育苗补录申请单不存在' });
  }
  res.json({ success: true, data: colsToCamel(rows[0].columns, rows[0].values[0]) });
});

export default router;