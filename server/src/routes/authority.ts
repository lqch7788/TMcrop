/**
 * 组织与权限管理 API 路由
 * 来源参考：弘智耘源 authority2 模块
 * 创建日期：2026-05-02
 */

import { Router } from 'express';
import { getDatabase, saveDatabase } from '../db';
import bcrypt from 'bcryptjs';
import { generateToken, authenticate } from '../middleware/auth';

const router = Router();

// ============================================
// 登录接口
// ============================================

/**
 * 用户登录
 * POST /api/authority/login
 * 请求体: { username: string, password: string }
 * 返回: { success: true, token: string, user: { oid, username, name, ... } }
 */
router.post('/login', (req, res) => {
  const db = getDatabase();
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ success: false, error: '请提供账号和密码' });
    return;
  }

  try {
    // 查询用户（使用 username 作为登录账号）
    const stmt = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?');
    stmt.bind([username, 'active']);

    if (stmt.step()) {
      const user = stmt.getAsObject() as Record<string, unknown>;
      stmt.free();

      // 使用 bcrypt 验证密码
      const storedPasswordHash = user.password_hash as string;
      const isPasswordValid = bcrypt.compareSync(password, storedPasswordHash);

      if (!isPasswordValid) {
        res.status(401).json({ success: false, error: '账号或密码错误' });
        return;
      }

      // 生成 JWT token
      const token = generateToken({
        userId: user.oid as string,
        aid: user.username as string,
        name: (user.real_name || user.username) as string,
      });

      // 去除密码哈希后返回用户信息
      const { password_hash, ...userWithoutPassword } = user;

      res.json({
        success: true,
        token,
        user: {
          oid: userWithoutPassword.oid,
          aid: userWithoutPassword.username,
          name: userWithoutPassword.real_name || userWithoutPassword.username,
          email: userWithoutPassword.email,
          phone: userWithoutPassword.phone,
          org_oid: userWithoutPassword.org_oid,
          status: userWithoutPassword.status,
        },
      });
    } else {
      stmt.free();
      res.status(401).json({ success: false, error: '账号或密码错误' });
    }
  } catch (error) {
    console.error('登录失败:', error);
    res.status(500).json({ success: false, error: '登录失败' });
  }
});

/**
 * 验证 token 有效性
 * GET /api/authority/verify
 * 需要认证
 */
router.get('/verify', authenticate, (req, res) => {
  if (!req.user) {
    res.status(401).json({ success: false, error: '未认证' });
    return;
  }
  res.json({
    success: true,
    user: {
      userId: req.user.userId,
      aid: req.user.aid,
      name: req.user.name,
    }
  });
});

// ============================================
// 组织管理
// ============================================

/**
 * 获取组织树
 */
router.get('/organizations', (req, res) => {
  const db = getDatabase();
  const { rows = -1, id, sort = 'sort_order', order = 'asc' } = req.query;

  let sql = 'SELECT * FROM organizations WHERE status = ?';
  const bindings: (string | number)[] = ['active'];

  if (!id) {
    sql += ' AND parent_oid IS NULL';
  } else {
    sql += ' AND parent_oid = ?';
    bindings.push(id as string);
  }

  // ORDER BY 白名单验证，防止 SQL 注入
  const allowedSorts = ['sort_order', 'name', 'oid', 'created_at', 'status'];
  const allowedOrders = ['asc', 'desc'];
  const safeSort = allowedSorts.includes(sort as string) ? sort : 'sort_order';
  const safeOrder = allowedOrders.includes((order as string).toLowerCase()) ? (order as string).toLowerCase() : 'asc';
  sql += ` ORDER BY ${safeSort} ${safeOrder}`;

  if (Number(rows) > 0) {
    sql += ' LIMIT ?';
    bindings.push(Number(rows));
  }

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    // 递归加载子节点
    const loadChildren = (nodes: Record<string, unknown>[]): Record<string, unknown>[] => {
      return nodes.map(node => {
        const childrenSql = 'SELECT * FROM organizations WHERE status = ? AND parent_oid = ?';
        const childStmt = db.prepare(childrenSql);
        childStmt.bind(['active', node.oid as string]);
        const children: Record<string, unknown>[] = [];
        while (childStmt.step()) {
          children.push(childStmt.getAsObject());
        }
        childStmt.free();
        if (children.length > 0) {
          (node as Record<string, unknown>).children = loadChildren(children);
        }
        return node;
      });
    };

    res.json(loadChildren(results));
  } catch (error) {
    console.error('获取组织树失败:', error);
    res.status(500).json({ error: '获取组织树失败' });
  }
});

