/**
 * 作物库存补录申请单路由（2026-10-09）
 *
 * 用于"物料审批 → 补录审批" tab 接收 AddStockModal (sourceType='self_produced') 提交
 *
 * 流程：
 * 1. POST /api/inventory-supplementary-applications
 *    - 事务内：写 inventory_supplementary_applications 表（status=pending）+ 写 approvals 表
 *    - 注意：写申请单 + 写审批（沿用 generateApprovalCode('AP') 格式）
 * 2. GET /api/inventory-supplementary-applications
 *    - 按 status / source_module / 分页 查询
 *
 * 审批通过 → approvalLinkage case 'crop_storage' 真正写 inventory_inbound_records + 流水
 * 审批驳回 → 申请单 status 改为 rejected，不入库
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getDatabase, saveDatabase } from '../db';
import { generateApprovalCode } from '../lib/approvalCode';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ==================== Zod Schema ====================

// 2026-10-09: 申请单 payload
const ApplicationSchema = z.object({
  sourceId: z.string().min(1, { message: 'sourceId 必填' }),
  sourceModule: z.string().min(1, { message: 'sourceModule 必填' }),
  sourceCode: z.string().optional(),
  stockType: z.enum(['seed', 'seedling', 'product'], { message: 'stockType ∈ seed/seedling/product' }),
  cropId: z.string().optional(),
  cropCode: z.string().optional(),
  cropName: z.string().min(1, { message: 'cropName 必填' }),
  varietyName: z.string().optional(),
  plantingMode: z.string().optional(),
  quantity: z.number().positive({ message: 'quantity 必须 > 0' }),
  unit: z.string().min(1, { message: 'unit 必填' }),
  qualityGrade: z.string().optional(),
  warehouseId: z.string().min(1, { message: 'warehouseId 必填' }),
  warehouseName: z.string().optional(),
  supplementaryReason: z.string().min(1, { message: 'supplementaryReason 必填（补录场景）' }),
  unitPrice: z.number().nonnegative().optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  productionPlanId: z.string().optional(),
  productionPlanCode: z.string().optional(),
  notes: z.string().optional(),
  applicantId: z.string().optional(),
  applicantName: z.string().min(1, { message: 'applicantName 必填' }),
  applicantDepartment: z.string().optional(),
  operatorName: z.string().optional(),
});

const ListQuerySchema = z.object({
  status: z.string().optional(),
  sourceModule: z.string().optional(),
  applicantName: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

// ==================== POST ====================

/**
 * POST /api/inventory-supplementary-applications
 * Body: 申请单数据（见 ApplicationSchema）
 *
 * 事务内：
 *   1. INSERT inventory_supplementary_applications
 *   2. INSERT approvals (type='crop_storage_supplementary', status='pending')
 *   3. UPDATE inventory_supplementary_applications SET approval_id/code
 *   4. COMMIT + saveDatabase
 */
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
  const id = `SPA_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const applicationCode = `SPA${now.slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
  const approvalCode = generateApprovalCode('AP');
  const approvalId = `approval_cb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  db.run('BEGIN');
  try {
    // 1. 写申请单
    db.run(`
      INSERT INTO inventory_supplementary_applications (
        id, application_code, applicant_id, applicant_name, applicant_department,
        source_id, source_module, source_code,
        stock_type, crop_id, crop_code, crop_name, variety_name, planting_mode,
        quantity, unit, quality_grade,
        warehouse_id, warehouse_name,
        supplementary_reason, unit_price, total_amount,
        supplier_id, supplier_name,
        production_plan_id, production_plan_code,
        notes,
        approval_id, approval_code, status,
        operator_name, create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)
    `, [
      id,
      applicationCode,
      input.applicantId || '',
      input.applicantName,
      input.applicantDepartment || '',
      input.sourceId,
      input.sourceModule,
      input.sourceCode || '',
      input.stockType,
      input.cropId || '',
      input.cropCode || '',
      input.cropName,
      input.varietyName || '',
      input.plantingMode || '',
      input.quantity,
      input.unit,
      input.qualityGrade || 'qualified',
      input.warehouseId,
      input.warehouseName || '',
      input.supplementaryReason,
      Number(input.unitPrice) || 0,
      (Number(input.quantity) || 0) * (Number(input.unitPrice) || 0),
      input.supplierId || '',
      input.supplierName || '',
      input.productionPlanId || '',
      input.productionPlanCode || '',
      input.notes || '',
      '',  // approval_id (下面更新)
      approvalCode,
      input.operatorName || input.applicantName,
      input.applicantName,
      now,
      now,
    ]);

    // 2. 写 approvals 表（沿用现有审批链路，approvalId 已在路由顶部定义）
    const totalAmount = (Number(input.quantity) || 0) * (Number(input.unitPrice) || 0);
    const businessLink = JSON.stringify({
      type: 'crop_storage',
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
      'crop_storage_supplementary',
      '作物入库补录',
      'business',
      `补录申请：${input.cropName}${input.varietyName ? '·' + input.varietyName : ''} ${input.quantity}${input.unit}`,
      `补录原因：${input.supplementaryReason}｜仓库：${input.warehouseName || input.warehouseId}`,
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
        materialCode: input.cropCode || '',
        materialName: input.cropName,
        spec: input.varietyName || '',
        unit: input.unit,
        requestedQuantity: input.quantity,
      }]),
    ]);

    // 3. 回填申请单的 approval_id（方便物料审批详情查询）
    db.run('UPDATE inventory_supplementary_applications SET approval_id = ? WHERE id = ?', [approvalId, id]);

    // 2026-10-09：申请单提交后立即在 inventory_stock 写一条 status='pending' 的占位记录
    //   让用户在作物库存页面能看到提交的数据，状态显示"审核中"
    //   审批通过 → 后端联动 UPDATE status='in_stock'（库存中）
    //   审批驳回 → 后端联动 UPDATE status='cancelled'（已取消）
    // ID 格式按 stockType 区分 prefix (IPR/ISE/INS-YYYYMMDD-NNNN)，与 inventory.ts:255 统一
    const suppStockTypeVal = input.stockType || 'product';
    const suppPrefix = suppStockTypeVal === 'seed' ? 'INS' : suppStockTypeVal === 'seedling' ? 'ISE' : 'IPR';
    const suppDateStr = now.slice(0, 10).replace(/-/g, '');
    const suppIdStmt = db.prepare(`
      SELECT instance_id FROM inventory_stock
      WHERE instance_id LIKE ? AND LENGTH(instance_id) = ? AND SUBSTR(instance_id, -4) GLOB '[0-9][0-9][0-9][0-9]'
      ORDER BY SUBSTR(instance_id, -4) DESC LIMIT 1
    `);
    suppIdStmt.bind([`${suppPrefix}-${suppDateStr}-____`, 17]);
    let suppMaxSerialVal = 0;
    if (suppIdStmt.step()) {
      const r = suppIdStmt.getAsObject() as { instance_id: string };
      const n = parseInt(r.instance_id.slice(-4), 10);
      suppMaxSerialVal = isNaN(n) ? 0 : n;
    }
    suppIdStmt.free();
    const placeholderStockId = `${suppPrefix}-${suppDateStr}-${String(suppMaxSerialVal + 1).padStart(4, '0')}`;
    db.run(`
      INSERT INTO inventory_stock (
        id, instance_id, stock_type, business_id, business_type, business_code,
        source_module, source_id, source_type, crop_id, crop_code, crop_name, variety_name,
        current_quantity, available_quantity, unit, warehouse_id, warehouse_name,
        quality_grade, supplier_id, supplier_name, unit_price, total_amount,
        inbound_date, production_plan_id, production_plan_code, planting_mode,
        notes, status, version, is_supplementary, create_time, update_time
      ) VALUES (?, ?, ?, ?, 'inbound', ?, ?, ?, 'self_produced', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 1, 1, ?, ?)
    `, [
      placeholderStockId,
      placeholderStockId,
      input.stockType,
      id,                                                          // business_id = 申请单 id（联动通过它定位）
      applicationCode,
      input.sourceModule,
      input.sourceId || '',
      input.cropId || '',
      // 2026-10-09：作物编码截 9 位——前端品种库输出 11 位（FR010100100），库存体系标准 9 位
      // （FR0101001，尾部两位细分层恒 '00'）；不截断会与同作物历史行编码割裂
      String(input.cropCode || '').slice(0, 9),
      input.cropName,
      input.varietyName || '',
      input.quantity, input.quantity, input.unit,
      input.warehouseId,
      input.warehouseName || '',
      input.qualityGrade || 'qualified',
      input.supplierId || '',
      input.supplierName || '',
      input.unitPrice || 0,
      (input.quantity || 0) * (input.unitPrice || 0),
      now.slice(0, 10),
      input.productionPlanId || '',
      input.productionPlanCode || '',
      input.plantingMode || '',
      `补录申请 ${applicationCode} 审核中`,
      now, now,
    ]);

    db.run('COMMIT');
  } catch (e) {
    db.run('ROLLBACK');
    console.error('[POST /inventory-supplementary-applications] 创建失败:', e);
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

/**
 * GET /api/inventory-supplementary-applications
 * Query: status / sourceModule / applicantName / startDate / endDate / page / limit
 */
router.get('/', (req: Request, res: Response) => {
  const parsed = ListQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ success: false, error: '查询参数不合法' });
  }
  const { status, sourceModule, applicantName, startDate, endDate, page = 1, limit = 20 } = parsed.data;
  const db = getDatabase();
  const offset = (page - 1) * limit;

  // 拼接 WHERE
  const where: string[] = ['1=1'];
  const params: any[] = [];
  if (status) { where.push('status = ?'); params.push(status); }
  if (sourceModule) { where.push('source_module = ?'); params.push(sourceModule); }
  if (applicantName) { where.push('applicant_name LIKE ?'); params.push(`%${applicantName}%`); }
  if (startDate) { where.push('create_time >= ?'); params.push(startDate); }
  if (endDate) { where.push('create_time <= ?'); params.push(endDate + 'T23:59:59'); }
  const whereSql = where.join(' AND ');

  // 总数
  const totalRows = db.exec(`SELECT COUNT(*) AS cnt FROM inventory_supplementary_applications WHERE ${whereSql}`, params);
  const total = totalRows.length > 0 && totalRows[0].values.length > 0 ? Number(totalRows[0].values[0][0]) || 0 : 0;

  // 分页数据
  const rows = db.exec(`
    SELECT id, application_code, applicant_id, applicant_name, applicant_department,
           source_id, source_module, source_code, stock_type, crop_id, crop_code,
           crop_name, variety_name, planting_mode, quantity, unit, quality_grade,
           warehouse_id, warehouse_name, supplementary_reason, unit_price, total_amount,
           supplier_id, supplier_name, production_plan_id, production_plan_code,
           notes, approval_id, approval_code, status,
           operator_name, create_by, create_time, update_time
    FROM inventory_supplementary_applications
    WHERE ${whereSql}
    ORDER BY create_time DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const data = rows.length > 0
    ? rows[0].values.map((v: any[]) => ({
        id: v[0],
        applicationCode: v[1],
        applicantId: v[2],
        applicantName: v[3],
        applicantDepartment: v[4],
        sourceId: v[5],
        sourceModule: v[6],
        sourceCode: v[7],
        stockType: v[8],
        cropId: v[9],
        cropCode: v[10],
        cropName: v[11],
        varietyName: v[12],
        plantingMode: v[13],
        quantity: v[14],
        unit: v[15],
        qualityGrade: v[16],
        warehouseId: v[17],
        warehouseName: v[18],
        supplementaryReason: v[19],
        unitPrice: v[20],
        totalAmount: v[21],
        supplierId: v[22],
        supplierName: v[23],
        productionPlanId: v[24],
        productionPlanCode: v[25],
        notes: v[26],
        approvalId: v[27],
        approvalCode: v[28],
        status: v[29],
        operatorName: v[30],
        createBy: v[31],
        createTime: v[32],
        updateTime: v[33],
      }))
    : [];

  res.json({
    success: true,
    data,
    meta: { total, page, limit },
  });
});

