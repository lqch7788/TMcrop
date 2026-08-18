/**
 * 种植标签履历管理 API 路由
 * plant_label_resume — 履历 CRUD + 乐观锁 CAS + 数量追踪 + 状态自动转换
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/** GET /:id/resumes — 获取标签履历 */
router.get('/:id/resumes', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db,
      `SELECT * FROM plant_label_resume WHERE label_id = ? ORDER BY operation_date DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /:id/resumes — 新增标签履历（乐观锁 CAS + 数量追踪 + 状态自动转换） */
router.post('/:id/resumes', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const labelId = parseInt(req.params.id, 10);
    const {
      operation_type, from_area_name, to_area_name,
      mark_id, mark_name, mark_color, operation_date, operator_name,
      image_base64, quantity_change, reason, expected_quantity,
    } = req.body;

    if (!operation_type || !operation_date) {
      res.status(400).json({ success: false, error: 'operation_type 和 operation_date 为必填项' });
      return;
    }

    const label = queryToObjects(db, `SELECT * FROM plant_labels WHERE id = ?`, [labelId]);
    if (label.length === 0) {
      res.status(404).json({ success: false, error: '标签不存在' });
      return;
    }

    const currentQuantity = Number(label[0].quantity) || 0;

    // 乐观锁 CAS 校验
    if (expected_quantity !== undefined && expected_quantity !== null) {
      if (currentQuantity !== Number(expected_quantity)) {
        res.status(409).json({
          success: false,
          error: '数据已被修改，请重新读取后再提交',
          currentQuantity,
        });
        return;
      }
    }

    const qtyChange = quantity_change ? Number(quantity_change) : 0;

    // 2026-08-17：数量变更范围校验（防 UI/API 直调写入脏数据）
    // 标签 quantity 字段语义 = "本标签代表的当前数量"（单株通常为 1）
    // 拒绝 |qtyChange| > currentQuantity 的请求（除 0 外的所有非空 qtyChange 必须 ≤ currentQuantity）
    if (quantity_change !== undefined && quantity_change !== null && qtyChange !== 0) {
      if (Math.abs(qtyChange) > currentQuantity) {
        res.status(400).json({
          success: false,
          error: `数量变更绝对值（${Math.abs(qtyChange)}）超出当前标签数量（${currentQuantity}）。`
            + `单株标签只能填 -1（死亡/消耗），批量标签请确认是否选错标签。`,
          currentQuantity,
        });
        return;
      }
    }

    // 2026-08-17：BUG 修复 — qtyChange 自带符号（-1 表示扣减、+1 表示增加），
    //   原代码用 currentQuantity - qtyChange 导致 -1 时数量反而增加（1 - (-1) = 2）
    //   应为 currentQuantity + qtyChange；Math.max(0, ...) 防越界
    const newQuantity = Math.max(0, currentQuantity + qtyChange);

    // 2026-08-17：合并 move_in/move_out 为统一 'move'（AddResumeForm 位置变更 Tab）
    //   起点 (from_area_name) 默认 = 标签当前区域，用户可手动改
    //   终点 (to_area_name) = 新位置
    //   标签表更新：move_out_area_name = 终点（"最新已知位置"语义）
    //   兼容旧 move_in/move_out：依然按原逻辑写入（保持历史行为）
    if (operation_type === 'move') {
      db.run(`UPDATE plant_labels SET move_out_area_name = ?, move_out_date = ?, quantity = ? WHERE id = ?`,
        [to_area_name || '', operation_date, newQuantity, labelId]);
    } else if (operation_type === 'move_in') {
      db.run(`UPDATE plant_labels SET move_in_area_name = ?, move_in_date = ? WHERE id = ?`,
        [to_area_name || '', operation_date, labelId]);
    } else if (operation_type === 'move_out') {
      db.run(`UPDATE plant_labels SET move_out_area_name = ?, move_out_date = ?, quantity = ? WHERE id = ?`,
        [to_area_name || '', operation_date, newQuantity, labelId]);
    }

    // 状态自动转换
    let newStatus: string = label[0].status || 'active';
    if (operation_type === 'void') {
      newStatus = 'voided';
    } else if ((operation_type === 'move_out' || operation_type === 'move') && !quantity_change) {
      // 2026-08-17：move 也算"位置变更完成" → 状态变 moved_out（若无数量扣减）
      newStatus = 'moved_out';
    } else if (newQuantity === 0) {
      newStatus = 'voided';
    }

    db.run(`UPDATE plant_labels SET status = ? WHERE id = ?`, [newStatus, labelId]);

    // 插入履历（含数量追踪字段）
    db.run(
      `INSERT INTO plant_label_resume (label_id, operation_type, from_area_name, to_area_name,
        mark_id, mark_name, mark_color, operation_date, operator_name,
        image_base64, quantity_change, quantity_after, reason)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        labelId, operation_type,
        from_area_name || null, to_area_name || null,
        mark_id || null, mark_name || null, mark_color || null,
        operation_date, operator_name || null,
        image_base64 || null,
        qtyChange || null, newQuantity, reason || null,
      ]
    );

    res.status(201).json({
      success: true,
      data: { labelId, operation_type, operation_date, quantity: newQuantity, status: newStatus },
    });
    saveDatabase();
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
