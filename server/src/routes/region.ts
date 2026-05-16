/**
 * 行政区划 API 路由
 * 四级级联：国家 → 省 → 市 → 区
 * 懒加载模式：每次仅查询下一级
 * V10.0 新增
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';

const router = Router();

/** GET /api/region — 按 parent_id 获取下级行政区划 (懒加载) */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const parentId = parseInt(req.query.parent_id as string, 10) || 0;

    const result = db.exec(
      `SELECT id, name, parent_id, level FROM region_data WHERE parent_id = ? ORDER BY id`,
      [parentId]
    );

    const items = result.length > 0 && result[0].values
      ? result[0].values.map((row: any[]) => ({
          id: row[0],
          name: row[1],
          parentId: row[2],
          level: row[3],
        }))
      : [];

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/region/search — 按名称搜索区域 */
router.get('/search', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { keyword, level } = req.query as Record<string, string>;

    if (!keyword || keyword.length < 1) {
      res.status(400).json({ success: false, error: '请提供搜索关键字' });
      return;
    }

    const conditions = ['name LIKE ?'];
    const params: any[] = [`%${keyword}%`];
    if (level) { conditions.push('level = ?'); params.push(level); }

    const result = db.exec(
      `SELECT id, name, parent_id, level FROM region_data WHERE ${conditions.join(' AND ')} LIMIT 50`,
      params
    );

    const items = result.length > 0 && result[0].values
      ? result[0].values.map((row: any[]) => ({
          id: row[0],
          name: row[1],
          parentId: row[2],
          level: row[3],
        }))
      : [];

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/region/init — 初始化行政区划种子数据 */
router.post('/init', (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    // 检查是否已有数据
    const existing = db.exec(`SELECT COUNT(*) as cnt FROM region_data`);
    const count = existing[0]?.values[0]?.[0] ?? 0;
    if (Number(count) > 0) {
      res.json({ success: true, data: { message: '行政区划数据已存在，跳过初始化', count } });
      return;
    }

    // 中国34个省/直辖市/自治区/特别行政区 (parent_id=1)
    const provinces = [
      '北京市', '天津市', '河北省', '山西省', '内蒙古自治区',
      '辽宁省', '吉林省', '黑龙江省', '上海市', '江苏省',
      '浙江省', '安徽省', '福建省', '江西省', '山东省',
      '河南省', '湖北省', '湖南省', '广东省', '广西壮族自治区',
      '海南省', '重庆市', '四川省', '贵州省', '云南省',
      '西藏自治区', '陕西省', '甘肃省', '青海省', '宁夏回族自治区',
      '新疆维吾尔自治区', '香港特别行政区', '澳门特别行政区', '台湾省',
    ];

    // 插入国家
    db.run(`INSERT INTO region_data (id, name, parent_id, level) VALUES (?, ?, ?, ?)`, [1, '中国', 0, 'country']);

    // 插入省
    let provinceId = 2;
    for (const name of provinces) {
      db.run(`INSERT INTO region_data (id, name, parent_id, level) VALUES (?, ?, ?, ?)`, [provinceId, name, 1, 'province']);
      provinceId++;
    }

    res.json({
      success: true,
      data: { message: '行政区划种子数据初始化完成', provinces: provinces.length, total: provinceId - 1 },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
