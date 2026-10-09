/**
 * 作物库存调拨申请单路由（2026-10-09）
 *
 * 用于"物料审批 → 库存调拨" tab 接收 AddStockModal (sourceType='transfer') 提交
 *
 * 流程：
 * 1. POST /api/inventory-transfer-applications
 *    - 事务内：写 inventory_transfer_applications 表（status=pending）+ 写 approvals 表
 * 2. GET /api/inventory-transfer-applications
 *    - 按 status / 分页 查询
 *
 * 审批通过 → approvalLinkage case 'material_transfer' 真做跨仓库：源扣减 + 目标加 + 2 条流水
 * 审批驳回 → 申请单 status 改为 rejected，不调拨
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase, saveDatabase } from '../db';
import { generateApprovalCode } from '../lib/approvalCode';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ==================== Zod Schema ====================

const ApplicationSchema = z.object({
  // 2026-10-09 修复：sourceWarehouseId 改 optional——"调拨入库"的产品语义是"从其他基地/仓库调入"，
  // 源仓库可能不在本系统（外部仓库自由文本），前端只有名称下拉。强制必填导致前端提交 100% 400 失败。
  // 若前端能反查到系统内仓库 id 会传值（内部调拨，联动作源扣减）；外部仓库场景为空。
  sourceWarehouseId: z.string().optional(),
  sourceWarehouseName: z.string().optional(),
  targetWarehouseId: z.string().min(1, { message: 'targetWarehouseId 必填' }),
  targetWarehouseName: z.string().optional(),
  sourceStockId: z.string().optional(),
  sourceStockCode: z.string().optional(),
  materialId: z.string().optional(),
  materialCode: z.string().optional(),
  materialName: z.string().min(1, { message: 'materialName 必填' }),
  category: z.string().optional(),
  specification: z.string().optional(),
  quantity: z.number().positive({ message: 'quantity 必须 > 0' }),
  unit: z.string().min(1, { message: 'unit 必填' }),
  transferReason: z.string().min(1, { message: 'transferReason 必填' }),
  transferType: z.string().optional(),
  expectedDate: z.string().optional(),
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
  const id = `TRA_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const applicationCode = `TRA${now.slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const approvalCode = generateApprovalCode('AP');
  const approvalId = `approval_mt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  db.run('BEGIN');
  try {
    // 1. 写申请单
    db.run(`
      INSERT INTO inventory_transfer_applications (
        id, application_code, applicant_id, applicant_name, applicant_department,
        source_warehouse_id, source_warehouse_name,
        target_warehouse_id, target_warehouse_name,
        source_stock_id, source_stock_code,
        material_id, material_code, material_name, category, specification,
        quantity, unit,
        transfer_reason, transfer_type, expected_date,
        approval_id, approval_code, status,
        notes, operator_name, create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    `, [
      id,
      applicationCode,
      input.applicantId || '',
      input.applicantName,
      input.applicantDepartment || '',
      input.sourceWarehouseId || '',
      input.sourceWarehouseName || '',
      input.targetWarehouseId,
      input.targetWarehouseName || '',
      input.sourceStockId || '',
      input.sourceStockCode || '',
      input.materialId || '',
      input.materialCode || '',
      input.materialName,
      input.category || '',
      input.specification || '',
      input.quantity,
      input.unit,
      input.transferReason,
      input.transferType || 'cross_warehouse',
      input.expectedDate || '',
      approvalId,
      approvalCode,
      input.notes || '',
      input.operatorName || input.applicantName,
      input.applicantName,
      now,
      now,
    ]);

    // 2. 写 approvals 表
    const businessLink = JSON.stringify({
      type: 'material_transfer',
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
      approvalId,
      approvalCode,
      'material_transfer',
      '库存调拨',
      'business',
      `调拨申请：${input.materialName} ${input.quantity}${input.unit}（${input.sourceWarehouseName || input.sourceWarehouseId} → ${input.targetWarehouseName || input.targetWarehouseId}）`,
      `调拨原因：${input.transferReason}`,
      input.applicantId || '',
      input.applicantName,
      input.applicantDepartment || '',
      now.slice(0, 10),
      now.slice(11, 19),
      1,
      1,
      'pending',
      'normal',
      null,
      businessLink,
      null,
      now,
      now,
      JSON.stringify([{
        materialCode: input.materialCode || '',
        materialName: input.materialName,
        spec: input.specification || '',
        unit: input.unit,
        requestedQuantity: input.quantity,
      }]),
    ]);

    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    console.error('[POST /inventory-transfer-applications] 创建失败:', e);
    return res.status(500).json({ success: false, error: e instanceof Error ? e.message : '创建失败' });
  }
  saveDatabase();

  res.status(201).json({
    success: true,
    data: {
      id,
      applicationCode,
      approvalId,
      approvalCode,
      status: 'pending',
    },
  });
});

// ==================== GET ====================

const CAM_MAP: Record<string, string> = {
  application_code: 'applicationCode',
  applicant_id: 'applicantId',
  applicant_name: 'applicantName',
  applicant_department: 'applicantDepartment',
  source_warehouse_id: 'sourceWarehouseId',
  source_warehouse_name: 'sourceWarehouseName',
  target_warehouse_id: 'targetWarehouseId',
  target_warehouse_name: 'targetWarehouseName',
  source_stock_id: 'sourceStockId',
  source_stock_code: 'sourceStockCode',
  material_id: 'materialId',
  material_code: 'materialCode',
  material_name: 'materialName',
  transfer_reason: 'transferReason',
  transfer_type: 'transferType',
  expected_date: 'expectedDate',
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

  const totalRows = db.exec(`SELECT COUNT(*) AS cnt FROM inventory_transfer_applications WHERE ${whereSql}`, params);
  const total = totalRows.length > 0 && totalRows[0].values.length > 0 ? Number(totalRows[0].values[0][0]) || 0 : 0;

  const rows = db.exec(`
    SELECT * FROM inventory_transfer_applications
    WHERE ${whereSql}
    ORDER BY create_time DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const data = rows.length > 0
    ? rows[0].values.map((v: any[]) => colsToCamel(rows[0].columns, v))
    : [];

  res.json({
    success: true,
    data,
    meta: { total, page, limit },
  });
});

router.get('/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const rows = db.exec(`SELECT * FROM inventory_transfer_applications WHERE id = ?`, [req.params.id]);
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.status(404).json({ success: false, error: '调拨申请单不存在' });
  }
  res.json({ success: true, data: colsToCamel(rows[0].columns, rows[0].values[0]) });
});

export default router;