/**
 * 用户基地权限管理 API 路由
 * 功能：管理用户对特定基地的访问权限
 */

import { Router } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();

// ============================================
// 获取用户基地权限列表
// ============================================
/**
 * GET /api/user-base-permissions
 * 查询条件: userOid, baseOid
 */
router.get('/', (req, res) => {
  const db = getDatabase();
  const { userOid, baseOid } = req.query;

  let sql = 'SELECT * FROM user_base_permissions WHERE 1=1';
  const bindings: string[] = [];

  if (userOid) {
    sql += ' AND user_oid = ?';
    bindings.push(userOid as string);
  }

  if (baseOid) {
    sql += ' AND base_oid = ?';
    bindings.push(baseOid as string);
  }

  sql += ' ORDER BY created_at DESC';

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取用户基地权限失败:', error);
    res.status(500).json({ error: '获取用户基地权限失败' });
  }
});

// ============================================
// 获取用户可访问的基地列表
// ============================================
/**
 * GET /api/user-base-permissions/bases/:userOid
 * 获取指定用户可访问的所有基地
 */
router.get('/bases/:userOid', (req, res) => {
  const db = getDatabase();
  const { userOid } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT ubp.base_oid as baseOid, ubp.base_name as baseName,
             ubp.access_level as accessLevel, ubp.created_at as createdAt
      FROM user_base_permissions ubp
      WHERE ubp.user_oid = ? AND ubp.access_level != 'none'
      ORDER BY ubp.base_name ASC
    `);
    stmt.bind([userOid]);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取用户可访问基地失败:', error);
    res.status(500).json({ error: '获取用户可访问基地失败' });
  }
});

// ============================================
// 检查用户是否有指定基地的访问权限
// ============================================
/**
 * GET /api/user-base-permissions/check
 * 查询参数: userOid, baseOid
 */
router.get('/check', (req, res) => {
  const db = getDatabase();
  const { userOid, baseOid } = req.query;

  if (!userOid || !baseOid) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  try {
    // 首先检查用户是否是admin（拥有所有基地权限）
    const adminStmt = db.prepare(`
      SELECT r.role_code FROM user_roles ur
      JOIN roles r ON r.oid = ur.role_oid
      WHERE ur.user_oid = ? AND r.status = 'active'
    `);
    adminStmt.bind([userOid as string]);
    let isAdmin = false;
    while (adminStmt.step()) {
      const roleCode = (adminStmt.getAsObject() as { role_code: string }).role_code;
      if (roleCode.toLowerCase() === 'admin' || roleCode.toLowerCase() === 'administrators') {
        isAdmin = true;
        break;
      }
    }
    adminStmt.free();

    if (isAdmin) {
      res.json({ success: true, data: { hasAccess: true, accessLevel: 'admin', isAdmin: true } });
      return;
    }

    // 检查用户的基地权限
    const stmt = db.prepare(`
      SELECT access_level as accessLevel
      FROM user_base_permissions
      WHERE user_oid = ? AND base_oid = ?
    `);
    stmt.bind([userOid as string, baseOid as string]);

    let hasAccess = false;
    let accessLevel = 'none';

    if (stmt.step()) {
      const row = stmt.getAsObject() as { accessLevel: string };
      accessLevel = row.accessLevel || 'none';
      hasAccess = accessLevel !== 'none';
    }
    stmt.free();

    res.json({ success: true, data: { hasAccess, accessLevel, isAdmin: false } });
  } catch (error) {
    console.error('检查基地权限失败:', error);
    res.status(500).json({ error: '检查基地权限失败' });
  }
});

// ============================================
// 保存用户基地权限（新增或更新）
// ============================================
/**
 * POST /api/user-base-permissions
 * Body: { userOid, baseOid, baseName, accessLevel }
 */
router.post('/', authenticate, (req, res) => {
  const db = getDatabase();
  const { userOid, baseOid, baseName, accessLevel } = req.body;

  if (!userOid || !baseOid) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  try {
    const now = new Date().toISOString();

    // 检查是否已存在记录
    const existingStmt = db.prepare('SELECT id FROM user_base_permissions WHERE user_oid = ? AND base_oid = ?');
    existingStmt.bind([userOid, baseOid]);
    const exists = existingStmt.step();
    existingStmt.free();

    if (exists) {
      // 更新现有记录
      if (accessLevel === 'none') {
        // 删除权限记录
        db.run('DELETE FROM user_base_permissions WHERE user_oid = ? AND base_oid = ?', [userOid, baseOid]);
      } else {
        db.run(`
          UPDATE user_base_permissions
          SET access_level = ?, base_name = COALESCE(?, base_name), updated_at = ?
          WHERE user_oid = ? AND base_oid = ?
        `, [accessLevel || 'read', baseName || null, now, userOid, baseOid]);
      }
    } else if (accessLevel !== 'none') {
      // 新增记录
      const id = `UBP_${Date.now()}`;
      db.run(`
        INSERT INTO user_base_permissions (id, user_oid, base_oid, base_name, access_level, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [id, userOid, baseOid, baseName || '', accessLevel || 'read', now, now]);
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('保存用户基地权限失败:', error);
    res.status(500).json({ error: '保存用户基地权限失败' });
  }
});

