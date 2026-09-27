/**
 * 已删除单据归档查询 — GET /api/deleted-documents
 *
 * 2026-09-27 审计方案（追溯保护）：
 *  - 已发料出库单禁止物理删除（改为作废，本体保留）
 *  - 允许删除的单据（待出库单/申请单）删除时整行快照归档到 deleted_documents_archive
 *  - 本端点提供"虽然不在列表显示、但查得到"的追溯入口（按单号/类型/日期）
 *
 * 说明：归档含完整快照（含物料明细），永久留存、不参与 operation_logs 的 180 天清理。
 */
import { Router, Request, Response } from 'express';
import { queryDeletedDocuments } from '../db/deletedDocumentsArchive';

const router = Router();

/** 查询已删除单据（只读） */
router.get('/', (req: Request, res: Response) => {
  try {
    const code = String(req.query.code || '').trim();
    const type = String(req.query.type || '').trim();
    const from = String(req.query.from || '').trim();
    const to = String(req.query.to || '').trim();
    const limit = Number(req.query.limit) || 100;

    const rows = queryDeletedDocuments({
      code: code || undefined,
      type: type || undefined,
      from: from || undefined,
      to: to || undefined,
      limit,
    });
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('查询已删除单据失败:', error);
    res.status(500).json({ success: false, error: '查询已删除单据失败' });
  }
});

export default router;
