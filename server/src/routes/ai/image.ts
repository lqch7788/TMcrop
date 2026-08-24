/**
 * AI-09 病虫害图像识别 REST 端点（V2 — base64 上传 + 真实 image_id）
 * 2026-08-22：P1 MVP
 * 2026-08-24 PR6：新增 /upload 端点接收 base64 图片，写入 pest_images 表，返回真实 image_id
 *
 * POST /api/ai/image/upload    上传图片（base64）
 * POST /api/ai/image/identify  识别（需 image_id；模型未部署时抛错）
 * GET  /api/ai/image/list      列出已上传图片（调试用）
 */

import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { getDatabase } from '../../db';
import { identifyPestImage } from '../../services/ai/imageId';

const router = Router();

const UPLOAD_DIR = path.join(__dirname, '../../../../uploads/pest-images');

/**
 * POST /api/ai/image/upload
 * 入参：{ filename: string, data: 'data:image/png;base64,...' }
 * 出参：{ success, data: { image_id, file_path, uploaded_at } }
 */
router.post('/upload', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const filename = typeof body.filename === 'string' ? body.filename : 'unknown';
    const data = typeof body.data === 'string' ? body.data : '';

    if (!data) {
      return res.status(400).json({ success: false, error: 'data（base64 图片）必填' });
    }

    // 解析 base64（兼容 data:image/png;base64,XXX 格式）
    const match = data.match(/^data:image\/(\w+);base64,(.+)$/);
    const ext = match ? match[1] : 'png';
    const base64 = match ? match[2] : data;
    const buffer = Buffer.from(base64, 'base64');
    if (buffer.length === 0) {
      return res.status(400).json({ success: false, error: 'base64 解码失败，图片为空' });
    }
    // 文件大小限制（10MB）
    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ success: false, error: '图片超过 10MB 限制' });
    }

    // 创建上传目录
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }

    // 生成真实 image_id（DB 主键）
    const imageId = `IMG-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const filePath = path.join(UPLOAD_DIR, `${imageId}.${ext}`);
    fs.writeFileSync(filePath, buffer);

    // 写 DB（pest_images 表由 fixMissingSchema 创建）
    const db = getDatabase();
    db.run(
      `INSERT INTO pest_images (id, file_path, original_filename, size_bytes, uploaded_at, status) VALUES (?, ?, ?, ?, ?, ?)`,
      [imageId, filePath, filename, buffer.length, new Date().toISOString(), 'uploaded'],
    );

    return res.json({
      success: true,
      data: {
        image_id: imageId,
        file_path: filePath,
        uploaded_at: new Date().toISOString(),
        size_bytes: buffer.length,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || '图片上传失败' });
  }
});

router.post('/identify', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.image_id) {
      return res.status(400).json({ success: false, error: 'image_id 必填' });
    }
    const result = await identifyPestImage(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '图像识别失败' });
  }
});

/**
 * GET /api/ai/image/list?limit=20
 * 列出最近上传的图片（调试 + AI-09 模型部署后便于管理）
 */
router.get('/list', (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, Number(req.query.limit) || 20);
    const db = getDatabase();
    const rows = db.exec(`
      SELECT id, file_path, original_filename, size_bytes, uploaded_at, status
      FROM pest_images
      ORDER BY uploaded_at DESC
      LIMIT ?
    `, [limit]);
    const cols = rows[0]?.columns || [];
    const images = (rows[0]?.values || []).map((row: unknown[]) => {
      const obj: Record<string, any> = {};
      cols.forEach((c, i) => { obj[c] = row[i]; });
      return obj;
    });
    return res.json({ success: true, data: images });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e.message || '查询失败' });
  }
});

export default router;
