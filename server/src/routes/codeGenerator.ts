/**
 * 编码自动生成服务
 * GET /api/code-generator/next-base-code - 获取下一个基地编码
 * GET /api/code-generator/next-greenhouse-code?baseOid=xxx - 获取下一个温室编码
 * GET /api/code-generator/next-zone-code?greenhouseOid=xxx - 获取下一个区块编码
 */

import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/**
 * 获取下一个基地编码
 * 格式: B + 序号(3位) -> B001
 */
router.get('/next-base-code', (req, res) => {
  try {
    const db = getDatabase();

    // 获取当前最大编码
    const result = db.exec(
      "SELECT code FROM bases WHERE deleted_at IS NULL AND code LIKE 'B%' ORDER BY code DESC LIMIT 1"
    );

    let nextSeq = 1;
    if (result.length > 0 && result[0].values.length > 0) {
      const lastCode = result[0].values[0][0] as string;
      // 解析: B001 -> 1
      const match = lastCode.match(/^B(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    const nextCode = `B${String(nextSeq).padStart(3, '0')}`;
    res.json({ success: true, data: { code: nextCode } });
  } catch (error) {
    console.error('生成基地编码失败:', error);
    res.status(500).json({ success: false, error: '生成基地编码失败' });
  }
});

/**
 * 获取下一个温室编码
 * 格式: GH + 基地序号(2位) + - + 序号(3位) -> GH01-001
 */
router.get('/next-greenhouse-code', (req, res) => {
  try {
    const db = getDatabase();
    const { baseOid } = req.query;

    if (!baseOid || typeof baseOid !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 baseOid 参数' });
    }

    // 获取基地序号 (基地自身的编码作为序号部分)
    const baseResult = db.exec(
      "SELECT code FROM bases WHERE oid = ? AND deleted_at IS NULL LIMIT 1",
      [baseOid]
    );
    let baseSeq = '01';
    if (baseResult.length > 0 && baseResult[0].values.length > 0) {
      const baseCode = baseResult[0].values[0][0] as string;
      // 解析基地编码: BASE_4 -> 4, BASE_10 -> 10, B001 -> 1
      const baseMatch = baseCode.match(/_(\d+)$|^B(\d+)$/);
      if (baseMatch) {
        const num = baseMatch[1] || baseMatch[2];
        baseSeq = String(parseInt(num, 10)).padStart(2, '0');
      }
    }

    // 获取该基地的温室最大序号
    const countResult = db.exec(
      "SELECT code FROM greenhouses WHERE base_oid = ? AND status = 'active' AND code LIKE ? ORDER BY code DESC LIMIT 1",
      [baseOid, `GH${baseSeq}-%`]
    );

    let nextSeq = 1;
    if (countResult.length > 0 && countResult[0].values.length > 0) {
      const lastCode = countResult[0].values[0][0] as string;
      // 解析: GH01-001 -> 1
      const match = lastCode.match(/GH\d+-(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    const nextCode = `GH${baseSeq}-${String(nextSeq).padStart(3, '0')}`;
    res.json({ success: true, data: { code: nextCode } });
  } catch (error) {
    console.error('生成温室编码失败:', error);
    res.status(500).json({ success: false, error: '生成温室编码失败' });
  }
});

/**
 * 获取下一个区块编码
 * 格式: Z + 温室序号(3位) + - + 序号(3位) -> Z001-001
 * 温室序号从温室编码提取，不符合格式则用温室rowid补零
 */
router.get('/next-zone-code', (req, res) => {
  try {
    const db = getDatabase();
    const { greenhouseOid } = req.query;

    if (!greenhouseOid || typeof greenhouseOid !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 greenhouseOid 参数' });
    }

    // 获取关联温室的编码和rowid，提取温室序号部分
    const ghResult = db.exec(
      "SELECT code, rowid FROM greenhouses WHERE oid = ? LIMIT 1",
      [greenhouseOid]
    );

    if (ghResult.length === 0 || ghResult[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '温室不存在' });
    }

    const greenhouseCode = ghResult[0].values[0][0] as string;
    const greenhouseRowid = ghResult[0].values[0][1] as number;
    // 从温室编码提取: GH01-001 -> 01 (取GH后面的序号部分)
    // 不符合格式则用rowid补零（最多3位）
    const ghMatch = greenhouseCode.match(/GH(\d+)-(\d+)/);
    const ghSeq = ghMatch ? ghMatch[1] : String(greenhouseRowid || 1).padStart(3, '0');

    // 获取该温室的区块最大序号
    const countResult = db.exec(
      "SELECT zone_code FROM zones WHERE greenhouse_oid = ? AND status = 'active' AND zone_code LIKE ? ORDER BY zone_code DESC LIMIT 1",
      [greenhouseOid, `Z${ghSeq}-%`]
    );

    let nextSeq = 1;
    if (countResult.length > 0 && countResult[0].values.length > 0) {
      const lastCode = countResult[0].values[0][0] as string;
      // 解析: Z001-001 -> 1
      const match = lastCode.match(/Z\d+-(\d+)$/);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }

    const nextCode = `Z${ghSeq}-${String(nextSeq).padStart(3, '0')}`;
    res.json({ success: true, data: { code: nextCode } });
  } catch (error) {
    console.error('生成区块编码失败:', error);
    res.status(500).json({ success: false, error: '生成区块编码失败' });
  }
});

/**
 * 获取下一个种植季编码
 * 格式: YYYY + S + 序号(3位) -> 2025S001
 */
router.get('/next-season-code', (req, res) => {
  try {
    const db = getDatabase();
    const { facilityOid, year } = req.query;

    if (!facilityOid || typeof facilityOid !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 facilityOid 参数' });
    }

    const targetYear = year && typeof year === 'string' ? year : String(new Date().getFullYear());

    // 获取该设施的种植季最大序号
    const result = db.exec(
      "SELECT COUNT(*) as cnt FROM planting_records WHERE facility_oid = ? AND season_code LIKE ? AND deleted_at IS NULL",
      [facilityOid, `${targetYear}%`]
    );

    const cnt = Number(result[0]?.values[0]?.[0] || 0) + 1;
    const nextCode = `${targetYear}S${String(cnt).padStart(3, '0')}`;

    res.json({ success: true, data: { code: nextCode } });
  } catch (error) {
    console.error('生成种植季编码失败:', error);
    res.status(500).json({ success: false, error: '生成种植季编码失败' });
  }
});

export default router;
