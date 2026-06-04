/**
 * 问题附件路由（V2.1 铁律：后端化替代前端 localStorage）
 * 2026-06-04 新建
 *
 * 数据流：useProblemAttachments → apiProblemAttachmentService → /api/problem-attachments → SQLite
 * 表：problem_attachments
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

interface AttachmentRow {
  id: string;
  problemId: number;
  flowRecordId: string | null;
  attachmentType: string;
  data: string;
  filename: string | null;
  createdAt: string;
}

/** 单条附件插入 */
function insertAttachment(row: AttachmentRow) {
  const db = getDatabase();
  db.run(
    `INSERT INTO problem_attachments (id, problem_id, flow_record_id, attachment_type, data, filename, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [row.id, row.problemId, row.flowRecordId, row.attachmentType, row.data, row.filename, row.createdAt]
  );
}

/** POST / - 上传单条 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { id, problemId, flowRecordId, attachmentType, data, filename, createdAt } = req.body || {};
    if (!id || !problemId || !attachmentType || !data) {
      return res.status(400).json({ success: false, error: 'id/problemId/attachmentType/data 必填' });
    }
    insertAttachment({
      id, problemId, flowRecordId: flowRecordId || null,
      attachmentType, data, filename: filename || null,
      createdAt: createdAt || new Date().toISOString(),
    });
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** POST /batch - 批量上传 */
router.post('/batch', (req: Request, res: Response) => {
  try {
    const list = Array.isArray(req.body) ? req.body : (req.body?.items || []);
    if (!Array.isArray(list) || list.length === 0) {
      return res.status(400).json({ success: false, error: 'items 必须是非空数组' });
    }
    const ids: string[] = [];
    for (const r of list) {
      if (!r.id || !r.problemId || !r.attachmentType || !r.data) {
        return res.status(400).json({ success: false, error: '每条记录必填 id/problemId/attachmentType/data' });
      }
      insertAttachment({
        id: r.id,
        problemId: r.problemId,
        flowRecordId: r.flowRecordId || null,
        attachmentType: r.attachmentType,
        data: r.data,
        filename: r.filename || null,
        createdAt: r.createdAt || new Date().toISOString(),
      });
      ids.push(r.id);
    }
    res.json({ success: true, data: { ids, count: ids.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** GET / - 按 problemId 查询（也支持 flowRecordId） */
router.get('/', (req: Request, res: Response) => {
  try {
    const { problemId, flowRecordId } = req.query;
    if (problemId) {
      const rows = queryToObjects<AttachmentRow>(
        getDatabase(),
        `SELECT id, problem_id AS problemId, flow_record_id AS flowRecordId,
                attachment_type AS attachmentType, data, filename, created_at AS createdAt
         FROM problem_attachments WHERE problem_id = ? ORDER BY created_at`,
        [Number(problemId)]
      );
      return res.json({ success: true, data: rows });
    }
    if (flowRecordId) {
      const rows = queryToObjects<AttachmentRow>(
        getDatabase(),
        `SELECT id, problem_id AS problemId, flow_record_id AS flowRecordId,
                attachment_type AS attachmentType, data, filename, created_at AS createdAt
         FROM problem_attachments WHERE flow_record_id = ? ORDER BY created_at`,
        [String(flowRecordId)]
      );
      return res.json({ success: true, data: rows });
    }
    res.status(400).json({ success: false, error: 'problemId 或 flowRecordId 至少一个必填' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** DELETE /:id - 删除单条 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM problem_attachments WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** DELETE /by-problem/:problemId - 删除问题所有附件 */
router.delete('/by-problem/:problemId', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM problem_attachments WHERE problem_id = ?', [Number(req.params.problemId)]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