/**
 * 保存组织（新增或更新）- 需要认证
 */
router.post('/organizations', authenticate, (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    // 处理新增
    if (inserted && inserted.length > 0) {
      for (const org of inserted) {
        const oid = org.oid || `ORG_${Date.now()}`;
        const id = `ORG_ID_${Date.now()}`;
        db.run(
          `INSERT INTO organizations (id, oid, parent_oid, aid, name, description, address,
            contactor, contactor_phone, contactor_mobile, contactor_email,
            org_type, sort_order, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            oid,
            org.oidParent || null,
            org.aid,
            org.name,
            org.description || null,
            org.address || null,
            org.contactor || null,
            org.contactorPhone || null,
            org.contactorMobile || null,
            org.contactorEmail || null,
            org.orgType || 'department',
            org.sortNumber || 0,
            'active',
            now,
            now
          ]
        );
        results.inserted.push({ oid, ...org });
      }
    }

    // 处理更新
    if (updated && updated.length > 0) {
      for (const org of updated) {
        db.run(
          `UPDATE organizations SET
            parent_oid = ?, aid = ?, name = ?, description = ?, address = ?,
            contactor = ?, contactor_phone = ?, contactor_mobile = ?, contactor_email = ?,
            org_type = ?, sort_order = ?, updated_at = ?
           WHERE oid = ?`,
          [
            org.oidParent || null,
            org.aid,
            org.name,
            org.description || null,
            org.address || null,
            org.contactor || null,
            org.contactorPhone || null,
            org.contactorMobile || null,
            org.contactorEmail || null,
            org.orgType || 'department',
            org.sortNumber || 0,
            now,
            org.oid
          ]
        );
        results.updated.push(org);
      }
    }

    // 处理删除
    if (deleted && deleted.length > 0) {
      for (const oid of deleted) {
        db.run('DELETE FROM organizations WHERE oid = ?', [oid]);
        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存组织失败:', error);
    res.status(500).json({ error: '保存组织失败' });
  }
});

// ============================================
// 角色管理
// ============================================

/**
 * 获取角色列表
 */
router.get('/roles', (req, res) => {
  const db = getDatabase();
  const { sort = 'created_at', order = 'desc' } = req.query;

  let sql = 'SELECT * FROM roles WHERE status = ?';
  const bindings: string[] = ['active'];

  // 安全检查：只允许特定的排序列和排序方向
  const allowedSorts = ['created_at', 'role_name', 'oid'];
  const allowedOrders = ['asc', 'desc'];
  const safeSort = allowedSorts.includes(sort as string) ? sort : 'created_at';
  const safeOrder = allowedOrders.includes((order as string).toLowerCase()) ? (order as string).toLowerCase() : 'asc';
  sql += ` ORDER BY ${safeSort} ${safeOrder}`;

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      const role = stmt.getAsObject();
      // 字段映射：数据库字段 -> 前端期望字段
      // 数据库: role_code -> 前端: aid
      // 数据库: role_name -> 前端: name
      (role as Record<string, unknown>).aid = role.role_code;
      (role as Record<string, unknown>).name = role.role_name;
      results.push(role);
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取角色列表失败:', error);
    res.status(500).json({ error: '获取角色列表失败' });
  }
});

/**
 * 保存角色 - 需要认证
 */
router.post('/roles', authenticate, (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    if (inserted && inserted.length > 0) {
      for (const role of inserted) {
        const oid = role.oid || `ROLE_${Date.now()}`;
        const id = `ROLE_ID_${Date.now()}`;
        // roles 表字段: id, oid, role_code, role_name, description, is_system, status, created_at, updated_at
        db.run(
          `INSERT INTO roles (id, oid, role_code, role_name, description, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            oid,
            role.aid || oid,  // role_code 使用 aid 或 oid
            role.name,       // role_name
            role.description || null,
            'active',
            now,
            now
          ]
        );
        results.inserted.push({ oid, ...role });
      }
    }

    if (updated && updated.length > 0) {
      for (const role of updated) {
        db.run(
          `UPDATE roles SET role_code = ?, role_name = ?, description = ?, updated_at = ?
           WHERE oid = ?`,
          [
            role.aid || role.oid,
            role.name,
            role.description || null,
            now,
            role.oid
          ]
        );
        results.updated.push(role);
      }
    }

    if (deleted && deleted.length > 0) {
      for (const oid of deleted) {
        db.run('DELETE FROM roles WHERE oid = ?', [oid]);
        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存角色失败:', error);
    res.status(500).json({ error: '保存角色失败' });
  }
});


// ============================================
// 认证管理
// ============================================

/**
 * 用户登录验证
 * POST /api/authority/auth/login
 * Body: { username: string, password: string }
 */
router.post('/auth/login', async (req, res) => {
  const db = getDatabase();
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  try {
    // 查找用户（支持用户名或真实姓名）
    const stmt = db.prepare(`
      SELECT oid, username, password_hash, real_name, org_oid, org_name, 
             department_oid, department_name, position, email, phone, status
      FROM users 
      WHERE username = ? OR real_name = ?
    `);
    stmt.bind([username, username]);
    
    let user: Record<string, unknown> | null = null;
    if (stmt.step()) {
      user = stmt.getAsObject();
    }
    stmt.free();

    if (!user) {
      res.status(401).json({ error: '用户不存在' });
      return;
    }

    // 检查用户状态
    if ((user.status as string) !== 'active') {
      res.status(401).json({ error: '用户已被禁用' });
      return;
    }

    // 验证密码
    const passwordHash = user.password_hash as string;
    if (!passwordHash) {
      console.error('用户密码哈希为空:', user.oid);
      res.status(500).json({ error: '密码验证失败，请联系管理员' });
      return;
    }

    const isValid = await bcrypt.compare(password, passwordHash);
    if (!isValid) {
      res.status(401).json({ error: '密码错误' });
      return;
    }

    // 获取用户角色
    const roleStmt = db.prepare('SELECT role_oid FROM user_roles WHERE user_oid = ?');
    roleStmt.bind([user.oid as string]);
    const roles: string[] = [];
    while (roleStmt.step()) {
      const row = roleStmt.getAsObject() as { role_oid: string };
      roles.push(row.role_oid);
    }
    roleStmt.free();

    // 返回用户信息（不包含密码）
    const { password_hash, ...userWithoutPassword } = user;
    res.json({
      success: true,
      user: userWithoutPassword,
      roles
    });
  } catch (error) {
    console.error('登录验证失败:', error);
    res.status(500).json({ error: '登录验证失败' });
  }
});

// ============================================
// 用户管理
// ============================================

/**
 * 获取用户列表
 */
router.get('/users', (req, res) => {
  const db = getDatabase();
  const { orgOid, status } = req.query;

  let sql = 'SELECT * FROM users WHERE 1=1';
  const bindings: string[] = [];

  if (orgOid) {
    sql += ' AND org_oid = ?';
    bindings.push(orgOid as string);
  }

  if (status) {
    sql += ' AND status = ?';
    bindings.push(status as string);
  }

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      const user = stmt.getAsObject();
      // 去除密码哈希
      delete (user as Record<string, unknown>).password_hash;
      // 字段映射：数据库字段 -> 前端期望字段
      // 数据库: username -> 前端: aid
      // 数据库: real_name -> 前端: name
      (user as Record<string, unknown>).aid = user.username;
      (user as Record<string, unknown>).name = user.real_name;
      results.push(user);
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

/**
 * 保存用户 - 需要认证
 */
router.post('/users', authenticate, (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    if (inserted && inserted.length > 0) {
      for (const user of inserted) {
        const oid = user.oid || `USER_${Date.now()}`;
        const id = `USER_ID_${Date.now()}`;
        // users 表字段: id, oid, username, password_hash, real_name, org_oid, org_name, department_oid, department_name, position, email, phone, avatar, status, last_login, created_at, updated_at
        db.run(
          `INSERT INTO users (id, oid, username, real_name, password_hash, org_oid, email, phone, avatar, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            oid,
            user.aid || user.username,  // username 使用 aid 或 username
            user.name,                 // real_name
            user.passwordHash || null,
            user.orgOid || null,
            user.email || null,
            user.phone || null,
            user.avatar || null,
            user.status || 'active',
            now,
            now
          ]
        );
        results.inserted.push({ oid, ...user });
      }
    }

    if (updated && updated.length > 0) {
      for (const user of updated) {
        const updates: string[] = [];
        const bindings: (string | number)[] = [];

        if (user.orgOid) { updates.push('org_oid = ?'); bindings.push(user.orgOid); }
        if (user.aid) { updates.push('username = ?'); bindings.push(user.aid); }
        if (user.name) { updates.push('real_name = ?'); bindings.push(user.name); }
        if (user.passwordHash) { updates.push('password_hash = ?'); bindings.push(user.passwordHash); }
        if (user.email !== undefined) { updates.push('email = ?'); bindings.push(user.email); }
        if (user.phone !== undefined) { updates.push('phone = ?'); bindings.push(user.phone); }
        if (user.status) { updates.push('status = ?'); bindings.push(user.status); }

        updates.push('updated_at = ?');
        bindings.push(now);
        bindings.push(user.oid);

        db.run(`UPDATE users SET ${updates.join(', ')} WHERE oid = ?`, bindings);
        results.updated.push(user);
      }
    }

    if (deleted && deleted.length > 0) {
      for (const oid of deleted) {
        db.run('DELETE FROM users WHERE oid = ?', [oid]);
        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存用户失败:', error);
    res.status(500).json({ error: '保存用户失败' });
  }
});

/**
 * 保存用户角色关联 - 需要认证
 */
router.post('/users/:userOid/roles', authenticate, (req, res) => {
  const db = getDatabase();
  const { userOid } = req.params;
  const { roleOids } = req.body;

  try {
    // 先删除现有关联
    db.run('DELETE FROM user_roles WHERE user_oid = ?', [userOid]);

    // 插入新关联
    for (const roleOid of roleOids) {
      db.run(
        'INSERT INTO user_roles (user_oid, role_oid, created_at) VALUES (?, ?, ?)',
        [userOid, roleOid, new Date().toISOString()]
      );
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('保存用户角色关联失败:', error);
    res.status(500).json({ error: '保存用户角色关联失败' });
  }
});

/**
 * 获取用户角色
 */
router.get('/users/:userOid/roles', (req, res) => {
  const db = getDatabase();
  const { userOid } = req.params;

  try {
    const stmt = db.prepare('SELECT role_oid FROM user_roles WHERE user_oid = ?');
    stmt.bind([userOid]);
    const roles: string[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject() as { role_oid: string };
      roles.push(row.role_oid);
    }
    stmt.free();
    res.json(roles);
  } catch (error) {
    console.error('获取用户角色失败:', error);
    res.status(500).json({ error: '获取用户角色失败' });
  }
});

// ============================================
// 工序管理
// ============================================

/**
 * 获取工序树
 */
router.get('/processes', (req, res) => {
  const db = getDatabase();
  const { rows = -1, id, appType, sort = 'sort_order', order = 'asc' } = req.query;

  let sql = 'SELECT * FROM processes WHERE status = ?';
  const bindings: (string | number)[] = ['active'];

  if (appType !== undefined) {
    sql += ' AND app_type = ?';
    bindings.push(Number(appType));
  }

  if (!id) {
    sql += ' AND parent_oid IS NULL';
  } else {
    sql += ' AND parent_oid = ?';
    bindings.push(id as string);
  }

  // ORDER BY 白名单验证，防止 SQL 注入
  const allowedSorts = ['sort_order', 'name', 'oid', 'created_at', 'status', 'app_type'];
  const allowedOrders = ['asc', 'desc'];
  const safeSort = allowedSorts.includes(sort as string) ? sort : 'sort_order';
  const safeOrder = allowedOrders.includes((order as string).toLowerCase()) ? (order as string).toLowerCase() : 'asc';
  sql += ` ORDER BY ${safeSort} ${safeOrder}`;

  if (Number(rows) > 0) {
    sql += ' LIMIT ?';
    bindings.push(Number(rows));
  }

  try {
    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    // 递归加载子节点
    const loadChildren = (nodes: Record<string, unknown>[]): Record<string, unknown>[] => {
      return nodes.map(node => {
        const childrenSql = 'SELECT * FROM processes WHERE status = ? AND parent_oid = ?';
        const childStmt = db.prepare(childrenSql);
        childStmt.bind(['active', node.oid as string]);
        const children: Record<string, unknown>[] = [];
        while (childStmt.step()) {
          children.push(childStmt.getAsObject());
        }
        childStmt.free();
        if (children.length > 0) {
          (node as Record<string, unknown>).children = loadChildren(children);
        }
        return node;
      });
    };

    res.json(loadChildren(results));
  } catch (error) {
    console.error('获取工序树失败:', error);
    res.status(500).json({ error: '获取工序树失败' });
  }
});

/**
 * 保存工序 - 需要认证
 */
router.post('/processes', authenticate, (req, res) => {
  const db = getDatabase();
  const { inserted, updated, deleted } = req.body;

  try {
    const now = new Date().toISOString();
    const results: { inserted: unknown[]; updated: unknown[]; deleted: string[] } = {
      inserted: [],
      updated: [],
      deleted: []
    };

    if (inserted && inserted.length > 0) {
      for (const proc of inserted) {
        const oid = proc.oid || `PROC_${Date.now()}`;
        db.run(
          `INSERT INTO processes (oid, parent_oid, aid, name, app_type, exec_name, exec_mode,
            description, image_aid, hidden, sort_order, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            oid,
            proc.oidParent || null,
            proc.aid,
            proc.name,
            proc.appType || 0,
            proc.execName || null,
            proc.execMode || null,
            proc.description || null,
            proc.imageAid || null,
            proc.hidden ? 1 : 0,
            proc.sortNumber || 0,
            'active',
            now,
            now
          ]
        );
        results.inserted.push({ OID: oid, ...proc });
      }
    }

    if (updated && updated.length > 0) {
      for (const proc of updated) {
        db.run(
          `UPDATE processes SET parent_oid = ?, aid = ?, name = ?, app_type = ?,
            exec_name = ?, exec_mode = ?, description = ?, image_aid = ?,
            hidden = ?, sort_order = ?, updated_at = ?
           WHERE oid = ?`,
          [
            proc.oidParent || null,
            proc.aid,
            proc.name,
            proc.appType || 0,
            proc.execName || null,
            proc.execMode || null,
            proc.description || null,
            proc.imageAid || null,
            proc.hidden ? 1 : 0,
            proc.sortNumber || 0,
            now,
            proc.oid
          ]
        );
        results.updated.push(proc);
      }
    }

    if (deleted && deleted.length > 0) {
      for (const oid of deleted) {
        db.run('DELETE FROM processes WHERE oid = ?', [oid]);
        results.deleted.push(oid);
      }
    }

    saveDatabase();
    res.json(results);
  } catch (error) {
    console.error('保存工序失败:', error);
    res.status(500).json({ error: '保存工序失败' });
  }
});

// ============================================
// 动作管理
// ============================================

/**
 * 获取动作列表
 */
router.get('/actions', (req, res) => {
  const db = getDatabase();
  const { appType, category } = req.query;

  let sql = 'SELECT * FROM actions WHERE status = ?';
  const bindings: (string | number)[] = ['active'];

  if (appType !== undefined) {
    sql += ' AND app_type = ?';
    bindings.push(Number(appType));
  }

  if (category) {
    sql += ' AND category = ?';
    bindings.push(category as string);
  }

  sql += ' ORDER BY sort_order ASC';

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
    console.error('获取动作列表失败:', error);
    res.status(500).json({ error: '获取动作列表失败' });
  }
});

// ============================================
// 角色权限管理
// ============================================

/**
 * 获取角色权限
 */
router.get('/roles/:roleOid/authority', (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;
  const { appType = 0 } = req.query;

  try {
    const stmt = db.prepare(`
      SELECT ra.role_oid as roleOid, ra.process_oid as processOid,
             ra.action_oid as actionOid, ra.value
      FROM roles_authority ra
      JOIN processes p ON ra.process_oid = p.oid
      WHERE ra.role_oid = ? AND p.app_type = ?
    `);
    stmt.bind([roleOid, Number(appType)]);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取角色权限失败:', error);
    res.status(500).json({ error: '获取角色权限失败' });
  }
});

/**
 * 保存角色权限 - 需要认证
 */
router.post('/roles/:roleOid/authority', authenticate, (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;
  const { authorities } = req.body;

  try {
    const now = new Date().toISOString();

    for (const auth of authorities) {
      if (auth.value === -1) {
        // -1 表示删除权限记录
        db.run(
          'DELETE FROM roles_authority WHERE role_oid = ? AND process_oid = ? AND action_oid = ?',
          [roleOid, auth.processOid, auth.actionOid]
        );
      } else {
        // upsert
        const existing = db.prepare(
          'SELECT id FROM roles_authority WHERE role_oid = ? AND process_oid = ? AND action_oid = ?'
        );
        existing.bind([roleOid, auth.processOid, auth.actionOid]);
        const exists = existing.step();
        existing.free();

        if (exists) {
          db.run(
            'UPDATE roles_authority SET value = ?, updated_at = ? WHERE role_oid = ? AND process_oid = ? AND action_oid = ?',
            [auth.value, now, roleOid, auth.processOid, auth.actionOid]
          );
        } else {
          db.run(
            'INSERT INTO roles_authority (role_oid, process_oid, action_oid, value, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
            [roleOid, auth.processOid, auth.actionOid, auth.value, now, now]
          );
        }
      }
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('保存角色权限失败:', error);
    res.status(500).json({ error: '保存角色权限失败' });
  }
});

// ============================================
// 数据权限管理
// ============================================

/**
 * 获取角色数据权限
 */
router.get('/roles/:roleOid/data-authority', (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;

  try {
    const stmt = db.prepare(`
      SELECT role_oid as roleOid, org_oid as orgOid, value
      FROM roles_data_authority
      WHERE role_oid = ?
    `);
    stmt.bind([roleOid]);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    res.json(results);
  } catch (error) {
    console.error('获取角色数据权限失败:', error);
    res.status(500).json({ error: '获取角色数据权限失败' });
  }
});

/**
 * 保存角色数据权限 - 需要认证
 */
router.post('/roles/:roleOid/data-authority', authenticate, (req, res) => {
  const db = getDatabase();
  const { roleOid } = req.params;
  const { orgOids, isAuthorize } = req.body;

  try {
    const now = new Date().toISOString();

    if (isAuthorize) {
      for (const orgOid of orgOids) {
        const existing = db.prepare(
          'SELECT id FROM roles_data_authority WHERE role_oid = ? AND org_oid = ?'
        );
        existing.bind([roleOid, orgOid]);
        const exists = existing.step();
        existing.free();

        if (!exists) {
          db.run(
            'INSERT INTO roles_data_authority (role_oid, org_oid, value, created_at, updated_at) VALUES (?, ?, 1, ?, ?)',
            [roleOid, orgOid, now, now]
          );
        }
      }
    } else {
      for (const orgOid of orgOids) {
        db.run('DELETE FROM roles_data_authority WHERE role_oid = ? AND org_oid = ?', [roleOid, orgOid]);
      }
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('保存角色数据权限失败:', error);
    res.status(500).json({ error: '保存角色数据权限失败' });
  }
});

export default router;
