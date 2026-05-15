/**
 * 物料管理 API 路由
 */

import { Router, Request, Response } from 'express';
import * as materialsDb from '../db/materials';

const router = Router();

// ==================== 物料管理 ====================

/**
 * 获取所有物料
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const materials = materialsDb.getAllMaterials();
    res.json(materials);
  } catch (error) {
    console.error('获取物料列表失败:', error);
    res.status(500).json({ error: '获取物料列表失败' });
  }
});

/**
 * 创建物料
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const material = req.body;
    const id = materialsDb.createMaterial({
      code: material.code,
      name: material.name,
      category: material.category,
      specification: material.specification,
      unit: material.unit,
      quantity: material.quantity || 0,
      minStock: material.minStock || 0,
      maxStock: material.maxStock || 0,
      price: material.price || '',
      supplier: material.supplier || '',
      location: material.location || '',
      barcode: material.barcode || '',
      batchNo: material.batchNo || '',
      productionDate: material.productionDate || '',
      expiryDate: material.expiryDate || '',
      lastUpdateTime: new Date().toISOString(),
      dataStatus: material.dataStatus || '启用'
    });
    res.status(201).json({ id });
  } catch (error) {
    console.error('创建物料失败:', error);
    res.status(500).json({ error: '创建物料失败' });
  }
});

// ==================== 入库记录管理 ====================
// 注意：入库记录路由必须在 /:id 路由之前定义，避免 /inbound 被 :id 匹配

/**
 * 获取所有入库记录
 */
router.get('/inbound', (req: Request, res: Response) => {
  try {
    const records = materialsDb.getAllInboundRecords();
    // 解析 materials JSON 字段，并兼容旧字段名 materialCode→code, materialName→name
    const parsedRecords = records.map(record => ({
      ...record,
      materials: record.materials ? JSON.parse(record.materials).map((m: any) => ({
        ...m,
        code: m.code || m.materialCode || '',
        name: m.name || m.materialName || '',
      })) : []
    }));
    res.json(parsedRecords);
  } catch (error) {
    console.error('获取入库记录失败:', error);
    res.status(500).json({ error: '获取入库记录失败' });
  }
});

/**
 * 创建入库记录
 */
router.post('/inbound', (req: Request, res: Response) => {
  try {
    const record = req.body;
    const id = materialsDb.createInboundRecord({
      code: record.code,
      inboundDate: record.inboundDate,
      supplier: record.supplier,
      operator: record.operator,
      status: record.status || 'pending',
      materials: record.materials || []
    });
    // 入库即完成 → 自动同步物料库存
    if (record.status === 'completed' && record.materials?.length > 0) {
      materialsDb.syncInboundToMaterials(record.materials);
    }
    // 返回完整记录（含解析后的 materials 数组，兼容旧字段名）
    const created = materialsDb.getInboundRecordById(id);
    res.status(201).json({
      ...created,
      materials: created?.materials ? JSON.parse(created.materials).map((m: any) => ({
        ...m,
        code: m.code || m.materialCode || '',
        name: m.name || m.materialName || '',
      })) : []
    });
  } catch (error) {
    console.error('创建入库记录失败:', error);
    res.status(500).json({ error: '创建入库记录失败' });
  }
});

/**
 * 根据ID获取入库记录
 */
router.get('/inbound/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const record = materialsDb.getInboundRecordById(id);
    if (!record) {
      return res.status(404).json({ error: '入库记录不存在' });
    }
    res.json({
      ...record,
      materials: record.materials ? JSON.parse(record.materials).map((m: any) => ({
        ...m,
        code: m.code || m.materialCode || '',
        name: m.name || m.materialName || '',
      })) : []
    });
  } catch (error) {
    console.error('获取入库记录详情失败:', error);
    res.status(500).json({ error: '获取入库记录详情失败' });
  }
});

/**
 * 更新入库记录
 */
router.put('/inbound/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    // materials 数组需序列化为 JSON 字符串存入 TEXT 列
    if (updates.materials) {
      // 深拷贝避免修改原引用
      const sanitized = { ...updates, materials: JSON.stringify(updates.materials) };
      // 判断状态是否转为 completed：先查旧记录
      if (updates.status === 'completed') {
        const oldRecord = materialsDb.getInboundRecordById(id);
        const wasCompleted = oldRecord?.status === 'completed';
        if (!wasCompleted) {
          // pending → completed：触发库存同步
          materialsDb.syncInboundToMaterials(updates.materials);
        }
      }
      materialsDb.updateInboundRecord(id, sanitized);
    } else {
      materialsDb.updateInboundRecord(id, updates);
    }
    // 返回更新后的完整记录（兼容旧字段名）
    const updated = materialsDb.getInboundRecordById(id);
    res.json({
      ...updated,
      materials: updated?.materials ? JSON.parse(updated.materials).map((m: any) => ({
        ...m,
        code: m.code || m.materialCode || '',
        name: m.name || m.materialName || '',
      })) : []
    });
  } catch (error) {
    console.error('更新入库记录失败:', error);
    res.status(500).json({ error: '更新入库记录失败' });
  }
});

/**
 * 删除入库记录
 */
router.delete('/inbound/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    materialsDb.deleteInboundRecord(id);
    res.json({ success: true });
  } catch (error) {
    console.error('删除入库记录失败:', error);
    res.status(500).json({ error: '删除入库记录失败' });
  }
});

// ==================== 特定 ID 路由（在入库记录路由之后）===================

/**
 * 根据ID获取物料
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const material = materialsDb.getMaterialById(id);
    if (!material) {
      return res.status(404).json({ error: '物料不存在' });
    }
    res.json(material);
  } catch (error) {
    console.error('获取物料详情失败:', error);
    res.status(500).json({ error: '获取物料详情失败' });
  }
});

/**
 * 更新物料
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    updates.lastUpdateTime = new Date().toISOString();
    materialsDb.updateMaterial(id, updates);
    res.json({ success: true });
  } catch (error) {
    console.error('更新物料失败:', error);
    res.status(500).json({ error: '更新物料失败' });
  }
});

/**
 * 删除物料
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    materialsDb.deleteMaterial(id);
    res.json({ success: true });
  } catch (error) {
    console.error('删除物料失败:', error);
    res.status(500).json({ error: '删除物料失败' });
  }
});

export default router;