// ============================================
// 批量保存用户基地权限
// ============================================
/**
 * POST /api/user-base-permissions/batch
 * Body: { userOid, permissions: [{ baseOid, baseName, accessLevel }] }
 */
router.post('/batch', authenticate, (req, res) => {
  const db = getDatabase();
  const { userOid, permissions } = req.body;

  if (!userOid || !Array.isArray(permissions)) {
    res.status(400).json({ error: '缺少必要参数' });
    return;
  }

  try {
    const now = new Date().toISOString();

    for (const perm of permissions) {
      const { baseOid, baseName, accessLevel } = perm;

      if (!baseOid) continue;

      // 检查是否已存在
      const existingStmt = db.prepare('SELECT id FROM user_base_permissions WHERE user_oid = ? AND base_oid = ?');
      existingStmt.bind([userOid, baseOid]);
      const exists = existingStmt.step();
      existingStmt.free();

      if (exists) {
        if (accessLevel === 'none') {
          db.run('DELETE FROM user_base_permissions WHERE user_oid = ? AND base_oid = ?', [userOid, baseOid]);
        } else {
          db.run(`
            UPDATE user_base_permissions
            SET access_level = ?, base_name = COALESCE(?, base_name), updated_at = ?
            WHERE user_oid = ? AND base_oid = ?
          `, [accessLevel, baseName || null, now, userOid, baseOid]);
        }
      } else if (accessLevel !== 'none') {
        const id = `UBP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        db.run(`
          INSERT INTO user_base_permissions (id, user_oid, base_oid, base_name, access_level, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [id, userOid, baseOid, baseName || '', accessLevel, now, now]);
      }
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('批量保存用户基地权限失败:', error);
    res.status(500).json({ error: '批量保存用户基地权限失败' });
  }
});

// ============================================
// 删除用户基地权限
// ============================================
/**
 * DELETE /api/user-base-permissions/:id
 */
router.delete('/:id', authenticate, (req, res) => {
  const db = getDatabase();
  const { id } = req.params;

  try {
    db.run('DELETE FROM user_base_permissions WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('删除用户基地权限失败:', error);
    res.status(500).json({ error: '删除用户基地权限失败' });
  }
});

// ============================================
// 获取所有可用基地列表（供权限分配时选择）
// ============================================
/**
 * GET /api/user-base-permissions/all-bases
 * 返回系统中所有基地，供权限分配时选择
 */
router.get('/all-bases', (req, res) => {
  const db = getDatabase();

  try {
    // 从 greenhouses 表中获取唯一的 base_oid 和 base_name
    const stmt = db.prepare(`
      SELECT DISTINCT base_oid as baseOid, base_name as baseName
      FROM greenhouses
      WHERE base_oid IS NOT NULL AND base_oid != '' AND base_name IS NOT NULL AND base_name != ''
      ORDER BY base_name ASC
    `);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取基地列表失败:', error);
    res.status(500).json({ error: '获取基地列表失败' });
  }
});

export default router;
