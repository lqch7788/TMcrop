/**
 * 图片上传 multer + BLOB 存储 + 下载接口
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { db } = require('../database');

// 使用内存存储（文件直接写入 BLOB）
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// POST /api/pictures/upload - 上传图片（multipart）
router.post('/upload', upload.single('file'), (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const id = require('uuid').v4();
    const { refType, refId } = req.body;
    const stmt = db.prepare(`INSERT INTO pictures
      (id, ref_type, ref_id, filename, mime_type, size, data, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    stmt.run(id, refType || null, refId || null, req.file.originalname, req.file.mimetype,
      req.file.size, req.file.buffer, new Date().toISOString());
    res.status(201).json({ id, filename: req.file.originalname, mimeType: req.file.mimetype, size: req.file.size });
  } catch (err) { next(err); }
});

// GET /api/pictures/:id - 下载图片（直接返回 binary）
router.get('/:id', (req, res, next) => {
  try {
    const row = db.prepare('SELECT filename, mime_type, data FROM pictures WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    res.set('Content-Type', row.mime_type || 'application/octet-stream');
    res.set('Content-Disposition', 'inline; filename="' + row.filename + '"');
    res.send(row.data);
  } catch (err) { next(err); }
});

// GET /api/pictures/:id/meta - 获取元数据
router.get('/:id/meta', (req, res, next) => {
  try {
    const row = db.prepare('SELECT id, ref_type, ref_id, filename, mime_type, size, created_at FROM pictures WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Not Found' });
    res.json(row);
  } catch (err) { next(err); }
});

// GET /api/pictures?refType=xxx&refId=yyy - 按关联查询
router.get('/', (req, res, next) => {
  try {
    const { refType, refId } = req.query;
    let rows;
    if (refType && refId) {
      rows = db.prepare('SELECT id, ref_type, ref_id, filename, mime_type, size, created_at FROM pictures WHERE ref_type = ? AND ref_id = ?').all(refType, refId);
    } else {
      rows = db.prepare('SELECT id, ref_type, ref_id, filename, mime_type, size, created_at FROM pictures ORDER BY created_at DESC LIMIT 200').all();
    }
    res.json(rows);
  } catch (err) { next(err); }
});

// DELETE /api/pictures/:id - 删除图片
router.delete('/:id', (req, res, next) => {
  try {
    const stmt = db.prepare('DELETE FROM pictures WHERE id = ?');
    const result = stmt.run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Not Found' });
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