/**
 * GET /api/inventory-supplementary-applications/:id
 * 查询单条申请单详情
 */
router.get('/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  const rows = db.exec(`SELECT * FROM inventory_supplementary_applications WHERE id = ?`, [req.params.id]);
  if (rows.length === 0 || rows[0].values.length === 0) {
    return res.status(404).json({ success: false, error: '申请单不存在' });
  }
  const v = rows[0].values[0];
  res.json({
    success: true,
    data: {
      id: v[0],
      applicationCode: v[1],
      applicantId: v[2],
      applicantName: v[3],
      applicantDepartment: v[4],
      sourceId: v[5],
      sourceModule: v[6],
      sourceCode: v[7],
      stockType: v[8],
      cropId: v[9],
      cropCode: v[10],
      cropName: v[11],
      varietyName: v[12],
      plantingMode: v[13],
      quantity: v[14],
      unit: v[15],
      qualityGrade: v[16],
      warehouseId: v[17],
      warehouseName: v[18],
      supplementaryReason: v[19],
      unitPrice: v[20],
      totalAmount: v[21],
      supplierId: v[22],
      supplierName: v[23],
      productionPlanId: v[24],
      productionPlanCode: v[25],
      notes: v[26],
      approvalId: v[27],
      approvalCode: v[28],
      status: v[29],
      operatorName: v[30],
      createBy: v[31],
      createTime: v[32],
      updateTime: v[33],
    },
  });
});

export default router;